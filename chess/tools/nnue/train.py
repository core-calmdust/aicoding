#!/usr/bin/env python3
"""Trainer for the chess NNUE of chess/engine.c: (768 -> H) x 2 perspectives -> 1, SCReLU, 8 output buckets by the
number of pieces. PyTorch (Apple GPU "mps", else CUDA, else CPU); a small NumPy backend (--backend numpy) for tests.

The output file is the engine's raw net (nnue.bin, then gzip -> nnue.bin.gz), H = 384 like the shipped one:
    int16 W1[768][H] (x255) | int16 B1[H] (x255) | int16 W2[8][2H] (x64) | int32 B2[8] (x255x64)
eval (cp, side to move) = 400 * (sum_i clamp(acc,0,1)^2 * W2[bucket] + B2[bucket]), bucket = (pieces - 2) / 4.

King buckets (--kb 4 / 8 / 16 / 32, HalfKA-style): the first layer has one 768 x H block per bucket of the perspective's own
king square, seen from that side (black: ranks flipped, as for the pieces); kb_table() gives the buckets (the same table
as engine.c nn_setmap; 32 also mirrors the board for a king on files e-h). The file is then
    W1[kb][768][H] | B1 | W2 | B2 | "CKB1" u32 kb, u32 H, u32 0        (a net without buckets has no trailer, as before)
--init with a net without buckets copies its first layer into every bucket (init_copy: 4 / 8 / 16 start exactly as it).

Data: 32-byte records (tools/convert.c, tools/nnue/nntool gen / rescore). Target:
    t = lam * sigmoid(score / 400) + (1 - lam) * result       (records without a result use the score alone)
loss = mean (sigmoid(out) - t)^2, Adam, weights kept in +-1.98 (so the quantised net matches the float one).

  python3 train.py --out nnwork/net.bin [--epochs 12] [--hidden 384] [--kb 1|4|8|16|32] [--lr 0.001] [--lam 0.9] [--init nnue.bin]
                   [--batch 16384] [--val val.bin] data1.bin data2.bin ...
  python3 train.py --check net.bin data.bin [n]     # integer evaluation, exactly as engine.c: compare with nntool evalpos

Resumable: a checkpoint (out + ".ckpt") is written every --save-min minutes and after every epoch; the same command
continues from it (delete it to start over). After every epoch: out (the latest), out + ".epN" and a line in out + ".log".
"""
import argparse
import math
import os
import sys
import threading
import queue
import time

import numpy as np

REC = 32
NB = 8
QA, QB, SCALE = 255, 64, 400
CLIP = 1.98
SQ = np.arange(64, dtype=np.uint64)


# ---------------------------------------------------------------- records -> features
def kb_table(kb):
    """own king square seen from its side (rank * 8 + file) -> (bucket, mirror), the table of engine.c nn_setmap:
      4:  ranks 1-2 f-h (castled short) | ranks 1-2 a-c (castled long) | ranks 1-2 d-e | ranks 3-8
      8:  rank 1 f-h | rank 1 a-c | rank 1 d-e | rank 2 f-h | rank 2 a-c | rank 2 d-e | ranks 3-4 | ranks 5-8
      16: rank 1 a-b, c, d, e, f, g-h | rank 2 f-h, a-c, d-e | rank 3 a-d, e-h | ranks 4, 5, 6, 7, 8
      32: every square mirrored to files a-d (the pieces' files are mirrored with a king on e-h)"""
    bt, mt = np.zeros(64, np.int64), np.zeros(64, bool)
    for r in range(8):
        for f in range(8):
            z = 0 if f >= 5 else 1 if f <= 2 else 2
            m = False
            if kb == 4:
                b = z if r <= 1 else 3
            elif kb == 8:
                b = z if r == 0 else 3 + z if r == 1 else 6 if r <= 3 else 7
            elif kb == 16:
                b = (0 if f <= 1 else 5 if f >= 6 else f - 1) if r == 0 else 6 + z if r == 1 else 9 + int(f >= 4) if r == 2 else 8 + r
            elif kb == 32:
                m = f >= 4
                b = r * 4 + (7 - f if m else f)
            else:
                b = 0
            bt[r * 8 + f] = b
            mt[r * 8 + f] = m
    return bt, mt


KBS = (1, 4, 8, 16, 32)


def decode(r, kb=1):
    """r: uint8 [B, 32] -> (us idx [B,64], them idx [B,64] with 768 = empty, us king bucket [B], them king bucket [B],
    output bucket [B], score [B], stm [B], res [B])"""
    occ = r[:, 0:8].copy().view("<u8")[:, 0]
    bits = ((occ[:, None] >> SQ) & np.uint64(1)).astype(bool)
    k = np.cumsum(bits, axis=1) - 1
    kc = np.clip(k, 0, 31)
    byte = np.take_along_axis(r[:, 8:24], kc >> 1, axis=1)
    pc = (byte >> ((kc & 1) * 4).astype(np.uint8)) & 15
    pc = pc.astype(np.int32)
    s = np.arange(64, dtype=np.int32)[None, :]
    fw = np.where(bits, pc * 64 + s, 768)
    fb = np.where(bits, ((pc + 6) % 12) * 64 + (s ^ 56), 768)
    stm = r[:, 26].astype(bool)
    n = len(r)
    if kb > 1:
        bt, mt = kb_table(kb)
        def code(ksq):   # (bucket, mirror) of a king square seen from its own side
            return bt[ksq], mt[ksq]
        wk = np.argmax(bits & (pc == 5), axis=1)
        bq = np.argmax(bits & (pc == 11), axis=1)
        kw, mw = code(wk)
        kbl, mb = code(bq ^ 56)
        fw = np.where(bits & mw[:, None], fw ^ 7, fw)     # (feature = piece * 64 + square: ^7 mirrors the file)
        fb = np.where(bits & mb[:, None], fb ^ 7, fb)
    else:
        kw = kbl = np.zeros(n, np.int64)
    us = np.where(stm[:, None], fb, fw)
    them = np.where(stm[:, None], fw, fb)
    kus = np.where(stm, kbl, kw)
    kthem = np.where(stm, kw, kbl)
    cnt = bits.sum(axis=1)
    bk = np.clip((cnt - 2) // 4, 0, 7)
    score = r[:, 24:26].copy().view("<i2")[:, 0].astype(np.float32)
    return us.astype(np.int64), them.astype(np.int64), kus.astype(np.int64), kthem.astype(np.int64), bk.astype(np.int64), score, stm, r[:, 27]


def targets(score, res, lam):
    e = 1 / (1 + np.exp(-score / SCALE))
    w = np.where(res == 3, 1.0, np.where(res == 1, 0.0, 0.5))
    return np.where(res > 0, lam * e + (1 - lam) * w, e).astype(np.float32)


class Data:
    """all files as one memory-mapped array; reading order: shuffled chunks of 1M records, 8 chunks mixed at a time"""
    CH = 1 << 20

    def __init__(self, files, hold=0):
        self.maps = [np.memmap(f, dtype=np.uint8, mode="r").reshape(-1, REC) for f in files if os.path.getsize(f) >= REC]
        self.chunks = []
        for i, m in enumerate(self.maps):
            n = len(m) - (hold if i == len(self.maps) - 1 else 0)
            for a in range(0, max(n, 0), self.CH):
                self.chunks.append((i, a, min(a + self.CH, n)))
        self.n = sum(b - a for _, a, b in self.chunks)

    def val(self, hold):
        m = self.maps[-1]
        return np.asarray(m[len(m) - hold:])

    def groups(self, epoch, seed):
        rng = np.random.default_rng(seed * 1000 + epoch)
        order = rng.permutation(len(self.chunks))
        return [order[i:i + 8] for i in range(0, len(order), 8)], rng

    def load(self, grp, rng):
        a = np.concatenate([np.asarray(self.maps[i][s:e]) for i, s, e in (self.chunks[j] for j in grp)])
        return a[rng.permutation(len(a))]


# ---------------------------------------------------------------- net file
def nbytes(H, kb=1):
    return kb * 768 * H * 2 + H * 2 + NB * 2 * H * 2 + NB * 4 + (16 if kb > 1 else 0)


def read_net(path):
    """-> (H, kb, W1 [kb*768, H], B1, W2, B2)"""
    b = open(path, "rb").read()
    if b[:2] == b"\x1f\x8b":
        import gzip
        b = gzip.decompress(b)
    if len(b) > 16 and b[-16:-12] == b"CKB1":
        kb, H = (int(x) for x in np.frombuffer(b[-12:-4], "<u4"))
    else:   # without king buckets: H from the size, 2*768H + 2H + 32H + 32
        kb, H = 1, (len(b) - NB * 4) // (768 * 2 + 2 + NB * 4)
    if nbytes(H, kb) != len(b) or kb not in KBS:
        raise SystemExit("%s: not a chess net (%d bytes)" % (path, len(b)))
    o = 0
    W1 = np.frombuffer(b, "<i2", kb * 768 * H, o).reshape(kb * 768, H); o += kb * 768 * H * 2
    B1 = np.frombuffer(b, "<i2", H, o); o += H * 2
    W2 = np.frombuffer(b, "<i2", NB * 2 * H, o).reshape(NB, 2 * H); o += NB * 2 * H * 2
    B2 = np.frombuffer(b, "<i4", NB, o)
    return H, kb, W1, B1, W2, B2


def quantize(W1, B1, W2, B2):
    q = lambda x, s: np.clip(np.rint(np.asarray(x, np.float64) * s), -32767, 32767)
    return (q(W1, QA).astype("<i2"), q(B1, QA).astype("<i2"), q(W2, QB).astype("<i2"),
            np.rint(np.asarray(B2, np.float64) * QA * QB).astype("<i4"))


def write_net(path, W1, B1, W2, B2):
    """W1: [kb*768, H] (kb = 1: the file has no trailer, as the v1 / v2 nets)"""
    W1 = np.asarray(W1).reshape(-1, np.shape(B1)[0])
    kb, H = W1.shape[0] // 768, W1.shape[1]
    a, b, c, d = quantize(W1, B1, W2, B2)
    tmp = path + ".tmp"
    with open(tmp, "wb") as f:
        for x in (a, b, c, d):
            f.write(x.tobytes())
        if kb > 1:
            f.write(b"CKB1" + np.array([kb, H, 0], "<u4").tobytes())
    os.replace(tmp, path)


def init_copy(W1, kb):
    """a net without king buckets -> every bucket: 4 / 8 / 16 then evaluate exactly as the old net. With 32 (mirrored) the
    weights are mirrored (f ^ 7): exact for a king on files e-h (e1, g1: the usual squares), approximate on a-d."""
    bt, mt = kb_table(kb)
    f = np.arange(768)
    return np.concatenate([W1[f ^ 7] if mt[bt == b].any() else W1 for b in range(kb)])


def gidx(f, k, kb):
    """feature [B,64] (768 = empty) and king bucket [B] -> row of W1 [kb*768] (kb*768 = empty)"""
    return np.where(f == 768, kb * 768, k[:, None] * 768 + f)


def int_eval(net, r):
    """the engine's integer evaluation (engine.c nn_eval, scalar path) of records r -> int cp, side to move"""
    H, kb, W1, B1, W2, B2 = net
    us, them, kus, kthem, bk, _, _, _ = decode(r, kb)
    gu, gt = gidx(us, kus, kb), gidx(them, kthem, kb)
    W1z = np.vstack([W1.astype(np.int64), np.zeros((1, H), np.int64)])
    out = []
    for i in range(len(r)):
        au = (B1.astype(np.int64) + W1z[gu[i]].sum(0)).astype(np.int16).astype(np.int64)
        at = (B1.astype(np.int64) + W1z[gt[i]].sum(0)).astype(np.int16).astype(np.int64)
        xu, xt = np.clip(au, 0, QA), np.clip(at, 0, QA)
        w = W2[bk[i]].astype(np.int64)
        s = int((xu * xu * w[:H]).sum() + (xt * xt * w[H:]).sum())
        v = s // QA if s >= 0 else -((-s) // QA)               # C division: towards zero
        v += int(B2[bk[i]])
        n = v * SCALE
        out.append(n // (QA * QB) if n >= 0 else -((-n) // (QA * QB)))
    return out


# ---------------------------------------------------------------- backends
class TorchNet:
    def __init__(self, H, init, lr, seed, dev, kb=1):
        import torch
        self.t = torch
        self.dev = dev
        self.kb = kb
        g = torch.Generator().manual_seed(seed)
        if init is not None:
            W1, B1, W2, B2 = [torch.tensor(np.asarray(x, np.float32)) for x in init]
            W1 = W1.reshape(kb, 768, H)
        else:
            W1 = torch.randn(kb, 768, H, generator=g) * 0.08
            B1 = torch.full((H,), 0.1)
            W2 = torch.randn(NB, 2 * H, generator=g) * 0.08
            B2 = torch.zeros(NB)
        self.p = [x.to(dev).requires_grad_() for x in (W1, B1, W2, B2)]
        self.opt = torch.optim.Adam(self.p, lr=lr)
        self.H = H

    def out(self, b):
        t = self.t
        W1, B1, W2, B2 = self.p
        W1z = t.cat([W1, t.zeros(self.kb, 1, self.H, device=self.dev)], 1)
        def acc(idx, cnt, inv):
            # the rows come sorted by king bucket (batches()): one matmul per bucket, then back to the batch order
            x = t.zeros(idx.shape[0], 769, device=self.dev)
            x.scatter_(1, idx, 1.0)
            if self.kb == 1:
                return x @ W1z[0] + B1
            parts = t.split(x, cnt)
            y = t.cat([p @ W1z[k] for k, p in enumerate(parts) if cnt[k]])
            return y[inv] + B1
        a = t.cat([acc(b["us"], b["cu"], b.get("iu")), acc(b["them"], b["ct"], b.get("it"))], 1).clamp(0, 1).pow(2)
        bk = b["bk"]
        return (a * W2[bk]).sum(1) + B2[bk]

    def dev_batch(self, batch):
        t = self.t
        return {k: (v if isinstance(v, list) else t.from_numpy(v).to(self.dev)) for k, v in batch.items()}

    def step(self, batch, lr):
        t = self.t
        b = self.dev_batch(batch)
        for gr in self.opt.param_groups:
            gr["lr"] = lr
        p = t.sigmoid(self.out(b))
        loss = ((p - b["tg"]) ** 2).mean()
        self.opt.zero_grad(set_to_none=True)
        loss.backward()
        self.opt.step()
        with t.no_grad():
            for x in self.p[:3]:
                x.clamp_(-CLIP, CLIP)
            self.p[3].clamp_(-100, 100)
        return loss

    def loss(self, batch):
        t = self.t
        with t.no_grad():
            b = self.dev_batch(batch)
            return float(((t.sigmoid(self.out(b)) - b["tg"]) ** 2).sum())

    def params(self):
        P = [x.detach().cpu().numpy() for x in self.p]
        P[0] = P[0].reshape(self.kb * 768, self.H)
        return P

    def state(self):
        return {"p": self.params(), "opt": self.opt.state_dict()}

    def load_state(self, st):
        t = self.t
        with t.no_grad():
            for x, v in zip(self.p, st["p"]):
                x.copy_(t.from_numpy(np.asarray(v)).reshape(x.shape))
        self.opt.load_state_dict(st["opt"])


class NumpyNet:
    """the same model and Adam, by hand (slow; for tests without PyTorch)"""
    def __init__(self, H, init, lr, seed, dev=None, kb=1):
        rng = np.random.default_rng(seed)
        if init is not None:
            self.p = [np.array(x, np.float32) for x in init]
        else:
            self.p = [rng.standard_normal((kb * 768, H)).astype(np.float32) * 0.08, np.full(H, 0.1, np.float32),
                      rng.standard_normal((NB, 2 * H)).astype(np.float32) * 0.08, np.zeros(NB, np.float32)]
        self.m = [np.zeros_like(x) for x in self.p]
        self.v = [np.zeros_like(x) for x in self.p]
        self.it = 0
        self.H = H
        self.kb = kb

    def fwd(self, b):
        W1, B1, W2, B2 = self.p
        B, n = len(b["tg"]), self.kb * 768
        def onehot(f, k):
            x = np.zeros((B, n + 1), np.float32)
            np.put_along_axis(x, gidx(f, k, self.kb), 1.0, axis=1)
            return x[:, :n]
        xu, xt = onehot(b["fu"], b["ku"]), onehot(b["ft"], b["kt"])
        au, at = xu @ W1 + B1, xt @ W1 + B1
        a = np.concatenate([np.clip(au, 0, 1) ** 2, np.clip(at, 0, 1) ** 2], 1)
        w = W2[b["bk"]]
        return (a * w).sum(1) + B2[b["bk"]], (xu, xt, au, at, a, w)

    def step(self, batch, lr):
        bk, tg = batch["bk"], batch["tg"]
        o, (xu, xt, au, at, a, w) = self.fwd(batch)
        p = 1 / (1 + np.exp(-o))
        e = p - tg
        g = (2 * e * p * (1 - p) / len(tg)).astype(np.float32)
        H = self.H
        gW2 = np.zeros_like(self.p[2]); np.add.at(gW2, bk, g[:, None] * a)
        gB2 = np.zeros_like(self.p[3]); np.add.at(gB2, bk, g)
        du = g[:, None] * w[:, :H] * 2 * au * ((au > 0) & (au < 1))
        dt = g[:, None] * w[:, H:] * 2 * at * ((at > 0) & (at < 1))
        gW1 = xu.T @ du + xt.T @ dt
        gB1 = (du + dt).sum(0)
        self.it += 1
        c1, c2 = 1 - 0.9 ** self.it, 1 - 0.999 ** self.it
        for i, gr in enumerate((gW1, gB1, gW2, gB2)):
            self.m[i] = 0.9 * self.m[i] + 0.1 * gr
            self.v[i] = 0.999 * self.v[i] + 0.001 * gr * gr
            self.p[i] -= (lr * (self.m[i] / c1) / (np.sqrt(self.v[i] / c2) + 1e-8)).astype(np.float32)
            np.clip(self.p[i], -CLIP if i < 3 else -100, CLIP if i < 3 else 100, out=self.p[i])
        return float((e * e).mean())

    def loss(self, batch):
        o, _ = self.fwd(batch)
        return float(((1 / (1 + np.exp(-o)) - batch["tg"]) ** 2).sum())

    def params(self):
        return [x.copy() for x in self.p]

    def state(self):
        return {"p": self.params(), "m": self.m, "v": self.v, "it": self.it}

    def load_state(self, st):
        self.p, self.m, self.v, self.it = [np.array(x) for x in st["p"]], st["m"], st["v"], st["it"]


def batches(arr, bs, lam, kb=1, backend="torch"):
    for i in range(0, len(arr) - bs + 1, bs):
        us, them, kus, kthem, bk, score, _, res = decode(arr[i:i + bs], kb)
        b = {"bk": bk, "tg": targets(score, res, lam)}
        if backend == "numpy":
            b.update(fu=us, ft=them, ku=kus, kt=kthem)
        elif kb == 1:
            b.update(us=us, them=them, cu=[len(us)], ct=[len(us)])
        else:   # rows sorted by king bucket for the per-bucket matmuls (TorchNet.out), with the way back
            for f, k, a, c, v in ((us, kus, "us", "cu", "iu"), (them, kthem, "them", "ct", "it")):
                o = np.argsort(k, kind="stable")
                b[a] = f[o]
                b[c] = np.bincount(k, minlength=kb).tolist()
                b[v] = np.argsort(o)
        yield b


def prefetch(gen, n=4):
    q = queue.Queue(n)
    def run():
        for x in gen:
            q.put(x)
        q.put(None)
    threading.Thread(target=run, daemon=True).start()
    while True:
        x = q.get()
        if x is None:
            return
        yield x


def save_ckpt(path, net, meta, backend):
    tmp = path + ".tmp"
    st = {"net": net.state(), "meta": meta}
    if backend == "torch":
        import torch
        torch.save(st, tmp)
    else:
        import pickle
        with open(tmp, "wb") as f:
            pickle.dump(st, f)
    os.replace(tmp, path)


def load_ckpt(path, backend):
    if backend == "torch":
        import torch
        return torch.load(path, weights_only=False)
    import pickle
    with open(path, "rb") as f:
        return pickle.load(f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("data", nargs="*")
    ap.add_argument("--out")
    ap.add_argument("--check", nargs="+", metavar=("NET", "DATA"))
    ap.add_argument("--hidden", type=int, default=384)
    ap.add_argument("--kb", type=int, default=1, choices=KBS, help="king buckets (1 = none, the v1 / v2 nets)")
    ap.add_argument("--epochs", type=int, default=12)
    ap.add_argument("--lr", type=float, default=0.001)
    ap.add_argument("--lam", type=float, default=0.9)
    ap.add_argument("--batch", type=int, default=16384)
    ap.add_argument("--init", help="start from an engine net (nnue.bin / .gz, same H; a net without king buckets is copied into every bucket)")
    ap.add_argument("--val", help="validation records (default: the last 200k records of the last data file)")
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--save-min", type=float, default=10)
    ap.add_argument("--backend", choices=["torch", "numpy"], default="torch")
    ap.add_argument("--device", default="auto")
    ap.add_argument("--max-batches", type=int, default=0, help="stop each epoch after this many batches (tests)")
    a = ap.parse_args()

    if a.check:
        net = read_net(a.check[0])
        n = int(a.check[2]) if len(a.check) > 2 else 20
        r = np.asarray(np.memmap(a.check[1], dtype=np.uint8, mode="r").reshape(-1, REC)[:n])
        for v in int_eval(net, r):
            print(v)
        return
    if not a.out or not a.data:
        ap.error("--out and data files are needed")

    dev = None
    if a.backend == "torch":
        import torch
        if a.device != "auto":
            dev = torch.device(a.device)
        elif torch.backends.mps.is_available():
            dev = torch.device("mps")
        elif torch.cuda.is_available():
            dev = torch.device("cuda")
        else:
            dev = torch.device("cpu")
            torch.set_num_threads(os.cpu_count() or 4)
    hold = 0 if a.val else 200000
    D = Data(a.data, hold)
    V = np.asarray(np.memmap(a.val, dtype=np.uint8, mode="r").reshape(-1, REC)[:1000000]) if a.val else D.val(hold)
    init = None
    if a.init:
        H, ikb, W1, B1, W2, B2 = read_net(a.init)
        if H != a.hidden:
            raise SystemExit("--init has H=%d, --hidden is %d" % (H, a.hidden))
        if ikb == 1 and a.kb > 1:
            W1 = init_copy(W1, a.kb)
        elif ikb != a.kb:
            raise SystemExit("--init has %d king buckets, --kb is %d" % (ikb, a.kb))
        init = (W1 / QA, B1 / QA, W2 / QB, B2 / (QA * QB))
    Net = TorchNet if a.backend == "torch" else NumpyNet
    net = Net(a.hidden, init, a.lr, a.seed, dev, a.kb)
    ck = a.out + ".ckpt"
    meta = {"epoch": 0, "group": 0, "args": vars(a)}
    if os.path.exists(ck):
        st = load_ckpt(ck, a.backend)
        net.load_state(st["net"])
        meta = st["meta"]
        print("resumed from %s: epoch %d, chunk group %d" % (ck, meta["epoch"] + 1, meta["group"]), file=sys.stderr)
    vb = min(a.batch, 8192)
    def validate():
        s, n = 0.0, 0
        for b in batches(V, vb, a.lam, a.kb, a.backend):
            s += net.loss(b); n += len(b["tg"])
        return s / max(n, 1)
    print("train %d positions (%d files), valid %d, H %d, king buckets %d, %s %s" % (D.n, len(D.maps), len(V), a.hidden, a.kb, a.backend, dev or ""), file=sys.stderr)
    log = open(a.out + ".log", "a")
    if meta["epoch"] == 0 and meta["group"] == 0:
        v0 = validate()
        print("epoch 0 valid %.6f" % v0, file=sys.stderr)
        log.write("epoch 0 valid %.6f\n" % v0); log.flush()
    while meta["epoch"] < a.epochs:
        ep = meta["epoch"]
        lr = a.lr * (0.1 if ep >= a.epochs * 0.75 else 0.3 if ep >= a.epochs * 0.5 else 1.0)
        groups, rng = D.groups(ep, a.seed)
        t0 = time.time(); last = t0; done = 0; tl = 0.0; nb = 0
        for gi in range(meta["group"], len(groups)):
            arr = D.load(groups[gi], np.random.default_rng((a.seed * 1000 + ep) * 100000 + gi))
            for b in prefetch(batches(arr, a.batch, a.lam, a.kb, a.backend)):
                l = net.step(b, lr)
                nb += 1; done += len(b["tg"])
                if nb % 50 == 0:
                    tl = float(l)
                if a.max_batches and nb >= a.max_batches:
                    break
                if time.time() - last > 30:
                    last = time.time()
                    print("\r  epoch %d  %5.1f%%  loss %.5f  %.0fk pos/s   " % (ep + 1, 100.0 * (gi + 1) / len(groups), tl, done / (last - t0) / 1000), end="", file=sys.stderr)
            meta["group"] = gi + 1
            if time.time() - meta.get("saved", 0) > a.save_min * 60:
                meta["saved"] = time.time()
                save_ckpt(ck, net, meta, a.backend)
            if a.max_batches and nb >= a.max_batches:
                break
        vl = validate()
        P = net.params()
        write_net(a.out + ".ep%d" % (ep + 1), *P)
        write_net(a.out, *P)
        line = "epoch %d valid %.6f lr %g %.0fs %.0fk pos/s" % (ep + 1, vl, lr, time.time() - t0, done / max(time.time() - t0, 1e-9) / 1000)
        print("\r" + line + " " * 20, file=sys.stderr)
        log.write(line + "\n"); log.flush()
        meta["epoch"] = ep + 1; meta["group"] = 0
        save_ckpt(ck, net, meta, a.backend)
    print("done: %s" % a.out, file=sys.stderr)


if __name__ == "__main__":
    main()

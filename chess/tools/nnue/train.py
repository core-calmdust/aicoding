#!/usr/bin/env python3
"""Trainer for the chess NNUE of chess/engine.c: (768 -> H) x 2 perspectives -> 1, SCReLU, 8 output buckets by the
number of pieces. PyTorch (Apple GPU "mps", else CUDA, else CPU); a small NumPy backend (--backend numpy) for tests.

The output file is the engine's raw net (nnue.bin, then gzip -> nnue.bin.gz), H = 384 like the shipped one:
    int16 W1[768][H] (x255) | int16 B1[H] (x255) | int16 W2[8][2H] (x64) | int32 B2[8] (x255x64)
eval (cp, side to move) = 400 * (sum_i clamp(acc,0,1)^2 * W2[bucket] + B2[bucket]), bucket = (pieces - 2) / 4.

Data: 32-byte records (tools/convert.c, tools/nnue/nntool gen / rescore). Target:
    t = lam * sigmoid(score / 400) + (1 - lam) * result       (records without a result use the score alone)
loss = mean (sigmoid(out) - t)^2, Adam, weights kept in +-1.98 (so the quantised net matches the float one).

  python3 train.py --out nnwork/net.bin [--epochs 12] [--hidden 384] [--lr 0.001] [--lam 0.9] [--init nnue.bin]
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
def decode(r):
    """r: uint8 [B, 32] -> (us idx [B,64], them idx [B,64] with 768 = empty, bucket [B], score [B], stm [B], res [B])"""
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
    us = np.where(stm[:, None], fb, fw)
    them = np.where(stm[:, None], fw, fb)
    cnt = bits.sum(axis=1)
    bk = np.clip((cnt - 2) // 4, 0, 7)
    score = r[:, 24:26].copy().view("<i2")[:, 0].astype(np.float32)
    return us.astype(np.int64), them.astype(np.int64), bk.astype(np.int64), score, stm, r[:, 27]


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
def nbytes(H):
    return 768 * H * 2 + H * 2 + NB * 2 * H * 2 + NB * 4


def read_net(path):
    b = open(path, "rb").read()
    if b[:2] == b"\x1f\x8b":
        import gzip
        b = gzip.decompress(b)
    # H from the size: 2*768H + 2H + 32H + 32
    H = (len(b) - NB * 4) // (768 * 2 + 2 + NB * 4)
    if nbytes(H) != len(b):
        raise SystemExit("%s: not a chess net (%d bytes)" % (path, len(b)))
    o = 0
    W1 = np.frombuffer(b, "<i2", 768 * H, o).reshape(768, H); o += 768 * H * 2
    B1 = np.frombuffer(b, "<i2", H, o); o += H * 2
    W2 = np.frombuffer(b, "<i2", NB * 2 * H, o).reshape(NB, 2 * H); o += NB * 2 * H * 2
    B2 = np.frombuffer(b, "<i4", NB, o)
    return H, W1, B1, W2, B2


def quantize(W1, B1, W2, B2):
    q = lambda x, s: np.clip(np.rint(np.asarray(x, np.float64) * s), -32767, 32767)
    return (q(W1, QA).astype("<i2"), q(B1, QA).astype("<i2"), q(W2, QB).astype("<i2"),
            np.rint(np.asarray(B2, np.float64) * QA * QB).astype("<i4"))


def write_net(path, W1, B1, W2, B2):
    a, b, c, d = quantize(W1, B1, W2, B2)
    tmp = path + ".tmp"
    with open(tmp, "wb") as f:
        for x in (a, b, c, d):
            f.write(x.tobytes())
    os.replace(tmp, path)


def int_eval(net, r):
    """the engine's integer evaluation (engine.c nn_eval, scalar path) of records r -> int cp, side to move"""
    H, W1, B1, W2, B2 = net
    us, them, bk, _, _, _ = decode(r)
    W1z = np.vstack([W1.astype(np.int64), np.zeros((1, H), np.int64)])
    out = []
    for i in range(len(r)):
        au = (B1.astype(np.int64) + W1z[us[i]].sum(0)).astype(np.int16).astype(np.int64)
        at = (B1.astype(np.int64) + W1z[them[i]].sum(0)).astype(np.int16).astype(np.int64)
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
    def __init__(self, H, init, lr, seed, dev):
        import torch
        self.t = torch
        self.dev = dev
        g = torch.Generator().manual_seed(seed)
        if init is not None:
            W1, B1, W2, B2 = [torch.tensor(np.asarray(x, np.float32)) for x in init]
        else:
            W1 = torch.randn(768, H, generator=g) * 0.08
            B1 = torch.full((H,), 0.1)
            W2 = torch.randn(NB, 2 * H, generator=g) * 0.08
            B2 = torch.zeros(NB)
        self.p = [x.to(dev).requires_grad_() for x in (W1, B1, W2, B2)]
        self.opt = torch.optim.Adam(self.p, lr=lr)
        self.H = H

    def out(self, us, them, bk):
        t = self.t
        W1, B1, W2, B2 = self.p
        B = us.shape[0]
        W1z = t.cat([W1, t.zeros(1, self.H, device=self.dev)])
        def acc(idx):
            x = t.zeros(B, 769, device=self.dev)
            x.scatter_(1, idx, 1.0)
            return x @ W1z + B1
        a = t.cat([acc(us), acc(them)], 1).clamp(0, 1).pow(2)
        return (a * W2[bk]).sum(1) + B2[bk]

    def step(self, batch, lr):
        t = self.t
        us, them, bk, tg = [t.from_numpy(x).to(self.dev) for x in batch]
        for gr in self.opt.param_groups:
            gr["lr"] = lr
        p = t.sigmoid(self.out(us, them, bk))
        loss = ((p - tg) ** 2).mean()
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
            us, them, bk, tg = [t.from_numpy(x).to(self.dev) for x in batch]
            return float(((t.sigmoid(self.out(us, them, bk)) - tg) ** 2).sum())

    def params(self):
        return [x.detach().cpu().numpy() for x in self.p]

    def state(self):
        return {"p": self.params(), "opt": self.opt.state_dict()}

    def load_state(self, st):
        t = self.t
        with t.no_grad():
            for x, v in zip(self.p, st["p"]):
                x.copy_(t.from_numpy(v))
        self.opt.load_state_dict(st["opt"])


class NumpyNet:
    """the same model and Adam, by hand (slow; for tests without PyTorch)"""
    def __init__(self, H, init, lr, seed, dev=None):
        rng = np.random.default_rng(seed)
        if init is not None:
            self.p = [np.array(x, np.float32) for x in init]
        else:
            self.p = [rng.standard_normal((768, H)).astype(np.float32) * 0.08, np.full(H, 0.1, np.float32),
                      rng.standard_normal((NB, 2 * H)).astype(np.float32) * 0.08, np.zeros(NB, np.float32)]
        self.m = [np.zeros_like(x) for x in self.p]
        self.v = [np.zeros_like(x) for x in self.p]
        self.it = 0
        self.H = H

    def fwd(self, us, them, bk):
        W1, B1, W2, B2 = self.p
        B = len(us)
        def onehot(idx):
            x = np.zeros((B, 769), np.float32)
            np.put_along_axis(x, idx, 1.0, axis=1)
            return x[:, :768]
        xu, xt = onehot(us), onehot(them)
        au, at = xu @ W1 + B1, xt @ W1 + B1
        a = np.concatenate([np.clip(au, 0, 1) ** 2, np.clip(at, 0, 1) ** 2], 1)
        w = W2[bk]
        return (a * w).sum(1) + B2[bk], (xu, xt, au, at, a, w)

    def step(self, batch, lr):
        us, them, bk, tg = batch
        o, (xu, xt, au, at, a, w) = self.fwd(us, them, bk)
        p = 1 / (1 + np.exp(-o))
        e = p - tg
        g = (2 * e * p * (1 - p) / len(us)).astype(np.float32)
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
        us, them, bk, tg = batch
        o, _ = self.fwd(us, them, bk)
        return float(((1 / (1 + np.exp(-o)) - tg) ** 2).sum())

    def params(self):
        return [x.copy() for x in self.p]

    def state(self):
        return {"p": self.params(), "m": self.m, "v": self.v, "it": self.it}

    def load_state(self, st):
        self.p, self.m, self.v, self.it = [np.array(x) for x in st["p"]], st["m"], st["v"], st["it"]


def batches(arr, bs, lam):
    for i in range(0, len(arr) - bs + 1, bs):
        us, them, bk, score, _, res = decode(arr[i:i + bs])
        yield us, them, bk, targets(score, res, lam)


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
    ap.add_argument("--epochs", type=int, default=12)
    ap.add_argument("--lr", type=float, default=0.001)
    ap.add_argument("--lam", type=float, default=0.9)
    ap.add_argument("--batch", type=int, default=16384)
    ap.add_argument("--init", help="start from an engine net (nnue.bin / .gz, same H)")
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
        H, W1, B1, W2, B2 = read_net(a.init)
        if H != a.hidden:
            raise SystemExit("--init has H=%d, --hidden is %d" % (H, a.hidden))
        init = (W1 / QA, B1 / QA, W2 / QB, B2 / (QA * QB))
    Net = TorchNet if a.backend == "torch" else NumpyNet
    net = Net(a.hidden, init, a.lr, a.seed, dev)
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
        for b in batches(V, vb, a.lam):
            s += net.loss(b); n += len(b[0])
        return s / max(n, 1)
    print("train %d positions (%d files), valid %d, H %d, %s %s" % (D.n, len(D.maps), len(V), a.hidden, a.backend, dev or ""), file=sys.stderr)
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
            for b in prefetch(batches(arr, a.batch, a.lam)):
                l = net.step(b, lr)
                nb += 1; done += len(b[0])
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

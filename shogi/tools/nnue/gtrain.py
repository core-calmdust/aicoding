#!/usr/bin/env python3
"""gtrain: the NNUE trainer on the GPU (PyTorch: Apple's MPS, CUDA, or the CPU) — for billions of positions, where the C
trainer (trainkp.c, about 90 thousand positions a second) is too slow. The same net, the same loss and the same file as
trainkp.c with --kb k1:   (2534 -> H) x 2 perspectives, SCReLU -> 1  [+ --ob 8 output buckets]  [+ --l1 N1 --l2 N2: a
small MLP beside the linear output, on the clipped (not squared) first-layer outputs].

  python3 gtrain.py train.bin out.bin --hidden 1024 --l1 16 --l2 32 --passes 1 [--val val.bin]
    train.bin   shuffled PackedSfenValue records (prep's output); several files are read one after another
    --passes P  how many times the data is gone through (may be a fraction); --max N: only the first N positions
    --lr 0.001 --lr-end 0.00003   Adam; the rate falls geometrically from --lr to --lr-end over the run (--warmup 500 steps)
    --lambda 0.75 --oscale 0.805  as trainkp.c (target = L x sigmoid(score / 600) + (1 - L) x result; output = s x scale)
    --batch 16384 --threads 8 (the decoder's) --ft dense|gather (how the first layer is computed: --bench measures both)
    --snap N    also writes out.bin.pNNN every N positions (default 500 million), to play the stages against each other
  out.bin is written at every report; out.bin.ckpt (weights, Adam's state, the position) every 10 minutes: the same
  command continues from it (delete it to start over).
  python3 gtrain.py train.bin --bench        positions a second of the decoder and of both --ft modes on this machine

Needs: pip install torch numpy; the decoder is built on first use (cc, gfeed.c beside this file)."""
import argparse, ctypes, math, os, queue, struct, subprocess, sys, threading, time
import numpy as np
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
IN, NF, QA, QB = 2534, 40, 127, 64
W1CLIP, W2CLIP, ACLIP = 1.98, 60.0, 1.98

def feeder():
    lib = os.path.join(HERE, 'libgfeed.dylib' if sys.platform == 'darwin' else 'libgfeed.so')
    src = os.path.join(HERE, 'gfeed.c')
    if not os.path.exists(lib) or os.path.getmtime(lib) < os.path.getmtime(src):
        subprocess.run(['cc', '-O3', '-shared', '-fPIC', '-w', '-o', lib, src, '-lpthread'], check=True)
    L = ctypes.CDLL(lib); L.gfeed_fill.restype = ctypes.c_long
    L.gfeed_fill.argtypes = [ctypes.c_void_p, ctypes.c_long] + [ctypes.c_void_p] * 6 + [ctypes.c_int]
    return L

class Data:
    """the files as one stream of records; chunks decoded by the C library in a background thread"""
    def __init__(self, paths, chunk, threads, start=0, limit=0):
        self.maps = [np.memmap(p, dtype=np.uint8, mode='r') for p in paths]
        self.counts = [len(m) // 40 for m in self.maps]; self.total = sum(self.counts)
        if limit: self.total = min(self.total, limit)
        self.chunk, self.threads, self.pos, self.L = chunk, threads, start % max(self.total, 1), feeder()
        self.q = queue.Queue(maxsize=3); threading.Thread(target=self.run, daemon=True).start()
    def raw(self, pos, n):
        out = []
        for m, c in zip(self.maps, self.counts):
            if pos < c:
                k = min(n, c - pos); out.append(np.asarray(m[pos * 40:(pos + k) * 40])); n -= k; pos = 0
                if not n: break
            else: pos -= c
        return out[0] if len(out) == 1 else np.concatenate(out)
    def decode(self, buf):
        n = len(buf) // 40; buf = np.ascontiguousarray(buf)
        fu = np.empty((n, NF), np.uint16); ft = np.empty((n, NF), np.uint16); sc = np.empty(n, np.int16)
        rs = np.empty(n, np.int8); ply = np.empty(n, np.uint16); bk = np.empty(n, np.uint8)
        p = lambda a: a.ctypes.data_as(ctypes.c_void_p)
        self.L.gfeed_fill(p(buf), n, p(fu), p(ft), p(sc), p(rs), p(ply), p(bk), self.threads)
        return fu, ft, sc, rs, ply, bk
    def run(self):
        while True:
            n = min(self.chunk, self.total - self.pos)
            self.q.put(self.decode(self.raw(self.pos, n))); self.pos = (self.pos + n) % self.total
    def get(self): return self.q.get()

class Net(torch.nn.Module):
    def __init__(s, H, OB, N1, N2, MI):
        super().__init__(); P = torch.nn.Parameter; s.H, s.OB, s.N1, s.N2, s.MI = H, OB, N1, N2, MI
        s.W1 = P(torch.randn(IN, H) * 0.05); s.B1 = P(torch.zeros(H))
        s.W2 = P(torch.randn(OB, 2 * H) * 0.5 / math.sqrt(H / 256)); s.B2 = P(torch.zeros(OB))
        if N1:
            # with output buckets the MLP has one set of weights per bucket too (the "layer stack" of the strong programs)
            s.MA = P(torch.randn(OB * N1, 2 * MI) * 0.03 * math.sqrt(256 / MI)); s.Ma = P(torch.full((OB * N1,), 0.5))
            s.MB = P(torch.randn(OB, N2, N1) * 0.15); s.Md = P(torch.full((OB, N2), 0.5)); s.MC = P(torch.zeros(OB, N2))
    def forward(s, fu, ft, bk, ftmode):
        B = fu.shape[0]; idx = torch.cat([fu, ft]).long()
        if ftmode == 'dense':
            X = torch.zeros(2 * B, IN + 1, device=idx.device); X.scatter_(1, idx, 1.0); acc = X[:, :IN] @ s.W1 + s.B1
        else:
            acc = torch.nn.functional.embedding(idx, torch.cat([s.W1, torch.zeros(1, s.H, device=idx.device)])).sum(1) + s.B1
        x = acc.clamp(0, 1); xu, xt = x[:B], x[B:]
        sq = torch.cat([xu * xu, xt * xt], 1)
        o = (sq * s.W2[bk]).sum(1) + s.B2[bk] if s.OB > 1 else sq @ s.W2[0] + s.B2[0]
        if s.N1:
            c = torch.cat([xu[:, :s.MI], xt[:, :s.MI]], 1)
            h1 = (c @ s.MA.t() + s.Ma).clamp(0, 1)          # every bucket's first MLP layer (OB x N1 outputs: cheap), then the position's own
            if s.OB > 1: h1 = h1.view(B, s.OB, s.N1).gather(1, bk.view(B, 1, 1).expand(B, 1, s.N1)).squeeze(1)
            b = bk if s.OB > 1 else torch.zeros_like(bk)
            h2 = (torch.einsum('bkj,bj->bk', s.MB[b], h1) + s.Md[b]).clamp(0, 1); o = o + (h2 * s.MC[b]).sum(1)
        return o
    @torch.no_grad()
    def clip(s):
        s.W1.clamp_(-W1CLIP, W1CLIP); s.W2.clamp_(-W2CLIP, W2CLIP)
        if s.N1: s.MA.clamp_(-ACLIP, ACLIP); s.MB.clamp_(-ACLIP, ACLIP)
    def save(s, path):
        """trainkp.c's file with one king bucket: NUEK / NUEO / NUEM"""
        g = lambda t: t.detach().cpu().double().numpy()
        rq = lambda a, sc, lim, dt: np.clip(np.rint(a * sc), -lim, lim).astype(dt).tobytes()
        # NUES: output buckets AND an MLP per bucket (header: + N1, N2, MI, OB; then per bucket MA, Ma, MB, Md, MC)
        magic = 0x5345554E if s.N1 and s.OB > 1 else 0x4D45554E if s.N1 else 0x4F45554E if s.OB > 1 else 0x4B45554E
        hd = [magic, s.H, IN, 1] + ([s.N1, s.N2, s.MI, s.OB] if s.N1 and s.OB > 1 else [s.N1, s.N2, s.MI] if s.N1 else [s.OB] if s.OB > 1 else [])
        with open(path + '.tmp', 'wb') as f:
            f.write(struct.pack(f'<{len(hd)}i', *hd)); f.write(bytes(84))
            f.write(rq(g(s.W1), QA, 32767, '<i2')); f.write(rq(g(s.B1), QA, 32767, '<i4'))
            f.write(rq(g(s.W2), QB, 32767, '<i2')); f.write(np.rint(g(s.B2) * QA * QB).astype('<i4').tobytes())
            if s.N1:
                MA, Ma = g(s.MA).reshape(s.OB, s.N1, -1), g(s.Ma).reshape(s.OB, s.N1); MB, Md, MC = g(s.MB), g(s.Md), g(s.MC)
                QM, lim, dt = (1024, 32767, '<i2') if s.OB > 1 else (QB, 127, 'i1')   # NUES: finer MLP weights (x 64 in int8 cost about 10% of the evaluation's spread)
                for k in range(s.OB):
                    f.write(rq(MA[k], QM, lim, dt)); f.write(np.rint(Ma[k] * QA * QM).astype('<i4').tobytes())
                    f.write(rq(MB[k], QM, lim, dt)); f.write(np.rint(Md[k] * QA * QM).astype('<i4').tobytes())
                    f.write(rq(MC[k], QM, 32767, '<i2'))
        os.replace(path + '.tmp', path)

def tensors(c, dev, lam, lend, lply):
    fu, ft, sc, rs, ply, bk = c
    t = lambda a, dt: torch.from_numpy(a.astype(dt)).to(dev)
    e = torch.sigmoid(t(sc, np.float32) / 600.0); r = t(rs, np.float32); w = (r > -1.5).float(); res = (r.clamp(-1, 1) + 1) * 0.5
    L = lam if lply <= 0 else lend + (lam - lend) * (1 - t(ply, np.float32) / lply).clamp(min=0)
    return t(fu, np.int32), t(ft, np.int32), t(bk, np.int64), L * e + (1 - L) * res, w

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('train', nargs='+'); ap.add_argument('--bench', action='store_true')
    ap.add_argument('--init', default='')   # another run's <out>.ckpt: start from its weights (a second pass at a lower --lr; the optimizer and the count start afresh)
    ap.add_argument('--hidden', type=int, default=512); ap.add_argument('--ob', type=int, default=1)
    ap.add_argument('--l1', type=int, default=0); ap.add_argument('--l2', type=int, default=32); ap.add_argument('--mi', type=int, default=0)
    ap.add_argument('--passes', type=float, default=1.0); ap.add_argument('--max', type=int, default=0)
    ap.add_argument('--lr', type=float, default=0.001); ap.add_argument('--lr-end', type=float, default=0.00003)
    ap.add_argument('--lambda', dest='lam', type=float, default=0.75); ap.add_argument('--lambda-end', type=float, default=0.0)
    ap.add_argument('--lambda-ply', type=int, default=0); ap.add_argument('--oscale', type=float, default=0.805)
    ap.add_argument('--batch', type=int, default=16384); ap.add_argument('--threads', type=int, default=8)
    ap.add_argument('--ft', default='dense', choices=['dense', 'gather']); ap.add_argument('--val', default='')
    ap.add_argument('--snap', type=int, default=500_000_000); ap.add_argument('--device', default='')
    ap.add_argument('--report', type=int, default=20_000_000); ap.add_argument('--warmup', type=int, default=500)
    a = ap.parse_args()
    dev = torch.device(a.device or ('mps' if torch.backends.mps.is_available() else 'cuda' if torch.cuda.is_available() else 'cpu'))
    if a.bench: paths, out = a.train, None
    else:
        if len(a.train) < 2: sys.exit('gtrain.py train.bin [more.bin ...] out.bin')
        paths, out = a.train[:-1], a.train[-1]
    MI = a.mi or a.hidden
    net = Net(a.hidden, a.ob, a.l1, a.l2, MI).to(dev); opt = torch.optim.Adam(net.parameters(), lr=a.lr)
    BS, CH = a.batch, a.batch * 16
    step, seen, t_run = 0, 0, 0.0
    ck = out + '.ckpt' if out else None
    if ck and os.path.exists(ck):
        st = torch.load(ck, map_location=dev); net.load_state_dict(st['net']); opt.load_state_dict(st['opt']); step, seen, t_run = st['step'], st['seen'], st.get('t', 0.0)
        print(f'continuing from {ck}: {seen / 1e6:.0f} million positions done', flush=True)
    elif a.init:
        net.load_state_dict(torch.load(a.init, map_location=dev)['net']); print('starting from the weights of', a.init, flush=True)
    data = Data(paths, CH, a.threads, start=seen, limit=a.max)
    total = int(data.total * a.passes)
    print(f'{dev}, {data.total / 1e6:.1f} million positions x {a.passes} passes, hidden {a.hidden}' + (f', MLP {a.l1}-{a.l2}' if a.l1 else '') + (f', {a.ob} output buckets' if a.ob > 1 else '') + f', first layer: {a.ft}', flush=True)

    def loss_of(c, mode):
        fu, ft, bk, tg, w = tensors(c, dev, a.lam, a.lambda_end, a.lambda_ply)
        return fu, ft, bk, tg, w
    def run_batch(fu, ft, bk, tg, w, mode, train=True):
        o = net(fu, ft, bk, mode); d = torch.sigmoid(o / a.oscale) - tg; loss = (w * d * d).sum() / w.sum().clamp(min=1)
        if train: opt.zero_grad(set_to_none=True); loss.backward(); opt.step(); net.clip()
        return loss

    if a.bench:
        t0 = time.time(); c = [data.get() for _ in range(4)]; dt = time.time() - t0
        print(f'decoder: {4 * CH / dt / 1e3:.0f} thousand positions/s ({a.threads} threads)', flush=True)
        T = loss_of(c[0], 'dense'); n = T[0].shape[0]
        for mode, bs in (('dense', BS), ('gather', BS), ('dense', BS * 2), ('dense', BS * 4), ('dense', BS * 8)):
            try:
                nb = max(1, n // bs)
                for rep in range(3):   # (the first round warms up)
                    t0 = time.time()
                    for b in range(nb): l = run_batch(*[x[b * bs:(b + 1) * bs] for x in T], mode)
                    l.item(); dt = time.time() - t0
                print(f'{mode}, batch {bs}: {nb * bs / dt / 1e3:.0f} thousand positions/s (hidden {a.hidden})', flush=True)
            except Exception as e: print(f'{mode}, batch {bs}: failed on {dev}: {str(e)[:200]}', flush=True)
        return

    val = None
    if a.val:
        vd = Data([a.val], 200_000, a.threads, limit=200_000); val = loss_of(vd.get(), a.ft)
    def validate():
        if val is None: return float('nan')
        with torch.no_grad(): return sum(run_batch(*[x[i:i + 50_000] for x in val], a.ft, train=False).item() for i in range(0, 200_000, 50_000)) / 4
    t0 = time.time(); last_ck = t0; acc, nacc, next_rep, next_snap = 0.0, 0, (seen // a.report + 1) * a.report, (seen // a.snap + 1) * a.snap
    while seen < total:
        T = loss_of(data.get(), a.ft); n = T[0].shape[0]
        for b in range(0, n, BS):
            lr = a.lr * (a.lr_end / a.lr) ** min(1.0, seen / max(total, 1)) * min(1.0, (step + 1) / max(a.warmup, 1))
            for g in opt.param_groups: g['lr'] = lr
            l = run_batch(*[x[b:b + BS] for x in T], a.ft); step += 1; seen += min(BS, n - b)
            if step % 50 == 0 or nacc == 0: acc += l.item(); nacc += 1
        if seen >= next_rep or seen >= total:
            el = t_run + time.time() - t0; net.save(out)
            print(f'{seen / 1e6:8.0f}M  loss {acc / max(nacc, 1):.5f}  valid {validate():.5f}  lr {lr:.6f}  {seen / max(el, 1) / 1e3:.0f}k/s  {el / 3600:.2f} h, about {(total - seen) / max(seen / max(el, 1), 1) / 3600:.1f} h left', flush=True)
            acc, nacc, next_rep = 0.0, 0, (seen // a.report + 1) * a.report
        if seen >= next_snap: net.save(f'{out}.p{seen // a.snap:03d}'); next_snap = (seen // a.snap + 1) * a.snap
        if time.time() - last_ck > 600 or seen >= total:
            torch.save({'net': net.state_dict(), 'opt': opt.state_dict(), 'step': step, 'seen': seen, 't': t_run + time.time() - t0}, ck + '.tmp'); os.replace(ck + '.tmp', ck); last_ck = time.time()
    net.save(out); print(f'done: {out}', flush=True)

if __name__ == '__main__': main()

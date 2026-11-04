#!/usr/bin/env python3
"""Train the learned evaluation of the Hnefatafl engine (tafl/engine.c, nnEvaluate) from tools/native.c gendata records.

  python3 train.py --variant 0 --out tafl-v0.nnue data/*.txt

Record line (gendata): variant side ply score result src board f0..f15
  side 0 attackers / 1 defenders to move, score = search value (defenders' view, raw evaluate() units, ±30000 = proven),
  result 1 attackers won / 2 defenders won / 0 draw, src 0 hand-made evaluation / 1 net, board N*N chars (. a d k),
  f = the hand-made features (engine.c handFeat).

Model (defenders' view, logit of the defenders' expected score):
  acc = b1 + W1 · onehot(attacker / defender / king planes)     (H units)
  out = w2[side] · clamp(acc, 0, 1)^2 + u[side] · f + b2[side]
Target: lam · sigmoid(a·score + b) + (1 - lam) · result, where a, b are fitted per src on the game results (the search value of
the hand-made evaluation carries a large constant offset, so it is calibrated rather than divided by a fixed scale).
Training uses the 8 symmetries of the square board (the hand-made features do not change under them).
"""
import argparse, math, os, struct, sys, time
import numpy as np
import torch
import torch.nn.functional as F

NF = 16
CLIP = 1.98   # |W1|, |b1| <= CLIP: int16 accumulator (×127) cannot overflow with up to 37 pieces


def load(files, variant):
    rows = []
    for fn in files:
        with open(fn) as f:
            for line in f:
                t = line.split()
                if len(t) != 7 + NF or int(t[0]) != variant or t[4] not in ('0', '1', '2'):
                    continue
                rows.append(t)
    if not rows:
        sys.exit('no records for variant %d' % variant)
    n2 = len(rows[0][6])
    N = int(round(math.sqrt(n2)))
    code = {'.': 0, 'a': 1, 'd': 2, 'k': 3}
    B = np.zeros((len(rows), n2), np.uint8)
    side = np.zeros(len(rows), np.int64)
    score = np.zeros(len(rows), np.float32)
    res = np.zeros(len(rows), np.float32)
    src = np.zeros(len(rows), np.int64)
    feat = np.zeros((len(rows), NF), np.float32)
    for i, t in enumerate(rows):
        side[i] = int(t[1]); score[i] = float(t[3]); r = int(t[4]); res[i] = 1.0 if r == 2 else 0.0 if r == 1 else 0.5
        src[i] = int(t[5])
        B[i] = np.frombuffer(t[6].encode(), np.uint8)
        feat[i] = [float(x) for x in t[7:]]
    lut = np.zeros(256, np.uint8)
    for ch, v in code.items():
        lut[ord(ch)] = v
    B = lut[B]
    return N, B, side, score, res, src, feat


def symmetries(N):
    idx = np.arange(N * N).reshape(N, N)
    out = []
    for k in range(4):
        m = np.rot90(idx, k)
        out.append(m.reshape(-1)); out.append(m.T.reshape(-1))
    return [torch.tensor(np.ascontiguousarray(p)) for p in out]


def calibrate(score, res, src):
    """per src: a, b with sigmoid(a·score + b) ≈ result (non-proven values only)"""
    cal = {}
    for s in np.unique(src):
        m = (src == s) & (np.abs(score) < 29000)
        x = torch.tensor(score[m], dtype=torch.float64); y = torch.tensor(res[m], dtype=torch.float64)
        mu, sd = x.mean(), x.std() + 1e-9
        xn = (x - mu) / sd
        p = torch.zeros(2, dtype=torch.float64, requires_grad=True)
        opt = torch.optim.LBFGS([p], max_iter=200)
        def closure():
            opt.zero_grad(); l = F.binary_cross_entropy_with_logits(p[0] * xn + p[1], y); l.backward(); return l
        opt.step(closure)
        a = (p[0] / sd).item(); b = (p[1] - p[0] * mu / sd).item()
        cal[int(s)] = (a, b)
        print('src %d: %d positions, teacher = sigmoid(%.6f * score %+.3f)  (score of an even game %.0f)' % (s, m.sum(), a, b, -b / a))
    return cal


class Net(torch.nn.Module):
    def __init__(self, nin, H):
        super().__init__()
        self.l1 = torch.nn.Linear(nin, H)
        self.w2 = torch.nn.Parameter(torch.randn(2, H) * 0.05)
        self.u = torch.nn.Parameter(torch.zeros(2, NF))
        self.b2 = torch.nn.Parameter(torch.zeros(2))
        with torch.no_grad():
            self.l1.weight.uniform_(-0.1, 0.1); self.l1.bias.uniform_(0.0, 0.3)

    def forward(self, x, side, fz):
        a = torch.clamp(self.l1(x), 0, 1) ** 2
        return (a * self.w2[side]).sum(1) + (fz * self.u[side]).sum(1) + self.b2[side]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('files', nargs='+')
    ap.add_argument('--variant', type=int, default=0, help='0 Copenhagen 11x11, 1 Brandubh 7x7, 2 Tablut 9x9')
    ap.add_argument('--hidden', type=int, default=128, help='hidden units (multiple of 8, at most 256)')
    ap.add_argument('--epochs', type=int, default=30)
    ap.add_argument('--batch', type=int, default=4096)
    ap.add_argument('--lr', type=float, default=2e-3)
    ap.add_argument('--lam', type=float, default=0.5, help='weight of the search value in the target (the rest: the game result)')
    ap.add_argument('--scale', type=float, default=400, help='engine units per logit unit (evaluate() = value × scale)')
    ap.add_argument('--val', type=float, default=0.05, help='validation share (whole games are not separated: positions are shuffled)')
    ap.add_argument('--out', default='tafl.nnue')
    ap.add_argument('--device', default='auto')
    ap.add_argument('--seed', type=int, default=1)
    args = ap.parse_args()
    torch.manual_seed(args.seed); np.random.seed(args.seed)
    dev = args.device
    if dev == 'auto':
        dev = 'cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu'
    print('device', dev)

    t0 = time.time()
    N, B, side, score, res, src, feat = load(args.files, args.variant)
    n = len(B)
    print('%d positions (%dx%d) in %.0f s; results: attackers %.1f%%, defenders %.1f%%, draws %.1f%%' % (
        n, N, N, time.time() - t0, 100 * (res == 0).mean(), 100 * (res == 1).mean(), 100 * (res == 0.5).mean()))
    cal = calibrate(score, res, src)
    teach = np.empty(n, np.float32)
    for s, (a, b) in cal.items():
        m = src == s
        teach[m] = 1 / (1 + np.exp(-np.clip(a * score[m] + b, -30, 30)))
    teach[score >= 29000] = 1.0; teach[score <= -29000] = 0.0
    target = args.lam * teach + (1 - args.lam) * res

    fmu = feat.mean(0); fsd = feat.std(0) + 1e-6
    perm = np.random.permutation(n); nv = max(1, int(n * args.val))
    vi, ti = perm[:nv], perm[nv:]
    T = lambda x: torch.tensor(x).to(dev)
    Bt, St, Ft, Yt = T(B.astype(np.int64)), T(side), T((feat - fmu) / fsd), T(target.astype(np.float32))
    Rt = T(res)
    nin = 3 * N * N
    syms = [p.to(dev) for p in symmetries(N)]
    plane_off = torch.tensor([0, 0, N * N, 2 * N * N], device=dev)   # code 1..3 → plane 0..2

    def inputs(bi, sym):
        b = Bt[bi]
        if sym is not None:
            b = b[:, sym]
        x = torch.zeros(len(bi), nin + 1, device=dev)
        occ = b > 0
        col = torch.where(occ, plane_off[b] + torch.arange(N * N, device=dev).expand_as(b), torch.full_like(b, nin))
        x.scatter_(1, col, 1.0)
        return x[:, :nin]

    net = Net(nin, args.hidden).to(dev)
    opt = torch.optim.Adam(net.parameters(), lr=args.lr)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, args.epochs)
    tiT = torch.tensor(ti, device=dev); viT = torch.tensor(vi, device=dev)

    def evaluate():
        net.eval(); tot = 0.0; acc = 0.0; cnt = 0
        with torch.no_grad():
            for i in range(0, nv, 16384):
                bi = viT[i:i + 16384]
                o = net(inputs(bi, None), St[bi], Ft[bi])
                tot += F.binary_cross_entropy_with_logits(o, Yt[bi], reduction='sum').item()
                r = Rt[bi]; dec = r != 0.5
                acc += ((o[dec] > 0) == (r[dec] > 0.5)).float().sum().item(); cnt += dec.sum().item()
        net.train()
        return tot / nv, acc / max(cnt, 1)

    best = 1e9
    for ep in range(1, args.epochs + 1):
        t1 = time.time(); sh = tiT[torch.randperm(len(tiT), device=dev)]; tl = 0.0
        for i in range(0, len(sh), args.batch):
            bi = sh[i:i + args.batch]
            sym = syms[np.random.randint(8)]
            o = net(inputs(bi, sym), St[bi], Ft[bi])
            loss = F.binary_cross_entropy_with_logits(o, Yt[bi])
            opt.zero_grad(); loss.backward(); opt.step()
            with torch.no_grad():
                net.l1.weight.clamp_(-CLIP, CLIP); net.l1.bias.clamp_(-CLIP, CLIP)
            tl += loss.item() * len(bi)
        sched.step()
        vl, va = evaluate()
        mark = ''
        if vl < best:
            best = vl; export(net, args, N, fmu, fsd); mark = '  saved ' + args.out
        print('epoch %2d  train %.5f  val %.5f  result accuracy %.3f  (%.0f s)%s' % (ep, tl / len(ti), vl, va, time.time() - t1, mark), flush=True)


def export(net, args, N, fmu, fsd):
    """float32 file for engine.c nn_load (the feature normalisation is folded into u and b2)"""
    H = args.hidden
    W1 = net.l1.weight.detach().cpu().numpy().T.astype(np.float32)   # [nin][H]
    b1 = net.l1.bias.detach().cpu().numpy().astype(np.float32)
    w2 = net.w2.detach().cpu().numpy().astype(np.float32)
    u = net.u.detach().cpu().numpy().astype(np.float64)
    b2 = net.b2.detach().cpu().numpy().astype(np.float64)
    uu = (u / fsd).astype(np.float32)
    bb = (b2 - (u * fmu / fsd).sum(1)).astype(np.float32)
    with open(args.out, 'wb') as f:
        f.write(b'TFN1'); f.write(struct.pack('<iiiif', args.variant, N, H, NF, args.scale))
        for a in (W1, b1, w2, uu, bb):
            f.write(np.ascontiguousarray(a, '<f4').tobytes())


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Train the checkers NNUE (v2 net, header 'CKN2') for engine.c from self-play records (tools/native.c gen2).

Record (6 x int32, 24 bytes): black, white, kings, side | ply << 8, search value (side to move, man = 100), result (side to move: 1 / 0 / -1).

Net (must match engine.c, "NNUE (v2 nets)"):
  features  FB piece-count buckets x (own man, own king, opp man, opp king) x 32 squares, from both sides' view
            (side c: own = c's pieces; White's view is the board rotated 180 degrees). Factorized while training:
            the weight of a feature = shared (all buckets) + per-bucket part; the export adds them.
  layers    acc_c = bias + sum of feature weights (H each side) -> x = [clip(acc_mover), clip(acc_other)] (2H)
            -> L1 (clipped ReLU) -> L2 (clipped ReLU) -> 1; L1..output chosen by an output bucket (OB, piece count).
  value     out * scale (scale = the teacher scale K below), side to move's view, man = 100.
Target: lam * sigmoid(v / K) + (1 - lam) * (result + 1) / 2; loss = (sigmoid(out) - target)^2.
K is fitted to the data (search values vs results) unless --scale is given.

usage:
  train.py --out net.nnue [--init prev.nnue.npz] [options] data1.bin [data2.bin ...]
  train.py --check net.nnue data.bin     # quantized forward of the exported file (compare with: native evalpos data.bin)
Pure numpy (uses the BLAS numpy is linked with: Accelerate on macOS). Checkpoints: <out>.npz (float weights, for --init).
"""
import argparse, struct, sys, time
import numpy as np

QA, QB = 127, 256
MAGIC = 0x324E4B43

def bucket(npc, nb):
    return np.clip((24 - npc) * nb // 24, 0, nb - 1)

def popcount32(x):
    x = x.astype(np.uint32)
    x = x - ((x >> 1) & 0x55555555)
    x = (x & 0x33333333) + ((x >> 2) & 0x33333333)
    x = (x + (x >> 4)) & 0x0F0F0F0F
    return ((x * 0x01010101) & 0xFFFFFFFF) >> 24

SH = np.arange(32, dtype=np.uint32)

def bits(x):
    return ((x[:, None] >> SH[None, :]) & 1).astype(np.float32)

def features(b, w, k, c):
    """128 features from side c's view (c: array of 0/1)."""
    own = np.where(c == 1, w, b); opp = np.where(c == 1, b, w)
    O, P, K = bits(own), bits(opp), bits(k)
    flip = c == 1
    O[flip] = O[flip, ::-1]; P[flip] = P[flip, ::-1]; K[flip] = K[flip, ::-1]
    return np.concatenate([O * (1 - K), O * K, P * (1 - K), P * K], axis=1)

def load_records(files, max_pos=0, seed=1):
    raw = np.concatenate([np.fromfile(f, dtype=np.int32).reshape(-1, 6) for f in files])
    if max_pos and len(raw) > max_pos:   # keep the newest files' share in proportion: plain random subset
        raw = raw[np.random.default_rng(seed).choice(len(raw), max_pos, replace=False)]
    return raw

sig = lambda z: 1 / (1 + np.exp(-z))

class Net:
    def __init__(s, fb, h, l1, l2, ob, rng):
        s.fb, s.h, s.l1, s.l2, s.ob = fb, h, l1, l2, ob
        s.P = {
            'Ws': (rng.standard_normal((128, h)) * 0.05).astype(np.float32),
            'Wb': np.zeros((fb, 128, h), np.float32),
            'bf': np.full(h, 0.25, np.float32),
            'W1': (rng.standard_normal((ob, l1, 2 * h)) / np.sqrt(2 * h)).astype(np.float32),
            'b1': np.full((ob, l1), 0.05, np.float32),
            'W2': (rng.standard_normal((ob, l2, l1)) / np.sqrt(l1)).astype(np.float32),
            'b2': np.full((ob, l2), 0.05, np.float32),
            'W3': (rng.standard_normal((ob, l2)) * 0.1).astype(np.float32),
            'b3': np.zeros(ob, np.float32),
        }

    def save(s, fn, scale):
        np.savez(fn, fb=s.fb, h=s.h, l1=s.l1, l2=s.l2, ob=s.ob, scale=scale, **s.P)

    @staticmethod
    def load(fn):
        z = np.load(fn)
        n = Net(int(z['fb']), int(z['h']), int(z['l1']), int(z['l2']), int(z['ob']), np.random.default_rng(0))
        for k in n.P: n.P[k] = z[k].astype(np.float32)
        return n, float(z['scale'])

    def forward(s, Fm, Fo, fbi, obi, need_grad=False):
        P = s.P; B = len(Fm); h = s.h
        am = np.empty((B, h), np.float32); ao = np.empty((B, h), np.float32)
        for b in range(s.fb):
            j = np.nonzero(fbi == b)[0]
            if not len(j): continue
            W = P['Ws'] + P['Wb'][b]
            am[j] = Fm[j] @ W; ao[j] = Fo[j] @ W
        am += P['bf']; ao += P['bf']
        x = np.concatenate([np.clip(am, 0, 1), np.clip(ao, 0, 1)], axis=1)
        o = np.empty(B, np.float32); cache = []
        for b in range(s.ob):
            j = np.nonzero(obi == b)[0]
            if not len(j): continue
            xj = x[j]
            z1 = xj @ P['W1'][b].T + P['b1'][b]; h1 = np.clip(z1, 0, 1)
            z2 = h1 @ P['W2'][b].T + P['b2'][b]; h2 = np.clip(z2, 0, 1)
            o[j] = h2 @ P['W3'][b] + P['b3'][b]
            if need_grad: cache.append((b, j, xj, z1, h1, z2, h2))
        if need_grad: return o, (am, ao, x, cache)
        return o

    def backward(s, Fm, Fo, fbi, g, st):
        """g: dL/do (B,). Returns grads dict."""
        P = s.P; am, ao, x, cache = st; h = s.h
        G = {k: np.zeros_like(v) for k, v in P.items()}
        dx = np.zeros_like(x)
        for b, j, xj, z1, h1, z2, h2 in cache:
            gj = g[j]
            G['W3'][b] += h2.T @ gj; G['b3'][b] += gj.sum()
            d2 = np.outer(gj, P['W3'][b]) * ((z2 > 0) & (z2 < 1))
            G['W2'][b] += d2.T @ h1; G['b2'][b] += d2.sum(0)
            d1 = (d2 @ P['W2'][b]) * ((z1 > 0) & (z1 < 1))
            G['W1'][b] += d1.T @ xj; G['b1'][b] += d1.sum(0)
            dx[j] = d1 @ P['W1'][b]
        dm = dx[:, :h] * ((am > 0) & (am < 1)); do = dx[:, h:] * ((ao > 0) & (ao < 1))
        G['bf'] = dm.sum(0) + do.sum(0)
        for b in range(s.fb):
            j = np.nonzero(fbi == b)[0]
            if not len(j): continue
            gw = Fm[j].T @ dm[j] + Fo[j].T @ do[j]
            G['Wb'][b] = gw; G['Ws'] += gw
        return G

    def clamp(s):
        P = s.P
        # keep the int16 accumulator and the int32 L1 sums safe after quantization
        np.clip(P['Ws'], -1.5, 1.5, out=P['Ws']); np.clip(P['Wb'], -1.5, 1.5, out=P['Wb']); np.clip(P['bf'], -2, 2, out=P['bf'])
        np.clip(P['W1'], -8, 8, out=P['W1'])

    def export(s, fn, scale):
        P = s.P
        FW = np.round((P['Ws'][None] + P['Wb']) * QA).astype(np.int16)        # [fb][128][h]
        FB = np.round(P['bf'] * QA).astype(np.int16)
        with open(fn, 'wb') as f:
            f.write(struct.pack('<IIIIIIf', MAGIC, s.fb, s.h, s.l1, s.l2, s.ob, scale))
            f.write(FW.astype('<i2').tobytes()); f.write(FB.astype('<i2').tobytes())
            for b in range(s.ob):
                f.write(np.round(P['W1'][b] * QB).astype('<i2').tobytes())          # [l1][2h]
                f.write(np.round(P['b1'][b] * QA * QB).astype('<i4').tobytes())
                f.write(P['W2'][b].astype('<f4').tobytes())                          # [l2][l1]
                f.write(P['b2'][b].astype('<f4').tobytes())
                f.write(P['W3'][b].astype('<f4').tobytes())
                f.write(struct.pack('<f', float(P['b3'][b])))

def read_export(fn):
    d = open(fn, 'rb').read()
    magic, fb, h, l1, l2, ob, scale = struct.unpack_from('<IIIIIIf', d, 0); o = 28
    assert magic == MAGIC
    def take(dt, n):
        nonlocal o; a = np.frombuffer(d, dtype=dt, count=n, offset=o); o += a.nbytes; return a
    FW = take('<i2', fb * 128 * h).reshape(fb, 128, h).astype(np.int32); FB = take('<i2', h).astype(np.int32)
    L = []
    for b in range(ob):
        L.append((take('<i2', l1 * 2 * h).reshape(l1, 2 * h).astype(np.int64), take('<i4', l1).astype(np.int64),
                  take('<f4', l2 * l1).reshape(l2, l1), take('<f4', l2), take('<f4', l2), take('<f4', 1)[0]))
    return fb, h, ob, scale, FW, FB, L

def check(fn, data, n=20):
    """Quantized forward exactly as engine.c computes it; compare with `native evalpos data n` (NETFILE=fn)."""
    fb, h, ob, scale, FW, FB, L = read_export(fn)
    r = np.fromfile(data, dtype=np.int32).reshape(-1, 6)[:n]
    b, w, k = r[:, 0].view(np.uint32), r[:, 1].view(np.uint32), r[:, 2].view(np.uint32); side = r[:, 3] & 1
    npc = popcount32(b | w); fbi = bucket(npc, fb); obi = bucket(npc, ob)
    for i in range(len(r)):
        accs = []
        for c in (side[i], 1 - side[i]):
            F = features(b[i:i + 1], w[i:i + 1], k[i:i + 1], np.array([c]))[0]
            accs.append(np.clip(FB + F.astype(np.int32) @ FW[fbi[i]], 0, QA))
        x = np.concatenate(accs).astype(np.int64)
        W1, B1, W2, B2, W3, B3 = L[obi[i]]
        z1 = ((W1 @ x + B1).astype(np.float32) * np.float32(1.0 / (QA * QB))).clip(0, 1)
        out = np.float32(B3)
        for j in range(len(B2)):
            z = np.float32(B2[j])
            for kk in range(len(z1)): z = np.float32(z + W2[j, kk] * z1[kk])
            out = np.float32(out + W3[j] * np.float32(min(max(z, 0), 1)))
        v = float(out * np.float32(scale)); v = int(v + (0.5 if v >= 0 else -0.5))
        print(max(-9000, min(9000, v)), r[i, 4], r[i, 5])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('files', nargs='*')
    ap.add_argument('--out'); ap.add_argument('--init')
    ap.add_argument('--check', nargs=2, metavar=('NET', 'DATA'))
    ap.add_argument('--fb', type=int, default=4); ap.add_argument('--hidden', type=int, default=256)
    ap.add_argument('--l1', type=int, default=32); ap.add_argument('--l2', type=int, default=32); ap.add_argument('--ob', type=int, default=8)
    ap.add_argument('--epochs', type=int, default=10); ap.add_argument('--batch', type=int, default=8192)
    ap.add_argument('--lr', type=float, default=1e-3); ap.add_argument('--lam', type=float, default=0.75)
    ap.add_argument('--scale', type=float, default=0); ap.add_argument('--max-positions', type=int, default=0)
    ap.add_argument('--val', type=float, default=0.02); ap.add_argument('--seed', type=int, default=1)
    a = ap.parse_args()
    if a.check: check(*a.check); return
    if not a.out or not a.files: ap.error('--out and data files are required')

    raw = load_records(a.files, a.max_positions, a.seed)
    b, w, k = raw[:, 0].view(np.uint32).copy(), raw[:, 1].view(np.uint32).copy(), raw[:, 2].view(np.uint32).copy()
    side = (raw[:, 3] & 1).astype(np.int8); val = np.clip(raw[:, 4].astype(np.float32), -3000, 3000); res = raw[:, 5].astype(np.float32)
    del raw
    N = len(b); print('positions', N, ' results (mover) W/D/L', int((res > 0).sum()), int((res == 0).sum()), int((res < 0).sum()), flush=True)

    if a.scale > 0: K = a.scale
    elif a.init and a.init.endswith('.npz'): K = Net.load(a.init)[1]
    else:
        sub = np.random.default_rng(0).choice(N, min(N, 500000), replace=False); best = None
        for Kc in [50, 60, 70, 80, 90, 100, 120, 140, 170, 200, 250, 300, 400]:
            e = float(np.mean((sig(val[sub] / Kc) - (res[sub] + 1) / 2) ** 2))
            if best is None or e < best[0]: best = (e, Kc)
        K = float(best[1])
    print('teacher = %.2f * sigmoid(v / %g) + %.2f * result' % (a.lam, K, 1 - a.lam), flush=True)
    T = (a.lam * sig(val / K) + (1 - a.lam) * (res + 1) / 2).astype(np.float32)
    npc = popcount32(b | w).astype(np.int32)

    rng = np.random.default_rng(a.seed)
    if a.init:
        net, _ = Net.load(a.init)
        if (net.fb, net.h, net.l1, net.l2, net.ob) != (a.fb, a.hidden, a.l1, a.l2, a.ob):
            print('note: --init has a different shape; using its shape', (net.fb, net.h, net.l1, net.l2, net.ob))
    else:
        net = Net(a.fb, a.hidden, a.l1, a.l2, a.ob, rng)
    perm = rng.permutation(N); nv = max(1000, min(200000, int(N * a.val)))
    va, tr = perm[:nv], perm[nv:]

    def batch_inputs(j):
        Fm = features(b[j], w[j], k[j], side[j]); Fo = features(b[j], w[j], k[j], 1 - side[j])
        return Fm, Fo, bucket(npc[j], net.fb), bucket(npc[j], net.ob)

    def val_loss():
        tot = 0.0
        for s0 in range(0, nv, 50000):
            j = va[s0:s0 + 50000]; o = net.forward(*batch_inputs(j)); tot += float(np.sum((sig(o) - T[j]) ** 2))
        return tot / nv

    m = {kk: np.zeros_like(v) for kk, v in net.P.items()}; v2 = {kk: np.zeros_like(v) for kk, v in net.P.items()}
    b1, b2, eps, step = 0.9, 0.999, 1e-8, 0
    best = val_loss(); print('val loss start %.6f' % best, flush=True)
    net.export(a.out, K); net.save(a.out + '.npz', K)
    for ep in range(a.epochs):
        lr = a.lr * (0.3 if ep >= a.epochs * 0.6 else 1) * (0.3 if ep >= a.epochs * 0.85 else 1)
        rng.shuffle(tr); t0 = time.time(); tl = 0.0; nb = 0
        for s0 in range(0, len(tr), a.batch):
            j = np.sort(tr[s0:s0 + a.batch]); Fm, Fo, fbi, obi = batch_inputs(j)
            o, st = net.forward(Fm, Fo, fbi, obi, need_grad=True)
            p = sig(o); g = (2 * (p - T[j]) * p * (1 - p) / len(j)).astype(np.float32)
            tl += float(np.mean((p - T[j]) ** 2)); nb += 1
            G = net.backward(Fm, Fo, fbi, g, st); step += 1
            for kk, gr in G.items():
                m[kk] = b1 * m[kk] + (1 - b1) * gr; v2[kk] = b2 * v2[kk] + (1 - b2) * gr * gr
                net.P[kk] -= (lr * (m[kk] / (1 - b1 ** step)) / (np.sqrt(v2[kk] / (1 - b2 ** step)) + eps)).astype(np.float32)
            net.clamp()
            if nb % 200 == 0: print('\r  epoch %d  %d/%d  train %.6f' % (ep + 1, s0, len(tr), tl / nb), end='', file=sys.stderr, flush=True)
        vl = val_loss()
        print('\repoch %d  train %.6f  val %.6f  (%.0fs)%s' % (ep + 1, tl / nb, vl, time.time() - t0, '  saved' if vl < best else ''), flush=True)
        if vl < best: best = vl; net.export(a.out, K); net.save(a.out + '.npz', K)
    print('done: %s  val %.6f  scale %g' % (a.out, best, K))

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""prune: drop the first-layer units of a NUES net (gtrain --ob 8 --l1 --l2) that almost never fire, to make it smaller and faster.

  python3 prune.py net.bin train.bin out.bin --keep 1280 [--positions 200000]

A unit's use = how often its clipped output is above zero over the sample positions (both sides). The --keep most used
units stay (a multiple of 16); the dropped ones' mean contribution to the linear output is folded into the output biases.
In g2048s (2048 wide) 720 units fire in under 0.1% of the positions. Check the result with match-kp.sh against the original.
"""
import argparse, struct, sys, os, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import gtrain as G
ap = argparse.ArgumentParser(); ap.add_argument('net'); ap.add_argument('data'); ap.add_argument('out'); ap.add_argument('--keep', type=int, required=True); ap.add_argument('--positions', type=int, default=200000)
a = ap.parse_args(); assert a.keep % 16 == 0
d = open(a.net, 'rb').read(); magic, H, IN, kb, N1, N2, MI, OB = struct.unpack('<8i', d[:32]); assert magic == 0x5345554E and MI == H, 'a NUES net with the MLP on every unit'
p = 32 + 84
def rd(n, dt):
    global p; x = np.frombuffer(d, dt, n, p).copy(); p += n * np.dtype(dt).itemsize; return x
W1 = rd(IN * H, '<i2').reshape(IN, H); B1 = rd(H, '<i4'); W2 = rd(OB * 2 * H, '<i2').reshape(OB, 2, H); B2 = rd(OB, '<i4')
M = [(rd(N1 * 2 * MI, '<i2').reshape(N1, 2, MI), rd(N1, '<i4'), rd(N2 * N1, '<i2'), rd(N2, '<i4'), rd(N2, '<i2')) for _ in range(OB)]
assert p == len(d)
W1p = np.vstack([W1, np.zeros((1, H), np.int16)]); dd = G.Data([a.data], 2000, 2); cnt = np.zeros(H); lin = np.zeros((OB, H)); nb = np.zeros(OB); n = 0
while n < a.positions:
    fu, ft, sc, rs, ply, bk = dd.get()
    for s, f in enumerate((fu, ft)):
        x = np.clip(W1p[f.astype(np.int64)].sum(1, dtype=np.int32) + B1, 0, 127).astype(np.float64); cnt += (x > 0).sum(0)
        for k in range(OB): lin[k] += (x[bk == k] ** 2).sum(0) * W2[k, s] / 127
    for k in range(OB): nb[k] += (bk == k).sum()
    n += len(bk)
use = cnt / (2 * n); order = np.argsort(-use, kind='stable'); keep = np.sort(order[:a.keep]); drop = np.setdiff1d(np.arange(H), keep)
print(f'{H} units: {int((use < 0.001).sum())} fire in under 0.1%, {int((use < 0.01).sum())} in under 1%; keeping {a.keep}: the least used kept unit fires in {100 * use[keep].min():.2f}% of the positions, the most used dropped one in {100 * use[drop].max():.2f}%')
B2n = B2.astype(np.float64) + np.array([lin[k, drop].sum() / max(nb[k], 1) for k in range(OB)])
with open(a.out, 'wb') as f:
    f.write(struct.pack('<8i', magic, a.keep, IN, kb, N1, N2, a.keep, OB)); f.write(d[32:32 + 84])
    f.write(np.ascontiguousarray(W1[:, keep]).astype('<i2').tobytes()); f.write(B1[keep].astype('<i4').tobytes())
    f.write(np.ascontiguousarray(W2[:, :, keep]).astype('<i2').tobytes()); f.write(np.rint(B2n).astype('<i4').tobytes())
    for MA, Ma, MB, Md, MC in M:
        f.write(np.ascontiguousarray(MA[:, :, keep]).astype('<i2').tobytes()); f.write(Ma.astype('<i4').tobytes()); f.write(MB.tobytes()); f.write(Md.tobytes()); f.write(MC.tobytes())
print('wrote', a.out, os.path.getsize(a.out), 'bytes')

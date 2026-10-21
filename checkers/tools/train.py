#!/usr/bin/env python3
"""Train the small evaluation net for engine.c from self-play records (tools/native.c gen).

Record (6 x int32): black, white, kings, side | ply << 8, search value (side to move, man = 100), result (side to move: 1 / 0 / -1).
Input: 4 x 32 (own man, own king, opponent man, opponent king), board rotated 180 degrees when White is to move.
Net: 128 -> H (clipped ReLU) -> H2 (clipped ReLU) -> 1. Target: lam * sigmoid(v / K) + (1 - lam) * (result + 1) / 2,
loss = (sigmoid(out) - target)^2; the engine uses eval = out * K.
usage: train.py out.bin data1.bin [data2.bin ...]
"""
import sys, struct, numpy as np

H, H2, LAM, EPOCHS, BATCH = 64, 32, 0.75, 14, 2048
out_path, files = sys.argv[1], sys.argv[2:]
raw = np.concatenate([np.fromfile(f, dtype=np.int32).reshape(-1, 6) for f in files])
print('records', len(raw))
b, w, k = raw[:, 0].view(np.uint32), raw[:, 1].view(np.uint32), raw[:, 2].view(np.uint32)
side, ply, val, res = raw[:, 3] & 1, raw[:, 3] >> 8, raw[:, 4].astype(np.float32), raw[:, 5].astype(np.float32)
# drop duplicates (same position + side)
key = (b.astype(np.uint64) << np.uint64(32) | w.astype(np.uint64)) ^ (k.astype(np.uint64) * np.uint64(0x9E3779B97F4A7C15)) ^ side.astype(np.uint64)
_, idx = np.unique(key, return_index=True)
b, w, k, side, ply, val, res = b[idx], w[idx], k[idx], side[idx], ply[idx], val[idx], res[idx]
print('unique', len(b))

def bits(x):
    return ((x[:, None] >> np.arange(32, dtype=np.uint32)[None, :]) & 1).astype(np.uint8)
B, W, K = bits(b), bits(w), bits(k)
own = np.where(side[:, None] == 1, W[:, ::-1], B)
opp = np.where(side[:, None] == 1, B[:, ::-1], W)
kk = np.where(side[:, None] == 1, K[:, ::-1], K)
X = np.concatenate([own & (1 - kk), own & kk, opp & (1 - kk), opp & kk], axis=1).astype(np.uint8)
del B, W, K, own, opp, kk

# the scale K: how search values map to results
sig = lambda z: 1 / (1 + np.exp(-z))
best = None
for Kc in [60, 80, 100, 120, 150, 200, 250, 300]:
    e = np.mean((sig(np.clip(val, -3000, 3000) / Kc) - (res + 1) / 2) ** 2)
    print('K', Kc, 'result mse', round(float(e), 5))
    if best is None or e < best[0]: best = (e, Kc)
KS = float(best[1]); print('using K =', KS)
T = (LAM * sig(np.clip(val, -3000, 3000) / KS) + (1 - LAM) * (res + 1) / 2).astype(np.float32)

rng = np.random.default_rng(1)
perm = rng.permutation(len(X)); nv = min(50000, len(X) // 20)
va, tr = perm[:nv], perm[nv:]
W1 = (rng.standard_normal((128, H)) * 0.08).astype(np.float32); B1 = np.full(H, 0.1, np.float32)
W2 = (rng.standard_normal((H, H2)) * (1 / np.sqrt(H))).astype(np.float32); B2 = np.full(H2, 0.1, np.float32)
W3 = (rng.standard_normal(H2) * 0.1).astype(np.float32); B3 = np.float32(0.0)
# material prior: start W1 so the net begins near "count the pieces"
P = [W1, B1, W2, B2, W3]
m = [np.zeros_like(p) for p in P] + [0.0]; v2 = [np.zeros_like(p) for p in P] + [0.0]
lr, b1, b2, eps, step = 2e-3, 0.9, 0.999, 1e-8, 0

def forward(x):
    a1 = x @ W1 + B1; h1 = np.clip(a1, 0, 1)
    a2 = h1 @ W2 + B2; h2 = np.clip(a2, 0, 1)
    o = h2 @ W3 + B3
    return a1, h1, a2, h2, o

def loss_on(ix):
    tot = 0.0
    for s in range(0, len(ix), 20000):
        j = ix[s:s + 20000]; *_, o = forward(X[j].astype(np.float32)); tot += float(np.sum((sig(o) - T[j]) ** 2))
    return tot / len(ix)

print('val loss start', loss_on(va))
for ep in range(EPOCHS):
    rng.shuffle(tr)
    if ep == EPOCHS - 4: lr *= 0.3
    if ep == EPOCHS - 2: lr *= 0.3
    for s in range(0, len(tr), BATCH):
        j = tr[s:s + BATCH]; x = X[j].astype(np.float32); t = T[j]
        a1, h1, a2, h2, o = forward(x)
        p = sig(o); g = 2 * (p - t) * p * (1 - p) / len(j)
        gW3 = h2.T @ g; gB3 = g.sum()
        d2 = np.outer(g, W3) * ((a2 > 0) & (a2 < 1))
        gW2 = h1.T @ d2; gB2 = d2.sum(0)
        d1 = (d2 @ W2.T) * ((a1 > 0) & (a1 < 1))
        gW1 = x.T @ d1; gB1 = d1.sum(0)
        grads = [gW1, gB1, gW2, gB2, gW3, gB3]
        step += 1
        for i, gr in enumerate(grads):
            m[i] = b1 * m[i] + (1 - b1) * gr; v2[i] = b2 * v2[i] + (1 - b2) * gr * gr
            upd = lr * (m[i] / (1 - b1 ** step)) / (np.sqrt(v2[i] / (1 - b2 ** step)) + eps)
            if i < 5: P[i] -= upd.astype(np.float32)
            else: B3 = np.float32(B3 - upd)
    print('epoch', ep + 1, 'train', round(loss_on(tr[:100000]), 6), 'val', round(loss_on(va), 6), flush=True)

with open(out_path, 'wb') as f:
    f.write(struct.pack('<IIIf', 0x314E4B43, H, H2, KS))
    f.write(W1.astype('<f4').tobytes())            # [input][H]
    f.write(B1.astype('<f4').tobytes())
    f.write(W2.T.copy().astype('<f4').tobytes())   # engine: W2 + j * H  ->  [H2][H]
    f.write(B2.astype('<f4').tobytes())
    f.write(W3.astype('<f4').tobytes())
    f.write(struct.pack('<f', float(B3)))
print('saved', out_path)

#!/usr/bin/env python3
"""Train the learned evaluation (engine.c netEval) from self-play records (tools/selfplay.c).
python3 tools/train.py out.bin data1.bin [data2.bin ...]
target = 1/2 sigmoid(search value / 300) + 1/2 game result; the board's 4 symmetries are used as extra data."""
import sys, struct, numpy as np

SCALE = 300.0
rec = np.dtype([('own', '<u8'), ('opp', '<u8'), ('v', '<i2'), ('res', 'i1'), ('quiet', 'u1'), ('pad', '<u4')])
data = np.concatenate([np.fromfile(f, dtype=rec) for f in sys.argv[2:]])
print('records', len(data))
bits = np.arange(45, dtype=np.uint64)
def feats(own, opp):
    a = ((own[:, None] >> bits) & np.uint64(1)).astype(np.float32)
    b = ((opp[:, None] >> bits) & np.uint64(1)).astype(np.float32)
    return np.concatenate([a, b], axis=1)
# symmetries: mirror columns, mirror rows, both (they keep the strong points)
idx = np.arange(45); r, c = idx // 9, idx % 9
perms = [idx, r * 9 + (8 - c), (4 - r) * 9 + c, (4 - r) * 9 + (8 - c)]
X0 = feats(data['own'], data['opp'])
Xs = []
for P in perms:
    Q = np.concatenate([P, P + 45])
    Xa = np.zeros_like(X0); Xa[:, Q] = X0   # feature at point i moves to point P[i]
    Xs.append(Xa)
X = np.concatenate(Xs)
v = np.clip(data['v'].astype(np.float32), -3000, 3000)
t = 0.5 / (1 + np.exp(-v / SCALE)) + 0.5 * (data['res'].astype(np.float32) + 1) / 2
T = np.tile(t, 4)[:, None]
n = len(X); rng = np.random.default_rng(1)
perm = rng.permutation(n); X, T = X[perm], T[perm]
nv = n // 20; Xv, Tv, X, T = X[:nv], T[:nv], X[nv:], T[nv:]
H1, H2 = 64, 32
W1 = rng.standard_normal((90, H1)).astype(np.float32) * np.sqrt(2 / 20)
B1 = np.zeros(H1, np.float32); W2 = rng.standard_normal((H1, H2)).astype(np.float32) * np.sqrt(2 / H1)
B2 = np.zeros(H2, np.float32); W3 = rng.standard_normal((H2, 1)).astype(np.float32) * np.sqrt(1 / H2); B3 = np.zeros(1, np.float32)
params = [W1, B1, W2, B2, W3, B3]
m = [np.zeros_like(p) for p in params]; s2 = [np.zeros_like(p) for p in params]
lr, b1, b2, eps, step = 1e-3, 0.9, 0.999, 1e-8, 0
def forward(x):
    h1 = np.maximum(x @ W1 + B1, 0); h2 = np.maximum(h1 @ W2 + B2, 0); o = h2 @ W3 + B3
    return h1, h2, o
def loss(x, tt):
    _, _, o = forward(x); p = 1 / (1 + np.exp(-o)); p = np.clip(p, 1e-6, 1 - 1e-6)
    return float(np.mean(-(tt * np.log(p) + (1 - tt) * np.log(1 - p)) + tt * np.log(np.clip(tt, 1e-6, 1)) + (1 - tt) * np.log(np.clip(1 - tt, 1e-6, 1))))
EPOCHS = int(__import__('os').environ.get('EPOCHS', 12)); BS = 1024
for ep in range(EPOCHS):
    pr = rng.permutation(len(X))
    for i in range(0, len(X), BS):
        bi = pr[i:i + BS]; x = X[bi]; tt = T[bi]
        h1, h2, o = forward(x); p = 1 / (1 + np.exp(-o))
        g = (p - tt) / len(bi)
        gW3 = h2.T @ g; gB3 = g.sum(0)
        gh2 = (g @ W3.T) * (h2 > 0)
        gW2 = h1.T @ gh2; gB2 = gh2.sum(0)
        gh1 = (gh2 @ W2.T) * (h1 > 0)
        gW1 = x.T @ gh1; gB1 = gh1.sum(0)
        step += 1
        for k, (pp, gg) in enumerate(zip(params, [gW1, gB1, gW2, gB2, gW3, gB3])):
            m[k] = b1 * m[k] + (1 - b1) * gg; s2[k] = b2 * s2[k] + (1 - b2) * gg * gg
            pp -= lr * (m[k] / (1 - b1 ** step)) / (np.sqrt(s2[k] / (1 - b2 ** step)) + eps)
    if ep == EPOCHS // 2: lr *= 0.4
    print('epoch', ep, 'train', round(loss(X[:20000], T[:20000]), 5), 'valid', round(loss(Xv, Tv), 5), flush=True)
with open(sys.argv[1], 'wb') as f:
    f.write(b'FNN1'); f.write(struct.pack('<f', SCALE))
    for p in params: f.write(p.astype('<f4').tobytes())
print('saved', sys.argv[1])

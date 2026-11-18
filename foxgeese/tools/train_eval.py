#!/usr/bin/env python3
"""Fox and Geese — trains the learned evaluation (2026-11-18). numpy only, runs on any machine (the Mac for big runs).

python3 foxgeese/tools/train_eval.py <out.json> <data.jsonl> [more.jsonl ...]   (env: EPOCHS, H1, H2, LAMBDA, SCALE)

Data: tools/gen_data.js lines {f, g, s, q, v, r}.
Network (the fox's view, like the king-relative inputs of NNUE — here the fox is the only piece that matters to everything):
  inputs  one row per goose: index = foxPoint * 33 + goosePoint (33 × 33 = 1089 rows, at most 17 active)
          + the side to move (2 rows) + the quiet-move clock (8 buckets of 8 plies: the fox wins at 60)
  layer 1 H1 units (sum of the active rows + bias), clipped ReLU [0, 1]
  layer 2 H2 units, clipped ReLU; output one logit = the fox's chance of winning
Target: LAMBDA × game result + (1 − LAMBDA) × sigmoid(search value / SCALE) (the fox's side; a found win is 1 / 0).
Augmentation: the board's left–right mirror (a symmetry of the rules).
Output JSON: {pts, h1, h2, scale, W1 (1089 × H1), Ws (2 × H1), Wq (8 × H1), b1, W2 (H1 × H2), b2, w3 (H2), b3} — engine.js turns
the logit back into centi-geese (× SCALE)."""
import sys, os, json, numpy as np

H1 = int(os.environ.get('H1', 32)); H2 = int(os.environ.get('H2', 16))
EPOCHS = int(os.environ.get('EPOCHS', 30)); LAM = float(os.environ.get('LAMBDA', .5)); SCALE = float(os.environ.get('SCALE', 300))
out, files = sys.argv[1], sys.argv[2:]

# the 33 points (index r*7+c with r or c in 2..4) and their mirror images
PTS = [r * 7 + c for r in range(7) for c in range(7) if 2 <= r <= 4 or 2 <= c <= 4]
PI = {p: k for k, p in enumerate(PTS)}
MIR = np.array([PI[(p // 7) * 7 + (6 - p % 7)] for p in PTS])

F, G, S, Q, V, R = [], [], [], [], [], []
for fn in files:
    with open(fn) as fh:
        for line in fh:
            try: d = json.loads(line)
            except Exception: continue
            F.append(PI[d['f']]); g = [PI[x] for x in d['g']]; G.append(g + [-1] * (17 - len(g)))
            S.append(d['s']); Q.append(d['q']); V.append(d['v']); R.append(d['r'])
F = np.array(F); G = np.array(G); S = np.array(S); Q = np.array(Q); V = np.array(V, dtype=np.float64); R = np.array(R, dtype=np.float64)
n0 = len(F); print('positions', n0)
# mirror
Gm = np.where(G >= 0, MIR[np.maximum(G, 0)], -1)
F = np.concatenate([F, MIR[F]]); G = np.concatenate([G, Gm]); S = np.concatenate([S, S]); Q = np.concatenate([Q, Q]); V = np.concatenate([V, V]); R = np.concatenate([R, R])
vf = np.where(S == 0, V, -V)                       # the search value from the fox's side
pv = np.where(vf > 20000, 1., np.where(vf < -20000, 0., 1 / (1 + np.exp(-np.clip(vf, -5000, 5000) / SCALE))))
T = LAM * R + (1 - LAM) * pv
QB = np.minimum(7, Q // 8)
IDX = np.where(G >= 0, F[:, None] * 33 + G, 1089)   # 1089 = a zero row (padding)

rng = np.random.default_rng(1)
perm = rng.permutation(len(F)); nv = max(2000, len(F) // 20); va, tr = perm[:nv], perm[nv:]
W1 = rng.normal(0, .1, (1090, H1)); W1[1089] = 0; Ws = np.zeros((2, H1)); Wq = np.zeros((8, H1)); b1 = np.full(H1, .3)
W2 = rng.normal(0, 1 / np.sqrt(H1), (H1, H2)); b2 = np.full(H2, .1); w3 = rng.normal(0, 1 / np.sqrt(H2), H2); b3 = np.zeros(1)
params = [W1, Ws, Wq, b1, W2, b2, w3, b3]; mom = [np.zeros_like(p) for p in params]; vel = [np.zeros_like(p) for p in params]

def forward(ix):
    a1 = W1[IDX[ix]].sum(1) + Ws[S[ix]] + Wq[QB[ix]] + b1
    h1 = np.clip(a1, 0, 1); a2 = h1 @ W2 + b2; h2 = np.clip(a2, 0, 1); z = h2 @ w3 + b3[0]
    return a1, h1, a2, h2, z

def loss(ix):
    z = forward(ix)[4]; p = 1 / (1 + np.exp(-z)); t = T[ix]
    return float(np.mean(-(t * np.log(p + 1e-9) + (1 - t) * np.log(1 - p + 1e-9)))), float(np.mean(np.abs(p - t)))

lr, b1m, b2m, step, BS = 2e-3, .9, .999, 0, 1024
for ep in range(EPOCHS):
    rng.shuffle(tr)
    if ep == int(EPOCHS * .6) or ep == int(EPOCHS * .85): lr *= .3
    for k in range(0, len(tr), BS):
        ix = tr[k:k + BS]; a1, h1, a2, h2, z = forward(ix)
        p = 1 / (1 + np.exp(-z)); dz = (p - T[ix]) / len(ix)
        gw3 = h2.T @ dz; gb3 = np.array([dz.sum()])
        dh2 = np.outer(dz, w3) * ((a2 > 0) & (a2 < 1)); gW2 = h1.T @ dh2; gb2 = dh2.sum(0)
        dh1 = (dh2 @ W2.T) * ((a1 > 0) & (a1 < 1)); gb1 = dh1.sum(0)
        gW1 = np.zeros_like(W1); np.add.at(gW1, IDX[ix].ravel(), np.repeat(dh1, IDX.shape[1], axis=0)); gW1[1089] = 0
        gWs = np.zeros_like(Ws); np.add.at(gWs, S[ix], dh1); gWq = np.zeros_like(Wq); np.add.at(gWq, QB[ix], dh1)
        grads = [gW1, gWs, gWq, gb1, gW2, gb2, gw3, gb3]; step += 1
        for i, (pp, g) in enumerate(zip(params, grads)):
            mom[i] = b1m * mom[i] + (1 - b1m) * g; vel[i] = b2m * vel[i] + (1 - b2m) * g * g
            pp -= lr * (mom[i] / (1 - b1m ** step)) / (np.sqrt(vel[i] / (1 - b2m ** step)) + 1e-8)
    print('epoch', ep + 1, 'train', loss(tr[:20000]), 'valid', loss(va), flush=True)

json.dump({'pts': PTS, 'h1': H1, 'h2': H2, 'scale': SCALE, 'W1': np.round(W1[:1089], 5).tolist(), 'Ws': np.round(Ws, 5).tolist(), 'Wq': np.round(Wq, 5).tolist(),
           'b1': np.round(b1, 5).tolist(), 'W2': np.round(W2, 5).tolist(), 'b2': np.round(b2, 5).tolist(), 'w3': np.round(w3, 5).tolist(), 'b3': float(b3[0]), 'positions': int(n0)}, open(out, 'w'))
print('saved', out)

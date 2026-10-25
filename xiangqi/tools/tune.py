# Texel-style tuning of the linear evaluation (engine.c) on self-play positions (tools/native.c selfplay → *.bin).
#   python3 tools/tune.py out_evalw.h in1.bin [in2.bin ...]
# Each record: int16 n, int16 phase (0..16), float32 result (red's view: 1 / 0 / -1), then n x (int16 feature, int16 value).
# Model: score (points, red's view) = sum_f v_f * (w_mg[f] * ph + w_eg[f] * (16 - ph)) / 16, prediction = sigmoid(K * score).
# Loss: mean squared error to (result + 1) / 2 (+ a small L2 pull towards the starting weights). Optimiser: Adam.
import sys, re, struct, numpy as np

NF = 7 * 50 + 15
def read_w(path):
    txt = open(path).read(); nums = [int(x) for x in re.findall(r'-?\d+', txt.split('{', 1)[1].split('}')[0])]
    assert len(nums) == 2 * NF + 1, len(nums)
    return np.array(nums[:NF], float) / 8, np.array(nums[NF:2 * NF], float) / 8, nums[-1]

def load(paths, maxn):
    rows, feats, vals, ph, res = [], [], [], [], []
    n = 0
    for p in paths:
        b = open(p, 'rb').read(); o = 0
        while o + 8 <= len(b) and n < maxn:
            k, phs, r = struct.unpack_from('<hhf', b, o); o += 8
            if o + 4 * k > len(b): break
            a = np.frombuffer(b, dtype="<i2", count=2 * k, offset=o); o += 4 * k
            feats.append(a[0::2]); vals.append(a[1::2]); rows.append(np.full(k, n, np.int32)); ph.append(phs); res.append(r); n += 1
    return np.concatenate(rows), np.concatenate(feats).astype(np.int32), np.concatenate(vals).astype(np.float32), np.array(ph, np.float32), np.array(res, np.float32)

def main():
    out, ins = sys.argv[1], sys.argv[2:]
    maxn = 3_000_000
    rows, f, v, ph, res = load(ins, maxn)
    N = len(res); print('positions', N, 'entries', len(f), flush=True)
    wm0, we0, tempo = read_w('tools/evalw.h')
    phr = ph[rows] / 16.0
    xm = v * phr; xe = v * (1 - phr)
    y = (res + 1) / 2
    def score(wm, we): return np.bincount(rows, weights=xm * wm[f] + xe * we[f], minlength=N)
    # fit K for the starting weights
    s0 = score(wm0, we0); bestK, bestE = 0, 9
    for K in np.linspace(0.001, 0.02, 40):
        p = 1 / (1 + np.exp(-K * s0)); e = np.mean((p - y) ** 2)
        if e < bestE: bestK, bestE = K, e
    K = bestK; print('K', K, 'start mse', bestE)
    # train / validation split by position
    rng = np.random.default_rng(1); val = rng.random(N) < 0.05
    wm, we = wm0.copy(), we0.copy()
    cnt = np.bincount(f, minlength=NF).astype(float)
    lam = 2e-6
    m1 = np.zeros(2 * NF); m2 = np.zeros(2 * NF); lr = 0.6; b1, b2 = 0.9, 0.999
    tw = (~val).astype(np.float32)
    prev = 9
    for it in range(1, 401):
        s = score(wm, we); p = 1 / (1 + np.exp(-K * s))
        r = (p - y) * p * (1 - p) * K * tw * 2 / tw.sum()
        rr = r[rows]
        gm = np.bincount(f, weights=rr * xm, minlength=NF) + lam * (wm - wm0)
        ge = np.bincount(f, weights=rr * xe, minlength=NF) + lam * (we - we0)
        g = np.concatenate([gm, ge])
        m1 = b1 * m1 + (1 - b1) * g; m2 = b2 * m2 + (1 - b2) * g * g
        step = lr * (m1 / (1 - b1 ** it)) / (np.sqrt(m2 / (1 - b2 ** it)) + 1e-9)
        step[np.concatenate([cnt, cnt]) == 0] = 0
        wm -= step[:NF]; we -= step[NF:]
        if it % 25 == 0:
            e_tr = np.mean(((p - y) ** 2)[~val]); e_va = np.mean(((p - y) ** 2)[val])
            print(it, 'train', round(float(e_tr), 6), 'valid', round(float(e_va), 6), flush=True)
            if prev - e_tr < 2e-6: break
            prev = e_tr
    W = [int(round(x * 8)) for x in wm] + [int(round(x * 8)) for x in we] + [tempo]
    with open(out, 'w') as fo:
        fo.write('// Evaluation weights for engine.c (1/8 point): [middlegame features][endgame features][tempo]\n')
        fo.write('// tuned on %d self-play positions (tools/tune.py, K = %.4f)\n' % (N, K))
        fo.write('static const i32 EVALW[%d] = {\n' % len(W))
        for i in range(0, len(W), 25): fo.write('  ' + ', '.join(str(x) for x in W[i:i + 25]) + ',\n')
        fo.write('};\n')
    # a short report of the piece values (average PST over the points seen)
    for t, nm in enumerate('KAEHRCP'):
        idx = np.arange(t * 50, t * 50 + 50); c = cnt[idx]
        if c.sum(): print(nm, 'mg %.0f eg %.0f' % ((wm[idx] * c).sum() / c.sum(), (we[idx] * c).sum() / c.sum()))
    names = ['MOB_R', 'MOB_N', 'MOB_C', 'HOLLOW', 'SCREEN', 'NOADV_R', 'NOADV_N', 'NOADV_C', 'NOELE_C', 'NOELE_R', 'PAWNPAIR', 'FULLDEF', 'NCROSS', 'KINGOUT', 'ROOKS0']
    for j, nm in enumerate(names): print(nm, round(wm[350 + j], 1), round(we[350 + j], 1))

main()

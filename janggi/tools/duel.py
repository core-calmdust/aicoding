#!/usr/bin/env python3
# Two native builds of the engine against each other (each its own process and table):
#   python3 janggi/tools/duel.py /tmp/jg_new /tmp/jg_old n 20 200 1 [pre]     20k nodes a move, 200 games, seed 1
#   python3 janggi/tools/duel.py /tmp/jg_new /tmp/jg_old t 100 200 1           0.1 s a move
#   python3 janggi/tools/duel.py /tmp/jg_new /tmp/jg_old n 10:20 200 1         10k nodes against 20k
#   python3 janggi/tools/duel.py /tmp/jg@net.bin /tmp/jg n 20 400 1            build@net.bin: that side with the NNUE
# Random setups, `pre` random plies (default 4), every opening is played twice with the colours swapped.
# JOBS=N (environment): N pairs of engines at once (each pair of processes ≈ 1 core; the openings and the result are the
# same as with JOBS=1 up to the order the games finish in). The last line: "N games  +W -L  score  Elo (lo .. hi)  depth a / b".
import subprocess, sys, random, math, os
from multiprocessing import Pool

A, B, kind, N, seed = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[5]), int(sys.argv[6])
X = [int(v) for v in (sys.argv[4].split(':') * 2)[:2]]   # 20 = both, 10:20 = the first build 10, the second 20
pre = int(sys.argv[7]) if len(sys.argv) > 7 else 4
JOBS = max(1, int(os.environ.get('JOBS', '1')))

def start(p): return subprocess.Popen([p.split('@')[0], 'serve'] + p.split('@')[1:], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1)
def ask(e, s):
    e.stdin.write(s + '\n'); e.stdin.flush(); return e.stdout.readline().strip()

# the openings: the same list for every JOBS (pair k = games 2k, 2k+1)
rnd = random.Random(seed)
PAIRS = []
for g in range(0, N, 2):
    PAIRS.append(((rnd.randrange(4), rnd.randrange(4)), [rnd.randrange(1 << 30) for _ in range(pre)]))

E = None
def play(job):
    """one opening, both colours -> (wins, losses, depth sums [a, b], depth counts [a, b])"""
    global E
    if E is None: E = [start(A), start(B)]
    k, ngames = job; su, op = PAIRS[k]
    w = l = 0; dsum = [0, 0]; dn = [0, 0]
    for cho in range(ngames):   # cho: the engine that plays Cho (first)
        for e in E: ask(e, 'new %d %d' % su)
        ply = 0; res = None
        while res is None:
            mover = E[cho if ply % 2 == 0 else 1 - cho]
            if ply < pre: m = ask(mover, 'rnd %d' % op[ply])
            else:
                i = 0 if mover is E[0] else 1
                r = ask(mover, 'go %s %d' % (kind, X[i])).split(); m = r[0]; dsum[i] += int(r[2]); dn[i] += 1
            r0 = ask(E[0], 'mv ' + m); r1 = ask(E[1], 'mv ' + m)
            assert r0 == r1 and r0 != 'bad', (r0, r1, m)
            if r0.startswith('end'): res = int(r0.split()[1])
            ply += 1
        ra = res if cho == 0 else -res
        if ra > 0: w += 1
        else: l += 1
    return w, l, dsum, dn

def report(w, l, ds, dn):
    n = w + l; s = w / n; el = -400 * math.log10(1 / s - 1) if 0 < s < 1 else (float('inf') if s >= 1 else float('-inf'))
    se = math.sqrt(s * (1 - s) / n); lo = min(max(s - 1.96 * se, 1e-6), 1 - 1e-6); hi = min(max(s + 1.96 * se, 1e-6), 1 - 1e-6)
    print('%d games  +%d -%d  %.3f  Elo %+.0f (%+.0f .. %+.0f)  depth %.2f / %.2f' % (n, w, l, s, el, -400 * math.log10(1 / lo - 1), -400 * math.log10(1 / hi - 1), ds[0] / max(dn[0], 1), ds[1] / max(dn[1], 1)), flush=True)

if __name__ == '__main__':
    jobs = [(k, min(2, N - 2 * k)) for k in range(len(PAIRS))]
    w = l = 0; ds = [0, 0]; dn = [0, 0]; last = 0
    it = Pool(JOBS).imap_unordered(play, jobs) if JOBS > 1 else map(play, jobs)
    for (a, b, d, c) in it:
        w += a; l += b; ds[0] += d[0]; ds[1] += d[1]; dn[0] += c[0]; dn[1] += c[1]
        if (w + l) // 20 > last // 20 or w + l == N: last = w + l; report(w, l, ds, dn)

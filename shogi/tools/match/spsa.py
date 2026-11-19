#!/usr/bin/env python3
"""SPSA: tune the search's constants (engine.c set_param) by self-play at a fixed time per move, with the site's net on both sides.

  python3 tools/match/spsa.py tune [--work ~/shogi-spsa] [--ms 100 | --nodes N] [--procs 6] [--iters 600] [--lr 0.5] [--table v4|v5] [--base "k=v,.."]
      each iteration: every parameter is moved up or down by its step at random (theta+ / theta-), <procs> pairs of games
      (the same opening, colours swapped) are played between the two settings, and each parameter moves a little towards
      the side that won. State in <work>/spsa.json after every iteration: stop with Ctrl+C, the same command continues.
  python3 tools/match/spsa.py test [--work ~/shogi-spsa] [--ms 300 | --nodes N] [--procs 6] [--games 80] [--set "2=80,16=120"]
      a match of a setting (default: the tuned values in spsa.json, rounded) against the engine's defaults; Elo with a 95% range.

Switches that are off by default and can be tried with test --set (engine.c set_param):
  24=1 "improving" (less pruning / more reduction by the trend of the static evaluation), 25=1 the table's score as the static
  evaluation, 19=<depth> singular extension from this depth (20: its margin per depth, default 2; 21: 1 = multi-cut),
  10=<margin> razoring, 6=1 countermove ordering, 18=<depth> futility up to this depth (default 2), 26=<depth> late move
  pruning up to this depth (default 3), 13=<depth> the reduction without a table move from this depth.

Both sides are the same engine: one in usimatch (--param), one in kptool over USI (Param<k>); which setting sits in which
program alternates, so a difference between the two programs cancels. Time per move, not nodes: these constants trade
nodes for depth, so only time shows what they are worth. Run nothing else heavy at the same time.
"""
import argparse, json, math, os, random, subprocess, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__)); SHOGI = os.path.dirname(os.path.dirname(HERE))
# name, set_param index, the engine's default (keep in step with engine.c), min, max, step (the size of one trial move)
TABLES = {}
TABLES['v4'] = [
    ('rfpMargin',   2,  112,   40,  200,  10),     # reverse futility: margin per depth
    ('rfpDepth',    1,    8,    3,   10,   1),     # ... up to this depth
    ('futMargin',  16,  123,   40,  250,  12),     # futility of quiet moves: margin per depth
    ('lmpBase',    12,    7,    2,   12,   1),     # late move pruning: moves before it starts
    ('probCut',    23,  162,  100,  400,  20),     # ProbCut margin
    ('aspDelta',   27,   85,   20,  150,   8),     # aspiration window
    ('histLmr',     9, 6749, 2000, 16000, 500),    # history's weight in the reductions (divisor)
    ('lmrDiv',     17,  203,  130,  320,  12),     # reductions: ln(depth) * ln(move number) / (this / 100)
]
# search v5 (set_param 44, the new search function): the one-thread default since 2026-11-19: --table v5 (no --base needed)
TABLES['v5'] = [   # (2026-11-19: the starts are the values of the first tuning = the engine's defaults; wider ranges where it stopped at a limit)
    ('lmpScale',   43,  246,   40, 4000,  40),     # late move pruning: its move count, percent
    ('razor',      58,  346,  100,  900,  40),     # razoring margin per depth
    ('futDepth',   46,    8,    3,   16,   1),     # futility of quiet moves: below this reduced depth
    ('fut0',       47,  131,   10,  400,  20),     # ... margin
    ('fut1',       48,   43,    0,  300,  10),     # ... per reduced depth
    ('nullBase',   52,    6,    2,   12,   1),     # null move reduction
    ('iirDepth',   53,    2,    1,    9,   1),     # no table move: a ply less from this depth
    ('rfpMargin',   2,   73,   20,  220,   8),
    ('rfpDepth',    1,   11,    3,   24,   1),
    ('histLmr',     9, 5049, 1500, 16000, 500),
    ('lmrDiv',     17,  214,  130,  320,  12),
    ('bonus',      42,  297,   60,  800,  30),     # history bonus per depth
    ('aspDelta',   27,   57,   10,  150,   6),
]
PARAMS = TABLES['v4']

THREADS = 1
def build(work):
    os.makedirs(work, exist_ok=True)
    mt = ['-DMT', '-DSEARCH2_MT', '-lpthread'] if THREADS > 1 else []     # (--threads: the MT build, with search v5 in it)
    site = os.path.join(work, 'site.bin')
    subprocess.run(f'gzip -dc "{SHOGI}/nnue.bin.gz" > "{site}"', shell=True, check=True)
    h = int.from_bytes(open(site, 'rb').read(8)[4:8], 'little')
    um, kp = os.path.join(work, 'usimatch'), os.path.join(work, 'kptool')
    subprocess.run(['cc', '-O3', '-DNATIVE', f'-DNUE_H={h}', '-w', '-o', um, os.path.join(HERE, 'usimatch.c')] + mt, check=True)
    subprocess.run(['cc', '-O3', '-DNATIVE', '-DNUE_KB=1', f'-DNUE_H={h}', '-w', '-o', kp, os.path.join(SHOGI, 'tools', 'nnue', 'kptool.c')] + mt, check=True)
    return site, um, kp

def play(work, site, um, kp, ms, setA, setB, games, opening_lines, tag):
    """usimatch plays setA, kptool plays setB; returns a Popen and the file with the openings"""
    f = tempfile.NamedTemporaryFile('w', suffix=f'-{tag}.txt', delete=False); f.write(''.join(opening_lines)); f.close()
    cmd = [um, site, f'{ms}ms', kp, work, str(games), '--openings', f.name, '--opt', f'TimeMs={ms}'] if ms > 0 else [um, site, str(-ms), kp, work, str(games), '--openings', f.name, '--opt', f'Nodes={-ms}']
    if THREADS > 1: cmd += ['--threads', str(THREADS), '--opt', f'Threads={THREADS}']
    for k, v in setA.items(): cmd += ['--param', f'{k}={v}']
    for k, v in setB.items(): cmd += ['--opt', f'Param{k}={v}']
    env = dict(os.environ, KPNET=site)
    return subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, env=env), f.name

def result(p, fname):
    out = p.communicate()[0]; os.unlink(fname)
    w = l = d = 0
    for line in out.splitlines():
        if 'total' in line:
            try:
                t = line[line.index('total'):].split(); w, l, d = int(t[1][1:]), int(t[2][1:]), int(t[3][1:])
            except Exception: pass
    return w, l, d       # from usimatch's side (setA)

def elo(w, l, d):
    n = w + l + d
    if not n: return 'no games finished'
    s = (w + d / 2) / n; v = (w * (1 - s) ** 2 + l * s ** 2 + d * (0.5 - s) ** 2) / n; e = 1.96 * math.sqrt(v / n)
    f = lambda x: -400 * math.log10(1 / min(max(x, 0.001), 0.999) - 1)
    return f'+{w} -{l} ={d}  score {s:.3f}  Elo {f(s):+.0f} ({f(s - e):+.0f} .. {f(s + e):+.0f})'

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('mode', choices=['tune', 'test'])
    ap.add_argument('--work', default=os.path.expanduser('~/shogi-spsa')); ap.add_argument('--ms', type=int, default=0)
    ap.add_argument('--procs', type=int, default=6); ap.add_argument('--iters', type=int, default=600)
    ap.add_argument('--lr', type=float, default=0.5); ap.add_argument('--games', type=int, default=80); ap.add_argument('--set', default='')
    ap.add_argument('--seed', type=int, default=1)
    ap.add_argument('--threads', type=int, default=1, help='both sides search on this many threads (the MT build: its defaults are search v4, so give search v5 in full with --set)')
    ap.add_argument('--table', default='v4', choices=sorted(TABLES)); ap.add_argument('--base', default='', help='parameters fixed on both sides in tune, and added to the candidate in test ("44=1,45=1")')
    ap.add_argument('--nodes', type=int, default=0, help='test: nodes per move instead of time (what the node-limited levels see)')
    a = ap.parse_args()
    global PARAMS, THREADS; PARAMS = TABLES[a.table]; THREADS = a.threads
    base = {int(x.split('=')[0]): int(x.split('=')[1]) for x in a.base.split(',') if x}
    site, um, kp = build(a.work)
    ops = [x for x in open(os.path.join(HERE, 'openings.txt')) if len(x) > 3]
    state_f = os.path.join(a.work, 'spsa.json')
    defaults = {k: d for _, k, d, _, _, _ in PARAMS}

    if a.mode == 'test':
        ms = -a.nodes if a.nodes else (a.ms or 300)
        if a.set: cand = {int(x.split('=')[0]): int(x.split('=')[1]) for x in a.set.split(',')}
        else:
            st = json.load(open(state_f)); cand = {k: int(round(st['theta'][n])) for n, k, _, _, _, _ in PARAMS}
        cand = {**base, **cand}
        print('candidate:', ', '.join(f'{k}={v}' for k, v in sorted(cand.items())) or '(the defaults)', f' vs the defaults, {ms} ms, {a.games * a.procs} games' if ms > 0 else f' vs the defaults, {-ms} nodes, {a.games * a.procs} games', flush=True)
        ps = []
        for i in range(a.procs):
            r = (i * a.games // 2) % len(ops); lines = ops[r:] + ops[:r]
            A, B = (cand, {}) if i % 2 == 0 else ({}, cand)          # the candidate sits in usimatch in half the processes
            # (the other side: the engine's own defaults, nothing sent)
            # nodes per move: each process a little more (+131 each). The search is deterministic, and the 100 openings give
            # only 100 different pairs of games: without this, processes with the same openings would play the same games.
            ps.append((play(a.work, site, um, kp, ms - 131 * i if ms < 0 else ms, A, B, a.games, lines, f't{i}'), i % 2 == 0))
        W = L = D = 0
        for (p, fn), candInUm in ps:
            w, l, d = result(p, fn)
            if candInUm: W += w; L += l
            else: W += l; L += w
            D += d
        print('candidate vs defaults:', elo(W, L, D)); return

    ms = -a.nodes if a.nodes else (a.ms or 100)
    if os.path.exists(state_f): st = json.load(open(state_f)); print(f'resume at iteration {st["it"]}', flush=True)
    else: st = {'it': 0, 'theta': {n: float(d) for n, _, d, _, _, _ in PARAMS}, 'games': 0}
    rng = random.Random(a.seed + st['it'])
    t0 = time.time()
    try:
        while st['it'] < a.iters:
            it = st['it']; lr = a.lr / (1 + it / (a.iters / 4)) ** 0.602
            sign = {n: rng.choice((-1, 1)) for n, *_ in PARAMS}
            plus, minus = {}, {}
            for n, k, _, lo, hi, c in PARAMS:
                plus[k] = int(round(min(hi, max(lo, st['theta'][n] + c * sign[n])))); minus[k] = int(round(min(hi, max(lo, st['theta'][n] - c * sign[n]))))
            plus = {**base, **plus}; minus = {**base, **minus}
            ps = []
            for i in range(a.procs):
                line = [rng.choice(ops)]
                if i % 2 == 0: ps.append((play(a.work, site, um, kp, ms, plus, minus, 2, line, f's{i}'), 1))
                else: ps.append((play(a.work, site, um, kp, ms, minus, plus, 2, line, f's{i}'), -1))
            net = n_g = 0
            for (p, fn), sg in ps:
                w, l, d = result(p, fn); net += sg * (w - l); n_g += w + l + d
            if n_g:
                g = net / n_g                                   # > 0: theta+ did better
                for n, k, _, lo, hi, c in PARAMS:
                    st['theta'][n] = min(hi, max(lo, st['theta'][n] + lr * c * sign[n] * g * a.procs / 6))
            st['it'] = it + 1; st['games'] += n_g
            json.dump(st, open(state_f + '.tmp', 'w')); os.replace(state_f + '.tmp', state_f)
            el = time.time() - t0
            print(f'{st["it"]}/{a.iters}  games {st["games"]}  (+ {net:+d})  ' + '  '.join(f'{n} {st["theta"][n]:.1f}' for n, *_ in PARAMS), flush=True)
    except KeyboardInterrupt:
        print('\nstopped (the same command continues)')
    print('now: ' + ','.join([f'{k}={v}' for k, v in base.items()] + [f'{k}={int(round(st["theta"][n]))}' for n, k, *_ in PARAMS]))

if __name__ == '__main__':
    main()

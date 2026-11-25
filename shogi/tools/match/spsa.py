#!/usr/bin/env python3
"""SPSA: tune the search's constants (engine.c set_param) by self-play at a fixed time per move, with the site's net on both sides.

  python3 tools/match/spsa.py tune [--work ~/shogi-spsa] [--ms 100 | --nodes N] [--procs 6] [--iters 600] [--lr 0.5] [--table v4|v5] [--base "k=v,.."]
      each iteration: every parameter is moved up or down by its step at random (theta+ / theta-), <procs> pairs of games
      (the same opening, colours swapped) are played between the two settings, and each parameter moves a little towards
      the side that won. State in <work>/spsa.json after every iteration: stop with Ctrl+C, the same command continues.
  python3 tools/match/spsa.py test [--work ~/shogi-spsa] [--ms 300 | --nodes N] [--procs 6] [--games 80] [--set "2=80,16=120"]
      a match of a setting (default: the tuned values in spsa.json, rounded) against the engine's defaults; Elo with a 95% range.

  python3 tools/match/spsa.py tune --yo ~/shogi-yo-ours/yo-ours --table sing|v6 [--base "85=1,91=1,92=2,55=1"] [--nodes 80000 --yo-nodes 40000] --procs 10
      (2026-11-20) tune AGAINST YaneuraOu's search with our evaluation instead of self-play: theta+ and theta- each play it from
      the same opening, and the parameters move towards the one that scored more. Self-play tuning gave +200 Elo against
      ourselves and almost nothing against other programs; this measures what counts. test --yo: the tuned values' score.

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
# against YaneuraOu's search (--yo): the singular extension; search v6 (reductions v2 + pruning v2: give the switches with --base)
TABLES['sing'] = [
    ('sgDepth',    75,    5,    3,   10,   1),     # singular extension: from this depth
    ('sgMargin',   76,   90,   20,  220,  12),     # ... the margin below the table move's value, per depth (64ths)
    ('sgDouble',   77,   80,   10,  260,  15),     # ... a second ply when the others fail by this much
    ('sgNeg',      79,    2,    0,    4,   1),     # ... not singular: the table move this much shallower
]
# the site's search (v5 + the singular extension) against YaneuraOu's search: its numbers all together
TABLES['v5yo'] = TABLES['sing'][:1] + [
    ('sgMargin',   76,   90,   20,  220,  12),
    ('sgDouble',   77,   40,   10,  260,  12),
    ('sgNeg',      79,    2,    0,    4,   1),
    ('lmpScale',   43,  246,   60,  800,  25),
    ('futDepth',   46,    8,    2,   14,   1),
    ('fut0',       47,  131,   20,  400,  15),
    ('fut1',       48,   43,    0,  300,  10),
    ('nullBase',   52,    6,    2,   12,   1),
    ('rfpMargin',   2,   73,   30,  250,  10),
    ('rfpDepth',    1,   11,    3,   24,   1),
    ('razor',      58,  346,  100,  900,  40),
    ('histLmr',     9, 5049, 1500, 16000, 500),
    ('lmrDiv',     17,  214,  130,  320,  12),
    ('cutR',       54,    1,    0,    4,   1),     # (the default is 0: starts from 1)
    ('bonus',      42,  297,   80,  700,  30),
    ('malusPct',  106,  100,   40,  400,  25),     # the tried quiet moves' malus, percent of the bonus
    ('mainPct',   119,  100,   40,  400,  25),     # the main history's share of the bonus
    ('contPct',   120,  100,   20,  250,  15),     # the continuation histories' share
]
V6_BASE = '85=1,91=1,92=2,55=1,44=1,45=1,62=1'
TABLES['v6'] = TABLES['sing'] + [
    ('notImp',     86,   40,    0,  100,   8),     # reductions: percent more when the static evaluation is not improving
    ('rBase',      88,   90,    0,  260,  15),     # ... the constant (100ths of a ply)
    ('rTtPv',      87,  200,    0,  420,  25),     # ... less on a line that was a PV
    ('rCut',       89,  300,   50,  620,  30),     # ... more at an expected cut node
    ('rFirst',     93,  520,  300,  900,  30),     # ... a first move is read shallower above this reduction
    ('deeper',     95,   50,    0,  160,  10),     # the re-search: a ply deeper when the reduced search beat the best by this
    ('shallower',  96,    8,    0,   60,   5),     # ... a ply shallower when it beat it by less than this
    ('lmrBonus',   97,  600,    0, 1600, 100),     # ... the continuation histories' bonus for a re-searched move
    ('contPrune',  98, 2500,  500, 8000, 300),     # pruning: continuation history below minus this x depth
    ('capFut0',    99,  230,   50,  520,  25),     # ... a capture that cannot reach alpha: margin
    ('capFut1',   100,  250,   80,  520,  25),     # ... per reduced depth
    ('seeCap',    101,  180,   60,  420,  20),     # ... captures and checks losing more than this x depth
    ('fut0',      102,  160,   40,  420,  20),     # ... quiet moves that cannot reach alpha: margin
    ('fut1',      103,  120,   40,  320,  12),     # ... per reduced depth
    ('futAbove',  104,   90,    0,  260,  15),     # ... more when the static evaluation is above alpha
    ('seeQuiet',  105,   23,    8,   60,   3),     # ... quiet moves losing more than this x reduced depth squared
    ('histPrune',  81, 2000,  600, 8000, 250),     # ... the history's weight in the depth a move is judged at (divisor)
    ('histLmr',     9, 5049, 1500, 16000, 500),
    ('lmpScale',   43,  300,   80,  700,  20),     # (2026-11-25: from 300, not YaneuraOu's 100: at 100 pruning v2 lost 4-23-1 to the default search, at 300 it won 19-6-3)
    ('lmrDiv',     17,  214,  130,  320,  12),
]
# search v6 with the pruning before the move loop, the table cut-off and the quiescence search in YaneuraOu's manner too, so
# that the tuning can trade pruning before the loop against pruning in it (2026-11-25): --table v6all --base V6ALL_BASE
V6ALL_BASE = '85=1,91=1,92=2,55=1,110=1,113=1,115=2'
TABLES['v6all'] = TABLES['v6'] + [
    ('rfpMargin',   2,   91,   40,  220,  10),     # static cut: margin per depth (YaneuraOu's region; the site's own default is 73 up to depth 11)
    ('rfpDepth',    1,   18,    6,   24,   1),
    ('nullEval',  112,  390,  100,  700,  30),     # null move at expected cut nodes: the static evaluation this far above beta - 13 * depth
    ('razorAll',  114,  342,  150,  700,  30),     # razoring at expected all-nodes: this much below alpha per depth
    ('qsFut',     116,  350,  100,  700,  30),     # quiescence: a capture that cannot reach alpha with this margin is skipped
]

PARAMS = TABLES['v4']

THREADS = 1; THREADS_VS = 0      # (--threads-vs: the threads of the defaults' side in test, when not the same)
def build(work):
    os.makedirs(work, exist_ok=True)
    mt = ['-DMT', '-DSEARCH2_MT', '-lpthread'] if max(THREADS, THREADS_VS) > 1 else []     # (--threads: the MT build, with search v5 in it)
    site = os.path.join(work, 'site.bin')
    subprocess.run(f'gzip -dc "{SHOGI}/nnue.bin.gz" > "{site}"', shell=True, check=True)
    h = int.from_bytes(open(site, 'rb').read(8)[4:8], 'little')
    um, kp = os.path.join(work, 'usimatch'), os.path.join(work, 'kptool')
    subprocess.run(['cc', '-O3', '-DNATIVE', f'-DNUE_H={h}', '-w', '-o', um, os.path.join(HERE, 'usimatch.c')] + mt, check=True)
    subprocess.run(['cc', '-O3', '-DNATIVE', '-DNUE_KB=1', f'-DNUE_H={h}', '-w', '-o', kp, os.path.join(SHOGI, 'tools', 'nnue', 'kptool.c')] + mt, check=True)
    return site, um, kp

def play(work, site, um, kp, ms, setA, setB, games, opening_lines, tag, thA=0, thB=0):
    """usimatch plays setA, kptool plays setB; returns a Popen and the file with the openings"""
    f = tempfile.NamedTemporaryFile('w', suffix=f'-{tag}.txt', delete=False); f.write(''.join(opening_lines)); f.close()
    cmd = [um, site, f'{ms}ms', kp, work, str(games), '--openings', f.name, '--opt', f'TimeMs={ms}'] if ms > 0 else [um, site, str(-ms), kp, work, str(games), '--openings', f.name, '--opt', f'Nodes={-ms}']
    thA = thA or THREADS; thB = thB or THREADS
    if max(THREADS, THREADS_VS) > 1: cmd += ['--threads', str(thA), '--opt', f'Threads={thB}']
    for k, v in setA.items(): cmd += ['--param', f'{k}={v}']
    for k, v in setB.items(): cmd += ['--opt', f'Param{k}={v}']
    env = dict(os.environ, KPNET=site)
    return subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, env=env), f.name

def play_yo(work, site, um, yo, nodes, yo_nodes, setA, games, opening_lines, tag):
    """usimatch plays setA at <nodes> a move against YaneuraOu's search with our evaluation at <yo_nodes>"""
    f = tempfile.NamedTemporaryFile('w', suffix=f'-{tag}.txt', delete=False); f.write(''.join(opening_lines)); f.close()
    cmd = [um, site, str(nodes), yo, os.path.dirname(yo), str(games), '--openings', f.name, '--byoyomi', '60000']
    for o in ('BookFile=no_book', 'USI_Hash=64', 'Threads=1', f'NodesLimit={yo_nodes}', 'NetworkDelay=0', 'NetworkDelay2=0'): cmd += ['--opt', o]
    for k, v in setA.items(): cmd += ['--param', f'{k}={v}']
    return subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, env=dict(os.environ, OURNET=site, OURSCALE='100')), f.name

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
    ap.add_argument('--threads', type=int, default=1, help='both sides search on this many threads (the MT build; since 2026-11-19 its defaults are search v5 with Lazy SMP helpers — search v4 with YBW: 44=0 and its numbers)')
    ap.add_argument('--threads-vs', type=int, default=0, help='test: the threads of the other side (default: --threads). With --vs: what the threads give to one search')
    ap.add_argument('--vs', default='', help='test: the parameters of the other side (default: nothing sent, the engine defaults)')
    ap.add_argument('--table', default='v4', choices=sorted(TABLES)); ap.add_argument('--base', default='', help='parameters fixed on both sides in tune, and added to the candidate in test ("44=1,45=1")')
    ap.add_argument('--nodes', type=int, default=0, help='test: nodes per move instead of time (what the node-limited levels see)')
    ap.add_argument('--yo', default='', help="tune / test AGAINST YaneuraOu's search with our evaluation (the binary of tools/match/yo-ours.sh, e.g. ~/shogi-yo-ours/yo-ours): theta+ and theta- each play it, ours at --nodes (default 80000), it at --yo-nodes (40000). What self-play cannot see.")
    ap.add_argument('--yo-nodes', type=int, default=40000)
    a = ap.parse_args()
    global PARAMS, THREADS, THREADS_VS; PARAMS = TABLES[a.table]; THREADS = a.threads; THREADS_VS = a.threads_vs
    base = {int(x.split('=')[0]): int(x.split('=')[1]) for x in a.base.split(',') if x}
    site, um, kp = build(a.work)
    ops = [x for x in open(os.path.join(HERE, 'openings.txt')) if len(x) > 3]
    state_f = os.path.join(a.work, 'spsa.json')
    defaults = {k: d for _, k, d, _, _, _ in PARAMS}

    yo = os.path.expanduser(a.yo)
    if yo and a.mode == 'test':
        nodes = a.nodes or 80000
        if a.set: cand = {int(x.split('=')[0]): int(x.split('=')[1]) for x in a.set.split(',')}
        else: st = json.load(open(state_f)); cand = {k: int(round(st['theta'][n])) for n, k, _, _, _, _ in PARAMS}
        cand = {**base, **cand}; W = L = D = 0; ps = []
        print('candidate:', ','.join(f'{k}={v}' for k, v in cand.items()), f" vs YaneuraOu's search: {nodes} nodes against {a.yo_nodes}, {a.games * a.procs} games", flush=True)
        for i in range(a.procs):
            r = (i * a.games // 2) % len(ops); ps.append(play_yo(a.work, site, um, yo, nodes, a.yo_nodes, cand, a.games, ops[r:] + ops[:r], f'y{i}'))
        for p, fn in ps: w, l, d = result(p, fn); W += w; L += l; D += d
        print("candidate vs YaneuraOu's search:", elo(W, L, D)); return
    if a.mode == 'test':
        ms = -a.nodes if a.nodes else (a.ms or 300)
        if a.set: cand = {int(x.split('=')[0]): int(x.split('=')[1]) for x in a.set.split(',')}
        else:
            st = json.load(open(state_f)); cand = {k: int(round(st['theta'][n])) for n, k, _, _, _, _ in PARAMS}
        cand = {**base, **cand}; vs = {int(x.split('=')[0]): int(x.split('=')[1]) for x in a.vs.split(',') if x}; tc, tv = a.threads, a.threads_vs or a.threads
        if vs or tv != tc: print(f'the other side: {a.vs or "the defaults"}, {tv} thread(s); the candidate: {tc} thread(s)', flush=True)
        print('candidate:', ', '.join(f'{k}={v}' for k, v in sorted(cand.items())) or '(the defaults)', f' vs the defaults, {ms} ms, {a.games * a.procs} games' if ms > 0 else f' vs the defaults, {-ms} nodes, {a.games * a.procs} games', flush=True)
        ps = []
        for i in range(a.procs):
            r = (i * a.games // 2) % len(ops); lines = ops[r:] + ops[:r]
            A, B = (cand, vs) if i % 2 == 0 else (vs, cand)          # the candidate sits in usimatch in half the processes
            # (the other side: the engine's own defaults, nothing sent)
            # nodes per move: each process a little more (+131 each). The search is deterministic, and the 100 openings give
            # only 100 different pairs of games: without this, processes with the same openings would play the same games.
            ps.append((play(a.work, site, um, kp, ms - 131 * i if ms < 0 else ms, A, B, a.games, lines, f't{i}', *((tc, tv) if i % 2 == 0 else (tv, tc))), i % 2 == 0))
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
    rng = random.Random(a.seed + st['it']); last_line = None
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
                if yo:      # both settings against YaneuraOu's search, the same opening (2 games each): half the processes each
                    line = line if i % 2 == 0 else last_line; last_line = line
                    ps.append((play_yo(a.work, site, um, yo, a.nodes or 80000, a.yo_nodes, plus if i % 2 == 0 else minus, 2, line, f's{i}'), 1 if i % 2 == 0 else -1))
                elif i % 2 == 0: ps.append((play(a.work, site, um, kp, ms, plus, minus, 2, line, f's{i}'), 1))
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

#!/usr/bin/env python3
"""blunders: where in the game are the moves lost? Every position of recorded games (KIFU=<file> of usimatch) is searched by a
reference engine with many more nodes than either side played with, and each move's loss (in win rate, by the reference's
values before and after it) is added up per side and per part of the game.

  python3 blunders.py score kifu.txt cache.json --engine ~/shogi-yo-ours/yo-ours --nodes 150000 [--part 0/2] [--seconds 540]
  python3 blunders.py report kifu.txt cache.json [cache2.json ...]

"score" can be stopped and run again (the cache keeps what is done; --part i/n takes every n-th game, to run n side by side).
"""
import argparse, json, math, os, re, subprocess, sys, time

def games(path):
    out = []
    for l in open(path):
        t = l.split()
        if len(t) > 3: out.append((int(t[0]), int(t[1]), int(t[2]), t[3:]))
    return out

def score(a):
    gs = games(a.kifu); cache = json.load(open(a.cache)) if os.path.exists(a.cache) else {}
    i0, n0 = (int(x) for x in a.part.split('/'))
    eng = subprocess.Popen([os.path.expanduser(a.engine)], cwd=os.path.dirname(os.path.expanduser(a.engine)), stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, bufsize=1, env=dict(os.environ, **dict(x.split('=', 1) for x in a.env)))
    def send(s): eng.stdin.write(s + '\n'); eng.stdin.flush()
    def until(tok):
        last = None
        while True:
            l = eng.stdout.readline()
            if not l: sys.exit('the engine stopped')
            if l.startswith(tok): return last, l
            if ' score ' in l and ' pv ' in l or ' score ' in l: last = l
    send('usi'); until('usiok')
    for o in ['Threads=1', 'USI_Hash=256', 'BookFile=no_book', 'NetworkDelay=0', 'NetworkDelay2=0'] + a.opt:
        n, _, v = o.partition('='); send(f'setoption name {n} value {v}')
    send('isready'); until('readyok')
    rs = re.compile(r' score (cp|mate) ([+-]?\d+|[+-])'); t0 = time.time()
    for gi, (wb, res, nh0, mv) in enumerate(gs):
        if gi % n0 != i0: continue
        send('usinewgame')
        for p in range(nh0, len(mv) + 1):
            k = f'{gi}:{p}'
            if k in cache: continue
            if time.time() - t0 > a.seconds: json.dump(cache, open(a.cache, 'w')); print('time is up:', len(cache), 'positions so far'); return
            send('position startpos moves ' + ' '.join(mv[:p])); send(f'go nodes {a.nodes}'); last, bm = until('bestmove')
            m = rs.search(last) if last else None
            sc = None if not m else (30000 if not m.group(2).startswith('-') else -30000) if m.group(1) == 'mate' else int(m.group(2))
            if sc is None: sc = -30000 if 'resign' in bm else 30000 if 'win' in bm else 0
            cache[k] = [sc, bm.split()[1] if len(bm.split()) > 1 else '']
    json.dump(cache, open(a.cache, 'w')); print('done:', len(cache), 'positions')

def report(a):
    gs = games(a.kifu); cache = {}
    for c in a.cache: cache.update(json.load(open(c)))
    wp = lambda s: 1 / (1 + math.exp(-max(-3000, min(3000, s)) / 600))
    bins = [(0, 40), (40, 70), (70, 100), (100, 400)]; tot = {}; bl = []
    for gi, (wb, res, nh0, mv) in enumerate(gs):
        for p in range(nh0, len(mv)):
            if f'{gi}:{p}' not in cache or f'{gi}:{p + 1}' not in cache: continue
            s0, best = cache[f'{gi}:{p}']; s1 = cache[f'{gi}:{p + 1}'][0]
            loss = max(0.0, wp(s0) - (1 - wp(s1)))   # the mover's win rate before, minus after (the next position is the opponent's)
            ours = ((p % 2 == 0) == bool(wb)); b = next(i for i, (lo, hi) in enumerate(bins) if lo <= p < hi)
            for key in ((ours, b), (ours, 'all')):
                t = tot.setdefault(key, [0, 0.0, 0, 0]); t[0] += 1; t[1] += loss; t[2] += loss > 0.10; t[3] += (loss > 0.10 and abs(wp(s0) - 0.5) < 0.3)
            if ours and loss > 0.10: bl.append((loss, gi, p, mv[p], best, s0, -s1, '*' in mv[p], '+' in mv[p]))
    print('per move: mean loss of win rate (%), moves that lose more than 10% (per 100 moves), of those in a still balanced position')
    for side in (True, False):
        print('  ours' if side else '  the opponent')
        for b in list(range(len(bins))) + ['all']:
            t = tot.get((side, b))
            if t: print('    plies %-9s %5d moves  mean loss %5.2f%%  big losses %5.1f / 100  (balanced: %4.1f / 100)' % ('all' if b == 'all' else '%d-%d' % bins[b], t[0], 100 * t[1] / t[0], 100 * t[2] / t[0], 100 * t[3] / t[0]))
    w = sum(1 for g in gs if g[1] > 0); print(f'games {len(gs)}: ours won {w}')
    if a.list:
        bl.sort(reverse=True)
        for x in bl[:a.list]: print('  game %d ply %d: played %s (reference %s), value %d -> %d, loss %.0f%%%s' % (x[1], x[2], x[3], x[4], x[5], x[6], 100 * x[0], ' drop' if x[7] else ''))
        json.dump([dict(game=x[1], ply=x[2], played=x[3], ref=x[4], before=x[5], after=x[6], moves=' '.join(gs[x[1]][3][:x[2]])) for x in bl], open(a.cache[0] + '.blunders.json', 'w'))

ap = argparse.ArgumentParser(); ap.add_argument('cmd'); ap.add_argument('kifu'); ap.add_argument('cache', nargs='+')
ap.add_argument('--engine', default='~/shogi-yo-ours/yo-ours'); ap.add_argument('--nodes', type=int, default=150000); ap.add_argument('--opt', action='append', default=[]); ap.add_argument('--env', action='append', default=[])
ap.add_argument('--part', default='0/1'); ap.add_argument('--seconds', type=float, default=1e9); ap.add_argument('--list', type=int, default=0)
a = ap.parse_args()
if a.cmd == 'score': a.cache = a.cache[0]; score(a)
else: report(a)

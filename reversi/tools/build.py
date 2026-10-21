# Build reversi/puzzles.json v3: keep the 170 original puzzles (ids p1..p6, order unchanged) and add 830 new ones
# grouped in categories (level / theme / unique). Every new puzzle comes from exact analysis (feat.js) of self-play positions.
import json, math, sys, collections, glob, os
sys.path.insert(0, os.path.dirname(__file__))
from themes import T
OUT = sys.argv[1]
SRC = '/home/claude/work/ckpt/rv1000/orig_puzzles.json'
CK = '/home/claude/work/ckpt/rv1000'
old = json.load(open(SRC))
assert len(old['levels']) == 6
texts = json.load(open(os.path.join(os.path.dirname(__file__), 'texts.json')))
old170 = json.load(open(CK + '/old170.json'))
used = {o['key'] for o in old170}

def Dof(F, g):
    return round(-5.87 + 1.89 * F['e'] + 9.16 * math.log(F['nm']) + 0.5 * F['shRank'] / max(1, F['nm'] - 1) + 0.38 * F['passes']
                 + 1.86 * (g['type'] == 'margin') + 3.6 * F['nLose'] / F['nm'] + 1.25 * (F['fsol'] == F['minF']) + 0.25 * F['oppMob'], 1)

cands = []
seen = set()
for f in sorted(glob.glob(CK + '/harv*.jsonl')):
    for l in open(f):
        if not l.strip(): continue
        r = json.loads(l)
        if r['key'] in seen or r['key'] in used: continue
        seen.add(r['key'])
        r['D'] = Dof(r['F'], r['goal']); r['T'] = T(r['F'], r['goal'])
        cands.append(r)
print('candidates', len(cands), file=sys.stderr)

PLAN = [  # (id, cat, n, filter)
    ('p7', 'level', 30, lambda r: r['F']['e'] in (15, 16)),
    ('p8', 'level', 20, lambda r: r['F']['e'] in (17, 18)),
] + [(k, 'theme', 50, None) for k in ['t-parity', 't-parityx', 't-pass', 't-greedy', 't-corner', 't-xc', 't-quiet', 't-edge', 't-block', 't-draw', 't-margin']] \
  + [('u-surprise', 'unique', 50, None), ('u-only', 'unique', 50, None), ('u-comeback', 'unique', 50, None),
     ('u-wipe', 'unique', 30, None), ('u-sym', 'unique', 20, None), ('u-close', 'unique', 30, None)]

def pool(pid, flt):
    if flt: return [r for r in cands if r['key'] not in used and flt(r)]
    tag = texts[pid]['tag']
    lo, hi = (3, 16) if tag in ('wipe', 'sym', 'draw') else (4, 14)
    return [r for r in cands if r['key'] not in used and tag in r['T'] and lo <= r['F']['e'] <= hi]

def spread(P, n):   # n puzzles spread evenly over the difficulty range; near each target prefer a plain "win" goal (more natural than "win by N")
    P = sorted(P, key=lambda r: (r['D'], r['key']))
    if len(P) <= n: return P
    out, taken = [], set()
    w = max(1, len(P) // (2 * n))
    for i in range(n):
        j = round(i * (len(P) - 1) / (n - 1))
        best, bs = None, 1e9
        for k in range(max(0, j - w), min(len(P), j + w + 1)):
            if k in taken: continue
            sc = abs(k - j) + (0 if P[k]['goal']['type'] in ('win', 'wipe', 'draw') else w * 0.8)
            if sc < bs: best, bs = k, sc
        if best is None:
            best = min((k for k in range(len(P)) if k not in taken), key=lambda k: abs(k - j))
        taken.add(best); out.append(P[best])
    return out

order = sorted(PLAN, key=lambda p: (p[1] == 'level' and 0 or 1, len(pool(p[0], p[3])) / p[2]))
chosen = {}
for pid, cat, n, flt in order:
    P = pool(pid, flt)
    sel = spread(P, n)
    for r in sel: used.add(r['key'])
    chosen[pid] = sorted(sel, key=lambda r: (r['D'], r['key']))
    print(f'{pid:12} pool {len(P):5} -> {len(sel)}', file=sys.stderr)

def puzzle(r, pid):
    tags = list(r['T'])
    own = texts.get(pid, {}).get('tag')
    if own and own in tags: tags.remove(own); tags.insert(0, own)
    tags = [t for t in tags if t != 'margin' or own == 'margin'][:4]   # 'margin' alone says little: only on its own theme
    p = {'cells': r['cells'], 'toMove': r['toMove'], 'goal': r['goal'], 'e': r['F']['e'], 'tags': tags, 'D': r['D']}
    return p

levels = []
for L in old['levels']:
    L2 = dict(L); L2['cat'] = 'unique' if L['id'] == 'p6' else 'level'; L2['icon'] = 'gem' if L['id'] == 'p6' else 'lv'
    levels.append(L2)
for pid, cat, n, flt in PLAN:
    tx = texts[pid]
    levels.append({'id': pid, 'cat': cat, 'icon': tx['icon'], 'name': tx['name'], 'desc': tx['desc'], 'puzzles': [puzzle(r, pid) for r in chosen[pid]]})
total = sum(len(L['puzzles']) for L in levels)
print('total', total, file=sys.stderr)
json.dump({'version': 3, 'levels': levels}, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
# stats for the model card / report
st = collections.OrderedDict()
for L in levels:
    ps = L['puzzles']
    st[L['id']] = dict(cat=L['cat'], n=len(ps), e=(min(p['e'] for p in ps), max(p['e'] for p in ps)) if ps else None,
                       D=(round(sum(p['D'] for p in ps) / max(1, len(ps)), 1)), goals=dict(collections.Counter(p['goal']['type'] for p in ps)))
json.dump(st, open(OUT + '.stats.json', 'w'), ensure_ascii=False, indent=1)

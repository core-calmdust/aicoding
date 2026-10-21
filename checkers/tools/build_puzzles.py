#!/usr/bin/env python3
"""Build checkers/puzzles.json from pzgen candidates (JSON lines).
usage: build_puzzles.py out.json pos1.jsonl [pos2.jsonl ...] -- eg1.jsonl [eg2.jsonl ...]
Themes (50 each, easy → hard): win1..win5 (endgame positions), shot2 / shot3 / shot22 (material), ekings / emen (endgames).
A puzzle keeps only positions where the answer is also the engine's (near-)best move and the side is not losing overall."""
import json, sys, random
args = sys.argv[1:]; out = args[0]; k = args.index('--')
pos = [json.loads(l) for f in args[1:k] for l in open(f) if l.strip()]
eg = [json.loads(l) for f in args[k + 1:] for l in open(f) if l.strip()]
random.seed(7)
def key(x): return x['b'] + str(x['side'])
def ok_val(x):   # the answer is (near) the engine's best and does not lose overall
    return x.get('va', 0) >= x.get('vb', 0) - 25 and x.get('va', 0) > -150
def diff(x):     # rough difficulty: length, number of choices, a quiet first move (sacrifice), pieces on the board
    return x['n'] * 10 + min(x['moves'], 12) * 0.6 + (0 if x['cap1'] else 2) + x['pieces'] * 0.15 + random.random() * 0.5
used = set()
def pick(cands, n=50):
    res = []
    for x in sorted(cands, key=lambda x: random.random()):
        if key(x) in used or not ok_val(x): continue
        used.add(key(x)); res.append(x)
        if len(res) >= n: break
    return sorted(res, key=diff)
kingsOnly = lambda x: not any(c in x['b'] for c in 'bw')
hasMen = lambda x: any(c in x['b'] for c in 'bw')
themes = []
def theme(tid, grp, cands, g=0):
    L = pick(cands)
    themes.append({'id': tid, 'grp': grp, 'goal': 'gain' if g else 'win', 'g': g, 'puzzles': [{'s': {'b': x['b'], 'side': x['side']}, 'n': x['n'], 'answer': x['f'] + 32 * x['t'] + 1024 * x['cap'], **({'g': x['g']} if x['g'] else {})} for x in L]})
    print(tid, len(L), file=sys.stderr)
# endgame themes first take their kind, then the win-in-N themes use the rest
theme('win1', 'Win', [x for x in eg if x['n'] == 1 and x['moves'] >= 3])
theme('win2', 'Win', [x for x in eg if x['n'] == 2])
theme('win3', 'Win', [x for x in eg if x['n'] == 3])
theme('win4', 'Win', [x for x in eg if x['n'] == 4])
theme('win5', 'Win', [x for x in eg if x['n'] == 5])
theme('shot2', 'Shot', [x for x in pos if x['g'] == 1 and x['n'] == 2], 1)
theme('shot3', 'Shot', [x for x in pos if x['g'] == 1 and x['n'] == 3], 1)
theme('shot22', 'Shot', [x for x in pos if x['g'] == 2], 2)
theme('ekings', 'End', [x for x in eg if kingsOnly(x) and x['n'] >= 2 and x['pieces'] >= 4])
theme('emen', 'End', [x for x in eg if hasMen(x) and x['n'] >= 3])
json.dump({'version': 1, 'daily': ['win2', 'shot2', 'win3', 'shot3', 'ekings', 'shot22', 'emen'], 'themes': themes}, open(out, 'w'), separators=(',', ':'))
print('total', sum(len(t['puzzles']) for t in themes), file=sys.stderr)

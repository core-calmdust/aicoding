#!/usr/bin/env python3
"""Assemble puzzles.json from tools/gen_duel.js output (JSON lines).
Themes = side to move × N (w2 … b5); up to PER puzzles each, unique first move preferred, then fewer pieces to look at.
python3 tools/build_duel.py out1.jsonl [out2.jsonl …] > puzzles.json"""
import json, sys
PER = 24
ORDER = [('x2', 'Step'), ('w3', 'Step'), ('b3', 'Step'), ('w4', 'Tac'), ('b4', 'Tac'), ('w5', 'End'), ('b5', 'End')]
seen, by = set(), {k: [] for k, _ in ORDER}
for f in sys.argv[1:]:
    for line in open(f):
        line = line.strip()
        if not line: continue
        x = json.loads(line); k = x['s']['b'] + str(x['s']['side'])
        if k in seen: continue
        seen.add(k)
        tid = 'x2' if x['n'] == 2 else ('w' if x['s']['side'] == 1 else 'b') + str(x['n'])   # 2 moves: one theme, both sides (few distinct ideas)
        if tid in by: by[tid].append(x)
SQ = lambda i: 'abcdefgh'[i % 64 % 8] + str(8 - (i % 64) // 8)
def sig(x):
    """the idea of a puzzle: the solution move (from-to) and which corner squares are still empty"""
    b, side = x['s']['b'], x['s']['side']
    T = [i for i in range(64) if (i // 8 >= 5 and i % 8 <= 2)] if side == 2 else [i for i in range(64) if (i // 8 <= 2 and i % 8 >= 5)]
    me = 'w' if side == 1 else 'b'
    holes = ''.join(SQ(i) for i in T if b[i] != me)
    return SQ(x['a'] % 64) + SQ(x['a'] // 64), holes
themes = []
for tid, grp in ORDER:
    pool = sorted(by[tid], key=lambda x: (x.get('alt', 1), x['legal']))
    L, mv_n, seen_sig = [], {}, set()
    for x in pool:       # variety: one puzzle per (move, empty squares), at most 2 with the same solution move
        mv, holes = sig(x); mv = mv + str(x['s']['side'])
        if (mv, holes) in seen_sig or mv_n.get(mv, 0) >= 2: continue
        seen_sig.add((mv, holes)); mv_n[mv] = mv_n.get(mv, 0) + 1; L.append(x)
        if len(L) >= PER: break
    L.sort(key=lambda x: (x.get('alt', 1) > 1, x['legal']))
    # never two puzzles with the same solution move one after the other
    out = []
    while L:
        k = next((i for i, x in enumerate(L) if not out or (sig(x)[0], x['s']['side']) != (sig(out[-1])[0], out[-1]['s']['side'])), 0)
        out.append(L.pop(k))
    themes.append({'id': tid, 'grp': grp, 'puzzles': [{'s': x['s'], 'n': x['n'], 'a': x['a']} for x in out]})
    print(tid, len(out), len(by[tid]), file=sys.stderr)
print(json.dumps({'version': 2, 'rule': 'c33', 'kind': 'duel', 'daily': [t for t, _ in ORDER], 'themes': themes}, separators=(',', ':')))

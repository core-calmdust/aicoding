#!/usr/bin/env python3
"""Assemble puzzles.json from tools/gen_duel.js output (JSON lines).
Themes = side to move × N (w2 … b5); up to PER puzzles each, unique first move preferred, then fewer pieces to look at.
python3 tools/build_duel.py out1.jsonl [out2.jsonl …] > puzzles.json"""
import json, sys
PER = 24
ORDER = [('w2', 'Step'), ('b2', 'Step'), ('w3', 'Step'), ('b3', 'Step'), ('w4', 'Tac'), ('b4', 'Tac'), ('w5', 'End'), ('b5', 'End')]
seen, by = set(), {k: [] for k, _ in ORDER}
for f in sys.argv[1:]:
    for line in open(f):
        line = line.strip()
        if not line: continue
        x = json.loads(line); k = x['s']['b'] + str(x['s']['side'])
        if k in seen: continue
        seen.add(k)
        tid = ('w' if x['s']['side'] == 1 else 'b') + str(x['n'])
        if tid in by: by[tid].append(x)
themes = []
for tid, grp in ORDER:
    L = sorted(by[tid], key=lambda x: (x.get('alt', 1), x['legal']))[:PER]
    L.sort(key=lambda x: (x.get('alt', 1) > 1, x['legal']))   # easier-looking (fewer moves to consider) first
    themes.append({'id': tid, 'grp': grp, 'puzzles': [{'s': x['s'], 'n': x['n'], 'a': x['a']} for x in L]})
    print(tid, len(L), file=sys.stderr)
print(json.dumps({'version': 2, 'rule': 'c33', 'kind': 'duel', 'daily': [t for t, _ in ORDER], 'themes': themes}, separators=(',', ':')))

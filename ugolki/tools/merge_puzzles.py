# Merge the JSON lines of several gen_puzzles.js runs (JSONL=1, stderr) into puzzles.json:
# dedupe by position, up to 20 per theme (more first-move choices first, fewer = harder last).
import json, sys
THEMES = [('n2','Step'),('n3','Step'),('n4','Step'),('n5','Tac'),('n6','Tac'),('n7','Tac'),('n8','End'),('n9','End'),('n10','End'),('n11','End')]
seen, by = set(), {t: [] for t, _ in THEMES}
for f in sys.argv[2:]:
    for line in open(f):
        if not line.startswith('JSON '): continue
        d = json.loads(line[5:])
        if d['s']['b'] in seen: continue
        seen.add(d['s']['b']); by[d['t']].append(d)
themes = []
for t, g in THEMES:
    L = sorted(by[t], key=lambda d: (-d['k'], d['n']))[:20]
    if not L: continue
    themes.append({'id': t, 'grp': g, 'puzzles': [{'s': d['s'], 'n': d['n'], 'answer': d['answer']} for d in L]})
out = {'version': 1, 'rule': 'c33', 'daily': [t['id'] for t in themes], 'themes': themes}
json.dump(out, open(sys.argv[1], 'w'), separators=(',', ':'))
print([(t['id'], len(t['puzzles'])) for t in themes], sum(len(t['puzzles']) for t in themes))

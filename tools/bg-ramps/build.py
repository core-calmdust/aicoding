import json, sys
sys.path.insert(0, '.')
from data import R, STEPS, UI
def enc(pos):
    a = [0]*52
    for s, key in ((0, 'me'), (1, 'op')):
        d = pos[key]; tot = sum(d.values()); assert tot <= 15, (key, tot, d)
        for p, n in d.items(): a[s*26+p] = n
        a[s*26+0] = 15 - tot
    for p in range(1,25): assert not (a[p] and a[26+25-p]), ('clash', p, pos)
    return ''.join('%x' % v for v in a)
out = {'ui': UI, 'steps': {}}
for st in STEPS:
    items = []
    for it in R.get(st, []):
        o = dict(it); o['pos'] = enc(it['pos']); items.append(o)
    out['steps'][st] = items
import os
TR = json.load(open('tr-texts.json')) if os.path.exists('tr-texts.json') else {}
for st, items in out['steps'].items():
    for i, it in enumerate(items):
        for f in ('t','b','g','h','y'):
            if f in it and (st+'/'+str(i)+'/'+f) in TR: it[f].update(TR[st+'/'+str(i)+'/'+f])
for k in out['ui']:
    if 'ui/'+k in TR: out['ui'][k].update(TR['ui/'+k])
json.dump(out, open('../../backgammon/ramps.json', 'w'), ensure_ascii=False)
print(sum(len(v) for v in out['steps'].values()), 'items')

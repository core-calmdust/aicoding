# janggi/database.rules.json = xiangqi/database.rules.json + the same rules under "janggi" (root.child('x') → root.child('janggi').child('x')).
# Publish the output in the xiangqi-multiplay project (Janggi shares it; see janggi/firebase-config.js).
import json, re, os
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.join(here, '..', '..')
x = json.load(open(os.path.join(root, 'xiangqi/database.rules.json')))
sub = json.loads(re.sub(r"root\.child\('", "root.child('janggi').child('", json.dumps(x['rules'])))
assert 'janggi' not in x['rules']
out = {'rules': dict(x['rules'], janggi=sub)}
json.dump(out, open(os.path.join(root, 'janggi/database.rules.json'), 'w'), ensure_ascii=False, indent=2)
print('ok', len(json.dumps(out)))

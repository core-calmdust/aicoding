# python3 tools/reversi-warm3d/build.py → reversi/warm3d.json (the 3D warm-ups' texts; translations from tr.json)
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from texts import T
D = os.path.dirname(__file__); TR = json.load(open(os.path.join(D, 'tr.json'))) if os.path.exists(os.path.join(D, 'tr.json')) else {}
out = {k: dict(v, **TR.get(k, {})) for k, v in T.items()}
json.dump(out, open(os.path.join(D, '..', '..', 'reversi', 'warm3d.json'), 'w'), ensure_ascii=False)
print(len(out), 'texts')

# 照合用（作業環境のみ）：shanten-gen.js の JSONL の向聴数を PyMahjongGB で出す
import sys, json
from MahjongGB import MahjongShanten as S
def nm(t):
    if t < 27: return 'WBT'[t//9] + str(t%9+1)
    if t <= 30: return 'F' + str(t-26)
    return {31:'J3',32:'J2',33:'J1'}[t]
for line in open(sys.argv[1]):
    o = json.loads(line)
    packs = tuple(('CHI', nm(m['t']+1), 1) if m['k']=='chi' else ('PENG', nm(m['t']), 1) for m in o['melds'])
    print(S(pack=packs, hand=tuple(nm(t) for t in o['hand'])))

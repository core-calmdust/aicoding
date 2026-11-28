# 照合用（作業環境のみ。pip install PyMahjongGB、MIT）：fan-gen.js の JSONL を PyMahjongGB で計算して JSONL で出す。サイトには載せない
import sys, json
from MahjongGB import MahjongFanCalculator as F
def nm(t):
    if t < 27: return 'WBT'[t//9] + str(t%9+1)
    if t <= 30: return 'F' + str(t-26)
    return {31:'J3',32:'J2',33:'J1'}[t]
for line in open(sys.argv[1]):
    o = json.loads(line)
    packs = []
    for m in o['melds']:
        if m['k']=='chi': packs.append(('CHI', nm(m['t']+1), 1))
        elif m['k']=='pon': packs.append(('PENG', nm(m['t']), 1))
        elif m['k']=='kan': packs.append(('GANG', nm(m['t']), 1))
        else: packs.append(('GANG', nm(m['t']), 0))
    try:
        r = F(pack=tuple(packs), hand=tuple(nm(t) for t in o['hand']), winTile=nm(o['win']), flowerCount=o['flowers'],
              isSelfDrawn=o['tsumo'], is4thTile=o['last'], isAboutKong=o['kong'], isWallLast=o['wallLast'],
              seatWind=o['seat'], prevalentWind=o['round'], verbose=True)
        print(json.dumps([[p, c, n] for p, c, n, e in r], ensure_ascii=False))
    except Exception as e:
        print(json.dumps({'err': str(e)}))

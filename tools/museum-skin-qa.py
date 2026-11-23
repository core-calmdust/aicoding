# 博物館の文字の読みやすさ（全スキン）: museum-skin-qa.js の結果を測る。usage: python3 tools/museum-skin-qa.py [dir]
import json, glob, re, sys
D = sys.argv[1] if len(sys.argv) > 1 else '/tmp/museum-skin-qa'
from PIL import Image
def lin(c):
    c = c / 255; return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
def L(rgb): return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2])
def cr(a, b):
    la, lb = L(a), L(b); return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)
def parse(c):
    v = [float(x) for x in re.findall(r'[\d.]+', c)]
    return v[:3], (v[3] if len(v) > 3 else 1)
bad = {}; n = 0
for f in sorted(glob.glob(D + '/res-*.json')):
    for rec in json.load(open(f)):
        im = Image.open(rec['file']).convert('RGB'); W, H = im.size
        for it in rec['items']:
            x0, y0 = max(0, int(it['x'])), max(0, int(it['y'])); x1, y1 = min(W, int(it['x'] + it['w'])), min(H, int(it['y'] + it['h']))
            if x1 - x0 < 2 or y1 - y0 < 2: continue
            n += 1
            px = list(im.crop((x0, y0, x1, y1)).resize((min(24, x1 - x0), min(12, y1 - y0))).getdata())
            col, a = parse(it['c'])
            rs = sorted(cr([col[k] * a + bg[k] * (1 - a) for k in range(3)], bg) for bg in px)
            r = rs[len(rs) // 5]   # the 20th percentile: busy backgrounds (stars, tiles) count by their worse part
            big = it['fs'] >= 18.5 or (it['fs'] >= 14 and it['fw'] >= 700)
            if r < (3.0 if big else 4.0):
                bad.setdefault((rec['st'], it['cls'], it['t']), []).append((rec['sk'], round(r, 2)))
for k, v in sorted(bad.items(), key=lambda kv: -len(kv[1])):
    print(len(v), k, sorted(v, key=lambda x: x[1])[:4])
print('checked', n, 'issues', len(bad))

# Redraws the inscriptions of the unpromoted 2D 水無瀬 / 錦旗 / 菱湖 pieces (shogi/pieces/<set>/{0,1}{FU,KY,KE,GI,KA,HI,KI,GY,OU}.svg) from
# shogi/pieces/<set>/traced.png — the inscriptions traced from a photo of a real 盛り上げ set by
# atlas/tools/shogi-glyphs-photo.py (2026-11-12). The piece itself (face, band, maker's mark) stays LuffyKudo's drawing; its
# black ink path is replaced by the traced outline, placed on the top face (the face minus the band) where the photo has it on the
# piece, widened across by the photo piece's width/height over the drawn face's so the characters keep their shape.
# Needs rsvg-convert. python3 atlas/tools/shogi-traced-svg.py [minase|kinki|ryoko]
import io, os, re, subprocess, sys, numpy as np, cv2
from scipy.ndimage import binary_fill_holes
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'); SET = sys.argv[1] if len(sys.argv) > 1 else 'minase'; DIR = os.path.join(ROOT, 'shogi', 'pieces', SET)
TR = ['FU', 'KY', 'KE', 'GI', 'KA', 'HI', 'KI', 'GY', 'OU']
ASP = {'minase': {'GY': 1.0, 'OU': 1.0, 'KA': .953, 'HI': .961, 'KI': .954, 'GI': .934, 'KE': .922, 'KY': .844, 'FU': .835},   # (printed by the photo tool)
       'ryoko': {'KA': .902, 'HI': .914, 'KI': .902, 'GI': .890, 'KE': .863, 'KY': .815, 'FU': .830, 'GY': .882, 'OU': .898},
       'kinki': {'GY': .919, 'OU': .935, 'KA': .921, 'HI': .922, 'KI': .923, 'GI': .906, 'KE': .883, 'KY': .834, 'FU': .842}}[SET]
S = 1200
PATH = re.compile(r'<path\b[^>]*?/>', re.S)
def render(svg):
    png = subprocess.run(['rsvg-convert', '-w', str(S)], input=svg.encode(), capture_output=True, check=True).stdout
    return cv2.imdecode(np.frombuffer(png, np.uint8), cv2.IMREAD_UNCHANGED)[:, :, 3]
def keep(svg, col):
    return PATH.sub(lambda m: m.group(0) if ('#' + col) in m.group(0) else '', svg)
def alone(svg, tag):
    return PATH.sub(lambda m: m.group(0) if m.group(0) == tag else '', svg)
sheet = cv2.imread(os.path.join(DIR, 'traced.png'), cv2.IMREAD_GRAYSCALE)
for code in TR:
    g = sheet[:, TR.index(code) * 512: TR.index(code) * 512 + 512]; g = cv2.resize(g, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
    g = cv2.GaussianBlur(g, (0, 0), 6); H, W = g.shape
    cs, _ = cv2.findContours((g > 127).astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    cs = [cv2.approxPolyDP(c, .9, True).reshape(-1, 2) for c in cs if cv2.contourArea(c) > 40]
    for side in '01':
        f = os.path.join(DIR, side + code + '.svg'); svg = open(f).read()
        vb = [float(v) for v in re.search(r'viewBox="([^"]*)"', svg).group(1).split()]
        top = binary_fill_holes(render(keep(svg, 'f5e5c6')) > 128)
        if svg.index('#908768') > svg.index('#f5e5c6'): top &= ~(render(keep(svg, '908768')) > 40)   # (the 180° pieces draw the band under the face)
        ys, xs = np.nonzero(top); k = vb[2] / S
        fx0, fx1, fy0, fy1 = vb[0] + xs.min() * k, vb[0] + (xs.max() + 1) * k, vb[1] + ys.min() * k, vb[1] + (ys.max() + 1) * k
        r = ASP[code] / ((fx1 - fx0) / (fy1 - fy0)); d = []
        for c in cs:
            u = .5 + (c[:, 0] / W - .5) * r; v = c[:, 1] / H
            if side == '1': u, v = 1 - u, 1 - v
            x, y = fx0 + u * (fx1 - fx0), fy0 + v * (fy1 - fy0)
            d.append('M' + ' '.join(f'{a:.2f},{b:.2f}' for a, b in zip(x, y)) + 'Z')
        new = f'<path id="traced" style="fill:#000000;fill-rule:evenodd" d="{"".join(d)}" />'
        svg = re.sub(r'<path id="(minase-)?traced"[^>]*?/>', '', svg)
        n = [0]
        def drop(m):   # the ink: a path that is neither the face nor the band and lies on the top face (the maker's mark is in the band)
            t = m.group(0)
            if '#f5e5c6' in t or '#908768' in t: return t
            a = render(alone(svg0, t)) > 128
            if a.any() and (a & top).sum() > .5 * a.sum(): n[0] += 1; return ''
            return t
        svg0 = svg
        svg = PATH.sub(drop, svg)
        i = svg.rindex('</svg>'); svg = svg[:i] + new + svg[i:]
        open(f, 'w').write(svg); print(side + code, n[0], len(svg), round(r, 3))

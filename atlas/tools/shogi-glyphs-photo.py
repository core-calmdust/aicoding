# Writes the 水無瀬 inscriptions of the unpromoted pieces into images/atlas/shogi-glyphs-<set>.png, traced from a photo of a real
# 水無瀬書 盛り上げ set (2026-11-12; the user's reference photo, not kept in the repo): python3 atlas/tools/shogi-glyphs-photo.py <photo> [minase|kinki]
# The photo shows the 40 pieces face up on dark cloth in 8 rows: 玉將 王將 / 歩 角 角 飛 飛 歩 / 歩 金×4 歩 / 歩 銀×4 歩 / 歩 桂×4 歩 /
# 歩 香×4 歩 / 歩×6 / 歩×6.
#  - pieces: the wood is found by its colour (Lab b), rows by connected regions, the pieces of a row by the valleys between them
#  - ink: dark (L, sharp) or the lacquer's grey highlights (the core of the low-chroma region; JPEG chroma is half resolution)
#  - every copy of a piece (4 金, 18 歩 …) is put in its piece's own frame, aligned to the most typical copy and averaged (median):
#    the hand-made differences and the noise go, the outline gets finer than one copy's pixels
#  - the inscription keeps its place and size on the piece as in the photo (nothing is re-centred or re-fitted); across, it is
#    widened by the photo piece's width/height over the 3D piece's (atlas/models/shogi.js pieceGeo) so the characters keep their shape
#  - 王將: the photo's 王將 is washed out by glare, so it is the 玉將 without its dot
# The promoted sides (not in the photo) stay as shogi-glyphs-faithful.py made them (LuffyKudo's SVGs): run that first, then this.
# Also writes shogi/pieces/<set>/traced.png (the 9 traced inscriptions as alpha masks in the photo pieces' own frames, 512×592
# each, FU KY KE GI KA HI KI GY OU) for atlas/tools/shogi-traced-svg.py, which draws the 2D pieces from them.
import os, sys, numpy as np, cv2
from scipy import ndimage as ndi
from scipy.signal import find_peaks
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
K, CW, CH, SS = 8, 256, 296, 4
CODES = ['FU', 'KY', 'KE', 'GI', 'KA', 'HI', 'KI', 'GY', 'TO', 'NY', 'NK', 'NG', 'UM', 'RY', 'OU']
SET = sys.argv[2] if len(sys.argv) > 2 else 'minase'
four = lambda r: [(r, c) for c in range(1, 5)]
LAY = {   # rows of the photo, the pieces of each kind (row, column), and whether the kings are lit hard (glare)
    'minase': dict(rows=[2, 6, 6, 6, 6, 6, 6, 6], glare=True, dy={'GY': .05, 'OU': .05},   # (dy: the kings sat high — their roof is lost in the glare; the user, 2026-11-12)
                   kind={'GY': [(0, 0)], 'KA': [(1, 1), (1, 2)], 'HI': [(1, 3), (1, 4)], 'KI': four(2), 'GI': four(3), 'KE': four(4), 'KY': four(5),
                   'FU': [(r, c) for r in range(1, 6) for c in (0, 5)] + [(r, c) for r in (6, 7) for c in range(6)]}),
    # 錦旗: 玉將 王將 / 角 角 飛 飛 / 歩 金×4 歩 / 歩 銀×4 歩 / 歩 桂×4 歩 / 歩 香×4 歩 / 歩×6 / 歩×6
    'kinki': dict(rows=[2, 4, 6, 6, 6, 6, 6, 6], glare=False, kind={'GY': [(0, 0)], 'OU': [(0, 1)], 'KA': [(1, 0), (1, 1)], 'HI': [(1, 2), (1, 3)], 'KI': four(2), 'GI': four(3), 'KE': four(4), 'KY': four(5),
                  'FU': [(r, c) for r in range(2, 6) for c in (0, 5)] + [(r, c) for r in (6, 7) for c in range(6)]})}
LAY['ryoko'] = dict(LAY['kinki'], thr=.58, drop={'GY': (.35, 0, .52, .11)})   # 菱湖: the photo is laid out as 錦旗's; fine strokes — the outline taken a little inside
LAY = LAY[SET]
KIND = LAY['kind']; BW = float(sys.argv[3]) if len(sys.argv) > 3 else 25   # (the wood's Lab b threshold)
SZ = {'FU': 1, 'KY': 2, 'KE': 2, 'GI': 3, 'KI': 3, 'KA': 4, 'HI': 4, 'GY': 5, 'OU': 5}
ASP3D = lambda sz: 2 * (.385 + .009 * (sz - 1)) / .94          # the 3D face's width / height (pieceGeo)

im = cv2.imread(sys.argv[1]); lab = cv2.cvtColor(im, cv2.COLOR_BGR2LAB).astype(np.float32)
wood = ndi.binary_opening(lab[:, :, 2] - 128 > BW, iterations=1)
filled = ndi.binary_fill_holes(ndi.binary_closing(wood, iterations=2))
inner = ndi.binary_erosion(filled, iterations=5)

def pieces():
    lb, n = ndi.label(ndi.binary_erosion(filled, iterations=3)); comps = []
    for i, sl in enumerate(ndi.find_objects(lb)):
        if (lb[sl] == i + 1).sum() >= 3000: comps.append((sl[0].start - 3, sl[0].stop + 3, sl[1].start - 3, sl[1].stop + 3))
    comps.sort(key=lambda c: (c[0] + c[1]) / 2); rows = []          # touching pieces are one region; regions at one height are a row
    for c in comps:
        if rows and abs((c[0] + c[1]) / 2 - np.mean([(d[0] + d[1]) / 2 for d in rows[-1]])) < 40: rows[-1].append(c)
        else: rows.append([c])
    out = []
    for j, row in enumerate(rows):
        ps = []
        for y0, y1, x0, x1 in sorted(row, key=lambda c: c[2]):
            if j == 0 and len(row) == 1: cuts = [0, (x1 - x0) // 2, x1 - x0]         # (the two kings: glare can break the mask)
            else:
                col = ndi.gaussian_filter1d(filled[y0:y1, x0:x1].sum(0).astype(float), 1.2)
                pk, _ = find_peaks(-col, prominence=4, distance=70); cuts = [0] + [p for p in pk if 20 < p < len(col) - 20] + [len(col)]
            ps += [(y0, y1, x0 + a, x0 + c) for a, c in zip(cuts, cuts[1:])]
        out.append(ps)
    return out
P = pieces(); assert [len(r) for r in P] == LAY['rows'], [len(r) for r in P]

def inkmap(box):
    y0, y1, x0, x1 = box; c = lab[y0:y1, x0:x1]; m = inner[y0:y1, x0:x1]; b = c[:, :, 2] - 128; L = c[:, :, 0]
    bw = np.median(b[m & (b > BW)]); Lw = np.median(L[m & (b > bw * .85)])
    ch = np.clip((bw * .85 - b) / (bw * .6), 0, 1); dk = np.clip((Lw * .78 - L) / (Lw * .38), 0, 1)
    up = lambda a: cv2.resize(a.astype(np.float32), None, fx=K, fy=K, interpolation=cv2.INTER_CUBIC)
    return np.maximum(up(dk), np.clip((up(ch) - .62) / .2, 0, 1)) * (up(m) > .5)

def norm(box):
    """the ink of one piece in the piece's own frame (its bounding box → CW·SS × CH·SS), and the piece's width / height"""
    y0, y1, x0, x1 = box; f = filled[y0:y1, x0:x1]; ys = np.nonzero(f[:, f.shape[1] // 2 - 4: f.shape[1] // 2 + 4].all(1))[0]
    ty, by = ys.min(), ys.max() + 1
    xs = np.nonzero(f[int(ty + (by - ty) * .9)])[0]; lx, rx = xs.min(), xs.max() + 1
    ink = inkmap(box)[ty * K: by * K, lx * K: rx * K]
    return cv2.resize(ink, (CW * SS, CH * SS), interpolation=cv2.INTER_AREA).astype(np.float32), (rx - lx) / (by - ty)

def clean(a, lo=60):
    lb, n = ndi.label(a > .35); H, W = a.shape; keep = np.zeros(a.shape, bool)
    for i, sl in enumerate(ndi.find_objects(lb)):
        m = lb[sl] == i + 1
        if m.sum() < lo or sl[0].stop > H * .975 or sl[0].start < H * .03 or sl[1].start < W * .06 or sl[1].stop > W * .94: continue
        keep[sl] |= m
    return a * ndi.binary_dilation(keep, iterations=6)

RAW = {}
G = lambda x, s: cv2.GaussianBlur(x, (0, 0), s)
def align(ref, a):
    w = np.eye(2, 3, dtype=np.float32)
    try: _, w = cv2.findTransformECC(G(ref, 6), G(a, 6), w, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-6))
    except cv2.error: return None
    return cv2.warpAffine(a, w, (a.shape[1], a.shape[0]), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)

def glyph(code):
    ms, asp = [], []
    for r, c in KIND[code]: a, s = norm(P[r][c]); ms.append(clean(a)); asp.append(s)
    best = int(np.argmax([sum((G(m, 8) * G(o, 8)).sum() for o in ms) for m in ms])) if len(ms) > 2 else 0
    ref = ms[best]; al = [ref] + [x for x in (align(ref, m) for i, m in enumerate(ms) if i != best) if x is not None]
    al = [a for a in al if (G(a, 4) * G(ref, 4)).sum() > .75 * (G(ref, 4) ** 2).sum()]
    avg = np.median(al, 0) if len(al) > 2 else np.mean(al, 0)
    if len(al) == 1 and LAY['glare']: avg = king(avg)
    RAW[code] = avg; cen = lambda m: np.array(ndi.center_of_mass(m))
    if len(al) > 1: avg = ndi.shift(avg, np.mean([cen(m) for m in ms], 0) - cen(avg), order=1)   # placed where the copies have it on average
    a = np.clip((G(avg, 3.0 if len(al) > 2 else 5.0) - LAY.get('thr', .5)) / .22 + .5, 0, 1)   # (two copies: the mean is rougher)
    return clean(a, 400), len(al), float(np.mean(asp))

def king(a):
    """the king is one copy, lit hard (ragged highlights): its 將 is the 金將's 將 (the same character, averaged from 4 copies) laid
    over the king's own by an affine fit, and its 玉 — a simple character — is closed and smoothed"""
    H, W = a.shape; rows = G(a, 3).sum(1); cut = int(H * .3) + int(np.argmin(rows[int(H * .3): int(H * .6)]))
    ki = RAW['KI']; kr = G(ki, 3).sum(1); kc = int(H * .3) + int(np.argmin(kr[int(H * .3): int(H * .6)]))
    lo = a.copy(); lo[:cut] = 0; sho = ki.copy(); sho[:kc] = 0
    bb = lambda m: (lambda ys, xs: (xs.min(), ys.min(), xs.max(), ys.max()))(*np.nonzero(m > .5))
    x0, y0, x1, y1 = bb(lo); u0, v0, u1, v1 = bb(sho); sx, sy = (u1 - u0) / (x1 - x0), (v1 - v0) / (y1 - y0)
    w = np.float32([[sx, 0, u0 - sx * x0], [0, sy, v0 - sy * y0]])           # king → 金 coordinates (bounding boxes first)
    try: _, w = cv2.findTransformECC(G(lo, 7), G(sho, 7), w, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 500, 1e-7))
    except cv2.error: pass
    sho = cv2.warpAffine(sho, w, (W, H), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)
    up = a.copy(); up[cut:] = 0; up = ndi.grey_closing(up, size=(13, 13)); up = G(np.maximum(up, ndi.binary_fill_holes(up > .5).astype(np.float32)), 5)   # (王 has no counters)
    return np.maximum(up, sho)

def no_dot(a):
    """玉 → 王: the dot (a small separate stroke right of 王, in the upper half) taken out"""
    lb, n = ndi.label(a > .3); H, W = a.shape; out = a.copy(); hit = 0
    for i, sl in enumerate(ndi.find_objects(lb)):
        m = lb[sl] == i + 1; cy, cx = (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2
        if cy < H * .42 and cx > W * .55 and m.sum() < 5000: out[sl][ndi.binary_dilation(m, iterations=4)] = 0; hit += 1
    assert hit == 1, hit
    return out

def cell(a, code, asp):
    """the photo piece's frame → the 256×296 glyph cell of the 3D face (RGB = 255·(1 − height), alpha = lacquer)"""
    r = asp / ASP3D(SZ[code]); W, H = a.shape[1], a.shape[0]
    M = np.float32([[r, 0, W / 2 * (1 - r)], [0, 1, 0]]); a = cv2.warpAffine(a, M, (W, H), flags=cv2.INTER_LINEAR)
    A = Image.fromarray(np.round(cv2.resize(a, (CW, CH), interpolation=cv2.INTER_AREA) * 255).astype(np.uint8))
    h = np.power(np.clip(np.array(A.filter(ImageFilter.BoxBlur(3))).astype(np.float32) / 255, 0, 1), .7)
    out = np.zeros((CH, CW, 4), np.uint8); out[:, :, 0] = out[:, :, 1] = out[:, :, 2] = np.round(255 * (1 - h)).astype(np.uint8); out[:, :, 3] = np.array(A)
    return Image.fromarray(out, 'RGBA')

path = os.path.join(ROOT, 'images', 'atlas', f'shogi-glyphs-{SET}.png'); sheet = Image.open(path).convert('RGBA')
tr = Image.new('L', (512 * 9, 592), 0); TR = ['FU', 'KY', 'KE', 'GI', 'KA', 'HI', 'KI', 'GY', 'OU']; info = []
for code in [c for c in KIND if c not in ('GY', 'OU')] + ['GY', 'OU']:
    if code == 'OU' and 'OU' not in KIND: a, n, asp = no_dot(gy), 1, gasp
    else: a, n, asp = glyph(code)
    if code == 'GY': gy, gasp = a, asp
    dr = LAY.get('drop', {}).get(code)   # (a speck that is not ink — 菱湖's 玉將: the photo's glare at the piece's tip; the user, 2026-11-12)
    if dr:
        lb, _ = ndi.label(a > .3); H_, W_ = a.shape
        for j, sl in enumerate(ndi.find_objects(lb)):
            if sl[1].start >= dr[0] * W_ and sl[0].start >= dr[1] * H_ and sl[1].stop <= dr[2] * W_ and sl[0].stop <= dr[3] * H_: a[sl][ndi.binary_dilation(lb[sl] == j + 1, iterations=4)] = 0
    dy = LAY.get('dy', {}).get(code, 0)
    if dy: a = ndi.shift(a, (dy * a.shape[0], 0), order=1)
    i = CODES.index(code); box = ((i % 5) * CW, (i // 5) * CH)
    sheet.paste(Image.new('RGBA', (CW, CH), (255, 255, 255, 0)), box); sheet.paste(cell(a, code, asp), box)
    tr.paste(Image.fromarray(np.round(cv2.resize(a, (512, 592), interpolation=cv2.INTER_AREA) * 255).astype(np.uint8)), (TR.index(code) * 512, 0))
    info.append(f'{code}:{asp:.3f}'); print(code, n, round(asp, 3))
sheet.save(path); tr.save(os.path.join(ROOT, 'shogi', 'pieces', SET, 'traced.png'), optimize=True)
print('photo pieces width/height —', ' '.join(info))

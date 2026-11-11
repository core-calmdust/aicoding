# Writes images/atlas/shogi-glyphs-<set>.png for the 3D piece sets made from 2D SVGs (菱湖 ryoko, 水無瀬 minase, 錦旗 kinki,
# 一字 ichiji) — 2026-11-11, second version (replaces shogi-glyphs.html / .py).
# The inscription is reproduced exactly as the 2D piece draws it (shogi/pieces/<set>/0<code>.svg): the ink paths are rendered on
# their own (with the SVG's own transforms, so 菱湖's 3° correction stays), clipped to the piece's top face (the light #f5e5c6 path
# minus the grey #908768 band, so the maker's mark in the band is left out), and placed in the 256×296 cell at the same place and the
# same size relative to the face as on the 2D piece. Nothing is re-centred or re-fitted: the calligraphy keeps the balance of the
# original drawing. Only ANGLE (set by eye, degrees counter-clockwise) turns single pieces.
# Serve the repo root on :8765 first (python3 -m http.server 8765), then: python3 atlas/tools/shogi-glyphs-faithful.py [set ...]
import asyncio, base64, io, os, re, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import binary_fill_holes, gaussian_filter, sobel, label
from playwright.async_api import async_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
CODES = ['FU', 'KY', 'KE', 'GI', 'KA', 'HI', 'KI', 'GY', 'TO', 'NY', 'NK', 'NG', 'UM', 'RY', 'OU']
CW, CH, S = 256, 296, 1600
# set → (folder, face colour, band colour, layered): the LuffyKudo sets draw flat ink (the height is made here, as a blurred stroke);
# 1kanji_3d (red pieces) stack grey (red) layers to look raised, light at the edge to dark on top — kept as the height, like 盛り上げ
SETS = {'ryoko': ('ryoko', 'f5e5c6', '908768', False), 'minase': ('minase', 'f5e5c6', '908768', False), 'kinki': ('kinki', 'f5e5c6', '908768', False),
        'ichiji': ('1kanji_3d', 'e7d5b8', 'ab865e', True)}
FACE, BAND = '', ''
BODY, SH3D = {'ichiji'}, (.47 - .367) / .94   # (the 3D piece's shoulders, atlas/models/shogi.js pieceGeo)
ANGLE = {}   # e.g. {'ryoko': {'HI': -0.8}}
# fine adjustments by eye against photos of the real sets (2026-11-11): the two characters of a piece each centred on the piece's
# axis (their bodies: the ink between the 6% and 94% points across), the pair set in the body of the piece below the shoulders and a
# little smaller (scale), and single characters turned (TURN: {code: (upper, lower)} degrees, counter-clockwise +)
TUNE = {'ryoko': {'turn': {}, 'dx': {'KE': (0, .05), 'HI': (.12, .06)}, 'fill': {'OU': 1.1, 'GY': 1.1}},
        'minase': {'turn': {'KI': (-3, 0)}, 'up': {'OU': .52, 'GY': .52}, 'fill': {'FU': 1.16}, 'thin': {'FU': 5}, 'gap': {'FU': .07}},
        'kinki': {'turn': {}, 'up': {'OU': .78, 'GY': .78, 'KE': .86}, 'dx': {'KE': (0, .05)}}}
# turn: degrees (counter-clockwise +) for the (upper, lower) character; dx: shift across, a fraction of the character's width
# (right +; 馬's four dots pull its axis left); fill: the block's size, times FILL; thin: strokes made thinner (a min filter of this size at the source scale; 水無瀬's 歩兵
# is drawn bold)
# every two-character inscription of these sets fills the same block of the face (as the user's photos: the 王將 of 錦旗 the model)
FILL, WMAX, BOT = .78, .80, .925   # BOT: the inscription's foot on one line for every piece (the carvers' rule), not centred
TWO = {'FU', 'KY', 'KE', 'GI', 'KA', 'HI', 'KI', 'GY', 'OU'}

def axis(g):
    cols = np.array(g).astype(np.float64).sum(0); c = np.cumsum(cols) / max(1, cols.sum())
    return (np.searchsorted(c, .06) + np.searchsorted(c, .94)) / 2

def lean(a):
    """(v, h): the mean slant of the vertical strokes' edges (+: the top to the right) and of the horizontal ones (+: rising to the
    right), in degrees, weighted by edge strength"""
    a = gaussian_filter(a.astype(float), 1.5); gx, gy = sobel(a, 1), sobel(a, 0); m = np.hypot(gx, gy); out = []
    for ang in (np.degrees(np.arctan2(gy, gx)), np.degrees(np.arctan2(gx, gy))):
        ang = (ang + 90) % 180 - 90; sel = (m > m.max() * .2) & (abs(ang) < 20); w = m[sel]
        out.append(float((ang[sel] * w).sum() / max(1e-9, w.sum())))
    return out[0], out[1]

def upright(p):
    """a character stood up as a carver lays it out: its vertical strokes made plumb by a slight shear across (the horizontal strokes
    keep the brush's own rising slope), damped (the measure is rough; checked by eye afterwards)"""
    v, _ = lean(np.array(p)); t = np.tan(np.radians(float(np.clip(v, -5, 5))))
    if abs(t) < 1e-3: return p
    W, H = p.size; pad = int(abs(t) * H) + 2; q = Image.new('L', (W + 2 * pad, H), 0); q.paste(p, (pad, 0))
    # x_src = x_dst − t·(y − H/2): the top moves left when the verticals lean right
    q = q.transform(q.size, Image.AFFINE, (1, -t, t * H / 2, 0, 1, 0), resample=Image.BICUBIC)
    bb = q.getbbox(); return q.crop(bb) if bb else q

def body_w(p):
    cols = np.array(p).astype(np.float64).sum(0); c = np.cumsum(cols) / max(1, cols.sum())
    return max(1, np.searchsorted(c, .94) - np.searchsorted(c, .06))

def restack(g, turn, up=0, dx=(0, 0), gap=0):
    """the two characters of g taken apart — by connected strokes, each stroke going to the character its centre lies in (a horizontal
    cut would split strokes that reach past the other character, as 飛's hook beside 車), each made upright and centred on one axis"""
    a = np.array(g); H = a.shape[0]; rows = a.astype(np.float64).sum(1)
    lo, hi = int(H * .3), int(H * .7); cut = lo + int(np.argmin(rows[lo:hi]))
    lab, n = label(a > 30); cy = np.zeros(n + 1)
    for i in range(1, n + 1):
        ys = np.nonzero(lab == i)[0]; cy[i] = ys.mean() if len(ys) else 0
    up_m = np.isin(lab, [i for i in range(1, n + 1) if cy[i] < cut])
    yy = np.arange(H)[:, None]
    for i in range(1, n + 1):   # a stroke run into the other character (水無瀬's 歩兵 touch): split at the cut
        ys = np.nonzero(lab == i)[0]
        if len(ys) and (ys < cut).mean() > .25 and (ys >= cut).mean() > .25: up_m = np.where(lab == i, yy < cut, up_m)
    halo = np.array(Image.fromarray((up_m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0   # (the soft edges with it)
    parts = []
    for m, ang in ((halo, turn[0]), (~halo, turn[1])):
        p = Image.fromarray(np.where(m, a, 0).astype(np.uint8)); bb0 = p.getbbox(); p = p.crop(bb0)
        p = upright(upright(p))   # (twice: the measure moves with the shear)
        if ang: p = p.rotate(ang, resample=Image.BICUBIC, expand=True)
        bb = p.getbbox(); p = p.crop(bb); parts.append((p, bb0[1]))
    if up and len(parts) == 2:
        # the upper character at least `up` times the lower one's body width (水無瀬's 王 is drawn small and squat; on real pieces the
        # two read as one size), its foot kept in place
        (p0, y0_), (p1, y1_) = parts; f = min(1.35, max(.7, up * body_w(p1) / body_w(p0)))   # (the upper body made `up` times the lower one's)
        if abs(f - 1) > .02:
            q = p0.resize((round(p0.width * f), round(p0.height * f)), Image.LANCZOS)
            parts = [(q, y0_ + p0.height - q.height - (int(.04 * a.shape[0]) if f < 1 else 0)), (p1, y1_)]   # (the upper one's foot kept where it was)
    if gap and len(parts) == 2: parts[1] = (parts[1][0], parts[1][1] + int(gap * a.shape[0]))   # (more room between the two)
    top0 = min(y for _, y in parts); parts = [(p, y - top0) for p, y in parts]
    W = int(max(max(axis(p), p.width - axis(p)) + abs(d) * p.width for (p, _), d in zip(parts, dx)) * 2) + 4
    out = Image.new('L', (W, max(y + p.height for p, y in parts)), 0)
    for (p, y), d in zip(parts, dx): out.paste(p, (int(round(W / 2 - axis(p) + d * p.width)), y), p)
    bb = out.getbbox(); return out.crop(bb)

def only(svg, keep):
    """keep the face (keep='face'), the band ('band') or everything else, the ink ('ink')"""
    svg = re.sub(r'\sfilter="[^"]*"', '', svg); out = []
    for m in re.finditer(r'<path\b[^>]*?/>|<path\b.*?</path>', svg, flags=re.S):
        tag = m.group(0); f = re.search(r'fill:#([0-9a-fA-F]{6})', tag) or re.search(r'fill="#([0-9a-fA-F]{6})"', tag)
        col = f.group(1).lower() if f else ''
        kind = 'face' if col == FACE else 'band' if col == BAND else 'ink'
        out.append((m.start(), m.end(), kind == keep))
    res, at = [], 0
    for a, b, k in out:
        res.append(svg[at:a]); res.append(svg[a:b] if k else ''); at = b
    res.append(svg[at:]); return ''.join(res)

JS = """t => new Promise(r => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = %d;
  c.getContext('2d').drawImage(im, 0, 0, %d, %d); r(c.toDataURL()); }; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(t); })""" % (S, S, S)

async def render(pg, svg):
    u = await pg.evaluate(JS, svg)
    return np.array(Image.open(io.BytesIO(base64.b64decode(u.split(',', 1)[1]))).convert('RGBA'))

async def cell(pg, folder, code, set_):
    global FACE, BAND
    _, FACE, BAND, layered = SETS[set_]
    svg = open(os.path.join(ROOT, 'shogi', 'pieces', folder, '0' + code + '.svg')).read()
    face = (await render(pg, only(svg, 'face')))[:, :, 3] > 128
    band = (await render(pg, only(svg, 'band')))[:, :, 3] > 40
    INK = await render(pg, only(svg, 'ink')); ink = INK[:, :, 3].astype(np.float32) / 255
    red = code in ('TO', 'NY', 'NK', 'NG', 'UM', 'RY')
    lay = (INK[:, :, 1] if red else INK[:, :, 0]).astype(np.float32) / 255   # (layered sets: the layer's grey, dark = top)
    top = binary_fill_holes(face) & ~band   # (some face paths are cut where the ink lies)
    ys, xs = np.where(top); fx0, fy0, fx1, fy1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    # (the face's own anti-aliased edge: shrink the clip by a pixel or two)
    clip = np.array(Image.fromarray((top * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5))) / 255
    ink = ink * clip
    ang = ANGLE.get(set_, {}).get(code, 0)
    g = Image.fromarray((ink * 255).astype(np.uint8)); gl = Image.fromarray((lay * 255).astype(np.uint8))
    bb = g.getbbox(); gx0, gy0, gx1, gy1 = bb
    gcx, gcy = (gx0 + gx1) / 2, (gy0 + gy1) / 2
    g = g.crop(bb); gl = gl.crop(bb)
    if ang: g = g.rotate(ang, resample=Image.BICUBIC, expand=True); gl = gl.rotate(ang, resample=Image.BICUBIC, expand=True, fillcolor=255)
    T = TUNE.get(set_)
    if T and T.get('thin', {}).get(code): g = g.filter(ImageFilter.MinFilter(T['thin'][code])).filter(ImageFilter.GaussianBlur(1))
    if T and code in TWO: g = restack(g, T['turn'].get(code, (0, 0)), T.get('up', {}).get(code, 0), T.get('dx', {}).get(code, (0, 0)), T.get('gap', {}).get(code, 0)); gl = Image.new('L', g.size, 0)
    # one scale keeps the drawing's proportions (the 2D face is a little squatter than the 3D one: the mean of the width and height
    # scales); the centre goes where it sits on the face
    k = (CW / (fx1 - fx0) * CH / (fy1 - fy0)) ** .5
    if T and code in TWO: f_ = T.get('fill', {}).get(code, 1); k = min(FILL * f_ * CH / g.height, WMAX * f_ * CW / g.width)
    sz = (max(1, round(g.width * k)), max(1, round(g.height * k))); g = g.resize(sz, Image.LANCZOS); gl = gl.resize(sz, Image.LANCZOS)
    cx, cy = (gcx - fx0) / (fx1 - fx0) * CW, (gcy - fy0) / (fy1 - fy0) * CH
    if T:
        cx = CW / 2 - (axis(g) - g.width / 2)   # on the piece's axis
    if T and code in TWO: cy = BOT * CH - g.height / 2
    elif set_ in BODY or T:
        # one character sits in the body of the piece (below the shoulders): the 3D piece's roof is steeper (shoulders at 23.4% from the
        # tip, atlas/models/shogi.js pieceGeo) than the 2D drawing's, so the centre is placed by the body (shoulder → bottom), not the bbox
        w = top.sum(1)[fy0:fy1].astype(float); y = np.arange(len(w)); n = len(w)
        sl = np.polyfit(y[int(n * .5):int(n * .95)], w[int(n * .5):int(n * .95)], 1)   # the body's (tapering) sides
        sh = fy0 + int(np.argmax(w >= np.polyval(sl, y) - 2))                            # the first row on that line: the shoulder
        cy = SH3D * CH + (gcy - sh) / (fy1 - sh) * (1 - SH3D) * CH
    at = (int(round(cx - g.width / 2)), int(round(cy - g.height / 2)))
    A = Image.new('L', (CW, CH), 0); A.paste(g, at); Lh = Image.new('L', (CW, CH), 255); Lh.paste(gl, at)
    a = np.array(A).astype(np.float32) / 255
    # height: the ink blurred (a rounded stroke, highest in its middle), as the first version
    h = np.array(A.filter(ImageFilter.BoxBlur(3))).astype(np.float32) / 255
    h = np.power(np.clip(h, 0, 1), .7)
    out = np.zeros((CH, CW, 4), np.uint8)
    flat = np.array(Lh)[a > .6].std() < 6 if (a > .6).any() else True
    v = np.array(Lh) if layered and not flat else np.round(255 * (1 - h)).astype(np.uint8)
    out[:, :, 0] = out[:, :, 1] = out[:, :, 2] = v; out[:, :, 3] = np.round(a * 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')

async def main():
    sets = sys.argv[1:] or list(SETS)
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); await pg.goto('http://localhost:8765/')
        for s in sets:
            sheet = Image.new('RGBA', (CW * 5, CH * 3), (255, 255, 255, 0))
            for i, c in enumerate(CODES): sheet.paste(await cell(pg, SETS[s][0], c, s), ((i % 5) * CW, (i // 5) * CH))
            sheet.save(os.path.join(ROOT, 'images', 'atlas', f'shogi-glyphs-{s}.png')); print(s)
        await b.close()
asyncio.run(main())

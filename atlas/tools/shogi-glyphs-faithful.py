# Writes images/atlas/shogi-glyphs-<set>.png for the 3D piece sets made from 2D SVGs (菱湖 ryoko, 水無瀬 minase, 錦旗 kinki, 楷書 kaisho,
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
from scipy.ndimage import binary_fill_holes
from playwright.async_api import async_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
CODES = ['FU', 'KY', 'KE', 'GI', 'KA', 'HI', 'KI', 'GY', 'TO', 'NY', 'NK', 'NG', 'UM', 'RY', 'OU']
CW, CH, S = 256, 296, 1600
# set → (folder, face colour, band colour, layered): the LuffyKudo sets draw flat ink (the height is made here, as a blurred stroke);
# orangain / 1kanji_3d stack grey (red) layers to look raised, light at the edge to dark on top — kept as the height, like 盛り上げ
SETS = {'ryoko': ('ryoko', 'f5e5c6', '908768', False), 'minase': ('minase', 'f5e5c6', '908768', False), 'kinki': ('kinki', 'f5e5c6', '908768', False),
        'kaisho': ('orangain', 'e7d5b8', 'ab865e', True), 'ichiji': ('1kanji_3d', 'e7d5b8', 'ab865e', True)}
FACE, BAND = '', ''
BODY, SH3D = {'ichiji'}, (.47 - .25) / .94
ANGLE = {}   # e.g. {'ryoko': {'HI': -0.8}}

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
    # one scale keeps the drawing's proportions (the 2D face is a little squatter than the 3D one: the mean of the width and height
    # scales); the centre goes where it sits on the face
    k = (CW / (fx1 - fx0) * CH / (fy1 - fy0)) ** .5
    sz = (max(1, round(g.width * k)), max(1, round(g.height * k))); g = g.resize(sz, Image.LANCZOS); gl = gl.resize(sz, Image.LANCZOS)
    cx, cy = (gcx - fx0) / (fx1 - fx0) * CW, (gcy - fy0) / (fy1 - fy0) * CH
    if set_ in BODY:
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

# Writes images/atlas/shogi-glyphs-<set>.png from atlas/tools/shogi-glyphs.html (serve the repo root on :8765 first).
import asyncio, base64, io, os, sys
import numpy as np
from PIL import Image
# (2026-11-11) every inscription is then fitted, keeping its proportions, into the box the 盛り上げ sheet's inscription of the same piece
# fills (images/atlas/shogi-glyphs.png), centred in it; the one-character set into one box a little below the middle of the face
CW, CH = 256, 296
def boxes(a):
    out = []
    for i in range(15):
        c = a[(i // 5) * CH:(i // 5) * CH + CH, (i % 5) * CW:(i % 5) * CW + CW]; ys, xs = np.where(c > 100)
        out.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    return out
TWO = {0, 1, 2, 3, 4, 5, 6, 7, 12, 13, 14}   # the two-character pieces (歩兵 … 王将, 龍馬, 龍王, 玉将)
def lean(g):
    # the slope of the column of ink: x of each row's ink centre against y (a two-character inscription should stand upright)
    a = np.array(g)[:, :, 3].astype(float); ys = np.arange(a.shape[0]); w = a.sum(1); m = w > a.shape[1] * 8
    if m.sum() < 10: return 0.0
    cx = (a * np.arange(a.shape[1])[None, :]).sum(1)[m] / w[m]; return float(np.polyfit(ys[m], cx, 1)[0])
def upright(g):
    s0 = lean(g)
    if abs(s0) < .02: return g
    best = g, abs(s0)
    for sgn in (1, -1):
        r = g.rotate(sgn * np.degrees(np.arctan(s0)), resample=Image.BICUBIC, expand=True); s1 = abs(lean(r))
        if s1 < best[1]: best = r, s1
    r = best[0]; bb = r.getbbox(); return r.crop(bb) if bb else r
def fit(png, ref, one):
    im = Image.open(io.BytesIO(png)).convert('RGBA'); a = np.array(im)[:, :, 3]; src = boxes(a); out = Image.new('RGBA', im.size, (255, 255, 255, 0))
    G, K = [], []
    for i in range(15):
        ox, oy = (i % 5) * CW, (i // 5) * CH
        x0, y0, x1, y1 = src[i]; g = im.crop((ox + x0, oy + y0, ox + x1, oy + y1))
        if not one and i in TWO: g = upright(g)
        tx0, ty0, tx1, ty1 = (0.13 * CW, 0.27 * CH, 0.87 * CW, 0.88 * CH) if one else ref[i]
        G.append((g, (tx0, ty0, tx1, ty1))); K.append(min((tx1 - tx0) / g.width, (ty1 - ty0) / g.height))
    cap = float(np.median(K)) * 1.06   # one scale for the set: no piece's inscription much larger than the others
    for i, (g, (tx0, ty0, tx1, ty1)) in enumerate(G):
        ox, oy = (i % 5) * CW, (i // 5) * CH; k = min(K[i], cap)
        g = g.resize((max(1, round(g.width * k)), max(1, round(g.height * k))), Image.LANCZOS)
        out.alpha_composite(g, (int(ox + (tx0 + tx1 - g.width) / 2), int(oy + (ty0 + ty1 - g.height) / 2)))
    b = io.BytesIO(); out.save(b, 'PNG'); return b.getvalue()
from playwright.async_api import async_playwright
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await pg.goto('http://localhost:8765/atlas/tools/shogi-glyphs.html'); await pg.wait_for_function('window.READY')
        ref = boxes(np.array(Image.open(os.path.join(ROOT, 'images', 'atlas', 'shogi-glyphs.png')).convert('RGBA'))[:, :, 3])
        for s in (sys.argv[1:] or await pg.evaluate('window.SETS')):
            u = await pg.evaluate('s => SHEET(s)', s)
            open(os.path.join(ROOT, 'images', 'atlas', f'shogi-glyphs-{s}.png'), 'wb').write(fit(base64.b64decode(u.split(',', 1)[1]), ref, s == 'ichiji')); print(s)
        await b.close()
asyncio.run(main())

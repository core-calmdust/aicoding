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
def fit(png, ref, one):
    im = Image.open(io.BytesIO(png)).convert('RGBA'); a = np.array(im)[:, :, 3]; src = boxes(a); out = Image.new('RGBA', im.size, (255, 255, 255, 0))
    for i in range(15):
        ox, oy = (i % 5) * CW, (i // 5) * CH
        x0, y0, x1, y1 = src[i]; g = im.crop((ox + x0, oy + y0, ox + x1, oy + y1))
        tx0, ty0, tx1, ty1 = (0.13 * CW, 0.27 * CH, 0.87 * CW, 0.88 * CH) if one else ref[i]
        k = min((tx1 - tx0) / g.width, (ty1 - ty0) / g.height); g = g.resize((max(1, round(g.width * k)), max(1, round(g.height * k))), Image.LANCZOS)
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

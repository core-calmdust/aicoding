# Writes images/atlas/shogi-glyphs-futofude.png: the 3D piece set 「浮木」 from sunfish-shogi's two-character pieces
# (shogi/pieces/futamoji/piece.svg, https://github.com/sunfish-shogi/shogi-images, CC0 1.0) — 2026-11-11.
# The sheet's pieces are drawn at 20× (filters off), each piece's light face (#ffe680) found, and its inscription (everything on the
# face that is not face colour) reproduced as drawn: same place on the face, one scale (the mean of the face's width and height
# scales: the 2D face is squatter than the 3D one). The height is the raised lacquer of 盛り上げ: a rounded ridge along each stroke,
# highest on its centre line and higher on the thick body of a stroke than on its thin hooks and tails.
# Serve the repo root on :8765 is not needed; run: python3 atlas/tools/shogi-glyphs-futamoji.py
import asyncio, os, re
import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import label, binary_fill_holes, distance_transform_edt
from playwright.async_api import async_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
CW, CH, SS = 256, 296, 4
# the sheet: row 1 王將 飛車 角行 金將 銀將 桂馬 香車 歩兵, row 2 玉將 龍王 龍馬 全 圭 杏 と (black), rows 3-4 the same turned (white)
ORDER = ['OU', 'HI', 'KA', 'KI', 'GI', 'KE', 'KY', 'FU', 'GY', 'RY', 'UM', 'NG', 'NK', 'NY', 'TO']
CODES = ['FU', 'KY', 'KE', 'GI', 'KA', 'HI', 'KI', 'GY', 'TO', 'NY', 'NK', 'NG', 'UM', 'RY', 'OU']

async def render():
    s = open(os.path.join(ROOT, 'shogi', 'pieces', 'futamoji', 'piece.svg')).read()
    s = re.sub(r'filter:url\([^)]*\);?', '', s); s = re.sub(r'\sfilter="[^"]*"', '', s)
    s = s.replace('width="280mm"', 'width="5600"').replace('height="148.00003mm"', 'height="2960"')
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 5600, 'height': 2960})
        await pg.set_content('<body style="margin:0;background:transparent">' + s + '</body>'); await pg.wait_for_timeout(500)
        png = await pg.screenshot(omit_background=True, clip={'x': 0, 'y': 0, 'width': 5600, 'height': 2960}); await b.close()
    import io; return np.array(Image.open(io.BytesIO(png)).convert('RGBA')).astype(int)

def cell(a, comp):
    y0, x0, y1, x1 = comp
    sub = a[y0:y1 + 1, x0:x1 + 1]
    face = (abs(sub[:, :, 0] - 255) < 12) & (abs(sub[:, :, 1] - 230) < 14) & (abs(sub[:, :, 2] - 128) < 20) & (sub[:, :, 3] > 200)
    lab, n = label(face); big = lab == (np.bincount(lab.ravel())[1:].argmax() + 1)
    top = binary_fill_holes(big)
    ys, xs = np.where(top); fy0, fy1, fx0, fx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    inner = np.array(Image.fromarray((top * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(9))) > 0
    # ink: dark or red, by how far it is from the face colour
    d = np.sqrt(((sub[:, :, :3] - [255, 230, 128]) ** 2).sum(2)) / 255
    ink = np.clip((d - .15) / .35, 0, 1) * inner
    g = Image.fromarray((ink * 255).astype(np.uint8)); bb = g.getbbox(); gx0, gy0, gx1, gy1 = bb
    gcx, gcy = (gx0 + gx1) / 2, (gy0 + gy1) / 2; g = g.crop(bb)
    k = (CW * SS / (fx1 - fx0) * CH * SS / (fy1 - fy0)) ** .5
    g = g.resize((max(1, round(g.width * k)), max(1, round(g.height * k))), Image.LANCZOS)
    cx, cy = (gcx - fx0) / (fx1 - fx0) * CW * SS, (gcy - fy0) / (fy1 - fy0) * CH * SS
    A = Image.new('L', (CW * SS, CH * SS), 0); A.paste(g, (round(cx - g.width / 2), round(cy - g.height / 2)))
    dt = distance_transform_edt(np.array(A) > 127); ref = np.percentile(dt[dt > 0], 92)
    r = np.clip(dt / ref, 0, 1); H = Image.fromarray(np.round(255 * np.sqrt(r) * (.55 + .45 * r)).astype(np.uint8)).filter(ImageFilter.GaussianBlur(SS))
    A = A.resize((CW, CH), Image.LANCZOS); H = H.resize((CW, CH), Image.LANCZOS)
    out = np.zeros((CH, CW, 4), np.uint8); v = 255 - np.array(H)
    out[:, :, 0] = out[:, :, 1] = out[:, :, 2] = v; out[:, :, 3] = np.array(A)
    return Image.fromarray(out, 'RGBA')

def main():
    a = asyncio.run(render())
    face = (abs(a[:, :, 0] - 255) < 12) & (abs(a[:, :, 1] - 230) < 14) & (abs(a[:, :, 2] - 128) < 20) & (a[:, :, 3] > 200)
    lab, n = label(face); comps = []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(ys) > 20000: comps.append((ys.min(), xs.min(), ys.max(), xs.max()))
    comps.sort(key=lambda t: (t[0] // 300, t[1]))
    pos = dict(zip(ORDER, comps[:15]))
    sheet = Image.new('RGBA', (CW * 5, CH * 3), (255, 255, 255, 0))
    for i, c in enumerate(CODES): sheet.paste(cell(a, pos[c]), ((i % 5) * CW, (i // 5) * CH))
    sheet.save(os.path.join(ROOT, 'images', 'atlas', 'shogi-glyphs-futofude.png')); print('futofude')
main()

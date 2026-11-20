#!/usr/bin/env python3
"""Portrait versions of the one-picture skins (2026-11-20 ユーザー：いろんなブラウザサイズに対応):
images/atlas/skin/<id>-p.webp, 1920×3000 — the landscape scene (1920×1200 grid) at the bottom with 1800 more units of
sky above it. The page uses it when the window is narrower than 6:5 (index.html), anchored to the bottom, so the scene
always stays in view and only the sky grows. SVG scenes are re-rendered with the extension; the numpy ones are
extended from their landscape picture (sky colour per column, plus stars / clouds / map lines where the scene has them).
Run from the repo root: python3 atlas/tools/skins_tall.py [id …]"""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import skins as S
import skins_ssr2 as P
import skins_ur2 as U
import skins_ssr3 as Q

D = os.path.join(os.path.dirname(__file__), '..', '..', 'images', 'atlas', 'skin')
TW, TH, EXT = 1920, 3000, 1800   # px (1 px = 1 grid unit)

def top_col(id_):
    im = np.asarray(Image.open(os.path.join(D, id_ + '.webp')).convert('RGB'), np.float32)
    return '#%02x%02x%02x' % tuple(int(v) for v in im[:12].reshape(-1, 3).mean(0))

def stars_svg(n, seed, col='#fff6dc', y0=-1800, y1=0):
    r = S.RNG(seed)
    return ''.join(f'<circle cx="{r.random() * 1920:.0f}" cy="{y0 + r.random() * (y1 - y0):.0f}" r="{.8 + r.random() ** 3 * 2.4:.1f}" fill="{col}" opacity="{.35 + r.random() * .6:.2f}"/>' for _ in range(n))

def clouds_svg(seed, shade='#e3edf6', n=3):
    return ''   # (2026-11-20: the clouds drift — atlas/skins-fx.js)
    r = S.RNG(seed); out = ''
    for i in range(n):
        out += P.cloud(200 + (i * 620 + r.random() * 300) % 1600, -1550 + i * 480 + r.random() * 160, 80 + r.random() * 50, shade=shade)
    return out

SVG = {   # id: (builder, extra pieces in the extension)
    's79': (P.paris, lambda: clouds_svg(1, '#ecdfee')), 's80': (P.venice, lambda: clouds_svg(2)), 's81': (P.santorini, lambda: clouds_svg(3)),
    's82': (P.kyoto, lambda: clouds_svg(4, '#f1e2d8')), 's83': (P.nordic_harbor, lambda: clouds_svg(5)), 's84': (P.egypt, lambda: ''),
    's85': (P.amusement, lambda: clouds_svg(6)), 's86': (P.aquarium, lambda: ''.join(f'<circle cx="{x}" cy="{y}" r="{s}" fill="none" stroke="#ffffff" stroke-width="3" opacity=".6"/>' for x, y, s in ((320, -400, 10), (336, -470, 7), (1600, -900, 9), (1612, -960, 6), (900, -1300, 8)))),
    's87': (P.library, lambda: ''), 's88': (P.train, lambda: clouds_svg(7)),
    's96': (P.savanna, lambda: ''), 's97': (P.antarctic, lambda: clouds_svg(8, '#dde8f3')), 's98': (P.cappadocia, lambda: ''.join(
        f'<g transform="translate({x} {y}) scale({s})"><path d="M-90 0 C-90 -70 90 -70 90 0 C90 50 40 80 26 110 L-26 110 C-40 80 -90 50 -90 0 Z" fill="{c}"/><path d="M-24 110 L-20 140 M24 110 L20 140" stroke="#b08a6a" stroke-width="3"/><rect x="-24" y="138" width="48" height="30" rx="5" fill="#c9a07a"/></g>'
        for x, y, s, c in ((380, -900, .5, '#f6d79a'), (1500, -1300, .6, '#a9c8e6'), (900, -500, .35, '#f6b8c2'), (1700, -400, .4, '#d9c8ef')))),
    's99': (P.mexico, lambda: ''),
    's25': (Q.blue_sky, lambda: ''), 's26': (Q.sunset_hills, lambda: ''), 's27': (Q.seaside, lambda: ''), 's28': (Q.snowfield, lambda: ''), 's29': (Q.flower_meadow, lambda: ''),
    's30': (Q.dunes, lambda: ''), 's31': (Q.lake, lambda: ''), 's33': (Q.night_sky, lambda: stars_svg(300, 33)), 's38': (Q.galaxy_rail, lambda: stars_svg(500, 38, '#fff6e6')), 's39': (Q.jelly_sea, lambda: ''),
    's89': (lambda: U.stained(0), lambda: ''), 's89b': (lambda: U.stained(1), lambda: ''),
    's93': (lambda: U.night_fair(0), lambda: stars_svg(260, 93)), 's93b': (lambda: U.night_fair(1), lambda: stars_svg(260, 93)),
    's94': (lambda: U.makie(0), lambda: stars_svg(500, 94, '#e2bd6a', -1800, 0)), 's94b': (lambda: U.makie(1), lambda: stars_svg(500, 94, '#e2bd6a', -1800, 0)),
}

def extend(id_):
    """numpy scenes: the landscape picture at the bottom, its top colours carried up (with a gentle drift), stars etc."""
    im = Image.open(os.path.join(D, id_ + '.webp')).convert('RGB').resize((TW, 1200), Image.LANCZOS)
    a = np.asarray(im, np.float32) / 255
    top = a[:40].mean(0)                                 # per column, then smoothed widely (no streaks)
    top = np.stack([np.convolve(np.pad(top[:, c], 500, mode='edge'), np.ones(1001) / 1001, 'valid') for c in range(3)], -1)
    ext = np.broadcast_to(top[None], (EXT, TW, 3)).copy()
    nz = np.asarray(Image.fromarray((S.fnoise(256, 3.0, int(id_[1:]), m=256) * 255).astype(np.uint8)).resize((TW, EXT), Image.BICUBIC), np.float32) / 255
    ext = ext * (0.985 + 0.03 * nz)[..., None]
    n = S.big_noise(int(id_[1:]) + 500) if False else None
    f = np.clip(np.arange(1200) / 140, 0, 1)[:, None, None]   # the picture's top 140 px fade into the extension (no seam)
    a2 = a * f + np.broadcast_to(top[None], a.shape) * (1 - f)
    out = np.concatenate([ext, a2], 0)
    pim = Image.fromarray(np.clip(out * 255 + .5, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(pim, 'RGBA'); r = S.RNG(int(id_[1:]))
    if id_ in ('s33', 's36', 's37'):
        for _ in range(900):
            x, y, s = r.random() * TW, r.random() * EXT, .7 + r.random() ** 3 * 2.4
            d.ellipse([x - s, y - s, x + s, y + s], fill=(255, 246, 220, int(110 + r.random() * 145)))
    if id_ == 's37':   # the graticule rings and spokes go on up (same centre as in the picture: 960, 1500 → +1800)
        cx, cy = 960, 1500 + EXT
        for rr in range(300, 4600, 170): d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=(201, 169, 94, 48), width=1)
        for k in range(24):
            t = k * math.pi / 12; d.line([cx, cy, cx + math.cos(t) * 4600, cy + math.sin(t) * 4600], fill=(201, 169, 94, 34), width=1)
        pim.paste(Image.fromarray(np.clip(a2 * 255, 0, 255).astype(np.uint8)), (0, EXT))
    if id_ == 's35':   # rhumb lines from the compass rose carry on up
        cx, cy = 1517, 912 + EXT
        for k in range(32):
            t = k * math.pi / 16; d.line([cx, cy, cx + math.cos(t) * 4000, cy + math.sin(t) * 4000], fill=(138, 106, 60, 50), width=1)
        pim.paste(Image.fromarray(np.clip(a2 * 255, 0, 255).astype(np.uint8)), (0, EXT))
    if id_ in ('s25', 's27', 's28', 's29', 's31'):   # a few flat clouds in the extra sky
        for i in range(3):
            x, y, s = 260 + (i * 640 + r.random() * 260) % 1500, 300 + i * 480 + r.random() * 120, 70 + r.random() * 50
            for dy, col in ((.06, (220, 233, 244, 255)), (0, (255, 255, 255, 255))):
                for lx, ly, lr in ((-.55, .02, .3), (-.2, -.2, .42), (.25, -.12, .38), (.58, .04, .28)):
                    d.ellipse([x + (lx - lr) * s, y + (ly + dy - lr) * s, x + (lx + lr) * s, y + (ly + dy + lr) * s], fill=col)
                d.rounded_rectangle([x - .82 * s, y + (dy - .02) * s, x + .86 * s, y + (dy + .28) * s], radius=.15 * s, fill=col)
    o = np.asarray(pim, np.float32) / 255
    return S.grain(o, .004, int(id_[1:]))

NUMPY = ['s35', 's36', 's37']

def save_p(id_, img):
    im = img if isinstance(img, Image.Image) else S.to_img(img)
    p = os.path.join(D, id_ + '-p.webp'); im.save(p, 'WEBP', quality=78, method=6); print(id_, '-p', im.size, os.path.getsize(p) // 1024, 'KB')

if __name__ == '__main__':
    ids = sys.argv[1:] or (NUMPY + list(SVG))
    svg = [i for i in ids if i in SVG]
    jobs = []
    for i in svg:
        P.TALL.update(on=True, col=top_col(i), extra=SVG[i][1]())
        jobs.append((SVG[i][0](), TW, TH))
    P.TALL['on'] = False
    if jobs:
        for i, im in zip(svg, P.render(jobs)): save_p(i, S.grain(im, .004, int(i[1:3])))
    for i in ids:
        if i in NUMPY: save_p(i, extend(i))

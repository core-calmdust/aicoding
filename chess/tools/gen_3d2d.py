#!/usr/bin/env python3
"""The 3D board and pieces for the 2D page (designs "3D lacquer" / "3D wood").
Inputs (from tools/render2d.html, rendered in headless Chrome): top-<set>.png (2048² board top: frame 0.85 + 8 squares + frame)
and <set>-<wK…bP>.png (3/4 piece sprites, 1 × 1.6 squares).
Outputs: img/bd-<set>3d.webp (the 8×8 field with a soft lacquer sheen), img/fr-<set>3d.webp (a burl tile from the frame),
pieces/<set>3d/<wK…>.webp (256 × 410).
python3 chess/tools/gen_3d2d.py RENDERS"""
import os, sys, numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..')
R = sys.argv[1]
for st in ('lux', 'wood'):
    top = Image.open(os.path.join(R, f'top-{st}.png')).convert('RGB'); W = top.width
    m = round(.85 / 9.7 * W)
    field = top.crop((m, m, W - m, W - m)).resize((1200, 1200), Image.LANCZOS)
    a = np.asarray(field).astype(float); yy, xx = np.mgrid[0:1200, 0:1200] / 1200
    sheen = np.clip(1 - np.hypot((xx - .3) / .55, (yy - .25) / .4), 0, 1) ** 2 * (26 if st == 'lux' else 20)
    Image.fromarray(np.clip(a + sheen[..., None], 0, 255).astype(np.uint8)).save(os.path.join(ROOT, 'img', f'bd-{st}3d.webp'), quality=88, method=6)
    strip = top.crop((m, int(m * .1), m + int(m * 2.4), int(m * .9)))   # a piece of the frame veneer (above the field)
    tile = strip.resize((360, 120), Image.LANCZOS)
    tile.save(os.path.join(ROOT, 'img', f'fr-{st}3d.webp'), quality=86, method=6)
    for col in 'wb':
        for tp in 'KQRBNP':
            p = Image.open(os.path.join(R, f'{st}-{col}{tp}.png')).convert('RGBA').resize((256, 410), Image.LANCZOS)
            p.save(os.path.join(ROOT, 'pieces', f'{st}3d', f'{col}{tp}.webp'), quality=90, method=6)
    print(st, 'ok')

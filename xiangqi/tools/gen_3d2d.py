#!/usr/bin/env python3
"""The 3D board and pieces for the 2D page (designs "3D lacquer" board / "3D boxwood" pieces).
Inputs (from tools/render2d.html, rendered in headless Chrome): top.png (the model's painted top: black lacquer frame
0.72 + the vermilion field 9u x 10u + frame) and r1..r7 / b1..b7.png (the discs seen from the front, high up).
Outputs: img/bd-lacq3d.webp (the field: its points sit on the 2D board's 9 x 10 cell centres),
img/fr-lacq3d-t.webp / -b.webp (one repeat of the frame's gold key band with a peony, for the top / bottom of the 2D frame),
pieces/box3d/<r|b><1..7>.webp.
python3 xiangqi/tools/gen_3d2d.py RENDERS"""
import os, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..')
R = sys.argv[1]
u, MG, FR = .9, .45, .72
RW, RD = 8 * u + 2 * MG, 9 * u + 2 * MG
W, D = RW + 2 * FR, RD + 2 * FR
top = Image.open(os.path.join(R, 'top.png')).convert('RGB'); kx, ky = top.width / W, top.height / D
os.makedirs(os.path.join(ROOT, 'img'), exist_ok=True); os.makedirs(os.path.join(ROOT, 'pieces', 'box3d'), exist_ok=True)
field = top.crop((round(FR * kx), round(FR * ky), round((FR + RW) * kx), round((FR + RD) * ky))).resize((1080, 1200), Image.LANCZOS)
field.save(os.path.join(ROOT, 'img', 'bd-lacq3d.webp'), quality=86, method=6)
# one period of the top band (atlas/models/xiangqi.js topCanvas side(): gaps with a peony between key blocks 15g wide)
L = W - 2 * FR; g = .062; nb = max(2, round((L - .7) / 1.66)); fl = (L - nb * 15 * g) / (nb + 1); per = fl + 15 * g
band = top.crop((round(FR * kx), 0, round((FR + per) * kx), round(FR * ky)))
band = band.resize((round(band.width * 140 / band.height), 140), Image.LANCZOS)
band.save(os.path.join(ROOT, 'img', 'fr-lacq3d-t.webp'), quality=84, method=6)
band.rotate(180).save(os.path.join(ROOT, 'img', 'fr-lacq3d-b.webp'), quality=84, method=6)
for c in 'rb':
    for t in range(1, 8):
        p = Image.open(os.path.join(R, f'{c}{t}.png')).convert('RGBA')
        p = p.resize((192, round(192 * p.height / p.width)), Image.LANCZOS)
        p.save(os.path.join(ROOT, 'pieces', 'box3d', f'{c}{t}.webp'), quality=88, method=6)
print('ok', band.size, p.size)

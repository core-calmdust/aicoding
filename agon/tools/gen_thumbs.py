#!/usr/bin/env python3
"""Site thumbnails for Agon: images/agon.webp (1200x900, the top page card), images/atlas/agon.webp (320x320, the rules
intro picture). The folk board with a mid-game position (rendered piece faces). python3 agon/tools/gen_thumbs.py"""
import os, math
from PIL import Image, ImageFilter, ImageDraw
H = os.path.dirname(os.path.abspath(__file__)); IMG = os.path.join(H, '..', 'img'); OUT = os.path.join(H, '..', '..', 'images')
def cell(q, r): return 512 + (q + r / 2) * 80, 512 + r * math.sqrt(3) / 2 * 80
# a mid-game position: White's queen on the throne, guards closing in; Black blocking
POS = [((0, 0), 1, 'q'), ((0, -1), 1, 'g'), ((1, -1), 1, 'g'), ((1, 0), 2, 'g'), ((0, 1), 1, 'g'), ((-1, 0), 1, 'g'), ((-2, 2), 1, 'g'), ((2, 1), 1, 'g'),
       ((-1, 1), 2, 'g'), ((2, -2), 2, 'g'), ((-2, 0), 2, 'g'), ((3, -1), 2, 'q'), ((-1, 3), 2, 'g'), ((0, -3), 2, 'g'), ((1, 2), 2, 'g')]
def board(bd='folk', pcs='bone'):
    b = Image.open(os.path.join(IMG, f'bd-{bd}.webp')).convert('RGBA')
    sh = Image.new('RGBA', b.size, (0, 0, 0, 0)); d = ImageDraw.Draw(sh)
    for (q, r), s, k in POS:
        x, y = cell(q, r); d.ellipse((x - 33, y - 28, x + 39, y + 44), fill=(0, 0, 0, 150))
    b.alpha_composite(sh.filter(ImageFilter.GaussianBlur(5)))
    for (q, r), s, k in POS:
        p = Image.open(os.path.join(IMG, f'pc-{pcs}-{s}-{k}.webp')).convert('RGBA').resize((74, 74), Image.LANCZOS)
        x, y = cell(q, r); b.alpha_composite(p, (int(x - 37), int(y - 37)))
    return b
b = board()
bg = Image.new('RGBA', (1200, 900), (18, 22, 12, 255))
g = Image.radial_gradient('L').resize((1200, 900)); dark = Image.new('RGBA', (1200, 900), (6, 8, 4, 255)); bg = Image.composite(dark, bg, g)
bb = b.resize((860, 860), Image.LANCZOS)
sh = Image.new('RGBA', (1200, 900), (0, 0, 0, 0)); ImageDraw.Draw(sh).rectangle((180, 40, 1020, 900), fill=(0, 0, 0, 200)); bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(24)))
bg.alpha_composite(bb, (170, 20))
bg.convert('RGB').save(os.path.join(OUT, 'agon.webp'), quality=86, method=6)
c = b.crop((192, 192, 832, 832)).resize((320, 320), Image.LANCZOS)
c.convert('RGB').save(os.path.join(OUT, 'atlas', 'agon.webp'), quality=88, method=6)
print('ok')

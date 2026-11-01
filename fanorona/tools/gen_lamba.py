#!/usr/bin/env python3
"""The "Lamba" board design: an original patchwork of large painted triangles (green / blue / violet / yellow), brushed,
with woven lozenge motifs in some patches and a striped band at the top and bottom (after Malagasy lamba cloth).
python3 tools/gen_lamba.py  → img/lamba.webp"""
import os, numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter
W, H = 1800, 1200
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img', 'lamba.webp')
rng = np.random.default_rng(7)
PAL = [(34, 112, 74), (52, 140, 88), (28, 96, 140), (46, 120, 190), (88, 62, 150), (112, 70, 160), (236, 196, 64), (24, 128, 120)]
WEIGHT = [3, 3, 3, 2, 2, 1.4, 1.2, 2]
img = Image.new('RGB', (W, H)); d = ImageDraw.Draw(img)
# a jittered lattice cut into triangles (large shards)
nx, ny = 7, 5
pts = {}
for j in range(ny + 1):
    for i in range(nx + 1):
        x = i * W / nx + (rng.uniform(-90, 90) if 0 < i < nx else 0)
        y = j * H / ny + (rng.uniform(-70, 70) if 0 < j < ny else 0)
        pts[i, j] = (x, y)
tris = []
for j in range(ny):
    for i in range(nx):
        a, b, c, e = pts[i, j], pts[i + 1, j], pts[i + 1, j + 1], pts[i, j + 1]
        if (i + j + rng.integers(0, 2)) % 2: tris += [(a, b, c), (a, c, e)]
        else: tris += [(a, b, e), (b, c, e)]
w = np.array(WEIGHT) / sum(WEIGHT)
cols = []
for k, t in enumerate(tris):
    c = PAL[rng.choice(len(PAL), p=w)]
    cols.append(c); d.polygon(t, fill=c)
base = np.asarray(img).astype(np.float64)
# brush strokes: directional noise per patch direction (two directions mixed)
def nz(sy, sx):
    n = gaussian_filter(rng.standard_normal((H, W)), (sy, sx)); return n / (n.std() + 1e-9)
br = 0.55 * nz(1.2, 40) + 0.45 * nz(40, 1.2) * 0.6 + 0.4 * nz(14, 60)
base *= (1 + 0.075 * br[..., None])
# woven lozenge motifs on some patches (lighter, low opacity)
mot = Image.new('L', (W, H), 0); md = ImageDraw.Draw(mot)
mask = Image.new('L', (W, H), 0); mk = ImageDraw.Draw(mask)
for k, t in enumerate(tris):
    if rng.random() < 0.38: mk.polygon(t, fill=255)
s = 46
for y in range(-s, H + s, s):
    for x in range(-s, W + s, s):
        cx, cy = x + (s / 2 if (y // s) % 2 else 0), y
        r = s * 0.42
        md.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], outline=255, width=5)
        r2 = s * 0.16
        md.polygon([(cx, cy - r2), (cx + r2, cy), (cx, cy + r2), (cx - r2, cy)], fill=255)
mo = (np.asarray(mot).astype(np.float64) / 255) * (np.asarray(mask.filter(ImageFilter.GaussianBlur(6))).astype(np.float64) / 255)
base = base * (1 - 0.22 * mo[..., None]) + np.array([235, 240, 220]) * 0.22 * mo[..., None]
# striped bands at the top and bottom (where the grooves are), with a row of small diamonds
for y0, y1 in ((0, 150), (H - 150, H)):
    band = np.zeros((y1 - y0, W, 3))
    for k, (a, b, c) in enumerate([(0, 40, (60, 40, 130)), (40, 52, (40, 160, 120)), (52, 100, (46, 70, 170)), (100, 112, (40, 160, 120)), (112, 150, (60, 40, 130))]):
        band[a:b] = c
    bimg = Image.fromarray(band.astype(np.uint8)); bd = ImageDraw.Draw(bimg)
    for x in range(30, W, 120):
        cx, cy = x, 76
        for r, col in ((22, (236, 196, 64)), (12, (60, 40, 130)), (5, (236, 196, 64))):
            bd.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], fill=col)
    bb = np.asarray(bimg).astype(np.float64) * (1 + 0.06 * br[y0:y1, :, None])
    base[y0:y1] = bb
# soft cloth sheen + slight vignette
yy, xx = np.mgrid[0:H, 0:W]
vig = 1 - 0.18 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
base *= vig[..., None] * (1 + 0.04 * nz(120, 200)[..., None])
os.makedirs(os.path.dirname(OUT), exist_ok=True)
Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).save(OUT, quality=84, method=6)
print('saved', OUT)

#!/usr/bin/env python3
"""Ludo's 2D 木目 board (2026-11-09 v3): the wood under the paint — after fanorona/tools/gen_wood.py (long streaks along the
grain, heartwood bands, fibres, pores, an oiled sheen). A light maple-like board and a walnut frame.
python3 ludo/tools/gen_wood.py  → ludo/img/wood-board.webp, wood-frame.webp"""
import os, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates

W, H = 1600, 1600
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img')
DESIGNS = {   # light, mid, dark, pore (RGB)
    'board': ((240, 212, 166), (222, 186, 134), (190, 148, 96), (150, 110, 66)),   # (2026-11-09: no deep browns on the board)
    'frame': ((184, 134, 88), (156, 108, 66), (118, 78, 44), (84, 54, 30)),   # a mid teak, not near-black
}

def noise(rng, sy, sx):
    n = gaussian_filter(rng.standard_normal((H, W)), (sy, sx), mode='wrap')
    return n / (n.std() + 1e-9)

def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def render(key, seed):
    rng = np.random.default_rng(seed)
    light, mid, dark, pore = (np.array(c, np.float64) for c in DESIGNS[key])
    # a gentle sideways drift of the grain (the board is cut a little off the grain)
    y, x = np.mgrid[0:H, 0:W].astype(np.float64)
    dy = noise(rng, 120, 500) * 26 + noise(rng, 30, 200) * 5
    warp = lambda a: map_coordinates(a, [np.mod(y + dy, H), x], order=1, mode='grid-wrap')
    # streaks at several scales, all stretched along the grain
    s = warp(noise(rng, 1.2, 90) * 0.35 + noise(rng, 4, 260) * 0.55 + noise(rng, 14, 700) * 0.8)
    # broad heartwood bands (the dark "cuts" running through acacia)
    hw = warp(noise(rng, 34, 1100) + 0.45 * noise(rng, 9, 420))
    band = smooth(0.15, 1.1, hw)
    fib = warp(noise(rng, 0.45, 26)) * 0.5 + warp(noise(rng, 0.7, 70)) * 0.5
    t = np.clip(0.42 + 0.17 * s + 0.07 * fib, 0, 1)
    base = np.where(t[..., None] < 0.5, light + (mid - light) * (t[..., None] / 0.5), mid + (dark - mid) * ((t[..., None] - 0.5) / 0.5))
    BW = 0.3 if key == 'board' else 0.45   # the heartwood bands: faint on the light board
    img = base * (1 - BW * band[..., None]) + dark * BW * band[..., None]
    # thin dark lines along the edges of the heartwood bands (the visible seam)
    edge = np.exp(-((hw - 0.55) / 0.07) ** 2) * (0.15 if key == 'board' else 0.35)
    img = img * (1 - edge[..., None]) + pore * edge[..., None]
    # pores: short dashes along the grain
    pr = (rng.random((H, W)) > 0.9962).astype(np.float64)
    pr = np.clip(warp(gaussian_filter(pr, (0.45, 4.5)) * 10), 0, 1) * (0.35 if key == 'board' else 0.6)
    img = img * (1 - pr[..., None]) + pore * pr[..., None]
    # soft oiled sheen
    sh = noise(rng, 160, 380)
    img = img * (1 + 0.045 * sh[..., None])
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB')
    os.makedirs(OUT, exist_ok=True)
    im = im.resize((1024, 1024) if key == 'board' else (512, 512), Image.LANCZOS)
    im.save(os.path.join(OUT, f'wood-{key}.webp'), quality=84, method=6)

for i, k in enumerate(DESIGNS):
    render(k, 21 + i * 5)
    print(k)

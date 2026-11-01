#!/usr/bin/env python3
"""Procedural wood textures for the board designs: a slab of acacia-like hardwood seen along the grain — long flowing
streaks of darker heartwood, fine fibres and pores, a soft oiled sheen (no cartoon growth-ring contours).
python3 tools/gen_wood.py  → img/wood-<design>.webp"""
import os, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates

W, H = 1800, 1080
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img')
DESIGNS = {   # light, mid, dark, pore (RGB)
    'acacia':   ((214, 156, 94), (176, 112, 58), (88, 48, 24), (60, 30, 12)),
    'maple':    ((236, 212, 168), (214, 182, 132), (160, 120, 74), (120, 86, 50)),
    'walnut':   ((150, 104, 68), (108, 70, 44), (52, 32, 20), (28, 16, 9)),
    'rosewood': ((158, 80, 52), (118, 52, 34), (58, 20, 14), (30, 8, 5)),
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
    img = base * (1 - 0.72 * band[..., None]) + dark * 0.72 * band[..., None]
    # thin dark lines along the edges of the heartwood bands (the visible seam)
    edge = np.exp(-((hw - 0.55) / 0.07) ** 2) * 0.35
    img = img * (1 - edge[..., None]) + pore * edge[..., None]
    # pores: short dashes along the grain
    pr = (rng.random((H, W)) > 0.9962).astype(np.float64)
    pr = np.clip(warp(gaussian_filter(pr, (0.45, 4.5)) * 10), 0, 1) * 0.6
    img = img * (1 - pr[..., None]) + pore * pr[..., None]
    # soft oiled sheen
    sh = noise(rng, 160, 380)
    img = img * (1 + 0.045 * sh[..., None])
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB')
    os.makedirs(OUT, exist_ok=True)
    im.save(os.path.join(OUT, f'wood-{key}.webp'), quality=84, method=6)

for i, k in enumerate(DESIGNS):
    render(k, 21 + i * 5)
    print(k)

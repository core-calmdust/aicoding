# Noise and wood helpers for atlas/tools/xiangqi-tex.py (numpy; no browser).
import numpy as np
from scipy import ndimage
def rng(seed): return np.random.default_rng(seed)
def vnoise(h, w, sy, sx, seed):
    """smooth value noise, feature size sy x sx pixels (cubic upsampling of a random grid)"""
    gy, gx = int(np.ceil(h / sy)) + 4, int(np.ceil(w / sx)) + 4
    g = rng(seed).random((gy, gx)).astype(np.float32)
    yy = np.arange(h, dtype=np.float32) / sy + 1.5
    xx = np.arange(w, dtype=np.float32) / sx + 1.5
    # separable cubic: zoom rows then columns via map_coordinates on 1D grids
    Y, Xg = np.meshgrid(yy, xx, indexing='ij')
    return ndimage.map_coordinates(g, [Y, Xg], order=3, mode='wrap').astype(np.float32)
def fbm(h, w, sy, sx, seed, oct=4, gain=.5):
    s, a, tot = 0, 1, 0
    for o in range(oct):
        s = s + a * vnoise(h, w, max(1, sy / 2 ** o), max(1, sx / 2 ** o), seed + o * 17); tot += a; a *= gain
    return s / tot
def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def mixc(A, B, t):
    A = np.array(A, np.float32); B = np.array(B, np.float32); return A + (B - A) * t[..., None]
def save(arr, path, q=88, lossless=False):
    from PIL import Image
    a = np.clip(arr, 0, 255).astype(np.uint8)
    im = Image.fromarray(a)
    im.save(path, 'WEBP', quality=q, method=6, lossless=lossless)
    import os; print(path.split('/')[-1], a.shape, os.path.getsize(path) // 1024, 'KB')

# Writes the hex 3D boards' pictures (images/atlas/hex3d/*.webp), 2026-11-15.
#   python3 atlas/tools/hex-tex.py [name …]          (numpy, scipy, Pillow)
# Every picture tiles seamlessly (1024²): the tiles take it with a random offset and turn (atlas/models/hex.js), the frame across
# its top and sides. tile-<look> · frame-<look>, each with a "-m" map: R height, G roughness, B metalness.
#   basalt 玄武岩の柱 · honey 蜂の巣 · circuit 回路基板 · glass ステンドグラス · teak 北欧チーク (the marquetry board is procedural)
import os, sys
import numpy as np
from scipy import ndimage
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from xqtex_lib import smooth, save
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'images', 'atlas', 'hex3d')
W = 1024

def pnoise(k, seed, ky=None):
    """periodic value noise: a k × ky random grid, cubic, wrapping → tiles seamlessly over W × W"""
    ky = ky or k
    g = np.random.default_rng(seed).random((ky, k)).astype(np.float32)
    y = (np.arange(W, dtype=np.float32) + .5) / W * ky - .5; x = (np.arange(W, dtype=np.float32) + .5) / W * k - .5
    Y, X = np.meshgrid(y, x, indexing='ij')
    return ndimage.map_coordinates(g, [Y, X], order=3, mode='grid-wrap').astype(np.float32)
def pfbm(k, seed, oct=5, ky=None, gain=.5):
    s, a, t = 0, 1, 0
    for o in range(oct):
        s = s + a * pnoise(k * 2 ** o, seed + 31 * o, (ky or k) * 2 ** o); t += a; a *= gain
    return s / t
def blur(a, s): return ndimage.gaussian_filter(a, s, mode='wrap')
def C(c): return np.array(c, np.float32)[None, None, :]
def mix(A, B, t): return C(A) + (C(B) - C(A)) * t[..., None]
def mmap(rough, metal, hgt):
    F = lambda v: np.broadcast_to(np.asarray(v, np.float32), (W, W))
    rough, metal, hgt = F(rough), F(metal), F(hgt)
    return np.stack([128 + np.clip(hgt, -1, 1) * 127, np.clip(rough, 0, 1) * 255, np.clip(metal, 0, 1) * 255], -1)
def put(name, rgb, m):
    os.makedirs(OUT, exist_ok=True)
    save(rgb, os.path.join(OUT, name + '.webp'), 88); save(m, os.path.join(OUT, name + '-m.webp'), 90)
def norm(a): a = a - a.min(); return a / max(1e-6, a.max())
def spots(seed, n, r0, r1):
    """round pits (vesicles / bubbles), periodic: a mask 0..1"""
    R = np.random.default_rng(seed); m = np.zeros((W, W), np.float32)
    yy, xx = np.mgrid[0:W, 0:W].astype(np.float32)
    for _ in range(n):
        cx, cy, r = R.random() * W, R.random() * W, r0 + (r1 - r0) * R.random() ** 2
        x0, x1, y0, y1 = int(cx - r - 2), int(cx + r + 3), int(cy - r - 2), int(cy + r + 3)
        for oy in (-W, 0, W):
            for ox in (-W, 0, W):
                a0, a1, b0, b1 = max(0, x0 + ox), min(W, x1 + ox), max(0, y0 + oy), min(W, y1 + oy)
                if a0 >= a1 or b0 >= b1: continue
                d = np.hypot(xx[b0:b1, a0:a1] - cx - ox, yy[b0:b1, a0:a1] - cy - oy) / r
                m[b0:b1, a0:a1] = np.maximum(m[b0:b1, a0:a1], np.clip(1 - d, 0, 1) ** .6)
    return m

# ---------- 玄武岩 (basalt: Giant's Causeway columns) ----------
def basalt():
    n = pfbm(6, 11); f = pfbm(40, 12, 4); ves = spots(13, 900, 1.5, 5)
    t = n * .5 + f * .5
    col = mix((52, 54, 58), (92, 92, 94), smooth(.25, .85, t))
    col = col * (1 - .35 * ves[..., None]) + C((120, 92, 70)) * (smooth(.62, .8, pfbm(10, 14)) * .22)[..., None]   # rusty weathering
    hgt = (f - .5) * .5 - ves * .7
    put('tile-basalt', col, mmap(.82 + f * .1, 0, hgt))
    n = pfbm(4, 21); f = pfbm(32, 22, 4); ves = spots(23, 700, 1.5, 4)
    col = mix((28, 29, 33), (58, 58, 62), smooth(.2, .9, n * .6 + f * .4)) * (1 - .3 * ves[..., None])
    put('frame-basalt', col, mmap(.86, 0, (f - .5) * .6 - ves * .6))

# ---------- 蜂の巣 (honeycomb: wax caps, a pine hive frame) ----------
def honey():
    n = pfbm(5, 31); f = pfbm(48, 32, 3); cr = blur(pfbm(90, 33, 2), 1)
    t = n * .7 + f * .3
    col = mix((214, 150, 40), (252, 214, 120), smooth(.2, .9, t))
    col = col * (1 - .08 * smooth(.55, .75, cr)[..., None])
    put('tile-honey', col, mmap(.38 + f * .2, 0, (f - .5) * .4 + (cr - .5) * .3))
    # pine: soft grain along x, a few knots' rings
    y = (np.arange(W, dtype=np.float32) / W)[:, None] * np.ones((1, W), np.float32)
    warp = pfbm(2, 41) * 1.4 + pfbm(8, 42, 3) * .3
    ring = np.sin((y * 14 + warp) * 2 * np.pi) * .5 + .5
    fib = pfbm(6, 43, 3, ky=64)
    t = np.clip(ring ** 3 * .55 + (fib - .5) * .5 + .3, 0, 1)
    col = mix((226, 186, 128), (176, 120, 62), t)
    put('frame-honey', col, mmap(.6, 0, (fib - .5) * .4 - ring ** 3 * .3))

# ---------- 回路基板 (circuit board: gold pads, green solder mask with traces) ----------
def circuit():
    f = pfbm(80, 51, 3); br = pfbm(256, 52, 2, ky=8)
    col = mix((196, 150, 62), (250, 214, 132), smooth(.2, .9, f * .5 + br * .5))
    put('tile-circuit', col, mmap(.22 + f * .15, 1, (br - .5) * .15))
    # the frame: solder mask green, copper traces under it on a 32-px lattice (straight and 45°), vias, silkscreen ticks
    R = np.random.default_rng(53); g = 32; tr = np.zeros((W, W), np.float32); via = np.zeros((W, W), np.float32)
    from PIL import Image, ImageDraw
    im = Image.new('L', (W * 3, W * 3), 0); d = ImageDraw.Draw(im); iv = Image.new('L', (W * 3, W * 3), 0); dv = ImageDraw.Draw(iv)
    for _ in range(120):
        x, y = R.integers(0, W // g) * g, R.integers(0, W // g) * g; pts = [(x, y)]
        for _ in range(R.integers(2, 6)):
            dx, dy = [(1, 0), (0, 1), (1, 1), (1, -1), (-1, 0), (0, -1)][R.integers(0, 6)]; L = R.integers(2, 8) * g
            x, y = x + dx * L, y + dy * L; pts.append((x, y))
        wd = int(R.choice([4, 6, 10]))
        for ox in (0, W, 2 * W):
            for oy in (0, W, 2 * W):
                P = [(px + ox, py + oy) for px, py in pts]
                d.line(P, fill=255, width=wd, joint='curve')
                for px, py in (P[0], P[-1]): dv.ellipse((px - 9, py - 9, px + 9, py + 9), fill=255)
    tr = np.asarray(im, np.float32)[W:2 * W, W:2 * W] / 255; via = np.asarray(iv, np.float32)[W:2 * W, W:2 * W] / 255
    # fold the overflow back (the lines were drawn on a 3 × 3 sheet): wrap by summing the nine tiles
    T9 = np.asarray(im, np.float32) / 255; V9 = np.asarray(iv, np.float32) / 255
    tr = np.clip(sum(T9[a * W:(a + 1) * W, b * W:(b + 1) * W] for a in range(3) for b in range(3)), 0, 1)
    via = np.clip(sum(V9[a * W:(a + 1) * W, b * W:(b + 1) * W] for a in range(3) for b in range(3)), 0, 1)
    tr = blur(tr, .8); via = blur(via, .6)
    n = pfbm(6, 54, 3)
    col = mix((14, 72, 40), (24, 104, 58), n) + C((40, 70, 30)) * tr[..., None] * .55
    col = col * (1 - via[..., None]) + C((214, 176, 92)) * via[..., None]
    put('frame-circuit', col, mmap(.32 - via * .1, via, tr * .35 + via * .2))

# ---------- ステンドグラス (cathedral glass, a lead frame) ----------
def glass():
    st = pfbm(3, 61, 4, ky=14)   # streaks along x
    seeds = spots(62, 500, 1, 3.5); wav = pfbm(10, 63, 3)
    t = st * .7 + wav * .3
    col = mix((150, 150, 150), (255, 255, 255), smooth(.15, .85, t)) * (1 - .15 * seeds[..., None])
    put('tile-glass', col, mmap(.08 + wav * .08, 0, (wav - .5) * .5 + (st - .5) * .4))
    n = pfbm(5, 71); f = pfbm(60, 72, 3)
    col = mix((56, 60, 64), (104, 108, 110), smooth(.25, .85, n * .6 + f * .4)) + C((30, 46, 40)) * smooth(.65, .85, pfbm(8, 73))[..., None] * .5   # patina
    put('frame-glass', col, mmap(.55 + f * .15, .7, (f - .5) * .35))

# ---------- 北欧チーク (Danish teak frame, pale oak tiles) ----------
def wood(seed, A, B, rings):
    y = (np.arange(W, dtype=np.float32) / W)[:, None] * np.ones((1, W), np.float32)
    warp = pfbm(2, seed) * 1.2 + pfbm(6, seed + 1, 3) * .25
    ring = np.sin((y * rings + warp) * 2 * np.pi) * .5 + .5
    fib = pfbm(5, seed + 2, 3, ky=96)
    t = np.clip(ring ** 2.5 * .5 + (fib - .5) * .55 + .3, 0, 1)
    return mix(A, B, t), fib, ring
def teak():
    col, fib, ring = wood(81, (238, 222, 192), (200, 170, 126), 10)
    put('tile-teak', col, mmap(.5, 0, (fib - .5) * .35 - ring ** 2.5 * .2))
    col, fib, ring = wood(91, (172, 102, 54), (104, 54, 24), 18)
    put('frame-teak', col, mmap(.42, 0, (fib - .5) * .4 - ring ** 2.5 * .25))

ALL = { 'basalt': basalt, 'honey': honey, 'circuit': circuit, 'glass': glass, 'teak': teak }
if __name__ == '__main__':
    for k in (sys.argv[1:] or ALL): ALL[k]()

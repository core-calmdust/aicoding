# Writes the Connect Four 3D stands' pictures (images/atlas/c43d/*.webp), 2026-11-15.
#   python3 atlas/tools/c4-tex.py [name …]          (numpy, scipy, Pillow)
# Each look: tray-<look> (the tray's rim and walls), floor-<look> (the tray's floor), spine-<look> (the spine across the tray);
# every picture tiles seamlessly (1024²) and has a "-m" map: R height, G roughness, B metalness.
#   steam 銅と真鍮 · ice 氷と水晶 · tansu 欅と黒鉄 · pueblo 砂岩とトルコ石 · diner 50年代ダイナー   (the leather stand is procedural)
import os, sys, importlib.util
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('hextex', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hex-tex.py')); H = importlib.util.module_from_spec(spec); spec.loader.exec_module(H)
from xqtex_lib import smooth
W = H.W; pfbm, blur, C, mix, mmap, spots = H.pfbm, H.blur, H.C, H.mix, H.mmap, H.spots
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
H.OUT = os.path.join(ROOT, 'images', 'atlas', 'c43d')
put = H.put

def rivets(n, step, r, seed=0):
    """a grid of domed rivets every `step` px (periodic): height 0..1"""
    yy, xx = np.mgrid[0:W, 0:W].astype(np.float32)
    dx = (xx % step) - step / 2; dy = (yy % step) - step / 2; d = np.hypot(dx, dy) / r
    return np.clip(1 - d * d, 0, 1) ** .5
def seams(step, width):
    yy, xx = np.mgrid[0:W, 0:W].astype(np.float32)
    a = np.minimum(xx % step, step - xx % step); b = np.minimum(yy % step, step - yy % step)
    return np.clip(1 - np.minimum(a, b) / width, 0, 1)

# ---------- 銅と真鍮 (steampunk: riveted copper sheet, oiled iron spine, a brass checker floor) ----------
def steam():
    n = pfbm(6, 101); f = pfbm(80, 102, 3); pat = smooth(.6, .82, pfbm(8, 103))   # verdigris blooms
    sm = seams(256, 3); rv = rivets(4, 32, 6) * (seams(256, 16) > .01)
    col = mix((150, 74, 40), (212, 124, 74), smooth(.2, .9, n * .6 + f * .4))
    col = col * (1 - .25 * sm[..., None]) * (1 - .65 * pat[..., None]) + C((64, 156, 128)) * (pat * .65)[..., None]
    col = col + C((60, 40, 30)) * rv[..., None]
    put('tray-steam', col, mmap(.32 + pat * .4, .9 - pat * .7, rv * .9 - sm * .6 + (f - .5) * .2))
    f = pfbm(60, 104, 3); yy, xx = np.mgrid[0:W, 0:W]; chk = ((xx // 128 + yy // 128) % 2).astype(np.float32)
    col = mix((120, 92, 44), (190, 150, 80), chk * .7 + f * .3)
    put('floor-steam', col, mmap(.4 + f * .2, .85, (f - .5) * .3 - seams(128, 2) * .5))
    f = pfbm(5, 105, 4); g = pfbm(120, 106, 2, ky=8)
    col = mix((74, 66, 60), (138, 126, 112), smooth(.2, .85, f * .6 + g * .4))
    put('spine-steam', col, mmap(.38 + g * .2, .8, (g - .5) * .3))

# ---------- 氷と水晶 (ice: frosted ice blocks, packed snow, a clear crystal spine) ----------
def ice():
    n = pfbm(4, 111); cr = pfbm(18, 112, 3); fr = pfbm(160, 113, 2); bub = spots(114, 400, 1, 4)
    crack = smooth(.48, .5, cr) - smooth(.5, .52, cr)
    col = mix((150, 196, 226), (236, 248, 255), smooth(.2, .9, n * .5 + fr * .5)) + C((255, 255, 255)) * (np.abs(crack) * .6 + bub * .3)[..., None]
    put('tray-ice', col, mmap(.12 + fr * .3, 0, (fr - .5) * .3 + np.abs(crack) * .5))
    s = pfbm(30, 115, 3); sp = spots(116, 1400, .6, 1.8)
    col = mix((214, 228, 240), (252, 254, 255), smooth(.3, .8, s)) + C((255, 255, 255)) * sp[..., None] * .3
    put('floor-ice', col, mmap(.85, 0, (s - .5) * .6))
    n = pfbm(3, 117, 3, ky=12); col = mix((120, 176, 214), (220, 240, 252), smooth(.2, .9, n))
    put('spine-ice', col, mmap(.06, 0, (n - .5) * .2))

# ---------- 欅と黒鉄 (tansu: zelkova grain, black iron fittings, a tatami floor) ----------
def wood(seed, A, B, rings, warpk=1.2):
    y = (np.arange(W, dtype=np.float32) / W)[:, None] * np.ones((1, W), np.float32)
    warp = pfbm(2, seed) * warpk + pfbm(6, seed + 1, 3) * .25
    ring = np.sin((y * rings + warp) * 2 * np.pi) * .5 + .5; fib = pfbm(5, seed + 2, 3, ky=96)
    t = np.clip(ring ** 2.5 * .55 + (fib - .5) * .55 + .3, 0, 1)
    return mix(A, B, t), fib, ring
def tansu():
    col, fib, ring = wood(121, (206, 132, 70), (128, 66, 30), 14, 2.0)
    put('tray-tansu', col, mmap(.36, 0, (fib - .5) * .4 - ring ** 2.5 * .25))
    yy, xx = np.mgrid[0:W, 0:W].astype(np.float32)
    weave = (np.sin(xx / W * 2 * np.pi * 96) * .5 + .5) * (np.sin(yy / W * 2 * np.pi * 8) * .25 + .75); f = pfbm(40, 122, 3, ky=4)
    col = mix((150, 160, 100), (212, 206, 150), weave * .6 + f * .4)
    put('floor-tansu', col, mmap(.8, 0, weave * .6 - .3))
    n = pfbm(6, 123, 4); col = mix((18, 18, 20), (52, 50, 50), smooth(.3, .85, n))
    put('spine-tansu', col, mmap(.5, .7, (n - .5) * .4))

# ---------- 砂岩とトルコ石 (pueblo: layered sandstone, a turquoise-studded floor, silver) ----------
def pueblo():
    y = (np.arange(W, dtype=np.float32) / W)[:, None] * np.ones((1, W), np.float32)
    lay = np.sin((y * 9 + pfbm(3, 131) * .8) * 2 * np.pi) * .5 + .5; g = pfbm(90, 132, 3)
    col = mix((214, 150, 100), (238, 196, 150), smooth(.2, .9, lay * .6 + g * .4)) - C((40, 30, 20)) * smooth(.75, .95, pfbm(12, 133))[..., None] * .5
    put('tray-pueblo', col, mmap(.9, 0, (g - .5) * .6 + (lay - .5) * .3))
    f = pfbm(30, 134, 3); tq = spots(135, 70, 14, 34); vein = smooth(.46, .5, pfbm(20, 136, 3)) - smooth(.5, .54, pfbm(20, 136, 3))
    col = mix((184, 116, 76), (214, 150, 100), f)
    col = col * (1 - tq[..., None]) + mix((40, 160, 160), (90, 210, 196), pfbm(40, 137, 2))[..., :] * tq[..., None] - C((60, 50, 40)) * (np.abs(vein) * tq)[..., None]
    put('floor-pueblo', col, mmap(.7 - tq * .4, 0, tq * .7 + (f - .5) * .3))
    n = pfbm(4, 138, 4); col = mix((150, 70, 40), (190, 104, 66), smooth(.2, .9, n))
    put('spine-pueblo', col, mmap(.85, 0, (n - .5) * .5))

# ---------- 50年代ダイナー (diner: tufted red vinyl, a black-and-white check floor, a chrome spine) ----------
def diner():
    yy, xx = np.mgrid[0:W, 0:W].astype(np.float32); st = 128
    dx = (xx % st) - st / 2; dy = (yy % st) - st / 2; d = np.hypot(dx, dy) / (st * .5)
    puff = np.clip(1 - d, 0, 1) ** .6; btn = np.clip(1 - d * 8, 0, 1)
    f = pfbm(60, 141, 2)
    col = mix((120, 14, 22), (214, 40, 44), puff * .8 + f * .2) * (1 - .4 * btn[..., None])
    put('tray-diner', col, mmap(.3 + (1 - puff) * .2, 0, puff - .5 - btn * .6))
    chk = ((xx // 128 + yy // 128) % 2).astype(np.float32); f = pfbm(40, 142, 3)
    col = mix((24, 24, 28), (238, 236, 228), chk) * (.92 + .08 * f[..., None])
    put('floor-diner', col, mmap(.18 + f * .1, 0, -seams(128, 2) * .4))
    g = pfbm(4, 143, 2, ky=256); col = mix((150, 156, 164), (236, 240, 246), g)
    put('spine-diner', col, mmap(.12, 1, (g - .5) * .1))

ALL = { 'steam': steam, 'ice': ice, 'tansu': tansu, 'pueblo': pueblo, 'diner': diner }
if __name__ == '__main__':
    for k in (sys.argv[1:] or ALL): ALL[k]()

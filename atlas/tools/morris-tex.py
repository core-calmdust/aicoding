# Writes the morris 3D boards' pictures (images/atlas/morris3d/*.webp), 2026-11-15.
#   python3 atlas/tools/morris-tex.py [name …]          (numpy, scipy, Pillow)
# field-<look>: the playing field (1024², planar, its edge = the field's edge) · frame-<look>: the frame and body (tiles seamlessly),
# each with a "-m" map (R height, G roughness, B metalness).
#   roman 古代ローマの石段 · viking ヴァイキングの樫 · garden 庭の芝と敷石 · cloister 回廊の粘板岩 · bauhaus バウハウス
import os, sys, math, importlib.util
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('hextex', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hex-tex.py')); H = importlib.util.module_from_spec(spec); spec.loader.exec_module(H)
from xqtex_lib import smooth
W = H.W; pfbm, blur, C, mix, mmap, spots = H.pfbm, H.blur, H.C, H.mix, H.mmap, H.spots
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
H.OUT = os.path.join(ROOT, 'images', 'atlas', 'morris3d'); put = H.put
yy, xx = np.mgrid[0:W, 0:W].astype(np.float32)
def mask(fn, b=1.0):
    im = Image.new('L', (W, W), 0); fn(ImageDraw.Draw(im)); a = np.asarray(im, np.float32) / 255
    from scipy import ndimage; return ndimage.gaussian_filter(a, b) if b else a
def wood(seed, A, B, rings, warpk=1.2):
    y = (np.arange(W, dtype=np.float32) / W)[:, None] * np.ones((1, W), np.float32)
    warp = pfbm(2, seed) * warpk + pfbm(6, seed + 1, 3) * .25
    ring = np.sin((y * rings + warp) * 2 * np.pi) * .5 + .5; fib = pfbm(5, seed + 2, 3, ky=96)
    t = np.clip(ring ** 2.5 * .55 + (fib - .5) * .55 + .3, 0, 1)
    return mix(A, B, t), fib, ring

# ---------- 古代ローマの石段 (roman: travertine with pores, a red tessera border; the frame: weathered travertine blocks) ----------
def roman():
    n = pfbm(4, 201, 4); lay = np.sin((yy / W * 7 + pfbm(3, 202) * .8) * 2 * np.pi) * .5 + .5; pores = spots(203, 900, 1, 5) * (lay > .55)
    col = mix((214, 200, 172), (238, 228, 206), smooth(.2, .9, n * .6 + lay * .4)) * (1 - .35 * pores[..., None])
    def border(d):
        s = W / 8.0
        for k in range(0, W, int(s * .14)):
            for (a, b) in ((k, s * .06), (k, W - s * .2), (s * .06, k), (W - s * .2, k)): d.rectangle((a, b, a + s * .11, b + s * .11), fill=255)
    bm = mask(border, .6)
    col = col * (1 - bm[..., None]) + C((168, 52, 36)) * bm[..., None]
    put('field-roman', col, mmap(.7 - bm * .2, 0, (n - .5) * .3 - pores * .6 + bm * .1))
    n = pfbm(5, 211, 4); p2 = spots(212, 700, 1, 4); sm = H.seams if hasattr(H, 'seams') else None
    a = np.minimum(xx % 512, 512 - xx % 512); joint = np.clip(1 - a / 3, 0, 1)
    col = mix((190, 172, 140), (222, 208, 180), smooth(.2, .9, n)) * (1 - .3 * p2[..., None]) * (1 - .3 * joint[..., None])
    put('frame-roman', col, mmap(.85, 0, (n - .5) * .4 - p2 * .5 - joint * .5))

# ---------- ヴァイキングの樫 (viking: a dark oak field, knotwork border burnt in; the frame: oak with iron bands) ----------
def viking():
    col, fib, ring = wood(221, (150, 104, 62), (86, 56, 30), 9)
    def knot(d):
        s = W / 8.0; w = int(s * .035)
        for off in (s * .12, s * .2):
            d.rectangle((off, off, W - off, W - off), outline=255, width=w)
        for k in np.arange(s * .16, W - s * .16, s * .32):   # a braid: interleaved arcs between the two lines
            for (x, y, a0) in ((k, s * .16, 0), (k, W - s * .16, 180), (s * .16, k, 270), (W - s * .16, k, 90)):
                d.arc((x - s * .1, y - s * .06, x + s * .1, y + s * .06), a0, a0 + 180, fill=255, width=w)
    km = mask(knot, .8)
    col = col * (1 - .6 * km[..., None])
    put('field-viking', col, mmap(.5 + km * .2, 0, (fib - .5) * .35 - ring ** 2.5 * .2 - km * .5))
    col, fib, ring = wood(231, (110, 74, 42), (52, 32, 18), 14)
    put('frame-viking', col, mmap(.55, 0, (fib - .5) * .4 - ring ** 2.5 * .3))

# ---------- 庭の芝と敷石 (garden: a lawn field, the lines as stone paths drawn in the model; the frame: low box hedge-green painted wood) ----------
def garden():
    g1 = pfbm(160, 241, 2); g2 = pfbm(40, 242, 3); cl = smooth(.55, .8, pfbm(6, 243, 3))
    col = mix((58, 112, 40), (118, 168, 70), smooth(.2, .9, g1 * .6 + g2 * .4)) + C((40, 30, -10)) * (cl * .25)[..., None]
    daisy = spots(244, 160, 1, 2.2); col = col * (1 - daisy[..., None]) + C((250, 250, 240)) * daisy[..., None]
    put('field-garden', col, mmap(.95, 0, (g1 - .5) * .7))
    n = pfbm(5, 251, 4); col = mix((172, 168, 156), (210, 206, 194), smooth(.2, .9, n)) * (1 - .25 * spots(252, 500, 1, 3)[..., None])
    put('frame-garden', col, mmap(.9, 0, (n - .5) * .5))

# ---------- 回廊の粘板岩 (cloister: grey-blue slate, chalky scratches and a mason's mark; the frame: dark oak pew wood) ----------
def cloister():
    n = pfbm(4, 261, 4); lam = pfbm(2, 262, 3, ky=24); sc = np.zeros((W, W), np.float32)
    R = np.random.default_rng(263); im = Image.new('L', (W, W), 0); d = ImageDraw.Draw(im)
    for _ in range(140):
        x, y, a, L = R.random() * W, R.random() * W, R.random() * math.pi, 20 + R.random() * 90
        d.line((x, y, x + math.cos(a) * L, y + math.sin(a) * L), fill=int(80 + R.random() * 120), width=1)
    sc = blur(np.asarray(im, np.float32) / 255, .5)
    col = mix((58, 64, 72), (98, 104, 112), smooth(.2, .9, n * .6 + lam * .4)) + C((120, 120, 118)) * (sc * .5)[..., None]
    put('field-cloister', col, mmap(.8 - lam * .2, 0, (lam - .5) * .3 - sc * .3))
    col, fib, ring = wood(271, (92, 64, 40), (44, 28, 16), 12)
    put('frame-cloister', col, mmap(.5, 0, (fib - .5) * .4))

# ---------- バウハウス (bauhaus: white lacquer field, primary-colour blocks in the corners; the frame: black lacquer) ----------
def bauhaus():
    n = pfbm(6, 281, 3)
    col = mix((236, 234, 228), (248, 246, 240), n)
    s = W / 8.0
    def blk(d, rgb):
        pass
    for (x0, y0, x1, y1, c) in ((0, 0, s * .9, s * .9, (214, 40, 40)), (W - s * .9, 0, W, s * .45, (240, 196, 30)), (0, W - s * .45, s * .45, W, (30, 70, 170)), (W - s * .9, W - s * .9, W, W, (24, 24, 26))):
        m = ((xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)).astype(np.float32); col = col * (1 - m[..., None]) + C(c) * m[..., None]
    put('field-bauhaus', col, mmap(.2, 0, (n - .5) * .05))
    n = pfbm(4, 291, 3); col = mix((14, 14, 16), (34, 34, 38), n)
    put('frame-bauhaus', col, mmap(.18, 0, (n - .5) * .05))

ALL = { 'roman': roman, 'viking': viking, 'garden': garden, 'cloister': cloister, 'bauhaus': bauhaus }
if __name__ == '__main__':
    for k in (sys.argv[1:] or ALL): ALL[k]()

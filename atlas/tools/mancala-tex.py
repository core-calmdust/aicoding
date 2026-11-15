# Writes the mancala 3D boards' pictures (images/atlas/mancala3d/*.webp), 2026-11-15.
#   python3 atlas/tools/mancala-tex.py [name …]          (numpy, scipy, Pillow)
# top-<look>: the board's top, planar over the whole board (2048 × 800 = 11 × 4.3 units; the pits are cut through it), with a "-m"
# map (R height, G roughness, B metalness).   baobab 彫りのアフリカ材 · sand 砂の盤 · copper 打ち出しの銅盆 · celadon 青磁 · concrete コンクリートと真鍮
import os, sys, math, importlib.util
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('hextex', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hex-tex.py')); H = importlib.util.module_from_spec(spec); spec.loader.exec_module(H)
from xqtex_lib import vnoise, fbm, smooth, save
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'images', 'atlas', 'mancala3d')
TW, TH = 2048, 800; K = TW / 11.0
def C(c): return np.array(c, np.float32)[None, None, :]
def mix(A, B, t): return C(A) + (C(B) - C(A)) * t[..., None]
def mmap(rough, metal, hgt):
    F = lambda v: np.broadcast_to(np.asarray(v, np.float32), (TH, TW))
    return np.stack([128 + np.clip(F(hgt), -1, 1) * 127, np.clip(F(rough), 0, 1) * 255, np.clip(F(metal), 0, 1) * 255], -1)
def put(name, rgb, m):
    os.makedirs(OUT, exist_ok=True); save(rgb, os.path.join(OUT, name + '.webp'), 88); save(m, os.path.join(OUT, name + '-m.webp'), 90)
def blur(a, s): from scipy import ndimage; return ndimage.gaussian_filter(a, s)
yy, xx = np.mgrid[0:TH, 0:TW].astype(np.float32)
UX, UZ = xx / K - 5.5, yy / K - 2.15       # board units (x across, z down the picture)
def edge_dist():   # distance (units) from the rounded-rectangle edge, inwards
    hx, hz, r = 5.5, 2.15, .5
    qx, qz = np.abs(UX) - (hx - r), np.abs(UZ) - (hz - r)
    out = np.hypot(np.maximum(qx, 0), np.maximum(qz, 0)) + np.minimum(np.maximum(qx, qz), 0) - r
    return -out
def mask_draw(fn, blur_px=1.2):
    im = Image.new('L', (TW, TH), 0); fn(ImageDraw.Draw(im)); a = np.asarray(im, np.float32) / 255
    return blur(a, blur_px) if blur_px else a
U = lambda v: v * K; PX = lambda x: (x + 5.5) * K; PZ = lambda z: (z + 2.15) * K

# ---------- 彫りのアフリカ材 (baobab: dark carved hardwood, a band of zigzag / adinkra-like carving round the top) ----------
def baobab():
    n = fbm(TH, TW, 300, 900, 1, 4); fib = fbm(TH, TW, 6, 260, 2, 3)
    t = np.clip(n * .5 + fib * .5, 0, 1)
    col = mix((54, 30, 18), (110, 66, 36), smooth(.2, .9, t))
    e = edge_dist()
    def carve(d):
        # a zigzag band 0.12–0.36 units inside the edge, triangles alternating; dots between the pit rows
        step = U(.32)
        for x0 in np.arange(0, TW, step):
            for (y0, sgn) in ((U(.14), 1), (TH - U(.14), -1)):
                d.polygon([(x0, y0), (x0 + step / 2, y0 + sgn * U(.2)), (x0 + step, y0)], fill=255)
        for x in np.linspace(PX(-3.6), PX(3.6), 23): d.ellipse((x - U(.04), PZ(0) - U(.04), x + U(.04), PZ(0) + U(.04)), fill=255)
        for sx in (-1, 1):   # a sankofa-like spiral pair in each end panel (between the store and the edge: lightly)
            cx, cz = PX(sx * 3.9), PZ(0)
            for k in range(3): d.arc((cx - U(.1 + k * .06), cz - U(.1 + k * .06), cx + U(.1 + k * .06), cz + U(.1 + k * .06)), 0, 300, fill=255, width=int(U(.02)))
    cm = mask_draw(carve, 1.5) * (e > .08)
    col = col * (1 - .45 * cm[..., None]) + C((20, 10, 6)) * (cm * .2)[..., None]
    hgt = (fib - .5) * .3 - cm * .8
    put('top-baobab', col, mmap(.42 + cm * .3, 0, hgt))

# ---------- 砂の盤 (sand: the pits scooped in packed desert sand, wind ripples, a few small shells) ----------
def sand():
    rip = np.sin((UX * 3.2 + UZ * 1.1 + fbm(TH, TW, 120, 240, 11, 3) * 2.2) * 2 * np.pi) * .5 + .5
    g = vnoise(TH, TW, 1.4, 1.4, 12); gr = fbm(TH, TW, 30, 30, 13, 3)
    col = mix((206, 168, 112), (238, 210, 160), smooth(.15, .9, rip * .35 + gr * .45 + g * .2))
    put('top-sand', col, mmap(.95, 0, (rip - .5) * .45 + (g - .5) * .4))

# ---------- 打ち出しの銅盆 (copper: a hammered Ottoman copper tray, an engraved tulip / vine border) ----------
def copper():
    R = np.random.default_rng(21); dent = np.zeros((TH, TW), np.float32)
    for _ in range(2600):
        x, y, r = R.random() * TW, R.random() * TH, U(.05 + R.random() * .06)
        x0, x1, y0, y1 = int(max(0, x - r)), int(min(TW, x + r + 1)), int(max(0, y - r)), int(min(TH, y + r + 1))
        d = np.hypot(xx[y0:y1, x0:x1] - x, yy[y0:y1, x0:x1] - y) / r; dent[y0:y1, x0:x1] = np.minimum(dent[y0:y1, x0:x1], -(np.clip(1 - d, 0, 1) ** 2))
    n = fbm(TH, TW, 200, 200, 22, 3)
    col = mix((168, 82, 44), (226, 138, 84), smooth(.2, .9, n * .85 + (dent + 1) * .15))
    e = edge_dist()
    def engrave(d):
        w = int(U(.016))
        d.rounded_rectangle((U(.18), U(.18), TW - U(.18), TH - U(.18)), radius=U(.4), outline=255, width=w)
        d.rounded_rectangle((U(.3), U(.3), TW - U(.3), TH - U(.3)), radius=U(.3), outline=255, width=w)
        # a vine of tulips between the two lines, along the long sides
        for (yc, sgn) in ((U(.24), 1), (TH - U(.24), -1)):
            xs = np.arange(U(.6), TW - U(.6), U(.4))
            for i, x in enumerate(xs):
                d.arc((x - U(.2), yc - U(.05), x + U(.2), yc + U(.05)), 0 if i % 2 else 180, 180 if i % 2 else 360, fill=255, width=w)
                if i % 3 == 0: d.polygon([(x, yc - sgn * U(.0)), (x - U(.035), yc + sgn * U(.05)), (x, yc + sgn * U(.03)), (x + U(.035), yc + sgn * U(.05))], fill=255)
        d.line((PX(-3.6), PZ(0), PX(3.6), PZ(0)), fill=255, width=w)
        for sx in (-1, 1):
            cx, cz = PX(sx * 3.9), PZ(0)
            for k in range(8):
                a = k * math.pi / 4; d.ellipse((cx + math.cos(a) * U(.1) - U(.035), cz + math.sin(a) * U(.1) - U(.035), cx + math.cos(a) * U(.1) + U(.035), cz + math.sin(a) * U(.1) + U(.035)), outline=255, width=w)
    em = mask_draw(engrave, .8)
    col = col * (1 - .55 * em[..., None]) + C((60, 24, 10)) * (em * .25)[..., None]
    put('top-copper', col, mmap(.3 + n * .1 + em * .2, 1, dent * .6 - em * .5))

# ---------- 青磁 (celadon: a jade-green glaze with a fine crackle, thicker and greener in the hollows' rims) ----------
def celadon():
    from scipy import ndimage
    R = np.random.default_rng(31); pts = R.random((900, 2)) * [TW, TH]
    # crackle: the edges of a Voronoi of random points (distance to nearest − second nearest)
    from scipy.spatial import cKDTree
    tr = cKDTree(pts); q = np.stack([xx.ravel(), yy.ravel()], 1); d, _ = tr.query(q, k=2); dd = (d[:, 1] - d[:, 0]).reshape(TH, TW)
    crack = np.clip(1 - dd / 2.2, 0, 1)
    n = fbm(TH, TW, 260, 260, 32, 4); e = edge_dist()
    col = mix((126, 166, 140), (176, 206, 180), smooth(.2, .9, n)) * (1 - .1 * smooth(0, .3, e)[..., None] * 0) - C((50, 60, 50)) * (crack * .45)[..., None]
    put('top-celadon', col, mmap(.12, 0, -crack * .3 + (n - .5) * .2))

# ---------- コンクリートと真鍮 (concrete: smooth grey cast concrete, small air holes, a brass line between the rows) ----------
def concrete():
    n = fbm(TH, TW, 160, 160, 41, 5); f = vnoise(TH, TW, 2, 2, 42)
    R = np.random.default_rng(43); holes = np.zeros((TH, TW), np.float32)
    for _ in range(900):
        x, y, r = int(R.random() * TW), int(R.random() * TH), 1 + R.random() * 3.5
        x0, x1, y0, y1 = max(0, int(x - r - 1)), min(TW, int(x + r + 2)), max(0, int(y - r - 1)), min(TH, int(y + r + 2))
        dd = np.hypot(xx[y0:y1, x0:x1] - x, yy[y0:y1, x0:x1] - y) / r; holes[y0:y1, x0:x1] = np.maximum(holes[y0:y1, x0:x1], np.clip(1 - dd, 0, 1))
    col = mix((138, 138, 134), (190, 188, 182), smooth(.2, .9, n * .8 + f * .2)) * (1 - .45 * holes[..., None])
    def brass(d): d.line((PX(-3.7), PZ(0), PX(3.7), PZ(0)), fill=255, width=int(U(.03)))
    bm = mask_draw(brass, .8)
    col = col * (1 - bm[..., None]) + C((214, 176, 96)) * bm[..., None]
    put('top-concrete', col, mmap(.75 - bm * .55, bm, (n - .5) * .25 - holes * .6 + bm * .3))

ALL = { 'baobab': baobab, 'sand': sand, 'copper': copper, 'celadon': celadon, 'concrete': concrete }
if __name__ == '__main__':
    for k in (sys.argv[1:] or ALL): ALL[k]()

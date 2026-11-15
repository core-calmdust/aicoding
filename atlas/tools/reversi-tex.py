# Writes the reversi 3D boards' pictures (images/atlas/reversi3d/*.webp), 2026-11-15.
#   python3 atlas/tools/reversi-tex.py [name …] [--nomobile]       (numpy, scipy, Pillow; helpers: xqtex_*.py)
# Each board: field-<look> (the 8 × 8 playing field, 2048²) and frame-<look> (the bezel seen from above, 1024², planar: the
# whole square O × 2, the field's part unused), each with a "-m" map: R height (bump), G roughness, B metalness.
#   toy        昭和のおもちゃ   glossy moulded green plastic, the grid raised ribs, a cream plastic frame
#   ink        墨と和紙         washi paper, the grid brushed in sumi, a black lacquer frame with a red seal
#   moon       月と夜空         a night sky (stars, a faint milky way), the grid fine silver, a pewter frame
#   chocolate  チョコレート     a bar of chocolate: 8 × 8 squares parted by grooves, a frame of crinkled gold foil
#   pixel      ピクセル         pixel art: every square 12 × 12 pixels in two greens, the frame a pixel bevel
import os, sys, math
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from xqtex_lib import vnoise, fbm, smooth, save
from xqtex_field import f3
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'images', 'atlas', 'reversi3d')
S = 8.4; N = 8; CELL = S / N            # atlas/models/reversi.js: the field 8.4 wide, 8 cells
O = S / 2 + .55                         # the bezel's outer half-width
FW = 2048; FPX = FW / S                 # field picture
RW = 1024; RPX = RW / (2 * O)           # frame picture
SS = 2

def blur(a, s): return ndimage.gaussian_filter(a, s)
def fcoords():
    x = (np.arange(FW, dtype=np.float32) + .5) / FPX; return np.meshgrid(x, x)
def rcoords():
    x = (np.arange(RW, dtype=np.float32) + .5) / RPX - O; return np.meshgrid(x, x)
def mmap(rough, metal, hgt=None):
    return np.stack([128 + (hgt if hgt is not None else np.zeros_like(rough)) * 127, rough * 255, metal * 255], -1)
def put(name, rgb, m=None, q=88):
    save(rgb, os.path.join(OUT, name + '.webp'), q)
    if m is not None: save(m, os.path.join(OUT, name + '-m.webp'), 92)
def FP(x, y): return (x * FPX * SS, y * FPX * SS)
def fcanvas(): im = Image.new('L', (FW * SS, FW * SS), 0); return im, ImageDraw.Draw(im)
def fdone(im): return np.asarray(im.resize((FW, FW), Image.LANCZOS), np.float32) / 255
STARS = [(2, 2), (6, 2), (2, 6), (6, 6)]   # the four dots of an Othello board (at the corners of the centre 4 × 4)
def grid_mask(lw):
    im, d = fcanvas()
    for i in range(N + 1):
        t = i * CELL; w = max(1, round(lw * FPX * SS))
        d.line([FP(t, 0), FP(t, S)], fill=255, width=w); d.line([FP(0, t), FP(S, t)], fill=255, width=w)
    return fdone(im)
def star_mask(r):
    im, d = fcanvas()
    for (a, b) in STARS:
        x, y = a * CELL, b * CELL; d.ellipse([FP(x - r, y - r), FP(x + r, y + r)], fill=255)
    return fdone(im)
def frame_mask():
    """the bezel ring in the frame picture (1 on the ring, 0 over the field)"""
    X, Y = rcoords(); return ((np.maximum(np.abs(X), np.abs(Y)) > S / 2) * 1.0).astype(np.float32)

# ---------- 昭和のおもちゃ ----------
def toy_field():
    X, Y = fcoords(); h = w = FW
    base = np.array([18, 128, 70], np.float32)
    col = np.ones((h, w, 3), np.float32) * base * (1 + (vnoise(h, w, 3, 3, 3) - .5)[..., None] * .03)
    rib = grid_mask(.05); ribs = blur(rib, 3)                 # moulded ribs: a rounded ridge
    stars = star_mask(.07); sd = blur(stars, 2)
    hgt = np.clip(ribs * 1.6, 0, 1) * .8 + sd * .7
    col = col * (1 + np.clip(ribs, 0, 1)[..., None] * .18) + np.array([235, 232, 214], np.float32) * (rib * .0)[..., None]
    col = col * (1 - stars[..., None]) + np.array([228, 222, 196], np.float32) * stars[..., None]
    # a faint sink mark in the middle of each square (a cheap moulding) and the gate mark at one corner
    rough = np.full((h, w), .22, np.float32)
    return col, mmap(rough, np.zeros((h, w), np.float32), hgt)
def toy_frame():
    X, Y = rcoords(); h = w = RW; fm = frame_mask()
    col = np.ones((h, w, 3), np.float32) * np.array([238, 228, 204], np.float32) * (1 + (vnoise(h, w, 4, 4, 5) - .5)[..., None] * .03)
    # two moulded grooves round the frame, a raised label plate on the near side
    e = np.maximum(np.abs(X), np.abs(Y)); g = np.exp(-((e - (S / 2 + .14)) / .012) ** 2) + np.exp(-((e - (O - .12)) / .012) ** 2)
    col *= (1 - g[..., None] * .2)
    plate = ((np.abs(X) < 1.1) & (np.abs(Y - (S / 2 + .3)) < .14)).astype(np.float32); plate = blur(plate, 1.5)
    col = col * (1 - plate[..., None] * .1) + np.array([196, 40, 40], np.float32) * (plate * .0)[..., None]
    hgt = -g * .5 + plate * .5
    return col, mmap(np.full((h, w), .3, np.float32), np.zeros((h, w), np.float32), hgt)

# ---------- 墨と和紙 ----------
def washi(X, Y, base):
    h, w = X.shape
    fib = np.zeros((h, w), np.float32); R = np.random.default_rng(7)
    im = Image.new('L', (w, h), 0); d = ImageDraw.Draw(im)
    for k in range(2600):   # kozo fibres: long thin wandering strands
        x, y = R.uniform(0, w), R.uniform(0, h); a = R.uniform(0, 6.283); L = R.uniform(20, 120); pts = []
        for i in range(10):
            a += R.normal(0, .25); x += math.cos(a) * L / 10; y += math.sin(a) * L / 10; pts.append((x, y))
        d.line(pts, fill=int(R.uniform(60, 160)), width=1)
    fib = np.asarray(im, np.float32) / 255
    cl = f3(X, Y, np.zeros_like(X), .5, .5, .5, 3, 4)
    col = np.array(base, np.float32)[None, None, :] * (1 + (cl - .5)[..., None] * .07 - fib[..., None] * .05)
    return col, fib, cl
def brush_line(d, p0, p1, w0, R, dry=True):
    """one brush stroke p0 → p1: pressed at the start, thinning and drying at the end"""
    n = 60; pts = []
    for i in range(n + 1):
        t = i / n; x = p0[0] + (p1[0] - p0[0]) * t; y = p0[1] + (p1[1] - p0[1]) * t
        wv = w0 * (1.25 - .5 * t + .15 * math.sin(t * 9 + R.uniform(0, 6))) * (1.6 if t < .04 else 1)
        pts.append((x, y, wv))
    for i in range(n):
        x0, y0, a = pts[i]; x1, y1, b = pts[i + 1]
        dx, dy = x1 - x0, y1 - y0; L = math.hypot(dx, dy) or 1; nx, ny = -dy / L, dx / L
        d.polygon([FP(x0 + nx * a / 2, y0 + ny * a / 2), FP(x1 + nx * b / 2, y1 + ny * b / 2), FP(x1 - nx * b / 2, y1 - ny * b / 2), FP(x0 - nx * a / 2, y0 - ny * a / 2)], fill=255)
def ink_field():
    X, Y = fcoords(); h = w = FW
    col, fib, cl = washi(X, Y, (240, 232, 214))
    R = np.random.default_rng(11); im, d = fcanvas()
    for i in range(N + 1):
        t = i * CELL + R.uniform(-.01, .01)
        brush_line(d, (t, -.02), (t + R.uniform(-.02, .02), S + .02), .024, R); brush_line(d, (-.02, t), (S + .02, t + R.uniform(-.02, .02)), .024, R)
    for (a, b) in STARS:
        x, y = a * CELL, b * CELL; r = .06; d.ellipse([FP(x - r, y - r), FP(x + r, y + r)], fill=255)
    ink = fdone(im)
    dens = .82 + f3(X, Y, np.zeros_like(X), .35, .35, .35, 13, 3) * .3   # the ink's density varies along the strokes
    ink = np.clip(ink * dens, 0, 1)
    bleed = np.clip(blur(ink, 2.5) - ink, 0, 1) * .5 * (1 + fib)   # the ink feathers into the fibres
    k = np.clip(ink + bleed * .6, 0, 1)
    col = col * (1 - k[..., None]) + np.array([24, 22, 22], np.float32) * k[..., None]
    hgt = (fib - .5) * .25 + (cl - .5) * .2
    return col, mmap(np.full((h, w), .85, np.float32), np.zeros((h, w), np.float32), hgt)
def ink_frame():
    X, Y = rcoords(); h = w = RW
    col = np.ones((h, w, 3), np.float32) * np.array([14, 12, 11], np.float32) * (1 + (vnoise(h, w, 2, 2, 7) - .5)[..., None] * .4)
    # the red seal (落款): a square stamp on the near-right of the frame, its edge broken, a glyph-like pattern cut in
    sx, sy, sr = S / 2 - .4, S / 2 + .3, .17
    m = ((np.abs(X - sx) < sr) & (np.abs(Y - sy) < sr)).astype(np.float32)
    R = np.random.default_rng(3); im = Image.new('L', (w, h), 0); d = ImageDraw.Draw(im)
    px = lambda x, y: ((x + O) * RPX, (y + O) * RPX)
    for k in range(7):   # white (uncut) strokes inside the seal
        x0, y0 = sx + R.uniform(-.12, .12), sy + R.uniform(-.12, .12)
        if k % 2: d.line([px(x0, sy - .12), px(x0, sy + .12)], fill=255, width=3)
        else: d.line([px(sx - .12, y0), px(sx + .12, y0)], fill=255, width=3)
    cut = np.asarray(im, np.float32) / 255
    rough_edge = smooth(.3, .6, vnoise(h, w, 30, 30, 9))
    seal = np.clip(m * (1 - cut) * (.75 + rough_edge * .25), 0, 1)
    col = col * (1 - seal[..., None]) + np.array([188, 36, 30], np.float32) * seal[..., None]
    rough = np.where(seal > .3, .8, .12).astype(np.float32)
    return col, mmap(rough, np.zeros((h, w), np.float32))

# ---------- 月と夜空 ----------
def moon_field():
    X, Y = fcoords(); h = w = FW; R = np.random.default_rng(21)
    t = np.clip(Y / S, 0, 1)
    col = (np.array([10, 16, 44], np.float32) * (1 - t)[..., None] + np.array([22, 22, 60], np.float32) * t[..., None])
    mw = np.exp(-(((X - Y * .8 - .6) / 1.3) ** 2)) * (.5 + f3(X, Y, np.zeros_like(X), .6, .6, .6, 3, 4))   # a faint milky way
    col += np.array([60, 58, 90], np.float32) * (mw * .45)[..., None]
    st = np.zeros((h, w), np.float32)   # stars: many faint, a few bright with a soft halo
    n = 1800; xs = R.integers(0, w, n); ys = R.integers(0, h, n); b = R.power(6, n)
    st[ys, xs] = b
    stars = blur(st, .7) * 3 + blur(st * (b.max() > 0), 3) * 6
    col += np.array([230, 236, 255], np.float32) * np.clip(stars, 0, 1)[..., None]
    gm = grid_mask(.012); sm = star_mask(.05)
    silver = np.array([196, 204, 222], np.float32)
    col = col * (1 - gm[..., None] * .85) + silver * (gm * .85)[..., None]
    col = col * (1 - sm[..., None]) + np.array([235, 226, 180], np.float32) * sm[..., None]   # the four dots: small gold stars
    rough = np.where(gm > .3, .25, .55).astype(np.float32); metal = np.clip(gm + sm, 0, 1)
    return col, mmap(rough, metal, gm * .3 + sm * .4)
def moon_frame():
    X, Y = rcoords(); h = w = RW
    br = vnoise(h, w, 1.2, 60, 5)
    col = np.ones((h, w, 3), np.float32) * np.array([138, 144, 160], np.float32) * (.9 + (br - .5)[..., None] * .12)
    e = np.maximum(np.abs(X), np.abs(Y)); ln = np.exp(-((e - (S / 2 + .16)) / .008) ** 2)
    col = col * (1 - ln[..., None] * .4)
    # the phases of the moon engraved along the near side (eight small discs, waxing)
    for i in range(8):
        cx = -S / 2 + (i + .5) * CELL; cy = S / 2 + .32; r = np.hypot(X - cx, Y - cy)
        ring = np.exp(-((r - .09) / .006) ** 2); ph = (i + 1) / 8; lit = (r < .09) & ((X - cx) > .09 * (1 - 2 * ph))
        col = col * (1 - ring[..., None] * .5); col = col * (1 + lit[..., None] * .18)
    return col, mmap(np.full((h, w), .35, np.float32), np.ones((h, w), np.float32))

# ---------- チョコレート ----------
def choc_field():
    X, Y = fcoords(); h = w = FW
    fx = (X / CELL) % 1; fy = (Y / CELL) % 1
    dx = np.minimum(fx, 1 - fx) * CELL; dy = np.minimum(fy, 1 - fy) * CELL; dd = np.minimum(dx, dy)
    groove = .055; bev = .06
    hgt = np.clip((dd - groove / 2) / bev, 0, 1); hgt = hgt * hgt * (3 - 2 * hgt)   # each square a slab: a bevel down into the groove
    top = np.clip((np.minimum(dx, dy) - groove / 2 - bev) / .05, 0, 1)
    base = np.array([112, 66, 40], np.float32)   # milk chocolate: the dark discs stand out on it
    col = np.ones((h, w, 3), np.float32) * base * (1 + (f3(X, Y, np.zeros_like(X), .4, .4, .4, 5, 4) - .5)[..., None] * .08)
    col *= (.7 + hgt[..., None] * .3)
    bloom = smooth(.72, .9, f3(X, Y, np.zeros_like(X), .3, .3, .3, 9, 4)) * .12   # a little fat bloom
    col = col * (1 - bloom[..., None]) + np.array([150, 120, 100], np.float32) * bloom[..., None]
    # the four dots: a small embossed cacao bean
    sm = star_mask(.08); col *= (1 - sm[..., None] * .15)
    rough = .32 + (1 - top) * .15 + bloom
    return col, mmap(np.clip(rough, 0, 1).astype(np.float32), np.zeros((h, w), np.float32), hgt - .5 - sm * .3)
def choc_frame():
    X, Y = rcoords(); h = w = RW
    # crumpled gold foil: flat facets between sharp creases (the creases: ridges of a few folded noises at different angles)
    a = np.zeros((h, w), np.float32)
    for k, (sc, ang) in enumerate([(.5, .3), (.3, 1.4), (.18, 2.3), (.1, .9)]):
        c, s_ = math.cos(ang), math.sin(ang); U = X * c - Y * s_; V = X * s_ + Y * c
        a += (1 - np.abs(f3(U, V, np.zeros_like(X), sc, sc, sc, 31 + k, 2) * 2 - 1)) * (.7 ** k)
    gy, gx = np.gradient(a); shade = np.clip(1 + gx * 7 - gy * 5, .8, 1.15)
    col = np.ones((h, w, 3), np.float32) * np.array([212, 168, 84], np.float32) * shade[..., None]
    return col, mmap(np.full((h, w), .22, np.float32), np.ones((h, w), np.float32), (a - a.mean()) * .5)

# ---------- ピクセル ----------
def pixel_field():
    P = 12; n = N * P; R = np.random.default_rng(4)   # 96 × 96 'pixels', drawn nearest
    a = np.zeros((n, n, 3), np.float32)
    G1, G2, G3, LN = np.array([44, 150, 72]), np.array([36, 128, 62]), np.array([60, 172, 88]), np.array([14, 52, 26])
    for y in range(n):
        for x in range(n):
            cx, cy = x % P, y % P
            c = G1 if ((x // P + y // P) % 2 == 0) else G2
            if cx == 1 or cy == 1: c = G3            # a lit top-left edge on each square
            if cx == 0 or cy == 0: c = LN            # the grid: a dark pixel line
            a[y, x] = c
    for (sx, sy) in STARS:   # the dots: a 2 × 2 dark block
        x, y = sx * P, sy * P
        a[y - 1:y + 1, x - 1:x + 1] = LN
    im = Image.fromarray(a.astype(np.uint8)).resize((FW, FW), Image.NEAREST)
    col = np.asarray(im, np.float32)
    hgt = (np.asarray(Image.fromarray(((a.mean(-1) < 40) * 255).astype(np.uint8)).resize((FW, FW), Image.NEAREST), np.float32) / 255) * -.5
    return col, mmap(np.full((FW, FW), .6, np.float32), np.zeros((FW, FW), np.float32), hgt)
def pixel_frame():
    X, Y = rcoords(); h = w = RW; P = 24
    q = lambda v: np.floor(v * P) / P
    e = np.maximum(np.abs(q(X)), np.abs(q(Y)))
    col = np.ones((h, w, 3), np.float32) * np.array([126, 112, 168], np.float32)   # a grape plastic, stepped in pixels
    lit = (q(Y) < -S / 2 - .05) | (q(X) < -S / 2 - .05)
    col *= np.where(lit[..., None], 1.18, .86)
    edge = (np.abs(e - (O - 1 / P)) < .5 / P) | (np.abs(e - (S / 2 + .5 / P)) < .5 / P)
    col = np.where(edge[..., None], np.array([60, 48, 92], np.float32), col)
    return col, mmap(np.full((h, w), .55, np.float32), np.zeros((h, w), np.float32))

BOARDS = {'toy': (toy_field, toy_frame), 'ink': (ink_field, ink_frame), 'moon': (moon_field, moon_frame), 'chocolate': (choc_field, choc_frame), 'pixel': (pixel_field, pixel_frame)}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    names = [a for a in sys.argv[1:] if not a.startswith('-')] or list(BOARDS)
    for n in names:
        f, r = BOARDS[n]
        c, m = f(); put('field-' + n, c, m)
        c, m = r(); put('frame-' + n, np.flipud(c), np.flipud(m))   # (the bezel's planar UVs: the near side at the picture's top)
    if '--nomobile' not in sys.argv:
        import subprocess as _sp
        _sp.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mobile-tex.py')])

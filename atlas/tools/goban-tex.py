# Writes the go / gomoku 3D boards' pictures (images/atlas/goban3d/*.webp), 2026-11-15.
#   python3 atlas/tools/goban-tex.py [name …] [--nomobile]          (numpy, scipy, Pillow; helpers: xqtex_*.py)
# Each look: surf-<look> (the board's top WITHOUT the grid, 2048²: the grid is drawn on it in atlas/models/goban.js for any n)
# and side-<look> (one face of the board's body, 1536 × 480, used on all four), each with a "-m" map: R height, G roughness,
# B metalness.  Go:  cosmos 星空 · zen 枯山水 · blue 青花 · bamboo 竹.   Gomoku:  tile モザイク · gingham ピクニック · slate 黒板 · denim デニム.
import os, sys, math
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from xqtex_lib import vnoise, fbm, smooth, save
from xqtex_field import f3
import xqtex_field as XF
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'images', 'atlas', 'goban3d')
TW = 2048; SW, SH = 1536, 480

def blur(a, s): return ndimage.gaussian_filter(a, s)
def grid(w, h, sx=1.0, sy=1.0):
    x = (np.arange(w, dtype=np.float32) + .5) / w * sx; y = (np.arange(h, dtype=np.float32) + .5) / h * sy
    return np.meshgrid(x, y)
def mmap(rough, metal, hgt=None):
    return np.stack([128 + (hgt if hgt is not None else np.zeros_like(rough)) * 127, rough * 255, metal * 255], -1)
def put(name, rgb, m):
    save(rgb, os.path.join(OUT, name + '.webp'), 88); save(m, os.path.join(OUT, name + '-m.webp'), 92)
def C(c): return np.array(c, np.float32)[None, None, :]
Z = lambda X: np.zeros_like(X)

# ---------- 星空 (cosmos) ----------
def starfield(X, Y, w, h, seed, n, bright=1.0):
    R = np.random.default_rng(seed); st = np.zeros((h, w), np.float32)
    xs = R.integers(0, w, n); ys = R.integers(0, h, n); b = R.power(5, n) * bright; st[ys, xs] = b
    big = R.choice(n, max(1, n // 60), replace=False); halo = np.zeros_like(st); halo[ys[big], xs[big]] = b[big] * 3
    return np.clip(blur(st, .6) * 3 + blur(halo, 3) * 8, 0, 1.4)
def cosmos_surf():
    X, Y = grid(TW, TW, 8, 8)
    base = C((6, 8, 20)) * np.ones((TW, TW, 1), np.float32)
    n1 = f3(X, Y, Z(X), 1.6, 1.6, 1.6, 3, 5); n2 = f3(X + 3, Y, Z(X), 1.1, 1.1, 1.1, 7, 5)
    neb = smooth(.5, .85, n1) * .9; neb2 = smooth(.55, .9, n2) * .8
    col = base + C((96, 40, 120)) * neb[..., None] * .55 + C((30, 110, 140)) * neb2[..., None] * .45
    col += C((235, 240, 255)) * starfield(X, Y, TW, TW, 5, 5200)[..., None]
    return col, mmap(np.full((TW, TW), .18, np.float32), Z(X))
def cosmos_side():
    X, Y = grid(SW, SH, 6, 2)
    col = C((10, 10, 18)) * np.ones((SH, SW, 1), np.float32) * (1 + (f3(X, Y, Z(X), .8, .8, .8, 11, 4) - .5)[..., None] * .5)
    col += C((210, 220, 255)) * starfield(X, Y, SW, SH, 9, 900, .6)[..., None]
    band = np.exp(-((Y - .18) / .015) ** 2) + np.exp(-((Y - 1.82) / .015) ** 2)   # two fine silver lines
    col = col * (1 - band[..., None]) + C((200, 210, 228)) * band[..., None]
    return col, mmap(np.full((SH, SW), .1, np.float32), band)

# ---------- 枯山水 (zen) ----------
def sand(X, Y, w, h, seed):
    R = np.random.default_rng(seed); g = R.random((h, w)).astype(np.float32)
    return blur(g, .7)
def zen_surf():
    X, Y = grid(TW, TW, 1, 1)
    s = sand(X, Y, TW, TW, 3)
    # raked ripples between the grid lines would fight the grid: the sand is raked in long gentle waves along one direction only
    rip = np.sin(Y * 2 * math.pi * 70 + f3(X, Y, Z(X), .2, .2, .2, 5, 3) * 6) * .5 + .5
    col = C((226, 220, 204)) * (1 + (s[..., None] - .5) * .18 + (rip[..., None] - .5) * .05)
    hgt = (s - .5) * .5 + (rip - .5) * .35
    return col, mmap(np.full((TW, TW), .95, np.float32), Z(X), hgt)
def zen_side():
    X, Y = grid(SW, SH, 6, 2)
    gr = f3(X, Y, Z(X), .15, .15, .15, 21, 4); sp = sand(X, Y, SW, SH, 23)
    col = C((128, 126, 120)) * (1 + (gr[..., None] - .5) * .45 + (sp[..., None] - .5) * .25)   # granite
    moss = smooth(.45, .7, f3(X, Y, Z(X), .25, .25, .25, 25, 4) + (Y / 2) * .5 - .25)        # moss creeping up from the foot
    mc = C((74, 104, 46)) * (1 + (f3(X, Y, Z(X), .03, .03, .03, 27, 3) - .5)[..., None] * .7)
    col = col * (1 - moss[..., None]) + mc * moss[..., None]
    return col, mmap(np.full((SH, SW), .9, np.float32), Z(X), (gr - .5) * .8 + moss * .3)

# ---------- 青花 (blue and white porcelain) ----------
COB = (32, 62, 150)
def scroll(d, P, x0, y0, x1, y1, n, lw, seed):
    """a band of scrolling vine (唐草): a wave with curled tendrils and leaves, drawn with brush strokes"""
    R = np.random.default_rng(seed); L = x1 - x0; Hh = y1 - y0; pts = []
    for k in range(401):
        t = k / 400; pts.append(P(x0 + L * t, y0 + Hh / 2 + math.sin(t * n * 2 * math.pi) * Hh * .28))
    d.line(pts, fill=255, width=lw, joint='curve')
    for k in range(n * 2):
        t = (k + .25) / (n * 2); up = 1 if k % 2 == 0 else -1
        cx = x0 + L * t; cy = y0 + Hh / 2 + math.sin(t * n * 2 * math.pi) * Hh * .28
        cur = [P(cx + math.cos(a) * Hh * (.06 + a * .02), cy - up * (Hh * .12 + math.sin(a) * Hh * (.06 + a * .02))) for a in np.linspace(0, 5.5, 30)]
        d.line(cur, fill=255, width=max(1, lw * 2 // 3), joint='curve')
        lf = [P(cx + Hh * .05 * math.cos(a) + Hh * .1, cy + up * (Hh * .05 + Hh * .1 * abs(math.sin(a / 2)))) for a in np.linspace(0, 6.28, 20)]
        d.polygon(lf, fill=255)
def blue_surf():
    X, Y = grid(TW, TW, 1, 1)
    col = C((246, 245, 238)) * np.ones((TW, TW, 1), np.float32) * (1 + (f3(X, Y, Z(X), .5, .5, .5, 3, 4)[..., None] - .5) * .03)
    # a painted border round the playing field (the field itself plain): double ring + a band of scrolling vine
    im = Image.new('L', (TW * 2, TW * 2), 0); d = ImageDraw.Draw(im); P = lambda x, y: (x * TW * 2, y * TW * 2)
    for a, lw in [(.008, 8), (.016, 3), (.05, 3), (.056, 6)]:   # (inside the margin: for 19 lines the grid starts at ~.06)
        d.rectangle([P(a, a), P(1 - a, 1 - a)], outline=255, width=lw)
    for side in range(4):
        band = Image.new('L', (TW * 2, int(TW * 2 * .03)), 0); bd = ImageDraw.Draw(band); bw, bh = band.size
        scroll(bd, lambda x, y: (x, y), 0, 0, bw, bh, 16, 5, 3 + side)
        b = band.rotate(90 * side, expand=True)
        if side == 0: im.paste(255, (0, int(TW * 2 * .018)), b)
        elif side == 2: im.paste(255, (0, int(TW * 2 * (1 - .018)) - b.size[1]), b)
        elif side == 1: im.paste(255, (int(TW * 2 * .018), 0), b)
        else: im.paste(255, (int(TW * 2 * (1 - .018)) - b.size[0], 0), b)
    m = np.asarray(im.resize((TW, TW), Image.LANCZOS), np.float32) / 255
    # keep the vine only in the band between the rings
    e = np.maximum(np.abs(X - .5), np.abs(Y - .5)); m = m * (e > .5 - .052)
    ink = np.clip(m * (.75 + f3(X, Y, Z(X), .05, .05, .05, 7, 2) * .5), 0, 1)
    halo = np.clip(blur(m, 1.2) - m, 0, 1) * .4   # cobalt bleeds a little in the glaze
    k = np.clip(ink + halo, 0, 1)
    col = col * (1 - k[..., None]) + C(COB) * k[..., None]
    return col, mmap(np.full((TW, TW), .06, np.float32), Z(X))
def blue_side():
    X, Y = grid(SW, SH, 6, 2)
    col = C((246, 245, 238)) * np.ones((SH, SW, 1), np.float32)
    # 海水紋: stacked wave crests along the foot, a band of vine above, cobalt lines between
    wy = (Y - 1.25) / .75; crest = np.zeros_like(X)
    for k in range(5):
        cy = 1.3 + k * .14; ph = (X * 7 + k * .5) % 1
        cr = np.abs(Y - cy - .06 * np.sin(ph * math.pi)) < .012
        crest = np.maximum(crest, cr * (Y > 1.25))
    lines_ = (np.abs(Y - .2) < .02) | (np.abs(Y - .28) < .008) | (np.abs(Y - 1.2) < .008) | (np.abs(Y - 1.24) < .02)
    vine = (np.abs(Y - .74 - .18 * np.sin(X * math.pi * 2)) < .02) | ((np.abs(Y - .74 - .18 * np.sin(X * math.pi * 2)) < .12) & (((X * 2) % 1) < .08))
    k = np.clip(blur((crest + lines_ + vine).astype(np.float32), 1.0), 0, 1)
    col = col * (1 - k[..., None]) + C(COB) * k[..., None]
    return col, mmap(np.full((SH, SW), .06, np.float32), Z(X))

# ---------- 竹 (bamboo) ----------
def bamboo_strips(X, Y, w, h, nstrip, seed, horizontal=False):
    """laminated bamboo: strips of pale culm, each its own tone, fine fibres along it, a node (dark band + ridge) now and then"""
    A, B = (Y, X) if horizontal else (X, Y)
    idx = np.floor(A * nstrip).astype(np.int64); tone = XF._hash(idx, Z(idx), Z(idx), seed)
    fib = f3(A * 60, B * 2, Z(A), .4, .4, .4, seed + 3, 3)
    col = C((214, 184, 120)) * (1 + (tone[..., None] - .5) * .16 + (fib[..., None] - .5) * .12)
    nodepos = (B * 1.4 + tone * 3.1) % 1; node = np.exp(-((nodepos - .5) / .012) ** 2)
    col = col * (1 - node[..., None] * .35) + C((150, 110, 58)) * (node * .2)[..., None]
    seam = np.exp(-(((A * nstrip) % 1 - .0) / .03) ** 2) + np.exp(-(((A * nstrip) % 1 - 1) / .03) ** 2)
    col *= (1 - seam[..., None] * .2)
    return col, node, seam
def bamboo_surf():
    X, Y = grid(TW, TW, 1, 1)
    col, node, seam = bamboo_strips(X, Y, TW, TW, 22, 5, True)
    return col, mmap(np.full((TW, TW), .45, np.float32), Z(X), node * .6 - seam * .3)
def bamboo_side():
    X, Y = grid(SW, SH, 6, 2)
    col, node, seam = bamboo_strips(X, Y, SW, SH, 9, 13, True)
    return col, mmap(np.full((SH, SW), .45, np.float32), Z(X), node * .6 - seam * .3)

# ---------- モザイク (zellige tiles) ----------
def tiles(X, Y, w, h, n, seed, pal):
    fx, fy = (X * n) % 1, (Y * n) % 1; ix, iy = np.floor(X * n).astype(np.int64), np.floor(Y * n).astype(np.int64)
    hsh = XF._hash(ix, iy, Z(ix), seed); h2 = XF._hash(ix, iy, Z(ix) + 1, seed)
    ci = np.floor(hsh * len(pal)).astype(np.int64); col = np.array(pal, np.float32)[ci]
    col *= (1 + (h2[..., None] - .5) * .18)
    # each glazed tile: a little pooled (darker) at its edge, a soft dome, a few pin-holes
    ed = np.minimum(np.minimum(fx, 1 - fx), np.minimum(fy, 1 - fy))
    col *= (.86 + smooth(0, .18, ed)[..., None] * .14)
    grout = 1 - smooth(.02, .05, ed)
    col = col * (1 - grout[..., None]) + C((196, 190, 176)) * grout[..., None]
    hgt = smooth(.02, .2, ed) * .7 - grout * .5
    return col, hgt, grout
TILE_PAL = [(18, 112, 112), (24, 128, 120), (14, 96, 104), (32, 140, 132), (20, 104, 128)]
def tile_surf():
    X, Y = grid(TW, TW, 1, 1)
    col, hgt, grout = tiles(X, Y, TW, TW, 48, 3, TILE_PAL)
    return col, mmap(np.clip(.08 + grout * .8, 0, 1).astype(np.float32), Z(X), hgt)
def tile_side():
    X, Y = grid(SW, SH, 6, 2)
    col, hgt, grout = tiles(X, Y, SW, SH, 10, 7, [(236, 230, 214), (226, 220, 204)] )
    band = (Y > .6) & (Y < 1.4)   # a band of blue-and-teal tiles round the middle
    c2, h2, g2 = tiles(X, Y, SW, SH, 10, 9, TILE_PAL + [(30, 60, 130)])
    col = np.where(band[..., None], c2, col); hgt = np.where(band, h2, hgt); grout = np.where(band, g2, grout)
    return col, mmap(np.clip(.08 + grout * .8, 0, 1).astype(np.float32), Z(X), hgt)

# ---------- ピクニック (gingham) ----------
def weave(X, Y, n):
    tx = (np.sin(X * n * 2 * math.pi) * .5 + .5); ty = (np.sin(Y * n * 2 * math.pi) * .5 + .5)
    return (tx + ty) * .5
def gingham_surf():
    X, Y = grid(TW, TW, 1, 1); n = 11
    bx = ((X * n) % 1) < .5; by = ((Y * n) % 1) < .5
    k = bx.astype(np.float32) + by.astype(np.float32)   # 0 white, 1 light red, 2 red
    RED = C((222, 96, 96)); WH = C((252, 248, 242))
    col = WH * (1 - (k / 2)[..., None] * 0) ; col = np.where((k == 2)[..., None], RED, np.where((k == 1)[..., None], WH * .5 + RED * .5 + 30, WH))
    wv = weave(X, Y, 420)
    col = col * (1 + (wv[..., None] - .5) * .12)
    return col, mmap(np.full((TW, TW), .95, np.float32), Z(X), (wv - .5) * .5)
def gingham_side():
    X, Y = grid(SW, SH, 6, 2)
    # wicker: over-under weave of cane strands
    u = X * 14; v = Y * 7
    cell = (np.floor(u) + np.floor(v)) % 2
    fu, fv = u % 1, v % 1
    hor = np.where(cell == 0, np.sin(fv * math.pi), np.sin(fu * math.pi))
    col = C((194, 150, 88)) * (.62 + hor[..., None] * .5) * (1 + (f3(X * 40, Y * 3, Z(X), .3, .3, .3, 5, 3)[..., None] - .5) * .2)
    return col, mmap(np.full((SH, SW), .7, np.float32), Z(X), hor - .5)

# ---------- 黒板 (slate) ----------
def slate_surf():
    X, Y = grid(TW, TW, 1, 1)
    col = C((40, 58, 48)) * np.ones((TW, TW, 1), np.float32) * (1 + (f3(X, Y, Z(X), .3, .3, .3, 3, 4)[..., None] - .5) * .12)
    # eraser swirls: faint chalk dust in broad arcs
    sw = np.zeros_like(X)
    R = np.random.default_rng(5)
    for k in range(9):
        cx, cy, r = R.uniform(.1, .9), R.uniform(.1, .9), R.uniform(.12, .3)
        d = np.abs(np.hypot(X - cx, Y - cy) - r); sw += np.exp(-(d / .03) ** 2) * R.uniform(.3, .8) * (f3(X, Y, Z(X), .05, .05, .05, k, 2) > .45)
    dust = blur(sw, 6) * .08 + blur(np.random.default_rng(7).random((TW, TW)).astype(np.float32), 1) * .03
    col = col + C((210, 214, 206)) * dust[..., None]
    return col, mmap(np.full((TW, TW), .85, np.float32), Z(X))
def slate_side():
    X, Y = grid(SW, SH, 6, 2)
    col = XF.wood3(Y * 2, X * 6, Z(X), 'maple' if 'maple' in XF.SP else 'kaya', dict(cx=.5, cz=-2.5, wob=.3), 31) if False else None
    g = f3(X * 18, Y * 1.2, Z(X), .3, .3, .3, 33, 4)
    col = C((176, 132, 80)) * (1 + (g[..., None] - .5) * .35)   # an oak frame
    tray = (Y > 1.75)   # the chalk ledge along the foot
    col = np.where(tray[..., None], col * .8, col)
    return col, mmap(np.full((SH, SW), .55, np.float32), Z(X), (g - .5) * .4 - tray * .3)

# ---------- デニム (denim) ----------
def denim(X, Y, w, h, seed):
    tw = ((X * 260 + Y * 260) % 1)   # the 3×1 twill: diagonal ribs
    rib = np.sin(tw * 2 * math.pi) * .5 + .5
    slub = f3(X * 60, Y * 4, Z(X), .3, .3, .3, seed, 3)      # uneven yarn along the warp
    fade = smooth(.5, .85, f3(X, Y, Z(X), .35, .35, .35, seed + 3, 4)) * .7   # worn, lighter patches
    base = C((32, 52, 92)) * (1 - fade[..., None]) + C((88, 118, 160)) * fade[..., None]
    col = base * (.8 + rib[..., None] * .3) + C((200, 210, 225)) * ((slub > .62) * .15 * rib)[..., None]
    return col, (rib - .5) * .6
def denim_surf():
    X, Y = grid(TW, TW, 1, 1)
    col, hgt = denim(X, Y, TW, TW, 3)
    return col, mmap(np.full((TW, TW), .95, np.float32), Z(X), hgt)
def denim_side():
    X, Y = grid(SW, SH, 6, 2)
    col = C((112, 70, 40)) * (1 + (f3(X, Y, Z(X), .08, .08, .08, 41, 4)[..., None] - .5) * .35)   # a tan leather band
    st = (np.abs(Y - .25) < .02) & (((X * 30) % 1) < .55) | (np.abs(Y - 1.75) < .02) & (((X * 30) % 1) < .55)
    stf = blur(st.astype(np.float32), .8)
    col = col * (1 - stf[..., None]) + C((232, 156, 48)) * stf[..., None]
    return col, mmap(np.full((SH, SW), .55, np.float32), Z(X), stf * .5)

LOOKS = {'cosmos': (cosmos_surf, cosmos_side), 'zen': (zen_surf, zen_side), 'blue': (blue_surf, blue_side), 'bamboo': (bamboo_surf, bamboo_side),
         'tile': (tile_surf, tile_side), 'gingham': (gingham_surf, gingham_side), 'slate': (slate_surf, slate_side), 'denim': (denim_surf, denim_side)}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    names = [a for a in sys.argv[1:] if not a.startswith('-')] or list(LOOKS)
    for n in names:
        a, b = LOOKS[n]
        c, m = a(); put('surf-' + n, c, m)
        c, m = b(); put('side-' + n, c, m)
        print(n, flush=True)
    if '--nomobile' not in sys.argv:
        import subprocess as _sp
        _sp.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mobile-tex.py')])

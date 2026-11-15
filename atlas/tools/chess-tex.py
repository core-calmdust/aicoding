# Writes the chess 3D boards' pictures (images/atlas/chess3d/*.webp), 2026-11-15 (v2: ceramic / jewel / brass / neon).
#   python3 atlas/tools/chess-tex.py [name …]        (numpy, scipy, Pillow; the noise / wood helpers are the xiangqi ones: xqtex_*.py)
# Each board: top-<look> (the whole top, 2048²) and side-<look> (the four faces stacked: far / right / near / left, see
# xqtex_field.perimeter), each with a "-m" map: R height (bump), G roughness, B metalness.
#   ceramic  陶器と金継ぎ   hand-painted white glaze squares on a black glaze, gold kintsugi seams across the board
#   jewel    ジュエリー     pavé of white diamonds / black spinels in platinum, baguettes and millegrain on the frame
#   brass    真鍮彫り       black enamel engraved with brass (a lotus on each dark square, bands of strokes on the frame), nickel-silver squares
#   neon     ネオン         smoked acrylic, rings engraved in the light squares lit cyan (far) → magenta (near), a lit rim
# Each board is a world of its own (2026-11-15 v2: the first marble / walnut / leather / khatam boards looked like other games' boards).
import os, sys, math
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from xqtex_lib import vnoise, fbm, smooth, mixc, save
from xqtex_field import n3, f3, perimeter
import xqtex_field as XF
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'images', 'atlas', 'chess3d')
# the board (atlas/models/chess.js): 8 squares of 1.0, a frame of MARGIN round them
S, M = 8, .85
W = S + 2 * M; HB = .5
CW = 2048; PX = CW / W
SS = 2
E_RO = .06; SH = .52; SPX = 246

def blur(a, s): return ndimage.gaussian_filter(a, s)
def coords(w=CW, h=CW, px=PX):
    x = (np.arange(w, dtype=np.float32) + .5) / px; y = (np.arange(h, dtype=np.float32) + .5) / px
    return np.meshgrid(x, y)
def mmap(rough, metal, hgt=None):
    R = 128 + (hgt if hgt is not None else np.zeros_like(rough)) * 127
    return np.stack([R, rough * 255, metal * 255], -1)
def put(path, rgb, m=None, q=88):
    save(rgb, os.path.join(OUT, path + '.webp'), q)
    if m is not None: save(m, os.path.join(OUT, path + '-m.webp'), 92)
def P(x, y): return (x * PX * SS, y * PX * SS)
def canvas(w=CW, h=CW): im = Image.new('L', (w * SS, h * SS), 0); return im, ImageDraw.Draw(im)
def done(im, w=CW, h=CW): return np.asarray(im.resize((w, h), Image.LANCZOS), np.float32) / 255
def rect_mask(x0, y0, x1, y1):
    im, d = canvas(); d.rectangle([P(x0, y0), P(x1, y1)], fill=255); return done(im)
def band_mask(pad_out, pad_in):
    """a square ring round the field: from pad_out outside its edge to pad_in outside its edge (pad_in < pad_out)"""
    im, d = canvas()
    d.rectangle([P(M - pad_out, M - pad_out), P(M + S + pad_out, M + S + pad_out)], fill=255)
    d.rectangle([P(M - pad_in, M - pad_in), P(M + S + pad_in, M + S + pad_in)], fill=0)
    return done(im)
FIELD = None
def field_mask():
    global FIELD
    if FIELD is None: FIELD = rect_mask(M, M, M + S, M + S)
    return FIELD
def strips():
    """the frame's four mitred strips: masks (far, right, near, left); the grain of each runs along it"""
    out = []
    E = [(0, 0), (W, 0), (W, W), (0, W)]; I = [(M, M), (W - M, M), (W - M, W - M), (M, W - M)]
    for i in range(4):
        j = (i + 1) % 4; im, d = canvas(); d.polygon([P(*E[i]), P(*E[j]), P(*I[j]), P(*I[i])], fill=255); out.append(done(im))
    return out
def joints(lw=.012, dark=.5):
    """hairline joints between the squares and round the field"""
    im, d = canvas()
    for i in range(S + 1):
        d.line([P(M + i, M), P(M + i, M + S)], fill=255, width=max(1, round(lw * PX * SS)))
        d.line([P(M, M + i), P(M + S, M + i)], fill=255, width=max(1, round(lw * PX * SS)))
    return done(im)
def tiles():
    """(f, r, y-slice, x-slice) of each square in pixels"""
    for r in range(S):
        for f in range(S):
            y0, y1 = round((M + r) * PX), round((M + r + 1) * PX); x0, x1 = round((M + f) * PX), round((M + f + 1) * PX)
            yield f, r, slice(y0, y1), slice(x0, x1)
def metal_col(h, w, base, seed, along='x'):
    br = vnoise(h, w, 1.2, 60, seed) if along == 'x' else vnoise(h, w, 60, 1.2, seed)
    cl = fbm(h, w, 90, 90, seed + 5, 3)
    k = .86 + (br - .5) * .16 + (cl - .5) * .22
    return np.array(base, np.float32)[None, None, :] * k[..., None]
def inlay(col, rough, metal, hgt, mask, base, r_metal=.28, seed=1, seam=.6, met=1.):
    h, w = mask.shape
    edge = np.clip(blur(mask, 1.0) - mask, 0, 1) * 2.2
    col *= (1 - np.clip(edge, 0, 1) * seam)[..., None]
    mc = metal_col(h, w, base, seed)
    col[:] = col * (1 - mask[..., None]) + mc * mask[..., None]
    rough[:] = rough * (1 - mask) + r_metal * mask; metal[:] = metal * (1 - mask) + mask * met
    hgt[:] = hgt - edge * .25
def lay(col, mask, c):
    """paint a flat colour (array or rgb) through a mask"""
    c = np.asarray(c, np.float32)
    if c.ndim == 1: c = c[None, None, :]
    col[:] = col * (1 - mask[..., None]) + c * mask[..., None]
GOLD = (236, 194, 108); BRASS = (214, 170, 92)

# ---------- shared ----------
def lines(segs, lw):
    """antialiased mask of polylines (world units); segs: list of point lists"""
    im, d = canvas()
    for pts in segs:
        d.line([P(*p) for p in pts], fill=255, width=max(1, round(lw * PX * SS)), joint='curve')
    return done(im)
def wobbly_square(x0, y0, s, seed, amp=.012, n=24):
    """a hand-painted square: its edges wander a little, its corners a little round"""
    R = np.random.default_rng(seed); pts = []
    for side in range(4):
        for k in range(n):
            t = k / n
            if side == 0: x, y = x0 + t * s, y0
            elif side == 1: x, y = x0 + s, y0 + t * s
            elif side == 2: x, y = x0 + s - t * s, y0 + s
            else: x, y = x0, y0 + s - t * s
            c = min(t, 1 - t) * s; k2 = 1 if c > .05 else c / .05   # the corners: a little round
            ox, oy = (0, 1) if side == 0 else (-1, 0) if side == 1 else (0, -1) if side == 2 else (1, 0)
            w = (math.sin(t * 7 + seed) * .5 + math.sin(t * 17 + seed * 3) * .3 + R.uniform(-.2, .2)) * amp
            pts.append((x + ox * w + ox * (1 - k2) * .012, y + oy * w + oy * (1 - k2) * .012))
    return pts
def worley_edges(X, Y, cell, seed):
    d1, edge = pebble(X, Y, cell, seed); return d1, edge
def pebble(X, Y, cell, seed):
    """leather grain: the distance to the nearest of jittered points (the hide's pebbles), and its creases"""
    gx, gy = np.floor(X / cell).astype(np.int64), np.floor(Y / cell).astype(np.int64)
    d1 = np.full(X.shape, 9, np.float32); d2 = np.full(X.shape, 9, np.float32)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            cx, cy = gx + dx, gy + dy
            hx = XF._hash(cx, cy, np.zeros_like(cx), seed); hy = XF._hash(cx, cy, np.ones_like(cx), seed + 1)
            px = (cx + .15 + hx * .7) * cell; py = (cy + .15 + hy * .7) * cell
            d = np.hypot(X - px, Y - py).astype(np.float32)
            d2 = np.where(d < d1, d1, np.minimum(d2, d)); d1 = np.minimum(d1, d)
    return d1 / cell, (d2 - d1) / cell

# ---------- 陶器と金継ぎ (ceramic): a hand-painted glazed slab, its cracks mended with gold ----------
def crack_paths(seed, n=3):
    """kintsugi seams: wandering lines that start at the rim and run across, with a few short branches"""
    R = np.random.default_rng(seed); out = []
    starts = [(R.uniform(1.5, W - 1.5), .02, math.pi / 2), (W - .02, R.uniform(2, W - 2), math.pi), (R.uniform(2, W - 2), W - .02, -math.pi / 2), (.02, R.uniform(2, W - 2), 0)]
    R.shuffle(starts)
    for k in range(n):
        x, y, a = starts[k]; a += R.uniform(-.35, .35); pts = [(x, y)]; L = R.uniform(6.5, 10)
        a0 = a
        for i in range(int(L / .045)):
            a += R.normal(0, .16) + (a0 - a) * .04 + math.sin(i * .21 + k) * .04   # wanders, but keeps its heading: across the board
            x += math.cos(a) * .045; y += math.sin(a) * .045
            if not (0 <= x <= W and 0 <= y <= W): break
            pts.append((x, y))
            if R.random() < .012:   # a branch
                bx, by, ba = x, y, a + R.choice([-1, 1]) * R.uniform(.6, 1.1); bp = [(bx, by)]
                for j in range(R.integers(8, 24)):
                    ba += R.normal(0, .3); bx += math.cos(ba) * .04; by += math.sin(ba) * .04; bp.append((bx, by))
                out.append((bp, .006))
        out.append((pts, .011))
    return out
def ceramic_top():
    X, Y = coords(); h = w = CW; Z0 = np.zeros_like(X)
    # glazes: white (a warm, thick tin glaze; thinner and greyer at the painted edges) and black (thinner at its rims: the clay
    # browns through)
    WH = np.array([243, 239, 229], np.float32); BK = np.array([17, 17, 21], np.float32)
    im, d = canvas()
    for f, r, sy, sx in tiles():
        if (f + r) % 2 == 0: d.polygon([P(*p) for p in wobbly_square(M + f + .025, M + r + .025, .95, 31 + f * 8 + r)], fill=255)
    wm = done(im)
    edge_in = np.clip(wm - blur(wm, 5) + .0, 0, 1) * 2.2   # inside the white, near its edge
    cl = (f3(X, Y, Z0, .6, .6, .6, 3, 4) - .5)
    white = WH * (1 + cl[..., None] * .05) * (1 - np.clip(edge_in, 0, 1)[..., None] * np.array([.10, .07, .02], np.float32))
    d1, ce = pebble(X * 1.0, Y * 1.0, .16, 7); craq = (1 - smooth(0, .05, ce)) * smooth(.35, .65, f3(X, Y, Z0, 1.2, 1.2, 1.2, 9, 3))
    white *= (1 - craq * .07)[..., None]
    black = BK * (1 + (f3(X, Y, Z0, .5, .5, .5, 13, 4) - .5)[..., None] * .5)
    rim = np.clip(blur(wm, 2.5) - wm, 0, 1) * 2.5   # the black thins where it meets the white
    black = black * (1 - rim[..., None]) + np.array([92, 62, 40], np.float32) * rim[..., None] * .55 + black * rim[..., None] * .45
    col = black * (1 - wm[..., None]) + white * wm[..., None]
    rough = np.full((h, w), .05, np.float32); metal = np.zeros((h, w), np.float32)
    hgt = (f3(X, Y, Z0, .25, .25, .25, 17, 3) - .5) * .12 + wm * .08 - craq * .05   # orange-peel glaze, the white a hair thicker
    # gold: a painted line round the field and near the outer edge, then the mended cracks
    ring = lambda a: [(M - a, M - a), (M + S + a, M - a), (M + S + a, M + S + a), (M - a, M + S + a), (M - a, M - a)]
    gm = lines([ring(.1)], .022) + lines([ring(M - .14)], .014)
    cr = crack_paths(5)
    for pts, lw in cr: gm = gm + lines([pts], lw)
    gm = np.clip(gm, 0, 1)
    seam = np.clip(blur(gm, 1.4) - gm, 0, 1) * 2
    col *= (1 - np.clip(seam, 0, 1) * .25)[..., None]
    gc = metal_col(h, w, (232, 186, 98), 21) * (1 + (f3(X, Y, Z0, .05, .05, .05, 23, 2) - .5) * .25)[..., None]   # 金粉: a grainy gold
    col = col * (1 - gm[..., None]) + gc * gm[..., None]
    rough = rough * (1 - gm) + .28 * gm; metal = metal * (1 - gm) + gm; hgt = hgt + blur(gm, .8) * .35
    return col, mmap(rough, metal, hgt)
def ceramic_side():
    X, Y, Z, Ek = perimeter(W, W, E_RO, SH, SPX)
    h, w = X.shape
    col = np.ones((h, w, 3), np.float32) * np.array([17, 17, 21], np.float32) * (1 + (f3(X, Y, Z, .5, .5, .3, 31, 4) - .5) * .6)[..., None]
    rough = np.full((h, w), .05, np.float32); metal = np.zeros((h, w), np.float32)
    wob = (f3(X, Y, np.zeros_like(X), .7, .7, .7, 33, 3) - .5) * .03
    gm = blur(((np.abs(Z + .085 + wob) < .009)).astype(np.float32), .7)   # a hand-painted gold line just under the rim
    # glaze runs: the black pools a little thicker towards the foot
    col *= (1 + smooth(-.2, -.5, Z) * (f3(X, Y, Z, .08, .08, .5, 35, 3) - .5)[..., None] * .5 if False else 1)
    gc = metal_col(h, w, (232, 186, 98), 37)
    col = col * (1 - gm[..., None]) + gc * gm[..., None]; rough = rough * (1 - gm) + .28 * gm; metal = metal * (1 - gm) + gm
    return col, mmap(rough, metal, blur(gm, .8) * .3)

# ---------- ジュエリー (jewel): pavé — white diamonds and black spinels set in platinum, a frame of baguettes ----------
SQ3 = math.sqrt(3)
def pave(X, Y, r, seed):
    """hex pavé: per pixel the stone's id, the offset from its centre (dx, dy) and its distance (all world units)"""
    sp = r * 2.12
    q = (X * 2 / 3) / (sp / SQ3); rr = (-X / 3 + SQ3 / 3 * Y) / (sp / SQ3)
    # axial round
    xq, zq = q, rr; yq = -xq - zq
    rx, ry, rz = np.round(xq), np.round(yq), np.round(zq)
    dx_, dy_, dz_ = np.abs(rx - xq), np.abs(ry - yq), np.abs(rz - zq)
    c1 = (dx_ > dy_) & (dx_ > dz_); c2 = ~c1 & (dy_ > dz_)
    rx = np.where(c1, -ry - rz, rx); rz = np.where(~c1 & ~c2, -rx - ry, rz)
    cx = (sp / SQ3) * 1.5 * rx; cy = (sp / SQ3) * (SQ3 / 2 * rx + SQ3 * rz)
    dxp, dyp = X - cx, Y - cy
    return rx.astype(np.int64), rz.astype(np.int64), dxp, dyp, np.hypot(dxp, dyp)
def stone_shade(ix, iz, dx, dy, dist, r, seed):
    """brilliant-cut look from above: a flat table, eight crown facets (each its own brightness), a dark girdle line"""
    ang = np.arctan2(dy, dx); sec = np.floor((ang + math.pi) / (math.pi / 4)).astype(np.int64)
    hsh = XF._hash(ix, iz, sec, seed); hs2 = XF._hash(ix, iz, np.zeros_like(ix), seed + 5)
    rn = dist / r
    table = rn < .42
    facet = np.where(table, .78 + hs2 * .14, .5 + hsh * .38)
    spark = (XF._hash(ix, iz, sec + 3, seed + 9) > .94) & ~table   # now and then a facet catches the light
    v = np.clip(facet + spark * .55, 0, 1.4)
    girdle = smooth(.86, .98, rn)
    return v, girdle, hs2
def jewel_top():
    X, Y = coords(); h = w = CW; Z0 = np.zeros_like(X)
    col = np.zeros((h, w, 3), np.float32); rough = np.full((h, w), .08, np.float32); metal = np.zeros((h, w), np.float32); hgt = np.zeros((h, w), np.float32)
    PT = np.array([226, 229, 234], np.float32); BR = np.array([70, 70, 76], np.float32)   # platinum, blackened rhodium
    r = .055
    ix, iz, dx, dy, dist = pave(X, Y, r, 3)
    v, girdle, hs = stone_shade(ix, iz, dx, dy, dist, r, 11)
    inside = (dist < r * .96).astype(np.float32); inside = blur(inside, .6)
    # which square: light → diamonds, dark → black spinels; the frame → platinum with baguettes
    fx = np.floor(X - M); fy = np.floor(Y - M); infield = (X > M) & (X < M + S) & (Y > M) & (Y < M + S)
    light = infield & (((fx + fy) % 2) == 0)
    # diamond: white with a breath of fire (a hue per facet)
    hue = XF._hash(ix, iz, np.full_like(ix, 3), 17)
    fire = np.stack([np.cos(hue * 6.28) * .5 + .5, np.cos(hue * 6.28 - 2.1) * .5 + .5, np.cos(hue * 6.28 - 4.2) * .5 + .5], -1)
    dia = (96 + v[..., None] * 150) * (1 - .1 * fire * (v[..., None] > 1)) + fire * 26 * (v[..., None] > 1)
    spi = 10 + v[..., None] ** 3 * np.array([92, 92, 100], np.float32) + (v[..., None] > 1) * 90
    stone = np.where(light[..., None], dia, spi)
    stone = stone * (1 - girdle[..., None] * .7)
    setting = np.where(light[..., None], PT, BR) * (.86 + (vnoise(h, w, 3, 3, 5) - .5)[..., None] * .2)
    col = setting * (1 - inside[..., None]) + stone * inside[..., None]
    rough = np.where(inside > .5, .02, .16).astype(np.float32); metal = (1 - inside).astype(np.float32)
    # the beads (prongs) between three stones: little bright dots
    hgt = inside * (1 - (dist / r) ** 2) * .6 - (1 - inside) * .2
    # channels between the squares: polished platinum bars
    im, d = canvas()
    for i in range(S + 1):
        d.line([P(M + i, M - .02), P(M + i, M + S + .02)], fill=255, width=round(.024 * PX * SS)); d.line([P(M - .02, M + i), P(M + S + .02, M + i)], fill=255, width=round(.024 * PX * SS))
    ch = done(im)
    col = col * (1 - ch[..., None]) + PT * 1.02 * ch[..., None]; rough = rough * (1 - ch) + .1 * ch; metal = metal * (1 - ch) + ch; hgt = hgt * (1 - ch) + .15 * ch
    # the frame: polished platinum, a row of baguettes round the field, a line of millegrain beads, round stones near the edge
    fr = ~infield
    frc = PT * (.92 + (vnoise(h, w, 1.5, 80, 7) - .5)[..., None] * .06)
    col[fr] = frc[fr]; rough[fr] = .1; metal[fr] = 1; hgt[fr] = 0
    bg, bgn = canvas(); bgl = []   # baguettes: stones .13 × .055, a hair apart, set .1 out from the field
    def bag_row(a, L, n, horiz, ofs):
        for k in range(n):
            t = M - .08 + (k + .5) * L / n
            if horiz: x0, y0, x1, y1 = t - L / n * .44, ofs - .03, t + L / n * .44, ofs + .03
            else: x0, y0, x1, y1 = ofs - .03, t - L / n * .44, ofs + .03, t + L / n * .44
            bgn.rectangle([P(x0, y0), P(x1, y1)], fill=255)
    L = S + .16; n = 64
    for ofs, horiz in [(M - .13, True), (M + S + .13, True), (M - .13, False), (M + S + .13, False)]: bag_row(0, L, n, horiz, ofs)
    bmask = done(bg)
    step = np.where(np.abs(np.where(np.abs(Y - (M - .13)) < .05, X, Y)) % .1 < .05, 1, .7)
    bagc = (150 + 100 * (np.sin(X * 90) * np.sin(Y * 90) * .5 + .5))[..., None] * np.array([1, 1, 1.03], np.float32)
    col = col * (1 - bmask[..., None]) + bagc * bmask[..., None]; rough = rough * (1 - bmask) + .02 * bmask; metal = metal * (1 - bmask); hgt += bmask * .4
    # millegrain: tiny beads along two lines
    im, d = canvas()
    for a in (.05, M - .3):
        L2 = S + 2 * a; k = int(L2 / .035)
        for i in range(k):
            t = M - a + (i + .5) * L2 / k
            for (x, y) in [(t, M - a), (t, M + S + a), (M - a, t), (M + S + a, t)]:
                rr = .011; d.ellipse([P(x - rr, y - rr), P(x + rr, y + rr)], fill=255)
    mg = done(im); hgt += mg * .5; col *= (1 + mg[..., None] * .12)
    # a row of round stones near the edge, between the beads
    ring = (np.abs(np.maximum(np.abs(X - W / 2), np.abs(Y - W / 2)) - (W / 2 - .45)) < .05) & fr
    ix2, iz2, dx2, dy2, dist2 = pave(X, Y, .04, 9)
    v2, g2, _ = stone_shade(ix2, iz2, dx2, dy2, dist2, .04, 13)
    st2 = ring & (dist2 < .036)
    col[st2] = ((110 + v2[..., None] * 140) * (1 - g2[..., None] * .7))[st2]; rough[st2] = .02; metal[st2] = 0; hgt[st2] = .5
    return col, mmap(rough, metal, hgt)
def jewel_side():
    X, Y, Z, Ek = perimeter(W, W, E_RO, SH, SPX)
    h, w = X.shape; hs = h // 4
    PT = np.array([220, 223, 228], np.float32)
    col = np.ones((h, w, 3), np.float32) * PT * (.9 + (vnoise(h, w, 1, 70, 41) - .5)[..., None] * .08)
    rough = np.full((h, w), .12, np.float32); metal = np.ones((h, w), np.float32); hgt = np.zeros((h, w), np.float32)
    A = np.concatenate([X[:hs], Y[hs:2 * hs], W - X[2 * hs:3 * hs], W - Y[3 * hs:]])
    ix, iz, dx, dy, dist = pave(A, Z, .03, 43)
    band = np.abs(Z + .27) < .1
    v, g, _ = stone_shade(ix, iz, dx, dy, dist, .03, 47)
    st = band & (dist < .028)
    spi = 8 + v[..., None] ** 2.2 * np.array([150, 150, 160], np.float32)
    col[st] = (spi * (1 - g[..., None] * .7))[st]; rough[st] = .02; metal[st] = 0; hgt[st] = .5
    edge = blur(((np.abs(Z + .16) < .008) | (np.abs(Z + .38) < .008)).astype(np.float32), .6)
    hgt += edge * .4
    return col, mmap(rough, metal, hgt)

# ---------- 真鍮彫り (brass): black enamel engraved with brass line work; nickel-silver light squares ----------
BRASS2 = (222, 178, 92)
def hatch_band(d, a_in, a_out, kind, seed):
    """a band of engraving round the field between a_in and a_out (out from the field's edge)"""
    R = np.random.default_rng(seed); lw = lambda v: max(1, round(v * PX * SS))
    mid = (a_in + a_out) / 2; hh = (a_out - a_in) * .42
    L = S + 2 * mid
    for side in range(4):
        def at(t, o):   # t along the side, o across (out from the field)
            if side == 0: return P(M - mid + t, M - mid - o)
            if side == 1: return P(M + S + mid + o, M - mid + t)
            if side == 2: return P(M + S + mid - t, M + S + mid + o)
            return P(M - mid - o, M + S + mid - t)
        if kind == 'clusters':   # groups of 3–4 short strokes across the band
            t = .05
            while t < L - .05:
                k = R.integers(3, 5)
                for j in range(k):
                    tt = t + j * .022 + R.uniform(-.003, .003); d.line([at(tt, -hh), at(tt + R.uniform(-.005, .005), hh)], fill=255, width=lw(.007))
                t += k * .022 + .045
        elif kind == 'chevron':
            t = .0; s = .06
            while t < L:
                d.line([at(t, -hh), at(t + s / 2, hh), at(t + s, -hh)], fill=255, width=lw(.006)); t += s
        elif kind == 'dots':
            t = .03
            while t < L:
                x, y = at(t, 0); rr = .012 * PX * SS; d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=255); t += .05
def lotus(d, cx, cy, R0, lwv):
    """an eight-petalled rosette, engraved in outline: petals, an inner ring, a centre of dots"""
    lw = max(1, round(lwv * PX * SS))
    for k in range(8):
        a = k * math.pi / 4
        pts = []
        for t in np.linspace(0, 1, 18):
            rr = R0 * (.28 + .72 * t); wv = math.sin(t * math.pi) * .34 * (1 - t * .3)
            pts.append(P(cx + math.cos(a) * rr - math.sin(a) * wv * R0 * .55, cy + math.sin(a) * rr + math.cos(a) * wv * R0 * .55))
        for t in np.linspace(1, 0, 18):
            rr = R0 * (.28 + .72 * t); wv = -math.sin(t * math.pi) * .34 * (1 - t * .3)
            pts.append(P(cx + math.cos(a) * rr - math.sin(a) * wv * R0 * .55, cy + math.sin(a) * rr + math.cos(a) * wv * R0 * .55))
        d.line(pts, fill=255, width=lw, joint='curve')
        # a vein down the petal
        d.line([P(cx + math.cos(a) * R0 * .36, cy + math.sin(a) * R0 * .36), P(cx + math.cos(a) * R0 * .82, cy + math.sin(a) * R0 * .82)], fill=255, width=lw)
    for rr in (.24, .14):
        r2 = R0 * rr; d.ellipse([P(cx - r2, cy - r2), P(cx + r2, cy + r2)], outline=255, width=lw)
    for k in range(16):   # a ring of dots outside the petals
        a = k * math.pi / 8 + math.pi / 16; rr = R0 * 1.12; r3 = R0 * .03
        d.ellipse([P(cx + math.cos(a) * rr - r3, cy + math.sin(a) * rr - r3), P(cx + math.cos(a) * rr + r3, cy + math.sin(a) * rr + r3)], fill=255)
def brass_top():
    X, Y = coords(); h = w = CW; Z0 = np.zeros_like(X)
    EN = np.array([15, 14, 13], np.float32); NI = np.array([200, 200, 194], np.float32)
    col = np.ones((h, w, 3), np.float32) * EN * (1 + (f3(X, Y, Z0, .4, .4, .4, 3, 3) - .5)[..., None] * .4)
    rough = np.full((h, w), .32, np.float32); metal = np.zeros((h, w), np.float32); hgt = np.zeros((h, w), np.float32)
    # nickel-silver plates on the light squares, set a hair apart; their surface chased with a fine ring-punch matting and faint leaves
    im, d = canvas()
    for f, r, sy, sx in tiles():
        if (f + r) % 2 == 0: d.rectangle([P(M + f + .02, M + r + .02), P(M + f + .98, M + r + .98)], fill=255)
    pm = done(im)
    matt = vnoise(h, w, 1.3, 1.3, 7); leaf = smooth(.6, .78, f3(X * 1.0, Y, Z0, .14, .14, .14, 9, 4))
    plate = NI * (1.04 + (matt - .5)[..., None] * .08 - leaf[..., None] * .03)
    col = col * (1 - pm[..., None]) + plate * pm[..., None]; rough = rough * (1 - pm) + (.46 + leaf * .1) * pm; metal = metal * (1 - pm) + pm * .85
    hgt += pm * ((matt - .5) * .15 - leaf * .25)
    # the engraving (brass shows in the cuts): a lotus on each dark square, an inset line round it; the frame's bands
    im, d = canvas()
    for f, r, sy, sx in tiles():
        if (f + r) % 2 == 1:
            lotus(d, M + f + .5, M + r + .5, .3, .0075)
            d.rectangle([P(M + f + .07, M + r + .07), P(M + f + .93, M + r + .93)], outline=255, width=max(1, round(.006 * PX * SS)))
    ring = lambda a, lw_: d.rectangle([P(M - a, M - a), P(M + S + a, M + S + a)], outline=255, width=max(1, round(lw_ * PX * SS)))
    ring(.03, .01); ring(.06, .006)
    hatch_band(d, .08, .26, 'clusters', 3); ring(.28, .007); ring(.3, .007)
    hatch_band(d, .32, .44, 'chevron', 5); ring(.46, .007)
    hatch_band(d, .48, .62, 'dots', 7); ring(.64, .007); ring(.66, .007)
    hatch_band(d, .68, .8, 'clusters', 9)
    for cx, cy in [(M - .37, M - .37), (M + S + .37, M - .37), (M + S + .37, M + S + .37), (M - .37, M + S + .37)]: lotus(d, cx, cy, .24, .007)
    eg = done(im) * (1 - pm)
    bc = metal_col(h, w, BRASS2, 13) * (1 + (vnoise(h, w, 2, 2, 15) - .5)[..., None] * .3)
    col = col * (1 - eg[..., None]) + bc * eg[..., None]; rough = rough * (1 - eg) + .32 * eg; metal = metal * (1 - eg) + eg; hgt -= eg * .35
    return col, mmap(rough, metal, hgt)
def brass_side():
    X, Y, Z, Ek = perimeter(W, W, E_RO, SH, SPX)
    h, w = X.shape; hs = h // 4
    col = np.ones((h, w, 3), np.float32) * np.array([15, 14, 13], np.float32) * (1 + (f3(X, Y, Z, .4, .4, .3, 51, 3) - .5)[..., None] * .4)
    rough = np.full((h, w), .32, np.float32); metal = np.zeros((h, w), np.float32); hgt = np.zeros((h, w), np.float32)
    A = np.concatenate([X[:hs], Y[hs:2 * hs], W - X[2 * hs:3 * hs], W - Y[3 * hs:]])
    m = np.zeros((h, w), np.float32)
    for z in (-.1, -.115, -.4, -.415): m = np.maximum(m, (np.abs(Z - z) < .004).astype(np.float32))
    band = (Z < -.135) & (Z > -.38)
    grp = (A / .14) % 1; strokes = ((grp < .5) & (((grp * 14) % 1) < .3)).astype(np.float32)   # clusters of strokes
    m = np.maximum(m, (band & (strokes > 0)).astype(np.float32))
    m = blur(m, .5)
    bc = metal_col(h, w, BRASS2, 55)
    col = col * (1 - m[..., None]) + bc * m[..., None]; rough = rough * (1 - m) + .32 * m; metal = metal * (1 - m) + m; hgt -= m * .35
    return col, mmap(rough, metal, hgt)

# ---------- ネオン (neon): smoked acrylic, engraved rings in the light squares lit from the edge (cyan far → magenta near) ----------
def glow_col(Y):
    t = np.clip(Y / W, 0, 1)[..., None]
    C = np.array([70, 225, 255], np.float32); Mg = np.array([255, 70, 200], np.float32)
    return C * (1 - t) + Mg * t
def neon_top():
    X, Y = coords(); h = w = CW; Z0 = np.zeros_like(X)
    base = np.ones((h, w, 3), np.float32) * np.array([9, 10, 16], np.float32)
    G = glow_col(Y)
    # light squares: frosted, engraved with concentric rings (lit), the dark squares clear smoke
    fx, fy = np.floor(X - M), np.floor(Y - M); infield = (X > M) & (X < M + S) & (Y > M) & (Y < M + S)
    light = (infield & (((fx + fy) % 2) == 0)).astype(np.float32)
    cx, cy = M + fx + .5, M + fy + .5; rr = np.hypot(X - cx, Y - cy)
    rings = np.clip(1 - np.abs(((rr / .065) % 1) - .5) / .09, 0, 1) * (rr < .46)
    frost = light * .14
    glow = light * (rings * .85 + .1) + frost
    # the field's edge and the outer rim: bright lit lines
    edge = np.maximum(np.abs(X - W / 2), np.abs(Y - W / 2))
    ln = np.exp(-((edge - S / 2 - .05) / .012) ** 2) * 1.2 + np.exp(-((edge - W / 2 + .06) / .016) ** 2) * 1.4 + np.exp(-((edge - S / 2 - .38) / .006) ** 2) * .5
    glow = glow + ln
    col = base + G * glow[..., None] * .95
    rough = np.where(light > .5, .35, .03).astype(np.float32); metal = np.zeros((h, w), np.float32)
    hgt = -light * rings * .2
    return col, mmap(rough, metal, hgt)
def neon_side():
    X, Y, Z, Ek = perimeter(W, W, E_RO, SH, SPX)
    h, w = X.shape
    G = glow_col(Y)
    lit = np.exp(-((Z + .02) / .03) ** 2) * 1.3 + np.exp(-((Z + .46) / .02) ** 2) * .9 + .12
    col = np.array([9, 10, 16], np.float32) + G * lit[..., None]
    return col, mmap(np.full((h, w), .04, np.float32), np.zeros((h, w), np.float32))

BOARDS = {'ceramic': (ceramic_top, ceramic_side), 'jewel': (jewel_top, jewel_side), 'brass': (brass_top, brass_side), 'neon': (neon_top, neon_side)}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    names = [a for a in sys.argv[1:] if not a.startswith('-')] or list(BOARDS)
    for n in names:
        top, side = BOARDS[n]
        c, m = top(); put('top-' + n, c, m)
        c, m = side(); put('side-' + n, c, m)
    if '--nomobile' not in sys.argv:
        import subprocess as _sp
        _sp.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mobile-tex.py')])

# Writes the xiangqi 3D boards' and pieces' pictures (images/atlas/xiangqi3d/*.webp), 2026-11-14.
#   python3 atlas/tools/xiangqi-tex.py [name …]      (numpy, scipy, Pillow; the fonts: see xqtex_glyph.py)
# Boards (top / side / end, each with a "-m" map: R height (bump), G roughness, B metalness):
#   kaya   榧 (the shogi board's picture), ink lines        walnut  胡桃の矧ぎ板, V-grooved lines, a brass strip inlaid
#   hongmu 紅木, gold wire inlaid                           raden   黒漆に螺鈿 (shell strips, chips, flowers)
#   jade   翡翠, gold inlaid
# Pieces: pc-<set> (+ -m): 7 × 2 faces (row 0 red, row 1 black; columns 帥仕相傌俥炮兵), each the face disc in a 320 px cell.
import os, sys, math
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from xqtex_lib import vnoise, fbm, smooth, mixc, save
from xqtex_wood import wood
from xqtex_glyph import glyph
from xqtex_field import wood3, jade3, perimeter, n3, f3
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'images', 'atlas', 'xiangqi3d')
# the board (atlas/models/xiangqi.js)
u, MG, FR, H = .9, .45, .72, .42
W = 8 * u + 2 * MG + 2 * FR; D = 9 * u + 2 * MG + 2 * FR; HB = H + .04
CW = 2048; PX = CW / W; CH = round(D * PX)
SS = 2   # masks are drawn at twice the size, then reduced
ox = oy = FR + MG
def X0(i): return ox + i * u
def Y0(j): return oy + j * u

# ---------- masks ----------
def canvas(w=CW, h=CH): im = Image.new('L', (w * SS, h * SS), 0); return im, ImageDraw.Draw(im)
def done(im, w=CW, h=CH): return np.asarray(im.resize((w, h), Image.LANCZOS), np.float32) / 255
def P(x, y): return (x * PX * SS, y * PX * SS)
def seg(d, a, b, lw):
    d.line([P(*a), P(*b)], fill=255, width=max(1, round(lw * PX * SS)))
def grid_segments():
    S = []
    for j in range(10): S.append(((X0(0), Y0(j)), (X0(8), Y0(j))))
    for i in range(9):
        if i in (0, 8): S.append(((X0(i), Y0(0)), (X0(i), Y0(9))))
        else: S.append(((X0(i), Y0(0)), (X0(i), Y0(4)))); S.append(((X0(i), Y0(5)), (X0(i), Y0(9))))
    S += [((X0(3), Y0(0)), (X0(5), Y0(2))), ((X0(5), Y0(0)), (X0(3), Y0(2))), ((X0(3), Y0(7)), (X0(5), Y0(9))), ((X0(5), Y0(7)), (X0(3), Y0(9)))]
    a, b = u * .08, u * .22
    for i, j in [(1, 2), (7, 2), (1, 7), (7, 7), (0, 3), (2, 3), (4, 3), (6, 3), (8, 3), (0, 6), (2, 6), (4, 6), (6, 6), (8, 6)]:
        for dx in (-1, 1):
            if (dx < 0 and i == 0) or (dx > 0 and i == 8): continue
            for dy in (-1, 1):
                S.append(((X0(i) + dx * a, Y0(j) + dy * b), (X0(i) + dx * a, Y0(j) + dy * a)))
                S.append(((X0(i) + dx * a, Y0(j) + dy * a), (X0(i) + dx * b, Y0(j) + dy * a)))
    return S
def rect_segments(pad):
    x0, y0, x1, y1 = X0(0) - pad, Y0(0) - pad, X0(8) + pad, Y0(9) + pad
    return [((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (x0, y1)), ((x0, y1), (x0, y0))]
def lines_mask(lw, borders=(), segs=None):
    im, d = canvas()
    for a, b in (segs if segs is not None else grid_segments()): seg(d, a, b, lw)
    for pad, blw in borders:
        for a, b in rect_segments(pad): seg(d, a, b, blw)
    # square the ends and corners: a filled square at each joint
    for a, b in (segs if segs is not None else grid_segments()):
        for p in (a, b):
            r = lw / 2 * PX * SS; x, y = P(*p); d.rectangle([x - r, y - r, x + r, y + r], fill=255)
    for pad, blw in borders:
        for a, _ in rect_segments(pad):
            r = blw / 2 * PX * SS; x, y = P(*a); d.rectangle([x - r, y - r, x + r, y + r], fill=255)
    return done(im)
WORD_I = [1.4, 2.6, 5.4, 6.6]
def words_mask(chars, style='kai', size=.62, bold=None):
    im, d = canvas()
    for n, ch in enumerate(chars):
        g = glyph(ch, style, round(size * u * PX * SS), bold); x, y = P(X0(WORD_I[n]), Y0(4.5))
        im.paste(255, (round(x - g.size[0] / 2), round(y - g.size[1] / 2)), g)
    return done(im)
def coords(w=CW, h=CH, px=PX):
    x = (np.arange(w, dtype=np.float32) + .5) / px; y = (np.arange(h, dtype=np.float32) + .5) / px
    return np.meshgrid(x, y)
def blur(a, s): return ndimage.gaussian_filter(a, s)
def put(path, rgb, m=None, q=88):
    save(rgb, os.path.join(OUT, path + '.webp'), q)
    if m is not None: save(m, os.path.join(OUT, path + '-m.webp'), 92)
def mmap(h, rough, metal, hgt=None):
    """R height (128 flat), G roughness, B metalness: arrays 0..1 (height: offset from flat, ±1 = ±127)"""
    R = 128 + (hgt if hgt is not None else np.zeros_like(rough)) * 127
    return np.stack([R, rough * 255, metal * 255], -1)

# ---------- metal: gold / brass inlay (a fine brushed texture, flush with the ground; a dark glue seam round it) ----------
def metal_col(h, w, base, seed, along='x'):
    br = vnoise(h, w, 1.2, 60, seed) if along == 'x' else vnoise(h, w, 60, 1.2, seed)
    cl = fbm(h, w, 90, 90, seed + 5, 3)
    k = .86 + (br - .5) * .16 + (cl - .5) * .22
    return np.array(base, np.float32)[None, None, :] * k[..., None]
def inlay(col, rough, metal, hgt, mask, base, r_metal=.28, seed=1, seam=.6):
    """set metal into a ground: mask 0..1 (antialiased). The seam: a hair of dark glue just outside the edge."""
    h, w = mask.shape
    edge = np.clip(blur(mask, 1.0) - mask, 0, 1) * 2.2
    col *= (1 - np.clip(edge, 0, 1) * seam)[..., None]
    mc = metal_col(h, w, base, seed)
    col[:] = col * (1 - mask[..., None]) + mc * mask[..., None]
    rough[:] = rough * (1 - mask) + r_metal * mask; metal[:] = metal * (1 - mask) + mask
    hgt[:] = hgt - edge * .25   # the seam a hair down
GOLD = (238, 196, 110); BRASS = (214, 168, 88)

# ---------- 榧 ----------
def kaya_top():
    im = Image.open(os.path.join(ROOT, 'images', 'atlas', 'shogi-kaya.webp')).convert('RGB').resize((CW, CH), Image.LANCZOS)
    col = np.asarray(im, np.float32) * (1 - .7 + .7 * np.array([232, 186, 112], np.float32) / 255)
    h, w = CH, CW
    rough = np.full((h, w), .55, np.float32); metal = np.zeros((h, w), np.float32)
    hgt = (blur(col.mean(-1), 1.2) / 255 - .5) * .06   # a breath of the grain in the bump
    L = lines_mask(.03, [(.13, .055), (.21, .018)]); Wd = words_mask('楚河漢界', 'kai', .6)
    ink = np.clip(L + Wd, 0, 1)
    bleed = blur(ink, 1.4) * .25   # the ink soaks a hair into the wood
    INK = np.array([24, 14, 8], np.float32)
    col = col * (1 - np.clip(ink * .94 + bleed * .3, 0, 1)[..., None]) + INK * (ink * .94)[..., None]
    rough = rough * (1 - ink) + .3 * ink; hgt += blur(ink, .8) * .12   # 盛り上げ: the lacquer stands a little
    return col, mmap(h, rough, metal, hgt)
def vignette(h, w, k):
    X, Y = np.meshgrid(np.linspace(-1, 1, w), np.linspace(-1, 1, h)); r = np.sqrt(X ** 2 + Y ** 2) / math.sqrt(2)
    return 1 - smooth(.45, 1.05, r) * k

# ---------- the long sides (left / right: along D) and the ends (near / far: along W) ----------
# a side picture: horizontal = along the edge (0..len), vertical = from the top edge (0) down over the round-over to the floor (SH)
SH = .52; SPX = 200
def side_coords(length):
    w = round(length * SPX); h = round(SH * SPX)
    a = (np.arange(w, dtype=np.float32) + .5) / SPX; z = -(np.arange(h, dtype=np.float32) + .5) / SPX
    A, Z = np.meshgrid(a, z); return A, Z, h, w

# ---------- planks ----------
WAL_PL = [(0, 1.9, dict(cx=.9, cz=-1.6, tz=.05, shade=0)), (1.9, 3.8, dict(cx=3.1, cz=-2.4, tz=-.04, shade=.1)),
          (3.8, 5.75, dict(cx=4.9, cz=-1.3, tz=.03, shade=-.07)), (5.75, 7.65, dict(cx=6.5, cz=-3, tz=-.03, shade=.05)),
          (7.65, W + .01, dict(cx=8.7, cz=-1.9, tz=.04, shade=-.1))]
HM_PL = [(0, 3.2, dict(cx=1.4, cz=-2.6, tz=.04, shade=0, warp=.25)), (3.2, 6.35, dict(cx=4.9, cz=-3.4, tz=-.05, shade=.05, warp=.25)),
         (6.35, W + .01, dict(cx=8.1, cz=-2.2, tz=.03, shade=-.04, warp=.25))]
def planked(sp, planks, X, Y, Z, h, w, seed, along='y', end=False, joint=True, axis=None):
    """axis: the array along which the planks lie (X on the top and the ends; on a long side: one plank only)"""
    col = np.zeros((h, w, 3), np.float32); A = X if axis is None else axis
    for k, (a, b, pl) in enumerate(planks):
        m = (A >= a) & (A < b)
        if not m.any(): continue
        c = wood(X, Y, Z, sp, pl, h, w, seed + k * 7, along, end); col[m] = c[m]
    if joint:
        for a, b, pl in planks[1:]:
            j = np.exp(-((A - a) * PX / .9) ** 2); col *= (1 - .5 * j)[..., None]
    return col

def walnut_top():
    X, Y = coords(); h, w = X.shape
    col = wood3(X, Y, np.zeros_like(X), 'walnut', WALP, 100)
    rough = np.full((h, w), .5, np.float32) + (vnoise(h, w, 400, 400, 7) - .5) * .1; metal = np.zeros((h, w), np.float32); hgt = np.zeros((h, w), np.float32)
    # V grooves: a soft V in the height, the floor darker (cut fibres, shadow, old wax)
    L = lines_mask(.05, [(.14, .04)]); Wd = words_mask('楚河漢界', 'kai', .58, 7)
    G = np.clip(L + Wd, 0, 1); V = blur(G, 2.2) * .7 + blur(G, .8) * .3
    hgt -= V * .9
    col *= (1 - V * .62)[..., None]; col = col * (1 - V[..., None] * .2) + np.array([40, 24, 14], np.float32) * (V[..., None] * .2)
    rough = rough + V * .25
    # the brass strip round the field
    im, d = canvas()
    for a, b in rect_segments(.42): seg(d, a, b, .065)
    for a, _ in rect_segments(.42): r = .0325 * PX * SS; x, y = P(*a); d.rectangle([x - r, y - r, x + r, y + r], fill=255)
    inlay(col, rough, metal, hgt, done(im), BRASS, .32, 11)
    return col, mmap(h, rough, metal, hgt)
def wood_sides(sp, planks, seed=300, sidepl=None, endpl=None):
    """long side (left / right; length D) and end (near / far; length W) for a board whose grain runs along D"""
    out = {}
    # the long side: the outer plank's edge: rings cut lengthwise (straight lines with long arches)
    A, Z, h, w = side_coords(D)
    out['side'] = wood(np.zeros_like(A), A, Z, sp, sidepl or planks[0][2], h, w, seed, along='x')
    # the end: each plank's rings round its own centre
    A, Z, h, w = side_coords(W)
    out['end'] = planked(sp, planks, A, np.zeros_like(A), Z, h, w, seed + 50, end=True, axis=A) if endpl is None else wood(A, np.zeros_like(A), Z, sp, endpl, h, w, seed + 50, endgrain=True)
    return out
def side_m(img, rough, end=False):
    h, w, _ = img.shape
    hg = (blur(img.mean(-1), .8) / 255 - .5) * (.18 if end else .1)
    return mmap(h, np.full((h, w), rough + (.12 if end else 0), np.float32), np.zeros((h, w), np.float32), hg)

# ---------- 紅木 ----------
def hongmu_top():
    X, Y = coords(); h, w = X.shape
    col = wood3(X, Y, np.zeros_like(X), 'hongmu', HMP, 200)
    rough = np.full((h, w), .3, np.float32); metal = np.zeros((h, w), np.float32); hgt = np.zeros((h, w), np.float32)
    L = lines_mask(.024, [(.13, .05), (.2, .016)]); Wd = words_mask('楚河汉界', 'kai', .62)
    inlay(col, rough, metal, hgt, np.clip(L + Wd, 0, 1), GOLD, .26, 21, .7)
    return col, mmap(h, rough, metal, hgt)

# ---------- 翡翠 ----------
def jade_field(h, w, seed, dark=False):
    q = fbm(h, w, 260, 260, seed, 5); r = fbm(h, w, 120, 140, seed + 7, 5)
    warp = (q - .5) * 3
    A = np.array([46, 128, 84], np.float32); B = np.array([10, 66, 38], np.float32); C = np.array([168, 214, 182], np.float32); E = np.array([6, 40, 22], np.float32)
    t = smooth(.2, .8, r + (q - .5) * .5) * .38 + .22
    col = A * (1 - t[..., None]) + B * t[..., None]
    milk = smooth(.5, .85, fbm(h, w, 200, 260, seed + 13, 5) + (q - .5) * .3)
    col = col * (1 - milk[..., None] * .22) + C * (milk[..., None] * .22)
    fib = vnoise(h, w, 3, 3, seed + 17) - .5; col *= (1 + fib * .1)[..., None]   # the fine felted crystals
    # veins: thin dark lines following the clouds
    v = np.abs(np.sin((fbm(h, w, 500, 500, seed + 19, 4) * 9 + warp) * math.pi)); vein = (1 - smooth(0, .06, v)) * smooth(.4, .7, fbm(h, w, 300, 300, seed + 23, 3))
    col = col * (1 - vein[..., None] * .45) + E * (vein[..., None] * .45)
    # crystals: tiny bright flecks; deep emerald patches
    sp = vnoise(h, w, 2.2, 2.2, seed + 29); col += (smooth(.82, .95, sp) * 22)[..., None] * np.array([.7, 1, .8], np.float32)
    em = smooth(.62, .8, fbm(h, w, 160, 160, seed + 31, 4)); col = col * (1 - em[..., None] * .35) + np.array([0, 96, 52], np.float32) * (em[..., None] * .35)
    return col
def jade_top():
    h, w = CH, CW
    X, Y = coords(); col = jade3(X, Y, np.zeros_like(X), 400)
    rough = np.full((h, w), .1, np.float32); metal = np.zeros((h, w), np.float32); hgt = (blur(fbm(h, w, 200, 200, 409, 3), 2) - .5) * .05
    L = lines_mask(.024, [(.13, .05), (.2, .016)]); Wd = words_mask('楚河漢界', 'kai', .62)
    inlay(col, rough, metal, hgt, np.clip(L + Wd, 0, 1), GOLD, .24, 41, .75)
    return col, mmap(h, rough, metal, hgt)

# ---------- 螺鈿 ----------
def shell_field(h, w, seed):
    """the nacre itself: a pale ground with fine wavy growth layers, the colour sliding pink → green → blue → silver"""
    q = fbm(h, w, 70, 70, seed, 4)
    layers = np.sin((fbm(h, w, 40, 120, seed + 3, 4) * 26 + q * 6) * math.pi) * .5 + .5
    hue = fbm(h, w, 90, 90, seed + 7, 4) * 3 + q
    rb = np.stack([.5 + .5 * np.cos(2 * math.pi * (hue + o)) for o in (0, .33, .67)], -1)
    base = np.array([214, 220, 222], np.float32)
    sheen = (.35 + .65 * smooth(.3, .75, fbm(h, w, 60, 60, seed + 11, 3)))[..., None]   # where the colour shows at all
    col = base * (.72 + .28 * layers[..., None]) * (1 - sheen * .5 + sheen * .5 * rb) + np.array([0, 6, 10], np.float32)
    return np.clip(col, 0, 255)
def chips(mask, seed, size=14):
    """break a shell area into chips: each its own brightness and hue, dark hairline cracks between them"""
    h, w = mask.shape; R = np.random.default_rng(seed)
    n = max(8, int(mask.sum() / (size * size)))
    ys, xs = np.nonzero(mask > .3)
    if len(ys) == 0: return np.zeros((h, w), np.int32), np.zeros((h, w), np.float32)
    pick = R.integers(0, len(ys), n); seeds = np.zeros((h, w), np.int32); seeds[ys[pick], xs[pick]] = np.arange(1, n + 1)
    dist, (iy, ix) = ndimage.distance_transform_edt(seeds == 0, return_indices=True)
    lab = seeds[iy, ix]
    crack = np.zeros((h, w), np.float32)
    crack[:, 1:] += lab[:, 1:] != lab[:, :-1]; crack[1:, :] += lab[1:, :] != lab[:-1, :]
    return lab, np.clip(blur(np.clip(crack, 0, 1), .5) * 1.6, 0, 1)
def raden_top():
    h, w = CH, CW
    base = np.array([16, 12, 11], np.float32)
    col = np.ones((h, w, 3), np.float32) * base * (.85 + .3 * fbm(h, w, 300, 300, 501, 3))[..., None]
    rough = np.full((h, w), .12, np.float32); metal = np.zeros((h, w), np.float32); hgt = np.zeros((h, w), np.float32)
    sh = shell_field(h, w, 510)
    # strips: the lines cut into segments (each strip its own piece of shell), the words and flowers of chips
    L = lines_mask(.042, [(.13, .06), (.21, .022)])
    seg_id = segment_ids(h, w, 520)
    lab, crack = chips(L, 530, 60)   # a strip is long: chips along it
    Wd = words_mask('楚河漢界', 'mingb', .64); labW, crW = chips(Wd, 540, 12)
    Fl = flowers_mask(); labF, crF = chips(Fl, 550, 10)
    S = np.clip(L + Wd + Fl, 0, 1)
    labs = lab + (labW + 5000) * (Wd > .3) + (labF + 9000) * (Fl > .3)
    R = np.random.default_rng(561); bright = R.uniform(.72, 1.15, labs.max() + 2).astype(np.float32); hue = R.uniform(-1, 1, labs.max() + 2).astype(np.float32)
    k = bright[labs]; hs = hue[labs]
    tint = np.stack([1 + hs * .12, 1 - np.abs(hs) * .05, 1 - hs * .12], -1)
    shc = sh * k[..., None] * tint
    cr = np.clip(crack * (L > .3) + crW + crF, 0, 1)
    shc = shc * (1 - cr[..., None] * .35)
    col = col * (1 - S[..., None]) + shc * S[..., None]
    edge = np.clip(blur(S, 1.0) - S, 0, 1) * 2; col *= (1 - edge * .5)[..., None]
    rough = rough * (1 - S) + .18 * S; metal = metal * (1 - S) + .35 * S   # (metal .35 marks the shell for the shader)
    hgt = hgt - cr * .15 * S - edge * .1
    return col, mmap(h, rough, metal, hgt)
def segment_ids(h, w, seed): return None
def flowers_mask():
    """plum sprays of shell in the frame: the four corners, a small one mid-side"""
    im, d = canvas(); R = np.random.default_rng(77)
    def petal_flower(cx, cy, r):
        rot = R.uniform(0, math.pi)
        for k in range(5):
            t = rot + k * 2 * math.pi / 5; px, py = cx + math.cos(t) * r * .55, cy + math.sin(t) * r * .55
            x, y = P(px, py); rr = r * .46 * PX * SS; d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=255)
        x, y = P(cx, cy); rr = r * .18 * PX * SS; d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=0)
    def leaf(cx, cy, ln, ang):
        pts = []
        for s in np.linspace(0, 1, 14): pts.append((s, math.sin(s * math.pi) * .32))
        poly = [(cx + math.cos(ang) * s * ln - math.sin(ang) * v * ln, cy + math.sin(ang) * s * ln + math.cos(ang) * v * ln) for s, v in pts]
        poly += [(cx + math.cos(ang) * s * ln + math.sin(ang) * v * ln, cy + math.sin(ang) * s * ln - math.cos(ang) * v * ln) for s, v in pts[::-1]]
        d.polygon([P(*p) for p in poly], fill=255)
    def spray(cx, cy, sc, ang):
        # a short angular branch (shell too), flowers and buds on it
        pts = [(cx, cy)]; a = ang
        for k in range(4):
            a += R.uniform(-.25, .25); x, y = pts[-1]; pts.append((x + math.cos(a) * .2 * sc, y + math.sin(a) * .2 * sc))
        for k in range(len(pts) - 1): seg(d, pts[k], pts[k + 1], .03 * sc * (1 - k * .15))
        for k, (x, y) in enumerate(pts[1:]):
            if k % 2 == 0: petal_flower(x, y, .13 * sc)
            else: leaf(x, y, .2 * sc, a + (1 if k % 4 == 1 else -1) * 1.1)
        bx, by = pts[-1]; x, y = P(bx + math.cos(a) * .1 * sc, by + math.sin(a) * .1 * sc); rr = .035 * sc * PX * SS; d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=255)
    m = .4
    spray(m, m, 1.3, .78); spray(W - m, m, 1.3, math.pi - .78); spray(m, D - m, 1.3, -.78); spray(W - m, D - m, 1.3, math.pi + .78)
    spray(.22, D / 2 + .5, .9, -1.57); spray(W - .22, D / 2 - .5, .9, 1.57)
    spray(W / 2 - .5, .22, .9, 0); spray(W / 2 + .5, D - .22, .9, math.pi)
    m = done(im); X, Y = coords(); return m * (X > .08) * (X < W - .08) * (Y > .08) * (Y < D - .08)
def raden_sides():
    out = {}
    for name, length in (('side', D), ('end', W)):
        A, Z, h, w = side_coords(length)
        col = np.ones((h, w, 3), np.float32) * np.array([16, 12, 11], np.float32) * (.85 + .3 * fbm(h, w, 60, 300, 600, 3))[..., None]
        rough = np.full((h, w), .12, np.float32); metal = np.zeros((h, w), np.float32); hgt = np.zeros((h, w), np.float32)
        m = ((np.abs(Z + .12) < .012) | (np.abs(Z + .4) < .012)).astype(np.float32); m = blur(m, .6)
        sh = shell_field(h, w, 610 + len(name)); lab = (A / .45).astype(np.int32)
        R = np.random.default_rng(620); k = R.uniform(.75, 1.15, lab.max() + 2)[lab]
        joint = np.exp(-(((A / .45) % 1) * .45 * SPX) ** 2 / 1.5)
        shc = sh * k[..., None] * (1 - joint[..., None] * .6)
        col = col * (1 - m[..., None]) + shc * m[..., None]; rough = rough * (1 - m) + .18 * m; metal = metal * (1 - m) + .35 * m
        out[name] = (col, mmap(h, rough, metal, hgt))
    return out
def jade_sides():
    out = {}
    for name, length in (('side', D), ('end', W)):
        A, Z, h, w = side_coords(length)
        col = jade_field(h, w, 700 + len(name)); out[name] = (col, mmap(h, np.full((h, w), .1, np.float32), np.zeros((h, w), np.float32)))
    return out

# ---------- the four faces as one picture (2026-11-14 v3): far / right / near / left strips, top → bottom; see xqtex_field.perimeter ----------
WALP = dict(cx=5.4, cz=-4.4, tx=.02, tz=.05, wob=.5)
HMP = dict(cx=3.6, cz=-5, tx=-.04, wob=.5)
E_RO = .06
def perim():
    return perimeter(W, D, E_RO, SH, 246)
def m_side(col, rough, endk, met=None, hgt=None):
    h, w, _ = col.shape
    hg = (blur(col.mean(-1), .8) / 255 - .5) * (.1 + .08 * endk) if hgt is None else hgt
    return mmap(h, rough + .12 * endk, met if met is not None else np.zeros((h, w), np.float32), hg)
def wood_perim(sp, P, seed, rough):
    X, Y, Z, Ek = perim(); col = wood3(X, Y, Z, sp, P, seed, Ek)
    return {'side': (col, m_side(col, np.full(X.shape, rough, np.float32), Ek))}
def kaya_perim():
    """the top is the picture: the ends carry its edge rows down (柾目: the rings stand upright, so the lines run straight on down);
       the long sides: the field's tangential face, its tone matched to the picture's edge, the round-over taken from the picture"""
    top, _ = kaya_top(); X, Y, Z, Ek = perim(); h, w = X.shape
    col = wood3(X, Y, Z, 'kaya', dict(cx=-24, cz=-.26, wob=.12, rwarp=.02), 31, Ek)
    ix = np.clip((X * PX).astype(int), 0, CW - 1); iy = np.clip((Y * PX).astype(int), 0, CH - 1)
    edgeR = {0: top[2:10].mean(0), 2: top[-10:-2].mean(0)}; edgeC = {1: top[:, -10:-2].mean(1), 3: top[:, 2:10].mean(1)}
    hs = h // 4; dist = np.meshgrid(np.arange(w), (np.arange(h) % hs + .5) / 246)[1]
    ro = smooth(E_RO * 1.6, E_RO * .4, dist)   # 1 on the round-over, fading out below it
    out = col.copy()
    for k in range(4):
        sl = slice(k * hs, (k + 1) * hs)
        if k in (0, 2):   # the ends: the edge row's columns, a little wobble, the end grain's dots, a shade darker
            jit = ((n3(X[sl], Y[sl], Z[sl], .05, 1, .08, 41 + k) - .5) * 3 * PX / PX).astype(int)
            c = edgeR[k][np.clip(ix[sl] + jit, 0, CW - 1)]
            dots = (n3(X[sl], Y[sl] + 3, Z[sl], .006, .006, .006, 47) - .5) * .12
            out[sl] = c * (1 + dots[..., None]) * (1 - Ek[sl][..., None] * .12)
        else:   # the long sides: the field, scaled to the picture's tone, the picture itself on the round-over
            ref = edgeC[k][iy[sl]]; Xs, Ys, Zs = X[sl], Y[sl], Z[sl]
            # 柾目's long side is the tangential face of one or two rings: fibres and long soft bands along it, no figure
            sh = 1 + (n3(Xs, Ys, Zs, .3, .5, .006, 51) - .5) * .14 + (f3(Xs, Ys, Zs, .5, 3, .05, 53, 3) - .5) * .22 + (n3(Xs, Ys, Zs, .3, 1.6, .02, 55) - .5) * .12
            c = ref.reshape(-1, 3).mean(0) * sh[..., None]
            out[sl] = c * (1 - ro[sl][..., None]) + ref * ro[sl][..., None]
    return {'side': (out, m_side(out, np.full(X.shape, .5, np.float32), Ek))}
def jade_perim():
    X, Y, Z, Ek = perim(); col = jade3(X, Y, Z, 400)
    return {'side': (col, mmap(X.shape[0], np.full(X.shape, .1, np.float32), np.zeros(X.shape, np.float32)))}
def raden_perim():
    X, Y, Z, Ek = perim(); h, w = X.shape
    col = np.ones((h, w, 3), np.float32) * np.array([16, 12, 11], np.float32) * (.85 + .3 * f3(X, Y, Z, 1, 1, .3, 600, 3))[..., None]
    rough = np.full((h, w), .12, np.float32); metal = np.zeros((h, w), np.float32)
    m = ((np.abs(Z + .14) < .013) | (np.abs(Z + .4) < .013)).astype(np.float32); m = blur(m, .6)
    sh = shell_field(h, w, 610)
    a = X + Y   # the strips run on round the corners: a piece every ~.45
    lab = (a / .45).astype(np.int32); R = np.random.default_rng(620); k = R.uniform(.75, 1.15, lab.max() + 2)[lab]
    joint = np.exp(-(((a / .45) % 1) * .45 * 246) ** 2 / 1.5)
    shc = sh * k[..., None] * (1 - joint[..., None] * .6)
    col = col * (1 - m[..., None]) + shc * m[..., None]; rough = rough * (1 - m) + .18 * m; metal = metal * (1 - m) + .35 * m
    return {'side': (col, mmap(h, rough, metal))}

BOARDS = {}
def board(name, top, sides):
    BOARDS[name] = (top, sides)
board('kaya', kaya_top, kaya_perim)
board('walnut', walnut_top, lambda: wood_perim('walnut', WALP, 100, .5))
board('hongmu', hongmu_top, lambda: wood_perim('hongmu', HMP, 200, .3))
board('raden', raden_top, raden_perim)
board('jade', jade_top, jade_perim)

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    names = sys.argv[1:] or list(BOARDS) + ['pieces']
    for n in names:
        if n in BOARDS:
            top, sides = BOARDS[n]; c, m = top(); put('top-' + n, c, m)
            for k, (c, m) in sides().items(): put(k + '-' + n, c, m)
        elif n.startswith('pc'):
            import xqtex_pieces; xqtex_pieces.run(n[3:] or None, put)

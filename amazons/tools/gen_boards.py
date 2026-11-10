# Amazons: the 2D boards (10x10 squares baked into one picture) and the frames around them
#   img/bd-<key>.webp (1200 px, the squares only) and img/fr-<key>.webp (the frame's surface, stretched over .frame)
# python3 tools/gen_boards.py   (numpy + Pillow; deterministic)
#   temple  テミスキュラの神殿: Carrara and verde antico marble squares, gold inlay lines, a polished slab
#   ruins   密林の遺跡: weathered limestone and basalt flags, moss in the joints, roots, morning haze
#   vase    アマゾノマキアの壺絵: fired clay and black glaze squares, incised lines, palmettes at the crossings
#   iron    鋼と炎: blued and blackened steel plates, rivets, ember light in the seams
import math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

S = 1200; N = 10; U = S // N
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img')
rng = np.random.default_rng(20261110)

def up(a, size):
    return np.asarray(Image.fromarray(a.astype(np.float32), 'F').resize(size, Image.BICUBIC), dtype=np.float32)   # (float: uint8 steps show as hatching)
def noise(w, h, cells, seed):
    r = np.random.default_rng(seed).random((max(2, h * cells // w), cells)).astype(np.float32)
    return up(r, (w, h))
def fbm(w, h, seed, octaves=((6, .5), (14, .26), (34, .14), (90, .07), (220, .03))):
    acc = np.zeros((h, w), np.float32)
    for k, (c, a) in enumerate(octaves): acc += noise(w, h, c, seed + k * 101) * a
    return acc / sum(a for _, a in octaves)
def col(c): return np.array(c, np.float32)[None, None, :] / 255
def lerp(a, b, t): return a + (b - a) * t[..., None]
def save(arr, name, q=88):
    im = Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8))
    im.save(os.path.join(OUT, name), 'WEBP', quality=q, method=6)
    print(name, os.path.getsize(os.path.join(OUT, name)))

def marble(w, h, seed, base, vein, vein2, scale=1.0, sharp=10):
    """veined marble: veins run in one general direction, bent by smooth turbulence (classic sin-turbulence), with
    thin branching hair veins (level lines of another noise) and a soft halo; cloudy patches underneath"""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32) / max(w, h)
    soft = ((3, .5), (6, .28), (13, .14), (28, .08))
    c = np.broadcast_to(col(base), (h, w, 3)).copy()
    cloud = fbm(w, h, seed + 5, ((4, .6), (10, .4)))
    c = lerp(c, col(vein2), np.clip((cloud - .42) * 1.4, 0, .5))
    t = fbm(w, h, seed, soft)
    s1 = np.abs(np.sin((x * .8 + y * 1.9) * 3.2 * scale + t * 10))
    main = np.exp(-s1 / .035) * (.45 + .55 * fbm(w, h, seed + 9, ((4, 1.0),)))         # thick-and-thin along the vein
    c = lerp(c, col(vein), np.clip(np.exp(-s1 / .25) * .22, 0, 1))                    # the halo
    c = lerp(c, col(vein), np.clip(main * 1.1, 0, 1))
    for k, (cells, thick, amt) in enumerate(((int(7 * scale), .004, .55), (int(14 * scale), .0025, .4))):
        f = fbm(w, h, seed + 20 + k * 13, tuple((max(2, int(c0 * cells / 3)), a0) for c0, a0 in soft))
        d = np.abs(f - .5) / thick
        c = lerp(c, col(vein2), np.clip(np.exp(-d * d) * amt * (fbm(w, h, seed + 30 + k, ((5, 1.0),)) > .45), 0, 1))
    c += (fbm(w, h, seed + 3, ((60, .5), (160, .5)))[..., None] - .5) * .03
    return c

def slabs(big, seed):
    """cut the 10x10 squares out of a large slab at random places, turned and flipped (every square its own stone)"""
    r = np.random.default_rng(seed); H, W = big.shape[:2]; out = np.zeros((S, S, 3), np.float32)
    for i in range(N):
        for j in range(N):
            y0, x0 = r.integers(0, H - U), r.integers(0, W - U)
            t = big[y0:y0 + U, x0:x0 + U]
            t = np.rot90(t, r.integers(0, 4))
            if r.random() < .5: t = t[:, ::-1]
            out[i * U:(i + 1) * U, j * U:(j + 1) * U] = t
    return out

def squares_mask():
    m = np.zeros((S, S), bool)
    for r in range(N):
        for c in range(N):
            if (r + c) % 2: m[r * U:(r + 1) * U, c * U:(c + 1) * U] = True
    return m
DARK = squares_mask()
yy, xx = np.mgrid[0:S, 0:S]
LX, LY = xx % U, yy % U     # position inside the square

def bevel(arr, width, hi=.10, lo=.16):
    """a raised tile: light on the top / left edges, shade on the bottom / right ones"""
    t = np.clip(np.minimum(LX, LY) / width, 0, 1); b = np.clip(np.minimum(U - 1 - LX, U - 1 - LY) / width, 0, 1)
    arr = arr + ((1 - t) * hi)[..., None] - ((1 - b) * lo)[..., None]
    return arr
def per_tile(seed, amp):
    r = np.random.default_rng(seed).random((N, N)).astype(np.float32)
    return (np.kron(r, np.ones((U, U), np.float32)) - .5) * amp
def joints(arr, w, color, alpha=1.0):
    m = ((LX < w) | (LY < w) | (LX >= U - w) | (LY >= U - w)).astype(np.float32) * alpha
    return lerp(arr, np.broadcast_to(col(color), arr.shape), m)
def polish(arr, strength=.08):
    """a soft sheen across the whole surface (a window reflection)"""
    d = ((xx - S * .3) ** 2 / (S * .55) ** 2 + (yy - S * .22) ** 2 / (S * .4) ** 2)
    return arr + (np.exp(-d * 1.6) * strength)[..., None]

# ---------------------------------------------------------------- 1. temple
def temple():
    light = slabs(marble(900, 900, 11, (242, 239, 233), (110, 114, 124), (196, 192, 188), 1.7), 1)
    dark = slabs(marble(900, 900, 12, (26, 54, 44), (214, 230, 218), (78, 122, 102), 2.2), 2)   # verde antico
    a = np.where(DARK[..., None], dark, light)
    a += per_tile(5, .05)[..., None]
    a = bevel(a, 7, .07, .12)
    a = joints(a, 3, (214, 176, 98))                           # gold inlay between the squares
    g = ((LX == 3) | (LY == 3)).astype(np.float32) * .25; a = a + g[..., None] * col((255, 240, 200))   # a bright edge on the gold
    a = polish(a, .07)
    edge = np.minimum(np.minimum(xx, yy), np.minimum(S - 1 - xx, S - 1 - yy))
    a = lerp(a, np.broadcast_to(col((222, 184, 104)), a.shape), (edge < 6).astype(np.float32))
    save(a, 'bd-temple.webp')
    # frame: a cream marble slab with a gold meander inlay
    W, H = 1100, 1200
    f = marble(W, H, 21, (226, 218, 202), (164, 150, 132), (200, 190, 176), .8)
    im = Image.fromarray((np.clip(f, 0, 1) * 255).astype(np.uint8)); d = ImageDraw.Draw(im)
    for inset, wd in ((14, 5), (30, 2)): d.rounded_rectangle([inset, inset, W - inset, H - inset], 26, outline=(201, 160, 82), width=wd)
    k = 34; y0 = 48
    for x in range(56, W - 56, k):   # meander (Greek key) along the top and bottom bands
        for yb, flip in ((y0, 1), (H - y0, -1)):
            pts = [(x, yb + 10 * flip), (x, yb - 10 * flip), (x + 22, yb - 10 * flip), (x + 22, yb + 4 * flip), (x + 8, yb + 4 * flip), (x + 8, yb - 3 * flip)]
            d.line(pts, fill=(196, 152, 74), width=3)
    save(np.asarray(im, np.float32) / 255, 'fr-temple.webp', 84)

# ---------------------------------------------------------------- 2. ruins (the default)
def ruins():
    n = fbm(S, S, 31); n2 = fbm(S, S, 32, ((20, .5), (60, .3), (160, .2)))
    lime = lerp(np.broadcast_to(col((196, 192, 168)), (S, S, 3)), np.broadcast_to(col((150, 152, 128)), (S, S, 3)), n)
    bas = lerp(np.broadcast_to(col((70, 80, 72)), (S, S, 3)), np.broadcast_to(col((38, 46, 42)), (S, S, 3)), n)
    a = np.where(DARK[..., None], bas, lime)
    a += ((n2 - .5) * .14)[..., None]
    a += per_tile(7, .09)[..., None]
    # pits and cracks
    cr = np.abs(np.sin(xx / 37 + fbm(S, S, 33) * 18)) < .015; a[cr] *= .72
    pits = fbm(S, S, 34, ((120, .6), (300, .4))) > .74; a[pits] *= .82
    a = bevel(a, 10, .06, .2)
    # moss: in the joints, spreading where the noise allows
    jd = np.minimum(np.minimum(LX, LY), np.minimum(U - 1 - LX, U - 1 - LY)).astype(np.float32)
    moss = np.clip((1 - jd / 16) * 1.3 + (fbm(S, S, 35) - .55) * 3, 0, 1) * np.clip((fbm(S, S, 36, ((10, .7), (40, .3))) - .35) * 2.4, 0, 1)
    mc = lerp(np.broadcast_to(col((70, 104, 46)), (S, S, 3)), np.broadcast_to(col((128, 150, 66)), (S, S, 3)), fbm(S, S, 37, ((80, .5), (240, .5))))
    a = lerp(a, mc, moss * .85)
    a = joints(a, 2, (24, 30, 20), .9)
    # lichen: pale rosettes here and there on the stone
    lic = np.clip((fbm(S, S, 38, ((30, .5), (90, .5))) - .66) * 6, 0, 1) * np.clip((fbm(S, S, 42, ((6, 1.0),)) - .4) * 3, 0, 1)
    a = lerp(a, np.broadcast_to(col((206, 200, 150)), a.shape), lic * .5)
    # chipped corners: a few squares lost a corner (darker, rough)
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)); d = ImageDraw.Draw(im, 'RGBA')
    r = np.random.default_rng(38)
    for _ in range(22):
        i, j = r.integers(0, N, 2); cx, cy = j * U + (0 if r.random() < .5 else U), i * U + (0 if r.random() < .5 else U)
        rad = 8 + r.random() * 12; pts = []
        for k in range(9):
            t = k / 8 * 6.283; rr = rad * (.6 + .4 * r.random()); pts.append((cx + math.cos(t) * rr, cy + math.sin(t) * rr))
        d.polygon(pts, fill=(30, 36, 26, 150))
    a = np.asarray(im, np.float32) / 255
    # morning light: warm from the top left, haze
    a = a * (0.86 + 0.22 * np.exp(-(((xx - S * .2) / S) ** 2 + ((yy - S * .1) / S) ** 2) * 2.4))[..., None]
    a = a * .94 + col((210, 220, 190)) * .06 * (1 - yy / S)[..., None]
    save(a, 'bd-ruins.webp')
    W, H = 1100, 1200
    f = lerp(np.broadcast_to(col((52, 60, 50)), (H, W, 3)), np.broadcast_to(col((28, 36, 28)), (H, W, 3)), fbm(W, H, 39))
    mossf = np.clip((fbm(W, H, 40) - .45) * 3, 0, 1); f = lerp(f, np.broadcast_to(col((60, 92, 40)), f.shape), mossf * .7)
    f += ((fbm(W, H, 41, ((60, .5), (200, .5))) - .5) * .12)[..., None]
    save(f, 'fr-ruins.webp', 84)

# ---------------------------------------------------------------- 3. vase (the Amazonomachy krater)
def vase():
    n = fbm(S, S, 51)
    clay = lerp(np.broadcast_to(col((206, 112, 64)), (S, S, 3)), np.broadcast_to(col((184, 92, 50)), (S, S, 3)), n)
    clay += ((fbm(S, S, 52, ((40, .5), (140, .5))) - .5) * .08)[..., None]
    glaze = lerp(np.broadcast_to(col((28, 22, 18)), (S, S, 3)), np.broadcast_to(col((14, 11, 9)), (S, S, 3)), n)
    a = np.where(DARK[..., None], glaze, clay)
    a += per_tile(9, .04)[..., None]
    a = bevel(a, 5, .05, .12)
    a = polish(np.where(DARK[..., None], a, a), .05)
    # the glaze's gloss: a sheen only on the black squares
    sheen = np.exp(-(((LX - U * .35) / (U * .3)) ** 2 + ((LY - U * .28) / (U * .22)) ** 2)) * .08
    a = a + (sheen * DARK)[..., None]
    # craquelure on the clay, a fine web of darker lines
    cq = np.abs(fbm(S, S, 54, ((70, .6), (160, .4))) - .5) < .012
    a[cq & ~DARK] *= .86
    # an incised line inside every square (the potter's guide line)
    ins = ((np.abs(LX - 9) < 1) | (np.abs(LY - 9) < 1) | (np.abs(LX - (U - 10)) < 1) | (np.abs(LY - (U - 10)) < 1)) & (LX >= 9) & (LY >= 9) & (LX <= U - 10) & (LY <= U - 10)
    a[ins & DARK] = a[ins & DARK] * .4 + col((150, 72, 38))[0, 0] * .6
    a[ins & ~DARK] *= .72
    a = joints(a, 2, (60, 30, 16), .85)
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)); d = ImageDraw.Draw(im)
    # a small palmette at every inner crossing, painted in the other colour
    for r in range(1, N):
        for c in range(1, N):
            x, y = c * U, r * U
            pc = (24, 18, 14) if (r + c) % 2 else (206, 112, 64)
            for k in range(4):   # four leaves, one into each square around the crossing
                ang = math.pi / 4 + k * math.pi / 2
                pk = (24, 18, 14) if k % 2 == (r + c) % 2 else (214, 120, 70)
                ex, ey = x + math.cos(ang) * 11, y + math.sin(ang) * 11
                d.polygon([(x + math.cos(ang + .5) * 3, y + math.sin(ang + .5) * 3), (ex + math.cos(ang + 1.3) * 4, ey + math.sin(ang + 1.3) * 4), (x + math.cos(ang) * 17, y + math.sin(ang) * 17), (ex + math.cos(ang - 1.3) * 4, ey + math.sin(ang - 1.3) * 4), (x + math.cos(ang - .5) * 3, y + math.sin(ang - .5) * 3)], fill=pk)
            d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=(150, 72, 38))
    edge = 10; d.rectangle([0, 0, S - 1, S - 1], outline=(24, 18, 14), width=edge)
    a = np.asarray(im, np.float32) / 255
    save(a, 'bd-vase.webp')
    W, H = 1100, 1200
    f = lerp(np.broadcast_to(col((26, 20, 16)), (H, W, 3)), np.broadcast_to(col((12, 9, 7)), (H, W, 3)), fbm(W, H, 53))
    fim = Image.fromarray((np.clip(f, 0, 1) * 255).astype(np.uint8)); d = ImageDraw.Draw(fim)
    # a band of tongues and a meander at top and bottom, in clay red
    for yb in (40, H - 40):
        d.line([(40, yb - 18), (W - 40, yb - 18)], fill=(196, 104, 58), width=3); d.line([(40, yb + 18), (W - 40, yb + 18)], fill=(196, 104, 58), width=3)
        for x in range(52, W - 52, 26):
            d.line([(x, yb - 10), (x, yb + 10), (x + 16, yb + 10), (x + 16, yb - 4), (x + 6, yb - 4), (x + 6, yb + 3)], fill=(196, 104, 58), width=3)
    for xb in (22, W - 22):
        for y in range(80, H - 80, 30): d.ellipse([xb - 5, y - 9, xb + 5, y + 9], outline=(196, 104, 58), width=2)
    save(np.asarray(fim, np.float32) / 255, 'fr-vase.webp', 84)

# ---------------------------------------------------------------- 4. iron (steel and fire)
def iron():
    n = fbm(S, S, 71)
    brush = noise(S, S, 600, 72); brush = np.asarray(Image.fromarray((brush * 255).astype(np.uint8)).resize((S, S)).filter(ImageFilter.GaussianBlur(0)), np.float32) / 255
    streak = up(np.random.default_rng(73).random((S, 8)).astype(np.float32), (S, S)) * .6 + up(np.random.default_rng(74).random((S, 40)).astype(np.float32), (S, S)) * .4
    light = lerp(np.broadcast_to(col((138, 146, 158)), (S, S, 3)), np.broadcast_to(col((104, 112, 128)), (S, S, 3)), n)   # blued steel
    light = light + ((streak - .5) * .1)[..., None]
    heat = np.clip((fbm(S, S, 75, ((5, .7), (12, .3))) - .45) * 2, 0, 1)                                             # heat tint (straw / purple)
    light = lerp(light, light * col((255, 214, 170)) * 1.05, heat * .35)
    dark = lerp(np.broadcast_to(col((42, 40, 44)), (S, S, 3)), np.broadcast_to(col((22, 21, 24)), (S, S, 3)), n)       # blackened iron
    dark = dark + ((fbm(S, S, 76, ((60, .5), (200, .5))) - .5) * .08)[..., None]
    a = np.where(DARK[..., None], dark, light)
    a += per_tile(11, .05)[..., None]
    a = bevel(a, 8, .1, .22)
    # ember seams: glowing orange in the joints, fading out
    jd = np.minimum(np.minimum(LX, LY), np.minimum(U - 1 - LX, U - 1 - LY)).astype(np.float32)
    glow = np.exp(-jd / 3.2) * (0.55 + 0.45 * fbm(S, S, 77, ((8, .6), (30, .4))))
    a = a * (1 - glow * .6)[..., None] + (glow[..., None] * col((255, 120, 40)) * 1.15)
    a = joints(a, 1, (255, 196, 120), .55)
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)); d = ImageDraw.Draw(im, 'RGBA')
    for r in range(N):   # rivets in the corners of every plate
        for c in range(N):
            for dx, dy in ((14, 14), (U - 14, 14), (14, U - 14), (U - 14, U - 14)):
                x, y = c * U + dx, r * U + dy
                d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=(30, 30, 34, 255)); d.ellipse([x - 4, y - 5, x + 2, y + 1], fill=(190, 196, 206, 200))
    save(np.asarray(im, np.float32) / 255, 'bd-iron.webp')
    W, H = 1100, 1200
    f = lerp(np.broadcast_to(col((34, 32, 36)), (H, W, 3)), np.broadcast_to(col((16, 15, 18)), (H, W, 3)), fbm(W, H, 78))
    st = up(np.random.default_rng(79).random((H, 10)).astype(np.float32), (W, H)); f = f + ((st - .5) * .06)[..., None]
    yy2, xx2 = np.mgrid[0:H, 0:W]; ed = np.minimum(np.minimum(xx2, yy2), np.minimum(W - 1 - xx2, H - 1 - yy2)).astype(np.float32)
    f = f + (np.exp(-ed / 26) * .35)[..., None] * col((255, 110, 40))      # embers along the edge
    fim = Image.fromarray((np.clip(f, 0, 1) * 255).astype(np.uint8)); d = ImageDraw.Draw(fim, 'RGBA')
    for x in list(range(40, W - 20, 70)):
        for y in (22, H - 22): d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=(28, 28, 32, 255)); d.ellipse([x - 5, y - 6, x + 2, y + 1], fill=(170, 176, 186, 190))
    save(np.asarray(fim, np.float32) / 255, 'fr-iron.webp', 84)

if __name__ == '__main__':
    import sys
    for k in (sys.argv[1:] or ['temple', 'ruins', 'vase', 'iron']): globals()[k]()

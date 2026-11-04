#!/usr/bin/env python3
"""Rendered art for Ugolki (Russian folk crafts), top view lit from the upper left.
  boards  img/bd-<key>.webp  : the 8×8 playing surface (1024 px, 128 px a square)
  frames  img/fr-<key>.webp  : a seamless 512 px tile for the frame around the board
  pieces  img/pc-<set>-<1|2>.webp : 256 px piece faces (thickness / drop shadow stay in CSS)
  khokhloma  black lacquer + cinnabar, gold-leaf lines; frame: gold rowan vines, red berries
  gzhel      glazed porcelain tiles, cobalt brushwork; frame: cobalt sprigs on white glaze
  palekh     black lacquer + hammered gold leaf; frame: fine gold scrolls (Palekh border)
  birch      birch bark (beresta) + Karelian birch marquetry; frame: bark
  pieces: lacquer (Khokhloma gold / black), porcelain (Gzhel), amber (Baltic), folk (matryoshka wood)
python3 ugolki/tools/gen_art.py"""
import os, math, numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(11)
L = np.array([-0.5, -0.62, 0.6]); L = L / np.linalg.norm(L)
H = L + np.array([0, 0, 1.0]); H = H / np.linalg.norm(H)


def C(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float)


def noise(shape, s, amp=1.0, wrap=False, aniso=None):
    x = rng.standard_normal(shape)
    sig = aniso if aniso else s
    x = gaussian_filter(x, sig, mode='wrap' if wrap else 'reflect')
    return x / (x.std() + 1e-9) * amp


def fbm(shape, scales, wrap=False):
    t = 0
    for s, a in scales: t = t + noise(shape, s, a, wrap)
    return t


def shade(h, albedo, gloss=40, spec=0.5, amb=0.4, metal=0.0, env=None):
    gy, gx = np.gradient(h)
    n = np.dstack([-gx, -gy, np.ones_like(h)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    diff = np.clip(n @ L, 0, 1)
    sp = np.clip(n @ H, 0, 1) ** gloss * spec
    ref = np.clip(0.55 - 0.45 * n[..., 1] - 0.25 * n[..., 0], 0, 1) if env is None else env(n)
    col = albedo * (amb + (1 - amb) * diff[..., None])
    col = col * (1 - metal) + albedo * ref[..., None] * metal * 1.3
    col = col + sp[..., None] * (albedo / 255 * metal + (1 - metal)) * 255
    return col


def mix(a, b, t):
    t = np.clip(t, 0, 1)[..., None] if np.ndim(t) == 2 else t
    return a * (1 - t) + b * t


def save_rgb(col, name, q=90):
    Image.fromarray(np.clip(col, 0, 255).astype(np.uint8), 'RGB').save(os.path.join(OUT, name), quality=q, method=6); print(name)


class Canvas:
    """supersampled PIL masks on an N×N grid (optionally drawn with wrap-around for seamless tiles)."""
    def __init__(self, N, ss=3, wrap=False): self.N, self.ss, self.wrap = N, ss, wrap
    def mask(self, fn, blur=0.5):
        N, ss = self.N, self.ss
        m = Image.new('L', (N * ss, N * ss), 0); d = ImageDraw.Draw(m)
        offs = [(0, 0)] if not self.wrap else [(ox, oy) for ox in (-N, 0, N) for oy in (-N, 0, N)]
        for ox, oy in offs: fn(d, lambda x, y, ox=ox, oy=oy: ((x + ox) * ss, (y + oy) * ss), ss)
        a = np.asarray(m.resize((N, N), Image.LANCZOS)).astype(float) / 255
        return gaussian_filter(a, blur, mode='wrap' if self.wrap else 'reflect') if blur else a


def tear(d, P, ss, x, y, ang, length, width, fill=255):
    """a brush stroke: round head at (x, y), tapering to a point along ang."""
    pts = []
    for k in range(0, 41):
        u = k / 40; w = width * (math.sin(math.pi * min(1, u * 1.0)) ** .6) * (1 - u) ** .5 * 1.4
        pts.append((u, w))
    ca, sa = math.cos(ang), math.sin(ang)
    side1 = [P(x + ca * u * length - sa * w, y + sa * u * length + ca * w) for u, w in pts]
    side2 = [P(x + ca * u * length + sa * w, y + sa * u * length - ca * w) for u, w in pts][::-1]
    d.polygon(side1 + side2, fill=fill)
    r = width * .55; cx, cy = P(x + ca * r * .6, y + sa * r * .6); d.ellipse([cx - r * ss, cy - r * ss, cx + r * ss, cy + r * ss], fill=fill)


def curl(d, P, ss, x, y, r0, a0, turns, width, sgn=1, fill=255):
    """a tapering spiral curl ('травка' grass stroke)."""
    n = 40; pts = []
    for k in range(n + 1):
        u = k / n; a = a0 + sgn * turns * 2 * math.pi * u; r = r0 * (1 - .75 * u)
        pts.append((x + r * math.cos(a), y + r * math.sin(a), width * (1 - u) ** .7 + .3))
    for (x1, y1, w1), (x2, y2, w2) in zip(pts, pts[1:]):
        p1, p2 = P(x1, y1), P(x2, y2); d.line([p1, p2], fill=fill, width=max(1, int(w1 * ss)))
        d.ellipse([p2[0] - w2 * ss / 2, p2[1] - w2 * ss / 2, p2[0] + w2 * ss / 2, p2[1] + w2 * ss / 2], fill=fill)


def dot(d, P, ss, x, y, r, fill=255):
    cx, cy = P(x, y); d.ellipse([cx - r * ss, cy - r * ss, cx + r * ss, cy + r * ss], fill=fill)


def bez(p0, p1, p2, n=30):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in (k / n for k in range(n + 1))]


def poly_line(d, P, ss, pts, w, fill=255):
    q = [P(x, y) for x, y in pts]; d.line(q, fill=fill, width=max(1, int(w * ss)), joint='curve')


# =========================================================================================== boards
NB, CELL = 1024, 128
by, bx = np.mgrid[0:NB, 0:NB].astype(float)
sq_r, sq_c = (by // CELL).astype(int), (bx // CELL).astype(int)
dark = ((sq_r + sq_c) % 2 == 0)        # a8 (top-left, row 8 col a) is light on a chessboard → (0+0) even = light? see below
# in the game a1 (bottom-left) is dark: bottom row index 7, col 0 → (7+0) odd → dark. So dark = odd.
dark = ((sq_r + sq_c) % 2 == 1)
lu, lv = bx - sq_c * CELL, by - sq_r * CELL            # position inside a square
edge = np.minimum(np.minimum(lu, CELL - 1 - lu), np.minimum(lv, CELL - 1 - lv))   # px to the nearest square edge
sheen = np.clip(1 - np.hypot((bx - NB * .28) / (NB * .55), (by - NB * .22) / (NB * .4)), 0, 1) ** 2   # soft window reflection on the lacquer


def per_square(f):
    out = np.zeros((NB, NB))
    for r in range(8):
        for c in range(8): out[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL] = f(r, c)
    return out


def khokhloma_board():
    streak = noise((NB, NB), 0, 1, aniso=(1.2, 18))       # horizontal brush drag in the cinnabar
    cloud = fbm((NB, NB), [(40, .6), (10, .3)])
    var = per_square(lambda r, c: rng.normal(0, .04))
    red = mix(C('#a52a17'), C('#c8442a'), .5 + .08 * streak + .2 * cloud + var)
    blk = mix(C('#070404'), C('#2a1511'), .25 + .2 * cloud + .1 * noise((NB, NB), 2, 1) + var)
    alb = np.where(dark[..., None], blk, red)
    # gold-leaf lines between the squares (a slightly raised painted line)
    gl = np.clip(1.6 - edge, 0, 1)
    gold = mix(C('#8a6420'), C('#e9c46a'), .5 + .3 * noise((NB, NB), 3, 1))
    alb = mix(alb, gold, gl * .95)
    h = gl * 1.5 + noise((NB, NB), 1.2, .05) + gaussian_filter(streak, 1) * .15 * (~dark)
    col = shade(gaussian_filter(h, .7), alb, gloss=60, spec=.25, amb=.72)
    col = col + sheen[..., None] * 38 * np.where(dark, 1.0, .6)[..., None]
    save_rgb(col, 'bd-khokhloma.webp')


def gzhel_board():
    # glazed tiles with rounded edges and a thin grout line
    h = np.clip(edge / 7, 0, 1) ** .6 * 6
    crack = np.zeros((NB, NB))
    # crackle: thin random polylines on the white tiles
    cv = Canvas(NB, 2)
    def cr(d, P, ss):
        for _ in range(260):
            x, y = rng.uniform(0, NB), rng.uniform(0, NB); a = rng.uniform(0, 2 * math.pi)
            pts = [(x, y)]
            for _ in range(rng.integers(3, 7)):
                a += rng.normal(0, .6); x += math.cos(a) * rng.uniform(8, 22); y += math.sin(a) * rng.uniform(8, 22); pts.append((x, y))
            d.line([P(*p) for p in pts], fill=255, width=1)
    crack = cv.mask(cr, .4)
    stroke = noise((NB, NB), 0, 1, aniso=(14, 3)) * .6 + noise((NB, NB), 0, 1, aniso=(3, 14)) * .4
    pool = per_square(lambda r, c: rng.uniform(-.12, .12))
    cob = mix(C('#143c98'), C('#3e6cc8'), .5 + .07 * stroke + .12 * noise((NB, NB), 24, 1) + pool - .22 * np.clip((edge - 6) / 50, 0, 1))
    wht = mix(C('#f7f9ff'), C('#dfe6f4'), .25 + .2 * noise((NB, NB), 30, 1))
    wht = mix(wht, C('#9fb1d4'), crack * .35)
    alb = np.where(dark[..., None], cob, wht)
    grout = np.clip(2.2 - edge, 0, 1)
    alb = mix(alb, C('#cfd6e4'), grout)
    env = lambda n: np.clip(.62 - .5 * n[..., 1] - .2 * n[..., 0], 0, 1)
    col = shade(gaussian_filter(h, 1.0), alb, gloss=70, spec=.45, amb=.7, env=env)
    col = col + sheen[..., None] * 30
    save_rgb(col, 'bd-gzhel.webp')


def palekh_board():
    # gold leaf laid in small sheets (seams), hammered; black lacquer with a deep warm undertone
    seam = np.zeros((NB, NB))
    leaf = (CELL // 2)
    jit = noise((NB, NB), 6, 2.0)
    su, sv = (bx + jit) % leaf, (by + jit * .7) % leaf
    seam = np.clip(1.4 - np.minimum(np.minimum(su, leaf - su), np.minimum(sv, leaf - sv)), 0, 1) * .3
    ham = fbm((NB, NB), [(2.5, .25), (7, .3), (24, .5)])
    gold = mix(C('#a47a2c'), C('#ecce78'), .55 + .12 * ham + .15 * (1 - by / NB - bx / NB / 2))
    gold = mix(gold, C('#6f4e17'), seam)
    blk = mix(C('#050407'), C('#1c1015'), .25 + .2 * fbm((NB, NB), [(30, .6), (6, .3)]))
    spark = (noise((NB, NB), .6, 1) > 3.3).astype(float)
    blk = blk + spark[..., None] * 60
    alb = np.where(dark[..., None], blk, gold)
    bevel = np.clip(edge / 3, 0, 1)
    h = bevel * 2 + np.where(dark, 0, ham * .5) + seam * -.6
    metal = np.where(dark, 0, .55)
    gy, gx = np.gradient(gaussian_filter(h, .8))
    col = shade(gaussian_filter(h, .8), alb, gloss=40, spec=.18, amb=.72)
    col = col * (1 - metal[..., None] * .2) + metal[..., None] * .2 * alb * np.clip(.7 - .5 * (by / NB - .3) + .3 * ham[..., None].squeeze(), 0, 1.4)[..., None]
    fine = np.clip(1.4 - edge, 0, 1)          # a fine gold rule around every square
    col = mix(col, C('#d8b456'), fine * .9)
    col = col + sheen[..., None] * np.where(dark, 34, 14)[..., None]
    save_rgb(col, 'bd-palekh.webp')


def karelian(shape, wrap=False, rot=False):
    """Karelian birch figure: honey wood with dark flecks and flowing lines."""
    hN, wN = shape
    yy, xx = np.mgrid[0:hN, 0:wN].astype(float)
    if rot: xx, yy = yy, xx
    w = noise(shape, 22, 1, wrap) * 9
    grain = np.sin((yy + w) / 2.3) * .5 + .5
    fl = noise(shape, 2.2, 1, wrap) + noise(shape, 6, .8, wrap)
    fleck = np.clip((fl - 2.3) * 1.2, 0, 1) * .7
    swirl = (np.abs(gaussian_filter(fl, 2)) < .06) * .6
    base = mix(C('#d6a865'), C('#b17d3e'), .45 + .25 * noise(shape, 30, 1, wrap) + .12 * grain)
    base = mix(base, C('#6e4219'), fleck * .85 + swirl * .35)
    return base


def bark(shape, wrap=False):
    """birch bark (beresta): chalky white, horizontal lenticels, peach underlayer where it peels."""
    hN, wN = shape
    fib = noise(shape, 0, 1, wrap, aniso=(1.0, 30))
    base = mix(C('#f3eee2'), C('#ddd3c0'), .35 + .18 * fib + .2 * noise(shape, 25, 1, wrap))
    peach = np.clip(noise(shape, 0, 1, wrap, aniso=(5, 40)) - 1.5, 0, 1)
    base = mix(base, C('#e7b796'), peach * .6)
    cv = Canvas(wN, 2, wrap)
    def lent(d, P, ss):
        for _ in range(int(wN * hN / 2600)):
            x, y = rng.uniform(0, wN), rng.uniform(0, hN); L_ = rng.uniform(6, 28) * (1 + (rng.random() < .1) * 2.5); t = rng.uniform(1, 3.2)
            d.ellipse([*P(x - L_ / 2, y - t / 2), *P(x + L_ / 2, y + t / 2)], fill=int(rng.uniform(120, 255)))
    lm = cv.mask(lent, .5)
    base = mix(base, C('#2c2620'), lm * .85)
    return base, lm


def birch_board():
    alb = np.zeros((NB, NB, 3)); hgt = np.zeros((NB, NB))
    bk, lm = bark((NB, NB))
    for r in range(8):
        for c in range(8):
            sl = (slice(r * CELL, (r + 1) * CELL), slice(c * CELL, (c + 1) * CELL))
            if (r + c) % 2 == 1:
                alb[sl] = karelian((CELL, CELL), rot=(r % 2 == 0))
            else:
                alb[sl] = bk[sl]
    # light lacquer on the wood, bark stays matte; a dark inlay seam between the squares
    seam = np.clip(1.8 - edge, 0, 1)
    alb = mix(alb, C('#3b2a18'), seam * .9)
    h = np.clip(edge / 2.5, 0, 1) * 1.5 - lm * .6 * (~dark)
    col = shade(gaussian_filter(h, .7), alb, gloss=30, spec=np.where(dark, .14, .03)[..., None].squeeze() if False else .08, amb=.74)
    col = col + sheen[..., None] * np.where(dark, 26, 8)[..., None]
    save_rgb(col, 'bd-birch.webp')


# =========================================================================================== frames (seamless tiles)
NF = 512
fy, fx = np.mgrid[0:NF, 0:NF].astype(float)


def vine_tile(berry, leaf, curl_c, base_fn, name, gloss=60, spec=.2):
    cv = Canvas(NF, 3, True)
    stems, leaves, curls, berries = [], [], [], []
    rr = np.random.default_rng(5)
    # a wavy stem across the tile (wraps), with leaves, curls and rowan clusters along it
    for row, ph in ((NF * .27, 0), (NF * .77, math.pi)):
        pts = [(x, row + 34 * math.sin(2 * math.pi * x / NF * 2 + ph)) for x in np.linspace(-20, NF + 20, 120)]
        stems.append(pts)
        for k in range(8):
            x = (k + .5) * NF / 8; y = row + 34 * math.sin(2 * math.pi * x / NF * 2 + ph)
            slope = math.atan(34 * 2 * math.pi * 2 / NF * math.cos(2 * math.pi * x / NF * 2 + ph))
            s = 1 if k % 2 == 0 else -1
            a = slope - s * math.pi / 2 + s * .5
            if k % 4 == 1: berries.append((x + math.cos(a) * 30, y + math.sin(a) * 30))
            else: leaves.append((x, y, a, rr.uniform(30, 40)))
            curls.append((x + math.cos(a + math.pi) * 16, y + math.sin(a + math.pi) * 16, a, s))
    def st(d, P, ss):
        for pts in stems: poly_line(d, P, ss, pts, 3.2)
    def lv(d, P, ss):
        for x, y, a, Ln in leaves:
            tear(d, P, ss, x, y, a, Ln, 9)
            tear(d, P, ss, x, y, a + .55, Ln * .7, 6)
    def cu(d, P, ss):
        for x, y, a, s in curls: curl(d, P, ss, x, y, 11, a, .9, 2.4, s)
    bmask_list = []
    def be(d, P, ss):
        for x, y in berries:
            for k in range(7):
                ang = k * 2 * math.pi / 6; rad = 0 if k == 6 else 11
                dot(d, P, ss, x + rad * math.cos(ang), y + rad * math.sin(ang), 7.5)
    def bh(d, P, ss):
        for x, y in berries:
            for k in range(7):
                ang = k * 2 * math.pi / 6; rad = 0 if k == 6 else 11
                dot(d, P, ss, x + rad * math.cos(ang) - 2.4, y + rad * math.sin(ang) - 2.6, 2)
    m_st, m_lv, m_cu, m_be, m_bh = cv.mask(st), cv.mask(lv), cv.mask(cu), cv.mask(be), cv.mask(bh, .8)
    alb, h0 = base_fn()
    leafc = mix(leaf[0], leaf[1], .5 + .3 * noise((NF, NF), 4, 1, True))
    alb = mix(alb, leafc, np.clip(m_st + m_lv + m_cu * (curl_c is None), 0, 1))
    if curl_c is not None: alb = mix(alb, curl_c, m_cu)
    alb = mix(alb, berry, m_be)
    alb = mix(alb, C('#ffd9b0'), m_bh * .8)
    h = h0 + (m_st + m_lv + m_cu) * 1.2 + m_be * 3
    col = shade(gaussian_filter(h, .8, mode='wrap'), alb, gloss=gloss, spec=spec, amb=.72)
    save_rgb(col, name)


def frames():
    def lacquer_base():
        cl = fbm((NF, NF), [(40, .6), (8, .25)], True)
        return mix(C('#060303'), C('#241210'), .3 + .2 * cl), noise((NF, NF), 1.2, .05, True)
    vine_tile(C('#c8321f'), (C('#9a6f22'), C('#efcb72')), None, lacquer_base, 'fr-khokhloma.webp')

    def porcelain_base():
        return mix(C('#f6f8fe'), C('#e1e8f5'), .3 + .2 * noise((NF, NF), 30, 1, True)), noise((NF, NF), 10, .3, True)
    # Gzhel sprigs: cobalt brush strokes, shaded dark to light across each stroke
    cv = Canvas(NF, 3, True)
    alb, h = porcelain_base()
    rr = np.random.default_rng(9)
    spots = [(NF * .25, NF * .25), (NF * .75, NF * .75), (NF * .75, NF * .25), (NF * .25, NF * .75)]
    for i, (x, y) in enumerate(spots):
        big = i < 2
        def rose(d, P, ss, x=x, y=y, big=big, shift=0.0):
            n = 9 if big else 6
            for k in range(n):
                a = k * 2 * math.pi / n + shift
                tear(d, P, ss, x + math.cos(a) * (16 if big else 9), y + math.sin(a) * (16 if big else 9), a, 34 if big else 22, 9 if big else 6)
            if big:
                for k in range(5):
                    a = k * 2 * math.pi / 5 + .3
                    tear(d, P, ss, x + math.cos(a) * 8, y + math.sin(a) * 8, a + .4, 18, 5)
        def rose_hi(d, P, ss, x=x, y=y, big=big):
            n = 9 if big else 6
            for k in range(n):
                a = k * 2 * math.pi / n
                tear(d, P, ss, x + math.cos(a) * (16 if big else 9) + math.cos(a + 1.57) * 3, y + math.sin(a) * (16 if big else 9) + math.sin(a + 1.57) * 3, a, 30 if big else 19, 5 if big else 3.4)
        m = cv.mask(rose); mh = cv.mask(rose_hi, 1.2)
        cob = mix(C('#173c9a'), C('#3d6fd0'), .5 + .2 * noise((NF, NF), 3, 1, True))
        alb = mix(alb, cob, m); alb = mix(alb, C('#8eabe8'), mh * m * .55)
        h = h + m * 1.2
        def stems(d, P, ss, x=x, y=y):
            for a in (.7, 2.4, 3.9, 5.5):
                p0 = (x + math.cos(a) * 30, y + math.sin(a) * 30); p2 = (x + math.cos(a + .5) * 105, y + math.sin(a + .5) * 105)
                p1 = (x + math.cos(a + .1) * 75, y + math.sin(a + .1) * 75)
                poly_line(d, P, ss, bez(p0, p1, p2), 2.4)
                for t in (.45, .75):
                    q = bez(p0, p1, p2)[int(t * 30)]
                    tear(d, P, ss, q[0], q[1], a + 1.4, 18, 5); tear(d, P, ss, q[0], q[1], a - 1.0, 15, 4.5)
                dot(d, P, ss, p2[0], p2[1], 3.4)
        ms = cv.mask(stems)
        alb = mix(alb, C('#1d4aa8'), ms); h = h + ms * .8
    env = lambda n: np.clip(.62 - .5 * n[..., 1] - .2 * n[..., 0], 0, 1)
    save_rgb(shade(gaussian_filter(h, .8, mode='wrap'), alb, gloss=70, spec=.4, amb=.72, env=env), 'fr-gzhel.webp')

    # Palekh: black lacquer with fine gold scrolls and dot rows (a border-like all-over pattern)
    cv = Canvas(NF, 3, True)
    alb, h = lacquer_base()
    def scrolls(d, P, ss):
        for row in range(4):
            y = (row + .5) * NF / 4
            for k in range(4):
                x = (k + .5 + (row % 2) * .5) * NF / 4
                s = 1 if (k + row) % 2 == 0 else -1
                curl(d, P, ss, x, y, 26, 0 if s > 0 else math.pi, 1.15, 1.8, s)
                curl(d, P, ss, x + 30 * s, y, 18, math.pi if s > 0 else 0, 1.0, 1.4, -s)
                tear(d, P, ss, x, y - 22, -math.pi / 2 - .5 * s, 20, 3.6)
                tear(d, P, ss, x, y + 22, math.pi / 2 + .5 * s, 16, 3.0)
                for j in range(5): dot(d, P, ss, x - 50 + j * 4, y + 34, .9)
    m = cv.mask(scrolls, .45)
    gold = mix(C('#a77d2c'), C('#f3d985'), .5 + .3 * noise((NF, NF), 2, 1, True))
    alb = mix(alb, gold, m); h = h + m * .9
    save_rgb(shade(gaussian_filter(h, .7, mode='wrap'), alb, gloss=60, spec=.25, amb=.74), 'fr-palekh.webp')

    bk, lm = bark((NF, NF), True)
    save_rgb(shade(gaussian_filter(-lm * .8 + noise((NF, NF), 6, .3, True), .7, mode='wrap'), bk, gloss=20, spec=.04, amb=.76), 'fr-birch.webp')


# =========================================================================================== pieces
NP = 256
py_, px_ = np.mgrid[0:NP, 0:NP].astype(float)
pc = (NP - 1) / 2; PR = NP / 2 - 1.5
rr = np.hypot(px_ - pc, py_ - pc) / PR


def save_pc(col, name, edge_dark=.0):
    col = np.clip(col, 0, 255)
    a = np.clip((1 - rr) * PR / 1.2, 0, 1)
    if edge_dark: col = col * (1 - edge_dark * np.clip((rr - .88) / .12, 0, 1) ** 2)[..., None]
    Image.fromarray(np.dstack([col, a[..., None] * 255]).astype(np.uint8), 'RGBA').save(os.path.join(OUT, name), quality=92, method=6); print(name)


def lip_profile(dome=7, lip=4):
    h = (1 - rr ** 2) * dome
    h += np.exp(-((rr - .86) / .045) ** 2) * lip
    h -= np.clip((rr - .92) / .08, 0, 1) ** 1.6 * 9
    return h


def khokhloma_piece(gold_base):
    cv = Canvas(NP, 3)
    c = pc
    if gold_base:
        base = mix(C('#b98a2a'), C('#f0c860'), .6 + .1 * noise((NP, NP), 10, 1) + .04 * noise((NP, NP), 1.5, 1) - .25 * (py_ / NP - .5))
        leaf_c, curl_c = C('#120a08'), C('#120a08')
    else:
        base = mix(C('#060303'), C('#2a1310'), .25 + .2 * noise((NP, NP), 20, 1))
        leaf_c, curl_c = C('#e2b552'), C('#e2b552')
    berry = C('#c52a19')
    def leaves(d, P, ss):
        for k in range(5):
            a = k * 2 * math.pi / 5 - math.pi / 2 + .35
            tear(d, P, ss, c + math.cos(a) * 36, c + math.sin(a) * 36, a, 44, 11)
    def curls(d, P, ss):
        for k in range(5):
            a = k * 2 * math.pi / 5 - math.pi / 2 + .35 + .63
            curl(d, P, ss, c + math.cos(a) * 62, c + math.sin(a) * 62, 13, a + math.pi, .95, 3.2, 1)
    def ring(d, P, ss):
        r = NP * .395; d.ellipse([*P(c - r, c - r), *P(c + r, c + r)], outline=255, width=int(3.4 * ss))
    pos = [(0, 0)] + [(15 * math.cos(k * math.pi / 3 + .3), 15 * math.sin(k * math.pi / 3 + .3)) for k in range(6)]
    def berries(d, P, ss):
        for dx, dy in pos: dot(d, P, ss, c + dx, c + dy, 9.5)
    def hi(d, P, ss):
        for dx, dy in pos: dot(d, P, ss, c + dx - 3, c + dy - 3.4, 2.4)
    def eyes(d, P, ss):
        for dx, dy in pos: dot(d, P, ss, c + dx + 3.2, c + dy + 3.2, 1.4)
    m_l, m_c, m_r, m_b, m_h, m_e = cv.mask(leaves), cv.mask(curls), cv.mask(ring), cv.mask(berries), cv.mask(hi, .9), cv.mask(eyes)
    alb = mix(base, leaf_c, np.clip(m_l + m_c, 0, 1))
    alb = mix(alb, C('#c52a19') if gold_base else C('#e2b552'), m_r)
    shade_b = mix(C('#8e170c'), berry, .6 + .4 * np.clip(1 - np.hypot(px_ - c + 4, py_ - c + 4) / 30, 0, 1))
    alb = mix(alb, shade_b, m_b); alb = mix(alb, C('#ffd2b0'), m_h * .85); alb = mix(alb, C('#1a0806'), m_e * .7)
    h = lip_profile(6, 3) + (m_l + m_c + m_r) * .8 + m_b * 2.2 + noise((NP, NP), 1, .04)
    metal = .45 if gold_base else 0
    col = shade(gaussian_filter(h, .8), alb, gloss=70, spec=.55, amb=.62, metal=metal)
    save_pc(col, f'pc-lacquer-{1 if gold_base else 2}.webp', .3)


def gzhel_piece(white):
    cv = Canvas(NP, 3); c = pc
    glaze = mix(C('#fbfcff'), C('#e4eaf6'), .3 + .2 * noise((NP, NP), 20, 1)) if white else mix(C('#163a94'), C('#2c58b8'), .5 + .25 * noise((NP, NP), 10, 1) + .2 * noise((NP, NP), 0, 1, aniso=(2, 12)))
    paint, paint_hi = (C('#173c9a'), C('#6f93dc')) if white else (C('#f2f5fd'), C('#b8c8ec'))
    def petals(d, P, ss):
        for k in range(8):
            a = k * math.pi / 4 - math.pi / 2
            tear(d, P, ss, c + math.cos(a) * 20, c + math.sin(a) * 20, a, 50, 13)
    def petals_hi(d, P, ss):
        for k in range(8):
            a = k * math.pi / 4 - math.pi / 2
            tear(d, P, ss, c + math.cos(a) * 20 + math.cos(a + 1.57) * 4, c + math.sin(a) * 20 + math.sin(a + 1.57) * 4, a, 44, 6.5)
    def inner(d, P, ss):
        for k in range(5):
            a = k * 2 * math.pi / 5 + .2
            tear(d, P, ss, c + math.cos(a) * 6, c + math.sin(a) * 6, a + .5, 22, 6)
        dot(d, P, ss, c, c, 6)
    def band(d, P, ss):
        r = NP * .41; d.ellipse([*P(c - r, c - r), *P(c + r, c + r)], outline=255, width=int(4 * ss))
        for k in range(24):
            a = k * 2 * math.pi / 24; dot(d, P, ss, c + math.cos(a) * NP * .365, c + math.sin(a) * NP * .365, 2.1)
    m_p, m_ph, m_i, m_b = cv.mask(petals), cv.mask(petals_hi, 1.4), cv.mask(inner), cv.mask(band)
    gap = cv.mask(inner, 2.5) * (1 - m_i)
    alb = mix(glaze, paint, np.clip(m_p + m_b, 0, 1))
    alb = mix(alb, paint_hi, m_ph * m_p * .65)
    alb = mix(alb, glaze, gap * .9); alb = mix(alb, paint, m_i)
    h = (1 - rr ** 2.2) * 14 - np.clip((rr - .9) / .1, 0, 1) ** 2 * 6 + noise((NP, NP), 6, .08)
    env = lambda n: np.clip(.62 - .5 * n[..., 1] - .2 * n[..., 0], 0, 1)
    col = shade(gaussian_filter(h, .8), alb, gloss=90, spec=.7, amb=.6, env=env, metal=.12)
    save_pc(col, f'pc-porcelain-{1 if white else 2}.webp', .18 if white else .3)


def amber_piece(light):
    c = pc
    w1 = noise((NP, NP), 18, 1) * 14; w2 = noise((NP, NP), 18, 1) * 14
    yy2 = py_ + w1; xx2 = px_ + w2
    flow = np.sin((yy2 * .8 + xx2 * .35) / 9) * .5 + .5
    cloud = fbm((NP, NP), [(14, .35), (4, .12)])
    lo, hi = (C('#b5560b'), C('#ffd36a')) if light else (C('#3a0c03'), C('#b0400f'))
    alb = mix(lo, hi, .45 + .18 * flow + .2 * cloud)
    # subsurface glow: light enters upper left, glows on the lower right inner side
    glow = np.clip(1 - np.hypot(px_ - c - PR * .28, py_ - c - PR * .3) / (PR * .75), 0, 1) ** 1.5
    alb = alb + glow[..., None] * (np.array([110, 60, 6.]) if light else np.array([120, 38, 6.]))
    # inclusions: tiny bubbles and a few dark specks
    cv = Canvas(NP, 3); r2 = np.random.default_rng(3 if light else 4)
    bub = [(r2.uniform(40, 216), r2.uniform(40, 216), r2.uniform(1.2, 3.2)) for _ in range(16)]
    bub = [b for b in bub if math.hypot(b[0] - c, b[1] - c) < 90]
    mb = cv.mask(lambda d, P, ss: [dot(d, P, ss, x, y, r) for x, y, r in bub], .4)
    mbh = cv.mask(lambda d, P, ss: [dot(d, P, ss, x - r * .35, y - r * .35, r * .45) for x, y, r in bub], .3)
    alb = mix(alb, alb * .55, mb * .8); alb = mix(alb, C('#fff3cf'), mbh * .9)
    h = (1 - rr ** 2) * 18 - np.clip((rr - .93) / .07, 0, 1) ** 1.5 * 6
    env = lambda n: np.clip(.7 - .55 * n[..., 1] - .3 * n[..., 0], 0, 1) ** 1.5
    col = shade(gaussian_filter(h, 1), alb, gloss=110, spec=.9, amb=.75, env=env, metal=.1)
    rim = np.clip((rr - .8) / .2, 0, 1) ** 2
    col = col * (1 - rim[..., None] * (.35 if light else .5))
    save_pc(col, f'pc-amber-{1 if light else 2}.webp')


def folk_piece(natural):
    """matryoshka wood: turned lime wood (natural) / red painted, lacquered; a painted flower with leaves."""
    cv = Canvas(NP, 3); c = pc
    if natural:
        w = noise((NP, NP), 26, 1) * 10
        grain = np.sin((px_ + w) / 3.4) * .5 + .5
        base = mix(C('#e8c48c'), C('#c99a5c'), .35 + .25 * grain + .2 * noise((NP, NP), 20, 1))
        petal, center, leafc, ring_c = C('#c42a1c'), C('#f1c13c'), C('#2f6b2a'), C('#c42a1c')
    else:
        base = mix(C('#9c1a12'), C('#c8301f'), .5 + .2 * noise((NP, NP), 16, 1) + .1 * noise((NP, NP), 0, 1, aniso=(1, 10)))
        petal, center, leafc, ring_c = C('#f3c33f'), C('#c8301f'), C('#3d7a33'), C('#f3c33f')
    def leaves(d, P, ss):
        for k in range(5):
            a = k * 2 * math.pi / 5 - math.pi / 2 + math.pi / 5
            tear(d, P, ss, c + math.cos(a) * 34, c + math.sin(a) * 34, a, 40, 9)
    def petals(d, P, ss):
        for k in range(5):
            a = k * 2 * math.pi / 5 - math.pi / 2
            x, y = c + math.cos(a) * 25, c + math.sin(a) * 25
            d.ellipse([*P(x - 19, y - 19), *P(x + 19, y + 19)], fill=255)
    def outline(d, P, ss):
        for k in range(5):
            a = k * 2 * math.pi / 5 - math.pi / 2
            x, y = c + math.cos(a) * 25, c + math.sin(a) * 25
            d.ellipse([*P(x - 19, y - 19), *P(x + 19, y + 19)], outline=255, width=int(1.6 * ss))
    def cen(d, P, ss): dot(d, P, ss, c, c, 13)
    def dots(d, P, ss):
        for k in range(5):
            a = k * 2 * math.pi / 5 - math.pi / 2
            dot(d, P, ss, c + math.cos(a) * 30 - 4, c + math.sin(a) * 30 - 4, 3)
        for k in range(18):
            a = k * 2 * math.pi / 18; dot(d, P, ss, c + math.cos(a) * NP * .4, c + math.sin(a) * NP * .4, 2.4)
    m_l, m_p, m_o, m_c, m_d = cv.mask(leaves), cv.mask(petals), cv.mask(outline), cv.mask(cen), cv.mask(dots, .6)
    alb = mix(base, leafc, m_l)
    pet = mix(petal * .78, petal, np.clip(np.hypot(px_ - c, py_ - c) / 45, 0, 1))
    alb = mix(alb, pet, m_p)
    alb = mix(alb, center, m_c); alb = mix(alb, C('#fff6e0'), m_d * .9)
    h = (1 - rr ** 4) * 8 - np.clip((rr - .9) / .1, 0, 1) ** 2 * 6 + (m_p + m_l + m_c) * .9 + m_d * .6
    col = shade(gaussian_filter(h, .8), alb, gloss=60, spec=.35, amb=.64)
    save_pc(col, f'pc-folk-{1 if natural else 2}.webp', .3)


if __name__ == '__main__':
    import sys
    want = sys.argv[1:] or ['boards', 'frames', 'pieces']
    if 'boards' in want: khokhloma_board(); gzhel_board(); palekh_board(); birch_board()
    if 'frames' in want: frames()
    if 'pieces' in want:
        for b in (True, False): khokhloma_piece(b); gzhel_piece(b); amber_piece(b); folk_piece(b)

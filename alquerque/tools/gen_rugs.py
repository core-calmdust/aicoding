#!/usr/bin/env python3
"""Original rug designs for the Alquerque board (5x5 points; the frame is 6.5 x 7 cells, point (c, r) at x = 1.25 + c,
y = 1.5 + (4 - r) cells): medallion (an Arab / Persian carpet with an eight-pointed star medallion and arabesque field),
berber (a bright Moroccan pile rug), kilim (a flat-woven striped tapestry), patch (a tufted patchwork of the board's squares).
python3 tools/gen_rugs.py → img/rug-<name>.webp"""
import os, math, numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter

S = 160
Wc, Hc = 6.5, 7
W, H = int(Wc * S), int(Hc * S)
SS = 2   # supersampling
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img')
P = lambda c, r: ((1.25 + c) * S, (1.5 + (4 - r)) * S)


def canvas(col):
    im = Image.new('RGB', (W * SS, H * SS), col)
    return im, ImageDraw.Draw(im)


def sc(pts): return [(x * SS, y * SS) for x, y in pts]


def star(cx, cy, R, r, n, rot=0):
    pts = []
    for k in range(2 * n):
        a = rot + math.pi * k / n
        rr = R if k % 2 == 0 else r
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return pts


def poly(d, pts, **kw): d.polygon(sc(pts), **kw)


def finish(im, rng, pile=0.07, knot=True, abrash=0.05, fuzz=0.6):
    im = im.resize((W, H), Image.LANCZOS)
    a = np.asarray(im).astype(np.float64)
    n = lambda sy, sx: (lambda x: x / (x.std() + 1e-9))(gaussian_filter(rng.standard_normal((H, W)), (sy, sx)))
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    tex = n(fuzz, fuzz) * 0.6 + n(2.5, 1.2) * 0.4
    if knot:   # the knot grid of a pile rug
        tex += 0.5 * (np.sin(2 * np.pi * xx / 5.0) * np.sin(2 * np.pi * yy / 4.0))
    ab = n(60, 900)   # abrash: horizontal bands where the dye lots differ
    a *= (1 + pile * tex[..., None] + abrash * ab[..., None])
    vig = 1 - 0.12 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    a *= vig[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def border_band(d, x0, y0, x1, y1, w, base, motif, guard, rng, kind='rosette'):
    # a rectangular border band of width w (cells*S) between the outer rect and the inner rect
    for (a, b, c, e) in ((x0, y0, x1, y0 + w), (x0, y1 - w, x1, y1), (x0, y0, x0 + w, y1), (x1 - w, y0, x1, y1)):
        d.rectangle([a * SS, b * SS, c * SS, e * SS], fill=base)
    gw = max(3, int(w * .08))
    for (a, b, c, e) in ((x0, y0, x1, y1), (x0 + w, y0 + w, x1 - w, y1 - w)):
        d.rectangle([a * SS, b * SS, c * SS, e * SS], outline=guard, width=gw * SS)
    step = w * 1.0
    def put(cx, cy):
        if kind == 'rosette':
            poly(d, star(cx, cy, w * .36, w * .16, 8, math.pi / 8), fill=motif[0])
            d.ellipse([(cx - w * .1) * SS, (cy - w * .1) * SS, (cx + w * .1) * SS, (cy + w * .1) * SS], fill=motif[1])
        else:
            poly(d, [(cx, cy - w * .34), (cx + w * .34, cy), (cx, cy + w * .34), (cx - w * .34, cy)], fill=motif[0])
            poly(d, [(cx, cy - w * .16), (cx + w * .16, cy), (cx, cy + w * .16), (cx - w * .16, cy)], fill=motif[1])
    x = x0 + w / 2
    while x < x1 - w / 2 + 1: put(x, y0 + w / 2); put(x, y1 - w / 2); x += step
    y = y0 + w * 1.5
    while y < y1 - w * 1.5 + 1: put(x0 + w / 2, y); put(x1 - w / 2, y); y += step


def arabesque(d, rng, x0, y0, x1, y1, cols, n=140, size=(18, 34)):
    # scattered scrolling tendrils with small leaves (the arabesque ground)
    for _ in range(n):
        cx, cy = rng.uniform(x0, x1), rng.uniform(y0, y1)
        r = rng.uniform(*size); a0 = rng.uniform(0, 2 * math.pi); col = cols[rng.integers(0, len(cols))]
        pts = [(cx + r * (1 - t * .7) * math.cos(a0 + t * 4.2), cy + r * (1 - t * .7) * math.sin(a0 + t * 4.2)) for t in np.linspace(0, 1, 18)]
        d.line(sc(pts), fill=col, width=3 * SS)
        ex, ey = pts[0]; la = a0 - .6
        leaf = [(ex, ey), (ex + r * .5 * math.cos(la - .35), ey + r * .5 * math.sin(la - .35)), (ex + r * .8 * math.cos(la), ey + r * .8 * math.sin(la)), (ex + r * .5 * math.cos(la + .35), ey + r * .5 * math.sin(la + .35))]
        poly(d, leaf, fill=col)


def medallion(seed=1):
    rng = np.random.default_rng(seed)
    RED, DRED, PUR, GOLD, CREAM, TEAL, ORG, BRN = (150, 28, 26), (110, 18, 22), (78, 26, 66), (226, 178, 84), (240, 222, 170), (70, 140, 128), (196, 92, 38), (122, 52, 28)
    im, d = canvas(RED)
    # outer borders
    border_band(d, 0, 0, W, H, S * .5, BRN, (GOLD, TEAL), (40, 14, 20), rng, 'rosette')
    d.rectangle([S * .5 * SS, S * .5 * SS, (W - S * .5) * SS, (H - S * .5) * SS], outline=PUR, width=int(S * .12) * SS)
    fx0, fy0, fx1, fy1 = S * .62, S * .62, W - S * .62, H - S * .62
    arabesque(d, rng, fx0, fy0, fx1, fy1, [DRED, ORG, (170, 50, 36)], n=220)
    # corner spandrels: quarter stars
    for (cx, cy) in ((fx0, fy0), (fx1, fy0), (fx0, fy1), (fx1, fy1)):
        poly(d, star(cx, cy, S * 1.15, S * .8, 8, math.pi / 8), fill=PUR)
        poly(d, star(cx, cy, S * .8, S * .55, 8, math.pi / 8), fill=DRED)
        arabesque(d, rng, cx - S * .6, cy - S * .6, cx + S * .6, cy + S * .6, [GOLD, ORG], n=10, size=(10, 18))
    # the central medallion round point c3
    cx, cy = P(2, 2)
    poly(d, star(cx, cy, S * 2.15, S * 1.6, 8, math.pi / 8), fill=PUR)
    poly(d, star(cx, cy, S * 2.0, S * 1.48, 8, math.pi / 8), fill=BRN)
    arabesque(d, rng, cx - S * 1.5, cy - S * 1.5, cx + S * 1.5, cy + S * 1.5, [TEAL, GOLD, ORG], n=60, size=(14, 26))
    poly(d, star(cx, cy, S * 1.05, S * .78, 8, math.pi / 8), fill=RED)
    poly(d, star(cx, cy, S * .9, S * .66, 8, 0), outline=GOLD, width=4 * SS)
    for k in range(8):
        a = k * math.pi / 4
        px, py = cx + S * .55 * math.cos(a), cy + S * .55 * math.sin(a)
        poly(d, star(px, py, S * .12, S * .05, 4, a), fill=CREAM)
    d.ellipse([(cx - S * .32) * SS, (cy - S * .32) * SS, (cx + S * .32) * SS, (cy + S * .32) * SS], fill=PUR, outline=GOLD, width=5 * SS)
    poly(d, star(cx, cy, S * .26, S * .12, 12, 0), fill=GOLD)
    # pearls around the medallion
    for k in range(48):
        a = k * 2 * math.pi / 48; R = S * 1.78 + (S * .3 if k % 6 == 0 else 0)
        px, py = cx + R * math.cos(a), cy + R * math.sin(a)
        d.ellipse([(px - 5) * SS, (py - 5) * SS, (px + 5) * SS, (py + 5) * SS], fill=GOLD)
    return finish(im, rng)


def berber(seed=2):
    rng = np.random.default_rng(seed)
    ORA, MAG, PUR, GRN, WHT, BLK, BLU, YEL = (238, 118, 22), (176, 30, 110), (120, 30, 90), (40, 140, 70), (244, 238, 226), (24, 20, 22), (32, 64, 170), (246, 196, 40)
    im, d = canvas(ORA)
    # big free shapes
    poly(d, [(0, H * .38), (W * .55, H * .3), (W * .48, H * .72), (0, H * .8)], fill=MAG)
    poly(d, [(0, H * .62), (W * .3, H * .6), (W * .36, H * .84), (0, H * .9)], fill=PUR)
    poly(d, [(W * .28, H * .9), (W * .5, H * .62), (W * .62, H * .78), (W * .75, H * .7), (W * .7, H * .96), (W * .3, H)], fill=WHT)
    poly(d, [(W * .62, H * .2), (W, H * .14), (W, H * .45), (W * .72, H * .4)], fill=(230, 96, 18))
    poly(d, [(0, 0), (W * .3, 0), (W * .22, H * .22), (0, H * .26)], fill=(226, 102, 30))
    # black zigzag lines (hand-drawn)
    for (x0, y0, x1, y1, amp) in ((W * .08, H * .1, W * .4, H * .95, 40), (W * .58, H * .05, W * .9, H * .7, 34), (W * .2, H * .36, W * .95, H * .52, 30)):
        n = 9; pts = []
        for k in range(n + 1):
            t = k / n; x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t
            off = amp * (1 if k % 2 else -1)
            pts.append((x + off * .7, y + off * .4))
        d.line(sc(pts), fill=BLK, width=int(S * .09) * SS, joint='curve')
    # green and blue accents, diamonds
    for (x, y, r, c) in ((W * .3, H * .2, 26, GRN), (W * .78, H * .32, 22, WHT), (W * .15, H * .72, 24, GRN), (W * .86, H * .84, 28, BLU), (W * .5, H * .12, 20, PUR)):
        poly(d, [(x, y - r), (x + r, y), (x, y + r), (x - r, y)], fill=c)
    poly(d, [(W * .82, H * .55), (W, H * .5), (W, H * .62)], fill=GRN)
    # confetti dots
    cols = [WHT, BLU, GRN, BLK, YEL, MAG, (255, 160, 200)]
    for _ in range(420):
        x, y = rng.uniform(0, W), rng.uniform(0, H); r = rng.uniform(4, 8); c = cols[rng.integers(0, len(cols))]
        poly(d, [(x, y - r), (x + r, y), (x, y + r), (x - r, y)], fill=c)
    # a woven edge at the top and bottom
    for y0 in (0, H - S * .55):
        d.rectangle([0, y0 * SS, W * SS, (y0 + S * .55) * SS], fill=(238, 228, 206))
        for x in np.arange(10, W, 26):
            d.line(sc([(x, y0 + 6), (x + 10, y0 + S * .55 - 6)]), fill=(214, 200, 172), width=4 * SS)
    return finish(im, rng, pile=0.12, knot=False, abrash=0.03, fuzz=1.4)


def kilim(seed=3):
    rng = np.random.default_rng(seed)
    RED, ORA, PNK, YEL, TEAL, CRM, BLK, MAR = (204, 40, 46), (236, 110, 34), (232, 84, 120), (244, 186, 48), (40, 150, 140), (244, 232, 210), (36, 24, 28), (128, 22, 40)
    im, d = canvas(RED)
    cols = [RED, ORA, PNK, MAR, ORA, RED, PNK]
    xs = np.linspace(0, W, 8)
    for k in range(7):
        x0, x1 = xs[k], xs[k + 1]; base = cols[k]
        d.rectangle([x0 * SS, 0, x1 * SS, H * SS], fill=base)
        w = x1 - x0; y = rng.uniform(-40, 0)
        while y < H:
            kind = rng.integers(0, 4); h = w * rng.uniform(.8, 1.4); c1 = [YEL, TEAL, CRM, BLK, ORA, PNK][rng.integers(0, 6)]; c2 = [CRM, BLK, YEL, TEAL][rng.integers(0, 4)]
            cx, cy = (x0 + x1) / 2, y + h / 2
            if kind == 0:   # stepped diamond
                for s_, c in ((.46, c1), (.3, c2), (.14, c1)):
                    poly(d, [(cx, cy - h * s_), (cx + w * s_, cy), (cx, cy + h * s_), (cx - w * s_, cy)], fill=c)
            elif kind == 1:   # zigzag band
                pts = []
                for j in range(7): pts.append((x0 + w * j / 6, cy + (h * .25 if j % 2 else -h * .25)))
                d.line(sc(pts), fill=c1, width=int(w * .14) * SS); d.line(sc([(px, py + h * .22) for px, py in pts]), fill=c2, width=int(w * .07) * SS)
            elif kind == 2:   # triangles
                for j in range(3):
                    tx = x0 + w * (j + .5) / 3
                    poly(d, [(tx - w / 6, cy + h * .3), (tx, cy - h * .3), (tx + w / 6, cy + h * .3)], fill=c1 if j % 2 else c2)
            else:   # hooked cross
                t = w * .1
                d.rectangle([(cx - t) * SS, (cy - h * .4) * SS, (cx + t) * SS, (cy + h * .4) * SS], fill=c1)
                d.rectangle([(cx - w * .4) * SS, (cy - t) * SS, (cx + w * .4) * SS, (cy + t) * SS], fill=c1)
                for sx, sy in ((-1, -1), (1, 1)):
                    d.rectangle([(cx + sx * w * .4 - t) * SS, (cy + sy * h * .15 - t) * SS, (cx + sx * w * .4 + t) * SS, (cy + sy * h * .15 + t) * SS], fill=c2)
            y += h + rng.uniform(6, 24)
        d.line(sc([(x1, 0), (x1, H)]), fill=BLK, width=5 * SS)
    # flat-weave texture: horizontal weft ribs
    out = finish(im, rng, pile=0.05, knot=False, abrash=0.04, fuzz=0.5)
    a = np.asarray(out).astype(np.float64); yy = np.arange(H)[:, None]
    a *= (1 + 0.05 * np.sin(2 * np.pi * yy / 3.2))[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def patch(seed=4):
    rng = np.random.default_rng(seed)
    PAL = [(232, 160, 38), (214, 92, 40), (176, 40, 52), (120, 34, 90), (64, 50, 140), (40, 96, 150), (34, 120, 100), (90, 140, 60), (196, 186, 64), (150, 70, 40), (230, 120, 110), (70, 60, 80)]
    im, d = canvas((60, 40, 50))
    # the squares of the board (and a ring outside) are the tufted blocks
    for c in range(-2, 6):
        for r in range(-2, 6):
            x0, y0 = P(c, r + 1); x1, y1 = P(c + 1, r)
            col = PAL[(c * 5 + r * 7 + int(rng.integers(0, 3))) % len(PAL)]
            d.rectangle([x0 * SS, y0 * SS, x1 * SS, y1 * SS], fill=col)
            for _ in range(8):   # mottled tufts inside each block
                rr = rng.uniform(10, 26); tx, ty = rng.uniform(x0 + rr + 4, x1 - rr - 4), rng.uniform(y0 + rr + 4, y1 - rr - 4)
                k = rng.uniform(.85, 1.15); c2 = tuple(int(min(255, v * k)) for v in col)
                d.ellipse([(tx - rr) * SS, (ty - rr) * SS, (tx + rr) * SS, (ty + rr) * SS], fill=c2)
    out = finish(im, rng, pile=0.13, knot=False, abrash=0.02, fuzz=1.6)
    return out.filter(ImageFilter.GaussianBlur(0.6))


os.makedirs(OUT, exist_ok=True)
for name, fn in (('medallion', medallion), ('berber', berber), ('kilim', kilim), ('patch', patch)):
    fn().save(os.path.join(OUT, f'rug-{name}.webp'), quality=86, method=6)
    print(name)

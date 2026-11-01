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


def herati(d, x0, y0, x1, y1, s, cols, lw=3):
    """the herati repeat of Persian carpets: a lattice of small diamonds, a rosette in each, lancet leaves between.
    cols = (lattice, rosette, centre, leaf)"""
    lat, ros, cen, leaf = cols
    def lancet(cx, cy, a, L, w):
        ux, uy = math.cos(a), math.sin(a); px, py = -uy, ux
        pts = [(cx + ux * L * t + px * w * math.sin(math.pi * t) * (1 if k == 0 else -1), cy + uy * L * t + py * w * math.sin(math.pi * t) * (1 if k == 0 else -1)) for k in (0, 1) for t in (np.linspace(0, 1, 9) if k == 0 else np.linspace(1, 0, 9))]
        poly(d, pts, fill=leaf)
    for j, y in enumerate(np.arange(y0 - s, y1 + s, s / 2)):
        for x in np.arange(x0 - s + (s / 2 if j % 2 else 0), x1 + s, s):
            d.line(sc([(x, y - s / 2), (x + s / 2, y), (x, y + s / 2), (x - s / 2, y), (x, y - s / 2)]), fill=lat, width=lw * SS)



def medallion(seed=1):
    rng = np.random.default_rng(seed)
    RED, DRED, PUR, GOLD, CREAM, TEAL, ORG, BRN = (150, 28, 26), (110, 18, 22), (78, 26, 66), (226, 178, 84), (240, 222, 170), (70, 140, 128), (196, 92, 38), (122, 52, 28)
    im, d = canvas(RED)
    # outer borders
    border_band(d, 0, 0, W, H, S * .5, BRN, (GOLD, TEAL), (40, 14, 20), rng, 'rosette')
    d.rectangle([S * .5 * SS, S * .5 * SS, (W - S * .5) * SS, (H - S * .5) * SS], outline=PUR, width=int(S * .12) * SS)
    fx0, fy0, fx1, fy1 = S * .62, S * .62, W - S * .62, H - S * .62
    # corner spandrels: quarter stars
    for (cx, cy) in ((fx0, fy0), (fx1, fy0), (fx0, fy1), (fx1, fy1)):
        poly(d, star(cx, cy, S * 1.15, S * .8, 8, math.pi / 8), fill=PUR)
        poly(d, star(cx, cy, S * .8, S * .55, 8, math.pi / 8), fill=DRED)
        poly(d, star(cx, cy, S * .42, S * .2, 8, math.pi / 8), fill=GOLD); poly(d, star(cx, cy, S * .26, S * .12, 8, 0), fill=DRED)
    # the central medallion round point c3
    cx, cy = P(2, 2)
    poly(d, star(cx, cy, S * 2.15, S * 1.6, 8, math.pi / 8), fill=PUR)
    poly(d, star(cx, cy, S * 2.0, S * 1.48, 8, math.pi / 8), fill=BRN)
    herati(d, cx - S * 1.6, cy - S * 1.6, cx + S * 1.6, cy + S * 1.6, S * .5, ((86, 40, 26), TEAL, GOLD, (150, 70, 34)), lw=2)
    poly(d, star(cx, cy, S * 2.0, S * 1.48, 8, math.pi / 8), outline=GOLD, width=4 * SS)
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
    # ---- refinements: field frame with gold guards, rosettes at the 8-way points, palmettes along the medallion's lines
    gx0, gy0 = P(0, 4); gx1, gy1 = P(4, 0); pad = S * .5
    for k, (o, col, w) in enumerate(((pad, GOLD, 5), (pad - 10, CREAM, 2), (pad + 10, GOLD, 2))):
        d.rectangle([(gx0 - o) * SS, (gy0 - o) * SS, (gx1 + o) * SS, (gy1 + o) * SS], outline=col, width=w * SS)
    for (x, y) in ((gx0 - pad, gy0 - pad), (gx1 + pad, gy0 - pad), (gx0 - pad, gy1 + pad), (gx1 + pad, gy1 + pad)):
        poly(d, star(x, y, S * .2, S * .09, 8, math.pi / 8), fill=GOLD); d.ellipse([(x - 9) * SS, (y - 9) * SS, (x + 9) * SS, (y + 9) * SS], fill=PUR)
    for (c_, r_) in ((1, 1), (3, 1), (1, 3), (3, 3)):
        x, y = P(c_, r_)
        poly(d, star(x, y, S * .34, S * .24, 8, math.pi / 8), outline=GOLD, width=3 * SS)
        poly(d, star(x, y, S * .22, S * .1, 8, 0), fill=(176, 52, 40))
        for k in range(8):
            a = k * math.pi / 4 + math.pi / 8
            d.ellipse([(x + S * .28 * math.cos(a) - 4) * SS, (y + S * .28 * math.sin(a) - 4) * SS, (x + S * .28 * math.cos(a) + 4) * SS, (y + S * .28 * math.sin(a) + 4) * SS], fill=CREAM)
    for k in range(8):   # palmettes on the medallion's points, pointing along the eight lines from c3
        a = k * math.pi / 4; ux, uy = math.cos(a), math.sin(a); px, py = -uy, ux
        bx, by = cx + ux * S * 1.25, cy + uy * S * 1.25
        poly(d, [(bx + ux * S * .32, by + uy * S * .32), (bx + px * S * .13, by + py * S * .13), (bx - ux * S * .05, by - uy * S * .05), (bx - px * S * .13, by - py * S * .13)], fill=GOLD)
        poly(d, [(bx + ux * S * .2, by + uy * S * .2), (bx + px * S * .06, by + py * S * .06), (bx, by), (bx - px * S * .06, by - py * S * .06)], fill=TEAL)
    poly(d, star(cx, cy, S * 1.62, S * 1.2, 8, math.pi / 8), outline=GOLD, width=3 * SS)
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
    # hand-drawn black lozenges on the board's diagonals (the c3 diamond and the four corner diamonds) and Berber signs
    def loz(pts, w):
        q = []
        for (a, b) in zip(pts, pts[1:] + pts[:1]):
            for t in np.linspace(0, 1, 14)[:-1]:
                q.append((a[0] + (b[0] - a[0]) * t + rng.normal(0, 2.2), a[1] + (b[1] - a[1]) * t + rng.normal(0, 2.2)))
        d.line(sc(q + q[:1]), fill=BLK, width=int(w) * SS, joint='curve')
    for (cx_, cy_), rad in ((P(2, 2), 1.5),):
        for k, o in enumerate((0, -S * .13)):
            R_ = rad * S + o
            loz([(cx_, cy_ - R_), (cx_ + R_, cy_), (cx_, cy_ + R_), (cx_ - R_, cy_)], S * (.05 if k == 0 else .025))
    for (cx_, cy_) in (P(1, 1), P(3, 1), P(1, 3), P(3, 3)):
        for k in range(4):   # an "eye" sign inside the corner lozenges, between the lines
            a = k * math.pi / 2 + math.pi / 4; ex, ey = cx_ + S * .42 * math.cos(a), cy_ + S * .42 * math.sin(a)
            poly(d, [(ex, ey - 13), (ex + 13, ey), (ex, ey + 13), (ex - 13, ey)], fill=BLK); poly(d, [(ex, ey - 5), (ex + 5, ey), (ex, ey + 5), (ex - 5, ey)], fill=YEL)
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
    # contour lines along the columns: a small toothed band (wolf's teeth) on each seam, weft "lazy lines"
    for k in range(1, 7):
        x = xs[k]
        for y in np.arange(0, H, 16):
            poly(d, [(x - 9, y), (x, y + 8), (x - 9, y + 16)], fill=CRM if (y // 16) % 2 else BLK)
            poly(d, [(x + 9, y + 8), (x, y), (x + 9, y + 16)] if False else [(x + 9, y), (x + 2, y + 8), (x + 9, y + 16)], fill=BLK if (y // 16) % 2 else YEL)
    for _ in range(26):
        x0 = rng.uniform(0, W); y0 = rng.uniform(0, H); L = rng.uniform(30, 90)
        d.line(sc([(x0, y0), (x0 + L, y0 - L * .35)]), fill=tuple(int(v * .9) for v in RED), width=2 * SS)
    out = finish(im, rng, pile=0.05, knot=False, abrash=0.04, fuzz=0.5)
    a = np.asarray(out).astype(np.float64); yy = np.arange(H)[:, None]
    a *= (1 + 0.05 * np.sin(2 * np.pi * yy / 3.2))[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def patch(seed=4):
    rng = np.random.default_rng(seed)
    PAL = [(232, 160, 38), (214, 92, 40), (176, 40, 52), (120, 34, 90), (64, 50, 140), (40, 96, 150), (34, 120, 100), (90, 140, 60), (196, 186, 64), (150, 70, 40), (230, 120, 110), (70, 60, 80)]
    im, d = canvas((60, 40, 50))
    # the squares of the board (and a ring outside) are cloth blocks, each its own weave: linen, twill, corduroy, check
    for c in range(-2, 6):
        for r in range(-2, 6):
            x0, y0 = P(c, r + 1); x1, y1 = P(c + 1, r)
            col = PAL[(c * 5 + r * 7 + int(rng.integers(0, 3))) % len(PAL)]
            d.rectangle([x0 * SS, y0 * SS, x1 * SS, y1 * SS], fill=col)
            kind = (c * 3 + r * 5) % 4; dk = tuple(int(v * .86) for v in col); lt = tuple(int(min(255, v * 1.1)) for v in col)
            if kind == 1:   # twill
                for t in np.arange(-S, S, 7): d.line(sc([(x0 + t, y1), (x0 + t + S, y0)]), fill=dk, width=2 * SS)
            elif kind == 2:   # corduroy
                for t in np.arange(x0 + 3, x1, 9): d.line(sc([(t, y0), (t, y1)]), fill=dk, width=3 * SS)
            elif kind == 3:   # woven check
                for t in np.arange(x0 + 10, x1, 26): d.line(sc([(t, y0), (t, y1)]), fill=lt, width=6 * SS)
                for t in np.arange(y0 + 10, y1, 26): d.line(sc([(x0, t), (x1, t)]), fill=lt, width=6 * SS)
    out = finish(im, rng, pile=0.1, knot=(3.0, 3.0), abrash=0.02, fuzz=.8)
    a = np.asarray(out).astype(np.float64)
    # quilted: every block puffs up between the seams (shadow into the seam, a soft highlight on the upper-left slope)
    gx = np.array([P(k, 0)[0] for k in range(-2, 7)]); gy = np.array([P(0, k)[1] for k in range(-2, 7)])
    xs_, ys_ = np.arange(W)[None, :], np.arange(H)[:, None]
    dx = np.min(np.abs(xs_[..., None] - gx[None, None, :]), axis=2); dy = np.min(np.abs(ys_[..., None] - gy[None, None, :]), axis=2)
    dist = np.minimum(np.broadcast_to(dx, (H, W)), np.broadcast_to(dy, (H, W)))
    puff = 1 - .42 * np.exp(-dist / 9) + .06 * (1 - np.exp(-dist / 40))
    a *= puff[..., None]
    out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.4)).convert('RGBA')
    # thread: running stitches either side of each seam, quilting along the board's diagonals, cross-stitches and knots
    sh = Image.new('RGBA', (W * SS, H * SS), (0, 0, 0, 0)); th = Image.new('RGBA', (W * SS, H * SS), (0, 0, 0, 0))
    ds, dt = ImageDraw.Draw(sh), ImageDraw.Draw(th)
    THR, HI = (238, 224, 192, 255), (255, 250, 236, 255)
    def dash(p0, p1, w=4):
        ds.line([((p0[0] + 1.6) * SS, (p0[1] + 2) * SS), ((p1[0] + 1.6) * SS, (p1[1] + 2) * SS)], fill=(20, 10, 14, 200), width=int((w + 1.5) * SS))
        dt.line([(p0[0] * SS, p0[1] * SS), (p1[0] * SS, p1[1] * SS)], fill=THR, width=int(w * SS))
        dt.line([((p0[0] - .8) * SS, (p0[1] - .8) * SS), ((p1[0] - .8) * SS, (p1[1] - .8) * SS)], fill=HI, width=max(1, int(w * .35 * SS)))
    def run(a_, b_, step=20, ln=12, w=4):
        L = math.dist(a_, b_); ux, uy = (b_[0] - a_[0]) / L, (b_[1] - a_[1]) / L
        for t in np.arange(4, L, step): dash((a_[0] + ux * t, a_[1] + uy * t), (a_[0] + ux * (t + ln), a_[1] + uy * (t + ln)), w)
    for x in gx:
        run((x + 11, 0), (x + 11, H)); run((x - 11, 0), (x - 11, H))
    for y in gy:
        run((0, y + 11), (W, y + 11)); run((0, y - 11), (W, y - 11))
    for (p0, p1) in ((P(0, 0), P(4, 4)), (P(0, 4), P(4, 0)), (P(0, 2), P(2, 4)), (P(2, 4), P(4, 2)), (P(4, 2), P(2, 0)), (P(2, 0), P(0, 2))):
        for o in (-13, 13): run((p0[0] + o, p0[1]), (p1[0] + o, p1[1]), step=17, ln=10, w=3)
    for c in range(-2, 6):
        for r in range(-2, 6):
            x0, y0 = P(c, r + 1); x1, y1 = P(c + 1, r); mx, my = (x0 + x1) / 2, (y0 + y1) / 2
            if (c + r) % 2 == 0:
                dash((mx - 11, my - 11), (mx + 11, my + 11), 4); dash((mx - 11, my + 11), (mx + 11, my - 11), 4)
    th = Image.alpha_composite(sh.filter(ImageFilter.GaussianBlur(1.5 * SS)), th).resize((W, H), Image.LANCZOS)
    return Image.alpha_composite(out, th).convert('RGB')



# ------------------------------------------------------------------------------------------------ historical / modern / chalk
def wood_tex(rng, base, dark, ring=.12, scale=1.0):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    warp = gaussian_filter(rng.standard_normal((H, W)), (80, 30)); warp /= warp.std()
    g = np.sin((xx / (4.5 * scale) + warp * 1.1 + gaussian_filter(rng.standard_normal((H, W)), (90, 3)) * .9))
    fib = gaussian_filter(rng.standard_normal((H, W)), (14, .7)); fib /= fib.std()
    t = np.clip(.5 + .5 * g * ring * 4 + fib * .08, 0, 1)
    base, dark = np.array(base, float), np.array(dark, float)
    return base * (1 - t[..., None]) + dark * t[..., None]


def engrave(a, m, depth=.55, light=(255, 230, 190)):
    """burnt / carved line from a mask: dark groove with a thin highlight on the lower-right lip."""
    m = gaussian_filter(m, .7)
    sh = np.roll(np.roll(m, 2, 0), 2, 1)
    a = a * (1 - depth * m[..., None])
    a = a + (np.clip(sh - m, 0, 1) * .25)[..., None] * (np.array(light) - a)
    return a


def lmask(draw):
    im = Image.new('L', (W * SS, H * SS), 0); draw(ImageDraw.Draw(im))
    return np.asarray(im.resize((W, H), Image.LANCZOS)).astype(np.float64) / 255


def scroll_band(d, x0, y0, x1, y1, horiz, w):
    """a running scroll (S-curves with curled ends) along a border band, as carved on old game boards."""
    L = (x1 - x0) if horiz else (y1 - y0); n = max(2, int(L / (w * 1.6))); step = L / n
    for k in range(n):
        for side in (1, -1):
            pts = []
            for t in np.linspace(0, 1, 40):
                u = k * step + t * step; v = side * w * .22 * math.sin(t * math.pi) * (1 if k % 2 else -1)
                pts.append((x0 + u, (y0 + y1) / 2 + v) if horiz else ((x0 + x1) / 2 + v, y0 + u))
            d.line(sc(pts), fill=255, width=int(w * .12) * SS)
        cx, cy = ((x0 + k * step + step / 2, (y0 + y1) / 2) if horiz else ((x0 + x1) / 2, y0 + k * step + step / 2))
        for sgn in (1, -1):   # curls
            ox = (sgn * step * .22, 0) if horiz else (0, sgn * step * .22)
            pts = [(cx + ox[0] + w * .26 * (1 - t * .7) * math.cos(t * 5 + (0 if sgn > 0 else math.pi)), cy + ox[1] + w * .26 * (1 - t * .7) * math.sin(t * 5 + (0 if sgn > 0 else math.pi))) for t in np.linspace(0, 1, 24)]
            d.line(sc(pts), fill=255, width=int(w * .1) * SS)


def carved(seed=5):
    rng = np.random.default_rng(seed)
    a = wood_tex(rng, (150, 112, 74), (96, 64, 38))
    bw = S * .62; m0, m1 = S * .16, S * .16 + bw
    def frame_lines(d):
        for m in (m0, m0 + 8, m1, m1 - 8): d.rectangle([m * SS, m * SS, (W - m) * SS, (H - m) * SS], outline=255, width=3 * SS)
        for (cx, cy) in ((m0 + bw / 2, m0 + bw / 2), (W - m0 - bw / 2, m0 + bw / 2), (m0 + bw / 2, H - m0 - bw / 2), (W - m0 - bw / 2, H - m0 - bw / 2)):
            d.rectangle([(cx - bw / 2) * SS, (cy - bw / 2) * SS, (cx + bw / 2) * SS, (cy + bw / 2) * SS], fill=0, outline=255, width=3 * SS)
            d.ellipse([(cx - bw * .38) * SS, (cy - bw * .38) * SS, (cx + bw * .38) * SS, (cy + bw * .38) * SS], outline=255, width=3 * SS)
            for k in range(8):
                q = k * math.pi / 4
                d.line(sc([(cx, cy), (cx + bw * .3 * math.cos(q), cy + bw * .3 * math.sin(q))]), fill=255, width=3 * SS)
            d.ellipse([(cx - bw * .12) * SS, (cy - bw * .12) * SS, (cx + bw * .12) * SS, (cy + bw * .12) * SS], outline=255, width=3 * SS)
        scroll_band(d, m1, m0 + 8, W - m1, m1 - 8, True, bw - 16); scroll_band(d, m1, H - m1 + 8, W - m1, H - m0 - 8, True, bw - 16)
        scroll_band(d, m0 + 8, m1, m1 - 8, H - m1, False, bw - 16); scroll_band(d, W - m1 + 8, m1, W - m0 - 8, H - m1, False, bw - 16)
        cx, cy = P(2, 2); r = S * .18
        d.ellipse([(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS], outline=255, width=3 * SS)
    a = engrave(a, lmask(frame_lines), .6)
    # a darker stain toward the edges, oil sheen
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    a *= (1 - .22 * (((xx - W / 2) / (W / 2)) ** 4 + ((yy - H / 2) / (H / 2)) ** 4))[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def damask(seed=6):
    rng = np.random.default_rng(seed)
    base = np.array((58, 76, 96), float); hi = np.array((94, 112, 134), float)
    def motif(d):
        tw, th = S * 1.9, S * 2.3
        for j in range(-1, int(H / th) + 2):
            for i in range(-1, int(W / tw) + 2):
                cx = i * tw + (tw / 2 if j % 2 else 0); cy = j * th
                for sgn in (1, -1):   # mirrored acanthus scrolls
                    for (r0, a0, turns, w) in ((S * .5, -1.2, 1.5, 6), (S * .32, .6, 1.2, 5), (S * .22, 2.2, 1.0, 4)):
                        pts = [(cx + sgn * (r0 * (1 - t * .75) * math.cos(a0 + t * turns * 2 * math.pi)) + sgn * S * .2, cy + r0 * (1 - t * .75) * math.sin(a0 + t * turns * 2 * math.pi)) for t in np.linspace(0, 1, 60)]
                        d.line(sc(pts), fill=255, width=int(w * SS))
                        ex, ey = pts[0]
                        d.polygon(sc([(ex, ey), (ex + sgn * 18, ey - 30), (ex + sgn * 6, ey - 50), (ex - sgn * 8, ey - 26)]), fill=255)
                d.polygon(sc([(cx, cy - S * .55), (cx + S * .12, cy - S * .25), (cx, cy), (cx - S * .12, cy - S * .25)]), fill=255)
                d.ellipse([(cx - 10) * SS, (cy + S * .12 - 10) * SS, (cx + 10) * SS, (cy + S * .12 + 10) * SS], fill=255)
    m = gaussian_filter(lmask(motif), 1.2) * .55
    a = base * (1 - m[..., None]) + hi * m[..., None]
    fab = gaussian_filter(rng.standard_normal((H, W)), .6); fab /= fab.std()
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    a *= (1 + .025 * fab + .02 * np.sin(xx * 2.1) * np.sin(yy * 2.1))[..., None]
    # pinked (zig-zag) edge
    out = np.clip(a, 0, 255).astype(np.uint8); img = Image.fromarray(out)
    return img


def chalk(seed=7):
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    a = np.zeros((H, W, 3)); a[:] = (40, 42, 44)
    sm = gaussian_filter(rng.standard_normal((H, W)), 40); sm /= sm.std()
    a *= (1 + .06 * sm)[..., None]
    a += (np.clip(gaussian_filter(rng.standard_normal((H, W)), (6, 60)), 0, None) * 18)[..., None]   # old wiped chalk
    grain = gaussian_filter(rng.standard_normal((H, W)), .6); a *= (1 + .07 * grain / grain.std())[..., None]
    # chalk drawing: the triangles at the head and foot of the board, as scratched on old slates
    def tri(d):
        for top in (True, False):
            cx = P(2, 0)[0]; yb = P(2, 4)[1] if top else P(2, 0)[1]; ye = yb - S * 1.15 if top else yb + S * 1.15
            hw = S * 1.0
            pts = [(cx, yb), (cx - hw, ye), (cx + hw, ye), (cx, yb)]
            q = []
            for (p0, p1) in zip(pts, pts[1:]):
                for t in np.linspace(0, 1, 18): q.append((p0[0] + (p1[0] - p0[0]) * t + rng.normal(0, 1.2), p0[1] + (p1[1] - p0[1]) * t + rng.normal(0, 1.2)))
            d.line(sc(q), fill=255, width=7 * SS)
            d.line(sc([(cx, yb), (cx, ye)]), fill=255, width=7 * SS)
            ym = (yb + ye) / 2
            d.line(sc([(cx - hw / 2, ym), (cx + hw / 2, ym)]), fill=255, width=7 * SS)
    m = lmask(tri)
    dust = np.clip(gaussian_filter(rng.random((H, W)), .5) * 1.6 - .3, 0, 1)
    m = gaussian_filter(m, .8) * (.55 + .45 * dust)
    a = a * (1 - m[..., None] * .85) + np.array((232, 230, 222)) * (m[..., None] * .85)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


os.makedirs(OUT, exist_ok=True)
def dim(img, k=.8, sat=.85):
    a = np.asarray(img).astype(np.float64); g = a.mean(axis=2, keepdims=True)
    a = (g + (a - g) * sat) * k
    a = 255 * (a / 255) ** 1.12   # deeper shadows: wool, not paint
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


DIM = {'medallion': (.86, .9), 'berber': (.9, .86), 'kilim': (.9, .86), 'patch': (.92, .86), 'carved': (1, 1), 'damask': (1, 1), 'chalk': (1, 1)}
import sys
ALL = {'medallion': medallion, 'kilim': kilim, 'patch': patch, 'carved': carved, 'damask': damask, 'chalk': chalk}
for name, fn in ((n, ALL[n]) for n in (sys.argv[1:] or ALL)):
    dim(fn(), *DIM[name]).save(os.path.join(OUT, f'rug-{name}.webp'), quality=86, method=6)
    print(name)

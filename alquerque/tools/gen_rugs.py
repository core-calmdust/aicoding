#!/usr/bin/env python3
"""Rug boards for Alquerque, built on the board's own geometry (5x5 points; the frame is 6.5 x 7 cells, point (c, r) at
x = 1.25 + c, y = 1.5 + (4 - r) cells). The lines cut the field into 32 right triangles; the diagonals make a lattice of
diamonds round the 4-way points and eight-triangle rosettes round the 8-way points (b2 d2 b4 d4 and c3). Each design
decorates those triangles / diamonds / rosettes, lays a strap along every line and continues the lattice into the border.
  medallion — Persian / Arab carpet: pinwheel triangles with gold inlay and arabesque, khatam stars at the 8-way points
  berber    — Moroccan Azilal pile rug: bright diamonds round the 4-way points, black hand-drawn lozenges, shaggy pile
  kilim     — Anatolian flat-weave on a knot grid: stepped chevrons in the triangles, hooked motifs, wolf's-teeth border
  patch     — boucherouite patchwork: a different cloth in every triangle, stitched seams along the lines
python3 tools/gen_rugs.py [name ...] → img/rug-<name>.webp"""
import os, sys, math, numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter

S = 200
Wc, Hc = 6.5, 7
W, H = int(Wc * S), int(Hc * S)
SS = 2   # supersampling
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img')
P = lambda c, r: ((1.25 + c) * S, (1.5 + (4 - r)) * S)
FX0, FY0 = P(0, 4); FX1, FY1 = P(4, 0)   # the field (point rectangle)


def canvas(col, w=W, h=H):
    im = Image.new('RGB', (int(w * SS), int(h * SS)), col)
    return im, ImageDraw.Draw(im)


def sc(pts): return [(x * SS, y * SS) for x, y in pts]
def poly(d, pts, **kw): d.polygon(sc(pts), **kw)
def line(d, pts, col, w): d.line(sc(pts), fill=col, width=max(1, int(w * SS)), joint='curve')
def circ(d, x, y, r, **kw): d.ellipse([(x - r) * SS, (y - r) * SS, (x + r) * SS, (y + r) * SS], **kw)


def star(cx, cy, R, r, n, rot=0):
    return [(cx + (R if k % 2 == 0 else r) * math.cos(rot + math.pi * k / n), cy + (R if k % 2 == 0 else r) * math.sin(rot + math.pi * k / n)) for k in range(2 * n)]


def triangles():
    """the 32 triangles: (pts, apex) — apex = the right-angle corner; pts in order; meta (cell c, r, which half)."""
    out = []
    for c in range(4):
        for r in range(4):
            A, B, C, D = P(c, r), P(c + 1, r), P(c + 1, r + 1), P(c, r + 1)
            if (c + r) % 2 == 0: out += [((A, B, C), B, (c, r, 0)), ((A, C, D), D, (c, r, 1))]
            else: out += [((A, B, D), A, (c, r, 0)), ((B, C, D), C, (c, r, 1))]
    return out


def hub_of(tri):
    """the 8-way point a triangle belongs to (its rosette): the vertex with (c+r) even, both odd — or c3."""
    pts = tri[0]
    best = None
    for (x, y) in pts:
        c = round(x / S - 1.25); r = round(4 - (y / S - 1.5))
        if c % 2 == 1 and r % 2 == 1: best = (c, r)
    return best


def incenter(pts):
    (ax, ay), (bx, by), (cx, cy) = pts
    a = math.dist((bx, by), (cx, cy)); b = math.dist((ax, ay), (cx, cy)); c = math.dist((ax, ay), (bx, by))
    p = a + b + c; ix = (a * ax + b * bx + c * cx) / p; iy = (a * ay + b * by + c * cy) / p
    s = p / 2; area = abs((bx - ax) * (cy - ay) - (cx - ax) * (by - ay)) / 2
    return ix, iy, area / s


def inset(pts, dd):
    ix, iy, rr = incenter(pts); k = max(0.0, (rr - dd) / rr)
    return [(ix + (x - ix) * k, iy + (y - iy) * k) for x, y in pts]


def mask_of(pts, w=W, h=H):
    m = Image.new('L', (int(w * SS), int(h * SS)), 0); ImageDraw.Draw(m).polygon(sc(pts), fill=255); return m


def all_lines():
    L = []
    for r in range(5): L.append((P(0, r), P(4, r)))
    for c in range(5): L.append((P(c, 0), P(c, 4)))
    for (a, b) in (((0, 0), (4, 4)), ((0, 4), (4, 0)), ((0, 2), (2, 4)), ((2, 4), (4, 2)), ((4, 2), (2, 0)), ((2, 0), (0, 2))):
        L.append((P(*a), P(*b)))
    return L


def noise(rng, sy, sx, h=H, w=W):
    x = gaussian_filter(rng.standard_normal((h, w)), (sy, sx)); return x / (x.std() + 1e-9)


def finish(im, rng, pile=0.07, knot=(5.0, 4.0), abrash=0.05, fuzz=0.6, vig=0.12):
    im = im.resize((W, H), Image.LANCZOS)
    a = np.asarray(im).astype(np.float64)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    tex = noise(rng, fuzz, fuzz) * 0.6 + noise(rng, 2.5, 1.2) * 0.4
    if knot: tex += 0.55 * (np.sin(2 * np.pi * xx / knot[0]) * np.sin(2 * np.pi * yy / knot[1]))
    ab = noise(rng, 70, 1200)
    a *= (1 + pile * tex[..., None] + abrash * ab[..., None])
    v = 1 - vig * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    a *= v[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def arabesque(d, rng, x0, y0, x1, y1, cols, n=140, size=(14, 28), w=2.4):
    for _ in range(n):
        cx, cy = rng.uniform(x0, x1), rng.uniform(y0, y1)
        r = rng.uniform(*size); a0 = rng.uniform(0, 2 * math.pi); col = cols[rng.integers(0, len(cols))]; sp = rng.choice([-1, 1])
        pts = [(cx + r * (1 - t * .72) * math.cos(a0 + sp * t * 4.4), cy + r * (1 - t * .72) * math.sin(a0 + sp * t * 4.4)) for t in np.linspace(0, 1, 22)]
        line(d, pts, col, w)
        ex, ey = pts[0]; la = a0 - sp * .6
        poly(d, [(ex, ey), (ex + r * .45 * math.cos(la - .38), ey + r * .45 * math.sin(la - .38)), (ex + r * .78 * math.cos(la), ey + r * .78 * math.sin(la)), (ex + r * .45 * math.cos(la + .38), ey + r * .45 * math.sin(la + .38))], fill=col)
        mx, my = pts[11]; circ(d, mx, my, w * 1.1, fill=col)


def pasted(base, layer, pts):
    base.paste(layer, (0, 0), mask_of(pts))


def node_kind(c, r):
    if c % 2 == 1 and r % 2 == 1 or (c, r) == (2, 2): return 8
    if (c + r) % 2 == 0: return 8 if 0 < c < 4 and 0 < r < 4 else (3 if (c in (0, 4)) != (r in (0, 4)) else 2)
    return 4 if 0 < c < 4 and 0 < r < 4 else 3


# ------------------------------------------------------------------------------------------------ medallion
def medallion(seed=1):
    rng = np.random.default_rng(seed)
    CRIM, DCRIM, IND, DIND, GOLD, CREAM, TEAL, ORG, BRN, IVR = (158, 30, 30), (112, 18, 24), (34, 40, 92), (22, 24, 58), (222, 172, 78), (242, 226, 182), (52, 128, 120), (204, 100, 40), (92, 36, 22), (236, 214, 160)
    im, d = canvas(DCRIM)
    # ---- border system: outer guard (reciprocal teeth), main border (cartouches + rosettes), inner guard (rhombs)
    def frame_rect(m, col): d.rectangle([m * SS, m * SS, (W - m) * SS, (H - m) * SS], fill=col)
    frame_rect(0, DIND); frame_rect(S * .1, IVR); frame_rect(S * .16, DIND)
    # reciprocal teeth in the outer guard
    tw = S * .12
    for side in range(4):
        L = W if side < 2 else H; n = int(L / tw)
        for k in range(n):
            a = k * L / n; b = (k + 1) * L / n; m = (a + b) / 2
            if side == 0: poly(d, [(a, S * .1), (b, S * .1), (m, S * .16)], fill=CRIM)
            elif side == 1: poly(d, [(a, H - S * .1), (b, H - S * .1), (m, H - S * .16)], fill=CRIM)
            elif side == 2: poly(d, [(S * .1, a), (S * .1, b), (S * .16, m)], fill=CRIM)
            else: poly(d, [(W - S * .1, a), (W - S * .1, b), (W - S * .16, m)], fill=CRIM)
    m0, m1 = S * .2, S * .62   # main border band
    d.rectangle([m0 * SS, m0 * SS, (W - m0) * SS, (H - m0) * SS], fill=IND)
    d.rectangle([m1 * SS, m1 * SS, (W - m1) * SS, (H - m1) * SS], fill=DCRIM)
    bw = m1 - m0; bc = (m0 + m1) / 2
    # running vine along the main border
    for side in range(4):
        horiz = side < 2; L0, L1 = (m0, (W - m0)) if horiz else (m0, (H - m0)); fixed = bc if side in (0, 2) else ((H - bc) if side == 1 else (W - bc))
        ts = np.linspace(L0 + bw, L1 - bw, 260)
        pts = [((t, fixed + math.sin(t / S * math.pi * 2.2) * bw * .22) if horiz else (fixed + math.sin(t / S * math.pi * 2.2) * bw * .22, t)) for t in ts]
        line(d, pts, GOLD, 2.2)
    # cartouches and rosettes alternating
    def cart(cx, cy, horiz, ln):
        hw, hh = (ln / 2, bw * .3) if horiz else (bw * .3, ln / 2)
        pts = [(cx - hw, cy), (cx - hw + hh * 1.2 if horiz else cx - hw, cy - hh if horiz else cy - hh + hw * 1.2),
               (cx + hw - hh * 1.2 if horiz else cx - hw, cy - hh if horiz else cy + hh - hw * 1.2)] if False else None
        if horiz: pts = [(cx - hw, cy), (cx - hw + hh, cy - hh), (cx + hw - hh, cy - hh), (cx + hw, cy), (cx + hw - hh, cy + hh), (cx - hw + hh, cy + hh)]
        else: pts = [(cx, cy - hh), (cx + hw, cy - hh + hw), (cx + hw, cy + hh - hw), (cx, cy + hh), (cx - hw, cy + hh - hw), (cx - hw, cy - hh + hw)]
        poly(d, pts, fill=CRIM, outline=GOLD, width=3 * SS)
        x0, x1 = (cx - hw + hh, cx + hw - hh) if horiz else (cx - hw * .5, cx + hw * .5); y0, y1 = (cy - hh * .5, cy + hh * .5) if horiz else (cy - hh + hw, cy + hh - hw)
        arabesque(d, rng, x0, y0, x1, y1, [IVR, ORG], n=7, size=(6, 11), w=1.6)
    def ros(cx, cy):
        poly(d, star(cx, cy, bw * .38, bw * .24, 8, math.pi / 8), fill=GOLD)
        poly(d, star(cx, cy, bw * .26, bw * .15, 8, 0), fill=CRIM)
        circ(d, cx, cy, bw * .08, fill=IVR)
    for horiz, L, fixeds in ((True, W, (bc, H - bc)), (False, H, (bc, W - bc))):
        n = 6 if horiz else 7; span = (L - 2 * m1) / n
        for f in fixeds:
            for k in range(n):
                t = m1 + span * (k + .5)
                cx, cy = (t, f) if horiz else (f, t)
                cart(cx, cy, horiz, span * .62)
            for k in range(n + 1):
                t = m1 + span * k
                cx, cy = (t, f) if horiz else (f, t)
                if m1 * .9 < t < L - m1 * .9: ros(cx, cy)
    for (cx, cy) in ((bc, bc), (W - bc, bc), (bc, H - bc), (W - bc, H - bc)):
        d.rectangle([(cx - bw / 2) * SS, (cy - bw / 2) * SS, (cx + bw / 2) * SS, (cy + bw / 2) * SS], fill=DIND)
        poly(d, star(cx, cy, bw * .44, bw * .2, 8, math.pi / 8), fill=GOLD); circ(d, cx, cy, bw * .12, fill=CRIM)
    # gold guard lines
    for m in (m0, m1, m1 + S * .05):
        d.rectangle([m * SS, m * SS, (W - m) * SS, (H - m) * SS], outline=GOLD, width=int(S * .018) * SS)
    # ---- the ground between the border and the field: the board's lattice carried on as a trellis
    gx0, gy0, gx1, gy1 = m1 + S * .05, m1 + S * .05, W - m1 - S * .05, H - m1 - S * .05
    tr = Image.new('RGB', im.size, DCRIM); td = ImageDraw.Draw(tr)
    arabesque(td, rng, gx0, gy0, gx1, gy1, [(136, 28, 30), (128, 40, 26)], n=420, size=(10, 22), w=2)
    for k in range(-12, 14):   # 45° trellis through the board's points
        for sgn in (1, -1):
            x0 = FX0 + k * S
            pts = [(x0 - 8 * S, FY0 - sgn * 8 * S), (x0 + 8 * S, FY0 + sgn * 8 * S)] if False else [(x0 - 8 * S * sgn, FY0 - 8 * S), (x0 + 8 * S * sgn, FY0 + 8 * S)]
            line(td, pts, (176, 70, 40), 2.2)
    for c in range(-2, 7):
        for r in range(-3, 8):
            x, y = P(c, r)
            if (c + r) % 2 == 0: poly(td, star(x, y, S * .07, S * .03, 4, 0), fill=GOLD)
    im.paste(tr, (0, 0), mask_of([(gx0, gy0), (gx1, gy0), (gx1, gy1), (gx0, gy1)]))
    d = ImageDraw.Draw(im)
    # field panel: a stepped (cusped) outline round the points
    pad = S * .42
    fp = [(FX0 - pad, FY0 - pad), (FX1 + pad, FY0 - pad), (FX1 + pad, FY1 + pad), (FX0 - pad, FY1 + pad)]
    poly(d, fp, fill=DIND)
    for k in range(3):
        e = pad - S * (.06 + k * .05)
        d.rectangle([(FX0 - e) * SS, (FY0 - e) * SS, (FX1 + e) * SS, (FY1 + e) * SS], outline=(GOLD, IVR, GOLD)[k], width=int(S * (.022 if k != 1 else .012)) * SS)
    for (x, y) in ((FX0 - pad, FY0 - pad), (FX1 + pad, FY0 - pad), (FX0 - pad, FY1 + pad), (FX1 + pad, FY1 + pad)):
        poly(d, star(x, y, S * .22, S * .1, 8, math.pi / 8), fill=GOLD); circ(d, x, y, S * .06, fill=CRIM)
    # ---- the 32 triangles: pinwheel crimson / indigo round each rosette, gold inlay, arabesque inside
    for (pts, apex, (c, r, h)) in triangles():
        hub = hub_of((pts,))
        hx, hy = P(*hub)
        ix, iy, _ = incenter(pts)
        ang = math.atan2(iy - hy, ix - hx); k = int(((ang + math.pi) / (math.pi / 4))) % 8
        base, ink = (CRIM, (184, 54, 44)) if k % 2 == 0 else (IND, (60, 66, 128))
        lay = Image.new('RGB', im.size, base); ld = ImageDraw.Draw(lay)
        arabesque(ld, rng, ix - S * .6, iy - S * .6, ix + S * .6, iy + S * .6, [ink, (ORG if k % 2 == 0 else TEAL)], n=26, size=(9, 17), w=1.8)
        # a palmette pointing into the rosette
        dx, dy = hx - ix, hy - iy; L = math.hypot(dx, dy); ux, uy = dx / L, dy / L; px, py = -uy, ux
        tip = (ix + ux * S * .2, iy + uy * S * .2); bot = (ix - ux * S * .12, iy - uy * S * .12)
        pal = [tip, (bot[0] + px * S * .1, bot[1] + py * S * .1), (bot[0] + ux * S * .04, bot[1] + uy * S * .04), (bot[0] - px * S * .1, bot[1] - py * S * .1)]
        poly(ld, pal, fill=GOLD); poly(ld, [(tip[0] - ux * S * .05, tip[1] - uy * S * .05), (bot[0] + px * S * .045 + ux * S * .03, bot[1] + py * S * .045 + uy * S * .03), (bot[0] + ux * S * .01, bot[1] + uy * S * .01), (bot[0] - px * S * .045 + ux * S * .03, bot[1] - py * S * .045 + uy * S * .03)], fill=CRIM if k % 2 else IND)
        circ(ld, bot[0] - ux * S * .05, bot[1] - uy * S * .05, S * .025, fill=IVR)
        pasted(im, lay, pts)
        d = ImageDraw.Draw(im)
        poly(d, inset(pts, S * .07), outline=GOLD, width=int(S * .014) * SS)
        poly(d, inset(pts, S * .095), outline=IVR, width=max(1, int(S * .006)) * SS)
        # pearl beads along the hypotenuse inset
        q = inset(pts, S * .07)
        for (a, b) in ((q[0], q[1]), (q[1], q[2]), (q[2], q[0])):
            n = int(math.dist(a, b) / (S * .09))
            for j in range(1, n):
                t = j / n; circ(d, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, S * .011, fill=IVR)
    # ---- straps along every line (the app draws its line in the middle)
    for (a, b) in all_lines():
        line(d, [a, b], DIND, S * .1); line(d, [a, b], GOLD, S * .072); line(d, [a, b], (120, 76, 30), S * .03)
    # ---- rosettes at the points
    for c in range(5):
        for r in range(5):
            x, y = P(c, r); k = node_kind(c, r)
            if (c, r) == (2, 2):
                poly(d, star(x, y, S * .5, S * .34, 16, 0), fill=GOLD)
                poly(d, star(x, y, S * .44, S * .3, 16, 0), fill=DIND)
                poly(d, star(x, y, S * .36, S * .26, 8, math.pi / 8), fill=GOLD)
                poly(d, star(x, y, S * .32, S * .23, 8, math.pi / 8), fill=CRIM)
                for j in range(8):
                    a = j * math.pi / 4 + math.pi / 8; circ(d, x + S * .2 * math.cos(a), y + S * .2 * math.sin(a), S * .022, fill=IVR)
                circ(d, x, y, S * .11, fill=DIND, outline=GOLD, width=3 * SS)
            elif k == 8:
                poly(d, star(x, y, S * .36, S * .25, 8, math.pi / 8), fill=GOLD)
                poly(d, star(x, y, S * .31, S * .22, 8, math.pi / 8), fill=DIND)
                poly(d, star(x, y, S * .25, S * .1, 8, 0), fill=TEAL)
                circ(d, x, y, S * .08, fill=GOLD)
            elif k == 4:
                poly(d, star(x, y, S * .25, S * .1, 4, math.pi / 4), fill=GOLD)
                poly(d, star(x, y, S * .2, S * .08, 4, 0), fill=CRIM, outline=GOLD, width=2 * SS)
                circ(d, x, y, S * .05, fill=IVR)
            else:
                poly(d, star(x, y, S * .2, S * .09, 4, 0), fill=GOLD); circ(d, x, y, S * .06, fill=CRIM, outline=IVR, width=2 * SS)
    return finish(im, rng, pile=0.06, knot=(5.0, 4.0), abrash=0.05, fuzz=0.6)


# ------------------------------------------------------------------------------------------------ berber
def berber(seed=2):
    rng = np.random.default_rng(seed)
    CRM, ORA, MAG, PUR, GRN, BLU, YEL, BLK, PNK, RED = (240, 230, 208), (238, 120, 24), (184, 32, 112), (112, 36, 96), (38, 140, 76), (38, 70, 168), (244, 196, 44), (26, 22, 24), (244, 150, 180), (206, 46, 40)
    im, d = canvas(CRM)
    # the ground: soft colour blocks of the Azilal rugs
    for _ in range(30):
        x, y = rng.uniform(0, W), rng.uniform(0, H); r = rng.uniform(.3, .8) * S
        poly(d, [(x + r * math.cos(a) * rng.uniform(.7, 1.2), y + r * math.sin(a) * rng.uniform(.7, 1.2)) for a in np.linspace(0, 2 * math.pi, 9)[:-1]], fill=(236, 222, 196) if rng.random() < .6 else (244, 236, 220))
    # the diamonds of the lattice: round every 4-way point (c+r odd), extended a ring outside the board
    cols = [ORA, MAG, BLU, GRN, PUR, RED, YEL, PNK]
    for c in range(-2, 7):
        for r in range(-2, 7):
            if (c + r) % 2 == 0: continue
            x, y = P(c, r)
            inside = 0 <= c <= 4 and 0 <= r <= 4
            col = cols[(c * 3 + r * 5) % len(cols)] if inside else cols[(c * 7 + r * 3) % len(cols)]
            dm = lambda s: [(x, y - S * s), (x + S * s, y), (x, y + S * s), (x - S * s, y)]
            if not inside:
                poly(d, dm(.42), fill=col); poly(d, dm(.2), fill=CRM); continue
            poly(d, dm(.94), fill=col)
            # stepped (knotted) inner diamonds
            for s_, cc in ((.7, CRM), (.6, cols[(c * 3 + r * 5 + 3) % len(cols)]), (.42, CRM), (.32, BLK), (.18, YEL)):
                st = S * .05; pts = []
                R = S * s_; n = int(R / st)
                for j in range(n + 1): pts += [(x + j * st, y - R + j * st), (x + (j + 1) * st, y - R + j * st)]
                q = pts[:]
                full = []
                for (px, py) in q: full.append((min(px, x + R), py))
                full += [(x + R, y)]
                quad = [(px - x, py - y) for px, py in full]
                ring = quad + [(-qy, qx) for qx, qy in quad][::-1][::-1]
                # simpler: rotate the stepped quarter four times
                Q = [(px - x, py - y) for px, py in full]
                outline = []
                for k in range(4):
                    for (qx, qy) in Q:
                        for _ in range(k): qx, qy = -qy, qx
                        outline.append((x + qx, y + qy))
                poly(d, outline, fill=cc)
            # hooks on the diamond's corners (along the board's lines)
            for (ux, uy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                hx, hy = x + ux * S * .78, y + uy * S * .78
                line(d, [(hx - uy * S * .1, hy + ux * S * .1), (hx, hy), (hx + uy * S * .1, hy - ux * S * .1)], BLK, S * .03)
    # black hand-drawn lozenge lines doubling the diagonals (wobbly), and X crosses at the 8-way points
    for (a, b) in all_lines()[10:]:
        for off in (-S * .1, S * .1):
            dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy); px, py = -dy / L * off, dx / L * off
            pts = []
            for t in np.linspace(0, 1, 40):
                w = math.sin(t * 37 + off) * 3 + rng.normal(0, 1.2)
                pts.append((a[0] + dx * t + px + w * -dy / L, a[1] + dy * t + py + w * dx / L))
            line(d, pts, BLK, S * .028)
    for c in range(5):
        for r in range(5):
            if (c + r) % 2: continue
            x, y = P(c, r)
            for k in range(4):
                a = k * math.pi / 2 + math.pi / 4
                poly(d, [(x, y), (x + S * .22 * math.cos(a - .25), y + S * .22 * math.sin(a - .25)), (x + S * .3 * math.cos(a), y + S * .3 * math.sin(a)), (x + S * .22 * math.cos(a + .25), y + S * .22 * math.sin(a + .25))], fill=BLK)
            circ(d, x, y, S * .09, fill=YEL if (c, r) != (2, 2) else MAG)
    # confetti knots
    for _ in range(700):
        x, y = rng.uniform(0, W), rng.uniform(0, H); r = rng.uniform(3, 6); c = [BLU, GRN, BLK, YEL, MAG, PNK, ORA][rng.integers(0, 7)]
        poly(d, [(x, y - r), (x + r, y), (x, y + r), (x - r, y)], fill=c)
    # woven ends with fringes at the top and bottom; side selvedges
    for y0, dirn in ((0, 1), (H - S * .5, -1)):
        d.rectangle([0, y0 * SS, W * SS, (y0 + S * .5) * SS], fill=(232, 222, 198))
        for k, yy in enumerate(np.linspace(y0 + 10, y0 + S * .5 - 10, 5)):
            col = [BLK, ORA, BLK, MAG, BLK][k]
            pts = [(x, yy + (6 if (x // 16) % 2 else -6)) for x in np.arange(0, W + 16, 16)]
            line(d, pts, col, 4)
    for x0 in (0, W - S * .1):
        d.rectangle([x0 * SS, 0, (x0 + S * .1) * SS, H * SS], fill=(60, 44, 40))
    out = finish(im, rng, pile=0.14, knot=None, abrash=0.03, fuzz=1.3, vig=0.08)
    # shaggy pile: short random strands
    a = np.asarray(out).astype(np.float64)
    sh = gaussian_filter(rng.standard_normal((H, W)), (2.2, .7)); sh /= sh.std()
    a *= (1 + .07 * sh[..., None])
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


# ------------------------------------------------------------------------------------------------ kilim (knot grid)
def kilim(seed=3):
    rng = np.random.default_rng(seed)
    K = 8   # pixels per knot
    gw, gh = W // K + 1, H // K + 1
    RED, MAR, ORA, YEL, TEAL, CRM, BLK, PNK, IND = (198, 38, 44), (120, 22, 40), (232, 112, 34), (240, 184, 52), (34, 140, 132), (242, 228, 204), (34, 24, 28), (228, 92, 120), (44, 52, 110)
    g = np.zeros((gh, gw, 3), np.uint8); g[:] = MAR
    X, Y = np.meshgrid((np.arange(gw) + .5) * K, (np.arange(gh) + .5) * K)
    def tri_mask(pts):
        (ax, ay), (bx, by), (cx, cy) = pts
        def s(px, py, qx, qy, rx, ry): return (px - rx) * (qy - ry) - (qx - rx) * (py - ry)
        d1 = s(X, Y, ax, ay, bx, by); d2 = s(X, Y, bx, by, cx, cy); d3 = s(X, Y, cx, cy, ax, ay)
        neg = (d1 < 0) | (d2 < 0) | (d3 < 0); pos = (d1 > 0) | (d2 > 0) | (d3 > 0)
        return ~(neg & pos)
    # border: wolf's-teeth bands, a band of hooked lozenges, inner teeth
    def band(m0, m1, col):
        msk = ((X >= m0) & (X <= W - m0) & (Y >= m0) & (Y <= H - m0)) & ~((X > m1) & (X < W - m1) & (Y > m1) & (Y < H - m1)); g[msk] = col
    band(0, S * .14, BLK); band(S * .14, S * .62, RED); band(S * .62, S * .7, BLK)
    # teeth: along each side, stepped triangles (knot staircase)
    def teeth(m, depth, period, col, inward=1):
        # distance from the edge rect at m
        dx = np.minimum(X - m, W - m - X); dy = np.minimum(Y - m, H - m - Y)
        dist = np.minimum(dx, dy)
        along = np.where(dx < dy, Y, X)
        ph = np.abs(((along / period) % 1) - .5) * 2
        msk = (dist >= 0) & (dist < depth * (1 - ph)) & (dx >= 0) & (dy >= 0)
        g[msk] = col
    teeth(S * .14, S * .16, S * .32, YEL)
    teeth(S * .62 - S * .16 * 0, S * .0, S * .32, YEL)
    # hooked lozenges in the main band
    bc = S * .38
    for horiz, L in ((True, W), (False, H)):
        n = int((L - 2 * S * .7) / (S * .5)); sp = (L - 2 * S * .7) / n
        for f in (bc, (H - bc) if horiz else (W - bc)):
            for k in range(n):
                t = S * .7 + sp * (k + .5); cx, cy = (t, f) if horiz else (f, t)
                r1 = np.abs(X - cx) + np.abs(Y - cy)
                g[r1 < S * .2] = (YEL, TEAL, CRM)[k % 3]; g[r1 < S * .13] = BLK; g[r1 < S * .06] = (PNK, YEL, RED)[k % 3]
                for sx, sy in ((1, 1), (-1, -1)):   # little hooks
                    hx, hy = cx + sx * S * .17, cy - sy * S * .02
                    g[(np.abs(X - hx) < S * .03) & (np.abs(Y - hy) < S * .07)] = CRM
    # the field ground: horizontal kilim stripes of tiny motifs (between border and field panel)
    pad = S * .4
    gm = (X > S * .7) & (X < W - S * .7) & (Y > S * .7) & (Y < H - S * .7)
    stripe = ((Y // (S * .24)) % 4).astype(int)
    for k, col in enumerate((RED, ORA, RED, PNK)):
        g[gm & (stripe == k)] = col
    dots = gm & (((X // K) + (Y // K)) % 6 == 0) & (((Y // K) % 3) == 0)
    g[dots] = CRM
    # the field panel
    fm = (X > FX0 - pad) & (X < FX1 + pad) & (Y > FY0 - pad) & (Y < FY1 + pad)
    g[fm] = BLK
    g[(X > FX0 - pad + K * 2) & (X < FX1 + pad - K * 2) & (Y > FY0 - pad + K * 2) & (Y < FY1 + pad - K * 2)] = YEL
    g[(X > FX0 - pad + K * 3) & (X < FX1 + pad - K * 3) & (Y > FY0 - pad + K * 3) & (Y < FY1 + pad - K * 3)] = MAR
    # the triangles: stepped chevrons parallel to the hypotenuse; pinwheel colours round each rosette
    for (pts, apex, (c, r, h)) in triangles():
        hub = hub_of((pts,)); hx, hy = P(*hub); ix, iy, rr = incenter(pts)
        k = int(((math.atan2(iy - hy, ix - hx) + math.pi) / (math.pi / 4))) % 8
        pal = [(RED, ORA, YEL, CRM), (IND, TEAL, CRM, YEL)][k % 2]
        m = tri_mask(inset(pts, S * .06))
        # distance from the apex along the median → bands
        ax, ay = apex; mx, my = (sum(p[0] for p in pts) - ax) / 2, (sum(p[1] for p in pts) - ay) / 2
        ux, uy = mx - ax, my - ay; L = math.hypot(ux, uy); ux /= L; uy /= L
        t = ((X - ax) * ux + (Y - ay) * uy) / L
        bands = (t * 7).astype(int)
        for j in range(8):
            g[m & (bands == j)] = pal[j % 4]
        # a hooked "eye" in the middle
        e = np.abs(X - ix) + np.abs(Y - iy)
        g[m & (e < rr * .45)] = BLK; g[m & (e < rr * .3)] = pal[2]; g[m & (e < rr * .14)] = RED if k % 2 else IND
        g[tri_mask(pts) & ~tri_mask(inset(pts, S * .06))] = BLK
    # lines as weft-wrapped bands (cream)
    for (a, b) in all_lines():
        dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy)
        dist = np.abs((X - a[0]) * dy - (Y - a[1]) * dx) / L; t = ((X - a[0]) * dx + (Y - a[1]) * dy) / L ** 2
        mm = (dist < S * .05) & (t > -0.02) & (t < 1.02); g[mm] = CRM
    # motifs at the points: elibelinde-ish hooked stars (8-way), small crosses (4-way)
    for c in range(5):
        for r in range(5):
            x, y = P(c, r); kd = node_kind(c, r)
            dd = np.abs(X - x) + np.abs(Y - y); ch = np.maximum(np.abs(X - x), np.abs(Y - y))
            if kd == 8:
                R = S * (.34 if (c, r) == (2, 2) else .27)
                g[dd < R] = BLK; g[(dd < R * .82) & (ch < R * .55)] = YEL; g[dd < R * .55] = RED; g[ch < R * .18] = CRM
                for sx, sy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    hx, hy = x + sx * R * .95, y + sy * R * .95
                    g[(np.abs(X - hx) < S * .045) & (np.abs(Y - hy) < S * .045)] = TEAL
            else:
                R = S * .17
                g[(dd < R)] = BLK; g[(dd < R * .7)] = TEAL if kd == 4 else ORA; g[ch < R * .22] = CRM
    # render each knot as a little woven pass
    img = Image.fromarray(g).resize((gw * K, gh * K), Image.NEAREST).crop((0, 0, W, H))
    a = np.asarray(img).astype(np.float64)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    fx = (xx % K) / K - .5; fy = (yy % K) / K - .5
    sh = 1 - .55 * (fy ** 2) * 2 - .15 * np.abs(fx)   # weft ribs
    a *= sh[..., None]
    a *= (1 + .05 * noise(rng, .6, .6)[..., None] + .05 * noise(rng, 40, 1600)[..., None])
    a *= (1 - .1 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2))[..., None]
    out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    return out.filter(ImageFilter.GaussianBlur(.35))


# ------------------------------------------------------------------------------------------------ patch
def patch(seed=4):
    rng = np.random.default_rng(seed)
    PAL = [(232, 160, 38), (214, 92, 40), (176, 40, 52), (120, 34, 90), (64, 50, 140), (40, 96, 150), (34, 120, 100), (90, 140, 60), (196, 186, 64), (150, 70, 40), (230, 120, 110), (70, 60, 80), (236, 220, 190)]
    im, d = canvas((58, 36, 46))
    def cloth(kind, base, alt, pts, ang):
        lay = Image.new('RGB', im.size, base); ld = ImageDraw.Draw(lay)
        ix, iy, rr = incenter(pts); R = S * 1.2
        ca, sa = math.cos(ang), math.sin(ang)
        if kind == 0:   # stripes along the hypotenuse
            for k in range(-20, 21):
                o = k * S * .07
                line(ld, [(ix + ca * -R - sa * o, iy + sa * -R + ca * o), (ix + ca * R - sa * o, iy + sa * R + ca * o)], alt if k % 2 else base, S * .035)
        elif kind == 1:   # polka dots
            for x in np.arange(ix - R, ix + R, S * .1):
                for y in np.arange(iy - R, iy + R, S * .1):
                    circ(ld, x + (S * .05 if int(y / (S * .1)) % 2 else 0), y, S * .022, fill=alt)
        elif kind == 2:   # gingham check
            for k in range(-14, 15):
                o = k * S * .09
                line(ld, [(ix - R, iy + o), (ix + R, iy + o)], alt, S * .04); line(ld, [(ix + o, iy - R), (ix + o, iy + R)], alt, S * .04)
        elif kind == 3:   # small diamonds
            for x in np.arange(ix - R, ix + R, S * .12):
                for y in np.arange(iy - R, iy + R, S * .12):
                    poly(ld, [(x, y - S * .04), (x + S * .04, y), (x, y + S * .04), (x - S * .04, y)], fill=alt)
        elif kind == 4:   # zigzag (chevron) knit
            for k in range(-16, 17):
                o = k * S * .08
                pts2 = [(ix + t, iy + o + (S * .04 if int((t + R) / (S * .08)) % 2 else -S * .04)) for t in np.arange(-R, R, S * .08)]
                line(ld, pts2, alt, S * .022)
        elif kind == 5:   # embroidered stars
            for x in np.arange(ix - R, ix + R, S * .22):
                for y in np.arange(iy - R, iy + R, S * .22):
                    poly(ld, star(x, y, S * .06, S * .025, 4, 0), fill=alt)
        else:   # ikat blur bands
            for k in range(-10, 11):
                o = k * S * .14 + rng.uniform(-6, 6)
                line(ld, [(ix - R, iy + o), (ix + R, iy + o + rng.uniform(-8, 8))], alt, S * .06)
            lay = lay.filter(ImageFilter.GaussianBlur(3))
        im.paste(lay, (0, 0), mask_of(pts))
    j = 0
    # outer patchwork strips (border) cut along the extended lattice
    for c in range(-2, 6):
        for r in range(-2, 6):
            if 0 <= c < 4 and 0 <= r < 4: continue
            A, B, C, D = P(c, r), P(c + 1, r), P(c + 1, r + 1), P(c, r + 1)
            for tri in (((A, B, C), (A, C, D)) if (c + r) % 2 == 0 else ((A, B, D), (B, C, D))):
                base = PAL[(c * 5 + r * 3 + len(tri)) % len(PAL)]
                cloth(int(rng.integers(0, 7)), tuple(int(v * .78) for v in base), tuple(int(v * .95) for v in PAL[(c * 2 + r * 7 + 3) % len(PAL)]), tri, math.pi / 4)
    for (pts, apex, (c, r, h)) in triangles():
        base = PAL[(c * 5 + r * 7 + h * 3) % len(PAL)]; alt = PAL[(c * 3 + r * 2 + h * 5 + 6) % len(PAL)]
        if alt == base: alt = PAL[(PAL.index(base) + 4) % len(PAL)]
        (ax, ay) = apex; mx, my = (sum(p[0] for p in pts) - ax) / 2, (sum(p[1] for p in pts) - ay) / 2
        cloth(j % 7, base, alt, pts, math.atan2(my - ay, mx - ax) + math.pi / 2); j += 1
    d = ImageDraw.Draw(im)
    # seams: a dark welt along every edge of the lattice (inside and out), with running stitches either side
    seams = []
    for k in range(-3, 9):
        seams.append(((FX0 - 3 * S, FY0 + (k - 1) * S), (FX1 + 3 * S, FY0 + (k - 1) * S)))
        seams.append(((FX0 + (k - 2) * S, FY0 - 3 * S), (FX0 + (k - 2) * S, FY1 + 3 * S)))
    for k in range(-8, 14, 2):
        seams.append(((FX0 + (k - 6) * S, FY0 - 6 * S), (FX0 + (k + 6) * S, FY0 + 6 * S)))
        seams.append(((FX0 + (k + 6) * S, FY0 - 6 * S), (FX0 + (k - 6) * S, FY0 + 6 * S)))
    for (a, b) in seams:
        line(d, [a, b], (40, 26, 30), S * .05)
        dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy); ux, uy = dx / L, dy / L; px, py = -uy, ux
        n = int(L / (S * .09))
        for i in range(n):
            t = i * S * .09
            for side in (-1, 1):
                sx, sy = a[0] + ux * t + px * side * S * .06, a[1] + uy * t + py * side * S * .06
                line(d, [(sx, sy), (sx + ux * S * .045, sy + uy * S * .045)], (244, 226, 180), S * .012)
    # embroidered rosettes at the points
    for c in range(5):
        for r in range(5):
            x, y = P(c, r); kd = node_kind(c, r)
            R = S * (.24 if kd == 8 else .16)
            circ(d, x, y, R, fill=(40, 26, 30))
            for k in range(12 if kd == 8 else 8):
                a = k * 2 * math.pi / (12 if kd == 8 else 8)
                line(d, [(x + R * .3 * math.cos(a), y + R * .3 * math.sin(a)), (x + R * .85 * math.cos(a), y + R * .85 * math.sin(a))], (244, 200, 90) if k % 2 else (236, 110, 90), S * .022)
            circ(d, x, y, R * .25, fill=(244, 226, 180))
    out = finish(im, rng, pile=0.1, knot=None, abrash=0.02, fuzz=1.0, vig=0.1)
    return out.filter(ImageFilter.GaussianBlur(0.4))


os.makedirs(OUT, exist_ok=True)
ALL = {'medallion': medallion, 'berber': berber, 'kilim': kilim, 'patch': patch}
for name in (sys.argv[1:] or ALL):
    ALL[name]().save(os.path.join(OUT, f'rug-{name}.webp'), quality=88, method=6)
    print(name)

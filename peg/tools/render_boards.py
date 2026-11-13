#!/usr/bin/env python3
"""Dev tool (2026-11-11): the 2D page's boards and marbles as realistic pictures (user: 実在感のある高級な盤と駒).
python3 peg/tools/render_boards.py [geo.json]   → peg/img/bd-<look>-<board>.webp (the whole SVG viewBox, transparent around
                                                    the board) and peg/img/m-<set>-<k>.webp (marbles, seen from above)
Each board is shaded from a height map (the turned edge, the bead, the groove, the drilled cups, raised inlay) with an albedo,
a gloss and a metal mask: lambert + blinn highlight + a soft studio reflection, ambient occlusion in the hollows and the
board's shadow on the table. geo.json: the page's own geometry (peg/app.js geo(): hole centres, R / groove, triangle) so the
picture lines up with the live holes exactly.
Looks (the keys stay the page's settings.bd):
  walnut — Victorian figured walnut, boxwood-and-ebony stringing, a brass ring inside the groove, French polish
  maple  — 'Versailles': ebonised pearwood with a gilt-bronze border of laurel leaves and fleurs-de-lis, gilt cup rims
  stone  — Carrara marble with a verde-antico band and brass stringing, honed cups
  night  — 漆と蒔絵: black urushi, gold maki-e waves (seigaiha) on the rim, nashiji gold flakes, a vermilion groove
"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as nd

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'img')
N = 1500                     # pixels across the viewBox
rng = np.random.default_rng(20261111)

def fbm(shape, scales, amps, aniso=(1, 1), seed=0):
    r = np.random.default_rng(seed); out = np.zeros(shape, np.float32)
    for s, a in zip(scales, amps):
        z = r.standard_normal(shape).astype(np.float32)
        z = nd.gaussian_filter(z, (s * aniso[0], s * aniso[1]), mode='wrap')
        z /= (z.std() + 1e-6); out += a * z
    return out

def norm01(x): x = x - x.min(); return x / (x.max() + 1e-9)

def lerp(c0, c1, t):
    c0 = np.array(c0, np.float32) / 255; c1 = np.array(c1, np.float32) / 255
    return c0 + (c1 - c0) * t[..., None]

# ---------------------------------------------------------------- materials (albedo 0..1, gloss 0..1, metal 0/1)
def wood_walnut(sh, seed=1):
    """natural flat-sawn walnut: long, gently wavering grain lines with a soft cathedral in the middle, medium-light tone"""
    h, w = sh
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32) / max(h, w)
    drift = fbm(sh, [200, 80], [1, .4], seed=seed) * .012                      # the grain runs nearly straight
    y = yy + drift
    lines = np.zeros(sh, np.float32)
    rr = np.random.default_rng(seed)
    pos = np.sort(rr.random(70))
    for p_ in pos:                                                           # growth rings of uneven spacing and strength
        lines += rr.uniform(.4, 1) * np.exp(-((y - p_) / rr.uniform(.0025, .006)) ** 2)
    lines = np.clip(lines, 0, 1.2)
    streak = fbm(sh, [1.4, .6], [1, .5], aniso=(1, 20), seed=seed + 1)            # fine fibres along the board
    tone = norm01(fbm(sh, [120], [1], seed=seed + 2))
    t = np.clip(.38 + .22 * lines + .05 * streak - .08 * tone, 0, 1)   # (faint grain — user)
    alb = lerp((176, 122, 78), (92, 56, 32), t)
    pores = fbm(sh, [.5], [1], aniso=(1, 12), seed=seed + 3) > 2.3
    alb[pores] *= .82
    return alb

def wood_box(sh, seed=5):     # pale boxwood stringing
    f = norm01(fbm(sh, [6, 2], [1, .5], aniso=(1, 5), seed=seed))
    return lerp((236, 206, 150), (196, 160, 104), f)

def ebony(sh, seed=7):
    f = norm01(fbm(sh, [5, 1.5], [1, .5], aniso=(1, 7), seed=seed))
    return lerp((28, 22, 20), (8, 6, 6), f)

def marble_carrara(sh, seed=11):
    h, w = sh
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32) / max(h, w)
    turb = fbm(sh, [60, 20, 6, 2], [1, .6, .3, .15], seed=seed)
    v = np.abs(np.sin((xx * 3.2 + yy * 1.4) * math.pi * 2 + turb * 2.2))
    veins = np.clip(1 - v / .06, 0, 1) ** 1.6 + .5 * np.clip(1 - v / .02, 0, 1)
    fine = np.abs(np.sin((xx * 9 - yy * 5) * math.pi * 2 + fbm(sh, [10, 3], [1, .5], seed=seed + 1) * 3))
    veins = np.clip(veins + .35 * np.clip(1 - fine / .03, 0, 1), 0, 1)
    base = lerp((241, 239, 234), (222, 220, 215), norm01(fbm(sh, [30, 8], [1, .5], seed=seed + 2)))
    grey = np.array([128, 130, 136], np.float32) / 255
    return base * (1 - veins[..., None] * .75) + grey * veins[..., None] * .75

def marble_verde(sh, seed=13):
    turb = norm01(fbm(sh, [14, 4, 1.5], [1, .7, .4], seed=seed))
    alb = lerp((24, 66, 48), (8, 30, 22), turb)
    v = np.abs(np.sin(fbm(sh, [18, 5], [1, .6], seed=seed + 1) * 3.5))
    alb = alb * (1 - .55 * np.clip(1 - v / .08, 0, 1)[..., None]) + np.array([.82, .86, .8]) * .55 * np.clip(1 - v / .08, 0, 1)[..., None]
    return alb

GOLD = np.array([.93, .74, .38], np.float32)
BRASS = np.array([.85, .66, .34], np.float32)

# ---------------------------------------------------------------- drawing helpers (pixel space)
class Canvas:
    def __init__(s, g):
        s.g = g; s.h = g['size'] / 2; s.px = N / g['size']                # pixels per spacing
        yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
        s.u = (xx + .5) / s.px - s.h; s.v = (yy + .5) / s.px - s.h       # board units, centre (0, 0)
        s.r = np.hypot(s.u, s.v); s.ang = np.arctan2(s.v, s.u)
    def mask_board(s):
        g = s.g
        if not g['tri']: return s.r <= g['R']
        im = Image.new('L', (N, N), 0); d = ImageDraw.Draw(im)
        rr = .55 * s.px
        P = [((x + s.h) * s.px, (y + s.h) * s.px) for x, y in g['P']]
        d.polygon(P, fill=255)
        m = np.array(im) > 127
        # rounded corners: erode then dilate by rr
        dist = nd.distance_transform_edt(m)
        m2 = dist > rr
        dist2 = nd.distance_transform_edt(~m2)
        return dist2 <= rr
    def edge_dist(s, m):
        return nd.distance_transform_edt(m) / s.px                          # units from the board edge (inside)
    def cups(s):
        """distance to the nearest hole centre (units) and the index"""
        H = np.array(s.g['holes'], np.float32)
        best = np.full((N, N), 9e9, np.float32)
        for x, y in H:
            d = np.hypot(s.u - x, s.v - y); best = np.minimum(best, d)
        return best
    def groove_dist(s):
        g = s.g
        if not g['tri']: return np.abs(s.r - g['gr'])
        gy, x0, x1 = g['groove']['y'], g['groove']['x0'], g['groove']['x1']
        dx = np.maximum(0, np.maximum(x0 - s.u, s.u - x1))
        return np.hypot(dx, s.v - gy)
    def ring_band(s, a, b):
        """mask of a band at edge distance a..b (round) — for the triangle the same by edge distance"""
        return (s.ed >= a) & (s.ed < b)

def smooth_step(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

# ---------------------------------------------------------------- shading
def shade(H, A, G, Mt, mask, px, look, env_tint=(1, 1, 1)):
    """H height (units), A albedo, G gloss (0..1), Mt metal (0..1) → RGBA"""
    Hs = nd.gaussian_filter(H, .7)
    gy, gx = np.gradient(Hs * px)
    n = np.dstack([-gx, -gy, np.ones_like(H)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    L = np.array([-.45, -.62, .64]); L /= np.linalg.norm(L)
    V = np.array([0, 0, 1.0]); Hh = (L + V); Hh /= np.linalg.norm(Hh)
    ndl = np.clip(n @ L, 0, 1); ndh = np.clip(n @ Hh, 0, 1)
    # ambient occlusion: hollows darker
    ao = np.clip(1 - np.clip(nd.gaussian_filter(H, 6) - H, 0, None) * 3.2 - np.clip(nd.gaussian_filter(H, 18) - H, 0, None) * 1.2, .45, 1)
    # a soft studio reflection: bright above-left, dark below-right (by the normal's tilt) + the window strip
    tilt = n[..., 0] * -.6 + n[..., 1] * -.8
    envv = np.clip(.55 + tilt * 1.6, 0, 1.4)
    diff = A * (.30 + .78 * ndl[..., None]) * ao[..., None]
    shin = 20 + G * 260
    spec = (ndh ** shin) * (.15 + G * 1.6)
    col = diff * (1 - Mt[..., None]) + (A * (.18 + envv[..., None] * .95) * ao[..., None]) * Mt[..., None]
    spec_col = np.where(Mt[..., None] > .5, A * 1.2 + .15, np.ones_like(A))
    col = col + spec[..., None] * spec_col * (.55 + .45 * ao[..., None])
    # lacquer / polish: a faint clear-coat sheen of the room
    col += (G * np.clip(tilt * .35 + .05, 0, .3) * (1 - Mt))[..., None] * .35
    col = np.clip(col * np.array(env_tint), 0, 1)
    # the board's shadow on the table (outside the board)
    sh = nd.gaussian_filter(mask.astype(np.float32), px * .22)
    sh = nd.shift(sh, (px * .16, px * .09), order=1)
    alpha = np.where(mask, 1.0, np.clip(sh * .62, 0, .62))
    rgb = np.where(mask[..., None], col, 0)
    return np.dstack([rgb, alpha])

def to_img(rgba):
    a = np.clip(rgba, 0, 1)
    # gamma for display (shading done roughly linear)
    rgb = a[..., :3] ** (1 / 1.18)
    return Image.fromarray((np.dstack([rgb, a[..., 3:]]) * 255).astype(np.uint8), 'RGBA')

# ---------------------------------------------------------------- the boards
CUP_R = .30
def spots(c, g, face_r):
    """ornament places: the empty corners between the arms (4 symmetric spots with the most room), radius = room"""
    H = np.array(g['holes'], np.float32); out = []
    if g['tri']:
        return []
    best = None
    for r in np.linspace(.8, face_r, 60):
        a = math.pi / 4; x, y = math.cos(a) * r, math.sin(a) * r
        room = min(np.min(np.hypot(H[:, 0] - x, H[:, 1] - y)) - CUP_R - .1, face_r - r)
        if best is None or room > best[1]: best = (r, room)
    r, room = best
    if room < .35: return []
    return [(math.cos(math.pi / 4 + k * math.pi / 2) * r, math.sin(math.pi / 4 + k * math.pi / 2) * r, room, math.pi / 4 + k * math.pi / 2) for k in range(4)]

def tri_spots(c, g):
    """the triangle: the two lower corners beside the groove and the top corner"""
    P = g['P']; H = np.array(g['holes'], np.float32); out = []
    cx, cy = sum(p[0] for p in P) / 3, sum(p[1] for p in P) / 3
    for (x, y) in P:
        best = None
        for t in np.linspace(.25, .75, 30):
            px_, py_ = x + (cx - x) * t, y + (cy - y) * t
            room = np.min(np.hypot(H[:, 0] - px_, H[:, 1] - py_)) - CUP_R - .1
            ed = c.ed[int((py_ + c.h) * c.px), int((px_ + c.h) * c.px)]
            room = min(room, ed - .3)
            if best is None or room > best[2]: best = (px_, py_, room)
        if best[2] > .25: out.append((best[0], best[1], best[2], math.atan2(cy - y, cx - x) + math.pi / 2))
    return out

class Mask:
    def __init__(s, c): s.c = c; s.im = Image.new('L', (N, N), 0); s.d = ImageDraw.Draw(s.im)
    def P(s, x, y): return ((x + s.c.h) * s.c.px, (y + s.c.h) * s.c.px)
    def circle(s, x, y, r, fill=255, width=0):
        box = [s.P(x - r, y - r), s.P(x + r, y + r)]
        if width: s.d.ellipse(box, outline=fill, width=max(1, int(width * s.c.px)))
        else: s.d.ellipse(box, fill=fill)
    def poly(s, pts, fill=255): s.d.polygon([s.P(*p) for p in pts], fill=fill)
    def arr(s, blur=.8):
        im = s.im.filter(ImageFilter.GaussianBlur(blur)) if blur else s.im
        return np.array(im, np.float32) / 255

def rot(x, y, a): return x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)

def fan(mk_light, mk_dark, x, y, r, a):
    """a marquetry sunburst: 24 rays of boxwood and dark walnut, a small ebony boss"""
    n = 24
    for i in range(n):
        a0, a1 = a + 2 * math.pi * i / n, a + 2 * math.pi * (i + 1) / n
        pts = [(x, y)] + [(x + math.cos(t) * r, y + math.sin(t) * r) for t in np.linspace(a0, a1, 5)]
        (mk_light if i % 2 == 0 else mk_dark).poly(pts)

def fleur_shape(mk, x, y, s, rotA):
    def R(px_, py_):
        dx, dy = rot(px_ * s, py_ * s, rotA); return (x + dx, y + dy)
    mk.poly([R(*p) for p in [(0, -1), (.2, -.62), (.14, -.12), (0, .05), (-.14, -.12), (-.2, -.62)]])
    for sg in (-1, 1):
        mk.poly([R(*p) for p in [(sg * .1, -.05), (sg * .42, -.62), (sg * .72, -.6), (sg * .78, -.3), (sg * .55, .02), (sg * .22, .12)]])
        mk.poly([R(*p) for p in [(sg * .55, -.55), (sg * .9, -.78), (sg * .85, -.45)]])
    mk.poly([R(*p) for p in [(-.5, .12), (.5, .12), (.5, .26), (-.5, .26)]])
    mk.poly([R(*p) for p in [(-.13, .26), (.13, .26), (.22, .68), (0, .54), (-.22, .68)]])

def wreath(mk, x, y, r, leaf=.075):
    n = int(2 * math.pi * r / (leaf * 1.5))
    for i in range(n):
        a = 2 * math.pi * i / n
        for sg in (-1, 1):
            cx_, cy_ = x + math.cos(a) * (r + sg * leaf * .45), y + math.sin(a) * (r + sg * leaf * .45)
            tang = a + math.pi / 2 + sg * .5
            pts = []
            for t in np.linspace(0, 2 * math.pi, 12):
                lx, ly = leaf * math.cos(t), leaf * .38 * math.sin(t)
                dx, dy = rot(lx, ly, tang); pts.append((cx_ + dx, cy_ + dy))
            mk.poly(pts)

def star8(mk_a, mk_b, x, y, r, a0):
    for i in range(8):
        a = a0 + i * math.pi / 4; L = r if i % 2 == 0 else r * .66
        tip = (x + math.cos(a) * L, y + math.sin(a) * L)
        l = (x + math.cos(a - .39) * r * .34, y + math.sin(a - .39) * r * .34); rr_ = (x + math.cos(a + .39) * r * .34, y + math.sin(a + .39) * r * .34)
        mk_a.poly([(x, y), l, tip]); mk_b.poly([(x, y), tip, rr_])

def plum(mk, x, y, r, a0, mk_line=None):
    for i in range(5):
        a = a0 + i * 2 * math.pi / 5
        mk.circle(x + math.cos(a) * r * .52, y + math.sin(a) * r * .52, r * .46)
    if mk_line:
        for i in range(5):
            a = a0 + i * 2 * math.pi / 5 + math.pi / 5
            mk_line.poly([(x, y), (x + math.cos(a - .04) * r * .7, y + math.sin(a - .04) * r * .7), (x + math.cos(a + .04) * r * .7, y + math.sin(a + .04) * r * .7)])
            mk_line.circle(x + math.cos(a) * r * .72, y + math.sin(a) * r * .72, r * .06)
        mk_line.circle(x, y, r * .16)

def pine_wave(mk, x, y, r, a0):
    """a gold maki-e roundel: three seigaiha arcs in a disc"""
    for row in range(3):
        for k in range(-2, 3):
            cx_, cy_ = x + k * r * .42 + (row % 2) * r * .21, y + r * (.55 - row * .38)
            for q in (1, .7, .4):
                if math.hypot(cx_ - x, cy_ - y) < r * .95: mk.circle(cx_, cy_, r * .2 * q, width=.016)

def build(g, look):
    c = Canvas(g); px = c.px
    m = c.mask_board(); ed = c.edge_dist(m); c.ed = ed
    tri = g['tri']
    gw = .22                                            # groove half width
    gc = (g['R'] - g['gr']) if not tri else None        # groove centre as an edge distance (round boards)
    H = np.zeros((N, N), np.float32)
    # the turned edge: a rounded shoulder, a small bead, then the flat face
    H += np.where(m, .5 * smooth_step(ed, 0, .16), 0)
    gd = c.groove_dist()
    H -= np.where(m, .11 * (.5 + .5 * np.cos(np.clip(gd / gw, 0, 1) * math.pi)), 0)
    cd = c.cups()
    cup = np.clip(1 - (cd / CUP_R) ** 2, 0, 1)
    H -= .2 * cup ** .5
    H += .01 * np.exp(-((cd - CUP_R - .008) / .018) ** 2)
    A = np.zeros((N, N, 3), np.float32); G = np.zeros((N, N), np.float32); Mt = np.zeros((N, N), np.float32)
    inner = (gc + gw + .07) if not tri else .34           # where the face's border lines go
    def put(mask, col, gl, met=0, lift=0):
        mm = mask > .5 if mask.dtype != bool else mask
        if np.ndim(col) == 3: A[mm] = col[mm]
        else: A[mm] = col
        G[mm] = gl; Mt[mm] = met
        if lift: H[mm] += lift
    def line(at, w): return m & (np.abs(ed - at) < w)
    sp = []   # (no corner ornaments — user 2026-11-11: too much to look at)
    if look == 'walnut':
        A[:] = wood_walnut((N, N), 1); G[:] = .66
        box, eb = wood_box((N, N)), ebony((N, N))
        put(line(inner, .018), box, .55); put(line(inner + .045, .014), eb, .6); put(line(inner + .085, .018), box, .55)
        if not tri: put(line(gc - gw - .015, .016), BRASS, .85, 1, .004)                 # a brass lip outside the groove
        ml, md = Mask(c), Mask(c)
        for x, y, room, a in sp:
            r = min(room, .95) * .92; fan(ml, md, x, y, r, a)
            md.circle(x, y, r * 1.06, width=.05); ml.circle(x, y, r * 1.13, width=.022); md.circle(x, y, r * .14)
        put(ml.arr(.6), box, .6); put(md.arr(.6), eb * 1.5 + np.array([.05, .03, .02]), .65)
        cm = cup > 0; A[cm] *= (.5 + .5 * (1 - cup[cm]))[..., None]; G[cm] = .35
        gm = (gd < gw) & m; A[gm] *= .62; G[gm] = .4
    elif look == 'maple':   # Versailles
        A[:] = ebony((N, N), 7) * 1.3 + np.array([.03, .018, .012]); G[:] = .82
        put(m & (gd >= gw) & (ed < (gc - gw if not tri else .2)), GOLD * .97, .78, 1)      # gilt-bronze edge, right up to the groove (no dark strip)
        put(line(inner, .02), GOLD, .82, 1, .004); put(line(inner + .05, .008), GOLD * .9, .8, 1)
        mg = Mask(c)
        for x, y, room, a in sp:
            r = min(room, 1.0)
            wreath(mg, x, y, r * .8, leaf=r * .1); fleur_shape(mg, x, y, r * .5, 0)
        orn = mg.arr(.9); put(orn > .45, GOLD, .7, 1); H += orn * .03
        rim = m & (np.abs(cd - CUP_R - .03) < .02); put(rim, GOLD, .84, 1, .008)
        gm = (gd < gw) & m
        vel = np.array([.34, .06, .07])[None] * (.75 + .25 * norm01(fbm((N, N), [2.5], [1], seed=31)))[..., None]
        put(gm, vel, .25)                                                                # red velvet in the groove
        cm = (cup > 0) & ~rim; A[cm] *= (.55 + .45 * (1 - cup[cm]))[..., None]
    elif look == 'stone':
        A[:] = marble_carrara((N, N)); G[:] = .72
        verde = marble_verde((N, N))
        put(line(inner, .012), BRASS, .85, 1, .003)   # (one brass line; no dark band round the face — user)
        ma, mb, mr = Mask(c), Mask(c), Mask(c)
        for x, y, room, a in sp:
            r = min(room, .95); mv = Mask(c); mv.circle(x, y, r * .95); put(mv.arr(.5), marble_verde((N, N)) * .0 + np.array([.93, .9, .84]), .8); star8(ma, mb, x, y, r * .9, a); mr.circle(x, y, r * .95, width=.03)
        sienna = lerp((214, 160, 90), (150, 92, 40), norm01(fbm((N, N), [6, 2], [1, .5], seed=17)))
        put(ma.arr(.5), verde, .85); put(mb.arr(.5), sienna, .85); put(mr.arr(.5), BRASS, .85, 1, .003)
        cm = cup > 0; A[cm] *= (.8 + .2 * (1 - cup[cm]))[..., None]; G[cm] = .3
        gm = (gd < gw) & m; A[gm] = A[gm] * .9; G[gm] = .4
    elif look == 'art':   # colourful art (2026-11-13): white with a spot painting between the holes — small round spots of many colours
        # on a regular grid (offset half a hole from the holes), quiet enough for the coloured marbles to lead
        u, v = c.u, c.v
        WH = np.array([1.14, 1.13, 1.1]); A[:] = WH; G[:] = .3
        SP = [(232, 74, 92), (246, 160, 60), (250, 214, 64), (150, 206, 92), (60, 170, 120), (60, 190, 196), (64, 140, 222), (60, 70, 160), (150, 110, 210), (226, 120, 180), (176, 150, 120), (110, 116, 120), (238, 170, 160), (190, 220, 170), (160, 200, 236), (90, 60, 80)]
        rr_ = np.random.default_rng(5)
        H0 = np.array(g['holes'], np.float32)
        xs = np.arange(math.floor(-g['size'] / 2), math.ceil(g['size'] / 2) + 1) + .5
        pts_ = [(x, y) for x in xs for y in xs]
        if tri:   # (the triangle: the spots between its holes — the middle of each small triangle of three holes)
            pts_ = []
            for i1, (x1, y1) in enumerate(H0):
                for i2, (x2, y2) in enumerate(H0):
                    for i3, (x3, y3) in enumerate(H0):
                        if i1 < i2 < i3 and max(math.hypot(x1 - x2, y1 - y2), math.hypot(x2 - x3, y2 - y3), math.hypot(x1 - x3, y1 - y3)) < 1.05: pts_.append(((x1 + x2 + x3) / 3, (y1 + y2 + y3) / 3))
        face = m & (ed > (gc + gw + .12 if not tri else .45))
        sp = np.zeros((N, N, 3), np.float32); spm = np.zeros((N, N), bool)
        for x, y in pts_:
                if not tri and math.hypot(x, y) > g['gr'] - gw - .35: continue
                if np.min(np.hypot(H0[:, 0] - x, H0[:, 1] - y)) < CUP_R + (.12 if tri else .2): continue
                col = np.array(SP[rr_.integers(len(SP))], np.float32) / 255 * 1.08
                d = np.hypot(u - x, v - y) < (.13 if tri else .2); d &= face; A[d] = col
        G[:] = .3
        rimz = m & (ed < (gc - gw if not tri else .2)) & (gd >= gw); A[rimz] = WH
        put(line(inner, .012), np.array([.8, .8, .8]), .3)
        gm = (gd < gw) & m; A[gm] = WH * .93
        cm = cup > 0; A[cm] *= (.86 + .14 * (1 - cup[cm]))[..., None]; G[cm] = .2
    elif look == 'pop':   # pop art (2026-11-13): hearts everywhere, painted by hand (brushy fill, a wobbly thick black outline), the big one in the middle
        H[:] = np.where(m, .5 * smooth_step(ed, 0, .05), 0)
        u, v = c.u, c.v
        A[:] = np.array([1.12, 1.1, 1.06])
        im = Image.new('L', (N, N), 0); dr = ImageDraw.Draw(im); P = lambda x, y: ((x + c.h) * px, (y + c.h) * px)
        W = int(.1 * px); rr_ = np.random.default_rng(23)
        brush = norm01(fbm((N, N), [1.2, .5], [1, .6], aniso=(1, 6), seed=29))   # brush streaks
        PAL = [np.array([.95, .14, .2]), np.array([1.05, .45, .62]), np.array([1.02, .78, .2]), np.array([.25, .5, 1.0])]
        def heart(cx, cy, s, col, rot=0):
            pts = []; ph1, ph2 = rr_.uniform(0, 6, 2)
            for t in np.linspace(0, 2 * math.pi, 180):
                x, y = s * 16 * math.sin(t) ** 3 / 17, -s * (13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)) / 17
                w = 1 + .018 * math.sin(t * 3 + ph1) + .012 * math.sin(t * 5 + ph2); x, y = rot_(x * w, y * w, rot); pts.append((cx + x, cy + y))
            fm = Image.new('L', (N, N), 0); ImageDraw.Draw(fm).polygon([P(*p) for p in pts], fill=255)
            f = (np.array(fm.filter(ImageFilter.GaussianBlur(1.2))) > 127) & m
            # hand-painted: the colour a little uneven along the brush, a few bare streaks, slightly inside the outline
            A[f] = col * (.9 + .12 * brush[f])[..., None]
            q1 = rr_.uniform(0, 6); off = [(p[0] + .025 * math.sin(k * .07 + q1), p[1] + .025 * math.cos(k * .05 + q1)) for k, p in enumerate(pts)]   # (the line a touch off the fill, as by hand)
            dr.line([P(*p) for p in off + off[:1]], fill=255, width=W, joint='curve')
        def rot_(x, y, a): return x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)
        heart(0, .15 if not tri else .7, (1.7 * g['R'] / 4.3) if not tri else 1.25, PAL[0])
        lim = (g['R'] - .9) if not tri else 2.6
        placed = [(0, .15 if not tri else .7, 2.0)]
        for _ in range(400):   # small hearts scattered round it, tilted, of every colour
            x, y = rr_.uniform(-lim, lim, 2); s_ = rr_.uniform(.32, .6)
            if not tri and math.hypot(x, y) > lim: continue
            if tri and c.ed[int(np.clip((y + c.h) * px, 0, N - 1)), int(np.clip((x + c.h) * px, 0, N - 1))] < .45: continue
            if any(math.hypot(x - a, y - b) < (r + s_) * 1.05 for a, b, r in placed): continue
            placed.append((x, y, s_)); heart(x, y, s_, PAL[len(placed) % 4], rr_.uniform(-.5, .5))
            if len(placed) > 26: break
        la = np.array(im.filter(ImageFilter.GaussianBlur(1.1)), np.float32) / 255; la[~m] = 0; A[:] = A * (1 - la[..., None]) + .03 * la[..., None]   # (soft line edges)
        rimz = m & (ed < (gc - gw if not tri else .2)) & (gd >= gw); A[rimz] = np.array([.95, .14, .2])
        for at, w in ((.035, .035), ((gc - gw) if not tri else .2, .04), (inner, .04)):
            A[m & (np.abs(ed - at) < w)] = 0.03
        gm = (gd < gw) & m; A[gm] = 0.03
        cm = m & (cd < CUP_R); A[cm] = np.array([1.12, 1.1, 1.06]) * (.82 + .18 * (cd[cm] / CUP_R))[..., None]
        ring = m & (np.abs(cd - CUP_R) < .045); A[ring] = 0.03
        G[:] = .15
    else:   # night: an abstract board — flat colour fields like a print, no realism (user 2026-11-11)
        H[:] = np.where(m, .5 * smooth_step(ed, 0, .05), 0)          # flat: only a crisp edge
        A[:] = np.array([.13, .12, .24])
        fields = [((-1.6, -1.4), 2.3, (.83, .41, .29)), ((1.9, -1.0), 1.5, (.89, .7, .29)), ((1.1, 1.8), 2.0, (.18, .56, .54)), ((-1.9, 2.0), 1.1, (.94, .9, .83))]
        if tri: fields = [((-1.2, .9), 1.9, (.83, .41, .29)), ((1.3, .4), 1.3, (.89, .7, .29)), ((0, -1.6), 1.0, (.18, .56, .54))]
        for (fx, fy), fr, col in fields:
            f = m & (np.hypot(c.u - fx, c.v - fy) < fr); A[f] = A[f] * .12 + np.array(col) * .88
        # a few thin arcs and a line across, in cream
        cream = np.array([.94, .9, .83])
        for (fx, fy), fr, col in fields[:2]:
            arc = m & (np.abs(np.hypot(c.u - fx, c.v - fy) - fr - .18) < .025) & (c.u > fx)
            A[arc] = cream
        bar = m & (np.abs((c.u * .5 + c.v) - .3) < .03); A[bar] = cream
        G[:] = .12
        gm = (gd < gw) & m; A[gm] = np.array([.94, .9, .83])                 # a cream groove band
        put(m & (ed < .14), np.array([.07, .065, .13]), .15)                 # a dark rim
        H[:] = np.where(m, .5 * smooth_step(ed, 0, .05), 0)
        cm = m & (cd < CUP_R); A[cm] = np.array([.07, .065, .13])            # holes: flat dark discs with a cream ring
        ring = m & (np.abs(cd - CUP_R - .02) < .016); A[ring] = cream
    return shade(H, A, G, Mt, m, px, look)

# ---------------------------------------------------------------- marbles (seen from above, 160 px, transparent)
MS = 160
def sphere(n=MS):
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    x = (xx + .5) / n * 2 - 1; y = (yy + .5) / n * 2 - 1
    r2 = x * x + y * y; inside = r2 <= 1
    z = np.sqrt(np.clip(1 - r2, 0, 1))
    return x, y, z, inside

def marble_img(kind, k):
    x, y, z, ins = sphere()
    nrm = np.dstack([x, y, z]); L = np.array([-.45, -.62, .64]); L /= np.linalg.norm(L)
    ndl = np.clip(nrm @ L, 0, 1); Hh = L + np.array([0, 0, 1]); Hh /= np.linalg.norm(Hh); ndh = np.clip(nrm @ Hh, 0, 1)
    rim = 1 - z
    if kind == 'glass':
        vane = np.array([[.1, .38, .95], [.05, .7, .35], [1, .55, .05], [.95, .1, .18], [.55, .2, .95], [.0, .75, .7]][k])
        tint = vane * .62 + .16
        ang = np.arctan2(y, x) + k * .7
        r = np.hypot(x, y)
        # three curved vanes through the middle, seen through the lens of the ball (closer to the eye in the middle)
        v = np.abs(np.sin(ang * 1.5 + r * 2.2))
        rib = np.clip(1 - v / (.22 + .12 * (1 - r)), 0, 1) * np.clip(1.05 - r, 0, 1) ** .5
        depth = .55 + .45 * z
        glass = tint * (.3 + .55 * z[..., None]) + np.clip(x * .45 + y * .62, 0, 1)[..., None] ** 2 * tint * .9   # light gathered on the far side
        white = np.array([.97, .96, .92])
        col = glass * (1 - rib[..., None]) + (white * .55 + vane * .45) * (.6 + .4 * depth[..., None]) * rib[..., None]
        col *= (.5 + .5 * (1 - rim ** 4))[..., None]                                        # the dark glass edge
        col = col + (np.exp(-((r - .93) / .05) ** 2) * .12)[..., None] * tint                # a thin bright rim line
        spec = ndh ** 400 * 2.4 + ndh ** 60 * .22
        win = np.exp(-(((x + .36) / .16) ** 2 + ((y + .44) / .085) ** 2)) * .75              # the window reflection
        win2 = np.exp(-(((x - .42) / .1) ** 2 + ((y - .5) / .05) ** 2)) * .18
        col = col + (spec + win + win2)[..., None]
        alpha = ins * 1.0
    elif kind == 'pearl':   # glazed ceramic balls: celadon, indigo, ochre, vermilion, ivory, charcoal (user: away from pearls)
        body = np.array([[.55, .74, .66], [.17, .25, .52], [.82, .6, .24], [.8, .24, .16], [.93, .9, .82], [.2, .2, .22]][k])
        speck = (rng.random((MS, MS)) < .012)
        glaze = body * (.92 + .08 * norm01(fbm((MS, MS), [4, 1.5], [1, .5], seed=80 + k)))[..., None]
        glaze[speck] *= .7
        col = glaze * (.4 + .68 * ndl[..., None]) + (ndh ** 70 * .55 + ndh ** 400 * .9)[..., None]
        col *= (.82 + .18 * (1 - rim ** 3))[..., None]
        alpha = ins * 1.0
    elif kind == 'steel':   # round jewels: polished gem spheres (ruby, sapphire, emerald, amethyst, topaz, aquamarine)
        base = np.array([[.82, .04, .14], [.06, .18, .82], [.03, .6, .3], [.55, .14, .8], [.97, .6, .1], [.35, .8, .9]][k])
        r = np.hypot(x, y)
        # deep colour at the edge, light gathered inside on the far side, a few sparkling inclusions
        inner = np.clip((x * .5 + y * .65) * 1.3 + .4, 0, 1) ** 1.6 * z
        col = base * (.18 + .55 * (1 - rim[..., None]) ** 1.5) + (base * .6 + .4) * inner[..., None] * .75
        spark = (rng.random((MS, MS)) < .004) & (r < .8)
        spark = nd.binary_dilation(spark, iterations=1)
        col[spark] = col[spark] * .4 + .65
        col += (ndh ** 500 * 2.6 + ndh ** 60 * .3)[..., None]
        win = np.exp(-(((x + .34) / .15) ** 2 + ((y + .42) / .08) ** 2)) * .8
        col += win[..., None]
        col *= (.6 + .4 * (1 - rim ** 5))[..., None]
        alpha = ins * 1.0
    elif kind == 'pop':   # pop pieces: glossy toy balls in the pop board's colours with a bold black edge
        c = np.array([[.95, .14, .2], [1.0, .45, .62], [1.0, .78, .2], [.25, .5, 1.0], [.95, .95, .92], [.1, .1, .12]][k])
        col = c * (.55 + .5 * ndl[..., None]) + (ndh ** 120 * 1.2)[..., None]
        col[(1 - z) > .62] = .03
        alpha = ins * 1.0
    elif kind == 'rainbow':   # colourful art: matte painted wooden balls in soft rainbow tones
        c = np.array([[.93, .36, .34], [.98, .66, .22], [.98, .86, .3], [.45, .78, .42], [.3, .66, .9], [.62, .45, .86]][k])
        col = c * (.42 + .62 * ndl[..., None]) + (ndh ** 30 * .12)[..., None]
        col *= (.85 + .15 * (1 - rim ** 3))[..., None]
        alpha = ins * 1.0
    elif kind == 'mod':     # abstract pieces for the abstract board: plain flat colour discs (user: もっとシンプルに)
        r = np.hypot(x, y)
        c = np.array([[.83, .41, .29], [.89, .7, .29], [.18, .56, .54], [.94, .9, .83], [.93, .55, .5], [.33, .45, .7]][k])
        col = np.zeros((MS, MS, 3), np.float32); col[ins] = c
        col *= (.95 + .05 * (1 - r))[..., None]                                                 # barely any shading: flat
        alpha = ins * 1.0
    else:   # turned wooden pegs, lacquered in six colours (the wood shows through at the turned rings)
        r = np.hypot(x, y)
        paint = np.array([[.78, .16, .14], [.12, .36, .7], [.12, .5, .28], [.9, .66, .12], [.42, .2, .55], [.92, .9, .84]][k])
        grain = norm01(fbm((MS, MS), [5, 2], [1, .5], aniso=(1, 5), seed=70 + k))
        wood = lerp((236, 200, 140), (180, 128, 70), grain)
        alb = paint[None, None, :] * (.9 + .1 * grain[..., None])
        ringline = (np.abs(r - .62) < .035) | (np.abs(r - .86) < .03)
        alb[ringline] = wood[ringline] * .9
        h = np.where(r < .62, np.sqrt(np.clip(1 - (r / .62) ** 2, 0, 1)) * .5 + .5, np.where(r < .86, .45, .45 * (1 - (r - .86) / .14)))
        gy, gx = np.gradient(h * 30); nn = np.dstack([-gx, -gy, np.ones_like(h)]); nn /= np.linalg.norm(nn, axis=2, keepdims=True)
        col = alb * (.38 + .72 * np.clip(nn @ L, 0, 1)[..., None]) + (np.clip(nn @ Hh, 0, 1) ** 90 * .7)[..., None]
        alpha = (r <= 1).astype(np.float32)
    col = np.clip(col, 0, 1)
    # soft anti-aliased edge
    r = np.hypot(x, y); alpha = alpha * np.clip((1 - r) * MS / 2.2, 0, 1)
    return Image.fromarray((np.dstack([col ** (1 / 1.1), alpha]) * 255).astype(np.uint8), 'RGBA')

if __name__ == '__main__':
    geo = json.load(open(sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/pegs/geo.json'))
    os.makedirs(OUT, exist_ok=True)
    only = sys.argv[2].split(',') if len(sys.argv) > 2 else None
    for look in ['walnut', 'maple', 'stone', 'night', 'art', 'pop']:
        for bid, g in geo.items():
            if only and f'{look}-{bid}' not in only and look not in only: continue
            img = to_img(build(g, look))
            img.save(os.path.join(OUT, f'bd-{look}-{bid}.webp'), 'WEBP', quality=86, method=6)
            print('board', look, bid, flush=True)
    if not only or 'marbles' in only:
        for kind, n in (('glass', 6), ('pearl', 6), ('steel', 6), ('peg', 6), ('mod', 6), ('rainbow', 6), ('pop', 6)):
            for k in range(n):
                marble_img(kind, k).save(os.path.join(OUT, f'm-{kind}-{k}.webp'), 'WEBP', quality=90, method=6)
        print('marbles')

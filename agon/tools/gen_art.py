#!/usr/bin/env python3
"""Rendered art for Agon (Queen's Guard, 1842), top view lit from the upper left.
  boards  img/bd-<key>.webp           : 1024 px playing surface, 91 pointy-top hexes (U = 80 px between centres)
  pieces  img/pc-<set>-<1|2>-<g|q>.webp : 256 px RGBA piece faces (g = guard disc, q = hexagonal queen with crown)
  boards : folk (painted American folk-art panel, default), victorian (mahogany + lithographed field),
           walnut (oiled black walnut, routed cells, brass), slate (honed slate, engraved, brass throne)
  pieces : bone (bone / ebony, default), folk (milk paint), ceramic (matte glaze), brass (brass / gunmetal)
python3 agon/tools/gen_art.py [boards] [pieces] [preview <out.png>]"""
import os, sys, math, numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, map_coordinates, rotate
from scipy.spatial import cKDTree

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(1842)
L = np.array([-0.5, -0.62, 0.6]); L = L / np.linalg.norm(L)
H = L + np.array([0, 0, 1.0]); H = H / np.linalg.norm(H)


def seed(s):
    global rng
    rng = np.random.default_rng(s)


def C(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float)


def noise(shape, s, amp=1.0, wrap=False, aniso=None):
    x = rng.standard_normal(shape)
    x = gaussian_filter(x, aniso if aniso else s, mode='wrap' if wrap else 'reflect')
    return x / (x.std() + 1e-9) * amp


def fbm(shape, scales):
    t = 0
    for s, a in scales: t = t + noise(shape, s, a)
    return t


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def shade(h, albedo, gloss=40, spec=0.5, amb=0.4, metal=0.0, env=None):
    gy, gx = np.gradient(h)
    n = np.dstack([-gx, -gy, np.ones_like(h)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    diff = np.clip(n @ L, 0, 1)
    sp = np.clip(n @ H, 0, 1) ** gloss * spec
    ref = np.clip(0.55 - 0.45 * n[..., 1] - 0.25 * n[..., 0], 0, 1) if env is None else env(n)
    metal = np.asarray(metal, float)
    m3 = metal[..., None] if metal.ndim == 2 else metal
    col = albedo * (amb + (1 - amb) * diff[..., None])
    col = col * (1 - m3) + albedo * ref[..., None] * m3 * 1.3
    col = col + sp[..., None] * (albedo / 255 * m3 + (1 - m3)) * 255
    return col


def mix(a, b, t):
    t = np.clip(t, 0, 1)[..., None] if np.ndim(t) == 2 else t
    return a * (1 - t) + b * t


def save_rgb(col, name, q=88):
    Image.fromarray(np.clip(col, 0, 255).astype(np.uint8), 'RGB').save(os.path.join(OUT, name), quality=q, method=6)
    print(name, os.path.getsize(os.path.join(OUT, name)) // 1024, 'KB')


class Canvas:
    """supersampled PIL masks on an N×N grid."""
    def __init__(self, N, ss=3): self.N, self.ss = N, ss
    def mask(self, fn, blur=0.5):
        N, ss = self.N, self.ss
        m = Image.new('L', (N * ss, N * ss), 0); d = ImageDraw.Draw(m)
        fn(d, lambda x, y: (x * ss, y * ss), ss)
        a = np.asarray(m.resize((N, N), Image.LANCZOS)).astype(float) / 255
        return gaussian_filter(a, blur) if blur else a


def tear(d, P, ss, x, y, ang, length, width, fill=255):
    """a leaf / brush stroke: round head at (x, y), tapering to a point along ang."""
    pts = [(k / 40, width * (math.sin(math.pi * min(1, k / 40)) ** .6) * (1 - k / 40) ** .5 * 1.4) for k in range(41)]
    ca, sa = math.cos(ang), math.sin(ang)
    s1 = [P(x + ca * u * length - sa * w, y + sa * u * length + ca * w) for u, w in pts]
    s2 = [P(x + ca * u * length + sa * w, y + sa * u * length - ca * w) for u, w in pts][::-1]
    d.polygon(s1 + s2, fill=fill)
    r = width * .55; cx, cy = P(x + ca * r * .6, y + sa * r * .6); d.ellipse([cx - r * ss, cy - r * ss, cx + r * ss, cy + r * ss], fill=fill)


def curl(d, P, ss, x, y, r0, a0, turns, width, sgn=1, fill=255):
    n = 40; pts = []
    for k in range(n + 1):
        u = k / n; a = a0 + sgn * turns * 2 * math.pi * u; r = r0 * (1 - .75 * u)
        pts.append((x + r * math.cos(a), y + r * math.sin(a), width * (1 - u) ** .7 + .3))
    for (x1, y1, w1), (x2, y2, w2) in zip(pts, pts[1:]):
        p1, p2 = P(x1, y1), P(x2, y2); d.line([p1, p2], fill=fill, width=max(1, int(w1 * ss)))
        d.ellipse([p2[0] - w2 * ss / 2, p2[1] - w2 * ss / 2, p2[0] + w2 * ss / 2, p2[1] + w2 * ss / 2], fill=fill)


def dot(d, P, ss, x, y, r, fill=255):
    cx, cy = P(x, y); d.ellipse([cx - r * ss, cy - r * ss, cx + r * ss, cy + r * ss], fill=fill)


def bez(p0, p1, p2, n=40):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in (k / n for k in range(n + 1))]


def poly_line(d, P, ss, pts, w, fill=255):
    d.line([P(x, y) for x, y in pts], fill=fill, width=max(1, int(w * ss)), joint='curve')


def crackle(shape, cell, warp=.3):
    """craquelure network: px distance to the nearest crack, and the id of the paint island."""
    hN, wN = shape
    n = int(hN * wN / cell ** 2 * 1.1)
    pts = rng.uniform(0, 1, (n, 2)) * [wN, hN]
    y, x = np.mgrid[0:hN, 0:wN].astype(float)
    x = x + noise(shape, cell * .5, cell * warp); y = y + noise(shape, cell * .5, cell * warp)
    q = np.column_stack([x.ravel(), y.ravel()])
    d, i = cKDTree(pts).query(q, k=2, workers=-1)
    p1, p2 = pts[i[:, 0]], pts[i[:, 1]]
    dist = (d[:, 1] ** 2 - d[:, 0] ** 2) / (2 * np.linalg.norm(p2 - p1, axis=1) + 1e-9)
    return dist.reshape(shape), i[:, 0].reshape(shape)


def wood(shape, period, c_light, c_dark, c_late, warp=14, fig=0.0, pore=.35, ray=0.0):
    """plain-sawn wood, grain running along x: long streaky fibres, gently wandering growth rings
    with occasional cathedral arches. returns albedo, height."""
    hN, wN = shape
    y, x = np.mgrid[0:hN, 0:wN].astype(float)
    # displacement varies slowly along the grain (x) and a little faster across it (y)
    w = noise(shape, 0, 1, aniso=(30, 160)) * warp + noise(shape, 0, 1, aniso=(8, 40)) * warp * .15
    arch = 0
    if fig:
        x0 = wN * rng.uniform(.35, .65)
        arch = fig * np.sqrt(np.abs(x - x0) * 6 + 400) * 3
    t = (y + w + arch) / period
    t = t + .35 * noise(shape, 0, 1, aniso=(60, 200))
    f = t - np.floor(t)
    ri = np.floor(t).astype(int); ri -= ri.min()
    inten = rng.uniform(.15, 1.0, ri.max() + 2) ** 1.5
    wid = rng.uniform(.55, .85, ri.max() + 2)
    late = smooth(wid[ri], .93, f) * (1 - smooth(.93, 1, f)) * inten[ri]
    late = late * (.6 + .4 * np.clip(.5 + noise(shape, 0, 1, aniso=(1, 50)) * .5, 0, 1))
    fib = noise(shape, 0, 1, aniso=(.7, 40))
    fib2 = noise(shape, 0, 1, aniso=(3, 120))
    base = mix(c_light, c_dark, .45 + .2 * noise(shape, 0, 1, aniso=(40, 120)) + .12 * fib2 + .06 * fib)
    base = mix(base, c_late, late * (.55 + .2 * noise(shape, 0, 1, aniso=(20, 90))))
    base = mix(base, c_late, np.clip(fib - 1.2, 0, 1) * .25)
    st = noise(shape, 0, 1, aniso=(.5, 14))
    pores = np.clip(st - 1.3, 0, 2)
    base = base * (1 - pore * pores * .4)[..., None]
    if ray:
        rr_ = np.clip(noise(shape, 0, 1, aniso=(5, .7)) - 2.2, 0, 1)
        base = mix(base, base * 1.15, rr_ * ray)
    h = -late * .25 - pores * .3 + fib * .04 + noise(shape, 1, .04)
    return base, h


# =========================================================================================== hex geometry
NB, U, S3, CX = 1024, 80.0, math.sqrt(3), 512.0
DIRS = [(1, 0), (1, -1), (0, -1), (-1, 0), (-1, 1), (0, 1)]
CELLS = [(q, r) for r in range(-5, 6) for q in range(max(-5, -5 - r), min(5, 5 - r) + 1)]
assert len(CELLS) == 91


def ring_of(q, r): return np.maximum(np.maximum(np.abs(q), np.abs(r)), np.abs(q + r))


def cell_xy(q, r): return CX + (q + r / 2) * U, CX + r * S3 / 2 * U


RIDX = {(0, 0): 0}
for k in range(1, 6):
    h_ = (-k, k)
    i = 0
    for dq, dr in DIRS:
        for _ in range(k):
            RIDX[h_] = i; i += 1; h_ = (h_[0] + dq, h_[1] + dr)


class Grid:
    def __init__(self, N=NB):
        yy, xx = np.mgrid[0:N, 0:N].astype(float) + .5
        self.yy, self.xx = yy, xx
        X, Y = xx - CX, yy - CX
        s = U / S3
        qf = (S3 / 3 * X - Y / 3) / s; rf = (2 / 3 * Y) / s; yf = -qf - rf
        rq, rr_, ry = np.round(qf), np.round(rf), np.round(yf)
        dq, dr, dy = np.abs(rq - qf), np.abs(rr_ - rf), np.abs(ry - yf)
        a = (dq > dr) & (dq > dy); b = ~a & (dr > dy)
        rq = np.where(a, -rr_ - ry, rq); rr_ = np.where(b, -rq - ry, rr_)
        self.Q, self.R = rq.astype(int), rr_.astype(int)
        self.ring = ring_of(self.Q, self.R)
        self.inside = self.ring <= 5
        cx, cy = cell_xy(self.Q, self.R)
        self.dx, self.dy = xx - cx, yy - cy
        es, rb, fb = [], np.full((N, N), 99.), np.full((N, N), 99.)
        for dq_, dr_ in DIRS:
            nx, ny = (dq_ + dr_ / 2), dr_ * S3 / 2
            e = U / 2 - (self.dx * nx + self.dy * ny)
            es.append(e)
            nr = ring_of(self.Q + dq_, self.R + dr_)
            rb = np.where(nr != self.ring, np.minimum(rb, e), rb)
            fb = np.where((nr > 5) & self.inside, np.minimum(fb, e), fb)
        self.edge = np.min(es, axis=0)        # px to the nearest cell edge (inside the cell)
        self.rb = rb                           # px to the nearest ring boundary
        self.fb = fb                           # px to the field's outer boundary (inside cells only)
        lut = np.zeros((21, 21), int)
        for (q, r), i in RIDX.items(): lut[q + 10, r + 10] = i
        Qc, Rc = np.clip(self.Q, -10, 10) + 10, np.clip(self.R, -10, 10) + 10
        self.idx = lut[Qc, Rc]
        self.alt = self.idx % 2
        self.rc = np.hypot(X, Y)
        self.dsq = np.minimum(np.minimum(xx, N - xx), np.minimum(yy, N - yy))
        # px distance outside the field (0 inside)
        from scipy.ndimage import distance_transform_edt
        self.fout = distance_transform_edt(~self.inside)

    def per_cell(self, fn, ch=3):
        """build an image by looking up a per-(q, r) value."""
        lut = np.zeros((21, 21, ch))
        for q in range(-10, 11):
            for r in range(-10, 11):
                lut[q + 10, r + 10] = fn(q, r)
        Qc, Rc = np.clip(self.Q, -10, 10) + 10, np.clip(self.R, -10, 10) + 10
        out = lut[Qc, Rc]
        return out if ch > 1 else out[..., 0]


G = None


def grid():
    global G
    if G is None: G = Grid()
    return G


def dir_streaks(shape, angles, aniso=(.8, 16)):
    out = []
    for a in angles:
        n = rng.standard_normal((shape[0] + 400, shape[1] + 400))
        n = gaussian_filter(n, aniso)
        n = rotate(n, a, reshape=False, order=1)[200:-200, 200:-200]
        out.append(n / (n.std() + 1e-9))
    return out


# =========================================================================================== folk board
FOLK = dict(red='#a32a22', black='#1d1b17', mustard='#cc9426', cream='#e6dcc4', throne='#232a1c',
            sage='#87916b', field='#1b2d2a', redline='#982920', pin='#d8cca8', ground='#cdb88d', pine='#a8804f')


def folk_board():
    seed(101); g = grid(); N = NB; sh = (N, N)
    yy, xx, rc, dsq = g.yy, g.xx, g.rc, g.dsq
    # --- raw pine panel
    pine, h_wood = wood(sh, 11, C('#b48a56'), C('#94703f'), C('#6e4c28'), warp=18, fig=.4, pore=.25)
    ground = mix(C('#d2be93'), C('#b9a276'), .45 + .25 * noise(sh, 20, 1) + .1 * noise(sh, 2, 1))
    # --- base coats: teal-black field, sage circle, red line, cream pin-stripe
    brush = noise(sh, 0, 1, aniso=(.7, 14))
    teal = mix(C('#182b27'), C('#2f4b44'), .42 + .18 * fbm(sh, [(70, .7), (14, .3)]) + .07 * brush)
    sage = mix(C('#76815c'), C('#98a27a'), .5 + .18 * fbm(sh, [(60, .7), (12, .35)]) + .06 * brush)
    Rc = 463.0
    wob = noise(sh, 6, .7)
    circ = smooth(Rc + .7, Rc - .7, rc + wob)
    base = mix(teal, sage, circ)
    red_ln = smooth(2.4, 1.4, np.abs(rc + wob - (Rc + 2.0)))
    pin = smooth(1.3, .5, np.abs(rc + wob * 1.3 - (Rc + 12.5)))
    base = mix(base, C(FOLK['redline']) * (1 + .06 * brush[..., None]), red_ln)
    base = mix(base, C(FOLK['pin']) * (1 + .05 * brush[..., None]), pin * .95)
    # --- stencilled leafy scrolls in the four corners (faint black)
    cv = Canvas(N, 2)
    def corner(d, P, ss):
        stem = bez((44, 330), (78, 78), (330, 44))
        poly_line(d, P, ss, stem, 4)
        for t in (.12, .24, .36, .64, .76, .88):
            i = int(t * 40); x, y = stem[i]; x2, y2 = stem[i + 1]
            a = math.atan2(y2 - y, x2 - x)
            tear(d, P, ss, x, y, a - 2.2, 34 - 18 * abs(t - .5), 8)
            tear(d, P, ss, x, y, a + .9, 26 - 12 * abs(t - .5), 6)
        for (x, y, a0, sg) in ((44, 330, -1.4, 1), (330, 44, 3.0, -1)):
            curl(d, P, ss, x, y, 18, a0, 1.0, 4, sg)
        for a in (-.55, 0, .55):
            ang = math.pi * 1.25 + a
            tear(d, P, ss, 112 + 6 * math.cos(ang), 112 + 6 * math.sin(ang), ang, 58 if a == 0 else 44, 12 if a == 0 else 9)
        for a in (-.9, .9):
            ang = math.pi * .25 + a * .5
            tear(d, P, ss, 112, 112, ang, 40, 8)
        dot(d, P, ss, 112, 112, 9)
        for k in range(5):
            a = math.pi * 1.25 + (k - 2) * .38
            dot(d, P, ss, 112 + 92 * math.cos(a) * -1 + 0, 112 + 92 * math.sin(a) * -1, 4)
    m = cv.mask(corner, .6)
    bridge = np.clip(1.4 - np.abs(((xx + yy) % 37) - 18), 0, 1) * (noise(sh, 30, 1) > .6)
    m = np.clip(m * (1 - bridge), 0, 1)
    stencil = np.maximum.reduce([m, m[:, ::-1], m[::-1, :], m[::-1, ::-1]])
    stencil *= smooth(476, 486, rc) * smooth(22, 30, dsq)
    stencil *= np.clip(.75 + .25 * noise(sh, 3, 1) + .15 * noise(sh, 20, 1), 0, 1)
    base = mix(base, C('#040605'), stencil * .85)
    # --- painted hexes
    def cellcol(q, r):
        k = int(ring_of(q, r))
        if k > 5: return C(FOLK['sage'])
        if k == 0: return C(FOLK['throne'])
        i = RIDX[(q, r)] % 2
        pair = {5: ('red', 'black'), 4: ('mustard', 'cream'), 3: ('red', 'black'), 2: ('cream', 'mustard'), 1: ('red', 'black')}[k]
        return C(FOLK[pair[i]]) * rng.uniform(.96, 1.03)
    hexalb = g.per_cell(cellcol)
    s3 = dir_streaks(sh, [0, 60, 120], (.8, 12))
    pick = g.per_cell(lambda q, r: [(q * 7 + r * 3) % 3], 1).astype(int)
    st = np.choose(pick, s3)
    hexalb = hexalb * (1 + .055 * st + .04 * noise(sh, 25, 1))[..., None]
    ew = g.edge + noise(sh, 2.5, .55) + noise(sh, 12, .5)
    hexm = smooth(2.2, 3.2, ew) * g.inside
    # --- wear: lower and right side more worn (where hands rested), frame lip, hex edges
    W = fbm(sh, [(110, .55), (35, .5), (11, .35), (3, .22)])
    W += 1.25 * np.clip((yy / N - .42) / .58, 0, 1) ** 1.6 + .45 * np.clip((xx / N - .55) / .45, 0, 1)
    W += 3.6 * np.clip(1 - dsq / 16, 0, 1) ** 1.2 + 1.0 * np.clip(1 - np.abs(dsq - 19) / 3, 0, 1) + .5 * np.clip(1 - (dsq - 22) / 30, 0, 1) * (dsq > 22)
    W += .55 * np.clip(1 - g.edge / 6, 0, 1) * g.inside
    W += .35 * np.clip(1 - np.abs(rc - Rc) / 8, 0, 1)
    hex_keep = 1 - smooth(2.25, 2.6, W)            # hex colour paint
    base_keep = 1 - smooth(2.75, 3.0, W)           # teal / sage base coat
    ground_keep = 1 - smooth(3.25, 3.45, W)        # gesso ground (else bare pine)
    # craquelure: islands of paint flake off (more where worn)
    d1, id1 = crackle(sh, 13, .12)
    d2, id2 = crackle(sh, 5.5, .1)
    rnd = rng.random(id2.max() + 1)
    flake_p = .004 + .14 * np.clip(W - 1.4, 0, 1.2)
    flake = gaussian_filter((rnd[id2] < flake_p).astype(float), .5)
    rnd1 = rng.random(id1.max() + 1)
    flake = np.maximum(flake, gaussian_filter((rnd1[id1] < flake_p * .25).astype(float), .5))
    hex_keep *= (1 - flake); base_keep *= (1 - flake * (rnd[id2] < flake_p * .5))
    # compose layers from the wood up
    alb = mix(pine, ground, ground_keep)
    alb = mix(alb, base, base_keep)
    alb = mix(alb, hexalb, hexm * hex_keep)
    # a fine black painted line in the gap between rings (hand-ruled: slight wobble)
    rl = smooth(3.4, 2.4, g.rb + noise(sh, 3, .35)) * g.inside * (g.fb > 2) * base_keep
    alb = mix(alb, C('#141412'), rl * .92)
    paint = np.maximum(base_keep, hexm * hex_keep)
    # cracks: through all paint, dark grime on light paint, pale on black
    gap2 = smooth(-.4, .2, noise(sh, 9, 1))
    crack = smooth(.8, .2, d1) * .8 + smooth(.55, .1, d2) * .45 * gap2
    crack *= paint
    lum = alb.mean(axis=2, keepdims=True)
    crack_c = np.where(lum > 90, C('#4a3720'), C('#5a4c38'))
    alb = mix(alb, crack_c, crack * np.where(lum[..., 0] > 90, .6, .35))
    # paint islands cup slightly: a lighter lip along each crack catches the light
    alb = alb * (1 + .05 * smooth(2.5, .9, d1) * (1 - crack) * paint)[..., None]
    # varnish: amber yellowing, uneven; grime toward the lip and in the circle edge
    tone = .55 + .25 * noise(sh, 80, 1) + .15 * noise(sh, 15, 1)
    alb = alb * mix(np.array([1, 1, 1.]), np.array([1.0, .93, .74]), tone * .8)
    grime = np.clip(1 - (dsq - 18) / 40, 0, 1) * (dsq > 16) * .25 + .07 * np.clip(noise(sh, 30, 1), 0, 2)
    alb = alb * (1 - grime)[..., None]
    alb = mix(alb, C('#2a1d10'), smooth(.4, 1.6, noise(sh, 1.2, 1)) * .1 * paint)  # dust specks
    # --- height: frame lip molding, step into the field, paint thickness, cracks
    lipw = 20.0
    lip = np.where(dsq < lipw, 5 * np.sin(np.clip(dsq / lipw, 0, 1) * math.pi * .5) ** .6, 3.4 - 1.2 * smooth(lipw, lipw + 3, dsq))
    lip = np.where(dsq < lipw, lip, 2.2)
    h = lip + h_wood * .8 + ground_keep * .25 + base_keep * .35 + hexm * hex_keep * .5
    h += -crack * .5 + (1 - smooth(0, 3, d1)) * .12 * paint
    h += noise(sh, 1.5, .06) + .25 * brush * .1
    h = gaussian_filter(h, .7)
    col = shade(h, alb, gloss=18, spec=.06, amb=.66)
    col = col * (1 - .1 * np.clip(1 - dsq / 6, 0, 1))[..., None]
    save_rgb(col, 'bd-folk.webp', 86)
    return col


# =========================================================================================== victorian board
VIC = dict(oxblood='#6c1a1c', ivory='#e7dcc0', throne='#1e3a2c', gilt='#c9a14e', mahog='#6a2a18')


def gilt_alb(sh, k=1.0):
    return mix(C('#8a6424'), C('#e8c873'), .55 + .22 * noise(sh, 2, 1) + .12 * noise(sh, 20, 1))


def victorian_board():
    seed(202); g = grid(); N = NB; sh = (N, N)
    yy, xx, dsq = g.yy, g.xx, g.dsq
    mah, h_w = wood(sh, 6, C('#6e3220'), C('#522216'), C('#33140c'), warp=12, fig=0, pore=.55)
    ribbon = np.sin((yy + noise(sh, 0, 1, aniso=(20, 200)) * 25) / 17 + noise(sh, 0, 1, aniso=(30, 300)) * 1.5) * .5 + .5
    mah = mah * (1 + .14 * (ribbon - .5) + .05 * noise(sh, 70, 1))[..., None]
    # printed field: paper, oxblood / ivory by ring, throne bottle green
    def cellcol(q, r):
        k = int(ring_of(q, r))
        if k > 5: return C(VIC['ivory'])
        if k == 0: return C(VIC['throne'])
        return C(VIC['oxblood'] if k % 2 == 1 else VIC['ivory']) * rng.uniform(.98, 1.02)
    paper_fib = noise(sh, 0, 1, aniso=(.6, 3)) * .5 + noise(sh, 1, 1) * .5
    alb_f = g.per_cell(cellcol) * (1 + .035 * paper_fib + .05 * noise(sh, 30, 1))[..., None]
    ivory = g.inside & (g.ring % 2 == 0) & (g.ring > 0)
    fox = np.clip(noise(sh, 4, 1) - 2.3, 0, 1) * ivory
    alb_f = mix(alb_f, C('#b89060'), fox * .5)
    # printed lines: fine sepia between cells, gilt between rings and around the field
    sep = smooth(1.5, .5, g.edge) * g.inside
    alb_f = mix(alb_f, np.where((g.ring % 2 == 1)[..., None], C('#c7a07a'), C('#5a3a26')), sep * .75)
    gl_r = smooth(1.9, 1.1, g.rb) * g.inside * (g.fb > 3)
    gl_o = smooth(3.4, 2.4, g.fb) * g.inside
    # gilt hexagram on the throne
    cv = Canvas(N, 3)
    def star(d, P, ss):
        for rot in (0, math.pi):
            pts = [P(CX + 27 * math.sin(rot + k * 2 * math.pi / 3), CX - 27 * math.cos(rot + k * 2 * math.pi / 3)) for k in range(3)]
            d.polygon(pts, fill=255)
    def star_cut(d, P, ss):
        dot(d, P, ss, CX, CX, 6.5)
    def throne_ring(d, P, ss):
        pts = [P(CX + 34 * math.cos(math.pi / 6 + k * math.pi / 3), CX + 34 * math.sin(math.pi / 6 + k * math.pi / 3)) for k in range(6)]
        d.polygon(pts, outline=255, width=int(1.4 * ss))
    m_star = cv.mask(star, .4); m_cut = cv.mask(star_cut, .4); m_tr = cv.mask(throne_ring, .3)
    gold_m = np.clip(gl_r + gl_o + m_star * (1 - m_cut * .8) + m_cut * .0 + m_tr, 0, 1)
    gold_m = np.clip(gold_m + cv.mask(lambda d, P, ss: dot(d, P, ss, CX, CX, 3), .3), 0, 1)
    rub = smooth(1.2, 2.4, noise(sh, 3, 1) + noise(sh, 25, .8))
    gilt = gilt_alb(sh)
    gilt = mix(gilt, C('#6b4a24'), rub * .6)
    alb = np.where(g.inside[..., None], alb_f, mah)
    # border on the mahogany: double gilt rule with notched corners, corner fleurons, rule round the field
    cv2 = Canvas(N, 2)
    def rules(d, P, ss):
        for ins, w in ((26, 3.2), (36, 1.2)):
            a, b = ins, N - ins
            nr = 22 if ins == 36 else 0
            if nr:
                d.line([P(a + nr, a), P(b - nr, a)], fill=255, width=int(w * ss)); d.line([P(a + nr, b), P(b - nr, b)], fill=255, width=int(w * ss))
                d.line([P(a, a + nr), P(a, b - nr)], fill=255, width=int(w * ss)); d.line([P(b, a + nr), P(b, b - nr)], fill=255, width=int(w * ss))
                for cx_, cy_, st_ in ((a, a, 0), (b, a, 90), (b, b, 180), (a, b, 270)):
                    d.arc([*P(cx_ - nr, cy_ - nr), *P(cx_ + nr, cy_ + nr)], st_, st_ + 90, fill=255, width=int(w * ss))
            else:
                d.rectangle([*P(a, a), *P(b, b)], outline=255, width=int(w * ss))
    def fleuron(d, P, ss):
        x0 = y0 = 64.0
        dirc = math.pi / 4
        for a in (-.55, 0, .55):
            tear(d, P, ss, x0 + 4 * math.cos(dirc), y0 + 4 * math.sin(dirc), dirc + a, 46 if a == 0 else 34, 7 if a == 0 else 5)
        curl(d, P, ss, x0 + 60, y0 + 8, 14, math.pi * .9, 1.0, 2.2, -1)
        curl(d, P, ss, x0 + 8, y0 + 60, 14, -math.pi * .4, 1.0, 2.2, 1)
        poly_line(d, P, ss, [(x0 + 16, y0 + 2), (x0 + 60, y0 + 2)], 1.6); poly_line(d, P, ss, [(x0 + 2, y0 + 16), (x0 + 2, y0 + 60)], 1.6)
        dot(d, P, ss, x0, y0, 5)
        for k in range(4): dot(d, P, ss, x0 + 70 + k * 9, y0 + 2, 1.6); dot(d, P, ss, x0 + 2, y0 + 70 + k * 9, 1.6)
    def field_rule(d, P, ss):
        # a gilt line following the jagged field outline at a few px offset is done analytically; here a large hex frame
        Rh = 5 * U + U / S3 + 20
        pts = [P(CX + Rh * math.cos(math.pi / 2 + k * math.pi / 3), CX + Rh * math.sin(math.pi / 2 + k * math.pi / 3)) for k in range(6)]
        d.polygon(pts, outline=255, width=int(1.3 * ss))
    m_r = cv2.mask(rules, .4)
    f = cv2.mask(fleuron, .4)
    m_f = np.maximum.reduce([f, f[:, ::-1], f[::-1, :], f[::-1, ::-1]])
    m_hex = cv2.mask(field_rule, .3)
    ring_out = smooth(1.3, .5, np.abs(g.fout - 9)) * (~g.inside)
    deco = np.clip(m_r + m_f + ring_out, 0, 1)
    gold_all = np.clip(gold_m + deco * (~g.inside), 0, 1)
    alb = mix(alb, gilt, gold_all)
    # varnish / polish ageing, fine crazing over the print
    d1, _ = crackle(sh, 22, .4)
    craze = smooth(.6, .15, d1) * g.inside * smooth(-.6, .4, noise(sh, 20, 1))
    alb = mix(alb, alb * .72, craze * .6)
    alb = alb * mix(np.array([1, 1, 1.]), np.array([1, .95, .83]), (.5 + .2 * noise(sh, 70, 1)))
    # scratches in the polish
    cv3 = Canvas(N, 2)
    def scr(d, P, ss):
        for _ in range(70):
            x, y = rng.uniform(0, N, 2); a = rng.normal(.3, .8); ln = rng.uniform(15, 90)
            d.line([P(x, y), P(x + math.cos(a) * ln, y + math.sin(a) * ln)], fill=int(rng.uniform(60, 200)), width=1)
    m_s = cv3.mask(scr, .3)
    # height: rounded board edge, gilt slightly raised, paper ink flat, wood pores
    edge_h = 6 * np.sin(np.clip(dsq / 14, 0, 1) * math.pi / 2) ** .7
    h = edge_h + np.where(g.inside, .25 * paper_fib * .3, h_w * .5) + gold_all * .7 + gl_o * .4 - craze * .2
    h = gaussian_filter(h, .7)
    metal = gold_all * .55
    spec = np.where(g.inside, .10, .14) + gold_all * .25
    col = shade(h, alb, gloss=np.where(g.inside, 30, 45), spec=spec, amb=.68, metal=metal)
    sheen = np.clip(1 - np.hypot((xx - N * .3) / (N * .6), (yy - N * .24) / (N * .45)), 0, 1) ** 2
    col = col + sheen[..., None] * 26 * (1 - .4 * gold_all)[..., None]
    col = col + m_s[..., None] * 16 * (~g.inside)[..., None]
    col = col * (1 - .25 * np.clip(1 - dsq / 5, 0, 1))[..., None]
    save_rgb(col, 'bd-victorian.webp', 86)
    return col


# =========================================================================================== walnut board
WAL = dict(natural='#6e4a32', fumed='#3b2a1f', land='#55392a', brass='#b8964f')


def walnut_board():
    seed(303); g = grid(); N = NB; sh = (N, N)
    yy, xx, dsq = g.yy, g.xx, g.dsq
    wal, h_w = wood(sh, 9, C('#6c4831'), C('#4b3223'), C('#2c1c13'), warp=24, fig=1.0, pore=.6)
    wal = wal * (1 + .06 * noise(sh, 120, 1))[..., None]
    # routed recesses: floors show slightly different (cut) texture, rings alternate natural / fumed
    inset = 4.2
    floor = smooth(inset, inset + 2.6, g.edge) * g.inside          # 0 on the land, 1 on the recess floor
    wall = smooth(inset - .2, inset + .4, g.edge) * g.inside
    cut, _ = wood(sh, 9, C('#76523a'), C('#553a2a'), C('#34231a'), warp=24, fig=1.0, pore=.45)
    fumed_f = g.per_cell(lambda q, r: [1.0 if int(ring_of(q, r)) % 2 == 0 else 0.0], 1) * g.inside
    cut_f = cut * (1 - .55 * fumed_f)[..., None] * np.where(fumed_f[..., None] > 0, np.array([.97, .9, .86]), np.array([1.1, 1.08, 1.04]))
    tool = noise(sh, 0, 1, aniso=(.5, 6)) * .03
    alb = mix(wal, cut_f * (1 + tool)[..., None], wall)
    # brass inlay between ring0/1 and ring1/2, on the land between recesses
    b_m = smooth(1.35, .65, g.rb) * g.inside * (g.ring <= 1)
    b_m = np.maximum(b_m, smooth(1.35, .65, g.rb) * g.inside * (g.ring == 2) * (g.ring >= 2))
    # (ring 2 cells adjacent to ring 1 share the boundary; exclude its outer boundary with ring 3)
    rb_inner = np.full(sh, 99.)
    for dq_, dr_ in DIRS:
        nx, ny = (dq_ + dr_ / 2), dr_ * S3 / 2
        e = U / 2 - (g.dx * nx + g.dy * ny)
        nr = ring_of(g.Q + dq_, g.R + dr_)
        rb_inner = np.where((nr < g.ring) & (nr <= 1), np.minimum(rb_inner, e), rb_inner)
        rb_inner = np.where((nr > g.ring) & (g.ring <= 1), np.minimum(rb_inner, e), rb_inner)
    b_m = smooth(1.4, .7, rb_inner) * g.inside
    brass = mix(C('#9a7a3c'), C('#d2b06a'), .5 + .2 * noise(sh, 0, 1, aniso=(.5, 8)) + .1 * noise(sh, 20, 1))
    alb = mix(alb, brass, b_m)
    # oil finish: slight warmth, matte
    h = -wall * 3.2 + h_w * .6 * (1 - wall) + h_w * .3 * wall + b_m * .2
    h += 7 * np.sin(np.clip(dsq / 16, 0, 1) * math.pi / 2) ** .8 - 7
    # a routed V-groove frame and a thin brass line inside it
    frg = smooth(2.2, .4, np.abs(dsq - 34)) * 1.0
    h -= frg * 1.8
    alb = mix(alb, alb * .55, frg * .6)
    bl = smooth(1.0, .4, np.abs(dsq - 42))
    alb = mix(alb, brass, bl); b_m = np.maximum(b_m, bl)
    h = gaussian_filter(h, .8)
    spec = .07 + b_m * .3
    col = shade(h, alb, gloss=14, spec=spec, amb=.62, metal=b_m * .5)
    occ = gaussian_filter(wall, 3) - wall * .0
    col = col * (1 - .18 * np.clip(wall - gaussian_filter(wall, 2.5), 0, 1))[..., None]
    sheen = np.clip(1 - np.hypot((xx - N * .3) / (N * .7), (yy - N * .25) / (N * .5)), 0, 1) ** 2
    col = col + sheen[..., None] * 10
    save_rgb(col, 'bd-walnut.webp', 86)
    return col


# =========================================================================================== slate board
SLT = dict(dark='#26292c', light='#434b52', line='#a7aba8', brass='#b39459')


def slate_board():
    seed(404); g = grid(); N = NB; sh = (N, N)
    yy, xx, dsq = g.yy, g.xx, g.dsq
    lam = noise(sh, 0, 1, aniso=(4, 30)) * .6 + noise(sh, 0, 1, aniso=(.8, 6)) * .4
    mott = fbm(sh, [(90, .5), (25, .4), (6, .3), (1.5, .25)])
    grain = noise(sh, .6, 1)
    base = mix(C('#1f2225'), C('#383d41'), .45 + .14 * mott + .04 * lam + .07 * grain)
    lightr = g.inside & (g.ring % 2 == 0) & (g.ring > 0)
    lt = mix(C('#3b4249'), C('#535c64'), .45 + .14 * mott + .04 * lam + .07 * grain)
    alb = np.where(lightr[..., None], lt, base)
    spark = (noise(sh, .5, 1) > 3.4).astype(float)
    alb = alb + spark[..., None] * 28
    # engraved V-grooves along every cell edge and the field outline
    gw = 1.25
    groove = smooth(gw + .7, gw - .3, g.edge) * g.inside
    outline = smooth(1.2, .3, np.abs(g.fout - 14)) * (~g.inside)
    lines = np.clip(groove + outline, 0, 1)
    alb = mix(alb, C(SLT['line']) * (1 + .06 * grain)[..., None], lines * .9)
    # brass hexagon inlay on the throne
    th = (g.ring == 0) & g.inside
    b_in = smooth(17.5, 18.5, g.edge) * th
    brass = mix(C('#9c7d44'), C('#c9a967'), .5 + .25 * noise(sh, 0, 1, aniso=(.5, 10)) + .08 * noise(sh, 15, 1))
    alb = mix(alb, brass, b_in)
    # chamfered outer edge (cut slate reads paler)
    ch = smooth(12, 4, dsq)
    alb = mix(alb, C('#5a6066') * (1 + .08 * grain)[..., None], ch * .7)
    h = -lines * 1.6 + grain * .06 + mott * .05 + b_in * .15
    h += 6 * np.clip(dsq / 12, 0, 1) - 6
    h = gaussian_filter(h, .6)
    col = shade(h, alb, gloss=10, spec=.05 + b_in * .25, amb=.68, metal=b_in * .5)
    save_rgb(col, 'bd-slate.webp', 86)
    return col


# =========================================================================================== pieces
NP = 256
PY, PX = np.mgrid[0:NP, 0:NP].astype(float) + .5
PX -= NP / 2; PY -= NP / 2
PRAD = np.hypot(PX, PY)
PANG = np.arctan2(PY, PX)
GR = 118.0                 # guard disc radius
QAP, QRC = 108.0, 10.0      # queen hexagon apothem and corner rounding (circumradius ≈ 124.7 incl. rounding)


def sd_disc(R=GR): return R - PRAD


def sd_hex(ap=QAP, rc=QRC):
    """pointy-top hexagon (vertex up, flat sides left/right); positive inside."""
    k = (-0.866025404, 0.5, 0.577350269)
    px, py = np.abs(PY), np.abs(PX)      # swap → flat sides left / right
    r = ap - rc
    dotk = k[0] * px + k[1] * py
    m = 2 * np.minimum(dotk, 0)
    px, py = px - m * k[0], py - m * k[1]
    px = px - np.clip(px, -k[2] * r, k[2] * r); py = py - r
    return -(np.hypot(px, py) * np.sign(py)) + rc


def crown(d, P, ss, s=1.0, pearls=True, outline=0, cy=4):
    pts = [(-46, 20), (-55, -24), (-40, -1), (-27, -19), (-13.5, -1), (0, -38), (13.5, -1), (27, -19), (40, -1), (55, -24), (46, 20)]
    c = NP / 2
    poly = [P(c + x * s, c + (y + cy) * s) for x, y in pts]
    band = [P(c - 48 * s, c + (19 + cy) * s), P(c + 48 * s, c + (36 + cy) * s)]
    if outline:
        d.line(poly + [poly[0]], fill=255, width=int(outline * ss), joint='curve')
        d.rectangle(band, outline=255, width=int(outline * ss))
        if pearls:
            for x, y in ((-55, -24), (-27, -19), (0, -38), (27, -19), (55, -24)):
                cx, cy2 = P(c + x * s, c + (y - 6 + cy) * s); r = 5.5 * s * ss
                d.ellipse([cx - r, cy2 - r, cx + r, cy2 + r], outline=255, width=int(outline * ss))
        return
    d.polygon(poly, fill=255); d.rectangle(band, fill=255)
    if pearls:
        for x, y in ((-55, -24), (-27, -19), (0, -38), (27, -19), (55, -24)):
            dot(d, P, ss, c + x * s, c + (y - 6 + cy) * s, 7 * s)


def crown_masks(s=1.0, pearls=True):
    cv = Canvas(NP, 3)
    full = cv.mask(lambda d, P, ss: crown(d, P, ss, s, pearls), .5)
    # jewels on the band and a line separating band from body
    jew = cv.mask(lambda d, P, ss: [dot(d, P, ss, NP / 2 + x * s, NP / 2 + (31.5) * s, 3.6 * s) for x in (-30, -10, 10, 30)], .5)
    sep = cv.mask(lambda d, P, ss: d.line([P(NP / 2 - 46 * s, NP / 2 + 23.5 * s), P(NP / 2 + 46 * s, NP / 2 + 23.5 * s)], fill=255, width=int(1.6 * ss)), .4)
    return full, jew, sep


def save_pc(col, sd, name):
    a = np.clip(sd + .5, 0, 1)
    img = Image.fromarray(np.dstack([np.clip(col, 0, 255), a[..., None] * 255]).astype(np.uint8), 'RGBA')
    p = os.path.join(OUT, name)
    img.save(p, quality=90, method=6, alpha_quality=90)
    if os.path.getsize(p) > 25000: img.save(p, quality=80, method=6, alpha_quality=80)
    print(name, os.path.getsize(p) // 1024, 'KB')


def profile(sd, bevel=12, bh=7, dome=5, rmax=GR):
    t = np.clip(sd / bevel, 0, 1)
    return bh * (1 - (1 - t) ** 2) + dome * (1 - np.clip(PRAD / rmax, 0, 1) ** 2)


def rim_fx(col, sd, light, dark_c=(.55, .5, .45), hi=C('#9a8a78')):
    """light pieces: darker edge; dark pieces: a pale highlight rim."""
    e = np.clip(1 - sd / 9, 0, 1) ** 1.3
    if light:
        col = col * (1 - e[..., None] * (1 - np.array(dark_c) * .8))
        return mix(col, col * .55, smooth(.4, 1.4, sd) * smooth(3.4, 2.0, sd) * .6)
    # a polished / worn bevel catching the light: bright thin ring, brightest toward the upper left
    lit = .62 + .38 * np.clip(-(PX + PY * 1.2) / (np.hypot(PX, PY) + 1e-6), -1, 1)
    band = smooth(.6, 1.8, sd) * smooth(6.5, 3.6, sd)
    col = mix(col, hi, band * (.55 + .4 * lit))
    inner = smooth(9, 10.5, sd) * smooth(13.5, 11.5, sd)
    return mix(col, hi, inner * .28 * lit)


def piece(set_, light, queen):
    seed(['bone', 'folk', 'ceramic', 'brass'].index(set_) * 10 + light * 2 + queen + 500)
    sh = (NP, NP)
    sd = sd_hex() if queen else sd_disc()
    rmax = QAP / .866 if queen else GR
    h = profile(sd, 12 if not queen else 10, 7, 4 if queen else 5, rmax)
    cm = cj = cs = None
    if queen:
        h -= np.exp(-((sd - 17) / 2.2) ** 2) * 2.2      # a turned / cut hexagonal groove framing the crown
        cm, cj, cs = crown_masks(1.0, set_ != 'ceramic')
    else:
        for rr_, dep in ((.30, 1.4), (.58, 1.8), (.80, 1.3)):
            h -= np.exp(-((PRAD / GR - rr_) / .016) ** 2) * dep
        h += np.exp(-((PRAD / GR - .64) / .03) ** 2) * .8
    if set_ == 'bone':
        if light:
            st = noise(sh, 0, 1, aniso=(.5, 18)); st2 = noise(sh, 0, 1, aniso=(1.5, 40))
            alb = mix(C('#efe6cf'), C('#d9c79e'), .35 + .12 * st2 + .15 * noise(sh, 30, 1) + .25 * (PY + PX) / 256)
            alb = mix(alb, C('#a68a5c'), np.clip(st - 1.4, 0, 1) * .45)
            pores = np.clip(noise(sh, .7, 1) - 2.6, 0, 1)
            alb = mix(alb, C('#8b7350'), pores * .6)
            gloss, spec, amb = 40, .22, .66
            hi = None
        else:
            st = noise(sh, 0, 1, aniso=(.6, 20)); st2 = noise(sh, 0, 1, aniso=(2, 50))
            alb = mix(C('#140f0c'), C('#3a2b20'), .3 + .14 * st2 + .1 * st + .08 * noise(sh, 20, 1))
            gloss, spec, amb = 55, .32, .7
            hi = C('#d8c6a6')
        if queen:
            cr = gaussian_filter(cm, 1.2)
            h += cr * 4.5 + cj * 1.2 - cs * .8
            if light: alb = mix(alb, C('#9c7a4c') * (1 + .05 * st)[..., None], cm * .55)
            else: alb = mix(alb, mix(C('#d9c9a4'), C('#bfa77c'), .5 + .3 * st), cm * .9)   # bone inlay
        col = shade(gaussian_filter(h, .7), alb, gloss=gloss, spec=spec, amb=amb)
    elif set_ == 'folk':
        wd, _ = wood(sh, 7, C('#c9a56e'), C('#a8834e'), C('#8a6638'), warp=8, pore=.2)
        paint = mix(C('#e4d7b6'), C('#d4c49c'), .4 + .2 * noise(sh, 20, 1)) if light else mix(C('#1c1a17'), C('#2c2823'), .4 + .2 * noise(sh, 20, 1))
        paint = paint * (1 + .04 * noise(sh, 0, 1, aniso=(4, .6)))[..., None]
        accent = C('#9c2b22') if light else C('#c08e30')
        if queen:
            band = smooth(13, 15, sd) * smooth(21, 19, sd) * 0
            acc_m = cm
            h += gaussian_filter(cm, 1.2) * 3.5 - cs * .6
        else:
            wob = noise(sh, 8, 1.2)
            acc_m = smooth(.70, .715, (PRAD + wob) / GR) * smooth(.84, .825, (PRAD + wob) / GR)
            acc_m = np.maximum(acc_m, smooth(.2, .19, (PRAD + wob * .5) / GR))
        alb = mix(paint, accent * (1 + .05 * noise(sh, 2, 1))[..., None], acc_m)
        W = fbm(sh, [(30, .6), (8, .4), (2, .2)]) + 2.6 * np.clip(1 - sd / 10, 0, 1) + .5 * np.clip((PY + PX) / 180, 0, 1)
        keep = 1 - smooth(1.9, 2.2, W)
        d1, _ = crackle(sh, 6, .12)
        crk = smooth(.6, .15, d1) * keep * smooth(-.8, .3, noise(sh, 10, 1))
        alb = mix(wd, alb, keep)
        alb = mix(alb, C('#4a3720') if light else C('#5a4c3a'), crk * (.45 if light else .35))
        alb = alb * np.array([1, .97, .9])
        h = h + keep * .4 - crk * .3
        col = shade(gaussian_filter(h, .7), alb, gloss=14, spec=.05, amb=.66)
        hi = C('#d6b673')
    elif set_ == 'ceramic':
        if light:
            alb = mix(C('#efebe3'), C('#ddd6c9'), .35 + .15 * noise(sh, 25, 1) + .15 * (PY + PX) / 256)
            sp = np.clip(noise(sh, .6, 1) - 2.7, 0, 1)
            alb = mix(alb, C('#6a5a48'), sp * .7)
            hi = None
        else:
            alb = mix(C('#2f3032'), C('#45464a'), .4 + .15 * noise(sh, 25, 1))
            sp = np.clip(noise(sh, .6, 1) - 2.7, 0, 1)
            alb = mix(alb, C('#9a958c'), sp * .6)
            hi = C('#cdc8be')
        alb = alb * (1 + .015 * noise(sh, 1, 1))[..., None]
        if queen:
            # minimal: a recessed hexagon, embossed geometric crown inside it
            rec = smooth(19, 21, sd)
            h -= rec * 1.6
            cr = Canvas(NP, 3).mask(lambda d, P, ss: crown(d, P, ss, .82, False, cy=6), .6)
            h += gaussian_filter(cr, 1.0) * 2.6
            alb = mix(alb, C('#bdb3a2') if light else C('#77736c'), cr * .8)
        col = shade(gaussian_filter(h, .9), alb, gloss=8, spec=.09, amb=.68)
    elif set_ == 'brass':
        th = (PANG + math.pi) / (2 * math.pi) * 4096
        pol = gaussian_filter(rng.standard_normal((4096, 160)), (.6, 30), mode=('wrap', 'reflect'))
        pol /= pol.std()
        brush = map_coordinates(pol, [th, np.clip(PRAD, 0, 159)], order=1, mode='wrap')
        if light:
            alb = mix(C('#9e8043'), C('#d1b46e'), .5 + .1 * brush + .08 * noise(sh, 30, 1))
            hi = None
        else:
            alb = mix(C('#3a4049'), C('#596171'), .45 + .12 * brush + .06 * noise(sh, 30, 1))
            hi = C('#dfe5ee')
        if queen:
            eng = Canvas(NP, 3).mask(lambda d, P, ss: crown(d, P, ss, 1.0, True, outline=3.2), .45)
            fill = Canvas(NP, 3).mask(lambda d, P, ss: crown(d, P, ss, 1.0, True), .5)
            h -= eng * 1.6
            hatch = (np.sin((PX - PY) * .9) > .55) * fill * (1 - eng) * .35
            h -= hatch * .4
            alb = mix(alb, alb * (.45 if light else 2.0), np.clip(eng * .95 + hatch * (1 if light else 1.6), 0, 1))
        env = lambda n: np.clip(.6 - .5 * n[..., 1] - .3 * n[..., 0], 0, 1) * (1 + .12 * brush)
        col = shade(gaussian_filter(h, .7), alb, gloss=14, spec=.28 + .06 * brush, amb=.55, metal=.6, env=env)
    col = rim_fx(col, sd, light, hi=hi if hi is not None else C('#888888'))
    save_pc(col, sd, f'pc-{set_}-{1 if light else 2}-{"q" if queen else "g"}.webp')


# =========================================================================================== preview
def preview(path):
    boards = ['folk', 'victorian', 'walnut', 'slate']
    sets = ['bone', 'folk', 'ceramic', 'brass']
    tiles = []
    places = [((0, 0), 2, 'q'), ((1, -1), 1, 'g'), ((-1, 0), 2, 'g'), ((2, -2), 1, 'q'), ((5, -5), 1, 'g'), ((4, -5), 2, 'g'),
              ((-5, 5), 2, 'q'), ((-4, 5), 1, 'g'), ((0, 4), 1, 'g'), ((1, 4), 2, 'g'), ((-3, 1), 1, 'g'), ((-2, 1), 2, 'q'),
              ((3, 1), 2, 'g'), ((2, 2), 1, 'g'), ((-1, -3), 2, 'g'), ((0, -3), 1, 'g'), ((5, 0), 2, 'g'), ((-5, 2), 1, 'q')]
    for bi, b in enumerate(boards):
        for si, s in enumerate((sets[bi], 'bone')):
            im = Image.open(os.path.join(OUT, f'bd-{b}.webp')).convert('RGBA')
            for (q, r), side, kind in places:
                x, y = cell_xy(q, r)
                pcim = Image.open(os.path.join(OUT, f'pc-{s}-{side}-{kind}.webp')).convert('RGBA').resize((72, 72), Image.LANCZOS)
                sh = Image.new('RGBA', (72, 72), (0, 0, 0, 0))
                shm = pcim.split()[3].point(lambda v: int(v * .55))
                shadow = Image.new('RGBA', (72, 72), (0, 0, 0, 255)); shadow.putalpha(shm)
                im.alpha_composite(shadow, (int(x - 36 + 3), int(y - 36 + 4)))
                im.alpha_composite(pcim, (int(x - 36), int(y - 36)))
            tiles.append(im.convert('RGB').resize((640, 640), Image.LANCZOS))
    W = Image.new('RGB', (1280, 640 * 4), 'white')
    for i, t in enumerate(tiles): W.paste(t, ((i % 2) * 640, (i // 2) * 640))
    W.save(path); print(path)


if __name__ == '__main__':
    want = sys.argv[1:] or ['boards', 'pieces']
    if 'boards' in want: folk_board(); victorian_board(); walnut_board(); slate_board()
    for b in ('folk', 'victorian', 'walnut', 'slate'):
        if b in want: globals()[b + '_board']()
    if 'pieces' in want:
        for s in ('bone', 'folk', 'ceramic', 'brass'):
            for light in (True, False):
                for q in (False, True): piece(s, light, q)
    if 'preview' in want: preview(want[want.index('preview') + 1])

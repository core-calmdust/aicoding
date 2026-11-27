#!/usr/bin/env python3
"""Rendered art for Ultimate Tic-Tac-Toe (top view, light from the upper left). No vector shapes on the page: the boards
(with their grid) and every mark are rendered here with material texture and hand-made unevenness.
  boards   img/bd-<key>.webp            1024 px: the surface with the big grid and the nine small grids drawn / inlaid in it
  marks    img/mk-<set>-<x|o>-<k>.webp  256 px, several hand-made variants of each mark (the page picks one per cell)
  big      img/bg-<set>-<x|o>-<k>.webp  512 px: the large mark laid over a small board that was won
  line     img/ln-<set>-<x|o>.webp      1024 × 128: the stroke through the winning line of the big board
boards:  walnut (oiled walnut, brass inlay, carved small grids) · slate (a school slate, chalk) · washi (handmade paper, sumi
         brush) · parchment (old paper, iron-gall ink) · marble (white marble, gold inlay, engraved small grids)
marks:   token (vermilion lacquer X, ivory O) · chalk (white X, yellow O) · brush (sumi X, vermilion 朱 O) · ink (black X, blue O)
Geometry (shared with app.js GEO): margin M, gap G between small boards, small board S = (1 − 2M − 2G) / 3.
python3 tools/gen_art.py [boards] [marks]"""
import os, sys, math, numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, map_coordinates

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img')
os.makedirs(OUT, exist_ok=True)
M, G = 0.05, 0.035
S = (1 - 2 * M - 2 * G) / 3
L = np.array([-0.5, -0.62, 0.6]); L = L / np.linalg.norm(L)
Hh = L + np.array([0, 0, 1.0]); Hh = Hh / np.linalg.norm(Hh)


def C(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float)


def noise(rng, shape, s, wrap=False, aniso=None):
    x = rng.standard_normal(shape)
    x = gaussian_filter(x, aniso if aniso else s, mode='wrap' if wrap else 'reflect')
    return x / (x.std() + 1e-9)


def normals(h):
    gy, gx = np.gradient(h)
    n = np.dstack([-gx, -gy, np.ones_like(h)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    return n


def shade(h, albedo, gloss=40, spec=0.5, amb=0.42, metal=0.0):
    n = normals(h)
    diff = np.clip(n @ L, 0, 1)
    sp = np.clip(n @ Hh, 0, 1) ** gloss * spec
    ref = np.clip(0.55 - 0.45 * n[..., 1] - 0.25 * n[..., 0], 0, 1)
    col = albedo * (amb + (1 - amb) * diff[..., None])
    col = col * (1 - metal) + albedo * ref[..., None] * metal * 1.3
    col = col + sp[..., None] * (albedo / 255 * metal + (1 - metal)) * 255
    return col


def save(arr, name, q=86, alpha=None):
    a = np.clip(arr, 0, 255).astype(np.uint8)
    if alpha is not None:
        im = Image.fromarray(np.dstack([a, np.clip(alpha * 255, 0, 255).astype(np.uint8)]), 'RGBA')
    else:
        im = Image.fromarray(a, 'RGB')
    im.save(os.path.join(OUT, name), quality=q, method=6); print(name)


# ------------------------------------------------------------------------------------------- strokes
def stroke_mask(N, pts, widths, ss=2, soft=0.6):
    """coverage of a stroke along pts (pixel coords) with a width per point, stamped as discs (supersampled)."""
    im = Image.new('L', (N * ss, N * ss), 0); d = ImageDraw.Draw(im)
    pts = np.asarray(pts, float); widths = np.broadcast_to(np.asarray(widths, float), (len(pts),))
    # resample densely
    seg = np.hypot(*np.diff(pts, axis=0).T); tot = seg.sum(); n = max(2, int(tot * 1.2))
    cum = np.concatenate([[0], np.cumsum(seg)]); u = np.linspace(0, tot, n)
    xs = np.interp(u, cum, pts[:, 0]); ys = np.interp(u, cum, pts[:, 1]); ws = np.interp(u, cum, widths)
    for x, y, w in zip(xs, ys, ws):
        r = max(0.3, w / 2) * ss
        d.ellipse([x * ss - r, y * ss - r, x * ss + r, y * ss + r], fill=255)
    a = np.asarray(im.resize((N, N), Image.LANCZOS)).astype(float) / 255
    return gaussian_filter(a, soft) if soft else a


def path_line(p0, p1, n=40, wob=0.0, rng=None, bow=0.0):
    """a hand-drawn straight stroke: slightly bowed, with a low-frequency wobble"""
    t = np.linspace(0, 1, n)
    x = p0[0] + (p1[0] - p0[0]) * t; y = p0[1] + (p1[1] - p0[1]) * t
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]; L_ = math.hypot(dx, dy) or 1; nx, ny = -dy / L_, dx / L_
    off = bow * np.sin(t * math.pi) * L_
    if wob and rng is not None:
        k = rng.standard_normal(6)
        off = off + wob * L_ * sum(k[i] * np.sin((i + 1) * math.pi * t + k[(i + 3) % 6]) / (i + 1) ** 1.6 for i in range(3))
    return np.stack([x + nx * off, y + ny * off], 1), t


def path_circle(c, r, a0, sweep, n=120, wob=0.0, rng=None, squash=1.0, tilt=0.0):
    t = np.linspace(0, 1, n); a = a0 + sweep * t
    k = rng.standard_normal(6) if rng is not None else np.zeros(6)
    rr = r * (1 + wob * (k[0] * np.sin(2 * a + k[1]) * .5 + k[2] * np.sin(3 * a + k[3]) * .3 + k[4] * 0.4 * t))
    x = rr * np.cos(a); y = rr * np.sin(a) * squash
    ct, st = math.cos(tilt), math.sin(tilt)
    return np.stack([c[0] + x * ct - y * st, c[1] + x * st + y * ct], 1), t


# =========================================================================================== boards
NB = 1024


def grid_geom(N=NB):
    """small-board origins (px) and the centres of the two big lines in each direction"""
    o = [M + k * (S + G) for k in range(3)]
    big = [M + S + G / 2, M + 2 * S + 1.5 * G]
    return [v * N for v in o], [v * N for v in big], S * N


def lines_spec(N=NB, inset=0.07):
    """list of segments: ('big', p0, p1) running the full board; ('small', p0, p1) inside each small board"""
    o, big, s = grid_geom(N)
    segs = []
    e0, e1 = M * N * 0.55, N - M * N * 0.55
    for b in big:
        segs.append(('big', (b, e0), (b, e1))); segs.append(('big', (e0, b), (e1, b)))
    for bx in o:
        for by in o:
            for k in (1, 2):
                x = bx + s * k / 3; y = by + s * k / 3
                segs.append(('small', (x, by + s * inset), (x, by + s * (1 - inset))))
                segs.append(('small', (bx + s * inset, y), (bx + s * (1 - inset), y)))
    return segs


def wood(rng, N, light, mid, dark, pore, ring_px=26):
    """flat-sawn board: flowing growth-ring figure (dark latewood lines, a cathedral here and there), soft colour
    variation, pores as short dashes along the grain, very fine fibres; the grain runs left to right"""
    y, x = np.mgrid[0:N, 0:N].astype(float)
    # the ring "height": rows bent by a slow warp, plus a broad cathedral bump
    w1 = noise(rng, (N, N), 0, aniso=(60, 300)) * 22 + noise(rng, (N, N), 0, aniso=(14, 120)) * 5
    cat = 60 * np.exp(-((x - N * rng.uniform(.3, .7)) / (N * .35)) ** 2) * np.exp(-((y - N * rng.uniform(.3, .7)) / (N * .6)) ** 2)
    r = (y + w1 + cat * np.cos((x / N - .5) * 2.2)) / ring_px
    ph = r - np.floor(r)
    late = np.clip(1 - np.abs(ph - .72) / .2, 0, 1) ** 1.6                     # latewood: a darker band in each ring
    edge = np.clip(1 - np.abs(ph - .62) / .035, 0, 1) * .5                    # its sharp lower edge
    tone = noise(rng, (N, N), 0, aniso=(90, 420)) * .5 + noise(rng, (N, N), 0, aniso=(20, 160)) * .25
    t = np.clip(.3 + .45 * late + .2 * edge + .14 * tone, 0, 1)[..., None]
    base = np.where(t < .5, light + (mid - light) * (t / .5), mid + (dark - mid) * ((t - .5) / .5))
    fib = noise(rng, (N, N), 0, aniso=(.5, 18))
    img = base * (1 + .018 * fib[..., None])
    pr = (rng.random((N, N)) > .9988).astype(float)
    pr = np.clip(gaussian_filter(pr, (.5, 3.2)) * 9, 0, 1) * .5
    img = img * (1 - pr[..., None]) + pore * pr[..., None]
    img = img * (1 + .05 * noise(rng, (N, N), 0, aniso=(150, 360))[..., None])
    return img, fib * .3 + late * .4


def sheen(N, k=0.08):
    y, x = np.mgrid[0:N, 0:N].astype(float)
    return 1 + k * np.clip(1 - np.hypot((x - N * .28) / (N * .7), (y - N * .2) / (N * .55)), 0, 1) ** 2


def walnut_board():
    rng = np.random.default_rng(11)
    img, fib = wood(rng, NB, C('#8c5d3b'), C('#62402a'), C('#38231a'), C('#1c100a'))
    h = fib * .25
    o, big, s = grid_geom()
    # brass inlay strips (big lines): flat-topped, brushed along their length, a dark seam where they meet the wood
    brass = np.zeros((NB, NB)); seam = np.zeros((NB, NB))
    w = NB * .011
    yy, xx = np.mgrid[0:NB, 0:NB].astype(float)
    e0, e1 = M * NB * .55, NB - M * NB * .55
    for b in big:
        for vert in (True, False):
            dd = np.abs((xx if vert else yy) - b); along = yy if vert else xx
            inside = (along > e0) & (along < e1)
            m = np.clip((w / 2 - dd) / 1.2, 0, 1) * inside
            brass = np.maximum(brass, m)
            seam = np.maximum(seam, np.clip(1 - np.abs(dd - w / 2 - .6) / 1.4, 0, 1) * inside)
    brush_v = noise(rng, (NB, NB), 0, aniso=(14, .5)); brush_h = noise(rng, (NB, NB), 0, aniso=(.5, 14))
    bcol = np.ones((NB, NB, 3)) * C('#c59d4f')
    bcol *= (1 + .07 * (brush_v * .5 + brush_h * .5))[..., None]
    hb = brass * 3.0 + gaussian_filter(brass, 1.2) * 1.5
    # carved grooves (small lines): a V-cut, hand-cut so a little uneven
    groove = np.zeros((NB, NB))
    for kind, p0, p1 in lines_spec():
        if kind != 'small': continue
        pts, t = path_line(p0, p1, 30, .004, rng)
        wd = NB * .0058 * (1 + .12 * np.sin(t * 7 + rng.random() * 6))
        groove = np.maximum(groove, stroke_mask(NB, pts, wd, 2, .5))
    h = h - groove * 2.4 + hb
    col = shade(h * 3, img, gloss=30, spec=.18, amb=.5)
    bsh = shade(hb * 2, bcol, gloss=60, spec=.9, amb=.45, metal=.75)
    col = col * (1 - brass[..., None]) + bsh * brass[..., None]
    col = col * (1 - .55 * seam[..., None])
    col = col * (1 - .35 * groove[..., None])
    col *= sheen(NB, .07)[..., None]
    save(col, 'bd-walnut.webp')


def cherry_board():
    rng = np.random.default_rng(17)
    img, fib = wood(rng, NB, C('#c98a5c'), C('#a9663d'), C('#7a3f22'), C('#3a1c0e'), ring_px=34)
    o, big, s_ = grid_geom()
    yy, xx = np.mgrid[0:NB, 0:NB].astype(float)
    eb = np.zeros((NB, NB)); w = NB * .012
    e0, e1 = M * NB * .55, NB - M * NB * .55
    for b in big:
        for vert in (True, False):
            dd = np.abs((xx if vert else yy) - b); along = yy if vert else xx
            eb = np.maximum(eb, np.clip((w / 2 - dd) / 1.1, 0, 1) * ((along > e0) & (along < e1)))
    ebc = np.ones((NB, NB, 3)) * C('#2a201a') * (1 + .12 * noise(rng, (NB, NB), 0, aniso=(.6, 12)))[..., None]
    inl = np.zeros((NB, NB))   # the small grids: thin ebony stringing
    for kind, p0, p1 in lines_spec():
        if kind != 'small': continue
        pts, t = path_line(p0, p1, 20, .0015, rng)
        inl = np.maximum(inl, stroke_mask(NB, pts, NB * .005, 2, .45))
    h = fib * .2 + eb * .4 + inl * .2
    col = shade(h * 3, img, gloss=36, spec=.22, amb=.5)
    for m_ in (eb, inl):
        col = col * (1 - m_[..., None]) + shade(m_ * 2, ebc, gloss=60, spec=.4, amb=.6) * m_[..., None]
    col *= sheen(NB, .07)[..., None]
    save(col, 'bd-cherry.webp')


def slate_board():
    rng = np.random.default_rng(23)
    base = C('#2f3a36')
    n1 = noise(rng, (NB, NB), 60); n2 = noise(rng, (NB, NB), 8); n3 = noise(rng, (NB, NB), 1.2)
    img = np.ones((NB, NB, 3)) * base
    img *= (1 + .05 * n1 + .025 * n2 + .03 * n3)[..., None]
    # old chalk wiped off: cloudy grey smears along the wiping direction
    sm = gaussian_filter(rng.standard_normal((NB, NB)), (40, 120)); sm = (sm - sm.mean()) / sm.std()
    wipe = np.clip(sm * .5 + .1, 0, 1) ** 2 * .16
    streak = np.clip(noise(rng, (NB, NB), 0, aniso=(2, 40)) * .5 + .2, 0, 1) * wipe
    img = img * (1 - streak[..., None]) + C('#b9c2bd') * streak[..., None]
    h = n3 * .15 + n2 * .1
    img = shade(h, img, gloss=12, spec=.05, amb=.62)
    # the grid in chalk, drawn by hand: wobbly lines, broken where the chalk skips over the grain
    cov = np.zeros((NB, NB))
    for kind, p0, p1 in lines_spec():
        pts, t = path_line(p0, p1, 50, .006 if kind == 'small' else .004, rng, bow=rng.normal(0, .004))
        wd = (NB * (.0125 if kind == 'big' else .0055)) * (1 + .2 * np.sin(t * 5 + rng.random() * 6)) * np.clip(t * 12, .5, 1) * np.clip((1 - t) * 10, .6, 1)
        cov = np.maximum(cov, stroke_mask(NB, pts, wd, 2, .6) * (.85 + .15 * rng.random()))
    grain = np.clip(.55 + .35 * noise(rng, (NB, NB), .7) + .25 * noise(rng, (NB, NB), 3), 0, 1)
    a = np.clip(cov * grain * 1.25, 0, 1) * .88
    dust = gaussian_filter(cov, 4) * .1
    img = img * (1 - dust[..., None]) + C('#d8dcd6') * dust[..., None]
    img = img * (1 - a[..., None]) + C('#eef0ea') * a[..., None]
    img *= sheen(NB, .05)[..., None]
    save(img, 'bd-slate.webp')


def paper(rng, N, base, fibers=True, tone=0.04):
    n1 = noise(rng, (N, N), 90); n2 = noise(rng, (N, N), 6); n3 = noise(rng, (N, N), .8)
    img = np.ones((N, N, 3)) * base * (1 + tone * n1 + .012 * n2 + .02 * n3)[..., None]
    h = n3 * .06 + n2 * .05
    if fibers:   # kozo fibres: thin curly threads in the sheet
        im = Image.new('L', (N * 2, N * 2), 0); d = ImageDraw.Draw(im)
        for _ in range(520):
            x, y = rng.random() * N * 2, rng.random() * N * 2; a = rng.random() * 6.28; ln = rng.uniform(20, 140)
            pts = []
            for k in range(12):
                a += rng.normal(0, .35); x += math.cos(a) * ln / 12; y += math.sin(a) * ln / 12; pts.append((x, y))
            d.line(pts, fill=int(rng.uniform(60, 160)), width=1)
        fb = np.asarray(im.resize((N, N), Image.LANCZOS)).astype(float) / 255
        img = img * (1 - .14 * fb[..., None]) + C('#fffdf6') * .0
        h = h + fb * .4
    return shade(h, img, gloss=8, spec=.03, amb=.72), n2


def ink_lines(rng, N, big_w, small_w, wob, dry=0.0, bow=.003):
    """coverage of brush / pen lines over the grid, with a little dry-brush at the end of each line"""
    cov = np.zeros((N, N)); dens = np.zeros((N, N))
    for kind, p0, p1 in lines_spec(N):
        if rng.random() < .5: p0, p1 = p1, p0
        pts, t = path_line(p0, p1, 60, wob, rng, bow=rng.normal(0, bow))
        base = N * (big_w if kind == 'big' else small_w)
        wd = base * (.75 + .4 * np.clip(t * 6, 0, 1) - .25 * t ** 2) * (1 + .08 * np.sin(t * 9 + rng.random() * 6))
        m = bristle_mask(rng, N, pts, wd, dry, 2) if dry >= .3 else stroke_mask(N, pts, wd, 2, .5)
        cov = np.maximum(cov, m)
        # the ink is heavier where the brush / nib starts and pools at the edges
        tt = np.zeros((N, N))
        dens = np.maximum(dens, m * (.85 + .15 * rng.random()))
    if dry and dry < .3:
        streak = noise(rng, (N, N), 0, aniso=(.6, 30)) * .5 + noise(rng, (N, N), 0, aniso=(30, .6)) * .5
        cov = cov * np.clip(1 - dry * np.clip(streak - .6, 0, 9), 0, 1)
    edge = np.clip(cov - gaussian_filter(cov, 1.6), 0, 1) * 1.8
    return cov, edge


def washi_board():
    rng = np.random.default_rng(31)
    img, _ = paper(rng, NB, C('#efe6d3'))
    cov, edge = ink_lines(rng, NB, .012, .0048, .004, dry=.5)
    ink = C('#1b1814')
    a = np.clip(cov * .88 + edge * .1, 0, 1)
    bleed = gaussian_filter(cov, 2.2) * .12   # a faint feathering into the paper
    img = img * (1 - bleed[..., None]) + C('#5b544a') * bleed[..., None]
    img = img * (1 - a[..., None]) + ink * a[..., None]
    img *= sheen(NB, .04)[..., None]
    save(img, 'bd-washi.webp')


def parchment_board():
    rng = np.random.default_rng(41)
    img, n2 = paper(rng, NB, C('#e6d3ac'), fibers=False, tone=.07)
    # foxing and an age tone towards the edges
    y, x = np.mgrid[0:NB, 0:NB].astype(float)
    r = np.hypot((x - NB / 2) / (NB / 2), (y - NB / 2) / (NB / 2))
    age = np.clip(r - .55, 0, 1) ** 1.6 * .5
    img = img * (1 - age[..., None] * .35)
    fox = np.clip(noise(rng, (NB, NB), 14) - 2.1, 0, 1) * .25
    img = img * (1 - fox[..., None] * .5)
    cov, edge = ink_lines(rng, NB, .0085, .0034, .002, dry=.15, bow=.0015)
    ink = C('#3b2414')
    a = np.clip(cov * .9 + edge * .25, 0, 1)
    img = img * (1 - a[..., None]) + ink * a[..., None]
    img *= sheen(NB, .04)[..., None]
    save(img, 'bd-parchment.webp')


def marble_board():
    rng = np.random.default_rng(53)
    N = NB
    y, x = np.mgrid[0:N, 0:N].astype(float)
    from scipy.ndimage import rotate
    def field(sig, ang, seed_off=0):
        P = int(N * 1.5); f = gaussian_filter(rng.standard_normal((P, P)), sig)
        f = rotate(f, ang, reshape=False, order=1, mode='reflect'); o_ = (P - N) // 2
        f = f[o_:o_ + N, o_:o_ + N]; return f / (f.std() + 1e-9)
    warpf = field((40, 40), 0) * 14
    f1 = field((45, 260), 33) ; f1 = map_coordinates(f1, [np.clip(y + warpf, 0, N - 1), np.clip(x + field((50, 50), 0) * 14, 0, N - 1)], order=1)
    f2 = field((14, 120), -20)
    gate = np.clip(field((90, 90), 0) * .7 + .55, 0, 1); wv = .03 + .05 * np.clip(field((60, 60), 0) * .5 + .5, 0, 1)
    vein = (np.exp(-(f1 / wv) ** 2) * .62 + np.exp(-(f1 / .28) ** 2) * .16) * gate + np.exp(-(f2 / .03) ** 2) * .16 * np.clip(field((60, 60), 0) * .6, 0, 1)
    vein = gaussian_filter(vein, .9)
    cloud = field((70, 70), 0) * .6 + field((14, 14), 0) * .25
    img = np.ones((N, N, 3)) * C('#f1f0ec') * (1 + .03 * cloud)[..., None]
    img = img * (1 - vein[..., None] * .6) + C('#7f858d') * vein[..., None] * .6
    o, big, s = grid_geom()
    gold = np.zeros((N, N)); seam = np.zeros((N, N)); w = N * .0095
    e0, e1 = M * N * .55, N - M * N * .55
    for b in big:
        for vert in (True, False):
            dd = np.abs((x if vert else y) - b); along = y if vert else x
            inside = (along > e0) & (along < e1)
            gold = np.maximum(gold, np.clip((w / 2 - dd) / 1.2, 0, 1) * inside)
            seam = np.maximum(seam, np.clip(1 - np.abs(dd - w / 2 - .6) / 1.3, 0, 1) * inside)
    eng = np.zeros((N, N))
    for kind, p0, p1 in lines_spec():
        if kind != 'small': continue
        pts, t = path_line(p0, p1, 20, .0015, rng)
        eng = np.maximum(eng, stroke_mask(N, pts, N * .0042, 2, .45))
    h = noise(rng, (N, N), 2) * .03 - eng * 1.6 + gold * 2.5 + gaussian_filter(gold, 1) * 1
    col = shade(h * 2, img, gloss=70, spec=.35, amb=.55)
    gcol = np.ones((N, N, 3)) * C('#c8a24e') * (1 + .06 * noise(rng, (N, N), 0, aniso=(.5, 10)))[..., None]
    gs = shade(gold * 3, gcol, gloss=60, spec=.9, amb=.45, metal=.8)
    col = col * (1 - gold[..., None]) + gs * gold[..., None]
    col = col * (1 - .4 * seam[..., None])
    # the engraved lines are filled with a grey patina
    col = col * (1 - eng[..., None] * .55) + C('#6c6f74') * eng[..., None] * .3
    col *= sheen(N, .06)[..., None]
    save(col, 'bd-marble.webp')


# =========================================================================================== marks
def x_paths(rng, N, size=.62, jit=.05):
    c = N / 2; h = N * size / 2
    j = lambda: rng.normal(0, jit) * N * .5
    a = ((c - h + j(), c - h + j()), (c + h + j(), c + h + j()))
    b = ((c + h + j(), c - h + j()), (c - h + j(), c + h + j()))
    return [a, b]


def bristle_mask(rng, N, pts, wd, dry, ss=3):
    """a brush stroke as many bristles: each one follows the path at its own offset across the stroke and runs out of ink at
    its own point near the end (dry-brush streaks that follow the stroke, also round a curve)"""
    pts = np.asarray(pts, float); wd = np.broadcast_to(np.asarray(wd, float), (len(pts),))
    seg = np.hypot(*np.diff(pts, axis=0).T); cum = np.concatenate([[0], np.cumsum(seg)]); tot = cum[-1]
    n = max(4, int(tot / 1.5)); u = np.linspace(0, tot, n)
    xs = np.interp(u, cum, pts[:, 0]); ys = np.interp(u, cum, pts[:, 1]); ws = np.interp(u, cum, wd); tt = u / tot
    dx = np.gradient(xs); dy = np.gradient(ys); ln = np.hypot(dx, dy) + 1e-9; nx, ny = -dy / ln, dx / ln
    acc = np.zeros((N * ss, N * ss), np.float32)
    nb = 46
    for j in range(nb):
        off = (j + .5) / nb * 2 - 1 + rng.normal(0, .015)
        start = rng.uniform(1 - dry * 1.3, 1.05) if dry else 2
        ink = np.clip(1 - (tt - start) / .12, 0, 1) * (.75 + .25 * rng.random())
        ink *= np.clip(1 - np.abs(off) ** 6, 0, 1) ** .3
        im = Image.new('L', (N * ss, N * ss), 0); d = ImageDraw.Draw(im)
        bw = max(1, int(ws.mean() / nb * 2.6 * ss))
        px = (xs + nx * off * ws / 2) * ss; py = (ys + ny * off * ws / 2) * ss
        for k in range(n - 1):
            a = int(255 * ink[k])
            if a < 8: continue
            d.line([(px[k], py[k]), (px[k + 1], py[k + 1])], fill=a, width=bw)
        acc = np.maximum(acc, np.asarray(im, np.float32))
    a = np.asarray(Image.fromarray(acc.astype(np.uint8)).resize((N, N), Image.LANCZOS)).astype(float) / 255
    return gaussian_filter(a, .45)


def brushlike(rng, N, paths, w0, kind, color, dry=0.0):
    """kind: 'brush' (pressure swell, bristle streaks, dry tail), 'chalk' (broken grain), 'ink' (pen: thin, a blot at the start)"""
    cov = np.zeros((N, N)); dens = np.zeros((N, N))
    for pts, t in paths:
        if kind == 'brush':
            wd = w0 * (.85 + .35 * np.exp(-t * 10)) * (1 - .55 * t ** 2.4) * np.clip(t * 25 + .55, 0, 1)
        elif kind == 'chalk':
            wd = w0 * (.9 + .15 * np.sin(t * 4 + rng.random() * 6))
        else:
            wd = w0 * (1.25 - .5 * t) * (1 + .1 * np.sin(t * 7 + rng.random() * 6))
        m = stroke_mask(N, pts, wd, 3, .5) if kind != 'brush' else bristle_mask(rng, N, pts, wd, dry)
        if False:
            # bristle streaks along the stroke direction: modulate across the stroke by a few lanes
            d = pts[-1] - pts[0]; ang = math.atan2(d[1], d[0])
            yy, xx = np.mgrid[0:N, 0:N].astype(float)
            across = -np.sin(ang) * xx + np.cos(ang) * yy
            lanes = .5 + .5 * np.sin(across / (w0 * .09) + rng.random() * 6) * np.sin(across / (w0 * .23) + rng.random() * 6)
            along = np.cos(ang) * xx + np.sin(ang) * yy
            a0, a1 = (np.cos(ang) * pts[0, 0] + np.sin(ang) * pts[0, 1]), (np.cos(ang) * pts[-1, 0] + np.sin(ang) * pts[-1, 1])
            if abs(a1 - a0) < 1:   # (a circle: use the angle round the centre as the "along")
                u = t
                prog = np.zeros((N, N))
            prog = np.clip((along - a0) / (a1 - a0 + 1e-6), 0, 1) if abs(a1 - a0) >= 1 else np.zeros((N, N))
            gap = np.clip((prog - (1 - dry)) / max(dry, 1e-3), 0, 1) if dry else 0
            m = m * np.clip(1 - gap * (1 - lanes) * 1.6, 0, 1) * (.86 + .14 * lanes)
        cov = np.maximum(cov, m); dens = dens + m
    if kind == 'chalk':
        grain = np.clip(.5 + .4 * noise(rng, (N, N), .6) + .25 * noise(rng, (N, N), 2.5), 0, 1)
        a = np.clip(cov * (grain * 1.35), 0, 1) * .95
        a = np.maximum(a, gaussian_filter(cov, 3) * .12)   # dust round the stroke
        col = np.ones((N, N, 3)) * color * (1 + .05 * noise(rng, (N, N), 1))[..., None]
        return col, a
    if kind == 'brush':
        edge = np.clip(cov - gaussian_filter(cov, N * .012), 0, 1)
        over = np.clip(dens - 1, 0, 1)    # a second stroke over the first: darker
        tone = np.clip(.82 + .25 * edge + .12 * over + .06 * noise(rng, (N, N), 3), 0, 1.2)
        col = np.ones((N, N, 3)) * color * (1.18 - .25 * tone)[..., None]
        a = np.clip(cov * (.9 + .12 * tone), 0, 1)
        # paper shows through the faint wet edge
        a = np.maximum(a, gaussian_filter(cov, 1.4) * .25)
        return col, a
    # ink
    edge = np.clip(cov - gaussian_filter(cov, 1.2), 0, 1)
    over = np.clip(dens - 1, 0, 1)
    col = np.ones((N, N, 3)) * color * (1 - .18 * edge - .2 * over + .04 * noise(rng, (N, N), 2))[..., None]
    a = np.clip(cov * .96 + edge * .1, 0, 1)
    return col, a


def mark_x(rng, N, style, big=False):
    w = N * (.13 if style == 'brush' else .085 if style == 'chalk' else .06) * (1.25 if big else 1)
    ps = []
    for (p0, p1) in x_paths(rng, N, .6 if not big else .66, .045):
        if style == 'brush' and rng.random() < .3: p0, p1 = p1, p0
        pts, t = path_line(p0, p1, 50, .012 if style != 'ink' else .008, rng, bow=rng.normal(0, .025))
        ps.append((pts, t))
    col = {'brush': C('#15120f'), 'chalk': C('#f2f1ea'), 'ink': C('#191b22')}[style]
    return brushlike(rng, N, ps, w, style, col, dry=.35 if style == 'brush' else 0)


def mark_o(rng, N, style, big=False):
    w = N * (.12 if style == 'brush' else .08 if style == 'chalk' else .055) * (1.2 if big else 1)
    r = N * (.27 if not big else .31)
    a0 = rng.uniform(-2.4, -1.2) if style == 'brush' else rng.uniform(-3.1, 3.1)
    sweep = rng.uniform(5.9, 6.5) if style == 'brush' else rng.uniform(6.35, 6.75)
    pts, t = path_circle((N / 2 + rng.normal(0, N * .015), N / 2 + rng.normal(0, N * .015)), r, a0, sweep, 160, .05, rng, rng.uniform(.9, 1.04), rng.uniform(-.4, .4))
    col = {'brush': C('#c8321e'), 'chalk': C('#f1d87a'), 'ink': C('#21479a')}[style]
    return brushlike(rng, N, [(pts, t)], w, style, col, dry=.4 if style == 'brush' else 0)


def token(rng, N, which, big=False):
    """a lacquered vermilion X / an ivory O, set on the board (a soft contact shadow); slightly turned, a little unevenly made"""
    yy, xx = np.mgrid[0:N, 0:N].astype(float)
    c = N / 2; rot = rng.normal(0, .08) + (math.pi / 4 if which == 'x' else 0)
    if which == 'x':
        arm = N * (.36 if not big else .4); hw = N * (.085 if not big else .095)
        u = (xx - c) * math.cos(rot) + (yy - c) * math.sin(rot); v = -(xx - c) * math.sin(rot) + (yy - c) * math.cos(rot)
        d1 = np.maximum(np.abs(u) - arm, np.abs(v) - hw); d2 = np.maximum(np.abs(v) - arm, np.abs(u) - hw)
        sd = np.minimum(d1, d2)
        sd = sd - N * .018   # rounded corners (offset of a sharper cross)
        sd = gaussian_filter(sd, N * .012)
    else:
        r = N * (.3 if not big else .34); th = N * (.095 if not big else .1)
        rr = np.hypot(xx - c, (yy - c) * 1.0)
        sd = np.abs(rr - r) - th / 2
    inside = np.clip(-sd / 1.2, 0, 1)
    bev = N * .05
    hgt = np.clip(-sd / bev, 0, 1); hgt = np.sin(hgt * math.pi / 2) ** .8 * N * .07
    hgt = hgt + noise(rng, (N, N), N * .03) * N * .002
    if which == 'x':
        alb = np.ones((N, N, 3)) * C('#c23b22') * (1 + .03 * noise(rng, (N, N), 3))[..., None]
        col = shade(hgt * .12, alb, gloss=90, spec=.75, amb=.5)
    else:
        alb = np.ones((N, N, 3)) * C('#efe5cf')
        # ivory: faint growth lines (Schreger) and warm tone
        ang = np.arctan2(yy - c, xx - c)
        lines = np.sin(np.hypot(xx - c, yy - c) / (N * .012) + noise(rng, (N, N), N * .05) * 2) * .5 + .5
        alb = alb * (1 - .045 * lines[..., None]) * (1 + .025 * noise(rng, (N, N), 4))[..., None]
        col = shade(hgt * .12, alb, gloss=40, spec=.32, amb=.55)
    # contact shadow (offset to the lower right)
    sh = gaussian_filter(np.roll(np.roll(inside, int(N * .03), 0), int(N * .02), 1), N * .03) * .55
    a = np.maximum(inside, sh)
    out = col * inside[..., None] + np.zeros_like(col) * (1 - inside[..., None])
    return out, a, inside


def save_mark(col, a, name, inside=None):
    if inside is not None:
        # pre-multiplied shadow: dark where only the shadow is
        col = col * inside[..., None]
    save(col, name, q=90, alpha=a)


def marks(styles=('brush', 'chalk', 'ink'), tokens=True):
    for style in styles:
        for which in ('x', 'o'):
            for k in range(6):
                rng = np.random.default_rng(1000 + k * 17 + (7 if which == 'o' else 0) + {'brush': 0, 'chalk': 300, 'ink': 600}[style])
                col, a = (mark_x if which == 'x' else mark_o)(rng, 256, style)
                save_mark(col, a, f'mk-{style}-{which}-{k}.webp')
            for k in range(3):
                rng = np.random.default_rng(5000 + k * 31 + (7 if which == 'o' else 0) + {'brush': 0, 'chalk': 300, 'ink': 600}[style])
                col, a = (mark_x if which == 'x' else mark_o)(rng, 512, style, True)
                save_mark(col, a, f'bg-{style}-{which}-{k}.webp')
    for which in ('x', 'o') if tokens else ():
        for k in range(6):
            rng = np.random.default_rng(9000 + k * 13 + (7 if which == 'o' else 0))
            col, a, ins = token(rng, 256, which)
            save_mark(col, a, f'mk-token-{which}-{k}.webp', ins)
        for k in range(3):
            rng = np.random.default_rng(9500 + k * 13 + (7 if which == 'o' else 0))
            col, a, ins = token(rng, 512, which, True)
            save_mark(col, a, f'bg-token-{which}-{k}.webp', ins)


def lines_img():
    W, Hh_ = 1024, 128
    for style in ('brush', 'chalk', 'ink', 'token'):
        for which in ('x', 'o'):
            rng = np.random.default_rng(7000 + (7 if which == 'o' else 0) + len(style))
            N = W
            pts, t = path_line((40, 64), (W - 40, 64), 80, .004, rng, bow=rng.normal(0, .01))
            st = {'token': 'ink'}.get(style, style)
            w0 = {'brush': 40, 'chalk': 26, 'ink': 18, 'token': 22}[style]
            col = {('brush', 'x'): C('#15120f'), ('brush', 'o'): C('#c8321e'), ('chalk', 'x'): C('#f2f1ea'), ('chalk', 'o'): C('#f1d87a'),
                   ('ink', 'x'): C('#191b22'), ('ink', 'o'): C('#21479a'), ('token', 'x'): C('#c23b22'), ('token', 'o'): C('#efe5cf')}[(style, which)]
            # draw on a square canvas, then crop the band
            colf, a = brushlike(rng, N, [(pts + np.array([0, N / 2 - 64]), t)], w0, st, col, dry=.4 if st == 'brush' else 0)
            y0 = N // 2 - 64
            save(colf[y0:y0 + Hh_], f'ln-{style}-{which}.webp', q=90, alpha=a[y0:y0 + Hh_])


if __name__ == '__main__':
    what = sys.argv[1:] or ['boards', 'marks']
    if 'boards' in what:
        walnut_board(); cherry_board(); slate_board(); washi_board(); parchment_board(); marble_board()
    if 'woods' in what:
        walnut_board(); cherry_board()
    if 'marks' in what:
        marks(); lines_img()
    if 'washi' in what:
        washi_board()
    if 'brush' in what:
        marks(('brush',), False)

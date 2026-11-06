#!/usr/bin/env python3
"""Rendered art for Kōnane (Hawaiʻi), top view lit from the upper left.
  boards  img/bd-<key>.webp  : the playing surface (1024 px, no grid — the puka (holes) are drawn by the page for 6×6 / 8×8 / 10×10)
  frames  img/fr-<key>.webp  : a seamless 512 px tile for the frame around the board
  pieces  img/pc-<set>-<b|w>.webp : 256 px stone faces (b = Black, the first player; w = White)
  quilt     kapa kuiki (Hawaiian quilt): a teal ʻulu (breadfruit) appliqué on unbleached cotton, echo quilting round it
  kapa      kapa (beaten wauke bark cloth) stamped with ʻohe kāpala bamboo-stamp bands in black and red-brown
  lauhala   woven lauhala (pandanus leaf) mat, golden strips over and under
  pahoehoe  ropy pāhoehoe lava, the rim glowing where the flow is still hot (the papamū of old were carved in lava)
  pieces: coral & basalt (the traditional white coral / black lava pebbles), kukui nuts, pearls, koa wood
python3 konane/tools/gen_art.py [boards] [frames] [pieces]"""
import os, math, numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, distance_transform_edt, map_coordinates

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(808)
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


def shade(h, albedo, gloss=40, spec=0.5, amb=0.4, metal=0.0, env=None, wrap=False):
    if wrap:
        gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) / 2; gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) / 2
    else:
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


def save_rgb(col, name, q=88):
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


def poly(d, P, pts, fill=255): d.polygon([P(x, y) for x, y in pts], fill=fill)


def dot(d, P, ss, x, y, r, fill=255):
    cx, cy = P(x, y); d.ellipse([cx - r * ss, cy - r * ss, cx + r * ss, cy + r * ss], fill=fill)


def line(d, P, ss, pts, w, fill=255):
    q = [P(x, y) for x, y in pts]; d.line(q, fill=fill, width=max(1, int(w * ss)), joint='curve')


# =========================================================================================== boards
NB = 1024
by, bx = np.mgrid[0:NB, 0:NB].astype(float)
cx0 = cy0 = (NB - 1) / 2
rad = np.hypot(bx - cx0, by - cy0) / (NB / 2)
ang = np.arctan2(by - cy0, bx - cx0)
sheen = np.clip(1 - np.hypot((bx - NB * .28) / (NB * .6), (by - NB * .2) / (NB * .45)), 0, 1) ** 2


def cotton(shape, base, wrap=False):
    """plain-weave cotton: fine warp / weft threads and a little slub."""
    n0, n1 = shape
    yy, xx = np.mgrid[0:n0, 0:n1].astype(float)
    p = 3.2
    warp = np.sin(xx / p * math.pi) ** 2; weft = np.sin(yy / p * math.pi) ** 2
    over = (np.floor(xx / p) + np.floor(yy / p)) % 2
    thr = np.where(over > 0, warp, weft)
    slub = noise(shape, 0, 1, wrap, aniso=(0.6, 9)) * .5 + noise(shape, 0, 1, wrap, aniso=(9, 0.6)) * .5
    alb = base * (0.93 + 0.05 * thr[..., None] + 0.025 * slub[..., None])
    h = thr * .35 + slub * .08
    return alb, h


def ulu_motif(N, scale=1.0):
    """an eight-fold ʻulu (breadfruit) quilt appliqué: a central rosette, four big lobed breadfruit leaves on the axes,
    four fruits on the diagonals, joined by a ring (the classic snowflake-cut pattern)."""
    cv = Canvas(N, 2)
    c = (N - 1) / 2; R = N * .5 * scale

    def leaf(d, P, ss, a, r0, r1, w, lobes=3):
        # a lobed leaf along angle a from radius r0 to r1 (left / right lobes)
        ca, sa = math.cos(a), math.sin(a)
        pts_l, pts_r = [], []
        for k in range(0, 61):
            u = k / 60
            rr_ = r0 + (r1 - r0) * u
            lob = abs(math.sin(u * math.pi * (lobes + .5))) ** .7
            ww = w * (math.sin(u * math.pi) ** .55) * (.55 + .45 * lob)
            pts_l.append((c + ca * rr_ - sa * ww, c + sa * rr_ + ca * ww))
            pts_r.append((c + ca * rr_ + sa * ww, c + sa * rr_ - ca * ww))
        poly(d, P, pts_l + pts_r[::-1])

    def draw(d, P, ss):
        dot(d, P, ss, c, c, R * .16)
        for k in range(8):
            a = k * math.pi / 4 + math.pi / 8
            leaf(d, P, ss, a, R * .1, R * .34, R * .055, 1)          # rosette petals
        for k in range(4):
            a = k * math.pi / 2
            leaf(d, P, ss, a, R * .26, R * .86, R * .2, 3)           # big lobed ʻulu leaves
            leaf(d, P, ss, a, R * .78, R * .98, R * .05, 1)          # leaf tips
        for k in range(4):
            a = k * math.pi / 2 + math.pi / 4
            fx, fy = c + math.cos(a) * R * .56, c + math.sin(a) * R * .56
            dot(d, P, ss, fx, fy, R * .11)                            # fruit
            leaf(d, P, ss, a, R * .2, R * .46, R * .05, 1)            # stalk
            for s in (-1, 1):                                          # two small leaves by the fruit
                a2 = a + s * .55
                cx_, cy_ = c + math.cos(a2) * R * .62, c + math.sin(a2) * R * .62
                d.ellipse([P(cx_ - R * .07, cy_ - R * .07)[0], P(cx_ - R * .07, cy_ - R * .07)[1], P(cx_ + R * .07, cy_ + R * .07)[0], P(cx_ + R * .07, cy_ + R * .07)[1]], fill=255)
        # the ring that joins the motif (cut in one piece)
        r_ = R * .66; w_ = R * .025
        for k in range(360):
            a0, a1 = k / 360 * 2 * math.pi, (k + 1) / 360 * 2 * math.pi
            line(d, P, ss, [(c + math.cos(a0) * r_, c + math.sin(a0) * r_), (c + math.cos(a1) * r_, c + math.sin(a1) * r_)], w_ * 2)
    m = cv.mask(draw, .8)
    return m


def quilt_board():
    cream = C('#f2ead8')
    alb, hcl = cotton((NB, NB), cream)
    m = ulu_motif(NB, .98)
    teal = C('#0f6f6a')
    tealv = teal * (0.94 + 0.04 * noise((NB, NB), 0, 1, aniso=(0.7, 10))[..., None] + 0.03 * noise((NB, NB), 30, 1)[..., None])
    alb = mix(alb, tealv * (0.93 + 0.05 * hcl[..., None]), m)
    # echo quilting: running stitches every ~22 px parallel to the appliqué outline (inside and out), with the puffed cotton between
    inside = m > .5
    dout = distance_transform_edt(~inside); din = distance_transform_edt(inside)
    dist = np.where(inside, -din, dout)
    pitch = 22.0
    ph = (dist / pitch) % 1.0
    groove = np.exp(-((ph - .5) / .06) ** 2)                       # the stitched line (pulled in)
    puff = np.sin(ph * math.pi) ** .6                              # the batting puffs up between lines
    # stitch dashes along the groove (thread visible in short dashes)
    along = (np.arctan2(by - cy0, bx - cx0) * (np.abs(dist) + 60) / 6.0)
    dash = (np.sin(along) > -.2).astype(float)
    thread = groove * dash * .55
    near_edge = np.exp(-(np.abs(dist) / 2.2) ** 2)                 # the appliqué edge (turned under, a slight ridge)
    h = puff * 2.6 - groove * 1.6 + near_edge * 1.2 + hcl * .5 + m * .9
    alb = mix(alb, np.where(inside[..., None], C('#d7efe9'), C('#cfc4ad')), thread)
    # the outer border: a straight teal binding band 3 % in
    band = np.clip(1 - np.abs(np.maximum(np.abs(bx - cx0), np.abs(by - cy0)) - NB * .47) / 8, 0, 1)
    alb = mix(alb, tealv, band * .9)
    h = h + band * .8
    col = shade(gaussian_filter(h, 1.0), alb, gloss=14, spec=.05, amb=.68)
    col = col * (1 + .04 * sheen[..., None])
    save_rgb(col, 'bd-quilt.webp')


def bark_fibers(shape, wrap=False):
    """beaten wauke bark: long fibres, mostly along one direction, with the beater's watermark ribs."""
    n0, n1 = shape
    yy, xx = np.mgrid[0:n0, 0:n1].astype(float)
    f1 = noise(shape, 0, 1, wrap, aniso=(0.7, 16))
    f2 = noise(shape, 0, 1, wrap, aniso=(1.8, 40))
    blot = fbm(shape, [(40, .5), (12, .3)], wrap)
    ribs = np.sin(yy / 5.2 * math.pi) ** 8                      # the kua (anvil) / beater grooves
    return f1, f2, blot, ribs


def kapa_board():
    f1, f2, blot, ribs = bark_fibers((NB, NB))
    base = mix(C('#c99a62'), C('#e2bf8a'), .55 + .12 * f2 + .14 * blot)
    alb = base * (0.95 + 0.05 * f1[..., None])
    # ʻohe kāpala stamped design: wide bands of small triangles / chevrons / parallel lines, black and red-brown,
    # laid in a big square frame round the field and a lattice across the field (each print slightly uneven)
    cv = Canvas(NB, 2)
    blk = C('#1d1410'); red = C('#8a3a1c')

    def tri_row(d, P, ss, x0, y0, x1, y1, size, up=True):
        L_ = math.hypot(x1 - x0, y1 - y0); n = int(L_ // size)
        ux, uy = (x1 - x0) / L_, (y1 - y0) / L_; nx_, ny_ = -uy, ux
        for k in range(n):
            ax, ay = x0 + ux * k * size, y0 + uy * k * size
            bx_, by_ = ax + ux * size, ay + uy * size
            s = 1 if up else -1
            tx, ty = ax + ux * size / 2 + nx_ * size * .8 * s, ay + uy * size / 2 + ny_ * size * .8 * s
            poly(d, P, [(ax, ay), (bx_, by_), (tx, ty)])

    def bars(d, P, ss, x0, y0, x1, y1, w):
        line(d, P, ss, [(x0, y0), (x1, y1)], w)

    def draw_black(d, P, ss):
        m = NB * .06; e = NB - m
        for k, off in enumerate((0, 46)):
            a, b = m + off, e - off
            for (x0, y0, x1, y1) in ((a, a, b, a), (b, a, b, b), (b, b, a, b), (a, b, a, a)):
                if k == 0: tri_row(d, P, ss, x0, y0, x1, y1, 26, True)
                else: bars(d, P, ss, x0, y0, x1, y1, 5)
        # a lattice of fine double lines across the field
        for t in np.linspace(m + 120, e - 120, 4):
            bars(d, P, ss, m + 60, t - 5, e - 60, t - 5, 2.6); bars(d, P, ss, m + 60, t + 5, e - 60, t + 5, 2.6)
            bars(d, P, ss, t - 5, m + 60, t - 5, e - 60, 2.6); bars(d, P, ss, t + 5, m + 60, t + 5, e - 60, 2.6)

    def draw_red(d, P, ss):
        m = NB * .06; e = NB - m
        a, b = m + 26, e - 26
        for (x0, y0, x1, y1) in ((a, a, b, a), (b, a, b, b), (b, b, a, b), (a, b, a, a)):
            L_ = math.hypot(x1 - x0, y1 - y0); n = int(L_ // 18); ux, uy = (x1 - x0) / L_, (y1 - y0) / L_
            for k in range(0, n, 2): dot(d, P, ss, x0 + ux * k * 18, y0 + uy * k * 18, 4.2)
        # small red-brown diamonds where the lattice lines meet
        for t1 in np.linspace(m + 120, e - 120, 4):
            for t2 in np.linspace(m + 120, e - 120, 4):
                poly(d, P, [(t1, t2 - 14), (t1 + 14, t2), (t1, t2 + 14), (t1 - 14, t2)])
    mb = cv.mask(draw_black, .7); mr = cv.mask(draw_red, .7)
    # stamped ink: not solid (the fibres take it unevenly)
    ink = np.clip(.85 + .25 * noise((NB, NB), 1.2, 1) + .2 * f1, 0, 1)
    alb = mix(alb, blk, mb * ink * .92)
    alb = mix(alb, red, mr * ink * .88)
    h = f1 * .35 + f2 * .25 + ribs * .55 + blot * .2 - (mb + mr) * .15
    col = shade(gaussian_filter(h, .8), alb, gloss=10, spec=.04, amb=.66)
    save_rgb(col, 'bd-kapa.webp')


def weave(shape, strip, wrap=False, diag=False):
    """plain weave of flat leaf strips (lauhala): returns (height, albedo factor, which-strip id for colour variation)."""
    n0, n1 = shape
    yy, xx = np.mgrid[0:n0, 0:n1].astype(float)
    if diag: u, v = (xx + yy) / math.sqrt(2), (xx - yy) / math.sqrt(2)
    else: u, v = xx, yy
    iu, iv = np.floor(u / strip), np.floor(v / strip)
    fu, fv = u / strip - iu, v / strip - iv
    over = ((iu + iv) % 2) == 0                       # which strip is on top in this cell
    # each strip is a slightly domed leaf with a midrib and fine parallel veins along its length
    prof_u = np.sin(np.clip(fu, 0, 1) * math.pi) ** .35   # across a vertical strip
    prof_v = np.sin(np.clip(fv, 0, 1) * math.pi) ** .35
    # where a strip goes under, it dips at the cell ends
    dip_v = np.sin(fv * math.pi) ** .8; dip_u = np.sin(fu * math.pi) ** .8
    h_vert = prof_u * (0.6 + 0.4 * dip_v)             # strip running along v (vertical), id iu
    h_hor = prof_v * (0.6 + 0.4 * dip_u)
    h = np.where(over, h_vert + .55, h_hor + .55)
    h = h - np.where(over, np.exp(-((fv - 0) / .05) ** 2) + np.exp(-((fv - 1) / .05) ** 2), np.exp(-((fu - 0) / .05) ** 2) + np.exp(-((fu - 1) / .05) ** 2)) * .5
    sid = np.where(over, iu, iv + 1000)
    veins = np.where(over, np.sin(fu * strip * 1.4) , np.sin(fv * strip * 1.4))
    return h, sid, veins, over


def lauhala_board():
    h, sid, veins, over = weave((NB, NB), 64, diag=True)
    # each strip its own shade of gold (sun-dried pandanus): a few darker brown strips
    uniq = np.unique(sid)
    tone = {s: rng.normal(0, 1) for s in uniq}
    tv = np.vectorize(tone.get)(sid)
    a = C('#b88a45'); b = C('#e7c98d'); d_ = C('#8a5d2b')
    alb = mix(a, b, .55 + .18 * tv)
    alb = mix(alb, d_, np.clip(-tv - 1.2, 0, 1) * .8)
    fib = noise((NB, NB), 0, 1, aniso=(0.5, 12))
    alb = alb * (0.94 + 0.04 * veins[..., None] + 0.03 * fib[..., None])
    hh = h * 3.2 + veins * .12 + fib * .06
    # a darker plaited border band, 4 % in
    band = np.clip(1 - np.abs(np.maximum(np.abs(bx - cx0), np.abs(by - cy0)) - NB * .47) / 14, 0, 1)
    alb = mix(alb, alb * .62, band)
    col = shade(gaussian_filter(hh, .9), alb, gloss=26, spec=.16, amb=.6)
    col = col * (1 + .05 * sheen[..., None])
    save_rgb(col, 'bd-lauhala.webp')


def lava_flow(shape, wrap=False):
    """pāhoehoe: smooth lobes with ropy folds (curved ridges across the flow direction), glassy skin."""
    n0, n1 = shape
    yy, xx = np.mgrid[0:n0, 0:n1].astype(float)
    warp1 = fbm(shape, [(90, 1.0), (30, .5)], wrap) * 26
    warp2 = fbm(shape, [(90, 1.0), (30, .5)], wrap) * 26
    u = xx + warp1; v = yy + warp2
    # ropes: arcs bowed down-flow (the flow goes towards the lower right)
    s = (u * .7 + v * .72) + 18 * np.sin(( -u * .72 + v * .7) / 70)
    rope = np.sin(s / 7.5) * .5 + .5
    rope = rope ** 1.7
    lobes = fbm(shape, [(120, 1.0), (45, .5)], wrap)
    cracks = np.abs(fbm(shape, [(18, 1.0), (6, .4)], wrap))
    crack = np.exp(-(cracks / .07) ** 2)
    return rope, lobes, crack


def pahoehoe_board():
    rope, lobes, crack = lava_flow((NB, NB))
    base = mix(C('#3a3633'), C('#6b625a'), .45 + .2 * lobes + .15 * rope)
    # weathered rust and a faint iridescent glass skin on the tops
    rust = C('#7a4a2c')
    alb = mix(base, rust, np.clip(noise((NB, NB), 24, 1) - .9, 0, 1) * .45)
    alb = alb * (0.9 + 0.08 * noise((NB, NB), 1, 1)[..., None])
    h = lobes * 6 + rope * 2.4 - crack * 1.6 + noise((NB, NB), 1.2, .25)
    env = lambda n: np.clip(.62 - .5 * n[..., 1] - .3 * n[..., 0], 0, 1)
    col = shade(gaussian_filter(h, 1.0), alb, gloss=55, spec=.42, amb=.62, env=env)
    # the edge of the slab still glows (hot lava seeping from the cracks near the rim)
    edge = np.clip((np.maximum(np.abs(bx - cx0), np.abs(by - cy0)) - NB * .43) / (NB * .07), 0, 1)
    glow = crack * edge ** 1.5
    col = col + np.array([255, 110, 30]) * glow[..., None] * 1.15 + np.array([255, 70, 10]) * (gaussian_filter(glow, 6) * 1.6)[..., None]
    save_rgb(col, 'bd-pahoehoe.webp')


# =========================================================================================== frames (seamless tiles)
NF = 512


def frames():
    yy, xx = np.mgrid[0:NF, 0:NF].astype(float)
    # quilt: teal cotton with a white plumeria lei appliqué (five-petal flowers on a vine), echo stitches
    alb, hcl = cotton((NF, NF), C('#0d5f5b'), wrap=True)
    cv = Canvas(NF, 3, wrap=True)

    def plumeria(d, P, ss, x, y, r, rot):
        for k in range(5):
            a = rot + k * 2 * math.pi / 5
            pts = []
            for j in range(0, 25):
                u = j / 24; t = a + (u - .5) * 1.0
                rr_ = r * (.25 + .75 * math.sin(u * math.pi) ** .6)
                pts.append((x + math.cos(t + .25) * rr_, y + math.sin(t + .25) * rr_))
            poly(d, P, [(x, y)] + pts)

    def draw(d, P, ss):
        for (x, y, r, rot) in ((128, 128, 46, .2), (384, 384, 46, 1.1), (384, 128, 30, .7), (128, 384, 30, 1.6), (256, 256, 22, .4), (0, 256, 22, 2.2), (256, 0, 22, 1.4)):
            plumeria(d, P, ss, x, y, r, rot)
    def draw_c(d, P, ss):
        for (x, y, r) in ((128, 128, 46), (384, 384, 46), (384, 128, 30), (128, 384, 30), (256, 256, 22), (0, 256, 22), (256, 0, 22)):
            dot(d, P, ss, x, y, r * .22)
    m = cv.mask(draw, .7); mc = cv.mask(draw_c, .6)
    flower = mix(C('#fbf6ea'), C('#f7d77a'), np.clip(1 - np.hypot(((xx + 128) % 256) - 128, ((yy + 128) % 256) - 128) / 40, 0, 1) * .0)
    alb = mix(alb, C('#fbf5e6') * (0.94 + .05 * hcl[..., None]), m)
    alb = mix(alb, C('#f2c14e'), mc)
    inside = m > .5
    dist = np.where(inside, -distance_transform_edt(inside), distance_transform_edt(~inside))
    ph = (dist / 14.0) % 1.0
    h = np.sin(ph * math.pi) ** .6 * 1.6 - np.exp(-((ph - .5) / .07) ** 2) * 1.0 + m * .9 + hcl * .4
    save_rgb(shade(gaussian_filter(h, .8, mode='wrap'), alb, gloss=14, spec=.05, amb=.7, wrap=True), 'fr-quilt.webp')

    # kapa: darker smoked bark cloth with a dense black triangle band pattern
    f1, f2, blot, ribs = bark_fibers((NF, NF), True)
    alb = mix(C('#7a5232'), C('#a27447'), .5 + .15 * f2 + .15 * blot) * (0.95 + .05 * f1[..., None])
    cv = Canvas(NF, 2, wrap=True)
    def tri(d, P, ss):
        s = 32
        for r in range(0, NF // s):
            for k in range(0, NF // s):
                x, y = k * s, r * s
                if r % 2 == 0: poly(d, P, [(x, y + s), (x + s, y + s), (x + s / 2, y + 4)])
                else: line(d, P, ss, [(x, y + s / 2), (x + s, y + s / 2)], 3)
    m = cv.mask(tri, .6)
    ink = np.clip(.85 + .25 * noise((NF, NF), 1.2, 1, True) + .2 * f1, 0, 1)
    alb = mix(alb, C('#1a110c'), m * ink * .9)
    h = f1 * .35 + f2 * .2 + ribs * .5 + blot * .2
    save_rgb(shade(gaussian_filter(h, .8, mode='wrap'), alb, gloss=10, spec=.04, amb=.68, wrap=True), 'fr-kapa.webp')

    # lauhala: a tighter, darker weave (the mat's rolled edge)
    h, sid, veins, over = weave((NF, NF), 32, wrap=True)
    uniq = np.unique(sid); tone = {s: rng.normal(0, 1) for s in uniq}; tv = np.vectorize(tone.get)(sid)
    alb = mix(C('#7d5427'), C('#b9874a'), .5 + .2 * tv) * (0.94 + .05 * veins[..., None])
    save_rgb(shade(gaussian_filter(h * 3 + veins * .1, .8, mode='wrap'), alb, gloss=24, spec=.14, amb=.62, wrap=True), 'fr-lauhala.webp')

    # pāhoehoe: black glassy lava with glowing seams
    rope, lobes, crack = lava_flow((NF, NF), True)
    alb = mix(C('#141212'), C('#3a3431'), .4 + .2 * lobes + .2 * rope)
    h = lobes * 5 + rope * 2 - crack * 1.4
    env = lambda n: np.clip(.62 - .5 * n[..., 1] - .3 * n[..., 0], 0, 1)
    col = shade(gaussian_filter(h, 1.0, mode='wrap'), alb, gloss=70, spec=.5, amb=.6, env=env, wrap=True)
    glow = crack * np.clip(.4 + .6 * noise((NF, NF), 30, 1, True), 0, 1)
    col = col + np.array([255, 96, 24]) * glow[..., None] * .95 + np.array([255, 60, 8]) * (gaussian_filter(glow, 5, mode='wrap') * 1.2)[..., None]
    save_rgb(col, 'fr-pahoehoe.webp')


# =========================================================================================== pieces
NP = 256
py_, px_ = np.mgrid[0:NP, 0:NP].astype(float)
pc = (NP - 1) / 2; PR = NP / 2 - 1.5
rr = np.hypot(px_ - pc, py_ - pc) / PR


def save_pc(col, name, edge_dark=.0, alpha=None):
    col = np.clip(col, 0, 255)
    a = np.clip((1 - rr) * PR / 1.2, 0, 1) if alpha is None else alpha
    if edge_dark: col = col * (1 - edge_dark * np.clip((rr - .86) / .14, 0, 1) ** 2)[..., None]
    Image.fromarray(np.dstack([col, a[..., None] * 255]).astype(np.uint8), 'RGBA').save(os.path.join(OUT, name), quality=92, method=6); print(name)


def dome(k=1.0): return np.sqrt(np.clip(1 - rr ** 2, 0, 1)) * 40 * k


def coral_piece():
    # white coral: bleached, porous (polyp cups), slightly bumpy
    pores = np.zeros((NP, NP))
    for _ in range(420):
        x, y = rng.uniform(0, NP), rng.uniform(0, NP); r = rng.uniform(2.2, 4.6)
        pores += np.exp(-(((px_ - x) ** 2 + (py_ - y) ** 2) / (r * r))) * rng.uniform(.6, 1)
    pores = np.clip(pores, 0, 1.3)
    bump = fbm((NP, NP), [(10, .5), (3, .25)])
    alb = mix(C('#f6f1e6'), C('#e3d8c4'), .3 + .2 * bump + .35 * pores)
    h = dome(.9) + bump * 2.2 - pores * 3.6
    col = shade(gaussian_filter(h, .8), alb, gloss=12, spec=.06, amb=.6)
    save_pc(col, 'pc-coral-w.webp', .35)
    # black basalt: a water-smoothed lava pebble, matte with fine vesicles and grey speckle
    ves = np.zeros((NP, NP))
    for _ in range(160):
        x, y = rng.uniform(0, NP), rng.uniform(0, NP); r = rng.uniform(1.0, 2.4)
        ves += np.exp(-(((px_ - x) ** 2 + (py_ - y) ** 2) / (r * r)))
    spk = np.clip(noise((NP, NP), .7, 1) - 1.6, 0, 1)
    alb = mix(C('#1b1a1a'), C('#3b3836'), .35 + .2 * noise((NP, NP), 18, 1)) * (1 - .25 * np.clip(ves, 0, 1))[..., None]
    alb = mix(alb, C('#8d8780'), spk * .6)
    h = dome(1.0) + noise((NP, NP), 4, .6) - ves * 1.5
    col = shade(gaussian_filter(h, .8), alb, gloss=22, spec=.18, amb=.6)
    save_pc(col, 'pc-coral-b.webp', .25)


def kukui_piece():
    # kukui nut shells as in a lei: wrinkled, furrowed, polished
    wr = fbm((NP, NP), [(5, .8), (2, .3)])
    furrow = np.abs(np.sin((px_ * .7 + py_ * .5 + 14 * noise((NP, NP), 20, 1)) / 9))
    h = dome(.85) + wr * 2.4 - (1 - furrow) ** 3 * 2.8
    # black: polished deep brown-black, glossy
    alb = mix(C('#140c08'), C('#3a2416'), .35 + .25 * noise((NP, NP), 14, 1) + .15 * furrow)
    col = shade(gaussian_filter(h, .7), alb, gloss=70, spec=.65, amb=.55)
    save_pc(col, 'pc-kukui-b.webp', .2)
    # white: the pale unpolished kukui (natural shell), satin
    alb = mix(C('#d9c7a6'), C('#f2e7d0'), .45 + .2 * noise((NP, NP), 14, 1) + .15 * furrow)
    col = shade(gaussian_filter(h, .7), alb, gloss=30, spec=.18, amb=.62)
    save_pc(col, 'pc-kukui-w.webp', .25)


def pearl_piece():
    h = dome(1.0) + noise((NP, NP), 6, .25)
    gy, gx = np.gradient(gaussian_filter(h, 1))
    n = np.dstack([-gx, -gy, np.ones_like(h)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    t = (n[..., 0] * .6 + n[..., 1] * .9 + 1) / 2
    irid = np.dstack([np.sin(t * 6 + 0) * .5 + .5, np.sin(t * 6 + 2.1) * .5 + .5, np.sin(t * 6 + 4.2) * .5 + .5])
    # white pearl: cream with rose / green orient
    alb = mix(C('#f6efe6'), C('#fffaf2'), .5) * (0.92 + .1 * irid)
    col = shade(gaussian_filter(h, .8), alb, gloss=90, spec=.7, amb=.62)
    save_pc(col, 'pc-pearl-w.webp', .25)
    # black pearl (Pacific black-lip oyster): charcoal with peacock green / aubergine overtones
    alb = mix(C('#2a2b30'), C('#3d3a46'), .5) * (0.7 + .55 * irid)
    alb = alb * np.array([.95, 1.05, 1.0])
    col = shade(gaussian_filter(h, .8), alb, gloss=90, spec=.75, amb=.55)
    save_pc(col, 'pc-pearl-b.webp', .25)


def koa_piece():
    # turned koa discs: curly koa with chatoyant ripple figure; dark (heartwood, oiled) and light (blond koa)
    xr = px_ - pc; yr = py_ - pc
    grain = np.sin((yr + 6 * noise((NP, NP), 30, 1)) / 3.2) * .5 + .5
    curl = np.sin(xr / 7 + 3 * noise((NP, NP), 25, 1)) * .5 + .5
    h = (1 - rr ** 6) * 14 - np.clip((rr - .9) / .1, 0, 1) ** 2 * 8 + grain * .5
    gl = lambda a, b: mix(C(a), C(b), .35 + .35 * grain + .2 * curl * (.6 + .4 * noise((NP, NP), 8, 1)))
    alb = gl('#3a1d0e', '#6e3a1b')
    col = shade(gaussian_filter(h, .7), alb, gloss=60, spec=.4, amb=.58) * (0.9 + .2 * curl)[..., None]
    save_pc(col, 'pc-koa-b.webp', .25)
    alb = gl('#c08a50', '#e9c28a')
    col = shade(gaussian_filter(h, .7), alb, gloss=60, spec=.35, amb=.6) * (0.92 + .16 * curl)[..., None]
    save_pc(col, 'pc-koa-w.webp', .25)


if __name__ == '__main__':
    import sys
    want = sys.argv[1:] or ['boards', 'frames', 'pieces']
    if 'boards' in want: quilt_board(); kapa_board(); lauhala_board(); pahoehoe_board()
    if 'frames' in want: frames()
    if 'pieces' in want: coral_piece(); kukui_piece(); pearl_piece(); koa_piece()

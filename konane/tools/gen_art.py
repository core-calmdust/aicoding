#!/usr/bin/env python3
"""Rendered art for Kōnane (Hawaiʻi), top view lit from the upper left.
  boards  img/bd-<key>.webp  : the playing surface (1024 px, no grid — the puka (holes) are drawn by the page for 6×6 / 8×8 / 10×10)
  frames  img/fr-<key>.webp  : a seamless 512 px tile for the frame around the board
  pieces  img/pc-<set>-<b|w>.webp : 256 px stone faces (b = Black, the first player; w = White)
  quilt     kapa kuiki (Hawaiian quilt): a teal ʻulu (breadfruit) appliqué on unbleached cotton, echo quilting round it
  ocean     an airbrushed ocean-art dream: a sunset sky over the horizon, sunbeams and caustics under the water, dolphins, a honu
  kona      Kona gallery art: a watercolour of hibiscus, plumeria, monstera and coffee cherries on warm paper
  stone     a primitive papamū: weathered grey basalt, pecked and worn by hand
  koa       a koa-wood papamū, oiled (the cups drilled, as on the boards made today)
  mono / sunset / midnight   modern: warm grey matte · a sunset gradient · navy with a gold niho manō band
  pieces: stones (smooth black basalt / white coral pebbles), pearls, koa wood, glass, matte
  (the 3D portal model has its own textures in tools/gen_art_more.py: 3d-*.webp)
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
    grain = np.sin((yr + 6 * noise((NP, NP), 30, 1)) / 4.5) * .5 + .5
    curl = np.sin(xr / 7 + 3 * noise((NP, NP), 25, 1)) * .5 + .5
    h = (1 - rr ** 6) * 14 - np.clip((rr - .9) / .1, 0, 1) ** 2 * 8 + grain * .15
    gl = lambda a, b: mix(C(a), C(b), .4 + .22 * grain + .06 * curl)
    alb = gl('#3a1d0e', '#6e3a1b')
    col = shade(gaussian_filter(h, .7), alb, gloss=60, spec=.4, amb=.58) * (0.97 + .05 * curl)[..., None]
    save_pc(col, 'pc-koa-b.webp', .25)
    alb = gl('#c08a50', '#e9c28a')
    col = shade(gaussian_filter(h, .7), alb, gloss=60, spec=.35, amb=.6) * (0.97 + .04 * curl)[..., None]
    save_pc(col, 'pc-koa-w.webp', .25)


exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gen_art_more.py')).read())


if __name__ == '__main__':
    import sys
    want = sys.argv[1:] or ['boards', 'frames', 'pieces']
    if 'boards' in want: quilt_board(); ocean_board(); kona_board(); stone_board(); koa_board(); mono_board(); sunset_board(); midnight_board()
    if 'frames' in want: frames(); frames_more()
    if 'pieces' in want: stone_piece(); pearl_piece(); koa_piece(); glass_piece(); matte_piece()

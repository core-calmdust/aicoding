#!/usr/bin/env python3
"""Rendered piece faces for Alquerque (top view, lit from the upper left; the thickness / drop shadow stays in CSS).
  brass : p1 polished brass coin (engraved khatam star in an interlaced strap, beaded and reeded rim)
          p2 lapis lazuli in a gold bezel (gold-inlaid star, pyrite flecks and calcite veins)
  felt  : (shown as 施釉陶器) p1 ivory glaze painted in cobalt, p2 cobalt glaze painted in white — crackle, pooling, gloss
python3 tools/gen_pieces.py → img/pc-<set>-<1|2>.webp"""
import os, math, numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter

N = 320            # output size
SS = 3             # supersample for the masks
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img')
yy, xx = np.mgrid[0:N, 0:N].astype(np.float64)
cx = cy = (N - 1) / 2
R = N / 2 - 1.5
rr = np.hypot(xx - cx, yy - cy) / R          # 0 centre .. 1 edge
th = np.arctan2(yy - cy, xx - cx)
rng = np.random.default_rng(7)


def mask(draw_fn, blur=0.6):
    m = Image.new('L', (N * SS, N * SS), 0); d = ImageDraw.Draw(m)
    draw_fn(d, lambda v: v * SS)
    a = np.asarray(m.resize((N, N), Image.LANCZOS)).astype(np.float64) / 255
    return gaussian_filter(a, blur) if blur else a


def star_pts(c, Ro, Ri, n, rot=0):
    return [(c + (Ro if k % 2 == 0 else Ri) * math.cos(rot + math.pi * k / n), c + (Ro if k % 2 == 0 else Ri) * math.sin(rot + math.pi * k / n)) for k in range(2 * n)]


def khatam(d, s, c, Rs, w, fill=255):
    """two interlaced squares (an eight-pointed khatam) drawn as a strap of width w, plus inner octagon ring."""
    for rot in (0, math.pi / 4):
        pts = [(c + Rs * math.cos(rot + math.pi / 4 + k * math.pi / 2), c + Rs * math.sin(rot + math.pi / 4 + k * math.pi / 2)) for k in range(4)]
        d.line([(s(x), s(y)) for x, y in pts + pts[:1]], fill=fill, width=int(s(w)), joint='curve')


def noise(s, amp=1.0):
    x = gaussian_filter(rng.standard_normal((N, N)), s); return x / (x.std() + 1e-9) * amp


def shade(h, albedo, metal=0.0, gloss=40, spec=0.6, env=None, amb=0.35):
    gy, gx = np.gradient(h)
    nx, ny, nz = -gx, -gy, np.ones_like(h)
    L = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2); nx, ny, nz = nx / L, ny / L, nz / L
    lx, ly, lz = -0.5, -0.62, 0.6; ll = math.sqrt(lx * lx + ly * ly + lz * lz); lx, ly, lz = lx / ll, ly / ll, lz / ll
    diff = np.clip(nx * lx + ny * ly + nz * lz, 0, 1)
    hx, hy, hz = lx, ly, lz + 1; hl = math.sqrt(hx * hx + hy * hy + hz * hz); hx, hy, hz = hx / hl, hy / hl, hz / hl
    sp = np.clip(nx * hx + ny * hy + nz * hz, 0, 1) ** gloss * spec
    # a soft environment reflection (window from the upper left, dark floor below) for metal and glaze
    ref = np.clip(0.55 - 0.45 * ny - 0.25 * nx, 0, 1) if env is None else env(nx, ny, nz)
    col = albedo * (amb + (1 - amb) * diff[..., None])
    col = col * (1 - metal) + albedo * ref[..., None] * metal * 1.25
    col = col + sp[..., None] * (albedo * metal + (1 - metal)) * 255
    return col


def save(col, name, edge_dark=0.0):
    col = np.clip(col, 0, 255)
    a = np.clip((1 - rr) * R / 1.2, 0, 1)     # anti-aliased disc
    if edge_dark: col = col * (1 - edge_dark * np.clip((rr - .9) / .1, 0, 1) ** 2)[..., None]
    im = np.dstack([col, a[..., None] * 255]).astype(np.uint8)
    Image.fromarray(im, 'RGBA').save(os.path.join(OUT, name), quality=92, method=6)
    print(name)


def rim_profile():
    # a raised rim (bevel out at the very edge), a flat field, slight dome
    h = 0.0 * rr
    h += np.clip((rr - .8) / .06, 0, 1) * 7 - np.clip((rr - .93) / .07, 0, 1) * 9   # rim ridge and outer bevel
    h += (1 - rr ** 2) * 6                                                            # dome
    return h


# ------------------------------------------------------------------------------------------- brass coin
def brass():
    """simple: a raised plain rim and one bold eight-pointed star in relief, brushed brass."""
    c = N / 2
    st = mask(lambda d, s: d.polygon([(s(x), s(y)) for x, y in star_pts(c, N * .3, N * .19, 8, math.pi / 8)], fill=255), 1.2)
    st_in = mask(lambda d, s: d.polygon([(s(x), s(y)) for x, y in star_pts(c, N * .2, N * .12, 8, math.pi / 8)], fill=255), 1.0)
    boss = mask(lambda d, s: d.ellipse([s(c - N * .055), s(c - N * .055), s(c + N * .055), s(c + N * .055)], fill=255), 1.0)
    h = rim_profile() + st * 5 + boss * 2 + noise(1.0, .04) + noise(20, .3)
    albedo = np.zeros((N, N, 3)); albedo[:] = (188, 140, 68)
    fld = (1 - st) * (rr < .76)
    albedo = albedo * (1 - fld[..., None] * .35) + np.array([120, 84, 40]) * fld[..., None] * .35
    save(shade(gaussian_filter(h, 1.0), albedo, metal=.08, gloss=16, spec=.12, amb=.5), 'pc-brass-1.webp')


def lapis():
    """simple: lapis with a gold rim and one gold eight-pointed star."""
    c = N / 2
    st = mask(lambda d, s: d.polygon([(s(x), s(y)) for x, y in star_pts(c, N * .27, N * .17, 8, math.pi / 8)], fill=255), .9)
    st_in = mask(lambda d, s: d.polygon([(s(x), s(y)) for x, y in star_pts(c, N * .17, N * .1, 8, math.pi / 8)], fill=255), .8)
    bezel = np.clip((rr - .84) / .02, 0, 1)
    gold = np.clip(st - st_in * .0 + bezel, 0, 1)
    cloud = noise(16, 1) * .7 + noise(5, 1) * .3
    base = np.array([40, 60, 146]) * (1 + .12 * cloud[..., None])
    fleck = gaussian_filter((gaussian_filter(rng.standard_normal((N, N)), .6) > 3.0).astype(float), .5)
    stone = base * (1 - fleck[..., None]) + np.array([220, 186, 110]) * fleck[..., None]
    h = (1 - rr ** 2) * 10 + st * 1.4 + bezel * 2.5 - np.clip((rr - .95) / .05, 0, 1) * 6
    ag = np.zeros((N, N, 3)); ag[:] = (220, 172, 82)
    gs = shade(gaussian_filter(h, .9), ag * .95, metal=.08, gloss=16, spec=.12, amb=.5)
    ss = shade(gaussian_filter(h, .9), stone, metal=0, gloss=8, spec=.05, amb=.55)
    gm = gold[..., None]
    save(ss * (1 - gm) + gs * gm, 'pc-brass-2.webp')


def ceramic(light):
    """simple: a glazed disc painted with one bold eight-pointed star and a rim band."""
    c = N / 2
    glaze = np.array((232, 222, 200)) if light else np.array((32, 58, 128))
    paint = np.array((40, 68, 146)) if light else np.array((232, 224, 204))
    st = mask(lambda d, s: d.polygon([(s(x), s(y)) for x, y in star_pts(c, N * .3, N * .18, 8, math.pi / 8)], fill=255), 1.2)
    st_in = mask(lambda d, s: d.polygon([(s(x), s(y)) for x, y in star_pts(c, N * .17, N * .1, 8, math.pi / 8)], fill=255), 1.0)
    band = np.clip((rr - .76) / .02, 0, 1) * np.clip((.84 - rr) / .02, 0, 1)
    ap = np.clip(st - st_in + band, 0, 1) * np.clip(.9 + noise(4, .06), .7, 1)
    albedo = glaze * (1 + noise(24, .03))[..., None]
    albedo = albedo * (1 - ap[..., None]) + paint * ap[..., None]
    thin = np.clip((rr - .93) / .07, 0, 1) ** 1.5 * .5
    albedo = albedo * (1 - thin[..., None]) + np.array((150, 96, 60)) * thin[..., None]
    h = (1 - rr ** 2.2) * 16 - np.clip((rr - .9) / .1, 0, 1) ** 2 * 6 + noise(8, .1)
    env = lambda nx, ny, nz: np.clip(.62 - .5 * ny - .2 * nx, 0, 1)
    col = shade(gaussian_filter(h, .8), albedo, metal=0, gloss=8, spec=.06, amb=.55, env=env)
    win = np.clip(1 - ((xx - cx + R * .34) ** 2 / (R * .22) ** 2 + (yy - cy + R * .4) ** 2 / (R * .12) ** 2), 0, 1)
    save(col, f'pc-felt-{1 if light else 2}.webp', edge_dark=.2)


os.makedirs(OUT, exist_ok=True)
brass(); lapis(); ceramic(True); ceramic(False)

def woodpc(light):
    """historical: a birch disc (light) / walnut-stained disc (dark), laser-engraved rosette / eight-petal knot, matte oil."""
    c = N / 2
    warp = gaussian_filter(rng.standard_normal((N, N)), 30); warp /= warp.std()
    g = np.sin(xx / 2.6 + warp * 1.4); fig = noise(20, 1)
    t = np.clip(.45 + .12 * g + .2 * fig + noise(.8, .05), 0, 1)
    b0, b1 = ((206, 166, 112), (160, 118, 72)) if light else ((116, 76, 44), (70, 44, 24))
    alb = np.array(b0, float) * (1 - t[..., None]) + np.array(b1, float) * t[..., None]
    def emb(d, s):
        d.ellipse([s(c - N * .37), s(c - N * .37), s(c + N * .37), s(c + N * .37)], outline=255, width=int(s(N * .018)))
        d.ellipse([s(c - N * .33), s(c - N * .33), s(c + N * .33), s(c + N * .33)], outline=255, width=int(s(N * .008)))
        n = 5 if light else 8
        for k in range(n):   # petals (rose for the light, knot for the dark)
            a = k * 2 * math.pi / n - math.pi / 2
            px, py = c + N * .14 * math.cos(a), c + N * .14 * math.sin(a)
            r = N * (.11 if light else .085)
            d.ellipse([s(px - r), s(py - r), s(px + r), s(py + r)], outline=255, width=int(s(N * .016)))
        d.ellipse([s(c - N * .05), s(c - N * .05), s(c + N * .05), s(c + N * .05)], fill=255)
        if light:
            for k in range(5):
                a = k * 2 * math.pi / 5 - math.pi / 2 + math.pi / 5
                d.polygon([(s(c + N * .27 * math.cos(a)), s(c + N * .27 * math.sin(a))), (s(c + N * .2 * math.cos(a - .18)), s(c + N * .2 * math.sin(a - .18))), (s(c + N * .2 * math.cos(a + .18)), s(c + N * .2 * math.sin(a + .18)))], fill=255)
    m = mask(emb, .6)
    halo = gaussian_filter(m, 2.5)
    alb = alb * (1 - .25 * np.clip(halo * 1.5, 0, 1))[..., None]
    alb = alb * (1 - .8 * m[..., None]) + np.array((40, 24, 12.)) * .8 * m[..., None]
    h = (1 - rr ** 6) * 6 - m * 1.2 - np.clip((rr - .92) / .08, 0, 1) * 4
    col = shade(gaussian_filter(h, .8), alb, metal=0, gloss=8, spec=.05, amb=.58)
    save(col, f'pc-wood-{1 if light else 2}.webp', edge_dark=.35)


def mattepc(light):
    """modern: plain white / black matte-painted wooden discs (a little brush texture and a soft bevel)."""
    alb = np.zeros((N, N, 3)); alb[:] = (236, 234, 228) if light else (30, 30, 32)
    alb *= (1 + noise(.8, .008 if light else .04) + noise(12, .01))[..., None]
    h = (1 - rr ** 8) * 7 - np.clip((rr - .9) / .1, 0, 1) * 3
    col = shade(gaussian_filter(h, 1.2), alb, metal=0, gloss=10, spec=.06 if light else .1, amb=.72 if light else .62)
    save(col, f'pc-matte-{1 if light else 2}.webp', edge_dark=.25 if light else .1)


woodpc(True); woodpc(False); mattepc(True); mattepc(False)

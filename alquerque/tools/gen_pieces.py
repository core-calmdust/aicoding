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
    c = N / 2
    strap = mask(lambda d, s: khatam(d, s, c, N * .27, N * .05), .5)
    strap_in = mask(lambda d, s: khatam(d, s, c, N * .27, N * .022), .4)
    ring = mask(lambda d, s: (d.ellipse([s(c - N * .37), s(c - N * .37), s(c + N * .37), s(c + N * .37)], outline=255, width=int(s(N * .012))),
                              d.ellipse([s(c - N * .345), s(c - N * .345), s(c + N * .345), s(c + N * .345)], outline=255, width=int(s(N * .006)))), .4)
    beads = mask(lambda d, s: [d.ellipse([s(c + N * .395 * math.cos(a) - N * .013), s(c + N * .395 * math.sin(a) - N * .013), s(c + N * .395 * math.cos(a) + N * .013), s(c + N * .395 * math.sin(a) + N * .013)], fill=255) for a in np.linspace(0, 2 * math.pi, 49)[:-1]], .4)
    centre = mask(lambda d, s: (d.polygon([(s(x), s(y)) for x, y in star_pts(c, N * .1, N * .045, 8, math.pi / 8)], fill=255)), .4)
    boss = mask(lambda d, s: d.ellipse([s(c - N * .03), s(c - N * .03), s(c + N * .03), s(c + N * .03)], fill=255), .5)
    # small engraved petals between the star points
    petals = mask(lambda d, s: [d.polygon([(s(c + N * r_ * math.cos(a + o)), s(c + N * r_ * math.sin(a + o))) for r_, o in ((.17, 0), (.25, -.12), (.31, 0), (.25, .12))], fill=255) for a in np.arange(8) * math.pi / 4 + math.pi / 8], .4)
    # field: a fine ring-matted (punched) ground inside the star
    punch = (np.sin(xx * 1.9) * np.sin(yy * 1.9) > .55).astype(float)
    inner = np.clip((.36 - rr * .5 * 2) / .02, 0, 1)
    h = rim_profile()
    h += strap * 3.2 - strap_in * 1.0 + ring * 2.2 + beads * 3 + centre * 2.5 + boss * 2 + petals * 1.6
    ground = (1 - np.clip(strap + ring + beads + centre + petals, 0, 1)) * (rr < .36)
    h -= ground * punch * .7
    reed = (rr > .955) * (np.sin(th * 90) * .8)
    h += reed
    h += noise(1.2, .12) + noise(18, .5)
    albedo = np.zeros((N, N, 3)); albedo[:] = (212, 160, 78)
    patina = np.clip(noise(10, 1) * .5 + .2, 0, 1) * ground[...]
    albedo = albedo * (1 - .35 * patina[..., None]) + np.array([96, 70, 30]) * .35 * patina[..., None]
    rec = np.clip(ground * .7 + (rr < .36) * .1, 0, 1)
    albedo = albedo * (1 - .3 * rec[..., None])
    col = shade(gaussian_filter(h, .7), albedo, metal=.75, gloss=60, spec=.85)
    col *= (1 + .05 * noise(.8))[..., None]
    save(col, 'pc-brass-1.webp')


# ------------------------------------------------------------------------------------------- lapis
def lapis():
    c = N / 2
    star = mask(lambda d, s: khatam(d, s, c, N * .25, N * .028), .4)
    centre = mask(lambda d, s: d.polygon([(s(x), s(y)) for x, y in star_pts(c, N * .085, N * .035, 8, math.pi / 8)], fill=255), .4)
    dots = mask(lambda d, s: [d.ellipse([s(c + N * .3 * math.cos(a) - N * .014), s(c + N * .3 * math.sin(a) - N * .014), s(c + N * .3 * math.cos(a) + N * .014), s(c + N * .3 * math.sin(a) + N * .014)], fill=255) for a in np.arange(8) * math.pi / 4 + math.pi / 8], .4)
    bezel = np.clip((rr - .84) / .02, 0, 1)
    bezel_beads = mask(lambda d, s: [d.ellipse([s(c + N * .44 * math.cos(a) - N * .012), s(c + N * .44 * math.sin(a) - N * .012), s(c + N * .44 * math.cos(a) + N * .012), s(c + N * .44 * math.sin(a) + N * .012)], fill=255) for a in np.linspace(0, 2 * math.pi, 41)[:-1]], .4)
    gold = np.clip(star + centre + dots + bezel, 0, 1)
    # stone: deep ultramarine with cloudy variation, white calcite veins and pyrite flecks
    cloud = noise(14, 1) * .6 + noise(5, 1) * .3 + noise(1.5, 1) * .1
    base = np.array([28, 46, 132]) * (1 + .16 * cloud[..., None]) + np.array([30, 20, 40]) * np.clip(noise(30, 1), -1, 1)[..., None] * .15
    vein = np.abs(gaussian_filter(rng.standard_normal((N, N)), 9)); vein = np.clip(1 - vein / (vein.mean() * .25), 0, 1) ** 3
    base = base * (1 - .3 * vein[..., None]) + np.array([170, 180, 210]) * .3 * vein[..., None]
    fleck = (gaussian_filter(rng.standard_normal((N, N)), .6) > 2.6).astype(float)
    fleck = gaussian_filter(fleck, .5)
    albedo_stone = base * (1 - fleck[..., None]) + np.array([240, 200, 110]) * fleck[..., None]
    albedo_gold = np.zeros((N, N, 3)); albedo_gold[:] = (230, 182, 86)
    h = (1 - rr ** 2) * 10 + gold * 1.2 + bezel * 2.5 + bezel_beads * 3 - np.clip((rr - .95) / .05, 0, 1) * 6 + noise(1, .05)
    h += np.where(rr > .955, np.sin(th * 80) * .6, 0)
    gs = shade(gaussian_filter(h, .6), albedo_gold, metal=.8, gloss=60, spec=.8)
    ss = shade(gaussian_filter(h, .8), albedo_stone, metal=.0, gloss=120, spec=.9, amb=.42)
    gm = np.clip(gold + bezel_beads, 0, 1)[..., None]
    save(ss * (1 - gm) + gs * gm, 'pc-brass-2.webp')


# ------------------------------------------------------------------------------------------- glazed ceramic
def ceramic(light):
    c = N / 2
    glaze = np.array((236, 226, 204)) if light else np.array((30, 58, 132))
    paint = np.array((36, 66, 150)) if light else np.array((236, 230, 214))
    accent = np.array((44, 120, 112)) if light else np.array((214, 168, 70))
    # painted pattern: a rosette of eight almond petals, a star in the centre, a ring of dots and a band at the rim
    petal = mask(lambda d, s: [d.polygon([(s(c + N * r_ * math.cos(a + o)), s(c + N * r_ * math.sin(a + o))) for r_, o in ((.07, 0), (.17, -.2), (.29, 0), (.17, .2))], fill=255) for a in np.arange(8) * math.pi / 4], 1.0)
    petal_in = mask(lambda d, s: [d.polygon([(s(c + N * r_ * math.cos(a + o)), s(c + N * r_ * math.sin(a + o))) for r_, o in ((.11, 0), (.17, -.1), (.24, 0), (.17, .1))], fill=255) for a in np.arange(8) * math.pi / 4], .9)
    cstar = mask(lambda d, s: d.polygon([(s(x), s(y)) for x, y in star_pts(c, N * .075, N * .035, 8, math.pi / 8)], fill=255), .8)
    dots = mask(lambda d, s: [d.ellipse([s(c + N * .3 * math.cos(a) - N * .016), s(c + N * .3 * math.sin(a) - N * .016), s(c + N * .3 * math.cos(a) + N * .016), s(c + N * .3 * math.sin(a) + N * .016)], fill=255) for a in np.arange(8) * math.pi / 4 + math.pi / 8], .8)
    band = np.clip((rr - .76) / .015, 0, 1) * np.clip((.86 - rr) / .015, 0, 1)
    wave = np.clip(1 - np.abs(rr - (.81 + .02 * np.sin(th * 16))) / .012, 0, 1)
    a_paint = np.clip(petal - petal_in + cstar + dots + band * (1 - wave), 0, 1)
    a_acc = np.clip(petal_in * .9, 0, 1)
    # hand-painted: uneven pigment density
    dens = np.clip(.82 + noise(3, .1) + noise(.8, .05), .55, 1)
    albedo = glaze * (1 + noise(20, .04))[..., None]
    albedo = albedo * (1 - (a_paint * dens)[..., None]) + paint * (a_paint * dens)[..., None]
    albedo = albedo * (1 - (a_acc * dens)[..., None]) + accent * (a_acc * dens)[..., None]
    # glaze pools thinner at the rim (the clay shows through a little)
    clay = np.array((150, 96, 60))
    thin = np.clip((rr - .93) / .07, 0, 1) ** 1.5 * .55
    albedo = albedo * (1 - thin[..., None]) + clay * thin[..., None]
    # crackle (craquelure) in the glaze
    v = gaussian_filter(rng.standard_normal((N, N)), 4.5); crk = np.clip(1 - np.abs(v) / (np.abs(v).mean() * .12), 0, 1) ** 2
    albedo = albedo * (1 - .18 * crk[..., None])
    h = (1 - rr ** 2.2) * 16 - np.clip((rr - .9) / .1, 0, 1) ** 2 * 6 + a_paint * .25 + noise(6, .15) + noise(1.2, .03)
    env = lambda nx, ny, nz: np.clip(.62 - .5 * ny - .2 * nx, 0, 1)
    col = shade(gaussian_filter(h, .6), albedo, metal=.0, gloss=90, spec=1.0, amb=.45, env=env)
    # a broad window reflection in the glaze
    win = np.clip(1 - ((xx - cx + R * .34) ** 2 / (R * .22) ** 2 + (yy - cy + R * .4) ** 2 / (R * .12) ** 2), 0, 1)
    col += (gaussian_filter(win, 3) * 70)[..., None]
    save(col, f'pc-felt-{1 if light else 2}.webp', edge_dark=.25)


os.makedirs(OUT, exist_ok=True)
brass(); lapis(); ceramic(True); ceramic(False)

#!/usr/bin/env python3
"""Rendered art for Ludus latrunculorum (Rome), top view lit from the upper left.
  boards  img/bd-<key>.webp : the playing surface (1024 px, no grid — the page draws the incised lines)
  frames  img/fr-<key>.webp : a seamless 512 px tile for the frame round the board
  pieces  img/pc-<set>-<b|w>.webp   : 256 px counter faces (b = Black, the first player; w = White)
          img/pc-<set>-<b|w>x.webp  : the same counter turned over (a blocked counter, "incitus", lies face down)
  marble      a worn slab of white marble (boards were cut into paving and seats all over the empire)
  travertine  the travertine steps of a basilica
  tile        a fired roof tile (tegula) with the tiler's finger marks
  mosaic      a floor of cream tesserae
  wood        an oiled walnut gaming table
  porphyry    imperial red-purple porphyry
  slate / ivory   plain modern boards (dark / light)
  counters: glass domes, coloured glass (blue / amber), turned bone and horn, river pebbles
python3 latrunculi/tools/gen_art.py [boards] [frames] [pieces]"""
import os, sys, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(117)
L = np.array([-0.5, -0.62, 0.6]); L = L / np.linalg.norm(L)
H = L + np.array([0, 0, 1.0]); H = H / np.linalg.norm(H)


def C(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float)


def noise(shape, s, amp=1.0, wrap=False):
    x = gaussian_filter(rng.standard_normal(shape), s, mode='wrap' if wrap else 'reflect')
    return x / (x.std() + 1e-9) * amp


def fbm(shape, scales, wrap=False):
    t = 0
    for s, a in scales: t = t + noise(shape, s, a, wrap)
    return t


def shade(h, albedo, gloss=40, spec=0.5, amb=0.45, wrap=False):
    if wrap:
        gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) / 2; gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) / 2
    else:
        gy, gx = np.gradient(h)
    n = np.dstack([-gx, -gy, np.ones_like(h)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    diff = np.clip(n @ L, 0, 1) / L[2]
    sp = np.clip(n @ H, 0, 1) ** gloss * spec
    return albedo * (amb + (1 - amb) * diff[..., None]) + sp[..., None] * 255


def mix(a, b, t):
    t = np.clip(t, 0, 1)
    if np.ndim(t) == 2: t = t[..., None]
    return a * (1 - t) + b * t


def save(img, name, q=88):
    a = np.clip(img, 0, 255).astype(np.uint8)
    Image.fromarray(a, 'RGBA' if a.shape[2] == 4 else 'RGB').save(os.path.join(OUT, name), 'WEBP', quality=q, method=6)
    print(name, os.path.getsize(os.path.join(OUT, name)) // 1024, 'KB')


def warp(img, s, amp, wrap=False):
    h, w = img.shape[:2]
    dy, dx = noise((h, w), s, amp, wrap), noise((h, w), s, amp, wrap)
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    return map_coordinates(img, [yy + dy, xx + dx], order=1, mode='wrap' if wrap else 'reflect')


def veins(shape, wrap, s=90, sharp=26, n=3):
    v = np.zeros(shape)
    for k in range(n):
        f = fbm(shape, [(s, 1), (s / 3, .35), (s / 9, .12)], wrap)
        v = np.maximum(v, np.exp(-np.abs(f) * sharp) * (1 - k * 0.25))
    return v


# ---------------------------------------------------------------- surfaces: (albedo, height, gloss, spec)
def marble(shape, wrap=False, base='#ebe6dc', vein='#8f8a86', warm='#d9cdb8', worn=True):
    v = veins(shape, wrap); cloud = fbm(shape, [(140, 1), (40, .4)], wrap)
    alb = mix(C(base), C(warm), cloud * .25 + .3); alb = mix(alb, C(vein), v * .6 + veins(shape, wrap, 40, 40, 2) * .22)
    h = noise(shape, 1.2, .07, wrap) + noise(shape, 12, .4, wrap)
    if worn:
        pits = np.clip(noise(shape, 2.2, 1, wrap) - 2.75, 0, None); h -= pits * 3; alb = alb * (1 - np.clip(pits, 0, 1)[..., None] * .35)
        scr = np.clip(np.abs(warp(noise(shape, 0.8, 1, wrap), 60, 30, wrap)) - 2.9, 0, None); h -= gaussian_filter(scr, .6) * 2
    return alb, h, 60, .22


def travertine(shape, wrap=False):
    yy = np.mgrid[0:shape[0], 0:shape[1]][0].astype(float)
    band = np.sin((yy + fbm(shape, [(120, 60), (30, 12)], wrap)) / shape[0] * np.pi * 2 * 9)
    alb = mix(C('#d9c8a8'), C('#bfa67c'), band * .3 + .4 + noise(shape, 30, .15, wrap)); alb = mix(alb, C('#efe4cc'), np.clip(noise(shape, 60, .5, wrap), 0, 1) * .5)
    x = rng.standard_normal(shape); x = gaussian_filter(x, (1.6, 5), mode='wrap' if wrap else 'reflect'); x /= x.std()
    pores = np.clip(x - 1.9, 0, None)
    h = noise(shape, 10, .5, wrap) + noise(shape, 1.5, .2, wrap) - pores * 5
    alb = alb * (1 - np.clip(pores * 1.4, 0, 1)[..., None] * .55)
    return alb, h, 30, .1


def tile(shape, wrap=False, base='#c46e48', dark='#9c4a2c'):
    alb = mix(C(base), C(dark), fbm(shape, [(160, .5), (30, .25), (6, .12)], wrap) + .35)
    grit = np.clip(noise(shape, 1.0, 1, wrap) - 1.6, 0, None)
    alb = mix(alb, C('#e7c2a2'), np.clip(noise(shape, 2.5, 1, wrap) - 2.1, 0, 1)); alb = alb * (1 - np.clip(grit, 0, 1)[..., None] * .3)
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]].astype(float)
    h = noise(shape, 1.3, .5, wrap) + noise(shape, 20, 1.2, wrap) - grit * 2
    if not wrap:   # the tiler's signature: finger strokes in an arc
        r = np.hypot(xx - shape[1] * .5, yy - shape[0] * 1.25) + noise(shape, 60, 6)
        for k in range(4):
            g = np.exp(-((r - shape[0] * (.56 + k * .022)) / 5.0) ** 2) * np.clip(1.15 - np.abs(xx - shape[1] * .5) / (shape[1] * .34), 0, 1)
            h -= g * 2.4; alb = alb * (1 - g[..., None] * .1)
    return alb, h, 16, .05


def mosaic(shape, wrap=False, cols=('#e6dfcd', '#d6cdb6', '#efe9da'), n=40, grout='#8a8272'):
    hgt, wid = shape; u = wid / n
    yy, xx = np.mgrid[0:hgt, 0:wid].astype(float)
    if not wrap:
        xx = xx + noise(shape, 50, 2.2); yy = yy + noise(shape, 50, 2.2)
    cx, cy = np.floor(xx / u).astype(int) % n, np.floor(yy / u).astype(int) % n
    fx, fy = xx / u - np.floor(xx / u), yy / u - np.floor(yy / u)
    tone = rng.random((n, n)); tilt = rng.standard_normal((2, n, n)) * .55
    pal = np.array([C(c) for c in cols]); idx = rng.integers(0, len(cols), (n, n))
    alb = pal[idx[cy, cx]] * (0.9 + 0.16 * tone[cy, cx])[..., None]
    edge = np.minimum(np.minimum(fx, 1 - fx), np.minimum(fy, 1 - fy))
    g = np.clip((0.09 - edge) / 0.06, 0, 1)
    alb = mix(alb, C(grout), g)
    h = (tilt[0][cy, cx] * (fx - .5) + tilt[1][cy, cx] * (fy - .5)) * u * .25 - g * 2.2 + noise(shape, 1.2, .15, wrap)
    return alb, h, 40, .16


def wood(shape, wrap=False, a='#8d5c34', b='#5c371c'):
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]].astype(float)
    x = rng.standard_normal(shape); grain = gaussian_filter(x, (40, 1.2), mode='wrap' if wrap else 'reflect'); grain /= grain.std()
    ring = np.sin((xx + fbm(shape, [(200, 50), (60, 10)], wrap) + grain * 5) / shape[1] * np.pi * 2 * 14)
    alb = mix(C(a), C(b), ring * .28 + .45 + grain * .12)
    x2 = rng.standard_normal(shape); pore = np.clip(gaussian_filter(x2, (9, .7), mode='wrap' if wrap else 'reflect') / .12 - 1.7, 0, 1)
    alb = alb * (1 - pore[..., None] * .35)
    return alb, grain * .5 - pore * 1.5 + noise(shape, 30, .6, wrap), 50, .28


def porphyry(shape, wrap=False, base='#6b2740', dark='#4a182c'):
    alb = mix(C(base), C(dark), fbm(shape, [(90, .5), (20, .3)], wrap) + .4)
    for s, th, col, a in ((2.6, 1.9, '#e9cfd3', .85), (1.4, 2.1, '#f4e6e2', .9), (4.5, 2.0, '#b98a96', .6)):
        sp = np.clip((noise(shape, s, 1, wrap) - th) * 4, 0, 1); alb = mix(alb, C(col), sp * a)
    return alb, noise(shape, 14, .4, wrap) + noise(shape, 1.1, .12, wrap), 90, .42


def slate(shape, wrap=False, base='#3b444e', dark='#2b323a'):
    x = rng.standard_normal(shape); cl = gaussian_filter(x, (3, 60), mode='wrap' if wrap else 'reflect'); cl /= cl.std()
    alb = mix(C(base), C(dark), cl * .22 + .4 + noise(shape, 80, .2, wrap))
    return alb, cl * .9 + noise(shape, 1.2, .25, wrap), 30, .12


def ivory(shape, wrap=False, base='#f2ebda', warm='#e4d7bb'):
    x = rng.standard_normal(shape); gr = gaussian_filter(x, (60, 2), mode='wrap' if wrap else 'reflect'); gr /= gr.std()
    alb = mix(C(base), C(warm), gr * .22 + .35 + noise(shape, 120, .25, wrap))
    return alb, gr * .25 + noise(shape, 20, .3, wrap), 70, .2


def ebony(shape, wrap=False): return wood(shape, wrap, '#3a3230', '#191514')
def rosso(shape, wrap=False): return marble(shape, wrap, '#7a3528', '#e9d9c8', '#5a2219', worn=False)
def nero(shape, wrap=False): return marble(shape, wrap, '#2a2826', '#c9a86a', '#1b1a19', worn=False)
def brick(shape, wrap=False): return tile(shape, wrap, '#7c3d27', '#52241a')
def darkmosaic(shape, wrap=False): return mosaic(shape, wrap, ('#2c2a28', '#383532', '#222120'), 20, '#6e675a')
def walnut(shape, wrap=False): return wood(shape, wrap, '#4f2f19', '#2c180c')
def darkslate(shape, wrap=False): return slate(shape, wrap, '#232a31', '#161b20')
def tufa(shape, wrap=False):
    alb, h, g, s = travertine(shape, wrap); return alb * np.array([.62, .56, .5]), h, g, s


BOARDS = {'marble': marble, 'travertine': travertine, 'tile': tile, 'mosaic': mosaic, 'wood': wood, 'porphyry': porphyry, 'slate': slate, 'ivory': ivory}
FRAMES = {'marble': rosso, 'travertine': tufa, 'tile': brick, 'mosaic': darkmosaic, 'wood': walnut, 'porphyry': nero, 'slate': darkslate, 'ivory': ebony}


def boards():
    for k, f in BOARDS.items():
        alb, h, gloss, spec = f((1024, 1024))
        img = shade(h, alb, gloss, spec)
        yy, xx = np.mgrid[0:1024, 0:1024] / 1023.0
        img = img * (1.04 - 0.1 * (xx * .5 + yy * .5))[..., None]      # the light falls off toward the lower right
        save(img, f'bd-{k}.webp', 86)


def frames():
    for k, f in FRAMES.items():
        alb, h, gloss, spec = f((512, 512), True)
        save(shade(h, alb, gloss, spec, wrap=True), f'fr-{k}.webp', 84)


# ---------------------------------------------------------------- counters
def disc(S, outline=None):
    yy, xx = (np.mgrid[0:S, 0:S] + .5) / S * 2 - 1
    r = np.hypot(xx, yy); th = np.arctan2(yy, xx)
    R = .9 if outline is None else outline(th)
    return xx, yy, r / R, th


def alpha_of(rn, S): return np.clip((1 - rn) * S * .45, 0, 1)


def piece(col, kind, down, S=256, seed=0):
    r_ = np.random.default_rng(seed)
    if kind == 'stone':
        ph = r_.random(4) * 6.28
        outline = lambda th: .86 + .035 * np.sin(2 * th + ph[0]) + .025 * np.sin(3 * th + ph[1]) + .012 * np.sin(5 * th + ph[2])
    else: outline = None
    xx, yy, rn, th = disc(S, outline)
    a = alpha_of(rn, S); inside = np.clip(rn, 0, 1)
    base = C(col)
    if kind in ('glass', 'gem'):
        if not down:
            h = np.sqrt(np.clip(1 - inside ** 2, 0, 1)) * S * .2                       # a low dome
            alb = np.ones((S, S, 3)) * base
            img = shade(h, alb, 70, .0, .5)
            glow = np.clip(1 - np.hypot(xx - .3, yy - .34) / .7, 0, 1) ** 2            # light gathered on the far side
            img = img + glow[..., None] * (base * .5 + 40)
            hl = np.exp(-(((xx + .32) / .2) ** 2 + ((yy + .36) / .13) ** 2)); img = img + hl[..., None] * 230
            hl2 = np.exp(-(((xx + .08) / .5) ** 2 + ((yy + .5) / .08) ** 2)) * .25; img = img + hl2[..., None] * 255
            img = img * (1 - np.clip((inside - .8) / .2, 0, 1) * .35)[..., None]
        else:
            h = -np.clip(inside - .86, 0, 1) * S * .25 + noise((S, S), 6, .12)
            sw = np.sin(np.hypot(xx - .05, yy + .04) * 16 + noise((S, S), 20, 1.2)) * .5 + .5
            alb = mix(np.ones((S, S, 3)) * (base * .74 + 24), np.ones((S, S, 3)) * (base * .62 + 20), sw * .35)
            img = shade(h, alb, 20, .08, .6)
    elif kind == 'bone':
        if not down:
            h = (1 - np.clip(inside, 0, 1) ** 6) * S * .05
            for rr, w, d in ((.72, .035, 1.6), (.5, .03, 1.3), (.2, .05, 1.8)):
                h -= np.exp(-((inside - rr) / w) ** 2) * d * S / 256 * 2.2
            h -= np.exp(-(inside / .06) ** 2) * 3
        else:
            h = (1 - np.clip(inside, 0, 1) ** 10) * S * .03 - np.exp(-(inside / .05) ** 2) * 2.5
        gr = gaussian_filter(r_.standard_normal((S, S)), (14, 1.2)); gr /= gr.std()
        alb = np.ones((S, S, 3)) * base * (1 + gr[..., None] * .05) * (.86 if down else 1)
        img = shade(h + gr * .15, alb, 50, .22, .5)
    else:   # stone
        h = np.sqrt(np.clip(1 - inside ** 2.4, 0, 1)) * S * (.1 if down else .16) + noise((S, S), 5, .5)
        sp = np.clip(noise((S, S), 1.6, 1) - 1.5, 0, 1)
        alb = mix(np.ones((S, S, 3)) * base, np.ones((S, S, 3)) * (base * .7 + 50), sp * .5) * (1 + noise((S, S), 25, .05)[..., None])
        if down:   # a cross scratched into the underside
            d1 = np.abs(xx - yy) / 1.414; d2 = np.abs(xx + yy) / 1.414
            cr = np.maximum(np.exp(-(d1 / .035) ** 2), np.exp(-(d2 / .035) ** 2)) * (inside < .62)
            h -= cr * 3; alb = mix(alb, np.ones((S, S, 3)) * (C('#d8cdb8') if base.mean() < 128 else C('#4a433c')), cr * .8)
        img = shade(h, alb, 25, .12, .5)
    return np.dstack([np.clip(img, 0, 255), a * 255])


PIECES = {
    'glass': ('#1a1f2b', '#eef1ea'),
    'gem': ('#1d4fae', '#e9b63a'),
    'bone': ('#4b3524', '#efe3c6'),
    'stone': ('#343130', '#e6e0d3'),
}


def pieces():
    for k, (b, w) in PIECES.items():
        for side, col, sd in (('b', b, 1), ('w', w, 2)):
            save(piece(col, k, False, seed=sd), f'pc-{k}-{side}.webp', 92)
            save(piece(col, k, True, seed=sd), f'pc-{k}-{side}x.webp', 92)


if __name__ == '__main__':
    what = sys.argv[1:] or ['boards', 'frames', 'pieces']
    if 'boards' in what: boards()
    if 'frames' in what: frames()
    if 'pieces' in what: pieces()

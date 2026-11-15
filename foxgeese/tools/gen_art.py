#!/usr/bin/env python3
"""Rendered art for Fox and Geese, top view lit from the upper left (the helpers are latrunculi/tools/gen_art.py's).
  boards  img/bd-<key>.webp : the playing surface (1024 px, no lines — the page draws the lines and the 33 points)
  frames  img/fr-<key>.webp : a seamless 512 px tile for the frame round the board
  pieces  img/pc-<set>-f.webp / -g.webp : 256 px faces of the fox and of a goose
  oak     an old oak pub board          slate   a school slate (chalk lines)
  linen   an embroidered linen sampler  meadow  a mown meadow
  night / paper   plain modern boards (dark blue with brass lines / off-white paper)
  pieces: turned and painted wooden heads (wood), glass marbles (marble), cast pewter (pewter), flat painted counters (paint)
python3 foxgeese/tools/gen_art.py [boards] [frames] [pieces]"""
import os, sys, numpy as np
from scipy.ndimage import gaussian_filter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'latrunculi', 'tools'))
import gen_art as ga
ga.OUT = os.path.join(HERE, '..', 'img'); os.makedirs(ga.OUT, exist_ok=True)
ga.rng = np.random.default_rng(1483)
C, noise, fbm, shade, mix, save = ga.C, ga.noise, ga.fbm, ga.shade, ga.mix, ga.save


def oak(shape, wrap=False): return ga.wood(shape, wrap, '#b98a52', '#8a6234')
def darkoak(shape, wrap=False): return ga.wood(shape, wrap, '#5a3a1e', '#33200f')
def slate(shape, wrap=False):
    alb, h, g, s = ga.slate(shape, wrap, '#3d464e', '#2f373e')
    dust = np.clip(fbm(shape, [(90, .5), (20, .3)], wrap) + .2, 0, 1)      # chalk dust rubbed into the slate
    return mix(alb, C('#8f989e'), dust * .22), h, g, s
def pine(shape, wrap=False): return ga.wood(shape, wrap, '#c9a56a', '#a07a44')
def linen(shape, wrap=False, a='#e8dfca', b='#d3c6a8'):
    hgt, wid = shape; yy, xx = np.mgrid[0:hgt, 0:wid].astype(float)
    n = 256.0 if not wrap else 128.0
    wx = np.sin(xx / wid * np.pi * 2 * n + noise(shape, 30, .6, wrap)); wy = np.sin(yy / hgt * np.pi * 2 * n + noise(shape, 30, .6, wrap))
    weave = (wx * wy) * .5 + .5
    alb = mix(C(a), C(b), weave * .5 + noise(shape, 60, .15, wrap) + .2)
    return alb, weave * .9 + noise(shape, 2, .15, wrap), 12, .03
def darklinen(shape, wrap=False): return linen(shape, wrap, '#7a6844', '#5c4c30')
def meadow(shape, wrap=False, a='#7aa650', b='#4f7f34'):
    x = ga.rng.standard_normal(shape); blades = gaussian_filter(x, (5, .8), mode='wrap' if wrap else 'reflect'); blades /= blades.std()
    stripes = np.sin(np.mgrid[0:shape[0], 0:shape[1]][1] / shape[1] * np.pi * 2 * (7 if not wrap else 2)) * .5 + .5   # mowing stripes
    alb = mix(C(a), C(b), blades * .22 + .4 + stripes * .16 + noise(shape, 80, .12, wrap))
    fl = np.clip((noise(shape, 2.2, 1, wrap) - 2.6) * 4, 0, 1)             # daisies
    alb = mix(alb, C('#f7f3df'), fl * .9)
    return alb, blades * .8, 10, .02
def hedge(shape, wrap=False): return meadow(shape, wrap, '#3f6a2a', '#274a1a')
def night(shape, wrap=False):
    alb = mix(C('#1c2540'), C('#121a30'), fbm(shape, [(120, .5), (30, .2)], wrap) + .4)
    return alb, noise(shape, 1.2, .1, wrap), 60, .25
def ink(shape, wrap=False):
    alb = mix(C('#0f1526'), C('#0a0f1c'), fbm(shape, [(80, .5)], wrap) + .4); return alb, noise(shape, 1.2, .1, wrap), 60, .25
def paper(shape, wrap=False):
    fib = gaussian_filter(ga.rng.standard_normal(shape), (1.2, 6), mode='wrap' if wrap else 'reflect'); fib /= fib.std()
    alb = mix(C('#f3eee2'), C('#e6dfd0'), fib * .2 + .4 + noise(shape, 90, .15, wrap)); return alb, fib * .25, 10, .02
def charcoal(shape, wrap=False):
    alb = mix(C('#3b3937'), C('#2c2a29'), fbm(shape, [(60, .5), (8, .2)], wrap) + .4); return alb, noise(shape, 1.5, .2, wrap), 20, .08


BOARDS = {'oak': oak, 'slate': slate, 'linen': linen, 'meadow': meadow, 'night': night, 'paper': paper}
FRAMES = {'oak': darkoak, 'slate': pine, 'linen': darklinen, 'meadow': hedge, 'night': ink, 'paper': charcoal}


def boards():
    for k, f in BOARDS.items():
        alb, h, gloss, spec = f((1024, 1024))
        img = shade(h, alb, gloss, spec)
        yy, xx = np.mgrid[0:1024, 0:1024] / 1023.0
        save(img * (1.04 - 0.1 * (xx * .5 + yy * .5))[..., None], f'bd-{k}.webp', 86)


def frames():
    for k, f in FRAMES.items():
        alb, h, gloss, spec = f((512, 512), True)
        save(shade(h, alb, gloss, spec, wrap=True), f'fr-{k}.webp', 84)


# ---------------------------------------------------------------- pieces
# a head seen from above: a dome, plus (fox) two pointed ears at the top and a pale muzzle, (goose) an orange bill
def head(S, base, kind, fox, seed):
    r_ = np.random.default_rng(seed)
    yy, xx = (np.mgrid[0:S, 0:S] + .5) / S * 2 - 1
    R = .78 if fox else .8
    cy = .1 if fox else .04
    rn = np.hypot(xx, yy - cy) / R
    body = np.clip((1 - rn) * S * .45, 0, 1)
    h = np.sqrt(np.clip(1 - np.clip(rn, 0, 1) ** 2, 0, 1)) * S * (.2 if kind != 'paint' else .05)
    alb = np.ones((S, S, 3)) * C(base)
    a = body.copy()
    plain = kind in ('marble',)
    if fox and not plain:
        for sx in (-1, 1):   # the ears: triangles standing up from the head's rim
            ex, ey = sx * .5, cy - .62
            u = (xx - ex) * sx; v = yy - ey
            tri = np.clip(((v + .4) * .62 - np.abs(u)) * 14, 0, 1) * (v < .36) * (v > -.4)   # pointed at the top
            a = np.maximum(a, tri); h = np.maximum(h, tri * S * .09)
            inner = np.clip(((v + .26) * .4 - np.abs(u)) * 16, 0, 1) * (v < .3) * (v > -.26)
            alb = mix(alb, np.ones((S, S, 3)) * C('#2a1a12'), inner * (tri > .5) * .75 * (rn > .92))
        muz = np.exp(-(((xx) / .26) ** 2 + ((yy - cy - .42) / .3) ** 2))                 # the pale muzzle and a dark nose
        alb = mix(alb, np.ones((S, S, 3)) * C('#f6ead2'), np.clip(muz * 1.3, 0, 1) * (rn < 1) * (.9 if kind != 'pewter' else .25))
        nose = np.exp(-(((xx) / .07) ** 2 + ((yy - cy - .66) / .06) ** 2)); alb = mix(alb, np.ones((S, S, 3)) * C('#1a1210'), np.clip(nose * 1.5, 0, 1))
        for sx in (-1, 1):
            eye = np.exp(-(((xx - sx * .3) / .06) ** 2 + ((yy - cy - .05) / .06) ** 2)); alb = mix(alb, np.ones((S, S, 3)) * C('#1a1210'), np.clip(eye * 1.5, 0, 1))
    if not fox and not plain:
        u = np.abs(xx); v = yy - (cy - .74)                                                # the bill, pointing up the board
        bill = np.clip(((v + .2) * .75 - u) * 14, 0, 1) * (v < .24) * (v > -.2)
        a = np.maximum(a, bill); h = np.maximum(h, bill * S * .06)
        alb = mix(alb, np.ones((S, S, 3)) * C('#e9902a' if kind != 'pewter' else '#8a8f94'), bill * (rn > .9))
        for sx in (-1, 1):
            eye = np.exp(-(((xx - sx * .3) / .055) ** 2 + ((yy - cy + .28) / .055) ** 2)); alb = mix(alb, np.ones((S, S, 3)) * C('#1a1a1a'), np.clip(eye * 1.5, 0, 1))
    if kind == 'wood':
        gr = gaussian_filter(r_.standard_normal((S, S)), (10, 1.2)); gr /= gr.std()
        alb = alb * (1 + gr[..., None] * .05); img = shade(h + gr * .2, alb, 40, .18, .5)
    elif kind == 'marble':
        sw = np.sin((xx * 3 + yy * 2) * 3 + noise((S, S), 30, 2.2)) * .5 + .5
        alb = mix(alb, np.ones((S, S, 3)) * (C('#ffd9a0') if fox else C('#cfe2ee')), sw * .45)
        img = shade(h, alb, 80, .0, .5)
        glow = np.clip(1 - np.hypot(xx - .3, yy - cy - .34) / .7, 0, 1) ** 2; img = img + glow[..., None] * (C(base) * .4 + 40)
        hl = np.exp(-(((xx + .3) / .17) ** 2 + ((yy - cy + .34) / .11) ** 2)); img = img + hl[..., None] * 235
    elif kind == 'pewter':
        img = shade(h + noise((S, S), 4, .5), alb, 30, .35, .42)
        env = np.clip(.6 - .5 * yy - .3 * xx, 0, 1); img = img * (.7 + .5 * env[..., None])
    else:
        img = shade(h, alb, 20, .06, .62)
        rim = np.clip((rn - .86) * 12, 0, 1) * (rn < 1); img = img * (1 - rim[..., None] * .35)
    return np.dstack([np.clip(img, 0, 255), a * 255])


PIECES = {'wood': ('#b4502a', '#f1e8d4'), 'marble': ('#c8501e', '#eef2f4'), 'pewter': ('#a8603a', '#c4c8cc'), 'paint': ('#d9622b', '#ffffff')}


def pieces():
    for k, (f, g) in PIECES.items():
        save(head(256, f, k, True, 1), f'pc-{k}-f.webp', 92)
        save(head(256, g, k, False, 2), f'pc-{k}-g.webp', 92)


if __name__ == '__main__':
    what = sys.argv[1:] or ['boards', 'frames', 'pieces']
    if 'boards' in what: boards()
    if 'frames' in what: frames()
    if 'pieces' in what: pieces()

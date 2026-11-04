#!/usr/bin/env python3
"""Rendered boards and pieces for the 2D Hnefatafl page (historical Viking designs).
  carved     the 3D viking oak board (tools/render2d.html renders atlas/table3d.js from above; RENDERS = that folder):
             img/bd-carved-<n>.webp (playing surface), img/fr-carved.webp (rune-carved frame ring, for border-image)
  ballinderry  yew board after the 10th-century Ballinderry gaming board: peg holes, ring-chain (Borre) border
  runestone    grey granite with carved grooves, a red-painted rune serpent band (Jelling style)
  longship     tarred oak planks with iron rivets, painted round shields on the corner squares and the throne
  pieces: turned (the 3D walnut / bone / crowned king, from above), birka (glass gaming pieces as found at Birka)
python3 tafl/tools/gen_viking.py [RENDERS]"""
import os, sys, math, numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, map_coordinates

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'img'); os.makedirs(OUT, exist_ok=True)
RENDERS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'render')
rng = np.random.default_rng(23)
L = np.array([-0.5, -0.62, 0.6]); L /= np.linalg.norm(L)
H = L + np.array([0, 0, 1.0]); H /= np.linalg.norm(H)
SPECIAL = {11: [0, 10, 60, 110, 120], 9: [0, 8, 40, 72, 80], 7: [0, 6, 24, 42, 48]}


def C(h): h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float)
def mix(a, b, t): t = np.clip(t, 0, 1); t = t[..., None] if np.ndim(t) == 2 else t; return a * (1 - t) + b * t
def noise(shape, s, amp=1., wrap=False, aniso=None):
    x = gaussian_filter(rng.standard_normal(shape), aniso if aniso else s, mode='wrap' if wrap else 'reflect'); return x / (x.std() + 1e-9) * amp
def shade(h, alb, gloss=30, spec=.2, amb=.6):
    gy, gx = np.gradient(h); n = np.dstack([-gx, -gy, np.ones_like(h)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    d = np.clip(n @ L, 0, 1); sp = np.clip(n @ H, 0, 1) ** gloss * spec
    return alb * (amb + (1 - amb) * d[..., None]) + sp[..., None] * 255
def save(col, name, q=88):
    Image.fromarray(np.clip(col, 0, 255).astype(np.uint8)).save(os.path.join(OUT, name), quality=q, method=6); print(name)
def mask(N, fn, ss=3, blur=.6, wrap=False):
    m = Image.new('L', (N * ss, N * ss), 0); d = ImageDraw.Draw(m)
    offs = [(0, 0)] if not wrap else [(a, b) for a in (-N, 0, N) for b in (-N, 0, N)]
    for ox, oy in offs: fn(d, lambda x, y, ox=ox, oy=oy: ((x + ox) * ss, (y + oy) * ss), ss)
    a = np.asarray(m.resize((N, N), Image.LANCZOS)).astype(float) / 255
    return gaussian_filter(a, blur, mode='wrap' if wrap else 'reflect') if blur else a

# Younger Futhark runes as strokes in a box (x −.3….3, y 0…1, y down)
RUNES = {
 'f': [[(0, 0), (0, 1)], [(0, .32), (.3, .08)], [(0, .56), (.3, .32)]], 'u': [[(-.2, 1), (-.2, 0), (.22, .35), (.22, 1)]],
 'th': [[(0, 0), (0, 1)], [(0, .3), (.3, .5), (0, .7)]], 'o': [[(0, 0), (0, 1)], [(-.25, .22), (.25, .48)]],
 'r': [[(0, 1), (0, 0), (.3, .22), (0, .45), (.3, 1)]], 'k': [[(0, 0), (0, 1)], [(0, .38), (.3, .1)]],
 'h': [[(0, 0), (0, 1)], [(-.28, .3), (.28, .62)], [(.28, .3), (-.28, .62)]], 'n': [[(0, 0), (0, 1)], [(-.24, .38), (.24, .62)]],
 'i': [[(0, 0), (0, 1)]], 'a': [[(0, 0), (0, 1)], [(-.24, .62), (.24, .38)]], 's': [[(.12, 0), (.12, .45), (-.12, .55), (-.12, 1)]],
 't': [[(0, 0), (0, 1)], [(0, 0), (-.28, .3)], [(0, 0), (.28, .3)]], 'b': [[(0, 0), (0, 1)], [(0, 0), (.3, .25), (0, .5), (.3, .75), (0, 1)]],
 'm': [[(0, 0), (0, 1)], [(0, .38), (-.28, .08)], [(0, .38), (.28, .08)]], 'l': [[(0, 0), (0, 1)], [(0, 0), (.3, .3)]],
 'R': [[(0, 0), (0, 1)], [(0, .62), (-.28, .92)], [(0, .62), (.28, .92)]],
}
TEXT = ['h', 'n', 'o', 'f', 't', 'a', 'f', 'l', None, 'k', 'u', 'n', 'u', 'n', 'k', 'R', None, 'r', 'u', 'n', 'a', 'R', None]   # hnefatafl · konungR · runaR


def rune_line(d, P, ss, x, y, h, ch, w):
    for st in RUNES[ch]:
        d.line([P(x + a * h, y + b * h) for a, b in st], fill=255, width=max(1, int(w * ss)), joint='curve')


def grid_px(n, W): return W / n


# ------------------------------------------------------------------------------------------------ carved (from 3D)
def carved():
    for n in (7, 9, 11):
        im = Image.open(os.path.join(RENDERS, f'bd{n}.png')).convert('RGB'); Wd = im.width
        S, FW = 8.6, 9.7; a = round((FW - S) / 2 / FW * Wd); b = Wd - a
        im.crop((a, a, b, b)).resize((1200, 1200), Image.LANCZOS).save(os.path.join(OUT, f'bd-carved-{n}.webp'), quality=88, method=6); print(f'bd-carved-{n}.webp')


def carved_frame():
    """the 3D frame's rune band for the 2D frame (border-image, slice 64): dark walnut, a cream rune line on every side,
    sun-cross knots in the corners — the runes fill the band so they stay readable when the band is thin"""
    W, B = 640, 64
    alb = wood_grain(W, '#5a3a22', '#2a180c', 2.4)
    h = noise((W, W), 1.5, .2)
    def top(d, P, ss):
        k = 0
        for i in range(16):
            ch = TEXT[i % len(TEXT)]
            x = B + 14 + i * (W - 2 * B - 28) / 15.0
            if ch: rune_line(d, P, ss, x, B * .2, B * .6, ch, 3.2)
    mt = mask(W, top, blur=.6)
    m = np.maximum.reduce([np.rot90(mt, k) for k in range(4)])
    def rules(d, P, ss):
        for o in (6, B - 6):
            d.rectangle([*P(o, o), *P(W - o, W - o)], outline=255, width=int(3 * ss))
        for cx, cy in ((B / 2, B / 2), (W - B / 2, B / 2), (B / 2, W - B / 2), (W - B / 2, W - B / 2)):
            r = B * .3
            d.ellipse([*P(cx - r, cy - r), *P(cx + r, cy + r)], outline=255, width=int(4 * ss)); d.ellipse([*P(cx - r * .42, cy - r * .42), *P(cx + r * .42, cy + r * .42)], outline=255, width=int(4 * ss))
            for k in range(4):
                a = k * math.pi / 2 + math.pi / 4
                d.line([P(cx + math.cos(a) * r * .42, cy + math.sin(a) * r * .42), P(cx + math.cos(a) * r, cy + math.sin(a) * r)], fill=255, width=int(4 * ss))
    mr = mask(W, rules, blur=.6)
    ink = np.clip(m + mr, 0, 1)
    alb = mix(alb, C('#e8c480'), ink * .85); h = h - ink * 1.5
    save(shade(gaussian_filter(h, .8), alb, 30, .15, .66), 'fr-carved.webp')


def unseam(img):
    """the lathe texture's seam (straight down from the centre): blend a narrow wedge from both sides"""
    a = np.asarray(img).astype(float); N = a.shape[0]; c = (N - 1) / 2
    yy, xx = np.mgrid[0:N, 0:N]; th = np.arctan2(yy - c, xx - c); r = np.hypot(yy - c, xx - c)
    seam = math.pi / 2; d = np.angle(np.exp(1j * (th - seam))); w = math.radians(9)
    m = np.abs(d) < w
    t = (d[m] + w) / (2 * w)
    out = a.copy()
    for side, sgn in ((0, -1), (1, 1)):
        pass
    # sample both edges of the wedge and interpolate across it
    ang0, ang1 = seam - w, seam + w
    rr = r[m]
    x0, y0 = c + rr * np.cos(ang0), c + rr * np.sin(ang0); x1, y1 = c + rr * np.cos(ang1), c + rr * np.sin(ang1)
    for ch in range(a.shape[2]):
        v0 = map_coordinates(a[..., ch], [y0, x0], order=1); v1 = map_coordinates(a[..., ch], [y1, x1], order=1)
        out[..., ch][m] = v0 * (1 - t) + v1 * t
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')


def turned():
    for k, nm in ((1, 'a'), (2, 'd'), (3, 'k')):
        im = Image.open(os.path.join(RENDERS, f'p{k}.png')).convert('RGBA')
        a = np.asarray(im)[..., 3]; ys, xs = np.where(a > 10); r = max(im.width / 2 - xs.min(), xs.max() - im.width / 2, im.height / 2 - ys.min(), ys.max() - im.height / 2) + 2
        c = im.width / 2; im = im.crop((int(c - r), int(c - r), int(c + r), int(c + r))).resize((256, 256), Image.LANCZOS)
        unseam(im).save(os.path.join(OUT, f'pc-turned-{nm}.webp'), quality=90, method=6); print(f'pc-turned-{nm}.webp')


# ------------------------------------------------------------------------------------------------ wood helpers
def wood_grain(N, base0, base1, freq=2.6, warp=26, aniso=(1.5, 60), wrap=False):
    yy, xx = np.mgrid[0:N, 0:N].astype(float)
    w = noise((N, N), warp, 1, wrap) * 14
    rings = np.sin((yy + w) / freq + noise((N, N), 0, 1, wrap, aniso=aniso) * 1.2) * .5 + .5
    fib = noise((N, N), 0, 1, wrap, aniso=(.6, 30))
    return mix(C(base0), C(base1), .45 + .22 * rings + .12 * fib + .15 * noise((N, N), 60, 1, wrap))


def board_common(n, W, alb, h, line_col, line_depth, special_draw, line_alpha=.85, line_w=None):
    s = W / n
    lw = line_w or max(2, s * .03)
    lines = mask(W, lambda d, P, ss: [d.line([P(k * s, 0), P(k * s, W)], fill=255, width=int(lw * ss)) or d.line([P(0, k * s), P(W, k * s)], fill=255, width=int(lw * ss)) for k in range(n + 1)], blur=.7)
    alb = mix(alb, C(line_col), lines * line_alpha); h = h - lines * line_depth
    alb, h = special_draw(alb, h, s)
    return alb, h


# ------------------------------------------------------------------------------------------------ Ballinderry (yew)
def ballinderry():
    W = 1200
    for n in (7, 9, 11):
        s = W / n
        alb = wood_grain(W, '#8a4a28', '#5e2c16', 3.2)
        alb = mix(alb, C('#b06a3a'), np.clip(noise((W, W), 40, 1), 0, 1) * .25)    # yew's orange sapwood flecks
        h = noise((W, W), 2, .15)
        holes = mask(W, lambda d, P, ss: [d.ellipse([*P((c + .5) * s - s * .085, (r + .5) * s - s * .085), *P((c + .5) * s + s * .085, (r + .5) * s + s * .085)], fill=255) for r in range(n) for c in range(n)], blur=.6)
        def spec(alb, h, s):
            m = mask(W, lambda d, P, ss: [d.ellipse([*P((i % n + .5) * s - s * r, (i // n + .5) * s - s * r), *P((i % n + .5) * s + s * r, (i // n + .5) * s + s * r)], outline=255, width=int(s * .035 * ss)) for i in SPECIAL[n] for r in (.36, .25)], blur=.6)
            return mix(alb, C('#2e140a'), m * .8), h - m * 1.6
        alb, h = board_common(n, W, alb, h, '#3a1a0c', 1.4, spec, .55, s * .018)
        alb = mix(alb, C('#140804'), holes); h = h - holes * 5
        col = shade(gaussian_filter(h, 1.2), alb, gloss=25, spec=.12, amb=.66)
        save(col, f'bd-ballinderry-{n}.webp')
    # frame: ring-chain (Borre style) carved band, seamless tile
    N = 384
    alb = wood_grain(N, '#6e361c', '#45200f', 3.0, wrap=True)
    def chain(d, P, ss):
        for row in (N * .25, N * .75):
            for k in range(6):
                x = (k + .5) * N / 6; r = N / 14
                d.ellipse([*P(x - r, row - r), *P(x + r, row + r)], outline=255, width=int(7 * ss))
                d.line([P(x - N / 12, row - r * .9), P(x + N / 12, row + r * .9)], fill=255, width=int(6 * ss))
                d.line([P(x - N / 12, row + r * .9), P(x + N / 12, row - r * .9)], fill=255, width=int(6 * ss))
    m = mask(N, chain, wrap=True, blur=.8)
    h = m * 3 + noise((N, N), 2, .2, True)
    alb = mix(alb, C('#8e4f2a'), m * .55)
    save(shade(gaussian_filter(h, 1, mode='wrap'), alb, 20, .1, .62), 'fr-ballinderry.webp')


# ------------------------------------------------------------------------------------------------ runestone (granite)
def granite(N, wrap=False):
    base = mix(C('#8d8f8c'), C('#a9aaa5'), .5 + .25 * noise((N, N), 30, 1, wrap))
    sp1 = np.clip(noise((N, N), .7, 1, wrap) - 1.3, 0, 1); sp2 = np.clip(-noise((N, N), .8, 1, wrap) - 1.5, 0, 1)
    base = mix(base, C('#3d3f3e'), sp1 * .9); base = mix(base, C('#e7e2d8'), sp2 * .8)
    base = mix(base, C('#b9a18a'), np.clip(noise((N, N), 3, 1, wrap) - 1.6, 0, 1) * .6)   # pink feldspar
    lich = np.clip(noise((N, N), 18, 1, wrap) - 1.2, 0, 1)
    return mix(base, C('#9aa07a'), lich * .25), noise((N, N), 1.2, .5, wrap) + noise((N, N), 8, 1.2, wrap)


def runestone():
    W = 1200
    for n in (7, 9, 11):
        s = W / n
        alb, h = granite(W)
        def spec(alb, h, s):
            def knot(d, P, ss):
                for i in SPECIAL[n]:
                    x, y = (i % n + .5) * s, (i // n + .5) * s; r = s * .3
                    d.ellipse([*P(x - r, y - r), *P(x + r, y + r)], outline=255, width=int(s * .06 * ss))
                    for k in range(4):
                        a = k * math.pi / 2 + math.pi / 4
                        d.line([P(x + math.cos(a) * r * .2, y + math.sin(a) * r * .2), P(x + math.cos(a) * r * 1.05, y + math.sin(a) * r * 1.05)], fill=255, width=int(s * .05 * ss))
            m = mask(W, knot, blur=.8)
            return mix(alb, C('#9c2a1c'), m * .85), h - m * 3
        alb, h = board_common(n, W, alb, h, '#4a4a46', 4.0, spec, .75, s * .035)
        save(shade(gaussian_filter(h, 1.0), alb, 18, .08, .62), f'bd-runestone-{n}.webp')
    # frame: granite with a red-painted serpent band carrying runes (seamless horizontally and vertically)
    N = 512
    alb, h = granite(N, True)
    def band(d, P, ss):
        for row in (N * .5,):
            d.line([P(-20, row - 34), P(N + 20, row - 34)], fill=255, width=int(5 * ss))
            d.line([P(-20, row + 34), P(N + 20, row + 34)], fill=255, width=int(5 * ss))
    def runes(d, P, ss):
        k = 0
        for i, ch in enumerate(TEXT[:16]):
            x = 16 + i * (N / 16)
            if ch: rune_line(d, P, ss, x, N * .5 - 22, 44, ch, 4.5)
    mb, mr = mask(N, band, wrap=True, blur=.8), mask(N, runes, wrap=True, blur=.7)
    strip = mask(N, lambda d, P, ss: d.rectangle([*P(-20, N * .5 - 34), *P(N + 20, N * .5 + 34)], fill=255), wrap=True, blur=1.5)
    alb = mix(alb, C('#a9342a'), mb * .9); alb = mix(alb, C('#b8402e'), mr * .9)
    alb = mix(alb, alb * .92, strip * .3)
    h = h - (mb + mr) * 3
    save(shade(gaussian_filter(h, .9, mode='wrap'), alb, 16, .06, .62), 'fr-runestone.webp')


# ------------------------------------------------------------------------------------------------ longship (tarred oak)
def shield(d, P, ss, x, y, r, cols):
    """a round Viking shield: painted quarters, a dark rim, the iron boss — drawn in separate masks by the caller"""
    pass


def longship():
    W = 1200
    for n in (7, 9, 11):
        s = W / n
        # planks: horizontal strakes, each with its own tone, tar-blackened
        yy, xx = np.mgrid[0:W, 0:W].astype(float)
        plank_h = s * .5
        pk = (yy // plank_h).astype(int)
        tone = np.array([rng.uniform(-.12, .12) for _ in range(int(W / plank_h) + 2)])[pk]
        alb = wood_grain(W, '#4a3322', '#2a1c12', 2.2, warp=40, aniso=(1.2, 90))
        alb = alb * (1 + tone[..., None])
        seam = np.clip(1.5 - np.abs((yy % plank_h) - 0) , 0, 1) + np.clip(1.5 - np.abs((yy % plank_h) - plank_h), 0, 1)
        alb = mix(alb, C('#0e0906'), seam * .9)
        h = -seam * 2 + noise((W, W), 1.5, .2)
        # iron rivets along every other seam
        riv = mask(W, lambda d, P, ss: [d.ellipse([*P(x - s * .045, y - s * .045), *P(x + s * .045, y + s * .045)], fill=255) for j in range(1, int(W / plank_h)) for x in np.arange(s * .25, W, s * .5) for y in [j * plank_h] if j % 2 == 0], blur=.5)
        alb = mix(alb, C('#59524a'), riv); h = h + riv * 2.5
        def spec(alb, h, s):
            # painted round shields on the corners and the throne: quarters red / ochre, white rim dots, iron boss
            out_a, out_h = alb, h
            for i in SPECIAL[n]:
                x, y = (i % n + .5) * s, (i // n + .5) * s; r = s * .42
                q1 = mask(W, lambda d, P, ss: d.pieslice([*P(x - r, y - r), *P(x + r, y + r)], 0, 90, fill=255) or d.pieslice([*P(x - r, y - r), *P(x + r, y + r)], 180, 270, fill=255))
                q2 = mask(W, lambda d, P, ss: d.pieslice([*P(x - r, y - r), *P(x + r, y + r)], 90, 180, fill=255) or d.pieslice([*P(x - r, y - r), *P(x + r, y + r)], 270, 360, fill=255))
                rim = mask(W, lambda d, P, ss: d.ellipse([*P(x - r, y - r), *P(x + r, y + r)], outline=255, width=int(s * .05 * ss)))
                boss = mask(W, lambda d, P, ss: d.ellipse([*P(x - r * .26, y - r * .26), *P(x + r * .26, y + r * .26)], fill=255))
                wear = np.clip(noise((W, W), 2, 1) - .6, 0, 1)
                out_a = mix(out_a, C('#a3281c') * (1 - .2 * wear[..., None]), q1 * (1 - .35 * wear))
                out_a = mix(out_a, C('#d6a640') * (1 - .2 * wear[..., None]), q2 * (1 - .35 * wear))
                out_a = mix(out_a, C('#2a1e14'), rim); out_a = mix(out_a, C('#6b665e'), boss)
                yy2, xx2 = np.mgrid[0:W, 0:W]; dome = np.clip(1 - ((xx2 - x) ** 2 + (yy2 - y) ** 2) / (r * .26) ** 2, 0, 1)
                out_h = out_h + (q1 + q2) * .6 + rim * 1.2 + np.sqrt(dome) * 8
            return out_a, out_h
        alb, h = board_common(n, W, alb, h, '#c9a35e', .8, spec, .55, s * .022)
        save(shade(gaussian_filter(h, 1.0), alb, 30, .18, .62), f'bd-longship-{n}.webp')
    # frame: the gunwale — a row of round shields over tarred planks (seamless)
    N = 480
    alb = wood_grain(N, '#3e2a1c', '#22160e', 2.4, wrap=True)
    h = noise((N, N), 1.5, .2, True)
    cols = [('#a3281c', '#d6a640'), ('#1f3f6b', '#e0d6bd'), ('#2f5a2c', '#d6a640'), ('#e0d6bd', '#a3281c')]
    for j, (x, y) in enumerate([(N * .25, N * .25), (N * .75, N * .25), (N * .25, N * .75), (N * .75, N * .75)]):
        r = N * .2; ca, cb = cols[j]
        for col, angs in ((ca, [(0, 90), (180, 270)]), (cb, [(90, 180), (270, 360)])):
            m = mask(N, lambda d, P, ss, angs=angs: [d.pieslice([*P(x - r, y - r), *P(x + r, y + r)], a0, a1, fill=255) for a0, a1 in angs], wrap=True)
            alb = mix(alb, C(col), m * .92); h = h + m * .6
        rim = mask(N, lambda d, P, ss: d.ellipse([*P(x - r, y - r), *P(x + r, y + r)], outline=255, width=int(8 * ss)), wrap=True)
        boss = mask(N, lambda d, P, ss: d.ellipse([*P(x - r * .25, y - r * .25), *P(x + r * .25, y + r * .25)], fill=255), wrap=True)
        alb = mix(alb, C('#2a1e14'), rim); alb = mix(alb, C('#6b665e'), boss); h = h + rim * 1.4 + boss * 4
    save(shade(gaussian_filter(h, 1.0, mode='wrap'), alb, 26, .14, .62), 'fr-longship.webp')


# ------------------------------------------------------------------------------------------------ Birka glass pieces
def birka():
    N = 256; c = (N - 1) / 2; R = N / 2 - 2
    yy, xx = np.mgrid[0:N, 0:N].astype(float); rr = np.hypot(xx - c, yy - c) / R
    def piece(body, deep, name, king=False):
        dome = np.sqrt(np.clip(1 - rr ** 2, 0, 1))
        h = dome * (40 if not king else 46)
        swirl = noise((N, N), 6, 1) + noise((N, N), 2, .4)
        alb = mix(C(body), C(deep), np.clip(.35 + .25 * swirl + .5 * rr ** 2, 0, 1))
        # glass: light comes through — a bright caustic on the side away from the light, dark rim
        caust = np.clip(1 - np.hypot(xx - c - R * .3, yy - c - R * .32) / (R * .5), 0, 1) ** 2
        alb = alb + caust[..., None] * (C(body) * .55)
        bub = mask(N, lambda d, P, ss: [d.ellipse([*P(x - r, y - r), *P(x + r, y + r)], fill=255) for x, y, r in [(rng.uniform(60, 196), rng.uniform(60, 196), rng.uniform(1.2, 3)) for _ in range(14)]], blur=.4)
        alb = mix(alb, C('#ffffff'), bub * .35)
        if king:   # a trailed white glass spiral and a gilt dot crown, like the decorated Birka "king"
            sp = mask(N, lambda d, P, ss: d.line([P(c + math.cos(t) * t * 9, c + math.sin(t) * t * 9) for t in np.linspace(.5, 11, 160)], fill=255, width=int(5 * ss), joint='curve'), blur=.8)
            alb = mix(alb, C('#f4efe2'), sp * .9); h = h + sp * 2.5
            dots = mask(N, lambda d, P, ss: [d.ellipse([*P(c + math.cos(a) * R * .72 - 8, c + math.sin(a) * R * .72 - 8), *P(c + math.cos(a) * R * .72 + 8, c + math.sin(a) * R * .72 + 8)], fill=255) for a in np.linspace(0, 2 * math.pi, 9)[:-1]], blur=.6)
            alb = mix(alb, C('#e9bf55'), dots); h = h + dots * 3
        col = shade(gaussian_filter(h, 1), alb, gloss=140, spec=1.1, amb=.72)
        col = col * (1 - .45 * np.clip((rr - .82) / .18, 0, 1) ** 2)[..., None]
        a = np.clip((1 - rr) * R / 1.2, 0, 1)
        Image.fromarray(np.dstack([np.clip(col, 0, 255), a[..., None] * 255]).astype(np.uint8), 'RGBA').save(os.path.join(OUT, name), quality=90, method=6); print(name)
    piece('#2a3f73', '#0d1530', 'pc-birka-a.webp')
    piece('#e9e6dc', '#b9b4a6', 'pc-birka-d.webp')
    piece('#f2efe6', '#c5bfae', 'pc-birka-k.webp', king=True)


if __name__ == '__main__':
    want = sys.argv[2:] or ['carved', 'carved_frame', 'turned', 'ballinderry', 'runestone', 'longship', 'birka']
    for w in want: globals()[w]()

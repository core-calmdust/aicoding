# The xiangqi piece faces (see xiangqi-tex.py): 7 × 2 cells of 320 px, the face disc filling each cell.
import math, numpy as np
from scipy import ndimage
from PIL import Image
from xqtex_lib import vnoise, fbm, smooth
from xqtex_wood import wood
from xqtex_glyph import glyph
C = 320; R = C / 2
GL = ['帥仕相傌俥炮兵', '將士象馬車砲卒']
def blur(a, s): return ndimage.gaussian_filter(a, s)
def disc_xy():
    y, x = np.mgrid[0:C, 0:C].astype(np.float32) + .5; return x - R, y - R
def ring(rr, wd):
    x, y = disc_xy(); d = np.sqrt(x * x + y * y); return np.clip(wd / 2 - np.abs(d - rr) + .5, 0, 1)
def gmask(ch, style, frac=.6, bold=None):
    g = glyph(ch, style, round(C * frac * 2), bold); g = g.resize((round(g.size[0] / 2), round(g.size[1] / 2)), Image.LANCZOS)
    im = Image.new('L', (C, C), 0); im.paste(g, (round(R - g.size[0] / 2), round(R - g.size[1] / 2))); return np.asarray(im, np.float32) / 255
def metal(h, w, base, seed):
    br = vnoise(h, w, 50, 1.2, seed); cl = fbm(h, w, 40, 40, seed + 3, 3)
    return np.array(base, np.float32) * (.86 + (br - .5) * .14 + (cl - .5) * .2)[..., None]
GOLD = (238, 196, 110); SILVER = (222, 226, 232)
def cell(set_, col, ch, seed):
    """→ rgb (C, C, 3), rough, metal, height"""
    h = w = C; x, y = disc_xy()
    rough = np.full((h, w), .4, np.float32); met = np.zeros((h, w), np.float32); hg = np.zeros((h, w), np.float32)
    X = (x + R) / 420; Y = (y + R) / 420; Z = np.zeros_like(X)
    def engrave(m, fill, depth=.7, r_=.35):
        nonlocal rgb, rough, hg
        e = np.clip(blur(m, 1.2) * 1.3, 0, 1)
        rgb = rgb * (1 - e[..., None]) + np.array(fill, np.float32) * e[..., None]
        sh = np.clip(blur(m, 2.2) - m, 0, 1); rgb *= (1 - sh * .35)[..., None]   # the cut's wall, a little shadow round it
        rough = rough * (1 - e) + r_ * e; hg -= blur(m, 1.4) * depth
    def inlay(m, base, r_=.25, raise_=0):
        nonlocal rgb, rough, met, hg
        seam = np.clip(blur(m, 1) - m, 0, 1) * 2; rgb *= (1 - np.clip(seam, 0, 1) * .6)[..., None]
        rgb = rgb * (1 - m[..., None]) + metal(h, w, base, seed + 9) * m[..., None]
        rough = rough * (1 - m) + r_ * m; met = met * (1 - m) + m; hg += blur(m, .8) * raise_ - seam * .15
    if set_ == 'boxwood':
        rgb = wood(X, Y, Z, 'box', dict(cx=.4 + seed * .03, cz=-1.2, tz=.05), h, w, 900 + seed); rough[:] = .42
        ink = (176, 32, 24) if col == 0 else (30, 22, 18)
        engrave(ring(R * .84, 5.5), ink, .6); engrave(gmask(ch, 'kai', .6), ink)
    elif set_ == 'brass':
        if col == 0: rgb = np.ones((h, w, 3), np.float32) * np.array([240, 228, 200], np.float32) * (.94 + .1 * fbm(h, w, 60, 60, 950 + seed, 3))[..., None]; ink = (168, 30, 22)
        else: rgb = np.ones((h, w, 3), np.float32) * np.array([50, 36, 28], np.float32) * (.9 + .2 * fbm(h, w, 60, 60, 950 + seed, 3))[..., None]; ink = (238, 224, 192)
        rough[:] = .45; engrave(ring(R * .86, 3), ink, .4); engrave(gmask(ch, 'ming', .6), ink, .6)
    elif set_ == 'ebony':
        rgb = wood(X, Y, Z, 'ebony', dict(cx=.4, cz=-1.5, tz=.03), h, w, 910 + seed); rough[:] = .3
        mb = GOLD if col == 0 else SILVER
        inlay(np.clip(ring(R * .9, 3) + ring(R * .8, 2), 0, 1), mb); inlay(gmask(ch, 'kai', .6), mb, .22)
    elif set_ == 'urushi':
        base = np.array([156, 30, 22] if col == 0 else [20, 16, 17], np.float32)
        rgb = np.ones((h, w, 3), np.float32) * base * (.92 + .16 * fbm(h, w, 90, 90, 960 + seed, 3))[..., None]; rough[:] = .12
        inlay(np.clip(ring(R * .9, 3.2) + ring(R * .81, 2), 0, 1), GOLD, .38, .25); inlay(gmask(ch, 'kai', .6), GOLD, .36, .35)
    elif set_ == 'jade':
        from importlib import import_module
        if col == 0:
            q = fbm(h, w, 60, 60, 970 + seed, 4)
            rgb = np.ones((h, w, 3), np.float32) * np.array([238, 240, 226], np.float32) * (.9 + .1 * q)[..., None]
            rgb = rgb * (1 - smooth(.55, .8, fbm(h, w, 40, 70, 975 + seed, 4))[..., None] * .12) + np.array([10, 16, 0], np.float32) * .0
            rough[:] = .1; engrave(ring(R * .84, 4), (170, 30, 22), .5, .3); engrave(gmask(ch, 'kai', .6), (170, 30, 22), .7, .3)
        else:
            tx = import_module('xiangqi-tex') if False else None
            rgb = jade_small(h, w, 980 + seed); rough[:] = .1
            m = gmask(ch, 'kai', .6); hg -= blur(m, 1.4) * .6; inlay(m, GOLD, .3); inlay(ring(R * .84, 4), GOLD, .3)
    else:   # porcelain: white glaze, the characters painted under it (cobalt / iron red, pooling darker)
        rgb = np.ones((h, w, 3), np.float32) * np.array([248, 250, 252], np.float32) * (.97 + .03 * fbm(h, w, 80, 80, 990 + seed, 3))[..., None]; rough[:] = .06
        blue = np.array([28, 56, 150], np.float32); ink = np.array([176, 40, 30], np.float32) if col == 0 else blue
        def paint(m, c):
            nonlocal rgb
            pool = .75 + .5 * smooth(.4, .8, fbm(h, w, 14, 14, 995 + seed, 3)); m2 = np.clip(blur(m, .9), 0, 1)
            rgb = rgb * (1 - m2[..., None] * .95) + (c * (1.25 - pool * .35))[None, None, :] * (m2[..., None] * .95) if False else rgb * (1 - m2[..., None] * .95) + c[None, None, :] * (1.3 - pool[..., None] * .4) * (m2[..., None] * .95)
        paint(np.clip(ring(R * .9, 4) + ring(R * .82, 1.8), 0, 1), blue); paint(gmask(ch, 'kai', .6), ink)
    # the face's edge: a turned bevel darkening the outermost px (the body's lathe meets here)
    d = np.sqrt(x * x + y * y); rgb *= (1 - smooth(R * .95, R, d) * .25)[..., None]
    return rgb, rough, met, hg
def jade_small(h, w, seed):
    q = fbm(h, w, 70, 70, seed, 4); r = fbm(h, w, 40, 50, seed + 7, 4)
    A = np.array([50, 132, 88], np.float32); B = np.array([14, 70, 42], np.float32); Cc = np.array([160, 210, 176], np.float32)
    t = smooth(.25, .75, r + (q - .5) * .5) * .6 + .2; col = A * (1 - t[..., None]) + B * t[..., None]
    milk = smooth(.5, .85, fbm(h, w, 50, 60, seed + 13, 4)); col = col * (1 - milk[..., None] * .25) + Cc * (milk[..., None] * .25)
    return col * (1 + (vnoise(h, w, 2, 2, seed + 17) - .5) * .1)[..., None]
SETS = ['boxwood', 'brass', 'ebony', 'urushi', 'jade', 'porcelain']
def run(only, put):
    for s in ([only] if only else SETS):
        rgb = np.zeros((2 * C, 7 * C, 3), np.float32); M = np.zeros((2 * C, 7 * C, 3), np.float32)
        for col in range(2):
            for k, ch in enumerate(GL[col]):
                c, ro, me, hg = cell(s, col, ch, k + col * 7)
                rgb[col * C:(col + 1) * C, k * C:(k + 1) * C] = c
                M[col * C:(col + 1) * C, k * C:(k + 1) * C] = np.stack([128 + np.clip(hg, -1, 1) * 127, ro * 255, me * 255], -1)
        put('pc-' + s, rgb, M)

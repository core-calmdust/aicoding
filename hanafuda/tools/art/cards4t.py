# -*- coding: utf-8 -*-
"""The four hard cards, re-drawn over the reference underlays (hftrace.py) with card-specific touches:
菊に盃 gets our own brush-written 寿, a gold rim on the cup's mouth and a lacquer sheen."""
import math, os, sys
import numpy as np
import scipy.ndimage as nd
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
import hftrace as T
import hfprint as P
from hfart_geom import brush

UP = os.environ.get('HF_REF', '/mnt/user-data/uploads')
REF = {
    'matsu-tsuru': '06f03b7f-Hanafuda_January_Hikari_Alt.svg',
    'yanagi-michikaze': 'b9b1eee6-Hanafuda_November_Hikari_Alt.svg',
    'kiri-houou': 'ac890f3e-Hanafuda_December_Hikari_Alt.svg',
    'kiku-sakazuki': '53a0dabb-Hanafuda_September_Tane_Alt.svg',
}

# 寿 written in a 100x100 box (stroke order: 3 horizontals, the vertical, the sweep left, 寸)
KOTOBUKI = [
    ([(34, 14), (50, 12), (64, 11)], 7.0, 5.0),
    ([(24, 28), (50, 25), (74, 23), (70, 30)], 7.4, 4.0),
    ([(10, 44), (48, 40), (90, 36)], 8.4, 5.2),
    ([(50, 2), (52, 22), (50, 41)], 8.0, 6.0),
    ([(50, 41), (42, 56), (28, 72), (10, 86)], 8.6, 1.6),
    ([(32, 61), (62, 57), (90, 53)], 7.8, 5.0),
    ([(72, 45), (74, 70), (73, 94), (60, 86)], 9.0, 3.0),
    ([(41, 67), (49, 77)], 9.4, 4.0),
]
GLYPH = dict(cx=212, cy=334, s=0.74, rot=0.50)     # placed on the cup, along its tilt (card units)


def kiku_drop(line, px):
    """the underlay's written character: line components lying inside the glyph box"""
    lab, n = nd.label(line)
    x0, x1, y0, y1 = 160 * px, 264 * px, 280 * px, 388 * px
    out = np.zeros_like(line)
    for i, sl in enumerate(nd.find_objects(lab), 1):
        if sl[1].start >= x0 and sl[1].stop <= x1 and sl[0].start >= y0 and sl[0].stop <= y1:
            out |= lab == i
    return out


def kiku_extra(masks, lines, w, h, px, rng, full, names):
    # the underlay's character had a dark fill inside its outline: give that area back to the cup's red
    yy, xx = np.mgrid[0:h, 0:w]
    box = (xx > 160 * px) & (xx < 264 * px) & (yy > 282 * px) & (yy < 388 * px)
    if 'k' in masks:
        moved = masks['k'] * box
        masks['k'] = masks['k'] - moved
        masks['r'] = np.clip(masks['r'] + moved, 0, 1)
    import random
    R = random.Random(7)
    g = GLYPH
    cr, sr = math.cos(g['rot']), math.sin(g['rot'])
    im = Image.new('L', (w * 2, h * 2), 0)
    d = ImageDraw.Draw(im)
    for pts, w0, w1 in KOTOBUKI:
        q = [((g['cx'] + ((x - 50) * cr - (y - 50) * sr) * g['s']) * px, (g['cy'] + ((x - 50) * sr + (y - 50) * cr) * g['s']) * px) for x, y in pts]
        poly = brush(np.array(q, float), w0 * g['s'] * px * 0.95, w1 * g['s'] * px * 0.95, R, (0.12, 0.32), 0.22)
        d.polygon([(x * 2, y * 2) for x, y in poly], fill=255)
    a = np.asarray(im.resize((w, h), Image.LANCZOS), np.float32) / 255
    lines[:] = np.maximum(lines, a)
    # the cup (red region around the glyph)
    red = masks.get('r')
    if red is None:
        return
    lab, n = nd.label(red > 0.5)
    k = lab[int(g['cy'] * px), int(g['cx'] * px)]
    if k == 0:
        return
    cup = nd.binary_fill_holes(nd.binary_closing(lab == k, iterations=6))
    # mouth rim = the cup's edge on the upper side of its long axis -> gold
    ax0, ay0, ax1, ay1 = 120 * px, 290 * px, 300 * px, 398 * px
    side = (xx - ax0) * (ay1 - ay0) - (yy - ay0) * (ax1 - ax0)      # >0: above the axis
    dist_in = nd.distance_transform_edt(cup)
    rim = cup & (dist_in < 4.6 * px) & (dist_in > 1.4 * px) & (side > 0)
    rim = nd.binary_opening(rim, iterations=1)
    masks['r'] = np.where(rim, 0, masks['r'])
    masks['gold'] = rim.astype(np.float32)
    # lacquer sheen: a soft lighter band along the bowl
    band = (cup & (dist_in > 6 * px) & (dist_in < 13 * px) & (side > 0)).astype(np.float32)
    band = P.blur(band, 3 * px)
    masks['r'] = masks['r'] * (1 - band * cup * 0.42)      # thinner red where the lacquer catches the light


P.INK['gold'] = (206, 160, 62)


def build(name, out, scale=4.0):
    kw = {}
    if name == 'kiku-sakazuki':
        kw = dict(drop=kiku_drop, extra=kiku_extra)
    seed = {'matsu-tsuru': 11, 'yanagi-michikaze': 23, 'kiri-houou': 37, 'kiku-sakazuki': 41}[name]
    return T.reprint(os.path.join(UP, REF[name]), out, scale, seed=seed, **kw)


if __name__ == '__main__':
    outdir = sys.argv[1]
    names = sys.argv[2:] or list(REF)
    for n in names:
        build(n, os.path.join(outdir, n + '.png'))
        print('ok', n)

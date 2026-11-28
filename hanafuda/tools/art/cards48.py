# -*- coding: utf-8 -*-
"""All 48 cards, re-drawn over the reference underlays (Wikimedia Commons "Hanafuda_*_Alt.svg",
Louie Mantia & すけじょ, CC BY-SA 4.0) with hftrace.py. The poem ribbons' writing (あかよろし・みよしの)
and the 寿 on the sake cup are our own brush writing, not the underlay's.

  python3 cards48.py OUTDIR [name ...]        (HF_REF = folder of the underlays)
"""
import math, os, sys, random
import numpy as np
import scipy.ndimage as nd
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
import hftrace as T
import hfprint as P
from hfart_geom import brush
import cards4t as K4

REF = os.environ.get('HF_REF', '/mnt/user-data/uploads/Downloads/hanafuda-ref')
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
SHORT = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
# engine order of the four cards of each month (see engine.js DEF) -> the underlay's kind
ORDER = {
    0: ['Hikari', 'Tanzaku', 'Kasu_1', 'Kasu_2'], 1: ['Tane', 'Tanzaku', 'Kasu_1', 'Kasu_2'], 2: ['Hikari', 'Tanzaku', 'Kasu_1', 'Kasu_2'],
    3: ['Tane', 'Tanzaku', 'Kasu_1', 'Kasu_2'], 4: ['Tane', 'Tanzaku', 'Kasu_1', 'Kasu_2'], 5: ['Tane', 'Tanzaku', 'Kasu_1', 'Kasu_2'],
    6: ['Tane', 'Tanzaku', 'Kasu_1', 'Kasu_2'], 7: ['Hikari', 'Tane', 'Kasu_1', 'Kasu_2'], 8: ['Tane', 'Tanzaku', 'Kasu_1', 'Kasu_2'],
    9: ['Tane', 'Tanzaku', 'Kasu_1', 'Kasu_2'], 10: ['Hikari', 'Tane', 'Tanzaku', 'Kasu'], 11: ['Hikari', 'Kasu_1', 'Kasu_3', 'Kasu_2'],   # Kasu_2 = the yellow one
}
NAMED = {0: 'matsu-tsuru', 32: 'kiku-sakazuki', 40: 'yanagi-michikaze', 44: 'kiri-houou'}
P.INK.update({'pk': (222, 140, 156), 'lo': (226, 170, 92), 'g': (74, 140, 100)})
T.UNDER.extend([((255, 141, 182), 'pk'), ((255, 184, 90), 'lo'), ((80, 178, 113), 'g')])


def card_name(cid):
    if cid in NAMED:
        return NAMED[cid]
    m, k = divmod(cid, 4)
    return f'{SHORT[m]}-{ORDER[m][k].lower().replace("_", "")}'


def ref_file(cid):
    m, k = divmod(cid, 4)
    return os.path.join(REF, f'Hanafuda_{MONTHS[m]}_{ORDER[m][k]}_Alt.svg')


# ---------------- brush-written kana (100x100 box, strokes in order) ----------------
KANA = {
    'あ': [([(26, 30), (50, 27), (72, 24)], 7.5, 5), ([(46, 10), (44, 50), (52, 90)], 8, 3),
          ([(68, 40), (52, 66), (34, 84), (22, 76), (30, 58), (56, 50), (80, 60), (80, 80), (62, 92)], 7.5, 2.5)],
    'か': [([(58, 26), (48, 52), (36, 82), (24, 78), (22, 56), (38, 34), (62, 28), (82, 46), (80, 74), (60, 90)], 8, 2.5), ([(76, 12), (82, 22)], 8, 3)],   # 変体仮名（可）: の に点
    'よ': [([(56, 36), (70, 34), (80, 33)], 7, 4.5), ([(52, 8), (53, 40), (52, 70), (40, 88), (24, 82), (32, 68), (58, 70), (84, 88)], 8, 2.5)],
    'ろ': [([(24, 18), (48, 16), (70, 15), (34, 54)], 7.5, 5), ([(34, 54), (56, 46), (76, 56), (78, 76), (60, 88), (42, 90)], 7.5, 2)],
    'し': [([(40, 8), (39, 40), (38, 70), (48, 88), (68, 82), (82, 64)], 8.5, 2)],
    'み': [([(28, 20), (46, 18), (60, 17), (44, 40), (32, 62), (24, 78), (30, 86), (42, 82), (56, 68), (72, 62), (86, 66)], 7.5, 2.5), ([(70, 40), (66, 66), (58, 92)], 8, 2.5)],
    'の': [([(56, 22), (46, 50), (34, 80), (22, 76), (20, 52), (36, 28), (62, 22), (82, 40), (80, 70), (58, 88)], 8, 2.5)],
}
TEXT = {1: 'あかよろし', 5: 'あかよろし', 9: 'みよしの'}


def ribbon_of(masks, px):
    red = masks.get('r')
    if red is None:
        return None
    lab, n = nd.label(red > 0.5)
    if n == 0:
        return None
    sizes = nd.sum(np.ones_like(lab), lab, range(1, n + 1))
    k = int(np.argmax(sizes)) + 1
    return nd.binary_fill_holes(nd.binary_closing(lab == k, iterations=8))


def write_ribbon(cid):
    text = TEXT[cid]
    state = {}

    def drop(line, px):
        # the underlay's writing: line parts lying inside the ribbon (the ribbon itself is found from the underlay's red)
        u = T.render_underlay(ref_file(cid), line.shape[1], line.shape[0])
        lab0 = T.classify(u)
        rib = lab0 == [n for _, n in T.UNDER].index('r')
        lab, n = nd.label(rib)
        sizes = nd.sum(np.ones_like(lab), lab, range(1, n + 1))
        rib = nd.binary_fill_holes(lab == int(np.argmax(sizes)) + 1)
        state['rib'] = rib
        inner = nd.binary_erosion(rib, iterations=int(2.5 * px))
        L, m = nd.label(line)
        out = np.zeros_like(line)
        for i, sl in enumerate(nd.find_objects(L), 1):
            comp = L[sl] == i
            if (inner[sl] | ~comp).all():
                out[sl] |= comp
        drop.mask = out
        return out

    def extra(masks, lines, w, h, px, rng, full, names):
        rib = state.get('rib')
        if rib is None:
            return
        # grey fill the underlay had inside its letters -> back to the ribbon red
        if 'k' in masks:
            moved = masks['k'] * nd.binary_erosion(rib, iterations=int(2 * px))
            masks['k'] -= moved
            masks['r'] = np.clip(masks['r'] + moved, 0, 1)
        ys, xs = np.nonzero(rib)
        c = np.array([xs.mean(), ys.mean()])
        cov = np.cov(np.stack([xs - c[0], ys - c[1]]))
        ev, evec = np.linalg.eigh(cov)
        ax = evec[:, 1]
        if ax[1] < 0:
            ax = -ax
        nrm = np.array([-ax[1], ax[0]])
        proj = (xs - c[0]) * ax[0] + (ys - c[1]) * ax[1]
        side = (xs - c[0]) * nrm[0] + (ys - c[1]) * nrm[1]
        L0, L1 = np.percentile(proj, 2), np.percentile(proj, 98)
        wid = np.percentile(side, 97) - np.percentile(side, 3)
        size = wid * 0.80
        n = len(text)
        span = min((L1 - L0) * 0.82, size * 1.02 * n)
        start = L0 + (L1 - L0 - span) * 0.42
        ang = math.atan2(ax[1], ax[0]) - math.pi / 2
        cr, sr = math.cos(ang), math.sin(ang)
        R = random.Random(cid)
        im = Image.new('L', (w * 2, h * 2), 0)
        d = ImageDraw.Draw(im)
        for i, ch in enumerate(text):
            cc = c + ax * (start + span * (i + 0.5) / n)
            s = size / 100.0 * R.uniform(0.94, 1.06)
            for pts, w0, w1 in KANA[ch]:
                q = [(cc[0] + ((x - 50) * cr - (y - 50) * sr) * s, cc[1] + ((x - 50) * sr + (y - 50) * cr) * s) for x, y in pts]
                poly = brush(np.array(q, float), w0 * s * 1.35, w1 * s * 1.35, R, (0.12, 0.3), 0.22)
                d.polygon([(x * 2, y * 2) for x, y in poly], fill=255)
        a = np.asarray(im.resize((w, h), Image.LANCZOS), np.float32) / 255
        lines[:] = np.maximum(lines, a)
    return drop, extra


def ribbon_fill(cid):
    def extra(masks, lines, w, h, px, rng, full, names):
        red = masks.get('r')
        if red is None or 'k' not in masks:
            return
        lab, n = nd.label(red > 0.5)
        if not n:
            return
        sizes = nd.sum(np.ones_like(lab), lab, range(1, n + 1))
        rib = nd.binary_fill_holes(nd.binary_closing(lab == int(np.argmax(sizes)) + 1, iterations=8))
        moved = masks['k'] * nd.binary_erosion(rib, iterations=int(2 * px))
        masks['k'] -= moved
        masks['r'] = np.clip(masks['r'] + moved, 0, 1)
    return extra


def build(cid, outdir, scale=4.0):
    name = card_name(cid)
    out = os.path.join(outdir, name + '.png')
    # writing (2026-11-28 user request): follow the reference's running hand — the underlay's letters are
    # re-drawn stroke by stroke with the brush like every other line (no font); only the grey fill the underlay
    # had inside the letters goes back to the ribbon / cup red
    if cid == 32:
        K4.KOTOBUKI[:] = []
        kw = dict(extra=K4.kiku_extra)
    elif cid in TEXT:
        kw = dict(extra=ribbon_fill(cid))
    else:
        kw = {}
    T.reprint(ref_file(cid), out, scale, seed=11 + cid * 7, **kw)
    return name


if __name__ == '__main__':
    outdir = sys.argv[1]
    want = set(sys.argv[2:])
    for cid in range(48):
        nm = card_name(cid)
        if want and nm not in want and str(cid) not in want:
            continue
        build(cid, outdir)
        print('ok', cid, nm, flush=True)

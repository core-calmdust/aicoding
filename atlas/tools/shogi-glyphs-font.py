# Writes images/atlas/shogi-glyphs-reisho.png: the 隷書 (clerical script) 3D piece set, set from the free brush font 青柳隷書しも
# (aoyagireisyosimo_otf_2_02.otf, SIMO / calligraphy by 青柳衡山; free, commercial use allowed, no conditions — its readme). The font
# file is not kept in the repository: python3 atlas/tools/shogi-glyphs-font.py /path/to/aoyagireisyosimo_otf_2_02.otf
# Each cell 256×296 (5 × 3, the order of SHEET_KEYS in atlas/models/shogi.js), as the other sheets: alpha = the lacquer, grey = its
# height (dark = the crown of the stroke). The promoted sides are cursive, from the 水無瀬 sheet (as real 隷書 sets). The two characters are stacked as on real 隷書 pieces (tight, wide and flat), as large as
# they go while staying inside the 3D piece's face (atlas/models/shogi.js pieceGeo: shoulders 23.4% from the tip, 84% of the width).
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy.ndimage import label
from skimage.morphology import skeletonize, dilation, disk

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
CW, CH = 256, 296
TEXT = ['歩兵', '香車', '桂馬', '銀將', '角行', '飛車', '金將', '玉將', 'と', '杏', '圭', '全', '龍馬', '龍王', '王將']   # (將: the old form, as on real pieces)
EM = 600
SH, SW = (.47 - .25) / .94, .335 / .4   # the face: shoulder height (from the tip) and width (of the full width)

def ink(font, ch):
    """one character, recut as a carved 隷書 piece inscription (compared by eye with photos of real 隷書 pieces, 2026-11-11):
    the scanned brush font's loose specks are dropped and its ragged edges smoothed; every stroke is then made at least 2·R thick
    along its centre line (the skeleton), keeping the font's own wider parts (the flared ends, 波磔) and the open counters; the edges
    rounded as cut with a chisel"""
    m = font.getmask(ch); im = Image.frombytes('L', m.size, bytes(m)); a = np.array(im) > 100
    lab, n = label(a); sizes = np.bincount(lab.ravel()); keep = np.zeros_like(a)
    for i in range(1, n + 1):
        if sizes[i] >= a.sum() * .004: keep |= lab == i
    im = Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5)).point(lambda v: 255 if v > 110 else 0)
    a = np.pad(np.array(im) > 0, 40)
    b = a | dilation(skeletonize(a), disk(R))
    im = Image.fromarray((b * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))
    im = im.point(lambda v: 0 if v < 100 else 255 if v > 156 else int((v - 100) * 255 / 56))
    bb = im.getbbox(); return im.crop(bb)

R = 26   # half the least stroke width, in font units of EM = 600

def inside(cw, ch, inset):
    """the 3D face in the cell, shrunk by inset (fraction of the width)"""
    m = Image.new('L', (cw, ch), 0); d = ImageDraw.Draw(m)
    d.polygon([(cw / 2, 0), (cw / 2 + SW * cw / 2, SH * ch), (cw, ch), (0, ch), (cw / 2 - SW * cw / 2, SH * ch)], fill=255)
    return np.array(m.filter(ImageFilter.MinFilter(2 * int(inset * cw) + 1))) > 128

FLAT = .7     # 隷書 on pieces: wide and flat characters
ASPECT = .82   # ... no character taller than this times its width (将・馬 are tall in the font)
SS = 4         # laid out and drawn at 4× the cell, then reduced (clean edges)

def body(g):
    """the width of a character's body: its ink between the 8% and 92% points across (long flared strokes and lone dots do not
    make a character look wider, its mass does)"""
    cols = np.array(g).astype(np.float64).sum(0); c = np.cumsum(cols) / max(1, cols.sum())
    return max(1, (g.width * (np.searchsorted(c, .92) - np.searchsorted(c, .08))) ** .5)   # (with its full width: the mean)

def shaped(g, w):
    """g with its body w wide (in SS pixels), flattened"""
    k = w / body(g); W = g.width * k; h = g.height * k * FLAT; h = min(h, W * ASPECT)
    return g.resize((max(1, round(W)), max(1, round(h))), Image.LANCZOS)

def cx_of(g):
    """the optical centre across: halfway between the box's middle and the ink's centre of mass"""
    a = np.array(g).astype(np.float64); cols = a.sum(0)
    return .5 * (g.width / 2 + (cols * np.arange(g.width)).sum() / max(1, cols.sum()))

def fits(parts, ok):
    for g, x, y in parts:
        if x < 0 or y < 0 or x + g.width > ok.shape[1] or y + g.height > ok.shape[0]: return False
        if ((np.array(g) > 60) & ~ok[y:y + g.height, x:x + g.width]).any(): return False
    return True

def layout(gs, ok, y0, y1, yc, wmax, ratio, gap):
    """the widest layout of the stacked characters gs inside the face mask ok, between y0 and y1 (fractions of the height), as near
    as it can to a block centred on yc. The upper character is ratio times the lower one's width, or narrower where the roof of the
    piece does not leave room for that (it never shrinks the lower one)"""
    W, H = ok.shape[1], ok.shape[0]
    def stack(sh):
        bh = sum(g.height for g in sh) + gap * H * (len(sh) - 1)
        if bh > (y1 - y0) * H: return None
        for top in sorted(np.arange(y0 * H, y1 * H - bh + 1, 2), key=lambda t: abs(t + bh / 2 - yc * H)):
            parts, y = [], top
            for g in sh: parts.append((g, int(round(W / 2 - cx_of(g))), int(round(y)))); y += g.height + gap * H
            if fits(parts, ok): return parts
        return None
    for w in np.arange(wmax, .2, -.01):
        if len(gs) == 1:
            p = stack([shaped(gs[0], w * W)])
            if p: return p
            continue
        bot = shaped(gs[-1], w * W)
        for r in np.arange(ratio, .86, -.02):
            p = stack([shaped(gs[0], w * W * r), bot])
            if p: return p
    return []

def cell(font, text, ok):
    if len(text) == 1:
        parts = layout([ink(font, text)], ok, .3, .93, .6, .56, 1, 0)
    else:
        # as on real 隷書 pieces (compared with the user's photos): the two characters of nearly the same width (the upper one a
        # little narrower), close together, the pair as wide as the face allows and centred a little below the middle
        parts = layout([ink(font, c) for c in text], ok, .15, .97, .575, .84, .96, .02)
    A = Image.new('L', (CW * SS, CH * SS), 0)
    for g, x, y in parts: A.paste(g, (x, y), g)
    A = A.resize((CW, CH), Image.LANCZOS)
    a = np.array(A).astype(np.float32) / 255
    h = np.power(np.clip(np.array(A.filter(ImageFilter.BoxBlur(3))).astype(np.float32) / 255, 0, 1), .7)
    out = np.zeros((CH, CW, 4), np.uint8); v = np.round(255 * (1 - h)).astype(np.uint8)
    out[:, :, 0] = out[:, :, 1] = out[:, :, 2] = v; out[:, :, 3] = np.round(a * 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')

def main():
    font = ImageFont.truetype(sys.argv[1], EM)
    ok = inside(CW * SS, CH * SS, .02)
    sheet = Image.new('RGBA', (CW * 5, CH * 3), (255, 255, 255, 0))
    # the promoted sides: real 隷書 sets carve them in cursive (草書), so they are taken from the 水無瀬 sheet (its licence:
    # shogi/pieces/README.md); the rest in 隷書
    mi = Image.open(os.path.join(ROOT, 'images', 'atlas', 'shogi-glyphs-minase.png')).convert('RGBA')
    for i, t in enumerate(TEXT):
        at = ((i % 5) * CW, (i // 5) * CH)
        sheet.paste(mi.crop(at + (at[0] + CW, at[1] + CH)) if 8 <= i <= 13 else cell(font, t, ok), at)
    sheet.save(os.path.join(ROOT, 'images', 'atlas', 'shogi-glyphs-reisho.png')); print('reisho')
main()

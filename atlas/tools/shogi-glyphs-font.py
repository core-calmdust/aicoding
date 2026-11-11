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

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
CW, CH = 256, 296
TEXT = ['歩兵', '香車', '桂馬', '銀将', '角行', '飛車', '金将', '玉将', 'と', '杏', '圭', '全', '龍馬', '龍王', '王将']
EM = 600
SH, SW = (.47 - .25) / .94, .335 / .4   # the face: shoulder height (from the tip) and width (of the full width)

def ink(font, ch):
    """one character's ink, clean: the scanned font's loose specks of dry brush are dropped (carved pieces have clean strokes)"""
    m = font.getmask(ch); im = Image.frombytes('L', m.size, bytes(m)); a = np.array(im) > 100
    lab, n = label(a); sizes = np.bincount(lab.ravel())
    keep = np.zeros_like(a)
    for i in range(1, n + 1):
        if sizes[i] >= a.sum() * .004: keep |= lab == i
    im = Image.fromarray(np.where(keep, np.array(im), 0).astype(np.uint8)).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(3))   # (a little bolder, as cut and lacquered)
    im = im.point(lambda v: 0 if v < 70 else 255 if v > 150 else int((v - 70) * 255 / 80))
    bb = im.getbbox(); return im.crop(bb)

def inside(cw, ch, inset):
    """the 3D face in the cell, shrunk by inset (fraction of the width)"""
    m = Image.new('L', (cw, ch), 0); d = ImageDraw.Draw(m)
    d.polygon([(cw / 2, 0), (cw / 2 + SW * cw / 2, SH * ch), (cw, ch), (0, ch), (cw / 2 - SW * cw / 2, SH * ch)], fill=255)
    return np.array(m.filter(ImageFilter.MinFilter(2 * int(inset * cw) + 1))) > 128

FLAT = .74   # 隷書 on pieces: wide and flat characters

def place(g, ok, cy, hmax, A):
    """the largest size at which g, centred on (0.5, cy), stays inside ok and within hmax of the height; pasted into A"""
    lo, hi = .01, 4.0
    for _ in range(30):
        k = (lo + hi) / 2; w, h = max(1, round(g.width * k)), max(1, round(g.height * k * FLAT))
        if h > hmax * CH: hi = k; continue
        t = Image.new('L', (CW, CH), 0); t.paste(g.resize((w, h), Image.LANCZOS), (round(CW / 2 - w / 2), round(cy * CH - h / 2)))
        if ((np.array(t) > 60) & ~ok).any(): hi = k
        else: lo = k
    k = lo; w, h = max(1, round(g.width * k)), max(1, round(g.height * k * FLAT))
    A.paste(g.resize((w, h), Image.LANCZOS), (round(CW / 2 - w / 2), round(cy * CH - h / 2)), g.resize((w, h), Image.LANCZOS))
    return h / CH

def cell(font, text, ok):
    A = Image.new('L', (CW, CH), 0)
    if len(text) == 1: place(ink(font, text), ok, .58, .5, A)
    else:
        # as on real 隷書 pieces: each character as wide as the face lets it be at its height (so the lower one is the larger),
        # the two close together, the pair filling the face from under the tip to near the bottom
        top, bot = ink(font, text[0]), ink(font, text[1])
        Y0, Y1, GAP = .14, .93, .03
        hb = place(bot, ok, Y1 - .2, .40, Image.new('L', (CW, CH), 0))
        place(bot, ok, Y1 - hb / 2, .40, A)
        yt1 = Y1 - hb - GAP; ht = place(top, ok, (Y0 + yt1) / 2, yt1 - Y0, Image.new('L', (CW, CH), 0))
        place(top, ok, yt1 - ht / 2, yt1 - Y0, A)
    a = np.array(A).astype(np.float32) / 255
    h = np.power(np.clip(np.array(A.filter(ImageFilter.BoxBlur(3))).astype(np.float32) / 255, 0, 1), .7)
    out = np.zeros((CH, CW, 4), np.uint8); v = np.round(255 * (1 - h)).astype(np.uint8)
    out[:, :, 0] = out[:, :, 1] = out[:, :, 2] = v; out[:, :, 3] = np.round(a * 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')

def main():
    font = ImageFont.truetype(sys.argv[1], EM)
    ok = inside(CW, CH, .05)
    sheet = Image.new('RGBA', (CW * 5, CH * 3), (255, 255, 255, 0))
    # the promoted sides: real 隷書 sets carve them in cursive (草書), so they are taken from the 水無瀬 sheet (its licence:
    # shogi/pieces/README.md); the rest in 隷書
    mi = Image.open(os.path.join(ROOT, 'images', 'atlas', 'shogi-glyphs-minase.png')).convert('RGBA')
    for i, t in enumerate(TEXT):
        at = ((i % 5) * CW, (i // 5) * CH)
        sheet.paste(mi.crop(at + (at[0] + CW, at[1] + CH)) if 8 <= i <= 13 else cell(font, t, ok), at)
    sheet.save(os.path.join(ROOT, 'images', 'atlas', 'shogi-glyphs-reisho.png')); print('reisho')
main()

# Writes images/atlas/shogi-glyphs-reisho.png: the 隷書 (clerical script) 3D piece set, set from the free brush font 青柳隷書しも
# (aoyagireisyosimo_otf_2_02.otf, SIMO / calligraphy by 青柳衡山; free, commercial use allowed, no conditions — its readme). The font
# file is not kept in the repository: python3 atlas/tools/shogi-glyphs-font.py /path/to/aoyagireisyosimo_otf_2_02.otf
# Each cell 256×296 (5 × 3, the order of SHEET_KEYS in atlas/models/shogi.js), as the other sheets: alpha = the lacquer, grey = its
# height (dark = the crown of the stroke). The two characters are stacked as on real 隷書 pieces (tight, wide and flat), as large as
# they go while staying inside the 3D piece's face (atlas/models/shogi.js pieceGeo: shoulders 23.4% from the tip, 84% of the width).
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
CW, CH = 256, 296
TEXT = ['歩兵', '香車', '桂馬', '銀将', '角行', '飛車', '金将', '玉将', 'と', '杏', '圭', '全', '龍馬', '龍王', '王将']
EM = 600
SH, SW = (.47 - .25) / .94, .335 / .4   # the face: shoulder height (from the tip) and width (of the full width)

def ink(font, ch):
    m = font.getmask(ch); im = Image.frombytes('L', m.size, bytes(m)); bb = im.getbbox(); return im.crop(bb)

def block(font, text):
    gl = [ink(font, c) for c in text]
    if len(gl) == 1: return gl[0]
    gap = int(EM * .05); W = max(g.width for g in gl); H = sum(g.height for g in gl) + gap
    out = Image.new('L', (W, H), 0); y = 0
    for g in gl: out.paste(g, ((W - g.width) // 2, y)); y += g.height + gap
    return out

def inside(cw, ch, inset):
    """the 3D face in the cell, shrunk by inset (fraction of the width)"""
    m = Image.new('L', (cw, ch), 0); d = ImageDraw.Draw(m)
    d.polygon([(cw / 2, 0), (cw / 2 + SW * cw / 2, SH * ch), (cw, ch), (0, ch), (cw / 2 - SW * cw / 2, SH * ch)], fill=255)
    return np.array(m.filter(ImageFilter.MinFilter(2 * int(inset * cw) + 1))) > 128

def cell(font, text, ok):
    b = block(font, text); one = len(text) == 1
    # the target: two characters fill the face from below the tip to near the bottom; one sits a little below the middle
    cy = .58 if one else .545; hmax = .52 if one else .80; wmax = .70 if one else .80
    k = min(hmax * CH / b.height, wmax * CW / b.width)
    while True:
        g = b.resize((max(1, round(b.width * k)), max(1, round(b.height * k))), Image.LANCZOS)
        x0, y0 = round(CW / 2 - g.width / 2), round(cy * CH - g.height / 2)
        A = Image.new('L', (CW, CH), 0); A.paste(g, (x0, y0)); a = np.array(A) > 40
        if not (a & ~ok).any() or k < .05: break
        k *= .98
    a = np.array(A).astype(np.float32) / 255
    h = np.power(np.clip(np.array(A.filter(ImageFilter.BoxBlur(3))).astype(np.float32) / 255, 0, 1), .7)
    out = np.zeros((CH, CW, 4), np.uint8); v = np.round(255 * (1 - h)).astype(np.uint8)
    out[:, :, 0] = out[:, :, 1] = out[:, :, 2] = v; out[:, :, 3] = np.round(a * 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')

def main():
    font = ImageFont.truetype(sys.argv[1], EM)
    ok = inside(CW, CH, .07)
    sheet = Image.new('RGBA', (CW * 5, CH * 3), (255, 255, 255, 0))
    for i, t in enumerate(TEXT): sheet.paste(cell(font, t, ok), ((i % 5) * CW, (i // 5) * CH))
    sheet.save(os.path.join(ROOT, 'images', 'atlas', 'shogi-glyphs-reisho.png')); print('reisho')
main()

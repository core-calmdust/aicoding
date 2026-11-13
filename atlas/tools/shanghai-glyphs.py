#!/usr/bin/env python3
"""上海の牌の文字（萬子・風牌・發・中・花／季節の漢字）を、牌一式を真上から撮った参考画像から抜き出して
atlas/img/shanghai-glyphs.png（1枚のシート）にする。2026-11-13、ユーザー提供の日本式の牌の写真（9列×5段）から。
使い方: python3 atlas/tools/shanghai-glyphs.py <日本式の牌の画像> <花牌入りの画像> atlas/img/shanghai-glyphs.png
シート: 8列×3段のセル（各 GW×GH、牌の面と同じ縦横比）。チャンネルごとにインクの濃さ（0〜255）：
  R = 黒の文字（萬子の数字・東南西北）、G = 赤の文字（萬・中・花／季節の漢字）、B = 緑の文字（發）
セルの順: 0〜8 一〜九萬、9〜12 東南西北、13 發、14 中、15〜22 春夏秋冬梅蘭菊竹（漢字だけを大きく）
読む側: atlas/models/shanghai.js（GLYPH の表と drawFace）"""
import sys
import numpy as np
from PIL import Image

GW, GH = 280, 390
def cells(path):
    im = Image.open(path).convert('RGB'); W, H = im.size; cw, ch = W / 9, H / 5; M = 16
    return lambda c, r: np.array(im.crop((int(c * cw + M), int(r * ch + M), int((c + 1) * cw - M), int((r + 1) * ch - M))).resize((GW, GH), Image.LANCZOS)).astype(float)

def ink(a, lo=50, span=105):
    m = np.clip((255 - a.min(axis=2) - lo) / span, 0, 1)
    m[:6, :] = 0; m[-6:, :] = 0; m[:, :6] = 0; m[:, -6:] = 0   # (the tile's rounded rim)
    return m

def split_row(m):   # 萬子: the emptiest row between the numeral and 萬
    rows = m.sum(1); a, b = int(GH * .3), int(GH * .55)
    return a + int(np.argmin(rows[a:b]))

def main(src_a, src_b, out):
    A, B = cells(src_a), cells(src_b)
    sheet = np.zeros((3 * GH, 8 * GW, 3))
    def put(k, ch, m):
        r, c = divmod(k, 8); sheet[r * GH:(r + 1) * GH, c * GW:(c + 1) * GW, ch] = np.maximum(sheet[r * GH:(r + 1) * GH, c * GW:(c + 1) * GW, ch], m)
    for i in range(9):
        m = ink(A(i, 2)); y = split_row(m); top = m.copy(); top[y:] = 0; bot = m.copy(); bot[:y] = 0
        put(i, 0, top); put(i, 1, bot)
    for i, c in enumerate([0, 1, 2, 3]): put(9 + i, 0, ink(A(c, 3)))
    put(13, 2, ink(A(5, 3))); put(14, 1, ink(A(6, 3)))
    # 花／季節: the small red kanji in the top left of each tile (picture 2, bottom row: 春夏秋冬梅蘭菊竹), cut out and scaled up
    for i in range(8):
        a = B(i, 4); red = (a[:, :, 0] - a[:, :, 1] > 45) & (a[:, :, 0] - a[:, :, 2] > 30)
        m = ink(a, 40, 100) * red; m[int(GH * .32):, :] = 0; m[:, int(GW * .55):] = 0
        ys, xs = np.where(m > .2); y0, y1, x0, x1 = ys.min() - 4, ys.max() + 5, xs.min() - 4, xs.max() + 5
        k = Image.fromarray((m[y0:y1, x0:x1] * 255).astype('uint8')); s = min((GW - 40) / k.width, (GH - 40) / k.height)
        k = k.resize((int(k.width * s), int(k.height * s)), Image.LANCZOS); cell = np.zeros((GH, GW))
        ox, oy = (GW - k.width) // 2, (GH - k.height) // 2; cell[oy:oy + k.height, ox:ox + k.width] = np.array(k) / 255
        put(15 + i, 1, cell)
    Image.fromarray((sheet * 255).astype('uint8')).save(out, optimize=True)

if __name__ == '__main__':
    main(*sys.argv[1:4])

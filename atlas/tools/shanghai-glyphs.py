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

if __name__ == '__main__' and sys.argv[1:2] not in (['art'], ['vec'], ['tidy']):
    main(*sys.argv[1:4])

# ---- 筒子・索子・花／季節の絵（2026-11-14）：日本式の牌の写真（2枚目）から、色つきのまま抜き出す ----
# 使い方: python3 atlas/tools/shanghai-glyphs.py art <花牌入りの画像> atlas/img/shanghai-art.png
# シート: 8列×4段の RGBA セル（GW×GH）。インクの濃さ＝不透明度、色は牌の塗り5色に寄せる（黒・赤・緑・紺・金）。
# セルの順: 0〜8 一〜九筒、9〜17 一〜九索（9＝一索の鳥）、18〜21 梅蘭菊竹、22〜25 春夏秋冬
PAL = {'k': (20, 20, 20), 'r': (208, 18, 42), 'g': (18, 112, 64), 'b': (28, 60, 134), 'y': (224, 168, 28)}
# 2026-11-14 (ユーザー：赤に緑が混ざる、文字は赤だけ等の区分けができていない): colours by region, not by pixel —
#  1. only clearly coloured pixels vote (by hue); dark, grey and pale edge pixels are left open
#  2. a majority filter over the votes removes specks
#  3. the open pixels take the colour of the nearest vote (the photo's dark outlines go with the stroke they belong to)
#  4. each connected stroke whose colour is clear enough (≥ 70 %) is painted in that one colour
#  5. small holes inside the strokes (glints of the photo) are filled
from scipy import ndimage as ndi
CODE = {'k': 0, 'r': 1, 'g': 2, 'b': 3, 'y': 4}; NAME = 'krgby'
def paint(a, force=None):
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    alpha = ink(a, 38, 110)
    inkm = alpha > .25
    alpha = np.where(ndi.binary_fill_holes(inkm) & ~inkm & (ndi.binary_closing(inkm, iterations=2)), 1, alpha)   # (pinholes)
    inkm = alpha > .25
    mx, mn = a.max(axis=2), a.min(axis=2); sat = (mx - mn) / np.maximum(mx, 1)
    d = np.maximum(mx - mn, 1e-6); h = np.zeros(r.shape)
    m = mx == r; h[m] = ((g - b)[m] / d[m]) % 6
    m = mx == g; h[m] = (b - r)[m] / d[m] + 2
    m = mx == b; h[m] = (r - g)[m] / d[m] + 4
    h *= 60
    vote = np.full(r.shape, -1)
    col = inkm & (sat > .32) & (mx - mn > 40) & (mx > 70)
    vote[col & ((h < 22) | (h >= 330))] = 1
    vote[col & (h >= 22) & (h < 70)] = 4
    vote[col & (h >= 70) & (h < 196)] = 2
    vote[col & (h >= 196) & (h < 330)] = 3
    vote[inkm & (mx < 60) & (sat < .25)] = 0   # true black (the bird's outline)
    # majority filter (radius 3) over the votes
    best = np.full(r.shape, -1); bestn = np.zeros(r.shape)
    for c in range(5):
        n = ndi.uniform_filter((vote == c).astype(float), 7)
        upd = n > bestn; best[upd] = c; bestn[upd] = n[upd]
    best[bestn < .08] = -1
    # the open ink pixels: the nearest vote
    if (best >= 0).any():
        idx = ndi.distance_transform_edt(best < 0, return_distances=False, return_indices=True)
        lab = best[idx[0], idx[1]]
    else:
        lab = np.zeros(r.shape, int)
    lab[~inkm] = -1
    # one colour per stroke when it is clear
    comp, n = ndi.label(inkm)
    for i in range(1, n + 1):
        m = comp == i; cnt = np.bincount(lab[m].clip(0), minlength=5); k = int(cnt.argmax())
        if cnt[k] >= .7 * m.sum(): lab[m] = k
    if force is not None: force(lab, inkm)
    out = np.zeros(a.shape[:2] + (4,))
    for k, c in PAL.items():
        m = lab == CODE[k]; out[m, 0], out[m, 1], out[m, 2] = c
    out[:, :, 3] = alpha * inkm + alpha * 0
    return out

def art(src, out):
    C = cells(src); sheet = np.zeros((4 * GH, 8 * GW, 4))
    order = [(c, 0) for c in range(9)] + [(c, 1) for c in range(9)] + [(c, 4) for c in (4, 5, 6, 7, 0, 1, 2, 3)]
    yy, xx = np.mgrid[0:GH, 0:GW]
    for k, (c, r) in enumerate(order):
        def force(lab, inkm, k=k):
            # 索子 (not the bird): green, and the red sticks stay red (their own stroke voted red)
            if 10 <= k <= 17: lab[inkm & (lab != 1)] = 2
            # 花／季節: the kanji (top left) red only, the number (top right) navy only, the picture red or green
            if k >= 18:
                kan = (xx < GW * .5) & (yy < GH * .3); num = (xx > GW * .68) & (yy < GH * .24)
                lab[inkm & kan] = 1; lab[inkm & num] = 3
                pic = inkm & ~kan & ~num; lab[pic & (lab != 1)] = 2
            # 筒子: navy and red only
            if k <= 8: lab[inkm & (lab != 1)] = 3
        p = paint(C(c, r), force)
        y, x = divmod(k, 8); sheet[y * GH:(y + 1) * GH, x * GW:(x + 1) * GW] = p
    # 筒子 (cells 0–8) and 一索 (cell 9): drawn clean as vectors (atlas/tools/shanghai-svg/pin1–9.svg, bird.svg; rendered with
    # rsvg-convert) — the photo's circles came out smeared, and 一索 is our own drawing of the classic layout (2026-11-14)
    import os, subprocess, io
    here = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shanghai-svg')
    def vec(name, k):
        png = subprocess.run(['rsvg-convert', '-w', str(GW), '-h', str(GH), os.path.join(here, name)], capture_output=True, check=True).stdout
        b = np.array(Image.open(io.BytesIO(png)).convert('RGBA')).astype(float); b[:, :, 3] /= 255
        y, x = divmod(k, 8); sheet[y * GH:(y + 1) * GH, x * GW:(x + 1) * GW] = b
    for n in range(1, 10): vec('pin%d.svg' % n, n - 1)
    vec('bird.svg', 9)
    for n in range(2, 10): vec('sou%d.svg' % n, 8 + n)   # 索子 too (cells 10–17)
    s = sheet.copy(); s[:, :, 3] *= 255
    Image.fromarray(s.astype('uint8'), 'RGBA').save(out, optimize=True)

if __name__ == '__main__' and len(sys.argv) > 1 and sys.argv[1] == 'art':
    art(sys.argv[2], sys.argv[3])


# ---- 清書（2026-11-14、Fable）：元の写真なしで、いまのシートを直接整える ----
# ユーザー：潰れた模様を整理する／索子は定番から大きく変えない。
#   python3 atlas/tools/shanghai-svg/gen.py                                   （筒子・索子・一索の SVG を作る）
#   python3 atlas/tools/shanghai-glyphs.py vec  atlas/img/shanghai-art.png    （その SVG をセル 0〜17 に描き込み、花／季節 18〜25 の絵のにじみ・欠け・粒を取る）
#   python3 atlas/tools/shanghai-glyphs.py tidy atlas/img/shanghai-glyphs.png （文字シートの縁のがたつき・粒・針穴を取る）
# 整え方（smooth）：3倍に拡大 → ぼかして二値化（縁がなめらかな面になる）→ 小さな粒を消し、針穴を埋める → 元の大きさへ。
def smooth(m, sigma, speck=30, hole=14, up=3):
    big = np.array(Image.fromarray((np.clip(m, 0, 1) * 255).astype('uint8')).resize((m.shape[1] * up, m.shape[0] * up), Image.BICUBIC)).astype(float) / 255
    b = ndi.gaussian_filter(big, sigma * up) > .5
    lab, n = ndi.label(b)
    if n:
        sz = ndi.sum(b, lab, range(1, n + 1)); b &= ~np.isin(lab, 1 + np.where(sz < speck * up * up)[0])
    lab, n = ndi.label(~b)
    if n:
        sz = ndi.sum(~b, lab, range(1, n + 1)); b |= np.isin(lab, 1 + np.where(sz < hole * up * up)[0])
    return np.array(Image.fromarray((b * 255).astype('uint8')).resize((m.shape[1], m.shape[0]), Image.LANCZOS)).astype(float) / 255

def vec(out):
    import os, subprocess, io
    sheet = np.array(Image.open(out).convert('RGBA')).astype(float)
    here = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shanghai-svg')
    def put(name, k):
        png = subprocess.run(['rsvg-convert', '-w', str(GW), '-h', str(GH), os.path.join(here, name)], capture_output=True, check=True).stdout
        c = np.array(Image.open(io.BytesIO(png)).convert('RGBA')).astype(float)
        # the SVG's white (#fafaf6 = the uncut face) becomes transparent: only the paint is in the sheet (赤ドラ recolours every painted pixel)
        w = np.array([250., 250., 246.]); t = np.clip(np.abs(c[:, :, :3] - w).max(2) / 222, 0, 1)
        c[:, :, :3] = np.clip(w + (c[:, :, :3] - w) / np.maximum(t, .05)[:, :, None], 0, 255); c[:, :, 3] *= t
        y, x = divmod(k, 8); sheet[y * GH:(y + 1) * GH, x * GW:(x + 1) * GW] = c
    for n in range(1, 10): put('pin%d.svg' % n, n - 1)
    put('bird.svg', 9)
    for n in range(2, 10): put('sou%d.svg' % n, 8 + n)
    # 花／季節の絵：色ごとの面をなめらかにして、粒と針穴を取る（色は面ごとに1色のまま）
    cols = [np.array(c, float) for c in PAL.values()]
    for k in range(18, 26):
        y, x = divmod(k, 8); c = sheet[y * GH:(y + 1) * GH, x * GW:(x + 1) * GW]
        a = c[:, :, 3] / 255; rgb = np.zeros((GH, GW, 3)); tot = np.zeros((GH, GW))
        allm = smooth(a, 1.25)                                                    # 絵の外形（色の境で割れないよう全体で1回）
        ms = [ndi.gaussian_filter(a * (np.abs(c[:, :, :3] - col).sum(2) < 30), 1.6) for col in cols]
        win = np.argmax(np.stack(ms), 0)
        for i, col in enumerate(cols):
            w = ndi.gaussian_filter((win == i).astype(float), .7); rgb += w[:, :, None] * col; tot += w
        c[:, :, :3] = rgb / np.maximum(tot, 1e-6)[:, :, None]; c[:, :, 3] = allm * 255
    Image.fromarray(sheet.clip(0, 255).astype('uint8'), 'RGBA').save(out, optimize=True)

def tidy(out):
    sheet = np.array(Image.open(out).convert('RGB')).astype(float)
    for k in range(24):
        y, x = divmod(k, 8)
        for ch in range(3):
            m = sheet[y * GH:(y + 1) * GH, x * GW:(x + 1) * GW, ch] / 255
            if m.max() > .2: sheet[y * GH:(y + 1) * GH, x * GW:(x + 1) * GW, ch] = smooth(m, 1.5 if k >= 15 else .95, hole=8 if k < 15 else 14) * 255
    Image.fromarray(sheet.clip(0, 255).astype('uint8')).save(out, optimize=True)

if __name__ == '__main__' and sys.argv[1:2] == ['vec']: vec(sys.argv[2])
if __name__ == '__main__' and sys.argv[1:2] == ['tidy']: tidy(sys.argv[2])

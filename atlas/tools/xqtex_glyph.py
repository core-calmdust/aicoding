# The xiangqi characters as masks: 楷書 (LXGW WenKai TC Bold, emboldened) and 明朝 (Noto Serif CJK TC Black).
# 傌 / 俥 are missing from the WenKai subset: built from 仕's 亻 and 馬 / 車.
import json, os, numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw, ImageFont, ImageFilter
FONTS = os.environ.get('XQ_FONTS', '/tmp/fonts')
MING = ('/usr/share/fonts/opentype/noto/NotoSerifCJK-Black.ttc', 3)
_cmap = None
def cmap():
    global _cmap
    if _cmap is None:
        need = json.load(open(os.path.join(FONTS, 'need.json'))); _cmap = {}
        for i, (url, chs) in enumerate(need.items()):
            for ch in chs: _cmap[ch] = os.path.join(FONTS, f'wk{i}.ttf')
    return _cmap
def _render(ch, path, index=0, size=480):
    f = ImageFont.truetype(path, size, index=index); S = size * 2
    im = Image.new('L', (S, S), 0); ImageDraw.Draw(im).text((S // 4, S // 4), ch, font=f, fill=255); return im.crop(im.getbbox())
def _kai(ch):
    cm = cmap()
    if ch in cm: return _render(ch, cm[ch])
    sh = _render('仕', cm['仕']); a = np.array(sh) > 60; lab, n = ndimage.label(a); w = a.shape[1]; keep = np.zeros_like(a)
    for k in range(1, n + 1):
        ys, xs = np.where(lab == k)
        if xs.mean() < w * .33: keep |= lab == k
    xs = np.where(keep.any(0))[0]; rad = Image.fromarray(np.where(keep, np.array(sh), 0).astype('uint8')).crop((0, 0, xs.max() + 1, a.shape[0]))
    src = {'傌': '馬', '俥': '車'}[ch]; r = _render(src, cm[src]); rw = int(r.size[0] * .68); r = r.resize((rw, r.size[1]), Image.LANCZOS)
    gap = int(w * .06); Hh = max(rad.size[1], r.size[1]); out = Image.new('L', (rad.size[0] + gap + rw, Hh), 0)
    out.paste(rad, (0, (Hh - rad.size[1]) // 2)); out.paste(r, (rad.size[0] + gap, (Hh - r.size[1]) // 2)); return out
def glyph(ch, style='kai', size=200, bold=None):
    """a tight mask whose larger side is `size` px"""
    if style == 'kai':
        g = _kai(ch); b = 5 if bold is None else bold
        if b: g = g.filter(ImageFilter.MaxFilter(b))
    else:
        g = _render(ch, MING[0], MING[1])
    k = size / max(g.size); return g.resize((max(1, round(g.size[0] * k)), max(1, round(g.size[1] * k))), Image.LANCZOS)

# python3 mahjong/tools/make-sil.py — the silhouettes of locked characters (ユーザー 2026-11-15: an outline only, nothing of her shows)
# needs: pip install rembg onnxruntime (model isnet-anime). For each <id>.webp / <id>-face.webp in images/mahjong/chara it writes
# <id>-sil.webp (full art, 480 wide) and <id>-silf.webp (its top square, 224): black, the cut-out mask made hard-edged, lossless.
import os
from PIL import Image, ImageFilter
from rembg import new_session, remove
D = os.path.join(os.path.dirname(__file__), '..', '..', 'images', 'mahjong', 'chara')
S = new_session('isnet-anime')
ids = sorted({f[:-5] for f in os.listdir(D) if f.endswith('.webp') and '-' not in f})
for i in ids:
    for src, dst, w in [(i + '.webp', i + '-sil.webp', 480)]:
        im = Image.open(os.path.join(D, src)).convert('RGB')
        a = remove(im, session=S, only_mask=True).convert('L')
        if w and a.width > w: a = a.resize((w, round(a.height * w / a.width)), Image.LANCZOS)
        a = a.point(lambda v: 255 if v > 110 else 0).filter(ImageFilter.GaussianBlur(.7))
        out = Image.new('RGBA', a.size, (0, 0, 0, 0)); out.putalpha(a)
        out.save(os.path.join(D, dst), 'WEBP', lossless=True, quality=100, method=6)
        # the small one (lists): the top square of the full outline — head and shoulders, wider than the face crop, so the shape reads
        out.crop((0, 0, out.width, out.width)).resize((224, 224), Image.LANCZOS).save(os.path.join(D, i + '-silf.webp'), 'WEBP', lossless=True, quality=100, method=6)
print(len(ids), 'characters')

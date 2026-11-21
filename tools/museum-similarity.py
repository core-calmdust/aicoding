#!/usr/bin/env python3
"""How closely a museum exhibit's render resembles a photograph of the real object (claude/museum-spec.md, 品質の基準).

  python3 tools/museum-similarity.py REF.jpg RENDER.png [--box x0,y0,x1,y1] [--out side_by_side.png]

REF is cropped to --box (the object's edges in the photograph; default: the whole image) and both are resized to the same
size. Scores, 0–100 (higher = closer):
  structure  SSIM of the luminance at 256 px (shapes and their placing)
  edges      correlation of the blurred edge maps at 256 px (where the pattern lines run)
  layout     colour of 16 × 16 blocks compared in Lab (where light and dark, warm and cool areas are)
  palette    overlap of the Lab colour histograms (the materials' colours, regardless of where)
  total      0.35 structure + 0.25 edges + 0.25 layout + 0.15 palette
"""
import sys, argparse
import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity
from skimage.color import rgb2lab
from skimage.filters import sobel, gaussian


def load(p, box=None, size=(256, 256)):
    im = Image.open(p).convert('RGB')
    if box: im = im.crop(box)
    return im, np.asarray(im.resize(size, Image.LANCZOS)).astype(float) / 255


def scores(a, b):
    la, lb = rgb2lab(a), rgb2lab(b)
    st = structural_similarity(la[..., 0], lb[..., 0], data_range=100)
    ea, eb = gaussian(sobel(la[..., 0] / 100), 1.5), gaussian(sobel(lb[..., 0] / 100), 1.5)
    ed = np.corrcoef(ea.ravel(), eb.ravel())[0, 1]
    blk = lambda L: L.reshape(16, 16, 16, 16, 3).mean(axis=(1, 3))
    de = np.sqrt(((blk(la) - blk(lb)) ** 2).sum(-1)).mean()
    lay = max(0, 1 - de / 40)
    h = lambda L: np.histogramdd(L.reshape(-1, 3), bins=(8, 8, 8), range=((0, 100), (-60, 60), (-60, 60)))[0].ravel() / (L.shape[0] * L.shape[1])
    pal = np.minimum(h(la), h(lb)).sum()
    r = dict(structure=max(0, st) * 100, edges=max(0, ed) * 100, layout=lay * 100, palette=pal * 100)
    r['total'] = .35 * r['structure'] + .25 * r['edges'] + .25 * r['layout'] + .15 * r['palette']
    return r


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('ref'); ap.add_argument('render'); ap.add_argument('--box'); ap.add_argument('--out')
    a = ap.parse_args(); box = tuple(int(v) for v in a.box.split(',')) if a.box else None
    ri, ra = load(a.ref, box); ii, ia = load(a.render)
    r = scores(ra, ia)
    print('  '.join(f'{k} {v:5.1f}' for k, v in r.items()))
    if a.out:
        w = 600; A = ri.resize((w, round(w * ri.height / ri.width))); Bm = ii.resize((w, A.height)); c = Image.new('RGB', (w * 2 + 10, A.height), (230, 230, 230)); c.paste(A, (0, 0)); c.paste(Bm, (w + 10, 0)); c.save(a.out)

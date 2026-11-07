#!/usr/bin/env python3
"""Post-process for the portal's game icons (images/atlas/<id>.webp, 320×320).
Input: the 640px (or larger) PNG that atlas/tools/icons.html renders (window.SHOT).
Usage: python3 atlas/tools/icon-post.py shot.png images/atlas/<id>.webp

Position rule (fixed 2026-11-07, keep it for every new icon):
  1. crop to the content and contain-fit into 320×320
  2. the widest row (the plinth's left / right corners) at y = 204 (scaled down around that row only if the top would clip)
  3. the solid plinth (alpha > 200, not the soft floor shadow) centred across: its left and right corners equally far from the edges
  4. the floor shadow's tail past the right edge fades out over the last 14 px (never a hard cut)
The plinth itself must be the true square (icons3d.js rbox(..., true)) so the board face sits in the middle of it."""
import sys
import numpy as np
from PIL import Image

def post(src, S=320, Y=204, fade=14):
    im = Image.open(src).convert('RGBA'); a = np.array(im)[:, :, 3]
    ys, xs = np.where(a > 8); im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    w, h = im.size; k = S / max(w, h); im = im.resize((round(w * k), round(h * k)), Image.LANCZOS); w, h = im.size
    wr = int(np.argmax((np.array(im)[:, :, 3] > 8).sum(1)))
    if wr > Y: k2 = Y / wr; im = im.resize((round(w * k2), round(h * k2)), Image.LANCZOS); w, h = im.size; wr = round(wr * k2)
    out = Image.new('RGBA', (S, S)); out.alpha_composite(im, ((S - w) // 2, Y - wr))
    A = np.array(out)[:, :, 3]; cols = np.where((A > 200).any(0))[0]; dx = int(round(S / 2 - (cols.min() + cols.max()) / 2))
    big = Image.new('RGBA', (S + 2 * abs(dx) + 2, S)); big.alpha_composite(out, (abs(dx) + 1 + dx, 0))
    o = np.array(big.crop((abs(dx) + 1, 0, abs(dx) + 1 + S, S))).astype(float); solid = o[:, :, 3] > 200
    for y in range(S):
        c = np.where(solid[y])[0]; br = c.max() if len(c) else -1
        for k in range(fade):
            x = S - 1 - k
            if x > br + 1: o[y, x, 3] *= (k + .5) / fade
    return Image.fromarray(o.clip(0, 255).astype(np.uint8))

if __name__ == '__main__':
    post(sys.argv[1]).save(sys.argv[2], 'WEBP', quality=90, method=6)

#!/usr/bin/env python3
"""Chess and goose game board (The Met 62.14; Open Access, public domain): the two faces as textures, straightened from the museum's
frontal photographs (DP-29223_002 = the goose side, DP-29223_001 = the chess side).
  python3 goose-maps.py goose.png x0,y0,x1,y1 chess.png x0,y0,x1,y1 outdir      (the boxes: the board in each photograph)
→ goose-go.webp / goose-ch.webp (2048², the face itself) and goose-go-r.webp / goose-ch-r.webp (1024², roughness: ivory duller than the polished ebony).
The photographs are evenly lit from the front, so they serve as the colour of the surface; the grey paper round the board is cut away."""
import sys
import numpy as np
from PIL import Image, ImageFilter

def face(src, box, dst, N=2048):
    im = Image.open(src).convert('RGB').crop(tuple(int(v) for v in box.split(','))).resize((N, N), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    # the very edge of the photograph's board is its rounded arris catching the light: keep, but the paper beyond must not show
    im.save(dst + '.webp', quality=88, method=6)
    L = (.3 * a[..., 0] + .59 * a[..., 1] + .11 * a[..., 2]) / 255
    r = np.clip(.3 + np.clip((L - .25) / .45, 0, 1) * .28, 0, 1)          # ebony .30 … ivory .58
    Image.fromarray((r * 255).astype(np.uint8)).resize((1024, 1024), Image.LANCZOS).filter(ImageFilter.GaussianBlur(.6)).save(dst + '-r.webp', quality=85, method=6)
    print(dst, im.size)

if __name__ == '__main__':
    g, gb, c, cb, o = sys.argv[1:6]
    face(g, gb, o + '/goose-go'); face(c, cb, o + '/goose-ch')

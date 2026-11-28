"""Card back (hanafuda/img/cards/back-*.webp): the black backing paper of a real hanafuda card.
Real backs are black paper with a fine sandy grain: irregular grains of mixed size, a few lighter ones catching the
light, very faint fibres and mottling. The edge is the same paper (the fold that frames the face), worn a little grey.

python3 hanafuda/tools/art/hfback.py <out_dir>   -> back-black.webp, back-black@2x.webp, back-red.webp, back-red@2x.webp
Drawn at 1280 x 2120 (320 x 530 units like the faces), saved at @1x 360 x 596 and @2x 720 x 1193."""
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

W, H = 1280, 2120          # @2x
px = W / 320.0             # pixels per unit


def smooth(rng, s):
    # low-frequency noise, made small and scaled up (fast)
    k = max(1, int(s / 4))
    n = gaussian_filter(rng.standard_normal((H // k + 2, W // k + 2)).astype(np.float32), s / k)
    return np.asarray(Image.fromarray(n).resize((W, H), Image.BILINEAR))


def norm(a):
    a = a - a.mean()
    return a / (a.std() + 1e-9)


def grain(rng):
    # mottled grain: band-passed noise, its coordinates bent by a second noise so the grains join into irregular,
    # worm-like patches (as in the photographed back), not a salt-and-pepper hiss
    from scipy.ndimage import map_coordinates
    g = np.zeros((H, W), np.float32)
    for s, wgt in ((1.4, 0.35), (2.6, 0.7), (4.2, 1.0), (7.0, 0.45)):
        n = rng.standard_normal((H, W)).astype(np.float32)
        g += wgt * norm(gaussian_filter(n, s) - gaussian_filter(n, s * 2.0))
    g = norm(g)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    wx = norm(gaussian_filter(rng.standard_normal((H, W)).astype(np.float32), 6)) * 3.5
    wy = norm(gaussian_filter(rng.standard_normal((H, W)).astype(np.float32), 6)) * 3.5
    g = map_coordinates(g, [yy + wy, xx + wx], order=1, mode='reflect')
    g = g + 0.12 * norm(smooth(rng, 90))
    # about half of the sheet is grain; most of it dull, some catching the light
    lit = np.clip((g + 0.85) / 2.7, 0, 1) ** 1.1
    lit = lit * np.clip(0.8 + 0.4 * norm(gaussian_filter(rng.standard_normal((H, W)).astype(np.float32), 6.0)), 0.25, 1.5)
    sparkle = np.clip((norm(gaussian_filter(rng.standard_normal((H, W)).astype(np.float32), 1.6)) - 2.7) / 1.2, 0, 1)
    return lit, sparkle


def fibres(rng):
    # faint paper fibres: short streaks blurred along one direction
    n = rng.standard_normal((H, W)).astype(np.float32)
    f = gaussian_filter(n, (14, 1.0)) + 0.6 * gaussian_filter(rng.standard_normal((H, W)).astype(np.float32), (1.0, 12))
    return norm(f)


def make(base, seed, out_dir, name):
    rng = np.random.default_rng(seed)
    lit, sparkle = grain(rng)
    fib = fibres(rng)
    mott = norm(smooth(rng, 160))
    base = np.array(base, np.float32) / 255
    grey = np.array((0.50, 0.43, 0.36), np.float32)          # the lit grains: a warm grey, as in the photo
    img = base[None, None, :] * (1 + 0.06 * mott[..., None] + 0.035 * fib[..., None])
    img = img + (grey - base)[None, None, :] * (lit * 0.92)[..., None]
    img = img + (np.array((0.66, 0.59, 0.51)) - img) * (sparkle * 0.45)[..., None]
    # tiny dark pits between grains
    pits = np.clip((-norm(gaussian_filter(rng.standard_normal((H, W)).astype(np.float32), 1.3)) - 1.4) / 1.5, 0, 1)
    img *= (1 - 0.45 * pits)[..., None]
    # the edge: the fold of the paper, worn a little grey, and a faint bevel
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    jag = norm(smooth(rng, 30)) * 0.5 * px
    dx = np.minimum(xx, W - 1 - xx); dy = np.minimum(yy, H - 1 - yy)
    d = np.minimum(dx, dy) + jag
    wear = np.clip(1 - d / (2.2 * px), 0, 1) * 0.22
    img = img + wear[..., None] * (np.array((0.40, 0.36, 0.32)) - img)
    bevel = np.clip(1 - np.abs(d - 4.5 * px) / (2.5 * px), 0, 1) * 0.05
    img *= (1 - bevel)[..., None]
    # rounded corners like the faces
    rr = 3.5 * px
    cx = np.clip(rr - dx, 0, None); cy = np.clip(rr - dy, 0, None)
    dist = np.where((dx < rr) & (dy < rr), rr - np.sqrt(cx ** 2 + cy ** 2), np.minimum(dx, dy))
    alpha = np.clip(dist / (0.7 * px), 0, 1)
    rgba = (np.dstack([np.clip(img, 0, 1), alpha]) * 255).astype(np.uint8)
    im = Image.fromarray(rgba, 'RGBA')
    # cards are shown at most ~190 CSS px wide: @1x 360 px, @2x 720 px (drawn at 1280 and reduced, so the grain stays crisp)
    im.resize((720, 1193), Image.LANCZOS).save(f'{out_dir}/{name}@2x.webp', quality=84, method=6)
    im.resize((360, 596), Image.LANCZOS).save(f'{out_dir}/{name}.webp', quality=86, method=6)
    return im


if __name__ == '__main__':
    out = sys.argv[1]
    make((17, 13, 11), 11, out, 'back-black')
    make((72, 16, 12), 12, out, 'back-red')

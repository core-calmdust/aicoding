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
    # irregular grains: band-passed noise at a few scales, sharpened into blobs (not a uniform hiss, not a pattern)
    g = np.zeros((H, W), np.float32)
    for s, wgt in ((1.8, 0.45), (3.5, 0.8), (6.2, 0.8), (10.5, 0.35)):
        n = rng.standard_normal((H, W)).astype(np.float32)
        b = gaussian_filter(n, s) - gaussian_filter(n, s * 2.2)
        g += wgt * norm(b)
    g = norm(g)
    # the density of grains drifts across the sheet (paper is not even)
    dens = norm(smooth(rng, 90))
    g = g + 0.12 * dens
    # grains: a soft threshold; about half of the sheet is grain, most of it dark grey, a few catch the light
    lit = np.clip((g + 1.0) / 3.0, 0, 1) ** 1.2
    # each grain has its own brightness: some dull, some catching the light
    lit = lit * np.clip(0.75 + 0.45 * norm(gaussian_filter(rng.standard_normal((H, W)).astype(np.float32), 3.0)), 0.2, 1.6)
    sparkle = np.clip((norm(gaussian_filter(rng.standard_normal((H, W)).astype(np.float32), 1.0)) - 2.6) / 1.2, 0, 1)
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
    grey = np.array((0.50, 0.48, 0.46), np.float32)          # the lit grains: a cool grey, as in the photo
    img = base[None, None, :] * (1 + 0.06 * mott[..., None] + 0.035 * fib[..., None])
    img = img + (grey - base)[None, None, :] * (lit * 0.80)[..., None]
    img = img + (np.array((0.68, 0.67, 0.66)) - img) * (sparkle * 0.5)[..., None]
    # tiny dark pits between grains
    pits = np.clip((-norm(gaussian_filter(rng.standard_normal((H, W)).astype(np.float32), 1.3)) - 1.4) / 1.5, 0, 1)
    img *= (1 - 0.45 * pits)[..., None]
    # the edge: the fold of the paper, worn a little grey, and a faint bevel
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    jag = norm(smooth(rng, 30)) * 0.5 * px
    dx = np.minimum(xx, W - 1 - xx); dy = np.minimum(yy, H - 1 - yy)
    d = np.minimum(dx, dy) + jag
    wear = np.clip(1 - d / (2.2 * px), 0, 1) * 0.22
    img = img + wear[..., None] * (np.array((0.42, 0.41, 0.40)) - img)
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
    make((12, 11, 13), 11, out, 'back-black')
    make((70, 14, 13), 12, out, 'back-red')

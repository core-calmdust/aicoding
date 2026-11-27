#!/usr/bin/env python3
"""Breakthrough 2D art (claude/breakthrough-spec.md「盤と駒のデザイン」): procedural, rendered with lighting — no vector look.

Boards  img/bd-<design>-<n>.webp (n = 6, 7, 8; the chequered playing area only, 1024 px) and img/fr-<design>.webp (a seamless
        tile for the frame round it, 512 px):
          walnut  — marquetry of maple (light) and walnut (dark) squares, the grain turned at right angles square by square,
                    fine stringing between them, an oiled satin finish (the default)
          marble  — honed Carrara (light) and verde antico (dark), fine seams; the frame black Marquina
          leather — a games table's green leather in two tones with gilt tooled lines; the frame dark brown leather
          slate   — honed limestone (light) and blue-grey slate (dark); the frame dark slate
Pieces  img/pc-<set>-w / -b.webp (256 px RGBA): the pawn seen from above — a turned base with a bead, a collar and a round head —
        as a height field lit like a photograph (diffuse + specular + Fresnel + cavity shading):
          wood (boxwood & ebony, end grain rings) · stone (alabaster & onyx) · metal (silver & bronze, turning marks) · glass
python3 breakthrough/tools/gen_art.py [boards|frames|pieces|all]"""
import os, sys, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates, sobel, zoom

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img')
os.makedirs(OUT, exist_ok=True)

def nz(rng, shape, s, wrap=True):
    sy, sx = (s, s) if np.isscalar(s) else s
    n = gaussian_filter(rng.standard_normal(shape), (sy, sx), mode='wrap' if wrap else 'reflect')
    return n / (n.std() + 1e-9)

def lerp3(a, b, t): return a + (b - a) * t[..., None]
def C(*v): return np.array(v, np.float64)
def save(img, name, q=86, alpha=None):
    img = np.clip(img, 0, 255).astype(np.uint8)
    im = Image.fromarray(img, 'RGB') if alpha is None else Image.fromarray(np.dstack([img, np.clip(alpha * 255, 0, 255).astype(np.uint8)]), 'RGBA')
    im.save(os.path.join(OUT, name), quality=q, method=6)

# ------------------------------------------------------------------------------------------------ materials (texture fields)
def wood(rng, H, W, light, mid, dark, pore, angle=0.0, fig=1.0, band=0.5):
    """a plank of wood seen along the grain (streaks, fibres, pores), the grain at `angle` (radians)"""
    S = int(max(H, W) * 1.5)
    y, x = np.mgrid[0:S, 0:S].astype(np.float64)
    dy = nz(rng, (S, S), (S / 8, S / 3)) * S * 0.012 * fig
    def wf(a): return map_coordinates(a, [np.mod(y + dy, S), x], order=1, mode='grid-wrap')
    s = wf(nz(rng, (S, S), (0.9, 60)) * 0.35 + nz(rng, (S, S), (3, 180)) * 0.55 + nz(rng, (S, S), (10, 500)) * 0.7)
    hw = wf(nz(rng, (S, S), (S / 40, S / 1.5)))
    bnd = np.clip((hw - 0.2) / 1.1, 0, 1) ** 2 * band
    fib = wf(nz(rng, (S, S), (0.4, 18)))
    t = np.clip(0.45 + 0.16 * s + 0.06 * fib, 0, 1)
    base = np.where(t[..., None] < 0.5, lerp3(light, mid, t / 0.5), lerp3(mid, dark, (t - 0.5) / 0.5))
    img = base * (1 - 0.6 * bnd[..., None]) + dark * 0.6 * bnd[..., None]
    pr = (rng.random((S, S)) > 0.9965).astype(np.float64)
    pr = np.clip(wf(gaussian_filter(pr, (0.4, 3.5), mode='wrap') * 9), 0, 1) * 0.45
    img = img * (1 - pr[..., None]) + pore * pr[..., None]
    # rotate (the square boards turn the grain by 90°)
    c, si = np.cos(angle), np.sin(angle)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    cy, cx = H / 2, W / 2
    sx = (xx - cx) * c - (yy - cy) * si + S / 2 + rng.uniform(-S * 0.15, S * 0.15)
    sy = (xx - cx) * si + (yy - cy) * c + S / 2 + rng.uniform(-S * 0.15, S * 0.15)
    return np.dstack([map_coordinates(img[..., k], [sy, sx], order=1, mode='grid-wrap') for k in range(3)])

def marble(rng, H, W, base, vein, vein2, soft=1.0, amount=1.0, scale=1.0, wrap=False, mottle=0.0, mcol=None):
    """polished stone: a cloudy ground and a few long flowing veins (domain-warped bands, not contour squiggles)"""
    y, x = np.mgrid[0:H, 0:W].astype(np.float64) / max(H, W)
    cl = nz(rng, (H, W), H * 0.10 * scale, wrap) * 0.6 + nz(rng, (H, W), H * 0.025 * scale, wrap) * 0.25 + nz(rng, (H, W), 1.0, wrap) * 0.06
    img = base[None, None, :] * (1 + 0.045 * cl[..., None])
    if mottle and mcol is not None:
        mt = np.clip(nz(rng, (H, W), H * 0.05 * scale, wrap) * 0.7 + nz(rng, (H, W), H * 0.012 * scale, wrap) * 0.35, 0, 2) / 2 * mottle
        img = img * (1 - mt[..., None]) + mcol * mt[..., None]
    def veins(kx, ky, freq, wl, wa, width, op):
        warp = nz(rng, (H, W), H * 0.22 * scale, wrap) * wa * 0.55 + nz(rng, (H, W), H * 0.06 * scale, wrap) * wa * 0.09 + nz(rng, (H, W), H * 0.015 * scale, wrap) * wa * 0.012
        f = (kx * x + ky * y) * freq + warp
        d = np.abs(np.mod(f + 0.5, 1.0) - 0.5)
        w = width * (0.55 + 0.45 * np.clip(nz(rng, (H, W), H * 0.08 * scale, wrap) * 0.5 + 0.6, 0, 1.5))
        v = np.exp(-(d / w) ** 2)
        fade = np.clip(nz(rng, (H, W), H * 0.12 * scale, wrap) * 0.7 + 0.45, 0, 1)
        core = gaussian_filter(v * fade, 0.7)
        return np.clip(core * 0.75 + gaussian_filter(core, H * 0.008) * 1.6, 0, 1) * op
    v1 = veins(2, 1, 1.0 / scale, 0, 0.75, 0.018 * soft, amount)
    v2 = veins(-1, 2, 1.5 / scale, 0, 0.6, 0.008 * soft, amount * 0.6)
    img = img * (1 - v1[..., None] * 0.8) + vein * v1[..., None] * 0.8
    img = img * (1 - v2[..., None] * 0.6) + vein2 * v2[..., None] * 0.6
    return img

def leather(rng, H, W, col, wrap=False):
    g = nz(rng, (H, W), 0.8, wrap) * 0.5 + nz(rng, (H, W), 2.2, wrap) * 0.5
    pores = np.clip(-nz(rng, (H, W), 1.1, wrap) - 1.6, 0, 2) * 0.25
    tone = nz(rng, (H, W), H * 0.08, wrap) * 0.05
    img = col[None, None, :] * (1 + 0.05 * g[..., None] + tone[..., None] - pores[..., None])
    return img, g

def slate(rng, H, W, col, wrap=False):
    """honed slate: soft cloudy tone changes, a very fine grain and faint cleavage — matte, no streaks"""
    cl = nz(rng, (H, W), H * 0.09, wrap) * 0.05 + nz(rng, (H, W), H * 0.025, wrap) * 0.03 + nz(rng, (H, W), 0.8, wrap) * 0.025 + nz(rng, (H, W), (1.5, 9), wrap) * 0.012
    img = col[None, None, :] * (1 + cl[..., None])
    rust = np.clip(nz(rng, (H, W), H * 0.06, wrap) - 1.8, 0, 1) * 0.25
    img = img * (1 - rust[..., None]) + C(110, 104, 92) * rust[..., None]
    return img

def limestone(rng, H, W, col, wrap=False):
    cl = nz(rng, (H, W), H * 0.06, wrap) * 0.035 + nz(rng, (H, W), 1.2, wrap) * 0.02
    sp = (rng.random((H, W)) > 0.997).astype(np.float64); sp = gaussian_filter(sp, 0.7) * 3
    img = col[None, None, :] * (1 + cl[..., None]) - sp[..., None] * 18
    return img

# ------------------------------------------------------------------------------------------------ boards
BOARD = 1024
def finish(img, rng, sheen=0.06, vign=0.10, warm=(1.0, 1.0, 1.0)):
    H, W = img.shape[:2]
    y, x = np.mgrid[0:H, 0:W].astype(np.float64)
    # a soft light from the top left: a broad sheen and a slight fall-off to the corners
    d = np.hypot((x - W * 0.3) / W, (y - H * 0.25) / H)
    img = img * (1 + sheen * np.exp(-(d / 0.55) ** 2)[..., None] - vign * (d ** 2)[..., None] * 0.6)
    return img * np.array(warm)[None, None, :]

def squares(n, fill_light, fill_dark, line_col=None, line_w=0.0, bevel=0.0, rng=None):
    H = W = BOARD; u = H / n
    img = np.zeros((H, W, 3))
    for r in range(n):
        for c in range(n):
            y0, y1, x0, x1 = int(round(r * u)), int(round((r + 1) * u)), int(round(c * u)), int(round((c + 1) * u))
            dark = ((n - 1 - r) + c) % 2 == 0   # a1 (bottom left) is dark, h1 light — as on a chess board
            tile = (fill_dark if dark else fill_light)(r, c, y1 - y0, x1 - x0)
            img[y0:y1, x0:x1] = tile
    if bevel > 0:   # each square's edge catches the light (top / left) or falls in shade (bottom / right)
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
        fy, fx = np.mod(yy, u) / u, np.mod(xx, u) / u
        e = 0.012
        img *= (1 + bevel * (np.clip(1 - fy / e, 0, 1) * 0.6 + np.clip(1 - fx / e, 0, 1) * 0.4) - bevel * (np.clip(1 - (1 - fy) / e, 0, 1) * 0.6 + np.clip(1 - (1 - fx) / e, 0, 1) * 0.5))[..., None]
    if line_col is not None and line_w > 0:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
        dy = np.abs(((yy + u / 2) % u) - u / 2); dx = np.abs(((xx + u / 2) % u) - u / 2)
        dmin = np.minimum(dy, dx)
        a = np.clip(1 - (dmin - line_w / 2) / 1.2, 0, 1)
        # a metal string: bright on its upper edge
        lc = np.array(line_col)[None, None, :] * (1 + 0.25 * np.clip(nz(rng, (H, W), (1, 30)), -1, 1)[..., None] * 0.3)
        img = img * (1 - a[..., None]) + lc * a[..., None]
    return img

def board_walnut(n, seed):
    rng = np.random.default_rng(seed)
    maple = (C(238, 212, 166), C(222, 190, 140), C(184, 146, 98), C(150, 112, 70))
    walnut = (C(132, 88, 56), C(98, 62, 38), C(56, 34, 20), C(36, 20, 11))
    def L(r, c, h, w): return wood(rng, h, w, *maple, angle=0 if (r + c) % 4 == 0 else np.pi / 2, fig=0.8, band=0.25)
    def D(r, c, h, w): return wood(rng, h, w, *walnut, angle=np.pi / 2 if (r + c) % 4 == 1 else 0, fig=1.1, band=0.45)
    img = squares(n, L, D, line_col=C(46, 28, 16), line_w=2.2, bevel=0.10, rng=rng)
    return finish(img, rng, sheen=0.08, vign=0.12)

def board_marble(n, seed):
    rng = np.random.default_rng(seed)
    big_l = marble(rng, BOARD, BOARD, C(238, 236, 231), C(140, 140, 142), C(188, 186, 184), soft=1.0, amount=0.75, scale=1.0)
    big_d = marble(rng, BOARD, BOARD, C(34, 70, 56), C(206, 222, 208), C(96, 140, 118), soft=0.8, amount=0.7, scale=0.9, mottle=0.5, mcol=C(20, 44, 36))
    u = BOARD / n
    # each square cut from a different place of the slab (and turned), as real inlaid stone
    def cut(big, r, c, h, w):
        k = rng.integers(0, 4); y0 = int(rng.integers(0, BOARD - h)); x0 = int(rng.integers(0, BOARD - w))
        t = big[y0:y0 + h, x0:x0 + w]
        return np.rot90(t, k)[:h, :w] if h == w else t
    img = squares(n, lambda r, c, h, w: cut(big_l, r, c, h, w), lambda r, c, h, w: cut(big_d, r, c, h, w), line_col=C(40, 44, 42), line_w=1.6, bevel=0.06, rng=rng)
    return finish(img, rng, sheen=0.10, vign=0.10)

def board_leather(n, seed):
    rng = np.random.default_rng(seed)
    gl, _ = leather(rng, BOARD, BOARD, C(62, 112, 80))
    gd, _ = leather(rng, BOARD, BOARD, C(36, 74, 52))
    img = squares(n, lambda r, c, h, w: gl[:h, :w] if False else gl[int(r * BOARD / n):int(r * BOARD / n) + h, int(c * BOARD / n):int(c * BOARD / n) + w],
                  lambda r, c, h, w: gd[int(r * BOARD / n):int(r * BOARD / n) + h, int(c * BOARD / n):int(c * BOARD / n) + w], bevel=0.0, rng=rng)
    # gilt tooled lines between the squares: a pressed groove with gold leaf (bright core, dark pressed edges)
    H = W = BOARD; u = H / n
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    dy = np.abs(((yy + u / 2) % u) - u / 2); dx = np.abs(((xx + u / 2) % u) - u / 2); dmin = np.minimum(dy, dx)
    groove = np.clip(1 - np.abs(dmin - 3.2) / 2.2, 0, 1)
    gold = np.clip(1 - dmin / 1.6, 0, 1)
    wear = np.clip(nz(rng, (H, W), 3) * 0.5 + 0.75, 0.3, 1)
    img *= (1 - 0.45 * groove)[..., None]
    gc = C(214, 176, 98) * (1 + 0.2 * nz(rng, (H, W), (0.8, 6))[..., None] * 0.5)
    img = img * (1 - (gold * wear)[..., None]) + gc * (gold * wear)[..., None]
    return finish(img, rng, sheen=0.07, vign=0.14)

def board_slate(n, seed):
    rng = np.random.default_rng(seed)
    sl = slate(rng, BOARD, BOARD, C(86, 94, 102))
    ls = limestone(rng, BOARD, BOARD, C(212, 202, 182))
    def cutf(big):
        def f(r, c, h, w):
            y0 = int(rng.integers(0, BOARD - h)); x0 = int(rng.integers(0, BOARD - w)); return big[y0:y0 + h, x0:x0 + w]
        return f
    img = squares(n, cutf(ls), cutf(sl), line_col=C(58, 60, 62), line_w=1.4, bevel=0.08, rng=rng)
    return finish(img, rng, sheen=0.05, vign=0.10)

BOARDS = {'walnut': board_walnut, 'marble': board_marble, 'leather': board_leather, 'slate': board_slate}

# ------------------------------------------------------------------------------------------------ frames (seamless tiles)
FR = 512
def frame_walnut(seed):
    rng = np.random.default_rng(seed)
    S = FR; y, x = np.mgrid[0:S, 0:S].astype(np.float64)
    dy = nz(rng, (S, S), (S / 6, S / 2)) * 10
    def wf(a): return map_coordinates(a, [np.mod(y + dy, S), x], order=1, mode='grid-wrap')
    s = wf(nz(rng, (S, S), (0.9, 40)) * 0.4 + nz(rng, (S, S), (3, 120)) * 0.6 + nz(rng, (S, S), (12, 300)) * 0.7)
    t = np.clip(0.5 + 0.17 * s, 0, 1)
    img = lerp3(C(96, 60, 36), C(50, 30, 18), t)
    pr = (rng.random((S, S)) > 0.996).astype(np.float64); pr = np.clip(wf(gaussian_filter(pr, (0.4, 3), mode='wrap') * 9), 0, 1) * 0.4
    img = img * (1 - pr[..., None]) + C(26, 14, 8) * pr[..., None]
    return img

def frame_marble(seed):
    rng = np.random.default_rng(seed)
    return marble(rng, FR, FR, C(28, 28, 31), C(206, 200, 190), C(84, 82, 86), soft=0.7, amount=0.6, scale=1.0, wrap=True)

def frame_leather(seed):
    rng = np.random.default_rng(seed)
    img, _ = leather(rng, FR, FR, C(62, 38, 26), wrap=True)
    return img

def frame_slate(seed):
    rng = np.random.default_rng(seed)
    return slate(rng, FR, FR, C(52, 56, 60), wrap=True)

FRAMES = {'walnut': frame_walnut, 'marble': frame_marble, 'leather': frame_leather, 'slate': frame_slate}

# ------------------------------------------------------------------------------------------------ pieces: the pawn from above
PS = 512   # rendered at 2× and reduced to 256
def pawn_height(S):
    y, x = np.mgrid[0:S, 0:S].astype(np.float64)
    r = np.hypot(x - S / 2 + 0.5, y - S / 2 + 0.5) / (S / 2 * 0.92)
    h = np.full_like(r, -1.0)
    def band(a, b): return (r >= a) & (r < b)
    # base rim (a rounded foot)
    m = band(0.86, 1.0); t = (r[m] - 0.86) / 0.14; h[m] = 0.11 * np.sqrt(np.clip(1 - t ** 2, 0, 1))
    # the base's top: a cove sweeping up to the bead
    m = band(0.70, 0.86); t = (0.86 - r[m]) / 0.16; h[m] = 0.11 + 0.10 * (1 - np.cos(t * np.pi / 2)) ** 1.4
    # a bead
    m = band(0.62, 0.70); t = (r[m] - 0.66) / 0.04; h[m] = 0.23 + 0.04 * np.sqrt(np.clip(1 - t ** 2, 0, 1))
    # the body rising to the collar
    m = band(0.52, 0.62); t = (0.62 - r[m]) / 0.10; h[m] = 0.23 + 0.22 * t ** 1.6
    # the collar (a turned ring)
    m = band(0.44, 0.52); t = (r[m] - 0.48) / 0.04; h[m] = 0.50 + 0.05 * np.sqrt(np.clip(1 - t ** 2, 0, 1))
    # a little neck in the shade of the head
    m = band(0.40, 0.44); h[m] = 0.47
    # the head (a sphere)
    m = r < 0.40; h[m] = 0.55 + np.sqrt(np.clip(0.40 ** 2 - r[m] ** 2, 0, None)) * 1.0
    alpha = np.clip((1.0 - r) * S * 0.46 / 1.2, 0, 1)
    return h, r, alpha

def shade(h, r, alpha, albedo, spec=0.5, rough=0.35, metal=False, env=None, fres=0.25, cav=0.5, sss=0.0, gloss_tint=None):
    S = h.shape[0]
    hh = np.where(alpha > 0, h, 0) * S * 0.46
    hs = gaussian_filter(hh, 0.8)
    gx = sobel(hs, 1) / 8; gy = sobel(hs, 0) / 8
    n = np.dstack([-gx, -gy, np.ones_like(gx)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    Lt = np.array([-0.45, -0.6, 0.66]); Lt /= np.linalg.norm(Lt)
    V = np.array([0, 0, 1.0]); Hh = Lt + V; Hh /= np.linalg.norm(Hh)
    ndl = np.clip(n @ Lt, 0, 1); ndh = np.clip(n @ Hh, 0, 1); ndv = np.clip(n @ V, 0, 1)
    shin = 2 / max(rough, 0.02) ** 2
    sp = ndh ** shin * (shin + 8) / 60
    fr = fres * (1 - ndv) ** 4
    # cavity / ambient occlusion from the height field (deep grooves darker)
    ao = gaussian_filter(hh, 6) - hh; ao = np.clip(1 - np.clip(ao, 0, None) / (S * 0.02) * cav, 0.35, 1)
    amb = 0.32 + 0.12 * n[..., 2]
    if metal:
        # a fake environment: a bright window up-left, dark floor below, soft room tones
        rdir = 2 * ndv[..., None] * n - V[None, None, :]
        e = np.clip(0.55 + 0.45 * (-rdir[..., 1] * 0.7 - rdir[..., 0] * 0.4), 0, 1) ** 1.6
        win = np.exp(-(((rdir[..., 0] + 0.5) / 0.22) ** 2 + ((rdir[..., 1] + 0.55) / 0.18) ** 2)) * 1.4
        col = albedo * (0.18 + 0.9 * e[..., None] + win[..., None]) * ao[..., None] + 255 * sp[..., None] * spec * 0.4
    else:
        col = albedo * (amb + 0.78 * ndl)[..., None] * ao[..., None]
        if sss: col += albedo * sss * (1 - ndv)[..., None] * 0.3
        st = 255 if gloss_tint is None else np.array(gloss_tint)
        col = col + st * (sp * spec)[..., None] + 255 * fr[..., None] * 0.6
    return col

def endgrain(rng, S, light, dark, ring=22.0, ray=0.0, off=(0.07, -0.05)):
    y, x = np.mgrid[0:S, 0:S].astype(np.float64) / S
    cx, cy = 0.5 + off[0], 0.5 + off[1]
    rr = np.hypot(x - cx, y - cy) + nz(rng, (S, S), S * 0.04) * 0.004 + nz(rng, (S, S), S * 0.01) * 0.0015
    rings = 0.5 + 0.5 * np.sin(rr * ring * 2 * np.pi)
    rings = rings ** 3
    ang = np.arctan2(y - cy, x - cx)
    rays = np.clip(np.sin(ang * 90 + nz(rng, (S, S), S * 0.02) * 2) - 0.92, 0, 1) * ray
    t = np.clip(0.35 + 0.35 * rings + 0.15 * nz(rng, (S, S), S * 0.06) * 0.5 + rays, 0, 1)
    return lerp3(light, dark, t)

def turning(rng, S, base, amp=0.06):   # fine concentric lathe marks (metal)
    y, x = np.mgrid[0:S, 0:S].astype(np.float64)
    r = np.hypot(x - S / 2, y - S / 2)
    m = np.sin(r * 2.3 + nz(rng, (S, S), 4) * 0.8) * 0.5 + np.sin(r * 0.9) * 0.5
    return base[None, None, :] * (1 + amp * m[..., None])

def glow(S, col, amt):   # light focused through the glass onto the far side of the base (a caustic crescent)
    y, x = np.mgrid[0:S, 0:S].astype(np.float64)
    r = np.hypot(x - S / 2, y - S / 2) / (S / 2 * 0.92)
    ang = np.arctan2(y - S / 2, x - S / 2) - np.arctan2(0.6, 0.45)
    c = np.clip(np.cos(ang), 0, 1) ** 3 * np.exp(-((r - 0.78) / 0.1) ** 2)
    return col[None, None, :] * gaussian_filter(c, 3)[..., None] * amt / 255

def piece(kind, side, seed):   # (glass redone 2026-11-28: it read as stone)
    rng = np.random.default_rng(seed)
    h, r, alpha = pawn_height(PS)
    S = PS
    if kind == 'wood':
        if side == 'w':
            alb = endgrain(rng, S, C(242, 214, 158), C(206, 166, 104), ring=26, ray=0.05)
            col = shade(h, r, alpha, alb, spec=0.35, rough=0.32, fres=0.18, cav=0.6)
        else:
            alb = endgrain(rng, S, C(52, 36, 28), C(22, 14, 10), ring=34, ray=0.02)
            col = shade(h, r, alpha, alb, spec=0.55, rough=0.22, fres=0.3, cav=0.4)
    elif kind == 'stone':
        if side == 'w':
            alb = marble(rng, S, S, C(242, 238, 228), C(196, 186, 170), C(226, 220, 208), soft=1.6, amount=0.35, scale=0.7)
            col = shade(h, r, alpha, alb, spec=0.45, rough=0.25, fres=0.2, cav=0.45, sss=0.5)
        else:
            alb = marble(rng, S, S, C(34, 32, 38), C(92, 86, 96), C(60, 56, 64), soft=1.2, amount=0.4, scale=0.6)
            col = shade(h, r, alpha, alb, spec=0.7, rough=0.16, fres=0.35, cav=0.35)
    elif kind == 'metal':
        if side == 'w':
            alb = turning(rng, S, C(206, 210, 216), 0.05)
            col = shade(h, r, alpha, alb, spec=0.9, rough=0.2, metal=True, cav=0.5)
        else:
            alb = turning(rng, S, C(176, 112, 62), 0.06)
            alb = alb * (1 - 0.08 * np.clip(nz(rng, (S, S), S * 0.05), 0, 2))[..., None]   # a soft patina
            col = shade(h, r, alpha, alb, spec=0.8, rough=0.24, metal=True, cav=0.55)
    else:   # glass: sea glass (light) and cobalt (dark), see-through in the flat parts, bright at the curved edges
        hs = gaussian_filter(np.where(alpha > 0, h, 0), 1.2)
        g = np.hypot(sobel(hs, 0), sobel(hs, 1)); g = np.clip(g / (np.percentile(g[alpha > 0.5], 92) + 1e-9), 0, 1)
        if side == 'w':
            alb = C(196, 234, 222)[None, None, :] * (1 + 0.015 * nz(rng, (S, S), 6)[..., None])
            col = shade(h, r, alpha, alb, spec=1.0, rough=0.18, fres=0.8, cav=0.25, sss=1.0, gloss_tint=(255, 255, 255))
            col = col + glow(S, C(220, 255, 240), 90)
            body = 0.50
        else:
            alb = C(30, 52, 120)[None, None, :] * (1 + 0.015 * nz(rng, (S, S), 6)[..., None])
            col = shade(h, r, alpha, alb, spec=1.1, rough=0.16, fres=0.9, cav=0.2, sss=0.6, gloss_tint=(230, 240, 255))
            col = col + glow(S, C(110, 160, 255), 110)
            body = 0.72
        lum = np.clip((col.mean(axis=2) - 140) / 115, 0, 1)   # highlights stay opaque
        alpha = alpha * np.clip(body + 0.45 * g + 0.5 * lum, 0, 1)
    # a slightly darker underside line at the foot (where the piece meets the board)
    edge = np.clip((r - 0.95) / 0.05, 0, 1)
    col = col * (1 - 0.35 * edge)[..., None]
    a = np.clip(alpha, 0, 1)
    img = Image.fromarray(np.dstack([np.clip(col, 0, 255), a * 255]).astype(np.uint8), 'RGBA').resize((256, 256), Image.LANCZOS)
    img.save(os.path.join(OUT, f'pc-{kind}-{side}.webp'), quality=90, method=6)

def main(what):
    if what in ('boards', 'all'):
        for i, (k, f) in enumerate(BOARDS.items()):
            for n in (6, 7, 8):
                save(f(n, 100 + i * 10 + n), f'bd-{k}-{n}.webp', q=84); print('board', k, n, flush=True)
    if what in ('frames', 'all'):
        for i, (k, f) in enumerate(FRAMES.items()):
            save(f(300 + i), f'fr-{k}.webp', q=84); print('frame', k, flush=True)
    if what in ('pieces', 'all'):
        for i, k in enumerate(['wood', 'stone', 'metal', 'glass']):
            for j, s in enumerate('wb'):
                piece(k, s, 500 + i * 10 + j); print('piece', k, s, flush=True)

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'all')

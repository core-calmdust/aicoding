#!/usr/bin/env python3
"""Textures for ライアーダイス (all procedural, our own):
  felt-<k>.webp  the playing surface: woollen baize (fibres, pilling), oxblood or tan leather (pebbled grain, creases)
  rim.webp       the walnut rail around the table (long grain, pores, oiled sheen)
  cup-<k>.webp   a leather dice cup upside down on the table, seen a little from above (grain, stitched seams, worn rim)
  die-<m>-<n>.webp  dice seen from above: bone (fine pores, yellowed, drilled pips), ebony, boxwood, red resin
python3 liarsdice/tools/gen_tex.py"""
import os, math, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img')
os.makedirs(OUT, exist_ok=True)

def nz(rng, shape, sy, sx=None, wrap=True):
    n = gaussian_filter(rng.standard_normal(shape), (sy, sx if sx is not None else sy), mode='wrap' if wrap else 'reflect')
    return n / (n.std() + 1e-9)

def save(a, name, q=86, alpha=None):
    a = np.clip(a, 0, 255).astype(np.uint8)
    if alpha is not None:
        im = Image.fromarray(np.dstack([a, np.clip(alpha * 255, 0, 255).astype(np.uint8)]), 'RGBA')
    else:
        im = Image.fromarray(a, 'RGB')
    im.save(os.path.join(OUT, name), quality=q, method=6)

def lerpc(a, b, t):
    return np.array(a, float) + (np.array(b, float) - np.array(a, float)) * t[..., None]

# ---------------------------------------------------------------- felt / leather surface
def baize(key, base, seed, W=1600, H=1000):
    rng = np.random.default_rng(seed)
    fib = nz(rng, (H, W), .6) * .5 + nz(rng, (H, W), 1.4) * .5
    # short curly fibres: strokes in random directions
    lines = np.zeros((H, W))
    for _ in range(26000):
        x, y = rng.integers(0, W), rng.integers(0, H); ang = rng.random() * math.pi; L = rng.integers(4, 12)
        for k in range(L):
            xx = int(x + math.cos(ang) * k) % W; yy = int(y + math.sin(ang) * k) % H
            lines[yy, xx] += 1
    lines = gaussian_filter(lines, .5)
    lines /= lines.max() + 1e-9
    cloud = nz(rng, (H, W), 90) * .6 + nz(rng, (H, W), 25) * .4
    pill = (rng.random((H, W)) > .9985).astype(float); pill = gaussian_filter(pill, 1.1) * 9
    t = .5 + .09 * fib + .06 * cloud + .16 * lines - .05 * pill
    b = np.array(base, float)
    img = b[None, None, :] * (0.72 + 0.56 * t[..., None])
    # light falls from the top: a soft vignette
    yy, xx = np.mgrid[0:H, 0:W]
    v = 1 - .28 * (((xx - W / 2) / (W * .62)) ** 2 + ((yy - H * .45) / (H * .7)) ** 2)
    img *= np.clip(v, .55, 1)[..., None]
    save(img, f'felt-{key}.webp', 84)

def leather(key, base, seed, W=1600, H=1000, sheen=.08):
    rng = np.random.default_rng(seed)
    # pebbled grain: a cellular pattern (distance to random points), plus fine creases
    pts = rng.random((9000, 2)) * [W, H]
    from scipy.spatial import cKDTree
    tr = cKDTree(pts, boxsize=[W, H])
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    d, _ = tr.query(np.stack([xx.ravel() % W, yy.ravel() % H], 1), k=2)
    cell = (d[:, 1] - d[:, 0]).reshape(H, W)
    cell = np.clip(cell / 6, 0, 1)
    crease = np.abs(nz(rng, (H, W), 3, 14)); crease = np.exp(-crease * 4) * .5
    tone = nz(rng, (H, W), 120) * .7 + nz(rng, (H, W), 30) * .3
    t = .55 + .14 * cell - .18 * crease + .07 * tone + .03 * nz(rng, (H, W), .7)
    b = np.array(base, float)
    img = b[None, None, :] * (0.62 + 0.7 * t[..., None])
    # a little sheen on the grain tops (bump lit from the top-left)
    bump = gaussian_filter(cell, 1.2)
    gx = np.gradient(bump, axis=1); gy = np.gradient(bump, axis=0)
    lit = np.clip(-(gx + gy) * 6, -1, 1)
    img += (lit * 22 * sheen / .08)[..., None]
    v = 1 - .3 * (((xx - W / 2) / (W * .62)) ** 2 + ((yy - H * .45) / (H * .7)) ** 2)
    img *= np.clip(v, .55, 1)[..., None]
    save(img, f'felt-{key}.webp', 84)

def walnut_rim(W=1800, H=600, seed=41):
    rng = np.random.default_rng(seed)
    light, mid, dark, pore = (np.array(c, float) for c in ((150, 104, 68), (108, 70, 44), (52, 32, 20), (28, 16, 9)))
    y, x = np.mgrid[0:H, 0:W].astype(float)
    dy = nz(rng, (H, W), 60, 400) * 18
    warp = lambda a: map_coordinates(a, [np.mod(y + dy, H), x], order=1, mode='grid-wrap')
    s = warp(nz(rng, (H, W), 1.2, 90) * .35 + nz(rng, (H, W), 4, 260) * .55 + nz(rng, (H, W), 14, 700) * .8)
    fib = warp(nz(rng, (H, W), .45, 26))
    t = np.clip(.45 + .16 * s + .07 * fib, 0, 1)
    img = np.where(t[..., None] < .5, light + (mid - light) * (t[..., None] / .5), mid + (dark - mid) * ((t[..., None] - .5) / .5))
    pr = (rng.random((H, W)) > .996).astype(float)
    pr = np.clip(warp(gaussian_filter(pr, (.45, 4.5)) * 10), 0, 1) * .6
    img = img * (1 - pr[..., None]) + pore * pr[..., None]
    img *= (1 + .05 * nz(rng, (H, W), 80, 300))[..., None]
    save(img, 'rim.webp', 84)

# ---------------------------------------------------------------- the cup
def cup(key, base, seed, W=300, H=340):
    """a leather cup upside down: a slightly tapered cylinder (wider at the table), its closed bottom (an ellipse) on top"""
    rng = np.random.default_rng(seed)
    S = 3; w, h = W * S, H * S
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    cx = w / 2
    topY, botY = h * .14, h * .86            # centres of the top ellipse and the rim ellipse
    rt, rb = w * .36, w * .44                # radii (top narrower)
    ery = .26                                 # ellipse squash (view from above)
    # body: between the two ellipses
    tt = np.clip((yy - topY) / (botY - topY), 0, 1)
    r = rt + (rb - rt) * tt
    inside_x = np.abs(xx - cx) <= r
    y_top_edge = topY + 0  # body starts at the top ellipse centre line
    body = inside_x & (yy >= topY) & (yy <= botY + ery * rb * np.sqrt(np.clip(1 - ((xx - cx) / rb) ** 2, 0, 1)))
    topE = ((xx - cx) / rt) ** 2 + ((yy - topY) / (ery * rt)) ** 2 <= 1
    # cylindrical shading: u = -1..1 across the body
    u = np.clip((xx - cx) / np.maximum(r, 1), -1, 1)
    nzn = np.sqrt(np.clip(1 - u * u, 0, 1))
    light = np.array([-.55, -.35, .76]); light /= np.linalg.norm(light)
    diff = np.clip(u * light[0] + nzn * light[2] + (-.12) * light[1], 0, 1)
    spec = np.clip(u * -.5 + nzn * .85, 0, 1) ** 9 * .13
    # leather grain in cup space (wrap around the cylinder: angle)
    ang = np.arcsin(u)
    gx = (ang / math.pi + .5) * 600; gy = yy / S
    grainA = nz(rng, (420, 640), .9) * .5 + nz(rng, (420, 640), 2.2) * .5
    grainB = nz(rng, (420, 640), 8, 3) * .5
    sample = lambda a, X, Y: map_coordinates(a, [np.clip(Y, 0, a.shape[0] - 1), np.clip(X, 0, a.shape[1] - 1)], order=1)
    # pebbled grain (cells) + creases running round the cup + a blotchy, worn tone
    from scipy.spatial import cKDTree
    pts = rng.random((7000, 2)) * [640, 420]
    tr = cKDTree(pts, boxsize=[640, 420])
    GY, GX = np.mgrid[0:420, 0:640].astype(float)
    dd, _ = tr.query(np.stack([GX.ravel(), GY.ravel()], 1), k=2)
    peb = np.clip((dd[:, 1] - dd[:, 0]).reshape(420, 640) / 3.2, 0, 1)
    crease = np.exp(-np.abs(nz(rng, (420, 640), 1.5, 9)) * 3.5)
    blot = nz(rng, (420, 640), 22) * .6 + nz(rng, (420, 640), 6) * .4
    pg = sample(peb, gx, gy); cr = sample(crease, gx, gy); bl = sample(blot, gx, gy)
    g = pg * .11 - cr * .12 + bl * .05 + sample(grainA, gx, gy) * .03
    # the grain catches light on its tops: a small bump term
    pgb = gaussian_filter(pg, 1.5 * S)
    g += np.clip(-np.gradient(pgb, axis=1) * 40 - np.gradient(pgb, axis=0) * 40, -.08, .08) * diff
    b = np.array(base, float)
    col = b[None, None, :] * (.3 + .85 * diff[..., None] + g[..., None] * 1.0) + 255 * spec[..., None] * np.array([1, .95, .88])
    # stitched seam on the right (vertical), stitched bands near top and rim
    seamU = .58
    seam = np.exp(-((u - seamU) / .018) ** 2)
    col *= (1 - .35 * seam)[..., None]
    stitches = np.zeros((h, w))
    yrel = (yy - topY) / (botY - topY)
    for band in (.06, .93):
        by = np.abs(yrel - band) < .012
        dash = (np.mod((ang + 3) * 26, 1) < .55)
        stitches += (by & dash & body).astype(float)
    sv = (np.abs(u - seamU - .03) < .012) & (np.mod(yy / (h * .035), 1) < .55) & body
    stitches += sv
    stitches = gaussian_filter(stitches, 1.0) * 1.4
    thread = np.array([214, 196, 160])
    col = col * (1 - np.clip(stitches, 0, 1)[..., None] * .9) + thread * diff[..., None].clip(.35, 1) * np.clip(stitches, 0, 1)[..., None] * .9
    # worn rim at the table: a darker band, scuffed lighter edge
    rimband = np.clip(1 - np.abs(yrel - .975) / .05, 0, 1)
    col *= (1 - .22 * rimband)[..., None]
    # top: the closed bottom of the cup, a flat disc lit from above, with a stitched ring
    er = np.sqrt(((xx - cx) / rt) ** 2 + ((yy - topY) / (ery * rt)) ** 2)
    td = .75 + .25 * (1 - er) - .12 * ((xx - cx) / rt) - .1 * ((yy - topY) / (ery * rt))
    tg = sample(grainA, xx / S * 1.3, yy / S * 3) * .07
    topc = b[None, None, :] * (td[..., None] * 1.05 + tg[..., None])
    ring = (np.abs(er - .84) < .03) & (np.mod(np.arctan2((yy - topY) / ery, xx - cx) * 9, 1) < .55)
    topc = np.where(ring[..., None], thread * .85, topc)
    edge = np.clip((er - .93) / .07, 0, 1)
    topc *= (1 - .35 * edge)[..., None]
    col = np.where(topE[..., None], topc, col)
    mask = (body | topE).astype(float)
    mask = gaussian_filter(mask, .8)
    col = col.reshape(h, w, 3)
    im = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8), 'RGB').resize((W, H), Image.LANCZOS)
    al = Image.fromarray(np.clip(mask * 255, 0, 255).astype(np.uint8), 'L').resize((W, H), Image.LANCZOS)
    im.putalpha(al)
    im.save(os.path.join(OUT, f'cup-{key}.webp'), quality=88, method=6)

# ---------------------------------------------------------------- dice
PIPS = {1: [(0, 0)], 2: [(-1, -1), (1, 1)], 3: [(-1, -1), (0, 0), (1, 1)], 4: [(-1, -1), (1, -1), (-1, 1), (1, 1)],
        5: [(-1, -1), (1, -1), (0, 0), (-1, 1), (1, 1)], 6: [(-1, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (1, 1)]}
DMAT = {   # body light, body dark, pip colour, grain kind
    'bone': ((236, 226, 200), (196, 180, 146), (34, 24, 18), 'bone'),
    'ebony': ((62, 48, 40), (18, 13, 11), (232, 220, 190), 'wood'),
    'boxwood': ((228, 196, 132), (184, 146, 86), (46, 28, 16), 'wood'),
    'resin': ((196, 46, 44), (112, 18, 22), (246, 238, 222), 'resin'),
}
def die(mat, seed, S=160):
    rng = np.random.default_rng(seed)
    lc, dc, pc, kind = DMAT[mat]
    M = 4; s = S * M
    yy, xx = np.mgrid[0:s, 0:s].astype(float) / s * 2 - 1   # -1..1
    half = .86; rad = .26
    # rounded square SDF
    qx, qy = np.abs(xx) - (half - rad), np.abs(yy) - (half - rad)
    sd = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2) + np.minimum(np.maximum(qx, qy), 0) - rad
    inside = sd < 0
    # bevel normal: near the edge the surface curves down
    bev = np.clip(-sd / .16, 0, 1)
    ex = np.gradient(sd, axis=1); ey = np.gradient(sd, axis=0); en = np.sqrt(ex ** 2 + ey ** 2) + 1e-9
    k = (1 - bev) ** 1.5
    nx, ny = ex / en * k, ey / en * k
    nzz = np.sqrt(np.clip(1 - nx ** 2 - ny ** 2, 0, 1))
    L = np.array([-.5, -.6, .63]); L /= np.linalg.norm(L)
    diff = np.clip(nx * L[0] + ny * L[1] + nzz * L[2], 0, 1)
    hv = np.array([L[0], L[1], L[2] + 1]); hv /= np.linalg.norm(hv)
    spec = np.clip(nx * hv[0] + ny * hv[1] + nzz * hv[2], 0, 1)
    shiny = {'bone': 30, 'wood': 18, 'resin': 60}[kind]
    spec = spec ** shiny * {'bone': .35, 'wood': .22, 'resin': .7}[kind]
    # material texture
    X, Y = (xx + 1) * S, (yy + 1) * S
    if kind == 'bone':
        t = nz(rng, (s, s), 6, 40) * .5 + nz(rng, (s, s), 1.2) * .3
        pores = (rng.random((s, s)) > .9985).astype(float); pores = gaussian_filter(pores, (2, 6)) * 30
        tex = .5 + .16 * t - .4 * np.clip(pores, 0, 1) + .08 * nz(rng, (s, s), 40)
    elif kind == 'wood':
        ang = rng.random() * .4 - .2
        u = xx * math.cos(ang) + yy * math.sin(ang); v = -xx * math.sin(ang) + yy * math.cos(ang)
        w = nz(rng, (s, s), 30, 30) * .08
        rings = np.sin((v + w + .3 * u * u) * 34 + nz(rng, (s, s), 18) * .6) * .5 + .5
        fib = nz(rng, (s, s), 1.5, 20) * .2
        tex = .42 + .36 * rings ** 2.2 + .2 * fib
    else:
        tex = .5 + .05 * nz(rng, (s, s), 30) + .02 * nz(rng, (s, s), 2)
    tex = np.clip(tex, 0, 1)
    body = lerpc(dc, lc, np.clip(tex * .5 + diff * .65, 0, 1))
    if kind == 'resin':   # translucent: a deeper glow in the middle
        body *= (1 + .18 * np.exp(-(xx ** 2 + yy ** 2) / .4))[..., None]
    body += 255 * spec[..., None]
    # edges darker (ambient occlusion on the bevel)
    body *= (.72 + .28 * bev ** .5)[..., None]
    out = {}
    for n in range(1, 7):
        img = body.copy()
        pr = .13 if not (n == 1) else .2
        for (px, py) in PIPS[n]:
            cxp, cyp = px * .45, py * .45
            d = np.sqrt((xx - cxp) ** 2 + (yy - cyp) ** 2)
            hole = np.clip((pr - d) / .02, 0, 1)
            # inside the hole: darker at the top-left wall (shadow), the far wall catches light
            wall = np.clip(((xx - cxp) * .7 + (yy - cyp) * .7) / pr, -1, 1)
            pcn = np.array(pc, float)
            inner = pcn * (.75 + .3 * wall[..., None])
            if mat in ('ebony', 'resin'):   # filled pips (paint): flat, a little gloss
                inner = pcn * (.95 + .08 * wall[..., None])
            # rim highlight on the lower-right edge of the hole
            rim = np.exp(-((d - pr) / .012) ** 2) * np.clip(wall, 0, 1) * .5
            img = img * (1 - hole[..., None]) + inner * hole[..., None] + 255 * rim[..., None] * .5
        alpha = np.clip(-sd / .01, 0, 1)
        im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB').resize((S, S), Image.LANCZOS)
        al = Image.fromarray((alpha * 255).astype(np.uint8), 'L').resize((S, S), Image.LANCZOS)
        im.putalpha(al)
        im.save(os.path.join(OUT, f'die-{mat}-{n}.webp'), quality=90, method=6)

if __name__ == '__main__':
    import sys
    what = sys.argv[1:] or ['felt', 'rim', 'cup', 'die']
    if 'felt' in what:
        baize('baize', (38, 92, 64), 3)
        leather('oxblood', (110, 34, 30), 5)
        leather('tan', (150, 104, 62), 7, sheen=.06)
        baize('navy', (34, 52, 92), 9)
    if 'rim' in what: walnut_rim()
    if 'cup' in what:
        cup('brown', (124, 74, 42), 11); cup('black', (52, 44, 40), 12); cup('oxblood', (118, 36, 30), 13); cup('tan', (176, 126, 74), 14)
    if 'die' in what:
        for i, m in enumerate(DMAT): die(m, 30 + i)
    print('ok')

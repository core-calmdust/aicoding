#!/usr/bin/env python3
"""The "Lamba" board design: an original painted cotton cloth after Malagasy lamba textiles, laid out on the board's own
lattice — every triangle of the Fanorona grid is a painted patch (green / blue / violet / teal, a few yellow ones set
symmetrically), some 2x2 blocks are square woven panels, abstract leaves grow inside some patches, woven bands at the top
and bottom carry the grooves, and the whole cloth has a fine cotton weave. One picture per board so the patches meet the
points exactly (the frame is (NC + 1.5) x (NR + 2) cells; point (c, r) at x = 1.25 + c, y = 1.5 + (NR - 1 - r) cells).
python3 tools/gen_lamba.py  → img/lamba-sivy.webp, img/lamba-dimy.webp, img/lamba-telo.webp"""
import os, math, numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img')
S = 150   # pixels per cell
PAL = {
    'g1': (30, 104, 72), 'g2': (48, 134, 86), 'g3': (78, 150, 98),
    'b1': (36, 92, 150), 'b2': (58, 122, 182), 't1': (26, 120, 118), 't2': (52, 150, 140),
    'v1': (84, 58, 140), 'v2': (110, 76, 160), 'y1': (238, 198, 58), 'y2': (224, 176, 40),
}
FAMILIES = [['g1', 'g2', 'g3'], ['b1', 'b2'], ['t1', 't2'], ['v1', 'v2']]


def render(rule, NC, NR, seed):
    rng = np.random.default_rng(seed)
    Wc, Hc = NC + 1.5, NR + 2
    W, H = int(Wc * S), int(Hc * S)
    P = lambda c, r: ((1.25 + c) * S, (1.5 + (NR - 1 - r)) * S)
    img = Image.new('RGB', (W, H), PAL['g1']); d = ImageDraw.Draw(img)
    leaf = Image.new('L', (W, H), 0); ld = ImageDraw.Draw(leaf)
    leafD = Image.new('L', (W, H), 0); ldd = ImageDraw.Draw(leafD)
    weave = Image.new('L', (W, H), 0); wd = ImageDraw.Draw(weave)
    brush = Image.new('L', (W, H), 0); bd = ImageDraw.Draw(brush)
    cx0, cy0 = (NC - 1) / 2, (NR - 1) / 2
    # colour field: slow bands of families across the cloth, so neighbouring patches harmonise
    def family(c, r):
        u = (c - cx0) * 0.55 + (r - cy0) * 0.9 + 0.6 * math.sin(c * 0.9 + seed) + 0.5 * math.cos(r * 1.3 + seed)
        return FAMILIES[int(math.floor(u)) % len(FAMILIES)]
    # square woven panels: a few 2x2 blocks (symmetric pairs about the centre)
    panels = set()
    if NC >= 5:
        cand = [(c, r) for c in range(0, NC - 2) for r in range(0, NR - 2)]
        rng.shuffle(cand)
        want = {9: 3, 5: 1, 3: 0}.get(NC, 1)
        for (c, r) in cand:
            if len(panels) >= want * 2: break
            if (c + r) % 2: continue
            m = (NC - 2 - c, NR - 2 - r)
            blk = {(c + i, r + j) for i in (0, 1) for j in (0, 1)} | {(m[0] + i, m[1] + j) for i in (0, 1) for j in (0, 1)}
            if any(abs(a - cx0) < 1.2 and abs(b - cy0) < 1.2 for a, b in blk): continue
            if any((a + i, b + j) in panels for a, b in blk for i in (-1, 0, 1) for j in (-1, 0, 1)): continue
            panels |= blk
    # yellow patches: a symmetric diamond of triangles around the centre and a few pairs elsewhere
    yellow = set()
    def addY(c, r, k):
        yellow.add((c, r, k)); yellow.add((NC - 2 - c, NR - 2 - r, 1 - k))
    if NC == 3:
        addY(0, 0, 0)
    else:
        addY(int(cx0) - 1, int(cy0) - 1, 1)
        for _ in range({9: 2, 5: 1}.get(NC, 1)):
            addY(int(rng.integers(0, NC - 1)), int(rng.integers(0, NR - 1)), int(rng.integers(0, 2)))
    tris = []
    for c in range(-1, NC):
        for r in range(-1, NR):
            a, b, cc, dd = P(c, r), P(c + 1, r), P(c + 1, r + 1), P(c, r + 1)
            if (c + r) % 2 == 0: T = [(a, b, cc), (a, cc, dd)]   # the diagonal from the strong corner (c, r)
            else: T = [(a, b, dd), (b, cc, dd)]
            fam = family(c + .5, r + .5)
            for k, t in enumerate(T):
                if (c, r) in panels: col = PAL[fam[0]]
                elif (c, r, k) in yellow: col = PAL['y1' if (c + k) % 2 else 'y2']
                else:
                    f2 = FAMILIES[(FAMILIES.index(fam) + (1 if rng.random() < .3 else 0)) % len(FAMILIES)] if k else fam
                    col = PAL[f2[(c * 3 + r * 5 + k + int(rng.integers(0, 2))) % len(f2)]]
                d.polygon(t, fill=col)
                tris.append((t, col, (c, r) in panels, (c, r, k) in yellow))
                if (c, r, k) in yellow or rng.random() < 0.18: bd.polygon(t, fill=255)
    # the square woven panels: a large stepped lozenge (built of small woven squares) round the point in the block's middle
    done = set()
    for (c, r) in sorted(panels):
        blk = next(((a, b) for a in (c - 1, c) for b in (r - 1, r) if all((a + i, b + j) in panels for i in (0, 1) for j in (0, 1)) and (a, b) not in done), None)
        if blk is None: continue
        done.add(blk); a, b = blk
        mx, my = P(a + 1, b + 1)
        q = S / 7
        for i in range(-6, 7):
            for j in range(-6, 7):
                rr = abs(i) + abs(j)
                if rr in (2, 3, 5, 6) or (rr == 0):
                    x, y = mx + i * q, my + j * q
                    wd.rectangle([x - q * .42, y - q * .42, x + q * .42, y + q * .42], fill=255 if rr != 3 else 150)
        x0, y0 = P(a, b + 2)[0], P(a, b + 2)[1]; x1, y1 = P(a + 2, b)
        wd.rectangle([x0 + 10, y0 + 10, x1 - 10, y1 - 10], outline=200, width=3)
    # abstract leaves in some (non-panel, non-yellow) patches, pointing along the patch
    for (t, col, pan, yel) in tris:
        if pan or yel or rng.random() > 0.3: continue
        (ax, ay), (bx, by), (qx, qy) = t
        gx, gy = (ax + bx + qx) / 3, (ay + by + qy) / 3
        # the longest side gives the direction
        sides = [((ax, ay), (bx, by)), ((bx, by), (qx, qy)), ((qx, qy), (ax, ay))]
        (p1, p2) = max(sides, key=lambda s: math.dist(*s))
        ang = math.atan2(p2[1] - p1[1], p2[0] - p1[0]) + rng.uniform(-.35, .35)
        L = S * rng.uniform(.62, .92); Wd = L * rng.uniform(.26, .4)
        ux, uy, vx, vy = math.cos(ang), math.sin(ang), -math.sin(ang), math.cos(ang)
        pts = []
        for s in np.linspace(0, 1, 24):
            w = Wd * math.sin(math.pi * s) ** 0.85
            pts.append((gx + (s - .5) * L * ux + w * vx * .5, gy + (s - .5) * L * uy + w * vy * .5))
        for s in np.linspace(1, 0, 24):
            w = Wd * math.sin(math.pi * s) ** 0.85
            pts.append((gx + (s - .5) * L * ux - w * vx * .5, gy + (s - .5) * L * uy - w * vy * .5))
        tgt = ld if rng.random() < .6 else ldd
        tgt.polygon(pts, fill=255)
        # the midrib and veins are cut out of the leaf
        ldd2 = ImageDraw.Draw(leaf if tgt is ld else leafD)
        ldd2.line([(gx - .5 * L * ux, gy - .5 * L * uy), (gx + .5 * L * ux, gy + .5 * L * uy)], fill=0, width=4)
        for s in np.linspace(.18, .82, 7):
            bx0, by0 = gx + (s - .5) * L * ux, gy + (s - .5) * L * uy
            for sg in (1, -1):
                ldd2.line([(bx0, by0), (bx0 + (.12 * L) * ux + sg * Wd * .42 * vx, by0 + (.12 * L) * uy + sg * Wd * .42 * vy)], fill=0, width=3)
    base = np.asarray(img).astype(np.float64)
    rnd = lambda sy, sx: (lambda n: n / (n.std() + 1e-9))(gaussian_filter(rng.standard_normal((H, W)), (sy, sx)))
    # painted brush streaks (dry brush, mostly horizontal) on some patches
    bm = np.asarray(brush.filter(ImageFilter.GaussianBlur(3))).astype(np.float64) / 255
    streak = rnd(1.5, 55) * 0.7 + rnd(6, 120) * 0.5
    wash = rnd(40, 60)
    base *= 1 + (0.035 + 0.06 * bm[..., None]) * streak[..., None] + 0.06 * wash[..., None]
    lm = np.asarray(leaf.filter(ImageFilter.GaussianBlur(1.2))).astype(np.float64) / 255
    lmd = np.asarray(leafD.filter(ImageFilter.GaussianBlur(1.2))).astype(np.float64) / 255
    base = base * (1 - 0.3 * lm[..., None]) + np.array([200, 236, 190]) * 0.3 * lm[..., None]
    base = base * (1 - 0.32 * lmd[..., None])
    wm = np.asarray(weave.filter(ImageFilter.GaussianBlur(1))).astype(np.float64) / 255
    base = base * (1 - 0.3 * wm[..., None]) + np.array([214, 238, 206]) * 0.3 * wm[..., None]
    # woven bands at the top and bottom (under the grooves): stripes and a row of small lozenges
    band = int(0.62 * S)
    for y0 in (0, H - band):
        b = Image.new('RGB', (W, band)); bdr = ImageDraw.Draw(b)
        stripes = [(0, .3, (70, 46, 132)), (.3, .38, (44, 150, 116)), (.38, .62, (46, 72, 160)), (.62, .7, (44, 150, 116)), (.7, 1, (70, 46, 132))]
        for a0, a1, col in stripes: bdr.rectangle([0, a0 * band, W, a1 * band], fill=col)
        cy = band / 2
        for x in np.arange(S * .45, W, S * .62):
            for R, col in ((band * .2, (236, 196, 64)), (band * .11, (46, 72, 160)), (band * .045, (236, 196, 64))):
                bdr.polygon([(x, cy - R), (x + R, cy), (x, cy + R), (x - R, cy)], fill=col)
        bb = np.asarray(b).astype(np.float64)
        base[y0:y0 + band] = bb * (1 + 0.04 * streak[y0:y0 + band, :, None])
        edge = 3
        base[y0 + (band - edge if y0 == 0 else 0): y0 + (band if y0 == 0 else edge)] *= 0.75
    # fine cotton weave: warp and weft threads with irregular thickness, slubs and fibre noise
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    pitch = 3.2
    warp = np.sin(2 * np.pi * (xx + 1.2 * rnd(60, 1.2)) / pitch)
    weft = np.sin(2 * np.pi * (yy + 1.2 * rnd(1.2, 60)) / pitch)
    over = (np.floor(xx / pitch) + np.floor(yy / pitch)) % 2
    tex = np.where(over > 0, warp, weft) * 0.5 + 0.5
    slub = rnd(0.6, 18) * 0.5 + rnd(18, 0.6) * 0.5
    fib = rng.standard_normal((H, W))
    base *= (1 + 0.055 * (tex[..., None] - .5) + 0.03 * slub[..., None] + 0.02 * fib[..., None])
    # cloth light: a soft sheen and gentle folds
    fold = rnd(160, 220)
    base *= (1 + 0.05 * fold[..., None])
    Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).save(os.path.join(OUT, f'lamba-{rule}.webp'), quality=88, method=6)
    print(rule, W, H)


os.makedirs(OUT, exist_ok=True)
for rule, nc, nr, seed in (('sivy', 9, 5, 11), ('dimy', 5, 5, 23), ('telo', 3, 3, 5)):
    render(rule, nc, nr, seed)

# -*- coding: utf-8 -*-
"""Trace-and-reprint: a reference picture is used only as an underlay (like tracing paper).

  - colour areas: the regions of the underlay are re-cut as stencils, then pushed a little out of shape
    (hand-cut stencil wobble) and printed with our own pigments, misregistration and uneven ink;
  - key lines: the underlay's line work is reduced to centre lines and drawn again stroke by stroke with
    a brush (entry / exit taper, swelling pressure, ink catching on the paper) -- never the uniform-width
    vector line of the underlay;
  - the frame is our own (black backing paper folded over the face).

Nothing of the reference file itself is copied into the output; it is a re-drawing over an underlay.
"""
import math, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import scipy.ndimage as nd
from skimage.morphology import skeletonize

sys.path.insert(0, os.path.dirname(__file__))
import hfprint as P

# underlay palette -> our pigment ink names
UNDER = [
    ((255, 255, 255), 'paper'),
    ((0, 0, 0), 'line'),
    ((51, 51, 51), 'k'),
    ((152, 152, 152), 'gy'),
    ((216, 30, 30), 'r'),
    ((255, 235, 92), 'y'),
    ((93, 78, 140), 'p'),
    ((255, 151, 13), 'o'),
    ((128, 227, 237), 'bl'),
]
P.INK.setdefault('gy', (150, 146, 140))


def render_underlay(svg, w, h):
    with tempfile.TemporaryDirectory() as td:
        out = os.path.join(td, 'u.png')
        subprocess.run(['rsvg-convert', '-w', str(w), '-h', str(h), '--keep-aspect-ratio', '-o', out, svg], check=True)
        im = Image.open(out).convert('RGB')
    if im.size != (w, h):
        im = im.resize((w, h), Image.LANCZOS)
    return np.asarray(im, np.int32)


def classify(rgb):
    """nearest underlay colour; anti-aliased edge pixels (far from every colour) become line if dark,
    otherwise take the class of the nearest clean pixel"""
    pal = np.array([c for c, _ in UNDER], np.int32)
    d = ((rgb[:, :, None, :] - pal[None, None, :, :]) ** 2).sum(-1)
    lab = d.argmin(-1)
    amb = d.min(-1) > 24 ** 2
    lum = rgb.mean(-1)
    lab[amb & (lum < 110)] = 1
    rest = amb & (lum >= 110)
    if rest.any():
        _, idx = nd.distance_transform_edt(rest, return_indices=True)
        lab = lab[idx[0], idx[1]]
    return lab


def warp(mask, rng, amp, scale):
    """hand-cut wobble: displace a mask by a smooth random field"""
    h, w = mask.shape
    fx = P.fbm(h, w, rng, 3, scale) - 0.5
    fy = P.fbm(h, w, rng, 3, scale) - 0.5
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    return nd.map_coordinates(mask.astype(np.float32), [yy + fy * amp, xx + fx * amp], order=1, mode='nearest')


# ---------- skeleton -> strokes ----------
NB = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def trace_skeleton(sk):
    """split a 1-px skeleton into polylines between end points / junctions"""
    h, w = sk.shape
    pts = set(zip(*np.nonzero(sk)))
    def nbrs(p):
        y, x = p
        return [(y + dy, x + dx) for dy, dx in NB if (y + dy, x + dx) in pts]
    deg = {p: len(nbrs(p)) for p in pts}
    nodes = {p for p, d in deg.items() if d != 2}
    used = set()
    paths = []
    def walk(a, b):
        path = [a, b]
        prev, cur = a, b
        while cur not in nodes:
            nx = [q for q in nbrs(cur) if q != prev and (min(cur, q), max(cur, q)) not in used]
            if not nx:
                break
            used.add((min(cur, nx[0]), max(cur, nx[0])))
            prev, cur = cur, nx[0]
            path.append(cur)
        return path
    for a in nodes:
        for b in nbrs(a):
            e = (min(a, b), max(a, b))
            if e in used:
                continue
            used.add(e)
            paths.append(walk(a, b))
    # closed loops without nodes
    left = {p for p in pts if deg[p] == 2 and all((min(p, q), max(p, q)) not in used for q in nbrs(p))}
    while left:
        a = left.pop()
        nb = nbrs(a)
        if not nb:
            continue
        used.add((min(a, nb[0]), max(a, nb[0])))
        path = walk(a, nb[0])
        path.append(a)
        for q in path:
            left.discard(q)
        paths.append(path)
    return paths, deg


def smooth_path(p, k=3):
    a = np.array(p, np.float32)
    if len(a) < 2 * k + 1:
        return a
    out = a.copy()
    for i in range(len(a)):
        lo, hi = max(0, i - k), min(len(a), i + k + 1)
        out[i] = a[lo:hi].mean(0)
    out[0], out[-1] = a[0], a[-1]
    return out


def draw_strokes(paths, deg, hws, shape, rng, ss=2, press=0.32, minw=1.2):
    """draw every centre line as a brush stroke onto a supersampled canvas -> alpha (float, shape)"""
    h, w = shape
    im = Image.new('L', (w * ss, h * ss), 0)
    d = ImageDraw.Draw(im)
    for p, hw in zip(paths, hws):
        if len(p) < 3:
            continue
        a = smooth_path(p, 2)
        hw = nd.uniform_filter1d(hw.astype(np.float32), 5)  # local half width of the underlay line
        n = len(a)
        s = np.r_[0, np.cumsum(np.linalg.norm(np.diff(a, axis=0), axis=1))]
        L = max(s[-1], 1)
        # pressure: slow swell along the stroke, different per stroke
        f1, f2, ph1, ph2 = rng.uniform(0.008, 0.03), rng.uniform(0.04, 0.09), rng.uniform(0, 6.3), rng.uniform(0, 6.3)
        pr = 1 + press * (0.7 * np.sin(s * f1 + ph1) + 0.3 * np.sin(s * f2 + ph2))
        # entry / exit: a free end tapers (brush lifted), a joined end stays full
        t0 = deg.get(tuple(p[0]), 2) == 1
        t1 = deg.get(tuple(p[-1]), 2) == 1
        env = np.ones(n, np.float32)
        tl = min(L * 0.35, 26)
        if t0:
            env = np.minimum(env, 0.35 + 0.65 * np.clip(s / tl, 0, 1) ** 0.7)
        if t1:
            env = np.minimum(env, 0.25 + 0.75 * np.clip((L - s) / tl, 0, 1) ** 0.7)
        # the brush lands heavier at the start of a stroke
        env *= 1 + 0.18 * np.exp(-s / 12.0)
        wv = np.maximum(hw * 2 * pr * env, minw)
        # polygon from offsets
        tg = np.gradient(a, axis=0)
        tg /= np.linalg.norm(tg, axis=1, keepdims=True) + 1e-6
        nrm = np.stack([-tg[:, 1], tg[:, 0]], 1)
        left = a + nrm * (wv / 2)[:, None]
        right = a - nrm * (wv / 2)[:, None]
        poly = np.vstack([left, right[::-1]])[:, ::-1] * ss       # (y,x) -> (x,y)
        d.polygon([tuple(q) for q in poly], fill=255)
        for q, r in ((a[0], wv[0]), (a[-1], wv[-1])):              # round the joins
            y, x = q * ss
            rr = r * ss / 2
            d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=255)
    im = im.resize((w, h), Image.LANCZOS)
    return np.asarray(im, np.float32) / 255.0


def reprint(svg, out_png, scale=4.0, seed=11, rng_seed=5, wobble_amp=2.2, drop=None, extra=None):
    rng = np.random.default_rng(seed)
    h, w = int(P.H * scale), int(P.W * scale)
    px = scale
    u = render_underlay(svg, w, h)
    lab = classify(u)
    names = [n for _, n in UNDER]
    # inside the picture area only (our own frame replaces the underlay's border)
    yy, xx = np.mgrid[0:h, 0:w]
    m = (P.FR - 0.5) * px
    inner = (xx > m) & (xx < w - m) & (yy > m) & (yy < h - m)
    # the underlay's own black border: treat as nothing
    border = ~inner
    line = (lab == names.index('line')) & inner
    # colour under the lines: each line pixel takes the colour of the nearest non-line pixel
    nonline = ~((lab == names.index('line')) | border)
    _, idx = nd.distance_transform_edt(~nonline, return_indices=True)
    full = lab[idx[0], idx[1]]
    masks = {}
    for i, n in enumerate(names):
        if n in ('line', 'paper'):
            continue
        mk = (full == i) & inner
        if mk.sum() < 50:
            continue
        mk = warp(mk, rng, wobble_amp * px, 9)        # hand-cut stencil wobble
        masks[n] = np.clip(mk, 0, 1)
    # drop parts of the underlay's line work we draw ourselves (e.g. a written character)
    if drop is not None:
        line = line & ~drop(line, px)
    # thick black areas (caps, hubs, eyes) are cut as a black stencil in the key block, not stroked
    r0 = int(round(1.4 * px))
    yy0, xx0 = np.mgrid[-r0:r0 + 1, -r0:r0 + 1]
    disk = (yy0 ** 2 + xx0 ** 2) <= r0 * r0
    blob = nd.binary_dilation(nd.binary_erosion(line, disk), disk) & line
    blob = nd.binary_dilation(blob, iterations=2) & line
    line_thin = line & ~nd.binary_erosion(blob, iterations=1)
    blob_a = np.clip(warp(blob, rng, 1.2 * px, 9), 0, 1)
    line = line_thin
    # key lines: centre lines, redrawn with a brush
    dist = nd.distance_transform_edt(line)
    sk = skeletonize(line)
    paths, deg = trace_skeleton(sk)
    # warp the centre lines a little too, independently of the stencils (the key block is its own carving)
    fx = (P.fbm(h, w, rng, 3, 7) - 0.5) * 2.0 * px
    fy = (P.fbm(h, w, rng, 3, 7) - 0.5) * 2.0 * px
    wp = []
    for p in paths:
        a = np.array(p)
        wp.append([(int(np.clip(y + fy[y, x], 0, h - 1)), int(np.clip(x + fx[y, x], 0, w - 1))) for y, x in a])
    deg2 = {}
    for p, q in zip(paths, wp):
        deg2[tuple(q[0])] = deg.get(tuple(p[0]), 2)
        deg2[tuple(q[-1])] = deg.get(tuple(p[-1]), 2)
    hws = [dist[np.array(p)[:, 0], np.array(p)[:, 1]] for p in paths]
    lines = draw_strokes(wp, deg2, hws, (h, w), rng)
    lines = np.maximum(lines, blob_a)
    if extra is not None:
        extra(masks, lines, w, h, px, rng, full, names)
    P.print_masks(masks, lines, out_png, scale=scale, seed=seed + 1)
    return out_png


if __name__ == '__main__':
    reprint(sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 4.0)

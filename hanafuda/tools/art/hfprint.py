# -*- coding: utf-8 -*-
"""Hanafuda printer (v2), modelled on 19th-century hachihachi-bana cards (BnF set, see claude/hanafuda-spec.md):

  1. key block (sumi-ban): fine grey-black lines -- outlines, feathers, needles, hatching
  2. stencils (kappa-zuri) laid over it: flat colour pushed through a cut paper with a brush.
     Opaque glossy blue-black masses, translucent red/yellow/green. Each stencil sits a little
     off the key lines (misregistration), with brush streaks, thin spots and ragged edges.
  3. the backing paper turned over the face: a thick black frame with mitred corners.

Face 320 x 530 units; picture area inside the frame (FR units each side).
"""
import math, os, subprocess, tempfile, random
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from hfart_geom import W, H, catmull, dense, Wob, arclen, normals, wobble, brush, ellipse, xf

FR = 19.0          # frame width
PAPER = (238, 228, 207)
INK = {
    # pigments of the old stencil cards (not the saturated modern inks)
    'line': (22, 20, 22),     # sumi key line
    'k': (52, 50, 58),        # sumi wash for the black masses (key lines stay readable under it)
    'r': (186, 48, 36),       # shu (vermilion) dulled with beni
    'y': (220, 184, 70),      # shiō / gamboge yellow
    'o': (212, 122, 46),      # ōni (red lead orange)
    'p': (96, 74, 126),       # murasaki
    'bl': (110, 162, 190),    # light gunjō
    'g': (60, 120, 96),
    'br': (138, 82, 46),
    'w': (250, 249, 244),     # gofun
    'fl': (240, 218, 192),    # flesh
}
OPAQUE = {'w': 0.82}   # 'paper' = left unprinted (occludes, prints nothing)


class _OpSink:
    def __init__(self, card, ink):
        self.card, self.ink = card, ink
        if ink not in card.order:
            card.order.append(ink)

    def append(self, item):
        kind, poly = item
        self.card.ops.append((self.ink, kind, poly))


class Card:
    def __init__(self, name, seed=1):
        self.name = name
        self.rng = random.Random(seed)
        self.plates = {}
        self.order = []
        self.ops = []      # colour stencils in authored order: later shapes cover earlier ones (no overprint)

    def _p(self, ink):
        if ink != 'line':
            return _OpSink(self, ink)
        if ink not in self.plates:
            self.plates[ink] = []
            if ink != 'line':
                self.order.append(ink)
        return self.plates[ink]

    # stencil mass
    def mass(self, ink, pts, wob=0.8, smooth=True, closed=True):
        c = dense(pts, closed) if smooth else np.array(pts, float)
        c = wobble(c, self.rng, wob, closed)
        self._p(ink).append(('poly', c))
        return c

    def cut(self, ink, pts, wob=0.4, smooth=True):
        c = dense(pts, True) if smooth else np.array(pts, float)
        c = wobble(c, self.rng, wob, True)
        self._p(ink).append(('hole', c))

    def knock(self, pts, smooth=False, wob=0.3):
        """cut a hole in the black stencil so a colour printed later sits on bare paper"""
        c = dense(pts, True) if smooth else np.array(pts, float)
        self._p('k').append(('hole', c))

    def raw(self, ink, poly):
        self._p(ink).append(('poly', np.array(poly, float)))

    # key line
    def line(self, pts, w=1.5, closed=False, taper=(0.08, 0.1), press=0.25, smooth=True):
        if closed:
            pts = list(pts) + [pts[0], pts[1]]
        c = dense(pts) if smooth and len(pts) > 2 else np.array(pts, float)
        w = w * 1.4
        poly = brush(c, w, w, self.rng, taper, press)
        self._p('line').append(('poly', poly))
        self.ops.append(('line', 'poly', poly))

    def stroke(self, pts, w0, w1=None, ink='line', taper=(0.2, 0.35), press=0.2):
        poly = brush(np.array(pts, float), w0, w1, self.rng, taper, press)
        self._p(ink).append(('poly', poly))
        if ink == 'line':
            self.ops.append(('line', 'poly', poly))
        return poly

    def outlined(self, ink, pts, w=1.1, wob=0.8):
        """stencil colour + key outline (the colour will shift off the line when printed)"""
        self.mass(ink, pts, wob)
        self.line(pts, w, closed=True)

    def comb(self, pts, out=1, L=9.0, gap=3.2, w=0.9, jitter=0.35, mass=None, teeth=2.2):
        """needle fringe along a mass edge: short key strokes standing out of the edge (pine, willow)"""
        d = dense(pts)
        s = arclen(d)
        n = normals(d)
        rng = self.rng
        k = 0.0
        while k < s[-1]:
            i = int(np.searchsorted(s, k))
            i = min(i, len(d) - 1)
            p = d[i]; nn = n[i] * out
            t = np.array([nn[1], -nn[0]])
            Lr = L * rng.uniform(0.6, 1.15)
            ang = rng.uniform(-jitter, jitter)
            dirv = nn * math.cos(ang) + t * math.sin(ang) * 0.9
            self.stroke([p - nn * 1.5, p + dirv * Lr * 0.5, p + dirv * Lr], w, w * 0.3, taper=(0.05, 0.6), press=0.1)
            k += gap * rng.uniform(0.75, 1.25)
        if mass is not None:
            # serrate the stencil edge itself: small teeth pointing out
            k = 0.0
            while k < s[-1]:
                i = min(int(np.searchsorted(s, k)), len(d) - 1)
                p = d[i]; nn = n[i] * out
                t = np.array([nn[1], -nn[0]])
                tl = teeth * rng.uniform(0.7, 1.4)
                bw = 1.6 + teeth * 0.25
                self.raw(mass, [p - t * bw - nn * 2, p + nn * tl + t * rng.uniform(-0.8, 0.8), p + t * bw - nn * 2])
                k += gap * rng.uniform(0.8, 1.3)


# ---------------- raster ----------------
def _svg(items, scale):
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{int(W*scale)}" height="{int(H*scale)}" viewBox="0 0 {W} {H}">',
           '<rect width="100%" height="100%" fill="#000"/>']
    for kind, c in items:
        d = 'M' + ' L'.join(f'{x:.2f},{y:.2f}' for x, y in c) + 'Z'
        out.append(f'<path d="{d}" fill="{"#000" if kind == "hole" else "#fff"}"/>')
    out.append('</svg>')
    return '\n'.join(out)


def raster(items, scale):
    with tempfile.TemporaryDirectory() as td:
        sp, pp = os.path.join(td, 'p.svg'), os.path.join(td, 'p.png')
        open(sp, 'w').write(_svg(items, scale))
        subprocess.run(['rsvg-convert', '-o', pp, sp], check=True)
        return np.asarray(Image.open(pp).convert('L'), np.float32) / 255.0


def raster_ids(card, scale, lines=False):
    """one painter's-algorithm raster of all colour stencils: pixel value = ink index + 1 (0 = paper).
    lines=True: key lines take part too (value 31), so a later shape hides the key lines it covers."""
    inks = card.order
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{int(W*scale)}" height="{int(H*scale)}" viewBox="0 0 {W} {H}" shape-rendering="crispEdges">',
           '<rect width="100%" height="100%" fill="#000"/>']
    for ink, kind, c in card.ops:
        if ink == 'line' and not lines:
            continue
        d = 'M' + ' L'.join(f'{x:.2f},{y:.2f}' for x, y in c) + 'Z'
        if ink == 'line':
            v = 31 * 8
        else:
            v = 0 if kind == 'hole' else (inks.index(ink) + 1) * 8
        out.append(f'<path d="{d}" fill="rgb({v},0,0)"/>')
    out.append('</svg>')
    with tempfile.TemporaryDirectory() as td:
        sp, pp = os.path.join(td, 'p.svg'), os.path.join(td, 'p.png')
        open(sp, 'w').write('\n'.join(out))
        subprocess.run(['rsvg-convert', '-o', pp, sp], check=True)
        a = np.asarray(Image.open(pp).convert('RGB'), np.int32)[..., 0]
    return np.rint(a / 8.0).astype(np.int32)


def fbm(h, w, rng, octaves=5, base=6, persist=0.55, aniso=1.0):
    out = np.zeros((h, w), np.float32); amp = 1.0; tot = 0.0
    for o in range(octaves):
        gh = max(2, int(base * 2 ** o) + 1)
        gw = max(2, int(base * 2 ** o * w / h * aniso) + 2)
        g = rng.random((gh, gw)).astype(np.float32)
        im = Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        out += amp * np.asarray(im, np.float32) / 255.0; tot += amp; amp *= persist
    return out / tot


def streaks(h, w, rng, angle, scale):
    """brush streak field: noise stretched along the brush direction"""
    n = rng.random((h // 3 + 8, w // 40 + 8)).astype(np.float32)
    im = Image.fromarray((n * 255).astype(np.uint8)).resize((w * 2, h * 2), Image.BICUBIC)
    im = im.rotate(math.degrees(angle), resample=Image.BICUBIC, center=(w, h))
    im = im.crop((w // 2, h // 2, w // 2 + w, h // 2 + h))
    return np.asarray(im, np.float32) / 255.0


def shift(a, dx, dy):
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    im = im.transform(im.size, Image.AFFINE, (1, 0, -dx, 0, 1, -dy), resample=Image.BILINEAR)
    return np.asarray(im, np.float32) / 255.0


def blur(a, r):
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r)), np.float32) / 255.0


def paper(h, w, rng, px):
    img = np.ones((h, w, 3), np.float32) * np.array(PAPER, np.float32) / 255
    cloud = fbm(h, w, rng, 6, 4)
    img *= (0.95 + 0.08 * cloud)[..., None]
    # warm age stains
    st = np.clip((fbm(h, w, rng, 4, 3) - 0.62) * 3, 0, 1)
    img *= (1 - st * 0.06)[..., None] * np.array([1, 0.985, 0.95])
    # specks (bark bits / dust) and fibres
    m = Image.new('L', (w, h), 0); d = ImageDraw.Draw(m)
    for _ in range(int(w * h / (px * px) / 260)):
        x, y = rng.uniform(0, w), rng.uniform(0, h); r = rng.uniform(0.25, 0.9) * px
        d.ellipse([x - r, y - r * rng.uniform(0.6, 1), x + r, y + r], fill=int(rng.uniform(60, 200)))
    for _ in range(int(w * h / (px * px) / 120)):
        x, y = rng.uniform(0, w), rng.uniform(0, h); a = rng.uniform(0, math.pi); L = rng.uniform(2, 10) * px
        pts = []
        for k in range(6):
            a += rng.normal(0, 0.3); x += math.cos(a) * L / 6; y += math.sin(a) * L / 6; pts.append((x, y))
        d.line(pts, fill=int(rng.uniform(20, 70)), width=max(1, int(px * 0.25)))
    sp = np.asarray(m.filter(ImageFilter.GaussianBlur(px * 0.15)), np.float32) / 255
    paper.specks = sp            # applied at the end, on open paper only
    grain = rng.random((h, w)).astype(np.float32)
    img *= (1 - 0.03 * (grain - 0.5))[..., None]
    return np.clip(img, 0, 1), cloud


def print_card(card, out_png, scale=4.0, seed=7, reg=1.0):
    h, w = int(H * scale), int(W * scale)
    px = scale
    lines = None
    if 'line' in card.plates:
        vis = raster_ids(card, scale, lines=True) == 31
        lines = raster(card.plates['line'], scale) * blur(vis.astype(np.float32), 0.4 * px).clip(0, 1) ** 0.5
    ids = raster_ids(card, scale)
    masks = {}
    for ink in card.order:
        if ink == 'paper':
            continue
        masks[ink] = (ids == card.order.index(ink) + 1).astype(np.float32)
    return print_masks(masks, lines, out_png, scale, seed, reg)


def print_masks(masks, lines, out_png, scale=4.0, seed=7, reg=1.0, line_soft=0.3):
    rng = np.random.default_rng(seed)
    h, w = int(H * scale), int(W * scale)
    px = scale
    img, cloud = paper(h, w, rng, px)
    specks = paper.specks
    yy, xx = np.mgrid[0:h, 0:w]
    # where the drawing is dense (feathers, petals, needles) the print is kept quieter
    detail = np.zeros((h, w), np.float32) if lines is None else np.clip(blur(lines, 5 * px) * 3.2, 0, 1)
    cover = np.zeros((h, w), np.float32) if lines is None else lines.copy()
    inner = ((xx > FR * px - 2 * px) & (xx < (W - FR) * px + 2 * px) & (yy > FR * px - 2 * px) & (yy < (H - FR) * px + 2 * px)).astype(np.float32)

    # 1. key block
    if lines is not None:
        a = lines * inner
        a = shift(a, rng.normal(0, 0.3 * px), rng.normal(0, 0.3 * px))
        n = 0.6 * fbm(h, w, rng, 3, 70) + 0.4 * fbm(h, w, rng, 2, 220)
        a = np.clip((blur(a, line_soft * px) - 0.45) * 2.0 + 0.45 + (n - 0.5) * 0.85, 0, 1)
        a *= np.clip(1.15 - 0.5 * fbm(h, w, rng, 4, 40) ** 2, 0.5, 1)    # dry spots
        col = np.array(INK['line'], np.float32) / 255
        img = img * (1 - a[..., None] * 0.9) + col * a[..., None] * 0.9

    # 2. stencils
    for ink, a in masks.items():
        a = a * inner
        off = 1.1 * reg * px
        lim = 2.4 * reg * px
        a = shift(a, float(np.clip(rng.normal(0, off), -lim, lim)), float(np.clip(rng.normal(0, off), -lim, lim)))
        rough = 0.5 + (fbm(h, w, rng, 4, 55) - 0.5) * (1 - 0.7 * detail)
        a = np.clip((blur(a, 0.6 * px) - 0.5) * 2.8 + 0.5 + (rough - 0.5) * 0.95, 0, 1)
        ang = rng.uniform(-0.25, 0.25)
        stk = streaks(h, w, rng, ang, px)
        stk = 0.5 + (stk - 0.5) * 0.45
        mott = fbm(h, w, rng, 5, 6)                       # brush-dabbed mottling
        gran = fbm(h, w, rng, 2, 160)                     # pigment granulation
        quiet = 1 - 0.75 * detail
        dens = 0.84 + (0.26 * (mott - 0.5) + 0.10 * (stk - 0.5) + 0.10 * (gran - 0.5)) * quiet
        edge = np.clip(a - blur(a, 1.6 * px), 0, 1)
        dens = dens + edge * 0.16 * quiet
        cover = np.maximum(cover, a)
        # paper tooth: tiny skips where the brush did not push pigment into the fibres
        skip = rng.random((h // 3 + 1, w // 12 + 1)) > 0.993
        skip = np.asarray(Image.fromarray((skip * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC), np.float32)[:h, :w] / 255
        dens = dens * (1 - 0.0 * np.clip(blur(skip, 0.4 * px) * 1.6, 0, 1))
        col = np.array(INK[ink], np.float32) / 255
        if ink in OPAQUE:
            alpha = np.clip(a * dens * OPAQUE[ink], 0, 1)
            c2 = col[None, None, :] * (0.94 + 0.10 * (stk[..., None] - 0.5) + 0.08 * (fbm(h, w, rng, 4, 8)[..., None] - 0.5))
            if ink == 'k':
                # glossy black: fine bright scratches of the brush, paper grain showing in the gloss
                gl = np.clip((stk - 0.62) * 4, 0, 1) * 0.05 + np.clip((fbm(h, w, rng, 3, 90) - 0.7) * 2, 0, 1) * 0.05
                c2 = c2 + gl[..., None]
            img = img * (1 - alpha[..., None]) + c2 * alpha[..., None]
        else:
            alpha = np.clip(a * dens, 0, 1)
            under = img * col                       # multiply over paper and key lines
            body = col * (0.95 + 0.1 * (stk[..., None] - 0.5))
            wm = 0.88 if ink == 'k' else 0.45
            mix = under * wm + body * (1 - wm)
            mix = np.minimum(mix, img + 0.02)       # never lighter than what is under it
            img = img * (1 - alpha[..., None]) + mix * alpha[..., None]

    # paper grain shows through the inks a little (sized kozo surface)
    # specks of bark and dust: only on wide open paper, away from lines and colour
    openp = np.clip(1 - blur(cover, 2.5 * px) * 3.0, 0, 1)
    img *= (1 - specks * 0.35 * openp)[..., None]
    tooth = fbm(h, w, rng, 2, 240)
    img *= (0.97 + 0.06 * tooth)[..., None]

    # 3. frame: backing paper folded over the edge, mitred at the corners
    fr = FR * px
    jag = (fbm(h, w, rng, 3, 60) - 0.5) * 1.4 * px
    dx = np.minimum(xx, w - 1 - xx); dy = np.minimum(yy, h - 1 - yy)
    d = np.minimum(dx, dy) + jag
    fm = np.clip((fr - d) / (0.6 * px), 0, 1)
    fcol = np.array((30, 28, 36), np.float32) / 255
    fsh = 0.88 + 0.22 * fbm(h, w, rng, 4, 30) + 0.10 * (streaks(h, w, rng, 0.0, px) - 0.5) + 0.12 * (fbm(h, w, rng, 2, 200) - 0.5)
    # mitre: the fold lines at the four corners (a faint lighter crease)
    m1 = np.abs(np.abs(xx - (w - 1) / 2) - np.abs(yy - (h - 1) / 2) - ((w - 1) / 2 - (h - 1) / 2))
    near = (dx < fr) & (dy < fr)
    crease = np.where(near, np.clip(1 - np.abs(dx - dy) / (0.7 * px), 0, 1), 0) * 0.35
    fc = fcol[None, None, :] * fsh[..., None] + crease[..., None] * 0.25
    # outer edge of the frame catches light / wears to grey
    edgew = np.clip(1 - d / (1.6 * px), 0, 1) * 0.25
    fc = fc + edgew[..., None] * np.array([0.35, 0.33, 0.32])
    img = img * (1 - fm[..., None]) + fc * fm[..., None]
    # thin shadow of the turned edge onto the face
    sh = np.clip(1 - np.abs(d - fr - 0.8 * px) / (1.4 * px), 0, 1) * 0.16
    img *= (1 - sh)[..., None]
    # corners: very slightly rounded
    rr = 3.5 * px
    cx = np.clip(rr - dx, 0, None); cy = np.clip(rr - dy, 0, None)
    dist = np.where((dx < rr) & (dy < rr), rr - np.sqrt(cx ** 2 + cy ** 2), np.minimum(dx, dy))
    alpha = np.clip(dist / (0.7 * px), 0, 1)
    rgba = np.dstack([np.clip(img, 0, 1), alpha])
    Image.fromarray((rgba * 255).astype(np.uint8), 'RGBA').save(out_png)
    return out_png

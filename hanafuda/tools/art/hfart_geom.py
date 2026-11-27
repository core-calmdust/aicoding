# -*- coding: utf-8 -*-
"""Hanafuda card renderer: hand-traced plates -> printed card.

Each card is authored as plates (one per ink), the way the Meiji cards were made:
a black key block (sumi-ban) printed first, then flat colours laid with stencils
(kappa-zuri). Every shape is a hand-placed point list; the renderer turns it into
wobbly curves, rasterises each plate separately (rsvg-convert), and prints the
plates onto washi with misregistration, uneven ink, fibres and a folded black rim.

Coordinates: card face 320 x 530 units (the 32 x 53 mm hanafuda proportion).
"""
import math, os, random, subprocess, tempfile
import numpy as np
from PIL import Image, ImageFilter

W, H = 320.0, 530.0

# ---------- pigments (sampled to the look of Meiji stencil colours) ----------
INK = {
    'k':  (30, 26, 24),      # sumi black
    'r':  (196, 52, 38),     # vermilion (shu)
    'rd': (150, 34, 30),     # dark red (beni-ai mixed)
    'g':  (46, 98, 66),      # verdigris green
    'gl': (112, 150, 66),    # yellow-green (willow, young leaves)
    'b':  (38, 72, 128),     # prussian blue
    'bl': (92, 140, 170),    # light blue
    'y':  (222, 170, 46),    # yellow ochre / gamboge
    'p':  (104, 58, 112),    # purple
    'w':  (246, 240, 226),   # gofun white (opaque)
    'br': (112, 70, 40),     # brown
    'pk': (222, 132, 118),   # pink
    'gy': (128, 122, 112),   # grey wash
}
PAPER = (239, 229, 205)


# ---------- curve helpers ----------
def catmull(pts, closed=False, n=10):
    p = [np.array(q, float) for q in pts]
    if len(p) < 3:
        return np.array(p)
    if closed:
        p = [p[-1]] + p + [p[0], p[1]]
    else:
        p = [p[0] * 2 - p[1]] + p + [p[-1] * 2 - p[-2]]
    out = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        seg = max(2, int(np.linalg.norm(p2 - p1) / 2.2) + 2) if n is None else n
        for t in np.linspace(0, 1, seg, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    if not closed:
        out.append(p[-2])
    return np.array(out)


def dense(pts, closed=False):
    return catmull(pts, closed, n=None)


class Wob:
    """low-frequency hand tremor: a few sines along arc length"""
    def __init__(self, rng, amp=0.6, waves=3):
        self.c = [(rng.uniform(0.02, 0.09), rng.uniform(0, 6.28), rng.uniform(0.4, 1.0)) for _ in range(waves)]
        self.amp = amp

    def __call__(self, s):
        return self.amp * sum(a * math.sin(f * s + ph) for f, ph, a in self.c) / len(self.c)


def arclen(c):
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(c, axis=0), axis=1))]
    return d


def normals(c, closed=False):
    if closed:
        t = np.roll(c, -1, 0) - np.roll(c, 1, 0)
    else:
        t = np.gradient(c, axis=0)
    t /= (np.linalg.norm(t, axis=1, keepdims=True) + 1e-9)
    return np.stack([-t[:, 1], t[:, 0]], 1)


def wobble(c, rng, amp=0.5, closed=False):
    if len(c) < 3:
        return c
    s = arclen(c)
    wb = Wob(rng, amp)
    n = normals(c, closed)
    off = np.array([wb(x) for x in s])
    return c + n * off[:, None]


def brush(center, w0, w1=None, rng=None, taper=(0.25, 0.3), press=0.18, wmid=None):
    """variable-width brush stroke -> closed polygon.
    w0/w1 = width at start/end, wmid optional belly; taper fractions of length for entry/exit."""
    c = dense(center) if len(center) > 2 else np.array(center, float)
    if len(c) == 2:
        c = np.linspace(c[0], c[1], 12)
    if rng is not None:
        c = wobble(c, rng, 0.35)
    s = arclen(c)
    L = s[-1] if s[-1] > 0 else 1
    u = s / L
    w1 = w0 if w1 is None else w1
    base = w0 + (w1 - w0) * u
    if wmid is not None:
        base = base + (wmid - (w0 + w1) / 2) * np.sin(np.pi * u)
    ti, to = taper
    env = np.ones_like(u)
    if ti > 0:
        env = np.minimum(env, np.clip(u / ti, 0, 1) ** 0.6 * 0.85 + 0.15)
    if to > 0:
        env = np.minimum(env, np.clip((1 - u) / to, 0, 1) ** 0.6 * 0.9 + 0.1)
    wv = base * env
    if rng is not None and press:
        wb = Wob(rng, press, 4)
        wv = wv * (1 + np.array([wb(x * 3) for x in s]))
    n = normals(c)
    left = c + n * (wv / 2)[:, None]
    right = c - n * (wv / 2)[:, None]
    return np.vstack([left, right[::-1]])


def ellipse(cx, cy, rx, ry, rot=0, n=48):
    a = np.linspace(0, 2 * np.pi, n, endpoint=False)
    x, y = rx * np.cos(a), ry * np.sin(a)
    cr, sr = math.cos(rot), math.sin(rot)
    return np.stack([cx + x * cr - y * sr, cy + x * sr + y * cr], 1)


def xf(pts, dx=0, dy=0, s=1.0, rot=0.0, ox=0, oy=0, flip=False):
    """transform authored points: scale/rotate about (ox,oy), then translate"""
    p = np.array(pts, float) - [ox, oy]
    if flip:
        p[:, 0] = -p[:, 0]
    cr, sr = math.cos(rot), math.sin(rot)
    p = np.stack([p[:, 0] * cr - p[:, 1] * sr, p[:, 0] * sr + p[:, 1] * cr], 1) * s
    return p + [ox + dx, oy + dy]


# ---------- the card being authored ----------
class Card:
    def __init__(self, name, seed=1):
        self.name = name
        self.rng = random.Random(seed)
        self.plates = {}      # ink -> list of (kind, polygon, opacity)
        self.order = []       # print order of colour plates

    def _plate(self, ink):
        if ink not in self.plates:
            self.plates[ink] = []
            if ink != 'k':
                self.order.append(ink)
        return self.plates[ink]

    # flat colour (stencil): authored outline -> smooth, own wobble
    def fill(self, ink, pts, closed=True, smooth=True, wob=0.7, op=1.0, raw=False):
        c = np.array(pts, float)
        if not raw:
            c = dense(pts, closed) if smooth else c
            c = wobble(c, self.rng, wob, closed)
        self._plate(ink).append(('poly', c, op))
        return c

    def hole(self, ink, pts, smooth=True, wob=0.5):
        c = dense(pts, True) if smooth else np.array(pts, float)
        c = wobble(c, self.rng, wob, True)
        self._plate(ink).append(('hole', c, 1.0))

    def poly(self, ink, c, op=1.0):
        self._plate(ink).append(('poly', np.array(c, float), op))

    # key line along an outline (closed or open): variable width, broken a little at joins
    def line(self, pts, w=2.0, closed=False, ink='k', taper=(0.12, 0.16), press=0.22, wmid=None, smooth=True):
        if closed:
            pts = list(pts) + [pts[0], pts[1]]
        c = dense(pts) if smooth and len(pts) > 2 else np.array(pts, float)
        poly = brush(c, w, w, self.rng, taper, press, wmid)
        self._plate(ink).append(('poly', poly, 1.0))
        return poly

    def stroke(self, pts, w0, w1=None, ink='k', taper=(0.25, 0.3), press=0.18, wmid=None):
        poly = brush(np.array(pts, float), w0, w1, self.rng, taper, press, wmid)
        self._plate(ink).append(('poly', poly, 1.0))
        return poly

    def shape(self, ink, pts, w=2.0, wob=0.7, lw=None):
        """filled shape + independent key line around it (so they never sit exactly on each other)"""
        self.fill(ink, pts, wob=wob)
        self.line(pts, w if lw is None else lw, closed=True)

    def dot(self, ink, x, y, r, wob=0.3):
        self.fill(ink, ellipse(x, y, r, r * self.rng.uniform(0.9, 1.08), self.rng.uniform(0, 3), 18), wob=wob)



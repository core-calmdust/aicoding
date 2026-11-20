#!/usr/bin/env python3
"""Portal skins (きせかえ → スキン): page backgrounds for the atlas portal.

Writes  images/atlas/skin/<id>.webp     — the background (tile: seamless square / cover: 1920×1200 one picture)
        images/atlas/skin/t/<id>.webp   — the きせかえ thumbnail (240×150)
Run from the repo root:  python3 atlas/tools/skins.py [id ...]
Everything is procedural (numpy + Pillow): periodic FFT noise for seamless tiles, soft "plush" embossing for motifs
(height = blurred mask → normals → wrap lighting, same soft look as the portal's 3D art), layered landscapes for covers.
The catalogue (names, colours, rarity) is in atlas/skins.js — keep the ids in step.
"""
import math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'images', 'atlas', 'skin')
RNG = np.random.default_rng

# ---------------------------------------------------------------- helpers
def hexc(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255

def fnoise(n, beta=2.0, seed=0, m=None, aniso=(1, 1)):
    """periodic (seamless) noise n×m with a 1/f^beta spectrum, normalised to 0..1"""
    m = m or n
    r = RNG(seed)
    w = r.standard_normal((n, m))
    fy = np.fft.fftfreq(n)[:, None] * aniso[0]; fx = np.fft.fftfreq(m)[None, :] * aniso[1]
    f = np.sqrt(fx * fx + fy * fy); f[0, 0] = 1
    s = np.fft.ifft2(np.fft.fft2(w) / f ** (beta / 2)).real
    s -= s.min(); s /= s.max() or 1
    return s.astype(np.float32)

def blurw(a, rad):
    """gaussian blur with wrap-around (seamless), via FFT"""
    n, m = a.shape
    fy = np.fft.fftfreq(n)[:, None]; fx = np.fft.fftfreq(m)[None, :]
    g = np.exp(-2 * (math.pi * rad) ** 2 * (fx * fx + fy * fy))
    return np.fft.ifft2(np.fft.fft2(a) * g).real.astype(np.float32)

def lerp(a, b, t):
    t = np.asarray(t, np.float32)
    if t.ndim == 2: t = t[..., None]
    return a + (b - a) * t

def solid(n, col, m=None):
    return np.ones((n, m or n, 3), np.float32) * hexc(col)

def grain(img, k=0.012, seed=1):
    n, m = img.shape[:2]
    g = RNG(seed).standard_normal((n, m)).astype(np.float32) * k
    return img + g[..., None]

def shade(h, light=(-0.55, -0.65, 0.52), k=6.0, wrap=True):
    """soft lambert-ish shading of a height field (wrap lighting) → multiplier around 1"""
    if wrap:
        gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * .5; gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * .5
    else:
        gy, gx = np.gradient(h)
    nx, ny, nz = -gx * k, -gy * k, np.ones_like(h)
    l = np.array(light, np.float32); l /= np.linalg.norm(l)
    d = (nx * l[0] + ny * l[1] + nz * l[2]) / np.sqrt(nx * nx + ny * ny + 1)
    flat = l[2]
    return (d - flat)   # 0 on flat ground, + toward the light, − away

def to_img(a):
    return Image.fromarray(np.clip(a * 255 + .5, 0, 255).astype(np.uint8), 'RGB')

def mask_draw(n, ss, fn, m=None):
    """draw with PIL at ss× supersampling onto an L mask, return float n×m (wrap shapes yourself)"""
    m = m or n
    im = Image.new('L', (m * ss, n * ss), 0); d = ImageDraw.Draw(im)
    fn(d, ss)
    im = im.resize((m, n), Image.LANCZOS)
    return np.asarray(im, np.float32) / 255

def wrapped(n, x, y, r):
    """the copies of a shape at (x, y) with radius r needed for a seamless tile"""
    out = []
    for dx in (-n, 0, n):
        for dy in (-n, 0, n):
            if -r <= x + dx <= n + r and -r <= y + dy <= n + r: out.append((x + dx, y + dy))
    return out

def poly_t(pts, x, y, s, rot):
    c, si = math.cos(rot), math.sin(rot)
    return [(x + (px * c - py * si) * s, y + (px * si + py * c) * s) for px, py in pts]

def scatter(n, count, seed, minsep):
    """blue-noise-ish points on a torus"""
    r = RNG(seed); pts = []
    tries = 0
    while len(pts) < count and tries < count * 400:
        tries += 1
        p = r.random(2) * n
        ok = True
        for q in pts:
            d = np.abs(p - q); d = np.minimum(d, n - d)
            if d[0] * d[0] + d[1] * d[1] < minsep * minsep: ok = False; break
        if ok: pts.append(p)
    return pts

def emboss_layer(img, mask, col, rad=3, k=5, shadow=.18, sh_off=(4, 5), hi=.35, lo=.25, wrap=True, col2=None, light=(-0.55, -0.65, 0.52)):
    """paint a plush, softly lit shape (mask 0..1) of colour col onto img, with a soft drop shadow"""
    h = blurw(mask, rad) if wrap else np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(rad)), np.float32) / 255
    s = shade(h, k=k, wrap=wrap, light=light)
    sh = np.roll(np.roll(blurw(mask, rad * 2.2) if wrap else h, sh_off[1], 0), sh_off[0], 1)
    img = img * (1 - shadow * np.clip(sh - mask, 0, 1)[..., None])
    c = hexc(col) if isinstance(col, str) else col
    base = np.broadcast_to(c, img.shape) if col2 is None else lerp(hexc(col), hexc(col2), np.clip(1 - h, 0, 1))
    lit = base * (1 + np.clip(s, 0, None)[..., None] * hi * 3) - np.clip(-s, 0, None)[..., None] * lo * 3 * base
    lit = lit * (0.94 + 0.06 * np.clip(h, 0, 1))[..., None]
    return lerp(img, lit, mask)

def save(id_, img, kind, q=78):
    os.makedirs(os.path.join(OUT, 't'), exist_ok=True)
    im = img if isinstance(img, Image.Image) else to_img(img)
    p = os.path.join(OUT, id_ + '.webp'); im.save(p, 'WEBP', quality=q, method=6)
    # thumbnail 240×150 (2× for the 120×75 cell); tiles: shown at the page scale (displayed size = px / 1.5)
    if kind == 'tile':
        w = im.width; reps = Image.new('RGB', (w * 2, w * 2))
        for i in range(2):
            for j in range(2): reps.paste(im, (i * w, j * w))
        sc = 1 / 1.5 * (240 / 520)   # the thumbnail shows ~520 css px of page width
        t = reps.resize((int(w * 2 * sc), int(w * 2 * sc)), Image.LANCZOS).crop((0, 0, 240, 150))
    else:
        r = max(240 / im.width, 150 / im.height); t = im.resize((math.ceil(im.width * r), math.ceil(im.height * r)), Image.LANCZOS)
        x = (t.width - 240) // 2; y = (t.height - 150) // 2; t = t.crop((x, y, x + 240, y + 150))
    t.save(os.path.join(OUT, 't', id_ + '.webp'), 'WEBP', quality=80, method=6)
    print(id_, kind, im.size, os.path.getsize(p) // 1024, 'KB')

# ---------------------------------------------------------------- shapes
def star_pts(r=1, ri=.48, k=5):
    return [((r if i % 2 == 0 else ri) * math.cos(-math.pi / 2 + i * math.pi / k), (r if i % 2 == 0 else ri) * math.sin(-math.pi / 2 + i * math.pi / k)) for i in range(2 * k)]

def petal_pts():
    """a cherry petal: pointed at the base, wide and rounded at the top with a little notch"""
    pts = []
    for i in range(72):
        t = i / 72 * 2 * math.pi
        y = -math.cos(t)
        x = math.sin(t) * .62 * (1 + .45 * math.cos(t)) ** .9
        dt = min(t, 2 * math.pi - t)
        y += .28 * math.exp(-(dt / .28) ** 2)
        pts.append((x, y))
    return pts

def maple_pts():
    """a Japanese maple (momiji) leaf: 7 pointed lobes with deep notches, a short stem"""
    lobes = [(0, 1.0), (48, .92), (-48, .92), (95, .72), (-95, .72), (140, .42), (-140, .42)]
    pts = []
    for i in range(360):
        deg = i - 180
        r = .3
        for c, L in lobes:
            d = abs((deg - c + 180) % 360 - 180)
            r = max(r, .36 + (L - .36) * max(0, 1 - d / 30) ** 1.5)
        r *= 1 + .035 * math.sin(i * 1.3)
        a = math.radians(deg) - math.pi / 2
        pts.append((r * math.cos(a), r * math.sin(a)))
    k = len(pts) // 2   # the stem at the bottom (deg = 0 → index 180 is up; index 0 is down)
    stem = [(.05, .3), (.07, .78), (-.03, .78), (-.05, .3)]
    return pts[:2] + stem + pts[2:]

def heart_pts():
    pts = []
    for i in range(60):
        t = i / 60 * 2 * math.pi
        x = 16 * math.sin(t) ** 3; y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        pts.append((x / 17, y / 17))
    return pts

def spade_pts():
    h = heart_pts(); return [(x, -y - .1) for x, y in h]

def diamond_pts(): return [(0, -1), (.68, 0), (0, 1), (-.68, 0)]

def clover_draw(d, x, y, s, rot, fill=255):
    for k in range(3):
        a = rot + k * 2 * math.pi / 3 - math.pi / 2
        cx, cy = x + math.cos(a) * s * .48, y + math.sin(a) * s * .48
        d.ellipse([cx - s * .45, cy - s * .45, cx + s * .45, cy + s * .45], fill=fill)

def pawn_draw(d, x, y, s, fill=255):
    d.ellipse([x - .32 * s, y - .95 * s, x + .32 * s, y - .32 * s], fill=fill)
    d.polygon([(x - .2 * s, y - .45 * s), (x + .2 * s, y - .45 * s), (x + .42 * s, y + .6 * s), (x - .42 * s, y + .6 * s)], fill=fill)
    d.rounded_rectangle([x - .62 * s, y + .48 * s, x + .62 * s, y + .9 * s], radius=.18 * s, fill=fill)

def shogi_pts(): return [(0, -1), (.62, -.68), (.8, .95), (-.8, .95), (-.62, -.68)]

# ---------------------------------------------------------------- R : paper & fabric tiles
def washi(n=768, base='#f8f0dd', fib='#fffaf0', fib2='#e9dcc0', seed=3, gold=False):
    img = solid(n, base)
    mot = fnoise(n, 2.4, seed)
    img = img * (0.965 + 0.05 * mot)[..., None]
    r = RNG(seed + 1)
    # long fibres: thin curving strokes, wrap-around
    for layer, (col, cnt, wid, al) in enumerate([(fib2, 320, 1.5, .6), (fib, 520, 1.3, .9)]):
        m = Image.new('L', (n * 2, n * 2), 0); dd = ImageDraw.Draw(m)
        for _ in range(cnt):
            x, y = r.random() * n, r.random() * n; a = r.random() * math.pi * 2; L = 20 + r.random() * 90
            pts = []
            for k in range(12):
                a += (r.random() - .5) * .5
                pts.append((x, y)); x += math.cos(a) * L / 12; y += math.sin(a) * L / 12
            for ox in (-n, 0, n):
                for oy in (-n, 0, n):
                    dd.line([((px + ox + n / 2) * 2 % (n * 2) if False else (px + ox) * 2, (py + oy) * 2) for px, py in pts], fill=255, width=int(wid * 2))
        mm = np.asarray(m.resize((n, n), Image.LANCZOS), np.float32) / 255
        img = lerp(img, hexc(col), mm * al)
    if gold:
        # gold leaf flakes (kirihaku): irregular small polygons, softly lit
        gm = Image.new('L', (n * 2, n * 2), 0); gd = ImageDraw.Draw(gm)
        for _ in range(170):
            x, y = r.random() * n, r.random() * n; s = 2 + r.random() ** 2 * 16
            pts = [(math.cos(a) * s * (0.6 + r.random() * .6), math.sin(a) * s * (0.6 + r.random() * .6)) for a in np.linspace(0, 2 * math.pi, 6, endpoint=False) + r.random()]
            for X, Y in wrapped(n, x, y, s * 2):
                gd.polygon([((X + px) * 2, (Y + py) * 2) for px, py in pts], fill=255)
        gmask = np.asarray(gm.resize((n, n), Image.LANCZOS), np.float32) / 255
        tone = fnoise(n, 1.2, seed + 9)
        gold_c = lerp(hexc('#c99a3a'), hexc('#ffe7a0'), tone)
        img = lerp(img, gold_c, gmask * .92)
    return grain(img, .01, seed)

def streaks(n, seed, axis=0, period=3, sm=1.0):
    """thread lines: one random value per line, smoothly varying along the thread (seamless)"""
    r = RNG(seed)
    along = fnoise(n, 2.0, seed, m=n)   # slow variation
    vals = r.random(n).astype(np.float32)
    line = np.repeat(vals[None, :] if axis else vals[:, None], n, axis=0 if axis else 1)
    line = np.clip(line * .7 + along * .6 - .3, 0, 1)
    return line

def linen(n=768, base='#ede6d9', dark='#d3c6ae', seed=5):
    h = streaks(n, seed, 0); v = streaks(n, seed + 1, 1)
    idx = np.arange(n)
    over = (((idx[:, None] // 2) + (idx[None, :] // 2)) % 2).astype(np.float32)
    t = np.where(over > .5, h, v)
    t = blurw(t, .55)
    slub = blurw((RNG(seed).random((n, n)) > .9992).astype(np.float32), 1.0)
    slub = blurw(np.roll(slub, 0, 0), .5)
    img = lerp(hexc(base), hexc(dark), np.clip(t * .65, 0, 1))
    img = img * (0.98 + 0.04 * fnoise(n, 2.4, seed + 4))[..., None]
    return grain(img, .006, seed)

def kraft(n=768, seed=7):
    img = solid(n, '#dcc49e')
    img = img * (0.94 + 0.1 * fnoise(n, 2.2, seed))[..., None]
    sp = (RNG(seed).random((n, n)) > .996).astype(np.float32)
    img = lerp(img, hexc('#8a6a42'), blurw(sp, .7) * 2.2)
    sp2 = (RNG(seed + 3).random((n, n)) > .997).astype(np.float32)
    img = lerp(img, hexc('#f3e6cc'), blurw(sp2, .8) * 2)
    fib = fnoise(n, 1.4, seed + 2, aniso=(1, .25))
    img = img * (0.97 + 0.05 * fib)[..., None]
    return grain(img, .012, seed)

def felt(n=768, base='#d6efe2', dark='#bfe0cf', seed=11):
    t = fnoise(n, 1.2, seed) * .6 + fnoise(n, 2.6, seed + 1) * .4
    img = lerp(hexc(base), hexc(dark), t)
    fuzz = RNG(seed).standard_normal((n, n)).astype(np.float32)
    fuzz = blurw(fuzz, .8)
    img = img * (1 + fuzz[..., None] * .06)
    return grain(img, .01, seed)

def watercolor(n=1024, paper='#fbf8f1', inks=('#a9d4f5', '#c7b8f2'), seed=13, amt=.55):
    img = solid(n, paper) * (0.985 + 0.02 * fnoise(n, 2.8, seed))[..., None]
    for i, ink in enumerate(inks):
        f = blurw(fnoise(n, 3.6, seed + 10 * i), 2.5); f = (f - f.min()) / (f.max() - f.min())
        th = np.quantile(f, .55 + i * .05)
        blob = np.clip((f - th) / .10, 0, 1)
        blob = blurw(blob, 1.6)
        edge = np.clip(blob * (1 - blob) * 4, 0, 1) ** 1.5
        dens = blob * (.5 + .5 * fnoise(n, 1.6, seed + 3 + i)) + edge * .35
        img = lerp(img, img * hexc(ink) / max(hexc(ink).max(), .01), np.clip(dens * amt, 0, 1))
    tex = fnoise(n, .8, seed + 7)
    img = img * (0.985 + 0.03 * tex)[..., None]
    return grain(img, .008, seed)

def graph(n=768, base='#fcf9f0', line='#a8c8ea', seed=17):
    img = solid(n, base) * (0.985 + 0.02 * fnoise(n, 2.4, seed))[..., None]
    step = 24; m = np.zeros((n, n), np.float32)
    idx = np.arange(n)
    minor = ((idx % step) == 0).astype(np.float32); major = ((idx % (step * 4)) == 0).astype(np.float32)
    m = np.maximum(np.maximum(minor[:, None], minor[None, :]) * .35, np.maximum(major[:, None], major[None, :]) * .7)
    m = blurw(m, .5) * 1.8
    img = lerp(img, hexc(line), np.clip(m, 0, 1) * .8)
    return grain(img, .006, seed)

def gingham(n=768, base='#fff8f9', c='#f7c7d3', seed=19):
    p = 48
    idx = np.arange(n)
    band = (((idx // (p // 2)) % 2) == 0).astype(np.float32)
    band = blurw(np.tile(band, (n, 1)), 1.2)[0]
    a = band[:, None]; b = band[None, :]
    t = a * .45 + b * .45 + a * b * .25   # crossings darker
    weave = ((idx[:, None] + idx[None, :]) % 3 == 0).astype(np.float32) * .08
    img = lerp(hexc(base), hexc(c), np.clip(t + weave * (t > .1), 0, 1) * .7)
    img = img * (1 + blurw(RNG(seed).standard_normal((n, n)).astype(np.float32), .7)[..., None] * .03)
    return grain(img, .006, seed)

def cork(n=768, seed=23):
    r = RNG(seed)
    t = fnoise(n, 1.0, seed) * .5 + fnoise(n, 2.0, seed + 1) * .5
    gran = blurw(r.random((n, n)).astype(np.float32), 1.6)
    gran = (gran - gran.min()) / (gran.max() - gran.min())
    t = np.clip(t * .5 + gran * .9 - .2, 0, 1)
    img = lerp(hexc('#ead2a8'), hexc('#c69a62'), t)
    pits = (r.random((n, n)) > .995).astype(np.float32)
    img = lerp(img, hexc('#8d6236'), np.clip(blurw(pits, 1.1) * 3, 0, 1))
    return grain(img, .012, seed)

def terrazzo(n=1024, base='#f7f3ec', chips=('#f3b5a5', '#a8d5c8', '#f6d58e', '#b9c4e8', '#e6dccb', '#d7b8d8'), seed=29):
    img = solid(n, base) * (0.985 + 0.02 * fnoise(n, 2.2, seed))[..., None]
    r = RNG(seed)
    for ci, col in enumerate(chips):
        m = Image.new('L', (n * 2, n * 2), 0); d = ImageDraw.Draw(m)
        for _ in range(42):
            x, y = r.random() * n, r.random() * n; s = 5 + r.random() ** 1.8 * 30
            k = 5 + int(r.random() * 4)
            pts = [(math.cos(a) * s * (0.55 + r.random() * .55), math.sin(a) * s * (0.55 + r.random() * .55)) for a in np.linspace(0, 2 * math.pi, k, endpoint=False) + r.random() * 6]
            for X, Y in wrapped(n, x, y, s * 1.2):
                d.polygon([((X + px) * 2, (Y + py) * 2) for px, py in pts], fill=255)
        mm = np.asarray(m.resize((n, n), Image.LANCZOS), np.float32) / 255
        tone = fnoise(n, 1.5, seed + ci)
        img = lerp(img, lerp(hexc(col), hexc(col) * .9, tone), mm * .9)
    return grain(img, .008, seed)

def kaya(n=768, seed=31):
    """light kaya (go-board) wood, straight fine grain; periodic in y with an integer number of rings"""
    y = np.arange(n)[:, None] / n
    warp = blurw(fnoise(n, 2.4, seed), 3) * .025
    rings = 40
    ph = (y + warp) * rings
    g = np.clip(1 - np.abs(np.sin(ph * math.pi)) / .16, 0, 1) * (.5 + .5 * fnoise(n, 1.6, seed + 5))
    fib = streaks(n, seed + 2, 0) * .5 + streaks(n, seed + 7, 0) * .5
    fib = blurw(fib, .6)
    t = np.clip(g * .55 + (fib - .3) * .35, 0, 1)
    img = lerp(hexc('#f7e6c2'), hexc('#dcb67c'), t)
    img = img * (0.975 + 0.04 * fnoise(n, 2.6, seed + 3))[..., None]
    return grain(img, .006, seed)

def polka(n=768, base='#fff9d9', dot='#ffe27a', seed=37):
    img = solid(n, base)
    p = n // 8
    m = mask_draw(n, 3, lambda d, s: [d.ellipse([(cx - 13) * s, (cy - 13) * s, (cx + 13) * s, (cy + 13) * s], fill=255)
        for i in range(9) for j in range(9) for cx, cy in [(i * p + (p // 2 if j % 2 else 0), j * p)]])
    img = emboss_layer(img, m, dot, rad=2.5, k=4, shadow=.10, sh_off=(2, 3))
    weave = blurw(RNG(seed).standard_normal((n, n)).astype(np.float32), .7)
    img = img * (1 + weave[..., None] * .03)
    return grain(img, .006, seed)

# ---------------------------------------------------------------- SR : motif tiles (plush emboss)
def motif_tile(n, base, seed, items, bgtex=.03):
    img = solid(n, base) * (1 - bgtex / 2 + bgtex * fnoise(n, 2.2, seed))[..., None]
    for draw, col, kw in items:
        m = mask_draw(n, 3, draw)
        img = emboss_layer(img, m, col, **kw)
    return grain(img, .006, seed)

def scatter_shapes(n, pts_fn, count, seed, size, minsep, rots=True):
    r = RNG(seed + 100); P = scatter(n, count, seed, minsep)
    shapes = [(p[0], p[1], size * (0.75 + r.random() * .5), r.random() * math.pi * 2 if rots else 0) for p in P]
    def draw(d, ss):
        for x, y, s, a in shapes:
            for X, Y in wrapped(n, x, y, s * 1.3):
                d.polygon([(px * ss, py * ss) for px, py in poly_t(pts_fn(), X, Y, s, a)], fill=255)
    return draw

def sakura(n=768, seed=41):
    a = scatter_shapes(n, petal_pts, 24, seed, 26, 95)
    b = scatter_shapes(n, petal_pts, 16, seed + 7, 17, 80)
    return motif_tile(n, '#fdf0f3', seed, [(b, '#f8cdd9', dict(rad=2, k=4, shadow=.08, sh_off=(3, 4))), (a, '#f7b9cb', dict(rad=2.4, k=4.5, shadow=.12, sh_off=(4, 5), col2='#fde4ec'))])

def momiji(n=768, seed=43):
    a = scatter_shapes(n, maple_pts, 14, seed, 40, 140)
    b = scatter_shapes(n, maple_pts, 9, seed + 5, 28, 120)
    return motif_tile(n, '#fbf2e3', seed, [(b, '#f4c27a', dict(rad=2.2, k=4, shadow=.10, sh_off=(3, 4))), (a, '#ec9a6e', dict(rad=2.6, k=4.5, shadow=.13, sh_off=(4, 5), col2='#f6c08f'))])

def snowflake_draw(n, seed, cnt, size, minsep):
    r = RNG(seed + 3); P = scatter(n, cnt, seed, minsep)
    S = [(p[0], p[1], size * (0.7 + r.random() * .6), r.random()) for p in P]
    def draw(d, ss):
        for x, y, s, a in S:
            for X, Y in wrapped(n, x, y, s * 1.2):
                for k in range(6):
                    t = a + k * math.pi / 3; c, si = math.cos(t), math.sin(t)
                    w = max(2, int(s * .16 * ss))
                    d.line([(X * ss, Y * ss), ((X + c * s) * ss, (Y + si * s) * ss)], fill=255, width=w)
                    for f in (.45, .72):
                        bx, by = X + c * s * f, Y + si * s * f
                        for sg in (-1, 1):
                            t2 = t + sg * .75
                            d.line([(bx * ss, by * ss), ((bx + math.cos(t2) * s * .3) * ss, (by + math.sin(t2) * s * .3) * ss)], fill=255, width=w)
                d.ellipse([(X - s * .16) * ss, (Y - s * .16) * ss, (X + s * .16) * ss, (Y + s * .16) * ss], fill=255)
    return draw

def yuki(n=768, seed=47):
    return motif_tile(n, '#eef5fb', seed, [(snowflake_draw(n, seed + 1, 14, 18, 100), '#d8e8f6', dict(rad=1.6, k=4, shadow=.06, sh_off=(2, 3))),
                                         (snowflake_draw(n, seed, 12, 32, 140), '#ffffff', dict(rad=2, k=5, shadow=.12, sh_off=(3, 4), col2='#e6f1fb'))])

def seigaiha(n=768, base='#f3f6f8', c1='#cfe0ea', c2='#e7eff4', seed=53):
    """blue wave scales: concentric rings, each lower row over the one above (periodic)"""
    R = n / 12
    H2 = 2 * n
    yy, xx = np.mgrid[0:H2, 0:n].astype(np.float32)
    dist = np.full((H2, n), 1e9, np.float32)
    rows = int(H2 / (R / 2))
    for j in range(rows + 2):
        cy = j * R / 2; off = R if j % 2 else 0
        for i in range(-1, int(n / (2 * R)) + 2):
            cx = i * 2 * R + off
            dx = (xx - cx + n / 2) % n - n / 2; dy = yy - cy
            dd = np.sqrt(dx * dx + dy * dy)
            ins = (dd < R)
            dist = np.where(ins, dd, dist)
    dist = dist[n // 2: n // 2 + n]
    ring = np.clip(((np.sin(dist / R * math.pi * 4.5) * .5 + .5) - .55) / .25, 0, 1)
    img = lerp(lerp(hexc(base), hexc(c2), .6), hexc(c1), ring * .9)
    edge = np.clip(1 - np.abs(dist - R * .98) / 2.5, 0, 1)
    img = lerp(img, hexc(c1) * .92, edge * .5)
    img = img * (0.985 + 0.03 * fnoise(n, 2.4, seed))[..., None]
    return grain(img, .006, seed)

def pieces(n=768, base='#fbf3e2', seed=59, cols=('#f2d9a8', '#f4c8b8', '#cfe4d3', '#cdd9ef')):
    """board-game pieces, tone on tone: pawn, die, go stone, shogi piece, star"""
    r = RNG(seed + 5); P = scatter(n, 22, seed, 135)
    kinds = ['pawn', 'die', 'stone', 'shogi', 'star', 'heart']
    S = [(p[0], p[1], 32 + r.random() * 8, (r.random() - .5) * .8, kinds[i % len(kinds)], i % len(cols)) for i, p in enumerate(P)]
    items = []
    for ci, col in enumerate(cols):
        def draw(d, ss, ci=ci):
            for x, y, s, a, k, c in S:
                if c != ci: continue
                for X, Y in wrapped(n, x, y, s * 1.4):
                    if k == 'pawn': pawn_draw(d, X * ss, Y * ss, s * ss)
                    elif k == 'die':
                        d.polygon([(px * ss, py * ss) for px, py in poly_t([(-.75, -.75), (.75, -.75), (.75, .75), (-.75, .75)], X, Y, s, a)], fill=255)
                    elif k == 'stone': d.ellipse([(X - s * .8) * ss, (Y - s * .8) * ss, (X + s * .8) * ss, (Y + s * .8) * ss], fill=255)
                    elif k == 'shogi': d.polygon([(px * ss, py * ss) for px, py in poly_t(shogi_pts(), X, Y, s * .95, a * .4)], fill=255)
                    elif k == 'star': d.polygon([(px * ss, py * ss) for px, py in poly_t(star_pts(), X, Y, s * 1.0, a)], fill=255)
                    else: d.polygon([(px * ss, py * ss) for px, py in poly_t(heart_pts(), X, Y, s * .85, a * .4)], fill=255)
        items.append((draw, col, dict(rad=3, k=5, shadow=.13, sh_off=(4, 6))))
    img = motif_tile(n, base, seed, items)
    # die pips
    pm = mask_draw(n, 3, lambda d, ss: [d.ellipse([(X + ox * s * .4 - s * .12) * ss, (Y + oy * s * .4 - s * .12) * ss, (X + ox * s * .4 + s * .12) * ss, (Y + oy * s * .4 + s * .12) * ss], fill=255)
        for x, y, s, a, k, c in S if k == 'die' for X, Y in wrapped(n, x, y, s * 1.4) for ox, oy in [(-1, -1), (0, 0), (1, 1)]])
    return lerp(img, img * .82, pm * .8)

def suits(n=768, seed=61):
    r = RNG(seed + 1); P = scatter(n, 24, seed, 110)
    fns = [heart_pts, diamond_pts, spade_pts, None]
    S = [(p[0], p[1], 26 + r.random() * 8, (r.random() - .5) * .6, i % 4) for i, p in enumerate(P)]
    def mk(kinds):
        def draw(d, ss):
            for x, y, s, a, k in S:
                if k not in kinds: continue
                for X, Y in wrapped(n, x, y, s * 1.5):
                    if k == 3:
                        clover_draw(d, X * ss, Y * ss, s * ss * .62, a)
                        d.polygon([((X - s * .18) * ss, (Y + s * .2) * ss), ((X + s * .18) * ss, (Y + s * .2) * ss), ((X + s * .3) * ss, (Y + s * .9) * ss), ((X - s * .3) * ss, (Y + s * .9) * ss)], fill=255)
                    elif k == 2:
                        d.polygon([(px * ss, py * ss) for px, py in poly_t(fns[2](), X, Y - s * .1, s * .9, a)], fill=255)
                        d.polygon([(px * ss, py * ss) for px, py in poly_t([(-.12, .3), (.12, .3), (.3, .95), (-.3, .95)], X, Y, s, a)], fill=255)
                    else:
                        d.polygon([(px * ss, py * ss) for px, py in poly_t(fns[k](), X, Y, s * .9, a)], fill=255)
        return draw
    return motif_tile(n, '#eef7f1', seed, [(mk((0, 1)), '#f6c2c2', dict(rad=2.4, k=4.5, shadow=.12, sh_off=(3, 5))), (mk((2, 3)), '#bfdccd', dict(rad=2.4, k=4.5, shadow=.12, sh_off=(3, 5)))])

def ichimatsu(n=768, a='#f6efe2', b='#e6dac4', seed=67):
    p = n // 8
    idx = np.arange(n)
    c = (((idx[:, None] // p) + (idx[None, :] // p)) % 2).astype(np.float32)
    c = blurw(c, .8)
    img = lerp(hexc(a), hexc(b), c)
    tex = fnoise(n, 1.0, seed, aniso=(1, .1)) * .5 + fnoise(n, 1.0, seed + 1, aniso=(.1, 1)) * .5
    img = img * (0.975 + 0.05 * tex)[..., None]
    return grain(img, .006, seed)

def stardust(n=768, base='#efe9fb', seed=71):
    big = scatter_shapes(n, star_pts, 16, seed, 21, 130)
    sm = scatter_shapes(n, star_pts, 24, seed + 3, 10, 80)
    img = motif_tile(n, base, seed, [(sm, '#fff1b8', dict(rad=1.5, k=4, shadow=.06, sh_off=(2, 3))), (big, '#ffe08a', dict(rad=2.4, k=5, shadow=.10, sh_off=(3, 4), col2='#fff4c8'))])
    tw = (RNG(seed).random((n, n)) > .9988).astype(np.float32)
    return lerp(img, np.ones(3, np.float32), np.clip(blurw(tw, 1.0) * 5, 0, 1))

def bubbles(n=768, base='#e8f5fc', seed=73):
    r = RNG(seed); P = scatter(n, 22, seed, 100)
    img = solid(n, base) * (0.985 + 0.03 * fnoise(n, 2.4, seed))[..., None]
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    for p in P:
        R = 14 + r.random() ** 1.5 * 34
        for X, Y in wrapped(n, p[0], p[1], R + 4):
            d = np.sqrt((xx - X) ** 2 + (yy - Y) ** 2) / R
            rim = np.clip(1 - np.abs(d - .96) / .08, 0, 1) * (d < 1.1)
            film = np.clip(1 - d, 0, 1) ** .5 * (d < 1)
            hl = np.clip(1 - np.sqrt((xx - X + R * .35) ** 2 + (yy - Y + R * .38) ** 2) / (R * .22), 0, 1) ** 2
            hue = .5 + .5 * np.sin((xx - X) / R * 2 + (yy - Y) / R * 1.3)
            tint = lerp(hexc('#bfe3ff'), hexc('#f3c7ec'), hue)
            img = lerp(img, tint, film[..., None] * .10)
            img = lerp(img, tint * .9, rim * .75)
            img = lerp(img, np.ones(3, np.float32), hl * .85)
    return grain(img, .005, seed)

def clover(n=768, seed=79):
    r = RNG(seed + 2); P = scatter(n, 20, seed, 110)
    S = [(p[0], p[1], 20 + r.random() * 9, r.random() * 6) for p in P]
    def draw(d, ss):
        for x, y, s, a in S:
            for X, Y in wrapped(n, x, y, s * 1.4):
                clover_draw(d, X * ss, Y * ss, s * ss, a)
    def stem(d, ss):
        for x, y, s, a in S:
            for X, Y in wrapped(n, x, y, s * 1.6):
                t = a + math.pi / 6; d.line([(X * ss, Y * ss), ((X + math.cos(t) * s * 1.2) * ss, (Y + math.sin(t) * s * 1.2) * ss)], fill=255, width=int(s * .16 * ss))
    return motif_tile(n, '#f1f6e4', seed, [(stem, '#a9cf8f', dict(rad=1.4, k=3, shadow=.08, sh_off=(2, 3))), (draw, '#b6da98', dict(rad=2.6, k=5, shadow=.12, sh_off=(3, 5), col2='#d5ecbf'))])

def maple_planks(n=768, seed=83):
    """light maple floor boards, 4 vertical planks (seamless: board ends staggered on a 1-tile period)"""
    img = np.zeros((n, n, 3), np.float32)
    pw = n // 4; r = RNG(seed)
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    fibres = blurw(streaks(n, seed + 3, 1) * .5 + streaks(n, seed + 4, 1) * .5, .6)
    for i in range(4):
        base = lerp(hexc('#f4e1bf'), hexc('#ebcfa0'), r.random())
        warp = blurw(fnoise(n, 2.6, seed + i), 4) * 18
        lx = xx - i * pw + warp
        ring = np.clip(1 - np.abs(np.sin(lx / (9 + r.random() * 5) * math.pi)) / .2, 0, 1) * .5
        col = lerp(base, base * .88, np.clip(ring + (fibres - .4) * .4, 0, 1))
        sl = (xx >= i * pw) & (xx < (i + 1) * pw)
        img[sl] = col[sl]
    gap = np.zeros((n, n), np.float32)
    for i in range(4): gap[:, i * pw] = 1
    for i in range(4): e = int(r.random() * n); gap[e, i * pw:(i + 1) * pw] = 1
    gap = blurw(gap, .7) * 2
    img = lerp(img, img * .75, np.clip(gap, 0, 1))
    return grain(img, .006, seed)

def table_felt(n=768, seed=89):
    t = fnoise(n, 1.0, seed) * .5 + fnoise(n, 2.5, seed + 1) * .5
    img = lerp(hexc('#2f6b4f'), hexc('#3a7d5d'), t)
    fuzz = blurw(RNG(seed).standard_normal((n, n)).astype(np.float32), .9)
    img = img * (1 + fuzz[..., None] * .07)
    return grain(img, .012, seed)

def marble(n=1024, base='#f7f6f3', vein='#b9b6b2', gold=False, seed=97):
    """white marble, seamless (veins from periodic turbulence)"""
    x = np.arange(n)[None, :] / n; y = np.arange(n)[:, None] / n
    t1 = blurw(fnoise(n, 3.8, seed), 10); t1 = (t1 - t1.min()) / (t1.max() - t1.min())
    t2 = blurw(fnoise(n, 3.0, seed + 1), 3); t2 = (t2 - t2.min()) / (t2.max() - t2.min())
    turb = t1 + t2 * .08
    v = np.abs(np.sin((x * 1 + y * 1 + turb * .9) * math.pi * 2))
    v2 = np.abs(np.sin((x * 2 - y * 1 + turb * 1.2 + .3) * math.pi * 2))
    veins = np.clip(1 - v / .035, 0, 1) ** 1.3 * .9 + np.clip(1 - v2 / .02, 0, 1) ** 1.3 * .4
    veins = blurw(veins, .8) + blurw(np.clip(1 - v / .2, 0, 1) ** 2, 6) * .25
    cloud = fnoise(n, 3.0, seed + 5)
    img = lerp(hexc(base), hexc('#e9e6e1'), cloud * .6)
    vc = hexc('#c9a24a') if gold else hexc(vein)
    img = lerp(img, vc, np.clip(veins * (.55 + .45 * fnoise(n, 2.0, seed + 7)), 0, 1) * (1 if gold else .7))
    if gold:
        sheen = np.clip(veins, 0, 1) * fnoise(n, 1.0, seed + 9)
        img = img + sheen[..., None] * hexc('#fff0b8') * .25
    return grain(img, .005, seed)

# ---------------------------------------------------------------- covers (1920×1200, one picture)
W, H = 1920, 1200

def vgrad(stops, h=H, w=W):
    ys = np.linspace(0, 1, h)
    cols = np.array([hexc(c) for _, c in stops]); pos = np.array([p for p, _ in stops])
    out = np.stack([np.interp(ys, pos, cols[:, i]) for i in range(3)], -1).astype(np.float32)
    return np.broadcast_to(out[:, None, :], (h, w, 3)).copy()

def ridge(seed, base, amp, freq=3, h=H, w=W, rough=.25):
    """a 1D skyline (y in px for each x)"""
    r = RNG(seed); x = np.linspace(0, 1, w)
    y = np.full(w, base, np.float32)
    for k in range(1, 7):
        y += np.sin(x * math.pi * 2 * freq * k * (0.7 + r.random() * .6) + r.random() * 6) * amp / k ** (1.2 + rough)
    return y

def layer_mask(yline, h=H, soft=1.6):
    yy = np.arange(h)[:, None].astype(np.float32)
    return np.clip((yy - yline[None, :]) / soft + .5, 0, 1)

def paint_layer(img, yline, top, bot, soft=1.6, shade_k=0, haze=None):
    m = layer_mask(yline, soft=soft)
    yy = np.arange(H)[:, None].astype(np.float32)
    t = np.clip((yy - yline[None, :]) / 260, 0, 1)
    col = lerp(np.broadcast_to(hexc(top), (H, W, 3)), np.broadcast_to(hexc(bot), (H, W, 3)), t)
    return lerp(img, col, m)

def cloud_mask(cx, cy, s, seed, h=H, w=W):
    r = RNG(seed)
    lobes = [(-.62, .02, .38), (-.22, -.18, .5), (.28, -.12, .46), (.66, 0, .34), (.02, .02, .42)]
    def draw(d, ss):
        for lx, ly, lr in lobes:
            rr = lr * s * (0.9 + r.random() * .2)
            X, Y = cx + lx * s, cy + ly * s
            d.ellipse([(X - rr) * ss, (Y - rr) * ss, (X + rr) * ss, (Y + rr) * ss], fill=255)
        d.rounded_rectangle([(cx - .9 * s) * ss, (cy - .05 * s) * ss, (cx + .9 * s) * ss, (cy + .3 * s) * ss], radius=.18 * s * ss, fill=255)
    return draw

def soft_clouds(img, clouds, col, under, seed=1, rad=10, hi=.25, shadow=.0):
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    for i, (x, y, s) in enumerate(clouds): cloud_mask(x, y, s, seed + i)(d, 1)
    m = m.filter(ImageFilter.GaussianBlur(1.2))
    mm = np.asarray(m, np.float32) / 255
    return emboss_layer(img, mm, col, rad=rad, k=14, shadow=shadow, wrap=False, col2=under, hi=hi, lo=.12, light=(-0.3, -0.85, 0.5))

def scatter_cover(seed, cnt, minsep, region):
    r = RNG(seed); pts = []; x0, y0, x1, y1 = region; tries = 0
    while len(pts) < cnt and tries < cnt * 300:
        tries += 1; p = (x0 + r.random() * (x1 - x0), y0 + r.random() * (y1 - y0))
        if all((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 > minsep ** 2 for q in pts): pts.append(p)
    return pts

def sky_cover(seed=101):
    img = vgrad([(0, '#bfe3fb'), (.55, '#e3f3fd'), (1, '#fdf7ea')])
    img = soft_clouds(img, [(260, 260, 150), (1500, 190, 120), (1020, 420, 90), (1760, 560, 140), (180, 760, 170), (820, 900, 200), (1500, 980, 220), (520, 1120, 180)], '#ffffff', '#dcebf6', seed)
    return grain(img, .006, seed)

def sunset_cover(seed=103):
    img = vgrad([(0, '#f9c9a4'), (.35, '#fbd9b0'), (.62, '#fde9c8'), (1, '#fff3dc')])
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    sun = np.clip(1 - np.sqrt((xx - 1350) ** 2 + (yy - 600) ** 2) / 110, 0, 1)
    glow = np.exp(-((xx - 1350) ** 2 + (yy - 600) ** 2) / (2 * 420 ** 2))
    img = lerp(img, hexc('#fff3c4'), glow * .5)
    img = lerp(img, hexc('#ffe7a6'), np.clip(sun * 4, 0, 1))
    for i, (b, a, top, bot) in enumerate([(700, 60, '#f3c2b2', '#f6d1bf'), (800, 70, '#e8aaa6', '#efc0b4'), (900, 60, '#d99aa5', '#e6b2b2'), (1020, 50, '#c88fa5', '#d8a4ae')]):
        img = paint_layer(img, ridge(seed + i, b, a, freq=1.2 + i * .3), top, bot, soft=1.2)
    return grain(img, .007, seed)

def sea_cover(seed=107):
    img = vgrad([(0, '#cdeafc'), (.45, '#eaf6fd'), (.52, '#bfe3f2'), (.7, '#9fd3ea'), (1, '#f4e6c8')])
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # gentle wave lines on the water
    wv = np.sin(xx / 70 + np.sin(yy / 30) * 2 + yy * .06) * .5 + .5
    water = (yy > 620) & (yy < 900)
    img = lerp(img, img * 1.06, (wv > .93) * water * .6)
    # beach with foam edge
    shore = 900 + np.sin(np.arange(W) / 160) * 18 + np.sin(np.arange(W) / 47) * 6
    img = paint_layer(img, shore - 14, '#ffffff', '#e9f6f8', soft=6)
    img = paint_layer(img, shore, '#f6e7c8', '#f1dcb4', soft=2)
    img = soft_clouds(img, [(300, 300, 120), (1500, 230, 110), (980, 420, 70)], '#ffffff', '#dfeef8', seed)
    return grain(img, .006, seed)

def snow_cover(seed=109):
    img = vgrad([(0, '#cfe0f2'), (.55, '#e8f0f8'), (1, '#fbfdff')])
    yy = np.arange(H)[:, None].astype(np.float32)
    layers = [(600, 120, '#d9e5f2', '#e8eff7'), (720, 90, '#e6eef7', '#f3f7fb'), (860, 70, '#f1f5fa', '#fbfcfe'), (1000, 50, '#f8fafd', '#ffffff')]
    r = RNG(seed + 4)
    for i, (b, a, top, bot) in enumerate(layers):
        yl = ridge(seed + i, b, a, freq=.9 + i * .35, rough=.5)
        if i in (1, 2):   # a row of soft snowy firs on this hill
            m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
            for _ in range(26 if i == 1 else 16):
                x = r.random() * W; y0 = yl[int(x)] + 6; h = (46 if i == 1 else 70) * (0.7 + r.random() * .6)
                for k in range(3):
                    w = h * (.42 - k * .1); yk = y0 - k * h * .28
                    d.polygon([(x, yk - h * .55), (x + w, yk), (x - w, yk)], fill=255)
            mm = np.asarray(m.filter(ImageFilter.GaussianBlur(1.2)), np.float32) / 255
            img = emboss_layer(img, mm, '#9fb9cf' if i == 1 else '#8fb0c8', rad=3, k=5, shadow=.06, wrap=False, col2='#e9f1f8', light=(-0.4, -0.8, 0.5))
        img = paint_layer(img, yl, top, bot, soft=1.5)
        crest = np.clip(1 - np.abs(yy - yl[None, :] - 4) / 5, 0, 1)
        img = lerp(img, np.ones(3, np.float32), crest * .55)
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    for _ in range(240):
        x, y, s = r.random() * W, r.random() * H, 2 + r.random() ** 3 * 6
        d.ellipse([x - s, y - s, x + s, y + s], fill=255)
    m = np.asarray(m.filter(ImageFilter.GaussianBlur(1.3)), np.float32) / 255
    img = lerp(img, np.ones(3, np.float32), m * .85)
    return grain(img, .005, seed)

def meadow_cover(seed=113):
    img = vgrad([(0, '#d8eefa'), (.5, '#f0f8f3'), (1, '#f7f4e6')])
    img = soft_clouds(img, [(380, 230, 110), (1550, 200, 120)], '#ffffff', '#e2eef4', seed)
    for i, (b, a, top, bot) in enumerate([(760, 50, '#cfe6bf', '#d9ecc8'), (860, 45, '#bfdea8', '#cde6b6'), (980, 40, '#b2d698', '#c4e0ab')]):
        img = paint_layer(img, ridge(seed + i, b, a, freq=.8 + i * .3), top, bot, soft=1.5)
    # flowers on the near hills
    r = RNG(seed + 1)
    for col in ('#fbd3dd', '#fff1b0', '#ffffff', '#d9cdf6'):
        m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
        for _ in range(120):
            x = r.random() * W; y = 880 + r.random() ** .7 * 320; s = 4 + (y - 860) / 50 * r.random()
            for k in range(5):
                a = k * 2 * math.pi / 5; d.ellipse([x + math.cos(a) * s - s * .55, y + math.sin(a) * s - s * .55, x + math.cos(a) * s + s * .55, y + math.sin(a) * s + s * .55], fill=255)
        mm = np.asarray(m.filter(ImageFilter.GaussianBlur(.8)), np.float32) / 255
        img = emboss_layer(img, mm, col, rad=1.5, k=4, shadow=.08, wrap=False, sh_off=(2, 3))
    return grain(img, .006, seed)

def dunes_cover(seed=127):
    img = vgrad([(0, '#fbe2c4'), (.45, '#fdf0dc'), (1, '#f6dcb3')])
    for i, (b, a, top, bot) in enumerate([(700, 70, '#f3d4a8', '#f6ddb6'), (820, 90, '#eec795', '#f3d4a8'), (960, 80, '#e9bb85', '#efcb98'), (1100, 60, '#e4b277', '#ebc08a')]):
        yl = ridge(seed + i, b, a, freq=.6 + i * .25, rough=-.2)
        img = paint_layer(img, yl, top, bot, soft=1.2)
        # a bright crest just under the ridge
        yy = np.arange(H)[:, None].astype(np.float32); m = np.clip(1 - np.abs(yy - yl[None, :] - 6) / 6, 0, 1)
        img = lerp(img, img * 1.05, m * .6)
    return grain(img, .007, seed)

def mountain_lake_cover(seed=131):
    img = vgrad([(0, '#cfe4f4'), (.5, '#eef5f7'), (1, '#e3f0ef')])
    xx_ = np.arange(W).astype(np.float32)
    yl1 = ridge(seed, 560, 140, freq=1.1, rough=.8); yl2 = ridge(seed + 1, 640, 90, freq=1.6, rough=.6)
    img = paint_layer(img, yl1, '#b9cbe0', '#cddae8', soft=1.2)
    # snow caps
    yy = np.arange(H)[:, None].astype(np.float32)
    cap = np.clip((yy - yl1[None, :]) / 1.2 + .5, 0, 1) * np.clip((yl1[None, :] + 26 + np.sin(xx_ / 23)[None, :] * 10 - yy) / 8, 0, 1) * np.clip((600 - yl1[None, :]) / 60, 0, 1)
    img = lerp(img, hexc('#f6f9fc'), cap * .9)
    img = paint_layer(img, yl2, '#a7c0b6', '#bed2c6', soft=1.2)
    img = paint_layer(img, np.full(W, 760.0) + np.sin(np.arange(W) / 90) * 2, '#cfe3ea', '#e4f0f2', soft=1.2)
    # reflection
    refl = img[520:760][::-1]
    img[760:1000] = lerp(img[760:1000], refl, .35)
    img = paint_layer(img, ridge(seed + 3, 1010, 40, freq=1.0), '#c4dcc3', '#d4e6cf', soft=1.2)
    return grain(img, .006, seed)

def starry_cover(seed=137, aurora=False):
    img = vgrad([(0, '#141c3a'), (.55, '#22305a'), (1, '#33467a')]) if not aurora else vgrad([(0, '#0e1a33'), (.6, '#16304c'), (1, '#1d3d55')])
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    if aurora:
        for k, (col, y0, amp, ph) in enumerate([('#5fe0b6', 380, 90, 0), ('#7fb8ff', 300, 70, 2), ('#c79bff', 250, 60, 4)]):
            curve = y0 + np.sin(xx / 260 + ph) * amp + np.sin(xx / 97 + ph * 2) * 22
            dy = yy - curve
            band = np.exp(-np.clip(dy, 0, None) / 160) * np.exp(-np.clip(-dy, 0, None) / 18) * (dy > -40)
            rays = .8 + .2 * np.sin(xx / 11 + np.sin(xx / 53) * 3) ** 2
            band = np.asarray(Image.fromarray(np.clip(band * rays * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)), np.float32) / 255
            img = img + hexc(col) * (band * .38)[..., None]
    r = RNG(seed)
    for (cnt, sz, br) in ((900, .8, .7), (160, 1.6, .9), (36, 2.6, 1.0)):
        m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
        for _ in range(cnt):
            x, y = r.random() * W, r.random() ** 1.3 * H * .85; s = sz * (0.6 + r.random() * .8)
            d.ellipse([x - s, y - s, x + s, y + s], fill=int(255 * br * (0.5 + r.random() * .5)))
        mm = np.asarray(m.filter(ImageFilter.GaussianBlur(sz * .5)), np.float32) / 255
        img = lerp(img, hexc('#fff6dc'), mm)
    # milky haze
    haze = fnoise(512, 2.6, seed + 5, m=512)
    haze = np.asarray(Image.fromarray((haze * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
    band = np.exp(-((yy - (xx * .35 + 80)) ** 2) / (2 * 220 ** 2))
    img = img + (haze * band * .12)[..., None] * hexc('#c8d4ff')
    # dark hill silhouette
    img = paint_layer(img, ridge(seed + 2, 1060, 50, freq=.7), '#121a33', '#0f1629', soft=1.2) if not aurora else paint_layer(img, ridge(seed + 2, 1040, 70, freq=.9, rough=.7), '#0d1828', '#0a1220', soft=1.2)
    return grain(img, .008, seed)

def old_map_cover(seed=139):
    """the voyage map: a parchment world map (atlas/mapdata.js outlines), graticule, compass rose, rhumb lines"""
    import json, re
    img = vgrad([(0, '#f3e4c4'), (1, '#ecd8b2')])
    pn = fnoise(512, 2.4, seed, m=512)
    pn = np.asarray(Image.fromarray((pn * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
    img = img * (0.93 + 0.1 * pn)[..., None]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    vig = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    img = img * (1 - np.clip(vig - .55, 0, 1)[..., None] * .35 * hexc('#5a3a10') / hexc('#5a3a10').max())
    lm = land_mask()   # rows × cols, equirectangular 72.5°N…56°S, 0.2°
    ox, oy, sc = W * .05, H * .12, W * .9 / 360
    def P(lon, lat):
        return (ox + (lon + 180) * sc, oy + (72.5 - lat) * sc)
    lim = Image.fromarray((lm * 255).astype(np.uint8)).resize((int(360 * sc), int(128.5 * sc)), Image.BICUBIC).filter(ImageFilter.GaussianBlur(1.0))
    m = Image.new('L', (W, H), 0); m.paste(lim, (int(ox), int(oy)))
    m = m.point(lambda v: 255 if v > 127 else 0).filter(ImageFilter.GaussianBlur(.8)); ss = 1
    mm = np.asarray(m, np.float32) / 255
    # coast: ink line + soft inner shading, land slightly darker parchment
    edge = np.asarray(Image.fromarray((mm * 255).astype(np.uint8)).filter(ImageFilter.FIND_EDGES), np.float32) / 255
    halo = np.asarray(Image.fromarray((mm * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(14)), np.float32) / 255
    img = lerp(img, hexc('#e3c79a'), mm * .55)
    sea_lines = np.clip(halo - mm, 0, 1) * (np.sin(halo * 40) * .5 + .5 > .8)
    img = lerp(img, hexc('#b89763'), sea_lines * .35)
    img = lerp(img, hexc('#7b5a32'), np.clip(edge * 2.2, 0, 1) * .55)
    # graticule + rhumb lines + compass rose
    g = Image.new('L', (W, H), 0); gd = ImageDraw.Draw(g)
    for lon in range(-180, 181, 30): gd.line([P(lon, -75)[0] / ss, P(lon, -75)[1] / ss, P(lon, 80)[0] / ss, P(lon, 80)[1] / ss], fill=150, width=1)
    for lat in range(-60, 81, 30): gd.line([P(-180, lat)[0] / ss, P(-180, lat)[1] / ss, P(180, lat)[0] / ss, P(180, lat)[1] / ss], fill=150, width=1)
    cx, cy = W * .79, H * .76
    for k in range(32):
        a = k * math.pi / 16; gd.line([cx, cy, cx + math.cos(a) * 1400, cy + math.sin(a) * 1400], fill=70, width=1)
    gm = np.asarray(g.filter(ImageFilter.GaussianBlur(.6)), np.float32) / 255
    img = lerp(img, hexc('#8a6a3c'), gm * .45)
    # compass rose (plush-lit)
    def rose(d, ss):
        R = 120
        for k in range(8):
            a = -math.pi / 2 + k * math.pi / 4; L = R if k % 2 == 0 else R * .6
            pts = [(cx + math.cos(a) * L, cy + math.sin(a) * L), (cx + math.cos(a + .32) * R * .17, cy + math.sin(a + .32) * R * .17), (cx, cy), (cx + math.cos(a - .32) * R * .17, cy + math.sin(a - .32) * R * .17)]
            d.polygon([(x * ss, y * ss) for x, y in pts], fill=255)
    rm = mask_draw(H, 3, rose, m=W)
    img = emboss_layer(img, rm, '#9b6e3a', rad=2, k=5, shadow=.15, wrap=False, col2='#d9b17a', sh_off=(3, 4))
    ring = np.clip(1 - np.abs(np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) - 84) / 2, 0, 1)
    img = lerp(img, hexc('#8a6a3c'), ring * .6)
    return grain(img, .01, seed)

def land_mask():
    """Natural Earth land mask (atlas/historia/map-fine.js: run lengths, base 36, sea/land alternating)"""
    import re
    src = open(os.path.join(os.path.dirname(__file__), '..', 'historia', 'map-fine.js'), encoding='utf-8').read()
    rows = re.search(r"rows:\s*['\"]([^'\"]+)['\"]", src).group(1).split('|')
    nc = int(round(360 / 0.2)); g = np.zeros((len(rows), nc), np.float32)
    for y, row in enumerate(rows):
        x = 0
        for i, v in enumerate(row.split('.')):
            n = int(v, 36) if v else 0
            if i & 1: g[y, x:x + n] = 1
            x += n
    return g

def celestial_cover(seed=149):
    """a celestial atlas: deep navy, gold constellation lines, graticule circles"""
    img = vgrad([(0, '#16224a'), (1, '#1f2f5e')])
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    g = Image.new('L', (W, H), 0); d = ImageDraw.Draw(g)
    cx, cy = W * .5, H * 1.25
    for rr in range(300, 2600, 170): d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=120, width=1)
    for k in range(24):
        a = k * math.pi / 12; d.line([cx, cy, cx + math.cos(a) * 2600, cy + math.sin(a) * 2600], fill=90, width=1)
    gm = np.asarray(g.filter(ImageFilter.GaussianBlur(.6)), np.float32) / 255
    img = lerp(img, hexc('#c9a95e'), gm * .35)
    r = RNG(seed)
    lines = Image.new('L', (W, H), 0); ld = ImageDraw.Draw(lines)
    stars = Image.new('L', (W, H), 0); sd = ImageDraw.Draw(stars)
    for c in range(9):
        x0, y0 = 120 + (c % 3) * 620 + r.random() * 260, 100 + (c // 3) * 360 + r.random() * 140
        pts = [(x0, y0)]
        for k in range(3 + int(r.random() * 4)):
            a = r.random() * math.pi * 2; L = 60 + r.random() * 110
            pts.append((pts[-1][0] + math.cos(a) * L, pts[-1][1] + math.sin(a) * L))
        ld.line(pts, fill=200, width=2)
        for x, y in pts:
            s = 3 + r.random() * 4; sd.ellipse([x - s, y - s, x + s, y + s], fill=255)
    for _ in range(700):
        x, y = r.random() * W, r.random() * H; s = .6 + r.random() ** 3 * 1.8
        sd.ellipse([x - s, y - s, x + s, y + s], fill=int(120 + r.random() * 135))
    lm = np.asarray(lines.filter(ImageFilter.GaussianBlur(.8)), np.float32) / 255
    sm = np.asarray(stars.filter(ImageFilter.GaussianBlur(.9)), np.float32) / 255
    img = lerp(img, hexc('#e6c77a'), lm * .55)
    img = lerp(img, hexc('#fff3cf'), sm)
    glow = np.asarray(stars.filter(ImageFilter.GaussianBlur(8)), np.float32) / 255
    img = img + (glow * .25)[..., None] * hexc('#ffe7a8')
    pn = fnoise(512, 2.6, seed + 3, m=512)
    pn = np.asarray(Image.fromarray((pn * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
    img = img * (0.94 + 0.1 * pn)[..., None]
    return grain(img, .008, seed)

def holo(n=1024, seed=151):
    """pastel iridescent foil (opal): flowing hue bands with a fine sparkle"""
    t = blurw(fnoise(n, 3.4, seed), 6); t = (t - t.min()) / (t.max() - t.min())
    y = np.arange(n)[:, None] / n; x = np.arange(n)[None, :] / n
    ph = (t * 1.6 + x * 1 + y * 1) * 2 * math.pi
    cols = [hexc(c) for c in ('#fde3f1', '#e6e2ff', '#d9f1ff', '#dff8ee', '#fff5d6', '#fde3f1')]
    k = (np.sin(ph) * .5 + .5) * (len(cols) - 1)
    i0 = np.floor(k).astype(int); f = (k - i0)[..., None]
    C = np.stack(cols)
    img = C[np.clip(i0, 0, len(cols) - 1)] * (1 - f) + C[np.clip(i0 + 1, 0, len(cols) - 1)] * f
    sp = (RNG(seed).random((n, n)) > .9975).astype(np.float32)
    img = lerp(img, np.ones(3, np.float32), np.clip(blurw(sp, .9) * 4, 0, 1))
    return grain(img, .005, seed)

# ---------------------------------------------------------------- the list: id → (builder, kind)
SKINS = {
    # R
    's01': (lambda: washi(), 'tile'),
    's02': (lambda: linen(), 'tile'),
    's03': (lambda: kraft(), 'tile'),
    's04': (lambda: felt(), 'tile'),
    's05': (lambda: watercolor(inks=('#a9d4f5', '#bfe6f0')), 'tile'),
    's06': (lambda: graph(), 'tile'),
    's07': (lambda: gingham(), 'tile'),
    's08': (lambda: cork(), 'tile'),
    's09': (lambda: watercolor(inks=('#d2c2f3', '#f3c6dc'), seed=211), 'tile'),
    's10': (lambda: terrazzo(), 'tile'),
    's11': (lambda: kaya(), 'tile'),
    's12': (lambda: polka(), 'tile'),
    # SR
    's13': (lambda: sakura(), 'tile'),
    's14': (lambda: momiji(), 'tile'),
    's15': (lambda: yuki(), 'tile'),
    's16': (lambda: seigaiha(), 'tile'),
    's17': (lambda: pieces(), 'tile'),
    's18': (lambda: suits(), 'tile'),
    's19': (lambda: ichimatsu(), 'tile'),
    's20': (lambda: stardust(), 'tile'),
    's21': (lambda: bubbles(), 'tile'),
    's22': (lambda: clover(), 'tile'),
    's23': (lambda: maple_planks(), 'tile'),
    's24': (lambda: table_felt(), 'tile'),
    # SSR
    's25': (lambda: sky_cover(), 'cover'),
    's26': (lambda: sunset_cover(), 'cover'),
    's27': (lambda: sea_cover(), 'cover'),
    's28': (lambda: snow_cover(), 'cover'),
    's29': (lambda: meadow_cover(), 'cover'),
    's30': (lambda: dunes_cover(), 'cover'),
    's31': (lambda: mountain_lake_cover(), 'cover'),
    's32': (lambda: marble(), 'tile'),
    's33': (lambda: starry_cover(), 'cover'),
    's34': (lambda: watercolor(n=1024, paper='#fbf6ee', inks=('#f7c9b0', '#f6e3a6'), seed=223, amt=.6), 'tile'),
    # UR
    's35': (lambda: old_map_cover(), 'cover'),
    's36': (lambda: starry_cover(seed=157, aurora=True), 'cover'),
    's37': (lambda: celestial_cover(), 'cover'),
    's38': (lambda: washi(base='#f7efe0', gold=True, seed=163), 'tile'),
    's39': (lambda: marble(gold=True, seed=167), 'tile'),
    's40': (lambda: holo(), 'tile'),
}

if __name__ == '__main__':
    ids = sys.argv[1:] or list(SKINS)
    for i in ids:
        fn, kind = SKINS[i]
        save(i, fn(), kind, q=72 if kind == 'cover' else 76)

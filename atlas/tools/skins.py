#!/usr/bin/env python3
"""Portal skins (きせかえ → スキン): page backgrounds for the atlas portal.

Writes  images/atlas/skin/<id>.webp     — the background (tile: seamless square, shown at half size = sharp on retina;
                                          cover: 2880×1800 one picture)
        images/atlas/skin/t/<id>.webp   — the きせかえ thumbnail (360×225)
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
    # thumbnail 360×225 (2× for the ~180 css px cell); tiles are shown at half their pixel size (2× for retina screens)
    TW, TH = 360, 225
    if kind == 'tile':
        w = im.width; reps = Image.new('RGB', (w * 2, w * 2))
        for i in range(2):
            for j in range(2): reps.paste(im, (i * w, j * w))
        sc = 1 / 2 * (TW / 560)   # the thumbnail shows ~560 css px of page width
        t = reps.resize((int(w * 2 * sc), int(w * 2 * sc)), Image.LANCZOS).crop((0, 0, TW, TH))
    else:
        r = max(TW / im.width, TH / im.height); t = im.resize((math.ceil(im.width * r), math.ceil(im.height * r)), Image.LANCZOS)
        x = (t.width - TW) // 2; y = (t.height - TH) // 2; t = t.crop((x, y, x + TW, y + TH))
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

# ---------------------------------------------------------------- small extras
def norm(a):
    a = a - a.min(); return a / (a.max() or 1)

def smooth(a, e0, e1):
    t = np.clip((a - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

def strokes(n, count, seed, length=(6, 14), width=1, curl=.5, ss=2):
    """many short fibres (seamless): an L mask 0..1"""
    r = RNG(seed)
    m = Image.new('L', (n * ss, n * ss), 0); d = ImageDraw.Draw(m)
    for _ in range(count):
        x, y = r.random() * n, r.random() * n; a = r.random() * math.pi * 2; L = length[0] + r.random() * (length[1] - length[0])
        pts = [(x, y)]
        for k in range(3):
            a += (r.random() - .5) * curl; x += math.cos(a) * L / 3; y += math.sin(a) * L / 3; pts.append((x, y))
        v = int(120 + r.random() * 135)
        for ox in (-n, 0, n):
            for oy in (-n, 0, n):
                if -L <= pts[0][0] + ox <= n + L and -L <= pts[0][1] + oy <= n + L:
                    d.line([((px + ox) * ss, (py + oy) * ss) for px, py in pts], fill=v, width=max(1, int(width * ss)))
    return np.asarray(m.resize((n, n), Image.LANCZOS), np.float32) / 255

def flat(img, mask, col, a=1.0):
    return lerp(img, hexc(col), np.clip(mask, 0, 1) * a)

def voronoi(n, count, seed):
    """periodic Voronoi: (index of the nearest seed, d1, d2) per pixel"""
    from scipy.spatial import cKDTree
    r = RNG(seed); P = r.random((count, 2)) * n
    T = cKDTree(P, boxsize=n)
    yy, xx = np.mgrid[0:n, 0:n]
    q = np.stack([xx.ravel() + .5, yy.ravel() + .5], -1) % n
    d, i = T.query(q, k=2)
    return i[:, 0].reshape(n, n), d[:, 0].reshape(n, n).astype(np.float32), d[:, 1].reshape(n, n).astype(np.float32)

# ---------------------------------------------------------------- R : paper & fabric tiles (n = 1024, shown at 512 css px)
def washi(n=1024, base='#f8f0dd', fib='#fffaf0', fib2='#e9dcc0', seed=3, gold=False):
    img = solid(n, base) * (0.97 + 0.04 * fnoise(n, 2.4, seed))[..., None]
    r = RNG(seed + 1)
    for col, cnt, wid, al in [(fib2, 560, 2.0, .55), (fib, 900, 1.7, .85)]:
        m = Image.new('L', (n * 2, n * 2), 0); dd = ImageDraw.Draw(m)
        for _ in range(cnt):
            x, y = r.random() * n, r.random() * n; a = r.random() * math.pi * 2; L = 26 + r.random() * 120
            pts = []
            for k in range(12):
                a += (r.random() - .5) * .5; pts.append((x, y)); x += math.cos(a) * L / 12; y += math.sin(a) * L / 12
            for ox in (-n, 0, n):
                for oy in (-n, 0, n):
                    dd.line([((px + ox) * 2, (py + oy) * 2) for px, py in pts], fill=255, width=int(wid * 2))
        mm = np.asarray(m.resize((n, n), Image.LANCZOS), np.float32) / 255
        img = lerp(img, hexc(col), mm * al)
    if gold:
        gm = Image.new('L', (n * 2, n * 2), 0); gd = ImageDraw.Draw(gm)
        for _ in range(300):
            x, y = r.random() * n, r.random() * n; s = 2.5 + r.random() ** 2 * 22
            pts = [(math.cos(a) * s * (0.6 + r.random() * .6), math.sin(a) * s * (0.6 + r.random() * .6)) for a in np.linspace(0, 2 * math.pi, 6, endpoint=False) + r.random()]
            for X, Y in wrapped(n, x, y, s * 2):
                gd.polygon([((X + px) * 2, (Y + py) * 2) for px, py in pts], fill=255)
        gmask = np.asarray(gm.resize((n, n), Image.LANCZOS), np.float32) / 255
        tone = fnoise(n, 1.2, seed + 9)
        img = lerp(img, lerp(hexc('#c99a3a'), hexc('#ffe7a0'), tone), gmask * .92)
    return grain(img, .008, seed)

def streaks(n, seed, axis=0):
    """thread lines: one random value per line, slowly varying along the thread (seamless)"""
    r = RNG(seed)
    along = fnoise(n, 2.0, seed, m=n)
    vals = r.random(n).astype(np.float32)
    line = np.repeat(vals[None, :] if axis else vals[:, None], n, axis=0 if axis else 1)
    return np.clip(line * .7 + along * .6 - .3, 0, 1)

def linen(n=1024, base='#ede6d9', dark='#d3c6ae', seed=5):
    h = streaks(n, seed, 0); v = streaks(n, seed + 1, 1)
    idx = np.arange(n)
    over = (((idx[:, None] // 3) + (idx[None, :] // 3)) % 2).astype(np.float32)
    t = blurw(np.where(over > .5, h, v), .7)
    img = lerp(hexc(base), hexc(dark), np.clip(t * .6, 0, 1))
    img = img * (0.985 + 0.03 * fnoise(n, 2.4, seed + 4))[..., None]
    return grain(img, .005, seed)

def kraft(n=1024, seed=7):
    """kraft paper, mild: a calm tan, faint long fibres, a few soft flecks"""
    img = solid(n, '#dcc7a3') * (0.975 + 0.04 * fnoise(n, 2.6, seed))[..., None]
    f = strokes(n, 2600, seed + 1, length=(14, 40), width=1.1, curl=.3)
    img = lerp(img, hexc('#cdb48c'), f * .35)
    f2 = strokes(n, 1800, seed + 2, length=(12, 34), width=1.0, curl=.3)
    img = lerp(img, hexc('#e9d9bb'), f2 * .45)
    sp = blurw((RNG(seed).random((n, n)) > .99965).astype(np.float32), 1.3)
    img = lerp(img, hexc('#b49a72'), np.clip(sp * 6, 0, 1) * .35)
    return grain(img, .006, seed)

def felt(n=1024, base='#d4ece0', light='#e6f5ee', dark='#bcdccc', seed=11, cnt=52000):
    """wool felt: a dense mat of tiny fibres, very even (no blotches)"""
    img = solid(n, base) * (0.99 + 0.02 * fnoise(n, 2.8, seed))[..., None]
    img = lerp(img, hexc(dark), strokes(n, cnt, seed + 1, length=(5, 12), width=1, curl=1.4) * .55)
    img = lerp(img, hexc(light), strokes(n, cnt, seed + 2, length=(5, 12), width=1, curl=1.4) * .6)
    img = (img + np.stack([blurw(img[..., c], .6) for c in range(3)], -1)) / 2
    return grain(img, .004, seed)

def watercolor(n=1024, paper='#fcfaf5', inks=('#cfe5f7', '#d9eef3'), seed=13, amt=.5, cover=.55):
    """light washes: soft wet edges with a darker rim, granulation, cold-press paper"""
    pt = fnoise(n, 1.3, seed + 99)
    img = solid(n, paper) * (0.99 + 0.02 * pt)[..., None]
    for i, ink in enumerate(inks):
        f = norm(blurw(fnoise(n, 3.6, seed + 10 * i), 6))
        th = np.quantile(f, cover + i * .08)
        wash = smooth(f, th - .02, th + .14)
        rim = blurw(np.exp(-((wash - .2) / .14) ** 2) * (wash > .02), 1.5)
        v = .55 + .45 * norm(blurw(fnoise(n, 2.4, seed + 3 + i), 3))
        gran = .8 + .4 * fnoise(n, .5, seed + 7 + i)
        dens = (wash * v * .62 + rim * .25) * gran * amt
        ic = hexc(ink)
        img = img * (1 - np.clip(dens, 0, 1)[..., None] * (1 - ic))
    return grain(img, .004, seed)

def graph(n=1024, base='#fcf9f0', line='#b4cfec', seed=17):
    img = solid(n, base) * (0.988 + 0.016 * fnoise(n, 2.4, seed))[..., None]
    step = 32; idx = np.arange(n)
    minor = ((idx % step) == 0).astype(np.float32); major = ((idx % (step * 4)) == 0).astype(np.float32)
    m = np.maximum(np.maximum(minor[:, None], minor[None, :]) * .35, np.maximum(major[:, None], major[None, :]) * .7)
    m = np.maximum(m, np.maximum(np.roll(minor, 1)[:, None], np.roll(minor, 1)[None, :]) * .18)
    img = lerp(img, hexc(line), np.clip(blurw(m, .5) * 1.6, 0, 1) * .8)
    return grain(img, .005, seed)

def gingham(n=1024, base='#fff9fa', c='#f7cbd6', seed=19):
    p = 64; idx = np.arange(n)
    band = blurw(np.tile((((idx // (p // 2)) % 2) == 0).astype(np.float32), (n, 1)), 1.4)[0]
    a = band[:, None]; b = band[None, :]
    t = a * .45 + b * .45 + a * b * .25
    weave = ((idx[:, None] + idx[None, :]) % 4 < 1).astype(np.float32) * .06
    img = lerp(hexc(base), hexc(c), np.clip(t + weave * (t > .1), 0, 1) * .62)
    img = img * (1 + blurw(RNG(seed).standard_normal((n, n)).astype(np.float32), .9)[..., None] * .02)
    return grain(img, .004, seed)

def cork(n=1024, seed=23):
    """cork board: packed granules of varied tan, dark crevices between them, small pores"""
    r = RNG(seed)
    idx, d1, d2 = voronoi(n, 22000, seed)
    pal = np.stack([hexc(c) for c in ('#d6b383', '#cfaa77', '#dcbb8c', '#c99f6c', '#d2ad7c', '#c39663', '#dfc296')])
    tone = pal[r.integers(0, len(pal), idx.max() + 1)]
    img = tone[idx] * (0.95 + 0.1 * r.random(idx.max() + 1)[idx])[..., None]
    img = np.stack([blurw(img[..., c], 1.3) for c in range(3)], -1)
    img = img * (0.93 + 0.14 * fnoise(n, .7, seed + 8))[..., None]
    gap = smooth(d2 - d1, 0, 1.6)
    img = img * (0.9 + 0.1 * gap)[..., None]
    img = img * (0.96 + 0.08 * norm(blurw(fnoise(n, 1.6, seed + 4), 2)))[..., None]
    pores = blurw((r.random((n, n)) > .9975).astype(np.float32), .8)
    img = lerp(img, hexc('#7a5530'), np.clip(pores * 4, 0, 1) * .45)
    img = img * (0.975 + 0.05 * norm(blurw(fnoise(n, 3.0, seed + 3), 6)))[..., None]
    img = np.stack([blurw(img[..., c], .7) for c in range(3)], -1)
    return grain(img, .006, seed)

def terrazzo(n=1024, base='#f7f3ec', chips=('#f2c3b6', '#b9dccf', '#f5dea3', '#c6cfeb', '#e6dccb', '#dcc4dd'), seed=29):
    img = solid(n, base) * (0.988 + 0.016 * fnoise(n, 2.2, seed))[..., None]
    r = RNG(seed)
    for ci, col in enumerate(chips):
        m = Image.new('L', (n * 2, n * 2), 0); d = ImageDraw.Draw(m)
        for _ in range(60):
            x, y = r.random() * n, r.random() * n; s = 5 + r.random() ** 1.8 * 30
            k = 5 + int(r.random() * 4)
            pts = [(math.cos(a) * s * (0.55 + r.random() * .55), math.sin(a) * s * (0.55 + r.random() * .55)) for a in np.linspace(0, 2 * math.pi, k, endpoint=False) + r.random() * 6]
            for X, Y in wrapped(n, x, y, s * 1.2):
                d.polygon([((X + px) * 2, (Y + py) * 2) for px, py in pts], fill=255)
        mm = np.asarray(m.resize((n, n), Image.LANCZOS), np.float32) / 255
        img = lerp(img, lerp(hexc(col), hexc(col) * .93, fnoise(n, 1.5, seed + ci)), mm * .9)
    return grain(img, .006, seed)

def kaya(n=1024, seed=31):
    y = np.arange(n)[:, None] / n
    warp = blurw(fnoise(n, 2.4, seed), 4) * .025
    ph = (y + warp) * 40
    g = np.clip(1 - np.abs(np.sin(ph * math.pi)) / .16, 0, 1) * (.5 + .5 * fnoise(n, 1.6, seed + 5))
    fib = blurw(streaks(n, seed + 2, 0) * .5 + streaks(n, seed + 7, 0) * .5, .8)
    t = np.clip(g * .6 + (fib - .3) * .4, 0, 1)
    img = lerp(hexc('#f7e6c2'), hexc('#d9b278'), t)
    img = img * (0.975 + 0.04 * fnoise(n, 2.6, seed + 3))[..., None]
    return grain(img, .005, seed)

# ---------------------------------------------------------------- flat, pale motif tiles (2026-11-20 ユーザー：立体感なし・淡く)
def flat_tile(n, base, seed, layers, paper=.02):
    img = solid(n, base) * (1 - paper / 2 + paper * fnoise(n, 2.4, seed))[..., None]
    for draw, col, a in layers:
        img = flat(img, mask_draw(n, 3, draw), col, a)
    return grain(img, .004, seed)

def scatter_shapes(n, pts_fn, count, seed, size, minsep, rots=True, var=.5):
    r = RNG(seed + 100); P = scatter(n, count, seed, minsep)
    S = [(p[0], p[1], size * (1 - var / 2 + r.random() * var), r.random() * math.pi * 2 if rots else 0) for p in P]
    def draw(d, ss):
        for x, y, s, a in S:
            for X, Y in wrapped(n, x, y, s * 1.3):
                d.polygon([(px * ss, py * ss) for px, py in poly_t(pts_fn(), X, Y, s, a)], fill=255)
    return draw

def dots_draw(n, count, seed, r0, r1, minsep):
    r = RNG(seed + 3); P = scatter(n, count, seed, minsep)
    S = [(p[0], p[1], r0 + r.random() * (r1 - r0)) for p in P]
    def draw(d, ss):
        for x, y, s in S:
            for X, Y in wrapped(n, x, y, s + 2):
                d.ellipse([(X - s) * ss, (Y - s) * ss, (X + s) * ss, (Y + s) * ss], fill=255)
    return draw

def polka(n=1024, base='#fffbe6', dot='#fdeeaa', seed=37):
    p = n // 8
    m = lambda d, s: [d.ellipse([(cx - 15) * s, (cy - 15) * s, (cx + 15) * s, (cy + 15) * s], fill=255)
        for i in range(9) for j in range(9) for cx, cy in [(i * p + (p // 2 if j % 2 else 0), j * p)]]
    return flat_tile(n, base, seed, [(m, dot, 1)])

def sakura(n=1024, seed=41):
    return flat_tile(n, '#fff6f8', seed, [(scatter_shapes(n, petal_pts, 18, seed + 7, 20, 110), '#fbe1e8', 1),
                                         (scatter_shapes(n, petal_pts, 22, seed, 30, 130), '#f8d3de', 1)])

def momiji(n=1024, seed=43):
    return flat_tile(n, '#fdf7ee', seed, [(scatter_shapes(n, maple_pts, 10, seed + 5, 34, 160), '#fbe3bf', 1),
                                         (scatter_shapes(n, maple_pts, 13, seed, 46, 180), '#f6d2bd', 1)])

def snowflake_draw(n, seed, cnt, size, minsep, wk=.13):
    r = RNG(seed + 3); P = scatter(n, cnt, seed, minsep)
    S = [(p[0], p[1], size * (0.75 + r.random() * .5), r.random()) for p in P]
    def draw(d, ss):
        for x, y, s, a in S:
            for X, Y in wrapped(n, x, y, s * 1.2):
                w = max(2, int(s * wk * ss))
                for k in range(6):
                    t = a + k * math.pi / 3; c, si = math.cos(t), math.sin(t)
                    d.line([(X * ss, Y * ss), ((X + c * s) * ss, (Y + si * s) * ss)], fill=255, width=w)
                    for f in (.5, .75):
                        bx, by = X + c * s * f, Y + si * s * f
                        for sg in (-1, 1):
                            t2 = t + sg * .8
                            d.line([(bx * ss, by * ss), ((bx + math.cos(t2) * s * .28) * ss, (by + math.sin(t2) * s * .28) * ss)], fill=255, width=w)
                d.ellipse([(X - s * .14) * ss, (Y - s * .14) * ss, (X + s * .14) * ss, (Y + s * .14) * ss], fill=255)
    return draw

def yuki(n=1024, seed=47):
    return flat_tile(n, '#f1f6fb', seed, [(dots_draw(n, 40, seed + 9, 3, 6, 60), '#ffffff', .9),
                                         (snowflake_draw(n, seed + 1, 12, 22, 130), '#e2ecf6', 1),
                                         (snowflake_draw(n, seed, 11, 36, 170), '#ffffff', 1)])

def seigaiha(n=1024, base='#f3f6f8', c1='#d6e5ed', c2='#e9f0f4', seed=53):
    R = n / 12
    H2 = 2 * n
    yy, xx = np.mgrid[0:H2, 0:n].astype(np.float32)
    dist = np.full((H2, n), 1e9, np.float32)
    for j in range(int(H2 / (R / 2)) + 2):
        cy = j * R / 2; off = R if j % 2 else 0
        for i in range(-1, int(n / (2 * R)) + 2):
            cx = i * 2 * R + off
            dx = (xx - cx + n / 2) % n - n / 2; dy = yy - cy
            dd = np.sqrt(dx * dx + dy * dy)
            dist = np.where(dd < R, dd, dist)
    dist = dist[n // 2: n // 2 + n]
    ring = np.clip(((np.sin(dist / R * math.pi * 4.5) * .5 + .5) - .55) / .25, 0, 1)
    img = lerp(lerp(hexc(base), hexc(c2), .6), hexc(c1), ring * .9)
    edge = np.clip(1 - np.abs(dist - R * .98) / 3, 0, 1)
    img = lerp(img, hexc(c1) * .94, edge * .5)
    img = img * (0.988 + 0.024 * fnoise(n, 2.4, seed))[..., None]
    return grain(img, .005, seed)

def pieces(n=1024, base='#fcf6ea', seed=59, cols=('#f6e3bd', '#f8d9cf', '#d9ebdc', '#d9e2f3')):
    """board-game pieces, flat and pale: pawn, die, go stone, shogi piece, star, heart"""
    r = RNG(seed + 5); P = scatter(n, 24, seed, 175)
    kinds = ['pawn', 'die', 'stone', 'shogi', 'star', 'heart']
    S = [(p[0], p[1], 40 + r.random() * 10, (r.random() - .5) * .8, kinds[i % len(kinds)], i % len(cols)) for i, p in enumerate(P)]
    layers = []
    for ci, col in enumerate(cols):
        def draw(d, ss, ci=ci):
            for x, y, s, a, k, c in S:
                if c != ci: continue
                for X, Y in wrapped(n, x, y, s * 1.4):
                    if k == 'pawn': pawn_draw(d, X * ss, Y * ss, s * ss)
                    elif k == 'die': d.rounded_rectangle([(X - s * .72) * ss, (Y - s * .72) * ss, (X + s * .72) * ss, (Y + s * .72) * ss], radius=s * .25 * ss, fill=255)
                    elif k == 'stone': d.ellipse([(X - s * .8) * ss, (Y - s * .8) * ss, (X + s * .8) * ss, (Y + s * .8) * ss], fill=255)
                    elif k == 'shogi': d.polygon([(px * ss, py * ss) for px, py in poly_t(shogi_pts(), X, Y, s * .95, a * .4)], fill=255)
                    elif k == 'star': d.polygon([(px * ss, py * ss) for px, py in poly_t(star_pts(), X, Y, s, a)], fill=255)
                    else: d.polygon([(px * ss, py * ss) for px, py in poly_t(heart_pts(), X, Y, s * .85, a * .4)], fill=255)
        layers.append((draw, col, 1))
    def pips(d, ss):
        for x, y, s, a, k, c in S:
            if k != 'die': continue
            for X, Y in wrapped(n, x, y, s * 1.4):
                for ox, oy in [(-1, -1), (0, 0), (1, 1)]:
                    d.ellipse([(X + ox * s * .38 - s * .11) * ss, (Y + oy * s * .38 - s * .11) * ss, (X + ox * s * .38 + s * .11) * ss, (Y + oy * s * .38 + s * .11) * ss], fill=255)
    layers.append((pips, base, 1))
    return flat_tile(n, base, seed, layers)

def suits(n=1024, seed=61):
    r = RNG(seed + 1); P = scatter(n, 24, seed, 160)
    S = [(p[0], p[1], 34 + r.random() * 9, (r.random() - .5) * .6, i % 4) for i, p in enumerate(P)]
    def mk(kinds):
        def draw(d, ss):
            for x, y, s, a, k in S:
                if k not in kinds: continue
                for X, Y in wrapped(n, x, y, s * 1.5):
                    if k == 3:   # an upright club: three round leaves (top, left, right), a filled centre and a flared stem
                        s = s * 1.2; R = s * .33
                        for cx, cy in ((0, -.42), (-.4, .1), (.4, .1)):
                            d.ellipse([(X + cx * s - R) * ss, (Y + cy * s - R) * ss, (X + cx * s + R) * ss, (Y + cy * s + R) * ss], fill=255)
                        d.ellipse([(X - s * .2) * ss, (Y - s * .15) * ss, (X + s * .2) * ss, (Y + s * .25) * ss], fill=255)
                        d.polygon([((X - s * .09) * ss, (Y + s * .1) * ss), ((X + s * .09) * ss, (Y + s * .1) * ss), ((X + s * .3) * ss, (Y + s * .92) * ss), ((X - s * .3) * ss, (Y + s * .92) * ss)], fill=255)
                    elif k == 2:
                        d.polygon([(px * ss, py * ss) for px, py in poly_t(spade_pts(), X, Y - s * .1, s * .9, 0)], fill=255)
                        d.polygon([((X - s * .12) * ss, (Y + s * .3) * ss), ((X + s * .12) * ss, (Y + s * .3) * ss), ((X + s * .3) * ss, (Y + s * .95) * ss), ((X - s * .3) * ss, (Y + s * .95) * ss)], fill=255)
                    else:
                        d.polygon([(px * ss, py * ss) for px, py in poly_t((heart_pts, diamond_pts)[k](), X, Y, s * .9, a * .5)], fill=255)
        return draw
    return flat_tile(n, '#f2f9f4', seed, [(mk((0, 1)), '#f9d9d9', 1), (mk((2, 3)), '#d2e8dc', 1)])

def ichimatsu(n=1024, a='#f6efe2', b='#e9dfcc', seed=67):
    p = n // 8; idx = np.arange(n)
    c = blurw((((idx[:, None] // p) + (idx[None, :] // p)) % 2).astype(np.float32), 1)
    img = lerp(hexc(a), hexc(b), c)
    tex = blurw(streaks(n, seed, 0) * .5 + streaks(n, seed + 1, 1) * .5, .7)
    img = img * (0.98 + 0.04 * tex)[..., None]
    return grain(img, .004, seed)

def stardust(n=1024, base='#f4f0fc', seed=71):
    return flat_tile(n, base, seed, [(dots_draw(n, 50, seed + 4, 2.2, 4, 60), '#fff4cc', 1),
                                    (scatter_shapes(n, star_pts, 22, seed + 3, 13, 100), '#fbeec0', 1),
                                    (scatter_shapes(n, star_pts, 15, seed, 26, 170, var=.3), '#fde9a8', 1)])

def bubbles(n=1024, base='#edf7fd', seed=73):
    r = RNG(seed); P = scatter(n, 22, seed, 140)
    S = [(p[0], p[1], 18 + r.random() ** 1.5 * 44) for p in P]
    def ring(d, ss):
        for x, y, R in S:
            for X, Y in wrapped(n, x, y, R + 6):
                d.ellipse([(X - R) * ss, (Y - R) * ss, (X + R) * ss, (Y + R) * ss], outline=255, width=int(max(2.5, R * .09) * ss))
    def fill(d, ss):
        for x, y, R in S:
            for X, Y in wrapped(n, x, y, R + 6):
                d.ellipse([(X - R) * ss, (Y - R) * ss, (X + R) * ss, (Y + R) * ss], fill=255)
    def hl(d, ss):
        for x, y, R in S:
            for X, Y in wrapped(n, x, y, R + 6):
                d.arc([(X - R * .68) * ss, (Y - R * .68) * ss, (X + R * .68) * ss, (Y + R * .68) * ss], 200, 250, fill=255, width=int(max(2, R * .1) * ss))
    return flat_tile(n, base, seed, [(fill, '#f6fbff', .7), (ring, '#cfe4f5', 1), (hl, '#ffffff', 1)])

def clover(n=1024, seed=79):
    r = RNG(seed + 2); P = scatter(n, 20, seed, 160)
    S = [(p[0], p[1], 28 + r.random() * 10, r.random() * 6) for p in P]
    def draw(d, ss):
        for x, y, s, a in S:
            for X, Y in wrapped(n, x, y, s * 1.6):
                clover_draw(d, X * ss, Y * ss, s * ss, a)
                t = a + math.pi / 3; d.line([(X * ss, Y * ss), ((X + math.cos(t) * s * 1.15) * ss, (Y + math.sin(t) * s * 1.15) * ss)], fill=255, width=int(s * .14 * ss))
    return flat_tile(n, '#f5f9ea', seed, [(dots_draw(n, 26, seed + 5, 3, 5, 80), '#e6efcf', 1), (draw, '#d9eabf', 1)])

def maple_planks(n=1024, seed=83):
    img = np.zeros((n, n, 3), np.float32)
    pw = n // 4; r = RNG(seed)
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    fib = blurw(streaks(n, seed + 3, 1) * .5 + streaks(n, seed + 4, 1) * .5, .8)
    for i in range(4):
        base = lerp(hexc('#f4e1bf'), hexc('#ebcfa0'), r.random())
        warp = blurw(fnoise(n, 2.6, seed + i), 5) * 24
        lx = xx - i * pw + warp
        ring = np.clip(1 - np.abs(np.sin(lx / (12 + r.random() * 6) * math.pi)) / .2, 0, 1) * .5
        col = lerp(base, base * .88, np.clip(ring + (fib - .4) * .4, 0, 1))
        sl = (xx >= i * pw) & (xx < (i + 1) * pw)
        img[sl] = col[sl]
    gap = np.zeros((n, n), np.float32)
    for i in range(4): gap[:, i * pw] = 1; gap[:, (i * pw + 1) % n] = .5
    for i in range(4): e = int(r.random() * n); gap[e, i * pw:(i + 1) * pw] = 1
    img = lerp(img, img * .75, np.clip(blurw(gap, .8) * 2, 0, 1))
    return grain(img, .005, seed)

def table_felt(n=1024, seed=89):
    """card-table baize: a fine, even nap of short fibres, a soft large-scale sheen"""
    img = felt(n, base='#2f6c50', light='#3f8263', dark='#255a42', seed=seed, cnt=60000)
    img = img * (0.96 + 0.08 * norm(blurw(fnoise(n, 3.2, seed + 6), 8)))[..., None]
    return img

def marble(n=1024, base='#f7f6f3', vein='#b9b6b2', gold=False, seed=97):
    x = np.arange(n)[None, :] / n; y = np.arange(n)[:, None] / n
    t1 = norm(blurw(fnoise(n, 3.8, seed), 13)); t2 = norm(blurw(fnoise(n, 3.0, seed + 1), 4))
    turb = t1 + t2 * .08
    v = np.abs(np.sin((x * 1 + y * 1 + turb * .9) * math.pi * 2))
    v2 = np.abs(np.sin((x * 2 - y * 1 + turb * 1.2 + .3) * math.pi * 2))
    veins = np.clip(1 - v / .03, 0, 1) ** 1.3 * .9 + np.clip(1 - v2 / .017, 0, 1) ** 1.3 * .4
    veins = blurw(veins, 1.0) + blurw(np.clip(1 - v / .2, 0, 1) ** 2, 8) * .25
    img = lerp(hexc(base), hexc('#e9e6e1'), fnoise(n, 3.0, seed + 5) * .6)
    vc = hexc('#c9a24a') if gold else hexc(vein)
    img = lerp(img, vc, np.clip(veins * (.55 + .45 * fnoise(n, 2.0, seed + 7)), 0, 1) * (1 if gold else .7))
    if gold: img = img + (np.clip(veins, 0, 1) * fnoise(n, 1.0, seed + 9))[..., None] * hexc('#fff0b8') * .25
    return grain(img, .004, seed)

# ---------------------------------------------------------------- covers: 2880×1800 (designed on a 1920×1200 grid; k() scales)
K = 1.5
W, H = int(1920 * K), int(1200 * K)
def k(v): return v * K

def vgrad(stops, h=None, w=None):
    h = h or H; w = w or W
    ys = np.linspace(0, 1, h)
    cols = np.array([hexc(c) for _, c in stops]); pos = np.array([p for p, _ in stops])
    out = np.stack([np.interp(ys, pos, cols[:, i]) for i in range(3)], -1).astype(np.float32)
    return np.broadcast_to(out[:, None, :], (h, w, 3)).copy()

def ridge(seed, base, amp, freq=3, rough=.25):
    """a 1D skyline (y in px for each x); base / amp on the 1920×1200 grid"""
    r = RNG(seed); x = np.linspace(0, 1, W)
    y = np.full(W, k(base), np.float32)
    for i in range(1, 7):
        y += np.sin(x * math.pi * 2 * freq * i * (0.7 + r.random() * .6) + r.random() * 6) * k(amp) / i ** (1.2 + rough)
    return y

def paint_layer(img, yline, top, bot, soft=1.6):
    yy = np.arange(H)[:, None].astype(np.float32)
    m = np.clip((yy - yline[None, :]) / k(soft) + .5, 0, 1)
    t = np.clip((yy - yline[None, :]) / k(260), 0, 1)
    col = lerp(np.broadcast_to(hexc(top), (H, W, 3)), np.broadcast_to(hexc(bot), (H, W, 3)), t)
    return lerp(img, col, m)

def cloud_mask(cx, cy, s, seed):
    r = RNG(seed)
    lobes = [(-.62, .02, .38), (-.22, -.18, .5), (.28, -.12, .46), (.66, 0, .34), (.02, .02, .42)]
    def draw(d, ss):
        for lx, ly, lr in lobes:
            rr = lr * s * (0.9 + r.random() * .2); X, Y = cx + lx * s, cy + ly * s
            d.ellipse([(X - rr) * ss, (Y - rr) * ss, (X + rr) * ss, (Y + rr) * ss], fill=255)
        d.rounded_rectangle([(cx - .9 * s) * ss, (cy - .05 * s) * ss, (cx + .9 * s) * ss, (cy + .3 * s) * ss], radius=.18 * s * ss, fill=255)
    return draw

def soft_clouds(img, clouds, col, under, seed=1, rad=10, hi=.25):
    """flat two-tone clouds (2026-11-20 ユーザー：基本全部フラット): the shape in the shade colour, the same shape
    nudged up on top in the light colour, so a flat shadow shows along the bottom"""
    def mask(dy):
        m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
        for i, (x, y, s) in enumerate(clouds): cloud_mask(k(x), k(y + dy * s), k(s), seed + i)(d, 1)
        return np.asarray(m.filter(ImageFilter.GaussianBlur(k(.8))), np.float32) / 255
    img = flat(img, mask(0), under)
    return flat(img, mask(-.12), col)

def big_noise(seed, beta=2.6):
    pn = fnoise(512, beta, seed, m=512)
    return np.asarray(Image.fromarray((pn * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255

def sky_cover(seed=101):
    img = vgrad([(0, '#bfe3fb'), (.55, '#e3f3fd'), (1, '#fdf7ea')])
    img = soft_clouds(img, [(260, 260, 150), (1500, 190, 120), (1020, 420, 90), (1760, 560, 140), (180, 760, 170), (820, 900, 200), (1500, 980, 220), (520, 1120, 180)], '#ffffff', '#dcebf6', seed)
    return grain(img, .005, seed)

def sunset_cover(seed=103):
    img = vgrad([(0, '#f9c9a4'), (.35, '#fbd9b0'), (.62, '#fde9c8'), (1, '#fff3dc')])
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    dd = np.sqrt((xx - k(1350)) ** 2 + (yy - k(600)) ** 2)
    img = lerp(img, hexc('#fff3c4'), np.exp(-dd ** 2 / (2 * k(420) ** 2)) * .5)
    img = lerp(img, hexc('#ffe7a6'), np.clip((1 - dd / k(110)) * 4, 0, 1))
    for i, (b, a, top, bot) in enumerate([(700, 60, '#f3c2b2', '#f6d1bf'), (800, 70, '#e8aaa6', '#efc0b4'), (900, 60, '#d99aa5', '#e6b2b2'), (1020, 50, '#c88fa5', '#d8a4ae')]):
        img = paint_layer(img, ridge(seed + i, b, a, freq=1.2 + i * .3), top, bot, soft=1.2)
    return grain(img, .006, seed)

def sea_cover(seed=107):
    img = vgrad([(0, '#cdeafc'), (.45, '#eaf6fd'), (.52, '#bfe3f2'), (.7, '#9fd3ea'), (1, '#f4e6c8')])
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    wv = np.sin(xx / k(70) + np.sin(yy / k(30)) * 2 + yy / K * .06) * .5 + .5
    img = lerp(img, img * 1.06, (wv > .93) * ((yy > k(620)) & (yy < k(900))) * .6)
    xs = np.arange(W) / K
    shore = k(900) + k(np.sin(xs / 160) * 18 + np.sin(xs / 47) * 6)
    img = paint_layer(img, shore - k(14), '#ffffff', '#e9f6f8', soft=6)
    img = paint_layer(img, shore, '#f6e7c8', '#f1dcb4', soft=2)
    img = soft_clouds(img, [(300, 300, 120), (1500, 230, 110), (980, 420, 70)], '#ffffff', '#dfeef8', seed)
    return grain(img, .005, seed)

def snow_cover(seed=109):
    img = vgrad([(0, '#cfe0f2'), (.55, '#e8f0f8'), (1, '#fbfdff')])
    yy = np.arange(H)[:, None].astype(np.float32)
    r = RNG(seed + 4)
    for i, (b, a, top, bot) in enumerate([(600, 120, '#d9e5f2', '#e8eff7'), (720, 90, '#e6eef7', '#f3f7fb'), (860, 70, '#f1f5fa', '#fbfcfe'), (1000, 50, '#f8fafd', '#ffffff')]):
        yl = ridge(seed + i, b, a, freq=.9 + i * .35, rough=.5)
        if i in (1, 2):
            m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
            for _ in range(26 if i == 1 else 16):
                x = r.random() * W; y0 = yl[int(x)] + k(6); h = k(46 if i == 1 else 70) * (0.7 + r.random() * .6)
                for j in range(3):
                    w = h * (.42 - j * .1); yk = y0 - j * h * .28
                    d.polygon([(x, yk - h * .55), (x + w, yk), (x - w, yk)], fill=255)
            mm = np.asarray(m.filter(ImageFilter.GaussianBlur(k(.8))), np.float32) / 255
            img = flat(img, mm, '#b3c9dc' if i == 1 else '#a4bfd4')
        img = paint_layer(img, yl, top, bot, soft=1.5)
        img = lerp(img, np.ones(3, np.float32), np.clip(1 - np.abs(yy - yl[None, :] - k(4)) / k(5), 0, 1) * .55)
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    for _ in range(240):
        x, y, s = r.random() * W, r.random() * H, k(2 + r.random() ** 3 * 6)
        d.ellipse([x - s, y - s, x + s, y + s], fill=255)
    img = lerp(img, np.ones(3, np.float32), np.asarray(m.filter(ImageFilter.GaussianBlur(k(1.3))), np.float32) / 255 * .85)
    return grain(img, .004, seed)

def meadow_cover(seed=113):
    img = vgrad([(0, '#d8eefa'), (.5, '#f0f8f3'), (1, '#f7f4e6')])
    img = soft_clouds(img, [(380, 230, 110), (1550, 200, 120)], '#ffffff', '#e2eef4', seed)
    for i, (b, a, top, bot) in enumerate([(760, 50, '#cfe6bf', '#d9ecc8'), (860, 45, '#bfdea8', '#cde6b6'), (980, 40, '#b2d698', '#c4e0ab')]):
        img = paint_layer(img, ridge(seed + i, b, a, freq=.8 + i * .3), top, bot, soft=1.5)
    img = flower_friends(img, seed + 1)
    return grain(img, .004, seed)

def flower_friends(img, seed):
    """flat, character-like flowers on the near hills: round petals, a centre with a little face (2026-11-20 ユーザー)"""
    r = RNG(seed)
    PET = ['#fbc6d4', '#ffe08a', '#ffffff', '#d4c8f6', '#ffcfae', '#bfe3f7']
    CEN = {'#fbc6d4': '#ffe48f', '#ffe08a': '#ffb35c', '#ffffff': '#ffd65e', '#d4c8f6': '#fff0a6', '#ffcfae': '#fff0a6', '#bfe3f7': '#fff0a6'}
    pts = []
    tries = 0
    while len(pts) < 70 and tries < 20000:   # spread out, bigger toward the front
        tries += 1
        y = 900 + r.random() ** .8 * 290; x = r.random() * 1920; sz = 7 + (y - 900) / 290 * 17 + r.random() * 4
        if all((x - q[0]) ** 2 + (y - q[1]) ** 2 > ((sz + q[2]) * 1.9) ** 2 for q in pts): pts.append((x, y, sz))
    pts.sort(key=lambda p: p[1])
    ss = 2
    def L(): return Image.new('L', (W * ss, H * ss), 0)
    for x, y, sz in pts:
        pass
    # draw back to front, each flower its own layers so nearer ones overlap farther ones
    for x, y, sz in pts:
        X, Y, S = k(x) * ss, k(y) * ss, k(sz) * ss
        col = PET[int(r.random() * len(PET))]
        stem, leaf, pet, cen, face = L(), L(), L(), L(), L()
        ds, dl, dp, dc, df = ImageDraw.Draw(stem), ImageDraw.Draw(leaf), ImageDraw.Draw(pet), ImageDraw.Draw(cen), ImageDraw.Draw(face)
        hgt = S * (1.6 + r.random() * .8)
        ds.line([(X, Y), (X, Y + hgt)], fill=255, width=max(2, int(S * .16)))
        sd = 1 if r.random() < .5 else -1
        lx, ly = X + sd * S * .55, Y + hgt * .6
        dl.ellipse([lx - S * .5, ly - S * .22, lx + S * .5, ly + S * .22], fill=255)
        n = 5 if r.random() < .7 else 6
        rot = r.random() * math.pi
        for j in range(n):
            a = rot + j * 2 * math.pi / n
            px, py = X + math.cos(a) * S * .62, Y + math.sin(a) * S * .62
            dp.ellipse([px - S * .48, py - S * .48, px + S * .48, py + S * .48], fill=255)
        dc.ellipse([X - S * .5, Y - S * .5, X + S * .5, Y + S * .5], fill=255)
        if sz > 11:   # a face: two dot eyes, a small smile, rosy cheeks
            e = S * .085
            for ex in (-.2, .2):
                df.ellipse([X + ex * S - e, Y - S * .1 - e * 1.2, X + ex * S + e, Y - S * .1 + e * 1.2], fill=255)
            df.arc([X - S * .14, Y - S * .08, X + S * .14, Y + S * .18], 20, 160, fill=255, width=max(2, int(S * .06)))
        for m_, c_, al in ((stem, '#8cc47a', 1), (leaf, '#9fd18b', 1), (pet, col, 1), (cen, CEN[col], 1), (face, '#5a4038', .9)):
            mm = np.asarray(m_.resize((W, H), Image.LANCZOS), np.float32) / 255
            box = mm > 0
            if box.any(): img = lerp(img, hexc(c_), mm * al)
        if sz > 11:   # cheeks
            ck = L(); dk = ImageDraw.Draw(ck)
            for ex in (-.3, .3):
                dk.ellipse([X + ex * S - S * .09, Y + S * .02 - S * .06, X + ex * S + S * .09, Y + S * .02 + S * .06], fill=255)
            img = lerp(img, hexc('#ff9fb0'), np.asarray(ck.resize((W, H), Image.LANCZOS), np.float32) / 255 * .6)
    return img

def dunes_cover(seed=127):
    img = vgrad([(0, '#fbe2c4'), (.45, '#fdf0dc'), (1, '#f6dcb3')])
    yy = np.arange(H)[:, None].astype(np.float32)
    for i, (b, a, top, bot) in enumerate([(700, 70, '#f3d4a8', '#f6ddb6'), (820, 90, '#eec795', '#f3d4a8'), (960, 80, '#e9bb85', '#efcb98'), (1100, 60, '#e4b277', '#ebc08a')]):
        yl = ridge(seed + i, b, a, freq=.6 + i * .25, rough=-.2)
        img = paint_layer(img, yl, top, bot, soft=1.2)
        img = lerp(img, img * 1.05, np.clip(1 - np.abs(yy - yl[None, :] - k(6)) / k(6), 0, 1) * .6)
    return grain(img, .006, seed)

def mountain_lake_cover(seed=131):
    img = vgrad([(0, '#cfe4f4'), (.5, '#eef5f7'), (1, '#e3f0ef')])
    xs = np.arange(W).astype(np.float32) / K
    yl1 = ridge(seed, 560, 140, freq=1.1, rough=.8); yl2 = ridge(seed + 1, 640, 90, freq=1.6, rough=.6)
    img = paint_layer(img, yl1, '#b9cbe0', '#cddae8', soft=1.2)
    yy = np.arange(H)[:, None].astype(np.float32)
    cap = np.clip((yy - yl1[None, :]) / k(1.2) + .5, 0, 1) * np.clip((yl1[None, :] + k(26 + np.sin(xs / 23) * 10)[None, :] - yy) / k(8), 0, 1) * np.clip((k(600) - yl1[None, :]) / k(60), 0, 1)
    img = lerp(img, hexc('#f6f9fc'), cap * .9)
    img = paint_layer(img, yl2, '#a7c0b6', '#bed2c6', soft=1.2)
    img = paint_layer(img, k(760 + np.sin(xs / 90) * 2), '#cfe3ea', '#e4f0f2', soft=1.2)
    a, b = int(k(520)), int(k(760))
    img[b:b + (b - a)] = lerp(img[b:b + (b - a)], img[a:b][::-1], .35)
    img = paint_layer(img, ridge(seed + 3, 1010, 40, freq=1.0), '#c4dcc3', '#d4e6cf', soft=1.2)
    return grain(img, .005, seed)

def starry_cover(seed=137, aurora=False):
    img = vgrad([(0, '#141c3a'), (.55, '#22305a'), (1, '#33467a')]) if not aurora else vgrad([(0, '#0e1a33'), (.6, '#16304c'), (1, '#1d3d55')])
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    X, Y = xx / K, yy / K
    if aurora:
        for col, y0, amp, ph in [('#5fe0b6', 380, 90, 0), ('#7fb8ff', 300, 70, 2), ('#c79bff', 250, 60, 4)]:
            dy = Y - (y0 + np.sin(X / 260 + ph) * amp + np.sin(X / 97 + ph * 2) * 22)
            band = np.exp(-np.clip(dy, 0, None) / 160) * np.exp(-np.clip(-dy, 0, None) / 18) * (dy > -40)
            rays = .8 + .2 * np.sin(X / 11 + np.sin(X / 53) * 3) ** 2
            band = np.asarray(Image.fromarray(np.clip(band * rays * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(k(6))), np.float32) / 255
            img = img + hexc(col) * (band * .38)[..., None]
    r = RNG(seed)
    for cnt, sz, br in ((900, .8, .7), (160, 1.6, .9), (36, 2.6, 1.0)):
        m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
        for _ in range(cnt):
            x, y = r.random() * W, r.random() ** 1.3 * H * .85; s = k(sz * (0.6 + r.random() * .8))
            d.ellipse([x - s, y - s, x + s, y + s], fill=int(255 * br * (0.5 + r.random() * .5)))
        img = lerp(img, hexc('#fff6dc'), np.asarray(m.filter(ImageFilter.GaussianBlur(k(sz * .5))), np.float32) / 255)
    band = np.exp(-((Y - (X * .35 + 80)) ** 2) / (2 * 220 ** 2))
    img = img + (big_noise(seed + 5) * band * .12)[..., None] * hexc('#c8d4ff')
    img = paint_layer(img, ridge(seed + 2, 1060, 50, freq=.7), '#121a33', '#0f1629', soft=1.2) if not aurora else paint_layer(img, ridge(seed + 2, 1040, 70, freq=.9, rough=.7), '#0d1828', '#0a1220', soft=1.2)
    return grain(img, .007, seed)

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

def old_map_cover(seed=139, rose_=False):
    """the voyager's map: parchment, a Natural Earth world, graticule, rhumb lines, a compass rose"""
    img = vgrad([(0, '#f3e4c4'), (1, '#ecd8b2')])
    img = img * (0.93 + 0.1 * big_noise(seed, 2.4))[..., None]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    vig = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    img = img * (1 - np.clip(vig - .55, 0, 1)[..., None] * .3 * np.array([.9, 1, 1.25], np.float32) * .8)
    lm = land_mask()
    ox, oy, sc = W * .05, H * .12, W * .9 / 360
    P = lambda lon, lat: (ox + (lon + 180) * sc, oy + (72.5 - lat) * sc)
    lim = Image.fromarray((lm * 255).astype(np.uint8)).resize((int(360 * sc), int(128.5 * sc)), Image.BICUBIC).filter(ImageFilter.GaussianBlur(k(1.0)))
    m = Image.new('L', (W, H), 0); m.paste(lim, (int(ox), int(oy)))
    m = m.point(lambda v: 255 if v > 127 else 0).filter(ImageFilter.GaussianBlur(k(.8)))
    mm = np.asarray(m, np.float32) / 255
    edge = np.clip(np.asarray(m.filter(ImageFilter.GaussianBlur(k(.9))), np.float32) / 255, 0, 1)
    edge = np.clip(1 - np.abs(edge - .5) / .3, 0, 1)
    halo = np.asarray(m.filter(ImageFilter.GaussianBlur(k(14))), np.float32) / 255
    img = lerp(img, hexc('#e3c79a'), mm * .55)
    img = lerp(img, hexc('#b89763'), np.clip(halo - mm, 0, 1) * (np.sin(halo * 40) * .5 + .5 > .8) * .35)
    img = lerp(img, hexc('#7b5a32'), edge * .55)
    g = Image.new('L', (W, H), 0); gd = ImageDraw.Draw(g); lw = max(1, int(k(1)))
    for lon in range(-180, 181, 30): gd.line([*P(lon, -55), *P(lon, 72)], fill=150, width=lw)
    for lat in range(-30, 61, 30): gd.line([*P(-180, lat), *P(180, lat)], fill=150, width=lw)
    cx, cy = W * .79, H * .76
    for j in range(32):
        a = j * math.pi / 16; gd.line([cx, cy, cx + math.cos(a) * k(1400), cy + math.sin(a) * k(1400)], fill=70, width=lw)
    img = lerp(img, hexc('#8a6a3c'), np.asarray(g.filter(ImageFilter.GaussianBlur(k(.6))), np.float32) / 255 * .45)
    if rose_:   # (2026-11-20: the compass rose is drawn by the page — atlas/skins.js FX — so it can turn)
        def rose(half):   # flat compass rose: each point split into a light and a dark half
            def draw(d, ss):
                R = k(120)
                for j in range(8):
                    a = -math.pi / 2 + j * math.pi / 4; L = R if j % 2 == 0 else R * .6
                    tip = (cx + math.cos(a) * L, cy + math.sin(a) * L)
                    side = (cx + math.cos(a + half * .32) * R * .17, cy + math.sin(a + half * .32) * R * .17)
                    d.polygon([(x * ss, y * ss) for x, y in (tip, side, (cx, cy))], fill=255)
            return draw
        img = flat(img, mask_draw(H, 2, rose(1), m=W), '#d9b17a')
        img = flat(img, mask_draw(H, 2, rose(-1), m=W), '#9b6e3a')
    img = lerp(img, hexc('#8a6a3c'), np.clip(1 - np.abs(np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) - k(84)) / k(2), 0, 1) * .6)
    return grain(img, .008, seed)

def celestial_cover(seed=149):
    img = vgrad([(0, '#16224a'), (1, '#1f2f5e')])
    g = Image.new('L', (W, H), 0); d = ImageDraw.Draw(g); lw = max(1, int(k(1)))
    cx, cy = W * .5, H * 1.25
    for rr in range(300, 2600, 170): d.ellipse([cx - k(rr), cy - k(rr), cx + k(rr), cy + k(rr)], outline=120, width=lw)
    for j in range(24):
        a = j * math.pi / 12; d.line([cx, cy, cx + math.cos(a) * k(2600), cy + math.sin(a) * k(2600)], fill=90, width=lw)
    img = lerp(img, hexc('#c9a95e'), np.asarray(g.filter(ImageFilter.GaussianBlur(k(.6))), np.float32) / 255 * .35)
    r = RNG(seed)
    lines = Image.new('L', (W, H), 0); ld = ImageDraw.Draw(lines)
    stars = Image.new('L', (W, H), 0); sd = ImageDraw.Draw(stars)
    for c in range(9):
        x0, y0 = 120 + (c % 3) * 620 + r.random() * 260, 100 + (c // 3) * 360 + r.random() * 140
        pts = [(x0, y0)]
        for j in range(3 + int(r.random() * 4)):
            a = r.random() * math.pi * 2; L = 60 + r.random() * 110
            pts.append((pts[-1][0] + math.cos(a) * L, pts[-1][1] + math.sin(a) * L))
        ld.line([(k(x), k(y)) for x, y in pts], fill=200, width=int(k(2)))
        for x, y in pts:
            s = k(3 + r.random() * 4); sd.ellipse([k(x) - s, k(y) - s, k(x) + s, k(y) + s], fill=255)
    for _ in range(700):
        x, y = r.random() * W, r.random() * H; s = k(.6 + r.random() ** 3 * 1.8)
        sd.ellipse([x - s, y - s, x + s, y + s], fill=int(120 + r.random() * 135))
    img = lerp(img, hexc('#e6c77a'), np.asarray(lines.filter(ImageFilter.GaussianBlur(k(.8))), np.float32) / 255 * .55)
    img = lerp(img, hexc('#fff3cf'), np.asarray(stars.filter(ImageFilter.GaussianBlur(k(.9))), np.float32) / 255)
    img = img + (np.asarray(stars.filter(ImageFilter.GaussianBlur(k(8))), np.float32) / 255 * .25)[..., None] * hexc('#ffe7a8')
    img = img * (0.94 + 0.1 * big_noise(seed + 3))[..., None]
    return grain(img, .007, seed)

def opal_cover(seed=151, shift=0):
    """opal: a milky body with soft patches of play-of-colour; two versions (shift) cross-fade on the page"""
    w, h = W // 4, H // 4
    from scipy.spatial import cKDTree
    r = RNG(seed)
    P = r.random((46, 2)) * [w, h]
    yy, xx = np.mgrid[0:h, 0:w]
    q = np.stack([xx.ravel(), yy.ravel()], -1).astype(np.float32)
    warp = np.stack([fnoise(256, 3.2, seed + 5, m=256), fnoise(256, 3.2, seed + 6, m=256)], -1)
    warp = np.asarray(Image.fromarray((warp[..., 0] * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC), np.float32).ravel() / 255, \
           np.asarray(Image.fromarray((warp[..., 1] * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC), np.float32).ravel() / 255
    q2 = q + np.stack([warp[0] - .5, warp[1] - .5], -1) * 120
    _, idx = cKDTree(P).query(q2)
    hues = (r.random(len(P)) + shift) % 1
    spec = np.stack([hexc(c) for c in ('#ffd3e8', '#ffe9b8', '#d4f5d6', '#c8ecff', '#d8d0ff', '#ffd3e8')])
    def huecol(hh):
        f = hh * (len(spec) - 1); i0 = np.floor(f).astype(int); t = (f - i0)[..., None]
        return spec[i0] * (1 - t) + spec[np.minimum(i0 + 1, len(spec) - 1)] * t
    col = huecol(hues[idx]).reshape(h, w, 3)
    inten = r.random(len(P))[idx].reshape(h, w) * .6 + .4
    col = np.stack([np.asarray(Image.fromarray((col[..., c] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(16)), np.float32) / 255 for c in range(3)], -1)
    milk = hexc('#f6f3f7')
    inten = np.asarray(Image.fromarray((inten * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10)), np.float32) / 255
    img = lerp(milk, col, (inten * .9)[..., None])
    img = np.asarray(to_img(img).resize((W, H), Image.BICUBIC), np.float32) / 255
    sp = np.asarray(Image.fromarray(((RNG(seed + 9 + int(shift * 10)).random((H, W)) > .9993) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(k(.9))), np.float32) / 255
    img = lerp(img, np.ones(3, np.float32), np.clip(sp * 5, 0, 1) * .8)
    return grain(img, .004, seed)

# ---------------------------------------------------------------- the list: id → (builder, kind)
SKINS = {
    's01': (washi, 'tile'), 's02': (linen, 'tile'), 's03': (kraft, 'tile'), 's04': (felt, 'tile'),
    's05': (lambda: watercolor(inks=('#c6e1f6', '#d3eef2')), 'tile'),
    's06': (graph, 'tile'), 's07': (gingham, 'tile'), 's08': (cork, 'tile'),
    's09': (lambda: watercolor(inks=('#e2d6f6', '#f6dbe7'), seed=211), 'tile'),
    's10': (terrazzo, 'tile'), 's11': (kaya, 'tile'), 's12': (polka, 'tile'),
    's13': (sakura, 'tile'), 's14': (momiji, 'tile'), 's15': (yuki, 'tile'), 's16': (seigaiha, 'tile'),
    's17': (pieces, 'tile'), 's18': (suits, 'tile'), 's19': (ichimatsu, 'tile'), 's20': (stardust, 'tile'),
    's21': (bubbles, 'tile'), 's22': (clover, 'tile'), 's23': (maple_planks, 'tile'), 's24': (table_felt, 'tile'),
    's25': (sky_cover, 'cover'), 's26': (sunset_cover, 'cover'), 's27': (sea_cover, 'cover'), 's28': (snow_cover, 'cover'),
    's29': (meadow_cover, 'cover'), 's30': (dunes_cover, 'cover'), 's31': (mountain_lake_cover, 'cover'),
    's32': (marble, 'tile'), 's33': (starry_cover, 'cover'),
    's34': (lambda: watercolor(paper='#fcf8f1', inks=('#f8dcc8', '#f8ebc2'), seed=223, amt=.55), 'tile'),
    's35': (old_map_cover, 'cover'), 's36': (lambda: starry_cover(seed=157, aurora=True), 'cover'),
    's37': (celestial_cover, 'cover'), 's38': (lambda: washi(base='#f7efe0', gold=True, seed=163), 'tile'),
    's39': (lambda: marble(gold=True, seed=167), 'tile'),
    # s40 (opal) retired 2026-11-20 → atlas/tools/skins_ur3.py (天灯まつり)
}

# ================================================================ s41 … s99 (2026-11-20：計100種に)
# R = materials / plain patterns · SR = flat pale motifs · SSR = flat one-picture landscapes · UR = special
# ---------------------------------------------------------------- R
def stripes(n=1024, base='#f4f9fd', c='#dcebf7', w=32, seed=301):
    idx = np.arange(n)
    band = blurw(np.tile((((idx // w) % 2) == 0).astype(np.float32), (n, 1)), 1.2)[0]
    img = lerp(hexc(base), hexc(c), np.repeat(band[None, :], n, 0))
    img = img * (0.99 + 0.02 * blurw(streaks(n, seed, 1), .8))[..., None]
    return grain(img, .004, seed)

def dotgrid(n=1024, base='#fcfaf4', dot='#c9d6e6', seed=303):
    m = lambda d, s: [d.ellipse([(x - 2.6) * s, (y - 2.6) * s, (x + 2.6) * s, (y + 2.6) * s], fill=255) for x in range(0, n + 1, 32) for y in range(0, n + 1, 32)]
    return flat_tile(n, base, seed, [(m, dot, 1)], paper=.016)

def ruled(n=1024, base='#fdfbf5', line='#bcd3ea', seed=305):
    img = solid(n, base) * (0.99 + 0.016 * fnoise(n, 2.4, seed))[..., None]
    idx = np.arange(n); m = ((idx % 48) == 0).astype(np.float32)
    m = blurw(np.repeat(m[:, None], n, 1), .6) * 2.2
    img = lerp(img, hexc(line), np.clip(m, 0, 1) * .8)
    return grain(img, .004, seed)

def hinoki(n=1024, seed=307):
    y = np.arange(n)[:, None] / n
    warp = blurw(fnoise(n, 2.4, seed), 4) * .03
    g = np.clip(1 - np.abs(np.sin((y + warp) * 32 * math.pi)) / .12, 0, 1) * (.4 + .6 * fnoise(n, 1.6, seed + 5))
    fib = blurw(streaks(n, seed + 2, 0) * .5 + streaks(n, seed + 7, 0) * .5, .8)
    img = lerp(hexc('#fbf1dd'), hexc('#e8cfa2'), np.clip(g * .5 + (fib - .3) * .3, 0, 1))
    return grain(img, .004, seed)

# ---------------------------------------------------------------- SR: flat motifs
def scatter_draw(n, count, seed, size, minsep, fn, var=.4, rot=.5):
    """fn(d, X, Y, s, a, ss) draws one motif; returns a mask draw for flat_tile"""
    r = RNG(seed + 11); P = scatter(n, count, seed, minsep)
    S = [(p[0], p[1], size * (1 - var / 2 + r.random() * var), (r.random() - .5) * rot * 2) for p in P]
    def draw(d, ss):
        _SS[0] = ss
        for x, y, s, a in S:
            for X, Y in wrapped(n, x, y, s * 1.8): fn(d, X, Y, s, a, ss)
    return draw

_SS = [3]
def P_(pts, X, Y, s, a, ss=None):
    ss = ss or _SS[0]; return [(px * ss, py * ss) for px, py in poly_t(pts, X, Y, s, a)]
def E_(d, x, y, r, ss, fill=255): d.ellipse([(x - r) * ss, (y - r) * ss, (x + r) * ss, (y + r) * ss], fill=fill)

def tulip_head(d, X, Y, s, a, ss):
    d.polygon(P_([(-.55, -.2), (-.35, -.75), (-.15, -.35), (0, -.85), (.15, -.35), (.35, -.75), (.55, -.2), (.45, .25), (0, .45), (-.45, .25)], X, Y, s, a), fill=255)
def tulip_green(d, X, Y, s, a, ss):
    d.polygon(P_([(-.06, .3), (.06, .3), (.06, 1.5), (-.06, 1.5)], X, Y, s, a), fill=255)
    d.polygon(P_([(.04, 1.4), (.55, .75), (.5, 1.05), (.1, 1.5)], X, Y, s, a), fill=255)

def paw(d, X, Y, s, a, ss):
    d.ellipse([(X - s * .42) * ss, (Y - s * .05) * ss, (X + s * .42) * ss, (Y + s * .55) * ss], fill=255)
    for tx, ty in ((-.48, -.3), (-.17, -.55), (.17, -.55), (.48, -.3)):
        c, si = math.cos(a), math.sin(a); x, y = X + (tx * c - ty * si) * s, Y + (tx * si + ty * c) * s
        E_(d, x, y, s * .17, ss)

def fish(d, X, Y, s, a, ss):
    d.ellipse([(X - s * .6) * ss, (Y - s * .32) * ss, (X + s * .4) * ss, (Y + s * .32) * ss], fill=255)
    d.polygon(P_([(.3, 0), (.85, -.38), (.75, 0), (.85, .38)], X, Y, s, 0), fill=255)
def fish_eye(d, X, Y, s, a, ss): E_(d, X - s * .32, Y - s * .06, s * .07, ss)

def candy(d, X, Y, s, a, ss):
    E_(d, X, Y, s * .42, ss)
    d.polygon(P_([(.35, 0), (.85, -.35), (.85, .35)], X, Y, s, a), fill=255)
    d.polygon(P_([(-.35, 0), (-.85, -.35), (-.85, .35)], X, Y, s, a), fill=255)
def candy_swirl(d, X, Y, s, a, ss):
    d.arc([(X - s * .26) * ss, (Y - s * .26) * ss, (X + s * .26) * ss, (Y + s * .26) * ss], 0, 270, fill=255, width=int(s * .1 * ss))

def heart(d, X, Y, s, a, ss): d.polygon(P_(heart_pts(), X, Y, s, a), fill=255)

def note(d, X, Y, s, a, ss):
    d.ellipse([(X - s * .32) * ss, (Y + s * .25) * ss, (X + s * .18) * ss, (Y + s * .6) * ss], fill=255)
    d.rectangle([(X + s * .1) * ss, (Y - s * .7) * ss, (X + s * .19) * ss, (Y + s * .45) * ss], fill=255)
    d.polygon([((X + s * .1) * ss, (Y - s * .7) * ss), ((X + s * .55) * ss, (Y - s * .45) * ss), ((X + s * .55) * ss, (Y - s * .22) * ss), ((X + s * .19) * ss, (Y - s * .45) * ss)], fill=255)

def rook(d, X, Y, s, a, ss):
    d.rounded_rectangle([(X - s * .6) * ss, (Y + s * .55) * ss, (X + s * .6) * ss, (Y + s * .85) * ss], radius=s * .1 * ss, fill=255)
    d.polygon([((X - s * .38) * ss, (Y - s * .4) * ss), ((X + s * .38) * ss, (Y - s * .4) * ss), ((X + s * .48) * ss, (Y + s * .6) * ss), ((X - s * .48) * ss, (Y + s * .6) * ss)], fill=255)
    for i in range(3):
        x0 = X - s * .5 + i * s * .38
        d.rectangle([x0 * ss, (Y - s * .75) * ss, (x0 + s * .24) * ss, (Y - s * .38) * ss], fill=255)
def king(d, X, Y, s, a, ss):
    pawn_draw(d, X * ss, (Y + s * .1) * ss, s * ss)
    d.rectangle([(X - s * .07) * ss, (Y - s * 1.2) * ss, (X + s * .07) * ss, (Y - s * .8) * ss], fill=255)
    d.rectangle([(X - s * .2) * ss, (Y - s * 1.08) * ss, (X + s * .2) * ss, (Y - s * .95) * ss], fill=255)
def pawn(d, X, Y, s, a, ss): pawn_draw(d, X * ss, Y * ss, s * ss)

def die(d, X, Y, s, a, ss): d.polygon(P_([(-.7, -.7), (.7, -.7), (.7, .7), (-.7, .7)], X, Y, s, a), fill=255)
def die_pips(d, X, Y, s, a, ss):
    c, si = math.cos(a), math.sin(a)
    for ox, oy in [(-1, -1), (1, -1), (0, 0), (-1, 1), (1, 1)]:
        u, v = ox * .38, oy * .38; E_(d, X + (u * c - v * si) * s, Y + (u * si + v * c) * s, s * .11, ss)

def stone(d, X, Y, s, a, ss): E_(d, X, Y, s * .8, ss)
def drop(d, X, Y, s, a, ss):
    pts = [(math.sin(t) * .5 * (1 - math.cos(t)) ** .9 * .95, -math.cos(t) * .8) for t in np.linspace(0, 2 * math.pi, 48)]
    d.polygon(P_(pts, X, Y, s, a * .3), fill=255)

def cloudlet(d, X, Y, s, a, ss):
    for lx, ly, lr in ((-.45, .05, .32), (-.1, -.15, .42), (.32, -.05, .36), (.62, .1, .25)):
        E_(d, X + lx * s, Y + ly * s, lr * s, ss)
    d.rounded_rectangle([(X - .7 * s) * ss, (Y + .02 * s) * ss, (X + .82 * s) * ss, (Y + .34 * s) * ss], radius=.16 * s * ss, fill=255)

def crescent(d, X, Y, s, a, ss):
    E_(d, X, Y, s * .7, ss); E_(d, X + s * .32, Y - s * .18, s * .6, ss, fill=0)

def cherry(d, X, Y, s, a, ss):
    E_(d, X - s * .32, Y + s * .4, s * .3, ss); E_(d, X + s * .3, Y + s * .5, s * .3, ss)
def cherry_stem(d, X, Y, s, a, ss):
    w = max(2, int(s * .07 * ss))
    d.line([((X - s * .3) * ss, (Y + s * .2) * ss), (X * ss, (Y - s * .6) * ss)], fill=255, width=w)
    d.line([((X + s * .28) * ss, (Y + s * .3) * ss), (X * ss, (Y - s * .6) * ss)], fill=255, width=w)
    d.ellipse([(X) * ss, (Y - s * .78) * ss, (X + s * .42) * ss, (Y - s * .55) * ss], fill=255)

def ginkgo(d, X, Y, s, a, ss):
    pts = [(0, .1)]
    for t in np.linspace(-2.35, -.79, 30):
        r = 1 - .12 * (abs(t + 1.57) < .08)
        pts.append((math.cos(t) * r * .9, math.sin(t) * r * .9 + .1))
    pts += [(.06, .1), (.04, .7), (-.04, .7), (-.06, .1)]
    d.polygon(P_(pts, X, Y, s, a), fill=255)

def apple(d, X, Y, s, a, ss):
    E_(d, X - s * .22, Y + s * .1, s * .45, ss); E_(d, X + s * .22, Y + s * .1, s * .45, ss); E_(d, X, Y + s * .28, s * .4, ss)
def apple_leaf(d, X, Y, s, a, ss):
    d.ellipse([(X + s * .05) * ss, (Y - s * .6) * ss, (X + s * .5) * ss, (Y - s * .38) * ss], fill=255)
    d.rectangle([(X - s * .04) * ss, (Y - s * .55) * ss, (X + s * .04) * ss, (Y - s * .25) * ss], fill=255)

def motif(n, base, seed, specs):
    """specs: [(count, size, minsep, [(fn, colour), …], var, rot, seed+)]: each group shares its points across its layers"""
    layers = []
    for cnt, size, sep, parts, var, rot, sd in specs:
        for fn, col in parts:
            layers.append((scatter_draw(n, cnt, seed + sd, size, sep, fn, var, rot), col, 1))
    return flat_tile(n, base, seed, layers)

def lattice_lines(n, seed, base, col, kind):
    """geometric lattices drawn as lines (asanoha / shippo / honeycomb / uroko), seamless"""
    ss = 3; m = Image.new('L', (n * ss, n * ss), 0); d = ImageDraw.Draw(m); w = int(2.2 * ss)
    L = lambda pts: [d.line([((x + ox) * ss, (y + oy) * ss) for x, y in pts], fill=255, width=w) for ox in (-n, 0, n) for oy in (-n, 0, n)]
    if kind == 'shippo':
        st = n / 8; R = st / math.sqrt(2)
        for i in range(-1, 10):
            for j in range(-1, 10):
                for cx, cy in ((i * st, j * st), (i * st + st / 2, j * st + st / 2)):
                    d.ellipse([(cx - R) * ss, (cy - R) * ss, (cx + R) * ss, (cy + R) * ss], outline=255, width=w)
    elif kind == 'honey':
        R = n / 12; rows = 7; rh = n / rows; ys = rh / (math.sqrt(3) * R)
        for c in range(9):
            for rr in range(rows + 1):
                cx = c * 1.5 * R; cy = rr * rh + (rh / 2 if c % 2 else 0)
                pts = [(cx + R * .94 * math.cos(t), cy + R * .94 * math.sin(t) * ys) for t in np.linspace(0, 2 * math.pi, 7)]
                L(pts)
    elif kind == 'asanoha':
        cols, rows = 7, 8; a = n / cols; h = n / rows
        V = lambda i, j: (i * a + (a / 2 if j % 2 else 0), j * h)
        for j in range(-1, rows + 1):
            for i in range(-1, cols + 1):
                p = V(i, j); q = V(i + 1, j)
                r_ = V(i, j + 1) if j % 2 else V(i, j + 1)
                # the two triangles of this cell
                up = (p, q, V(i + (1 if j % 2 else 0), j + 1)); dn = (V(i + (1 if j % 2 else 0), j + 1), V(i + (0 if j % 2 else -1), j + 1), p)
                for tri in (up, dn):
                    cx = sum(t[0] for t in tri) / 3; cy = sum(t[1] for t in tri) / 3
                    L([tri[0], tri[1], tri[2], tri[0]])
                    for t in tri: L([(cx, cy), t])
    elif kind == 'uroko':
        b = n / 12; h = n / 14
        for j in range(14):
            for i in range(-1, 13):
                x0 = i * b + (b / 2 if j % 2 else 0)
                for ox in (-n, 0, n):
                    d.polygon([((x0 + ox) * ss, (j * h + h) * ss), ((x0 + b + ox) * ss, (j * h + h) * ss), ((x0 + b / 2 + ox) * ss, j * h * ss)], fill=255)
    mm = np.asarray(m.resize((n, n), Image.LANCZOS), np.float32) / 255
    img = solid(n, base) * (0.99 + 0.02 * fnoise(n, 2.4, seed))[..., None]
    return grain(flat(img, mm, col), .004, seed)

def herringbone(n=1024, seed=331):
    w = 32; yy, xx = np.mgrid[0:n, 0:n]
    col = (xx // (2 * w)); off = np.abs((xx % (2 * w)) - w)
    t = ((yy + off * (1 if True else 0)) // w + col) % 2
    r = RNG(seed); tone = r.random((64, 64)).astype(np.float32)
    blk = tone[(yy // w) % 64, col % 64]
    img = lerp(hexc('#f2e2c4'), hexc('#e6cfa6'), (t * .6 + blk * .4))
    edge = (((yy + off) % w) == 0) | ((xx % w) == 0)
    img = lerp(img, img * .86, blurw(edge.astype(np.float32), .6) * 1.2)
    fib = blurw(streaks(n, seed, 1), .7)
    img = img * (0.98 + 0.04 * fib)[..., None]
    return grain(img, .004, seed)

def gems(n=1024, seed=341):
    """UR: flat faceted gems (two tones each) scattered on ivory, with tiny gold sparks"""
    cols = [('#f7c8d6', '#f2a9bf'), ('#c9e4f6', '#a9d2ef'), ('#d4f0dc', '#b4e3c3'), ('#e3d5f7', '#cdb9f1'), ('#fbe7b0', '#f5d27a')]
    r = RNG(seed + 1); P = scatter(n, 22, seed, 170)
    S = [(p[0], p[1], 34 + r.random() * 14, r.random() * .6 - .3, i % len(cols), i % 3) for i, p in enumerate(P)]
    shapes = {0: [(-.7, -.25), (-.35, -.6), (.35, -.6), (.7, -.25), (0, .75)],   # brilliant (side view)
              1: [(0, -.8), (.55, 0), (0, .8), (-.55, 0)],                       # diamond
              2: [(-.6, -.4), (-.3, -.7), (.3, -.7), (.6, -.4), (.6, .4), (.3, .7), (-.3, .7), (-.6, .4)]}   # emerald cut
    layers = []
    for ci, (c1, c2) in enumerate(cols):
        def body(d, ss, ci=ci):
            for x, y, s, a, c, k_ in S:
                if c != ci: continue
                for X, Y in wrapped(n, x, y, s * 1.2): d.polygon(P_(shapes[k_], X, Y, s, a), fill=255)
        def facet(d, ss, ci=ci):
            for x, y, s, a, c, k_ in S:
                if c != ci: continue
                for X, Y in wrapped(n, x, y, s * 1.2):
                    sh = shapes[k_]; half = [(0, 0)] + [p for p in sh if p[0] >= 0]
                    d.polygon(P_(half, X, Y, s, a), fill=255)
        layers += [(body, c1, 1), (facet, c2, 1)]
    layers.append((scatter_shapes(n, star_pts, 30, seed + 9, 6, 70), '#e8c46a', 1))
    return flat_tile(n, '#fbf8f0', seed, layers)

def raden_cover(seed=351, shift=0):
    """UR (dark): black lacquer with flat mother-of-pearl inlay (petals, leaves); two versions cross-fade so the shell shimmers"""
    img = vgrad([(0, '#16141c'), (1, '#1d1a24')])
    img = img * (0.96 + 0.06 * big_noise(seed, 3.0))[..., None]
    r = RNG(seed); m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    for _ in range(20):
        x, y = r.random() * W, r.random() * H; s = k(20 + r.random() * 26); a = r.random() * 6.3
        for j in range(5):
            t = a + j * 2 * math.pi / 5
            d.polygon([(x + px * s, y + py * s) for px, py in poly_t(petal_pts(), math.cos(t) * .9, math.sin(t) * .9, 1, t + math.pi / 2)], fill=255)
    for _ in range(26):
        x, y = r.random() * W, r.random() * H; s = k(8 + r.random() * 12)
        d.polygon([(x + px, y + py) for px, py in poly_t(petal_pts(), 0, 0, s, r.random() * 6.3)], fill=255)
    mm = np.asarray(m.filter(ImageFilter.GaussianBlur(k(.7))), np.float32) / 255
    w4, h4 = W // 8, H // 8
    hue = np.asarray(Image.fromarray((fnoise(256, 3.4, seed + 3 + int(shift * 7), m=256) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
    hue = (hue * 1.6 + shift) % 1
    spec = np.stack([hexc(c) for c in ('#f6d6ef', '#cfe9ff', '#d6fff0', '#fff2c8', '#e2d4ff', '#f6d6ef')])
    f = hue * (len(spec) - 1); i0 = np.floor(f).astype(int); t = (f - i0)[..., None]
    shell = spec[i0] * (1 - t) + spec[np.minimum(i0 + 1, len(spec) - 1)] * t
    img = lerp(img, shell * .92, mm)
    return grain(img, .005, seed)

# ---------------------------------------------------------------- SSR / UR covers (flat)
def shapes_layer(img, draw, col, a=1.0, blur=.7):
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m); draw(d)
    return flat(img, np.asarray(m.filter(ImageFilter.GaussianBlur(k(blur))), np.float32) / 255, col, a)

def flat_clouds(img, clouds, seed, col='#ffffff', under='#dcebf6'):
    return soft_clouds(img, clouds, col, under, seed)

def sakura_trees_cover(seed=401):
    img = vgrad([(0, '#d7ecfa'), (.55, '#f3f8fb'), (1, '#fdf3f5')])
    img = flat_clouds(img, [(330, 200, 100), (1560, 160, 120)], seed)
    for i, (b, a, top, bot) in enumerate([(760, 50, '#d9ebc8', '#e2f0d3'), (880, 40, '#cbe4b6', '#d6eac4'), (1010, 30, '#bfdea8', '#cbe4b6')]):
        img = paint_layer(img, ridge(seed + i, b, a, freq=.8 + i * .3), top, bot, soft=1.2)
    r = RNG(seed + 3)
    trees = sorted([(r.random() * 1920, 780 + r.random() * 360, 50 + r.random() * 60) for _ in range(14)], key=lambda t: t[1])
    for x, y, s in trees:
        sc = .55 + (y - 780) / 360 * .6; s *= sc
        img = shapes_layer(img, lambda d: d.polygon([(k(x - s * .1), k(y)), (k(x + s * .1), k(y)), (k(x + s * .06), k(y - s * 1.1)), (k(x - s * .06), k(y - s * 1.1))], fill=255), '#a7826a')
        def crown(d, c2=0):
            for lx, ly, lr in ((0, -1.55, .6), (-.55, -1.25, .5), (.55, -1.25, .5), (-.3, -1.85, .45), (.35, -1.85, .45), (0, -1.15, .5)):
                d.ellipse([k(x + (lx - lr) * s), k(y + (ly - lr + c2) * s), k(x + (lx + lr) * s), k(y + (ly + lr + c2) * s)], fill=255)
        img = shapes_layer(img, crown, '#f6c7d4'); img = shapes_layer(img, lambda d: crown(d, -.08), '#fbdbe4')
    pet = lambda d: [d.polygon([(k(x) + px * k(s), k(y) + py * k(s)) for px, py in poly_t(petal_pts(), 0, 0, 1, a_)], fill=255)
                     for x, y, s, a_ in [(r.random() * 1920, r.random() * 1200, 6 + r.random() * 6, r.random() * 6.3) for _ in range(70)]]
    img = shapes_layer(img, pet, '#f8cfdc')
    return grain(img, .004, seed)

def autumn_cover(seed=403):
    img = vgrad([(0, '#fbe5cf'), (.55, '#fdf2e4'), (1, '#fbe8d0')])
    for i, (b, a, top, bot) in enumerate([(640, 120, '#f2cfa6', '#f5d9b8'), (760, 90, '#efb98d', '#f3c8a2'), (880, 70, '#e8a27f', '#eeb593'), (1010, 50, '#f2c27a', '#f5cf92')]):
        yl = ridge(seed + i, b, a, freq=.9 + i * .35, rough=.5)
        img = paint_layer(img, yl, top, bot, soft=1.2)
        if i in (1, 2):   # round flat trees standing on this hill's ridge
            r = RNG(seed + 10 + i)
            T = [(r.random() * W, k(46 if i == 1 else 66) * (.7 + r.random() * .6)) for _ in range(18)]
            img = shapes_layer(img, lambda d: [d.rectangle([x - h * .05, yl[int(x)] - h * .45, x + h * .05, yl[int(x)] + k(10)], fill=255) for x, h in T], '#b98466')
            img = shapes_layer(img, lambda d: [d.ellipse([x - h * .36, yl[int(x)] - h * 1.1, x + h * .36, yl[int(x)] - h * .3], fill=255) for x, h in T], '#e48f6e' if i == 1 else '#f0b257')
    return grain(img, .004, seed)

def sunflower_cover(seed=405):
    img = vgrad([(0, '#cfe9fb'), (.55, '#eef7fc'), (1, '#f7f6e2')])
    img = flat_clouds(img, [(300, 220, 110), (1600, 180, 130), (950, 330, 70)], seed)
    img = paint_layer(img, ridge(seed, 820, 30, freq=.7), '#cfe5b4', '#d9ebc2', soft=1.2)
    img = paint_layer(img, ridge(seed + 1, 930, 25, freq=1.0), '#bfdc9f', '#cbe3ae', soft=1.2)
    r = RNG(seed + 2); pts = []
    tries = 0
    while len(pts) < 46 and tries < 30000:
        tries += 1; y = 860 + r.random() ** .8 * 330; x = r.random() * 1920; sz = 10 + (y - 860) / 330 * 26
        if all((x - q[0]) ** 2 + (y - q[1]) ** 2 > ((sz + q[2]) * 1.6) ** 2 for q in pts): pts.append((x, y, sz))
    for x, y, sz in sorted(pts, key=lambda p: p[1]):
        X, Y, S = k(x), k(y), k(sz)
        img = shapes_layer(img, lambda d: (d.line([(X, Y), (X, Y + S * 2.6)], fill=255, width=max(2, int(S * .16))), d.ellipse([X + S * .1, Y + S * 1.2, X + S * .9, Y + S * 1.55], fill=255)), '#86bd6e')
        def petals(d):
            for j in range(12):
                t = j * math.pi / 6
                d.polygon([(X + px * S, Y + py * S) for px, py in poly_t(petal_pts(), math.cos(t) * .78, math.sin(t) * .78, .42, t + math.pi / 2)], fill=255)
        img = shapes_layer(img, petals, '#ffd65c')
        img = shapes_layer(img, lambda d: d.ellipse([X - S * .55, Y - S * .55, X + S * .55, Y + S * .55], fill=255), '#b8834f')
        if sz > 16:
            e = S * .07
            img = shapes_layer(img, lambda d: ([d.ellipse([X + ex * S - e, Y - S * .12 - e * 1.2, X + ex * S + e, Y - S * .12 + e * 1.2], fill=255) for ex in (-.2, .2)],
                                               d.arc([X - S * .14, Y - S * .1, X + S * .14, Y + S * .16], 20, 160, fill=255, width=max(2, int(S * .06)))), '#4a3020', blur=.4)
            img = shapes_layer(img, lambda d: [d.ellipse([X + ex * S - S * .09, Y + S * .02 - S * .06, X + ex * S + S * .09, Y + S * .02 + S * .06], fill=255) for ex in (-.32, .32)], '#ff9f8a', .6)
    return grain(img, .004, seed)

def dawn_sea_cover(seed=407):
    img = vgrad([(0, '#f9d3d6'), (.4, '#fde4d6'), (.52, '#fff2df'), (.53, '#cde4ef'), (.8, '#b9dbeb'), (1, '#d6ebf2')])
    img = shapes_layer(img, lambda d: d.ellipse([k(1260 - 120), k(636 - 120), k(1260 + 120), k(636 + 120)], fill=255), '#ffe7b8')
    img = paint_layer(img, np.full(W, k(636.0)), '#cde4ef', '#b9dbeb', soft=.6)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    rr = RNG(seed + 5)
    def glints(d):
        for j in range(16):
            y = 660 + j * (24 + j * 2.2); w = (150 - j * 6) * (.5 + rr.random() * .6); x = 1260 + (rr.random() - .5) * (60 + j * 10)
            d.rounded_rectangle([k(x - w / 2), k(y), k(x + w / 2), k(y + 5 + j * .3)], radius=k(3), fill=255)
    img = shapes_layer(img, glints, '#fff3d6', .75)
    img = soft_clouds(img, [(330, 230, 110), (760, 380, 70), (1650, 260, 120)], '#fff6f2', '#f7d2d6', seed)
    return grain(img, .004, seed)

def snowman_cover(seed=409):
    img = vgrad([(0, '#d5e6f6'), (.6, '#eef4fa'), (1, '#fbfdff')])
    for i, (b, a, top, bot) in enumerate([(700, 80, '#e6eef7', '#f1f6fb'), (840, 60, '#f1f5fa', '#fafcfe'), (990, 40, '#f8fafd', '#ffffff')]):
        img = paint_layer(img, ridge(seed + i, b, a, freq=.8 + i * .3, rough=.5), top, bot, soft=1.2)
    for x, y, s in ((380, 960, 80), (1500, 1000, 95), (980, 860, 55)):
        X, Y, S = k(x), k(y), k(s)
        img = shapes_layer(img, lambda d: (d.ellipse([X - S, Y - S * .2, X + S, Y + S * 1.6], fill=255), d.ellipse([X - S * .65, Y - S * 1.3, X + S * .65, Y], fill=255)), '#dfe8f2')
        img = shapes_layer(img, lambda d: (d.ellipse([X - S * .96, Y - S * .25, X + S * .9, Y + S * 1.5], fill=255), d.ellipse([X - S * .62, Y - S * 1.33, X + S * .6, Y - S * .05], fill=255)), '#ffffff')
        img = shapes_layer(img, lambda d: (d.rounded_rectangle([X - S * .68, Y - S * .2, X + S * .68, Y + S * .02], radius=S * .1, fill=255), d.rectangle([X + S * .2, Y - S * .1, X + S * .45, Y + S * .5], fill=255)), '#f08a8a')
        img = shapes_layer(img, lambda d: [d.ellipse([X + ex * S - S * .06, Y - S * .8, X + ex * S + S * .06, Y - S * .66], fill=255) for ex in (-.22, .22)], '#4a4a55', blur=.4)
        img = shapes_layer(img, lambda d: d.polygon([(X, Y - S * .62), (X + S * .4, Y - S * .52), (X, Y - S * .48)], fill=255), '#ffaf5c', blur=.4)
    r = RNG(seed)
    img = shapes_layer(img, lambda d: [d.ellipse([x - s, y - s, x + s, y + s], fill=255) for x, y, s in [(r.random() * W, r.random() * H, k(2 + r.random() ** 3 * 5)) for _ in range(220)]], '#ffffff', .9)
    return grain(img, .004, seed)

def balloon_cover(seed=411):
    img = vgrad([(0, '#c9e6fb'), (.6, '#eaf5fd'), (1, '#fdf6ea')])
    img = flat_clouds(img, [(200, 760, 160), (900, 1000, 220), (1650, 840, 180), (560, 300, 80), (1400, 420, 70)], seed)
    for x, y, s, c1, c2 in ((360, 330, 90, '#f7b6c2', '#fde3e8'), (1180, 220, 120, '#ffd27a', '#fff0c4'), (1650, 520, 70, '#a9d6f2', '#e1f2fc'), (800, 620, 55, '#c7b6f2', '#ece5fd')):
        X, Y, S = k(x), k(y), k(s)
        body = lambda d: (d.ellipse([X - S, Y - S, X + S, Y + S * 1.05], fill=255), d.polygon([(X - S * .82, Y + S * .5), (X + S * .82, Y + S * .5), (X + S * .25, Y + S * 1.3), (X - S * .25, Y + S * 1.3)], fill=255))
        img = shapes_layer(img, body, c1)
        img = shapes_layer(img, lambda d: (d.ellipse([X - S * .38, Y - S, X + S * .38, Y + S * 1.05], fill=255), d.polygon([(X - S * .3, Y + S * .5), (X + S * .3, Y + S * .5), (X + S * .1, Y + S * 1.3), (X - S * .1, Y + S * 1.3)], fill=255)), c2)
        img = shapes_layer(img, lambda d: (d.line([(X - S * .25, Y + S * 1.3), (X - S * .2, Y + S * 1.6)], fill=255, width=max(2, int(S * .04))), d.line([(X + S * .25, Y + S * 1.3), (X + S * .2, Y + S * 1.6)], fill=255, width=max(2, int(S * .04))),
                                           d.rounded_rectangle([X - S * .26, Y + S * 1.58, X + S * .26, Y + S * 1.9], radius=S * .06, fill=255)), '#b88a64')
    return grain(img, .004, seed)

def rainbow_cover(seed=413):
    img = vgrad([(0, '#cfe8fb'), (.6, '#eef7fd'), (1, '#fdf8ee')])
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt((xx - k(960)) ** 2 + (yy - k(1150)) ** 2) / K
    for i, c in enumerate(('#f9c2c8', '#fcd9b4', '#fdeeb0', '#cdeec4', '#bfe1f6', '#d6cbf4')):
        r0 = 820 - i * 46
        band = np.clip((d - (r0 - 46)) * K / 1.5, 0, 1) * np.clip((r0 - d) * K / 1.5, 0, 1)
        img = flat(img, band, c, .95)
    img = flat_clouds(img, [(250, 1030, 200), (520, 1110, 160), (1680, 1030, 210), (1420, 1110, 150), (1000, 260, 80)], seed)
    return grain(img, .004, seed)

def lavender_cover(seed=415):
    img = vgrad([(0, '#dfe7f7'), (.5, '#f4f2fa'), (1, '#f1ecf8')])
    img = flat_clouds(img, [(420, 200, 100), (1500, 170, 120)], seed, under='#e3e1f2')
    img = paint_layer(img, ridge(seed, 680, 45, freq=.8), '#d8e6c8', '#e0ecd2', soft=1.2)
    yl = ridge(seed + 1, 760, 18, freq=.6)
    img = paint_layer(img, yl, '#cdbfe9', '#d8cdef', soft=1.2)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    vy = k(700); u = (xx - W / 2) / np.maximum(yy - vy, 1) * k(260)
    rows = (np.sin(u / k(16)) > .1) & (yy > yl[None, :] + k(10))
    img = flat(img, np.asarray(Image.fromarray((rows * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(k(.8))), np.float32) / 255, '#b6a3e0', .85)
    return grain(img, .004, seed)

def bamboo_tile(n=1024, seed=417):
    """SR-like but used as SSR in the list? → kept as a tile (bamboo grove), flat"""
    r = RNG(seed); img = solid(n, '#eef6e6') * (0.99 + 0.02 * fnoise(n, 2.4, seed))[..., None]
    for layer, (cnt, col, wmin) in enumerate([(9, '#d6eac4', 14), (7, '#bfdea6', 20)]):
        m = Image.new('L', (n * 2, n * 2), 0); d = ImageDraw.Draw(m)
        xs = sorted(r.random(cnt) * n)
        for x in xs:
            w = wmin + r.random() * 8; seg = 110 + r.random() * 60; off = r.random() * seg
            for ox in (-n, 0, n):
                X = x + ox
                d.rectangle([(X - w / 2) * 2, 0, (X + w / 2) * 2, n * 2], fill=255)
            for k_ in range(int(n / seg) + 2):
                y = (off + k_ * seg) % n
                for ox in (-n, 0, n):
                    X = x + ox
                    d.rectangle([(X - w / 2) * 2, (y - 2) * 2, (X + w / 2) * 2, (y + 2) * 2], fill=0)
        mm = np.asarray(m.resize((n, n), Image.LANCZOS), np.float32) / 255
        img = flat(img, mm, col)
    leaves = scatter_shapes(n, lambda: [(-1, 0), (-.2, -.16), (1, 0), (-.2, .16)], 26, seed + 3, 30, 120)
    img = flat(img, mask_draw(n, 3, leaves), '#a9d38e', .9)
    return grain(img, .004, seed)

def dusk_town_cover(seed=419):
    img = vgrad([(0, '#c9c1ea'), (.45, '#f2c6d3'), (.7, '#fcdcc4'), (1, '#fde9d6')])
    r = RNG(seed)
    for layer, (base, col, hmin, hmax) in enumerate([(1020, '#e6d3e6', 70, 170), (1110, '#d9c3e1', 45, 120)]):
        def town(d, base=base, hmin=hmin, hmax=hmax):
            x = -20
            while x < 1940:
                w = 70 + r.random() * 90; h = hmin + r.random() * (hmax - hmin)
                d.rectangle([k(x), k(base - h), k(x + w), H], fill=255)
                if r.random() < .5: d.polygon([(k(x - 6), k(base - h)), (k(x + w / 2), k(base - h - w * .45)), (k(x + w + 6), k(base - h))], fill=255)
                x += w + r.random() * 8
        img = shapes_layer(img, town, col)
        def windows(d, base=base, hmin=hmin):
            for _ in range(60 if layer else 40):
                x = r.random() * 1920; y = base - r.random() * hmin * .8
                d.rounded_rectangle([k(x), k(y), k(x + 12), k(y + 16)], radius=k(2), fill=255)
        img = shapes_layer(img, windows, '#ffe7a6', .9)
    img = shapes_layer(img, lambda d: [d.polygon([(k(x) + px * k(4), k(y) + py * k(4)) for px, py in star_pts()], fill=255) for x, y in [(r.random() * 1920, r.random() * 300) for _ in range(14)]], '#fff4cf', .8)
    return grain(img, .004, seed)

def island_cover(seed=421):
    img = vgrad([(0, '#c3e7f8'), (.5, '#e6f6fc'), (.56, '#9ed9e8'), (1, '#c8ecf0')])
    img = paint_layer(img, np.full(W, k(672.0)), '#a5dceb', '#c6ebf2', soft=.6)
    img = flat_clouds(img, [(300, 260, 110), (1580, 220, 130), (900, 420, 60)], seed)
    X, Y = k(1240), k(720)
    img = shapes_layer(img, lambda d: d.ellipse([X - k(330), Y - k(70), X + k(330), Y + k(60)], fill=255), '#f6e3b6')
    img = shapes_layer(img, lambda d: d.ellipse([X - k(260), Y - k(60), X + k(160), Y + k(10)], fill=255), '#a8d68f')
    img = shapes_layer(img, lambda d: d.polygon([(X + k(40), Y - k(40)), (X + k(62), Y - k(40)), (X + k(10), Y - k(280)), (X - k(8), Y - k(276))], fill=255), '#c49a6c')
    def fronds(d):
        cx, cy = X + k(2), Y - k(280)
        for t in (-2.6, -2.0, -1.2, -.5, .1, .7):
            pts = [(cx, cy), (cx + math.cos(t - .25) * k(80), cy + math.sin(t - .25) * k(80) + k(10)), (cx + math.cos(t) * k(150), cy + math.sin(t) * k(150) + k(40)), (cx + math.cos(t + .25) * k(80), cy + math.sin(t + .25) * k(80) + k(14))]
            d.polygon(pts, fill=255)
    img = shapes_layer(img, fronds, '#7fc283')
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    rr = RNG(seed + 7)
    def waves(d):
        for _ in range(40):
            x = rr.random() * 1920; y = 700 + rr.random() ** .8 * 500; w = 30 + (y - 700) / 500 * 60
            d.arc([k(x - w), k(y - w * .35), k(x), k(y + w * .35)], 200, 340, fill=255, width=max(2, int(k(3))))
            d.arc([k(x), k(y - w * .35), k(x + w), k(y + w * .35)], 200, 340, fill=255, width=max(2, int(k(3))))
    img = shapes_layer(img, waves, '#e8f8fb', .8)
    return grain(img, .004, seed)

def moon_night_cover(seed=423):
    img = vgrad([(0, '#1a2347'), (.6, '#27355f'), (1, '#33467a')])
    r = RNG(seed)
    img = shapes_layer(img, lambda d: [d.ellipse([x - s, y - s, x + s, y + s], fill=255) for x, y, s in [(r.random() * W, r.random() * H * .8, k(.8 + r.random() ** 3 * 2.2)) for _ in range(500)]], '#fff6dc', .9, blur=.5)
    img = shapes_layer(img, lambda d: [d.polygon([(k(x) + px * k(9), k(y) + py * k(9)) for px, py in star_pts()], fill=255) for x, y in [(r.random() * 1920, r.random() * 700) for _ in range(12)]], '#ffe9a6', .9)
    img = shapes_layer(img, lambda d: d.ellipse([k(1420 - 130), k(300 - 130), k(1420 + 130), k(300 + 130)], fill=255), '#fff1c4')
    img = shapes_layer(img, lambda d: (d.ellipse([k(1380), k(250), k(1420), k(290)], fill=255), d.ellipse([k(1450), k(330), k(1475), k(355)], fill=255)), '#f6e2a6')
    img = soft_clouds(img, [(380, 460, 110), (1100, 560, 90), (1700, 650, 100)], '#56628f', '#47527d', seed)
    img = paint_layer(img, ridge(seed + 1, 980, 60, freq=.8), '#1d2747', '#18203b', soft=1)
    img = paint_layer(img, ridge(seed + 2, 1080, 40, freq=1.1), '#141b33', '#10172b', soft=1)
    return grain(img, .006, seed)

def fuji_cover(seed=425):
    img = vgrad([(0, '#c9e3f7'), (.55, '#eaf4fb'), (1, '#f6f4ea')])
    X = k(1100)
    img = shapes_layer(img, lambda d: d.polygon([(X - k(620), k(900)), (X - k(110), k(360)), (X + k(110), k(360)), (X + k(620), k(900))], fill=255), '#8fb2d6')
    def cap(d):
        pts = [(X - k(110), k(360)), (X + k(110), k(360)), (X + k(230), k(480))]
        for j in range(7): pts.append((X + k(230 - j * 460 / 6), k(480 + (25 if j % 2 else 0))))
        pts.append((X - k(230), k(480))); d.polygon(pts, fill=255)
    img = shapes_layer(img, cap, '#ffffff')
    img = soft_clouds(img, [(500, 700, 140), (1500, 760, 160), (1100, 820, 120), (300, 240, 90), (1700, 220, 80)], '#ffffff', '#dde9f4', seed)
    img = paint_layer(img, ridge(seed, 900, 20, freq=.6), '#cfe4c0', '#d9ebcb', soft=1.2)
    img = paint_layer(img, ridge(seed + 1, 1000, 25, freq=1.0), '#bfdcaa', '#cbe3b8', soft=1.2)
    return grain(img, .004, seed)

def cloud_sea_cover(seed=427):
    img = vgrad([(0, '#c7c9ef'), (.35, '#f3cbd8'), (.6, '#fde4c8'), (1, '#fff3e0')])
    img = shapes_layer(img, lambda d: d.ellipse([k(960 - 150), k(640 - 150), k(960 + 150), k(640 + 150)], fill=255), '#ffe9b0')
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    img = lerp(img, hexc('#fff1c8'), np.exp(-((xx - k(960)) ** 2 + (yy - k(640)) ** 2) / (2 * k(420) ** 2)) * .45)
    for i, (y0, c1, c2) in enumerate([(700, '#f8dcdf', '#f1c8d0'), (820, '#fbe8e6', '#f4d3d6'), (960, '#fff3f0', '#f9e0df')]):
        r = RNG(seed + i)
        cl = [(x, y0 + r.random() * 60, 120 + r.random() * 90) for x in np.arange(-100, 2100, 210 - i * 30)]
        img = soft_clouds(img, cl, c1, c2, seed + i)
        img = flat(img, np.clip((yy - k(y0 + 60)) / k(4), 0, 1), c1)
    return grain(img, .004, seed)

def galaxy_cover(seed=429):
    img = vgrad([(0, '#120f2a'), (1, '#1b1840')])
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    X, Y = (xx - W / 2) / K, (yy - H / 2) / K
    t = -.5; u = X * math.cos(t) - Y * math.sin(t); v = X * math.sin(t) + Y * math.cos(t)
    band = np.exp(-(v / 230) ** 2) * (big_noise(seed, 2.4) * .7 + .3)
    neb = big_noise(seed + 1, 3.0)
    img = img + band[..., None] * lerp(hexc('#6b4fb8'), hexc('#d86fb0'), neb) * .55
    img = img + (np.exp(-(v / 90) ** 2) * neb * .35)[..., None] * hexc('#ffe1f0')
    r = RNG(seed)
    for cnt, sz in ((1400, .8), (220, 1.6), (40, 2.8)):
        img = shapes_layer(img, lambda d: [d.ellipse([x - s, y - s, x + s, y + s], fill=255) for x, y, s in [(r.random() * W, r.random() * H, k(sz * (.6 + r.random() * .8))) for _ in range(cnt)]], '#fff8ea', .95, blur=sz * .4)
    return grain(img, .006, seed)

def gold_seigaiha(n=1024, seed=431):
    img = seigaiha(n, base='#fcf9f1', c1='#ecd9a8', c2='#f9f1df', seed=seed)
    return img

def rose_marble(n=1024, seed=433):
    img = marble(n, base='#fbf2f2', vein='#e2b9be', gold=True, seed=seed)
    return img

def night_gold_washi(n=1024, seed=435):
    return washi(n, base='#1e2648', fib='#2c3663', fib2='#26305a', seed=seed, gold=True)

def shifting_sky(seed=437, dusk=False):
    """UR (animated): the same flat clouds under a day sky and a dusk sky; the two cross-fade on the page"""
    img = vgrad([(0, '#bfe3fb'), (.55, '#e3f3fd'), (1, '#fdf7ea')]) if not dusk else vgrad([(0, '#c8c0ec'), (.45, '#f6c9d6'), (.75, '#fde2c6'), (1, '#fff1df')])
    cl = [(260, 260, 150), (1500, 190, 120), (1020, 420, 90), (1760, 560, 140), (180, 760, 170), (820, 900, 200), (1500, 980, 220), (520, 1120, 180)]
    return grain(soft_clouds(img, cl, '#ffffff' if not dusk else '#fff2ef', '#dcebf6' if not dusk else '#f2c9d3', seed), .004, seed)

SKINS.update({
    # R (18)
    's41': (lambda: washi(base='#fbeef0', fib='#fff8f9', fib2='#f3d9df', seed=501), 'tile'),
    's42': (lambda: washi(base='#eef4e2', fib='#f9fcf3', fib2='#dce9c8', seed=503), 'tile'),
    's43': (lambda: washi(base='#eaf2f9', fib='#f8fbfe', fib2='#d6e5f3', seed=505), 'tile'),
    's44': (lambda: linen(base='#ece8f4', dark='#d3cbe4', seed=507), 'tile'),
    's45': (lambda: linen(base='#e7ede2', dark='#cbd7c2', seed=509), 'tile'),
    's46': (lambda: graph(base='#fdf8f8', line='#efc3cf', seed=511), 'tile'),
    's47': (dotgrid, 'tile'),
    's48': (ruled, 'tile'),
    's49': (lambda: gingham(base='#f6fbf8', c='#bfe3d0', seed=513), 'tile'),
    's50': (lambda: gingham(base='#fffdf2', c='#f7e3a0', seed=515), 'tile'),
    's51': (lambda: felt(base='#e6def4', light='#f1ebfa', dark='#d4c8ec', seed=517), 'tile'),
    's52': (lambda: felt(base='#f6dde3', light='#fbecef', dark='#ecc8d1', seed=519), 'tile'),
    's53': (lambda: watercolor(inks=('#d3ecd0', '#e2f0c9'), seed=521), 'tile'),
    's54': (stripes, 'tile'),
    's55': (lambda: stripes(base='#fff7f8', c='#fadde3', w=24, seed=523), 'tile'),
    's56': (lambda: polka(base='#f7efe7', dot='#e6d2c0', seed=525), 'tile'),
    's57': (lambda: polka(base='#effaf5', dot='#cdebdc', seed=527), 'tile'),
    's58': (hinoki, 'tile'),
    # SR (20)
    's59': (lambda: motif(1024, '#fdf8f2', 531, [(18, 34, 190, [(tulip_green, '#cfe6bf'), (tulip_head, '#f8d0d8')], .3, .2, 0), (12, 30, 180, [(tulip_green, '#cfe6bf'), (tulip_head, '#fde7b0')], .3, .2, 7)]), 'tile'),
    's60': (lambda: motif(1024, '#fbf6ef', 533, [(26, 30, 150, [(paw, '#ead9c6')], .3, .6, 0)]), 'tile'),
    's61': (lambda: motif(1024, '#eef7fb', 535, [(22, 40, 170, [(fish, '#cfe6f4'), (fish_eye, '#eef7fb')], .35, 0, 0), (12, 30, 150, [(fish, '#f6dccc'), (fish_eye, '#eef7fb')], .3, 0, 5)]), 'tile'),
    's62': (lambda: motif(1024, '#fdf6fa', 537, [(14, 34, 170, [(candy, '#f7cfdf'), (candy_swirl, '#fbe7ef')], .3, .6, 0), (14, 34, 170, [(candy, '#cfe8f4'), (candy_swirl, '#e9f5fb')], .3, .6, 3), (10, 34, 170, [(candy, '#fbe7ad'), (candy_swirl, '#fdf4d6')], .3, .6, 6)]), 'tile'),
    's63': (lambda: motif(1024, '#fff7f8', 539, [(28, 26, 130, [(heart, '#fbdce3')], .5, .5, 0), (14, 16, 110, [(heart, '#f9e8c8')], .3, .5, 4)]), 'tile'),
    's64': (lambda: motif(1024, '#f6f5fc', 541, [(26, 34, 150, [(note, '#d9d4f2')], .3, .3, 0), (16, 24, 120, [(note, '#f3d6e3')], .3, .3, 6)]), 'tile'),
    's65': (lambda: motif(1024, '#f7f3ec', 543, [(10, 36, 200, [(pawn, '#e6dccb')], .2, 0, 0), (8, 34, 200, [(rook, '#ddd3c2')], .2, 0, 3), (7, 34, 200, [(king, '#e9e1d2')], .2, 0, 6)]), 'tile'),
    's66': (lambda: motif(1024, '#fbf8f1', 545, [(20, 34, 170, [(die, '#f2dcd2'), (die_pips, '#fbf8f1')], .3, .5, 0), (14, 30, 160, [(die, '#d6e6f2'), (die_pips, '#fbf8f1')], .3, .5, 4)]), 'tile'),
    's67': (lambda: motif(1024, '#f8efdd', 547, [(20, 24, 150, [(stone, '#dcd2c1')], .1, 0, 0), (20, 24, 150, [(stone, '#fffcf5')], .1, 0, 9)]), 'tile'),
    's68': (lambda: motif(1024, '#eff6fb', 549, [(30, 24, 130, [(drop, '#cfe3f3')], .5, .2, 0)]), 'tile'),
    's69': (lambda: motif(1024, '#e8f4fc', 551, [(16, 56, 230, [(cloudlet, '#ffffff')], .4, 0, 0), (12, 34, 180, [(cloudlet, '#f6fbff')], .3, 0, 5)]), 'tile'),
    's70': (lambda: motif(1024, '#f1f0fa', 553, [(10, 40, 220, [(crescent, '#f8eab8')], .3, .4, 0), (26, 12, 110, [(lambda d, X, Y, s, a, ss: d.polygon(P_(star_pts(), X, Y, s, a), fill=255), '#f6e6b4')], .5, .5, 3)]), 'tile'),
    's71': (lambda: motif(1024, '#fdf7f6', 555, [(20, 36, 180, [(cherry_stem, '#c7deb0'), (cherry, '#f6c4c8')], .3, .2, 0)]), 'tile'),
    's72': (lambda: motif(1024, '#fdf9ec', 557, [(24, 34, 160, [(ginkgo, '#f8e3a0')], .3, 1.2, 0), (12, 26, 140, [(ginkgo, '#f3d58a')], .3, 1.2, 5)]), 'tile'),
    's73': (lambda: motif(1024, '#fbf7ef', 559, [(18, 32, 180, [(apple_leaf, '#c9e2b4'), (apple, '#f6c9c4')], .3, .1, 0), (10, 30, 170, [(apple_leaf, '#c9e2b4'), (apple, '#e4eeb9')], .3, .1, 7)]), 'tile'),
    's74': (lambda: lattice_lines(1024, 561, '#f6f8f1', '#d7e3c9', 'asanoha'), 'tile'),
    's75': (lambda: lattice_lines(1024, 563, '#f9f5fb', '#e1d4ea', 'shippo'), 'tile'),
    's76': (lambda: lattice_lines(1024, 565, '#fbf3f0', '#f1dbd3', 'uroko'), 'tile'),
    's77': (herringbone, 'tile'),
    's78': (lambda: lattice_lines(1024, 567, '#fdf9ec', '#efdfae', 'honey'), 'tile'),
    # SSR (14)
    's79': (sakura_trees_cover, 'cover'), 's80': (autumn_cover, 'cover'), 's81': (sunflower_cover, 'cover'), 's82': (dawn_sea_cover, 'cover'),
    's83': (snowman_cover, 'cover'), 's84': (balloon_cover, 'cover'), 's85': (rainbow_cover, 'cover'), 's86': (lavender_cover, 'cover'),
    's87': (bamboo_tile, 'tile'), 's88': (dusk_town_cover, 'cover'), 's89': (island_cover, 'cover'), 's90': (moon_night_cover, 'cover'),
    's91': (fuji_cover, 'cover'), 's92': (cloud_sea_cover, 'cover'),
    # UR (7)
    's93': (gems, 'tile'), 's94': (gold_seigaiha, 'tile'), 's95': (galaxy_cover, 'cover'),
    's96': (raden_cover, 'cover'), 's96b': (lambda: raden_cover(shift=.4), 'cover'),
    's97': (rose_marble, 'tile'), 's98': (night_gold_washi, 'tile'),
    's99': (shifting_sky, 'cover'), 's99b': (lambda: shifting_sky(dusk=True), 'cover'),
})

if __name__ == '__main__':
    ids = sys.argv[1:] or list(SKINS)
    for i in ids:
        fn, kind = SKINS[i]
        save(i, fn(), kind, q=74 if kind == 'cover' else 76)

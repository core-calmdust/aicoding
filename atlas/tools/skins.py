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
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    for i, (x, y, s) in enumerate(clouds): cloud_mask(k(x), k(y), k(s), seed + i)(d, 1)
    mm = np.asarray(m.filter(ImageFilter.GaussianBlur(k(1.2))), np.float32) / 255
    return emboss_layer(img, mm, col, rad=k(rad), k=14 / K, shadow=0, wrap=False, col2=under, hi=hi, lo=.12, light=(-0.3, -0.85, 0.5))

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
            mm = np.asarray(m.filter(ImageFilter.GaussianBlur(k(1.2))), np.float32) / 255
            img = emboss_layer(img, mm, '#9fb9cf' if i == 1 else '#8fb0c8', rad=k(3), k=5 / K, shadow=.06, wrap=False, col2='#e9f1f8', light=(-0.4, -0.8, 0.5), sh_off=(int(k(4)), int(k(5))))
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
    r = RNG(seed + 1)
    for col in ('#fbd3dd', '#fff1b0', '#ffffff', '#d9cdf6'):
        m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
        for _ in range(120):
            x = r.random() * W; y = k(880 + r.random() ** .7 * 320); s = k(4) + (y - k(860)) / 50 * r.random()
            for j in range(5):
                a = j * 2 * math.pi / 5; d.ellipse([x + math.cos(a) * s - s * .55, y + math.sin(a) * s - s * .55, x + math.cos(a) * s + s * .55, y + math.sin(a) * s + s * .55], fill=255)
        mm = np.asarray(m.filter(ImageFilter.GaussianBlur(k(.8))), np.float32) / 255
        img = emboss_layer(img, mm, col, rad=k(1.5), k=4 / K, shadow=.08, wrap=False, sh_off=(int(k(2)), int(k(3))))
    return grain(img, .005, seed)

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

def old_map_cover(seed=139):
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
    def rose(d, ss):
        R = k(120)
        for j in range(8):
            a = -math.pi / 2 + j * math.pi / 4; L = R if j % 2 == 0 else R * .6
            pts = [(cx + math.cos(a) * L, cy + math.sin(a) * L), (cx + math.cos(a + .32) * R * .17, cy + math.sin(a + .32) * R * .17), (cx, cy), (cx + math.cos(a - .32) * R * .17, cy + math.sin(a - .32) * R * .17)]
            d.polygon([(x * ss, y * ss) for x, y in pts], fill=255)
    img = emboss_layer(img, mask_draw(H, 2, rose, m=W), '#9b6e3a', rad=k(2), k=5 / K, shadow=.15, wrap=False, col2='#d9b17a', sh_off=(int(k(3)), int(k(4))))
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
    's40': (opal_cover, 'cover'), 's40b': (lambda: opal_cover(shift=.33), 'cover'),
}

if __name__ == '__main__':
    ids = sys.argv[1:] or list(SKINS)
    for i in ids:
        fn, kind = SKINS[i]
        save(i, fn(), kind, q=74 if kind == 'cover' else 76)

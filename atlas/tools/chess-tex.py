# Writes the chess 3D boards' pictures (images/atlas/chess3d/*.webp), 2026-11-15.
#   python3 atlas/tools/chess-tex.py [name …]        (numpy, scipy, Pillow; the noise / wood helpers are the xiangqi ones: xqtex_*.py)
# Each board: top-<look> (the whole top, 2048²) and side-<look> (the four faces stacked: far / right / near / left, see
# xqtex_field.perimeter), each with a "-m" map: R height (bump), G roughness, B metalness.
#   marble   大理石と真鍮       white Carrara and black Marquina squares, a Marquina frame, brass stringing
#   walnut   ウォルナットとメープル  the tournament board: walnut and maple squares, a mitred walnut frame, boxwood / ebony stringing
#   leather  革と金箔           green and cream leather squares, a green leather frame tooled in gold (fillets, a roll, corner fleurons)
#   khatam   ハータム           bone and rosewood squares, a rosewood frame with a band of Persian khatam (stars of brass, bone, ebony)
# The playing field itself stays plain (no figure that fights the pieces) — the art is in the frame (as backgammon's boards).
import os, sys, math
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from xqtex_lib import vnoise, fbm, smooth, mixc, save
from xqtex_field import n3, f3, perimeter
import xqtex_field as XF
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'images', 'atlas', 'chess3d')
# the board (atlas/models/chess.js): 8 squares of 1.0, a frame of MARGIN round them
S, M = 8, .85
W = S + 2 * M; HB = .5
CW = 2048; PX = CW / W
SS = 2
E_RO = .06; SH = .52; SPX = 246

def blur(a, s): return ndimage.gaussian_filter(a, s)
def coords(w=CW, h=CW, px=PX):
    x = (np.arange(w, dtype=np.float32) + .5) / px; y = (np.arange(h, dtype=np.float32) + .5) / px
    return np.meshgrid(x, y)
def mmap(rough, metal, hgt=None):
    R = 128 + (hgt if hgt is not None else np.zeros_like(rough)) * 127
    return np.stack([R, rough * 255, metal * 255], -1)
def put(path, rgb, m=None, q=88):
    save(rgb, os.path.join(OUT, path + '.webp'), q)
    if m is not None: save(m, os.path.join(OUT, path + '-m.webp'), 92)
def P(x, y): return (x * PX * SS, y * PX * SS)
def canvas(w=CW, h=CW): im = Image.new('L', (w * SS, h * SS), 0); return im, ImageDraw.Draw(im)
def done(im, w=CW, h=CW): return np.asarray(im.resize((w, h), Image.LANCZOS), np.float32) / 255
def rect_mask(x0, y0, x1, y1):
    im, d = canvas(); d.rectangle([P(x0, y0), P(x1, y1)], fill=255); return done(im)
def band_mask(pad_out, pad_in):
    """a square ring round the field: from pad_out outside its edge to pad_in outside its edge (pad_in < pad_out)"""
    im, d = canvas()
    d.rectangle([P(M - pad_out, M - pad_out), P(M + S + pad_out, M + S + pad_out)], fill=255)
    d.rectangle([P(M - pad_in, M - pad_in), P(M + S + pad_in, M + S + pad_in)], fill=0)
    return done(im)
FIELD = None
def field_mask():
    global FIELD
    if FIELD is None: FIELD = rect_mask(M, M, M + S, M + S)
    return FIELD
def strips():
    """the frame's four mitred strips: masks (far, right, near, left); the grain of each runs along it"""
    out = []
    E = [(0, 0), (W, 0), (W, W), (0, W)]; I = [(M, M), (W - M, M), (W - M, W - M), (M, W - M)]
    for i in range(4):
        j = (i + 1) % 4; im, d = canvas(); d.polygon([P(*E[i]), P(*E[j]), P(*I[j]), P(*I[i])], fill=255); out.append(done(im))
    return out
def joints(lw=.012, dark=.5):
    """hairline joints between the squares and round the field"""
    im, d = canvas()
    for i in range(S + 1):
        d.line([P(M + i, M), P(M + i, M + S)], fill=255, width=max(1, round(lw * PX * SS)))
        d.line([P(M, M + i), P(M + S, M + i)], fill=255, width=max(1, round(lw * PX * SS)))
    return done(im)
def tiles():
    """(f, r, y-slice, x-slice) of each square in pixels"""
    for r in range(S):
        for f in range(S):
            y0, y1 = round((M + r) * PX), round((M + r + 1) * PX); x0, x1 = round((M + f) * PX), round((M + f + 1) * PX)
            yield f, r, slice(y0, y1), slice(x0, x1)
def metal_col(h, w, base, seed, along='x'):
    br = vnoise(h, w, 1.2, 60, seed) if along == 'x' else vnoise(h, w, 60, 1.2, seed)
    cl = fbm(h, w, 90, 90, seed + 5, 3)
    k = .86 + (br - .5) * .16 + (cl - .5) * .22
    return np.array(base, np.float32)[None, None, :] * k[..., None]
def inlay(col, rough, metal, hgt, mask, base, r_metal=.28, seed=1, seam=.6, met=1.):
    h, w = mask.shape
    edge = np.clip(blur(mask, 1.0) - mask, 0, 1) * 2.2
    col *= (1 - np.clip(edge, 0, 1) * seam)[..., None]
    mc = metal_col(h, w, base, seed)
    col[:] = col * (1 - mask[..., None]) + mc * mask[..., None]
    rough[:] = rough * (1 - mask) + r_metal * mask; metal[:] = metal * (1 - mask) + mask * met
    hgt[:] = hgt - edge * .25
def lay(col, mask, c):
    """paint a flat colour (array or rgb) through a mask"""
    c = np.asarray(c, np.float32)
    if c.ndim == 1: c = c[None, None, :]
    col[:] = col * (1 - mask[..., None]) + c * mask[..., None]
GOLD = (236, 194, 108); BRASS = (214, 170, 92)

# ---------- stone ----------
def turb(X, Y, Z, s, seed, oct=5):
    """turbulence: a sum of |noise| octaves (the folded look of marble)"""
    t,a,n=0,1,0
    for o in range(oct):
        t=t+a*np.abs(n3(X,Y,Z,s/2**o,s/2**o,s/2**o,seed+o*13)*2-1); n+=a; a*=.5
    return t/n
def marble(X, Y, Z, kind, seed):
    """world-space marble. carrara: white, soft grey bands and fine grey veins; marquina: near black, crisp white veins"""
    tu=turb(X,Y,Z,2.2,seed)
    tu2=turb(X+3,Y-2,Z,.9,seed+50,4)
    a=X*.42+Y*.78
    if kind=='carrara':
        t=a*1.6+tu*3.2
        v=np.abs(np.sin(t*math.pi)); vein=np.power(1-v,7)      # soft grey bands
        t2=a*2.2-X*.8+tu*2.4+tu2*.6; v2=np.abs(np.sin(t2*math.pi)); fine=np.power(1-v2,40)*smooth(.45,.7,f3(X,Y,Z,1.4,1.4,1.4,seed+7,3))*.8
        base=np.array([238,236,231],np.float32); grey=np.array([150,152,158],np.float32); dk=np.array([98,100,108],np.float32)
        cl=(f3(X,Y,Z,1.1,1.1,1.1,seed+3,5)-.5)
        col=base*(1+cl[...,None]*.06)
        k=np.clip(vein*.45+cl*.15,0,1); col=col*(1-k[...,None])+grey*k[...,None]
        col=col*(1-fine[...,None]*.6)+dk*(fine[...,None]*.6)
    else:
        base=np.array([20,20,23],np.float32); mid=np.array([44,43,46],np.float32); wh=np.array([214,210,202],np.float32)
        cl=smooth(.3,.8,f3(X,Y,Z,1.3,1.3,1.3,seed+3,5)); col=base*(1-cl[...,None]*.6)+mid*(cl[...,None]*.6)
        t=a*1.1+tu*2.6; v=np.abs(np.sin(t*math.pi)); sel=smooth(.38,.55,f3(X,Y,Z,2.5,2.5,2.5,seed+9,3))
        vein=np.power(1-v,22)*sel; halo=np.power(1-v,6)*sel*.12
        t2=a*2.0-Y*.7+tu*2.0+tu2*.5; v2=np.abs(np.sin(t2*math.pi)); fine=np.power(1-v2,55)*smooth(.42,.62,f3(X,Y,Z,1.1,1.1,1.1,seed+11,3))*.8
        k=np.clip(vein*.75+halo+fine*.6,0,1)*.85; col=col*(1-k[...,None])+wh*k[...,None]
    return col

def marble_top():
    X, Y = coords(); h = w = CW
    col = np.zeros((h, w, 3), np.float32); rough = np.full((h, w), .07, np.float32); metal = np.zeros((h, w), np.float32); hgt = np.zeros((h, w), np.float32)
    # frame: one slab of Marquina per strip (book-matched: the strips of the near / far side mirror each other)
    fr = marble(X, Y, np.full_like(X, 3.3), 'marquina', 11)
    st = strips()
    for i, sm in enumerate(st):
        Xs, Ys = (X, Y) if i % 2 == 0 else (Y, X)
        if i >= 2: Xs = W - Xs
        c = marble(Xs * .9, Ys * .9 + i * 2.1, np.full_like(X, 5 + i), 'marquina', 31 + i)
        lay(col, sm, c)
    # squares: each cut from its own spot of the slab (light: Carrara, dark: Marquina)
    R = np.random.default_rng(5)
    for f, r, sy, sx in tiles():
        x, y = X[sy, sx], Y[sy, sx]; light = (f + r) % 2 == 0
        ox, oy, oz = R.uniform(-30, 30, 3); ang = R.choice([0, math.pi / 2]) + R.uniform(-.15, .15)
        u = (x - x.mean()) * math.cos(ang) - (y - y.mean()) * math.sin(ang) + ox; v = (x - x.mean()) * math.sin(ang) + (y - y.mean()) * math.cos(ang) + oy
        col[sy, sx] = marble(u, v, np.full_like(u, oz), 'carrara' if light else 'marquina', 100 + f * 8 + r)
    # joints: a hair of dark filler between the squares, the field set a breath lower
    J = joints(.01); col *= (1 - J * .55)[..., None]; hgt -= J * .2
    # brass: a stringing line round the field, a wider band near the outer edge
    for a, b in [(.07, .045), (M - .1, M - .16)]:
        inlay(col, rough, metal, hgt, band_mask(a, b), BRASS, .24, 7)
    # polish: the light catches the stone; a soft darkening at the very edge (the bevel)
    return col, mmap(rough, metal, hgt)

def marble_side():
    X, Y, Z, Ek = perimeter(W, W, E_RO, SH, SPX)
    col = marble(X * .9, Z * .9 + Y * .9, np.full_like(X, 6.6), 'marquina', 41)
    h, w = X.shape; rough = np.full((h, w), .08, np.float32); metal = np.zeros((h, w), np.float32); hgt = np.zeros((h, w), np.float32)
    m = blur(((np.abs(Z + .12) < .016)).astype(np.float32), .6)   # a brass line round the board, below the round-over
    inlay(col, rough, metal, hgt, m, BRASS, .26, 9)
    return col, mmap(rough, metal, hgt)

# ---------- wood ----------
XF.SP['maple'] = dict(a=(240, 222, 186), b=(220, 196, 152), c=(200, 172, 128), rw=.06, pore=0, fib=.1, streak=0, tone=.12, late=(.7, .95), lc=.22)
XF.SP['walnutd'] = dict(a=(118, 80, 52), b=(66, 42, 28), c=(44, 29, 22), rw=.07, pore=.45, fib=.16, streak=.3, tone=.2, late=(.78, .96), lc=.3)
XF.SP['rose'] = dict(a=(116, 52, 32), b=(62, 24, 15), c=(30, 11, 8), rw=.05, pore=.3, fib=.2, streak=.45, tone=.18, late=(.72, .95), lc=.42)
XF.SP['ebonyw'] = dict(a=(40, 30, 26), b=(14, 10, 9), c=(6, 4, 4), rw=.03, pore=.2, fib=.25, streak=.5, tone=.15, late=(.6, .95), lc=.4)
def wood_strip(X, Y, sp, i, seed, cz=-2.2):
    """a frame strip's wood; the grain runs along the strip (far / near: along X, sides: along Y)"""
    if i % 2 == 0: Xs, Ys = Y, X
    else: Xs, Ys = X, Y
    return XF.wood3(Xs, Ys, np.zeros_like(X), sp, dict(cx=(M / 2 if i in (0, 3) else W - M / 2) + .3, cz=cz, wob=.35), seed)
def wood_tile(x, y, sp, seed, R):
    return XF.wood3(x, y, np.zeros_like(x), sp, dict(cx=x.mean() + R.uniform(-.9, .9), cz=R.uniform(-2.8, -1.2), tx=R.uniform(-.04, .04), wob=.25), seed)

def walnut_top():
    X, Y = coords(); h = w = CW
    col = np.zeros((h, w, 3), np.float32); rough = np.full((h, w), .42, np.float32); metal = np.zeros((h, w), np.float32); hgt = np.zeros((h, w), np.float32)
    for i, sm in enumerate(strips()): lay(col, sm, wood_strip(X, Y, 'walnutd', i, 61 + i))
    R = np.random.default_rng(9)
    for f, r, sy, sx in tiles():
        light = (f + r) % 2 == 0
        col[sy, sx] = wood_tile(X[sy, sx], Y[sy, sx], 'maple' if light else 'walnutd', 200 + f * 9 + r, R)
    J = joints(.008); col *= (1 - J * .45)[..., None]; hgt -= J * .15
    # stringing round the field: boxwood, ebony, boxwood
    BOX = np.array([232, 212, 168], np.float32); EB = np.array([24, 17, 13], np.float32)
    lay(col, band_mask(.075, .0), EB); lay(col, band_mask(.06, .015), BOX); lay(col, band_mask(.045, .03), EB)
    lay(col, band_mask(M - .06, M - .085), BOX)   # a single boxwood line near the outer edge
    # an oiled, satin finish: the grain's pores catch a little
    hgt += (blur(col.mean(-1), .7) / 255 - .5) * .05
    return col, mmap(rough, metal, hgt)

def walnut_side():
    X, Y, Z, Ek = perimeter(W, W, E_RO, SH, SPX)
    h, w = X.shape; hs = h // 4; col = np.zeros((h, w, 3), np.float32)
    for k in range(4):
        sl = slice(k * hs, (k + 1) * hs)
        if k % 2 == 0: col[sl] = XF.wood3(Y[sl], X[sl], Z[sl], 'walnutd', dict(cx=M / 2 + .3 if k == 0 else W - M / 2 + .3, cz=-2.2, wob=.35), 61 + (0 if k == 0 else 2))
        else: col[sl] = XF.wood3(X[sl], Y[sl], Z[sl], 'walnutd', dict(cx=W - M / 2 + .3 if k == 1 else M / 2 + .3, cz=-2.2, wob=.35), 61 + (1 if k == 1 else 3))
    rough = np.full((h, w), .45, np.float32)
    return col, mmap(rough, np.zeros((h, w), np.float32), (blur(col.mean(-1), .8) / 255 - .5) * .08)

# ---------- leather ----------
def pebble(X, Y, cell, seed):
    """leather grain: the distance to the nearest of jittered points (the hide's pebbles), and its creases"""
    gx, gy = np.floor(X / cell).astype(np.int64), np.floor(Y / cell).astype(np.int64)
    d1 = np.full(X.shape, 9, np.float32); d2 = np.full(X.shape, 9, np.float32)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            cx, cy = gx + dx, gy + dy
            hx = XF._hash(cx, cy, np.zeros_like(cx), seed); hy = XF._hash(cx, cy, np.ones_like(cx), seed + 1)
            px = (cx + .15 + hx * .7) * cell; py = (cy + .15 + hy * .7) * cell
            d = np.hypot(X - px, Y - py).astype(np.float32)
            d2 = np.where(d < d1, d1, np.minimum(d2, d)); d1 = np.minimum(d1, d)
    return d1 / cell, (d2 - d1) / cell
def leather(X, Y, base, seed, cell=.03):
    d1, edge = pebble(X, Y, cell, seed)
    crease = 1 - smooth(0, .09, edge)
    tone = (f3(X, Y, np.zeros_like(X), .9, .9, .9, seed + 3, 4) - .5)
    mott = (f3(X, Y, np.zeros_like(X), .15, .15, .15, seed + 5, 3) - .5)
    k = 1 + tone * .16 + mott * .08 - crease * .1 + (1 - smooth(0, .5, d1)) * .05
    col = np.asarray(base, np.float32)[None, None, :] * k[..., None]
    hgt = (smooth(0, .6, d1) * -.25 - crease * .2) * .5
    return col, hgt
def tool_masks():
    """the gilt tooling of the frame: fillets, a roll of small leaves and dots between them, a fleuron in each corner,
       and the fine blind line round each square"""
    im, d = canvas(); lw = lambda v: max(1, round(v * PX * SS))
    def sq(pad, wd):
        a, b = M - pad, M + S + pad; d.rectangle([P(a, a), P(b, b)], outline=255, width=lw(wd))
    sq(.05, .016); sq(.085, .007)                          # the inner fillets
    sq(M - .07, .016); sq(M - .105, .007)                   # the outer fillets
    # the roll: leaves (small ellipses, alternately tilted) and dots on the centre line of the frame
    c0 = M - (M - .085 + .085) / 2 - .02; mid = (M - .105 + .085) / 2   # distance out from the field edge to the roll's line
    n = 52; L = S + 2 * mid
    for side in range(4):
        for k in range(n):
            t = (k + .5) / n * L - mid
            if side == 0: x, y, ang = M + t, M - mid, 0
            elif side == 1: x, y, ang = M + S + mid, M + t, math.pi / 2
            elif side == 2: x, y, ang = M + S - t, M + S + mid, 0
            else: x, y, ang = M - mid, M + S - t, math.pi / 2
            if k % 2 == 0:
                for s in (-1, 1):   # a pair of leaves, a dot between
                    a = ang + s * .55; lx, ly = x + math.cos(a) * .045, y + math.sin(a) * .045
                    pts = [P(lx + math.cos(a + q) * (.04 if q in (0, math.pi) else .012) * 1, ly + math.sin(a + q) * (.04 if q in (0, math.pi) else .012)) for q in np.linspace(0, 2 * math.pi, 20)]
                    pts = [P(lx + math.cos(a) * math.cos(q) * .038 - math.sin(a) * math.sin(q) * .012, ly + math.sin(a) * math.cos(q) * .038 + math.cos(a) * math.sin(q) * .012) for q in np.linspace(0, 2 * math.pi, 24)]
                    d.polygon(pts, fill=255)
            r = .013 if k % 2 else .017
            d.ellipse([P(x - r, y - r), P(x + r, y + r)], fill=255)
    # corner fleurons: a four-petalled flower in a diamond
    for cx, cy in [(M - mid, M - mid), (M + S + mid, M - mid), (M + S + mid, M + S + mid), (M - mid, M + S + mid)]:
        for q in range(4):
            a = q * math.pi / 2 + math.pi / 4
            pts = [P(cx + math.cos(a) * (.02 + .07 * math.sin(t) ** .8) * 1 + math.cos(a + math.pi / 2) * math.sin(2 * t) * .028, cy + math.sin(a) * (.02 + .07 * math.sin(t) ** .8) + math.sin(a + math.pi / 2) * math.sin(2 * t) * .028) for t in np.linspace(0, math.pi, 22)]
            d.polygon(pts, fill=255)
        r = .02; d.ellipse([P(cx - r, cy - r), P(cx + r, cy + r)], fill=0); r = .012; d.ellipse([P(cx - r, cy - r), P(cx + r, cy + r)], fill=255)
    gilt = done(im)
    im, d = canvas()   # blind (un-gilt) tooling: a fine line just inside each square
    for f in range(S):
        for r in range(S):
            a, b = M + f + .06, M + r + .06; d.rectangle([P(a, b), P(a + .88, b + .88)], outline=255, width=lw(.006))
    return gilt, done(im)
def leather_top():
    X, Y = coords(); h = w = CW
    GREEN = (36, 78, 54); CREAM = (222, 208, 172)
    gcol, ghgt = leather(X, Y, GREEN, 3)
    ccol, chgt = leather(X * 1.03 + 7, Y * 1.03 + 3, CREAM, 9)
    col = gcol.copy(); hgt = ghgt.copy()
    for f, r, sy, sx in tiles():
        if (f + r) % 2 == 0: col[sy, sx] = ccol[sy, sx]; hgt[sy, sx] = chgt[sy, sx]
    # each square a separate skin: a hair of shade along its cut edges (skived), the seams pressed in
    J = joints(.014); col *= (1 - J * .5)[..., None]; hgt -= J * .5
    rough = np.full((h, w), .62, np.float32) + (hgt * -.2); metal = np.zeros((h, w), np.float32)
    gilt, blind = tool_masks()
    col *= (1 - blind * .28)[..., None]; hgt -= blind * .3
    # the gold leaf: pressed in, a little wider dark ring where the tool burnt the leather
    burn = np.clip(blur(gilt, 1.5) - gilt, 0, 1) * 1.6
    col *= (1 - np.clip(burn, 0, 1) * .35)[..., None]
    inlay(col, rough, metal, hgt, gilt, GOLD, .3, 13, seam=.2)
    hgt -= gilt * .25
    # wear: the leather is a touch lighter where hands rest (the near edge) and round the field
    return col, mmap(np.clip(rough, 0, 1), metal, hgt)
def leather_side():
    X, Y, Z, Ek = perimeter(W, W, E_RO, SH, SPX)
    h, w = X.shape; hs = h // 4
    A = np.concatenate([X[:hs], Y[hs:2 * hs], X[2 * hs:3 * hs], Y[3 * hs:]])
    col, hgt = leather(A, Z * 1.0 + 11, (34, 74, 51), 21)
    rough = np.full((h, w), .62, np.float32); metal = np.zeros((h, w), np.float32)
    m = blur((np.abs(Z + .09) < .007).astype(np.float32) + (np.abs(Z + .43) < .007).astype(np.float32), .6)   # two gilt lines
    inlay(col, rough, metal, hgt, m, GOLD, .3, 23, seam=.2)
    return col, mmap(rough, metal, hgt)

# ---------- khatam ----------
BONE = (236, 226, 202); EBONY = (26, 19, 16); ROSE = (104, 44, 26); GREEN_B = (58, 104, 80)
def khatam_band(d, x0, y0, x1, y1, layer):
    """draw one layer of a khatam band in the box (x0, y0)–(x1, y1) (horizontal; the vertical bands: drawn rotated by the caller).
       layer: 'brass' | 'bone' | 'ebony' | 'green' — the band is: brass edge · dogtooth (bone / ebony) · a row of six-pointed stars
       (each star: a brass outline, its twelve small triangles bone and ebony, a green hexagon in the middle) · dogtooth · brass edge"""
    Hh = y1 - y0; e = Hh * .07; dt = Hh * .14; mid0, mid1 = y0 + e + dt, y1 - e - dt
    if layer == 'brass':
        d.rectangle([P(x0, y0), P(x1, y0 + e)], fill=255); d.rectangle([P(x0, y1 - e), P(x1, y1)], fill=255)
    # dogtooth: triangles along both sides
    n = max(1, round((x1 - x0) / (dt * 1.2)))
    step = (x1 - x0) / n
    for k in range(n):
        a = x0 + k * step
        for (ya, yb, up) in [(y0 + e, y0 + e + dt, True), (y1 - e - dt, y1 - e, False)]:
            tri1 = [P(a, yb if up else ya), P(a + step, yb if up else ya), P(a + step / 2, ya if up else yb)]
            tri2 = [P(a + step / 2, ya if up else yb), P(a + step, yb if up else ya), P(a + step * 1.5, ya if up else yb)]
            if layer == 'bone': d.polygon(tri1, fill=255)
            if layer == 'ebony': d.polygon(tri2, fill=255)
    # stars
    R = (mid1 - mid0) / 2 * .98; cy = (mid0 + mid1) / 2; ns = max(1, round((x1 - x0) / (R * 1.85)))
    st = (x1 - x0) / ns
    for k in range(ns):
        cx = x0 + (k + .5) * st
        outer = [(cx + R * math.cos(math.pi / 6 * i - math.pi / 2), cy + R * math.sin(math.pi / 6 * i - math.pi / 2)) for i in range(12)]
        pts = []
        for i in range(12):
            rr = R if i % 2 == 0 else R * .577
            a = math.pi / 6 * i - math.pi / 2; pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
        hexr = R * .577 * .62
        hexa = [(cx + hexr * math.cos(math.pi / 3 * i - math.pi / 2), cy + hexr * math.sin(math.pi / 3 * i - math.pi / 2)) for i in range(6)]
        if layer == 'brass': d.polygon([P(*p) for p in pts], outline=255, width=max(1, round(R * .07 * PX * SS)))
        for i in range(12):   # twelve small triangles: from the centre to each pair of points
            tri = [P(cx, cy), P(*pts[i]), P(*pts[(i + 1) % 12])]
            if layer == ('bone' if i % 2 == 0 else 'ebony'): d.polygon(tri, fill=255)
        if layer == 'green': d.polygon([P(*p) for p in hexa], fill=255)
        if layer == 'brass': d.polygon([P(*p) for p in hexa], outline=255, width=max(1, round(R * .05 * PX * SS)))
        # the gaps between the stars: small brass rhombi
        if layer == 'brass' and k < ns - 1:
            gx = x0 + (k + 1) * st; rr = R * .22
            d.polygon([P(gx, cy - rr), P(gx + rr * .6, cy), P(gx, cy + rr), P(gx - rr * .6, cy)], fill=255)
def khatam_masks(a_out, a_in):
    """the band between a_out and a_in outside the field's edge, on all four sides (each side drawn in its own frame and rotated)"""
    layers = {}
    for layer in ('brass', 'bone', 'ebony', 'green'):
        tot = np.zeros((CW, CW), np.float32)
        L = S + 2 * a_out
        im = Image.new('L', (round(L * PX * SS), round((a_out - a_in) * PX * SS)), 0); d = ImageDraw.Draw(im)
        # draw in a local frame (origin at the band's corner); P() maps world units → pixels, so draw at (0..L, 0..bw)
        khatam_band(d, (a_out - a_in), 0, L - (a_out - a_in), a_out - a_in, layer)
        band = im
        big = Image.new('L', (CW * SS, CW * SS), 0)
        x0 = round((M - a_out) * PX * SS); y0 = x0; Lp = band.size[0]; bw = band.size[1]
        big.paste(band, (x0, y0))                                   # far
        big.paste(band.rotate(180), (x0, round((M + S + a_in) * PX * SS)))   # near
        side = band.rotate(90, expand=True)
        big.paste(side, (x0, y0))                                   # left
        big.paste(band.rotate(-90, expand=True), (round((M + S + a_in) * PX * SS), y0))   # right
        tot = done(big)
        layers[layer] = tot
    # the corners: a square of brass with a bone diamond (the bands meet there)
    im, d = canvas(); im2, d2 = canvas(); bw = a_out - a_in
    for cx, cy in [(M - a_out, M - a_out), (M + S + a_in, M - a_out), (M + S + a_in, M + S + a_in), (M - a_out, M + S + a_in)]:
        d.rectangle([P(cx, cy), P(cx + bw, cy + bw)], fill=255)
        c = (cx + bw / 2, cy + bw / 2); r = bw * .36
        d2.polygon([P(c[0], c[1] - r), P(c[0] + r, c[1]), P(c[0], c[1] + r), P(c[0] - r, c[1])], fill=255)
    cb, cbo = done(im), done(im2)
    for k in layers: layers[k] = layers[k] * (1 - cb)
    layers['brass'] = np.clip(layers['brass'] + cb - cbo, 0, 1); layers['bone'] = np.clip(layers['bone'] + cbo, 0, 1)
    return layers
def bone_col(X, Y, seed):
    t = f3(X, Y, np.zeros_like(X), .6, 3, .6, seed, 4); s = n3(X, Y, np.zeros_like(X), .01, .25, .01, seed + 3)
    k = 1 + (t - .5) * .08 + (s - .5) * .06
    return np.array(BONE, np.float32)[None, None, :] * k[..., None]
def khatam_top():
    X, Y = coords(); h = w = CW
    col = np.zeros((h, w, 3), np.float32); rough = np.full((h, w), .2, np.float32); metal = np.zeros((h, w), np.float32); hgt = np.zeros((h, w), np.float32)
    for i, sm in enumerate(strips()): lay(col, sm, wood_strip(X, Y, 'rose', i, 81 + i))
    R = np.random.default_rng(13); bone = bone_col(X, Y, 17)
    for f, r, sy, sx in tiles():
        if (f + r) % 2 == 0: col[sy, sx] = bone[sy, sx]
        else: col[sy, sx] = wood_tile(X[sy, sx], Y[sy, sx], 'rose', 300 + f * 9 + r, R)
    J = joints(.008); col *= (1 - J * .5)[..., None]; hgt -= J * .15
    # a thin ebony line round the field, then the khatam band in the frame, a plain rosewood rim outside it
    EB = np.array(EBONY, np.float32); lay(col, band_mask(.04, .0), EB); lay(col, band_mask(.03, .012), np.array(BONE, np.float32))
    K = khatam_masks(.62, .12)
    tiny = (vnoise(h, w, 2, 2, 5) - .5) * .1
    lay(col, K['bone'], bone * (1 + tiny[..., None]))
    lay(col, K['ebony'], EB * (1 + tiny[..., None] * 2))
    lay(col, K['green'], np.array(GREEN_B, np.float32) * (1 + tiny[..., None]))
    inlay(col, rough, metal, hgt, K['brass'], BRASS, .26, 19, seam=.25)
    allk = np.clip(K['bone'] + K['ebony'] + K['green'] + K['brass'], 0, 1)
    hgt -= np.clip(blur(allk, .7) - allk, 0, 1) * .3   # the hair seams between the tiny pieces
    return col, mmap(rough, metal, hgt)
def khatam_side():
    X, Y, Z, Ek = perimeter(W, W, E_RO, SH, SPX)
    h, w = X.shape; hs = h // 4; col = np.zeros((h, w, 3), np.float32)
    for k in range(4):
        sl = slice(k * hs, (k + 1) * hs)
        if k % 2 == 0: col[sl] = XF.wood3(Y[sl], X[sl], Z[sl], 'rose', dict(cx=M / 2 + .3 if k == 0 else W - M / 2 + .3, cz=-2.2, wob=.35), 81 + (0 if k == 0 else 2))
        else: col[sl] = XF.wood3(X[sl], Y[sl], Z[sl], 'rose', dict(cx=W - M / 2 + .3 if k == 1 else M / 2 + .3, cz=-2.2, wob=.35), 81 + (1 if k == 1 else 3))
    rough = np.full((h, w), .22, np.float32); metal = np.zeros((h, w), np.float32); hgt = np.zeros((h, w), np.float32)
    # a dogtooth band round the middle of the sides (bone / ebony between brass lines)
    A = np.concatenate([X[:hs], Y[hs:2 * hs], W - X[2 * hs:3 * hs], W - Y[3 * hs:]])
    zc = -.26; bh = .07; inb = np.abs(Z - zc) < bh / 2
    ph = (A / bh) % 1; zz = (Z - (zc - bh / 2)) / bh
    up = (zz < (1 - np.abs(ph * 2 - 1))).astype(np.float32)
    m_bone = blur((inb & (up > .5)).astype(np.float32), .5); m_eb = blur((inb & (up < .5)).astype(np.float32), .5)
    lay(col, m_bone, np.array(BONE, np.float32)); lay(col, m_eb, np.array(EBONY, np.float32))
    br = blur(((np.abs(Z - (zc - bh / 2 - .008)) < .008) | (np.abs(Z - (zc + bh / 2 + .008)) < .008)).astype(np.float32), .5)
    inlay(col, rough, metal, hgt, br, BRASS, .26, 29, seam=.2)
    return col, mmap(rough, metal, hgt)

BOARDS = {'marble': (marble_top, marble_side), 'walnut': (walnut_top, walnut_side), 'leather': (leather_top, leather_side), 'khatam': (khatam_top, khatam_side)}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    names = [a for a in sys.argv[1:] if not a.startswith('-')] or list(BOARDS)
    for n in names:
        top, side = BOARDS[n]
        c, m = top(); put('top-' + n, c, m)
        c, m = side(); put('side-' + n, c, m)
    if '--nomobile' not in sys.argv:
        import subprocess as _sp
        _sp.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mobile-tex.py')])

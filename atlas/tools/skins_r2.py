#!/usr/bin/env python3
"""Portal skins s41–s58 (R, remade 2026-11-20): new materials, each a seamless 1024 px tile shown at 512 css px.
Shares the helpers of atlas/tools/skins.py. Run from the repo root: python3 atlas/tools/skins_r2.py [id …]"""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from skins import *   # noqa: F401,F403  (helpers: fnoise, blurw, lerp, hexc, solid, grain, streaks, strokes, norm, smooth, voronoi, save, RNG …)

N = 1024
YY, XX = np.mgrid[0:N, 0:N].astype(np.float32)

def thread_noise(seed, axis, k=1.0):
    """per-thread brightness (one value per row / column) + slow variation along it"""
    return streaks(N, seed, axis) * k

def denim(seed=601):
    """light-wash denim: a 3/1 twill (diagonal ribs) of blue warp over white weft, faded unevenly, vertical slubs"""
    p = 6
    rib = np.sin(((XX + YY) % p) / p * math.pi) ** 1.2                 # the diagonal twill ribs
    warp = thread_noise(seed, 1)
    blue = lerp(hexc('#a9c1dc'), hexc('#8eabcd'), warp)
    img = lerp(hexc('#eef2f7'), blue, np.clip(.45 + rib * .55, 0, 1))
    fade = norm(blurw(fnoise(N, 3.4, seed + 3), 18))
    img = lerp(img, hexc('#dfe8f2'), np.clip(fade - .35, 0, 1) * .8)
    r = RNG(seed)
    sl = np.zeros((N, N), np.float32)
    for _ in range(90):   # short vertical slubs in the warp
        x = int(r.random() * N); y = int(r.random() * N); L = int(20 + r.random() * 70)
        rows = (np.arange(y, y + L) % N); sl[rows, x] = 1
    img = lerp(img, hexc('#e9eff6'), np.clip(blurw(sl, 1.2) * 1.2, 0, 1) * .25)
    return grain(img, .005, seed)

def tatami(seed=603):
    """tatami: rush stalks running across in rows, each a little different, weft stitches every 40 px"""
    row = 8
    ri = (YY // row).astype(int); ph = (YY % row) / row
    r = RNG(seed)
    tone = r.random(N // row + 1)[ri]
    stalk = np.sin(np.clip(ph, .05, .95) * math.pi) ** .45
    along = blurw(fnoise(N, 1.4, seed + 1, aniso=(1, .08)), 1)
    base = lerp(hexc('#e8e7c4'), hexc('#d6d8a6'), np.clip(tone * .55 + norm(along) * .45, 0, 1))
    img = base * (0.9 + 0.1 * stalk)[..., None]
    seam = blurw(((XX % 128) < 1.5).astype(np.float32), .9) * .8
    img = lerp(img, img * .93, seam)
    img = img * (0.985 + 0.03 * norm(blurw(fnoise(N, 3.0, seed + 4), 16)))[..., None]
    return grain(img, .004, seed)

def canvas(seed=605):
    """cotton canvas (帆布): a coarse plain weave you can see, natural ecru"""
    p = 8
    wx = np.sin((XX % p) / p * math.pi) ** .8; wy = np.sin((YY % p) / p * math.pi) ** .8
    over = (((XX // p) + (YY // p)) % 2).astype(np.float32)
    h = np.where(over > .5, wx, wy) * .75 + (wx * wy) * .25
    tone = thread_noise(seed, 0) * .5 + thread_noise(seed + 1, 1) * .5
    img = lerp(hexc('#e3d6bd'), hexc('#f6efe1'), np.clip(h * .8 + tone * .25 - .05, 0, 1))
    img = img * (0.985 + 0.03 * norm(blurw(fnoise(N, 3.0, seed + 2), 10)))[..., None]
    return grain(img, .004, seed)

def knit(seed=607):
    """stockinette knit: columns of soft V stitches, oatmeal wool"""
    cw, rh = 24, 18
    u = (XX % cw) / cw; v = (YY % rh) / rh
    # each stitch = two leaning loops meeting at the bottom centre
    left = np.exp(-((u - .27 - (v - .5) * .22) / .2) ** 2) ; right = np.exp(-((u - .73 + (v - .5) * .22) / .2) ** 2)
    loop = np.maximum(left, right) * (np.sin(v * math.pi) * .5 + .5)
    tone = RNG(seed).random((N // rh + 1, N // cw + 1))[(YY // rh).astype(int), (XX // cw).astype(int)]
    img = lerp(hexc('#ddd0bd'), hexc('#f4ece0'), np.clip(loop * .85 + tone * .1, 0, 1))
    fuzz = strokes(N, 30000, seed + 1, length=(3, 7), width=1, curl=1.5)
    img = lerp(img, hexc('#f7f1e8'), fuzz * .25)
    return grain(img, .005, seed)

def shoji(seed=609):
    """shoji: warm washi panes in a light kumiko lattice (squares of 128 px), the paper glowing softly"""
    paper = washi(N, base='#fbf8ef', fib='#ffffff', fib2='#efe8d8', seed=seed)
    cell = 128; w = 7
    bx = ((XX % cell) < w); by = ((YY % cell) < w)
    bar = (bx | by).astype(np.float32)
    grainw = blurw(streaks(N, seed + 1, 1) * bx + streaks(N, seed + 2, 0) * by, .6)
    wood = lerp(hexc('#e9d3ad'), hexc('#dcc193'), np.clip(grainw, 0, 1))
    edge = blurw(bar, 2.2) - bar                                       # a faint shadow round the bars
    img = paper * (1 - np.clip(edge, 0, 1) * .12)[..., None]
    img = lerp(img, wood, blurw(bar, .5))
    glow = norm(blurw(fnoise(N, 3.0, seed + 3), 14))
    img = img * (0.985 + 0.025 * glow)[..., None]
    return grain(img, .004, seed)

def cobble(seed=611):
    """pale cobblestones: evenly sized rounded stones, each a different soft grey, sand in the joints"""
    from scipy.spatial import cKDTree
    r = RNG(seed); P = r.random((300, 2)) * N
    yy, xx = YY.ravel(), XX.ravel(); q = np.stack([xx + .5, yy + .5], -1)
    for _ in range(4):   # Lloyd relaxation on the torus: stones of an even size
        _, idx = cKDTree(P, boxsize=N).query(q)
        ang = q / N * 2 * np.pi
        for c in range(2):
            sx = np.bincount(idx, np.cos(ang[:, c]), len(P)); sy = np.bincount(idx, np.sin(ang[:, c]), len(P))
            P[:, c] = (np.arctan2(sy, sx) / (2 * np.pi) * N) % N
    d, idx = cKDTree(P, boxsize=N).query(q, k=2)
    d1 = d[:, 0].reshape(N, N); d2 = d[:, 1].reshape(N, N); idx = idx[:, 0].reshape(N, N)
    e = d2 - d1
    inside = smooth(e, 5, 14)                                           # rounded stone edges
    pal = np.stack([hexc(c) for c in ('#e7e3db', '#dfdad0', '#ebe7e0', '#d9d3c8', '#e3ded4', '#eee9e1')])
    tone = pal[r.integers(0, len(pal), len(P))][idx]
    dome = smooth(e, 5, 50)
    img = tone * (0.95 + 0.06 * dome)[..., None] * (0.975 + 0.04 * fnoise(N, .9, seed + 1))[..., None]
    img = lerp(hexc('#d3cab8'), img, inside)
    return grain(img, .005, seed)

def bricks(seed=613, base=('#f4f1ec', '#ebe6de', '#f7f4ef'), mortar='#e0dad0', bw=128, bh=48):
    """painted white brick in running bond"""
    row = (YY // bh).astype(int); off = (row % 2) * (bw // 2)
    col = ((XX + off) // bw).astype(int)
    u = (XX + off) % bw; v = YY % bh
    r = RNG(seed); tone = r.random((N // bh + 2, N // bw + 2))
    pal = [hexc(c) for c in base]
    t = tone[row, col % (N // bw)]
    img = lerp(pal[1], pal[2], t)
    m = ((u < 6) | (v < 6)).astype(np.float32)
    img = img * (0.96 + 0.06 * norm(blurw(fnoise(N, 1.4, seed + 1), 1.2)))[..., None]
    img = lerp(img, hexc(mortar), blurw(m, 1.0))
    return grain(img, .006, seed)

def subway(seed=615):
    """white subway tiles (128×64, running bond), grout pale grey, a soft sheen on each"""
    bw, bh = 128, 64
    row = (YY // bh).astype(int); off = (row % 2) * (bw // 2)
    u = (XX + off) % bw; v = YY % bh
    edge = np.minimum(np.minimum(u, bw - u), np.minimum(v, bh - v))
    face = smooth(edge, 2, 9)
    sheen = np.exp(-((v / bh - .3) / .25) ** 2) * .03
    img = lerp(hexc('#e6e8ea'), hexc('#fbfbfa'), face)
    img = img + sheen[..., None]
    img = img * (0.99 + 0.015 * fnoise(N, 2.2, seed))[..., None]
    return grain(img, .004, seed)

def chalkboard(seed=617):
    """a green chalkboard: deep slate, old chalk wiped into soft smears"""
    img = solid(N, '#2f4a3e') * (0.96 + 0.08 * norm(blurw(fnoise(N, 3.2, seed), 14)))[..., None]
    smear = norm(blurw(fnoise(N, 2.4, seed + 1, aniso=(1, .35)), 6))
    img = lerp(img, hexc('#5f7a6e'), np.clip(smear - .55, 0, 1) * .55)
    dust = fnoise(N, .3, seed + 2)
    img = img * (0.97 + 0.06 * dust)[..., None]
    return grain(img, .007, seed)

def sudare(seed=619):
    """a bamboo blind: thin round slats with a node here and there, tied with thread every 256 px"""
    sl = 12
    ri = (YY // sl).astype(int); ph = (YY % sl) / sl
    slat = np.sin(np.clip(ph, .1, .9) * math.pi) ** .55
    r = RNG(seed); tone = r.random(N // sl + 1)[ri]
    base = lerp(hexc('#f0e2c0'), hexc('#e3cfa2'), tone)
    img = base * (0.84 + 0.16 * slat)[..., None]
    gap = (ph < .1) | (ph > .9)
    img = np.where(gap[..., None], hexc('#d6be8f'), img)
    nx = (r.random((N // sl + 1, 3)) * N)[ri]
    node = np.zeros((N, N), np.float32)
    for k_ in range(3): node = np.maximum(node, np.clip(1 - np.abs(((XX - nx[..., k_]) + N / 2) % N - N / 2) / 2.5, 0, 1))
    img = lerp(img, img * .86, node * slat)
    tie = blurw(((XX % 256) < 3).astype(np.float32), .6) * (np.sin(YY * math.pi / sl * 2) * .5 + .5)
    img = lerp(img, hexc('#9c7a4c'), tie * .6)
    return grain(img, .004, seed)

def rattan(seed=621):
    """cane webbing (籐): flat glossy strands — two straight, two diagonal — over a cream ground, octagonal holes"""
    p = 72
    def band(a, w): return np.clip((w - np.abs(((a % p) - p / 2))) / 1.2, 0, 1)
    h = band(YY, 5); v = band(XX, 5)
    d1 = band(XX + YY + 36, 4); d2 = band(XX - YY + 4096 + 36, 4)
    fib = blurw(streaks(N, seed, 0) * .5 + streaks(N, seed + 1, 1) * .5, .6)
    cane = lambda t: lerp(hexc('#dcbd84'), hexc('#f1dfb7'), np.clip(t, 0, 1))
    img = solid(N, '#f8f2e6')
    img = lerp(img, cane(.4 + fib * .4), d1); img = lerp(img, cane(.5 + fib * .4), d2)
    img = lerp(img, img * .9, blurw(np.maximum(h, v), 2) * (1 - np.maximum(h, v)) * .6)
    img = lerp(img, cane(.6 + fib * .4), np.maximum(h, v))
    return grain(img, .004, seed)

def corduroy(seed=623):
    """corduroy: soft vertical wales, dusty rose"""
    p = 10
    wale = np.sin((XX % p) / p * math.pi) ** .9
    pile = blurw(RNG(seed).standard_normal((N, N)).astype(np.float32), .6)
    img = lerp(hexc('#dcbcb6'), hexc('#f1dcd6'), np.clip(wale * .85 + pile * .05, 0, 1))
    img = img * (0.985 + 0.03 * norm(blurw(fnoise(N, 3.0, seed + 1), 12)))[..., None]
    return grain(img, .005, seed)

def tartan(seed=625):
    """a pale tartan: sett of soft sage, cream and a fine rose line, woven in 2/2 twill"""
    sett = [('#e9efe4', 96), ('#d7e3cf', 40), ('#e9efe4', 24), ('#f3d9da', 8), ('#e9efe4', 24), ('#d7e3cf', 40), ('#f7f4ec', 24)]
    tot = sum(w for _, w in sett)
    lut = []; [lut.extend([hexc(c)] * w) for c, w in sett]
    lut = np.stack(lut)
    cx = lut[(XX.astype(int) * tot // 256) % tot] if False else lut[(XX.astype(int)) % tot]
    cy = lut[(YY.astype(int)) % tot]
    tw = (((XX + YY) // 2) % 2).astype(np.float32)[..., None]
    img = cx * tw + cy * (1 - tw)
    img = (img + (cx + cy) / 2) / 2
    img = np.stack([blurw(img[..., c], .5) for c in range(3)], -1)
    return grain(img, .004, seed)

def tweed(seed=627):
    """herringbone tweed: zig-zag twill (columns of 64 px) in oatmeal, with coloured flecks"""
    p = 64
    col = (XX // p).astype(int)
    d = np.where(col % 2 == 0, XX + YY, XX - YY + 4096)
    rib = np.sin((d % 8) / 8 * math.pi) ** 1.5
    img = lerp(hexc('#d6cdbd'), hexc('#f1ebe0'), rib)
    fib = strokes(N, 26000, seed + 3, length=(3, 8), width=1, curl=1.2)
    img = lerp(img, hexc('#f6f2ea'), fib * .3)
    for s_, c in ((seed, '#b7a7d0'), (seed + 1, '#d8a596'), (seed + 2, '#9fbfa9')):
        fl = blurw((RNG(s_).random((N, N)) > .9985).astype(np.float32), .8)
        img = lerp(img, hexc(c), np.clip(fl * 3.5, 0, 1) * .5)
    return grain(img, .005, seed)

def terracotta(seed=629):
    """pale terracotta floor tiles (128 px squares, joints pale), handmade: each tile a little different"""
    c = 128
    i, j = (XX // c).astype(int), (YY // c).astype(int)
    u, v = XX % c, YY % c
    r = RNG(seed); tone = r.random((N // c, N // c))[j, i]
    img = lerp(hexc('#f4dcc8'), hexc('#ecc9ad'), tone)
    img = img * (0.96 + 0.07 * norm(blurw(fnoise(N, 2.2, seed + 1), 2.5)))[..., None]
    edge = np.minimum(np.minimum(u, c - u), np.minimum(v, c - v))
    img = img * (0.96 + 0.04 * smooth(edge, 2, 14))[..., None]
    img = lerp(hexc('#f3ece2'), img, smooth(edge, 2.5, 4))
    return grain(img, .005, seed)

def burlap(seed=631):
    """jute burlap: thick hairy threads of uneven width in an open plain weave"""
    p = 14
    r = RNG(seed)
    jx = blurw(r.standard_normal((1, N)).astype(np.float32).repeat(N, 0), 6) * 6
    jy = blurw(r.standard_normal((N, 1)).astype(np.float32).repeat(N, 1), 6) * 6
    wid_x = 3.6 + 1.6 * thread_noise(seed + 1, 1); wid_y = 3.6 + 1.6 * thread_noise(seed + 2, 0)
    tx = np.clip(1 - np.abs(((XX + jx) % p) - p / 2) / wid_x, 0, 1); ty = np.clip(1 - np.abs(((YY + jy) % p) - p / 2) / wid_y, 0, 1)
    over = (((XX // p) + (YY // p)) % 2).astype(np.float32)
    thread = np.where(over > .5, np.maximum(tx, ty * .85), np.maximum(ty, tx * .85))
    hair = strokes(N, 16000, seed + 3, length=(5, 16), width=1, curl=.8)
    jute = lerp(hexc('#d3bd92'), hexc('#e6d4ae'), np.clip(thread * .6 + thread_noise(seed + 4, 0) * .25 + hair * .3, 0, 1))
    img = lerp(hexc('#f2e9d6'), jute, smooth(thread, .05, .5))
    img = lerp(img, hexc('#e3cfa6'), hair * .25)
    return grain(img, .005, seed)

def seersucker(seed=633):
    """seersucker: puckered stripes of pale blue and white"""
    p = 48
    u = XX % p
    blue = (u < 22).astype(np.float32)
    puck = norm(blurw(fnoise(N, 2.0, seed, aniso=(1, .4)), 1.5))
    img = lerp(hexc('#fbfcfd'), hexc('#cfe0f0'), blurw(blue, 1))
    img = img * (0.96 + 0.06 * np.where(blue > .5, 1, puck))[..., None]
    weave = blurw((((XX + YY) % 3) < 1).astype(np.float32), .6)
    img = img * (0.99 + 0.012 * weave)[..., None]
    return grain(img, .004, seed)

def ajiro(seed=635):
    """網代 (ajiro): woven bamboo strips in a diagonal basket weave"""
    w = 24
    u = (XX + YY) / math.sqrt(2); v = (XX - YY) / math.sqrt(2)
    # 2-over-2 twill of diagonal strips (period kept on the 1024 grid: strips run at exactly 45°)
    a = ((XX + YY) // w).astype(int); b = ((XX - YY + 4096) // w).astype(int)
    over = ((a // 2 + b // 2) % 2).astype(np.float32)
    pa = ((XX + YY) % w) / w; pb = ((XX - YY + 4096) % w) / w
    strip = np.where(over > .5, np.sin(pa * math.pi) ** .4, np.sin(pb * math.pi) ** .4)
    fib = blurw(np.where(over > .5, streaks(N, seed, 0), streaks(N, seed + 1, 1)), .6)
    img = lerp(hexc('#dcc596'), hexc('#efe0bd'), np.clip(strip * .7 + fib * .3, 0, 1))
    img = img * np.where(over > .5, 1.0, .95)[..., None]
    return grain(img, .005, seed)

R2 = {'s41': denim, 's42': tatami, 's43': canvas, 's44': knit, 's45': shoji, 's46': cobble, 's47': bricks, 's48': subway,
      's49': chalkboard, 's50': sudare, 's51': rattan, 's52': corduroy, 's53': tartan, 's54': tweed, 's55': terracotta,
      's56': burlap, 's57': seersucker, 's58': ajiro}

if __name__ == '__main__':
    for i in (sys.argv[1:] or list(R2)):
        save(i, R2[i](), 'tile', q=78)

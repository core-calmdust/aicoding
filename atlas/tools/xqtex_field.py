# 3D solid textures for the xiangqi boards (2026-11-14 v3): one field per board, sampled on the top, on the round-over and
# on the four faces, so the grain runs on over every edge and corner (one piece of wood, no seam, no repeat).
import math, numpy as np
from xqtex_lib import smooth
def _hash(ix, iy, iz, seed):
    h = (ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791) ^ (seed * 2654435761)
    h = (h ^ (h >> 13)) * 1274126177; h = h ^ (h >> 16)
    return (h & 0xffffff).astype(np.float32) / 0xffffff
def n3(X, Y, Z, sx, sy, sz, seed):
    """value noise in world space, feature sizes sx, sy, sz"""
    x, y, z = X / sx, Y / sy, Z / sz
    ix, iy, iz = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64), np.floor(z).astype(np.int64)
    fx, fy, fz = x - ix, y - iy, z - iz
    fx, fy, fz = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy), fz * fz * (3 - 2 * fz)
    out = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (fx if dx else 1 - fx) * (fy if dy else 1 - fy) * (fz if dz else 1 - fz)
                out = out + w * _hash(ix + dx, iy + dy, iz + dz, seed)
    return out.astype(np.float32)
def f3(X, Y, Z, sx, sy, sz, seed, oct=4):
    s, a, t = 0, 1, 0
    for o in range(oct): s = s + a * n3(X, Y, Z, sx / 2 ** o, sy / 2 ** o, sz / 2 ** o, seed + o * 31); t += a; a *= .5
    return s / t
SP = {
  'walnut': dict(a=(132, 92, 62), b=(78, 52, 34), c=(56, 38, 30), rw=.07, pore=.45, fib=.16, streak=.35, tone=.22, late=(.78, .96), lc=.32),
  'hongmu': dict(a=(118, 50, 30), b=(66, 22, 13), c=(34, 11, 8), rw=.05, pore=.3, fib=.2, streak=.4, tone=.18, late=(.72, .95), lc=.42),
  'kaya':   dict(a=(236, 198, 136), b=(200, 150, 84), c=(180, 128, 66), rw=.045, pore=0, fib=.1, streak=0, tone=.16, late=(.62, .94), lc=.5),
}
def wood3(X, Y, Z, sp, P, seed, endk=None):
    """the grain runs along Y. P: cx, cz (the log's axis), tx, tz (its tilt), wob (how far it wanders), rwarp.
       endk: 0..1 where the surface is end grain (darker, the fibres seen end-on)"""
    S = SP[sp]
    cx = P['cx'] + P.get('tx', 0) * Y + (f3(X * 0, Y, Z * 0, 1, 2.6, 1, seed + 1, 3) - .5) * P.get('wob', .6)
    cz = P['cz'] + P.get('tz', 0) * Y
    r = np.sqrt((X - cx) ** 2 + (Z - cz) ** 2)
    r = r + (f3(X, Y, Z, .35, 2.2, .35, seed + 5, 4) - .5) * P.get('rwarp', .05)
    ph = r / S['rw']; ph = ph + np.sin(ph * .37 + seed) * 1.6 + np.sin(ph * .13 + seed * 2) * 2.4
    ph = ph + (f3(X, Y, Z, .6, 3, .6, seed + 9, 3) - .5) * 1.2
    t = ph % 1; lo, hi = S['late']
    late = smooth(lo, hi, t) * (1 - smooth(.965, 1, t)); late = late * .75 + smooth(.15, .97, t) * (1 - smooth(.965, 1, t)) * .35
    fib = (n3(X, Y, Z, .006, .5, .006, seed + 13) - .5) * 1.2 + (n3(X, Y, Z, .02, 1.4, .02, seed + 15) - .5) * .8
    tone = (f3(X, Y, Z, 1.2, 5, 1.2, seed + 17, 3) - .5) * 2
    v = .3 + late * S['lc'] + fib * S['fib'] + tone * S['tone']
    A, B = np.array(S['a'], np.float32), np.array(S['b'], np.float32)
    col = A + (B - A) * np.clip(v, 0, 1.2)[..., None]
    if S['streak'] > 0:
        st = f3(X, Y, Z, .12, 4, .12, seed + 19, 3); k = smooth(.62, .8, st) * S['streak']
        if endk is not None: k = k * (1 - endk)
        col = col * (1 - k[..., None]) + np.array(S['c'], np.float32) * k[..., None]
    if S['pore'] > 0:
        pn = n3(X, Y, Z, .006, .05, .006, seed + 23); pk = smooth(.74, .88, pn) * (1 - late * .7) * S['pore']
        col = col * (1 - pk[..., None] * .55)
    if endk is not None: col = col * (1 - endk[..., None] * .14)   # end grain drinks the finish: a shade darker
    return col
def jade3(X, Y, Z, seed):
    q = f3(X, Y, Z, 1.3, 1.3, 1.3, seed, 5); r = f3(X + q, Y - q, Z, .7, .8, .7, seed + 7, 5)
    A = np.array([46, 128, 84], np.float32); B = np.array([10, 66, 38], np.float32); C = np.array([168, 214, 182], np.float32); E = np.array([6, 40, 22], np.float32)
    t = smooth(.2, .8, r + (q - .5) * .5) * .38 + .22; col = A * (1 - t[..., None]) + B * t[..., None]
    milk = smooth(.5, .85, f3(X, Y, Z, 1, 1.3, 1, seed + 13, 5) + (q - .5) * .3); col = col * (1 - milk[..., None] * .22) + C * (milk[..., None] * .22)
    col *= (1 + (n3(X, Y, Z, .014, .014, .014, seed + 17) - .5) * .1)[..., None]
    v = np.abs(np.sin((f3(X, Y, Z, 2.5, 2.5, 2.5, seed + 19, 4) * 9 + (q - .5) * 3) * math.pi)); vein = (1 - smooth(0, .06, v)) * smooth(.4, .7, f3(X, Y, Z, 1.5, 1.5, 1.5, seed + 23, 3))
    col = col * (1 - vein[..., None] * .45) + E * (vein[..., None] * .45)
    col += (smooth(.82, .95, n3(X, Y, Z, .01, .01, .01, seed + 29)) * 22)[..., None] * np.array([.7, 1, .8], np.float32)
    em = smooth(.62, .8, f3(X, Y, Z, .8, .8, .8, seed + 31, 4)); col = col * (1 - em[..., None] * .35) + np.array([0, 96, 52], np.float32) * (em[..., None] * .35)
    return col
# ---- where the pixels are ----
def perimeter(W, D, e, side_h, spx, strip_w=2048):
    """the four faces as strips stacked top → bottom: far (Y=0, u = X/W), right (X=W, u = Y/D), near (Y=D, u = 1-X/W), left (X=0, u = 1-Y/D).
       Rows: distance from the top edge along the profile (over the round-over of radius e, then down the face).
       → X, Y, Z (h, w) arrays, endk (1 on the ends, 0 on the long sides)"""
    hs = round(side_h * spx); w = strip_w
    dist = (np.arange(hs, dtype=np.float32) + .5) / spx; uu = (np.arange(w, dtype=np.float32) + .5) / w
    th = np.minimum(dist / e, math.pi / 2); dIn = np.where(dist < e * math.pi / 2, e - e * np.sin(th), 0)
    Zr = np.where(dist < e * math.pi / 2, -e * (1 - np.cos(th)), -e - (dist - e * math.pi / 2))
    U, DI = np.meshgrid(uu, dIn); _, ZZ = np.meshgrid(uu, Zr)
    Xs, Ys, Zs, Es = [], [], [], []
    for k in range(4):
        if k == 0: X, Y, E = U * W, DI, 1
        elif k == 1: X, Y, E = W - DI, U * D, 0
        elif k == 2: X, Y, E = (1 - U) * W, D - DI, 1
        else: X, Y, E = DI, (1 - U) * D, 0
        Xs.append(X); Ys.append(Y); Zs.append(ZZ); Es.append(np.full_like(X, E) * smooth(.3 * e, e * math.pi / 2, np.meshgrid(uu, dist)[1]))
    return np.concatenate(Xs), np.concatenate(Ys), np.concatenate(Zs), np.concatenate(Es)

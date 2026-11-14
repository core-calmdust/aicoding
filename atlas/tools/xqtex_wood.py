# Wood faces for the xiangqi boards: one 3D ring field (log axis along the grain), cut by the top, the long sides and the ends.
import numpy as np
from xqtex_lib import vnoise, fbm, smooth, mixc
SP = {   # species: light / dark (earlywood, latewood), ring width (world units), pores, figure, streaks
  'walnut': dict(a=(140, 96, 64), b=(64, 41, 27), c=(46, 32, 27), rw=.075, pore=.5, fib=.22, streak=.5, tone=.3, late=(.8, .96), lc=.45),
  'hongmu': dict(a=(118, 50, 30), b=(58, 20, 12), c=(30, 10, 7), rw=.05, pore=.35, fib=.25, streak=.45, tone=.2, late=(.7, .95), lc=.5),
  'box': dict(a=(242, 220, 170), b=(216, 184, 124), c=(200, 160, 100), rw=.02, pore=0, fib=.12, streak=0, tone=.14, late=(.6, .95), lc=.3),
  'ebony': dict(a=(52, 40, 34), b=(16, 11, 9), c=(6, 4, 3), rw=.03, pore=.2, fib=.25, streak=.6, tone=.2, late=(.6, .95), lc=.4),
  'kaya':   dict(a=(232, 196, 136), b=(190, 140, 74), c=(160, 110, 56), rw=.05, pore=0, fib=.12, streak=.1, tone=.18, late=(.8, .96)),
}
def ring_field(X, Z, Y, pl, h, w, seed, fx, fy):
    """r: distance from the log axis; fx, fy: the noise feature scales (px) across / along the grain on this face"""
    cx = pl['cx'] + pl.get('tx', 0) * Y; cz = pl['cz'] + pl.get('tz', 0) * Y
    wob = (fbm(h, w, fy * 5, max(fx, fy) * 2, seed + 3, 3) - .5) * pl.get('warp', .3)   # the grain wanders
    r = np.sqrt(((X - cx) + wob) ** 2 + (Z - cz) ** 2)
    r = r + (fbm(h, w, fy * 1.5, max(fx * 8, 40), seed + 9, 4) - .5) * pl.get('rwarp', .035)
    return r
def wood(X, Y, Z, sp, pl, h, w, seed, along='y', endgrain=False):
    """colour (h, w, 3) float. along: which image axis the grain runs (top/side: y or x); endgrain: an end face"""
    S = SP[sp]
    if endgrain: fy, fx = 40, 40
    elif along == 'y': fy, fx = 160, 6
    else: fy, fx = 6, 160
    r = ring_field(X, Z, Y, pl, h, w, seed, fx, fy)
    rw = S['rw'] * pl.get('rk', 1)
    ph = r / rw; ph = ph + np.sin(ph * .37 + seed) * 1.6 + np.sin(ph * .13 + seed * 2) * 2.4   # rings of uneven width (a function of the ring, not the place)
    ph = ph + (fbm(h, w, fy * 3, max(fx * 20, 120), seed + 21, 3) - .5) * 1.6
    t = ph % 1
    lo, hi = S['late']; late = smooth(lo, hi, t) * (1 - smooth(.965, 1, t)); late = late * .75 + smooth(.15, .97, t) * (1 - smooth(.965, 1, t)) * .35
    # fibres: fine streaks along the grain; end grain: tiny dots
    if endgrain:
        fib = (vnoise(h, w, 1.6, 1.6, seed + 31) - .5) * 1.4
    else:
        sy, sx = (90, 1.3) if along == 'y' else (1.3, 90)
        fib = (vnoise(h, w, sy, sx, seed + 31) - .5) * 1.2 + (vnoise(h, w, sy * 3, sx * 4, seed + 33) - .5) * .8
    tone = (fbm(h, w, fy * 8, fx * 30 if not endgrain else 300, seed + 41, 3) - .5) * 2
    v = .3 + late * S.get('lc', .6) + fib * S['fib'] + tone * S['tone'] + pl.get('shade', 0)
    col = mixc(S['a'], S['b'], np.clip(v, 0, 1.2))
    # dark mineral / gum streaks along the grain (walnut, rosewood)
    if S['streak'] > 0 and not endgrain:
        sy, sx = (700, 14) if along == 'y' else (14, 700)
        st = fbm(h, w, sy, sx, seed + 51, 3); k = smooth(.6, .78, st) * S['streak']
        col = col * (1 - k[..., None]) + np.array(S['c'], np.float32) * k[..., None]
    # pores: dark dashes in the earlywood (dots on the end grain)
    if S['pore'] > 0:
        if endgrain: pn = vnoise(h, w, 1.2, 1.2, seed + 61)
        else: pn = vnoise(h, w, 9, 1.0, seed + 61) if along == 'y' else vnoise(h, w, 1.0, 9, seed + 61)
        pk = smooth(.74, .86, pn) * (1 - late * .7) * S['pore']
        col = col * (1 - pk[..., None] * .55)
    return col

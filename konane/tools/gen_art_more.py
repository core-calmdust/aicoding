# Kōnane art, part 2 (exec'd by gen_art.py: uses its helpers NB, bx, by, C, mix, noise, fbm, shade, Canvas, poly, dot, line,
# save_rgb, save_pc, rr, px_, py_, pc, PR, dome …). Boards: ocean, kona, stone, koa, mono, sunset, midnight; their frames; stone,
# glass and matte stone sets.


def soft(m, s):
    return gaussian_filter(m, s)


def paint(col, rgb, m, alpha=1.0):
    """lay a colour (an RGB or an image) through a 0..1 mask"""
    return mix(col, rgb, np.clip(m, 0, 1) * alpha)


def edge_of(m, s=2.5):
    """the darker rim a watercolour wash dries with"""
    return np.clip(m - gaussian_filter(m, s), 0, 1) * 2.2


Y01 = by / (NB - 1); X01 = bx / (NB - 1)


def vgrad(stops, t):
    """colour gradient: stops = [(pos, '#hex'), …] along t (0..1)"""
    out = np.zeros(t.shape + (3,))
    ps = [p for p, _ in stops]; cs = [C(c) for _, c in stops]
    t = np.clip(t, 0, 1)
    for k in range(len(ps) - 1):
        a, b = ps[k], ps[k + 1]
        w = np.clip((t - a) / max(1e-6, b - a), 0, 1)
        seg = (t >= a) & (t <= b) if k < len(ps) - 2 else (t >= a)
        out[seg] = (cs[k] * (1 - w[..., None]) + cs[k + 1] * w[..., None])[seg]
    out[t < ps[0]] = cs[0]
    return out


# ------------------------------------------------------------------------------------------- ocean (airbrushed ocean art)
def dolphin(d, P, ss, x, y, s, a, flip=1):
    """a bottlenose dolphin silhouette, beak at (x, y), body along angle a, length s"""
    ca, sa = math.cos(a), math.sin(a)
    def T(u, v): return (x + (u * ca - v * sa * flip) * s, y + (u * sa + v * ca * flip) * s)
    top, bot = [], []
    for k in range(61):
        u = k / 60
        if u < .08: wt, wb = .018 + .3 * u, .016 + .25 * u                               # the short beak
        elif u < .18: wt, wb = .042 + .45 * (u - .08), .036 + .3 * (u - .08)              # the rounded melon
        else: cq = max(0.0, math.cos((u - .18) / .82 * math.pi / 2)); wt, wb = .087 * cq ** .8 + .006, .066 * cq ** .7 + .005
        bend = .03 * math.sin(u * math.pi)
        top.append(T(u, -wt - bend)); bot.append(T(u, wb - bend))
    poly(d, P, top + bot[::-1])
    poly(d, P, [T(.4, -.1), T(.5, -.21), T(.52, -.2), T(.5, -.1), T(.6, -.07)])        # a small dorsal fin, swept back
    poly(d, P, [T(.26, .05), T(.36, .15), T(.38, .14), T(.33, .05)])                    # flipper
    poly(d, P, [T(.96, -.006), T(1.06, -.1), T(1.08, -.09), T(1.02, 0), T(1.08, .09), T(1.06, .1), T(.96, .006)])   # flukes


def honu(d, P, ss, x, y, s, a):
    ca, sa = math.cos(a), math.sin(a)
    def T(u, v): return (x + (u * ca - v * sa) * s, y + (u * sa + v * ca) * s)
    pts = [T(.5 * math.cos(t), .38 * math.sin(t)) for t in np.linspace(0, 2 * math.pi, 40)]
    poly(d, P, pts)
    pts = [T(.62 + .13 * math.cos(t), .1 * math.sin(t)) for t in np.linspace(0, 2 * math.pi, 24)]; poly(d, P, pts)   # head
    for sgn in (-1, 1):
        poly(d, P, [T(.25, sgn * .3), T(.1, sgn * .72), T(-.05, sgn * .62), T(.05, sgn * .3)])     # front flippers
        poly(d, P, [T(-.32, sgn * .25), T(-.52, sgn * .42), T(-.5, sgn * .2)])                      # back flippers


def ocean_board():
    hz = .2                                                     # the horizon
    sky = vgrad([(0, '#2a1c5e'), (.45 * hz / .2 * .2 / 1, '#7a2f86'), (hz * .8, '#e2577e'), (hz, '#ffb26a')], Y01 / 1.0)
    sea = vgrad([(hz, '#3fd0d4'), (.34, '#1aa2c4'), (.6, '#0d5f9e'), (.85, '#0a3a78'), (1, '#071f4f')], Y01)
    col = np.where((Y01 < hz)[..., None], sky, sea)
    # the sun sinking into the horizon, its glow and its golden road on the water
    sx, sy, sr = .5, hz, .085
    dsun = np.hypot(X01 - sx, (Y01 - sy) * 1.0)
    glow = np.exp(-(dsun / .16) ** 2)
    col = col + np.array([255, 170, 110]) * (glow * .45 * (Y01 < hz))[..., None]
    sun = np.clip((sr - dsun) / .004, 0, 1) * (Y01 < hz)
    col = paint(col, vgrad([(hz - sr, '#fff4c4'), (hz, '#ffc070')], Y01), sun)
    road = np.exp(-((X01 - sx) / (.03 + (Y01 - hz) * .5)) ** 2) * np.clip(1 - (Y01 - hz) / .07, 0, 1) * (Y01 >= hz)
    ripple = np.sin(Y01 * 900 + noise((NB, NB), 3, 2)) * .5 + .5
    col = col + np.array([255, 210, 140]) * (road * ripple * .8)[..., None]
    # a thin bright surface line, seen from below
    col = col + np.array([200, 255, 250]) * (np.exp(-((Y01 - hz - .004) / .004) ** 2) * .6)[..., None]
    # sunbeams fanning down through the water
    ang_ = np.arctan2(Y01 - hz + .05, X01 - sx)
    beams = (np.sin(ang_ * 26 + noise((NB, NB), 120, .25)) * .5 + .5) ** 6 * np.clip(1 - (Y01 - hz) / .65, 0, 1) * (Y01 > hz)
    col = col + np.array([190, 255, 245]) * (gaussian_filter(beams, 3) * .22)[..., None]
    # caustics: bright wavy net, strongest near the surface
    c1 = np.abs(fbm((NB, NB), [(9, 1), (4, .4)])); c2 = np.abs(fbm((NB, NB), [(13, 1), (5, .4)]))
    caus = np.exp(-(c1 / .1) ** 2) * .6 + np.exp(-(c2 / .09) ** 2) * .4
    col = col + np.array([180, 255, 250]) * (caus * np.clip(1 - (Y01 - hz) / .3, 0, 1) ** 1.5 * (Y01 > hz) * .2)[..., None]
    # silhouettes: two dolphins and a honu, coral at the bottom
    cv = Canvas(NB, 2)
    md = cv.mask(lambda d, P, ss: (dolphin(d, P, ss, 120, 330, 320, -.18), dolphin(d, P, ss, 820, 460, 260, math.pi + .3, -1)), 1.2)
    mj = cv.mask(lambda d, P, ss: dolphin(d, P, ss, 690, 70, 210, math.pi * .82, -1), 1.0)   # one leaping against the sunset
    mt = cv.mask(lambda d, P, ss: honu(d, P, ss, 300, 760, 170, -.5), 1.2)
    def reef(d, P, ss):
        for k in range(26):
            x = rng.uniform(-20, NB + 20); h_ = rng.uniform(40, 120); w_ = rng.uniform(30, 80)
            for j in range(5):
                a = -math.pi / 2 + (j - 2) * .35 + rng.normal(0, .1); L_ = h_ * rng.uniform(.6, 1)
                line(d, P, ss, [(x, NB + 4), (x + math.cos(a) * L_ * .5, NB - math.sin(-a) * L_ * .5), (x + math.cos(a) * L_, NB - math.sin(-a) * L_)], rng.uniform(6, 12))
            dot(d, P, ss, x, NB - h_ * .3, w_ * .35)
    mr = cv.mask(reef, 1.5)
    depth_fade = np.clip(1 - (Y01 - .3) * .4, .5, 1)
    col = paint(col, col * .45 + np.array([4, 30, 60]) * .55, md * .8)
    col = col + np.array([150, 230, 255]) * (np.clip(md - gaussian_filter(md, 3), 0, 1) * .5 * (by < np.roll(by, 0)) )[..., None]   # (no rim light)
    col = paint(col, col * .5 + np.array([10, 50, 60]) * .5, mt * .75)
    col = paint(col, np.array([40, 14, 50]), mj * .85)
    col = paint(col, np.array([40, 16, 70]) * .8 + col * .2, mr * .85)
    # bubbles rising
    cvb = Canvas(NB, 2)
    def bub(d, P, ss):
        for k in range(70):
            x = rng.uniform(0, NB); y = rng.uniform(NB * .26, NB * .95); r = rng.uniform(2, 9)
            cx_, cy_ = P(x, y); d.ellipse([cx_ - r * ss, cy_ - r * ss, cx_ + r * ss, cy_ + r * ss], outline=255, width=max(1, int(1.6 * ss)))
    mb = cvb.mask(bub, .6)
    col = col + np.array([220, 255, 255]) * (mb * .5)[..., None]
    # a soft vignette and airbrush grain
    vig = np.clip(1 - (np.hypot(X01 - .5, Y01 - .55) / .8) ** 2.4, 0, 1)
    col = col * (.72 + .28 * vig)[..., None] * depth_fade[..., None] ** .2
    col = col * (1 + noise((NB, NB), .6, .02)[..., None])
    save_rgb(col, 'bd-ocean.webp')


# ------------------------------------------------------------------------------------------- kona (gallery watercolour)
def petal_fan(cx, cy, R, a, spread, ruffle, rng_):
    pts = [(cx, cy)]
    for k in range(25):
        u = k / 24; t = a + (u - .5) * spread
        r_ = R * (.82 + .18 * math.sin(u * math.pi) ** .5) * (1 + ruffle * math.sin(u * 7 * math.pi + rng_))
        pts.append((cx + math.cos(t) * r_, cy + math.sin(t) * r_))
    return pts


def kona_board():
    paper = C('#f6eedd')
    fib = noise((NB, NB), .7, 1) * .5 + noise((NB, NB), 3, 1) * .5
    col = paper * (1 + .025 * fib[..., None])
    # loose background washes: coral sunset at the top left, sea turquoise at the bottom right, a little mango
    for (x, y, r, c, a) in ((.12, .1, .45, '#f7a38a', .35), (.9, .95, .55, '#7fd3cf', .38), (.85, .2, .3, '#f8d27a', .25), (.15, .9, .3, '#b9e0a8', .22)):
        w = np.exp(-((np.hypot(X01 - x, Y01 - y) / r) ** 2)) * (0.8 + .4 * fbm((NB, NB), [(40, .6), (12, .3)]))
        col = paint(col, C(c), w * a)
    def wash(col, m, c_in, c_out, cx=None, cy=None, R=1.0, edge=.5):
        if cx is not None:
            t = np.clip(np.hypot(bx - cx, by - cy) / R, 0, 1)[..., None]
            rgb = C(c_in) * (1 - t) + C(c_out) * t
        else: rgb = C(c_in)
        tex = (1 + .06 * fbm((NB, NB), [(6, .6), (2, .4)]))[..., None]
        col = paint(col, rgb * tex, m * .92)
        return paint(col, rgb * .7, edge_of(m) * edge)
    # monstera leaves (bottom right, left edge)
    def leaf_pts(x, y, R, a):
        """a heart-shaped monstera leaf, stem at (x, y), pointing along a"""
        ca, sa = math.cos(a), math.sin(a)
        pts = []
        for k in range(73):
            t = k / 72 * 2 * math.pi
            hx = 16 * math.sin(t) ** 3; hy = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
            u, v = (5 - hy) / 22 * R, hx / 18 * R                       # along / across the leaf (the notch at the stem)
            pts.append((x + u * ca - v * sa, y + u * sa + v * ca))
        return pts
    def cuts(d, P, ss, x, y, R, a):
        ca, sa = math.cos(a), math.sin(a)
        T = lambda u, v: (x + u * ca - v * sa, y + u * sa + v * ca)
        for sgn in (-1, 1):
            for k in range(5):
                u0 = R * (.22 + .17 * k); w0 = R * (.05 + .015 * k)
                poly(d, P, [T(u0, sgn * R * .48), T(u0 + R * .1, sgn * R * 1.2), T(u0 + R * .15, sgn * R * 1.2), T(u0 + w0 * .6, sgn * R * .48)])
            for k in range(3):
                u0 = R * (.32 + .22 * k); dot(d, P, ss, *T(u0 + R * .08, sgn * R * .3), R * .04)
    cv = Canvas(NB, 2)
    for (x, y, R, a) in ((1080, 1060, 330, -2.35), (-60, 560, 260, -.15)):
        m = np.clip(cv.mask(lambda d, P, ss: poly(d, P, leaf_pts(x, y, R, a)), 1.0) - cv.mask(lambda d, P, ss: cuts(d, P, ss, x, y, R, a), 1.0), 0, 1)
        col = wash(col, m, '#4aa564', '#1d6c46', x + math.cos(a) * R * .5, y + math.sin(a) * R * .5, R * .9)
        vein = cv.mask(lambda d, P, ss: line(d, P, ss, [(x, y), (x + math.cos(a) * R * 1.15, y + math.sin(a) * R * 1.15)], 4), .8)
        col = paint(col, C('#a6dca0'), vein * m * .5)
    # hibiscus (top left, big; another at the right edge)
    for (x, y, R, rot, cin, cout) in ((150, 140, 210, .3, '#9e0f2e', '#ff5a5f'), (1000, 420, 130, 2.1, '#b5124a', '#ff7d8f'), (520, 1010, 110, 4.4, '#c43a12', '#ffa04a')):
        m = cv.mask(lambda d, P, ss: [poly(d, P, petal_fan(x, y, R, rot + k * 2 * math.pi / 5, 1.5, .05, k * 1.7)) for k in range(5)], 1.0)
        col = wash(col, m, cin, cout, x, y, R, .8)
        # petal creases and the long stamen
        cr = cv.mask(lambda d, P, ss: [line(d, P, ss, [(x, y), (x + math.cos(rot + k * 2 * math.pi / 5 + .5) * R * .85, y + math.sin(rot + k * 2 * math.pi / 5 + .5) * R * .85)], 2.5) for k in range(5)], 1.2)
        col = paint(col, C(cin) * .8, cr * m * .5)
        sa = rot + 1.0
        st = cv.mask(lambda d, P, ss: (line(d, P, ss, [(x, y), (x + math.cos(sa) * R * 1.05, y + math.sin(sa) * R * 1.05)], R * .035)), .8)
        col = paint(col, C('#e8c23a'), st)
        sd = cv.mask(lambda d, P, ss: [dot(d, P, ss, x + math.cos(sa) * R * (.85 + .2 * k / 6) + math.cos(sa + 1.57) * R * .05 * math.sin(k * 2.3), y + math.sin(sa) * R * (.85 + .2 * k / 6) + math.sin(sa + 1.57) * R * .05 * math.cos(k * 1.7), R * .03) for k in range(7)], .6)
        col = paint(col, C('#ffd23a'), sd)
    # plumeria clusters
    def plumeria(d, P, ss, x, y, r, rot):
        for k in range(5):
            a = rot + k * 2 * math.pi / 5
            pts = [(x, y)]
            for j in range(25):
                u = j / 24; t = a + (u - .5) * 1.05
                rr_ = r * (.3 + .7 * math.sin(u * math.pi) ** .55)
                pts.append((x + math.cos(t + .3) * rr_, y + math.sin(t + .3) * rr_))
            poly(d, P, pts)
    for (x, y, r, rot) in ((860, 110, 70, .3), (950, 200, 55, 1.2), (780, 190, 48, 2.0), (110, 930, 66, .9), (215, 850, 50, 1.9), (480, 60, 40, .5)):
        m = cv.mask(lambda d, P, ss: plumeria(d, P, ss, x, y, r, rot), .9)
        col = wash(col, m, '#ffd04a', '#fffaf0', x, y, r * .7, .35)
    # paper grain over all, a faint deckle vignette
    vig = np.clip(1 - (np.maximum(np.abs(X01 - .5), np.abs(Y01 - .5)) / .5) ** 8, 0, 1)
    col = col * (.93 + .07 * vig)[..., None] * (1 + .02 * fib[..., None])
    save_rgb(col, 'bd-kona.webp')


# ------------------------------------------------------------------------------------------- stone (primitive papamū)
def basalt(shape, wrap=False, seed_scale=1.0):
    big = fbm(shape, [(140, 1.0), (50, .6)], wrap)
    mid = fbm(shape, [(14, 1.0), (5, .5)], wrap)
    fine = noise(shape, .8, 1, wrap)
    ves = np.clip(noise(shape, 1.6, 1, wrap) - 1.9, 0, 1.5)              # a few small vesicles
    return big, mid, fine, ves


def stone_board():
    big, mid, fine, ves = basalt((NB, NB))
    alb = mix(C('#5b5751'), C('#7d776e'), .5 + .22 * big + .1 * mid)
    ochre = np.clip(fbm((NB, NB), [(60, 1), (20, .5)]) - .6, 0, 1)
    alb = mix(alb, C('#8a7258'), ochre * .55)                             # iron weathering
    lich = np.clip(fbm((NB, NB), [(18, 1), (6, .5)]) - 1.35, 0, 1)
    alb = mix(alb, C('#b9b494'), lich * .6)                               # pale lichen spots
    alb = alb * (1 - .45 * np.clip(ves, 0, 1))[..., None] * (1 + .05 * fine[..., None])
    # the rock is not flat: a gentle swell, worn smoother where hands rest (the middle)
    swell = fbm((NB, NB), [(220, 1.0)]) * 8
    wear = np.exp(-(np.hypot(X01 - .5, Y01 - .5) / .45) ** 2)
    h = swell + big * 3 + mid * (1.2 - .7 * wear) + fine * .35 * (1 - .6 * wear) - ves * 1.4
    col = shade(gaussian_filter(h, 1.0), alb, gloss=12, spec=.06 + .08 * 0, amb=.62)
    col = col * (1 + .05 * wear[..., None])
    vig = np.clip(1 - (np.maximum(np.abs(X01 - .5), np.abs(Y01 - .5)) / .5) ** 6, 0, 1)
    col = col * (.82 + .18 * vig)[..., None]
    save_rgb(col, 'bd-stone.webp')


# ------------------------------------------------------------------------------------------- koa (a wooden papamū, as made today)
def koa_slab(N, seed, light, mid, dark, pore, grain=1.0):
    """a slab of koa seen along the grain (the same method as fanorona/tools/gen_wood.py): long flowing streaks, dark
    heartwood bands, fine fibres and pore dashes, a soft oiled sheen — seamless (wrap)"""
    r_ = np.random.default_rng(seed)
    def nz(sy, sx):
        n = gaussian_filter(r_.standard_normal((N, N)), (sy, sx), mode='wrap'); return n / (n.std() + 1e-9)
    light, mid, dark, pore = (C(c) for c in (light, mid, dark, pore))
    y, x = np.mgrid[0:N, 0:N].astype(float)
    dy = nz(70, 280) * 20 + nz(18, 110) * 4
    warp = lambda a: map_coordinates(a, [np.mod(y + dy, N), x], order=1, mode='grid-wrap')
    st = warp(nz(1.0 * grain, 60) * .35 + nz(3 * grain, 160) * .55 + nz(10 * grain, 420) * .8)
    hw = warp(nz(24 * grain, 600) + .45 * nz(7 * grain, 240))
    band = np.clip((hw - .15) / .95, 0, 1); band = band * band * (3 - 2 * band)
    fib = warp(nz(.45, 18)) * .5 + warp(nz(.7, 46)) * .5
    t = np.clip(.42 + .17 * st + .07 * fib, 0, 1)[..., None]
    base = np.where(t < .5, light + (mid - light) * (t / .5), mid + (dark - mid) * ((t - .5) / .5))
    img = base * (1 - .62 * band[..., None]) + dark * .62 * band[..., None]
    edge = np.exp(-((hw - .55) / .07) ** 2) * .3
    img = img * (1 - edge[..., None]) + pore * edge[..., None]
    pr = (r_.random((N, N)) > .9962).astype(float)
    pr = np.clip(warp(gaussian_filter(pr, (.45, 3.5), mode='wrap') * 10), 0, 1) * .55
    img = img * (1 - pr[..., None]) + pore * pr[..., None]
    # koa's chatoyance: a faint ripple across the grain that catches the light
    curl = np.sin(x / 7 + warp(nz(20, 20)) * 2) * .5 + .5
    return img * (1 + .05 * nz(90, 220)[..., None]) * (.97 + .05 * curl[..., None])


def koa_board():
    img = koa_slab(NB, 41, '#d99c5a', '#a8622e', '#4e2410', '#2a1206')
    sap = np.exp(-((Y01 - .05 - .02 * np.sin(X01 * 5)) / .045) ** 2) + np.exp(-((Y01 - .955 + .015 * np.sin(X01 * 4 + 1)) / .035) ** 2)
    img = mix(img, img * .35 + C('#e2c08e') * .65, np.clip(sap, 0, 1) * .8)   # pale sapwood streaks at the edges (as on the boards made today)
    img = img * (1 + .06 * sheen[..., None])
    save_rgb(img, 'bd-koa.webp')


# ------------------------------------------------------------------------------------------- modern
def mono_board():
    g = noise((NB, NB), .6, 1) * .5 + noise((NB, NB), 4, 1) * .5
    alb = mix(C('#dcd8d1'), C('#e7e3dc'), .5 + .2 * fbm((NB, NB), [(200, 1)])) * (1 + .012 * g[..., None])
    col = shade(np.zeros((NB, NB)) + g * .05, alb, gloss=8, spec=.02, amb=.86)
    # a hairline inset square and tiny corner ticks
    cv = Canvas(NB, 3)
    m = cv.mask(lambda d, P, ss: [line(d, P, ss, pts, 1.6) for pts in ([(28, 28), (NB - 28, 28), (NB - 28, NB - 28), (28, NB - 28), (28, 28)],)], .4)
    col = paint(col, C('#3a3a3c'), m * .35)
    save_rgb(col, 'bd-mono.webp')


def sunset_board():
    t = np.clip((X01 * .55 + Y01 * .85) / 1.4, 0, 1)
    col = vgrad([(0, '#ffb07a'), (.3, '#ff7f7a'), (.55, '#e8579a'), (.8, '#8f4fd0'), (1, '#46309a')], t)
    # one big soft sun, a second, cooler circle — flat, poster-like
    for (x, y, r, c, a) in ((.68, .32, .27, '#ffe3a6', .55), (.24, .78, .2, '#b886ff', .28)):
        dd = np.hypot(X01 - x, Y01 - y)
        col = paint(col, C(c), np.clip((r - dd) / .003, 0, 1) * a)
    # horizontal stripes cut through the sun (retro-modern)
    stripes = ((np.floor((Y01 - .3) / .028) % 2) == 1) & (Y01 > .38) & (np.hypot(X01 - .68, Y01 - .32) < .27)
    col = paint(col, vgrad([(0, '#ffb07a'), (.3, '#ff7f7a'), (.55, '#e8579a'), (.8, '#8f4fd0'), (1, '#46309a')], t), stripes * 1.0)
    col = col * (1 + noise((NB, NB), .7, .025)[..., None])
    save_rgb(col, 'bd-sunset.webp')


def niho(d, P, ss, x0, y0, x1, y1, size, up=True):
    """a row of niho manō (shark-tooth) triangles along a straight line"""
    L_ = math.hypot(x1 - x0, y1 - y0); n = int(L_ // size); ux, uy = (x1 - x0) / L_, (y1 - y0) / L_; nx, ny = -uy, ux
    for k in range(n):
        ax, ay = x0 + ux * k * size, y0 + uy * k * size; bx_, by_ = ax + ux * size, ay + uy * size
        mx, my = (ax + bx_) / 2 + nx * size * .8 * (1 if up else -1), (ay + by_) / 2 + ny * size * .8 * (1 if up else -1)
        poly(d, P, [(ax, ay), (bx_, by_), (mx, my)])


def midnight_board():
    g = noise((NB, NB), .6, 1)
    col = mix(C('#0f1c36'), C('#16294d'), .5 + .25 * fbm((NB, NB), [(180, 1)])) * (1 + .03 * g[..., None])
    # simple: only a fine double gold line round the field
    cv = Canvas(NB, 3)
    o = 22
    band = cv.mask(lambda d, P, ss: [line(d, P, ss, [(a, a), (NB - a, a), (NB - a, NB - a), (a, NB - a), (a, a)], w) for a, w in ((o, 2.2), (o + 9, 1))], .5)
    gold = vgrad([(0, '#f1d48e'), (.5, '#c99a4c'), (1, '#f1d48e')], (X01 + Y01) / 2)
    col = paint(col, gold, band * .85)
    save_rgb(col, 'bd-midnight.webp')


# ------------------------------------------------------------------------------------------- frames (seamless 512 tiles)
def frames_more():
    S = (NF, NF); yy, xx = np.mgrid[0:NF, 0:NF].astype(float)
    # ocean: a deep night sea with luminous ripples and star glints
    r1 = np.abs(fbm(S, [(26, 1), (10, .4)], True)); r2 = np.abs(fbm(S, [(40, 1), (14, .4)], True))
    col = mix(C('#0a2d63'), C('#0d4c86'), .5 + .25 * fbm(S, [(90, 1)], True))
    col = col + np.array([120, 230, 255]) * (np.exp(-(r1 / .09) ** 2) * .35 + np.exp(-(r2 / .07) ** 2) * .25)[..., None]
    glint = np.clip(noise(S, .5, 1, True) - 3.0, 0, 1)
    col = col + np.array([255, 255, 255]) * (gaussian_filter(glint, .8, mode='wrap') * 4)[..., None]
    save_rgb(col, 'fr-ocean.webp')
    # kona: deep tropical green with painted leaf shapes and a few plumeria
    col = mix(C('#123f2e'), C('#1d5a3f'), .5 + .3 * fbm(S, [(60, 1)], True))
    cv = Canvas(NF, 2, wrap=True)
    def leaves(d, P, ss):
        for (x, y, a, L_) in ((60, 80, .6, 150), (300, 40, 2.2, 170), (420, 300, 4.0, 160), (150, 380, 5.1, 150), (250, 220, 1.2, 120)):
            pts = []
            for k in range(31):
                u = k / 30; w = math.sin(u * math.pi) * L_ * .22
                pts.append((x + math.cos(a) * u * L_ - math.sin(a) * w, y + math.sin(a) * u * L_ + math.cos(a) * w))
            for k in range(30, -1, -1):
                u = k / 30; w = math.sin(u * math.pi) * L_ * .22
                pts.append((x + math.cos(a) * u * L_ + math.sin(a) * w, y + math.sin(a) * u * L_ - math.cos(a) * w))
            poly(d, P, pts)
    m = cv.mask(leaves, 1.0)
    col = paint(col, C('#2f7a4f') * (1 + .08 * fbm(S, [(5, 1)], True))[..., None], m * .85)
    col = paint(col, C('#0d3324'), np.clip(m - gaussian_filter(m, 2, mode='wrap'), 0, 1) * 1.5)
    def flowers(d, P, ss):
        for (x, y, r, rot) in ((470, 120, 26, .4), (40, 260, 22, 1.4), (330, 450, 24, 2.3)):
            for k in range(5):
                a = rot + k * 2 * math.pi / 5; pts = [(x, y)]
                for j in range(19):
                    u = j / 18; t = a + (u - .5) * 1.05; rr_ = r * (.3 + .7 * math.sin(u * math.pi) ** .55)
                    pts.append((x + math.cos(t) * rr_, y + math.sin(t) * rr_))
                poly(d, P, pts)
    mf = cv.mask(flowers, .8)
    col = paint(col, C('#fff6e6'), mf)
    col = paint(col, C('#ffd24a'), mf * np.clip(1 - np.minimum.reduce([np.hypot(((xx - x + 256) % 512) - 256, ((yy - y + 256) % 512) - 256) for x, y in ((470, 120), (40, 260), (330, 450))]) / 14, 0, 1))
    col = col * (1 + .03 * noise(S, .7, 1, True)[..., None])
    save_rgb(col, 'fr-kona.webp')
    # stone: darker rough basalt
    big, mid, fine, ves = basalt(S, True)
    alb = mix(C('#3f3c38'), C('#5c5750'), .5 + .25 * big + .1 * mid) * (1 - .45 * np.clip(ves, 0, 1))[..., None]
    h = big * 4 + mid * 1.6 + fine * .4 - ves * 1.5
    save_rgb(shade(gaussian_filter(h, 1.0, mode='wrap'), alb, gloss=10, spec=.05, amb=.6, wrap=True), 'fr-stone.webp')
    # koa: the board's edge, darker oiled koa
    save_rgb(koa_slab(NF, 43, '#9a5a2c', '#6e3818', '#341608', '#1c0a03', .7), 'fr-koa.webp')
    # modern: charcoal felt-matte / indigo grain / plain navy
    g = noise(S, .6, 1, True)
    save_rgb(mix(C('#2a2a2d'), C('#323236'), .5 + .3 * fbm(S, [(80, 1)], True)) * (1 + .02 * g[..., None]), 'fr-mono.webp')
    save_rgb(mix(C('#2b1f5c'), C('#3a2a72'), .5 + .3 * fbm(S, [(80, 1)], True)) * (1 + .03 * g[..., None]), 'fr-sunset.webp')
    col = mix(C('#0a1428'), C('#0f1d38'), .5 + .3 * fbm(S, [(80, 1)], True)) * (1 + .03 * g[..., None])
    save_rgb(col, 'fr-midnight.webp')


# ------------------------------------------------------------------------------------------- stone sets
def pebble_alpha(seed, amp=.035):
    """a pebble outline: a circle gently pushed in and out (the image stays round, the stone does not)"""
    th = np.arctan2(py_ - pc, px_ - pc)
    r_edge = 1 - amp * (1 + np.sin(th * 2 + seed) * .6 + np.sin(th * 3 + seed * 1.7) * .4) / 2
    q = rr / r_edge
    return q, np.clip((1 - q) * PR / 1.2, 0, 1)


def stone_piece():
    # black: a water-worn basalt pebble — smooth, satin, a faint grey cloud (no pores)
    q, a = pebble_alpha(1.3)
    h = np.sqrt(np.clip(1 - q ** 2, 0, 1)) * 34 + fbm((NP, NP), [(30, 1)]) * .8
    alb = mix(C('#1e1d1c'), C('#3a3734'), .35 + .18 * fbm((NP, NP), [(40, 1), (14, .4)]))
    col = shade(gaussian_filter(h, 1.0), alb, gloss=26, spec=.2, amb=.58)
    save_pc(col, 'pc-stone-b.webp', .2, a)
    # white: a smooth bleached-coral beach stone — chalky white, soft warm cloud (no holes)
    q, a = pebble_alpha(4.1)
    h = np.sqrt(np.clip(1 - q ** 2, 0, 1)) * 32 + fbm((NP, NP), [(30, 1)]) * .8
    alb = mix(C('#ece6da'), C('#f8f4ec'), .55 + .2 * fbm((NP, NP), [(40, 1), (14, .4)]))
    col = shade(gaussian_filter(h, 1.0), alb, gloss=14, spec=.07, amb=.66)
    save_pc(col, 'pc-stone-w.webp', .22, a)


def glass_piece():
    # smooth glass: obsidian black and milk glass, a crisp highlight and a soft glow through the rim
    h = dome(1.0)
    for name, base, edge, glo in (('b', '#121418', '#3a4452', .08), ('w', '#f2f4f2', '#cfd8d6', .0)):
        alb = mix(C(base), C(edge), np.clip((rr - .55) / .45, 0, 1) ** 2)
        col = shade(gaussian_filter(h, .8), alb, gloss=120, spec=.95, amb=.6)
        rim = np.exp(-((rr - .82) / .08) ** 2)
        col = col + (np.array([150, 200, 230]) if name == 'b' else np.array([255, 255, 255])) * (rim * (.22 if name == 'b' else .1))[..., None]
        save_pc(col, 'pc-glass-' + name + '.webp', .18)


def matte_piece():
    # modern matte discs: a flat face with a soft bevel ring, no texture
    h = np.where(rr < .8, 20, 20 * np.cos(np.clip((rr - .8) / .2, 0, 1) * math.pi / 2))
    for name, base in (('b', '#222225'), ('w', '#f3f1ec')):
        col = shade(gaussian_filter(h, 1.2), C(base) * np.ones((NP, NP, 1)), gloss=16, spec=.06 if name == 'b' else .03, amb=.72)
        save_pc(col, 'pc-matte-' + name + '.webp', .12)


def koa_piece():
    """(overrides gen_art.py's) turned discs of figured koa under a clear finish, from the same realistic slab as the koa
    board (fine fibres, pores, flowing streaks) at twice the resolution, then the curl: irregular ripples across the grain
    that flash light / dark as on real curly koa. Golden koa (White) and dark heartwood (Black)."""
    from PIL import Image as _I
    h = (1 - rr ** 6) * 14 - np.clip((rr - .9) / .1, 0, 1) ** 2 * 8
    N2 = NP * 2
    y, x = np.mgrid[0:N2, 0:N2].astype(float)
    r_ = np.random.default_rng(11)

    def nz(sy, sx):
        n = gaussian_filter(r_.standard_normal((N2, N2)), (sy, sx), mode='wrap'); return n / (n.std() + 1e-9)
    # the curl: ripples run across the grain (vertical here), their spacing and phase wander, their strength comes and goes
    ph = x / 5.2 + nz(30, 8) * 1.6 + nz(6, 50) * .5
    rip = np.sin(ph)
    rip = np.sign(rip) * np.abs(rip) ** .7
    amt = np.clip(.55 + .45 * nz(60, 40), 0, 1)
    # four discs of each colour, each cut from another part of the wood and turned another way (the page varies them per stone)
    for name, seed, cols in (('pc-koa-w', 44, ('#e8b064', '#c07a34', '#6a3414', '#3a1a08')),
                             ('pc-koa-b', 45, ('#8a4a20', '#5e2a10', '#2c1206', '#1a0a03'))):
        for v, ang in enumerate((0, 37, 101, 143)):
            slab = koa_slab(N2, seed + v * 10, *cols, grain=.7)
            slab = slab * (1 + .2 * (np.roll(rip, v * 97, axis=1) * amt)[..., None])          # the chatoyant figure
            im = _I.fromarray(np.clip(slab, 0, 255).astype(np.uint8)).rotate(ang, resample=_I.BICUBIC, expand=False)
            c0 = N2 // 2 - int(N2 * .36); im = im.crop((c0, c0, N2 - c0, N2 - c0)).resize((NP, NP), _I.LANCZOS)   # (inside the turned square)
            alb = np.asarray(im).astype(float)
            rr_ = _I.fromarray(((np.roll(rip, v * 97, axis=1) * amt * .5 + .5) * 255).astype(np.uint8)).rotate(ang, resample=_I.BICUBIC).crop((c0, c0, N2 - c0, N2 - c0)).resize((NP, NP), _I.LANCZOS)
            rp = np.asarray(rr_).astype(float) / 255
            col = shade(gaussian_filter(h, .7) + (rp - .5) * .5, alb, gloss=80, spec=.38, amb=.62)
            save_pc(col, name + ('.webp' if v == 0 else '-%d.webp' % v), .22)

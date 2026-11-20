#!/usr/bin/env python3
"""Portal skins s89–s95 (UR, remade 2026-11-20): the special ones — richer craft, light or colour that moves.
Animated ones are two pictures (sXX, sXXb) that the page cross-fades (skins.js ANIM).
Run from the repo root: python3 atlas/tools/skins_ur2.py [id …]"""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from skins import *   # noqa
from skins_sr2 import render, svg_doc
from skins_ssr2 import doc, lin, smooth_path, cloud, VW, VH, OW, OH, TALL, EXTH

def gold_defs(id_='gold'):
    return lin(id_, [(0, '#f7e3a6'), (.45, '#e2bd6a'), (.55, '#f3d993'), (1, '#c99a45')], 1, 1)

# ---------------------------------------------------------------- stained glass (cover, light that moves)
def stained(variant=0):
    """a rose window: concentric rings of petals and lancets in jewel pastels between soft lead lines, light pouring in"""
    cx, cy = VW / 2, VH * .42
    cols = ['#f4c6cf', '#c9dcf2', '#f7e3a6', '#cfe8d4', '#e2d3f2', '#f6d2b8']
    lead = '#a99fb8'
    g = []
    # leaded quarries: a diamond lattice of pale tinted glass over the whole window, a few coloured panes
    r = RNG(61); q = 80
    for i in range(-1, int(VW / q) + 2):
        for j in range((-int(EXTH / (q * .7)) - 2) if TALL['on'] else -1, int(VH / (q * .7)) + 3):
            x = i * q + (q / 2 if j % 2 else 0); y = j * q * .7
            c = cols[int(r.random() * 6)] if r.random() < .22 else '#f7f3f6'
            g.append(f'<path d="M{x} {y - q * .7:.0f} L{x + q / 2:.0f} {y:.0f} L{x} {y + q * .7:.0f} L{x - q / 2:.0f} {y:.0f} Z" fill="{c}" stroke="#c4bccf" stroke-width="2.5" opacity=".85"/>')
    # the rose
    for ring, (r0, r1, n) in enumerate(((0, 70, 8), (70, 170, 12), (170, 290, 16), (290, 400, 24))):
        for k in range(n):
            a0 = 2 * math.pi * k / n; a1 = 2 * math.pi * (k + 1) / n
            pts = [(cx + r0 * math.cos(a0), cy + r0 * math.sin(a0)), (cx + r1 * math.cos(a0), cy + r1 * math.sin(a0)), (cx + r1 * math.cos(a1), cy + r1 * math.sin(a1)), (cx + r0 * math.cos(a1), cy + r0 * math.sin(a1))]
            d = f'M{pts[0][0]:.1f} {pts[0][1]:.1f} L{pts[1][0]:.1f} {pts[1][1]:.1f} A{r1} {r1} 0 0 1 {pts[2][0]:.1f} {pts[2][1]:.1f} L{pts[3][0]:.1f} {pts[3][1]:.1f}' + (f' A{r0} {r0} 0 0 0 {pts[0][0]:.1f} {pts[0][1]:.1f}' if r0 else '') + ' Z'
            g.append(f'<path d="{d}" fill="{cols[(k + ring * 2) % 6]}" stroke="{lead}" stroke-width="6"/>')
        if ring >= 1:
            for k in range(n):
                a = 2 * math.pi * (k + .5) / n; rr = (r0 + r1) / 2
                px, py, q_ = cx + rr * math.cos(a), cy + rr * math.sin(a), (r1 - r0) * .2
                g.append(''.join(f'<circle cx="{px + q_ * .62 * math.cos(math.radians(b_) + a):.1f}" cy="{py + q_ * .62 * math.sin(math.radians(b_) + a):.1f}" r="{q_ * .58:.1f}" fill="#fffaf0" stroke="{lead}" stroke-width="3"/>' for b_ in (0, 90, 180, 270)))
                g.append(f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{q_ * .4:.1f}" fill="{cols[(k + ring) % 6]}" stroke="{lead}" stroke-width="2.5"/>')
    g.append(f'<circle cx="{cx}" cy="{cy}" r="404" fill="none" stroke="{lead}" stroke-width="14"/><circle cx="{cx}" cy="{cy}" r="30" fill="#f7e3a6" stroke="{lead}" stroke-width="5"/>')
    # light: a soft glow that sits in a different place in the two versions, so the light seems to move
    lx, ly = ((cx - 260, cy - 180), (cx + 300, cy + 120))[variant]
    defs = f'<radialGradient id="glow" cx="{lx / VW:.3f}" cy="{ly / VH:.3f}" r=".55"><stop offset="0" stop-color="#ffffff" stop-opacity=".75"/><stop offset=".6" stop-color="#ffffff" stop-opacity=".25"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>'
    y0 = -EXTH if TALL['on'] else 0
    g.append(f'<rect width="{VW}" height="{VH}" fill="url(#glow)"/><rect y="{y0}" width="{VW}" height="{VH - y0}" fill="#fbf7fb" opacity=".32"/>')
    return doc(defs, f'<rect y="{y0}" width="{VW}" height="{VH - y0}" fill="#efe9f2"/>' + ''.join(g))

# ---------------------------------------------------------------- kaleidoscope (cover, colours that turn)
def kaleido(variant=0):
    cx, cy = VW / 2, VH / 2
    pal = [['#f6c6d0', '#c9dcf2', '#f7e3a6', '#cfe8d4', '#e2d3f2', '#f6d2b8'], ['#c9dcf2', '#e2d3f2', '#f6d2b8', '#f6c6d0', '#cfe8d4', '#f7e3a6']][variant]
    rot = (0, 15)[variant]
    wedge = []
    r = RNG(77)
    shapes = []
    for k in range(70):   # one 30° wedge of shapes, mirrored 12 times
        rad = 60 + (k / 70) ** .8 * 1100 + r.random() * 30; ang = r.random() * 30; s = 26 + r.random() * 70 + rad * .04; kind = k % 3; col = pal[int(r.random() * 6)]
        shapes.append((rad, ang, s, kind, col))
    for m in range(12):
        flip = m % 2
        g = []
        for rad, ang, s, kind, col in shapes:
            a = math.radians(rot + m * 30 + (30 - ang if flip else ang)); x, y = cx + rad * math.cos(a), cy + rad * math.sin(a)
            if kind == 0: g.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{s * .5:.0f}" fill="{col}" opacity=".85"/>')
            elif kind == 1: g.append(f'<path d="M{x:.0f} {y - s * .6:.0f} L{x + s * .45:.0f} {y:.0f} L{x:.0f} {y + s * .6:.0f} L{x - s * .45:.0f} {y:.0f} Z" fill="{col}" opacity=".85" transform="rotate({math.degrees(a):.0f} {x:.0f} {y:.0f})"/>')
            else: g.append(f'<path d="M{x:.0f} {y:.0f} C{x + s * .5:.0f} {y - s * .6:.0f} {x + s:.0f} {y:.0f} {x:.0f} {y + s * .6:.0f} C{x - s:.0f} {y:.0f} {x - s * .5:.0f} {y - s * .6:.0f} {x:.0f} {y:.0f} Z" fill="{col}" opacity=".8" transform="rotate({math.degrees(a) + 90:.0f} {x:.0f} {y:.0f})"/>')
        wedge.append(''.join(g))
    lines = ''.join(f'<line x1="{cx}" y1="{cy}" x2="{cx + 1400 * math.cos(math.radians(rot + m * 30)):.0f}" y2="{cy + 1400 * math.sin(math.radians(rot + m * 30)):.0f}" stroke="#ffffff" stroke-width="3" opacity=".6"/>' for m in range(12))
    defs = '<radialGradient id="v" cx=".5" cy=".5" r=".7"><stop offset="0" stop-color="#ffffff" stop-opacity=".0"/><stop offset="1" stop-color="#fbf8fc" stop-opacity=".55"/></radialGradient>'
    rings = ''.join(f'<circle cx="{cx}" cy="{cy}" r="{rr}" fill="none" stroke="{pal[i % 6]}" stroke-width="10" opacity=".5"/>' + ''.join(f'<circle cx="{cx + rr * math.cos(math.radians(rot + a)):.0f}" cy="{cy + rr * math.sin(math.radians(rot + a)):.0f}" r="9" fill="#ffffff" opacity=".85"/>' for a in range(0, 360, 15)) for i, rr in enumerate((180, 420, 700)))
    return doc(defs, f'<rect width="{VW}" height="{VH}" fill="#f7f3f8"/>' + ''.join(wedge) + rings + lines + f'<circle cx="{cx}" cy="{cy}" r="60" fill="#ffffff" opacity=".7"/><rect width="{VW}" height="{VH}" fill="url(#v)"/>')

# ---------------------------------------------------------------- yosegi (tile): Hakone marquetry, real wood tones
def yosegi(n=1024, seed=801):
    """箱根寄木細工: diamonds (ichimatsu-ure) and asanoha-like hexagon stars of four woods — honey, walnut, white, cherry —
    each cut piece with its own fine grain direction"""
    YY, XX = np.mgrid[0:n, 0:n].astype(np.float32)
    woods = [('#eed8ac', '#e0c28c'), ('#dcbf9f', '#cfae8a'), ('#f6eedd', '#ebdec4'), ('#e4b89e', '#d6a387')]
    s = 64  # diamonds: a square lattice turned 45°
    u = (XX + YY) / s; v = (XX - YY) / s
    iu, iv = np.floor(u).astype(int), np.floor(v).astype(int)
    fu, fv = u - iu, v - iv
    tri = (fu + fv > 1).astype(int)               # each diamond split in two triangles
    piece = (iu * 7 + iv * 3 + tri) % 4
    piece = np.where(((iu + iv) % 2 == 0), np.where(tri == 1, 0, 2), np.where(tri == 1, 1, 3))
    img = np.zeros((n, n, 3), np.float32)
    g1 = blurw(streaks(n, seed, 0), .7); g2 = blurw(streaks(n, seed + 1, 1), .7)
    ga = blurw(fnoise(n, 1.0, seed + 2, aniso=(1, .05)), .6); gb = blurw(fnoise(n, 1.0, seed + 3, aniso=(.05, 1)), .6)
    for k, (c1, c2) in enumerate(woods):
        grain_ = (g1 if k % 2 else g2) * .6 + norm(ga if k % 2 else gb) * .4
        col = lerp(hexc(c1), hexc(c2), np.clip(grain_, 0, 1))
        img = np.where((piece == k)[..., None], col, img)
    edge = np.minimum(np.minimum(fu, 1 - fu), np.minimum(fv, 1 - fv)) * s
    diag = np.abs(fu + fv - 1) * s / 1.414
    line = np.minimum(edge, diag)
    img = img * (0.86 + 0.14 * smooth(line, 0, 2.2))[..., None]
    img = img * (0.97 + 0.05 * norm(blurw(fnoise(n, 3.0, seed + 4), 14)))[..., None]
    # a soft lacquer sheen
    img = img + (norm(blurw(fnoise(n, 3.4, seed + 5), 20)) * .04)[..., None]
    return grain(img, .004, seed)

# ---------------------------------------------------------------- cloisonné (tile): gold wires, enamel
def cloisonne():
    """七宝焼: flowers and scrolling vines outlined in gold wire, filled with soft glossy enamel"""
    T = 1024
    def flower(cx, cy, s, petal, centre):
        ps = ''.join(f'<path d="M0 0 C-14 -16 -14 -44 0 -56 C14 -44 14 -16 0 0 Z" transform="translate({cx} {cy}) rotate({a}) scale({s})" fill="url(#{petal})" stroke="url(#gold)" stroke-width="{3 / s:.1f}"/>' for a in range(0, 360, 72))
        return ps + f'<circle cx="{cx}" cy="{cy}" r="{14 * s:.1f}" fill="url(#{centre})" stroke="url(#gold)" stroke-width="3"/>'
    defs = gold_defs() + ''.join(lin(i, [(0, a), (1, b)], 1, 1) for i, a, b in (('e1', '#f9d6de', '#f0b5c3'), ('e2', '#d3e4f5', '#b4cde9'), ('e3', '#fbecc0', '#f3d58d'), ('e4', '#d9eedb', '#b9dcbe'), ('e5', '#e6dbf4', '#cdbbea'), ('e0', '#f1f6fa', '#e4edf4'), ('e6', '#eaf2f7', '#dbe7f0')))
    g = []
    R_ = 64
    for j in range(-1, 2 * T // R_ + 2):   # ground: seigaiha cells in two pale enamels, gold wires
        for i in range(-1, T // (2 * R_) + 2):
            cx = i * 2 * R_ + (R_ if j % 2 else 0); cy = j * R_ / 2
            for rr, f in ((R_, 'e0'), (R_ * .66, 'e6'), (R_ * .33, 'e0')):
                g.append(f'<circle cx="{cx}" cy="{cy}" r="{rr:.0f}" fill="url(#{f})" stroke="url(#gold)" stroke-width="2.4"/>')
    r = RNG(83)
    pts = [(x * 256 + 128 + (y % 2) * 128, y * 256 + 128) for x in range(4) for y in range(4)]
    for ox in (-T, 0, T):
        for oy in (-T, 0, T):
            for i, (x, y) in enumerate(pts):
                X, Y = x + ox, y + oy
                if not (-200 < X < T + 200 and -200 < Y < T + 200): continue
                # a vine scroll round each flower
                g.append(f'<path d="M{X - 120} {Y + 60} C{X - 80} {Y - 20} {X - 20} {Y + 100} {X + 40} {Y + 60} C{X + 90} {Y + 30} {X + 100} {Y - 50} {X + 128} {Y - 70}" fill="none" stroke="url(#gold)" stroke-width="4"/>')
                for lx, ly, a in ((X - 70, Y + 40, 30), (X + 70, Y + 40, -40), (X + 110, Y - 40, -70)):
                    g.append(f'<path d="M0 0 C10 -12 30 -12 38 0 C30 10 10 10 0 0 Z" transform="translate({lx} {ly}) rotate({a})" fill="url(#e4)" stroke="url(#gold)" stroke-width="3"/>')
                g.append(f'<circle cx="{X}" cy="{Y}" r="74" fill="#f6f9fb" stroke="url(#gold)" stroke-width="4"/>' + flower(X, Y, 1.05 if i % 2 else .9, ['e1', 'e2', 'e5'][i % 3], 'e3'))
    defs += '<filter id="gl"><feGaussianBlur stdDeviation="40"/></filter>'
    return svg_doc(f'<defs>{defs}</defs>' + ''.join(g), '#f3f6f8')

# ---------------------------------------------------------------- night fair (dark cover, lights that twinkle)
def wheel_page():
    return True   # 2026-11-20: the carousel's horses are the page's (they go round)

def night_fair(variant=0, wheel=False):
    d = lin('sky', [(0, '#1b2246'), (.6, '#2b2f5e'), (1, '#3d3a6e')])
    g = [f'<rect width="{VW}" height="{VH}" fill="url(#sky)"/>']
    r = RNG(91)
    g.append(''.join(f'<circle cx="{r.random() * VW:.0f}" cy="{r.random() * 600:.0f}" r="{1 + r.random() * 2:.1f}" fill="#fff6dc" opacity="{.4 + r.random() * .6:.2f}"/>' for _ in range(140)))
    g.append('<path d="M0 1000 C400 960 800 1010 1200 980 C1500 960 1700 990 1920 970 L1920 1200 L0 1200 Z" fill="#232a4f"/>')
    cx, cy, R = 1540, 600, 300
    on = lambda k: (k + variant) % 2 == 0
    bulbs = []
    for k in range(48):   # rim bulbs
        t = k * math.pi / 24; x, y = cx + R * math.cos(t), cy + R * math.sin(t)
        c = ['#ffe9a6', '#ffc6d4', '#c9e6ff'][k % 3]
        bulbs.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{7 if on(k) else 5}" fill="{c}" opacity="{1 if on(k) else .35}"/>')
        if on(k): bulbs.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="22" fill="{c}" opacity=".18"/>')
    g.append(f'<path d="M{cx - 160} 1010 L{cx} {cy} L{cx + 160} 1010" fill="none" stroke="#5a5f92" stroke-width="16" stroke-linecap="round"/>')
    if wheel: g.append(f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="#5a5f92" stroke-width="8"/>' + ''.join(f'<line x1="{cx}" y1="{cy}" x2="{cx + R * math.cos(k * math.pi / 8):.0f}" y2="{cy + R * math.sin(k * math.pi / 8):.0f}" stroke="#5a5f92" stroke-width="4"/>' for k in range(16)))
    for k in range(8 if wheel else 0):
        t = k * math.pi / 4 + .2; x, y = cx + R * math.cos(t), cy + R * math.sin(t)
        g.append(f'<path d="M{x - 24:.0f} {y + 6:.0f} L{x + 24:.0f} {y + 6:.0f} L{x + 20:.0f} {y + 42:.0f} L{x - 20:.0f} {y + 42:.0f} Z" fill="#6a6fa6"/><rect x="{x - 13:.0f}" y="{y + 14:.0f}" width="26" height="14" rx="3" fill="#ffe9a6" opacity="{.95 if on(k) else .6}"/>')
    if wheel: g.append(''.join(bulbs))
    X, Y = 360, 990   # carousel with a lit canopy
    g.append(f'<rect x="{X - 200}" y="{Y - 150}" width="400" height="160" fill="#3f4579"/><rect x="{X - 210}" y="{Y}" width="420" height="26" rx="10" fill="#565c97"/>')
    for i in range(8):
        x0 = X - 210 + i * 52.5
        g.append(f'<path d="M{x0} {Y - 150} L{X} {Y - 310} L{x0 + 52.5} {Y - 150} Z" fill="{["#7a5f9a", "#5a5f92"][i % 2]}"/>')
    for k in range(17):
        x = X - 210 + k * 26; c = ['#ffe9a6', '#ffc6d4'][k % 2]
        g.append(f'<circle cx="{x}" cy="{Y - 150}" r="{6 if on(k) else 4}" fill="{c}" opacity="{1 if on(k) else .35}"/>' + (f'<circle cx="{x}" cy="{Y - 150}" r="18" fill="{c}" opacity=".18"/>' if on(k) else ''))
    g.append(f'<rect x="{X - 180}" y="{Y - 140}" width="360" height="130" fill="#ffe9a6" opacity=".14"/>')
    for x, c in ((X - 130, '#f3eef8'), (X - 20, '#ffe9c4'), (X + 90, '#f3eef8')) if not wheel_page() else ():   # (the horses go round: atlas/skins-fx.js)
        g.append(f'<rect x="{x + 28}" y="{Y - 140}" width="5" height="130" fill="#d9c27a"/><path d="M{x} {Y - 50} C{x} {Y - 76} {x + 20} {Y - 82} {x + 44} {Y - 78} C{x + 56} {Y - 92} {x + 70} {Y - 88} {x + 66} {Y - 70} C{x + 66} {Y - 54} {x + 50} {Y - 46} {x + 40} {Y - 46} L{x + 42} {Y - 26} L{x + 34} {Y - 26} L{x + 30} {Y - 44} L{x + 14} {Y - 44} L{x + 12} {Y - 26} L{x + 4} {Y - 26} Z" fill="{c}"/>')
    # a string of lights across
    g.append('<path d="M640 760 Q860 840 1080 800 Q1180 790 1260 820" fill="none" stroke="#5a5f92" stroke-width="3"/>')
    for i in range(18):
        t = i / 17; x = 640 + t * 620; y = 760 + math.sin(t * math.pi) * 70 - t * 10
        c = ['#ffe9a6', '#ffc6d4', '#c9e6ff'][i % 3]
        g.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{6 if on(i + 1) else 4}" fill="{c}" opacity="{1 if on(i + 1) else .35}"/>' + (f'<circle cx="{x:.0f}" cy="{y:.0f}" r="18" fill="{c}" opacity=".2"/>' if on(i + 1) else ''))
    return doc(d, ''.join(g))

# ---------------------------------------------------------------- maki-e & raden (dark cover, shell that shimmers)
def makie(variant=0):
    d = lin('lac', [(0, '#1a1418'), (1, '#251c22')]) + gold_defs()
    shell = [lin(f's{i}', [(0, a), (1, b)], 1, 1) for i, (a, b) in enumerate([('#f4d4ee', '#cfe8ff'), ('#d4fff0', '#f6e2ff'), ('#fff2c8', '#d6e6ff'), ('#e2d4ff', '#d4fff4')])]
    if variant: shell = [lin(f's{i}', [(0, b), (1, a)], 1, 1) for i, (a, b) in enumerate([('#d4fff0', '#f4d4ee'), ('#fff2c8', '#cfe8ff'), ('#e2d4ff', '#f6e2ff'), ('#f4d4ee', '#d6e6ff')])]
    d += ''.join(shell)
    g = [f'<rect width="{VW}" height="{VH}" fill="url(#lac)"/>']
    # a gold plum branch from the lower left, and another from the upper right
    def branch(x0, y0, pts, w):
        return f'<path d="{smooth_path([(x0, y0)] + pts)}" fill="none" stroke="url(#gold)" stroke-width="{w}" stroke-linecap="round"/>'
    g.append(branch(-40, 1180, [(220, 1020), (380, 960), (560, 980), (720, 900)], 26))
    g.append(branch(380, 960, [(420, 860), (380, 760), (440, 680)], 14))
    g.append(branch(560, 980, [(640, 1060), (760, 1080)], 12))
    g.append(branch(1960, 40, [(1720, 160), (1600, 260), (1460, 300), (1340, 280)], 22))
    g.append(branch(1600, 260, [(1640, 360), (1600, 460)], 12))
    def blossom(x, y, s, sid):
        ps = ''.join(f'<circle cx="{x + s * .55 * math.cos(math.radians(a)):.1f}" cy="{y + s * .55 * math.sin(math.radians(a)):.1f}" r="{s * .46:.1f}" fill="url(#{sid})" stroke="url(#gold)" stroke-width="2.5"/>' for a in range(-90, 270, 72))
        st = ''.join(f'<line x1="{x}" y1="{y}" x2="{x + s * .5 * math.cos(math.radians(a)):.1f}" y2="{y + s * .5 * math.sin(math.radians(a)):.1f}" stroke="url(#gold)" stroke-width="2"/>' for a in range(-54, 306, 72))
        return ps + st + f'<circle cx="{x}" cy="{y}" r="{s * .16:.1f}" fill="url(#gold)"/>'
    # 観世水: gold flowing-water lines along the bottom (behind the branch)
    for k in range(5):
        y = 1060 + k * 32
        g.insert(1, f'<path d="M-40 {y} C200 {y - 40} 360 {y + 30} 600 {y} C820 {y - 30} 980 {y + 34} 1240 {y} C1480 {y - 34} 1700 {y + 26} 1960 {y}" fill="none" stroke="url(#gold)" stroke-width="{5 - k * .6:.1f}" opacity="{.75 - k * .1:.2f}"/>')
    for i, (x, y, s) in enumerate(((720, 900, 70), (440, 680, 58), (560, 960, 48), (300, 1000, 56), (760, 1080, 44), (1340, 280, 66), (1600, 460, 56), (1500, 300, 44), (1700, 170, 50), (380, 790, 38), (840, 860, 34), (1240, 330, 38))):
        g.append(blossom(x, y, s, f's{i % 4}'))
    for i, (x, y) in enumerate(((830, 840), (500, 620), (1260, 360), (1420, 420), (900, 980), (240, 900))):
        g.append(f'<circle cx="{x}" cy="{y}" r="9" fill="url(#gold)"/>')
    r = RNG(97)
    for _ in range(40):   # scattered raden petals
        x, y, a = r.random() * VW, r.random() * VH, r.random() * 360
        r.random(); r.random()   # (2026-11-20: the petals all move — atlas/skins-fx.js; the draws stay so the gold dust keeps its place)
    # fine gold dust (nashiji) in drifts
    g.append(''.join(f'<circle cx="{r.random() * VW:.0f}" cy="{(r.random() ** 2) * 500 + (900 if r.random() < .5 else 0):.0f}" r="{.8 + r.random() * 1.6:.1f}" fill="#e2bd6a" opacity="{.3 + r.random() * .5:.2f}"/>' for _ in range(500)))
    return doc(d, ''.join(g))

# ---------------------------------------------------------------- gold damask (tile)
def damask():
    """Art Deco fans: ivory scallops edged with fine gold, rays and arches inside each fan, half-drop rows"""
    T = 1024; R = 64; g = []
    for j in range(-2, T // (R // 2) + 3):
        for i in range(-1, T // (2 * R) + 2):
            cx = i * 2 * R + (R if j % 2 else 0); cy = j * R / 2
            g.append(f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="#faf5ea" stroke="url(#gold)" stroke-width="3"/>')
            g.append(''.join(f'<line x1="{cx}" y1="{cy}" x2="{cx + R * .92 * math.cos(math.radians(a)):.1f}" y2="{cy - R * .92 * math.sin(math.radians(a)):.1f}" stroke="url(#gold)" stroke-width="1.4" opacity=".75"/>' for a in range(15, 180, 15)))
            g.append(f'<circle cx="{cx}" cy="{cy}" r="{R * .62:.1f}" fill="#f6eedd" stroke="url(#gold)" stroke-width="2"/><circle cx="{cx}" cy="{cy}" r="{R * .3:.1f}" fill="url(#gold)" opacity=".85"/>')
    return svg_doc(f'<defs>{gold_defs()}</defs>' + ''.join(g), '#faf5ea')

def satin(img, seed):
    """a satin weave sheen over a rendered damask"""
    n = img.shape[0]
    YY, XX = np.mgrid[0:n, 0:n].astype(np.float32)
    weave = ((XX * 2 + YY) % 5 < 1).astype(np.float32)
    img = img * (0.985 + 0.02 * blurw(weave, .6))[..., None]
    sheen = norm(blurw(fnoise(n, 3.4, seed), 24))
    return grain(img * (0.97 + 0.06 * sheen)[..., None], .003, seed)

def cover_finish(img, seed):
    return grain(img, .004, seed)

if __name__ == '__main__':
    ids = sys.argv[1:] or ['s91', 's92', 's93', 's94', 's95']
    jobs = {'s89': (stained(0), OW, OH), 's89b': (stained(1), OW, OH), 's90': (kaleido(0), OW, OH), 's90b': (kaleido(1), OW, OH),
            's92': (cloisonne(), 1024, 1024), 's93': (night_fair(0), OW, OH), 's93b': (night_fair(1), OW, OH),
            's94': (makie(0), OW, OH), 's94b': (makie(1), OW, OH), 's95': (damask(), 1024, 1024)}
    want = []
    for i in ids:
        want += [k for k in jobs if k == i or k == i + 'b']
    imgs = render([jobs[k] for k in want])
    for k, im in zip(want, imgs):
        tile = jobs[k][1] == 1024
        out = satin(im, 95) if k == 's95' else grain(im, .004, 92) if k == 's92' else cover_finish(im, int(k[1:3]))
        save(k, out, 'tile' if tile else 'cover', q=80)
    if 's91' in ids: save('s91', yosegi(), 'tile', q=80)

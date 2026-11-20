#!/usr/bin/env python3
"""Portal skins, 2026-11-20 second wave of URs (s101–s112). Soft rendering (blurred glows, haze, gradients — no flat
vector look), and every scene is built for a big motion that the page draws over it (atlas/skins-fx.js): the dragon,
the floating islands, the airships, the clockwork, the moons, the phoenix, the sheep, the tanabata papers, lightning,
the candy river, the wizard's floating books. Run from the repo root: python3 atlas/tools/skins_ur4.py [id …]"""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from skins import RNG, save
from skins_ssr2 import doc, lin, smooth_path, render, finish, VW, VH, OW, OH
from skins_ssr4 import BLUR, ridge, band, glow, haze, pine, round_tree

def rad(id_, stops, cx=.5, cy=.5, r=.5):
    return f'<radialGradient id="{id_}" cx="{cx}" cy="{cy}" r="{r}">' + ''.join(f'<stop offset="{o}" stop-color="{c}" stop-opacity="{a}"/>' for o, c, a in stops) + '</radialGradient>'

def stars(n, seed, y0, y1, col='#fff6e6', big=.05):
    r = RNG(seed); out = []
    for _ in range(n):
        x, y = r.random() * VW, y0 + r.random() * (y1 - y0); s = .5 + r.random() ** 3 * 1.8
        out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{s:.1f}" fill="{col}" opacity="{.25 + r.random() * .6:.2f}"/>')
        if r.random() < big: out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{s * 5:.1f}" fill="{col}" opacity=".16" filter="url(#b4)"/>')
    return ''.join(out)

def clouds_soft(seed, n, y0, y1, col, op, smin=80, smax=200, blur='b16'):
    r = RNG(seed); out = []
    for _ in range(n):
        x, y, s = r.random() * VW, y0 + r.random() * (y1 - y0), smin + r.random() * (smax - smin)
        out.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{s * 1.6:.0f}" ry="{s * .5:.0f}" fill="{col}" opacity="{op}" filter="url(#{blur})"/>')
    return ''.join(out)

# ------------------------------------------------------------------------------------------------ s101 竜の峰
def dragon_peaks():
    """竜の峰: towering mist-wrapped peaks at golden hour, a temple on a cliff, a sea of clouds — the dragon flies through (page)"""
    d = BLUR + lin('sky', [(0, '#5a4a7e'), (.35, '#b2729a'), (.6, '#f2b08a'), (.78, '#fcd8a4')])
    g = [f'<rect width="{VW}" height="{VH}" fill="url(#sky)"/>', glow(1300, 640, 700, 260, '#ffe2a8', .6, 'b60'), '<circle cx="1300" cy="640" r="90" fill="#fff0c8" opacity=".9" filter="url(#b4)"/>']
    r = RNG(101)
    for layer, (cnt, base, hmin, hmax, c, op, bl) in enumerate(((7, 820, 380, 560, '#a07a9e', .55, 'b4'), (6, 880, 460, 700, '#7a5a86', .75, 'b2'), (5, 960, 520, 820, '#4e3e66', 1, None))):
        for i in range(cnt):
            x = (i + .2 + r.random() * .6) * VW / cnt; h = hmin + r.random() * (hmax - hmin); w = h * (.22 + r.random() * .1)
            f = f' filter="url(#{bl})"' if bl else ''
            g.append(f'<path d="M{x - w:.0f} {base:.0f} C{x - w * .9:.0f} {base - h * .5:.0f} {x - w * .5:.0f} {base - h * .95:.0f} {x - w * .1:.0f} {base - h:.0f} C{x + w * .3:.0f} {base - h * 1.02:.0f} {x + w * .7:.0f} {base - h * .7:.0f} {x + w:.0f} {base:.0f} Z" fill="{c}" opacity="{op}"{f}/>')
            if layer == 2:
                g.append(f'<path d="M{x - w * .1:.0f} {base - h:.0f} C{x + w * .3:.0f} {base - h * 1.02:.0f} {x + w * .7:.0f} {base - h * .7:.0f} {x + w:.0f} {base:.0f} L{x + w * .3:.0f} {base:.0f} C{x + w * .4:.0f} {base - h * .6:.0f} {x + w * .2:.0f} {base - h * .9:.0f} {x - w * .1:.0f} {base - h:.0f} Z" fill="#f2a88a" opacity=".22"/>')
                for _ in range(3): g.append(pine(x + (r.random() - .5) * w * .8, base - h * (.6 + r.random() * .3), 50 + r.random() * 30, '#3e3256'))
        g.append(clouds_soft(1010 + layer, 7, base - 140, base, '#f6d4c8', .55, 120, 260, 'b16'))
    T = (520, 470)   # a temple on a pillar of rock
    g.append(f'<path d="M{T[0] - 90} 1000 C{T[0] - 80} 800 {T[0] - 70} 620 {T[0] - 60} {T[1] + 40} L{T[0] + 70} {T[1] + 40} C{T[0] + 80} 620 {T[0] + 100} 800 {T[0] + 110} 1000 Z" fill="#3e3256"/>'
             + ''.join(f'<rect x="{T[0] - 40 + k * 6}" y="{T[1] - k * 46}" width="{80 - k * 12}" height="40" fill="#5a3e4a"/><path d="M{T[0] - 74 + k * 10} {T[1] - k * 46 + 4} Q{T[0]} {T[1] - k * 46 - 34} {T[0] + 74 - k * 10} {T[1] - k * 46 + 4} Z" fill="#2e2440"/><rect x="{T[0] - 12 + k * 2}" y="{T[1] - k * 46 + 12}" width="{24 - k * 4}" height="16" fill="#ffd08a"/>' for k in range(3)))
    g.append(glow(T[0], T[1] - 40, 90, 90, '#ffd08a', .45, 'b16'))
    g.append('<rect x="-40" y="980" width="2000" height="260" fill="#fbe6dc" opacity=".9" filter="url(#b30)"/>' + clouds_soft(1019, 14, 960, 1200, '#fff2ec', .9, 140, 280, 'b30'))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s102 空に浮かぶ島
def sky_islands():
    """空に浮かぶ島: a bright high sky with soft cloud banks far below and tiny far islands — the big islands, waterfalls and birds are the page's"""
    d = BLUR + lin('sky', [(0, '#5aa4e6'), (.5, '#a9d4f4'), (.8, '#e2f2fa'), (1, '#f4faf8')])
    g = [f'<rect width="{VW}" height="{VH}" fill="url(#sky)"/>', glow(400, 200, 500, 200, '#ffffff', .6, 'b60')]
    g.append(clouds_soft(1021, 16, 980, 1200, '#ffffff', .95, 160, 320, 'b30') + clouds_soft(1022, 10, 900, 1000, '#f2f8fc', .8, 120, 220, 'b16'))
    r = RNG(102)
    for _ in range(6):   # far islands (static, hazy)
        x, y, s = r.random() * VW, 500 + r.random() * 300, 40 + r.random() * 50
        g.append(f'<g opacity=".55" filter="url(#b2)"><path d="M{x - s:.0f} {y:.0f} C{x - s * .6:.0f} {y + s * .9:.0f} {x + s * .6:.0f} {y + s * .9:.0f} {x + s:.0f} {y:.0f} Z" fill="#b8b4c8"/><ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{s:.0f}" ry="{s * .22:.0f}" fill="#a8d0a0"/><circle cx="{x - s * .3:.0f}" cy="{y - s * .2:.0f}" r="{s * .3:.0f}" fill="#9cc896"/></g>')
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s103 光るきのこの森
def glow_mushrooms():
    """光るきのこの森: a deep blue night forest, big trunks, glowing cyan, pink and violet mushrooms and moss (their glow breathes, spores rise, fireflies drift: the page's)"""
    d = BLUR + lin('sky', [(0, '#0c1630'), (.6, '#142a48'), (1, '#183852')])
    g = [f'<rect width="{VW}" height="{VH}" fill="url(#sky)"/>', glow(960, 300, 900, 300, '#3a6a8a', .35, 'b60')]
    r = RNG(103)
    for layer, (cnt, wmin, wmax, c) in enumerate(((14, 30, 60, '#1c3450'), (9, 60, 110, '#16283e'), (5, 110, 190, '#0f1c2c'))):
        for _ in range(cnt):
            x = r.random() * VW; w = wmin + r.random() * (wmax - wmin)
            g.append(f'<path d="M{x - w:.0f} 1200 C{x - w * .6:.0f} 1100 {x - w * .5:.0f} 1000 {x - w * .45:.0f} 900 L{x - w * .4:.0f} -20 L{x + w * .4:.0f} -20 L{x + w * .45:.0f} 900 C{x + w * .5:.0f} 1000 {x + w * .6:.0f} 1100 {x + w:.0f} 1200 Z" fill="{c}"/>')
            g.append(''.join(f'<path d="M{x + (r.random() - .5) * w * .6:.0f} {y0:.0f} q{(r.random() - .5) * 10:.0f} {80 + r.random() * 80:.0f} 0 {160 + r.random() * 120:.0f}" stroke="#2a4a66" stroke-width="{2 + layer:.0f}" fill="none" opacity=".35"/>' for y0 in range(0, 1000, 220)))
            g.append(f'<path d="M{x - w * .4:.0f} -20 L{x - w * .25:.0f} -20 L{x - w * .3:.0f} 900 C{x - w * .35:.0f} 1000 {x - w * .5:.0f} 1100 {x - w * .7:.0f} 1200 L{x - w:.0f} 1200 C{x - w * .6:.0f} 1100 {x - w * .5:.0f} 1000 {x - w * .45:.0f} 900 Z" fill="#5ad8c6" opacity="{.08 + layer * .04:.2f}"/>')
        g.append(haze(0, 1200, '#1a3a5a', .18 - layer * .05))
    g.append('<path d="M-40 1200 L-40 1020 C400 980 900 1000 1300 1010 C1600 1020 1800 1000 1960 990 L1960 1200 Z" fill="#0f2034"/>')
    def mush(x, y, s, cap, glowc):
        return (glow(x, y - s * .7, s * 1.1, s * .7, glowc, .45, 'b16')
                + f'<path d="M{x - s * .1:.0f} {y:.0f} C{x - s * .12:.0f} {y - s * .3:.0f} {x - s * .08:.0f} {y - s * .55:.0f} {x - s * .06:.0f} {y - s * .6:.0f} L{x + s * .06:.0f} {y - s * .6:.0f} C{x + s * .08:.0f} {y - s * .55:.0f} {x + s * .12:.0f} {y - s * .3:.0f} {x + s * .1:.0f} {y:.0f} Z" fill="#cfe6f0" opacity=".85"/>'
                + f'<path d="M{x - s * .5:.0f} {y - s * .55:.0f} C{x - s * .5:.0f} {y - s * .95:.0f} {x + s * .5:.0f} {y - s * .95:.0f} {x + s * .5:.0f} {y - s * .55:.0f} C{x + s * .2:.0f} {y - s * .5:.0f} {x - s * .2:.0f} {y - s * .5:.0f} {x - s * .5:.0f} {y - s * .55:.0f} Z" fill="{cap}"/>'
                + f'<path d="M{x - s * .3:.0f} {y - s * .78:.0f} C{x - s * .2:.0f} {y - s * .86:.0f} {x:.0f} {y - s * .88:.0f} {x + s * .1:.0f} {y - s * .86:.0f}" stroke="#ffffff" stroke-width="{s * .04:.1f}" fill="none" opacity=".6" stroke-linecap="round"/>')
    for x, y, s, cap, gc in ((300, 1080, 170, '#5ad8e6', '#5ad8e6'), (420, 1100, 100, '#8ae8f0', '#5ad8e6'), (1500, 1060, 200, '#f08ad0', '#f08ad0'), (1640, 1090, 120, '#c69af0', '#c69af0'), (860, 1110, 90, '#8ae8f0', '#5ad8e6'), (1060, 1120, 70, '#f08ad0', '#f08ad0'), (1800, 1140, 80, '#5ad8e6', '#5ad8e6'), (140, 1150, 70, '#c69af0', '#c69af0')):
        g.append(mush(x, y, s, cap, gc))
    g.append(''.join(f'<ellipse cx="{r.random() * VW:.0f}" cy="{1020 + r.random() * 180:.0f}" rx="{20 + r.random() * 40:.0f}" ry="{6 + r.random() * 8:.0f}" fill="#4ac0a0" opacity=".35" filter="url(#b4)"/>' for _ in range(30)))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s104 飛行船の港
def airship_port():
    """飛行船の港: a sunset sky port — a tall brass mooring tower on a cliff above clouds, a town of chimneys and copper domes (airships come and go, propellers spin, signal lights blink: the page's)"""
    d = BLUR + lin('sky', [(0, '#4e5a8e'), (.4, '#b08aa8'), (.66, '#f6b892'), (.82, '#fcdcae')])
    g = [f'<rect width="{VW}" height="{VH}" fill="url(#sky)"/>', glow(1500, 700, 600, 220, '#ffe0a8', .6, 'b60')]
    g.append(clouds_soft(1041, 10, 760, 900, '#f8c8b4', .7, 140, 260, 'b16'))
    g.append('<path d="M-40 1200 L-40 860 C200 840 500 850 760 880 C900 900 1000 960 1060 1200 Z" fill="#6a5070"/>')
    T = (360, 860)   # the mooring tower
    g.append(f'<path d="M{T[0] - 70} {T[1]} L{T[0] - 26} {T[1] - 560} L{T[0] + 26} {T[1] - 560} L{T[0] + 70} {T[1]} Z" fill="#8a6a5a"/>' + ''.join(f'<path d="M{T[0] - 66 + k * 4.5:.0f} {T[1] - k * 56} L{T[0] + 66 - k * 4.5:.0f} {T[1] - k * 56 - 56} M{T[0] + 66 - k * 4.5:.0f} {T[1] - k * 56} L{T[0] - 66 + k * 4.5:.0f} {T[1] - k * 56 - 56}" stroke="#c49a6a" stroke-width="4"/>' for k in range(10))
             + f'<rect x="{T[0] - 60}" y="{T[1] - 600}" width="120" height="50" rx="10" fill="#c49a6a"/><path d="M{T[0] - 50} {T[1] - 600} C{T[0] - 50} {T[1] - 660} {T[0] + 50} {T[1] - 660} {T[0] + 50} {T[1] - 600} Z" fill="#7aa89a"/><rect x="{T[0] - 3}" y="{T[1] - 700}" width="6" height="50" fill="#c49a6a"/>'
             + f'<rect x="{T[0] - 40}" y="{T[1] - 588}" width="80" height="22" rx="4" fill="#ffd796"/>')
    r = RNG(104)
    x = 520
    while x < 1960:   # the town: brick houses with chimneys and copper domes
        w = 110 + r.random() * 80; h = 120 + r.random() * 160; top = 1000 - h + (x - 520) * .02
        g.append(f'<rect x="{x:.0f}" y="{top:.0f}" width="{w:.0f}" height="{h + 300:.0f}" fill="{["#8a5a5a", "#7a5a6a", "#94685a"][int(r.random() * 3)]}"/>')
        g.append(''.join(f'<rect x="{x + 14 + i * 34:.0f}" y="{top + 20 + j * 46:.0f}" width="18" height="26" rx="9" fill="#ffd796" opacity="{.9 if r.random() < .6 else .3}"/>' for i in range(int((w - 20) // 34)) for j in range(int(h // 46))))
        k = r.random()
        if k < .35: g.append(f'<path d="M{x + 10:.0f} {top + 2:.0f} C{x + 10:.0f} {top - w * .6:.0f} {x + w - 10:.0f} {top - w * .6:.0f} {x + w - 10:.0f} {top + 2:.0f} Z" fill="#7aa89a"/><rect x="{x + w / 2 - 2:.0f}" y="{top - w * .5 - 30:.0f}" width="4" height="30" fill="#c49a6a"/>')
        else: g.append(f'<path d="M{x - 8:.0f} {top + 4:.0f} L{x + w / 2:.0f} {top - 40:.0f} L{x + w + 8:.0f} {top + 4:.0f} Z" fill="#5a4050"/><rect x="{x + w * .7:.0f}" y="{top - 60:.0f}" width="18" height="50" fill="#6a4a4a"/>')
        x += w + 6
    g.append(glow(1300, 980, 700, 120, '#ffd796', .25, 'b30'))
    g.append('<path d="M1960 1200 L1960 1010 C1600 1040 1200 1060 900 1100 C700 1130 560 1170 500 1200 Z" fill="#4a3a56"/>')
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s105 時計じかけの塔
def clockwork():
    """時計じかけの塔: inside a clock tower — warm brass and wood, the back of a great clock face letting in light, beams and stairs (the gears turn, the pendulum swings: the page's)"""
    d = BLUR + lin('wall', [(0, '#3a2a2a'), (1, '#5a3e34')]) + rad('face', [(0, '#fff2d0', 1), (.7, '#f6d8a0', .95), (1, '#e8b870', .9)])
    g = ['<rect width="1920" height="1200" fill="url(#wall)"/>', glow(960, 420, 700, 500, '#ffd8a0', .35, 'b60')]
    C = (960, 400, 210)   # the clock face (seen from behind: light through the glass), finely drawn
    g.append(f'<circle cx="{C[0]}" cy="{C[1]}" r="{C[2] + 46}" fill="#5a4030"/><circle cx="{C[0]}" cy="{C[1]}" r="{C[2] + 34}" fill="none" stroke="#c89a5a" stroke-width="6"/>'
             + ''.join(f'<circle cx="{C[0] + (C[2] + 40) * math.cos(a):.1f}" cy="{C[1] + (C[2] + 40) * math.sin(a):.1f}" r="4" fill="#d8b070"/>' for a in [k * math.pi / 30 for k in range(60)])
             + f'<circle cx="{C[0]}" cy="{C[1]}" r="{C[2]}" fill="url(#face)"/><circle cx="{C[0]}" cy="{C[1]}" r="{C[2] * .72:.0f}" fill="none" stroke="#b88a4a" stroke-width="2" opacity=".6"/><circle cx="{C[0]}" cy="{C[1]}" r="{C[2] * .3:.0f}" fill="none" stroke="#b88a4a" stroke-width="2" opacity=".5"/>')
    g.append(''.join(f'<path d="M{C[0] + C[2] * .9 * math.cos(a):.1f} {C[1] + C[2] * .9 * math.sin(a):.1f} L{C[0] + C[2] * .97 * math.cos(a):.1f} {C[1] + C[2] * .97 * math.sin(a):.1f}" stroke="#8a6a4a" stroke-width="{4 if k % 5 == 0 else 1.5}"/>' for k, a in enumerate([j * math.pi / 30 for j in range(60)])))
    RN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']
    g.append(''.join(f'<text x="{C[0] - C[2] * .8 * math.sin(k * math.pi / 6):.1f}" y="{C[1] - C[2] * .8 * math.cos(k * math.pi / 6) + 9:.1f}" font-family="Georgia,serif" font-size="26" fill="#7a5a3a" text-anchor="middle">{RN[k]}</text>' for k in range(12)))
    g.append(''.join(f'<path d="M{C[0]} {C[1]} m{C[2] * .45 * math.cos(a):.1f} {C[2] * .45 * math.sin(a):.1f} q{C[2] * .1 * math.cos(a + 1.2):.1f} {C[2] * .1 * math.sin(a + 1.2):.1f} {C[2] * .2 * math.cos(a):.1f} {C[2] * .2 * math.sin(a):.1f}" stroke="#b88a4a" stroke-width="2" fill="none" opacity=".55"/>' for a in [k * math.pi / 4 for k in range(8)]))
    g.append(f'<g opacity=".25">' + ''.join(f'<path d="M{C[0] + C[2] * math.cos(a):.0f} {C[1] + C[2] * math.sin(a):.0f} L{C[0] + 900 * math.cos(a):.0f} {C[1] + 1200:.0f}" stroke="#ffe0a8" stroke-width="40" opacity=".3" filter="url(#b16)"/>' for a in (1.9, 2.3, 1.2)) + '</g>')
    g.append('<rect x="0" y="0" width="80" height="1200" fill="#4a3228"/><rect x="1840" y="0" width="80" height="1200" fill="#4a3228"/><rect x="0" y="820" width="1920" height="40" fill="#6a4a38"/><rect x="0" y="0" width="1920" height="40" fill="#4a3228"/>')
    g.append(''.join(f'<path d="M{x} 860 L{x} 1200" stroke="#6a4a38" stroke-width="30"/>' for x in (300, 960, 1620)))
    g.append('<path d="M1300 1200 L1300 1140 L1380 1140 L1380 1080 L1460 1080 L1460 1020 L1540 1020 L1540 960 L1620 960 L1620 900 L1700 900 L1700 860 L1960 860 L1960 1200 Z" fill="#5a3e30"/>')
    g.append('<rect x="0" y="1120" width="1920" height="80" fill="#3a2820"/>')
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s106 環のある惑星
def ringed_planet():
    """環のある惑星: deep space with a nebula, a great ringed planet low on the right, a rocky little moon in front (moons orbit, the ring shimmers, a comet and satellites pass: the page's)"""
    d = BLUR + lin('sky', [(0, '#080a1e'), (1, '#141a3a')]) + rad('pl', [(0, '#f6d8b0', 1), (.6, '#d89a7a', 1), (1, '#8a5a6a', 1)], .38, .32, .75) + rad('neb', [(0, '#b07ae0', .45), (1, '#b07ae0', 0)])
    g = [f'<rect width="{VW}" height="{VH}" fill="url(#sky)"/>', '<ellipse cx="500" cy="380" rx="700" ry="260" fill="url(#neb)" filter="url(#b30)"/><ellipse cx="760" cy="300" rx="400" ry="160" fill="#6ac0e0" opacity=".15" filter="url(#b60)"/>', stars(520, 106, 0, 1200, '#f6f2ff', .06)]
    P = (1380, 660, 190)
    pl = f'<circle cx="{P[0]}" cy="{P[1]}" r="{P[2]}"/>'
    rings = ''.join(f'<ellipse cx="{P[0]}" cy="{P[1]}" rx="{rx}" ry="{rx * .21:.0f}" fill="none" stroke="{c}" stroke-width="{w}" opacity="{o}"/>' for rx, w, c, o in ((300, 26, '#e8c8a0', .55), (336, 10, '#d8b088', .45), (262, 8, '#f6e0c0', .5), (360, 4, '#c8a080', .35)))
    g.append(f'<clipPath id="rf"><rect x="{P[0] - 500}" y="{P[1]}" width="1000" height="300"/></clipPath><g transform="rotate(-14 {P[0]} {P[1]})">{rings}</g>')
    g.append(f'<clipPath id="pc">{pl}</clipPath><circle cx="{P[0]}" cy="{P[1]}" r="{P[2]}" fill="url(#pl)"/><g clip-path="url(#pc)">' + ''.join(f'<path d="M{P[0] - 220} {P[1] + dy} C{P[0] - 80} {P[1] + dy - 10} {P[0] + 80} {P[1] + dy + 12} {P[0] + 220} {P[1] + dy}" stroke="{c}" stroke-width="{w}" fill="none" opacity="{o}"/>' for dy, w, c, o in ((-140, 10, '#f6e2c4', .5), (-104, 18, '#c88a6a', .45), (-60, 8, '#f6d8b0', .5), (-30, 22, '#b87a6a', .4), (10, 12, '#f6e2c4', .45), (44, 26, '#c88a6a', .4), (86, 10, '#e8b890', .5), (120, 18, '#a86a5a', .35), (156, 12, '#e8b890', .4)))
             + f'<ellipse cx="{P[0] + 60}" cy="{P[1] + 50}" rx="34" ry="16" fill="#c87a5a" opacity=".7"/><ellipse cx="{P[0] + 56}" cy="{P[1] + 46}" rx="18" ry="8" fill="#e8a080" opacity=".7"/><circle cx="{P[0] + 150}" cy="{P[1] + 120}" r="{P[2] * 1.05:.0f}" fill="#2a1a3a" opacity=".18" filter="url(#b8)"/></g>'
             + f'<circle cx="{P[0]}" cy="{P[1]}" r="{P[2]}" fill="none" stroke="#ffe8c8" stroke-width="4" opacity=".4" filter="url(#b4)"/>')
    g.append(f'<g transform="rotate(-14 {P[0]} {P[1]})"><g clip-path="url(#rf)">{rings}</g></g>')
    g.append('<circle cx="420" cy="300" r="34" fill="#8ab0d8"/><path d="M386 300 A34 34 0 0 0 454 300 A34 18 0 0 1 386 300 Z" fill="#5a80b0" opacity=".5"/><circle cx="420" cy="300" r="34" fill="none" stroke="#cfe2ff" stroke-width="3" opacity=".4" filter="url(#b2)"/>')
    M = (240, 1160, 190)   # a small cratered moon in front
    g.append(f'<clipPath id="mc"><circle cx="{M[0]}" cy="{M[1]}" r="{M[2]}"/></clipPath><circle cx="{M[0]}" cy="{M[1]}" r="{M[2]}" fill="#9a9ab2"/><g clip-path="url(#mc)">'
             + ''.join(f'<circle cx="{M[0] + x}" cy="{M[1] + y}" r="{r}" fill="#86869e"/><circle cx="{M[0] + x - r * .2:.0f}" cy="{M[1] + y - r * .2:.0f}" r="{r * .75:.0f}" fill="#7a7a92"/><path d="M{M[0] + x - r} {M[1] + y} A{r} {r} 0 0 0 {M[0] + x + r} {M[1] + y}" stroke="#b8b8ce" stroke-width="2" fill="none" opacity=".6"/>' for x, y, r in ((-70, -130, 26), (40, -110, 16), (90, -40, 34), (-110, -40, 18), (-20, -60, 12), (0, -160, 9)))
             + f'<circle cx="{M[0] + 80}" cy="{M[1] + 60}" r="{M[2]}" fill="#1a1a30" opacity=".45"/></g><circle cx="{M[0]}" cy="{M[1]}" r="{M[2]}" fill="none" stroke="#d8d8f0" stroke-width="5" opacity=".45" filter="url(#b4)"/>')
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s107 不死鳥
def phoenix_dawn():
    """不死鳥: a blazing dawn — crimson and gold sky over dark mountain ridges, rays from the rising sun (the phoenix flies across trailing fire, embers rise: the page's)"""
    d = BLUR + lin('sky', [(0, '#3a1a3e'), (.3, '#8a2a4a'), (.55, '#e85a3a'), (.72, '#f6a04a'), (.82, '#fcd27a')])
    g = [f'<rect width="{VW}" height="{VH}" fill="url(#sky)"/>', glow(960, 860, 900, 300, '#ffd27a', .7, 'b60'), '<circle cx="960" cy="880" r="150" fill="#fff0c0" opacity=".9" filter="url(#b8)"/>']
    g.append(''.join(f'<path d="M960 880 L{960 + 1600 * math.cos(a):.0f} {880 + 1600 * math.sin(a):.0f} L{960 + 1600 * math.cos(a + .05):.0f} {880 + 1600 * math.sin(a + .05):.0f} Z" fill="#ffe0a0" opacity=".14" filter="url(#b8)"/>' for a in [-math.pi + .2 + k * .22 for k in range(13)]))
    for y, amp, c, sd, n in ((860, 70, '#8a3a4a', 1071, 7), (920, 60, '#5a2440', 1072, 8), (1000, 50, '#3a1830', 1073, 9)):
        g.append(band(y, amp, c, sd, n))
    g.append(clouds_soft(1074, 8, 600, 820, '#f6806a', .35, 140, 260, 'b16'))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s108 夢の羊
def dream_sheep():
    """夢の羊: a pastel night of soft cloud hills, a sleepy crescent moon, a little fence on the clouds (sheep leap the fence one by one, stars twinkle, Zzz floats: the page's)"""
    d = BLUR + lin('sky', [(0, '#3a3a7a'), (.5, '#7a6aaa'), (.8, '#c8a8d6'), (1, '#f0d6e6')])
    g = [f'<rect width="{VW}" height="{VH}" fill="url(#sky)"/>', stars(220, 108, 0, 800, '#fff6e6', .08)]
    M = (1460, 300)   # the moon in a nightcap
    g.append(glow(M[0], M[1], 220, 220, '#fff2c8', .4, 'b30') + f'<path d="M{M[0] - 110} {M[1] - 60} A130 130 0 1 0 {M[0] + 60} {M[1] + 110} A110 110 0 1 1 {M[0] - 110} {M[1] - 60} Z" fill="#fff2c8"/>'
             f'<path d="M{M[0] - 96} {M[1] - 92} C{M[0] - 40} {M[1] - 160} {M[0] + 60} {M[1] - 170} {M[0] + 120} {M[1] - 120} L{M[0] - 50} {M[1] - 40} Z" fill="#8a9ae0"/><circle cx="{M[0] + 130}" cy="{M[1] - 116}" r="22" fill="#ffffff"/><path d="M{M[0] - 30} {M[1] + 20} q16 10 32 0" stroke="#c8a870" stroke-width="5" fill="none"/>')
    for y, c, op, sd, n in ((820, '#d8c4ea', .8, 1081, 9), (900, '#ead8f2', .9, 1082, 10), (990, '#f6e8f6', 1, 1083, 11), (1090, '#fff4fa', 1, 1084, 12)):
        r = RNG(sd); blobs = ''
        x = -100
        while x < 2020:
            s = 90 + r.random() * 90; blobs += f'<circle cx="{x:.0f}" cy="{y + r.random() * 30:.0f}" r="{s:.0f}"/>'; x += s * 1.2
        g.append(f'<g fill="{c}" opacity="{op}" filter="url(#b4)">{blobs}<rect x="-100" y="{y}" width="2120" height="{VH - y + 50}"/></g>')
    F = (960, 1000)   # the fence
    g.append(''.join(f'<rect x="{F[0] - 110 + i * 70}" y="{F[1] - 120}" width="18" height="130" rx="8" fill="#f6e0c0"/><path d="M{F[0] - 110 + i * 70} {F[1] - 120} l9 -16 l9 16 Z" fill="#f6e0c0"/>' for i in range(4)) + f'<rect x="{F[0] - 124}" y="{F[1] - 90}" width="250" height="14" rx="7" fill="#ead2b0"/><rect x="{F[0] - 124}" y="{F[1] - 40}" width="250" height="14" rx="7" fill="#ead2b0"/>')
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s109 七夕
def tanabata():
    """七夕: the Milky Way pouring across a deep blue summer night, Vega and Altair shining on either bank, bamboo at the sides (the paper wishes sway, magpies fly, the two stars glow, fireflies: the page's)"""
    d = BLUR + lin('sky', [(0, '#0a1234'), (.6, '#1a2a5a'), (1, '#2a3a6a')]) + rad('mw', [(0, '#e6eaff', .55), (.5, '#a9b8f0', .2), (1, '#a9b8f0', 0)])
    g = [f'<rect width="{VW}" height="{VH}" fill="url(#sky)"/>', '<ellipse cx="960" cy="520" rx="1300" ry="230" transform="rotate(-62 960 520)" fill="url(#mw)" filter="url(#b16)"/>', stars(620, 109, 0, 1100, '#f2f4ff', .05)]
    r = RNG(1091)
    g.append(''.join(f'<circle cx="{960 + t * 1100 * math.cos(-1.08) + (r.random() - .5) * 300:.0f}" cy="{520 + t * 1100 * math.sin(-1.08) + (r.random() - .5) * 300:.0f}" r="{.6 + r.random() * 1.6:.1f}" fill="#ffffff" opacity="{.3 + r.random() * .6:.2f}"/>' for t in [(-1 + 2 * k / 600) for k in range(600)]))
    g.append(band(1060, 30, '#121a3a', 1092, 7))
    rb = RNG(1093)
    for x0, side in ((90, 1), (1830, -1)):   # bamboo: stalks leaning in, nodes, drooping sprays of leaves (the paper wishes hang from them: the page's)
        for k in range(3):
            x = x0 + side * k * 64; lean = side * (40 + k * 30)
            g.append(f'<path d="M{x} 1200 Q{x + lean * .3:.0f} 600 {x + lean:.0f} -20" stroke="#2e5a4a" stroke-width="{20 - k * 4}" fill="none"/>')
            g.append(''.join(f'<ellipse cx="{x + lean * (1 - yy / 1200) ** 1.6:.0f}" cy="{yy}" rx="{12 - k * 2}" ry="3" fill="#4a7a62"/>' for yy in range(100, 1200, 150)))
        for _ in range(16):
            yy = 40 + rb.random() * 820; bx = x0 + side * (30 + rb.random() * 120)
            for j2 in range(4):
                a = (.15 + j2 * .22 + rb.random() * .1) * (1 if side > 0 else -1); L = 70 + rb.random() * 40
                ex, ey = bx + math.cos(a) * L * side, yy + math.sin(abs(a)) * L * .9 + 20
                g.append(f'<path d="M{bx:.0f} {yy:.0f} Q{(bx + ex) / 2 + side * 6:.0f} {(yy + ey) / 2 - 14:.0f} {ex:.0f} {ey:.0f} Q{(bx + ex) / 2 - side * 2:.0f} {(yy + ey) / 2 + 6:.0f} {bx:.0f} {yy:.0f} Z" fill="{["#3e7a5e", "#4a8a6a", "#356a52"][j2 % 3]}"/>')
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s110 雷の夜
def thunder_night():
    """雷の夜: a storm over dark plains — towering clouds lit from within, distant hills, a lone tree and a farmhouse with a warm window (lightning bolts strike and flash, rain sweeps: the page's)"""
    d = BLUR + lin('sky', [(0, '#1a1e34'), (.5, '#2e3450'), (.8, '#4a4e66'), (1, '#5a5a6a')])
    g = [f'<rect width="{VW}" height="{VH}" fill="url(#sky)"/>']
    r = RNG(110)
    for layer, (n, y0, y1, c, op) in enumerate(((10, 80, 360, '#3a3e5a', .9), (9, 200, 560, '#4a4e6e', .9), (8, 380, 700, '#585c7a', .8))):
        g.append(clouds_soft(1100 + layer, n, y0, y1, c, op, 180, 340, 'b16'))
    g.append(glow(1300, 420, 380, 220, '#a8b8f0', .22, 'b60') + glow(500, 300, 300, 180, '#a8b8f0', .15, 'b60'))
    g.append(band(880, 40, '#2a2e40', 1104, 6)); g.append(band(940, 30, '#22263a', 1105, 8))
    g.append('<path d="M-40 1200 L-40 980 C500 960 1300 960 1960 990 L1960 1200 Z" fill="#1c2030"/>')
    g.append('<path d="M640 1000 C650 900 630 820 660 760 M650 860 C600 820 560 830 520 790 M655 820 C700 780 740 790 770 750" stroke="#141826" stroke-width="16" fill="none" stroke-linecap="round"/><g fill="#1a1e2e">' + ''.join(f'<circle cx="{x}" cy="{y}" r="{s}"/>' for x, y, s in ((660, 740, 60), (600, 770, 50), (720, 760, 50), (540, 790, 40), (770, 740, 40))) + '</g>')
    H = (1400, 990)
    g.append(f'<rect x="{H[0] - 90}" y="{H[1] - 80}" width="180" height="80" fill="#2a2a3a"/><path d="M{H[0] - 110} {H[1] - 74} L{H[0]} {H[1] - 140} L{H[0] + 110} {H[1] - 74} Z" fill="#20202e"/><rect x="{H[0] - 50}" y="{H[1] - 56}" width="34" height="30" fill="#ffc87a"/>' + glow(H[0] - 33, H[1] - 40, 70, 40, '#ffc87a', .4, 'b16'))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s111 お菓子の国
def candy_land():
    """お菓子の国: cupcake hills, a chocolate river with a biscuit bridge, lollipop trees, a gingerbread house, candy-striped poles, pink sky (the river flows, cotton-candy clouds drift, gumdrops bounce, sprinkles fall: the page's)"""
    d = BLUR + lin('sky', [(0, '#f6b8d6'), (.5, '#fcd8e6'), (.8, '#fff0e6'), (1, '#fff6ea')]) + lin('choc', [(0, '#8a5440'), (1, '#6a3e30')])
    g = [f'<rect width="{VW}" height="{VH}" fill="url(#sky)"/>', glow(1500, 200, 400, 200, '#ffffff', .6, 'b60')]
    def cupcake(x, y, s, frost, case='#f6c8a0'):
        return (f'<path d="M{x - s:.0f} {y - s * .6:.0f} L{x + s:.0f} {y - s * .6:.0f} L{x + s * .8:.0f} {y:.0f} L{x - s * .8:.0f} {y:.0f} Z" fill="{case}"/>' + ''.join(f'<path d="M{x - s + k * s / 4:.0f} {y - s * .6:.0f} L{x - s * .8 + k * s * .2:.0f} {y:.0f}" stroke="#e8b088" stroke-width="{s * .04:.1f}"/>' for k in range(9))
                + f'<path d="M{x - s * 1.05:.0f} {y - s * .6:.0f} C{x - s * 1.1:.0f} {y - s * 1.2:.0f} {x - s * .5:.0f} {y - s * 1.1:.0f} {x - s * .4:.0f} {y - s * 1.3:.0f} C{x - s * .2:.0f} {y - s * 1.7:.0f} {x + s * .4:.0f} {y - s * 1.6:.0f} {x + s * .4:.0f} {y - s * 1.3:.0f} C{x + s * .6:.0f} {y - s * 1.2:.0f} {x + s * 1.1:.0f} {y - s * 1.2:.0f} {x + s * 1.05:.0f} {y - s * .6:.0f} Z" fill="{frost}"/>'
                + f'<circle cx="{x:.0f}" cy="{y - s * 1.7:.0f}" r="{s * .18:.0f}" fill="#e8404a"/>')
    g.append(cupcake(260, 820, 200, '#fbe2f0') + cupcake(1700, 800, 240, '#e2f0fb') + cupcake(820, 760, 130, '#fff2c8'))
    g.append('<path d="M-40 1200 L-40 800 C500 770 1300 770 1960 800 L1960 1200 Z" fill="#c8ecc8"/>' + ''.join(f'<circle cx="{x}" cy="{y}" r="{s}" fill="{c}"/>' for x, y, s, c in ((120, 860, 14, '#f6a8c8'), (380, 900, 12, '#a8d8f6'), (1500, 880, 14, '#f6d68a'), (1780, 920, 12, '#c8a8f6'))))
    g.append('<path d="M-40 1000 C400 960 800 1060 1200 1010 C1500 970 1760 1000 1960 980 L1960 1110 C1760 1130 1500 1100 1200 1140 C800 1190 400 1090 -40 1130 Z" fill="url(#choc)"/>')
    g.append('<path d="M860 1080 Q960 980 1060 1080" stroke="#e8c088" stroke-width="44" fill="none"/>' + ''.join(f'<circle cx="{960 + 92 * math.cos(a):.0f}" cy="{1080 - 92 * math.sin(a) * 1.05:.0f}" r="4" fill="#c49060"/>' for a in [k * math.pi / 10 for k in range(1, 10)]))
    H = (1300, 900)   # gingerbread house
    g.append(f'<rect x="{H[0] - 120}" y="{H[1] - 150}" width="240" height="150" fill="#c4844e"/><path d="M{H[0] - 160} {H[1] - 140} L{H[0]} {H[1] - 280} L{H[0] + 160} {H[1] - 140} Z" fill="#a86a3e"/><path d="M{H[0] - 166} {H[1] - 136} L{H[0]} {H[1] - 286} L{H[0] + 166} {H[1] - 136}" stroke="#ffffff" stroke-width="14" fill="none" stroke-linejoin="round" stroke-dasharray="18 10"/>'
             f'<rect x="{H[0] - 30}" y="{H[1] - 90}" width="60" height="90" rx="30" fill="#f6a8c8"/><rect x="{H[0] - 100}" y="{H[1] - 120}" width="46" height="40" fill="#fff2c8"/><rect x="{H[0] + 54}" y="{H[1] - 120}" width="46" height="40" fill="#fff2c8"/>' + ''.join(f'<circle cx="{H[0] - 100 + k * 40}" cy="{H[1] - 150}" r="9" fill="{["#e8404a", "#5ac85a", "#f6d05a", "#5aa8e8"][k % 4]}"/>' for k in range(6)))
    def lolly(x, y, s, c):   # (the swirl on the candy turns: the page's)
        return f'<rect x="{x - s * .05:.0f}" y="{y - s * 1.2:.0f}" width="{s * .1:.0f}" height="{s * 1.2:.0f}" fill="#fbf6ee"/><circle cx="{x}" cy="{y - s * 1.4:.0f}" r="{s * .4:.0f}" fill="{c}"/>'
    g.append(lolly(520, 980, 160, '#f6a8c8') + lolly(640, 960, 110, '#a8d8f6') + lolly(1640, 990, 150, '#c8a8f6') + lolly(1820, 1000, 120, '#f6d68a'))
    g.append(''.join(f'<rect x="{x - 10}" y="{y - h}" width="20" height="{h}" fill="#ffffff"/>' + ''.join(f'<path d="M{x - 10} {y - h + k * 24 + 8} l20 -10" stroke="#e8404a" stroke-width="8"/>' for k in range(int(h // 24))) for x, y, h in ((120, 1200, 180), (1100, 1200, 140))))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s112 魔法使いの部屋
def wizard_room():
    """魔法使いの部屋: a round tower study at night — tall bookshelves, a round window with the moon, a desk with a crystal ball, a cauldron on embers (books and candles float, the cauldron bubbles, the ball glows, sparkles drift: the page's)"""
    d = BLUR + lin('wall', [(0, '#2a2448'), (1, '#3e3258')]) + rad('ball', [(0, '#e6d8ff', 1), (.6, '#a088f0', .9), (1, '#6a50c0', .9)], .4, .35, .7)
    g = ['<rect width="1920" height="1200" fill="url(#wall)"/>']
    W = (960, 360, 230)   # the round window
    g.append(f'<circle cx="{W[0]}" cy="{W[1]}" r="{W[2] + 30}" fill="#5a4a6a"/><circle cx="{W[0]}" cy="{W[1]}" r="{W[2]}" fill="#1a2250"/>' + stars(0, 0, 0, 0) + f'<circle cx="{W[0] + 70}" cy="{W[1] - 60}" r="70" fill="#fff2c8"/>' + glow(W[0] + 70, W[1] - 60, 140, 140, '#fff2c8', .4, 'b16')
             + f'<path d="M{W[0] - W[2]} {W[1]} L{W[0] + W[2]} {W[1]} M{W[0]} {W[1] - W[2]} L{W[0]} {W[1] + W[2]}" stroke="#5a4a6a" stroke-width="16"/>')
    r = RNG(112)
    g.append(''.join(f'<circle cx="{W[0] + (r.random() - .5) * 380:.0f}" cy="{W[1] + (r.random() - .5) * 380:.0f}" r="{1 + r.random() * 1.6:.1f}" fill="#ffffff" opacity="{.4 + r.random() * .5:.2f}"/>' for _ in range(60)))
    for x0 in (60, 1460):   # bookshelves
        g.append(f'<rect x="{x0}" y="80" width="400" height="900" fill="#4a3428"/>')
        for k in range(6):
            y = 120 + k * 140; xx = x0 + 20
            while xx < x0 + 380:
                w = 18 + r.random() * 22; h = 80 + r.random() * 40
                g.append(f'<rect x="{xx:.0f}" y="{y + 120 - h:.0f}" width="{w:.0f}" height="{h:.0f}" fill="{["#8a4a5a", "#4a6a8a", "#6a8a5a", "#a88a4a", "#7a5a9a", "#a85a4a"][int(r.random() * 6)]}"/><rect x="{xx:.0f}" y="{y + 130 - h:.0f}" width="{w:.0f}" height="4" fill="#e8c88a" opacity=".6"/>'); xx += w + 3
            g.append(f'<rect x="{x0}" y="{y + 120}" width="400" height="16" fill="#3a2820"/>')
    g.append('<rect x="0" y="980" width="1920" height="220" fill="#3a2a3a"/><ellipse cx="960" cy="1120" rx="520" ry="70" fill="#6a3a5a" opacity=".6"/>')
    D = (960, 900)   # desk with the crystal ball
    g.append(f'<rect x="{D[0] - 260}" y="{D[1]}" width="520" height="30" fill="#6a4a38"/><rect x="{D[0] - 240}" y="{D[1] + 30}" width="24" height="120" fill="#5a3e30"/><rect x="{D[0] + 216}" y="{D[1] + 30}" width="24" height="120" fill="#5a3e30"/>'
             f'<path d="M{D[0] - 46} {D[1]} L{D[0] - 30} {D[1] - 24} L{D[0] + 30} {D[1] - 24} L{D[0] + 46} {D[1]} Z" fill="#c8a060"/><circle cx="{D[0]}" cy="{D[1] - 84}" r="64" fill="url(#ball)"/><ellipse cx="{D[0] - 22}" cy="{D[1] - 110}" rx="16" ry="10" fill="#ffffff" opacity=".6"/>'
             f'<rect x="{D[0] - 220}" y="{D[1] - 40}" width="110" height="40" fill="#8a4a5a"/><rect x="{D[0] - 214}" y="{D[1] - 70}" width="100" height="30" fill="#4a6a8a"/><path d="M{D[0] + 120} {D[1]} L{D[0] + 200} {D[1] - 10} L{D[0] + 200} {D[1]} Z" fill="#f2e6c8"/>')
    C = (1500, 1080)   # the cauldron
    g.append(f'<ellipse cx="{C[0]}" cy="{C[1] + 40}" rx="140" ry="24" fill="#ff8a4a" opacity=".5" filter="url(#b16)"/><path d="M{C[0] - 130} {C[1] - 80} C{C[0] - 150} {C[1] + 20} {C[0] - 60} {C[1] + 50} {C[0]} {C[1] + 50} C{C[0] + 60} {C[1] + 50} {C[0] + 150} {C[1] + 20} {C[0] + 130} {C[1] - 80} Z" fill="#2a2a34"/><ellipse cx="{C[0]}" cy="{C[1] - 80}" rx="134" ry="26" fill="#3a3a46"/><ellipse cx="{C[0]}" cy="{C[1] - 76}" rx="116" ry="18" fill="#7ae08a"/>' + glow(C[0], C[1] - 100, 160, 80, '#7ae08a', .35, 'b16'))
    return doc(d, ''.join(g))

UR4 = {'s101': dragon_peaks, 's102': sky_islands, 's103': glow_mushrooms, 's104': airship_port, 's105': clockwork, 's106': ringed_planet,
       's107': phoenix_dawn, 's108': dream_sheep, 's109': tanabata, 's110': thunder_night, 's111': candy_land, 's112': wizard_room}

if __name__ == '__main__':
    ids = [a for a in sys.argv[1:] if a in UR4] or list(UR4)
    for i, im in zip(ids, render([(UR4[i](), OW, OH) for i in ids])):
        save(i, finish(im, int(i[1:])), 'cover', q=82)

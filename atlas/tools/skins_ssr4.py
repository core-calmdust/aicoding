#!/usr/bin/env python3
"""Portal skins, 2026-11-20 second wave of SSR scenes (s113–s144): one picture each, flat picture-book style with
soft light (glows, haze in the distance) so they are a step above the first wave. Deserts and the sea are avoided.
Whatever moves (clouds, birds, the tram, the bullet train, leaves, petals, steam, skiers …) is drawn by the page
(atlas/skins-fx.js) and left out here. Run from the repo root: python3 atlas/tools/skins_ssr4.py [id …]"""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from skins import RNG, save
from skins_ssr2 import doc, lin, smooth_path, render, finish, VW, VH, OW, OH

BLUR = ''.join(f'<filter id="b{s}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="{s}"/></filter>' for s in (2, 4, 8, 16, 30, 60))

def sky(stops, extra=''):
    return BLUR + lin('sky', stops) + extra, f'<rect width="{VW}" height="{VH}" fill="url(#sky)"/>'

def ridge(y, amp, seed, n=7, bottom=VH, x0=-80, x1=VW + 80):
    r = RNG(seed); pts = [(x0 + i * (x1 - x0) / (n - 1), y + (r.random() - .5) * 2 * amp) for i in range(n)]
    return smooth_path(pts, bottom)

def band(y, amp, col, seed, n=7, op=1, blur=None, bottom=VH):
    f = f' filter="url(#{blur})"' if blur else ''
    return f'<path d="{ridge(y, amp, seed, n, bottom)}" fill="{col}" opacity="{op}"{f}/>'

def glow(cx, cy, rx, ry, col, op, blur='b30'):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{col}" opacity="{op}" filter="url(#{blur})"/>'

def haze(y0, y1, col, op):
    return f'<rect x="-40" y="{y0}" width="{VW + 80}" height="{y1 - y0}" fill="{col}" opacity="{op}" filter="url(#b30)"/>'

def round_tree(x, y, s, c, trunk='#a98b74', shade=None):
    sh = shade or c
    return (f'<rect x="{x - s * .07:.0f}" y="{y - s * .5:.0f}" width="{s * .14:.0f}" height="{s * .5:.0f}" rx="{s * .05:.0f}" fill="{trunk}"/>'
            f'<circle cx="{x:.0f}" cy="{y - s * .82:.0f}" r="{s * .42:.0f}" fill="{sh}"/><circle cx="{x - s * .26:.0f}" cy="{y - s * .66:.0f}" r="{s * .3:.0f}" fill="{c}"/>'
            f'<circle cx="{x + s * .24:.0f}" cy="{y - s * .7:.0f}" r="{s * .3:.0f}" fill="{c}"/><circle cx="{x - s * .05:.0f}" cy="{y - s * .95:.0f}" r="{s * .3:.0f}" fill="{c}"/>')

def pine(x, y, h, c, c2=None, snow=False):
    w = h * .42; out = f'<rect x="{x - h * .03:.0f}" y="{y - h * .14:.0f}" width="{h * .06:.0f}" height="{h * .14:.0f}" fill="#8f7766"/>'
    for k in range(3):
        top = y - h + k * h * .24; bot = y - h * .12 - (2 - k) * h * .2; ww = w * (.55 + k * .22)
        out += f'<path d="M{x:.0f} {top:.0f} L{x + ww:.0f} {bot:.0f} L{x - ww:.0f} {bot:.0f} Z" fill="{c}"/>'
        if c2: out += f'<path d="M{x:.0f} {top:.0f} L{x + ww:.0f} {bot:.0f} L{x:.0f} {bot:.0f} Z" fill="{c2}"/>'
        if snow: out += f'<path d="M{x:.0f} {top:.0f} L{x + ww * .35:.0f} {top + (bot - top) * .35:.0f} L{x - ww * .35:.0f} {top + (bot - top) * .35:.0f} Z" fill="#ffffff"/>'
    return out

def stars(n, seed, y0, y1, col='#fff6e6'):
    r = RNG(seed)
    return ''.join(f'<circle cx="{r.random() * VW:.0f}" cy="{y0 + r.random() * (y1 - y0):.0f}" r="{.6 + r.random() ** 3 * 1.8:.1f}" fill="{col}" opacity="{.3 + r.random() * .6:.2f}"/>' for _ in range(n))

# ------------------------------------------------------------------------------------------------ s113 竹林
def bamboo():
    """竹林: a path into a tall bamboo grove, light falling through from above, a small stone lantern"""
    d, b = sky([(0, '#dfeedd'), (.5, '#eef5e6'), (1, '#f4f6e8')])
    g = [b, glow(960, 200, 700, 260, '#fffbe6', .8, 'b60')]
    r = RNG(113)
    for layer, (n, wmin, wmax, cols, op) in enumerate(((26, 14, 22, ('#c9dcc0', '#bcd3b3'), .9), (18, 22, 34, ('#a9c79f', '#9cbd93'), 1), (10, 36, 52, ('#86b07f', '#79a574'), 1))):
        for _ in range(n):
            x = r.random() * VW
            if layer == 2 and 700 < x < 1220: continue   # keep the path open
            w = wmin + r.random() * (wmax - wmin); c = cols[int(r.random() * 2)]; lean = (r.random() - .5) * 40
            g.append(f'<path d="M{x:.0f} 1200 L{x + lean:.0f} -20 L{x + lean + w:.0f} -20 L{x + w:.0f} 1200 Z" fill="{c}" opacity="{op}"/>')
            for k in range(1, 9):   # nodes
                yy = 1200 - k * (130 + layer * 20) + r.random() * 30; xx = x + lean * (1 - yy / 1200)
                g.append(f'<rect x="{xx - 2:.0f}" y="{yy:.0f}" width="{w + 4:.0f}" height="{4 + layer:.0f}" rx="2" fill="#e8f0dc" opacity=".55"/>')
            if r.random() < .6:   # a spray of leaves
                yy = 120 + r.random() * 600; xx = x + lean * (1 - yy / 1200) + w / 2; sgn = 1 if r.random() < .5 else -1
                g.append(''.join(f'<path d="M{xx:.0f} {yy:.0f} q{sgn * (30 + i * 14):.0f} {-10 + i * 12:.0f} {sgn * (70 + i * 18):.0f} {6 + i * 16:.0f} q{-sgn * 34:.0f} {2:.0f} {-sgn * (70 + i * 18):.0f} {-(6 + i * 16):.0f} Z" fill="{cols[1]}"/>' for i in range(3)))
        if layer == 0: g.append(haze(0, 1200, '#f4f8ec', .35))
    g.append(''.join(f'<path d="M{x} -40 L{x + w} -40 L{x + w * 2.2 + 120} 1200 L{x + w + 120} 1200 Z" fill="#fffbe6" opacity=".22" filter="url(#b16)"/>' for x, w in ((760, 70), (980, 50), (1120, 40))))
    g.append('<path d="M700 1200 C800 1080 900 1000 940 930 C950 910 970 910 980 930 C1010 1000 1100 1080 1240 1200 Z" fill="#e3dcc4"/><path d="M800 1200 C880 1090 930 1010 955 935 C962 922 966 922 972 935 C990 1010 1050 1090 1140 1200 Z" fill="#eee7d2"/>')
    g.append(''.join(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{rx * .35:.0f}" fill="#d9d2bd"/>' for x, y, rx in ((930, 1150, 34), (985, 1090, 26), (948, 1030, 20), (972, 980, 15))))
    X, Y = 1240, 1130   # stone lantern
    g.append(f'<rect x="{X - 40}" y="{Y - 10}" width="80" height="16" rx="4" fill="#b9b3a2"/><rect x="{X - 14}" y="{Y - 90}" width="28" height="82" fill="#c9c3b2"/><rect x="{X - 36}" y="{Y - 110}" width="72" height="22" rx="4" fill="#b9b3a2"/>'
             f'<rect x="{X - 26}" y="{Y - 168}" width="52" height="58" fill="#d4cebd"/><rect x="{X - 12}" y="{Y - 156}" width="24" height="30" rx="3" fill="#ffe6a6"/><path d="M{X - 54} {Y - 166} L{X} {Y - 214} L{X + 54} {Y - 166} Z" fill="#b9b3a2"/>')
    g.append(glow(X, Y - 140, 50, 50, '#ffe6a6', .5, 'b16'))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s114 路面電車の坂道
def tram_hill():
    """路面電車の坂道: a hillside town seen from the side — a street climbs diagonally from lower left to upper right, colourful tiled houses step up above and below it, a church on top (the tram is the page's: it runs along the street y = 1100 − 0.32·x)"""
    d, b = sky([(0, '#c4e0f4'), (.6, '#e8f3f8'), (1, '#f7f4ec')])
    g = [b, glow(1560, 220, 420, 200, '#fff4d8', .7, 'b60')]
    g.append(band(560, 50, '#d6e2e8', 1141, 6))
    cols = ['#f6d79a', '#f2b8a8', '#bcd6ec', '#f7f2e6', '#cfe3c6', '#f3c7a0', '#e9c6d9', '#f8e7b8']
    r = RNG(114)
    def house(x, base, w, h, c, roof='#e39a86'):
        top = base - h
        o = f'<rect x="{x:.0f}" y="{top:.0f}" width="{w:.0f}" height="{h + 400:.0f}" fill="{c}"/>'
        o += f'<path d="M{x - 10:.0f} {top + 4:.0f} L{x + w * .5:.0f} {top - 30:.0f} L{x + w + 10:.0f} {top + 4:.0f} Z" fill="{roof}"/><rect x="{x - 10:.0f}" y="{top:.0f}" width="{w + 20:.0f}" height="8" fill="#d98a76"/>'
        for i in range(max(1, int((w - 20) // 46))):
            for j in range(max(1, int((h - 40) // 66))):
                wx = x + 18 + i * 46; wy = top + 26 + j * 66
                o += f'<rect x="{wx:.0f}" y="{wy:.0f}" width="22" height="34" rx="11" fill="#fbfaf6"/><rect x="{wx + 2:.0f}" y="{wy + 12:.0f}" width="18" height="22" fill="#9fc0d8"/><rect x="{wx - 4:.0f}" y="{wy + 32:.0f}" width="30" height="5" rx="2" fill="#ffffff"/>'
        return o
    # the church crowning the hill (upper right)
    g.append('<rect x="1600" y="330" width="200" height="240" fill="#f6efe2"/><rect x="1650" y="200" width="80" height="150" fill="#f6efe2"/><path d="M1640 200 L1690 130 L1740 200 Z" fill="#e9a596"/><circle cx="1690" cy="250" r="20" fill="#c9dbe8"/><path d="M1590 334 L1700 280 L1810 334 Z" fill="#e9a596"/><rect x="1680" y="490" width="44" height="80" rx="22" fill="#d8c2a6"/>')
    # houses above the street (their fronts stand on the street, stepping up to the right)
    x = -40
    while x < 1600:
        w = 130 + r.random() * 50; base = 1100 - .32 * (x + w / 2) - 14; h = 170 + r.random() * 110
        g.append(house(x, base, w, h, cols[int(r.random() * 8)])); x += w + 4
    # the street: a band climbing to the right, with tram rails and a cable
    g.append('<path d="M-40 1113 L1960 473 L1960 553 L-40 1193 Z" fill="#e6dac4"/>')
    g.append('<path d="M-40 1140 L1960 500" stroke="#b6aa98" stroke-width="5"/><path d="M-40 1166 L1960 526" stroke="#b6aa98" stroke-width="5"/>')
    g.append(''.join(f'<path d="M{x} {1127 - .32 * x:.0f} L{x + 14} {1181 - .32 * x - 4:.0f}" stroke="#d6c9b2" stroke-width="5"/>' for x in range(0, 1960, 44)))
    g.append('<path d="M-40 1020 L1960 380" stroke="#7d7a80" stroke-width="2.5"/>' + ''.join(f'<rect x="{x}" y="{1110 - .32 * x - 110:.0f}" width="6" height="110" fill="#8f8a90"/>' for x in (240, 900, 1560)))
    # houses below the street (only their roofs and top floors show)
    x = -40
    while x < 1960:
        w = 140 + r.random() * 40; top = 1200 - .32 * (x + w / 2) + 10
        g.append(house(x, top + 160, w, 160, cols[int(r.random() * 8)])); x += w + 4
    for x, c in ((120, '#f6b8c2'), (700, '#a9d3bb'), (1260, '#f6d79a')):   # potted flowers on the pavement
        y = 1100 - .32 * x - 12
        g.append(f'<rect x="{x - 14}" y="{y - 22:.0f}" width="28" height="22" rx="4" fill="#d98c6a"/><circle cx="{x - 7}" cy="{y - 28:.0f}" r="11" fill="{c}"/><circle cx="{x + 8}" cy="{y - 30:.0f}" r="10" fill="{c}"/>')
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s115 きのこの村
def mushroom_village():
    """きのこの村: a forest clearing with mushroom houses (round doors, little windows, chimneys), ferns and a winding path"""
    d, b = sky([(0, '#d8ecdf'), (.55, '#eef6e8'), (1, '#f4f2e2')])
    g = [b, glow(960, 160, 900, 300, '#fffbe6', .7, 'b60')]
    r = RNG(115)
    for row, (y, smin, smax, c, c2, n) in enumerate(((700, 160, 240, '#cfe3c6', '#c3dcba', 18), (780, 200, 300, '#b7d6ad', '#a9cda0', 14))):   # forest behind, two rows
        for i in range(n):
            x = i * (VW / (n - 1)) + (r.random() - .5) * 60; sz = smin + r.random() * (smax - smin)
            g.append(round_tree(x, y + r.random() * 30, sz, c, '#b39d86', c2) if r.random() < .6 else pine(x, y + r.random() * 30, sz * 1.3, c2, c))
        g.append(haze(560, y + 40, '#eef6e8', .35 - row * .15))
    g.append(band(860, 26, '#cfe3bf', 1151, 8))
    g.append('<path d="M760 1200 C820 1100 880 1010 900 960 C930 900 1000 880 1060 870 L1110 872 C1040 900 980 940 980 1000 C980 1080 1080 1140 1180 1200 Z" fill="#efe2c4"/>')
    def mush(x, y, s, cap, dots, stem='#fbf2e2', door='#c9a07a'):
        o = f'<path d="M{x - s * .32:.0f} {y:.0f} C{x - s * .36:.0f} {y - s * .5:.0f} {x - s * .3:.0f} {y - s * .7:.0f} {x - s * .26:.0f} {y - s * .76:.0f} L{x + s * .26:.0f} {y - s * .76:.0f} C{x + s * .3:.0f} {y - s * .7:.0f} {x + s * .36:.0f} {y - s * .5:.0f} {x + s * .32:.0f} {y:.0f} Z" fill="{stem}"/>'
        o += f'<path d="M{x - s * .32:.0f} {y - s * .2:.0f} C{x - s * .1:.0f} {y - s * .26:.0f} {x + s * .1:.0f} {y - s * .26:.0f} {x + s * .32:.0f} {y - s * .2:.0f} L{x + s * .32:.0f} {y:.0f} L{x - s * .32:.0f} {y:.0f} Z" fill="#f2e2c8"/>'
        o += f'<path d="M{x - s * .1:.0f} {y:.0f} L{x - s * .1:.0f} {y - s * .2:.0f} A{s * .1:.0f} {s * .1:.0f} 0 0 1 {x + s * .1:.0f} {y - s * .2:.0f} L{x + s * .1:.0f} {y:.0f} Z" fill="{door}"/><circle cx="{x + s * .05:.0f}" cy="{y - s * .1:.0f}" r="{s * .015 + 1:.0f}" fill="#f6d79a"/>'
        o += f'<circle cx="{x + s * .2:.0f}" cy="{y - s * .48:.0f}" r="{s * .07:.0f}" fill="#ffe6a6"/><path d="M{x + s * .13:.0f} {y - s * .48:.0f} L{x + s * .27:.0f} {y - s * .48:.0f} M{x + s * .2:.0f} {y - s * .55:.0f} L{x + s * .2:.0f} {y - s * .41:.0f}" stroke="{stem}" stroke-width="3"/>'
        o += f'<rect x="{x - s * .28:.0f}" y="{y - s * 1.18:.0f}" width="{s * .09:.0f}" height="{s * .26:.0f}" fill="#b5a08a"/>'
        o += f'<path d="M{x - s * .62:.0f} {y - s * .66:.0f} C{x - s * .66:.0f} {y - s * 1.2:.0f} {x + s * .66:.0f} {y - s * 1.2:.0f} {x + s * .62:.0f} {y - s * .66:.0f} C{x + s * .3:.0f} {y - s * .58:.0f} {x - s * .3:.0f} {y - s * .58:.0f} {x - s * .62:.0f} {y - s * .66:.0f} Z" fill="{cap}"/>'
        o += ''.join(f'<ellipse cx="{x + dx * s:.0f}" cy="{y - dy * s:.0f}" rx="{rr * s:.0f}" ry="{rr * s * .8:.0f}" fill="{dots}"/>' for dx, dy, rr in ((-.32, .82, .08), (.02, .96, .1), (.34, .8, .07), (-.06, .74, .05), (.48, .7, .04)))
        return o
    for x, y, s, cap in ((420, 1040, 300, '#ec9d92'), (1450, 1010, 330, '#f3b97e'), (1760, 1120, 220, '#e9a3bf'), (180, 1150, 200, '#c9b4e3')):
        g.append(mush(x, y, s, cap, '#fff6ea'))
    for x, y, s in ((640, 1150, 60), (1240, 1130, 50), (1080, 1180, 40), (900, 1100, 34)):   # tiny wild mushrooms
        g.append(f'<rect x="{x - s * .08:.0f}" y="{y - s * .5:.0f}" width="{s * .16:.0f}" height="{s * .5:.0f}" fill="#fbf2e2"/><path d="M{x - s * .4:.0f} {y - s * .45:.0f} C{x - s * .4:.0f} {y - s * .9:.0f} {x + s * .4:.0f} {y - s * .9:.0f} {x + s * .4:.0f} {y - s * .45:.0f} Z" fill="#ec9d92"/>')
    for x, y in ((60, 1200), (300, 1200), (600, 1200), (1300, 1200), (1620, 1200), (1900, 1200), (1180, 1200)):   # ferns
        g.append(''.join(f'<path d="M{x} {y} Q{x + a * 40:.0f} {y - 80:.0f} {x + a * 110:.0f} {y - 120 + abs(a) * 30:.0f}" stroke="#8fbf86" stroke-width="10" fill="none" stroke-linecap="round"/>' for a in (-1, -.5, 0, .5, 1)))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s116 いちょう並木
def ginkgo_avenue():
    """いちょう並木: an avenue of golden ginkgo trees narrowing into the distance, a yellow carpet of leaves, benches and street lamps"""
    d, b = sky([(0, '#d6e6f2'), (.55, '#f0f2ea'), (1, '#fbf1da')])
    g = [b, glow(960, 520, 600, 220, '#fff3c8', .7, 'b60')]
    g.append(band(640, 20, '#dfe3e2', 1161, 6))
    g.append('<path d="M0 1200 L860 700 L1060 700 L1920 1200 Z" fill="#f3e2b0"/><path d="M640 1200 L920 700 L1000 700 L1280 1200 Z" fill="#ece0c8"/>')
    for side in (-1, 1):   # trees, far to near
        for k in range(9):
            t = k / 8; s = 60 + t ** 1.6 * 420
            x = 960 + side * (60 + t ** 1.4 * 900); y = 700 + t ** 1.5 * 520
            c, c2 = ('#f6cf5a', '#f2c040') if k % 2 else ('#f8d86e', '#f0c447')
            g.append(f'<rect x="{x - s * .05:.0f}" y="{y - s * .55:.0f}" width="{s * .1:.0f}" height="{s * .55:.0f}" fill="#9b8466"/>')
            g.append(f'<path d="M{x:.0f} {y - s * 1.9:.0f} C{x + s * .5:.0f} {y - s * 1.6:.0f} {x + s * .55:.0f} {y - s * .9:.0f} {x + s * .3:.0f} {y - s * .5:.0f} L{x - s * .3:.0f} {y - s * .5:.0f} C{x - s * .55:.0f} {y - s * .9:.0f} {x - s * .5:.0f} {y - s * 1.6:.0f} {x:.0f} {y - s * 1.9:.0f} Z" fill="{c}"/>')
            g.append(f'<path d="M{x:.0f} {y - s * 1.9:.0f} C{x + s * .5:.0f} {y - s * 1.6:.0f} {x + s * .55:.0f} {y - s * .9:.0f} {x + s * .3:.0f} {y - s * .5:.0f} L{x + s * .02:.0f} {y - s * .5:.0f} C{x + s * .2:.0f} {y - s * 1.0:.0f} {x + s * .16:.0f} {y - s * 1.5:.0f} {x:.0f} {y - s * 1.9:.0f} Z" fill="{c2}"/>')
            if k in (3, 6):   # street lamp between trees
                lx = x - side * s * .5; ls = s * .9
                g.append(f'<rect x="{lx - 3:.0f}" y="{y - ls * 1.2:.0f}" width="6" height="{ls * 1.2:.0f}" fill="#6f7a8c"/><rect x="{lx - ls * .06:.0f}" y="{y - ls * 1.3:.0f}" width="{ls * .12:.0f}" height="{ls * .12:.0f}" rx="4" fill="#fff1c4"/>')
            if k == 7:
                bx = x - side * s * .7
                g.append(f'<rect x="{bx - 70:.0f}" y="{y - 60:.0f}" width="140" height="14" rx="5" fill="#b08a64"/><rect x="{bx - 70:.0f}" y="{y - 86:.0f}" width="140" height="12" rx="5" fill="#b08a64"/><rect x="{bx - 60:.0f}" y="{y - 46:.0f}" width="8" height="46" fill="#6f7a8c"/><rect x="{bx + 52:.0f}" y="{y - 46:.0f}" width="8" height="46" fill="#6f7a8c"/>')
    r = RNG(116)
    g.append(''.join(f'<path d="M0 -9 C8 -9 10 -2 0 6 C-10 -2 -8 -9 0 -9 Z" transform="translate({r.random() * VW:.0f} {900 + r.random() ** .7 * 300:.0f}) rotate({r.random() * 360:.0f}) scale({.8 + r.random():.2f})" fill="{["#f6cf5a", "#f2c040", "#f8dc7c"][int(r.random() * 3)]}"/>' for _ in range(160)))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s117 茶畑と富士
def tea_fuji():
    """茶畑と富士: Mt Fuji with its snowcap over rows of rounded tea bushes; a railway embankment crosses (the bullet train is the page's)"""
    d, b = sky([(0, '#bcdcf2'), (.55, '#e4f1f8'), (1, '#f4f8ee')])
    g = [b]
    g.append('<path d="M420 760 C640 640 860 380 940 300 C960 284 980 284 1000 300 C1080 380 1300 640 1520 760 Z" fill="#9db4d6"/>')
    g.append('<clipPath id="fj"><path d="M420 760 C640 640 860 380 940 300 C960 284 980 284 1000 300 C1080 380 1300 640 1520 760 Z"/></clipPath>'
             '<g clip-path="url(#fj)"><path d="M700 470 L1240 470 L1240 300 L700 300 Z M760 470 C820 440 860 500 900 460 C930 500 960 450 990 490 C1020 450 1060 500 1090 456 C1130 500 1160 440 1200 480 L1240 470 Z" fill="#ffffff"/>'
             '<path d="M970 300 L1240 300 L1520 760 L1100 760 C1060 600 1010 420 970 300 Z" fill="#8aa3c9" opacity=".6"/></g>')
    g.append(haze(640, 820, '#eaf3f6', .55))
    g.append(band(700, 40, '#b9cfd6', 1173, 6)); g.append(band(750, 30, '#a9c7a8', 1174, 7))
    r0 = RNG(1175)
    g.append(''.join(round_tree(r0.random() * VW, 790 + r0.random() * 20, 50 + r0.random() * 40, '#8fbf7e', '#8f7766', '#7fb26e') for _ in range(22)))
    g.append(band(790, 16, '#cfe3c3', 1171, 7))
    g.append('<rect x="0" y="830" width="1920" height="24" fill="#d9cdb6"/><rect x="0" y="826" width="1920" height="6" fill="#a9a196"/>')   # railway embankment
    g.append(''.join(f'<rect x="{x}" y="800" width="4" height="30" fill="#a9a196"/>' for x in range(40, 1920, 160)) + '<path d="M0 806 L1920 806" stroke="#a9a196" stroke-width="2"/>')
    g.append('<path d="M-40 1200 L-40 860 L1960 860 L1960 1200 Z" fill="#b6d79c"/>')
    for k in range(9):   # rows of tea bushes curving towards the viewer
        y = 880 + k * (16 + k * 5); h = 18 + k * 7; c = ('#7fb46c', '#8fc27a')[k % 2]
        pts = []; x = -60; i = 0
        while x < 2000:
            pts.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{36 + k * 10:.0f}" ry="{h:.0f}"/>'); x += 60 + k * 16; i += 1
        g.append(f'<g fill="{c}">{"".join(pts)}<rect x="-60" y="{y:.0f}" width="2060" height="{h:.0f}"/></g>')
        g.append(f'<path d="M-60 {y + h:.0f} L1980 {y + h:.0f}" stroke="#9ec98c" stroke-width="{3 + k:.0f}"/>')
    g.append(''.join(f'<rect x="{x}" y="{y}" width="6" height="{h}" fill="#8f8070"/><path d="M{x - 30} {y} L{x + 36} {y} L{x + 30} {y + 8} L{x - 24} {y + 8} Z" fill="#7d8a90"/>' for x, y, h in ((300, 840, 50), (1640, 860, 60))))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s118 棚田
def rice_terraces():
    """棚田: terraced rice paddies stepping down a hillside — green rice in some, sky-mirroring water in others, grassy terrace walls; a thatched farmhouse"""
    d, b = sky([(0, '#c2e0f2'), (.55, '#ecf5f2'), (1, '#f6f2e4')])
    g = [b]
    g.append(band(520, 60, '#c8d9d6', 1181, 6)); g.append(band(590, 50, '#b0cbbd', 1182, 7))
    g.append(haze(480, 660, '#ecf5f2', .45))
    r = RNG(118)
    N = 11
    for k in range(N):   # top to bottom: each terrace = paddy surface + a darker wall below its lip
        y = 610 + k * (30 + k * 7); amp = 14 + k * 5; th = 22 + k * 8
        lip = ridge(y, amp, 1190 + k, 8, bottom=VH)
        water = k % 3 == 1
        g.append(f'<path d="{lip}" fill="{"#cfe6ee" if water else ["#a8d27e", "#b6da88", "#9ccb76"][k % 3]}"/>')
        if water:
            g.append(f'<path d="{ridge(y + th * .5, amp, 1190 + k, 8, bottom=VH)}" fill="#ffffff" opacity=".25"/>')
            for _ in range(int(10 + k * 3)):
                x = r.random() * VW; yy = y + 6 + r.random() * th * .7
                g.append(f'<path d="M{x:.0f} {yy:.0f} l-3 -{6 + k:.0f} M{x:.0f} {yy:.0f} l3 -{6 + k:.0f}" stroke="#8fc27a" stroke-width="{1.4 + k * .15:.1f}"/>')
        else:
            for _ in range(int(16 + k * 5)):
                x = r.random() * VW; yy = y + 4 + r.random() * th * .8
                g.append(f'<path d="M{x:.0f} {yy:.0f} q-2 -{5 + k:.0f} -{3 + k * .4:.1f} -{8 + k * 1.3:.1f} M{x:.0f} {yy:.0f} q2 -{5 + k:.0f} {3 + k * .4:.1f} -{8 + k * 1.3:.1f}" stroke="#7fb468" stroke-width="{1.5 + k * .2:.1f}" fill="none"/>')
        g.append(f'<path d="{ridge(y + th, amp, 1190 + k, 8, bottom=VH)}" fill="#8fb46e"/><path d="{ridge(y + th + 6 + k, amp, 1190 + k, 8, bottom=VH)}" fill="#a3bf7c" opacity=".7"/>')
    X, Y = 1560, 640
    g.append(f'<rect x="{X - 90}" y="{Y - 70}" width="180" height="80" fill="#f2e6d0"/><path d="M{X - 130} {Y - 64} C{X - 90} {Y - 120} {X - 40} {Y - 170} {X} {Y - 180} C{X + 40} {Y - 170} {X + 90} {Y - 120} {X + 130} {Y - 64} Z" fill="#c9a77e"/><path d="M{X - 40} {Y - 150} L{X + 40} {Y - 150}" stroke="#a98b6a" stroke-width="6"/>'
             f'<rect x="{X - 70}" y="{Y - 50}" width="40" height="40" fill="#e2cfae"/><rect x="{X + 20}" y="{Y - 50}" width="50" height="60" fill="#8f7766"/>')
    g.append(''.join(round_tree(x, y, s, '#8fbf86', '#a98b74', '#7fb276') for x, y, s in ((1380, 640, 110), (1720, 650, 140), (1810, 640, 100), (300, 600, 120), (180, 610, 90))))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s119 雪見の温泉
def snow_onsen():
    """雪見の温泉: a steaming rock pool in snowy mountains at dusk, a wooden inn with warm windows, a snow monkey in the water"""
    d, b = sky([(0, '#9fb0d2'), (.5, '#d6d2e4'), (1, '#efe6ea')])
    g = [b]
    g.append(band(520, 70, '#e6eaf2', 1191, 6)); g.append(band(600, 50, '#d6deea', 1192, 7))
    r = RNG(119)
    for i in range(22):
        x = r.random() * VW; y = 640 + r.random() * 120; g.append(pine(x, y, 120 + r.random() * 80, '#8ea2b8', '#7f94ab', True))
    g.append(band(720, 30, '#f4f6fa', 1193, 8))
    X, Y = 1460, 820   # the inn
    g.append(f'<rect x="{X - 260}" y="{Y - 160}" width="520" height="200" fill="#9b7a5e"/><rect x="{X - 260}" y="{Y - 160}" width="520" height="12" fill="#8a6a50"/>'
             + ''.join(f'<rect x="{X - 230 + i * 92}" y="{Y - 120}" width="64" height="70" rx="4" fill="#ffd796"/><rect x="{X - 230 + i * 92 + 30}" y="{Y - 120}" width="4" height="70" fill="#9b7a5e"/>' for i in range(5))
             + f'<path d="M{X - 310} {Y - 150} L{X} {Y - 270} L{X + 310} {Y - 150} Z" fill="#6f6a7e"/><path d="M{X - 314} {Y - 156} L{X} {Y - 280} L{X + 314} {Y - 156} L{X + 290} {Y - 140} L{X} {Y - 256} L{X - 290} {Y - 140} Z" fill="#ffffff"/>')
    g.append(glow(X, Y - 80, 300, 100, '#ffd796', .35, 'b30'))
    g.append('<path d="M-40 1200 L-40 900 C200 860 500 860 800 880 C1100 900 1500 900 1960 880 L1960 1200 Z" fill="#f6f7fb"/>')
    # the pool and its rocks
    g.append('<path d="M240 1100 C300 980 600 950 900 960 C1150 970 1260 1020 1240 1100 C1200 1170 900 1180 600 1170 C380 1160 220 1150 240 1100 Z" fill="#9fc3cf"/>')
    g.append('<path d="M300 1100 C360 1010 620 990 900 1000 C1120 1010 1200 1050 1190 1100 Z" fill="#b8d6de"/>')
    for x, y, rx, ry in ((230, 1110, 80, 56), (360, 990, 90, 50), (560, 960, 70, 40), (820, 955, 80, 40), (1080, 975, 90, 48), (1240, 1070, 80, 60), (1100, 1170, 110, 50), (720, 1185, 140, 46), (400, 1180, 120, 46)):
        g.append(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#8e8a96"/><ellipse cx="{x - rx * .1:.0f}" cy="{y - ry * .45:.0f}" rx="{rx * .8:.0f}" ry="{ry * .5:.0f}" fill="#ffffff"/>')
    M = (760, 1050)   # the snow monkey
    g.append(f'<ellipse cx="{M[0]}" cy="{M[1] + 20}" rx="60" ry="16" fill="#a9cbd6"/><ellipse cx="{M[0]}" cy="{M[1] + 30}" rx="80" ry="34" fill="#c9b6a6"/><circle cx="{M[0]}" cy="{M[1] - 10}" r="62" fill="#c9b6a6"/><ellipse cx="{M[0]}" cy="{M[1] - 2}" rx="40" ry="34" fill="#f2b8a8"/><circle cx="{M[0] - 14}" cy="{M[1] - 10}" r="5" fill="#5a4a4a"/><circle cx="{M[0] + 14}" cy="{M[1] - 10}" r="5" fill="#5a4a4a"/><path d="M{M[0] - 8} {M[1] + 12} Q{M[0]} {M[1] + 18} {M[0] + 8} {M[1] + 12}" stroke="#a96a6a" stroke-width="3" fill="none"/><ellipse cx="{M[0] - 24}" cy="{M[1] + 4}" rx="9" ry="6" fill="#f6a0a0" opacity=".6"/><ellipse cx="{M[0] + 24}" cy="{M[1] + 4}" rx="9" ry="6" fill="#f6a0a0" opacity=".6"/><rect x="{M[0] - 34}" y="{M[1] - 78}" width="68" height="18" rx="8" fill="#ffffff"/><path d="M{M[0] - 140} {M[1] + 40} C{M[0] - 60} {M[1] + 24} {M[0] + 60} {M[1] + 24} {M[0] + 140} {M[1] + 40} L{M[0] + 140} {M[1] + 90} L{M[0] - 140} {M[1] + 90} Z" fill="#a9cbd6"/>')
    g.append(f'<rect x="0" y="{M[1] + 20}" width="1920" height="200" fill="#9fc3cf" opacity="0"/>')
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s120 ひまわり畑
def sunflowers():
    """ひまわり畑: a sea of sunflowers to the horizon under a summer sky with tall cumulus, a red barn far away"""
    d, b = sky([(0, '#8fc9f0'), (.55, '#cfe9f8'), (1, '#f4f6e4')])
    g = [b]
    # tall summer cumulus (soft, shaded)
    for cx, cy, s in ((420, 520, 1.0), (1500, 480, 1.25)):
        g.append(f'<g filter="url(#b4)"><g fill="#e6f0f8">' + ''.join(f'<circle cx="{cx + dx * s:.0f}" cy="{cy + dy * s:.0f}" r="{rr * s:.0f}"/>' for dx, dy, rr in ((-160, 60, 110), (0, 0, 170), (150, 50, 120), (60, -150, 120), (-80, -110, 110), (0, -260, 90))) + '</g>'
                 + f'<g fill="#ffffff">' + ''.join(f'<circle cx="{cx + dx * s - 14:.0f}" cy="{cy + dy * s - 16:.0f}" r="{rr * s * .92:.0f}"/>' for dx, dy, rr in ((-160, 60, 110), (0, 0, 170), (150, 50, 120), (60, -150, 120), (-80, -110, 110), (0, -260, 90))) + '</g></g>')
    g.append(band(740, 16, '#a9c7a8', 1201, 8))
    g.append('<rect x="1510" y="690" width="80" height="54" fill="#d9766a"/><path d="M1500 694 L1550 660 L1600 694 Z" fill="#b8605a"/><rect x="1536" y="712" width="28" height="32" fill="#f6efe2"/>')
    g.append(band(760, 12, '#8db86a', 1202, 9))
    r = RNG(120)
    rows = []
    for k in range(14):   # far rows: dots; near rows: real flowers
        y = 760 + k ** 1.7 * 9; s = 6 + k ** 1.6 * 4
        for _ in range(int(220 / (1 + k * .5))):
            x = r.random() * (VW + 200) - 100; yy = y + r.random() * (8 + k * 4)
            rows.append((yy, x, s))
    rows.sort()
    for yy, x, s in rows:
        if s < 14:
            g.append(f'<circle cx="{x:.0f}" cy="{yy:.0f}" r="{s * .6:.1f}" fill="#f6c84a"/><circle cx="{x:.0f}" cy="{yy:.0f}" r="{s * .25:.1f}" fill="#9a6a3a"/>')
        else:
            g.append(f'<rect x="{x - s * .05:.0f}" y="{yy:.0f}" width="{s * .1:.0f}" height="{s * 1.6:.0f}" fill="#7aa85e"/><path d="M{x:.0f} {yy + s * .8:.0f} q{s * .4:.0f} {-s * .2:.0f} {s * .6:.0f} {s * .1:.0f} q{-s * .3:.0f} {s * .2:.0f} {-s * .6:.0f} {-s * .1:.0f} Z" fill="#8bb86c"/>')
            g.append('<g>' + ''.join(f'<ellipse cx="{x + s * .55 * math.cos(a):.1f}" cy="{yy + s * .5 * math.sin(a):.1f}" rx="{s * .26:.1f}" ry="{s * .14:.1f}" transform="rotate({math.degrees(a):.0f} {x + s * .55 * math.cos(a):.1f} {yy + s * .5 * math.sin(a):.1f})" fill="{"#f6c23a" if i % 2 else "#f8d257"}"/>' for i, a in enumerate([j * math.pi / 7 for j in range(14)])) + '</g>')
            g.append(f'<circle cx="{x:.0f}" cy="{yy:.0f}" r="{s * .34:.1f}" fill="#8a5a32"/><circle cx="{x - s * .08:.0f}" cy="{yy - s * .08:.0f}" r="{s * .14:.1f}" fill="#a87244"/>')
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s121 風車とチューリップ
def windmill_tulips():
    """風車とチューリップ: stripes of tulips in red, yellow, pink and white running to a Dutch windmill by a canal (the sails turn: the page's)"""
    d, b = sky([(0, '#b9d8f0'), (.6, '#e4f0f6'), (1, '#f6f4ea')])
    g = [b]
    g.append(band(720, 10, '#c9dcc0', 1211, 6))
    X, Y = 1460, 820   # windmill body (sails are the page's): hub at (1460, 470)
    g.append(f'<path d="M{X - 120} {Y} L{X - 80} {Y - 330} L{X + 80} {Y - 330} L{X + 120} {Y} Z" fill="#8a7f78"/><path d="M{X} {Y - 330} L{X + 80} {Y - 330} L{X + 120} {Y} L{X + 30} {Y} Z" fill="#7a6f68"/><path d="M{X - 92} {Y - 320} C{X - 92} {Y - 420} {X + 92} {Y - 420} {X + 92} {Y - 320} Z" fill="#6f6a72"/>'
             f'<rect x="{X - 28}" y="{Y - 90}" width="56" height="90" rx="28" fill="#5f5850"/><rect x="{X - 52}" y="{Y - 250}" width="36" height="40" rx="4" fill="#f6efe2"/><rect x="{X + 18}" y="{Y - 190}" width="32" height="36" rx="4" fill="#f6efe2"/>'
             f'<rect x="{X - 150}" y="{Y - 160}" width="300" height="12" fill="#6f6a72"/>' + ''.join(f'<rect x="{X - 146 + i * 30}" y="{Y - 180}" width="4" height="22" fill="#6f6a72"/>' for i in range(11)))
    g.append(''.join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{c}"/><path d="M{x - 10} {y + 2} L{x + w / 2} {y - h * .6:.0f} L{x + w + 10} {y + 2} Z" fill="#c4605a"/>' for x, y, w, h, c in ((300, 712, 80, 48, '#f6efe2'), (420, 718, 60, 42, '#e9d6c0'), (980, 716, 70, 44, '#f6efe2'))))
    g.append(''.join(round_tree(x, 730, s, '#9cc48e', '#8f7766', '#8cb87f') for x, s in ((200, 120), (320, 90), (1700, 110), (1820, 140))))
    g.append('<rect x="0" y="760" width="1920" height="30" fill="#a9cde0"/><rect x="0" y="760" width="1920" height="6" fill="#d6ecf6"/>')
    cols = ['#f08a8a', '#f6d05a', '#f6a8c4', '#fbf6ee', '#f2a06a', '#c9a8e8']
    for k in range(12):   # stripes in perspective, converging to a vanishing point at (960, 760)
        x0 = -2400 + k * 420; x1 = x0 + 420
        g.append(f'<path d="M{960 + (x0 - 960) * .08:.0f} 790 L{960 + (x1 - 960) * .08:.0f} 790 L{x1:.0f} 1200 L{x0:.0f} 1200 Z" fill="{cols[k % 6]}"/>')
        g.append(f'<path d="M{960 + (x1 - 960) * .08 - 2:.0f} 790 L{960 + (x1 - 960) * .08 + 2:.0f} 790 L{x1 + 30:.0f} 1200 L{x1 - 30:.0f} 1200 Z" fill="#8fbf74"/>')
    r = RNG(121)
    for _ in range(170):   # near tulips on the stripes
        y = 1000 + r.random() ** .6 * 200; x = r.random() * VW; s = (y - 940) / 260 * 30
        t = (x - 960) / ((y - 760) / 440) + 960; k = int((t + 2400) // 420) % 6; c = cols[k]
        g.append(f'<rect x="{x - 1.5:.0f}" y="{y:.0f}" width="3" height="{s:.0f}" fill="#7aa85e"/><path d="M{x - s * .3:.1f} {y - s * .2:.1f} L{x - s * .3:.1f} {y - s * .7:.1f} L{x - s * .1:.1f} {y - s * .5:.1f} L{x:.1f} {y - s * .78:.1f} L{x + s * .1:.1f} {y - s * .5:.1f} L{x + s * .3:.1f} {y - s * .7:.1f} L{x + s * .3:.1f} {y - s * .2:.1f} C{x + s * .3:.1f} {y + s * .06:.1f} {x - s * .3:.1f} {y + s * .06:.1f} {x - s * .3:.1f} {y - s * .2:.1f} Z" fill="{c}"/>')
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s122 アルプスの牧場
def alpine():
    """アルプスの牧場: jagged snowy peaks, a green alpine meadow with a chalet and cows; a cable car line crosses (the cabin is the page's)"""
    d, b = sky([(0, '#a9d2f2'), (.55, '#e0f0fa'), (1, '#f2f7ee')])
    g = [b]
    peaks = [(260, 420, 520), (640, 300, 600), (1040, 380, 560), (1460, 260, 640), (1820, 400, 520)]
    for x, y, w in peaks:
        m = f'M{x - w / 2:.0f} 760 L{x - w * .12:.0f} {y + 60:.0f} L{x:.0f} {y:.0f} L{x + w * .1:.0f} {y + 50:.0f} L{x + w / 2:.0f} 760 Z'
        g.append(f'<clipPath id="p{x}"><path d="{m}"/></clipPath><path d="{m}" fill="#a3b4cc"/><g clip-path="url(#p{x})"><path d="M{x:.0f} {y - 10:.0f} L{x + w:.0f} 760 L{x + w / 2:.0f} 760 L{x + 10:.0f} {y + 60:.0f} Z" fill="#8fa2bd"/>'
                 f'<path d="M{x - w / 2:.0f} {y - 20:.0f} L{x + w / 2:.0f} {y - 20:.0f} L{x + w / 2:.0f} {y + 120:.0f} L{x + w * .2:.0f} {y + 90:.0f} L{x + w * .08:.0f} {y + 150:.0f} L{x - w * .04:.0f} {y + 100:.0f} L{x - w * .16:.0f} {y + 160:.0f} L{x - w * .24:.0f} {y + 110:.0f} L{x - w / 2:.0f} {y + 140:.0f} Z" fill="#ffffff"/></g>')
    g.append(haze(640, 800, '#e8f2f4', .6))
    g.append(band(780, 40, '#a8d08a', 1221, 6)); g.append(band(860, 50, '#9cc87e', 1222, 7))
    r = RNG(122)
    for i in range(16):
        x = r.random() * VW; y = 800 + r.random() * 60; g.append(pine(x, y, 110 + r.random() * 70, '#5f8f6a', '#548260'))
    g.append(band(930, 40, '#b4da94', 1223, 8))
    X, Y = 560, 1000   # chalet
    g.append(f'<rect x="{X - 140}" y="{Y - 130}" width="280" height="150" fill="#b08a64"/>' + ''.join(f'<rect x="{X - 140}" y="{Y - 130 + i * 18}" width="280" height="3" fill="#9b7a58"/>' for i in range(8))
             + f'<path d="M{X - 190} {Y - 120} L{X} {Y - 240} L{X + 190} {Y - 120} L{X + 170} {Y - 104} L{X} {Y - 210} L{X - 170} {Y - 104} Z" fill="#7a5f4a"/><path d="M{X - 160} {Y - 120} L{X} {Y - 222} L{X + 160} {Y - 120} Z" fill="#f2e6d0"/>'
             + f'<rect x="{X - 110}" y="{Y - 90}" width="56" height="46" fill="#fbfaf6"/><rect x="{X + 54}" y="{Y - 90}" width="56" height="46" fill="#fbfaf6"/><rect x="{X - 26}" y="{Y - 76}" width="52" height="96" fill="#7a5f4a"/>'
             + ''.join(f'<circle cx="{X - 110 + i * 14}" cy="{Y - 40}" r="7" fill="{c}"/>' for i, c in enumerate(('#f08a8a', '#f6d05a', '#f08a8a', '#f6d05a', '#f08a8a'))))
    def cow(x, y, s, f=1):
        return (f'<g transform="translate({x} {y}) scale({s * f} {s})"><rect x="-50" y="-40" width="100" height="44" rx="18" fill="#fbf8f2"/><ellipse cx="-14" cy="-24" rx="16" ry="12" fill="#6f6a72"/><ellipse cx="24" cy="-14" rx="12" ry="10" fill="#6f6a72"/>'
                f'<rect x="-42" y="0" width="10" height="26" fill="#fbf8f2"/><rect x="28" y="0" width="10" height="26" fill="#fbf8f2"/><rect x="-24" y="0" width="10" height="24" fill="#ece6dc"/><rect x="12" y="0" width="10" height="24" fill="#ece6dc"/>'
                f'<rect x="44" y="-56" width="32" height="36" rx="12" fill="#fbf8f2"/><ellipse cx="62" cy="-26" rx="16" ry="10" fill="#f2b8a8"/><path d="M48 -56 l-8 -10 M72 -56 l8 -10" stroke="#d9c6a8" stroke-width="5"/><circle cx="58" cy="-14" r="6" fill="#f6d05a"/></g>')
    g.append(cow(1100, 1080, 1.1) + cow(1380, 1040, .8, -1) + cow(1620, 1120, 1.3) + cow(300, 1140, .9, -1))
    g.append('<path d="M-40 520 L1960 690" stroke="#6f7480" stroke-width="3"/><path d="M-40 534 L1960 704" stroke="#6f7480" stroke-width="2" opacity=".7"/>')
    g.append('<rect x="1700" y="660" width="14" height="300" fill="#8f949e"/><path d="M1680 670 L1734 670" stroke="#8f949e" stroke-width="8"/>')
    r2 = RNG(1224)
    g.append(''.join(f'<circle cx="{r2.random() * VW:.0f}" cy="{960 + r2.random() * 240:.0f}" r="{3 + r2.random() * 4:.0f}" fill="{["#ffffff", "#f6d05a", "#c9a8e8", "#f6a8c4"][int(r2.random() * 4)]}"/>' for _ in range(140)))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s123 ロンドン
def london():
    """ロンドン: the Elizabeth Tower and Westminster facade, a row of townhouses, a red phone box, a misty soft sky (buses and umbrellas are the page's)"""
    d, b = sky([(0, '#c8d2e2'), (.55, '#e6e8ee'), (1, '#f2eee8')])
    g = [b, glow(400, 300, 500, 200, '#fff8e8', .6, 'b60')]
    g.append('<rect x="1080" y="560" width="760" height="300" fill="#d6c8b0"/>' + ''.join(f'<rect x="{1100 + i * 46}" y="{600 + (i % 2) * 0}" width="10" height="230" fill="#c6b69c"/>' for i in range(16)) + ''.join(f'<path d="M{1090 + i * 46} 560 l12 -40 l12 40 Z" fill="#c6b69c"/>' for i in range(16)))
    X = 960   # Elizabeth Tower
    g.append(f'<rect x="{X - 60}" y="320" width="120" height="560" fill="#d9c9ac"/>' + ''.join(f'<rect x="{X - 46 + i * 24}" y="560" width="8" height="300" fill="#c6b69c"/>' for i in range(4))
             + f'<rect x="{X - 72}" y="250" width="144" height="150" fill="#e2d4b8"/><circle cx="{X}" cy="325" r="54" fill="#fbf8ee" stroke="#b89c6e" stroke-width="8"/><circle cx="{X}" cy="325" r="5" fill="#4a4a5a"/>'
             + f'<path d="M{X - 72} 250 L{X - 50} 200 L{X + 50} 200 L{X + 72} 250 Z" fill="#c6b69c"/><path d="M{X - 50} 200 L{X} 70 L{X + 50} 200 Z" fill="#8f9aa8"/><rect x="{X - 2}" y="40" width="4" height="40" fill="#8f9aa8"/>'
             + ''.join(f'<path d="M{X + dx} 250 l0 -30 l8 -14 l8 14 l0 30 Z" fill="#c6b69c"/>' for dx in (-78, 62)))
    g.append(haze(500, 900, '#ece9e6', .35))
    cols = ['#f2ece0', '#e7d4c4', '#d8e0e8', '#efe0cf', '#e6ddea']
    x = -20; r = RNG(123)
    while x < 1940:   # townhouses in front
        w = 150 + r.random() * 30; h = 260 + r.random() * 60; c = cols[int(r.random() * 5)]; top = 1100 - h
        g.append(f'<rect x="{x:.0f}" y="{top:.0f}" width="{w:.0f}" height="{h + 100:.0f}" fill="{c}"/><rect x="{x - 4:.0f}" y="{top - 14:.0f}" width="{w + 8:.0f}" height="16" fill="#c9b9a8"/>')
        g.append(''.join(f'<rect x="{x + w * .14 + i * w * .3:.0f}" y="{top + 30 + j * 80:.0f}" width="{w * .2:.0f}" height="52" fill="#a9b8c8"/><rect x="{x + w * .14 + i * w * .3:.0f}" y="{top + 54 + j * 80:.0f}" width="{w * .2:.0f}" height="3" fill="#f6f2ea"/>' for i in range(3) for j in range(int((h - 80) // 80))))
        g.append(f'<rect x="{x + w * .38:.0f}" y="1030" width="{w * .24:.0f}" height="70" fill="{["#3f5a7a", "#7a3f4a", "#3f6a5a", "#2f3f5a"][int(r.random() * 4)]}"/><path d="M{x + w * .34:.0f} 1030 A{w * .16:.0f} {w * .16:.0f} 0 0 1 {x + w * .66:.0f} 1030 Z" fill="#f6f2ea"/>')
        g.append(f'<rect x="{x + w * .3:.0f}" y="{top - 40:.0f}" width="20" height="30" fill="#c27a64"/>' if r.random() < .6 else '')
        x += w + 2
    g.append('<rect x="0" y="1100" width="1920" height="100" fill="#cfc9c2"/><rect x="0" y="1100" width="1920" height="10" fill="#e6e1da"/>')
    P = 1560   # phone box
    g.append(f'<rect x="{P - 34}" y="960" width="68" height="150" rx="6" fill="#d8524a"/><path d="M{P - 38} 966 C{P - 38} 940 {P + 38} 940 {P + 38} 966 Z" fill="#c4463f"/>' + ''.join(f'<rect x="{P - 24 + i * 17}" y="{990 + j * 22}" width="13" height="18" fill="#f6e6c8"/>' for i in range(3) for j in range(4)))
    g.append(''.join(f'<rect x="{x - 4}" y="960" width="8" height="150" fill="#3f4a5a"/><rect x="{x - 14}" y="944" width="28" height="22" rx="4" fill="#fff4d0"/><path d="M{x - 16} 946 L{x} 932 L{x + 16} 946 Z" fill="#3f4a5a"/>' for x in (300, 1240)))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s124 ニューヨーク
def new_york():
    """ニューヨーク: Manhattan skyline with the Empire State and Chrysler towers, brownstones and a street of trees (taxis are the page's)"""
    d, b = sky([(0, '#b6d6f0'), (.55, '#e2eef6'), (1, '#f6f0e4')])
    g = [b]
    r = RNG(124)
    for x0 in range(-40, 1960, 70):   # far skyline
        h = 260 + r.random() * 320; w = 60 + r.random() * 40
        g.append(f'<rect x="{x0}" y="{860 - h:.0f}" width="{w:.0f}" height="{h:.0f}" fill="#c7d3e2"/>' + ''.join(f'<rect x="{x0 + 8 + i * 16}" y="{870 - h + j * 26:.0f}" width="8" height="12" fill="#dbe4ee"/>' for i in range(int(w // 18)) for j in range(int(h // 26) - 1)))
    E = 620   # Empire State
    g.append(f'<rect x="{E - 90}" y="420" width="180" height="440" fill="#b6c2d4"/><rect x="{E - 60}" y="300" width="120" height="130" fill="#b6c2d4"/><rect x="{E - 36}" y="220" width="72" height="90" fill="#b6c2d4"/><rect x="{E - 16}" y="150" width="32" height="80" fill="#a9b6ca"/><rect x="{E - 3}" y="80" width="6" height="80" fill="#a9b6ca"/>'
             + ''.join(f'<rect x="{E - 80 + i * 22}" y="{430 + j * 30}" width="10" height="16" fill="#d8e0ec"/>' for i in range(8) for j in range(14)))
    C = 1320   # Chrysler
    g.append(f'<rect x="{C - 70}" y="420" width="140" height="440" fill="#bfcadb"/><path d="M{C - 54} 420 C{C - 54} 330 {C + 54} 330 {C + 54} 420 Z" fill="#d6dde8"/>' + ''.join(f'<path d="M{C - 54 + i * 9} 420 C{C - 40 + i * 7} {360 - i * 14} {C + 40 - i * 7} {360 - i * 14} {C + 54 - i * 9} 420" fill="none" stroke="#a9b6ca" stroke-width="3"/>' for i in range(6))
             + f'<path d="M{C - 6} 300 L{C} 180 L{C + 6} 300 Z" fill="#a9b6ca"/>' + ''.join(f'<rect x="{C - 60 + i * 20}" y="{440 + j * 30}" width="9" height="16" fill="#e0e6ee"/>' for i in range(6) for j in range(14)))
    g.append(haze(700, 900, '#eef3f6', .5))
    cols = ['#c98a6e', '#b87a62', '#d4a07e', '#a96e5a']
    x = -20
    while x < 1940:   # brownstones
        w = 170 + r.random() * 20; h = 300 + r.random() * 70; c = cols[int(r.random() * 4)]; top = 1060 - h
        g.append(f'<rect x="{x:.0f}" y="{top:.0f}" width="{w:.0f}" height="{h:.0f}" fill="{c}"/><rect x="{x - 4:.0f}" y="{top - 12:.0f}" width="{w + 8:.0f}" height="16" fill="#8a5a4a"/>')
        g.append(''.join(f'<rect x="{x + 22 + i * 52:.0f}" y="{top + 30 + j * 78:.0f}" width="30" height="50" fill="#f2e6cf"/><rect x="{x + 18 + i * 52:.0f}" y="{top + 26 + j * 78:.0f}" width="38" height="6" fill="#8a5a4a"/>' for i in range(3) for j in range(int((h - 110) // 78))))
        g.append(f'<path d="M{x + w * .25:.0f} 1060 L{x + w * .25:.0f} {1060 - 44:.0f} L{x + w * .6:.0f} {1060 - 70:.0f} L{x + w * .6:.0f} 1060 Z" fill="#9a6a56"/><rect x="{x + w * .55:.0f}" y="{1060 - 120:.0f}" width="30" height="50" fill="#5a3f3a"/>')
        x += w
    g.append('<rect x="0" y="1060" width="1920" height="140" fill="#9aa0aa"/><rect x="0" y="1060" width="1920" height="22" fill="#c9cdd4"/><path d="M0 1150 L1920 1150" stroke="#f6f2ea" stroke-width="6" stroke-dasharray="60 50"/>')
    g.append(''.join(round_tree(x, 1070, 170, '#9cc48e', '#8f7766', '#8cb87f') for x in (140, 600, 1060, 1520)))
    g.append(''.join(f'<rect x="{x - 4}" y="900" width="8" height="170" fill="#4a5a6a"/><path d="M{x} 904 q30 0 40 20" stroke="#4a5a6a" stroke-width="6" fill="none"/><ellipse cx="{x + 44}" cy="926" rx="14" ry="7" fill="#fff4d0"/>' for x in (370, 830, 1290, 1750)))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s125 タージマハル
def taj_mahal():
    """タージマハル: the white mausoleum at sunrise above its long reflecting pool, cypress rows, a pink-gold sky (birds are the page's)"""
    d, b = sky([(0, '#e6a9b4'), (.35, '#f3bfb6'), (.6, '#f8d8bc'), (1, '#f4e6d4')])
    g = [b, glow(960, 600, 520, 160, '#fff0c8', .55, 'b60')]
    X, B = 960, 780
    def minaret(x):
        return (f'<rect x="{x - 16}" y="{B - 360}" width="32" height="360" fill="#f6efe8"/>' + ''.join(f'<rect x="{x - 24}" y="{B - 360 + i * 110}" width="48" height="10" rx="4" fill="#e9ddd2"/>' for i in range(4))
                + f'<path d="M{x - 22} {B - 372} C{x - 22} {B - 410} {x + 22} {B - 410} {x + 22} {B - 372} Z" fill="#efe4da"/><rect x="{x - 2}" y="{B - 430}" width="4" height="24" fill="#d8c8b8"/>')
    g.append(minaret(X - 470) + minaret(X + 470))
    g.append(f'<rect x="{X - 330}" y="{B - 280}" width="660" height="280" fill="#f8f2ec"/><rect x="{X + 150}" y="{B - 280}" width="180" height="280" fill="#ecdcda"/><rect x="{X - 330}" y="{B - 280}" width="660" height="16" fill="#ece0d6"/>')
    g.append(f'<path d="M{X - 90} {B} L{X - 90} {B - 190} C{X - 90} {B - 250} {X} {B - 280} {X} {B - 280} C{X} {B - 280} {X + 90} {B - 250} {X + 90} {B - 190} L{X + 90} {B} Z" fill="#d9c4c4"/>')
    for dx in (-230, 230):
        g.append(f'<path d="M{X + dx - 50} {B - 20} L{X + dx - 50} {B - 150} C{X + dx - 50} {B - 190} {X + dx} {B - 210} {X + dx} {B - 210} C{X + dx} {B - 210} {X + dx + 50} {B - 190} {X + dx + 50} {B - 150} L{X + dx + 50} {B - 20} Z" fill="#ece0d6"/>'
                 f'<path d="M{X + dx - 46} {B - 290} C{X + dx - 46} {B - 330} {X + dx + 46} {B - 330} {X + dx + 46} {B - 290} Z" fill="#f4ece4"/><rect x="{X + dx - 40}" y="{B - 292}" width="80" height="14" fill="#f8f2ec"/>')
    g.append(f'<rect x="{X - 150}" y="{B - 330}" width="300" height="60" fill="#f8f2ec"/>')
    g.append(f'<path d="M{X - 160} {B - 330} C{X - 190} {B - 450} {X - 90} {B - 560} {X} {B - 600} C{X + 90} {B - 560} {X + 190} {B - 450} {X + 160} {B - 330} Z" fill="#fbf6f0"/>'
             f'<path d="M{X} {B - 600} C{X + 90} {B - 560} {X + 190} {B - 450} {X + 160} {B - 330} L{X + 60} {B - 330} C{X + 90} {B - 440} {X + 60} {B - 540} {X} {B - 600} Z" fill="#e6d2d6"/><rect x="{X - 3}" y="{B - 660}" width="6" height="64" fill="#d8b47a"/><circle cx="{X}" cy="{B - 640}" r="8" fill="#d8b47a"/>')
    g.append('<rect x="0" y="780" width="1920" height="420" fill="#d9cdb4"/><rect x="0" y="780" width="1920" height="420" fill="#a9c48e" opacity=".55"/>')
    for side in (-1, 1):
        for k in range(8):
            t = k / 7; x = X + side * (230 + t ** 1.3 * 640); y = 800 + t ** 1.6 * 380; h = 60 + t * 220
            g.append(f'<path d="M{x:.0f} {y - h:.0f} C{x + h * .16:.0f} {y - h * .7:.0f} {x + h * .14:.0f} {y - h * .2:.0f} {x:.0f} {y:.0f} C{x - h * .14:.0f} {y - h * .2:.0f} {x - h * .16:.0f} {y - h * .7:.0f} {x:.0f} {y - h:.0f} Z" fill="#7fa88a"/>')
    g.append(f'<path d="M{X - 70} 800 L{X + 70} 800 L{X + 220} 1200 L{X - 220} 1200 Z" fill="#b9d8e4"/><path d="M{X - 70} 800 L{X + 70} 800 L{X + 80} 830 L{X - 80} 830 Z" fill="#d6e8ee"/>')
    g.append(f'<g opacity=".35"><path d="M{X - 40} 840 C{X - 50} 920 {X - 20} 990 {X} 1010 C{X + 20} 990 {X + 50} 920 {X + 40} 840 Z" fill="#fbf6f0"/></g>')
    g.append(f'<path d="M{X - 230} 1200 L{X - 76} 800 L{X - 70} 800 L{X - 220} 1200 Z M{X + 230} 1200 L{X + 76} 800 L{X + 70} 800 L{X + 220} 1200 Z" fill="#d6c6b2"/>')
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s126 アンコールワット
def angkor():
    """アンコールワット: the five lotus towers silhouetted at dawn over a lotus pond, palms on either side"""
    d, b = sky([(0, '#c6b8e0'), (.4, '#f2c6c8'), (.62, '#fde0bc'), (1, '#f6ecd8')])
    g = [b, glow(1180, 620, 300, 300, '#fff1c8', .8, 'b30'), '<circle cx="1180" cy="640" r="70" fill="#fff4d8"/>']
    col = '#8a7a8e'
    def tower(x, base, h, w):
        o = ''
        for k in range(6):
            yy = base - k * h / 6; ww = w * (1 - k * .13)
            o += f'<path d="M{x - ww / 2:.0f} {yy:.0f} L{x - ww * .42:.0f} {yy - h / 6:.0f} L{x + ww * .42:.0f} {yy - h / 6:.0f} L{x + ww / 2:.0f} {yy:.0f} Z" fill="{col}"/>'
            o += f'<path d="M{x - ww * .46:.0f} {yy - h / 12:.0f} l{-10:.0f} -14 l14 6 Z M{x + ww * .46:.0f} {yy - h / 12:.0f} l10 -14 l-14 6 Z" fill="{col}"/>'
        return o + f'<path d="M{x - w * .2:.0f} {base - h:.0f} C{x - w * .2:.0f} {base - h - 40:.0f} {x:.0f} {base - h - 70:.0f} {x:.0f} {base - h - 90:.0f} C{x:.0f} {base - h - 70:.0f} {x + w * .2:.0f} {base - h - 40:.0f} {x + w * .2:.0f} {base - h:.0f} Z" fill="{col}"/>'
    g.append(f'<rect x="420" y="700" width="1080" height="120" fill="{col}"/><rect x="380" y="780" width="1160" height="60" fill="#7d6d82"/>' + ''.join(f'<rect x="{440 + i * 40}" y="730" width="18" height="50" fill="#9b8c9e"/>' for i in range(26)))
    g.append(tower(600, 720, 220, 120) + tower(1320, 720, 220, 120) + tower(760, 700, 300, 150) + tower(1160, 700, 300, 150) + tower(960, 690, 420, 190))
    g.append(haze(640, 860, '#f6dcc8', .25))
    g.append('<rect x="0" y="840" width="1920" height="360" fill="#b9c8d2"/><rect x="0" y="840" width="1920" height="10" fill="#d6dde2"/>')
    g.append('<g opacity=".28" transform="translate(0 1680) scale(1 -1)"><rect x="420" y="700" width="1080" height="140" fill="#6f6280"/></g>')
    g.append(f'<g opacity=".25" transform="translate(0 1688) scale(1 -1)">{tower(960, 690, 420, 190)}{tower(760, 700, 300, 150)}{tower(1160, 700, 300, 150)}</g>')
    r = RNG(126)
    for _ in range(38):   # lotus pads and flowers
        x = r.random() * VW; y = 930 + r.random() ** .8 * 260; s = (y - 860) / 340 * 60 + 14
        g.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{s:.0f}" ry="{s * .32:.0f}" fill="#7fae8a"/><path d="M{x:.0f} {y:.0f} L{x + s * .9:.0f} {y - s * .1:.0f} L{x + s * .9:.0f} {y + s * .08:.0f} Z" fill="#b9c8d2"/>')
        if r.random() < .35:
            g.append(f'<path d="M{x - s * .25:.0f} {y - s * .12:.0f} C{x - s * .3:.0f} {y - s * .6:.0f} {x:.0f} {y - s * .8:.0f} {x:.0f} {y - s * .8:.0f} C{x:.0f} {y - s * .8:.0f} {x + s * .3:.0f} {y - s * .6:.0f} {x + s * .25:.0f} {y - s * .12:.0f} Z" fill="#f6b8c8"/><path d="M{x - s * .1:.0f} {y - s * .14:.0f} C{x - s * .1:.0f} {y - s * .5:.0f} {x:.0f} {y - s * .66:.0f} {x:.0f} {y - s * .66:.0f} C{x:.0f} {y - s * .66:.0f} {x + s * .1:.0f} {y - s * .5:.0f} {x + s * .1:.0f} {y - s * .14:.0f} Z" fill="#fbd6e0"/>')
    def palm(x, y, h, c='#6f6a7e'):
        o = f'<path d="M{x} {y} C{x + 10} {y - h * .5:.0f} {x + 30} {y - h * .8:.0f} {x + 20} {y - h:.0f}" stroke="{c}" stroke-width="{h * .06:.0f}" fill="none" stroke-linecap="round"/>'
        tx, ty = x + 20, y - h
        o += ''.join(f'<path d="M{tx} {ty} Q{tx + math.cos(a) * h * .3:.0f} {ty + math.sin(a) * h * .3 - h * .08:.0f} {tx + math.cos(a) * h * .5:.0f} {ty + math.sin(a) * h * .5 + h * .1:.0f}" stroke="{c}" stroke-width="{h * .05:.0f}" fill="none" stroke-linecap="round"/>' for a in (-3, -2.4, -1.8, -1.2, -.6, 0, .4))
        return o
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s127 マチュピチュ
def machu_picchu():
    """マチュピチュ: the green sugarloaf of Huayna Picchu behind ruins on a saddle — stone houses with gables, a grassy plaza,
    terraces curving down the slope, steep green ridges and valley haze (clouds drift in the valleys: the page's), a llama"""
    d, b = sky([(0, '#b2d4ee'), (.55, '#e0eef4'), (1, '#eef2e8')])
    g = [b]
    g.append('<path d="M-40 760 L120 420 L260 600 L420 360 L620 640 L760 520 L900 760 Z" fill="#a9c2b6"/><path d="M1560 760 L1700 380 L1820 560 L1960 440 L1960 760 Z" fill="#a9c2b6"/>')
    g.append(haze(520, 760, '#e6f0f0', .5))
    g.append('<path d="M1000 760 C1040 600 1120 380 1220 280 C1270 236 1320 236 1360 280 C1440 380 1500 580 1540 760 Z" fill="#7aa688"/><path d="M1220 280 C1270 236 1320 236 1360 280 C1440 380 1500 580 1540 760 L1380 760 C1380 560 1330 380 1220 280 Z" fill="#6a987a"/>')
    g.append('<path d="M1440 760 C1500 640 1580 590 1660 570 C1740 600 1820 680 1960 720 L1960 760 Z" fill="#8cb496"/>')
    g.append(haze(640, 800, '#eef4f0', .4))
    # the saddle with the ruins
    g.append('<path d="M-40 1200 L-40 820 C300 760 700 740 1000 760 C1300 780 1600 800 1960 840 L1960 1200 Z" fill="#a6cc8c"/>')
    r = RNG(127)
    def ruin(x, y, w, h):
        return (f'<path d="M{x:.0f} {y:.0f} L{x:.0f} {y - h:.0f} L{x + w / 2:.0f} {y - h - w * .45:.0f} L{x + w:.0f} {y - h:.0f} L{x + w:.0f} {y:.0f} Z" fill="#d6ccba"/>'
                f'<path d="M{x + w / 2:.0f} {y - h - w * .45:.0f} L{x + w:.0f} {y - h:.0f} L{x + w:.0f} {y:.0f} L{x + w * .62:.0f} {y:.0f} Z" fill="#c4b8a4"/>'
                + ''.join(f'<path d="M{x:.0f} {y - h + 14 + k * 14:.0f} L{x + w:.0f} {y - h + 14 + k * 14:.0f}" stroke="#bdb19c" stroke-width="2"/>' for k in range(int(h // 14) - 1))
                + f'<path d="M{x + w * .38:.0f} {y:.0f} L{x + w * .4:.0f} {y - h * .55:.0f} L{x + w * .6:.0f} {y - h * .55:.0f} L{x + w * .62:.0f} {y:.0f} Z" fill="#8f8474"/>')
    rows = [(560, 790, 9, 70, 50), (620, 840, 10, 84, 60), (700, 900, 9, 96, 66)]
    for x0, y0, n, w, h in rows:
        for i in range(n):
            if i in (4, 5) and y0 == 840: continue   # the plaza
            x = x0 + i * (w + 14) + r.random() * 10; g.append(ruin(x, y0 + (i % 2) * 6, w, h))
    g.append('<ellipse cx="1050" cy="860" rx="110" ry="22" fill="#b9da9c"/>')
    # terraces curving down the left slope
    for k in range(10):
        y = 880 + k * 32; x1 = 640 - k * 22
        g.append(f'<path d="M-40 {y + 40} C200 {y + 10} 420 {y - 6} {x1} {y - 14} L{x1} {y + 6} C420 {y + 14} 200 {y + 30} -40 {y + 60} Z" fill="#b4d89a"/><path d="M-40 {y + 52} C200 {y + 24} 420 {y + 8} {x1} {y} L{x1} {y + 6} C420 {y + 14} 200 {y + 30} -40 {y + 60} Z" fill="#c2b6a2"/>')
    g.append(''.join(f'<rect x="{x - 3}" y="{y}" width="6" height="22" fill="#8f7766"/><circle cx="{x}" cy="{y - 4}" r="14" fill="#8fbf7a"/>' for x, y in ((1500, 880), (1560, 900), (1660, 920), (1780, 960))))
    L = (1360, 1090)   # a llama
    g.append(f'<g transform="translate({L[0]} {L[1]}) scale(1.4)"><ellipse cx="0" cy="0" rx="56" ry="30" fill="#fbf4e6"/><rect x="34" y="-90" width="24" height="90" rx="12" fill="#fbf4e6"/><ellipse cx="54" cy="-92" rx="24" ry="16" fill="#fbf4e6"/><path d="M40 -104 l-4 -20 l10 14 Z M54 -106 l2 -20 l6 16 Z" fill="#fbf4e6"/><circle cx="60" cy="-94" r="3" fill="#5a4a4a"/>'
             f'<rect x="-44" y="20" width="12" height="44" fill="#ece2d0"/><rect x="-14" y="20" width="12" height="44" fill="#fbf4e6"/><rect x="18" y="20" width="12" height="44" fill="#ece2d0"/><rect x="38" y="20" width="12" height="44" fill="#fbf4e6"/><path d="M30 -60 l30 0" stroke="#f08a8a" stroke-width="8"/><path d="M-20 -30 L20 -30 L20 0 L-20 0 Z" fill="#f2a06a"/><path d="M-20 -22 L20 -22 M-20 -10 L20 -10" stroke="#f6d05a" stroke-width="4"/></g>')
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s128 羊の丘
def sheep_hills():
    """羊の丘: soft rolling green hills with dry-stone walls, a lone tree, a farmhouse; flocks of sheep (some wander: the page's)"""
    d, b = sky([(0, '#b6daf2'), (.55, '#e6f2f8'), (1, '#f2f6ea')])
    g = [b]
    g.append(band(700, 50, '#c8e0b8', 1281, 6)); g.append(band(780, 60, '#b4d6a0', 1282, 6))
    g.append(band(880, 70, '#a6ce8e', 1283, 6)); g.append(band(1000, 60, '#9ac684', 1284, 7))
    r = RNG(128)
    for k, (y0, amp, sd) in enumerate(((800, 60, 1282), (900, 70, 1283), (1020, 60, 1284))):   # dry-stone walls following the hills
        rr = RNG(sd); pts = [(-80 + i * (VW + 160) / 5, y0 + 20 + (rr.random() - .5) * 2 * amp) for i in range(6)]
        path = smooth_path(pts)
        g.append(f'<path d="{path}" fill="none" stroke="#c9c2b2" stroke-width="{5 + k * 3}"/><path d="{path}" fill="none" stroke="#e2dccf" stroke-width="{3 + k * 2}" stroke-dasharray="{8 + k * 4} {5 + k * 2}"/>')
    X, Y = 1500, 760
    g.append(f'<rect x="{X - 70}" y="{Y - 60}" width="140" height="64" fill="#f6efe2"/><path d="M{X - 86} {Y - 56} L{X} {Y - 110} L{X + 86} {Y - 56} Z" fill="#b8a8a0"/><rect x="{X + 30}" y="{Y - 96}" width="16" height="30" fill="#b8a8a0"/><rect x="{X - 46}" y="{Y - 40}" width="24" height="24" fill="#a9c8e6"/><rect x="{X - 10}" y="{Y - 40}" width="24" height="44" fill="#8a7a6a"/>')
    g.append(round_tree(640, 890, 300, '#8cbf7a', '#8f7766', '#7fb26e'))
    def sheep(x, y, s, f=1):
        return (f'<g transform="translate({x:.0f} {y:.0f}) scale({s * f:.2f} {s:.2f})"><rect x="-26" y="6" width="8" height="22" fill="#5f5a5a"/><rect x="14" y="6" width="8" height="22" fill="#5f5a5a"/>'
                + ''.join(f'<circle cx="{cx}" cy="{cy}" r="{rr}" fill="#fbfaf6"/>' for cx, cy, rr in ((-24, -6, 16), (-6, -14, 18), (14, -10, 17), (24, 2, 14), (-14, 6, 16), (8, 8, 16)))
                + '<ellipse cx="38" cy="-8" rx="12" ry="14" fill="#5f5a5a"/><ellipse cx="30" cy="-18" rx="8" ry="5" fill="#5f5a5a"/></g>')
    for _ in range(26):
        y = 760 + r.random() ** .7 * 420; x = r.random() * VW; s = .3 + (y - 760) / 420 * 1.3
        g.append(sheep(x, y, s, 1 if r.random() < .5 else -1))
    g.append(''.join(f'<circle cx="{r.random() * VW:.0f}" cy="{1000 + r.random() * 200:.0f}" r="{3 + r.random() * 3:.0f}" fill="{["#ffffff", "#f6d05a"][int(r.random() * 2)]}"/>' for _ in range(90)))
    return doc(d, ''.join(g))

SSR4 = {'s113': bamboo, 's114': tram_hill, 's115': mushroom_village, 's116': ginkgo_avenue, 's117': tea_fuji, 's118': rice_terraces,
        's119': snow_onsen, 's120': sunflowers, 's121': windmill_tulips, 's122': alpine, 's123': london, 's124': new_york,
        's125': taj_mahal, 's126': angkor, 's127': machu_picchu, 's128': sheep_hills}

# ------------------------------------------------------------------------------------------------ s129 熱帯雨林
def rainforest():
    """熱帯雨林: layered jungle in green mist, giant leaves and vines in front, a waterfall far back (parrots and butterflies are the page's)"""
    d, b = sky([(0, '#cfe8dc'), (.5, '#e4f2e2'), (1, '#eef4e2')])
    g = [b, glow(1100, 300, 700, 260, '#fffbe6', .7, 'b60')]
    g.append('<path d="M980 300 L1080 300 L1100 760 L960 760 Z" fill="#dff2f4"/><path d="M1000 300 L1020 300 L1030 760 L1000 760 Z" fill="#ffffff" opacity=".7"/>')
    g.append('<path d="M760 760 C800 500 860 300 980 300 L980 760 Z M1080 300 C1200 300 1260 480 1320 760 L1100 760 Z" fill="#a9cdb0"/>')
    r = RNG(129)
    for layer, (y, cnt, smin, smax, c1, c2) in enumerate(((620, 22, 120, 200, '#b7d8bc', '#abd0b0'), (760, 18, 180, 280, '#94c49c', '#86b98f'), (900, 14, 240, 360, '#78b07f', '#6aa373'))):
        for _ in range(cnt):
            x = r.random() * VW; sz = smin + r.random() * (smax - smin)
            g.append(('' and f'<path d="M{x - sz * .03:.0f} 1200 C{x - sz * .02:.0f} {y + 100:.0f} {x + sz * .04:.0f} {y + 20:.0f} {x:.0f} {y - sz * .1:.0f} L{x + sz * .04:.0f} {y - sz * .1:.0f} C{x + sz * .08:.0f} {y + 20:.0f} {x + sz * .03:.0f} {y + 100:.0f} {x + sz * .05:.0f} 1200 Z" fill="#9a907a" opacity=".7"/>' if r.random() < .45 else '')
                     + ''.join(f'<ellipse cx="{x + dx * sz:.0f}" cy="{y - sz * .3 + dy * sz:.0f}" rx="{sz * .36:.0f}" ry="{sz * .2:.0f}" fill="{c1 if (dx + dy) % .2 else c2}"/>' for dx, dy in ((-.36, .05), (.34, 0), (0, -.16), (-.16, .12), (.18, .14), (-.5, .16), (.5, .14))))
        g.append(band(y - 30, 30, c2, 1290 + layer, 9))   # the wall of undergrowth below this layer's crowns
        g.append(haze(y - 300, y + 60, '#e6f2e4', .35 - layer * .1))
    for x, w in ((330, 70), (1560, 90)):   # two big trunks with buttress roots
        g.append(f'<path d="M{x - w} 1200 C{x - w * .6:.0f} 1120 {x - w * .45:.0f} 1060 {x - w * .4:.0f} 900 L{x - w * .35:.0f} -20 L{x + w * .35:.0f} -20 L{x + w * .4:.0f} 900 C{x + w * .45:.0f} 1060 {x + w * .6:.0f} 1120 {x + w} 1200 Z" fill="#8a7a62"/><path d="M{x + w * .05:.0f} -20 L{x + w * .35:.0f} -20 L{x + w * .4:.0f} 900 C{x + w * .45:.0f} 1060 {x + w * .6:.0f} 1120 {x + w} 1200 L{x + w * .2:.0f} 1200 Z" fill="#7a6a54"/>')
        g.append(''.join(f'<ellipse cx="{x + (w * .3 if k % 2 else -w * .3):.0f}" cy="{200 + k * 170}" rx="{w * .35:.0f}" ry="{w * .18:.0f}" fill="#7fae6a"/>' for k in range(5)))
    for x, y, s2 in ((560, 1200, 1), (760, 1210, .8), (1180, 1200, 1.1), (1380, 1210, .9), (980, 1220, .7)):   # ferns on the floor
        g.append(''.join(f'<path d="M{x} {y} Q{x + a * 60 * s2:.0f} {y - 120 * s2:.0f} {x + a * 150 * s2:.0f} {y - 150 * s2 + abs(a) * 50 * s2:.0f}" stroke="#5f9a5e" stroke-width="{12 * s2:.0f}" fill="none" stroke-linecap="round"/>' for a in (-1, -.55, -.15, .25, .65, 1)))
    for x, y in ((640, 1080), (1260, 1060), (1460, 1120), (880, 1110)):   # heliconia
        g.append(f'<path d="M{x} 1200 L{x} {y}" stroke="#5f9a5e" stroke-width="6"/>' + ''.join(f'<path d="M{x} {y + k * 26} l{(-1) ** k * 34} -10 l{-(-1) ** k * 20} 22 Z" fill="{["#f06a4a", "#f6b83a"][k % 2]}"/>' for k in range(4)))
    def leaf(x, y, L, a, c):   # a big monstera-ish leaf
        return f'<g transform="translate({x} {y}) rotate({a})"><path d="M0 0 C{L * .3:.0f} {-L * .32:.0f} {L * .8:.0f} {-L * .3:.0f} {L:.0f} 0 C{L * .8:.0f} {L * .3:.0f} {L * .3:.0f} {L * .32:.0f} 0 0 Z" fill="{c}"/><path d="M0 0 L{L:.0f} 0" stroke="#e6f4dc" stroke-width="{L * .02:.0f}" opacity=".7"/>' + ''.join(f'<path d="M{L * t:.0f} 0 L{L * (t + .1):.0f} {-L * .2:.0f} M{L * t:.0f} 0 L{L * (t + .1):.0f} {L * .2:.0f}" stroke="#e6f4dc" stroke-width="{L * .012:.0f}" opacity=".6"/>' for t in (.25, .45, .65)) + '</g>'
    g.append(''.join(leaf(x, y, L, a, c) for x, y, L, a, c in ((-40, 1060, 420, -24, '#5f9a64'), (-20, 1180, 380, -6, '#6aa86c'), (120, 1220, 300, -50, '#4f8a58'), (1960, 1040, 420, 204, '#5f9a64'), (1940, 1180, 360, 186, '#6aa86c'), (1780, 1230, 300, 232, '#4f8a58'))))
    g.append(''.join(f'<path d="M{x} -20 C{x + 30} 200 {x - 30} 400 {x + 20} {L}" stroke="#7fa86a" stroke-width="7" fill="none"/>' + ''.join(f'<ellipse cx="{x + (14 if k % 2 else -14) + 10 * math.sin(k)}" cy="{40 + k * 60}" rx="14" ry="7" fill="#8fbf74"/>' for k in range(int(L // 60))) for x, L in ((240, 420), (420, 300), (1520, 380), (1700, 460))))
    g.append(''.join(f'<path d="M{x} 1200 C{x - 10} 1150 {x + 10} 1100 {x} 1060" stroke="#d98aa8" stroke-width="4" fill="none"/><path d="M{x - 18} 1060 C{x - 18} 1030 {x + 18} 1030 {x + 18} 1060 L{x} 1090 Z" fill="#f08aa8"/>' for x in (520, 1360, 1460)))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s130 渓谷の滝
def canyon_falls():
    """渓谷の滝: a tall waterfall pouring between mossy cliffs into a pool, a red footbridge, spray and a rainbow (the falling water is the page's)"""
    d, b = sky([(0, '#c4e2f2'), (.55, '#e6f2f2'), (1, '#eef2e6')])
    g = [b]
    g.append(band(520, 50, '#bcd2cc', 1301, 6))
    g.append('<path d="M-40 1200 L-40 200 C120 180 300 240 420 300 C560 380 700 300 820 320 L840 1200 Z" fill="#9db8a8"/><path d="M1960 1200 L1960 160 C1800 180 1640 240 1520 300 C1380 360 1200 300 1080 320 L1060 1200 Z" fill="#9db8a8"/>')
    g.append('<path d="M-40 1200 L-40 360 C200 340 420 420 600 460 C700 480 800 500 860 520 L880 1200 Z" fill="#88aa96"/><path d="M1960 1200 L1960 340 C1720 360 1500 420 1320 470 C1220 490 1100 510 1040 520 L1020 1200 Z" fill="#88aa96"/>')
    r = RNG(130)
    for side in (0, 1):   # rock strata: ledges that step down towards the falls, moss along each ledge
        for k in range(9):
            y = 300 + k * 80 + side * 20; x_in = 820 - k * 6 if side == 0 else 1100 + k * 6
            xa, xb = (-40, x_in) if side == 0 else (x_in, 1960)
            g.append(f'<path d="M{xa} {y + 34} C{xa + (xb - xa) * .3:.0f} {y + 20} {xa + (xb - xa) * .7:.0f} {y + 44} {xb} {y + 30} L{xb} {y + 42} C{xa + (xb - xa) * .7:.0f} {y + 56} {xa + (xb - xa) * .3:.0f} {y + 32} {xa} {y + 46} Z" fill="#7a9a88" opacity=".55"/>')
            for _ in range(5):
                mx = xa + r.random() * (xb - xa); mw = 60 + r.random() * 140
                g.append(f'<path d="M{mx:.0f} {y + 30:.0f} q{mw * .2:.0f} -{14 + r.random() * 10:.0f} {mw * .5:.0f} -{8 + r.random() * 8:.0f} q{mw * .3:.0f} -4 {mw * .5:.0f} 8 Z" fill="{["#a6c88c", "#94bc7e", "#b4d49a"][int(r.random() * 3)]}"/>')
    g.append(lin('fall', [(0, '#e8f6fa'), (.5, '#cfe8f0'), (1, '#f4fbfd')]).join(('<defs>', '</defs>')))
    g.append('<path d="M856 330 C870 600 846 820 836 1000 L1084 1000 C1074 820 1050 600 1064 330 Z" fill="url(#fall)"/>')
    rf = RNG(1303)
    g.append(''.join(f'<path d="M{x:.0f} 334 C{x + (rf.random() - .5) * 8:.0f} 600 {x - 8 + (x - 960) * .05:.0f} 820 {x - 10 + (x - 960) * .1:.0f} 1000" stroke="{["#ffffff", "#bfe0ea", "#e2f2f8"][int(rf.random() * 3)]}" stroke-width="{1.5 + rf.random() * 4:.1f}" opacity="{.4 + rf.random() * .5:.2f}" fill="none"/>' for x in [860 + k * 5.2 for k in range(39)]))
    g.append('<path d="M846 334 C900 318 1020 318 1074 334 C1040 348 880 348 846 334 Z" fill="#ffffff" opacity=".85"/>')
    g.append('<ellipse cx="960" cy="1000" rx="230" ry="46" fill="#ffffff" opacity=".9" filter="url(#b8)"/><ellipse cx="960" cy="980" rx="160" ry="60" fill="#ffffff" opacity=".6" filter="url(#b16)"/>')
    g.append('<path d="M820 320 C880 300 1000 300 1100 320 L1100 340 L820 340 Z" fill="#7d9a8a"/>')
    g.append('<path d="M640 1000 C760 960 1160 960 1280 1000 L1280 1200 L640 1200 Z" fill="#a9d4e0"/><ellipse cx="960" cy="1010" rx="260" ry="34" fill="#ffffff" opacity=".7" filter="url(#b16)"/>')
    g.append('<g opacity=".38" filter="url(#b4)">' + ''.join(f'<path d="M560 980 A420 420 0 0 1 1360 980" stroke="{c}" stroke-width="18" fill="none" transform="translate(0 {k * 18})"/>' for k, c in enumerate(('#f6a8a8', '#f6d79a', '#a9d8a8', '#a9c8f0', '#c9a8e8'))) + '</g>')
    g.append('<path d="M600 760 Q960 700 1320 760" stroke="#d9634e" stroke-width="18" fill="none"/>' + ''.join(f'<rect x="{x - 4}" y="{y - 46}" width="8" height="46" fill="#d9634e"/>' for x, y in ((640, 754), (760, 732), (880, 722), (1040, 722), (1160, 732), (1280, 754))) + '<path d="M600 714 Q960 654 1320 714" stroke="#d9634e" stroke-width="8" fill="none"/>')
    g.append(''.join(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#8f9a96"/><ellipse cx="{x - rx * .2:.0f}" cy="{y - ry * .4:.0f}" rx="{rx * .6:.0f}" ry="{ry * .4:.0f}" fill="#a6b0ac"/>' for x, y, rx, ry in ((560, 1150, 120, 60), (1380, 1140, 110, 56), (760, 1190, 90, 40), (1180, 1190, 100, 44))))
    g.append(''.join(pine(x, y, h, '#5f8f6a', '#548260') for x, y, h in ((120, 380, 160), (260, 420, 130), (1700, 360, 170), (1820, 380, 140), (1560, 420, 120))))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s131 スキー場
def ski_slope():
    """スキー場: a deep blue sky over a range of snowy peaks (shaded faces, rock ribs), a forested ridge with the lift's top
    station, a wide groomed piste sweeping down between groups of snowy firs to the base: a timber lodge with balconies and
    the lift's bottom station (skiers, the chairs, falling snow and clouds are the page's: the lift runs 1255,1040 → 1585,612)"""
    d, b = sky([(0, '#5aa4e8'), (.45, '#a8d2f4'), (.7, '#e2f0fa'), (1, '#f4f9fc')])
    g = [b, glow(1500, 180, 420, 200, '#ffffff', .5, 'b60')]
    def peak(px, py, w, base, c, cs):
        L, R = px - w / 2, px + w / 2
        m = f'M{L:.0f} {base} L{px - w * .14:.0f} {py + 90:.0f} L{px - w * .05:.0f} {py + 30:.0f} L{px:.0f} {py:.0f} L{px + w * .08:.0f} {py + 46:.0f} L{px + w * .2:.0f} {py + 120:.0f} L{R:.0f} {base} Z'
        cid = f'pk{px}'
        o = f'<clipPath id="{cid}"><path d="{m}"/></clipPath><path d="{m}" fill="#ffffff"/><g clip-path="url(#{cid})">'
        o += f'<path d="M{px:.0f} {py - 10:.0f} L{R + 40:.0f} {base} L{px + w * .02:.0f} {base} L{px + 6:.0f} {py + 80:.0f} Z" fill="{cs}"/>'
        o += ''.join(f'<path d="M{px + dx:.0f} {py + 60 + abs(dx) * .8:.0f} q{6 if dx > 0 else -6} {60 + k * 20} {(14 if dx > 0 else -14) + k * 4} {140 + k * 40}" stroke="{c}" stroke-width="{10 - k * 2}" fill="none" stroke-linecap="round" opacity=".55"/>' for k, dx in enumerate((-w * .1, w * .06, w * .16, -w * .22)))
        return o + '</g>'
    g.append(peak(260, 380, 760, 760, '#9fb4cc', '#dfe8f2') + peak(1560, 250, 900, 760, '#9fb4cc', '#dae4f0') + peak(800, 150, 1000, 760, '#90a8c4', '#d6e2ee'))
    g.append(haze(560, 760, '#eef5fb', .55))
    g.append(band(640, 30, '#f2f6fb', 1311, 7))   # the ridge
    r = RNG(131)
    def grove(x0, x1, y0, y1, n, hmin, hmax):
        pts = sorted(((x0 + r.random() * (x1 - x0), y0 + r.random() * (y1 - y0)) for _ in range(n)), key=lambda q: q[1])
        return ''.join(pine(x, y, (hmin + r.random() * (hmax - hmin)) * (.7 + (y - y0) / max(1, y1 - y0) * .5), '#5f7f98', '#55738c', True) for x, y in pts)
    g.append(grove(-40, 840, 640, 720, 34, 60, 90) + grove(1320, 1960, 640, 720, 30, 60, 90))
    # the piste: from the ridge down to the base, groomed corduroy
    g.append('<path d="M1000 660 C1080 660 1180 662 1240 668 C1200 760 1120 860 1120 960 C1120 1060 1220 1140 1300 1200 L620 1200 C700 1120 760 1040 780 960 C800 860 900 760 1000 660 Z" fill="#ffffff"/>')
    g.append(''.join(f'<path d="M{1000 + k * 24} 664 C{960 + k * 18} 760 {860 + k * 30} 860 {860 + k * 40} 960 C{860 + k * 50} 1060 {700 + k * 70} 1140 {640 + k * 66} 1200" stroke="#e6eef8" stroke-width="2.5" fill="none"/>' for k in range(10)))
    g.append('<path d="M1000 660 C900 760 800 860 780 960 C760 1040 700 1120 620 1200" stroke="#dfe8f2" stroke-width="10" fill="none"/><path d="M1240 668 C1200 760 1120 860 1120 960 C1120 1060 1220 1140 1300 1200" stroke="#dfe8f2" stroke-width="10" fill="none"/>')
    g.append('<path d="M-40 1200 L-40 800 C200 760 500 740 760 780 L700 1200 Z" fill="#f4f8fc"/><path d="M1960 1200 L1960 760 C1700 740 1400 760 1180 800 L1300 1200 Z" fill="#f4f8fc"/>')
    g.append(grove(560, 800, 760, 980, 16, 90, 140) + grove(1160, 1440, 760, 960, 14, 90, 140))
    for x, y, c in ((900, 820, '#e85a5a'), (1010, 880, '#3f7ad8'), (900, 960, '#e85a5a'), (1020, 1040, '#3f7ad8'), (880, 1110, '#e85a5a')):   # slalom gates
        g.append(f'<rect x="{x - 2}" y="{y - 40}" width="4" height="40" fill="#6a7484"/><path d="M{x + 2} {y - 40} L{x + 30} {y - 32} L{x + 2} {y - 24} Z" fill="{c}"/>')
    g.append('<path d="M640 1150 L760 1150" stroke="#f08a4a" stroke-width="6" stroke-dasharray="14 6"/>' + ''.join(f'<rect x="{x}" y="1146" width="4" height="34" fill="#8a6a54"/>' for x in (640, 700, 760)))
    # the lift: towers shrinking up the slope, the top station on the ridge, the bottom station at the base
    A, B = (1255, 1040), (1585, 612)
    for t in (.28, .58, .82):
        x, y = A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t; k = 1 - t * .55
        g.append(f'<rect x="{x - 5 * k:.0f}" y="{y - 30:.0f}" width="{10 * k:.0f}" height="{110 * k + 30:.0f}" fill="#7f8796"/><rect x="{x - 26 * k:.0f}" y="{y - 34:.0f}" width="{52 * k:.0f}" height="{8 * k + 2:.0f}" fill="#6f7786"/><ellipse cx="{x:.0f}" cy="{y + 110 * k:.0f}" rx="{24 * k:.0f}" ry="{6 * k:.0f}" fill="#e2eaf4"/>')
    g.append(f'<path d="M{A[0]} {A[1] - 34} L{B[0]} {B[1] - 34}" stroke="#4a5262" stroke-width="2.5"/><path d="M{A[0] + 24} {A[1] - 26} L{B[0] + 16} {B[1] - 28}" stroke="#4a5262" stroke-width="2.5"/>')
    g.append(f'<rect x="{B[0] - 20}" y="{B[1] - 34}" width="86" height="50" fill="#9aa4b4"/><path d="M{B[0] - 30} {B[1] - 30} L{B[0] + 23} {B[1] - 62} L{B[0] + 76} {B[1] - 30} Z" fill="#ffffff"/><rect x="{B[0] + 30}" y="{B[1] - 20}" width="26" height="20" fill="#ffd796"/><circle cx="{B[0] + 2}" cy="{B[1] - 26}" r="14" fill="#5f6878"/><ellipse cx="{B[0] + 22}" cy="{B[1] + 18}" rx="90" ry="12" fill="#f4f8fc"/>')
    g.append(f'<rect x="{A[0] - 40}" y="{A[1] - 46}" width="150" height="86" fill="#9aa4b4"/><path d="M{A[0] - 56} {A[1] - 40} L{A[0] + 35} {A[1] - 92} L{A[0] + 126} {A[1] - 40} Z" fill="#ffffff"/><path d="M{A[0] - 56} {A[1] - 40} L{A[0] + 126} {A[1] - 40} L{A[0] + 116} {A[1] - 30} L{A[0] - 46} {A[1] - 30} Z" fill="#dfe6ee"/>'
             f'<circle cx="{A[0] + 4}" cy="{A[1] - 30}" r="26" fill="#5f6878"/><rect x="{A[0] + 56}" y="{A[1] - 20}" width="40" height="30" fill="#ffd796"/><ellipse cx="{A[0] + 35}" cy="{A[1] + 44}" rx="130" ry="14" fill="#e6eef6"/>')
    # the lodge: a timber chalet with balconies, a snowy roof, warm windows, a rack of skis
    X, Y = 330, 1100
    g.append(f'<rect x="{X - 200}" y="{Y - 190}" width="400" height="190" fill="#a9785a"/>' + ''.join(f'<rect x="{X - 200}" y="{Y - 190 + i * 19}" width="400" height="3" fill="#946648"/>' for i in range(10))
             + f'<path d="M{X - 250} {Y - 176} L{X} {Y - 330} L{X + 250} {Y - 176} Z" fill="#7a5a44"/><path d="M{X - 262} {Y - 172} L{X} {Y - 342} L{X + 262} {Y - 172} L{X + 240} {Y - 156} L{X} {Y - 314} L{X - 240} {Y - 156} Z" fill="#ffffff"/>'
             + f'<path d="M{X - 200} {Y - 100} L{X + 200} {Y - 100}" stroke="#6a4a38" stroke-width="12"/>' + ''.join(f'<rect x="{X - 196 + i * 28}" y="{Y - 126}" width="5" height="26" fill="#6a4a38"/>' for i in range(15))
             + ''.join(f'<rect x="{X - 170 + i * 96}" y="{Y - 172}" width="56" height="52" rx="4" fill="#ffd796"/><path d="M{X - 142 + i * 96} {Y - 172} L{X - 142 + i * 96} {Y - 120}" stroke="#a9785a" stroke-width="4"/>' for i in range(4))
             + ''.join(f'<rect x="{X - 170 + i * 96}" y="{Y - 80}" width="56" height="52" rx="4" fill="#ffd796"/>' for i in (0, 3)) + f'<rect x="{X - 40}" y="{Y - 90}" width="80" height="90" rx="6" fill="#6a4a38"/>'
             + f'<rect x="{X + 110}" y="{Y - 300}" width="30" height="70" fill="#8f7766"/><rect x="{X + 104}" y="{Y - 306}" width="42" height="12" rx="4" fill="#ffffff"/>')
    g.append(glow(X, Y - 120, 300, 140, '#ffd796', .25, 'b30'))
    g.append(f'<rect x="{X + 220}" y="{Y - 70}" width="90" height="8" fill="#8a6a54"/>' + ''.join(f'<rect x="{X + 226 + i * 14}" y="{Y - 120}" width="7" height="120" rx="3" fill="{c}"/>' for i, c in enumerate(('#e85a5a', '#3f7ad8', '#f6b83a', '#5ac85a', '#e85a5a', '#3f7ad8'))))
    g.append(f'<ellipse cx="{X}" cy="{Y + 8}" rx="300" ry="20" fill="#e6eef6"/>')
    S = (1620, 1120)   # a snowman by the base
    g.append(f'<circle cx="{S[0]}" cy="{S[1] - 40}" r="46" fill="#ffffff"/><circle cx="{S[0]}" cy="{S[1] - 108}" r="32" fill="#ffffff"/><circle cx="{S[0] - 10}" cy="{S[1] - 114}" r="4" fill="#3a3a4a"/><circle cx="{S[0] + 10}" cy="{S[1] - 114}" r="4" fill="#3a3a4a"/><path d="M{S[0]} {S[1] - 104} l20 6 l-20 2 Z" fill="#f08a4a"/><path d="M{S[0] - 30} {S[1] - 84} Q{S[0]} {S[1] - 74} {S[0] + 30} {S[1] - 84}" stroke="#e85a5a" stroke-width="10" fill="none"/><path d="M{S[0] - 24} {S[1] - 134} L{S[0] + 24} {S[1] - 134} L{S[0] + 16} {S[1] - 168} L{S[0] - 16} {S[1] - 168} Z" fill="#3f5a8a"/>')
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s132 クリスマスの村
def christmas_village():
    """クリスマスの村: a snowy village at blue dusk, gabled houses with lit windows and wreaths, a big decorated tree in the square (snow, smoke, twinkling lights and the sleigh are the page's)"""
    d, b = sky([(0, '#2e3a6e'), (.5, '#55609a'), (1, '#9aa0c8')])
    g = [b, stars(160, 132, 0, 560)]
    g.append(band(700, 50, '#7f88b8', 1321, 6)); g.append(band(760, 40, '#c9d0e8', 1322, 7))
    r = RNG(132)
    for _ in range(18):
        g.append(pine(r.random() * VW, 760 + r.random() * 40, 90 + r.random() * 60, '#5a6a8e', '#4f5f84', True))
    cols = ['#d9a08a', '#c9b4d6', '#e0c49a', '#a9b8d6', '#d6a0a8']
    x = -20
    while x < 1940:
        if 760 < x < 1160: x = 1160
        w = 150 + r.random() * 50; h = 140 + r.random() * 70; top = 1040 - h; c = cols[int(r.random() * 5)]
        g.append(f'<rect x="{x:.0f}" y="{top:.0f}" width="{w:.0f}" height="{h + 200:.0f}" fill="{c}"/><path d="M{x - 14:.0f} {top + 8:.0f} L{x + w / 2:.0f} {top - w * .5:.0f} L{x + w + 14:.0f} {top + 8:.0f} Z" fill="#ffffff"/><path d="M{x - 14:.0f} {top + 8:.0f} L{x + w + 14:.0f} {top + 8:.0f} L{x + w:.0f} {top + 20:.0f} L{x:.0f} {top + 20:.0f} Z" fill="#dfe4f2"/>')
        g.append(''.join(f'<rect x="{x + 20 + i * 52:.0f}" y="{top + 44:.0f}" width="30" height="40" rx="4" fill="#ffd98e"/><circle cx="{x + 35 + i * 52:.0f}" cy="{top + 64:.0f}" r="26" fill="#ffd98e" opacity=".22"/>' for i in range(int((w - 20) // 52))))
        g.append(f'<rect x="{x + w * .4:.0f}" y="{1040 - 64:.0f}" width="{w * .2:.0f}" height="64" fill="#7a5a4a"/><circle cx="{x + w * .5:.0f}" cy="{1040 - 84:.0f}" r="13" fill="none" stroke="#5f9a64" stroke-width="7"/><circle cx="{x + w * .5:.0f}" cy="{1040 - 72:.0f}" r="4" fill="#e85a5a"/>')
        g.append(f'<rect x="{x + w * .7:.0f}" y="{top - w * .4:.0f}" width="18" height="40" fill="#8a6a5a"/><rect x="{x + w * .7 - 3:.0f}" y="{top - w * .4 - 6:.0f}" width="24" height="10" rx="4" fill="#ffffff"/>')
        x += w + 10
    T = (960, 1080)   # the big tree
    g.append(''.join(f'<path d="M{T[0]} {T[1] - 480 + k * 110} L{T[0] + 90 + k * 50} {T[1] - 340 + k * 110} L{T[0] - 90 - k * 50} {T[1] - 340 + k * 110} Z" fill="{["#4f8a5e", "#5a966a"][k % 2]}"/>' for k in range(4)) + f'<rect x="{T[0] - 20}" y="{T[1] - 40}" width="40" height="40" fill="#7a5a4a"/><path d="M{T[0]} {T[1] - 530} l12 26 l28 2 l-22 18 l8 28 l-26 -16 l-26 16 l8 -28 l-22 -18 l28 -2 Z" fill="#ffd96e"/>')
    g.append(glow(T[0], T[1] - 300, 240, 260, '#ffd98e', .25, 'b30'))
    g.append('<path d="M-40 1200 L-40 1040 C400 1020 800 1050 960 1060 C1200 1050 1500 1020 1960 1040 L1960 1200 Z" fill="#eef1fa"/>')
    g.append(''.join(f'<rect x="{x - 4}" y="1000" width="8" height="100" fill="#4a5070"/><rect x="{x - 14}" y="984" width="28" height="24" rx="4" fill="#ffe6a6"/><circle cx="{x}" cy="996" r="40" fill="#ffe6a6" opacity=".25" filter="url(#b8)"/>' for x in (680, 1240)))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s133 紫陽花の雨
def hydrangea_rain():
    """紫陽花の雨: a temple path lined with hydrangeas in blue, violet and pink under a soft rainy sky, stone steps and a gate (the rain, ripples and a snail are the page's)"""
    d, b = sky([(0, '#c4ccd8'), (.55, '#dfe2e8'), (1, '#e8eae6')])
    g = [b]
    g.append(band(560, 60, '#b9c4c4', 1331, 6))
    g.append('<rect x="860" y="420" width="200" height="240" fill="#ddd2c2"/><path d="M800 430 C880 400 1040 400 1120 430 L1120 446 L800 446 Z" fill="#6f6a7e"/><rect x="820" y="446" width="20" height="214" fill="#a6614e"/><rect x="1080" y="446" width="20" height="214" fill="#a6614e"/><path d="M780 470 L1140 470" stroke="#a6614e" stroke-width="16"/>')
    g.append(haze(500, 720, '#e2e4e6', .45))
    g.append('<path d="M-40 1200 L-40 700 C300 680 700 660 960 660 C1220 660 1620 680 1960 700 L1960 1200 Z" fill="#a9c49e"/>')
    for k in range(10):   # stone steps
        y = 670 + k * (16 + k * 5); w = 90 + k * 34
        g.append(f'<rect x="{960 - w}" y="{y}" width="{w * 2}" height="{10 + k * 4}" fill="#c9c4ba"/><rect x="{960 - w}" y="{y}" width="{w * 2}" height="{3 + k}" fill="#ddd8ce"/>')
    r = RNG(133)
    def bush(x, y, s, c, c2):
        o = ''
        for k in range(9):   # leaves: big, pointed, with a vein
            a = -3.0 + k * .75 + (r.random() - .5) * .3; L = s * (.5 + r.random() * .16); lx, ly = x + math.cos(a) * s * .3, y + s * .16
            ex, ey = lx + math.cos(a) * L, ly + math.sin(a) * L * .55
            o += f'<path d="M{lx:.0f} {ly:.0f} Q{(lx + ex) / 2 - math.sin(a) * L * .25:.0f} {(ly + ey) / 2 + math.cos(a) * L * .18:.0f} {ex:.0f} {ey:.0f} Q{(lx + ex) / 2 + math.sin(a) * L * .25:.0f} {(ly + ey) / 2 - math.cos(a) * L * .18:.0f} {lx:.0f} {ly:.0f} Z" fill="{["#6f9e6a", "#7fae76", "#5f8f5e"][k % 3]}"/><path d="M{lx:.0f} {ly:.0f} L{ex:.0f} {ey:.0f}" stroke="#9cc48e" stroke-width="{max(1, s * .008):.1f}" opacity=".7"/>'
        for dx, dy, rr in ((-.4, -.16, .27), (.32, -.2, .29), (0, -.4, .28), (-.1, -.02, .24), (.48, .04, .21), (-.52, .08, .2)):
            cx, cy, R = x + dx * s, y + dy * s, rr * s
            o += f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{R * .8:.0f}" fill="{c}"/>'
            n = int(22 + R * .32)
            for _ in range(n):   # florets: four rounded petals and a dot
                a, d2 = r.random() * 6.283, R * .92 * r.random() ** .5; fx, fy, fs = cx + math.cos(a) * d2, cy + math.sin(a) * d2 * .92, R * (.2 + r.random() * .07)
                fc = c2 if (fy < cy - R * .1 or r.random() < .5) else c; rot = r.random() * 90
                o += ''.join(f'<ellipse cx="{fx + math.cos(b) * fs * .5:.1f}" cy="{fy + math.sin(b) * fs * .5:.1f}" rx="{fs * .48:.1f}" ry="{fs * .4:.1f}" transform="rotate({math.degrees(b):.0f} {fx + math.cos(b) * fs * .5:.1f} {fy + math.sin(b) * fs * .5:.1f})" fill="{fc}"/>' for b in [math.radians(rot) + q * 1.571 for q in range(4)]) + f'<circle cx="{fx:.1f}" cy="{fy:.1f}" r="{fs * .14:.1f}" fill="#ffffff" opacity=".8"/>'
        return o
    pal = [('#8aa6e6', '#c8d8f8'), ('#a894e0', '#dcd0f6'), ('#e894bc', '#fad2e4'), ('#94bcec', '#d6e6fa')]
    for side in (-1, 1):
        for k in range(8):
            t = k / 7; x = 960 + side * (180 + t ** 1.2 * 760); y = 700 + t ** 1.4 * 480; s = 60 + t * 220
            c, c2 = pal[int(r.random() * 4)]; g.append(bush(x, y, s, c, c2))
    g.append(''.join(f'<path d="M{x} {y} m-60 0 a60 14 0 1 0 120 0 a60 14 0 1 0 -120 0" fill="#c9d4dc" opacity=".55"/>' for x, y in ((800, 1150), (1160, 1120), (980, 1060))))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s134 りんごの果樹園
def apple_orchard():
    """りんごの果樹園: rows of round apple trees heavy with red fruit on a gentle autumn slope, ladders and baskets, a red barn (falling leaves and a bird are the page's)"""
    d, b = sky([(0, '#bcdcf0'), (.55, '#e8f2f2'), (1, '#f6f0de')])
    g = [b]
    g.append(band(680, 40, '#c9dcb8', 1341, 6)); g.append(band(740, 30, '#b8d4a0', 1342, 7))
    g.append('<rect x="1440" y="640" width="200" height="120" fill="#c8584e"/><path d="M1420 646 L1540 570 L1660 646 Z" fill="#a84a44"/><rect x="1510" y="690" width="60" height="70" fill="#f6efe2"/><path d="M1510 690 L1570 760 M1570 690 L1510 760" stroke="#c8584e" stroke-width="5"/>')
    g.append('<path d="M-40 1200 L-40 780 C500 760 1200 760 1960 790 L1960 1200 Z" fill="#b4d48e"/>')
    r = RNG(134)
    def apple(x, y, R):
        return (f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{R:.1f}" fill="#d8443e"/><path d="M{x - R:.1f} {y:.1f} A{R:.1f} {R:.1f} 0 0 0 {x + R:.1f} {y:.1f} A{R:.1f} {R * .6:.1f} 0 0 1 {x - R:.1f} {y:.1f} Z" fill="#b83a36" opacity=".6"/>'
                f'<ellipse cx="{x - R * .35:.1f}" cy="{y - R * .35:.1f}" rx="{R * .28:.1f}" ry="{R * .2:.1f}" fill="#ffffff" opacity=".55"/><path d="M{x:.1f} {y - R * .8:.1f} q{R * .1:.1f} {-R * .4:.1f} {R * .3:.1f} {-R * .5:.1f}" stroke="#7a5a3a" stroke-width="{max(1, R * .14):.1f}" fill="none"/>'
                f'<path d="M{x + R * .1:.1f} {y - R * 1.05:.1f} q{R * .5:.1f} {-R * .35:.1f} {R * .8:.1f} 0 q{-R * .4:.1f} {R * .3:.1f} {-R * .8:.1f} 0 Z" fill="#6fa85a"/>')
    for row, (y, n, sz) in enumerate(((800, 12, 100), (880, 9, 150), (990, 7, 220), (1140, 5, 320))):
        for i in range(n):
            x = (i + .5 + (row % 2) * .5) * VW / n + (r.random() - .5) * 40; ss = sz * (.9 + r.random() * .2)
            g.append(f'<path d="M{x - ss * .06:.0f} {y:.0f} L{x - ss * .04:.0f} {y - ss * .55:.0f} L{x - ss * .25:.0f} {y - ss * .8:.0f} M{x + ss * .04:.0f} {y - ss * .55:.0f} L{x + ss * .22:.0f} {y - ss * .82:.0f}" stroke="#9a7a5e" stroke-width="{ss * .07:.1f}" fill="none" stroke-linecap="round"/><rect x="{x - ss * .06:.0f}" y="{y - ss * .55:.0f}" width="{ss * .12:.0f}" height="{ss * .55:.0f}" fill="#9a7a5e"/>')
            for dx, dy, rr, c in ((-.3, -.72, .34, '#6fa25e'), (.3, -.74, .34, '#6fa25e'), (0, -.98, .36, '#7fb06a'), (-.42, -.92, .26, '#7fb06a'), (.42, -.95, .26, '#7fb06a'), (-.12, -.78, .3, '#8fbf74'), (.14, -1.06, .24, '#8fbf74')):
                g.append(f'<circle cx="{x + dx * ss:.0f}" cy="{y + dy * ss:.0f}" r="{rr * ss:.0f}" fill="{c}"/>')
            for _ in range(int(3 + row * 2.5)):
                a, d2 = r.random() * 6.283, r.random() ** .5 * ss * .42
                g.append(apple(x + math.cos(a) * d2, y - ss * .86 + math.sin(a) * d2 * .7, ss * (.06 + r.random() * .015)))
        g.append(haze(y - 200, y, '#eef4e6', .18 - row * .04))
    g.append('<path d="M620 1200 L700 900 M680 1200 L760 900" stroke="#b08a64" stroke-width="10"/>' + ''.join(f'<path d="M{620 + t * 80:.0f} {1200 - t * 300:.0f} L{680 + t * 80:.0f} {1200 - t * 300:.0f}" stroke="#b08a64" stroke-width="8"/>' for t in (.15, .35, .55, .75, .95)))
    g.append(''.join(f'<path d="M{x - 60} {y} L{x + 60} {y} L{x + 48} {y + 70} L{x - 48} {y + 70} Z" fill="#c9a06a"/><path d="M{x - 60} {y + 20} L{x + 60} {y + 20} M{x - 56} {y + 44} L{x + 56} {y + 44}" stroke="#b08a54" stroke-width="5"/>' + ''.join(apple(x - 40 + j * 20, y - 8, 12) for j in range(5)) for x, y in ((420, 1110), (1300, 1120))))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s135 恐竜の谷
def dino_valley():
    """恐竜の谷: a prehistoric valley — a smoking volcano, cycads and tree ferns, a long-necked dinosaur by a lake (pterosaurs, smoke and the walking dinosaur are the page's)"""
    d, b = sky([(0, '#f4d6b4'), (.5, '#f6e6c8'), (1, '#eef0d8')])
    g = [b, glow(1460, 420, 500, 260, '#ffe6b0', .6, 'b60')]
    g.append('<path d="M1080 760 L1340 340 L1440 340 L1760 760 Z" fill="#a9928e"/><path d="M1390 340 L1440 340 L1760 760 L1560 760 Z" fill="#9a8480"/><path d="M1340 340 C1360 330 1420 330 1440 340 L1430 370 C1400 362 1370 362 1350 370 Z" fill="#e8805a"/>')
    g.append('<path d="M1360 368 C1380 420 1370 480 1400 520 C1420 470 1420 420 1420 368 Z" fill="#f09a6a" opacity=".8"/>')
    g.append(band(680, 50, '#bcc8a6', 1351, 6)); g.append(haze(560, 760, '#f4ead4', .45))
    g.append('<path d="M-40 1200 L-40 800 C500 760 1200 760 1960 790 L1960 1200 Z" fill="#a6c88a"/>')
    g.append('<path d="M300 900 C500 860 900 860 1120 900 C1240 930 1200 980 1000 990 C700 1000 360 990 280 960 C220 940 240 910 300 900 Z" fill="#a9d0d4"/><path d="M360 920 C560 896 900 896 1080 916" stroke="#d6eef0" stroke-width="6" fill="none"/>')
    B = (1360, 960)   # a brachiosaurus
    g.append(f'<g transform="translate({B[0]} {B[1]})"><path d="M-160 0 C-160 -90 -60 -120 40 -110 C90 -200 120 -330 150 -400 C160 -430 200 -436 214 -414 C226 -394 210 -380 190 -380 C170 -320 150 -200 120 -100 C170 -80 180 -20 160 20 L130 20 L120 90 L94 90 L90 30 L-80 30 L-90 90 L-116 90 L-120 30 C-160 30 -200 40 -280 30 C-220 10 -170 10 -160 0 Z" fill="#8fb0a0"/>'
             f'<circle cx="198" cy="-410" r="5" fill="#3f4a4a"/><path d="M-120 -60 C-60 -90 40 -90 80 -70" stroke="#a6c4b4" stroke-width="10" fill="none" stroke-linecap="round"/></g>')
    def cycad(x, y, s):
        return f'<rect x="{x - s * .08:.0f}" y="{y - s * .5:.0f}" width="{s * .16:.0f}" height="{s * .5:.0f}" rx="{s * .06:.0f}" fill="#a98b64"/>' + ''.join(f'<path d="M{x:.0f} {y - s * .5:.0f} Q{x + math.cos(a) * s * .4:.0f} {y - s * .5 + math.sin(a) * s * .4 - s * .2:.0f} {x + math.cos(a) * s * .7:.0f} {y - s * .5 + math.sin(a) * s * .7:.0f}" stroke="#5f9a5e" stroke-width="{s * .06:.0f}" fill="none" stroke-linecap="round"/>' for a in (-2.9, -2.4, -1.9, -1.4, -.9, -.4, .1))
    g.append(''.join(cycad(x, y, s) for x, y, s in ((120, 1040, 300), (300, 1130, 220), (1760, 1080, 340), (1600, 1160, 220), (760, 1150, 160))))
    g.append(''.join(round_tree(x, y, s, '#7fa86a', '#9a7a5e', '#6f9a5e') for x, y, s in ((560, 820, 160), (680, 800, 120), (1000, 810, 140))))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s136 星降るキャンプ
def star_camp():
    """星降るキャンプ: a tent glowing from inside on a hilltop meadow, a campfire, pines and a deep starry sky with the Milky Way (shooting stars, the fire and fireflies are the page's)"""
    d, b = sky([(0, '#0e1430'), (.55, '#1c2a52'), (1, '#2e3e66')], '<radialGradient id="mw" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#dfe6ff" stop-opacity=".4"/><stop offset="1" stop-color="#dfe6ff" stop-opacity="0"/></radialGradient>')
    g = [b, '<ellipse cx="900" cy="360" rx="1200" ry="170" transform="rotate(-22 900 360)" fill="url(#mw)" filter="url(#b16)"/>', stars(420, 136, 0, 820)]
    g.append(band(820, 50, '#1e2a48', 1361, 6))
    r = RNG(136)
    g.append(''.join(pine(r.random() * VW, 860 + r.random() * 40, 120 + r.random() * 90, '#1a2440', '#16203a') for _ in range(24)))
    g.append('<path d="M-40 1200 L-40 940 C400 900 900 880 1300 900 C1600 920 1800 940 1960 960 L1960 1200 Z" fill="#26344e"/>')
    T = (1240, 1010)   # the tent
    g.append(f'<path d="M{T[0] - 200} {T[1]} L{T[0]} {T[1] - 230} L{T[0] + 200} {T[1]} Z" fill="#f2b06a"/><path d="M{T[0]} {T[1] - 230} L{T[0] + 200} {T[1]} L{T[0] + 60} {T[1]} Z" fill="#d9944e"/><path d="M{T[0] - 50} {T[1]} L{T[0]} {T[1] - 150} L{T[0] + 40} {T[1]} Z" fill="#ffe2a6"/>')
    g.append(glow(T[0], T[1] - 60, 260, 120, '#ffc87a', .35, 'b30'))
    F = (900, 1080)   # the fire ring (flames are the page's)
    g.append(''.join(f'<ellipse cx="{F[0] + dx}" cy="{F[1] + dy}" rx="20" ry="12" fill="#6a6a7a"/>' for dx, dy in ((-60, 0), (-36, 18), (0, 24), (36, 18), (60, 0), (40, -14), (-40, -14))) + f'<path d="M{F[0] - 40} {F[1] + 4} L{F[0] + 40} {F[1] - 10} M{F[0] - 40} {F[1] - 10} L{F[0] + 40} {F[1] + 4}" stroke="#8a6a4a" stroke-width="12" stroke-linecap="round"/>')
    g.append(glow(F[0], F[1] - 10, 220, 90, '#ffb86a', .4, 'b30'))
    g.append(f'<rect x="{F[0] - 210}" y="{F[1] - 26}" width="110" height="34" rx="12" fill="#5a4a3a"/><rect x="{F[0] + 120}" y="{F[1] + 10}" width="100" height="30" rx="12" fill="#5a4a3a"/>')
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s137 ハロウィンの丘
def halloween_hill():
    """ハロウィンの丘: a big harvest moon over a crooked hill with a cute haunted house, jack-o'-lanterns along a path, a twisted tree (bats and ghosts are the page's)"""
    d, b = sky([(0, '#2a2050'), (.55, '#5a3a72'), (1, '#9a5a7a')])
    g = [b, stars(140, 137, 0, 600), glow(1380, 330, 260, 260, '#ffe6b0', .5, 'b30'), '<circle cx="1380" cy="330" r="150" fill="#ffe8b8"/><circle cx="1330" cy="300" r="22" fill="#f6dca6"/><circle cx="1420" cy="380" r="16" fill="#f6dca6"/>']
    g.append(band(820, 60, '#3a2a5a', 1371, 6))
    g.append('<path d="M-40 1200 L-40 900 C200 860 500 760 760 740 C1000 760 1300 860 1960 900 L1960 1200 Z" fill="#2a2244"/>')
    H = (760, 740)   # the haunted house
    g.append(f'<rect x="{H[0] - 120}" y="{H[1] - 200}" width="240" height="200" fill="#4a3a66"/><path d="M{H[0] - 150} {H[1] - 190} L{H[0]} {H[1] - 320} L{H[0] + 150} {H[1] - 190} Z" fill="#3a2a56"/><rect x="{H[0] + 50}" y="{H[1] - 330}" width="60" height="140" fill="#4a3a66"/><path d="M{H[0] + 40} {H[1] - 326} L{H[0] + 80} {H[1] - 390} L{H[0] + 120} {H[1] - 326} Z" fill="#3a2a56"/>'
             + ''.join(f'<rect x="{x}" y="{y}" width="36" height="44" rx="4" fill="#ffd27a"/><path d="M{x + 18} {y} L{x + 18} {y + 44} M{x} {y + 22} L{x + 36} {y + 22}" stroke="#4a3a66" stroke-width="4"/>' for x, y in ((H[0] - 90, H[1] - 160), (H[0] + 50, H[1] - 160), (H[0] + 62, H[1] - 290))) + f'<path d="M{H[0] - 26} {H[1]} L{H[0] - 26} {H[1] - 70} A26 26 0 0 1 {H[0] + 26} {H[1] - 70} L{H[0] + 26} {H[1]} Z" fill="#2a1e40"/>')
    g.append(glow(H[0], H[1] - 140, 200, 140, '#ffd27a', .2, 'b30'))
    g.append('<path d="M240 1200 C260 1100 230 1000 280 900 C300 860 320 840 300 800 M280 900 C220 870 180 880 140 840 M282 960 C340 930 380 940 420 900 M300 820 C340 800 360 760 400 760 M290 840 C250 800 240 760 210 750" stroke="#2a1e3a" stroke-width="22" fill="none" stroke-linecap="round"/>')
    g.append('<path d="M760 760 C700 860 640 960 700 1060 C760 1140 900 1170 1000 1200 L1160 1200 C1040 1150 860 1110 820 1040 C790 960 820 860 780 760 Z" fill="#4a3a5e"/>')
    def jack(x, y, s):
        return (f'<ellipse cx="{x}" cy="{y}" rx="{s}" ry="{s * .8:.0f}" fill="#f0903a"/><path d="M{x - s * .45:.0f} {y - s * .7:.0f} C{x - s * .3:.0f} {y:.0f} {x - s * .3:.0f} {y + s * .4:.0f} {x - s * .45:.0f} {y + s * .75:.0f} M{x + s * .45:.0f} {y - s * .7:.0f} C{x + s * .3:.0f} {y:.0f} {x + s * .3:.0f} {y + s * .4:.0f} {x + s * .45:.0f} {y + s * .75:.0f}" stroke="#d87a2a" stroke-width="{s * .08:.1f}" fill="none"/>'
                f'<rect x="{x - s * .08:.0f}" y="{y - s * 1.0:.0f}" width="{s * .16:.0f}" height="{s * .3:.0f}" fill="#6a8a4a"/><path d="M{x - s * .45:.0f} {y - s * .2:.0f} l{s * .2:.0f} {-s * .2:.0f} l{s * .2:.0f} {s * .2:.0f} Z M{x + s * .05:.0f} {y - s * .2:.0f} l{s * .2:.0f} {-s * .2:.0f} l{s * .2:.0f} {s * .2:.0f} Z M{x - s * .4:.0f} {y + s * .2:.0f} q{s * .4:.0f} {s * .3:.0f} {s * .8:.0f} 0 l{-s * .1:.0f} {s * .12:.0f} l{-s * .1:.0f} {-s * .08:.0f} l{-s * .1:.0f} {s * .08:.0f} l{-s * .1:.0f} {-s * .08:.0f} l{-s * .1:.0f} {s * .08:.0f} l{-s * .1:.0f} {-s * .08:.0f} Z" fill="#ffe08a"/>'
                f'<circle cx="{x}" cy="{y}" r="{s * 1.6:.0f}" fill="#ffb84a" opacity=".18" filter="url(#b8)"/>')
    g.append(''.join(jack(x, y, s) for x, y, s in ((700, 900, 26), (840, 960, 30), (680, 1040, 36), (920, 1110, 44), (520, 1150, 54), (1260, 1150, 60), (1500, 1080, 40))))
    g.append(''.join(f'<path d="M{x} 1200 L{x} {1200 - h} M{x - 30} {1200 - h + 20} L{x + 30} {1200 - h + 20}" stroke="#4a3a5e" stroke-width="10"/>' for x, h in ((1640, 120), (1760, 100))))
    return doc(d, ''.join(g))

SSR4.update({'s129': rainforest, 's130': canyon_falls, 's131': ski_slope, 's132': christmas_village, 's133': hydrangea_rain, 's134': apple_orchard,
             's135': dino_valley, 's136': star_camp, 's137': halloween_hill})

# ------------------------------------------------------------------------------------------------ s138 夕暮れの摩天楼
def dusk_city():
    """夕暮れの摩天楼: a city of towers at dusk seen from a rooftop garden, the sky melting from violet to orange, windows starting to light (more windows light up, planes blink: the page's)"""
    d, b = sky([(0, '#4a4888'), (.35, '#8a6aa8'), (.62, '#f0a090'), (.8, '#fcc89a')])
    g = [b, glow(1200, 760, 500, 160, '#ffd6a0', .7, 'b60')]
    r = RNG(138)
    for layer, (base, hmin, hmax, wmin, wmax, c, wc, op) in enumerate(((880, 220, 520, 60, 120, '#a08cb8', '#c8b6d6', .75), (930, 160, 380, 90, 170, '#6f6290', '#ffe0a8', 1))):
        x = -60
        while x < 1960:
            w = wmin + r.random() * (wmax - wmin); h = hmin + r.random() * (hmax - hmin); top = base - h
            g.append(f'<rect x="{x:.0f}" y="{top:.0f}" width="{w:.0f}" height="{h + 400:.0f}" fill="{c}" opacity="{op}"/>')
            k = r.random()
            if k < .25: g.append(f'<rect x="{x + w * .45:.0f}" y="{top - 60:.0f}" width="4" height="60" fill="{c}" opacity="{op}"/>')
            elif k < .45: g.append(f'<path d="M{x:.0f} {top + 1:.0f} L{x + w / 2:.0f} {top - w * .5:.0f} L{x + w:.0f} {top + 1:.0f} Z" fill="{c}" opacity="{op}"/>')
            elif k < .6: g.append(f'<rect x="{x + w * .15:.0f}" y="{top - 30:.0f}" width="{w * .7:.0f}" height="31" fill="{c}" opacity="{op}"/>')
            if layer == 1:
                for i in range(int((w - 16) // 18)):
                    for j in range(int((h - 20) // 26)):
                        if r.random() < .28: g.append(f'<rect x="{x + 10 + i * 18:.0f}" y="{top + 14 + j * 26:.0f}" width="9" height="13" fill="{wc}" opacity="{.6 + r.random() * .4:.2f}"/>')
            x += w + 6 + r.random() * 20
        g.append(haze(500, base, '#f6b8a8', .18 if layer == 0 else 0))
    # the rooftop garden in front
    g.append('<rect x="-40" y="1000" width="2000" height="220" fill="#8a7a9e"/><rect x="-40" y="990" width="2000" height="16" fill="#a796b8"/>')
    g.append(''.join(f'<rect x="{x}" y="930" width="5" height="70" fill="#a796b8"/>' for x in range(0, 1920, 60)) + '<rect x="-40" y="926" width="2000" height="8" fill="#a796b8"/>')
    g.append(''.join(f'<rect x="{x - 50}" y="1060" width="100" height="70" rx="6" fill="#c9a07a"/><circle cx="{x - 24}" cy="1040" r="34" fill="#7fae7a"/><circle cx="{x + 22}" cy="1034" r="38" fill="#8fbf86"/><circle cx="{x}" cy="1010" r="30" fill="#7fae7a"/>' for x in (180, 1720)))
    g.append('<path d="M760 1150 L1160 1150" stroke="#e8d8ea" stroke-width="4"/>' + ''.join(f'<path d="M{760 + i * 50} 1150 l0 -50" stroke="#e8d8ea" stroke-width="2"/><circle cx="{760 + i * 50}" cy="1096" r="7" fill="#ffe6a6"/><circle cx="{760 + i * 50}" cy="1096" r="22" fill="#ffe6a6" opacity=".25"/>' for i in range(9)))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s139 雨の日のカフェ
def rainy_cafe():
    """雨の日のカフェ: inside a cosy café looking out of a big window onto a rainy street; a table with a cup and cake, a plant, warm lamps (rain on the glass and steam are the page's)"""
    d = BLUR + lin('out', [(0, '#a9b8c8'), (1, '#c9d2dc')]) + lin('wall', [(0, '#e9d6c0'), (1, '#dcc4a8')])
    g = ['<rect width="1920" height="1200" fill="url(#wall)"/>']
    W = (360, 140, 1560, 860)   # the window
    g.append(f'<clipPath id="win"><rect x="{W[0]}" y="{W[1]}" width="{W[2] - W[0]}" height="{W[3] - W[1]}"/></clipPath><g clip-path="url(#win)"><rect x="{W[0]}" y="{W[1]}" width="{W[2] - W[0]}" height="{W[3] - W[1]}" fill="url(#out)"/>')
    r = RNG(139)
    x = W[0]
    while x < W[2]:   # the street outside: blurry buildings, umbrellas
        w = 120 + r.random() * 100; h = 300 + r.random() * 250
        g.append(f'<rect x="{x:.0f}" y="{W[3] - 120 - h:.0f}" width="{w:.0f}" height="{h:.0f}" fill="{["#b8c2ce", "#c4c0c8", "#b4bcc6"][int(r.random() * 3)]}" filter="url(#b4)"/>' + ''.join(f'<rect x="{x + 16 + i * 34:.0f}" y="{W[3] - 100 - h + j * 50:.0f}" width="16" height="24" fill="#ffe6b0" opacity="{.5 if r.random() < .4 else .15}" filter="url(#b2)"/>' for i in range(int(w // 34)) for j in range(int(h // 50) - 1)))
        x += w + 10
    g.append(f'<rect x="{W[0]}" y="{W[3] - 120}" width="{W[2] - W[0]}" height="120" fill="#9aa4b0" filter="url(#b4)"/>' + ''.join(f'<ellipse cx="{x}" cy="{W[3] - 60}" rx="70" ry="10" fill="#ffe6b0" opacity=".25" filter="url(#b8)"/>' for x in (600, 1100, 1400)))
    for x, c in ((700, '#f08a8a'), (1250, '#6fa8d8')):
        g.append(f'<g filter="url(#b2)"><path d="M{x - 60} {W[3] - 150} C{x - 60} {W[3] - 210} {x + 60} {W[3] - 210} {x + 60} {W[3] - 150} Z" fill="{c}"/><rect x="{x - 2}" y="{W[3] - 150}" width="4" height="40" fill="#5a5a6a"/><rect x="{x - 16}" y="{W[3] - 130}" width="32" height="60" rx="10" fill="#6a6a7a"/></g>')
    g.append('</g>')
    g.append(f'<rect x="{W[0] - 30}" y="{W[1] - 30}" width="{W[2] - W[0] + 60}" height="30" fill="#8a6a54"/><rect x="{W[0] - 30}" y="{W[3]}" width="{W[2] - W[0] + 60}" height="40" fill="#8a6a54"/><rect x="{W[0] - 30}" y="{W[1]}" width="30" height="{W[3] - W[1]}" fill="#8a6a54"/><rect x="{W[2]}" y="{W[1]}" width="30" height="{W[3] - W[1]}" fill="#8a6a54"/>'
             f'<rect x="{(W[0] + W[2]) / 2 - 10:.0f}" y="{W[1]}" width="20" height="{W[3] - W[1]}" fill="#8a6a54"/><rect x="{W[0]}" y="{W[1] + 200}" width="{W[2] - W[0]}" height="14" fill="#8a6a54"/>')
    g.append(f'<path d="M{W[0] + 20} {W[1]} C{W[0] + 80} {W[1] + 60} {W[0] + 140} {W[1] + 40} {W[0] + 200} {W[1] + 90} L{W[0] + 200} {W[1]} Z" fill="#f2e2c8" opacity=".0"/>')
    g.append('<rect x="0" y="940" width="1920" height="260" fill="#a77d5e"/><rect x="0" y="940" width="1920" height="14" fill="#c4946e"/>')
    T = (960, 1010)   # table with cup and cake
    g.append(f'<ellipse cx="{T[0]}" cy="{T[1]}" rx="360" ry="60" fill="#f2e6d6"/><rect x="{T[0] - 360}" y="{T[1]}" width="720" height="30" fill="#e2d2bc"/>'
             f'<ellipse cx="{T[0] - 110}" cy="{T[1] - 6}" rx="80" ry="20" fill="#ffffff"/><path d="M{T[0] - 160} {T[1] - 70} L{T[0] - 60} {T[1] - 70} L{T[0] - 74} {T[1] - 12} L{T[0] - 146} {T[1] - 12} Z" fill="#ffffff"/><path d="M{T[0] - 62} {T[1] - 58} C{T[0] - 30} {T[1] - 58} {T[0] - 30} {T[1] - 26} {T[0] - 68} {T[1] - 26}" stroke="#ffffff" stroke-width="9" fill="none"/><ellipse cx="{T[0] - 110}" cy="{T[1] - 70}" rx="50" ry="10" fill="#8a5a3a"/>'
             f'<ellipse cx="{T[0] + 130}" cy="{T[1] - 6}" rx="90" ry="20" fill="#ffffff"/><path d="M{T[0] + 80} {T[1] - 16} L{T[0] + 80} {T[1] - 74} L{T[0] + 190} {T[1] - 50} L{T[0] + 190} {T[1] - 16} Z" fill="#fbe6c8"/><path d="M{T[0] + 80} {T[1] - 60} L{T[0] + 190} {T[1] - 36}" stroke="#f6b8c2" stroke-width="10"/><path d="M{T[0] + 80} {T[1] - 74} L{T[0] + 190} {T[1] - 50} L{T[0] + 190} {T[1] - 44} L{T[0] + 80} {T[1] - 66} Z" fill="#ffffff"/><circle cx="{T[0] + 110}" cy="{T[1] - 82}" r="12" fill="#e2524a"/>')
    g.append('<rect x="1660" y="880" width="120" height="110" rx="10" fill="#d98c6a"/>' + ''.join(f'<path d="M1720 880 Q{1720 + a * 60:.0f} {760 + abs(a) * 40:.0f} {1720 + a * 130:.0f} {720 + abs(a) * 90:.0f}" stroke="#6faa6a" stroke-width="16" fill="none" stroke-linecap="round"/>' for a in (-1, -.5, 0, .5, 1)))
    for x in (520, 1400):   # pendant lamps
        g.append(f'<path d="M{x} 0 L{x} 120" stroke="#5a4a3a" stroke-width="3"/><path d="M{x - 60} 170 C{x - 60} 110 {x + 60} 110 {x + 60} 170 Z" fill="#3f5a4a"/><ellipse cx="{x}" cy="172" rx="30" ry="10" fill="#ffe6a6"/>' + glow(x, 200, 160, 120, '#ffe6a6', .35, 'b30'))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s140 中世の城下町
def castle_town():
    """中世の城下町: a fairy-tale castle with blue cone towers on a hill above a walled town of half-timbered houses (flags wave, birds fly: the page's)"""
    d, b = sky([(0, '#b2d6f0'), (.55, '#e2eff6'), (1, '#f4f2e6')])
    g = [b]
    g.append(band(640, 50, '#c6d8c4', 1401, 6))
    g.append('<path d="M500 760 C640 600 800 520 960 500 C1120 520 1280 600 1420 760 Z" fill="#a9c99a"/>')
    C = 960
    def tower(x, top, w, h, roof='#7fa0d0'):
        return (f'<rect x="{x - w / 2:.0f}" y="{top:.0f}" width="{w:.0f}" height="{h:.0f}" fill="#efe8dc"/><rect x="{x + w * .1:.0f}" y="{top:.0f}" width="{w * .4:.0f}" height="{h:.0f}" fill="#e2d8ca"/>'
                f'<path d="M{x - w * .62:.0f} {top + 4:.0f} L{x:.0f} {top - w * 1.5:.0f} L{x + w * .62:.0f} {top + 4:.0f} Z" fill="{roof}"/><path d="M{x:.0f} {top - w * 1.5:.0f} L{x + w * .62:.0f} {top + 4:.0f} L{x + w * .1:.0f} {top + 4:.0f} Z" fill="#6a8cbe"/>'
                f'<rect x="{x - w * .14:.0f}" y="{top + h * .25:.0f}" width="{w * .28:.0f}" height="{w * .4:.0f}" rx="{w * .14:.0f}" fill="#8aa0c0"/><rect x="{x - 1:.0f}" y="{top - w * 1.5 - 40:.0f}" width="3" height="40" fill="#8a7a6a"/>')
    g.append(f'<rect x="{C - 260}" y="420" width="520" height="220" fill="#efe8dc"/>' + ''.join(f'<rect x="{C - 260 + i * 40}" y="404" width="24" height="20" fill="#efe8dc"/>' for i in range(14)) + f'<path d="M{C - 50} 640 L{C - 50} 560 A50 50 0 0 1 {C + 50} 560 L{C + 50} 640 Z" fill="#8a7a6a"/>')
    g.append(tower(C - 280, 360, 90, 280) + tower(C + 280, 360, 90, 280) + tower(C - 120, 260, 110, 300) + tower(C + 140, 300, 80, 260) + tower(C, 160, 130, 400, '#86a8d8'))
    g.append('<path d="M-40 1200 L-40 780 C300 740 700 720 960 720 C1220 720 1620 740 1960 780 L1960 1200 Z" fill="#b4d49c"/>')
    g.append('<path d="M-40 860 L1960 860 L1960 900 L-40 900 Z" fill="#d6cdbb"/>' + ''.join(f'<rect x="{x}" y="846" width="26" height="20" fill="#d6cdbb"/>' for x in range(0, 1920, 50)))
    r = RNG(140)
    x = -20
    while x < 1940:   # half-timbered houses
        w = 130 + r.random() * 40; h = 140 + r.random() * 70; top = 1120 - h; c = ['#fbf4e6', '#f6ecd8', '#fbefe2'][int(r.random() * 3)]
        g.append(f'<rect x="{x:.0f}" y="{top:.0f}" width="{w:.0f}" height="{h + 100:.0f}" fill="{c}"/>' + f'<path d="M{x:.0f} {top + h * .45:.0f} L{x + w:.0f} {top + h * .45:.0f} M{x + w / 2:.0f} {top:.0f} L{x + w / 2:.0f} {top + h:.0f} M{x:.0f} {top:.0f} L{x + w / 2:.0f} {top + h * .45:.0f} M{x + w:.0f} {top:.0f} L{x + w / 2:.0f} {top + h * .45:.0f}" stroke="#8a5f4a" stroke-width="7"/>'
                 f'<rect x="{x:.0f}" y="{top:.0f}" width="{w:.0f}" height="{h:.0f}" fill="none" stroke="#8a5f4a" stroke-width="8"/><path d="M{x - 14:.0f} {top + 6:.0f} L{x + w / 2:.0f} {top - w * .6:.0f} L{x + w + 14:.0f} {top + 6:.0f} Z" fill="{["#d9765e", "#c86a56", "#e08a6a"][int(r.random() * 3)]}"/>'
                 f'<rect x="{x + w * .12:.0f}" y="{top + h * .12:.0f}" width="{w * .22:.0f}" height="{h * .22:.0f}" fill="#a9c8e6"/><rect x="{x + w * .62:.0f}" y="{top + h * .12:.0f}" width="{w * .22:.0f}" height="{h * .22:.0f}" fill="#a9c8e6"/><rect x="{x + w * .58:.0f}" y="{top + h * .56:.0f}" width="{w * .26:.0f}" height="{h * .44:.0f}" fill="#8a5f4a"/>')
        x += w + 4
    g.append('<rect x="0" y="1120" width="1920" height="80" fill="#d6cdbb"/>' + ''.join(f'<ellipse cx="{x}" cy="{1150 + (x // 80 % 2) * 20}" rx="34" ry="12" fill="#c9bfab"/>' for x in range(20, 1920, 80)))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s141 桂林の山水
def guilin():
    """桂林の山水: rows of steep karst peaks fading into mist along a calm river, a bamboo raft with a fisherman and a little pagoda (mist drifts, cranes fly, the raft glides: the page's)"""
    d, b = sky([(0, '#d8e6e6'), (.55, '#eef2ec'), (1, '#f2f2ea')])
    g = [b]
    r = RNG(141)
    for layer, (cnt, base, hmin, hmax, c, op) in enumerate(((10, 760, 280, 460, '#c6d6d2', .7), (8, 800, 340, 560, '#a4bfb6', .85), (6, 860, 400, 660, '#7fa294', 1))):
        for i in range(cnt):
            x = (i + r.random() * .6) * VW / (cnt - 1) - 60; h = hmin + r.random() * (hmax - hmin); w = h * (.4 + r.random() * .2)
            g.append(f'<path d="M{x - w:.0f} {base:.0f} C{x - w * .7:.0f} {base - h * .6:.0f} {x - w * .4:.0f} {base - h:.0f} {x:.0f} {base - h:.0f} C{x + w * .4:.0f} {base - h:.0f} {x + w * .7:.0f} {base - h * .6:.0f} {x + w:.0f} {base:.0f} Z" fill="{c}" opacity="{op}"/>')
            if layer == 2: g.append(f'<path d="M{x:.0f} {base - h:.0f} C{x + w * .4:.0f} {base - h:.0f} {x + w * .7:.0f} {base - h * .6:.0f} {x + w:.0f} {base:.0f} L{x + w * .3:.0f} {base:.0f} C{x + w * .4:.0f} {base - h * .5:.0f} {x + w * .2:.0f} {base - h * .9:.0f} {x:.0f} {base - h:.0f} Z" fill="#6f9484" opacity=".6"/>')
        g.append(haze(base - 200, base + 20, '#eef2ec', .55))
    g.append('<rect x="0" y="860" width="1920" height="340" fill="#c6dad6"/>')
    g.append('<g opacity=".35" transform="translate(0 1720) scale(1 -1)"><rect x="0" y="0" width="1920" height="860" fill="none"/></g>')
    g.append(''.join(f'<path d="M{x - 80} {y} L{x + 80} {y}" stroke="#ffffff" stroke-width="3" opacity=".6"/>' for x, y in ((300, 940), (900, 980), (1500, 920), (1200, 1060), (520, 1100))))
    g.append('<path d="M1500 860 C1580 830 1700 820 1960 830 L1960 900 C1760 900 1600 890 1500 860 Z" fill="#a6c49a"/>')
    P = (1720, 830)   # a little pagoda on the bank
    g.append(''.join(f'<rect x="{P[0] - 30 + k * 4}" y="{P[1] - 50 - k * 44}" width="{60 - k * 8}" height="40" fill="#efe4d0"/><path d="M{P[0] - 50 + k * 6} {P[1] - 46 - k * 44} L{P[0]} {P[1] - 72 - k * 44} L{P[0] + 50 - k * 6} {P[1] - 46 - k * 44} Z" fill="#8a7f7a"/>' for k in range(4)))
    g.append(''.join(f'<path d="M{x} 860 l-10 -60 M{x} 860 l12 -70 M{x} 860 l0 -80" stroke="#7fae7a" stroke-width="5"/>' for x in (1560, 1600, 1640, 1820, 1860)))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s142 モンゴルの草原
def steppe():
    """モンゴルの草原: an endless green steppe under a huge sky, white gers with smoke holes, a herd of horses grazing (riders gallop, an eagle circles, clouds' shadows pass: the page's)"""
    d, b = sky([(0, '#74b4ec'), (.5, '#bcdcf6'), (.75, '#e8f2f6'), (1, '#f2f4e2')])
    g = [b]
    g.append(band(740, 30, '#b8cfa4', 1421, 6)); g.append(band(770, 20, '#a6c88a', 1422, 8))
    g.append('<path d="M-40 1200 L-40 790 C600 780 1300 780 1960 800 L1960 1200 Z" fill="#9cc47e"/>')
    def ger(x, y, s):
        return (f'<g transform="translate({x} {y}) scale({s})"><path d="M-100 0 L-100 -70 L100 -70 L100 0 Z" fill="#fbf8f2"/><path d="M-110 -66 C-60 -130 60 -130 110 -66 Z" fill="#f2ece2"/><path d="M-100 -40 L100 -40" stroke="#d6584a" stroke-width="6"/><path d="M-100 -58 L100 -58" stroke="#3f6aa8" stroke-width="4"/>'
                f'<rect x="-24" y="-56" width="48" height="56" fill="#e8763a"/><path d="M-24 -56 L24 -56 L24 -48 L-24 -48 Z" fill="#f6d05a"/><ellipse cx="0" cy="-118" rx="22" ry="6" fill="#d6cfc4"/></g>')
    g.append(ger(1260, 860, 1.0) + ger(1500, 880, 1.3) + ger(1080, 840, .7))
    def horse(x, y, s, c, f=1):
        return (f'<g transform="translate({x:.0f} {y:.0f}) scale({s * f:.2f} {s:.2f})"><path d="M-46 -40 C-46 -60 30 -64 40 -44 L64 -76 C70 -84 84 -80 82 -70 L70 -40 C72 -30 60 -24 52 -30 L40 -20 C40 -10 30 -6 20 -8 L-30 -8 C-44 -10 -50 -20 -46 -40 Z" fill="{c}"/>'
                f'<rect x="-40" y="-14" width="9" height="40" fill="{c}"/><rect x="-22" y="-14" width="9" height="40" fill="{c}"/><rect x="18" y="-14" width="9" height="40" fill="{c}"/><rect x="32" y="-14" width="9" height="40" fill="{c}"/><path d="M-46 -38 C-60 -30 -64 -10 -58 6" stroke="{c}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M60 -72 C50 -60 44 -50 40 -40" stroke="#5a4a3a" stroke-width="8" fill="none"/></g>')
    r = RNG(142)
    for _ in range(14):
        y = 860 + r.random() * 260; x = 120 + r.random() * 900; s = .4 + (y - 860) / 260 * .7
        g.append(horse(x, y, s, ['#a9785a', '#6a5040', '#f2ece2', '#c49a6a'][int(r.random() * 4)], 1 if r.random() < .5 else -1))
    g.append(''.join(f'<path d="M{r.random() * VW:.0f} {980 + r.random() * 220:.0f} l-4 -14 l4 6 l4 -10 l2 14" stroke="#7fae6a" stroke-width="3" fill="none"/>' for _ in range(160)))
    g.append(''.join(f'<circle cx="{r.random() * VW:.0f}" cy="{960 + r.random() * 240:.0f}" r="{3 + r.random() * 3:.0f}" fill="{["#f6d05a", "#ffffff", "#c9a8e8"][int(r.random() * 3)]}"/>' for _ in range(80)))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s143 鯉のぼり
def koinobori():
    """鯉のぼり: a May sky over a riverside of green hills and a Japanese house; a tall pole with a wind-wheel (the carp streamers swim in the wind: the page's)"""
    d, b = sky([(0, '#8ec8f2'), (.55, '#d6ecfa'), (1, '#f0f6e8')])
    g = [b]
    g.append(band(760, 50, '#b4d4a8', 1431, 6)); g.append(band(820, 40, '#a2c896', 1432, 7))
    H = (1440, 900)
    g.append(f'<rect x="{H[0] - 200}" y="{H[1] - 150}" width="400" height="160" fill="#f6efe2"/><path d="M{H[0] - 260} {H[1] - 140} L{H[0] - 180} {H[1] - 240} L{H[0] + 180} {H[1] - 240} L{H[0] + 260} {H[1] - 140} Z" fill="#7d8aa3"/><rect x="{H[0] - 140}" y="{H[1] - 110}" width="280" height="80" fill="#e8d3b8"/>' + ''.join(f'<rect x="{H[0] - 140 + i * 28}" y="{H[1] - 110}" width="3" height="80" fill="#d6bc9a"/>' for i in range(10)))
    g.append('<path d="M-40 1200 L-40 920 C600 900 1300 900 1960 930 L1960 1200 Z" fill="#a6cc8e"/><path d="M-40 1060 C500 1030 1200 1030 1960 1060 L1960 1200 L-40 1200 Z" fill="#a9d0e0"/><path d="M-40 1060 C500 1030 1200 1030 1960 1060" stroke="#d6ecf4" stroke-width="8" fill="none"/>')
    g.append('<rect x="596" y="200" width="12" height="900" fill="#c9a77e"/><circle cx="602" cy="190" r="16" fill="#f6d05a"/>' + ''.join(f'<path d="M602 230 L{602 + 44 * math.cos(a):.0f} {230 + 44 * math.sin(a):.0f}" stroke="{["#e85a5a", "#3f7ad8", "#f6d05a", "#5aa86a"][k % 4]}" stroke-width="8"/>' for k, a in enumerate([j * math.pi / 4 for j in range(8)])))
    g.append(''.join(round_tree(x, y, s, '#8fbf7a', '#9a7a5e', '#7fb26e') for x, y, s in ((200, 930, 200), (360, 940, 140), (1780, 920, 220), (980, 920, 120))))
    return doc(d, ''.join(g))

# ------------------------------------------------------------------------------------------------ s144 空港
def airport():
    """空港: a sunny airfield — the control tower, a terminal with big glass, a parked airliner, the runway with its markings (planes take off and land, a windsock flutters: the page's)"""
    d, b = sky([(0, '#88c4f0'), (.55, '#d2eafa'), (1, '#f0f4f0')])
    g = [b]
    g.append(band(760, 30, '#c2d6c8', 1441, 6))
    g.append('<rect x="200" y="640" width="900" height="160" fill="#e8eef4"/><rect x="200" y="640" width="900" height="20" fill="#c4d0dc"/>' + ''.join(f'<rect x="{220 + i * 70}" y="680" width="56" height="90" fill="#a9cbe6"/><rect x="{220 + i * 70}" y="680" width="56" height="20" fill="#c9e0f0"/>' for i in range(12)))
    g.append('<rect x="1320" y="380" width="70" height="420" fill="#e8eef4"/><rect x="1300" y="330" width="110" height="70" fill="#a9cbe6"/><path d="M1290 330 L1420 330 L1400 310 L1310 310 Z" fill="#c4d0dc"/><rect x="1352" y="270" width="6" height="40" fill="#c4d0dc"/><circle cx="1355" cy="266" r="8" fill="#e85a5a"/>')
    g.append('<path d="M-40 1200 L-40 800 L1960 800 L1960 1200 Z" fill="#a9cc94"/><path d="M-40 920 L1960 860 L1960 1010 L-40 1110 Z" fill="#9aa2aa"/>' + ''.join(f'<path d="M{x} {917 - x * .031:.0f} L{x + 80} {917 - (x + 80) * .031 - 2.5:.0f}" stroke="#f6f6f2" stroke-width="8"/>' for x in range(40, 1920, 180)))
    g.append('<path d="M-40 924 L1960 864" stroke="#e8e8e2" stroke-width="5"/><path d="M-40 1104 L1960 1004" stroke="#e8e8e2" stroke-width="5"/>')
    P = (560, 860)   # a parked airliner, nose to the left
    g.append(f'<g transform="translate({P[0]} {P[1]})"><path d="M-260 -20 C-260 -60 -200 -70 -140 -70 L240 -70 C270 -70 290 -60 300 -40 L340 -150 L380 -150 L360 -40 C360 -20 340 -10 300 -10 L-200 -10 C-240 -10 -260 -10 -260 -20 Z" fill="#fbfcfd"/><path d="M-200 -40 L300 -40" stroke="#3f7ad8" stroke-width="8"/>'
             + ''.join(f'<circle cx="{-160 + i * 30}" cy="-52" r="6" fill="#7aa0c8"/>' for i in range(14)) + '<path d="M-250 -46 C-240 -60 -220 -64 -210 -60 L-210 -44 Z" fill="#7aa0c8"/><path d="M20 -30 L160 40 L200 40 L120 -30 Z" fill="#e8eef4"/><rect x="90" y="-4" width="60" height="22" rx="10" fill="#c4d0dc"/><path d="M340 -150 L380 -150 L370 -110 L344 -110 Z" fill="#3f7ad8"/><rect x="-160" y="-10" width="10" height="26" fill="#6a6a7a"/><rect x="60" y="-10" width="10" height="26" fill="#6a6a7a"/></g>')
    g.append('<rect x="1700" y="900" width="6" height="90" fill="#8f949e"/><path d="M1706 902 L1780 912 L1780 930 L1706 924 Z" fill="#f08a4a" opacity="0"/>')
    g.append(''.join(f'<rect x="{x - 3}" y="{y}" width="6" height="16" fill="#8f949e"/><circle cx="{x}" cy="{y}" r="6" fill="{c}"/>' for x, y, c in ((300, 1000, '#5ad08a'), (700, 984, '#5ad08a'), (1100, 966, '#f6d05a'), (1500, 950, '#5ad08a'))))
    return doc(d, ''.join(g))

SSR4.update({'s138': dusk_city, 's139': rainy_cafe, 's140': castle_town, 's141': guilin, 's142': steppe, 's143': koinobori, 's144': airport})

if __name__ == '__main__':
    ids = [a for a in sys.argv[1:] if a in SSR4] or list(SSR4)
    for i, im in zip(ids, render([(SSR4[i](), OW, OH) for i in ids])):
        save(i, finish(im, int(i[1:])), 'cover', q=80)

#!/usr/bin/env python3
"""Portal skins, scenes remade as SVG (2026-11-20): s25–s31 · s33 (SSR, the first one-picture skins, redrawn so their
moving parts can move) and the new URs s38 銀河鉄道 · s39 クラゲの海. Same flat picture-book style as skins_ssr2.py;
whatever moves (clouds, birds, boats, swans, stars that twinkle, the night train, jellyfish …) is drawn by the page
(atlas/skins-fx.js), so it is left out here. Run from the repo root: python3 atlas/tools/skins_ssr3.py [id …]"""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from skins import RNG, grain, save, np
from skins_ssr2 import doc, lin, sky, hill, smooth_path, windows, render, finish, VW, VH, OW, OH

def ridge_path(y, amp, seed, n=7, bottom=VH, rough=.0):
    r = RNG(seed); pts = [(-60 + i * (VW + 120) / (n - 1), y + (r.random() - .5) * 2 * amp) for i in range(n)]
    return smooth_path(pts, bottom)

def blue_sky():
    """青空: a high clear sky, a far green hill line with a little red-roofed farm at the right"""
    d, b = sky([(0, '#a9d6f6'), (.55, '#d8eefc'), (.85, '#f2f9fd'), (1, '#f6fbf2')])
    g = [b, hill(1060, 26, '#d2e8c4', 251, n=6), hill(1110, 20, '#c3e0b2', 252, n=7)]
    g.append('<rect x="1520" y="1004" width="90" height="56" fill="#fbf6ee"/><path d="M1508 1008 L1565 966 L1622 1008 Z" fill="#e8a09a"/><rect x="1554" y="1026" width="20" height="34" fill="#c9a77e"/>')
    g.append('<rect x="1640" y="986" width="34" height="74" rx="17" fill="#f3efe6"/><path d="M1636 990 C1636 966 1678 966 1678 990 Z" fill="#c9b9da"/>')
    return doc(d, ''.join(g))

def sunset_hills():
    """夕焼けの丘: a big warm sun low over rolling hills, a lone tree and a little house with a lit window"""
    d, b = sky([(0, '#e9c8e0'), (.35, '#f8d2c4'), (.7, '#fde3c4'), (1, '#fdeed8')])
    g = [b, '<circle cx="1180" cy="760" r="150" fill="#fde7b8"/><circle cx="1180" cy="760" r="104" fill="#fdd89a"/>']
    for y, a, c, sd in ((800, 60, '#f0bfb8', 261), (880, 50, '#e6a9b0', 262), (960, 40, '#d896a6', 263), (1060, 34, '#c6889e', 264)):
        g.append(f'<path d="{ridge_path(y, a, sd, 6)}" fill="{c}"/>')
    g.append('<path d="M420 1000 C418 940 424 900 430 870" stroke="#9a6a7e" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="432" cy="850" r="58" fill="#b77d94"/><circle cx="392" cy="876" r="40" fill="#b77d94"/><circle cx="470" cy="874" r="42" fill="#b77d94"/>')
    g.append('<rect x="1560" y="1000" width="110" height="70" fill="#a97a92"/><path d="M1548 1004 L1615 956 L1682 1004 Z" fill="#94687f"/><rect x="1590" y="1018" width="22" height="22" rx="3" fill="#fde3a6"/>')
    return doc(d, ''.join(g))

def seaside():
    """なぎさ: a turquoise sea to a soft horizon, a curving sandy beach, a striped parasol and a beach ball"""
    d, b = sky([(0, '#bfe2f8'), (.5, '#e6f4fc'), (.58, '#f2f8fb'), (1, '#f2f8fb')])
    g = [b, f'<rect x="0" y="640" width="{VW}" height="560" fill="#9fd5e6"/>', f'<rect x="0" y="640" width="{VW}" height="40" fill="#b8e1ee"/>']
    g.append('<path d="M-40 1200 L-40 920 C300 880 700 940 1100 980 C1400 1010 1700 1040 1960 1020 L1960 1200 Z" fill="#f4e4c3"/>')
    g.append('<path d="M-40 940 C300 900 700 960 1100 1000 C1400 1030 1700 1060 1960 1040 L1960 1030 C1700 1050 1400 1020 1100 990 C700 950 300 890 -40 930 Z" fill="#fbf7ee"/>')
    g.append('<path d="M330 1090 L360 880" stroke="#c9a77e" stroke-width="7" stroke-linecap="round"/>'
             '<path d="M240 900 C260 820 460 820 480 900 Z" fill="#f6b8c2"/><path d="M300 900 C310 840 410 840 420 900 Z" fill="#fbf6ee"/><path d="M350 820 C355 840 360 870 360 900" stroke="#fbf6ee" stroke-width="2" fill="none"/>')
    g.append('<circle cx="520" cy="1090" r="32" fill="#fbf6ee"/><path d="M520 1058 A32 32 0 0 1 552 1090 L520 1090 Z" fill="#f6d79a"/><path d="M488 1090 A32 32 0 0 1 520 1058 L520 1090 Z" fill="#a9c8e6"/><path d="M520 1122 A32 32 0 0 1 488 1090 L520 1090 Z" fill="#f6b8c2"/>')
    g.append(''.join(f'<path d="M{x} {y} q8 -6 16 0" stroke="#e8d3b0" stroke-width="3" fill="none" stroke-linecap="round"/>' for x, y in ((900, 1120), (1250, 1150), (1600, 1110), (760, 1170))))
    return doc(d, ''.join(g))

def snowfield():
    """雪原: snowy hills under a pale winter sky, rows of soft firs, a log cabin with smoke from the chimney"""
    d, b = sky([(0, '#d6e4f3'), (.6, '#edf3fa'), (1, '#fbfdff')])
    g = [b]
    for i, (y, a, c, sd) in enumerate(((760, 70, '#e3ecf6', 281), (860, 50, '#edf3f9', 282), (980, 40, '#f6f9fc', 283), (1090, 30, '#ffffff', 284))):
        g.append(f'<path d="{ridge_path(y, a, sd, 6)}" fill="{c}"/>')
        if i in (0, 1, 2):
            r = RNG(290 + i); s = (.55, .8, 1.1)[i]; col = ('#b7cadc', '#a4bfd4', '#93b2c9')[i]
            for _ in range((14, 10, 6)[i]):
                x = r.random() * 1920; y0 = y + 20 + r.random() * 30; h = 90 * s * (.8 + r.random() * .4)
                g.append(''.join(f'<path d="M{x:.0f} {y0 - h * (1 - k * .28):.0f} L{x + h * (.32 - k * .06):.0f} {y0 - h * (.42 - k * .28):.0f} L{x - h * (.32 - k * .06):.0f} {y0 - h * (.42 - k * .28):.0f} Z" fill="{col}"/>' for k in range(3)))
                g.append(f'<path d="M{x:.0f} {y0 - h:.0f} L{x + h * .1:.0f} {y0 - h * .86:.0f} L{x - h * .1:.0f} {y0 - h * .86:.0f} Z" fill="#ffffff"/>')
    X, Y = 1380, 1020
    g.append(f'<rect x="{X}" y="{Y - 80}" width="180" height="90" fill="#c9a07a"/>' + ''.join(f'<rect x="{X}" y="{Y - 80 + k * 18}" width="180" height="3" fill="#b38a64"/>' for k in range(5)))
    g.append(f'<path d="M{X - 20} {Y - 76} L{X + 90} {Y - 150} L{X + 200} {Y - 76} Z" fill="#ffffff"/><path d="M{X - 20} {Y - 76} L{X + 200} {Y - 76} L{X + 190} {Y - 66} L{X - 10} {Y - 66} Z" fill="#e3ecf6"/>')
    g.append(f'<rect x="{X + 130}" y="{Y - 150}" width="22" height="50" fill="#a98b74"/><rect x="{X + 126}" y="{Y - 156}" width="30" height="10" rx="3" fill="#ffffff"/><rect x="{X + 30}" y="{Y - 50}" width="30" height="30" rx="4" fill="#fde3a6"/><rect x="{X + 110}" y="{Y - 50}" width="30" height="30" rx="4" fill="#fde3a6"/>')
    return doc(d, ''.join(g))

def flower_meadow():
    """花畑: rolling green hills full of character flowers (the same faces as before), a little windmill far off"""
    d, b = sky([(0, '#c6e4f6'), (.55, '#eaf5f9'), (1, '#f6f6e8')])
    g = [b]
    g.append('<rect x="1600" y="700" width="40" height="110" fill="#f3efe6"/><path d="M1594 704 L1620 672 L1646 704 Z" fill="#e8a09a"/>')
    for y, a, c, sd in ((780, 40, '#cfe6bf', 301), (870, 36, '#bfdea8', 302), (990, 30, '#b2d698', 303)):
        g.append(f'<path d="{ridge_path(y, a, sd, 6)}" fill="{c}"/>')
    r = RNG(305); pts = []
    PET = ['#fbc6d4', '#ffe08a', '#ffffff', '#d4c8f6', '#ffcfae', '#bfe3f7']; CEN = {'#fbc6d4': '#ffe48f', '#ffe08a': '#ffb35c', '#ffffff': '#ffd65e', '#d4c8f6': '#fff0a6', '#ffcfae': '#fff0a6', '#bfe3f7': '#fff0a6'}
    tries = 0
    while len(pts) < 64 and tries < 30000:
        tries += 1; y = 900 + r.random() ** .8 * 290; x = r.random() * 1920; sz = 8 + (y - 900) / 290 * 18 + r.random() * 4
        if all((x - q[0]) ** 2 + (y - q[1]) ** 2 > ((sz + q[2]) * 1.9) ** 2 for q in pts): pts.append((x, y, sz))
    for x, y, S in sorted(pts, key=lambda p: p[1]):
        col = PET[int(r.random() * 6)]; n = 5 if r.random() < .7 else 6; rot = r.random() * 3
        g.append(f'<path d="M{x:.0f} {y:.0f} L{x:.0f} {y + S * 2.2:.0f}" stroke="#8cc47a" stroke-width="{max(2, S * .16):.1f}"/><ellipse cx="{x + S * .55:.0f}" cy="{y + S * 1.4:.0f}" rx="{S * .5:.1f}" ry="{S * .22:.1f}" fill="#9fd18b"/>')
        g.append(''.join(f'<circle cx="{x + math.cos(rot + j * 2 * math.pi / n) * S * .62:.1f}" cy="{y + math.sin(rot + j * 2 * math.pi / n) * S * .62:.1f}" r="{S * .48:.1f}" fill="{col}"/>' for j in range(n)))
        g.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{S * .5:.1f}" fill="{CEN[col]}"/>')
        if S > 12:
            e = S * .085
            g.append(f'<ellipse cx="{x - S * .2:.1f}" cy="{y - S * .1:.1f}" rx="{e:.1f}" ry="{e * 1.2:.1f}" fill="#5a4038"/><ellipse cx="{x + S * .2:.1f}" cy="{y - S * .1:.1f}" rx="{e:.1f}" ry="{e * 1.2:.1f}" fill="#5a4038"/>'
                     f'<path d="M{x - S * .12:.1f} {y + S * .02:.1f} Q{x:.1f} {y + S * .16:.1f} {x + S * .12:.1f} {y + S * .02:.1f}" stroke="#5a4038" stroke-width="{max(1.5, S * .06):.1f}" fill="none" stroke-linecap="round"/>'
                     f'<ellipse cx="{x - S * .3:.1f}" cy="{y + S * .04:.1f}" rx="{S * .09:.1f}" ry="{S * .06:.1f}" fill="#ff9fb0" opacity=".6"/><ellipse cx="{x + S * .3:.1f}" cy="{y + S * .04:.1f}" rx="{S * .09:.1f}" ry="{S * .06:.1f}" fill="#ff9fb0" opacity=".6"/>')
    return doc(d, ''.join(g))

def dunes():
    """砂丘: soft layered dunes under a warm sky, a few desert plants, a far oasis palm"""
    d, b = sky([(0, '#f8dcc4'), (.5, '#fdeedd'), (1, '#f8e2c0')])
    g = [b, '<circle cx="520" cy="420" r="80" fill="#fdeec8"/>']
    for y, a, c, c2, sd in ((760, 60, '#f3d4a8', '#f7e0bd', 311), (850, 80, '#eec795', '#f4d6ac', 312), (960, 70, '#e9bb85', '#efcb98', 313), (1080, 50, '#e4b277', '#ebc08a', 314)):
        pth = ridge_path(y, a, sd, 5)
        g.append(f'<path d="{pth}" fill="{c}"/><path d="{ridge_path(y + 6, a, sd, 5, y + 40)}" fill="{c2}" opacity=".7"/>')
    g.append('<path d="M1500 772 C1496 730 1500 700 1506 680" stroke="#b08a6a" stroke-width="7" fill="none"/>' + ''.join(f'<path d="M1506 680 Q{1506 + math.cos(math.radians(a)) * 40:.0f} {680 + math.sin(math.radians(a)) * 40 - 14:.0f} {1506 + math.cos(math.radians(a)) * 70:.0f} {680 + math.sin(math.radians(a)) * 70 + 10:.0f} Q{1506 + math.cos(math.radians(a)) * 30:.0f} {680 + math.sin(math.radians(a)) * 30:.0f} 1506 680 Z" fill="#9fcf9a"/>' for a in (-160, -120, -60, -20)))
    g.append(''.join(f'<path d="M{x} 1150 C{x - 4} 1120 {x + 2} 1100 {x} 1080 M{x} 1120 C{x - 20} 1112 {x - 22} 1096 {x - 18} 1090 M{x} 1110 C{x + 18} 1104 {x + 20} 1090 {x + 16} 1084" stroke="#9fbf86" stroke-width="7" fill="none" stroke-linecap="round"/>' for x in (240, 1720)))
    return doc(d, ''.join(g))

def lake():
    """湖と山: snowy blue mountains, a calm lake mirroring them, pines on the shore, a little boathouse"""
    d, b = sky([(0, '#cfe4f4'), (.5, '#eef5f7'), (1, '#e3f0ef')])
    g = [b]
    mt = 'M-40 760 L220 520 L360 640 L560 380 L760 600 L900 500 L1120 700 L1300 460 L1500 620 L1700 420 L1960 700 L1960 760 Z'
    g.append(f'<path d="{mt}" fill="#b9cbe0"/>')
    g.append('<path d="M500 450 L560 380 L620 450 L590 440 L560 470 L530 440 Z M1250 520 L1300 460 L1350 520 L1320 510 L1300 530 L1278 512 Z M1650 480 L1700 420 L1750 480 L1722 470 L1700 492 L1676 470 Z" fill="#f6f9fc"/>')
    g.append(f'<path d="{ridge_path(720, 40, 321, 7, 780)}" fill="#a7c0b6"/>')
    g.append(f'<rect x="0" y="760" width="{VW}" height="440" fill="#cfe3ea"/>')
    g.append(f'<g transform="translate(0 1520) scale(1 -1)" opacity=".35"><path d="{mt}" fill="#b9cbe0"/></g>')
    r = RNG(323)
    for x in [40 + i * 70 + r.random() * 30 for i in range(7)] + [1500 + i * 64 + r.random() * 20 for i in range(7)]:
        h = 120 + r.random() * 70
        g.append(f'<path d="M{x:.0f} {780 - h:.0f} L{x + 34:.0f} 780 L{x - 34:.0f} 780 Z" fill="#8fb0a2"/><path d="M{x:.0f} 780 L{x + 34:.0f} 780 L{x:.0f} {780 + h * .5:.0f} Z M{x:.0f} 780 L{x - 34:.0f} 780 L{x:.0f} {780 + h * .5:.0f} Z" fill="#8fb0a2" opacity=".28"/>')
    g.append('<path d="M-40 1200 L-40 1080 C400 1060 900 1110 1300 1090 C1600 1076 1800 1090 1960 1080 L1960 1200 Z" fill="#c4dcc3"/>')
    g.append('<rect x="1600" y="996" width="140" height="74" fill="#f2e6d3"/><path d="M1590 1000 L1670 952 L1750 1000 Z" fill="#c9a07a"/><rect x="1650" y="1026" width="40" height="44" fill="#a9c8e6"/><rect x="1580" y="1070" width="200" height="10" fill="#c9a07a"/>')
    return doc(d, ''.join(g))

def night_sky():
    """夜空: a deep blue night, a big soft moon, a hill town with lit windows and a tiny observatory"""
    d, b = sky([(0, '#121a3a'), (.6, '#202c58'), (1, '#2e3d72')])
    g = [b, '<circle cx="1460" cy="300" r="170" fill="#fdf0c8" opacity=".12"/><circle cx="1460" cy="300" r="96" fill="#fdf0c8"/><circle cx="1428" cy="284" r="16" fill="#f3e2b0"/><circle cx="1490" cy="330" r="10" fill="#f3e2b0"/>']
    r = RNG(331)
    g.append(''.join(f'<circle cx="{r.random() * 1920:.0f}" cy="{r.random() * 780:.0f}" r="{.7 + r.random() ** 3 * 1.6:.1f}" fill="#fff6dc" opacity="{.3 + r.random() * .5:.2f}"/>' for _ in range(260)))
    g.append(f'<path d="{ridge_path(980, 60, 333, 6)}" fill="#1b2548"/>')
    x = 160
    while x < 1100:
        w = 60 + r.random() * 50; h = 60 + r.random() * 70; top = 1000 - h - (x - 160) * .05
        g.append(f'<rect x="{x:.0f}" y="{top:.0f}" width="{w:.0f}" height="{h + 200:.0f}" fill="#151d3c"/><path d="M{x - 6:.0f} {top:.0f} L{x + w / 2:.0f} {top - w * .45:.0f} L{x + w + 6:.0f} {top:.0f} Z" fill="#151d3c"/>')
        if r.random() < .7: g.append(f'<rect x="{x + w * .3:.0f}" y="{top + 20:.0f}" width="14" height="18" rx="3" fill="#fde3a6"/>')
        x += w + 10
    g.append('<rect x="1640" y="900" width="70" height="60" fill="#151d3c"/><path d="M1630 902 C1630 856 1720 856 1720 902 Z" fill="#232e58"/><rect x="1690" y="860" width="40" height="8" rx="4" transform="rotate(-30 1690 864)" fill="#151d3c"/>')
    g.append(f'<path d="{ridge_path(1080, 30, 335, 7)}" fill="#141c38"/>')
    return doc(d, ''.join(g))

def galaxy_rail():
    """銀河鉄道 (UR): a deep violet night, the Milky Way across, a sea of moonlit clouds below — the train is the page's"""
    d = lin('sky', [(0, '#0f1032'), (.55, '#231c55'), (1, '#3b2c6e')]) + '<radialGradient id="mw" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#e9d8ff" stop-opacity=".55"/><stop offset=".5" stop-color="#b7a2f0" stop-opacity=".22"/><stop offset="1" stop-color="#b7a2f0" stop-opacity="0"/></radialGradient>'
    g = [f'<rect width="{VW}" height="{VH}" fill="url(#sky)"/>', '<ellipse cx="960" cy="420" rx="1300" ry="210" transform="rotate(-18 960 420)" fill="url(#mw)"/>']
    r = RNG(381)
    g.append(''.join(f'<circle cx="{r.random() * 1920:.0f}" cy="{r.random() * 900:.0f}" r="{.6 + r.random() ** 3 * 2:.1f}" fill="#fff6e6" opacity="{.3 + r.random() * .6:.2f}"/>' for _ in range(420)))
    for y, c, sd in ((900, '#4a3d82', 383), (980, '#5a4b92', 384), (1070, '#6c5ca3', 385)):
        r2 = RNG(sd); pts = []
        x = -80
        while x < 2000:
            s = 60 + r2.random() * 60; pts.append(f'<circle cx="{x:.0f}" cy="{y + r2.random() * 20:.0f}" r="{s:.0f}"/>'); x += s * 1.3
        g.append(f'<g fill="{c}">' + ''.join(pts) + f'<rect x="-80" y="{y}" width="2100" height="400"/></g>')
    g.append('<circle cx="300" cy="200" r="54" fill="#fdf0c8"/><circle cx="322" cy="190" r="48" fill="#231c55"/>')
    return doc(d, ''.join(g))

def jelly_sea():
    """クラゲの海 (UR): deep indigo water lit from above, soft light shafts, a seabed of glowing anemones — the jellyfish are the page's.
    Soft (2026-11-20 ユーザー：ベクター感が強い): blurred shafts and glows, a hazy seabed, no hard edges."""
    from skins_ur3 import BLUR
    d = BLUR + lin('sky', [(0, '#3d7fae'), (.35, '#245a8c'), (.8, '#173a6a'), (1, '#132f58')]) + lin('ray', [(0, '#ffffff'), (1, '#ffffff00')]) + \
        '<radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#d8f2ff" stop-opacity=".55"/><stop offset="1" stop-color="#d8f2ff" stop-opacity="0"/></radialGradient>'
    g = [f'<rect width="{VW}" height="{VH}" fill="url(#sky)"/>', '<ellipse cx="900" cy="-60" rx="1300" ry="380" fill="url(#sun)"/>']
    g.append(''.join(f'<path d="M{x} -40 L{x + w} -40 L{x + w * 2.4} 1120 L{x + w * 1.1} 1120 Z" fill="url(#ray)" opacity=".13" filter="url(#b16)"/>' for x, w in ((180, 80), (620, 60), (1080, 100), (1560, 70), (380, 40), (1320, 50))))
    r = RNG(392)
    g.append(''.join(f'<circle cx="{r.random() * 1920:.0f}" cy="{r.random() * 1050:.0f}" r="{1 + r.random() * 2.5:.1f}" fill="#d8f2ff" opacity="{.15 + r.random() * .35:.2f}" filter="url(#b2)"/>' for _ in range(160)))
    g.append(f'<path d="{ridge_path(1060, 30, 391, 7)}" fill="#163a66" opacity=".7" filter="url(#b8)"/>')
    g.append(f'<path d="{ridge_path(1090, 24, 393, 8)}" fill="#10294d" filter="url(#b2)"/>')
    for x, c in ((180, '#f7a8c8'), (260, '#a9e4ff'), (1600, '#d0b4ff'), (1720, '#f7a8c8'), (980, '#a9e4ff')):
        g.append(f'<ellipse cx="{x}" cy="1060" rx="90" ry="60" fill="{c}" opacity=".28" filter="url(#b16)"/>')
        g.append('<g opacity=".8" filter="url(#b2)">' + ''.join(f'<path d="M{x} 1110 C{x + dx * .4} {1080 - abs(dx) * .2} {x + dx * .8} {1060 - abs(dx) * .3} {x + dx} 1040" stroke="{c}" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="{x + dx}" cy="1040" r="7" fill="{c}"/>' for dx in (-40, -20, 0, 20, 40)) + '</g>')
    return doc(d, ''.join(g))

SSR3 = {'s25': blue_sky, 's26': sunset_hills, 's27': seaside, 's28': snowfield, 's29': flower_meadow, 's30': dunes, 's31': lake, 's33': night_sky,
        's38': galaxy_rail, 's39': jelly_sea}

if __name__ == '__main__':
    ids = sys.argv[1:] or list(SSR3)
    imgs = render([(SSR3[i](), OW, OH) for i in ids])
    for i, im in zip(ids, imgs):
        save(i, finish(im, int(i[1:])), 'cover', q=80)

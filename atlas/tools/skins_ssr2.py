#!/usr/bin/env python3
"""Portal skins s79–s92 (SSR, remade 2026-11-20): flat picture-book scenes of places round the world, drawn as SVG on a
1920×1200 grid and rendered at 2880×1800 by headless Chrome, then given a faint paper grain.
Composition rule: the sky (top ~55 %) stays calm because the page's cards sit there; the scene lives in the lower part
and at the left / right edges. Run from the repo root: python3 atlas/tools/skins_ssr2.py [id …]"""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from skins import RNG, grain, fnoise, save, np
from skins_sr2 import render

VW, VH, OW, OH = 1920, 1200, 2880, 1800

# portrait version (atlas/tools/skins_tall.py): the same scene with 1800 more units of sky on top (TALL['on']),
# EXT = the extension's fill colour and any extra pieces drawn in it (clouds / stars)
TALL = {'on': False, 'col': '#ffffff', 'extra': ''}
EXTH = 1800

def doc(defs, body):
    if TALL['on']:
        return (f'<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="3000" viewBox="0 {-EXTH} {VW} {VH + EXTH}"><defs>{defs}</defs>'
                f'<rect x="0" y="{-EXTH - 2}" width="{VW}" height="{EXTH + 4}" fill="{TALL["col"]}"/>{TALL["extra"]}{body}</svg>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{OW}" height="{OH}" viewBox="0 0 {VW} {VH}"><defs>{defs}</defs>{body}</svg>'

def lin(id_, stops, x2=0, y2=1):
    return f'<linearGradient id="{id_}" x1="0" y1="0" x2="{x2}" y2="{y2}">' + ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops) + '</linearGradient>'

def sky(stops):
    return lin('sky', stops), f'<rect width="{VW}" height="{VH}" fill="url(#sky)"/>'

def smooth_path(pts, close_to=None):
    """Catmull-Rom through pts → cubic Béziers; close_to = y of the bottom edge to make a filled band"""
    d = f'M{pts[0][0]:.1f} {pts[0][1]:.1f}'
    for i in range(len(pts) - 1):
        p0 = pts[max(i - 1, 0)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(i + 2, len(pts) - 1)]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6); c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f' C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}'
    if close_to is not None: d += f' L{pts[-1][0]:.1f} {close_to} L{pts[0][0]:.1f} {close_to} Z'
    return d

def hill(y, amp, col, seed, n=7, bottom=VH):
    r = RNG(seed); pts = [(-60 + i * (VW + 120) / (n - 1), y + (r.random() - .5) * 2 * amp) for i in range(n)]
    return f'<path d="{smooth_path(pts, bottom)}" fill="{col}"/>'

def cloud(x, y, s, col='#ffffff', shade='#e3edf6'):
    lobes = [(-.55, .02, .3), (-.2, -.2, .42), (.25, -.12, .38), (.58, .04, .28)]
    def shape(dy):
        return ''.join(f'<circle cx="{x + lx * s:.1f}" cy="{y + (ly + dy) * s:.1f}" r="{lr * s:.1f}"/>' for lx, ly, lr in lobes) + f'<rect x="{x - .82 * s:.1f}" y="{y + (dy - .02) * s:.1f}" width="{1.68 * s:.1f}" height="{.3 * s:.1f}" rx="{.15 * s:.1f}"/>'
    return f'<g fill="{shade}">{shape(.06)}</g><g fill="{col}">{shape(0)}</g>'

def windows(x, y, cols, rows, w, h, gx, gy, col, rx=3):
    return ''.join(f'<rect x="{x + i * gx:.1f}" y="{y + j * gy:.1f}" width="{w}" height="{h}" rx="{rx}" fill="{col}"/>' for i in range(cols) for j in range(rows))

def finish(img, seed):
    return grain(img * (0.99 + 0.02 * np.asarray(__import__('PIL.Image', fromlist=['Image']).fromarray((fnoise(512, 2.6, seed, m=512) * 255).astype(np.uint8)).resize((OW, OH)), np.float32)[..., None] / 255), .004, seed)

# ---------------------------------------------------------------- scenes
def paris():
    """Paris: lilac-pink morning, mansard roofs along the bottom, the Eiffel Tower at the right edge, the Seine"""
    d, b = sky([(0, '#dfe6f6'), (.55, '#f6eaf0'), (1, '#fdf1e6')])
    g = [b, cloud(260, 210, 120, shade='#ecdfee'), cloud(1180, 150, 90, shade='#ecdfee')]
    # Eiffel tower (right)
    X, B = 1650, 1010
    g.append(f'<path d="M{X} 330 L{X + 8} 330 L{X + 30} 640 L{X + 100} {B} L{X + 60} {B} C{X + 40} 900 {X - 32} 900 {X - 52} {B} L{X - 92} {B} L{X - 22} 640 Z" fill="#c9b9da"/>')
    g.append(f'<path d="M{X - 32} 640 L{X + 40} 640 L{X + 38} 656 L{X - 30} 656 Z M{X - 62} 820 L{X + 70} 820 L{X + 72} 838 L{X - 64} 838 Z" fill="#b9a8cd"/>')
    g.append(f'<path d="M{X - 2} 300 L{X + 10} 300 L{X + 6} 336 L{X + 2} 336 Z" fill="#b9a8cd"/>')
    # buildings: Haussmann blocks with mansard roofs
    r = RNG(11); x = -40; cols = ['#f4e3d3', '#f1dccb', '#f6e8da', '#eed6c4']
    while x < 1500:
        w = 160 + r.random() * 90; h = 170 + r.random() * 70; top = 1040 - h; c = cols[int(r.random() * 4)]
        g.append(f'<rect x="{x:.0f}" y="{top:.0f}" width="{w:.0f}" height="{h + 200:.0f}" fill="{c}"/>')
        g.append(f'<path d="M{x - 6:.0f} {top:.0f} L{x + 14:.0f} {top - 46:.0f} L{x + w - 14:.0f} {top - 46:.0f} L{x + w + 6:.0f} {top:.0f} Z" fill="#a9b6cc"/>')
        for i in range(int((w - 30) // 44)):
            wx = x + 24 + i * 44
            g.append(f'<rect x="{wx:.0f}" y="{top - 34:.0f}" width="16" height="22" rx="8" fill="#e9eef6"/>')
            g.append(windows(wx, top + 30, 1, int(h // 62), 16, 30, 44, 56, '#ffffff', 2))
            g.append(f'<rect x="{wx - 3:.0f}" y="{top + 62:.0f}" width="22" height="4" fill="#d7c2ae"/>')
        g.append(f'<rect x="{x + w * .3:.0f}" y="{top - 70:.0f}" width="16" height="30" fill="#d7a99a"/><rect x="{x + w * .3 - 3:.0f}" y="{top - 74:.0f}" width="22" height="7" rx="2" fill="#c9988a"/>')
        x += w + 6
    g.append(f'<rect x="0" y="1040" width="{VW}" height="160" fill="#c7dcea"/>')
    g.append(''.join(f'<rect x="{x}" y="{y}" width="{w}" height="5" rx="2.5" fill="#e6f0f7"/>' for x, y, w in ((180, 1080, 90), (520, 1120, 140), (980, 1090, 110), (1380, 1140, 160), (1720, 1100, 90), (760, 1165, 80))))
    return doc(d, ''.join(g))

def venice():
    """Venice: a canal between pastel palazzi with arched windows, a gondola, mooring poles"""
    d, b = sky([(0, '#d6ebf6'), (.6, '#f4f2ea'), (1, '#f8efe2')])
    g = [b, cloud(980, 180, 110), cloud(1500, 260, 80)]
    r = RNG(13)
    def palazzo(x, w, h, c, trim):
        top = 980 - h; s = [f'<rect x="{x}" y="{top}" width="{w}" height="{h + 30}" fill="{c}"/><rect x="{x - 6}" y="{top - 14}" width="{w + 12}" height="16" fill="{trim}"/>']
        n = int(w // 52)
        for row in range(int(h // 95)):
            for i in range(n):
                wx = x + (w - n * 52) / 2 + 12 + i * 52; wy = top + 30 + row * 95
                s.append(f'<path d="M{wx} {wy + 50} L{wx} {wy + 14} A14 14 0 0 1 {wx + 28} {wy + 14} L{wx + 28} {wy + 50} Z" fill="#fbf7f0"/><rect x="{wx - 4}" y="{wy + 50}" width="36" height="5" fill="{trim}"/>')
        return ''.join(s)
    left = [(-20, 230, 420, '#f2c8b8', '#e8b19e'), (200, 200, 360, '#f6e0b0', '#ecca8a'), (390, 180, 470, '#f3d4d6', '#e6b6bb')]
    right = [(1380, 190, 400, '#d9e6cf', '#bfd5ae'), (1560, 200, 470, '#f2c8b8', '#e8b19e'), (1750, 220, 380, '#f6e0b0', '#ecca8a')]
    for x, w, h, c, t in left + right: g.append(palazzo(x, w, h, c, t))
    g.append('<path d="M570 980 L570 860 L700 860 L700 820 L1250 820 L1250 860 L1380 860 L1380 980 Z" fill="#e9e1d6"/>')   # far quay houses
    g.append(windows(600, 880, 2, 1, 22, 34, 50, 0, '#f6f1ea') + windows(1280, 880, 2, 1, 22, 34, 50, 0, '#f6f1ea'))
    g.append('<rect x="820" y="700" width="310" height="160" fill="#efe8de"/><path d="M820 700 C820 600 900 560 975 560 C1050 560 1130 600 1130 700 Z" fill="#dfe6ee"/>')   # domed church
    g.append('<rect x="960" y="510" width="30" height="56" fill="#efe8de"/><path d="M955 512 C955 490 995 490 995 512 Z" fill="#dfe6ee"/><rect x="972" y="470" width="6" height="26" fill="#d9c49a"/>')
    g.append('<rect x="760" y="760" width="60" height="100" fill="#efe8de"/><path d="M760 760 C760 726 820 726 820 760 Z" fill="#dfe6ee"/><rect x="1130" y="760" width="60" height="100" fill="#efe8de"/><path d="M1130 760 C1130 726 1190 726 1190 760 Z" fill="#dfe6ee"/>')
    g.append(windows(850, 740, 5, 1, 24, 50, 54, 0, '#f8f4ee', 12) + '<rect x="930" y="800" width="90" height="60" rx="40" fill="#e3d6c8"/>')
    g.append(f'<rect x="0" y="980" width="{VW}" height="220" fill="#a9d4d6"/>')
    g.append(''.join(f'<rect x="{x}" y="{y}" width="{w}" height="6" rx="3" fill="#c9e6e6"/>' for x, y, w in ((120, 1020, 120), (520, 1060, 180), (880, 1030, 90), (1260, 1080, 200), (1640, 1040, 120), (300, 1130, 160), (1500, 1150, 140))))
    for x in (560, 610, 1350, 1400):
        g.append(f'<rect x="{x}" y="900" width="12" height="120" rx="6" fill="#f3f0ea"/><rect x="{x}" y="920" width="12" height="16" fill="#9fbde0"/><rect x="{x}" y="952" width="12" height="16" fill="#9fbde0"/>')
    g.append('<path d="M760 1110 C840 1130 1040 1130 1120 1106 C1110 1098 1090 1100 1080 1104 C1000 1118 880 1118 790 1100 C780 1096 768 1098 760 1110 Z" fill="#5f6a86"/>')
    g.append('<path d="M1112 1106 C1124 1094 1130 1080 1132 1068 L1138 1068 C1136 1084 1130 1098 1118 1110 Z" fill="#5f6a86"/><rect x="930" y="1074" width="60" height="22" rx="6" fill="#e9b3a4"/>')
    g.append('<path d="M840 1104 L870 1020 L876 1022 L848 1106 Z" fill="#c9a77e"/><circle cx="860" cy="1048" r="13" fill="#f6dfc8"/><rect x="845" y="1060" width="30" height="40" rx="8" fill="#f2f0ea"/><path d="M845 1068 L875 1068 L875 1074 L845 1074 Z" fill="#9fbde0"/><rect x="846" y="1034" width="28" height="7" rx="3" fill="#e9c47a"/>')
    return doc(d, ''.join(g))

def santorini():
    """Santorini: white cubic houses and blue domes down the cliff on the left, the Aegean, a sailboat"""
    d, b = sky([(0, '#cfe7f8'), (.6, '#eef7fd'), (1, '#f6fbff')])
    g = [b, cloud(1300, 200, 110), cloud(1700, 320, 80)]
    g.append(f'<rect x="0" y="760" width="{VW}" height="440" fill="#9fd0ea"/>')
    g.append(''.join(f'<rect x="{x}" y="{y}" width="{w}" height="5" rx="2.5" fill="#c9e6f6"/>' for x, y, w in ((900, 820, 140), (1300, 870, 200), (1650, 830, 120), (1100, 960, 160), (1500, 1040, 220), (980, 1120, 140))))
    g.append('<path d="M0 560 C220 540 420 600 560 700 C680 790 700 900 820 1000 C900 1070 980 1120 1060 1200 L0 1200 Z" fill="#e9c9a8"/>')   # cliff
    r = RNG(17)
    # terraces: rows of flush white houses following the cliff, each row a little lower and further right
    for row in range(8):
        y = 560 + row * 72; x_end = 360 + row * 66
        x = -20 + (row % 2) * 30
        while x < x_end:
            w = 70 + r.random() * 60; h = 64 + r.random() * 20
            g.append(f'<rect x="{x:.0f}" y="{y + 72 - h:.0f}" width="{w:.0f}" height="{h:.0f}" rx="8" fill="#fbfbf8"/><rect x="{x:.0f}" y="{y + 62:.0f}" width="{w:.0f}" height="10" fill="#edf0f3"/>')
            if r.random() < .6: g.append(f'<path d="M{x + w * .3:.0f} {y + 72:.0f} L{x + w * .3:.0f} {y + 46:.0f} A{w * .1:.0f} {w * .1:.0f} 0 0 1 {x + w * .5:.0f} {y + 46:.0f} L{x + w * .5:.0f} {y + 72:.0f} Z" fill="{["#7fb0dc", "#9fc6e8", "#f2b8c8"][int(r.random() * 3)]}"/>')
            if r.random() < .45: g.append(f'<rect x="{x + w * .62:.0f}" y="{y + 72 - h + 16:.0f}" width="{w * .2:.0f}" height="16" rx="3" fill="#a9cbe8"/>')
            x += w + 4
    for x, y, s_ in ((200, 560, 60), (430, 776, 52), (330, 920, 58)):
        g.append(f'<rect x="{x - s_ * .55:.0f}" y="{y - 6}" width="{s_ * 1.1:.0f}" height="70" fill="#fbfbf8"/><path d="M{x - s_ * .6:.0f} {y} A{s_ * .6:.0f} {s_ * .6:.0f} 0 0 1 {x + s_ * .6:.0f} {y} Z" fill="#5f97d0"/><rect x="{x - 3}" y="{y - s_ * .6 - 22:.0f}" width="6" height="24" fill="#f6d79a"/><rect x="{x - 10}" y="{y - s_ * .6 - 14:.0f}" width="20" height="5" fill="#f6d79a"/>')
    g.append('<circle cx="640" cy="840" r="44" fill="#f2b8c8"/><circle cx="600" cy="866" r="30" fill="#f6c9d6"/><circle cx="680" cy="870" r="28" fill="#f6c9d6"/>')   # bougainvillea tree
    g.append('<path d="M1460 900 L1540 900 L1528 924 L1472 924 Z" fill="#f8f6f0"/><path d="M1500 900 L1500 800 L1460 892 Z" fill="#ffffff"/><path d="M1504 812 L1504 892 L1536 892 Z" fill="#f2c8b8"/><rect x="1499" y="796" width="4" height="106" fill="#c9a77e"/>')
    return doc(d, ''.join(g))

def kyoto():
    """Kyoto: a five-storied pagoda at the left, tiled roofs and autumn maples, blue mountains far off"""
    d, b = sky([(0, '#f6e6da'), (.55, '#fbf1e6'), (1, '#fdf6ec')])
    g = [b, cloud(1300, 190, 100, shade='#f1e2d8'), cloud(760, 270, 70, shade='#f1e2d8')]
    g.append(hill(700, 50, '#d9e2ea', 3, n=6)); g.append(hill(780, 40, '#cad8df', 4, n=8))
    X = 300
    for k in range(5):
        y = 520 + k * 92; w = 250 - k * 26
        g.append(f'<rect x="{X - w * .32:.0f}" y="{y - 40:.0f}" width="{w * .64:.0f}" height="60" fill="#f1e1cc"/>')
        g.append(f'<path d="M{X - w / 2:.0f} {y:.0f} C{X - w * .35:.0f} {y - 10:.0f} {X - w * .2:.0f} {y - 24:.0f} {X - w * .12:.0f} {y - 34:.0f} L{X + w * .12:.0f} {y - 34:.0f} C{X + w * .2:.0f} {y - 24:.0f} {X + w * .35:.0f} {y - 10:.0f} {X + w / 2:.0f} {y:.0f} C{X + w * .3:.0f} {y - 4:.0f} {X - w * .3:.0f} {y - 4:.0f} {X - w / 2:.0f} {y:.0f} Z" fill="#7d8aa3"/>' if False else '')
    for k in range(5):   # draw roofs from the top storey down
        y = 520 + k * 92; w = 140 + k * 30
        g.append(f'<rect x="{X - w * .3:.0f}" y="{y:.0f}" width="{w * .6:.0f}" height="70" fill="#f1e1cc"/><rect x="{X - w * .3:.0f}" y="{y + 20:.0f}" width="{w * .6:.0f}" height="8" fill="#e2b3a0"/>')
        g.append(f'<path d="M{X - w / 2 - 30:.0f} {y + 6:.0f} C{X - w / 2:.0f} {y + 2:.0f} {X - w * .3:.0f} {y - 22:.0f} {X - w * .22:.0f} {y - 30:.0f} L{X + w * .22:.0f} {y - 30:.0f} C{X + w * .3:.0f} {y - 22:.0f} {X + w / 2:.0f} {y + 2:.0f} {X + w / 2 + 30:.0f} {y + 6:.0f} Z" fill="#8a95ab"/>')
    g.append(f'<rect x="{X - 4}" y="380" width="8" height="120" fill="#c9a77e"/>' + ''.join(f'<ellipse cx="{X}" cy="{400 + i * 16}" rx="13" ry="4" fill="#c9a77e"/>' for i in range(6)))
    r = RNG(19)
    for x in range(540, 1980, 150):   # machiya: tiled roofs, lattice fronts, a red lantern now and then
        w = 140; y = 950 + r.random() * 30
        g.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="{w}" height="300" fill="#f4e8d8"/><path d="M{x - 16:.0f} {y + 6:.0f} L{x + 14:.0f} {y - 36:.0f} L{x + w - 14:.0f} {y - 36:.0f} L{x + w + 16:.0f} {y + 6:.0f} Z" fill="#8a95ab"/>')
        g.append(f'<rect x="{x + 16:.0f}" y="{y + 30:.0f}" width="{w - 32}" height="54" fill="#e8d3b8"/>' + ''.join(f'<rect x="{x + 20 + i * 12:.0f}" y="{y + 30:.0f}" width="3" height="54" fill="#d6bc9a"/>' for i in range(9)))
        g.append(f'<path d="M{x - 8:.0f} {y + 96:.0f} L{x + w + 8:.0f} {y + 96:.0f} L{x + w - 4:.0f} {y + 80:.0f} L{x + 4:.0f} {y + 80:.0f} Z" fill="#9aa4b8"/>')
        if r.random() < .5: g.append(f'<rect x="{x + w - 30:.0f}" y="{y + 100:.0f}" width="18" height="28" rx="8" fill="#f2a59a"/>')
    for x, y, s, c in ((120, 1030, 120, '#f0a58a'), (520, 900, 100, '#f5c27e'), (1500, 880, 110, '#f0a58a'), (1820, 960, 120, '#f5c27e'), (900, 1080, 90, '#eb9a8e')):
        g.append(f'<rect x="{x - 8}" y="{y}" width="16" height="{s}" fill="#b08a6a"/>' + ''.join(f'<circle cx="{x + dx * s:.0f}" cy="{y + dy * s:.0f}" r="{rr * s:.0f}" fill="{c}"/>' for dx, dy, rr in ((0, -.35, .42), (-.38, -.05, .32), (.38, -.05, .32), (-.2, -.62, .3), (.22, -.6, .3))))
    return doc(d, ''.join(g))

def nordic_harbor():
    """a Nordic harbour (Bergen-like): a row of coloured gabled wooden houses on the quay, boats, fjord hills"""
    d, b = sky([(0, '#d7e8f4'), (.6, '#eef5f8'), (1, '#f6f8f6')])
    g = [b, cloud(320, 200, 110), cloud(1500, 170, 120)]
    g.append(hill(640, 70, '#c9dccf', 5, n=6)); g.append(hill(700, 40, '#b8d1c0', 6, n=7))
    cols = ['#f2b8a8', '#f6dca0', '#f7f2e6', '#bcd6ec', '#f3c7a0', '#d9e6cf', '#e9b6bf']
    x = 40; r = RNG(23)
    while x < 1880:
        w = 120 + r.random() * 40; h = 220 + r.random() * 90; c = cols[int(r.random() * len(cols))]; top = 900 - h
        g.append(f'<path d="M{x:.0f} 900 L{x:.0f} {top:.0f} L{x + w / 2:.0f} {top - w * .55:.0f} L{x + w:.0f} {top:.0f} L{x + w:.0f} 900 Z" fill="{c}"/>')
        g.append(f'<path d="M{x - 8:.0f} {top + 4:.0f} L{x + w / 2:.0f} {top - w * .55 - 8:.0f} L{x + w + 8:.0f} {top + 4:.0f}" fill="none" stroke="#fbfaf6" stroke-width="9" stroke-linejoin="round"/>')
        g.append(windows(x + w * .18, top + 30, 2, int(h // 80), w * .2, 40, w * .44, 74, '#fbfaf6', 3))
        g.append(f'<circle cx="{x + w / 2:.0f}" cy="{top - w * .2:.0f}" r="9" fill="#fbfaf6"/>')
        x += w + 4
    g.append(f'<rect x="0" y="900" width="{VW}" height="26" fill="#b9a289"/><rect x="0" y="926" width="{VW}" height="274" fill="#a9cde0"/>')
    g.append(''.join(f'<rect x="{x}" y="{y}" width="{w}" height="6" rx="3" fill="#cbe2ee"/>' for x, y, w in ((200, 980, 140), (700, 1040, 200), (1200, 990, 120), (1600, 1060, 180), (400, 1130, 160), (1000, 1150, 220))))
    for x, c in ((360, '#f2b8a8'), (1320, '#bcd6ec')):
        g.append(f'<path d="M{x - 90} 1010 L{x + 90} 1010 L{x + 70} 1044 L{x - 70} 1044 Z" fill="{c}"/><rect x="{x - 3}" y="880" width="6" height="130" fill="#b08a6a"/><path d="M{x + 4} 890 L{x + 4} 1000 L{x + 70} 1000 Z" fill="#fbfaf6"/>')
    return doc(d, ''.join(g))

def egypt():
    """Egypt: pyramids at the right in the warm desert, palms and the Nile at the left, a soft sun"""
    d, b = sky([(0, '#f8e2c8'), (.55, '#fcefdc'), (1, '#fdf4e6')])
    g = [b, '<circle cx="1480" cy="300" r="90" fill="#fbe3b0"/>']
    g.append(hill(820, 30, '#f2d6ad', 7, n=6))
    for x, w, h, c1, c2 in ((1250, 520, 380, '#ecc994', '#e0b57a'), (1640, 380, 280, '#efcf9e', '#e2b984'), (1040, 300, 200, '#f0d3a6', '#e4bd8a')):
        g.append(f'<path d="M{x - w / 2} 880 L{x} {880 - h} L{x + w * .12} 880 Z" fill="{c1}"/><path d="M{x} {880 - h} L{x + w / 2} 880 L{x + w * .12} 880 Z" fill="{c2}"/>')
    g.append(hill(900, 24, '#f4dbb5', 8, n=7))
    g.append('<path d="M0 960 C240 940 420 980 620 1000 C760 1014 860 1060 900 1200 L0 1200 Z" fill="#a9d4d6"/>')
    g.append(''.join(f'<rect x="{x}" y="{y}" width="{w}" height="5" rx="2.5" fill="#c9e6e6"/>' for x, y, w in ((80, 1010, 120), (300, 1060, 160), (120, 1130, 140), (520, 1080, 100))))
    for x, y, s in ((140, 960, 1.0), (300, 930, .85), (700, 990, .9)):
        g.append(f'<path d="M{x} {y} C{x - 6 * s} {y - 80 * s} {x + 10 * s} {y - 160 * s} {x + 6 * s} {y - 220 * s}" fill="none" stroke="#c9a77e" stroke-width="{12 * s}" stroke-linecap="round"/>')
        cx, cy = x + 6 * s, y - 220 * s
        for a in (-150, -110, -60, -20, 20):
            t = math.radians(a)
            g.append(f'<path d="M{cx:.0f} {cy:.0f} Q{cx + math.cos(t) * 60 * s:.0f} {cy + math.sin(t) * 60 * s - 30 * s:.0f} {cx + math.cos(t) * 110 * s:.0f} {cy + math.sin(t) * 110 * s + 20 * s:.0f} Q{cx + math.cos(t) * 50 * s:.0f} {cy + math.sin(t) * 50 * s:.0f} {cx:.0f} {cy:.0f} Z" fill="#9fcf9a"/>')
    g.append('<path d="M1500 1010 C1520 980 1560 980 1570 1000 C1580 970 1610 975 1615 995 L1640 990 C1652 975 1668 980 1664 996 L1650 1004 L1652 1060 L1640 1060 L1636 1020 L1580 1022 L1576 1060 L1564 1060 L1562 1022 L1530 1024 L1526 1060 L1514 1060 L1512 1024 Z" fill="#d9b48a"/>')   # camel
    return doc(d, ''.join(g))

def amusement():
    """an amusement park: a big Ferris wheel at the right, a carousel tent at the left, bunting, balloons"""
    d, b = sky([(0, '#d4e8f8'), (.6, '#f0f6fb'), (1, '#fbf5ec')])
    g = [b, cloud(760, 190, 110), cloud(1150, 300, 70)]
    g.append(hill(930, 20, '#d5e9c9', 9, n=6))
    cx, cy, R = 1560, 640, 280
    g.append(f'<path d="M{cx - 150} 980 L{cx} {cy} L{cx + 150} 980" fill="none" stroke="#c9b9da" stroke-width="16" stroke-linecap="round"/>')
    g.append(f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="#d9cfe6" stroke-width="10"/><circle cx="{cx}" cy="{cy}" r="{R - 40}" fill="none" stroke="#e6def0" stroke-width="5"/>')
    cols = ['#f6b8c2', '#f6d79a', '#a9d3bb', '#a9c8e6']
    for k in range(12):
        t = k * math.pi / 6; x, y = cx + R * math.cos(t), cy + R * math.sin(t)
        g.append(f'<line x1="{cx}" y1="{cy}" x2="{x:.0f}" y2="{y:.0f}" stroke="#e6def0" stroke-width="5"/>')
        g.append(f'<path d="M{x - 26:.0f} {y + 4:.0f} L{x + 26:.0f} {y + 4:.0f} L{x + 22:.0f} {y + 44:.0f} L{x - 22:.0f} {y + 44:.0f} Z" fill="{cols[k % 4]}"/><path d="M{x - 30:.0f} {y + 6:.0f} C{x - 30:.0f} {y - 14:.0f} {x + 30:.0f} {y - 14:.0f} {x + 30:.0f} {y + 6:.0f} Z" fill="{cols[(k + 1) % 4]}"/><rect x="{x - 14:.0f}" y="{y + 12:.0f}" width="28" height="16" rx="4" fill="#ffffff"/>')
    g.append(f'<circle cx="{cx}" cy="{cy}" r="26" fill="#c9b9da"/>')
    X, Y = 330, 960   # carousel
    g.append(f'<rect x="{X - 210}" y="{Y - 160}" width="420" height="170" fill="#fdf3e6"/><rect x="{X - 220}" y="{Y}" width="440" height="30" rx="10" fill="#f2c8b8"/>')
    for i in range(8):
        x0 = X - 220 + i * 55
        g.append(f'<path d="M{x0} {Y - 160} L{X} {Y - 330} L{x0 + 55} {Y - 160} Z" fill="{["#f6b8c2", "#fdf3e6"][i % 2]}"/><path d="M{x0} {Y - 160} C{x0 + 10} {Y - 128} {x0 + 45} {Y - 128} {x0 + 55} {Y - 160} Z" fill="{["#f6b8c2", "#f6d79a"][i % 2]}"/>')
    g.append(f'<path d="M{X - 8} {Y - 330} L{X + 8} {Y - 330} L{X} {Y - 370} Z" fill="#f6d79a"/><circle cx="{X}" cy="{Y - 376}" r="9" fill="#f6b8c2"/>')
    for x, c in ((X - 140, '#ffffff'), (X - 30, '#f6e0b0'), (X + 90, '#ffffff')):
        g.append(f'<rect x="{x + 28}" y="{Y - 130}" width="5" height="120" fill="#e9c47a"/><path d="M{x} {Y - 50} C{x} {Y - 76} {x + 20} {Y - 82} {x + 44} {Y - 78} C{x + 56} {Y - 92} {x + 70} {Y - 88} {x + 66} {Y - 70} C{x + 66} {Y - 54} {x + 50} {Y - 46} {x + 40} {Y - 46} L{x + 42} {Y - 26} L{x + 34} {Y - 26} L{x + 30} {Y - 44} L{x + 14} {Y - 44} L{x + 12} {Y - 26} L{x + 4} {Y - 26} Z" fill="{c}"/>')
    pts = [(560, 760), (760, 800), (960, 780), (1180, 810)]
    g.append(f'<path d="M560 760 Q660 800 760 800 Q860 800 960 780 Q1070 800 1180 810" fill="none" stroke="#d9cfe6" stroke-width="3"/>')
    for i in range(18):
        x = 580 + i * 34; y = 770 + 20 * math.sin(i / 17 * math.pi * 1.6)
        g.append(f'<path d="M{x} {y} L{x + 22} {y} L{x + 11} {y + 26} Z" fill="{cols[i % 4]}"/>')
    for x, y, c in ((820, 560, '#f6b8c2'), (870, 600, '#a9c8e6'), (790, 620, '#f6d79a')):
        g.append(f'<path d="M{x} {y + 44} C{x + 6} {y + 80} {x - 6} {y + 120} {x + 4} {y + 170}" fill="none" stroke="#c9b9da" stroke-width="2"/><ellipse cx="{x}" cy="{y}" rx="30" ry="36" fill="{c}"/><path d="M{x - 5} {y + 34} L{x + 5} {y + 34} L{x} {y + 44} Z" fill="{c}"/>')
    return doc(d, ''.join(g))

def aquarium():
    """an aquarium tunnel: a deep-turquoise arch of water full of fish, rays of light, sand and seaweed"""
    d = lin('sky', [(0, '#bfe4ec'), (.6, '#d8eff1'), (1, '#eef7f2')]) + lin('ray', [(0, '#ffffff'), (1, '#ffffff00')]) + '<filter id="soft"><feGaussianBlur stdDeviation="18"/></filter>'
    g = [f'<rect width="{VW}" height="{VH}" fill="url(#sky)"/>']
    g.append(''.join(f'<path d="M{x} 0 L{x + w} 0 L{x + w * 2.4} 1200 L{x + w * 1.4} 1200 Z" fill="url(#ray)" opacity=".3" filter="url(#soft)"/>' for x, w in ((200, 60), (560, 40), (1100, 70), (1500, 50))))
    g.append('<path d="M0 1010 C300 980 600 1020 960 1000 C1320 980 1620 1020 1920 1000 L1920 1200 L0 1200 Z" fill="#f4e8cf"/>')
    r = RNG(29)
    for x in (80, 170, 1700, 1800, 1610, 420, 1460):
        h = 200 + r.random() * 160
        g.append(f'<path d="M{x} 1020 C{x - 30} {1020 - h * .3:.0f} {x + 30} {1020 - h * .6:.0f} {x} {1020 - h:.0f}" fill="none" stroke="#9fd0b0" stroke-width="18" stroke-linecap="round"/>')
    for x, y, s, c, f in ((260, 360, 1.3, '#f6c49a', 1), (1540, 300, 1.1, '#f6b8c2', -1), (1700, 560, .9, '#f6d79a', -1), (180, 640, .8, '#a9c8e6', 1), (1360, 700, .7, '#f6c49a', -1), (420, 820, .7, '#f6b8c2', 1)):
        g.append(f'<g transform="translate({x} {y}) scale({s * f} {s})"><path d="M-60 0 C-40 -36 20 -36 40 0 C20 36 -40 36 -60 0 Z" fill="{c}"/><path d="M36 0 L76 -30 L68 0 L76 30 Z" fill="{c}"/><circle cx="-34" cy="-6" r="6" fill="#ffffff"/><circle cx="-34" cy="-6" r="3" fill="#4a5a6a"/><path d="M-12 -24 C-4 -8 -4 8 -12 24" fill="none" stroke="#ffffff" stroke-width="5" opacity=".6"/></g>')
    r2 = RNG(37)   # a school of little fish, and soft corals on the sand
    for k in range(26):   # along a gentle arc, loosely
        t = k / 25; x = 520 + t * 380 + (r2.random() - .5) * 50; y = 600 - math.sin(t * math.pi) * 90 + (r2.random() - .5) * 60
        g.append(f'<g transform="translate({x:.0f} {y:.0f}) scale(.32)"><path d="M-60 0 C-40 -36 20 -36 40 0 C20 36 -40 36 -60 0 Z" fill="#a9c8e6"/><path d="M36 0 L76 -30 L68 0 L76 30 Z" fill="#a9c8e6"/></g>')
    for x, c in ((260, '#f6b8c2'), (370, '#f6d79a'), (1560, '#f6c49a'), (1670, '#d9c8ef')):   # branching corals
        br = [(0, 0, 0, -70), (0, -40, -34, -86), (0, -30, 30, -80), (-20, -62, -40, -110), (18, -58, 34, -104)]
        g.append(''.join(f'<path d="M{x + a} {1018 + b} L{x + c_} {1018 + d_}" stroke="{c}" stroke-width="16" stroke-linecap="round"/>' for a, b, c_, d_ in br))
    g.append('<g transform="translate(1180 470) scale(1.2)"><path d="M0 -46 C20 -40 40 -20 110 -6 C70 8 36 20 14 40 L0 46 L-14 40 C-36 20 -70 8 -110 -6 C-40 -20 -20 -40 0 -46 Z" fill="#c9d6e6"/><path d="M0 44 C4 80 14 110 28 140" fill="none" stroke="#c9d6e6" stroke-width="5" stroke-linecap="round"/><path d="M-14 -40 C-18 -52 -10 -58 -6 -50 M14 -40 C18 -52 10 -58 6 -50" stroke="#c9d6e6" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="-12" cy="-26" r="3.5" fill="#5a6a7a"/><circle cx="12" cy="-26" r="3.5" fill="#5a6a7a"/></g>')   # manta
    g.append(''.join(f'<circle cx="{x}" cy="{y}" r="{s}" fill="none" stroke="#ffffff" stroke-width="3" opacity=".7"/>' for x, y, s in ((320, 260, 10), (340, 220, 7), (330, 190, 5), (1600, 220, 9), (1615, 186, 6), (900, 280, 8), (912, 250, 5))))
    g.append(f'<path d="M0 0 L{VW} 0 L{VW} 130 C1500 80 420 80 0 130 Z" fill="#a9d6e0"/>')   # the tunnel's rim
    return doc(d, ''.join(g))

def library():
    """a cosy library: tall bookshelves at both sides, an arched window with a soft sky, a ladder, plants"""
    d = lin('sky', [(0, '#f6efe4'), (1, '#f3e8d8')]) + lin('win', [(0, '#d6ebf6'), (1, '#f4f8f6')])
    g = [f'<rect width="{VW}" height="{VH}" fill="url(#sky)"/>']
    g.append('<path d="M760 980 L760 380 C760 250 860 190 960 190 C1060 190 1160 250 1160 380 L1160 980 Z" fill="#e8d6bf"/><path d="M790 960 L790 390 C790 280 870 222 960 222 C1050 222 1130 280 1130 390 L1130 960 Z" fill="url(#win)"/>')
    g.append('<rect x="955" y="222" width="10" height="738" fill="#e8d6bf"/><rect x="790" y="560" width="340" height="10" fill="#e8d6bf"/>' + cloud(880, 420, 60) + cloud(1050, 330, 44))
    cols = ['#f2b8a8', '#bcd6ec', '#f6dca0', '#cfe3c6', '#e3cfe9', '#f3c7a0', '#f7f2e6']
    r = RNG(31)
    for x0, x1 in ((0, 680), (1240, 1920)):
        g.append(f'<rect x="{x0}" y="120" width="{x1 - x0}" height="900" fill="#d9bf9c"/>')
        for k in range(6):
            y = 180 + k * 140
            g.append(f'<rect x="{x0}" y="{y + 110}" width="{x1 - x0}" height="16" fill="#c9a77e"/>')
            x = x0 + 20
            while x < x1 - 30:
                w = 18 + r.random() * 16; h = 80 + r.random() * 28; c = cols[int(r.random() * len(cols))]
                if r.random() < .08 and x < x1 - 90:
                    g.append(f'<rect x="{x:.0f}" y="{y + 110 - 26:.0f}" width="70" height="26" rx="3" fill="{c}"/>'); x += 80; continue
                g.append(f'<rect x="{x:.0f}" y="{y + 110 - h:.0f}" width="{w:.0f}" height="{h:.0f}" rx="3" fill="{c}"/><rect x="{x + 3:.0f}" y="{y + 110 - h + 12:.0f}" width="{w - 6:.0f}" height="4" fill="#fbf6ec" opacity=".7"/>')
                x += w + 3
    g.append(f'<rect x="0" y="1020" width="{VW}" height="180" fill="#e3c9a3"/>' + ''.join(f'<rect x="{x}" y="1020" width="4" height="180" fill="#d6b88f"/>' for x in range(0, 1920, 160)))
    g.append('<path d="M560 1020 L640 300 L660 300 L580 1020 Z M640 1020 L720 300 L740 300 L660 1020 Z" fill="#b08a6a"/>' + ''.join(f'<rect x="{570 + k * 9:.0f}" y="{940 - k * 80}" width="90" height="10" fill="#b08a6a" transform="rotate(0)"/>' for k in range(9)))
    g.append('<rect x="1300" y="900" width="70" height="120" rx="10" fill="#f2c8b8"/><path d="M1335 900 C1290 860 1300 800 1335 780 C1370 800 1380 860 1335 900 Z" fill="#9fcf9a"/><path d="M1335 900 C1290 880 1260 840 1270 810 C1310 820 1330 860 1335 900 Z M1335 900 C1380 880 1410 840 1400 810 C1360 820 1340 860 1335 900 Z" fill="#b3dbac"/>')
    return doc(d, ''.join(g))

def train():
    """a train journey: a little steam train crossing a stone viaduct over green hills, smoke puffs, a far town"""
    d, b = sky([(0, '#d2e8f6'), (.6, '#eef6f8'), (1, '#f6f4ea')])
    g = [b, cloud(260, 200, 110), cloud(1500, 160, 120)]
    g.append(hill(720, 60, '#d6e7cf', 41, n=6)); g.append(hill(800, 40, '#c4dfba', 42, n=7))
    g.append(f'<rect x="0" y="1110" width="{VW}" height="90" fill="#b9dbe6"/>' + ''.join(f'<rect x="{x}" y="{y}" width="{w}" height="5" rx="2.5" fill="#d6ecf2"/>' for x, y, w in ((60, 1140, 120), (420, 1170, 90), (900, 1150, 140), (1400, 1175, 110), (1700, 1140, 90))))
    g.append(f'<rect x="0" y="850" width="{VW}" height="20" fill="#d9c3a6"/><rect x="0" y="870" width="{VW}" height="44" fill="#e6d2b6"/>')
    for k in range(9):
        x = -60 + k * 240
        g.append(f'<path d="M{x} 914 L{x + 240} 914 L{x + 240} 1200 L{x + 212} 1200 L{x + 212} 1036 A92 92 0 0 0 {x + 28} 1036 L{x + 28} 1200 L{x} 1200 Z" fill="#e6d2b6"/><path d="M{x + 28} 1036 A92 92 0 0 1 {x + 212} 1036" fill="none" stroke="#d6bf9f" stroke-width="9"/>')
    g.append('<g transform="translate(640 850) scale(1.35) translate(-640 -850)">')
    X = 640
    cars = [(X, '#f2b8a8'), (X + 210, '#bcd6ec'), (X + 400, '#f6dca0'), (X + 590, '#cfe3c6')]
    for x, c in cars[1:]:
        g.append(f'<rect x="{x}" y="760" width="180" height="90" rx="12" fill="{c}"/><rect x="{x - 4}" y="746" width="188" height="18" rx="9" fill="#fbf6ec"/>' + windows(x + 18, 778, 3, 1, 36, 30, 52, 0, '#fbfaf6', 6))
        g.append(f'<circle cx="{x + 40}" cy="852" r="16" fill="#8a95ab"/><circle cx="{x + 140}" cy="852" r="16" fill="#8a95ab"/>')
    x = X - 20
    g.append(f'<rect x="{x}" y="720" width="70" height="130" rx="10" fill="#f2b8a8"/><rect x="{x + 66}" y="770" width="150" height="80" rx="38" fill="#f2b8a8"/><rect x="{x + 170}" y="720" width="26" height="54" rx="6" fill="#e9a596"/><rect x="{x + 162}" y="710" width="42" height="16" rx="6" fill="#e9a596"/>')
    g.append(f'<rect x="{x + 12}" y="740" width="46" height="36" rx="6" fill="#fbfaf6"/><rect x="{x - 6}" y="706" width="82" height="18" rx="8" fill="#e9a596"/>')
    g.append(f'<circle cx="{x + 30}" cy="846" r="26" fill="#8a95ab"/><circle cx="{x + 110}" cy="852" r="18" fill="#8a95ab"/><circle cx="{x + 170}" cy="852" r="18" fill="#8a95ab"/>')
    for i, (dx, dy, s) in enumerate(((190, 670, 34), (230, 620, 44), (290, 580, 54), (370, 560, 60))):
        g.append(cloud(x + dx, dy, s * 1.6))
    g.append('</g>')
    return doc(d, ''.join(g))

def lin(id_, stops, x2=0, y2=1):
    return f'<linearGradient id="{id_}" x1="0" y1="0" x2="{x2}" y2="{y2}">' + ''.join(f'<stop offset="{o}" stop-color="{c[:7]}" stop-opacity="{int(c[7:9], 16) / 255 if len(c) > 7 else 1}"/>' for o, c in stops) + '</linearGradient>'


def savanna():
    """the savanna: a big soft sun, flat-topped acacias, a giraffe family and an elephant on the golden grass"""
    d, b = sky([(0, '#fbe0c2'), (.55, '#fdeedc'), (1, '#fbf1df')])
    g = [b, '<circle cx="980" cy="560" r="160" fill="#fde2a8"/>']
    g.append(hill(760, 24, '#f1d6a8', 51, n=6)); g.append(hill(840, 30, '#ecca95', 52, n=7)); g.append(hill(960, 20, '#e5bf86', 53, n=7))
    def acacia(x, y, s):
        return (f'<path d="M{x} {y} L{x - 6 * s} {y - 150 * s} M{x - 4 * s} {y - 90 * s} L{x + 50 * s} {y - 160 * s} M{x - 5 * s} {y - 120 * s} L{x - 60 * s} {y - 170 * s}" stroke="#9e7a5a" stroke-width="{12 * s}" stroke-linecap="round"/>'
                f'<ellipse cx="{x - 4 * s}" cy="{y - 186 * s}" rx="{150 * s}" ry="{30 * s}" fill="#b7cf92"/><ellipse cx="{x - 30 * s}" cy="{y - 200 * s}" rx="{90 * s}" ry="{20 * s}" fill="#c6d9a2"/>')
    g.append(acacia(260, 980, 1.25) + acacia(1700, 930, 1.0) + acacia(1420, 880, .6))
    def giraffe(x, y, s, flip=1):
        k = lambda v: v * s
        body = (f'<g transform="translate({x} {y}) scale({s * flip} {s})">'
                '<rect x="-46" y="-40" width="10" height="70" rx="5" fill="#f0b46e"/><rect x="-26" y="-40" width="10" height="70" rx="5" fill="#f0b46e"/><rect x="18" y="-40" width="10" height="70" rx="5" fill="#f0b46e"/><rect x="36" y="-40" width="10" height="70" rx="5" fill="#f0b46e"/>'
                '<path d="M-56 -50 C-56 -76 56 -84 56 -50 C56 -30 -56 -26 -56 -50 Z" fill="#f6c27f"/>'
                '<path d="M34 -64 L58 -200 L78 -196 L56 -58 Z" fill="#f6c27f"/><path d="M52 -206 C60 -222 96 -218 100 -204 C100 -192 70 -190 52 -196 Z" fill="#f6c27f"/>'
                '<rect x="60" y="-226" width="5" height="16" rx="2" fill="#c99a6a"/><rect x="70" y="-226" width="5" height="16" rx="2" fill="#c99a6a"/><circle cx="80" cy="-206" r="3" fill="#6a5040"/>'
                + ''.join(f'<path d="M{px} {py} l10 -4 l6 8 l-8 8 l-10 -4 Z" fill="#d38a4e"/>' for px, py in ((-36, -60), (-12, -66), (12, -60), (-24, -46), (2, -48), (28, -50), (48, -96), (54, -130), (60, -164))) + '</g>')
        return body
    g.append(giraffe(1180, 1010, 1.2) + giraffe(1330, 1030, .8))
    g.append('<g transform="translate(640 1040) scale(1.1)"><path d="M-90 -10 C-100 -90 20 -110 70 -70 C110 -40 100 0 80 10 L80 40 L60 40 L58 10 L-20 10 L-22 40 L-42 40 L-44 10 C-70 10 -86 4 -90 -10 Z" fill="#c9c4cf"/>'
             '<path d="M70 -70 C110 -64 124 -30 120 10 C118 28 104 38 96 30 C106 10 104 -20 84 -34 Z" fill="#c9c4cf"/><path d="M40 -76 C60 -96 96 -84 92 -50 C80 -40 54 -46 40 -60 Z" fill="#b9b4c2"/><circle cx="84" cy="-58" r="3.5" fill="#5a5560"/><path d="M-90 -20 C-104 -16 -106 0 -98 4" fill="none" stroke="#c9c4cf" stroke-width="5" stroke-linecap="round"/></g>')
    g.append(''.join(f'<path d="M{x} {y} q6 -24 12 0 q6 -30 12 0 q6 -20 12 0" fill="none" stroke="#d8ad74" stroke-width="4" stroke-linecap="round"/>' for x, y in ((120, 1120), (480, 1150), (900, 1100), (1500, 1140), (1780, 1110), (1040, 1170))))
    return doc(d, ''.join(g))

def antarctic():
    """the Antarctic: ice floes on a calm sea, an iceberg, a family of penguins, a soft polar sky"""
    d, b = sky([(0, '#d9e8f6'), (.55, '#eef4fb'), (1, '#f8fbfe')])
    g = [b, cloud(360, 220, 110, shade='#dde8f3'), cloud(1500, 180, 90, shade='#dde8f3')]
    g.append(f'<rect x="0" y="760" width="{VW}" height="440" fill="#bfdcee"/>')
    g.append('<path d="M1180 780 L1250 560 L1320 620 L1380 500 L1470 640 L1530 600 L1600 780 Z" fill="#f4f9fd"/><path d="M1380 500 L1470 640 L1530 600 L1600 780 L1420 780 Z" fill="#dceaf5"/>')
    g.append('<path d="M1160 780 L1620 780 L1580 820 L1200 820 Z" fill="#a9cfe6" opacity=".7"/>')
    for x, y, w in ((-40, 900, 760), (900, 980, 520), (1500, 1060, 520), (300, 1120, 600)):
        g.append(f'<path d="M{x} {y} L{x + w} {y} L{x + w - 30} {y + 40} L{x + 20} {y + 40} Z" fill="#f6fafd"/><path d="M{x + 20} {y + 40} L{x + w - 30} {y + 40} L{x + w - 40} {y + 56} L{x + 30} {y + 56} Z" fill="#cfe3f1"/>')
    g.append(''.join(f'<rect x="{x}" y="{y}" width="{w}" height="5" rx="2.5" fill="#d8eaf5"/>' for x, y, w in ((760, 860, 120), (1700, 900, 90), (820, 1080, 80), (1000, 1180, 140))))
    def penguin(x, y, s, flip=1):
        return (f'<g transform="translate({x} {y}) scale({s * flip} {s})"><path d="M0 -80 C26 -80 36 -50 36 -20 C36 10 26 30 0 30 C-26 30 -36 10 -36 -20 C-36 -50 -26 -80 0 -80 Z" fill="#5f6a86"/>'
                '<path d="M0 -50 C18 -50 24 -26 24 -6 C24 16 14 26 0 26 C-14 26 -24 16 -24 -6 C-24 -26 -18 -50 0 -50 Z" fill="#fbfcfd"/>'
                '<path d="M-14 -62 C-14 -72 14 -72 14 -62 C14 -52 -14 -52 -14 -62 Z" fill="#fbfcfd" opacity=".9"/><circle cx="-7" cy="-62" r="3" fill="#3a4258"/><circle cx="7" cy="-62" r="3" fill="#3a4258"/>'
                '<path d="M-6 -54 L6 -54 L0 -46 Z" fill="#f6c27e"/><path d="M-36 -24 C-48 -6 -46 10 -40 16 C-36 0 -34 -12 -30 -20 Z M36 -24 C48 -6 46 10 40 16 C36 0 34 -12 30 -20 Z" fill="#5f6a86"/>'
                '<path d="M-16 28 L-4 28 L-6 34 L-20 34 Z M4 28 L16 28 L20 34 L6 34 Z" fill="#f6c27e"/><circle cx="-14" cy="-44" r="4" fill="#f6c2c8" opacity=".7"/><circle cx="14" cy="-44" r="4" fill="#f6c2c8" opacity=".7"/></g>')
    g.append(penguin(300, 868, 1.2) + penguin(420, 880, 1.0, -1) + penguin(360, 890, .6) + penguin(1100, 950, .9) + penguin(1700, 1030, 1.1, -1) + penguin(1610, 1040, .55))
    return doc(d, ''.join(g))

def cappadocia():
    """Cappadocia: fairy chimneys in warm stone and a sky full of hot-air balloons at dawn"""
    d, b = sky([(0, '#f2d9e6'), (.5, '#fbe7dc'), (1, '#fdf0e2')])
    g = [b]
    for x, y, s, c1, c2 in ((1500, 240, 1.0, '#f6b8c2', '#fde3e8'), (1180, 160, .7, '#f6d79a', '#fff0c8'), (1740, 420, .6, '#a9c8e6', '#e1eefa'), (980, 360, .5, '#c9b9ec', '#ebe4fb'), (1340, 470, .42, '#a9d3bb', '#e2f2e8'), (220, 300, .55, '#f6c49a', '#fde6d4'), (420, 180, .38, '#f6b8c2', '#fde3e8'), (660, 420, .32, '#a9c8e6', '#e1eefa')):
        g.append(f'<g transform="translate({x} {y}) scale({s})"><path d="M-90 0 C-90 -70 90 -70 90 0 C90 50 40 80 26 110 L-26 110 C-40 80 -90 50 -90 0 Z" fill="{c1}"/>'
                 f'<path d="M-30 -52 C-30 -10 -16 70 -10 110 L10 110 C16 70 30 -10 30 -52 C20 -60 -20 -60 -30 -52 Z" fill="{c2}"/>'
                 f'<path d="M-24 110 L-20 140 M24 110 L20 140" stroke="#b08a6a" stroke-width="3"/><rect x="-24" y="138" width="48" height="30" rx="5" fill="#c9a07a"/></g>')
    g.append(hill(840, 40, '#efcfae', 61, n=6))
    r = RNG(63)
    for x in range(-40, 1980, 110):   # fairy chimneys: cones with a cap, little doorways
        h = 160 + r.random() * 200; w = 80 + r.random() * 40; base = 1010 + r.random() * 30
        c = ['#f0cfac', '#ecc49e', '#f3d8b8'][int(r.random() * 3)]
        g.append(f'<path d="M{x - w / 2:.0f} {base:.0f} C{x - w * .3:.0f} {base - h * .6:.0f} {x - w * .16:.0f} {base - h:.0f} {x:.0f} {base - h:.0f} C{x + w * .16:.0f} {base - h:.0f} {x + w * .3:.0f} {base - h * .6:.0f} {x + w / 2:.0f} {base:.0f} Z" fill="{c}"/>')
        g.append(f'<ellipse cx="{x:.0f}" cy="{base - h - 6:.0f}" rx="{w * .26:.0f}" ry="{w * .12:.0f}" fill="#c9a07a"/>')
        if r.random() < .6: g.append(f'<path d="M{x - 8:.0f} {base - h * .35:.0f} L{x - 8:.0f} {base - h * .35 - 20:.0f} A8 8 0 0 1 {x + 8:.0f} {base - h * .35 - 20:.0f} L{x + 8:.0f} {base - h * .35:.0f} Z" fill="#c99a7a"/>')
    g.append(f'<rect x="0" y="1060" width="{VW}" height="140" fill="#e9c9a2"/>')
    return doc(d, ''.join(g))

def mexico():
    """a Mexican plaza: papel picado banners across the top edge, colourful houses, a cactus garden"""
    d, b = sky([(0, '#d4ebf8'), (.6, '#f1f7fb'), (1, '#fbf3e6')])
    g = [b, cloud(980, 340, 90)]
    cols = ['#f6b8c2', '#a9d3bb', '#f6d79a', '#a9c8e6', '#d9c8ef', '#f6c49a']
    for row, (y0, amp) in enumerate(((40, 40), (150, 50))):   # papel picado: cut-paper flags on strings
        g.append(f'<path d="M-20 {y0} Q480 {y0 + amp} 960 {y0} Q1440 {y0 + amp} 1940 {y0}" fill="none" stroke="#c9b9a6" stroke-width="2"/>')
        for i in range(22):
            t = i / 21; x = t * 1920; y = y0 + amp * 4 * ((t * 2) % 1) * (1 - (t * 2) % 1)
            c = cols[(i + row) % 6]
            g.append(f'<path d="M{x - 30:.0f} {y:.0f} L{x + 30:.0f} {y:.0f} L{x + 30:.0f} {y + 54:.0f} L{x + 20:.0f} {y + 64:.0f} L{x + 10:.0f} {y + 54:.0f} L{x:.0f} {y + 64:.0f} L{x - 10:.0f} {y + 54:.0f} L{x - 20:.0f} {y + 64:.0f} L{x - 30:.0f} {y + 54:.0f} Z" fill="{c}"/>'
                     f'<circle cx="{x:.0f}" cy="{y + 24:.0f}" r="9" fill="#fbf6ee"/><path d="M{x - 20:.0f} {y + 12:.0f} l6 6 l-6 6 l-6 -6 Z M{x + 20:.0f} {y + 12:.0f} l6 6 l-6 6 l-6 -6 Z" fill="#fbf6ee"/>')
    x = -20; r = RNG(71)
    while x < 1940:
        w = 170 + r.random() * 80; h = 230 + r.random() * 120; c = cols[int(r.random() * 6)]; top = 1000 - h
        g.append(f'<rect x="{x:.0f}" y="{top:.0f}" width="{w:.0f}" height="{h + 40:.0f}" fill="{c}"/><rect x="{x - 6:.0f}" y="{top - 14:.0f}" width="{w + 12:.0f}" height="18" fill="#fbf6ee"/>')
        g.append(f'<path d="M{x + w / 2 - 26:.0f} 1000 L{x + w / 2 - 26:.0f} {1000 - 80:.0f} A26 26 0 0 1 {x + w / 2 + 26:.0f} {1000 - 80:.0f} L{x + w / 2 + 26:.0f} 1000 Z" fill="#fbf6ee" opacity=".9"/>')
        g.append(windows(x + 26, top + 40, 2, max(1, int((h - 140) // 90)), 34, 46, w - 86, 90, '#fbf6ee', 17))
        if r.random() < .6: g.append(''.join(f'<circle cx="{x + 30 + k * 26:.0f}" cy="{top + 34:.0f}" r="9" fill="#f2a5b0"/>' for k in range(int((w - 40) // 26))))
        x += w + 2
    g.append(f'<rect x="0" y="1000" width="{VW}" height="200" fill="#f1dcc0"/>' + ''.join(f'<rect x="{x}" y="1000" width="3" height="200" fill="#e6caa6"/>' for x in range(0, 1920, 120)))
    for x, s in ((180, 1.1), (1720, 1.0), (1560, .7)):
        g.append(f'<g transform="translate({x} 1110) scale({s})"><rect x="-22" y="-160" width="44" height="170" rx="22" fill="#9fcf9a"/><path d="M-22 -80 L-56 -80 C-66 -80 -70 -90 -70 -100 L-70 -130 C-70 -146 -50 -146 -50 -130 L-50 -100 L-22 -100 Z M22 -60 L54 -60 C64 -60 68 -70 68 -80 L68 -116 C68 -132 48 -132 48 -116 L48 -80 L22 -80 Z" fill="#9fcf9a"/>'
                 f'<circle cx="0" cy="-166" r="10" fill="#f6b8c2"/><path d="M-40 10 L40 10 L32 50 L-32 50 Z" fill="#e9a58a"/></g>')
    return doc(d, ''.join(g))

SSR2 = {'s79': paris, 's80': venice, 's81': santorini, 's82': kyoto, 's83': nordic_harbor, 's84': egypt, 's85': amusement,
        's86': aquarium, 's87': library, 's88': train, 's96': savanna, 's97': antarctic, 's98': cappadocia, 's99': mexico}

if __name__ == '__main__':
    ids = sys.argv[1:] or list(SSR2)
    imgs = render([(SSR2[i](), OW, OH) for i in ids])
    for i, im in zip(ids, imgs):
        save(i, finish(im, int(i[1:])), 'cover', q=80)

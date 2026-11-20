#!/usr/bin/env python3
"""Portal skins: three new URs (2026-11-20, replacing オパール・ステンドグラス・万華鏡):
s40 天灯まつり (sky lanterns rise over a lakeside town at dusk), s89 雲海の夜明け (dawn over a sea of clouds),
s90 夜光の海 (a night beach where the waves glow, a lighthouse sweeping its beam).
Softer than the picture-book scenes: blurred glows, haze and gradients so they do not read as flat vector art.
What moves (lanterns, clouds, waves, the beam, sparkles) is drawn by the page (atlas/skins-fx.js).
Run from the repo root: python3 atlas/tools/skins_ur3.py [id …]"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from skins import RNG, save
from skins_ssr2 import doc, lin, smooth_path, render, finish, VW, VH, OW, OH, TALL

BLUR = ''.join(f'<filter id="b{s}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="{s}"/></filter>' for s in (2, 4, 8, 16, 30, 60))

def ridge(y, amp, seed, n=7, bottom=VH):
    r = RNG(seed); pts = [(-80 + i * (VW + 160) / (n - 1), y + (r.random() - .5) * 2 * amp) for i in range(n)]
    return smooth_path(pts, bottom)

def stars(n, seed, y0, y1, col='#fff6e6', big=.04):
    r = RNG(seed); out = []
    for _ in range(n):
        x, y = r.random() * VW, y0 + r.random() * (y1 - y0); s = .5 + r.random() ** 3 * 1.8; o = .25 + r.random() * .6
        out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{s:.1f}" fill="{col}" opacity="{o:.2f}"/>')
        if r.random() < big: out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{s * 5:.1f}" fill="{col}" opacity=".18" filter="url(#b4)"/>')
    return ''.join(out)

def lanterns():
    """天灯まつり: dusk turning to night, far misty mountains, a lakeside town with warm windows, its lights in the water"""
    d = BLUR + lin('sky', [(0, '#12122f'), (.38, '#262252'), (.62, '#55366c'), (.74, '#a35a7a'), (.8, '#e48a7c')]) + lin('lake', [(0, '#3c2a58'), (1, '#171633')])
    g = [f'<rect width="{VW}" height="{VH}" fill="url(#sky)"/>', stars(220, 401, 0, 640)]
    g.append('<ellipse cx="1100" cy="860" rx="900" ry="140" fill="#ffb38a" opacity=".35" filter="url(#b60)"/>')
    g.append(f'<path d="{ridge(790, 50, 402, 8)}" fill="#6a4374" opacity=".85" filter="url(#b4)"/>')
    g.append('<rect x="0" y="800" width="1920" height="80" fill="#a2607e" opacity=".35" filter="url(#b30)"/>')
    g.append(f'<path d="{ridge(860, 34, 403, 9)}" fill="#3d2b55" filter="url(#b2)"/>')
    # the town: roofs along the shore, warm windows with a glow
    r = RNG(404); roofs = []; wins = []; x = 120
    while x < 1820:
        w = 70 + r.random() * 70; h = 40 + r.random() * 60; base = 968; top = base - h
        roofs.append(f'<rect x="{x:.0f}" y="{top:.0f}" width="{w:.0f}" height="{h + 4:.0f}"/><path d="M{x - 10:.0f} {top + 4:.0f} Q{x + w / 2:.0f} {top - 34:.0f} {x + w + 10:.0f} {top + 4:.0f} Z"/>')
        for k in range(int(w // 34)):
            if r.random() < .75: wins.append((x + 12 + k * 34, top + 14 + r.random() * (h - 30)))
        x += w + 8 + (r.random() < .15) * 120
    g.append(f'<g fill="#1f1736">{"".join(roofs)}</g>')
    g.append(''.join(f'<circle cx="{a + 6:.0f}" cy="{b + 7:.0f}" r="22" fill="#ffb86a" opacity=".35" filter="url(#b8)"/>' for a, b in wins))
    g.append(''.join(f'<rect x="{a:.0f}" y="{b:.0f}" width="12" height="14" rx="2" fill="#ffd79a"/>' for a, b in wins))
    g.append('<rect x="0" y="968" width="1920" height="232" fill="url(#lake)"/>')
    g.append(''.join(f'<rect x="{a - 2:.0f}" y="{980 + (1000 - b) * .15 + 6:.0f}" width="16" height="{40 + (b % 30):.0f}" fill="#ffc98a" opacity=".45" filter="url(#b4)"/>' for a, b in wins))
    g.append('<rect x="0" y="962" width="1920" height="10" fill="#ffcf9a" opacity=".25" filter="url(#b4)"/>')
    return doc(d, ''.join(g))

def cloud_dawn():
    """雲海の夜明け: the sun rising behind mountain peaks that stand out of a sea of clouds"""
    d = BLUR + lin('sky', [(0, '#3d3c7c'), (.3, '#7a6aa8'), (.52, '#d996ae'), (.66, '#fcc39e'), (.74, '#ffe2b0')]) + \
        lin('pk', [(0, '#7d78a8'), (1, '#4e4d82')]) + lin('pk2', [(0, '#9a8fb8'), (1, '#6e6a9c')])
    g = [f'<rect width="{VW}" height="{VH}" fill="url(#sky)"/>', stars(70, 891, 0, 300, '#fff6e6', 0)]
    g.append('<circle cx="1180" cy="820" r="420" fill="#ffe7b0" opacity=".45" filter="url(#b60)"/><circle cx="1180" cy="820" r="150" fill="#fff1c8" opacity=".8" filter="url(#b16)"/><circle cx="1180" cy="820" r="92" fill="#fff8e2"/>')
    # far peaks (hazy), near peaks with a lit side and snow
    for (px, py, w, col, blur) in ((300, 600, 520, '#a597c0', 'b4'), (1640, 560, 600, '#a597c0', 'b4'), (900, 640, 420, '#b4a6c8', 'b8')):
        g.append(f'<path d="M{px - w / 2:.0f} 900 L{px - w * .12:.0f} {py + 40:.0f} L{px:.0f} {py:.0f} L{px + w * .14:.0f} {py + 50:.0f} L{px + w / 2:.0f} 900 Z" fill="{col}" opacity=".8" filter="url(#{blur})"/>')
    for (px, py, w, sd) in ((520, 470, 760, 1), (1560, 420, 820, 2)):
        L, R = px - w / 2, px + w / 2
        mt = f'M{L:.0f} 960 C{L + w * .2:.0f} 760 {px - w * .1:.0f} {py + 60:.0f} {px:.0f} {py:.0f} C{px + w * .12:.0f} {py + 70:.0f} {R - w * .2:.0f} 760 {R:.0f} 960 Z'
        g.append(f'<clipPath id="mk{sd}"><path d="{mt}"/></clipPath><path d="{mt}" fill="url(#pk)"/>')
        g.append(f'<g clip-path="url(#mk{sd})">'   # the lit side and the snow cap are cut by the mountain's own outline (no edges sticking out)
                 f'<path d="M{px:.0f} {py - 10:.0f} L{px + 14:.0f} {py + 120:.0f} C{px + w * .1:.0f} 800 {px + w * .12:.0f} 900 {px + w * .1:.0f} 980 L{R + 40:.0f} 980 L{R + 40:.0f} {py - 10:.0f} Z" fill="#c6a8c4" opacity=".5"/>'
                 f'<path d="M{L:.0f} {py - 20:.0f} L{R:.0f} {py - 20:.0f} L{R:.0f} {py + 92:.0f} C{px + 60:.0f} {py + 112:.0f} {px + 40:.0f} {py + 74:.0f} {px + 18:.0f} {py + 96:.0f} C{px:.0f} {py + 112:.0f} {px - 20:.0f} {py + 80:.0f} {px - 40:.0f} {py + 102:.0f} C{px - 60:.0f} {py + 116:.0f} {px - 80:.0f} {py + 96:.0f} {L:.0f} {py + 100:.0f} Z" fill="#fbeef2" opacity=".96"/></g>')
    # the sea of clouds: layered soft billows, lit pink-gold toward the sun
    r = RNG(893)
    for y, col, op, n, s in ((820, '#e9c7d8', .9, 14, 120), (880, '#f4d9e0', .95, 16, 130), (960, '#fbe8e6', 1, 18, 140), (1060, '#fff3ec', 1, 18, 150)):
        blobs = ''.join(f'<ellipse cx="{r.random() * 2100 - 90:.0f}" cy="{y + r.random() * 40:.0f}" rx="{s * (1 + r.random()):.0f}" ry="{s * .45 * (1 + r.random() * .6):.0f}"/>' for _ in range(n))
        g.append(f'<g fill="{col}" opacity="{op}" filter="url(#b16)">{blobs}<rect x="-100" y="{y + 30}" width="2120" height="{VH - y + 40}"/></g>')
    g.append('<ellipse cx="1180" cy="900" rx="700" ry="90" fill="#fff0c8" opacity=".55" filter="url(#b30)"/>')
    return doc(d, ''.join(g))

def glow_sea():
    """夜光の海: a starry night, the sea to the horizon, a lighthouse on the headland, a cove where the waves glow blue"""
    d = BLUR + lin('sky', [(0, '#070c22'), (.45, '#10204a'), (.62, '#1c3664')]) + lin('sea', [(0, '#16305c'), (.4, '#0f2448'), (1, '#0a1834')]) + \
        '<radialGradient id="mw" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#cfe0ff" stop-opacity=".35"/><stop offset=".6" stop-color="#9ab4ee" stop-opacity=".12"/><stop offset="1" stop-color="#9ab4ee" stop-opacity="0"/></radialGradient>'
    g = [f'<rect width="{VW}" height="{VH}" fill="url(#sky)"/>', '<ellipse cx="1100" cy="300" rx="1250" ry="180" transform="rotate(14 1100 300)" fill="url(#mw)" filter="url(#b16)"/>', stars(380, 901, 0, 720, '#eef4ff', .06)]
    g.append('<rect x="0" y="744" width="1920" height="456" fill="url(#sea)"/><rect x="0" y="736" width="1920" height="16" fill="#3a5a8e" opacity=".5" filter="url(#b4)"/>')
    g.append('<ellipse cx="1100" cy="760" rx="600" ry="16" fill="#9ab4ee" opacity=".25" filter="url(#b8)"/>')
    # headland + lighthouse (left)
    g.append('<path d="M-40 1200 L-40 700 C80 690 200 720 300 780 C380 830 420 900 520 960 C600 1010 640 1080 700 1200 Z" fill="#0b1328"/>')
    g.append('<path d="M196 712 L232 712 L240 830 L188 830 Z" fill="#dfe6f2"/><rect x="190" y="740" width="48" height="16" fill="#c96a6a"/><rect x="186" y="790" width="56" height="16" fill="#c96a6a"/><rect x="198" y="684" width="32" height="28" rx="4" fill="#ffe9b0"/><path d="M192 686 L214 664 L236 686 Z" fill="#2a3456"/>')
    g.append('<circle cx="214" cy="698" r="60" fill="#ffe9b0" opacity=".35" filter="url(#b16)"/>')
    # the cove: sand curving in from the right; a dim glow along the waterline (the bright one is the page's)
    g.append('<path d="M560 1200 C760 1110 1060 1060 1400 1050 C1640 1044 1820 1020 1960 990 L1960 1200 Z" fill="#232a44"/>')
    g.append('<path d="M560 1200 C760 1110 1060 1060 1400 1050 C1640 1044 1820 1020 1960 990" stroke="#5fd8ff" stroke-width="10" fill="none" opacity=".35" filter="url(#b8)"/>')
    r = RNG(902)
    g.append(''.join(f'<circle cx="{r.random() * 1920:.0f}" cy="{760 + r.random() ** 2 * 300:.0f}" r="{1 + r.random() * 2:.1f}" fill="#8fe6ff" opacity="{.2 + r.random() * .4:.2f}"/>' for _ in range(120)))
    return doc(d, ''.join(g))

UR3 = {'s40': lanterns, 's89': cloud_dawn, 's90': glow_sea}
TOPS = {'s40': '#12122f', 's89': '#3d3c7c', 's90': '#070c22'}

def tall_extra(i):
    return stars(500, 410 + int(i[1:]), -1800, 0, '#fff6e6', .05)

if __name__ == '__main__':
    ids = [a for a in sys.argv[1:] if a in UR3] or list(UR3)
    for i, im in zip(ids, render([(UR3[i](), OW, OH) for i in ids])):
        save(i, finish(im, int(i[1:])), 'cover', q=82)

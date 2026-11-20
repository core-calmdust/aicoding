#!/usr/bin/env python3
"""Portal skins s59–s78 (SR, remade 2026-11-20): flat, pale motif patterns drawn as SVG (smooth curves), rendered by
headless Chrome (atlas/tools/svgrender.js), then given the same faint paper grain as the other tiles.
Layout: a half-drop grid (even, designed spacing), small jitter and tilt, variants cycling — like printed fabric.
Each motif is drawn in a box of about ±50 units round 0,0. Run from the repo root: python3 atlas/tools/skins_sr2.py [id …]"""
import sys, os, math, json, subprocess, tempfile
sys.path.insert(0, os.path.dirname(__file__))
from skins import *   # noqa

T = 1024
FONT = "'Noto Serif CJK JP','Noto Serif CJK SC',serif"

def svg_doc(body, bg, w=T, h=T):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><rect width="{w}" height="{h}" fill="{bg}"/>{body}</svg>'

def render(jobs):
    """jobs: [(svg_text, w, h)] → list of float images"""
    tmp = tempfile.mkdtemp(); spec = []
    for i, (svg, w, h) in enumerate(jobs):
        p = os.path.join(tmp, f'{i}.svg'); open(p, 'w').write(svg); spec.append({'svg': p, 'out': os.path.join(tmp, f'{i}.png'), 'w': w, 'h': h})
    js = os.path.join(tmp, 'jobs.json'); json.dump(spec, open(js, 'w'))
    subprocess.run(['node', os.path.join(os.path.dirname(__file__), 'svgrender.js'), js], check=True)
    return [np.asarray(Image.open(s['out']).convert('RGB'), np.float32) / 255 for s in spec]

def layout(motifs, cols, rows, seed, scale=1.0, jitter=.12, tilt=14, flip=False):
    """half-drop grid over the tile; motifs = list of functions(i) → svg group (cycled); copies at the edges for seamlessness"""
    r = RNG(seed); cw, rh = T / cols, T / rows; out = []
    nv = 12; grid = {}
    for j in range(rows):
        for i in range(cols):
            bad = {grid.get(((i - 1) % cols, j)), grid.get((i, (j - 1) % rows)), grid.get(((i + 1) % cols, j)), grid.get((i, (j + 1) % rows))}
            ch = [v for v in range(nv) if v not in bad]; grid[(i, j)] = ch[int(r.random() * len(ch))]
    for j in range(rows):
        for i in range(cols):
            x = (i + .5) * cw + (r.random() - .5) * jitter * cw
            y = (j + .5 + (.5 if i % 2 else 0)) * rh + (r.random() - .5) * jitter * rh
            a = (r.random() - .5) * 2 * tilt; s = scale * (0.92 + r.random() * .16)
            g = motifs[0](grid[(i, j)])
            sx = -1 if flip and r.random() < .5 else 1
            for ox in (-T, 0, T):
                for oy in (-T, 0, T):
                    X, Y = x + ox, y + oy
                    if -120 < X < T + 120 and -120 < Y < T + 120:
                        out.append(f'<g transform="translate({X:.1f} {Y:.1f}) rotate({a:.1f}) scale({s * sx:.3f} {s:.3f})">{g}</g>')
    return ''.join(out)

def finish(img, seed, paper=.016):
    n = img.shape[0]
    img = img * (1 - paper / 2 + paper * fnoise(n, 2.4, seed, m=img.shape[1]))[..., None]
    return grain(img, .004, seed)

# ---------------------------------------------------------------- motifs (±50 units)
def mahjong(kind):
    face = '<rect x="-26" y="-36" width="52" height="72" rx="9" fill="#fbf7ee"/><rect x="-26" y="26" width="52" height="10" rx="5" fill="#cfe3d6"/><rect x="-26" y="-36" width="52" height="66" rx="9" fill="#fffdf8"/>'
    if kind == 0:   # 中
        sym = f'<text x="0" y="13" text-anchor="middle" font-family="{FONT}" font-weight="700" font-size="40" fill="#e8a3a8">中</text>'
    elif kind == 1:   # 2 pin
        sym = '<circle cx="0" cy="-14" r="10" fill="none" stroke="#a9c8e6" stroke-width="5"/><circle cx="0" cy="14" r="10" fill="none" stroke="#a9d3bb" stroke-width="5"/><circle cx="0" cy="-14" r="3" fill="#e8a3a8"/><circle cx="0" cy="14" r="3" fill="#e8a3a8"/>'
    elif kind == 2:   # 3 sou
        sym = ''.join(f'<rect x="{x - 3.5}" y="{y - 10}" width="7" height="20" rx="3.5" fill="#a9d3bb"/><rect x="{x - 4.5}" y="{y - 1.5}" width="9" height="3" rx="1.5" fill="#8fc2a5"/>' for x, y in ((0, -14), (-9, 12), (9, 12)))
    else:   # 東
        sym = f'<text x="0" y="13" text-anchor="middle" font-family="{FONT}" font-weight="700" font-size="38" fill="#9db6cf">東</text>'
    return face + sym

def shogi_piece(ch, col):
    return (f'<path d="M0 -40 L24 -28 L32 38 L-32 38 L-24 -28 Z" fill="#f4e2bd" stroke="#ecd3a2" stroke-width="3" stroke-linejoin="round"/>'
            f'<text x="0" y="16" text-anchor="middle" font-family="{FONT}" font-weight="700" font-size="34" fill="{col}">{ch}</text>')

def puzzle_piece(col, dark):
    d = ('M-28 -28 L-8 -28 C-10 -36 -6 -44 0 -44 C6 -44 10 -36 8 -28 L28 -28 L28 -8 C36 -10 44 -6 44 0 C44 6 36 10 28 8 '
         'L28 28 L8 28 C10 20 6 12 0 12 C-6 12 -10 20 -8 28 L-28 28 L-28 8 C-20 10 -12 6 -12 0 C-12 -6 -20 -10 -28 -8 Z')
    return f'<path d="{d}" fill="{col}"/><path d="M-28 22 L28 22 L28 28 L8 28 C9 25 9 22 8 22 M-8 22 C-9 22 -9 25 -8 28 L-28 28 Z" fill="{dark}" opacity=".5"/>'

def block(kind, c1, c2, c3):
    if kind == 0:   # cube (iso)
        return (f'<path d="M0 -34 L30 -17 L0 0 L-30 -17 Z" fill="{c1}"/><path d="M-30 -17 L0 0 L0 34 L-30 17 Z" fill="{c2}"/><path d="M30 -17 L0 0 L0 34 L30 17 Z" fill="{c3}"/>')
    if kind == 1:   # cylinder
        return (f'<path d="M-24 -20 L-24 22 A24 10 0 0 0 24 22 L24 -20 Z" fill="{c2}"/><path d="M0 -20 L24 -20 L24 22 A24 10 0 0 1 0 32 Z" fill="{c3}"/><ellipse cx="0" cy="-20" rx="24" ry="10" fill="{c1}"/>')
    return (f'<path d="M0 -34 L28 26 L0 36 Z" fill="{c3}"/><path d="M0 -34 L-28 26 L0 36 Z" fill="{c2}"/>')   # triangular prism

def crane(c1, c2):
    """origami crane, side view: a diamond body, two raised wings, a slim neck with the head folded down, a slim tail"""
    return (f'<path d="M-14 6 L0 -2 L14 6 L0 16 Z" fill="{c2}"/>'                                   # body
            f'<path d="M-14 6 L-2 -40 L4 -2 Z" fill="{c1}"/><path d="M14 6 L6 -34 L0 -2 Z" fill="{c2}" opacity=".85"/>'   # wings
            f'<path d="M14 6 L40 -22 L36 -22 L12 2 Z" fill="{c1}"/><path d="M40 -22 L46 -14 L37 -21 Z" fill="{c2}"/>'   # neck + head
            f'<path d="M-14 6 L-42 -20 L-38 -21 L-10 2 Z" fill="{c1}"/>'                          # tail
            f'<path d="M-14 6 L0 16 L0 -2 Z" fill="{c1}" opacity=".55"/>')

def daruma(body, face, line):
    return (f'<path d="M0 -40 C24 -40 36 -20 36 4 C36 28 20 40 0 40 C-20 40 -36 28 -36 4 C-36 -20 -24 -40 0 -40 Z" fill="{body}"/>'
            f'<ellipse cx="0" cy="-6" rx="20" ry="18" fill="{face}"/>'
            f'<circle cx="-8" cy="-8" r="2.6" fill="{line}"/><circle cx="8" cy="-8" r="2.6" fill="{line}"/>'
            f'<path d="M-17 -16 Q-10 -23 -3 -17 M3 -17 Q10 -23 17 -16" fill="none" stroke="{line}" stroke-width="3.2" stroke-linecap="round"/>'
            f'<path d="M-9 1 Q-4 -2 0 1 Q4 -2 9 1" fill="none" stroke="{line}" stroke-width="2.4" stroke-linecap="round"/>'
            f'<path d="M-4 6 Q0 9 4 6" fill="none" stroke="{line}" stroke-width="1.8" stroke-linecap="round"/>'
            f'<path d="M-18 24 Q0 18 18 24" fill="none" stroke="{face}" stroke-width="3" stroke-linecap="round" opacity=".7"/>')

def matryoshka(body, scarf, accent):
    return (f'<path d="M0 -42 C14 -42 20 -32 20 -22 C30 -12 34 6 34 18 C34 34 20 42 0 42 C-20 42 -34 34 -34 18 C-34 6 -30 -12 -20 -22 C-20 -32 -14 -42 0 -42 Z" fill="{body}"/>'
            f'<path d="M0 -38 C12 -38 17 -29 17 -20 C17 -10 9 -4 0 -4 C-9 -4 -17 -10 -17 -20 C-17 -29 -12 -38 0 -38 Z" fill="{scarf}"/>'
            f'<ellipse cx="0" cy="-20" rx="11" ry="12" fill="#fff7ef"/><circle cx="-4.5" cy="-21" r="1.8" fill="#6b5a5a"/><circle cx="4.5" cy="-21" r="1.8" fill="#6b5a5a"/>'
            f'<circle cx="-7" cy="-15" r="2.6" fill="#f6b9c0"/><circle cx="7" cy="-15" r="2.6" fill="#f6b9c0"/><path d="M-2.5 -14 Q0 -12 2.5 -14" fill="none" stroke="#c9707a" stroke-width="1.4" stroke-linecap="round"/>'
            f'<ellipse cx="0" cy="18" rx="17" ry="15" fill="#fff7ef"/>'
            f'<circle cx="0" cy="17" r="7" fill="{accent}"/>' + ''.join(f'<ellipse cx="{6 * math.cos(t):.1f}" cy="{17 + 6 * math.sin(t):.1f}" rx="5.5" ry="3.2" transform="rotate({math.degrees(t):.0f} {6 * math.cos(t):.1f} {17 + 6 * math.sin(t):.1f})" fill="{accent}" opacity=".55"/>' for t in [k * math.pi / 3 for k in range(6)]))

def nordic_flower(petal, center, leaf):
    petals = ''.join(f'<path d="M0 0 C-9 -10 -8 -26 0 -32 C8 -26 9 -10 0 0 Z" transform="rotate({a})" fill="{petal}"/>' for a in range(0, 360, 60))
    return (f'<path d="M0 6 C2 20 0 32 -2 46" fill="none" stroke="{leaf}" stroke-width="3.5" stroke-linecap="round"/>'
            f'<path d="M-1 30 C-14 22 -26 26 -30 34 C-20 38 -8 36 -1 30 Z" fill="{leaf}"/><path d="M0 22 C12 14 24 18 28 26 C18 30 6 28 0 22 Z" fill="{leaf}"/>'
            f'{petals}<circle r="9" fill="{center}"/><circle r="4" fill="#fffaf2"/>')

def goldfish(body, fin):
    return (f'<path d="M14 0 C30 -18 46 -16 46 -16 C40 -6 40 6 46 16 C46 16 30 18 14 0 Z" fill="{fin}"/>'
            f'<path d="M-30 0 C-30 -16 -14 -22 2 -18 C14 -14 20 -6 20 0 C20 6 14 14 2 18 C-14 22 -30 16 -30 0 Z" fill="{body}"/>'
            f'<path d="M-6 -18 C0 -30 12 -30 14 -22 C6 -20 0 -18 -6 -18 Z" fill="{fin}"/>'
            f'<circle cx="-18" cy="-4" r="3.6" fill="#fffaf5"/><circle cx="-18" cy="-4" r="1.8" fill="#6b5250"/>'
            f'<path d="M-2 4 C4 10 4 16 -2 22" fill="none" stroke="{fin}" stroke-width="3" stroke-linecap="round"/>')

def macaron(top, cream):
    foot = lambda y: ''.join(f'<circle cx="{x}" cy="{y}" r="3" fill="{top}"/>' for x in range(-26, 28, 6))
    return '<g transform="scale(1.2)">' + (f'<path d="M-30 -6 C-30 -24 30 -24 30 -6 Z" fill="{top}"/>{foot(-5)}'
            f'<rect x="-27" y="-4" width="54" height="9" rx="4.5" fill="{cream}"/>'
            f'{foot(6)}<path d="M-30 6 L30 6 C30 20 -30 20 -30 6 Z" fill="{top}"/>'
            f'<path d="M-18 -16 C-10 -19 -2 -19 6 -18" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".5"/>') + '</g>'

def donut(dough, icing, spr):
    sprinkles = ''.join(f'<rect x="{12 * math.cos(t) * 1.6:.1f}" y="{12 * math.sin(t) * 1.6:.1f}" width="7" height="2.6" rx="1.3" fill="{c}" transform="rotate({math.degrees(t) * 2:.0f} {12 * math.cos(t) * 1.6:.1f} {12 * math.sin(t) * 1.6:.1f})"/>'
                        for t, c in zip([k * 2 * math.pi / 9 + .3 for k in range(9)], spr * 3))
    return (f'<circle r="34" fill="{dough}"/><path d="M0 -30 C18 -30 30 -18 30 -2 C30 4 26 2 24 8 C20 16 14 12 10 18 C4 24 -4 20 -10 24 C-18 26 -22 18 -28 12 C-32 4 -30 -6 -30 -6 C-28 -20 -16 -30 0 -30 Z" fill="{icing}"/>'
            f'<circle r="11" fill="#fbf8f2"/>{sprinkles}')

def paper_plane(c1, c2):
    return (f'<path d="M-40 4 L40 -26 L-6 14 Z" fill="{c1}"/><path d="M-6 14 L40 -26 L4 30 Z" fill="{c2}"/><path d="M-6 14 L-2 30 L4 30 Z" fill="{c2}"/>')

def travel(kind, a, b, c):
    if kind == 0:   # suitcase
        return (f'<rect x="-14" y="-36" width="28" height="12" rx="6" fill="none" stroke="{c}" stroke-width="5"/><rect x="-34" y="-26" width="68" height="52" rx="10" fill="{a}"/>'
                f'<rect x="-34" y="-6" width="68" height="8" fill="{b}"/><circle cx="-18" cy="-14" r="5" fill="{b}"/><rect x="10" y="8" width="14" height="10" rx="3" fill="{b}"/>')
    if kind == 1:   # globe
        return (f'<path d="M0 34 L0 44 M-16 44 L16 44" stroke="{c}" stroke-width="5" stroke-linecap="round"/><path d="M-34 -6 A34 34 0 0 0 30 18" fill="none" stroke="{c}" stroke-width="4" stroke-linecap="round"/>'
                f'<circle cx="0" cy="-6" r="28" fill="{a}"/><path d="M-12 -28 C-2 -20 -18 -14 -10 -6 C-2 2 -16 8 -18 14 C-26 6 -28 -12 -12 -28 Z M8 -18 C16 -20 22 -12 18 -6 C14 0 20 6 14 12 C8 8 10 0 4 -4 C0 -8 2 -14 8 -18 Z" fill="{b}"/>')
    if kind == 2:   # compass
        return (f'<circle r="32" fill="{a}"/><circle r="25" fill="#fffaf2"/><path d="M0 -21 L6 0 L0 21 L-6 0 Z" fill="{b}"/><path d="M0 -21 L6 0 L-6 0 Z" fill="{c}"/><circle r="3" fill="{a}"/>')
    return (f'<path d="M-40 4 C-40 0 -36 -2 -32 -2 L-8 -2 L10 -26 L18 -26 L8 -2 L28 -2 L36 -12 L42 -12 L38 2 L42 16 L36 16 L28 6 L8 6 L18 30 L10 30 L-8 6 L-32 6 C-36 6 -40 8 -40 4 Z" fill="{a}"/>')   # plane

def sprig(stem, leaf1, leaf2):
    leaves = ''.join(f'<path d="M0 0 C6 -8 18 -10 24 -6 C18 0 8 4 0 0 Z" fill="{leaf1 if k % 2 else leaf2}" transform="translate(0 {-30 + k * 13}) rotate({-30 if k % 2 else 210}) "/>' for k in range(5))
    return f'<path d="M0 40 C2 20 -2 0 0 -40" fill="none" stroke="{stem}" stroke-width="3" stroke-linecap="round"/>{leaves}<circle cx="0" cy="-42" r="5" fill="{leaf1}"/>'

def shell(kind, a, b):
    if kind == 0:   # scallop
        ribs = ''.join(f'<path d="M0 30 L{36 * math.cos(t):.1f} {-6 + 30 * math.sin(t):.1f}" stroke="{b}" stroke-width="2.6" stroke-linecap="round"/>' for t in [math.pi + k * math.pi / 8 for k in range(1, 8)])
        return f'<path d="M-36 -6 C-36 -30 36 -30 36 -6 C36 8 14 24 0 30 C-14 24 -36 8 -36 -6 Z" fill="{a}"/>{ribs}<path d="M-10 30 L10 30 L6 38 L-6 38 Z" fill="{b}"/>'
    if kind == 1:   # starfish
        pts = ' '.join(f'{(34 if k % 2 == 0 else 14) * math.cos(-math.pi / 2 + k * math.pi / 5):.1f},{(34 if k % 2 == 0 else 14) * math.sin(-math.pi / 2 + k * math.pi / 5):.1f}' for k in range(10))
        return f'<polygon points="{pts}" fill="{a}" stroke="{a}" stroke-width="10" stroke-linejoin="round"/>' + ''.join(f'<circle cx="{18 * math.cos(-math.pi / 2 + k * 2 * math.pi / 5):.1f}" cy="{18 * math.sin(-math.pi / 2 + k * 2 * math.pi / 5):.1f}" r="2.6" fill="{b}"/>' for k in range(5))
    return (f'<path d="M-6 36 C-26 26 -30 -6 -10 -30 C-2 -38 10 -36 14 -28 C22 -12 18 18 -6 36 Z" fill="{a}"/>'   # cone shell
            f'<path d="M-20 10 C-8 4 6 6 16 12 M-24 -6 C-10 -12 6 -10 18 -4 M-16 -20 C-6 -24 4 -24 12 -20" fill="none" stroke="{b}" stroke-width="2.6" stroke-linecap="round"/>')

def space(kind, a, b, c):
    if kind == 0:   # rocket
        return (f'<path d="M0 -42 C14 -30 18 -10 16 14 L-16 14 C-18 -10 -14 -30 0 -42 Z" fill="{a}"/><circle cx="0" cy="-12" r="7" fill="{b}"/><circle cx="0" cy="-12" r="4" fill="#fffaf5"/>'
                f'<path d="M-16 0 L-28 22 L-16 18 Z M16 0 L28 22 L16 18 Z" fill="{c}"/><path d="M-9 14 L9 14 L4 30 L0 24 L-4 30 Z" fill="#fbd29a"/>')
    if kind == 1:   # ringed planet
        return (f'<ellipse rx="46" ry="11" fill="none" stroke="{b}" stroke-width="5" transform="rotate(-18)"/><circle r="24" fill="{a}"/>'
                f'<path d="M-44 4 A46 11 0 0 0 44 -4" transform="rotate(-18)" fill="none" stroke="{b}" stroke-width="5"/><path d="M-16 -10 C-6 -6 6 -8 16 -14" stroke="{c}" stroke-width="4" fill="none" stroke-linecap="round"/>')
    pts = ' '.join(f'{(30 if k % 2 == 0 else 12) * math.cos(-math.pi / 2 + k * math.pi / 4):.1f},{(30 if k % 2 == 0 else 12) * math.sin(-math.pi / 2 + k * math.pi / 4):.1f}' for k in range(8))
    return f'<polygon points="{pts}" fill="{a}" stroke="{a}" stroke-width="5" stroke-linejoin="round"/>'   # 4-point twinkle

def craft(kind, a, b):
    if kind == 0:   # ball of yarn
        lines = ''.join(f'<path d="M{-30 + k * 12} -22 C{-20 + k * 12} -6 {-24 + k * 12} 14 {-12 + k * 12} 28" fill="none" stroke="{b}" stroke-width="3" stroke-linecap="round"/>' for k in range(5))
        return f'<circle r="32" fill="{a}"/>{lines}<path d="M28 14 C40 22 34 36 46 40" fill="none" stroke="{a}" stroke-width="4" stroke-linecap="round"/>'
    return (f'<circle r="20" fill="{a}"/><circle r="15" fill="none" stroke="{b}" stroke-width="2.5"/>' + ''.join(f'<circle cx="{x}" cy="{y}" r="2.8" fill="{b}"/>' for x, y in ((-5, -5), (5, -5), (-5, 5), (5, 5))))   # button

# ---------------------------------------------------------------- geometric tiles (exact repeats)
def zellige():
    """Moroccan zellige: 8-point stars and crosses on a 128 px grid, soft terracotta / teal / cream"""
    c = 128; out = []
    star = lambda cx, cy, r: ' '.join(f'{cx + (r if k % 2 == 0 else r * .72) * math.cos(k * math.pi / 8):.1f},{cy + (r if k % 2 == 0 else r * .72) * math.sin(k * math.pi / 8):.1f}' for k in range(16))
    for i in range(-1, 9):
        for j in range(-1, 9):
            cx, cy = i * c, j * c
            out.append(f'<polygon points="{star(cx, cy, 52)}" fill="#e9c9b5"/><polygon points="{star(cx, cy, 34)}" fill="#bfdcd6"/><circle cx="{cx}" cy="{cy}" r="10" fill="#f6efe3"/>')
            out.append(f'<rect x="{cx + c / 2 - 15}" y="{cy + c / 2 - 15}" width="30" height="30" transform="rotate(45 {cx + c / 2} {cy + c / 2})" fill="#d9cfe6"/>')
    return svg_doc(''.join(out), '#f6efe3')

def azulejo():
    """Portuguese azulejo: 128 px blue-and-white tiles, a four-fold flower ornament, thin joints"""
    c = 128; out = []
    for i in range(8):
        for j in range(8):
            x, y = i * c, j * c; cx, cy = x + c / 2, y + c / 2
            g = [f'<rect x="{x + 1}" y="{y + 1}" width="{c - 2}" height="{c - 2}" fill="#f8fbfd"/>']
            for a in range(0, 360, 90):
                g.append(f'<path d="M0 0 C10 -14 10 -34 0 -46 C-10 -34 -10 -14 0 0 Z" transform="translate({cx} {cy}) rotate({a})" fill="#b9d0ea"/>')
                g.append(f'<path d="M0 0 C6 -10 18 -14 26 -12 C22 -4 12 2 0 0 Z" transform="translate({cx} {cy}) rotate({a + 45})" fill="#d6e4f3"/>')
                g.append(f'<path d="M-64 -64 L-40 -64 C-46 -54 -54 -46 -64 -40 Z" transform="translate({cx} {cy}) rotate({a})" fill="#c9dbef"/>')
            g.append(f'<circle cx="{cx}" cy="{cy}" r="9" fill="#9fbde0"/><circle cx="{cx}" cy="{cy}" r="4" fill="#f8fbfd"/>')
            out.append(''.join(g))
    return svg_doc(''.join(out), '#e3ebf2')

def paisley_motif(a, b, c):
    outer = 'M4 40 C-26 40 -40 16 -32 -6 C-26 -24 -8 -34 8 -36 C22 -38 30 -30 28 -22 C26 -16 18 -16 16 -22 C14 -27 20 -28 22 -25 C30 -10 34 6 30 18 C26 32 16 40 4 40 Z'
    inner = 'M4 30 C-16 30 -26 14 -22 -2 C-18 -16 -6 -24 6 -24 C10 -12 20 4 20 14 C20 24 14 30 4 30 Z'
    dots = ''.join(f'<circle cx="{x}" cy="{y}" r="2.6" fill="{c}"/>' for x, y in ((-40, 6), (-38, -12), (-30, -28), (-14, -40), (6, -44), (24, 46), (38, 26), (40, 6)))
    return f'<path d="{outer}" fill="{a}"/><path d="{inner}" fill="{b}"/><circle cx="0" cy="10" r="8" fill="{c}"/><circle cx="0" cy="10" r="3.5" fill="{b}"/>{dots}'

def stamp(kind, frame, bg, a, b):
    perf = ''.join(f'<circle cx="{x}" cy="{y}" r="3.2" fill="{bg}"/>' for x in range(-28, 32, 8) for y in (-36, 36)) + ''.join(f'<circle cx="{x}" cy="{y}" r="3.2" fill="{bg}"/>' for y in range(-28, 32, 8) for x in (-30, 30))
    pic = {0: f'<circle cx="0" cy="-4" r="12" fill="{a}"/><path d="M-20 22 L-6 4 L4 14 L12 6 L22 22 Z" fill="{b}"/>',
           1: f'<path d="M0 -20 L4 -2 L16 -2 L6 6 L10 20 L0 12 L-10 20 L-6 6 L-16 -2 L-4 -2 Z" fill="{a}"/>',
           2: f'<path d="M-4 22 L-4 -6 L-12 -6 L0 -24 L12 -6 L4 -6 L4 22 Z" fill="{a}"/><rect x="-20" y="16" width="40" height="6" rx="3" fill="{b}"/>',
           3: f'<path d="M0 12 C-18 0 -18 -18 -6 -18 C0 -18 0 -12 0 -12 C0 -12 0 -18 6 -18 C18 -18 18 0 0 12 Z" fill="{a}"/><path d="M-16 20 L16 20" stroke="{b}" stroke-width="4" stroke-linecap="round"/>'}[kind]
    return f'<rect x="-30" y="-36" width="60" height="72" fill="{frame}"/>{perf}<rect x="-22" y="-28" width="44" height="56" fill="#fffdf8"/>{pic}'

# ---------------------------------------------------------------- the patterns
def P(bg, motifs, cols, rows, seed, **kw):
    return svg_doc(layout(motifs, cols, rows, seed, **kw), bg)

SR2 = {
    's59': lambda: P('#f4f8f2', [lambda k: mahjong(k % 4)], 6, 6, 701, scale=1.05, tilt=10),
    's60': lambda: P('#fbf6ec', [lambda k: shogi_piece('王歩金飛角銀桂香'[k % 8], '#c99a8a' if k % 5 else '#d98c8c')], 6, 6, 703, scale=1.0, tilt=8),
    's61': lambda: P('#f8f6fb', [lambda k: puzzle_piece(*[('#f5d0d8', '#e8b6c2'), ('#cfe2f5', '#b4cfea'), ('#d5ecd9', '#b7dcc0'), ('#fbe8b8', '#f2d48e')][k % 4])], 6, 6, 705, scale=1.0, tilt=20),
    's62': lambda: P('#fbf7f0', [lambda k: block(k % 3, *[('#fbe3a8', '#f6d27e', '#efc565'), ('#f8d2d8', '#f2b8c2', '#ea9fad'), ('#cfe5f4', '#b5d5ee', '#9fc6e6'), ('#d5ecd6', '#bcdfbe', '#a6d3a9')][k % 4])], 6, 6, 707, scale=.95, tilt=6),
    's63': lambda: P('#f6f8fb', [lambda k: crane(*[('#f6cfd6', '#eab4bf'), ('#cfe0f2', '#b3cde9'), ('#f9e1b0', '#f1cd85'), ('#d8eadb', '#bcdbc2')][k % 4])], 5, 5, 709, scale=1.25, tilt=8, flip=True),
    's64': lambda: P('#fbf6f1', [lambda k: daruma(*[('#f2b3b0', '#fff6ee', '#8a5a56'), ('#f6d79a', '#fff6ee', '#8a6a46'), ('#c9dcef', '#fff6ee', '#566a86')][k % 3])], 6, 6, 711, scale=.95, tilt=8),
    's65': lambda: P('#fbf6f2', [lambda k: matryoshka(*[('#f3b8bd', '#f8d9a8', '#a9d3bb'), ('#bcd3ee', '#f3c3cf', '#f6d79a'), ('#bfe0c8', '#f6d0a8', '#f3b8bd')][k % 3])], 6, 6, 713, scale=.95, tilt=6),
    's66': lambda: P('#fbf8f1', [lambda k: nordic_flower(*[('#f3b8bd', '#f6d79a', '#a9cfa9'), ('#b9d0ec', '#f3b8bd', '#a9cfa9'), ('#f6d79a', '#e9a0a8', '#a9cfa9')][k % 3])], 5, 5, 715, scale=1.35, tilt=10),
    's67': zellige,
    's68': azulejo,
    's69': lambda: P('#fbf6f2', [lambda k: paisley_motif(*[('#f2c7c3', '#f9e2d8', '#d99a95'), ('#c9dcef', '#e6eef8', '#93b3d8'), ('#cfe6cf', '#e8f3e6', '#97c39b')][k % 3])], 6, 6, 719, scale=.95, tilt=35, flip=True),
    's70': lambda: P('#f7f4ee', [lambda k: stamp(k % 4, *[('#f2c7c3', '#f7f4ee', '#e6a49f', '#a9cfa9'), ('#c9dcef', '#f7f4ee', '#9fbde0', '#f6d79a'), ('#d5ecd6', '#f7f4ee', '#a6d3a9', '#f2c7c3'), ('#f6e0a6', '#f7f4ee', '#efc565', '#9fbde0')][k % 4])], 6, 6, 721, scale=1.0, tilt=12),
    's71': lambda: P('#f2f7fb', [lambda k: goldfish(*[('#f6b8a8', '#fad5c8'), ('#f8c9a0', '#fbe0c4'), ('#f3aeb8', '#f9d1d8')][k % 3])], 6, 6, 723, scale=1.0, tilt=25, flip=True),
    's72': lambda: P('#fdf8f4', [lambda k: macaron(*[('#f6c6d2', '#fff4f2'), ('#c9e2f2', '#fff4f2'), ('#d5ecd0', '#fff4f2'), ('#f8e3a6', '#fff4f2')][k % 4]) if k % 2 else donut('#f1d4ae', ['#f6c6d2', '#c9b39a', '#fff4f2'][k % 3], ['#9fc6e6', '#f6d79a', '#a6d3a9'])], 6, 6, 725, scale=1.0, tilt=15),
    's73': lambda: P('#f3f7fb', [lambda k: paper_plane(*[('#ffffff', '#dbe7f3'), ('#fbe3e8', '#f2c9d3'), ('#fdf1cf', '#f6dfa0')][k % 3])], 5, 5, 727, scale=1.0, tilt=25),
    's74': lambda: P('#f6f4ee', [lambda k: travel(k % 4, *[('#f2c7a8', '#e9ad86', '#c9a98a'), ('#bfdcef', '#cde8c8', '#a99f93'), ('#f4d58f', '#e9a0a8', '#9fbde0'), ('#c9dcef', '#9fbde0', '#9fbde0')][k % 4])], 6, 6, 729, scale=1.0, tilt=10),
    's75': lambda: P('#f7f9f2', [lambda k: sprig(*[('#b7cfa6', '#cfe3bf', '#bad7a6'), ('#c3cfa8', '#dbe6c4', '#c6d9ab')][k % 2])], 7, 5, 731, scale=1.0, tilt=18),
    's76': lambda: P('#f4f8fa', [lambda k: shell(k % 3, *[('#f6d6cb', '#eab6a6'), ('#f8e1b4', '#efc98a'), ('#e6d9f0', '#ccb7e4')][k % 3])], 6, 6, 733, scale=1.0, tilt=20),
    's77': lambda: P('#f1f0f8', [lambda k: space(k % 3, *[('#f6c6c8', '#bcd6ee', '#f6d79a'), ('#f6d79a', '#d6c8ef', '#f2b8c2'), ('#fbeec2', '#fbeec2', '#fbeec2')][k % 3])], 6, 6, 735, scale=1.0, tilt=20),
    's78': lambda: P('#fbf6f0', [lambda k: craft(0 if k % 3 == 0 else 1, *[('#f3c3c8', '#e6a3ab'), ('#c9dcef', '#a9c4e3'), ('#d5ecd0', '#b2d8ae'), ('#f8e3a6', '#ecc97a')][k % 4])], 6, 6, 737, scale=1.0, tilt=20),
}

if __name__ == '__main__':
    ids = sys.argv[1:] or list(SR2)
    imgs = render([(SR2[i](), T, T) for i in ids])
    for i, im in zip(ids, imgs):
        save(i, finish(im, int(i[1:])), 'tile', q=80)

# Builds software/h3webui/card.svg — the 3:2 dark card for the top page Software panel (same recipe as praline/card.svg:
# soft orange / dark light above and below the logo band, big Gaussian blur, top/bottom edges fade out ~22% each).
# usage: python3 software/h3webui/build_card.py   (reads logo-dark.svg next to this file)
import os, re
D = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(D, 'logo-dark.svg')).read()
LW, LH = 1530, 220
inner = re.sub(r'^<svg[^>]*>', '', src.strip()); inner = re.sub(r'</svg>$', '', inner); inner = re.sub(r'<title>.*?</title>', '', inner)
CW, CH = 1500, 1000
sc = (0.62 * CW) / LW
cx, cy = (CW - LW * sc) / 2, (CH - LH * sc) / 2
f = lambda v: ('%.2f' % v).rstrip('0').rstrip('.')
F, N = 0.22, 12
ease = [(k / N, (k / N) ** 2 * (3 - 2 * k / N)) for k in range(N + 1)]
stops = [(F * a, b) for a, b in ease] + [(1 - F * a, b) for a, b in reversed(ease)]
defs = ('<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
        + ''.join(f'<stop offset="{f(o * 100)}%" stop-color="#fff" stop-opacity="{f(p)}"/>' for o, p in stops)
        + '</linearGradient>'
        f'<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="{CW}" height="{CH}"><rect width="{CW}" height="{CH}" fill="url(#g)"/></mask>'
        '<filter id="b" x="-50%" y="-80%" width="200%" height="260%"><feGaussianBlur stdDeviation="90"/></filter>'
        '<radialGradient id="v" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#1f1c19"/><stop offset="1" stop-color="#131211"/></radialGradient></defs>')
bt, bb = cy - 0.02 * CH, cy + LH * sc + 0.02 * CH
glow = ('<g filter="url(#b)">'
        f'<ellipse cx="{f(CW*.5)}" cy="{f(bt-CH*.07)}" rx="{f(CW*.4)}" ry="{f(CH*.09)}" fill="#FFAA33" opacity=".34"/>'
        f'<ellipse cx="{f(CW*.5)}" cy="{f(bb+CH*.07)}" rx="{f(CW*.4)}" ry="{f(CH*.09)}" fill="#FFAA33" opacity=".34"/>'
        f'<ellipse cx="{f(CW*.3)}" cy="{f(bt-CH*.14)}" rx="{f(CW*.2)}" ry="{f(CH*.07)}" fill="#7A4A12" opacity=".5"/>'
        f'<ellipse cx="{f(CW*.7)}" cy="{f(bb+CH*.14)}" rx="{f(CW*.2)}" ry="{f(CH*.07)}" fill="#7A4A12" opacity=".5"/>'
        '</g>')
t = 'MiniMax H3 WebUI'
out = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CW} {CH}" width="{CW}" height="{CH}" role="img" aria-label="{t}"><title>{t}</title>'
       + defs + f'<g mask="url(#m)"><rect width="{CW}" height="{CH}" fill="url(#v)"/>{glow}</g>'
       f'<g transform="translate({f(cx)} {f(cy)}) scale({f(sc)})">{inner}</g></svg>\n')
open(os.path.join(D, 'card.svg'), 'w').write(out)

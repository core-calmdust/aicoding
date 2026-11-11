# Builds praline/icon.svg, icon-16.svg, logo.svg (outlined text) and card.svg (3:2 dark card with soft, blurred top/bottom edges for the top page).
# usage: python3 praline/tools/build.py praline   (needs fontTools and Outfit-Regular/Bold.ttf, path in outline.py)
# Outfit 600 / 500 are made by interpolating the Regular (400) and Bold (700) outlines (same point structure).
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import outline as o

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
ICON = ('<rect width="100" height="100" rx="24" fill="#C9823F"/>'
        '<circle cx="69" cy="33.9" r="14.4" fill="#2A1E17" stroke="#C9823F" stroke-width="4.5"/>'
        '<circle cx="40.2" cy="43.5" r="21.6" fill="#F5EADB" stroke="#C9823F" stroke-width="4.5"/>'
        '<circle cx="65.4" cy="67.5" r="16.8" fill="#F5EADB" stroke="#C9823F" stroke-width="4.5"/>'
        '<circle cx="31.8" cy="73.5" r="12" fill="#2A1E17" stroke="#C9823F" stroke-width="4.5"/>')
ICON16 = ('<rect width="100" height="100" rx="22" fill="#C9823F"/>'
          '<circle cx="40.2" cy="43.5" r="24" fill="#F5EADB"/>'
          '<circle cx="66.6" cy="68.7" r="18" fill="#F5EADB"/>'
          '<circle cx="70.2" cy="31.5" r="15.6" fill="#2A1E17"/>')
W600, W500 = 2 / 3, 1 / 3   # Outfit 600 / 500 between Regular 400 and Bold 700


def svg(w, h, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {o.fmt(w)} {o.fmt(h)}" width="{o.fmt(w)}" height="{o.fmt(h)}" role="img" aria-label="{title}">'
            f'<title>{title}</title>{body}</svg>\n')


def lsb(name, t):
    """the glyph's left ink edge (font units) at weight t"""
    rec = o.lerp_rec(o.glyph_rec(o.R, name), o.glyph_rec(o.B, name), t)
    return min(px for _, pts in rec for px, _ in pts)


def mark(x, y, size, ink='#2A1E17', sub_ink='#7A5A44'):
    """the horizontal mark (icon + wordmark) with its top-left at x,y; returns (svg, width, height).
    ink / sub_ink: light-background colours by default; the dark version uses #F5EADB / #C8B29C."""
    k = size / 100.0                       # icon size = size px
    fs = 0.62 * size                       # Praline font size
    tx = x + size + 0.24 * size            # text start
    base = y + 0.60 * size                 # Praline baseline
    names = ['P', 'r', 'a', 'l', 'dotlessi', 'n', 'e']
    d1, pos, x1 = o.layout(None, W600, fs, tx, base, -0.03, names)
    sx, cy, hgt = o.i_dot(W600, fs)
    ix = dict((n, px) for n, px in pos)['dotlessi']
    dot = f'<circle cx="{o.fmt(ix + sx)}" cy="{o.fmt(base - cy)}" r="{o.fmt(0.2 * fs / 2)}" fill="#C9823F"/>'
    fs2 = 0.135 * size
    sub = 'THINKING ENGINE'
    # THINKING ENGINE starts exactly under the left edge of the P's stem (ink to ink: each glyph's left side bearing taken off)
    sx0 = tx + lsb('P', W600) * fs / 1000 - lsb('T', W500) * fs2 / 1000
    d2, pos2, x2 = o.layout(sub, W500, fs2, sx0, y + 0.88 * size, 0.32)
    body = (f'<g transform="translate({o.fmt(x)} {o.fmt(y)}) scale({o.fmt(k)})">{ICON}</g>'
            f'<path fill="{ink}" d="{d1}"/>{dot}<path fill="{sub_ink}" d="{d2}"/>')
    return body, max(x1, x2) - x, size


# icons
open(os.path.join(OUT, 'icon.svg'), 'w').write(svg(100, 100, ICON, 'Praline'))
open(os.path.join(OUT, 'icon-16.svg'), 'w').write(svg(100, 100, ICON16, 'Praline').replace('width="100" height="100" role', 'width="16" height="16" role'))

# logo: white base, padding = 0.32 * icon
S = 120; P = 0.32 * S
body, w, h = mark(P, P, S)
W, H = w + 2 * P, h + 2 * P
open(os.path.join(OUT, 'logo.svg'), 'w').write(svg(W, H, f'<rect width="{o.fmt(W)}" height="{o.fmt(H)}" fill="#fff"/>' + body, 'Praline — Thinking Engine'))

# card for the top page panel: 3:2, DARK version (cocoa-black ground, cream wordmark) — the top page is a dark theme.
# Soft caramel / cocoa light is laid above and below the logo band with a large Gaussian blur, and the whole card fades
# to transparent at the top and bottom edges (mask, ~22% each, smoothstep) so it melts into the panel behind it.
CW, CH = 1500, 1000
S2 = 200
b2, w2, h2 = mark(0, 0, S2, ink='#F5EADB', sub_ink='#C8B29C')
sc = (0.56 * CW) / w2
cx, cy = (CW - w2 * sc) / 2, (CH - h2 * sc) / 2
F = 0.22                                            # fade length (share of the height) at each edge
N = 12                                              # smoothstep, sampled
ease = [(k / N, (k / N) ** 2 * (3 - 2 * k / N)) for k in range(N + 1)]
stops = [(F * a, b) for a, b in ease] + [(1 - F * a, b) for a, b in reversed(ease)]
defs = ('<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
        + ''.join(f'<stop offset="{o.fmt(off * 100)}%" stop-color="#fff" stop-opacity="{o.fmt(op)}"/>' for off, op in stops)
        + '</linearGradient>'
        f'<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="{CW}" height="{CH}"><rect width="{CW}" height="{CH}" fill="url(#g)"/></mask>'
        '<filter id="b" x="-50%" y="-80%" width="200%" height="260%"><feGaussianBlur stdDeviation="90"/></filter>'
        '<radialGradient id="v" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#241a14"/><stop offset="1" stop-color="#1A130F"/></radialGradient></defs>')
band_t, band_b = cy - 0.02 * CH, cy + h2 * sc + 0.02 * CH      # logo band
glow = ('<g filter="url(#b)">'
        f'<ellipse cx="{o.fmt(CW * .5)}" cy="{o.fmt(band_t - CH * .07)}" rx="{o.fmt(CW * .4)}" ry="{o.fmt(CH * .09)}" fill="#C9823F" opacity=".42"/>'
        f'<ellipse cx="{o.fmt(CW * .5)}" cy="{o.fmt(band_b + CH * .07)}" rx="{o.fmt(CW * .4)}" ry="{o.fmt(CH * .09)}" fill="#C9823F" opacity=".42"/>'
        f'<ellipse cx="{o.fmt(CW * .3)}" cy="{o.fmt(band_t - CH * .14)}" rx="{o.fmt(CW * .2)}" ry="{o.fmt(CH * .07)}" fill="#7A4A2A" opacity=".5"/>'
        f'<ellipse cx="{o.fmt(CW * .7)}" cy="{o.fmt(band_b + CH * .14)}" rx="{o.fmt(CW * .2)}" ry="{o.fmt(CH * .07)}" fill="#7A4A2A" opacity=".5"/>'
        '</g>')
card = (defs + f'<g mask="url(#m)"><rect width="{CW}" height="{CH}" fill="url(#v)"/>{glow}</g>'
        f'<g transform="translate({o.fmt(cx)} {o.fmt(cy)}) scale({o.fmt(sc)})">{b2}</g>')
open(os.path.join(OUT, 'card.svg'), 'w').write(svg(CW, CH, card, 'Praline — Thinking Engine'))
print('logo', W, H, 'mark w', w2)

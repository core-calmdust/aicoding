#!/usr/bin/env python3
"""大百科の麻雀（riichi/）：雀華の app.css の紫がかった色を、深い緑がかった色に置きかえた上書き CSS を作る。

  python3 riichi/tools/classic-css.py   → riichi/app-classic.css

riichi/ は ../mahjong/app.css の代わりにこの写しを読む（規則の順番・強さはそのまま、色だけが違う）。
雀華の app.css を直したら、これを実行し直して riichi/index.html の app-classic.css の ?v= を上げる。
紫〜藍（色相 225〜300°）の色だけを、明るさを保ったまま緑（色相 152°）に回す。とても淡い色（文字色のラベンダー）は
温かみのある白に寄せる。レア度・スキル・段位章（キャラやスキルの色）を描くルールは対象外。
"""
import re, colorsys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '..', 'mahjong', 'app.css')
OUT = os.path.join(ROOT, 'app-classic.css')
SKIP_SEL = re.compile(r'(\.r-(N|R|SR|SSR|UR)\b|\.fr-|\.rk-t|\.rk-dan|\.rk-kyu|\.prar|\.st[0-4]\b|\.sr\b|\.skc|gacha|\.gp-|\.ga-|\.gc|\.rkg|\.ptn|\.sis|\.pp-|\.ab-|\.skfx|cutin|\.ci-)')

TILE = [False]   # (a rule that draws tiles: their purple backs turn deep blue, like the 3D table's backs — not green on the green cloth)
def conv(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    deg = h * 360
    if s < .12 or not (222 <= deg <= 305): return None
    if l > .8:   # pale lavender text → a warm near-white
        h2, s2 = 45 / 360, min(s, .35)
    elif TILE[0]:
        h2, s2 = 216 / 360, s * .85
    else:
        h2, s2 = 152 / 360, s * .62
    r2, g2, b2 = colorsys.hls_to_rgb(h2, l, s2)
    return round(r2 * 255), round(g2 * 255), round(b2 * 255)

def recolor(val):
    changed = [False]
    def rgba(m):
        parts = [p.strip() for p in m.group(2).split(',')]
        try: r, g, b = [float(x) for x in parts[:3]]
        except ValueError: return m.group(0)
        c = conv(r, g, b)
        if not c: return m.group(0)
        changed[0] = True
        return f"{m.group(1)}({c[0]},{c[1]},{c[2]}{''.join(',' + p for p in parts[3:])})"
    def hexc(m):
        h = m.group(1)
        if len(h) in (3, 4): h = ''.join(ch * 2 for ch in h)
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        c = conv(r, g, b)
        if not c: return m.group(0)
        changed[0] = True
        a = h[6:8] if len(h) == 8 else ''
        return '#%02x%02x%02x%s' % (c[0], c[1], c[2], a)
    v = re.sub(r'\b(rgba?)\(([^()]*)\)', rgba, val)
    v = re.sub(r'#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b', hexc, v)
    return v if changed[0] else None

def prefix(sel):
    out = []
    for s in split_top(sel, ','):
        s = s.strip()
        if not s: continue
        if s.startswith(':root'): return None
        if s.startswith('html'): out.append('html.classic' + s[4:])
        else: out.append('html.classic ' + s)
    return ','.join(out)

def split_top(s, ch):
    parts, depth, cur = [], 0, ''
    for c in s:
        if c in '([': depth += 1
        elif c in ')]': depth -= 1
        if c == ch and depth == 0: parts.append(cur); cur = ''
        else: cur += c
    parts.append(cur); return parts

def decls(body):
    out = []
    for d in split_top(body, ';'):
        if ':' not in d: continue
        k, v = d.split(':', 1)
        k = k.strip()
        if k.startswith('--') and False: continue
        nv = recolor(v)
        if nv is not None: out.append(f'{k}:{nv.strip()}')
    return out

def recolor_block(css, skip=False):
    """the whole stylesheet in order, only its colours changed (rules of SKIP_SEL kept as they are)"""
    out, i, n = [], 0, len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0: out.append(css[i:]); break
        head = css[i:j]
        d, k = 1, j + 1
        while k < n and d:
            if css[k] == '{': d += 1
            elif css[k] == '}': d -= 1
            k += 1
        body = css[j + 1:k - 1]
        h = head.strip()
        if h.startswith('@media') or h.startswith('@supports') or h.startswith('@container') or h.startswith('@layer'):
            out.append(head + '{' + recolor_block(body) + '}')
        elif h.startswith('@'):
            out.append(head + '{' + body + '}')
        else:
            sel = re.sub(r'/\*.*?\*/', '', h, flags=re.S)
            TILE[0] = bool(re.search(r'\.tl\b|\.back\b', sel))
            if SKIP_SEL.search(sel): out.append(head + '{' + body + '}')
            else:
                nb = recolor(body)
                out.append(head + '{' + (nb if nb is not None else body) + '}')
        i = k
    return ''.join(out)

css = open(SRC, encoding='utf-8').read()
out = '/* 自動生成：riichi/tools/classic-css.py — 雀華 mahjong/app.css の色だけを置きかえた写し（紫 → 緑、牌の背は青）。手で直さない */\n' + recolor_block(css)
open(OUT, 'w', encoding='utf-8').write(out)
print(OUT, len(out), 'bytes')

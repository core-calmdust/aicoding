#!/usr/bin/env python3
"""上海・麻雀の牌の絵（筒子 pin1〜9.svg・索子 sou2〜9.svg・一索 bird.svg）を作る。2026-11-14（Fable）
使い方: python3 atlas/tools/shanghai-svg/gen.py        （このフォルダの SVG を書き直す）
そのあと: python3 atlas/tools/shanghai-glyphs.py vec atlas/img/shanghai-art.png   （シートに描き込む）

設計の決まり（ユーザー指示：定番の型を崩さない・潰れた模様を整理・彫った感じを出す）
 - セルは 280×390。牌の手牌表示は幅 60〜90px なので、線・すき間は 7 以上（＝表示で約2px）を守る。それより細かい模様は潰れるので描かない。
 - 配置は日本の牌の定番（索子：2〜9 本の竹、5・7・9 と一索に赤。筒子：紺と赤）。
 - 色は牌の塗り（緑 #127040・赤 #d0122a・紺 #1c3c86）の平塗り。白（#fafaf6）は彫らずに残した面。
"""
import math, os

HERE = os.path.dirname(os.path.abspath(__file__))
G, R, B, W, K = '#127040', '#d0122a', '#1c3c86', '#fafaf6', '#141414'
HEAD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 390" width="280" height="390">\n'
f = lambda v: ('%.1f' % v).rstrip('0').rstrip('.')


def save(name, note, body):
    with open(os.path.join(HERE, name), 'w') as fh:
        fh.write(HEAD + '<!-- %s（atlas/tools/shanghai-svg/gen.py が生成。手で直さない） -->\n' % note + body + '\n</svg>\n')


# ---------------------------------------------------------------- 索子
def stick(x, y, L, col, rot=0, s=1.0):
    """竹1本：上・中・下に節（横に張り出す）、節の間の稈は少しくびれ、まん中に白い筋（彫り残し）。"""
    sw, nw, nh, slit = 17.0 * s, 22.5 * s, 18.0 * min(1, s + .1), 10.0 * s      # 稈の半幅・節の半幅・節の高さ・白い筋の幅
    h = L / 2
    waist = sw - 2.6 * s
    p = []
    # 稈（上下2節ぶん）：節のところで太く、中ほどで少し細い
    for y0, y1 in ((-h + nh * .5, 0), (0, h - nh * .5)):
        ym = (y0 + y1) / 2
        p.append('<path d="M%s %s Q%s %s %s %s L%s %s Q%s %s %s %s Z"/>' % (
            f(-sw), f(y0), f(-(2 * waist - sw)), f(ym), f(-sw), f(y1), f(sw), f(y1), f(2 * waist - sw), f(ym), f(sw), f(y0)))
    # 節：上下の端は丸い帽子、中の節は帯
    for yc in (-h + nh / 2, 0, h - nh / 2):
        p.append('<ellipse cx="0" cy="%s" rx="%s" ry="%s"/>' % (f(yc), f(nw), f(nh / 2)))
    # 白い筋（節の間に1本ずつ）
    a0, a1 = -h + nh + 7, -nh / 2 - 7
    q = ['<path d="M0 %s V%s M0 %s V%s" stroke="%s" stroke-width="%s" stroke-linecap="round" fill="none"/>' % (f(a0), f(a1), f(-a1), f(-a0), W, f(slit))]
    return '<g transform="translate(%s %s)%s" fill="%s">%s%s</g>' % (f(x), f(y), ' rotate(%s)' % f(rot) if rot else '', col, ''.join(p), ''.join(q))


L2, LS = 150, 102          # 2段の牌の竹の長さ・3段の牌の竹の長さ
YA, YB = 110, 280          # 2段の牌の上段・下段
Y3 = (80, 195, 310)        # 3段の牌
X3 = (56, 140, 224)
SOU = {
    2: [(140, YA, L2, G, 0, 1.1), (140, YB, L2, G, 0, 1.1)],
    3: [(140, YA, L2, G, 0, 1.1), (84, YB, L2, G, 0, 1.1), (196, YB, L2, G, 0, 1.1)],
    4: [(x, y, L2, G, 0, 1.1) for y in (YA, YB) for x in (84, 196)],
    5: [(62, YA, L2, G), (218, YA, L2, G), (140, 195, L2, R), (62, YB, L2, G), (218, YB, L2, G)],
    6: [(x, y, L2, G) for y in (YA, YB) for x in X3],
    7: [(140, Y3[0], LS, R, 0, .86)] + [(x, y, LS, G, 0, .86) for y in Y3[1:] for x in X3],
    # 8索：上は「M」、下は「W」（外の2本は縦、内の2本は斜め）
    8: [(40, YA, L2, G, 0, .8), (99, YA, L2, G, -17, .8), (181, YA, L2, G, 17, .8), (240, YA, L2, G, 0, .8),
        (40, YB, L2, G, 0, .8), (99, YB, L2, G, 17, .8), (181, YB, L2, G, -17, .8), (240, YB, L2, G, 0, .8)],
    9: [(x, y, LS, R if x == 140 else G, 0, .86) for y in Y3 for x in X3],
}


# ---------------------------------------------------------------- 筒子
def pin(x, y, r, col):
    """丸1つ：外の輪・白いすき間・中の円。大きい丸だけ中に白い花びら（6つの点）を入れ、小さい丸は中心の白い点だけ。"""
    o = ['<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(x), f(y), f(r), col),
         '<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(x), f(y), f(r * .74), W),
         '<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(x), f(y), f(r * .58), col)]
    if r >= 44:
        for i in range(6):
            a = math.radians(i * 60 + 30)
            px, py = x + math.cos(a) * r * .33, y + math.sin(a) * r * .33
            o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" transform="rotate(%s %s %s)"/>' % (f(px), f(py), f(r * .15), f(r * .085), W, f(i * 60 + 30), f(px), f(py)))
        o.append('<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(x), f(y), f(r * .1), W))
    else:
        o.append('<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(x), f(y), f(r * .2), W))
    return ''.join(o)


def pin1():
    x, y = 140, 195
    c = lambda r, col: '<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (x, y, f(r), col)
    o = [c(102, B), c(80, W), c(72, R), c(47, W), c(39, B), c(21, W), c(12, R)]
    for i in range(12):   # 外の輪の白い珠
        a = math.radians(i * 30)
        o.append('<circle cx="%s" cy="%s" r="6" fill="%s"/>' % (f(x + math.cos(a) * 91), f(y + math.sin(a) * 91), W))
    for i in range(8):    # 赤い輪の白い花びら
        a = i * 45 + 22.5
        o.append('<ellipse cx="%s" cy="%s" rx="8" ry="4.6" fill="%s" transform="rotate(%s %s %s)"/>' % (
            f(x + math.cos(math.radians(a)) * 59.5), f(y + math.sin(math.radians(a)) * 59.5), W, f(a),
            f(x + math.cos(math.radians(a)) * 59.5), f(y + math.sin(math.radians(a)) * 59.5)))
    return ''.join(o)


PIN = {
    2: [(140, 105, 54, B), (140, 285, 54, B)],
    3: [(72, 84, 46, B), (140, 195, 46, R), (208, 306, 46, B)],
    4: [(84, 108, 52, B), (196, 108, 52, B), (84, 282, 52, B), (196, 282, 52, B)],
    5: [(76, 92, 46, B), (204, 92, 46, B), (140, 195, 46, R), (76, 298, 46, B), (204, 298, 46, B)],
    6: [(88, 76, 42, B), (192, 76, 42, B), (88, 212, 42, R), (192, 212, 42, R), (88, 310, 42, R), (192, 310, 42, R)],
    7: [(62, 60, 33, B), (140, 88, 33, B), (218, 116, 33, B), (92, 224, 39, R), (188, 224, 39, R), (92, 314, 39, R), (188, 314, 39, R)],
    8: [(x, y, 37, B) for y in (68, 153, 238, 323) for x in (92, 188)],
    9: [(x, y, 37, R if y == 195 else B) for y in (78, 195, 312) for x in (56, 140, 224)],
}


# ---------------------------------------------------------------- 一索（孔雀）
def bird():
    """定番の構図：上に丸くこんもり広げた尾羽（とげとげの縁・白い輪の目玉模様）、下に正面を向いて翼を左右に広げた孔雀、
    首を上げて横を向き口を開ける、赤い脚。線画にせず、太い面の塗りだけで組む（細い輪郭線は潰れる）。"""
    o = []
    cx, cy, r0, r1, n = 140, 112, 70, 90, 18
    # 尾羽：円＋とがった羽先
    tips = []
    for i in range(n):
        a0, a1, am = (math.radians((i + d) * 360 / n - 90) for d in (-.5, .5, 0))
        tips.append('M%s %s L%s %s L%s %s Z' % (f(cx + math.cos(a0) * (r0 - 2)), f(cy + math.sin(a0) * (r0 - 2)), f(cx + math.cos(am) * r1), f(cy + math.sin(am) * r1),
                                             f(cx + math.cos(a1) * (r0 - 2)), f(cy + math.sin(a1) * (r0 - 2))))
    o.append('<g fill="%s"><circle cx="%s" cy="%s" r="%s"/><path d="%s"/></g>' % (G, cx, cy, r0, ' '.join(tips)))
    # 目玉模様：白い輪に赤い芯（3・4・3）
    for ex, ey in [(108, 76), (140, 70), (172, 76), (90, 110), (123, 108), (157, 108), (190, 110), (108, 144), (140, 146), (172, 144)]:
        o.append('<circle cx="%s" cy="%s" r="13" fill="%s"/><circle cx="%s" cy="%s" r="7" fill="%s"/>' % (ex, ey, W, ex, ey, R))
    # 翼（左右対称）：肩から外上へ扇に広げた4枚の羽（太い線＝羽1枚。根元は重なって1つの面、先へ行くほどすき間が開く）
    sx, sy = 120, 262
    fe = []
    for ang, ln in ((50, 118), (28, 114), (6, 104), (-17, 86)):
        a = math.radians(ang); tx, ty = sx - ln * math.cos(a), sy - ln * math.sin(a)
        px, py = math.sin(a), -math.cos(a)                                          # 羽の幅の向き（上側）
        mx, my = sx + (tx - sx) * .58 + 7 * px, sy + (ty - sy) * .58 + 7 * py     # 少し上へ反る
        fe.append('M%s %s Q%s %s %s %s Q%s %s %s %s Z' % (sx, sy, f(mx + 21 * px), f(my + 21 * py), f(tx), f(ty), f(mx - 21 * px), f(my - 21 * py), sx, sy))
    wing = '<path d="%s"/>' % ' '.join(fe)
    body = 'M140 226 C162 226 176 250 174 278 C172 304 158 322 140 322 C122 322 108 304 106 278 C104 250 118 226 140 226 Z'
    neck = 'M140 242 C140 216 114 222 110 194'
    shapes = (wing + '<g transform="translate(280 0) scale(-1 1)">' + wing + '</g><path d="%s"/>'
              '<path d="%s" fill="none" stroke-width="NW" stroke-linecap="round"/><circle cx="108" cy="188" r="17"/>') % (body, neck)
    put = lambda col, fw, nw, edge: '<g fill="%s" stroke="%s" stroke-width="%s" stroke-linejoin="round">%s</g>' % (col, col, edge, shapes.replace('FW', str(fw)).replace('NW', str(nw)))
    # 尾羽との境の白いふち（彫り残し）→ 本体
    o.append(put(W, 0, 31, 9)); o.append(put(G, 0, 22, 0))
    # 胸の羽（白い筋）
    o.append('<path d="M124 270 q8 9 16 0 q8 9 16 0 M132 292 q8 9 16 0" fill="none" stroke="%s" stroke-width="6" stroke-linecap="round"/>' % W)
    # くちばし（開いた口）・目・脚
    o.append('<path d="M96 176 L62 164 L94 190 Z M95 193 L66 206 L104 203 Z" fill="%s" stroke="%s" stroke-width="3" stroke-linejoin="round"/>' % (R, R))
    o.append('<circle cx="109" cy="184" r="5" fill="%s"/>' % W)
    o.append('<g stroke="%s" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none">'
             '<path d="M129 322 L126 350 M110 361 L126 350 L139 361"/><path d="M151 322 L154 350 M141 361 L154 350 L170 361"/></g>' % R)
    return ''.join(o)


def main():
    for n, L in SOU.items():
        save('sou%d.svg' % n, '%d索' % n, '\n'.join(stick(*a) for a in L))
    save('pin1.svg', '一筒', pin1())
    for n, L in PIN.items():
        save('pin%d.svg' % n, '%d筒' % n, '\n'.join(pin(*a) for a in L))
    save('bird.svg', '一索：定番の構図（丸い尾羽＋翼を広げた正面の孔雀）を太い面で描き起こし', bird())


if __name__ == '__main__':
    main()

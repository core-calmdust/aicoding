# -*- coding: utf-8 -*-
"""The four hard cards drawn first: 松に鶴, 柳に小野道風, 桐に鳳凰, 菊に盃.
Hand-placed point lists drawn by eye after the traditional hachihachi-bana pattern; composition checked
against reference renders (see claude/hanafuda-spec.md). No reference paths are copied."""
import math, sys, os
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from hfart_geom import ellipse, xf, dense, normals, arclen
from hfprint import Card, print_card


def band(pts, wv):
    d = dense(pts); nn = normals(d)
    return d + nn * wv, d - nn * wv, d, nn


def herring(c, spine, L=10, gap=6, ang=0.75, w=0.9, sides=(1, -1), back=False):
    """pine / willow needles: a spine with slanted needles on both sides (key lines)"""
    c.line(spine, w * 1.1)
    d = dense(spine); s = arclen(d); nn = normals(d)
    k = gap
    while k < s[-1] - 2:
        i = min(int(np.searchsorted(s, k)), len(d) - 2)
        p = d[i]; t = d[i + 1] - d[i]; t = t / (np.linalg.norm(t) + 1e-9)
        if back:
            t = -t
        for sd in sides:
            v = nn[i] * sd * math.sin(ang) + t * math.cos(ang)
            Lr = L * c.rng.uniform(0.8, 1.1)
            c.line([p, p + v * Lr * 0.55 + nn[i] * sd * 0.6, p + v * Lr], w, taper=(0.05, 0.5))
        k += gap * c.rng.uniform(0.85, 1.15)


def bud(c, x, y, r, ang):
    """yellow pine shoot (the new candle at a branch tip)"""
    p = xf([(0, -r * 1.6), (r * 0.8, -r * 0.6), (r, r * 0.4), (0, r), (-r, r * 0.4), (-r * 0.8, -r * 0.6)], dx=x, dy=y, rot=ang)
    c.outlined('y', p, 1.1, wob=0.3)


# ====================================================================== 松に鶴
def matsu_tsuru():
    c = Card('matsu-tsuru', seed=101)
    sun = ellipse(306, -8, 166, 166, 0, 90)
    c.mass('r', sun, wob=0.8)
    c.line([(306 + 166 * math.cos(a), -8 + 166 * math.sin(a)) for a in np.linspace(1.45, 3.05, 40)], 2.0)
    # crane bill (open a little), head with the red crown
    c.outlined('paper', [(66, 132), (100, 118), (152, 104), (106, 126), (74, 146)], 1.1)
    c.outlined('paper', [(74, 146), (108, 132), (150, 107), (110, 138), (80, 152)], 1.0)
    head = [(40, 152), (42, 138), (54, 130), (70, 130), (80, 140), (80, 154), (72, 164), (56, 168), (44, 164)]
    c.outlined('paper', head, 1.2)
    crown = ellipse(60, 146, 16, 15, 0, 22)
    c.mass('r', crown, wob=0.5)
    c.line(list(crown), 1.1, closed=True, taper=(0, 0))
    c.stroke([(58, 146), (66, 145)], 2.6, 1.6)
    # neck: S-curve, black on the lower front
    nL = [(42, 162), (40, 188), (44, 214), (52, 236), (70, 252), (96, 262)]
    nR = [(72, 166), (66, 186), (62, 210), (68, 230), (86, 242), (110, 242)]
    c.mass('paper', nL + nR[::-1], wob=0.4)
    c.line(nL, 1.2); c.line(nR, 1.2)
    c.mass('k', [(44, 196), (54, 200), (60, 226), (74, 244), (96, 252), (94, 262), (70, 252), (52, 236), (44, 214)], wob=0.4)
    c.line(nL[1:], 1.2)
    for y in (176, 186):
        c.line([(46, y), (60, y - 2)], 0.8)
    # body and folded wing
    body = [(92, 266), (100, 246), (126, 238), (160, 240), (190, 254), (214, 276), (226, 296), (210, 304), (176, 306), (140, 304), (112, 296), (96, 284)]
    c.mass('paper', body, wob=0.5)
    c.line(body, 1.3, closed=True)
    for (a, b) in [((112, 262), (170, 250)), ((118, 274), (188, 266)), ((128, 286), (200, 282)), ((96, 282), (150, 292))]:
        c.line([a, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 6), b], 1.0)
    for (x, y) in [(150, 262), (172, 272), (136, 276), (160, 286)]:
        c.line([(x - 10, y + 6), (x, y - 2), (x + 12, y)], 0.9)
    # black tail feathers hanging behind, to the lower right
    tail = [(176, 262), (198, 262), (220, 284), (236, 310), (242, 340), (232, 336), (230, 360), (218, 344), (214, 370), (204, 350), (194, 336), (188, 312), (180, 290)]
    c.mass('k', tail, wob=0.5)
    c.line(tail, 1.1, closed=True)
    for i in range(5):
        c.line([(188 + i * 9, 274 + i * 4), (204 + i * 7, 310 + i * 3), (210 + i * 5, 344 + i)], 0.9)
    # thigh feathers and legs
    for x in (122, 132, 142, 152, 162):
        c.line([(x, 306), (x - 3, 326)], 0.9)
    for leg, toes in [([(122, 302), (122, 360), (118, 400), (116, 432)], [(-26, 6), (10, 8), (-18, 20)]),
                      ([(160, 304), (160, 370), (160, 420), (160, 462)], [(-24, 8), (20, 6), (-12, 22)])]:
        c.line(leg, 1.8)
        c.line([(p[0] + 4.0, p[1]) for p in leg], 1.8)
        c.mass('k', [leg[0], leg[-1], (leg[-1][0] + 4, leg[-1][1]), (leg[0][0] + 4, leg[0][1])], smooth=False, wob=0.1)
        c.line([(leg[1][0] - 1, leg[1][1] + 26), (leg[1][0] + 5, leg[1][1] + 26)], 0.9)   # knee
        x, y = leg[-1]
        for dx, dy in toes:
            c.stroke([(x + 1.6, y), (x + dx * 0.5, y + dy * 0.5 + 1), (x + dx, y + dy)], 1.8, 0.8, taper=(0.05, 0.4))
    # pines: tall dark shapes with herringbone needles and yellow shoots
    lp = [(18, 330), (30, 308), (46, 320), (54, 356), (56, 400), (58, 450), (62, 510), (18, 512)]
    c.mass('k', lp); c.line(lp[:7], 1.3)
    herring(c, [(32, 316), (36, 380), (40, 450), (42, 508)], L=14, gap=7, ang=0.9)
    bud(c, 31, 302, 6.5, 0.0)
    mp = [(56, 400), (68, 388), (86, 390), (92, 420), (86, 470), (80, 512), (58, 512)]
    c.mass('k', mp); c.line(mp, 1.3, closed=True)
    herring(c, [(76, 396), (74, 450), (70, 508)], L=12, gap=7, ang=0.9)
    bud(c, 79, 388, 6.5, 0.5)
    rp = [(232, 312), (246, 254), (262, 214), (280, 196), (296, 194), (308, 200), (308, 512), (196, 512), (186, 440), (180, 404), (190, 396), (208, 400), (224, 360)]
    c.mass('k', rp); c.line(rp, 1.3, closed=True)
    herring(c, [(286, 200), (276, 280), (264, 380), (256, 508)], L=20, gap=8, ang=0.85)
    herring(c, [(192, 402), (214, 440), (236, 480), (252, 508)], L=14, gap=8, ang=0.9)
    bud(c, 290, 186, 7.5, 0.2)
    bud(c, 186, 394, 6.5, -0.6)
    return c


# ====================================================================== 柳に小野道風
def yanagi_michikaze():
    c = Card('yanagi-michikaze', seed=211)
    # trunk: orange-brown band running out of the upper left
    trunk = [(14, 112), (34, 84), (56, 58), (80, 36), (98, 14), (122, 14), (102, 42), (78, 66), (56, 90), (34, 118), (14, 140)]
    c.outlined('o', trunk, 1.3)
    c.line([(30, 100), (52, 74), (74, 54)], 0.9); c.line([(40, 110), (66, 82)], 0.9)
    # willow masses: dark, hanging, drawn with herringbone leaves
    A = [(52, 92), (74, 68), (104, 62), (130, 74), (148, 98), (160, 124), (150, 150), (136, 172), (128, 214), (122, 260), (112, 292), (100, 288), (92, 250), (84, 212), (74, 210), (66, 250), (54, 300), (38, 328), (26, 318), (18, 270), (20, 200), (30, 140)]
    c.mass('k', A); c.line(A, 1.3, closed=True)
    for sp in ([(94, 66), (70, 120), (46, 200), (32, 310)], [(118, 72), (110, 140), (106, 210), (106, 284)], [(140, 96), (138, 140)]):
        herring(c, sp, L=13, gap=7, ang=0.6, back=True)
    B = [(108, 14), (308, 14), (308, 300), (292, 296), (282, 240), (276, 180), (264, 150), (250, 160), (238, 140), (222, 124), (206, 100), (188, 98), (172, 84), (156, 62), (132, 40)]
    c.mass('k', B); c.line(B[2:], 1.3)
    for sp in ([(150, 16), (170, 60), (186, 92)], [(200, 16), (220, 70), (236, 128)], [(250, 16), (262, 80), (272, 150)], [(296, 30), (292, 150), (294, 290)]):
        herring(c, sp, L=13, gap=7, ang=0.6, back=True)
    # stream: light blue band winding behind him
    st = [(14, 338), (50, 344), (86, 336), (80, 320), (100, 312), (130, 316), (160, 322)]
    st2 = [(222, 336), (258, 346), (252, 372), (272, 388), (308, 394)]
    for pts, wv in ((st, 6), (st2, 6)):
        up, dn, d, nn = band(pts, wv)
        c.mass('bl', list(up) + list(dn[::-1]), smooth=False, wob=0.4)
        c.line(list(up), 1.0); c.line(list(dn), 1.0)
    # umbrella: open, seen from below, tilted; yellow ring of the oiled paper between black panels
    can = [(142, 192), (160, 170), (196, 152), (236, 148), (268, 160), (252, 172), (218, 180), (178, 190)]
    c.mass('k', can, wob=0.5); c.line(can, 1.3, closed=True)
    ring = [(178, 172), (200, 162), (230, 158), (246, 162), (230, 168), (204, 174)]
    c.outlined('y', ring, 0.9)
    hub = (210, 170)
    for p in can:
        c.line([hub, p], 0.8)
    for t in (0.2, 0.45, 0.7):
        c.line([(206, 176), (196 + t * 40, 194 - t * 8)], 0.7)
    c.stroke([(206, 172), (222, 222), (236, 262)], 2.4, 2.2, taper=(0.02, 0.04), press=0.04)
    # Michikaze: tall black cap, white face looking left, red robe with wide sleeves, purple hakama
    cap = [(150, 226), (148, 210), (154, 200), (168, 200), (172, 212), (172, 228)]
    c.outlined('k', cap, 1.1)
    face = [(152, 224), (172, 222), (178, 236), (172, 252), (160, 256), (152, 246), (150, 234)]
    c.outlined('fl', face, 1.1)
    c.stroke([(154, 233), (161, 232)], 2.6, 1.4); c.stroke([(165, 232), (171, 233)], 2.6, 1.4)
    c.stroke([(156, 229), (161, 228)], 1.2, 0.6); c.stroke([(165, 228), (170, 229)], 1.2, 0.6)
    c.line([(162, 236), (160, 242), (163, 243)], 0.8)
    c.stroke([(158, 248), (163, 248)], 2.0, 1.4)
    robe = [(142, 268), (162, 258), (192, 260), (214, 270), (222, 300), (212, 330), (214, 388), (146, 392), (148, 340), (138, 300)]
    c.outlined('r', robe, 1.3)
    sl = [(142, 268), (128, 300), (112, 340), (98, 372), (132, 380), (160, 376), (160, 330), (156, 290)]
    c.outlined('r', sl, 1.2)
    arm = [(196, 262), (214, 268), (226, 262), (234, 270), (226, 288), (212, 300), (198, 292)]
    c.outlined('r', arm, 1.1)
    sl2 = [(212, 296), (226, 288), (230, 320), (234, 352), (214, 356), (208, 320)]
    c.outlined('r', sl2, 1.1)
    for f in ([(158, 262), (166, 300), (168, 360)], [(178, 262), (184, 320), (186, 388)], [(196, 300), (198, 388)], [(130, 330), (150, 372)], [(116, 352), (140, 374)], [(166, 300), (188, 312), (198, 300)]):
        c.line(f, 0.9)
    c.mass('paper', [(166, 260), (178, 260), (172, 278)], wob=0.2)
    c.line([(162, 260), (174, 282), (186, 260)], 1.0)
    c.mass('p', [(150, 330), (210, 326), (210, 336), (150, 340)], wob=0.3)
    c.line([(150, 330), (210, 326)], 0.9); c.line([(150, 340), (210, 336)], 0.9)
    c.outlined('fl', [(226, 262), (236, 256), (242, 264), (236, 274)], 1.0)                 # hand on the shaft
    hak = [(146, 390), (214, 388), (214, 410), (206, 424), (180, 422), (156, 426), (142, 414)]
    c.outlined('p', hak, 1.2)
    for f in ([(170, 392), (168, 420)], [(190, 392), (192, 420)]):
        c.line(f, 0.9)
    c.outlined('y', [(158, 424), (176, 424), (174, 434), (160, 434)], 1.0)
    c.outlined('y', [(186, 420), (204, 420), (204, 430), (188, 430)], 1.0)
    # frog: leaping up toward the willow (body diagonal, head at the upper right, forelegs reaching)
    c.outlined('o', [(96, 444), (118, 446), (128, 456), (112, 466), (130, 470), (126, 478), (102, 474), (92, 460)], 1.1)   # right hind leg (folded)
    c.outlined('o', [(62, 462), (48, 474), (34, 482), (30, 490), (44, 492), (60, 480), (72, 468)], 1.1)                   # left hind leg
    fb = [(50, 456), (52, 436), (66, 418), (84, 404), (102, 398), (114, 406), (112, 424), (100, 444), (82, 460), (64, 468)]
    c.outlined('o', fb, 1.3)
    c.mass('y', [(62, 452), (70, 436), (86, 424), (96, 428), (88, 446), (72, 458)], wob=0.3)
    c.outlined('o', [(84, 410), (78, 396), (76, 382), (82, 380), (86, 394), (92, 404)], 1.0)       # foreleg up
    c.outlined('o', [(64, 428), (48, 420), (34, 414), (34, 408), (50, 412), (68, 418)], 1.0)       # foreleg out to the left
    for (x, y, a) in [(79, 380, -1.7), (33, 411, 3.1), (30, 490, 2.6), (128, 474, 0.3)]:
        for t in (-0.5, 0.0, 0.5):
            c.stroke([(x, y), (x + 8 * math.cos(a + t), y + 8 * math.sin(a + t))], 1.6, 0.7)
    c.outlined('y', ellipse(104, 400, 5.5, 5.5, 0, 14), 1.0)
    c.stroke([(103, 400), (106, 400)], 3.0, 2.4)
    c.line([(112, 414), (104, 420)], 0.9)
    for (x, y) in [(64, 444), (78, 432), (92, 418)]:
        c.mass('br', ellipse(x, y, 3, 2.4, 0.6, 10), wob=0.2)
    # ground and the stakes
    gr = [(60, 516), (120, 498), (190, 480), (250, 466), (310, 456), (310, 520), (60, 520)]
    c.mass('k', gr); c.line(gr[:5], 1.3)
    c.line([(150, 506), (230, 486), (300, 474)], 0.8)
    for post in ([(204, 462), (218, 452), (244, 500), (232, 510)], [(254, 444), (276, 440), (278, 512), (256, 514)]):
        c.outlined('o', post, 1.2)
        for k in (0.33, 0.66):
            a = (post[0][0] * (1 - k) + post[1][0] * k, post[0][1] * (1 - k) + post[1][1] * k)
            b = (post[3][0] * (1 - k) + post[2][0] * k, post[3][1] * (1 - k) + post[2][1] * k)
            c.line([a, b], 0.8)
    c.outlined('y', ellipse(265, 442, 11, 4, -0.1, 16), 0.9)
    c.outlined('y', ellipse(211, 457, 8, 4, -0.6, 16), 0.9)
    return c


# ====================================================================== 桐に鳳凰
def kiri_houou():
    c = Card('kiri-houou', seed=331)
    # sky: yellow with radiating lines, a red halo ring behind the bird
    c.mass('y', [(14, 14), (310, 14), (310, 120), (14, 120)], smooth=False, wob=0.6)
    for a in np.linspace(-2.9, -0.25, 15):
        c.line([(160 + 120 * math.cos(a), 150 + 130 * math.sin(a)), (160 + 260 * math.cos(a), 150 + 260 * math.sin(a))], 1.1)
    halo_o = ellipse(160, 160, 158, 148, 0, 90)
    c.mass('r', halo_o, wob=0.6)
    c.line([(160 + 158 * math.cos(a), 160 + 148 * math.sin(a)) for a in np.linspace(3.2, 6.25, 50)], 1.3)
    # purple plumage: a great ring of scale feathers
    halo_i = ellipse(162, 168, 144, 134, 0, 90)
    c.mass('p', halo_i, wob=0.6)
    c.line([(162 + 144 * math.cos(a), 168 + 134 * math.sin(a)) for a in np.linspace(3.3, 6.5, 50)], 1.2)
    # the hollow in the middle of the ring (paper)
    hole = [(150, 180), (180, 170), (214, 196), (236, 236), (262, 262), (300, 276), (310, 300), (14, 300), (14, 250), (60, 250), (110, 246), (140, 226)]
    c.cut('p', hole); c.cut('r', hole)
    c.line([(150, 180), (184, 176), (214, 200), (236, 238), (262, 262), (300, 276)], 1.3)
    for r_ in range(6):
        R0 = 136 - r_ * 16
        for i in range(12):
            a0 = -3.0 + i * 0.30 + (r_ % 2) * 0.15
            pts = []
            for t in np.linspace(0, 1, 6):
                a = a0 + t * 0.42
                R = R0 - t * 10 + 3 * math.sin(t * 3)
                pts.append((162 + R * math.cos(a), 168 + R * 0.93 * math.sin(a)))
            if pts[-1][1] > 196 and pts[-1][0] < 220:
                continue
            if any((p[0] - 88) ** 2 / 80 ** 2 + (p[1] - 160) ** 2 / 92 ** 2 < 1 for p in pts):
                continue   # not over the head
            c.line(pts, 1.0, taper=(0.1, 0.5))
    # head: red, crest of points with roundels, eye, hooked bill down-right, curled jowls
    head = [(14, 150), (26, 124), (44, 110), (52, 98), (56, 72), (70, 96), (82, 90), (90, 60), (102, 88), (114, 84), (122, 66), (130, 94),
            (146, 96), (156, 84), (156, 112), (164, 132), (166, 154), (156, 172), (146, 196), (132, 212), (126, 232), (110, 246), (94, 236),
            (80, 248), (62, 244), (50, 232), (34, 236), (20, 224), (14, 200)]
    c.outlined('r', head, 1.4)
    for (x, y) in [(70, 116), (88, 106), (108, 108), (126, 116), (142, 130)]:
        c.line(list(ellipse(x, y, 4.5, 4.5, 0, 14)), 1.1, closed=True, taper=(0, 0))
    # eye: long almond with a dark pupil, brow line sweeping back
    eye = [(96, 146), (110, 136), (128, 136), (140, 144), (126, 152), (108, 152)]
    c.outlined('y', eye, 1.3)
    c.outlined('k', ellipse(120, 144, 5.5, 6, 0, 14), 0.9)
    c.line([(84, 132), (104, 126), (128, 126), (146, 134)], 1.3)
    c.line([(80, 160), (98, 158)], 0.9); c.line([(78, 172), (96, 168)], 0.9)
    bill = [(134, 160), (150, 150), (166, 160), (172, 180), (170, 204), (160, 194), (150, 182), (138, 176)]
    c.outlined('y', bill, 1.2)
    for (x, y, r) in [(40, 220, 9), (66, 228, 10), (96, 226, 9), (118, 214, 8), (34, 186, 9), (60, 196, 9)]:
        c.line([(x + r * (1 - t / 7) * math.cos(t), y + r * (1 - t / 7) * math.sin(t)) for t in np.linspace(0, 5.5, 14)], 1.1)
    # red tail plumes: long pointed crescents
    for (pts, wv) in [([(20, 250), (46, 268), (78, 290)], 8), ([(14, 300), (40, 314), (70, 322)], 6),
                      ([(164, 300), (200, 272), (246, 240)], 9), ([(180, 318), (230, 300), (282, 270)], 7)]:
        up, dn, d, nn = band(pts, wv)
        n = len(d)
        prof = [math.sin(math.pi * min(1, (i + 1) / n * 0.95)) for i in range(n)]
        up = [d[i] + nn[i] * wv * prof[i] for i in range(n)]; dn = [d[i] - nn[i] * wv * prof[i] for i in range(n)]
        c.mass('r', up + dn[::-1], smooth=False, wob=0.3)
        c.line(up + dn[::-1], 1.1, closed=True, smooth=False, taper=(0, 0))
        c.line(list(d[2:-2]), 0.7)
    # paulownia flowers: purple bells and bud spikes on fine stems
    for stem in ([(124, 380), (122, 300), (124, 262)], [(60, 380), (62, 350)], [(180, 370), (182, 318)]):
        c.line(stem, 1.2)
    for (x, y, a) in [(124, 262, 0), (102, 284, -0.6), (148, 290, 0.7), (100, 314, -0.6), (142, 318, 0.6), (60, 350, 0), (44, 360, -0.6), (182, 318, 0), (166, 336, -0.6), (196, 342, 0.6), (76, 366, 0.6)]:
        b = ellipse(x, y, 6, 10, a, 16)
        c.outlined('p', b, 1.0, wob=0.2)
    star = [(110, 320), (118, 336), (136, 332), (126, 346), (134, 362), (116, 356), (104, 368), (102, 352), (86, 346), (100, 338)]
    c.outlined('p', star, 1.1, wob=0.2)
    c.line([(110, 342), (112, 350)], 0.9)
    # broad dark leaves with veins, yellow ground at the foot
    c.outlined('y', [(14, 470), (80, 462), (150, 476), (220, 468), (310, 462), (310, 512), (14, 512)], 1.1)
    def heart(cx, cy, s_, rot):
        base = [(0, 1.0), (-0.35, 0.82), (-0.7, 0.72), (-0.95, 0.4), (-1.05, 0.0), (-0.9, -0.45), (-0.55, -0.8), (-0.2, -0.92), (0, -0.8), (0.2, -0.92), (0.55, -0.8), (0.9, -0.45), (1.05, 0.0), (0.95, 0.4), (0.7, 0.72), (0.35, 0.82)]
        return [tuple(p) for p in xf([(x * s_ * 1.1, y * s_) for x, y in base], dx=cx, dy=cy, rot=rot)]
    L1 = heart(70, 440, 58, 3.3)
    L2 = heart(196, 448, 66, 3.0)
    L3 = heart(280, 396, 64, 2.7)
    for L in (L1, L3, L2):
        c.mass('k', L); c.line(L, 1.3, closed=True)
    for (a, b) in [((60, 494), (78, 386)), ((198, 512), (194, 384)), ((300, 450), (262, 336))]:
        c.line([a, b], 1.0)
        for t in (0.3, 0.55, 0.8):
            px_, py_ = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
            c.line([(px_, py_), (px_ - 22, py_ - 10)], 0.8); c.line([(px_, py_), (px_ + 22, py_ - 10)], 0.8)
    return c


# ====================================================================== 菊に盃
def kiku_sakazuki():
    c = Card('kiku-sakazuki', seed=441)
    rng = c.rng
    # red clouds across the top, spilling down the right edge
    cl = [(60, 14), (310, 14), (310, 142), (292, 140), (282, 112), (270, 92), (244, 84), (214, 72), (200, 54), (170, 56), (140, 50), (110, 46), (78, 40), (60, 30)]
    c.mass('r', cl, wob=0.7)
    for (x, y) in [(84, 30), (116, 34), (146, 38), (178, 42), (206, 44), (232, 56), (258, 70), (282, 90), (296, 120), (260, 40), (290, 50), (220, 28)]:
        r = rng.uniform(10, 15)
        c.line([(x + r * math.cos(t), y + r * 0.85 * math.sin(t)) for t in np.linspace(-0.3, 3.4, 12)], 1.1)
        c.line([(x + r * 0.45 * (1 - t / 9) * math.cos(t), y + r * 0.4 * (1 - t / 9) * math.sin(t)) for t in np.linspace(0, 6.5, 12)], 0.9)
    c.line(cl[2:], 1.3)

    def lobed(cx, cy, s, rot):
        base = [(0, 1.0), (-0.45, 0.8), (-0.9, 0.9), (-1.0, 0.45), (-0.75, 0.1), (-1.05, -0.3), (-0.85, -0.75), (-0.4, -0.7), (-0.1, -1.05), (0.35, -0.75), (0.85, -0.85), (1.05, -0.35), (0.75, 0.05), (1.0, 0.45), (0.85, 0.9), (0.4, 0.8)]
        return xf([(x * s, y * s) for x, y in base], dx=cx, dy=cy, rot=rot)
    for (x, y, s, r) in [(66, 182, 62, 0.15), (186, 222, 58, -0.2), (86, 372, 48, 0.1)]:
        L = lobed(x, y, s, r)
        c.mass('k', L, wob=1.0); c.line(list(L), 1.3, closed=True)
        c.line([(x, y + s * 0.95), (x, y), (x + s * 0.1, y - s * 0.8)], 1.0)
        for t in (-0.5, 0.0, 0.4):
            c.line([(x, y + t * s * 0.6), (x - s * 0.6, y + t * s * 0.6 - s * 0.35)], 0.9)
            c.line([(x, y + t * s * 0.6), (x + s * 0.6, y + t * s * 0.6 - s * 0.35)], 0.9)
    for p in ([(18, 506), (30, 460), (44, 420), (66, 400)], [(176, 134), (170, 170), (160, 200)], [(40, 440), (60, 420)]):
        c.stroke(p, 5.0, 3.2, ink='k', taper=(0.03, 0.1)); c.line(p, 0.8)

    # side-view bloom at the top: a fan of red and yellow petals out of a calyx
    for i in range(13):
        a = math.pi * (1.05 + i * 0.075)
        L = 64 * rng.uniform(0.86, 1.04)
        f = xf([(10, -5), (L * 0.6, -8), (L, -2), (L, 3), (L * 0.6, 8), (10, 5)], dx=176, dy=140, rot=a)
        c.outlined('r' if i % 2 else 'y', f, 1.0, wob=0.2)
    c.outlined('k', [(160, 134), (192, 134), (184, 150), (168, 150)], 1.0)
    # the big pompom bloom: rounded petals in rings, red and yellow
    cx, cy = 76, 270
    for ring, (R, n, w_) in enumerate([(54, 16, 9.5), (40, 13, 8.5), (26, 10, 7.5), (12, 6, 6.5)]):
        for i in range(n):
            a = i * 2 * math.pi / n + ring * 0.25
            pet = ellipse(cx + R * math.cos(a), cy + R * 0.95 * math.sin(a), w_ * 1.7, w_, a, 16)
            c.outlined('r' if (i + ring) % 2 else 'y', pet, 1.0, wob=0.2)
    # the sake cup: red lacquer, tilted toward us, a boat-shaped bowl on a foot, 寿 brushed inside
    bowl = [(118, 284), (150, 276), (200, 278), (246, 294), (282, 330), (302, 392), (262, 398), (214, 386), (172, 362), (140, 330)]
    c.outlined('r', bowl, 1.5)
    c.line([(140, 330), (180, 366), (230, 388), (300, 396)], 1.2)
    c.line([(150, 340), (200, 374), (260, 392)], 1.0)
    foot = [(146, 340), (214, 386), (216, 418), (150, 382)]
    c.outlined('r', foot, 1.3)
    c.line([(150, 382), (216, 418)], 1.0)

    def K(pts, ox=208, oy=318, s=0.78, rot=0.28):
        cr, sr = math.cos(rot), math.sin(rot)
        return [(ox + (x - 50) * s * cr - (y - 50) * s * sr, oy + (x - 50) * s * sr + (y - 50) * s * cr) for x, y in pts]
    strokes = [
        (K([(36, 14), (52, 12), (66, 11)]), 4.2, 3.0),
        (K([(26, 28), (50, 25), (76, 23), (70, 30)]), 4.4, 2.2),
        (K([(14, 43), (48, 39), (88, 36)]), 5.0, 3.0),
        (K([(50, 2), (52, 22), (50, 40)]), 4.8, 3.4),
        (K([(50, 40), (42, 56), (28, 72), (12, 84)]), 5.0, 1.0),
        (K([(34, 60), (62, 57), (88, 53)]), 4.6, 3.0),
        (K([(72, 44), (74, 70), (72, 94), (60, 86)]), 5.2, 1.8),
        (K([(42, 67), (49, 76)]), 5.4, 2.4),
    ]
    for pts, w0, w1 in strokes:
        c.stroke(pts, w0, w1, ink='line', taper=(0.1, 0.3), press=0.25)
    # ground: black mound and yellow grass with curling blades
    gr = [(14, 470), (60, 452), (110, 440), (150, 446), (190, 470), (226, 490), (250, 516), (14, 516)]
    c.mass('k', gr); c.line(gr[:7], 1.3)
    c.line([(40, 494), (100, 480), (160, 486)], 0.9)
    c.outlined('y', [(150, 444), (176, 440), (220, 460), (260, 484), (300, 498), (296, 512), (250, 516), (212, 488), (180, 466)], 1.0)
    for i in range(6):
        y = 452 + i * 9
        c.line([(150 + i * 14, y), (190 + i * 16, y - 4), (220 + i * 14, y + 6), (240 + i * 12, y - 2)], 0.9)
    return c


ALL = [matsu_tsuru, yanagi_michikaze, kiri_houou, kiku_sakazuki]

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    only = sys.argv[2:] if len(sys.argv) > 2 else None
    os.makedirs(out, exist_ok=True)
    for f in ALL:
        card = f()
        if only and card.name not in only:
            continue
        print_card(card, os.path.join(out, card.name + '.png'), scale=float(os.environ.get('HF_SCALE', 4)))
        print('ok', card.name)

#!/usr/bin/env python3
"""雀華：牌を置く「手」のメッシュを作る（mahjong/hand.js）。2026-11-14（Fable）
使い方: python3 mahjong/tools/hand-gen.py          （numpy だけで動く）

元のモデル：WebXR Input Profiles の generic-hand（right.glb、MIT License、Copyright (c) 2019 Amazon。
  https://github.com/immersive-web/webxr-input-profiles ／ npm @webxr-input-profiles/assets 1.0.20）。hand-src/ に原本とライセンス。
ユーザー（2026-11-14）：よりリアルに。MIT でクレジットを付けて使ってよい。→ それまでの手続き生成の手をやめ、このモデルに差し替え。

ここでやること：関節を曲げて牌を置くポーズにし、スキニングを焼き込んで静的なメッシュにする。女性の細い手に寄せて幅と厚みを少し詰める。
2026-11-15（ユーザー：肌の質感向上・無駄なポリゴンの最適化・ネイルを破綻なく美しく。指のしわは強調しない＝若い姫の綺麗な手）：
  ・指先（末節）を細める ・長い爪が牌に刺さらないよう、指を寝かせて腹で牌を押さえるポーズに（置く形・つまむ形とも。爪が牌に入らないことを確認して表示）
  ・爪は仕上がりの肌に合わせて作り、絵を貼るための uv を持つ（絵は実行時 table3d.js nailArt） ・袖に隠れる腕を切り、平らな所の面を間引く
調整用：HAND_POSE（置く形の曲げ角の JSON）、HAND_DRY=1（置く形の確認だけ）、HAND_FAST=1（つまむ形の探索を短く）
出力は右手・手のひら下。原点＝指先が押さえる点（牌の上面の中心）、−z が指先の向き、+z が手首、+y が上、単位は牌の幅。
"""
import base64, json, math, os, struct
SKIN_TRIS = 4600      # 肌の面の数の目標（細分割後 約9000 → 平らな所を間引く）
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
raw = open(os.path.join(HERE, 'hand-src', 'right.glb'), 'rb').read()
jl = struct.unpack('<I', raw[12:16])[0]; J = json.loads(raw[20:20 + jl]); BIN = raw[20 + jl + 8:]
def acc(i):
    a = J['accessors'][i]; bv = J['bufferViews'][a['bufferView']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
    dt = {5120: 'i1', 5121: 'u1', 5122: '<i2', 5123: '<u2', 5125: '<u4', 5126: '<f4'}[a['componentType']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0); st = bv.get('byteStride')
    if st: return np.stack([np.frombuffer(BIN, dt, n, off + k * st) for k in range(a['count'])]).astype(float)
    return np.frombuffer(BIN, dt, a['count'] * n, off).reshape(a['count'], n).astype(float)
pr = J['meshes'][0]['primitives'][0]; A = pr['attributes']
V = acc(A['POSITION']); N = acc(A['NORMAL']); JI = acc(A['JOINTS_0']).astype(int); JW = acc(A['WEIGHTS_0']); F = acc(pr['indices']).astype(int).reshape(-1, 3)
JW = JW / JW.sum(1, keepdims=True)
skin = J['skins'][0]; names = [J['nodes'][j]['name'] for j in skin['joints']]; jpos = {J['nodes'][j]['name']: np.array(J['nodes'][j]['translation'], float) for j in skin['joints']}
idx = {n: i for i, n in enumerate(names)}
# 各指の背側（爪のある側）の向き：関節の向き（WebXR の規約：+Y が背側）から。親指は手の甲とは別の向き（横〜後ろ）を向いている
_jq = {J['nodes'][j]['name']: np.array(J['nodes'][j].get('rotation', [0, 0, 0, 1]), float) for j in skin['joints']}
def dors(n): q = _jq[n]; u = q[:3]; v = np.array([0, 1., 0]); return v + 2 * np.cross(u, np.cross(u, v) + q[3] * v)
FING = [(x, x + '-finger-phalanx-distal', x + '-finger-tip') for x in ('index', 'middle', 'ring', 'pinky')] + [('thumb', 'thumb-phalanx-distal', 'thumb-tip')]
sstep = lambda a, b, x: (lambda t: t * t * (3 - 2 * t))(np.clip((x - a) / (b - a), 0, 1))
# 指先を細く（ユーザー 2026-11-15「指先のモデリング精査」）：元モデルは末節が太く丸い。女性の指らしく、末節を先へ向かって細める
# （幅を多め、厚みを少し）。骨の軸のまわりで縮めるので長さは変わらない。中節もわずかに細める。
for f, dn, tn in FING:
    a0, b0 = jpos[dn], jpos[tn]; d0 = b0 - a0; L = np.linalg.norm(d0); d0 = d0 / L
    up0 = dors(dn); up0 = up0 - d0 * (up0 @ d0); up0 /= np.linalg.norm(up0); sd0 = np.cross(d0, up0)
    wj = np.zeros(len(V))
    for c in range(4): wj += np.where((JI[:, c] == idx[dn]) | (JI[:, c] == idx[tn]), JW[:, c], 0)
    q = V - a0; al = q @ d0 / L; k = wj * sstep(-.1, 1.0, al)
    V = V - np.outer((q @ sd0) * k * .17, sd0) - np.outer((q @ up0) * k * .09, up0)
S = 27.0
PHI = .9; NT = 7
BED = (0., .05, .14, .34, .62, .88); FREE = (.14, .3, .46, .62, .78, .9, .97, 1.)
def nail_shell(fi, dn, tn, ext, samp=None):     # samp: 仕上がりの肌（細分割後）の頂点を、この指の末節の元の空間へ戻したもの。あればそれに合わせる
    a0, b0 = jpos[dn], jpos[tn]; d0 = b0 - a0; L = np.linalg.norm(d0); d0 = d0 / L
    up0 = dors(dn); up0 = up0 - d0 * (up0 @ d0); up0 /= np.linalg.norm(up0); sd0 = np.cross(d0, up0)
    wj = np.zeros(len(V))
    for c in range(4): wj += np.where((JI[:, c] == idx[dn]) | (JI[:, c] == idx[tn]), JW[:, c], 0)
    q = V - a0; al = q @ d0 / L; h = q @ up0; lt = q @ sd0
    fa = wj > .5; alE = al[fa].max(); xs, ch, rh, cl, rl = [], [], [], [], []
    if samp is not None:
        rr = max(np.abs(lt[fa]).max(), np.abs(h[fa]).max()) * 1.12
        q = samp - a0; al = q @ d0 / L; h = q @ up0; lt = q @ sd0; fa = np.ones(len(samp), bool); alE = al.max()
    for a_ in np.linspace(alE * .40, alE * .88, 9 if samp is None else 14):           # 末節の断面（中心と縦横の半径）を骨に沿って直線で当てはめる
        k = fa & (np.abs(al - a_) < alE * (.05 if samp is None else .035))
        if k.sum() < (6 if samp is None else 10): continue
        xs.append(a_); ch.append((h[k].max() + h[k].min()) / 2); rh.append((h[k].max() - h[k].min()) / 2); cl.append((lt[k].max() + lt[k].min()) / 2); rl.append((lt[k].max() - lt[k].min()) / 2)
    xs = np.array(xs); tp_ = np.array(ch) + np.array(rh); r_ = np.abs(tp_ - np.poly1d(np.polyfit(xs, tp_, 1))(xs)); ok_ = r_ <= max(3 * np.median(r_), 1.5e-4)     # 外れた断面は捨てる
    xs = xs[ok_]; ch, rh, cl, rl = [np.array(y)[ok_] for y in (ch, rh, cl, rl)]
    xs = np.array(xs); fit = lambda y: np.poly1d(np.polyfit(xs, np.array(y), 1))
    Fch, Frh, Fcl, Frl = fit(ch), fit(rh), fit(cl), fit(rl)
    ex = ext / (L * S)
    s0, sE, s1 = alE * (.42 if fi == 0 else .36), alE * .86, alE + ex
    rows = [(s0 + (sE - s0) * b, None) for b in BED] + [(sE + (s1 - sE) * t, t) for t in FREE]
    ns = len(rows); iE = len(BED) - 1; top = np.zeros((ns, NT, 3)); bot = np.zeros((ns, NT, 3)); UV = np.zeros((ns, NT, 2))
    sP, cP = math.sin(PHI), 1 - math.cos(PHI); OE = .046 * L
    hwE = (Frl(sE) + OE) * sP; sagE = (Frh(sE) + OE) * cP; ytE = Fch(sE) + Frh(sE) + OE
    slope = min(0., (Fch.deriv()(sE) + Frh.deriv()(sE))) * .5      # 指先の先は、爪床の傾きの半分でまっすぐ伸びる（下へ巻き込まない）
    def sect(sv):                                                  # 骨に沿った位置 sv での断面：半幅・反りの深さ・てっぺんの高さ・中心の横位置
        if sv <= sE:
            b = (sv - s0) / (sE - s0); off = L * (.03 + .016 * sstep(0., .3, b)); kw = .5 + .5 * math.sqrt(max(0., 1 - (1 - min(1., max(0., b) / .34)) ** 2))   # 付け根：丸い甘皮の線。肌には沈めず、ごく薄く浮かせる
            return min((Frl(sv) + off) * sP, hwE * 1.1) * kw, (Frh(sv) + off) * (1 - math.cos(PHI * kw)), Fch(sv) + Frh(sv) + off, Fcl(sv)     # （付け根が指先よりずっと広い指＝親指は、幅を抑える）
        t = (sv - sE) / (s1 - sE); kw = (1 - .36 * t ** 1.3) * (1. if t < .9 else math.sqrt(max(0., 1 - ((t - .9) / .1 * .72) ** 2)))
        return hwE * kw, sagE * kw * (1 - .2 * t), ytE + slope * (sv - sE) * L, Fcl(sE)
    hwM = max(sect(sv)[0] for sv, t in rows)
    for i, (sv, t) in enumerate(rows):
        hw, sag, yt, c_l = sect(sv)
        for j in range(NT):
            u = -1 + 2 * j / (NT - 1); ph = u * PHI
            l = c_l + hw * math.sin(ph) / sP; y = yt - sag * (1 - math.cos(ph)) / cP
            top[i, j] = a0 + d0 * (sv * L) + up0 * y + sd0 * l
            T = L * (.05 if t is not None and t > 0 else .12)                      # 厚み（指先の中の列は深く沈めて継ぎ目を隠す）
            bot[i, j] = top[i, j] - up0 * T
            UV[i, j] = ((fi + .5 + .45 * (hw / hwM) * math.sin(ph) / sP) / 5, (sv - s0) / (s1 - s0))
    def under(X):                                                  # 爪床の下の肌：爪の面より上に出ている頂点を、面の少し下まで押し下げる量（背側の向きに沿って、負）
        q = X - a0; sv = q @ d0 / L; h = q @ up0; lt = q @ sd0; dh = np.zeros(len(X))
        for k in np.where((sv > s0) & (sv < sE + (alE - sE) * .6))[0]:
            hw, sag, yt, c_l = sect(sv[k]); x = (lt[k] - c_l) / hw
            if abs(x) >= 1: continue
            lim = yt - sag * (1 - math.sqrt(1 - (x * sP) ** 2)) / cP - .02 * L
            if h[k] > lim: dh[k] = lim - h[k]
        return np.outer(dh, up0)
    nb = ns * NT; P = np.concatenate([top.reshape(-1, 3), bot.reshape(-1, 3)]); U2 = np.concatenate([UV.reshape(-1, 2)] * 2); Fs = []; ftop = []
    for i in range(ns - 1):
        for j in range(NT - 1):
            v0 = i * NT + j; Fs += [(v0, v0 + NT, v0 + 1), (v0 + 1, v0 + NT, v0 + NT + 1)]; ftop += [1, 1]
            if i >= iE: w0 = nb + v0; Fs += [(w0, w0 + 1, w0 + NT), (w0 + 1, w0 + NT + 1, w0 + NT)]; ftop += [0, 0]
    path = [(i, NT - 1) for i in range(iE, ns)] + [(ns - 1, j) for j in range(NT - 2, -1, -1)] + [(i, 0) for i in range(ns - 2, iE - 1, -1)]
    for k in range(len(path) - 1):                     # 自由縁の側面
        a, b = path[k], path[k + 1]; ia, ib = a[0] * NT + a[1], b[0] * NT + b[1]
        Fs += [(ia, nb + ia, ib), (ib, nb + ia, nb + ib)]; ftop += [0, 0]
    Fs = np.array(Fs)
    if np.cross(P[Fs[0, 1]] - P[Fs[0, 0]], P[Fs[0, 2]] - P[Fs[0, 0]]) @ up0 < 0: Fs = Fs[:, ::-1]     # 表が外を向くように（片面で描く）
    used = np.unique(Fs); rm = -np.ones(len(P), int); rm[used] = np.arange(len(used))
    if samp is not None: print('   nail', fi, 'fit rings', len(xs), 'top resid', np.round(np.array(ch) + np.array(rh) - (Fch(xs) + Frh(xs)), 5).tolist())
    return P[used], rm[Fs], U2[used], ((sE - s0) / (s1 - s0), (s1 - s0) * L / (hwM * .92), hwE / hwM), (under, np.array(ftop, bool))
NAILS = [("thumb", .17), ("index", .21), ("middle", .21), ("ring", .2), ("pinky", .17)]     # 先へ伸びる長さ（牌の幅が1）
NSH = []; vE = {}
for fi, (f, ext) in enumerate(NAILS):
    _, dn, tn = [x for x in FING if x[0] == f][0]
    Pm, Fs, U2, ve, tp = nail_shell(fi, dn, tn, ext); NSH.append((f, dn, Pm, Fs, U2, None)); vE[f] = [round(float(x), 3) for x in ve]     # 爪ごと：［自由縁が始まる v, 長さ÷いちばん広い所の半幅, 自由縁の始まりの幅÷いちばん広い幅］（実行時に絵を描くときの寸法）

OFF = np.array([0, .015, .14])      # 原点（牌の上面の中心）から見た、指の腹の位置（寝かせた指：指先の関節より手前で触れる）
def rot(axis, ang):
    a = axis / np.linalg.norm(axis); c, s = math.cos(ang), math.sin(ang); x, y, z = a
    return np.array([[c + x * x * (1 - c), x * y * (1 - c) - z * s, x * z * (1 - c) + y * s], [y * x * (1 - c) + z * s, c + y * y * (1 - c), y * z * (1 - c) - x * s], [z * x * (1 - c) - y * s, z * y * (1 - c) + x * s, c + z * z * (1 - c)]])

# 関節ごとの変換（回転 R と平行移動 t：v' = R v + t）。指の付け根から先へ、曲げを積み上げる
D = {n: (np.eye(3), np.zeros(3)) for n in names}
PALM = np.array([-1., 0, 0])                         # 手のひらの向き（モデルの −x）
def curl(chain, angles, spread=0.0):
    R, t = np.eye(3), np.zeros(3)
    for k, name in enumerate(chain[:-1]):
        p = R @ jpos[name] + t; q = R @ jpos[chain[k + 1]] + t; d = (q - p) / np.linalg.norm(q - p)
        ax = np.cross(d, R @ PALM); r = rot(ax, angles[k])             # 先が手のひら側へ（下の assert で確認）
        if k == 0 and spread: r = rot(R @ PALM, spread) @ r
        R, t = r @ R, r @ (t - p) + p
        for m in chain[k:]: D[m] = (R.copy(), t.copy())
F4 = lambda f: [f + '-finger-phalanx-proximal', f + '-finger-phalanx-intermediate', f + '-finger-phalanx-distal', f + '-finger-tip']
def tipd(a, b): return float(np.linalg.norm((D[a][0] @ jpos[a] + D[a][1]) - (D[b][0] @ jpos[b] + D[b][1])))
def closer(chain, angles, amount, to):          # 横への寄せは、相手（to）に近づく向きを選ぶ
    best = None
    for sg in (1, -1):
        curl(chain, angles, sg * amount); d = tipd(chain[-1], to)
        if best is None or d < best[0]: best = (d, sg)
    curl(chain, angles, best[1] * amount)
POSE = json.loads(os.environ.get('HAND_POSE', 'null')) or {'index': (.30, .15, -.26), 'middle': (.27, .15, -.24), 'ring': (.22, .12, -.12), 'pinky': (.10, .20, 0.), 'thumb': (-.25, .15, .10), 'pitch': -.26}
curl(F4('index'), POSE['index'])
curl(F4('middle'), POSE['middle'])
closer(F4('ring'), POSE['ring'], .05, 'middle-finger-tip')
closer(F4('pinky'), POSE['pinky'], .16, 'ring-finger-tip')
closer(['thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip'], POSE['thumb'], POSE.get('thumbS', .42), 'index-finger-phalanx-proximal')

P = np.zeros_like(V); NN = np.zeros_like(N)
for c in range(4):
    for j in range(len(names)):
        m = JI[:, c] == j
        if not m.any(): continue
        R, t = D[names[j]]; w = JW[m, c][:, None]
        P[m] += w * (V[m] @ R.T + t); NN[m] += w * (N[m] @ R.T)
tip = lambda n: D[n][0] @ jpos[n] + D[n][1]
# 確認：曲げた指先は元より手のひら側（PALM の向き）にあること。逆に反っていたら止める（2026-11-14 に符号を間違えて甲側へ反らせた）
for f in ('index', 'middle', 'ring', 'pinky'):
    n = f + '-finger-tip'; assert (tip(n) - jpos[n]) @ PALM > .01, ('finger bends the wrong way', f)

# モデル (x=厚み・甲が+, y=指先が−, z=幅・親指が−) → リグ (x=幅, y=上, z=手首が+)。幅と厚みを少し詰めて細く
S = 27.0; SL = np.array([.92, .9, 1.0])
def rig(v): v = np.asarray(v, float); return np.stack([v[..., 2], v[..., 0], v[..., 1]], -1) * S * SL
def rign(v): v = np.asarray(v, float); o = np.stack([v[..., 2], v[..., 0], v[..., 1]], -1) / SL; return o / np.linalg.norm(o, axis=-1, keepdims=True)
PITCH = POSE['pitch']
def pit(v): y = v[..., 1] * math.cos(PITCH) - v[..., 2] * math.sin(PITCH); z = v[..., 1] * math.sin(PITCH) + v[..., 2] * math.cos(PITCH); return np.stack([v[..., 0], y, z], -1)
out = pit(rig(P)); nor = pit(rign(NN))
# 人差し指と中指の先の「腹」（先端付近でいちばん低い所）の中点を原点へ
def pad(f):
    c = pit(rig(tip(f + '-finger-tip'))); m = np.linalg.norm(out - c, axis=1) < .42; return np.array([c[0], out[m][:, 1].min(), c[2] + .12])
ipad = pad('index'); grip = (ipad + pad('middle')) / 2
out = out - grip + OFF

def report(tag, Dm, X, A):     # 指ごとに：末節の傾き（水平から下へ、度）、指の肌のいちばん低い所、爪のいちばん低い所、牌の中に入った爪の頂点
    for f, dn, Pm, Fs, U2, _ft in NSH:
        tn = [x for x in FING if x[0] == f][0][2]; a = to_out(jpos[dn][None], Dm, dn, A)[0]; b = to_out(jpos[tn][None], Dm, dn, A)[0]; d = (b - a) / np.linalg.norm(b - a)
        ch = [idx[n] for n in names if n.startswith(f) and 'metacarpal' not in n]; w = sum(np.where(JI[:, c] == j, JW[:, c], 0) for c in range(4) for j in ch) > .5
        Xn = to_out(Pm, Dm, dn, A); ins = (np.abs(Xn[:, 0]) < .5) & (np.abs(Xn[:, 2]) < .68) & (Xn[:, 1] < -.01) & (Xn[:, 1] > -GAP + .02)
        print('  %s %-6s slope %5.1f  skin min y %6.3f  nail min y %6.3f  nail in tile %d  tip xz %.2f %.2f' % (tag, f, math.degrees(math.asin(-d[1])), X[w, 1].min(), Xn[:, 1].min(), ins.sum(), Xn[:, 0].mean(), Xn[:, 2].min()))
GAP = 0.78 / 0.84; RgA = np.eye(3); gA = grip
def to_out(Pm, Dm, dn, A):
    R, t = Dm[dn]; X = pit(rig(Pm @ R.T + t))
    return X @ RgA.T - gA + OFF if A else X - grip + OFF
report('lay', D, out, False); _pw = sum(np.where(JI[:, c] == j, JW[:, c], 0) for c in range(4) for j in [idx[n] for n in names if 'phalanx' in n or n.endswith('tip')]) < .3
print('  lay palm min y:', round(float(out[_pw, 1].min()), 3), 'at z', round(float(out[_pw][out[_pw, 1].argmin(), 2]), 2))
if os.environ.get('HAND_DRY'): raise SystemExit
# 爪：各指の末節で、背側・先のほうの頂点
col = np.tile(np.array([234, 199, 184], float), (len(V), 1)); isn = np.zeros(len(V), bool)
for f, dn, tn in [(x, x + '-finger-phalanx-distal', x + '-finger-tip') for x in ('index', 'middle', 'ring', 'pinky')] + [('thumb', 'thumb-phalanx-distal', 'thumb-tip')]:
    a = pit(rig(tip(dn))) - grip + OFF; b = pit(rig(tip(tn))) - grip + OFF; d = (b - a); L = np.linalg.norm(d); d /= L
    up = pit(rign(D[dn][0] @ dors(dn))); up = up - d * (up @ d); up /= np.linalg.norm(up)
    if f == 'thumb': side = np.cross(d, up); up = up * .55 - side * .83 if False else up
    q = out - a; al = q @ d / L; h = q @ up; lat = np.linalg.norm(q - np.outer(q @ d, d) - np.outer(h, up), axis=1)
    wj = np.zeros(len(V));
    for c in range(4): wj += np.where((JI[:, c] == idx[dn]) | (JI[:, c] == idx[tn]), JW[:, c], 0)
    m = (wj > .5) & (al > .38) & (al < 1.12) & (h > .02) & (lat < .22)
    isn |= m
    wr = np.exp(-(np.linalg.norm(out - b, axis=1) / .45) ** 2)[:, None]; col = col * (1 - wr * .5) + np.array([236, 168, 160]) * wr * .5   # 指先の赤み
pass   # (the nail bed stays skin coloured: the long nail lies over it)

# ---- つまむポーズ（ユーザー 2026-11-14：親指と人差し指で向かい合わせにつまみ、親指が牌の下面を支え、人差し指を上面に添える）----
# 置くポーズ（上の、親指が横にある形）と同じ面の並びのまま、親指だけを牌の下へ回した形をもう一つ作る（実行時に二つの間を動かす）。
# 親指の付け根の回転（3）と、先の二つの関節の曲げ（軸の向き 1 ＋ 角度 2）を、条件に合うように探す（乱数は固定）。
# （つまむ形では人差し指・中指も置く形より深く曲げる：置く形のままでは親指の付け根から牌の下まで届かない。手全体の位置は、
#  つまむ形でも「人差し指と中指の腹の中点」が原点に来るように合わせ直す。→ 二つのポーズは全頂点が違う）
TH = ['thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip']; thj = [idx[n] for n in TH]
wth = sum(np.where(JI[:, c] == j, JW[:, c], 0) for c in range(4) for j in thj); tm = wth > .01
wdi = sum(np.where(JI[:, c] == j, JW[:, c], 0) for c in range(4) for j in thj[2:]) > .6
DB = {n: (D[n][0].copy(), D[n][1].copy()) for n in names}            # 置くポーズ（あとで戻す）
def thumbD(q):
    rv = np.array(q[:3]); a = np.linalg.norm(rv); R = rot(rv, a) if a > 1e-6 else np.eye(3); p0 = jpos[TH[0]]; t = p0 - R @ p0
    D[TH[0]] = (R, t)
    for k, fl in ((1, q[4]), (2, q[5])):
        p = R @ jpos[TH[k]] + t; d = R @ jpos[TH[k + 1]] + t - p; d /= np.linalg.norm(d)
        u = np.cross(d, R @ PALM); u /= np.linalg.norm(u); v = np.cross(d, u); r = rot(math.cos(q[3]) * u + math.sin(q[3]) * v, fl)
        R, t = r @ R, r @ (t - p) + p
        for n in TH[k:]: D[n] = (R, t)
def RG(q):                                     # つまむ形での手全体の向き：指の向きを軸にしたひねり（親指側を下げる）と、手首の上げ下げ
    c, s_ = math.cos(q[9]), math.sin(q[9]); c2, s2 = math.cos(q[10]), math.sin(q[10])
    return np.array([[c, -s_, 0], [s_, c, 0], [0, 0, 1.]]) @ np.array([[1., 0, 0], [0, c2, -s2], [0, s2, c2]])
def _sg(chain, angles, amount, to):
    closer(chain, angles, amount, to); a = tipd(chain[-1], to); curl(chain, angles, amount); return amount if abs(tipd(chain[-1], to) - a) < 1e-9 else -amount
PSP = (_sg(F4('ring'), (.3, .42, .1), .05, 'middle-finger-tip'), _sg(F4('pinky'), (.26, .36, .1), .16, 'ring-finger-tip'))
def poseA(q):                                  # q: 親指 6 ＋ 人差し指の曲げ 3（中指は少しだけ深く）＋ 手全体のひねり・上げ下げ 2
    thumbD(q); curl(F4('index'), q[6:9]); curl(F4('middle'), (q[6] + .03, q[7] + .03, q[8])); curl(F4('ring'), (.3, .42, .1), PSP[0]); curl(F4('pinky'), (.26, .36, .1), PSP[1])   # （つまむ形では薬指・小指を軽く握る：長い爪が卓や隣の牌に触れない）
    Rs = np.stack([D[n][0] for n in names]); ts = np.stack([D[n][1] for n in names]); Pq = np.zeros_like(V)
    for c in range(4): Pq += JW[:, c][:, None] * (np.einsum('nij,nj->ni', Rs[JI[:, c]], V) + ts[JI[:, c]])
    Rg = RG(q); X = pit(rig(Pq)) @ Rg.T; g = []
    for f in ('index', 'middle'):
        c = Rg @ pit(rig(tip(f + '-finger-tip'))); m = np.linalg.norm(X - c, axis=1) < .42; g.append(np.array([c[0], X[m][:, 1].min(), c[2] + .12]))
    return X - (g[0] + g[1]) / 2 + OFF, (g[0] - g[1])[0] / 2, (g[0] + g[1]) / 2
GAP = 0.78 / 0.84                              # 牌の厚み（リグの単位。実行時に手を .84 倍にしている）
nth = isn & tm
def cost(q):
    X, ipx, _g = poseA(q); Y = X[wdi]; ym = Y[:, 1].max(); w = np.exp((Y[:, 1] - ym) / .06); c = (Y[:, [0, 2]] * w[:, None]).sum(0) / w.sum()
    foot = (np.abs(X[:, 0]) < .62) & (X[:, 2] < .42) & (X[:, 2] > -1.2) & (X[:, 1] > -GAP + .015)
    ins = foot & np.where(tm, X[:, 1] < .35, X[:, 1] < -.05)                                          # 牌（親指は、その上の指にも）にめり込む分
    d = RG(q) @ (pit(rig(tip('index-finger-tip'))) - pit(rig(tip('index-finger-phalanx-distal')))); d /= np.linalg.norm(d)
    e = 12 * (ym + GAP) ** 2 + .6 * ((c - np.array([ipx * .5, .2])) ** 2).sum() + 40 * ((X[ins, 1] + GAP) ** 2).sum() / len(X) + .03 * float(np.sum(np.array(q[:3]) ** 2)) + .12 * q[9] ** 2 + .1 * q[10] ** 2
    e += 3 * max(0., abs(d[1]) - .42) ** 2 + 2 * max(0., d[2] + .3) ** 2                             # 人差し指の先は寝かせて前（−z）へ向ける（腹で上面に添える）
    dt = RG(q) @ (pit(rig(tip('thumb-tip'))) - pit(rig(tip('thumb-phalanx-distal')))); dt /= np.linalg.norm(dt)
    e += 3 * max(0., abs(dt[1]) - .6) ** 2                                                           # 親指の先も寝かせる（腹で下面を支える。突き立てない）
    e += 2 * max(0., Y[:, 2].mean() - .45) ** 2 + 2 * max(0., abs(Y[:, 0].mean()) - .5) ** 2         # 親指の先の節は牌の下に入っている
    if nth.any(): e += 12 * max(0., X[nth, 1].mean() - (Y[:, 1].mean() - .12)) ** 2                    # 親指の爪は下（腹が上）
    Rg = RG(q)
    for f, dn, Pm, Fs, U2, _ft in NSH:                                                                    # 長い爪：牌にめり込まない、下へ垂れすぎない
        R, t = D[dn]; Xn = pit(rig(Pm @ R.T + t)) @ Rg.T - _g + OFF
        if f in ('index', 'middle'):
            m = (np.abs(Xn[:, 0]) < .56) & (np.abs(Xn[:, 2]) < .74) & (Xn[:, 1] > -GAP)
            e += 150 * float(np.sum(np.maximum(0., .06 - Xn[m, 1]) ** 2)) / len(Xn)
        if f == 'thumb':
            m = (np.abs(Xn[:, 0]) < .56) & (np.abs(Xn[:, 2]) < .74)
            e += 150 * float(np.sum(np.maximum(0., Xn[m, 1] + GAP + .05) ** 2)) / len(Xn)
        if f in ('ring', 'pinky'): e += 6 * float(np.mean(np.maximum(0., -.3 - Xn[:, 1]) ** 2))
    return e
rng = np.random.RandomState(7); cands = []
def clampq(q): q = list(q); q[4] = min(1.2, max(-.3, q[4])); q[5] = min(1.0, max(-.3, q[5])); q[6:8] = [min(1.5, max(0., x)) for x in q[6:8]]; q[8] = min(1.2, max(-.32, q[8])); q[9] = min(.85, max(-.85, q[9])); q[10] = min(.8, max(-.8, q[10])); return q
print('thumb nail verts', int(nth.sum()))
FAST = bool(os.environ.get('HAND_FAST'))
for _ in range(300 if FAST else 8000):
    rv = rng.normal(size=3); rv *= rng.uniform(0, 2.0) / np.linalg.norm(rv)
    q = clampq(list(rv) + [rng.uniform(0, 6.283), rng.uniform(-.2, 1.2), rng.uniform(-.2, 1.0), rng.uniform(.2, 1.4), rng.uniform(.0, 1.3), rng.uniform(-.3, .7), rng.uniform(-.85, .85), rng.uniform(-.8, .8)])
    cands.append((cost(q), q))
cands.sort(key=lambda x: x[0]); best = None
for e0, q0 in cands[:6]:                       # よい出だしをいくつか、それぞれ詰める
    cur = (e0, q0); sg = .2
    for it in range(100 if FAST else 2500):
        q = clampq(np.array(cur[1]) + rng.normal(size=11) * sg * np.array([1, 1, 1, 1.5, 1, 1, .8, .8, .8, 1, .6])); e = cost(q)
        if e < cur[0]: cur = (e, q)
        if it % 500 == 499: sg *= .6
    if best is None or cur[0] < best[0]: best = cur
outA, _, gA = poseA(best[1]); YA = outA[wdi]; RgA = RG(best[1])
DA = {n: (D[n][0].copy(), D[n][1].copy()) for n in names}            # つまむポーズの関節（長い爪を同じように動かすため）
print('pinch: cost', round(best[0], 4), 'thumb top y', round(float(YA[:, 1].max()), 3), '(want', round(-GAP, 3), ')', 'q', np.round(best[1], 2))
assert FAST or abs(YA[:, 1].max() + GAP) < .08, 'the thumb does not reach the underside of the tile'
report('pinch', DA, outA, True)
for n in names: D[n] = DB[n]

# ---- 肌らしく（ユーザー 2026-11-14「ポリゴン感が強い」）：面を細かく丸め（Loop 細分割 1 回）、色に肌のむらを入れる ----
def loop_subdivide(P, C, NL, F, P2):          # P2: もう一つのポーズ（同じ並びで細分割する）
    # 同じ位置の頂点をまとめる（元モデルは継ぎ目で頂点が分かれている）
    key = {}; rm = np.zeros(len(P), int); 
    for i, v in enumerate(np.round(P, 5)):
        rm[i] = key.setdefault(tuple(v), len(key))
    n0 = len(key); P0 = np.zeros((n0, 3)); C0 = np.zeros((n0, C.shape[1])); N0 = np.ones(n0, bool); cnt = np.zeros(n0)
    np.add.at(P0, rm, P); np.add.at(C0, rm, C); np.add.at(cnt, rm, 1); P0 /= cnt[:, None]; C0 /= cnt[:, None]
    for i in range(len(P)): N0[rm[i]] &= bool(NL[i])
    Q0 = np.zeros((n0, 3)); np.add.at(Q0, rm, P2); Q0 /= cnt[:, None]
    F = rm[F]; F = F[(F[:, 0] != F[:, 1]) & (F[:, 1] != F[:, 2]) & (F[:, 0] != F[:, 2])]
    ed = {}                                   # 辺 → [向かいの頂点…]
    for a, b, c in F:
        for u, v, w in ((a, b, c), (b, c, a), (c, a, b)): ed.setdefault((min(u, v), max(u, v)), []).append(w)
    nb = [set() for _ in range(n0)]; bnb = [set() for _ in range(n0)]
    for (u, v), o in ed.items():
        nb[u].add(v); nb[v].add(u)
        if len(o) == 1: bnb[u].add(v); bnb[v].add(u)
    E = np.zeros((n0, 3)); E2 = np.zeros((n0, 3))
    for i in range(n0):
        if len(bnb[i]) == 2: q = list(bnb[i]); E[i] = .75 * P0[i] + .125 * (P0[q[0]] + P0[q[1]]); E2[i] = .75 * Q0[i] + .125 * (Q0[q[0]] + Q0[q[1]])       # 縁（手首の切り口）
        else:
            k = len(nb[i]); beta = 3 / 16 if k == 3 else 3 / (8 * k); E[i] = (1 - k * beta) * P0[i] + beta * P0[list(nb[i])].sum(0); E2[i] = (1 - k * beta) * Q0[i] + beta * Q0[list(nb[i])].sum(0)
    eid = {}; OP = []; OC = []; ON = []; OQ = []
    for (u, v), o in ed.items():
        eid[(u, v)] = n0 + len(OP)
        OP.append((P0[u] + P0[v]) / 2 if len(o) != 2 else .375 * (P0[u] + P0[v]) + .125 * (P0[o[0]] + P0[o[1]]))
        OQ.append((Q0[u] + Q0[v]) / 2 if len(o) != 2 else .375 * (Q0[u] + Q0[v]) + .125 * (Q0[o[0]] + Q0[o[1]]))
        OC.append((C0[u] + C0[v]) / 2); ON.append(N0[u] and N0[v])
    e = lambda u, v: eid[(min(u, v), max(u, v))]
    F2 = []
    for a, b, c in F:
        ab, bc, ca = e(a, b), e(b, c), e(c, a); F2 += [(a, ab, ca), (b, bc, ab), (c, ca, bc), (ab, bc, ca)]
    return np.concatenate([E, OP]), np.concatenate([C0, OC]), np.concatenate([N0, ON]), np.array(F2), np.concatenate([E2, OQ])
def vnormals(P, F):
    fnm = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]]); N = np.zeros_like(P)
    for k in range(3): np.add.at(N, F[:, k], fnm)
    return N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
nor0 = nor.copy(); out0 = out.copy()
# （関節のしわは描かない：ユーザー 2026-11-15「指の皺を強調しない。全キャラ若い姫様、手タレのように綺麗な手」）
# 各指の末節の重みを細分割に通す（仕上がりの肌から、その指の末節の頂点だけを選んで爪を合わせるため）
crs = np.zeros((len(V), 5))
for fi_, f_ in enumerate(('thumb', 'index', 'middle', 'ring', 'pinky')):
    _, dn_, tn_ = [x for x in FING if x[0] == f_][0]
    for c in range(4): crs[:, fi_] += np.where((JI[:, c] == idx[dn_]) | (JI[:, c] == idx[tn_]), JW[:, c], 0)
out, col, isn, F, outA = loop_subdivide(out, np.concatenate([col, crs], 1), isn, F, outA)
crs = col[:, 3:]; col = col[:, :3]
nor = vnormals(out, F); norA = vnormals(outA, F)
mv = np.where(np.linalg.norm(outA - out, axis=1) > 1e-4)[0]          # つまむポーズで動く頂点（親指のまわり）だけを持つ
# （向きの確認：細分割後の法線が元の法線と同じ側を向いていること）
_i = np.argmin(np.linalg.norm(out[:, None, :] - out0[None, :40, :], axis=2), axis=0); assert (np.sum(nor[_i] * nor0[:40], axis=1) > 0).mean() > .9, 'normals flipped'
# 肌の色むら：くぼみ（指の股・関節のしわ）は少し暗く赤く、出っ張りは少し明るく。関節は赤み、下面（手のひら側）は桃色
_nb = [[] for _ in range(len(out))]
for a, b, c in F: _nb[a] += [b, c]; _nb[b] += [a, c]; _nb[c] += [a, b]
_cv = np.array([((out[list(set(q))].mean(0) - out[i]) @ nor[i]) if q else 0. for i, q in enumerate(_nb)])
for _ in range(3): _cv = np.array([.5 * _cv[i] + .5 * _cv[list(set(q))].mean() if q else _cv[i] for i, q in enumerate(_nb)])
_el = np.mean(np.linalg.norm(out[F[:, 0]] - out[F[:, 1]], axis=1)); _cv = _cv / _el
skin = ~isn
dark = np.clip(_cv * 5.5, 0, 1)[:, None]; lite = np.clip(-_cv * 4.0, 0, 1)[:, None]
c2 = col * (1 - .34 * dark) + np.array([190, 120, 110]) * .34 * dark; c2 = c2 * (1 - .22 * lite) + np.array([250, 226, 212]) * .22 * lite
_o = - grip + OFF
for f in ('index', 'middle', 'ring', 'pinky', 'thumb'):
    for part, k in ((('-finger-phalanx-proximal', .34), ('-finger-phalanx-intermediate', .38), ('-finger-phalanx-distal', .22)) if f != 'thumb' else (('-phalanx-proximal', .3), ('-phalanx-distal', .3))):
        c = pit(rig(tip(f + part))) + _o; w = (np.exp(-(np.linalg.norm(out - c, axis=1) / .34) ** 2) * k * (nor[:, 1] > -.2))[:, None]   # 甲側の関節
        c2 = c2 * (1 - w * .45) + np.array([236, 172, 164]) * w * .45
under = np.clip(-nor[:, 1] * 1.4, 0, 1)[:, None] * .3; c2 = c2 * (1 - under) + np.array([238, 170, 162]) * under
col = np.where(skin[:, None], c2, col)

# ---- 袖に隠れる腕を切り落とし、平らな所の面を減らす（ユーザー 2026-11-15「無駄なポリゴンを最適化、スマホで遊びやすく」）----
# 袖口の位置（手首の関節の少し手前）と、そこの腕の太さ
wz = (pit(rig(jpos['wrist'])) - grip + OFF)
sl = wz + pit(np.array([0, 0, -.35])); AX = pit(np.array([0, 0, 1.]))
band = np.abs((out - sl) @ AX) < .35
ctr = out[band].mean(0); hw = float(np.abs(out[band][:, 0] - ctr[0]).max()); ht = float(np.abs((out[band] - ctr) @ pit(np.array([0, 1., 0]))).max())
sl = np.array([ctr[0], sl[1] + (ctr - sl) @ pit(np.array([0, 1., 0])) * math.cos(PITCH), sl[2]])
# 爪を仕上がりの肌に合わせて作り直す（細分割で肌は少し痩せる：元の粗いメッシュに合わせた爪は浮いたり沈んだりする）
def affine(Dm, dn, A):
    c = to_out(np.zeros((1, 3)), Dm, dn, A)[0]; return (to_out(np.eye(3), Dm, dn, A) - c).T, c
NSH = []; keepv = np.zeros(len(out), bool)
for fi, (f, ext) in enumerate(NAILS):
    _, dn, tn = [x for x in FING if x[0] == f][0]
    M, c = affine(DB, dn, False); sel = crs[:, fi] > .5; samp = (out[sel] - c) @ np.linalg.inv(M).T
    Pm, Fs, U2, ve, (under, ftop) = nail_shell(fi, dn, tn, ext, samp); NSH.append((f, dn, Pm, Fs, U2, ftop)); vE[f] = [round(float(x), 3) for x in ve]
    dv = under(samp); MA, _ = affine(DA, dn, True); out[sel] += dv @ M.T; outA[sel] += dv @ MA.T; print('   skin verts pressed under the nail:', int((np.abs(dv).sum(1) > 0).sum()))
    Xn = to_out(Pm, DB, dn, False); lo_, hi_ = Xn.min(0) - .06, Xn.max(0) + .06; keepv |= np.all((out > lo_) & (out < hi_), axis=1)     # 爪の下の肌は間引かない（間引くと爪を突き抜ける）
def compact(F_, *arrs):
    used = np.unique(F_); rm = -np.ones(len(arrs[0]), int); rm[used] = np.arange(len(used)); return (rm[F_],) + tuple(a[used] for a in arrs)
n_before = len(F)
F = F[((out[F] - sl) @ AX).min(1) < .55]                      # 袖の中（袖口のふた z=.06 より奥）は見えない
F, out, outA, col, crs, keepv = compact(F, out, outA, col, crs, keepv)
n_cut = len(F)
def decimate(P, Q, C, F, target, keep):
    """辺をつぶして面を減らす（頂点は元の頂点の一部だけを残す＝色や属性はそのまま）。誤差は二つのポーズの両方で測り（面からの距離の
    二乗の和）、色の違いも足す。縁（手首の切り口）の頂点は動かさない。面が裏返る・形が壊れるつぶし方はしない。"""
    import heapq
    n = len(P); F = [tuple(int(x) for x in f) for f in F]; alive = [True] * len(F)
    vf = [set() for _ in range(n)]
    for k, f in enumerate(F):
        for v in f: vf[v].add(k)
    def quad(X):
        K = np.zeros((n, 4, 4))
        for a, b, c in F:
            nm = np.cross(X[b] - X[a], X[c] - X[a]); ar = np.linalg.norm(nm)
            if ar < 1e-12: continue
            nm /= ar; pl = np.append(nm, -nm @ X[a]); M = np.outer(pl, pl)
            K[a] += M; K[b] += M; K[c] += M
        return K
    KB, KA = quad(P), quad(Q)
    ec = {}
    for a, b, c in F:
        for u, v in ((a, b), (b, c), (c, a)): ec[(min(u, v), max(u, v))] = ec.get((min(u, v), max(u, v)), 0) + 1
    bnd = np.zeros(n, bool)
    for (u, v), k in ec.items():
        if k == 1: bnd[u] = bnd[v] = True
    bnd |= keep
    nbr = lambda u: {w for k in vf[u] for w in F[k]} - {u}
    PH = np.concatenate([P, np.ones((n, 1))], 1); QH = np.concatenate([Q, np.ones((n, 1))], 1)
    def cost(u, v): return float(PH[v] @ KB[u] @ PH[v] + QH[v] @ KA[u] @ QH[v] + 2e-8 * np.sum((C[u] - C[v]) ** 2))
    ver = [0] * n; heap = []
    def push(u):
        if bnd[u]: return
        for w in nbr(u): heapq.heappush(heap, (cost(u, w), u, w, ver[u]))
    for u in range(n): push(u)
    nf = len(F); worst = 0.
    def fn(X, f): return np.cross(X[f[1]] - X[f[0]], X[f[2]] - X[f[0]])
    while heap and nf > target:
        c, u, v, st = heapq.heappop(heap)
        if st != ver[u] or not vf[u] or not vf[v]: continue
        if not any(v in F[k] for k in vf[u]): continue
        if len(nbr(u) & nbr(v)) != 2: continue
        ok = True
        for k in vf[u]:
            f = F[k]
            if v in f: continue
            g = tuple(v if x == u else x for x in f)
            for X in (P, Q):
                n0, n1 = fn(X, f), fn(X, g); l0, l1 = np.linalg.norm(n0), np.linalg.norm(n1)
                if l1 < 1e-9 or n0 @ n1 < .35 * l0 * l1: ok = False; break
                e = [np.linalg.norm(X[g[i]] - X[g[(i + 1) % 3]]) for i in range(3)]
                if l1 < .12 * max(e) ** 2: ok = False; break            # 細長い面を作らない
            if not ok: break
        if not ok: continue
        for k in list(vf[u]):
            f = F[k]
            if v in f:
                alive[k] = False; nf -= 1
                for x in f: vf[x].discard(k)
            else:
                F[k] = tuple(v if x == u else x for x in f); vf[v].add(k)
        vf[u] = set(); KB[v] += KB[u]; KA[v] += KA[u]; worst = max(worst, c)
        ver[v] += 1; push(v)
        for w in nbr(v): ver[w] += 1; push(w)
    return np.array([f for k, f in enumerate(F) if alive[k]]), worst
F, worst = decimate(out, outA, col, F, SKIN_TRIS, keepv)
F, out, outA, col, crs = compact(F, out, outA, col, crs)
print('skin tris', n_before, '-> cut', n_cut, '-> decimated', len(F), 'worst err', '%.2e' % worst)
nskin = len(out)
# 肌の薄さ（ユーザー 2026-11-15：肌の透け感）：各頂点から内側へ向かって反対側の面までの距離を測り、薄い所（指・指の股・縁）ほど 1 に近い値を
# 肌の頂点の uv.x に入れる（実行時のシェーダーが、薄い所に光が赤く透ける表現に使う）
def thinness(P, F, Nv):
    A, B, C = P[F[:, 0]], P[F[:, 1]], P[F[:, 2]]; e1, e2 = B - A, C - A; out_ = np.full(len(P), 9.)
    for i in range(len(P)):
        d = -Nv[i]; o = P[i] + d * 2e-3; h = np.cross(d, e2); a = np.einsum('ij,ij->i', e1, h); ok = np.abs(a) > 1e-9; f = np.where(ok, 1 / np.where(ok, a, 1), 0)
        sv = o - A; u = f * np.einsum('ij,ij->i', sv, h); q = np.cross(sv, e1); v = f * (q @ d); t = f * np.einsum('ij,ij->i', e2, q)
        hit = ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (t > 1e-3)
        if hit.any(): out_[i] = t[hit].min()
    return out_
_th = np.clip(1 - thinness(out, F, vnormals(out, F)) / .6, 0, 1)
_nb2 = [[] for _ in range(nskin)]
for a_, b_, c_ in F: _nb2[a_] += [b_, c_]; _nb2[b_] += [a_, c_]; _nb2[c_] += [a_, b_]
for _ in range(2): _th = np.array([.5 * _th[i] + .5 * _th[list(set(q))].mean() if q else _th[i] for i, q in enumerate(_nb2)])
print('thinness: mean %.2f, fingers>.4: %d of %d' % (_th.mean(), (_th > .4).sum(), nskin))
# 肌の陰（ユーザー 2026-11-15「まだプラスチックっぽい」）：指の股・指どうしの間・手のひら側など、まわりの肌に光をさえぎられる所を頂点ごとに測る
# （法線側の半球へ光線を飛ばし、近くの肌に当たる割合。1＝開けている、0＝ふさがれている）。肌の uv.y に入れ、シェーダーが赤みのある陰にする
def occlusion(P, F, Nv, nray=24, far=1.3):
    A, B, C = P[F[:, 0]], P[F[:, 1]], P[F[:, 2]]; e1, e2 = B - A, C - A; rs = np.random.RandomState(3); out_ = np.ones(len(P))
    u_, v_ = rs.rand(nray), rs.rand(nray); r_ = np.sqrt(u_); ph = 2 * np.pi * v_; L = np.stack([r_ * np.cos(ph), r_ * np.sin(ph), np.sqrt(1 - u_)], 1)     # 余弦で重み付けした半球
    for i in range(len(P)):
        n = Nv[i]; t1 = np.cross(n, [0, 1., 0] if abs(n[1]) < .9 else [1., 0, 0]); t1 /= np.linalg.norm(t1); t2 = np.cross(n, t1)
        Dr = L[:, :1] * t1 + L[:, 1:2] * t2 + L[:, 2:] * n; o = P[i] + n * 4e-3; occ = 0.
        sv = o - A; q = np.cross(sv, e1)
        for d in Dr:
            h = np.cross(d, e2); a = np.einsum('ij,ij->i', e1, h); ok = np.abs(a) > 1e-9; f = np.where(ok, 1 / np.where(ok, a, 1), 0)
            u = f * np.einsum('ij,ij->i', sv, h); v = f * (q @ d); t = f * np.einsum('ij,ij->i', e2, q)
            hit = ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (t > 1e-3) & (t < far)
            if hit.any(): occ += 1 - t[hit].min() / far
        out_[i] = 1 - occ / nray
    return out_
_ao = occlusion(out, F, vnormals(out, F))
for _ in range(2): _ao = np.array([.5 * _ao[i] + .5 * _ao[list(set(q))].mean() if q else _ao[i] for i, q in enumerate(_nb2)])
print('occlusion: mean %.2f min %.2f, below .7: %d of %d' % (_ao.mean(), _ao.min(), (_ao < .7).sum(), nskin))
uv = np.stack([_th, _ao], 1)     # 肌の頂点の uv ＝（薄さ, 陰）。爪の頂点は絵の uv

# ---- ネイル（ユーザー 2026-11-15、参考画像4枚：ストーン付きラメ・シアーピンク＋蝶・黒フレンチ・深海グラデ。「破綻なく美しく」）----
# 爪は1枚ずつ絵（実行時に描くテクスチャ）を貼れるよう uv を持つ：横5コマ（親指・人差し指・中指・薬指・小指）、u＝コマの中の横位置
# （爪の輪郭の形のまま）、v＝付け根 0 → 先 1。形：付け根は丸く指に沈み、爪床は指の断面に沿い、指先からはまっすぐ伸びて
# 角の丸い細身のコフィン（バレリーナ）型に細る。自由縁にだけ裏面と側面（厚み）がある。1枚 約200面（以前は1676面）。
add_o, add_a, add_f, add_uv, add_t = [], [], [], [], []
for f, dn, Pm, Fs, U2, _ft in NSH:
    base = len(out) + sum(len(x) for x in add_o)
    add_o.append(to_out(Pm, DB, dn, False)); add_a.append(to_out(Pm, DA, dn, True)); add_f.append(Fs + base); add_uv.append(U2); add_t.append(_ft)
nadd = sum(len(x) for x in add_o); nskf = len(F)
out = np.concatenate([out] + add_o); outA = np.concatenate([outA] + add_a); F2 = np.concatenate([F] + add_f); uv = np.concatenate([uv] + add_uv)
col = np.concatenate([col, np.tile(np.array([226, 182, 176], float), (nadd, 1))])
nor = vnormals(out, F2); norA = vnormals(outA, F2)
# 爪の表の法線は、表の面だけから（側面・裏面と平均すると、縁でツヤの映り込みが折れる）
_tf = F2[nskf:][np.concatenate(add_t)]; _tv = np.unique(_tf); nor[_tv] = vnormals(out, _tf)[_tv]; norA[_tv] = vnormals(outA, _tf)[_tv]
# 確認：爪が牌（原点が上面の中心、幅1・奥行1.36・厚み GAP）や卓にめり込まない／爪の表が指の中に沈んでいない
for nm_, X in (('lay', out), ('pinch', outA)):
    Xn = X[nskin:]; ins = (np.abs(Xn[:, 0]) < .5) & (np.abs(Xn[:, 2]) < .68) & (Xn[:, 1] < -.02) & (Xn[:, 1] > -GAP + .02)
    print(nm_, 'nail verts inside the tile:', int(ins.sum()), 'lowest nail y', round(float(Xn[:, 1].min()), 3))
mv = np.where(np.linalg.norm(outA - out, axis=1) > 1e-4)[0]
lo = np.minimum(out.min(0), outA.min(0)); hi = np.maximum(out.max(0), outA.max(0)); q16 = np.round((out - lo) / (hi - lo) * 65535).astype('<u2')
data = {'lo': [round(float(x), 4) for x in lo], 'hi': [round(float(x), 4) for x in hi], 'nv': int(len(out)), 'nt': int(len(F2)), 'nail': int(nskf), 'nl': vE,
        'wrist': [round(float(x), 3) for x in sl], 'wristA': [round(float(x), 3) for x in (RgA @ (sl + grip - OFF) - gA + OFF)], 'rollA': round(float(best[1][9]), 4), 'dpA': round(float(best[1][10]), 4), 'wr': [round(hw, 3), round(ht, 3)], 'pitch': PITCH,
        'p': base64.b64encode(q16.tobytes()).decode(), 'n': base64.b64encode(np.round(nor * 127).astype('i1').tobytes()).decode(),
        'mi': base64.b64encode(mv.astype('<u2').tobytes()).decode(), 'mp': base64.b64encode(np.round((outA[mv] - lo) / (hi - lo) * 65535).astype('<u2').tobytes()).decode(), 'mn': base64.b64encode(np.round(norA[mv] * 127).astype('i1').tobytes()).decode(),
        'i': base64.b64encode(F2.astype('<u2').tobytes()).decode(), 'c': base64.b64encode(col.clip(0, 255).astype('u1').tobytes()).decode(),
        'uv': base64.b64encode(np.round(uv * 65535).astype('<u2').tobytes()).decode()}
lic = open(os.path.join(HERE, 'hand-src', 'LICENSE.md')).read().strip()
dst = os.path.join(HERE, '..', 'hand.js')
open(dst, 'w').write('// 雀華：牌を置く手のメッシュ（mahjong/tools/hand-gen.py が生成。手で直さない）\n'
  '// Hand model: "generic-hand" from WebXR Input Profiles (https://github.com/immersive-web/webxr-input-profiles), posed and baked for this game.\n/*\n' + lic + '\n*/\n'
  'window.JANKA_HAND = ' + json.dumps(data, separators=(',', ':')) + ';\n')
print('verts', len(out), 'tris', len(F2), 'skin tris', nskf, 'nail tris', len(F2) - nskf, 'wrist half w/t', round(hw, 2), round(ht, 2), 'size', (hi - lo).round(2), os.path.getsize(dst) // 1024, 'KB')

#!/usr/bin/env python3
"""雀華：牌を置く「手」のメッシュを作る（mahjong/hand.js）。2026-11-14（Fable）
使い方: python3 mahjong/tools/hand-gen.py          （scikit-image と fast-simplification が必要）

ユーザー指示：女性のしなやかで細い手・とてもリアルに。
円柱をつないだ模型ではなく、骨格に沿った「なめらかにつながる肉付け」（距離関数のなめらかな和）から面を取り出す：
手の甲と母指球・小指球、指の付け根の関節の盛り上がり、3節の指（節ごとに少しくびれ、関節でわずかに太い）、指の股の水かき、
爪（指先の背に薄く乗る）、細い手首から前腕。ポーズは牌を置く形：人差し指と中指の腹が牌の上、親指が牌の横。
出力は右手・手のひら下。原点＝指先が押さえる点（牌の上面の中心）、−z が指先の向き、+z が手首、単位は牌の幅。
"""
import base64, json, math, os
import numpy as np
from skimage import measure
import fast_simplification

V = 0.035                                   # ボクセルの大きさ
X = np.arange(-2.6, 2.2, V); Y = np.arange(-2.0, 2.3, V); Z = np.arange(-2.6, 7.4, V)
PX, PY, PZ = np.meshgrid(X, Y, Z, indexing='ij')
P = np.stack([PX, PY, PZ], -1).astype(np.float32)

def smin(a, b, k):
    h = np.clip(.5 + .5 * (b - a) / k, 0, 1)
    return b + (a - b) * h - k * h * (1 - h)

def cone(a, b, r1, r2):                     # 先細りのカプセル（a 側 r1、b 側 r2）
    a = np.array(a, np.float32); b = np.array(b, np.float32); ba = b - a; l = float(np.linalg.norm(ba)); n = ba / l
    pa = P - a; t = np.clip((pa @ n) / l, 0, 1)
    d = np.linalg.norm(pa - t[..., None] * ba, axis=-1)
    return d - (r1 + (r2 - r1) * t)

def ell(c, r):                              # 楕円体（近似の距離）
    q = (P - np.array(c, np.float32)) / np.array(r, np.float32)
    return (np.linalg.norm(q, axis=-1) - 1) * min(r)

def rot(v, pitch, yaw):                     # −z 向きの単位ベクトルを、下へ pitch、横へ yaw
    x, y, z = v
    y, z = y * math.cos(pitch) - z * math.sin(pitch), y * math.sin(pitch) + z * math.cos(pitch)
    x, z = x * math.cos(yaw) + z * math.sin(yaw), -x * math.sin(yaw) + z * math.cos(yaw)
    return np.array([x, y, z])

# ---- 手のひら・甲 ----
d = ell((0, -.02, 1.42), (1.22, .36, 1.5))                       # 甲と手のひら
d = smin(d, ell((-.78, -.2, 1.85), (.56, .4, .95)), .22)         # 母指球
d = smin(d, ell((.82, -.14, 1.8), (.42, .36, .98)), .2)          # 小指球
d = smin(d, cone((0, -.04, 2.7), (0, .0, 4.3), .62, .53), .3)    # 手首
d = smin(d, cone((0, .0, 4.3), (0, .1, 7.6), .53, .8), .2)       # 前腕
# 手首・前腕は断面を少し平たく
flat = np.clip((PZ - 2.4) / 1.2, 0, 1)
d = d + flat * (np.abs(PY - .02) * .22 - .03)

# ---- 指 ----  (付け根の x, z, 長さの倍率, 横への開き, 曲げ3つ)
FING = [(-.9, .16, .95, .075, (-.42, -.52, -.34)),     # 人差し指：牌の上
        (-.3, .0, 1.0, .02, (-.44, -.55, -.36)),       # 中指：牌の上
        (.3, .1, .96, -.05, (-.5, -.62, -.4)),         # 薬指：少し深く曲げて浮かせる
        (.84, .36, .78, -.13, (-.56, -.66, -.42))]     # 小指
L = (1.12, .72, .53); R = (.212, .182, .16, .128)
tips = []; nails = []
for bx, bz, k, yaw, curl in FING:
    p = np.array([bx, .02, bz], float); pit = 0.0
    d = smin(d, ell((bx, .1, bz + .08), (.27 * k + .03, .2, .3)), .12)          # 付け根の関節の盛り上がり
    for j in range(3):
        pit += curl[j]; dirv = rot((0, 0, -1), pit, yaw); q = p + dirv * L[j] * k
        r0, r1 = R[j] * (k * .5 + .5), R[j + 1] * (k * .5 + .5)
        d = smin(d, cone(p, q, r0, r1), .1 if j == 0 else .045)
        d = smin(d, ell(p, (r0 * 1.06,) * 3), .05)                              # 関節はわずかに太い
        if j == 2:
            up = rot((0, 1, 0), pit, yaw)
            d = smin(d, ell(q - dirv * .04 - up * .02, (r1 * 1.02, r1 * .92, r1 * 1.25)), .05)   # 指先の腹
            nc = p + dirv * L[j] * k * .66 + up * (r1 * .8)
            nails.append((nc, dirv, up, r1 * .98, L[j] * k * .36))
            tips.append(q - up * r1)
        p = q

# ---- 親指 ----
tp = [np.array(v, float) for v in [(-.95, -.2, 2.0), (-1.42, -.34, 1.02), (-1.2, -.66, .32), (-.83, -.95, -.16)]]
tr = (.32, .255, .21, .16)
for j in range(3):
    d = smin(d, cone(tp[j], tp[j + 1], tr[j], tr[j + 1]), .16 if j == 0 else .05)
    d = smin(d, ell(tp[j + 1], (tr[j + 1] * 1.05,) * 3), .05)
tdir = (tp[3] - tp[2]) / np.linalg.norm(tp[3] - tp[2]); tup = np.cross(np.cross(tdir, (-.35, 1, .2)), tdir); tup /= np.linalg.norm(tup)
nails.append((tp[2] + (tp[3] - tp[2]) * .7 + tup * tr[3] * .82, tdir, tup, tr[3] * 1.0, .3))

# ---- 爪：指先の背に薄く乗る板（わずかに盛り上がる） ----
def nail_field(nc, dv, up, w, ln):
    side = np.cross(dv, up); q = P - nc.astype(np.float32)
    a = (q @ side.astype(np.float32)) / w; b = (q @ up.astype(np.float32)) / .05; c = (q @ dv.astype(np.float32)) / ln
    return (np.sqrt(a * a + b * b + c * c) - 1) * .05
for n in nails: d = smin(d, nail_field(*n), .012)

verts, faces, _, _ = measure.marching_cubes(d, 0.0, spacing=(V, V, V))
verts = verts + np.array([X[0], Y[0], Z[0]])
faces = faces[:, ::-1].copy()               # 外向き
print('marching cubes:', len(verts), 'verts', len(faces), 'tris')
verts, faces = fast_simplification.simplify(verts.astype(np.float32), faces.astype(np.int32), target_count=9000)
print('simplified:', len(verts), 'verts', len(faces), 'tris')

# 手全体を手首へ向かって持ち上げ（指先が下）、中指と人差し指の腹の中点を原点（牌の上面）へ
PITCH = -0.24
def place(v):
    v = np.array(v, float); y = v[..., 1] * math.cos(PITCH) - v[..., 2] * math.sin(PITCH); z = v[..., 1] * math.sin(PITCH) + v[..., 2] * math.cos(PITCH)
    return np.stack([v[..., 0], y, z], -1)
grip = place((tips[0] + tips[1]) / 2)
out = place(verts) - grip + np.array([0, .02, -.18])
# 爪の頂点（爪の板の内側）と色：指先・関節は少し赤み、手のひら側は少し明るく
isn = np.zeros(len(verts), bool)
for nc, dv, up, w, ln in nails:
    side = np.cross(dv, up); q = verts - nc
    isn |= ((q @ side / (w * .93)) ** 2 + (q @ dv / (ln * .96)) ** 2 < 1) & (q @ up > -.03) & (q @ up < .2)
col = np.tile(np.array([212, 160, 134], float), (len(verts), 1))
for q in [t for t in tips] + [tp[3]]:
    w = np.exp(-(np.linalg.norm(verts - q, axis=1) / .32) ** 2)[:, None]; col = col * (1 - w * .5) + np.array([216, 138, 124]) * w * .5
col[isn] = (238, 158, 172)
fn = isn[faces].sum(1) >= 2
faces = np.concatenate([faces[~fn], faces[fn]])
lo = out.min(0); hi = out.max(0); q16 = np.round((out - lo) / (hi - lo) * 65535).astype('<u2')
data = {'lo': [round(float(x), 4) for x in lo], 'hi': [round(float(x), 4) for x in hi], 'nv': int(len(out)), 'nt': int(len(faces)), 'nail': int((~fn).sum()),
        'wrist': [round(float(x), 3) for x in (place(np.array([0, .06, 6.2])) - grip + np.array([0, .02, -.18]))], 'pitch': PITCH,
        'p': base64.b64encode(q16.tobytes()).decode(), 'i': base64.b64encode(faces.astype('<u2').tobytes()).decode(), 'c': base64.b64encode(col.clip(0, 255).astype('u1').tobytes()).decode()}
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'hand.js')
open(dst, 'w').write('// 雀華：牌を置く手のメッシュ（mahjong/tools/hand-gen.py が生成。手で直さない）\nwindow.JANKA_HAND = ' + json.dumps(data, separators=(',', ':')) + ';\n')
print('wrote', os.path.normpath(dst), os.path.getsize(dst) // 1024, 'KB', 'nail tris', int(fn.sum()))
np.save('/tmp/work/hand_v.npy', out); np.save('/tmp/work/hand_f.npy', faces); np.save('/tmp/work/hand_c.npy', col)

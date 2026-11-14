#!/usr/bin/env python3
"""雀華：牌を置く「手」のメッシュを作る（mahjong/hand.js）。2026-11-14（Fable）
使い方: python3 mahjong/tools/hand-gen.py          （numpy だけで動く）

元のモデル：WebXR Input Profiles の generic-hand（right.glb、MIT License、Copyright (c) 2019 Amazon。
  https://github.com/immersive-web/webxr-input-profiles ／ npm @webxr-input-profiles/assets 1.0.20）。hand-src/ に原本とライセンス。
ユーザー（2026-11-14）：よりリアルに。MIT でクレジットを付けて使ってよい。→ それまでの手続き生成の手をやめ、このモデルに差し替え。

ここでやること：関節を曲げて牌を置くポーズにし（人差し指・中指の腹が牌の上、薬指・小指は少し深く曲げる）、スキニングを焼き込んで
静的なメッシュにする。女性の細い手に寄せて幅と厚みを少し詰める。爪の位置の頂点に色を付ける。
出力は右手・手のひら下。原点＝指先が押さえる点（牌の上面の中心）、−z が指先の向き、+z が手首、+y が上、単位は牌の幅。
"""
import base64, json, math, os, struct
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
curl(F4('index'), (.50, .52, .32))
curl(F4('middle'), (.52, .54, .32))
closer(F4('ring'), (.66, .64, .38), .05, 'middle-finger-tip')
closer(F4('pinky'), (.78, .68, .42), .16, 'ring-finger-tip')
closer(['thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip'], (.16, .26, .24), .42, 'index-finger-phalanx-proximal')

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
PITCH = -0.26
def pit(v): y = v[..., 1] * math.cos(PITCH) - v[..., 2] * math.sin(PITCH); z = v[..., 1] * math.sin(PITCH) + v[..., 2] * math.cos(PITCH); return np.stack([v[..., 0], y, z], -1)
out = pit(rig(P)); nor = pit(rign(NN))
# 人差し指と中指の先の「腹」（先端付近でいちばん低い所）の中点を原点へ
def pad(f):
    c = pit(rig(tip(f + '-finger-tip'))); m = np.linalg.norm(out - c, axis=1) < .42; return np.array([c[0], out[m][:, 1].min(), c[2] + .12])
grip = (pad('index') + pad('middle')) / 2
out = out - grip + np.array([0, .015, -.12])

# 爪：各指の末節で、背側・先のほうの頂点
col = np.tile(np.array([214, 164, 138], float), (len(V), 1)); isn = np.zeros(len(V), bool)
for f, dn, tn in [(x, x + '-finger-phalanx-distal', x + '-finger-tip') for x in ('index', 'middle', 'ring', 'pinky')] + [('thumb', 'thumb-phalanx-distal', 'thumb-tip')]:
    a = pit(rig(tip(dn))) - grip + np.array([0, .015, -.12]); b = pit(rig(tip(tn))) - grip + np.array([0, .015, -.12]); d = (b - a); L = np.linalg.norm(d); d /= L
    up = pit(rign(D[dn][0] @ np.array([1., 0, 0]))); up = up - d * (up @ d); up /= np.linalg.norm(up)
    if f == 'thumb': side = np.cross(d, up); up = up * .55 - side * .83 if False else up
    q = out - a; al = q @ d / L; h = q @ up; lat = np.linalg.norm(q - np.outer(q @ d, d) - np.outer(h, up), axis=1)
    wj = np.zeros(len(V));
    for c in range(4): wj += np.where((JI[:, c] == idx[dn]) | (JI[:, c] == idx[tn]), JW[:, c], 0)
    m = (wj > .5) & (al > .38) & (al < 1.12) & (h > .02) & (lat < .22)
    isn |= m
    wr = np.exp(-(np.linalg.norm(out - b, axis=1) / .45) ** 2)[:, None]; col = col * (1 - wr * .45) + np.array([218, 140, 126]) * wr * .45   # 指先の赤み
col[isn] = (238, 160, 174)
fn = isn[F].sum(1) >= 3
F2 = np.concatenate([F[~fn], F[fn]])
# 袖口の位置（手首の関節の少し手前）と、そこの腕の太さ
wz = (pit(rig(jpos['wrist'])) - grip + np.array([0, .015, -.12]))
sl = wz + pit(np.array([0, 0, -.35]))
band = np.abs((out - sl) @ pit(np.array([0, 0, 1.]))) < .35
ctr = out[band].mean(0); hw = float(np.abs(out[band][:, 0] - ctr[0]).max()); ht = float(np.abs((out[band] - ctr) @ pit(np.array([0, 1., 0]))).max())
sl = np.array([ctr[0], sl[1] + (ctr - sl) @ pit(np.array([0, 1., 0])) * math.cos(PITCH), sl[2]])
lo = out.min(0); hi = out.max(0); q16 = np.round((out - lo) / (hi - lo) * 65535).astype('<u2')
data = {'lo': [round(float(x), 4) for x in lo], 'hi': [round(float(x), 4) for x in hi], 'nv': int(len(out)), 'nt': int(len(F2)), 'nail': int((~fn).sum()),
        'wrist': [round(float(x), 3) for x in sl], 'wr': [round(hw, 3), round(ht, 3)], 'pitch': PITCH,
        'p': base64.b64encode(q16.tobytes()).decode(), 'n': base64.b64encode(np.round(nor * 127).astype('i1').tobytes()).decode(),
        'i': base64.b64encode(F2.astype('<u2').tobytes()).decode(), 'c': base64.b64encode(col.clip(0, 255).astype('u1').tobytes()).decode()}
lic = open(os.path.join(HERE, 'hand-src', 'LICENSE.md')).read().strip()
dst = os.path.join(HERE, '..', 'hand.js')
open(dst, 'w').write('// 雀華：牌を置く手のメッシュ（mahjong/tools/hand-gen.py が生成。手で直さない）\n'
  '// Hand model: "generic-hand" from WebXR Input Profiles (https://github.com/immersive-web/webxr-input-profiles), posed and baked for this game.\n/*\n' + lic + '\n*/\n'
  'window.JANKA_HAND = ' + json.dumps(data, separators=(',', ':')) + ';\n')
print('verts', len(out), 'tris', len(F2), 'nail tris', int(fn.sum()), 'nail verts', int(isn.sum()), 'wrist half w/t', round(hw, 2), round(ht, 2), 'size', (hi - lo).round(2), os.path.getsize(dst) // 1024, 'KB')

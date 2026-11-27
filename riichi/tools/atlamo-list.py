# riichi/atlamo.js を作り直す：images/atlas/av/<種>-<0..2>.webp がそろっている種（ボスを除く）と、atlas/avatars/*.js の名前
# 使い方：リポジトリ直下で python3 riichi/tools/atlamo-list.py
import re, glob, os, json
names = {}
for f in glob.glob('atlas/avatars/*.js') + ['atlas/avatars3d.js']:
    s = open(f).read()
    for m in re.finditer(r"(?:D|Avatars3D\.define|tileAv)\('([a-z0-9]+)',\s*\{\s*name:\s*\{\s*ja:\s*'([^']*)',\s*en:\s*'([^']*)'", s):
        names[m.group(1)] = (m.group(2), m.group(3))
sp = sorted({re.sub(r'-\d\.webp$', '', x) for x in os.listdir('images/atlas/av') if not x.startswith('boss-')})
L = [[x, *names[x]] for x in sp if x in names and all(os.path.exists(f'images/atlas/av/{x}-{t}.webp') for t in range(3))]
open('riichi/atlamo.js', 'w').write('/* 大百科の麻雀（riichi/）の CPU の席に出すアトラモ（2026-11-28 ユーザー「CPUもランダムに今いるアトラモを」）。\n   images/atlas/av/<種>-<0..2>.webp がそろっている種と、その名前（atlas/avatars/*.js の name）。作り直し：python3 riichi/tools/atlamo-list.py */\nwindow.RIICHI_ATLAMO = ' + json.dumps(L, ensure_ascii=False) + ';\n')
print(len(L), 'species')

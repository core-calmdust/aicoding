#!/usr/bin/env python3
"""atlas/kindart.js from the 2D games' own rule cards (ゲーム tab of each game's new-game dialog).
The data (kx.json) is read off the 2D pages in a browser: for each game and language, each card's key, name, level tags,
description, group heading (+ its sub line) and, in Japanese, its picture (an inline SVG, class styles inlined).
Usage: python3 atlas/tools/kindart.py kx.json  → writes atlas/kindart.js"""
import json, sys, os, re
src = json.load(open(sys.argv[1]))
out = {}
for g, by in src.items():
    ja = by.get('ja') or []
    if not ja: continue
    def fix(svg):   # pictures the 2D page links to: from the portal (atlas/) they live in ../<game>/
        svg = svg.replace('http://localhost:8765/', '../')
        svg = re.sub(r'<image[^>]*href="blob:[^"]*"[^>]*>(</image>)?', '', svg)
        svg = re.sub(r'((?:xlink:)?href)="(?!data:|#|https?:|\.\./)([^"]+)"', lambda m: f'{m.group(1)}="../{g}/{m.group(2)}"', svg)
        return re.sub(r'\s+', ' ', svg)
    art = {c['key']: fix(c['art']) for c in ja if c.get('art')}
    tx, grp = {}, {}
    for lang, cards in by.items():
        if not cards: continue
        tx[lang] = {c['key']: {k: v for k, v in (('n', c['name']), ('t', c['tags']), ('d', c['desc'])) if v} for c in cards}
        G = []
        for c in cards:
            if not G or G[-1][0] != c['gh']: G.append([c['gh'], c['gd'], []])
            G[-1][2].append(c['key'])
        grp[lang] = G
    out[g] = {'art': art, 'tx': tx, 'grp': grp}
p = os.path.join(os.path.dirname(__file__), '..', 'kindart.js')
with open(p, 'w') as f:
    f.write('/* 種目 cards of the 3D cards: the 2D games\' own rule cards (pictures, names, level tags, descriptions, groups) — made by atlas/tools/kindart.py; do not edit by hand */\n')
    f.write('window.AtlasKinds = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(p, os.path.getsize(p))

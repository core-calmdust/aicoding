#!/usr/bin/env python3
"""Build checkers/i18n.js from tools/i18n/<lang>.json (UI) and tools/i18n/content_<lang>.json (lessons / puzzles / openings)."""
import json, os
here = os.path.dirname(os.path.abspath(__file__))
LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar', 'ru', 'zh-TW', 'id', 'tr']
NEW = ('ru', 'zh-TW', 'id', 'tr')   # added 2026-11 (written in the spaced JSON style, as they were first added)
out = {}
for l in LANGS:
    d = {}
    for name in (f'{l}.json', f'content_{l}.json'):
        p = os.path.join(here, 'i18n', name)
        if os.path.exists(p): d.update(json.load(open(p, encoding='utf-8')))
    if d: out[l] = d
js = '// UI strings for Checkers — ja / en / zh (Simplified) / ko / es / fr / pt / de / hi / ar (built by tools/build_i18n.py)\nwindow.I18N = {\n'
def line(l):
    k = f"'{l}'" if '-' in l else l
    if l in NEW: return k + ': { ' + json.dumps(out[l], ensure_ascii=False, separators=(', ', ': '))[1:-1] + ' }'
    return k + ': ' + json.dumps(out[l], ensure_ascii=False, separators=(',', ':'))
js += ',\n'.join(line(l) for l in out) + '\n};\n'
open(os.path.join(here, '..', 'i18n.js'), 'w', encoding='utf-8').write(js)
print('i18n.js', {l: len(out[l]) for l in out})

#!/usr/bin/env python3
"""Build hex/i18n.js from tools/i18n/<lang>.json (UI) and tools/i18n/content_<lang>.json (lessons / puzzles / openings)."""
import json, os
here = os.path.dirname(os.path.abspath(__file__))
LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar']
out = {}
for l in LANGS:
    d = {}
    for name in (f'{l}.json', f'content_{l}.json'):
        p = os.path.join(here, 'i18n', name)
        if os.path.exists(p): d.update(json.load(open(p, encoding='utf-8')))
    if d: out[l] = d
# every language must have every key of en (the page falls back to en, but a missing key is a bug)
miss = {l: sorted(set(out['en']) - set(out[l])) for l in out if l != 'en'}
for l, m in miss.items():
    if m: print('missing', l, len(m), m[:8])
js = '// UI strings for Hex — ja / en / zh (Simplified) / ko / es / fr / pt / de / hi / ar (built by tools/build_i18n.py)\nwindow.I18N = {\n'
js += ',\n'.join(f'{l}: ' + json.dumps(out[l], ensure_ascii=False, separators=(',', ':')) for l in out) + '\n};\n'
open(os.path.join(here, '..', 'i18n.js'), 'w', encoding='utf-8').write(js)
print('i18n.js', {l: len(out[l]) for l in out})

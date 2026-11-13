#!/usr/bin/env python3
"""Build a claude.ai Artifact bundle of 雀華 from mahjong/index.html.

  python3 mahjong/tools/build-artifact.py OUT_DIR

Writes OUT_DIR/index.html (the whole page; janka.html is the same without the document skeleton) plus the scripts, three.js, the tile sheets,
stylesheet and character images it references. Images are served from img/ instead of ../images/mahjong/.
Prints the {published path: source path} map for the Artifact `files` parameter as JSON.
"""
import json, os, re, shutil, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # mahjong/
ROOT = os.path.dirname(HERE)
out = os.path.abspath(sys.argv[1])
os.makedirs(out, exist_ok=True)

src = open(os.path.join(HERE, 'index.html'), encoding='utf-8').read()
head = re.search(r'<head>(.*?)</head>', src, re.S).group(1)
body = re.search(r'<body>(.*?)</body>', src, re.S).group(1)

title = re.search(r'<title>.*?</title>', head).group(0)
links = '\n'.join(re.findall(r'<link [^>]*(?:fonts\.googleapis|fonts\.gstatic|stylesheet)[^>]*>', head))
links = re.sub(r'href="app\.css\?v=\d+"', 'href="app.css"', links)

files = {}
# local scripts -> published next to the page
def local_script(m):
    name = m.group(1)
    files[name] = os.path.join(HERE, name)
    return f'<script src="{name}"></script>'
body = re.sub(r'<script src="([a-z0-9]+\.js)\?v=\d+"></script>', local_script, body)
# three.js (r186 + the compatibility layer, 2026-11-14): the page loads it from ../atlas/vendor/ — in the bundle it sits next to the page
body = re.sub(r'<script>/\* three\.js.*?</script>', '<script src="three-r186.min.js"></script><script src="three-compat.js"></script>', body, flags=re.S)
for f in ('three-r186.min.js', 'three-compat.js'):
    files[f] = os.path.join(ROOT, 'atlas', 'vendor', f)
# ../shared/*.js -> shared-*.js next to the page; scripts that are not in the repository are dropped
def shared_script(m):
    name = 'shared-' + m.group(1)
    files[name] = os.path.join(ROOT, 'shared', m.group(1))
    return f'<script src="{name}"{m.group(2) or ""}></script>'
body = re.sub(r'<script src="\.\./shared/([a-z0-9]+\.js)\?v=\w+"( defer)?></script>', shared_script, body)
body = re.sub(r'<script src="img/tex/[^"]+"></script>\n?', '', body)
body = body.replace('href="../"', 'href="https://core-calmdust.github.io/aicoding/" target="_blank" rel="noopener"')
body = body.replace('<script src="app.js"></script>', '<script>window.JANKA_ASSETS = "img/";</script>\n<script src="app.js"></script>')
files['app.css'] = os.path.join(HERE, 'app.css')

page = f"""{title}
<meta name="theme-color" content="#120d22">
{links}
<style>:root{{color-scheme:dark}} html,body{{background:#120d22;height:100%}}</style>
{body.strip()}
"""
open(os.path.join(out, 'janka.html'), 'w', encoding='utf-8').write(page)
# index.html: the same page as a whole document (what the Artifact serves)
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write('<!DOCTYPE html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + page.split('<div', 1)[0] + '</head>\n<body>\n<div' + page.split('<div', 1)[1] + '\n</body>\n</html>\n')

# character images
chara = os.path.join(ROOT, 'images', 'mahjong', 'chara')
for f in sorted(os.listdir(chara)):
    if f.endswith('.webp'):
        files[f'img/chara/{f}'] = os.path.join(chara, f)

# the tile sheets (tiles.js reads them from JANKA_ASSETS + 'tiles/' in the bundle)
for f in ('shanghai-glyphs.png', 'shanghai-art.png'):
    files[f'img/tiles/{f}'] = os.path.join(ROOT, 'atlas', 'img', f)

# copy everything into OUT_DIR so the publish sources sit under one root
fmap = {}
for pub, srcp in files.items():
    dst = os.path.join(out, pub)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(srcp, dst)
    fmap[pub] = pub
print(json.dumps(fmap, ensure_ascii=False))

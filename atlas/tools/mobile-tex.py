# 画像の配信用の版を作る（2026-11-15、テクスチャ容量の調査 claude/texture-size-audit.md から）
#   1) PNG のシート（将棋の駒・字、上海の絵・字、COMET+ のロゴ）→ 同じ名前の WebP ロスレス（画素は完全に同じ）。PNG は作業用の元として残す
#      （書き出しツールは PNG を読み書きする）。ページが読むのは WebP。
#   2) スマホ（pointer: coarse / lite）用の半分サイズ <名前>-h.webp：3D の盤の画像（将棋・碁・象棋・本榧・ペグの盤面）と、
#      焼き込みテクスチャ atlas/img/tex/b/ のうちサイズ名のない大きいもの（2M画素以上）。スマホはこれまで原寸を読んで半分に縮めていた。
#      b/ の一覧は atlas/img/tex/baked.js の window.ATLAS_TEXH（key → 版）に書く。
# 元の画像を変えたら（texbake.py・xiangqi-tex.py・shogi-tex.html・各シートのツールのあと）実行する：python3 atlas/tools/mobile-tex.py
import glob, json, os, re, sys
from PIL import Image
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
P = lambda *a: os.path.join(ROOT, *a)

PNG = ['images/atlas/shogi-pieces*.png', 'images/atlas/shogi-glyphs*.png', 'atlas/img/shanghai-art.png', 'atlas/img/shanghai-glyphs.png',
       'comet-plus/title-logo.png']
HALF = ['images/atlas/shogi3d/*.webp', 'images/atlas/xiangqi3d/*.webp', 'images/atlas/chess3d/*.webp', 'images/atlas/reversi3d/*.webp', 'images/atlas/goban3d/*.webp', 'images/atlas/hex3d/*.webp', 'images/atlas/c43d/*.webp', 'images/atlas/shogi-kaya.webp', 'peg/img/bd-*.webp']
HALF_MIN = 0              # （ページは名前だけで -h を読むので、一覧のフォルダは全部作る）
TEXB_MIN = 2_000_000      # tex/b のサイズ名なしの key はこれ以上だけ
TEXB_SKIP = {'dtPage1', 'dtPageG1'}   # key に縮尺が入っている（スマホは dtPage0.5 を手描きするので読まない）

def lossless(src, dst):
    im = Image.open(src); im.load()
    im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'PA') or (im.mode == 'P' and 'transparency' in im.info) else im.convert('RGB')
    im.save(dst, 'WEBP', lossless=True, quality=100, method=6, exact=True)

def half(src, dst):
    im = Image.open(src); im.load()
    a = im.mode in ('RGBA', 'LA', 'PA')
    im = im.convert('RGBA' if a else 'RGB')
    h = im.resize((max(1, im.width // 2), max(1, im.height // 2)), Image.LANCZOS)
    kw = dict(quality=90, method=6)
    if a: kw['alpha_quality'] = 100
    h.save(dst, 'WEBP', **kw)

def is_half(p): return p.endswith('-h.webp')

def main():
    n = 0
    for g in PNG:
        for src in sorted(glob.glob(P(g))):
            lossless(src, src[:-4] + '.webp'); n += 1
    for g in HALF:
        for src in sorted(glob.glob(P(g))):
            if is_half(src): continue
            with Image.open(src) as im: px = im.width * im.height
            if px < HALF_MIN: continue
            half(src, src[:-5] + '-h.webp'); n += 1
    # 焼き込みテクスチャ（key の版は baked.json と同じ）
    man = json.load(open(P('atlas', 'img', 'tex', 'baked.json')))
    texh = {}
    for key, v in sorted(man.items()):
        if re.search(r'\d{3,4}$', key) or key in TEXB_SKIP: continue        # サイズ名のある key（crSurf…1024 など）はスマホ用がすでにある
        f = P('atlas', 'img', 'tex', 'b', re.sub(r'[^A-Za-z0-9_.-]', lambda m: '_' + format(ord(m.group(0)), 'x'), key) + '.webp')
        if not os.path.exists(f): continue
        with Image.open(f) as im: px = im.width * im.height
        if px < TEXB_MIN: continue
        half(f, f[:-5] + '-h.webp'); texh[key] = v; n += 1
    bj = P('atlas', 'img', 'tex', 'baked.js')
    s = open(bj).read()
    s = re.sub(r'\n// the half-size pictures for phones[^\n]*\nwindow\.ATLAS_TEXH = [^\n]*\n', '\n', s).rstrip('\n') + '\n'
    s += '// the half-size pictures for phones (atlas/tools/mobile-tex.py → img/tex/b/<key>-h.webp): key → version\nwindow.ATLAS_TEXH = ' + json.dumps(texh) + ';\n'
    open(bj, 'w').write(s)
    print(n, 'files;', len(texh), 'baked keys with a half-size picture')

if __name__ == '__main__':
    main()

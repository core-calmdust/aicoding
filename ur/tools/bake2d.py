#!/usr/bin/env python3
"""Bake the 2D board / piece images for ur/board2d.js.

Runs ur/tools/paint2d.js in headless Chrome (Playwright) and writes WebP files to ur/img/:
  board-<design>-<h|v|vf>.webp   (board top + sides + shadow; 904x426 / 404x926 user units at UPX px/unit)
  board-<design>-<h|v>-s.webp (small version for mini() / phones)
  pieces-<design>.webp        (sprite: [light, dark] side by side, N px each)
Usage: python3 ur/tools/bake2d.py [design ...]
"""
import base64, io, os, sys
from playwright.sync_api import sync_playwright
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'img')
DESIGNS = ['museum', 'restored', 'wood', 'clay']
PIECES = ['orig', 'ivory', 'wood', 'gold']
UPX, UPX_S, PN = 2.0, 0.9, 160   # px per user unit (large / small), piece sprite cell px


def save(data_url, path, q=86):
    im = Image.open(io.BytesIO(base64.b64decode(data_url.split(',', 1)[1])))
    im.save(path, 'WEBP', quality=q, method=6)
    print(path, im.size, os.path.getsize(path) // 1024, 'KB')


def main():
    want = sys.argv[1:] or DESIGNS + PIECES
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = b.new_page()
        pg.set_content('<html><body></body></html>')
        pg.add_script_tag(path=os.path.join(HERE, 'paint2d.js'))
        for d in DESIGNS:
            if d not in want: continue
            for o in ('h', 'v', 'vf'):
                for upx, suf, q in ((UPX, '', 84), (UPX_S, '-s', 80)):
                    url = pg.evaluate('([d,o,u]) => UrPaint2D.board(d,o,u).toDataURL("image/png")', [d, o, upx])
                    save(url, os.path.join(OUT, f'board-{d}-{o}{suf}.webp'), q)
        for d in PIECES:
            if d not in want: continue
            url = pg.evaluate('''([d,n]) => { const c = document.createElement('canvas'); c.width = 2*n; c.height = n; const g = c.getContext('2d');
                g.drawImage(UrPaint2D.piece(d,0,n),0,0); g.drawImage(UrPaint2D.piece(d,1,n),n,0); return c.toDataURL('image/png'); }''', [d, PN])
            save(url, os.path.join(OUT, f'pieces-{d}.webp'), 88)
        b.close()


if __name__ == '__main__':
    main()

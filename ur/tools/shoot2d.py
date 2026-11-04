#!/usr/bin/env python3
"""Screenshots of ur/tools/board2d-demo.html for every design x orientation (Playwright + Chrome).
Usage: python3 ur/tools/shoot2d.py OUTDIR [design ...]"""
import os, sys, threading, http.server, functools
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
out = sys.argv[1] if len(sys.argv) > 1 else '.'
want = sys.argv[2:] or ['museum', 'restored', 'wood', 'clay']
PIECE = {'museum': 'orig', 'restored': 'gold', 'wood': 'wood', 'clay': 'ivory'}
os.makedirs(out, exist_ok=True)
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
H = functools.partial(Q, directory=ROOT)
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for d in want:
        for o in 'hv':
            vw = (1140, 760) if o == 'h' else (440, 1000)
            pg = b.new_page(viewport={'width': vw[0], 'height': vw[1]}, device_scale_factor=2 if o == 'v' else 1.5)
            errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
            pg.goto(f'http://127.0.0.1:{port}/ur/tools/board2d-demo.html?design={d}&pieces={PIECE[d]}&orient={o}&scene=mid')
            pg.wait_for_function('window.__ready', timeout=15000); pg.wait_for_timeout(300)
            pg.locator('#board').screenshot(path=os.path.join(out, f'{d}-{o}.png'))
            if errs: print('ERR', d, o, errs)
            pg.close()
    b.close()
srv.shutdown()
print('ok')

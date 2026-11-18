#!/usr/bin/env python3
"""Ludus Latrunculorum 2D art (2026-11-18): renders tools/art.html (GLSL) in headless Chrome and saves webp into img/2d/.
python3 latrunculi/tools/gen_art2.py [k ...]   k = board-<key> | frame-<key> | piece-<set>-b|w|bx|wx   (needs a local server on :8765 at the
repo root; LT_SAVE=1 writes into img/2d/, otherwise only /tmp/art)"""
import sys, os, io, base64, asyncio
from PIL import Image
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'img', '2d')
SIZE = {'board': (1536, 1536, 84), 'frame': (512, 512, 84), 'piece': (768, 320, 92)}
async def run(keys, outdir):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page()
        for k in keys:
            kind = k.split('-')[0]; S, out, q = SIZE[kind]
            if os.environ.get('LT_QUICK'): S = S // 2
            await pg.goto(f'http://localhost:8765/latrunculi/tools/art.html?k={k}&s={S}' + ('&aa=1' if os.environ.get('LT_QUICK') else ''))
            await pg.wait_for_function("document.title==='done'||document.title.startsWith('ERR')", timeout=900000)
            t = await pg.title()
            if t != 'done': print(k, t); continue
            data = await pg.evaluate('window.__png')
            im = Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
            if out != S: im = im.resize((out, out), Image.LANCZOS)
            name = {'board': 'bd-', 'frame': 'fr-', 'piece': 'pc-'}[kind] + k.split('-', 1)[1]
            if kind != 'piece': im = im.convert('RGB')
            if outdir != '/tmp/art': im.save(os.path.join(outdir, name + '.webp'), quality=q, method=6)
            im.save(os.path.join('/tmp/art', name + '.png'))
            print('ok', name, flush=True)
        await b.close()
os.makedirs('/tmp/art', exist_ok=True); os.makedirs(OUT, exist_ok=True)
asyncio.run(run(sys.argv[1:], OUT if os.environ.get('LT_SAVE') else '/tmp/art'))

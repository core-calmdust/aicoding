# Writes images/atlas/shogi-pieces-<set>.png and atlas/img/pc3-shogi-<set>.webp from atlas/tools/shogi-pieces.html (serve the repo root on :8765).
# The 盛り上げ set's page sheet stays images/atlas/shogi-pieces.png; its tile is written too.
import asyncio, base64, os, sys
from playwright.async_api import async_playwright
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SETS = sys.argv[1:] or ['moriage', 'ichiji', 'kinki', 'minase', 'ryoko', 'reisho']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for s in SETS:
            pg = await b.new_page()
            await pg.route('**/three.min.js', lambda r: r.fulfill(path='/tmp/three.min.js', content_type='application/javascript'))
            await pg.goto('http://localhost:8765/atlas/tools/shogi-pieces.html'); await pg.wait_for_function('window.READY')
            await pg.wait_for_timeout(1500)
            r = await pg.evaluate('s => MAKE(s)', s)
            if s != 'moriage': open(os.path.join(ROOT, 'images', 'atlas', f'shogi-pieces-{s}.png'), 'wb').write(base64.b64decode(r['sheet'].split(',', 1)[1]))
            open(os.path.join(ROOT, 'atlas', 'img', f'pc3-shogi-{s}.webp'), 'wb').write(base64.b64decode(r['thumb'].split(',', 1)[1]))
            print(s); await pg.close()
        await b.close()
asyncio.run(main())

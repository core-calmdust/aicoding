# Writes images/atlas/shogi-glyphs-<set>.png from atlas/tools/shogi-glyphs.html (serve the repo root on :8765 first).
import asyncio, base64, os, sys
from playwright.async_api import async_playwright
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await pg.goto('http://localhost:8765/atlas/tools/shogi-glyphs.html'); await pg.wait_for_function('window.READY')
        for s in (sys.argv[1:] or await pg.evaluate('window.SETS')):
            u = await pg.evaluate('s => SHEET(s)', s)
            open(os.path.join(ROOT, 'images', 'atlas', f'shogi-glyphs-{s}.png'), 'wb').write(base64.b64decode(u.split(',', 1)[1])); print(s)
        await b.close()
asyncio.run(main())

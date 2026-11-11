# Writes the shogi 3D board pictures (images/atlas/shogi3d/<name>.webp) from atlas/tools/shogi-tex.html.
# Serve the repo root on :8765 (python3 -m http.server 8765), then: python3 atlas/tools/shogi-tex.py [name …]
import asyncio, base64, os, sys
from playwright.async_api import async_playwright
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'images', 'atlas', 'shogi3d')
async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--allow-file-access-from-files'])
        pg = await b.new_page()
        await pg.goto('http://localhost:8765/atlas/tools/shogi-tex.html')
        await pg.wait_for_function('window.READY')
        names = sys.argv[1:] or await pg.evaluate('window.NAMES')
        for n in names:
            url = await pg.evaluate('n => GEN(n)', n)
            data = base64.b64decode(url.split(',', 1)[1])
            open(os.path.join(OUT, n + '.webp'), 'wb').write(data)
            print(n, len(data) // 1024, 'KB')
        await b.close()
asyncio.run(main())

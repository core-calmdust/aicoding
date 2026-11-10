# Re-makes the pre-rendered crokinole surfaces (atlas/img/tex/crokinole-<look>[-1k].webp) from models/crokinole.js drawSurface().
# Serve the repo root on :8765 (python3 -m http.server 8765), then: python3 atlas/tools/cktex.py  (Playwright + Chrome).
# Afterwards raise TEXV in atlas/models/crokinole.js.
import asyncio, base64
from playwright.async_api import async_playwright
import os
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img', 'tex') + '/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':400,'height':300})
        await pg.add_init_script("window.CK_DRAW_SURF = true")
        await pg.route('**/three.min.js', lambda r: r.fulfill(path=os.environ.get('THREE_JS', '/tmp/threejs/build/three.min.js'), content_type='application/javascript'))
        await pg.route(lambda u: ('localhost' not in u) and ('three.min' not in u), lambda r: r.abort())
        await pg.goto('http://localhost:8765/atlas/tools/boards.html?game=hockey&look=classic')
        await pg.wait_for_function('window.READY', timeout=400000)
        for look in ['marq','classic','modern','mcm','winter','neon']:
            for sz,suf in [(2048,''),(1024,'-1k')]:
                d = await pg.evaluate("""([look, sz]) => { const g = Table3D.MODELS.crokinole(true, look); let c = null; g.traverse(o => { if (c || !o.isMesh) return; const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) if (m && m.map && m.map.image && m.map.image.width === 2048 && m.map.image.height === 2048 && m.map.image.getContext) { c = m.map.image; break; } });
                  if (!c) return null; let cv = c; if (sz !== 2048) { cv = document.createElement('canvas'); cv.width = cv.height = sz; cv.getContext('2d').drawImage(c, 0, 0, sz, sz); } return cv.toDataURL('image/webp', .9); }""", [look, sz])
                if not d: print('none', look); continue
                open(OUT+'crokinole-'+look+suf+'.webp','wb').write(base64.b64decode(d.split(',',1)[1]))
        await b.close()
asyncio.run(main())

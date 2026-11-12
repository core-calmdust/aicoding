# Bakes the slow procedural board textures into images (atlas/img/tex/b/<key>.webp + atlas/img/tex/baked.js).
# Serve the repo root on :8765 (python3 -m http.server 8765), then: python3 atlas/tools/texbake.py [ms threshold, default 40]
# Every game's boards (all of atlas/models/*.js) (Table3D.BOARDS looks, or its one board) are built with window.TEX_DRAW (draw everything), at full and at
# half texture scale (phones; a key without its size in it keeps the full-size image — the full run comes last); any texture that took longer than the threshold is saved. Run it again whenever the drawing of a
# baked texture changes (the version in baked.js is bumped, so browsers fetch the new image).
import asyncio, base64, json, os, sys, time
from playwright.async_api import async_playwright
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'img', 'tex', 'b')
TH = int(sys.argv[1]) if len(sys.argv) > 1 else 40
TH_KL = int(sys.argv[2]) if len(sys.argv) > 2 else 60   # the kernels (AtlasTexGen.paint) slower than this are baked too (img/tex/k/, window.ATLAS_KL)
THREE = os.environ.get('THREE_JS', '/tmp/threejs/build/three.min.js')
async def run(b, scale, coarse=False):
    # coarse: a phone (pointer: coarse → half-size textures, the models' lighter settings); only the kernels (AtlasTexGen) are kept from it
    ctx = await b.new_context(viewport={'width': 400, 'height': 300}, is_mobile=coarse, has_touch=coarse)
    pg = await ctx.new_page()
    rec = scale == 1 or coarse
    await pg.add_init_script('window.TEX_DRAW = true;' + ('window.TEX_SCALE = %s;' % scale if scale != 1 else '') + ('window.__klRec = [];' if rec else ''))
    if os.path.exists(THREE): await pg.route('**/three.min.js', lambda r: r.fulfill(path=THREE, content_type='application/javascript'))
    await pg.goto('http://localhost:8765/atlas/tools/boards.html?game=hockey&look=classic')
    await pg.wait_for_function('window.READY', timeout=600000)
    # every model file of the portal (the page itself loads only some), one after another
    mods = sorted(m for m in os.listdir(os.path.join(ROOT, 'models')) if m.endswith('.js'))
    await pg.evaluate("""async (mods) => { for (const m of mods) if (!document.querySelector('script[src*="models/' + m + '"]')) await new Promise(r => { const s = document.createElement('script'); s.src = '../models/' + m + '?bake=' + Date.now(); s.onload = s.onerror = r; document.head.appendChild(s); }); }""", mods)
    got = await pg.evaluate("""(TH) => { const X = Table3D, out = {}, ids = Object.keys(X.MODELS);
      for (const id of ids) { const B = X.BOARDS && X.BOARDS[id], looks = B ? B.list : [undefined];
        for (const lk of looks) { try { if (B) B.set(lk); X.MODELS[id](true, lk); X.MODELS[id](false, lk); } catch (e) {} } }
      for (const [k, t] of Object.entries(X._texT)) { if (t.ms < TH || k[0] === '#') continue; const tx = X._texCache[k]; const c = tx && tx.image; if (!c || !c.toDataURL) continue;
        out[k] = { ms: t.ms, file: X._texFile(k), data: c.toDataURL('image/webp', .9) }; }
      return out; }""", TH)
    kl = await pg.evaluate("""(TH) => { const out = {}; for (const r of (window.__klRec || [])) { if (!r.key || r.ms < TH || out[r.key]) continue;
        out[r.key] = { ms: Math.round(r.ms), data: r.c.toDataURL('image/webp', .9), data2: r.c2 ? r.c2.toDataURL('image/webp', .92) : null }; } return out; }""", TH_KL)
    await ctx.close()
    return ({} if coarse else got), kl
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'), args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        found, kls = {}, {}
        for sc, co in ((.5, False), (1, True), (1, False)): g, k = await run(b, sc, co); found.update(g); kls.update(k)
        await b.close()
    os.makedirs(OUT, exist_ok=True)
    man = {}
    try: man = json.loads(open(os.path.join(ROOT, 'img', 'tex', 'baked.json')).read())
    except Exception: pass
    v = int(time.strftime('%y%m%d%H'))
    for k, o in sorted(found.items(), key=lambda kv: -kv[1]['ms']):
        open(os.path.join(ROOT, o['file']), 'wb').write(base64.b64decode(o['data'].split(',', 1)[1]))
        man[k] = v; print('%6d ms  %s' % (o['ms'], k))
    open(os.path.join(ROOT, 'img', 'tex', 'baked.json'), 'w').write(json.dumps(man, ensure_ascii=False, indent=0))
    # the kernels: a key carries a hash of the kernel's source, so only the current ones are listed (old files are removed)
    KD = os.path.join(ROOT, 'img', 'tex', 'k'); os.makedirs(KD, exist_ok=True)
    for f in os.listdir(KD): os.remove(os.path.join(KD, f))
    klm = {}
    for k, o in sorted(kls.items(), key=lambda kv: -kv[1]['ms']):
        open(os.path.join(KD, k + '.webp'), 'wb').write(base64.b64decode(o['data'].split(',', 1)[1]))
        if o['data2']: open(os.path.join(KD, k + '-n.webp'), 'wb').write(base64.b64decode(o['data2'].split(',', 1)[1]))
        klm[k] = v; print('%6d ms  kernel %s' % (o['ms'], k))
    open(os.path.join(ROOT, 'img', 'tex', 'baked.js'), 'w').write('// generated by atlas/tools/texbake.py — the baked procedural textures (key → version)\nwindow.ATLAS_TEX = ' + json.dumps(man, ensure_ascii=False) + ';\n'
      + '// the slow pixel kernels of the models (AtlasTexGen.paint, atlas/texgen.js): key → version\nwindow.ATLAS_KL = ' + json.dumps(klm, ensure_ascii=False) + ';\n')
asyncio.run(main())

# Reads the 2D games' rule cards (ゲーム tab) in a browser into kx.json for tools/kindart.py.
# Usage (a local server on :8765 at the repo root): python3 atlas/tools/kindart-grab.py ja,en,zh,zh-TW,ko,es,fr,pt,de,hi,ar,ru,id,tr mancala morris …
# (senet draws its board from a blob: URL — tools/kindart.py drops such images; read senet's pictures with the blob turned into a data: URL)
import asyncio, sys, json
from playwright.async_api import async_playwright
LANGS = sys.argv[1].split(',')
JS = r"""(art)=>{ const cards=[...document.querySelectorAll('#ruleCards [data-r], #ruleCards [data-v], #ruleCards [data-setup]')]; const txt=e=>e?e.textContent.trim():'';
 return cards.map(b=>{ const key=b.dataset.r||b.dataset.v||b.dataset.setup; const c=b.cloneNode(true);
  c.querySelectorAll('svg,.gart,.gpick,.ngt-rl').forEach(x=>x.remove());
  const tags=[...c.querySelectorAll('.gtag,.tf-chips > *')].map(x=>x.textContent.trim()).filter(Boolean); c.querySelectorAll('.gtag,.tf-chips').forEach(x=>x.remove());
  const name=txt(c.querySelector('b')); const d=c.querySelector('p,small'); const desc=txt(d);
  let gh='',gd=''; const sec=b.closest('.rgrp'); if(sec){gh=txt(sec.querySelector('h4 b'));gd=txt(sec.querySelector('h4 small'));} else { let p=b.parentElement; let h=p&&p.previousElementSibling; if(h&&h.classList.contains('tf-rgh')){gh=txt(h.querySelector('b'));gd=txt(h.querySelector('small'));} }
  let a=''; if(art){ const s=b.querySelector('svg'); if(s){ const cl=s.cloneNode(true); const src=[s,...s.querySelectorAll('*')], dst=[cl,...cl.querySelectorAll('*')];
    src.forEach((e,i)=>{ if(!e.getAttribute('class')) return; const cs=getComputedStyle(e); ['fill','stroke','stroke-width','opacity','font-weight','font-family'].forEach(p=>{ if(!dst[i].getAttribute(p)) dst[i].setAttribute(p, cs.getPropertyValue(p)); }); dst[i].removeAttribute('class'); });
    cl.removeAttribute('class'); cl.removeAttribute('style'); cl.removeAttribute('width'); cl.removeAttribute('height'); a=cl.outerHTML; } }
  return {key,name,tags,desc,gh,gd,art:a}; }); }"""
async def grab(b, g, lang):
    pg=await b.new_page(viewport={'width':1300,'height':900})
    try:
        await pg.goto(f'http://localhost:8765/{g}/?lang={lang}', timeout=40000); await pg.wait_for_timeout(5000)
        await pg.evaluate("try{ (window.openNew||(()=>{}))() }catch(e){}; document.querySelector('#btnNew, [data-act=new], #newBtn')?.click()"); await pg.wait_for_timeout(900)
        await pg.evaluate("document.querySelector('#segMode [data-v=ai]')?.click(); document.querySelector('[data-tab=game], #ngTabs [data-t=game]')?.click()"); await pg.wait_for_timeout(300)
        return await pg.evaluate(JS, lang=='ja')
    except Exception as e: print(g, lang, 'ERR', str(e)[:100]); return []
    finally: await pg.close()
async def main(games):
    try: out=json.load(open('kx.json'))
    except Exception: out={}
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        for g in games:
            o = out.get(g, {})
            for i in range(0, len(LANGS), 4):
                ls = LANGS[i:i+4]; res = await asyncio.gather(*[grab(b,g,l) for l in ls])
                for l, r in zip(ls, res): o[l] = r
            out[g]=o; print(g, {l: len(o.get(l, [])) for l in LANGS}, flush=True)
            json.dump(out, open('kx.json','w'))
        await b.close()
asyncio.run(main(sys.argv[2:]))

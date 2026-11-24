// 博物館の文字の読みやすさを、全スキンで確かめる (2026-11-24). For each state (the rooms, a story and its quiz, the stamp book) × each skin:
// the text's colour against the real pixels behind it — text hidden → a screenshot of each screenful → museum-skin-qa.py measures
// (small text 4.0, large / bold 3.0). Serve the repo (python3 -m http.server 8765), then:
//   [PHONE=1] [OUT=dir] [PW=playwright path] [CHROME=chrome path] node tools/museum-skin-qa.js shard nshards [skin,skin…]
//   python3 tools/museum-skin-qa.py dir
const { chromium, devices } = require(process.env.PW || 'playwright');
const fs = require('fs');
const OUT = (process.env.OUT || '/tmp/museum-skin-qa') + '/'; fs.mkdirSync(OUT, { recursive: true });
const PHONE = process.env.PHONE === '1';
(async () => { const [shard, nsh, onlySkins] = [+process.argv[2], +process.argv[3], process.argv[4]];
  const b = await chromium.launch({ ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}), args: ['--no-sandbox'] });
  const p = await b.newPage({ ...(PHONE ? { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, userAgent: devices['iPhone 13'].userAgent } : { viewport: { width: 1440, height: 900 } }), deviceScaleFactor: 1 });
  let errs = 0; p.on('pageerror', e => { errs++; console.log('[pageerror]', e.message.slice(0, 200)); });
  await p.addInitScript(() => { localStorage.setItem('atlas-museum-room', 'map'); localStorage.setItem('atlas-lang', 'ja'); localStorage.setItem('aicoding-lang', 'ja'); localStorage.setItem('atlas-museum-stamps', '{"ur":1}'); });
  await p.goto((process.env.BASE || 'http://localhost:8765/') + 'atlas/index.html#museum', { waitUntil: 'load' }); await p.waitForTimeout(3500);
  for (let i = 0; i < 10; i++) { await p.evaluate(() => { const o = document.querySelector('#ov.on'); if (o) { const b = o.querySelector('button.btn') || o.querySelector('button'); if (b) b.click(); } }); await p.waitForTimeout(250); }
  const skins = (await p.evaluate(() => AtlasSkins.list.map(s => s.id))).filter((s, i) => onlySkins ? onlySkins.split(',').includes(s) : i % nsh === shard);
  const states = [
    ['map', async () => { await p.evaluate(() => AtlasMuseum.go('map')); await p.waitForTimeout(3000); }],
    ['tree', async () => { await p.evaluate(() => AtlasMuseum.go('tree')); await p.waitForTimeout(3000); }],
    ['gallery', async () => { await p.evaluate(() => AtlasMuseum.go('gallery')); await p.waitForTimeout(3500); }],
    ['paint', async () => { await p.evaluate(() => AtlasMuseum.go('paint')); await p.waitForTimeout(2500); }],
    ['read', async () => { await p.evaluate(() => AtlasMuseum.go('read')); await p.waitForTimeout(2500); }],
    ['story', async () => { await p.evaluate(() => AtlasRead.open('liubo')); await p.waitForTimeout(1500); for (let i = 0; i < 3; i++) { await p.click('.rdqa [data-a="1"]'); await p.waitForTimeout(1000); } }],
    ['chance', async () => { await p.evaluate(() => AtlasMuseum.go('chance')); await p.waitForTimeout(3500); await p.evaluate(() => AtlasChance._debug.throwNow(10)); await p.waitForTimeout(2500); }],
    ['pass', async () => { await p.evaluate(() => scrollTo(0, 0)); await p.click('#muPass'); await p.waitForTimeout(400); }],
  ];
  const out = [];
  for (const [st, setup] of states) {
    await setup();
    for (const sk of skins) {
      await p.evaluate(id => AtlasSkins.apply(id), sk); await p.waitForTimeout(300);
      // viewport by viewport (a full-page capture resizes the window, which moves things sized by the screen): the band between the
      // fixed header and the bottom menu, text hidden for the shot
      const total = await p.evaluate(() => { const sec = document.getElementById('pg-museum'); return sec.getBoundingClientRect().bottom + scrollY; });
      const band = await p.evaluate(() => { let t = 0, nb = innerHeight; document.querySelectorAll('body *').forEach(e => { const st = getComputedStyle(e); if (st.position !== 'fixed' && st.position !== 'sticky' || st.display === 'none') return; const r = e.getBoundingClientRect(); if (!r.width || r.width < innerWidth * .5) return; if (r.top < 5 && r.bottom < innerHeight / 3) t = Math.max(t, r.bottom); else if (r.top > innerHeight / 2) nb = Math.min(nb, r.top); }); return [Math.ceil(t), Math.floor(nb)]; });
      const step = band[1] - band[0] - 20; let y = 0, k = 0; const its = []; const shots = [];
      while (y < Math.min(total, 9000) && k < 14) {
        await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(120);
        const items = await p.evaluate(band => {
          const sec = document.getElementById('pg-museum'), R = [];
          sec.querySelectorAll('*').forEach(e => { if (e.closest('canvas,svg')) return; const st = getComputedStyle(e); if (st.display === 'none' || st.visibility === 'hidden' || +st.opacity < .05) return;
            const txt = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' '); if (!txt) return;
            const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.top < band[0] || r.bottom > band[1]) return;
            let op = 1; for (let a = e; a; a = a.parentElement) op *= +getComputedStyle(a).opacity; if (op < .3) return;
            // clipped by a scrolling / hidden-overflow box (out of its view) or under the edge fades: not shown, not measured
            for (let a = e.parentElement; a && a !== sec; a = a.parentElement) { const s = getComputedStyle(a); if (/(hidden|auto|scroll|clip)/.test(s.overflowX + s.overflowY)) { const q = a.getBoundingClientRect(); if (r.left < q.left - 1 || r.right > q.right + 1 || r.top < q.top - 1 || r.bottom > q.bottom + 1) return; } }
            R.push({ t: txt.slice(0, 24), c: st.color, x: r.left, y: r.top, w: r.width, h: r.height, fs: parseFloat(st.fontSize), fw: +st.fontWeight || 400, cls: (typeof e.className === 'string' && e.className ? e.className : e.tagName) });
          });
          return R;
        }, band);
        // (the stamp toast is a passing message laid over the page: hidden in the shot, so the text under it is measured against the page)
        const tag = await p.addStyleTag({ content: '#pg-museum *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}.mutoast{display:none!important}' });
        const file = `${OUT}${st}-${sk}-${k}.png`; await p.screenshot({ path: file });
        await tag.evaluate(n => n.remove());
        shots.push({ file, items }); y += step; k++;
      }
      shots.forEach(sh => out.push({ st, sk, file: sh.file, items: sh.items }));
    }
  }
  fs.writeFileSync(`${OUT}res-${shard}.json`, JSON.stringify(out));
  console.log('done', shard, skins.length, 'errors', errs); await b.close(); })();

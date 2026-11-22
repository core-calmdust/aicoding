// node dreadnoughts/tools/phone.js out_dir [WxH] — screenshots of every phone screen (title, sortie, draft, deploy, battle, armed skill, fleets, result)
const { chromium } = require('playwright');
(async () => {
  const [out, size] = process.argv.slice(2), [w, h] = (size || '390x844').split('x').map(Number);
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, locale: 'ja-JP' }); await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  const shot = k => p.screenshot({ path: `${out}/${w}-${k}.png` });
  await p.goto('http://localhost:8765/dreadnoughts/'); await p.evaluate(() => localStorage.removeItem('aicoding-dreadnoughts')); await p.reload(); await p.waitForTimeout(2500); await shot('1title');
  await p.tap('#mPlay'); await p.waitForTimeout(400); await shot('2setup');
  await p.tap('#sGo'); await p.waitForTimeout(2500);
  await p.waitForFunction(() => { const G = DN.G(); return !G.busy && G.draft.turn === 0; }, null, { timeout: 30000 });
  await p.evaluate(() => document.querySelector('#drGrid .card:not(.off)').click()); await p.waitForTimeout(800); await shot('3draft');
  for (let n = 0; n < 60; n++) { if (await p.evaluate(() => DN.G().phase) !== 'draft') break; await p.evaluate(() => { const G = DN.G(); if (G.busy || G.draft.turn !== 0) return; const c = document.querySelector('#drGrid .card:not(.off)'); if (c) { c.click(); document.querySelector('#drOk').click(); } }); await p.waitForTimeout(500); }
  await p.waitForTimeout(2000); await shot('4deploy');
  await p.tap('#dGo'); await p.waitForTimeout(3000); await p.waitForFunction(() => { const G = DN.G(); return !G.busy && G.st.turn === 0; }, null, { timeout: 60000 }); await shot('5battle');
  const sk = await p.$('#dock .sk:not([disabled])'); if (sk) { await sk.tap(); await p.waitForTimeout(600); const pt = await p.evaluate(() => DN.World.screenOf(1, 44)); await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(500); await shot('6armed'); await p.evaluate(() => document.querySelector('#tipX') && document.querySelector('#tipX').click()); }
  await p.evaluate(() => document.querySelector('.vt[data-z="0"]').click()); await p.waitForTimeout(1500); await shot('7mine');
  await p.evaluate(() => document.querySelector('#strip').click()); await p.waitForTimeout(600); await shot('8fleets');
  console.log('errors', errs.slice(0, 4)); await b.close(); })();

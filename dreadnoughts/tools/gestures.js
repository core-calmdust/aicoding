// node dreadnoughts/tools/gestures.js — phones: the deployment's ship spotlight, pinch-zoom and slide on the sea, the skill dock's sideways scroll (screenshots to /tmp/dg)
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || '/tmp/dg'; require('fs').mkdirSync(out, { recursive: true }), w = 390, h = 844;
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, locale: 'ja-JP' }); await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message)); const cdp = await ctx.newCDPSession(p);
  const touch = async (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q[0], y: q[1], id: i })) });
  await p.goto('http://localhost:8765/dreadnoughts/'); await p.evaluate(() => localStorage.removeItem('aicoding-dreadnoughts')); await p.reload(); await p.waitForTimeout(2500);
  await p.tap('#mPlay'); await p.waitForTimeout(400); await p.tap('#sGo'); await p.waitForTimeout(2500);
  await p.evaluate(() => { window.__pick = c => { c.click(); const b = document.querySelector('#cardPop:not(.hide) #cpPick:not(.hide)'); if (b) b.click(); }; });
  for (let n = 0; n < 80; n++) { if (await p.evaluate(() => DN.G().phase) !== 'draft') break; await p.evaluate(() => { const G = DN.G(); if (G.busy || G.draft.turn !== 0) return; const c = document.querySelector('#drGrid .card:not(.off)'); if (c) { __pick(c); document.querySelector('#drOk').click(); } }); await p.waitForTimeout(500); }
  await p.waitForTimeout(2000);
  await p.tap('#strip .fi[data-i="1"]'); await p.waitForTimeout(800);
  console.log('spot', await p.evaluate(() => { const t = document.querySelector('#spotTip'), r = t.getBoundingClientRect(), s = document.querySelector('#strip').getBoundingClientRect(); return { vis: !t.classList.contains('hide'), text: t.textContent.slice(0, 40), h: r.height, gap: Math.round(s.top - r.bottom), on: !!document.querySelector('#strip .fi.on') }; }));
  await p.screenshot({ path: `${out}/deploy-spot.png` });
  // pinch on the sea
  const b0 = await p.evaluate(() => DN.World.screenOf(0, 44)), b1 = await p.evaluate(() => DN.World.screenOf(0, 55));
  await touch('touchStart', [[150, 400], [240, 400]]); for (let k = 1; k <= 6; k++) await touch('touchMove', [[150 - k * 12, 400], [240 + k * 12, 400]]); await touch('touchEnd', []);
  await p.waitForTimeout(400); const a0 = await p.evaluate(() => DN.World.screenOf(0, 44)), a1 = await p.evaluate(() => DN.World.screenOf(0, 55));
  console.log('pinch: cell size', Math.round(Math.hypot(b1.x - b0.x, b1.y - b0.y)), '->', Math.round(Math.hypot(a1.x - a0.x, a1.y - a0.y)), 'scale', await p.evaluate(() => DN.World.viewScale()));
  await p.screenshot({ path: `${out}/deploy-zoom.png` });
  const before = JSON.stringify(await p.evaluate(() => DN.G().my));
  await touch('touchStart', [[60, 560]]); for (let k = 1; k <= 6; k++) await touch('touchMove', [[60 + k * 10, 560 - k * 6]]); await touch('touchEnd', []);
  await p.waitForTimeout(400); const c0 = await p.evaluate(() => DN.World.screenOf(0, 44));
  console.log('pan: cell 44 moved', Math.round(c0.x - a0.x), Math.round(c0.y - a0.y), 'ships unchanged', before === JSON.stringify(await p.evaluate(() => DN.G().my)));
  await p.tap('#dGo'); await p.waitForTimeout(3000); await p.waitForFunction(() => { const G = DN.G(); return !G.busy && G.st.turn === 0; }, null, { timeout: 60000 });
  console.log('battle scale reset', await p.evaluate(() => DN.World.viewScale()));
  console.log('dock', await p.evaluate(() => { const d = document.querySelector('#dock'), cs = getComputedStyle(d); return { pe: cs.pointerEvents, ta: cs.touchAction, sw: d.scrollWidth, cw: d.clientWidth, widths: [...d.querySelectorAll('.sk')].map(x => Math.round(x.getBoundingClientRect().width)) }; }));
  const dr = await p.evaluate(() => document.querySelector('#dock').getBoundingClientRect().top + 30);
  await touch('touchStart', [[300, dr]]); for (let k = 1; k <= 8; k++) await touch('touchMove', [[300 - k * 25, dr]]); await touch('touchEnd', []);
  await p.waitForTimeout(500); console.log('dock scrolled', await p.evaluate(() => document.querySelector('#dock').scrollLeft), '(0 is right when every skill fits)');
  // a shot still fires on a tap after a pan
  const shotsBefore = await p.evaluate(() => DN.G().st.sides[1].shots.filter(Boolean).length);
  await touch('touchStart', [[60, 300]]); for (let k = 1; k <= 5; k++) await touch('touchMove', [[60 + k * 10, 300 + k * 4]]); await touch('touchEnd', []); await p.waitForTimeout(300);
  const noShot = await p.evaluate(() => DN.G().st.sides[1].shots.filter(Boolean).length);
  const pt = await p.evaluate(() => DN.World.screenOf(1, 23)); await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(1500);
  console.log('slide fired nothing', noShot === shotsBefore, 'tap fired', await p.evaluate(() => DN.G().st.sides[1].shots.filter(Boolean).length) > shotsBefore);
  await p.screenshot({ path: `${out}/battle.png` });
  console.log('errors', errs.slice(0, 4)); await b.close(); })();

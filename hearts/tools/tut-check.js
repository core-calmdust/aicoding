// ハーツ — runs the whole tutorial in a browser and checks every step: node hearts/tools/tut-check.js lang w h mobile outdir [shots 0/1]
// (serve the repo first, e.g. python3 -m http.server 8765; BASE=... to change). Reports a ring or a thing the text talks about (see)
// under the bubble (COVER / SEE-COVER), a bubble off the screen (OVERFLOW), an untranslated key (RAWKEY), page errors.
const { chromium } = require(process.env.PW || '/opt/npm-tools/node_modules/playwright');
(async () => {
  const [lang, w, h, mobile, outdir, shots] = process.argv.slice(2);
  require('fs').mkdirSync(outdir, { recursive: true });
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +mobile ? 2 : 1, hasTouch: !!+mobile, isMobile: !!+mobile });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PE ' + e.message + ' ' + (e.stack || '').split('\n')[1])); p.on('console', m => { if (m.type() === 'error' && !/AppCheck|firebase|recaptcha/i.test(m.text())) errs.push('CE ' + m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('aicoding-hearts', JSON.stringify({ set: { speed: 'normal', lvl: 5 } })); } catch (e) {} });
  await p.goto((process.env.BASE || 'http://127.0.0.1:8765') + '/hearts/?lang=' + lang); await p.waitForTimeout(2200);
  const offer = await p.evaluate(() => !!document.querySelector('#tutOffer'));
  if (+shots) await p.screenshot({ path: outdir + '/offer.png' });
  if (offer) await p.click('#toGo'); else await p.evaluate(() => HtTut.start());
  let last = -1, guard = 0, n = 0;
  while (guard++ < 600) {
    await p.waitForTimeout(250);
    const st = await p.evaluate(() => { const T = HtTut, i = T.STEPS.indexOf(T.STEPS.find((s, k) => document.querySelector('#tutLayer .tut-top em') && false)); return { on: T.on(), next: !!document.querySelector('#tuNext'), want: T.want(), phase: HtApp.S.phase, log: HtApp.S.log.length, em: (document.querySelector('#tutLayer .tut-top em') || {}).textContent, h: (document.querySelector('#tutLayer .tp-h') || {}).textContent, overflow: (() => { const bx = document.querySelector('#tutLayer .tut-box'); if (!bx) return 0; const r = bx.getBoundingClientRect(); return r.left < 0 || r.top < 0 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1 ? 1 : 0; })() }; });
    if (!st.on) break;
    if (st.em !== last && (st.next || st.want)) {
      last = st.em; n++;
      await p.waitForTimeout(1600);
      if (+shots) await p.screenshot({ path: `${outdir}/s${String(n).padStart(2, '0')}.png` });
      // does the bubble hide a ring?
      const cover = await p.evaluate(() => { const bx = document.querySelector('#tutLayer .tut-box').getBoundingClientRect(); return [...document.querySelectorAll('#tutLayer .tut-ring')].map(r => r.getBoundingClientRect()).reduce((a, r) => a + Math.max(0, Math.min(bx.right, r.right) - Math.max(bx.left, r.left)) * Math.max(0, Math.min(bx.bottom, r.bottom) - Math.max(bx.top, r.top)), 0); });
      const seeC = await p.evaluate(() => { const bx = document.querySelector('#tutLayer .tut-box').getBoundingClientRect(); return HtTut.seeRects().reduce((a, r) => a + Math.max(0, Math.min(bx.right, r.r) - Math.max(bx.left, r.l)) * Math.max(0, Math.min(bx.bottom, r.b) - Math.max(bx.top, r.t)), 0); }); if (seeC > 0) console.log('   SEE-COVER', Math.round(seeC));
      const of = await p.evaluate(() => { const bx = document.querySelector('#tutLayer .tut-box'); const r = bx.getBoundingClientRect(); return r.left < 0 || r.top < 0 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1 ? JSON.stringify([r.left, r.top, r.right, r.bottom].map(Math.round)) : ''; });
      const raw = await p.evaluate(() => /\btu\.|ck\.tut/.test(document.querySelector('#tutLayer').innerText) ? 'RAWKEY' : ''); console.log(n, st.em, '|', st.h, raw, cover ? 'COVER ' + Math.round(cover) : '', of ? 'OVERFLOW ' + of : '');
    }
    if (st.next) { await p.click('#tuNext'); continue; }
    if (st.want) {
      if (st.phase === 'play') { const o = await p.evaluate(() => HT.legal(HtApp.S, 0).map(c => HT.name(c) + '=' + JSON.stringify(HtTut.outcome(c))).join(' ')); if (process.env.METER) console.log('   meter', o, 'want', st.want.map(String)); }
      if (st.phase === 'pass') {
        for (const c of st.want) { await p.click(`#htHand .cd[data-c="${c}"]`, { position: { x: 8, y: 30 } }); await p.waitForTimeout(200); }
        await p.click('#abPass');
      } else {
        await p.click(`#htHand .cd[data-c="${st.want[0]}"]`, { position: { x: 8, y: 30 } }); await p.waitForTimeout(200);
        const sel = await p.evaluate(() => HtApp.U.sel);
        if (sel != null) await p.click('#abPlay');
      }
      await p.waitForTimeout(300);
    }
  }
  const after = await p.evaluate(() => ({ on: HtTut.on(), tut: !!(HtApp.D.cur && HtApp.D.cur.tut), done: localStorage.getItem('aicoding-hearts-tut-done'), phase: HtApp.S && HtApp.S.phase, g: HtApp.G && HtApp.G.tut }));
  console.log('steps', n, JSON.stringify(after));
  if (+shots) await p.screenshot({ path: outdir + '/after.png' });
  console.log(errs.join('\n')); await b.close();
})();

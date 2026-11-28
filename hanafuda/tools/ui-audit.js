// UI audit: node hanafuda/tools/ui-audit.js <baseURL> <outdir> [lang]
// Visits every screen at PC 1280/1440/1920 and phone 390, screenshots it and checks:
//  empty card frames (a face card without a loaded picture), buttons whose label wraps or is cut, elements of an open
//  dialog that leave the window, and labels of the rules / lesson rows that wrap.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const [BASE, OUT, LANG] = [process.argv[2], process.argv[3], process.argv[4] || 'ja'];
const SIZES = [[1280, 720, 0], [1440, 900, 0], [1920, 1080, 0], [390, 844, 1]];
const CHECK = () => {
  const bad = [];
  const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  document.querySelectorAll('.hf:not(.back)').forEach(c => {
    if (!vis(c)) return;
    const im = c.querySelector('img'), sv = c.querySelector('svg');
    if (!(im && im.complete && im.naturalWidth > 0) && !sv) bad.push('empty card ' + c.dataset.id);
  });
  const lines = e => { const sp = e.querySelector && e.querySelector('span:not(:empty)'); if (sp && !e.matches('.hfr-row>b,.cap-grp b')) e = sp; const r = document.createRange(); r.selectNodeContents(e); const ys = [...r.getClientRects()].map(x => x.top).sort((a, b) => a - b); let n = ys.length ? 1 : 0; for (let i = 1; i < ys.length; i++) if (ys[i] - ys[i - 1] > 8) n++; return n; };
  document.querySelectorAll('button, .mbtn, .btn').forEach(b => {
    if (!vis(b) || !b.textContent.trim()) return;
    const top = document.elementFromPoint(b.getBoundingClientRect().left + 2, b.getBoundingClientRect().top + 2);
    if (b.closest('.overlay') && !b.closest('.overlay.on')) return;
    if (lines(b) > 1 && !b.closest('.ls-item') && !b.closest('.tile')) bad.push('button wraps: ' + b.textContent.trim().slice(0, 30));
    if (b.scrollWidth > b.clientWidth + 2 && getComputedStyle(b).overflow !== 'visible') bad.push('button cut: ' + b.textContent.trim().slice(0, 30));
  });
  document.querySelectorAll('.overlay.on .modal, .tu-box').forEach(m => {
    if (!vis(m)) return; const r = m.getBoundingClientRect();
    if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) bad.push('dialog leaves the window: ' + m.className);
  });
  document.querySelectorAll('.hfr-row>b, .cap-grp b').forEach(b => { if (vis(b) && b.textContent.trim() && lines(b) > 1) bad.push('label wraps: ' + b.textContent.trim()); });
  return bad;
};
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  const report = [];
  for (const [w, h, mob] of SIZES) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: !!mob, isMobile: !!mob });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    const tag = `${w}`;
    const shot = async (name) => { await p.waitForTimeout(900); const f = `${OUT}/${tag}-${name}.png`; await p.screenshot({ path: f }); const bad = await p.evaluate(CHECK); report.push([tag, name, bad]); };
    await p.goto(`${BASE}?lang=${LANG}`, { waitUntil: 'load' });
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('aicoding-hanafuda-tut', 'seen'); });
    await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1500);
    await shot('main');
    const clickJS = sel => p.evaluate(s => document.querySelector(s) && document.querySelector(s).click(), sel);
    await clickJS('#btnNew'); await shot('new-game');
    await clickJS('#ngTabs [data-tab=rule]'); await shot('new-rule');
    await clickJS('#ngTabs [data-tab=design]'); await shot('new-design');
    await clickJS('#ngTabs [data-tab=game]'); await clickJS('[data-o=mode] [data-v=\'"rated"\']'); await shot('new-rated');
    await clickJS('#btnNewClose');
    await clickJS('#btnRules');
    for (let i = 0; i < 8; i++) { await shot('rules-' + i); await clickJS('.rt-nav button:last-child'); }
    await p.keyboard.press('Escape'); await p.evaluate(() => document.querySelectorAll('.overlay.on').forEach(o => o.classList.remove('on')));
    await clickJS('#btnLesson'); await shot('lessons');
    const ids = await p.evaluate(() => window.HFLessons.CATS.flatMap(c => [c.prep.id, ...c.items.map(i => i.id)]));
    for (const id of ids) { await p.evaluate(() => { const m = document.getElementById('lessonModal'); m.dataset.cur = ''; }); await clickJS('[data-list]'); await p.evaluate(id => { const c = window.HFLessons.CATS.find(c => c.prep.id === id || c.items.some(i => i.id === id)); const t = document.querySelector(`[data-cat="${c.id}"]`); t && t.click(); }, id); await clickJS(`[data-it="${id}"]`); await shot('lesson-' + id); }
    await p.evaluate(() => document.querySelectorAll('.overlay.on').forEach(o => o.classList.remove('on')));
    // settings (gear) and record
    await clickJS('#btnOpts'); await shot('options'); await p.keyboard.press('Escape'); await p.mouse.click(5, h - 5);
    await clickJS('#btnRecord'); await shot('record'); await p.keyboard.press('Escape'); await p.evaluate(() => document.querySelectorAll('.overlay.on, .gr-ov, [class*=rec-ov]').forEach(o => o.classList && o.classList.remove('on')));
    // tutorial: every step
    await p.evaluate(() => window.HFTut.start()); await p.waitForTimeout(800);
    for (let i = 0; i < 30; i++) {
      const st = await p.evaluate(() => ({ nx: !!document.querySelector('#tuNext'), end: !!document.querySelector('#tuEnd'), want: (document.querySelector('#myHand .hf.tu-want') || {}).dataset, koi: document.getElementById('koiOverlay').classList.contains('on'), res: document.getElementById('resOverlay').classList.contains('on') }));
      await shot('tut-' + String(i).padStart(2, '0'));
      if (st.end) { await clickJS('#tuEnd'); break; }
      if (st.want && st.want.id) { await clickJS(`#myHand .hf[data-id="${st.want.id}"]`); await p.waitForTimeout(2400); continue; }
      if (st.koi) { await clickJS('#btnStop'); await p.waitForTimeout(2600); continue; }
      if (st.res && !st.nx) { await clickJS('#resNext'); await p.waitForTimeout(700); continue; }
      if (st.nx) { await clickJS('#tuNext'); await p.waitForTimeout(500); continue; }
      await p.waitForTimeout(700);
    }
    // a month played to the end: result + review
    for (let i = 0; i < 300; i++) {
      const st = await p.evaluate(() => { const ov = id => document.getElementById(id).classList.contains('on'); return ov('resOverlay') ? 'res' : ov('koiOverlay') ? 'koi' : document.querySelector('#field .hf.pickable') ? 'pick' : document.querySelector('#myHand .hf.can') ? 'play' : 'wait'; });
      if (st === 'res') { await shot('result'); if (await p.$('#resReview')) { await clickJS('#resReview'); await p.waitForTimeout(9000); await shot('review'); } break; }
      if (st === 'koi') { await shot('koi'); await clickJS('#btnStop'); await p.waitForTimeout(500); continue; }
      if (st === 'pick') { await clickJS('#field .hf.pickable'); await p.waitForTimeout(400); continue; }
      if (st === 'play') { if (i === 4) await shot('mid'); await clickJS('#myHand .hf.can:not(.dead)') || await clickJS('#myHand .hf.can'); await p.waitForTimeout(400); continue; }
      await p.waitForTimeout(300);
    }
    if (errs.length) report.push([tag, 'console', errs]);
    await ctx.close();
  }
  await b.close();
  const probs = report.filter(r => r[2].length);
  for (const r of probs) console.log(r[0], r[1], JSON.stringify([...new Set(r[2])]));
  console.log('screens', report.length, 'with problems', probs.length);
})();

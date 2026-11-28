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
  // a button must not lie over text (clipped by scrolling boxes: only the visible part counts)
  const clip = e => { let r = e.getBoundingClientRect(); let a = { l: r.left, t: r.top, r: r.right, b: r.bottom };
    for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if (cs.overflow !== 'visible' || cs.overflowY !== 'visible') { const q = p.getBoundingClientRect(); a = { l: Math.max(a.l, q.left), t: Math.max(a.t, q.top), r: Math.min(a.r, q.right), b: Math.min(a.b, q.bottom) }; } }
    return a; };
  const texts = [...document.querySelectorAll('li, p, .it, .rv-sum, .status')].filter(e => vis(e) && e.textContent.trim());
  document.querySelectorAll('.side button, .stage button').forEach(b => {
    if (!vis(b)) return; const br = b.getBoundingClientRect();
    for (const e of texts) {
      if (e.contains(b) || b.contains(e)) continue;
      const a = clip(e); const ix = Math.min(a.r, br.right) - Math.max(a.l, br.left), iy = Math.min(a.b, br.bottom) - Math.max(a.t, br.top);
      if (ix > 2 && iy > 2) {
        // only when the button is really drawn on top there (not a button under a dialog or the tutorial box)
        const cx = (Math.max(a.l, br.left) + Math.min(a.r, br.right)) / 2, cy = (Math.max(a.t, br.top) + Math.min(a.b, br.bottom)) / 2;
        const top = document.elementFromPoint(cx, cy); if (!top || !(b === top || b.contains(top))) continue;
        bad.push('button over text: ' + b.textContent.trim().slice(0, 20) + ' / ' + e.textContent.trim().slice(0, 20)); break; }
    }
  });
  // the boxes under the table: nothing may be cut at the bottom or the side
  document.querySelectorAll('.side>.box, .side .status').forEach(e => {
    if (!vis(e)) return;
    if (e.scrollHeight > e.clientHeight + 1) bad.push('box content cut (height): ' + (e.id || e.className) + ' ' + e.scrollHeight + '>' + e.clientHeight);
    if (e.scrollWidth > e.clientWidth + 1) bad.push('box content cut (width): ' + (e.id || e.className));
  });
  document.querySelectorAll('.side .prog .it span, .side .prog .it em').forEach(e => { if (vis(e) && e.scrollWidth > e.clientWidth + 1) bad.push('text cut: ' + e.textContent.trim()); });
  return bad;
};
// the toast must not cover the boxes below the table, any card, the header or a label
const TOAST = () => {
  const bad = [], tEl = document.getElementById('toast');
  const tr = tEl.getBoundingClientRect();
  if (tr.left < 0 || tr.right > innerWidth || tr.top < 0 || tr.bottom > innerHeight) bad.push('toast leaves the window');
  const strip = document.getElementById('tstrip');
  if (strip && getComputedStyle(strip).display !== 'none') {
    // phone: the toast must sit exactly on the status strip (sticky at the top while the table is in view),
    // or be an opaque band at the top edge when the table is scrolled away
    const sr = strip.getBoundingClientRect(), tb = document.getElementById('table').getBoundingClientRect();
    const near = (a, b) => Math.abs(a - b) <= 2;
    if (sr.bottom > 0 && tb.bottom > sr.height) { if (!(near(tr.left, sr.left) && near(tr.right, sr.right) && near(tr.top, sr.top) && tr.bottom <= sr.bottom + 2)) bad.push('toast not on the strip ' + JSON.stringify([tr.top, tr.bottom, sr.top, sr.bottom])); }
    else if (!(near(tr.top, 0) && near(tr.left, 0) && near(tr.right, innerWidth))) bad.push('toast is not the top band');
    if (getComputedStyle(tEl).backgroundColor.indexOf('rgba') === 0) bad.push('toast not opaque');
    return bad;
  }
  const hit = r => !(r.right <= tr.left || r.left >= tr.right || r.bottom <= tr.top || r.top >= tr.bottom);
  document.querySelectorAll('.side>.box, .hf, .hb, .cap-grp b, #deckN, .m-tabs').forEach(e => {
    const r = e.getBoundingClientRect(); if (r.width && r.height && getComputedStyle(e).display !== 'none' && hit(r)) bad.push('toast covers ' + (e.id || e.className.toString().slice(0, 20)) + (e.dataset && e.dataset.id ? ' ' + e.dataset.id : ''));
  });
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
    const toastCheck = async name => {
      for (const sc of mob ? ['top', 'half', 'boxes'] : ['top']) {
      await p.evaluate(sc => { const t = document.getElementById('table'); const y = t.getBoundingClientRect().top + scrollY; scrollTo(0, sc === 'top' ? 0 : sc === 'half' ? y + t.offsetHeight / 2 : y + t.offsetHeight + 40); }, sc);
      for (const msg of ['早い月を引いたAIが親です', 'Lv.20 と対局 (R 1500) ・ 早い月を引いたAIが親です', 'The AI drew the earlier month and deals first ・ Rated game against Lv.20']) {
        await p.evaluate(m => window.HFToast(m), msg); await p.waitForTimeout(350);
        const bad = await p.evaluate(() => window.TOAST()); report.push([tag, 'toast-' + name + '-' + sc, bad]);
        if (msg.length < 20) await p.screenshot({ path: `${OUT}/${tag}-toast-${name}${sc === 'top' ? '' : '-' + sc}.png` });
      }
      }
      await p.evaluate(() => scrollTo(0, 0));
    };
    await p.evaluate(`window.TOAST = ${TOAST.toString()}`);
    await toastCheck('main');
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
    let plays = 0;
    for (let i = 0; i < 300; i++) {
      const st = await p.evaluate(() => { const ov = id => document.getElementById(id).classList.contains('on'); return ov('resOverlay') ? 'res' : ov('koiOverlay') ? 'koi' : document.querySelector('#field .hf.pickable') ? 'pick' : document.querySelector('#myHand .hf.can') ? 'play' : 'wait'; });
      if (st === 'res') { await shot('result'); if (await p.$('#resReview')) { await clickJS('#resReview'); await p.waitForTimeout(9000); await shot('review'); } break; }
      if (st === 'koi') { await shot('koi'); await clickJS('#btnStop'); await p.waitForTimeout(500); continue; }
      if (st === 'pick') { await clickJS('#field .hf.pickable'); await p.waitForTimeout(400); continue; }
      if (st === 'play') { if (++plays === 3) { await shot('mid'); await p.evaluate(`window.TOAST = ${TOAST.toString()}`); await toastCheck('mid'); } await clickJS('#myHand .hf.can:not(.dead)') || await clickJS('#myHand .hf.can'); await p.waitForTimeout(400); continue; }
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

// ヒット＆ブロー on the 3D table — browser flow test (playwright + Chrome).
//   cd <repo> && python3 -m http.server 8780 &   node hitblow/tools/test_3d.js [shots-dir]
// Plays the card's every mode (AI戦 · レート戦 · 二人で対戦 · 今日の一問 EASY / HARD) on the table through the real input (the
// dock's palette buttons, OK, the keys), checks the answers on the board, the case, the end card, the records, and measures the
// layout (the dock clear of the bar, the board framed above the dock, no button text wrapped) on PC and phone sizes.
'use strict';
const { chromium } = require('playwright');
const OUT = process.argv[2] || '/tmp/hb3', BASE = process.env.BASE || 'http://localhost:8780';
let fail = 0; const ok = (c, m) => { if (!c) fail++; console.log((c ? 'ok  ' : 'NG  ') + m); };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [];
  async function page(name, vp, touch) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1, locale: 'ja-JP' });
    await ctx.route(/fonts\.(googleapis|gstatic)|firebase|gstatic|googletagmanager/, r => r.abort());
    await ctx.addInitScript(() => { try { localStorage.setItem('atlas-sfx', '0'); } catch (e) {} });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource|net::/.test(m.text())) errs.push(name + ' console: ' + m.text()); });
    await p.goto(BASE + '/atlas/#games/hitblow', { waitUntil: 'load' });
    await p.waitForFunction(() => document.querySelector('#bvMode button') && window.Atlas3D && Atlas3D.hitblow, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    await p.evaluate(() => { document.querySelectorAll('.lbonus, .lbx, [class*=bonus]').forEach(e => { const b = e.querySelector('button'); if (b && /受け取る|Claim/.test(b.textContent)) b.click(); }); });
    for (let i = 0; i < 3; i++) { const btn = await p.$('button:has-text("受け取る")'); if (btn) { await btn.click().catch(() => {}); await p.waitForTimeout(500); } }
    return { p, ctx, shot: n => p.screenshot({ path: OUT + '/' + name + '-' + n + '.png' }) };
  }
  const tap = async (p, sel, touch) => { const el = await p.$(sel); if (!el) throw new Error('no ' + sel); if (touch) await el.tap(); else await el.click(); };
  async function startMode(p, m, size, touch) {
    await p.evaluate(([m, size]) => { const b = document.querySelector(`#bvMode button[data-m="${m}"]`); b.click(); if (size && document.querySelector('#bvSize')) { const s = document.querySelector('#bvSize'); s.value = String(size); s.dispatchEvent(new Event('change', { bubbles: true })); } }, [m, size]);
    await p.waitForTimeout(250);
  }
  const D = p => p.evaluate(() => { const d = Atlas3D.hitblow._dbg; return d ? { busy: d.busy(), over: d.over(), turn: d.turn(), hist: d.hist(), cfg: d.cfg(), secret: d.secret(), input: d.input() } : null; });
  // the human's move through the real dock buttons
  async function play(p, code, touch) {
    for (const v of code) await tap(p, `.hbpal button[data-v="${v}"]`, touch);
    await tap(p, '.hbok', touch);
  }
  const closeOv = async p => { for (let i = 0; i < 4; i++) { const b = await p.$('#ov.on button:has-text("受け取る"), #ov.on button.btn'); if (!b) break; await b.click().catch(() => {}); await p.waitForTimeout(400); } };
  async function waitMine(p) { await p.waitForFunction(() => { const d = Atlas3D.hitblow._dbg; return !d || d.over() || (!d.busy()); }, null, { timeout: 30000 }); }
  // a reasonable human: guesses a code consistent with every answer so far (from the engine)
  const thinkGuess = p => p.evaluate(() => { const d = Atlas3D.hitblow._dbg, E = HitBlowEngine, c = d.cfg(), cs = E.candsOf(c, d.hist()); return E.codeOf(c, cs[Math.floor(Math.random() * cs.length)]); });

  /* ---------- PC 1280×800: AI戦 to the end ---------- */
  {
    const { p, ctx, shot } = await page('pc', { width: 1280, height: 800 }, false);
    await startMode(p, 'ai', 1); await shot('card');
    await tap(p, '#bvStart'); await p.waitForFunction(() => Atlas3D.hitblow._dbg, null, { timeout: 20000 });
    await p.waitForTimeout(1500); await waitMine(p);
    let d = await D(p); ok(d && d.cfg.n === 4 && d.cfg.c === 6 && !d.cfg.rep, 'AI戦 starts on the カラー board (4 of 6, no repeats)');
    // layout: the dock above the bar, the board above the dock
    const L = await p.evaluate(() => { const r = e => e && e.getBoundingClientRect(), dk = r(document.querySelector('.hbdock')), tb = r(document.querySelector('#tbar')); const m = Table3D.modelRect && Table3D.modelRect(); return { dk: dk && [dk.top, dk.bottom, dk.left, dk.right], tb: tb && [tb.top, tb.bottom], m: m && [m.top, m.bottom, m.left, m.right], vh: innerHeight, vw: innerWidth }; });
    ok(L.dk && L.tb && L.dk[1] <= L.tb[0] + 1, 'the dock sits above the action bar (' + L.dk[1].toFixed(0) + ' ≤ ' + L.tb[0].toFixed(0) + ')');
    ok(L.m && L.m[1] <= L.dk[0] + 24 && L.m[0] >= 0, 'the board is framed above the dock (board bottom ' + L.m[1].toFixed(0) + ', dock top ' + L.dk[0].toFixed(0) + ', board top ' + L.m[0].toFixed(0) + ')');
    // input: a repeated colour is refused, Backspace takes one out, Enter submits
    if (d.turn === 0) {
      await tap(p, '.hbpal button[data-v="2"]'); await tap(p, '.hbpal button[data-v="2"]');
      ok((await D(p)).input.length === 1, 'no repeats in カラー: the second tap of the same colour is refused');
      await p.keyboard.press('5'); const two = (await D(p)).input.join(); await p.keyboard.press('Backspace'); ok(two === '2,4' && (await D(p)).input.join() === '2', 'keys: 5 puts a colour, Backspace takes it out');
      await p.keyboard.press('1'); await p.keyboard.press('4'); await p.keyboard.press('6');
      // a tap on a gem of the row on the board takes it out (picking works with the flat top view)
      { const pt = await p.evaluate(() => { const d = Atlas3D.hitblow._dbg, U = d.U, [x, z] = U.slot(d.hist().length, 1), v = Table3D.project(x, z, U.top + .1); return [v.x, v.y]; });
        const before = (await D(p)).input.length; await p.mouse.click(pt[0], pt[1]); await p.waitForTimeout(250);
        ok((await D(p)).input.length === before - 1, 'a click on a gem of the row on the board takes it out'); await p.keyboard.press('1'); }
      await shot('input');
      await p.keyboard.press('Enter'); await p.waitForTimeout(400);
      d = await D(p); ok(d.hist.length === 1 && d.hist[0].by === 0, 'Enter submits the row');
    }
    // play on until the end
    let guard = 0;
    while (guard++ < 30) {
      await waitMine(p); d = await D(p); if (!d || d.over) break;
      if (d.turn === 0 && !d.busy) { await play(p, await thinkGuess(p), false); await p.waitForTimeout(300); }
      if (guard === 3) await shot('midgame');
    }
    d = await D(p); const last = d && d.hist[d.hist.length - 1];
    // the answers on the board are the engine's
    const right = await p.evaluate(() => { const d = Atlas3D.hitblow._dbg; if (!d) return true; const s = d.secret(); return d.hist().every(x => { const f = HitBlowEngine.feedback(s, x.g); return f.h === x.h && f.b === x.b; }); });
    ok(right, 'every row on the board got the right ヒット / ブロー');
    await p.waitForSelector('#endc.on', { timeout: 15000 }); await p.waitForTimeout(600); await shot('end');
    const end = await p.evaluate(() => document.querySelector('#endc h3').textContent);
    ok(/勝ち|負け|引き分け|勝利|敗北/.test(end) || end.length > 0, 'the end card shows (' + end + ')');
    ok(await p.evaluate(() => Atlas3D.hitblow._dbg ? Atlas3D.hitblow._dbg.U.lid.rotation.x < -1.5 : true), 'the case is open at the end');
    // 二人で対戦: both seats through the dock
    await closeOv(p); await p.click('#eBack'); await p.waitForTimeout(1200);
    await startMode(p, 'pvp', 3); await tap(p, '#bvStart'); await p.waitForFunction(() => Atlas3D.hitblow._dbg, null, { timeout: 20000 }); await p.waitForTimeout(1500);
    d = await D(p); ok(d.cfg.kind === 'num' && d.cfg.n === 3 && d.cfg.c === 10, '二人で対戦 on ナンバー3 (3 digits of 0–9)');
    for (let i = 0; i < 2; i++) { await waitMine(p); await play(p, await thinkGuess(p), false); await p.waitForTimeout(1600); }
    d = await D(p); ok(d.over || (d.hist.length === 2 && d.hist[0].by === 0 && d.hist[1].by === 1), 'the two players take turns (rows by 0, 1)');
    await shot('pvp');
    // 今日の一問 EASY: the clue rows first, then solve it
    await p.evaluate(() => { const r = document.querySelector('#bvQuit') || document.querySelector('[data-a=quit]'); if (r) r.click(); });
    await p.goto(BASE + '/atlas/?d=1#games/hitblow'); await p.waitForFunction(() => document.querySelector('#bvMode button'), null, { timeout: 30000 }); await p.waitForTimeout(800);
    await startMode(p, 'daily'); await shot('daily-card');
    ok(await p.evaluate(() => !!document.querySelector('#bvDaily:not([hidden]) [data-daily=easy]') && getComputedStyle(document.querySelector('#bvStart')).display === 'none'), 'the daily tab shows EASY / HARD and hides スタート');
    await tap(p, '#bvDaily [data-daily="easy"]'); await p.waitForFunction(() => Atlas3D.hitblow._dbg, null, { timeout: 20000 }); await p.waitForTimeout(800);
    await p.waitForFunction(() => { const d = Atlas3D.hitblow._dbg; return d && !d.busy(); }, null, { timeout: 20000 });
    d = await D(p); const P = await p.evaluate(() => Atlas3D.hitblow._dbg.puzzle());
    ok(d.hist.length === P.clues.length && d.hist.every(x => x.by === 2), 'EASY: the clue rows are laid first (' + P.clues.length + ')');
    await shot('daily');
    await play(p, P.secret, false);
    await p.waitForSelector('#endc.on', { timeout: 15000 }); await p.waitForTimeout(500); await shot('daily-end');
    const dl = await p.evaluate(() => JSON.parse(localStorage.getItem('aicoding-hitblow-daily') || '{}'));
    ok(dl.days && Object.keys(dl.days).length === 1 && dl.streak === 1, 'solving the daily puzzle records the day (streak 1)');
    await ctx.close();
  }
  /* ---------- phone 390×844: レート戦 (AI), the layout ---------- */
  {
    const { p, ctx, shot } = await page('ph', { width: 390, height: 844 }, true);
    await tap(p, '#bvGo', true); await p.waitForTimeout(500);   // (phones: the あそぶ sheet holds the tabs)
    await startMode(p, 'daily', 0, true); await shot('sheet-daily');
    const dsh = await p.evaluate(() => { const r = e => e.getBoundingClientRect(), bs = [...document.querySelectorAll('#bvPS #bvDaily [data-daily]')]; return { n: bs.length, inside: bs.every(b => { const q = r(b); return q.left >= 0 && q.right <= innerWidth && q.bottom <= innerHeight; }), start: getComputedStyle(document.querySelector('#bvStart')).display === 'none' }; });
    ok(dsh.n === 2 && dsh.inside && dsh.start, 'phone: the あそぶ sheet shows EASY / HARD inside the screen, スタート hidden');
    await startMode(p, 'rated', 0, true); await shot('card');
    await tap(p, '#bvStart', true);
    await p.waitForFunction(() => Atlas3D.hitblow._dbg || document.querySelector('.plc, .placement, [class*=place]'), null, { timeout: 20000 });
    await p.waitForTimeout(1800); await waitMine(p);
    const d = await D(p); ok(d && d.cfg.n === 4 && !d.cfg.rep, 'レート戦 is played on カラー');
    const L = await p.evaluate(() => { const r = e => e && e.getBoundingClientRect(), dk = r(document.querySelector('.hbdock')), tb = r(document.querySelector('#tbar')), m = Table3D.modelRect && Table3D.modelRect(); const wrapped = [...document.querySelectorAll('.hbdock button, #tbar button')].filter(x => x.offsetParent).some(x => { const tw = document.createTreeWalker(x, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { if (!n.textContent.trim()) continue; const g = document.createRange(); g.selectNodeContents(n); if (new Set([...g.getClientRects()].map(q => Math.round(q.top / 4))).size > 1) return true; } return false; }); return { dk: dk && [dk.top, dk.bottom, dk.left, dk.right], tb: tb && [tb.top, tb.bottom], m: m && [m.top, m.bottom, m.left, m.right], vw: innerWidth, wrapped, sx: document.documentElement.scrollWidth > innerWidth + 1 }; });
    ok(L.dk[2] >= 0 && L.dk[3] <= L.vw + .5, 'phone: the dock is inside the screen');
    ok(L.dk[1] <= L.tb[0] + 1, 'phone: the dock sits above the action bar');
    ok(L.m && L.m[1] <= L.dk[0] + 24 && L.m[2] >= -2 && L.m[3] <= L.vw + 2, 'phone: the board is framed above the dock and across the width (' + L.m.map(x => x.toFixed(0)).join(',') + ')');
    ok(!L.wrapped && !L.sx, 'phone: no button text wrapped, no sideways scroll');
    if (d.turn === 0) { await play(p, await thinkGuess(p), true); await p.waitForTimeout(500); }
    await waitMine(p); await shot('rated');
    // resign = a loss, the rating moves
    await p.evaluate(() => { const b = document.querySelector('#tbar [data-a=resign]'); b && b.click(); }); await p.waitForTimeout(400);
    await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => b.offsetParent && /^はい$/.test(b.textContent.trim())); bs[0] && bs[0].click(); });
    await p.waitForSelector('#endc.on', { timeout: 15000 });
    const rt = await p.evaluate(() => JSON.parse(localStorage.getItem('atlas-rated-hitblow') || 'null'));
    ok(rt && rt.n === 1 && rt.l === 1, 'レート戦: resigning counts as a rated loss');
    await shot('rated-end');
    await ctx.close();
  }
  /* ---------- the other boards: every 種目 builds and answers right ---------- */
  {
    const { p, ctx, shot } = await page('pc2', { width: 1440, height: 900 }, false);
    for (const z of [2, 4, 5]) {
      await p.goto(BASE + '/atlas/?z=' + z + '#games/hitblow'); await p.waitForFunction(() => document.querySelector('#bvMode button'), null, { timeout: 30000 }); await p.waitForTimeout(600);
      await startMode(p, 'pvp', z); await tap(p, '#bvStart'); await p.waitForFunction(() => Atlas3D.hitblow._dbg, null, { timeout: 20000 }); await p.waitForTimeout(1500);
      const d = await D(p); ok(d.cfg.n === [0, 4, 4, 3, 4, 5][z], '種目 ' + d.cfg.id + ': ' + d.cfg.n + ' slots, ' + d.cfg.c + ' symbols');
      await play(p, await thinkGuess(p), false); await p.waitForTimeout(1500); await shot('rule' + z);
    }
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors' + (errs.length ? ':\n' + errs.join('\n') : ''));
  console.log(fail ? 'FAILED: ' + fail : 'ALL OK');
  await b.close(); process.exit(fail ? 1 : 0);
})();

// UI flow + layout audit (needs playwright + Chrome):
//   cd <repo> && python3 -m http.server 8771 &      node loa/tools/test_ui.js [screenshot-dir]
// Plays by clicking the board, lets the AI answer, undo / hint / resign / result / save & restore, a whole game to the end,
// two players, playing White, every tutorial task, English, and the layout at 1440×900, 1280×720, 1100×1300 (PC) and 390×844 (phone).
'use strict';
const { chromium } = require('playwright');
const OUT = process.argv[2] || '', URL = process.env.LOA_URL || 'http://localhost:8771/loa/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errs = []; let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('NG  ' + m); } else console.log('ok  ' + m); };
  const open = async (vp, mobile) => {
    const ctx = await b.newContext({ viewport: vp, locale: 'ja-JP', isMobile: !!mobile, hasTouch: !!mobile, deviceScaleFactor: mobile ? 2 : 1 });
    await ctx.route(/fonts\.(googleapis|gstatic)|firebase|gstatic/, r => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(700);
    return p;
  };
  const p = await open({ width: 1280, height: 720 });
  const shot = (n, pg) => OUT ? (pg || p).screenshot({ path: OUT + '/' + n + '.png' }) : null;
  const xy = (s, sel, pg) => (pg || p).evaluate(([s, sel]) => { const svg = document.querySelector(sel), m = svg.getScreenCTM(), pt = svg.createSVGPoint(); pt.x = LoaBoard.cx(s); pt.y = LoaBoard.cy(s); const q = pt.matrixTransform(m); return [q.x, q.y]; }, [s, sel || '#frame .lo-top']);
  const click = async (s, sel) => { const [x, y] = await xy(s, sel); await p.mouse.click(x, y); };
  const sq = n => (n.charCodeAt(0) - 97) + (+n[1] - 1) * 8;
  const playMove = async (from, to) => { await click(from); await p.waitForTimeout(120); await click(to); };
  const waitMine = () => p.waitForFunction(() => over() || (myTurn() && !G.busy), null, { timeout: 30000 });

  // --- first load ---
  ok(await p.evaluate(() => G.mode === 'ai' && G.level === 5 && G.human === 1 && G.st.ms.length === 0 && !over()), 'first load: a ready start position, AI Lv.5, you are Black');
  ok(!(await p.evaluate(() => document.querySelector('.overlay.show'))), 'no dialog on load');
  ok(await p.evaluate(() => document.querySelectorAll('#frame .lo-pc').length === 24 && document.querySelectorAll('#frame .lo-pc.b').length === 12), '24 pieces on the board');
  ok(await p.evaluate(() => [...document.querySelectorAll('.hb-menu .btn, .controls .btn')].filter(x => x.offsetParent).map(x => x.id).join() === 'btnNew,btnUndo,btnResign,btnHint,btnRules'), 'menu order: 新規 > 待った > 投了 > ヒント > ルール (' + await p.evaluate(() => [...document.querySelectorAll('.hb-menu .btn, .controls .btn')].filter(x => x.offsetParent).map(x => x.id).join()) + ')');
  await shot('ui-start');

  // --- select: the counted lines and the numbers ---
  await click(sq('d1')); await p.waitForTimeout(250);
  ok(await p.evaluate(() => G.sel === 3 && document.querySelectorAll('#frame .lo-line').length === 4 && document.querySelectorAll('#frame .lo-tg').length === 3 && [...document.querySelectorAll('#frame .lo-tg text')].every(x => x.textContent === '2')), 'selecting d1 shows its 4 lines and 3 destinations, each marked “2”');
  await shot('ui-select');
  await click(sq('d3')); await p.waitForTimeout(200);
  ok(await p.evaluate(() => G.st.ms.length >= 1 && LoaEngine.moveName(G.st.ms[0]) === 'd1-d3'), 'clicking the destination moves the piece (d1-d3)');
  ok(await p.evaluate(() => document.body.classList.contains('thinking') || G.st.ms.length === 2), 'the AI is shown as thinking');
  await p.waitForFunction(() => G.st.ms.length === 2 && !G.busy, null, { timeout: 15000 });
  ok(await p.evaluate(() => document.querySelectorAll('#kifu .k').length === 2 && document.querySelector('#kifu .k').textContent.includes('d1-d3')), 'the AI answers from the worker; the move log has 2 moves');
  await p.waitForFunction(() => G.evals[2] != null, null, { timeout: 5000 }).catch(() => {});
  ok(await p.evaluate(() => G.evals[1] != null && G.evals[2] != null && /%/.test(document.querySelector('#evalText').textContent) && !!document.querySelector('#graph polyline')), '形勢: a value after each move, bar and graph drawn (' + await p.evaluate(() => document.querySelector('#evalText').textContent) + ')');

  // --- undo ---
  await p.click('#btnUndo'); await p.waitForTimeout(250);
  ok(await p.evaluate(() => G.st.ms.length === 0 && myTurn() && document.querySelector('#btnUndo').disabled), 'undo takes back my move and the reply');

  // --- hint ---
  await p.click('#btnHint');
  await p.waitForFunction(() => !!G.hint, null, { timeout: 8000 });
  ok(await p.evaluate(() => !!document.querySelector('#frame .lo-hint') && LoaEngine.legal(G.st).includes(G.hint.m) && /[a-h][1-8]/.test(document.querySelector('#status').textContent)), 'hint: an arrow for a legal move, named in the status line (' + await p.evaluate(() => document.querySelector('#status').textContent) + ')');
  await shot('ui-hint');
  const h = await p.evaluate(() => [G.hint.from, G.hint.to]); await playMove(h[0], h[1]);
  await p.waitForFunction(() => G.st.ms.length === 2 && !G.busy, null, { timeout: 15000 });
  ok(await p.evaluate(() => !G.hint && !document.querySelector('#frame .lo-hint')), 'the hint goes away after the move');

  // --- reload restores ---
  const before = await p.evaluate(() => JSON.stringify([G.st.ms, G.level, G.human, Array.from(G.st.b)]));
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(600);
  ok(before === await p.evaluate(() => JSON.stringify([G.st.ms, G.level, G.human, Array.from(G.st.b)])), 'reload restores the same game');
  ok(!(await p.evaluate(() => document.querySelector('.overlay.show'))), 'no dialog after reload');

  // --- resign ---
  await p.click('#btnResign'); await p.waitForTimeout(300); await shot('ui-resign');
  await p.keyboard.press('Escape'); await p.waitForTimeout(250); ok(await p.evaluate(() => !over()), 'resign: Esc = no');
  await p.click('#btnResign'); await p.waitForTimeout(300);
  await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => b.offsetParent && /^はい$/.test(b.textContent.trim())); bs[0] && bs[0].click(); });
  await p.waitForSelector('#resultOverlay.show', { timeout: 5000 });
  ok(await p.evaluate(() => over() && G.resigned === 1 && document.querySelector('#resultTitle').textContent === '敗北' && /投了/.test(document.querySelector('#resultSub').textContent)), 'resign: はい ends the game as a loss');
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(500);
  ok(await p.evaluate(() => over() && !document.querySelector('#resultOverlay.show')), 'a finished game restored: no result dialog again');

  // --- a whole game against the AI, my moves taken from the engine and played by clicking ---
  await p.evaluate(() => { S.mode = 'ai'; S.side = 'black'; S.level = 3; S.variant = 'std'; newGame(); });
  let guard = 0;
  while (guard++ < 200) {
    await waitMine(); if (await p.evaluate(() => over())) break;
    const m = await p.evaluate(() => { const r = LoaEngine.search(LoaEngine.clone(G.st), { depth: 4, ms: 300 }); return [r.move & 63, (r.move >> 6) & 63]; });
    const n = await p.evaluate(() => G.st.ms.length); await playMove(m[0], m[1]);
    await p.waitForFunction(n => G.st.ms.length > n, n, { timeout: 5000 });
    if (guard === 6) await shot('ui-midgame');
  }
  await p.waitForSelector('#resultOverlay.show', { timeout: 8000 });
  let r = await p.evaluate(() => ({ w: winner(), n: G.st.ms.length, why: G.st.why, title: document.querySelector('#resultTitle').textContent, sub: document.querySelector('#resultSub').textContent, rows: document.querySelectorAll('#resultRows div').length, won: document.querySelectorAll('#frame .lo-pc.won').length }));
  ok(r.w >= 1 && r.rows === 3 && r.title === (r.w === 1 ? '勝利' : r.w === 2 ? '敗北' : '引き分け') && r.sub.length > 4, `a full game vs Lv.3 played to the end by clicks: ${r.title} in ${r.n} plies (${r.why}); “${r.sub}”`);
  ok(r.w === 3 || r.won > 0, 'the winning group is highlighted (' + r.won + ' pieces)');
  await p.waitForTimeout(400); await shot('ui-result');
  const rec = await p.evaluate(() => JSON.parse(localStorage.getItem('atlas-rec-loa') || '[]'));
  ok((rec.games || rec).length === 2, 'two games in the record (戦績): the resigned one and this one');
  await p.click('#btnAgain'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !over() && G.st.ms.length === 0 && !document.querySelector('#resultOverlay.show')), '“もう一度” starts a new game');

  // --- playing White: the AI opens; two players ---
  await p.evaluate(() => { S.side = 'white'; S.level = 2; newGame(); });
  await p.waitForFunction(() => G.st.ms.length === 1 && myTurn() && !G.busy, null, { timeout: 15000 });
  ok(await p.evaluate(() => G.human === 2 && document.querySelector('#btnUndo').disabled), 'playing White: the AI makes the first move, nothing to take back yet');
  let m = await p.evaluate(() => { const x = LoaEngine.legal(G.st)[0]; return [x & 63, (x >> 6) & 63]; }); await playMove(m[0], m[1]);
  await p.waitForFunction(() => G.st.ms.length === 3 && !G.busy, null, { timeout: 15000 });
  await p.click('#btnUndo'); await p.waitForTimeout(250);
  ok(await p.evaluate(() => G.st.ms.length === 1 && myTurn()), 'undo as White goes back to my previous turn');
  await p.evaluate(() => { S.mode = 'pvp'; S.variant = 'scr'; newGame(); });
  m = await p.evaluate(() => { const x = LoaEngine.legal(G.st)[0]; return [x & 63, (x >> 6) & 63]; }); await playMove(m[0], m[1]); await p.waitForTimeout(450);
  m = await p.evaluate(() => { const x = LoaEngine.legal(G.st)[0]; return [x & 63, (x >> 6) & 63]; }); await playMove(m[0], m[1]); await p.waitForTimeout(450);
  ok(await p.evaluate(() => G.st.ms.length === 2 && G.st.turn === 1 && G.variant === 'scr' && !G.busy), 'two players on one device: both colours move by clicks (Scrambled Eggs)');
  await shot('ui-scrambled');
  await p.click('#btnUndo'); await p.waitForTimeout(200); ok(await p.evaluate(() => G.st.ms.length === 1 && G.st.turn === 2), 'two players: undo takes back one move');

  // --- new-game dialog ---
  await p.evaluate(() => { S.mode = 'ai'; S.variant = 'std'; S.side = 'black'; S.level = 5; newGame(); });
  await p.click('#btnNew'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.querySelectorAll('#varCards .ngt-gcard').length === 2 && document.querySelectorAll('#bdRow button svg').length === 4), 'new game: 2 variant cards with board art, 4 design tiles with pictures');
  await shot('ui-newgame');
  await p.evaluate(() => { const tb = [...document.querySelectorAll('#newOverlay button, #newOverlay [role=tab]')].find(x => x.offsetParent && x.textContent.trim() === 'デザイン'); if (tb) tb.click(); }); await p.waitForTimeout(350);
  await p.click('#bdRow button[data-v="slate"]'); await p.waitForTimeout(350);
  ok(await p.evaluate(() => document.body.classList.contains('bd-slate') && JSON.parse(localStorage.getItem('aicoding-loa')).settings.design === 'slate'), 'a design tile applies at once and is saved');
  await shot('ui-newgame-design');
  await p.click('#bdRow button[data-v="walnut"]'); await p.waitForTimeout(200);
  await p.evaluate(() => { const tb = [...document.querySelectorAll('#newOverlay button, #newOverlay [role=tab]')].find(x => x.offsetParent && x.textContent.trim().startsWith('ルール')); if (tb) tb.click(); }); await p.waitForTimeout(250);
  await p.click('#segMode button[data-v="pvp"]'); ok(await p.evaluate(() => document.querySelector('#fLevel').classList.contains('hidden')), 'two-player mode hides the AI settings');
  await p.click('#segMode button[data-v="ai"]'); await p.click('#btnCancelNew'); await p.waitForTimeout(250);

  // --- rules tour: every task can be cleared, and it moves on by itself ---
  await p.click('#btnRules'); await p.waitForTimeout(500); await shot('ui-tour-intro');
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500);
  for (const id of ['count', 'jump', 'block', 'cap', 'goal']) {
    const mv = await p.evaluate(id => { const E = LoaEngine, st = E.fromText(LoaTour.POS[id], 1), T = LoaTour.TASKS[id], from = E.sqOf(T.from);
      for (const m of E.legal(st)) { if ((m & 63) !== from) continue; const s = E.clone(st), r = E.play(s, m); if (r && T.good(r, s)) return [from, (m >> 6) & 63]; } return null; }, id);
    if (!mv) { ok(false, 'tour ' + id + ': no clearing move'); continue; }
    await click(mv[0], '#rulesBody .lo-top'); await p.waitForTimeout(250);
    if (id === 'block') { ok(await p.evaluate(() => document.querySelectorAll('#rulesBody .lo-no').length === 1), 'tour: the blocked direction is marked ×'); await shot('ui-tour-block'); }
    if (id === 'cap') await shot('ui-tour-capture');
    await click(mv[1], '#rulesBody .lo-top'); await p.waitForTimeout(id === 'goal' ? 900 : 3000);
    if (id === 'goal') { await shot('ui-tour-goal'); await p.waitForTimeout(2300); }
  }
  const cleared = await p.evaluate(() => localStorage.getItem('aicoding-loa-rules') || '');
  ok(['count', 'jump', 'block', 'cap', 'goal'].every(k => cleared.includes(k)), 'tour: the five tasks are cleared (' + cleared.slice(0, 90) + ')');
  ok(await p.evaluate(() => /同時/.test(document.querySelector('#rulesBody').innerText)), 'tour: after the last task it has moved on to the “同時につながったら” page by itself');
  await shot('ui-tour-last');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);

  // --- English ---
  await p.evaluate(() => { const s = document.querySelector('#langSel'); s.value = 'en'; s.dispatchEvent(new Event('change')); }); await p.waitForTimeout(400);
  const missing = await p.evaluate(() => { const ja = LOA_I18N.ja, en = LOA_I18N.en; return Object.keys(ja).filter(k => !(k in en)).concat(Object.keys(en).filter(k => !(k in ja))); });
  ok(missing.length === 0, 'ja / en have the same keys ' + missing.join(','));
  ok(await p.evaluate(() => [...document.querySelectorAll('#langSel option')].map(o => o.textContent).join() === '日本語,English'), 'the language menu lists only 日本語 / English');
  await click(sq('d1')); await p.waitForTimeout(200);
  const jp = await p.evaluate(() => { const txt = [document.querySelector('.side').innerText, ...[...document.querySelectorAll('.btn')].filter(x => x.offsetParent).map(x => x.innerText), document.title].join(' | '); const m = txt.match(/[ぁ-んァ-ヶ一-龥]+/g); return m ? m.join(' ') : ''; });
  ok(await p.evaluate(() => document.querySelector('#ttlName').textContent === 'Lines of Action') && !jp, 'English: no Japanese left on the game screen ' + jp);
  await shot('ui-en');
  await p.evaluate(() => { const s = document.querySelector('#langSel'); s.value = 'ja'; s.dispatchEvent(new Event('change')); });
  await p.context().close();

  // --- layout audit ---
  // not counted as “button text”: the description paragraph of a variant card (meant to wrap). Not counted for the font size:
  // the shared bottom tab bar (#mtabs), the sub-label of the shared dialog tabs and the series name in the shared header bar
  // (10.5–11px in every game, set by shared/*.js), and SVG text.
  const audit = pg => pg.evaluate(() => {
    const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && !!el.offsetParent && !el.closest('.overlay:not(.show)'); };
    const f = document.querySelector('#frame').getBoundingClientRect(), side = document.querySelector('.side').getBoundingClientRect(), W = innerWidth, H = innerHeight;
    const wraps = [], small = []; let minFont = 99;
    for (const el of document.querySelectorAll('button, .btn, .mbtn, a.snd')) { if (!vis(el)) continue;
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { if (!n.textContent.trim() || n.parentElement.closest('svg, .ngt-gcard p')) continue; const pe = n.parentElement; if (!vis(pe)) continue; const rg = document.createRange(); rg.selectNodeContents(n); const tops = new Set([...rg.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top))); if (tops.size > 1) wraps.push((el.id || el.className) + ':' + n.textContent.trim()); } }
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = tw.nextNode())) { if (!n.textContent.trim()) continue; const pe = n.parentElement; if (!pe || pe.closest('svg, script, style, select, #mtabs, .ngt-bar small, .hb .series') || !vis(pe)) continue; const fs = parseFloat(getComputedStyle(pe).fontSize); if (fs < minFont) minFont = fs; if (fs < 13) small.push(fs + ':' + n.textContent.trim().slice(0, 14)); }
    const tabs = document.querySelector('#mtabs'), tb = tabs && getComputedStyle(tabs).display !== 'none' ? tabs.getBoundingClientRect().top : H;
    return { frame: [Math.round(f.left), Math.round(f.top), Math.round(f.width * 10) / 10, Math.round(f.height * 10) / 10], square: Math.abs(f.width - f.height) < 1, inside: f.left >= 0 && f.top >= 0 && f.right <= W + .5 && f.bottom <= Math.min(H, tb) + .5,
      hscroll: document.documentElement.scrollWidth > W + 1 || document.body.scrollWidth > W + 1, sideW: Math.round(side.width * 10) / 10, sideIn: side.right <= W + .5 && side.bottom <= H + .5, sideRight: side.left >= f.right, wraps, small, minFont,
      lbl: Math.round(parseFloat(getComputedStyle(document.querySelector('#frame .lo-lbl')).fontSize) * f.width / 100 * (1 - .03) * 10) / 10 };
  });
  for (const [name, vp, mobile] of [['pc-1440x900', { width: 1440, height: 900 }], ['pc-1280x720', { width: 1280, height: 720 }], ['pc-1100x1300', { width: 1100, height: 1300 }], ['phone-390x844', { width: 390, height: 844 }, true]]) {
    const pg = await open(vp, mobile);
    // a position a few moves in, a piece selected
    await pg.evaluate(() => { S.mode = 'pvp'; S.variant = 'std'; newGame(); for (const n of ['d1-d3', 'a4-c4', 'f8-f6', 'h5-f5', 'c1-e3', 'a6-d6']) { const m = LoaEngine.legal(G.st).find(x => LoaEngine.moveName(x) === n); applyMove(m); } G.mode = 'ai'; G.human = 1; G.level = 12; G.evals = [.5, .52, .5, .55, .51, .58, .56]; tapSquare(LoaEngine.sqOf('g1')); render(); });
    await pg.waitForTimeout(700);
    for (const lang of ['ja', 'en']) {
      await pg.evaluate(l => { const s = document.querySelector('#langSel'); s.value = l; s.dispatchEvent(new Event('change')); }, lang); await pg.waitForTimeout(300);
      const a = await audit(pg), tag = name + ' ' + lang;
      ok(a.square && a.inside, `${tag}: board square and inside the viewport ${JSON.stringify(a.frame)}`);
      ok(!a.hscroll, `${tag}: no horizontal scroll`);
      ok(a.wraps.length === 0, `${tag}: no button text wraps ${a.wraps.join(' / ')}`);
      ok(a.small.length === 0, `${tag}: smallest text ${a.minFont}px (≥ 13) ${a.small.slice(0, 5).join(' / ')}; board coordinates ≈ ${a.lbl}px`);
      if (!mobile) ok(a.sideW === 360 && a.sideIn && a.sideRight, `${tag}: right column 360px, beside the board, inside the viewport (${a.sideW})`);
      if (lang === 'ja') await shot(name, pg);
      // the dialogs too
      await pg.evaluate(() => openNew()); await pg.waitForTimeout(450);
      const d = await audit(pg); ok(d.wraps.length === 0 && !d.hscroll && d.small.length === 0, `${tag}: new-game dialog — no wrapping, no small text ${d.wraps.concat(d.small).slice(0, 6).join(' / ')}`);
      if (lang === 'ja') { await shot(name + '-newgame', pg);
        if (mobile) { await pg.evaluate(() => { const tb = [...document.querySelectorAll('#newOverlay button')].find(x => x.offsetParent && x.textContent.trim() === 'デザイン'); if (tb) tb.click(); }); await pg.waitForTimeout(350); await shot(name + '-design', pg); const e = await audit(pg); ok(e.wraps.length === 0 && !e.hscroll, `${tag}: design tab — no wrapping ${e.wraps.join(' / ')}`); } }
      await pg.evaluate(() => closeNew()); await pg.waitForTimeout(250);
    }
    await pg.evaluate(() => { const s = document.querySelector('#langSel'); s.value = 'ja'; s.dispatchEvent(new Event('change')); G.resigned = 0; G.st = LoaEngine.fromText(['.o......', 'o.....o.', '........', '...xx...', '....xx..', '........', '.......o', '...x....'], 1); G.sel = -1; applyMove(LoaEngine.sqOf('d1') | LoaEngine.sqOf('d3') << 6); });
    await pg.waitForSelector('#resultOverlay.show', { timeout: 5000 }); await pg.waitForTimeout(350);
    const e = await audit(pg); ok(e.wraps.length === 0 && e.small.length === 0, `${name}: result dialog — no wrapping, no small text ${e.wraps.concat(e.small).join(' / ')}`);
    await shot(name + '-result', pg);
    if (mobile) { await pg.evaluate(() => { document.querySelector('#resultOverlay').classList.remove('show'); window.LoaTour.open(); }); await pg.waitForTimeout(500); await pg.evaluate(() => document.querySelector('#rulesBody [data-rt-act="next"]') && document.querySelector('#rulesBody [data-rt-act="next"]').click()); await pg.waitForTimeout(600); await shot(name + '-tour', pg); }
    await pg.context().close();
  }
  console.log(errs.length ? 'PAGE ERRORS:\n' + [...new Set(errs)].join('\n') : 'no page errors'); if (errs.length) fail++;
  console.log(fail ? 'FAILED: ' + fail : 'ALL OK');
  await b.close(); process.exit(fail ? 1 : 0);
})();

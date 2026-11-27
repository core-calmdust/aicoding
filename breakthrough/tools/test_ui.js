// UI flow + layout check (playwright + Chrome): cd <repo> && python3 -m http.server 8791 &  node breakthrough/tools/test_ui.js [shots-dir]
// Plays by clicking: a move and the AI's answer, undo, hint, resign (Esc = no / はい = loss), reload restores without a dialog, a whole
// game to the end, the rules tutorial's tasks, the new-game dialog, lessons and a puzzle; layouts at PC 1920×1080 / 1440×900 /
// 1280×720 / 1100×1300 and phone 390×844 (no horizontal scroll, the board inside the window, button labels on one line).
'use strict';
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const OUT = process.argv[2] || '/home/claude/bt-shots', PARTS = (process.argv[3] || 'basic,game,rules,dialog').split(','), URL = process.env.BT_URL || 'http://localhost:8791/breakthrough/';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errs = []; let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('NG  ' + m); } else console.log('ok  ' + m); };
  const open = async (vp, mobile, lang, q) => {
    const ctx = await b.newContext({ viewport: vp, locale: lang || 'ja-JP', isMobile: !!mobile, hasTouch: !!mobile, deviceScaleFactor: mobile ? 3 : 1 });
    await ctx.route(/firebase|gstatic\.com\/firebasejs|recaptcha/, r => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(vp.width + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource|net::/.test(m.text())) errs.push(vp.width + ': ' + m.text()); });
    await p.goto(URL + (q || ''), { waitUntil: 'load' }); await p.waitForTimeout(1200);
    return p;
  };
  const sqXY = (p, i) => p.evaluate(i => { const el = document.querySelector('#board'), r = el.getBoundingClientRect(), E = window.BreakthroughEngine, N = E.N; let [rr, c] = E.RC[i]; const fl = document.querySelector('#board') && window.__bt && __bt.flip; if (fl) { rr = N - 1 - rr; c = N - 1 - c; } return [r.left + (c + .5) * r.width / N, r.top + (rr + .5) * r.height / N]; }, i);
  const click = async (p, i) => { const [x, y] = await sqXY(p, i); await p.mouse.click(x, y); };
  const playM = async (p, m) => { await click(p, m % 128); await p.waitForTimeout(120); await click(p, (m / 128) | 0); };
  const shot = (p, n) => p.screenshot({ path: OUT + '/' + n + '.png' });

  // ---------------- PC 1440×900, Japanese
  let p = await open({ width: 1440, height: 900 });
  ok(!(await p.evaluate(() => document.querySelector('.overlay.show'))), 'no dialog on load');
  ok(await p.evaluate(() => document.querySelectorAll('#pieces .pc').length === 32), '32 pieces');
  const order = await p.evaluate(() => [...document.querySelectorAll('.hb .btn, .hb button[id^=btn]')].filter(x => x.offsetParent).map(x => x.id).join());
  ok(/btnNew,btnUndo,btnResign,btnHint,btnRules,btnLesson,btnPuzzle/.test(order), 'menu order ' + order);
  await shot(p, 'pc1440-start');
  // a move by clicks and the AI's reply
  await click(p, 6 * 8 + 4); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.querySelectorAll('#fx .dest').length >= 2), 'selecting e2 shows its destinations');
  await shot(p, 'pc1440-select');
  await click(p, 5 * 8 + 4);
  await p.waitForFunction(() => __bt.moves.length >= 2, null, { timeout: 15000 });
  ok(true, 'e2-e3 played, the AI answered: ' + await p.evaluate(() => __bt.moves.length));
  await p.click('#btnUndo'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => __bt.moves.length === 0), 'undo takes back both');
  await p.click('#btnHint'); await p.waitForTimeout(2200);
  ok(await p.evaluate(() => document.querySelectorAll('#fx .hintlbl').length > 0), 'hint labels on the board');
  await shot(p, 'pc1440-hint'); await p.click('#btnHint');
  if (PARTS.includes('game')) {
  // a whole game vs Lv.1: my move = a capture if any, else a random forward move
  await p.evaluate(() => { __bt.settings.level = 1; __bt.settings.mode = 'ai'; __bt.settings.color = 1; __bt.newGame(); });
  for (let g = 0; g < 150; g++) {
    const st = await p.evaluate(() => { const s = __bt.statusAt(__bt.moves.length); return s.over ? 'over' : __bt.canPlay() ? 'me' : 'wait'; });
    if (st === 'over') break;
    if (st === 'wait') { await p.waitForTimeout(150); continue; }
    const m = await p.evaluate(() => { const E = BreakthroughEngine, pos = __bt.posAt(__bt.moves.length).pos, L = pos.moves(); const w = L.find(m => { const q = pos.clone().play(m); return E.judge(q).over; }); if (w != null) return w; const c = L.filter(m => E.isCap(pos, m)); const pool = c.length ? c : L; return pool[Math.floor(Math.random() * pool.length)]; });
    await playM(p, m); await p.waitForTimeout(450);
  }
  await p.waitForSelector('#resultOverlay.show', { timeout: 10000 }).catch(() => {});
  ok(await p.evaluate(() => document.querySelector('#resultOverlay').classList.contains('show')), 'a whole game by clicks ends with the result dialog: ' + await p.evaluate(() => document.querySelector('#resultTitle').textContent + ' / ' + document.querySelector('#resultSub').textContent.slice(0, 60)));
  await shot(p, 'pc1440-result');
  await p.click('#btnReview'); await p.waitForTimeout(300);
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1200);
  ok(!(await p.evaluate(() => document.querySelector('.overlay.show'))), 'reload: no result dialog again');
  }
  // resign
  await p.evaluate(() => { __bt.settings.level = 3; __bt.newGame(); });
  await click(p, 6 * 8 + 3); await p.waitForTimeout(150); await click(p, 5 * 8 + 3);
  await p.waitForFunction(() => __bt.moves.length >= 2, null, { timeout: 15000 });
  await p.click('#btnResign'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !__bt.statusAt(__bt.moves.length).over), 'resign: Esc = no');
  await p.click('#btnResign'); await p.waitForTimeout(300);
  await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => b.offsetParent && /^はい$/.test(b.textContent.trim())); bs[0] && bs[0].click(); });
  await p.waitForSelector('#resultOverlay.show', { timeout: 5000 }).catch(() => {});
  ok(await p.evaluate(() => /投了/.test(document.querySelector('#resultSub').textContent)), 'resign: はい = loss by resignation');
  await p.click('#btnReview');
  if (PARTS.includes('rules')) {
  // rules tutorial: do every task
  await p.click('#btnRules'); await p.waitForTimeout(600);
  await shot(p, 'pc1440-rules-1');
  const tasks = { step: [[4 * 6 + 2, 3 * 6 + 2]], diag: [[4 * 6 + 2, 3 * 6 + 1]], cap: [[3 * 6 + 2, 2 * 6 + 3]], goal: [[1 * 6 + 3, 0 * 6 + 3]], stop: [[5 * 6 + 2, 4 * 6 + 3]], wipe: [[3 * 6 + 1, 2 * 6 + 2]] };
  for (let pg = 1; pg < 10; pg++) {
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500);
    const id = await p.evaluate(() => { const t = document.querySelector('#rulesBody .rt-title, #rulesBody h2'); return t ? t.textContent : ''; });
    const ttl = await p.evaluate(() => (document.querySelector('#rulesBody .rt-title') || {}).textContent || '');
    const tk = { '前へ進む': 'step', '斜め前にも進める': 'diag', '斜め前の駒を取る': 'cap', '奥の段に届けば勝ち': 'goal', 'ゴール目前の駒は取る': 'stop', '全部取っても勝ち': 'wipe' }[ttl];
    if (tk) {
      for (const [f, t] of tasks[tk]) {
        for (const q of [f, t]) { await p.evaluate(q => { const r = document.querySelector('#rulesBody svg.tour [data-p="' + q + '"]'); r && r.dispatchEvent(new MouseEvent('click', { bubbles: true })); }, q); await p.waitForTimeout(200); }
      }
      await p.waitForTimeout(400);
      const okk = await p.evaluate(() => /rt-ok|ok/.test((document.querySelector('#rulesBody .rt-msg') || {}).className || '') || !!document.querySelector('#rulesBody .rt-msg.ok'));
      ok(okk, 'rules task: ' + ttl);
      await shot(p, 'pc1440-rules-' + tk);
      await p.waitForTimeout(1900);
    }
    if (ttl === '盤の大きさ') { await shot(p, 'pc1440-rules-vars'); break; }
  }
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  }
  // new-game dialog
  await p.evaluate(() => { __bt.newGame(); }); await p.click('#btnNew'); await p.waitForTimeout(600);
  await shot(p, 'pc1440-newgame');
  await p.evaluate(() => { const t = [...document.querySelectorAll('#newOverlay [data-ngt], #newOverlay .ngt-tabs button')].find(x => /デザイン/.test(x.textContent)); t && t.click(); }); await p.waitForTimeout(400);
  await shot(p, 'pc1440-newgame-design');
  await p.evaluate(() => { const t = [...document.querySelectorAll('#newOverlay [data-ngt], #newOverlay .ngt-tabs button')].find(x => /ゲーム/.test(x.textContent)); t && t.click(); }); await p.waitForTimeout(400);
  await shot(p, 'pc1440-newgame-game');
  await p.keyboard.press('Escape');

  if (PARTS.includes('learn')) {
  // lessons: every step — the warm-up shows, skip it, solve the first problem with its answer, a wrong move on the second
  const NE = require('../engine.js'); NE.setRule('s8');
  await p.evaluate(() => __bt.lessonsReady.then(() => 1));
  await p.waitForFunction(() => __bt.LESSONS && __bt.LESSONS.steps, null, { timeout: 10000 });
  const nSteps = await p.evaluate(() => __bt.LESSONS.steps.length);
  for (let st = 0; st < nSteps; st++) {
    await p.evaluate(st => __bt.startLesson(st), st); await p.waitForTimeout(700);
    if (st < 2 || st === nSteps - 1) await shot(p, 'pc1440-lesson' + st + '-ramp');
    for (let g = 0; g < 4 && await p.evaluate(() => !!(__bt.lesson && __bt.lesson.ramp)); g++) { await p.evaluate(() => { const b = document.querySelector('#lsPrompt .ls-skip'); b && b.click(); }); await p.waitForTimeout(500); }
    const best = await p.evaluate(() => { const L = __bt.lesson, P = __bt.LESSONS.steps[L.step].problems[L.i]; return P.best; });
    await playM(p, best); await p.waitForTimeout(900);
    const r1 = await p.evaluate(() => __bt.lesson.results.slice());
    ok(r1.length >= 1 && r1[0] > 0, 'lesson ' + st + ' problem 1 solved by its answer: ' + JSON.stringify(r1));
    if (st === 3) await shot(p, 'pc1440-lesson-ok');
    // next problem, a wrong move
    await p.evaluate(() => { const b = [...document.querySelectorAll('#lessonCard button, #lsPrompt button')].find(x => x.offsetParent && /次|Next/.test(x.textContent)); b && b.click(); }); await p.waitForTimeout(700);
    const wrong = await p.evaluate(() => { const L = __bt.lesson, P = __bt.LESSONS.steps[L.step].problems[L.i]; return Object.keys(P.ng)[0]; });
    if (wrong != null) { await playM(p, +wrong); await p.waitForTimeout(1400); }
    const txt = await p.evaluate(() => (document.querySelector('#lessonCard') || {}).textContent || '');
    ok(txt.length > 20 && !/ls\.ng\.|\{[a-z]\}/.test(txt), 'lesson ' + st + ' wrong move explained: ' + txt.replace(/\s+/g, ' ').slice(0, 90));
    if (st === 3) await shot(p, 'pc1440-lesson-ng');
  }
  // puzzles: the first of every theme solved with the solver's moves (node side, same engine)
  await p.evaluate(() => __bt.puzzlesReady.then(() => 1));
  await p.waitForFunction(() => __bt.PUZZLES && __bt.PUZZLES.themes, null, { timeout: 10000 });
  const nT = await p.evaluate(() => __bt.PUZZLES.themes.length);
  for (let L = 0; L < nT; L++) {
    await p.evaluate(L => __bt.startPuzzle(L, 0), L); await p.waitForTimeout(700);
    if (L === 0 || L === 4) await shot(p, 'pc1440-puzzle' + L);
    for (let g = 0; g < 80; g++) {
      const st = await p.evaluate(() => ({ s: __bt.puzzle && __bt.puzzle.state, me: __bt.canPlay(), sp: __bt.posAt(__bt.moves.length).pos.spec(), def: !!__bt.puzzle.P.def, n: __bt.puzzle.P.n, used: __bt.moves.length }));
      if (st.s !== 'play') break;
      if (!st.me) { await p.waitForTimeout(300); continue; }
      let m;
      if (st.def) { const reps = NE.duelReplies(st.sp, [], 3); m = (reps.find(e => e.need === 0) || reps[0]).m; }
      else { const k = NE.duelMin(st.sp, [], st.n) || st.n; m = NE.duelGood(st.sp, [], k)[0]; }
      await playM(p, m); await p.waitForTimeout(900);
    }
    await p.waitForTimeout(800);
    const res = await p.evaluate(() => ({ s: __bt.puzzle && __bt.puzzle.state, id: __bt.puzzle && __bt.puzzle.T.id }));
    ok(res.s === 'solved' || res.s === 'done', 'puzzle theme ' + res.id + ' #1 solved by the solver line: ' + res.s);
    if (L === 0) await shot(p, 'pc1440-puzzle-solved');
  }
  await p.evaluate(() => { __bt.newGame(); });
  }
  if (PARTS.includes('design')) {
  // every board × the default pieces, and every piece set on the default board (design self-check)
  for (const bd of ['walnut', 'marble', 'leather', 'slate']) for (const pc of ['wood', 'stone', 'metal', 'glass']) {
    if (bd !== 'walnut' && pc !== 'wood' && !(bd === 'slate' && pc === 'glass') && !(bd === 'marble' && pc === 'metal')) continue;
    await p.evaluate(([bd, pc]) => { __bt.settings.bd = bd; __bt.settings.pcs = pc; __bt.designApply(); }, [bd, pc]); await p.waitForTimeout(500);
    await p.screenshot({ path: OUT + '/design-' + bd + '-' + pc + '.png', clip: await p.evaluate(() => { const r = document.querySelector('#board').getBoundingClientRect(); return { x: r.left - 30, y: r.top - 30, width: r.width + 60, height: r.height + 60 }; }) });
  }
  }
  if (PARTS.includes('layout')) {
  const lay = q => q.evaluate(() => {
    const W = innerWidth, H = innerHeight, bad = [];
    if (document.documentElement.scrollWidth > W + 1) bad.push('hscroll ' + document.documentElement.scrollWidth);
    const r = document.querySelector('#board').getBoundingClientRect();
    if (r.left < 4 || r.right > W - 4 || r.top < 0) bad.push('board edge ' + [r.left, r.right, r.top].map(Math.round));
    const vis = el => { if (!el.offsetParent || el.closest('.overlay:not(.show)')) return false; const c = getComputedStyle(el); if (c.visibility === 'hidden' || +c.opacity === 0) return false; const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < H; };
    const btns = [...document.querySelectorAll('button')].filter(vis);
    for (const el of btns) {
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; const tn = []; while ((n = tw.nextNode())) if (n.textContent.trim()) tn.push(n);
      if (tn.length !== 1) continue;   // (cards with a title and a description may wrap their description; a label must not)
      for (const n of tn) { if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); const tops = [...rg.getClientRects()].filter(x => x.width > 1).map(x => Math.round(x.top)); if (tops.length > 1 && Math.max(...tops) - Math.min(...tops) > 4) { bad.push('wrap: ' + el.textContent.trim().slice(0, 24)); break; } }
    }
    const hb = btns.filter(b => b.closest('.hb'));
    for (let i = 0; i < hb.length; i++) for (let j = i + 1; j < hb.length; j++) { if (hb[i].contains(hb[j]) || hb[j].contains(hb[i])) continue; const a = hb[i].getBoundingClientRect(), c = hb[j].getBoundingClientRect(); if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) bad.push('overlap: ' + hb[i].textContent.trim().slice(0, 12) + ' / ' + hb[j].textContent.trim().slice(0, 12)); }
    const fs = parseFloat(getComputedStyle(document.querySelector('#status') || document.body).fontSize);
    if (fs < 13) bad.push('small text ' + fs);
    return bad;
  });
  const VPS = [[{ width: 1920, height: 1080 }, 0, 'pc1920'], [{ width: 1440, height: 900 }, 0, 'pc1440'], [{ width: 1280, height: 720 }, 0, 'pc1280'], [{ width: 1100, height: 1300 }, 0, 'tab1100'], [{ width: 390, height: 844 }, 1, 'sp390']];
  for (const [vp, mob, tag] of VPS) for (const lang of ['ja', 'en', 'de', 'ru', 'ar', 'hi', 'zh']) {
    if (tag !== 'pc1440' && tag !== 'sp390' && !['ja', 'de', 'ar'].includes(lang)) continue;
    const q = await open(vp, mob, lang, '?lang=' + lang);
    const bad = await lay(q);
    ok(!bad.length, tag + ' ' + lang + ' layout ' + (bad.join(' | ') || 'clean'));
    await q.screenshot({ path: OUT + '/' + tag + '-' + lang + '.png' });
    if (lang === 'ja' || lang === 'de' || lang === 'ar') {
      await q.click('#btnNew'); await q.waitForTimeout(500);
      const bad2 = await lay(q); ok(!bad2.filter(x => !/board edge/.test(x)).length, tag + ' ' + lang + ' new-game dialog ' + (bad2.join(' | ') || 'clean'));
      await q.screenshot({ path: OUT + '/' + tag + '-' + lang + '-new.png' });
      await q.keyboard.press('Escape'); await q.waitForTimeout(300);
      await q.click('#btnLesson'); await q.waitForTimeout(700);
      const bad3 = await lay(q); ok(!bad3.filter(x => !/board edge/.test(x)).length, tag + ' ' + lang + ' lesson list ' + (bad3.join(' | ') || 'clean'));
      await q.screenshot({ path: OUT + '/' + tag + '-' + lang + '-lessons.png' });
      await q.keyboard.press('Escape'); await q.waitForTimeout(300);
      await q.click('#btnPuzzle'); await q.waitForTimeout(700);
      await q.screenshot({ path: OUT + '/' + tag + '-' + lang + '-puzzles.png' });
      await q.keyboard.press('Escape'); await q.waitForTimeout(300);
    }
    await q.context().close();
  }
  }
  console.log('errors:', errs.length ? errs.join('\n') : 'none');
  console.log(fail ? 'FAILED ' + fail : 'ALL OK');
  await b.close();
})();

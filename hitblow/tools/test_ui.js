// UI flow test (needs playwright + Chrome):
//   cd <repo> && python3 -m http.server 8772 &     node hitblow/tools/test_ui.js [shots-dir]
// Plays whole games in every mode by clicking the palette (guesses come from the engine), keyboard, hint, resign,
// result, save & restore, the daily puzzle, the rules tour, English, and a layout audit at PC and phone sizes.
'use strict';
const { chromium } = require('playwright');
const OUT = process.argv[2] || '', URL = process.env.HB_URL || 'http://localhost:8772/hitblow/';
const JA = /[぀-ヿ一-鿿]/;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errs = []; let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('NG  ' + m); } else console.log('ok  ' + m); };
  const open = async (vp, mobile, locale) => {
    const ctx = await b.newContext({ viewport: vp, locale: locale || 'ja-JP', isMobile: !!mobile, hasTouch: !!mobile });
    await ctx.route(/fonts\.(googleapis|gstatic)|firebase|gstatic/, r => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(600);
    return { ctx, p };
  };
  let { ctx, p } = await open({ width: 1280, height: 720 });
  const shot = (n, pg) => OUT ? (pg || p).screenshot({ path: OUT + '/' + n + '.png' }) : null;
  const overlay = () => p.evaluate(() => !!document.querySelector('.overlay.show'));
  // place a code by clicking the palette, then 判定
  const enter = async (code, pg) => { pg = pg || p; for (const c of code) await pg.click(`#palette button[data-c="${c}"]`); await pg.click('#btnSubmit'); };
  const bestGuess = () => p.evaluate(() => HitBlowEngine.bestGuess(G.cfg, G.cands, {}).guess);
  const wrongGuess = () => p.evaluate(() => { const c = G.cfg, all = HitBlowEngine.allCands(c); for (const i of all) { const g = HitBlowEngine.codeOf(c, i); if (HitBlowEngine.feedback(G.secret, g).h < c.n - 1) return g; } });
  const tab = async (i, pg) => { pg = pg || p; const tb = await pg.$$('#newOverlay .ngt-bar button'); if (tb.length === 3 && await tb[i].isVisible()) { await tb[i].click(); await pg.waitForTimeout(250); } };
  const recN = () => p.evaluate(() => { const r = JSON.parse(localStorage.getItem('atlas-rec-hitblow') || '[]'); return (r.games || r).length; });

  // --- first load ---
  ok(await p.evaluate(() => G.mode === 'solo' && G.diff === 'normal' && G.phase === 'play' && G.hist.length === 0 && G.cfg.n === 4 && G.cfg.c === 6), 'first load: a ready solo game (ふつう: 4 pegs, 6 colours)');
  ok(!(await overlay()), 'no dialog on load');
  ok(await p.evaluate(() => document.querySelectorAll('#rows .hb-row').length === 11 && document.querySelectorAll('#palette button').length === 6 && !document.querySelector('#secret .peg')), 'board: cover + 10 rows, 6 colours, the code is not in the page');
  ok(await p.evaluate(() => { const o = [...document.querySelectorAll('.hb .controls button, .controls button')].map(x => x.id).filter(x => /btn(New|Resign|Hint|Rules)/.test(x)); return o.join() === 'btnNew,btnResign,btnHint,btnRules'; }), 'menu order: 新規 > 投了 > ヒント > ルール');
  await shot('ui-start');

  // --- solo: win by clicking the palette ---
  let guard = 0;
  while (await p.evaluate(() => G.phase === 'play') && guard++ < 12) await enter(await bestGuess());
  await p.waitForSelector('#resultOverlay.show', { timeout: 6000 });
  let r = await p.evaluate(() => ({ res: G.result, n: G.hist.length, title: document.querySelector('#resultTitle').textContent, rows: document.querySelectorAll('#resultRows div').length, pegs: document.querySelectorAll('#secret .peg').length, btns: [...document.querySelectorAll('#resultOverlay .mbtn')].map(x => x.textContent).join('|') }));
  ok(r.res === 'w' && r.title === '解読成功' && r.rows === 3 && r.pegs === 4 && r.btns === '閉じる|もう一度', `solo: solved in ${r.n} guesses by clicking, result dialog [閉じる][もう一度], code revealed`);
  await shot('ui-result');
  ok(await recN() === 1, 'the win is in the record (戦績)');
  await p.waitForFunction(() => G.reviewDone, null, { timeout: 8000 });
  ok(await p.evaluate(() => document.querySelectorAll('#reviewRows .rv').length === G.hist.length && G.review.every(x => x.ok)), 'review: one line per guess, all consistent (engine guesses)');
  await p.click('#btnAgain'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => G.phase === 'play' && G.hist.length === 0 && !document.querySelector('.overlay.show')), '“もう一度” starts a new game');

  // --- solo: a loss ---
  const wg = await wrongGuess();
  for (let i = 0; i < 10; i++) await enter(wg);
  await p.waitForSelector('#resultOverlay.show', { timeout: 6000 });
  r = await p.evaluate(() => ({ res: G.result, n: G.hist.length, title: document.querySelector('#resultTitle').textContent, pegs: document.querySelectorAll('#secret .peg').length }));
  ok(r.res === 'l' && r.n === 10 && r.title === '解読失敗' && r.pegs === 4, 'solo: 10 wrong guesses → 解読失敗, code revealed');
  await p.waitForFunction(() => G.reviewDone, null, { timeout: 8000 });
  ok(await p.evaluate(() => G.review.slice(1).every(x => !x.ok) && document.querySelectorAll('#reviewRows .tg.bad').length === 9), 'review: the repeated guesses are marked 矛盾あり');
  await shot('ui-lost'); await p.click('#btnResClose');
  ok(await recN() === 2, 'the loss is in the record');

  // --- keyboard, clearing a hole, hint ---
  await p.click('#btnNew'); await p.waitForTimeout(300); await shot('ui-newgame'); await p.click('#btnStart'); await p.waitForTimeout(200);
  await p.keyboard.press('1'); await p.keyboard.press('2'); await p.keyboard.press('3'); await p.keyboard.press('Backspace');
  ok(await p.evaluate(() => G.cur.join() === '0,1,-1,-1'), 'keyboard: 1 2 3 Backspace → two pegs');
  await p.keyboard.press('Enter'); ok(await p.evaluate(() => G.hist.length === 0), 'Enter with empty holes does not judge');
  await p.click('#slots .hb-slot[data-i="0"]'); ok(await p.evaluate(() => G.cur.join() === '-1,1,-1,-1'), 'tap a filled hole → cleared');
  await p.keyboard.press('7'); ok(await p.evaluate(() => G.cur.join() === '-1,1,-1,-1'), 'key 7 does nothing with 6 colours');
  await p.keyboard.press('5'); await p.keyboard.press('6'); await p.keyboard.press('6'); await p.keyboard.press('Enter');
  ok(await p.evaluate(() => G.hist.length === 1 && G.hist[0].g.join() === '4,1,5,5'), 'keyboard: next empty hole is filled first, Enter judges');
  await p.click('#btnHint'); await p.waitForFunction(() => !G.busy && G.hint, null, { timeout: 5000 });
  ok(await p.evaluate(() => G.assisted && !G.cur.includes(-1) && HitBlowEngine.consistent(G.cfg, G.hist, G.cur) && /ヒント/.test(document.querySelector('#status').textContent) && document.querySelectorAll('#slots .hint').length === 4), 'hint: proposes a consistent guess in the holes and marks the game as assisted');
  await shot('ui-hint');
  await p.click('#btnAssist');
  ok(await p.evaluate(() => S.assist && /残り [\d,]+ \/ 1,296/.test(document.querySelector('#evalText').textContent) && parseFloat(document.querySelector('#evalFill').style.width) > 0), 'assist panel: shows the number of codes left');
  await p.click('#btnSubmit'); await p.waitForTimeout(100);
  // easy: no repeats
  await p.evaluate(() => { S.diff = 'easy'; startGame('solo', 'easy'); });
  await p.click('#palette button[data-c="2"]');
  ok(await p.evaluate(() => document.querySelector('#palette button[data-c="2"]').disabled && G.cur.join() === '2,-1,-1,-1'), 'やさしい: a used colour is switched off in the palette');
  await p.keyboard.press('3'); ok(await p.evaluate(() => G.cur.join() === '2,-1,-1,-1'), 'やさしい: the same colour cannot be placed twice');

  // --- save & restore, resign ---
  await p.evaluate(() => { S.diff = 'normal'; startGame('solo', 'normal'); });
  await enter([0, 0, 1, 2]); await enter([3, 4, 5, 0]); await p.click('#palette button[data-c="1"]'); await p.click('#palette button[data-c="4"]');
  const before = await p.evaluate(() => JSON.stringify([G.secret, G.hist, G.cur, G.mode, G.diff]));
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(600);
  ok(before === await p.evaluate(() => JSON.stringify([G.secret, G.hist, G.cur, G.mode, G.diff])), 'reload restores the same game (secret, guesses, the half-filled row)');
  ok(!(await overlay()), 'no dialog after reload');
  await p.click('#btnResign'); await p.waitForTimeout(300); await shot('ui-resign');
  await p.keyboard.press('Escape'); await p.waitForTimeout(250); ok(await p.evaluate(() => G.phase === 'play'), 'resign: Esc = no');
  await p.click('#btnResign'); await p.waitForTimeout(300);
  await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(x => x.getClientRects().length && /^はい$/.test(x.textContent.trim())); bs[0] && bs[0].click(); });
  await p.waitForSelector('#resultOverlay.show', { timeout: 5000 });
  ok(await p.evaluate(() => G.phase === 'over' && G.resigned && G.result === 'l' && document.querySelector('#resultTitle').textContent === '解読失敗' && document.querySelectorAll('#secret .peg').length === 4), 'resign: はい ends the game as a loss and reveals the code');
  ok(await p.evaluate(() => document.querySelector('#btnResign').disabled && document.querySelector('#btnHint').disabled && document.querySelector('#btnSubmit').disabled), 'after the game: 投了 / ヒント / 判定 are off');
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(600);
  ok(await p.evaluate(() => G.phase === 'over' && !document.querySelector('.overlay.show') && document.querySelectorAll('#secret .peg').length === 4), 'a finished game restored: code shown, no result dialog again');

  // --- duel vs the AI ---
  const startDuel = async level => {
    await p.click('#btnNew'); await p.waitForTimeout(300); await tab(0);
    await p.click('#modeCards .ngt-gcard[data-v="duel"]'); await tab(1);
    await p.evaluate(l => { const el = document.querySelector('#levelRange'); el.value = l; el.dispatchEvent(new Event('input', { bubbles: true })); }, level);
    await p.click('#btnStart'); await p.waitForTimeout(200);
  };
  await startDuel(3);
  ok(await p.evaluate(() => G.mode === 'duel' && G.phase === 'set' && G.level === 3 && document.querySelector('#btnSubmit').textContent === '決定' && !document.querySelector('#aiCard').classList.contains('hidden')), 'duel: starts by setting my own code (決定), the AI card is shown');
  await enter([5, 0, 3, 3]);
  ok(await p.evaluate(() => G.phase === 'play' && G.mine.join() === '5,0,3,3' && document.querySelectorAll('#aiCode .peg').length === 4), 'duel: my code is set and shown in the AI card');
  guard = 0;
  while (await p.evaluate(() => G.phase === 'play') && guard++ < 12) { await enter(await bestGuess()); await p.waitForFunction(() => G.phase === 'over' || !G.busy, null, { timeout: 10000 }); if (guard === 2) await shot('ui-duel'); }
  await p.waitForSelector('#resultOverlay.show', { timeout: 6000 });
  r = await p.evaluate(() => ({ res: G.result, me: G.hist.length, ai: G.ai.length, meS: G.hist.some(x => x.h === 4), aiS: G.ai.some(x => x.h === 4), title: document.querySelector('#resultTitle').textContent, rows: document.querySelectorAll('#resultRows div').length, aiRows: document.querySelectorAll('#aiRows .k').length }));
  ok(r.me === r.ai && r.aiRows === r.ai && r.rows === 4 && ((r.res === 'w' && r.meS && !r.aiS && r.title === '勝利') || (r.res === 'd' && r.meS && r.aiS && r.title === '引き分け') || (r.res === 'l' && r.aiS && !r.meS)), `duel vs Lv.3: both sides guessed ${r.me} times, result ${r.res} (${r.title}); the AI got its equalising turn`);
  await shot('ui-duel-result'); await p.click('#btnResClose');
  await startDuel(20); await enter([1, 1, 2, 4]);
  const wg2 = await wrongGuess(); guard = 0;
  while (await p.evaluate(() => G.phase === 'play') && guard++ < 12) { await enter(wg2); await p.waitForFunction(() => G.phase === 'over' || !G.busy, null, { timeout: 10000 }); }
  await p.waitForSelector('#resultOverlay.show', { timeout: 6000 });
  r = await p.evaluate(() => ({ res: G.result, ai: G.ai.length, title: document.querySelector('#resultTitle').textContent, cons: G.ai.every((x, i) => HitBlowEngine.consistent(G.cfg, G.ai.slice(0, i), x.g)) }));
  ok(r.res === 'l' && r.title === '敗北' && r.ai <= 7, `duel vs Lv.20: the AI breaks my code in ${r.ai} guesses → 敗北`);
  await p.click('#btnResClose');
  // reload between my guess and the AI's answer
  await startDuel(10); await enter([0, 1, 2, 3]); await enter(await wrongGuess());
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(400);
  await p.waitForFunction(() => G.phase === 'over' || (!G.busy && G.ai.length === G.hist.length), null, { timeout: 8000 });
  ok(await p.evaluate(() => G.mode === 'duel' && G.ai.length === G.hist.length && G.mine.join() === '0,1,2,3'), 'duel: reload in the middle of a round — the AI still takes its turn');

  // --- daily ---
  await p.click('#btnNew'); await p.waitForTimeout(300); await tab(0); await p.click('#modeCards .ngt-gcard[data-v="daily"]'); await tab(1);
  ok(await p.evaluate(() => document.querySelector('#fLevel').classList.contains('hidden') && [...document.querySelectorAll('#segDiff button')].every(x => x.disabled)), 'daily: difficulty is fixed, no AI level');
  await p.click('#btnStart'); await p.waitForTimeout(200);
  const day = await p.evaluate(() => ({ s: G.secret.join(''), want: HitBlowEngine.dailyCode(HitBlowEngine.localDate()).join(''), other: HitBlowEngine.dailyCode('2001-01-01').join(''), mode: G.mode, diff: G.diff }));
  ok(day.mode === 'daily' && day.diff === 'normal' && day.s === day.want, 'daily: the code is the one of today’s date');
  await enter(await wrongGuess());
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(600);
  ok(await p.evaluate(() => G.mode === 'daily' && G.hist.length === 1) && day.s === await p.evaluate(() => G.secret.join('')), 'daily: the same code and progress after reload');
  await p.evaluate(() => startGame('solo', 'normal')); await p.evaluate(() => startGame('daily'));
  ok(await p.evaluate(() => G.mode === 'daily' && G.hist.length === 1) && day.s === await p.evaluate(() => G.secret.join('')), 'daily: leaving and coming back keeps today’s puzzle');
  guard = 0; while (await p.evaluate(() => G.phase === 'play') && guard++ < 9) await enter(await bestGuess());
  await p.waitForSelector('#resultOverlay.show', { timeout: 6000 });
  ok(await p.evaluate(() => G.result === 'w' && S.daily.streak === 1 && S.daily.last === HitBlowEngine.localDate() && S.daily.best === G.hist.length && document.querySelectorAll('#resultRows div').length === 5 && /連続 1 日/.test(document.querySelector('#bSub').textContent)), 'daily: solved → streak 1, best result stored and shown');
  await shot('ui-daily-result'); await p.click('#btnResClose');
  const nrec = await recN();
  await p.evaluate(() => startGame('daily')); await p.waitForTimeout(300);
  ok(await p.evaluate(() => G.phase === 'over' && G.result === 'w' && !document.querySelector('.overlay.show')) && nrec === await recN(), 'daily: opening it again the same day shows the finished puzzle (no second record)');
  ok(await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('aicoding-hitblow')); return s.settings.daily.streak === 1 && !!s.settings.daily.cur; }), 'daily: streak and today’s puzzle are in localStorage');

  // --- digits / marks / designs ---
  await p.evaluate(() => startGame('solo', 'normal')); await enter([0, 1, 2, 3]);
  await p.click('#btnNew'); await p.waitForTimeout(300); await tab(1);
  await p.click('#segDigits button[data-v="1"]');
  ok(await p.evaluate(() => [...document.querySelectorAll('#palette .peg b')].map(x => x.textContent).join('') === '123456'), '数字で遊ぶ: digits on the pegs');
  await p.click('#segDigits button[data-v="0"]');
  await tab(2);
  ok(await p.evaluate(() => document.querySelectorAll('#bdRow button svg').length === 4), 'デザイン tab: 4 picture tiles');
  await shot('pc-newgame-design');
  for (const d of ['neon', 'paper', 'marble', 'walnut']) {
    await p.click(`#bdRow button[data-v="${d}"]`); await p.waitForTimeout(150);
    const st = await p.evaluate(() => ({ cls: document.body.className, marks: !!document.querySelector('#palette .peg svg') }));
    ok(st.cls.includes('bd-' + d) && st.marks === (d === 'paper'), `design ${d}: applied at once` + (d === 'paper' ? ', shape marks on by default' : ''));
    if (OUT) { await p.click('#btnCancelNew'); await p.waitForTimeout(250); await shot('design-' + d); await p.click('#btnNew'); await p.waitForTimeout(250); await tab(2); }
  }
  await p.click('#segMarks button[data-v="1"]');
  ok(await p.evaluate(() => document.querySelectorAll('#palette .peg svg').length === 6 && new Set([...document.querySelectorAll('#palette .peg svg')].map(x => x.innerHTML)).size === 6), '形のマーク: every colour carries its own shape');
  await tab(0); await shot('pc-newgame-game'); await tab(1); await shot('pc-newgame-rules'); await tab(2);
  await p.click('#btnCancelNew'); await p.waitForTimeout(200); await shot('pc-marks');
  await p.evaluate(() => { S.marks = null; render(); save(); });

  // --- rules tour: every task can be cleared ---
  await p.click('#btnRules'); await p.waitForTimeout(500); await shot('ui-tour-intro');
  ok(await p.evaluate(() => /Bulls and Cows/.test(document.querySelector('#rulesBody').textContent) && /1970/.test(document.querySelector('#rulesBody').textContent)), 'tour: intro page with the history');
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500);
  const T = '#rulesBody .hbt';
  for (const c of [3, 0, 1]) await p.click(`${T} .hb-pal button[data-c="${c}"]`);
  await shot('ui-tour-place'); await p.click(`${T} .hb-go`); await p.waitForTimeout(3000);
  await p.click(`${T} .hb-row:nth-child(2) .hole[data-i="1"]`); await p.waitForTimeout(3400);      // a wrong peg first → try again
  await p.click(`${T} .hb-row:nth-child(2) .hole[data-i="0"]`); await p.waitForTimeout(700); await shot('ui-tour-hit'); await p.waitForTimeout(2400);
  await p.click(`${T} .hb-row:nth-child(2) .hole[data-i="2"]`); await p.waitForTimeout(700); await shot('ui-tour-blow'); await p.waitForTimeout(2400);
  for (const c of [0, 1, 2]) await p.click(`${T} .hb-pal button[data-c="${c}"]`);
  await shot('ui-tour-solve'); await p.click(`${T} .hb-go`); await p.waitForTimeout(3000);
  const cleared = await p.evaluate(() => localStorage.getItem('aicoding-hitblow-rules') || '');
  ok(['place', 'hit', 'blow', 'solve'].every(k => cleared.includes(k)), 'tour: the four tasks are cleared and it moves on (' + cleared + ')');
  await shot('ui-tour-modes');
  ok(await p.evaluate(() => { const bodies = [...document.querySelectorAll('#rulesBody .rt-body')]; return bodies.length > 0; }), 'tour: last info page is shown');
  const lens = await p.evaluate(() => ['place', 'hit', 'blow', 'solve', 'modes'].map(k => HB_I18N.ja['ru.' + k + '.b'].length));
  ok(lens.every(n => n >= 30 && n <= 90), 'tour: page texts are 30–90 characters (' + lens.join(', ') + ')');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok(!(await overlay()), 'tour: Esc closes it');

  // --- English ---
  await p.evaluate(() => { const s = document.querySelector('#langSel'); s.value = 'en'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await p.waitForTimeout(400);
  const jaLeft = () => p.evaluate(src => { const re = new RegExp(src), out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const el = n.parentElement; if (!el || el.closest('select,script,style,.overlay:not(.show)') || !el.getClientRects().length) continue; if (re.test(n.nodeValue)) out.push(n.nodeValue.trim().slice(0, 30)); } return out; }, JA.source);
  let left = await jaLeft(); ok(!left.length, 'English: no Japanese left on the game screen ' + JSON.stringify(left.slice(0, 5)));
  await shot('ui-en');
  await p.click('#btnNew'); await p.waitForTimeout(300); left = await jaLeft(); ok(!left.length, 'English: none in the new-game dialog ' + JSON.stringify(left.slice(0, 5))); await shot('ui-en-newgame'); await p.click('#btnCancelNew');
  await p.evaluate(() => startGame('solo', 'normal')); guard = 0; while (await p.evaluate(() => G.phase === 'play') && guard++ < 12) await enter(await bestGuess());
  await p.waitForSelector('#resultOverlay.show', { timeout: 6000 }); await p.waitForFunction(() => G.reviewDone, null, { timeout: 8000 });
  left = await jaLeft(); ok(!left.length, 'English: none in the result dialog / review ' + JSON.stringify(left.slice(0, 5))); await p.click('#btnResClose');
  ok(await p.evaluate(() => [...document.querySelectorAll('#langSel option')].map(o => o.value).join() === 'ja,en'), 'the language menu lists only 日本語 / English');
  const keys = await p.evaluate(() => { const a = Object.keys(HB_I18N.ja).sort(), c = Object.keys(HB_I18N.en).sort(); return { same: a.join() === c.join(), n: a.length, empty: a.filter(k => !HB_I18N.ja[k] || !HB_I18N.en[k]).length, mm: /mastermind/i.test(JSON.stringify(Object.entries(HB_I18N.ja).concat(Object.entries(HB_I18N.en)).filter(([k]) => k !== 'ru.hist'))) }; });
  ok(keys.same && !keys.empty, `ja / en key sets are equal (${keys.n} keys, none empty)`);
  ok(!keys.mm, 'the trademark appears only in the history text');
  await ctx.close();

  // --- layout audit ---
  const audit = () => {
    const vw = innerWidth, vh = innerHeight, q = s => document.querySelector(s), R = el => el.getBoundingClientRect(), out = {};
    const fr = R(q('#frame')), hb = q('.hb'), top = hb && hb.getClientRects().length ? R(hb).bottom : 0, tabs = q('#mtabs'), bottom = tabs && tabs.getClientRects().length ? R(tabs).top : vh;
    out.frame = [fr.left, fr.top, fr.right, fr.bottom].map(Math.round); out.top = Math.round(top); out.bottom = Math.round(bottom);
    out.inView = fr.top >= top + 4 && fr.bottom <= bottom - 4 && fr.left >= 4 && fr.right <= vw - 4;
    const inside = el => { const r = R(el); if (!r.width && !r.height) return true; return r.left >= fr.left - .5 && r.right <= fr.right + .5 && r.top >= fr.top - .5 && r.bottom <= fr.bottom + .5; };
    out.partsIn = [...document.querySelectorAll('#palette button, #btnSubmit, #slots .hb-slot, #rows .hb-row, #rows .fbt, #rows .hole, #rows .hb-lid')].every(inside);
    const rows = [...document.querySelectorAll('#rows .hb-row')].map(R); out.rowsOverlap = rows.some((r, i) => i && r.top < rows[i - 1].bottom - .5); out.rowH = Math.round(rows[1].height * 10) / 10;
    out.dockOverlap = rows[rows.length - 1].bottom > R(q('#dock')).top + .5;
    out.hscroll = document.documentElement.scrollWidth > vw + 1 || document.body.scrollWidth > vw + 1;
    out.scrolled = scrollY !== 0 || q('.app').scrollTop !== 0;
    out.side = Math.round(R(q('.side')).width);
    const vis = el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
    const wrap = [];
    for (const btn of document.querySelectorAll('button, .mbtn, .btn')) { if (!vis(btn)) continue; const w = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT); let n; const tops = new Set();
      while ((n = w.nextNode())) { if (!n.nodeValue.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const rc of rg.getClientRects()) if (rc.width > 0) tops.add(Math.round(rc.top / 4)); }
      if (tops.size > 1 && !btn.closest('.ngt-gcard, .ngt-bar, #mtabs, .rt')) wrap.push((btn.id || btn.className) + ':' + btn.textContent.trim().slice(0, 12)); }
    out.wrap = wrap;
    let minF = 99, minEl = ''; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const el = n.parentElement; if (!n.nodeValue.trim() || !el || !vis(el) || el.closest('script,style,select,#mtabs,.ngt-bar,.hb,.overlay:not(.show)')) continue; const rg = document.createRange(); rg.selectNodeContents(n); if (!rg.getClientRects().length) continue; const f = parseFloat(getComputedStyle(el).fontSize); if (f < minF) { minF = f; minEl = (el.className || el.tagName) + ':' + n.nodeValue.trim().slice(0, 10); } }
    out.minFont = minF; out.minEl = minEl;
    const tap = []; for (const el of document.querySelectorAll('#palette button, #slots .hb-slot, #btnSubmit, .controls .btn, .brand-r .snd, #btnAssist')) { if (!vis(el)) continue; const r = R(el); let h = r.height, wd = r.width; if (el.id === 'btnAssist') { h += 14; wd += 8; } if (h < 39.9 || wd < 39.9) tap.push((el.id || el.className) + ' ' + Math.round(wd) + '×' + Math.round(h)); }
    out.tap = tap;
    return out;
  };
  const SIZES = [['pc-1440x900', 1440, 900, false], ['pc-1280x720', 1280, 720, false], ['pc-1100x1300', 1100, 1300, false], ['phone-390x844', 390, 844, true], ['phone-390x664', 390, 664, true]];
  for (const [name, w, h, mob] of SIZES) {
    const o = await open({ width: w, height: h }, mob); const pg = o.p;
    for (const diff of ['normal', 'hard', 'easy']) {
      await pg.evaluate(d => { S.diff = d; startGame('solo', d); }, diff);
      const gs = await pg.evaluate(() => { const E = HitBlowEngine, out = []; const h = []; for (let i = 0; i < 3; i++) { const g = i ? E.codeOf(G.cfg, E.candsOf(G.cfg, h)[i * 7 % E.candsOf(G.cfg, h).length]) : E.opener(G.cfg); const f = E.feedback(G.secret, g); if (f.h === G.cfg.n) break; h.push({ g, h: f.h, b: f.b }); out.push(g); } return out; });
      for (const g of gs) await enter(g, pg);
      await pg.click('#palette button[data-c="1"]'); await pg.click('#palette button[data-c="3"]');
      await pg.waitForTimeout(900);
      const a = await pg.evaluate(audit); const tag = `${name} ${diff}`;
      ok(a.inView && a.partsIn && !a.dockOverlap && !a.rowsOverlap, `${tag}: the whole board with palette and 判定 is inside the viewport, nothing overlaps (frame ${a.frame.join(',')} in ${a.top}…${a.bottom}, row ${a.rowH}px)`);
      ok(!a.hscroll && !a.scrolled, `${tag}: no scrolling needed, no horizontal scroll`);
      ok(!a.wrap.length, `${tag}: no button text wraps ${JSON.stringify(a.wrap)}`);
      ok(a.minFont >= 13, `${tag}: smallest text ${a.minFont}px (${a.minEl})`);
      if (!mob) ok(a.side === 360, `${tag}: right column ${a.side}px`); else ok(!a.tap.length, `${tag}: tap targets ≥ 40px ${JSON.stringify(a.tap)}`);
      if (OUT) await pg.screenshot({ path: `${OUT}/${name}-${diff}.png` });
    }
    // dialogs at this size
    await pg.evaluate(() => { S.diff = 'normal'; startGame('solo', 'normal'); });
    await pg.click('#btnNew'); await pg.waitForTimeout(450);
    const tb = await pg.$$('#newOverlay .ngt-bar button');
    for (let i = 0; i < 3; i++) {
      await tab(i, pg);
      const d = await pg.evaluate(() => { const m = document.querySelector('#newOverlay .modal').getBoundingClientRect(), bad = []; for (const btn of document.querySelectorAll('#newOverlay button')) { if (!btn.getClientRects().length || btn.closest('.ngt-gcard, .ngt-bar')) continue; const w = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT); let n; const tops = new Set(); while ((n = w.nextNode())) { if (!n.nodeValue.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const rc of rg.getClientRects()) if (rc.width > 0) tops.add(Math.round(rc.top / 4)); } const r = btn.getBoundingClientRect(); if (tops.size > 1 || r.right > m.right + 1 || r.left < m.left - 1 || btn.scrollWidth > btn.clientWidth + 1) bad.push(btn.textContent.trim().slice(0, 14)); } return { bad, fits: m.left >= 0 && m.right <= innerWidth && m.top >= 0 && m.bottom <= innerHeight + 1, hs: document.documentElement.scrollWidth > innerWidth + 1 }; });
      ok(!d.bad.length && d.fits && !d.hs, `${name}: new-game dialog tab ${i + 1} fits, no wrapped or clipped button ${JSON.stringify(d.bad)}`);
      if (OUT) await pg.screenshot({ path: `${OUT}/${name}-newgame-${['game', 'rules', 'design'][i]}.png` });
      if (tb.length !== 3) break;
    }
    await pg.click('#btnCancelNew'); await pg.waitForTimeout(250);
    // a finished game: the result dialog
    let g2 = 0; while (await pg.evaluate(() => G.phase === 'play') && g2++ < 12) await enter(await pg.evaluate(() => HitBlowEngine.bestGuess(G.cfg, G.cands, {}).guess), pg);
    await pg.waitForSelector('#resultOverlay.show', { timeout: 6000 });
    const rr = await pg.evaluate(() => { const m = document.querySelector('#resultOverlay .modal').getBoundingClientRect(); return m.left >= 0 && m.right <= innerWidth && m.top >= 0 && m.bottom <= innerHeight && [...document.querySelectorAll('#resultRows div')].every(d => d.scrollWidth <= d.clientWidth + 1); });
    ok(rr, `${name}: result dialog fits`);
    if (OUT) await pg.screenshot({ path: `${OUT}/${name}-result.png` });
    await pg.click('#btnResClose'); await pg.waitForFunction(() => G.reviewDone, null, { timeout: 8000 }); await pg.waitForTimeout(300);
    if (OUT) await pg.screenshot({ path: `${OUT}/${name}-review.png` });
    if (mob) {      // duel on a phone: the AI card is under the board
      await pg.click('#btnNew'); await pg.waitForTimeout(350); await tab(0, pg);
      await pg.click('#modeCards .ngt-gcard[data-v="duel"]'); await pg.click('#btnStart'); await pg.waitForTimeout(250);
      await enter([0, 1, 2, 3], pg); await enter([0, 0, 1, 2], pg); await pg.waitForFunction(() => !G.busy || G.phase === 'over', null, { timeout: 8000 });
      const a = await pg.evaluate(audit); ok(a.inView && a.partsIn && !a.hscroll, `${name}: duel — board still inside the viewport`);
      if (OUT) await pg.screenshot({ path: `${OUT}/${name}-duel.png` });
    }
    await o.ctx.close();
  }
  ok(!errs.length, 'no page errors ' + JSON.stringify(errs.slice(0, 4)));
  await b.close();
  console.log(fail ? 'FAILED (' + fail + ')' : 'ALL OK');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAILED (exception) ' + (e && e.stack || e)); process.exit(1); });

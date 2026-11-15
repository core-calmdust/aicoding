// UI flow test (needs playwright + Chrome):  python3 -m http.server 8765 &  node seabattle/tools/test_ui.js [shots-dir]
// Plays whole games in every rule, checks deploy (drag / turn / shuffle / no-touch), hint, resign, result, save & restore.
'use strict';
const { chromium } = require('playwright');
const OUT = process.argv[2] || '';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errs = []; let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('NG  ' + m); } else console.log('ok  ' + m); };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, locale: 'ja-JP' });
  await ctx.route(/fonts\.(googleapis|gstatic)|firebase|gstatic/, r => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.goto('http://localhost:8765/seabattle/', { waitUntil: 'load' }); await p.waitForTimeout(500);
  const shot = n => OUT ? p.screenshot({ path: OUT + '/' + n + '.png' }) : null;
  const cellXY = async cell => p.evaluate(c => { const svg = document.querySelector('#bsvg'), m = svg.getScreenCTM(), pt = svg.createSVGPoint(); pt.x = 9 + (c % 10) * 10 + 5; pt.y = 9 + Math.floor(c / 10) * 10 + 5; const q = pt.matrixTransform(m); return [q.x, q.y]; }, cell);

  // --- deploy ---
  ok(await p.evaluate(() => G.phase === 'deploy' && SeaEngine.validFleet(G.my, false)), 'opens in deploy with a valid fleet, no dialog');
  ok(!(await p.evaluate(() => document.querySelector('.overlay.show'))), 'no dialog on load');
  await p.evaluate(() => { G.my = [{ r: 0, c: 0, len: 5, h: 1 }, { r: 2, c: 0, len: 4, h: 1 }, { r: 4, c: 0, len: 3, h: 1 }, { r: 6, c: 0, len: 3, h: 1 }, { r: 8, c: 0, len: 2, h: 1 }]; render(); });
  let [x, y] = await cellXY(81), [x2, y2] = await cellXY(87);
  await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move((x + x2) / 2, y2, { steps: 4 }); await p.mouse.move(x2, y2, { steps: 4 }); await p.mouse.up();
  ok(await p.evaluate(() => G.my[4].r === 8 && G.my[4].c === 6), 'drag moves a ship (grabbed by its 2nd cell)');
  [x, y] = await cellXY(86); [x2, y2] = await cellXY(1);
  await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x2, y2, { steps: 6 }); await p.mouse.up();
  ok(await p.evaluate(() => G.my[4].r === 8 && G.my[4].c === 6), 'drop on another ship is refused (ship goes back)');
  [x, y] = await cellXY(40); await p.mouse.click(x, y);
  ok(await p.evaluate(() => G.my[2].h === 0 && SeaEngine.validFleet(G.my, false)), 'click turns a ship, fleet stays valid');
  await p.click('#btnShuffle'); ok(await p.evaluate(() => SeaEngine.validFleet(G.my, false)), 'shuffle gives a valid fleet');
  await shot('ui-deploy');

  // --- play each rule to the end ---
  const playOut = async (rule, win) => {
    await p.evaluate(r => { S.rule = r; S.level = 3; S.first = 'you'; S.adj = false; newDeploy(); }, rule);
    await p.click('#btnGo'); await p.waitForTimeout(300);
    let guard = 0;
    while (await p.evaluate(() => G.phase === 'battle') && guard++ < 120) {
      await p.waitForFunction(() => G.phase !== 'battle' || (!G.busy && G.st.turn === 0), null, { timeout: 30000 });
      if (!(await p.evaluate(() => G.phase === 'battle'))) break;
      const cell = await p.evaluate(w => { const sd = G.st.sides[1]; if (w) { for (let c = 0; c < 100; c++) if (sd.grid[c] >= 0 && !sd.shots[c]) return c; } for (let c = 99; c >= 0; c--) if (sd.grid[c] < 0 && !sd.shots[c]) return c; return -1; }, win);
      const [cx, cy] = await cellXY(cell); await p.mouse.click(cx, cy);
      await p.waitForFunction(c => G.st.sides[1].shots[c] > 0, cell, { timeout: 10000 });
    }
    await p.waitForSelector('#resultOverlay.show', { timeout: 20000 });
    return p.evaluate(() => ({ w: G.st.winner, n: G.st.log.length, title: document.querySelector('#resultTitle').textContent, rows: document.querySelectorAll('#resultRows div').length }));
  };
  let r = await playOut('classic', true); ok(r.w === 0 && r.title === '勝利' && r.rows === 2, 'classic: win by clicking the board (' + r.n + ' shots)'); await shot('ui-result');
  await p.click('#btnAgain'); ok(await p.evaluate(() => G.phase === 'deploy'), '“もう一度” returns to deploy');
  r = await playOut('streak', true); ok(r.w === 0 && r.n === 17, 'streak: 17 hits in a row win without the AI moving (' + r.n + ')');
  await p.click('#btnResClose');
  r = await playOut('salvo', false); ok(r.w === 1 && r.title === '敗北', 'salvo: only misses → the AI wins (' + r.n + ' shots)');
  ok(await p.evaluate(() => G.view === 'enemy' && document.querySelectorAll('#bsvg .sb-ship.ghost').length > 0), 'after a loss the enemy fleet is revealed');
  await shot('ui-lost'); await p.click('#btnResClose');
  const rec = await p.evaluate(() => JSON.parse(localStorage.getItem('atlas-rec-seabattle') || '[]'));
  ok((rec.games || rec).length === 3, 'three games in the record (戦績)');

  // --- no-touch rule, hint, resign, restore ---
  await p.evaluate(() => { S.rule = 'classic'; S.adj = true; S.level = 20; newDeploy(); });
  ok(await p.evaluate(() => SeaEngine.validFleet(G.my, true)), 'no-touch: the dealt fleet keeps ships apart');
  await p.click('#btnGo'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => SeaEngine.validFleet(G.st.sides[1].ships, true)), 'no-touch: so does the AI fleet');
  await p.click('#btnHint'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => G.hint && G.hint.best >= 0 && document.querySelectorAll('#bsvg .sb-heat').length > 10 && /最有力/.test(document.querySelector('#status').textContent)), 'hint shows the probability map and names the best square');
  await shot('ui-hint');
  [x, y] = await cellXY(await p.evaluate(() => G.hint.best)); await p.mouse.click(x, y);
  await p.waitForFunction(() => !G.busy && G.st.turn === 0, null, { timeout: 20000 });
  ok(await p.evaluate(() => !G.hint && G.st.log.length === 2 && G.view === 'enemy'), 'after my shot the AI answers on my board and the view comes back');
  await p.waitForFunction(() => G.evals.length >= 3, null, { timeout: 5000 }).catch(() => {});
  const before = await p.evaluate(() => JSON.stringify([G.st.log, G.my, G.st.sides[1].ships]));
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(600);
  ok(before === await p.evaluate(() => JSON.stringify([G.st.log, G.my, G.st.sides[1].ships])) && await p.evaluate(() => G.phase === 'battle' && G.level === 20 && G.adj), 'reload restores the same battle');
  ok(!(await p.evaluate(() => document.querySelector('.overlay.show'))), 'no dialog after reload');
  await p.click('#btnResign'); await p.waitForTimeout(300); await shot('ui-resign');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); ok(await p.evaluate(() => G.phase === 'battle'), 'resign: Esc = no');
  await p.click('#btnResign'); await p.waitForTimeout(300);
  await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => b.offsetParent && /^はい$/.test(b.textContent.trim())); bs[0] && bs[0].click(); });
  await p.waitForSelector('#resultOverlay.show', { timeout: 5000 });
  ok(await p.evaluate(() => G.phase === 'over' && G.resigned && document.querySelector('#resultTitle').textContent === '敗北'), 'resign: はい ends the game as a loss');
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(500);
  ok(await p.evaluate(() => G.phase === 'over' && !document.querySelector('#resultOverlay.show')), 'a finished game restored: no result dialog again');

  // --- rules tour: every task can be cleared ---
  await p.click('#btnRules'); await p.waitForTimeout(400);
  const clickTour = async cell => { const pt = await p.evaluate(c => { const svg = document.querySelector('#rulesBody svg.sb'), m = svg.getScreenCTM(), q = svg.createSVGPoint(); q.x = 9 + (c % 10) * 10 + 5; q.y = 9 + Math.floor(c / 10) * 10 + 5; const z = q.matrixTransform(m); return [z.x, z.y]; }, cell); await p.mouse.click(pt[0], pt[1]); };
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400);
  await clickTour(43); await p.waitForTimeout(2600); await shot('ui-tour-fire');
  await clickTour(45); await p.waitForTimeout(3000);
  await clickTour(35); await p.waitForTimeout(3400); await shot('ui-tour-chase'); await clickTour(46); await p.waitForTimeout(3000);
  await clickTour(46); await p.waitForTimeout(1200); await shot('ui-tour-sink'); await p.waitForTimeout(1800);
  const cleared = await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('aicoding-seabattle-rules') || '{}'); } catch (e) { return {}; } });
  ok(JSON.stringify(cleared).match(/place/) && JSON.stringify(cleared).match(/fire/) && JSON.stringify(cleared).match(/chase/) && JSON.stringify(cleared).match(/sink/), 'tour: the four tasks are cleared and it moves on by itself (' + JSON.stringify(cleared).slice(0, 80) + ')');
  // --- English ---
  await p.keyboard.press('Escape'); await p.evaluate(() => { const s = document.querySelector('#langSel'); s.value = 'en'; s.dispatchEvent(new Event('change')); }); await p.waitForTimeout(300);
  const missing = await p.evaluate(() => { const ja = SEA_I18N.ja, en = SEA_I18N.en; return Object.keys(ja).filter(k => !(k in en)).concat(Object.keys(en).filter(k => !(k in ja))); });
  ok(missing.length === 0, 'ja / en have the same keys ' + missing.join(','));
  ok(await p.evaluate(() => document.querySelector('#ttlName').textContent === 'Sea Battle' && !/[ぁ-んァ-ン一-龥]/.test(document.querySelector('.side').innerText + document.querySelector('.bhead').innerText)), 'English: no Japanese left on the game screen');
  await shot('ui-en');
  console.log(errs.length ? 'PAGE ERRORS:\n' + errs.join('\n') : 'no page errors'); if (errs.length) fail++;
  console.log(fail ? 'FAILED: ' + fail : 'ALL OK');
  await b.close(); process.exit(fail ? 1 : 0);
})();

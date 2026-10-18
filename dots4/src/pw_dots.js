// Browser test: full Lv10 game on 4x4 (human side plays random safe moves, asks for hints), then the post-game review.
// usage: node pw_dots.js <port> <width> <height> <humanOrder 0|1> <shot.png>
const { chromium } = require('playwright');
(async () => {
  const [port, W, H, order, shot] = process.argv.slice(2);
  const b = await chromium.launch(); const errs = [], logs = [], net = [];
  const mobile = +W < 600;
  const pg = await b.newPage({ viewport: { width: +W, height: +H }, isMobile: mobile, hasTouch: mobile, locale: 'ja-JP' });
  pg.on('pageerror', e => errs.push('pageerror ' + e.message));
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text()); });
  pg.on('requestfinished', async r => { if (/dots4/.test(r.url())) { const t = r.timing(); net.push({ url: r.url().split('/').pop(), ms: Math.round(t.responseEnd) }); } });
  const t0 = Date.now();
  await pg.goto(`http://localhost:${port}/dots/`); await pg.waitForTimeout(1200);
  await pg.evaluate(o => {
    document.querySelectorAll('.overlay').forEach(x => x.classList.remove('show'));
    Object.assign(settings, { mode: 'ai', size: 4, order: o, level: 10, anim: false });
    newGame();
  }, +order);
  const aiTimes = []; let hints = 0, hintOk = 0, moves = 0, lastWait = Date.now();
  for (let it = 0; it < 400; it++) {
    const st = await pg.evaluate(() => ({ over: S.over, human: canHumanMove(), n: game.moves.length }));
    if (st.over) break;
    if (!st.human) { await pg.waitForTimeout(100); continue; }
    if (moves > 0 || +order === 1) aiTimes.push(Date.now() - lastWait);
    // a hint every third human move
    if (moves % 3 === 0) {
      hints++;
      await pg.click('#btnHint');
      for (let k = 0; k < 40; k++) { await pg.waitForTimeout(100); if (await pg.evaluate(() => hintEdge >= 0)) { hintOk++; break; } }
    }
    const e = await pg.evaluate(() => {
      const p = S.p, legal = []; for (let e = 0; e < S.G.E; e++) if (!p.drawn[e]) legal.push(e);
      const safe = legal.filter(e => p.gives(e) === 0 && p.completes(e) === 0), cap = legal.filter(e => p.completes(e) > 0);
      const pool = cap.length ? cap : safe.length ? safe : legal;
      return pool[Math.floor(Math.random() * pool.length)];
    });
    await pg.evaluate(e => humanMove(e), e); moves++; lastWait = Date.now();
    await pg.waitForTimeout(50);
  }
  await pg.waitForTimeout(1500);
  const res = await pg.evaluate(() => ({ scores: S.scores, human: game.human, n: game.moves.length }));
  await pg.screenshot({ path: shot.replace('.png', '_end.png') });
  // post-game review
  await pg.evaluate(() => { document.querySelectorAll('.overlay').forEach(x => x.classList.remove('show')); if (!rv) runReview(); });
  let rvDone = false; const tr = Date.now();
  for (let k = 0; k < 1200; k++) { await pg.waitForTimeout(250); const d = await pg.evaluate(() => !!(rv && !rv.running)); if (d) { rvDone = true; break; } }
  const rvInfo = await pg.evaluate(() => rv ? { done: rv.done, total: rv.total, exact: rv.items.filter(x => x && x.exact).length } : null);
  rvInfo && (rvInfo.sec = Math.round((Date.now() - tr) / 1000));
  await pg.screenshot({ path: shot });
  console.log(JSON.stringify({ viewport: W + 'x' + H, humanOrder: +order, result: res, aiMoveWaitMs: aiTimes, hints, hintOk, review: rvDone, rvInfo, net, errors: errs, totalSec: Math.round((Date.now() - t0) / 1000) }));
  await b.close();
})();

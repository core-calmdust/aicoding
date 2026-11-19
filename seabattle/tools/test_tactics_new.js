// タクティクス — the newer ships in the browser (playwright + Chrome; python3 -m http.server 8765 first).
// A battle is set up directly with every newer ship on both sides (minelayer, AA cruiser, rockets, repair, armor, smoke …),
// each skill is tapped once, then the game is played out by tapping squares. Screenshots → /tmp/shots/new-*.png
const { chromium } = require('playwright');
const MINE = [14, 13, 11, 12, 4], FOE = [14, 13, 0, 1, 5];
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errs = []; let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('NG  ' + m); } else console.log('ok  ' + m); };
  for (const [name, vp, touch] of [['pc', { width: 1280, height: 720 }, false], ['ph', { width: 390, height: 844 }, true]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, locale: 'ja-JP', deviceScaleFactor: touch ? 2 : 1 });
    await ctx.route(/fonts\.(googleapis|gstatic)|firebase|gstatic/, r => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errs.push(name + ': ' + m.text()); });
    await p.goto('http://localhost:8765/seabattle/', { waitUntil: 'load' }); await p.waitForTimeout(500);
    const shot = n => p.screenshot({ path: '/tmp/shots/new-' + name + '-' + n + '.png' });
    const tap = sel => touch ? p.tap(sel) : p.click(sel);
    const idle = () => p.waitForFunction(() => G.phase !== 'battle' || (!G.busy && G.st.turn === 0), null, { timeout: 30000 });
    const tapCell = async c => { const pt = await p.evaluate(c => { const svg = document.querySelector('#bsvg'), m = svg.getScreenCTM(), q = svg.createSVGPoint(); q.x = 9 + (c % 10) * 10 + 5; q.y = 9 + Math.floor(c / 10) * 10 + 5; const z = q.matrixTransform(m); return [z.x, z.y]; }, c); if (touch) await p.touchscreen.tap(pt[0], pt[1]); else await p.mouse.click(pt[0], pt[1]); };
    const acts = () => p.evaluate(() => G.st.acts.length);
    const skillBtn = k => p.evaluate(k => G.my.findIndex((s, i) => SeaEngine.TYPES[s.t].skill === k && !G.st.sides[0].sunk[i]), k);
    await p.evaluate(([a, f]) => { const E = SeaEngine, fl = [E.randomFleet(Math.random, false, a), E.randomFleet(Math.random, false, f)];
      G = { phase: 'battle', my: null, st: E.newGame({ rule: 'tactics', adj: false, fleets: fl, first: 0 }), level: 20, rule: 'tactics', adj: false, view: 'enemy', hint: null, evals: [.5], busy: false, resigned: false, first: 0, armed: null };
      G.my = G.st.sides[0].ships; G.st.cd[0].fill(0); render(); }, [MINE, FOE]);
    // the minelayer: no square to pick, a mine appears on my own sea (the small board)
    let i = await skillBtn('mine'), n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(() => G.st.sides[0].mines.length === 1 && !!document.querySelector('#msvg .sb-mine')), name + ': the minelayer lays a mine, drawn on my sea');
    await idle();
    // rockets into a fleet with an AA cruiser: one shell is shot down
    await p.evaluate(() => { G.st.cd[0].fill(0); render(); });
    i = await skillBtn('rocket'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForTimeout(150);
    const rc = await p.evaluate(() => { for (let r = 0; r < 10; r++) for (let c = 0; c < 8; c++) { const k = r * 10 + c; if (![k, k + 1, k + 2].some(x => G.st.sides[1].shots[x])) return k; } return -1; });
    await tapCell(rc); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(() => { const m = G.st.log.filter(m => m.by === 0 && m.skill === 'rocket').pop(); return m && m.ic >= 0 && G.st.log.filter(x => x.via === 'rocket').length === 2; }), name + ': rockets lose one shell to the enemy AA cruiser');
    await shot('rocket');
    await idle();
    // play it out: shoot, use repair when it would do something, keep the minelayer busy
    let guard = 0, repaired = false;
    while (await p.evaluate(() => G.phase === 'battle') && guard++ < 140) {
      await idle(); if (!(await p.evaluate(() => G.phase === 'battle'))) break;
      n0 = await acts();
      const rp = await p.evaluate(() => { const i = G.my.findIndex(s => SeaEngine.TYPES[s.t].skill === 'repair'); if (i < 0) return -1; G.st.cd[0][i] = G.st.sides[0].sunk[i] ? G.st.cd[0][i] : 0; return SeaEngine.preview(G.st, i, -1) ? i : -1; });
      if (rp >= 0 && !repaired) { await p.evaluate(() => render()); await tap('#skillCard .sk[data-i="' + rp + '"]'); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 }); repaired = await p.evaluate(() => G.st.log.some(m => m.by === 0 && m.skill === 'repair' && m.cell >= 0)); if (repaired) await shot('repair'); continue; }
      const c = await p.evaluate(() => { const s = G.st.sides[1].shots; for (let k = 0; k < 100; k++) if (!s[(k * 37) % 100]) return (k * 37) % 100; return -1; });
      await tapCell(c); await p.waitForFunction(n => G.st.acts.length > n || G.phase !== 'battle', n0, { timeout: 10000 });
    }
    ok(await p.evaluate(() => G.phase === 'over'), name + ': the game plays to the end');
    ok(repaired, name + ': repair mended a hit on my fleet');
    const lg = await p.evaluate(() => ({ mine: G.st.log.some(m => m.mine), rest: G.st.log.some(m => m.rest), aaFoe: G.st.log.some(m => m.by === 1 && m.ic >= 0), kifu: document.querySelector('#kifu') ? document.querySelector('#kifu').textContent.length : -1 }));
    console.log('   ' + name + ': mine hit ' + lg.mine + ' · rest ' + lg.rest + ' · my AA shot one down ' + lg.aaFoe);
    await shot('over');
    // 第4弾: barrage (into AA), radar, and a decoy that need not be sunk
    await p.evaluate(([a, f]) => { const E = SeaEngine, fl = [E.randomFleet(Math.random, false, a), E.randomFleet(Math.random, false, f)];
      G = { phase: 'battle', my: null, st: E.newGame({ rule: 'tactics', adj: false, fleets: fl, first: 0 }), level: 20, rule: 'tactics', adj: false, view: 'enemy', hint: null, evals: [.5], busy: false, resigned: false, first: 0, armed: null };
      G.my = G.st.sides[0].ships; G.st.cd[0].fill(0); render(); }, [[15, 16, 17, 4], [17, 13, 1, 3]]);
    await p.waitForTimeout(300);
    i = await skillBtn('radar'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForTimeout(150); await tapCell(4); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(() => { const sc = G.st.scans[0].slice(-1)[0]; return sc && sc.col === 1 && sc.cells.every(c => c % 10 === 4) && !!document.querySelector('#bsvg .sb-scan'); }), name + ': radar reads a whole column');
    await shot('radar'); await idle();
    await p.evaluate(() => { G.st.cd[0].fill(0); render(); });
    i = await skillBtn('barrage'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForTimeout(150); await tapCell(55); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(() => { const m = G.st.log.filter(m => m.by === 0 && m.skill === 'barrage').pop(); return m && m.ic >= 0 && G.st.log.filter(x => x.via === 'barrage').length === 8; }), name + ': barrage fires 9 squares, one shot down by AA');
    await shot('barrage');
    guard = 0;
    while (await p.evaluate(() => G.phase === 'battle') && guard++ < 160) {
      await idle(); if (!(await p.evaluate(() => G.phase === 'battle'))) break;
      n0 = await acts();
      const c = await p.evaluate(() => { const s = G.st.sides[1].shots, g = G.st.sides[1].grid, sh = G.st.sides[1].ships; for (let k = 0; k < 100; k++) if (!s[k] && g[k] >= 0 && !SeaEngine.TYPES[sh[g[k]].t].decoy) return k; for (let k = 0; k < 100; k++) if (!s[k]) return k; return -1; });
      await tapCell(c); await p.waitForFunction(n => G.st.acts.length > n || G.phase !== 'battle', n0, { timeout: 10000 });
    }
    ok(await p.evaluate(() => { const T = G.st.sides[1], d = T.ships.findIndex(s => SeaEngine.TYPES[s.t].decoy); return G.st.winner === 0 ? !T.sunk[d] : true; }), name + ': winning with the enemy decoy still afloat');
    await shot('decoy');
    await ctx.close();
  }
  console.log(errs.length ? 'PAGE ERRORS:\n' + errs.join('\n') : 'no page errors'); console.log(fail || errs.length ? 'FAILED' : 'ALL OK');
  await b.close();
})();

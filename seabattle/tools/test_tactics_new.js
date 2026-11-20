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
    // 第5弾: the patrol boat's probe, and the enemy monitor firing back
    await p.evaluate(([a, f]) => { const E = SeaEngine, fl = [E.randomFleet(Math.random, false, a), E.randomFleet(Math.random, false, f)];
      G = { phase: 'battle', my: null, st: E.newGame({ rule: 'tactics', adj: false, fleets: fl, first: 0 }), level: 20, rule: 'tactics', adj: false, view: 'enemy', hint: null, evals: [.5], busy: false, resigned: false, first: 0, armed: null };
      G.my = G.st.sides[0].ships; G.st.cd[0].fill(0); render(); }, [[19, 18, 4], [18, 3, 4]]);
    await p.waitForTimeout(300);
    i = await skillBtn('probe'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForTimeout(150); await tapCell(44); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    await idle(); if (await p.evaluate(() => G.view !== 'enemy')) await p.evaluate(() => { G.view = 'enemy'; render(); });
    ok(await p.evaluate(() => { const sc = G.st.scans[0].slice(-1)[0]; return sc && sc.plus === 1 && G.st.sides[1].shots[44] > 0 && document.querySelectorAll('#bsvg .sb-scan rect').length >= 2; }), name + ': probe shoots a square and reads its neighbours');
    await shot('probe');
    const mc = await p.evaluate(() => { const T = G.st.sides[1], i = T.ships.findIndex(s => SeaEngine.TYPES[s.t].counter); for (let k = 0; k < 100; k++) if (T.grid[k] === i && !T.shots[k]) return k; return -1; });
    n0 = await acts(); await tapCell(mc); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(c => { const L = G.st.log, j = L.findIndex(m => m.by === 0 && m.cell === c && !m.skill); return j >= 0 && L[j + 1] && L[j + 1].via === 'counter' && L[j + 1].by === 1; }, mc), name + ': hitting the monitor brings a shell back');
    await shot('counter');
    // 第6弾: with a hospital ship afloat, a sunk submarine's sonar still works
    await p.evaluate(([a, f]) => { const E = SeaEngine, fl = [E.randomFleet(Math.random, false, a), E.randomFleet(Math.random, false, f)];
      G = { phase: 'battle', my: null, st: E.newGame({ rule: 'tactics', adj: false, fleets: fl, first: 0 }), level: 20, rule: 'tactics', adj: false, view: 'enemy', hint: null, evals: [.5], busy: false, resigned: false, first: 0, armed: null };
      G.my = G.st.sides[0].ships; const si = G.my.findIndex(s => s.t === 3), M = G.st.sides[0];
      for (let k = 0; k < 100; k++) if (M.grid[k] === si) { G.st.turn = 1; E.fire(G.st, k); }
      G.st.turn = 0; G.st.cd[0].fill(0); render(); }, [[21, 3, 4], [3, 4, 0]]);
    await p.waitForTimeout(300);
    i = await skillBtn('sonar');
    const sub = await p.evaluate(() => G.my.findIndex(s => s.t === 3));
    ok(await p.evaluate(i => G.st.sides[0].sunk[i] && !document.querySelector('#skillCard .sk[data-i="' + i + '"]').disabled, sub), name + ': a sunk ship\'s skill stays usable with the hospital ship afloat');
    n0 = await acts(); await tap('#skillCard .sk[data-i="' + sub + '"]'); await p.waitForTimeout(150); await tapCell(55); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(() => G.st.scans[0].length === 1), name + ': ... and it reads the sea');
    await shot('hospital');
    // 第7弾: strafe (an X, one shell lost to AA) and the side torpedo
    await p.evaluate(([a, f]) => { const E = SeaEngine, fl = [E.randomFleet(Math.random, false, a), E.randomFleet(Math.random, false, f)];
      G = { phase: 'battle', my: null, st: E.newGame({ rule: 'tactics', adj: false, fleets: fl, first: 0 }), level: 20, rule: 'tactics', adj: false, view: 'enemy', hint: null, evals: [.5], busy: false, resigned: false, first: 0, armed: null };
      G.my = G.st.sides[0].ships; G.st.cd[0].fill(0); render(); }, [[22, 23, 4], [13, 3, 4]]);
    await p.waitForTimeout(300);
    i = await skillBtn('strafe'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForTimeout(150); await tapCell(55); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(() => { const m = G.st.log.filter(m => m.by === 0 && m.skill === 'strafe').pop(); const c = G.st.log.filter(x => x.via === 'strafe').map(x => x.cell); return m && m.ic >= 0 && c.length === 4 && c.every(x => [55, 44, 46, 64, 66].includes(x)); }), name + ': strafe fires an X, one shell shot down by AA');
    await shot('strafe'); await idle();
    await p.evaluate(() => { G.view = 'enemy'; G.st.cd[0].fill(0); render(); });
    i = await skillBtn('rtorpedo'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForTimeout(150); await tapCell(92); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(() => { const c = G.st.log.filter(x => x.via === 'rtorpedo').map(x => x.cell); return c.length >= 1 && c.every((x, j) => x === 90 + j) && c.slice(0, -1).every(x => G.st.sides[1].grid[x] < 0); }), name + ': the side torpedo runs along row 10 from the left');
    await shot('rtorpedo');
    // 第8弾: suppress (the enemy's armor gives way at once) and sweep
    await p.evaluate(([a, f]) => { const E = SeaEngine, fl = [E.randomFleet(Math.random, false, a), E.randomFleet(Math.random, false, f)];
      G = { phase: 'battle', my: null, st: E.newGame({ rule: 'tactics', adj: false, fleets: fl, first: 0 }), level: 20, rule: 'tactics', adj: false, view: 'enemy', hint: null, evals: [.5], busy: false, resigned: false, first: 0, armed: null };
      G.my = G.st.sides[0].ships; G.st.cd[0].fill(0); render(); }, [[24, 25, 4], [5, 13, 4]]);
    await p.waitForTimeout(300);
    i = await skillBtn('suppress'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(() => G.st.sides[1].supp === 2), name + ': suppress holds the enemy abilities for my next 2 turns');
    await idle(); await p.evaluate(() => { G.view = 'enemy'; render(); });
    const ac = await p.evaluate(() => { const T = G.st.sides[1], i = T.ships.findIndex(s => SeaEngine.TYPES[s.t].armor); for (let k = 0; k < 100; k++) if (T.grid[k] === i && !T.shots[k]) return k; return -1; });
    n0 = await acts(); await tapCell(ac); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(c => G.st.sides[1].shots[c] === 2, ac), name + ': ... so a shell on the armored ship is a plain hit');
    await idle(); await p.evaluate(() => { G.view = 'enemy'; G.st.cd[0].fill(0); render(); });
    i = await skillBtn('sweep'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForTimeout(150);
    const swc = await p.evaluate(() => { for (const k of [44, 55, 66, 33, 77, 22]) if (SeaEngine.preview(G.st, G.armed, k)) return k; return 44; });
    await tapCell(swc); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(() => { const m = G.st.log.filter(m => m.by === 0 && m.skill === 'sweep').pop(); return m && m.sw != null && G.st.scans[0].length === 1; }), name + ': sweep reads a 3×3 box and reports the mines it cleared');
    await shot('sweep');
    // 第9弾: the star shell lights a 2×2 box; the enemy's ward stops my next skill
    await p.evaluate(([a, f]) => { const E = SeaEngine, fl = [E.randomFleet(Math.random, false, a), E.randomFleet(Math.random, false, f)];
      G = { phase: 'battle', my: null, st: E.newGame({ rule: 'tactics', adj: false, fleets: fl, first: 0 }), level: 20, rule: 'tactics', adj: false, view: 'enemy', hint: null, evals: [.5], busy: false, resigned: false, first: 0, armed: null };
      G.my = G.st.sides[0].ships; G.st.cd[0].fill(0); render(); }, [[26, 3, 4], [27, 1, 4]]);
    await p.waitForTimeout(300);
    i = await skillBtn('flare'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForTimeout(150); await tapCell(44); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    await idle(); await p.evaluate(() => { G.view = 'enemy'; render(); });
    ok(await p.evaluate(() => G.st.scans[0].filter(s => s.one).length === 4 && document.querySelectorAll('#bsvg .sb-lit').length === [44, 45, 54, 55].filter(c => !G.st.sides[1].shots[c]).length), name + ': the star shell marks each square of the box');
    await shot('flare');
    await p.evaluate(() => { G.st.sides[1].ward = 1; G.st.cd[0].fill(0); render(); });
    i = await skillBtn('sonar'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForTimeout(150); await tapCell(77); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(() => { const m = G.st.log.filter(m => m.by === 0 && m.skill === 'sonar').pop(); return m && m.blk === 1 && G.st.scans[0].filter(s => !s.one).length === 0 && G.st.sides[1].ward === 0; }), name + ': the enemy ward stops my sonar');
    await shot('ward');
    // 第10弾: intel marks an enemy ship square; quick fire keeps the turn while shells hit
    await p.evaluate(([a, f]) => { const E = SeaEngine, fl = [E.randomFleet(Math.random, false, a), E.randomFleet(Math.random, false, f)];
      G = { phase: 'battle', my: null, st: E.newGame({ rule: 'tactics', adj: false, fleets: fl, first: 0 }), level: 20, rule: 'tactics', adj: false, view: 'enemy', hint: null, evals: [.5], busy: false, resigned: false, first: 0, armed: null };
      G.my = G.st.sides[0].ships; G.st.cd[0].fill(0); render(); }, [[28, 29, 4], [0, 1, 4]]);
    await p.waitForTimeout(300);
    i = await skillBtn('intel'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    await idle(); await p.evaluate(() => { G.view = 'enemy'; render(); });
    ok(await p.evaluate(() => { const sc = G.st.scans[0].find(s => s.one && s.k); return sc && G.st.sides[1].grid[sc.at] >= 0 && !!document.querySelector('#bsvg .sb-lit.on'); }), name + ': intel marks a square of the enemy carrier');
    await p.evaluate(() => { G.st.cd[0].fill(0); render(); });
    i = await skillBtn('rapid'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 }); await idle();
    const cells = await p.evaluate(() => { const T = G.st.sides[1]; const hit = []; for (let k = 0; k < 100; k++) if (T.grid[k] >= 0 && !T.shots[k]) hit.push(k); let miss = -1; for (let k = 0; k < 100; k++) if (T.grid[k] < 0 && !T.shots[k]) { miss = k; break; } return [hit[0], hit[1], miss]; });
    for (const c of cells.slice(0, 2)) { n0 = await acts(); await tapCell(c); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 }); await p.waitForFunction(() => !G.busy, null, { timeout: 10000 }); }
    ok(await p.evaluate(() => G.st.turn === 0 && G.st.rapid === 1), name + ': quick fire: two hits, still my turn');
    n0 = await acts(); await tapCell(cells[2]); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(() => G.st.rapid === 0 && G.st.log.filter(m => m.by === 1).length > 0 || G.st.turn === 1), name + ': ... and a miss ends it');
    await shot('rapid');
    // 第11弾: lance fires a column of 4 (the bottom rows pull it up)
    await p.evaluate(([a, f]) => { const E = SeaEngine, fl = [E.randomFleet(Math.random, false, a), E.randomFleet(Math.random, false, f)];
      G = { phase: 'battle', my: null, st: E.newGame({ rule: 'tactics', adj: false, fleets: fl, first: 0 }), level: 20, rule: 'tactics', adj: false, view: 'enemy', hint: null, evals: [.5], busy: false, resigned: false, first: 0, armed: null };
      G.my = G.st.sides[0].ships; G.st.cd[0].fill(0); render(); }, [[30, 31, 4], [31, 4, 3]]);
    await p.waitForTimeout(300);
    i = await skillBtn('lance'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForTimeout(150); await tapCell(83); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(() => JSON.stringify(G.st.log.filter(x => x.via === 'lance').map(x => x.cell)) === '[63,73,83,93]'), name + ': lance fires D7–D10');
    await shot('lance');
    // 第12弾: wide sonar (5×5), and my ESM ship tracing an enemy skill user
    await p.evaluate(([a, f]) => { const E = SeaEngine, fl = [E.randomFleet(Math.random, false, a), E.randomFleet(Math.random, false, f)];
      G = { phase: 'battle', my: null, st: E.newGame({ rule: 'tactics', adj: false, fleets: fl, first: 0 }), level: 20, rule: 'tactics', adj: false, view: 'enemy', hint: null, evals: [.5], busy: false, resigned: false, first: 0, armed: null };
      G.my = G.st.sides[0].ships; G.st.cd[0].fill(0); render(); }, [[32, 33, 4], [1, 0, 4]]);
    await p.waitForTimeout(300);
    i = await skillBtn('echo'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForTimeout(150); await tapCell(0); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(() => { const sc = G.st.scans[0][0]; return sc && sc.big === 1 && sc.cells.every(c => c % 10 <= 4 && c < 50); }), name + ': wide sonar reads the 5×5 corner box');
    for (let g2 = 0; g2 < 20 && !(await p.evaluate(() => G.st.scans[0].some(s => s.tr))) && await p.evaluate(() => G.phase === 'battle'); g2++) {
      await idle(); if (!(await p.evaluate(() => G.phase === 'battle'))) break;
      await p.evaluate(() => { G.st.cd[1].fill(0); G.view = 'enemy'; render(); });
      n0 = await acts(); const c = await p.evaluate(() => { const s = G.st.sides[1].shots; for (let k = 99; k >= 0; k--) if (!s[k]) return k; }); await tapCell(c); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    }
    await idle();
    ok(await p.evaluate(() => { const sc = G.st.scans[0].find(s => s.tr); return sc && sc.k >= 1 && G.st.log.some(m => m.by === 1 && m.tr != null); }), name + ': my ESM ship traced the enemy ship that used a skill');
    await shot('trace');
    // 第13弾: the diagonal spot, and a heavy cruiser that takes two dents
    await p.evaluate(([a, f]) => { const E = SeaEngine, fl = [E.randomFleet(Math.random, false, a), E.randomFleet(Math.random, false, f)];
      G = { phase: 'battle', my: null, st: E.newGame({ rule: 'tactics', adj: false, fleets: fl, first: 0 }), level: 20, rule: 'tactics', adj: false, view: 'enemy', hint: null, evals: [.5], busy: false, resigned: false, first: 0, armed: null };
      G.my = G.st.sides[0].ships; G.st.cd[0].fill(0); render(); }, [[35, 4, 3], [34, 4, 3]]);
    await p.waitForTimeout(300);
    i = await skillBtn('diag'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForTimeout(150); await tapCell(23); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(() => { const sc = G.st.scans[0][0]; return sc && JSON.stringify(sc.list) === '[1,12,23,34,45,56,67,78,89]'; }), name + ': the diagonal spot reads B1–J9');
    await idle(); await p.evaluate(() => { G.view = 'enemy'; render(); });
    const hc = await p.evaluate(() => { const T = G.st.sides[1], i = T.ships.findIndex(s => SeaEngine.TYPES[s.t].armor === 2); const o = []; for (let k = 0; k < 100; k++) if (T.grid[k] === i) o.push(k); return o; });
    for (const c of hc.slice(0, 2)) { await idle(); await p.evaluate(() => { G.view = 'enemy'; render(); }); n0 = await acts(); await tapCell(c); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 }); }
    ok(await p.evaluate(c => c.slice(0, 2).every(x => G.st.sides[1].shots[x] === 3) && G.st.sides[1].armor.some(a => a === 0), hc), name + ': the heavy cruiser dents twice');
    await shot('hcruiser');
    // 第14弾: depth charge on a ship square (its neighbours go too); plating armors my most-hit ship
    await p.evaluate(([a, f]) => { const E = SeaEngine, fl = [E.randomFleet(Math.random, false, a), E.randomFleet(Math.random, false, f)];
      G = { phase: 'battle', my: null, st: E.newGame({ rule: 'tactics', adj: false, fleets: fl, first: 0 }), level: 20, rule: 'tactics', adj: false, view: 'enemy', hint: null, evals: [.5], busy: false, resigned: false, first: 0, armed: null };
      G.my = G.st.sides[0].ships; G.st.cd[0].fill(0); render(); }, [[36, 37, 1], [0, 4, 3]]);
    await p.waitForTimeout(300);
    const dc = await p.evaluate(() => { const T = G.st.sides[1]; for (let k = 0; k < 100; k++) if (T.grid[k] >= 0) return k; });
    i = await skillBtn('depth'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForTimeout(150); await tapCell(dc); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(c => { const v = G.st.log.filter(x => x.via === 'depth').map(x => x.cell); const nb = [c - 10, c + 10, c % 10 ? c - 1 : -1, c % 10 < 9 ? c + 1 : -1].filter(x => x >= 0 && x < 100); return v[0] === c && v.length === 1 + nb.length; }, dc), name + ': a depth charge that hits also shoots the 4 neighbours');
    await shot('depth'); await idle();
    await p.evaluate(() => { const E = SeaEngine, M = G.st.sides[0], i = G.my.findIndex(s => s.t === 1); for (let k = 0; k < 100; k++) if (M.grid[k] === i) { G.st.turn = 1; E.fire(G.st, k); break; } G.st.turn = 0; G.st.cd[0].fill(0); render(); });
    i = await skillBtn('plate'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(() => G.st.sides[0].armor[G.my.findIndex(s => s.t === 1)] === 1), name + ': plating armors the battleship that was hit');
    await shot('plate');
    // 第15弾: with the pursuer afloat, sinking a ship with a normal shot keeps my turn; the command ship halves cooldown waits
    await p.evaluate(([a, f]) => { const E = SeaEngine, fl = [E.randomFleet(Math.random, false, a), E.randomFleet(Math.random, false, f)];
      G = { phase: 'battle', my: null, st: E.newGame({ rule: 'tactics', adj: false, fleets: fl, first: 0 }), level: 20, rule: 'tactics', adj: false, view: 'enemy', hint: null, evals: [.5], busy: false, resigned: false, first: 0, armed: null };
      G.my = G.st.sides[0].ships; render(); }, [[38, 39, 3], [4, 1, 3]]);
    await p.waitForTimeout(300);
    const dd = await p.evaluate(() => { const T = G.st.sides[1], i = T.ships.findIndex(s => s.t === 4), o = []; for (let k = 0; k < 100; k++) if (T.grid[k] === i) o.push(k); T.shots[o[0]] = 2; T.hits++; T.hitsOn[i] = 1; return o[1]; });
    const cd0 = await p.evaluate(() => G.st.cd[0][G.my.findIndex(s => s.t === 3)]);
    n0 = await acts(); await tapCell(dd); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 }); await p.waitForFunction(() => !G.busy, null, { timeout: 10000 });
    ok(await p.evaluate(() => G.st.turn === 0 && G.st.sides[1].sunk.some(Boolean)), name + ': sinking with the pursuer afloat keeps my turn');
    const miss = await p.evaluate(() => { const T = G.st.sides[1]; for (let k = 0; k < 100; k++) if (T.grid[k] < 0 && !T.shots[k]) return k; });
    n0 = await acts(); await tapCell(miss); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 }); await idle();
    ok(await p.evaluate(c => G.st.cd[0][G.my.findIndex(s => s.t === 3)] === Math.max(0, c - 2) || G.phase !== 'battle', cd0), name + ': the command ship takes 2 off the sonar cooldown a turn');
    await shot('pursuit');
    // 第16弾: bracket (2 left and 2 right, the middle read); my cruiser's torpedo stopped by the enemy net after 3 squares
    await p.evaluate(([a, f]) => { const E = SeaEngine, fl = [E.randomFleet(Math.random, false, a), E.randomFleet(Math.random, false, f)];
      G = { phase: 'battle', my: null, st: E.newGame({ rule: 'tactics', adj: false, fleets: fl, first: 0 }), level: 20, rule: 'tactics', adj: false, view: 'enemy', hint: null, evals: [.5], busy: false, resigned: false, first: 0, armed: null };
      G.my = G.st.sides[0].ships; G.st.cd[0].fill(0); render(); }, [[41, 2, 4], [40, 4, 3]]);
    await p.waitForTimeout(300);
    i = await skillBtn('bracket'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForTimeout(150); await tapCell(45); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(() => JSON.stringify(G.st.log.filter(x => x.via === 'bracket').map(x => x.cell)) === '[43,47]' && G.st.scans[0].some(s => s.one && s.at === 45)), name + ': bracket shoots E5±2 and reads E5');
    await idle(); await p.evaluate(() => { G.view = 'enemy'; G.st.cd[0].fill(0); render(); });
    const col = await p.evaluate(() => { const T = G.st.sides[1]; for (let c = 0; c < 10; c++) { let w = 0; for (let r = 9; r >= 0; r--) { const k = r * 10 + c; if (T.grid[k] >= 0) break; if (!T.shots[k]) w++; } if (w >= 5) return c; } return -1; });
    i = await skillBtn('torpedo'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForTimeout(150); await tapCell(90 + col); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(() => G.st.log.filter(x => x.via === 'torpedo').length === 3), name + ': the enemy net stops my torpedo after 3 squares');
    await shot('net');
    // 第17弾: cross search (a row and a column)
    await p.evaluate(([a, f]) => { const E = SeaEngine, fl = [E.randomFleet(Math.random, false, a), E.randomFleet(Math.random, false, f)];
      G = { phase: 'battle', my: null, st: E.newGame({ rule: 'tactics', adj: false, fleets: fl, first: 0 }), level: 20, rule: 'tactics', adj: false, view: 'enemy', hint: null, evals: [.5], busy: false, resigned: false, first: 0, armed: null };
      G.my = G.st.sides[0].ships; G.st.cd[0].fill(0); render(); }, [[43, 42, 4], [1, 4, 3]]);
    await p.waitForTimeout(300);
    i = await skillBtn('cross'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForTimeout(150); await tapCell(34); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(() => { const sc = G.st.scans[0][0]; return sc && sc.list.length === 19 && sc.list.every(c => (c / 10 | 0) === 3 || c % 10 === 4); }), name + ': cross search reads row 4 and column E');
    await shot('cross');
    // 第18弾: twin torpedoes up two columns; listening finds the busiest row
    await p.evaluate(([a, f]) => { const E = SeaEngine, fl = [E.randomFleet(Math.random, false, a), E.randomFleet(Math.random, false, f)];
      G = { phase: 'battle', my: null, st: E.newGame({ rule: 'tactics', adj: false, fleets: fl, first: 0 }), level: 20, rule: 'tactics', adj: false, view: 'enemy', hint: null, evals: [.5], busy: false, resigned: false, first: 0, armed: null };
      G.my = G.st.sides[0].ships; G.st.cd[0].fill(0); render(); }, [[44, 45, 4], [1, 4, 3]]);
    await p.waitForTimeout(300);
    i = await skillBtn('listen'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(() => { const sc = G.st.scans[0][0], T = G.st.sides[1]; if (!sc || !sc.row) return false; let mx = 0; for (let r = 0; r < 10; r++) { let k = 0; for (let c = 0; c < 10; c++) if (T.grid[r * 10 + c] >= 0) k++; mx = Math.max(mx, k); } return sc.k === mx; }), name + ': listening finds the row with the most ship squares');
    await idle(); await p.evaluate(() => { G.view = 'enemy'; G.st.cd[0].fill(0); render(); });
    i = await skillBtn('dtorpedo'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForTimeout(150); await tapCell(94); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(() => { const c = G.st.log.filter(x => x.via === 'dtorpedo').map(x => x.cell); return c.some(x => x % 10 === 4) && c.some(x => x % 10 === 5) && c.every(x => x % 10 === 4 || x % 10 === 5); }), name + ': twin torpedoes run up columns E and F');
    await shot('dtorpedo');
    // 第19弾: a guided missile that hits strikes the same ship again; all-out readies every other skill
    await p.evaluate(([a, f]) => { const E = SeaEngine, fl = [E.randomFleet(Math.random, false, a), E.randomFleet(Math.random, false, f)];
      G = { phase: 'battle', my: null, st: E.newGame({ rule: 'tactics', adj: false, fleets: fl, first: 0 }), level: 20, rule: 'tactics', adj: false, view: 'enemy', hint: null, evals: [.5], busy: false, resigned: false, first: 0, armed: null };
      G.my = G.st.sides[0].ships; G.st.cd[0].fill(0); render(); }, [[47, 46, 3], [0, 4, 3]]);
    await p.waitForTimeout(300);
    const gc = await p.evaluate(() => { const T = G.st.sides[1], i = T.ships.findIndex(s => s.t === 0); for (let k = 0; k < 100; k++) if (T.grid[k] === i) return k; });
    i = await skillBtn('guided'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForTimeout(150); await tapCell(gc); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    ok(await p.evaluate(c => { const v = G.st.log.filter(x => x.via === 'guided'); const T = G.st.sides[1]; return v.length === 2 && v[0].cell === c && T.grid[v[1].cell] === T.grid[c] && v[1].hit; }, gc), name + ': the guided missile strikes the carrier twice');
    await idle(); await p.evaluate(() => { G.view = 'enemy'; const c = G.st.cd[0]; G.my.forEach((s, j) => { c[j] = SeaEngine.TYPES[s.t].skill === 'allout' ? 0 : SeaEngine.TYPES[s.t].skill ? 4 : c[j]; }); render(); });
    i = await skillBtn('allout'); n0 = await acts();
    await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 }); await idle();
    ok(await p.evaluate(() => G.my.every((s, j) => SeaEngine.TYPES[s.t].skill === 'allout' || !SeaEngine.TYPES[s.t].skill || G.st.cd[0][j] === 0 || G.st.sides[0].sunk[j])), name + ': all-out readies every other skill');
    await shot('allout');
    await ctx.close();
  }
  console.log(errs.length ? 'PAGE ERRORS:\n' + errs.join('\n') : 'no page errors'); console.log(fail || errs.length ? 'FAILED' : 'ALL OK');
  await b.close();
})();

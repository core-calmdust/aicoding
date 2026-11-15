// node seabattle/tools/test_engine.js [games=300]
// 1) rules checks  2) shots-to-finish per level (must fall as the level rises)  3) level ladder (head-to-head)  4) winProb calibration
'use strict';
const E = require('../engine.js');
const G = +process.argv[2] || 300;
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('NG  ' + m); } };
const rnd = E.rng(20261116);

// ---- 1) rules ----
for (const adj of [false, true]) for (let i = 0; i < 400; i++) {
  const f = E.randomFleet(rnd, adj); ok(E.validFleet(f, adj), 'randomFleet valid adj=' + adj);
  const g = E.gridOf(f); let n = 0; for (const x of g) if (x >= 0) n++; ok(n === 17, '17 cells');
  if (adj) for (let c = 0; c < 100; c++) if (g[c] >= 0) for (const k of E.neighbors8(c)) ok(g[k] < 0 || g[k] === g[c], 'no touching');
}
ok(!E.validFleet([{ r: 0, c: 0, len: 5, h: 1 }, { r: 0, c: 3, len: 4, h: 0 }, { r: 5, c: 5, len: 3, h: 1 }, { r: 7, c: 5, len: 3, h: 1 }, { r: 9, c: 0, len: 2, h: 1 }], false), 'overlap rejected');
ok(!E.validFleet([{ r: 0, c: 7, len: 5, h: 1 }, { r: 2, c: 0, len: 4, h: 0 }, { r: 5, c: 5, len: 3, h: 1 }, { r: 7, c: 5, len: 3, h: 1 }, { r: 9, c: 0, len: 2, h: 1 }], false), 'off board rejected');
{
  const fl = [{ r: 0, c: 0, len: 5, h: 1 }, { r: 2, c: 0, len: 4, h: 1 }, { r: 4, c: 0, len: 3, h: 1 }, { r: 6, c: 0, len: 3, h: 1 }, { r: 8, c: 0, len: 2, h: 1 }];
  let st = E.newGame({ rule: 'classic', fleets: [fl, fl], first: 0 });
  let r = E.fire(st, 0); ok(r.hit && st.turn === 1, 'classic: turn passes after a hit');
  ok(E.fire(st, 99).hit === false && st.turn === 0, 'classic: miss');
  ok(E.fire(st, 0) === null, 'same cell refused');
  st = E.newGame({ rule: 'streak', fleets: [fl, fl], first: 0 });
  r = E.fire(st, 80); ok(r.hit && r.again && st.turn === 0, 'streak: hit shoots again');
  r = E.fire(st, 81); ok(r.sunk === 4 && st.turn === 0, 'streak: sunk reported');
  r = E.fire(st, 99); ok(!r.hit && st.turn === 1, 'streak: miss passes');
  st = E.newGame({ rule: 'salvo', fleets: [fl, fl], first: 0 });
  ok(st.left === 5, 'salvo: 5 shots');
  for (let i = 0; i < 4; i++) { r = E.fire(st, 90 + i); ok(st.turn === 0, 'salvo: still my turn'); }
  E.fire(st, 95); ok(st.turn === 1 && st.left === 5, 'salvo: passes after 5');
  E.fire(st, 80); E.fire(st, 81); ok(st.sides[0].afloat === 4, 'salvo: sank one'); E.fire(st, 97); E.fire(st, 98); E.fire(st, 99);
  ok(st.turn === 0 && st.left === 4, 'salvo: 4 ships → 4 shots');
  st = E.newGame({ rule: 'classic', fleets: [fl, fl], first: 0 });
  const cells = []; fl.forEach(s => cells.push(...E.shipCells(s))); let miss = 99;
  for (const c of cells) { r = E.fire(st, c); if (r.win) break; E.fire(st, miss--); }
  ok(st.winner === 0, 'win when all 17 are hit');
}

// ---- 2) shots to finish per level ----
function solo(level, adj, n) { let s = 0; for (let g = 0; g < n; g++) { const side = E.newSide(E.randomFleet(rnd, adj)); let k = 0; while (side.afloat > 0) { const c = E.choose(side, level, adj, rnd); if (c < 0 || side.shots[c]) { ok(false, 'bad cell from choose lv' + level); break; } k++; const si = side.grid[c]; if (si >= 0) { side.shots[c] = 2; side.hits++; if (++side.hitsOn[si] === side.ships[si].len) { side.sunk[si] = true; side.afloat--; } } else side.shots[c] = 1; } s += k; } return s / n; }
console.log('--- average shots to sink the whole fleet (' + G + ' fleets) ---');
const avg = {};
for (const lv of [1, 3, 5, 7, 9, 11, 13, 15, 17, 20]) { avg[lv] = solo(lv, false, G * 3); console.log('Lv.' + String(lv).padStart(2) + '  ' + avg[lv].toFixed(1)); }
ok(avg[1] > avg[5] && avg[5] > avg[9] && avg[9] > avg[13] && avg[13] > avg[17] && avg[17] > avg[20], 'levels get stronger');
ok(avg[20] < 46, 'Lv.20 under 46 shots (got ' + avg[20].toFixed(1) + ')');
ok(avg[1] > 62, 'Lv.1 is beatable (got ' + avg[1].toFixed(1) + ')');
console.log('no-touch rule, Lv.16: ' + solo(16, true, G).toFixed(1) + '   Lv.20: ' + solo(20, true, G).toFixed(1));

// ---- 3) ladder ----
function match(la, lb, rule, n) { let w = 0; for (let g = 0; g < n; g++) { const st = E.newGame({ rule, fleets: [E.randomFleet(rnd), E.randomFleet(rnd)], first: g & 1 }); let guard = 0; while (st.winner < 0 && guard++ < 400) E.fire(st, E.choose(st.sides[1 - st.turn], st.turn ? lb : la, false, rnd)); ok(st.winner >= 0, 'game ends'); if (st.winner === 0) w++; } return w / n; }
console.log('--- win rate of the higher level ---');
for (const [a, b] of [[5, 1], [10, 5], [15, 10], [20, 15]]) for (const rule of ['classic', 'streak', 'salvo']) { const w = match(a, b, rule, G); console.log('Lv.' + a + ' vs Lv.' + b + ' ' + rule.padEnd(8) + (w * 100).toFixed(0) + '%'); ok(w > .5, 'Lv.' + a + ' beats Lv.' + b + ' (' + rule + ')'); }

// ---- 3b) the hint map: probabilities are honest (cells said to be p% hold a ship p% of the time) ----
{
  const bins = Array.from({ length: 5 }, () => [0, 0]);
  for (let g = 0; g < Math.min(G, 150); g++) { const side = E.newSide(E.randomFleet(rnd)); let k = 0; while (side.afloat > 0) { if (k++ % 9 === 4) { const a = E.advise(side, false, rnd, 300); for (let c = 0; c < 100; c++) if (!side.shots[c]) { const b = Math.min(4, a.p[c] * 5 | 0); bins[b][0]++; if (side.grid[c] >= 0) bins[b][1]++; } } const c = E.choose(side, 12, false, rnd), si = side.grid[c]; if (si >= 0) { side.shots[c] = 2; side.hits++; if (++side.hitsOn[si] === side.ships[si].len) { side.sunk[si] = true; side.afloat--; } } else side.shots[c] = 1; } }
  console.log('--- hint map calibration: shown → actual ---');
  bins.forEach((b, i) => { const act = b[0] ? b[1] / b[0] : NaN; console.log((i * 20) + '–' + (i * 20 + 20) + '%  →  ' + (b[0] ? (act * 100).toFixed(0) + '%' : '—') + '  (' + b[0] + ')'); if (b[0] > 300) ok(act > i * .2 - .08 && act < i * .2 + .28, 'hint map bin ' + i + ' honest'); });
}

// ---- 4) winProb calibration (Lv.14 vs Lv.14, classic) ----
{
  const bins = Array.from({ length: 5 }, () => [0, 0]); const n = Math.min(G, 120);
  for (let g = 0; g < n; g++) { const st = E.newGame({ rule: 'classic', fleets: [E.randomFleet(rnd), E.randomFleet(rnd)], first: g & 1 }); const ps = []; let k = 0; while (st.winner < 0) { if (k++ % 12 === 6) ps.push(E.winProb(st, 0, rnd, 8)); E.fire(st, E.choose(st.sides[1 - st.turn], 14, false, rnd)); } for (const p of ps) { const b = Math.min(4, p * 5 | 0); bins[b][0]++; if (st.winner === 0) bins[b][1]++; } }
  console.log('--- winProb calibration: predicted bin → actual ---');
  bins.forEach((b, i) => console.log((i * 20) + '–' + (i * 20 + 20) + '%  →  ' + (b[0] ? (b[1] / b[0] * 100).toFixed(0) + '%' : '—') + '  (' + b[0] + ')'));
  ok(bins[0][0] < 5 || bins[0][1] / bins[0][0] < .35, 'low predictions lose'); ok(bins[4][0] < 5 || bins[4][1] / bins[4][0] > .65, 'high predictions win');
}
console.log(fail ? 'FAILED: ' + fail : 'ALL OK');
process.exit(fail ? 1 : 0);

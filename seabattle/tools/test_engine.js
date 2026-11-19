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

// ---- 1a) タクティクス 第2弾・第3弾: rockets, repairs, mines (turns lost), anti-air — every AI game ends, replays to the same boards, and hit counts stay true ----
{
  let bad = 0, reps = 0;
  for (let g = 0; g < 120; g++) { const fl = [0, 1].map(() => E.randomFleet(rnd, false, [[11, 12, 6, 3, 4], [14, 13, 12, 1, 4], [15, 16, 17, 13, 4], [18, 19, 14, 5, 4], [20, 21, 1, 3, 4], [22, 23, 13, 5, 4], [24, 25, 14, 18, 4], [26, 27, 3, 1, 4]][g % 8])), st = E.newGame({ rule: 'tactics', adj: false, fleets: fl, first: g & 1 }); let n = 0;
    while (st.winner < 0 && n++ < 400) { const a = E.chooseAction(st, 20, rnd); if (a.skill === 'repair') reps++; if (!E.act(st, a)) { bad++; break; } }
    const st2 = E.newGame({ rule: 'tactics', adj: false, fleets: fl, first: g & 1 }); for (const a of st.acts) E.act(st2, a);
    if (st.winner < 0 || JSON.stringify([...st.sides[0].shots, ...st.sides[1].shots]) !== JSON.stringify([...st2.sides[0].shots, ...st2.sides[1].shots])) bad++;
    for (const sd of st.sides) if (sd.shots.filter(x => x === 2).length !== sd.hits) bad++; }
  ok(bad === 0 && reps > 0, 'rockets and repairs: games end, replay the same, hits stay true (' + reps + ' repairs)');
}

// ---- 1b) タクティクス: draft, skills, cooldowns ----
{
  // snake order A B B A A B B A
  let d = E.draftNew(0); const seq = []; for (let i = 0; i < 8; i++) { seq.push(d.turn); const k = E.TYPES.map((_, x) => x).reverse().find(x => E.draftCan(d, d.turn, x)); if (k == null) break; E.draftPick(d, k); }
  ok(seq.join('') === '01100110', 'draft order is A B B A A B B A (' + seq.join('') + ')');
  ok(!E.draftPick(E.draftNew(0), -1), 'cannot stop before 3 ships');
  let bad = 0, sizes = {};
  for (let g = 0; g < 2000; g++) { d = E.draftNew(g & 1); let guard = 0; while (d.turn >= 0 && guard++ < 40) { const p = d.turn; const all = E.TYPES.map((_, x) => x).filter(x => E.draftCan(d, p, x)); let k = g % 3 === 0 ? E.draftAI(d, rnd) : all[rnd() * all.length | 0]; if (k == null || k < 0) k = E.draftCanStop(d, p) && rnd() < .5 ? -1 : all[0]; if (!E.draftPick(d, k)) { bad++; break; } }
    if (d.turn >= 0 || !E.validDraft(d.picks[0]) || !E.validDraft(d.picks[1]) || d.pool.some(x => x < 0)) bad++; sizes[d.picks[0].length] = (sizes[d.picks[0].length] || 0) + 1; }
  ok(bad === 0, 'every draft (random and AI) ends with two legal fleets (' + JSON.stringify(sizes) + ')');
  const fl = [{ r: 0, c: 0, len: 5, h: 1, t: 0 }, { r: 2, c: 0, len: 4, h: 1, t: 1 }, { r: 4, c: 0, len: 3, h: 1, t: 2 }, { r: 6, c: 0, len: 3, h: 1, t: 3 }];
  let st = E.newGame({ rule: 'tactics', fleets: [fl, fl], first: 0 });
  ok(st.cd[0].join() === '3,2,3,2', 'skills start half charged (' + st.cd[0].join() + ')');
  ok(E.useSkill(st, 3, 55) === null, 'a charging skill cannot be used');
  E.fire(st, 99); E.fire(st, 99); E.fire(st, 98); E.fire(st, 98);
  ok(st.cd[0][3] === 0 && st.cd[0][1] === 0 && st.turn === 0, 'cooldowns count the owner’s turns');
  let r = E.useSkill(st, 3, 11); ok(r && r.k === 6 && st.scans[0].length === 1 && st.turn === 1 && st.cd[0][3] === 3, 'sonar counts 6 ship squares around B2, costs the turn, goes on cooldown');
  ok(E.heat(E.view(st.sides[1], st.scans[0]), false, 6)[1] > E.heat(E.view(st.sides[1]), false, 6)[1] * 1.5, 'the density map leans toward the sonar box');
  E.fire(st, 97);
  r = E.useSkill(st, 1, 0); ok(r && r.shots.length === 4 && r.shots.filter(x => x.hit).length === 2 && st.sides[1].shots[0] === 2 && st.sides[1].shots[10] === 1, 'volley: 2×2 block, 2 hits');
  E.fire(st, 96); E.fire(st, 97); E.fire(st, 95);
  ok(st.cd[0][2] === 0, 'torpedo ready'); r = E.useSkill(st, 2, 2);
  ok(r && r.shots.length === 4 && r.shots[3].hit && r.shots[3].cell === 62 && st.sides[1].shots[92] === 1 && !st.sides[1].shots[52], 'torpedo runs up column C to the first ship (C7) and shows the water it crossed');
  E.fire(st, 94); E.fire(st, 96); E.fire(st, 93);
  ok(st.cd[0][0] === 0, 'bomb ready'); r = E.useSkill(st, 0, 22);
  ok(r && r.shots.length === 5 && r.shots.filter(x => x.hit).length === 3, 'air strike: a plus of 5 squares');
  // lose the ship, lose the skill
  st = E.newGame({ rule: 'tactics', fleets: [fl, fl], first: 1 });
  for (const c of [60, 61, 62]) { E.fire(st, c); if (st.turn === 0) E.fire(st, 99 - c % 10); }
  ok(st.sides[0].sunk[3] && !E.skillReady(st, 0, 3), 'a sunk ship’s skill is gone');
  for (let g = 0; g < 4; g++) E.fire(st, [90, 91, 92, 93, 94, 95, 96, 97][st.sides[1 - st.turn].nshots - (st.turn ? 3 : 0) + 4] ?? 89);
  ok(E.preview(st, 3, 44) === null, 'and stays gone after the cooldown time');
  // AI never produces an illegal action; skills get used
  let used = { bomb: 0, volley: 0, torpedo: 0, sonar: 0 }, illegal = 0;
  for (let g = 0; g < 60; g++) { const d2 = E.draftNew(g & 1); while (d2.turn >= 0) E.draftPick(d2, E.draftAI(d2, rnd)); const s2 = E.newGame({ rule: 'tactics', fleets: [E.randomFleet(rnd, false, d2.picks[0]), E.randomFleet(rnd, false, d2.picks[1])], first: g & 1 }); let k = 0; while (s2.winner < 0 && k++ < 400) { const a = E.chooseAction(s2, 20, rnd); if (a.skill) used[a.skill]++; if (!E.act(s2, a)) { illegal++; break; } } if (s2.winner < 0) illegal++; }
  ok(illegal === 0 && used.bomb && used.volley && used.torpedo && used.sonar, 'AI games with drafted fleets all finish; every skill is used ' + JSON.stringify(used));
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
function matchT(la, lb, n) { let w = 0; for (let g = 0; g < n; g++) { const st = E.newGame({ rule: 'tactics', fleets: [E.randomFleet(rnd, false, [0, 1, 2, 3]), E.randomFleet(rnd, false, [0, 1, 2, 3])], first: g & 1 }); let guard = 0; while (st.winner < 0 && guard++ < 400) E.act(st, E.chooseAction(st, st.turn ? lb : la, rnd)); if (st.winner === 0) w++; } return w / n; }
for (const [a, b] of [[5, 1], [10, 5], [15, 10], [20, 15]]) { const w = matchT(a, b, G); console.log('Lv.' + a + ' vs Lv.' + b + ' tactics ' + (w * 100).toFixed(0) + '%'); ok(w > .5, 'Lv.' + a + ' beats Lv.' + b + ' (tactics)'); }
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

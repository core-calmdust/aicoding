// ur/tools/test_engine.js — node ur/tools/test_engine.js [--quick]
// ルールの正しさ・確率・AI の強さの単調性・速さを確認する。
'use strict';
const E = require('../engine.js');
const QUICK = process.argv.includes('--quick');
let pass = 0, fail = 0;
function ok(c, msg) { if (c) pass++; else { fail++; console.log('  NG:', msg); } }
function eq(a, b, msg) { ok(JSON.stringify(a) === JSON.stringify(b), msg + ' expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a)); }
function st(rule, p0, p1, turn) { const s = E.newGame(rule); const N = E.RULES[rule].pieces; const f = a => { const r = a.slice(); while (r.length < N) r.push(0); return r; }; s.pos = [f(p0), f(p1)]; s.turn = turn || 0; return s; }
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-9);

console.log('— 確率');
ok(near(E.PROB.reduce((a, b) => a + b, 0), 1), 'PROB sum');
eq(E.PROB.map(x => x * 16), [1, 4, 6, 4, 1], 'PROB');
for (const r of Object.keys(E.RULES)) ok(near(E.probs(r).reduce((a, b) => a + b, 0), 1), r + ' probs sum');
eq(E.probs('masters').map(x => x * 8), [0, 3, 3, 1, 1], 'masters 3 dice 0→4');
{ const rng = E.mulberry32(7), c = [0, 0, 0, 0, 0]; for (let i = 0; i < 160000; i++) { const r = E.rollDice(rng); c[r.n]++; ok(r.dice.length === 4 && r.dice.reduce((a, b) => a + b) === r.n || false, 'dice sum'); }
  for (let n = 0; n < 5; n++) ok(Math.abs(c[n] / 160000 - E.PROB[n]) < 0.006, 'roll freq ' + n);
  const m = [0, 0, 0, 0, 0]; for (let i = 0; i < 80000; i++) { const r = E.rollDice(rng, 'masters'); m[r.n]++; ok(r.dice.length === 3, 'masters 3 dice'); }
  ok(m[0] === 0 && Math.abs(m[4] / 80000 - 0.125) < 0.01, 'masters zero→4'); }

console.log('— 盤と経路');
eq(E.ROSETTES_RC, [[0, 0], [2, 0], [1, 3], [0, 6], [2, 6]], 'ROSETTES_RC');
eq(E.pathOf('finkel', 0), [[2, 3], [2, 2], [2, 1], [2, 0], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [2, 7], [2, 6]], 'finkel path side0');
eq(E.pathOf('finkel', 1), [[0, 3], [0, 2], [0, 1], [0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [0, 7], [0, 6]], 'finkel path side1');
eq(E.pathOf('masters', 0), [[2, 3], [2, 2], [2, 1], [2, 0], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [0, 6], [0, 7], [1, 7], [2, 7], [2, 6]], 'masters path side0');
eq(E.pathOf('blitz', 1), [[0, 3], [0, 2], [0, 1], [0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [2, 6], [2, 7], [1, 7], [0, 7], [0, 6]], 'blitz path side1');
eq(E.RULES.finkel.rosettes, [4, 8, 14], 'finkel rosettes');
eq(E.RULES.masters.rosettes, [4, 8, 12, 16], 'masters rosettes every 4th');
eq([E.RULES.finkel.pieces, E.RULES.blitz.pieces, E.RULES.masters.pieces], [7, 5, 7], 'piece counts');
eq([E.RULES.finkel.goal, E.RULES.masters.goal], [15, 17], 'goal index');
ok(E.coords('finkel', 0, 0) === null && E.coords('finkel', 0, 15) === null, 'coords off-board null');
ok(E.isRosette('finkel', 0, 8) && E.isRosette('finkel', 1, 4) && !E.isRosette('finkel', 0, 7), 'isRosette');
ok(E.isSafe('finkel', 0, 8) && E.isSafe('finkel', 0, 3) && !E.isSafe('finkel', 0, 9), 'isSafe finkel');
ok(!E.isSafe('masters', 0, 8) && E.isSafe('masters', 0, 4) && !E.isSafe('masters', 0, 12) && !E.isSafe('masters', 0, 14), 'isSafe masters');
// 全ルールで両者の盤上マスの集合＝20マス
for (const r of Object.keys(E.RULES)) { const set = new Set(); for (const sd of [0, 1]) E.pathOf(r, sd).forEach(([a, b]) => set.add(a * 8 + b)); ok(set.size === 20, r + ' covers 20 cells'); }

console.log('— 手の生成');
{ let s = E.newGame('finkel'); let ms = E.legalMoves(s, 3);
  eq(ms.length, 1, 'enter is one move'); ok(ms[0].enter && ms[0].to === 3 && !ms[0].capture, 'enter to 3');
  eq(E.legalMoves(s, 0), [], 'zero → no move');
  ms = E.legalMoves(s, 4); ok(ms[0].rosette, 'enter on rosette 4');
  const r = E.apply(s, ms[0]); ok(r.again && r.state.turn === 0, 'rosette extra roll');
  const r2 = E.apply(s, E.legalMoves(s, 2)[0]); ok(!r2.again && r2.state.turn === 1, 'turn passes');
  const r3 = E.apply(s, null); ok(r3.state.turn === 1 && !r3.again, 'pass'); }
{ // 自駒に止まれない
  const s = st('finkel', [3, 5], []); const ms = E.legalMoves(s, 2);
  ok(!ms.some(m => m.from === 3), 'cannot land on own'); ok(ms.some(m => m.from === 0 && m.to === 2), 'enter ok'); ok(ms.some(m => m.from === 5 && m.to === 7), 'move 5→7'); }
{ // 取り（中央の列）。side0 の 9 と side1 の 9 は同じマス(1,4)
  const s = st('finkel', [7], [9]); const ms = E.legalMoves(s, 2); const m = ms.find(x => x.from === 7);
  ok(m && m.capture, 'capture'); const ns = E.apply(s, m).state; eq(ns.pos[1][0], 0, 'captured returns'); ok(ns.turn === 1, 'finkel capture no extra'); }
{ // 自陣の列（1..4, 13..14）では相手と同じ番号でも別のマス
  const s = st('finkel', [1], [3]); const ms = E.legalMoves(s, 2); ok(ms.some(m => m.from === 1 && m.to === 3 && !m.capture), 'own lane separate'); }
{ // 中央ロゼット安全（finkel）
  const s = st('finkel', [6], [8]); ok(!E.legalMoves(s, 2).some(m => m.from === 6), 'central rosette safe'); }
{ // masters/blitz：ロゼットは安全でない
  const s = st('masters', [6], [8]); const m = E.legalMoves(s, 2).find(x => x.from === 6); ok(m && m.capture && m.rosette, 'masters rosette capturable');
  const r = E.apply(s, m); ok(r.again, 'masters rosette extra');

  const c0 = E.coords('masters', 0, 12), c1 = E.coords('masters', 1, 12); ok(c0[0] === 0 && c1[0] === 2, 'masters 12 is opponent lane'); }
{ // masters：相手の列（12,13）で相手の駒と出会う＝相手の 1..2 番目ではなく 15,16 は自陣
  // side0 の 12=(0,6) は side1 の 16（自陣ロゼット）と同じマス
  eq(E.coords('masters', 0, 12), E.coords('masters', 1, 16), 'masters crossing cell');
  const s = st('masters', [10], [16]); const m = E.legalMoves(s, 2).find(x => x.from === 10); ok(m && m.capture, 'masters capture on opp lane'); }
{ // blitz：取ると追加手番
  const s = st('blitz', [7], [9]); const m = E.legalMoves(s, 2).find(x => x.from === 7); const r = E.apply(s, m); ok(r.again && r.state.turn === 0, 'blitz capture extra'); }
{ // ちょうどでゴール
  const s = st('finkel', [13, 12], []); const ms3 = E.legalMoves(s, 3); ok(ms3.some(m => m.from === 12 && m.finish && m.to === 15), 'exact finish');
  ok(!ms3.some(m => m.from === 13), 'overshoot not allowed');
  const ms2 = E.legalMoves(s, 2); ok(ms2.some(m => m.from === 13 && m.finish), 'finish 13+2'); }
{ // 動けない → 空
  const s = st('finkel', [14, 13, 12, 11, 10, 9, 15], []); s.pos[0] = [14, 13, 12, 15, 15, 15, 15];
  // 4: 14→18× 13→17× 12→16×、入場なし → 0手
  eq(E.legalMoves(s, 4).length, 0, 'no legal moves'); }
{ // 勝敗
  const s = st('finkel', [14, 15, 15, 15, 15, 15, 15], []); const m = E.legalMoves(s, 1)[0]; const r = E.apply(s, m);
  ok(r.state.winner === 0 && !r.again, 'win'); eq(E.legalMoves(r.state, 2), [], 'no moves after win'); }
{ // 同じ from の重複まとめ（入場）
  const s = E.newGame('finkel'); eq(E.legalMoves(s, 1).length, 1, 'dedupe'); }
{ // key
  const a = st('finkel', [3, 5], [2]), b = st('finkel', [5, 3], [2]); ok(E.key(a) === E.key(b), 'key order-insensitive'); b.turn = 1; ok(E.key(a) !== E.key(b), 'key turn'); }
{ // moveText
  eq(E.moveText({ from: 0, to: 3, enter: true }, 0), '明 3：入場→3', 'moveText enter');
  eq(E.moveText({ from: 7, to: 9, capture: true }, 1), '暗 2：7→9 ×取り', 'moveText cap'); }
{ // hitRisk：side0 の駒が 9、side1 の駒が 7 → 2 の目で取られる（6/16）
  const s = st('finkel', [9], [7], 0); const r = E.hitRisk(s, 0); ok(near(r[0], 6 / 16), 'hitRisk ' + r[0]);
  const s2 = st('finkel', [8], [7], 0); ok(E.hitRisk(s2, 0)[0] === 0, 'hitRisk rosette 0');
  const rc = E.raceCount(st('finkel', [14], [])); eq(rc.pips[0], 1 + 15 * 6, 'raceCount'); }
// ランダム対局で不変条件
{ const rng = E.mulberry32(3);
  for (const rule of Object.keys(E.RULES)) {
    let bad = 0;
    for (let g = 0; g < 300; g++) {
      let s = E.newGame(rule, g & 1), steps = 0;
      while (s.winner < 0 && steps++ < 5000) {
        const n = E.rollDice(rng, rule).n, ms = E.legalMoves(s, n); const rl = E.RULES[rule];
        const occ = new Map(); for (const sd of [0, 1]) for (const p of s.pos[sd]) if (p >= 1 && p <= rl.pathLen) { const c = E.coords(rule, sd, p).join(); if (occ.has(c)) bad++; occ.set(c, sd); }
        const m = ms.length ? ms[Math.floor(rng() * ms.length)] : null; const r = E.apply(s, m); s = r.state;
      }
      if (s.winner < 0) bad++;
    }
    ok(bad === 0, rule + ' random games invariant');
  }
}

console.log('— 評価と AI');
{ const s = E.newGame('finkel'); const w = E.winProb(s); ok(w > 0.45 && w < 0.6, 'start winProb ' + w.toFixed(3));
  const ev = E.evaluate(st('finkel', [10], [12, 15, 15, 15]), 2); ok(ev.length && ev[0].move.capture, 'evaluate prefers capture'); ok(ev.every((x, i) => i === 0 || x.wp <= ev[i - 1].wp), 'evaluate sorted');
  ok(ev.every(x => x.wp >= 0 && x.wp <= 1), 'wp in 0..1');
  const s2 = st('finkel', [14, 15, 15, 15, 15, 15, 15], [], 0); ok(E.winProb(s2) > 0.25, 'near-win winProb');
  const ev2 = E.evaluate(s2, 1); ok(ev2[0].wp === 1, 'winning move wp=1'); }
{ // think 返り値は合法手
  const rng = E.mulberry32(5); for (let L = 1; L <= 20; L++) { const s = st('finkel', [3, 6], [7]); const m = E.think(s, 2, L, { rng }); ok(E.legalMoves(s, 2).some(x => x.from === m.from), 'think legal L' + L); }
  ok(E.think(E.newGame('finkel'), 0, 20) === null, 'think pass null'); }
{ // 粘り：負けが確定的な局面（全手の勝率ほぼ0）でも、取られる確率の合計が最小の手を選ぶ
  const rng = E.mulberry32(11); let tested = 0, good = 0;
  for (let g = 0; g < 400 && tested < 60; g++) {
    let s = E.newGame('finkel', g & 1);
    while (s.winner < 0) {
      const n = E.rollDice(rng).n, ms = E.legalMoves(s, n);
      if (ms.length > 1) {
        const ev = E.evaluate(s, n, { depth: 2 });
        if (ev[0].wp < 0.03) {
          const me = s.turn, cand = ev.filter(x => x.wp >= ev[0].wp - 0.02);
          const risk = m => E.hitRisk(E.apply(s, m).state, me).reduce((a, b) => a + b, 0);
          const minR = Math.min(...cand.map(x => risk(x.move)));
          const m = E.think(s, n, 20); tested++; if (risk(m) <= minR + 0.13) good++;
        }
      }
      s = E.apply(s, E.think(s, n, s.turn ? 20 : 2, { rng })).state;
    }
  }
  ok(tested >= 20 && good / tested > 0.9, `resist: ${good}/${tested} lowest-risk`);
}
// 自己対局（強さの単調性）
function play(rule, La, Lb, games, seed) {
  const rng = E.mulberry32(seed); let wa = 0;
  for (let g = 0; g < games; g++) {
    let s = E.newGame(rule, g & 1); const lv = (g & 2) ? [Lb, La] : [La, Lb]; // 先後入れ替え
    while (s.winner < 0) { const n = E.rollDice(rng, rule).n; const m = E.think(s, n, lv[s.turn], { rng }); s = E.apply(s, m).state; }
    if (s.winner === ((g & 2) ? 1 : 0)) wa++;
  }
  return wa / games;
}
console.log('— 強さ（自己対局）');
{
  const G = QUICK ? 400 : 1500;
  const pairs = QUICK ? [[20, 10], [10, 1], [5, 1]] : [[20, 10], [18, 14], [14, 10], [10, 6], [6, 2], [2, 1], [10, 1]];
  for (const [a, b] of pairs) {
    const w = play('finkel', a, b, G, a * 100 + b); const se = Math.sqrt(0.25 / G);
    console.log(`  L${a} vs L${b}: ${(w * 100).toFixed(1)}% (${G}局)`);
    ok(w > 0.5 + 2 * se, `L${a} beats L${b}`);
  }
}
console.log('— 速さ');
for (const rule of Object.keys(E.RULES)) {
  const rng = E.mulberry32(9); let t = 0, n = 0, mx = 0;
  for (let g = 0; g < (QUICK ? 10 : 30); g++) { let s = E.newGame(rule, g & 1);
    while (s.winner < 0) { const r = E.rollDice(rng, rule).n; const t0 = process.hrtime.bigint(); const m = E.think(s, r, 20, { rng }); const dt = Number(process.hrtime.bigint() - t0) / 1e6; if (E.legalMoves(s, r).length > 1) { t += dt; n++; mx = Math.max(mx, dt); } s = E.apply(s, m).state; } }
  console.log(`  ${rule} L20 平均 ${(t / n).toFixed(2)}ms 最大 ${mx.toFixed(1)}ms (${n}手)`);
  ok(t / n < 100 && mx < 500, rule + ' L20 speed');
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

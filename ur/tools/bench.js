// ur/tools/bench.js — AI の強さ測定（自己対局、先後入れ替え）
// node ur/tools/bench.js <rule> <games> <La:Lb,...> [lut.rgu]
//   Lx に 'P' を指定すると完全解析表（Panda 相当の最善手）で指す（lut.rgu が必要）
'use strict';
const E = require('../engine.js');
const [rule = 'finkel', G = '2000', pairsS = '20:10', lutf] = process.argv.slice(2);
const T = lutf ? require('./lut.js').open(rule, lutf) : null;
function mover(L) {
  if (L === 'P') return (s, n) => { const ms = E.legalMoves(s, n); let b = null, bv = -1; for (const m of ms) { const v = T.after(s, m); if (v > bv) { bv = v; b = m; } } return b; };
  const lv = +L; return (s, n, rng) => E.think(s, n, lv, { rng });
}
function play(A, B, games, seed) {
  const rng = E.mulberry32(seed), fa = mover(A), fb = mover(B); let wa = 0;
  for (let g = 0; g < games; g++) {
    const aSide = g & 1; let s = E.newGame(rule, (g >> 1) & 1);
    while (s.winner < 0) { const n = E.rollDice(rng, rule).n; const m = (s.turn === aSide ? fa : fb)(s, n, rng); s = E.apply(s, m).state; }
    if (s.winner === aSide) wa++;
  }
  return wa / games;
}
for (const p of pairsS.split(',')) {
  const [a, b] = p.split(':'); const t0 = Date.now();
  const w = play(a, b, +G, 1000 + p.length * 7 + (+a || 99) * 31 + (+b || 77));
  console.log(`${rule} L${a} vs L${b}: ${(w * 100).toFixed(1)}% ±${(196 * Math.sqrt(w * (1 - w) / +G)).toFixed(1)} (${G}局, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}

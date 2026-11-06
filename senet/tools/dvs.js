// node tools/dvs.js dA dB N : greedy depth A vs greedy depth B
const E = require('../engine.js');
const [da, db, N] = process.argv.slice(2).map(Number);
function pick(s, n, d) { const ms = E.legalMoves(s, n); if (ms.length < 2) return ms[0] || null; const ev = E.evaluate(s, n, { depth: d }); return ev[0].move; }
let w = 0;
for (let i = 0; i < N; i++) { const rng = E.mulberry32(i * 31 + 7), aS = i & 1; let s = E.newGame('std', (i >> 1) & 1), k = 0;
  while (s.winner < 0 && k++ < 3000) { const r = E.rollDice(rng); const m = pick(s, r.n, s.turn === aS ? da : db); s = E.apply(s, m, r.n).state; }
  if (s.winner === aS) w++; }
console.log(`d${da} vs d${db}: ${w}/${N} = ${(100 * w / N).toFixed(1)}%`);

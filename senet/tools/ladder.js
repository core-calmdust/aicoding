// node tools/ladder.js A B N  → win rate of level A vs level B (alternating first player), as JSON line
const E = require('../engine.js');
const [a, b, N] = process.argv.slice(2).map(Number);
let w = 0;
for (let i = 0; i < N; i++) {
  const rng = E.mulberry32(i * 7919 + a * 31 + b), aSide = i & 1; let s = E.newGame('std', (i >> 1) & 1), k = 0;
  while (s.winner < 0 && k++ < 3000) { const r = E.rollDice(rng), lv = s.turn === aSide ? a : b; const m = E.think(s, r.n, lv, { rng, timeLimit: 400 }); s = E.apply(s, m, r.n).state; }
  if (s.winner === aSide) w++;
}
console.log(JSON.stringify({ a, b, N, w, p: w / N }));

const E = require('../engine.js');
console.log('T', [1,10,20,25,26,28,29,30].map(p=>p+':'+E.T[p].toFixed(2)).join(' '));
function play(lvA, lvB, seed, rule='std') {
  const rng = E.mulberry32(seed); let s = E.newGame(rule, seed & 1), plies = 0;
  while (s.winner < 0 && plies < 3000) {
    const r = E.rollDice(rng), lv = s.turn === 0 ? lvA : lvB;
    const m = E.think(s, r.n, lv, { rng, timeLimit: 1e9 });
    s = E.apply(s, m, r.n).state; plies++;
  }
  return { w: s.winner, plies };
}
const [a, b, N] = process.argv.slice(2).map(Number);
let w = 0, pl = 0, t0 = Date.now();
for (let i = 0; i < N; i++) { const sw = i & 1, r = play(sw ? b : a, sw ? a : b, i + 1); if (r.w === (sw ? 1 : 0)) w++; pl += r.plies; if (r.w < 0) console.log('stuck'); }
console.log(`L${a} vs L${b}: ${w}/${N} = ${(w / N * 100).toFixed(1)}%  avg plies ${(pl / N).toFixed(0)}  ${(Date.now() - t0) / N | 0}ms/game`);

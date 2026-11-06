// node vs.js netA|- netB|- levelA levelB N  (- = hand eval)
const fs = require('fs');
const [na, nb, la, lb, N] = process.argv.slice(2);
function mk(net) { delete require.cache[require.resolve('../engine.js')]; const E = require('../engine.js'); if (net !== '-') E.setNet(JSON.parse(fs.readFileSync(net))); return E; }
const A = mk(na), B = mk(nb);
let w = 0, t0 = Date.now();
for (let i = 0; i < +N; i++) {
  const rng = A.mulberry32(i * 7 + 3), aSide = i & 1; let s = A.newGame('std', (i >> 1) & 1), k = 0;
  while (s.winner < 0 && k++ < 3000) { const r = A.rollDice(rng), Eg = s.turn === aSide ? A : B, lv = s.turn === aSide ? +la : +lb; const m = Eg.think(s, r.n, lv, { rng, timeLimit: 1e9 }); s = A.apply(s, m, r.n).state; }
  if (s.winner === aSide) w++;
}
console.log(`${na}@${la} vs ${nb}@${lb}: ${w}/${N} = ${(100 * w / N).toFixed(1)}%  ${((Date.now() - t0) / N).toFixed(1)}ms/g`);

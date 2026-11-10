// The 12 positions of ../../bench.html (the same seeded random games) as engine.c setup() buffers for sim.c (pos.txt in the
// current folder): node dump.js ../..
const W = process.argv[2], fs = require('fs');
const E = require(W + '/engine.js');
E.setRule('sivy');
let rs = 20261109; const rnd = n => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs % n; };
const out = [];
while (out.length < 12) {
  const p = E.Pos.from(null), moves = [], len = 6 + rnd(20); let ok = true;
  for (let i = 0; i < len; i++) { const L = p.moves(); if (!L.length) { ok = false; break; } const m = L[rnd(L.length)]; p.play(m); moves.push(m); }
  if (ok && p.moves().length > 1) out.push(moves);
}
fs.writeFileSync('pos.txt', out.map(m => 'P ' + E.setupIO(null, m).join(' ')).join('\n') + '\n');
console.log(out.length + ' positions, plies ' + out.map(m => m.length).join(' '));

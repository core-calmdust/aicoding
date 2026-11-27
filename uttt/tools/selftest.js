// Rules self-test: random games in every rule; the JS rules (Pos) and the core (gen / results) must agree; the prover too.
const E = require('../engine.js');
let games = 0, plies = 0, res = { 0: 0, 1: 0, 2: 0 };
for (const rk of ['std', 'r100', 'r010', 'r001', 'r111']) {
  E.setRule(rk);
  for (let g = 0; g < 400; g++) {
    const p = E.Pos.from(null);
    while (p.res < 0) {
      const ms = p.moves();
      // core moves at this position
      const C = E.core; const io = C.io; for (let i = 0; i < 81; i++) io[i] = p.c[i]; io[81] = p.forced; io[82] = p.side; io[83] = p.ply; for (let b = 0; b < 9; b++) io[84 + b] = p.own[b]; C.x.setpos();
      const n = C.x.rootmoves(); const cm = Array.from(C.out.slice(0, n)).sort((a, b) => a - b);
      if (C.x.rootres() !== -1) throw new Error('core says over ' + rk);
      if (cm.join() !== ms.slice().sort((a, b) => a - b).join()) throw new Error('moves differ ' + rk + ' ' + cm.length + ' ' + ms.length);
      p.play(ms[Math.floor(Math.random() * ms.length)]); plies++;
      // spec round-trip
      const q = E.Pos.from(p.spec()); if (q.key() !== p.key() || q.res !== p.res) throw new Error('spec round trip ' + rk);
    }
    // the core agrees on the result
    const C = E.core, io = C.io; for (let i = 0; i < 81; i++) io[i] = p.c[i]; io[81] = p.forced; io[82] = p.side; io[83] = p.ply; for (let b = 0; b < 9; b++) io[84 + b] = p.own[b]; C.x.setpos();
    if (C.x.rootres() !== p.res) throw new Error('result differs ' + rk + ' ' + C.x.rootres() + ' ' + p.res);
    games++; res[p.res]++;
  }
}
console.log('ok', games, 'games', plies, 'plies', res);

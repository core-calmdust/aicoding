// (2026-11-14, MODEL_CARD.md「探索 v2」) The node levels (4級〜三段: best_n with a node limit) and values() must search as
// before v2: two builds of engine_simd.wasm, the same searches along seeded random games, every output compared.
//   node tools/check_v2.js <old.wasm> <new.wasm> [games = 4]
'use strict';
const path = require('path'), { load } = require('./wasm.js');
(async () => {
  const [fa, fb] = process.argv.slice(2, 4).map(f => path.resolve(f)), G = +(process.argv[4] || 4);
  const A = await load({ file: fa }), B = await load({ file: fb }), E = A.E;
  let s = 12345; const rnd = n => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s % n; };
  let n = 0, diff = 0;
  const run = (W, moves, kind, x) => {
    W.setup(null, moves);
    if (kind === 'n') W.X.best_n(99, 0, x); else W.X.values(x, 0);
    const r = W.io(); return Array.from(r.slice(0, kind === 'n' ? 5 : 2 + 3 * r[0])).join(',');
  };
  for (let g = 0; g < G; g++) {
    A.newGame(); B.newGame(); const moves = [];
    for (let ply = 0; ply < 100; ply++) {
      const L = E.replay(null, moves).pos.moves();
      if (!L.length) break;
      for (const [k, x] of [['n', 900], ['n', 3500], ['n', 20000], ['n', 120000], ['v', 4]]) {
        const a = run(A, moves, k, x), b = run(B, moves, k, x); n++;
        if (a !== b) { diff++; if (diff < 5) console.log('diff', g, ply, k, x, a, '|', b); }
      }
      moves.push(L[rnd(L.length)]);
    }
  }
  console.log(`${n} searches, ${diff} differ`);
})();

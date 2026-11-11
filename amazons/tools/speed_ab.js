// One thread's speed of the alpha-beta search (2026-11-11): the search in core.c (ab_*) against the JS search with the same
// core's evaluation (AMZ_JSSEARCH=1, the way before), with and without SIMD (AMZ_NOSIMD=1). The bench's 8 positions (bench.html:
// Lv.9 vs Lv.10, plies 10 … 40), the best move to a fixed depth from an empty table (each position in a fresh process state:
// newgame), the time, evaluations, nodes and evaluations per second; the same answers in both.
//   node tools/speed_ab.js [depth=6] [reps=1]
'use strict';
const path = require('path'), { execFileSync } = require('child_process');
const arg = k => { const a = process.argv.find(x => x.startsWith(k + '=')); return a ? +a.slice(k.length + 1) : null; };
const D = arg('depth') || 6, REPS = arg('reps') || 1;
if (process.argv[2] === 'run') {
  const E = require(path.join(__dirname, '..', 'engine.js'));
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const P = [];
  for (let g = 0; g < 2; g++) { const moves = []; for (let i = 0; i < 40; i++) { const r = E.think(null, moves, 9 + g, rnd); if (r.move < 0) break; moves.push(r.move); if (i % 10 === 9) P.push(moves.slice()); } }
  const out = [];
  for (const mv of P) {
    let best = null;
    for (let k = 0; k < REPS; k++) {
      E.newGame();
      const t0 = process.hrtime.bigint(), r = E.think(null, mv, 0, null, null, { s: 1, dx: D, nk: 1e9 }), ms = Number(process.hrtime.bigint() - t0) / 1e6;
      const o = { ms, evals: E.evals, nodes: E.nodes, ans: E.name(null, r.move) + ' ' + r.v + ' d' + r.depth };
      if (!best || o.ms < best.ms) best = o;
    }
    out.push(best);
  }
  console.log(JSON.stringify(out)); process.exit(0);
}
const run = env => JSON.parse(execFileSync(process.execPath, [__filename, 'run', 'depth=' + D, 'reps=' + REPS], { env: Object.assign({}, process.env, env), maxBuffer: 1 << 26 }).toString());
console.log(`depth ${D}, the bench's 8 positions, best of ${REPS}`);
for (const [nm, env] of [['SIMD', {}], ['without SIMD', { AMZ_NOSIMD: '1' }]]) {
  const a = run(Object.assign({ AMZ_JSSEARCH: '1' }, env)), b = run(env);
  let ta = 0, tb = 0, ea = 0, eb = 0, na = 0, nb = 0, same = 0, lg = 0;
  a.forEach((x, i) => { const y = b[i]; ta += x.ms; tb += y.ms; ea += x.evals; eb += y.evals; na += x.nodes; nb += y.nodes; if (x.ans === y.ans && x.evals === y.evals && x.nodes === y.nodes) same++; lg += Math.log(x.ms / y.ms); });
  console.log(`${nm}: JS search ${(ta / 1000).toFixed(2)} s (${Math.round(ea / ta)}k evals/s, ${Math.round(na / ta * 1000)} nodes/s) → C ${(tb / 1000).toFixed(2)} s (${Math.round(eb / tb)}k evals/s, ${Math.round(nb / tb * 1000)} nodes/s): ×${(ta / tb).toFixed(2)} (geomean ×${Math.exp(lg / a.length).toFixed(2)}), the same move / value / evals / nodes ${same}/${a.length}`);
  a.forEach((x, i) => console.log(`  pos${i}: ${x.ans} | JS ${x.ms.toFixed(0)} ms | C ${b[i].ms.toFixed(0)} ms | ${x.evals} evals, ${x.nodes} nodes`));
}

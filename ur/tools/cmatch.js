// The C engine (engine.c) against the JavaScript search of engine.js, the three rules:
//   node tools/cmatch.js [positions per rule] [depth]      (from ur/; default 40 positions, depth 2 = Lv.20)
// evaluate(s, n, { depth }) for every legal move of seeded positions (the win chance after each move), winProb (depth 1)
// and the threads' rollTask: the largest difference JS − C, whether the best move is the same, and the time of each.
'use strict';
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..'), ePath = path.join(dir, 'engine.js');
const NP = +process.argv[2] || 40, D = +process.argv[3] || 2;
function load(wasm) {
  delete require.cache[require.resolve(ePath)];
  const E = require(ePath);
  if (wasm && !E.setWasm(new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(dir, wasm))), { env: { now: () => performance.now() } }).exports)) throw new Error('setWasm ' + wasm);
  return E;
}
const JS = load(null), C = load('engine_simd.wasm'), C2 = load('engine.wasm');
let all = { n: 0, best: 0, dmax: 0, same2: 0, tj: 0, tc: 0 };
for (const rule of ['finkel', 'blitz', 'masters']) {
  const rng = JS.mulberry32(20261111), pos = [];
  for (let g = 0; pos.length < NP && g < 400; g++) {
    let s = JS.newGame(rule, g & 1);
    for (let k = 0; k < 200 && s.winner < 0 && pos.length < NP; k++) {
      const n = JS.rollDice(rng, rule).n, ms = JS.legalMoves(s, n);
      if (ms.length >= 2 && k % 9 === 4) pos.push({ s, n });
      s = JS.apply(s, ms.length ? ms[Math.floor(rng() * ms.length)] : null).state;
    }
  }
  const r = { n: 0, best: 0, dmax: 0, same2: 0, tj: 0, tc: 0 };
  for (const q of pos) {
    let t0 = performance.now(); const a = JS.evaluate(q.s, q.n, { depth: D }); r.tj += performance.now() - t0;
    t0 = performance.now(); const b = C.evaluate(q.s, q.n, { depth: D }); r.tc += performance.now() - t0;
    const c = C2.evaluate(q.s, q.n, { depth: D });
    r.n++; if (a[0].move.from === b[0].move.from) r.best++;
    for (const x of a) { const y = b.find(z => z.move.from === x.move.from); r.dmax = Math.max(r.dmax, Math.abs(x.wp - y.wp)); }
    if (JSON.stringify(b.map(x => x.wp)) === JSON.stringify(c.map(x => x.wp))) r.same2++;
    r.dmax = Math.max(r.dmax, Math.abs(JS.winProb(q.s, { depth: 1 }) - C.winProb(q.s, { depth: 1 })));
    const sp = JS.splitEval(q.s, q.n, D, 0); if (sp.tasks.length) { const t = sp.tasks[0]; r.dmax = Math.max(r.dmax, Math.abs(JS.rollTask(t.state, t.n, t.d) - C.rollTask(t.state, t.n, t.d))); }
  }
  console.log(`${rule}: ${r.n} positions at depth ${D}: the same best move ${r.best}/${r.n}, max |JS - C| ${r.dmax.toExponential(2)}, simd = plain ${r.same2}/${r.n}; ms each: JS ${(r.tj / r.n).toFixed(2)}, C ${(r.tc / r.n).toFixed(2)} (x${(r.tj / r.tc).toFixed(1)})`);
  for (const k in all) all[k] = k === 'dmax' ? Math.max(all[k], r[k]) : all[k] + r[k];
}
console.log(`all: the same best move ${all.best}/${all.n}, max |JS - C| ${all.dmax.toExponential(2)}, JS ${(all.tj / all.n).toFixed(2)} ms vs C ${(all.tc / all.n).toFixed(2)} ms a position (x${(all.tj / all.tc).toFixed(1)})`);

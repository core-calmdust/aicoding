// The WebAssembly core against the JS (node tools/check_wasm.js): evaluate and the candidate lists on random positions,
// and a few searches — all must be identical. Also the speed of both.
'use strict';
const path = require('path'), { execFileSync } = require('child_process');
const E = require(path.join(__dirname, '..', 'engine.js'));
if (process.argv[2] === 'dump') {   // (a child with or without the core: prints the values as JSON)
  let s = 7; const r = () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const out = { ev: [], cand: [], think: [] };
  for (let g = 0; g < 40; g++) { let p = E.Pos.from(null); for (let i = 0; i < 70; i++) { const L = p.moves(); if (!L.length) break; p.play(L[Math.floor(r() * L.length)]); out.ev.push(E.evaluate(p)); if (i % 7 === 0) out.cand.push(E.candList(p, 10, i % 3, 10 + (i % 5)).map(c => c.m + ':' + c.s).join(',')); } }
  let mv = []; for (let i = 0; i < 6; i++) { const t = E.think(null, mv, 0, null, null, { s: 1, dx: 3, ms: 0 }); out.think.push(t.move + ':' + t.v); mv.push(t.move); }
  let t0 = Date.now(); const r2 = E.bestMove(E.replay(null, []).pos, 40, 2000, 0);
  out.speed = { depth: r2.depth, evals: E.evals, ms: Date.now() - t0, wasm: E.wasm };
  console.log(JSON.stringify(out)); process.exit(0);
}
const run = env => JSON.parse(execFileSync(process.execPath, [__filename, 'dump'], { env: Object.assign({}, process.env, env), maxBuffer: 1 << 26 }).toString());
const a = run({ AMZ_NOWASM: '1' }), b = run({});
const diff = k => a[k].filter((x, i) => x !== b[k][i]).length;
console.log('wasm loaded:', b.speed.wasm, '| evaluate', a.ev.length, 'diff', diff('ev'), '| cands', a.cand.length, 'diff', diff('cand'), '| think', a.think.length, 'diff', diff('think'));
console.log('2 s from the start — JS: depth', a.speed.depth, 'evals', a.speed.evals, '| wasm: depth', b.speed.depth, 'evals', b.speed.evals, `(×${(b.speed.evals / a.speed.evals).toFixed(2)})`);
if (diff('ev') || diff('cand') || diff('think') || !b.speed.wasm) process.exit(1);
// the MCTS (wasm only): the same visits and seed give the same tree (deterministic), with and without playouts
{
  const { pos } = E.replay(null, []), one = prm => JSON.stringify(E.mcts(pos, { sims: 400, seed: 3, prm }).list.slice(0, 8));
  const ok = one() === one() && one({ po: 4 }) === one({ po: 4 });
  console.log('mcts deterministic:', ok);
  if (!ok) process.exit(1);
}

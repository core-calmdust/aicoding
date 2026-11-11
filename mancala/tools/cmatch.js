// The C engine (engine.c) against the JavaScript search of engine.js, all 8 rules:
//   node tools/cmatch.js [positions per rule] [depth]      (from mancala/)
// 1. rootValues at the fixed depths of Lv.4–7 (2, 4, 6, 8): every root move's value and "exact" flag, and the node count.
// 2. think to a fixed depth (iterative deepening, the root PVS of rootBest): the move, value, depth, exact, node count.
// 3. the threads' node search (mtV) in a window, and the main line (pvLine).
// Both engines start from an empty table and get the same calls, so the node counts must match too. Then the speed (nodes/s).
'use strict';
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..'), ePath = path.join(dir, 'engine.js');
const NP = +process.argv[2] || 6, DEPTH = +process.argv[3] || 14;
function load(wasm) {
  delete require.cache[require.resolve(ePath)];
  const E = require(ePath);
  if (wasm) E.setWasm(new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(dir, wasm))), { env: { now: () => performance.now() } }).exports);
  E.ttFix(false);   // (the table as engine.js' JavaScript: the same search, node for node)
  return E;
}
const JS = load(null), C = load('engine_simd.wasm'), C2 = load('engine.wasm');
let seed = 20261111;
const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
const SEEDS = { easy: 3, basic: 4, kalah: 4, sunka: 4, oware: 4, mangala: 5, bohnen: 6, ayo: 4 };
let ok = 0, bad = 0;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const tot = { js: 0, c: 0, nj: 0, nc: 0 };
for (const rule of JS.RULE_IDS) {
  const pos = [];
  for (let g = 0; pos.length < NP && g < 200; g++) {
    let b = JS.initial(SEEDS[rule]), side = g & 1;
    const plies = 4 + Math.floor(rnd() * 24);
    for (let i = 0; i < plies; i++) {
      const L = JS.legal(b, side, rule); if (!L.length) break;
      const t = JS.trace(b, side, L[Math.floor(rnd() * L.length)], rule); b = t.board; if (t.over) { b = null; break; } side = t.next;
    }
    if (b && JS.legal(b, side, rule).length >= 2) pos.push({ b: Array.from(b), side });
  }
  let rOk = 0, rBad = 0;
  for (const E of [JS, C, C2]) E.ttClear();
  for (const q of pos) {
    // rootValues through chooseMove at the depth levels (noise 0: Lv.7 depth 8; PRO cfg depth without noise for 2, 4, 6)
    for (const d of [2, 4, 6, 8]) {
      const r = [JS, C, C2].map(E => { const t0 = performance.now(); const x = E.chooseMove(Int8Array.from(q.b), q.side, rule, 7, { kind: 'depth', depth: d, noise: 0 }); return { m: x.move, v: x.value, ex: x.exact, n: E.nodes, ms: performance.now() - t0 }; });
      const eq = same([r[0].m, r[0].v, r[0].ex, r[0].n], [r[1].m, r[1].v, r[1].ex, r[1].n]) && same([r[1].m, r[1].v, r[1].ex, r[1].n], [r[2].m, r[2].v, r[2].ex, r[2].n]);
      eq ? rOk++ : (rBad++, console.log('DIFF depth', rule, d, JSON.stringify(r)));
    }
    // think to a fixed depth
    const t = [JS, C, C2].map(E => { const t0 = performance.now(); const x = E.think(Int8Array.from(q.b), q.side, rule, { depth: DEPTH }); return { x, ms: performance.now() - t0 }; });
    const key = x => [x.move, x.value, x.depth, x.exact, x.nodes];
    if (same(key(t[0].x), key(t[1].x)) && same(key(t[1].x), key(t[2].x))) rOk++; else { rBad++; console.log('DIFF think', rule, JSON.stringify(t.map(y => key(y.x)))); }
    tot.js += t[0].ms; tot.c += t[1].ms; tot.nj += t[0].x.nodes; tot.nc += t[1].x.nodes;
    // the main line after each root move
    const pv = [JS, C, C2].map(E => { const b = Int8Array.from(q.b); E.analyze(b, q.side, rule, 1, 3); return E.legal(b, q.side, rule).map(k => E.pvLine(b, q.side, k, 8)); });
    if (same(pv[0], pv[1]) && same(pv[1], pv[2])) rOk++; else { rBad++; console.log('DIFF pv', rule); }
    // a node search in a window (mtV)
    const mv = [JS, C, C2].map(E => E.mtV({ b: q.b, side: q.side, rules: rule, line: [], d: 9, wa: -300, wb: 300 }));
    if (same(mv[0], mv[1]) && same(mv[1], mv[2])) rOk++; else { rBad++; console.log('DIFF mtV', rule, JSON.stringify(mv)); }
  }
  console.log(`${rule}: ${pos.length} positions, ${rOk} same / ${rBad} different`);
  ok += rOk; bad += rBad;
}
console.log(`all rules: ${ok} same, ${bad} different`);
console.log(`think depth ${DEPTH}: JS ${(tot.nj / tot.js / 1000).toFixed(2)}M nodes/s, C ${(tot.nc / tot.c / 1000).toFixed(2)}M nodes/s (x${(tot.js / tot.c).toFixed(1)} the same search)`);

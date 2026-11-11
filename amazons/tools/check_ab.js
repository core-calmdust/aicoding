// The alpha-beta search in core.c (ab_*, 2026-11-11) against engine.js's JS search (AMZ_JSSEARCH=1: the same search in JS with
// the core's evaluation): node for node the same — the move, value, depth, nodes and evaluations of every search below.
//   node tools/check_ab.js [quick]       (each build: core-wasm.js with SIMD, without SIMD (AMZ_NOSIMD=1), core_mt.wasm on one thread)
// The searches: the levels that count evaluations (Lv.9〜18) along the bench's games, a fixed depth (4, 5, 6) on the bench's 8
// positions and on random ones, the analysis's root values at depth 3 / 4, shared/mtsplit.js's tasks (mtv, mtkids). The tables
// carry over from search to search as in a worker (the same order in every run). Also the time of each run.
'use strict';
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const QUICK = process.argv.includes('quick');
if (process.argv[2] === 'dump') {
  const E = require(path.join(__dirname, '..', 'engine.js'));
  if (process.env.AMZ_MT1) {   // core_mt.wasm on one thread as the lead's core (engine.js ?mt=1: MX)
    const module = new WebAssembly.Module(fs.readFileSync(path.join(__dirname, '..', 'core_mt.wasm')));
    const mem = new WebAssembly.Memory({ initial: 1024, maximum: 16384, shared: true });
    const x = new WebAssembly.Instance(module, { env: { memory: mem, now: () => Date.now() } }).exports;
    const base = Math.ceil(x.mt_heap_base() / 65536) * 65536, SLOT = 2 << 20;
    if (base + 2 * SLOT > mem.buffer.byteLength) mem.grow(Math.ceil((base + 2 * SLOT - mem.buffer.byteLength) / 65536));
    x.mt_stack(base + SLOT - 16); x.mt_thread(base, 0);
    const C = { x: Object.assign({}, x, { memory: mem }), threads: 1, jobThreads: 1, maxNodes: 1 << 22 };
    C.views = () => { const buf = mem.buffer; Object.assign(C, { buf, sq: new Int8Array(buf, x.sqp(), 100), q: new Int8Array(buf, x.qp(), 8), rm: new Int32Array(buf, x.rmp(), 64), rn: new Int32Array(buf, x.rnp(), 64), rv: new Int32Array(buf, x.rvp(), 64), rp: new Int32Array(buf, x.rpp(), 64), pv: new Int32Array(buf, x.pvp(), 32), rlm: new Int32Array(buf, x.rlmp(), 64), rls: new Int32Array(buf, x.rlsp(), 64), aom: new Int32Array(buf, x.aomp(), 64), aov: new Int32Array(buf, x.aovp(), 64) }); };
    C.views(); E.useCore(C);
  }
  const quick = process.argv[3] === 'quick', out = [], t0 = Date.now();
  const note = (k, r) => out.push(k + ' ' + JSON.stringify(r) + ' n' + E.nodes + ' e' + E.evals);
  // the bench's positions: Lv.9 vs Lv.10, two games (fixed seed), every 10 plies — also the levels' moves on the way
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const P = [];
  for (let g = 0; g < 2; g++) {
    const moves = [];
    for (let i = 0; i < 40; i++) {
      const { pos } = E.replay(null, moves); if (E.judge(pos).over) break;
      const r = E.think(null, moves, 9 + g, rnd); note('lv' + (9 + g), [r.move, r.v, r.depth]);
      if (r.move == null || r.move < 0) break; moves.push(r.move);
      if (i % 10 === 9) P.push(moves.slice());
    }
  }
  // random positions (a fixed seed)
  let s2 = 11; const r2 = () => { s2 = (Math.imul(s2, 1103515245) + 12345) & 0x7fffffff; return s2 / 0x7fffffff; };
  for (let g = 0; g < (quick ? 2 : 6); g++) { let p = E.Pos.from(null); const mv = []; const L0 = 8 + g * 9; for (let i = 0; i < L0; i++) { const L = p.moves(); if (!L.length) break; const m = L[Math.floor(r2() * L.length)]; p.play(m); mv.push(m); } P.push(mv); }
  // every level that counts evaluations on a few positions
  for (const mv of P.slice(0, quick ? 2 : 8)) for (let lv = 9; lv <= (quick ? 13 : 18); lv++) { const r = E.think(null, mv, lv, rnd); note('L' + lv, [r.move, r.v, r.depth]); }
  // fixed depths
  for (const d of quick ? [4] : [4, 5, 6]) for (const mv of P) { const r = E.think(null, mv, 0, null, null, { s: 1, dx: d, nk: 1e7 }); note('d' + d, [r.move, r.v, r.depth]); }
  // the analysis's root values
  for (const d of quick ? [3] : [3, 4]) for (const mv of P.slice(0, quick ? 3 : 10)) note('va' + d, E.valuesAt(null, mv, d).map(e => e.m + ':' + e.v).join(','));
  // shared/mtsplit.js's tasks
  for (const mv of P.slice(0, quick ? 2 : 6)) {
    note('kids', E.mtKids({ start: null, moves: mv, line: [] }).kids.map(k => k.m).join(','));
    const k = E.mtKids({ start: null, moves: mv, line: [] }).kids;
    for (const x of k.slice(0, 3)) { const r = E.mtV({ start: null, moves: mv, line: [x.m], d: 3, wa: -200, wb: 200 }); note('mtv', [r.v, r.ok, r.nodes]); }
  }
  console.log(JSON.stringify({ out, ms: Date.now() - t0, core: E.wasm ? (E.simd ? 'wasm-simd' : 'wasm') : 'js' }));
  process.exit(0);
}
const run = env => JSON.parse(execFileSync(process.execPath, [__filename, 'dump', QUICK ? 'quick' : ''], { env: Object.assign({}, process.env, env), maxBuffer: 1 << 28 }).toString());
const ref = run({ AMZ_JSSEARCH: '1' });
console.log('JS search (core', ref.core + '):', ref.out.length, 'searches,', ref.ms, 'ms');
let bad = 0;
for (const [name, env] of [['core-wasm.js SIMD', {}], ['core-wasm.js without SIMD', { AMZ_NOSIMD: '1' }], ['core_mt.wasm, 1 thread', { AMZ_MT1: '1' }]]) {
  const r = run(env); let d = 0, first = -1;
  for (let i = 0; i < ref.out.length; i++) if (ref.out[i] !== r.out[i]) { d++; if (first < 0) first = i; }
  console.log(`${name} (${r.core}): ${r.out.length} searches, ${d} differ${first >= 0 ? ` (first #${first}: JS ${ref.out[first]} | C ${r.out[first]})` : ''}, ${r.ms} ms (JS ${ref.ms} ms, ×${(ref.ms / r.ms).toFixed(2)})`);
  bad += d + (r.out.length !== ref.out.length ? 1 : 0);
}
if (bad) process.exit(1);

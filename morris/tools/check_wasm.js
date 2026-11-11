// Check / speed of the WebAssembly engines (2026-11-11, MODEL_CARD.md「1スレッドの高速化」), from morris/:
//   node tools/check_wasm.js engine_simd.wasm | engine.wasm | "engine_mt.wasm mt" [depth 13] [check|speed]
// 12 bench.html positions + 6 late nine, 6 twelve, 6 six (seeded random games): best(depth) and root_values(depth − 6) of
// each; the md5 of all the moves, values, depths and node counts. Before the SIMD work (engine.c of #1634):
//   depth 13: engine.wasm / engine_simd.wasm 037f3504e6c220fd47ca093056b12046, engine_mt.wasm (1 thread) 2ca7cf15122d3f07b8de46f23394d074
'use strict';
const fs = require('fs'), crypto = require('crypto');
const W = require('path').resolve(__dirname, '..'), WASM = require('path').resolve(W, process.argv[2] || 'engine_simd.wasm'), MT = process.argv[3] === 'mt', DN = +(process.argv[4] || 13), MODE = process.argv[5] || 'check';
const E = require(W + '/engine.js');
const html = fs.readFileSync(W + '/bench.html', 'utf8');
const POS = JSON.parse(html.match(/const POS = (\[\[.*?\]\]);/)[1]);
function geoIO(variant) {
  const G = E.geom(variant), a = [G.n, G.pieces, G.fly ? 1 : 0, G.mills.length];
  for (const m of G.mills) a.push(...m);
  const inMills = (i, j) => G.mills.some(m => (m[0] === i && m[1] === j) || (m[1] === i && m[2] === j) || (m[0] === j && m[1] === i) || (m[1] === j && m[2] === i));
  const extra = []; for (let i = 0; i < G.n; i++) for (const j of G.adj[i]) if (j > i && !inMills(i, j)) extra.push(i, j);
  a.push(extra.length / 2, ...extra);
  return a;
}
// random positions of the other variants (seeded), plus some nine positions late in the game (flying)
function randGames(variant, count, minPly, maxPly, seed) {
  let s = seed >>> 0; const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s; };
  const out = [];
  while (out.length < count) {
    const { pos } = E.replay(variant, null, []); const mv = []; const L = minPly + r() % (maxPly - minPly + 1);
    let ok = true;
    for (let k = 0; k < L; k++) { if (pos.status() !== 0) { ok = false; break; } const ms = pos.moves(); if (!ms.length) { ok = false; break; } const m = ms[r() % ms.length]; pos.play(m); mv.push(m); }
    if (ok && pos.status() === 0) out.push(mv);
  }
  return out;
}
const SETS = [['nine', POS, DN], ['nine', randGames('nine', 6, 40, 90, 7), DN - 2], ['twelve', randGames('twelve', 6, 6, 40, 11), DN - 3], ['six', randGames('six', 6, 4, 30, 13), DN]];
let X, mem;
const imp = m => ({ env: Object.assign(m ? { memory: m } : {}, { now: () => Date.now(), progress: () => {} }) });
const mod = new WebAssembly.Module(fs.readFileSync(WASM));
if (MT) {
  mem = new WebAssembly.Memory({ initial: 1152, maximum: 16384, shared: true });
  X = new WebAssembly.Instance(mod, imp(mem)).exports;
  const SLOT = 4 << 20, base = Math.ceil(X.mt_heap_base() / 65536) * 65536, need = base + 3 * SLOT;
  if (mem.buffer.byteLength < need) mem.grow(Math.ceil((need - mem.buffer.byteLength) / 65536));
  X.mt_stack(base + SLOT - 16); X.mt_thread(base, 0);
} else { X = new WebAssembly.Instance(mod, imp(null)).exports; mem = X.memory; }
const io = () => new Int32Array(mem.buffer, X.io_ptr(), 8192);
const b = fs.readFileSync(W + '/evalnet.bin'), dv = new DataView(b.buffer, b.byteOffset);
const H = dv.getUint32(4, true), f = new Float32Array(b.buffer.slice(b.byteOffset + 8, b.byteOffset + 8 + 4 * (71 * H + 2 * H + 1)));
new Float32Array(mem.buffer, X.net_ptr(), f.length).set(f); X.net_on(H);
const hash = crypto.createHash('md5'); const lines = []; let totN = 0, totMs = 0;
for (const [variant, list, D] of SETS) {
  io().set(geoIO(variant)); X.set_geometry();
  for (let i = 0; i < list.length; i++) {
    X.new_game(); io().set(E.setupIO(variant, null, list[i])); const n = X.setup();
    const t0 = process.hrtime.bigint();
    X.best(D, 0, 0);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    const r = io(), nodes = X.last_nodes ? X.last_nodes() : 0;
    let line = `${variant} ${i} n${n} best ${r[0]} v${r[1]} d${r[2]} nodes ${nodes}`;
    totN += nodes; totMs += ms;
    if (MODE === 'check') {
      X.new_game(); io().set(E.setupIO(variant, null, list[i])); X.setup(); X.set_limit(0, 0);
      if (X.root_values(Math.max(1, D - 6))) { const q = io(); const a = []; for (let k = 0; k < q[0]; k++) a.push(q[1 + 2 * k] + ':' + q[2 + 2 * k]); line += ' rv ' + a.join(','); line += ' rvn ' + (X.last_nodes ? X.last_nodes() : 0); }
    }
    lines.push(line); hash.update(line + '\n');
    if (process.env.V) console.log(line, ms.toFixed(0) + 'ms');
  }
}
console.log(`${WASM.split('/').pop()}${MT ? ' (mt 1 thread)' : ''}: md5 ${hash.digest('hex')}  nodes ${totN}  ${totMs.toFixed(0)} ms  ${(totN / totMs).toFixed(0)} knps`);
if (process.env.OUT) fs.writeFileSync(process.env.OUT, lines.join('\n') + '\n');

// Check / speed of the WebAssembly engines (2026-11-11, MODEL_CARD.md「1スレッドの高速化」), from xiangqi/:
//   node tools/check_wasm.js . engine_simd.wasm x 12 | node tools/check_wasm.js . engine_mt.wasm mt 11 | NN=0 … (linear evaluation)
// the 12 bench.html positions, best(depth): the md5 of the moves, values, depths and node counts (engine.wasm: thousands)
'use strict';
const fs = require('fs'), crypto = require('crypto'), zlib = require('zlib');
const W = process.argv[2], WASM = process.argv[3], MT = process.argv[4] === 'mt', D = +(process.argv[5] || 10), NN = process.env.NN !== '0';
const E = require(W + '/engine.js');
const POS = (() => {
  let rs = 20261109; const rnd = n => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs % n; };
  const out = [];
  while (out.length < 12) {
    const p = E.Pos.from(null), moves = [], len = 10 + rnd(30); let ok = true;
    for (let i = 0; i < len; i++) { const L = p.moves(); if (!L.length) { ok = false; break; } const m = L[rnd(L.length)]; p.play(m); moves.push(m); }
    if (ok && p.moves().length > 1) out.push(moves);
  }
  return out;
})();
const mod = new WebAssembly.Module(fs.readFileSync(WASM));
let X, mem;
const env = m => ({ env: Object.assign(m ? { memory: m } : {}, { now: () => Date.now(), progress: () => {} }) });
if (MT) {
  mem = new WebAssembly.Memory({ initial: 1152, maximum: 16384, shared: true });
  X = new WebAssembly.Instance(mod, env(mem)).exports;
  const SLOT = +(process.env.SLOT || (2 << 20)), base = Math.ceil(X.mt_heap_base() / 65536) * 65536, need = base + 3 * SLOT;
  if (mem.buffer.byteLength < need) mem.grow(Math.ceil((need - mem.buffer.byteLength) / 65536));
  X.mt_stack(base + SLOT - 16); X.mt_thread(base, 0);
} else { X = new WebAssembly.Instance(mod, env(null)).exports; mem = X.memory; }
if (NN && X.xq_nnue) {
  const buf = zlib.gunzipSync(fs.readFileSync(W + '/nnue.bin.gz')); const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength), H = dv.getInt32(4, true);
  if (H === (X.xq_h ? X.xq_h() : 256)) {
    const IN = 1260, b = buf.buffer; let o = buf.byteOffset + 12;
    new Int16Array(mem.buffer, X.xq_w1_ptr(), IN * H).set(new Int16Array(b.slice(o, o + IN * H * 2))); o += IN * H * 2;
    new Int32Array(mem.buffer, X.xq_b1_ptr(), H).set(new Int32Array(b.slice(o, o + H * 4))); o += H * 4;
    new Int16Array(mem.buffer, X.xq_w2_ptr(), 2 * H).set(new Int16Array(b.slice(o, o + H * 4))); o += H * 4;
    X.xq_set_b2(dv.getInt32(o - buf.byteOffset, true)); X.xq_nnue(1);
  } else console.log('net H mismatch', H);
}
const io = () => new Int32Array(mem.buffer, X.io_ptr(), 8192);
const h = crypto.createHash('md5'); let tn = 0, tms = 0;
for (let i = 0; i < POS.length; i++) {
  X.new_game(); io().set(E.setupIO(null, POS[i], [])); X.setup();
  const t0 = process.hrtime.bigint(); X.best(D, 0, 0); const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const r = io(), n = X.last_nodes ? X.last_nodes() : r[3] * 1000;
  const line = `${i} ${r[0]} ${r[1]} d${r[2]} n${n} k${r[3]}`; h.update(line + '\n'); tn += n; tms += ms;
  if (process.env.V) console.log(line, ms.toFixed(0) + 'ms');
}
console.log(`${WASM.split('/').pop()}${MT ? ' mt1' : ''} d${D}: md5 ${h.digest('hex')} nodes ${tn} ${tms.toFixed(0)} ms ${(tn / tms).toFixed(0)} knps`);

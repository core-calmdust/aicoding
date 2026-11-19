// The Alquerque learned evaluation in the site's WebAssembly builds (fanorona/engine.wasm, engine_simd.wasm, engine_mt.wasm)
// against the native tools (aq check / aq probe): the same values on the same positions.
//   node wasmcheck.js <net.bin> <data.bin> [n] [nodesK] [aqv]
// Prints, for every build: the checksum of the net's value on the first n quiet records (aq check <net> <data> n prints the same),
// and the move / value / depth of a search of nodesK thousand positions on the first 20 of them, each from an empty table
// (aq probe with TT_BITS=20 prints the same for engine.wasm / engine_simd.wasm; engine_mt.wasm has its own table). The multi-thread
// build then searches with a helper thread (worker_threads, mt_idle: Young Brothers Wait) to see that it runs with the net.
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const { Worker, isMainThread, workerData, parentPort } = require('worker_threads');
const FA = path.join(__dirname, '..', '..', '..', 'fanorona');
const env = { now: () => Date.now(), progress: () => {} };
function loadAEG(X, buf, base) {   // alqeg.bin above base; returns the end
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength), n = dv.getUint32(4, true), cur = X.memory.buffer.byteLength;
  if (base + buf.length + 65536 > cur) X.memory.grow(Math.ceil((base + buf.length + 65536 - cur) / 65536));
  new Uint8Array(X.memory.buffer, base, buf.length).set(buf);
  let o = 8; for (let i = 0; i < n; i++) { const a = dv.getUint8(o), b = dv.getUint8(o + 1), len = dv.getUint32(o + 4, true); X.aeg_add(a, b, base + o + 8); o += 8 + len; }
  return base + buf.length + 16;
}
function loadNet(X, net) { new Uint8Array(X.memory.buffer, X.aqn_buf(), net.length).set(net); return X.aqn_load(net.length); }
function recs(data, n) {   // the first n quiet records (aq.c Rec, 24 bytes)
  const out = [], dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  for (let o = 0; o + 24 <= data.length && out.length < n; o += 24) {
    if (!(data[o + 22] & 2)) continue;
    out.push({ w0: dv.getInt32(o, true), w1: dv.getInt32(o + 4, true), b0: dv.getInt32(o + 8, true), b1: dv.getInt32(o + 12, true), side: data[o + 21] });
  }
  return out;
}
function run(X, R, nk, aqv, label) {
  const io = () => new Int32Array(X.memory.buffer, X.io_ptr(), 8192);
  X.set_rule(5, 5); X.set_alq(1); X.set_aqv(aqv);
  let sum = 0n, sa = 0;
  for (const r of R) {
    io().set([r.w0, r.w1, r.b0, r.b1, r.side, 0]); X.setup();
    const v = X.eval_root(); sum = (sum * 1000003n + BigInt(v >>> 0)) & 0xFFFFFFFFFFFFFFFFn; sa += Math.abs(v);
  }
  console.log(`${label}: check ${R.length} positions  checksum ${sum.toString(16).padStart(16, '0')}  mean |value| ${(sa / R.length).toFixed(1)}`);
  const lines = [];
  for (let i = 0; i < Math.min(20, R.length); i++) {
    const r = R[i]; X.new_game(); io().set([r.w0, r.w1, r.b0, r.b1, r.side, 0]); X.setup(); X.best(99, 0, nk);
    const o = io(); lines.push(`${i} ${o[0]} ${o[1]} ${o[2]} ${o[3]}`);
  }
  return lines;
}
if (isMainThread) {
  const [netF, dataF] = process.argv.slice(2); const n = +(process.argv[4] || 100000), nk = +(process.argv[5] || 20), aqv = +(process.argv[6] || 27);
  if (!netF || !dataF) { console.error('node wasmcheck.js <net.bin> <data.bin> [n] [nodesK] [aqv]'); process.exit(2); }
  const net = fs.readFileSync(netF), R = recs(fs.readFileSync(dataF), n), aeg = zlib.gunzipSync(fs.readFileSync(path.join(FA, 'alqeg.bin.gz')));
  const outs = {};
  for (const f of ['engine.wasm', 'engine_simd.wasm']) {
    const X = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(FA, f))), { env }).exports;
    loadAEG(X, aeg, X.heap_base());
    if (loadNet(X, net) !== 1) { console.log(f + ': net not loaded'); process.exit(1); }
    outs[f] = run(X, R, nk, aqv, f);
  }
  // engine_mt.wasm: the page's layout (shared/mtengine.js): slots of 4 MB above the heap base, the tables above the slots
  const mod = new WebAssembly.Module(fs.readFileSync(path.join(FA, 'engine_mt.wasm')));
  const mem = new WebAssembly.Memory({ initial: 1024, maximum: 16384, shared: true });
  const X0 = new WebAssembly.Instance(mod, { env: Object.assign({ memory: mem }, env) }).exports, X = Object.assign({}, X0, { memory: mem });
  const SLOT = 4 << 20, base = Math.ceil(X.mt_heap_base() / 65536) * 65536, NT = 2, need = base + (NT + 1) * SLOT;
  if (need > mem.buffer.byteLength) mem.grow(Math.ceil((need - mem.buffer.byteLength) / 65536));
  X.mt_stack(base + SLOT - 16); X.mt_thread(base, 0);
  loadAEG(X, aeg, Math.ceil(mem.buffer.byteLength / 65536) * 65536);
  if (loadNet(X, net) !== 1) { console.log('engine_mt.wasm: net not loaded'); process.exit(1); }
  outs['engine_mt.wasm'] = run(X, R, nk, aqv, 'engine_mt.wasm (1 thread)');
  const same = outs['engine.wasm'].join('\n') === outs['engine_simd.wasm'].join('\n');
  console.log(`search ${nk}k positions, 20 positions: engine.wasm = engine_simd.wasm: ${same ? 'yes' : 'NO'}`);
  fs.writeFileSync('wasmcheck-probe.txt', outs['engine.wasm'].join('\n') + '\n');
  const sameMt = outs['engine_mt.wasm'].filter((l, i) => l.split(' ').slice(1, 3).join() === outs['engine.wasm'][i].split(' ').slice(1, 3).join()).length;
  console.log(`engine_mt.wasm (its own table): the same move in ${sameMt} / ${outs['engine.wasm'].length}`);
  // two threads: a helper on mt_idle while the main thread searches by time
  const ctl = new Int32Array(new SharedArrayBuffer(64));
  const w = new Worker(__filename, { workerData: { mod, mem, tls: base + SLOT, top: base + 2 * SLOT - 16, ctl } });
  w.on('message', () => {
    const io = () => new Int32Array(mem.buffer, X.io_ptr(), 8192);
    let okN = 0, nodes = 0;
    for (let i = 0; i < 8; i++) {
      const r = R[i]; X.mt_stop(0); io().set([r.w0, r.w1, r.b0, r.b1, r.side, 0]); X.setup(); X.best(99, 300, 0);
      const o = io(); if (o[0] >= 0 && o[3] > 0) okN++; nodes += o[4];
    }
    X.mt_stop(1); Atomics.store(ctl, 0, 1);
    console.log(`engine_mt.wasm 2 threads (0.3 s × 8 positions): ${okN} / 8 searched with a move, main ${nodes}k positions`);
    w.on('exit', () => process.exit(0));
  });
} else {
  const { mod, mem, tls, top, ctl } = workerData;
  const X = new WebAssembly.Instance(mod, { env: Object.assign({ memory: mem }, env) }).exports;
  X.mt_stack(top); X.mt_thread(tls, 1);
  parentPort.postMessage('ready');
  let n = 0; while (!Atomics.load(ctl, 0)) n += X.mt_idle(100, 1);
  process.exit(0);
}

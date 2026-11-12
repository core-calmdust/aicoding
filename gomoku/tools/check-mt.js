// core_mt.wasm with real threads in Node (worker_threads, 2026-11-12): the lead (this thread) searches through engine.js, the
// helpers wait in mt_idle (Praline's Young Brothers Wait). For each thread count: the time (CPU-bound: only as good as the
// machine's free cores) to the same depth for a fixed set of positions, the move / value against one thread.
// node tools/check-mt.js [threads=1,2] [depth=7] [analysis depth=5]
'use strict';
const { Worker, isMainThread, workerData, parentPort } = require('worker_threads');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
if (!isMainThread) {   // a helper
  const { module, mem, tls, top, id, ctl } = workerData;
  const x = new WebAssembly.Instance(module, { env: { memory: mem, now: () => performance.now(), progress() {} } }).exports;
  x.mt_stack(top); x.mt_thread(tls, id);
  parentPort.on('message', m => {
    if (m === 'quit') process.exit(0);
    let nodes = 0;
    for (let f = 1; !Atomics.load(ctl, 0); f = 0) nodes += x.mt_idle(250, f);
    parentPort.postMessage(nodes);
  });
  parentPort.postMessage('ready');
  return;
}
const dir = path.join(__dirname, '..');
const E = require('../engine.js');
const ab = b => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
E.loadWeightsBuffer('std', ab(fs.readFileSync(path.join(dir, 'eval_std.bin'))));
E.setNN('renju', ab(fs.readFileSync(path.join(dir, 'nn48.wasm'))), ab(zlib.gunzipSync(fs.readFileSync(path.join(dir, 'nn_renju.bin.gz')))));
E.setNN('std', ab(fs.readFileSync(path.join(dir, 'nn.wasm'))), ab(zlib.gunzipSync(fs.readFileSync(path.join(dir, 'nn_std.bin.gz')))));
const TH = (process.argv[2] || '1,2').split(',').map(Number), DEPTH = +(process.argv[3] || 7), AD = +(process.argv[4] || 5);
const POS = [[112,127,142,129,96,126,128],[112,127,143,129,130,113,125,141,155],[112,127,144,96,81,158,143,156,113,98,145],[112,127,128,98,145,144,130,96,99,115,159,111,113],[112,127,129,158,125,143,111,113],[112,127,113,98,114,111,129,144,99,115],[112,127,114,111,125,110,145,96,130,141,126,143],[112,127,97,129,159,111,141,96,125,84,114,158,83,146],[112,127,98,96,81,140,125],[112,127,99,98,144,111,145,131,116]];
const RULE = i => i % 2 ? 'standard' : 'renju';
(async () => {
  const module = new WebAssembly.Module(fs.readFileSync(path.join(dir, 'core_mt.wasm')));
  const HM = Math.max(...TH) - 1, SLOT = 2 << 20;
  const mem = new WebAssembly.Memory({ initial: 384, maximum: 16384, shared: true });
  const imp = E.coreImports(mem);
  const X = new WebAssembly.Instance(module, imp).exports;   // (the page's own instance)
  const base = Math.ceil(X.mt_heap_base() / 65536) * 65536, need = base + (HM + 2) * SLOT;
  if (need > mem.buffer.byteLength) mem.grow(Math.ceil((need - mem.buffer.byteLength) / 65536));
  X.mt_stack(base + (HM + 1) * SLOT + SLOT - 16); X.mt_thread(base + (HM + 1) * SLOT, 999);
  const L = new WebAssembly.Instance(module, imp).exports;
  L.mt_stack(base + SLOT - 16); if (!L.mt_thread(base, 0)) throw new Error('mt_thread');
  E.coreUse(L, mem, 'wasm-mt'); E.coreWeights();
  const ctl = new Int32Array(new SharedArrayBuffer(64));
  const hw = [];
  for (let i = 1; i <= HM; i++) {
    const w = new Worker(__filename, { workerData: { module, mem, tls: base + i * SLOT, top: base + i * SLOT + SLOT - 16, id: i, ctl } });
    await new Promise(r => w.once('message', r)); hw.push(w);
  }
  const C = E.engX();
  const run = async (n, fn) => {   // fn with n - 1 helpers waiting
    Atomics.store(ctl, 0, 0); X.mt_stop(0);
    const done = hw.slice(0, n - 1).map(w => new Promise(r => { w.once('message', r); w.postMessage('go'); }));
    await new Promise(r => setTimeout(r, 30));   // (the helpers are in mt_idle)
    const t0 = performance.now(), r = fn(), ms = performance.now() - t0;
    Atomics.store(ctl, 0, 1); X.mt_stop(1);
    const hn = (await Promise.all(done)).reduce((a, b) => a + b, 0);
    return { r, ms, hn };
  };
  const base1 = {};
  for (const n of TH) {
    let tb = 0, ta = 0, same = 0, sameA = 0, nodes = 0;
    for (let k = 0; k < POS.length; k++) {
      C.clear();
      const pos = E.replay(RULE(k), POS[k]);
      const b = await run(n, () => C.best(pos, { ms: 600000, depth: DEPTH, threats: false })); tb += b.ms; nodes += C.nodes + b.hn;
      C.clear();
      const a = await run(n, () => E.analyze(RULE(k), POS[k], 600000, null, null, AD)); ta += a.ms;
      const top = a.r.list.slice().sort((p, q) => q.v - p.v)[0];
      if (n === TH[0]) base1[k] = { b: b.r, a: top };
      if (base1[k].b.i === b.r.i) same++;
      if (base1[k].a.m === top.m) sameA++;
    }
    console.log(`${n} threads: best depth ${DEPTH} ${Math.round(tb)} ms (×${(base1.tb / tb || 1).toFixed(2)}), same move ${same}/${POS.length}; analysis depth ${AD} ${Math.round(ta)} ms (×${(base1.ta / ta || 1).toFixed(2)}), same top ${sameA}/${POS.length}; nodes ${Math.round(nodes / tb)}k/s`);
    if (n === TH[0]) { base1.tb = tb; base1.ta = ta; }
  }
  hw.forEach(w => w.postMessage('quit'));
})();

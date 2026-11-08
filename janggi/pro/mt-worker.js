// One search thread of the strongest analysis (engine_mt.wasm, Lazy SMP). Thread 0 runs the timed search and reports;
// the others help until it is over (they share its transposition table through the shared memory).
let X = null, id = 0, mem = null;
const io = () => new Int32Array(mem.buffer, X.io_ptr(), 8192);
self.onmessage = e => {
  const m = e.data;
  if (m.type === 'init') {
    mem = m.mem; id = m.id;
    const progress = d => { if (id !== 0) return; const r = io(); self.postMessage({ type: 'progress', depth: r[2], move: r[0], score: r[1], nodes: r[3] * 1000 }); };
    X = new WebAssembly.Instance(m.module, { env: { memory: mem, now: () => Date.now(), progress } }).exports;
    X.mt_stack(m.top); X.mt_thread(m.tls, id);
    self.postMessage({ type: 'ready' });
    return;
  }
  if (m.type === 'go') {
    io().set(m.setup); const ok = X.setup();
    const t0 = Date.now();
    if (ok) { if (id === 0) X.best(99, m.time, 0); else X.best(99, 0, 0); }
    if (id === 0) X.mt_stop(1);
    const r = io(), move = ok ? r[0] : -1, score = r[1], depth = r[2], nodes = r[3] * 1000, pv = [];
    if (id === 0 && move >= 0) { const n = X.pv_line(move, 16), q = io(); for (let j = 0; j < n; j++) pv.push(q[1 + j]); }
    self.postMessage({ type: 'done', id, move, score, depth, nodes, pv, ms: Date.now() - t0 });
  }
};

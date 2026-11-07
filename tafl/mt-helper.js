// A helper thread of the main page's multi-thread search (shared/mtengine.js): engine_mt.wasm on the shared memory (the
// Copenhagen net is already there, loaded by the lead). While the lead (engine.js?…&mt=1) works on a job, this searches the
// same root position again and again (best(99, 0, 0) as in pro/mt-worker.js; Lazy SMP: one transposition table) until the
// page stops every thread (ctl[0] = 1 and mt_stop).
let X = null, mem = null, ctl = null, cnt = null, id = 0, acc = 0;
self.onmessage = e => {
  const m = e.data;
  if (m.type === 'mtinit') {
    try {
      mem = m.mem; ctl = m.ctl; cnt = m.cnt; id = m.id;
      X = new WebAssembly.Instance(m.module, { env: { memory: mem, now: () => Date.now(), progress: () => { cnt[id] = acc + X.last_nodes(); } } }).exports;   // (running count for the page's readout)
      X.mt_stack(m.top); X.mt_thread(m.tls, m.id);
      self.postMessage({ type: 'mtready' });
    } catch (err) { self.postMessage({ type: 'mtready', error: String(err && err.message || err) }); }
    return;
  }
  if (m.type === 'help') {
    let nodes = 0; acc = 0;
    try {
      new Int32Array(mem.buffer, X.io_ptr(), 8192).set(m.setup);
      if (X.setup()) for (let k = 0; k < 200 && !Atomics.load(ctl, 0); k++) { X.best(99, 0, 0); nodes += X.last_nodes(); acc = nodes; cnt[id] = nodes; }
    } catch (err) { console.warn(err); }
    self.postMessage({ type: 'done', job: m.job, nodes });
  }
};

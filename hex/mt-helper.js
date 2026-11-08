// A helper thread of the main page's multi-thread search (shared/mtengine.js): engine_mt.wasm on the shared memory. While
// the lead (engine.js?…&mt=1) works on a job, this joins every search tree the lead opens (engine.c mt_help: tree-parallel
// MCTS on ONE shared tree with virtual loss) until the page stops every thread (mt_stop). The lead's result counts the
// helpers' playouts already (nodes: 0 here).
let X = null, mem = null, ctl = null, cnt = null, id = 0;
self.onmessage = e => {
  const m = e.data;
  if (m.type === 'mtinit') {
    try {
      mem = m.mem; ctl = m.ctl; cnt = m.cnt; id = m.id;
      X = new WebAssembly.Instance(m.module, { env: { memory: mem, now: () => Date.now(), progress: () => {} } }).exports;
      X.mt_stack(m.top); X.mt_thread(m.tls, m.id);
      self.postMessage({ type: 'mtready' });
    } catch (err) { self.postMessage({ type: 'mtready', error: String(err && err.message || err) }); }
    return;
  }
  if (m.type === 'help') {
    try { if (!Atomics.load(ctl, 0)) X.mt_help(); } catch (err) { console.warn(err); }
    self.postMessage({ type: 'done', job: m.job, nodes: 0 });
  }
};

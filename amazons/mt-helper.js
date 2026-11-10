// A helper thread of the MCTS on several threads (shared/mtengine.js): core_mt.wasm on the shared memory. While the lead
// (engine.js?…&mt=1) works on a job, this joins every search tree the lead opens (core.c mt_help: tree-parallel MCTS on ONE
// shared tree with virtual loss) until the page stops every thread (mt_stop). The lead's result counts the helpers' visits.
let X = null;
self.onmessage = e => {
  const m = e.data;
  if (m.type === 'mtinit') {
    try {
      X = new WebAssembly.Instance(m.module, { env: { memory: m.mem, now: () => Date.now() } }).exports;
      X.mt_stack(m.top); X.mt_thread(m.tls, m.id);
      self.postMessage({ type: 'mtready' });
    } catch (err) { self.postMessage({ type: 'mtready', error: String(err && err.message || err) }); }
    return;
  }
  if (m.type === 'help') {
    try { X.mt_help(); } catch (err) { console.warn(err); }
    self.postMessage({ type: 'done', job: m.job, nodes: 0 });
  }
};

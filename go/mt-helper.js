// A helper thread of the main page's multi-thread search (shared/mtengine.js): engine_mt.wasm on the shared memory. While
// the lead (engine.js?…&mt=1) works on a job, this joins every search tree the lead opens (engine.c mt_help: tree-parallel
// MCTS on ONE shared tree with virtual loss, the nets in the shared memory) until the lead closes it or the page stops every
// thread (mt_stop). The lead's result counts the helpers' visits already (nodes: 0 here).
let X = null, ctl = null, top = 0;
self.onmessage = e => {
  const m = e.data;
  if (m.type === 'mtinit') {
    try {
      ctl = m.ctl; top = m.top;
      X = new WebAssembly.Instance(m.module, { env: { memory: m.mem } }).exports;
      X.mt_stack(m.top); X.mt_thread(m.tls, m.id);
      self.postMessage({ type: 'mtready' });
    } catch (err) { self.postMessage({ type: 'mtready', error: String(err && err.message || err) }); }
    return;
  }
  if (m.type === 'help') {
    try { if (!Atomics.load(ctl, 0)) X.mt_help(); }
    catch (err) { console.warn(err); try { X.mt_stack(top); X.mt_trapped(); } catch (e2) {} }   // (a trap: leave the tree, this thread's stack back to its top)
    self.postMessage({ type: 'done', job: m.job, nodes: 0 });
  }
};

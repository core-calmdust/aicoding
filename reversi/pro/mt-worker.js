// One search thread of the strongest analysis: engine.js (the root search) on an engine_mt.wasm instance that shares the
// memory (weights, transposition tables) with the other threads. Thread 0's search is the timed one; the helpers search
// the same position until it is over (Lazy SMP). engine.js's own worker API (weights / think messages) does the rest.
self.addEventListener('message', function boot(e) {
  const m = e.data; if (m.type !== 'mtinit') return;
  self.removeEventListener('message', boot);
  const X = new WebAssembly.Instance(m.module, { env: { memory: m.mem, now: () => Date.now() } }).exports;
  X.mt_stack(m.top); X.mt_thread(m.tls);
  self.REVERSI_WX = Object.assign({}, X, { memory: m.mem });   // engine.js reads WX.memory
  if (m.ctl) self.REVERSI_SPLIT = m.ctl;   // (the endgame solve is split at the root over the threads: engine.js rootSplit)
  importScripts('../engine.js?v=64');
  self.postMessage({ type: 'mtready' });
});

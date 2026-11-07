// One thread of the main page's multi-thread search (shared/mtengine.js): engine.js (the root search) on an engine_mt.wasm
// instance that shares the memory (weights, transposition table) with the other threads. Thread 0 is the lead: it gets
// the page's jobs (think / analyze, engine.js's own worker API). The helpers (id 1, 2, …) search the same position
// meanwhile, each starting from another root move (opts.rot, Lazy SMP diversity), until the page stops every thread.
self.addEventListener('message', function boot(e) {
  const m = e.data; if (m.type !== 'mtinit') return;
  self.removeEventListener('message', boot);
  try {
    const X = new WebAssembly.Instance(m.module, { env: { memory: m.mem, now: () => Date.now() } }).exports;
    X.mt_stack(m.top); X.mt_thread(m.tls);
    self.REVERSI_WX = Object.assign({}, X, { memory: m.mem });   // engine.js reads WX.memory
    importScripts('engine.js?v=53');
  } catch (err) { self.postMessage({ type: 'mtready', error: String(err && err.message || err) }); return; }
  const id = m.id, ctl = m.ctl, cnt = m.cnt, R = self.ReversiEngine;
  if (id > 0) {
    const own = self.onmessage;
    self.onmessage = ev => {
      const h = ev.data;
      if (!h || h.type !== 'help') { own(ev); return; }
      let nodes = 0;
      try {
        for (let k = 0; k < 50 && !Atomics.load(ctl, 0); k++) {
          const r = R.think(h.cells, h.toMove, { cfg: h.cfg, time: 1e9, noBook: true, variety: false, rot: id }, p => { cnt[id] = nodes + (p.nodes || 0); });
          nodes += r.nodes || 0; cnt[id] = nodes;
        }
      } catch (err) { console.warn(err); }
      self.postMessage({ type: 'done', job: h.job, nodes });
    };
  }
  self.postMessage({ type: 'mtready' });
});

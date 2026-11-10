// One thread of the main page's multi-thread search (shared/mtengine.js): engine.js (the root search) on an engine_mt.wasm
// instance that shares the memory (weights, transposition table) with the other threads. Thread 0 is the lead: it gets
// the page's jobs (think / analyze, engine.js's own worker API). The helpers (id 1, 2, …) search the same position
// meanwhile (opts.rot = id: engine.js helperPlan — odd ids another first root move, even ids other replies one ply
// below; a deeper finished depth is shared with the lead, 2026-11-09), until the page stops every thread.
// In the exact / win-draw-loss solve of think the root moves are shared out instead (engine.js rootSplit / splitHelp).
// (2026-11-10, engine.js LAZY.plan 'ybw', the default: a helper's think waits in engine.c mt_idle and takes the remaining
// moves at the lead's split points instead — Young Brothers Wait, MODEL_CARD.md「マルチスレッド v4」.)
self.addEventListener('message', function boot(e) {
  const m = e.data; if (m.type !== 'mtinit') return;
  self.removeEventListener('message', boot);
  try {
    const X = new WebAssembly.Instance(m.module, { env: { memory: m.mem, now: () => Date.now() } }).exports;
    X.mt_stack(m.top); X.mt_thread(m.tls);
    self.REVERSI_WX = Object.assign({}, X, { memory: m.mem });   // engine.js reads WX.memory
    self.REVERSI_SPLIT = m.ctl;   // (the endgame solve is split at the root over the threads: engine.js rootSplit)
    importScripts('engine.js?v=58');
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

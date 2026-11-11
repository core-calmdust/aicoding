// A helper thread of the main page's multi-thread search (shared/mtengine.js): engine_mt.wasm on the shared memory (the
// Copenhagen net is already there, loaded by the lead). While the lead (engine.js?…&mt=1) works on a job, this takes moves
// at the split points the lead's search opens (engine.c mt_idle, Young Brothers Wait, 2026-11-11; MODEL_CARD.md「マルチ
// スレッドの見直し その2：YBW」; setup() first: the rules and the evaluation of the job) until the page stops every thread
// (ctl[0] = 1 and mt_stop). (An engine_mt.wasm without mt_idle: the old Lazy SMP, best(99, 0, 0) again and again.)
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
      if (X.setup() && X.mt_idle) {   // (back every 250 ms while it has nothing to do: its nodes for the page's nps readout)
        for (let f = 1; !Atomics.load(ctl, 0); f = 0) { nodes += X.mt_idle(250, f); acc = nodes; cnt[id] = nodes; }
      } else if (X.setup()) for (let k = 0; k < 200 && !Atomics.load(ctl, 0); k++) { X.best(99, 0, 0); nodes += X.last_nodes(); acc = nodes; cnt[id] = nodes; }
    } catch (err) { console.warn(err); }
    self.postMessage({ type: 'done', job: m.job, nodes });
  }
};

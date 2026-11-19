// A helper thread of the main page's multi-thread search (shared/mtengine.js, 2026-11-11): core_mt.wasm on the shared memory.
// While the lead (engine.js?…&mt=1) works on a job, this takes moves at the split points of its search (core.c mt_idle: Praline's
// Young Brothers Wait, shared/praline/) until the page stops every thread (ctl[0] = 1 and mt_stop); its nodes go to the page's
// nps readout.
let X = null, ctl = null, cnt = null, id = 0;
self.onmessage = e => {
  const m = e.data;
  if (m.type === 'mtinit') {
    try {
      ctl = m.ctl; cnt = m.cnt; id = m.id;
      X = new WebAssembly.Instance(m.module, { env: { memory: m.mem, now: () => Date.now() } }).exports;
      X.mt_stack(m.top); X.mt_thread(m.tls, m.id);
      self.postMessage({ type: 'mtready' });
    } catch (err) { self.postMessage({ type: 'mtready', error: String(err && err.message || err) }); }
    return;
  }
  if (m.type === 'help') {
    let nodes = 0;
    try { for (let f = 1; !Atomics.load(ctl, 0); f = 0) { nodes += X.mt_idle(250, f); cnt[id] = nodes; } } catch (err) { console.warn(err); }
    self.postMessage({ type: 'done', job: m.job, nodes });
  }
};

// A helper thread of the main page's multi-thread search (shared/mtengine.js, 2026-11-12): core_mt.wasm (core.c) on the shared
// memory. While the lead (engine.js?…&mt=1) works on a job, this takes moves at the split points of its search (core.c mt_idle:
// Praline's Young Brothers Wait, shared/praline/) until the page stops every thread (ctl[0] = 1 and mt_stop); its nodes go to the
// page's nps readout. The tables and weights are in the shared memory (the lead copied them in); mt_thread gives this thread its
// own search state (the threat solver's table, the position) on fresh pages of the memory.
let X = null, ctl = null, cnt = null, id = 0;
self.onmessage = e => {
  const m = e.data;
  if (m.type === 'mtinit') {
    try {
      ctl = m.ctl; cnt = m.cnt; id = m.id;
      X = new WebAssembly.Instance(m.module, { env: { memory: m.mem, now: () => performance.now(), progress: () => {} } }).exports;
      X.mt_stack(m.top);
      if (!X.mt_thread(m.tls, m.id)) throw new Error('memory');
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

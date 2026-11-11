// A helper thread of the main page's multi-thread search (shared/mtengine.js): engine_mt.wasm on the shared memory. While
// the lead (engine.js?…&mt=1) works on a job, this takes moves at the split points the lead's search opens (engine.c
// mt_idle, Young Brothers Wait, 2026-11-11; MODEL_CARD.md「マルチスレッド その3：YBW」), until the page stops every thread
// (ctl[0] = 1 and mt_stop). (An engine_mt.wasm without mt_idle: the old Lazy SMP, the same root again and again.)
// The job: { io: the setup buffer of engine.c setup() (MorrisEngine.setupIO), gk: the geometry (MorrisEngine.geoKey) }.
// The geometry (nine / twelve / six men's) is shared: the lead sets it for the job, so this waits until it is in force.
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
    let nodes = 0;
    try {
      const t0 = Date.now();
      while (X.geo_key() !== m.gk && !Atomics.load(ctl, 0) && Date.now() - t0 < 3000) Atomics.wait(ctl, 1, 0, 2);
      if (X.mt_idle && X.geo_key() === m.gk) {   // (back every 250 ms while it has nothing to do: its nodes for the page's nps readout)
        for (let f = 1; !Atomics.load(ctl, 0); f = 0) { nodes += X.mt_idle(250, f); cnt[id] = nodes; }
      } else if (m.io && X.geo_key() === m.gk && !Atomics.load(ctl, 0)) {
        new Int32Array(mem.buffer, X.io_ptr(), 8192).set(m.io);
        if (X.setup() > 1) {
          const io = new Int32Array(mem.buffer, X.io_ptr(), 8);
          for (let k = 0; k < 200 && !Atomics.load(ctl, 0); k++) { X.best(60, 0, 0); nodes += io[3] * 1000; cnt[id] = nodes; }
        }
      }
    } catch (err) { console.warn(err); }
    self.postMessage({ type: 'done', job: m.job, nodes });
  }
};

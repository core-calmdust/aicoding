// A helper thread of the main page's multi-thread search (shared/mtengine.js): engine_mt.wasm on the shared memory. While
// the lead (engine.js?…&mt=1) works on a job, this searches the same root position again and again (Lazy SMP: the threads
// share the transposition table), until the page stops every thread (ctl[0] = 1 and mt_stop).
let X = null, mem = null, ctl = null, cnt = null, id = 0, acc = 0;
self.onmessage = e => {
  const m = e.data;
  if (m.type === 'mtinit') {
    try {
      mem = m.mem; ctl = m.ctl; cnt = m.cnt; id = m.id;
      X = new WebAssembly.Instance(m.module, { env: { memory: mem, now: () => performance.now(), progress: (d, sc, nodes) => { cnt[id] = acc + nodes; } } }).exports;   // (running count for the page's readout)
      X.mt_stack(m.top); X.mt_thread(m.tls, m.id);
      self.postMessage({ type: 'mtready' });
    } catch (err) { self.postMessage({ type: 'mtready', error: String(err && err.message || err) }); }
    return;
  }
  if (m.type === 'help') {
    let nodes = 0; acc = 0;
    try {
      new Uint8Array(mem.buffer).set(new TextEncoder().encode(m.setup + '\0'), X.setup_ptr()); X.set_position();
      for (let k = 0; k < 200 && !Atomics.load(ctl, 0); k++) { X.think(0, 0, 64, 0); nodes += X.res_nodes(); acc = nodes; cnt[id] = nodes; }
    } catch (err) { console.warn(err); }
    self.postMessage({ type: 'done', job: m.job, nodes });
  }
};

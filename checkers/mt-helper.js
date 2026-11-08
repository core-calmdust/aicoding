// A helper thread of the main page's multi-thread search (shared/mtengine.js): engine_mt.wasm on the shared memory. While
// the lead (engine.js?…&mt=1) works on a job, this searches the same root position again and again (Lazy SMP: the threads
// share the transposition table, the network and the endgame databases), until the page stops every thread (ctl[0] = 1 and
// mt_stop). The job: { io: the setup buffer of engine.c setup() (CheckersEngine.setupIO) }.
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
      if (m.io && !Atomics.load(ctl, 0)) {
        new Int32Array(mem.buffer, X.io_ptr(), 8192).set(m.io);
        if (X.setup()) {
          const io = new Int32Array(mem.buffer, X.io_ptr(), 8);
          for (let k = 0; k < 200 && !Atomics.load(ctl, 0); k++) { X.best(99, 0, 0); nodes += io[4] * 1000; cnt[id] = nodes; }
        }
      }
    } catch (err) { console.warn(err); }
    self.postMessage({ type: 'done', job: m.job, nodes });
  }
};

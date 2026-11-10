// A helper thread of the main page's multi-thread search (shared/mtengine.js): engine_mt.wasm on the shared memory (the
// NNUE and the tables are already there, loaded by the lead). While the lead (engine.js?…&mt=1) works on a job, this takes
// moves at the split points the lead's search opens (engine.c mt_idle, Young Brothers Wait, 2026-11-10; MODEL_CARD.md
// 「マルチスレッド その3：YBW」) until the page stops every thread. (An engine_mt.wasm without mt_idle: the old Lazy SMP, the
// same root position again and again with one transposition table.)
let X = null, mem = null, ctl = null, cnt = null, id = 0, acc = 0;
self.onmessage = e => {
  const m = e.data;
  if (m.type === 'mtinit') {
    try {
      mem = m.mem; ctl = m.ctl; cnt = m.cnt; id = m.id;
      X = new WebAssembly.Instance(m.module, { env: { memory: mem, now: () => Date.now(), progress: (d, s, nodes) => { cnt[id] = acc + (nodes >>> 0); }, aprogress: () => {} } }).exports;
      X.mt_stack(m.top); X.mt_thread(m.tls, m.id);
      self.postMessage({ type: 'mtready' });
    } catch (err) { self.postMessage({ type: 'mtready', error: String(err && err.message || err) }); }
    return;
  }
  if (m.type === 'help') {
    let nodes = 0; acc = 0;
    try {
      if (X.mt_idle) {   // (back every 250 ms while it has nothing to do: its nodes for the page's nps readout)
        for (let f = 1; !Atomics.load(ctl, 0); f = 0) { nodes += X.mt_idle(250, f); cnt[id] = nodes; }
        self.postMessage({ type: 'done', job: m.job, nodes });
        return;
      }
      const b = new Int8Array(mem.buffer, X.setup_ptr(), 98); b.set(m.board, 0); b.set(m.hand, 81); b[97] = m.side; X.set_position();
      for (const mv of m.moves) X.play_move(mv);
      X.set_exclude(0);
      for (let k = 0; k < 200 && !Atomics.load(ctl, 0); k++) {
        X.root_search(0, 0, 0);
        nodes += new Int32Array(mem.buffer, X.res_ptr(), 4)[2] >>> 0; acc = nodes; cnt[id] = nodes;
      }
    } catch (err) { console.warn(err); }
    self.postMessage({ type: 'done', job: m.job, nodes });
  }
};

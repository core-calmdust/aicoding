// A helper thread of the main page's multi-thread search (shared/mtengine.js): engine_mt.wasm on the shared memory. While
// the lead (engine.js?…&mt=1) works on a job, until the page stops every thread (ctl[0] = 1 and mt_stop):
//  - helpers 1..YBW_HELPERS wait in engine_mt.wasm's mt_idle and take the remaining moves of the split points (Young Brothers
//    Wait; the lead counted, the first 10 threads = the performance cores of the user's Mac),
//  - the others search the same root position again and again with history tables of their own (Lazy SMP: the threads
//    share the transposition table).
// (2026-11-12, MODEL_CARD.md「マルチスレッド v3」; 2026-11-10 v2: helper 1 only; before: every helper Lazy SMP.)
// (the bench page can pass another count for a comparison on the user's Mac: bench.html?ybw=1 → mt-helper.js?…&ybw=1;
// 0 = every helper Lazy SMP as before 2026-11-10)
// (2026-11-12, Mac bench: YBW for all 10 threads ×3.58 at 10 vs ×4.81 at 8 → YBW for the first 8 threads, Lazy SMP beyond)
const YBW_HELPERS = (q => q !== null && q !== '' && q >= 0 ? +q : 7)(new URLSearchParams(self.location.search).get('ybw'));
let X = null, mem = null, ctl = null, cnt = null, id = 0, acc = 0;
self.onmessage = e => {
  const m = e.data;
  if (m.type === 'mtinit') {
    try {
      mem = m.mem; ctl = m.ctl; cnt = m.cnt; id = m.id;
      X = new WebAssembly.Instance(m.module, { env: { memory: mem, now: () => performance.now(), progress: (d, sc, nodes) => { cnt[id] = acc + nodes; } } }).exports;   // (running count for the page's readout)
      X.mt_stack(m.top); X.mt_thread(m.tls, m.id);
      if (X.mt_lazy) X.mt_lazy(id > YBW_HELPERS ? 1 : 0);
      self.postMessage({ type: 'mtready' });
    } catch (err) { self.postMessage({ type: 'mtready', error: String(err && err.message || err) }); }
    return;
  }
  if (m.type === 'help') {
    let nodes = 0; acc = 0;
    try {
      new Uint8Array(mem.buffer).set(new TextEncoder().encode(m.setup + '\0'), X.setup_ptr()); X.set_position();
      if (X.mt_idle && id <= YBW_HELPERS) { nodes = X.mt_idle(); cnt[id] = nodes; }
      else for (let k = 0; k < 200 && !Atomics.load(ctl, 0); k++) { X.think(0, 0, 64, 0); nodes += X.res_nodes(); acc = nodes; cnt[id] = nodes; }
    } catch (err) { console.warn(err); }
    self.postMessage({ type: 'done', job: m.job, nodes });
  }
};

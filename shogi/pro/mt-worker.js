// One search thread of the strongest analysis (engine_mt.wasm). Thread 0 runs the timed search and reports; the others
// help until it is over: they take moves at the split points of its search (engine.c mt_idle, Young Brothers Wait,
// 2026-11-10; an older engine_mt.wasm without it: Lazy SMP, the same root again with the shared transposition table).
let X = null, id = 0, mem = null;
self.onmessage = e => {
  const m = e.data;
  if (m.type === 'init') {
    mem = m.mem; id = m.id;
    const progress = (d, s, nodes, pp, pl) => { if (id === 0) self.postMessage({ type: 'progress', depth: d, score: s, nodes, pv: Array.from(new Int32Array(mem.buffer, pp, pl)) }); };
    X = new WebAssembly.Instance(m.module, { env: { memory: mem, now: () => Date.now(), progress, aprogress: () => {} } }).exports;
    X.mt_stack(m.top); X.mt_thread(m.tls, id);
    self.postMessage({ type: 'ready' });
    return;
  }
  if (m.type === 'go') {
    const b = new Int8Array(mem.buffer, X.setup_ptr(), 98); b.set(m.board, 0); b.set(m.hand, 81); b[97] = m.side; X.set_position();
    for (const mv of m.moves) X.play_move(mv);
    const t0 = Date.now();
    if (id !== 0 && X.mt_idle) { const n = X.mt_idle(0, 1); self.postMessage({ type: 'done', id, move: 0, score: 0, depth: 0, nodes: n, pv: [], ms: Date.now() - t0 }); return; }
    const mv = id === 0 ? X.root_search(m.time, 0, 0) : X.root_search(0, 0, 0);
    if (id === 0) X.mt_stop(1);
    const r = new Int32Array(mem.buffer, X.res_ptr(), 4 + 64);
    self.postMessage({ type: 'done', id, move: mv, score: X.res_score(), depth: r[1], nodes: r[2] >>> 0, pv: Array.from(r.subarray(4, 4 + r[3])), ms: Date.now() - t0 });
  }
};

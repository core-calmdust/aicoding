// One search thread of the strongest analysis (engine_mt.wasm, Lazy SMP). Thread 0 runs the timed search and reports;
// the others help until it is over (they share its transposition table through the shared memory).
let X = null, id = 0, mem = null;
const CMATE = 31000, CMATE_MAX = CMATE - 256;
const wUci = m => { const a = new Uint8Array(mem.buffer), p = X.move_uci(m); let s = ''; for (let i = p; a[i]; i++) s += String.fromCharCode(a[i]); return s; };
self.onmessage = e => {
  const m = e.data;
  if (m.type === 'init') {
    mem = m.mem; id = m.id;
    const progress = (d, s, nodes, pvp, pvl) => {
      if (id !== 0) return;
      const pv = Array.from(new Int32Array(mem.buffer, pvp, pvl).slice()).map(wUci);
      self.postMessage({ type: 'progress', depth: d, score: s, nodes, pv });
    };
    X = new WebAssembly.Instance(m.module, { env: { memory: mem, now: () => performance.now(), progress } }).exports;
    X.mt_stack(m.top); X.mt_thread(m.tls, id);
    self.postMessage({ type: 'ready' });
    return;
  }
  if (m.type === 'go') {
    const s = m.fen + (m.moves.length ? ' moves ' + m.moves.join(' ') : '') + '\0';
    new Uint8Array(mem.buffer).set(new TextEncoder().encode(s), X.setup_ptr()); X.set_position();
    const t0 = performance.now();
    const cm = id === 0 ? X.think(m.soft, m.hard, m.depth || 64, 0) : X.think(0, 0, 64, 0);
    if (id === 0) X.mt_stop(1);
    const r = new Int32Array(mem.buffer, X.res_ptr(), 8 + 64);
    const pv = []; for (let j = 0; j < r[4] && j < 64; j++) pv.push(wUci(r[8 + j]));
    self.postMessage({ type: 'done', id, move: cm ? wUci(cm) : null, score: r[1], depth: r[2], nodes: X.res_nodes(), pv, ms: performance.now() - t0 });
  }
};

/* ur/worker.js — runs the engine off the main thread (AI moves, the post-game review).
   messages: { id, type:'think', state, n, level, cfg? }    → { id, move }   (cfg: PRO mode, engine.js think opts.cfg)
             { id, type:'review', list:[{ state, n }] }      → { id, type:'progress', i, res } … { id, done:true }
               res = { ev:[{ from, to, wp }], wp0 }  (ev: every legal move, best first; wp0: the mover's win chance before rolling)
   the threads (../shared/mtworkers.js, one task per message):
             { id, type:'roll', state, n, d, k? }           → { id, v }   (E.rollTask: one move × one throw [× one move: k] of E.splitEval)
             { id, type:'review1', state, n }               → { id, res }  (one position of the review)
             { id, type:'ping' }                            → { id, core }  ('wasm-simd' | 'wasm' | 'js') */
importScripts('engine.js?v=6');
const E = self.UrEngine;
// (2026-11-11) the C engine: engine_simd.wasm (wasm SIMD) where the browser has SIMD, else engine.wasm (the same numbers);
// without WebAssembly (or with ?nowasm) the JavaScript search of engine.js. Messages wait until it is loaded.
let core = 'js';
const ready = (async () => {
  try {
    if (typeof WebAssembly !== 'object' || /[?&]nowasm\b/.test(self.location.search || '')) return;
    let simd = true;
    try { simd = WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])); } catch (e) { simd = false; }
    const url = new URL((simd ? 'engine_simd.wasm' : 'engine.wasm') + '?v=1', self.location.href);
    const imp = { env: { now: () => performance.now() } };
    const r = WebAssembly.instantiateStreaming ? await WebAssembly.instantiateStreaming(fetch(url), imp) : await WebAssembly.instantiate(await fetch(url).then(x => x.arrayBuffer()), imp);
    if (E.setWasm(r.instance.exports)) core = simd ? 'wasm-simd' : 'wasm'; else E.setWasm(null);
  } catch (e) { E.setWasm(null); }
})();
self.onmessage = e => { ready.then(() => handle(e)); };
const handle = e => {
  const d = e.data || {};
  if (d.type === 'ping') { postMessage({ id: d.id, core }); return; }
  try {
    if (d.type === 'roll') postMessage({ id: d.id, v: E.rollTask(d.state, d.n, d.d, d.k) });
    else if (d.type === 'review1') {
      const ev = d.n ? E.evaluate(d.state, d.n, { depth: 2 }).map(x => ({ from: x.move.from, to: x.move.to, wp: x.wp })) : [];
      postMessage({ id: d.id, res: { ev, wp0: E.winProb(d.state, { depth: 1 }) } });
    } else if (d.type === 'think') {
      const m = E.think(d.state, d.n, d.level, d.cfg ? { cfg: d.cfg, timeLimit: d.cfg.depth >= 2 ? 20000 : undefined } : {});   // (cfg: PRO mode)
      postMessage({ id: d.id, move: m ? { from: m.from, to: m.to } : null });
    } else if (d.type === 'review') {
      d.list.forEach((q, i) => {
        const ev = q.n ? E.evaluate(q.state, q.n, { depth: 2 }).map(x => ({ from: x.move.from, to: x.move.to, wp: x.wp })) : [];
        postMessage({ id: d.id, type: 'progress', i, res: { ev, wp0: E.winProb(q.state, { depth: 1 }) } });
      });
      postMessage({ id: d.id, done: true });
    }
  } catch (err) { postMessage({ id: d.id, error: String(err) }); }
};

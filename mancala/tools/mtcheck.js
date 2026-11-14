// engine_mt.wasm (Praline's YBW, 2026-11-14) against engine.wasm: node tools/mtcheck.js [threads]
//  ① one thread: mc_rootbest (depths 1–12) and mc_rootvalues (depths 2–10) on seeded positions of 5 rules give the same
//     moves, values, exact flags and node counts as engine.wasm with the fixed table (mc_ttfix 1 — the levels by time,
//     the analysis)
//  ② threads (worker_threads helpers in mt_idle): the solved values (exact) of the endgames are the same as one thread's
'use strict';
const fs = require('fs'), path = require('path'), { Worker, isMainThread, workerData } = require('worker_threads');
const DIR = path.join(__dirname, '..'), SLOT = 4 << 20;
const now = () => performance.now();
if (!isMainThread) {   // a helper
  const { module, mem, id, base, ctl } = workerData;
  const X = new WebAssembly.Instance(module, { env: { memory: mem, now } }).exports;
  X.mt_stack(base + id * SLOT + SLOT - 16); X.mt_thread(base + id * SLOT, id);
  const c = new Int32Array(ctl);
  for (;;) { Atomics.wait(c, 1, 0); if (Atomics.load(c, 0) === 2) break; X.mt_idle(0, 1); Atomics.store(c, 1, 0); Atomics.add(c, 2, 1); Atomics.notify(c, 2); }
  return;
}
const E = require(path.join(DIR, 'engine.js'));
(async () => {
  const NT = +(process.argv[2] || 3);
  const plain = (await WebAssembly.instantiate(fs.readFileSync(path.join(DIR, 'engine.wasm')), { env: { now } })).instance.exports;
  const module = await WebAssembly.compile(fs.readFileSync(path.join(DIR, 'engine_mt.wasm')));
  const mem = new WebAssembly.Memory({ initial: 1024, maximum: 16384, shared: true });
  const X = new WebAssembly.Instance(module, { env: { memory: mem, now } }).exports;
  const base = Math.ceil(X.mt_heap_base() / 65536) * 65536, need = base + (NT + 2) * SLOT;
  if (need > mem.buffer.byteLength) mem.grow(Math.ceil((need - mem.buffer.byteLength) / 65536));
  X.mt_stack(base + SLOT - 16); X.mt_thread(base, 0);
  const io = x => ({ B: new Uint8Array(x.memory ? x.memory.buffer : mem.buffer, x.mc_board(), 14), M: () => new Int32Array(x.memory ? x.memory.buffer : mem.buffer, x.mc_outm(), 8), V: () => new Int32Array(x.memory ? x.memory.buffer : mem.buffer, x.mc_outv(), 8), XX: () => new Int32Array(x.memory ? x.memory.buffer : mem.buffer, x.mc_outx(), 8) });
  const P = io(plain), Q = io(X);
  // positions: seeded games of 5 rules
  let rs = 20261114; const rnd = n => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs % n; };
  E.setRandom(() => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x80000000; });
  const RS = ['kalah', 'oware', 'mangala', 'bohnen', 'ayo'], pos = [];
  for (let g = 0; pos.length < 25; g++) {
    const rules = RS[g % 5], len = 3 + rnd(30); let b = E.initial(4), side = 0, ok = true;
    for (let i = 0; i < len; i++) { const r = E.chooseMove(b, side, rules, 4); if (r.move < 0) { ok = false; break; } const c = Int8Array.from(b), x = E.play(c, side, r.move, E.RULES[rules]); b = c; if (x.over) { ok = false; break; } if (!x.extra) side = 1 - side; }
    if (ok && E.legal(b, side, rules).length > 1) pos.push({ b: Array.from(b), side, r: E.RULE_IDS.indexOf(rules) });
  }
  const prep = (x, s, p) => { s.B.set(p.b); x.mc_setup(p.r); x.mc_ttfix(1); x.mc_ttclear(); x.mc_begin(0); };
  let same = 0, diff = 0;
  for (const p of pos) {
    prep(plain, P, p); prep(X, Q, p);
    let pa = -1, pb = -1;
    for (let d = 1; d <= 12; d++) {
      plain.mc_rootbest(p.side, d, pa, 0); X.mc_rootbest(p.side, d, pb, 0);
      const a = [P.M()[0], P.V()[0], P.XX()[0], plain.mc_nodes()], b = [Q.M()[0], Q.V()[0], Q.XX()[0], X.mc_nodes()];
      if (a.join() === b.join()) same++; else { diff++; if (diff < 5) console.log('best differs', p, d, a, b); }
      pa = a[0]; pb = b[0];
    }
    prep(plain, P, p); prep(X, Q, p);
    for (let d = 2; d <= 10; d += 2) {
      const n1 = plain.mc_rootvalues(p.side, d), n2 = X.mc_rootvalues(p.side, d);
      const a = [n1, ...P.M().slice(0, n1), ...P.V().slice(0, n1), ...P.XX().slice(0, n1), plain.mc_nodes()], b = [n2, ...Q.M().slice(0, n2), ...Q.V().slice(0, n2), ...Q.XX().slice(0, n2), X.mc_nodes()];
      if (a.join() === b.join()) same++; else { diff++; if (diff < 5) console.log('values differ', p, d, a, b); }
    }
  }
  console.log('① one thread: same', same, 'different', diff);
  // ② threads
  const ctlB = new SharedArrayBuffer(16), ctl = new Int32Array(ctlB), hs = [];
  for (let id = 1; id < NT; id++) hs.push(new Worker(__filename, { workerData: { module, mem, id, base, ctl: ctlB } }));
  await new Promise(r => setTimeout(r, 300));
  const runMT = fn => new Promise(res => {
    X.mt_stop(0); Atomics.store(ctl, 2, 0); Atomics.store(ctl, 1, 1); Atomics.notify(ctl, 1);
    setTimeout(() => {   // (the helpers are in mt_idle)
      const out = fn(); X.mt_stop(1);
      const t0 = Date.now(); const wait = () => { if (Atomics.load(ctl, 2) >= NT - 1 || Date.now() - t0 > 5000) res(out); else setTimeout(wait, 5); }; wait();
    }, 20);
  });
  let ok = 0, bad = 0, tried = 0;
  for (const p of pos) {
    // solve with one thread (engine.wasm): every move exact
    prep(plain, P, p); let ref = null;
    for (let d = 2; d <= 60; d += 2) { const n = plain.mc_rootvalues(p.side, d); if (P.XX().slice(0, n).every(x => x)) { ref = { n, v: Array.from(P.V().slice(0, n)), d }; break; } if (plain.mc_nodes() > 4e7) break; }
    if (!ref) continue; tried++;
    prep(X, Q, p);
    const got = await runMT(() => { for (let d = 2; d <= 60; d += 2) { const n = X.mc_rootvalues(p.side, d); if (n > 0 && Q.XX().slice(0, n).every(x => x)) return Array.from(Q.V().slice(0, n)); } return null; });
    if (got && got.join() === ref.v.join()) ok++; else { bad++; console.log('solved values differ', p, ref.v, got); }
  }
  console.log('② ' + NT + ' threads: solved positions', tried, 'same', ok, 'different', bad);
  Atomics.store(ctl, 0, 2); Atomics.store(ctl, 1, 1); Atomics.notify(ctl, 1); X.mt_stop(1);
  setTimeout(() => process.exit(0), 200);
})();

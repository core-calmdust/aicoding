// The MCTS on several threads in Node (core_mt.wasm on a shared memory, the same code as the page's threads): the lead is this
// thread (engine.js with useCore), the helpers are worker_threads running mt_help — the shape of shared/mtengine.js + mt-helper.js.
//   node tools/mt_node.js check [T…]          bench positions: visits, the root's visits ÷ visits, the best move, the process's
//                                            CPU time per visit (process.cpuUsage counts every thread), how the visits ended
//                                            (core.c mcts_vk: expanded / proven / waiting leaf / busy); MC_MS=2000 or MC_SIMS=…
//   node tools/mt_node.js match T sims pairs  T threads (sims visits in all) vs 1 thread (the same sims), colours swapped,
//                                            two random opening plies (a crowded 2-core machine: equal visits, not equal time)
//   node tools/mt_node.js match T nk=A pairs nk=B [seed]   T threads with A thousand evaluations in all vs 1 thread with B —
//                                            "the same wall time" on a machine with the cores: A = B × the evaluations/s ratio
//                                            of bench.html (the user's M4 Pro: 2T 2.0, 4T 3.8, 8T 6.6, 10T 7.5)
'use strict';
const path = require('path'), fs = require('fs');
const { Worker } = require('worker_threads');
const E = require(path.join(__dirname, '..', 'engine.js'));
const SLOT = 2 << 20;
async function setupMT(nHelp) {
  const module = new WebAssembly.Module(fs.readFileSync(path.join(__dirname, '..', 'core_mt.wasm')));
  const mem = new WebAssembly.Memory({ initial: 512, maximum: 16384, shared: true });
  const x = new WebAssembly.Instance(module, { env: { memory: mem, now: () => Date.now() } }).exports;
  const base = Math.ceil(x.mt_heap_base() / 65536) * 65536, n = 1 + nHelp, need = base + (n + 1) * SLOT;
  if (need > mem.buffer.byteLength) mem.grow(Math.ceil((need - mem.buffer.byteLength) / 65536));
  x.mt_stack(base + SLOT - 16); x.mt_thread(base, 0);
  const src = `const { parentPort } = require('worker_threads'); let X = null;
    parentPort.on('message', m => {
      if (m.type === 'mtinit') { X = new WebAssembly.Instance(m.module, { env: { memory: m.mem, now: () => Date.now() } }).exports; X.mt_stack(m.top); X.mt_thread(m.tls, m.id); parentPort.postMessage({ type: 'mtready' }); return; }
      if (m.type === 'help') { const t0 = process.cpuUsage(); const d = X.mt_help(); const u = process.cpuUsage(t0); parentPort.postMessage({ type: 'done', sims: d, cpu: (u.user + u.system) / 1000 }); }
    });`;
  const hw = [];
  for (let i = 1; i <= nHelp; i++) {
    const w = new Worker(src, { eval: true });
    await new Promise(r => { w.once('message', r); w.postMessage({ type: 'mtinit', module, mem, id: i, tls: base + i * SLOT, top: base + i * SLOT + SLOT - 16 }); });
    hw.push(w);
  }
  const C = { x: Object.assign({}, x, { memory: mem }), threads: n, maxNodes: 1 << 22 };
  C.views = () => { const buf = mem.buffer; Object.assign(C, { buf, sq: new Int8Array(buf, x.sqp(), 100), q: new Int8Array(buf, x.qp(), 8), rm: new Int32Array(buf, x.rmp(), 64), rn: new Int32Array(buf, x.rnp(), 64), rv: new Int32Array(buf, x.rvp(), 64), rp: new Int32Array(buf, x.rpp(), 64), pv: new Int32Array(buf, x.pvp(), 32) }); };
  C.views();
  // run fn (synchronous, on this thread) with the helpers joining its trees; returns { r, hs (helpers' visits), hcpu }
  C.job = async fn => {
    x.mt_stop(0);
    const dn = hw.map(w => new Promise(r => w.once('message', r)));
    hw.forEach(w => w.postMessage({ type: 'help' }));
    await new Promise(r => setTimeout(r, 20));   // (the helpers are waiting for a tree)
    const r = fn();
    x.mt_stop(1);
    const d = await Promise.all(dn);
    return { r, hs: d.reduce((a, m) => a + m.sims, 0), hcpu: d.reduce((a, m) => a + m.cpu, 0) };
  };
  C.close = () => hw.forEach(w => w.terminate());
  return C;
}
module.exports = { setupMT };
function benchPositions() {   // (bench.html: Lv.9 vs Lv.10, plies 10 … 40)
  const out = []; let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let g = 0; g < 2; g++) { const moves = []; for (let i = 0; i < 40; i++) { const r = E.think(null, moves, 9 + g, rnd); if (r.move < 0) break; moves.push(r.move); if (i % 10 === 9) out.push(moves.slice()); } }
  return out;
}
// check's budget: MC_SIMS visits (default 3000) or MC_MS ms (the process's threads, the wall clock)
const MC_O = process.env.MC_MS ? { ms: +process.env.MC_MS, seed: 1 } : { sims: +(process.env.MC_SIMS || 3000), seed: 1 };
async function check(Ts) {
  const P = benchPositions();
  for (const T of Ts) {
    const C = T > 1 ? await setupMT(T - 1) : null;
    let agree = 0, ref = [], tot = 0, rootOK = 0, cpuL = 0, cpuH = 0, simsL = 0, simsH = 0;
    for (const [i, mv] of P.entries()) {
      const { pos } = E.replay(null, mv);
      E.useCore(C);
      const t0 = process.cpuUsage();
      const run = () => E.mcts(pos, MC_O);
      const o = C ? await C.job(run) : { r: run(), hs: 0, hcpu: 0 };
      const u = process.cpuUsage(t0); cpuL += (u.user + u.system) / 1000; cpuH += o.hcpu; simsH += o.hs;
      const r = o.r, sumN = r.list.reduce((a, e) => a + e.n, 0);
      tot += r.sims; rootOK += sumN / (r.sims - 1);
      const vk = r.vk || [], vt = vk.reduce((a, x, k) => k < 5 ? a + x : a, 0) || 1, pc = k => (vk[k] / vt * 100).toFixed(1) + '%';
      console.log(`T${T} pos${i}: sims ${r.sims} (helpers ${o.hs}) evals/visit ${(r.evals / r.sims).toFixed(1)} root Σn/sims ${(sumN / (r.sims - 1)).toFixed(4)} best ${E.name(null, r.list[0].m)} n${r.list[0].n} v${r.list[0].v} nodes ${r.nodes}` +
        ` | ends: expand ${pc(0)} proven ${pc(1)} (lost child ${pc(5)}) wait ${pc(2)} busy ${pc(3)} cap ${pc(4)}`);
    }
    simsL = tot - simsH;
    console.log(`# T${T}: avg sims ${(tot / P.length).toFixed(0)}, root Σn/sims ${(rootOK / P.length).toFixed(4)}, the process's CPU ms per visit (all threads) ${(cpuL / tot).toFixed(3)}`);
    if (C) C.close();
  }
  E.useCore(null);
}
async function match(T, sims, pairs, oneB, seed) {
  const C = T > 1 ? await setupMT(T - 1) : null;
  const bud = b => typeof b === 'string' && b.startsWith('nk=') ? { nk: +b.slice(3) } : { sims: +b };
  const bMT = bud(sims), b1 = oneB ? bud(oneB) : bMT;
  let rs = 12345 + (seed | 0) * 7919; const rnd = () => { rs = (Math.imul(rs, 1103515245) + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
  let w = 0, n = 0;
  for (let i = 0; i < pairs; i++) {
    const op = []; for (let k = 0; k < 2; k++) { const { pos } = E.replay(null, op); const L = E.candList(pos, 10, 0, 14); op.push(L[Math.floor(rnd() * L.length)].m); }
    for (let sw = 0; sw < 2; sw++) {
      const moves = op.slice(); let win = 0;
      for (let ply = 0; ply < 100 && !win; ply++) {
        const { pos } = E.replay(null, moves);
        if (!pos.canMove(pos.turn)) { win = 3 - pos.turn; break; }
        const t = pos.terr(); if (t.sep && Math.abs(t.a - t.b) >= 3) { win = t.a > t.b ? 1 : 2; break; }
        const mtSide = sw ? 2 : 1, cfg = Object.assign({ s: 1, mc: 1, seed: ply }, pos.turn === mtSide ? bMT : b1);
        let r;
        if (pos.turn === mtSide && C) { E.useCore(C); r = (await C.job(() => E.think(null, moves, 0, rnd, null, cfg))).r; E.useCore(null); }
        else r = E.think(null, moves, 0, rnd, null, cfg);
        if (r.move < 0) { win = 3 - pos.turn; break; }
        moves.push(r.move);
      }
      const mtWin = win === (sw ? 2 : 1); w += mtWin ? 1 : 0; n++;
      console.log(JSON.stringify({ pair: i, mtWhite: !sw, mtWin: mtWin ? 1 : 0, plies: moves.length }));
    }
  }
  console.log(`# ${T} threads (${JSON.stringify(bMT)}) vs 1 (${JSON.stringify(b1)}): ${w}/${n} (${(w / n * 100).toFixed(1)}%)`);
  if (C) C.close();
}
if (require.main === module) {
  const [, , cmd, ...a] = process.argv;
  if (cmd === 'check') check(a.length ? a.map(Number) : [1, 2, 4]);
  else if (cmd === 'match') match(+a[0], a[1].startsWith('nk=') ? a[1] : +a[1], +a[2], a[3], +(a[4] || 0));
}

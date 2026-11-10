// The 5x5 solver on one shared table (dots5mt.wasm, engine.js X5M / mj*, 2026-11-10) against one thread: Node worker
// threads as the helpers (the same messages as the engine worker's pool). Checks
//   ① the MT build alone = dots5.wasm (same value, same move, same nodes, fresh tables),
//   ② the analysis (allSharedW): every move's exact value = the one-thread analysis (JavaScript S.all),
//   ③ the exact best move (bestSharedW): the value of dots5.wasm's w_best, and the move chosen has that value,
//   ④ Lv.10 (chooseW5Shared) on bench.html's AI positions: a win is a win, a margin is the one-thread margin.
//   node dots/tools/mt5.js [threads 1,2,4]
'use strict';
const { Worker, isMainThread, parentPort } = require('worker_threads');
const path = require('path'), fs = require('fs');
const E = require(path.join(__dirname, '..', 'engine.js'));
if (!isMainThread) {
  parentPort.on('message', d => {
    let r = null;
    if (d.type === 'x5minit') { try { r = E.x5mHelper(d); } catch (e) { r = 0; console.error(e); } }
    else if (d.type === 'x5mjob') r = E.mjWork(d);
    parentPort.postMessage({ id: d.id, r });
  });
  return;
}
const TH = (process.argv[2] || '1,2,4').split(',').map(Number);
const html = fs.readFileSync(path.join(__dirname, '..', 'bench.html'), 'utf8');
const AI = JSON.parse(html.match(/const AI = (\[\[.*?\]\]);/)[1]).map(a => a[2]);
const REV = JSON.parse(html.match(/const REV = (\[\[.*?\]\]);/)[1]);
const G = E.geom(5, 5);
const ANA = []; { let g = 0; for (const [n, ed] of REV) { if (n !== 5) continue; let sd = 1234 + 7919 * g++; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const p = E.Pos.from(G, []), edges = [];
  while (p.undrawn > 0) { let safe = 0; for (let e = 0; e < G.E; e++) if (!p.drawn[e] && p.gives(e) === 0) safe++;
    if (safe <= 15 && !p.hasCapture()) { ANA.push(edges); break; }
    const m = edges.length < ed.length ? ed[edges.length] : E.chooseMove(p, 6, rnd).move; p.play(m); edges.push(m); } } }
if (E.x5Ready() !== true || E.x5mReady() !== true) { console.log('no wasm'); process.exit(1); }
const ws = []; let seq = 0;
function pool(n) {
  while (ws.length < n) { const w = new Worker(__filename), cb = new Map(); w.on('message', m => { const f = cb.get(m.id); if (f) { cb.delete(m.id); f(m.r); } }); ws.push({ w, cb, m5: 0 }); }
  const hs = ws.slice(0, n);
  return {
    size: n,
    run: (i, msg) => new Promise(res => { const id = ++seq; hs[i].cb.set(id, res); hs[i].w.postMessage(Object.assign({}, msg, { id })); }),
    m5: () => hs.map((h, i) => { if (!h.m5) { h.m5 = 1; const id = ++seq; h.cb.set(id, r => { h.m5 = r ? 2 : -1; }); h.w.postMessage({ type: 'x5minit', id, module: E.X5M.module, mem: E.X5M.mem, slot: i + 1, bits: E.X5M.bits }); } return h.m5 > 0 ? i : -1; }).filter(i => i >= 0),
  };
}
const clearM = () => E.X5M.x.w_clear(), clear1 = () => E.X5.x.w_clear();
let bad = 0; const fail = s => { bad++; console.log('  FAIL ' + s); };
(async () => {
  // ① one thread
  E.useX5M(true);
  for (const ed of AI.slice(3).concat(ANA)) {
    const p = E.Pos.from(G, ed);
    clear1(); const a = E.X5.w; a.limit(0, 0); const ra = a.best(p, null, -1);
    clearM(); E.X5M.x.mt_job(E.X5M.job); E.X5M.x.mt_mine(E.X5M.job); const b = E.X5M.w; b.limit(0, 0); const rb = b.best(p, null, -1);
    const same = ra.value === rb.value && ra.move === rb.move && a.nodes === b.nodes;
    console.log(`① ${ed.length} drawn: dots5 v${ra.value} m${ra.move} ${a.nodes} nodes | dots5mt v${rb.value} m${rb.move} ${b.nodes} nodes ${same ? 'same' : 'DIFF'}`);
    if (!same) fail('one thread differs');
  }
  for (const T of TH) {
    const P = pool(T - 1);
    console.log(`--- ${T} thread(s)`);
    // ② the analysis
    for (const ed of ANA) {
      const p = E.Pos.from(G, ed);
      const S = new E.Solver(G, 22); S.prune = true; S.limit(0, 0); const ref = S.all(p);
      clearM(); const t0 = Date.now(), r = await E.allSharedW(p, 600000, P), ms = Date.now() - t0;
      const same = r && r.length === ref.length && r.every((x, i) => x.m === ref[i].m && x.v === ref[i].v);
      console.log(`② ${ed.length} drawn, ${ref.length} moves: ${ms} ms ${same ? 'same values' : 'DIFF'}`);
      if (!same) fail('analysis');
    }
    // ③ the exact best move
    for (const ed of AI.slice(3).concat(ANA)) {
      const p = E.Pos.from(G, ed);
      clear1(); const a = E.X5.w; a.limit(0, 0); const ra = a.best(p, null, -1);
      clearM(); const t0 = Date.now(), rb = await E.bestSharedW(p, -1, 600000, P), ms = Date.now() - t0;
      clear1(); a.limit(0, 0); const vm = rb ? a.moveValue(p, rb.move) : null;
      const ok = rb && rb.value === ra.value && vm === ra.value;
      console.log(`③ ${ed.length} drawn: one thread v${ra.value} m${ra.move} | shared v${rb && rb.value} m${rb && rb.move} (its value ${vm}) ${ms} ms ${ok ? 'ok' : 'DIFF'}`);
      if (!ok) fail('best');
    }
    // ④ Lv.10
    for (let i = 3; i < AI.length; i++) {
      const p = E.Pos.from(G, AI[i]), cfg = E.LEVELS[10];
      clearM(); E.useX5M(true);
      let sd = 99; const rand = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      const t0 = Date.now(), r = await E.chooseMoveAsync(p, 10, rand, Object.assign(P, { ready: null }), 0, AI[i]), ms = Date.now() - t0;
      clear1(); const a = E.X5.w; a.limit(0, 0); const vm = a.moveValue(p, r.move); a.limit(0, 0); const vb = a.best(p, null, -1).value;
      const ok = r.exact ? r.value === vb && vm === vb : r.outcome === 1 ? vm > 0 : r.outcome === 0 ? vm === 0 && vb <= 0 : true;
      console.log(`④ ai${i + 1}: ${ms} ms m${r.move} v${r.value}${r.exact ? ' exact' : r.outcome === 1 ? ' won' : r.outcome === 0 ? ' drawn' : ''} proved ${r.stat ? r.stat.lost + r.stat.draw : '-'}/${r.stat ? r.stat.n : '-'} | one thread: this move ${vm}, best ${vb} ${ok ? 'ok' : 'WRONG'}`);
      if (!ok) fail('Lv.10');
    }
  }
  console.log(bad ? `${bad} FAILED` : 'all ok');
  ws.forEach(h => h.w.terminate());
})();

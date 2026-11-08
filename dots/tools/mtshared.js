// The analysis on the shared table (engine.js allShare / allShared, 2026-11-09) against the one-thread exact solver S.all:
// the same values, and the speed-up measured by work (the 2-core work machine): every worker's own node count, the time =
// the busiest worker's nodes (all run at the same speed on real cores) against the one-thread solver's nodes.
//   node dots/tools/mtshared.js [positions=6] [threads 1,2,4,8] [n=5] [safe=15]
'use strict';
const { Worker, isMainThread, parentPort } = require('worker_threads');
const path = require('path');
const E = require(path.join(__dirname, '..', 'engine.js'));
if (!isMainThread) { parentPort.on('message', d => parentPort.postMessage(E.allShare(d))); return; }
const NP = +process.argv[2] || 6, TH = (process.argv[3] || '1,2,4,8').split(',').map(Number), N = +process.argv[4] || 5, SAFE = +process.argv[5] || 15;
const G = E.geom(N, N);
function positions() {   // games of Lv.6 against itself (seeded), the first position of each with at most SAFE safe moves left
  const out = [];
  for (let g = 0; out.length < NP && g < NP * 4; g++) {
    const rand = (() => { let s = 1234 + g * 7919; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
    const p = E.Pos.from(G, []), edges = [];
    while (p.undrawn > 0) {
      let safe = 0; for (let e = 0; e < G.E; e++) if (!p.drawn[e] && p.gives(e) === 0) safe++;
      if (safe <= SAFE && !p.hasCapture()) { out.push(edges.slice()); break; }
      const r = E.chooseMove(p, 6, rand); p.play(r.move); edges.push(r.move);
    }
  }
  return out;
}
(async () => {
  const P = positions(), sum = {}; let base = 0;
  const ws = []; for (let i = 0; i < Math.max(...TH) - 1; i++) ws.push(new Worker(__filename));
  for (const edges of P) {
    const p = E.Pos.from(G, edges);
    const S = new E.Solver(G, 22); S.prune = true; S.limit(0, 0);
    const t0 = Date.now(), ref = S.all(p), ms1 = Date.now() - t0, n1 = S.nodes;
    // (S.nodes counts the last move only: count all by solving move by move on a fresh solver)
    const S2 = new E.Solver(G, 22); S2.prune = true; let n1all = 0; S2.limit(0, 0); S2.best(p); n1all += S2.nodes;
    for (const e of p.legal()) { S2.limit(0, 0); S2.moveValue(p, e); n1all += S2.nodes; }
    base += n1all;
    const line = [`${edges.length} drawn, ${p.legal().length} moves: 1 thread ${(n1all / 1e6).toFixed(2)}M nodes ${ms1} ms`];
    for (const n of TH) {
      const tt = new SharedArrayBuffer((1 << 22) * 16), moves = p.legal(), ctl = new Int32Array(new SharedArrayBuffer(4 * (8 + moves.length)));
      const msg = { R: N, C: N, edges, until: Date.now() + 6e5, tt, ctl: ctl.buffer, moves };
      const hs = ws.slice(0, n - 1).map(w => new Promise(r => { w.once('message', r); w.postMessage(msg); }));
      const mine = E.allShare(Object.assign({ lead: 1 }, msg)), rs = await Promise.all(hs);
      const per = [mine.nodes].concat(rs.map(r => r.nodes)), mx = Math.max(...per), all = per.reduce((a, b) => a + b, 0);
      const vals = moves.map((m, i) => ({ m, v: Atomics.load(ctl, 8 + i) - 1000 }));
      const same = ref && vals.every((x, i) => x.m === ref[i].m && x.v === ref[i].v);
      (sum[n] = sum[n] || { mx: 0, all: 0, same: 0 }); sum[n].mx += mx; sum[n].all += all; if (same) sum[n].same++;
      line.push(`t${n} max ${(mx / 1e6).toFixed(2)}M all ${(all / 1e6).toFixed(2)}M ${same ? 'same' : 'DIFF'}`);
    }
    console.log(line.join(' | '));
  }
  console.log(`${P.length} positions (${N}x${N}, ≤ ${SAFE} safe moves): ` + TH.map(n => `${n}: ×${(base / sum[n].mx).toFixed(2)} work ${(sum[n].all / base).toFixed(2)} same ${sum[n].same}/${P.length}`).join('  '));
  ws.forEach(w => w.terminate());
})();

// Lazy SMP on the shared table (shared/mttt.js), measured with real worker_threads: the time = the MAIN thread's own nodes
// until it finishes depth D (every thread runs at the same speed on N real cores; on the 2-core work machine the threads
// share the cores fairly, so the main thread's nodes still stand for the wall time). Helpers: depth + (i & 1), root order
// rotated by i >> 1, until the main thread is done. Common rule「本編のマルチスレッド」2026-11-09 (shared vs not shared).
//   node shared/tools/mtlazy.js <game> [depth] [positions] [threads 1,2,4,8]
'use strict';
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
if (isMainThread) {
  const GAME = process.argv[2] || 'ugolki', D = +process.argv[3] || 8, NP = +process.argv[4] || 3, TH = (process.argv[5] || '1,2,4,8').split(',').map(Number);
  const RULE = { ugolki: 'c33', agon: 'std', konane: 's8' }[GAME];
  const E = require(path.join(ROOT, GAME, 'engine.js'));
  const P = []; let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  E.setRule(RULE);
  for (let g = 0; g < 2; g++) { const moves = []; for (let i = 0; i < 60; i++) { const { pos } = E.replay(null, moves); if (E.judge(pos).over || !pos.moves().length) break; const r = E.think(null, moves, 6 + g, rnd, RULE); if (r.move == null || r.move < 0) break; moves.push(r.move); if (i >= 9 && i % 10 === 9) P.push(moves.slice()); } }
  (async () => {
    const sum = {};
    for (const moves of P.slice(0, NP)) {
      const line = [];
      for (const n of TH) {
        const tt = new SharedArrayBuffer(64 << 20), ctl = new SharedArrayBuffer(256), C = new Int32Array(ctl); C[0] = 1;
        const ws = [];
        const res = await new Promise(resolve => {
          let lead = null, hn = 0, left = n - 1;
          for (let i = 0; i < n; i++) {
            const w = new Worker(__filename, { workerData: { GAME, RULE, moves, D, i, tt, ctl } }); ws.push(w);
            w.on('message', m => { if (m.i === 0) { lead = m; Atomics.store(C, 0, 2); if (!left) resolve({ lead, hn }); } else { hn += m.nodes; if (--left === 0 && lead) resolve({ lead, hn }); } });
          }
        });
        ws.forEach(w => w.terminate());
        (sum[n] = sum[n] || { t: 0, all: 0 }); sum[n].t += res.lead.nodes; sum[n].all += res.lead.nodes + res.hn;
        line.push(`t${n}:${(res.lead.nodes / 1000).toFixed(0)}k(${res.lead.m})`);
      }
      console.log(line.join(' '));
    }
    console.log(GAME, 'depth', D, TH.map(n => `${n}: ×${(sum[TH[0]].t / sum[n].t).toFixed(2)} work ${(sum[n].all / sum[TH[0]].all).toFixed(2)}`).join('  '));
  })();
} else {
  const { GAME, RULE, moves, D, i, tt, ctl } = workerData;
  const E = require(path.join(ROOT, GAME, 'engine.js')), MTTT = require(path.join(ROOT, 'shared', 'mttt.js'));
  const T = new MTTT.Table(tt, ctl, i); T.begin({ _ep: 1, id: 1, _age: 1 }); E.SH = T; E.setRule(RULE);
  let tot = 0, last = null;
  for (let d = 1; d <= (i ? 99 : D); d++) {
    const r = E.mtLazy({ start: null, moves, rule: RULE, d: i ? d + (i & 1) : d, rot: i >> 1 });
    tot += r.nodes; if (i && T.stopped()) break; last = r;
  }
  parentPort.postMessage({ i, nodes: tot, m: last && last.m });
}

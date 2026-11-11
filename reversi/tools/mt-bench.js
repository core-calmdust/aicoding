// Time to solve endgames on several threads (engine_mt.wasm on a shared memory, like pro/ and the main page's pool).
//   node mt-bench.js [empties=22] [count=10] [rounds=1] [modes=1,2lazy,2split]
// Positions: self-play (level 15, seeded random 8-ply openings) stopped at `empties`. Each mode solves every position
// from an empty transposition table with think({ depth 60, exact: 64, mpc }) on thread 0 (the helpers run think with
// opts.rot like the pages); modes run interleaved per position (CPU contention from other jobs evens out). The scores
// must be the same in every mode.
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const RV = path.join(__dirname, '..');

if (!isMainThread) {
  const m = workerData;
  const X = new WebAssembly.Instance(m.module, { env: { memory: m.mem, now: () => Date.now() } }).exports;
  X.mt_stack(m.top); X.mt_thread(m.tls);
  global.self = { REVERSI_WX: Object.assign({}, X, { memory: m.mem }) };
  if (m.split) self.REVERSI_SPLIT = m.ctl;
  const E = require(path.join(RV, 'engine.js'));
  const ctl = m.ctl;
  parentPort.on('message', j => {
    if (j.type === 'weights') { E.setWeights(new Int16Array(j.buffer), 30); parentPort.postMessage({ type: 'ok' }); return; }
    if (m.id === 0) {
      const r = E.think(j.cells, j.toMove, { cfg: j.cfg, time: 0, noBook: true, variety: false });
      parentPort.postMessage({ type: 'result', move: r.move, score: r.score, exact: r.exact, nodes: r.nodes });
    } else {
      let nodes = 0;
      for (let k = 0; k < 50 && !Atomics.load(ctl, 0); k++) { const r = E.think(j.cells, j.toMove, { cfg: j.cfg, time: 1e9, noBook: true, variety: false, rot: m.id }); nodes += r.nodes || 0; }
      parentPort.postMessage({ type: 'done', nodes });
    }
  });
  return;
}

const [EMP = 22, COUNT = 10, ROUNDS = 1, MODES = '1,2lazy,2split'] = process.argv.slice(2);
const raw = zlib.gunzipSync(fs.readFileSync(path.join(RV, 'weights.bin.gz')));
const W = new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2);
const SLOT = 2 << 20;

async function makePool(n, split) {
  const module = new WebAssembly.Module(fs.readFileSync(path.join(RV, 'engine_mt.wasm')));
  const mem = new WebAssembly.Memory({ initial: 1024, maximum: 16384, shared: true });
  const X = new WebAssembly.Instance(module, { env: { memory: mem, now: () => Date.now() } }).exports;
  const base = Math.ceil(X.mt_heap_base() / 65536) * 65536, need = base + (n + 1) * SLOT;
  if (need > mem.buffer.byteLength) mem.grow(Math.ceil((need - mem.buffer.byteLength) / 65536));
  X.mt_stack(base + n * SLOT + SLOT - 16); X.mt_thread(base + n * SLOT);
  if (X.w_defer) X.w_defer(); X.init();
  const ctl = new Int32Array(new SharedArrayBuffer(512));
  const ws = [];
  for (let id = 0; id < n; id++) ws.push(new Worker(__filename, { workerData: { module, mem, id, tls: base + id * SLOT, top: base + id * SLOT + SLOT - 16, ctl, split } }));
  for (const w of ws) await new Promise(res => { w.once('message', res); const b = new Int16Array(W); w.postMessage({ type: 'weights', buffer: b.buffer }, [b.buffer]); });
  return {
    X, ctl, ws,
    solve(cells, toMove, cfg) {
      X.clear_tt(); X.mt_stop(0); Atomics.store(ctl, 0, 0);
      return new Promise(resolve => {
        const t0 = process.hrtime.bigint(); let left = ws.length, res = null, hn = 0;
        ws.forEach((w, i) => {
          w.removeAllListeners('message');
          w.on('message', m => {
            if (m.type === 'result') { res = m; res.ms = Number(process.hrtime.bigint() - t0) / 1e6; Atomics.store(ctl, 0, 1); X.mt_stop(1); }
            else if (m.type === 'done') hn += m.nodes;
            if (--left === 0) resolve(Object.assign(res, { helperNodes: hn }));
          });
          w.postMessage({ cells, toMove, cfg });
        });
      });
    },
    close() { ws.forEach(w => w.terminate()); },
  };
}

function positions() {
  const E = require(path.join(RV, 'engine.js')); E.setWeights(W, 30);
  const { legal, play, start } = require('./eng-lite.js');
  let s0 = 777; const rnd = () => { s0 ^= s0 << 13; s0 >>>= 0; s0 ^= s0 >> 17; s0 ^= s0 << 5; s0 >>>= 0; return s0 / 4294967296; };
  const out = [];
  while (out.length < +COUNT) {
    let c = start(), s = 1, ok = true;
    for (let i = 0; i < 8; i++) { const ms = legal(c, s); c = play(c, ms[Math.floor(rnd() * ms.length)], s); s = 3 - s; }
    for (;;) {
      const emp = c.filter(x => !x).length;
      let ms = legal(c, s);
      if (!ms.length) { s = 3 - s; ms = legal(c, s); if (!ms.length) { ok = false; break; } }
      if (emp === +EMP) break;
      E.clearTT();
      const r = E.think(c, s, { cfg: { depth: 7, exact: 0, mpc: 1 }, noBook: true, variety: false, random: rnd });
      c = play(c, r.move, s); s = 3 - s;
    }
    if (ok && legal(c, s).length > 1) out.push([c, s]);
  }
  return out;
}

(async () => {
  const ps = positions();
  const modes = MODES.split(','), pools = {};
  for (const md of modes) pools[md] = await makePool(parseInt(md), /split/.test(md));
  const cfg = { depth: 60, exact: 64, mpc: 1 };
  const tot = {}, nod = {}; modes.forEach(m => { tot[m] = 0; nod[m] = 0; });
  let mism = 0;
  for (let r = 0; r < +ROUNDS; r++) for (let i = 0; i < ps.length; i++) {
    const row = [];
    const order = (i + r) % 2 ? modes.slice().reverse() : modes;   // (alternate the order)
    const got = {};
    for (const md of order) { const x = await pools[md].solve(ps[i][0], ps[i][1], cfg); got[md] = x; tot[md] += x.ms; nod[md] += x.nodes + x.helperNodes; }
    const sc = modes.map(m => got[m].score);
    if (sc.some(v => v !== sc[0]) || modes.some(m => !got[m].exact)) mism++;
    for (const md of modes) row.push(`${md} ${(got[md].ms / 1000).toFixed(2)}s ${got[md].score > 0 ? '+' : ''}${got[md].score}`);
    console.log(`#${i} ${row.join('  |  ')}`);
  }
  console.log(`残り${EMP}マス ×${ps.length}局面 ×${ROUNDS}: ` + modes.map(m => `${m} ${(tot[m] / 1000).toFixed(1)}s (${(nod[m] / 1e6).toFixed(0)}M nodes)`).join(', ') + `  不一致 ${mism}`);
  for (const m of modes.slice(1)) console.log(`  ${modes[0]} / ${m} = ${(tot[modes[0]] / tot[m]).toFixed(3)}×`);
  Object.values(pools).forEach(p => p.close());
})();

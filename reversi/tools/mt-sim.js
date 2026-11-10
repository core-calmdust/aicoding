// Lazy SMP of the midgame on N threads, simulated on a machine with fewer cores: real worker_threads on one shared memory
// (engine_mt.wasm, as the game page's pool: the lead runs think, the helpers mt-worker.js's loop), but the threads run in
// LOCKSTEP — every 4096 nodes (16384 in the solver) a thread calls the wasm's now() (checkTime), which waits there while
// it is ahead of the slowest running thread. So every thread gets the same speed, as on N equal cores, and the lead's own
// nodes are the clock (MODEL_CARD.md「マルチスレッドの改良 v2」, 2026-11-09).
//   node tools/mt-sim.js [--threads 1,2,4,8] [--budget 3e6] [--pos 8] [--gen 8] [--wasm engine_mt.wasm] [--engine engine.js]
//                        [--ttbits N] [--d0 none|odd|all] [--plan mix|rot|r1|mixd] [--noidle] [--nodes (print the lead's nodes)]
//   node tools/mt-sim.js --end 20 --gen 16 [--threads …]            exact solves (the time = the virtual clock; a thread
//                                                                    waiting in Atomics.wait does not hold the others back)
//   node tools/mt-sim.js --match 4 --games 40 --budget 1e6 --wasmB old.wasm --engineB old.js [--exact 14]
//   --delay (with --wasm, a build of tools/mtsim-delay.py): a thread's table stores and busy marks reach the others only at its
//           next check of the clock — the threads truly at the same time (2026-11-10, MODEL_CARD.md「マルチスレッドの見直し その2」)
//   --slow 0,10,11,12 [--slowstep 5]: those threads (0 = the lead) run at 2/5 of the speed (Apple's efficiency cores, 2026-11-09):
//                                     a fast thread's clock goes 2 per check, a slow one's --slowstep
// Midgame: per position (bench.html's MID, 36 empties, + --gen more from self-play) and thread count, the lead thinks with
// a node budget (its own nodes, cfg.nodes) from an empty table: the depth it finished, the lead's nodes to the common depth,
// the moves. --ttbits: a smaller table (like the Mac's 3 s × many threads). --plan / --d0 / --noidle: the helpers' variants
// (engine.js LAZY). --match: games between two pools at the same lead nodes per move (A = --wasm/--engine, B = …B).
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const RV = process.env.REVERSI_DIR || path.join(__dirname, '..');

if (!isMainThread) {
  const m = workerData, S = m.sync, T = new Int32Array(S, 0, 64), A = new Int32Array(S, 256, 64), E0 = new Int32Array(S, 512, 4);
  const id = m.id, STEP = m.step || 1, MAXSTEP = m.maxstep || 1;
  // a thread waiting on the others (the root split of the solve: Atomics.wait) does not hold them back; when it wakes it
  // goes on from the latest time of the others (the virtual clock = the highest tick)
  const wait0 = Atomics.wait.bind(Atomics);
  Atomics.wait = (arr, i, v, t) => {
    if (arr === E0 || !A[id]) return wait0(arr, i, v, t);
    Atomics.store(A, id, 0); Atomics.add(E0, 0, 1); Atomics.notify(E0, 0);
    const r = wait0(arr, i, v, t);
    let mx = T[id]; for (let k = 0; k < m.n; k++) if (T[k] > mx) mx = T[k];
    T[id] = mx; Atomics.store(A, id, 1);
    return r;
  };
  const now = () => {
    if (A[id]) {
      const t = (T[id] += STEP); Atomics.add(E0, 0, 1); Atomics.notify(E0, 0);
      for (;;) {
        let mn = 1e9; for (let i = 0; i < m.n; i++) if (Atomics.load(A, i) && T[i] < mn) mn = T[i];
        if (t - mn <= MAXSTEP) break;
        Atomics.wait(E0, 0, Atomics.load(E0, 0), 5);
      }
    }
    return Date.now();
  };
  const X = new WebAssembly.Instance(m.module, { env: { memory: m.mem, now } }).exports;
  X.mt_stack(m.top); X.mt_thread(m.tls);
  global.self = { REVERSI_WX: Object.assign({}, X, { memory: m.mem }), REVERSI_SPLIT: m.ctl };
  const E = require(m.engine), ctl = m.ctl;
  if (m.plan && E.LAZY) E.LAZY.plan = m.plan;      // (--plan: the helpers' scheme, engine.js helperPlan)
  if (m.noidle && E.LAZY) E.LAZY.idle = false;     // (--noidle: no help on the root moves still being solved)
  parentPort.on('message', j => {
    if (j.type === 'weights') { E.setWeights(new Int16Array(j.buffer), 30); parentPort.postMessage({ type: 'ok' }); return; }
    T[id] = 0; Atomics.store(A, id, 1);
    if (id === 0) {
      const per = {};
      const r = E.think(j.cells, j.toMove, { cfg: j.cfg, time: 1e9, noBook: true, variety: false }, p => { if (p.depth) per[p.depth] = { nodes: m.step > 1 || m.maxstep > 1 ? T[id] : p.nodes, move: p.move }; });   // (--slow: the clock, not the lead's nodes)
      let mx = 0; for (let k = 0; k < m.n; k++) if (T[k] > mx) mx = T[k];
      Atomics.store(A, id, 0); Atomics.notify(E0, 0);
      parentPort.postMessage({ type: 'result', move: r.move, score: r.score, exact: !!r.exact, depth: r.depth, nodes: r.nodes, per, ticks: mx });
    } else {
      let nodes = 0;
      try {
        for (let k = 0; k < 50 && !Atomics.load(ctl, 0); k++) {
          const r = E.think(j.cells, j.toMove, { cfg: j.hcfg, time: 1e9, noBook: true, variety: false, rot: id, d0: j.d0 === 'odd' ? id & 1 : j.d0 === 'all' ? 1 : j.d0 === 'none' ? 0 : undefined });
          nodes += r.nodes || 0;
        }
      } catch (e) { console.warn(e); }
      Atomics.store(A, id, 0); Atomics.notify(E0, 0);
      parentPort.postMessage({ type: 'done', nodes });
    }
  });
  return;
}

const argv = process.argv.slice(2), opt = {};
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) opt[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
const END = +(opt.end || 0);   // --end E: exact solves at E empties (--gen positions); the time = the virtual clock
const TH = String(opt.threads || '1,2,4,8').split(',').map(Number), BUDGET = +(opt.budget || 3e6), NP = +(opt.pos || 8);
const WASM = path.resolve(opt.wasm || path.join(RV, 'engine_mt.wasm')), ENGINE = path.resolve(opt.engine || path.join(RV, 'engine.js'));
const raw = zlib.gunzipSync(fs.readFileSync(path.join(RV, 'weights.bin.gz')));
const W = new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2);
const MID = ["0000000000100000011220000122221022212200222212002010110000100000b", "0011000000111000011211000022210000222200002222000022220000220000b", "0000000000111100111110001212220012222220102222200000000000000000b", "0001000000011000001111110002111200021120000222220000220000022200b", "0000000000202000002221100002222200021222002122120011210000000100b", "0000000000020120001111110022222202221110020211000001120000000000b", "0001000000211100112220001122220011222220101000000221000000000000b", "0000000000120000221120000212120002222222011111200011100000000000b"];
const dec = s => ({ cells: s.slice(0, 64).split('').map(Number), toMove: s[64] === 'b' ? 1 : 2 });
const SLOT = 2 << 20;
function gen(count, emp) {   // --gen: more positions (self-play of seeded random 8-ply openings at depth 7, as tools/mt-bench.js)
  if (!count) return [];
  const E = require(ENGINE); E.setWeights(W, 30);
  const { legal, play, start } = require(path.join(RV, 'tools', 'eng-lite.js'));
  let s0 = 9001; const rnd = () => { s0 ^= s0 << 13; s0 >>>= 0; s0 ^= s0 >> 17; s0 ^= s0 << 5; s0 >>>= 0; return s0 / 4294967296; };
  const out = [];
  while (out.length < count) {
    let c = start(), s = 1, ok = true;
    for (let i = 0; i < 8; i++) { const ms = legal(c, s); c = play(c, ms[Math.floor(rnd() * ms.length)], s); s = 3 - s; }
    for (;;) {
      let ms = legal(c, s);
      if (!ms.length) { s = 3 - s; ms = legal(c, s); if (!ms.length) { ok = false; break; } }
      if (c.filter(x => !x).length === emp) break;
      E.clearTT();
      const r = E.think(c, s, { cfg: { depth: 7, exact: 0, mpc: 1 }, noBook: true, variety: false, random: rnd });
      c = play(c, r.move, s); s = 3 - s;
    }
    if (ok && legal(c, s).length > 1) out.push({ cells: c, toMove: s });
  }
  return out;
}

async function makePool(n, wasm = WASM, engine = ENGINE) {
  const module = new WebAssembly.Module(fs.readFileSync(wasm));
  const mem = new WebAssembly.Memory({ initial: 1024, maximum: 16384, shared: true });
  const X = new WebAssembly.Instance(module, { env: { memory: mem, now: () => Date.now() } }).exports;
  const base = Math.ceil(X.mt_heap_base() / 65536) * 65536, need = base + (n + 1) * SLOT;
  if (need > mem.buffer.byteLength) mem.grow(Math.ceil((need - mem.buffer.byteLength) / 65536));
  X.mt_stack(base + n * SLOT + SLOT - 16); X.mt_thread(base + n * SLOT);
  X.init();
  if (opt.ttbits && X.tt_bits) X.tt_bits(+opt.ttbits);
  if (opt.delay) { if (!X.sim_delay) throw new Error('--delay needs a build of tools/mtsim-delay.py (--wasm)'); X.sim_delay(n > 1 ? 1 : 0, n > 1 ? 1 : 0); }
  const ctl = new Int32Array(new SharedArrayBuffer(512)), sync = new SharedArrayBuffer(1024);
  const ws = [];
  const SLOW = new Set(String(opt.slow || '').split(',').filter(x => x !== '').map(Number)), SST = +(opt.slowstep || 5), het = SLOW.size > 0;
  for (let id = 0; id < n; id++) ws.push(new Worker(__filename, { workerData: { module, mem, id, n, tls: base + id * SLOT, top: base + id * SLOT + SLOT - 16, ctl, sync, engine, plan: opt.plan, noidle: !!opt.noidle,
    step: het ? (SLOW.has(id) ? SST : 2) : 1, maxstep: het ? SST : 1 } }));
  for (const w of ws) await new Promise(res => { w.once('message', res); const b = new Int16Array(W); w.postMessage({ type: 'weights', buffer: b.buffer }, [b.buffer]); });
  return {
    run(p, game) {
      if (!game) X.clear_tt();
      X.mt_stop(0); Atomics.store(ctl, 0, 0);
      const cfg = game ? game.cfg : END ? { depth: 60, exact: 64, mpc: 1 } : { depth: 60, exact: 0, mpc: 1, nodes: BUDGET };
      const hcfg = game ? game.hcfg : END ? { depth: 60, exact: 64, wld: 66, mpc: 1 } : { depth: 60, exact: 0, wld: 2, mpc: 1 };
      return new Promise(resolve => {
        let left = ws.length, res = null, hn = 0;
        ws.forEach(w => {
          w.removeAllListeners('message');
          w.on('message', m => {
            if (m.type === 'result') { res = m; Atomics.store(ctl, 0, 1); X.mt_stop(1); }
            else if (m.type === 'done') hn += m.nodes;
            if (--left === 0) resolve(Object.assign(res, { helperNodes: hn }));
          });
          w.postMessage({ cells: p.cells, toMove: p.toMove, cfg, hcfg, d0: opt.d0 });
        });
      });
    },
    clear() { X.clear_tt(); },
    close() { ws.forEach(w => w.terminate()); },
  };
}

// --match N: games between two pools of N threads each at the same budget of lead nodes per move (the virtual clock):
// A = --wasm / --engine (default: this folder's), B = --wasmB / --engineB. Seeded random 8-ply openings, each played twice.
async function match() {
  const n = +opt.match, G = +(opt.games || 20), { legal, play, start } = require(path.join(RV, 'tools', 'eng-lite.js'));
  const A = await makePool(n), B = await makePool(n, path.resolve(opt.wasmB), path.resolve(opt.engineB || ENGINE));
  const ex = +(opt.exact || 14), game = { cfg: { depth: 60, exact: ex, mpc: 1, nodes: BUDGET }, hcfg: { depth: 60, exact: ex, wld: ex + 2, mpc: 1 } };
  let s0 = 31337; const rnd = () => { s0 ^= s0 << 13; s0 >>>= 0; s0 ^= s0 >> 17; s0 ^= s0 << 5; s0 >>>= 0; return s0 / 4294967296; };
  let w = 0, d = 0, l = 0, disc = 0, op = null;
  for (let g = 0; g < G; g++) {
    if (g % 2 === 0) { let c = start(), s = 1; for (let i = 0; i < 8; i++) { let ms = legal(c, s); if (!ms.length) { s = 3 - s; ms = legal(c, s); } c = play(c, ms[Math.floor(rnd() * ms.length)], s); s = 3 - s; } op = { c, s }; }
    let c = op.c.slice(), s = op.s, passes = 0;
    const aSide = g % 2 ? 2 : 1;   // A plays black in even games
    A.clear(); B.clear();
    while (passes < 2) {
      const ms = legal(c, s);
      if (!ms.length) { passes++; s = 3 - s; continue; }
      passes = 0;
      const r = await (s === aSide ? A : B).run({ cells: c, toMove: s }, game);
      c = play(c, ms.includes(r.move) ? r.move : ms[0], s); s = 3 - s;
    }
    const me = c.filter(x => x === aSide).length, op2 = c.filter(x => x === 3 - aSide).length;
    disc += me - op2; if (me > op2) w++; else if (me < op2) l++; else d++;
    const sc = (w + d / 2) / (g + 1), elo = sc > 0 && sc < 1 ? -400 * Math.log10(1 / sc - 1) : NaN;
    console.log(`game ${g + 1}: A ${me}-${op2}  total A ${w}W ${d}D ${l}L (${(sc * 100).toFixed(1)}%, ${elo.toFixed(0)} Elo, discs ${(disc / (g + 1)).toFixed(1)})`);
  }
  A.close(); B.close();
}

(async () => {
  if (opt.match) return match();
  const P = (END ? [] : MID.slice(0, NP).map(dec)).concat(gen(+(opt.gen || 0), END || +(opt.empties || 36))), R = {};
  for (const n of TH) {
    const pool = await makePool(n); R[n] = [];
    for (let i = 0; i < P.length; i++) { const t0 = Date.now(); const r = await pool.run(P[i]); r.wall = Date.now() - t0; R[n].push(r); }
    pool.close();
    console.log(`t${n}: ${END ? 'scores ' + R[n].map(r => r.exact ? r.score : 'x').join(',') : 'depths ' + R[n].map(r => r.depth).join(',') + (opt.nodes ? '  lead nodes per depth ' + R[n].map(r => Object.keys(r.per).map(d => d + ':' + r.per[d].nodes + ':' + r.per[d].move).join(' ')).join(' | ') : '')}  (${(R[n].reduce((a, r) => a + r.wall, 0) / 1000).toFixed(0)} s)`);
  }
  if (END) {
    const b = TH[0], tk = n => R[n].reduce((a, r) => a + r.ticks, 0), nd = n => R[n].reduce((a, r) => a + r.nodes + r.helperNodes, 0);
    for (const n of TH) {
      const same = R[n].filter((r, i) => r.score === R[b][i].score && r.exact).length;
      const geo = Math.exp(R[n].reduce((a, r, i) => a + Math.log(R[b][i].ticks / Math.max(1, r.ticks)), 0) / P.length);
      console.log(`threads ${n}: time x${(tk(b) / tk(n)).toFixed(2)} (geomean x${geo.toFixed(2)})  nodes x${(nd(n) / nd(b)).toFixed(2)}  same score ${same}/${P.length}`);
    }
    return;
  }
  const b = TH[0], common = P.map((_, i) => Math.min(...TH.map(n => Math.max(0, ...Object.keys(R[n][i].per).map(Number)))));
  // the first depth at or beyond the common one (the lead may take a helper's deeper result and skip depths)
  const at = (n, i) => { const ks = Object.keys(R[n][i].per).map(Number).filter(d => d >= common[i]).sort((x, y) => x - y); return R[n][i].per[ks[0]] || {}; };
  const ttd = n => P.reduce((a, _, i) => a + (at(n, i).nodes || 0), 0);
  for (const n of TH) {
    const avg = R[n].reduce((a, r) => a + r.depth, 0) / P.length;
    const agree = P.filter((_, i) => at(n, i).move === at(b, i).move).length;
    const work = R[n].reduce((a, r) => a + r.nodes + r.helperNodes, 0) / R[b].reduce((a, r) => a + r.nodes + r.helperNodes, 0);
    const geo = Math.exp(P.reduce((a, _, i) => a + Math.log((at(b, i).nodes || 1) / (at(n, i).nodes || 1)), 0) / P.length);
    console.log(`threads ${n}: avg depth ${avg.toFixed(2)}  time to common depth x${(ttd(b) / ttd(n)).toFixed(2)} (geomean x${geo.toFixed(2)})  agree ${agree}/${P.length}  all nodes x${work.toFixed(2)}`);
  }
  console.log('common depths', common.join(','), ' budget', BUDGET, 'lead nodes', opt.ttbits ? 'ttbits ' + opt.ttbits : '');
})();

// Simulated multi-thread speed-up of the shared/mtsplit.js search (the common rule「本編のマルチスレッド」, 2026-11-09).
// The work machine has 2 shared cores, so the threads are simulated: N copies of the game's engine.js (each its own module
// state), a discrete-event clock in NODES (each task costs its node count + an overhead per message), and the real driver
// MTSplit.ladder.drive from shared/mtsplit.js. Time to finish the same fixed-depth search = the speed-up.
//
//   node shared/tools/mtsim.js <game> [--threads 1,2,4,8] [--depth N] [--ana N] [--pos K] [--ovh 300]
//   game: ugolki | agon | konane (positions as in <game>/bench.html: Lv.6 vs Lv.6 / Lv.7 vs Lv.7, every 10 plies)
// Modes:
//   split    the workers' own tables (non-shared mode; a dropped task still runs to its end, unheard)
//   shared   one table for all (shared/mttt.js; a dropped task stops at once). Bounds: "opt" = a task's table entries are
//            seen by the others from the moment it starts, "pes" = only once it has finished (a dropped task's: never).
//            The real browser is in between (entries appear while the task runs).
//   lazy     Lazy SMP on the shared table (every thread runs the whole iterative deepening; helpers search depth + (i & 1)
//            and from a rotated root order; the time is the main thread's when it finishes) — simulated in slices of
//            `--slice` nodes by running the threads one after another per depth (an approximation: a helper's entries of
//            depth d are seen by the main thread's depth d).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2), opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const GAME = args[0] || 'ugolki';
const THREADS = (opt('threads') || '1,2,4,8').split(',').map(Number);
const OVH = +(opt('ovh') || 300);
const MODES = (opt('modes') || 'split,opt,pes').split(',');
const CFG = {
  ugolki: { glob: 'UgolkiEngine', rule: 'c33', depth: 8, ana: 6 },
  agon: { glob: 'AgonEngine', rule: 'std', depth: 7, ana: 5 },
  konane: { glob: 'KonaneEngine', rule: 's8', depth: 11, ana: 8 },
}[GAME];
if (opt('depth')) CFG.depth = +opt('depth');
if (opt('ana')) CFG.ana = +opt('ana');
const SRC = fs.readFileSync(path.join(ROOT, GAME, 'engine.js'), 'utf8');
const MTTT = require(path.join(ROOT, 'shared', 'mttt.js'));
function engine() { const sb = { module: { exports: {} }, console }; vm.createContext(sb); vm.runInContext(SRC, sb); return sb.module.exports; }
// shared/mtsplit.js's drivers, without the page
function mtsplit() {
  const sb = { window: {}, navigator: { hardwareConcurrency: 8, userAgent: 'node' }, matchMedia: () => ({ matches: true }), localStorage: null, addEventListener() {}, document: { readyState: 'complete', getElementById: () => null, documentElement: {} }, Worker: function () {}, console, performance, setTimeout, clearTimeout, Promise };
  sb.self = sb; vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared', 'mtsplit.js'), 'utf8'), sb);
  return sb.window.MTSplit;
}
const MS = mtsplit();
function handle(E, m) {
  E.setRule(m.rule);
  if (m.type === 'mtplan') return E.mtPlan(m);
  if (m.type === 'mtv') return E.mtV(m);
  if (m.type === 'mtkids') return E.mtKids(m);
  if (m.type === 'mtpv') return { pv: E.pvOf(m.start, m.moves, m.m, m.plies) };
  if (m.type === 'mtfin') return E.mtFin(m);
  throw new Error(m.type);
}
// a worker's view of the shared table in the pessimistic bound: its own entries in an overlay until the task ends
function lagged(base) {
  const own = new Map(); let log = [];
  const W = {
    get salt() { return base.salt; }, set salt(v) { base.salt = v; },
    begin() {}, stopped: () => false,
    get(k1, k2) { const o = own.get(k1 + ':' + ((k2 ^ base.salt) | 0)); if (o) { const E = base.E; E.h2 = k2; E.d = o[0]; E.v = o[1]; E.f = o[2]; E.m = o[3]; E.x = E.ply = E.rs = o[4]; return E; } return base.get(k1, k2); },
    put(k1, k2, d, v, f, m, x) { own.set(k1 + ':' + ((k2 ^ base.salt) | 0), [d, v, f, m, x]); log.push([k1, k2, d, v, f, m, x, base.salt]); },
    commit() { const s = base.salt; for (const e of log) { base.salt = e[7]; base.put(e[0], e[1], e[2], e[3], e[4], e[5], e[6]); } base.salt = s; W.discard(); },
    discard() { own.clear(); log = []; },
  };
  return W;
}
const flush = () => new Promise(r => setImmediate(r));
// one job on n simulated workers → { nodes (all), time (virtual), result }
async function simulate(n, mode, msg, patchPlan) {
  const shared = mode === 'opt' || mode === 'pes';
  const table = shared ? new MTTT.Table(new ArrayBuffer(64 << 20), null, 0) : null;
  const W = [];
  for (let i = 0; i < n; i++) { const E = engine(); const sh = mode === 'pes' ? lagged(table) : table; if (sh) E.SH = sh; W.push({ E, sh, task: null, aff: new Set(), free: 0 }); }
  let now = 0, tid = 0, total = 0; const queue = [], events = [];
  const X = { n, nodes: 0, cancelled: false, failed: false,
    exec(m, aff, prio) {
      let res; const p = new Promise(r => { res = r; });
      const q = { id: ++tid, msg: m, aff, prio: prio || 0, resolve: v => { if (res) { const f = res; res = null; f(v); } } };
      p.tid = q.id;
      let k = queue.length; while (k > 0 && queue[k - 1].prio < q.prio) k--;
      queue.splice(k, 0, q); pump(); return p;
    },
    drop(p) {
      const k = queue.findIndex(q => q.id === p.tid); if (k >= 0) { queue.splice(k, 1)[0].resolve(null); return; }
      const w = W.find(x => x.task && x.task.id === p.tid); if (!w) return;
      const ev = events.find(e => e.w === w);
      w.task.resolve(null);
      if (shared && ev) {   // (shared mode: the stop flag frees the worker at once)
        total -= ev.nodes - Math.max(0, now - ev.t0); ev.nodes = 0; ev.t = now; ev.dropped = true;
      } else if (ev) ev.dropped = true;
    },
  };
  function pump() {
    for (let k = 0; k < queue.length;) {
      const free = W.filter(s => !s.task); if (!free.length) break;
      const q = queue[k];
      const s = (q.aff !== undefined && free.find(x => x.aff.has(q.aff))) || free.find(x => !x.aff.size) || free[0];
      queue.splice(k, 1); s.task = q;
      let r = handle(s.E, Object.assign({}, q.msg, { id: q.id }));
      if (q.msg.type === 'mtplan' && r.plan && patchPlan) patchPlan(r.plan);
      const nodes = (r.nodes || 0) + OVH;
      total += nodes; X.nodes += r.nodes || 0;
      events.push({ t: now + nodes, t0: now, nodes, w: s, q, r });
    }
  }
  let result, done = false;
  const job = MS.ladder.drive(msg, X, null).then(r => { result = r; done = true; });
  await flush();
  while (!done) {
    if (!events.length) { await flush(); if (!events.length && !done) throw new Error('stuck'); continue; }
    events.sort((a, b) => a.t - b.t);
    const ev = events.shift(); now = Math.max(now, ev.t);
    const s = ev.w; s.task = null; if (ev.q.aff !== undefined) s.aff.add(ev.q.aff);
    if (s.sh && s.sh.commit) { if (ev.dropped) s.sh.discard(); else s.sh.commit(); }
    if (!ev.dropped) ev.q.resolve(ev.r);
    pump();
    await flush(); await flush();
  }
  await job;
  return { time: now, nodes: total, result };
}
// Lazy SMP (approximate: depth by depth, every thread's search of the depth in turn; the main thread's nodes = the time)
function lazy(n, msg, D) {
  const table = new MTTT.Table(new ArrayBuffer(64 << 20), null, 0);
  const Es = []; for (let i = 0; i < n; i++) { const E = engine(); E.SH = table; Es.push(E); }
  let lead = 0, all = 0, best = null;
  for (let d = 1; d <= D; d++) {
    for (let i = n - 1; i >= 0; i--) {   // (helpers first: their entries help the main thread of the same depth)
      const E = Es[i], dd = i ? d + (i & 1) : d;
      const r = E.mtLazy(Object.assign({}, msg, { d: dd, rot: i }));
      all += r.nodes; if (!i) { lead += r.nodes; best = r; }
    }
  }
  return { time: lead, nodes: all, result: best };
}
function positions() {
  const E = engine(), out = []; let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  E.setRule(CFG.rule);
  for (let g = 0; g < 2; g++) {
    const moves = [];
    for (let i = 0; i < 60; i++) {
      const { pos } = E.replay(null, moves); if (E.judge(pos).over || !pos.moves().length) break;
      const r = E.think(null, moves, 6 + g, rnd, CFG.rule); if (r.move == null || r.move < 0) break; moves.push(r.move);
      if (i >= 9 && i % 10 === 9) out.push({ name: `g${g + 1}p${moves.length}`, moves: moves.slice() });
    }
  }
  return out.slice(0, +(opt('pos') || 5));
}
(async () => {
  const P = positions(), D = CFG.depth;
  const tests = (opt('tests') || 'best,ana').split(',');
  console.log(`${GAME}: ${P.length} positions, best move to depth ${D}, analysis to depth ${CFG.ana}, overhead ${OVH} nodes / task`);
  for (const test of tests) {
    const sum = {}; let base1 = 0;
    for (const p of P) {
      const msg = test === 'best' ? { type: 'think', start: null, moves: p.moves, rule: CFG.rule, level: 20, cfg: { s: 1, d: 99, dx: D, ms: 6e8 } }
        : { type: 'analyze', start: null, moves: p.moves, rule: CFG.rule, time: 6e8 };
      const sm = opt('splitMin');
      const patch = test === 'ana' ? pl => { pl.maxD = CFG.ana; pl.ms = 0; pl.stopTop = 0; pl.stopAll = false; } : sm ? pl => { pl.splitMin = +sm; } : null;
      // the one-thread worker's own search (no driver), for reference
      if (test === 'best') { const E = engine(); E.setRule(CFG.rule); E.think(null, p.moves, 20, Math.random, CFG.rule); }
      const line = [p.name];
      for (const mode of MODES) for (const n of THREADS) {
        if (mode === 'lazy' && test !== 'best') continue;
        const r = mode === 'lazy' ? lazy(n, { type: 'mtlazy', start: null, moves: p.moves, rule: CFG.rule }, D) : await simulate(n, mode, msg, patch);
        const k = mode + n; (sum[k] = sum[k] || { time: 0, nodes: 0 }); sum[k].time += r.time; sum[k].nodes += r.nodes;
        line.push(`${k}:${(r.time / 1000).toFixed(0)}k`);
      }
      console.log(line.join(' '));
    }
    console.log(`-- ${test} (speed-up vs the same mode on 1 thread; vs split1 in brackets; work = all nodes / split1's)`);
    for (const mode of MODES) {
      const b = sum[mode + '1'], s1 = sum.split1; if (!b) continue;
      console.log(mode.padEnd(6) + THREADS.map(n => { const a = sum[mode + n]; return a ? `${n}: ×${(b.time / a.time).toFixed(2)} [×${(s1.time / a.time).toFixed(2)}] w${(a.nodes / s1.nodes).toFixed(2)}` : ''; }).join('   '));
    }
  }
})().catch(e => { console.error(e); process.exit(1); });

// Lock-step simulation of shared/mtsplit.js on real threads (common rule「本編のマルチスレッド」, 2026-11-10).
// The work machine has 2 shared cores, so N real worker threads (node worker_threads, each the game's own engine.js as in a
// browser Worker, with its WebAssembly core and the SharedArrayBuffer table of shared/mttt.js) are paced in step: every
// time a worker's search polls the clock (Date.now(): every 1024 nodes in the wasm cores, every 32 in Amazons' JS search) it
// waits until every other BUSY worker has polled as often — the same speed for every core, whatever the machine. The
// virtual clock = the number of steps; a worker without a task does not hold the others up. The page side is the real
// MTSplit.pool + MTSplit.ladder.drive of shared/mtsplit.js (priorities, the stop flags, dropped tasks, helpers…), so the
// "busy" share (the workers' time in a task) and the speed-up are those of the browser with equal cores, without the
// messages' latency. Date.now() in the workers and in the driver is the virtual clock (stepMs per step), so timed searches
// (the analysis) run on it too.
//
//   node shared/tools/mtstep.js <game> [--threads 1,2,4,8] [--tests best,ana] [--depth N] [--ana MS] [--pos K]
//        [--modes sh,alt] [--stepms 2.2] [--set key=value,…  (fields merged into the plan, e.g. help=0)]
//        [--slow K:R  (2026-11-11: the K-th worker of a pool and later run at R of the speed, e.g. 8:0.4 = the user's Mac,
//         10 performance + 4 efficiency cores at about 2/5: such a worker takes 1/R steps of the clock per poll)]
//   game: konane | ugolki | agon | amazons (the positions of <game>/bench.html)
'use strict';
const { Worker: TWorker, isMainThread, workerData, parentPort } = require('worker_threads');
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const SLOTS = 128, G0 = 0, NOTE = 1, DONE = 8, ACT = 8 + SLOTS;   // the step array: [0] the step, [1] a counter to wake the pacer, [8+i] worker i's last step, [ACT+i] busy

if (!isMainThread) {
  // ---------------------------------------------------------------- a "browser" worker
  const S = new Int32Array(workerData.step), me = workerData.slot, dir = workerData.dir, T0 = workerData.t0, MS = workerData.stepMs;
  let busy = false;
  const setBusy = v => { if (busy === v) return; busy = v; if (v) Atomics.store(S, DONE + me, Atomics.load(S, G0) - 1); Atomics.store(S, ACT + me, v ? 1 : 0); Atomics.add(S, NOTE, 1); Atomics.notify(S, NOTE); };
  const RATE = workerData.rate || 1; let acc = 0;   // (--slow: a slow core's poll lasts 1/RATE steps of the clock)
  const step = () => {
    const t = Atomics.load(S, G0); let k = 1;
    if (RATE < 1) { acc += 1 / RATE; k = Math.max(1, Math.floor(acc)); acc -= k; }
    Atomics.store(S, DONE + me, t + k - 1); Atomics.add(S, NOTE, 1); Atomics.notify(S, NOTE);
    for (let c = t; c < t + k; c = Atomics.load(S, G0)) Atomics.wait(S, G0, c);
  };
  Date.now = () => { if (busy) step(); return T0 + Atomics.load(S, G0) * MS; };
  global.self = global;
  // (2026-11-11) a Worker's location: the engines read location.search (amazons / ugolki / agon / konane: '?…&mt=1' = the lead of
  // core_mt.wasm's threads) — here a plain worker of mtsplit.js, as the page starts it without the query
  if (!global.location) global.location = { search: '', href: 'file://' + path.join(dir, String(workerData.url)) };
  global.importScripts = (...urls) => { for (const u of urls) { const f = path.resolve(dir, String(u).replace(/\?.*$/, '')); vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f }); } };
  global.postMessage = d => { if (d && d.type !== 'progress') setBusy(false); parentPort.postMessage(d); };
  parentPort.on('message', d => { if (!d || d.type !== 'mtshare') setBusy(true); if (self.onmessage) self.onmessage({ data: d }); });
  importScripts(workerData.url);
  return;
}

// ---------------------------------------------------------------- the page
const args = process.argv.slice(2), opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const GAME = args[0] || 'konane';
const CFG = {
  konane: { glob: 'KonaneEngine', rule: 's8', depth: 11, gen: 'lv6', stepMs: 2.2 },
  ugolki: { glob: 'UgolkiEngine', rule: 'c33', depth: 8, gen: 'lv6', stepMs: 2.2 },
  agon: { glob: 'AgonEngine', rule: 'std', depth: 7, gen: 'lv6', stepMs: 2.2 },
  amazons: { glob: 'AmazonsEngine', rule: null, depth: 6, gen: 'lv9', stepMs: 0.03 },
}[GAME];
if (!CFG) throw new Error('game?');
const THREADS = (opt('threads') || '1,2,4,8').split(',').map(Number);
const TESTS = (opt('tests') || 'best').split(',');
const MODES = (opt('modes') || 'sh').split(',');
const SLOW = (opt('slow') || '').split(':').map(Number), SLOWK = SLOW[0] || 0, SLOWR = SLOW[1] || 1;
let poolBase = 0;   // (the first slot of the current pool: the rank of a worker = its slot − poolBase)
const D = +(opt('depth') || CFG.depth), TA = +(opt('ana') || 1000), STEPMS = +(opt('stepms') || CFG.stepMs);
const SET = {}; (opt('set') || '').split(',').filter(Boolean).forEach(kv => { const [k, v] = kv.split('='); SET[k] = isNaN(+v) ? v : +v; });
const DIR = path.join(ROOT, GAME), URL = 'engine.js';
const step = new SharedArrayBuffer(4 * (8 + 2 * SLOTS)), S = new Int32Array(step);
const T0 = 1.7e12;
let slot = 0, live = new Set();
// the pacer: one step on when every busy worker has done this one
let pacing = true;
(async () => {
  for (;;) {
    if (!pacing) return;
    const n0 = Atomics.load(S, NOTE), g = Atomics.load(S, G0);
    let any = false, all = true;
    for (const i of live) if (Atomics.load(S, ACT + i)) { any = true; if (Atomics.load(S, DONE + i) < g) { all = false; break; } }
    if (any && all) { Atomics.store(S, G0, g + 1); Atomics.notify(S, G0); await null; continue; }
    const w = Atomics.waitAsync(S, NOTE, n0, 50); if (w.async) await w.value;
    await new Promise(r => setImmediate(r));   // (let the page handle the replies first)
  }
})();
const vnow = () => T0 + Atomics.load(S, G0) * STEPMS;
class FakeWorker {
  constructor(url) {
    const rank = slot - poolBase, i = slot++ % SLOTS; this.i = i; live.add(i); Atomics.store(S, ACT + i, 0);
    this.w = new TWorker(__filename, { workerData: { step, slot: i, dir: DIR, url: String(url).replace(/\?.*$/, ''), t0: T0, stepMs: STEPMS, rate: SLOWK && rank >= SLOWK - 1 ? SLOWR : 1 } });
    this.w.on('message', d => { if (this.onmessage) this.onmessage({ data: d }); });
    this.w.on('error', e => { if (this.onerror) this.onerror(e); else console.error(e); });
  }
  postMessage(d) { this.w.postMessage(d); }
  terminate() { live.delete(this.i); Atomics.store(S, ACT + this.i, 0); Atomics.add(S, NOTE, 1); Atomics.notify(S, NOTE); this.w.terminate(); }
}
function mtsplit() {
  const VD = class extends Date {}; VD.now = vnow;
  const sb = { window: {}, navigator: { hardwareConcurrency: 16, userAgent: 'node Chrome/157', deviceMemory: 8 }, matchMedia: () => ({ matches: true }), localStorage: null, addEventListener() {},
    document: { readyState: 'complete', getElementById: () => null, documentElement: {}, currentScript: { src: 'file://' + path.join(ROOT, 'shared', 'mtsplit.js') } },
    Worker: FakeWorker, console, performance: { now: () => Atomics.load(S, G0) * STEPMS }, setTimeout, clearTimeout, Promise, SharedArrayBuffer, Atomics, crossOriginIsolated: true, Date: VD, URL };
  sb.self = sb;
  sb.window.MTEngine = sb.MTEngine = { init() {}, onChange() {}, pref: () => '1', isolated: true, flagged: false, coi: false, set() {}, tx: () => '' };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared', 'mtsplit.js'), 'utf8'), sb);
  sb.window.MTSplit.init({ sw: 'sw.js' });
  return sb.window.MTSplit;
}
const MS = mtsplit();
function engine() { const sb = { module: { exports: {} }, console, require, __dirname: DIR, process, Buffer, atob, globalThis: null }; sb.globalThis = sb; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(DIR, 'engine.js'), 'utf8'), sb, { filename: path.join(DIR, 'engine.js') }); return sb.module.exports; }
function positions() {
  const E = engine(), out = []; let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  if (CFG.rule) E.setRule(CFG.rule);
  for (let g = 0; g < 2; g++) {
    const moves = [];
    for (let i = 0; i < (CFG.gen === 'lv9' ? 40 : 60); i++) {
      const { pos } = E.replay(null, moves); if (E.judge(pos).over || (pos.moves && !pos.moves().length)) break;
      const r = CFG.gen === 'lv9' ? E.think(null, moves, 9 + g, rnd) : E.think(null, moves, 6 + g, rnd, CFG.rule); if (r.move == null || r.move < 0) break; moves.push(r.move);
      if (i >= 9 && i % 10 === 9) out.push({ name: `g${g + 1}p${moves.length}`, moves: moves.slice() });
    }
  }
  return out.slice(0, +(opt('pos') || (CFG.gen === 'lv9' ? 8 : 5)));
}
// the plan's extra fields for this run (--set): the engine's 'mtplan' reply is patched on the way to the driver
function drive(msg, X, prog) {
  if (!Object.keys(SET).length) return MS.ladder.drive(msg, X, prog);
  const ex = X.exec.bind(X);
  X.exec = (m, aff, prio, o) => { const p = ex(m, aff, prio, o); if (m.type !== 'mtplan') return p; const q = p.then(r => { if (r && r.plan) Object.assign(r.plan, SET); return r; }); q.tid = p.tid; return q; };
  return MS.ladder.drive(msg, X, prog);
}
(async () => {
  const P = positions();
  console.log(`${GAME}: ${P.length} positions, best to depth ${D}, analysis ${TA} ms (virtual, ${STEPMS} ms / step), set ${JSON.stringify(SET)}${SLOWK ? `, slow from worker ${SLOWK} at ×${SLOWR}` : ''}`);
  const R = {}; let lastCores = '';
  for (const p of P) for (const test of TESTS) for (const mode of MODES) {
    const row = [`${p.name} ${test} ${mode}`];
    let ref = null;
    for (const n of THREADS) {
      const msg = test === 'best' ? { type: 'think', start: null, moves: p.moves, rule: CFG.rule, level: 20, cfg: { s: 1, d: 99, dx: D, ms: 600000 } }
        : { type: 'analyze', start: null, moves: p.moves, rule: CFG.rule, time: TA };
      if (mode === 'alt') msg.lazy = 1;
      poolBase = slot;
      const pool = MS.pool({ url: URL, drive, tt: true, ttBytes: 32 << 20 });
      const t0 = Atomics.load(S, G0), w0 = Date.now();
      const r = await pool.run(Object.assign({}, msg, { mtThreads: n }), null, 'sim');
      const steps = Atomics.load(S, G0) - t0;
      pool.close(); if (r && r.cores) lastCores = r.cores.join('+');
      await new Promise(res => setTimeout(res, 50));
      if (!r) { row.push(`t${n} failed`); continue; }
      const ans = test === 'best' ? r.move : r.list && r.list[0] && r.list[0].m;
      if (n === THREADS[0]) ref = ans;
      const k = test + '|' + mode + '|' + n, a = R[k] || (R[k] = { steps: 0, nodes: 0, busy: 0, cnt: 0, agree: 0, depth: 0 });
      a.steps += steps; a.nodes += r.nodes || 0; a.busy += r.busy || 0; a.cnt++; if (ans === ref) a.agree++; a.depth += r.depth || 0;
      row.push(`t${n} ${steps}st ${test === 'ana' ? 'd' + r.depth + ' ' : ''}${Math.round((r.nodes || 0) / 1000)}kn b${Math.round((r.busy || 0) * 100)} (${((Date.now() - w0) / 1000).toFixed(0)}s)`);
    }
    console.log(row.join(" | ") + " " + (lastCores || ""));
  }
  for (const test of TESTS) for (const mode of MODES) {
    const b = R[test + '|' + mode + '|' + THREADS[0]]; if (!b) continue;
    console.log(`-- ${test} ${mode}: ` + THREADS.map(n => { const a = R[test + '|' + mode + '|' + n]; if (!a) return ''; return test === 'ana' ? `${n}: d${(a.depth / a.cnt).toFixed(2)} busy ${Math.round(a.busy / a.cnt * 100)}%` : `${n}: x${(b.steps / a.steps).toFixed(2)} busy ${Math.round(a.busy / a.cnt * 100)}% work ${(a.nodes / b.nodes).toFixed(2)} agree ${a.agree}/${a.cnt}`; }).join('   '));
  }
  pacing = false;
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });

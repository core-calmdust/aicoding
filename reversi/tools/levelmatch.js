// Level matches at real time on all threads (for a multi-core Mac; guide: LEVELS-MAC.md).
// Each player is a pool of threads like the game page's (shared/mtengine.js + mt-worker.js): engine_mt.wasm on its own
// shared memory, the lead runs think() with the level's settings, the helpers wait in engine.c mt_idle and take the
// remaining moves at the lead's split points (YBW: engine.js LAZY.plan 'ybw', engine_mt.wasm v4.1 — MODEL_CARD.md
// 「マルチスレッド v4 / v4.1」). Each side has its own pool (its own transposition table). Several games can run at once (--conc).
// Levels 17–25 and T<s> use all the threads of the pool (the page: MT_CFG); levels 14–16 only the lead (the page plays them
// on its one-thread worker), so the whole ladder Lv.14 … Lv.25 can be measured in one run (--plan full).
//
//   node tools/levelmatch.js [run] [--plan default|full|low|adjacent|ladder|L20:L21,T2:T4,…] [--games 40] [--scale 1]
//                                  [--conc 2] [--threads N] [--out tools/levelmatch-out/results-ybw.jsonl] [--dry]
//   node tools/levelmatch.js report [--out …]        the summary to paste back (also written to report.txt)
//
// Players: L<n> = engine.js LEVELS[n] (time and max × scale); T<s> = the Lv.20 shape with a soft time of s seconds
// ({ depth 60, exact 20, wld 22, time s×1000×scale, mpc }), for the Elo per doubling of the time.
// Openings: random lines of the opening book (book.bin; at each ply a move within 0.8 discs of the best, as the levels
// play) up to where the book ends; the same set for every match (seeded), each played twice with the colours swapped.
// Results are appended one line per game; a new run with the same --out continues (games in progress when it was stopped
// are played again). Games of another --scale are kept apart (key: match + scale).
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), os = require('os');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const RV = path.join(__dirname, '..');

// ====================================================================== a thread (worker)
if (!isMainThread) {
  const m = workerData;
  const X = new WebAssembly.Instance(m.module, { env: { memory: m.mem, now: () => Date.now() } }).exports;
  X.mt_stack(m.top); X.mt_thread(m.tls);
  global.self = { REVERSI_WX: Object.assign({}, X, { memory: m.mem }), REVERSI_SPLIT: m.ctl };   // (as mt-worker.js)
  const E = require(path.join(RV, 'engine.js'));
  const ctl = m.ctl;
  parentPort.on('message', j => {
    if (j.type === 'weights') { E.setWeights(new Int16Array(j.buffer), 30); parentPort.postMessage({ type: 'ok' }); return; }
    if (j.type === 'book') { E.setBook(j.book); parentPort.postMessage({ type: 'ok' }); return; }
    if (j.type === 'think') {   // the lead (as the page's think message: opts.cfg = the level's settings, the book on)
      const r = E.think(j.cells, j.toMove, { cfg: j.cfg });
      parentPort.postMessage({ type: 'result', move: r.move, score: r.score, depth: r.depth, exact: !!r.exact, nodes: r.nodes, ms: r.ms, book: !!r.book, forced: !!r.forced });
      return;
    }
    if (j.type === 'help') {    // a helper (as mt-worker.js)
      let nodes = 0;
      try { for (let k = 0; k < 50 && !Atomics.load(ctl, 0); k++) { const r = E.think(j.cells, j.toMove, { cfg: j.cfg, time: 1e9, noBook: true, variety: false, rot: m.id }); nodes += r.nodes || 0; } } catch (e) { console.warn(e); }
      parentPort.postMessage({ type: 'done', nodes });
    }
  });
  return;
}

// ====================================================================== options
const argv = process.argv.slice(2);
const cmd = argv[0] && !argv[0].startsWith('--') ? argv.shift() : 'run';
const opt = {};
for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (!a.startsWith('--')) continue; const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; opt[k] = v; }
const CORES = (os.availableParallelism ? os.availableParallelism() : os.cpus().length) || 2;
const SCALE = +(opt.scale || 1);
const GAMES = Math.max(2, Math.round(+(opt.games || 40) / 2) * 2);
const CONC = Math.max(1, +(opt.conc || (CORES >= 8 ? 2 : 1)));
const THREADS = Math.max(1, +(opt.threads || Math.min(8, Math.floor(CORES / CONC))));   // (the page: 1 + min(cores − 1, 7))
const OUT = path.resolve(opt.out || path.join(__dirname, 'levelmatch-out', 'results-ybw.jsonl'));   // (2026-11-10: a new file for the YBW threads and the gentle low levels; the 2026-11-09 run is results.jsonl)
const PLANS = {
  adjacent: ['L20:L21', 'L21:L22', 'L22:L23', 'L23:L24', 'L24:L25'],
  ladder: ['T2:T4', 'T4:T8', 'T8:T16'],
  low: ['L14:L15', 'L15:L16', 'L16:L17', 'L17:L18', 'L18:L19', 'L19:L20'],   // (Lv.14 = the fixed anchor of the ratings: MODEL_CARD.md)
};
PLANS.default = PLANS.adjacent.concat(PLANS.ladder);
PLANS.full = PLANS.low.concat(PLANS.adjacent, PLANS.ladder);   // the whole ladder Lv.14 … Lv.25 and the time doublings
const planOf = p => (PLANS[p] || String(p).split(',')).map(s => s.trim()).filter(Boolean).map(s => { const [a, b] = s.split(':'); return { id: `${a}-${b}`, a, b }; });
const PLAN = planOf(opt.plan || 'default');

const raw = zlib.gunzipSync(fs.readFileSync(path.join(RV, 'weights.bin.gz')));
const W = new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2);
const BOOK = fs.readFileSync(path.join(RV, 'book.bin'));
const E0 = require(path.join(RV, 'engine.js')); E0.setWeights(W, 30); E0.setBook(BOOK);
const { legal, play, start } = require('./eng-lite.js');

function cfgOf(p, scale) {
  let m;
  if ((m = /^L(\d+)$/.exec(p))) {
    const n = +m[1]; if (n < 14 || !E0.LEVELS[n]) throw new Error(p + ': Lv.14 … Lv.25 (the lower levels play by chance: tools/match.js)');
    const L = Object.assign({}, E0.LEVELS[n]);
    if (L.time) L.time = Math.round(L.time * scale); if (L.max) L.max = Math.round(L.max * scale);
    L.mt = n >= 17;   // (the page: levels 17–25 on the threads, the others on one thread)
    return L;
  }
  if ((m = /^T([\d.]+)$/.exec(p))) return { depth: 60, exact: 20, wld: 22, time: Math.round(+m[1] * 1000 * scale), mpc: 1, mt: true };
  throw new Error('player? ' + p + ' (L14…L25 or T<seconds>)');
}
// rough time used per move (s, scale 1, all threads) for the estimate before any game is played; replaced by the measured times
const USE = { L14: 0.3, L15: 0.1, L16: 0.2, L17: 1.0, L18: 1.4, L19: 1.9, L20: 2.9, L21: 5, L22: 7.5, L23: 10, L24: 12.5, L25: 14.5 };
const useOf = p => USE[p] || (/^T/.test(p) ? 0.58 * +p.slice(1) : 3);
const MOVES_FULL = 13;   // moves per side that use their full time (from the book's end, before the endgame solve)

// ====================================================================== openings: random book lines to the book's end
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function openings(n) {
  const out = [], seen = new Set(), r = rng(20261108);
  for (let tries = 0; out.length < n && tries < n * 50; tries++) {
    let c = start(), s = 1, ply = 0, line = '', short = null;
    for (;;) {
      let ms = legal(c, s);
      if (!ms.length) { s = 3 - s; ms = legal(c, s); if (!ms.length) break; }
      const t = E0.think(c, s, { cfg: { depth: 1, exact: 0, mpc: 1 }, random: r });
      if (!t.book) break;
      c = play(c, t.move, s); s = 3 - s; ply++; line += 'abcdefgh'[t.move & 7] + ((t.move >> 3) + 1);
      if (ply === 6) short = { cells: c.slice(), toMove: s, line };
    }
    const key = c.join('') + s;
    if (ply < 6 || seen.has(key) || !legal(c, s).length) continue;
    seen.add(key); out.push({ cells: c, toMove: s, ply, line, short });
  }
  return out;
}

// ====================================================================== a pool of threads (one player)
const SLOT = 2 << 20;
let MODULE = null;
async function makePool(n) {
  MODULE = MODULE || new WebAssembly.Module(fs.readFileSync(path.join(RV, 'engine_mt.wasm')));
  const module = MODULE;
  const mem = new WebAssembly.Memory({ initial: 1024, maximum: 16384, shared: true });
  const X = new WebAssembly.Instance(module, { env: { memory: mem, now: () => Date.now() } }).exports;
  const base = Math.ceil(X.mt_heap_base() / 65536) * 65536, need = base + (n + 1) * SLOT;
  if (need > mem.buffer.byteLength) mem.grow(Math.ceil((need - mem.buffer.byteLength) / 65536));
  X.mt_stack(base + n * SLOT + SLOT - 16); X.mt_thread(base + n * SLOT, 999);
  X.init();
  const ctl = new Int32Array(new SharedArrayBuffer(512));
  const ws = [];
  for (let id = 0; id < n; id++) ws.push(new Worker(__filename, { workerData: { module, mem, id, tls: base + id * SLOT, top: base + id * SLOT + SLOT - 16, ctl } }));
  const send = (w, msg, tr) => new Promise(res => { w.once('message', res); w.postMessage(msg, tr || []); });
  for (const w of ws) { const b = new Int16Array(W); await send(w, { type: 'weights', buffer: b.buffer }, [b.buffer]); }
  await send(ws[0], { type: 'book', book: new Uint8Array(BOOK) });
  return {
    clear() { X.clear_tt(); },
    think(cells, toMove, cfg) {   // = shared/mtengine.js run() with index.html's help(); cfg.mt false: the lead alone (one thread)
      X.mt_stop(0); Atomics.store(ctl, 0, 0);
      const ex = cfg.exact, hcfg = { depth: 60, exact: ex, wld: cfg.wld || ex + 2, mpc: 1 };
      const use = cfg.mt ? ws : ws.slice(0, 1);
      return new Promise(resolve => {
        const t0 = Date.now(); let left = use.length, res = null, hn = 0;
        use.forEach((w, i) => {
          w.removeAllListeners('message');
          w.on('message', msg => {
            if (msg.type === 'result') { res = msg; res.wall = Date.now() - t0; Atomics.store(ctl, 0, 1); X.mt_stop(1); }
            else if (msg.type === 'done') hn += msg.nodes;
            if (--left === 0) resolve(Object.assign(res, { nodes: res.nodes + hn }));
          });
          w.postMessage(i === 0 ? { type: 'think', cells, toMove, cfg } : { type: 'help', cells, toMove, cfg: hcfg });
        });
      });
    },
    close() { ws.forEach(w => w.terminate()); },
  };
}

// ====================================================================== results and the report
const readRes = () => fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean) : [];
const keyOf = (id, scale, k, aBlack) => `${id}|${scale}|${k}|${aBlack ? 'b' : 'w'}`;
const elo = p => -400 * Math.log10(1 / Math.min(0.999, Math.max(0.001, p)) - 1);
function stats(gs) {   // gs: games of one match (A's view); error from the pairs (same opening, colours swapped) when there are some
  const n = gs.length; if (!n) return null;
  const w = gs.filter(g => g.res === 1).length, d = gs.filter(g => g.res === 0.5).length, s = gs.reduce((a, g) => a + g.res, 0) / n;
  const by = new Map(); gs.forEach(g => { const a = by.get(g.k) || []; a.push(g.res); by.set(g.k, a); });
  const pairs = [...by.values()].filter(a => a.length === 2).map(a => (a[0] + a[1]) / 2);
  let se;
  if (pairs.length >= 4) { const m = pairs.reduce((a, x) => a + x, 0) / pairs.length; se = Math.sqrt(pairs.reduce((a, x) => a + (x - m) ** 2, 0) / (pairs.length - 1) / pairs.length) * Math.sqrt(pairs.length * 2 / n); }   // (scaled to all n games)
  else se = Math.sqrt(gs.reduce((a, g) => a + (g.res - s) ** 2, 0) / Math.max(1, n - 1) / n);
  se = Math.max(se, 0.5 / n);
  const e = elo(s), es = (elo(Math.min(0.999, s + se)) - elo(Math.max(0.001, s - se))) / 2;
  const avg = (k, f) => { const v = gs.map(f || (g => g[k])).filter(x => x > 0); return v.length ? v.reduce((a, x) => a + x, 0) / v.length : 0; };
  return { n, w, d, l: n - w - d, s, se, elo: e, eloSe: es, da: avg(null, g => g.da + 100) - 100, msA: avg('msA'), msB: avg('msB'), maxA: Math.max(...gs.map(g => g.maxA || 0)), maxB: Math.max(...gs.map(g => g.maxB || 0)),
    npsA: avg('npsA'), npsB: avg('npsB'), dA: avg('dA'), dB: avg('dB'), sec: avg('sec'), pairs: [...by.entries()].sort((a, b) => a[0] - b[0]).map(([, a]) => a.reduce((x, y) => x + y, 0)) };
}
const f1 = x => (x >= 0 ? '+' : '') + x.toFixed(0);
function report(rs, full) {
  const L = [];
  const meta = rs.find(r => r.meta) || {};
  const games = rs.filter(r => !r.meta);
  const groups = new Map(); games.forEach(g => { const k = g.id + '|' + g.scale; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(g); });
  L.push(`reversi levelmatch | ${meta.cpu || os.cpus()[0].model} | cores ${meta.cores || CORES} | node ${meta.node || process.version} | threads/game ${meta.threads || THREADS} | conc ${meta.conc || CONC} | ${new Date().toISOString()}`);
  L.push('match            scale  games  W-D-L        score   Elo(A-B) ±1σ   discs  A s/mv (max)  B s/mv (max)  A/B depth  Mnps A/B  min/game');
  const S = {};
  for (const [k, gs] of [...groups.entries()].sort()) {
    const [id, sc] = k.split('|'), x = stats(gs); S[k] = x;
    L.push(`${id.padEnd(16)} ${String(sc).padStart(5)}  ${String(x.n).padStart(5)}  ${`${x.w}-${x.d}-${x.l}`.padEnd(11)} ${(x.s * 100).toFixed(1).padStart(5)}%  ${f1(x.elo).padStart(5)} ±${x.eloSe.toFixed(0).padStart(3)}   ${(x.da >= 0 ? '+' : '') + x.da.toFixed(1)}   ${(x.msA / 1000).toFixed(1).padStart(5)} (${(x.maxA / 1000).toFixed(1)})   ${(x.msB / 1000).toFixed(1).padStart(5)} (${(x.maxB / 1000).toFixed(1)})   ${x.dA.toFixed(1)}/${x.dB.toFixed(1)}  ${(x.npsA / 1e6).toFixed(1)}/${(x.npsB / 1e6).toFixed(1)}  ${(x.sec / 60).toFixed(1)}`);
  }
  // the chain of levels (adjacent matches, the lower level as A: Elo(B) = Elo(A) − Elo(A−B)), Lv.20 = 0
  for (const sc of [...new Set(games.map(g => g.scale))].sort()) {
    const chain = []; let e = 0, v = 0, lv = 20;
    for (;;) { const x = S[`L${lv}-L${lv + 1}|${sc}`]; if (!x) break; e -= x.elo; v += x.eloSe ** 2; lv++; chain.push(`Lv.${lv} ${f1(e)} ±${Math.sqrt(v).toFixed(0)} (step ${f1(-x.elo)})`); }
    if (chain.length) L.push(`chain (scale ${sc}, Lv.20 = 0): ` + chain.join(', '));
    // the whole ladder from Lv.14 (its fixed Elo 1810 on the MODEL_CARD scale) and the rating it suggests (RT_LV = 50 + 0.77 × Elo)
    if (S[`L14-L15|${sc}`]) {
      const full = ['Lv.14 1810 (R 1440)']; let e2 = 1810, v2 = 0;
      for (let n = 14; ; n++) { const x = S[`L${n}-L${n + 1}|${sc}`]; if (!x) break; e2 -= x.elo; v2 += x.eloSe ** 2; full.push(`Lv.${n + 1} ${e2.toFixed(0)} ±${Math.sqrt(v2).toFixed(0)} (R ${Math.round(50 + 0.77 * e2)})`); }
      L.push(`ladder (scale ${sc}, Lv.14 = 1810): ` + full.join(', '));
    }
    const dbl = []; let sw = 0, swx = 0;
    for (const [k, x] of Object.entries(S)) { const m = /^T([\d.]+)-T([\d.]+)\|(.+)$/.exec(k); if (!m || m[3] !== String(sc)) continue; const r = Math.log2(+m[2] / +m[1]); const per = -x.elo / r, ps = x.eloSe / r; dbl.push(`${m[1]}→${m[2]} s ${f1(per)} ±${ps.toFixed(0)}`); sw += 1 / ps ** 2; swx += per / ps ** 2; }
    if (dbl.length) L.push(`Elo per doubling of the time (scale ${sc}): ${dbl.join(', ')}; weighted ${f1(swx / sw)} ±${(1 / Math.sqrt(sw)).toFixed(0)}`);
  }
  if (full) {
    L.push('pairs (A half-points per opening 0–4, both colours, in opening order; a single game ×2):');
    for (const [k, x] of Object.entries(S)) L.push(`  ${k} ${x.pairs.map(v => Math.round(v * 2)).join('')}`);
  }
  return L.join('\n');
}

// ====================================================================== run
async function main() {
  if (cmd === 'report') { const txt = report(readRes(), true); console.log('----- ここからコピー -----\n' + txt + '\n----- ここまで -----'); return; }
  if (cmd !== 'run') { console.log('使い方: node tools/levelmatch.js [run|report] [--plan …] [--games 40] [--scale 1] [--conc 2] [--threads N]'); return; }
  const players = new Set(); PLAN.forEach(p => { players.add(p.a); players.add(p.b); cfgOf(p.a, SCALE); cfgOf(p.b, SCALE); });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  let rs = readRes();
  const done = new Set(rs.filter(r => !r.meta).map(r => keyOf(r.id, r.scale, r.k, r.aBlack)));
  const OP = openings(GAMES / 2);
  if (OP.length < GAMES / 2) console.log(`（定石の終わりの局面は ${OP.length} 通りまで）`);
  const jobs = [];
  for (let k = 0; k < OP.length; k++) for (const p of PLAN) for (const aBlack of [true, false]) if (!done.has(keyOf(p.id, SCALE, k, aBlack))) jobs.push({ p, k, aBlack });
  // the estimate: the measured minutes per game of each match (this scale), else the table above
  const measured = id => { const g = rs.filter(r => r.id === id && r.scale === SCALE && r.sec); return g.length ? g.reduce((a, r) => a + r.sec, 0) / g.length : 0; };
  const est = p => measured(p.id) || MOVES_FULL * (useOf(p.a) + useOf(p.b)) * SCALE + 4;
  const sec = jobs.reduce((a, j) => a + est(j.p), 0) / CONC;
  const hm = s => `${Math.floor(s / 3600)}時間${Math.round(s % 3600 / 60)}分`;
  console.log(`リバーシ レベル対局  CPU ${os.cpus()[0].model}（${CORES} コア）  同時 ${CONC} 局 × ${THREADS} スレッド  時間の倍率 ${SCALE}`);
  console.log(`対局: ${PLAN.map(p => p.id).join(', ')}  各 ${OP.length * 2} 局（定石の終わり ${OP.length} 局面 × 先後）`);
  console.log(`残り ${jobs.length} 局、見込み 約 ${hm(sec)}（1局 ${PLAN.map(p => `${p.id} ${(est(p) / 60).toFixed(1)}分`).join('、')}）`);
  console.log(`結果: ${OUT}（1局ごとに追記。止めても同じコマンドで続きから）`);
  if (opt.dry || !jobs.length) { if (!jobs.length) console.log(report(rs, false)); return; }
  if (!rs.some(r => r.meta)) fs.appendFileSync(OUT, JSON.stringify({ meta: 1, cpu: os.cpus()[0].model, cores: CORES, node: process.version, threads: THREADS, conc: CONC, date: new Date().toISOString() }) + '\n');
  console.log('5秒後に始めます（やめるときは Ctrl+C）…');
  await new Promise(r => setTimeout(r, opt.now ? 0 : 5000));

  const slots = [];
  for (let i = 0; i < CONC; i++) slots.push([await makePool(THREADS), await makePool(THREADS)]);
  const t0 = Date.now(); let next = 0, fin = 0;
  async function playGame(slot, j) {
    const [PA, PB] = slot, op = OP[j.k], ca = cfgOf(j.p.a, SCALE), cb = cfgOf(j.p.b, SCALE);
    PA.clear(); PB.clear();
    // a level without the opening book (Lv.14) plays from the 6th move of the same book line, so the book's worth to the other side counts
    const o = (!ca.mpc || !cb.mpc) && op.short ? op.short : op;
    let c = o.cells.slice(), s = o.toMove, moves = '';
    const st = { A: { ms: 0, n: 0, max: 0, nodes: 0, d: 0, nd: 0 }, B: { ms: 0, n: 0, max: 0, nodes: 0, d: 0, nd: 0 } };
    const g0 = Date.now();
    for (;;) {
      let ms = legal(c, s);
      if (!ms.length) { s = 3 - s; ms = legal(c, s); if (!ms.length) break; }
      const isA = (s === 1) === j.aBlack;
      const r = await (isA ? PA : PB).think(c, s, isA ? ca : cb);
      const x = st[isA ? 'A' : 'B'];
      if (!r.book && !r.forced) { x.ms += r.wall; x.n++; x.max = Math.max(x.max, r.wall); x.nodes += r.nodes; if (!r.exact) { x.d += r.depth; x.nd++; } }
      if (!ms.includes(r.move)) throw new Error('illegal move ' + r.move);
      moves += 'abcdefgh'[r.move & 7] + ((r.move >> 3) + 1);
      c = play(c, r.move, s); s = 3 - s;
    }
    const b = c.filter(x => x === 1).length, w = c.filter(x => x === 2).length, da = j.aBlack ? b - w : w - b;
    const rec = { id: j.p.id, scale: SCALE, k: j.k, aBlack: j.aBlack, da, res: da > 0 ? 1 : da < 0 ? 0 : 0.5,
      msA: Math.round(st.A.ms / Math.max(1, st.A.n)), msB: Math.round(st.B.ms / Math.max(1, st.B.n)), maxA: st.A.max, maxB: st.B.max,
      npsA: Math.round(st.A.nodes / Math.max(1, st.A.ms) * 1000), npsB: Math.round(st.B.nodes / Math.max(1, st.B.ms) * 1000),
      dA: +(st.A.d / Math.max(1, st.A.nd)).toFixed(1), dB: +(st.B.d / Math.max(1, st.B.nd)).toFixed(1), sec: Math.round((Date.now() - g0) / 1000), threads: THREADS, open: o.line, moves };
    fs.appendFileSync(OUT, JSON.stringify(rec) + '\n');
    rs.push(rec); fin++;
    const left = jobs.length - fin, el = (Date.now() - t0) / 1000;
    const eta = jobs.slice(next).reduce((a, q) => a + est(q.p), 0) / CONC;
    console.log(`\n[${fin}/${jobs.length}] ${j.p.id} 定石${j.k + 1}（${j.aBlack ? j.p.a + ' 黒' : j.p.a + ' 白'}）A ${da > 0 ? '勝ち' : da < 0 ? '負け' : '引き分け'} ${da > 0 ? '+' : ''}${da}  ${Math.round(rec.sec / 6) / 10}分  経過 ${hm(el)}  残り ${left} 局 約 ${hm(eta)}`);
    console.log(report(rs, false));
    try { fs.writeFileSync(path.join(path.dirname(OUT), 'report.txt'), report(rs, true) + '\n'); } catch (e) {}
  }
  await Promise.all(slots.map(async slot => { while (next < jobs.length) { const j = jobs[next++]; await playGame(slot, j); } }));
  slots.forEach(s => s.forEach(p => p.close()));
  console.log('\n終わりました。次のコマンドの出力を Claude に貼り付けてください:  node tools/levelmatch.js report');
}
main().catch(e => { console.error(e); process.exit(1); });

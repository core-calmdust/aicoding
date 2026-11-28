// Breakthrough (Dan Troyka, 2000) — rules (for the page) and the AI worker (the search is core.c in WebAssembly).
// Works as a Web Worker (postMessage API), as a plain <script> (window.BreakthroughEngine) and as a Node module.
//
// Board: N×N (8 standard, 7 the original size, 6 the small board), index = r * N + c, r = 0 is the top rank (N), c = 0 is
// file a. White (P1) fills ranks 1–2 and moves first, up the board; Black (P2) fills the top two ranks and moves down.
// A piece moves one square straight forward or diagonally forward onto an empty square, and captures only diagonally
// forward (like a chess pawn; captures are optional and never chained). A player wins by reaching the far rank or by
// capturing every enemy piece. No draws are possible (claude/breakthrough-spec.md「ルール」).
// Moves: m = from + 128 * to (a capture when `to` holds an enemy piece before the move).
(function () {
'use strict';
const P1 = 1, P2 = 2;                 // P1 = White (moves first, from the bottom), P2 = Black
const WIN = 30000, WINT = 29000;
const RULES = { s8: { n: 8 }, s7: { n: 7 }, s6: { n: 6 } };
const RULE_ORDER = ['s8', 's7', 's6'];
let R = null, RK = 's8', N = 8, NN = 64, RC = [], START = new Int8Array(64);
function setRule(k) {
  if (!RULES[k]) k = 's8';
  if (R && RK === k) return;
  RK = k; R = RULES[k]; N = R.n; NN = N * N; RC = []; START = new Int8Array(NN);
  for (let i = 0; i < NN; i++) { const r = (i / N) | 0, c = i % N; RC.push([r, c]); START[i] = r >= N - 2 ? P1 : r < 2 ? P2 : 0; }
  if (WA) WA.x.setup(N);
}
const FILES = 'abcdefghij';
const sqAt = (r, c) => (r < 0 || r >= N || c < 0 || c >= N) ? -1 : r * N + c;
const sqName = i => FILES[i % N] + (N - ((i / N) | 0));
const sqOf = nm => { const c = FILES.indexOf(nm[0]), r = N - parseInt(nm.slice(1), 10); return sqAt(r, c); };
const mv = (f, t) => f + 128 * t;
const mFrom = m => m < 0 ? -1 : m % 128, mTo = m => m < 0 ? -1 : (m / 128) | 0;
const isRemove = () => false;
const hops = () => 1;
// rows a piece of p on square i still has to go (1 = one step from the goal)
const distOf = (i, p) => p === P1 ? RC[i][0] : N - 1 - RC[i][0];

class Pos {
  constructor() { this.sq = new Int8Array(NN); this.side = 0; this.ply = 0; this.reset(); }
  reset() { this.sq.set(START); this.side = 0; this.ply = 0; }
  static from(spec) {
    const p = new Pos();
    if (!spec) return p;
    for (let i = 0; i < NN; i++) { const ch = spec.b[i]; p.sq[i] = ch === 'w' ? P1 : ch === 'b' ? P2 : 0; }
    p.side = spec.side === P2 ? 1 : 0; p.ply = spec.n != null ? spec.n : 0;
    return p;
  }
  clone() { const q = Object.create(Pos.prototype); q.sq = this.sq.slice(); q.side = this.side; q.ply = this.ply; return q; }
  get turn() { return this.side ? P2 : P1; }
  get opening() { return false; }
  at(i) { const x = this.sq[i]; return x === P1 ? 1 : x === P2 ? 3 : 0; }
  owner(i) { return this.sq[i]; }
  count(p) { let n = 0; for (let i = 0; i < NN; i++) if (this.sq[i] === p) n++; return n; }
  movesOf(p) {   // the legal moves of p (whoever is to move)
    const out = [], dr = p === P1 ? -1 : 1;
    for (let i = 0; i < NN; i++) {
      if (this.sq[i] !== p) continue;
      const [r, c] = RC[i], rr = r + dr; if (rr < 0 || rr >= N) continue;
      const f = rr * N + c; if (!this.sq[f]) out.push(mv(i, f));
      for (const dc of [-1, 1]) { const cc = c + dc; if (cc < 0 || cc >= N) continue; const t = rr * N + cc; if (this.sq[t] !== p) out.push(mv(i, t)); }
    }
    return out;
  }
  moves() { return judgeRaw(this) ? [] : this.movesOf(this.turn); }
  mobility(p) { return this.movesOf(p).length; }
  play(m) {
    const f = mFrom(m), t = mTo(m);
    this.sq[t] = this.sq[f]; this.sq[f] = 0; this.side ^= 1; this.ply++;
    return this;
  }
  spec() { let s = ''; for (let i = 0; i < NN; i++) s += '.wb'[this.sq[i]]; return { b: s, side: this.side ? P2 : P1, n: this.ply }; }
  // the most advanced piece of p: its distance to the goal (rows), or 99
  lead(p) { let b = 99; for (let i = 0; i < NN; i++) if (this.sq[i] === p) b = Math.min(b, distOf(i, p)); return b; }
}
function judgeRaw(pos) {
  for (let c = 0; c < N; c++) { if (pos.sq[c] === P1) return { over: true, winner: P1, why: 'goal' }; if (pos.sq[(N - 1) * N + c] === P2) return { over: true, winner: P2, why: 'goal' }; }
  const a = pos.count(P1), b = pos.count(P2);
  if (!a) return { over: true, winner: P2, why: 'wipe' };
  if (!b) return { over: true, winner: P1, why: 'wipe' };
  return null;
}
function judge(pos) {
  const r = judgeRaw(pos); if (r) return r;
  if (!pos.movesOf(pos.turn).length) return { over: true, winner: 3 - pos.turn, why: 'stuck' };   // (cannot happen in Breakthrough: kept for safety)
  return { over: false };
}
const isCap = (pos, m) => m >= 0 && pos.sq[mTo(m)] !== 0 && pos.sq[mTo(m)] !== pos.sq[mFrom(m)];
function path(pos, m) { return [mFrom(m), mTo(m)]; }
function captured(pos, m) { return isCap(pos, m) ? [mTo(m)] : []; }
const isJump = () => false;
function name(pos, m) { if (m < 0) return '—'; return sqName(mFrom(m)) + (isCap(pos, m) ? 'x' : '-') + sqName(mTo(m)); }
function parse(pos, s) {
  const k = String(s).trim().toLowerCase().match(/^([a-h])([1-8])[-x]?([a-h])([1-8])$/); if (!k) return null;
  const f = sqOf(k[1] + k[2]), t = sqOf(k[3] + k[4]); if (f < 0 || t < 0) return null;
  const m = mv(f, t); return pos.moves().includes(m) ? m : null;
}
function replay(start, moves) {
  const pos = Pos.from(start || null);
  for (const m of moves || []) pos.play(m);
  return { pos, hashes: [] };
}

// ---------------------------------------------------------------- the WebAssembly core
let WA = null;
function loadCore() {
  try {
    let b64 = null;
    if (typeof self !== 'undefined' && typeof importScripts === 'function' && typeof window === 'undefined') { importScripts('core-wasm.js?v=2'); b64 = self.BT_WASM; }
    else if (typeof module !== 'undefined' && module.exports && typeof require === 'function') { const g = globalThis, had = 'self' in g, old = g.self; g.self = g; try { require(require('path').join(__dirname, 'core-wasm.js')); b64 = g.BT_WASM; } finally { if (had) g.self = old; else delete g.self; } }
    if (!b64) return;
    const g = typeof self !== 'undefined' ? self : globalThis, list = [b64, g.BT_WASM0];
    for (const s of list) {
      if (!s) continue;
      try {
        const bin = typeof atob === 'function' ? Uint8Array.from(atob(s), c => c.charCodeAt(0)) : Buffer.from(s, 'base64');
        const x = new WebAssembly.Instance(new WebAssembly.Module(bin), { env: { now: () => Date.now() } }).exports, buf = x.memory.buffer;
        WA = { x, sq: new Uint8Array(buf, x.sqp(), 64), io: new Int32Array(buf, x.iop(), 64), rvm: new Int32Array(buf, x.rvmp(), 64), rvv: new Int32Array(buf, x.rvvp(), 64) };
        x.setup(N); return;
      } catch (e) { WA = null; }
    }
  } catch (e) { WA = null; }
}
// (the page itself only needs the rules: the core is loaded in the workers and in Node)
if (!(typeof window !== 'undefined' && typeof document !== 'undefined')) loadCore();
function toCore(pos) { WA.x.setup(N); WA.sq.fill(0); WA.sq.set(pos.sq); WA.io[0] = pos.side; }
let nodes = 0;
function bestMove(pos, maxD, ms, nk) {
  toCore(pos); const mvv = WA.x.ab_best(maxD || 60, ms || 0, (nk || 0) * 1000);
  nodes = WA.x.getn();
  return { move: mvv, v: WA.io[2], depth: WA.io[3] };
}
function rootValues(pos, d, ms, margin) {
  toCore(pos); const n = WA.x.ab_values(d, ms || 0, margin || 60000);
  nodes = WA.x.getn();
  if (n < 0) return null;
  const out = []; for (let i = 0; i < n; i++) out.push({ m: WA.rvm[i], v: WA.rvv[i] });
  out.sort((a, b) => b.v - a.v);
  return out;
}
function evalInfo(pos) {
  toCore(pos); WA.x.ab_eval();
  const io = WA.io; return { v: io[1], run: [io[2], io[3]], lead: [io[4], io[5]], hang: [io[6], io[7]] };
}

// ---------------------------------------------------------------- AI levels (Lv.1 … Lv.20, 天上 21–23)
// weak levels: a shallow look with noise and sometimes a careless move (they never miss a win in one, and never leave a
// win in one to the opponent from Lv.4 on); middle levels a fixed depth; the top levels a time budget.
const LEVELS = [null,
  { d: 1, noise: 220, rnd: 0.6 },        // 1
  { d: 1, noise: 120, rnd: 0.35 },       // 2
  { d: 1, noise: 80, rnd: 0.24 },        // 3
  { d: 2, noise: 80, rnd: 0.16 },        // 4
  { d: 2, noise: 60, rnd: 0.10 },        // 5
  { d: 3, noise: 55, rnd: 0.05 },        // 6
  { d: 3, noise: 30, rnd: 0.03 },        // 7
  { d: 4, noise: 25, rnd: 0.02 },        // 8
  { d: 4, noise: 6 },                    // 9
  { d: 5, noise: 10 },                   // 10
  { d: 5, noise: 2 },                    // 11
  // Lv.12〜20: a node budget (thousands; machine-independent, measured — claude/breakthrough-spec.md「レベル」), capped at 6 s on slow devices
  { s: 1, nk: 25, ms: 6000 },            // 12
  { s: 1, nk: 50, ms: 6000 },            // 13
  { s: 1, nk: 100, ms: 6000 },           // 14
  { s: 1, nk: 200, ms: 6000 },           // 15
  { s: 1, nk: 400, ms: 6000 },           // 16
  { s: 1, nk: 800, ms: 6000 },           // 17
  { s: 1, nk: 1600, ms: 6000 },          // 18
  { s: 1, nk: 3200, ms: 6000 },          // 19
  { s: 1, nk: 6400, ms: 6000 },          // 20
  { s: 1, ms: 5000 },                    // 21 天上Ⅰ
  { s: 1, ms: 10000 },                   // 22 天上Ⅱ
  { s: 1, ms: 20000 },                   // 23 天上Ⅲ
];
function gauss(rand) { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
// every move loses: the slowest loss; among those, the move that takes or blocks the most advanced enemy piece (a real fight)
function resist(pos, list) {
  let top = -Infinity; for (const e of list) top = Math.max(top, e.v);
  const pool = list.filter(e => e.v === top), op = 3 - pos.turn;
  let bm = pool[0].m, bs = -Infinity;
  for (const e of pool) { const t = mTo(e.m), s = (pos.sq[t] === op ? 50 - distOf(t, op) * 5 : 0) - pos.clone().play(e.m).lead(op); if (s > bs) { bs = s; bm = e.m; } }
  return bm;
}
let PRO_CFG = null;
function think(start, moves, level, rand, rule) {
  if (rule) setRule(rule);
  rand = rand || Math.random;
  const L = PRO_CFG || LEVELS[level] || LEVELS[10];
  const { pos } = replay(start, moves);
  const all = pos.moves();
  if (!all.length) return { move: -1 };
  if (all.length === 1) return { move: all[0] };
  if (!L.s) {
    const vals = rootValues(pos, L.d, 3000);
    if (!vals) return { move: all[0] };
    if (vals[0].v < -WINT) return { move: resist(pos, vals), v: vals[0].v };
    if (vals[0].v > WINT && vals[0].v >= WIN - 3) return { move: vals[0].m, v: vals[0].v };   // a win within two moves is never missed
    // a careless move now and then (never one that loses at once)
    if (L.rnd && rand() < L.rnd) { const ok = vals.filter(e => e.v > -(WIN - 3)); if (ok.length) { const e = ok[Math.floor(rand() * ok.length)]; return { move: e.m, v: vals[0].v }; } }
    let best = vals[0].m, bv = -Infinity;
    for (const e of vals) { const x = e.v + (Math.abs(e.v) > WINT ? 0 : gauss(rand) * L.noise); if (x > bv) { bv = x; best = e.m; } }
    return { move: best, v: vals[0].v };
  }
  const r = bestMove(pos, L.dx || 60, L.ms || 0, L.nk || 0);
  if (r.v < -WINT && r.depth > 0) { const vals = rootValues(pos, Math.max(1, Math.min(r.depth, 8)), 800); if (vals && vals.length) return { move: resist(pos, vals), v: r.v, depth: r.depth }; }
  return { move: r.move, v: r.v, depth: r.depth };
}
const kindOf = v => Math.abs(v) > WINT ? 'exact' : 'heur';
function analyze(start, moves, ms, onProgress, rule) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves);
  if (judge(pos).over) return { list: [], depth: 0 };
  const t0 = Date.now(), T = ms || 1000;
  let list = [], depth = 0;
  for (let d = 1; d <= 40; d++) {
    const left = T - (Date.now() - t0); if (left <= 5) break;
    const vals = rootValues(pos, d, left, 250);
    if (!vals) break;
    list = vals.map(e => ({ ...e, kind: kindOf(e.v) })); depth = d;
    if (onProgress) onProgress(list, d);
    if (list.every(e => Math.abs(e.v) > WINT)) break;
    if (Date.now() - t0 > T * 0.4) break;
  }
  if (!list.length) list = pos.moves().map(m => ({ m, v: 0, kind: 'heur' }));
  return { list, depth };
}
function pvOf(start, moves, m, plies) {
  const pv = [], line = moves.concat([m]);
  for (let d = 0; d < (plies || 7); d++) {
    const { pos } = replay(start, line);
    if (judge(pos).over) break;
    const b = bestMove(pos, 6, 60, 0);
    if (b.move == null || b.move < 0) break;
    line.push(b.move); pv.push(b.move);
  }
  return pv;
}
function cands(start, moves, ms, k, plies, onProgress, rule) {
  if (rule) setRule(rule);
  const r = analyze(start, moves, ms, onProgress);
  const list = r.list.slice().sort((a, b) => b.v - a.v).slice(0, k || 5);
  for (const e of list) e.pv = pvOf(start, moves, e.m, plies);
  return { list, depth: r.depth };
}
// ---------------------------------------------------------------- exact solving (puzzles, lessons)
// duelGood(n): the moves of the side to move that force a win within n of its moves (the opponent defending its best)
function duelGood(start, moves, n, rule) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves); if (judge(pos).over) return [];
  toCore(pos); const c = WA.x.duel_good(n); const out = []; for (let i = 0; i < c; i++) out.push(WA.rvm[i]); return out;
}
function duelMin(start, moves, max, rule) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves); if (judge(pos).over) return 0;
  toCore(pos); return WA.x.duel_min(max);
}
// the defender's replies with the number of attacker moves each still needs (0 = no longer a win within maxK)
function duelReplies(start, moves, maxK, rule) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves); if (judge(pos).over) return [];
  toCore(pos); const c = WA.x.duel_replies(maxK); const out = []; for (let i = 0; i < c; i++) out.push({ m: WA.rvm[i], need: WA.rvv[i] }); return out;
}
// the defender's most stubborn reply: one that gets out of the win when it can (0), else the slowest loss; ties: the engine's
// own best value (claude/game-conventions-addendum.md「AIの負け局面での振る舞い」: not the first in move order)
function duelReply(start, moves, n, rule) {
  if (rule) setRule(rule);
  const L = duelReplies(start, moves, n);
  if (!L.length) return { move: null };
  const esc = L.filter(e => e.need === 0), pool = esc.length ? esc : (() => { const mx = Math.max(...L.map(e => e.need)); return L.filter(e => e.need === mx); })();
  if (pool.length === 1) return { move: pool[0].m, need: pool[0].need };
  const { pos } = replay(start, moves), vals = rootValues(pos, 4, 400) || [];
  const val = new Map(vals.map(e => [e.m, e.v]));
  let bm = pool[0].m, bv = -Infinity; for (const e of pool) { const v = val.has(e.m) ? val.get(e.m) : -WIN; if (v > bv) { bv = v; bm = e.m; } }
  return { move: bm, need: (pool.find(e => e.m === bm) || {}).need };
}
// a quick check: does the side to move force a win within k / does every defence lose within k (the side to move defends)
function winIn(pos, k) { toCore(pos); return !!WA.x.win_in(k); }
function lossAfter(pos, k) { toCore(pos); return !!WA.x.loss_after(k); }
function setW(i, v) { if (WA) WA.x.set_w(i, v); }

const API = { P1, P2, WIN, WINT, RULES, RULE_ORDER, setRule, get rule() { return RK; }, get R() { return R; }, get N() { return N; }, get NN() { return NN; },
  get RC() { return RC; }, START: () => START, sqAt, sqName, sqOf, mv, mFrom, mTo, isRemove, hops, distOf, Pos, path, captured, isCap, isJump, name, parse, replay, judge,
  LEVELS, think, analyze, cands, pvOf, duelGood, duelMin, duelReplies, duelReply, winIn, lossAfter, evalInfo, rootValues, bestMove, setW, kindOf,
  get wasm() { return !!WA; }, get nodes() { return nodes; }, ttClear: () => { if (WA) WA.x.ttclear(); } };
setRule('s8');
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof self !== 'undefined' && typeof importScripts === 'function' && typeof window === 'undefined') {
  self.onmessage = e => {
    const m = e.data;
    try {
      setRule(m.rule || 's8');
      if (m.type === 'think') { PRO_CFG = m.cfg || null; try { self.postMessage({ id: m.id, type: 'result', ...think(m.start, m.moves, m.level), nodes }); } finally { PRO_CFG = null; } }
      else if (m.type === 'analyze') { const r = analyze(m.start, m.moves, m.time || 1000, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth })); self.postMessage({ id: m.id, type: 'result', ...r, nodes }); }
      else if (m.type === 'cands') self.postMessage({ id: m.id, type: 'result', ...cands(m.start, m.moves, m.time || 1200, m.k, m.plies, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth })) });
      else if (m.type === 'duel') { const g = duelGood(m.start, m.moves, m.n); self.postMessage({ id: m.id, type: 'result', list: g.map(x => ({ m: x, need: m.n })) }); }
      else if (m.type === 'duelReply') self.postMessage({ id: m.id, type: 'result', ...duelReply(m.start, m.moves, m.n) });
      else if (m.type === 'replies') self.postMessage({ id: m.id, type: 'result', list: duelReplies(m.start, m.moves, m.n) });
      else if (m.type === 'eval') { const { pos } = replay(m.start, m.moves); self.postMessage({ id: m.id, type: 'result', ...evalInfo(pos) }); }
      else if (m.type === 'newgame') { if (WA) WA.x.ttclear(); self.postMessage({ id: m.id, type: 'result' }); }
      else if (m.type === 'mtpv') self.postMessage({ id: m.id, type: 'result', pv: pvOf(m.start, m.moves, m.m, m.plies) });
      else self.postMessage({ id: m.id, type: 'result' });
    } catch (err) { self.postMessage({ id: m.id, type: 'result', error: String(err && err.stack || err) }); }
  };
}
if (typeof window !== 'undefined') window.BreakthroughEngine = API;
})();

// Ultimate Tic-Tac-Toe — rules (for the page) and the AI worker (the search is core.c in WebAssembly, core-wasm.js).
// Works as a Web Worker (postMessage API), as a plain <script> (window.UtttEngine) and as a Node module.
//
// Board: 9 small boards b (0..8, row by row from the top left) × 9 cells c (0..8, the same order). A move m = b * 9 + c.
// The cell c of a move sends the opponent to the small board c. Three in a row on a small board wins it; three won boards in
// a row on the big board win the game. X (P1) moves first.
// Notation: the whole 9 × 9 grid as columns a–i (left to right) and rows 1–9 (bottom to top): the centre is e5.
// Rules (rule keys 'std' or 'r' + three digits, see RULES): fc — sent to a decided board (std: any open board / classic: a won
// board with empty cells must still be played), tie — a drawn small board (std: nobody's / both players'), cnt — no line on the
// big board when nothing is left (std: a draw / the one with more small boards wins).
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const P1 = 1, P2 = 2;                 // P1 = X (moves first), P2 = O
const WIN = 30000, WINT = 29000;
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const LMASK = LINES.map(l => l.reduce((a, i) => a | 1 << i, 0));
const W3 = new Uint8Array(512); for (let m = 0; m < 512; m++) W3[m] = LMASK.some(L => (m & L) === L) ? 1 : 0;
// ---------------------------------------------------------------- rules
const RULES = { std: { fc: 0, tie: 0, cnt: 0 } };
const RULE_ORDER = ['std'];
function ruleOf(k) {
  if (RULES[k]) return RULES[k];
  const x = /^r([01])([01])([01])$/.exec(k || '');
  return x ? { fc: +x[1], tie: +x[2], cnt: +x[3] } : RULES.std;
}
function ruleKey(o) { const k = 'r' + (o.fc ? 1 : 0) + (o.tie ? 1 : 0) + (o.cnt ? 1 : 0); return k === 'r000' ? 'std' : k; }
let RK = 'std', R = RULES.std;
function setRule(k) { const r = ruleOf(k); RK = ruleKey(r); R = r; if (WA) WA.x.setrule(R.fc, R.tie, R.cnt); }
// ---------------------------------------------------------------- geometry
const FILES = 'abcdefghi';
const gcol = m => ((m / 9 | 0) % 3) * 3 + (m % 9) % 3;          // 0..8 left to right
const grow = m => ((m / 27) | 0) * 3 + (((m % 9) / 3) | 0);      // 0..8 top to bottom
const mAt = (row, col) => (((row / 3) | 0) * 3 + ((col / 3) | 0)) * 9 + (row % 3) * 3 + (col % 3);
const sqName = m => m < 0 ? '—' : FILES[gcol(m)] + (9 - grow(m));
const mB = m => (m / 9) | 0, mC = m => m % 9;
// ---------------------------------------------------------------- position
class Pos {
  constructor() { this.c = new Int8Array(81); this.own = new Int8Array(9); this.forced = -1; this.side = 0; this.ply = 0; this.res = -1; }
  // spec: { b: 81 chars '.xo' in move order (board by board), side 1 | 2, n plies, f forced board (-1 any), w: 9 chars '.xod' the
  // owner of each board (optional: recomputed from the marks) } or null (the empty board)
  static from(spec) {
    const p = new Pos();
    if (spec && spec.b) {
      for (let i = 0; i < 81; i++) { const ch = spec.b[i]; p.c[i] = ch === 'x' ? P1 : ch === 'o' ? P2 : 0; }
      p.side = spec.side === P2 ? 1 : 0; p.ply = spec.n != null ? spec.n | 0 : p.c.reduce((a, v) => a + (v ? 1 : 0), 0);
      for (let b = 0; b < 9; b++) {
        const w = spec.w && spec.w[b];
        if (w === 'x') p.own[b] = 1; else if (w === 'o') p.own[b] = 2; else if (w === 'd') p.own[b] = 3;
        else if (!w || w === '?') { const x = p.mask(b, P1), o = p.mask(b, P2); p.own[b] = W3[x] ? 1 : W3[o] ? 2 : (x | o) === 511 ? 3 : 0; }
      }
      const f = spec.f == null ? -1 : spec.f; p.forced = f >= 0 && p.playable(f) ? f : -1;
      p.judgeNow(p.side ^ 1);
    }
    return p;
  }
  clone() { const q = Object.create(Pos.prototype); q.c = this.c.slice(); q.own = this.own.slice(); q.forced = this.forced; q.side = this.side; q.ply = this.ply; q.res = this.res; return q; }
  mask(b, p) { let m = 0; for (let i = 0; i < 9; i++) if (this.c[b * 9 + i] === p) m |= 1 << i; return m; }
  full(b) { for (let i = 0; i < 9; i++) if (!this.c[b * 9 + i]) return false; return true; }
  playable(b) { if (this.full(b)) return false; return R.fc ? true : !this.own[b]; }
  // the boards the side to move may play in
  boards() { if (this.res >= 0) return []; if (this.forced >= 0) return [this.forced]; const o = []; for (let b = 0; b < 9; b++) if (this.playable(b)) o.push(b); return o; }
  moves() { const o = []; for (const b of this.boards()) for (let i = 0; i < 9; i++) if (!this.c[b * 9 + i]) o.push(b * 9 + i); return o; }
  get turn() { return this.side ? P2 : P1; }
  at(i) { return this.c[i]; }
  owner(i) { return this.c[i]; }
  macMask(p) { let m = 0; for (let b = 0; b < 9; b++) if (this.own[b] === p || (R.tie && this.own[b] === 3)) m |= 1 << b; return m; }
  count(p) { let n = 0; for (let b = 0; b < 9; b++) if (this.own[b] === p) n++; return n; }
  judgeNow(mover) {
    const me = mover + 1, op = 3 - me;
    if (W3[this.macMask(me)]) { this.res = me; return; }
    if (W3[this.macMask(op)]) { this.res = op; return; }
    for (let b = 0; b < 9; b++) if (this.playable(b)) { this.res = -1; return; }
    if (R.cnt) { const a = this.count(P1), c = this.count(P2); this.res = a > c ? P1 : c > a ? P2 : 0; } else this.res = 0;
  }
  play(m) {
    const b = mB(m), c = mC(m), p = this.side + 1;
    this.c[m] = p;
    let closed = false;
    if (!this.own[b]) {
      if (W3[this.mask(b, p)]) { this.own[b] = p; closed = true; }
      else if (this.full(b)) { this.own[b] = 3; closed = true; }
    }
    this.forced = this.playable(c) ? c : -1;
    this.side ^= 1; this.ply++;
    if (closed || R.fc) this.judgeNow(p - 1);
    return this;
  }
  spec() { let s = '', w = ''; for (let i = 0; i < 81; i++) s += '.xo'[this.c[i]]; for (let b = 0; b < 9; b++) w += '.xod'[this.own[b]]; return { b: s, side: this.side ? P2 : P1, n: this.ply, f: this.forced, w }; }
  movesOf(p) { return p === P1 ? (this.ply + 1) >> 1 : this.ply >> 1; }
  key() { return this.c.join('') + this.forced + this.side + this.own.join(''); }
}
function name(pos, m) { return sqName(m); }
function parse(pos, s) {
  const x = String(s).toLowerCase().match(/[a-i][1-9]/); if (!x) return null;
  const m = mAt(9 - +x[0][1], FILES.indexOf(x[0][0]));
  return pos.moves().includes(m) ? m : null;
}
function replay(start, moves) { const pos = Pos.from(start); for (const m of moves || []) pos.play(m); return { pos }; }
// game status: { over, winner (1 / 2), draw, why: 'line' | 'count' | 'full' }
function judge(pos) {
  if (pos.res < 0) return { over: false };
  if (pos.res === 0) return { over: true, draw: true, why: 'full' };
  const lineWin = W3[pos.macMask(pos.res)];
  return { over: true, winner: pos.res, why: lineWin ? 'line' : 'count' };
}
// the cells of the winning line of small board b (for drawing), or null
function smallLine(pos, b) { const p = pos.own[b]; if (p !== 1 && p !== 2) return null; const m = pos.mask(b, p); const L = LINES.find((l, k) => (m & LMASK[k]) === LMASK[k]); return L || null; }
function bigLine(pos) { if (pos.res !== 1 && pos.res !== 2) return null; const m = pos.macMask(pos.res); return LINES.find((l, k) => (m & LMASK[k]) === LMASK[k]) || null; }
// ---------------------------------------------------------------- the WebAssembly core
let WA = null;
function loadCore() {
  try {
    if (!G.UT_WASM) {
      if (typeof importScripts === 'function') importScripts(new URL('core-wasm.js?v=1', G.location.href).href);
      else if (typeof require === 'function') { G.self = G.self || G; require('./core-wasm.js'); }
    }
    const b64 = G.UT_WASM; if (!b64) return;
    const bin = typeof atob === 'function' ? Uint8Array.from(atob(b64), ch => ch.charCodeAt(0)) : Buffer.from(b64, 'base64');
    const inst = new WebAssembly.Instance(new WebAssembly.Module(bin), { env: { now: () => Date.now() } });
    const x = inst.exports, mem = x.memory;
    WA = { x, mem, get io() { return new Int32Array(mem.buffer, x.io(), 128); }, get out() { return new Int32Array(mem.buffer, x.out(), 256); } };
    x.setrule(R.fc, R.tie, R.cnt); x.seed((Math.random() * 4294967295) >>> 0);
  } catch (e) { WA = null; if (typeof console !== 'undefined') console.error('uttt core', e); }
}
function toCore(pos) {
  const io = WA.io;
  for (let i = 0; i < 81; i++) io[i] = pos.c[i];
  io[81] = pos.forced; io[82] = pos.side; io[83] = pos.ply;
  for (let b = 0; b < 9; b++) io[84 + b] = pos.own[b];
  WA.x.setpos();
}
let nodes = 0;
// ---------------------------------------------------------------- AI levels (Lv.1 … Lv.20 for people, 21 … 23 天上 = benchmarks)
// d: αβ depth, noise: random spread added to each root move's value (weak levels), nk: thousands of positions, ms: time,
// mc: MCTS (UCT + solver) for that many ms. Steps measured by self-play (claude/uttt-spec.md「AIの強さ」).
const LEVELS = [null,
  { d: 1, noise: 900 },      // 1  (about random, but never misses a win in one move)
  { d: 1, noise: 450 },      // 2
  { d: 2, noise: 300 },      // 3
  { d: 2, noise: 160 },      // 4
  { d: 3, noise: 140 },      // 5
  { d: 3, noise: 70 },       // 6
  { d: 4, noise: 60 },       // 7
  { d: 4, noise: 25 },       // 8
  { d: 5, noise: 25 },       // 9
  { d: 6, noise: 15 },       // 10
  { d: 7, noise: 8 },        // 11
  { s: 1, nk: 20 },          // 12  (thousands of positions)
  { s: 1, nk: 40 },          // 13
  { s: 1, nk: 80 },          // 14
  { s: 1, nk: 160 },         // 15
  { s: 1, nk: 320 },         // 16
  { s: 1, nk: 640 },         // 17
  { s: 1, ms: 700 },         // 18
  { s: 1, ms: 1500 },        // 19
  { s: 1, ms: 3000 },        // 20
  { s: 1, ms: 6000 },        // 21 天上Ⅰ (benchmarks: common rule「天上」, up to 20 s a move)
  { s: 1, ms: 12000 },       // 22 天上Ⅱ
  { s: 1, ms: 19000 },       // 23 天上Ⅲ
];
function gauss(rand) { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function evaluate(pos) { toCore(pos); return WA.x.evalroot(); }
// every root move's value at depth d (full window); null = stopped
function rootValues(pos, d, ms) {
  toCore(pos); const n = WA.x.ab_root(d, ms == null ? 0 : ms); nodes += WA.x.getnodes();
  if (n < 0) return null;
  const o = WA.out, list = []; for (let i = 0; i < n; i++) list.push({ m: o[2 * i], v: o[2 * i + 1] });
  return list.sort((a, b) => b.v - a.v);
}
function bestMove(pos, maxD, ms, nk) {
  toCore(pos); WA.x.ab_best(maxD || 60, ms || 0, nk ? nk * 1000 : 0); nodes += WA.x.getnodes();
  const io = WA.io; return { move: io[0], v: io[1], depth: io[2] };
}
function mcts(pos, ms, iters) {
  toCore(pos); const n = WA.x.mcts(ms || 0, iters || 1e12); const io = WA.io, o = WA.out;
  const list = []; for (let i = 0; i < n; i++) list.push({ m: o[3 * i], n: o[3 * i + 1], w: o[3 * i + 2] });
  return { move: io[0], wr: io[1], proven: io[2], iters: io[3] * 1000, list };
}
// a win rate (‰, mover's view) as an engine value (the same scale as the αβ values: about ±1000 for a clear edge)
const wrV = w => w >= 1000 ? WIN - 40 : w <= 0 ? -(WIN - 40) : Math.round(Math.max(-4000, Math.min(4000, 400 * Math.log(w / (1000 - w)))));
// a lost position (every move loses): the move that loses latest; then the one the evaluation likes best (a human-looking
// defence: it blocks one of the threats rather than playing at random)
function resist(pos, list) {
  let worst = -Infinity; for (const e of list) worst = Math.max(worst, e.v);
  const pool = list.filter(e => e.v === worst);
  let bm = pool[0].m, bs = -Infinity;
  for (const e of pool) { const q = pos.clone().play(e.m); const s = q.res >= 0 ? -1e9 : -evaluate(q); if (s > bs) { bs = s; bm = e.m; } }
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
  nodes = 0;
  if (L.d && !L.s) {
    const vals = rootValues(pos, L.d, 4000) || rootValues(pos, 1, 0);
    if (vals[0].v < -WINT) return { move: resist(pos, vals), v: vals[0].v };
    // a win at once is never missed; otherwise the noisy choice
    if (vals[0].v > WINT && vals[0].v >= WIN - 2) return { move: vals[0].m, v: vals[0].v };   // (a win in one move: every level plays it)
    let best = vals[0].m, bv = -Infinity;
    for (const e of vals) { const x = e.v + (Math.abs(e.v) > WINT ? 0 : gauss(rand) * L.noise); if (x > bv) { bv = x; best = e.m; } }
    return { move: best, v: vals[0].v };
  }
  if (L.mc || L.it) {
    const r = mcts(pos, L.ms || 0, L.it || 0);
    if (r.proven === -1) { const vals = rootValues(pos, 6, 1500) || rootValues(pos, 2, 0); return { move: resist(pos, vals), v: vals[0].v, mc: 1 }; }
    return { move: r.move, v: wrV(r.wr), mc: 1, iters: r.iters };
  }
  const r = bestMove(pos, L.dx || 60, L.nk && L.ms >= 600000 ? 0 : (L.ms || 0), L.nk || 0);
  if (r.v < -WINT && r.depth > 0) { const vals = rootValues(pos, Math.max(1, Math.min(r.depth, 8)), 1500); if (vals) return { move: resist(pos, vals), v: r.v, depth: r.depth }; }
  return { move: r.move, v: r.v, depth: r.depth };
}
const kindOf = v => v > WINT ? 'win' : v < -WINT ? 'loss' : 'heur';
// every move's value by iterative deepening within ms (onProgress after each depth)
function analyze(start, moves, ms, onProgress, rule) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves);
  nodes = 0; const t1 = Date.now() + (ms || 1000);
  let list = [], depth = 0; const n = pos.moves().length;
  if (!n) return { list: [], depth: 0 };
  for (let d = 1; d <= 40; d++) {
    const left = t1 - Date.now(); if (left <= 0 && d > 1) break;
    const vals = rootValues(pos, d, Math.max(1, left));
    if (!vals) break;
    list = vals.map(e => ({ ...e, kind: kindOf(e.v) })); depth = d;
    if (onProgress) onProgress(list, d);
    if (list.every(e => Math.abs(e.v) > WINT)) break;
    if (n === 1 && d >= 4) break;
  }
  if (!list.length) list = (rootValues(pos, 1, 0) || []).map(e => ({ ...e, kind: kindOf(e.v) }));
  return { list, depth };
}
function cands(start, moves, ms, k, plies, onProgress, rule) {
  if (rule) setRule(rule);
  const r = analyze(start, moves, ms, onProgress);
  const list = r.list.slice().sort((a, b) => b.v - a.v).slice(0, k || 5);
  for (const e of list) e.pv = pvOf(start, moves, e.m, plies);
  return { list, depth: r.depth };
}
function pvOf(start, moves, m, plies) {
  const pv = [], { pos } = replay(start, moves); pos.play(m);
  for (let d = 0; d < (plies || 7); d++) {
    if (pos.res >= 0) break;
    const b = bestMove(pos, 7, 40, 0);
    if (b.move == null || b.move < 0) break;
    pos.play(b.move); pv.push(b.move);
  }
  return pv;
}
// ---------------------------------------------------------------- puzzles: the side to move wins the big board within n of its moves
function duelGood(start, moves, n, rule, budget) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves); toCore(pos);
  const c = WA.x.prove_moves(n, budget || 3e7); if (c < 0) return null;
  return Array.from(WA.out.slice(0, c));
}
function duelMin(start, moves, max, rule, budget) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves);
  for (let n = 1; n <= (max || 5); n++) { toCore(pos); const r = WA.x.prove_root(n, budget || 3e7); if (r < 0) return -2; if (r) return n; }
  return -1;
}
// the defender's most stubborn reply: the one after which the attacker needs the most moves; ties → the reply the evaluation
// likes best for the defender
function duelReply(start, moves, n, rule) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves); toCore(pos);
  const c = WA.x.prove_replies(n, 3e7); if (c < 0) return { move: null };
  const o = WA.out, list = []; for (let i = 0; i < c; i++) list.push({ m: o[2 * i], need: o[2 * i + 1] });
  let best = null, bk = -1, be = -Infinity;
  for (const e of list) { const q = pos.clone().play(e.m); const ev = q.res >= 0 ? (q.res === pos.turn ? 1e9 : -1e9) : -evaluate(q); if (e.need > bk || (e.need === bk && ev > be)) { bk = e.need; be = ev; best = e.m; } }
  return { move: best, need: bk, list };
}
function winningMoves(start, moves, rule, n) { return duelGood(start, moves, n || 4, rule); }
loadCore();
setRule('std');
const API = { P1, P2, WIN, WINT, LINES, RULES, RULE_ORDER, ruleOf, ruleKey, setRule, get rule() { return RK; }, get R() { return R; }, N: 9, NN: 81,
  sqName, mAt, gcol, grow, mB, mC, Pos, name, parse, replay, judge, smallLine, bigLine, W3, LMASK,
  LEVELS, think, analyze, cands, pvOf, duelGood, duelMin, duelReply, winningMoves, evaluate, kindOf, mcts, bestMove, rootValues, wrV,
  get core() { return WA; }, get nodes() { return nodes; } };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof self !== 'undefined' && typeof importScripts === 'function' && typeof window === 'undefined') {
  self.onmessage = e => {
    const m = e.data;
    try {
      setRule(m.rule || 'std');
      if (m.type === 'think') { PRO_CFG = m.cfg || null; try { self.postMessage({ id: m.id, type: 'result', ...think(m.start, m.moves, m.level), nodes }); } finally { PRO_CFG = null; } }
      else if (m.type === 'analyze') self.postMessage({ id: m.id, type: 'result', ...analyze(m.start, m.moves, m.time || 1000, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth })) });
      else if (m.type === 'cands') self.postMessage({ id: m.id, type: 'result', ...cands(m.start, m.moves, m.time || 1200, m.k, m.plies, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth })) });
      else if (m.type === 'duel') { const g = duelGood(m.start, m.moves, m.n); self.postMessage({ id: m.id, type: 'result', list: g ? g.map(x => ({ m: x, need: m.n })) : null }); }
      else if (m.type === 'duelReply') self.postMessage({ id: m.id, type: 'result', ...duelReply(m.start, m.moves, m.n) });
      else if (m.type === 'win') self.postMessage({ id: m.id, type: 'result', list: winningMoves(m.start, m.moves, null, m.n) });
      else if (m.type === 'newgame') { if (WA) WA.x.ttclear(); self.postMessage({ id: m.id, type: 'result' }); }
      else self.postMessage({ id: m.id, type: 'result' });
    } catch (err) { self.postMessage({ id: m.id, type: 'result', error: String(err && err.stack || err) }); }
  };
}
if (typeof window !== 'undefined') window.UtttEngine = API;
})();

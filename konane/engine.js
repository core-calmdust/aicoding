// Kōnane (Hawaiian jumping game) — rules (for the page) and the AI worker (plain JS search).
// Works as a Web Worker (postMessage API), as a plain <script> (window.KonaneEngine) and as a Node module.
//
// Board: N×N squares (6, 8 or 10), index = r * N + c, r = 0 is the top rank (N), c = 0 is file a. The board starts full,
// black and white stones alternating like a checkerboard (a1 is black). Black (P1) moves first.
// Opening: Black removes one of its own stones — from a corner or from the central 2×2 (Wikipedia; likonane.org).
// White then removes one of its own stones orthogonally next to that empty square.
// After that every move is a capture: a stone jumps orthogonally over an adjacent enemy stone onto the empty square just
// beyond; it may go on jumping in the SAME direction only, and may stop after any jump. The first player who cannot
// capture loses (no draws).
// Moves: m = from + 128 * to. An opening removal has from === to. A jump's direction and length follow from from / to.
(function () {
'use strict';
const P1 = 1, P2 = 2;                 // P1 = Black (moves first), P2 = White
const WIN = 30000, WINT = 29000, PASS = -2;
// ---------------------------------------------------------------- board sizes
const RULES = {
  s8: { n: 8 },
  s6: { n: 6 },
  s10: { n: 10 },
};
const RULE_ORDER = ['s8', 's6', 's10'];
let R = null, RK = 's8', N = 8, NN = 64;
let COLOR = new Int8Array(64);        // the stone a square holds at the start (1 Black, 2 White)
let RC = [], RAYS = [], OPEN1 = [];   // RAYS[i][d] = squares from i in direction d; OPEN1 = Black's legal first removals
let ADJ = [];
function setRule(k) {
  if (!RULES[k]) k = 's8';
  if (R && RK === k) return;
  RK = k; R = RULES[k]; N = R.n; NN = N * N;
  COLOR = new Int8Array(NN); RC = []; RAYS = []; ADJ = [];
  for (let i = 0; i < NN; i++) {
    const r = (i / N) | 0, c = i % N;
    RC.push([r, c]);
    COLOR[i] = ((r + c) & 1) === ((N - 1) & 1) ? P1 : P2;     // a1 (r = N-1, c = 0) is Black
    const rays = [], adj = [];
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const ray = []; let rr = r + dr, cc = c + dc;
      while (rr >= 0 && rr < N && cc >= 0 && cc < N) { ray.push(rr * N + cc); rr += dr; cc += dc; }
      rays.push(ray); if (ray.length) adj.push(ray[0]);
    }
    RAYS.push(rays); ADJ.push(adj);
  }
  const h = N / 2, cand = [0, N - 1, NN - N, NN - 1, (h - 1) * N + h - 1, (h - 1) * N + h, h * N + h - 1, h * N + h];
  OPEN1 = cand.filter(i => COLOR[i] === P1).sort((a, b) => a - b);
  initZobrist();
  waRule();
}
// ---------------------------------------------------------------- geometry helpers (the page uses these)
const FILES = 'abcdefghij';
const sqAt = (r, c) => (r < 0 || r >= N || c < 0 || c >= N) ? -1 : r * N + c;
const sqName = i => FILES[i % N] + (N - ((i / N) | 0));
const mv = (f, t) => f + 128 * t;
const mFrom = m => m < 0 ? -1 : m % 128, mTo = m => m < 0 ? -1 : (m / 128) | 0;
const isRemove = m => m >= 0 && mFrom(m) === mTo(m);
// zobrist (two 32-bit halves)
let Z1 = [[], []], Z2 = [[], []], ZS1 = 0, ZS2 = 0;
function initZobrist() {
  let zs = 0x2545F491 ^ (N * 7919);
  const zr = () => { zs ^= zs << 13; zs >>>= 0; zs ^= zs >>> 17; zs ^= zs << 5; zs >>>= 0; return zs; };
  Z1 = [[], []]; Z2 = [[], []];
  for (let k = 0; k < 2; k++) for (let i = 0; i < NN; i++) { Z1[k].push(zr()); Z2[k].push(zr()); }
  ZS1 = zr(); ZS2 = zr();
}

// ---------------------------------------------------------------- the WebAssembly search (core.c → core-wasm.js, tools/build-core.sh)
// search() runs in core.c — the same algorithm, order, table and counters (tools/check_wasm.js), several times faster.
// Loaded synchronously in a worker and in Node; the page itself and any failure use the JS search below.
let WA = null;
function loadCore() {
  try {
    let b64 = null;
    if (typeof self !== 'undefined' && typeof importScripts === 'function' && typeof window === 'undefined') { importScripts('core-wasm.js?v=1'); b64 = self.KN_WASM; }
    else if (typeof module !== 'undefined' && module.exports && typeof require === 'function') { const g = globalThis, had = 'self' in g, old = g.self; g.self = g; try { require(require('path').join(__dirname, 'core-wasm.js')); b64 = g.KN_WASM; } finally { if (had) g.self = old; else delete g.self; } }
    if (!b64 || (typeof process !== 'undefined' && process.env && process.env.KN_NOWASM)) return;
    const bin = typeof atob === 'function' ? Uint8Array.from(atob(b64), c => c.charCodeAt(0)) : Buffer.from(b64, 'base64');
    let io = null;
    const env = {
      poll: () => (Date.now() > tEnd || (SH !== null && SH.stopped())) ? 1 : 0,
      shget: (h1, h2) => { const e = SH.get(h1 >>> 0, h2 >>> 0); if (!e) return 0; io[0] = e.d; io[1] = e.f; io[2] = e.v; io[3] = e.m; return 1; },
      shput: (h1, h2, d, v, f, m) => { SH.put(h1 >>> 0, h2 >>> 0, d, v, f, m, 0); },
    };
    const x = new WebAssembly.Instance(new WebAssembly.Module(bin), { env }).exports, buf = x.memory.buffer;
    io = new Int32Array(buf, x.iop(), 16);
    WA = { x, io, sq: new Int8Array(buf, x.sqp(), 100), zt: new Uint32Array(buf, x.ztp(), 402) };
  } catch (e) { WA = null; }
}
function waRule() {   // (setRule: the board size and the zobrist keys)
  if (!WA) return;
  for (let k = 0; k < 2; k++) for (let i = 0; i < NN; i++) { WA.zt[k * 100 + i] = Z1[k][i]; WA.zt[200 + k * 100 + i] = Z2[k][i]; }
  WA.zt[400] = ZS1; WA.zt[401] = ZS2;
  WA.x.setup(N);
}
function kreset() { killers.length = 0; if (WA) WA.x.kclear(); }
function ttClear() { TT.clear(); if (WA) WA.x.ttclear(); }
function ttGet(pos) {   // the one-thread table's entry for pos (or the shared table's)
  if (SH !== null) return SH.get(pos.h1, pos.h2);
  if (WA) return WA.x.ttprobe(pos.h1, pos.h2) ? { h2: pos.h2, d: WA.io[0], f: WA.io[1], v: WA.io[2], m: WA.io[3] } : undefined;
  const e = TT.get(pos.h1); return e && e.h2 === pos.h2 ? e : undefined;
}

class Pos {
  constructor() { this.sq = new Int8Array(NN); this.side = 0; this.ply = 0; this.reset(); }
  reset() { this.sq.set(COLOR); this.side = 0; this.ply = 0; this.rehash(); }
  // spec: { b: N×N chars '.' 'b' 'w' (Black, White), side: 1 | 2, n: plies already played } or null (the full board)
  // a position given without n is in the capturing phase (n = 2 + side)
  static from(spec) {
    const p = new Pos();
    if (spec && spec.b) {
      p.sq.fill(0);
      for (let i = 0; i < NN; i++) { const ch = spec.b[i]; p.sq[i] = ch === 'b' ? P1 : ch === 'w' ? P2 : 0; }
      p.side = spec.side === P2 ? 1 : 0;
      p.ply = spec.n != null ? spec.n | 0 : 2 + p.side;
      p.rehash();
    }
    return p;
  }
  clone() { const q = Object.create(Pos.prototype); q.sq = this.sq.slice(); q.side = this.side; q.ply = this.ply; q.h1 = this.h1; q.h2 = this.h2; return q; }
  rehash() {
    let a = 0, c = 0;
    for (let i = 0; i < NN; i++) { const x = this.sq[i]; if (x) { a ^= Z1[x - 1][i]; c ^= Z2[x - 1][i]; } }
    if (this.side) { a ^= ZS1; c ^= ZS2; }
    this.h1 = a >>> 0; this.h2 = c >>> 0;
  }
  // 0 empty, 1 Black, 3 White (the page's piece kinds: 1 = P1, 3 = P2)
  at(i) { const x = this.sq[i]; return x === 1 ? 1 : x === 2 ? 3 : 0; }
  owner(i) { return this.sq[i]; }
  get turn() { return this.side ? P2 : P1; }
  get opening() { return this.ply < 2; }
  count(p) { let n = 0; for (let i = 0; i < NN; i++) if (this.sq[i] === p) n++; return n; }
  // the jumps of player p (whoever is to move): every stop of every straight line of jumps
  jumpsOf(p, out) {
    const sq = this.sq, o = 3 - p;
    for (let f = 0; f < NN; f++) {
      if (sq[f] !== p) continue;
      const rays = RAYS[f];
      for (let d = 0; d < 4; d++) {
        const ray = rays[d];
        for (let k = 1; k < ray.length; k += 2) {
          if (sq[ray[k - 1]] !== o || sq[ray[k]]) break;
          out.push(f + 128 * ray[k]);
        }
      }
    }
    return out;
  }
  // how many jumps p has (no list)
  mobility(p) {
    const sq = this.sq, o = 3 - p; let n = 0;
    for (let f = 0; f < NN; f++) {
      if (sq[f] !== p) continue;
      const rays = RAYS[f];
      for (let d = 0; d < 4; d++) {
        const ray = rays[d];
        for (let k = 1; k < ray.length; k += 2) { if (sq[ray[k - 1]] !== o || sq[ray[k]]) break; n++; }
      }
    }
    return n;
  }
  // stones of p that can jump
  movers(p) {
    const sq = this.sq, o = 3 - p; let n = 0;
    for (let f = 0; f < NN; f++) {
      if (sq[f] !== p) continue;
      const rays = RAYS[f];
      for (let d = 0; d < 4; d++) { const ray = rays[d]; if (ray.length > 1 && sq[ray[0]] === o && !sq[ray[1]]) { n++; break; } }
    }
    return n;
  }
  moves() {
    if (this.ply === 0) return this.count(0) === 0 ? OPEN1.map(i => i + 128 * i) : this.jumpsOf(P1, []);
    if (this.ply === 1) {
      const empty = []; for (let i = 0; i < NN; i++) if (!this.sq[i]) empty.push(i);
      if (empty.length === 1) return ADJ[empty[0]].filter(i => this.sq[i] === P2).sort((a, b) => a - b).map(i => i + 128 * i);
    }
    return this.jumpsOf(this.side + 1, []);
  }
  hasCaps() { return !this.opening; }
  promotes() { return false; }
  play(m) {
    const f = m % 128, t = (m / 128) | 0, x = this.sq[f];
    if (f === t) {
      this.sq[f] = 0; this.h1 = (this.h1 ^ Z1[x - 1][f]) >>> 0; this.h2 = (this.h2 ^ Z2[x - 1][f]) >>> 0;
    } else {
      const d = dirOf(f, t), ray = RAYS[f][d];
      for (let k = 0; k < ray.length; k += 2) {
        const o = ray[k], y = this.sq[o]; this.sq[o] = 0;
        if (y) { this.h1 = (this.h1 ^ Z1[y - 1][o]) >>> 0; this.h2 = (this.h2 ^ Z2[y - 1][o]) >>> 0; }
        if (ray[k + 1] === t) break;
      }
      this.sq[f] = 0; this.sq[t] = x;
      this.h1 = (this.h1 ^ Z1[x - 1][f] ^ Z1[x - 1][t]) >>> 0; this.h2 = (this.h2 ^ Z2[x - 1][f] ^ Z2[x - 1][t]) >>> 0;
    }
    this.side ^= 1; this.ply++;
    this.h1 = (this.h1 ^ ZS1) >>> 0; this.h2 = (this.h2 ^ ZS2) >>> 0;
    return this;
  }
  spec() { let s = ''; for (let i = 0; i < NN; i++) s += '.bw'[this.sq[i]]; return { b: s, side: this.side ? P2 : P1, n: this.ply }; }
  movesOf(p) { return p === P1 ? (this.ply + 1) >> 1 : this.ply >> 1; }
}
// direction index (0 up, 1 down, 2 left, 3 right) of a straight jump f → t
function dirOf(f, t) {
  const [r0, c0] = RC[f], [r1, c1] = RC[t];
  return c0 === c1 ? (r1 < r0 ? 0 : 1) : (c1 < c0 ? 2 : 3);
}
// the squares a move passes through: a removal [sq]; a jump [from, landing, landing, …]
function path(pos, m) {
  if (m < 0) return [];
  const f = mFrom(m), t = mTo(m);
  if (f === t) return [f];
  const ray = RAYS[f][dirOf(f, t)], out = [f];
  for (let k = 1; k < ray.length; k += 2) { out.push(ray[k]); if (ray[k] === t) break; }
  return out;
}
// the stones a move removes (a removal: the square itself; a jump: every stone jumped over)
function captured(pos, m) {
  const f = mFrom(m), t = mTo(m);
  if (f === t) return [f];
  const ray = RAYS[f][dirOf(f, t)], out = [];
  for (let k = 0; k < ray.length; k += 2) { out.push(ray[k]); if (ray[k + 1] === t) break; }
  return out;
}
const isJump = (pos, m) => m >= 0 && mFrom(m) !== mTo(m);
const hops = m => { if (isRemove(m)) return 0; const [r0, c0] = RC[mFrom(m)], [r1, c1] = RC[mTo(m)]; return (Math.abs(r1 - r0) + Math.abs(c1 - c0)) >> 1; };
// notation: a removal "d5", a jump "f4-d4", a double jump "f4-d4-b4"
function name(pos, m) { if (m < 0) return '—'; return path(pos, m).map(sqName).join('-'); }
function parse(pos, s) {
  const x = String(s).toLowerCase().match(/[a-j](?:10|[1-9])/g);
  if (!x || !x.length) return null;
  const sq = nm => (N - +nm.slice(1)) * N + FILES.indexOf(nm[0]);
  const f = sq(x[0]), t = sq(x[x.length - 1]);
  const m = mv(f, t); return pos.moves().includes(m) ? m : null;
}
function replay(start, moves) {
  const pos = Pos.from(start), hashes = [pos.h1 + ':' + pos.h2];
  for (const m of moves || []) { pos.play(m); hashes.push(pos.h1 + ':' + pos.h2); }
  return { pos, hashes };
}
// game status: { over, winner (1 / 2), why: 'stuck' } — the side to move with no capture loses
function judge(pos) {
  if (pos.moves().length) return { over: false };
  return { over: true, winner: pos.side ? P1 : P2, why: 'stuck' };
}
// ---------------------------------------------------------------- AI levels (20 steps: Lv.1 … Lv.20)
// weak levels look one or two moves ahead with noise (they still never miss a capture that ends the game at once);
// middle levels a fixed number of positions; the top two a time budget.
const LEVELS = [null,
  { d: 1, noise: 70 },                   // 1
  { d: 1, noise: 50 },                   // 2
  { d: 1, noise: 35 },                   // 3
  { d: 2, noise: 35 },                   // 4
  { d: 2, noise: 24 },                   // 5
  { d: 2, noise: 14 },                   // 6
  { d: 3, noise: 14 },                   // 7
  { d: 3, noise: 8 },                    // 8
  { d: 4, noise: 8 },                    // 9
  { d: 4, noise: 4 },                    // 10
  { d: 5, noise: 3 },                    // 11
  { s: 1, nk: 4 },                       // 12  (about 4,000 positions per move)
  { s: 1, nk: 8 },                       // 13
  { s: 1, nk: 15 },                      // 14
  { s: 1, nk: 28 },                      // 15
  { s: 1, nk: 45 },                      // 16
  { s: 1, nk: 70 },                      // 17
  { s: 1, nk: 100 },                     // 18
  { s: 1, ms: 1200 },                    // 19
  { s: 1, ms: 2500 },                    // 20
  // the top levels (2026-11-09, common rule「最上位のレベルの追加」): twice the time per step up to 20 s, every thread of the
  // page's pool (shared/mtsplit.js; the shared table on an isolated page) — one thread without the option
  { s: 1, ms: 5000 },                    // 21
  { s: 1, ms: 10000 },                   // 22
  { s: 1, ms: 20000 },                   // 23
];
function gauss(rand) { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
// ---------------------------------------------------------------- evaluation (side to move's view, ~100 = one spare move)
// Kōnane is a game of mobility: whoever runs out of captures first loses. The value is the difference in the number of
// jumps each side has, and in the number of stones that can jump (a stone with several jumps is still one move per
// turn), plus the move in hand.
const EW = { mv: 34, mover: 52, tempo: 30 };
function evaluate(pos) {
  if (pos.opening) return 0;
  const me = pos.side + 1, op = 3 - me;
  const a = pos.mobility(me), b = pos.mobility(op), pa = pos.movers(me), pb = pos.movers(op);
  if (!a) return -WIN + 1;
  return (a - b) * EW.mv + (pa - pb) * EW.mover + EW.tempo;
}
const kindOf = v => Math.abs(v) > WINT ? 'exact' : 'heur';
// ---------------------------------------------------------------- search (negamax alpha-beta, TT, iterative deepening)
const TT = new Map();
// SH: the transposition table shared by the workers of shared/mtsplit.js (shared mode: a cross-origin isolated page —
// shared/mttt.js, set by the 'mtshare' message; the one-thread worker never has it, so its levels play as before)
let SH = null;
const SALT = { s8: 0, s6: 0x5bd1e995, s10: 0x27d4eb2f };
let nodes = 0, nodeLimit = Infinity, tEnd = Infinity, stop = false;
const killers = [];
// reusable positions for the search (a child is only used while its parent's loop is on it): no clone per move.
// slot 0 scores the moves in orderMoves, slot ply + 1 holds the child being searched at ply
const SP = [];
function child(k, src, m) {
  let q = SP[k];
  if (!q || q.sq.length !== src.sq.length) q = SP[k] = src.clone();
  else { q.sq.set(src.sq); q.side = src.side; q.ply = src.ply; q.h1 = src.h1; q.h2 = src.h2; }
  return q.play(m);
}
const OSC = new Float64Array(1024);
function orderMoves(pos, L, ttm, ply) {
  if (L.length < 2) return L;
  const k = (WA ? WA.x.killer(ply) : killers[ply]) || -1, me = pos.side + 1, op = 3 - me, n = L.length, out = L.slice();
  // the same scores, then a stable insertion sort (best first) = the order of the former stable index sort
  for (let i = 0; i < n; i++) {
    const m = out[i];
    let v; if (m === ttm) v = 1e9; else if (m === k) v = 1e8; else { const q = child(0, pos, m); v = -q.mobility(op) * 10 + q.mobility(me) * 6 + hops(m); }
    let j = i; while (j > 0 && OSC[j - 1] < v) { OSC[j] = OSC[j - 1]; out[j] = out[j - 1]; j--; }
    OSC[j] = v; out[j] = m;
  }
  return out;
}
function search(pos, d, a, b, ply) {
  if (WA && !stop) {
    WA.sq.set(pos.sq); const io = WA.io; io[8] = pos.side; io[9] = pos.ply; io[10] = pos.h1 | 0; io[11] = pos.h2 | 0;
    WA.x.setn(nodes, nodeLimit === Infinity ? 1e300 : nodeLimit, SH !== null ? 1 : 0);
    const v = WA.x.search(d, a, b, ply);
    nodes = WA.x.getn(); if (WA.x.stopped()) stop = true;
    return v;
  }
  nodes++;
  if ((nodes & 1023) === 0 && (Date.now() > tEnd || nodes > nodeLimit || (SH !== null && SH.stopped()))) stop = true;
  if (stop) return 0;
  const key = pos.h1, e = SH !== null ? SH.get(key, pos.h2) : TT.get(key);
  if (e && e.h2 === pos.h2 && e.d >= d) {
    const v = e.v > WINT ? e.v - ply : e.v < -WINT ? e.v + ply : e.v;
    if (e.f === 0) return v; if (e.f === 1 && v >= b) return v; if (e.f === 2 && v <= a) return v;
  }
  let L = pos.moves();
  if (!L.length) return -(WIN - ply);
  if (d <= 0) return evaluate(pos);
  L = orderMoves(pos, L, e && e.h2 === pos.h2 ? e.m : -1, ply);
  let best = -Infinity, bm = L[0];
  const a0 = a;
  for (let i = 0; i < L.length; i++) {
    const m = L[i], q = child(ply + 1, pos, m);
    let v;
    if (i === 0) v = -search(q, d - 1, -b, -a, ply + 1);
    else {
      const red = (d >= 3 && i >= 5) ? 1 : 0;
      v = -search(q, d - 1 - red, -a - 1, -a, ply + 1);
      if (v > a && (red || v < b)) v = -search(q, d - 1, -b, -a, ply + 1);
    }
    if (stop) return best === -Infinity ? 0 : best;
    if (v > best) { best = v; bm = m; if (v > a) { a = v; if (a >= b) { killers[ply] = m; break; } } }
  }
  const sv = best > WINT ? best + ply : best < -WINT ? best - ply : best;   // mate scores stored relative to this node
  if (SH !== null) { SH.put(key, pos.h2, d, sv, best <= a0 ? 2 : best >= b ? 1 : 0, bm, 0); return best; }
  if (TT.size > 700000) TT.clear();
  TT.set(key, { h2: pos.h2, d, v: sv, f: best <= a0 ? 2 : best >= b ? 1 : 0, m: bm });
  return best;
}
function rootValues(pos, d) {
  const L = orderMoves(pos, pos.moves(), -1, 0), out = [];
  for (const m of L) {
    const q = pos.clone().play(m);
    const v = -search(q, d - 1, -WIN - 1, WIN + 1, 1);
    if (stop) break;
    out.push({ m, v });
  }
  return out.sort((x, y) => y.v - x.v);
}
// Lazy SMP (shared mode): the root's exact result a helper has finished ('mthelp' stores it), when it is at least depth d —
// the lead then goes on from there (a lead on a slower core, e.g. an efficiency core, no longer holds the job up)
function helperDone(pos, L, d) {
  const e = SH.get(pos.h1, pos.h2);
  return e && e.f === 0 && e.d >= d && true && L.indexOf(e.m) >= 0 ? { move: e.m, v: e.v, depth: e.d } : null;
}
function bestMove(pos, maxD, ms, nk) {
  nodes = 0; stop = false; tEnd = ms ? Date.now() + ms : Infinity; nodeLimit = nk ? nk * 1000 : Infinity; kreset();
  const L = pos.moves(); if (L.length === 1) return { move: L[0], v: 0, depth: 0 };
  let best = { move: orderMoves(pos, L, -1, 0)[0], v: 0, depth: 0 };
  for (let d = 1; d <= (maxD || 60); d++) {
    let a = -WIN - 1, bm = null, bv = -Infinity;
    const order = orderMoves(pos, L, best.move, 0);
    let hd = null;
    for (const m of order) {
      const q = pos.clone().play(m);
      const v = -search(q, d - 1, -WIN - 1, -a, 1);
      if (stop) break;
      if (v > bv) { bv = v; bm = m; if (v > a) a = v; }
      if (SH !== null && (hd = helperDone(pos, L, d)) !== null) break;   // (a helper has finished this depth or a deeper one)
    }
    if (hd !== null) { best = hd; if (hd.depth >= (maxD || 60) || Math.abs(hd.v) > WINT) break; d = hd.depth; continue; }
    if (stop && !bm) break;
    if (bm !== null && (!stop || bv >= best.v || d === 1)) best = { move: bm, v: bv, depth: d };
    if (stop) break;
    if (Math.abs(bv) > WINT) break;
  }
  if (SH !== null) { const hd = helperDone(pos, L, best.depth + 1); if (hd !== null) best = hd; }
  return best;
}
// a lost position (every move loses): the move that loses latest; then the one that keeps the most own jumps and leaves
// the fewest to the opponent (a human-looking defence rather than a random move)
function resist(pos, list) {
  let worst = -Infinity; for (const e of list) worst = Math.max(worst, e.v);
  const pool = list.filter(e => e.v === worst), me = pos.side + 1;
  let bm = pool[0].m, bs = -Infinity;
  for (const e of pool) { const q = pos.clone().play(e.m), s = q.mobility(me) * 2 - q.mobility(3 - me) * 3; if (s > bs) { bs = s; bm = e.m; } }
  return bm;
}
let PRO_CFG = null;   // a step of the page's PRO mode for the current 'think' message (same keys as LEVELS)
function think(start, moves, level, rand, rule) {
  if (rule) setRule(rule);
  rand = rand || Math.random;
  const L = PRO_CFG || LEVELS[level] || LEVELS[10];   // (PRO_CFG: the page's PRO mode, shared/proset.js ladder())
  const { pos } = replay(start, moves);
  const all = pos.moves();
  if (!all.length) return { move: -1 };
  if (all.length === 1) return { move: all[0] };
  // the opening removals: weak levels pick any, strong levels look ahead like any other move
  if (pos.opening && !L.s && level <= 8) return { move: all[Math.floor(rand() * all.length)], v: 0 };
  if (!L.s) {
    nodes = 0; stop = false; tEnd = Date.now() + 2500; nodeLimit = Infinity; kreset();
    const vals = rootValues(pos, L.d);
    if (vals[0].v < -WINT) return { move: resist(pos, vals), v: vals[0].v };
    let best = vals[0].m, bv = -Infinity;
    for (const e of vals) { const x = e.v + (Math.abs(e.v) > WINT ? 0 : gauss(rand) * L.noise); if (x > bv) { bv = x; best = e.m; } }
    return { move: best, v: vals[0].v };
  }
  const r = bestMove(pos, L.dx || 60, L.ms || 0, L.nk || (L.ms ? 0 : 50));
  return thinkFin(pos, r);
}
// the strong steps' answer from the search's result (also the end of a search on several threads, shared/mtsplit.js)
function thinkFin(pos, r) {
  if (r.v < -WINT && r.depth > 0) {
    nodes = 0; stop = false; tEnd = Date.now() + 800; nodeLimit = Infinity;
    const vals = rootValues(pos, Math.max(1, r.depth));
    if (!stop && vals.length) return { move: resist(pos, vals), v: r.v, depth: r.depth };
  }
  return { move: r.move, v: r.v, depth: r.depth };
}
function analyze(start, moves, ms, onProgress, rule) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves);
  nodes = 0; stop = false; tEnd = Date.now() + (ms || 1000); nodeLimit = Infinity; kreset();
  let list = [], depth = 0;
  const n = pos.moves().length;
  for (let d = 1; d <= 40; d++) {
    const vals = rootValues(pos, d);
    if (stop && vals.length < n) break;
    list = vals.map(e => ({ ...e, kind: kindOf(e.v) })); depth = d;
    if (onProgress) onProgress(list, d);
    if (stop) break;
    if (list.every(e => Math.abs(e.v) > WINT)) break;      // everything solved
  }
  if (!list.length) list = pos.moves().map(m => ({ m, v: 0, kind: 'heur' }));
  return { list, depth };
}
function cands(start, moves, ms, k, plies, onProgress, rule) {
  if (rule) setRule(rule);
  const r = analyze(start, moves, ms, onProgress);
  const list = r.list.slice().sort((a, b) => b.v - a.v).slice(0, k || 5);
  for (const e of list) e.pv = pvOf(start, moves, e.m, plies);
  return { list, depth: r.depth };
}
// the line after root move m (short searches, one per ply)
function pvOf(start, moves, m, plies) {
  const pv = [], line = moves.concat([m]);
  for (let d = 0; d < (plies || 7); d++) {
    const { pos } = replay(start, line);
    if (judge(pos).over) break;
    const b = bestMove(pos, 5, 60, 0);
    if (b.move == null || b.move < 0) break;
    line.push(b.move); pv.push(b.move);
  }
  return pv;
}
// ---------------------------------------------------------------- several threads (shared/mtsplit.js: plain workers share the root moves
// and the main line). mtPlan: what a 'think' / 'analyze' / 'cands' job searches on the threads (or its answer at once); mtV: the
// node after the root and m.line searched to depth m.d in the window (m.a, m.b); mtKids: that node's moves in this engine's
// order; mtFin: the job's reply from the threads' raw result (the same as the one-thread worker's).
let mtRule = null;
function mtNode(m) {
  if (SH !== null) SH.salt = SALT[RK] | 0;
  else if (mtRule !== RK) { ttClear(); mtRule = RK; }
  const line = m.line || [], { pos } = replay(m.start, m.moves.concat(line));
  return { pos, ply: line.length };
}
// Lazy SMP on the shared table for a 'think' (time / depth only: with a node budget the threads split the tree, so that the
// budget is all the threads' together); m.lazy (0 / 1) overrides the game's choice (the bench compares both)
const lazyOf = (m, L, dflt) => SH !== null && !L.nk && (L.ms || L.dx) ? (m.lazy !== undefined ? !!m.lazy : dflt) : false;
function mtPlan(m) {
  const { pos } = replay(m.start, m.moves), all = pos.moves(), inf = WIN + 1;
  if (m.job === 'think') {
    const L = m.cfg || LEVELS[m.level] || LEVELS[10];
    if (all.length < 2 || !L.s) { PRO_CFG = m.cfg || null; try { return { result: think(m.start, m.moves, m.level) }; } finally { PRO_CFG = null; } }
    kreset();
    return { plan: { kind: 'best', moves: orderMoves(pos, all, -1, 0), inf, maxD: L.dx || 60, ms: L.ms || 0, nodes: (L.nk || (L.ms ? 0 : 50)) * 1000, win: WINT, partialIfBetter: true, splitMin: 99, specRes: SH === null ? 0 : undefined, sticky: SH === null, lazy: lazyOf(m, L, false) } };   // (the root moves only: Kōnane leans on its table, a split main line costs more than it gives; Young Brothers Wait on the shared table — on the user's Mac 8 threads ×2.4 vs Lazy SMP ×1.5, 2026-11-09; lazy: Lazy SMP, for the bench)
  }
  if (!all.length) return { result: { list: [], depth: 0 } };
  const cands = m.job === 'cands';
  return { plan: { kind: 'all', sticky: SH === null, moves: orderMoves(pos, all, -1, 0), inf, maxD: 40, ms: m.time || (cands ? 1200 : 1000), win: WINT, stopAll: true, progress: true, pv: cands ? m.plies || 7 : 0, pvK: m.k || 5 } };
}
function mtV(m) {
  const { pos, ply } = mtNode(m);
  nodes = 0; stop = false; tEnd = m.until || Infinity; nodeLimit = m.nl || Infinity;
  const v = search(pos, m.d, m.wa, m.wb, ply);
  return { v, ok: !stop, nodes };
}
function mtKids(m) {
  const { pos, ply } = mtNode(m);
  const L = pos.moves(); if (!L.length) return { kids: [] };
  const e = ttGet(pos);
  return { kids: orderMoves(pos, L, e && e.h2 === pos.h2 ? e.m : -1, ply).map(x => ({ m: x, s: -1 })) };
}
function mtLazy(m) {   // (shared/tools/mtlazy.js: one Lazy SMP thread's search of the root to depth m.d, root order rotated by m.rot)
  const { pos } = mtNode(m);
  nodes = 0; stop = false; tEnd = m.until || Infinity; nodeLimit = Infinity;
  const e = ttGet(pos);
  let L = orderMoves(pos, pos.moves(), e && e.h2 === pos.h2 ? e.m : -1, 0);
  if (m.rot) { const k = m.rot % L.length; L = L.slice(k).concat(L.slice(0, k)); }
  let a = -WIN - 1, best = -Infinity, bm = L[0];
  for (let i = 0; i < L.length; i++) {
    const q = pos.clone().play(L[i]);
    let v = i === 0 ? -search(q, m.d - 1, -WIN - 1, -a, 1) : -search(q, m.d - 1, -a - 1, -a, 1);
    if (i > 0 && v > a) v = -search(q, m.d - 1, -WIN - 1, -a, 1);
    if (v > best) { best = v; bm = L[i]; if (v > a) a = v; }
  }
  if (SH !== null && !stop) SH.put(pos.h1, pos.h2, m.d, best, 0, bm, 0);
  return { v: best, m: bm, nodes };
}
// a Lazy SMP helper (shared/mtsplit.js shared mode, 'mthelp'): iterative deepening of the root on the shared table — one ply
// deeper every other helper (k), from a root order rotated by k >> 1 — until the page stops it (or m.until)
function mtHelp(m) {
  let total = 0;
  for (let d = 1; d <= (m.maxD || 60); d++) {
    const r = mtLazy(Object.assign({}, m, { d: d + (m.k & 1), rot: m.k >> 1 }));
    total += r.nodes;
    if (stop || Date.now() > (m.until || Infinity) || Math.abs(r.v) > WINT) break;
  }
  return { nodes: total, ok: false };
}
function mtFin(m) {
  const r = m.raw;
  if (m.job === 'think') { const { pos } = replay(m.start, m.moves); return { result: thinkFin(pos, { move: r.m, v: r.v, depth: r.depth }) }; }
  let list = (r.list || []).map(e => Object.assign({ m: e.m, v: e.v, kind: kindOf(e.v) }, e.pv ? { pv: e.pv } : {}));
  if (!list.length) { const { pos } = replay(m.start, m.moves); list = pos.moves().map(x => ({ m: x, v: 0, kind: 'heur' })); }
  if (m.job === 'cands') list = list.slice(0, m.k || 5);
  return { result: { list, depth: r.depth } };
}
// ---------------------------------------------------------------- "win in N" (puzzles, lessons, the coach)
// duelW(pos, k, me): me (to move) leaves the opponent without a capture within k of its own moves, whatever the reply.
let duelBudget = Infinity;
const DTT = new Map();
function duelW(pos, k, me) {
  if (--duelBudget < 0) return false;
  const key = pos.h1 + ':' + pos.h2 + ':' + k + 'w';
  const c = DTT.get(key); if (c !== undefined) return c;
  let res = false;
  const ms = pos.moves();
  // replies that leave the opponent fewest captures first
  const sc = ms.map(m => pos.clone().play(m).mobility(3 - me));
  const idx = ms.map((_, i) => i).sort((a, b) => sc[a] - sc[b]);
  for (const i of idx) {
    const q = pos.clone().play(ms[i]);
    if (sc[i] === 0) { res = true; break; }
    if (k > 1 && duelB(q, k - 1, me)) { res = true; break; }
    if (duelBudget < 0) break;
  }
  if (duelBudget >= 0) DTT.set(key, res);
  return res;
}
// the opponent to move (and it has a capture): every reply must still lose within k more moves of me
function duelB(pos, k, me) {
  if (--duelBudget < 0) return false;
  const key = pos.h1 + ':' + pos.h2 + ':' + k + 'b';
  const c = DTT.get(key); if (c !== undefined) return c;
  const ms = pos.moves();
  // likely refutations first: replies that leave me fewest captures
  const sc = ms.map(m => pos.clone().play(m).mobility(me));
  const idx = ms.map((_, i) => i).sort((a, b) => sc[a] - sc[b]);
  let res = true;
  for (const i of idx) {
    if (sc[i] === 0) { res = false; break; }
    if (!duelW(pos.clone().play(ms[i]), k, me)) { res = false; break; }
    if (duelBudget < 0) { res = false; break; }
  }
  if (duelBudget >= 0) DTT.set(key, res);
  return res;
}
// the moves of the side to move that win within n of its moves (null = the search budget ran out)
function duelGood(start, moves, n, rule, budget) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves), me = pos.turn, out = [];
  if (pos.opening) return out;
  DTT.clear(); duelBudget = budget || 4e6;
  for (const m of pos.moves()) {
    const q = pos.clone().play(m);
    if (!q.mobility(3 - me) || (n > 1 && duelB(q, n - 1, me))) out.push(m);
    if (duelBudget < 0) { duelBudget = Infinity; return null; }
  }
  duelBudget = Infinity;
  return out;
}
// the smallest n (≤ max) in which the side to move forces a win, or -1
function duelMin(start, moves, max, rule, budget) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves), me = pos.turn;
  if (pos.opening) return -1;
  DTT.clear(); duelBudget = budget || 4e6;
  for (let n = 1; n <= (max || 5); n++) { if (duelW(pos, n, me)) { duelBudget = Infinity; return n; } if (duelBudget < 0) break; }
  duelBudget = Infinity;
  return -1;
}
// the defender's most stubborn reply: the one after which the winner needs the most moves; ties → the reply the engine
// likes best for the defender (not the first one generated)
function duelReply(start, moves, n, rule) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves), opp = pos.turn, me = 3 - opp;
  let best = null, bk = -1, be = -Infinity;
  DTT.clear(); duelBudget = 4e6;
  for (const m of pos.moves()) {
    const q = pos.clone().play(m);
    let k;
    if (!q.mobility(me)) k = 99;
    else { k = 99; for (let j = 1; j <= n; j++) if (duelW(q, j, me)) { k = j; break; } }
    const ev = -evaluate(q);
    if (k > bk || (k === bk && ev > be)) { bk = k; be = ev; best = m; }
  }
  duelBudget = Infinity;
  return { move: best, need: bk };
}
// exact game value for small positions: +1 the side to move wins, -1 loses (budget: nodes; 0 = gave up)
const STT = new Map(); let solveBudget = Infinity;
function solveRec(pos) {
  if (--solveBudget < 0) return 0;
  const key = pos.h1 + ':' + pos.h2, c = STT.get(key); if (c !== undefined) return c;
  const ms = pos.moves(); let res = -1;
  for (const m of ms) { const r = solveRec(pos.clone().play(m)); if (solveBudget < 0) return 0; if (r === -1) { res = 1; break; } }
  STT.set(key, res); return res;
}
function solve(start, moves, rule, budget) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves);
  STT.clear(); solveBudget = budget || 3e6;
  const r = solveRec(pos); solveBudget = Infinity; return r;
}
// the winning moves of the side to move (exact; null = gave up)
function winningMoves(start, moves, rule, budget) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves), out = [];
  STT.clear(); solveBudget = budget || 3e6;
  for (const m of pos.moves()) { const r = solveRec(pos.clone().play(m)); if (solveBudget < 0) { solveBudget = Infinity; return null; } if (r === -1) out.push(m); }
  solveBudget = Infinity; return out;
}

loadCore();
setRule('s8');
const API = { get wasm() { return !!WA; }, get nodes() { return nodes; }, set SH(t) { SH = t; }, get SH() { return SH; }, mtLazy, P1, P2, WIN, WINT, PASS, RULES, RULE_ORDER, setRule, get rule() { return RK; }, get R() { return R; }, get N() { return N; }, get NN() { return NN; },
  get RC() { return RC; }, COLOR: () => COLOR, OPEN1: () => OPEN1, ADJ: () => ADJ, sqAt, sqName, mv, mFrom, mTo, isRemove, hops, Pos, path, captured, isJump, name, parse, replay, judge,
  LEVELS, think, analyze, cands, duelGood, duelMin, duelReply, solve, winningMoves, evaluate, kindOf, EW, mtPlan, mtV, mtKids, mtFin, pvOf };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof self !== 'undefined' && typeof importScripts === 'function' && typeof window === 'undefined') {
  let queueP = Promise.resolve();
  self.onmessage = e => {
    const m = e.data;
    if (m && m.type === 'mtshare') { try { importScripts(m.lib); SH = self.MTTT.attach(m); } catch (err) { SH = null; } return; }   // (shared/mtsplit.js shared mode)
    queueP = queueP.then(() => {
      try {
        if (SH !== null) SH.begin(m);
        setRule(m.rule || 's8');
        if (SH !== null) SH.salt = SALT[RK] | 0;   // (every task on the shared table, the Lazy SMP lead's 'think' too)
        if (m.type === 'think') self.postMessage({ id: m.id, type: 'result', ...(() => { PRO_CFG = m.cfg || null; try { return think(m.start, m.moves, m.level); } finally { PRO_CFG = null; } })() });
        else if (m.type === 'analyze') {
          const r = analyze(m.start, m.moves, m.time || 1000, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth }));
          self.postMessage({ id: m.id, type: 'result', ...r });
        } else if (m.type === 'cands') self.postMessage({ id: m.id, type: 'result', ...cands(m.start, m.moves, m.time || 1200, m.k, m.plies, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth })) });
        else if (m.type === 'duel') { const g = duelGood(m.start, m.moves, m.n); self.postMessage({ id: m.id, type: 'result', list: g ? g.map(x => ({ m: x, need: m.n })) : null }); }
        else if (m.type === 'duelReply') self.postMessage({ id: m.id, type: 'result', ...duelReply(m.start, m.moves, m.n) });
        else if (m.type === 'win') self.postMessage({ id: m.id, type: 'result', list: winningMoves(m.start, m.moves) });
        else if (m.type === 'newgame') { ttClear(); self.postMessage({ id: m.id, type: 'result' }); }
        else if (m.type === 'mtplan') self.postMessage({ id: m.id, type: 'result', ...mtPlan(m) });
        else if (m.type === 'mtv') self.postMessage({ id: m.id, type: 'result', core: WA ? 'wasm' : 'js', ...mtV(m) });   // (core: every worker's, for bench.html)
        else if (m.type === 'mtkids') self.postMessage({ id: m.id, type: 'result', ...mtKids(m) });
        else if (m.type === 'mtpv') self.postMessage({ id: m.id, type: 'result', pv: pvOf(m.start, m.moves, m.m, m.plies) });
        else if (m.type === 'mtlead') self.postMessage({ id: m.id, type: 'result', ...(() => { PRO_CFG = m.cfg || null; try { const r = think(m.start, m.moves, m.level); return Object.assign({}, r, { nodes }); } finally { PRO_CFG = null; } })() });   // (Lazy SMP: the job as one thread plays it, on the shared table)
        else if (m.type === 'mthelp') self.postMessage({ id: m.id, type: 'result', ...mtHelp(m) });
        else if (m.type === 'mtfin') { const f = mtFin(m); if (f.result) f.result.core = WA ? 'wasm' : 'js'; self.postMessage({ id: m.id, type: 'result', ...f }); }   // (core: the search core of the threads, shown by bench.html)
      } catch (err) { self.postMessage({ id: m.id, type: 'result', error: String(err && err.stack || err) }); }
    });
  };
}
if (typeof window !== 'undefined') window.KonaneEngine = API;
})();

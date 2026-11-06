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
let nodes = 0, nodeLimit = Infinity, tEnd = Infinity, stop = false;
const killers = [];
function orderMoves(pos, L, ttm, ply) {
  if (L.length < 2) return L;
  const k = killers[ply] || -1, me = pos.side + 1, op = 3 - me;
  const sc = L.map(m => {
    if (m === ttm) return 1e9; if (m === k) return 1e8;
    const q = pos.clone().play(m);
    return -q.mobility(op) * 10 + q.mobility(me) * 6 + hops(m);
  });
  const idx = L.map((_, i) => i).sort((a, b) => sc[b] - sc[a]);
  return idx.map(i => L[i]);
}
function search(pos, d, a, b, ply) {
  nodes++;
  if ((nodes & 1023) === 0 && (Date.now() > tEnd || nodes > nodeLimit)) stop = true;
  if (stop) return 0;
  const key = pos.h1, e = TT.get(key);
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
    const m = L[i], q = pos.clone().play(m);
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
  if (TT.size > 700000) TT.clear();
  const sv = best > WINT ? best + ply : best < -WINT ? best - ply : best;   // mate scores stored relative to this node
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
function bestMove(pos, maxD, ms, nk) {
  nodes = 0; stop = false; tEnd = ms ? Date.now() + ms : Infinity; nodeLimit = nk ? nk * 1000 : Infinity; killers.length = 0;
  const L = pos.moves(); if (L.length === 1) return { move: L[0], v: 0, depth: 0 };
  let best = { move: orderMoves(pos, L, -1, 0)[0], v: 0, depth: 0 };
  for (let d = 1; d <= (maxD || 60); d++) {
    let a = -WIN - 1, bm = null, bv = -Infinity;
    const order = orderMoves(pos, L, best.move, 0);
    for (const m of order) {
      const q = pos.clone().play(m);
      const v = -search(q, d - 1, -WIN - 1, -a, 1);
      if (stop) break;
      if (v > bv) { bv = v; bm = m; if (v > a) a = v; }
    }
    if (stop && !bm) break;
    if (bm !== null && (!stop || bv >= best.v || d === 1)) best = { move: bm, v: bv, depth: d };
    if (stop) break;
    if (Math.abs(bv) > WINT) break;
  }
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
function think(start, moves, level, rand, rule) {
  if (rule) setRule(rule);
  rand = rand || Math.random;
  const L = LEVELS[level] || LEVELS[10];
  const { pos } = replay(start, moves);
  const all = pos.moves();
  if (!all.length) return { move: -1 };
  if (all.length === 1) return { move: all[0] };
  // the opening removals: weak levels pick any, strong levels look ahead like any other move
  if (pos.opening && !L.s && level <= 8) return { move: all[Math.floor(rand() * all.length)], v: 0 };
  if (!L.s) {
    nodes = 0; stop = false; tEnd = Date.now() + 2500; nodeLimit = Infinity; killers.length = 0;
    const vals = rootValues(pos, L.d);
    if (vals[0].v < -WINT) return { move: resist(pos, vals), v: vals[0].v };
    let best = vals[0].m, bv = -Infinity;
    for (const e of vals) { const x = e.v + (Math.abs(e.v) > WINT ? 0 : gauss(rand) * L.noise); if (x > bv) { bv = x; best = e.m; } }
    return { move: best, v: vals[0].v };
  }
  const r = bestMove(pos, 60, L.ms || 0, L.nk || (L.ms ? 0 : 50));
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
  nodes = 0; stop = false; tEnd = Date.now() + (ms || 1000); nodeLimit = Infinity; killers.length = 0;
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
  for (const e of list) {
    e.pv = [];
    const line = moves.concat([e.m]);
    for (let d = 0; d < (plies || 7); d++) {
      const { pos } = replay(start, line);
      if (judge(pos).over) break;
      const b = bestMove(pos, 5, 60, 0);
      if (b.move == null || b.move < 0) break;
      line.push(b.move); e.pv.push(b.move);
    }
  }
  return { list, depth: r.depth };
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

setRule('s8');
const API = { P1, P2, WIN, WINT, PASS, RULES, RULE_ORDER, setRule, get rule() { return RK; }, get R() { return R; }, get N() { return N; }, get NN() { return NN; },
  get RC() { return RC; }, COLOR: () => COLOR, OPEN1: () => OPEN1, ADJ: () => ADJ, sqAt, sqName, mv, mFrom, mTo, isRemove, hops, Pos, path, captured, isJump, name, parse, replay, judge,
  LEVELS, think, analyze, cands, duelGood, duelMin, duelReply, solve, winningMoves, evaluate, kindOf, EW };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof self !== 'undefined' && typeof importScripts === 'function' && typeof window === 'undefined') {
  let queueP = Promise.resolve();
  self.onmessage = e => {
    const m = e.data;
    queueP = queueP.then(() => {
      try {
        setRule(m.rule || 's8');
        if (m.type === 'think') self.postMessage({ id: m.id, type: 'result', ...think(m.start, m.moves, m.level) });
        else if (m.type === 'analyze') {
          const r = analyze(m.start, m.moves, m.time || 1000, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth }));
          self.postMessage({ id: m.id, type: 'result', ...r });
        } else if (m.type === 'cands') self.postMessage({ id: m.id, type: 'result', ...cands(m.start, m.moves, m.time || 1200, m.k, m.plies, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth })) });
        else if (m.type === 'duel') { const g = duelGood(m.start, m.moves, m.n); self.postMessage({ id: m.id, type: 'result', list: g ? g.map(x => ({ m: x, need: m.n })) : null }); }
        else if (m.type === 'duelReply') self.postMessage({ id: m.id, type: 'result', ...duelReply(m.start, m.moves, m.n) });
        else if (m.type === 'win') self.postMessage({ id: m.id, type: 'result', list: winningMoves(m.start, m.moves) });
        else if (m.type === 'newgame') { TT.clear(); self.postMessage({ id: m.id, type: 'result' }); }
      } catch (err) { self.postMessage({ id: m.id, type: 'result', error: String(err && err.stack || err) }); }
    });
  };
}
if (typeof window !== 'undefined') window.KonaneEngine = API;
})();

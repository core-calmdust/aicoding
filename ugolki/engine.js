// Ugolki (Уголки, "corners") — rules (for the page) and the AI worker (plain JS search).
// Works as a Web Worker (postMessage API), as a plain <script> (window.UgolkiEngine) and as a Node module.
//
// Board: 64 squares, index = r * 8 + c, r = 0 is the top rank (8), c = 0 is file a. White (P1) moves first from the
// bottom-left corner (a1…), Black (P2) starts in the top-right corner (…h8). Each side races to fill the other's corner.
// Moves: m = from + 64 * to (no captures). A move is a step to an adjacent empty square (orthogonal; diagonal too in the
// diagonal variant) or a chain of jumps over single adjacent pieces of either colour onto empty squares (stop anywhere).
// PASS (only in the one-player "build the house" puzzles) = 4096.
// End: the game is decided after Black's move. White in first and Black does not follow next move → White wins; both in
// → draw; Black in first → Black wins. Anti-blocking: after move LIMIT (40, diagonal 30) a side with a piece still in its
// own corner loses (both → draw). After move CAP (80) the side with more pieces in the target corner wins (equal → draw).
// Threefold repetition → draw. No legal move → decided by the count.
(function () {
'use strict';
const P1 = 1, P2 = 2;
const WIN = 30000, WINT = 29000, PASS = 4096;
// ---------------------------------------------------------------- variants
// home rectangles: White's own corner (bottom-left) [r0, r1, c0, c1]; Black's is the 180° turn of it
const RULES = {
  c33: { rows: 3, cols: 3, diag: false, limit: 40, cap: 80 },
  c34: { rows: 3, cols: 4, diag: false, limit: 50, cap: 100 },
  c44: { rows: 4, cols: 4, diag: false, limit: 60, cap: 120 },
  diag: { rows: 3, cols: 3, diag: true, limit: 30, cap: 80 },
};
const RULE_ORDER = ['c33', 'c34', 'c44', 'diag'];
let R = null, RK = 'c33';
const HOME = [null, [], []];       // HOME[p][i] = 1 if square i is p's own starting corner
let HOMEL = [null, [], []];        // lists of squares
let DIST = [null, [], []];         // DIST[p][i] = steps (Manhattan / Chebyshev) from i to the far corner p races to
let BASE = [0, 0, 0];              // Σ DIST over the target corner (the value of a finished side)
let DIRS = [];
function setRule(k) {
  if (!RULES[k]) k = 'c33';
  if (R && RK === k) return;
  RK = k; R = RULES[k];
  DIRS = R.diag ? [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]] : [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const p of [P1, P2]) { HOME[p] = new Int8Array(64); HOMEL[p] = []; DIST[p] = new Int8Array(64); }
  for (let i = 0; i < 64; i++) {
    const r = i >> 3, c = i & 7;
    if (r >= 8 - R.rows && c < R.cols) { HOME[P1][i] = 1; HOMEL[P1].push(i); }
    if (r < R.rows && c >= 8 - R.cols) { HOME[P2][i] = 1; HOMEL[P2].push(i); }
    // White races to the top-right (r 0, c 7), Black to the bottom-left (r 7, c 0)
    const a = r, b = 7 - c, a2 = 7 - r, b2 = c;
    DIST[P1][i] = R.diag ? Math.max(a, b) + Math.min(a, b) * 0 : a + b;
    DIST[P2][i] = R.diag ? Math.max(a2, b2) : a2 + b2;
  }
  BASE = [0, 0, 0];
  for (const i of HOMEL[P2]) BASE[P1] += DIST[P1][i];
  for (const i of HOMEL[P1]) BASE[P2] += DIST[P2][i];
  NBR = []; JMP = [];
  for (let i = 0; i < 64; i++) {
    const r = i >> 3, c = i & 7, nb = [], jp = [];
    for (const [dr, dc] of DIRS) {
      const r1 = r + dr, c1 = c + dc, r2 = r + 2 * dr, c2 = c + 2 * dc;
      if (r1 >= 0 && r1 < 8 && c1 >= 0 && c1 < 8) nb.push(r1 * 8 + c1);
      if (r2 >= 0 && r2 < 8 && c2 >= 0 && c2 < 8) jp.push([r1 * 8 + c1, r2 * 8 + c2]);
    }
    NBR.push(nb); JMP.push(jp);
  }
}
let NBR = [], JMP = [];
const target = p => HOME[3 - p];
// ---------------------------------------------------------------- geometry helpers (the page uses these)
const RC = []; for (let i = 0; i < 64; i++) RC.push([i >> 3, i & 7]);
const sqAt = (r, c) => (r < 0 || r > 7 || c < 0 || c > 7) ? -1 : r * 8 + c;
const sqName = i => 'abcdefgh'[i & 7] + (8 - (i >> 3));
const mv = (f, t) => f + 64 * t;
const mFrom = m => m === PASS ? -1 : m % 64, mTo = m => m === PASS ? -1 : Math.floor(m / 64) % 64, mCap = () => 0;
// zobrist (two 32-bit halves)
let zs = 0x2545F491;
const zr = () => { zs ^= zs << 13; zs >>>= 0; zs ^= zs >>> 17; zs ^= zs << 5; zs >>>= 0; return zs; };
const Z1 = [[], []], Z2 = [[], []]; for (let k = 0; k < 2; k++) for (let i = 0; i < 64; i++) { Z1[k].push(zr()); Z2[k].push(zr()); }
const ZS1 = zr(), ZS2 = zr();
const stamp = new Int32Array(64); let stampN = 1;
const queue = new Int8Array(64), parent = new Int8Array(64);

class Pos {
  constructor() { this.sq = new Int8Array(64); this.side = 0; this.ply = 0; this.free = false; this.reset(); }
  reset() { this.sq.fill(0); for (const i of HOMEL[P1]) this.sq[i] = 1; for (const i of HOMEL[P2]) this.sq[i] = 2; this.side = 0; this.ply = 0; this.rehash(); }
  // spec: { b: 64 chars '.' 'w' 'b', side: 1 | 2, n: plies already played (for the 40 / 80 move rules), free: no move
  // limits and Black passes (one-player puzzles) } or null (the starting position)
  static from(spec) {
    const p = new Pos();
    if (spec && spec.b) {
      p.sq.fill(0);
      for (let i = 0; i < 64; i++) { const ch = spec.b[i]; p.sq[i] = ch === 'w' ? 1 : ch === 'b' ? 2 : 0; }
      p.side = spec.side === P2 ? 1 : 0; p.ply = spec.n | 0; p.free = !!spec.free;
      if (!p.ply && p.side) p.ply = 1;
      p.rehash();
    }
    return p;
  }
  clone() { const q = Object.create(Pos.prototype); q.sq = this.sq.slice(); q.side = this.side; q.ply = this.ply; q.free = this.free; q.h1 = this.h1; q.h2 = this.h2; return q; }
  rehash() {
    let a = 0, c = 0;
    for (let i = 0; i < 64; i++) { const x = this.sq[i]; if (x) { a ^= Z1[x - 1][i]; c ^= Z2[x - 1][i]; } }
    if (this.side) { a ^= ZS1; c ^= ZS2; }
    this.h1 = a >>> 0; this.h2 = c >>> 0;
  }
  // 0 empty, 1 White, 3 Black (the page's piece kinds: 1 = P1, 3 = P2)
  at(i) { const x = this.sq[i]; return x === 1 ? 1 : x === 2 ? 3 : 0; }
  owner(i) { return this.sq[i]; }
  get turn() { return this.side ? P2 : P1; }
  count(p) { let n = 0; for (let i = 0; i < 64; i++) if (this.sq[i] === p) n++; return n; }
  // pieces of p in the target corner / still in the own corner
  inTarget(p) { const T = target(p); let n = 0; for (let i = 0; i < 64; i++) if (this.sq[i] === p && T[i]) n++; return n; }
  inHome(p) { const H = HOME[p]; let n = 0; for (let i = 0; i < 64; i++) if (this.sq[i] === p && H[i]) n++; return n; }
  done(p) { return this.inTarget(p) === HOMEL[p].length; }
  dist(p) { const D = DIST[p]; let s = 0; for (let i = 0; i < 64; i++) if (this.sq[i] === p) s += D[i]; return s - BASE[p]; }
  // the squares a piece on f can reach: steps, then every square of a jump chain (breadth first; parent links for the path)
  reach(f, out) {
    if (stampN > 2e9) { stamp.fill(0); stampN = 1; }
    const sq = this.sq, st = ++stampN; stamp[f] = st;
    const nb = NBR[f];
    for (let k = 0; k < nb.length; k++) { const t = nb[k]; if (!sq[t] && stamp[t] !== st) { stamp[t] = st; parent[t] = -1; out.push(t); } }
    let qh = 0, qt = 0; queue[qt++] = f;
    const own = sq[f]; sq[f] = 0;
    while (qh < qt) {
      const x = queue[qh++], jp = JMP[x];
      for (let k = 0; k < jp.length; k++) {
        const o = jp[k][0], l = jp[k][1];
        if (!sq[o] || sq[l]) continue;
        if (stamp[l] === st) { continue; }
        stamp[l] = st; parent[l] = x; queue[qt++] = l; out.push(l);
      }
    }
    sq[f] = own;
    return out;
  }
  moves() {
    const p = this.side + 1, out = [], tmp = [];
    for (let i = 0; i < 64; i++) if (this.sq[i] === p) { tmp.length = 0; this.reach(i, tmp); for (const t of tmp) out.push(i + 64 * t); }
    if (!out.length && this.free) out.push(PASS);
    return out;
  }
  // moves().length > 0 without listing them: a step to an empty neighbour, or the first hop of a jump
  hasMove() {
    if (this.free) return true;
    const p = this.side + 1, sq = this.sq;
    for (let i = 0; i < 64; i++) if (sq[i] === p) {
      const nb = NBR[i]; for (let k = 0; k < nb.length; k++) if (!sq[nb[k]]) return true;
      const jp = JMP[i]; for (let k = 0; k < jp.length; k++) if (sq[jp[k][0]] && !sq[jp[k][1]]) return true;
    }
    return false;
  }
  hasCaps() { return false; }
  caps() { return []; }
  promotes() { return false; }
  play(m) {
    if (m !== PASS) {
      const f = m % 64, t = (m / 64) | 0, x = this.sq[f];
      this.sq[f] = 0; this.sq[t] = x;
      this.h1 = (this.h1 ^ Z1[x - 1][f] ^ Z1[x - 1][t]) >>> 0; this.h2 = (this.h2 ^ Z2[x - 1][f] ^ Z2[x - 1][t]) >>> 0;
    }
    this.side ^= 1; this.ply++;
    this.h1 = (this.h1 ^ ZS1) >>> 0; this.h2 = (this.h2 ^ ZS2) >>> 0;
    return this;
  }
  spec() { let s = ''; for (let i = 0; i < 64; i++) s += '.wb'[this.sq[i]]; return { b: s, side: this.side ? P2 : P1, n: this.ply }; }
  // moves played by p so far (White moves at plies 0, 2, …)
  movesOf(p) { return p === P1 ? (this.ply + 1) >> 1 : this.ply >> 1; }
}
// the squares a move passes through (a step: [from, to]; a jump chain: every landing square)
function path(pos, m) {
  if (m === PASS) return [];
  const f = mFrom(m), t = mTo(m);
  const tmp = []; pos.reach(f, tmp);
  if (!tmp.includes(t)) return [f, t];
  if (parent[t] === -1) return [f, t];
  const out = [t]; let x = t, guard = 0;
  while (x !== f && guard++ < 64) { x = parent[x]; out.push(x); }
  return out.reverse();
}
const isJump = (pos, m) => { if (m === PASS) return false; const p = path(pos, m); if (p.length > 2) return true; const [r0, c0] = RC[p[0]], [r1, c1] = RC[p[1]]; return Math.max(Math.abs(r0 - r1), Math.abs(c0 - c1)) === 2; };
// notation: c2-c4 (a step or a jump chain — written from and to, like the Russian books)
function name(pos, m) { if (m === PASS) return '—'; return sqName(mFrom(m)) + (isJump(pos, m) ? ':' : '-') + sqName(mTo(m)); }
function parse(pos, s) {
  const x = String(s).toLowerCase().match(/([a-h])([1-8])\s*[-:x×]?\s*([a-h])([1-8])/);
  if (!x) return null;
  const f = (8 - +x[2]) * 8 + 'abcdefgh'.indexOf(x[1]), t = (8 - +x[4]) * 8 + 'abcdefgh'.indexOf(x[3]);
  const m = mv(f, t); return pos.moves().includes(m) ? m : null;
}
function replay(start, moves) {
  const pos = Pos.from(start), hashes = [pos.h1 + ':' + pos.h2];
  for (const m of moves || []) { pos.play(m); hashes.push(pos.h1 + ':' + pos.h2); }
  return { pos, hashes };
}
// game status: { over, winner (1/2/0), draw, why: 'home' | 'both' | 'stuck' | 'stuck2' | 'count' | 'block' | 'rep' }
function countResult(pos, why) {
  const a = pos.inTarget(P1), b = pos.inTarget(P2);
  if (a === b) return { over: true, winner: 0, draw: true, why, cnt: [a, b] };
  return { over: true, winner: a > b ? P1 : P2, why, cnt: [a, b] };
}
function judge(pos, hashes) {
  if (pos.free) { if (pos.done(P1)) return { over: true, winner: P1, why: 'home' }; return { over: false }; }
  const n = pos.ply;
  if (n >= 2 && !(n & 1)) {            // after Black's move
    const wd = pos.done(P1), bd = pos.done(P2);
    if (wd && bd) return { over: true, winner: 0, draw: true, why: 'both' };
    if (wd) return { over: true, winner: P1, why: 'home' };
    if (bd) return { over: true, winner: P2, why: 'home' };
    if (n === 2 * R.limit) {
      const sw = pos.inHome(P1) > 0, sb = pos.inHome(P2) > 0;
      if (sw && sb) return { over: true, winner: 0, draw: true, why: 'stuck2' };
      if (sw) return { over: true, winner: P2, why: 'stuck' };
      if (sb) return { over: true, winner: P1, why: 'stuck' };
    }
    if (n >= 2 * R.cap) return countResult(pos, 'count');
  } else if (n & 1) {
    // Black already in while White has not finished: Black's arrival was decided at its own move; nothing to do here
  }
  if (!pos.hasMove()) return countResult(pos, 'block');
  if (hashes) { const h = pos.h1 + ':' + pos.h2; let c = 0; for (const x of hashes) if (x === h) c++; if (c >= 3) return { over: true, winner: 0, draw: true, why: 'rep' }; }
  return { over: false };
}
// ---------------------------------------------------------------- AI levels (20 steps: 15級 … 1級, 初段 … 五段)
// weak levels (15級〜5級) always head for the corner — they are weaker because they look at fewer pieces (`look`: how many of
// the pieces that can move forward they consider; a beginner misses the long jump of a piece at the back), plan less deep
// and add a little noise. They never wander backwards while a forward move exists.
const LEVELS = [null,
  { d: 1, look: 2, noise: 14 },          // 15級
  { d: 1, look: 3, noise: 12 },          // 14級
  { d: 1, look: 4, noise: 10 },          // 13級
  { d: 2, look: 4, noise: 10 },          // 12級
  { d: 2, look: 5, noise: 8 },           // 11級
  { d: 2, look: 7, noise: 8 },           // 10級
  { d: 2, noise: 8 },                    // 9級
  { d: 3, noise: 8 },                    // 8級
  { d: 3, noise: 4 },                    // 7級
  { d: 4, noise: 4 },                    // 6級
  { d: 4, noise: 2 },                    // 5級
  { s: 1, nk: 3 },                       // 4級  (about 3,000 positions per move)
  { s: 1, nk: 7 },                       // 3級
  { s: 1, nk: 15 },                      // 2級
  { s: 1, nk: 30 },                      // 1級
  { s: 1, nk: 60 },                      // 初段
  { s: 1, nk: 120 },                     // 二段
  { s: 1, nk: 220 },                     // 三段
  { s: 1, ms: 1200, book: 1 },           // 四段
  { s: 1, ms: 2500, book: 1 },           // 五段
];
function gauss(rand) { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
// ---------------------------------------------------------------- evaluation (side to move's view, ~100 = one tempo)
// race: Σ distances to the far corner (each step = 1, a jump = 2 per hop). A side to move is about half a step ahead.
// stragglers (the last piece decides the finish), pieces still at home as the 40-move limit nears, and "roads":
// a piece standing next to an empty square beyond which a friend can hop is worth a little (it is the road others use).
const SCALE = 34;
function sideScore(pos, p) {
  const D = DIST[p], sq = pos.sq, H = HOME[p], T = target(p);
  let s = 0, mx = 0, home = 0, n = 0, inT = 0;
  for (let i = 0; i < 64; i++) if (sq[i] === p) { const d = D[i]; s += d; if (d > mx) mx = d; n++; if (H[i]) home++; if (T[i]) inT++; }
  let v = -(s - BASE[p]) * SCALE - mx * 9;
  const mv = pos.movesOf(p), lim = R.limit;
  if (home) { const k = Math.max(0, mv - (lim - 14)); v -= home * (12 + k * k * 6); }
  // target corner filled from the deep end: a piece in the corner that blocks the way of later pieces is fine, empty
  // deep squares with all near ones full cost a move at the end
  if (inT >= n - 2 && inT < n) v -= 20;
  return v;
}
function evaluate(pos) {
  const me = pos.side + 1, op = 3 - me;
  return sideScore(pos, me) - sideScore(pos, op) + 18;
}
// terminal value for the side to move, or null
function terminal(pos, ply) {
  const st = judge(pos, null);
  if (!st.over) return null;
  if (st.draw) return 0;
  return st.winner === pos.side + 1 ? WIN - ply : -(WIN - ply);
}
// ---------------------------------------------------------------- search (negamax alpha-beta, TT, iterative deepening)
const TT = new Map();
let nodes = 0, nodeLimit = Infinity, tEnd = Infinity, stop = false;
const killers = [];
// the positions of the game so far and of the line being searched ("h1:h2" in hist ⇔ the same pair here), for repetitions
const RH1 = new Float64Array(4096), RH2 = new Float64Array(4096); let rhN = 0;
function loadHist(hist) { rhN = 0; for (const x of hist) { const k = x.indexOf(':'); RH1[rhN] = +x.slice(0, k); RH2[rhN] = +x.slice(k + 1); rhN++; } }
function seenBefore(h1, h2) { for (let i = 0; i < rhN; i++) if (RH1[i] === h1 && RH2[i] === h2) return true; return false; }
const OSC = new Float64Array(1024);
function orderMoves(pos, L, ttm, ply) {
  const D = DIST[pos.side + 1], k = killers[ply] || -1, T = target(pos.side + 1), H = HOME[pos.side + 1], n = L.length, out = L.slice();
  // the same scores, then a stable insertion sort (best first) = the order of the former stable index sort
  for (let i = 0; i < n; i++) {
    const m = out[i];
    let v; if (m === ttm) v = 1e9; else if (m === k) v = 1e8; else { const f = m % 64, t = (m / 64) | 0; v = (D[f] - D[t]) * 100 + (T[t] ? 30 : 0) - (H[f] ? -15 : 0); }
    let j = i; while (j > 0 && OSC[j - 1] < v) { OSC[j] = OSC[j - 1]; out[j] = out[j - 1]; j--; }
    OSC[j] = v; out[j] = m;
  }
  return out;
}
function search(pos, d, a, b, ply) {
  nodes++;
  if ((nodes & 1023) === 0 && (Date.now() > tEnd || nodes > nodeLimit)) stop = true;
  if (stop) return 0;
  const tv = terminal(pos, ply); if (tv !== null) return tv;
  const key = pos.h1, e = TT.get(key);
  // repetition inside the line = draw
  if (ply > 0 && seenBefore(pos.h1, pos.h2)) return 0;
  if (e && e.h2 === pos.h2 && e.d >= d && e.ply === pos.ply) {
    if (e.f === 0) return e.v; if (e.f === 1 && e.v >= b) return e.v; if (e.f === 2 && e.v <= a) return e.v;
  }
  if (d <= 0) return evaluate(pos);
  let L = pos.moves();
  L = orderMoves(pos, L, e && e.h2 === pos.h2 ? e.m : -1, ply);
  let best = -Infinity, bm = L[0];
  const a0 = a;
  RH1[rhN] = pos.h1; RH2[rhN] = pos.h2; rhN++;
  for (let i = 0; i < L.length; i++) {
    const m = L[i], q = pos.clone().play(m);
    let v;
    if (i === 0) v = -search(q, d - 1, -b, -a, ply + 1);
    else {
      const red = (d >= 3 && i >= 6) ? 1 : 0;
      v = -search(q, d - 1 - red, -a - 1, -a, ply + 1);
      if (v > a && (red || v < b)) v = -search(q, d - 1, -b, -a, ply + 1);
    }
    if (stop) { rhN--; return best === -Infinity ? 0 : best; }
    if (v > best) { best = v; bm = m; if (v > a) { a = v; if (a >= b) { killers[ply] = m; break; } } }
  }
  rhN--;
  if (TT.size > 600000) TT.clear();
  TT.set(key, { h2: pos.h2, d, v: best, f: best <= a0 ? 2 : best >= b ? 1 : 0, m: bm, ply: pos.ply });
  return best;
}
function rootValues(pos, d, hist) {
  const L = orderMoves(pos, pos.moves(), -1, 0), out = [];
  for (const m of L) {
    const q = pos.clone().play(m);
    loadHist(hist); const v = -search(q, d - 1, -WIN - 1, WIN + 1, 1);
    if (stop) break;
    out.push({ m, v });
  }
  return out.sort((x, y) => y.v - x.v);
}
function bestMove(pos, hist, maxD, ms, nk) {
  nodes = 0; stop = false; tEnd = ms ? Date.now() + ms : Infinity; nodeLimit = nk ? nk * 1000 : Infinity; killers.length = 0;
  const L = pos.moves(); if (L.length === 1) return { move: L[0], v: 0, depth: 0 };
  let best = { move: orderMoves(pos, L, -1, 0)[0], v: 0, depth: 0 };
  for (let d = 1; d <= (maxD || 60); d++) {
    let a = -WIN - 1, bm = null, bv = -Infinity;
    const ttE = TT.get(pos.h1), order = orderMoves(pos, L, best.move, 0);
    for (const m of order) {
      const q = pos.clone().play(m);
      loadHist(hist); const v = -search(q, d - 1, -WIN - 1, -a, 1);
      if (stop) break;
      if (v > bv) { bv = v; bm = m; if (v > a) a = v; }
    }
    if (stop && !bm) break;
    if (bm !== null) best = { move: bm, v: bv, depth: d };
    if (stop) break;
    if (Math.abs(bv) > WINT) break;
    void ttE;
  }
  return best;
}
const histOf = (start, moves) => { const { hashes } = replay(start, moves); hashes.pop(); return hashes; };

let PRO_CFG = null;   // a step of the page's PRO mode for the current 'think' message (same keys as LEVELS)
function think(start, moves, level, rand, rule) {
  if (rule) setRule(rule);
  rand = rand || Math.random;
  const L = PRO_CFG || LEVELS[level] || LEVELS[10];   // (PRO_CFG: the page's PRO mode, shared/proset.js ladder())
  const { pos } = replay(start, moves), hist = histOf(start, moves);
  const all = pos.moves();
  if (!all.length) return { move: -1 };
  if (all.length === 1) return { move: all[0] };
  if (!L.s) {
    nodes = 0; stop = false; tEnd = Date.now() + 2500; nodeLimit = Infinity;
    let vals = rootValues(pos, L.d, hist);
    // always forward: only moves that bring the piece nearer the far corner (when there are any) …
    { const D = DIST[pos.turn], fwd = vals.filter(e => e.m !== PASS && (D[mFrom(e.m)] > D[mTo(e.m)] || e.v > WINT));
      if (fwd.length) vals = fwd;
      else { vals = rootValues(pos, Math.max(L.d, 4), hist); return { move: vals[0].m, v: vals[0].v }; }   // stuck (the corner is jammed): even a beginner then thinks it through
      // … and of only a few pieces (the ones a beginner happens to look at)
      if (L.look) { const fr = [...new Set(vals.map(e => mFrom(e.m)))]; if (fr.length > L.look) {
        for (let i = fr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [fr[i], fr[j]] = [fr[j], fr[i]]; }
        const keep = new Set(fr.slice(0, L.look));
        { const H = HOME[pos.turn]; if (pos.inHome(pos.turn) && R.limit - pos.movesOf(pos.turn) <= 10) fr.forEach(f => { if (H[f]) keep.add(f); }); }   // the 40-move rule is never forgotten
        const v2 = vals.filter(e => keep.has(mFrom(e.m))); if (v2.length) vals = v2; } }
      vals.sort((x, y) => y.v - x.v);
      // no going round in circles: a move back to a position already seen only when nothing else is left
      { const seen = new Set(hist.concat([pos.h1 + ':' + pos.h2])); const fresh = vals.filter(e => { const q = pos.clone().play(e.m); return !seen.has(q.h1 + ':' + q.h2); }); if (fresh.length) vals = fresh; } }
    // even the weakest levels do not forget the 40-move rule: near the limit only moves that take a piece out of home
    { const me = pos.turn, H = HOME[me], left = R.limit - pos.movesOf(me);
      if (!pos.free && pos.inHome(me) && left <= 6) { const out = vals.filter(e => H[mFrom(e.m)] && !H[mTo(e.m)]); if (out.length) vals = out; } }
    if (L.blunder && rand() < L.blunder) {
      const ok = vals.filter(e => e.v > vals[0].v - 150); const pool = ok.length > 1 ? ok : vals;
      return { move: pool[Math.floor(rand() * pool.length)].m, v: vals[0].v };
    }
    let best = vals[0].m, bv = -Infinity;
    for (const e of vals) { const x = e.v + (Math.abs(e.v) > WINT ? 0 : gauss(rand) * L.noise); if (x > bv) { bv = x; best = e.m; } }
    return { move: best, v: vals[0].v };
  }
  if (L.book && moves.length < 6 && !start) {
    nodes = 0; stop = false; tEnd = Date.now() + 600; nodeLimit = Infinity;
    const vals = rootValues(pos, 3, hist), good = vals.filter(e => e.v >= vals[0].v - 10);
    return { move: good[Math.floor(rand() * good.length)].m, v: vals[0].v };
  }
  const r = bestMove(pos, hist, L.dx || 60, L.ms || 3000, L.nk || 0);
  return { move: r.move, v: r.v, depth: r.depth };
}
const kindOf = v => Math.abs(v) > WINT ? 'exact' : 'heur';
function analyze(start, moves, ms, onProgress, rule) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves), hist = histOf(start, moves);
  nodes = 0; stop = false; tEnd = Date.now() + (ms || 1000); nodeLimit = Infinity;
  let list = [], depth = 0;
  for (let d = 1; d <= 30; d++) {
    const vals = rootValues(pos, d, hist);
    if (stop && vals.length < pos.moves().length) break;
    list = vals.map(e => ({ ...e, kind: kindOf(e.v) })); depth = d;
    if (onProgress) onProgress(list, d);
    if (stop) break;
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
      const { pos, hashes } = replay(start, line);
      if (judge(pos, hashes).over) break;
      const b = bestMove(pos, hashes.slice(0, -1), 4, 60, 0);
      if (b.move == null || b.move < 0) break;
      line.push(b.move); e.pv.push(b.move);
    }
  }
  return { list, depth: r.depth };
}
// ---------------------------------------------------------------- one-player puzzles: fill the target corner in n moves
// (Black does not move: PASS). Lower bound = White pieces outside the corner (each needs a move of its own).
function soloNeed(pos) { return HOMEL[P1].length - pos.inTarget(P1); }
let soloBudget = Infinity;
function soloSolve(pos, n, seen) {
  if (pos.done(P1)) return true;
  if (n <= 0 || soloNeed(pos) > n) return false;
  if (--soloBudget < 0) return false;
  const k = pos.h1 + ':' + pos.h2 + ':' + n; if (seen.has(k)) return false;
  const T = target(P1), slack = n - soloNeed(pos);
  // with no slack every move must bring a new piece into the corner
  let L = pos.moves();
  if (slack === 0) L = L.filter(m => m !== PASS && !T[m % 64] && T[(m / 64) | 0]);
  else L = L.slice().sort((a, b) => (T[(b / 64) | 0] && !T[b % 64]) - (T[(a / 64) | 0] && !T[a % 64]));
  for (const m of L) {
    const q = pos.clone().play(m); q.play(PASS);
    if (soloSolve(q, n - 1, seen)) return true;
  }
  if (soloBudget >= 0) seen.add(k);
  return false;
}
// the moves of White that still finish within n moves (from a position with White to move)
function soloGood(start, moves, n, rule, budget) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves); const out = [];
  if (pos.side) return out;
  const seen = new Set(); soloBudget = budget || 3e6;
  for (const m of pos.moves()) { const q = pos.clone().play(m); q.play(PASS); if (soloSolve(q, n - 1, seen)) out.push(m); }
  soloBudget = Infinity;
  return out;
}
// fewest moves to finish (up to max), or -1 (also -1 when the search budget runs out)
function soloMin(spec, max, rule, budget) {
  if (rule) setRule(rule);
  const pos = Pos.from(spec); const seen = new Set();
  soloBudget = budget || 3e6;
  for (let n = soloNeed(pos); n <= (max || 12); n++) { if (soloSolve(pos, n, seen)) { soloBudget = Infinity; return n; } if (soloBudget < 0) break; }
  soloBudget = Infinity;
  return -1;
}
// ---------------------------------------------------------------- two-player puzzles ("win in N": the opponent moves too)
// duelWin(pos, k): the side to move forces a win (judge: winner = that side) within its next k moves, whatever the opponent
// replies (the game is decided after Black's move, so White's finishing move is followed by Black's last reply).
// A move can bring at most one piece into the target corner: pieces still outside > moves left → impossible (the main cut).
let duelNodes = 0, duelBudget = Infinity;
const DTT = new Map();
const outside = (pos, p) => HOMEL[p].length - pos.inTarget(p);
function duelW(pos, k, me) {
  if (outside(pos, me) > k) return false;
  if (--duelBudget < 0) return false;
  const key = pos.h1 + ':' + pos.h2 + ':' + pos.ply + ':' + k + 'w';
  const c = DTT.get(key); if (c !== undefined) return c;
  duelNodes++;
  let res = false;
  const ms = pos.moves(), T = target(me);
  // moves into the corner first
  ms.sort((a, b) => (T[mTo(b)] ? 1 : 0) - (T[mTo(a)] ? 1 : 0));
  for (const m of ms) {
    if (m === PASS) continue;
    const q = pos.clone().play(m);
    if (outside(q, me) > k - 1) continue;
    const r = judge(q);
    if (r.over) { if (r.winner === me) { res = true; break; } continue; }
    if (duelB(q, k - 1, me)) { res = true; break; }
    if (duelBudget < 0) break;
  }
  if (duelBudget >= 0) DTT.set(key, res);
  return res;
}
// the opponent to move: every reply must still lose (within k more moves of `me`)
function duelB(pos, k, me) {
  if (--duelBudget < 0) return false;
  const key = pos.h1 + ':' + pos.h2 + ':' + pos.ply + ':' + k + 'b';
  const c = DTT.get(key); if (c !== undefined) return c;
  duelNodes++;
  const ms = pos.moves(), opp = 3 - me, T = target(opp), MT = target(me);
  if (!ms.length) { const r = judge(pos); return r.over && r.winner === me; }
  // likely refutations first: the opponent's own entries, then squares in my corner (blocking)
  ms.sort((a, b) => ((T[mTo(b)] ? 2 : 0) + (MT[mTo(b)] ? 1 : 0)) - ((T[mTo(a)] ? 2 : 0) + (MT[mTo(a)] ? 1 : 0)));
  let res = true;
  for (const m of ms) {
    const q = pos.clone().play(m);
    const r = judge(q);
    if (r.over) { if (r.winner === me) continue; res = false; break; }
    if (k <= 0 || !duelW(q, k, me)) { res = false; break; }
    if (duelBudget < 0) { res = false; break; }
  }
  if (duelBudget >= 0) DTT.set(key, res);
  return res;
}
// the moves of the side to move that win within n of its moves (budget: nodes; null = gave up)
function duelGood(start, moves, n, rule, budget) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves), me = pos.turn, out = [];
  DTT.clear(); duelNodes = 0; duelBudget = budget || 4e6;
  for (const m of pos.moves()) {
    if (m === PASS) continue;
    const q = pos.clone().play(m);
    if (outside(q, me) > n - 1) continue;
    const r = judge(q);
    if (r.over ? r.winner === me : duelB(q, n - 1, me)) out.push(m);
    if (duelBudget < 0) { duelBudget = Infinity; return null; }
  }
  duelBudget = Infinity;
  return out;
}
// the smallest n (≤ max) in which the side to move forces a win, or -1
function duelMin(start, moves, max, rule, budget) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves), me = pos.turn;
  DTT.clear(); duelBudget = budget || 4e6;
  for (let n = Math.max(1, outside(pos, me)); n <= (max || 5); n++) { if (duelW(pos, n, me)) { duelBudget = Infinity; return n; } if (duelBudget < 0) break; }
  duelBudget = Infinity;
  return -1;
}
// the opponent's most stubborn reply: the one after which the winner needs the most moves (ties: a reply into the winner's
// corner or the opponent's own entry — the moves that look like a defence)
function duelReply(start, moves, n, rule) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves), opp = pos.turn, me = 3 - opp, MT = target(me), OT = target(opp);
  let best = null, bk = -1, bt = -1;
  DTT.clear(); duelBudget = 4e6;
  for (const m of pos.moves()) {
    const q = pos.clone().play(m), r = judge(q);
    let k;
    if (r.over) k = r.winner === me ? 0 : 99;
    else { k = 99; for (let j = 1; j <= n; j++) if (duelW(q, j, me)) { k = j; break; } }
    const tie = (OT[mTo(m)] ? 2 : 0) + (MT[mTo(m)] ? 1 : 0);
    if (k > bk || (k === bk && tie > bt)) { bk = k; bt = tie; best = m; }
  }
  duelBudget = Infinity;
  return { move: best, need: bk };
}
function puzzle(start, moves, n, defend, goal, base, rule) { return soloGood(start, moves, n, rule).map(m => ({ m, need: n })); }

setRule('c33');
const API = { get nodes() { return nodes; }, P1, P2, WIN, WINT, PASS, RULES, RULE_ORDER, setRule, get rule() { return RK; }, get R() { return R; }, HOME: () => HOME, HOMEL: () => HOMEL, DIST: () => DIST, target, RC, sqAt, sqName, mv, mFrom, mTo, mCap, Pos, path, isJump, name, parse, replay, judge, LEVELS, think, analyze, cands, puzzle, soloGood, soloMin, soloNeed, duelGood, duelMin, duelReply, evaluate, kindOf, bitsOf: () => [], popc: () => 0, bit: () => 0 };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof self !== 'undefined' && typeof importScripts === 'function' && typeof window === 'undefined') {
  let queueP = Promise.resolve();
  self.onmessage = e => {
    const m = e.data;
    queueP = queueP.then(() => {
      try {
        setRule(m.rule || 'c33');
        if (m.type === 'think') self.postMessage({ id: m.id, type: 'result', ...(() => { PRO_CFG = m.cfg || null; try { return think(m.start, m.moves, m.level); } finally { PRO_CFG = null; } })() });
        else if (m.type === 'analyze') {
          const r = analyze(m.start, m.moves, m.time || 1000, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth }));
          self.postMessage({ id: m.id, type: 'result', ...r });
        } else if (m.type === 'cands') self.postMessage({ id: m.id, type: 'result', ...cands(m.start, m.moves, m.time || 1200, m.k, m.plies, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth })) });
        else if (m.type === 'puzzle') self.postMessage({ id: m.id, type: 'result', list: puzzle(m.start, m.moves, m.n) });
        else if (m.type === 'duel') { const g = duelGood(m.start, m.moves, m.n); self.postMessage({ id: m.id, type: 'result', list: g ? g.map(x => ({ m: x, need: m.n })) : null }); }
        else if (m.type === 'duelReply') self.postMessage({ id: m.id, type: 'result', ...duelReply(m.start, m.moves, m.n) });
        else if (m.type === 'newgame') { TT.clear(); self.postMessage({ id: m.id, type: 'result' }); }
      } catch (err) { self.postMessage({ id: m.id, type: 'result', error: String(err && err.stack || err) }); }
    });
  };
}
if (typeof window !== 'undefined') window.UgolkiEngine = API;
})();

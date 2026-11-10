// Game of the Amazons (Walter Zamkauskas, Argentina, 1988) — rules (for the page) and the AI worker (plain JS search).
// Works as a Web Worker (postMessage API), as a plain <script> (window.AmazonsEngine) and as a Node module.
//
// Board: 10×10, index = r * 10 + c, r = 0 is the top rank (10), c = 0 is file a.
// White (P1) moves first: amazons on a4 d1 g1 j4; Black (P2): a7 d10 g10 j7.
// A move: one of your amazons moves like a chess queen (any distance, 8 directions, never through or onto anything),
// then from where it lands it shoots an arrow, also like a queen; the arrow's square is blocked for the rest of the game
// (it may land on the square the amazon just left). The player who cannot move loses — there are no draws.
// Moves: m = from + 128 * to + 16384 * arrow. Notation "d1-d7/g7".
(function () {
'use strict';
const P1 = 1, P2 = 2;                 // P1 = White (moves first), P2 = Black
const WIN = 30000, WINT = 29000;
const N = 10, NN = 100, ARROW = 3, INF = 99;
const RULES = { std: { n: 10 } }, RULE_ORDER = ['std'];
// ---------------------------------------------------------------- geometry
const RC = [], RAYS = [], NB = [];
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
for (let i = 0; i < NN; i++) {
  const r = (i / N) | 0, c = i % N; RC.push([r, c]);
  const rays = [], nb = [];
  for (const [dr, dc] of DIRS) {
    const ray = []; let rr = r + dr, cc = c + dc;
    while (rr >= 0 && rr < N && cc >= 0 && cc < N) { ray.push(rr * N + cc); rr += dr; cc += dc; }
    rays.push(Int8Array.from(ray)); if (ray.length) nb.push(ray[0]);
  }
  RAYS.push(rays); NB.push(Int8Array.from(nb));
}
const FILES = 'abcdefghij';
const sqAt = (r, c) => (r < 0 || r >= N || c < 0 || c >= N) ? -1 : r * N + c;
const sqName = i => FILES[i % N] + (N - ((i / N) | 0));
const sqIdx = nm => (N - +nm.slice(1)) * N + FILES.indexOf(nm[0]);
const mv = (f, t, a) => f + 128 * t + 16384 * a;
const mFrom = m => m < 0 ? -1 : m % 128, mTo = m => m < 0 ? -1 : ((m / 128) | 0) % 128, mArrow = m => m < 0 ? -1 : (m / 16384) | 0;
const START = { w: ['a4', 'd1', 'g1', 'j4'], b: ['a7', 'd10', 'g10', 'j7'] };
// zobrist (two 32-bit halves) for White, Black, arrow
const Z1 = [[], [], []], Z2 = [[], [], []];
let ZS1 = 0, ZS2 = 0;
{
  let zs = 0x2545F491;
  const zr = () => { zs ^= zs << 13; zs >>>= 0; zs ^= zs >>> 17; zs ^= zs << 5; zs >>>= 0; return zs; };
  for (let k = 0; k < 3; k++) for (let i = 0; i < NN; i++) { Z1[k].push(zr()); Z2[k].push(zr()); }
  ZS1 = zr(); ZS2 = zr();
}
function setRule() {}

class Pos {
  constructor() { this.sq = new Int8Array(NN); this.q = new Int8Array(8); this.side = 0; this.ply = 0; this.reset(); }
  reset() {
    this.sq.fill(0);
    START.w.forEach((s, k) => { const i = sqIdx(s); this.sq[i] = P1; this.q[k] = i; });
    START.b.forEach((s, k) => { const i = sqIdx(s); this.sq[i] = P2; this.q[4 + k] = i; });
    this.side = 0; this.ply = 0; this.rehash();
  }
  // spec: { b: 100 chars '.' 'w' 'b' 'x' (White, Black, arrow), side: 1 | 2, n: plies already played } or null (the start)
  static from(spec) {
    const p = new Pos();
    if (spec && spec.b) {
      p.sq.fill(0); p.q.fill(-1);
      let kw = 0, kb = 4;
      for (let i = 0; i < NN; i++) {
        const ch = spec.b[i];
        if (ch === 'w' && kw < 4) { p.sq[i] = P1; p.q[kw++] = i; }
        else if (ch === 'b' && kb < 8) { p.sq[i] = P2; p.q[kb++] = i; }
        else if (ch === 'x') p.sq[i] = ARROW;
      }
      p.side = spec.side === P2 ? 1 : 0;
      p.ply = spec.n != null ? spec.n | 0 : p.side;
      p.rehash();
    }
    return p;
  }
  clone() { const o = Object.create(Pos.prototype); o.sq = this.sq.slice(); o.q = this.q.slice(); o.side = this.side; o.ply = this.ply; o.h1 = this.h1; o.h2 = this.h2; return o; }
  copyFrom(s) { this.sq.set(s.sq); this.q.set(s.q); this.side = s.side; this.ply = s.ply; this.h1 = s.h1; this.h2 = s.h2; return this; }
  rehash() {
    let a = 0, c = 0;
    for (let i = 0; i < NN; i++) { const x = this.sq[i]; if (x) { a ^= Z1[x - 1][i]; c ^= Z2[x - 1][i]; } }
    if (this.side) { a ^= ZS1; c ^= ZS2; }
    this.h1 = a >>> 0; this.h2 = c >>> 0;
  }
  // the page's kinds: 0 empty, 1 White amazon, 3 Black amazon, 5 arrow
  at(i) { const x = this.sq[i]; return x === P1 ? 1 : x === P2 ? 3 : x === ARROW ? 5 : 0; }
  owner(i) { const x = this.sq[i]; return x === P1 || x === P2 ? x : 0; }
  get turn() { return this.side ? P2 : P1; }
  get opening() { return false; }
  arrows() { let n = 0; for (let i = 0; i < NN; i++) if (this.sq[i] === ARROW) n++; return n; }
  count(p) { let n = 0; for (let k = 0; k < 8; k++) if (this.q[k] >= 0 && this.sq[this.q[k]] === p) n++; return n; }
  // can p move at all (an amazon with an empty neighbour can always move there and shoot back)
  canMove(p) {
    const sq = this.sq, k0 = p === P1 ? 0 : 4;
    for (let k = k0; k < k0 + 4; k++) { const f = this.q[k]; if (f < 0) continue; const nb = NB[f]; for (let j = 0; j < nb.length; j++) if (!sq[nb[j]]) return true; }
    return false;
  }
  // the queen moves (from, to) of p, without the arrow: [f + 128 * t, …]
  qmoves(p, out) {
    const sq = this.sq, k0 = p === P1 ? 0 : 4;
    for (let k = k0; k < k0 + 4; k++) {
      const f = this.q[k]; if (f < 0) continue;
      const rays = RAYS[f];
      for (let d = 0; d < 8; d++) { const ray = rays[d]; for (let j = 0; j < ray.length; j++) { const t = ray[j]; if (sq[t]) break; out.push(f + 128 * t); } }
    }
    return out;
  }
  // the arrows from t once the amazon has moved f → t (f is empty then)
  arrowsFrom(f, t, out) {
    const sq = this.sq, x = sq[f]; sq[f] = 0;
    const rays = RAYS[t];
    for (let d = 0; d < 8; d++) { const ray = rays[d]; for (let j = 0; j < ray.length; j++) { const a = ray[j]; if (sq[a]) break; out.push(a); } }
    sq[f] = x;
    return out;
  }
  moves() {
    const p = this.side + 1, out = [], Q = this.qmoves(p, []), tmp = [];
    for (const qm of Q) { const f = qm % 128, t = (qm / 128) | 0; tmp.length = 0; this.arrowsFrom(f, t, tmp); for (const a of tmp) out.push(qm + 16384 * a); }
    return out;
  }
  // how many queen moves p has (one number for the panel: the amazons' freedom)
  mobility(p) {
    const sq = this.sq, k0 = p === P1 ? 0 : 4; let n = 0;
    for (let k = k0; k < k0 + 4; k++) { const f = this.q[k]; if (f < 0) continue; const rays = RAYS[f]; for (let d = 0; d < 8; d++) { const ray = rays[d]; for (let j = 0; j < ray.length; j++) { if (sq[ray[j]]) break; n++; } } }
    return n;
  }
  isLegal(m) {
    if (m < 0) return false;
    const f = mFrom(m), t = mTo(m), a = mArrow(m), p = this.side + 1;
    if (f >= NN || t >= NN || a >= NN || this.sq[f] !== p) return false;
    if (!clearLine(this.sq, f, t, -1)) return false;
    return clearLine(this.sq, t, a, f);
  }
  play(m) {
    const f = m % 128, t = ((m / 128) | 0) % 128, a = (m / 16384) | 0, p = this.side + 1, sq = this.sq;
    sq[f] = 0; sq[t] = p; sq[a] = ARROW;
    for (let k = 0; k < 8; k++) if (this.q[k] === f) { this.q[k] = t; break; }
    this.h1 = (this.h1 ^ Z1[p - 1][f] ^ Z1[p - 1][t] ^ Z1[2][a] ^ ZS1) >>> 0;
    this.h2 = (this.h2 ^ Z2[p - 1][f] ^ Z2[p - 1][t] ^ Z2[2][a] ^ ZS2) >>> 0;
    this.side ^= 1; this.ply++;
    return this;
  }
  unplay(m) {
    const f = m % 128, t = ((m / 128) | 0) % 128, a = (m / 16384) | 0, sq = this.sq;
    this.side ^= 1; this.ply--;
    const p = this.side + 1;
    sq[a] = 0; sq[t] = 0; sq[f] = p;
    for (let k = 0; k < 8; k++) if (this.q[k] === t) { this.q[k] = f; break; }
    this.h1 = (this.h1 ^ Z1[p - 1][f] ^ Z1[p - 1][t] ^ Z1[2][a] ^ ZS1) >>> 0;
    this.h2 = (this.h2 ^ Z2[p - 1][f] ^ Z2[p - 1][t] ^ Z2[2][a] ^ ZS2) >>> 0;
    return this;
  }
  spec() { let s = ''; for (let i = 0; i < NN; i++) s += '.wbx'[this.sq[i]]; return { b: s, side: this.side ? P2 : P1, n: this.ply }; }
  // territory by queen distance (who reaches each empty square in fewer queen moves): { a: White's, b: Black's, n: neutral, sep: no square both reach }
  terr() {
    padFrom(this.sq, this.q); distQ(0, DA); distQ(4, DB);
    let a = 0, b = 0, n = 0, both = 0;
    for (let i = 0; i < NN; i++) {
      if (this.sq[i]) continue;
      const x = DA[PI[i]], y = DB[PI[i]];
      if (x < y) a++; else if (y < x) b++; else if (x < INF) n++;
      if (x < INF && y < INF) both++;
    }
    return { a, b, n, sep: both === 0 };
  }
}
// is the straight queen line f → t (exclusive of f) empty? (skip: a square that counts as empty, the amazon's old one)
function clearLine(sq, f, t, skip) {
  if (f === t) return false;
  const [r0, c0] = RC[f], [r1, c1] = RC[t], dr = Math.sign(r1 - r0), dc = Math.sign(c1 - c0);
  if (!(r0 === r1 || c0 === c1 || Math.abs(r1 - r0) === Math.abs(c1 - c0))) return false;
  let r = r0 + dr, c = c0 + dc;
  for (;;) { const i = r * N + c; if (sq[i] && i !== skip) return false; if (i === t) return true; r += dr; c += dc; }
}
// ---------------------------------------------------------------- distances (the evaluation's core)
// The searches run on a padded 12×12 copy of the board (a wall of blocked squares around it): a line is followed by adding
// its offset until a blocked square, with no bounds checks and no per-square ray tables.
const PW = 12, PN = PW * PW, PI = new Uint8Array(NN), OFF = [-PW, PW, -1, 1, -PW - 1, -PW + 1, PW - 1, PW + 1];
for (let i = 0; i < NN; i++) PI[i] = (((i / N) | 0) + 1) * PW + (i % N) + 1;
const PB = new Int8Array(PN), PQ = new Uint8Array(8);
const DA = new Uint8Array(PN), DB = new Uint8Array(PN), KA = new Uint8Array(PN), KB = new Uint8Array(PN);
const QU = new Uint8Array(PN + 8);
function padFrom(sq, q) {
  PB.fill(1);
  for (let i = 0; i < NN; i++) PB[PI[i]] = sq[i];
  for (let k = 0; k < 8; k++) PQ[k] = q[k] >= 0 ? PI[q[k]] : 0;
}
// queen-move distance from the amazons PQ[k0 … k0+3] to every empty square (INF = unreachable)
function distQ(k0, D) {
  D.fill(INF);
  let h = 0, tl = 0;
  for (let k = k0; k < k0 + 4; k++) { const f = PQ[k]; if (f) { D[f] = 0; QU[tl++] = f; } }
  while (h < tl) {
    const s = QU[h++], nd = D[s] + 1;
    for (let d = 0; d < 8; d++) {
      const o = OFF[d];
      for (let t = s + o; PB[t] === 0; t += o) {
        const dt = D[t];
        if (dt > nd) { D[t] = nd; QU[tl++] = t; }
        else if (dt < nd) break;   // (t is expanded itself: the squares beyond it are no nearer through this line)
      }
    }
  }
}
// king-move distance (one step at a time)
function distK(k0, D) {
  D.fill(INF);
  let h = 0, tl = 0;
  for (let k = k0; k < k0 + 4; k++) { const f = PQ[k]; if (f) { D[f] = 0; QU[tl++] = f; } }
  while (h < tl) {
    const s = QU[h++], nd = D[s] + 1;
    for (let d = 0; d < 8; d++) { const t = s + OFF[d]; if (PB[t] === 0 && D[t] > nd) { D[t] = nd; QU[tl++] = t; } }
  }
}
const P2N = new Float64Array(INF + 2); for (let i = 0; i <= INF + 1; i++) P2N[i] = i >= INF ? 0 : Math.pow(2, -i);

// the WebAssembly core (core.c → core-wasm.js, tools/build.sh): the same evaluation and candidate list, several times faster.
// Loaded synchronously in a worker and in Node; on the page itself (no need there) and when anything fails, the JS below.
let WA = null;
(function loadCore() {
  try {
    let b64 = null;
    if (typeof self !== 'undefined' && typeof importScripts === 'function' && typeof window === 'undefined') { importScripts('core-wasm.js?v=3'); b64 = self.AMZ_WASM; }
    else if (typeof module !== 'undefined' && module.exports && typeof require === 'function') { const g = typeof globalThis !== 'undefined' ? globalThis : global, had = 'self' in g, old = g.self; g.self = g; try { require(require('path').join(__dirname, 'core-wasm.js')); b64 = g.AMZ_WASM; } finally { if (had) g.self = old; else delete g.self; } }
    if (!b64 || (typeof process !== 'undefined' && process.env && process.env.AMZ_NOWASM)) return;
    const bin = typeof atob === 'function' ? Uint8Array.from(atob(b64), c => c.charCodeAt(0)) : Buffer.from(b64, 'base64');
    const x = new WebAssembly.Instance(new WebAssembly.Module(bin), { env: { now: () => Date.now() } }).exports;
    WA = { x }; waViews();
  } catch (e) { WA = null; }
})();
// (again after the memory has grown — the MCTS tree, mcts_alloc — the old views are detached then)
function waViews() { const x = WA.x, buf = x.memory.buffer; Object.assign(WA, { buf, sq: new Int8Array(buf, x.sqp(), NN), q: new Int8Array(buf, x.qp(), 8), om: new Int32Array(buf, x.omp(), 8192), os: new Int32Array(buf, x.osp(), 8192), rm: new Int32Array(buf, x.rmp(), 64), rn: new Int32Array(buf, x.rnp(), 64), rv: new Int32Array(buf, x.rvp(), 64), rp: new Int32Array(buf, x.rpp(), 64), pv: new Int32Array(buf, x.pvp(), 32) }); }
function waLoad(pos) { WA.sq.set(pos.sq); WA.q.set(pos.q); }
// ---------------------------------------------------------------- evaluation (~100 = one square of territory)
// The classic terms (Lieberum, "An evaluation function for the game of Amazons", 2005): t1 / t2 = territory by queen /
// king distance (equal distances lean to the side to move), c1 / c2 = position terms, w = how open the board still is
// (early: the position terms count more; late: territory decides). Plus each amazon's freedom: a boxed-in amazon is a
// lost piece.
const EW = { t1: 1.0, t2: 0.45, c1: 0.5, c2: 0.35, mob: 1.0, tempo: 0.05 };
let evals = 0;
// The distance terms are summed from counts (how many empty squares White reaches in i moves and Black in j), in a fixed
// order: core.c (bit boards) builds the same counts and does the same arithmetic, so both give the same value.
const ML = 99, CQ = new Int32Array(ML * ML), OA = new Int32Array(ML), OB = new Int32Array(ML);
const clamp6 = d => { const x = d / 6; return x > 1 ? 1 : x < -1 ? -1 : x; };
// counts → [tt (territory), cc (position), ww (openness, queen only)] — kind 0 queen (c1 = Σ 2^-a − 2^-b), 1 king (c2)
const CS = [0, 0, 0];
function fromCounts(La, Lb, kap, kind) {
  let nA = 0, nB = 0, nT = 0, cc = 0, ww = 0;
  for (let i = 0; i <= La; i++) for (let j = 0; j <= Lb; j++) { const c = CQ[i * ML + j]; if (!c) continue; if (i < j) nA += c; else if (j < i) nB += c; else nT += c; }
  let sa = 0, sb = 0;
  for (let i = 0; i <= La; i++) sa += OA[i];
  for (let j = 0; j <= Lb; j++) sb += OB[j];
  nA += sa; nB += sb;
  if (kind === 0) {
    const L = La > Lb ? La : Lb;
    for (let k = 0; k <= L; k++) {
      let ra = k <= La ? OA[k] : 0, cb = k <= Lb ? OB[k] : 0;
      if (k <= La) for (let j = 0; j <= Lb; j++) ra += CQ[k * ML + j];
      if (k <= Lb) for (let i = 0; i <= La; i++) cb += CQ[i * ML + k];
      cc += (ra - cb) * P2N[k];
    }
    for (let i = 0; i <= La; i++) for (let j = 0; j <= Lb; j++) { const c = CQ[i * ML + j]; if (c) ww += c * P2N[i > j ? i - j : j - i]; }
  } else {
    for (let i = 0; i <= La; i++) for (let j = 0; j <= Lb; j++) { const c = CQ[i * ML + j]; if (c) cc += c * clamp6(j - i); }
    cc += sa; cc -= sb;
  }
  CS[0] = (nA - nB) + kap * nT; CS[1] = cc; CS[2] = ww;
  for (let i = 0; i <= La; i++) { OA[i] = 0; for (let j = 0; j <= Lb; j++) CQ[i * ML + j] = 0; }
  for (let j = 0; j <= Lb; j++) OB[j] = 0;
}
function countDist(DX, DY) {   // the empty squares' distances (DX White's, DY Black's) → CQ / OA / OB; returns [La, Lb]
  let La = 0, Lb = 0;
  for (let j = 0; j < NN; j++) {
    const i = PI[j]; if (PB[i]) continue;
    const a = DX[i], b = DY[i];
    if (a < INF && a > La) La = a; if (b < INF && b > Lb) Lb = b;
    if (a < INF && b < INF) CQ[a * ML + b]++; else if (a < INF) OA[a]++; else if (b < INF) OB[b]++;
  }
  return La * 128 + Lb;
}
function evalFor(pos, me, toMove) {
  evals++;
  const sq = pos.sq, q = pos.q;
  padFrom(sq, q);
  distQ(0, DA); distQ(4, DB);
  const kap = toMove === P1 ? EW.tempo : -EW.tempo;
  let L = countDist(DA, DB);
  fromCounts(L >> 7, L & 127, kap, 0);
  const t1 = CS[0], c1 = CS[1], w = CS[2];
  let t2 = 0, c2 = 0;
  const e = w > 40 ? 1 : w / 40;   // 1 = open (opening / middle game), 0 = separated
  if (e > 0) {   // the king-distance terms count only while the board is open (separated: no need to measure them)
    distK(0, KA); distK(4, KB);
    L = countDist(KA, KB);
    fromCounts(L >> 7, L & 127, kap, 1);
    t2 = CS[0]; c2 = CS[1];
  }
  // the amazons' freedom: squares each can reach in one move (few = in danger of being boxed in)
  let mob = 0;
  for (let k = 0; k < 8; k++) {
    const f = PQ[k]; if (!f) continue;
    let n = 0;
    for (let d = 0; d < 8; d++) { const o = OFF[d]; for (let t = f + o; PB[t] === 0; t += o) n++; }
    const pen = n === 0 ? 10 : n < 5 ? (5 - n) * 1.4 : 0;   // (weighs less once the board has closed up)
    mob += (k < 4 ? -1 : 1) * pen * (0.25 + 0.75 * e);
  }
  const v = EW.t1 * t1 + e * (EW.t2 * t2 + EW.c1 * 2 * c1 + EW.c2 * c2) + EW.mob * mob;
  const s = Math.round(v * 100);
  return me === P1 ? s : -s;
}
const evaluate = pos => { if (WA) { waLoad(pos); const t = pos.turn, v = WA.x.ev(t, t); evals++; WA.x.evals_taken(); return v; } return evalFor(pos, pos.turn, pos.turn); };
const kindOf = v => Math.abs(v) > WINT ? 'exact' : 'heur';
// ---------------------------------------------------------------- candidate moves (two stages: the queen move, then the arrow)
// Every queen move is valued (the arrow not yet shot); the best few are then tried with every arrow. The children are
// valued by the full evaluation from the mover's view; a move after which the opponent cannot move wins at once.
const QKEEP_BASE = 14, CK = 10;
// the search's cache of candidate lists (the top CK moves of a position for a qkeep): iterative deepening visits the same
// nodes again, and the list is most of a node's cost (win scores are kept relative to the node, like the table's)
const CC = new Map();
function candsC(pos, K, ply, qkeep) {
  const key = pos.h1 * 32 + qkeep, e = CC.get(key);
  let L;
  if (e && e.h2 === pos.h2) L = e.L;
  else {
    L = cands(pos, CK, 0, qkeep);
    if (CC.size > 120000) CC.clear();
    CC.set(key, { h2: pos.h2, L });
  }
  const n = Math.min(K, L.length), out = new Array(n);
  for (let i = 0; i < n; i++) { const c = L[i]; out[i] = c.s > WINT ? { m: c.m, s: c.s - ply } : c; }
  return out;
}
function cands(pos, K, ply, qkeep, extra) {
  const me = pos.turn, op = 3 - me, sq = pos.sq, out = [];
  if (WA) {
    waLoad(pos);
    const n = WA.x.cand(me, qkeep || QKEEP_BASE, ply), om = WA.om, os = WA.os;
    evals += WA.x.evals_taken();
    for (let i = 0; i < n; i++) out.push({ m: om[i], s: os[i] });
    if (extra) for (const m of extra) { if (!out.some(e => e.m === m) && pos.isLegal(m)) { const r = []; scoreMove(pos, m, me, op, r, ply); out.push(r[0]); } }
    out.sort((x, y) => y.s - x.s);
    if (K && out.length > K) out.length = K;
    return out;
  }
  const Q = pos.qmoves(me, []);
  if (!Q.length) return out;
  const qs = [];
  for (const qm of Q) {
    const f = qm % 128, t = (qm / 128) | 0;
    sq[f] = 0; sq[t] = me; const k = qIdx(pos, f); pos.q[k] = t;
    qs.push({ qm, s: evalFor(pos, me, op) });
    sq[t] = 0; sq[f] = me; pos.q[k] = f;
  }
  qs.sort((x, y) => y.s - x.s);
  const keep = Math.min(qs.length, qkeep || QKEEP_BASE), tmp = [];
  for (let i = 0; i < keep; i++) addArrows(pos, qs[i].qm, me, op, out, tmp, ply);
  if (extra) for (const m of extra) { const qm = m % 16384; if (!out.some(e => e.m === m) && pos.isLegal(m)) { const r = []; scoreMove(pos, m, me, op, r, ply); out.push(r[0]); } }
  out.sort((x, y) => y.s - x.s);
  if (K && out.length > K) out.length = K;
  return out;
}
const qIdx = (pos, f) => { for (let k = 0; k < 8; k++) if (pos.q[k] === f) return k; return -1; };
function addArrows(pos, qm, me, op, out, tmp, ply) {
  const f = qm % 128, t = (qm / 128) | 0, sq = pos.sq;
  tmp.length = 0; pos.arrowsFrom(f, t, tmp);
  sq[f] = 0; sq[t] = me; const k = qIdx(pos, f); pos.q[k] = t;
  for (const a of tmp) {
    sq[a] = ARROW;
    const s = !pos.canMove(op) ? WIN - (ply + 1) : evalFor(pos, me, op);
    out.push({ m: qm + 16384 * a, s });
    sq[a] = 0;
  }
  sq[t] = 0; sq[f] = me; pos.q[k] = f;
}
function scoreMove(pos, m, me, op, out, ply) {
  pos.play(m);
  const s = !pos.canMove(op) ? WIN - (ply + 1) : evalFor(pos, me, op);
  pos.unplay(m); out.push({ m, s });
}
// ---------------------------------------------------------------- search (negamax alpha-beta, PVS, TT, iterative deepening)
const TT = new Map();
// SH: the transposition table shared by the workers of shared/mtsplit.js (shared mode: a cross-origin isolated page —
// shared/mttt.js, set by the 'mtshare' message; the one-thread worker never has it). Its entries keep 16 bits of a move and
// 16 more in the "extra" part: a move here is 21 bits.
let SH = null;
const TE = { h2: 0, d: 0, v: 0, f: 0, m: -1 };
function ttGet(pos) {
  if (SH !== null) {
    const e = SH.get(pos.h1, pos.h2); if (!e) return null;
    TE.h2 = pos.h2; TE.d = e.d; TE.v = e.v; TE.f = e.f; const lo = (e.m + 2) & 0xFFFF; TE.m = lo || e.x ? lo | (e.x << 16) : -1;
    return TE;
  }
  const e = TT.get(pos.h1); return e && e.h2 === pos.h2 ? e : null;
}
let nodes = 0, evalLimit = Infinity, tEnd = Infinity, stop = false;
const KW = [0, 1, 8, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10];   // moves searched at each remaining depth
function timeUp() { if (Date.now() > tEnd || evals > evalLimit || (SH !== null && SH.stopped())) stop = true; return stop; }
function search(pos, d, a, b, ply) {
  nodes++;
  if ((nodes & 31) === 0 && timeUp()) return 0;
  if (stop) return 0;
  if (!pos.canMove(pos.turn)) return -(WIN - ply);
  const e = ttGet(pos), hit = e !== null;
  if (hit && e.d >= d) {
    const v = e.v > WINT ? e.v - ply : e.v < -WINT ? e.v + ply : e.v;
    if (e.f === 0) return v; if (e.f === 1 && v >= b) return v; if (e.f === 2 && v <= a) return v;
  }
  if (d <= 0) return evaluate(pos);
  const C = candsC(pos, d >= 2 ? KW[Math.min(d, KW.length - 1)] : 1, ply, d >= 3 ? QKEEP_BASE : 10);
  if (!C.length) return -(WIN - ply);
  if (d === 1) { const v = C[0].s; store(pos, d, v, 0, C[0].m, ply); return v; }
  const em = hit ? e.m : -1;
  if (em >= 0) { const i = C.findIndex(x => x.m === em); if (i > 0) { const x = C[i]; C.splice(i, 1); C.unshift(x); } else if (i < 0 && pos.isLegal(em)) C.unshift({ m: em, s: 0 }); }
  const a0 = a; let best = -Infinity, bm = C[0].m;
  for (let i = 0; i < C.length; i++) {
    const m = C[i].m;
    if (C[i].s > WINT) { best = C[i].s; bm = m; if (best > a) a = best; break; }
    pos.play(m);
    let v;
    if (i === 0) v = -search(pos, d - 1, -b, -a, ply + 1);
    else { v = -search(pos, d - 1, -a - 1, -a, ply + 1); if (v > a && v < b && !stop) v = -search(pos, d - 1, -b, -a, ply + 1); }
    pos.unplay(m);
    if (stop) return best === -Infinity ? C[0].s : best;
    if (v > best) { best = v; bm = m; if (v > a) { a = v; if (a >= b) break; } }
  }
  store(pos, d, best, best <= a0 ? 2 : best >= b ? 1 : 0, bm, ply);
  return best;
}
function store(pos, d, v, f, m, ply) {
  const sv = v > WINT ? v + ply : v < -WINT ? v - ply : v;
  if (SH !== null) { SH.put(pos.h1, pos.h2, d, sv, f, m >= 0 ? (m & 0xFFFF) - 2 : -2, m >= 0 ? m >>> 16 : 0); return; }
  if (TT.size > 400000) TT.clear();
  TT.set(pos.h1, { h2: pos.h2, d, v: sv, f, m });
}
// root: the values of the root candidates at depth d (each with a full window: an honest value per move for the lists)
function rootValues(pos, C, d) {
  const out = [];
  for (const c of C) {
    let v;
    if (d <= 1 || c.s > WINT) v = c.s;
    else { pos.play(c.m); v = -search(pos, d - 1, -WIN - 1, WIN + 1, 1); pos.unplay(c.m); }
    if (stop) break;
    out.push({ m: c.m, v });
  }
  return out.sort((x, y) => y.v - x.v);
}
function bestMove(pos, maxD, ms, ek, rootK) {
  nodes = 0; evals = 0; stop = false; tEnd = ms ? Date.now() + ms : Infinity; evalLimit = ek ? ek * 1000 : Infinity;
  const C = cands(pos, rootK || 16, 0, 20);
  if (!C.length) return { move: -1, v: -WIN, depth: 0 };
  let best = { move: C[0].m, v: C[0].s, depth: 1 };
  if (C.length === 1 || C[0].s > WINT) return best;
  for (let d = 2; d <= (maxD || 40); d++) {
    let a = -WIN - 1, bm = -1, bv = -Infinity;
    const order = C.slice(); { const i = order.findIndex(x => x.m === best.move); if (i > 0) { const x = order[i]; order.splice(i, 1); order.unshift(x); } }
    for (let i = 0; i < order.length; i++) {
      const m = order[i].m;
      pos.play(m);
      let v = i === 0 ? -search(pos, d - 1, -WIN - 1, -a, 1) : -search(pos, d - 1, -a - 1, -a, 1);
      if (i > 0 && v > a && !stop) v = -search(pos, d - 1, -WIN - 1, -a, 1);
      pos.unplay(m);
      if (stop) break;
      if (v > bv) { bv = v; bm = m; if (v > a) a = v; }
    }
    if (bm >= 0 && (!stop || bv >= best.v)) best = { move: bm, v: bv, depth: d };
    if (stop) break;
    if (Math.abs(bv) > WINT) break;
  }
  return best;
}
// ---------------------------------------------------------------- MCTS (core.c: a tree search by visits with the evaluation)
// The way of the strong Amazons programs (Invader-MC and after; claude/amazons-spec.md「MCTS」): each visit expands one leaf with
// the candidate list (the evaluation of its children = its value), the children pre-selected and valued by the evaluation
// (prior), progressive widening and implicit minimax values. Only with the WebAssembly core (mcts: null without it).
// o: { ms (time), nk (thousands of evaluations), sims (visits), seed, prm (parameters, MC), onProgress(list, sims) }
const MC = { qk: 10, k: 24, qkr: 20, kr: 48, po: 0, s: 400, np: 2, c: 0.25, a: 0.3, pwa: 3, pwk: 1, pwb: 0.5, pom: 0.5, vl: 1, b0: 300 };
const MC_KEYS = ['qk', 'k', 'qkr', 'kr', 'po', 's', 'np', 'c', 'a', 'pwa', 'pwk', 'pwb', 'pom', 'vl', 'b0'];
let MX = null;   // the core of the MCTS: { x, views } — WA (one thread) or the multi-thread core of the lead (mt=1)
function mcCore() { return MX || WA; }
function mcViews(C) { if (C.buf !== C.x.memory.buffer) { if (C === WA) waViews(); else C.views(); } }
// The pool of the tree (core.c mcts_alloc; 32 bytes a node). Past half full a leaf waits for visits before it is expanded and
// at 96 % the search stops (core.c mcts_run): those waiting visits back up a value without an evaluation — the "superlinear"
// visits/s of bench.html on many threads (2026-11-10: a 2 s search on 8 threads filled the 3.2 M nodes sized for it and 80〜95 %
// of its visits were such waits). So the pool is sized by the nodes per ms per thread that the searches here have made (MC_RATE,
// first 120: the user's M4 Pro ~140 on one thread in the middle game) and the threads of this job, up to MC_MAX_NODES (one
// thread, 128 MB) or the lead's maxNodes (several threads: up to 512 MB — Lv.23's 20 s on 10 threads may still fill it).
const MC_MAX_NODES = 1 << 22;
let MC_RATE = 120;
function mcts(pos, o) {
  const C = mcCore(); if (!C) return null;
  const X = C.x, p = Object.assign({}, MC, o.prm || {});
  const evl = o.nk ? o.nk * 1000 : 0, sims = o.sims || 0, ms = o.ms || 0, thr = Math.max(1, C === WA ? 1 : C.jobThreads || C.threads || 1);
  const est = Math.max(sims * p.k, evl / 200 * p.k, ms * MC_RATE * thr) * 1.3;
  const want = o.pool > 0 ? o.pool : Math.min(C.maxNodes || MC_MAX_NODES, Math.max(1 << 16, Math.ceil(est)));
  X.mcts_alloc(want); if (X.mcts_limit) X.mcts_limit(o.pool > 0 ? o.pool : 0); mcViews(C);
  MC_KEYS.forEach((k, i) => X.mcts_set(i, p[k]));
  C.sq.set(pos.sq); C.q.set(pos.q);
  X.mcts_begin(pos.turn, o.seed | 0);
  const t0 = Date.now();
  let n = 1;
  if (!o.onProgress) n = X.mcts_run(ms, evl, sims);
  else for (;;) {   // (in steps of 0.5 s for the caller's progress)
    n = X.mcts_run(ms ? Math.max(1, Math.min(500, ms - (Date.now() - t0))) : 500, evl, sims);
    if (X.mcts_proof() || (evl && X.mcts_evals() >= evl) || (sims && n >= sims) || (ms && Date.now() - t0 >= ms) || (!ms && !evl && !sims)) break;
    o.onProgress(mcList(C), n);
  }
  const list = mcList(C);
  evals = X.mcts_evals();
  if (ms && !o.pool) {   // (the rate of the next pool: a search that filled half its pool made more nodes than it could keep)
    const el = Math.max(50, Date.now() - t0), nn = X.mcts_nodes(), r = nn / el / thr * (nn > want * 0.5 ? 2 : 1);
    if (el >= 200) MC_RATE = Math.min(600, Math.max(30, r, MC_RATE * 0.75));
  }
  const vk = X.mcts_vk ? [0, 1, 2, 3, 4, 5].map(k => X.mcts_vk(k)) : null;   // (how the visits ended: core.c mcts_vk)
  return { list, sims: n, evals, nodes: X.mcts_nodes(), proof: X.mcts_proof(), vk };
}
function mcList(C) {
  const X = C.x, k = X.mcts_out(), out = [];
  for (let i = 0; i < k; i++) out.push({ m: C.rm[i], n: C.rn[i], v: C.rv[i], p: C.rp[i] });
  return out;
}
function mcPV(m, plies) { const C = mcCore(), k = Math.min(C.x.mcts_pv(m), plies || 5), out = []; for (let i = 0; i < k; i++) out.push(C.pv[i]); return out; }
// a level / PRO setting with mc: the MCTS's move (the alpha-beta search's way in a lost position: resist)
function mctsThink(pos, L) {
  const r = mcts(pos, { ms: L.ms || 0, nk: L.nk || 0, sims: L.sims || 0, seed: L.seed || 0, prm: L.prm, pool: L.pool || 0 });
  if (!r || !r.list.length) return null;
  const b = r.list[0];
  const out = thinkFin(pos, { move: b.m, v: b.v, depth: 3, evals: r.evals, sims: r.sims });
  out.nodes = r.evals; out.mc = 1;   // (nodes: the evaluations of every thread — the page's nps readout)
  if (r.vk) out.vk = r.vk;   // (how the visits ended: bench.html)
  return out;
}
// ---------------------------------------------------------------- AI levels (20 steps, Lv.1 … Lv.20)
// weak steps: one ply, the candidates' values with noise (and fewer queen moves looked at); strong: a budget of evaluated
// positions (nk, thousands — the PRO mode's "positions"); Lv.19〜23 a time budget.
const LEVELS = [null,
  { d: 1, noise: 420, qk: 3 },          // 1
  { d: 1, noise: 300, qk: 4 },          // 2
  { d: 1, noise: 210, qk: 5 },          // 3
  { d: 1, noise: 150, qk: 6 },          // 4
  { d: 1, noise: 105, qk: 8 },          // 5
  { d: 1, noise: 70, qk: 10 },          // 6
  { d: 1, noise: 45, qk: 12 },          // 7
  { d: 1, noise: 25, qk: 14 },          // 8
  { s: 1, nk: 2 },                      // 9
  { s: 1, nk: 3 },                      // 10
  { s: 1, nk: 4.5 },                    // 11
  { s: 1, nk: 6 },                      // 12  (about 6,000 evaluations per move)
  { s: 1, nk: 10 },                     // 13
  { s: 1, nk: 16 },                     // 14
  { s: 1, nk: 24 },                     // 15
  { s: 1, nk: 36 },                    // 16
  { s: 1, nk: 52 },                    // 17
  { s: 1, nk: 75 },                    // 18
  // Lv.19〜23 think by time with the MCTS (mc, 2026-11-10: stronger than the alpha-beta search in the same CPU time — tools/mcts_match.js,
  // claude/amazons-spec.md「MCTS」), on the threads of the page's MCTS pool (core_mt.wasm, shared/mtengine.js) when it is there
  { s: 1, ms: 1500, mc: 1 },            // 19
  { s: 1, ms: 3000, mc: 1 },            // 20
  // the top levels (common rule「最上位のレベルの追加」): twice the time per step up to 20 s, on every thread — one thread without the option
  { s: 1, ms: 6000, mc: 1 },            // 21
  { s: 1, ms: 12000, mc: 1 },           // 22
  { s: 1, ms: 20000, mc: 1 },           // 23
];
function gauss(rand) { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function replay(start, moves) {
  const pos = Pos.from(start), hashes = [pos.h1 + ':' + pos.h2];
  for (const m of moves || []) { pos.play(m); hashes.push(pos.h1 + ':' + pos.h2); }
  return { pos, hashes };
}
// game status: { over, winner, why: 'stuck' } — the side to move with no move loses
function judge(pos) {
  if (pos.canMove(pos.turn)) return { over: false };
  return { over: true, winner: pos.side ? P1 : P2, why: 'stuck' };
}
// a lost position: the move that keeps the most own freedom (a human-looking defence, the game goes on longest)
function resist(pos, list) {
  let worst = -Infinity; for (const e of list) worst = Math.max(worst, e.v);
  const pool = list.filter(e => e.v === worst), me = pos.turn;
  let bm = pool[0].m, bs = -Infinity;
  for (const e of pool) { pos.play(e.m); const t = pos.terr(), s = (me === P1 ? t.a - t.b : t.b - t.a) * 3 + pos.mobility(me); pos.unplay(e.m); if (s > bs) { bs = s; bm = e.m; } }
  return bm;
}
function think(start, moves, level, rand, rule, cfg) {
  rand = rand || Math.random;
  const L = cfg || LEVELS[level] || LEVELS[10];
  const { pos } = replay(start, moves);
  if (!pos.canMove(pos.turn)) return { move: -1 };
  if (!L.s) {
    nodes = 0; evals = 0; stop = false; tEnd = Date.now() + 4000; evalLimit = Infinity;
    const C = cands(pos, 24, 0, L.qk || 12);
    if (C.length === 1) return { move: C[0].m, v: C[0].s };
    const vals = L.d >= 2 ? rootValues(pos, C.slice(0, 10), 2).concat(C.slice(10).map(c => ({ m: c.m, v: c.s - 40 }))) : C.map(c => ({ m: c.m, v: c.s }));
    vals.sort((x, y) => y.v - x.v);
    if (vals[0].v < -WINT) return { move: resist(pos, vals), v: vals[0].v };
    let best = vals[0].m, bv = -Infinity;
    for (const e of vals) { const x = e.v + (Math.abs(e.v) > WINT ? 0 : gauss(rand) * L.noise); if (x > bv) { bv = x; best = e.m; } }
    return { move: best, v: vals[0].v };
  }
  if (L.mc && mcCore()) { const r = mctsThink(pos, L); if (r) return r; }
  const r = bestMove(pos, L.dx || 40, L.ms || 0, L.nk || (L.ms ? 0 : 60));
  return thinkFin(pos, r);
}
// the strong steps' answer from the search's result (also the end of a search on several threads, shared/mtsplit.js)
function thinkFin(pos, r) {
  if (r.v < -WINT && r.depth > 1) {
    stop = false; tEnd = Date.now() + 600; evalLimit = Infinity;
    const vals = rootValues(pos, cands(pos, 12, 0, 14), Math.min(3, r.depth));
    if (!stop && vals.length) return { move: resist(pos, vals), v: r.v, depth: r.depth };
  }
  return Object.assign({ move: r.move, v: r.v, depth: r.depth, evals: r.evals !== undefined ? r.evals : evals }, r.sims ? { sims: r.sims } : {});
}
// all-candidates analysis for hints / the review: the root candidates (and the move(s) in extra) valued, deeper as time allows
function analyze(start, moves, ms, onProgress, rule, extra) {
  const { pos } = replay(start, moves);
  nodes = 0; evals = 0; stop = false; tEnd = Date.now() + (ms || 1000); evalLimit = Infinity;
  if (!pos.canMove(pos.turn)) return { list: [], depth: 0 };
  const C = cands(pos, 14, 0, 18, extra);
  let list = C.map(c => ({ m: c.m, v: c.s, kind: kindOf(c.s) })), depth = 1;
  if (onProgress) onProgress(list, 1);
  for (let d = 2; d <= 30; d++) {
    const vals = rootValues(pos, C, d);
    if (stop && vals.length < C.length) break;
    list = vals.map(e => ({ m: e.m, v: e.v, kind: kindOf(e.v) })); depth = d;
    if (onProgress) onProgress(list, d);
    if (stop) break;
    if (list.every(e => Math.abs(e.v) > WINT)) break;
  }
  return { list, depth };
}
function candsJob(start, moves, ms, k, plies, onProgress) {
  const r = analyze(start, moves, ms, onProgress);
  const list = r.list.slice().sort((a, b) => b.v - a.v).slice(0, k || 5);
  for (const e of list) e.pv = pvOf(start, moves, e.m, plies);
  return { list, depth: r.depth };
}
// the line after root move m (short searches, one per ply)
function pvOf(start, moves, m, plies) {
  const pv = [], line = moves.concat([m]);
  for (let d = 0; d < Math.min(plies || 5, 5); d++) {
    const { pos } = replay(start, line);
    if (judge(pos).over) break;
    const b = bestMove(pos, 2, 120, 0, 8);
    if (b.move == null || b.move < 0) break;
    line.push(b.move); pv.push(b.move);
  }
  return pv;
}
// ---------------------------------------------------------------- several threads (shared/mtsplit.js: plain workers share the root moves
// and the main line, Young Brothers Wait). mtPlan: what a 'think' / 'analyze' / 'cands' job searches on the threads (or its
// answer at once); mtV: the node after the root and m.line searched to depth m.d in the window (m.wa, m.wb); mtKids: that node's
// candidates in this engine's order; mtFin: the job's reply from the threads' raw result (the same as the one-thread worker's).
// A thread's "nodes" are its evaluations (the levels' and PRO's budget counts evaluated positions).
function mtNode(m) {
  if (SH !== null) SH.salt = 0;
  const line = m.line || [], { pos } = replay(m.start, (m.moves || []).concat(line));
  return { pos, ply: line.length };
}
function mtPlan(m) {
  const { pos } = replay(m.start, m.moves), inf = WIN + 1;
  if (!pos.canMove(pos.turn)) return { result: m.job === 'think' ? { move: -1 } : { list: [], depth: 0 } };
  nodes = 0; evals = 0; stop = false; tEnd = Infinity; evalLimit = Infinity;
  if (m.job === 'think') {
    const L = m.cfg || LEVELS[m.level] || LEVELS[10];
    if (!L.s || L.mc) return { result: think(m.start, m.moves, m.level, null, null, m.cfg) };   // (the MCTS: one thread here; its own pool reads it on several)
    const C = cands(pos, 16, 0, 20);
    if (C.length === 1 || C[0].s > WINT) return { result: { move: C[0].m, v: C[0].s, depth: 1 } };
    return { plan: { kind: 'best', kids: C.map(c => ({ m: c.m, s: -1 })), inf, maxD: L.dx || 40, ms: L.ms || 0, nodes: (L.nk || (L.ms ? 0 : 60)) * 1000, win: WINT, partialIfBetter: true, splitMin: 4 } };
  }
  const C = cands(pos, 14, 0, 18, m.extra), cj = m.job === 'cands';
  return { plan: { kind: 'all', kids: C.map(c => c.s > WINT ? { m: c.m, s: -1, t: c.s } : { m: c.m, s: -1 }), inf, maxD: 30, ms: m.time || (cj ? 1200 : 1000), win: WINT, stopAll: true, progress: true, pv: cj ? m.plies || 5 : 0, pvK: m.k || 5 } };
}
function mtV(m) {
  const { pos, ply } = mtNode(m);
  nodes = 0; evals = 0; stop = false; tEnd = m.until || Infinity; evalLimit = m.nl || Infinity;
  const v = search(pos, m.d, m.wa, m.wb, ply);
  return { v, ok: !stop, nodes: evals };
}
function mtKids(m) {
  const { pos, ply } = mtNode(m);
  if (!pos.canMove(pos.turn)) return { kids: [] };
  nodes = 0; evals = 0; stop = false; tEnd = Infinity; evalLimit = Infinity;
  const C = candsC(pos, CK, ply, QKEEP_BASE), e = ttGet(pos), em = e ? e.m : -1;
  if (em >= 0) { const i = C.findIndex(x => x.m === em); if (i > 0) { const x = C[i]; C.splice(i, 1); C.unshift(x); } }
  return { kids: C.map(c => c.s > WINT ? { m: c.m, s: -1, t: c.s } : { m: c.m, s: -1 }), nodes: evals };
}
function mtFin(m) {
  const r = m.raw;
  if (m.job === 'think') { const { pos } = replay(m.start, m.moves); return { result: thinkFin(pos, { move: r.m, v: r.v, depth: r.depth }) }; }
  let list = (r.list || []).map(e => Object.assign({ m: e.m, v: e.v, kind: kindOf(e.v) }, e.pv ? { pv: e.pv } : {}));
  if (!list.length) { const { pos } = replay(m.start, m.moves); list = cands(pos, 14, 0, 18).map(c => ({ m: c.m, v: c.s, kind: kindOf(c.s) })); }
  if (m.job === 'cands') list = list.slice(0, m.k || 5);
  return { result: { list, depth: r.depth } };
}
// ---------------------------------------------------------------- puzzles (exact answers from the rules: tools/gen_puzzles.js and the page)
// emptyAround(pos, p): the empty squares next to p's amazons (each once). A side is stuck when there are none; one move of the
// other side fills at most two of them (its amazon's new square and its arrow) and may open its old square.
const EA = new Uint8Array(NN);
let eaMark = 1;
function emptyAround(pos, p) {
  if (++eaMark > 250) { EA.fill(0); eaMark = 1; }
  const sq = pos.sq, k0 = p === P1 ? 0 : 4, out = [];
  for (let k = k0; k < k0 + 4; k++) { const f = pos.q[k]; if (f < 0) continue; const nb = NB[f]; for (let j = 0; j < nb.length; j++) { const t = nb[j]; if (!sq[t] && EA[t] !== eaMark) { EA[t] = eaMark; out.push(t); } } }
  return out;
}
// the moves after which the opponent cannot move at all (only tried when two squares or fewer are left around it)
function win1(pos) {
  const me = pos.turn, op = 3 - me;
  if (emptyAround(pos, op).length > 2) return [];
  const out = [];
  for (const m of pos.moves()) { pos.play(m); const r = !pos.canMove(op); pos.unplay(m); if (r) out.push(m); }
  return out;
}
let duelBudget = Infinity;
// the side to move leaves the opponent without a move within k of its own moves, whatever the replies
function canWin(pos, k) {
  if (--duelBudget < 0) return false;
  const me = pos.turn, op = 3 - me;
  if (win1(pos).length) return true;
  if (k <= 1) return false;
  // the moves that leave the defender the fewest empty squares first (the same answer, found sooner)
  const M = pos.moves(), sc = M.map(m => { pos.play(m); const n = emptyAround(pos, op).length; pos.unplay(m); return n; });
  const ord = M.map((_, i) => i).sort((x, y) => sc[x] - sc[y]);
  for (const i of ord) {
    const m = M[i];
    pos.play(m);
    const ok = pos.canMove(op) && allLose(pos, k - 1);
    pos.unplay(m);
    if (ok) return true;
    if (duelBudget < 0) return false;
  }
  return false;
}
// every reply of the side to move (the defender) still loses within k moves of the other side
function allLose(pos, k) {
  const me = pos.turn, op = 3 - me, R = pos.moves();
  if (!R.length) return true;
  if (k === 1) {   // (fast: a reply that leaves three or more empty squares around the defender escapes)
    for (const r of R) { pos.play(r); const n = emptyAround(pos, me).length; pos.unplay(r); if (n > 2) return false; }
  }
  // the replies that leave the defender most room first
  const sc = R.map(r => { pos.play(r); const n = emptyAround(pos, me).length; pos.unplay(r); return n; });
  const idx = R.map((_, i) => i).sort((x, y) => sc[y] - sc[x]);
  for (const i of idx) { pos.play(R[i]); const ok = canWin(pos, k); pos.unplay(R[i]); if (!ok) return false; if (duelBudget < 0) return false; }
  return true;
}
// the first moves that win within n (null: out of budget)
function duelGood(start, moves, n, budget) {
  const { pos } = replay(start, moves), me = pos.turn, op = 3 - me;
  duelBudget = budget || 4e6;
  const w = win1(pos); if (w.length || n <= 1) return w;
  const out = [];
  for (const m of pos.moves()) { pos.play(m); if (pos.canMove(op) && allLose(pos, n - 1)) out.push(m); pos.unplay(m); if (duelBudget < 0) return null; }
  return out;
}
// the defender's most stubborn reply: one that still escapes if there is one, else the one leaving it the most room
function duelReply(start, moves, n) {
  const { pos } = replay(start, moves), me = pos.turn, R = pos.moves();
  if (!R.length) return { move: -1 };
  duelBudget = 2e6;
  let best = R[0], bs = -Infinity;
  for (const r of R) {
    pos.play(r);
    const room = emptyAround(pos, me).length, esc = n >= 1 && !canWin(pos, n);
    pos.unplay(r);
    const s = (esc ? 1000 : 0) + room;
    if (s > bs) { bs = s; best = r; }
  }
  return { move: best };
}
// trap: the moves after which the amazon on e has no empty square next to it (it may still be the defender's turn to move)
// trap: box in the marked enemy amazon (the one on e in the puzzle's start position, followed through its moves: pos.q[k]) —
// no empty square left next to it — within n of your moves, whatever the replies (it may run away meanwhile)
const trapIdx = (start, e) => { const p = replay(start, []).pos; for (let k = 0; k < 8; k++) if (p.q[k] === e) return k; return -1; };
function boxed(pos, k) { const f = pos.q[k]; if (f < 0) return true; for (const t of NB[f]) if (!pos.sq[t]) return false; return true; }
const freeAt = (pos, k) => { const f = pos.q[k]; let n = 0; if (f >= 0) for (const t of NB[f]) if (!pos.sq[t]) n++; return n; };
function trapWin(pos, k, n) {   // the attacker to move
  if (--duelBudget < 0) return false;
  const op = 3 - pos.turn, M = pos.moves(), sc = M.map(m => { pos.play(m); const v = freeAt(pos, k); pos.unplay(m); return v; });
  const ord = M.map((_, i) => i).sort((x, y) => sc[x] - sc[y]);
  for (const i of ord) {
    if (n === 1 && sc[i] > 0) break;   // (our last move: not boxed now = not boxed)
    pos.play(M[i]); const ok = boxed(pos, k) || !pos.canMove(op) || (n > 1 && trapAll(pos, k, n - 1)); pos.unplay(M[i]);
    if (ok) return true; if (duelBudget < 0) return false;
  }
  return false;
}
function trapAll(pos, k, n) {   // the defender to move: every reply still gets boxed within n
  const R = pos.moves(); if (!R.length) return true;
  const sc = R.map(r => { pos.play(r); const v = freeAt(pos, k); pos.unplay(r); return v; });
  if (n === 1 && sc.some(v => v > 2)) return false;   // (one move of ours closes two squares at most; moving our amazon away only opens)
  const ord = R.map((_, i) => i).sort((x, y) => sc[y] - sc[x]);
  for (const i of ord) { pos.play(R[i]); const ok = trapWin(pos, k, n); pos.unplay(R[i]); if (!ok || duelBudget < 0) return false; }
  return true;
}
function trapGood(start, moves, e, n, budget) {
  const k = trapIdx(start, e); if (k < 0) return [];
  const { pos } = replay(start, moves), op = 3 - pos.turn, out = [];
  duelBudget = budget || 4e6; n = n || 1;
  for (const m of pos.moves()) {
    pos.play(m); const ok = boxed(pos, k) || !pos.canMove(op) || (n > 1 && trapAll(pos, k, n - 1)); pos.unplay(m);
    if (ok) out.push(m); if (duelBudget < 0) return null;
  }
  return out;
}
// the defender's most stubborn reply in a trap: one that escapes if there is one, else the one leaving the marked amazon most room
function trapReply(start, moves, e, n) {
  const k = trapIdx(start, e), { pos } = replay(start, moves), R = pos.moves();
  if (!R.length || k < 0) return { move: -1 };
  duelBudget = 2e6;
  let best = R[0], bs = -Infinity;
  for (const r of R) { pos.play(r); const room = freeAt(pos, k), esc = n >= 1 && !trapWin(pos, k, n); pos.unplay(r); const s = (esc ? 1000 : 0) + room * 10 + pos.mobility(pos.turn === P1 ? P2 : P1) / 100; if (s > bs) { bs = s; best = r; } }
  return { move: best };
}
// separated endgames: every amazon alone in its own room (a king-connected area of empty squares, closed by arrows and the
// edge). room(pos, f): its squares; fillMax: the most moves the amazon can still make there (exact, memo on the room's
// filling as a bitmask). The side to move wins when its moves outnumber the opponent's: W > B before its move.
function roomOf(pos, f) {
  const sq = pos.sq, seen = new Uint8Array(NN), R = [f]; seen[f] = 1;
  for (let h = 0; h < R.length; h++) for (const t of NB[R[h]]) if (!seen[t] && (!sq[t] || t === f)) { seen[t] = 1; if (sq[t]) return null; R.push(t); }
  return R;   // (null: another amazon shares the room)
}
function fillMax(pos, f, budget) {
  const R = roomOf(pos, f); if (!R) return -1;
  const n = R.length, idx = new Int8Array(NN).fill(-1); R.forEach((x, i) => { idx[x] = i; });
  if (n > 22) return -1;
  const memo = new Map(); let calls = 0;
  const rec = (mask, a) => {   // mask: the room's squares filled by arrows (bit i = R[i]); a: the amazon's square (index in R)
    const key = mask * 32 + a, c = memo.get(key); if (c !== undefined) return c;
    if (++calls > (budget || 2e6)) return 0;
    const free = n - 1 - popc(mask);   // (each move fills one more square: never more moves than empty squares)
    let best = 0;
    outer: for (let d = 0; d < 8; d++) for (const t of RAYS[R[a]][d]) {
      const ti = idx[t]; if (ti < 0 || (mask >> ti) & 1) break;
      for (let e = 0; e < 8; e++) for (const ar of RAYS[t][e]) {   // (the old square is empty now: the arrow may cross or hit it)
        const ai = idx[ar]; if (ai < 0 || (mask >> ai) & 1) break;
        const v = 1 + rec(mask | (1 << ai), ti);
        if (v > best) { best = v; if (best >= free) break outer; }
      }
    }
    memo.set(key, best); return best;
  };
  return rec(0, idx[f]);
}
function popc(x) { let c = 0; while (x) { x &= x - 1; c++; } return c; }
function sideMoves(pos, p) { let s = 0; const k0 = p === P1 ? 0 : 4; for (let k = k0; k < k0 + 4; k++) { const f = pos.q[k]; if (f < 0) continue; const v = fillMax(pos, f); if (v < 0) return -1; s += v; } return s; }
function endGood(start, moves) {
  const { pos } = replay(start, moves), me = pos.turn, op = 3 - me, B = sideMoves(pos, op), out = [];
  if (B < 0) return null;
  for (const m of pos.moves()) { pos.play(m); const W = sideMoves(pos, me); pos.unplay(m); if (W >= B) out.push(m); }
  return out;
}
// endgame read to the end: the side to move wins (the last to move wins) — an exact search with a memo, for positions with few
// empty squares left (every move fills one: the depth is the number of empty squares at most). null: out of budget
const SOLVE = new Map(); let solveBudget = 0;
function solveWin(pos) {
  if (--solveBudget < 0) throw SOLVE;
  const key = pos.h1 * 2097152 + (pos.h2 >>> 11), c = SOLVE.get(key);   // (53 bits: exact in a double) if (c !== undefined) return c;
  const M = pos.moves(); let win = false;
  // (the moves that leave the opponent the fewest moves first: a win is found sooner)
  if (M.length > 6) { const sc = M.map(m => { pos.play(m); const v = pos.mobility(pos.turn); pos.unplay(m); return v; }); const o = M.map((_, i) => i).sort((a, b) => sc[a] - sc[b]); for (const i of o) { pos.play(M[i]); const r = !solveWin(pos); pos.unplay(M[i]); if (r) { win = true; break; } } }
  else for (const m of M) { pos.play(m); const r = !solveWin(pos); pos.unplay(m); if (r) { win = true; break; } }
  if (SOLVE.size > 3e6) SOLVE.clear();
  SOLVE.set(key, win); return win;
}
function readGood(start, moves, budget) {
  const { pos } = replay(start, moves), out = [];
  solveBudget = budget || 3e6;
  try { for (const m of pos.moves()) { pos.play(m); const lose = !solveWin(pos); pos.unplay(m); if (lose) out.push(m); } } catch (e) { if (e === SOLVE) return null; throw e; }
  return out;
}
// the defender's reply in a lost endgame: the one that makes the game last longest (most moves left for itself), a win if any
function readReply(start, moves) {
  const { pos } = replay(start, moves), R = pos.moves(), me = pos.turn;
  if (!R.length) return { move: -1 };
  solveBudget = 3e6;
  let best = R[0], bs = -Infinity;
  for (const r of R) { pos.play(r); let w = false; try { w = !solveWin(pos); } catch (e) {} const s = (w ? 1e4 : 0) + pos.mobility(me) * 10 - pos.mobility(pos.turn); pos.unplay(r); if (s > bs) { bs = s; best = r; } }
  return { move: best };
}
// the page's puzzle questions: the good moves from the shown position for a puzzle of kind k
function pzGood(m) {
  if (m.kind === 'trap') return trapGood(m.start, m.moves, m.e, m.n);
  if (m.kind === 'end') return endGood(m.start, m.moves);
  if (m.kind === 'read') return readGood(m.start, m.moves);
  return duelGood(m.start, m.moves, m.n);
}
// ---------------------------------------------------------------- notation
function name(pos, m) { if (m < 0) return '—'; return sqName(mFrom(m)) + '-' + sqName(mTo(m)) + '/' + sqName(mArrow(m)); }
function parse(pos, s) {
  const x = String(s).toLowerCase().match(/[a-j](?:10|[1-9])/g);
  if (!x || x.length !== 3) return null;
  const m = mv(sqIdx(x[0]), sqIdx(x[1]), sqIdx(x[2]));
  return pos.isLegal(m) ? m : null;
}
// the squares a move passes: [from, to] and the arrow's flight [to, arrow]
const path = (pos, m) => m < 0 ? [] : [mFrom(m), mTo(m)];
const arrowPath = (pos, m) => m < 0 ? [] : [mTo(m), mArrow(m)];
const captured = () => [];
const isRemove = () => false;
const hops = () => 1;

const API = { get nodes() { return nodes; }, get evals() { return evals; }, P1, P2, WIN, WINT, ARROW, RULES, RULE_ORDER, setRule, get rule() { return 'std'; }, N, NN, RC, RAYS, NB, START,
  sqAt, sqName, sqIdx, mv, mFrom, mTo, mArrow, isRemove, hops, Pos, path, arrowPath, captured, name, parse, replay, judge, clearLine,
  get wasm() { return !!WA; }, LEVELS, MC, mcts, mcPV, useCore: C => { MX = C; }, think, analyze, cands: candsJob, candList: cands, evaluate, evalFor, kindOf, EW, pvOf, bestMove, mtPlan, mtV, mtKids, mtFin, win1, canWin, duelGood, duelReply, trapGood, trapReply, trapWin, trapAll, trapIdx, boxed, freeAt, endGood, readGood, readReply, solveWin, fillMax, roomOf, sideMoves, emptyAround, pzGood, set SH(t) { SH = t; }, get SH() { return SH; } };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof self !== 'undefined' && typeof importScripts === 'function' && typeof window === 'undefined') {
  // ?…&mt=1: the lead of the MCTS on several threads (shared/mtengine.js): core_mt.wasm on the shared memory sent with the first
  // message ('mtinit'); the helpers (mt-helper.js) grow the same tree meanwhile. The alpha-beta parts keep the one-thread core.
  let queueP = Promise.resolve();
  if (/[?&]mt=1\b/.test(self.location.search || '')) {
    queueP = new Promise(res => self.addEventListener('message', function f(e) { if (e.data && e.data.type === 'mtinit') { self.removeEventListener('message', f); res(e.data); } }))
      .then(m => {
        const x = new WebAssembly.Instance(m.module, { env: { memory: m.mem, now: () => Date.now() } }).exports;
        x.mt_stack(m.top); x.mt_thread(m.tls, 0);
        // maxNodes: 512 MB of tree with 8 or more cores and 8 GB or more (deviceMemory; Safari has none: 10 or more cores), 256 MB with
        // 8 or more cores, else 128 MB (the memory grows only as far as a search asks: mcts_alloc)
        const hc = navigator.hardwareConcurrency || 2, big = hc >= 8 && (navigator.deviceMemory ? navigator.deviceMemory >= 8 : hc >= 10);
        const C = { x: Object.assign({}, x, { memory: m.mem }), threads: hc, maxNodes: big ? 1 << 24 : hc >= 8 ? 1 << 23 : 1 << 22 };   // (jobThreads: set by each job, mtThreads)
        C.views = () => { const buf = m.mem.buffer; Object.assign(C, { buf, sq: new Int8Array(buf, x.sqp(), NN), q: new Int8Array(buf, x.qp(), 8), rm: new Int32Array(buf, x.rmp(), 64), rn: new Int32Array(buf, x.rnp(), 64), rv: new Int32Array(buf, x.rvp(), 64), rp: new Int32Array(buf, x.rpp(), 64), pv: new Int32Array(buf, x.pvp(), 32) }); };
        C.views(); MX = C;
        self.postMessage({ type: 'mtready' });
      }).catch(err => { MX = null; self.postMessage({ type: 'mtready', error: String(err && err.message || err) }); });
  }
  self.onmessage = e => {
    const m = e.data;
    if (m && m.type === 'mtinit') return;
    if (m && m.type === 'mtshare') { try { importScripts(m.lib); SH = self.MTTT.attach(m); } catch (err) { SH = null; } return; }   // (shared/mtsplit.js shared mode)
    queueP = queueP.catch(() => {}).then(() => {
      try {
        if (MX) MX.jobThreads = m.mtThreads > 0 ? Math.min(m.mtThreads, MX.threads) : 0;   // (the MCTS pool's size: the threads of this job)
        if (SH !== null) { SH.begin(m); SH.salt = 0; }
        if (m.type === 'think') self.postMessage({ id: m.id, type: 'result', ...think(m.start, m.moves, m.level, null, null, m.cfg) });
        else if (m.type === 'analyze') {
          const r = analyze(m.start, m.moves, m.time || 1000, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth }), null, m.extra);
          self.postMessage({ id: m.id, type: 'result', ...r });
        } else if (m.type === 'cands') self.postMessage({ id: m.id, type: 'result', ...candsJob(m.start, m.moves, m.time || 1200, m.k, m.plies, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth })) });
        else if (m.type === 'newgame') { TT.clear(); CC.clear(); self.postMessage({ id: m.id, type: 'result' }); }
        else if (m.type === 'pzgood') { const g = pzGood(m); self.postMessage({ id: m.id, type: 'result', list: g }); }
        else if (m.type === 'duelReply') self.postMessage({ id: m.id, type: 'result', ...(m.kind === 'trap' ? trapReply(m.start, m.moves, m.e, m.n) : m.kind === 'read' ? readReply(m.start, m.moves) : duelReply(m.start, m.moves, m.n)) });
        else if (m.type === 'mtplan') self.postMessage({ id: m.id, type: 'result', ...mtPlan(m) });
        else if (m.type === 'mtv') self.postMessage({ id: m.id, type: 'result', ...mtV(m) });
        else if (m.type === 'mtkids') self.postMessage({ id: m.id, type: 'result', ...mtKids(m) });
        else if (m.type === 'mtpv') self.postMessage({ id: m.id, type: 'result', pv: pvOf(m.start, m.moves, m.m, m.plies) });
        else if (m.type === 'mtfin') { const f = mtFin(m); if (f.result) f.result.core = WA ? 'wasm' : 'js'; self.postMessage({ id: m.id, type: 'result', ...f }); }   // (core: the search core of the threads, shown by bench.html)
      } catch (err) { self.postMessage({ id: m.id, type: 'result', error: String(err && err.stack || err) }); }
    });
  };
}
if (typeof window !== 'undefined') window.AmazonsEngine = API;
})();

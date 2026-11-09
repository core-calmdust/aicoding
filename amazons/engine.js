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
    distQ(this.sq, this.q, 0, DA); distQ(this.sq, this.q, 4, DB);
    let a = 0, b = 0, n = 0, both = 0;
    for (let i = 0; i < NN; i++) {
      if (this.sq[i]) continue;
      const x = DA[i], y = DB[i];
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
const DA = new Uint8Array(NN), DB = new Uint8Array(NN), KA = new Uint8Array(NN), KB = new Uint8Array(NN);
const QU = new Int8Array(NN + 8);
// queen-move distance from the amazons q[k0 … k0+3] to every empty square (INF = unreachable)
function distQ(sq, q, k0, D) {
  D.fill(INF);
  let h = 0, tl = 0;
  for (let k = k0; k < k0 + 4; k++) { const f = q[k]; if (f >= 0) { D[f] = 0; QU[tl++] = f; } }
  while (h < tl) {
    const s = QU[h++], nd = D[s] + 1, rays = RAYS[s];
    for (let d = 0; d < 8; d++) {
      const ray = rays[d];
      for (let j = 0; j < ray.length; j++) {
        const t = ray[j]; if (sq[t]) break;
        if (D[t] > nd) { D[t] = nd; QU[tl++] = t; }
        else if (D[t] < nd) continue;
      }
    }
  }
}
// king-move distance (one step at a time)
function distK(sq, q, k0, D) {
  D.fill(INF);
  let h = 0, tl = 0;
  for (let k = k0; k < k0 + 4; k++) { const f = q[k]; if (f >= 0) { D[f] = 0; QU[tl++] = f; } }
  while (h < tl) {
    const s = QU[h++], nd = D[s] + 1, nb = NB[s];
    for (let j = 0; j < nb.length; j++) { const t = nb[j]; if (!sq[t] && D[t] > nd) { D[t] = nd; QU[tl++] = t; } }
  }
}
const P2N = new Float64Array(INF + 2); for (let i = 0; i <= INF + 1; i++) P2N[i] = i >= INF ? 0 : Math.pow(2, -i);
// ---------------------------------------------------------------- evaluation (~100 = one square of territory)
// The classic terms (Lieberum, "An evaluation function for the game of Amazons", 2005): t1 / t2 = territory by queen /
// king distance (equal distances lean to the side to move), c1 / c2 = position terms, w = how open the board still is
// (early: the position terms count more; late: territory decides). Plus each amazon's freedom: a boxed-in amazon is a
// lost piece.
const EW = { t1: 1.0, t2: 0.45, c1: 0.5, c2: 0.35, mob: 1.0, tempo: 0.05 };
let evals = 0;
function evalFor(pos, me, toMove) {
  evals++;
  const sq = pos.sq, q = pos.q;
  distQ(sq, q, 0, DA); distQ(sq, q, 4, DB); distK(sq, q, 0, KA); distK(sq, q, 4, KB);
  const kap = toMove === P1 ? EW.tempo : -EW.tempo;
  let t1 = 0, t2 = 0, c1 = 0, c2 = 0, w = 0;
  for (let i = 0; i < NN; i++) {
    if (sq[i]) continue;
    const a = DA[i], b = DB[i];
    if (a < b) t1 += 1; else if (b < a) t1 -= 1; else if (a < INF) t1 += kap;
    const ka = KA[i], kb = KB[i];
    if (ka < kb) t2 += 1; else if (kb < ka) t2 -= 1; else if (ka < INF) t2 += kap;
    c1 += P2N[a] - P2N[b];
    if (ka < INF || kb < INF) { const x = (kb - ka) / 6; c2 += x > 1 ? 1 : x < -1 ? -1 : x; }
    if (a < INF && b < INF) w += P2N[a > b ? a - b : b - a];
  }
  const e = w > 40 ? 1 : w / 40;   // 1 = open (opening / middle game), 0 = separated
  // the amazons' freedom: squares each can reach in one move (few = in danger of being boxed in)
  let mob = 0;
  for (let k = 0; k < 8; k++) {
    const f = q[k]; if (f < 0) continue;
    let n = 0; const rays = RAYS[f];
    for (let d = 0; d < 8; d++) { const ray = rays[d]; for (let j = 0; j < ray.length; j++) { if (sq[ray[j]]) break; n++; } }
    const pen = n === 0 ? 10 : n < 5 ? (5 - n) * 1.4 : 0;   // (weighs less once the board has closed up)
    mob += (k < 4 ? -1 : 1) * pen * (0.25 + 0.75 * e);
  }
  const v = EW.t1 * t1 + e * (EW.t2 * t2 + EW.c1 * 2 * c1 + EW.c2 * c2) + EW.mob * mob;
  const s = Math.round(v * 100);
  return me === P1 ? s : -s;
}
const evaluate = pos => evalFor(pos, pos.turn, pos.turn);
const kindOf = v => Math.abs(v) > WINT ? 'exact' : 'heur';
// ---------------------------------------------------------------- candidate moves (two stages: the queen move, then the arrow)
// Every queen move is valued (the arrow not yet shot); the best few are then tried with every arrow. The children are
// valued by the full evaluation from the mover's view; a move after which the opponent cannot move wins at once.
const QKEEP_BASE = 14;
function cands(pos, K, ply, qkeep, extra) {
  const me = pos.turn, op = 3 - me, sq = pos.sq, out = [];
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
let nodes = 0, evalLimit = Infinity, tEnd = Infinity, stop = false;
const KW = [0, 1, 8, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10];   // moves searched at each remaining depth
function timeUp() { if (Date.now() > tEnd || evals > evalLimit) stop = true; return stop; }
function search(pos, d, a, b, ply) {
  nodes++;
  if ((nodes & 31) === 0 && timeUp()) return 0;
  if (stop) return 0;
  if (!pos.canMove(pos.turn)) return -(WIN - ply);
  const key = pos.h1, e = TT.get(key), hit = e && e.h2 === pos.h2;
  if (hit && e.d >= d) {
    const v = e.v > WINT ? e.v - ply : e.v < -WINT ? e.v + ply : e.v;
    if (e.f === 0) return v; if (e.f === 1 && v >= b) return v; if (e.f === 2 && v <= a) return v;
  }
  if (d <= 0) return evaluate(pos);
  const C = cands(pos, d >= 2 ? KW[Math.min(d, KW.length - 1)] : 1, ply, d >= 3 ? QKEEP_BASE : 10);
  if (!C.length) return -(WIN - ply);
  if (d === 1) { const v = C[0].s; store(pos, d, v, 0, C[0].m, ply); return v; }
  if (hit && e.m >= 0) { const i = C.findIndex(x => x.m === e.m); if (i > 0) { const x = C[i]; C.splice(i, 1); C.unshift(x); } else if (i < 0 && pos.isLegal(e.m)) C.unshift({ m: e.m, s: 0 }); }
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
// ---------------------------------------------------------------- AI levels (20 steps, Lv.1 … Lv.20)
// weak steps: one ply, the candidates' values with noise (and fewer queen moves looked at); middle: two plies; strong: a
// budget of evaluations (thousands); the top two a time budget.
const LEVELS = [null,
  { d: 1, noise: 420, qk: 3 },          // 1
  { d: 1, noise: 300, qk: 4 },          // 2
  { d: 1, noise: 210, qk: 5 },          // 3
  { d: 1, noise: 150, qk: 6 },          // 4
  { d: 1, noise: 105, qk: 8 },          // 5
  { d: 1, noise: 70, qk: 10 },          // 6
  { d: 1, noise: 45, qk: 12 },          // 7
  { d: 1, noise: 25, qk: 14 },          // 8
  { s: 1, ek: 2 },                      // 9
  { s: 1, ek: 3 },                      // 10
  { s: 1, ek: 4.5 },                    // 11
  { s: 1, ek: 6 },                      // 12  (about 6,000 evaluations per move)
  { s: 1, ek: 10 },                     // 13
  { s: 1, ek: 16 },                     // 14
  { s: 1, ek: 24 },                     // 15
  { s: 1, ek: 36 },                    // 16
  { s: 1, ek: 52 },                    // 17
  { s: 1, ek: 75 },                    // 18
  { s: 1, ms: 1500 },                   // 19
  { s: 1, ms: 3000 },                   // 20
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
  const r = bestMove(pos, L.dx || 40, L.ms || 0, L.ek || (L.ms ? 0 : 60));
  if (r.v < -WINT && r.depth > 1) {
    stop = false; tEnd = Date.now() + 600; evalLimit = Infinity;
    const vals = rootValues(pos, cands(pos, 12, 0, 14), Math.min(3, r.depth));
    if (!stop && vals.length) return { move: resist(pos, vals), v: r.v, depth: r.depth };
  }
  return { move: r.move, v: r.v, depth: r.depth, evals };
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
  LEVELS, think, analyze, cands: candsJob, candList: cands, evaluate, evalFor, kindOf, EW, pvOf, bestMove };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof self !== 'undefined' && typeof importScripts === 'function' && typeof window === 'undefined') {
  let queueP = Promise.resolve();
  self.onmessage = e => {
    const m = e.data;
    queueP = queueP.then(() => {
      try {
        if (m.type === 'think') self.postMessage({ id: m.id, type: 'result', ...think(m.start, m.moves, m.level, null, null, m.cfg) });
        else if (m.type === 'analyze') {
          const r = analyze(m.start, m.moves, m.time || 1000, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth }), null, m.extra);
          self.postMessage({ id: m.id, type: 'result', ...r });
        } else if (m.type === 'cands') self.postMessage({ id: m.id, type: 'result', ...candsJob(m.start, m.moves, m.time || 1200, m.k, m.plies, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth })) });
        else if (m.type === 'newgame') { TT.clear(); self.postMessage({ id: m.id, type: 'result' }); }
      } catch (err) { self.postMessage({ id: m.id, type: 'result', error: String(err && err.stack || err) }); }
    });
  };
}
if (typeof window !== 'undefined') window.AmazonsEngine = API;
})();

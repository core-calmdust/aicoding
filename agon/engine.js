// Agon (Queen's Guard, 1842) — rules (for the page) and the AI worker (plain JS search).
// Works as a Web Worker (postMessage API), as a plain <script> (window.AgonEngine) and as a Node module.
//
// Board: 91 hexagons (a hexagon of side 6) in six concentric rings; ring 0 is the throne (the centre), ring 5 the edge.
// Cells are numbered row by row from the top (pointy-top hexagons, horizontal rows of 6, 7 … 11 … 7, 6).
// Axial coordinates (q, r): r = -5 (top row) … 5 (bottom row); the screen x of a cell is q + r / 2.
// Pieces: 1 = White guard, 2 = White queen, 3 = Black guard, 4 = Black queen. White (P1) moves first.
// Start (Ludii "Agon", after the 1842 rules): each side's queen and six guards alternate with the other's round the edge.
// A move: one piece one step to an adjacent empty cell in the same ring or the next ring inwards (never outwards).
//   Only a queen may enter the throne. A piece may not move into a cell between two enemy pieces in a line.
//   A piece that ends between the moved piece and another of the mover's pieces in a line is captured; it stays where it
//   is, and its owner must use the next turn(s) to relocate it — the queen first (to any empty cell but the throne),
//   then the guards one per turn (to any empty cell of the edge ring). A relocation never captures.
// Win: your queen on the throne and your six guards on the six cells round it. Six guards round the throne without your
// queen on it loses at once. Threefold repetition = draw, and after CAP plies the game is a draw.
// Moves: m = from + 92 * to; from 91 = a guard placed from the reserve (the "1842 placement" variant). PASS = 92 * 92.
(function () {
'use strict';
const P1 = 1, P2 = 2;
const WIN = 30000, WINT = 29000, N = 91, RES = 91, PASS = 92 * 92;
const RULES = {
  std: { place: false, cap: 300 },       // the standard set-up round the edge
  place: { place: true, cap: 300 },      // 1842 opening: queens in opposite corners, the twelve guards placed in turn
};
const RULE_ORDER = ['std', 'place'];
let R = RULES.std, RK = 'std';
function setRule(k) { if (!RULES[k]) k = 'std'; RK = k; R = RULES[k]; }
// ---------------------------------------------------------------- geometry
const Q = [], RR = [], RING = new Int8Array(N), XC = [], YC = [], ROWS = [];
const IDX = new Map();
for (let r = -5; r <= 5; r++) {
  const row = [];
  for (let q = Math.max(-5, -5 - r); q <= Math.min(5, 5 - r); q++) { const i = Q.length; Q.push(q); RR.push(r); IDX.set(q + ',' + r, i); row.push(i); }
  ROWS.push(row);
}
const at = (q, r) => { const i = IDX.get(q + ',' + r); return i === undefined ? -1 : i; };
for (let i = 0; i < N; i++) { const q = Q[i], r = RR[i]; RING[i] = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)); XC.push(q + r / 2); YC.push(r * Math.sqrt(3) / 2); }
const CENTER = at(0, 0);
// directions: 0 E, 1 SE, 2 SW, 3 W, 4 NW, 5 NE (screen); opposite = d + 3
const DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
const NB = []; for (let i = 0; i < N; i++) NB.push(DIRS.map(([dq, dr]) => at(Q[i] + dq, RR[i] + dr)));
const RINGL = [[], [], [], [], [], []];   // ring k, clockwise from the top-left corner
{
  RINGL[0] = [CENTER];
  const walk = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
  for (let k = 1; k <= 5; k++) { let q = 0, r = -k; for (const [dq, dr] of walk) for (let s = 0; s < k; s++) { RINGL[k].push(at(q, r)); q += dq; r += dr; } }
}
const RPOS = new Int8Array(N); for (let k = 0; k <= 5; k++) RINGL[k].forEach((i, j) => { RPOS[i] = j; });
const INNER = RINGL[1], OUTER = RINGL[5];
// notation: ring.position (5.12 = ring 5, 12th cell clockwise from the top-left corner); the throne is "T"
const sqName = i => i === CENTER ? 'T' : RING[i] + '.' + (RPOS[i] + 1);
const sqParse = s => { s = String(s).trim().toUpperCase(); if (s === 'T' || s === '0') return CENTER; const x = s.match(/^([1-5])[.\-·](\d{1,2})$/); if (!x) return -1; const k = +x[1], j = +x[2] - 1; return j >= 0 && j < 6 * k ? RINGL[k][j] : -1; };
// the starting positions (Ludii's cell numbers, row by row from the bottom; turned round so White starts at the bottom)
function ludii(n) { let k = 0, s = 0; const len = [6, 7, 8, 9, 10, 11, 10, 9, 8, 7, 6]; while (n >= s + len[k]) { s += len[k]; k++; } const r = 5 - k, j = n - s; return at(Math.max(-5, -5 - r) + j, r); }
const rot = i => at(-Q[i], -RR[i]);
const START = (() => {
  const b = new Int8Array(N);
  for (const n of [89, 60, 20, 3, 6, 51]) b[rot(ludii(n))] = 1;
  b[rot(ludii(85))] = 2;
  for (const n of [87, 84, 39, 1, 30, 70]) b[rot(ludii(n))] = 3;
  b[rot(ludii(5))] = 4;
  return b;
})();
const QUEEN0 = [0, START.indexOf(2), START.indexOf(4)];
const mv = (f, t) => f + 92 * t;
const mFrom = m => m === PASS ? -1 : m % 92, mTo = m => m === PASS ? -1 : Math.floor(m / 92);
const own = x => x ? (x <= 2 ? 1 : 2) : 0;
const isQ = x => x === 2 || x === 4;
// zobrist (two 32-bit halves): piece kinds 1..4, captured flag, side, reserve counts
let zs = 0x2545F491;
const zr = () => { zs ^= zs << 13; zs >>>= 0; zs ^= zs >>> 17; zs ^= zs << 5; zs >>>= 0; return zs; };
const Z1 = [], Z2 = []; for (let k = 0; k < 5; k++) { Z1.push([]); Z2.push([]); for (let i = 0; i < N; i++) { Z1[k].push(zr()); Z2[k].push(zr()); } }
const ZC1 = [], ZC2 = []; for (let i = 0; i < N; i++) { ZC1.push(zr()); ZC2.push(zr()); }
const ZR1 = [], ZR2 = []; for (let i = 0; i < 16; i++) { ZR1.push(zr()); ZR2.push(zr()); }
const ZS1 = zr(), ZS2 = zr();

// ---------------------------------------------------------------- the WebAssembly search (core.c → core-wasm.js, tools/build-core.sh)
// search() / qsearch() run in core.c — the same algorithm, order, table, repetitions and counters (tools/check_wasm.js),
// several times faster. Loaded synchronously in a worker and in Node; the page itself and any failure use the JS search below.
let WA = null;
function loadCore() {
  try {
    let b64 = null;
    if (typeof self !== 'undefined' && typeof importScripts === 'function' && typeof window === 'undefined') { importScripts('core-wasm.js?v=2'); b64 = self.AG_WASM; }
    else if (typeof module !== 'undefined' && module.exports && typeof require === 'function') { const g = globalThis, had = 'self' in g, old = g.self; g.self = g; try { require(require('path').join(__dirname, 'core-wasm.js')); b64 = g.AG_WASM; } finally { if (had) g.self = old; else delete g.self; } }
    if (!b64 || (typeof process !== 'undefined' && process.env && process.env.AG_NOWASM)) return;
    const bin = typeof atob === 'function' ? Uint8Array.from(atob(b64), c => c.charCodeAt(0)) : Buffer.from(b64, 'base64');
    let io = null;
    const env = {
      poll: () => (Date.now() > tEnd || (SH !== null && SH.stopped())) ? 1 : 0,
      shget: (h1, h2) => { const e = SH.get(h1 >>> 0, h2 >>> 0); if (!e) return 0; io[0] = e.d; io[1] = e.f; io[2] = e.v; io[3] = e.m; io[4] = e.rs; return 1; },
      shput: (h1, h2, d, v, f, m, rs) => { SH.put(h1 >>> 0, h2 >>> 0, d, v, f, m, rs); },
    };
    const x = new WebAssembly.Instance(new WebAssembly.Module(bin), { env }).exports, buf = x.memory.buffer;
    WA = coreViews(x, buf, io = new Int32Array(buf, x.iop(), 32));
  } catch (e) { WA = null; }
}
// the geometry and keys into a core (setup) and the views of its memory: core-wasm.js (WA) or the lead's core_mt.wasm (MX)
function coreViews(x, buf, io) {
  const geo = new Int32Array(buf, x.geop(), N * 6 + N + 37), zt = new Uint32Array(buf, x.ztp(), 12 * N + 34);
  let k = 0;
  for (let i = 0; i < N; i++) for (let d = 0; d < 6; d++) geo[k++] = NB[i][d];
  for (let i = 0; i < N; i++) geo[k++] = RING[i];
  for (const i of OUTER) geo[k++] = i;
  for (const i of INNER) geo[k++] = i;
  geo[k++] = CENTER;
  for (let kk = 0; kk < 5; kk++) for (let i = 0; i < N; i++) { zt[kk * N + i] = Z1[kk][i]; zt[5 * N + kk * N + i] = Z2[kk][i]; }
  for (let i = 0; i < N; i++) { zt[10 * N + i] = ZC1[i]; zt[11 * N + i] = ZC2[i]; }
  for (let i = 0; i < 16; i++) { zt[12 * N + i] = ZR1[i]; zt[12 * N + 16 + i] = ZR2[i]; }
  zt[12 * N + 32] = ZS1; zt[12 * N + 33] = ZS2;
  x.setup();
  const C = { x, io: io || new Int32Array(buf, x.iop(), 32), sq: new Int8Array(buf, x.sqp(), N), cap: new Int8Array(buf, x.capp(), N), rh1: new Uint32Array(buf, x.rh1p(), 4096), rh2: new Uint32Array(buf, x.rh2p(), 4096) };
  if (x.aomp) { C.aom = new Int32Array(buf, x.aomp(), 256); C.aov = new Int32Array(buf, x.aovp(), 256); }
  C.geo = geo; C.zt = zt;
  return C;
}
function kreset() { killers.length = 0; if (WA) WA.x.kclear(); if (MX) MX.x.kclear(); }
function ttClear() { TT.clear(); if (WA) WA.x.ttclear(); if (MX) MX.x.ttclear(); }
// (2026-11-11) The root's loops in the core too (core.c ab_best / ab_values: node for node bestMove / rootValues below — the
// search under the root was there already). MX: the lead of the threads (?mt=1, shared/mtengine.js) on core_mt.wasm, where the
// helpers (mt-helper.js) take moves at the split points of Praline's Young Brothers Wait (claude/agon-spec.md). Not with the
// JS shared table (shared/mtsplit.js shared mode: SH) — that keeps the JS loops.
let MX = null;
const abCore = () => SH !== null ? null : MX || (WA && WA.x.ab_best ? WA : null);
function abRoot(A, pos, hist) {
  A.sq.set(pos.sq); A.cap.set(pos.cap); const io = A.io;
  io[8] = pos.side; io[9] = pos.ply; io[10] = pos.h1 | 0; io[11] = pos.h2 | 0; io[12] = pos.free ? 1 : 0; io[13] = hist.length; io[14] = pos.res[1]; io[15] = pos.res[2]; io[16] = rootSide; io[17] = R.cap;
  for (let i = 0; i < hist.length; i++) { const x = hist[i], k = x.indexOf(':'); A.rh1[i] = +x.slice(0, k); A.rh2[i] = +x.slice(k + 1); }
  A.x.setn(nodes, nodeLimit === Infinity ? 1e300 : nodeLimit, 0);
  if (A === MX) { A.x.set_tend(tEnd); A.x.ab_threads(MX.jobThreads || MX.threads || 1); }
}
function abBack(A) { nodes = A.x.getn(); if (A.x.stopped()) stop = true; }
function ttGet(pos) {   // the one-thread table's entry for pos (or the shared table's)
  if (SH !== null) return SH.get(pos.h1, pos.h2);
  if (WA) return WA.x.ttprobe(pos.h1, pos.h2) ? { h2: pos.h2, d: WA.io[0], f: WA.io[1], v: WA.io[2], m: WA.io[3], rs: WA.io[4] } : undefined;
  const e = TT.get(pos.h1); return e && e.h2 === pos.h2 ? e : undefined;
}

class Pos {
  constructor() { this.sq = new Int8Array(N); this.cap = new Int8Array(N); this.side = 0; this.ply = 0; this.res = [0, 0, 0]; this.free = false; this.reset(); }
  reset() {
    this.cap.fill(0); this.side = 0; this.ply = 0;
    if (R.place) { this.sq.fill(0); this.sq[QUEEN0[1]] = 2; this.sq[QUEEN0[2]] = 4; this.res = [0, 6, 6]; }
    else { this.sq.set(START); this.res = [0, 0, 0]; }
    this.rehash();
  }
  // spec: { b: 91 chars ('.' empty, 'w' White guard, 'W' White queen, 'b' / 'B' Black; a captured piece is written as
  // 'x' 'X' 'y' 'Y'), side: 1 | 2, n: plies already played, r: [White reserve, Black reserve] } or null (the start)
  static from(spec) {
    const p = new Pos();
    if (spec && spec.b) {
      p.sq.fill(0); p.cap.fill(0);
      for (let i = 0; i < N; i++) {
        const ch = spec.b[i], k = 'wWbBxXyY'.indexOf(ch);
        if (k >= 0) { p.sq[i] = (k & 3) + 1; if (k >= 4) p.cap[i] = 1; }
      }
      p.side = spec.side === P2 ? 1 : 0; p.ply = spec.n | 0; p.res = [0, spec.r ? spec.r[0] | 0 : 0, spec.r ? spec.r[1] | 0 : 0]; p.free = !!spec.free;
      if (!p.ply && p.side) p.ply = 1;
      p.rehash();
    }
    return p;
  }
  clone() { const q = Object.create(Pos.prototype); q.sq = this.sq.slice(); q.cap = this.cap.slice(); q.side = this.side; q.ply = this.ply; q.res = this.res.slice(); q.free = this.free; q.h1 = this.h1; q.h2 = this.h2; return q; }
  rehash() {
    let a = 0, c = 0;
    for (let i = 0; i < N; i++) { const x = this.sq[i]; if (x) { a ^= Z1[x][i]; c ^= Z2[x][i]; } if (this.cap[i]) { a ^= ZC1[i]; c ^= ZC2[i]; } }
    if (this.side) { a ^= ZS1; c ^= ZS2; }
    a ^= ZR1[this.res[1]] ^ ZR1[8 + this.res[2]]; c ^= ZR2[this.res[1]] ^ ZR2[8 + this.res[2]];
    this.h1 = a >>> 0; this.h2 = c >>> 0;
  }
  at(i) { return this.sq[i]; }                // 0 empty, 1 White guard, 2 White queen, 3 Black guard, 4 Black queen
  owner(i) { return own(this.sq[i]); }
  isQueen(i) { return isQ(this.sq[i]); }
  captured(i) { return !!this.cap[i]; }
  get turn() { return this.side ? P2 : P1; }
  queen(p) { const k = p === P1 ? 2 : 4; for (let i = 0; i < N; i++) if (this.sq[i] === k) return i; return -1; }
  // a cell between two enemy pieces (of p's enemy) in a line
  trapped(t, p) {
    const o = 3 - p, nb = NB[t], sq = this.sq;
    for (let d = 0; d < 3; d++) { const a = nb[d], b = nb[d + 3]; if (a >= 0 && b >= 0 && own(sq[a]) === o && own(sq[b]) === o) return true; }
    return false;
  }
  // the pieces of p waiting to be relocated (queen first)
  pending(p) { const out = []; for (let i = 0; i < N; i++) if (this.cap[i] && own(this.sq[i]) === p) { if (isQ(this.sq[i])) out.unshift(i); else out.push(i); } return out; }
  inPlace() { return this.res[1] + this.res[2] > 0; }
  // what kind of turn the side to move has: 'place' | 'queen' (relocate the queen) | 'guard' (relocate a guard) | 'move'
  phase() {
    const p = this.side + 1;
    if (this.res[p] > 0) return 'place';
    const pd = this.pending(p);
    if (pd.length) return isQ(this.sq[pd[0]]) ? 'queen' : 'guard';
    return 'move';
  }
  moves() {
    const p = this.side + 1, out = [], sq = this.sq;
    if (this.res[p] > 0) {
      for (let t = 0; t < N; t++) if (!sq[t] && t !== CENTER && !this.trapped(t, p)) out.push(RES + 92 * t);
      if (!out.length) for (let t = 0; t < N; t++) if (!sq[t] && t !== CENTER) out.push(RES + 92 * t);
      return out;
    }
    const pd = this.pending(p);
    if (pd.length) {
      const qd = isQ(sq[pd[0]]), list = qd ? [pd[0]] : pd;
      for (const f of list) {
        const T = qd ? null : OUTER; let any = false;
        const tryT = t => { if (!sq[t] && t !== CENTER && !this.trapped(t, p)) { out.push(f + 92 * t); any = true; } };
        if (T) T.forEach(tryT); else for (let t = 0; t < N; t++) tryT(t);
        if (!any) { if (T) { for (const t of T) if (!sq[t]) out.push(f + 92 * t); } else for (let t = 0; t < N; t++) if (!sq[t] && t !== CENTER) out.push(f + 92 * t); }
      }
      if (!out.length) out.push(PASS);
      return out;
    }
    for (let f = 0; f < N; f++) {
      const x = sq[f]; if (own(x) !== p) continue;
      const rf = RING[f], nb = NB[f], q = isQ(x);
      for (let d = 0; d < 6; d++) {
        const t = nb[d];
        if (t < 0 || sq[t] || RING[t] > rf || (t === CENTER && !q)) continue;
        // the cell between two enemies (the moving piece leaves f, which is never an enemy)
        if (this.trapped(t, p)) continue;
        out.push(f + 92 * t);
      }
    }
    if (!out.length) out.push(PASS);
    return out;
  }
  // the enemy pieces a normal move would capture
  capsOf(m) {
    if (m === PASS) return [];
    const f = m % 92, t = (m / 92) | 0;
    if (f === RES || this.cap[f]) return [];
    const p = own(this.sq[f]), o = 3 - p, sq = this.sq, out = [];
    for (let d = 0; d < 6; d++) { const a = NB[t][d]; if (a < 0 || own(sq[a]) !== o || this.cap[a]) continue; const b = NB[a][d]; if (b >= 0 && b !== f && own(sq[b]) === p) out.push(a); }
    return out;
  }
  play(m) {
    const p = this.side + 1;
    if (m !== PASS) {
      const f = m % 92, t = (m / 92) | 0;
      if (f === RES) {
        const x = p === P1 ? 1 : 3; this.sq[t] = x;
        this.h1 ^= Z1[x][t]; this.h2 ^= Z2[x][t];
        const k = p === P1 ? 0 : 8; this.h1 ^= ZR1[k + this.res[p]] ^ ZR1[k + this.res[p] - 1]; this.h2 ^= ZR2[k + this.res[p]] ^ ZR2[k + this.res[p] - 1];
        this.res[p]--;
      } else {
        const x = this.sq[f], wasCap = this.cap[f];
        const caps = wasCap ? null : this.capsOf(m);
        this.sq[f] = 0; this.sq[t] = x;
        this.h1 ^= Z1[x][f] ^ Z1[x][t]; this.h2 ^= Z2[x][f] ^ Z2[x][t];
        if (wasCap) { this.cap[f] = 0; this.h1 ^= ZC1[f]; this.h2 ^= ZC2[f]; }
        else for (const a of caps) { this.cap[a] = 1; this.h1 ^= ZC1[a]; this.h2 ^= ZC2[a]; }
      }
    }
    this.side ^= 1; this.ply++;
    this.h1 = (this.h1 ^ ZS1) >>> 0; this.h2 = (this.h2 ^ ZS2) >>> 0;
    return this;
  }
  spec() { let s = ''; for (let i = 0; i < N; i++) { const x = this.sq[i]; s += x ? 'wWbBxXyY'[x - 1 + (this.cap[i] ? 4 : 0)] : '.'; } const o = { b: s, side: this.side ? P2 : P1, n: this.ply }; if (this.res[1] || this.res[2]) o.r = [this.res[1], this.res[2]]; return o; }
  movesOf(p) { return p === P1 ? (this.ply + 1) >> 1 : this.ply >> 1; }
  // p's guards on the six cells round the throne (not captured ones)
  ringCount(p) { const g = p === P1 ? 1 : 3; let n = 0; for (const i of INNER) if (this.sq[i] === g && !this.cap[i]) n++; return n; }
  onThrone(p) { return this.sq[CENTER] === (p === P1 ? 2 : 4) && !this.cap[CENTER]; }
  // steps p still needs (queen to the throne + guards to ring 1; a captured guard counts from the edge, +1 for the turn)
  dist(p) {
    let s = 0; const sq = this.sq;
    for (let i = 0; i < N; i++) { const x = sq[i]; if (own(x) !== p) continue; if (isQ(x)) s += this.cap[i] ? 2 : RING[i]; else s += this.cap[i] ? 5 : RING[i] - 1; }
    s += 4 * this.res[p];
    return s;
  }
}
const kindOfMove = (pos, m) => { if (m === PASS) return 'pass'; const f = mFrom(m); if (f === RES) return 'place'; if (pos.cap[f]) return 'reloc'; return 'step'; };
function path(pos, m) { if (m === PASS) return []; const f = mFrom(m), t = mTo(m); if (f === RES) return [t]; return [f, t]; }
const isJump = () => false;
// notation: 5.3-4.3 (a step), 4.2-3.2x (captures), 3.4>5.17 (relocation of a captured piece), +2.5 (placement), — (pass)
function name(pos, m) {
  if (m === PASS) return '—';
  const f = mFrom(m), t = mTo(m), k = kindOfMove(pos, m);
  if (k === 'place') return '+' + sqName(t);
  const q = pos.isQueen(f) ? 'Q' : '';
  if (k === 'reloc') return q + sqName(f) + '>' + sqName(t);
  return q + sqName(f) + '-' + sqName(t) + 'x'.repeat(pos.capsOf(m).length);
}
function parse(pos, s) {
  s = String(s).trim().replace(/^Q/i, '');
  const L = pos.moves();
  if (s === '—' || s === '-') return L.includes(PASS) ? PASS : null;
  let x = s.match(/^\+\s*([T0-9.·]+)/i); if (x) { const t = sqParse(x[1]); const m = mv(RES, t); return L.includes(m) ? m : null; }
  x = s.match(/^([T0-9.·]+)\s*[-:>→x]\s*Q?([T0-9.·]+)/i); if (!x) return null;
  const f = sqParse(x[1]), t = sqParse(x[2]); if (f < 0 || t < 0) return null;
  const m = mv(f, t); return L.includes(m) ? m : null;
}
function replay(start, moves) {
  const pos = Pos.from(start), hashes = [pos.h1 + ':' + pos.h2];
  for (const m of moves || []) { pos.play(m); hashes.push(pos.h1 + ':' + pos.h2); }
  return { pos, hashes };
}
// game status: { over, winner, draw, why: 'throne' (a completed guard) | 'empty' (guards round an empty throne: that side
// loses) | 'rep' | 'cap' }
function judge(pos, hashes) {
  const mover = pos.side ? P1 : P2;   // the side that has just moved
  for (const p of [mover, 3 - mover]) {
    if (pos.ringCount(p) === 6) {
      if (pos.onThrone(p)) return { over: true, winner: p, why: 'throne' };
      return { over: true, winner: 3 - p, why: 'empty', loser: p };
    }
  }
  if (pos.free) return { over: false };
  if (hashes) { const h = pos.h1 + ':' + pos.h2; let c = 0; for (const x of hashes) if (x === h) c++; if (c >= 3) return { over: true, winner: 0, draw: true, why: 'rep' }; }
  if (pos.ply >= R.cap) return { over: true, winner: 0, draw: true, why: 'cap' };
  return { over: false };
}
// ---------------------------------------------------------------- AI levels (20 steps: 15級 … 1級, 初段 … 五段)
// weak levels look at a few pieces, think shallow and add noise; they still head for the throne (no aimless wandering).
const LEVELS = [null,
  { d: 1, look: 2, noise: 60, blunder: 0.25 },   // 15級
  { d: 1, look: 3, noise: 50, blunder: 0.2 },    // 14級
  { d: 1, look: 3, noise: 40, blunder: 0.15 },   // 13級
  { d: 2, look: 3, noise: 40, blunder: 0.12 },   // 12級
  { d: 2, look: 4, noise: 32, blunder: 0.1 },    // 11級
  { d: 2, look: 5, noise: 26, blunder: 0.06 },   // 10級
  { d: 2, noise: 22, blunder: 0.04 },            // 9級
  { d: 3, noise: 18 },                           // 8級
  { d: 3, noise: 10 },                           // 7級
  { d: 4, noise: 8 },                            // 6級
  { d: 4, noise: 4 },                            // 5級
  { s: 1, nk: 4 },                               // 4級
  { s: 1, nk: 8 },                               // 3級
  { s: 1, nk: 16 },                              // 2級
  { s: 1, nk: 30 },                              // 1級
  { s: 1, nk: 60 },                              // 初段
  { s: 1, nk: 110 },                             // 二段
  { s: 1, nk: 200 },                             // 三段
  { s: 1, ms: 1200 },                            // 四段
  { s: 1, ms: 2500 },                            // 五段
  // the top levels (2026-11-09, common rule「最上位のレベルの追加」): twice the time per step up to 20 s, every thread of the
  // page's pool (shared/mtsplit.js; the shared table on an isolated page) — one thread without the option
  { s: 1, ms: 5000 },                            // Lv.21
  { s: 1, ms: 10000 },                           // Lv.22
  { s: 1, ms: 20000 },                           // Lv.23
];
function gauss(rand) { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
// ---------------------------------------------------------------- evaluation (side to move's view, ~100 = one tempo)
// The game is a race of tempi (nothing ever leaves the board): steps the queen and guards still need, captured pieces
// (a guard back to the edge, a lost turn), the throne, the guard ring, and enemy pieces sitting on the six inner cells
// (they block the ring until captured). Pieces in danger of capture next move and safe "anchors" count a little.
const W = { step: 100, qstep: 110, throne: 260, ringG: 40, block: 180, blockQ: 330, capG: 120, capQ: 80, hang: 70, res: 380 };
function sideScore(pos, p) {
  const sq = pos.sq, cap = pos.cap, o = 3 - p, G = p === P1 ? 1 : 3, QK = G + 1;
  let v = 0, guards = 0, ringG = 0;
  for (let i = 0; i < N; i++) {
    const x = sq[i]; if (own(x) !== p) continue;
    if (x === QK) { v -= cap[i] ? W.capQ + RING[i] * 20 : RING[i] * W.qstep; if (i === CENTER && !cap[i]) v += W.throne; }
    else { guards++; if (cap[i]) v -= W.capG + 4 * W.step; else { v -= (RING[i] - 1) * W.step; if (RING[i] === 1) ringG++; } }
  }
  v -= pos.res[p] * W.res;
  v += ringG * W.ringG;
  // enemy pieces on the inner ring / throne block p
  for (const i of INNER) if (own(sq[i]) === o && !cap[i]) v -= W.block;
  if (own(sq[CENTER]) === o && !cap[CENTER]) v -= W.blockQ;
  // six guards round an empty throne loses: five in with the queen away is a liability
  if (ringG >= 5 && !pos.onThrone(p)) v -= 120;
  return v;
}
// pieces of p that the side to move (the enemy of p) could capture with one step
function hanging(pos, p) {
  const o = 3 - p, sq = pos.sq; let n = 0, q = 0;
  const seen = new Int8Array(N), list = [];
  for (let f = 0; f < N; f++) {
    if (own(sq[f]) !== o || pos.cap[f]) continue;
    const rf = RING[f], qf = isQ(sq[f]);
    for (let d = 0; d < 6; d++) {
      const t = NB[f][d]; if (t < 0 || sq[t] || RING[t] > rf || (t === CENTER && !qf)) continue;
      if (pos.trapped(t, o)) continue;
      for (let e = 0; e < 6; e++) { const a = NB[t][e]; if (a < 0 || own(sq[a]) !== p || pos.cap[a] || seen[a]) continue; const b = NB[a][e]; if (b >= 0 && b !== f && own(sq[b]) === o) { seen[a] = 1; n++; list.push(a); if (isQ(sq[a])) q = 1; } }
    }
  }
  return { n, q, list };
}
// hanging(pos, p).n without the allocations (the search's evaluation): the same walk, "seen" kept by a stamp
const HSEEN = new Int32Array(256); let hStamp = 0;
function hangN(pos, p) {
  const o = 3 - p, sq = pos.sq, cap = pos.cap; let n = 0;
  if (++hStamp > 2e9) { HSEEN.fill(0); hStamp = 1; }
  const st = hStamp;
  for (let f = 0; f < N; f++) {
    if (own(sq[f]) !== o || cap[f]) continue;
    const rf = RING[f], qf = isQ(sq[f]);
    for (let d = 0; d < 6; d++) {
      const t = NB[f][d]; if (t < 0 || sq[t] || RING[t] > rf || (t === CENTER && !qf)) continue;
      if (pos.trapped(t, o)) continue;
      for (let e = 0; e < 6; e++) { const a = NB[t][e]; if (a < 0 || own(sq[a]) !== p || cap[a] || HSEEN[a] === st) continue; const b = NB[a][e]; if (b >= 0 && b !== f && own(sq[b]) === o) { HSEEN[a] = st; n++; } }
    }
  }
  return n;
}
function evaluate(pos) {
  const me = pos.side + 1, op = 3 - me;
  let v = sideScore(pos, me) - sideScore(pos, op) + 40;
  if (!pos.inPlace()) {
    const hn = hangN(pos, me);           // I am to move: my hanging pieces can still be saved (only one per move)
    if (hn > 1) v -= (hn - 1) * W.hang * 2;
    const gn = hangN(pos, op);
    if (gn) v += W.hang * 0.5;
  }
  return v;
}
function terminal(pos, ply, hist) {
  const st = judge(pos, null);
  if (!st.over) return null;
  if (st.draw) return drawV(pos);
  return st.winner === pos.side + 1 ? WIN - ply : -(WIN - ply);
}
// ---------------------------------------------------------------- search (negamax alpha-beta, TT, quiescence on captures)
const TT = new Map();
// SH: the transposition table shared by the workers of shared/mtsplit.js (shared mode: a cross-origin isolated page —
// shared/mttt.js, set by the 'mtshare' message; the one-thread worker never has it, so its levels play as before)
let SH = null;
const SALT = { std: 0, place: 0x5bd1e995 };
let nodes = 0, nodeLimit = Infinity, tEnd = Infinity, stop = false, rootSide = 0;
// contempt: a draw (repetition / move cap) is a little worse than equal for the side the AI plays, so it keeps trying
const CONTEMPT = 30;
const drawV = pos => pos.side === rootSide ? -CONTEMPT : CONTEMPT;
const killers = [];
// the positions of the game so far and of the line being searched ("h1:h2" in hist ⇔ the same pair here), for repetitions
const RH1 = new Float64Array(4096), RH2 = new Float64Array(4096); let rhN = 0;
function loadHist(hist) { rhN = 0; for (const x of hist) { const k = x.indexOf(':'); RH1[rhN] = +x.slice(0, k); RH2[rhN] = +x.slice(k + 1); rhN++; } }
function seenBefore(h1, h2) { for (let i = 0; i < rhN; i++) if (RH1[i] === h1 && RH2[i] === h2) return true; return false; }
function moveScore(pos, m, ttm, k) {
  if (m === ttm) return 1e9; if (m === k) return 1e8; if (m === PASS) return -1e6;
  const f = mFrom(m), t = mTo(m);
  if (f === RES || pos.cap[f]) return 1000 - RING[t] * 10;
  let s = (RING[f] - RING[t]) * 120 + pos.capsOf(m).length * 900;
  if (t === CENTER) s += 800;
  if (RING[t] === 1) s += 60;
  return s;
}
const OSC = new Float64Array(1024);
// one reusable child position per ply for the search (a child is only used while its parent's loop is on it): no clone per move
const SP = [];
function child(ply, src, m) {
  let q = SP[ply];
  if (!q) q = SP[ply] = src.clone();
  else { q.sq.set(src.sq); q.cap.set(src.cap); q.res[0] = src.res[0]; q.res[1] = src.res[1]; q.res[2] = src.res[2]; q.side = src.side; q.ply = src.ply; q.free = src.free; q.h1 = src.h1; q.h2 = src.h2; }
  return q.play(m);
}
function orderMoves(pos, L, ttm, ply) {   // the same scores, then a stable insertion sort (best first) = the former stable index sort
  const k = (WA ? WA.x.killer(ply) : killers[ply]) || -1, n = L.length, out = L.slice();
  for (let i = 0; i < n; i++) {
    const m = out[i], v = moveScore(pos, m, ttm, k);
    let j = i; while (j > 0 && OSC[j - 1] < v) { OSC[j] = OSC[j - 1]; out[j] = out[j - 1]; j--; }
    OSC[j] = v; out[j] = m;
  }
  return out;
}
function qsearch(pos, a, b, ply, qd) {
  nodes++;
  if ((nodes & 1023) === 0 && (Date.now() > tEnd || nodes > nodeLimit || (SH !== null && SH.stopped()))) stop = true;
  const tv = terminal(pos, ply); if (tv !== null) return tv;
  const stand = evaluate(pos);
  if (qd <= 0 || pos.phase() !== 'move') return stand;
  if (stand >= b) return stand;
  if (stand > a) a = stand;
  let best = stand;
  for (const m of pos.moves()) {
    if (m === PASS || !pos.capsOf(m).length) continue;
    const v = -qsearch(child(ply + 1, pos, m), -b, -a, ply + 1, qd - 1);
    if (stop) return best;
    if (v > best) { best = v; if (v > a) { a = v; if (a >= b) break; } }
  }
  return best;
}
function search(pos, d, a, b, ply) {
  if (WA && !stop) {
    WA.sq.set(pos.sq); WA.cap.set(pos.cap); const io = WA.io;
    io[8] = pos.side; io[9] = pos.ply; io[10] = pos.h1 | 0; io[11] = pos.h2 | 0; io[12] = pos.free ? 1 : 0; io[13] = rhN; io[14] = pos.res[1]; io[15] = pos.res[2]; io[16] = rootSide; io[17] = R.cap;
    for (let i = 0; i < rhN; i++) { WA.rh1[i] = RH1[i]; WA.rh2[i] = RH2[i]; }
    WA.x.setn(nodes, nodeLimit === Infinity ? 1e300 : nodeLimit, SH !== null ? 1 : 0);
    const v = WA.x.search(d, a, b, ply);
    nodes = WA.x.getn(); if (WA.x.stopped()) stop = true;
    return v;
  }
  nodes++;
  if ((nodes & 1023) === 0 && (Date.now() > tEnd || nodes > nodeLimit || (SH !== null && SH.stopped()))) stop = true;
  if (stop) return 0;
  const tv = terminal(pos, ply); if (tv !== null) return tv;
  if (ply > 0 && seenBefore(pos.h1, pos.h2)) return drawV(pos);
  const key = pos.h1, e = SH !== null ? SH.get(key, pos.h2) : TT.get(key);
  if (e && e.h2 === pos.h2 && e.d >= d && e.rs === rootSide) {
    if (e.f === 0) return e.v; if (e.f === 1 && e.v >= b) return e.v; if (e.f === 2 && e.v <= a) return e.v;
  }
  if (d <= 0) return qsearch(pos, a, b, ply, 3);
  let L = orderMoves(pos, pos.moves(), e && e.h2 === pos.h2 ? e.m : -1, ply);
  let best = -Infinity, bm = L[0];
  const a0 = a;
  RH1[rhN] = pos.h1; RH2[rhN] = pos.h2; rhN++;
  for (let i = 0; i < L.length; i++) {
    const m = L[i], q = child(ply + 1, pos, m);
    let v;
    if (i === 0) v = -search(q, d - 1, -b, -a, ply + 1);
    else {
      const red = (d >= 3 && i >= 8) ? 1 : 0;
      v = -search(q, d - 1 - red, -a - 1, -a, ply + 1);
      if (v > a && (red || v < b)) v = -search(q, d - 1, -b, -a, ply + 1);
    }
    if (stop) { rhN--; return best === -Infinity ? 0 : best; }
    if (v > best) { best = v; bm = m; if (v > a) { a = v; if (a >= b) { killers[ply] = m; break; } } }
  }
  rhN--;
  if (SH !== null) { SH.put(key, pos.h2, d, best, best <= a0 ? 2 : best >= b ? 1 : 0, bm, rootSide); return best; }
  if (TT.size > 600000) TT.clear();
  TT.set(key, { h2: pos.h2, d, v: best, f: best <= a0 ? 2 : best >= b ? 1 : 0, m: bm, rs: rootSide });
  return best;
}
function rootValues(pos, d, hist) {
  rootSide = pos.side;
  const A = abCore();
  if (A) { abRoot(A, pos, hist); const k = A.x.ab_values(d); abBack(A); const out = []; for (let i = 0; i < k; i++) out.push({ m: A.aom[i], v: A.aov[i] }); return out; }
  const L = orderMoves(pos, pos.moves(), -1, 0), out = [];
  for (const m of L) {
    const q = pos.clone().play(m);
    loadHist(hist); const v = -search(q, d - 1, -WIN - 1, WIN + 1, 1);
    if (stop) break;
    out.push({ m, v });
  }
  return out.sort((x, y) => y.v - x.v);
}
// Lazy SMP (shared mode): the root's exact result a helper has finished ('mthelp' stores it), when it is at least depth d —
// the lead then goes on from there (a lead on a slower core, e.g. an efficiency core, no longer holds the job up)
function helperDone(pos, L, d) {
  const e = SH.get(pos.h1, pos.h2);
  return e && e.f === 0 && e.d >= d && e.rs === rootSide && L.indexOf(e.m) >= 0 ? { move: e.m, v: e.v, depth: e.d } : null;
}
function bestMove(pos, hist, maxD, ms, nk) {
  rootSide = pos.side;
  nodes = 0; stop = false; tEnd = ms ? Date.now() + ms : Infinity; nodeLimit = nk ? nk * 1000 : Infinity; kreset();
  const L = pos.moves(); if (L.length === 1) return { move: L[0], v: 0, depth: 0 };
  let best = { move: orderMoves(pos, L, -1, 0)[0], v: 0, depth: 0 };
  const A = abCore();
  if (A) { abRoot(A, pos, hist); A.x.ab_best(maxD || 60); abBack(A); return { move: A.io[0], v: A.io[1], depth: A.io[2] }; }
  for (let d = 1; d <= (maxD || 60); d++) {
    let a = -WIN - 1, bm = null, bv = -Infinity;
    const order = orderMoves(pos, L, best.move, 0);
    let hd = null;
    for (const m of order) {
      const q = pos.clone().play(m);
      loadHist(hist); const v = -search(q, d - 1, -WIN - 1, -a, 1);
      if (stop) break;
      if (v > bv) { bv = v; bm = m; if (v > a) a = v; }
      if (SH !== null && (hd = helperDone(pos, L, d)) !== null) break;   // (a helper has finished this depth or a deeper one)
    }
    if (hd !== null) { best = hd; if (hd.depth >= (maxD || 60) || Math.abs(hd.v) > WINT) break; d = hd.depth; continue; }
    if (stop && !bm) break;
    if (bm !== null) best = { move: bm, v: bv, depth: d };
    if (stop) break;
    if (Math.abs(bv) > WINT) break;
  }
  if (SH !== null) { const hd = helperDone(pos, L, best.depth + 1); if (hd !== null) best = hd; }
  return best;
}
const histOf = (start, moves) => { const { hashes } = replay(start, moves); hashes.pop(); return hashes; };
// a losing position: the move that loses slowest; ties broken by the engine's own evaluation (a human-like defence)
function resist(pos, vals) {
  if (!vals.length || vals[0].v > -WINT) return null;
  let best = vals[0];
  for (const e of vals) { if (e.v > best.v) best = e; }
  const same = vals.filter(e => e.v === best.v);
  if (same.length < 2) return best.m;
  let bm = same[0].m, bv = -Infinity;
  for (const e of same) { const v = -evaluate(pos.clone().play(e.m)); if (v > bv) { bv = v; bm = e.m; } }
  return bm;
}
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
    if (vals[0].v > WINT) return { move: vals[0].m, v: vals[0].v };     // a win in sight is never missed
    if (pos.phase() === 'move') {
      // a beginner looks at a few pieces only (but always sees a capture threat against itself — the noise does the rest)
      if (L.look) { const fr = [...new Set(vals.map(e => mFrom(e.m)))]; if (fr.length > L.look) {
        for (let i = fr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [fr[i], fr[j]] = [fr[j], fr[i]]; }
        const keep = new Set(fr.slice(0, L.look)); const v2 = vals.filter(e => keep.has(mFrom(e.m))); if (v2.length) vals = v2; } }
      // no going round in circles
      const seen = new Set(hist.concat([pos.h1 + ':' + pos.h2])); const fresh = vals.filter(e => { const q = pos.clone().play(e.m); return !seen.has(q.h1 + ':' + q.h2); }); if (fresh.length) vals = fresh;
    }
    vals.sort((x, y) => y.v - x.v);
    const rs = resist(pos, vals); if (rs !== null) return { move: rs, v: vals[0].v };
    if (L.blunder && rand() < L.blunder) {
      const ok = vals.filter(e => e.v > vals[0].v - 400 && e.v > -WINT); const pool = ok.length > 1 ? ok : vals;
      return { move: pool[Math.floor(rand() * pool.length)].m, v: vals[0].v };
    }
    let best = vals[0].m, bv = -Infinity;
    for (const e of vals) { const x = e.v + (Math.abs(e.v) > WINT ? 0 : gauss(rand) * L.noise); if (x > bv) { bv = x; best = e.m; } }
    return { move: best, v: vals[0].v };
  }
  const r = bestMove(pos, hist, L.dx || 60, L.ms || 3000, L.nk || 0);
  return thinkFin(pos, hist, r);
}
// the strong steps' answer from the search's result (also the end of a search on several threads, shared/mtsplit.js)
function thinkFin(pos, hist, r) {
  if (r.v < -WINT) {   // lost anyway: resist as long as possible
    rootSide = pos.side; nodes = 0; stop = false; tEnd = Date.now() + 600; nodeLimit = Infinity;
    const vals = rootValues(pos, Math.max(2, Math.min(4, r.depth)), hist); const rs = resist(pos, vals); if (rs !== null) return { move: rs, v: r.v, depth: r.depth };
  }
  return { move: r.move, v: r.v, depth: r.depth };
}
const kindOf = v => Math.abs(v) > WINT ? 'exact' : 'heur';
function analyze(start, moves, ms, onProgress, rule) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves), hist = histOf(start, moves);
  nodes = 0; stop = false; tEnd = Date.now() + (ms || 1000); nodeLimit = Infinity;
  let list = [], depth = 0;
  const total = pos.moves().length;
  for (let d = 1; d <= 30; d++) {
    const vals = rootValues(pos, d, hist);
    if (stop && vals.length < total) break;
    list = vals.map(e => ({ ...e, kind: kindOf(e.v) })); depth = d;
    if (onProgress) onProgress(list, d);
    if (stop) break;
    if (list.length && Math.abs(list[0].v) > WINT && d > 2) break;
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
    const { pos, hashes } = replay(start, line);
    if (judge(pos, hashes).over) break;
    const b = bestMove(pos, hashes.slice(0, -1), 4, 60, 0);
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
  const line = m.line || [], root = replay(m.start, m.moves).pos, { pos, hashes } = replay(m.start, m.moves.concat(line)); hashes.pop();
  rootSide = root.side;
  return { pos, hist: hashes, ply: line.length };
}
// Lazy SMP on the shared table for a 'think' (time / depth only: with a node budget the threads split the tree, so that the
// budget is all the threads' together); m.lazy (0 / 1) overrides the game's choice (the bench compares both)
const lazyOf = (m, L, dflt) => SH !== null && !L.nk && (L.ms || L.dx) ? (m.lazy !== undefined ? !!m.lazy : dflt) : false;
function mtPlan(m) {
  const { pos } = replay(m.start, m.moves), all = pos.moves(), inf = WIN + 1;
  rootSide = pos.side;
  if (m.job === 'think') {
    const L = m.cfg || LEVELS[m.level] || LEVELS[10];
    if (all.length < 2 || !L.s) { PRO_CFG = m.cfg || null; try { return { result: think(m.start, m.moves, m.level) }; } finally { PRO_CFG = null; } }
    return { plan: { kind: 'best', moves: orderMoves(pos, all, -1, 0), inf, maxD: L.dx || 60, ms: L.ms || 3000, nodes: L.nk ? L.nk * 1000 : 0, win: WINT, lmr: { d: 3, i: 8 }, splitMin: 5, helpMin: 4, lazy: lazyOf(m, L, false) } };   // (Young Brothers Wait on the shared table — on the user's Mac 8 threads ×3.3 vs Lazy SMP ×1.2, 2026-11-09; lazy: Lazy SMP, for the bench; helpMin: the idle workers help only tasks of depth 5 or more — shared/mtsplit.js, 2026-11-10)
  }
  if (!all.length) return { result: { list: [], depth: 0 } };
  const cands = m.job === 'cands';
  return { plan: { kind: 'all', moves: orderMoves(pos, all, -1, 0), inf, maxD: 30, ms: m.time || (cands ? 1200 : 1000), win: WINT, stopTop: 2, progress: true, pv: cands ? m.plies || 7 : 0, pvK: m.k || 5 } };
}
function mtV(m) {
  const { pos, hist, ply } = mtNode(m);
  nodes = 0; stop = false; tEnd = m.until || Infinity; nodeLimit = m.nl || Infinity;
  loadHist(hist);
  const v = search(pos, m.d, m.wa, m.wb, ply);
  return { v, ok: !stop, nodes };
}
function mtKids(m) {
  const { pos, hist, ply } = mtNode(m);
  loadHist(hist);
  if (terminal(pos, ply) !== null || (ply > 0 && seenBefore(pos.h1, pos.h2))) return { kids: [] };
  const e = ttGet(pos);
  return { kids: orderMoves(pos, pos.moves(), e && e.h2 === pos.h2 && e.rs === rootSide ? e.m : -1, ply).map(x => ({ m: x, s: -1 })) };
}
function mtLazy(m) {   // (shared/tools/mtlazy.js: one Lazy SMP thread's search of the root to depth m.d, root order rotated by m.rot)
  const { pos, hist } = mtNode(m);
  nodes = 0; stop = false; tEnd = m.until || Infinity; nodeLimit = Infinity; loadHist(hist);
  const e = ttGet(pos);
  let L = orderMoves(pos, pos.moves(), e && e.h2 === pos.h2 ? e.m : -1, 0);
  if (m.rot) { const k = m.rot % L.length; L = L.slice(k).concat(L.slice(0, k)); }
  let a = -WIN - 1, best = -Infinity, bm = L[0];
  RH1[rhN] = pos.h1; RH2[rhN] = pos.h2; rhN++;
  for (let i = 0; i < L.length; i++) {
    const q = pos.clone().play(L[i]);
    let v = i === 0 ? -search(q, m.d - 1, -WIN - 1, -a, 1) : -search(q, m.d - 1, -a - 1, -a, 1);
    if (i > 0 && v > a) v = -search(q, m.d - 1, -WIN - 1, -a, 1);
    if (v > best) { best = v; bm = L[i]; if (v > a) a = v; }
  }
  rhN--;
  if (SH !== null && !stop) SH.put(pos.h1, pos.h2, m.d, best, 0, bm, rootSide);
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
  if (m.job === 'think') { const { pos } = replay(m.start, m.moves); return { result: thinkFin(pos, histOf(m.start, m.moves), { move: r.m, v: r.v, depth: r.depth }) }; }
  let list = (r.list || []).map(e => Object.assign({ m: e.m, v: e.v, kind: kindOf(e.v) }, e.pv ? { pv: e.pv } : {}));
  if (!list.length) { const { pos } = replay(m.start, m.moves); list = pos.moves().map(x => ({ m: x, v: 0, kind: 'heur' })); }
  if (m.job === 'cands') list = list.slice(0, m.k || 5);
  return { result: { list, depth: r.depth } };
}
// ---------------------------------------------------------------- puzzles: the side to move wins (judge) within n moves
// of its own whatever the opponent does. Lower bound: queen steps to the throne + guards missing from the inner ring.
let duelBudget = Infinity;
const DTT = new Map();
function need(pos, p) {
  let s = 0; const q = pos.queen(p);
  if (!pos.onThrone(p)) s += q < 0 ? 1 : pos.cap[q] ? 2 : RING[q];
  s += 6 - pos.ringCount(p);
  return s;
}
function duelW(pos, k, me) {
  if (need(pos, me) > k) return false;
  if (--duelBudget < 0) return false;
  const key = pos.h1 + ':' + pos.h2 + ':' + k + 'w';
  const c = DTT.get(key); if (c !== undefined) return c;
  let res = false;
  const ms = orderMoves(pos, pos.moves(), -1, 0);
  for (const m of ms) {
    const q = pos.clone().play(m);
    if (need(q, me) > k - 1) continue;
    const r = judge(q);
    if (r.over) { if (r.winner === me) { res = true; break; } continue; }
    if (duelB(q, k - 1, me)) { res = true; break; }
    if (duelBudget < 0) break;
  }
  if (duelBudget >= 0) DTT.set(key, res);
  return res;
}
function duelB(pos, k, me) {
  if (--duelBudget < 0) return false;
  if (k <= 0) return false;
  const key = pos.h1 + ':' + pos.h2 + ':' + k + 'b';
  const c = DTT.get(key); if (c !== undefined) return c;
  const ms = orderMoves(pos, pos.moves(), -1, 0);
  let res = true;
  for (const m of ms) {
    const q = pos.clone().play(m);
    const r = judge(q);
    if (r.over) { if (r.winner === me) continue; res = false; break; }
    if (!duelW(q, k, me)) { res = false; break; }
    if (duelBudget < 0) { res = false; break; }
  }
  if (duelBudget >= 0) DTT.set(key, res);
  return res;
}
function duelGood(start, moves, n, rule, budget) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves), me = pos.turn, out = [];
  DTT.clear(); duelBudget = budget || 4e6;
  for (const m of pos.moves()) {
    const q = pos.clone().play(m);
    if (need(q, me) > n - 1) continue;
    const r = judge(q);
    if (r.over ? r.winner === me : duelB(q, n - 1, me)) out.push(m);
    if (duelBudget < 0) { duelBudget = Infinity; return null; }
  }
  duelBudget = Infinity;
  return out;
}
function duelMin(start, moves, max, rule, budget) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves), me = pos.turn;
  DTT.clear(); duelBudget = budget || 4e6;
  for (let n = Math.max(1, need(pos, me)); n <= (max || 5); n++) { if (duelW(pos, n, me)) { duelBudget = Infinity; return n; } if (duelBudget < 0) break; }
  duelBudget = Infinity;
  return -1;
}
// the defender's most stubborn reply; ties: the one the engine likes best
function duelReply(start, moves, n, rule) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves), opp = pos.turn, me = 3 - opp;
  let best = null, bk = -1, bv = -Infinity;
  DTT.clear(); duelBudget = 4e6;
  for (const m of pos.moves()) {
    const q = pos.clone().play(m), r = judge(q);
    let k;
    if (r.over) k = r.winner === me ? 0 : 99;
    else { k = 99; for (let j = 1; j <= n; j++) if (duelW(q, j, me)) { k = j; break; } }
    const ev = -evaluate(q);
    if (k > bk || (k === bk && ev > bv)) { bk = k; bv = ev; best = m; }
  }
  duelBudget = Infinity;
  return { move: best, need: bk };
}

loadCore();
setRule('std');
const API = { get coreArrays() { return WA ? { geo: Array.from(WA.geo), zt: Array.from(WA.zt) } : null; }, useCore: (x, buf) => { MX = x ? coreViews(x, buf) : null; if (MX) { MX.threads = 1; MX.jobThreads = 1; } }, get wasm() { return !!WA; }, get nodes() { return nodes; }, set SH(t) { SH = t; }, get SH() { return SH; }, mtLazy, P1, P2, WIN, WINT, PASS, RES, N, RULES, RULE_ORDER, setRule, get rule() { return RK; }, get R() { return R; },
  Q, RR, RING, XC, YC, ROWS, RINGL, RPOS, NB, DIRS, CENTER, INNER, OUTER, START, at, sqName, sqParse, mv, mFrom, mTo, own, isQ,
  Pos, path, isJump, name, parse, replay, judge, kindOfMove, LEVELS, think, analyze, cands, duelGood, duelMin, duelReply, need,
  evaluate, hanging, kindOf, resist, mtPlan, mtV, mtKids, mtFin, pvOf };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof self !== 'undefined' && typeof importScripts === 'function' && typeof window === 'undefined') {
  let queueP = Promise.resolve();
  // ?…&mt=1: the lead of the threads (shared/mtengine.js): core_mt.wasm on the shared memory sent with the first message ('mtinit')
  if (/[?&]mt=1\b/.test(self.location.search || '')) {
    queueP = new Promise(res => self.addEventListener('message', function f(e) { if (e.data && e.data.type === 'mtinit') { self.removeEventListener('message', f); res(e.data); } }))
      .then(m => {
        const x = new WebAssembly.Instance(m.module, { env: { memory: m.mem, now: () => Date.now() } }).exports;
        x.mt_stack(m.top); x.mt_thread(m.tls, 0);
        MX = coreViews(x, m.mem.buffer); MX.threads = navigator.hardwareConcurrency || 2;
        self.postMessage({ type: 'mtready' });
      }).catch(err => { MX = null; self.postMessage({ type: 'mtready', error: String(err && err.message || err) }); });
  }
  self.onmessage = e => {
    const m = e.data;
    if (m && m.type === 'mtinit') return;
    if (m && m.type === 'mtshare') { try { importScripts(m.lib); SH = self.MTTT.attach(m); } catch (err) { SH = null; } return; }   // (shared/mtsplit.js shared mode)
    queueP = queueP.then(() => {
      try {
        if (SH !== null) SH.begin(m);
        if (MX) MX.jobThreads = m.mtThreads > 0 ? Math.min(m.mtThreads, MX.threads) : 0;   // (the threads of this job: the exact one-thread table with 1)
        setRule(m.rule || 'std');
        if (SH !== null) SH.salt = SALT[RK] | 0;   // (every task on the shared table, the Lazy SMP lead's 'think' too)
        if (m.type === 'think') self.postMessage({ id: m.id, type: 'result', ...(() => { PRO_CFG = m.cfg || null; try { return Object.assign(think(m.start, m.moves, m.level), MX ? { nodes } : {}); } finally { PRO_CFG = null; } })() });   // (nodes: the lead's — the page adds the helpers')
        else if (m.type === 'analyze') {
          const r = analyze(m.start, m.moves, m.time || 1000, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth }));
          self.postMessage({ id: m.id, type: 'result', ...r, ...(MX ? { nodes } : {}) });
        } else if (m.type === 'cands') self.postMessage({ id: m.id, type: 'result', ...(MX ? { nodes } : {}), ...cands(m.start, m.moves, m.time || 1200, m.k, m.plies, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth })) });
        else if (m.type === 'duel') { const g = duelGood(m.start, m.moves, m.n); self.postMessage({ id: m.id, type: 'result', list: g ? g.map(x => ({ m: x, need: m.n })) : null }); }
        else if (m.type === 'duelReply') self.postMessage({ id: m.id, type: 'result', ...duelReply(m.start, m.moves, m.n) });
        else if (m.type === 'newgame') { ttClear(); self.postMessage({ id: m.id, type: 'result' }); }
        else if (m.type === 'mtplan') self.postMessage({ id: m.id, type: 'result', ...mtPlan(m) });
        else if (m.type === 'mtv') self.postMessage({ id: m.id, type: 'result', ...mtV(m) });
        else if (m.type === 'mtkids') self.postMessage({ id: m.id, type: 'result', ...mtKids(m) });
        else if (m.type === 'mtpv') self.postMessage({ id: m.id, type: 'result', pv: pvOf(m.start, m.moves, m.m, m.plies) });
        else if (m.type === 'mtlead') self.postMessage({ id: m.id, type: 'result', ...(() => { PRO_CFG = m.cfg || null; try { const r = think(m.start, m.moves, m.level); return Object.assign({}, r, { nodes }); } finally { PRO_CFG = null; } })() });   // (Lazy SMP: the job as one thread plays it, on the shared table)
        else if (m.type === 'mthelp') self.postMessage({ id: m.id, type: 'result', ...mtHelp(m) });
        else if (m.type === 'mtfin') { const f = mtFin(m); if (f.result) f.result.core = WA ? 'wasm' : 'js'; self.postMessage({ id: m.id, type: 'result', ...f }); }   // (core: the search core of the threads, shown by bench.html)
      } catch (err) { self.postMessage({ id: m.id, type: 'result', error: String(err && err.stack || err) }); }
    });
  };
}
if (typeof window !== 'undefined') window.AgonEngine = API;
})();

// Ludus latrunculorum (the Roman "game of little soldiers") — rules (for the page) and the AI worker (plain JS search).
// Works as a Web Worker (postMessage API), as a plain <script> (window.LatrEngine) and as a Node module.
//
// The ancient rules are lost; every rule set here is a modern reconstruction (claude/latrunculi-spec.md has the sources):
//   seneca   — U. Schädler's reconstruction as published by the Locus Ludi project ("Seneca variant"): an empty 8×8 board,
//              the counters are placed one by one, then move one step orthogonally or leap over their own counters; a
//              counter enclosed by two enemies is not taken at once but blocked (incitus / alligatus) and removed at the
//              start of the capturer's next turn — unless one of the two enclosing counters is itself blocked first.
//   piso     — Locus Ludi "Piso variant": the same board and placement, one step only, enclosed counters leave at once.
//   quintana — Museum Quintana (Künzing): 16 counters in two rows each, rook moves, enclosed counters leave at once.
// Board: 8×8, index = r * 8 + c, r = 0 is the top rank (8), c = 0 is file a. P1 = Black (moves first), P2 = White.
// Moves: m = from + 64 * to + 4096 * (rm + 1).  A placement has from === to.  rm = the blocked enemy counter removed
// before the move (seneca only, -1 → 0 = none).  A turn that only removes (no counter can move) has from === to === rm.
(function () {
'use strict';
const P1 = 1, P2 = 2;
const WIN = 30000, WINT = 29000;
const N = 8, NN = 64;
// ---------------------------------------------------------------- rule sets
// place: counters each side places first (0 = fixed start) / rook: slide like a rook (else one step) / leap: leaps over
// own counters / delay: blocked first, removed next turn / corner: a corner counter falls to the two squares beside it /
// stuck: 'cap' = the side with more captures wins when a player cannot move, 'lose' = that player loses
const RULES = {
  seneca: { place: 20, rook: false, leap: true, delay: true, corner: true, stuck: 'cap' },
  piso: { place: 20, rook: false, leap: false, delay: false, corner: true, stuck: 'cap' },
  quintana: { place: 0, rook: true, leap: false, delay: false, corner: false, stuck: 'lose', tie: 'adv' },   // tie: equal captures at the end → more counters in the opponent's half wins, still equal → White (2026-11-19, see advTie)
};
const RULE_ORDER = ['seneca', 'piso', 'quintana'];
const QUIET_MAX = 60;
const TIE_W = +((typeof process !== 'undefined' && process.env && process.env.LT_TIEW) || 60);   // (quintana's tie rule in the evaluation)                 // plies without a capture that end the game (this program's own rule)
let R = RULES.seneca, RK = 'seneca', COUNT = 20;
const RC = [], ADJ = [], DIRS = [-8, 8, -1, 1];
const NB = [];                        // NB[i][d] = neighbour of i in direction d (0 up, 1 down, 2 left, 3 right) or -1
const CORNER = new Int8Array(NN).fill(-1);   // corner index 0..3 or -1
const CADJ = [[1, 8], [6, 15], [48, 57], [55, 62]], CSQ = [0, 7, 56, 63];
for (let i = 0; i < NN; i++) {
  const r = i >> 3, c = i & 7; RC.push([r, c]);
  NB.push([r > 0 ? i - 8 : -1, r < 7 ? i + 8 : -1, c > 0 ? i - 1 : -1, c < 7 ? i + 1 : -1]);
  ADJ.push(NB[i].filter(x => x >= 0));
}
CSQ.forEach((s, k) => { CORNER[s] = k; });
const OPP = [1, 0, 3, 2];
function setRule(k, count) {
  const key = String(k || 'seneca').split(':');
  RK = RULES[key[0]] ? key[0] : 'seneca'; R = RULES[RK];
  W = TUNED[RK] || W0;
  const n = +(count || key[1]) || 0;
  COUNT = R.place ? ([16, 20, 24].includes(n) ? n : R.place) : 16;
  waRule();
}
const ruleKey = () => RK + (R.place && COUNT !== R.place ? ':' + COUNT : '');
// ---------------------------------------------------------------- zobrist
let seed = 0x1f2e3d4c;
function rnd() { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed; }
const Z1 = [], Z2 = [];               // [piece state 0..7][square]: state = (owner-1) + 2 * inc (inc 0..3)
for (let k = 0; k < 8; k++) { const a = new Uint32Array(NN), b = new Uint32Array(NN); for (let i = 0; i < NN; i++) { a[i] = rnd(); b[i] = rnd(); } Z1.push(a); Z2.push(b); }
const ZS1 = rnd(), ZS2 = rnd();
const ZH1 = [], ZH2 = [], ZL1 = [], ZL2 = [];
for (let k = 0; k < 2; k++) {
  const a = new Uint32Array(32), b = new Uint32Array(32); for (let i = 0; i < 32; i++) { a[i] = rnd(); b[i] = rnd(); } ZH1.push(a); ZH2.push(b);
  const c = new Uint32Array(4097), d = new Uint32Array(4097); for (let i = 0; i < 4097; i++) { c[i] = rnd(); d[i] = rnd(); } ZL1.push(c); ZL2.push(d);
}
// ---------------------------------------------------------------- squares and moves
const sqAt = (r, c) => r * 8 + c;
const sqName = i => 'abcdefgh'[i & 7] + (8 - (i >> 3));
const mv = (f, t, rm) => f + 64 * t + 4096 * ((rm == null ? -1 : rm) + 1);
const mFrom = m => m & 63, mTo = m => (m >> 6) & 63, mRm = m => (m >> 12) - 1;
const isPlace = (pos, m) => pos.placing && mFrom(m) === mTo(m);
const isRemoveOnly = m => mFrom(m) === mTo(m) && mRm(m) === mFrom(m);

// ---------------------------------------------------------------- the WebAssembly core (core.c → core-wasm.js, tools/build-core.sh; 2026-11-20)
// The rules, search() / quiesce() / evaluate() and the root loops of bestMove / rootValues run in core.c — the same moves, order,
// table, counters and values (tools/check_wasm.js: node for node; tools/check_rules.js: the rules on random positions), several
// times faster. Loaded synchronously in a worker and in Node; the page itself and any failure use the JS below (LT_NOWASM=1 in Node).
// MX: the lead of the threads (?mt=1, shared/mtengine.js) on core_mt.wasm (Praline's Young Brothers Wait, shared/praline/).
let WA = null, MX = null;
function loadCore() {
  try {
    let b64 = null;
    if (typeof self !== 'undefined' && typeof importScripts === 'function' && typeof window === 'undefined') { importScripts('core-wasm.js?v=1'); b64 = self.LT_WASM; }
    else if (typeof module !== 'undefined' && module.exports && typeof require === 'function') { const g = globalThis, had = 'self' in g, old = g.self; g.self = g; try { require(require('path').join(__dirname, 'core-wasm.js')); b64 = g.LT_WASM; } finally { if (had) g.self = old; else delete g.self; } }
    if (!b64 || (typeof process !== 'undefined' && process.env && process.env.LT_NOWASM)) return;
    // the SIMD build first; the one without SIMD where that does not compile (LT_NOSIMD=1 in Node to check it)
    const g = typeof self !== 'undefined' ? self : globalThis, list = [b64, g.LT_WASM0];
    if (typeof process !== 'undefined' && process.env && process.env.LT_NOSIMD) list.shift();
    for (const s of list) {
      if (!s) continue;
      try {
        const bin = typeof atob === 'function' ? Uint8Array.from(atob(s), c => c.charCodeAt(0)) : Buffer.from(s, 'base64');
        let io = null;
        const env = {
          poll: () => (Date.now() > tEnd || (SH !== null && SH.stopped())) ? 1 : 0,
          shget: (h1, h2) => { const e = SH.get(h1 >>> 0, h2 >>> 0); if (!e) return 0; io[0] = e.d; io[1] = e.f; io[2] = e.v; io[3] = e.m; return 1; },
          shput: (h1, h2, d, v, f, m) => { SH.put(h1 >>> 0, h2 >>> 0, d, v, f, m, 0); },
          now: () => Date.now(),
        };
        const x = new WebAssembly.Instance(new WebAssembly.Module(bin), { env }).exports;
        io = new Int32Array(x.memory.buffer, x.iop(), 32);
        WA = coreViews(x, x.memory.buffer, io); WA.simd = s === b64; return;
      } catch (e) { WA = null; }
    }
  } catch (e) { WA = null; }
}
function coreViews(x, buf, io) {
  const C = { x, io: io || new Int32Array(buf, x.iop(), 32), sq: new Int8Array(buf, x.sqp(), 64), inc: new Int8Array(buf, x.incp(), 64), zt: new Uint32Array(buf, x.ztp(), 1154 + 4 * 4097),
    wt: new Float64Array(buf, x.wtp(), 32), lmr: new Uint8Array(buf, x.lmrp(), 64 * 1024), aom: new Int32Array(buf, x.aomp(), 2048), aov: new Int32Array(buf, x.aovp(), 2048), raw: new Uint8Array(buf, x.netrawp(), 2 * (366 * 256 + 768) + 28) };
  const zt = C.zt;
  for (let k = 0; k < 8; k++) for (let i = 0; i < NN; i++) { zt[k * 64 + i] = Z1[k][i]; zt[512 + k * 64 + i] = Z2[k][i]; }
  zt[1024] = ZS1; zt[1025] = ZS2;
  for (let k = 0; k < 2; k++) { for (let h = 0; h < 32; h++) { zt[1026 + k * 32 + h] = ZH1[k][h]; zt[1090 + k * 32 + h] = ZH2[k][h]; } for (let l = 0; l < 4097; l++) { zt[1154 + k * 4097 + l] = ZL1[k][l]; zt[1154 + 8194 + k * 4097 + l] = ZL2[k][l]; } }
  C.netRule = null;
  return C;
}
function waRule() {   // (setRule / setW / setOpt: the rule, the weights, the options, the reductions and the net of the rule)
  for (const C of [WA, MX]) {
    if (!C) continue;
    C.x.setup(R.rook ? 1 : 0, R.leap ? 1 : 0, R.delay ? 1 : 0, R.corner ? 1 : 0, R.tie ? 1 : 0, R.stuck === 'lose' ? 1 : 0, ADV_KOMI, TIE_W);
    C.x.setopt(NULLMOVE ? 1 : 0, QS_STANDPAT ? 1 : 0, ASP);
    C.wt.set(W); C.lmr.set(LMRT);
    const nb = NET_ON ? NETB[RK] : null, key = nb ? RK : null;
    if (C.netRule !== key || C.netBytes !== nb) { if (nb) { C.raw.set(nb.subarray(0, Math.min(nb.length, C.raw.length))); C.x.net_load(nb.length); } else C.x.net_load(0); C.netRule = key; C.netBytes = nb; }
  }
}
function toCore(C, pos) {
  C.sq.set(pos.sq); C.inc.set(pos.inc); const io = C.io;
  io[8] = pos.side; io[9] = pos.ply; io[10] = pos.h1 | 0; io[11] = pos.h2 | 0; io[12] = pos.hand[0]; io[13] = pos.hand[1];
  io[14] = pos.cap[0]; io[15] = pos.cap[1]; io[16] = pos.last[0]; io[17] = pos.last[1]; io[18] = pos.quiet;
}
const abCore = () => SH !== null ? null : MX || WA;
function abRoot(A, pos) {
  toCore(A, pos);
  A.x.setn(nodes, nodeLimit === Infinity ? 1e300 : nodeLimit, 0);
  if (A === MX) { A.x.set_tend(tEnd); A.x.ab_threads(MX.jobThreads || MX.threads || 1); }
}
function abBack(A) { nodes = A.x.getn(); if (A.x.stopped()) stop = true; }

// ---------------------------------------------------------------- the learned evaluation (NNUE, tools/nnue/; 2026-11-20)
// NETS[rule] = the file name of the rule's net in nets/ (its version). Empty: the hand-made evaluation below, as before. A net
// that has passed its checks (tools/nnue/README.md) is put in nets/ and named here — nothing else changes. The format and the
// inputs: core.c「the net」; JS evaluates the same integers (netEvalJS) where there is no WebAssembly.
const NETS = { seneca: '', piso: '', quintana: '' };
const NETB = {};          // rule → the net's bytes (loaded)
let NET_ON = true;        // (tools: off = the hand-made evaluation even with a net)
let NETJ = null, NETJR = null;   // the JS copy of the current rule's net
function netParse(b) {
  if (!b || b.length < 20 || b[0] !== 76 || b[1] !== 84 || b[2] !== 78 || b[3] !== 49) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength), H = dv.getInt32(4, true), IN = dv.getInt32(8, true), K = dv.getInt32(12, true), FL = dv.getInt32(16, true);
  if (IN !== 366 || H < 8 || H > 256 || (H & 7) || b.length < 20 + 2 * (IN * H + 3 * H) + 4) return null;
  let o = 20; const rd = n => { const a = new Int16Array(n); for (let i = 0; i < n; i++, o += 2) a[i] = dv.getInt16(o, true); return a; };
  const W1 = rd(IN * H), B1 = rd(H), W2 = rd(2 * H), B2 = dv.getInt32(o, true);
  return { H, K, FL, W1, B1, W2, B2 };
}
function setNet(rule, bytes) { if (bytes) NETB[rule] = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes); else delete NETB[rule]; NETJR = null; waRule(); }
function netNow() { if (!NET_ON || !NETB[RK]) return null; if (NETJR !== NETB[RK]) { NETJ = netParse(NETB[RK]); NETJR = NETB[RK]; } return NETJ; }
// the net's value of pos for the side to move (the same integers as core.c netEval on a fresh accumulator; with FL & 1 it is added
// to the hand-made evaluation)
function netEvalJS(pos, N) {
  const H = N.H, acc = [new Int32Array(H), new Int32Array(H)], hc = x => x > 24 ? 24 : x < 0 ? 0 : x;
  for (let v = 0; v < 2; v++) {
    const a = acc[v]; for (let i = 0; i < H; i++) a[i] = N.B1[i];
    const add = f => { const o = f * H; for (let i = 0; i < H; i++) a[i] += N.W1[o + i]; };
    for (let s = 0; s < NN; s++) { const x = pos.sq[s]; if (x) add(((x - 1 === v ? 0 : 2) + (pos.inc[s] ? 1 : 0)) * 64 + (v ? s ^ 56 : s)); }
    add(256 + hc(pos.hand[v])); add(281 + hc(pos.hand[v ^ 1])); add(306 + hc(pos.cap[v])); add(331 + hc(pos.cap[v ^ 1])); add(356 + Math.min(9, Math.floor(pos.quiet / 6)));
  }
  let s = 0;
  for (let k = 0; k < 2; k++) { const a = acc[k ? pos.side ^ 1 : pos.side]; for (let i = 0; i < H; i++) { const c = a[i] < 0 ? 0 : a[i] > 127 ? 127 : a[i]; s = (s + ((c * c) >> 6) * N.W2[k * H + i]) | 0; } }
  return Math.trunc((s + N.B2) * N.K * 64 / (127 * 127 * 64));
}

let LEAP_STAMP = 0; const LEAP_SEEN = new Int32Array(NN), LEAP_OUT = new Int32Array(NN), LEAP_STK = new Int8Array(NN + 4);
class Pos {
  constructor() {
    this.sq = new Int8Array(NN); this.inc = new Int8Array(NN);
    this.hand = [0, 0]; this.cap = [0, 0]; this.last = [-1, -1];
    this.side = 0; this.ply = 0; this.quiet = 0; this.n = [0, 0]; this.reset();
  }
  reset() {
    this.sq.fill(0); this.inc.fill(0); this.cap = [0, 0]; this.last = [-1, -1]; this.side = 0; this.ply = 0; this.quiet = 0;
    if (R.place) this.hand = [COUNT, COUNT];
    else { this.hand = [0, 0]; for (let c = 0; c < 8; c++) { this.sq[c] = this.sq[8 + c] = P2; this.sq[48 + c] = this.sq[56 + c] = P1; } }
    this.rehash();
  }
  // spec: { b: 64 chars ('.' empty, 'b' 'w' free counters; blocked Black 'h' 'v' 'c', blocked White 'H' 'V' 'C' — the
  //         axis of the two enclosing counters: horizontal, vertical, corner), side: 1 | 2, hand: [n1, n2], cap: [n1, n2],
  //         last: [m1, m2], n: plies played, q: plies without a capture } or null (the start)
  static from(spec) {
    const p = new Pos();
    if (spec && spec.b) {
      p.sq.fill(0); p.inc.fill(0);
      for (let i = 0; i < NN; i++) {
        const ch = spec.b[i], k = 'bwhvcHVC'.indexOf(ch);
        if (k < 0) continue;
        p.sq[i] = k === 0 || (k >= 2 && k <= 4) ? P1 : P2;
        p.inc[i] = k < 2 ? 0 : ((k - 2) % 3) + 1;
      }
      p.side = spec.side === P2 ? 1 : 0;
      p.hand = spec.hand ? spec.hand.slice(0, 2) : [0, 0];
      p.cap = spec.cap ? spec.cap.slice(0, 2) : [0, 0];
      p.last = spec.last ? spec.last.slice(0, 2) : [-1, -1];
      p.ply = spec.n != null ? spec.n | 0 : 0; p.quiet = spec.q | 0;
      p.rehash();
    }
    return p;
  }
  clone() {
    const q = Object.create(Pos.prototype);
    q.sq = this.sq.slice(); q.inc = this.inc.slice(); q.hand = [this.hand[0], this.hand[1]]; q.cap = [this.cap[0], this.cap[1]];
    q.last = [this.last[0], this.last[1]]; q.side = this.side; q.ply = this.ply; q.quiet = this.quiet; q.h1 = this.h1; q.h2 = this.h2;
    q.n = [this.n[0], this.n[1]];
    return q;
  }
  rehash() {
    this.n = [0, 0]; for (let i = 0; i < NN; i++) if (this.sq[i]) this.n[this.sq[i] - 1]++;
    let a = 0, c = 0;
    for (let i = 0; i < NN; i++) { const x = this.sq[i]; if (x) { const k = x - 1 + 2 * this.inc[i]; a ^= Z1[k][i]; c ^= Z2[k][i]; } }
    if (this.side) { a ^= ZS1; c ^= ZS2; }
    for (let k = 0; k < 2; k++) { a ^= ZH1[k][this.hand[k]] ^ ZL1[k][this.last[k] + 1]; c ^= ZH2[k][this.hand[k]] ^ ZL2[k][this.last[k] + 1]; }
    this.h1 = a >>> 0; this.h2 = c >>> 0;
  }
  // the page's piece kinds: 0 empty, 1 = P1, 3 = P2
  at(i) { const x = this.sq[i]; return x === 1 ? 1 : x === 2 ? 3 : 0; }
  owner(i) { return this.sq[i]; }
  blocked(i) { return this.inc[i] !== 0; }
  get turn() { return this.side ? P2 : P1; }
  get placing() { return this.hand[0] + this.hand[1] > 0; }
  get opening() { return this.placing; }
  count(p) { return this.n[p - 1]; }
  free(p) { let n = 0; for (let i = 0; i < NN; i++) if (this.sq[i] === p && !this.inc[i]) n++; return n; }
  // the two enclosing squares of a blocked counter
  holders(i) {
    const a = this.inc[i];
    if (a === 1) return [i - 1, i + 1];
    if (a === 2) return [i - 8, i + 8];
    if (a === 3) return CADJ[CORNER[i]];
    return [];
  }
  // blocked enemy counters the player to move must remove one of (seneca)
  removable() {
    const out = [], o = 2 - this.side;
    if (!R.delay || this.placing) return out;
    for (let i = 0; i < NN; i++) if (this.sq[i] === o && this.inc[i]) out.push(i);
    return out;
  }
  // destinations of the counter on f (the board as it is; no "back and forth" filter)
  dests(f, out) {
    const sq = this.sq, p = sq[f];
    if (R.rook) {
      for (let d = 0; d < 4; d++) for (let t = NB[f][d]; t >= 0 && !sq[t]; t = NB[t][d]) out.push(t);
      return out;
    }
    for (let d = 0; d < 4; d++) { const t = NB[f][d]; if (t >= 0 && !sq[t]) out.push(t); }
    if (R.leap) {
      if (++LEAP_STAMP > 0x7ffffff0) { LEAP_STAMP = 1; LEAP_SEEN.fill(0); LEAP_OUT.fill(0); }   // (the Int32 marks must not overflow: an endless loop after ~2^31 calls)
      const stamp = LEAP_STAMP; LEAP_SEEN[f] = stamp; let sp = 0; LEAP_STK[sp++] = f;
      for (const t of out) LEAP_OUT[t] = stamp;
      while (sp) {
        const a = LEAP_STK[--sp];
        for (let d = 0; d < 4; d++) {
          const o = NB[a][d]; if (o < 0 || sq[o] !== p) continue;
          const t = NB[o][d]; if (t < 0 || (sq[t] && t !== f) || LEAP_SEEN[t] === stamp) continue;
          LEAP_SEEN[t] = stamp; LEAP_STK[sp++] = t;
          if (LEAP_OUT[t] !== stamp) { LEAP_OUT[t] = stamp; out.push(t); }
        }
      }
    }
    return out;
  }
  // a way to leap from f to t (list of squares f … t) or null when t is a plain step / not reachable by leaps
  leapPath(f, t) {
    if (!R.leap) return null;
    const sq = this.sq, p = sq[f], prev = new Map([[f, -1]]), queue = [f];
    while (queue.length) {
      const a = queue.shift();
      for (let d = 0; d < 4; d++) {
        const o = NB[a][d]; if (o < 0 || sq[o] !== p) continue;
        const x = NB[o][d]; if (x < 0 || (sq[x] && x !== f) || prev.has(x)) continue;
        prev.set(x, a); queue.push(x);
        if (x === t) { const path = [t]; for (let y = a; y >= 0; y = prev.get(y)) path.unshift(y); return path; }
      }
    }
    return null;
  }
  movesAfter(rm, out) {
    const sq = this.sq, p = this.side + 1, lastM = this.last[this.side], lf = lastM >= 0 ? mTo(lastM) : -1, lt = lastM >= 0 ? mFrom(lastM) : -1;
    const tmp = [];
    for (let f = 0; f < NN; f++) {
      if (sq[f] !== p || this.inc[f]) continue;
      tmp.length = 0; this.dests(f, tmp);
      for (const t of tmp) { if (f === lf && t === lt) continue; out.push(mv(f, t, rm)); }
    }
    return out;
  }
  // is there at least one legal move? (the same rules as moves(), stopping at the first)
  hasMove() {
    if (this.placing) return this.hand[this.side] > 0;
    if (R.delay && this.removable().length) return true;      // a removal alone is always a legal turn
    const sq = this.sq, p = this.side + 1, lastM = this.last[this.side], lf = lastM >= 0 ? mTo(lastM) : -1, lt = lastM >= 0 ? mFrom(lastM) : -1;
    for (let f = 0; f < NN; f++) {
      if (sq[f] !== p || this.inc[f]) continue;
      for (let d = 0; d < 4; d++) { const t = NB[f][d]; if (t >= 0 && !sq[t] && !(f === lf && t === lt)) return true; }
      if (R.leap) { const tmp = []; this.dests(f, tmp); for (const t of tmp) if (!(f === lf && t === lt)) return true; }
    }
    return false;
  }
  moves() {
    const out = [];
    if (this.placing) {
      if (!this.hand[this.side]) return out;
      for (let i = 0; i < NN; i++) if (!this.sq[i]) out.push(mv(i, i));
      return out;
    }
    const rmv = this.removable();
    if (!rmv.length) return this.movesAfter(-1, out);
    for (const r of rmv) {
      const keep = this.sq[r], ki = this.inc[r]; this.sq[r] = 0; this.inc[r] = 0;
      const n0 = out.length; this.movesAfter(r, out);
      if (out.length === n0) out.push(mv(r, r, r));
      this.sq[r] = keep; this.inc[r] = ki;
    }
    return out;
  }
  _set(i, x, a) {   // change square i to owner x (0 = empty) with block axis a, keeping the hash
    const y = this.sq[i];
    if (y) { const k = y - 1 + 2 * this.inc[i]; this.h1 ^= Z1[k][i]; this.h2 ^= Z2[k][i]; this.n[y - 1]--; }
    this.sq[i] = x; this.inc[i] = x ? a : 0;
    if (x) { const k = x - 1 + 2 * a; this.h1 ^= Z1[k][i]; this.h2 ^= Z2[k][i]; this.n[x - 1]++; }
  }
  // enemy counters enclosed by the counter that has just landed on x: [{ sq, axis }]
  enclosed(x) {
    const sq = this.sq, inc = this.inc, p = sq[x], o = 3 - p, out = [];
    for (let d = 0; d < 4; d++) {
      const e = NB[x][d]; if (e < 0 || sq[e] !== o) continue;
      const y = NB[e][d];
      if (y >= 0 && sq[y] === p && !inc[y]) { out.push({ sq: e, axis: d < 2 ? 2 : 1 }); continue; }
      if (R.corner && CORNER[e] >= 0) { const [a, b] = CADJ[CORNER[e]], z = a === x ? b : a; if (sq[z] === p && !inc[z]) out.push({ sq: e, axis: 3 }); }
    }
    return out;
  }
  // free every blocked counter whose two holders are no longer both there and free
  _revalidate() {
    const sq = this.sq, inc = this.inc;
    for (let i = 0; i < NN; i++) {
      if (!inc[i]) continue;
      const o = 3 - sq[i], h = this.holders(i);
      if (sq[h[0]] !== o || sq[h[1]] !== o || inc[h[0]] || inc[h[1]]) this._set(i, sq[i], 0);
    }
  }
  play(m) {
    const f = mFrom(m), t = mTo(m), rm = mRm(m), s = this.side, p = s + 1;
    this.h1 ^= ZH1[0][this.hand[0]] ^ ZH1[1][this.hand[1]] ^ ZL1[0][this.last[0] + 1] ^ ZL1[1][this.last[1] + 1];
    this.h2 ^= ZH2[0][this.hand[0]] ^ ZH2[1][this.hand[1]] ^ ZL2[0][this.last[0] + 1] ^ ZL2[1][this.last[1] + 1];
    let took = 0;
    if (this.placing) { this._set(t, p, 0); this.hand[s]--; this.last[s] = -1; }
    else {
      if (rm >= 0) { this._set(rm, 0, 0); this.cap[s]++; took++; }
      if (f !== t) {
        this._set(f, 0, 0); this._set(t, p, 0);
        const enc = this.enclosed(t);
        if (R.delay) { for (const e of enc) if (!this.inc[e.sq]) this._set(e.sq, 3 - p, e.axis); this._revalidate(); }
        else for (const e of enc) { this._set(e.sq, 0, 0); this.cap[s]++; took++; }
        this.last[s] = f + 64 * t;
      } else this.last[s] = -1;
    }
    this.quiet = took || this.placing ? 0 : this.quiet + 1;   // 置く段階の手は「取りのない手」に数えない（数えると配置後10手ずつで終わっていた）
    this.side ^= 1; this.ply++;
    this.h1 ^= ZS1 ^ ZH1[0][this.hand[0]] ^ ZH1[1][this.hand[1]] ^ ZL1[0][this.last[0] + 1] ^ ZL1[1][this.last[1] + 1];
    this.h2 ^= ZS2 ^ ZH2[0][this.hand[0]] ^ ZH2[1][this.hand[1]] ^ ZL2[0][this.last[0] + 1] ^ ZL2[1][this.last[1] + 1];
    this.h1 >>>= 0; this.h2 >>>= 0;
    return this;
  }
  spec() {
    let s = '';
    for (let i = 0; i < NN; i++) { const x = this.sq[i], a = this.inc[i]; s += !x ? '.' : !a ? 'bw'[x - 1] : (x === P1 ? 'hvc' : 'HVC')[a - 1]; }
    return { b: s, side: this.side ? P2 : P1, hand: this.hand.slice(), cap: this.cap.slice(), last: this.last.slice(), n: this.ply, q: this.quiet };
  }
  mobility(p) {
    const keep = this.side; this.side = p - 1; const out = []; this.movesAfter(-1, out); this.side = keep; return out.length;
  }
}
// what move m does on pos (before it is played): { place, from, to, rm, path, blocks: [sq], takes: [sq], frees: [sq] }
function effect(pos, m) {
  const f = mFrom(m), t = mTo(m), rm = mRm(m), q = pos.clone().play(m), o = 2 - pos.side, me = pos.side + 1;
  const out = { place: pos.placing, from: f, to: t, rm, path: null, leap: false, blocks: [], takes: [], frees: [] };
  if (!pos.placing && f !== t) {
    const tmp = pos.clone(); if (rm >= 0) { tmp.sq[rm] = 0; tmp.inc[rm] = 0; }
    out.path = (Math.abs(RC[f][0] - RC[t][0]) + Math.abs(RC[f][1] - RC[t][1]) === 1 || R.rook) ? [f, t] : (tmp.leapPath(f, t) || [f, t]);
  }
  out.leap = !!out.path && !R.rook && (out.path.length > 2 || Math.abs(RC[f][0] - RC[t][0]) + Math.abs(RC[f][1] - RC[t][1]) > 1);
  for (let i = 0; i < NN; i++) {
    if (i === rm) continue;
    if (pos.sq[i] === o && !q.sq[i]) out.takes.push(i);
    if (pos.sq[i] === o && q.sq[i] === o && !pos.inc[i] && q.inc[i]) out.blocks.push(i);
    if (pos.sq[i] === me && q.sq[i] === me && pos.inc[i] && !q.inc[i]) out.frees.push(i);
    if (pos.sq[i] === o && q.sq[i] === o && pos.inc[i] && !q.inc[i]) out.frees.push(i);
  }
  return out;
}
function path(pos, m) { const e = effect(pos, m); return e.path || [e.to]; }
function captured(pos, m) { const e = effect(pos, m); return (e.rm >= 0 ? [e.rm] : []).concat(e.takes); }
// notation: placement "d4" · move "d4-d5" · leap "d4^d6" · takes "xe5" · blocks "!e5" · removal first "xe5,d4-d5"
function name(pos, m) {
  if (m < 0) return '—';
  const e = effect(pos, m);
  let s = e.rm >= 0 ? 'x' + sqName(e.rm) + (e.from !== e.to ? ',' : '') : '';
  if (e.place) return sqName(e.to);
  if (e.from !== e.to) s += sqName(e.from) + (e.leap ? '^' : '-') + sqName(e.to);
  for (const x of e.takes) s += 'x' + sqName(x);
  for (const x of e.blocks) s += '!' + sqName(x);
  return s;
}
function parse(pos, s) { for (const m of pos.moves()) if (name(pos, m) === s) return m; return -1; }
function replay(start, moves) {
  const pos = Pos.from(start), hashes = [pos.h1];
  for (const m of moves) { pos.play(m); hashes.push(pos.h1); }
  return { pos, hashes };
}
// {over, winner, draw, why}: why = 'last' (a side is down to one counter) | 'stuck' (no legal move) | 'quiet' | 'tie' (quintana: captures level → more counters in the opponent's half) | 'tie2' (that level too → White)
// quintana's tie-break (2026-11-19: equal captures → the side with more counters in the opponent's half (Black: rows 0-3, White:
// rows 4-7) wins; still equal → White, the second player). Measured in self-play: White-wins-every-tie gave White nearly all games
// (10/10); this one Black 19 · White 17 of 36 (draws going to White).
const ADV_KOMI = +((typeof process !== 'undefined' && process.env && process.env.LT_KOMI) || 0);   // Black must lead by more than this
function advDiff(pos) { const sq = pos.sq; let m = 0; for (let i = 0; i < NN; i++) { const p = sq[i]; if (!p || pos.inc[i]) continue; if (p === P1 && i < 32) m++; else if (p === P2 && i >= 32) m--; } return m - ADV_KOMI; }
function judge(pos, nMoves) {
  if (pos.placing) return { over: false };
  const n1 = pos.count(P1), n2 = pos.count(P2);
  const byCap = why => pos.cap[0] === pos.cap[1] ? (R.tie ? (a => a ? { over: true, winner: a > 0 ? P1 : P2, why: 'tie' } : { over: true, winner: P2, why: 'tie2' })(advDiff(pos)) : { over: true, winner: 0, draw: true, why }) : { over: true, winner: pos.cap[0] > pos.cap[1] ? P1 : P2, why };
  if (n1 <= 1 || n2 <= 1) return n1 === n2 ? { over: true, winner: 0, draw: true, why: 'last' } : { over: true, winner: n1 > n2 ? P1 : P2, why: 'last' };
  if (nMoves === 0 || (nMoves == null && !pos.hasMove())) return R.stuck === 'lose' ? { over: true, winner: pos.side ? P1 : P2, why: 'stuck' } : byCap('stuck');
  if (pos.quiet >= QUIET_MAX) return byCap('quiet');
  return { over: false };
}
// ---------------------------------------------------------------- AI levels (20 steps: Lv.1 … Lv.20)
const LEVELS = [null,
  // (2026-11-19: the weak steps re-spaced after the stronger search / evaluation — Lv.4 was weaker than Lv.3, some steps +400 Elo)
  { d: 1, noise: 150 },                  // 1
  { d: 1, noise: 110 },                  // 2
  { d: 1, noise: 85 },                   // 3
  { d: 1, noise: 68 },                   // 4
  { d: 1, noise: 56 },                   // 5
  { d: 2, noise: 60 },                   // 6
  { d: 2, noise: 46 },                   // 7
  { d: 2, noise: 32 },                   // 8
  { d: 3, noise: 24 },                   // 9
  { s: 1, nk: 1.2 },                     // 10  (about 1,200 positions per move)
  { s: 1, nk: 3 },                       // 11  (about 3,000 positions per move)
  { s: 1, nk: 6 },                       // 12
  { s: 1, nk: 12 },                      // 13
  { s: 1, nk: 22 },                      // 14
  { s: 1, nk: 40 },                      // 15
  { s: 1, nk: 70 },                      // 16
  { s: 1, nk: 120 },                     // 17
  { s: 1, nk: 200 },                     // 18
  { s: 1, ms: 1500 },                    // 19
  { s: 1, ms: 3000 },                    // 20
];
function gauss(rand) { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
// ---------------------------------------------------------------- evaluation (side to move's view, 100 = one counter)
// material (a blocked counter is nearly lost), counters under attack (an enemy can enclose them with one move), room to
// move, and — while the counters are being placed — solid shapes: pairs side by side, away from the corners.
// The evaluation is a weighted sum of features (side to move's view; tools/tune.js fits the weights per rule set by logistic
// regression on self-play results — Texel's method, 2026-11-19). Feature order (FN):
const FN = ['man', 'blocked', 'hang', 'mob', 'pair', 'center', 'cornerP', 'hand', 'dhang', 'edge', 'holder', 'tempo', 'quietMat', 'rmNow', 'ctl'];
const NF = FN.length;
// (2026-11-19 round 3) two sets of weights: W[k] while the counters are being placed, W[NF + k] once they move; ctl = empty squares
// one move of a side reaches, minus the opponent's
// hand-set weights (before tuning); TUNED[rule] replaces them when present
const EW = { man: 100, blocked: 22, hang: 16, mob: 2, pair: 5, center: 2, cornerP: 14 };
const W1 = [100, 22, -16, 2, 5, 2, -14, 100, -16, 0, 0, 6, 0, 0, 0];
const W0 = new Float64Array(W1.concat(W1));
// fitted by tools/tune.js on self-play (2026-11-19; seneca / piso: round 2 on the round-1 engine's games as well; piso round 3 on quiet
// positions only (no enclosure to make / removal due) with separate weights for placing and moving: +117 Elo against round 2 — the same
// for seneca and quintana lost (−158 / −35), so they keep round 2 for both phases)
const TUNED = {
  seneca: new Float64Array([100, 16.5, -11.9, -1.2, -3.3, 0.9, -3.4, 87.9, -7.5, 1.9, -1.6, 5.4, 46.9, 24.2, 0, 100, 16.5, -11.9, -1.2, -3.3, 0.9, -3.4, 87.9, -7.5, 1.9, -1.6, 5.4, 46.9, 24.2, 0]),
  piso: new Float64Array([100, 22, -10.6, -1.9, -9, 4, -18.6, 99, -8.3, 4.4, 0, 3.3, 100.9, 0, -4, 100, 22, -30.4, -5.7, -14.7, 3.8, -8.3, 87.1, -18.2, 7.1, 0, 1.8, 66.4, 0, 1.2]),
  quintana: new Float64Array([100, 22, -14.7, -0.1, -0.5, 0.7, -14, 100, -17.8, -1.4, 0, 2.4, 60.6, 0, 0, 100, 22, -14.7, -0.1, -0.5, 0.7, -14, 100, -17.8, -1.4, 0, 2.4, 60.6, 0, 0]),
};
let W = W0;
const CEN = new Int8Array(NN);
for (let i = 0; i < NN; i++) { const [r, c] = RC[i]; CEN[i] = Math.min(r, 7 - r) + Math.min(c, 7 - c); }
// RCH[o][x] = how many free counters of o can reach the empty square x with one move (steps / slides), RSRC[o][x] = one of them
const RCH = [new Int8Array(NN), new Int8Array(NN)], RSRC = [new Int8Array(NN), new Int8Array(NN)];
function reachMap(pos) {
  const sq = pos.sq, inc = pos.inc;
  RCH[0].fill(0); RCH[1].fill(0);
  for (let f = 0; f < NN; f++) {
    const p = sq[f]; if (!p || inc[f]) continue;
    const C = RCH[p - 1], S = RSRC[p - 1];
    for (let d = 0; d < 4; d++) {
      let t = NB[f][d];
      while (t >= 0 && !sq[t]) { C[t]++; S[t] = f; if (!R.rook) break; t = NB[t][d]; }
    }
  }
}
// can a free counter of o other than the one on `not` reach the empty square x with one move?
const reachX = (pos, x, o, not) => pos.hand[o - 1] > 0 || RCH[o - 1][x] > 1 || (RCH[o - 1][x] === 1 && RSRC[o - 1][x] !== not);
// F: null → return the weighted value; else add the feature counts to F (for tuning)
function evalCore(pos, F) {
  const sq = pos.sq, inc = pos.inc, me = pos.side + 1;
  reachMap(pos);
  const f = F || EVF; if (!F) f.fill(0);
  for (let i = 0; i < NN; i++) {
    const p = sq[i]; if (!p) continue;
    const sg = p === me ? 1 : -1, o = 3 - p;
    if (inc[i]) { f[1] += sg; if (p !== me) f[13] += 1; continue; }
    f[0] += sg; f[5] += sg * CEN[i];
    let h = 0;
    for (let d = 0; d < 4; d += 2) {
      const a = NB[i][d], b = NB[i][d + 1]; if (a < 0 || b < 0) continue;
      const ea = sq[a] === o && !inc[a], eb = sq[b] === o && !inc[b];
      if ((ea && !sq[b] && reachX(pos, b, o, a)) || (eb && !sq[a] && reachX(pos, a, o, b))) h++;
    }
    if (h) { f[2] += sg; if (h > 1) f[8] += sg; }
    if (R.corner && CORNER[i] >= 0) f[6] += sg;
    else if (RC[i][0] === 0 || RC[i][0] === 7 || RC[i][1] === 0 || RC[i][1] === 7) f[9] += sg;
    for (let d = 1; d < 4; d += 2) { const a = NB[i][d]; if (a >= 0 && sq[a] === p) f[4] += sg; }
    for (let d = 0; d < 4; d++) { const a = NB[i][d]; if (a >= 0) { if (!sq[a]) f[3] += sg; else if (sq[a] === o && inc[a]) f[10] += sg; } }
  }
  f[7] += pos.hand[me - 1] - pos.hand[2 - me];
  f[11] += 1;
  if (!pos.placing) f[12] += (pos.n[me - 1] - pos.n[2 - me] + pos.cap[me - 1] - pos.cap[2 - me]) * pos.quiet / QUIET_MAX;
  { const A = RCH[me - 1], B = RCH[2 - me]; let c = 0; for (let x = 0; x < NN; x++) if (!sq[x]) c += (A[x] > 0) - (B[x] > 0); f[14] += c; }
  const o = pos.placing ? 0 : NF;
  if (F) { if (o) for (let k = 0; k < NF; k++) { F[NF + k] = F[k]; F[k] = 0; } return 0; }
  let v = 0; for (let k = 0; k < NF; k++) v += W[o + k] * f[k];
  // quintana: with captures level the tie-break counts — the nearer the limit, the more (TIE_W per the whole limit)
  if (R.tie && !pos.placing && pos.cap[0] === pos.cap[1]) { const a = advDiff(pos); v += (me === P1 ? 1 : -1) * (a ? Math.sign(a) * Math.min(1, Math.abs(a) / 3) : -.3) * TIE_W * pos.quiet / QUIET_MAX; }
  return Math.round(v);
}
const EVF = new Float64Array(NF);   // (evalCore's scratch; F for tuning has 2 * NF entries)
function evaluate(pos) { const N = netNow(); if (!N) return evalCore(pos, null); if (WA) { toCore(WA, pos); return WA.x.evaluate(); } return (N.FL & 1 ? evalCore(pos, null) : 0) + netEvalJS(pos, N); }
// can a free counter of o (other than the one on `not`) reach the empty square x with one move? (steps / slides only)
function reach(pos, x, o, not) {
  const sq = pos.sq, inc = pos.inc;
  if (pos.hand[o - 1]) return true;
  for (let d = 0; d < 4; d++) {
    let a = NB[x][d];
    if (R.rook) { while (a >= 0 && !sq[a]) a = NB[a][d]; }
    if (a >= 0 && a !== not && sq[a] === o && !inc[a]) return true;
  }
  return false;
}
// ---------------------------------------------------------------- search
let nodes = 0, stop = false, tEnd = 0, nodeLimit = Infinity;
const TT = new Map(), killers = [];
// SH: the transposition table shared by the workers of shared/mtsplit.js (shared mode, shared/mttt.js, set by 'mtshare'); the
// one-thread worker never has it, so its levels play as before
let SH = null;
const SALT = { seneca: 0, piso: 0x5bd1e995, quintana: 0x27d4eb2f };
const HIST = new Int32Array(2 * 64 * 64);   // history heuristic: [side][from][to]
function kreset() { killers.length = 0; for (let i = 0; i < HIST.length; i++) HIST[i] >>= 3; if (WA) WA.x.kclear(); if (MX) MX.x.kclear(); }
function ttClear() { TT.clear(); if (WA) WA.x.ttclear(); if (MX) MX.x.ttclear(); }
function ttGet(pos) {   // the one-thread table's entry for pos (or the shared table's)
  if (SH !== null) return SH.get(pos.h1, pos.h2);
  if (WA) return WA.x.ttprobe(pos.h1, pos.h2) ? { h2: pos.h2, d: WA.io[0], f: WA.io[1], v: WA.io[2], m: WA.io[3] } : undefined;
  const e = TT.get(pos.h1); return e && e.h2 === pos.h2 ? e : undefined;
}
function terminal(pos, ply, nMoves) {
  if (!pos.placing && pos.n[0] > 1 && pos.n[1] > 1 && pos.quiet < QUIET_MAX && (nMoves > 0 || (nMoves == null && pos.hasMove()))) return null;
  const j = judge(pos, nMoves);
  if (!j.over) return null;
  if (j.draw) return 0;
  return j.winner === pos.side + 1 ? WIN - ply : -WIN + ply;
}
function moveScore(pos, m, ttm, ply) {
  if (m === ttm) return 1e6;
  let s = 0;
  if (!pos.placing) {
    const t = mTo(m), f = mFrom(m);
    if (f !== t) {
      const keepF = pos.sq[f]; pos.sq[f] = 0; const k0 = pos.sq[t]; pos.sq[t] = keepF;
      s += pos.enclosed(t).length * 500;
      pos.sq[t] = k0; pos.sq[f] = keepF;
    }
    if (mRm(m) >= 0) s += 50;
  } else s += CEN[mTo(m)] * 3;
  const k = killers[ply]; if (k && (k[0] === m || k[1] === m)) s += 200;
  s += Math.min(150, HIST[(pos.side << 12) + (m & 4095)] >> 4);
  return s;
}
function orderMoves(pos, L, ttm, ply) {
  if (WA && L.length > 1 && L.length <= 2048) { toCore(WA, pos); WA.aom.set(L); WA.x.ab_order(L.length, ttm, ply); return Array.from(WA.aom.subarray(0, L.length)); }
  const sc = L.map(m => moveScore(pos, m, ttm, ply)), idx = L.map((_, i) => i);
  idx.sort((a, b) => sc[b] - sc[a] || a - b);
  return idx.map(i => L[i]);
}
let NULLMOVE = true, LMR_K = .45, QS_STANDPAT = true, ASP = 40;
// the late-move reductions max(1, floor(LMR_K ln d ln i)) as a table (core.c gets the same numbers)
const LMRT = new Uint8Array(64 * 1024);
function lmrTable() { for (let d = 0; d < 64; d++) for (let i = 0; i < 1024; i++) LMRT[d * 1024 + i] = d && i ? Math.max(1, Math.floor(LMR_K * Math.log(d) * Math.log(i))) : 1; }
lmrTable();
const isKiller = (m, ply) => { const k = killers[ply]; return !!k && (k[0] === m || k[1] === m); };
function search(pos, d, a, b, ply) {
  if (WA && !stop) {
    toCore(WA, pos); WA.x.setn(nodes, nodeLimit === Infinity ? 1e300 : nodeLimit, SH !== null ? 1 : 0);
    const v = WA.x.search(d, a, b, ply);
    nodes = WA.x.getn(); if (WA.x.stopped()) stop = true;
    return v;
  }
  nodes++;
  if ((nodes & 1023) === 0 && (Date.now() > tEnd || nodes > nodeLimit || (SH !== null && SH.stopped()))) stop = true;
  if (stop) return 0;
  if (d <= 0) { const tq = terminal(pos, ply); if (tq !== null) return tq; return quiesce(pos, a, b, ply, 0); }
  const LM = pos.moves();
  const tv = terminal(pos, ply, LM.length); if (tv !== null) return tv;
  const e = SH !== null ? SH.get(pos.h1, pos.h2) : TT.get(pos.h1), a0 = a;
  let ttm = -1;
  if (e && e.h2 === pos.h2) {
    ttm = e.m;
    if (e.d >= d) {
      let v = e.v; if (v > WINT) v -= ply; else if (v < -WINT) v += ply;
      if (e.f === 0) return v;
      if (e.f === 1 && v >= b) return v;
      if (e.f === 2 && v <= a) return v;
    }
  }
  const pv = b - a > 1;
  // null move (movement phase, not in the middle of a forced removal, the side to move has spare counters): give the
  // opponent a free move; if we are still above beta at a reduced depth, this node fails high
  if (!pv && NULLMOVE && d >= 3 && !pos.placing && Math.abs(b) < WINT && !(R.delay && pos.removable().length) && pos.n[pos.side] > 3 && evaluate(pos) >= b) {
    const q = pos.clone(); q.side ^= 1; q.h1 = (q.h1 ^ ZS1) >>> 0; q.h2 = (q.h2 ^ ZS2) >>> 0; q.quiet++;
    const v = -search(q, d - 3, -b, -b + 1, ply + 1);
    if (stop) return 0;
    if (v >= b && v < WINT) return v;
  }
  const L = orderMoves(pos, LM, ttm, ply);
  let best = -Infinity, bm = L[0];
  for (let i = 0; i < L.length; i++) {
    const m = L[i], q = pos.clone().play(m);
    let v;
    if (i === 0) v = -search(q, d - 1, -b, -a, ply + 1);
    else {
      let red = 0;
      if (d >= 3 && i >= 3 && !pos.placing && q.n[pos.side ^ 1] === pos.n[pos.side ^ 1] && !isKiller(m, ply)) {
        red = LMRT[Math.min(d, 63) * 1024 + Math.min(i, 1023)];
        if (pv) red = Math.max(0, red - 1);
        red = Math.min(red, d - 2);
      } else if (pos.placing && d >= 3 && i >= 10) red = 1;
      v = -search(q, d - 1 - red, -a - 1, -a, ply + 1);
      if (v > a && (red || v < b)) v = -search(q, d - 1, -b, -a, ply + 1);
    }
    if (stop) return 0;
    if (v > best) { best = v; bm = m; }
    if (v > a) a = v;
    if (a >= b) {
      const k = killers[ply] || (killers[ply] = [-1, -1]); if (k[0] !== m) { k[1] = k[0]; k[0] = m; }
      const hi = (pos.side << 12) + (m & 4095); HIST[hi] = Math.min(1 << 20, HIST[hi] + d * d);
      break;
    }
  }
  let sv = best; if (sv > WINT) sv += ply; else if (sv < -WINT) sv -= ply;
  if (SH !== null) { SH.put(pos.h1, pos.h2, d, sv, best <= a0 ? 2 : best >= b ? 1 : 0, bm, 0); return best; }
  if (TT.size > 600000) TT.clear();
  TT.set(pos.h1, { h2: pos.h2, d, v: sv, m: bm, f: best <= a0 ? 2 : best >= b ? 1 : 0 });
  return best;
}
// quiet search: go on while there are counters to remove / moves that enclose
function quiesce(pos, a, b, ply, qd) {
  const stand = evaluate(pos);
  if (pos.placing || qd >= 4) return stand;
  const must = R.delay && pos.removable().length > 0;
  let best = must && !QS_STANDPAT ? -Infinity : stand;
  if (!must || QS_STANDPAT) { if (stand >= b) return stand; if (stand > a) a = stand; }
  const L = pos.moves();
  for (const m of L) {
    if (!must || QS_STANDPAT) {
      const f = mFrom(m), t = mTo(m);
      if (f === t) continue;
      const rm = mRm(m), kr = rm >= 0 ? pos.sq[rm] : 0, ki = rm >= 0 ? pos.inc[rm] : 0; if (rm >= 0) { pos.sq[rm] = 0; pos.inc[rm] = 0; }
      const kf = pos.sq[f], kt = pos.sq[t]; pos.sq[f] = 0; pos.sq[t] = kf;
      const n = pos.enclosed(t).length; pos.sq[t] = kt; pos.sq[f] = kf;
      if (rm >= 0) { pos.sq[rm] = kr; pos.inc[rm] = ki; }
      if (!n) continue;
    }
    nodes++;
    const q = pos.clone().play(m), tv = terminal(q, ply + 1);
    const v = tv !== null ? -tv : -quiesce(q, -b, -a, ply + 1, qd + 1);
    if (v > best) best = v;
    if (v > a) a = v;
    if (a >= b) break;
  }
  return best === -Infinity ? stand : best;
}
function rootValues(pos, d) {
  const A = abCore();
  if (A) { abRoot(A, pos); const k = A.x.ab_values(d); abBack(A); const out = []; for (let i = 0; i < k; i++) out.push({ m: A.aom[i], v: A.aov[i] }); return out; }
  const out = [];
  for (const m of orderMoves(pos, pos.moves(), -1, 0)) {
    const q = pos.clone().play(m);
    const v = -search(q, d - 1, -WIN - 1, WIN + 1, 1);
    if (stop) break;
    out.push({ m, v });
  }
  out.sort((x, y) => y.v - x.v);
  return out;
}
function bestMove(pos, maxD, ms, nk) {
  nodes = 0; stop = false; tEnd = Date.now() + (ms || 20000); nodeLimit = nk ? nk * 1000 : Infinity; kreset();
  const A = abCore();
  if (A) { abRoot(A, pos); A.x.ab_best(maxD); abBack(A); return { move: A.io[0], v: A.io[1], depth: A.io[2] }; }
  const all = pos.moves();
  let best = all[0], bv = 0, depth = 0, order = orderMoves(pos, all, -1, 0);
  for (let d = 1; d <= maxD; d++) {
    let bm = order[0], bestV = -Infinity;
    // aspiration: a narrow window round the last value, widened when the result falls outside it
    let lo = d >= 4 && Math.abs(bv) < WINT ? bv - ASP : -WIN - 1, hi = d >= 4 && Math.abs(bv) < WINT ? bv + ASP : WIN + 1;
    for (let tries = 0; ; tries++) {
      let a = lo; bm = order[0]; bestV = -Infinity;
      for (let i = 0; i < order.length; i++) {
        const m = order[i], q = pos.clone().play(m);
        let v;
        if (i === 0) v = -search(q, d - 1, -hi, -a, 1);
        else { v = -search(q, d - 1, -a - 1, -a, 1); if (v > a && !stop) v = -search(q, d - 1, -hi, -a, 1); }
        if (stop) break;
        if (v > bestV) { bestV = v; bm = m; }
        if (v > a) a = v;
        if (a >= hi) break;
      }
      if (stop) break;
      if (bestV <= lo && lo > -WIN - 1) { lo = tries ? -WIN - 1 : lo - ASP * 4; continue; }
      if (bestV >= hi && hi < WIN + 1) { hi = tries ? WIN + 1 : hi + ASP * 4; order = [bm].concat(order.filter(x => x !== bm)); continue; }
      break;
    }
    if (stop && bestV === -Infinity) break;
    if (!stop || bestV >= bv) { best = bm; bv = bestV; }
    if (stop) break;
    depth = d;
    order = [bm].concat(order.filter(x => x !== bm));
    if (Math.abs(bv) > WINT) break;
  }
  return { move: best, v: bv, depth };
}
// a lost position: the move that loses latest; among those the one that keeps the most counters and room
function resist(pos, list) {
  let worst = -Infinity; for (const e of list) worst = Math.max(worst, e.v);
  const pool = list.filter(e => e.v === worst), me = pos.side + 1;
  let bm = pool[0].m, bs = -Infinity;
  for (const e of pool) { const q = pos.clone().play(e.m), s = (q.count(me) - q.count(3 - me)) * 20 + q.mobility(me) - q.mobility(3 - me); if (s > bs) { bs = s; bm = e.m; } }
  return bm;
}

// ---------------------------------------------------------------- opening book for the placing phase (tools/book.js, 2026-11-19): the first
// placement, the reply to every first placement and the second placement after the book's first one (and any reply); the 8 symmetries of the board are folded (bookKey: the smallest of the 8 board
// strings, and the transform t that gives it). The book is self.LT_BOOK (book.js, loaded by the worker) or set with setBook().
const SYM = [];
for (let t = 0; t < 8; t++) { const a = new Int8Array(NN); for (let i = 0; i < NN; i++) { let r = i >> 3, c = i & 7; if (t & 4) [r, c] = [c, r]; if (t & 1) c = 7 - c; if (t & 2) r = 7 - r; a[i] = r * 8 + c; } SYM.push(a); }
const SYMI = SYM.map(a => { const b = new Int8Array(NN); for (let i = 0; i < NN; i++) b[a[i]] = i; return b; });
function bookKey(pos) {
  let best = null, bt = 0;
  for (let t = 0; t < 8; t++) { const A = SYM[t], s = new Array(NN); for (let i = 0; i < NN; i++) s[A[i]] = pos.sq[i]; const k = s.join(''); if (best === null || k < best) { best = k; bt = t; } }
  return { key: RK + ':' + COUNT + ':' + best, t: bt };
}
const bookMove = (m, t) => mv(SYM[t][mFrom(m)], SYM[t][mTo(m)]);           // a placement into the canonical orientation
const bookBack = (m, t) => mv(SYMI[t][mFrom(m)], SYMI[t][mTo(m)]);         // and back
let BOOK = (typeof self !== 'undefined' && self.LT_BOOK) || null;
function bookFind(pos) {
  if (!BOOK || !pos.placing || pos.ply > 2) return -1;
  const k = bookKey(pos), m = BOOK[k.key];
  if (m == null) return -1;
  const b = bookBack(m, k.t);
  return pos.moves().indexOf(b) >= 0 ? b : -1;
}
let PRO_CFG = null, PRO_NOBOOK = false;
// tools (tools/match.js, tune): think with an explicit level object ({ s: 1, ms } / { s: 1, nk } / { d, noise })
function thinkCfg(start, moves, cfg, rule, rand) { PRO_CFG = cfg; try { return think(start, moves, 10, rand, rule); } finally { PRO_CFG = null; } }
function think(start, moves, level, rand, rule) {
  if (rule) setRule(rule);
  rand = rand || Math.random;
  const L = PRO_CFG || LEVELS[level] || LEVELS[10];
  const { pos } = replay(start, moves);
  const all = pos.moves();
  if (!all.length) return { move: -1 };
  if (all.length === 1) return { move: all[0] };
  if (L.s && !PRO_NOBOOK) { const b = bookFind(pos); if (b >= 0) return { move: b, v: 0, book: true }; }   // (the search levels: the opening book)
  if (!L.s) {
    nodes = 0; stop = false; tEnd = Date.now() + 2500; nodeLimit = Infinity; kreset();
    const d = pos.placing ? Math.min(L.d, 2) : L.d;
    const vals = rootValues(pos, d);
    if (!vals.length) return { move: all[0] };
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
const kindOf = v => v > WINT ? 'win' : v < -WINT ? 'loss' : 'heur';
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
    if (list.every(e => Math.abs(e.v) > WINT)) break;
  }
  if (!list.length) list = pos.moves().map(m => ({ m, v: 0, kind: 'heur' }));
  return { list, depth };
}
function pvOf(start, moves, m, plies) {
  const pv = [], line = moves.concat([m]);
  const { pos } = replay(start, line);
  for (let i = 1; i < (plies || 7); i++) {
    if (judge(pos).over) break;
    const r = bestMove(pos, 3, 120, 4);
    if (r.move == null || r.move < 0) break;
    pv.push(r.move); pos.play(r.move);
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

// ---------------------------------------------------------------- several threads (shared/mtsplit.js, 2026-11-19; the same protocol as
// konane/engine.js): mtPlan = what a 'think' / 'analyze' / 'cands' job searches on the threads (or its answer at once); mtV = the node
// after the root and m.line searched to depth m.d in the window (m.wa, m.wb); mtKids = that node's moves in this engine's order;
// mtFin = the job's reply from the threads' raw result (the same shape as the one-thread worker's)
let mtRule = null;
function mtNode(m) {
  if (SH !== null) SH.salt = SALT[RK] | 0;
  else if (mtRule !== RK) { ttClear(); mtRule = RK; }
  const line = m.line || [], { pos } = replay(m.start, m.moves.concat(line));
  return { pos, ply: line.length };
}
function mtPlan(m) {
  const { pos } = replay(m.start, m.moves), all = pos.moves(), inf = WIN + 1;
  if (m.job === 'think') {
    const L = m.cfg || LEVELS[m.level] || LEVELS[10];
    if (all.length < 2 || !L.s || bookFind(pos) >= 0) { PRO_CFG = m.cfg || null; try { return { result: think(m.start, m.moves, m.level) }; } finally { PRO_CFG = null; } }   // (one move, a weak level, the book: no threads)
    kreset();
    return { plan: { kind: 'best', moves: orderMoves(pos, all, -1, 0), inf, maxD: L.dx || 60, ms: L.ms || 0, nodes: (L.nk || (L.ms ? 0 : 50)) * 1000, win: WINT, partialIfBetter: true, splitMin: 99, lmr: { d: 3, i: 3 }, specRes: SH === null ? 0 : undefined, sticky: SH === null } };
  }
  if (!all.length) return { result: { list: [], depth: 0 } };
  const cands = m.job === 'cands';
  kreset();
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
  return { kids: orderMoves(pos, L, e ? e.m : -1, ply).map(x => ({ m: x, s: -1 })) };
}
function mtFin(m) {
  const r = m.raw;
  if (m.job === 'think') { const { pos } = replay(m.start, m.moves); return { result: thinkFin(pos, { move: r.m, v: r.v, depth: r.depth }) }; }
  let list = (r.list || []).map(e => Object.assign({ m: e.m, v: e.v, kind: kindOf(e.v) }, e.pv ? { pv: e.pv } : {}));
  if (!list.length) { const { pos } = replay(m.start, m.moves); list = pos.moves().map(x => ({ m: x, v: 0, kind: 'heur' })); }
  if (m.job === 'cands') list = list.slice(0, m.k || 5);
  return { result: { list, depth: r.depth } };
}
// ---------------------------------------------------------------- solvers (puzzles and lessons)
// goal 'take': the mover's lead in captures grows by at least `gain` within n of its own moves, whatever the reply
// goal 'win' : the game ends with the mover as the winner within n of its own moves
let solveBudget = Infinity;
function lead(pos, me) { return pos.cap[me - 1] - pos.cap[2 - me]; }
function goalMet(pos, me, G) {
  if (G.goal === 'win') { const j = judge(pos); return j.over && j.winner === me; }
  return lead(pos, me) >= G.base + (G.gain || 1) && !pendingLoss(pos, me);
}
// seneca: a counter of `me` that is blocked right now will be removed — the lead is not safe yet
function pendingLoss(pos, me) {
  if (!R.delay) return false;
  for (let i = 0; i < NN; i++) if (pos.sq[i] === me && pos.inc[i]) return true;
  return false;
}
function goalW(pos, k, me, G) {      // me to move with k moves left: can me reach the goal?
  if (--solveBudget < 0) return false;
  if (judge(pos).over) return false;
  for (const m of orderMoves(pos, pos.moves(), -1, 0)) {
    const q = pos.clone().play(m);
    if (goalMet(q, me, G)) return true;
    if (k > 1 && !judge(q).over && goalB(q, k - 1, me, G)) return true;
  }
  return false;
}
function goalB(pos, k, me, G) {      // the defender to move: does every reply still lose?
  const L = pos.moves();
  if (!L.length) return false;
  for (const m of L) {
    const q = pos.clone().play(m);
    if (goalMet(q, me, G)) continue;
    if (judge(q).over) return false;
    if (!goalW(q, k, me, G)) return false;
  }
  return true;
}
const goalOf = (pos, g) => ({ goal: g && g.goal || 'take', gain: g && g.gain || 1, base: lead(pos, pos.side + 1) });
// the moves that reach the goal within n moves (null: none)
function goalGood(start, moves, n, g, rule, budget) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves), me = pos.side + 1, G = g && g.base != null ? g : goalOf(pos, g), out = [];
  solveBudget = budget || 400000;
  for (const m of pos.moves()) {
    const q = pos.clone().play(m);
    if (goalMet(q, me, G) || (n > 1 && !judge(q).over && goalB(q, n - 1, me, G))) out.push(m);
    if (solveBudget < 0) { solveBudget = Infinity; return null; }
  }
  solveBudget = Infinity;
  return out.length ? out : null;
}
// the smallest n ≤ max with a solution: { n, list } or null
function goalMin(start, moves, max, g, rule, budget) {
  for (let n = 1; n <= max; n++) { const list = goalGood(start, moves, n, g, rule, budget); if (list) return { n, list }; }
  return null;
}
// the defender's reply that holds out longest (ties: the best by the evaluation after a short search)
function goalReply(start, moves, n, G, rule) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves), me = 2 - pos.side;
  let best = -1, bk = -1, bv = -Infinity;
  for (const m of pos.moves()) {
    const q = pos.clone().play(m);
    let need = 0;
    if (!goalMet(q, me, G)) {
      need = 99;
      if (!judge(q).over) for (let k = 1; k <= n; k++) { solveBudget = 200000; if (goalW(q, k, me, G)) { need = k; break; } }
      solveBudget = Infinity;
    }
    nodes = 0; stop = false; tEnd = Date.now() + 200; nodeLimit = 3000;
    const v = search(q, 2, -WIN - 1, WIN + 1, 1);
    if (need > bk || (need === bk && v > bv)) { bk = need; bv = v; best = m; }
  }
  return { move: best, need: bk };
}

loadCore();
setRule('seneca');
// Node (tools): a net from LT_NET_<rule> (a file), else nets/NETS[rule] when named
if (typeof module !== 'undefined' && module.exports && typeof require === 'function' && typeof window === 'undefined') {
  try { const fs = require('fs'), path = require('path'); for (const k of RULE_ORDER) { const f = (process.env['LT_NET_' + k]) || (NETS[k] ? path.join(__dirname, 'nets', NETS[k]) : ''); if (f && fs.existsSync(f)) NETB[k] = new Uint8Array(fs.readFileSync(f)); } if (process.env.LT_NONET) NET_ON = false; waRule(); } catch (e) {}
}
const API = { N, NN, P1, P2, WIN, WINT, QUIET_MAX, RULES, RULE_ORDER, get rule() { return RK; }, get ruleKey() { return ruleKey(); }, get R() { return R; }, get count() { return COUNT; }, setRule,
  RC, ADJ, NB, CORNER, CADJ, sqAt, sqName, mv, mFrom, mTo, mRm, isPlace, isRemoveOnly, Pos, effect, path, captured, name, parse, replay, judge,
  LEVELS, think, thinkCfg, setOpt(o) { if ('null' in o) NULLMOVE = o.null; if ('lmr' in o) { LMR_K = o.lmr; lmrTable(); } if ('qs' in o) QS_STANDPAT = o.qs; if ('asp' in o) ASP = o.asp; waRule(); }, analyze, cands, pvOf, evaluate, evalCore, FN, W0, TUNED, setW(w) { W = w ? Float64Array.from(w) : (TUNED[RK] || W0); waRule(); }, NETS, setNet, set netOn(v) { NET_ON = !!v; NETJR = null; waRule(); }, get netOn() { return NET_ON; }, netParse, netEvalJS, get wasm() { return !!WA; }, get simd() { return !!(WA && WA.simd); }, get core() { return WA; }, toCore,
  useCore: (x, buf) => { MX = x ? coreViews(x, buf) : null; if (MX) { MX.threads = 1; MX.jobThreads = 1; waRule(); } }, kindOf, EW, goalGood, goalMin, goalReply, goalOf, goalMet, ttClear,
  get nodes() { return nodes; }, set SH(t) { SH = t; }, bookKey, bookMove, bookFind, setBook(b) { BOOK = b; }, set noBook(v) { PRO_NOBOOK = !!v; }, get SH() { return SH; }, mtPlan, mtV, mtKids, mtFin };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof self !== 'undefined' && typeof importScripts === 'function' && typeof window === 'undefined') {
  try { importScripts('book.js?v=1'); BOOK = self.LT_BOOK || null; } catch (e) {}   // (the opening book; none = search as usual)
  let queueP = Promise.resolve();
  // ?…&mt=1: the lead of the threads (shared/mtengine.js): core_mt.wasm on the shared memory sent with the first message ('mtinit')
  if (/[?&]mt=1\b/.test(self.location.search || '')) {
    queueP = new Promise(res => self.addEventListener('message', function f(e) { if (e.data && e.data.type === 'mtinit') { self.removeEventListener('message', f); res(e.data); } }))
      .then(m => {
        const x = new WebAssembly.Instance(m.module, { env: { memory: m.mem, now: () => Date.now() } }).exports;
        x.mt_stack(m.top); x.mt_thread(m.tls, 0);
        MX = coreViews(x, m.mem.buffer); MX.threads = navigator.hardwareConcurrency || 2;
        waRule();
        self.postMessage({ type: 'mtready' });
      }).catch(err => { MX = null; self.postMessage({ type: 'mtready', error: String(err && err.message || err) }); });
  }
  // the nets named in NETS (nets/<file>): fetched before the first job; a failure keeps the hand-made evaluation
  const netP = typeof fetch === 'function' ? Promise.all(RULE_ORDER.filter(k => NETS[k]).map(k => fetch(new URL('nets/' + NETS[k], self.location.href)).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b && netParse(new Uint8Array(b))) setNet(k, new Uint8Array(b)); }).catch(() => {}))) : Promise.resolve();
  queueP = queueP.then(() => netP);
  self.onmessage = e => {
    const m = e.data;
    if (m && m.type === 'mtinit') return;
    if (m && m.type === 'mtshare') { try { importScripts(m.lib); SH = self.MTTT.attach(m); } catch (err) { SH = null; } return; }   // (shared/mtsplit.js shared mode)
    queueP = queueP.then(() => { try {
      if (MX) MX.jobThreads = m.mtThreads > 0 ? Math.min(m.mtThreads, MX.threads) : 0;   // (the threads of this job: the exact one-thread table with 1)
      if (SH !== null) SH.begin(m);
      setRule(m.rule || 'seneca');
      if (SH !== null) SH.salt = SALT[RK] | 0;
      if (m.type === 'think') { PRO_CFG = m.cfg || null; let r; try { r = think(m.start, m.moves, m.level); } finally { PRO_CFG = null; } self.postMessage({ id: m.id, type: 'result', ...r, nodes }); }
      else if (m.type === 'analyze') {
        const r = analyze(m.start, m.moves, m.time || 1000, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth }));
        self.postMessage({ id: m.id, type: 'result', ...r, nodes });
      } else if (m.type === 'cands') self.postMessage({ id: m.id, type: 'result', nodes, ...cands(m.start, m.moves, m.time || 1200, m.k, m.plies, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth })) });
      else if (m.type === 'goal') { const g = goalGood(m.start, m.moves, m.n, m.g); self.postMessage({ id: m.id, type: 'result', list: g ? g.map(x => ({ m: x, need: m.n })) : null }); }
      else if (m.type === 'goalReply') self.postMessage({ id: m.id, type: 'result', ...goalReply(m.start, m.moves, m.n, m.g) });
      else if (m.type === 'newgame') { ttClear(); self.postMessage({ id: m.id, type: 'result' }); }
      else if (m.type === 'mtplan') self.postMessage({ id: m.id, type: 'result', ...mtPlan(m) });
      else if (m.type === 'mtv') self.postMessage({ id: m.id, type: 'result', core: WA ? 'wasm' : 'js', ...mtV(m) });
      else if (m.type === 'mtkids') self.postMessage({ id: m.id, type: 'result', ...mtKids(m) });
      else if (m.type === 'mtpv') self.postMessage({ id: m.id, type: 'result', pv: pvOf(m.start, m.moves, m.m, m.plies) });
      else if (m.type === 'mtfin') { const f = mtFin(m); if (f.result) f.result.core = WA ? 'wasm' : 'js'; self.postMessage({ id: m.id, type: 'result', ...f }); }
    } catch (err) { self.postMessage({ id: m.id, type: 'result', error: String(err && err.stack || err) }); } });
  };
}
if (typeof window !== 'undefined') window.LatrEngine = API;
})();

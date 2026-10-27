/*
 * Shogi engine — rules, learned evaluation, search, mate solver.
 * Runs as a Web Worker (index.html) and as a CommonJS module (Node tools).
 *
 * Copyright 2026 core-calmdust — Apache License 2.0
 */
(function (root) {
'use strict';

// ===================================================================== pieces
// piece code: 0 = empty, 1..14 = black (sente), 17..30 = white (gote)
const FU = 1, KY = 2, KE = 3, GI = 4, KA = 5, HI = 6, KI = 7, OU = 8,
      TO = 9, NY = 10, NK = 11, NG = 12, UM = 13, RY = 14;
const WF = 16, BLACK = 0, WHITE = 1;
const colorOf = p => p >> 4;
const typeOf = p => p & 15;
const CAN_PROMOTE = [0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
const UNPROMOTE = [0, FU, KY, KE, GI, KA, HI, KI, OU, FU, KY, KE, GI, KA, HI];
const VALUE = [0, 90, 315, 405, 495, 855, 990, 540, 15000, 540, 540, 540, 540, 945, 1395]; // for ordering / SEE only
const HAND_MAX = [0, 18, 4, 4, 4, 2, 2, 4];

// sq = row * 9 + col, row 0 = rank 1 (gote's back rank), col 0 = file 9.
const sqFile = s => 9 - (s % 9), sqRank = s => ((s / 9) | 0) + 1;
const makeSq = (file, rank) => (rank - 1) * 9 + (9 - file);

// directions from black's point of view; "up" = toward rank 1
const DR = [-1, -1, -1, 0, 0, 1, 1, 1], DC = [-1, 0, 1, -1, 1, -1, 0, 1];
const OPPD = [7, 6, 5, 4, 3, 2, 1, 0];
const NB = new Int8Array(81 * 8).fill(-1);
for (let s = 0; s < 81; s++) {
  const r = (s / 9) | 0, c = s % 9;
  for (let d = 0; d < 8; d++) {
    const rr = r + DR[d], cc = c + DC[d];
    if (rr >= 0 && rr < 9 && cc >= 0 && cc < 9) NB[s * 8 + d] = rr * 9 + cc;
  }
}
// knight targets and sources
const KN_TO = [[], []], KN_FROM = [[], []];
for (let s = 0; s < 81; s++) {
  const r = (s / 9) | 0, c = s % 9;
  for (const col of [BLACK, WHITE]) {
    const dr = col === BLACK ? -2 : 2, t = [], f = [];
    for (const dc of [-1, 1]) {
      if (r + dr >= 0 && r + dr < 9 && c + dc >= 0 && c + dc < 9) t.push((r + dr) * 9 + c + dc);
      if (r - dr >= 0 && r - dr < 9 && c + dc >= 0 && c + dc < 9) f.push((r - dr) * 9 + c + dc);
    }
    KN_TO[col][s] = t; KN_FROM[col][s] = f;
  }
}
// step / slide tables indexed by piece code * 8 + dir
const STEP = new Uint8Array(32 * 8), SLIDE = new Uint8Array(32 * 8);
(function () {
  const GOLD = [0, 1, 2, 3, 4, 6];
  const steps = { [FU]: [1], [GI]: [0, 1, 2, 5, 7], [KI]: GOLD, [TO]: GOLD, [NY]: GOLD, [NK]: GOLD, [NG]: GOLD,
    [OU]: [0, 1, 2, 3, 4, 5, 6, 7], [UM]: [1, 3, 4, 6], [RY]: [0, 2, 5, 7] };
  const slides = { [KY]: [1], [KA]: [0, 2, 5, 7], [HI]: [1, 3, 4, 6], [UM]: [0, 2, 5, 7], [RY]: [1, 3, 4, 6] };
  for (let t = 1; t <= 14; t++) {
    for (const d of steps[t] || []) { STEP[t * 8 + d] = 1; STEP[(t + WF) * 8 + OPPD[d]] = 1; }
    for (const d of slides[t] || []) { SLIDE[t * 8 + d] = 1; SLIDE[(t + WF) * 8 + OPPD[d]] = 1; }
  }
})();
const inZone = (col, s) => col === BLACK ? s < 27 : s >= 54;
// row restrictions for unpromoted pieces (must-promote squares)
function deadEnd(col, t, s) {
  const r = (s / 9) | 0, rr = col === BLACK ? r : 8 - r;
  if (t === FU || t === KY) return rr === 0;
  if (t === KE) return rr <= 1;
  return false;
}

// move: from | to << 7 | promote << 14 ; drop: from = 80 + type (81..87)
const mFrom = m => m & 127, mTo = m => (m >> 7) & 127, mPromo = m => (m >> 14) & 1;
const isDrop = m => (m & 127) > 80;
const dropType = m => (m & 127) - 80;
const mkMove = (f, t, p) => f | (t << 7) | (p << 14);

// ===================================================================== zobrist
let seed = 0x2545F491;
function rnd32() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; }
const ZB_L = new Int32Array(81 * 32), ZB_H = new Int32Array(81 * 32);
for (let i = 0; i < ZB_L.length; i++) { ZB_L[i] = rnd32(); ZB_H[i] = rnd32(); }
const ZHD_L = new Int32Array(2 * 8 * 20), ZHD_H = new Int32Array(2 * 8 * 20);
for (let i = 0; i < ZHD_L.length; i++) { ZHD_L[i] = rnd32(); ZHD_H[i] = rnd32(); }
const ZSIDE_L = rnd32(), ZSIDE_H = rnd32();

// ===================================================================== evaluation layout
// perspective c: rotate board 180 for white, then mirror left-right so the own king is on files 9..5 side (col <= 4)
const NK_IDX = 45, NCLS = 28;
const KP_SIZE = NK_IDX * NCLS * 81;              // king-piece
const KH_BASE = KP_SIZE, KH_SIZE = NK_IDX * 2 * 7 * 18; // king-hand (thermometer)
const PS_BASE = KH_BASE + KH_SIZE, PS_SIZE = NCLS * 81;
const GH_BASE = PS_BASE + PS_SIZE, GH_SIZE = 2 * 7 * 18;
const TEMPO = GH_BASE + GH_SIZE;
const NFEAT = TEMPO + 1;
const EVAL_Q = 8; // stored weight = round(cp * EVAL_Q)

let W = null; // linear weights: Int16Array or Float32Array of NFEAT
let NN = null; // network: {H, W1, b1, W2, b2, W3, b3, W4, b4}
const NN_K = 600, NN_Q1 = 4096;
function parseNN(buf) {
  const dv = new DataView(buf);
  if (buf.byteLength < 12 || dv.getUint32(0, true) !== 0x314E4E53) return null; // 'SNN1'
  const H = dv.getInt32(4, true), NIN = dv.getInt32(8, true), H2 = 32, H3 = 32;
  if (NIN !== NFEAT - 1) return null;
  let off = 12;
  const q = new Int16Array(buf.slice(off, off + NIN * H * 2)); off += NIN * H * 2;
  const W1 = new Float32Array(NIN * H); for (let i = 0; i < W1.length; i++) W1[i] = q[i] / NN_Q1;
  const f = n => { const a = new Float32Array(buf.slice(off, off + n * 4)); off += n * 4; return a; };
  const b1 = f(H), W2 = f(H2 * 2 * H), b2 = f(H2), W3 = f(H3 * H2), b3 = f(H3), W4 = f(H3), b4 = f(1);
  const W2T = new Float64Array(W2.length); for (let k = 0; k < H2; k++) for (let j = 0; j < 2 * H; j++) W2T[j * H2 + k] = W2[k * 2 * H + j];
  const W3T = new Float64Array(W3.length); for (let k = 0; k < H3; k++) for (let j = 0; j < H2; j++) W3T[j * H3 + k] = W3[k * H2 + j];
  return { H, H2, H3, W1, b1, W2T, b2: Float64Array.from(b2), W3T, b3: Float64Array.from(b3), W4: Float64Array.from(W4), b4, h2: new Float64Array(H2), h3: new Float64Array(H3) };
}
function defaultWeights() {
  // simple material-only fallback (used until learned weights are loaded)
  const w = new Float32Array(NFEAT);
  const mat = [0, 90, 315, 405, 495, 855, 990, 540, 0, 540, 540, 540, 540, 945, 1395];
  const hmat = [0, 100, 350, 450, 550, 950, 1100, 600];
  for (let own = 0; own < 2; own++) {
    for (let t = 1; t <= 14; t++) for (let s = 0; s < 81; s++) w[PS_BASE + (own * 14 + t - 1) * 81 + s] = (own ? -1 : 1) * mat[t] * EVAL_Q / 2;
    for (let t = 1; t <= 7; t++) for (let n = 1; n <= 18; n++) if (n <= HAND_MAX[t]) w[GH_BASE + (own * 7 + t - 1) * 18 + n - 1] = (own ? -1 : 1) * hmat[t] * EVAL_Q / 2;
  }
  w[TEMPO] = 20 * EVAL_Q;
  return w;
}
W = defaultWeights();

// transformed square for perspective c with mirror flag
function tsq(c, s, mir) { if (c) s = 80 - s; if (mir) s = s - (s % 9) + (8 - (s % 9)); return s; }

// ===================================================================== position
class Position {
  constructor() {
    this.board = new Int8Array(81);
    this.hand = new Int8Array(16);   // c * 8 + type
    this.side = BLACK;
    this.king = new Int8Array(2);
    this.hl = 0; this.hh = 0;
    this.acc = new Float64Array(2);
    this.kidx = new Int16Array(2); this.mir = new Uint8Array(2);
    this.ply = 0;
    // undo stack
    const N = 1200;
    this.stCap = new Int8Array(N); this.stMove = new Int32Array(N);
    this.stHL = new Int32Array(N); this.stHH = new Int32Array(N);
    this.stA0 = new Float64Array(N); this.stA1 = new Float64Array(N);
    this.stCheck = new Uint8Array(N);
    this.sp = 0;
    // history of hashes for repetition (game + search)
    this.histL = new Int32Array(N); this.histH = new Int32Array(N); this.histChk = new Uint8Array(N);
    this.hn = 0; this.gameStart = 0;
    this.nnA = null; this.nnSt = null;
  }
  clone() {
    const p = new Position();
    p.setSfen(this.sfen());
    return p;
  }
  setStart() { this.setSfen('lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1'); }
  setSfen(sfen) {
    const parts = sfen.trim().split(/\s+/);
    this.board.fill(0); this.hand.fill(0);
    let r = 0, c = 0, prom = false;
    for (const ch of parts[0]) {
      if (ch === '/') { r++; c = 0; continue; }
      if (ch === '+') { prom = true; continue; }
      if (ch >= '1' && ch <= '9') { c += +ch; continue; }
      const up = ch.toUpperCase();
      let t = 'PLNSBRGK'.indexOf(up) + 1;
      if (prom) t += 8;
      prom = false;
      const col = ch === up ? BLACK : WHITE;
      this.board[r * 9 + c] = t + (col ? WF : 0);
      c++;
    }
    this.side = parts[1] === 'w' ? WHITE : BLACK;
    if (parts[2] && parts[2] !== '-') {
      let n = 0;
      for (const ch of parts[2]) {
        if (ch >= '0' && ch <= '9') { n = n * 10 + +ch; continue; }
        const up = ch.toUpperCase();
        const t = 'PLNSBRG'.indexOf(up) + 1;
        this.hand[(ch === up ? 0 : 8) + t] += n || 1; n = 0;
      }
    }
    this.ply = parts[3] ? (+parts[3] - 1) : 0;
    this.king[0] = this.king[1] = -1;
    for (let s = 0; s < 81; s++) { const p = this.board[s]; if (typeOf(p) === OU) this.king[colorOf(p)] = s; }
    this.computeHash(); this.refreshEval();
    this.sp = 0; this.hn = 0;
    this.pushHist();
    this.gameStart = 0;
  }
  sfen() {
    let s = '';
    for (let r = 0; r < 9; r++) {
      let e = 0;
      for (let c = 0; c < 9; c++) {
        const p = this.board[r * 9 + c];
        if (!p) { e++; continue; }
        if (e) { s += e; e = 0; }
        const t = typeOf(p);
        const ch = 'PLNSBRGK'[UNPROMOTE[t] - 1];
        if (t > OU) s += '+';
        s += colorOf(p) ? ch.toLowerCase() : ch;
      }
      if (e) s += e;
      if (r < 8) s += '/';
    }
    s += this.side ? ' w ' : ' b ';
    let h = '';
    for (const col of [0, 1]) for (const t of [HI, KA, KI, GI, KE, KY, FU]) {
      const n = this.hand[col * 8 + t]; if (!n) continue;
      const ch = 'PLNSBRG'[t - 1];
      h += (n > 1 ? n : '') + (col ? ch.toLowerCase() : ch);
    }
    return s + (h || '-') + ' ' + (this.ply + 1);
  }
  computeHash() {
    let l = 0, h = 0;
    for (let s = 0; s < 81; s++) { const p = this.board[s]; if (p) { l ^= ZB_L[s * 32 + p]; h ^= ZB_H[s * 32 + p]; } }
    for (let c = 0; c < 2; c++) for (let t = 1; t <= 7; t++) for (let n = 1; n <= this.hand[c * 8 + t]; n++) { l ^= ZHD_L[(c * 8 + t) * 20 + n]; h ^= ZHD_H[(c * 8 + t) * 20 + n]; }
    if (this.side) { l ^= ZSIDE_L; h ^= ZSIDE_H; }
    this.hl = l; this.hh = h;
  }
  pushHist() { this.histL[this.hn] = this.hl; this.histH[this.hn] = this.hh; this.histChk[this.hn] = this.inCheck() ? 1 : 0; this.hn++; }

  // ------------------------------------------------------------- evaluation
  setKingCache(c) {
    let k = this.king[c];
    if (k < 0) { this.kidx[c] = 0; this.mir[c] = 0; return; }
    if (c) k = 80 - k;
    const col = k % 9, mir = col > 4 ? 1 : 0;
    this.mir[c] = mir; this.kidx[c] = ((k / 9) | 0) * 5 + (mir ? 8 - col : col);
  }
  // contribution of piece p at absolute square s to perspective c
  pv(c, p, s) {
    const own = colorOf(p) === c ? 0 : 14;
    const cls = own + typeOf(p) - 1, ts = tsq(c, s, this.mir[c]);
    return W[(this.kidx[c] * NCLS + cls) * 81 + ts] + W[PS_BASE + cls * 81 + ts];
  }
  // contribution of n-th hand piece (thermometer step n) of color hc, type t
  hv(c, hc, t, n) {
    const own = hc === c ? 0 : 1, i = (own * 7 + t - 1) * 18 + n - 1;
    return W[KH_BASE + this.kidx[c] * 252 + i] + W[GH_BASE + i];
  }
  fullAcc(c) {
    this.setKingCache(c);
    let a = 0;
    for (let s = 0; s < 81; s++) { const p = this.board[s]; if (p && !(typeOf(p) === OU && colorOf(p) === c)) a += this.pv(c, p, s); }
    for (let hc = 0; hc < 2; hc++) for (let t = 1; t <= 7; t++) for (let n = 1; n <= this.hand[hc * 8 + t]; n++) a += this.hv(c, hc, t, n);
    return a;
  }
  refreshEval() {
    if (NN) { this.ensureNN(); this.nnRefresh(0); this.nnRefresh(1); return; }
    this.acc[0] = this.fullAcc(0); this.acc[1] = this.fullAcc(1);
  }
  evaluate() {
    if (NN) return this.nnEval();
    const v = (this.acc[0] - this.acc[1]) / EVAL_Q;
    return (this.side ? -v : v) + W[TEMPO] / EVAL_Q;
  }
  // ---- network evaluation
  ensureNN() { const n = 2 * NN.H; if (!this.nnA || this.nnA.length !== n) { this.nnA = new Float32Array(n); this.nnSt = new Float32Array(1200 * n); } }
  nnPiece(c, p, s, sg) {
    const H = NN.H, W1 = NN.W1, a = this.nnA, o = c * H;
    const cls = (colorOf(p) === c ? 0 : 14) + typeOf(p) - 1, ts = tsq(c, s, this.mir[c]);
    const r1 = ((this.kidx[c] * NCLS + cls) * 81 + ts) * H, r2 = (PS_BASE + cls * 81 + ts) * H;
    if (sg > 0) for (let j = 0; j < H; j++) a[o + j] += W1[r1 + j] + W1[r2 + j];
    else for (let j = 0; j < H; j++) a[o + j] -= W1[r1 + j] + W1[r2 + j];
  }
  nnHand(c, hc, t, n, sg) {
    const H = NN.H, W1 = NN.W1, a = this.nnA, o = c * H;
    const i = ((hc === c ? 0 : 1) * 7 + t - 1) * 18 + n - 1;
    const r1 = (KH_BASE + this.kidx[c] * 252 + i) * H, r2 = (GH_BASE + i) * H;
    if (sg > 0) for (let j = 0; j < H; j++) a[o + j] += W1[r1 + j] + W1[r2 + j];
    else for (let j = 0; j < H; j++) a[o + j] -= W1[r1 + j] + W1[r2 + j];
  }
  nnRefresh(c) {
    this.setKingCache(c);
    const H = NN.H, a = this.nnA, o = c * H;
    for (let j = 0; j < H; j++) a[o + j] = NN.b1[j];
    for (let s = 0; s < 81; s++) { const p = this.board[s]; if (p && !(typeOf(p) === OU && colorOf(p) === c)) this.nnPiece(c, p, s, 1); }
    for (let hc = 0; hc < 2; hc++) for (let t = 1; t <= 7; t++) for (let n = 1; n <= this.hand[hc * 8 + t]; n++) this.nnHand(c, hc, t, n, 1);
  }
  nnEval() {
    const N = NN, H = N.H, a = this.nnA, h2 = N.h2, H2 = N.H2, W2T = N.W2T;
    const so = this.side * H, no = (this.side ^ 1) * H;
    h2.set(N.b2);
    // first hidden layer: transposed weights, skipping inactive inputs (CReLU zeros)
    for (let j = 0; j < H; j++) {
      let v = a[so + j];
      if (v > 0) { if (v > 1) v = 1; const r = j * H2; for (let k = 0; k < H2; k++) h2[k] += W2T[r + k] * v; }
      v = a[no + j];
      if (v > 0) { if (v > 1) v = 1; const r = (H + j) * H2; for (let k = 0; k < H2; k++) h2[k] += W2T[r + k] * v; }
    }
    const W3T = N.W3T, H3 = N.H3, h3 = N.h3;
    h3.set(N.b3);
    for (let j = 0; j < H2; j++) {
      let v = h2[j];
      if (v > 0) { if (v > 1) v = 1; const r = j * H3; for (let k = 0; k < H3; k++) h3[k] += W3T[r + k] * v; }
    }
    let o = N.b4[0];
    for (let k = 0; k < H3; k++) { const z = h3[k]; if (z > 0) o += N.W4[k] * (z > 1 ? 1 : z); }
    let v = o * NN_K;
    return v > 20000 ? 20000 : v < -20000 ? -20000 : (v | 0);
  }
  // feature list for training: returns array of [index, sign] pairs flattened (from black's viewpoint, target = eval for black)
  features(out) {
    out.length = 0;
    for (let c = 0; c < 2; c++) {
      this.setKingCache(c);
      const sg = c ? -1 : 1;
      for (let s = 0; s < 81; s++) {
        const p = this.board[s]; if (!p || (typeOf(p) === OU && colorOf(p) === c)) continue;
        const own = colorOf(p) === c ? 0 : 14, cls = own + typeOf(p) - 1, ts = tsq(c, s, this.mir[c]);
        out.push((this.kidx[c] * NCLS + cls) * 81 + ts, sg, PS_BASE + cls * 81 + ts, sg);
      }
      for (let hc = 0; hc < 2; hc++) for (let t = 1; t <= 7; t++) for (let n = 1; n <= this.hand[hc * 8 + t]; n++) {
        const i = ((hc === c ? 0 : 1) * 7 + t - 1) * 18 + n - 1;
        out.push(KH_BASE + this.kidx[c] * 252 + i, sg, GH_BASE + i, sg);
      }
    }
    return out;
  }

  // NN input features for perspective c (indices into the first-layer rows)
  nnFeatures(c, out) {
    this.setKingCache(c);
    let n = 0;
    const kb = this.kidx[c] * NCLS, mir = this.mir[c];
    for (let s = 0; s < 81; s++) {
      const p = this.board[s]; if (!p || (typeOf(p) === OU && colorOf(p) === c)) continue;
      const cls = (colorOf(p) === c ? 0 : 14) + typeOf(p) - 1, ts = tsq(c, s, mir);
      out[n++] = (kb + cls) * 81 + ts; out[n++] = PS_BASE + cls * 81 + ts;
    }
    for (let hc = 0; hc < 2; hc++) for (let t = 1; t <= 7; t++) for (let k = 1; k <= this.hand[hc * 8 + t]; k++) {
      const i = ((hc === c ? 0 : 1) * 7 + t - 1) * 18 + k - 1;
      out[n++] = KH_BASE + this.kidx[c] * 252 + i; out[n++] = GH_BASE + i;
    }
    return n;
  }

  // ------------------------------------------------------------- attacks
  attacked(sq, by) {
    const b = this.board;
    for (let d = 0; d < 8; d++) {
      let s = NB[sq * 8 + d]; if (s < 0) continue;
      let p = b[s];
      const dd = OPPD[d];
      if (p) { if (colorOf(p) === by && (STEP[p * 8 + dd] || SLIDE[p * 8 + dd])) return true; continue; }
      s = NB[s * 8 + d];
      while (s >= 0) {
        p = b[s];
        if (p) { if (colorOf(p) === by && SLIDE[p * 8 + dd]) return true; break; }
        s = NB[s * 8 + d];
      }
    }
    const kf = KN_FROM[by][sq], kn = KE + (by ? WF : 0);
    for (let i = 0; i < kf.length; i++) if (b[kf[i]] === kn) return true;
    return false;
  }
  // count attackers (for eval-free SEE-lite / UI)
  attackers(sq, by) {
    const b = this.board, res = [];
    for (let d = 0; d < 8; d++) {
      let s = NB[sq * 8 + d]; if (s < 0) continue;
      let p = b[s]; const dd = OPPD[d];
      if (p) { if (colorOf(p) === by && (STEP[p * 8 + dd] || SLIDE[p * 8 + dd])) res.push(s); continue; }
      s = NB[s * 8 + d];
      while (s >= 0) { p = b[s]; if (p) { if (colorOf(p) === by && SLIDE[p * 8 + dd]) res.push(s); break; } s = NB[s * 8 + d]; }
    }
    const kf = KN_FROM[by][sq], kn = KE + (by ? WF : 0);
    for (let i = 0; i < kf.length; i++) if (b[kf[i]] === kn) res.push(kf[i]);
    return res;
  }
  // least valuable attacker of sq by color `by` (square or -1)
  lva(sq, by) {
    const b = this.board; let best = -1, bv = 1e9;
    for (let d = 0; d < 8; d++) {
      let s = NB[sq * 8 + d]; if (s < 0) continue;
      let p = b[s]; const dd = OPPD[d];
      if (p) { if (colorOf(p) === by && (STEP[p * 8 + dd] || SLIDE[p * 8 + dd])) { const v = VALUE[typeOf(p)]; if (v < bv) { bv = v; best = s; } } continue; }
      s = NB[s * 8 + d];
      while (s >= 0) { p = b[s]; if (p) { if (colorOf(p) === by && SLIDE[p * 8 + dd]) { const v = VALUE[typeOf(p)]; if (v < bv) { bv = v; best = s; } } break; } s = NB[s * 8 + d]; }
    }
    if (bv > VALUE[KE]) { const kf = KN_FROM[by][sq], kn = KE + (by ? WF : 0); for (let i = 0; i < kf.length; i++) if (b[kf[i]] === kn) { bv = VALUE[KE]; best = kf[i]; break; } }
    return best;
  }
  // after making m: value the opponent (now to move) can win by capturing on m's destination (<=0 good for the mover)
  seeAfterCheck(m) {
    const to = (m >> 7) & 127;
    if (!this.attacked(to, this.side)) return 0;
    const sq = this.lva(to, this.side); if (sq < 0) return 0;
    const mv = sq | (to << 7);
    const v = this.see(mv);
    return -v;
  }
  // static exchange evaluation of move m for the side to move
  see(m) {
    const b = this.board, us = this.side, from = m & 127, to = (m >> 7) & 127, drop = from > 80;
    let piece = drop ? (from - 80) + (us ? WF : 0) : b[from];
    const promo = !drop && ((m >> 14) & 1);
    if (promo) piece += 8;
    const cap = b[to];
    const gain = this.seeGain || (this.seeGain = new Int32Array(48));
    const rem = this.seeRem || (this.seeRem = new Int32Array(96));
    gain[0] = (cap ? VALUE[typeOf(cap)] : 0) + (promo ? VALUE[typeOf(piece)] - VALUE[typeOf(piece) - 8] : 0);
    const oldFrom = drop ? 0 : b[from];
    if (!drop) b[from] = 0;
    b[to] = piece;
    let curV = VALUE[typeOf(piece)], side = us ^ 1, d = 0, nr = 0;
    for (;;) {
      const sq = this.lva(to, side); if (sq < 0) break;
      d++; gain[d] = curV - gain[d - 1];
      if (Math.max(-gain[d - 1], gain[d]) < 0 || d >= 46) break;
      curV = VALUE[typeOf(b[sq])]; rem[nr++] = sq; rem[nr++] = b[sq]; b[sq] = 0; side ^= 1;
    }
    while (d > 0) { gain[d - 1] = -Math.max(-gain[d - 1], gain[d]); d--; }
    for (let i = 0; i < nr; i += 2) b[rem[i]] = rem[i + 1];
    b[to] = cap; if (!drop) b[from] = oldFrom;
    return gain[0];
  }
  inCheck(c = this.side) { const k = this.king[c]; return k >= 0 && this.attacked(k, c ^ 1); }

  // ------------------------------------------------------------- move generation (pseudo-legal; king safety checked later)
  // mode: 0 = all, 1 = captures (+ promotions of pawns/rook/bishop), 2 = all including non-promotions of FU/KA/HI
  gen(list, mode = 0) {
    const b = this.board, us = this.side, them = us ^ 1;
    let n = 0;
    const full = mode === 2, capOnly = mode === 1;
    for (let s = 0; s < 81; s++) {
      const p = b[s]; if (!p || colorOf(p) !== us) continue;
      const t = typeOf(p), cp = CAN_PROMOTE[t];
      const p8 = p * 8;
      for (let d = 0; d < 8; d++) {
        if (STEP[p8 + d]) {
          const to = NB[s * 8 + d];
          if (to >= 0) { const q = b[to]; if (!q || colorOf(q) !== us) n = this.addMove(list, n, s, to, t, cp, us, q, capOnly, full); }
        }
        if (SLIDE[p8 + d]) {
          let to = NB[s * 8 + d];
          while (to >= 0) {
            const q = b[to];
            if (q) { if (colorOf(q) !== us) n = this.addMove(list, n, s, to, t, cp, us, q, capOnly, full); break; }
            n = this.addMove(list, n, s, to, t, cp, us, 0, capOnly, full);
            to = NB[to * 8 + d];
          }
        }
      }
      if (t === KE) {
        const kt = KN_TO[us][s];
        for (let i = 0; i < kt.length; i++) { const to = kt[i], q = b[to]; if (!q || colorOf(q) !== us) n = this.addMove(list, n, s, to, t, 1, us, q, capOnly, full); }
      }
    }
    if (capOnly) return n;
    // drops
    const hb = us * 8;
    let pawnFiles = 0;
    if (this.hand[hb + FU]) for (let s = 0; s < 81; s++) if (b[s] === FU + (us ? WF : 0)) pawnFiles |= 1 << (s % 9);
    for (let t = 1; t <= 7; t++) {
      if (!this.hand[hb + t]) continue;
      const from = 80 + t;
      for (let s = 0; s < 81; s++) {
        if (b[s]) continue;
        if (t <= KE && deadEnd(us, t, s)) continue;
        if (t === FU && (pawnFiles >> (s % 9)) & 1) continue;
        list[n++] = from | (s << 7);
      }
    }
    return n;
  }
  addMove(list, n, s, to, t, cp, us, q, capOnly, full) {
    if (cp && (inZone(us, s) || inZone(us, to))) {
      if (!capOnly || q || t === FU || t === KA || t === HI) list[n++] = s | (to << 7) | (1 << 14);
      // non-promotion: FU/KA/HI only in full mode (practically never better)
      if (!deadEnd(us, t, to) && (full || t === KY || t === KE || t === GI) && (!capOnly || q)) list[n++] = s | (to << 7);
    } else if (!capOnly || q) list[n++] = s | (to << 7);
    return n;
  }

  // ------------------------------------------------------------- make / unmake
  doMove(m) {
    const b = this.board, us = this.side, them = us ^ 1, sp = this.sp;
    this.stMove[sp] = m; this.stHL[sp] = this.hl; this.stHH[sp] = this.hh;
    this.stA0[sp] = this.acc[0]; this.stA1[sp] = this.acc[1];
    const from = m & 127, to = (m >> 7) & 127;
    let hl = this.hl ^ ZSIDE_L, hh = this.hh ^ ZSIDE_H;
    let a0 = this.acc[0], a1 = this.acc[1];
    const nn = NN !== null;
    if (nn) this.nnSt.set(this.nnA, sp * 2 * NN.H);
    if (from > 80) {
      const t = from - 80, p = t + (us ? WF : 0), hi = us * 8 + t, n = this.hand[hi];
      hl ^= ZHD_L[hi * 20 + n]; hh ^= ZHD_H[hi * 20 + n];
      if (nn) { this.nnHand(0, us, t, n, -1); this.nnHand(1, us, t, n, -1); this.nnPiece(0, p, to, 1); this.nnPiece(1, p, to, 1); }
      else { a0 -= this.hv(0, us, t, n); a1 -= this.hv(1, us, t, n); a0 += this.pv(0, p, to); a1 += this.pv(1, p, to); }
      this.hand[hi] = n - 1;
      b[to] = p; hl ^= ZB_L[to * 32 + p]; hh ^= ZB_H[to * 32 + p];
      this.stCap[sp] = 0;
    } else {
      const p = b[from], cap = b[to];
      const np = (m >> 14) & 1 ? p + 8 : p;
      this.stCap[sp] = cap;
      const isKing = typeOf(p) === OU;
      if (cap) {
        hl ^= ZB_L[to * 32 + cap]; hh ^= ZB_H[to * 32 + cap];
        const ct = UNPROMOTE[typeOf(cap)], hi = us * 8 + ct, n = this.hand[hi] + 1;
        this.hand[hi] = n;
        hl ^= ZHD_L[hi * 20 + n]; hh ^= ZHD_H[hi * 20 + n];
        if (typeOf(cap) !== OU) {
          if (nn) {
            if (!(isKing && us === 0)) { this.nnPiece(0, cap, to, -1); this.nnHand(0, us, ct, n, 1); }
            if (!(isKing && us === 1)) { this.nnPiece(1, cap, to, -1); this.nnHand(1, us, ct, n, 1); }
          } else {
            if (!(isKing && us === 0)) { a0 -= this.pv(0, cap, to); a0 += this.hv(0, us, ct, n); }
            if (!(isKing && us === 1)) { a1 -= this.pv(1, cap, to); a1 += this.hv(1, us, ct, n); }
          }
        }
      }
      hl ^= ZB_L[from * 32 + p] ^ ZB_L[to * 32 + np]; hh ^= ZB_H[from * 32 + p] ^ ZB_H[to * 32 + np];
      b[from] = 0; b[to] = np;
      if (nn) {
        if (isKing) { this.king[us] = to; this.nnRefresh(us); this.nnPiece(them, p, from, -1); this.nnPiece(them, np, to, 1); }
        else { this.nnPiece(0, p, from, -1); this.nnPiece(0, np, to, 1); this.nnPiece(1, p, from, -1); this.nnPiece(1, np, to, 1); }
      } else if (isKing) {
        this.king[us] = to;
        // own perspective: full refresh; other perspective: enemy king is a piece
        if (us === 0) { a0 = this.fullAcc(0); a1 += this.pv(1, np, to) - this.pv(1, p, from); }
        else { a1 = this.fullAcc(1); a0 += this.pv(0, np, to) - this.pv(0, p, from); }
      } else {
        a0 += this.pv(0, np, to) - this.pv(0, p, from);
        a1 += this.pv(1, np, to) - this.pv(1, p, from);
      }
    }
    this.acc[0] = a0; this.acc[1] = a1;
    this.hl = hl; this.hh = hh;
    this.side = them; this.ply++; this.sp = sp + 1;
    this.histL[this.hn] = hl; this.histH[this.hn] = hh; this.histChk[this.hn] = 0; this.hn++;
  }
  undoMove() {
    const sp = --this.sp, m = this.stMove[sp], b = this.board;
    this.hn--; this.ply--;
    const them = this.side, us = them ^ 1;
    this.side = us;
    const from = m & 127, to = (m >> 7) & 127;
    if (from > 80) {
      b[to] = 0; this.hand[us * 8 + from - 80]++;
    } else {
      const np = b[to], p = (m >> 14) & 1 ? np - 8 : np, cap = this.stCap[sp];
      b[from] = p; b[to] = cap;
      if (cap) this.hand[us * 8 + UNPROMOTE[typeOf(cap)]]--;
      if (typeOf(p) === OU) { this.king[us] = from; this.setKingCache(us); }
    }
    this.hl = this.stHL[sp]; this.hh = this.stHH[sp];
    this.acc[0] = this.stA0[sp]; this.acc[1] = this.stA1[sp];
    if (NN) { const n = 2 * NN.H; this.nnA.set(this.nnSt.subarray(sp * n, sp * n + n)); }
  }
  // null move
  doNull() {
    const sp = this.sp;
    this.stMove[sp] = 0; this.stHL[sp] = this.hl; this.stHH[sp] = this.hh; this.stA0[sp] = this.acc[0]; this.stA1[sp] = this.acc[1];
    this.hl ^= ZSIDE_L; this.hh ^= ZSIDE_H; this.side ^= 1; this.sp++;
    this.histL[this.hn] = 0x7fffffff; this.histH[this.hn] = 0; this.histChk[this.hn] = 0; this.hn++;
  }
  undoNull() { const sp = --this.sp; this.hn--; this.side ^= 1; this.hl = this.stHL[sp]; this.hh = this.stHH[sp]; }

  // is the last move (just made) legal for the side that made it?
  lastMoveLegal(m) {
    const us = this.side ^ 1;
    const k = this.king[us];
    if (k >= 0 && this.attacked(k, this.side)) return false;
    // uchifuzume: pawn drop giving mate is illegal
    if ((m & 127) === 80 + FU) {
      const to = (m >> 7) & 127, ek = this.king[this.side];
      if (ek === (us === BLACK ? to - 9 : to + 9) && !this.hasLegalMove()) return false;
    }
    return true;
  }
  hasLegalMove() {
    const us = this.side, k = this.king[us], b = this.board;
    if (k >= 0) {
      const kp = OU + (us ? WF : 0);
      for (let d = 0; d < 8; d++) {
        const t = NB[k * 8 + d]; if (t < 0) continue;
        const q = b[t]; if (q && colorOf(q) === us) continue;
        b[k] = 0; b[t] = kp; const att = this.attacked(t, us ^ 1); b[t] = q; b[k] = kp;
        if (!att) return true;
      }
    }
    const list = this.hlBuf || (this.hlBuf = new Int32Array(1000));
    const n = this.gen(list, 0);
    for (let i = 0; i < n; i++) {
      const m = list[i];
      this.doMove(m);
      const k = this.king[this.side ^ 1], ok = k < 0 || !this.attacked(k, this.side);
      this.undoMove();
      if (ok) return true;
    }
    return false;
  }
  legalMoves(full = true) {
    const list = new Int32Array(1000);
    const n = this.gen(list, full ? 2 : 0), out = [];
    for (let i = 0; i < n; i++) { const m = list[i]; this.doMove(m); const ok = this.lastMoveLegal(m); this.undoMove(); if (ok) out.push(m); }
    return out;
  }
  isLegal(m) { return this.legalMoves(true).includes(m); }
  // mate in one for the side to move (moves that land next to the enemy king, or knight checks). Returns move or 0.
  mate1(buf) {
    const us = this.side, ek = this.king[us ^ 1]; if (ek < 0) return 0;
    const b = this.board;
    let n = 0;
    const targets = this.m1t || (this.m1t = new Int32Array(12));
    let nt = 0;
    for (let d = 0; d < 8; d++) { const t = NB[ek * 8 + d]; if (t >= 0) targets[nt++] = t; }
    const kf = KN_FROM[us][ek]; for (let i = 0; i < kf.length; i++) targets[nt++] = kf[i];
    for (let i = 0; i < nt; i++) {
      const t = targets[i], q = b[t];
      if (q && colorOf(q) === us) continue;
      if (!q) for (let tp = 2; tp <= 7; tp++) {          // drops (pawn-drop mate is illegal)
        if (!this.hand[us * 8 + tp] || (tp <= KE && deadEnd(us, tp, t))) continue;
        buf[n++] = (80 + tp) | (t << 7);
      }
      const at = this.attackers(t, us);
      for (let ai = 0; ai < at.length; ai++) { const f = at[ai];
        const p = b[f], tp = typeOf(p); if (tp === OU) continue;
        if (CAN_PROMOTE[tp] && (inZone(us, f) || inZone(us, t))) { buf[n++] = f | (t << 7) | (1 << 14); if (!deadEnd(us, tp, t)) buf[n++] = f | (t << 7); }
        else buf[n++] = f | (t << 7);
      }
    }
    for (let i = 0; i < n; i++) {
      const m = buf[i];
      this.doMove(m);
      const mk = this.king[us];
      const ok = (mk < 0 || !this.attacked(mk, this.side)) && this.inCheck() && !this.hasLegalMove();
      this.undoMove();
      if (ok) return m;
    }
    return 0;
  }
  // cheap pseudo-legality test for TT / killer moves
  isPseudo(m) {
    const b = this.board, us = this.side, f = m & 127, t = (m >> 7) & 127;
    if (t > 80 || f > 87) return false;
    const q = b[t]; if (q && colorOf(q) === us) return false;
    if (f > 80) {
      const tp = f - 80;
      if (q || !this.hand[us * 8 + tp] || (m >> 14) & 1) return false;
      if (tp <= KE && deadEnd(us, tp, t)) return false;
      if (tp === FU) { const c = t % 9, fp = FU + (us ? WF : 0); for (let r = 0; r < 9; r++) if (b[r * 9 + c] === fp) return false; }
      return true;
    }
    const p = b[f]; if (!p || colorOf(p) !== us) return false;
    const tp = typeOf(p), promo = (m >> 14) & 1;
    if (promo) { if (!CAN_PROMOTE[tp] || !(inZone(us, f) || inZone(us, t))) return false; }
    else if (deadEnd(us, tp, t)) return false;
    if (tp === KE) return KN_TO[us][f].includes(t);
    const p8 = p * 8;
    for (let d = 0; d < 8; d++) {
      if (STEP[p8 + d] && NB[f * 8 + d] === t) return true;
      if (SLIDE[p8 + d]) { let x = NB[f * 8 + d]; while (x >= 0) { if (x === t) return true; if (b[x]) break; x = NB[x * 8 + d]; } }
    }
    return false;
  }
  givesCheck(m) { this.doMove(m); const c = this.inCheck(); this.undoMove(); return c; }

  // repetition status for the current position: 0 none, else {count, perpetual check info}
  // returns number of earlier occurrences in history with same side to move
  repCount() {
    let c = 0;
    for (let i = this.hn - 3; i >= 0; i -= 2) if (this.histL[i] === this.hl && this.histH[i] === this.hh) c++;
    return c;
  }
  // entering-king declaration (27-point rule, CSA) for side to move
  canDeclare() {
    const us = this.side, k = this.king[us];
    if (k < 0 || !inZone(us, k) || this.inCheck()) return false;
    let pts = 0, cnt = 0;
    for (let s = 0; s < 81; s++) {
      const p = this.board[s]; if (!p || colorOf(p) !== us || typeOf(p) === OU || !inZone(us, s)) continue;
      cnt++; const t = UNPROMOTE[typeOf(p)]; pts += (t === KA || t === HI) ? 5 : 1;
    }
    for (let t = 1; t <= 7; t++) pts += this.hand[us * 8 + t] * ((t === KA || t === HI) ? 5 : 1);
    return cnt >= 10 && pts >= (us === BLACK ? 28 : 27);
  }

  // ------------------------------------------------------------- notation helpers
  toUsi(m) {
    const f = m & 127, t = (m >> 7) & 127;
    const sq = s => sqFile(s) + 'abcdefghi'[sqRank(s) - 1];
    if (f > 80) return 'PLNSBRG'[f - 81] + '*' + sq(t);
    return sq(f) + sq(t) + ((m >> 14) & 1 ? '+' : '');
  }
  fromUsi(u) {
    const sq = (a, b) => makeSq(+a, 'abcdefghi'.indexOf(b) + 1);
    if (u[1] === '*') { const t = 'PLNSBRG'.indexOf(u[0]) + 1; return (80 + t) | (sq(u[2], u[3]) << 7); }
    return sq(u[0], u[1]) | (sq(u[2], u[3]) << 7) | (u[4] === '+' ? 1 << 14 : 0);
  }
}

// ===================================================================== search
const MATE = 30000, INF = 32000, MAXPLY = 64;
const TT_BITS = 20, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
const ttKey = new Int32Array(TT_SIZE), ttMove = new Int32Array(TT_SIZE), ttData = new Int32Array(TT_SIZE); // data: score(16) | depth(8)<<16 | flag(2)<<24 | age(6)<<26
let ttAge = 0;
const F_EXACT = 1, F_LOWER = 2, F_UPPER = 3;
const LMR = new Int8Array(64 * 64); for (let d = 1; d < 64; d++) for (let n = 1; n < 64; n++) LMR[d * 64 + n] = Math.floor(0.6 + Math.log(d) * Math.log(n) / 2.0);
function ttClear() { ttKey.fill(0); ttMove.fill(0); ttData.fill(0); }

class Searcher {
  constructor(pos) {
    this.pos = pos;
    this.moveBuf = []; this.scoreBuf = [];
    for (let i = 0; i < MAXPLY + 32; i++) { this.moveBuf.push(new Int32Array(1000)); this.scoreBuf.push(new Int32Array(1000)); }
    this.killers = new Int32Array((MAXPLY + 32) * 2);
    this.history = new Int32Array(2 * 88 * 81 * 2);
    this.nodes = 0; this.stop = false; this.deadline = 0; this.nodeLimit = 0;
    this.pvTable = new Int32Array(MAXPLY * MAXPLY); this.pvLen = new Int32Array(MAXPLY);
    this.rootDepth = 1;
    this.useMate1 = true; this.useSee = true; this.seePrune = false; this.extAll = false; this.lmrLog = false;
    this.rootMate = false; this.rfpDepth = 3; this.rfpMargin = 120; this.nullAdapt = false; this.histMalus = false;
    this.triedQ = []; for (let i = 0; i < MAXPLY + 32; i++) this.triedQ.push(new Int32Array(1000));
    this.mateBuf = []; for (let i = 0; i < MAXPLY + 32; i++) this.mateBuf.push(new Int32Array(1000));
    this.quietBuf = []; this.quietScore = []; for (let i = 0; i < MAXPLY + 32; i++) { this.quietBuf.push(new Int32Array(1000)); this.quietScore.push(new Int32Array(1000)); }
  }
  timeUp() {
    if ((this.nodes & 1023) === 0) {
      if (this.deadline && Date.now() > this.deadline) this.stop = true;
      if (this.nodeLimit && this.nodes > this.nodeLimit) this.stop = true;
    }
    return this.stop;
  }
  store(depth, score, flag, move, ply) {
    const pos = this.pos, i = pos.hl & TT_MASK;
    if (ttKey[i] === pos.hh || ((ttData[i] >> 16) & 255) <= depth + 2 || ((ttData[i] >>> 26) !== ttAge)) {
      if (score > MATE - MAXPLY) score += ply; else if (score < -MATE + MAXPLY) score -= ply;
      if (!move && ttKey[i] === pos.hh) move = ttMove[i];
      ttKey[i] = pos.hh; ttMove[i] = move;
      ttData[i] = (score & 0xffff) | ((depth & 255) << 16) | (flag << 24) | (ttAge << 26);
    }
  }
  // repetition check within search: returns null if no repetition, else score from side-to-move's view
  repetition(ply) {
    const pos = this.pos, hl = pos.hl, hh = pos.hh;
    const lim = Math.max(0, pos.hn - 1 - 32);
    for (let i = pos.hn - 5; i >= lim; i -= 2) {
      if (pos.histL[i] === hl && pos.histH[i] === hh) {
        // perpetual check: if every position with us to move since then had us in check → opponent was checking
        let usChecked = true, themChecked = true;
        for (let j = i + 2; j < pos.hn; j += 2) if (!pos.histChk[j]) { usChecked = false; break; }
        for (let j = i + 1; j < pos.hn; j += 2) if (!pos.histChk[j]) { themChecked = false; break; }
        if (usChecked) return MATE - ply - 1;      // opponent gave perpetual check → loses
        if (themChecked) return -MATE + ply + 1;   // we gave perpetual check
        return 0;
      }
    }
    return null;
  }
  orderMoves(moves, scores, n, ttm, ply) {
    const b = this.pos.board, us = this.pos.side;
    const k0 = this.killers[ply * 2], k1 = this.killers[ply * 2 + 1];
    for (let i = 0; i < n; i++) {
      const m = moves[i];
      if (m === ttm) { scores[i] = 1 << 30; continue; }
      const f = m & 127, t = (m >> 7) & 127, cap = b[t];
      let sc;
      if (cap) { const sv = this.useSee ? this.pos.see(m) : 0; sc = sv < 0 ? -1e7 + sv : 1e8 + VALUE[typeOf(cap)] * 16 - (f > 80 ? 0 : VALUE[typeOf(b[f])] >> 4); }
      else if ((m >> 14) & 1) sc = 9e7 + VALUE[typeOf(b[f]) + 8] - VALUE[typeOf(b[f])];
      else if (m === k0) sc = 8e7 + 2;
      else if (m === k1) sc = 8e7 + 1;
      else sc = this.history[((us * 88 + f) * 81 + t) * 2 + ((m >> 14) & 1)];
      scores[i] = sc;
    }
  }
  pick(moves, scores, n, i) {
    let bi = i, bs = scores[i];
    for (let j = i + 1; j < n; j++) if (scores[j] > bs) { bs = scores[j]; bi = j; }
    if (bi !== i) { const tm = moves[i]; moves[i] = moves[bi]; moves[bi] = tm; const ts = scores[i]; scores[i] = scores[bi]; scores[bi] = ts; }
    return moves[i];
  }
  qsearch(alpha, beta, ply, qd) {
    this.nodes++;
    if (this.timeUp()) return 0;
    const pos = this.pos;
    const inChk = pos.inCheck();
    pos.histChk[pos.hn - 1] = inChk ? 1 : 0;
    if (ply >= MAXPLY + 20) return pos.evaluate();
    let best = -INF;
    if (!inChk) {
      const sp = pos.evaluate();
      if (sp >= beta) return sp;
      if (sp > alpha) alpha = sp;
      best = sp;
    }
    const moves = this.moveBuf[ply], scores = this.scoreBuf[ply];
    const n = pos.gen(moves, inChk ? 0 : 1);
    this.orderMoves(moves, scores, n, 0, ply);
    let legal = 0;
    for (let i = 0; i < n; i++) {
      const m = this.pick(moves, scores, n, i);
      if (!inChk) {
        const cap = pos.board[(m >> 7) & 127];
        // delta pruning
        if (cap && best + VALUE[typeOf(cap)] * 2 + 200 < alpha && !((m >> 14) & 1)) continue;
        // skip losing captures
        if (this.useSee) { if (pos.see(m) < 0) continue; }
        else if (cap && VALUE[typeOf(pos.board[m & 127])] > VALUE[typeOf(cap)] + 100 && pos.attacked((m >> 7) & 127, pos.side ^ 1)) continue;
      }
      pos.doMove(m);
      if (!pos.lastMoveLegal(m)) { pos.undoMove(); continue; }
      legal++;
      const v = -this.qsearch(-beta, -alpha, ply + 1, qd + 1);
      pos.undoMove();
      if (this.stop) return 0;
      if (v > best) { best = v; if (v > alpha) { alpha = v; if (v >= beta) return v; } }
    }
    if (inChk && !legal) return -MATE + ply;
    return best;
  }
  search(depth, alpha, beta, ply, pvNode, allowNull) {
    const pos = this.pos;
    this.pvLen[ply] = ply;
    if (depth <= 0) return this.qsearch(alpha, beta, ply, 0);
    this.nodes++;
    if (this.timeUp()) return 0;
    const inChk = pos.inCheck();
    pos.histChk[pos.hn - 1] = inChk ? 1 : 0;
    if (ply > 0) {
      const rep = this.repetition(ply);
      if (rep !== null) return rep;
      // mate distance pruning
      alpha = Math.max(alpha, -MATE + ply); beta = Math.min(beta, MATE - ply - 1);
      if (alpha >= beta) return alpha;
    }
    if (ply >= MAXPLY - 1) return pos.evaluate();
    // TT
    const ti = pos.hl & TT_MASK;
    let ttm = 0;
    if (ttKey[ti] === pos.hh) {
      ttm = ttMove[ti];
      const d = ttData[ti], td = (d >> 16) & 255, fl = (d >> 24) & 3;
      let ts = (d << 16) >> 16;
      if (ts > MATE - MAXPLY) ts -= ply; else if (ts < -MATE + MAXPLY) ts += ply;
      if (!pvNode && td >= depth && ply > 0) {
        if (fl === F_EXACT || (fl === F_LOWER && ts >= beta) || (fl === F_UPPER && ts <= alpha)) return ts;
      }
    }
    // mate in one
    if (!inChk && this.useMate1) {
      const mm = pos.mate1(this.mateBuf[ply]);
      if (mm) { const v = MATE - ply - 1; this.store(depth, v, F_EXACT, mm, ply); this.pvTable[ply * MAXPLY + ply] = mm; this.pvLen[ply] = ply + 1; return v; }
    }
    let staticEval = inChk ? -INF : pos.evaluate();
    // reverse futility
    if (!pvNode && !inChk && depth <= this.rfpDepth && staticEval - this.rfpMargin * depth >= beta && Math.abs(beta) < MATE - MAXPLY) return staticEval;
    // null move
    if (!pvNode && !inChk && allowNull && depth >= 3 && staticEval >= beta) {
      const R = this.nullAdapt ? 3 + ((depth / 5) | 0) + Math.min(2, ((staticEval - beta) / 250) | 0) : 2 + (depth >= 7 ? 1 : 0);
      pos.doNull();
      const v = -this.search(depth - 1 - R, -beta, -beta + 1, ply + 1, false, false);
      pos.undoNull();
      if (this.stop) return 0;
      if (v >= beta && v < MATE - MAXPLY) return v;
    }
    // internal iterative deepening
    if (!ttm && pvNode && depth >= 4) {
      this.search(depth - 2, alpha, beta, ply, true, false);
      if (ttKey[ti] === pos.hh) ttm = ttMove[ti];
    }
    const moves = this.moveBuf[ply], scores = this.scoreBuf[ply];
    const qmoves = this.quietBuf[ply], qscores = this.quietScore[ply];
    let best = -INF, bestMove = 0, legal = 0, nq = 0;
    const tq = this.triedQ[ply];
    const origAlpha = alpha;
    const us = pos.side;
    // staged generation: TT move, captures/promotions, then the rest
    let stage = 0, i1 = 0, n1 = 0, i2 = 0, n2 = 0;
    if (!(ttm && pos.isPseudo(ttm))) { ttm = 0; stage = 1; }
    for (;;) {
      let m;
      if (stage === 0) { m = ttm; stage = 1; }
      else if (stage === 1) {
        if (i1 === 0 && n1 === 0) { n1 = pos.gen(moves, 1); this.orderMoves(moves, scores, n1, 0, ply); if (!n1) { stage = 2; continue; } }
        if (i1 >= n1) { stage = 2; continue; }
        m = this.pick(moves, scores, n1, i1++);
        if (m === ttm) continue;
      } else {
        if (stage === 2) {
          const all = pos.gen(qmoves, 0); n2 = 0;
          const bb = pos.board;
          for (let k = 0; k < all; k++) {
            const x = qmoves[k], tx = (x >> 7) & 127;
            if (bb[tx] || x === ttm) continue;
            if ((x >> 14) & 1) { const tt = typeOf(bb[x & 127]); if (tt === FU || tt === KA || tt === HI) continue; }
            qmoves[n2++] = x;
          }
          this.orderMoves(qmoves, qscores, n2, 0, ply);
          stage = 3;
        }
        if (i2 >= n2) break;
        m = this.pick(qmoves, qscores, n2, i2++);
      }
      const to = (m >> 7) & 127, cap = pos.board[to], quiet = !cap && !((m >> 14) & 1);
      // futility pruning of quiet moves at frontier
      if (!pvNode && !inChk && quiet && legal > 0 && depth <= 2 && staticEval + 150 * depth + 100 <= alpha) {
        // still allow checks
        pos.doMove(m);
        const ok = pos.lastMoveLegal(m), chk = ok && pos.inCheck();
        pos.undoMove();
        if (!chk) continue;
      }
      // SEE pruning: quiet moves that hang the moved piece at shallow depth
      let seeV = 0;
      if (this.useSee && this.seePrune && !inChk && legal > 0 && depth <= 4 && !pvNode) {
        seeV = pos.see(m);
        if (seeV < -60 * depth) { pos.doMove(m); const chk = pos.lastMoveLegal(m) && pos.inCheck(); pos.undoMove(); if (!chk) continue; }
      }
      // late move pruning
      if (!pvNode && !inChk && quiet && depth <= 3 && legal > 6 + depth * depth * 3) {
        pos.doMove(m); const chk = pos.inCheck(); pos.undoMove();
        if (!chk) continue;
      }
      pos.doMove(m);
      if (!pos.lastMoveLegal(m)) { pos.undoMove(); continue; }
      legal++;
      const givesChk = pos.inCheck();
      const ext = givesChk && ply < this.rootDepth * 2 && (!this.useSee || this.extAll || pos.seeAfterCheck(m) >= 0) ? 1 : 0;
      let v;
      const nd = depth - 1 + ext;
      if (legal === 1) v = -this.search(nd, -beta, -alpha, ply + 1, pvNode, true);
      else {
        let r = 0;
        if (depth >= 3 && quiet && !inChk && !givesChk && legal > 3) {
          if (this.lmrLog) {
            r = LMR[Math.min(63, depth) * 64 + Math.min(63, legal)];
            if (m === this.killers[ply * 2] || m === this.killers[ply * 2 + 1]) r--;
            const h = this.history[((us * 88 + (m & 127)) * 81 + to) * 2 + ((m >> 14) & 1)];
            if (h > 2000) r--; else if (h === 0) r++;
          } else r = 1 + (legal > 8 ? 1 : 0) + (depth >= 8 ? 1 : 0);
          if (pvNode) r--;
          if (r < 0) r = 0;
          if (r > depth - 2) r = depth - 2;
        }
        v = -this.search(nd - r, -alpha - 1, -alpha, ply + 1, false, true);
        if (v > alpha && r) v = -this.search(nd, -alpha - 1, -alpha, ply + 1, false, true);
        if (v > alpha && v < beta) v = -this.search(nd, -beta, -alpha, ply + 1, true, true);
      }
      pos.undoMove();
      if (this.stop) return 0;
      if (quiet && nq < 1000) tq[nq++] = m;
      if (v > best) {
        best = v; bestMove = m;
        if (v > alpha) {
          alpha = v;
          // pv
          this.pvTable[ply * MAXPLY + ply] = m;
          for (let j = ply + 1; j < this.pvLen[ply + 1]; j++) this.pvTable[ply * MAXPLY + j] = this.pvTable[(ply + 1) * MAXPLY + j];
          this.pvLen[ply] = Math.max(ply + 1, this.pvLen[ply + 1]);
          if (v >= beta) {
            if (quiet) {
              if (this.killers[ply * 2] !== m) { this.killers[ply * 2 + 1] = this.killers[ply * 2]; this.killers[ply * 2] = m; }
              const hi = ((us * 88 + (m & 127)) * 81 + to) * 2 + ((m >> 14) & 1);
              this.history[hi] += depth * depth; if (this.history[hi] > 1e6) for (let k = 0; k < this.history.length; k++) this.history[k] >>= 1;
              if (this.histMalus) for (let k = 0; k < nq; k++) { const x = tq[k]; if (x === m) continue; const hx = ((us * 88 + (x & 127)) * 81 + ((x >> 7) & 127)) * 2 + ((x >> 14) & 1); this.history[hx] -= depth * depth; if (this.history[hx] < -1e6) this.history[hx] = -1e6; }
            }
            break;
          }
        }
      }
    }
    if (!legal) return -MATE + ply; // checkmate or no legal moves = loss
    this.store(depth, best, best >= beta ? F_LOWER : best > origAlpha ? F_EXACT : F_UPPER, bestMove, ply);
    return best;
  }
  rootSearch(opts = {}) {
    const pos = this.pos;
    const t0 = Date.now();
    this.stop = false; this.nodes = 0;
    this.deadline = opts.time ? t0 + opts.time : 0;
    this.nodeLimit = opts.nodes || 0;
    ttAge = (ttAge + 1) & 31;
    this.killers.fill(0);
    for (let k = 0; k < this.history.length; k++) this.history[k] >>= 2;
    const maxDepth = opts.depth || 40;
    let legal = pos.legalMoves(false);
    if (opts.exclude) legal = legal.filter(m => !opts.exclude.includes(m));
    if (!legal.length) return { move: 0, score: -MATE, depth: 0, pv: [], nodes: 0 };
    // short check-only mate search at the root: play a found mate immediately
    if (this.rootMate && !opts.exclude && !opts.noMate) {
      const r = solveMate(pos, 9, opts.mateNodes || 60000);
      if (r && r.mate > 0 && legal.includes(r.pv[0])) return { move: r.pv[0], score: MATE - r.mate, depth: r.mate, pv: r.pv, nodes: r.nodes, time: Date.now() - t0, rootMoves: [{ m: r.pv[0], s: MATE - r.mate }] };
    }
    // root move list with scores
    let rootMoves = legal.map(m => ({ m, s: -INF }));
    let best = { move: legal[0], score: 0, depth: 0, pv: [legal[0]] };
    let prevScore = 0;
    for (let depth = 1; depth <= maxDepth; depth++) {
      this.rootDepth = depth;
      let alpha = -INF, beta = INF, delta = 60;
      if (depth >= 4) { alpha = prevScore - delta; beta = prevScore + delta; }
      let score;
      for (;;) {
        score = this.searchRoot(rootMoves, depth, alpha, beta);
        if (this.stop) break;
        if (score <= alpha) { alpha = Math.max(-INF, alpha - delta); delta *= 2; continue; }
        if (score >= beta) { beta = Math.min(INF, beta + delta); delta *= 2; continue; }
        break;
      }
      if (this.stop && depth > 1) break;
      rootMoves.sort((a, b) => b.s - a.s);
      prevScore = score;
      const pv = [];
      for (let j = 0; j < this.pvLen[0]; j++) pv.push(this.pvTable[j]);
      if (!pv.length || pv[0] !== rootMoves[0].m) pv.splice(0, pv.length, rootMoves[0].m);
      best = { move: rootMoves[0].m, score, depth, pv, nodes: this.nodes, time: Date.now() - t0, rootMoves: rootMoves.map(r => ({ m: r.m, s: r.s })) };
      if (opts.onDepth) opts.onDepth(best);
      if (Math.abs(score) > MATE - MAXPLY && depth > 3) break;
      if (this.deadline && Date.now() - t0 > (this.deadline - t0) * 0.55) break;
      if (legal.length === 1 && depth >= 2) break;
    }
    best.nodes = this.nodes; best.time = Date.now() - t0;
    return best;
  }
  searchRoot(rootMoves, depth, alpha, beta) {
    const pos = this.pos;
    let best = -INF, first = true;
    this.pvLen[0] = 0;
    for (const rm of rootMoves) {
      const m = rm.m;
      pos.doMove(m);
      const chk = pos.inCheck();
      const nd = depth - 1 + (chk ? 1 : 0);
      let v;
      if (first) v = -this.search(nd, -beta, -alpha, 1, true, true);
      else {
        v = -this.search(nd, -alpha - 1, -alpha, 1, false, true);
        if (v > alpha && v < beta) v = -this.search(nd, -beta, -alpha, 1, true, true);
      }
      pos.undoMove();
      if (this.stop) return best;
      rm.s = first || v > alpha ? v : -INF + 1;
      if (v > best) {
        best = v;
        if (v > alpha) {
          alpha = v;
          this.pvTable[0] = m;
          for (let j = 1; j < this.pvLen[1]; j++) this.pvTable[j] = this.pvTable[MAXPLY + j];
          this.pvLen[0] = Math.max(1, this.pvLen[1]);
          // move to front
          const idx = rootMoves.indexOf(rm);
          if (idx > 0) { rootMoves.splice(idx, 1); rootMoves.unshift(rm); }
          if (v >= beta) return v;
        }
      }
      first = false;
    }
    return best;
  }
  // evaluate every root move with a full window (for hints / lesson checks)
  analyze(opts = {}) {
    const pos = this.pos, t0 = Date.now();
    const legal = pos.legalMoves(false);
    const res = legal.map(m => ({ m, s: 0, d: 0 }));
    const maxDepth = opts.depth || 30;
    this.stop = false; this.nodes = 0; this.deadline = opts.time ? t0 + opts.time : 0; this.nodeLimit = opts.nodes || 0;
    ttAge = (ttAge + 1) & 31;
    for (let depth = 1; depth <= maxDepth; depth++) {
      this.rootDepth = depth;
      const tmp = [];
      for (const r of res) {
        pos.doMove(r.m);
        const chk = pos.inCheck();
        const v = -this.search(depth - 1 + (chk ? 1 : 0), -INF, INF, 1, true, true);
        pos.undoMove();
        if (this.stop) break;
        tmp.push(v);
      }
      if (this.stop && depth > 1) break;
      tmp.forEach((v, i) => { res[i].s = v; res[i].d = depth; });
      res.sort((a, b) => b.s - a.s);
      if (opts.onDepth) opts.onDepth(res.map(r => ({ ...r })), depth);
      if (this.stop) break;
    }
    return res;
  }
}

// ===================================================================== mate solver (attacker = side to move)
// returns {mate: plies, pv:[...]} or null. Simple iterative-deepening AND/OR search with check-only attacker moves.
function solveMate(pos, maxPly, nodeLimit = 2e6) {
  let nodes = 0;
  const bufs = []; for (let i = 0; i <= maxPly + 2; i++) bufs.push(new Int32Array(1000));
  const noMate = new Map();   // key -> max depth proven insufficient (OR nodes)
  const mated = new Map();    // key -> min depth proven sufficient (OR nodes), value [depth, move]
  const key = () => pos.hl + ':' + pos.hh;
  function or(d, ply, pv) {
    if (++nodes > nodeLimit) throw 'limit';
    const k = key();
    const nm = noMate.get(k); if (nm !== undefined && nm >= d) return false;
    const list = bufs[ply], n = pos.gen(list, 2);
    // try moves to squares near the king / drops first
    for (let i = 0; i < n; i++) {
      const m = list[i];
      pos.doMove(m);
      if (!pos.inCheck() || !pos.lastMoveLegal(m)) { pos.undoMove(); continue; }
      const sub = [];
      const ok = and(d - 1, ply + 1, sub);
      pos.undoMove();
      if (ok) { pv.push(m, ...sub); return true; }
    }
    noMate.set(k, d);
    return false;
  }
  function and(d, ply, pv) {
    if (++nodes > nodeLimit) throw 'limit';
    const list = bufs[ply], n = pos.gen(list, 2);
    let legal = 0, longest = null;
    const moves = Array.from(list.subarray(0, n));
    for (const m of moves) {
      pos.doMove(m);
      if (!pos.lastMoveLegal(m)) { pos.undoMove(); continue; }
      legal++;
      if (d <= 0) { pos.undoMove(); return false; }
      const sub = [];
      const ok = or(d - 1, ply + 1, sub);
      pos.undoMove();
      if (!ok) return false;
      if (!longest || sub.length > longest.sub.length || (sub.length === longest.sub.length && isDrop(longest.m) && !isDrop(m))) longest = { m, sub };
    }
    if (!legal) return true;
    pv.push(longest.m, ...longest.sub);
    return true;
  }
  const sp0 = pos.sp, hn0 = pos.hn;
  try {
    for (let d = 1; d <= maxPly; d += 2) {
      const pv = [];
      if (or(d, 0, pv)) return { mate: d, pv, nodes };
    }
  } catch (e) {
    while (pos.sp > sp0) pos.undoMove();   // unwind moves made before the node limit hit
    if (e !== 'limit') throw e;
    return { mate: -1, nodes };
  }
  return null;
}

// defender's best reply in a tsume line: longest mate, drops (likely futile interpositions) last. null = escapes.
function tsumeReply(pos, remain, nodeLimit = 400000) {
  const replies = pos.legalMoves(true);
  let best = null, bestLen = -1, bestDrop = true;
  for (const m of replies) {
    pos.doMove(m);
    const r = solveMate(pos, Math.max(1, remain - 1), nodeLimit);
    pos.undoMove();
    if (!r) return null;                       // this reply escapes: the attacker's move was wrong
    const len = r.mate < 0 ? remain : r.mate;  // unknown (budget) -> assume long
    const drop = isDrop(m);
    if (len > bestLen || (len === bestLen && bestDrop && !drop)) { best = m; bestLen = len; bestDrop = drop; }
  }
  return best;
}

// ===================================================================== exports / worker glue
const api = {
  FU, KY, KE, GI, KA, HI, KI, OU, TO, NY, NK, NG, UM, RY, WF, BLACK, WHITE, MATE, INF,
  colorOf, typeOf, UNPROMOTE, CAN_PROMOTE, VALUE, mFrom, mTo, mPromo, isDrop, dropType, mkMove, sqFile, sqRank, makeSq,
  inZone, deadEnd, NFEAT, EVAL_Q, KP_SIZE, KH_BASE, PS_BASE, GH_BASE, TEMPO,
  Position, Searcher, solveMate, tsumeReply, ttClear,
  setWeights(w) { W = w; NN = null; },
  setNN(buf) { NN = buf ? parseNN(buf) : null; return !!NN; },
  parseNN, useNN(nn) { NN = nn; },
  hasNN() { return !!NN; },
  getWeights() { return W; },
  defaultWeights,
};
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.ShogiEngine = api;

// ---------------------------------------------------------------- worker
if (typeof self !== 'undefined' && typeof window === 'undefined' && typeof module === 'undefined') {
  const pos = new Position();
  const se = new Searcher(pos);
  // WebAssembly build of the same search (engine.c): identical results, faster. Falls back to JS if unavailable.
  let X = null, wProgress = null, wAProgress = null, nueReady = false, nueCur = false;
  // WebAssembly SIMD (needed for the NNUE evaluation to be fast): engine_simd.wasm + nnue.bin.gz, otherwise engine.wasm with the linear evaluation
  const simdOK = (() => { try { return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])); } catch (e) { return false; } })();
  async function loadNNUE(x) {
    if (typeof DecompressionStream === 'undefined') return;
    const res = await fetch(new URL('nnue.bin.gz' + (self.location.search || ''), self.location.href));
    if (!res.ok) return;
    let buf = new Uint8Array(await res.arrayBuffer());
    if (buf[0] === 0x1f && buf[1] === 0x8b) buf = new Uint8Array(await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    if (dv.getUint32(0, true) !== 0x5145554E) return;
    const H = dv.getInt32(4, true), NIN = dv.getInt32(8, true), b = buf.buffer;
    let o = buf.byteOffset + 12;
    new Int16Array(x.memory.buffer, x.nue_w1_ptr(), NIN * H).set(new Int16Array(b.slice(o, o + NIN * H * 2))); o += NIN * H * 2;
    new Int32Array(x.memory.buffer, x.nue_b1_ptr(), H).set(new Int32Array(b.slice(o, o + H * 4))); o += H * 4;
    new Int16Array(x.memory.buffer, x.nue_w2_ptr(), 2 * H).set(new Int16Array(b.slice(o, o + H * 4))); o += H * 4;
    x.nue_set_b2(dv.getInt32(o - buf.byteOffset, true));
    nueReady = true;
  }
  // the NNUE evaluation for normal play, hints and analysis; the beginner levels (noise) keep the linear evaluation they were tuned with
  function nueUse(on) { on = !!(on && nueReady); if (on !== nueCur) { X.nue_enable(on ? 1 : 0); X.tt_clear(); nueCur = on; } }
  try {
    const url = new URL((simdOK ? 'engine_simd.wasm' : 'engine.wasm') + (self.location.search || ''), self.location.href);
    WebAssembly.instantiateStreaming(fetch(url), { env: { now: () => Date.now(), progress: (d, s, n, p, l) => wProgress && wProgress(d, s, n, p, l), aprogress: (d, n, mp, sp) => wAProgress && wAProgress(d, n, mp, sp) } })
      .then(r => { const x = r.instance.exports; x.init(); X = x; new Int16Array(X.memory.buffer, X.weights_ptr(), NFEAT).set(W instanceof Int16Array ? W : Int16Array.from(W)); if (simdOK && x.nue_enable) loadNNUE(x).catch(() => { nueReady = false; }); })
      .catch(() => { X = null; });
  } catch (e) { X = null; }
  function wsetup(d) {
    const p = new Position(); p.setSfen(d.sfen);
    const b = new Int8Array(X.memory.buffer, X.setup_ptr(), 98);
    b.set(p.board, 0); b.set(p.hand, 81); b[97] = p.side; X.set_position();
    for (const u of d.moves || []) X.play_move(p.fromUsi(u));
  }
  const useWasm = () => X && !NN;
  function wasmAnalyze(o, onDepth) {
    wAProgress = onDepth ? (depth, n, mp, sp) => { const ms = new Int32Array(X.memory.buffer, mp, n), ss = new Float64Array(X.memory.buffer, sp, n); onDepth(Array.from(ms, (m, i) => ({ m, s: ss[i] })), depth); } : null;
    const n = X.analyze(o.time || 0, o.depth || 0, o.nodes || 0);
    wAProgress = null;
    const ms = new Int32Array(X.memory.buffer, X.ana_moves(), n), ss = new Float64Array(X.memory.buffer, X.ana_scores(), n), ds = new Int32Array(X.memory.buffer, X.ana_depths(), n);
    return Array.from(ms, (m, i) => ({ m, s: ss[i], d: ds[i] }));
  }
  function setup(d) {
    pos.setSfen(d.sfen);
    for (const u of d.moves || []) { pos.doMove(pos.fromUsi(u)); pos.histChk[pos.hn - 1] = pos.inCheck() ? 1 : 0; }
    pos.sp = 0; // undo stack for game moves is not needed by the search
  }
  self.onmessage = e => {
    const d = e.data;
    if (d.type === 'weights') {
      const nn = parseNN(d.buffer);
      if (nn) NN = nn;
      else { const w = new Int16Array(d.buffer); if (w.length === NFEAT) { W = w; if (X) new Int16Array(X.memory.buffer, X.weights_ptr(), NFEAT).set(W); } }
      return;
    }
    if (d.type === 'think') {
      setup(d);
      const o = d.opts || {};
      if (o.noise) {
        // weak levels: score every root move with a shallow full-window search, then pick softly among near-best moves
        const list = useWasm() ? (nueUse(false), wsetup(d), wasmAnalyze({ depth: o.depth || 1 })) : se.analyze({ depth: o.depth || 1 });
        if (!list.length) { self.postMessage({ type: 'result', id: d.id, move: null, score: -MATE, depth: 0, pv: [] }); return; }
        // beginner personality: likes captures and checks a little more than they are worth
        if (o.greedy) {
          const p2 = new Position(); p2.setSfen(d.sfen); for (const u of d.moves || []) { p2.doMove(p2.fromUsi(u)); p2.sp = 0; }
          for (const r of list) {
            const cap = isDrop(r.m) ? 0 : p2.board[mTo(r.m)];
            p2.doMove(r.m); const chk = p2.inCheck(); p2.undoMove();
            if (Math.abs(r.s) < MATE - 100) r.s += (cap ? VALUE[typeOf(cap)] * 0.25 : 0) + (chk ? 60 : 0);
          }
          list.sort((a, b) => b.s - a.s);
        }
        const top = list[0].s;
        const pool = list.filter(r => r.s >= top - o.noise && !(top < MATE - 100 && r.s < -MATE + 100));
        if (!pool.length) pool.push(list[0]);
        let tot = 0; const ws = pool.map(r => { const w = Math.exp((r.s - top) / Math.max(1, o.noise / 4)); tot += w; return w; });
        let x = Math.random() * tot, pick = pool[0];
        for (let i = 0; i < pool.length; i++) { x -= ws[i]; if (x <= 0) { pick = pool[i]; break; } }
        // never miss a mate-in-one / never walk into an immediate mate at the weakest levels
        if (top > MATE - 100) pick = list[0];
        self.postMessage({ type: 'result', id: d.id, move: pos.toUsi(pick.m), score: pick.s, depth: o.depth || 1, pv: [pos.toUsi(pick.m)], nodes: se.nodes, time: 0 });
        return;
      }
      if (useWasm()) {
        nueUse(!o.linear); wsetup(d);
        wProgress = (depth, score, nodes, pp, pl) => self.postMessage({ type: 'progress', id: d.id, depth, score, pv: Array.from(new Int32Array(X.memory.buffer, pp, pl), m => pos.toUsi(m)), nodes });
        const t0 = Date.now();
        const mv = X.root_search(o.time || 0, o.depth || 0, o.nodes || 0);
        wProgress = null;
        const r = new Int32Array(X.memory.buffer, X.res_ptr(), 4 + 64);
        self.postMessage({ type: 'result', id: d.id, move: mv ? pos.toUsi(mv) : null, score: X.res_score(), depth: r[1], pv: Array.from(r.subarray(4, 4 + r[3]), m => pos.toUsi(m)), nodes: r[2], time: Date.now() - t0, wasm: true, nnue: nueCur });
        return;
      }
      const res = se.rootSearch({
        time: o.time, depth: o.depth, nodes: o.nodes,
        onDepth: r => self.postMessage({ type: 'progress', id: d.id, depth: r.depth, score: r.score, pv: r.pv.map(m => pos.toUsi(m)), nodes: r.nodes }),
      });
      self.postMessage({ type: 'result', id: d.id, move: res.move ? pos.toUsi(res.move) : null, score: res.score, depth: res.depth, pv: (res.pv || []).map(m => pos.toUsi(m)), nodes: res.nodes, time: res.time });
      return;
    }
    if (d.type === 'tsumeDefend') {
      // tsume v2: the defender's reply after an attacker's check that may be off the solution. mate = true when mate in
      // d.remain plies is still forced (reply = the longest defence, drops last as in tsumeReply); false when some reply
      // escapes (reply = that escape, a non-drop if there is one)
      setup(d);
      const replies = pos.legalMoves(true);
      let esc = null, best = null, bestLen = -1, bestDrop = true;
      for (const m of replies) {
        const drop = isDrop(m);
        if (esc && drop) continue;            // already escaping: only look for a non-drop escape
        pos.doMove(m);
        const r = d.remain > 1 ? solveMate(pos, d.remain - 1, 400000) : null;
        pos.undoMove();
        if (!r) { if (!esc || !drop) esc = m; if (!drop) break; continue; }
        if (esc) continue;
        const len = r.mate < 0 ? d.remain : r.mate;
        if (len > bestLen || (len === bestLen && bestDrop && !drop)) { best = m; bestLen = len; bestDrop = drop; }
      }
      const rep = esc || best || replies[0];
      self.postMessage({ type: 'tsume', id: d.id, reply: rep ? pos.toUsi(rep) : null, mate: !esc });
      return;
    }
    if (d.type === 'tsumeReply') {
      // defender to move after the attacker's move; find the longest defence, or report that mate is gone
      setup(d);
      const r = tsumeReply(pos, d.remain);
      self.postMessage({ type: 'tsume', id: d.id, reply: r ? pos.toUsi(r) : null });
      return;
    }
    if (d.type === 'analyze') {
      setup(d);
      const o = d.opts || {};
      const res = (useWasm() ? (nueUse(true), wsetup(d), wasmAnalyze) : (oo, cb) => se.analyze({ ...oo, onDepth: cb }))({ time: o.time, depth: o.depth }, (list, depth) => self.postMessage({ type: 'analysisProgress', id: d.id, depth, list: list.slice(0, o.top || 99).map(r => ({ move: pos.toUsi(r.m), score: r.s })) }));
      self.postMessage({ type: 'analysis', id: d.id, list: res.slice(0, o.top || 99).map(r => ({ move: pos.toUsi(r.m), score: r.s, depth: r.d })) });
      return;
    }
    if (d.type === 'multipv') {
      // review box: the best few moves with their lines (each search leaves out the moves already found), best first
      setup(d);
      const o = d.opts || {}, n = Math.min(o.n || 4, pos.legalMoves(false).length), ex = [], out = [];
      for (let k = 0; k < n; k++) {
        const ms = (o.time || 700) * (k ? 0.7 : 1);
        let r;
        setup(d);
        if (useWasm()) {
          nueUse(true); wsetup(d);
          if (ex.length) new Int32Array(X.memory.buffer, X.exclude_ptr(), ex.length).set(ex);
          X.set_exclude(ex.length);
          const mv = X.root_search(ms, 0, 0);
          if (!mv) break;
          const rr = new Int32Array(X.memory.buffer, X.res_ptr(), 4 + 64);
          r = { m: mv, score: X.res_score(), pv: Array.from(rr.subarray(4, 4 + rr[3])) };
        } else {
          const res = se.rootSearch({ time: ms, exclude: ex.slice() });
          if (!res.move) break;
          r = { m: res.move, score: res.score, pv: res.pv && res.pv.length ? res.pv : [res.move] };
        }
        if (r.pv[0] !== r.m) r.pv = [r.m];
        ex.push(r.m);
        out.push({ move: pos.toUsi(r.m), score: r.score, pv: r.pv.slice(0, 10).map(m => pos.toUsi(m)) });
        self.postMessage({ type: 'progress', id: d.id, list: out.slice() });
      }
      // short lines are extended move by move with quick searches (6-8 moves are shown)
      for (const e of out) {
        for (let g = 0; e.pv.length < 7 && g < 7; g++) {
          const d2 = { sfen: d.sfen, moves: (d.moves || []).concat(e.pv) };
          let mv = 0;
          if (useWasm()) { wsetup(d2); X.set_exclude(0); mv = X.root_search(110, 0, 0); }
          else { setup(d2); const res = se.rootSearch({ time: 110 }); mv = res.move; }
          if (!mv) break;
          setup(d2); const u = pos.toUsi(mv);
          if (!pos.legalMoves(true).includes(mv)) break;
          e.pv.push(u);
        }
        self.postMessage({ type: 'progress', id: d.id, list: out.slice() });
      }
      self.postMessage({ type: 'result', id: d.id, list: out });
      return;
    }
    if (d.type === 'mate') {
      setup(d);
      const r = solveMate(pos, d.maxPly || 7, d.nodes || 300000);
      self.postMessage({ type: 'mate', id: d.id, mate: r ? r.mate : 0, pv: r && r.pv ? r.pv.map(m => pos.toUsi(m)) : [] });
    }
  };
}
})(typeof self !== 'undefined' ? self : this);

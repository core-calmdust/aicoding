/*
 * Reversi engine — bitboard (two 32-bit halves), PVS + transposition table,
 * iterative deepening with time control, exact endgame solver.
 * Works both as a Web Worker script and as a Node module.
 *
 * Square index: sq = row*8 + col (a1 = 0, h1 = 7, a8 = 56, h8 = 63)
 * lo word = squares 0..31, hi word = squares 32..63
 */
(function (root) {
'use strict';

// ------------------------------------------------------------------ bits
function pc(x) {
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return Math.imul((x + (x >>> 4)) & 0x0F0F0F0F, 0x01010101) >>> 24;
}
function lsb(x) { return 31 - Math.clz32(x & -x); }

let ML = 0, MH = 0;   // move generator output
let FL = 0, FH = 0;   // flip output

function genMoves(pl,ph,ol,oh){
  const el=~(pl|ol), eh=~(ph|oh);
  const il=ol&0x7E7E7E7E, ih=oh&0x7E7E7E7E;
  let ml=0,mh=0,xl,xh,tl,th;
  // dir L1
  xl=(pl<<1)&il; xh=((ph<<1)|(pl>>>31))&ih;
  tl=(xl<<1); th=((xh<<1)|(xl>>>31)); xl|=tl&il; xh|=th&ih;
  tl=(xl<<1); th=((xh<<1)|(xl>>>31)); xl|=tl&il; xh|=th&ih;
  tl=(xl<<1); th=((xh<<1)|(xl>>>31)); xl|=tl&il; xh|=th&ih;
  tl=(xl<<1); th=((xh<<1)|(xl>>>31)); xl|=tl&il; xh|=th&ih;
  tl=(xl<<1); th=((xh<<1)|(xl>>>31)); xl|=tl&il; xh|=th&ih;
  ml|=(xl<<1)&el; mh|=((xh<<1)|(xl>>>31))&eh;
  // dir R1
  xl=((pl>>>1)|(ph<<31))&il; xh=(ph>>>1)&ih;
  tl=((xl>>>1)|(xh<<31)); th=(xh>>>1); xl|=tl&il; xh|=th&ih;
  tl=((xl>>>1)|(xh<<31)); th=(xh>>>1); xl|=tl&il; xh|=th&ih;
  tl=((xl>>>1)|(xh<<31)); th=(xh>>>1); xl|=tl&il; xh|=th&ih;
  tl=((xl>>>1)|(xh<<31)); th=(xh>>>1); xl|=tl&il; xh|=th&ih;
  tl=((xl>>>1)|(xh<<31)); th=(xh>>>1); xl|=tl&il; xh|=th&ih;
  ml|=((xl>>>1)|(xh<<31))&el; mh|=(xh>>>1)&eh;
  // dir L8
  xl=(pl<<8)&ol; xh=((ph<<8)|(pl>>>24))&oh;
  tl=(xl<<8); th=((xh<<8)|(xl>>>24)); xl|=tl&ol; xh|=th&oh;
  tl=(xl<<8); th=((xh<<8)|(xl>>>24)); xl|=tl&ol; xh|=th&oh;
  tl=(xl<<8); th=((xh<<8)|(xl>>>24)); xl|=tl&ol; xh|=th&oh;
  tl=(xl<<8); th=((xh<<8)|(xl>>>24)); xl|=tl&ol; xh|=th&oh;
  tl=(xl<<8); th=((xh<<8)|(xl>>>24)); xl|=tl&ol; xh|=th&oh;
  ml|=(xl<<8)&el; mh|=((xh<<8)|(xl>>>24))&eh;
  // dir R8
  xl=((pl>>>8)|(ph<<24))&ol; xh=(ph>>>8)&oh;
  tl=((xl>>>8)|(xh<<24)); th=(xh>>>8); xl|=tl&ol; xh|=th&oh;
  tl=((xl>>>8)|(xh<<24)); th=(xh>>>8); xl|=tl&ol; xh|=th&oh;
  tl=((xl>>>8)|(xh<<24)); th=(xh>>>8); xl|=tl&ol; xh|=th&oh;
  tl=((xl>>>8)|(xh<<24)); th=(xh>>>8); xl|=tl&ol; xh|=th&oh;
  tl=((xl>>>8)|(xh<<24)); th=(xh>>>8); xl|=tl&ol; xh|=th&oh;
  ml|=((xl>>>8)|(xh<<24))&el; mh|=(xh>>>8)&eh;
  // dir L7
  xl=(pl<<7)&il; xh=((ph<<7)|(pl>>>25))&ih;
  tl=(xl<<7); th=((xh<<7)|(xl>>>25)); xl|=tl&il; xh|=th&ih;
  tl=(xl<<7); th=((xh<<7)|(xl>>>25)); xl|=tl&il; xh|=th&ih;
  tl=(xl<<7); th=((xh<<7)|(xl>>>25)); xl|=tl&il; xh|=th&ih;
  tl=(xl<<7); th=((xh<<7)|(xl>>>25)); xl|=tl&il; xh|=th&ih;
  tl=(xl<<7); th=((xh<<7)|(xl>>>25)); xl|=tl&il; xh|=th&ih;
  ml|=(xl<<7)&el; mh|=((xh<<7)|(xl>>>25))&eh;
  // dir R7
  xl=((pl>>>7)|(ph<<25))&il; xh=(ph>>>7)&ih;
  tl=((xl>>>7)|(xh<<25)); th=(xh>>>7); xl|=tl&il; xh|=th&ih;
  tl=((xl>>>7)|(xh<<25)); th=(xh>>>7); xl|=tl&il; xh|=th&ih;
  tl=((xl>>>7)|(xh<<25)); th=(xh>>>7); xl|=tl&il; xh|=th&ih;
  tl=((xl>>>7)|(xh<<25)); th=(xh>>>7); xl|=tl&il; xh|=th&ih;
  tl=((xl>>>7)|(xh<<25)); th=(xh>>>7); xl|=tl&il; xh|=th&ih;
  ml|=((xl>>>7)|(xh<<25))&el; mh|=(xh>>>7)&eh;
  // dir L9
  xl=(pl<<9)&il; xh=((ph<<9)|(pl>>>23))&ih;
  tl=(xl<<9); th=((xh<<9)|(xl>>>23)); xl|=tl&il; xh|=th&ih;
  tl=(xl<<9); th=((xh<<9)|(xl>>>23)); xl|=tl&il; xh|=th&ih;
  tl=(xl<<9); th=((xh<<9)|(xl>>>23)); xl|=tl&il; xh|=th&ih;
  tl=(xl<<9); th=((xh<<9)|(xl>>>23)); xl|=tl&il; xh|=th&ih;
  tl=(xl<<9); th=((xh<<9)|(xl>>>23)); xl|=tl&il; xh|=th&ih;
  ml|=(xl<<9)&el; mh|=((xh<<9)|(xl>>>23))&eh;
  // dir R9
  xl=((pl>>>9)|(ph<<23))&il; xh=(ph>>>9)&ih;
  tl=((xl>>>9)|(xh<<23)); th=(xh>>>9); xl|=tl&il; xh|=th&ih;
  tl=((xl>>>9)|(xh<<23)); th=(xh>>>9); xl|=tl&il; xh|=th&ih;
  tl=((xl>>>9)|(xh<<23)); th=(xh>>>9); xl|=tl&il; xh|=th&ih;
  tl=((xl>>>9)|(xh<<23)); th=(xh>>>9); xl|=tl&il; xh|=th&ih;
  tl=((xl>>>9)|(xh<<23)); th=(xh>>>9); xl|=tl&il; xh|=th&ih;
  ml|=((xl>>>9)|(xh<<23))&el; mh|=(xh>>>9)&eh;
  ML=ml; MH=mh;
}


// neighbours of a set (8-connected), used for potential mobility
let NL = 0, NH = 0;
function neighbours(l, h) {
  const al = l & 0x7F7F7F7F, ah = h & 0x7F7F7F7F;   // not col7 (shifts that move col+1)
  const bl = l & 0xFEFEFEFE, bh = h & 0xFEFEFEFE;   // not col0 (shifts that move col-1)
  let rl = 0, rh = 0;
  // +1
  rl |= al << 1; rh |= (ah << 1) | (al >>> 31);
  // -1
  rl |= (bl >>> 1) | (bh << 31); rh |= bh >>> 1;
  // +8
  rl |= l << 8; rh |= (h << 8) | (l >>> 24);
  // -8
  rl |= (l >>> 8) | (h << 24); rh |= h >>> 8;
  // +9 (row+1,col+1)
  rl |= al << 9; rh |= (ah << 9) | (al >>> 23);
  // +7 (row+1,col-1)
  rl |= bl << 7; rh |= (bh << 7) | (bl >>> 25);
  // -7 (row-1,col+1)
  rl |= (al >>> 7) | (ah << 25); rh |= ah >>> 7;
  // -9 (row-1,col-1)
  rl |= (bl >>> 9) | (bh << 23); rh |= bh >>> 9;
  NL = rl; NH = rh;
}

// rays for flip computation
const RAY_START = new Int16Array(64 * 8), RAY_LEN = new Int8Array(64 * 8);
const RAY_SQ = new Int8Array(64 * 8 * 7);
(function () {
  const D = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  let p = 0;
  for (let sq = 0; sq < 64; sq++) {
    const r0 = sq >> 3, c0 = sq & 7;
    for (let d = 0; d < 8; d++) {
      RAY_START[sq * 8 + d] = p;
      let r = r0 + D[d][0], c = c0 + D[d][1], n = 0;
      while (r >= 0 && r < 8 && c >= 0 && c < 8) { RAY_SQ[p++] = r * 8 + c; n++; r += D[d][0]; c += D[d][1]; }
      RAY_LEN[sq * 8 + d] = n;
    }
  }
})();

function flips(sq, pl, ph, ol, oh) {
  let fl = 0, fh = 0;
  const base = sq * 8;
  for (let d = 0; d < 8; d++) {
    const len = RAY_LEN[base + d];
    if (len < 2) continue;
    let p = RAY_START[base + d];
    const end = p + len;
    let tl = 0, th = 0;
    for (; p < end; p++) {
      const s = RAY_SQ[p];
      if (s < 32) {
        const b = 1 << s;
        if (ol & b) { tl |= b; continue; }
        if (pl & b) { fl |= tl; fh |= th; }
        break;
      } else {
        const b = 1 << (s - 32);
        if (oh & b) { th |= b; continue; }
        if (ph & b) { fl |= tl; fh |= th; }
        break;
      }
    }
  }
  FL = fl; FH = fh;
}

function discDiff(pl, ph, ol, oh) { return pc(pl) + pc(ph) - pc(ol) - pc(oh); }
function finalScore(pl, ph, ol, oh) {
  const p = pc(pl) + pc(ph), o = pc(ol) + pc(oh), e = 64 - p - o;
  if (p > o) return p - o + e;
  if (p < o) return p - o - e;
  return 0;
}

// --------------------------------------------------------- evaluation
// Pattern evaluator (weights loaded at runtime); falls back to a handcrafted one.
const SCALE = 100;                 // evaluation units per disc
let W = null;                      // Int16Array per phase concatenated
let PATTERNS = null;               // pattern defs
let NPHASE = 0, PHASE_SIZE = 0;

// handcrafted fallback evaluator (side-to-move perspective, in 1/100 discs)
const X_SQ = [9, 14, 49, 54], CORNER_OF_X = [0, 7, 56, 63];
const C_SQ = [1, 8, 6, 15, 48, 57, 55, 62], CORNER_OF_C = [0, 0, 7, 7, 56, 56, 63, 63];
function bit(l, h, sq) { return sq < 32 ? (l >>> sq) & 1 : (h >>> (sq - 32)) & 1; }
function evalHand(pl, ph, ol, oh) {
  const discs = pc(pl | ol) + pc(ph | oh), e = 64 - discs;
  genMoves(pl, ph, ol, oh); const mp = pc(ML) + pc(MH) + 2 * (pc(ML & 0x81) + pc(MH & 0x81000000));
  genMoves(ol, oh, pl, ph); const mo = pc(ML) + pc(MH) + 2 * (pc(ML & 0x81) + pc(MH & 0x81000000));
  const el = ~(pl | ol), eh = ~(ph | oh);
  neighbours(ol, oh); const pp = pc(NL & el) + pc(NH & eh);
  neighbours(pl, ph); const po = pc(NL & el) + pc(NH & eh);
  let s = 0;
  const wm = e > 44 ? 55 : e > 20 ? 75 : 60;
  s += (mp - mo) * wm;
  s += (pp - po) * (e > 20 ? 22 : 12);
  s += ((pc(pl & 0x81) + pc(ph & 0x81000000)) - (pc(ol & 0x81) + pc(oh & 0x81000000))) * 420;
  for (let i = 0; i < 4; i++) {
    const c = CORNER_OF_X[i];
    if (!bit(pl | ol, ph | oh, c)) s += (bit(ol, oh, X_SQ[i]) - bit(pl, ph, X_SQ[i])) * 260;
  }
  for (let i = 0; i < 8; i++) {
    const c = CORNER_OF_C[i];
    if (!bit(pl | ol, ph | oh, c)) s += (bit(ol, oh, C_SQ[i]) - bit(pl, ph, C_SQ[i])) * 50;
  }
  if (e < 14) s += (pc(pl) + pc(ph) - pc(ol) - pc(oh)) * (14 - e) * 6;
  return s;
}

// ---- pattern evaluation
// Patterns are lists of squares; each has symmetric instances sharing one table.
const POW3 = [1, 3, 9, 27, 81, 243, 729, 2187, 6561, 19683, 59049];
function sqName(s) { return 'abcdefgh'[s & 7] + ((s >> 3) + 1); }
function symmetries(list) {
  // 8 symmetries of the square
  const f = [
    (r, c) => [r, c], (r, c) => [r, 7 - c], (r, c) => [7 - r, c], (r, c) => [7 - r, 7 - c],
    (r, c) => [c, r], (r, c) => [c, 7 - r], (r, c) => [7 - c, r], (r, c) => [7 - c, 7 - r]
  ];
  const seen = new Set(), out = [];
  for (const t of f) {
    const m = list.map(s => { const [r, c] = t(s >> 3, s & 7); return r * 8 + c; });
    const key = m.slice().sort((a, b) => a - b).join(',');
    if (seen.has(key)) continue;
    seen.add(key); out.push(m);
  }
  return out;
}
function P(s) { return s.split(' ').map(x => (x.charCodeAt(1) - 49) * 8 + (x.charCodeAt(0) - 97)); }
const PATTERN_DEFS = [
  // name, squares (ordered), symmetric instances generated
  ['corner3x3', P('a1 b1 c1 a2 b2 c2 a3 b3 c3')],
  ['corner2x5', P('a1 b1 c1 d1 e1 a2 b2 c2 d2 e2')],
  ['edge2x', P('a1 b1 c1 d1 e1 f1 g1 h1 b2 g2')],
  ['hv2', P('a2 b2 c2 d2 e2 f2 g2 h2')],
  ['hv3', P('a3 b3 c3 d3 e3 f3 g3 h3')],
  ['hv4', P('a4 b4 c4 d4 e4 f4 g4 h4')],
  ['diag8', P('a1 b2 c3 d4 e5 f6 g7 h8')],
  ['diag7', P('b1 c2 d3 e4 f5 g6 h7')],
  ['diag6', P('c1 d2 e3 f4 g5 h6')],
  ['diag5', P('d1 e2 f3 g4 h5')],
  ['diag4', P('e1 f2 g3 h4')],
];
// Pattern sets: set A (11 shapes) is the original; set B adds 4 ten-square shapes. The active set is chosen from the weights size.
const PATTERN_DEFS_B = PATTERN_DEFS.concat([
  ['triangle', P('a1 b1 c1 d1 a2 b2 c2 a3 b3 a4')],
  ['cornerBlock', P('a1 c1 d1 e1 f1 h1 c2 d2 e2 f2')],
  ['diag8c', P('a1 b2 c3 d4 e5 f6 g7 h8 b1 a2')],
  ['narrowTri', P('a1 b1 c1 d1 e1 a2 b2 a3 a4 a5')],
]);
// (v5, 2026-11) set C: set B + the three diagonals at a corner (a1-d4 with the lines beside it, like Egaroucid's "cross").
// Chosen only through the weights file's header (MODEL_CARD.md「評価関数 v5」); 66 instances.
const PATTERN_DEFS_C = PATTERN_DEFS_B.concat([
  ['cross', P('a1 b2 c3 d4 b1 c2 d3 a2 b3 c4')],
]);
function buildPatterns(defs) {
  const pats = [];
  let offset = 0;
  for (const [name, sqs] of defs) {
    const inst = symmetries(sqs);
    const size = POW3[sqs.length];
    pats.push({ name, len: sqs.length, size, offset, inst });
    offset += size;
  }
  return { pats, total: offset };
}
// the extra features after the pattern tables, 64 entries each: 0 own mobility, 1 the opponent's, 2 own potential mobility
// (empty squares next to an opponent disc), 3 the opponent's, 4 (v5) own discs (0..63; with one phase per ply this is the disc
// difference). v1 has none, v2-v4 the first four (USE_EXT 4), v5 files say how many in their header.
const EXT_SIZE = 256, NEXT = 4, NEXT_MAX = 5;
let EXT_OFF = 0, PS_V1 = 0, PS_V2 = 0, USE_EXT = 0, PATTERN_SET = '';
let INST_OFF, INST_LEN, INST_SQ, NINST = 0;
const MAXI = 80, NSTK = 96;
const I_OFF = new Int32Array(MAXI), I_LEN = new Int8Array(MAXI), I_SQ = new Int8Array(MAXI * 10);
const SQ_START = new Int32Array(65), SQI = new Int32Array(MAXI * 10), SQP = new Int32Array(MAXI * 10);
const IDX = new Int32Array(MAXI), STA = new Int32Array(NSTK * MAXI), STB = new Int32Array(NSTK * MAXI);
function setupPatterns(defs, name) {
  const PB = buildPatterns(defs);
  PATTERNS = PB.pats; PATTERN_SET = name;
  EXT_OFF = PB.total; PS_V1 = PB.total + 1; PS_V2 = PB.total + EXT_SIZE + 1;
  PHASE_SIZE = PS_V1;
  INST_OFF = []; INST_LEN = []; INST_SQ = [];
  for (const p of PATTERNS) for (const m of p.inst) { INST_OFF.push(p.offset); INST_LEN.push(p.len); INST_SQ.push(m); }
  NINST = INST_OFF.length;
  I_OFF.set(INST_OFF); I_LEN.set(INST_LEN);
  for (let i = 0; i < NINST; i++) for (let k = 0; k < INST_LEN[i]; k++) I_SQ[i * 10 + k] = INST_SQ[i][k];
  const lists = Array.from({ length: 64 }, () => []);
  for (let i = 0; i < NINST; i++) { const n = INST_LEN[i]; for (let k = 0; k < n; k++) lists[INST_SQ[i][k]].push([i, POW3[n - 1 - k]]); }
  let o = 0; for (let q = 0; q < 64; q++) { SQ_START[q] = o; for (const [i, pw] of lists[q]) { SQI[o] = i; SQP[o] = pw; o++; } } SQ_START[64] = o;
}
setupPatterns(PATTERN_DEFS, 'A');
const SETS = { A: PATTERN_DEFS, B: PATTERN_DEFS_B, C: PATTERN_DEFS_C };
function sizesOf(defs) { const t = buildPatterns(defs).total; return [t + 1, t + EXT_SIZE + 1]; }
// per square cell code: 0 empty, 1 player, 2 opponent
const CELL = new Int8Array(64);
function fillCells(pl, ph, ol, oh) {
  for (let s = 0; s < 32; s++) CELL[s] = ((pl >>> s) & 1) | (((ol >>> s) & 1) << 1);
  for (let s = 0; s < 32; s++) CELL[s + 32] = ((ph >>> s) & 1) | (((oh >>> s) & 1) << 1);
}
// feature indices (for training): writes into out (Int32Array of length NINST)
function extCounts(pl, ph, ol, oh, out, o) {
  genMoves(pl, ph, ol, oh); const mp = pc(ML) + pc(MH);
  genMoves(ol, oh, pl, ph); const mo = pc(ML) + pc(MH);
  const el = ~(pl | ol), eh = ~(ph | oh);
  neighbours(ol, oh); const pp = pc(NL & el) + pc(NH & eh);
  neighbours(pl, ph); const po = pc(NL & el) + pc(NH & eh);
  out[o] = EXT_OFF + mp; out[o + 1] = EXT_OFF + 64 + mo; out[o + 2] = EXT_OFF + 128 + pp; out[o + 3] = EXT_OFF + 192 + po;
  if (USE_EXT >= 5) { const d = pc(pl) + pc(ph); out[o + 4] = EXT_OFF + 256 + (d > 63 ? 63 : d); }
}
// feature indices (for training): writes NINST (+NEXT when ext) indices into out
function featureIndices(pl, ph, ol, oh, out, ext) {
  fillCells(pl, ph, ol, oh);
  for (let i = 0; i < NINST; i++) {
    let idx = 0; const b = i * 10, n = I_LEN[i];
    for (let k = 0; k < n; k++) idx = idx * 3 + CELL[I_SQ[b + k]];
    out[i] = I_OFF[i] + idx;
  }
  if (ext) extCounts(pl, ph, ol, oh, out, NINST);
}
const EXT_TMP = new Int32Array(NEXT_MAX);
function phaseOf(discs) { // discs 4..64
  const ply = discs - 4;
  const ph = (ply * NPHASE / 61) | 0;
  return ph < NPHASE ? ph : NPHASE - 1;
}
function evalPattern(pl, ph, ol, oh) {
  const discs = pc(pl | ol) + pc(ph | oh);
  const base = phaseOf(discs) * PHASE_SIZE;
  IDX.fill(0);
  let x, q, j, e;
  x = pl; while (x) { q = 31 - Math.clz32(x & -x); x &= x - 1; for (j = SQ_START[q], e = SQ_START[q + 1]; j < e; j++) IDX[SQI[j]] += SQP[j]; }
  x = ph; while (x) { q = 63 - Math.clz32(x & -x); x &= x - 1; for (j = SQ_START[q], e = SQ_START[q + 1]; j < e; j++) IDX[SQI[j]] += SQP[j]; }
  x = ol; while (x) { q = 31 - Math.clz32(x & -x); x &= x - 1; for (j = SQ_START[q], e = SQ_START[q + 1]; j < e; j++) IDX[SQI[j]] += 2 * SQP[j]; }
  x = oh; while (x) { q = 63 - Math.clz32(x & -x); x &= x - 1; for (j = SQ_START[q], e = SQ_START[q + 1]; j < e; j++) IDX[SQI[j]] += 2 * SQP[j]; }
  let s = W[base + PHASE_SIZE - 1];
  for (let i = 0; i < NINST; i++) s += W[base + I_OFF[i] + IDX[i]];
  if (USE_EXT) {
    extCounts(pl, ph, ol, oh, EXT_TMP, 0);
    s += W[base + EXT_TMP[0]] + W[base + EXT_TMP[1]] + W[base + EXT_TMP[2]] + W[base + EXT_TMP[3]];
    if (USE_EXT >= 5) s += W[base + EXT_TMP[4]];
  }
  // weights are in 1/32 disc units -> convert to 1/100 discs
  return ((s * 100) / 32) | 0;
}
let evaluate = evalHand;
// Multi-ProbCut's sigma for weights without a header (v1-v4); a v5 file carries its own (tools/train/rvlabel mpc)
const MPC_V4 = { A: 357.32, B: 1.1, C: -3.14 };
let WINFO = { version: 4 };
// v5 weights file (tools/train/rvtrain, MODEL_CARD.md「評価関数 v5」): a header of 16 int16 words, then the weights.
//   0: 0x5652 ('RV')  1: 5 (format)  2: header words (16)  3: phases  4: pattern set ('B' / 'C')  5: extra features (4 / 5)
//   6: flags (1: each phase stored as the difference from the one before; 2: the low and high bytes of the weights stored
//      as two planes — both only to gzip better)  7: quant (the stored values × quant = weights in 1/32 disc)
//   8-13: Multi-ProbCut sigma A, B, C (float32)  14-15: reserved
// Older files (no header) are recognised by their size, the number of phases given by the caller (weights.json: 30).
function decodeV5(arr) {
  const H = arr[2], nph = arr[3], set = String.fromCharCode(arr[4]), next = arr[5], flags = arr[6], q = arr[7] || 1;
  if (!SETS[set] || next < 0 || next > NEXT_MAX || nph < 1 || nph > 64) throw new Error('weights header: ' + [nph, set, next].join(' '));
  const f32 = new Float32Array(new Int16Array([arr[8], arr[9], arr[10], arr[11], arr[12], arr[13]]).buffer);
  const n = arr.length - H, per = n / nph;
  let w = new Int16Array(n);
  if (flags & 2) {   // byte planes: low bytes of all the values, then the high bytes
    const b = new Uint8Array(arr.buffer, arr.byteOffset + 2 * H, 2 * n);
    for (let i = 0; i < n; i++) w[i] = b[i] | (b[n + i] << 8);
  } else w.set(arr.subarray(H));
  if (flags & 1) for (let i = per; i < n; i++) w[i] = (w[i] + w[i - per]) << 16 >> 16;
  if (q !== 1) for (let i = 0; i < n; i++) w[i] *= q;
  return { w, nphase: nph, set, next, mpc: f32[0] > 0 ? { A: f32[0], B: f32[1], C: f32[2] } : null };
}
function setWeights(arr, nphase) {
  if (arr.length > 16 && arr[0] === 0x5652 && arr[1] === 5) {
    const d = decodeV5(arr);
    W = d.w; NPHASE = d.nphase;
    if (PATTERN_SET !== d.set) setupPatterns(SETS[d.set], d.set);
    USE_EXT = d.next; PHASE_SIZE = EXT_OFF + 64 * d.next + 1;
    if (W.length !== NPHASE * PHASE_SIZE) throw new Error('weights size mismatch: ' + W.length);
    Object.assign(MPC, d.mpc || MPC_V4);
    WINFO = { version: 5, nphase: NPHASE, set: d.set, next: d.next, mpc: d.mpc };
  } else {
    W = arr; NPHASE = nphase;
    const per = arr.length / nphase;
    for (const k of ['A', 'B']) { const [v1, v2] = sizesOf(SETS[k]); if ((per === v1 || per === v2) && PATTERN_SET !== k) setupPatterns(SETS[k], k); }
    if (per === PS_V2) { USE_EXT = 4; PHASE_SIZE = PS_V2; }
    else if (per === PS_V1) { USE_EXT = 0; PHASE_SIZE = PS_V1; }
    else throw new Error('weights size mismatch: ' + per);
    if (WINFO.version === 5) Object.assign(MPC, MPC_V4);   // (back from v5 weights in the same engine)
    WINFO = { version: 4, nphase };
  }
  evaluate = evalPattern;
  if (typeof wasmWeights === 'function') wasmWeights();
}

// ------------------------------------------------------ search state
let nodes = 0, deadline = Infinity, aborted = false, nodeMax = 0;   // nodeMax: PRO mode's node limit (cfg.nodes), 0 = none
const ABORT = { abort: true };
function checkTime() { if (Date.now() > deadline || (nodeMax && nodes >= nodeMax)) { aborted = true; throw ABORT; } }

// transposition table (midgame)
const TT_BITS = 20, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
const T_K = new Int32Array(TT_SIZE * 4);
const T_LO = new Int16Array(TT_SIZE), T_HI = new Int16Array(TT_SIZE);
const T_D = new Int8Array(TT_SIZE).fill(-1), T_M = new Int8Array(TT_SIZE).fill(-1);
// endgame table
const ET_BITS = 19, ET_SIZE = 1 << ET_BITS, ET_MASK = ET_SIZE - 1;
const E_K = new Int32Array(ET_SIZE * 4);
const E_LO = new Int8Array(ET_SIZE), E_HI = new Int8Array(ET_SIZE);
const E_V = new Uint8Array(ET_SIZE), E_M = new Int8Array(ET_SIZE).fill(-1);
function hash(pl, ph, ol, oh) {
  let h = Math.imul(pl ^ 0x9E3779B9, 0x85EBCA6B) ^ Math.imul(ph + 0x7F4A7C15 | 0, 0xC2B2AE35)
        ^ Math.imul(ol ^ 0x165667B1, 0x27D4EB2F) ^ Math.imul(oh + 0x61C88647 | 0, 0x9E3779B1);
  h ^= h >>> 15; h = Math.imul(h, 0x2C1B3C6D); h ^= h >>> 12; h = Math.imul(h, 0x297A2D39); h ^= h >>> 15;
  return h;
}
function clearTT() { T_D.fill(-1); T_M.fill(-1); E_V.fill(0); E_M.fill(-1); if (WON) WX.clear_tt(); }

// static square ordering values
const SQV = new Int16Array([
  100, -20, 10, 5, 5, 10, -20, 100,
  -20, -50, -2, -2, -2, -2, -50, -20,
  10, -2, 1, 1, 1, 1, -2, 10,
  5, -2, 1, 0, 0, 1, -2, 5,
  5, -2, 1, 0, 0, 1, -2, 5,
  10, -2, 1, 1, 1, 1, -2, 10,
  -20, -50, -2, -2, -2, -2, -50, -20,
  100, -20, 10, 5, 5, 10, -20, 100]);

const MAXPLY = 64;
const MV = new Int8Array(MAXPLY * 36), SC = new Int32Array(MAXPLY * 36);

function sortMoves(base, n) { // insertion sort descending by SC
  for (let i = 1; i < n; i++) {
    const m = MV[base + i], s = SC[base + i];
    let j = i - 1;
    while (j >= 0 && SC[base + j] < s) { MV[base + j + 1] = MV[base + j]; SC[base + j + 1] = SC[base + j]; j--; }
    MV[base + j + 1] = m; SC[base + j + 1] = s;
  }
}

// -------------------------------------------------------- Multi-ProbCut
// sigma (centi-discs) of (deep - shallow) search values, fitted on sample positions: s = A + B*depth + C*empties
const MPC = { on: true, t: 1.5, A: 357.32, B: 1.1, C: -3.14, minDepth: 3 }; // fitted on 700 sample positions (depths 0-10)
const mpcShallow = d => 2 * (d >> 2) + (d & 1); // ~d/2, same parity as d
// -------------------------------------------------------- midgame PVS
// ---- incremental pattern indices: per ply, A = indices with side-to-move coded 1 / opponent 2, B = colours swapped
function initIdx(ply, pl, ph, ol, oh) {
  const a0 = ply * NINST;
  STA.fill(0, a0, a0 + NINST); STB.fill(0, a0, a0 + NINST);
  let x, q, j, e;
  x = pl; while (x) { q = 31 - Math.clz32(x & -x); x &= x - 1; for (j = SQ_START[q], e = SQ_START[q + 1]; j < e; j++) { STA[a0 + SQI[j]] += SQP[j]; STB[a0 + SQI[j]] += 2 * SQP[j]; } }
  x = ph; while (x) { q = 63 - Math.clz32(x & -x); x &= x - 1; for (j = SQ_START[q], e = SQ_START[q + 1]; j < e; j++) { STA[a0 + SQI[j]] += SQP[j]; STB[a0 + SQI[j]] += 2 * SQP[j]; } }
  x = ol; while (x) { q = 31 - Math.clz32(x & -x); x &= x - 1; for (j = SQ_START[q], e = SQ_START[q + 1]; j < e; j++) { STA[a0 + SQI[j]] += 2 * SQP[j]; STB[a0 + SQI[j]] += SQP[j]; } }
  x = oh; while (x) { q = 63 - Math.clz32(x & -x); x &= x - 1; for (j = SQ_START[q], e = SQ_START[q + 1]; j < e; j++) { STA[a0 + SQI[j]] += 2 * SQP[j]; STB[a0 + SQI[j]] += SQP[j]; } }
}
// child after the side to move plays s flipping (fl, fh): the child's side to move is the old opponent
function childIdx(ply, s, fl, fh) {
  const a0 = ply * NINST, c0 = a0 + NINST;
  for (let i = 0; i < NINST; i++) { STA[c0 + i] = STB[a0 + i]; STB[c0 + i] = STA[a0 + i]; }
  let j, e, q, x;
  for (j = SQ_START[s], e = SQ_START[s + 1]; j < e; j++) { STA[c0 + SQI[j]] += 2 * SQP[j]; STB[c0 + SQI[j]] += SQP[j]; }
  x = fl; while (x) { q = 31 - Math.clz32(x & -x); x &= x - 1; for (j = SQ_START[q], e = SQ_START[q + 1]; j < e; j++) { STA[c0 + SQI[j]] += SQP[j]; STB[c0 + SQI[j]] -= SQP[j]; } }
  x = fh; while (x) { q = 63 - Math.clz32(x & -x); x &= x - 1; for (j = SQ_START[q], e = SQ_START[q + 1]; j < e; j++) { STA[c0 + SQI[j]] += SQP[j]; STB[c0 + SQI[j]] -= SQP[j]; } }
}
function passIdx(ply) {
  const a0 = ply * NINST, c0 = a0 + NINST;
  for (let i = 0; i < NINST; i++) { STA[c0 + i] = STB[a0 + i]; STB[c0 + i] = STA[a0 + i]; }
}
function evalAt(ply, pl, ph, ol, oh) {
  if (evaluate !== evalPattern) return evaluate(pl, ph, ol, oh);
  const discs = pc(pl | ol) + pc(ph | oh);
  const base = phaseOf(discs) * PHASE_SIZE, a0 = ply * NINST;
  let s = W[base + PHASE_SIZE - 1];
  for (let i = 0; i < NINST; i++) s += W[base + I_OFF[i] + STA[a0 + i]];
  if (USE_EXT) {
    extCounts(pl, ph, ol, oh, EXT_TMP, 0);
    s += W[base + EXT_TMP[0]] + W[base + EXT_TMP[1]] + W[base + EXT_TMP[2]] + W[base + EXT_TMP[3]];
    if (USE_EXT >= 5) s += W[base + EXT_TMP[4]];
  }
  return ((s * 100) / 32) | 0;
}
// entry point used outside the recursive search: (re)initialises the index stack at this ply
function searchJS(pl, ph, ol, oh, depth, alpha, beta, ply, passed) {
  initIdx(ply, pl, ph, ol, oh);
  return searchI(pl, ph, ol, oh, depth, alpha, beta, ply, passed);
}
function searchI(pl, ph, ol, oh, depth, alpha, beta, ply, passed) {
  if ((++nodes & 4095) === 0) checkTime();
  if (depth <= 0) return evalAt(ply, pl, ph, ol, oh);

  const h = hash(pl, ph, ol, oh), ti = h & TT_MASK, k4 = ti * 4;
  let ttMove = -1;
  if (T_K[k4] === pl && T_K[k4 + 1] === ph && T_K[k4 + 2] === ol && T_K[k4 + 3] === oh && T_D[ti] >= 0) {
    ttMove = T_M[ti];
    if (T_D[ti] >= depth) {
      const lo = T_LO[ti], hi = T_HI[ti];
      if (lo >= beta) return lo;
      if (hi <= alpha) return hi;
      if (lo === hi) return lo;
      if (lo > alpha) alpha = lo;
      if (hi < beta) beta = hi;
    }
  }

  genMoves(pl, ph, ol, oh);
  let ml = ML, mh = MH;
  if ((ml | mh) === 0) {
    if (passed) return finalScore(pl, ph, ol, oh) * SCALE;
    genMoves(ol, oh, pl, ph);
    if ((ML | MH) === 0) return finalScore(pl, ph, ol, oh) * SCALE;
    passIdx(ply);
    return -searchI(ol, oh, pl, ph, depth, -beta, -alpha, ply + 1, true);
  }

  // Multi-ProbCut: predict the deep result from a shallow search and cut if it is far outside the window
  if (MPC.on && depth >= MPC.minDepth && beta - alpha === 1 && MPC.A > 0) {
    const empties = 64 - pc(pl | ol) - pc(ph | oh);
    const ds = mpcShallow(depth);
    const sig = (MPC.t * (MPC.A + MPC.B * depth + MPC.C * empties)) | 0;
    const hb = beta + sig;
    if (hb < 30000) {
      const v = ds === 0 ? evalAt(ply, pl, ph, ol, oh) : searchI(pl, ph, ol, oh, ds, hb - 1, hb, ply, passed);
      if (v >= hb) return beta;
    }
    const lb = alpha - sig;
    if (lb > -30000) {
      const v = ds === 0 ? evalAt(ply, pl, ph, ol, oh) : searchI(pl, ph, ol, oh, ds, lb, lb + 1, ply, passed);
      if (v <= lb) return alpha;
    }
  }
  // collect & order moves
  const base = ply * 36;
  let n = 0;
  // with Multi-ProbCut: shallower orderings and the table's move first, before ordering the others (= engine.c)
  const ordDepth = MPC.on ? (depth >= 18 ? 3 : depth >= 12 ? 2 : depth >= 8 ? 1 : depth >= 3 ? 0 : -1)
    : depth >= 9 ? 3 : depth >= 6 ? 2 : depth >= 4 ? 1 : depth >= 3 ? 0 : -1;
  const alpha0 = alpha;
  let best = -32767, bestMove = -1, first = false;
  if (MPC.on && ordDepth >= 0 && ttMove >= 0 && (ttMove < 32 ? (ml >>> ttMove) & 1 : (mh >>> (ttMove - 32)) & 1)) {
    const s = ttMove;
    flips(s, pl, ph, ol, oh);
    const fl = FL, fh = FH;
    let npl, nph;
    if (s < 32) { npl = pl | fl | (1 << s); nph = ph | fh; } else { npl = pl | fl; nph = ph | fh | (1 << (s - 32)); }
    childIdx(ply, s, fl, fh);
    const v = -searchI(ol & ~fl, oh & ~fh, npl, nph, depth - 1, -beta, -alpha, ply + 1, false);
    best = v; bestMove = s; first = true;
    if (v > alpha) alpha = v;
    if (s < 32) ml &= ~(1 << s); else mh &= ~(1 << (s - 32));
    ttMove = -1;
  }
  if (alpha < beta) {
  while (ml) { const s = lsb(ml); ml &= ml - 1; MV[base + n++] = s; }
  while (mh) { const s = lsb(mh); mh &= mh - 1; MV[base + n++] = s + 32; }
  for (let i = 0; i < n; i++) {
    const s = MV[base + i];
    let sc;
    if (s === ttMove) sc = 1 << 29;
    else if (ordDepth < 0) sc = SQV[s];
    else {
      flips(s, pl, ph, ol, oh);
      const fl = FL, fh = FH;
      let npl, nph;
      if (s < 32) { npl = pl | fl | (1 << s); nph = ph | fh; } else { npl = pl | fl; nph = ph | fh | (1 << (s - 32)); }
      const nol = ol & ~fl, noh = oh & ~fh;
      childIdx(ply, s, fl, fh);
      if (ordDepth === 0) sc = -evalAt(ply + 1, nol, noh, npl, nph);
      else sc = -searchI(nol, noh, npl, nph, ordDepth, -32000, 32000, ply + 1, false);
    }
    SC[base + i] = sc;
  }
  sortMoves(base, n);

  if (bestMove < 0) bestMove = MV[base];
  for (let i = 0; i < n; i++) {
    const s = MV[base + i];
    flips(s, pl, ph, ol, oh);
    const fl = FL, fh = FH;
    let npl, nph;
    if (s < 32) { npl = pl | fl | (1 << s); nph = ph | fh; } else { npl = pl | fl; nph = ph | fh | (1 << (s - 32)); }
    const nol = ol & ~fl, noh = oh & ~fh;
    childIdx(ply, s, fl, fh);
    let v;
    if (i === 0 && !first) v = -searchI(nol, noh, npl, nph, depth - 1, -beta, -alpha, ply + 1, false);
    else {
      v = -searchI(nol, noh, npl, nph, depth - 1, -alpha - 1, -alpha, ply + 1, false);
      if (v > alpha && v < beta) v = -searchI(nol, noh, npl, nph, depth - 1, -beta, -v, ply + 1, false);
    }
    if (v > best) {
      best = v; bestMove = s;
      if (v > alpha) { alpha = v; if (alpha >= beta) break; }
    }
  }
  }
  // store
  if (T_D[ti] <= depth || !(T_K[k4] === pl && T_K[k4 + 1] === ph && T_K[k4 + 2] === ol && T_K[k4 + 3] === oh)) {
    T_K[k4] = pl; T_K[k4 + 1] = ph; T_K[k4 + 2] = ol; T_K[k4 + 3] = oh;
    T_D[ti] = depth; T_M[ti] = bestMove;
    T_LO[ti] = best > alpha0 ? best : -32767;
    T_HI[ti] = best < beta ? best : 32767;
  }
  return best;
}

// --------------------------------------------------------- endgame solver
// quadrant parity mask for ordering small endgames
function solveSmall(pl, ph, ol, oh, alpha, beta, empties, passed) {
  ++nodes;
  let el = ~(pl | ol), eh = ~(ph | oh);
  let best = -99, moved = false;
  // odd-quadrant first ordering
  for (let pass = 0; pass < 2; pass++) {
    let l = el, h = eh;
    while (l | h) {
      let s;
      if (l) { s = lsb(l); l &= l - 1; } else { s = lsb(h) + 32; h &= h - 1; }
      const q = QUAD[s];
      const odd = quadParity(el, eh, q);
      if ((pass === 0) !== odd) continue;
      flips(s, pl, ph, ol, oh);
      if ((FL | FH) === 0) continue;
      moved = true;
      const fl = FL, fh = FH;
      let npl, nph;
      if (s < 32) { npl = pl | fl | (1 << s); nph = ph | fh; } else { npl = pl | fl; nph = ph | fh | (1 << (s - 32)); }
      const nol = ol & ~fl, noh = oh & ~fh;
      let v;
      if (empties === 1) v = discDiff(npl, nph, nol, noh);
      else v = -solveSmall(nol, noh, npl, nph, -beta, -alpha, empties - 1, false);
      if (v > best) { best = v; if (v > alpha) { alpha = v; if (alpha >= beta) return best; } }
    }
  }
  if (!moved) {
    if (passed) return finalScore(pl, ph, ol, oh);
    return -solveSmall(ol, oh, pl, ph, -beta, -alpha, empties, true);
  }
  return best;
}
const QUAD = new Int8Array(64);
for (let s = 0; s < 64; s++) QUAD[s] = ((s >> 5) << 1) | ((s & 7) >> 2);
const QMASK_L = [0x0F0F0F0F, 0xF0F0F0F0 | 0, 0, 0], QMASK_H = [0, 0, 0x0F0F0F0F, 0xF0F0F0F0 | 0];
function quadParity(el, eh, q) { return ((pc(el & QMASK_L[q]) + pc(eh & QMASK_H[q])) & 1) === 1; }

const SMALL = 6;
const TUNE = { evalMin: 13, searchMin: 18, sDepth: 2, kE: 8 };   // (2026-11-12: 12 / 14 / 1 before; engine.c also searches a ply deeper every 3 empties above searchMin)
function solveJS(pl, ph, ol, oh, alpha, beta, empties, ply, passed) {
  if (empties <= SMALL) return solveSmall(pl, ph, ol, oh, alpha, beta, empties, passed);
  if ((++nodes & 16383) === 0) checkTime();

  let ti = -1, k4 = 0, ttMove = -1;
  if (empties >= 10) {
    ti = hash(pl, ph, ol, oh) & ET_MASK; k4 = ti * 4;
    if (E_V[ti] && E_K[k4] === pl && E_K[k4 + 1] === ph && E_K[k4 + 2] === ol && E_K[k4 + 3] === oh) {
      const lo = E_LO[ti], hi = E_HI[ti];
      if (lo >= beta) return lo;
      if (hi <= alpha) return hi;
      if (lo === hi) return lo;
      if (lo > alpha) alpha = lo;
      if (hi < beta) beta = hi;
      ttMove = E_M[ti];
    }
  }

  genMoves(pl, ph, ol, oh);
  let ml = ML, mh = MH;
  if ((ml | mh) === 0) {
    if (passed) return finalScore(pl, ph, ol, oh);
    genMoves(ol, oh, pl, ph);
    if ((ML | MH) === 0) return finalScore(pl, ph, ol, oh);
    return -solveJS(ol, oh, pl, ph, -beta, -alpha, empties, ply + 1, true);
  }
  const base = ply * 36;
  let n = 0;
  while (ml) { const s = lsb(ml); ml &= ml - 1; MV[base + n++] = s; }
  while (mh) { const s = lsb(mh); mh &= mh - 1; MV[base + n++] = s + 32; }
  // fastest-first ordering (+ enhanced transposition cutoff on children found in the endgame table)
  const etc = empties >= 15;
  for (let i = 0; i < n; i++) {
    const s = MV[base + i];
    flips(s, pl, ph, ol, oh);
    const fl = FL, fh = FH;
    let npl, nph;
    if (s < 32) { npl = pl | fl | (1 << s); nph = ph | fh; } else { npl = pl | fl; nph = ph | fh | (1 << (s - 32)); }
    const nol = ol & ~fl, noh = oh & ~fh;
    if (etc) {
      const ci = hash(nol, noh, npl, nph) & ET_MASK, c4 = ci * 4;
      if (E_V[ci] && E_K[c4] === nol && E_K[c4 + 1] === noh && E_K[c4 + 2] === npl && E_K[c4 + 3] === nph && -E_HI[ci] >= beta) return -E_HI[ci];
    }
    if (s === ttMove) { SC[base + i] = 1 << 29; continue; }
    genMoves(nol, noh, npl, nph);
    let sc = -(pc(ML) + pc(MH) + 2 * (pc(ML & 0x81) + pc(MH & 0x81000000))) * 64;
    if (empties > 14) {
      neighbours(npl, nph);
      sc -= (pc(NL & ~(npl | nol)) + pc(NH & ~(nph | noh))) * 8;
    }
    sc += SQV[s];
    if (empties >= TUNE.evalMin) {
      if (empties >= TUNE.searchMin) sc -= (searchJS(nol, noh, npl, nph, TUNE.sDepth + ((empties - TUNE.searchMin) / 3 | 0), -32000, 32000, ply + 1, false) * TUNE.kE) >> 4;
      else sc -= (evaluate(nol, noh, npl, nph) * TUNE.kE) >> 4;
    }
    SC[base + i] = sc;
  }
  sortMoves(base, n);

  const alpha0 = alpha;
  let best = -99, bestMove = MV[base];
  for (let i = 0; i < n; i++) {
    const s = MV[base + i];
    flips(s, pl, ph, ol, oh);
    const fl = FL, fh = FH;
    let npl, nph;
    if (s < 32) { npl = pl | fl | (1 << s); nph = ph | fh; } else { npl = pl | fl; nph = ph | fh | (1 << (s - 32)); }
    const nol = ol & ~fl, noh = oh & ~fh;
    let v;
    if (i === 0) v = -solveJS(nol, noh, npl, nph, -beta, -alpha, empties - 1, ply + 1, false);
    else {
      v = -solveJS(nol, noh, npl, nph, -alpha - 1, -alpha, empties - 1, ply + 1, false);
      if (v > alpha && v < beta) v = -solveJS(nol, noh, npl, nph, -beta, -v, empties - 1, ply + 1, false);
    }
    if (v > best) {
      best = v; bestMove = s;
      if (v > alpha) { alpha = v; if (alpha >= beta) break; }
    }
  }
  if (ti >= 0) {
    E_K[k4] = pl; E_K[k4 + 1] = ph; E_K[k4 + 2] = ol; E_K[k4 + 3] = oh;
    E_V[ti] = 1; E_M[ti] = bestMove;
    E_LO[ti] = best > alpha0 ? best : -99;
    E_HI[ti] = best < beta ? best : 99;
  }
  return best;
}

// ---- the same search in WebAssembly (engine.c, built by tools/build-wasm.sh): used when available, same nodes and values
const END_SW = 12;   // a search that reaches the end of the game hands over to the exact solver with this many empties or fewer (engine.c set_end)
let WX = null, WON = false;
(function loadWasm() {
  // pro/ (several threads): the worker has already set up an instance on the shared memory (engine_mt.wasm)
  if (typeof self !== 'undefined' && self.REVERSI_WX) { WX = self.REVERSI_WX; return; }
  try {
    let bytes = null;
    if (typeof importScripts === 'function' && typeof window === 'undefined') {
      try { importScripts('engine-wasm.js' + ((self.location && self.location.search) || '')); } catch (e) { /* JS search */ }
      if (self.REVERSI_WASM) { const b = atob(self.REVERSI_WASM); bytes = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) bytes[i] = b.charCodeAt(i); }
    } else if (typeof require === 'function' && typeof __dirname === 'string' && !(typeof process !== 'undefined' && process.env && process.env.REVERSI_NOWASM)) {
      const fs = require('fs'), path = require('path'), f = path.join(__dirname, 'engine.wasm');
      if (fs.existsSync(f)) bytes = fs.readFileSync(f);
    }
    if (!bytes || typeof WebAssembly === 'undefined') return;
    WX = new WebAssembly.Instance(new WebAssembly.Module(bytes), { env: { now: () => Date.now() } }).exports;
    if (WX.w_defer) WX.w_defer();   // (v5: memory for the weights when they come — engine.c w_alloc)
    WX.init();
    if (WX.set_end) WX.set_end(END_SW);   // (a search that reaches the end of the game: exact solver below END_SW empties — engine.c)
  } catch (e) { WX = null; }
})();
function wasmWeights() {
  WON = false;
  if (!WX || !W) return;
  // (v5) engine.c keeps the weights in memory it grows to their size (w_alloc); before, a fixed table of w_max()
  const wp = WX.w_alloc ? WX.w_alloc(W.length) : W.length <= WX.w_max() ? WX.w_ptr() : 0;
  if (!wp) return;
  new Int16Array(WX.memory.buffer, wp, W.length).set(W);
  new Int32Array(WX.memory.buffer, WX.tab_ptr(0), NINST).set(I_OFF.subarray(0, NINST));
  new Int32Array(WX.memory.buffer, WX.tab_ptr(1), 65).set(SQ_START);
  new Int32Array(WX.memory.buffer, WX.tab_ptr(2), SQ_START[64]).set(SQI.subarray(0, SQ_START[64]));
  new Int32Array(WX.memory.buffer, WX.tab_ptr(3), SQ_START[64]).set(SQP.subarray(0, SQ_START[64]));
  WX.set_patterns(NINST, NPHASE, PHASE_SIZE, USE_EXT, EXT_OFF);
  WX.clear_tt(); WON = true;
}
function wasmIn() {
  if (WX.set_node_max) WX.set_node_max(nodeMax);
  WX.set_state(nodes, deadline === Infinity ? 0 : deadline, MPC.on ? 1 : 0, MPC.t, MPC.A, MPC.B, MPC.C, MPC.minDepth, TUNE.evalMin, TUNE.searchMin, TUNE.sDepth, TUNE.kE);
}
function wasmOut(v) { nodes = WX.get_nodes(); if (WX.get_aborted()) { aborted = true; throw ABORT; } return v; }
function search(pl, ph, ol, oh, depth, alpha, beta, ply, passed) {
  if (!WON || evaluate !== evalPattern) return searchJS(pl, ph, ol, oh, depth, alpha, beta, ply, passed);
  wasmIn(); return wasmOut(WX.search(pl, ph, ol, oh, depth, alpha, beta, ply, passed ? 1 : 0));
}
function solve(pl, ph, ol, oh, alpha, beta, empties, ply, passed) {
  if (!WON || evaluate !== evalPattern) return solveJS(pl, ph, ol, oh, alpha, beta, empties, ply, passed);
  wasmIn(); return wasmOut(WX.solve_(pl, ph, ol, oh, alpha, beta, empties, ply, passed ? 1 : 0));
}

// --------------------------------------------------------- root drivers
function childOf(pl, ph, ol, oh, s) {
  flips(s, pl, ph, ol, oh);
  const fl = FL, fh = FH;
  let npl, nph;
  if (s < 32) { npl = pl | fl | (1 << s); nph = ph | fh; } else { npl = pl | fl; nph = ph | fh | (1 << (s - 32)); }
  return [ol & ~fl, oh & ~fh, npl, nph]; // opponent to move
}
function legalList(pl, ph, ol, oh) {
  genMoves(pl, ph, ol, oh);
  const out = []; let l = ML, h = MH;
  while (l) { out.push(lsb(l)); l &= l - 1; }
  while (h) { out.push(lsb(h) + 32); h &= h - 1; }
  return out;
}

/** evaluate each root move individually (full window). mode: 'mid' (depth) or 'exact' */
function scoreAllMoves(pos, moves, mode, depth) {
  const res = [];
  const [pl, ph, ol, oh] = pos;
  const empties = 64 - pc(pl | ol) - pc(ph | oh);
  for (const s of moves) {
    const [a, b, c, d] = childOf(pl, ph, ol, oh, s);
    let v;
    if (mode === 'exact') v = -solve(a, b, c, d, -64, 64, empties - 1, 1, false) * SCALE;
    else v = -search(a, b, c, d, depth - 1, -32000, 32000, 1, false);
    res.push({ move: s, score: v });
  }
  return res;
}

/** principal-variation search at root, returns {move, score} */
let PART = null;   // the root move of the depth being searched that is known best so far (think: kept when the deadline cuts the depth)
function rootPVS(pos, moves, depth, mode, a0, b0) {
  const [pl, ph, ol, oh] = pos;
  const empties = 64 - pc(pl | ol) - pc(ph | oh);
  let alpha = mode === 'exact' ? -65 : -32001, beta = -alpha;
  if (a0 !== undefined) { alpha = a0; beta = b0; }
  if (ybwOn() && moves.length <= 64) {   // (threads, YBW: the same root search in engine.c, split over the idle helpers)
    new Int8Array(WX.memory.buffer, WX.root_mv(), 64).set(moves);
    wasmIn();
    const v = WX.root_mt(pl, ph, ol, oh, mode === 'exact' ? 1 : 0, depth, alpha, beta, moves.length), bm = WX.root_info(0), bi = WX.root_info(1);
    if (PART && bi >= 0) { PART.move = bm; PART.score = WX.root_info(2) * (mode === 'exact' ? SCALE : 1); PART.n = bi; }
    wasmOut(v);
    return { move: bm, score: mode === 'exact' ? v * SCALE : v };
  }
  let best = null, bestScore = -99999;
  for (let i = 0; i < moves.length; i++) {
    const s = moves[i];
    const [a, b, c, d] = childOf(pl, ph, ol, oh, s);
    const S = mode === 'exact'
      ? (lo, hi) => -solve(a, b, c, d, -hi, -lo, empties - 1, 1, false)
      : (lo, hi) => -search(a, b, c, d, depth - 1, -hi, -lo, 1, false);
    let v;
    if (i === 0) v = S(alpha, beta);
    else {
      v = S(alpha, alpha + 1);
      if (v > alpha) v = S(v - 1 > alpha ? v - 1 : alpha, beta);
    }
    if (v > bestScore) { bestScore = v; best = s; if (PART) { PART.move = s; PART.score = v; PART.n = i; } if (v > alpha) { alpha = v; if (alpha >= beta) break; } }
  }
  return { move: best, score: mode === 'exact' ? bestScore * SCALE : bestScore };
}

// ---- root splitting of the exact / win-draw-loss solve over several threads (engine_mt.wasm, shared transposition table)
// SPLIT: an Int32Array on a SharedArrayBuffer that every thread of the pool sees (mt-worker.js sets root.REVERSI_SPLIT to
// the pool's control block; [0] = 1 when the page stops the threads). The lead (no opts.rot) announces its root position
// when its think will solve; it searches the first root move itself with the window, then the other root moves are taken
// one by one (an atomic counter) by the lead and the helpers: a null-window test against the shared best, a re-search on a
// fail-high. While the lead is on the first move, the helpers solve its replies from the other end (they fill the shared
// table). The result is the same exact value as rootPVS. Helpers (opts.rot > 0) join when the announced position is theirs.
const SP = { GEN: 8, ST: 9, NEXT: 10, DONE: 11, BEST: 12, LO: 13, HI: 14, N: 15, FAIL: 16, POS: 17, MV: 24, ACT: 64 };   // ACT + i: the generation while root move i is being solved (2026-11-09)   // ST: 0 none, 1 announced, 2 first move, 3 open, 4 closed
const splitArr = () => { const s = root.REVERSI_SPLIT; return s && s.length >= SP.MV + 40 ? s : null; };
const spPack = (v, m) => ((v + 128) << 8) | m, spV = x => (x >> 8) - 128;
function spBest(S, v, m) { for (;;) { const x = Atomics.load(S, SP.BEST); if (spV(x) >= v) return; if (Atomics.compareExchange(S, SP.BEST, x, spPack(v, m)) === x) return; } }
function spSamePos(S, pos) { for (let i = 0; i < 4; i++) if (Atomics.load(S, SP.POS + i) !== (pos[i] | 0)) return false; return true; }
function splitAnnounce(pos) {
  const S = splitArr(); if (!S) return null;
  for (let i = 0; i < 4; i++) Atomics.store(S, SP.POS + i, pos[i] | 0);
  Atomics.store(S, SP.ST, 1); Atomics.notify(S, SP.ST);
  return S;
}
function splitEnd(S) { if (S) { Atomics.store(S, SP.ST, 0); Atomics.notify(S, SP.ST); } }
// take root moves of generation g until none is left (lead and helpers)
function splitClaim(S, g, pos, empties) {
  const [pl, ph, ol, oh] = pos, n = Atomics.load(S, SP.N), lo = Atomics.load(S, SP.LO), hi = Atomics.load(S, SP.HI);
  for (;;) {
    const x = Atomics.load(S, SP.NEXT);
    if ((x >>> 8) !== g || (x & 255) >= n) return;
    if (Atomics.compareExchange(S, SP.NEXT, x, x + 1) !== x) continue;
    const m = Atomics.load(S, SP.MV + (x & 255)), [a, b, c, d] = childOf(pl, ph, ol, oh, m), act = SP.ACT + Math.min(35, x & 255);
    let fail = false;
    Atomics.store(S, act, g);
    try {
      const al = Math.max(lo, spV(Atomics.load(S, SP.BEST)));
      if (al < hi) {
        let v = -solve(a, b, c, d, -(al + 1), -al, empties - 1, 1, false);
        if (v > al) { const a2 = Math.max(lo, spV(Atomics.load(S, SP.BEST)), v - 1); if (v < hi) v = -solve(a, b, c, d, -hi, -a2, empties - 1, 1, false); }
        spBest(S, v, m);
      }
    } catch (e) { if (e !== ABORT) throw e; fail = true; Atomics.store(S, SP.FAIL, 1); }
    Atomics.store(S, act, 0);
    Atomics.add(S, SP.DONE, 1); Atomics.notify(S, SP.DONE);
    if (fail) throw ABORT;
  }
}
// the lead: rootPVS(pos, moves, 0, 'exact', lo, hi) on all the threads
function rootSplit(S, pos, moves, lo, hi) {
  const [pl, ph, ol, oh] = pos, empties = 64 - pc(pl | ol) - pc(ph | oh), n = moves.length;
  if (n < 2) return rootPVS(pos, moves, 0, 'exact', lo, hi);
  const g = (Atomics.add(S, SP.GEN, 1) + 1) & 0xffffff;
  Atomics.store(S, SP.GEN, g);
  for (let i = 0; i < n; i++) Atomics.store(S, SP.MV + i, moves[i]);
  Atomics.store(S, SP.N, n); Atomics.store(S, SP.LO, lo); Atomics.store(S, SP.HI, hi); Atomics.store(S, SP.FAIL, 0); Atomics.store(S, SP.DONE, 0);
  Atomics.store(S, SP.BEST, spPack(-127, moves[0])); Atomics.store(S, SP.NEXT, (g << 8) | 1);
  Atomics.store(S, SP.ST, 2); Atomics.notify(S, SP.ST);
  try {
    const [a, b, c, d] = childOf(pl, ph, ol, oh, moves[0]);
    const v0 = -solve(a, b, c, d, -hi, -lo, empties - 1, 1, false);
    spBest(S, v0, moves[0]);
    if (v0 < hi) {
      Atomics.store(S, SP.ST, 3); Atomics.notify(S, SP.ST);
      splitClaim(S, g, pos, empties);
      for (;;) {   // the moves the helpers are still on
        const dn = Atomics.load(S, SP.DONE);
        if (dn >= n - 1) break;
        if (Atomics.load(S, SP.FAIL) || Atomics.load(S, 0)) throw ABORT;
        Atomics.wait(S, SP.DONE, dn, 20);
      }
      if (Atomics.load(S, SP.FAIL)) throw ABORT;
    } else {   // fail-high on the first move: no more moves; wait for the ones already taken (they write into this generation)
      const taken = (Atomics.exchange(S, SP.NEXT, (g << 8) | 255) & 255) - 1;
      for (let dn; (dn = Atomics.load(S, SP.DONE)) < taken && !Atomics.load(S, 0);) Atomics.wait(S, SP.DONE, dn, 20);
    }
  } catch (e) {
    Atomics.store(S, SP.NEXT, (g << 8) | 255);   // nothing more to take
    if (e === ABORT && WX && WX.mt_stop && !Atomics.load(S, 0)) WX.mt_stop(1);   // (our own time is up: the helpers' searches stop too)
    throw e;
  } finally { Atomics.store(S, SP.ST, 4); Atomics.notify(S, SP.ST); }
  const x = Atomics.load(S, SP.BEST);
  return { move: x & 255, score: spV(x) * SCALE };
}
// a helper in the solve phase of its own think: help the lead while it solves this position (returns only by ABORT)
function splitHelp(pos, empties, id) {
  const S = splitArr(); if (!S) return false;
  const t0 = Date.now();
  while (!(Atomics.load(S, SP.ST) && spSamePos(S, pos))) {   // (the lead may announce a moment later)
    if (Date.now() - t0 > 40 || Atomics.load(S, 0)) return false;
    Atomics.wait(S, SP.ST, Atomics.load(S, SP.ST), 5);
  }
  let lastG = -1, gcG = -1, gcList = null, gcI = 0, idle = null, helped = 0;
  for (;;) {
    if (Atomics.load(S, 0) || !spSamePos(S, pos)) throw ABORT;
    const st = Atomics.load(S, SP.ST), g = Atomics.load(S, SP.GEN);
    if (st === 0) throw ABORT;
    if (st === 3 && g !== lastG) { lastG = g; splitClaim(S, g, pos, empties); idle = null; helped = 0; continue; }
    if (st === 3 && g === lastG && empties >= 6 && LAZY.idle) {
      // no root move left to take: help a move another thread is still solving (its replies, from the other end, with
      // the null window it is tested with; they fill the shared table), until it is done (2026-11-09)
      if (idle && (Atomics.load(S, idle.act) !== g || idle.j >= idle.rs.length)) idle = null;
      if (!idle) {   // (each move once: helped = the moves done)
        const n = Math.min(32, Atomics.load(S, SP.N));
        for (let t = 0; t < n && !idle; t++) {
          const i = 1 + (t + id) % Math.max(1, n - 1);
          if (i >= n || (helped >>> i) & 1 || Atomics.load(S, SP.ACT + i) !== g) continue;
          helped |= 1 << i;
          const c = childOf(pos[0], pos[1], pos[2], pos[3], Atomics.load(S, SP.MV + i)), rs = legalList(c[0], c[1], c[2], c[3]).reverse();
          if (rs.length > 1) { const k0 = (id >> 1) % rs.length; idle = { act: SP.ACT + i, c, rs: rs.slice(k0).concat(rs.slice(0, k0)), j: 0 }; }
        }
      }
      if (idle) {
        const al = Math.max(Atomics.load(S, SP.LO), spV(Atomics.load(S, SP.BEST))), [a, b, c, d] = idle.c, [e, f, h, k] = childOf(a, b, c, d, idle.rs[idle.j++]);
        if (al < Atomics.load(S, SP.HI)) solve(e, f, h, k, al, al + 1, empties - 2, 2, false);
        continue;
      }
    }
    if (st === 2 && g !== lastG) {
      // the lead is on the first move: solve its replies, starting from the other end
      if (gcG !== g) {
        gcG = g; gcI = 0;
        const [a, b, c, d] = childOf(pos[0], pos[1], pos[2], pos[3], Atomics.load(S, SP.MV));
        const rs = legalList(a, b, c, d);
        const rr = rs.reverse(), k0 = rr.length ? (id - 1) % rr.length : 0;
        gcList = { c: [a, b, c, d], rs: rr.slice(k0).concat(rr.slice(0, k0)), lo: Atomics.load(S, SP.LO), hi: Atomics.load(S, SP.HI) };
      }
      if (gcI < gcList.rs.length && empties >= 4) {
        const [a, b, c, d] = gcList.c, [e, f, h, k] = childOf(a, b, c, d, gcList.rs[gcI++]);
        solve(e, f, h, k, gcList.lo, gcList.hi, empties - 2, 2, false);
        continue;
      }
    }
    Atomics.wait(S, SP.ST, st, 10);
  }
}

// ---- Lazy SMP of the midgame (2026-11-09): the helpers publish the deepest root result they have finished in the shared
// control block ([100] the position's key, set by the lead; [101] depth << 24 | move << 18 | score + 2^17). The lead takes
// a deeper one at the end of each of its depths (and when its time is up) and goes on from there; a helper that falls
// behind it skips ahead. Without helpers nothing changes (one thread: the same moves and nodes as before).
const LZ_KEY = 100, LZ_BEST = 101, LZ_MAXD = 102;   // (LZ_MAXD, 2026-11-13: the lead's deepest midgame depth — a Lazy helper of a
// fixed-depth level (Lv.25-35) stops there, so the level reads to its depth on any thread count)
const lzArr = () => { const s = root.REVERSI_SPLIT; return s && s.length >= 104 ? s : null; };
const lzKey = pos => (Math.imul(pos[0] ^ 0x9E3779B9, 0x85EBCA6B) ^ Math.imul(pos[1] + 0x7F4A7C15, 0xC2B2AE35) ^ Math.imul(pos[2] ^ 0x165667B1, 0x27D4EB2F) ^ Math.imul(pos[3] + 0x61C88647, 0x9E3779B1)) | 1;
function lzPut(L, k, d, mv, sc) {
  if (Atomics.load(L, LZ_KEY) !== k || mv < 0 || d > 127) return;
  { const lim = Atomics.load(L, LZ_MAXD); if (lim > 0 && d > lim) return; }
  const x = (d << 24) | (mv << 18) | (Math.max(-131000, Math.min(131000, sc)) + 131072);
  for (;;) { const c = Atomics.load(L, LZ_BEST); if ((c >>> 24) >= d) return; if (Atomics.compareExchange(L, LZ_BEST, c, x) === c) break; }
  if (WX && WX.mt_jump_set && Atomics.load(L, LZ_KEY) === k) WX.mt_jump_set(d);   // (the lead's search of depth d stops at once: engine.c jumpAt)
}
function lzGet(L, k) {
  if (Atomics.load(L, LZ_KEY) !== k) return null;
  const x = Atomics.load(L, LZ_BEST);
  return x ? { depth: x >>> 24, move: (x >> 18) & 63, score: (x & 0x3FFFF) - 131072 } : null;
}

// how helper thread `id` (1, 2, …) differs from the lead in the midgame. 'rot' (before 2026-11-09): root moves rotated by id.
// 'mix': odd helpers rotate the root moves, even ones keep the lead's root order and rotate the replies one ply below
// (engine_mt.wasm set_rot1), so the lead's first (most expensive) move is shared out too.
// 'ybw' (2026-11-10, MODEL_CARD.md「マルチスレッド v4」): no Lazy SMP — the helpers wait in engine.c mt_idle and take the
// remaining moves of the nodes whose first move is done (Young Brothers Wait split points, midgame and solver, the root too:
// rootPVS → root_mt); the lead's think is the only search. 'mix' and the others: Lazy SMP (+ rootSplit / splitHelp in the solve).
// (2026-11-13, v5 Praline, MODEL_CARD.md「マルチスレッド v5（Praline）」) ybwHelpers: in 'ybw', the helpers past the first 9
// (threads 11-14 of a 14-core Mac) are Lazy SMP — they deepen the root on their own ('mix' above, engine_mt.wasm mt_lazy: no
// split points of their own) and hand a finished depth to the lead (lzPut / JMP); the YBW threads never wait for them (a
// thread on an efficiency core holds nobody up). As chess / shogi (YBW 10 + Lazy).
const LAZY = { plan: 'ybw', idle: true, ybwHelpers: 9 };   // (idle: splitHelp's help on the root moves still being solved)
const ybwOn = () => LAZY.plan === 'ybw' && WON && !!WX.root_mt && !!root.REVERSI_SPLIT;
function helperPlan(id) {
  if (LAZY.plan === 'rot') return { rk: id, r1: 0, d0: 0 };
  if (LAZY.plan === 'r1') return { rk: 0, r1: id, d0: 0 };
  if (LAZY.plan === 'mixd') return id & 1 ? { rk: (id + 1) >> 1, r1: 0, d0: 0 } : { rk: 0, r1: id >> 1, d0: (id >> 1) & 1 };
  return id & 1 ? { rk: (id + 1) >> 1, r1: 0, d0: 0 } : { rk: 0, r1: id >> 1, d0: 0 };
}

function orderRoot(moves, prev) {
  if (!prev) return moves;
  return moves.slice().sort((a, b) => (prev.get(b) ?? -1e9) - (prev.get(a) ?? -1e9));
}

// 28 strength levels (v4.1: 20, 2026-11-08: +21-25, 2026-11-11: 17-27 re-cut by depth, the strongest is Lv.28). noise: random jitter added to every move's score (eval units, 100 = 1 disc);
// mpc: Multi-ProbCut + opening book; time: soft time per move in ms (levels 17-25 also split the root over several workers in the page).
// The old 10 levels were the same settings as 4, 7, 9 (≈ old 3), 11, 13, 14, 16, 17, 19, 20 (Lv.1-13 made gentler on 2026-11-10).
// Lv.1-13 (2026-11-10, "gentle"): rnd = the chance of a random move, greedy = the chance of a beginner's move (most discs
// flipped: corners given away, X squares), else the search with noise; the endgame solve only in the last few squares.
// The same depths as before (the level descriptions); measured Elo of each level: MODEL_CARD.md「やさしいレベル」.
// 36 strength levels (2026-11-13; 28 before). Lv.1-28 are the levels a person plays against (the portal's rewards): the 20 levels of the
// 28-level ladder up to its Lv.20 (about Egaroucid for Web's strongest, Lv.15) with 8 new ones in the widest gaps between them
// (Lv.8, 10, 13, 15, 17, 19, 21, 23). Lv.29-36 ("天上") are the old Lv.21-28. Old → new: index.html LV_28TO36.
// Lv.25-35 read to a fixed depth (the same strength on any device; time / use / max are only a guard for slow devices), Lv.36 by time.
const LEVELS = [
  null,
  { depth: 1, exact: 0, rnd: 0.7, greedy: 0.2, noise: 3000 },   // 1
  { depth: 1, exact: 0, rnd: 0.5, greedy: 0.3, noise: 1800 },   // 2
  { depth: 1, exact: 0, rnd: 0.32, greedy: 0.3, noise: 1300 },   // 3
  { depth: 1, exact: 2, rnd: 0.22, greedy: 0.28, noise: 1100 },   // 4
  { depth: 1, exact: 4, rnd: 0.14, greedy: 0.22, noise: 900 },   // 5
  { depth: 2, exact: 4, rnd: 0.12, greedy: 0.16, noise: 900 },   // 6
  { depth: 2, exact: 5, rnd: 0.08, greedy: 0.12, noise: 700 },   // 7
  { depth: 2, exact: 5, rnd: 0.065, greedy: 0.095, noise: 620 },   // 8 (2026-11-13: new, between the levels beside it)
  { depth: 2, exact: 6, rnd: 0.05, greedy: 0.07, noise: 550 },   // 9 (Lv.8 until 2026-11-13)
  { depth: 3, exact: 6, rnd: 0.045, greedy: 0.06, noise: 500 },   // 10 (2026-11-13: new, between the levels beside it)
  { depth: 3, exact: 7, rnd: 0.04, greedy: 0.05, noise: 450 },   // 11 (Lv.9 until 2026-11-13)
  { depth: 4, exact: 8, rnd: 0.03, greedy: 0.03, noise: 450 },   // 12 (Lv.10 until 2026-11-13)
  { depth: 4, exact: 8, rnd: 0.025, greedy: 0.015, noise: 425 },   // 13 (2026-11-13: new, between the levels beside it)
  { depth: 4, exact: 9, rnd: 0.02, noise: 400 },   // 14 (Lv.11 until 2026-11-13)
  { depth: 5, exact: 9, rnd: 0.015, noise: 350 },   // 15 (2026-11-13: new, between the levels beside it)
  { depth: 5, exact: 10, rnd: 0.01, noise: 300 },   // 16 (Lv.12 until 2026-11-13)
  { depth: 5, exact: 11, rnd: 0.005, noise: 240 },   // 17 (2026-11-13: new, between the levels beside it)
  { depth: 6, exact: 12, noise: 180 },   // 18 (Lv.13 until 2026-11-13)
  { depth: 7, exact: 13, noise: 90 },   // 19 (2026-11-13: new, between the levels beside it)
  { depth: 8, exact: 14 },   // 20 (Lv.14 until 2026-11-13)
  { depth: 9, exact: 14 },   // 21 (2026-11-13: new, between the levels beside it)
  { depth: 9, exact: 15, time: 700, mpc: 1 },   // 22 (Lv.15 until 2026-11-13)
  { depth: 9, exact: 16, time: 850, mpc: 1 },   // 23 (2026-11-13: new, between the levels beside it)
  { depth: 10, exact: 16, time: 1000, mpc: 1 },   // 24 (Lv.16 until 2026-11-13)
  { depth: 10, exact: 18, wld: 20, end: 24, time: 10000, use: 1, max: 20000, mpc: 1 },   // 25 (Lv.17 until 2026-11-13)
  { depth: 11, exact: 18, wld: 20, end: 24, time: 10000, use: 1, max: 20000, mpc: 1 },   // 26 (Lv.18 until 2026-11-13)
  { depth: 12, exact: 18, wld: 20, end: 24, time: 10000, use: 1, max: 20000, mpc: 1 },   // 27 (Lv.19 until 2026-11-13)
  { depth: 13, exact: 20, wld: 22, end: 26, time: 10000, use: 1, max: 20000, mpc: 1 },   // 28 (Lv.20 until 2026-11-13)
  // 29-36 (2026-11-13, "天上" — beyond what a person plays against: no rewards in the portal): Lv.21-28 until then. 29-35 read to a fixed depth,
  // 36 is the strongest, by time on all threads (wtry / xtry / tryMs / end: MODEL_CARD.md「上位レベルの追加の読み切り」「終局まで読む」)
  { depth: 16, exact: 22, wld: 24, end: 28, time: 15000, use: 1, max: 30000, mpc: 1 },   // 29 (Lv.21 until 2026-11-13)
  { depth: 20, mix: 16, exact: 22, wld: 24, end: 28, time: 20000, use: 1, max: 40000, mpc: 1 },   // 30 (Lv.22 until 2026-11-13)
  { depth: 20, exact: 22, wld: 24, end: 28, time: 20000, use: 1, max: 40000, mpc: 1 },   // 31 (Lv.23 until 2026-11-13)
  { depth: 22, exact: 23, wld: 24, wtry: 27, xtry: 25, tryMs: 4000, end: 30, time: 25000, use: 1, max: 50000, mpc: 1 },   // 32 (Lv.24 until 2026-11-13)
  { depth: 25, mix: 20, exact: 23, wld: 25, wtry: 28, xtry: 25, tryMs: 5000, end: 30, time: 30000, use: 1, max: 60000, mpc: 1 },   // 33 (Lv.25 until 2026-11-13)
  { depth: 25, exact: 23, wld: 25, wtry: 28, xtry: 25, tryMs: 5000, end: 30, time: 30000, use: 1, max: 60000, mpc: 1 },   // 34 (Lv.26 until 2026-11-13)
  { depth: 28, exact: 24, wld: 26, wtry: 29, xtry: 26, tryMs: 6000, end: 30, time: 30000, use: 1, max: 60000, mpc: 1 },   // 35 (Lv.27 until 2026-11-13)
  { depth: 60, exact: 23, wld: 25, wtry: 32, xtry: 28, time: 18000, use: 0.8, max: 30000, mpc: 1 },   // 36 (Lv.28 until 2026-11-13)
];
const NLEVELS = LEVELS.length - 1, DEF_LEVEL = 22;

// ------------------------------------------------------------ opening book (self-generated)
let BOOK = null;
const SYMS = [];
for (let t = 0; t < 8; t++) { const m = new Int8Array(64); for (let q = 0; q < 64; q++) { let r = q >> 3, c = q & 7; if (t & 1) c = 7 - c; if (t & 2) r = 7 - r; if (t & 4) { const x = r; r = c; c = x; } m[q] = r * 8 + c; } SYMS.push(m); }
function symBits(pl, ph, ol, oh, m) { let a = 0, b = 0, c = 0, d = 0; for (let q = 0; q < 64; q++) { const t = m[q]; if (bit(pl, ph, q)) { if (t < 32) a |= 1 << t; else b |= 1 << (t - 32); } else if (bit(ol, oh, q)) { if (t < 32) c |= 1 << t; else d |= 1 << (t - 32); } } return [a, b, c, d]; }
const hex8 = x => (x >>> 0).toString(16).padStart(8, '0');
// canonical form (the smallest of the 8 symmetric forms, the same as symBits with SYMS[t]): [key, symmetry, bits]
// by bytes (rows): t & 1 mirrors the columns, t & 2 the rows, t & 4 transposes
const REV8 = new Uint8Array(256), TLO = new Int32Array(256), THI = new Int32Array(256);
for (let b = 0; b < 256; b++) for (let c = 0; c < 8; c++) if (b >> c & 1) { REV8[b] |= 128 >> c; if (c < 4) TLO[b] |= 1 << (c * 8); else THI[b] |= 1 << ((c - 4) * 8); }
const SYMR = new Uint8Array(8);
function symBB(lo, hi, t, out, o) {
  for (let r = 0; r < 8; r++) { let b = (r < 4 ? lo >>> (r * 8) : hi >>> ((r - 4) * 8)) & 255; if (t & 1) b = REV8[b]; SYMR[t & 2 ? 7 - r : r] = b; }
  let l = 0, h = 0;
  if (t & 4) for (let r = 0; r < 8; r++) { const b = SYMR[r]; l |= TLO[b] << r; h |= THI[b] << r; }
  else { l = SYMR[0] | SYMR[1] << 8 | SYMR[2] << 16 | SYMR[3] << 24; h = SYMR[4] | SYMR[5] << 8 | SYMR[6] << 16 | SYMR[7] << 24; }
  out[o] = l; out[o + 1] = h;
}
const CAN_T = new Int32Array(4), CAN_B = new Int32Array(4);
function bookCanon(pl, ph, ol, oh) {
  let bt = -1;
  for (let t = 0; t < 8; t++) {
    symBB(pl, ph, t, CAN_T, 0); symBB(ol, oh, t, CAN_T, 2);
    let less = bt < 0;
    if (!less) for (let i = 0; i < 4; i++) { const x = CAN_T[i] >>> 0, y = CAN_B[i] >>> 0; if (x !== y) { less = x < y; break; } }
    if (less) { bt = t; CAN_B.set(CAN_T); }
  }
  const bb = [CAN_B[0], CAN_B[1], CAN_B[2], CAN_B[3]];
  return [bb.map(hex8).join(''), bt, bb];
}
function bookLookup(pl, ph, ol, oh) {
  if (!BOOK) return null;
  const [best, bt] = bookCanon(pl, ph, ol, oh);
  const e = BOOK instanceof Map ? BOOK.get(best) : BOOK[best]; if (!e) return null;
  const inv = new Int8Array(64); for (let q = 0; q < 64; q++) inv[SYMS[bt][q]] = q;
  return e.map(([m, v]) => ({ move: inv[m], score: v }));
}
// book.bin (tools/book-gen.js): 'RVB2', u8 version, u8 window (1/10 disc), 2 reserved, u32 node count, then the book tree depth-first from the
// initial position, each node in its canonical form: u8 n, n x (u8 move | 0x80 when that child's node follows, i16 LE score
// in 1/10 disc for the side to move, best first), then the nodes of the flagged children in order (skipping one already read
// through an earlier sibling). Moves are in the canonical frame (as book.json).
function decodeBook(buf) {
  const u8 = buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  if (u8.length < 12 || u8[0] !== 82 || u8[1] !== 86 || u8[2] !== 66 || u8[3] !== 50) return null;
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), map = new Map();
  let p = 12;
  const node = (key, bits) => {
    const n = u8[p++], list = [], kids = [];
    for (let i = 0; i < n; i++) { const m = u8[p], v = dv.getInt16(p + 1, true); p += 3; list.push([m & 63, v / 10]); if (m & 128) kids.push(m & 63); }
    map.set(key, list);
    for (const m of kids) { const c = childOf(bits[0], bits[1], bits[2], bits[3], m), [k, , b] = bookCanon(c[0], c[1], c[2], c[3]); if (!map.has(k)) node(k, b); }   // (already read through a sibling: not written again)
  };
  const [k0, , b0] = bookCanon(0x10000000, 0x8, 0x08000000, 0x10);   // the initial position, black to move
  node(k0, b0);
  map.window = u8[5] / 10 || 3;   // (the book's window in discs: moves further below the best are not listed)
  return map;
}
function setBook(obj) { BOOK = obj && (obj instanceof ArrayBuffer || ArrayBuffer.isView(obj)) ? decodeBook(obj) : obj; }

/**
 * think(cells, toMove, opts) -> {move, score, depth, nodes, exact, ms}
 * cells: array(64) 0 empty / 1 black / 2 white; toMove: 1 or 2
 * score is from side-to-move perspective in discs (float)
 */
function toBits(cells, toMove) {
  let pl = 0, ph = 0, ol = 0, oh = 0;
  for (let s = 0; s < 64; s++) {
    const v = cells[s]; if (!v) continue;
    const mine = v === toMove;
    if (s < 32) { if (mine) pl |= 1 << s; else ol |= 1 << s; }
    else { if (mine) ph |= 1 << (s - 32); else oh |= 1 << (s - 32); }
  }
  return [pl, ph, ol, oh];
}

function mixPick(pl, ph, ol, oh) {   // one bit from a hash of the position (lv.mix)
  let h = Math.imul(pl ^ 0x2545F491, 0x9E3779B1) ^ Math.imul(ph ^ 0x6C8E9CF5, 0x85EBCA6B) ^ Math.imul(ol ^ 0x1B873593, 0xC2B2AE35) ^ Math.imul(oh ^ 0x7FEB352D, 0x27D4EB2F);
  h ^= h >>> 15; h = Math.imul(h, 0x2C1B3C6D); h ^= h >>> 12;
  return (h >>> 7) & 1;
}
let TRY_W = 99, TRY_X = 99;   // the most empties the timed extra solves (lv.tryMs) are tried at on this device (99: no limit yet)
function think(cells, toMove, opts, onProgress) {
  const lv = opts.cfg || LEVELS[opts.level] || LEVELS[DEF_LEVEL];
  MPC.on = !!lv.mpc; // keep the weaker levels as plain full-width searches
  const pos = toBits(cells, toMove);
  const [pl, ph, ol, oh] = pos;
  const moves = legalList(pl, ph, ol, oh);
  const t0 = Date.now();
  nodes = 0; aborted = false;
  if (WON && WX.set_end) WX.set_end(END_SW);   // (threads: every instance of the shared module)
  if (moves.length === 0) return { move: -1, score: 0, depth: 0, nodes: 0, ms: 0 };
  if ((lv.mpc || opts.book) && !opts.noBook) {   // (opts.book: PRO mode's opening book at any level)
    const bk = bookLookup(pl, ph, ol, oh);
    if (bk && bk.length) {
      const top = bk[0].score, margin = opts.bookMargin ?? 0.8;
      const c = bk.filter(x => x.score >= top - margin && moves.includes(x.move));
      if (c.length) { const r = (opts.random || Math.random)(); const pick = c[Math.floor(r * c.length)]; return { move: pick.move, score: pick.score, depth: 0, nodes: 0, ms: Date.now() - t0, book: true }; }
    }
  }
  const empties = 64 - pc(pl | ol) - pc(ph | oh);
  const lazyH = !!(opts.rot && ybwOn() && WX.mt_lazy && opts.rot > LAZY.ybwHelpers);   // (a Lazy SMP helper past the YBW ones: v5)
  if (WON && WX.mt_lazy) WX.mt_lazy(lazyH ? 1 : 0);
  if (opts.rot && ybwOn() && !lazyH) {   // a helper (YBW): take moves at the lead's split points until the pool stops the threads
    nodes = WX.mt_idle(0, 1);   // (Praline: no time limit, a new job)
    return { move: -1, score: 0, depth: 0, nodes, ms: Date.now() - t0 };
  }
  if (!opts.rot && WON && WX.tt_new) WX.tt_new();   // (engine_mt.wasm: a new age for the shared table's entries)
  const time = opts.time ?? lv.time;
  nodeMax = lv.nodes || 0;   // (PRO: a node limit — the search stops like at a deadline and keeps the last finished depth)
  const rand = opts.random || Math.random;
  const variety = opts.variety ?? (empties > 50);  // vary opening play
  let result = null;

  // ---- noisy weak levels: score every move then add noise
  if (lv.noise || lv.rnd || lv.greedy) {
    deadline = Infinity;
    // (2026-11-10, the gentle levels 1-9) human-like slips before any reading: rnd = the chance of a random move,
    // greedy = the chance of a beginner's move (the most discs flipped, corners and X squares not thought about)
    const r0 = rand();
    if (lv.rnd && r0 < lv.rnd) {
      const mv = moves[Math.floor(rand() * moves.length)];
      return { move: mv, score: 0, depth: 0, nodes: 0, ms: Date.now() - t0, slip: 'rnd' };
    }
    if (lv.greedy && r0 < (lv.rnd || 0) + lv.greedy) {
      const o0 = pc(ol) + pc(oh);
      let bm = moves[0], bv = -1;
      for (const s of moves) { const c = childOf(pl, ph, ol, oh, s), v = o0 - pc(c[0]) - pc(c[1]) + rand() * 1.5; if (v > bv) { bv = v; bm = s; } }   // (c[0..1]: the opponent's discs after the move; near ties at random)
      return { move: bm, score: 0, depth: 0, nodes: 0, ms: Date.now() - t0, slip: 'greedy' };
    }
    let sc;
    if (empties <= lv.exact) sc = scoreAllMoves(pos, moves, 'exact');
    else sc = scoreAllMoves(pos, moves, 'mid', Math.min(lv.depth, empties));
    let bi = 0, bv = -1e9;
    for (let i = 0; i < sc.length; i++) {
      const v = sc[i].score + (rand() * 2 - 1) * (lv.noise || 0);
      if (v > bv) { bv = v; bi = i; }
    }
    return { move: sc[bi].move, score: sc[bi].score / SCALE, depth: lv.depth, nodes, ms: Date.now() - t0, exact: empties <= lv.exact };
  }
  if (moves.length === 1 && !opts.analyze) {
    // still give an estimate quickly
    deadline = Date.now() + 150;
    let sc = 0;
    try { const [a, b, c, d] = childOf(pl, ph, ol, oh, moves[0]); sc = -search(a, b, c, d, Math.min(6, empties - 1), -32000, 32000, 1, false); } catch (e) { if (e !== ABORT) throw e; }
    return { move: moves[0], score: sc / SCALE, depth: 1, nodes, ms: Date.now() - t0, forced: true };
  }

  const hardTime = time ? Math.min(time * 2.5, opts.time == null && lv.max || Infinity) : Infinity;   // (lv.max: Lv.21-25 stop by 20 s)
  deadline = time ? t0 + hardTime : Infinity;
  const softTime = time || Infinity;

  // ---- midgame iterative deepening
  let prev = null, depthDone = 0;
  // lv.mix (2026-11-11): about half of the positions — chosen by a hash of the position, so the same on every device and thread count —
  // are read to depth lv.mix instead of lv.depth: a level between two depths (the strength gain by depth comes in steps: MODEL_CARD.md「28段階：Lv.17〜27 を深さで刻み直し」)
  const maxDepth = Math.min(lv.mix && mixPick(pl, ph, ol, oh) ? lv.mix : lv.depth, empties);
  const doExact = empties <= lv.exact;
  const tryMs = !opts.rot && lv.tryMs || 0;   // (the lead only: the helpers are stopped by it)
  const wldNow = !doExact && lv.wld && empties <= Math.max(lv.wld, Math.min(lv.wtry || 0, tryMs ? TRY_W : 99)) && !variety;   // (lv.wtry: Lv.24-28 try the solve further out)
  const xTry = !doExact && !variety && lv.xtry && empties <= Math.min(lv.xtry, tryMs ? TRY_X : 99);
  const SPL = !opts.rot && (doExact ? !variety : wldNow || xTry) && !ybwOn() ? splitAnnounce(pos) : null;   // (threads: the lead's solve is split at the root)
  const LZ = !variety && lzArr(), lzk = LZ ? lzKey(pos) : 0;   // (threads: the helpers' deeper midgame results)
  const HP = opts.rot ? helperPlan(opts.rot) : null;   // (a helper thread: how it differs from the lead)
  if (WON && WX.set_rot1) WX.set_rot1(HP ? HP.r1 : 0);
  if (LZ && !opts.rot) { Atomics.store(LZ, LZ_KEY, lzk); Atomics.store(LZ, LZ_BEST, 0); Atomics.store(LZ, LZ_MAXD, doExact ? Math.min(maxDepth, 10) : maxDepth); if (WX && WX.mt_jump_reset) WX.mt_jump_reset(); }
  const lzLim = m => { if (!LZ || !opts.rot || Atomics.load(LZ, LZ_KEY) !== lzk) return m; const x = Atomics.load(LZ, LZ_MAXD); return x > 0 ? Math.min(m, x) : m; };   // (a helper: the lead's depth)
  const JMP = LZ && !opts.rot && !variety && WX && WX.mt_jump_at ? WX.mt_jump_at : null;   // (the lead: a depth a helper has finished is given up at once, 2026-11-09)
  let partial = false;
  try {
    const midMax = doExact ? Math.min(maxDepth, 10) : maxDepth;
    const startD = Math.min((doExact ? 2 : 1) + (opts.d0 ?? (HP ? HP.d0 : 0)), midMax);   // d0: a helper thread starting a ply ahead (pro/)
    for (let d = startD; d <= lzLim(midMax); d++) {
      let ordered = orderRoot(moves, prev);
      if (HP && HP.rk && ordered.length > 1) { const k = HP.rk % ordered.length; ordered = ordered.slice(k).concat(ordered.slice(0, k)); }   // helper threads: another first move (Lazy SMP diversity)
      let r;
      if (variety && !doExact) {
        const all = scoreAllMoves(pos, ordered, 'mid', d);
        prev = new Map(all.map(x => [x.move, x.score]));
        all.sort((a, b) => b.score - a.score);
        r = { move: all[0].move, score: all[0].score, all };
      } else {
        PART = lv.max ? { d, move: -1, score: 0, n: -1 } : null;   // (Lv.21-25: a depth cut by the deadline still counts when another move has already been proved better)
        if (JMP) {
          JMP(d);
          try { r = rootPVS(pos, ordered, d, 'mid'); }
          catch (e) {   // (stopped because a helper finished this depth — not the deadline: take its result, on to the next depth)
            JMP(0);
            const h = e === ABORT && Date.now() <= deadline && !(nodeMax && nodes >= nodeMax) ? lzGet(LZ, lzk) : null;
            if (!h || h.depth < d || h.depth > midMax) throw e;
            aborted = false; PART = null;
            result = r = { move: h.move, score: h.score }; depthDone = d = h.depth;
            prev = prev || new Map(); prev.set(h.move, 1e8 + d);
            onProgress && onProgress({ depth: d, move: r.move, score: r.score / SCALE, nodes, ms: Date.now() - t0 });
            if (Date.now() - t0 > softTime * (lv.use || 0.45) && !doExact) break;
            continue;
          }
          JMP(0);
        } else r = rootPVS(pos, ordered, d, 'mid');
        PART = null;
        prev = prev || new Map();
        prev.set(r.move, 1e8 + d);
      }
      result = r; depthDone = d;
      if (LZ && !(variety && !doExact)) {
        if (opts.rot) lzPut(LZ, lzk, d, r.move, r.score);
        const h = lzGet(LZ, lzk);
        if (h && h.depth > d && (opts.rot || h.depth <= midMax)) {
          if (!opts.rot) { result = r = { move: h.move, score: h.score }; depthDone = d = h.depth; prev.set(h.move, 1e8 + d); }
          else d = Math.max(d, h.depth + ((opts.d0 ?? HP.d0) ? 1 : 0));   // (a helper behind the others: on to their next depth, + d0)
        }
      }
      onProgress && onProgress({ depth: d, move: r.move, score: r.score / SCALE, nodes, ms: Date.now() - t0 });
      if (Date.now() - t0 > softTime * (lv.use || 0.45) && !doExact) break;   // (lv.use: Lv.21-25 start a new depth later and use more of their time)
    }
    // lv.end (2026-11-12): with lv.end empties or fewer, straight on from the level's depth to the end of the game — the same search with
    // depth = empties (Multi-ProbCut above END_SW empties, the exact solver below: engine.c), an aspiration window of 2 discs around the
    // value so far. Lv.20: +72 Elo for 1.76× the time with end 26 (MODEL_CARD.md「終局まで読む（lv.end）」). The win/draw/loss and exact solves follow as before.
    if (lv.end && WON && WX.set_end && !opts.rot && !doExact && !variety && result && empties <= lv.end && empties > depthDone && depthDone === midMax) {
      const ordered = orderRoot(moves, prev);
      let lo = result.score - 200, hi = result.score + 200, r;
      for (;;) {
        r = rootPVS(pos, ordered, empties, 'mid', lo, hi);
        if (r.score <= lo && lo > -32001) { hi = r.score + 1; lo = -32001; }
        else if (r.score >= hi && hi < 32001) { lo = r.score - 1; hi = 32001; }
        else break;
      }
      result = r; depthDone = empties; prev.set(r.move, 1e8 + empties);
      onProgress && onProgress({ depth: empties, move: r.move, score: r.score / SCALE, nodes, ms: Date.now() - t0 });
    }
  } catch (e) {
    if (e !== ABORT) throw e;
    if (PART && PART.n > 0 && result && PART.move !== result.move) { result = { move: PART.move, score: PART.score }; depthDone = PART.d; partial = true; }
    PART = null;
  }
  if (LZ && !opts.rot && !doExact) {   // (the time is up: a deeper depth finished by a helper)
    const h = lzGet(LZ, lzk);
    if (h && h.depth <= maxDepth && (h.depth > depthDone || (partial && h.depth >= depthDone))) { result = { move: h.move, score: h.score }; depthDone = h.depth; }
  }

  let exactDone = false;
  if (doExact) {
    // exact solve, bounded by deadline
    if (time) deadline = t0 + Math.max(hardTime, 2000);
    else deadline = Infinity;
    try {
      let ordered = orderRoot(moves, prev);
      if (opts.rot && ordered.length > 1) { const k = opts.rot % ordered.length; ordered = ordered.slice(k).concat(ordered.slice(0, k)); }
      let r;
      if (variety) {
        const all = scoreAllMoves(pos, ordered, 'exact');
        all.sort((a, b) => b.score - a.score);
        r = { move: all[0].move, score: all[0].score, all };
      } else {
        // aspiration window around the midgame estimate
        const g = result ? Math.max(-60, Math.min(60, Math.round(result.score / SCALE))) : 0;
        let lo = g - 3, hi = g + 3;
        if (opts.rot && !ybwOn()) splitHelp(pos, empties, opts.rot);   // a helper thread: join the lead's split solve (if it has one; YBW: a Lazy helper solves on its own)
        for (;;) {
          r = SPL ? rootSplit(SPL, pos, ordered, lo, hi) : rootPVS(pos, ordered, 0, 'exact', lo, hi);
          const v = r.score / SCALE;
          if (v <= lo && lo > -65) { hi = v + 1; lo = -65; }
          else if (v >= hi && hi < 65) { lo = v - 1; hi = 65; }
          else break;
        }
      }
      result = r; exactDone = true;
    } catch (e) { if (e !== ABORT) throw e; }
  } else if (wldNow && result) {
    // win / draw / loss solve (window -1..1, much cheaper than exact): play a winning move when there is one,
    // else a drawing one; a lost position keeps the midgame choice. Bounded by the same deadline as the exact solve.
    // Beyond lv.wld (Lv.28's wtry) it is only tried with the time left: a solve cut by the deadline changes nothing.
    if (time) deadline = t0 + (empties <= lv.wld ? Math.max(hardTime, 2000) : hardTime);   // (helper threads: no time, stopped by the lead)
    const tw0 = Date.now(), tryW = tryMs && empties > lv.wld;
    if (tryW) deadline = Math.min(deadline, tw0 + tryMs);
    let wldDone = false;
    try {
      if (opts.rot && !ybwOn()) splitHelp(pos, empties, opts.rot);
      const r = SPL ? rootSplit(SPL, pos, orderRoot(moves, prev), -1, 1) : rootPVS(pos, orderRoot(moves, prev), 0, 'exact', -1, 1);
      wldDone = true;
      if (r.score > 0) result = { move: r.move, score: Math.max(result.score, SCALE) };
      else if (r.score === 0 && result.score < 0) result = { move: r.move, score: 0 };
    } catch (e) { if (e !== ABORT) throw e; }
    if (tryMs) {   // (this device's range of the timed tries)
      if (!wldDone) { if (tryW) TRY_W = empties - 3; }
      else if (TRY_W < 99 && Date.now() - tw0 < tryMs / 4) TRY_W = Math.max(TRY_W, empties + 1);
      if (xTry && wldDone) deadline = Math.min(t0 + hardTime, Date.now() + tryMs);
    }
    const tx0 = Date.now();
    if (xTry && wldDone && Date.now() < deadline) {
      // Lv.28 (lv.xtry): an exact solve with the time still left (aspiration window around the result so far); kept only when it finishes
      try {
        if (prev) prev.set(result.move, 2e8);   // (the move the solve above chose first)
        const ordered = orderRoot(moves, prev);
        const g = Math.max(-60, Math.min(60, Math.round(result.score / SCALE)));
        let lo = g - 3, hi = g + 3, r;
        if (opts.rot && !ybwOn()) splitHelp(pos, empties, opts.rot);
        for (;;) {
          r = SPL ? rootSplit(SPL, pos, ordered, lo, hi) : rootPVS(pos, ordered, 0, 'exact', lo, hi);
          const v = r.score / SCALE;
          if (v <= lo && lo > -65) { hi = v + 1; lo = -65; }
          else if (v >= hi && hi < 65) { lo = v - 1; hi = 65; }
          else break;
        }
        result = r; exactDone = true;
      } catch (e) { if (e !== ABORT) throw e; }
      if (tryMs) { if (!exactDone) TRY_X = empties - 3; else if (TRY_X < 99 && Date.now() - tx0 < tryMs / 4) TRY_X = Math.max(TRY_X, empties + 1); }
    }
  }

  splitEnd(SPL);
  if (!result) result = { move: moves[0], score: 0 };
  // opening variety: pick randomly among near-best moves
  let move = result.move, score = result.score;
  if (variety && result.all) {
    const margin = opts.varietyMargin ?? 60; // 0.6 discs
    const cands = result.all.filter(x => x.score >= result.all[0].score - margin);
    const pick = cands[Math.floor(rand() * cands.length)];
    move = pick.move; score = pick.score;
  }
  return { move, score: score / SCALE, depth: exactDone ? empties : depthDone, nodes, ms: Date.now() - t0, exact: exactDone };
}

// principal variation after `first` (review box): each next move by a short search (exact near the end); -1 = pass
function pvAfter(pos, first, len) {
  const saveDl = deadline; deadline = Infinity;
  let [pl, ph, ol, oh] = childOf(pos[0], pos[1], pos[2], pos[3], first);
  const out = [];
  while (out.length < len) {
    const ms = legalList(pl, ph, ol, oh);
    if (!ms.length) {
      if (!legalList(ol, oh, pl, ph).length) break;
      out.push(-1); [pl, ph, ol, oh] = [ol, oh, pl, ph]; continue;
    }
    const empties = 64 - pc(pl | ol) - pc(ph | oh);
    let best = ms[0], bv = -1e9;
    if (ms.length > 1) for (const s of ms) {
      const [a, b, c, d] = childOf(pl, ph, ol, oh, s);
      const v = empties <= 12 ? -solve(a, b, c, d, -64, 64, empties - 1, 1, false) * SCALE : -search(a, b, c, d, Math.min(4, empties - 1), -32000, 32000, 1, false);
      if (v > bv) { bv = v; best = s; }
    }
    out.push(best); [pl, ph, ol, oh] = childOf(pl, ph, ol, oh, best);
  }
  deadline = saveDl;
  return out;
}
function withPV(pos, list, n) {
  if (!n || !list) return list;
  const top = list.slice().sort((a, b) => b.score - a.score).slice(0, n);
  for (const x of top) x.pv = pvAfter(pos, x.move, 7);
  return list;
}
/** analyze: score all legal moves; returns [{move, score(discs), exact}] (+ pv: the line after the move for the best opts.pv moves) */
function analyze(cells, toMove, opts, onProgress) {
  MPC.on = true;
  const pos = toBits(cells, toMove);
  const [pl, ph, ol, oh] = pos;
  const moves = legalList(pl, ph, ol, oh);
  const empties = 64 - pc(pl | ol) - pc(ph | oh);
  const t0 = Date.now(); nodes = 0; nodeMax = 0;
  if (WON && WX.tt_new) WX.tt_new();
  const time = opts.time || 1500;
  let out = null;
  if (empties <= (opts.exact ?? 18)) {
    deadline = t0 + time * 4;
    try { out = scoreAllMoves(pos, moves, 'exact').map(x => ({ move: x.move, score: x.score / SCALE, exact: true })); }
    catch (e) { if (e !== ABORT) throw e; }
    if (out) return withPV(pos, out, opts.pv);
  }
  deadline = t0 + time * 2;
  let prev = null;
  // in the opening book (book.bin): its moves get the book's values (deeper searches backed up through the book tree);
  // a move that is not listed was more than the book's window below the best there, so it is shown at most that low
  const bk = BOOK instanceof Map && !opts.noBook ? bookLookup(pl, ph, ol, oh) : null;
  const withBook = list => {
    if (!bk || !bk.length) return list;
    const mp = new Map(bk.map(x => [x.move, x.score])), cap = bk[0].score - (BOOK.window || 3);
    return list.map(x => mp.has(x.move) ? Object.assign({}, x, { score: mp.get(x.move), book: true }) : Object.assign({}, x, { score: Math.min(x.score, cap) }));
  };
  try {
    for (let d = 1; d <= Math.min(60, empties); d++) {
      const all = scoreAllMoves(pos, orderRoot(moves, prev), 'mid', d);
      prev = new Map(all.map(x => [x.move, x.score]));
      out = withBook(all.map(x => ({ move: x.move, score: x.score / SCALE, depth: d })));
      onProgress && onProgress(out);
      if (Date.now() - t0 > time * 0.5) break;
    }
  } catch (e) { if (e !== ABORT) throw e; }
  return withPV(pos, out || moves.map(m => ({ move: m, score: 0 })), opts.pv);
}

/** search a single root move (for parallel root splitting). Returns score from the root side's perspective, or null if aborted. */
function searchMove(cells, toMove, move, depth, alpha, beta, mode, dl) {
  MPC.on = true;
  const [pl, ph, ol, oh] = toBits(cells, toMove);
  const empties = 64 - pc(pl | ol) - pc(ph | oh);
  const [a, b, c, d] = childOf(pl, ph, ol, oh, move);
  deadline = dl || Infinity; aborted = false; nodes = 0; nodeMax = 0;
  try {
    if (mode === 'exact') return -solve(a, b, c, d, -beta, -alpha, empties - 1, 1, false);
    return -search(a, b, c, d, depth - 1, -beta, -alpha, 1, false);
  } catch (e) { if (e === ABORT) return null; throw e; }
}
const API = {
  LAZY, think, analyze, searchMove, setWeights, setBook, bookLookup, bookCanon, decodeBook, clearTT, toBits, legalList, childOf, featureIndices,
  evalHand, evaluate: (a, b, c, d) => evaluate(a, b, c, d), search, solve, finalScore, pc,
  get nodes() { return nodes; }, set deadline(v) { deadline = v; },
  TUNE, MPC, get NINST() { return NINST; }, NEXT, get PS_V1() { return PS_V1; }, get PS_V2() { return PS_V2; }, get PHASE_SIZE() { return PHASE_SIZE; }, get PATTERNS() { return PATTERNS; }, get PATTERN_SET() { return PATTERN_SET; }, get WINFO() { return WINFO; }, get USE_EXT() { return USE_EXT; }, get NPHASE() { return NPHASE; }, useSet: k => setupPatterns(SETS[k], k), LEVELS, NLEVELS, SCALE,
  genMovesList: legalList,
};
root.ReversiEngine = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;

// ---- worker glue
if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof window === 'undefined' && typeof module === 'undefined') {
  self.onmessage = (ev) => {
    const m = ev.data;
    if (m.type === 'weights') {
      setWeights(new Int16Array(m.buffer), m.nphase);
      self.postMessage({ type: 'weightsLoaded' });
    } else if (m.type === 'think') {
      const r = think(m.cells, m.toMove, m.opts, p => self.postMessage({ type: 'progress', id: m.id, ...p }));
      self.postMessage({ type: 'result', id: m.id, ...r });
    } else if (m.type === 'analyze') {
      const r = analyze(m.cells, m.toMove, m.opts, p => self.postMessage({ type: 'analysisProgress', id: m.id, list: p }));
      self.postMessage({ type: 'analysis', id: m.id, list: r });
    } else if (m.type === 'job') {
      const v = searchMove(m.cells, m.toMove, m.move, m.depth, m.alpha, m.beta, m.mode, m.deadline);
      self.postMessage({ type: 'jobDone', id: m.id, move: m.move, value: v, nodes });
    } else if (m.type === 'mpc') Object.assign(MPC, m.params);
    else if (m.type === 'book') setBook(m.book);
    else if (m.type === 'clear') clearTT();
  };
}
})(typeof self !== 'undefined' ? self : globalThis);

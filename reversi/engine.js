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
function buildPatterns() {
  const pats = [];
  let offset = 0;
  for (const [name, sqs] of PATTERN_DEFS) {
    const inst = symmetries(sqs);
    const size = POW3[sqs.length];
    pats.push({ name, len: sqs.length, size, offset, inst });
    offset += size;
  }
  return { pats, total: offset };
}
const PB = buildPatterns();
PATTERNS = PB.pats;
// extra scalar features (v2 weights): mobility / potential mobility tables, 64 entries each
const EXT_OFF = PB.total, EXT_SIZE = 256, NEXT = 4;
const PS_V1 = PB.total + 1, PS_V2 = PB.total + EXT_SIZE + 1;
let USE_EXT = false;
PHASE_SIZE = PS_V1; // +1 bias
// flattened instance tables: for each instance -> offset, len, squares
const INST_OFF = [], INST_LEN = [], INST_SQ = [];
for (const p of PATTERNS) for (const m of p.inst) { INST_OFF.push(p.offset); INST_LEN.push(p.len); INST_SQ.push(m); }
const NINST = INST_OFF.length;
const I_OFF = Int32Array.from(INST_OFF), I_LEN = Int8Array.from(INST_LEN);
const I_SQ = new Int8Array(NINST * 10);
for (let i = 0; i < NINST; i++) for (let k = 0; k < INST_LEN[i]; k++) I_SQ[i * 10 + k] = INST_SQ[i][k];
// per-square contribution lists: for each square, (instance, power-of-3 at that square's position)
const SQ_START = new Int32Array(65), SQ_INST = [], SQ_POW = [];
{
  const lists = Array.from({ length: 64 }, () => []);
  for (let i = 0; i < NINST; i++) { const n = INST_LEN[i]; for (let k = 0; k < n; k++) lists[INST_SQ[i][k]].push([i, POW3[n - 1 - k]]); }
  let o = 0; for (let q = 0; q < 64; q++) { SQ_START[q] = o; for (const [i, pw] of lists[q]) { SQ_INST.push(i); SQ_POW.push(pw); o++; } } SQ_START[64] = o;
}
const SQI = Int32Array.from(SQ_INST), SQP = Int32Array.from(SQ_POW);
const IDX = new Int32Array(NINST);
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
const EXT_TMP = new Int32Array(NEXT);
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
  }
  // weights are in 1/32 disc units -> convert to 1/100 discs
  return ((s * 100) / 32) | 0;
}
let evaluate = evalHand;
function setWeights(arr, nphase) {
  W = arr; NPHASE = nphase;
  const per = arr.length / nphase;
  if (per === PS_V2) { USE_EXT = true; PHASE_SIZE = PS_V2; }
  else if (per === PS_V1) { USE_EXT = false; PHASE_SIZE = PS_V1; }
  else throw new Error('weights size mismatch: ' + per);
  evaluate = evalPattern;
}

// ------------------------------------------------------ search state
let nodes = 0, deadline = Infinity, aborted = false;
const ABORT = { abort: true };
function checkTime() { if (Date.now() > deadline) { aborted = true; throw ABORT; } }

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
function clearTT() { T_D.fill(-1); T_M.fill(-1); E_V.fill(0); E_M.fill(-1); }

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
function search(pl, ph, ol, oh, depth, alpha, beta, ply, passed) {
  if ((++nodes & 4095) === 0) checkTime();
  if (depth <= 0) return evaluate(pl, ph, ol, oh);

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
    return -search(ol, oh, pl, ph, depth, -beta, -alpha, ply + 1, true);
  }

  // Multi-ProbCut: predict the deep result from a shallow search and cut if it is far outside the window
  if (MPC.on && depth >= MPC.minDepth && beta - alpha === 1 && MPC.A > 0) {
    const empties = 64 - pc(pl | ol) - pc(ph | oh);
    const ds = mpcShallow(depth);
    const sig = (MPC.t * (MPC.A + MPC.B * depth + MPC.C * empties)) | 0;
    const hb = beta + sig;
    if (hb < 30000) {
      const v = ds === 0 ? evaluate(pl, ph, ol, oh) : search(pl, ph, ol, oh, ds, hb - 1, hb, ply, passed);
      if (v >= hb) return beta;
    }
    const lb = alpha - sig;
    if (lb > -30000) {
      const v = ds === 0 ? evaluate(pl, ph, ol, oh) : search(pl, ph, ol, oh, ds, lb, lb + 1, ply, passed);
      if (v <= lb) return alpha;
    }
  }
  // collect & order moves
  const base = ply * 36;
  let n = 0;
  const ordDepth = depth >= 9 ? 3 : depth >= 6 ? 2 : depth >= 4 ? 1 : depth >= 3 ? 0 : -1;
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
      if (ordDepth === 0) sc = -evaluate(nol, noh, npl, nph);
      else sc = -search(nol, noh, npl, nph, ordDepth, -32000, 32000, ply + 1, false);
    }
    SC[base + i] = sc;
  }
  sortMoves(base, n);

  const alpha0 = alpha;
  let best = -32767, bestMove = MV[base];
  for (let i = 0; i < n; i++) {
    const s = MV[base + i];
    flips(s, pl, ph, ol, oh);
    const fl = FL, fh = FH;
    let npl, nph;
    if (s < 32) { npl = pl | fl | (1 << s); nph = ph | fh; } else { npl = pl | fl; nph = ph | fh | (1 << (s - 32)); }
    const nol = ol & ~fl, noh = oh & ~fh;
    let v;
    if (i === 0) v = -search(nol, noh, npl, nph, depth - 1, -beta, -alpha, ply + 1, false);
    else {
      v = -search(nol, noh, npl, nph, depth - 1, -alpha - 1, -alpha, ply + 1, false);
      if (v > alpha && v < beta) v = -search(nol, noh, npl, nph, depth - 1, -beta, -v, ply + 1, false);
    }
    if (v > best) {
      best = v; bestMove = s;
      if (v > alpha) { alpha = v; if (alpha >= beta) break; }
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
const TUNE = { evalMin: 12, searchMin: 14, sDepth: 1, kE: 8 };
function solve(pl, ph, ol, oh, alpha, beta, empties, ply, passed) {
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
    return -solve(ol, oh, pl, ph, -beta, -alpha, empties, ply + 1, true);
  }
  const base = ply * 36;
  let n = 0;
  while (ml) { const s = lsb(ml); ml &= ml - 1; MV[base + n++] = s; }
  while (mh) { const s = lsb(mh); mh &= mh - 1; MV[base + n++] = s + 32; }
  // fastest-first ordering
  for (let i = 0; i < n; i++) {
    const s = MV[base + i];
    if (s === ttMove) { SC[base + i] = 1 << 29; continue; }
    flips(s, pl, ph, ol, oh);
    const fl = FL, fh = FH;
    let npl, nph;
    if (s < 32) { npl = pl | fl | (1 << s); nph = ph | fh; } else { npl = pl | fl; nph = ph | fh | (1 << (s - 32)); }
    const nol = ol & ~fl, noh = oh & ~fh;
    genMoves(nol, noh, npl, nph);
    let sc = -(pc(ML) + pc(MH) + 2 * (pc(ML & 0x81) + pc(MH & 0x81000000))) * 64;
    if (empties > 14) {
      neighbours(npl, nph);
      sc -= (pc(NL & ~(npl | nol)) + pc(NH & ~(nph | noh))) * 8;
    }
    sc += SQV[s];
    if (empties >= TUNE.evalMin) {
      if (empties >= TUNE.searchMin) sc -= (search(nol, noh, npl, nph, TUNE.sDepth, -32000, 32000, ply + 1, false) * TUNE.kE) >> 4;
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
    if (i === 0) v = -solve(nol, noh, npl, nph, -beta, -alpha, empties - 1, ply + 1, false);
    else {
      v = -solve(nol, noh, npl, nph, -alpha - 1, -alpha, empties - 1, ply + 1, false);
      if (v > alpha && v < beta) v = -solve(nol, noh, npl, nph, -beta, -v, empties - 1, ply + 1, false);
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
function rootPVS(pos, moves, depth, mode, a0, b0) {
  const [pl, ph, ol, oh] = pos;
  const empties = 64 - pc(pl | ol) - pc(ph | oh);
  let alpha = mode === 'exact' ? -65 : -32001, beta = -alpha;
  if (a0 !== undefined) { alpha = a0; beta = b0; }
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
    if (v > bestScore) { bestScore = v; best = s; if (v > alpha) alpha = v; }
  }
  return { move: best, score: mode === 'exact' ? bestScore * SCALE : bestScore };
}

function orderRoot(moves, prev) {
  if (!prev) return moves;
  return moves.slice().sort((a, b) => (prev.get(b) ?? -1e9) - (prev.get(a) ?? -1e9));
}

const LEVELS = [
  null,
  { depth: 1, exact: 4, noise: 900 },     // 1
  { depth: 2, exact: 6, noise: 450 },     // 2
  { depth: 3, exact: 8, noise: 220 },     // 3
  { depth: 4, exact: 10, noise: 110 },    // 4
  { depth: 6, exact: 12, noise: 40 },     // 5
  { depth: 8, exact: 14, noise: 0 },      // 6
  { depth: 10, exact: 16, time: 1000 },   // 7
  { depth: 60, exact: 18, time: 1500 },   // 8
  { depth: 60, exact: 19, time: 3000 },   // 9
  { depth: 60, exact: 20, time: 5000 },   // 10
];

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

function think(cells, toMove, opts, onProgress) {
  const lv = LEVELS[opts.level] || LEVELS[7];
  MPC.on = (opts.level || 7) >= 7; // keep the weaker levels as plain full-width searches
  const pos = toBits(cells, toMove);
  const [pl, ph, ol, oh] = pos;
  const moves = legalList(pl, ph, ol, oh);
  const t0 = Date.now();
  nodes = 0; aborted = false;
  if (moves.length === 0) return { move: -1, score: 0, depth: 0, nodes: 0, ms: 0 };
  const empties = 64 - pc(pl | ol) - pc(ph | oh);
  const time = opts.time ?? lv.time;
  const rand = opts.random || Math.random;
  const variety = opts.variety ?? (empties > 50);  // vary opening play
  let result = null;

  // ---- noisy weak levels: score every move then add noise
  if (lv.noise) {
    deadline = Infinity;
    let sc;
    if (empties <= lv.exact) sc = scoreAllMoves(pos, moves, 'exact');
    else sc = scoreAllMoves(pos, moves, 'mid', Math.min(lv.depth, empties));
    let bi = 0, bv = -1e9;
    for (let i = 0; i < sc.length; i++) {
      const v = sc[i].score + (rand() * 2 - 1) * lv.noise;
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

  const hardTime = time ? time * 2.5 : Infinity;
  deadline = time ? t0 + hardTime : Infinity;
  const softTime = time || Infinity;

  // ---- midgame iterative deepening
  let prev = null, depthDone = 0;
  const maxDepth = Math.min(lv.depth, empties);
  const doExact = empties <= lv.exact;
  try {
    const midMax = doExact ? Math.min(maxDepth, 10) : maxDepth;
    const startD = Math.min(doExact ? 2 : 1, midMax);
    for (let d = startD; d <= midMax; d++) {
      const ordered = orderRoot(moves, prev);
      let r;
      if (variety && !doExact) {
        const all = scoreAllMoves(pos, ordered, 'mid', d);
        prev = new Map(all.map(x => [x.move, x.score]));
        all.sort((a, b) => b.score - a.score);
        r = { move: all[0].move, score: all[0].score, all };
      } else {
        r = rootPVS(pos, ordered, d, 'mid');
        prev = prev || new Map();
        prev.set(r.move, 1e8 + d);
      }
      result = r; depthDone = d;
      onProgress && onProgress({ depth: d, move: r.move, score: r.score / SCALE, nodes, ms: Date.now() - t0 });
      if (Date.now() - t0 > softTime * 0.45 && !doExact) break;
    }
  } catch (e) { if (e !== ABORT) throw e; }

  let exactDone = false;
  if (doExact) {
    // exact solve, bounded by deadline
    if (time) deadline = t0 + Math.max(hardTime, 2000);
    else deadline = Infinity;
    try {
      const ordered = orderRoot(moves, prev);
      let r;
      if (variety) {
        const all = scoreAllMoves(pos, ordered, 'exact');
        all.sort((a, b) => b.score - a.score);
        r = { move: all[0].move, score: all[0].score, all };
      } else {
        // aspiration window around the midgame estimate
        const g = result ? Math.max(-60, Math.min(60, Math.round(result.score / SCALE))) : 0;
        let lo = g - 3, hi = g + 3;
        for (;;) {
          r = rootPVS(pos, ordered, 0, 'exact', lo, hi);
          const v = r.score / SCALE;
          if (v <= lo && lo > -65) { hi = v + 1; lo = -65; }
          else if (v >= hi && hi < 65) { lo = v - 1; hi = 65; }
          else break;
        }
      }
      result = r; exactDone = true;
    } catch (e) { if (e !== ABORT) throw e; }
  }

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

/** analyze: score all legal moves; returns [{move, score(discs), exact}] */
function analyze(cells, toMove, opts, onProgress) {
  MPC.on = true;
  const pos = toBits(cells, toMove);
  const [pl, ph, ol, oh] = pos;
  const moves = legalList(pl, ph, ol, oh);
  const empties = 64 - pc(pl | ol) - pc(ph | oh);
  const t0 = Date.now(); nodes = 0;
  const time = opts.time || 1500;
  let out = null;
  if (empties <= (opts.exact ?? 18)) {
    deadline = t0 + time * 4;
    try { out = scoreAllMoves(pos, moves, 'exact').map(x => ({ move: x.move, score: x.score / SCALE, exact: true })); }
    catch (e) { if (e !== ABORT) throw e; }
    if (out) return out;
  }
  deadline = t0 + time * 2;
  let prev = null;
  try {
    for (let d = 1; d <= Math.min(60, empties); d++) {
      const all = scoreAllMoves(pos, orderRoot(moves, prev), 'mid', d);
      prev = new Map(all.map(x => [x.move, x.score]));
      out = all.map(x => ({ move: x.move, score: x.score / SCALE, depth: d }));
      onProgress && onProgress(out);
      if (Date.now() - t0 > time * 0.5) break;
    }
  } catch (e) { if (e !== ABORT) throw e; }
  return out || moves.map(m => ({ move: m, score: 0 }));
}

/** search a single root move (for parallel root splitting). Returns score from the root side's perspective, or null if aborted. */
function searchMove(cells, toMove, move, depth, alpha, beta, mode, dl) {
  MPC.on = true;
  const [pl, ph, ol, oh] = toBits(cells, toMove);
  const empties = 64 - pc(pl | ol) - pc(ph | oh);
  const [a, b, c, d] = childOf(pl, ph, ol, oh, move);
  deadline = dl || Infinity; aborted = false; nodes = 0;
  try {
    if (mode === 'exact') return -solve(a, b, c, d, -beta, -alpha, empties - 1, 1, false);
    return -search(a, b, c, d, depth - 1, -beta, -alpha, 1, false);
  } catch (e) { if (e === ABORT) return null; throw e; }
}
const API = {
  think, analyze, searchMove, setWeights, clearTT, toBits, legalList, childOf, featureIndices,
  evalHand, evaluate: (a, b, c, d) => evaluate(a, b, c, d), search, solve, finalScore, pc,
  get nodes() { return nodes; }, set deadline(v) { deadline = v; },
  TUNE, MPC, NINST, NEXT, PS_V1, PS_V2, get PHASE_SIZE() { return PHASE_SIZE; }, PATTERNS, LEVELS, SCALE,
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
    else if (m.type === 'clear') clearTT();
  };
}
})(typeof self !== 'undefined' ? self : globalThis);

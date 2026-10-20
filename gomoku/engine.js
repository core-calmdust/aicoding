// Gomoku / Renju engine — rules (renju with forbidden moves, standard = exactly five, freestyle = five or more),
// incremental line patterns, exact forbidden-move detection, threat solvers (VCF, VCT, "win in N" for puzzles)
// and an alpha-beta search with threat extensions.
// Works as a Web Worker (postMessage API), as a plain <script> (window.RenjuEngine) and as a Node module.
//
// Board: 15x15, a move is one int m = row * 15 + col (row 0 = rank 1 at the bottom, col 0 = file a).
// Internally the board is padded (stride 20, 5 wall cells on every side) so line scans never leave the array.
'use strict';
(function () {
const N = 15, S = 20, PAD = 5, ROWS = N + 2 * PAD + 1, SIZE = ROWS * S;
const DIRS = [1, S, S + 1, S - 1];
const EMPTY = 0, BLACK = 1, WHITE = 2, WALL = 3;
const WIN = 100000, WINT = 90000;
const RULES = ['renju', 'standard', 'free'];
const I2M = new Int16Array(SIZE).fill(-1), M2I = new Int16Array(N * N);
for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const i = (r + PAD) * S + (c + PAD); M2I[r * N + c] = i; I2M[i] = r * N + c; }
const FILES = 'abcdefghijklmno';
const sqName = m => FILES[m % N] + (Math.floor(m / N) + 1);
function sqOf(s) {
  const t = String(s || '').trim().toLowerCase().match(/^([a-o])(1[0-5]|[1-9])$/);
  if (!t) return -1;
  return (+t[2] - 1) * N + FILES.indexOf(t[1]);
}
const CENTER = 7 * N + 7;

// ---------------------------------------------------------------- line pattern tables
// A cell's view of one direction: 5 cells on each side, each 0 empty / 1 own / 2 blocked (opponent or wall).
// The table says what a stone of ours placed on the cell would make in that direction.
const P0 = 0, P2 = 1, P2F = 2, P3 = 3, P3F = 4, P4 = 5, P4F = 6, P44 = 7, POL = 8, P5 = 9;
const POW3 = [1, 3, 9, 27, 81, 243, 729, 2187, 6561, 19683, 59049];
const kOf = o => (o < 0 ? o + 5 : o + 4);           // offset -5..-1, 1..5 -> digit 0..9
function buildTable(exact) {
  const T = new Uint8Array(59049), codes = [];
  for (let code = 0; code < 59049; code++) { let x = code, n = 0; for (let k = 0; k < 10; k++) { if (x % 3 === 1) n++; x = (x / 3) | 0; } codes.push([n, code]); }
  codes.sort((a, b) => b[0] - a[0]);
  const L = new Int8Array(11);
  const run = () => { let n = 1, i = 4; while (i >= 0 && L[i] === 1) { n++; i--; } i = 6; while (i <= 10 && L[i] === 1) { n++; i++; } return n; };
  for (const [, code] of codes) {
    let x = code;
    for (let k = 0; k < 10; k++) { const v = x % 3; x = (x / 3) | 0; L[k < 5 ? k : k + 1] = v; }
    L[5] = 1;
    const len = run();
    if (exact ? len === 5 : len >= 5) { T[code] = P5; continue; }
    if (len > 5) { T[code] = POL; continue; }
    const C = [];
    for (let e = 1; e <= 9; e++) {
      if (e === 5 || L[e] !== 0) continue;
      L[e] = 1; const l2 = run(); L[e] = 0;
      if (exact ? l2 === 5 : l2 >= 5) C.push(e);
    }
    if (C.length >= 2) {
      let straight = C.length === 2 && C[1] - C[0] === 5;
      if (straight) for (let e = C[0] + 1; e < C[1]; e++) if (L[e] !== 1) straight = false;
      T[code] = straight ? P4F : P44; continue;
    }
    if (C.length === 1) { T[code] = P4; continue; }
    let best = P0;
    for (let e = 1; e <= 9; e++) {
      if (e === 5 || L[e] !== 0) continue;
      const t = T[code + POW3[e < 5 ? e : e - 1]];
      let v = P0;
      if (t === P4F) v = P3F; else if (t === P4 || t === P44) v = P3; else if (t === P3F) v = P2F; else if (t === P3) v = P2;
      if (v > best) best = v;
    }
    T[code] = best;
  }
  return T;
}
const T_EXACT = buildTable(true), T_FREE = buildTable(false);

// cell classes (per colour, from its four directions)
const C_NONE = 0, C_2 = 1, C_F2 = 2, C_3 = 3, C_F3 = 4, C_B4 = 5, C_F33 = 6, C_F43 = 7, C_F4 = 8, C_FIVE = 9;
const PW = [0, 2, 5, 7, 22, 26, 140, 140, 0, 3000];          // value of one direction pattern
const CW = [0, 0, 6, 8, 30, 40, 260, 420, 900, 6000];          // bonus by cell class
// four packed direction patterns -> class | forbidden flag << 4 | score << 8 (normal / black in renju)
function buildComb(renjuBlack) {
  const T = new Int32Array(65536);
  for (let pk = 0; pk < 65536; pk++) {
    let n5 = 0, nol = 0, n4 = 0, f4 = 0, n3f = 0, n3 = 0, n2f = 0, n2 = 0, s = 0, bad = false;
    for (let d = 0; d < 4; d++) {
      const p = (pk >> (4 * d)) & 15; if (p > 9) { bad = true; break; }
      s += PW[p];
      switch (p) {
        case P5: n5++; break; case POL: nol++; break; case P44: n4 += 2; break; case P4F: n4++; f4++; break; case P4: n4++; break;
        case P3F: n3f++; break; case P3: n3++; break; case P2F: n2f++; break; case P2: n2++; break;
      }
    }
    if (bad) continue;
    let k;
    if (n5) k = C_FIVE;
    else if (f4 || n4 >= 2) k = C_F4;
    else if (n4 && n3f) k = C_F43;
    else if (n3f >= 2) k = C_F33;
    else if (n4) k = C_B4;
    else if (n3f) k = C_F3;
    else if (n3 || n2f >= 2) k = C_3;
    else if (n2f) k = C_F2;
    else if (n2) k = C_2;
    else k = C_NONE;
    let f = 0;
    if (renjuBlack && !n5) { if (nol || n4 >= 2) f = 1; else if (n3f >= 2) f = 2; }
    if (f === 1) { k = C_NONE; s = 0; }
    s += CW[k];
    T[pk] = k | (f << 4) | (s << 8);
  }
  return T;
}
const COMB_N = buildComb(false), COMB_R = buildComb(true);
// ---------------------------------------------------------------- learned evaluation
// Every empty cell, for each colour: the unordered combination of its four direction patterns (715 combos, +1 for a
// cell forbidden to black). Weights per role (side to move / opponent) x colour, learned from game records.
const NCOMB = 716;
const COMBO = new Int16Array(65536).fill(-1);
{
  const key = new Map(); let id = 0;
  for (let a = 0; a < 10; a++) for (let b = a; b < 10; b++) for (let c = b; c < 10; c++) for (let d = c; d < 10; d++) key.set(((a * 10 + b) * 10 + c) * 10 + d, id++);
  for (let pk = 0; pk < 65536; pk++) {
    const v = [pk & 15, (pk >> 4) & 15, (pk >> 8) & 15, (pk >> 12) & 15]; if (v[0] > 9 || v[1] > 9 || v[2] > 9 || v[3] > 9) continue;
    v.sort((x, y) => x - y); COMBO[pk] = key.get(((v[0] * 10 + v[1]) * 10 + v[2]) * 10 + v[3]);
  }
}
const PAIR = 4 * NCOMB, BIAS = PAIR + 200;   // + (black class, white class) of each empty cell x side to move, + bias by side to move
const LW = { renju: null, std: null };   // Int32Array(BIAS + 2) per rule group, set by setWeights()
const LK = { renju: 0, std: 0 };   // weight of the hand-made evaluation inside the learned one (residual learning)
function setWeights(group, arr, oldK) { LW[group] = arr ? Int32Array.from(arr) : null; LK[group] = oldK || 0; }
// finer part: the raw 10-neighbour window code of every empty cell / direction / colour (mirror-canonical, 29646 codes)
const LCANON = new Int32Array(59049).fill(-1), TRIV = new Uint8Array(59049); let NL = 0;
for (let code = 0; code < 59049; code++) {
  let x = code, r = 0, stone = false; for (let k = 0; k < 10; k++) { const v = x % 3; if (v === 1) stone = true; r += v * POW3[9 - k]; x = (x / 3) | 0; }
  TRIV[code] = stone ? 0 : 1;
  if (LCANON[code] < 0) { LCANON[code] = LCANON[r] = NL++; }
}
const LW2 = { renju: null, std: null };   // [null, A1, A2, B1?..] lookup by raw code: A[c] (colour c to move), B[c] (colour c not to move)
function setLineWeights(group, arr) {   // arr: 4 * NL (role mover black, mover white, opponent black, opponent white)
  if (!arr) { LW2[group] = null; return; }
  const T = [0, 1, 2, 3].map(t => { const a = new Int32Array(59049); for (let c = 0; c < 59049; c++) a[c] = TRIV[c] ? 0 : arr[t * NL + LCANON[c]]; return a; });
  LW2[group] = { A: [null, T[0], T[1]], B: [null, T[2], T[3]] };
}

// ---------------------------------------------------------------- zobrist
function xorshift(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s | 0; }; }
const zr = xorshift(0x9e3779b9);
const ZA = new Int32Array(SIZE * 3), ZB = new Int32Array(SIZE * 3);
for (let i = 0; i < ZA.length; i++) { ZA[i] = zr(); ZB[i] = zr(); }
const ZS1 = zr(), ZS2 = zr();

// ---------------------------------------------------------------- position
class Pos {
  constructor(rule) {
    this.rule = RULES.includes(rule) ? rule : 'renju';
    this.renju = this.rule === 'renju';
    this.TB = this.rule === 'free' ? T_FREE : T_EXACT;
    this.TW = this.rule === 'standard' ? T_EXACT : T_FREE;
    this.b = new Uint8Array(SIZE).fill(WALL);
    for (let m = 0; m < N * N; m++) this.b[M2I[m]] = EMPTY;
    this.code = [null, new Int32Array(SIZE * 4), new Int32Array(SIZE * 4)];
    this.cls = [null, new Int8Array(SIZE).fill(-1), new Int8Array(SIZE).fill(-1)];
    this.cnt = [null, new Int16Array(10), new Int16Array(10)];   // number of empty cells per class
    this.pat = [null, new Uint16Array(SIZE), new Uint16Array(SIZE)];  // four direction patterns packed in nibbles
    this.CB = this.renju ? COMB_R : COMB_N;
    this.sc = [null, new Int32Array(SIZE), new Int32Array(SIZE)];
    this.lw = LW[this.renju ? 'renju' : 'std']; this.lk = LK[this.renju ? 'renju' : 'std']; this.nn = this.renju ? NNI.renju : this.rule === 'standard' ? NNI.std : null;   // freestyle keeps the linear evaluation (the net did not beat it there)
    this.cb = [null, new Int16Array(SIZE).fill(-1), new Int16Array(SIZE).fill(-1)];
    this.tA = [0, 0, 0]; this.tB = [0, 0, 0];   // learned sums: colour c as side to move / as opponent
    this.pk = new Int16Array(SIZE).fill(-1); this.tP = [0, 0, 0];   // cell class pairs, sums for black / white to move
    this.lw2 = LW2[this.renju ? 'renju' : 'std']; this.LA = [0, 0, 0]; this.LB = [0, 0, 0];
    this.fb = new Int8Array(SIZE);          // black only: 0 ok, 1 forbidden for sure (overline / 4-4), 2 maybe (3-3, needs the exact test)
    this.tot = [0, 0, 0];
    this.near = new Int16Array(SIZE);
    this.side = BLACK; this.ply = 0; this.stack = new Int16Array(N * N + 8);
    this.h1 = 0; this.h2 = 0; this.fresh = true;   // fresh: started from the empty board (renju opening restrictions apply)
    for (let i = 0; i < SIZE; i++) {
      if (I2M[i] < 0) continue;
      for (let d = 0; d < 4; d++) {
        let cb = 0, cw = 0;
        for (let o = -5; o <= 5; o++) {
          if (!o) continue;
          const q = i + o * DIRS[d], v = this.b[q];
          if (v === WALL) { cb += 2 * POW3[kOf(o)]; cw += 2 * POW3[kOf(o)]; }
        }
        this.code[1][i * 4 + d] = cb; this.code[2][i * 4 + d] = cw;
      }
    }
    for (let i = 0; i < SIZE; i++) if (I2M[i] >= 0) { this.refresh(i); }
    if (this.lw2) for (let i = 0; i < SIZE; i++) if (I2M[i] >= 0) this.lineCell(i, 1);
  }
  lineCell(i, s) {   // add / remove the window codes of cell i (both colours, four directions)
    const L = this.lw2, cb = this.code[1], cw = this.code[2];
    for (let d = 0; d < 4; d++) { const x = i * 4 + d; this.LA[1] += s * L.A[1][cb[x]]; this.LB[1] += s * L.B[1][cb[x]]; this.LA[2] += s * L.A[2][cw[x]]; this.LB[2] += s * L.B[2][cw[x]]; }
  }
  static from(rule, moves) { const p = new Pos(rule); for (const m of moves || []) p.make(m); return p; }
  clone() { const p = new Pos(this.rule); for (let k = 0; k < this.ply; k++) p.make(I2M[this.stack[k]]); p.fresh = this.fresh; return p; }
  // class / score of an empty cell from its packed four direction patterns (one table lookup)
  cellUpd(i, c) {
    const ok = this.cls[c][i];
    if (ok >= 0) this.cnt[c][ok]--;
    const x = (c === 1 ? this.CB : COMB_N)[this.pat[c][i]], k = x & 15, s = x >> 8;
    this.cls[c][i] = k; this.cnt[c][k]++;
    this.tot[c] += s - this.sc[c][i]; this.sc[c][i] = s;
    if (c === 1) this.fb[i] = (x >> 4) & 3;
    const lw = this.lw;
    if (lw) {
      const nb = c === 1 && this.renju && ((x >> 4) & 3) === 1 ? 715 : COMBO[this.pat[c][i]], ob = this.cb[c][i];
      if (nb !== ob) {
        const ta = (c - 1) * NCOMB, tb = (2 + c - 1) * NCOMB;
        if (ob >= 0) { this.tA[c] -= lw[ta + ob]; this.tB[c] -= lw[tb + ob]; }
        this.tA[c] += lw[ta + nb]; this.tB[c] += lw[tb + nb]; this.cb[c][i] = nb;
      }
      this.pairUpd(i);
    }
  }
  pairUpd(i) {
    const lw = this.lw, a = this.cls[1][i], b = this.cls[2][i], nk = a >= 0 && b >= 0 ? a * 10 + b : -1, ok = this.pk[i];
    if (nk === ok) return;
    if (ok >= 0) { this.tP[1] -= lw[PAIR + ok]; this.tP[2] -= lw[PAIR + 100 + ok]; }
    if (nk >= 0) { this.tP[1] += lw[PAIR + nk]; this.tP[2] += lw[PAIR + 100 + nk]; }
    this.pk[i] = nk;
  }
  cellOff(i, c) {
    const ok = this.cls[c][i];
    if (ok >= 0) this.cnt[c][ok]--;
    this.cls[c][i] = -1; this.tot[c] -= this.sc[c][i]; this.sc[c][i] = 0;
    if (c === 1) this.fb[i] = 0;
    const ob = this.cb[c][i];
    if (ob >= 0 && this.lw) { this.tA[c] -= this.lw[(c - 1) * NCOMB + ob]; this.tB[c] -= this.lw[(2 + c - 1) * NCOMB + ob]; }
    this.cb[c][i] = -1;
    if (this.lw) this.pairUpd(i);
  }
  refresh(i) {
    for (let c = 1; c <= 2; c++) {
      const T = c === 1 ? this.TB : this.TW, code = this.code[c];
      let pk = 0;
      for (let d = 0; d < 4; d++) pk |= T[code[i * 4 + d]] << (4 * d);
      this.pat[c][i] = pk;
      if (this.b[i] === EMPTY) this.cellUpd(i, c); else this.cellOff(i, c);
    }
  }
  // place / remove a stone: update the line codes and patterns of every cell that sees it
  _put(i, color, sign) {
    const cb = this.code[1], cw = this.code[2], vb = color === 1 ? sign : 2 * sign, vw = color === 2 ? sign : 2 * sign;
    const TB = this.TB, TW = this.TW, pb = this.pat[1], pw = this.pat[2], b = this.b, L = this.lw2, LA = this.LA, LB = this.LB;
    for (let d = 0; d < 4; d++) {
      const D = DIRS[d], sh = 4 * d, mask = ~(15 << sh);
      for (let o = -5; o <= 5; o++) {
        if (!o) continue;
        const q = i - o * D;
        if (I2M[q] < 0) continue;
        const k = o > 0 ? o + 4 : o + 5, x = q * 4 + d;
        if (L && b[q] === EMPTY) { LA[1] -= L.A[1][cb[x]]; LB[1] -= L.B[1][cb[x]]; LA[2] -= L.A[2][cw[x]]; LB[2] -= L.B[2][cw[x]]; }
        cb[x] += vb * POW3[k]; cw[x] += vw * POW3[k];
        if (L && b[q] === EMPTY) { LA[1] += L.A[1][cb[x]]; LB[1] += L.B[1][cb[x]]; LA[2] += L.A[2][cw[x]]; LB[2] += L.B[2][cw[x]]; }
        pb[q] = (pb[q] & mask) | (TB[cb[x]] << sh); pw[q] = (pw[q] & mask) | (TW[cw[x]] << sh);
        if (b[q] === EMPTY) { this.cellUpd(q, 1); this.cellUpd(q, 2); }
      }
    }
  }
  _nearUpd(i, s) { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) this.near[i + dy * S + dx] += s; }
  make(m) {
    const i = M2I[m], c = this.side;
    if (this.lw2) this.lineCell(i, -1);
    this.b[i] = c; this.cellOff(i, 1); this.cellOff(i, 2);
    this._put(i, c, 1); this._nearUpd(i, 1);
    this.h1 ^= ZA[i * 3 + c] ^ ZS1; this.h2 ^= ZB[i * 3 + c] ^ ZS2;
    this.stack[this.ply++] = i; this.side = 3 - c;
  }
  unmake() {
    const i = this.stack[--this.ply], c = this.b[i];
    this.b[i] = EMPTY; this._put(i, c, -1); this._nearUpd(i, -1);
    if (this.lw2) this.lineCell(i, 1);
    this.cellUpd(i, 1); this.cellUpd(i, 2);
    this.h1 ^= ZA[i * 3 + c] ^ ZS1; this.h2 ^= ZB[i * 3 + c] ^ ZS2;
    this.side = c;
  }
  pass() { this.side = 3 - this.side; this.h1 ^= ZS1; this.h2 ^= ZS2; }
  get last() { return this.ply ? I2M[this.stack[this.ply - 1]] : -1; }
  moves() { const out = []; for (let k = 0; k < this.ply; k++) out.push(I2M[this.stack[k]]); return out; }
  at(m) { return this.b[M2I[m]]; }
  // ---- rules
  // exact renju forbidden test for black at board index i (empty): 0 legal, 1 3-3, 2 4-4, 3 overline
  forbidIdx(i) {
    if (!this.renju) return 0;
    const f = this.fb[i]; if (!f) return 0;
    return exactForbid(this.b, i);
  }
  forbidden(m) { return this.forbidIdx(M2I[m]); }
  // opening restriction (renju from the empty board): 1st move in the centre, 2nd within 1, 3rd within 2
  openingOk(i) {
    if (!this.renju || !this.fresh || this.ply > 2) return true;
    const m = I2M[i], dx = Math.abs(m % N - 7), dy = Math.abs(Math.floor(m / N) - 7), r = Math.max(dx, dy);
    return r <= this.ply;
  }
  legalIdx(i) {
    if (I2M[i] < 0 || this.b[i] !== EMPTY) return false;
    if (!this.openingOk(i)) return false;
    if (this.side === BLACK && this.renju && this.fb[i] && this.forbidIdx(i)) return false;
    return true;
  }
  isLegal(m) { return m >= 0 && m < N * N && this.legalIdx(M2I[m]); }
  legal() { const out = []; for (let m = 0; m < N * N; m++) if (this.legalIdx(M2I[m])) out.push(m); return out; }
  // cells where colour c would make five now
  fives(c) { const out = [], k = this.cls[c]; for (let m = 0; m < N * N; m++) { const i = M2I[m]; if (this.b[i] === EMPTY && k[i] === C_FIVE) out.push(i); } return out; }
  // did the last move make five? (exactly five for black in renju / everyone in standard)
  lastFive() {
    if (!this.ply) return null;
    const i = this.stack[this.ply - 1], c = this.b[i], exact = c === BLACK ? this.rule !== 'free' : this.rule === 'standard';
    for (let d = 0; d < 4; d++) {
      const D = DIRS[d]; let a = i, z = i;
      while (this.b[a - D] === c) a -= D;
      while (this.b[z + D] === c) z += D;
      const len = (z - a) / D + 1;
      if (exact ? len === 5 : len >= 5) { const line = []; for (let q = a; q <= z; q += D) line.push(I2M[q]); return { color: c, line }; }
    }
    return null;
  }
  status() {
    const f = this.lastFive();
    if (f) return { over: true, winner: f.color, why: 'five', line: f.line };
    if (this.ply >= N * N) return { over: true, winner: 0, draw: true, why: 'full' };
    // the side to move has no legal move (only possible for black in renju with every empty cell forbidden)
    return { over: false };
  }
  // per-colour threat summary used by the UI ("threats" display) and the lessons
  threatCells(c) { const out = []; for (let m = 0; m < N * N; m++) { const i = M2I[m]; if (this.b[i] === EMPTY && this.cls[c][i] >= C_F3) out.push({ m, k: this.cls[c][i] }); } return out; }
  forbiddenList() { const out = []; if (!this.renju) return out; for (let m = 0; m < N * N; m++) { const i = M2I[m]; if (this.b[i] === EMPTY && this.fb[i]) { const f = exactForbid(this.b, i); if (f) out.push({ m, k: f }); } } return out; }
}

// ---------------------------------------------------------------- exact forbidden test (recursive, on the raw board)
function runLen(b, i, D, c) { let n = 1, q = i - D; while (b[q] === c) { n++; q -= D; } q = i + D; while (b[q] === c) { n++; q += D; } return n; }
// number of fours through i in direction D (stone already on i): 0, 1 (a four or a straight four) or 2 (two fours in one line)
function fourDir(b, i, D) {
  let c1 = -1, c2 = -1, n = 0;
  for (let k = -4; k <= 4; k++) {
    if (!k) continue;
    const q = i + k * D; if (b[q] !== EMPTY) continue;
    b[q] = BLACK; const L = runLen(b, i, D, BLACK); b[q] = EMPTY;
    if (L === 5) { if (n === 0) c1 = q; else c2 = q; n++; }
  }
  if (n <= 1) return n;
  if (n === 2 && Math.abs(c2 - c1) === 5 * D) { let ok = true; for (let q = Math.min(c1, c2) + D; q < Math.max(c1, c2); q += D) if (b[q] !== BLACK) ok = false; if (ok) return 1; }
  return 2;
}
function straightFourDir(b, i, D) {
  let c1 = -1, c2 = -1, n = 0;
  for (let k = -4; k <= 4; k++) {
    if (!k) continue;
    const q = i + k * D; if (b[q] !== EMPTY) continue;
    b[q] = BLACK; const L = runLen(b, i, D, BLACK); b[q] = EMPTY;
    if (L === 5) { if (n === 0) c1 = q; else c2 = q; n++; }
  }
  if (n !== 2 || Math.abs(c2 - c1) !== 5 * D) return false;
  for (let q = Math.min(c1, c2) + D; q < Math.max(c1, c2); q += D) if (b[q] !== BLACK) return false;
  return true;
}
// a real three in direction D through i: some empty point turns it into a straight four and is not itself forbidden
function threeDir(b, i, D) {
  for (let k = -4; k <= 4; k++) {
    if (!k) continue;
    const q = i + k * D; if (b[q] !== EMPTY) continue;
    b[q] = BLACK; const sf = straightFourDir(b, i, D); b[q] = EMPTY;
    if (sf && !exactForbid(b, q)) return true;
  }
  return false;
}
function exactForbid(b, i) {
  if (b[i] !== EMPTY) return 0;
  b[i] = BLACK;
  let five = false, over = false;
  for (let d = 0; d < 4; d++) { const L = runLen(b, i, DIRS[d], BLACK); if (L === 5) five = true; else if (L > 5) over = true; }
  let res = 0;
  if (five) res = 0;
  else if (over) res = 3;
  else {
    let fours = 0; const has4 = [false, false, false, false];
    for (let d = 0; d < 4; d++) { const f = fourDir(b, i, DIRS[d]); if (f) { fours += f; has4[d] = true; } }
    if (fours >= 2) res = 2;
    else {
      let threes = 0;
      for (let d = 0; d < 4 && threes < 2; d++) if (!has4[d] && threeDir(b, i, DIRS[d])) threes++;
      if (threes >= 2) res = 1;
    }
  }
  b[i] = EMPTY;
  return res;
}

// ---------------------------------------------------------------- helpers on a position (board indices)
function legalFor(pos, i, c) { return !(c === BLACK && pos.renju && pos.fb[i] && pos.forbidIdx(i)); }
function fiveCells(pos, c) { const out = [], k = pos.cls[c], b = pos.b; if (!pos.cnt[c][C_FIVE]) return out; for (let m = 0; m < 225; m++) { const i = M2I[m]; if (b[i] === EMPTY && k[i] === C_FIVE) out.push(i); } return out; }
function hasFive(pos, c) { return pos.cnt[c][C_FIVE] > 0; }
// legal cell where c makes a straight four / four-four (not a forbidden one for black)
function winCell(pos, c) {
  if (!pos.cnt[c][C_F4]) return -1;
  const k = pos.cls[c], b = pos.b;
  for (let m = 0; m < 225; m++) { const i = M2I[m]; if (b[i] === EMPTY && k[i] === C_F4 && legalFor(pos, i, c)) return i; }
  return -1;
}
function cellsAtLeast(pos, c, minK) { const out = [], k = pos.cls[c], b = pos.b; for (let m = 0; m < 225; m++) { const i = M2I[m]; if (b[i] === EMPTY && k[i] >= minK && legalFor(pos, i, c)) out.push(i); } return out; }

// ---------------------------------------------------------------- VCF: win by continuous fours (side to move = c)
const STT_BITS = 18, STT_MASK = (1 << STT_BITS) - 1;
const TAG1 = new Int32Array(512), TAG2 = new Int32Array(512);
for (let i = 0; i < 512; i++) { TAG1[i] = zr(); TAG2[i] = zr(); }
class Solver {
  constructor() {
    this.k1 = new Int32Array(1 << STT_BITS); this.k2 = new Int32Array(1 << STT_BITS); this.val = new Int32Array(1 << STT_BITS); this.gen = new Int32Array(1 << STT_BITS);
    this.g = 1; this.nodes = 0; this.limit = 1e9; this.foursOnly = false;
  }
  clear() { this.g++; }
  // tag: kind (0 vcf, 1 attack, 2 defend) * 128 + depth + 2
  get(pos, tag) { const h = (pos.h1 ^ TAG1[tag]) & STT_MASK; if (this.gen[h] === this.g && this.k1[h] === (pos.h1 ^ TAG1[tag]) && this.k2[h] === (pos.h2 ^ TAG2[tag])) return this.val[h]; return undefined; }
  set(pos, tag, v) { const x = pos.h1 ^ TAG1[tag], h = x & STT_MASK; this.gen[h] = this.g; this.k1[h] = x; this.k2[h] = pos.h2 ^ TAG2[tag]; this.val[h] = v; }
  // returns winning first move index (board idx) or -1; pv collects the line
  vcf(pos, depth, pv) {
    const c = pos.side, o = 3 - c;
    this.nodes++;
    if (this.nodes > this.limit) return -1;
    const f = fiveCells(pos, c); if (f.length) { if (pv) pv.push(f[0]); return f[0]; }
    if (depth <= 0) return -1;
    const k = Math.min(depth, 120) + 2;
    const hit = this.get(pos, k); if (hit !== undefined && !pv) return hit;
    const of = fiveCells(pos, o);
    let cands;
    if (of.length >= 2) { this.set(pos, k, -1); return -1; }
    if (of.length === 1) { const q = of[0]; cands = pos.cls[c][q] >= C_B4 && pos.cls[c][q] !== C_F33 && legalFor(pos, q, c) ? [q] : []; }
    else cands = fourCells(pos, c);
    let res = -1;
    for (const i of cands) {
      if (pos.cls[c][i] === C_F4 && legalFor(pos, i, c) && !of.length) { res = i; if (pv) pv.push(i); break; }
      pos.make(I2M[i]);
      const mf = fiveCells(pos, c);
      if (mf.length !== 1) {
        pos.unmake();
        if (mf.length >= 2) { res = i; if (pv) pv.push(i); break; }
        continue;
      }
      const q = mf[0];
      if (hasFive(pos, o)) { pos.unmake(); continue; }            // the opponent wins first
      if (!legalFor(pos, q, o)) { pos.unmake(); res = i; if (pv) pv.push(i, q); break; }   // black cannot block (forbidden point)
      pos.make(I2M[q]);
      const sub = pv ? [] : null;
      const r = this.vcf(pos, depth - 1, sub);
      pos.unmake(); pos.unmake();
      if (r >= 0) { res = i; if (pv) pv.push(i, q, ...sub); break; }
    }
    if (!pv && this.nodes <= this.limit) this.set(pos, k, res);
    return res;
  }
  // ---- "win in N" (puzzle count: moves up to and including the move that settles the game — a four-three, four-four,
  // straight four, or for white / free rules a three-three). Side to move attacks.
  attack(pos, t) {
    this.nodes++;
    if (this.nodes > this.limit) return -1;
    const c = pos.side, o = 3 - c;
    const f = fiveCells(pos, c); if (f.length) return f[0];
    const k = 128 + Math.min(t, 120) + 2; const hit = this.get(pos, k); if (hit !== undefined) return hit;
    const of = fiveCells(pos, o);
    let res = -1;
    if (of.length >= 2) { this.set(pos, k, -1); return -1; }
    const cands = of.length === 1 ? (legalFor(pos, of[0], c) ? [of[0]] : []) : this.foursOnly ? fourCells(pos, c) : threatCells(pos, c);
    for (const i of cands) {
      pos.make(I2M[i]);
      let ok = false;
      if (forcing(pos, c)) ok = this.defend(pos, t - 2);
      pos.unmake();
      if (ok) { res = i; break; }
    }
    if (this.nodes <= this.limit) this.set(pos, k, res);
    return res;
  }
  // defender to move; true if every defence loses within t more attacker moves (t < 0: the attacker must win at once)
  defend(pos, t) {
    this.nodes++;
    if (this.nodes > this.limit) return false;
    const d = pos.side, a = 3 - d;
    if (hasFive(pos, d)) return false;
    const k = 256 + Math.min(t, 120) + 2; const hit = this.get(pos, k); if (hit !== undefined) return !!hit;
    const af = fiveCells(pos, a);
    let res;
    if (af.length >= 2) res = true;
    else if (af.length === 1 && !legalFor(pos, af[0], d)) res = true;
    else {
      const reps = af.length === 1 ? [af[0]] : defenceCells(pos, a, d);
      res = true;
      for (const i of reps) {
        pos.make(I2M[i]);
        const ok = t < 0 ? immediate(pos) : this.attack(pos, t) >= 0;
        pos.unmake();
        if (!ok) { res = false; break; }
      }
    }
    if (this.nodes <= this.limit) this.set(pos, k, res ? 1 : 0);
    return res;
  }
  // smallest odd t <= maxT with a forced win, or 0
  winIn(pos, maxT) { for (let t = 1; t <= maxT; t += 2) { if (this.attack(pos, t) >= 0) return t; if (this.nodes > this.limit) return 0; } return 0; }
  // per attacker move: smallest t <= maxT that still wins after it (0 = does not win within maxT)
  attackList(pos, maxT) {
    const c = pos.side, o = 3 - c, out = [];
    const f = fiveCells(pos, c);
    const of = fiveCells(pos, o);
    const cands = f.length ? f : of.length === 1 ? (legalFor(pos, of[0], c) ? [of[0]] : []) : of.length ? [] : this.foursOnly ? fourCells(pos, c) : threatCells(pos, c);
    for (const i of cands) {
      let need = 0;
      if (pos.cls[c][i] === C_FIVE) need = -1;
      else {
        pos.make(I2M[i]);
        if (forcing(pos, c)) for (let t = 1; t <= maxT; t += 2) { if (this.defend(pos, t - 2)) { need = t; break; } }
        pos.unmake();
      }
      out.push({ i, need });
    }
    return out;
  }
  // per defender reply: attacker moves still needed after it (0 = escapes within maxT)
  defendList(pos, maxT) {
    const d = pos.side, a = 3 - d, out = [];
    const af = fiveCells(pos, a);
    let reps;
    if (hasFive(pos, d)) reps = fiveCells(pos, d);
    else if (af.length >= 1) reps = af.filter(i => legalFor(pos, i, d));
    else reps = defenceCells(pos, a, d);
    if (!reps.length) { const all = []; for (let m = 0; m < 225; m++) if (pos.legalIdx(M2I[m])) all.push(M2I[m]); reps = all; }
    for (const i of reps) {
      pos.make(I2M[i]);
      let need = 0;
      if (!pos.lastFive()) for (let t = 1; t <= maxT; t += 2) { if (this.attack(pos, t) >= 0) { need = t; break; } if (this.nodes > this.limit) break; }
      pos.unmake();
      out.push({ i, need });
    }
    return out;
  }
}
// cells where c makes a four (legal), best first
function fourCells(pos, c) {
  const out = [], k = pos.cls[c], b = pos.b, n = pos.cnt[c];
  if (!n[C_B4] && !n[C_F43] && !n[C_F4]) return out;
  for (let m = 0; m < 225; m++) {
    const i = M2I[m]; if (b[i] !== EMPTY) continue;
    const x = k[i];
    if ((x === C_B4 || x === C_F43 || x === C_F4) && legalFor(pos, i, c)) out.push(i);
  }
  out.sort((p, q) => k[q] - k[p] || pos.sc[c][q] - pos.sc[c][p]);
  return out;
}
// attacking moves: fours and threes (and double threes)
function threatCells(pos, c) {
  const out = [], k = pos.cls[c], b = pos.b;
  for (let m = 0; m < 225; m++) {
    const i = M2I[m]; if (b[i] !== EMPTY) continue;
    if (k[i] >= C_F3 && legalFor(pos, i, c)) out.push(i);
  }
  out.sort((p, q) => k[q] - k[p] || pos.sc[c][q] - pos.sc[c][p]);
  return out;
}
// after c moved: does c threaten to win next move (a five point, or a legal straight four)?
function forcing(pos, c) { return hasFive(pos, c) || winCell(pos, c) >= 0; }
// attacker (side who just moved... now the opponent moves) wins at once: five, or a straight four / four-four the defender cannot answer
function immediate(pos) {
  const a = pos.side, d = 3 - a;
  if (hasFive(pos, a)) return true;
  if (hasFive(pos, d)) return false;
  return winCell(pos, a) >= 0;
}
// defender d against attacker a (no five threat on the board): cells that touch a's four / straight-four points, plus d's own fours
function defenceCells(pos, a, d) {
  const set = new Set(), ka = pos.cls[a], kd = pos.cls[d], b = pos.b;
  for (let m = 0; m < 225; m++) {
    const i = M2I[m]; if (b[i] !== EMPTY) continue;
    const x = ka[i], y = kd[i];
    if ((x >= C_B4 && x !== C_F33) || x === C_F4 || (y >= C_B4 && y !== C_F33)) { if (legalFor(pos, i, d)) set.add(i); }
  }
  return [...set];
}

// ---------------------------------------------------------------- search
const TT_BITS = 20, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
class Engine {
  constructor() {
    this.k1 = new Int32Array(TT_SIZE); this.k2 = new Int32Array(TT_SIZE); this.tv = new Int32Array(TT_SIZE);
    this.td = new Int8Array(TT_SIZE); this.tf = new Int8Array(TT_SIZE); this.tm = new Int16Array(TT_SIZE);
    this.hist = new Int32Array(SIZE * 3);
    this.solver = new Solver();
    this.nodes = 0; this.stop = false; this.deadline = 0; this.rand = Math.random; this.noise = 0;
    this.ordS = new Int32Array(SIZE);
  }
  clear() { this.k1.fill(0); this.k2.fill(0); this.hist.fill(0); this.solver.clear(); }
  timeUp() { if ((++this.nodes & 1023) === 0 && (now() > this.deadline || this.nodes > this.nodeLimit)) this.stop = true; return this.stop; }
  evaluate(pos) {
    const me = pos.side, op = 3 - me;
    const nn = pos.nn;
    if (nn && this.useNN !== false) {
      const b = pos.b, fb = pos.fb, bd = nn.board, fm = nn.forb, rj = pos.renju;
      for (let m = 0; m < 225; m++) { const i = M2I[m], x = b[i]; bd[m] = x; fm[m] = rj && x === EMPTY && fb[i] === 1 ? 1 : 0; }
      const v = nn.eval(me);
      return v > 60000 ? 60000 : v < -60000 ? -60000 : v;
    }
    if (pos.lw && this.learned !== false) {
      // learned units: 600 = one logit; scaled to the hand-made evaluation's units (about 10000 per logit) and clamped below the win scores
      const v = (pos.tA[me] + pos.tB[op] + pos.tP[me] + pos.lw[BIAS + me - 1] + (pos.lw2 ? pos.LA[me] + pos.LB[op] : 0)) * 16 + pos.lk * 16 * (pos.tot[me] * 12 - pos.tot[op] * 10) / 10;
      return Math.max(-60000, Math.min(60000, v)) | 0;
    }
    return ((pos.tot[me] * 12 - pos.tot[op] * 10) / 10) | 0;
  }
  // candidate moves for the side to move, ordered; also handles forced replies
  gen(pos, ttMove, ply, wide) {
    const me = pos.side, op = 3 - me, km = pos.cls[me], ko = pos.cls[op], sm = pos.sc[me], so = pos.sc[op], b = pos.b;
    const list = [];
    const oppThreat = pos.cnt[op][C_F4] > 0;
    for (let m = 0; m < 225; m++) {
      const i = M2I[m];
      if (b[i] !== EMPTY || !pos.near[i]) continue;
      if (!pos.openingOk(i)) continue;
      const x = km[i], y = ko[i];
      if (oppThreat && !(x >= C_B4 && x !== C_F33) && !(y >= C_B4 && y !== C_F33)) continue;
      if (me === BLACK && pos.renju && pos.fb[i] && pos.forbidIdx(i)) continue;
      if (ply === 0 && this.rootOnly && !this.rootOnly.has(i)) continue;
      let s = sm[i] * 2 + so[i] + (i === ttMove ? 1e7 : 0) + this.hist[i * 3 + me];
      if (x >= C_F43) s += 2e5 * x; else if (y >= C_F43 && y !== C_F33) s += 1e5;
      list.push(i); this.ordS[i] = s;
    }
    if (!list.length && pos.ply < 225) {   // the very first move, or nothing near: centre-most legal cell
      for (let m = 0; m < 225; m++) { const i = M2I[m]; if (pos.legalIdx(i)) { list.push(i); this.ordS[i] = -Math.abs(m % N - 7) - Math.abs(((m / N) | 0) - 7); } }
    }
    list.sort((p, q) => this.ordS[q] - this.ordS[p]);
    return { list, oppThreat };
  }
  search(pos, depth, alpha, beta, ply) {
    if (this.timeUp()) return 0;
    const me = pos.side, op = 3 - me;
    // forced situations
    const mf = fiveCells(pos, me);
    if (mf.length) { if (ply === 0) this.rootBest = mf[0]; return WIN - ply - 1; }
    const of = fiveCells(pos, op);
    if (of.length >= 2) { let ok = false; for (const q of of) if (legalFor(pos, q, me)) ok = true; if (ply === 0) this.rootBest = of[0]; return -(WIN - ply - 2); }
    if (of.length === 1) {
      const q = of[0];
      if (!legalFor(pos, q, me)) { if (ply === 0) this.rootBest = q; return -(WIN - ply - 2); }
      pos.make(I2M[q]);
      const v = -this.search(pos, depth, -beta, -alpha, ply + 1);
      pos.unmake();
      if (ply === 0) this.rootBest = q;
      return v;
    }
    const wc = winCell(pos, me);
    if (wc >= 0) { if (ply === 0) this.rootBest = wc; return WIN - ply - 3; }
    // mate distance pruning
    if (WIN - ply - 1 <= alpha) return alpha;
    // transposition table
    const h = pos.h1 & TT_MASK, key = pos.h2 | 1;
    let ttMove = -1;
    if (this.k1[h] === pos.h1 && this.k2[h] === key) {
      ttMove = this.tm[h];
      if (this.td[h] >= depth && ply > 0) {
        let v = this.tv[h]; if (v > WINT) v -= ply; else if (v < -WINT) v += ply;
        const f = this.tf[h];
        if (f === 0 || (f === 1 && v >= beta) || (f === 2 && v <= alpha)) return v;
      }
    }
    // VCF probe (cheap, own fours only)
    {
      this.solver.limit = this.solver.nodes + (ply === 0 ? 20000 : depth >= 1 ? 400 : 120);
      const r = this.solver.vcf(pos, ply === 0 ? 30 : 12, null);
      if (r >= 0) { if (ply === 0) this.rootBest = r; return WIN - ply - 9; }
    }
    if (depth <= 0) {
      // an open three of the opponent at the horizon: look one more move (blocks or own fours only)
      if (pos.cnt[op][C_F4] > 0 && ply < 40) depth = 1;
      else return this.evaluate(pos);
    }
    const { list, oppThreat } = this.gen(pos, ttMove, ply);
    if (!list.length) return 0;
    const width = ply === 0 ? 40 : oppThreat ? 16 : depth >= 6 ? 12 : depth >= 3 ? 10 : 8;
    let best = -WIN, bestM = list[0], a0 = alpha, n = 0;
    for (const i of list) {
      if (n >= width) break;
      n++;
      pos.make(I2M[i]);
      let v;
      const ext = 0;
      if (n === 1) v = -this.search(pos, depth - 1 + ext, -beta, -alpha, ply + 1);
      else {
        v = -this.search(pos, depth - 1 + ext - (n > 6 && depth >= 3 && !oppThreat ? 1 : 0), -alpha - 1, -alpha, ply + 1);
        if (v > alpha && !this.stop) v = -this.search(pos, depth - 1 + ext, -beta, -alpha, ply + 1);
      }
      pos.unmake();
      if (this.stop) break;
      if (ply === 0 && this.rootVals) this.rootVals.set(i, v);
      if (v > best) { best = v; bestM = i; if (ply === 0) this.rootBest = i; }
      if (v > alpha) alpha = v;
      if (alpha >= beta) { this.hist[i * 3 + me] += depth * depth; break; }
    }
    if (!this.stop) {
      let sv = best; if (sv > WINT) sv += ply; else if (sv < -WINT) sv -= ply;
      this.k1[h] = pos.h1; this.k2[h] = key; this.tv[h] = sv; this.td[h] = depth; this.tm[h] = bestM;
      this.tf[h] = best <= a0 ? 2 : best >= beta ? 1 : 0;
    }
    return best;
  }
  // threats before the search: own forced win (VCF / VCT), or the opponent's forced win that must be stopped
  rootThreats(pos, opt) {
    const S = this.solver, me = pos.side, op = 3 - me;
    S.clear(); S.nodes = 0;
    if (fiveCells(pos, me).length || fiveCells(pos, op).length) return null;
    S.limit = opt.vcfNodes || 60000;
    const pv = [];
    const v = S.vcf(pos, 40, pv);
    if (v >= 0) return { win: v, kind: 'vcf', pv };
    const maxT = opt.vct || 0;
    if (maxT) {
      S.clear(); S.nodes = 0; S.limit = opt.vctNodes || 150000;
      for (let t = 1; t <= maxT; t += 2) { const r = S.attack(pos, t); if (r >= 0) return { win: r, kind: 'vct', t }; if (S.nodes > S.limit) break; }
    }
    // the opponent's threat (as if we passed)
    if (!opt.defend) return null;
    pos.pass();
    S.clear(); S.nodes = 0; S.limit = opt.vcfNodes || 60000;
    let threat = S.vcf(pos, 40, null) >= 0 ? 'vcf' : null;
    let tT = 0;
    if (!threat && opt.defend > 1) {
      S.clear(); S.nodes = 0; S.limit = opt.vctNodes || 150000;
      for (let t = 1; t <= opt.defend; t += 2) { if (S.attack(pos, t) >= 0) { threat = 'vct'; tT = t; break; } if (S.nodes > S.limit) break; }
    }
    pos.pass();
    if (!threat) return null;
    // moves after which the opponent no longer has that win
    const { list } = this.gen(pos, -1, 0);
    const good = [];
    for (const i of list.slice(0, 60)) {
      pos.make(I2M[i]);
      S.clear(); S.nodes = 0; S.limit = 20000;
      let still = S.vcf(pos, 40, null) >= 0;
      if (!still && opt.defend > 1) { S.clear(); S.nodes = 0; S.limit = 40000; for (let t = 1; t <= opt.defend && !still; t += 2) if (S.attack(pos, t) >= 0) still = true; }
      pos.unmake();
      if (!still) good.push(i);
    }
    return { threat, defend: good };
  }
  // iterative deepening; returns {i, v, depth}
  best(pos, opt) {
    const th = opt.threats === false ? null : this.rootThreats(pos, opt);
    if (th && th.win !== undefined) return { i: th.win, v: WIN - 10, depth: 0, kind: th.kind };
    this.rootOnly = th && th.defend && th.defend.length ? new Set(th.defend) : null;
    this.stop = false; this.nodes = 0; this.deadline = now() + (opt.ms || 1000); this.nodeLimit = opt.nodes || 1e12;
    this.solver.nodes = 0; this.solver.clear();
    let bestI = -1, bestV = 0, depth = 0;
    for (let d = 1; d <= (opt.depth || 64); d++) {
      this.rootBest = -1; this.rootVals = null;
      const v = this.search(pos, d, -WIN - 1, WIN + 1, 0);
      if (this.stop && d > 1) break;
      if (this.rootBest >= 0) { bestI = this.rootBest; bestV = v; depth = d; }
      if (Math.abs(v) > WINT) break;
      if (now() > this.deadline - (opt.ms || 1000) * 0.45 && d >= (opt.minDepth || 1)) break;
    }
    this.rootOnly = null;
    return { i: bestI, v: bestV, depth };
  }
  // values of the best candidate root moves (for hints / analysis)
  rootList(pos, ms, onProgress, maxN) {
    const t0 = now(); this.stop = false; this.nodes = 0; this.deadline = t0 + ms; this.nodeLimit = 1e12;
    this.solver.nodes = 0; this.solver.clear();
    const me = pos.side;
    // forced cases first
    const mf = fiveCells(pos, me);
    if (mf.length) return { list: mf.map(i => ({ m: I2M[i], v: WIN - 1 })), depth: 1 };
    const { list } = this.gen(pos, -1, 0);
    const cand = list.slice(0, maxN || 12);
    if (!cand.length) return { list: [], depth: 0 };
    let vals = new Map(cand.map(i => [i, 0])), depth = 0, last = null;
    for (let d = 1; d <= 40; d++) {
      const cur = new Map();
      const order = last ? cand.slice().sort((p, q) => last.get(q) - last.get(p)) : cand;
      for (const i of order) {
        pos.make(I2M[i]);
        let v;
        if (pos.lastFive()) v = WIN - 1;
        else v = -this.search(pos, d - 1, -WIN - 1, WIN + 1, 1);
        pos.unmake();
        if (this.stop) break;
        cur.set(i, v);
      }
      if (this.stop && d > 1) break;
      for (const [i, v] of cur) vals.set(i, v);
      last = vals; depth = d;
      const out = [...vals].map(([i, v]) => ({ m: I2M[i], v }));
      if (onProgress) onProgress(out, d);
      const top = Math.max(...vals.values());
      if (Math.abs(top) > WINT) { if (d >= 3) break; }
      if (now() - t0 > ms * 0.5) break;
    }
    return { list: [...vals].map(([i, v]) => ({ m: I2M[i], v })), depth };
  }
}
const now = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();

// ---------------------------------------------------------------- levels
// d: max depth, ms: time, noise: random value added to root choices, blunder: chance to ignore a threat / play a weak move
// 20 steps labelled 15級 … 1級, 初段 … 五段. The weak ones search shallowly with noise and the occasional blunder; from 6級 on
// the search gets a node budget (so the strength does not depend on the device), the top ones also a time cap.
const LEVELS = [null,
  { d: 1, ms: 150, noise: 1100, blunder: 0.40 },   // 15級
  { d: 1, ms: 150, noise: 800, blunder: 0.30 },    // 14級
  { d: 1, ms: 200, noise: 550, blunder: 0.22 },    // 13級
  { d: 2, ms: 200, noise: 380, blunder: 0.15 },    // 12級
  { d: 2, ms: 250, noise: 260, blunder: 0.10 },    // 11級
  { d: 3, ms: 250, noise: 180, blunder: 0.06 },    // 10級
  { d: 3, ms: 300, noise: 120, blunder: 0.03 },    // 9級
  { d: 4, ms: 300, noise: 80, blunder: 0.015 },    // 8級
  { d: 4, ms: 350, noise: 45 },                    // 7級
  { nodes: 2500, vct: 3, defend: 1 },              // 6級
  { nodes: 5000, vct: 3, defend: 1 },              // 5級
  { nodes: 9000, vct: 5, defend: 1 },              // 4級
  { nodes: 15000, vct: 5, defend: 3 },             // 3級
  { nodes: 24000, vct: 7, defend: 3 },             // 2級
  { nodes: 38000, vct: 7, defend: 5 },             // 1級
  { nodes: 60000, vct: 9, defend: 5 },             // 初段
  { nodes: 95000, vct: 9, defend: 5 },             // 二段
  { nodes: 130000, vct: 11, defend: 7, ms: 7000, vctNodes: 250000 }, // 三段
  { nodes: 190000, vct: 11, defend: 7, ms: 8000, vctNodes: 300000 }, // 四段
  { nodes: 280000, vct: 13, defend: 9, ms: 10000, vctNodes: 400000 }, // 五段
];
let ENG = null; const eng = () => ENG || (ENG = new Engine());
function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
// start: { b: [cells], w: [cells], side } (a set-up position; renju opening restrictions do not apply) or null
function setup(rule, start) {
  const pos = new Pos(rule);
  if (start && (start.b || start.w)) {
    for (const m of start.b || []) { if (pos.side !== BLACK) pos.pass(); pos.make(m); }
    for (const m of start.w || []) { if (pos.side !== WHITE) pos.pass(); pos.make(m); }
    if (pos.side !== (start.side || BLACK)) pos.pass();
    pos.fresh = false;
  }
  return pos;
}
function replay(rule, moves, start) {
  const pos = setup(rule, start);
  for (const m of moves || []) { if (!pos.isLegal(m)) throw new Error('illegal move ' + sqName(m)); pos.make(m); }
  return pos;
}
// symmetries of the board (for opening choices)
function sym(m, k) { let c = m % N - 7, r = Math.floor(m / N) - 7; if (k & 4) { const t = c; c = r; r = t; } if (k & 1) c = -c; if (k & 2) r = -r; return (r + 7) * N + (c + 7); }
// renju opening moves of the AI (ply 0-2 from the empty board)
function openingMove(pos, level, rand) {
  if (!pos.renju || !pos.fresh || pos.ply > 2) return -1;
  const mv = pos.moves();
  if (pos.ply === 0) return CENTER;
  if (pos.ply === 1) { const ks = [[0, 1], [1, 1], [1, 0], [0, -1], [-1, -1], [-1, 0], [1, -1], [-1, 1]]; const k = ks[Math.floor(rand() * ks.length)]; return (7 + k[1]) * N + 7 + k[0]; }
  // ply 2: black chooses the opening (strong levels pick the known black wins 花月 / 浦月)
  const w = mv[1], dx = w % N - 7, dy = Math.floor(w / N) - 7, direct = !dx || !dy;
  let rel;
  if (level >= 14) rel = direct ? [1, 1] : [1, -1];
  else {
    const goodD = [[0, 2], [1, 2], [1, 1], [1, 0], [2, 0], [0, -1], [1, -1], [2, -1], [2, 1]], goodI = [[2, 1], [2, 0], [2, -1], [1, 0], [1, -1], [1, -2], [0, -1], [0, -2], [-1, -1]];
    const L = direct ? goodD : goodI; rel = L[Math.floor(rand() * L.length)];
  }
  // rel is given for white at (0,1) (direct) or (1,1) (indirect); rotate / mirror to the actual white stone
  for (let k = 0; k < 8; k++) {
    const base = direct ? (8 * N + 7) : (8 * N + 8);
    if (sym(base, k) !== w) continue;
    const m = sym((7 + rel[1]) * N + 7 + rel[0], k);
    if (pos.isLegal(m)) return m;
  }
  return -1;
}
function think(rule, moves, level, start, rand) {
  rand = rand || Math.random;
  const L = LEVELS[level] || LEVELS[5];
  const pos = replay(rule, moves, start);
  if (pos.status().over) return { move: -1 };
  const om = openingMove(pos, level, rand);
  if (om >= 0) return { move: om, book: true };
  const E = eng();
  if (L.noise !== undefined) {
    const me = pos.side, op = 3 - me;
    // weak levels sometimes overlook the opponent's threats
    if (L.blunder && rand() < L.blunder) {
      const { list } = E.gen(pos, -1, 0);
      const pick = list.filter(i => pos.cls[me][i] !== C_FIVE).slice(0, 8);
      if (pick.length && !fiveCells(pos, me).length) return { move: I2M[pick[Math.floor(rand() * pick.length)]] };
    }
    const r = E.rootList(pos, L.ms, null, 10 + Math.min(10, level));
    const vals = r.list.length ? r.list : pos.legal().map(m => ({ m, v: 0 }));
    let best = null, bv = -Infinity;
    for (const e of vals) { const x = e.v + (Math.abs(e.v) > WINT ? 0 : gauss(rand) * L.noise); if (x > bv) { bv = x; best = e.m; } }
    return { move: best };
  }
  const r = E.best(pos, { ms: L.ms || 60000, nodes: L.nodes, depth: L.d, vct: L.vct, defend: L.defend, vctNodes: L.vctNodes });
  if (r.i < 0) { const lg = pos.legal(); return { move: lg.length ? lg[0] : -1 }; }
  return { move: I2M[r.i], v: r.v, depth: r.depth };
}
function analyze(rule, moves, ms, start, onProgress) {
  const pos = replay(rule, moves, start);
  if (pos.status().over) return { list: [], depth: 0 };
  const E = eng();
  const r = E.rootList(pos, ms || 1000, onProgress, 12);
  return r;
}
// puzzle solver. attacker to move (defend=false): need per candidate move; defender to move (defend=true): need per reply
function solve(rule, moves, start, n, defend, maxNodes) {
  const pos = replay(rule, moves, start);
  const S = new Solver(); S.limit = maxNodes || 4e6;
  const list = defend ? S.defendList(pos, n) : S.attackList(pos, n);
  return list.map(e => ({ m: I2M[e.i], need: e.need }));
}

// neural evaluation (nn.c compiled to WebAssembly), one instance per rule group
const NNI = { renju: null, std: null };
function setNN(group, wasmBytes, weightBytes) {
  if (!wasmBytes) { NNI[group] = null; return true; }
  const inst = new WebAssembly.Instance(new WebAssembly.Module(wasmBytes), {});
  const x = inst.exports, mem = new Uint8Array(x.memory.buffer), n = x.nn_weights_size();
  if (weightBytes.byteLength !== n) return false;
  mem.set(new Uint8Array(weightBytes), x.nn_weights()); x.nn_init();
  NNI[group] = { eval: x.nn_eval, board: new Uint8Array(x.memory.buffer, x.nn_board(), 225), forb: new Uint8Array(x.memory.buffer, x.nn_forb(), 225) };
  return true;
}
// learned weights file: Int8 [combo/pair/bias part (BIAS + 2) | line part (4 * NL)]
function loadWeightsBuffer(group, buf) {
  const a = new Int8Array(buf), nf = BIAS + 2;
  if (a.length !== nf + 4 * NL) return false;
  setWeights(group, a.subarray(0, nf)); setLineWeights(group, a.subarray(nf));
  return true;
}
const API = { setNN, loadWeightsBuffer, setWeights, setLineWeights, NCOMB, COMBO, N, BLACK, WHITE, EMPTY, WIN, WINT, CENTER, RULES, Pos, Engine, Solver, LEVELS, replay, setup, think, analyze, solve, sqName, sqOf, sym, exactForbid, M2I, I2M,
  C: { NONE: C_NONE, TWO: C_2, F2: C_F2, T3: C_3, F3: C_F3, B4: C_B4, F33: C_F33, F43: C_F43, F4: C_F4, FIVE: C_FIVE } };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof window !== 'undefined') window.RenjuEngine = API;
else if (typeof self !== 'undefined' && typeof importScripts === 'function') {
  // the learned evaluation for standard / freestyle (renju keeps the hand-made one for now)
  const gunzip = r => typeof DecompressionStream === 'function' ? new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer() : Promise.reject(new Error('no gzip'));
  const ready = typeof fetch !== 'function' ? Promise.resolve() : Promise.all([
    fetch('eval_std.bin?v=1').then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) loadWeightsBuffer('std', b); }).catch(() => {}),
    // renju: neural evaluation (nn.c -> nn.wasm + weights); falls back to the hand-made evaluation if anything fails
    Promise.all([fetch('nn.wasm?v=1').then(r => r.ok ? r.arrayBuffer() : null), fetch('nn_renju.bin.gz?v=3').then(r => r.ok ? gunzip(r) : null)])
      .then(([w, b]) => { if (w && b) setNN('renju', w, b); }).catch(() => {}),
    Promise.all([fetch('nn.wasm?v=1').then(r => r.ok ? r.arrayBuffer() : null), fetch('nn_std.bin.gz?v=1').then(r => r.ok ? gunzip(r) : null)])
      .then(([w, b]) => { if (w && b) setNN('std', w, b); }).catch(() => {}),
  ]);
  self.onmessage = async e => {
    await ready;
    const m = e.data;
    try {
      if (m.type === 'info') self.postMessage({ id: m.id, type: 'result', nnRenju: !!NNI.renju, nnStd: !!NNI.std, learnedStd: !!LW.std });
      else if (m.type === 'think') self.postMessage({ id: m.id, type: 'result', ...think(m.rule, m.moves, m.level, m.start) });
      else if (m.type === 'analyze') {
        const prog = (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth });
        self.postMessage({ id: m.id, type: 'result', ...analyze(m.rule, m.moves, m.time || 1000, m.start, prog) });
      } else if (m.type === 'solve') self.postMessage({ id: m.id, type: 'result', list: solve(m.rule, m.moves, m.start, m.n, m.defend, m.maxNodes) });
    } catch (err) { self.postMessage({ id: m.id, type: 'result', error: String(err && err.stack || err) }); }
  };
}
})();

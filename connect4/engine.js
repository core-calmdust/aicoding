// Connect Four V2 engine — bitboard negamax (alpha-beta + transposition table + iterative deepening).
// Works as a Web Worker (postMessage API) and as a Node module (for puzzle/lesson generation & tests).
// Board: 7 columns x (6+1 sentinel) bits, column-major. 49 bits are split in two int32 halves:
//   lo = columns 0..3 (bits 0..27), hi = columns 4..6 (bits 0..20).
'use strict';
const W = 7, H = 6, SZ = W * H;
const M28 = 0x0fffffff, M21 = 0x1fffff;
const BOT_L = 0x0204081, BOT_H = 0x04081;          // bottom bit of every column
const BOARD_L = BOT_L * 63, BOARD_H = BOT_H * 63;  // playable cells
const MINS = -(SZ / 2) + 3, MAXS = ((SZ + 1) >> 1) - 3;
const ORDER = [3, 2, 4, 1, 5, 0, 6];
const BIG = 100000;

let _h = 0, _wh = 0;
function sl(lo, hi, s) { _h = ((hi << s) | (lo >>> (28 - s))) & M21; return (lo << s) & M28; }
function sr(lo, hi, s) { _h = hi >>> s; return ((lo >>> s) | (hi << (28 - s))) & M28; }
function popc(x) { x = x - ((x >>> 1) & 0x55555555); x = (x & 0x33333333) + ((x >>> 2) & 0x33333333); return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24; }
// cells (empty) that would complete a four for the stones p. Returns lo, hi in _wh.
// (straight-line expansion of the Pons win test on the split 49-bit board)
function winPos(pl, ph, ml, mh) {
  let rl = (pl << 1) & (pl << 2) & (pl << 3);
  let rh = ((ph << 1) | (pl >>> 27)) & ((ph << 2) | (pl >>> 26)) & ((ph << 3) | (pl >>> 25));
  let ql, qh;
  ql = (pl << 7) & (pl << 14); qh = ((ph << 7) | (pl >>> 21)) & ((ph << 14) | (pl >>> 14));
  rl |= ql & ((pl << 21) | ((pl >>> 7) | (ph << 21))); rh |= qh & (((ph << 21) | (pl >>> 7)) | (ph >>> 7));
  ql = ((pl >>> 7) | (ph << 21)) & ((pl >>> 14) | (ph << 14)); qh = (ph >>> 7) & (ph >>> 14);
  rl |= ql & ((pl << 7) | ((pl >>> 21) | (ph << 7))); rh |= qh & (((ph << 7) | (pl >>> 21)) | (ph >>> 21));
  ql = (pl << 6) & (pl << 12); qh = ((ph << 6) | (pl >>> 22)) & ((ph << 12) | (pl >>> 16));
  rl |= ql & ((pl << 18) | ((pl >>> 6) | (ph << 22))); rh |= qh & (((ph << 18) | (pl >>> 10)) | (ph >>> 6));
  ql = ((pl >>> 6) | (ph << 22)) & ((pl >>> 12) | (ph << 16)); qh = (ph >>> 6) & (ph >>> 12);
  rl |= ql & ((pl << 6) | ((pl >>> 18) | (ph << 10))); rh |= qh & (((ph << 6) | (pl >>> 22)) | (ph >>> 18));
  ql = (pl << 8) & (pl << 16); qh = ((ph << 8) | (pl >>> 20)) & ((ph << 16) | (pl >>> 12));
  rl |= ql & ((pl << 24) | ((pl >>> 8) | (ph << 20))); rh |= qh & (((ph << 24) | (pl >>> 4)) | (ph >>> 8));
  ql = ((pl >>> 8) | (ph << 20)) & ((pl >>> 16) | (ph << 12)); qh = (ph >>> 8) & (ph >>> 16);
  rl |= ql & ((pl << 8) | ((pl >>> 24) | (ph << 4))); rh |= qh & (((ph << 8) | (pl >>> 20)) | (ph >>> 24));
  _wh = rh & (BOARD_H ^ mh);
  return rl & (BOARD_L ^ ml);
}
function colMaskL(c) { return c < 4 ? (63 << (c * 7)) : 0; }
function colMaskH(c) { return c >= 4 ? (63 << ((c - 4) * 7)) : 0; }
const CML = [], CMH = [], TOPL = [], TOPH = [];
for (let c = 0; c < W; c++) { CML.push(colMaskL(c)); CMH.push(colMaskH(c)); TOPL.push(c < 4 ? 1 << (c * 7 + 5) : 0); TOPH.push(c >= 4 ? 1 << ((c - 4) * 7 + 5) : 0); }

// ------------------------------------------------------------------ position state (global, mutable)
// cur = stones of the player to move, mask = all stones
let cl = 0, ch = 0, ml = 0, mh = 0, nm = 0;
const stack = new Int32Array(SZ * 4 + 8);
function reset() { cl = ch = ml = mh = nm = 0; }
function canPlay(c) { return ((ml & TOPL[c]) | (mh & TOPH[c])) === 0; }
function moveBitsL(c) { return (ml + BOT_L) & CML[c]; }
function moveBitsH(c) { return (mh + BOT_H) & CMH[c]; }
function playBits(vl, vh) { cl ^= ml; ch ^= mh; ml |= vl; mh |= vh; nm++; }
function playCol(c) { playBits(moveBitsL(c), moveBitsH(c)); }
function isWinningMove(c) { const wl = winPos(cl, ch, ml, mh), wh = _wh; return ((wl & moveBitsL(c)) | (wh & moveBitsH(c))) !== 0; }
function loadMoves(str) {
  reset();
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i) - 49;
    if (c < 0 || c >= W || !canPlay(c)) return false;
    playCol(c);
  }
  return true;
}

// ------------------------------------------------------------------ exact solver (Pascal Pons style)
const TT_BITS = 21, TT_SIZE = 1 << TT_BITS;
const ttL = new Uint32Array(TT_SIZE), ttH = new Uint32Array(TT_SIZE), ttV = new Int8Array(TT_SIZE);
function ttIdx(kl, kh) { return (Math.imul(kl, 0x9E3779B1) ^ Math.imul(kh + 0x7f4a7c15, 0x85EBCA77)) >>> (32 - TT_BITS); }
const MVL = new Int32Array(SZ * 8 + 16), MVH = new Int32Array(SZ * 8 + 16), SC = new Int32Array(SZ * 8 + 16);
let nodes = 0, deadline = Infinity, aborted = false;
function checkTime() { if ((++nodes & 2047) === 0 && Date.now() > deadline) aborted = true; return aborted; }

function negamax(alpha, beta) { return nega(cl, ch, ml, mh, nm, alpha, beta); }
// pure version (state passed as arguments: faster in V8 than module-level variables)
function nega(pcl, pch, pml, pmh, n, alpha, beta) {
  if ((++nodes & 2047) === 0 && Date.now() > deadline) aborted = true;
  if (aborted) return 0;
  let pl = (pml + BOT_L) & BOARD_L, ph = (pmh + BOT_H) & BOARD_H;
  const owl = winPos(pcl ^ pml, pch ^ pmh, pml, pmh), owh = _wh;
  const fl = pl & owl, fh = ph & owh;
  if (fl | fh) {
    if (popc(fl) + popc(fh) > 1) return -((SZ - n) >> 1);
    pl = fl; ph = fh;
  }
  // never play directly below an opponent winning cell (lo bit 27 is a sentinel, so >>1 needs no carry from hi)
  pl &= ~(owl >>> 1); ph &= ~(owh >>> 1);
  if ((pl | ph) === 0) return -((SZ - n) >> 1);
  if (n >= SZ - 2) return 0;
  let min = -((SZ - 2 - n) >> 1);
  if (alpha < min) { alpha = min; if (alpha >= beta) return alpha; }
  let max = (SZ - 1 - n) >> 1;
  const kl = pcl + pml, kh = pch + pmh, idx = ttIdx(kl, kh);
  if (ttL[idx] === kl && ttH[idx] === kh) {
    const val = ttV[idx];
    if (val > MAXS - MINS + 1) { min = val + 2 * MINS - MAXS - 2; if (alpha < min) { alpha = min; if (alpha >= beta) return alpha; } }
    else if (val) { max = val + MINS - 1; if (beta > max) { beta = max; if (alpha >= beta) return beta; } }
  }
  const base = n * 8;
  let cnt = 0;
  for (let i = W - 1; i >= 0; i--) {
    const c = ORDER[i], vl = pl & CML[c], vh = ph & CMH[c];
    if (vl | vh) {
      const wl = winPos(pcl | vl, pch | vh, pml, pmh);
      const sc = popc(wl) + popc(_wh);
      let j = cnt++;
      for (; j > 0 && SC[base + j - 1] > sc; j--) { MVL[base + j] = MVL[base + j - 1]; MVH[base + j] = MVH[base + j - 1]; SC[base + j] = SC[base + j - 1]; }
      MVL[base + j] = vl; MVH[base + j] = vh; SC[base + j] = sc;
    }
  }
  const ncl = pcl ^ pml, nch = pch ^ pmh;
  for (let i = cnt - 1; i >= 0; i--) {
    const s = -nega(ncl, nch, pml | MVL[base + i], pmh | MVH[base + i], n + 1, -beta, -alpha);
    if (aborted) return 0;
    if (s >= beta) { ttL[idx] = kl; ttH[idx] = kh; ttV[idx] = s + MAXS - 2 * MINS + 2; return s; }
    if (s > alpha) alpha = s;
  }
  ttL[idx] = kl; ttH[idx] = kh; ttV[idx] = alpha - MINS + 1;
  return alpha;
}
const half = x => (x / 2) | 0;   // C-style truncating division
function canWinNext() {
  const wl = winPos(cl, ch, ml, mh), wh = _wh;
  return ((wl & ((ml + BOT_L) & BOARD_L)) | (wh & ((mh + BOT_H) & BOARD_H))) !== 0;
}
// Exact score of the current position for the player to move (Pons convention:
// positive = win, value = 22 - number of the winner's stones when the four is made). null on timeout.
function solve(weak) {
  if (canWinNext()) return (SZ + 1 - nm) >> 1;
  if (nm >= SZ) return 0;
  let min = -((SZ - nm) >> 1), max = (SZ + 1 - nm) >> 1;
  if (weak) { min = -1; max = 1; }
  while (min < max) {
    let med = min + half(max - min);
    if (med <= 0 && half(min) < med) med = half(min);
    else if (med >= 0 && half(max) > med) med = half(max);
    const r = negamax(med, med + 1);
    if (aborted) return null;
    if (r <= med) max = r; else min = r;
  }
  return min;
}
// score of playing column c, from the current mover's view
function solveMove(c, weak) {
  if (!canPlay(c)) return null;
  if (isWinningMove(c)) return (SZ + 1 - nm) >> 1;
  const s0l = cl, s0h = ch, s0ml = ml, s0mh = mh;
  playCol(c);
  let r;
  if (nm >= SZ) r = 0; else { const v = solve(weak); r = v === null ? null : -v; }
  cl = s0l; ch = s0h; ml = s0ml; mh = s0mh; nm--;
  return r;
}

// ------------------------------------------------------------------ short forced wins (puzzles)
// canWin(d): can the player to move force a four within d of its own moves (any defence)?
let mateTT = new Map();
function canWin(d) {
  const pl = (ml + BOT_L) & BOARD_L, ph = (mh + BOT_H) & BOARD_H;
  const wl = winPos(cl, ch, ml, mh), wh = _wh;
  if ((wl & pl) | (wh & ph)) return true;
  if (d <= 1 || nm >= SZ - 2) return false;
  const key = cl + ',' + ch + ',' + ml + ',' + mh + ',' + d;
  const hit = mateTT.get(key); if (hit !== undefined) return hit;
  const owl = winPos(cl ^ ml, ch ^ mh, ml, mh), owh = _wh;
  let al = pl, ah = ph;
  const fl = owl & pl, fh = owh & ph;
  if (fl | fh) { if (popc(fl) + popc(fh) > 1) { mateTT.set(key, false); return false; } al = fl; ah = fh; }
  al &= ~(owl >>> 1); ah &= ~(owh >>> 1);
  let res = false;
  for (let i = 0; i < W && !res; i++) {
    const c = ORDER[i], vl = al & CML[c], vh = ah & CMH[c];
    if (!(vl | vh)) continue;
    const s0l = cl, s0h = ch, s0ml = ml, s0mh = mh;
    playBits(vl, vh);
    res = allLose(d - 1);
    cl = s0l; ch = s0h; ml = s0ml; mh = s0mh; nm--;
  }
  mateTT.set(key, res);
  return res;
}
// the player to move is the defender: true if every reply still loses within d attacker moves
function allLose(d) {
  const pl = (ml + BOT_L) & BOARD_L, ph = (mh + BOT_H) & BOARD_H;
  const wl = winPos(cl, ch, ml, mh), wh = _wh;
  if ((wl & pl) | (wh & ph)) return false;
  if (nm >= SZ) return false;
  for (let c = 0; c < W; c++) {
    const vl = pl & CML[c], vh = ph & CMH[c];
    if (!(vl | vh)) continue;
    const s0l = cl, s0h = ch, s0ml = ml, s0mh = mh;
    playBits(vl, vh);
    const r = canWin(d);
    cl = s0l; ch = s0h; ml = s0ml; mh = s0mh; nm--;
    if (!r) return false;
  }
  return true;
}
// attacker to move: for each legal move, the number of own moves (incl. this one) needed to force a four, 0 = not within n
function mateList(str, n) {
  mateTT = new Map();
  loadMoves(str);
  const out = [];
  for (let c = 0; c < W; c++) {
    if (!canPlay(c)) continue;
    if (isWinningMove(c)) { out.push({ c, need: 1 }); continue; }
    const s0l = cl, s0h = ch, s0ml = ml, s0mh = mh;
    playCol(c);
    let need = 0;
    for (let d = 1; d < n && !need; d++) if (allLose(d)) need = d + 1;
    cl = s0l; ch = s0h; ml = s0ml; mh = s0mh; nm--;
    out.push({ c, need });
  }
  return out;
}
// defender to move: for each reply, the attacker's remaining moves needed after it (0 = the reply escapes within n)
function defendList(str, n) {
  mateTT = new Map();
  loadMoves(str);
  const out = [];
  for (let c = 0; c < W; c++) {
    if (!canPlay(c)) continue;
    if (isWinningMove(c)) { out.push({ c, need: 0 }); continue; }
    const s0l = cl, s0h = ch, s0ml = ml, s0mh = mh;
    playCol(c);
    let need = 0;
    for (let d = 1; d <= n && !need; d++) if (canWin(d)) need = d;
    cl = s0l; ch = s0h; ml = s0ml; mh = s0mh; nm--;
    out.push({ c, need });
  }
  return out;
}

// ------------------------------------------------------------------ heuristic search
// Cell weights = number of 4-windows through each cell
const CELLW = [
  [3, 4, 5, 5, 4, 3], [4, 6, 8, 8, 6, 4], [5, 8, 11, 11, 8, 5], [7, 10, 13, 13, 10, 7],
  [5, 8, 11, 11, 8, 5], [4, 6, 8, 8, 6, 4], [3, 4, 5, 5, 4, 3]];
const WCLS = []; // [weight, maskL, maskH]
(function () {
  const m = new Map();
  for (let c = 0; c < W; c++) for (let r = 0; r < H; r++) {
    const w = CELLW[c][r]; if (!m.has(w)) m.set(w, [0, 0]);
    const e = m.get(w); if (c < 4) e[0] |= 1 << (c * 7 + r); else e[1] |= 1 << ((c - 4) * 7 + r);
  }
  for (const [w, e] of m) WCLS.push([w, e[0], e[1]]);
})();
// rows (0-based from bottom). Odd rows in 1-based terms = 0,2,4.
const ROWEVEN_L = (BOT_L << 1 | BOT_L << 3 | BOT_L << 5), ROWEVEN_H = (BOT_H << 1 | BOT_H << 3 | BOT_H << 5);
const ROWODD_L = BOARD_L & ~ROWEVEN_L, ROWODD_H = BOARD_H & ~ROWEVEN_H;
// all 69 lines of four as bit masks
const WINL = [], WINH = [];
for (let c = 0; c < W; c++) for (let r = 0; r < H; r++) for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
  const ec = c + 3 * dc, er = r + 3 * dr;
  if (ec >= W || er < 0 || er >= H) continue;
  let l = 0, h = 0;
  for (let k = 0; k < 4; k++) { const cc = c + k * dc, rr = r + k * dr; if (cc < 4) l |= 1 << (cc * 7 + rr); else h |= 1 << ((cc - 4) * 7 + rr); }
  WINL.push(l); WINH.push(h);
}
const EP = { cell: 0.3, win1: 1, win2: 5, thr: 4, good: 16, stack: 35 };   // tuned against solver labels
// Static evaluation from the mover's view. Immediate wins are found by the search; this scores latent features.
function evaluate() {
  const ol = cl ^ ml, oh = ch ^ mh;
  let s = 0;
  if (EP.cell) for (let i = 0; i < WCLS.length; i++) { const e = WCLS[i]; s += EP.cell * e[0] * (popc(cl & e[1]) + popc(ch & e[2]) - popc(ol & e[1]) - popc(oh & e[2])); }
  if (EP.win1 || EP.win2) {
    for (let i = 0; i < WINL.length; i++) {
      const wl = WINL[i], wh = WINH[i];
      const m = popc(cl & wl) + popc(ch & wh), o = popc(ol & wl) + popc(oh & wh);
      if (o === 0) { if (m === 1) s += EP.win1; else if (m === 2) s += EP.win2; }
      else if (m === 0) { if (o === 1) s -= EP.win1; else if (o === 2) s -= EP.win2; }
    }
  }
  const mwl = winPos(cl, ch, ml, mh), mwh = _wh;
  const owl = winPos(ol, oh, ml, mh), owh = _wh;
  const meFirst = (nm & 1) === 0;
  // zugzwang parity: first player wants threats on odd rows (1-based), second player on even rows
  const myGoodL = meFirst ? ROWODD_L : ROWEVEN_L, myGoodH = meFirst ? ROWODD_H : ROWEVEN_H;
  const opGoodL = meFirst ? ROWEVEN_L : ROWODD_L, opGoodH = meFirst ? ROWEVEN_H : ROWODD_H;
  const myT = popc(mwl) + popc(mwh), opT = popc(owl) + popc(owh);
  const myG = popc(mwl & myGoodL) + popc(mwh & myGoodH), opG = popc(owl & opGoodL) + popc(owh & opGoodH);
  s += EP.thr * (myT - opT) + EP.good * (myG - opG);
  const myStack = popc(mwl & (mwl << 1)) + popc(mwh & (mwh << 1)), opStack = popc(owl & (owl << 1)) + popc(owh & (owh << 1));
  s += EP.stack * (myStack - opStack);
  return s;
}
const HT_BITS = 20, HT_SIZE = 1 << HT_BITS;
const htL = new Uint32Array(HT_SIZE), htH = new Uint32Array(HT_SIZE), htV = new Int32Array(HT_SIZE), htD = new Int8Array(HT_SIZE), htF = new Int8Array(HT_SIZE), htM = new Int8Array(HT_SIZE);
function searchH(depth, alpha, beta) {
  if (checkTime()) return 0;
  if (canWinNext()) return BIG - (nm + 1);
  let pl = (ml + BOT_L) & BOARD_L, ph = (mh + BOT_H) & BOARD_H;
  const owl = winPos(cl ^ ml, ch ^ mh, ml, mh), owh = _wh;
  const fl = pl & owl, fh = ph & owh;
  if (fl | fh) { if (popc(fl) + popc(fh) > 1) return -(BIG - (nm + 2)); pl = fl; ph = fh; }
  pl &= ~(owl >>> 1); ph &= ~(owh >>> 1);
  if ((pl | ph) === 0) return -(BIG - (nm + 2));
  if (nm >= SZ - 2) return 0;
  if (depth <= 0) return evaluate();
  const kl = cl + ml, kh = ch + mh, idx = (Math.imul(kl, 0x2545F491) ^ Math.imul(kh + 0x51ed27, 0x9E3779B1)) >>> (32 - HT_BITS);
  let ttMove = -1;
  if (htL[idx] === kl && htH[idx] === kh && htF[idx]) {
    ttMove = htM[idx];
    if (htD[idx] >= depth) {
      const v = htV[idx], f = htF[idx];
      if (f === 1) return v;
      if (f === 2 && v >= beta) return v;
      if (f === 3 && v <= alpha) return v;
    }
  }
  const mv = [0, 0, 0, 0, 0, 0, 0], sc = [0, 0, 0, 0, 0, 0, 0];
  let n = 0;
  for (let i = 0; i < W; i++) {
    const c = ORDER[i], vl = pl & CML[c], vh = ph & CMH[c];
    if (vl | vh) {
      const wl = winPos(cl | vl, ch | vh, ml, mh);
      let s = (popc(wl) + popc(_wh)) * 16 - i;
      if (c === ttMove) s += 10000;
      let j = n++;
      for (; j > 0 && sc[j - 1] < s; j--) { mv[j] = mv[j - 1]; sc[j] = sc[j - 1]; }
      mv[j] = c; sc[j] = s;
    }
  }
  const a0 = alpha, scl = cl, sch = ch, sml = ml, smh = mh;
  let best = -BIG * 2, bestM = mv[0];
  for (let i = 0; i < n; i++) {
    const c = mv[i];
    playBits(moveBitsL(c), moveBitsH(c));
    let s;
    if (i === 0) s = -searchH(depth - 1, -beta, -alpha);
    else {
      s = -searchH(depth - 1, -alpha - 1, -alpha);
      if (!aborted && s > alpha && s < beta) s = -searchH(depth - 1, -beta, -alpha);
    }
    cl = scl; ch = sch; ml = sml; mh = smh; nm--;
    if (aborted) return 0;
    if (s > best) { best = s; bestM = c; }
    if (s > alpha) alpha = s;
    if (alpha >= beta) break;
  }
  htL[idx] = kl; htH[idx] = kh; htV[idx] = best; htD[idx] = depth; htM[idx] = bestM;
  htF[idx] = best <= a0 ? 3 : best >= beta ? 2 : 1;
  return best;
}
// heuristic score of every legal root move (mover's view) at the given depth; null on abort
function rootHeur(depth) {
  const out = [];
  for (const c of ORDER) {
    if (!canPlay(c)) continue;
    let s;
    if (isWinningMove(c)) s = BIG - (nm + 1);
    else {
      const a = cl, b = ch, d = ml, e = mh;
      playCol(c);
      s = -searchH(depth - 1, -BIG * 2, BIG * 2);
      cl = a; ch = b; ml = d; mh = e; nm--;
      if (aborted) return null;
    }
    out.push({ c, s });
  }
  return out;
}
function heurID(maxDepth, timeMs) {
  const t0 = Date.now(); let res = null, depth = 0;
  for (let d = 1; d <= Math.min(maxDepth, SZ - nm); d++) {
    deadline = t0 + timeMs; aborted = false;
    const r = rootHeur(d);
    if (!r) break;
    res = r; depth = d;
    const b = Math.max(...r.map(x => x.s));
    if (Math.abs(b) > BIG / 2) break;                 // forced result found
    if (Date.now() - t0 > timeMs * 0.4) break;        // next depth would likely not finish
  }
  deadline = Infinity; aborted = false;
  return { list: res, depth };
}

// ------------------------------------------------------------------ book
let BOOK = null;
function keyOf(str) {
  const cols = [[], [], [], [], [], [], []];
  for (let i = 0; i < str.length; i++) cols[str.charCodeAt(i) - 49].push(i & 1 ? 2 : 1);
  const kv = cs => { let v = 0; for (let c = 6; c >= 0; c--) { let code = 1 << cs[c].length; cs[c].forEach((p, r) => { if (p === 1) code |= 1 << r; }); v = v * 128 + code; } return v; };
  const a = kv(cols), b = kv(cols.slice().reverse());
  return a <= b ? [a.toString(36), false] : [b.toString(36), true];
}
function bookLookup(str) {
  if (!BOOK) return null;
  const [k, mir] = keyOf(str);
  for (const kind of ['b', 'a']) {
    const e = BOOK[kind] && BOOK[kind][k];
    if (e) {
      const sc = mir ? e.slice().reverse() : e.slice();
      return { kind: kind === 'a' ? 'weak' : 'exact', sc, partial: sc.some(x => x === 'u') };
    }
  }
  return null;
}
function inBook(str) { if (!BOOK) return false; const [k] = keyOf(str); return !!((BOOK.a && BOOK.a[k]) || (BOOK.b && BOOK.b[k])); }

// ------------------------------------------------------------------ analysis & move choice
// result list entries: {c, kind: 'exact'|'weak'|'heur', v}
// exact v: Pons score; weak v: -1/0/1 (or Pons score when immediate); heur v: heuristic score
function analyzePosition(str, timeMs, onProgress) {
  loadMoves(str);
  const legal = ORDER.filter(c => canPlay(c));
  const t0 = Date.now();
  const bk = bookLookup(str);
  if (bk && !bk.partial) {
    const list = legal.map(c => ({ c, kind: bk.kind, v: bk.sc[c] }));
    return { list, book: true };
  }
  // parent position in the book with the last move proven winning -> every move here loses
  if (str.length) {
    const pb = bookLookup(str.slice(0, -1)), lm = str.charCodeAt(str.length - 1) - 49;
    if (pb && pb.sc[lm] === 1) return { list: legal.map(c => ({ c, kind: 'weak', v: -1 })), book: true };
  }
  // quick heuristic pass
  const hr = heurID(42, Math.max(60, timeMs * 0.25));
  loadMoves(str);
  const heur = new Map((hr.list || []).map(x => [x.c, x.s]));
  const list = legal.map(c => {
    const hv = heur.has(c) ? heur.get(c) : 0;
    if (Math.abs(hv) > BIG / 2) {           // forced win/loss found by search: convert to Pons score
      const stonesAtWin = BIG - Math.abs(hv);   // total stones when the four is made
      const winnerStones = (stonesAtWin + 1) >> 1;
      return { c, kind: 'exact', v: Math.sign(hv) * (22 - winnerStones), h: hv };
    }
    return { c, kind: 'heur', v: hv, h: hv };
  });
  if (bk && bk.partial) for (const e of list) if (bk.sc[e.c] === 1 && e.kind === 'heur') { e.kind = 'weak'; e.v = 1; }
  onProgress && onProgress(list.map(x => ({ ...x })), hr.depth);
  // weak pass then strong pass, each per move under the deadline
  for (const mode of ['weak', 'exact']) {
    for (const e of list) {
      if (e.kind === 'exact') continue;
      if (mode === 'weak' && e.kind === 'weak') continue;
      deadline = t0 + timeMs; aborted = false;
      const v = solveMove(e.c, mode === 'weak');
      deadline = Infinity;
      if (v === null) { aborted = false; return { list, depth: hr.depth }; }
      e.kind = (mode === 'weak' && Math.abs(v) <= 1) ? 'weak' : 'exact'; e.v = v;
      onProgress && onProgress(list.map(x => ({ ...x })), hr.depth);
    }
  }
  return { list, depth: hr.depth, solved: true };
}
// class value comparable across kinds (mover's view): higher is better
function rankVal(e) {
  if (e.kind === 'exact') return e.v > 0 ? 1e6 + e.v : e.v < 0 ? -1e6 + e.v : 0;
  if (e.kind === 'weak') return e.v > 0 ? 1e6 : e.v < 0 ? -1e6 : 0;
  return Math.max(-9e5, Math.min(9e5, e.h !== undefined ? e.h : e.v));
}

const LEVELS = {
  1: { depth: 1, noise: 60, blunder: 0.35 },
  2: { depth: 2, noise: 25, blunder: 0.12 },
  3: { depth: 4, noise: 10, blunder: 0.04 },
  4: { depth: 6, noise: 4 },
  5: { depth: 8, noise: 1.5 },
  6: { depth: 12, time: 500, solveLate: 24 },
  7: { depth: 42, time: 1000, solve: 800, book: 4 },
  8: { depth: 42, time: 1800, solve: 1400, book: 99 },
};
function rnd() { return Math.random(); }
function think(str, level) {
  const cfg = LEVELS[level] || LEVELS[5];
  loadMoves(str);
  const legal = ORDER.filter(c => canPlay(c));
  if (legal.length === 1) return { move: legal[0], how: 'forced' };
  // immediate win
  for (const c of legal) if (isWinningMove(c)) {
    if (!cfg.blunder || rnd() > cfg.blunder * 0.5) return { move: c, how: 'win' };
  }
  // book
  if (cfg.book && nm <= cfg.book) {
    const bk = bookLookup(str);
    if (bk) {
      const val = c => typeof bk.sc[c] === 'number' ? (bk.kind === 'weak' ? Math.sign(bk.sc[c]) : bk.sc[c]) : -99;
      const best = Math.max(...legal.map(val));
      const cands = legal.filter(c => val(c) === best);
      if (!(bk.partial && best < 0)) {
      // prefer the move whose continuations the book knows best (the line the book was built along)
      const known = c => { let k = 0; for (let r = 0; r < W; r++) if (inBook(str + (c + 1) + (r + 1))) k++; return k; };
      let move = cands[0], bestK = -1;
      for (const c of cands) { const k = known(c); if (k > bestK) { bestK = k; move = c; } }
      return { move, how: 'book', score: { kind: bk.kind, v: bk.sc[move] } };
      }
    }
  }
  // blunder: weak levels sometimes ignore the opponent's threat
  if (cfg.blunder && rnd() < cfg.blunder) {
    const c = legal[Math.floor(rnd() * legal.length)];
    return { move: c, how: 'random' };
  }
  const t0 = Date.now();
  const early = nm < 8;   // too early for the exact solver: spend the time on the heuristic search
  const timeH = cfg.time ? (cfg.solve && !early ? cfg.time - cfg.solve : cfg.time * (cfg.solve ? 0.7 : 1)) : 3000;
  const hr = heurID(cfg.depth, Math.max(80, timeH));
  loadMoves(str);
  let list = (hr.list || legal.map(c => ({ c, s: 0 }))).map(x => ({ c: x.c, kind: 'heur', v: x.s, h: x.s }));
  const exactLate = cfg.solveLate && nm >= cfg.solveLate;
  if ((cfg.solve && !early) || exactLate) {
    // weak (win/draw/loss) pass, then strong pass if time remains
    const budget = cfg.solve || 400;
    const dl = Date.now() + budget;
    const sorted = list.slice().sort((a, b) => b.h - a.h);
    let complete = true;
    for (const e of sorted) {
      deadline = dl; aborted = false;
      const v = solveMove(e.c, true); deadline = Infinity;
      if (v === null) { aborted = false; complete = false; break; }
      e.kind = Math.abs(v) <= 1 ? 'weak' : 'exact'; e.v = v;
      if (v > 0) break;                       // found a win; good enough
    }
    if (complete) {
      const bestCls = Math.max(...list.filter(e => e.kind !== 'heur').map(e => Math.sign(e.v)));
      // all moves lose or draw: refine with strong solve (delay the loss / keep chances)
      if (bestCls <= 0) {
        for (const e of sorted) {
          if (e.kind === 'exact' || Math.sign(e.v) !== bestCls) continue;
          deadline = dl + 300; aborted = false;
          const v = solveMove(e.c, false); deadline = Infinity;
          if (v === null) { aborted = false; break; }
          e.kind = 'exact'; e.v = v;
        }
      }
    }
  }
  // choose: class (win 2 / draw-or-unknown 1 / loss 0), then speed of win / delay of loss / heuristic
  const cls = e => e.kind === 'heur' ? (e.h > BIG / 2 ? 2 : e.h < -BIG / 2 ? 0 : 1) : (e.v > 0 ? 2 : e.v < 0 ? 0 : 1);
  let best = null, bestV = -Infinity;
  for (const e of list) {
    let sec = (e.kind === 'exact' && e.v !== 0) ? e.v * 1e6 : (e.h || 0);
    if (cfg.noise && e.kind === 'heur') sec += (rnd() * 2 - 1) * cfg.noise;
    const v = cls(e) * 1e9 + sec;
    if (v > bestV) { bestV = v; best = e; }
  }
  return { move: best.c, how: 'search', depth: hr.depth, ms: Date.now() - t0, score: best.kind !== 'heur' ? { kind: best.kind, v: best.v } : { kind: 'heur', v: best.h } };
}

const API = { loadMoves, solve, solveMove, analyzePosition, mateList, defendList, think, heurID, keyOf, bookLookup, setBook: b => { BOOK = b; }, ORDER, BIG,
  state: () => ({ nm }), setDeadline: d => { deadline = d; aborted = false; }, nodes: () => nodes, evaluate, EP, rootHeur, setDeadline2: () => { deadline = Infinity; aborted = false; }, clearHT: () => { htF.fill(0); } };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof self !== 'undefined' && typeof window === 'undefined' && typeof postMessage === 'function' && typeof module === 'undefined') {
  self.onmessage = e => {
    const m = e.data;
    if (m.type === 'book') BOOK = m.book;
    else if (m.type === 'think') {
      const r = think(m.moves, m.level);
      postMessage({ type: 'result', id: m.id, ...r });
    } else if (m.type === 'analyze') {
      const r = analyzePosition(m.moves, m.time || 1000, (list, depth) => postMessage({ type: 'progress', id: m.id, list, depth }));
      postMessage({ type: 'analysis', id: m.id, ...r });
    } else if (m.type === 'mate') {
      postMessage({ type: 'mate', id: m.id, list: m.defend ? defendList(m.moves, m.n) : mateList(m.moves, m.n) });
    }
  };
}

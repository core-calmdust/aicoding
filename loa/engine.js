// ラインズ・オブ・アクション (loa/) — rules + search AI. Pure JS: Node (module.exports) and the browser (window.LoaEngine).
// Squares: s = r * 8 + c, r = 0 is rank 1 (bottom), c = 0 is file a. Colours: 1 = black (moves first), 2 = white.
// A move is an int: from | to << 6 | (capture ? 4096 : 0).
(function (root) {
'use strict';
const B = 1, W = 2, MATE = 30000, MAXPLY = 64;
const DR = [1, 1, 0, -1, -1, -1, 0, 1], DC = [0, 1, 1, 1, 0, -1, -1, -1];   // N NE E SE S SW W NW; line kind = d & 3 (0 file, 1 diagonal, 2 rank, 3 anti-diagonal)
const VARIANTS = ['std', 'scr'];

// ---------- tables ----------
const NB = [];      // 8-neighbours of every square
for (let s = 0; s < 64; s++) { const a = [], r = s >> 3, c = s & 7; for (let d = 0; d < 8; d++) { const y = r + DR[d], x = c + DC[d]; if (y >= 0 && y < 8 && x >= 0 && x < 8) a.push(y * 8 + x); } NB.push(a); }
function rng32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (t ^ (t >>> 14)) >>> 0; }; }
const ZH = [null, new Int32Array(64), new Int32Array(64)], ZL = [null, new Int32Array(64), new Int32Array(64)];
let ZTH = 0, ZTL = 0;
{ const g = rng32(19690401); for (let k = 1; k <= 2; k++) for (let s = 0; s < 64; s++) { ZH[k][s] = g() | 0; ZL[k][s] = g() | 0; } ZTH = g() | 0; ZTL = g() | 0; }
const PST = new Int8Array(64);      // centralisation: edge 0, then 3 / 5 / 6; corners are the worst squares
for (let s = 0; s < 64; s++) { const r = s >> 3, c = s & 7, e = Math.min(r, 7 - r, c, 7 - c); PST[s] = [0, 3, 5, 6][e] - ((r === 0 || r === 7) && (c === 0 || c === 7) ? 3 : 0); }
const MINSUM = new Int16Array(13);  // the smallest possible sum of distances to the centre of mass for n pieces
for (let n = 1; n <= 12; n++) MINSUM[n] = n <= 9 ? n - 1 : 8 + 2 * (n - 9);

// ---------- positions ----------
function startCells(variant) {
  const b = new Int8Array(64);
  if (variant === 'scr') {            // Scrambled Eggs: the same 24 edge squares, colours alternating along the edge
    const ring = []; for (let c = 1; c <= 6; c++) ring.push(c); for (let r = 1; r <= 6; r++) ring.push(r * 8 + 7); for (let c = 6; c >= 1; c--) ring.push(56 + c); for (let r = 6; r >= 1; r--) ring.push(r * 8);
    ring.forEach((s, i) => { b[s] = i % 2 ? W : B; });
  } else { for (let i = 1; i <= 6; i++) { b[i] = B; b[56 + i] = B; b[i * 8] = W; b[i * 8 + 7] = W; } }
  return b;
}
function stateFrom(cells, turn) {
  const st = { b: new Int8Array(64), turn: turn || B, cnt: [0, 0, 0], row: new Int8Array(8), col: new Int8Array(8), dg: new Int8Array(15), ad: new Int8Array(15),
    hi: 0, lo: 0, keys: [], ms: [], caps: [], revs: [], rev: 0, winner: 0, why: '', variant: 'std' };
  for (let s = 0; s < 64; s++) { const k = cells[s]; if (!k) continue; st.b[s] = k; st.cnt[k]++; const r = s >> 3, c = s & 7; st.row[r]++; st.col[c]++; st.dg[r - c + 7]++; st.ad[r + c]++; st.hi ^= ZH[k][s]; st.lo ^= ZL[k][s]; }
  if (st.turn === W) { st.hi ^= ZTH; st.lo ^= ZTL; }
  st.keys.push(keyOf(st));
  return st;
}
const keyOf = st => (st.hi & 0x1fffff) * 4294967296 + (st.lo >>> 0);
function newGame(variant) { const v = VARIANTS.includes(variant) ? variant : 'std'; const st = stateFrom(startCells(v), B); st.variant = v; return st; }
// text board for tests and the tutorial: 8 strings, rank 8 first; 'x' black, 'o' white, anything else empty
function fromText(rows, turn) { const b = new Int8Array(64); for (let i = 0; i < 8; i++) for (let c = 0; c < 8; c++) { const ch = rows[i][c]; b[(7 - i) * 8 + c] = ch === 'x' ? B : ch === 'o' ? W : 0; } return stateFrom(b, turn || B); }
const sqName = s => 'abcdefgh'[s & 7] + ((s >> 3) + 1);
const moveName = m => sqName(m & 63) + (m & 4096 ? 'x' : '-') + sqName((m >> 6) & 63);
const sqOf = n => (n.charCodeAt(0) - 97) + (+n[1] - 1) * 8;

function make(st, m) {
  const f = m & 63, t = (m >> 6) & 63, b = st.b, me = b[f], cap = b[t];
  st.ms.push(m); st.caps.push(cap); st.revs.push(st.rev);
  let r = f >> 3, c = f & 7; st.row[r]--; st.col[c]--; st.dg[r - c + 7]--; st.ad[r + c]--;
  b[f] = 0; st.hi ^= ZH[me][f]; st.lo ^= ZL[me][f];
  if (cap) { st.cnt[cap]--; st.hi ^= ZH[cap][t]; st.lo ^= ZL[cap][t]; st.rev = 0; }
  else { r = t >> 3; c = t & 7; st.row[r]++; st.col[c]++; st.dg[r - c + 7]++; st.ad[r + c]++; st.rev++; }
  b[t] = me; st.hi ^= ZH[me][t] ^ ZTH; st.lo ^= ZL[me][t] ^ ZTL;
  st.turn = 3 - st.turn; st.keys.push(keyOf(st));
}
function unmake(st) {
  const m = st.ms.pop(), cap = st.caps.pop(); st.rev = st.revs.pop(); st.keys.pop();
  const f = m & 63, t = (m >> 6) & 63, b = st.b, me = b[t];
  st.turn = 3 - st.turn;
  st.hi ^= ZH[me][t] ^ ZTH; st.lo ^= ZL[me][t] ^ ZTL;
  let r, c;
  if (cap) { st.cnt[cap]++; st.hi ^= ZH[cap][t]; st.lo ^= ZL[cap][t]; }
  else { r = t >> 3; c = t & 7; st.row[r]--; st.col[c]--; st.dg[r - c + 7]--; st.ad[r + c]--; }
  b[t] = cap; b[f] = me; st.hi ^= ZH[me][f]; st.lo ^= ZL[me][f];
  r = f >> 3; c = f & 7; st.row[r]++; st.col[c]++; st.dg[r - c + 7]++; st.ad[r + c]++;
}
const lineCount = (st, r, c, d) => { const k = d & 3; return k === 0 ? st.col[c] : k === 1 ? st.dg[r - c + 7] : k === 2 ? st.row[r] : st.ad[r + c]; };
function gen(st, me, out) {
  const b = st.b, foe = 3 - me; let n = 0;
  for (let s = 0; s < 64; s++) {
    if (b[s] !== me) continue; const r = s >> 3, c = s & 7;
    for (let d = 0; d < 8; d++) {
      const cnt = lineCount(st, r, c, d), tr = r + DR[d] * cnt, tc = c + DC[d] * cnt;
      if (tr < 0 || tr > 7 || tc < 0 || tc > 7) continue;
      const t = tr * 8 + tc; if (b[t] === me) continue;
      const step = DR[d] * 8 + DC[d]; let q = s + step, free = true;
      for (let i = 1; i < cnt; i++, q += step) if (b[q] === foe) { free = false; break; }
      if (free) out[n++] = s | t << 6 | (b[t] ? 4096 : 0);
    }
  }
  return n;
}
// what the piece on `from` sees in each of the 8 directions (the UI shows the counted lines; blocked = why it cannot go there)
function lineInfo(st, from) {
  const b = st.b, me = b[from], r = from >> 3, c = from & 7, res = [];
  for (let d = 0; d < 8; d++) {
    const n = lineCount(st, r, c, d), tr = r + DR[d] * n, tc = c + DC[d] * n, o = { d, k: d & 3, n, to: -1, ok: false, why: '' };
    if (tr < 0 || tr > 7 || tc < 0 || tc > 7) { o.why = 'off'; res.push(o); continue; }
    o.to = tr * 8 + tc;
    if (b[o.to] === me) o.why = 'own';
    else { const step = DR[d] * 8 + DC[d]; let q = from + step; for (let i = 1; i < n; i++, q += step) if (b[q] && b[q] !== me) { o.why = 'jump'; break; } }
    o.ok = !o.why; o.cap = o.ok && !!b[o.to];
    res.push(o);
  }
  return res;
}
const seen = new Int32Array(64), stk = new Int8Array(64); let stamp = 0;
function connected(st, color) {
  const total = st.cnt[color]; if (total <= 1) return true;
  const b = st.b; let s0 = 0; while (b[s0] !== color) s0++;
  stamp++; let sp = 0, n = 1; stk[sp++] = s0; seen[s0] = stamp;
  while (sp) { const nb = NB[stk[--sp]]; for (let i = 0; i < nb.length; i++) { const q = nb[i]; if (b[q] === color && seen[q] !== stamp) { seen[q] = stamp; n++; stk[sp++] = q; } } }
  return n === total;
}
function groups(st, color) {       // [[squares], …]
  const b = st.b, res = []; stamp++;
  for (let s = 0; s < 64; s++) { if (b[s] !== color || seen[s] === stamp) continue; const g = [s]; seen[s] = stamp; for (let i = 0; i < g.length; i++) for (const q of NB[g[i]]) if (b[q] === color && seen[q] !== stamp) { seen[q] = stamp; g.push(q); } res.push(g); }
  return res;
}

// ---------- the game ----------
const tmpMoves = new Int32Array(100);
function legal(st) { if (st.winner) return []; const n = gen(st, st.turn, tmpMoves); return Array.from(tmpMoves.subarray(0, n)); }
function settle(st) {      // after a move: who has won?
  const mover = 3 - st.turn, other = st.turn; st.winner = 0; st.why = '';
  if (connected(st, mover)) { st.winner = mover; st.why = connected(st, other) ? 'both' : 'connect'; }
  else if (connected(st, other)) { st.winner = other; st.why = 'connect'; }
  else if (gen(st, other, tmpMoves) === 0) { st.winner = mover; st.why = 'nomove'; }
  else { const k = st.keys[st.keys.length - 1]; let n = 0; for (let i = st.keys.length - 1; i >= 0; i -= 2) if (st.keys[i] === k) n++; if (n >= 3) { st.winner = 3; st.why = 'rep'; } }
}
function play(st, m) {
  if (st.winner) return null; const f = m & 63, t = (m >> 6) & 63;
  const n = gen(st, st.turn, tmpMoves); let found = 0; for (let i = 0; i < n; i++) if ((tmpMoves[i] & 4095) === (f | t << 6)) found = tmpMoves[i];
  if (!found) return null;
  make(st, found); settle(st);
  return { m: found, from: f, to: t, cap: !!(found & 4096), winner: st.winner, why: st.why };
}
function undo(st) { if (!st.ms.length) return false; unmake(st); st.winner = 0; st.why = ''; return true; }
function clone(st) { const s = stateFrom(st.b, st.turn); s.variant = st.variant; s.keys = st.keys.slice(); s.rev = st.rev; s.winner = st.winner; s.why = st.why; return s; }      // history for repetition is kept, the move list is not

// ---------- evaluation (from `me`'s point of view) ----------
const px = new Int8Array(12), py = new Int8Array(12);
function sideScore(st, color) {
  const b = st.b; let n = 0, sx = 0, sy = 0, pst = 0;
  for (let s = 0; s < 64; s++) if (b[s] === color) { px[n] = s & 7; py[n] = s >> 3; sx += s & 7; sy += s >> 3; pst += PST[s]; n++; }
  if (n <= 1) return 4000;
  const cx = Math.round(sx / n), cy = Math.round(sy / n); let sum = 0;
  for (let i = 0; i < n; i++) { const dx = px[i] - cx, dy = py[i] - cy; sum += Math.max(dx < 0 ? -dx : dx, dy < 0 ? -dy : dy); }
  const conc = sum - MINSUM[n];
  // groups
  stamp++; let grp = 0;
  for (let i = 0; i < n; i++) { const s0 = py[i] * 8 + px[i]; if (seen[s0] === stamp) continue; grp++; let sp = 0; stk[sp++] = s0; seen[s0] = stamp;
    while (sp) { const nb = NB[stk[--sp]]; for (let j = 0; j < nb.length; j++) { const q = nb[j]; if (b[q] === color && seen[q] !== stamp) { seen[q] = stamp; stk[sp++] = q; } } } }
  // quads (2×2 windows, also over the rim): Euler number = (Q1 − Q3 − 2·Qd) / 4; Q3 and Q4 are the solid shapes
  let q1 = 0, q3 = 0, q4 = 0, qd = 0;
  for (let r = -1; r < 8; r++) for (let c = -1; c < 8; c++) {
    const a = r >= 0 && c >= 0 && b[r * 8 + c] === color ? 1 : 0, e = r >= 0 && c < 7 && b[r * 8 + c + 1] === color ? 1 : 0, f = r < 7 && c >= 0 && b[r * 8 + 8 + c] === color ? 1 : 0, g = r < 7 && c < 7 && b[r * 8 + 9 + c] === color ? 1 : 0, k = a + e + f + g;
    if (k === 1) q1++; else if (k === 3) q3++; else if (k === 4) q4++; else if (k === 2 && a === g) qd++;
  }
  const euler = (q1 - q3 - 2 * qd) / 4;
  return -14 * conc - 9 * (grp - 1) - 5 * euler + 3 * (q3 + q4) + 2 * pst;
}
function countMoves(st, me) { return gen(st, me, tmpMoves); }
function evaluate(st, me) {
  const foe = 3 - me;
  return Math.round(sideScore(st, me) - sideScore(st, foe) + 1.5 * (countMoves(st, me) - countMoves(st, foe)) + 8);
}
const winProb = score => score >= MATE - 500 ? 1 : score <= -MATE + 500 ? 0 : 1 / (1 + Math.exp(-score / 110));

// ---------- search: iterative deepening negamax (PVS), transposition table, killers, history ----------
const TTN = 1 << 19, ttHi = new Int32Array(TTN), ttLo = new Int32Array(TTN), ttMv = new Int16Array(TTN), ttSc = new Int16Array(TTN), ttDp = new Int8Array(TTN), ttFl = new Int8Array(TTN);
const mvBuf = [], scBuf = []; for (let i = 0; i < MAXPLY + 2; i++) { mvBuf.push(new Int32Array(100)); scBuf.push(new Int32Array(100)); }
const killer = new Int32Array((MAXPLY + 2) * 2), hist = new Int32Array(3 * 4096);
let nodes = 0, stopAt = 0, stopped = false, noiseAmp = 0, noiseSeed = 0, nodeCap = 0;
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
function noiseOf(st) { let h = (st.lo ^ noiseSeed ^ Math.imul(st.hi, 0x9E3779B1)) | 0; h = Math.imul(h ^ (h >>> 16), 0x85EBCA6B); h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35); h ^= h >>> 16; return ((h >>> 0) / 4294967296 - .5) * 2 * noiseAmp; }
function negamax(st, depth, alpha, beta, ply, noNull) {
  nodes++;
  if ((nodes & 1023) === 0 && ((stopAt && now() > stopAt) || (nodeCap && nodes > nodeCap))) stopped = true;
  if (stopped) return 0;
  const me = st.turn, foe = 3 - me;
  if (connected(st, foe)) return -(MATE - ply);          // the side that just moved is connected: it wins (also when both are)
  if (connected(st, me)) return MATE - ply;
  if (st.rev >= 4) { const ks = st.keys, k = ks[ks.length - 1]; for (let i = ks.length - 5, lim = ks.length - 1 - st.rev; i >= lim && i >= 0; i -= 2) if (ks[i] === k) return 0; }
  if (depth <= 0 || ply >= MAXPLY) { const v = evaluate(st, me); return noiseAmp ? Math.round(v + noiseOf(st)) : v; }
  const idx = (st.lo >>> 0) & (TTN - 1); let ttMove = 0;
  if (ttHi[idx] === st.hi && ttLo[idx] === st.lo) {
    ttMove = ttMv[idx];
    if (ttDp[idx] >= depth) { let v = ttSc[idx]; if (v > MATE - 500) v -= ply; else if (v < -MATE + 500) v += ply; const fl = ttFl[idx]; if (fl === 0 || (fl === 1 && v >= beta) || (fl === 2 && v <= alpha)) return v; }
  }
  // null move: if passing still fails high, the position is good enough (not near mates, not with very few pieces)
  if (!noNull && depth >= 3 && beta < MATE - 500 && beta > -MATE + 500 && st.cnt[me] > 3) {
    st.turn = foe; st.hi ^= ZTH; st.lo ^= ZTL; st.keys.push(keyOf(st)); const rv = st.rev; st.rev = 0;
    const v = -negamax(st, depth - 3, -beta, -beta + 1, ply + 1, true);
    st.rev = rv; st.keys.pop(); st.turn = me; st.hi ^= ZTH; st.lo ^= ZTL;
    if (stopped) return 0;
    if (v >= beta && v < MATE - 500) return beta;
  }
  const mv = mvBuf[ply], sc = scBuf[ply], n = gen(st, me, mv);
  if (n === 0) return -(MATE - ply);
  const k1 = killer[ply * 2], k2 = killer[ply * 2 + 1], hb = me * 4096;
  for (let i = 0; i < n; i++) { const m = mv[i], mm = m & 4095; sc[i] = mm === ttMove ? 1 << 30 : m & 4096 ? (1 << 24) + hist[hb + mm] : m === k1 ? 1 << 23 : m === k2 ? (1 << 23) - 1 : hist[hb + mm]; }
  let best = -MATE * 2, bestM = 0, a0 = alpha;
  for (let i = 0; i < n; i++) {
    let bi = i, bs = sc[i]; for (let j = i + 1; j < n; j++) if (sc[j] > bs) { bs = sc[j]; bi = j; }
    const m = mv[bi]; mv[bi] = mv[i]; sc[bi] = sc[i]; mv[i] = m;
    make(st, m); let v;
    if (i === 0) v = -negamax(st, depth - 1, -beta, -alpha, ply + 1);
    else {
      const red = depth >= 3 && i >= 4 && !(m & 4096) ? (i >= 12 ? 2 : 1) : 0;
      v = -negamax(st, depth - 1 - red, -alpha - 1, -alpha, ply + 1);
      if (v > alpha && red) v = -negamax(st, depth - 1, -alpha - 1, -alpha, ply + 1);
      if (v > alpha && v < beta) v = -negamax(st, depth - 1, -beta, -alpha, ply + 1);
    }
    unmake(st);
    if (stopped) return 0;
    if (v > best) { best = v; bestM = m; }
    if (v > alpha) alpha = v;
    if (alpha >= beta) { if (!(m & 4096)) { if (killer[ply * 2] !== m) { killer[ply * 2 + 1] = killer[ply * 2]; killer[ply * 2] = m; } hist[hb + (m & 4095)] += depth * depth; if (hist[hb + (m & 4095)] > 1 << 22) for (let h = 0; h < hist.length; h++) hist[h] >>= 1; } break; }
  }
  let v = best; if (v > MATE - 500) v += ply; else if (v < -MATE + 500) v -= ply;
  ttHi[idx] = st.hi; ttLo[idx] = st.lo; ttMv[idx] = bestM & 4095; ttSc[idx] = v; ttDp[idx] = depth; ttFl[idx] = best <= a0 ? 2 : best >= beta ? 1 : 0;
  return best;
}
// search(st, { depth, ms, noise, seed, nodes }) -> { move, score (for the side to move), depth, nodes, ms }
function search(st, o) {
  o = o || {};
  const t0 = now(); nodes = 0; stopped = false; stopAt = o.ms ? t0 + o.ms : 0; nodeCap = o.nodes || 0; noiseAmp = o.noise || 0; noiseSeed = (o.seed | 0) || 1;
  ttHi.fill(0); ttLo.fill(0); ttDp.fill(-1); killer.fill(0); hist.fill(0);
  const me = st.turn, root = new Int32Array(100), n = gen(st, me, root);
  if (!n) return { move: 0, score: -MATE, depth: 0, nodes: 0, ms: 0 };
  let best = root[0], bestScore = 0, done = 0; const maxD = Math.min(o.depth || MAXPLY - 2, MAXPLY - 2);
  for (let d = 1; d <= maxD; d++) {
    let alpha = -MATE * 2, cur = 0, curScore = -MATE * 2;
    for (let i = 0; i < n; i++) {
      const m = root[i]; make(st, m); let v;
      if (i === 0) v = -negamax(st, d - 1, -MATE * 2, -alpha, 1);
      else { v = -negamax(st, d - 1, -alpha - 1, -alpha, 1); if (v > alpha && !stopped) v = -negamax(st, d - 1, -MATE * 2, -alpha, 1); }
      unmake(st);
      if (stopped) break;
      if (v > curScore) { curScore = v; cur = m; } if (v > alpha) alpha = v;
    }
    if (stopped && !(cur && done === 0)) break;
    best = cur; bestScore = curScore; if (!stopped) done = d;
    const k = root.indexOf(best); for (let j = k; j > 0; j--) root[j] = root[j - 1]; root[0] = best;      // the best move first in the next iteration
    if (stopped || bestScore > MATE - 500 || (bestScore < -MATE + 500 && d >= 4) || n === 1) break;
    if (o.ms && now() - t0 > o.ms * .55) break;
  }
  return { move: best, score: bestScore, depth: done, nodes, ms: now() - t0 };
}

// ---------- 20 levels (shown as Lv.N) ----------
// Lv.1–13: depth-limited (1–5 plies, with evaluation noise and random blunders; safety cap 0.6 s). Lv.14–20: time-limited (0.25 s … Lv.19 1.2 s, Lv.20 2.5 s)
const LEVELS = [null,
  { depth: 1, noise: 130, blunder: .42 }, { depth: 1, noise: 95, blunder: .32 }, { depth: 1, noise: 60, blunder: .23 }, { depth: 2, noise: 60, blunder: .17 },
  { depth: 2, noise: 40, blunder: .12 }, { depth: 2, noise: 24, blunder: .08 }, { depth: 3, noise: 30, blunder: .05 }, { depth: 3, noise: 18, blunder: .03 },
  { depth: 3, noise: 8, blunder: .015 }, { depth: 4, noise: 12, blunder: 0 }, { depth: 4, noise: 5, blunder: 0 }, { depth: 5, noise: 6, blunder: 0 },
  { depth: 5, noise: 0, blunder: 0 }, { depth: 0, ms: 250 }, { depth: 0, ms: 400 }, { depth: 0, ms: 600 },
  { depth: 0, ms: 800 }, { depth: 0, ms: 1000 }, { depth: 0, ms: 1200 }, { depth: 0, ms: 2500 }];
// chooseMove(st, level, { rng, msScale }) -> { move, score, depth, nodes, blunder }
function chooseMove(st, level, o) {
  o = o || {}; const L = LEVELS[Math.max(1, Math.min(20, level | 0))], rng = o.rng || Math.random, sc = o.msScale || 1;
  if (L.blunder && rng() < L.blunder) { const n = gen(st, st.turn, tmpMoves); if (n) return { move: tmpMoves[rng() * n | 0], score: 0, depth: 0, nodes: 0, blunder: true }; }
  return search(st, { depth: L.depth || 0, ms: Math.max(10, (L.ms || 600) * sc), noise: L.noise || 0, seed: (rng() * 0x7fffffff) | 0 });
}
const hint = (st, ms) => search(st, { ms: ms || 600, depth: 10 });      // about Lv.16–17

// one job for the worker (or the page itself when workers are not available): { id, type: 'move' | 'hint' | 'eval', variant, moves, level, ms }
function job(d) {
  const st = newGame(d.variant); for (const m of d.moves) make(st, m);
  const r = d.type === 'move' ? chooseMove(st, d.level) : search(st, { ms: d.ms || 250, depth: d.depth || 0 });
  return { id: d.id, type: d.type, n: d.moves.length, turn: st.turn, move: r.move, score: r.score, depth: r.depth, nodes: r.nodes };
}
const API = { job,  B, W, MATE, VARIANTS, LEVELS, NB, DR, DC, startCells, stateFrom, newGame, fromText, sqName, sqOf, moveName, make, unmake, gen, legal, lineInfo, connected, groups, play, undo, clone,
  evaluate, winProb, search, chooseMove, hint, keyOf };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.LoaEngine = API;
})(typeof self !== 'undefined' ? self : this);

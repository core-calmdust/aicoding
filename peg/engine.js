/* PegEngine — peg solitaire (ペグソリテール) for the 世界のボドゲ大百科: the five boards, moves, and the solver.
   Works in a page, a Web Worker and node (no DOM).
   A board: cells [r, c] (the holes), jumps [from, over, to] (orthogonal on the square boards, 6 directions on the triangle),
   the symmetries (cell permutations) and a drawing position (x, y) per hole.
   A position is a bitset of the holes holding a peg, in two 32-bit words (lo: holes 0–31, hi: 32–44) → key = lo + hi·2³².
   The solver: depth-first, the jumps toward the middle first, with a table of positions already found unsolvable
   (keyed by their symmetric-canonical form when the goal is symmetric). Goal: one peg left (anywhere, or on a given hole). */
(function (root) {
'use strict';
const W32 = 4294967296;
// ---------------------------------------------------------------- boards
function sqBoard(id, rows, cross) {
  const cells = [], at = {};
  rows.forEach((row, r) => { for (let c = 0; c < row.length; c++) if (row[c] === 'o') { at[r + ',' + c] = cells.length; cells.push([r, c]); } });
  const H = rows.length, Wd = Math.max(...rows.map(s => s.length));
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const pos = cells.map(([r, c]) => [c, r]);
  // the 8 symmetries of the square (the boards are all symmetric about their middle)
  const cy = (H - 1) / 2, cx = (Wd - 1) / 2, syms = [];
  const T8 = [(y, x) => [y, x], (y, x) => [x, -y], (y, x) => [-y, -x], (y, x) => [-x, y], (y, x) => [y, -x], (y, x) => [-y, x], (y, x) => [x, y], (y, x) => [-x, -y]];
  for (const f of T8) { const p = cells.map(([r, c]) => { const [y, x] = f(r - cy, c - cx); return at[(y + cy) + ',' + (x + cx)]; }); if (p.every(v => v !== undefined)) syms.push(p); }
  return finish({ id, cells, at, dirs, pos, syms, w: Wd, h: H, tri: false });
}
function triBoard(id, n) {
  const cells = [], at = {};
  for (let r = 0; r < n; r++) for (let c = 0; c <= r; c++) { at[r + ',' + c] = cells.length; cells.push([r, c]); }
  const dirs = [[0, 1], [1, 1], [1, 0], [0, -1], [-1, -1], [-1, 0]];
  const pos = cells.map(([r, c]) => [c - r / 2 + (n - 1) / 2, r * Math.sqrt(3) / 2]);
  // the 6 symmetries of the triangle, in barycentric terms (a = r - c, b = c, d = n - 1 - r)
  const syms = [];
  const toRC = (a, b) => [a + b, b];
  for (const perm of [[0, 1, 2], [1, 2, 0], [2, 0, 1], [1, 0, 2], [0, 2, 1], [2, 1, 0]]) {
    syms.push(cells.map(([r, c]) => { const t = [r - c, c, n - 1 - r], a = t[perm[0]], b = t[perm[1]]; const [rr, cc] = toRC(a, b); return at[rr + ',' + cc]; }));
  }
  return finish({ id, cells, at, dirs, pos, syms, w: n, h: (n - 1) * Math.sqrt(3) / 2 + 1, tri: true });
}
function finish(B) {
  B.n = B.cells.length; B.jumps = [];
  B.cells.forEach(([r, c], i) => { for (const [dr, dc] of B.dirs) { const o = B.at[(r + dr) + ',' + (c + dc)], t = B.at[(r + 2 * dr) + ',' + (c + 2 * dc)]; if (o !== undefined && t !== undefined) B.jumps.push([i, o, t]); } });
  // the middle of the board (the hole nearest the centroid) and each hole's distance to it (the solver tries inward jumps first)
  const mx = B.pos.reduce((s, p) => s + p[0], 0) / B.n, my = B.pos.reduce((s, p) => s + p[1], 0) / B.n;
  B.dist = B.pos.map(([x, y]) => Math.hypot(x - mx, y - my));
  B.center = B.dist.indexOf(Math.min(...B.dist));
  B.jumps.sort((a, b) => (B.dist[a[2]] - B.dist[a[0]]) - (B.dist[b[2]] - B.dist[b[0]]));
  B.byTo = B.cells.map(() => []); B.jumps.forEach((j, k) => B.byTo[j[2]].push(k));
  return B;
}
const BOARDS = {
  // English (33): the cross with arms 3 wide — the standard game: the middle empty, finish with one peg in the middle
  english: sqBoard('english', ['..ooo..', '..ooo..', 'ooooooo', 'ooooooo', 'ooooooo', '..ooo..', '..ooo..']),
  // European / French (37): the corners filled in — from the middle there is no one-peg finish (the position classes)
  french: sqBoard('french', ['..ooo..', '.ooooo.', 'ooooooo', 'ooooooo', 'ooooooo', '.ooooo.', '..ooo..']),
  // the triangle (15): 5 a side, jumps along the three lines
  triangle: triBoard('triangle', 5),
  // the diamond (41): the square turned 45°, jumps along the rows and columns
  diamond: sqBoard('diamond', ['....o....', '...ooo...', '..ooooo..', '.ooooooo.', 'ooooooooo', '.ooooooo.', '..ooooo..', '...ooo...', '....o....']),
  // Wiegleb's German board (45): the cross with arms 3 wide and 3 long on a 9×9
  german: sqBoard('german', ['...ooo...', '...ooo...', '...ooo...', 'ooooooooo', 'ooooooooo', 'ooooooooo', '...ooo...', '...ooo...', '...ooo...']),
};
const IDS = ['english', 'french', 'triangle', 'diamond', 'german'];
// each board's classic start (the empty hole) and the hole of the finish that counts as perfect (null = anywhere)
// english: the middle → the middle. french: the middle has no one-peg finish; the classic start leaves the hole just
// above-left of the middle's column empty (r1 c2 is one of the solvable starts). triangle: a corner (top).
const START = { english: 'center', french: [1, 3], triangle: [0, 0], diamond: 'center', german: 'center' };

// ---------------------------------------------------------------- positions
// a position: { lo, hi } bitset. helpers on plain arrays of 0/1 for the UI
function make(B, pegs) { let lo = 0, hi = 0; pegs.forEach((v, i) => { if (v) { if (i < 32) lo = (lo | (1 << i)) >>> 0; else hi |= 1 << (i - 32); } }); return { lo, hi }; }
function has(p, i) { return i < 32 ? (p.lo >>> i) & 1 : (p.hi >>> (i - 32)) & 1; }
function arr(B, p) { const a = new Array(B.n); for (let i = 0; i < B.n; i++) a[i] = has(p, i); return a; }
const key = p => p.lo + p.hi * W32;
function count(p) { let c = 0, x = p.lo; while (x) { x &= x - 1; c++; } x = p.hi; while (x) { x &= x - 1; c++; } return c; }
function startPos(B, hole) {
  const h = hole === undefined || hole === 'center' ? B.center : Array.isArray(hole) ? B.at[hole[0] + ',' + hole[1]] : hole;
  const a = new Array(B.n).fill(1); a[h] = 0; return a;
}
function startHole(id) { const B = BOARDS[id], s = START[id]; return s === 'center' ? B.center : B.at[s[0] + ',' + s[1]]; }
// legal jumps of an array position: [from, over, to]
function moves(B, a) { const out = []; for (const j of B.jumps) if (a[j[0]] && a[j[1]] && !a[j[2]]) out.push(j); return out; }
function apply(a, j) { const b = a.slice(); b[j[0]] = 0; b[j[1]] = 0; b[j[2]] = 1; return b; }
function canon(B, a) { let best = null; for (const s of B.syms) { let lo = 0, hi = 0; for (let i = 0; i < B.n; i++) if (a[i]) { const k = s[i]; if (k < 32) lo = (lo | (1 << k)) >>> 0; else hi |= 1 << (k - 32); } const v = lo + hi * W32; if (best === null || v < best) best = v; } return best; }

// ---------------------------------------------------------------- the solver
// solve(B, a, opt) → { ok, path: [[f, o, t], …], nodes, timeout }
//   opt.target: the hole the last peg must stand on (undefined = anywhere); opt.limit: node budget; opt.time: ms
//   opt.left: finish with this many pegs (default 1; the target then is ignored)
function solve(B, a0, opt) {
  opt = opt || {};
  const target = opt.target === undefined || opt.target === null ? -1 : opt.target, left = opt.left || 1;
  // a goal on one hole is symmetric only under the symmetries that keep that hole → those are the ones used for the table
  const syms = target < 0 ? B.syms : B.syms.filter(s => s[target] === target);
  const n = B.n, J = B.jumps, NJ = J.length;
  const F = new Int32Array(NJ), O = new Int32Array(NJ), T = new Int32Array(NJ);
  J.forEach((j, k) => { F[k] = j[0]; O[k] = j[1]; T[k] = j[2]; });
  const a = new Uint8Array(n); for (let i = 0; i < n; i++) a[i] = a0[i] ? 1 : 0;
  let pegs = 0; for (let i = 0; i < n; i++) pegs += a[i];
  const dead = new Set(), path = [];
  const limit = opt.limit || 2e7, t0 = Date.now(), tmax = opt.time || 0;
  let nodes = 0, stop = false;
  const ck = () => { let best = -1; for (const s of syms) { let lo = 0, hi = 0; for (let i = 0; i < n; i++) if (a[i]) { const k = s[i]; if (k < 32) lo = (lo | (1 << k)) >>> 0; else hi |= 1 << (k - 32); } const v = lo + hi * W32; if (best < 0 || v < best) best = v; } return best; };
  // a cheap bound: a peg with no peg next to it and no way to be reached cannot be removed — counted as isolated
  function rec() {
    if (pegs === left) return left > 1 || target < 0 || a[target] === 1;
    if (stop) return false;
    if (++nodes > limit || (tmax && (nodes & 1023) === 0 && Date.now() - t0 > tmax)) { stop = true; return false; }
    const k0 = ck(); if (dead.has(k0)) return false;
    for (let k = 0; k < NJ; k++) {
      if (!a[F[k]] || !a[O[k]] || a[T[k]]) continue;
      a[F[k]] = 0; a[O[k]] = 0; a[T[k]] = 1; pegs--; path.push(k);
      if (rec()) return true;
      path.pop(); pegs++; a[F[k]] = 1; a[O[k]] = 1; a[T[k]] = 0;
      if (stop) return false;
    }
    dead.add(k0); return false;
  }
  const ok = rec();
  return { ok, path: ok ? path.map(k => J[k]) : null, nodes, timeout: stop };
}
// how many of the legal jumps keep a solution (the puzzles' "fun": few good jumps among many = hard)
function goodMoves(B, a, opt) {
  const ms = moves(B, a), good = [];
  for (const j of ms) { const r = solve(B, apply(a, j), opt); if (r.ok) good.push(j); }
  return { moves: ms, good };
}
// a move as text: the board's own letters (columns a… from the left, rows 1… from the top), e.g. "d2-d4"
function sq(B, i) { const [r, c] = B.cells[i]; return String.fromCharCode(97 + c) + (r + 1); }
function moveText(B, j) { return sq(B, j[0]) + '-' + sq(B, j[2]); }

const API = { BOARDS, IDS, START, make, has, arr, key, count, startPos, startHole, moves, apply, canon, solve, goodMoves, sq, moveText };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.PegEngine = API;
// as a Web Worker: { id, board, pegs, target, left, time, good } → { id, ok, path, timeout, good }
if (typeof window === 'undefined' && typeof self !== 'undefined' && typeof importScripts === 'function') {
  self.onmessage = e => {
    const d = e.data, B = BOARDS[d.board], opt = { target: d.target, left: d.left, time: d.time || 8000 };
    const r = solve(B, d.pegs, opt);
    self.postMessage({ id: d.id, ok: r.ok, path: r.path, timeout: r.timeout, nodes: r.nodes });
  };
}
})(typeof self !== 'undefined' ? self : this);

// Shape builders for the tsumego generator (gen-tsumego.mjs). All shapes are built in the TOP-LEFT corner of the board
// (x right, y down; point i = y*n + x) and transformed later. A "shape" is { n, b: Uint8Array (0/1/2), region: [points] }
// with colour 1 = the defender (owner of the target group) and 2 = the attacker, recoloured later.
// Copyright 2026 core-calmdust — Apache License 2.0
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const DIR = path.dirname(new URL(import.meta.url).pathname);
export const R = require(path.join(DIR, '..', 'rules.js'));

// deterministic RNG
export function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], N8 = N4.concat([[1, 1], [1, -1], [-1, 1], [-1, -1]]);

// random polyomino touching the top edge (and often the left edge = corner), inside w x h
function polyomino(rand, size, w, h, corner) {
  const set = new Set(), key = (x, y) => y * 64 + x;
  let x = corner ? 0 : 1 + Math.floor(rand() * (w - 2)), y = 0;
  set.add(key(x, y));
  const pts = [[x, y]];
  let guard = 0;
  while (pts.length < size && guard++ < 500) {
    const [px, py] = pts[Math.floor(rand() * pts.length)];
    const [dx, dy] = N4[Math.floor(rand() * 4)];
    const nx = px + dx, ny = py + dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
    // keep the shape low and wide like real corner eye spaces
    if (ny >= 2 && rand() < 0.6) continue;
    if (set.has(key(nx, ny))) continue;
    set.add(key(nx, ny)); pts.push([nx, ny]);
  }
  return pts;
}

// eye-space-first corner / edge group:
//   P = eye space (empty, maybe with some stones inside), D = defender ring, X = outside liberties, A = attacker wall
export function ldShape(rand, n = 19, opt = {}) {
  const corner = opt.corner !== undefined ? opt.corner : rand() < 0.8;
  const size = opt.size || (3 + Math.floor(rand() * 6));
  const P = polyomino(rand, size, corner ? 6 : 8, 3, corner);
  const b = new Uint8Array(n * n), I = (x, y) => y * n + x, inb = (x, y) => x >= 0 && y >= 0 && x < n && y < n;
  const inP = new Set(P.map(([x, y]) => I(x, y)));
  // defender ring: orthogonal + diagonal neighbours of P
  const D = new Set();
  for (const [x, y] of P) for (const [dx, dy] of N8) { const X = x + dx, Y = y + dy; if (inb(X, Y) && !inP.has(I(X, Y))) { if ((dx && dy) && rand() < 0.25) continue; D.add(I(X, Y)); } }
  // outside liberties: a few points next to D
  const Xs = new Set();
  const dl = [...D];
  const nX = Math.floor(rand() * 4);
  for (let k = 0; k < nX * 3 && Xs.size < nX; k++) {
    const d = dl[Math.floor(rand() * dl.length)], x = d % n, y = Math.floor(d / n);
    const [dx, dy] = N4[Math.floor(rand() * 4)]; const X = x + dx, Y = y + dy;
    if (!inb(X, Y)) continue; const q = I(X, Y);
    if (inP.has(q) || D.has(q)) continue; Xs.add(q);
  }
  // attacker wall: orthogonal neighbours of P ∪ D ∪ X (+ some diagonals so the wall looks connected)
  const A = new Set(), inner = new Set([...inP, ...D, ...Xs]);
  for (const q of inner) { const x = q % n, y = Math.floor(q / n); for (const [dx, dy] of N8) { const X = x + dx, Y = y + dy; if (!inb(X, Y)) continue; const r = I(X, Y); if (inner.has(r)) continue; if (dx && dy && rand() < 0.5) continue; A.add(r); } }
  for (const q of D) b[q] = 1;
  for (const q of A) b[q] = 2;
  // mutations
  const Pl = [...inP], Dl = [...D];
  const muts = opt.muts !== undefined ? opt.muts : Math.floor(rand() * 4);
  for (let k = 0; k < muts; k++) {
    const r = rand();
    if (r < 0.35 && Dl.length) { const q = Dl[Math.floor(rand() * Dl.length)]; b[q] = 0; }              // a gap in the defender's ring
    else if (r < 0.6) { const q = Pl[Math.floor(rand() * Pl.length)]; b[q] = 2; }                        // attacker stone inside
    else if (r < 0.8) { const q = Pl[Math.floor(rand() * Pl.length)]; b[q] = 1; }                        // defender stone inside
    else if (Dl.length) { const q = Dl[Math.floor(rand() * Dl.length)]; b[q] = 2; }                      // attacker stone in the ring (a cut / hane)
  }
  return finish(b, n, inner);
}

// region = empty points reachable from the inner area without crossing stones; must stay inside the box
export function finish(b, n, inner, box = 9) {
  const seen = new Uint8Array(n * n), st = [], region = [];
  for (const q of inner) if (!b[q] && !seen[q]) { seen[q] = 1; st.push(q); }
  const nb = R.nbrs(n);
  while (st.length) {
    const q = st.pop(); region.push(q);
    const x = q % n, y = Math.floor(q / n); if (x >= box || y >= box) return null;
    for (let d = 0; d < 4; d++) { const r = nb[q * 4 + d]; if (r >= 0 && !b[r] && !seen[r]) { seen[r] = 1; st.push(r); } }
  }
  return { n, b, region };
}

// legality: every chain has a liberty
export function legal(b, n) {
  const p = new R.Pos(n); for (let i = 0; i < n * n; i++) if (b[i]) p.put(i, b[i]);
  for (let i = 0; i < n * n; i++) if (b[i] && p.group(i).libs === 0) return false;
  return true;
}

// 8 symmetries; we keep a corner: t in 0..7
export function transform(i, n, t) {
  let x = i % n, y = Math.floor(i / n);
  if (t & 4) [x, y] = [y, x];
  if (t & 1) x = n - 1 - x;
  if (t & 2) y = n - 1 - y;
  return y * n + x;
}
export function viewFor(pts, n, minSz = 7) {
  const xs = pts.map(i => i % n), ys = pts.map(i => Math.floor(i / n));
  let x0 = Math.max(0, Math.min(...xs) - 1), x1 = Math.min(n - 1, Math.max(...xs) + 1), y0 = Math.max(0, Math.min(...ys) - 1), y1 = Math.min(n - 1, Math.max(...ys) + 1);
  // square, at least minSz, anchored to the board edges it touches
  let sz = Math.max(minSz, x1 - x0 + 1, y1 - y0 + 1); sz = Math.min(sz, n);
  const fit = (a0, a1) => { if (a0 === 0) return [0, sz - 1]; if (a1 === n - 1) return [n - sz, n - 1]; let c0 = Math.max(0, Math.min(n - sz, a0 - Math.floor((sz - (a1 - a0 + 1)) / 2))); return [c0, c0 + sz - 1]; };
  const [X0, X1] = fit(x0, x1), [Y0, Y1] = fit(y0, y1);
  return [X0, Y0, X1, Y1];
}

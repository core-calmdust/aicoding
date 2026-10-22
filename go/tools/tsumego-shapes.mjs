// Shape builders + classification helpers for the tsumego generator (gen-tsumego.mjs).
// Shapes are built in the TOP-LEFT corner of the board (x right, y down; point i = y*n + x) and transformed later.
// A raw shape is { n, b: Uint8Array (0 empty / 1 / 2), region: [points], tgt: [points], goal, G (side to move) }.
// Copyright 2026 core-calmdust — Apache License 2.0
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const DIR = path.dirname(new URL(import.meta.url).pathname);
export const R = require(path.join(DIR, '..', 'rules.js'));
export const T = require(path.join(DIR, '..', 'tsumego.js'));
export const PASS = -1;
export const EX = { exact: true };

// deterministic RNG
export function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], N8 = N4.concat([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
const pick = (rand, a) => a[Math.floor(rand() * a.length)];

// random polyomino in w x h touching the top edge, starting at x0 (corner when x0 = 0)
function polyomino(rand, size, w, h, x0) {
  const set = new Set(), key = (x, y) => y * 64 + x, pts = [[x0, 0]];
  set.add(key(x0, 0));
  let guard = 0;
  while (pts.length < size && guard++ < 600) {
    const [px, py] = pick(rand, pts), [dx, dy] = pick(rand, N4);
    const nx = px + dx, ny = py + dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
    if (ny >= 2 && rand() < 0.65) continue;               // keep it low and wide like real corner eye spaces
    if (set.has(key(nx, ny))) continue;
    set.add(key(nx, ny)); pts.push([nx, ny]);
  }
  return pts;
}
// ring of points around a set (orthogonal, plus diagonals with probability pd)
function ring(set, n, rand, pd) {
  const out = new Set();
  for (const q of set) { const x = q % n, y = Math.floor(q / n); for (const [dx, dy] of N8) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= n || Y >= n) continue; const r = Y * n + X; if (set.has(r)) continue; if (dx && dy && rand() >= pd) continue; out.add(r); } }
  return out;
}
function addLibs(D, inner, n, rand, k) {
  const X = new Set(), dl = [...D];
  for (let t = 0; t < k * 4 && X.size < k; t++) {
    const d = pick(rand, dl), x = d % n, y = Math.floor(d / n), [dx, dy] = pick(rand, N4), X2 = x + dx, Y2 = y + dy;
    if (X2 < 0 || Y2 < 0 || X2 >= n || Y2 >= n) continue; const q = Y2 * n + X2;
    if (inner.has(q) || D.has(q)) continue; X.add(q);
  }
  return X;
}

// ---- life & death: eye space P (top-left corner or top edge), defender ring D (colour 1), outside liberties X,
// attacker wall A (colour 2), then a few mutations (gaps, stones inside, hane / cut stones)
export function ldShape(rand, n = 19, opt = {}) {
  const corner = opt.corner !== undefined ? opt.corner : rand() < 0.75;
  const size = opt.size || (3 + Math.floor(rand() * 6));
  const x0 = corner ? 0 : 3 + Math.floor(rand() * 2);
  const Pp = polyomino(rand, size, corner ? 6 : x0 + 6, 3, x0);
  const b = new Uint8Array(n * n), I = (x, y) => y * n + x;
  const inP = new Set(Pp.map(([x, y]) => I(x, y)));
  const D = ring(inP, n, rand, 0.75);
  const X = addLibs(D, inP, n, rand, Math.floor(rand() * 4));
  const inner = new Set([...inP, ...D, ...X]);
  const A = ring(inner, n, rand, 0.5);
  for (const q of D) b[q] = 1;
  for (const q of A) b[q] = 2;
  const Pl = [...inP], Dl = [...D];
  const muts = opt.muts !== undefined ? opt.muts : Math.floor(rand() * 4);
  for (let k = 0; k < muts; k++) {
    const r = rand();
    if (r < 0.3) b[pick(rand, Dl)] = 0;              // a gap in the defender's shape
    else if (r < 0.55) b[pick(rand, Pl)] = 2;        // attacker stone inside
    else if (r < 0.75) b[pick(rand, Pl)] = 1;        // defender stone inside
    else b[pick(rand, Dl)] = 2;                      // attacker stone in the ring (a hane / cut)
  }
  return finish(b, n, inner);
}

// ---- semeai: an inner attacker group G (colour 2) in the corner, a defender chain around it (colour 1, the target),
// outside liberties X, attacker wall A. The race: G's inner group against the ring.
export function semeaiShape(rand, n = 19) {
  const I = (x, y) => y * n + x, b = new Uint8Array(n * n);
  const size = 4 + Math.floor(rand() * 5);
  const Pp = polyomino(rand, size, 6, 3, 0);
  const inP = new Set(Pp.map(([x, y]) => I(x, y)));
  // inner group: most of P are attacker stones, 1-3 empty points stay (its liberties / eye)
  const Pl = [...inP]; const nE = 1 + Math.floor(rand() * 3);
  for (const q of Pl) b[q] = 2;
  for (let k = 0; k < nE; k++) b[pick(rand, Pl)] = 0;
  const D = ring(inP, n, rand, 0.8);
  const X = addLibs(D, inP, n, rand, 1 + Math.floor(rand() * 4));
  const inner = new Set([...inP, ...D, ...X]);
  const A = ring(inner, n, rand, 0.5);
  for (const q of D) b[q] = 1;
  for (const q of A) b[q] = 2;
  const muts = Math.floor(rand() * 3), Dl = [...D];
  for (let k = 0; k < muts; k++) { const r = rand(); if (r < 0.4) b[pick(rand, Dl)] = 0; else if (r < 0.7) b[pick(rand, Pl)] = rand() < 0.5 ? 0 : 1; else b[pick(rand, [...X])] = rand() < 0.5 ? 1 : 2; }
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
  return { n, b, region: region.sort((a, c) => a - c) };
}

// ---- tactical positions (capture / ladder / net / snapback / tesuji) on 9x9 or a 13x13 corner area.
// colour 1 = the target's side (opponent), colour 2 = the player
export function tacShape(rand, n = 9, opt = {}) {
  const b = new Uint8Array(n * n), nb = R.nbrs(n), I = (x, y) => y * n + x;
  const lim = opt.box || n;   // stones placed inside [0, lim)
  const edge = rand() < 0.6;
  const x = Math.floor(rand() * Math.min(lim, n)), y = edge ? Math.floor(rand() * 2) : 1 + Math.floor(rand() * Math.min(lim - 2, 5));
  const ts = [I(Math.min(x, lim - 1), y)];
  const tl = 1 + Math.floor(rand() * 3);
  for (let k = 1; k < tl; k++) { const q = pick(rand, ts), c = pick(rand, [0, 1, 2, 3].map(d => nb[q * 4 + d]).filter(r => r >= 0 && r % n < lim && Math.floor(r / n) < lim && !ts.includes(r))); if (c !== undefined) ts.push(c); }
  for (const q of ts) b[q] = 1;
  const libsOf = () => { const s = new Set(); for (const q of ts) for (let d = 0; d < 4; d++) { const r = nb[q * 4 + d]; if (r >= 0 && !b[r]) s.add(r); } return [...s]; };
  // surround to 2 (sometimes 3) liberties with player stones
  const want = rand() < 0.75 ? 2 : 3;
  let lb = libsOf(), guard = 0;
  while (lb.length > want && guard++ < 20) { b[pick(rand, lb)] = 2; lb = libsOf(); }
  // extra stones near the target
  const near = [];
  for (let yy = 0; yy < Math.min(n, lim); yy++) for (let xx = 0; xx < Math.min(n, lim); xx++) { const q = I(xx, yy); if (b[q]) continue; let d = 99; for (const t of ts) d = Math.min(d, Math.abs(t % n - xx) + Math.abs(Math.floor(t / n) - yy)); if (d <= (opt.spread || 4)) near.push(q); }
  const nG = 1 + Math.floor(rand() * 6), nO = Math.floor(rand() * 5);
  for (let k = 0; k < nG; k++) { const q = pick(rand, near); if (!b[q] && !libsOf().includes(q)) b[q] = 2; }
  for (let k = 0; k < nO; k++) { const q = pick(rand, near); if (!b[q] && !libsOf().includes(q)) b[q] = 1; }
  const region = [];
  if (opt.region === 'all') { for (let q = 0; q < n * n; q++) if (!b[q]) region.push(q); }
  else for (let yy = 0; yy < n; yy++) for (let xx = 0; xx < n; xx++) { const q = I(xx, yy); if (b[q]) continue; let d = 99; for (const t of ts) d = Math.min(d, Math.max(Math.abs(t % n - xx), Math.abs(Math.floor(t / n) - yy))); if (d <= (opt.reach || 4)) region.push(q); }
  return { n, b, region, tgt: ts.slice() };
}

// legality: every chain has a liberty
export function legal(b, n) {
  const p = new R.Pos(n); for (let i = 0; i < n * n; i++) if (b[i]) p.put(i, b[i]);
  for (let i = 0; i < n * n; i++) if (b[i] && p.group(i).libs === 0) return false;
  return true;
}
export function posOf(b, n) { const p = new R.Pos(n); for (let i = 0; i < n * n; i++) if (b[i]) p.put(i, b[i]); return p; }
export function chains(b, n, c) { const p = posOf(b, n), seen = new Set(), out = []; for (let i = 0; i < n * n; i++) if (b[i] === c && !seen.has(i)) { const g = p.group(i); g.stones.forEach(s => seen.add(s)); out.push(g); } return out; }
export const stonesStr = (b, G) => Array.from(b, v => v === 0 ? '.' : (v === 2) === (G === 1) ? 'b' : 'w').join('');   // colour 2 = the player = G

// 8 symmetries: t in 0..7
export function transform(i, n, t) {
  if (i < 0) return i;
  let x = i % n, y = Math.floor(i / n);
  if (t & 4) [x, y] = [y, x];
  if (t & 1) x = n - 1 - x;
  if (t & 2) y = n - 1 - y;
  return y * n + x;
}
export function viewFor(pts, n, minSz = 7) {
  if (n <= 9) return null;
  const xs = pts.map(i => i % n), ys = pts.map(i => Math.floor(i / n));
  const x0 = Math.max(0, Math.min(...xs) - 1), x1 = Math.min(n - 1, Math.max(...xs) + 1), y0 = Math.max(0, Math.min(...ys) - 1), y1 = Math.min(n - 1, Math.max(...ys) + 1);
  let sz = Math.min(n, Math.max(minSz, x1 - x0 + 1, y1 - y0 + 1));
  const fit = (a0, a1) => { if (a0 === 0) return [0, sz - 1]; if (a1 === n - 1) return [n - sz, n - 1]; const c0 = Math.max(0, Math.min(n - sz, a0 - Math.floor((sz - (a1 - a0 + 1)) / 2))); return [c0, c0 + sz - 1]; };
  const [X0, X1] = fit(x0, x1), [Y0, Y1] = fit(y0, y1);
  return [X0, Y0, X1, Y1];
}

// ---- classification with the runtime solver
// P: { s, goal, target, region } with indices. Returns { n, answer, list, line } when exactly one first move reaches the
// goal in the fewest moves (n <= maxN), else null (why in .why)
export function classify(P, maxN) {
  const C = T._ctx(P); C.load([]);
  if (C.R()) return { why: 'reached' };
  const list = T.solve(P, [], maxN, false, EX);
  const win = list.filter(e => e.need > 0);
  if (!win.length) return { why: 'nosol' };
  const mn = Math.min(...win.map(e => e.need)), best = win.filter(e => e.need === mn);
  if (best.length !== 1) return { why: 'multi' };
  return { n: mn, answer: best[0].m, list };
}
// the opponent to move first must be able to defend (the status depends on who moves)
export function unsettled(P, nMax) {
  const C = T._ctx(P); C.load([]);
  if (C.ld) { const B = C.B; return !C.ldWin(C.O); }
  const l = T.solve(P, [PASS], nMax + 2, true, EX);
  return l.some(e => e.need === 0);
}
// main line + checks: no passes before the end, no ko, reached at the end
export function lineOf(P, n) {
  const line = T.mainLine(Object.assign({}, P), n);
  if (!line.length) return null;
  if (line.some(m => m === PASS)) return null;
  let p = R.Pos.from(P.s);
  for (const m of line) { const r = p.tryPlay(m); if (!r) return null; p = r.pos; if (p.ko >= 0) return null; }
  if (!T.reached(P, p, EX)) return null;
  const att = line.filter((_, k) => k % 2 === 0).length;
  if (att !== n) return null;
  return line;
}

// theme of a capture puzzle (goal capture) from its main line:
//   snapback  the key move is a sacrifice the opponent captures, or the player later plays where its stones were
//             captured (snapback / under the stones)
//   ladder    a ladder (every move but the last an atari, 3+ moves) or a net / loose ladder (the key move is not atari)
//   capture   1-2 moves starting with an atari
//   tesuji    anything else (shortage of liberties, throw-ins ...)
export function tacTheme(P) {
  if (P.goal !== 'capture') return P.goal === 'connect' ? 'tesuji' : P.goal;
  let p = R.Pos.from(P.s);
  const steps = [];
  for (let k = 0; k < P.line.length; k++) {
    const m = P.line[k], r = p.tryPlay(m); p = r.pos;
    const t = P.target.find(s => p.b[s]);
    steps.push({ m, att: k % 2 === 0, caps: r.captured, tlibs: t !== undefined ? p.group(t).libs : 0, selfLibs: p.b[m] ? p.group(m).libs : 0 });
  }
  const first = steps[0];
  const sac = first.selfLibs === 1 && steps.length > 1 && steps[1].caps.length > 0;
  let under = false;
  steps.forEach((s, k) => { if (!s.att && s.caps.length) for (let j = k + 1; j < steps.length; j++) if (steps[j].att && s.caps.includes(steps[j].m)) under = true; });
  if (sac || under) return 'snapback';
  const atk = steps.filter(s => s.att);
  if (P.n >= 3 && atk.slice(0, -1).every(s => s.tlibs === 1)) return 'ladder';
  if (P.n >= 2 && first.tlibs >= 2) return 'ladder';
  if (P.n <= 2) return 'capture';
  return 'tesuji';
}

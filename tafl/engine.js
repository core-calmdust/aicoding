// Hnefatafl — rules (for the page) and the AI worker (WebAssembly search from engine.c).
// Works as a Web Worker (postMessage API), as a plain <script> (window.TaflEngine) and as a Node module.
//
// Rule sets: copenhagen (11x11, the main one), brandubh (7x7), tablut (9x9). See engine.c for the rules in full.
// Squares: i = r * N + c, r = 0 the top row; names a1.. with files a, b, … from the left and rank 1 at the bottom.
// Sides: P1 = the attackers (move first), P2 = the defenders (the king's side). Pieces: 1 attacker, 2 defender, 3 king.
// Moves are plain numbers: m = from + 256 * to. Captures follow from the position (pos.capsOf(m)).
// Game end: the king escapes (a corner; any edge in Tablut) / an unbreakable edge fort (Copenhagen) → defenders win;
// the king is captured / every defender is encircled (Copenhagen) → attackers win; a side that cannot move loses;
// the third occurrence of a position → the defenders lose; 200 plies without a capture → draw.
(function () {
'use strict';
const P1 = 1, P2 = 2;
const WIN = 30000, WINT = 29000, DRAW_PLIES = 200;
const VARIANTS = ['copenhagen', 'brandubh', 'tablut'];
const VID = { copenhagen: 0, brandubh: 1, tablut: 2 };
// the start positions ('.' empty, 'a' attacker, 'd' defender, 'k' king), row by row from the top
const START = {
  copenhagen: '...aaaaa........a................a....d....aa...ddd...aaa.ddkdd.aaa...ddd...aa....d....a................a........aaaaa...',
  brandubh: '...a......a......d...aadkdaa...d......a......a...',
  tablut: '...aaa.......a........d....a...d...aaaddkddaaa...d...a....d........a.......aaa...',
};
const RULES = {
  copenhagen: { n: 11, escEdge: false, king4: true, shield: true, fort: true, encircle: true },
  brandubh: { n: 7, escEdge: false, king4: false, shield: false, fort: false, encircle: false },
  tablut: { n: 9, escEdge: true, king4: false, shield: false, fort: false, encircle: false },
};
// per rule set geometry: flags per square (1 edge, 2 corner, 4 throne, 8 escape, 16 restricted)
const GEO = {};
function geo(v) {
  if (GEO[v]) return GEO[v];
  const R = RULES[v] || RULES.copenhagen, n = R.n, F = new Uint8Array(n * n), th = (n >> 1) * n + (n >> 1);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    let f = 0; const i = r * n + c;
    if (r === 0 || c === 0 || r === n - 1 || c === n - 1) f |= 1;
    if (!R.escEdge && (r === 0 || r === n - 1) && (c === 0 || c === n - 1)) f |= 2 | 8 | 16;
    if (R.escEdge && (f & 1)) f |= 8;
    if (i === th) f |= 4 | 16;
    F[i] = f;
  }
  // zobrist (two 32-bit halves) for repetitions
  let zs = 0x2545F491 ^ n;
  const zr = () => { zs ^= zs << 13; zs >>>= 0; zs ^= zs >>> 17; zs ^= zs << 5; zs >>>= 0; return zs; };
  const Z1 = [], Z2 = []; for (let k = 0; k < 4; k++) { Z1.push([]); Z2.push([]); for (let i = 0; i < n * n; i++) { Z1[k].push(zr()); Z2[k].push(zr()); } }
  return (GEO[v] = { v, R, n, F, th, Z1, Z2, ZS1: zr(), ZS2: zr(), corners: [0, n - 1, n * (n - 1), n * n - 1] });
}
const own = (side, x) => side === P2 ? (x === 2 || x === 3) : x === 1;   // side: P1 / P2

class Pos {
  constructor(v) { this.v = VID[v] !== undefined ? v : 'copenhagen'; this.G = geo(this.v); this.n = this.G.n; this.b = new Uint8Array(this.n * this.n); this.turn = P1; this.quiet = 0; this.res = 0; this.why = ''; this.lastCaps = []; this.king = -1; }
  static from(spec, v) {   // spec: { v, b: N*N chars '.adk', side: 1 | 2 } or null (the start position of v)
    const vv = spec && spec.v ? spec.v : v || 'copenhagen', p = new Pos(vv), s = spec && spec.b ? spec.b : START[p.v];
    for (let i = 0; i < p.b.length; i++) { const ch = s[i]; p.b[i] = ch === 'a' ? 1 : ch === 'd' ? 2 : ch === 'k' ? 3 : 0; if (p.b[i] === 3) p.king = i; }
    p.turn = spec && spec.side === P2 ? P2 : P1; p.rehash();
    return p;
  }
  clone() { const q = Object.create(Pos.prototype); q.v = this.v; q.G = this.G; q.n = this.n; q.b = this.b.slice(); q.turn = this.turn; q.quiet = this.quiet; q.res = this.res; q.why = this.why; q.lastCaps = this.lastCaps.slice(); q.king = this.king; q.h1 = this.h1; q.h2 = this.h2; return q; }
  rehash() { let a = 0, c = 0; const G = this.G; for (let i = 0; i < this.b.length; i++) { const x = this.b[i]; if (x) { a ^= G.Z1[x][i]; c ^= G.Z2[x][i]; } } if (this.turn === P2) { a ^= G.ZS1; c ^= G.ZS2; } this.h1 = a >>> 0; this.h2 = c >>> 0; }
  at(i) { return this.b[i]; }
  get side() { return this.turn === P2 ? 1 : 0; }
  count(p) { let k = 0; for (const x of this.b) if (p === P1 ? x === 1 : x === 2) k++; return k; }   // men (the king not counted)
  rc(i) { return [Math.floor(i / this.n), i % this.n]; }
  // all moves of the side to move
  moves() {
    const n = this.n, F = this.G.F, b = this.b, out = [], side = this.turn;
    if (this.res) return out;
    for (let s = 0; s < b.length; s++) {
      const x = b[s]; if (!own(side, x)) continue;
      const r = Math.floor(s / n), c = s % n, king = x === 3;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        let rr = r + dr, cc = c + dc;
        while (rr >= 0 && cc >= 0 && rr < n && cc < n) {
          const t = rr * n + cc; if (b[t]) break;
          if ((F[t] & 16) && !king) { if (F[t] & 4) { rr += dr; cc += dc; continue; } break; }
          out.push(s + 256 * t); rr += dr; cc += dc;
        }
      }
    }
    return out;
  }
  movesFrom(s) { return this.moves().filter(m => m % 256 === s); }
  // hostile to a man of side vs: an enemy piece, a corner, the empty throne
  hostile(i, vs) { const x = this.b[i]; if (own(vs === P1 ? P2 : P1, x)) return true; return x === 0 && !!(this.G.F[i] & 6); }
  inB(r, c) { return r >= 0 && c >= 0 && r < this.n && c < this.n; }
  kingCaptured(k, from) {
    const n = this.n, F = this.G.F, th = this.G.th, [r, c] = this.rc(k), b = this.b;
    const nb = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
    const hostile4 = () => nb.every(([rr, cc]) => this.inB(rr, cc) && (b[rr * n + cc] === 1 || rr * n + cc === th));
    if (this.G.R.king4) { if (F[k] & 1) return false; return hostile4(); }
    const adjT = nb.some(([rr, cc]) => this.inB(rr, cc) && rr * n + cc === th);
    if (k === th || adjT) return hostile4();
    const [fr, fc] = this.rc(from), rr = 2 * r - fr, cc = 2 * c - fc;
    if (!this.inB(rr, cc)) return false;
    const x = b[rr * n + cc]; return x === 1 || (x === 0 && !!(F[rr * n + cc] & 2));
  }
  play(m) {
    const n = this.n, F = this.G.F, G = this.G, b = this.b, f = m % 256, t = Math.floor(m / 256), x = b[f], side = this.turn, vs = side === P1 ? P2 : P1;
    let h1 = this.h1 ^ G.Z1[x][f] ^ G.Z1[x][t] ^ G.ZS1, h2 = this.h2 ^ G.Z2[x][f] ^ G.Z2[x][t] ^ G.ZS2;
    b[f] = 0; b[t] = x; this.lastCaps = []; this.res = 0; this.why = '';
    const rem = i => { const y = b[i]; h1 ^= G.Z1[y][i]; h2 ^= G.Z2[y][i]; b[i] = 0; this.lastCaps.push(i); };
    if (x === 3) { this.king = t; if (F[t] & 8) { this.res = P2; this.why = 'escape'; } }
    let kingHit = -1;
    if (!this.res) {
      const [r, c] = this.rc(t);
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const r1 = r + dr, c1 = c + dc, r2 = r + 2 * dr, c2 = c + 2 * dc; if (!this.inB(r1, c1)) continue;
        const i1 = r1 * n + c1, y = b[i1];
        if (y === 3) { if (side === P1) kingHit = i1; continue; }
        if (!own(vs, y) || !this.inB(r2, c2)) continue;
        if (this.hostile(r2 * n + c2, vs)) rem(i1);
      }
      if (G.R.shield && (F[t] & 1)) this.shieldwall(t, rem);
      if (side === P1) {
        if (kingHit >= 0 && this.kingCaptured(kingHit, t)) { this.res = P1; this.why = 'capture'; }
        else if (G.R.encircle && this.encircled()) { this.res = P1; this.why = 'encircle'; }
      } else if (G.R.fort && (F[this.king] & 1) && this.fort()) { this.res = P2; this.why = 'fort'; }
    }
    this.turn = vs; this.h1 = h1 >>> 0; this.h2 = h2 >>> 0;
    this.quiet = this.lastCaps.length ? 0 : this.quiet + 1;
    return this;
  }
  shieldwall(t, rem) {
    const n = this.n, b = this.b, F = this.G.F, side = this.turn, vs = side === P1 ? P2 : P1, [r, c] = this.rc(t);
    const inner = r === 0 ? [1, 0] : r === n - 1 ? [-1, 0] : c === 0 ? [0, 1] : c === n - 1 ? [0, -1] : null; if (!inner) return;
    const alongs = inner[0] ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
    for (const [ar, ac] of alongs) {
      let rr = r + ar, cc = c + ac; const row = [];
      let broken = false;
      while (this.inB(rr, cc) && (F[rr * n + cc] & 1) && own(vs, b[rr * n + cc])) {
        const ir = rr + inner[0], ic = cc + inner[1];
        if (!own(side, b[ir * n + ic])) { broken = true; break; }
        row.push(rr * n + cc); rr += ar; cc += ac;
      }
      if (broken || row.length < 2 || !this.inB(rr, cc)) continue;
      const e = rr * n + cc, ex = b[e];
      if (!(own(side, ex) || (ex === 0 && (F[e] & 2)))) continue;
      for (const q of row) if (b[q] !== 3) rem(q);
    }
  }
  nb(i) { const n = this.n, r = Math.floor(i / n), c = i % n, o = []; if (r > 0) o.push(i - n); if (c < n - 1) o.push(i + 1); if (r < n - 1) o.push(i + n); if (c > 0) o.push(i - 1); return o; }
  encircled() {
    const b = this.b, F = this.G.F, seen = new Uint8Array(b.length), st = [];
    let na = 0; for (const x of b) if (x === 1) na++; if (na < 4) return false;
    for (let i = 0; i < b.length; i++) if (b[i] === 2 || b[i] === 3) { if (F[i] & 1) return false; seen[i] = 1; st.push(i); }
    while (st.length) { const s = st.pop(); for (const q of this.nb(s)) { if (seen[q] || b[q] === 1) continue; if (F[q] & 1) return false; seen[q] = 1; st.push(q); } }
    return true;
  }
  fort() {   // the same (conservative) test as engine.c fortCheck
    const b = this.b, F = this.G.F, n = this.n, k = this.king, inn = new Uint8Array(b.length), st = [k], walls = [];
    inn[k] = 1; let canMove = false;
    while (st.length) {
      const s = st.pop();
      for (const q of this.nb(s)) {
        if (inn[q]) continue; const x = b[q];
        if (x === 1) return false;
        if (x === 2) { inn[q] = 2; walls.push(q); continue; }
        if (x === 0) { if (F[q] & 16) return false; if (s === k) canMove = true; inn[q] = 1; st.push(q); }
      }
    }
    if (!canMove) return false;
    const safe = (r, c) => !this.inB(r, c) || (inn[r * n + c] && !(F[r * n + c] & 16));
    for (const w of walls) {
      const [r, c] = this.rc(w);
      if (!safe(r - 1, c) && !safe(r + 1, c)) return false;
      if (!safe(r, c - 1) && !safe(r, c + 1)) return false;
      if (F[w] & 1) {   // shieldwall: the square in front belongs to the fort, or the row along the edge can not be bracketed
        const [ir, ic] = r === 0 ? [1, 0] : r === n - 1 ? [-1, 0] : c === 0 ? [0, 1] : [0, -1], [ar, ac] = ir ? [0, 1] : [1, 0];
        let ok = !!inn[(r + ir) * n + c + ic];
        for (const sg of [-1, 1]) {
          if (ok) break;
          let rr = r + sg * ar, cc = c + sg * ac;
          while (this.inB(rr, cc) && (F[rr * n + cc] & 1) && (b[rr * n + cc] === 2 || b[rr * n + cc] === 3)) { if (b[rr * n + cc] === 3) { ok = true; break; } rr += sg * ar; cc += sg * ac; }
          if (!ok && this.inB(rr, cc) && b[rr * n + cc] === 0 && inn[rr * n + cc] === 1) ok = true;
        }
        if (!ok) return false;
      }
    }
    return true;
  }
  // escape lines: the escape squares the king can reach with one move (for marks and lessons)
  kingLines() {
    const n = this.n, F = this.G.F, b = this.b, k = this.king, out = []; if (k < 0) return out;
    const [r, c] = this.rc(k);
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      if (!this.G.R.escEdge) { if (dc && !(r === 0 || r === n - 1)) continue; if (dr && !(c === 0 || c === n - 1)) continue; }
      let rr = r + dr, cc = c + dc;
      while (this.inB(rr, cc) && !b[rr * n + cc]) { if (F[rr * n + cc] & 8) { out.push(rr * n + cc); break; } rr += dr; cc += dc; }
    }
    return out;
  }
  capsOf(m) { return this.clone().play(m).lastCaps; }
  status() { return this.res ? (this.res === this.turn ? 1 : -1) : this.moves().length ? 0 : -1; }
  spec() { let s = ''; for (const x of this.b) s += '.adk'[x]; return { v: this.v, b: s, side: this.turn }; }
}
const sqName = (i, n) => String.fromCharCode(97 + (i % n)) + (n - Math.floor(i / n));
function sqParse(s, n) { const m = /^([a-k])(\d{1,2})$/.exec(String(s).trim().toLowerCase()); if (!m) return -1; const c = m[1].charCodeAt(0) - 97, r = n - +m[2]; return r >= 0 && r < n && c < n ? r * n + c : -1; }
const mFrom = m => m % 256, mTo = m => Math.floor(m / 256);
// notation: "e1-e4", a king move "Kf6-f9", captures "xe5" (one or more)
function name(pos, m) {
  const n = pos.n, f = mFrom(m), t = mTo(m), caps = pos.capsOf(m);
  return (pos.b[f] === 3 ? 'K' : '') + sqName(f, n) + '-' + sqName(t, n) + caps.map(i => 'x' + sqName(i, n)).join('');
}
function parse(pos, s) {
  const x = /^k?([a-k]\d{1,2})[-–]?([a-k]\d{1,2})/i.exec(String(s).trim()); if (!x) return null;
  const f = sqParse(x[1], pos.n), t = sqParse(x[2], pos.n); if (f < 0 || t < 0) return null;
  const m = f + 256 * t; return pos.moves().includes(m) ? m : null;
}
function replay(start, moves, v) {
  const pos = Pos.from(start, v), hashes = [pos.h1 + ':' + pos.h2];
  for (const m of moves || []) { pos.play(m); hashes.push(pos.h1 + ':' + pos.h2); }
  return { pos, hashes };
}
// game status: { over, winner (1 attackers / 2 defenders / 0 draw), why: escape | fort | capture | encircle | block | rep | long }
function judge(pos, hashes) {
  if (pos.res) return { over: true, winner: pos.res, why: pos.why };
  if (!pos.moves().length) return { over: true, winner: pos.turn === P1 ? P2 : P1, why: 'block' };
  const h = pos.h1 + ':' + pos.h2; let c = 0; for (const x of hashes || []) if (x === h) c++;
  if (c >= 3) return { over: true, winner: P1, why: 'rep' };
  if (pos.quiet >= DRAW_PLIES) return { over: true, winner: 0, draw: true, why: 'long' };
  return { over: false };
}

// ---------------------------------------------------------------- AI levels (20 steps: 15級 … 1級, 初段 … 五段) — see engine.c think()
const LEVELS = 20;

// ---------------------------------------------------------------- tiny JS search (fallback when WebAssembly is not available)
function jsEval(p) {
  const s = p.turn === P2 ? 1 : -1;
  let v = 190 * p.count(P2) - 100 * p.count(P1);
  const k = p.king; if (k >= 0) { const [r, c] = p.rc(k), n = p.n; v -= 25 * (Math.min(r, n - 1 - r) + Math.min(c, n - 1 - c)); }
  return v * s;
}
function jsSearch(p, d, a, b, ply, tEnd) {
  if (p.res) return -(WIN - ply);
  const L = p.moves(); if (!L.length) return -(WIN - ply);
  if (d <= 0 || Date.now() > tEnd) return jsEval(p);
  let best = -Infinity;
  for (const m of L) { const v = -jsSearch(p.clone().play(m), d - 1, -b, -a, ply + 1, tEnd); if (v > best) { best = v; if (v > a) { a = v; if (a >= b) break; } } }
  return best;
}
function jsValues(p, depth, ms) { const tEnd = Date.now() + (ms || 1500); return p.moves().map(m => ({ m, v: -jsSearch(p.clone().play(m), depth - 1, -Infinity, Infinity, 1, tEnd) })).sort((a, b) => b.v - a.v); }

// ---------------------------------------------------------------- WebAssembly side
let WX = null;
const wIO = () => new Int32Array(WX.memory.buffer, WX.io_ptr(), 8192);
function wSetup(start, moves, v) {
  const p = Pos.from(start, v), a = [VID[p.v], p.turn === P2 ? 1 : 0];
  for (let i = 0; i < p.b.length; i++) a.push(p.b[i]);
  a.push(moves.length); for (const m of moves) a.push(mFrom(m) | (mTo(m) << 8));
  wIO().set(a); return WX.setup();
}
const wMove = x => (x & 255) + 256 * ((x >> 8) & 255);
function wList() { const r = wIO(), L = []; for (let i = 0; i < r[0]; i++) L.push({ m: wMove(r[2 + 2 * i]), v: r[3 + 2 * i] }); return L; }
const kindOf = v => Math.abs(v) > WINT ? 'exact' : 'heur';

function think(start, moves, level, v, seed) {
  const { pos } = replay(start, moves, v);
  const all = pos.moves();
  if (!all.length) return { move: -1 };
  if (all.length === 1) return { move: all[0] };
  if (!WX) {
    const vals = jsValues(pos, level < 8 ? 1 : 2, 1500), noise = Math.max(0, 200 - level * 12);
    let best = vals[0].m, bv = -Infinity; for (const e of vals) { const x = e.v + (Math.random() - 0.5) * 2 * noise; if (x > bv) { bv = x; best = e.m; } } return { move: best };
  }
  if (!wSetup(start, moves, v)) return { move: -1 };
  WX.think(level, seed === undefined ? (Math.random() * 2147483647) | 0 : seed);
  const r = wIO();
  if (r[0] < 0) return { move: all[0] };
  return { move: wMove(r[0]), v: r[2], depth: r[3] };
}
function analyze(start, moves, ms, onProgress, v) {
  const { pos } = replay(start, moves, v);
  if (!WX) { const L = jsValues(pos, 2, ms).map(e => ({ ...e, kind: kindOf(e.v) })); return { list: L, depth: 2 }; }
  if (!wSetup(start, moves, v)) return { list: [], depth: 0 };
  progressCb = onProgress ? (d => onProgress(wList().map(e => ({ ...e, kind: kindOf(e.v) })), d)) : null;
  WX.analyze(ms, 40); progressCb = null;
  return { list: wList().map(e => ({ ...e, kind: kindOf(e.v) })), depth: wIO()[1] };
}
// review box (PC): the best k candidate moves with values, each with a line of up to `plies` further moves
// (each move of the line is the engine's choice after a short search; the transposition table of the analysis helps)
function cands(start, moves, ms, k, plies, onProgress, v) {
  const r = analyze(start, moves, ms, onProgress, v);
  const list = r.list.slice().sort((a, b) => b.v - a.v).slice(0, k || 5);
  for (const e of list) {
    e.pv = [];
    if (!WX) continue;
    const line = moves.concat([e.m]);
    for (let d = 0; d < (plies || 7); d++) {
      const { pos, hashes } = replay(start, line, v);
      if (judge(pos, hashes).over) break;
      if (!wSetup(start, line, v)) break;
      WX.best(99, 30, 0);
      const io = wIO(); if (io[0] < 0) break;
      const m = wMove(io[0]);
      if (!pos.moves().includes(m)) break;
      line.push(m); e.pv.push(m);
    }
  }
  return { list, depth: r.depth };
}
// puzzles: the side to move (defend = 0) or its opponent (defend = 1) wins within n own moves. See engine.c puzzle().
function puzzle(start, moves, n, defend, v) {
  if (!WX) return null;
  if (!wSetup(start, moves, v)) return null;
  WX.puzzle(n, defend ? 1 : 0, 4000);
  const r = wIO(), out = [];
  for (let i = 0; i < r[0]; i++) out.push({ m: wMove(r[1 + 2 * i]), need: r[2 + 2 * i] });
  return out;
}
let progressCb = null;

const API = { P1, P2, WIN, WINT, DRAW_PLIES, VARIANTS, VID, START, RULES, geo, Pos, sqName, sqParse, mFrom, mTo, name, parse, replay, judge, LEVELS, think, analyze, cands, puzzle, kindOf };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof window !== 'undefined') window.TaflEngine = API;
else if (typeof self !== 'undefined' && typeof importScripts === 'function') {
  const V = 'v=20261025a';
  let readyP = null;
  if (typeof WebAssembly === 'object' && typeof fetch === 'function') {
    const imp = { env: { now: () => Date.now(), progress: d => { if (progressCb) progressCb(d); } } };
    const url = new URL('engine.wasm?' + V, self.location.href);
    readyP = (WebAssembly.instantiateStreaming ? WebAssembly.instantiateStreaming(fetch(url), imp) : fetch(url).then(r => r.arrayBuffer()).then(b => WebAssembly.instantiate(b, imp)))
      .then(r => { WX = r.instance.exports; }).catch(() => { WX = null; });
  }
  let queue = Promise.resolve();
  self.onmessage = e => {
    const m = e.data;
    queue = queue.then(() => readyP).catch(() => {}).then(() => {
      try {
        if (m.type === 'think') self.postMessage({ id: m.id, type: 'result', ...think(m.start, m.moves, m.level, m.v, m.seed) });
        else if (m.type === 'analyze') {
          const r = analyze(m.start, m.moves, m.time || 1000, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth }), m.v);
          self.postMessage({ id: m.id, type: 'result', ...r });
        } else if (m.type === 'cands') self.postMessage({ id: m.id, type: 'result', ...cands(m.start, m.moves, m.time || 1200, m.k, m.plies, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth }), m.v) });
        else if (m.type === 'puzzle') self.postMessage({ id: m.id, type: 'result', list: puzzle(m.start, m.moves, m.n, m.defend, m.v) });
        else if (m.type === 'newgame') { if (WX) WX.new_game(); self.postMessage({ id: m.id, type: 'result' }); }
      } catch (err) { self.postMessage({ id: m.id, type: 'result', error: String(err && err.stack || err) }); }
    });
  };
}
})();

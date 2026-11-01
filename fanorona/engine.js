// Fanorona (9x5) — rules (for the page) and the AI worker (WebAssembly search from engine.c).
// Works as a Web Worker (postMessage API), as a plain <script> (window.FanoronaEngine) and as a Node module.
//
// Board: 45 points, index i = r * 9 + c; r = 0..4 is row 1..5 (row 1 at White's side, the bottom), c = 0..8 is a..i.
// A point is strong (has diagonals) when r + c is even. White (P1) moves first.
// Moves are strings in the usual notation: a paika (non-capturing step) "d3-e3"; a capture "d3-e3A" (approach) or
// "f3-e3W" (withdrawal); a continued capture lists every landing point: "d3-e3A-e4W-f5A".
// Draws: threefold repetition and 80 plies without a capture (also used by online play).
(function () {
'use strict';
const P1 = 1, P2 = 2;
const WIN = 30000, WINT = 29000, DRAW_PLIES = 80, NP = 45;
const COLS = 'abcdefghi';
// ---------------------------------------------------------------- geometry (rule variants share the index i = r * 9 + c;
// a smaller board uses the points with r < GH, c < GW): 'sivy' 9x5 (Fanoron-Tsivy), 'dimy' 5x5 (Fanoron-Dimy, the same
// rules with 12 pieces each), 'telo' 3x3 (Fanoron-Telo: 3 pieces each are placed, then moved one step along a line; three
// in a row wins — no captures)
const DR = [0, 1, 1, 1, 0, -1, -1, -1], DC = [1, 1, 0, -1, -1, -1, 0, 1];
const NB = []; for (let d = 0; d < 8; d++) NB.push(new Int8Array(NP));
const RC = []; for (let i = 0; i < NP; i++) RC.push([(i / 9) | 0, i % 9]);
// 'alq' = Alquerque (5x5, 12 each): a step forward or sideways along a line, or a jump over an adjacent enemy to the empty
// point beyond (any direction); capturing is compulsory and a capturing piece must go on jumping while it can
const RULES = { sivy: { w: 9, h: 5, pcs: 22 }, dimy: { w: 5, h: 5, pcs: 12 }, telo: { w: 3, h: 3, pcs: 3, place: true }, alq: { w: 5, h: 5, pcs: 12, jump: true } };
let RULE = 'sivy', GW = 9, GH = 5, TELO = false, ALQ = false;
const strong = i => ((((i / 9) | 0) + (i % 9)) & 1) === 0;
const valid = i => i >= 0 && i < NP && ((i / 9) | 0) < GH && i % 9 < GW;
const START = new Int8Array(NP);
const LINES3 = [];   // Telo: the 8 lines of three
function setRule(r) {
  if (!RULES[r]) r = 'sivy';
  const R = RULES[r]; RULE = r; GW = R.w; GH = R.h; TELO = !!R.place; ALQ = !!R.jump;
  for (let i = 0; i < NP; i++) {
    const r0 = (i / 9) | 0, c = i % 9;
    for (let d = 0; d < 8; d++) {
      const nr = r0 + DR[d], nc = c + DC[d];
      NB[d][i] = !valid(i) || ((d & 1) && !strong(i)) || nr < 0 || nr >= GH || nc < 0 || nc >= GW ? -1 : nr * 9 + nc;
    }
  }
  START.fill(0);
  if (r === 'sivy') { for (let i = 0; i < 18; i++) START[i] = P1; for (let i = 27; i < 45; i++) START[i] = P2; [P2, P1, P2, P1, 0, P2, P1, P2, P1].forEach((v, c) => { START[18 + c] = v; }); }
  else if (r === 'alq') { for (let rr = 0; rr < 5; rr++) for (let c = 0; c < 5; c++) START[rr * 9 + c] = rr < 2 ? P1 : rr > 2 ? P2 : [P2, P2, 0, P1, P1][c]; }
  else if (r === 'dimy') { for (let rr = 0; rr < 5; rr++) for (let c = 0; c < 5; c++) START[rr * 9 + c] = rr < 2 ? P1 : rr > 2 ? P2 : [P2, P1, 0, P2, P1][c]; }
  LINES3.length = 0;
  if (TELO) { for (let k = 0; k < 3; k++) { LINES3.push([k * 9, k * 9 + 1, k * 9 + 2]); LINES3.push([k, 9 + k, 18 + k]); } LINES3.push([0, 10, 20]); LINES3.push([2, 10, 18]); }
  return r;
}
setRule('sivy');
const rule = () => RULE, dims = () => ({ w: GW, h: GH, telo: TELO, alq: ALQ, pcs: RULES[RULE].pcs });
// Alquerque: the directions a side may step in without capturing (forward and sideways; White moves up the board)
const alqDir = (side, d) => side ? DR[d] <= 0 : DR[d] >= 0;
const ptAt = (r, c) => r < 0 || r >= GH || c < 0 || c >= GW ? -1 : r * 9 + c;
const pname = i => COLS[i % 9] + (((i / 9) | 0) + 1);
const pparse = s => { const m = /^([a-i])([1-5])$/.exec(String(s || '').trim()); if (!m) return -1; const i = (m[2] - 1) * 9 + COLS.indexOf(m[1]); return valid(i) ? i : -1; };
const dirOf = (a, b) => { if (a < 0) return -1; for (let d = 0; d < 8; d++) if (NB[d][a] === b) return d; return -1; };
// Telo: does p have three in a row
const line3 = (b, p) => LINES3.some(L => b[L[0]] === p && b[L[1]] === p && b[L[2]] === p);

class Pos {
  constructor() { this.b = Int8Array.from(START); this.side = 0; this.quiet = 0; }
  static from(spec) {   // spec: { b: 45 chars '.' 'w' 'b' (index order: a1..i1, a2..i2, ...), side: 1 | 2 } or null
    const p = new Pos();
    if (spec && spec.b) { for (let i = 0; i < NP; i++) { const ch = spec.b[i]; p.b[i] = ch === 'w' ? P1 : ch === 'b' ? P2 : 0; } p.side = spec.side === P2 ? 1 : 0; p.quiet = 0; }
    return p;
  }
  clone() { const q = Object.create(Pos.prototype); q.b = Int8Array.from(this.b); q.side = this.side; q.quiet = this.quiet; return q; }
  at(i) { return this.b[i]; }
  get turn() { return this.side ? P2 : P1; }
  count(p) { let n = 0; for (let i = 0; i < NP; i++) if (this.b[i] === p) n++; return n; }
  key() { let s = ''; for (let i = 0; i < NP; i++) s += '.wb'[this.b[i]]; return s + this.side; }
  spec() { let s = ''; for (let i = 0; i < NP; i++) s += '.wb'[this.b[i]]; return { b: s, side: this.side ? P2 : P1 }; }
  // enemies removed by a step from `from` in direction d with kind 'A' / 'W' (b = board, me = mover)
  static line(b, from, d, kind, me) {
    const opp = me === P1 ? P2 : P1, out = [];
    let s, dd;
    if (kind === 'A') { const t = NB[d][from]; if (t < 0) return out; s = NB[d][t]; dd = d; } else { s = NB[d ^ 4][from]; dd = d ^ 4; }
    while (s >= 0 && b[s] === opp) { out.push(s); s = NB[dd][s]; }
    return out;
  }
  // capture steps from point `cur` (st = null at the start of a turn: any own piece; otherwise the chain state
  // { cur, last, visited: Set, b: board after the steps so far })
  capSteps(st) {
    const me = this.turn, out = [];
    if (TELO) return out;
    if (ALQ) {   // jumps: over an adjacent enemy to the empty point just beyond (the jumped piece goes at once)
      const b = st ? st.b : this.b, opp = me === P1 ? P2 : P1;
      const pts = st ? [st.cur] : [...Array(NP).keys()].filter(i => b[i] === me);
      for (const f of pts) for (let d = 0; d < 8; d++) { const m = NB[d][f]; if (m < 0 || b[m] !== opp) continue; const t = NB[d][m]; if (t < 0 || b[t]) continue; out.push({ from: f, to: t, d, kind: 'J', cap: [m] }); }
      return out;
    }
    const b = st ? st.b : this.b;
    const pts = st ? [st.cur] : [...Array(NP).keys()].filter(i => b[i] === me);
    for (const f of pts) for (let d = 0; d < 8; d++) {
      if (st && d === st.last) continue;
      const t = NB[d][f]; if (t < 0 || b[t] || (st && st.visited.has(t))) continue;
      for (const k of ['A', 'W']) { const cap = Pos.line(b, f, d, k, me); if (cap.length) out.push({ from: f, to: t, d, kind: k, cap }); }
    }
    return out;
  }
  paikaSteps() {
    const me = this.turn, out = [];
    if (TELO && this.count(me) < 3) { for (let t = 0; t < NP; t++) if (valid(t) && !this.b[t]) out.push({ from: -1, to: t, d: -1, kind: '', cap: [] }); return out; }
    for (let f = 0; f < NP; f++) if (this.b[f] === me) for (let d = 0; d < 8; d++) { const t = NB[d][f]; if (t >= 0 && !this.b[t] && (!ALQ || alqDir(this.side, d))) out.push({ from: f, to: t, d, kind: '', cap: [] }); }
    return out;
  }
  hasCaps() { return this.capSteps(null).length > 0; }
  // the first steps of a turn the player can make now
  firstSteps() { const c = this.capSteps(null); return c.length ? c : this.paikaSteps(); }
  // chain state after a capture step (st = previous state or null)
  static after(pos, st, step) {
    const b = Int8Array.from(st ? st.b : pos.b);
    b[step.to] = b[step.from]; b[step.from] = 0; for (const c of step.cap) b[c] = 0;
    const visited = new Set(st ? st.visited : [step.from]); visited.add(step.to);
    return { cur: step.to, last: step.d, visited, b, steps: (st ? st.steps : []).concat([step]) };
  }
  // every full turn as notation (one representative per resulting position unless all = true)
  moves(all) {
    const first = this.capSteps(null);
    if (!first.length) return this.paikaSteps().map(s => s.from < 0 ? pname(s.to) : pname(s.from) + '-' + pname(s.to));
    const out = [], seen = new Set();
    const rec = (st) => {
      const s = st.steps, last = s[s.length - 1];
      const capAll = []; for (const x of s) capAll.push(...x.cap);
      const sig = s[0].from + ':' + last.to + ':' + capAll.sort((a, c) => a - c).join(',');
      const str = pname(s[0].from) + s.map(x => '-' + pname(x.to) + x.kind).join('');
      const more = s.length < 13 ? this.capSteps(st) : [];
      if (ALQ && more.length) { for (const nx of more) rec(Pos.after(this, st, nx)); return; }   // Alquerque: the chain must go on
      if (all || !seen.has(sig)) { seen.add(sig); out.push(str); }
      for (const nx of more) rec(Pos.after(this, st, nx));
    };
    for (const s of first) rec(Pos.after(this, null, s));
    return out;
  }
  status() {
    if (TELO) { if (line3(this.b, this.turn === P1 ? P2 : P1)) return -1; if (this.count(this.turn) < 3) return 0; }
    if (ALQ) return this.firstSteps().length ? 0 : -1;
    for (let f = 0; f < NP; f++) if (this.b[f] === this.turn) for (let d = 0; d < 8; d++) { const t = NB[d][f]; if (t >= 0 && !this.b[t]) return 0; } return -1; }
  // decode a move string into steps (validated); null if illegal
  steps(m) {
    const parts = String(m).split('-');
    if (TELO && parts.length === 1) { const t = pparse(parts[0]); if (t < 0 || this.b[t] || this.count(this.turn) >= 3 || this.status() === -1) return null; return [{ from: -1, to: t, d: -1, kind: '', cap: [] }]; }
    if (parts.length < 2) return null;
    if (TELO && this.count(this.turn) < 3) return null;
    const f = pparse(parts[0]); if (f < 0 || this.b[f] !== this.turn) return null;
    const hasCap = this.hasCaps();
    if (parts.length === 2 && !/[AWJ]$/.test(parts[1])) {
      if (hasCap) return null;
      const t = pparse(parts[1]), d = dirOf(f, t); if (t < 0 || d < 0 || this.b[t] || (ALQ && !alqDir(this.side, d))) return null;
      return [{ from: f, to: t, d, kind: '', cap: [] }];
    }
    let st = null, cur = f; const out = [];
    for (let i = 1; i < parts.length; i++) {
      const mm = /^([a-i][1-5])([AWJ])$/.exec(parts[i]); if (!mm) return null;
      const t = pparse(mm[1]);
      const cand = this.capSteps(st).find(x => x.from === cur && x.to === t && x.kind === mm[2]);
      if (!cand) return null;
      out.push(cand); st = Pos.after(this, st, cand); cur = t;
    }
    if (ALQ && st && this.capSteps(st).length) return null;   // an Alquerque capture chain must be complete
    return out;
  }
  play(m) {
    const S = typeof m === 'string' ? this.steps(m) : m;
    if (!S) throw new Error('illegal move ' + m);
    const me = this.turn; let caps = 0;
    for (const s of S) { if (s.from >= 0) this.b[s.from] = 0; this.b[s.to] = me; for (const c of s.cap) { this.b[c] = 0; caps++; } }
    this.side ^= 1; this.quiet = caps ? 0 : this.quiet + 1;
    return this;
  }
}
const mFrom = m => /-/.test(String(m)) ? pparse(String(m).split('-')[0]) : -1;
const mTo = m => { const p = String(m).split('-'); return pparse(p[p.length - 1].replace(/[AWJ]$/, '')); };
const isCap = m => /[AWJ]$/.test(String(m));
// the points visited by the moving piece (for animation)
const path = (pos, m) => String(m).split('-').map(x => pparse(x.replace(/[AWJ]$/, '')));
// captured points per step: [[...], [...]] (empty arrays for a paika)
function capsOf(pos, m) { const S = pos.steps(m); return S ? S.map(s => s.cap.slice()) : []; }
// shown name: Alquerque jumps as b2×b4×d4 (the record keeps b2-b4J-d4J)
const name = (pos, m) => /J$/.test(String(m)) ? String(m).replace(/J/g, '').split('-').join('×') : String(m);
// same resulting position
function same(pos, a, b) { if (a === b) return true; try { return pos.clone().play(a).key() === pos.clone().play(b).key(); } catch (e) { return false; } }
function parse(pos, s) {
  s = String(s).trim();
  if (ALQ && /[x×:]/.test(s)) s = s.split(/[x×:]/).map((p, i) => i ? p.replace(/J?$/, 'J') : p).join('-');
  s = s.replace(/[x×:]/g, '-').replace(/a$/, 'A').replace(/w$/, 'W'); const S = pos.steps(s); return S ? s : null;
}
function replay(start, moves) {
  const pos = Pos.from(start), hashes = [pos.key()];
  for (const m of moves || []) { pos.play(m); hashes.push(pos.key()); }
  return { pos, hashes };
}
// { over, winner (1/2/0), why: 'none' (no pieces) | 'block' (no moves) | 'rep' | 'quiet' }
function judge(pos, hashes) {
  if (pos.status() === -1) return { over: true, winner: pos.side ? P1 : P2, why: TELO && line3(pos.b, pos.side ? P1 : P2) ? 'line' : pos.count(pos.turn) ? 'block' : 'none' };
  if (pos.quiet >= DRAW_PLIES) return { over: true, winner: 0, draw: true, why: 'quiet' };
  const h = pos.key(); let c = 0; for (const x of hashes) if (x === h) c++;
  if (c >= 3) return { over: true, winner: 0, draw: true, why: 'rep' };
  return { over: false };
}
// wire encoding for the engine: (lo, hi) — see engine.c
function toWire(pos, m) {
  const S = pos.steps(m); if (!S) return null;
  const paika = S.length === 1 && !S[0].kind ? 1 : 0;
  let lo = S[0].from | (S.length << 6) | (paika << 10), hi = 0;
  S.forEach((s, i) => { const v = s.d | ((s.kind === 'W' || s.kind === 'J' ? 1 : 0) << 3); if (i < 5) lo |= v << (11 + 4 * i); else hi |= v << (4 * (i - 5)); });
  return [lo | 0, hi | 0];
}
function fromWire(lo, hi) {
  lo >>>= 0; hi >>>= 0;
  const f = lo & 63, n = (lo >> 6) & 15, paika = (lo >> 10) & 1;
  let cur = f, s = pname(f);
  for (let i = 0; i < n; i++) {
    const v = i < 5 ? (lo >>> (11 + 4 * i)) & 15 : (hi >>> (4 * (i - 5))) & 15, d = v & 7;
    if (ALQ && !paika) { cur = NB[d][NB[d][cur]]; s += '-' + pname(cur) + 'J'; continue; }
    cur = NB[d][cur]; s += '-' + pname(cur) + (paika ? '' : (v >> 3) ? 'W' : 'A');
  }
  return s;
}

// ---------------------------------------------------------------- AI levels (20 steps: 15級 … 1級, 初段 … 五段)
const LEVELS = [null,
  { d: 1, noise: 300, blunder: 0.35 , hand: 1 },   // 15級
  { d: 1, noise: 220, blunder: 0.26 , hand: 1 },   // 14級
  { d: 2, noise: 170, blunder: 0.2 , hand: 1 },    // 13級
  { d: 2, noise: 130, blunder: 0.15 , hand: 1 },   // 12級
  { d: 3, noise: 100, blunder: 0.11 , hand: 1 },   // 11級
  { d: 3, noise: 75, blunder: 0.08 , hand: 1 },    // 10級
  { d: 4, noise: 55, blunder: 0.05 , hand: 1 },    // 9級
  { d: 4, noise: 40, blunder: 0.03 , hand: 1 },    // 8級
  { d: 5, noise: 28, blunder: 0.015 , hand: 1 },   // 7級
  { d: 5, noise: 18 , hand: 1 },                   // 6級
  { d: 6, noise: 10 , hand: 1 },                   // 5級
  { s: 1, d: 99, nk: 4 },                // 4級
  { s: 1, d: 99, nk: 10 },               // 3級
  { s: 1, d: 99, nk: 25 },               // 2級
  { s: 1, d: 99, nk: 60 },               // 1級
  { s: 1, d: 99, nk: 150, ms: 3000 },    // 初段
  { s: 1, d: 99, nk: 400, ms: 3000 },    // 二段
  { s: 1, d: 99, nk: 1000, ms: 3000 },   // 三段
  { s: 1, d: 99, ms: 1200, book: 1 },    // 四段
  { s: 1, d: 99, ms: 3000, book: 1 },    // 五段
];
function gauss(rand) { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// ---------------------------------------------------------------- tiny JS search (fallback when WebAssembly is not available)
function jsEval(p) { const me = p.turn, op = me === P1 ? P2 : P1; return 100 * (p.count(me) - p.count(op)); }
function jsSearch(p, d, a, b, ply, tEnd) {
  const L = p.moves();
  if (!L.length) return -(WIN - ply);
  if ((d <= 0 && !isCap(L[0])) || d < -3 || Date.now() > tEnd) return jsEval(p);
  let best = -Infinity;
  for (const m of L) { const v = -jsSearch(p.clone().play(m), d - 1, -b, -a, ply + 1, tEnd); if (v > best) { best = v; if (v > a) { a = v; if (a >= b) break; } } }
  return best;
}
function jsValues(p, depth, ms) { const tEnd = Date.now() + (ms || 2000); return p.moves().map(m => ({ m, v: -jsSearch(p.clone().play(m), depth - 1, -Infinity, Infinity, 1, tEnd) })).sort((a, b) => b.v - a.v); }


// ---------------------------------------------------------------- Fanoron-Telo: solved completely (retrograde analysis over
// every placement of up to 3 + 3 pieces, both sides to move); value WIN - d = win in d plies, 0 = draw
let TS = null;
const TK = [0, 1, 2, 9, 10, 11, 18, 19, 20];   // the 9 points
function teloIdx(b, side) { let x = 0; for (let k = 8; k >= 0; k--) x = x * 3 + b[TK[k]]; return x * 2 + side; }
function teloSolve() {
  if (TS) return TS;
  const save = RULE; setRule('telo');
  const N = 19683 * 2, res = new Int8Array(N), dist = new Int16Array(N), kids = new Array(N);
  const b = new Int8Array(NP);
  for (let st = 0; st < N; st++) {
    let x = st >> 1; const side = st & 1; b.fill(0);
    let nw = 0, nb = 0;
    for (let k = 0; k < 9; k++) { const v = x % 3; x = (x / 3) | 0; b[TK[k]] = v; if (v === 1) nw++; else if (v === 2) nb++; }
    if (nw > 3 || nb > 3) { kids[st] = null; continue; }
    const p = Object.create(Pos.prototype); p.b = Int8Array.from(b); p.side = side; p.quiet = 0;
    if (p.status() === -1) { res[st] = -1; dist[st] = 0; kids[st] = []; continue; }
    kids[st] = p.moves().map(m => teloIdx(p.clone().play(m).b, side ^ 1));
  }
  for (let pass = 1, ch = true; ch; pass++) {
    ch = false; const snap = Int8Array.from(res);
    for (let st = 0; st < N; st++) {
      const K = kids[st]; if (!K || res[st]) continue;
      let lossD = 1e9, allWin = true, winMax = 0;
      for (const c of K) { if (snap[c] === -1) lossD = Math.min(lossD, dist[c]); if (snap[c] !== 1) allWin = false; else winMax = Math.max(winMax, dist[c]); }
      if (lossD < 1e9) { res[st] = 1; dist[st] = lossD + 1; ch = true; } else if (allWin && K.length) { res[st] = -1; dist[st] = winMax + 1; ch = true; }
    }
  }
  setRule(save);
  TS = { res, dist };
  return TS;
}
// value of the position for the side to move
function teloVal(pos) { const T = teloSolve(), i = teloIdx(pos.b, pos.side); return T.res[i] === 1 ? WIN - T.dist[i] : T.res[i] === -1 ? -(WIN - T.dist[i]) : 0; }
function teloList(pos) { return pos.moves().map(m => { const c = teloVal(pos.clone().play(m)); return { m, v: c > WINT ? -c + 1 : c < -WINT ? -c - 1 : 0, kind: 'exact' }; }).sort((a, b) => b.v - a.v); }
function teloThink(pos, level, rand) {
  const L = teloList(pos);
  const pr = Math.max(0, 0.6 - 0.04 * (level - 1));   // 15級: often a random move … 1級 and above: perfect
  if (rand() < pr) return { move: L[Math.floor(rand() * L.length)].m, v: L[0].v };
  const top = L.filter(e => e.v === L[0].v);
  return { move: top[Math.floor(rand() * top.length)].m, v: L[0].v };
}

// ---------------------------------------------------------------- WebAssembly side
let WX = null;
const wIO = () => new Int32Array(WX.memory.buffer, WX.io_ptr(), 8192);
function wSetup(start, moves) {
  const p = Pos.from(start);
  let w0 = 0, w1 = 0, b0 = 0, b1 = 0;
  for (let i = 0; i < NP; i++) { const v = p.b[i]; if (!v) continue; if (i < 32) { if (v === P1) w0 |= 1 << i; else b0 |= 1 << i; } else { if (v === P1) w1 |= 1 << (i - 32); else b1 |= 1 << (i - 32); } }
  if (WX.set_rule) WX.set_rule(GW, GH);
  if (WX.set_alq) WX.set_alq(ALQ ? 1 : 0);
  const a = [w0, w1, b0, b1, p.side, moves.length];
  for (const m of moves) { const w = toWire(p, m); if (!w) return 0; a.push(w[0], w[1]); p.play(m); }
  wIO().set(a); return WX.setup();
}
function wList() { const r = wIO(), L = []; for (let i = 0; i < r[0]; i++) L.push({ m: fromWire(r[2 + 3 * i], r[3 + 3 * i]), v: r[4 + 3 * i] }); return L; }
const kindOf = v => Math.abs(v) > WINT ? 'exact' : 'heur';

function think(start, moves, level, rand) {
  rand = rand || Math.random;
  const L = LEVELS[level] || LEVELS[10];
  const { pos } = replay(start, moves);
  const all = pos.moves();
  if (!all.length) return { move: null };
  if (all.length === 1) return { move: all[0] };
  if (TELO) return teloThink(pos, level, rand);
  if (!WX) {
    const vals = jsValues(pos, Math.min(L.d || 4, 4), 1500);
    if (L.blunder && rand() < L.blunder) return { move: vals[Math.floor(rand() * vals.length)].m };
    let best = vals[0].m, bv = -Infinity; for (const e of vals) { const x = e.v + gauss(rand) * (L.noise || 0); if (x > bv) { bv = x; best = e.m; } } return { move: best };
  }
  if (!wSetup(start, moves)) return { move: all[0] };
  if (!L.s) {
    WX.values(L.d, L.hand ? 1 : 0);
    const vals = wList();
    if (L.blunder && rand() < L.blunder) {
      const ok = vals.filter(e => e.v > vals[0].v - 450); const pool = ok.length > 1 ? ok : vals;
      return { move: pool[Math.floor(rand() * pool.length)].m, v: vals[0].v };
    }
    let best = vals[0].m, bv = -Infinity;
    for (const e of vals) { const x = e.v + (Math.abs(e.v) > WINT ? 0 : gauss(rand) * L.noise); if (x > bv) { bv = x; best = e.m; } }
    return { move: best, v: vals[0].v };
  }
  if (L.s && L.d >= 99 && level >= 15 && BOOK && !start && RULE === 'sivy') {   // the opening book (deep analysis of the first moves)
    const bk = BOOK[pos.key()];
    if (bk && bk.length) { const m = bk[Math.floor(rand() * bk.length)]; if (all.includes(m)) return { move: m, book: true }; }
  }
  WX.best(L.d || 99, L.ms || 0, L.nk || 0);
  const r = wIO();
  if (r[0] < 0) return { move: all[0] };
  return { move: fromWire(r[0], r[1]), v: r[2], depth: r[3] };
}
function analyze(start, moves, ms, onProgress) {
  const { pos } = replay(start, moves);
  if (TELO) return { list: teloList(pos), depth: 9 };
  if (!WX) { const L = jsValues(pos, 3, ms).map(e => ({ ...e, kind: kindOf(e.v) })); return { list: L, depth: 3 }; }
  if (!wSetup(start, moves)) return { list: [], depth: 0 };
  progressCb = onProgress ? (d => onProgress(wList().map(e => ({ ...e, kind: kindOf(e.v) })), d)) : null;
  WX.analyze(ms, 60); progressCb = null;
  return { list: wList().map(e => ({ ...e, kind: kindOf(e.v) })), depth: wIO()[1] };
}
function cands(start, moves, ms, k, plies, onProgress) {
  const r = analyze(start, moves, ms, onProgress);
  const list = r.list.slice().sort((a, b) => b.v - a.v).slice(0, k || 5);
  for (const e of list) {
    e.pv = [];
    if (TELO) { let p = replay(start, moves).pos.clone().play(e.m); for (let d = 0; d < (plies || 7) && p.status() !== -1; d++) { const b = teloList(p)[0]; if (!b) break; e.pv.push(b.m); p = p.clone().play(b.m); } continue; }
    if (!WX) continue;
    const line = moves.concat([e.m]);
    for (let d = 0; d < (plies || 7); d++) {
      const { pos, hashes } = replay(start, line);
      if (judge(pos, hashes).over) break;
      if (!wSetup(start, line)) break;
      WX.best(99, 30, 0);
      const io = wIO(); if (io[0] < 0) break;
      const m = fromWire(io[0], io[1]);
      if (!pos.steps(m)) break;
      line.push(m); e.pv.push(m);
    }
  }
  return { list, depth: r.depth };
}
function puzzle(start, moves, n, defend, goal, base) {
  if (!WX || TELO) return null;
  if (!wSetup(start, moves)) return null;
  WX.puzzle(n, defend ? 1 : 0, goal || 0, base || 0, 3000);
  const r = wIO(), out = [];
  for (let i = 0; i < r[0]; i++) out.push({ m: fromWire(r[1 + 3 * i], r[2 + 3 * i]), need: r[3 + 3 * i] });
  return out;
}
let progressCb = null;
function attachWasm(X) { WX = X; }
// endgame databases (egdb.bin: "FEG1", count, then per table a, b, 0, 0, length, bytes) copied above the wasm heap base
// learned evaluation ("FNN1", scale, float32 weights; see engine.c netEval)
function loadNet(X, b) {
  const dv = new DataView(b); if (dv.getUint32(0, true) !== 0x314E4E46) return false;
  const sc = dv.getFloat32(4, true), n = (b.byteLength - 8) / 4;
  new Float32Array(X.memory.buffer, X.net_ptr(), n).set(new Float32Array(b, 8, n)); X.net_set(sc); return true;
}
// opening book: { "<position key>": [moves...] } (tools/gen_book.js), used by the top levels
let BOOK = null;
function setBook(b) { BOOK = b; }
// (also the Alquerque tables alqeg.bin: "AEG1", same layout, tools/alqegdb.c); each file goes above the previous one
let egTop = 0;
function loadEG(X, b) {
  const dv = new DataView(b), mg = dv.getUint32(0, true), alq = mg === 0x31474541;
  if (mg !== 0x31474546 && !alq) return false;
  if (alq && !X.aeg_add) return false;
  const n = dv.getUint32(4, true), base = (egTop || X.heap_base()), cur = X.memory.buffer.byteLength;
  if (base + b.byteLength + 65536 > cur) X.memory.grow(Math.ceil((base + b.byteLength + 65536 - cur) / 65536));
  new Uint8Array(X.memory.buffer, base, b.byteLength).set(new Uint8Array(b));
  egTop = base + b.byteLength + 16;
  let o = 8;
  for (let i = 0; i < n; i++) { const a = dv.getUint8(o), bb = dv.getUint8(o + 1), len = dv.getUint32(o + 4, true); (alq ? X.aeg_add : X.eg_add)(a, bb, base + o + 8); o += 8 + len; }
  return true;
}

const API = { P1, P2, WIN, WINT, DRAW_PLIES, NP, NB, RC, DR, DC, COLS, START, RULES, setRule, rule, dims, valid, line3, LINES3, teloVal, strong, ptAt, pname, pparse, dirOf, mFrom, mTo, isCap, Pos, path, capsOf, name, same, parse, replay, judge, toWire, fromWire, loadEG, loadNet, setBook, LEVELS, think, analyze, cands, puzzle, kindOf, attachWasm };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof window !== 'undefined') window.FanoronaEngine = API;
else if (typeof self !== 'undefined' && typeof importScripts === 'function') {
  const V = 'v=20261101g', GAMEQ = new URLSearchParams(self.location.search).get('g');
  let readyP = null;
  if (typeof WebAssembly === 'object' && typeof fetch === 'function') {
    const imp = { env: { now: () => Date.now(), progress: d => { if (progressCb) progressCb(d); } } };
    const url = new URL('engine.wasm?' + V, self.location.href);
    readyP = (WebAssembly.instantiateStreaming ? WebAssembly.instantiateStreaming(fetch(url), imp) : fetch(url).then(r => r.arrayBuffer()).then(b => WebAssembly.instantiate(b, imp)))
      .then(async r => {
        const X = r.instance.exports;
        const gunzip = async u => { const res = await fetch(new URL(u + '?' + V, self.location.href)); if (!res.ok || typeof DecompressionStream !== 'function') return null; return new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(); };
        if (GAMEQ === 'alq') {   // the Alquerque page (engine.js?…&g=alq): only its endgame tables
          try { const b = await gunzip('alqeg.bin.gz'); if (b) loadEG(X, b); } catch (e) {}
        } else {
          try { const b = await gunzip('evalnet.bin.gz'); if (b) loadNet(X, b); } catch (e) {}
          try { const b = await fetch(new URL('book.json?' + V, self.location.href)); if (b.ok) BOOK = await b.json(); } catch (e) {}
          try {
            const res = await fetch(new URL('egdb.bin.gz?' + V, self.location.href));
            if (res.ok && typeof DecompressionStream === 'function') loadEG(X, await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
          } catch (e) {}
        }
        WX = X;
      }).catch(() => { WX = null; });
  }
  let queue = Promise.resolve();
  self.onmessage = e => {
    const m = e.data;
    queue = queue.then(() => readyP).catch(() => {}).then(() => {
      try {
        setRule(m.rule || 'sivy');
        if (m.type === 'think') self.postMessage({ id: m.id, type: 'result', ...think(m.start, m.moves, m.level) });
        else if (m.type === 'analyze') {
          const r = analyze(m.start, m.moves, m.time || 1000, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth }));
          self.postMessage({ id: m.id, type: 'result', ...r });
        } else if (m.type === 'cands') self.postMessage({ id: m.id, type: 'result', ...cands(m.start, m.moves, m.time || 1200, m.k, m.plies, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth })) });
        else if (m.type === 'puzzle') self.postMessage({ id: m.id, type: 'result', list: puzzle(m.start, m.moves, m.n, m.defend, m.goal, m.base) });
        else if (m.type === 'newgame') { if (WX) WX.new_game(); self.postMessage({ id: m.id, type: 'result' }); }
      } catch (err) { self.postMessage({ id: m.id, type: 'result', error: String(err && err.stack || err) }); }
    });
  };
}
})();

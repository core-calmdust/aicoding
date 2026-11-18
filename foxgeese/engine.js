// Fox and Geese — rules (for the page) and the AI worker (plain JS search).
// Works as a Web Worker (postMessage API), as a plain <script> (window.FoxEngine) and as a Node module.
//
// Board: the 33 points of the cross-shaped board, kept in a 7×7 grid: index = r * 7 + c, r = 0 the top row (7), c = 0 file a.
// Rows 0-1 and 5-6 have the three middle points only. Lines join every point to its orthogonal neighbours; the points
// with (r + c) even also have diagonals (the Alquerque pattern, so the centre has eight lines).
// P1 = the Fox (one piece, starts in the middle, moves first by default), P2 = the Geese (they start on the near side).
// Who moves first at the starting position is a setting (setFirst: the fox by default, or the geese); a position spec
// (lessons, puzzles) always carries its own side to move.
// Rule sets, in the order of every list (claude/foxgeese-spec.md has the sources):
//   g15  — the default: 15 geese (the 13 + the two end points of the middle row, a4 and g4); they move one step along
//          any line forward, sideways or diagonally forward — never backwards, never diagonally backwards
//   g17  — 17 geese (the two outer points of the middle row on each side as well): they move one step straight forward
//          or sideways only — never backwards, never diagonally
//   g13  — the traditional game: 13 geese, they move one step along any line (backwards too)
//   g13n — this program's variant: the 13 geese of g13 with the movement of g15 (no step backwards)
// The fox moves one step along any line, or jumps over an adjacent goose onto the empty point straight beyond it and
// takes it; it may go on jumping in the same move, and it may stop. Capturing is never compulsory.
// The geese win when the fox cannot move. The fox wins when five geese or fewer are left, or when the geese cannot move.
// Moves: the list of points visited, packed in base 64 — m = Σ (point + 1) · 64^i (a step: two points; a jump over
// k geese: k + 1 points). mFrom / mTo / path unpack it.
(function () {
'use strict';
const P1 = 1, P2 = 2;                 // P1 = Fox, P2 = Geese
const WIN = 30000, WINT = 29000;
const N = 7, NN = 49;
const RULES = {
  g15: { geese: 15, back: false, diag: true },
  g17: { geese: 17, back: false, diag: false },
  g13: { geese: 13, back: true, diag: true },
  g13n: { geese: 13, back: false, diag: true },
};
const RULE_ORDER = ['g15', 'g17', 'g13', 'g13n'];
const DEFAULT_RULE = 'g15';
const FOX_WINS_AT = 5;                // geese left: they can no longer shut the fox in
const QUIET_OPTS = [30, 40, 50], DEFAULT_QUIET = 40;   // the quiet-move limit, in moves each: a game setting (2026-11-19 user: 既定40、30/40/50から選べる)
let QUIET_MAX = +((typeof process !== 'undefined' && process.env && process.env.FG_QUIET) || DEFAULT_QUIET * 2);   // plies without a capture after which the fox wins: the geese have failed to shut it in (this program's own rule; 2026-11-19: 30 moves each was too short — measured with tools/match.js, see claude/foxgeese-spec.md)
let QS0 = 20;                         // the evaluation's clock term starts at 10 moves each and grows to the limit (2026-11-19: measured better than starting 20 moves each before the limit)
const REP_MAX = 3;                    // the same position (same side to move) for the third time: the fox wins — the geese are making no progress (this program's own rule)
const MAX_JUMPS = 7;
let R = RULES[DEFAULT_RULE], RK = DEFAULT_RULE;
let FIRST = 0;                        // the side to move at the starting position: 0 the fox (the default), 1 the geese
const ON = new Uint8Array(NN), RC = [];
const NBR = [];                       // NBR[i] = [[neighbour, beyond (or -1), dr, dc], …] along the lines
for (let i = 0; i < NN; i++) { const r = Math.floor(i / 7), c = i % 7; RC.push([r, c]); ON[i] = (r >= 2 && r <= 4) || (c >= 2 && c <= 4) ? 1 : 0; }
const POINTS = []; for (let i = 0; i < NN; i++) if (ON[i]) POINTS.push(i);
for (let i = 0; i < NN; i++) {
  const out = []; NBR.push(out); if (!ON[i]) continue;
  const [r, c] = RC[i], dg = (r + c) % 2 === 0;
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    if (dr && dc && !dg) continue;
    const r1 = r + dr, c1 = c + dc; if (r1 < 0 || r1 > 6 || c1 < 0 || c1 > 6 || !ON[r1 * 7 + c1]) continue;
    const r2 = r1 + dr, c2 = c1 + dc, b = r2 >= 0 && r2 <= 6 && c2 >= 0 && c2 <= 6 && ON[r2 * 7 + c2] ? r2 * 7 + c2 : -1;
    out.push([r1 * 7 + c1, b, dr, dc]);
  }
}
function setRule(k) { RK = RULES[k] ? k : DEFAULT_RULE; R = RULES[RK]; setGooseTable(); }
function setFirst(p) { FIRST = p === P2 ? 1 : 0; }
function setQuiet(n) {                 // moves each (30 / 40 / 50); anything else: the default
  const q = (QUIET_OPTS.includes(+n) ? +n : DEFAULT_QUIET) * 2; if (q === QUIET_MAX) return;
  QUIET_MAX = q; ttClear(); ECRULE = '';   // (stored values and evaluations depend on the limit)
}
// ---------------------------------------------------------------- zobrist
let seed = 0x2b7e1516;
function rnd() { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed; }
const Z1 = [new Uint32Array(NN), new Uint32Array(NN)], Z2 = [new Uint32Array(NN), new Uint32Array(NN)];
for (let k = 0; k < 2; k++) for (let i = 0; i < NN; i++) { Z1[k][i] = rnd(); Z2[k][i] = rnd(); }
const ZS1 = rnd(), ZS2 = rnd();
// the quiet-move count (plies without a capture) goes into the transposition table's key, not into the position's hash (which the
// repetition rule compares): the same placement with a different count is a different position — the fox wins at QUIET_MAX
// (2026-11-18: before, the table mixed them up)
const ZQ1 = new Uint32Array(256), ZQ2 = new Uint32Array(256); for (let i = 0; i < 256; i++) { ZQ1[i] = rnd(); ZQ2[i] = rnd(); }
// ---------------------------------------------------------------- squares and moves
const sqAt = (r, c) => r * 7 + c;
const sqName = i => 'abcdefg'[i % 7] + (7 - Math.floor(i / 7));
const pack = pts => { let m = 0, k = 1; for (const p of pts) { m += (p + 1) * k; k *= 64; } return m; };
const path = m => { const out = []; while (m > 0) { out.push(m % 64 - 1); m = Math.floor(m / 64); } return out; };
const mFrom = m => m % 64 - 1;
const mTo = m => { let t = -1; while (m > 0) { t = m % 64 - 1; m = Math.floor(m / 64); } return t; };
const mv = (f, t) => pack([f, t]);
// the geese a fox move jumps over (empty for a step)
function jumped(m) {
  const p = path(m), out = [];
  for (let k = 1; k < p.length; k++) { const a = p[k - 1], b = p[k], ra = RC[a], rb = RC[b]; if (Math.abs(ra[0] - rb[0]) === 2 || Math.abs(ra[1] - rb[1]) === 2) out.push((ra[0] + rb[0]) / 2 * 7 + (ra[1] + rb[1]) / 2); }
  return out;
}
const START = { g15: [], g17: [], g13: [], g13n: [] };
for (let i = 0; i < NN; i++) if (ON[i] && RC[i][0] >= 4) for (const k in START) START[k].push(i);   // the near arm and the row above it (13)
START.g15.push(21, 27);               // + a4 g4 (the two end points of the middle row)
START.g17.push(21, 22, 26, 27);       // + a4 b4 f4 g4

class Pos {
  constructor() { this.sq = new Int8Array(NN); this.fox = 24; this.side = 0; this.ply = 0; this.quiet = 0; this.cap = 0; this.reset(); }
  reset() { this.sq.fill(0); for (const i of START[RK]) this.sq[i] = P2; this.fox = 24; this.sq[24] = P1; this.side = FIRST; this.ply = 0; this.quiet = 0; this.cap = 0; this.rehash(); }
  // spec: { b: 49 chars ('.' empty, 'f' the fox, 'g' a goose; anything on the 16 unused squares is ignored), side: 1 | 2,
  //         cap: geese taken so far, n: plies played, q: plies without a capture } or null (the start)
  static from(spec) {
    const p = new Pos();
    if (spec && spec.b) {
      p.sq.fill(0); p.fox = -1;
      for (let i = 0; i < NN; i++) { if (!ON[i]) continue; const ch = spec.b[i]; if (ch === 'f') { p.sq[i] = P1; p.fox = i; } else if (ch === 'g') p.sq[i] = P2; }
      p.side = spec.side === P2 ? 1 : 0; p.cap = spec.cap | 0; p.ply = spec.n | 0; p.quiet = spec.q | 0;
      p.rehash();
    }
    return p;
  }
  clone() { const q = Object.create(Pos.prototype); q.sq = this.sq.slice(); q.fox = this.fox; q.side = this.side; q.ply = this.ply; q.quiet = this.quiet; q.cap = this.cap; q.h1 = this.h1; q.h2 = this.h2; q.ng = this.ng; return q; }
  rehash() {
    let a = 0, c = 0, g = 0;
    for (let i = 0; i < NN; i++) { const x = this.sq[i]; if (x) { a ^= Z1[x - 1][i]; c ^= Z2[x - 1][i]; if (x === P2 && ON[i]) g++; } }
    this.ng = g;
    if (this.side) { a ^= ZS1; c ^= ZS2; }
    this.h1 = a >>> 0; this.h2 = c >>> 0;
  }
  // the page's piece kinds: 0 empty, 1 = the fox (P1), 3 = a goose (P2)
  at(i) { const x = this.sq[i]; return x === 1 ? 1 : x === 2 ? 3 : 0; }
  owner(i) { return this.sq[i]; }
  get turn() { return this.side ? P2 : P1; }
  get geese() { return this.ng; }   // (kept by rehash / play — 2026-11-18 speed-up)
  count(p) { return p === P1 ? (this.fox >= 0 ? 1 : 0) : this.geese; }
  // the fox's moves: steps, and every way of jumping (each stop of each line of jumps is a move)
  foxMoves(out) {
    const sq = this.sq, f = this.fox; if (f < 0) return out;
    for (let k = NB0[f], e = NB0[f + 1]; k < e; k++) { const n = NBA[k]; if (!sq[n]) out.push((f + 1) + (n + 1) * 64); }
    _jpts[0] = f; jumpRec(sq, f, f, 1, (f + 1), 64, out);
    return out;
  }
  // how many empty points the fox can step to / how many single jumps it has
  foxRoom() { let n = 0; for (const [x] of NBR[this.fox]) if (!this.sq[x]) n++; return n; }
  foxJumps() { let n = 0; for (const [x, b] of NBR[this.fox]) if (b >= 0 && this.sq[x] === P2 && !this.sq[b]) n++; return n; }
  gooseMoves(out) {   // (GM: the steps the rule allows — forward is up the board, the geese start on the near side)
    const sq = this.sq;
    for (let k = 0; k < 33; k++) {
      const i = POINTS[k]; if (sq[i] !== P2) continue;
      for (let j = GM0[i], e = GM0[i + 1]; j < e; j++) { const n = GMA[j]; if (!sq[n]) out.push((i + 1) + (n + 1) * 64); }
    }
    return out;
  }
  moves() { return this.side ? this.gooseMoves([]) : this.foxMoves([]); }
  canMove() {   // (fast: stops at the first move)
    const sq = this.sq;
    if (!this.side) { const f = this.fox; for (let k = NB0[f], e = NB0[f + 1]; k < e; k++) if (!sq[NBA[k]]) return true; for (let o = JP0[f], e = JP0[f + 1]; o < e; o++) if (sq[JPO[o]] === P2 && !sq[JPL[o]]) return true; return false; }
    for (let k = 0; k < 33; k++) { const i = POINTS[k]; if (sq[i] !== P2) continue; for (let j = GM0[i], e = GM0[i + 1]; j < e; j++) if (!sq[GMA[j]]) return true; }
    return false;
  }
  play(m) {
    const p = path(m), f = p[0], t = p[p.length - 1], x = this.sq[f];
    let took = 0;
    if (x === P1) for (const g of jumped(m)) { this.sq[g] = 0; this.h1 ^= Z1[1][g]; this.h2 ^= Z2[1][g]; took++; }
    this.sq[f] = 0; this.sq[t] = x; if (x === P1) this.fox = t;
    this.h1 ^= Z1[x - 1][f] ^ Z1[x - 1][t] ^ ZS1; this.h2 ^= Z2[x - 1][f] ^ Z2[x - 1][t] ^ ZS2;
    this.h1 >>>= 0; this.h2 >>>= 0;
    this.cap += took; this.ng -= took; this.quiet = took ? 0 : this.quiet + 1;
    this.side ^= 1; this.ply++;
    return this;
  }
  // (the page's shared code, written for games with a placing phase / blocked counters: none here)
  get placing() { return false; }
  get opening() { return false; }
  removable() { return []; }
  blocked() { return false; }
  free(p) { return this.count(p); }
  spec() { let s = ''; for (let i = 0; i < NN; i++) s += '.fg'[this.sq[i]]; return { b: s, side: this.side ? P2 : P1, cap: this.cap, n: this.ply, q: this.quiet }; }
}
// the fox's lines of jumps (every stop is a move): typed tables, no allocation. m = packed points so far, mul = 64^len
const _jpts = new Int8Array(MAX_JUMPS + 2), _gone = new Uint8Array(NN);
function jumpRec(sq, f, at, len, m, mul, out) {
  if (len > MAX_JUMPS) return;
  for (let o = JP0[at], e = JP0[at + 1]; o < e; o++) {
    const n = JPO[o], b = JPL[o];
    if (sq[n] !== P2 || _gone[n] || (sq[b] && b !== f)) continue;
    const m2 = m + (b + 1) * mul;
    _gone[n] = 1; out.push(m2); jumpRec(sq, f, b, len + 1, m2, mul * 64, out); _gone[n] = 0;
  }
}
// what move m does on pos: { from, to, path, takes: [points] }
function effect(pos, m) { const p = path(m), fox = pos.sq[p[0]] === P1, takes = fox ? jumped(m) : []; return { place: false, rm: -1, from: p[0], to: p[p.length - 1], path: p, leap: takes.length > 0, takes, blocks: [], frees: [], fox }; }
const captured = (pos, m) => effect(pos, m).takes;
// notation: a step "d4-d5", a jump "d4xd6", two jumps "d4xd6xb6"
function name(pos, m) {
  if (m < 0) return '—';
  const p = path(m), j = pos.sq[p[0]] === P1 && jumped(m).length > 0;
  return p.map(sqName).join(j ? 'x' : '-');
}
function parse(pos, s) { for (const m of pos.moves()) if (name(pos, m) === s) return m; return -1; }
function replay(start, moves) {
  const pos = Pos.from(start), hashes = [pos.h1];
  for (const m of moves) { pos.play(m); hashes.push(pos.h1); }
  return { pos, hashes };
}
// {over, winner, why}: 'few' (five geese or fewer) | 'trap' (the fox cannot move) | 'stuck' (the geese cannot move) |
// 'quiet' (QUIET_MAX plies without a capture) | 'rep' (the position for the third time; needs the game's hashes from replay())
// There is no draw: the geese have to shut the fox in, and a game that goes nowhere is the fox's.
function judge(pos, hashes) {
  if (pos.geese <= FOX_WINS_AT) return { over: true, winner: P1, why: 'few' };
  if (!pos.side) { if (!pos.foxMoves([]).length) return { over: true, winner: P2, why: 'trap' }; }
  else if (!pos.gooseMoves([]).length) return { over: true, winner: P1, why: 'stuck' };
  if (pos.quiet >= QUIET_MAX) return { over: true, winner: P1, why: 'quiet' };
  if (hashes && hashes.length > 4) { const h = hashes[hashes.length - 1]; let n = 0; for (let i = hashes.length - 1; i >= 0; i -= 2) if (hashes[i] === h && ++n >= REP_MAX) return { over: true, winner: P1, why: 'rep' }; }
  return { over: false };
}
// ---------------------------------------------------------------- AI levels (20 steps: Lv.1 … Lv.20)
const LEVELS = [null,
  { d: 1, noise: 90 }, { d: 1, noise: 55 }, { d: 2, noise: 70 }, { d: 2, noise: 45 }, { d: 2, noise: 25 },
  { d: 3, noise: 30 }, { d: 3, noise: 15 }, { d: 4, noise: 18 }, { d: 4, noise: 8 }, { d: 5, noise: 6 },
  // (2026-11-18: the search became ~2× faster — the node budgets doubled, the same thinking time)
  { s: 1, nk: 8 }, { s: 1, nk: 16 }, { s: 1, nk: 30 }, { s: 1, nk: 60 }, { s: 1, nk: 120 },
  { s: 1, nk: 220 }, { s: 1, nk: 400 }, { s: 1, nk: 700 },
  { s: 1, ms: 1500 }, { s: 1, ms: 3000 },
];
function gauss(rand) { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
// ---------------------------------------------------------------- evaluation (the side to move's view; 100 = one goose)
// The fox: geese taken, room to move, geese it can jump at once, geese standing without cover (a jump after one move).
// The geese: how far up the board they have come and how tightly they stand (a goose with a friend straight behind
// it on every line cannot be jumped).
const EW = { goose: 100, room: 6, jump: 26, loose: 4, adv: 5, area: 9 };
// each rule's centring constant: the start position (the fox to move) comes out near 0 — measured with the terms below
const EV0 = { g15: 1400, g17: 1640, g13: 1210, g13n: 1210 };
// the empty points the fox can walk to (steps only): the pen the geese are closing
const _seen = new Uint8Array(NN), _stack = new Int16Array(NN);
function foxArea(pos) {
  const sq = pos.sq; _seen.fill(0); let n = 0, top = 0; _stack[top++] = pos.fox; _seen[pos.fox] = 1;
  while (top) { const a = _stack[--top]; for (const [x] of NBR[a]) if (!sq[x] && !_seen[x]) { _seen[x] = 1; n++; _stack[top++] = x; } }
  return n;
}
// flat tables for the fast evaluation: NB (the neighbours of each point), OP (the lines through a point: take-off / landing),
// GM (the points a goose may step to under the current rule; set by setRule)
const ROW = new Int8Array(NN); for (let i = 0; i < NN; i++) ROW[i] = RC[i][0];
const NB0 = new Int16Array(NN + 1), NBF = [], OP0 = new Int16Array(NN + 1), OPT = [], OPL = [];
for (let i = 0; i < NN; i++) {
  NB0[i] = NBF.length; OP0[i] = OPT.length;
  for (const [x, , dr, dc] of NBR[i]) { NBF.push(x); const o = NBR[i].find(e => e[2] === -dr && e[3] === -dc); if (o) { OPT.push(x); OPL.push(o[0]); } }
}
NB0[NN] = NBF.length; OP0[NN] = OPT.length;
const NBA = Int8Array.from(NBF), OPTA = Int8Array.from(OPT), OPLA = Int8Array.from(OPL);
// jump table: for each point, (over, landing) along each line
const JP0 = new Int16Array(NN + 1), JPOa = [], JPLa = [];
for (let i = 0; i < NN; i++) { JP0[i] = JPOa.length; for (const [n, b] of NBR[i]) if (b >= 0) { JPOa.push(n); JPLa.push(b); } }
JP0[NN] = JPOa.length; const JPO = Int8Array.from(JPOa), JPL = Int8Array.from(JPLa);
const GM0 = new Int16Array(NN + 1); let GMA = new Int8Array(0);
function setGooseTable() {
  const out = [];
  for (let i = 0; i < NN; i++) { GM0[i] = out.length; for (const [x, , dr, dc] of NBR[i]) { if (!R.diag && dr && dc) continue; if (!R.back && dr > 0) continue; out.push(x); } }
  GM0[NN] = out.length; GMA = Int8Array.from(out);
}
// The no-retreat rules (g15 / g17 / g13n): the geese can never come back, so a pen that leaks behind them can never be closed.
//   area   — the empty points the fox can walk to (the pen), weighted much more than in g13
//   esc    — the fox can walk to a point behind every goose (a row no goose can reach any more): the net is broken for good
//   deep   — pen points on rows that only a few geese (on that row or behind it) can still reach
//   threat — a goose with an empty landing point behind it whose take-off point the fox can walk to: the nearer, the worse
//   ahead  — geese that have gone past the fox's row (they can never come back to close the pen behind it): per row past it
//   lone   — a goose already above the fox's row with no other goose next to it (passed: it cannot help and the fox picks it off)
//   tempo  — the geese running out of moves (no retreat: a goose that has to move into a jump is a goose lost; no moves = the fox wins)
const EWN = { area: 20, esc: 450, t1: 34, t2: 12, t3: 4, adv: 0, lone: 22, tempo: 14, deep: 10, ahead: 20 };
if (typeof process !== 'undefined' && process.env && process.env.FG_EWN) Object.assign(EWN, JSON.parse(process.env.FG_EWN));   // (tuning runs in Node)
let CLK_K = 1, CLK_W = 15;   // (2026-11-19 tuned with tools/match.js: 1,15 beat 0.6,30 · 1,30 · 1.5,20; see the spec)
if (typeof process !== 'undefined' && process.env && process.env.FG_CLK) [CLK_K, CLK_W] = process.env.FG_CLK.split(',').map(Number);
const _dist = new Int8Array(NN), _rowN = new Int8Array(7), _q = new Int8Array(NN);
const EV0N = { g15: 1130, g17: 1370, g13: 0, g13n: 890 };   // the start (the fox to move) comes out at 0
function evaluateN(pos) {
  const sq = pos.sq, f = pos.fox;
  _dist.fill(-1); _rowN.fill(0);
  let geese = 0, gMax = -1;
  for (let k = 0; k < 33; k++) { const i = POINTS[k]; if (sq[i] === P2) { const r = ROW[i]; _rowN[r]++; geese++; if (r > gMax) gMax = r; } }
  for (let r = 5; r >= 0; r--) _rowN[r] += _rowN[r + 1];        // geese on this row or behind it: the only ones that can still reach it
  // the fox's walk: distances (steps) to every empty point it can reach
  let head = 0, top = 0, area = 0, esc = ROW[f] > gMax ? 1 : 0, deep = 0, room = 0, jumps = 0;
  _dist[f] = 0; _q[top++] = f;
  while (head < top) {
    const a = _q[head++], d = _dist[a] + 1;
    for (let k = NB0[a], e = NB0[a + 1]; k < e; k++) {
      const x = NBA[k]; if (sq[x] || _dist[x] >= 0) continue;
      _dist[x] = d; area++; if (d === 1) room++;
      const r = ROW[x]; if (r > gMax) esc = 1; else if (_rowN[r] < 4) deep += 4 - _rowN[r];
      _q[top++] = x;
    }
  }
  let thr = 0, adv = 0, lone = 0, gm = 0, ahead = 0;
  const fr = ROW[f];
  for (let k = 0; k < 33; k++) {
    const i = POINTS[k]; if (sq[i] !== P2) continue;
    const ri = ROW[i];
    if (ri >= fr) adv += 6 - ri; else { adv += 6 - fr; ahead += fr - ri; }
    // the nearest take-off point from which the fox could jump this goose (the landing behind it empty)
    let best = 9;
    for (let o = OP0[i], e = OP0[i + 1]; o < e; o++) {
      const t = OPTA[o], l = OPLA[o]; if (sq[l]) continue;
      if (t === f) { jumps++; continue; }
      const d = _dist[t]; if (d > 0 && d < best) best = d;
    }
    if (best === 1) thr += EWN.t1; else if (best === 2) thr += EWN.t2; else if (best < 9) thr += EWN.t3;
    if (gm < 4) for (let n = GM0[i], e = GM0[i + 1]; n < e; n++) if (!sq[GMA[n]]) gm++;   // (only "fewer than 4" matters)
    if (ri < fr) { let friend = 0; for (let n = NB0[i], e = NB0[i + 1]; n < e; n++) if (sq[NBA[n]] === P2) { friend = 1; break; } if (!friend) lone++; }
  }
  const u = pos.quiet > QS0 ? (pos.quiet - QS0) / (QUIET_MAX - QS0) : 0;
  let v = -geese * EW.goose + room * EW.room + jumps * EW.jump * (pos.side ? .5 : 1);
  v += area * EWN.area * (1 + u) + esc * (EWN.esc + area * 10) + deep * EWN.deep;
  v += thr - adv * EWN.adv + lone * EWN.lone + ahead * EWN.ahead;
  if (gm < 4) v += (4 - gm) * EWN.tempo * (gm === 0 ? 3 : 1);
  v += EV0N[RK];
  if (u > 0) v += u * u * 500;   // the clock runs for the fox
  // the clock against the pen (2026-11-19): the geese need roughly CLK_K goose moves per point of the pen to close it; when that
  // is more than they have left before the quiet-move limit, the shortfall counts for the fox
  if (CLK_W) { const need = area * CLK_K - (QUIET_MAX - pos.quiet) / 2; if (need > 0) v += need * CLK_W; }
  return pos.side ? -v : v;
}
// ---------------------------------------------------------------- the learned evaluation (2026-11-18): a small network over the geese as
// seen from the fox (index foxPoint × 33 + goosePoint), the side to move and the quiet-move clock; trained on self-play
// (tools/gen_data.js → tools/train_eval.py → tools/pack_eval.js). Used for the 15-goose rule; the others keep evaluateN / evaluate.
// opening book (2026-11-19, tools/make_book.js): the standard start of each rule, both first movers; for every position the book's
// side can reach in its first BOOK_PLY own moves against any reply, the move a long search chose. Key: rule + the position's
// hash pair (side included) in base 36. Used from Lv.11 (the levels that search without noise); off with env FG_NOBOOK.
// BOOK-BEGIN (tools/pack_book.js: 644 positions — g15 first fox 3 moves 1000ms · g15 first geese 3 moves 1000ms)
const BOOK = {"g15:eovav5:108vnp0":1113,"g15:do02d4:1sht7lz":1617,"g15:1cemdiy:8ynmov":1113,"g15:ih8p5x:15ggtbj":1689,"g15:1632m8e:x21aoo":1689,"g15:zbcmtm:bzx74h":1241,"g15:sdjxbj:f7koa3":1561,"g15:725qk:kj9u72":1561,"g15:yya8aw:1sxjh8":1497,"g15:vmv15r:uav4yv":1561,"g15:12181pn:5grz88":1753,"g15:yo41s3:14q56oq":2137,"g15:10cx8o6:1depv4x":1689,"g15:1p6lhmg:14h3yce":1241,"g15:19ml9gq:awjy68":1553,"g15:19kd5m5:cj540b":1112,"g15:hesdqu:13w3n34":1624,"g15:1dji5y9:ptr125":1624,"g15:1vbioxp:eogzna":664,"g15:1pkf4yo:o6wxvg":1432,"g15:2g1v9n:1ecp7pn":1432,"g15:1q7qyof:1sremgy":1112,"g15:z7mh67:61f90q":1688,"g15:1v3697m:12ydwt1":1688,"g15:682l2m:1m8rsp7":1432,"g15:1ei4vfi:19ooplp":1688,"g15:1r50dqe:md8qo9":1432,"g15:7wc5gj:v5k3ci":1432,"g15:iv76d9:n8cwp9":1432,"g15:jqujq4:1yyd4bg":1553,"g15:6yenhi:1cqzyi0":1624,"g15:k7hpv6:166t27v":1624,"g15:7blk7w:ccfi1w":1112,"g15:ykbeyn:mduuoh":1624,"g15:3xao30:x6ogfc":2008,"g15:17rktuh:1kxmaba":1688,"g15:55hhec:ngoxhl":1688,"g15:1w1bbdk:2j0tlj":1624,"g15:norfc8:yhtrgh":1688,"g15:8bmk0:11ujbv9":1624,"g15:1ysvdn9:1athtf2":1624,"g15:13w9n5f:1braxvk":1624,"g15:18kmc23:12njqz5":1624,"g15:14jjlmf:8b24ob":1617,"g15:q3tng:1f348yn":1689,"g15:5ddmwh:196iav0":1241,"g15:1u6aff5:a4tr6v":1753,"g15:1vkf29i:1qf96dj":1689,"g15:1lcdnpu:jwijte":1561,"g15:1iotkf4:1i6xlhj":1113,"g15:19hbww3:1h4yrjm":1689,"g15:1ps15jb:1vfbwa8":1497,"g15:1m38ok0:16dbn63":2009,"g15:bqi2jo:1rve22c":2137,"g15:mdzgwf:in6xb7":1241,"g15:rqhw7q:pj20t4":63313,"g15:8vclqs:14zlc21":1039,"g15:1k9p11b:vm4d4u":1487,"g15:q19g59:lbb7so":1039,"g15:10fo6ec:bs197e":1487,"g15:91mmm1:39n22":1487,"g15:d5awha:txrwsh":120783,"g15:1gfofx7:1m2ngpr":1487,"g15:edsvyu:k8fk2o":1487,"g15:1my2evu:5xjada":1487,"g15:w7mtbe:qoqqp4":1487,"g15:9bby42:1534abg":1039,"g15:1ppp5cn:1e5i1fr":1487,"g15:101fn61:15ybdfc":1487,"g15:1e912t:93spyl":1553,"g15:45yp9h:b1pooi":1113,"g15:10hfo30:1vj9c48":1497,"g15:74us15:oec4h0":1561,"g15:ov2c8l:h80y4v":1177,"g15:wzee5k:q0u7k5":1561,"g15:1t21gew:1r9g2mu":1113,"g15:kgmg1x:1l6xoqe":2009,"g15:1yj2a3s:1h8r8m2":2009,"g15:1gj6t46:1osa6cy":1753,"g15:k69lce:p319rk":2137,"g15:1euxraj:y1lw0b":1241,"g15:1sl1w6t:ori4vo":1689,"g15:xdl50x:u224kv":2001,"g15:1xeq0rl:umfhbo":1631,"g15:utnik3:18s2usz":991,"g15:12xexmt:xqiysv":1631,"g15:otp31q:178zjbs":1631,"g15:1arqx1r:1ojaqln":8189791,"g15:1l9gsa4:1ac219a":991,"g15:18i1ipz:195t7ye":1247,"g15:jwxu6j:1yu8amw":79967,"g15:1sa3ubf:12aimha":71775,"g15:1dfh7dv:z0vuu2":88159,"g15:llusue:qc8d9d":1631,"g15:538920:yppdum":1631,"g15:x7k61y:26wuqc":1553,"g15:xdphvs:qq590z":1432,"g15:xaeqzl:3qvahr":1496,"g15:qzvz1p:yw14jt":2008,"g15:99exip:5mdtsy":664,"g15:1os7p53:15kkb33":1624,"g15:11eg1kc:15jchiv":1112,"g15:9g27xq:1by5iip":1688,"g15:y7s7n6:byv1ip":1624,"g15:1iumopu:1uxwiu7":1624,"g15:s8l2tu:10n12h5":1688,"g15:deks22:v4wrq5":2008,"g15:1lms6cv:mfxp5y":2008,"g15:140so6p:vxc4ih":2008,"g15:1lte2o6:gi84mh":2456,"g15:1byf4jc:1vw3cvs":1112,"g15:1rb2doz:1givx8q":1553,"g15:1tfr5x9:1ora1yl":1688,"g15:1wgqg82:1vdwnt4":1624,"g15:1jdd12y:yskqbq":1624,"g15:1om3py5:1fcy7mu":1624,"g15:k4in3m:d66075":116376,"g15:1ffof0z:uo5xde":2008,"g15:1q16700:53b26f":1688,"g15:5wzzq1:d2orhl":1688,"g15:1sl78av:14dqi27":1688,"g15:nx5nfb:l27lc1":2008,"g15:19gjr0f:1k7ty9v":1688,"g15:pktbh6:1t08gfs":1688,"g15:10hhj8:1jz15xj":1688,"g15:it03ub:100wvef":2456,"g15:hkdwb1:lnab8m":1688,"g15:toyqvy:a8tt85":1169,"g15:1o1bccy:i7y8jr":2066,"g15:lg9z7k:13k9sqo":2066,"g15:1jjmeiv:if5v4v":1618,"g15:1vrgtw5:1rvh1bg":1618,"g15:585ntq:13p0rd4":1042,"g15:1sv06wi:9ifrf0":1298,"g15:1cagxdi:nyx1cs":2066,"g15:y73pul:1dzmy3v":2066,"g15:12iu8l8:1w7oec8":2066,"g15:1tiubkv:120w299":4319250,"g15:14ci3h7:1it5l7z":2066,"g15:1owhlig:30g7r9":1106,"g15:17zwiks:1cce00k":2066,"g15:s5xbug:1lwxv8r":2066,"g15:5fvja1:1g33esy":722,"g15:1426tu8:mp4ui1":2066,"g15:uyored:vdsolu":5384210,"g15:dc3hez:n074kt":2066,"g15:10kupnz:lcsohf":1234,"g15:130orde:xof1pn":1617,"g15:7t1ugp:1p73eov":1753,"g15:6w8xff:1f4l39":2137,"g15:1usu6no:hs5hgn":2137,"g15:1yvtq8f:18s7ur":1753,"g15:1oxycxx:1ajm69z":1753,"g15:1hau02q:161zblc":1497,"g15:1lohlh1:1xykfnv":1753,"g15:iklmlc:1stn78t":1753,"g15:hghvf0:9pq4b1":2137,"g15:1xlmpq1:1qmmuse":1753,"g15:r0ssuq:9fhgy":1241,"g15:15gebvu:f15ihw":6666713,"g15:egrsmz:1bwidg1":1753,"g15:cff8v6:3doid9":2129,"g15:11uz2vc:1ok7339":1633,"g15:84aly2:5yijc2":1633,"g15:1yi3lkc:1l16nr2":1761,"g15:bz90uf:d970qx":1377,"g15:1op7obq:ukwpbu":1633,"g15:1g7yayt:58pjgv":1633,"g15:1hokhdt:q6xvyl":71649,"g15:1lar3ti:exmvjq":63457,"g15:pu06sj:13t2rag":79841,"g15:1mbreb2:6c92tz":1121,"g15:hmqhm7:1t6w0mo":1377,"g15:qn2l0x:1jrzln3":8739041,"g15:xn62ii:1wu01nt":1617,"g15:1suzys1:q2pzx9":2137,"g15:1wtasl8:jr4hfi":1689,"g15:1f8exo:1hnojhh":1753,"g15:aj60kf:191wbyo":1177,"g15:2xuron:10x3ge9":2137,"g15:cu60ml:aqmdl1":2137,"g15:ez5ikq:6coyuq":1497,"g15:g3fpst:yrqj49":2009,"g15:1esk2yw:t33xwv":2073,"g15:481tsh:qujeqk":1689,"g15:qs9eki:1evfnxi":96729,"g15:1hrf0nn:cpogwj":1689,"g15:11dq13z:1o53s7m":1617,"g15:661xbo:yqfrvq":1561,"g15:27r389:str0lh":1689,"g15:1s4sjry:ahion2":1177,"g15:1oi0k1m:107xgmj":1177,"g15:1w31ev6:1a0nvay":1241,"g15:1m712mg:1rqita":1113,"g15:1k1qkq7:f19n61":1497,"g15:1ixlri0:py5vw2":1177,"g15:1o9grpd:1xp73zh":721,"g15:11sj7xa:1sxqf49":1227,"g15:81u7t8:abmhvy":1227,"g15:3jk7a9:hr95il":1163,"g15:1v49gld:1finoae":1227,"g15:1tihiw6:ywq0nq":1739,"g15:1m1m8w2:1on7iwz":1227,"g15:1ykvfju:1yep2aa":1227,"g15:1omos4w:q7pys6":1099,"g15:1gac9sj:9m8xib":1227,"g15:1hm9w2f:ukfty9":1227,"g15:1lddoqo:1k4rq2":1227,"g15:pwk3cl:1h1xv44":1227,"g15:1me2p4o:apcuez":1163,"g15:expsj8:y5jxr9":1227,"g15:15jsepw:3z7okz":1227,"g15:peiunr:7jdarv":1227,"g15:175msen:z6io5r":1631,"g15:92lq0w:137yq3t":2022,"g15:1lx0jn7:1vom3my":1697,"g15:1s2swbu:vb6y6w":1697,"g15:q7vbts:ba4yd1":1697,"g15:1c0hvkz:12qoghw":1697,"g15:1wj66e:1wt8tzc":1697,"g15:1np3cgk:wb299m":1697,"g15:1oe1e1d:1jatkgn":2477,"g15:1kl4mmy:7o9czv":2477,"g15:1yccbl4:lu0kxc":2023,"g15:9pabz2:1s86ulg":1567,"g15:asg7g6:1gplxgc":1697,"g15:1lgtezi:11uvp41":1697,"g15:16uzvh0:1h099mx":1567,"g15:xbma13:1kgcrhb":1567,"g15:zfdf03:1s9qg7b":2541,"g15:1ujikbn:14lpnak":2022,"g15:pgf6e1:xdogzr":1567,"g15:1hbfjpk:6y4hsk":1567,"g15:19mnzt:1aef7y":1567,"g15:ri7892:dq0c8e":1567,"g15:aub5rh:ygsrx6":1761,"g15:qw4uo1:3azmab":2151,"g15:x5kdxi:5caay8":1697,"g15:w0tmwe:kgsr2g":2541,"g15:16w6dfq:yhk86t":2541,"g15:1lp5nrg:kv1l7h":2541,"g15:cn87of:hkbyiz":1697,"g15:boy757:5fqhw3":2541,"g15:xm1njt:j1n5ss":2543,"g15:1fq6vml:1rhtu1e":2152,"g15:glzkif:1s11fk0":2607,"g15:1mb116n:1mmjuyl":1691,"g15:1lcyeky:vgi016":1691,"g15:mqg7s6:scne07":1691,"g15:1srngwf:1dx64bh":2152,"g15:upzau5:1m6tnfs":1691,"g15:1mt9h66:1o9b69j":2607,"g15:isg625:1ftq6wr":1691,"g15:ardb7g:wucsb4":1503,"g15:yhjlee:bdfgky":2022,"g15:hd0ggm:dlvuoq":1567,"g15:1jjayjw:1i2t3fd":1559,"g15:wkt3hb:1k68buu":1633,"g15:n808hp:19egbka":2477,"g15:15wmjrg:1gqeosw":1633,"g15:1ib8my2:1iwtg1z":2477,"g15:1usi86r:12t5w1c":2477,"g15:1s9jro3:l4502o":2022,"g15:1k17ukd:1jmrmhf":2477,"g15:klmnfo:yxjyo9":1559,"g15:oj31tb:18oay6t":1567,"g15:1mzos22:laus7":2022,"g15:wkbc2:qq311h":1567,"g15:19quoj8:1jvdi0w":1503,"g15:1sv15bg:7rllqk":2022,"g15:wk0ewv:2qo5lu":2022,"g15:1b7x2js:f68by5":2022,"g15:x1lw1s:1w1xctg":2152,"g15:1tzfyx0:i67f04":2023,"g15:f6ily2:1dg5qzc":2541,"g15:1h1zyc4:2tz8d2":2541,"g15:15r298:wgajt5":2022,"g15:eu6ja4:9efs6o":2022,"g15:mk08py:iqrw2p":2022,"g15:1dpo9kl:fir31z":1761,"g15:imprly:kbuohg":1567,"g15:1l4plud:14ii99n":1567,"g15:15f127n:ihwbiu":1631,"g15:j2q1lt:1le87w4":1633,"g15:1en9njz:613ivw":1503,"g15:7empwv:1fbhlq5":1559,"g15:uws21b:cd56ug":2022,"g15:w3lpfl:io2xl5":2022,"g15:1ge10te:plol58":2022,"g15:1thj3px:ku4a0u":2022,"g15:x6e58k:br8ywd":2022,"g15:1f9gd86:mblngp":1689,"g15:1a1crek:awji4h":1626,"g15:1x2h2ay:fyy1k2":1177,"g15:ncszft:1rmpnnd":1113,"g15:zthjwi:1z2hfy":1113,"g15:teagsm:p940jr":1113,"g15:vc4rj7:jok0hp":1113,"g15:63t37k:g5q4co":1561,"g15:tru1l0:wy3422":1497,"g15:rxzg5v:824hv5":1561,"g15:18aowbr:rmdzf2":1753,"g15:thjndb:1qz6suk":2137,"g15:15jsvmy:1hvjxbr":1113,"g15:1k3w5f8:1qo4lxk":1689,"g15:k96per:14mjn8x":1626,"g15:188iy2u:v2wqtd":1241,"g15:10xp7o9:1u2qq0n":1113,"g15:17bd7gc:1vn34b1":1561,"g15:1xmfxgf:13ph4e0":1113,"g15:11mskyj:1i9rquy":1497,"g15:11tzojw:1anud8h":1561,"g15:vzlfso:1nk7zb2":1753,"g15:11d4uc0:odp9q4":1689,"g15:xnwn1x:x145mv":1689,"g15:2p18ur:w3b1k9":1689,"g15:as578r:nkrnqw":1689,"g15:17cb39k:v42vk6":1818,"g15:wgcvy7:1uf720f":1756,"g15:19zuj0v:1ra6lnl":1756,"g15:1gdnyga:1xd5jff":1756,"g15:1ojnn49:10y81ny":1756,"g15:1agwk3x:1jyjwdo":1756,"g15:1ar52hm:18z8ivr":1756,"g15:ge9ui7:6um1vt":1756,"g15:1e022g2:zt8cvq":1756,"g15:n6qm7i:1p7oaqw":1756,"g15:1vp202m:1b4ct8e":1756,"g15:1a6jcqu:q21w8a":1692,"g15:oublur:yqy5qp":1692,"g15:1nyssd:qb0aum":1692,"g15:wfcqmk:c9v77z":1626,"g15:m8qjqq:3g50jk":1689,"g15:1j9rcvk:doezpi":1113,"g15:1fqw2yc:ywnzpg":1497,"g15:1ed4hr7:68kgjj":2009,"g15:lswdsn:t4qhj4":1753,"g15:1g0flvj:1ssqhj6":2137,"g15:j0rpzu:1jvc0c9":1689,"g15:7hwt1g:1t46shy":1241,"g15:uhcwmh:dtl051":1626,"g15:1rqxd4h:128nq7u":1561,"g15:tc9lyw:pwv07k":1497,"g15:1drfr8h:13z08lj":1561,"g15:kaqpw7:4uv16i":1689,"g15:19d2hap:qoa4vy":2009,"g15:oaveb6:whdqm2":1753,"g15:192sm8q:1vt7hfc":2137,"g15:pykfjz:1n0hk3n":1561,"g15:k9tk1:1wltrp8":1561,"g15:33nnii:ldabk0":1626,"g15:10egqxe:1vza8wf":1561,"g15:48xajf:9cs1t1":1497,"g15:1na74ua:1toyjqq":1561,"g15:d9ymic:uc0axb":1689,"g15:1it9bzm:813wsr":2009,"g15:dphsr5:2phl3j":1753,"g15:1ij35h5:11xkft9":2137,"g15:gi9gf0:1apz4l2":1561,"g15:s0h6v6:12q3zih":1561,"g15:wugk3y:f0ypu":1626,"g15:1adafrl:1kl8n7v":1561,"g15:mww6ls:9dqxzh":1497,"g15:1vdm6dh:185iyub":1497,"g15:l4tv4l:j7qf9p":1497,"g15:1fjufzx:1ifuq4v":1497,"g15:jh6y54:1ri8nck":1497,"g15:7502rq:1j8ihcb":1497,"g15:oxk0hd:13taz97":1497,"g15:actexb:hxzyay":161241,"g15:xqo1qx:tgut4p":1626,"g15:1v0jpdt:1mbr1bq":2009,"g15:tov3p6:vb895p":2009,"g15:px9lk7:kn4muu":1689,"g15:1y8ydoy:1vv1b6g":1561,"g15:itdoea:d12rxy":1753,"g15:1ejuuei:1cp2qd0":2137,"g15:kh1c27:13rof7z":1561,"g15:66ahap:1bwkkfk":1241,"g15:nwb8fa:1rhdayo":1561,"g15:bu4uzc:byimoh":113113,"g15:1sxhx2k:1lvvxpj":1562,"g15:vh08qe:47ekxf":1112,"g15:17padnt:1fmhwg3":2008,"g15:k69lfm:ohr450":1624,"g15:18hxb2e:17f0zh":2008,"g15:1ffkasj:74roqv":1432,"g15:1q27by8:s4wrua":1432,"g15:5y3e3t:ogao7w":1624,"g15:1dauoh7:r0fp2i":1688,"g15:1smyvef:1s0khcq":1624,"g15:nvh5k7:gvoflg":1624,"g15:1wd0h93:kf4d42":2008,"g15:19hbwzz:1gm7qie":1624,"g15:pjonoq:17ow8i5":2008,"g15:100cs4:1gv1x82":1624,"g15:iv1ltv:1wiae9u":2456,"g15:hlriil:fvn0b7":1112,"g15:s2npi9:kbluu0":1562,"g15:1yjmzqz:15rohfw":1112,"g15:56ilt0:9wf73w":1624,"g15:1jdq2z3:1hsv1xn":1624,"g15:d5x34b:17tyete":1624,"g15:f3rkdq:zjdw6w":1432,"g15:mc5lvx:1y4w53h":1432,"g15:st9we2:z9fvfp":1496,"g15:9hqwbi:1p0y2ic":1432,"g15:1o92i3u:19wtc5n":1624,"g15:1cmc4ln:1la9p8y":1496,"g15:xnmcka:1lrwkm5":1688,"g15:cf91tu:9zq1u1":1624,"g15:1mm2xlz:1cbigi":1624,"g15:131kum1:auzx3h":1624,"g15:9odk9p:r6r5w0":1562,"g15:1fhhcuf:1gsszno":1112,"g15:now2qg:3642gk":1624,"g15:zlxf3n:1sou4ar":1624,"g15:t26o8n:1ea9yru":1496,"g15:vk5sk2:1auibqo":1432,"g15:6gtws1:1mtrpj9":1432,"g15:sajehu:1vh9mnw":1432,"g15:15br5wb:c8al16":1112,"g15:mep20e:1u7kull":1624,"g15:1kggssl:4eucud":1624,"g15:17wfvjg:19f3vhi":1624,"g15:x4temd:15k2fwk":2138,"g15:jrtpwb:1xu07vz":1377,"g15:or3gpr:131j5k0":1697,"g15:19j1czj:30uc1n":1249,"g15:1fl76fs:1lbnjff":1761,"g15:10u2zb0:td8xu6":1633,"g15:1bmwwjo:lsfjmn":1633,"g15:15qqcrv:1uu0zz5":1377,"g15:13sw4we:1ttcl97":1377,"g15:1ssh2r1:14h4p66":1377,"g15:15adnhl:1pfccks":71649,"g15:172cwfy:1eqd5zr":2017,"g15:2enlmz:3gqlmx":79841,"g15:11lj0na:15ky2ie":1121,"g15:11w7dcw:1e8q3un":1626,"g15:12saecu:1ea1uuw":1241,"g15:wzt30u:e9eqqr":1753,"g15:tph2jt:1wk95z7":1689,"g15:nxgw99:mao2qe":1689,"g15:1dmgm7v:1v3ibjk":2137,"g15:1non9dq:15v3beo":1242,"g15:mpvs8h:10ysdga":88275,"g15:m31bqt:1v6nsph":144723,"g15:1dl19n9:wb2cum":1747,"g15:14m3umu:6grjcr":1683,"g15:1gge1pq:dcmacq":2259,"g15:zqsxq9:13han6c":88275,"g15:16ofu3o:14ytwfi":88275,"g15:1ysesav:1ufvli3":88275,"g15:106rkxv:19htx09":88275,"g15:13abxec:1jkc0gy":88275,"g15:8c8p7l:vvtm9o":88275,"g15:149qprg:1ta6g8z":88275,"g15:wvyqjk:1epmmxp":559298643,"g15:1nmv840:1i97kzv":4593875,"g15:6wc2xv:1nn6var":1683,"g15:cqv7dw:1879xqm":1561,"g15:1pi9u1z:pwbl87":977,"g15:2dwkcs:1h12nsw":977,"g15:1q9z2q0:1qzi2o9":119761,"g15:1x7lz71:1yqeks3":1873,"g15:1898mfi:104zlmu":977,"g15:1qxfhca:1ld0hac":2001,"g15:1tti3z1:19sidhb":127953,"g15:z5egh4:8rzw9t":977,"g15:1v0ekkl:116mb6m":977,"g15:65awfd:1ox3zgg":977,"g15:1ekzgk9:1chl592":2129,"g15:1r78hkx:p8sqwy":977,"g15:7u44kk:xwg2bd":977,"g15:iscoe2:oxkxxi":977,"g15:7nwfuh:1a1lsyt":1689,"g15:12znu7v:16eippf":1561,"g15:1v371dr:1mwsztt":1497,"g15:1j1riyi:59fpg2":1098,"g15:5d0h5d:1uspk11":714,"g15:1xucy8l:1bwc9f0":1098,"g15:1qwpynk:1d709w6":1098,"g15:10ph2dv:1l1wtsz":1098,"g15:1x3hbvb:ztox7l":1098,"g15:1wj39kw:1t3y9ei":1098,"g15:s4tyk5:m78tj8":1098,"g15:1t06lx4:1jy2857":1098,"g15:3v362c:15453hh":1098,"g15:1c5b32c:1qj7l2r":714,"g15:1wtpdjw:5xb6xz":1098,"g15:27hsl5:ev0jz0":714,"g15:ojw61z:68n7mr":714,"g15:1lm85ld:183koow":1494,"g15:1ku7qnf:831pos":1558,"g15:1b7srbc:r6a46x":1558,"g15:1nrm2q4:clyquz":1494,"g15:1o3oi8r:jmzcqo":1558,"g15:ktdru6:1y1ddy6":1494,"g15:1ifd0mb:s8wan5":1494,"g15:9v3hpr:flxiv3":1494,"g15:10lj2vz:ldqzhl":1494,"g15:1nhty2v:1fdzkcd":1494,"g15:bjd23m:16p0nye":1494,"g15:otdumc:17mtu20":1494,"g15:wrt22k:1fmmn21":1494,"g15:e0vbox:6v2zdn":1494,"g15:1sdmsgx:1gvthoo":1494,"g15:d5ua1i:1p91fy3":1494,"g15:53jho2:y9ok32":1494,"g15:770vk0:1yv9k6z":1558,"g15:z9sbhf:10jr6a6":1558,"g15:n8t2f:1lhzvik":1494,"g15:3seqsw:19np5kn":1558,"g15:17w4tad:8d3yll":1494,"g15:4qx6h4:11lnw7q":1494,"g15:1wgf9c4:1ohvoug":982,"g15:o386yc:1cmsdge":1494,"g15:12x3p67:z90len":1494,"g15:1uizbs1:13mnnz9":1873,"g15:tzblfl:fgk0ir":1489,"g15:1wgzfk4:14utorj":1617,"g15:16n50w5:16hc6wu":63313,"g15:l974q6:y7tq6h":63313,"g15:1aa78rs:31ap1p":524146641,"g15:ga2hje:1p0vk6g":5109585,"g15:1ed0xl3:iebglz":63313,"g15:msiwwb:8t84g9":63313,"g15:1v8d4xn:tka49r":63313,"g15:1ajteoz:181cdqj":63313,"g15:ohdrpi:1gtqpo0":63313,"g15:24z1lk:17pw5xr":63313,"g15:v9yu5j:1h067t":1626,"g15:1szsp3w:1aif1w2":1626,"g15:1y4ydbi:1m9bj6b":1626,"g15:sbcld7:wl28rz":1626,"g15:akvwhj:7x5fgk":1626,"g15:2lvl2i:zbvd72":1626,"g15:1p4orup:17ldzg9":1818,"g15:emqnb9:1hjybow":1626,"g15:zxzbhm:17p0v0x":1626,"g15:acjhrc:19i7mhz":91674,"g15:yfaw8k:9ytzo7":1626,"g15:rc3es4:13221db":91674,"g15:f9z6ks:xkdgjf":2138,"g15:1jrdicp:ogqr5s":1626,"g15:1618o6v:ydazcv":1242,"g15:1noswzk:ecfmj3":1626,"g15:1blyny6:1y0yrfi":1626,"g15:1ywxf1m:17jl2yu":1626,"g15:s1mwy9:h7bgq5":1626,"g15:w5ud9f:k2p4a4":1626,"g15:1soo412:1tpirio":1626,"g15:1awkfay:10yait7":1626,"g15:119baxz:1s2z9v5":1626,"g15:n5xf0s:1bat1i":1818,"g15:1g1r8w8:olcpzj":1626,"g15:1fdj3ka:whwb9e":1242,"g15:1vhm6t5:1foxeco":1626,"g15:gm1v2g:33onq7":1626,"g15:1txwxcp:5xli6o":91674,"g15:1f3a3wh:1qix9s4":2138,"g15:jxr690:1hpcg1r":1626,"g15:6qz1oa:1quewqo":1242,"g15:1iflmqj:furqux":1494,"g15:xs3kr0:11rd173":1494,"g15:c9l3ro:ygbisb":1494,"g15:212det:17a0pq3":1558,"g15:r36yyu:1s500cu":1558,"g15:80ygea:1bmrtvw":1494,"g15:5ancet:1hb0lyv":1558,"g15:zo4wrk:y1p961":1494,"g15:4c69pp:1r08qza":1494,"g15:17vatog:1n9ms5t":1494,"g15:1qqol64:8nw569":1494,"g15:albba1:1ph1deq":1494,"g15:1glsp6a:gv9utq":1494,"g15:kfai8a:2ssmmw":1494,"g15:1slrpp7:144l7fx":982,"g15:1f5g5zq:1dzr0r2":1626,"g15:9o98q5:6bc1ph":2138,"g15:eguly7:qszw2s":1626,"g15:1cje82i:1iejy8o":2138,"g15:1u8wuo6:1c9elir":1626,"g15:1hp37yz:1l7uant":2138,"g15:5qq8a8:ccfnta":1818,"g15:1y0mdx0:v6i2x3":1626,"g15:1yq6kty:q1krey":1626,"g15:unvc:1sqhb07":2138,"g15:1ifb3jh:c7bppg":1626,"g15:qj2y2u:1k93k3s":2138,"g15:30hw33:sjz6ej":2586,"g15:a97al8:y51sn6":1494,"g15:1ofvcak:1yalo7t":1494,"g15:1x395xb:17y5u5o":1494,"g15:1vc68jx:7da43d":1558,"g15:154vo6m:sei40c":1558,"g15:1snwtuy:bw8kjy":1494,"g15:1s30rb1:i5fm0l":1558,"g15:wl11l4:1xuqgff":1494,"g15:1xfsg05:ran5p0":1494,"g15:tym99k:nkcff7":1494,"g15:1mrm2y9:psoqao":1494,"g15:1gaqxya:12obonu":1494,"g15:83sy2b:4z07hr":1494,"g15:1os58jd:phmwu1":1494,"g15:glrbsu:774fgi":1494,"g15:1xm23e:1gwq9zr":1494,"g15:3opuy0:g6xkn6":1558,"g15:tw05jf:jkjewn":1558,"g15:6da973:2san05":1494,"g15:6yc74o:r4ea4u":1558,"g15:12gc0vh:1osccpc":1494,"g15:1l97hc:iibmun":1494,"g15:ifuwbg:tjg49z":1494,"g15:10rsy07:xce4li":1494,"g15:xr2cg7:1ym3ae5":1494,"g15:rullb4:g3hmpp":1494,"g15:mylvhy:74bpod":1558,"g15:ehb9zp:s5mkw8":1558,"g15:ke0tap:bn8txm":1494,"g15:jkhykm:ie9prl":1558,"g15:1n4shf7:1x26z3j":1494,"g15:p0z4vy:qzp6hc":1494,"g15:8bkfgi:kee7dk":1494,"g15:cl6it6:vgfy32":1502,"g15:9ziek5:ry5u54":1567,"g15:1adwd4:jh8q3f":2023,"g15:m7sv5q:h5yjyk":2022,"g15:1odb4c0:11587ya":2022,"g15:1kje3jv:or83oe":2022,"g15:1888gbb:sdqij1":1761,"g15:1o3i3wb:4vqwzo":2152,"g15:mi396d:1b23xai":2152,"g15:1818gp2:u0nbd3":1567,"g15:rholev:w5o323":2022,"g15:7ycwr2:1mldj13":1951,"g15:45or9h:4dq3pn":1633,"g15:1xanqa9:1az2jwj":1567,"g15:469bzf:p5aw8w":1561,"g15:1dgod3s:mt51zz":2151,"g15:158gb5m:gmbftf":1567,"g15:m8k557:amfo09":2151,"g15:ff860k:5fqtrd":1561};
// BOOK-END
const NOBOOK = typeof process !== 'undefined' && process.env && !!process.env.FG_NOBOOK;
const bookKey = pos => RK + ':' + pos.h1.toString(36) + ':' + pos.h2.toString(36);
function bookMove(pos, all) {
  if (!BOOK || NOBOOK || pos.ply > 24) return -1;
  const m = BOOK[bookKey(pos)]; return m !== undefined && all.includes(m) ? m : -1;
}
// NNW-BEGIN
const NNW = null;
// NNW-END
const PIX = new Int8Array(NN).fill(-1); POINTS.forEach((p, k) => { PIX[p] = k; });
let NET = null;
function netLoad() {
  if (!NNW) return null;
  const dec = ([s, b64]) => { let bin; if (typeof atob === 'function') { const t = atob(b64); bin = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) bin[i] = t.charCodeAt(i); } else bin = new Uint8Array(Buffer.from(b64, 'base64')); const q = new Int16Array(bin.buffer, bin.byteOffset, bin.length >> 1), f = new Float32Array(q.length); for (let i = 0; i < q.length; i++) f[i] = q[i] * s; return f; };
  const n = { h1: NNW.h1, h2: NNW.h2, scale: NNW.scale };
  for (const k in NNW.a) n[k] = dec(NNW.a[k]);
  n.acc = new Float32Array(n.h1); n.hid = new Float32Array(n.h2);
  return n;
}
NET = netLoad();
let NET_ON = !(typeof process !== 'undefined' && process.env && process.env.FG_NONET);
function evalNet(pos) {
  const N1 = NET.h1, N2 = NET.h2, acc = NET.acc, W1 = NET.W1, sq = pos.sq, side = pos.side;
  const qb = Math.min(7, pos.quiet >> 3), fb = PIX[pos.fox] * 33;
  for (let j = 0; j < N1; j++) acc[j] = NET.b1[j] + NET.Ws[side * N1 + j] + NET.Wq[qb * N1 + j];
  for (let k = 0; k < 33; k++) { if (sq[POINTS[k]] !== P2) continue; const o = (fb + k) * N1; for (let j = 0; j < N1; j++) acc[j] += W1[o + j]; }
  for (let j = 0; j < N1; j++) { const x = acc[j]; acc[j] = x < 0 ? 0 : x > 1 ? 1 : x; }
  let z = NET.b3[0];
  for (let i = 0; i < N2; i++) { let h = NET.b2[i]; for (let j = 0; j < N1; j++) h += acc[j] * NET.W2[j * N2 + i]; h = h < 0 ? 0 : h > 1 ? 1 : h; z += h * NET.w3[i]; }
  const v = Math.round(z * NET.scale);
  return side ? -v : v;
}
// evaluation cache (2026-11-18): the same position comes back often (quiet search, transpositions); keyed like the TT (with the clock)
const ECB = 16, ECN = 1 << ECB, ECM = ECN - 1, EC1 = new Uint32Array(ECN), EC2 = new Uint32Array(ECN), ECV = new Float64Array(ECN);
let ECRULE = '';
function evaluate(pos) {
  const k1 = (pos.h1 ^ ZQ1[pos.quiet & 255]) >>> 0, k2 = (pos.h2 ^ ZQ2[pos.quiet & 255] ^ 0x5bd1e995) >>> 0, i = k1 & ECM;
  if (ECRULE !== RK) { EC1.fill(0); EC2.fill(0); ECRULE = RK; }   // (setQuiet empties it too)
  if (EC1[i] === k1 && EC2[i] === k2) return ECV[i];
  const v = evaluate0(pos); EC1[i] = k1; EC2[i] = k2; ECV[i] = v; return v;
}
function evaluate0(pos) {
  if (NET && NET_ON && RK === 'g15') return evalNet(pos);
  if (!R.back) return evaluateN(pos);
  const sq = pos.sq;
  let v = -pos.geese * EW.goose + pos.foxRoom() * EW.room + pos.foxJumps() * EW.jump * (pos.side ? .5 : 1) + foxArea(pos) * EW.area;
  let loose = 0, adv = 0;
  for (const i of POINTS) {
    if (sq[i] !== P2) continue;
    adv += 6 - RC[i][0];
    for (const [n, b] of NBR[i]) if (b >= 0 && !sq[n] && !sq[b]) { loose++; break; }   // an empty line through it: it can be jumped once the fox gets beside it
  }
  v += loose * EW.loose - adv * EW.adv;
  v += EV0[RK];                         // (centred: the start is about 0)
  if (pos.quiet > QS0) { const u = (pos.quiet - QS0) / (QUIET_MAX - QS0); v += u * u * 900; }   // the clock runs for the fox
  return pos.side ? -v : v;
}
// ---------------------------------------------------------------- search
let nodes = 0, stop = false, tEnd = 0, nodeLimit = Infinity;
// the transposition table: a fixed typed-array table (no garbage to collect; replaced on every store)
const TTB = 18, TTN = 1 << TTB, TTM = TTN - 1;
const TT = { k1: new Uint32Array(TTN), k2: new Uint32Array(TTN), v: new Int32Array(TTN), m: new Float64Array(TTN), d: new Int8Array(TTN), f: new Int8Array(TTN), clear() { this.k1.fill(0); this.k2.fill(0); this.d.fill(-1); } };
TT.clear();
const killers = [];
const NOHIST = typeof process !== 'undefined' && process.env && !!process.env.FG_NOHIST, NOQK = typeof process !== 'undefined' && process.env && !!process.env.FG_NOQK;
const HIST = new Int32Array(NN * NN);   // history heuristic: quiet moves (from → to) that caused cut-offs
function hdecay() { for (let i = 0; i < HIST.length; i++) HIST[i] >>= 2; }
let REP = null;
let ROOTD = 0;   // the depth of the current iteration (bestMove / rootValues): limits the trap extension
const OLDORD = !(typeof process !== 'undefined' && process.env && process.env.FG_NEWORD);   // (captures-first ordering measured worse: off)
const NOEXT = !(typeof process !== 'undefined' && process.env && process.env.FG_EXT),   // (the trap extension measured worse: off)
     NOQG0 = 0, NOQG = typeof process !== 'undefined' && process.env && !!process.env.FG_NOQG;
function foxMob(pos) { const sq = pos.sq, f = pos.fox; let n = 0; for (let k = NB0[f], e = NB0[f + 1]; k < e; k++) if (!sq[NBA[k]]) n++; for (let o = JP0[f], e = JP0[f + 1]; o < e; o++) if (sq[JPO[o]] === P2 && !sq[JPL[o]]) n++; return n; }
function foxJumpable(pos) { const sq = pos.sq, f = pos.fox; for (let o = JP0[f], e = JP0[f + 1]; o < e; o++) if (sq[JPO[o]] === P2 && !sq[JPL[o]]) return true; return false; }
const PATHH = new Uint32Array(256);   // the position hashes along the line being searched (by ply): a repeat on the line is the fox's
const NOPATHREP = typeof process !== 'undefined' && process.env && !!process.env.FG_NOPATHREP;                       // hash → times the position has already stood in the game (set by think / analyze)
function setHist(hashes) { REP = null; if (!hashes) return; const c = new Map(); let any = false; for (const h of hashes) { const n = (c.get(h) || 0) + 1; c.set(h, n); if (n >= REP_MAX - 1) any = true; } if (any) { REP = c; TT.clear(); } }
function kreset() { killers.length = 0; hdecay(); }
function ttClear() { TT.clear(); }
function terminal(pos, ply) {   // (the rules of judge() without the game's hashes; fast)
  if (pos.ng <= FOX_WINS_AT || pos.quiet >= QUIET_MAX && pos.canMove()) return pos.side ? -WIN + ply : WIN - ply;
  if (!pos.canMove()) return -WIN + ply;   // the side to move cannot move: the fox trapped / the geese stuck
  return null;
}
const _sc = new Float64Array(512);
function orderMoves(pos, L, ttm, ply) {   // (in place: insertion sort on scores; the best first)
  const k = killers[ply], f = pos.fox, fr = RC[f][0], fc = RC[f][1], n = L.length;
  for (let i = 0; i < n; i++) {
    const m = L[i]; let s;
    if (m === ttm) s = 1e6;
    else {
      s = 0;
      if (!pos.side) { if (OLDORD) { if (m >= 4096) s += (path(m).length - 2) * 400; } else { const a = m % 64 - 1, b = Math.floor(m / 64) % 64 - 1; if (Math.max(Math.abs(RC[a][0] - RC[b][0]), Math.abs(RC[a][1] - RC[b][1])) === 2) s += (path(m).length - 1) * 400; } }   // captures first: one per hop
      else { const t = mTo(m); s += Math.max(0, 4 - Math.max(Math.abs(RC[t][0] - fr), Math.abs(RC[t][1] - fc))) * 6; }
      if (k && (k[0] === m || k[1] === m)) s += 200;
      if (!NOHIST) s += Math.min(150, HIST[mFrom(m) * NN + mTo(m)] >> 4);
    }
    _sc[i] = s - i * 1e-6;   // (ties: the generation order)
  }
  for (let i = 1; i < n; i++) { const m = L[i], v = _sc[i]; let j = i - 1; while (j >= 0 && _sc[j] < v) { _sc[j + 1] = _sc[j]; L[j + 1] = L[j]; j--; } _sc[j + 1] = v; L[j + 1] = m; }
  return L;
}
function search(pos, d, a, b, ply) {
  nodes++;
  if ((nodes & 1023) === 0 && (Date.now() > tEnd || nodes > nodeLimit)) stop = true;
  if (stop) return 0;
  const tv = terminal(pos, ply); if (tv !== null) return tv;
  if (REP && ply > 0 && (REP.get(pos.h1) || 0) >= REP_MAX - 1) return pos.side ? -WIN + ply : WIN - ply;   // the third time: the fox wins
  // the same placement earlier on this line (no capture since: quiet counts back that far): the geese have made no progress and
  // the fox gets it under the rules (repetition / the clock). Without this, lines of geese stepping back and forth fill the search.
  PATHH[ply & 255] = pos.h1;
  if (!NOPATHREP && ply >= 4) for (let k = ply - 4, lo = Math.max(0, ply - pos.quiet); k >= lo; k -= 2) if (PATHH[k & 255] === pos.h1) return pos.side ? -WINT + 500 : WINT - 500;
  // the fox nearly shut in (two moves or fewer): read one ply further — the game is decided by these closes (2026-11-18)
  if (!NOEXT && ply + d < ROOTD + 6 && foxMob(pos) <= 2) d++;
  if (d <= 0) return quiesce(pos, a, b, ply, 0);
  const K1 = NOQK ? pos.h1 : (pos.h1 ^ ZQ1[pos.quiet & 255]) >>> 0, K2 = NOQK ? pos.h2 : (pos.h2 ^ ZQ2[pos.quiet & 255]) >>> 0;
  const ti = K1 & TTM, a0 = a;
  let ttm = -1;
  if (TT.k1[ti] === K1 && TT.k2[ti] === K2 && TT.d[ti] >= 0) {
    ttm = TT.m[ti];
    if (TT.d[ti] >= d) {
      let v = TT.v[ti]; if (v > WINT) v -= ply; else if (v < -WINT) v += ply;
      const fl = TT.f[ti];
      if (fl === 0) return v;
      if (fl === 1 && v >= b) return v;
      if (fl === 2 && v <= a) return v;
    }
  }
  const L = orderMoves(pos, pos.moves(), ttm, ply);
  let best = -Infinity, bm = L[0];
  for (let i = 0; i < L.length; i++) {
    const m = L[i], q = pos.clone().play(m);
    let v;
    if (i === 0) v = -search(q, d - 1, -b, -a, ply + 1);
    else {
      const red = d >= 3 && i >= 5 && path(m).length === 2 ? 1 : 0;
      v = -search(q, d - 1 - red, -a - 1, -a, ply + 1);
      if (v > a && (red || v < b)) v = -search(q, d - 1, -b, -a, ply + 1);
    }
    if (stop) return 0;
    if (v > best) { best = v; bm = m; }
    if (v > a) a = v;
    if (a >= b) { const k = killers[ply] || (killers[ply] = [-1, -1]); if (k[0] !== m) { k[1] = k[0]; k[0] = m; } if (path(m).length === 2) HIST[mFrom(m) * NN + mTo(m)] += d * d; break; }
  }
  let sv = best; if (sv > WINT) sv += ply; else if (sv < -WINT) sv -= ply;
  TT.k1[ti] = K1; TT.k2[ti] = K2; TT.d[ti] = d; TT.v[ti] = Math.round(sv); TT.m[ti] = bm; TT.f[ti] = best <= a0 ? 2 : best >= b ? 1 : 0;
  return best;
}
// quiet search: the fox's jumps
// quiet search (2026-11-18): the fox's jumps (and what they lead to), and — when it is the geese's turn and the fox can jump — the
// geese's answers: moving the goose in danger, filling the landing point, or (any other move) letting the fox jump
function quiesce(pos, a, b, ply, qd) {
  const stand = evaluate(pos);
  if (qd >= 4) return stand;
  if (!pos.side) {
    if (stand >= b) return stand; if (stand > a) a = stand;
    let best = stand;
    for (const m of pos.foxMoves([])) {
      if (m < 4096) { const p0 = m % 64 - 1, p1 = (m >> 6) - 1; if (Math.max(Math.abs(RC[p0][0] - RC[p1][0]), Math.abs(RC[p0][1] - RC[p1][1])) < 2) continue; }   // steps are not quiet-search moves
      nodes++;
      const q = pos.clone().play(m), tv = terminal(q, ply + 1);
      const v = tv !== null ? -tv : -quiesce(q, -b, -a, ply + 1, qd + 1);
      if (v > best) best = v; if (v > a) a = v; if (a >= b) break;
    }
    return best;
  }
  if (NOQG || !foxJumpable(pos)) return stand;           // the geese not in danger: stand pat
  // in danger: the jump-threatened geese and the landing points
  const sq = pos.sq, f = pos.fox, hot = _hot; hot.fill(0);
  for (let o = JP0[f], e = JP0[f + 1]; o < e; o++) if (sq[JPO[o]] === P2 && !sq[JPL[o]]) { hot[JPO[o]] = 1; hot[JPL[o]] = 1; }
  // "any other move": the fox to move on the same placement
  const pass = pos.clone(); pass.side = 0; pass.h1 = (pass.h1 ^ ZS1) >>> 0; pass.h2 = (pass.h2 ^ ZS2) >>> 0; pass.quiet++;
  let best = -quiesce(pass, -b, -a, ply + 1, qd + 1);
  if (best > a) a = best;
  if (a >= b) return best;
  for (const m of pos.gooseMoves([])) {
    const fr = m % 64 - 1, to = (m >> 6) - 1;
    if (!hot[fr] && !hot[to]) continue;
    nodes++;
    const q = pos.clone().play(m), tv = terminal(q, ply + 1);
    const v = tv !== null ? -tv : -quiesce(q, -b, -a, ply + 1, qd + 1);
    if (v > best) best = v; if (v > a) a = v; if (a >= b) break;
  }
  return best;
}
const _hot = new Uint8Array(NN);
function rootValues(pos, d) {
  const out = []; PATHH[0] = pos.h1;
  for (const m of orderMoves(pos, pos.moves(), -1, 0)) {
    ROOTD = d; const q = pos.clone().play(m), v = -search(q, d - 1, -WIN - 1, WIN + 1, 1);
    if (stop) break;
    out.push({ m, v });
  }
  out.sort((x, y) => y.v - x.v);
  return out;
}
function bestMove(pos, maxD, ms, nk) {
  nodes = 0; stop = false; tEnd = Date.now() + (ms || 20000); nodeLimit = nk ? nk * 1000 : Infinity; kreset();
  const all = pos.moves(); PATHH[0] = pos.h1;
  let best = all[0], bv = 0, depth = 0, order = orderMoves(pos, all, -1, 0);
  for (let d = 1; d <= maxD; d++) {
    ROOTD = d;
    let a = -WIN - 1, bm = order[0], bestV = -Infinity;
    for (let i = 0; i < order.length; i++) {
      const m = order[i], q = pos.clone().play(m);
      let v;
      if (i === 0) v = -search(q, d - 1, -WIN - 1, -a, 1);
      else { v = -search(q, d - 1, -a - 1, -a, 1); if (v > a && !stop) v = -search(q, d - 1, -WIN - 1, -a, 1); }
      if (stop) break;
      if (v > bestV) { bestV = v; bm = m; }
      if (v > a) a = v;
    }
    if (stop && bestV === -Infinity) break;
    if (!stop || bestV >= bv) { best = bm; bv = bestV; }
    if (stop) break;
    depth = d;
    order = [bm].concat(order.filter(x => x !== bm));
    if (Math.abs(bv) > WINT) break;
  }
  return { move: best, v: bv, depth };
}
// a lost position: the move that loses latest; among those the one that keeps the most (geese / room)
function resist(pos, list) {
  let worst = -Infinity; for (const e of list) worst = Math.max(worst, e.v);
  const pool = list.filter(e => e.v === worst);
  let bm = pool[0].m, bs = -Infinity;
  for (const e of pool) { const q = pos.clone().play(e.m), s = pos.side ? q.geese * 20 - q.foxRoom() - q.foxJumps() * 8 : q.foxRoom() + q.foxJumps() * 4; if (s > bs) { bs = s; bm = e.m; } }
  return bm;
}
let PRO_CFG = null;
function think(start, moves, level, rand, rule) {
  if (rule) setRule(rule);
  rand = rand || Math.random;
  const L = PRO_CFG || LEVELS[level] || LEVELS[10];
  const { pos, hashes } = replay(start, moves); setHist(hashes);
  const all = pos.moves();
  if (!all.length) return { move: -1 };
  if (all.length === 1) return { move: all[0] };
  if (L.s && !PRO_CFG) { const b = bookMove(pos, all); if (b >= 0) return { move: b, book: true }; }
  if (!L.s) {
    nodes = 0; stop = false; tEnd = Date.now() + 2500; nodeLimit = Infinity; kreset();
    const vals = rootValues(pos, L.d);
    if (!vals.length) return { move: all[0] };
    if (vals[0].v < -WINT) return { move: resist(pos, vals), v: vals[0].v };
    let best = vals[0].m, bv = -Infinity;
    for (const e of vals) { const x = e.v + (Math.abs(e.v) > WINT ? 0 : gauss(rand) * L.noise); if (x > bv) { bv = x; best = e.m; } }
    return { move: best, v: vals[0].v };
  }
  const r = bestMove(pos, L.dx || 60, L.ms || 0, L.nk || (L.ms ? 0 : 50));
  if (r.v < -WINT && r.depth > 0) {
    nodes = 0; stop = false; tEnd = Date.now() + 800; nodeLimit = Infinity;
    const vals = rootValues(pos, Math.max(1, r.depth));
    if (!stop && vals.length) return { move: resist(pos, vals), v: r.v, depth: r.depth };
  }
  return { move: r.move, v: r.v, depth: r.depth };
}
const kindOf = v => v > WINT ? 'win' : v < -WINT ? 'loss' : 'heur';
// ---------------------------------------------------------------- several threads (shared/mtsplit.js: plain workers of this file share
// the root moves — the 'ladder' protocol of konane / ugolki: mtplan → mtv per root move → mtpv → mtfin). 2026-11-18. Each worker keeps
// its own table (sticky: a root move goes back to the worker that searched it before).
let mtRule = '';
function mtNode(m) {
  if (mtRule !== RK) { ttClear(); mtRule = RK; }
  const line = m.line || [], { pos, hashes } = replay(m.start, m.moves.concat(line));
  setHist(hashes.slice(0, hashes.length - line.length));   // the game's own repetitions (before the root)
  const base = hashes.length - 1 - line.length;
  for (let k = 0; k <= line.length; k++) PATHH[k & 255] = hashes[base + k];   // the line from the root, for the in-line repetitions
  return { pos, ply: line.length };
}
function mtPlan(m) {
  const { pos } = replay(m.start, m.moves), all = pos.moves(), inf = WIN + 1;
  if (m.job === 'think') {
    const L = m.cfg || LEVELS[m.level] || LEVELS[10];
    if (!m.cfg && L.s && bookMove(pos, all) >= 0) return { result: { move: bookMove(pos, all), book: true } };
    if (all.length < 2 || !L.s) { PRO_CFG = m.cfg || null; try { return { result: think(m.start, m.moves, m.level) }; } finally { PRO_CFG = null; } }
    kreset();
    return { plan: { kind: 'best', moves: orderMoves(pos, all, -1, 0), inf, maxD: L.dx || 60, ms: L.ms || 0, nodes: (L.nk || (L.ms ? 0 : 50)) * 1000, win: WINT, partialIfBetter: true, splitMin: 99, lmr: { d: 3, i: 5 }, specRes: 0, sticky: true } };
  }
  if (!all.length) return { result: { list: [], depth: 0 } };
  const cands = m.job === 'cands';
  return { plan: { kind: 'all', sticky: true, moves: orderMoves(pos, all, -1, 0), inf, maxD: 40, ms: m.time || (cands ? 1200 : 1000), win: WINT, stopAll: true, progress: true, pv: cands ? m.plies || 7 : 0, pvK: m.k || 5 } };
}
function mtV(m) {
  const { pos, ply } = mtNode(m);
  nodes = 0; stop = false; tEnd = m.until || Infinity; nodeLimit = m.nl || Infinity; ROOTD = m.d + ply;
  const v = search(pos, m.d, m.wa, m.wb, ply);
  return { v, ok: !stop, nodes };
}
function thinkFin(pos, r) {   // (the end of think(): a lost position — resist as long as possible)
  if (r.v < -WINT && r.depth > 0) {
    nodes = 0; stop = false; tEnd = Date.now() + 800; nodeLimit = Infinity;
    const vals = rootValues(pos, Math.max(1, r.depth));
    if (!stop && vals.length) return { move: resist(pos, vals), v: r.v, depth: r.depth };
  }
  return { move: r.move, v: r.v, depth: r.depth };
}
function mtFin(m) {
  const r = m.raw;
  if (m.job === 'think') { const { pos, hashes } = replay(m.start, m.moves); setHist(hashes); return { result: thinkFin(pos, { move: r.m, v: r.v, depth: r.depth }) }; }
  let list = (r.list || []).map(e => Object.assign({ m: e.m, v: e.v, kind: kindOf(e.v) }, e.pv ? { pv: e.pv } : {}));
  if (!list.length) { const { pos } = replay(m.start, m.moves); list = pos.moves().map(x => ({ m: x, v: 0, kind: 'heur' })); }
  if (m.job === 'cands') list = list.slice(0, m.k || 5);
  return { result: { list, depth: r.depth } };
}
function analyze(start, moves, ms, onProgress, rule) {
  if (rule) setRule(rule);
  const { pos, hashes } = replay(start, moves); setHist(hashes);
  nodes = 0; stop = false; tEnd = Date.now() + (ms || 1000); nodeLimit = Infinity; kreset();
  let list = [], depth = 0;
  const n = pos.moves().length;
  for (let d = 1; d <= 40; d++) {
    const vals = rootValues(pos, d);
    if (stop && vals.length < n) break;
    list = vals.map(e => ({ ...e, kind: kindOf(e.v) })); depth = d;
    if (onProgress) onProgress(list, d);
    if (stop) break;
    if (list.every(e => Math.abs(e.v) > WINT)) break;
  }
  if (!list.length) list = pos.moves().map(m => ({ m, v: 0, kind: 'heur' }));
  return { list, depth };
}
function pvOf(start, moves, m, plies) {
  const pv = [], { pos } = replay(start, moves.concat([m]));
  for (let i = 1; i < (plies || 7); i++) {
    if (judge(pos).over) break;
    const r = bestMove(pos, 4, 120, 4);
    if (r.move == null || r.move < 0) break;
    pv.push(r.move); pos.play(r.move);
  }
  return pv;
}
function cands(start, moves, ms, k, plies, onProgress, rule) {
  if (rule) setRule(rule);
  const r = analyze(start, moves, ms, onProgress);
  const list = r.list.slice().sort((a, b) => b.v - a.v).slice(0, k || 5);
  for (const e of list) e.pv = pvOf(start, moves, e.m, plies);
  return { list, depth: r.depth };
}
// ---------------------------------------------------------------- solvers (puzzles and lessons)
// goal 'take': the fox has taken `gain` more geese within n of its moves, whatever the geese reply (and cannot be shut in at once)
// goal 'win' : the game ends with the mover as the winner within n of its own moves (the geese: the fox is shut in)
let solveBudget = Infinity;
function goalMet(pos, me, G) {
  const j = judge(pos);
  if (G.goal === 'win') return j.over && j.winner === me;
  if (j.over) return j.winner === me;
  return pos.cap >= G.base + (G.gain || 1);
}
function goalW(pos, k, me, G) {
  if (--solveBudget < 0) return false;
  if (judge(pos).over) return false;
  for (const m of orderMoves(pos, pos.moves(), -1, 0)) {
    const q = pos.clone().play(m);
    if (goalMet(q, me, G)) return true;
    if (k > 1 && !judge(q).over && goalB(q, k - 1, me, G)) return true;
  }
  return false;
}
function goalB(pos, k, me, G) {
  const L = pos.moves();
  if (!L.length) return false;
  for (const m of L) {
    const q = pos.clone().play(m);
    if (goalMet(q, me, G)) continue;
    if (judge(q).over) return false;
    if (!goalW(q, k, me, G)) return false;
  }
  return true;
}
const goalOf = (pos, g) => ({ goal: g && g.goal || (pos.side ? 'win' : 'take'), gain: g && g.gain || 1, base: pos.cap });
function goalGood(start, moves, n, g, rule, budget) {
  if (rule) setRule(rule);
  setHist(null);
  const { pos } = replay(start, moves), me = pos.side + 1, G = g && g.base != null ? g : goalOf(pos, g), out = [];
  solveBudget = budget || 400000;
  for (const m of pos.moves()) {
    const q = pos.clone().play(m);
    if (goalMet(q, me, G) || (n > 1 && !judge(q).over && goalB(q, n - 1, me, G))) out.push(m);
    if (solveBudget < 0) { solveBudget = Infinity; return null; }
  }
  solveBudget = Infinity;
  return out.length ? out : null;
}
function goalMin(start, moves, max, g, rule, budget) {
  for (let n = 1; n <= max; n++) { const list = goalGood(start, moves, n, g, rule, budget); if (list) return { n, list }; }
  return null;
}
function goalReply(start, moves, n, G, rule) {
  if (rule) setRule(rule);
  setHist(null);
  const { pos } = replay(start, moves), me = 2 - pos.side;
  let best = -1, bk = -1, bv = -Infinity;
  for (const m of pos.moves()) {
    const q = pos.clone().play(m);
    let need = 0;
    if (!goalMet(q, me, G)) {
      need = 99;
      if (!judge(q).over) for (let k = 1; k <= n; k++) { solveBudget = 200000; if (goalW(q, k, me, G)) { need = k; break; } }
      solveBudget = Infinity;
    }
    nodes = 0; stop = false; tEnd = Date.now() + 200; nodeLimit = 3000;
    const v = search(q, 2, -WIN - 1, WIN + 1, 1);
    if (need > bk || (need === bk && v > bv)) { bk = need; bv = v; best = m; }
  }
  return { move: best, need: bk };
}

setRule(DEFAULT_RULE);
const API = { N, NN, P1, P2, WIN, WINT, get QUIET_MAX() { return QUIET_MAX; }, QUIET_OPTS, DEFAULT_QUIET, get quiet() { return QUIET_MAX / 2; }, setQuiet, FOX_WINS_AT, RULES, RULE_ORDER, DEFAULT_RULE, get rule() { return RK; }, get R() { return R; }, setRule, setFirst, get first() { return FIRST ? P2 : P1; },
  RC, ON, POINTS, NBR, START, sqAt, sqName, pack, mRm: () => -1, path: (pos, m) => path(m === undefined ? pos : m), mv, mFrom, mTo, jumped, Pos, effect, captured, name, parse, replay, judge,
  LEVELS, think, bookKey, analyze, cands, pvOf, evaluate, foxArea, kindOf, EW, goalGood, goalMin, goalReply, goalOf, goalMet, ttClear,
  get nodes() { return nodes; } };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof self !== 'undefined' && typeof importScripts === 'function' && typeof window === 'undefined') {
  self.onmessage = e => {
    const m = e.data;
    try {
      setRule(m.rule || DEFAULT_RULE); setFirst(m.first); setQuiet(m.quiet);
      if (m.type === 'think') { PRO_CFG = m.cfg || null; let r; try { r = think(m.start, m.moves, m.level); } finally { PRO_CFG = null; } self.postMessage({ id: m.id, type: 'result', ...r, nodes }); }
      else if (m.type === 'analyze') {
        const r = analyze(m.start, m.moves, m.time || 1000, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth }));
        self.postMessage({ id: m.id, type: 'result', ...r, nodes });
      } else if (m.type === 'cands') self.postMessage({ id: m.id, type: 'result', nodes, ...cands(m.start, m.moves, m.time || 1200, m.k, m.plies, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth })) });
      else if (m.type === 'goal') { const g = goalGood(m.start, m.moves, m.n, m.g); self.postMessage({ id: m.id, type: 'result', list: g ? g.map(x => ({ m: x, need: m.n })) : null }); }
      else if (m.type === 'goalReply') self.postMessage({ id: m.id, type: 'result', ...goalReply(m.start, m.moves, m.n, m.g) });
      else if (m.type === 'newgame') { ttClear(); self.postMessage({ id: m.id, type: 'result' }); }
      else if (m.type === 'mtplan') self.postMessage({ id: m.id, type: 'result', ...mtPlan(m) });
      else if (m.type === 'mtv') self.postMessage({ id: m.id, type: 'result', core: 'js', ...mtV(m) });
      else if (m.type === 'mtpv') self.postMessage({ id: m.id, type: 'result', pv: pvOf(m.start, m.moves, m.m, m.plies) });
      else if (m.type === 'mtfin') { const f = mtFin(m); if (f.result) f.result.core = 'js'; self.postMessage({ id: m.id, type: 'result', ...f }); }
    } catch (err) { self.postMessage({ id: m.id, type: 'result', error: String(err && err.stack || err) }); }
  };
}
if (typeof window !== 'undefined') window.FoxEngine = API;
})();

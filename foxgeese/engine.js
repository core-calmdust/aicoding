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
  return pos.side ? -v : v;
}
// ---------------------------------------------------------------- the learned evaluation (2026-11-18): a small network over the geese as
// seen from the fox (index foxPoint × 33 + goosePoint), the side to move and the quiet-move clock; trained on self-play
// (tools/gen_data.js → tools/train_eval.py → tools/pack_eval.js). Used for the 15-goose rule; the others keep evaluateN / evaluate.
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
  LEVELS, think, analyze, cands, pvOf, evaluate, foxArea, kindOf, EW, goalGood, goalMin, goalReply, goalOf, goalMet, ttClear,
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

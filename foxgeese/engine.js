// Fox and Geese — rules (for the page) and the AI worker (plain JS search).
// Works as a Web Worker (postMessage API), as a plain <script> (window.FoxEngine) and as a Node module.
//
// Board: the 33 points of the cross-shaped board, kept in a 7×7 grid: index = r * 7 + c, r = 0 the top row (7), c = 0 file a.
// Rows 0-1 and 5-6 have the three middle points only. Lines join every point to its orthogonal neighbours; the points
// with (r + c) even also have diagonals (the Alquerque pattern, so the centre has eight lines).
// P1 = the Fox (one piece, starts in the middle, moves first), P2 = the Geese (they start on the near side).
// Rule sets (claude/foxgeese-spec.md has the sources):
//   g13 — the traditional game: 13 geese, they move one step along any line (backwards too)
//   g17 — 17 geese (the two outer points of the middle row on each side as well): they move one step straight forward
//         or sideways only — never backwards, never diagonally
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
  g13: { geese: 13, back: true, diag: true },
  g17: { geese: 17, back: false, diag: false },
};
const RULE_ORDER = ['g13', 'g17'];
const FOX_WINS_AT = 5;                // geese left: they can no longer shut the fox in
const QUIET_MAX = 160;                // plies without a capture that end the game as a draw (this program's own rule)
const MAX_JUMPS = 7;
let R = RULES.g13, RK = 'g13';
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
function setRule(k) { RK = RULES[k] ? k : 'g13'; R = RULES[RK]; }
// ---------------------------------------------------------------- zobrist
let seed = 0x2b7e1516;
function rnd() { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed; }
const Z1 = [new Uint32Array(NN), new Uint32Array(NN)], Z2 = [new Uint32Array(NN), new Uint32Array(NN)];
for (let k = 0; k < 2; k++) for (let i = 0; i < NN; i++) { Z1[k][i] = rnd(); Z2[k][i] = rnd(); }
const ZS1 = rnd(), ZS2 = rnd();
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
const START = { g13: [], g17: [] };
for (let i = 0; i < NN; i++) if (ON[i] && RC[i][0] >= 4) { START.g13.push(i); START.g17.push(i); }
START.g17.push(21, 22, 26, 27);       // a4 b4 f4 g4

class Pos {
  constructor() { this.sq = new Int8Array(NN); this.fox = 24; this.side = 0; this.ply = 0; this.quiet = 0; this.cap = 0; this.reset(); }
  reset() { this.sq.fill(0); for (const i of START[RK]) this.sq[i] = P2; this.fox = 24; this.sq[24] = P1; this.side = 0; this.ply = 0; this.quiet = 0; this.cap = 0; this.rehash(); }
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
  clone() { const q = Object.create(Pos.prototype); q.sq = this.sq.slice(); q.fox = this.fox; q.side = this.side; q.ply = this.ply; q.quiet = this.quiet; q.cap = this.cap; q.h1 = this.h1; q.h2 = this.h2; return q; }
  rehash() {
    let a = 0, c = 0;
    for (let i = 0; i < NN; i++) { const x = this.sq[i]; if (x) { a ^= Z1[x - 1][i]; c ^= Z2[x - 1][i]; } }
    if (this.side) { a ^= ZS1; c ^= ZS2; }
    this.h1 = a >>> 0; this.h2 = c >>> 0;
  }
  // the page's piece kinds: 0 empty, 1 = the fox (P1), 3 = a goose (P2)
  at(i) { const x = this.sq[i]; return x === 1 ? 1 : x === 2 ? 3 : 0; }
  owner(i) { return this.sq[i]; }
  get turn() { return this.side ? P2 : P1; }
  get geese() { let n = 0; for (const i of POINTS) if (this.sq[i] === P2) n++; return n; }
  count(p) { return p === P1 ? (this.fox >= 0 ? 1 : 0) : this.geese; }
  // the fox's moves: steps, and every way of jumping (each stop of each line of jumps is a move)
  foxMoves(out) {
    const sq = this.sq, f = this.fox; if (f < 0) return out;
    for (const [n] of NBR[f]) if (!sq[n]) out.push(pack([f, n]));
    const pts = [f], gone = new Set();
    const rec = at => {
      if (pts.length > MAX_JUMPS) return;
      for (const [n, b] of NBR[at]) {
        if (b < 0 || sq[n] !== P2 || gone.has(n) || (sq[b] && b !== f)) continue;
        gone.add(n); pts.push(b); out.push(pack(pts)); rec(b); pts.pop(); gone.delete(n);
      }
    };
    rec(f);
    return out;
  }
  // how many empty points the fox can step to / how many single jumps it has
  foxRoom() { let n = 0; for (const [x] of NBR[this.fox]) if (!this.sq[x]) n++; return n; }
  foxJumps() { let n = 0; for (const [x, b] of NBR[this.fox]) if (b >= 0 && this.sq[x] === P2 && !this.sq[b]) n++; return n; }
  gooseMoves(out) {
    const sq = this.sq;
    for (const i of POINTS) {
      if (sq[i] !== P2) continue;
      for (const [n, , dr, dc] of NBR[i]) {
        if (sq[n]) continue;
        if (!R.diag && dr && dc) continue;
        if (!R.back && dr > 0) continue;       // the geese start on the near side (high rows): forward is up the board
        out.push(pack([i, n]));
      }
    }
    return out;
  }
  moves() { return this.side ? this.gooseMoves([]) : this.foxMoves([]); }
  play(m) {
    const p = path(m), f = p[0], t = p[p.length - 1], x = this.sq[f];
    let took = 0;
    if (x === P1) for (const g of jumped(m)) { this.sq[g] = 0; this.h1 ^= Z1[1][g]; this.h2 ^= Z2[1][g]; took++; }
    this.sq[f] = 0; this.sq[t] = x; if (x === P1) this.fox = t;
    this.h1 ^= Z1[x - 1][f] ^ Z1[x - 1][t] ^ ZS1; this.h2 ^= Z2[x - 1][f] ^ Z2[x - 1][t] ^ ZS2;
    this.h1 >>>= 0; this.h2 >>>= 0;
    this.cap += took; this.quiet = took ? 0 : this.quiet + 1;
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
// {over, winner, draw, why}: 'few' (five geese or fewer) | 'trap' (the fox cannot move) | 'stuck' (the geese cannot move) | 'quiet'
function judge(pos) {
  if (pos.geese <= FOX_WINS_AT) return { over: true, winner: P1, why: 'few' };
  if (!pos.side) { if (!pos.foxMoves([]).length) return { over: true, winner: P2, why: 'trap' }; }
  else if (!pos.gooseMoves([]).length) return { over: true, winner: P1, why: 'stuck' };
  if (pos.quiet >= QUIET_MAX) return { over: true, winner: 0, draw: true, why: 'quiet' };
  return { over: false };
}
// ---------------------------------------------------------------- AI levels (20 steps: Lv.1 … Lv.20)
const LEVELS = [null,
  { d: 1, noise: 90 }, { d: 1, noise: 55 }, { d: 2, noise: 70 }, { d: 2, noise: 45 }, { d: 2, noise: 25 },
  { d: 3, noise: 30 }, { d: 3, noise: 15 }, { d: 4, noise: 18 }, { d: 4, noise: 8 }, { d: 5, noise: 6 },
  { s: 1, nk: 4 }, { s: 1, nk: 8 }, { s: 1, nk: 15 }, { s: 1, nk: 30 }, { s: 1, nk: 60 },
  { s: 1, nk: 110 }, { s: 1, nk: 200 }, { s: 1, nk: 350 },
  { s: 1, ms: 1500 }, { s: 1, ms: 3000 },
];
function gauss(rand) { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
// ---------------------------------------------------------------- evaluation (the side to move's view; 100 = one goose)
// The fox: geese taken, room to move, geese it can jump at once, geese standing without cover (a jump after one move).
// The geese: how far up the board they have come and how tightly they stand (a goose with a friend straight behind
// it on every line cannot be jumped).
const EW = { goose: 100, room: 6, jump: 26, loose: 4, adv: 5, area: 9 };
// the empty points the fox can walk to (steps only): the pen the geese are closing
const _seen = new Uint8Array(NN), _stack = new Int16Array(NN);
function foxArea(pos) {
  const sq = pos.sq; _seen.fill(0); let n = 0, top = 0; _stack[top++] = pos.fox; _seen[pos.fox] = 1;
  while (top) { const a = _stack[--top]; for (const [x] of NBR[a]) if (!sq[x] && !_seen[x]) { _seen[x] = 1; n++; _stack[top++] = x; } }
  return n;
}
function evaluate(pos) {
  const sq = pos.sq;
  let v = -pos.geese * EW.goose + pos.foxRoom() * EW.room + pos.foxJumps() * EW.jump * (pos.side ? .5 : 1) + foxArea(pos) * EW.area;
  let loose = 0, adv = 0;
  for (const i of POINTS) {
    if (sq[i] !== P2) continue;
    adv += 6 - RC[i][0];
    for (const [n, b] of NBR[i]) if (b >= 0 && !sq[n] && !sq[b]) { loose++; break; }   // an empty line through it: it can be jumped once the fox gets beside it
  }
  v += loose * EW.loose - adv * EW.adv;
  v += RK === 'g13' ? 1210 : 1640;      // (centred: the start is about 0)
  return pos.side ? -v : v;
}
// ---------------------------------------------------------------- search
let nodes = 0, stop = false, tEnd = 0, nodeLimit = Infinity;
const TT = new Map(), killers = [];
function kreset() { killers.length = 0; }
function ttClear() { TT.clear(); }
function terminal(pos, ply) {
  const j = judge(pos);
  if (!j.over) return null;
  if (j.draw) return 0;
  return j.winner === pos.side + 1 ? WIN - ply : -WIN + ply;
}
function orderMoves(pos, L, ttm, ply) {
  const k = killers[ply], f = pos.fox;
  const sc = L.map(m => {
    if (m === ttm) return 1e6;
    let s = 0;
    if (!pos.side) s += (path(m).length - 2) * 400;
    else { const t = mTo(m); s += Math.max(0, 4 - Math.max(Math.abs(RC[t][0] - RC[f][0]), Math.abs(RC[t][1] - RC[f][1]))) * 6; }
    if (k && (k[0] === m || k[1] === m)) s += 200;
    return s;
  });
  return L.map((_, i) => i).sort((a, b) => sc[b] - sc[a] || a - b).map(i => L[i]);
}
function search(pos, d, a, b, ply) {
  nodes++;
  if ((nodes & 1023) === 0 && (Date.now() > tEnd || nodes > nodeLimit)) stop = true;
  if (stop) return 0;
  const tv = terminal(pos, ply); if (tv !== null) return tv;
  if (d <= 0) return quiesce(pos, a, b, ply, 0);
  const e = TT.get(pos.h1), a0 = a;
  let ttm = -1;
  if (e && e.h2 === pos.h2) {
    ttm = e.m;
    if (e.d >= d) {
      let v = e.v; if (v > WINT) v -= ply; else if (v < -WINT) v += ply;
      if (e.f === 0) return v;
      if (e.f === 1 && v >= b) return v;
      if (e.f === 2 && v <= a) return v;
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
    if (a >= b) { const k = killers[ply] || (killers[ply] = [-1, -1]); if (k[0] !== m) { k[1] = k[0]; k[0] = m; } break; }
  }
  if (TT.size > 700000) TT.clear();
  let sv = best; if (sv > WINT) sv += ply; else if (sv < -WINT) sv -= ply;
  TT.set(pos.h1, { h2: pos.h2, d, v: sv, m: bm, f: best <= a0 ? 2 : best >= b ? 1 : 0 });
  return best;
}
// quiet search: the fox's jumps
function quiesce(pos, a, b, ply, qd) {
  const stand = evaluate(pos);
  if (pos.side || qd >= 3) return stand;
  if (stand >= b) return stand; if (stand > a) a = stand;
  let best = stand;
  for (const m of pos.foxMoves([])) {
    if (path(m).length === 2 && !jumped(m).length) continue;
    nodes++;
    const q = pos.clone().play(m), tv = terminal(q, ply + 1);
    const v = tv !== null ? -tv : -evaluate(q);
    if (v > best) best = v; if (v > a) a = v; if (a >= b) break;
  }
  return best;
}
function rootValues(pos, d) {
  const out = [];
  for (const m of orderMoves(pos, pos.moves(), -1, 0)) {
    const q = pos.clone().play(m), v = -search(q, d - 1, -WIN - 1, WIN + 1, 1);
    if (stop) break;
    out.push({ m, v });
  }
  out.sort((x, y) => y.v - x.v);
  return out;
}
function bestMove(pos, maxD, ms, nk) {
  nodes = 0; stop = false; tEnd = Date.now() + (ms || 20000); nodeLimit = nk ? nk * 1000 : Infinity; kreset();
  const all = pos.moves();
  let best = all[0], bv = 0, depth = 0, order = orderMoves(pos, all, -1, 0);
  for (let d = 1; d <= maxD; d++) {
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
  const { pos } = replay(start, moves);
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
function analyze(start, moves, ms, onProgress, rule) {
  if (rule) setRule(rule);
  const { pos } = replay(start, moves);
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

setRule('g13');
const API = { N, NN, P1, P2, WIN, WINT, QUIET_MAX, FOX_WINS_AT, RULES, RULE_ORDER, get rule() { return RK; }, get R() { return R; }, setRule,
  RC, ON, POINTS, NBR, START, sqAt, sqName, pack, mRm: () => -1, path: (pos, m) => path(m === undefined ? pos : m), mv, mFrom, mTo, jumped, Pos, effect, captured, name, parse, replay, judge,
  LEVELS, think, analyze, cands, pvOf, evaluate, foxArea, kindOf, EW, goalGood, goalMin, goalReply, goalOf, goalMet, ttClear,
  get nodes() { return nodes; } };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof self !== 'undefined' && typeof importScripts === 'function' && typeof window === 'undefined') {
  self.onmessage = e => {
    const m = e.data;
    try {
      setRule(m.rule || 'g13');
      if (m.type === 'think') { PRO_CFG = m.cfg || null; let r; try { r = think(m.start, m.moves, m.level); } finally { PRO_CFG = null; } self.postMessage({ id: m.id, type: 'result', ...r, nodes }); }
      else if (m.type === 'analyze') {
        const r = analyze(m.start, m.moves, m.time || 1000, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth }));
        self.postMessage({ id: m.id, type: 'result', ...r, nodes });
      } else if (m.type === 'cands') self.postMessage({ id: m.id, type: 'result', nodes, ...cands(m.start, m.moves, m.time || 1200, m.k, m.plies, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth })) });
      else if (m.type === 'goal') { const g = goalGood(m.start, m.moves, m.n, m.g); self.postMessage({ id: m.id, type: 'result', list: g ? g.map(x => ({ m: x, need: m.n })) : null }); }
      else if (m.type === 'goalReply') self.postMessage({ id: m.id, type: 'result', ...goalReply(m.start, m.moves, m.n, m.g) });
      else if (m.type === 'newgame') { ttClear(); self.postMessage({ id: m.id, type: 'result' }); }
    } catch (err) { self.postMessage({ id: m.id, type: 'result', error: String(err && err.stack || err) }); }
  };
}
if (typeof window !== 'undefined') window.FoxEngine = API;
})();

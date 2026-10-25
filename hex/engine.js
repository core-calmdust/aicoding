// Hex — rules (for the page) and the AI worker (WebAssembly MCTS + forced-connection solver from engine.c).
// Works as a Web Worker (postMessage API), as a plain <script> (window.HexEngine) and as a Node module.
//
// Board: n × n rhombus (n = 7, 9, 11, 13 in the game; 3 … 13 supported), cell i = r * n + c (row r from the top,
// column c from the left; written "f6" = column f, row 6). Red (P1) moves first and joins TOP and BOTTOM;
// Blue (P2) joins LEFT and RIGHT. There are no draws: a full board always has exactly one connection.
// Swap rule (swap pieces): with the rule on, Blue's first move may be SWAP — Red's stone is replaced by a Blue stone on
// the mirrored cell (row ↔ column) and Red moves again. The players keep their colours and edges.
// Moves: cell numbers, SWAP = 1023. A game record = { n, swap } + the list of moves (or a start position spec).
(function () {
'use strict';
const P1 = 1, P2 = 2, RED = 1, BLUE = 2, SWAP = 1023;
const WIN = 30000, WINT = 29000;
const SIZES = [7, 9, 11, 13];
const COLS = 'abcdefghijklmnopqrs';
// ring of neighbours: consecutive entries touch each other
const DR = [-1, -1, 0, 1, 1, 0], DC = [0, 1, 1, 0, -1, -1];
const geoC = {};
function geo(n) {
  if (geoC[n]) return geoC[n];
  const NB = [], RC = [];
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n), c = i % n; RC.push([r, c]);
    const L = []; for (let d = 0; d < 6; d++) { const rr = r + DR[d], cc = c + DC[d]; if (rr >= 0 && rr < n && cc >= 0 && cc < n) L.push(rr * n + cc); }
    NB.push(L);
  }
  return (geoC[n] = { NB, RC });
}
const mirror = (i, n) => (i % n) * n + Math.floor(i / n);
const onEdge = (i, n, p, e) => p === RED ? (e ? Math.floor(i / n) === n - 1 : Math.floor(i / n) === 0) : (e ? i % n === n - 1 : i % n === 0);

class Pos {
  constructor(n, swap) { this.n = n || 11; this.swap = swap !== false && swap !== 0; this.b = new Uint8Array(this.n * this.n); this.side = RED; this.ply = 0; this.swapOk = false; this.last = -1; this.swapped = false; }
  // spec: { n, b: n*n chars '.' 'r' 'b', side: 1 | 2 } (a lesson / puzzle position; swap never applies) or null
  static from(spec, n, swap) {
    if (spec && spec.b) {
      const p = new Pos(spec.n || Math.round(Math.sqrt(spec.b.length)), false);
      for (let i = 0; i < p.b.length; i++) p.b[i] = spec.b[i] === 'r' ? RED : spec.b[i] === 'b' ? BLUE : 0;
      p.side = spec.side === BLUE ? BLUE : RED; p.ply = 0; for (let i = 0; i < p.b.length; i++) if (p.b[i]) p.ply++;
      p.fromSpec = true;
      if (spec.sw) { p.swapOk = true; p.swap = true; }   // a lesson position where Blue may still swap the first stone
      return p;
    }
    return new Pos(n || 11, swap);
  }
  clone() { const q = Object.create(Pos.prototype); Object.assign(q, this); q.b = this.b.slice(); return q; }
  get turn() { return this.side; }
  at(i) { return this.b[i]; }
  count(p) { let k = 0; for (const v of this.b) if (v === p) k++; return k; }
  empty() { let k = 0; for (const v of this.b) if (!v) k++; return k; }
  legal(m) { if (m === SWAP) return this.swapOk; return m >= 0 && m < this.b.length && !this.b[m] && !this.winner(); }
  moves() { if (this.winner()) return []; const L = []; for (let i = 0; i < this.b.length; i++) if (!this.b[i]) L.push(i); if (this.swapOk) L.push(SWAP); return L; }
  play(m) {
    if (m === SWAP) {
      let f = -1; for (let i = 0; i < this.b.length; i++) if (this.b[i]) { f = i; break; }
      const g = mirror(f, this.n); this.b[f] = 0; this.b[g] = BLUE; this.side = RED; this.ply++; this.swapOk = false; this.last = g; this.swapped = true;
      this._w = undefined; return this;
    }
    this.b[m] = this.side; this.side = 3 - this.side; this.ply++;
    this.swapOk = !!(this.swap && !this.fromSpec && this.ply === 1);
    this.last = m; this._w = undefined;
    return this;
  }
  // 0 = nobody yet, 1 red, 2 blue
  winner() { if (this._w !== undefined) return this._w; return (this._w = this.path(RED) ? RED : this.path(BLUE) ? BLUE : 0); }
  // the stones of a winning chain of p (a shortest one through p's stones), or null
  path(p) {
    const n = this.n, { NB } = geo(n), prev = new Int32Array(n * n).fill(-2), q = [];
    for (let k = 0; k < n; k++) { const i = p === RED ? k : k * n; if (this.b[i] === p) { prev[i] = -1; q.push(i); } }
    for (let h = 0; h < q.length; h++) {
      const c = q[h];
      if (onEdge(c, n, p, 1)) { const out = []; for (let x = c; x >= 0; x = prev[x]) out.push(x); return out.reverse(); }
      for (const d of NB[c]) if (prev[d] === -2 && this.b[d] === p) { prev[d] = c; q.push(d); }
    }
    return null;
  }
  // empty cells where p would connect at once
  winCells(p) { const out = []; for (let i = 0; i < this.b.length; i++) if (!this.b[i]) { this.b[i] = p; if (this.path(p)) out.push(i); this.b[i] = 0; } return out; }
  // fewest empty cells p still needs for a connection (0-1 BFS), 999 = impossible
  need(p) {
    const n = this.n, { NB } = geo(n), D = new Int32Array(n * n).fill(999), dq = [];
    for (let i = 0; i < n * n; i++) if (onEdge(i, n, p, 0) && this.b[i] !== 3 - p) { D[i] = this.b[i] ? 0 : 1; dq.push(i); }
    dq.sort((a, b) => D[a] - D[b]);
    for (let h = 0; h < dq.length; h++) { const c = dq[h]; for (const d of NB[c]) { if (this.b[d] === 3 - p) continue; const nd = D[c] + (this.b[d] ? 0 : 1); if (nd < D[d]) { D[d] = nd; dq.push(d); } } }
    let best = 999; for (let i = 0; i < n * n; i++) if (onEdge(i, n, p, 1) && D[i] < best) best = D[i];
    return best;
  }
  spec() { let s = ''; for (const v of this.b) s += '.rb'[v]; return { n: this.n, b: s, side: this.side }; }
}
const nameOf = (m, n) => m === SWAP ? 'swap' : (m >= 0 ? COLS[m % n] + (Math.floor(m / n) + 1) : '?');
function name(pos, m) { return nameOf(m, pos.n); }
function parse(pos, s) {
  s = String(s).trim().toLowerCase();
  if (s === 'swap' || s === 'sw' || s === 's') return pos.swapOk ? SWAP : null;
  const mm = s.match(/^([a-s])(\d{1,2})$/); if (!mm) return null;
  const c = COLS.indexOf(mm[1]), r = +mm[2] - 1; if (c < 0 || c >= pos.n || r < 0 || r >= pos.n) return null;
  const m = r * pos.n + c; return pos.legal(m) ? m : null;
}
// start: a position spec, or { n, swap } (the normal empty board)
function replay(start, moves) {
  const pos = start && start.b ? Pos.from(start) : new Pos(start && start.n || 11, !start || start.swap !== false);
  for (const m of moves || []) pos.play(m);
  return { pos };
}
function judge(pos) {
  const w = pos.winner();
  return w ? { over: true, winner: w, why: 'connect' } : { over: false };
}

// ---------------------------------------------------------------- AI levels (20 steps: 15級 … 1級, 初段 … 五段)
// po / ms: playouts or time per move; temp: the move is sampled by visits^(1/temp) (weak levels); rnd: chance of a random
// move; must: tactical shortcuts (1 immediate wins and blocks, 2 forced connections within 2 moves, 3 within 3).
// Measured strength (tools/native.c match, see MODEL_CARD.md) gives the ratings in app.js RT_LV.
const LEVELS = [null,
  { po: 40, temp: 900, rnd: .30, must: 0 },    // 15級
  { po: 60, temp: 800, rnd: .22, must: 0 },
  { po: 90, temp: 700, rnd: .16, must: 0 },
  { po: 130, temp: 600, rnd: .11, must: 1 },
  { po: 200, temp: 500, rnd: .07, must: 1 },
  { po: 300, temp: 420, rnd: .04, must: 1 },   // 10級
  { po: 450, temp: 350, rnd: .02, must: 1 },
  { po: 700, temp: 280, must: 1 },
  { po: 1000, temp: 220, must: 1 },
  { po: 1500, temp: 170, must: 1 },
  { po: 2200, temp: 120, must: 1 },            // 5級
  { po: 3300, temp: 80, must: 2 },
  { po: 5000, temp: 50, must: 2 },
  { po: 7500, temp: 25, must: 2 },
  { po: 11000, must: 2 },                      // 1級
  { po: 16000, must: 3, book: 1 },             // 初段
  { po: 25000, must: 3, book: 1 },
  { po: 40000, must: 3, book: 1 },
  { ms: 1500, must: 3, book: 1 },              // 四段
  { ms: 3000, must: 3, book: 1 },              // 五段
];
// opening knowledge (tools/gen_openings.js, MCTS 4 s per first move): Red's winrate (‰) after each first move, per size
const FIRST = {};
function setFirst(n, arr) { FIRST[n] = arr; }

// ---------------------------------------------------------------- WebAssembly side
let WX = null;
const wIO = () => new Int32Array(WX.memory.buffer, WX.io_ptr(), 8192);
function wSetup(start, moves) {
  const io = wIO();
  if (start && start.b) {
    const p = Pos.from(start); for (const m of moves || []) p.play(m);
    io[0] = p.n; io[1] = p.side; for (let i = 0; i < p.n * p.n; i++) io[2 + i] = p.b[i]; io[2 + p.n * p.n] = p.swapOk ? 1 : 0;
    return WX.setpos();
  }
  const n = start && start.n || 11, sw = !start || start.swap !== false;
  io[0] = n; io[1] = sw ? 1 : 0; io[2] = (moves || []).length; (moves || []).forEach((m, i) => { io[3 + i] = m; });
  return WX.setup();
}
const kindOf = v => Math.abs(v) > WINT ? 'exact' : 'heur';
function gauss(rand) { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// opening choices for the "book" levels and the swap decision of every level
function bookMove(pos, L, rand) {
  const F = FIRST[pos.n];
  if (pos.ply === 0 && !pos.fromSpec) {
    if (!F) return -1;
    const cells = F.map((v, i) => ({ i, v }));
    if (pos.swap) {   // a first move that is hard to judge: close to 50 %, so the opponent's swap gains little
      const fair = cells.filter(e => Math.abs(e.v - 500) <= (L.book ? 45 : 90));
      if (fair.length) return fair[Math.floor(rand() * fair.length)].i;
    }
    cells.sort((a, b) => b.v - a.v);
    const top = cells.slice(0, L.book ? 3 : 8); return top[Math.floor(rand() * top.length)].i;
  }
  if (pos.swapOk && F) {   // swap when the first move is good for Red
    let f = -1; for (let i = 0; i < pos.b.length; i++) if (pos.b[i]) f = i;
    const v = F[f] + (L.book ? 0 : gauss(rand) * (L.temp || 0) * .25);
    return v > 500 ? SWAP : -2;   // -2: do not swap, search a normal move
  }
  return -1;
}
function think(start, moves, level, rand) {
  rand = rand || Math.random;
  const L = LEVELS[level] || LEVELS[10];
  const { pos } = replay(start, moves);
  const all = pos.moves();
  if (!all.length) return { move: -1 };
  if (all.length === 1) return { move: all[0] };
  const bk = bookMove(pos, L, rand);
  if (bk >= 0 || bk === SWAP) return { move: bk };
  if (L.rnd && rand() < L.rnd) { const e = all.filter(m => m !== SWAP); return { move: e[Math.floor(rand() * e.length)] }; }
  if (!WX) { const e = all.filter(m => m !== SWAP); const w = pos.winCells(pos.side); return { move: w.length ? w[0] : e[Math.floor(rand() * e.length)] }; }
  if (!wSetup(start, moves)) return { move: -1 };
  WX.best(L.po || 0, L.ms || 0, bk === -2 ? (L.temp || 0) : (L.temp || 0), Math.floor(rand() * 1e9), L.must || 0);
  const r = wIO();
  let m = r[0];
  if (bk === -2 && m === SWAP) {   // the book said "no swap": take the best cell instead
    WX.analyze(300, 0, 2); const io = wIO(); for (let i = 0; i < io[0]; i++) if (io[2 + 3 * i] !== SWAP) { m = io[2 + 3 * i]; break; }
  }
  return { move: m, v: r[1], po: r[2] };
}
function analyze(start, moves, ms, onProgress, maxList) {
  const { pos } = replay(start, moves);
  if (!WX || pos.winner()) return { list: [], playouts: 0 };
  if (!wSetup(start, moves)) return { list: [], playouts: 0 };
  const read = () => { const io = wIO(), L = []; for (let i = 0; i < io[0]; i++) L.push({ m: io[2 + 3 * i], v: io[3 + 3 * i], n: io[4 + 3 * i], kind: kindOf(io[3 + 3 * i]) }); return L; };
  progressCb = null;
  WX.analyze(ms, 0, maxList || 24);
  return { list: read(), playouts: wIO()[1] };
}
// puzzles: n own moves at most; see engine.c puzzle()
function puzzle(start, moves, n, defend, budgetK) {
  if (!WX) return null;
  if (!wSetup(start, moves)) return null;
  WX.puzzle(n, defend ? 1 : 0, budgetK || 3000);
  const r = wIO(), out = [];
  for (let i = 0; i < r[0]; i++) out.push({ m: r[1 + 2 * i], need: r[2 + 2 * i] });
  return out;
}
let progressCb = null;

const API = { P1, P2, RED, BLUE, SWAP, WIN, WINT, SIZES, COLS, geo, mirror, onEdge, Pos, name, nameOf, parse, replay, judge, LEVELS, FIRST, setFirst, think, analyze, puzzle, kindOf,
  _setWasm: x => { WX = x; } };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof window !== 'undefined') window.HexEngine = API;
else if (typeof self !== 'undefined' && typeof importScripts === 'function') {
  const V = 'v=1';
  let readyP = null;
  if (typeof WebAssembly === 'object' && typeof fetch === 'function') {
    const imp = { env: { now: () => Date.now(), progress: d => { if (progressCb) progressCb(d); } } };
    const url = new URL('engine.wasm?' + V, self.location.href);
    readyP = (WebAssembly.instantiateStreaming ? WebAssembly.instantiateStreaming(fetch(url), imp) : fetch(url).then(r => r.arrayBuffer()).then(b => WebAssembly.instantiate(b, imp)))
      .then(r => { WX = r.instance.exports; }).catch(() => { WX = null; });
  }
  // the opening table (first-move winrates) is in openings.json
  const firstP = fetch(new URL('openings.json?' + V, self.location.href)).then(r => r.json()).then(d => { for (const k in (d.first || {})) FIRST[k] = d.first[k].wr; }).catch(() => {});
  let queue = Promise.resolve();
  self.onmessage = e => {
    const m = e.data;
    queue = queue.then(() => Promise.all([readyP, firstP])).catch(() => {}).then(() => {
      try {
        if (m.type === 'think') self.postMessage({ id: m.id, type: 'result', ...think(m.start, m.moves, m.level) });
        else if (m.type === 'analyze') self.postMessage({ id: m.id, type: 'result', ...analyze(m.start, m.moves, m.time || 1000, null, m.max) });
        else if (m.type === 'puzzle') self.postMessage({ id: m.id, type: 'result', list: puzzle(m.start, m.moves, m.n, m.defend, m.budget) });
        else if (m.type === 'newgame') self.postMessage({ id: m.id, type: 'result' });
      } catch (err) { self.postMessage({ id: m.id, type: 'result', error: String(err && err.stack || err) }); }
    });
  };
}
})();

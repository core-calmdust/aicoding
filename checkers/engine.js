// English checkers — rules (for the page) and the AI worker (WebAssembly search from engine.c).
// Works as a Web Worker (postMessage API), as a plain <script> (window.CheckersEngine) and as a Node module.
//
// Board: 32 dark squares, index 0..31 = standard square numbers 1..32. Row 0 (squares 1-4) is Black's back row at the top
// (seen from White's side). Black (P1) moves first, "down" the board; White (P2) moves up.
// Moves are plain numbers: m = from + 32 * to + 1024 * captured (captured = bit mask of the jumped squares).
// Draws: threefold repetition and the 40-move rule (80 plies without a man move or a capture), also used by online play.
(function () {
'use strict';
const P1 = 1, P2 = 2;
const WIN = 30000, WINT = 29000, DRAW_PLIES = 80;
// ---------------------------------------------------------------- geometry
const NB = [[], [], [], []], JP = [[], [], [], []], RC = [];
for (let i = 0; i < 32; i++) {
  const r = i >> 2, c = i & 3, col = (r & 1) ? 2 * c : 2 * c + 1;
  RC.push([r, col]);
  [[1, -1], [1, 1], [-1, -1], [-1, 1]].forEach(([dr, dc], d) => {
    const nr = r + dr, nc = col + dc;
    NB[d][i] = nr >= 0 && nr < 8 && nc >= 0 && nc < 8 ? nr * 4 + (nc >> 1) : -1;
  });
}
for (let d = 0; d < 4; d++) for (let i = 0; i < 32; i++) JP[d][i] = NB[d][i] >= 0 ? NB[d][NB[d][i]] : -1;
const ROW = r => (0xF << (r * 4)) >>> 0;
const PROMO = [ROW(7), ROW(0)];
const sqAt = (r, c) => (r < 0 || r > 7 || c < 0 || c > 7 || ((r + c) & 1) === 0) ? -1 : r * 4 + (c >> 1);
const bit = i => (1 << i) >>> 0;
const popc = x => { x >>>= 0; let n = 0; while (x) { x = (x & (x - 1)) >>> 0; n++; } return n; };
const bitsOf = x => { const o = []; x >>>= 0; for (let i = 0; i < 32; i++) if (x & bit(i)) o.push(i); return o; };
const dirOk = (side, king, d) => king || (side === 0 ? d < 2 : d >= 2);
// ---------------------------------------------------------------- moves
const mv = (f, t, cap) => f + 32 * t + 1024 * (cap >>> 0);
const mFrom = m => m % 32, mTo = m => Math.floor(m / 32) % 32, mCap = m => Math.floor(m / 1024) >>> 0;
// zobrist (two 32-bit halves)
let zs = 0x2545F491;
const zr = () => { zs ^= zs << 13; zs >>>= 0; zs ^= zs >>> 17; zs ^= zs << 5; zs >>>= 0; return zs; };
const Z1 = [], Z2 = []; for (let k = 0; k < 4; k++) { Z1.push([]); Z2.push([]); for (let i = 0; i < 32; i++) { Z1[k].push(zr()); Z2[k].push(zr()); } }
const ZS1 = zr(), ZS2 = zr();

class Pos {
  constructor() { this.b = 0xFFF; this.w = 0xFFF00000; this.k = 0; this.side = 0; this.quiet = 0; this.rehash(); }
  static from(spec) {   // spec: { b: 32 chars '.' 'b' 'B' 'w' 'W', side: 1 | 2 } or null (the starting position)
    const p = new Pos();
    if (spec && spec.b) {
      p.b = 0; p.w = 0; p.k = 0;
      for (let i = 0; i < 32; i++) { const ch = spec.b[i]; if (ch === 'b' || ch === 'B') p.b = (p.b | bit(i)) >>> 0; if (ch === 'w' || ch === 'W') p.w = (p.w | bit(i)) >>> 0; if (ch === 'B' || ch === 'W') p.k = (p.k | bit(i)) >>> 0; }
      p.side = spec.side === P2 ? 1 : 0; p.quiet = 0; p.rehash();
    }
    return p;
  }
  clone() { const q = Object.create(Pos.prototype); q.b = this.b; q.w = this.w; q.k = this.k; q.side = this.side; q.quiet = this.quiet; q.h1 = this.h1; q.h2 = this.h2; return q; }
  rehash() {
    let a = 0, c = 0;
    for (let i = 0; i < 32; i++) { const x = this.at(i); if (x) { a ^= Z1[x - 1][i]; c ^= Z2[x - 1][i]; } }
    if (this.side) { a ^= ZS1; c ^= ZS2; }
    this.h1 = a >>> 0; this.h2 = c >>> 0;
  }
  // 0 empty, 1 black man, 2 black king, 3 white man, 4 white king
  at(i) { const b = bit(i); if (this.b & b) return this.k & b ? 2 : 1; if (this.w & b) return this.k & b ? 4 : 3; return 0; }
  get turn() { return this.side ? P2 : P1; }
  own(s) { return s ? this.w : this.b; }
  count(p) { return popc(p === P1 ? this.b : this.w); }
  kings(p) { return popc((p === P1 ? this.b : this.w) & this.k); }
  caps() {
    const side = this.side, own = this.own(side) >>> 0, opp = this.own(side ^ 1) >>> 0, occ = (own | opp) >>> 0, out = [];
    const dfs = (start, cur, king, capd, occ2) => {
      let any = false;
      for (let d = 0; d < 4; d++) {
        if (!dirOk(side, king, d)) continue;
        const m = NB[d][cur]; if (m < 0) continue;
        const mb = bit(m); if (!(opp & mb) || (capd & mb)) continue;
        const l = JP[d][cur]; if (l < 0 || (occ2 & bit(l))) continue;
        any = true;
        const nc = (capd | mb) >>> 0;
        if (!king && (PROMO[side] & bit(l))) { out.push(mv(start, l, nc)); continue; }
        dfs(start, l, king, nc, occ2);
      }
      if (!any && capd) { const x = mv(start, cur, capd); if (!out.includes(x)) out.push(x); }
    };
    for (let i = 0; i < 32; i++) if (own & bit(i)) dfs(i, i, !!(this.k & bit(i)), 0, (occ & ~bit(i)) >>> 0);
    return out;
  }
  quietMoves() {
    const side = this.side, own = this.own(side) >>> 0, occ = (this.b | this.w) >>> 0, out = [];
    for (let i = 0; i < 32; i++) {
      if (!(own & bit(i))) continue;
      const king = !!(this.k & bit(i));
      for (let d = 0; d < 4; d++) { if (!dirOk(side, king, d)) continue; const t = NB[d][i]; if (t >= 0 && !(occ & bit(t))) out.push(mv(i, t, 0)); }
    }
    return out;
  }
  moves() { const c = this.caps(); return c.length ? c : this.quietMoves(); }
  hasCaps() { return this.caps().length > 0; }
  // -1: the side to move has no legal move (loses); 0: game goes on
  status() { return this.moves().length ? 0 : -1; }
  promotes(m) { const f = mFrom(m), t = mTo(m); return !(this.k & bit(f)) && !!(PROMO[this.side] & bit(t)); }
  play(m) {
    const s = this.side, f = mFrom(m), t = mTo(m), cap = mCap(m), fb = bit(f), tb = bit(t);
    const pk = this.at(f), irr = !!cap || !(this.k & fb);
    let h1 = this.h1, h2 = this.h2;
    const nk = (pk === 1 || pk === 3) && (PROMO[s] & tb) ? pk + 1 : pk;
    h1 ^= Z1[pk - 1][f] ^ Z1[nk - 1][t]; h2 ^= Z2[pk - 1][f] ^ Z2[nk - 1][t];
    for (let i = 0; i < 32; i++) if (cap & bit(i)) { const x = this.at(i); h1 ^= Z1[x - 1][i]; h2 ^= Z2[x - 1][i]; }
    if (s) this.w = (this.w ^ fb ^ tb) >>> 0; else this.b = (this.b ^ fb ^ tb) >>> 0;
    if (cap) { if (s) this.b = (this.b & ~cap) >>> 0; else this.w = (this.w & ~cap) >>> 0; this.k = (this.k & ~cap) >>> 0; }
    if (this.k & fb) this.k = (this.k ^ fb ^ tb) >>> 0; else if (nk !== pk) this.k = (this.k | tb) >>> 0;
    this.side = s ^ 1; h1 ^= ZS1; h2 ^= ZS2;
    this.h1 = h1 >>> 0; this.h2 = h2 >>> 0;
    this.quiet = irr ? 0 : this.quiet + 1;
    return this;
  }
  spec() { let s = ''; for (let i = 0; i < 32; i++) s += '.bBwW'[this.at(i)]; return { b: s, side: this.side ? P2 : P1 }; }
}
// the landing squares of a capture, from the start (for animation and notation); quiet moves: [from, to]
function path(pos, m) {
  const f = mFrom(m), t = mTo(m), cap = mCap(m);
  if (!cap) return [f, t];
  const side = pos.side, king = !!(pos.k & bit(f)), opp = pos.own(side ^ 1), occ = ((pos.b | pos.w) & ~bit(f)) >>> 0;
  let res = null;
  const dfs = (cur, capd, trail) => {
    if (res) return;
    if (capd === cap && cur === t) { res = trail.slice(); return; }
    for (let d = 0; d < 4; d++) {
      if (!dirOk(side, king, d)) continue;
      const mm = NB[d][cur], l = JP[d][cur]; if (mm < 0 || l < 0) continue;
      const mb = bit(mm); if (!(opp & mb) || (capd & mb) || !(cap & mb) || (occ & bit(l))) continue;
      trail.push(l); dfs(l, (capd | mb) >>> 0, trail); trail.pop();
    }
  };
  dfs(f, 0, [f]);
  return res || [f, t];
}
// standard notation: 11-15, 22x15, 15x24x31 (the intermediate squares are written for multiple jumps)
function name(pos, m) {
  const c = mCap(m);
  if (!c) return (mFrom(m) + 1) + '-' + (mTo(m) + 1);
  return path(pos, m).map(i => i + 1).join('x');
}
function replay(start, moves) {
  const pos = Pos.from(start), hashes = [pos.h1 + ':' + pos.h2];
  for (const m of moves || []) { pos.play(m); hashes.push(pos.h1 + ':' + pos.h2); }
  return { pos, hashes };
}
// game status after the moves: { over, winner (1/2/0), why: 'none' (no pieces) | 'block' (no moves) | 'rep' | 'forty' }
function judge(pos, hashes) {
  if (pos.status() === -1) return { over: true, winner: pos.side ? P1 : P2, why: pos.count(pos.turn) ? 'block' : 'none' };
  if (pos.quiet >= DRAW_PLIES) return { over: true, winner: 0, draw: true, why: 'forty' };
  const h = pos.h1 + ':' + pos.h2; let c = 0; for (const x of hashes) if (x === h) c++;
  if (c >= 3) return { over: true, winner: 0, draw: true, why: 'rep' };
  return { over: false };
}
// parse "11-15", "22x15", "15x24x31" (or "15x31") in the given position
function parse(pos, s) {
  const nums = String(s).split(/[-x×:]/).map(x => parseInt(x, 10) - 1);
  if (nums.length < 2 || nums.some(x => !(x >= 0 && x < 32))) return null;
  const L = pos.moves().filter(m => mFrom(m) === nums[0] && mTo(m) === nums[nums.length - 1]);
  if (L.length <= 1) return L[0] === undefined ? null : L[0];
  for (const m of L) { const p = path(pos, m); if (nums.length === p.length && nums.every((x, i) => x === p[i])) return m; }
  return L[0];
}

// ---------------------------------------------------------------- AI levels (20 steps: 15級 … 1級, 初段 … 五段)
// values: fixed-depth values of all moves, then gaussian noise / an occasional random move (weak levels);
// search: normal best-move search (depth / time). hand: the hand-written evaluation instead of the learned one.
const LEVELS = [null,
  { d: 1, noise: 260, blunder: 0.32, hand: 1 },   // 15級
  { d: 2, noise: 200, blunder: 0.24, hand: 1 },   // 14級
  { d: 2, noise: 150, blunder: 0.18, hand: 1 },   // 13級
  { d: 3, noise: 115, blunder: 0.13, hand: 1 },   // 12級
  { d: 3, noise: 85, blunder: 0.09, hand: 1 },    // 11級
  { d: 4, noise: 65, blunder: 0.06, hand: 1 },    // 10級
  { d: 4, noise: 48, blunder: 0.04, hand: 1 },    // 9級
  { d: 5, noise: 36, blunder: 0.025, hand: 1 },   // 8級
  { d: 6, noise: 26, blunder: 0.015, hand: 1 },   // 7級
  { d: 6, noise: 18, hand: 1 },                   // 6級
  { d: 7, noise: 12, hand: 1 },                   // 5級
  { s: 1, d: 99, nk: 2 },                          // 4級  (about 2,000 positions per move, learned evaluation)
  { s: 1, d: 99, nk: 5 },                          // 3級
  { s: 1, d: 99, nk: 12 },                         // 2級
  { s: 1, d: 99, nk: 30 },                         // 1級
  { s: 1, d: 99, nk: 80, ms: 3000 },               // 初段
  { s: 1, d: 99, nk: 200, ms: 3000 },              // 二段
  { s: 1, d: 99, nk: 500, ms: 3000 },              // 三段
  { s: 1, d: 99, ms: 1000, book: 1 },              // 四段
  { s: 1, d: 99, ms: 2500, book: 1 },              // 五段
];
function gauss(rand) { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// ---------------------------------------------------------------- tiny JS search (fallback when WebAssembly is not available)
function jsEval(p) {
  const s = p.side, own = s ? p.w : p.b, opp = s ? p.b : p.w;
  return 100 * (popc(own) - popc(opp)) + 35 * (popc(own & p.k) - popc(opp & p.k));
}
function jsSearch(p, d, a, b, ply, tEnd) {
  const L = p.moves();
  if (!L.length) return -(WIN - ply);
  if (d <= 0 && !(L.length && mCap(L[0]))) return jsEval(p);
  if (Date.now() > tEnd) return jsEval(p);
  let best = -Infinity;
  for (const m of L) { const q = p.clone().play(m); const v = -jsSearch(q, d - 1, -b, -a, ply + 1, tEnd); if (v > best) { best = v; if (v > a) { a = v; if (a >= b) break; } } }
  return best;
}
function jsValues(p, depth, ms) { const tEnd = Date.now() + (ms || 2000); return p.moves().map(m => ({ m, v: -jsSearch(p.clone().play(m), depth - 1, -Infinity, Infinity, 1, tEnd) })).sort((a, b) => b.v - a.v); }

// ---------------------------------------------------------------- WebAssembly side
let WX = null;
const wIO = () => new Int32Array(WX.memory.buffer, WX.io_ptr(), 8192);
function wSetup(start, moves) {
  const p = Pos.from(start), a = [p.b | 0, p.w | 0, p.k | 0, p.side, moves.length];
  for (const m of moves) { a.push(mFrom(m) | (mTo(m) << 5), mCap(m) | 0); }
  wIO().set(a); return WX.setup();
}
const wMove = (ft, cap) => mv(ft & 31, (ft >> 5) & 31, cap >>> 0);
function wList() { const r = wIO(), L = []; for (let i = 0; i < r[0]; i++) L.push({ m: wMove(r[2 + 3 * i], r[3 + 3 * i]), v: r[4 + 3 * i] }); return L; }
const kindOf = v => Math.abs(v) > WINT ? 'exact' : 'heur';

function think(start, moves, level, rand) {
  rand = rand || Math.random;
  const L = LEVELS[level] || LEVELS[10];
  const { pos } = replay(start, moves);
  const all = pos.moves();
  if (!all.length) return { move: -1 };
  if (all.length === 1) return { move: all[0] };
  if (!WX) {
    const vals = jsValues(pos, Math.min(L.d || 6, 6), 1500);
    if (L.blunder && rand() < L.blunder) return { move: vals[Math.floor(rand() * vals.length)].m };
    let best = vals[0].m, bv = -Infinity; for (const e of vals) { const x = e.v + gauss(rand) * (L.noise || 0); if (x > bv) { bv = x; best = e.m; } } return { move: best };
  }
  if (!wSetup(start, moves)) return { move: -1 };
  if (!L.s) {
    WX.values(L.d, L.hand ? 1 : 0);
    const vals = wList();
    if (L.blunder && rand() < L.blunder) {   // a slip: a random move among the not-hopeless ones
      const ok = vals.filter(e => e.v > vals[0].v - 400); const pool = ok.length > 1 ? ok : vals;
      return { move: pool[Math.floor(rand() * pool.length)].m, v: vals[0].v };
    }
    let best = vals[0].m, bv = -Infinity;
    for (const e of vals) { const x = e.v + (Math.abs(e.v) > WINT ? 0 : gauss(rand) * L.noise); if (x > bv) { bv = x; best = e.m; } }
    return { move: best, v: vals[0].v };
  }
  // opening variety for the top levels: in the first plies pick among moves within a few points of the best
  if (L.book && moves.length < 8 && !start) {
    WX.analyze(Math.max(300, (L.ms || 500) * 0.8), 40);
    const vals = wList(), good = vals.filter(e => e.v >= vals[0].v - 8);
    return { move: good[Math.floor(rand() * good.length)].m, v: vals[0].v };
  }
  WX.best(L.d || 99, L.ms || 0, L.nk || 0);
  const r = wIO();
  if (r[0] < 0) return { move: all[0] };
  return { move: wMove(r[0], r[1]), v: r[2], depth: r[3] };
}
function analyze(start, moves, ms, onProgress) {
  const { pos } = replay(start, moves);
  if (!WX) { const L = jsValues(pos, 6, ms).map(e => ({ ...e, kind: kindOf(e.v) })); return { list: L, depth: 6 }; }
  if (!wSetup(start, moves)) return { list: [], depth: 0 };
  progressCb = onProgress ? (d => onProgress(wList().map(e => ({ ...e, kind: kindOf(e.v) })), d)) : null;
  WX.analyze(ms, 60); progressCb = null;
  return { list: wList().map(e => ({ ...e, kind: kindOf(e.v) })), depth: wIO()[1] };
}
// puzzles: goal 0 = win (the opponent cannot move), g > 0 = win g pieces. See engine.c puzzle().
function puzzle(start, moves, n, defend, goal, base) {
  if (!WX) return null;
  if (!wSetup(start, moves)) return null;
  WX.puzzle(n, defend ? 1 : 0, goal || 0, base || 0, 3000);
  const r = wIO(), out = [];
  for (let i = 0; i < r[0]; i++) out.push({ m: wMove(r[1 + 3 * i], r[2 + 3 * i]), need: r[3 + 3 * i] });
  return out;
}
let progressCb = null;

const API = { P1, P2, WIN, WINT, DRAW_PLIES, NB, JP, RC, sqAt, bit, popc, bitsOf, mv, mFrom, mTo, mCap, Pos, path, name, parse, replay, judge, LEVELS, think, analyze, puzzle, kindOf };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof window !== 'undefined') window.CheckersEngine = API;
else if (typeof self !== 'undefined' && typeof importScripts === 'function') {
  const V = 'v=20261021c';
  let readyP = null;
  if (typeof WebAssembly === 'object' && typeof fetch === 'function') {
    const imp = { env: { now: () => Date.now(), progress: d => { if (progressCb) progressCb(d); } } };
    // SIMD build when the browser supports it (about 1.8x faster with the learned evaluation)
    let simd = false; try { simd = WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])); } catch (e) {}
    const url = new URL((simd ? 'engine_simd.wasm?' : 'engine.wasm?') + V, self.location.href);
    readyP = (WebAssembly.instantiateStreaming ? WebAssembly.instantiateStreaming(fetch(url), imp) : fetch(url).then(r => r.arrayBuffer()).then(b => WebAssembly.instantiate(b, imp)))
      .then(async r => {
        const X = r.instance.exports;
        const gunzip = async u => { const res = await fetch(new URL(u, self.location.href)); if (!res.ok) throw 0; return typeof DecompressionStream === 'function' ? new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer() : null; };
        // learned evaluation (CKN1: magic, H, H2, scale, then the float32 weights)
        try {
          const b = await gunzip('evalnet.bin.gz?' + V);
          if (b) { const dv = new DataView(b); if (dv.getUint32(0, true) === 0x314E4B43) { const H = dv.getUint32(4, true), H2 = dv.getUint32(8, true), sc = dv.getFloat32(12, true), n = 128 * H + H + H * H2 + H2 + H2 + 1; new Float32Array(X.memory.buffer, X.net_ptr(), n).set(new Float32Array(b, 16, n)); X.net_set(H, H2, sc); } }
        } catch (e) {}
        // endgame databases (up to 4 pieces)
        try {
          const b = await gunzip('egdb4.bin.gz?' + V);
          if (b) {
            const dv = new DataView(b), nc = dv.getUint32(4, true); let o = 8 + nc * 8, base = X.heap_base(), need = b.byteLength;
            const cur = X.memory.buffer.byteLength; if (base + need + 65536 > cur) X.memory.grow(Math.ceil((base + need + 65536 - cur) / 65536));
            new Uint8Array(X.memory.buffer, base, b.byteLength - o).set(new Uint8Array(b, o));
            let off = base;
            for (let i = 0; i < nc; i++) { const h = 8 + i * 8, len = dv.getUint32(h + 4, true); X.eg_add(dv.getUint8(h), dv.getUint8(h + 1), dv.getUint8(h + 2), dv.getUint8(h + 3), off); off += len; }
          }
        } catch (e) {}
        WX = X;
      }).catch(() => { WX = null; });
  }
  let queue = Promise.resolve();
  self.onmessage = e => {
    const m = e.data;
    queue = queue.then(() => readyP).catch(() => {}).then(() => {
      try {
        if (m.type === 'think') self.postMessage({ id: m.id, type: 'result', ...think(m.start, m.moves, m.level) });
        else if (m.type === 'analyze') {
          const r = analyze(m.start, m.moves, m.time || 1000, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth }));
          self.postMessage({ id: m.id, type: 'result', ...r });
        } else if (m.type === 'puzzle') self.postMessage({ id: m.id, type: 'result', list: puzzle(m.start, m.moves, m.n, m.defend, m.goal, m.base) });
        else if (m.type === 'newgame') { if (WX) WX.new_game(); self.postMessage({ id: m.id, type: 'result' }); }
      } catch (err) { self.postMessage({ id: m.id, type: 'result', error: String(err && err.stack || err) }); }
    });
  };
}
})();

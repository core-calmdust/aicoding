// Nine Men's Morris engine — rules (nine / twelve / six men's morris), negamax alpha-beta with
// transposition table, quiescence on captures and iterative deepening.
// Works as a Web Worker (postMessage API), as a plain <script> (window.MorrisEngine) and as a Node module.
//
// Points are numbered 0..n-1 (row by row from the top). A move is packed into one int:
//   from (bits 0-4, 31 = placement) | to << 5 | removed << 10 (31 = no removal)
'use strict';
(function () {
const NONE = 31;
const WIN = 30000, WINT = 29000, INF = 32000;
const QUIET_DRAW = 50;            // 50 moves (both sides together) without a removal in the moving phase = draw
const mv = (f, t, r) => f | (t << 5) | (r << 10);
const mFrom = m => m & 31, mTo = m => (m >> 5) & 31, mRm = m => (m >> 10) & 31;

const VARIANTS = {
  nine:   { size: 7, pieces: 9,  fly: true,  diag: false },
  twelve: { size: 7, pieces: 12, fly: true,  diag: true },
  six:    { size: 5, pieces: 6,  fly: false, diag: false },
};
function xorshift(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s | 0; }; }
// (2026-11-14) the xorshift's outputs go through murmur3's fmix32: raw, they are linear over GF(2), so the second half of
// every key was a fixed linear map of the first — the 64-bit keys were only 32 bits (claude/praline-spec.md「Zobrist」)
const zmix = f => () => { let z = f() >>> 0; z ^= z >>> 16; z = Math.imul(z, 0x85ebca6b); z ^= z >>> 13; z = Math.imul(z, 0xc2b2ae35); z ^= z >>> 16; return z | 0; };   // (2026-11-14) murmur3's fmix32 over the xorshift: see the Zobrist keys

const geoms = {};
function geom(name) {
  if (!VARIANTS[name]) name = 'nine';
  if (geoms[name]) return geoms[name];
  const V = VARIANTS[name];
  let pts, mills, extra = [];
  if (name === 'six') {
    pts = [[0, 0], [2, 0], [4, 0], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [3, 2], [4, 2], [1, 3], [2, 3], [3, 3], [0, 4], [2, 4], [4, 4]];
    mills = [[0, 1, 2], [3, 4, 5], [10, 11, 12], [13, 14, 15], [0, 6, 13], [3, 7, 10], [5, 8, 12], [2, 9, 15]];
    extra = [[1, 4], [6, 7], [8, 9], [11, 14]];
  } else {
    pts = [[0, 0], [3, 0], [6, 0], [1, 1], [3, 1], [5, 1], [2, 2], [3, 2], [4, 2], [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3],
      [2, 4], [3, 4], [4, 4], [1, 5], [3, 5], [5, 5], [0, 6], [3, 6], [6, 6]];
    mills = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 13, 14], [15, 16, 17], [18, 19, 20], [21, 22, 23],
      [0, 9, 21], [3, 10, 18], [6, 11, 15], [1, 4, 7], [16, 19, 22], [8, 12, 17], [5, 13, 20], [2, 14, 23]];
    if (V.diag) mills.push([0, 3, 6], [2, 5, 8], [21, 18, 15], [23, 20, 17]);
  }
  const n = pts.length;
  const adj = Array.from({ length: n }, () => []);
  const link = (a, b) => { if (!adj[a].includes(b)) { adj[a].push(b); adj[b].push(a); } };
  for (const [a, b, c] of mills) { link(a, b); link(b, c); }
  for (const [a, b] of extra) link(a, b);
  const pairs = Array.from({ length: n }, () => []);
  for (const m of mills) for (const i of m) { const o = m.filter(x => x !== i); pairs[i].push(o[0], o[1]); }
  const rnd = zmix(xorshift(0x9e3779b9 ^ n * 7919 ^ (V.diag ? 77 : 0)));
  const zp = new Int32Array(3 * n), zp2 = new Int32Array(3 * n), zh = new Int32Array(3 * 16), zh2 = new Int32Array(3 * 16);
  for (let i = 0; i < zp.length; i++) { zp[i] = rnd(); zp2[i] = rnd(); }
  for (let i = 0; i < zh.length; i++) { zh[i] = rnd(); zh2[i] = rnd(); }
  const G = {
    name, n, pts, mills, adj, pairs, size: V.size, pieces: V.pieces, fly: V.fly, diag: V.diag,
    names: pts.map(([x, y]) => 'abcdefg'[x] + (V.size - y)),
    adjFlat: adj.map(a => Int8Array.from(a)), zp, zp2, zh, zh2, zs: rnd(), zs2: rnd(),
  };
  G.index = {}; G.names.forEach((s, i) => (G.index[s] = i));
  return (geoms[name] = G);
}

// ---------------------------------------------------------------- position
class Pos {
  constructor(G) {
    this.G = G; this.b = new Int8Array(G.n); this.hand = new Int8Array(3); this.cnt = new Int8Array(3);
    this.hand[1] = this.hand[2] = G.pieces; this.side = 1; this.quiet = 0; this.stk = [];
    this.rehash();
  }
  static from(G, spec) {
    const p = new Pos(G);
    if (spec) {
      if (spec.b) for (let i = 0; i < G.n; i++) { const v = +spec.b[i] || 0; p.b[i] = v; if (v) p.cnt[v]++; }
      if (spec.h) { p.hand[1] = spec.h[0]; p.hand[2] = spec.h[1]; }
      if (spec.side) p.side = spec.side;
      if (spec.quiet) p.quiet = spec.quiet;
      p.rehash();
    }
    return p;
  }
  clone() { const p = new Pos(this.G); p.b.set(this.b); p.hand.set(this.hand); p.cnt.set(this.cnt); p.side = this.side; p.quiet = this.quiet; p.h1 = this.h1; p.h2 = this.h2; return p; }
  rehash() {
    const G = this.G; let h1 = 0, h2 = 0;
    for (let i = 0; i < G.n; i++) if (this.b[i]) { h1 ^= G.zp[this.b[i] * G.n + i]; h2 ^= G.zp2[this.b[i] * G.n + i]; }
    for (const p of [1, 2]) { h1 ^= G.zh[p * 16 + this.hand[p]]; h2 ^= G.zh2[p * 16 + this.hand[p]]; }
    if (this.side === 2) { h1 ^= G.zs; h2 ^= G.zs2; }
    this.h1 = h1; this.h2 = h2;
  }
  spec() { return { b: Array.from(this.b).join(''), h: [this.hand[1], this.hand[2]], side: this.side, quiet: this.quiet }; }
  placing() { return this.hand[1] > 0 || this.hand[2] > 0; }
  flying(p) { return this.G.fly && this.hand[p] === 0 && this.cnt[p] === 3; }
  inMill(i) {
    const b = this.b, v = b[i], pr = this.G.pairs[i];
    if (!v) return false;
    for (let k = 0; k < pr.length; k += 2) if (b[pr[k]] === v && b[pr[k + 1]] === v) return true;
    return false;
  }
  // would p moving f -> t (f = NONE for placement) close a mill at t?
  closes(p, f, t) {
    const b = this.b, pr = this.G.pairs[t];
    for (let k = 0; k < pr.length; k += 2) { const x = pr[k], y = pr[k + 1]; if (x !== f && y !== f && b[x] === p && b[y] === p) return true; }
    return false;
  }
  removable(o, out) {
    let k = 0; const b = this.b, n = this.G.n;
    for (let i = 0; i < n; i++) if (b[i] === o && !this.inMill(i)) out[k++] = i;
    if (!k) for (let i = 0; i < n; i++) if (b[i] === o) out[k++] = i;
    return k;
  }
  gen(out) {
    const G = this.G, b = this.b, n = G.n, p = this.side, o = 3 - p;
    let k = 0, nr = -1; const rem = this._rem || (this._rem = new Int8Array(32));
    const add = (f, t) => {
      if (this.cnt[o] > 0 && this.closes(p, f, t)) {
        if (nr < 0) nr = this.removable(o, rem);
        for (let j = 0; j < nr; j++) out[k++] = f | (t << 5) | (rem[j] << 10);
      } else out[k++] = f | (t << 5) | (NONE << 10);
    };
    if (this.hand[p] > 0) { for (let t = 0; t < n; t++) if (!b[t]) add(NONE, t); }
    else if (G.fly && this.cnt[p] === 3) { for (let f = 0; f < n; f++) if (b[f] === p) for (let t = 0; t < n; t++) if (!b[t]) add(f, t); }
    else {
      for (let f = 0; f < n; f++) if (b[f] === p) { const a = G.adjFlat[f]; for (let j = 0; j < a.length; j++) if (!b[a[j]]) add(f, a[j]); }
    }
    return k;
  }
  moves() { const out = new Int32Array(1200), k = this.gen(out); return Array.from(out.subarray(0, k)); }
  play(m) {
    const G = this.G, b = this.b, n = G.n, p = this.side, o = 3 - p, f = m & 31, t = (m >> 5) & 31, r = (m >> 10) & 31;
    this.stk.push(this.quiet);
    if (f === NONE) {
      this.h1 ^= G.zh[p * 16 + this.hand[p]]; this.h2 ^= G.zh2[p * 16 + this.hand[p]];
      this.hand[p]--; this.cnt[p]++;
      this.h1 ^= G.zh[p * 16 + this.hand[p]]; this.h2 ^= G.zh2[p * 16 + this.hand[p]];
    } else { b[f] = 0; this.h1 ^= G.zp[p * n + f]; this.h2 ^= G.zp2[p * n + f]; }
    b[t] = p; this.h1 ^= G.zp[p * n + t]; this.h2 ^= G.zp2[p * n + t];
    if (r !== NONE) { b[r] = 0; this.cnt[o]--; this.h1 ^= G.zp[o * n + r]; this.h2 ^= G.zp2[o * n + r]; }
    this.quiet = (f === NONE || r !== NONE) ? 0 : this.quiet + 1;
    this.side = o; this.h1 ^= G.zs; this.h2 ^= G.zs2;
  }
  undo(m) {
    const G = this.G, b = this.b, n = G.n, o = this.side, p = 3 - o, f = m & 31, t = (m >> 5) & 31, r = (m >> 10) & 31;
    this.side = p; this.h1 ^= G.zs; this.h2 ^= G.zs2;
    if (r !== NONE) { b[r] = o; this.cnt[o]++; this.h1 ^= G.zp[o * n + r]; this.h2 ^= G.zp2[o * n + r]; }
    b[t] = 0; this.h1 ^= G.zp[p * n + t]; this.h2 ^= G.zp2[p * n + t];
    if (f === NONE) {
      this.h1 ^= G.zh[p * 16 + this.hand[p]]; this.h2 ^= G.zh2[p * 16 + this.hand[p]];
      this.hand[p]++; this.cnt[p]--;
      this.h1 ^= G.zh[p * 16 + this.hand[p]]; this.h2 ^= G.zh2[p * 16 + this.hand[p]];
    } else { b[f] = p; this.h1 ^= G.zp[p * n + f]; this.h2 ^= G.zp2[p * n + f]; }
    this.quiet = this.stk.pop();
  }
  // result for the side to move: 0 ongoing, -1 lost, 2 draw (by rule; repetition is handled by the caller)
  status() {
    const p = this.side;
    if (this.cnt[p] + this.hand[p] < 3) return -1;
    if (this.quiet >= QUIET_DRAW) return 2;
    const out = this._sbuf || (this._sbuf = new Int32Array(1200));
    if (this.gen(out) === 0) return this.cnt[1] + this.cnt[2] === this.G.n ? 2 : -1;
    return 0;
  }
  name(m) {
    const G = this.G, f = m & 31, t = (m >> 5) & 31, r = (m >> 10) & 31;
    return (f === NONE ? '' : G.names[f] + '-') + G.names[t] + (r === NONE ? '' : 'x' + G.names[r]);
  }
}

// ---------------------------------------------------------------- evaluation (side to move's view)
// learned evaluation (nine men's morris): 71 inputs (own / opponent pieces per point, pieces in hand, flying, placing) -> H ReLU -> 1
let NET = null;
function setNet(o) {
  if (!o) { NET = null; return; }
  const H = o.H, W1 = new Float32Array(71 * H);
  for (let i = 0; i < 71; i++) for (let k = 0; k < H; k++) W1[i * H + k] = o.W1[i][k];
  NET = { H, W1, b1: Float32Array.from(o.b1), W2: Float32Array.from(o.W2), b2: o.b2, scale: o.scale || 200, acc: new Float32Array(H) };
}
function netEval(pos) {
  const N = NET, H = N.H, W1 = N.W1, acc = N.acc, b = pos.b, p = pos.side, o = 3 - p;
  acc.set(N.b1);
  const add = r => { const off = r * H; for (let k = 0; k < H; k++) acc[k] += W1[off + k]; };
  for (let i = 0; i < 24; i++) { const v = b[i]; if (v === p) add(i); else if (v) add(24 + i); }
  add(48 + pos.hand[p]); add(58 + pos.hand[o]);
  if (!pos.hand[p] && pos.cnt[p] === 3) add(68);
  if (!pos.hand[o] && pos.cnt[o] === 3) add(69);
  if (pos.hand[p] || pos.hand[o]) add(70);
  let out = N.b2; for (let k = 0; k < H; k++) { const a = acc[k]; if (a > 0) out += a * N.W2[k]; }
  const v = Math.round(out * N.scale);
  return v > 20000 ? 20000 : v < -20000 ? -20000 : v;
}
function evaluate(pos) {
  if (NET && pos.G.name === 'nine') return netEval(pos);
  const G = pos.G, b = pos.b, p = pos.side, o = 3 - p, ms = G.mills;
  let s = 100 * ((pos.cnt[p] + pos.hand[p]) - (pos.cnt[o] + pos.hand[o]));
  const placing = pos.hand[1] > 0 || pos.hand[2] > 0;
  const flyP = G.fly && !pos.hand[p] && pos.cnt[p] === 3, flyO = G.fly && !pos.hand[o] && pos.cnt[o] === 3;
  let thrO = 0, thrP = 0;   // immediate mill threats (can be closed with the next own move)
  for (let k = 0; k < ms.length; k++) {
    const m = ms[k], a = b[m[0]], c = b[m[1]], d = b[m[2]];
    const np = (a === p) + (c === p) + (d === p), no = (a === o) + (c === o) + (d === o);
    if (np + no === 2 && (np === 2 || no === 2)) {
      const who = np === 2 ? p : o, sg = who === p ? 1 : -1;
      const e = !a ? m[0] : !c ? m[1] : m[2];
      let now = false;
      if (pos.hand[who] > 0 || (who === p ? flyP : flyO)) now = true;
      else if (!placing) {
        const aj = G.adjFlat[e];
        for (let j = 0; j < aj.length; j++) { const q = aj[j]; if (b[q] === who && q !== m[0] && q !== m[1] && q !== m[2]) { now = true; break; } }
      }
      if (now) { if (who === p) thrP++; else thrO++; }
      s += sg * (now ? 24 : placing ? 6 : 7);
    } else if (np === 3 || no === 3) {
      const sg = np === 3 ? 1 : -1;
      if (placing) s += sg * 8;
      else {
        // a mill that can be opened (a member has an empty neighbour) can be closed again
        let open = false;
        for (let j = 0; j < 3 && !open; j++) { const aj = G.adjFlat[m[j]]; for (let q = 0; q < aj.length; q++) if (!b[aj[q]]) { open = true; break; } }
        s += sg * (open ? 22 : 10);
      }
    }
  }
  // the side to move closes its own threat (quiescence searches it); the opponent's threats can only be blocked one at a time
  if (thrO >= 2) s -= 85; else if (thrO === 1) s -= 18;
  if (thrP) s += 20;
  if (placing) {
    // junction points (3-4 neighbours) are worth more while placing
    let dp = 0;
    for (let i = 0; i < G.n; i++) { const v = b[i]; if (v) dp += (v === p ? 1 : -1) * G.adjFlat[i].length; }
    s += 4 * dp;
  } else {
    let mp = 0, mo = 0;
    for (let i = 0; i < G.n; i++) {
      const v = b[i]; if (!v) continue;
      const aj = G.adjFlat[i]; let f = 0;
      for (let j = 0; j < aj.length; j++) if (!b[aj[j]]) f++;
      if (v === p) mp += f; else mo += f;
    }
    if (!flyP) s += 5 * mp - (mp === 0 ? 400 : mp === 1 ? 40 : 0);
    if (!flyO) s -= 5 * mo - (mo === 0 ? 300 : mo === 1 ? 30 : 0);
  }
  return s;
}

// (endgame databases of nine / twelve men's morris: engine.c (the WebAssembly search) and perfect.js; the JS search has none)

// ---------------------------------------------------------------- search
const TT_BITS = 19, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
const MAXPLY = 96;
class Engine {
  constructor() {
    this.k1 = new Int32Array(TT_SIZE); this.k2 = new Int32Array(TT_SIZE); this.tv = new Int32Array(TT_SIZE);
    this.tm = new Int32Array(TT_SIZE); this.td = new Int8Array(TT_SIZE); this.tf = new Int8Array(TT_SIZE);
    this.buf = Array.from({ length: MAXPLY + 8 }, () => new Int32Array(1200));
    this.sc = Array.from({ length: MAXPLY + 8 }, () => new Int32Array(1200));
    this.killer = new Int32Array((MAXPLY + 8) * 2).fill(-1);
    this.histT = new Int32Array(32 * 32);
    this.rep = new Int32Array(4096); this.repLen = 0;
    this.nodes = 0; this.aborted = false; this.deadline = Infinity; this.maxNodes = Infinity;
    this.mate = false;
  }
  clear() { this.k1.fill(0); this.k2.fill(0); this.td.fill(0); this.tf.fill(0); this.histT.fill(0); this.killer.fill(-1); }
  limit(ms, maxNodes) { this.nodes = 0; this.aborted = false; this.deadline = ms ? Date.now() + ms : Infinity; this.maxNodes = maxNodes || Infinity; }
  checkAbort() { if (Date.now() > this.deadline || this.nodes > this.maxNodes) this.aborted = true; }
  setHistory(hashes) { this.repLen = 0; for (const h of hashes || []) this.rep[this.repLen++] = h; }
  isRep(pos) {
    const h = pos.h1; const lim = Math.max(0, this.repLen - pos.quiet - 1);
    for (let i = this.repLen - 3; i >= lim; i -= 2) if (this.rep[i] === h) return true;
    return false;
  }
  order(pos, moves, n, ply, ttm, sc) {
    const k0 = this.killer[ply * 2], k1 = this.killer[ply * 2 + 1], b = pos.b, o = 3 - pos.side;
    for (let i = 0; i < n; i++) {
      const m = moves[i]; let v;
      if (m === ttm) v = 1 << 29;
      else if ((m >> 10 & 31) !== NONE) {
        // removals: prefer taking a piece that is about to close a mill (a pair with an empty third)
        const r = (m >> 10) & 31, pr = pos.G.pairs[r]; let thr = 0;
        for (let k = 0; k < pr.length; k += 2) { const x = b[pr[k]], y = b[pr[k + 1]]; if ((x === o && !y) || (!x && y === o)) thr++; }
        v = (1 << 27) + thr * 1000 + pos.G.adj[r].length;
      } else if (m === k0 || m === k1) v = 1 << 26;
      else v = this.histT[(m & 31) * 32 + ((m >> 5) & 31)];
      sc[i] = v;
    }
  }
  qsearch(pos, alpha, beta, ply, qd) {
    this.nodes++;
    const p = pos.side;
    if (pos.cnt[p] + pos.hand[p] < 3) return -(WIN - ply);
    const moves = this.buf[ply], n = pos.gen(moves);
    if (n === 0) return pos.cnt[1] + pos.cnt[2] === pos.G.n ? 0 : -(WIN - ply);
    let best = evaluate(pos);
    if (best >= beta || qd <= 0 || ply >= MAXPLY) return best;
    if (best > alpha) alpha = best;
    const sc = this.sc[ply];
    let k = 0; for (let i = 0; i < n; i++) if (((moves[i] >> 10) & 31) !== NONE) moves[k++] = moves[i];
    this.order(pos, moves, k, ply, -1, sc);
    for (let i = 0; i < k; i++) {
      let bi = i; for (let j = i + 1; j < k; j++) if (sc[j] > sc[bi]) bi = j;
      const m = moves[bi]; moves[bi] = moves[i]; moves[i] = m; const tsc = sc[bi]; sc[bi] = sc[i]; sc[i] = tsc;
      pos.play(m);
      const v = -this.qsearch(pos, -beta, -alpha, ply + 1, qd - 1);
      pos.undo(m);
      if (v > best) { best = v; if (v > alpha) { alpha = v; if (v >= beta) break; } }
    }
    return best;
  }
  search(pos, depth, alpha, beta, ply) {
    if ((++this.nodes & 2047) === 0) this.checkAbort();
    if (this.aborted) return 0;
    const p = pos.side;
    if (pos.cnt[p] + pos.hand[p] < 3) return -(WIN - ply);
    if (ply > 0) {
      if (pos.quiet >= QUIET_DRAW) return 0;
      if (pos.quiet >= 4 && this.isRep(pos)) return 0;
      // mate distance pruning
      const ma = -(WIN - ply), mb = WIN - ply - 1;
      if (ma > alpha) { alpha = ma; if (alpha >= beta) return alpha; }
      if (mb < beta) { beta = mb; if (alpha >= beta) return beta; }
    }
    if (depth <= 0 || ply >= MAXPLY) return this.mate ? this.mateLeaf(pos, ply) : this.qsearch(pos, alpha, beta, ply, 6);
    const idx = pos.h1 & TT_MASK; let ttm = -1;
    if (this.k1[idx] === pos.h1 && this.k2[idx] === pos.h2) {
      ttm = this.tm[idx];
      if (ply > 0 && this.td[idx] >= depth) {
        let v = this.tv[idx]; if (v > WINT) v -= ply; else if (v < -WINT) v += ply;
        const f = this.tf[idx];
        if (f === 0 || (f === 1 && v >= beta) || (f === 2 && v <= alpha)) return v;
      }
    }
    const moves = this.buf[ply], n = pos.gen(moves);
    if (n === 0) return pos.cnt[1] + pos.cnt[2] === pos.G.n ? 0 : -(WIN - ply);
    const sc = this.sc[ply];
    this.order(pos, moves, n, ply, ttm, sc);
    const a0 = alpha; let best = -INF, bm = moves[0];
    for (let i = 0; i < n; i++) {
      let bi = i; for (let j = i + 1; j < n; j++) if (sc[j] > sc[bi]) bi = j;
      const m = moves[bi]; moves[bi] = moves[i]; moves[i] = m; const tsc = sc[bi]; sc[bi] = sc[i]; sc[i] = tsc;
      pos.play(m); this.rep[this.repLen++] = pos.h1;
      let v;
      if (i === 0) v = -this.search(pos, depth - 1, -beta, -alpha, ply + 1);
      else {
        v = -this.search(pos, depth - 1, -alpha - 1, -alpha, ply + 1);
        if (v > alpha && v < beta && !this.aborted) v = -this.search(pos, depth - 1, -beta, -alpha, ply + 1);
      }
      this.repLen--; pos.undo(m);
      if (this.aborted) return 0;
      if (v > best) {
        best = v; bm = m;
        if (v > alpha) {
          alpha = v;
          if (v >= beta) {
            if (((m >> 10) & 31) === NONE) {
              if (this.killer[ply * 2] !== m) { this.killer[ply * 2 + 1] = this.killer[ply * 2]; this.killer[ply * 2] = m; }
              this.histT[(m & 31) * 32 + ((m >> 5) & 31)] += depth * depth;
            }
            break;
          }
        }
      }
    }
    let sv = best; if (sv > WINT) sv += ply; else if (sv < -WINT) sv -= ply;
    this.k1[idx] = pos.h1; this.k2[idx] = pos.h2; this.tv[idx] = sv; this.tm[idx] = bm; this.td[idx] = depth;
    this.tf[idx] = best >= beta ? 1 : best <= a0 ? 2 : 0;
    return best;
  }
  // forced-win search leaf: only a decided position counts (a player without a legal move has lost)
  mateLeaf(pos, ply) {
    const n = pos.gen(this.buf[ply]);
    if (n === 0) return pos.cnt[1] + pos.cnt[2] === pos.G.n ? 0 : -(WIN - ply);
    return 0;
  }
  // values of every root move at a fixed depth (full window: exact for every move)
  rootValues(pos, depth, moves) {
    const out = [];
    for (const m of moves) {
      pos.play(m); this.rep[this.repLen++] = pos.h1;
      let v;
      const st = this.quickStatus(pos, 1);
      if (st !== null) v = -st;
      else v = -this.search(pos, depth - 1, -INF, INF, 1);
      this.repLen--; pos.undo(m);
      if (this.aborted) return null;
      out.push({ m, v });
    }
    return out;
  }
  // status of a position right after a root move (draw by repetition / rule, or decided)
  quickStatus(pos, ply) {
    const p = pos.side;
    if (pos.cnt[p] + pos.hand[p] < 3) return -(WIN - ply);
    if (pos.quiet >= QUIET_DRAW) return 0;
    if (pos.quiet >= 4) {   // threefold repetition (two earlier occurrences)
      let c = 0; const lim = Math.max(0, this.repLen - pos.quiet - 1);
      for (let i = this.repLen - 3; i >= lim; i -= 2) if (this.rep[i] === pos.h1) c++;
      if (c >= 2) return 0;
    }
    const n = pos.gen(this.buf[ply]);
    if (n === 0) return pos.cnt[1] + pos.cnt[2] === pos.G.n ? 0 : -(WIN - ply);
    return null;
  }
  best(pos, maxDepth, ms, maxNodes) {
    this.limit(ms, maxNodes);
    const moves = pos.moves();
    if (moves.length === 1) return { m: moves[0], v: 0, depth: 0 };
    let bestM = moves[0], bestV = 0, done = 0;
    for (let d = 1; d <= maxDepth; d++) {
      // root PVS with the previous best first
      const order = [bestM, ...moves.filter(m => m !== bestM)];
      let alpha = -INF, bm = bestM, bv = -INF;
      for (let i = 0; i < order.length; i++) {
        const m = order[i];
        pos.play(m); this.rep[this.repLen++] = pos.h1;
        let v; const st = this.quickStatus(pos, 1);
        if (st !== null) v = -st;
        else if (i === 0) v = -this.search(pos, d - 1, -INF, INF, 1);
        else {
          v = -this.search(pos, d - 1, -alpha - 1, -alpha, 1);
          if (v > alpha && !this.aborted) v = -this.search(pos, d - 1, -INF, -alpha, 1);
        }
        this.repLen--; pos.undo(m);
        if (this.aborted) break;
        if (v > bv) { bv = v; bm = m; if (v > alpha) alpha = v; }
      }
      if (this.aborted) { if (bv > bestV && bm !== bestM && bv > -INF) { /* partial: keep the old result unless clearly better */ } break; }
      bestM = bm; bestV = bv; done = d;
      if (Math.abs(bv) > WINT) break;
    }
    return { m: bestM, v: bestV, depth: done };
  }
  // all root moves with values, iterative deepening until time runs out
  analyze(pos, ms, maxDepth, onDepth) {
    this.limit(ms);
    const moves = pos.moves();
    let last = null, depth = 0;
    for (let d = 1; d <= (maxDepth || 40); d++) {
      if (last) moves.sort((a, b) => last.get(b) - last.get(a));
      const vals = this.rootValues(pos, d, moves);
      if (!vals) break;
      last = new Map(vals.map(e => [e.m, e.v])); depth = d;
      if (onDepth) onDepth(vals, d);
      // stop when every move is decided
      if (vals.every(e => Math.abs(e.v) > WINT)) break;
      if (Date.now() > this.deadline - (ms || 0) * 0.45) break;   // the next depth would not finish
    }
    return { list: last ? [...last].map(([m, v]) => ({ m, v })) : [], depth };
  }
  // forced win search: value of every root move at depth plies with a neutral leaf (only wins count)
  mateValues(pos, plies, maxNodes) {
    this.mate = true; this.limit(0, maxNodes || 4e6);
    const moves = pos.moves(), out = [];
    for (const m of moves) {
      pos.play(m); this.rep[this.repLen++] = pos.h1;
      let v; const st = this.quickStatus(pos, 1);
      if (st !== null) v = -st; else v = -this.search(pos, plies - 1, -INF, INF, 1);
      this.repLen--; pos.undo(m);
      if (this.aborted) break;
      out.push({ m, v });
    }
    this.mate = false;
    return this.aborted ? null : out;
  }
}

// ---------------------------------------------------------------- levels
const LEVELS = {
  1: { d: 1, noise: 260, blunder: 0.35 },
  2: { d: 1, noise: 140, blunder: 0.2 },
  3: { d: 2, noise: 90, blunder: 0.1 },
  4: { d: 2, noise: 45 },
  5: { d: 3, noise: 28 },
  6: { d: 4, noise: 14 },
  7: { d: 5, noise: 6, ms: 500 },
  8: { d: 8, ms: 700 },
  9: { d: 30, ms: 1500 },
  10: { d: 40, ms: 3000 },
  11: { d: 40, ms: 3000, perfect: true },   // 完全解析 (six men's morris only): perfect.js + the solved database; elsewhere / until it loads = Lv.10
};
function gauss(rand) { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// ---------------------------------------------------------------- game helpers
function replay(variant, start, moves) {
  const G = geom(variant), pos = Pos.from(G, start), hashes = [pos.h1];
  for (const m of moves || []) { pos.play(m); hashes.push(pos.h1); }
  pos.stk = [];
  return { G, pos, hashes };
}
let ENG = null, MENG = null;
const eng = () => ENG || (ENG = new Engine());
const meng = () => MENG || (MENG = new Engine());
const kindOf = v => Math.abs(v) > WINT ? 'exact' : 'heur';
// ---------------------------------------------------------------- WebAssembly search (engine.c), used by the worker when available
let WX = null, wGeo = '', wProg = null;
// the endgame database of nine / twelve men's morris in engine.c: copied from perfect.js into memory grown for it (once per variant)
let wEg = '', wEgPtr = 0, wEgCap = 0;
function egSync(variant) {
  if (!WX || !WX.eg_init || wEg === variant || (variant !== 'nine' && variant !== 'twelve') || !PF || !PF.ready(variant)) return;
  const c = PF.classes(variant); if (!c || !c.list.length) return;
  let need = 0; for (const k of c.list) need += k.n;
  if (need > wEgCap) { const mem = WX.memory, pages = Math.ceil(need / 65536); wEgPtr = mem.buffer.byteLength; mem.grow(pages); wEgCap = pages * 65536; }
  const S = new Uint8Array(WX.memory.buffer, WX.eg_sym_ptr(), 16 * 24); S.fill(0);
  c.sym.slice(0, 16).forEach((g, i) => S.set(g, i * 24));
  WX.eg_init(Math.min(16, c.sym.length), geom(variant).mills.length);
  let at = wEgPtr;
  for (const k of c.list) { new Uint8Array(WX.memory.buffer, at, k.n).set(c.u8.subarray(k.off, k.off + k.n)); WX.eg_add(k.m, k.o, at); at += k.n; }
  wEg = variant;
}
function egUse(variant, on) { if (!WX || !WX.eg_use) return; if (on) egSync(variant); WX.eg_use(on && wEg === variant ? 1 : 0); }
const wIO = () => new Int32Array(WX.memory.buffer, WX.io_ptr(), 8192);
function geoIO(variant) {   // the geometry buffer of engine.c set_geometry()
  const G = geom(variant), a = [G.n, G.pieces, G.fly ? 1 : 0, G.mills.length];
  for (const m of G.mills) a.push(...m);
  const inMills = (i, j) => G.mills.some(m => (m[0] === i && m[1] === j) || (m[1] === i && m[2] === j) || (m[0] === j && m[1] === i) || (m[1] === j && m[2] === i));
  const extra = []; for (let i = 0; i < G.n; i++) for (const j of G.adj[i]) if (j > i && !inMills(i, j)) extra.push(i, j);
  a.push(extra.length / 2, ...extra);
  return a;
}
// engine.c geo_key() of a variant (engine_mt.wasm: the page's helper threads wait until the lead has set the job's geometry)
const geoKey = variant => { const a = geoIO(variant), nm = a[3]; return a[0] | a[1] << 5 | a[2] << 10 | nm << 11 | a[4 + 3 * nm] << 17; };
function wGeom(variant) {
  if (wGeo === variant) return;
  wIO().set(geoIO(variant)); WX.set_geometry(); WX.new_game(); wGeo = variant;
}
// the setup buffer of engine.c setup(): b[n], hand1, hand2, side, quiet, nmoves, moves… (also the page's helper threads)
function setupIO(variant, start, moves) {
  const G = geom(variant), p = Pos.from(G, start), a = [];
  for (let i = 0; i < G.n; i++) a.push(p.b[i]);
  a.push(p.hand[1], p.hand[2], p.side, p.quiet, moves.length, ...moves);
  return a;
}
function wSetup(variant, start, moves) {
  wGeom(variant);
  wIO().set(setupIO(variant, start, moves)); return WX.setup();
}
function wList() { const r = wIO(), L = []; for (let i = 0; i < r[0]; i++) L.push({ m: r[2 + 2 * i], v: r[3 + 2 * i], kind: kindOf(r[3 + 2 * i]) }); return L; }
// ---------------------------------------------------------------- perfect play (six men's morris, perfect.js in the worker)
// (2026-11-14) and the endgame databases of nine / twelve men's morris (the moving phase with at most 8 pieces on the board):
// perfect.js reads them for the exact verdicts, engine.c gets a copy for the search (egSync)
let PF = null;   // MorrisPerfect once loaded
const pfOn = variant => variant === 'six' && PF && PF.ready('six');
// is the position (variant, start, moves) in a loaded database? (six: always once loaded)
const pfCovers = (variant, start, moves) => {
  if (!PF || !PF.ready(variant)) return false;
  if (variant === 'six') return true;
  try { const { pos } = replay(variant, start, moves); return pos.status() === 0 && PF.covers(pos); } catch (e) { return false; }
};
// exact values from the database on an analysis list (each entry gets pf: { r, z }; v becomes win WIN - z / loss -(WIN - z) /
// draw a small value from the search, so every list consumer — hints, evaluation, coach, review — sorts and grades exactly)
function pfAnnotate(variant, start, moves, list) {
  if (!PF || !PF.ready(variant) || !list || !list.length) return list;
  const { pos, hashes } = replay(variant, start, moves);
  if (pos.status() !== 0 || !PF.covers(pos)) return list;
  const vals = PF.moveVals(pos, hashes, list.map(e => e.m)), pl = pos.placing();
  return list.map((e, i) => {
    const x = vals[i], z = Math.min(x.z, 900);
    const v = x.r > 0 ? WIN - z : x.r < 0 ? -(WIN - z) : Math.max(-120, Math.min(120, Math.round(e.v / 8)));
    return Object.assign({}, e, { v, kind: x.r ? 'exact' : 'heur', pf: { r: x.r, z: pl ? 0 : x.z } });
  });
}
let PRO_CFG = null;   // a step of the page's PRO mode for the current 'think' message (shared/proset.js)
function think(variant, start, moves, level, rand) {
  const L0 = PRO_CFG || LEVELS[level] || LEVELS[5];   // (PRO_CFG: { d, ms, noise, blunder } as LEVELS)
  if (L0.perfect && pfOn(variant)) {
    const { pos, hashes } = replay(variant, start, moves);
    const r = PF.choose(pos, hashes, eng(), rand);
    return { move: r.move, pf: { r: r.r, z: r.z } };
  }
  if (WX && L0.noise === undefined && moves.length < 1000) {
    if (!wSetup(variant, start, moves)) return { move: -1 };
    egUse(variant, !!PRO_CFG || level >= 9);   // (the endgame database: the time-based levels and PRO; Lv.8 as before)
    WX.best(L0.d, L0.ms || 0, 0); const r = wIO();
    return { move: r[0], v: r[1], depth: r[2], nodes: WX.last_nodes ? WX.last_nodes() : undefined };   // (nodes: the threads' build only)
  }
  rand = rand || Math.random;
  const { pos, hashes } = replay(variant, start, moves);
  const E = eng(); E.setHistory(hashes);
  const L = L0;
  const all = pos.moves();
  if (all.length === 0) return { move: -1 };
  if (L.noise !== undefined) {
    E.limit(L.ms || 4000);
    let vals = null;
    for (let d = 1; d <= L.d; d++) { const v = E.rootValues(pos, d, all); if (!v) break; vals = v; }
    if (!vals) vals = all.map(m => ({ m, v: 0 }));
    if (L.blunder && rand() < L.blunder) return { move: vals[Math.floor(rand() * vals.length)].m };
    let best = null, bv = -Infinity;
    for (const e of vals) { const x = e.v + (Math.abs(e.v) > WINT ? 0 : gauss(rand) * L.noise); if (x > bv) { bv = x; best = e.m; } }
    return { move: best };
  }
  const r = E.best(pos, L.d, L.ms);
  return { move: r.m, v: r.v, depth: r.depth };
}
function analyze(variant, start, moves, ms, onProgress) {
  const ann = l => pfAnnotate(variant, start, moves, l), pf = pfCovers(variant, start, moves);
  if (pf) ms = Math.min(ms, 300);   // the database decides; the search only orders the drawn moves
  if (WX && moves.length < 1000) {
    if (!wSetup(variant, start, moves)) return { list: [], depth: 0, solved: false };
    egUse(variant, true);
    wProg = onProgress ? (d => onProgress(ann(wList()), d)) : null;
    WX.analyze(ms, 40); wProg = null;
    const list = ann(wList());
    return { list, depth: wIO()[1], solved: pf || (list.length > 0 && list.every(e => Math.abs(e.v) > WINT)), pf, nodes: WX.last_nodes ? WX.last_nodes() : undefined };
  }
  const { pos, hashes } = replay(variant, start, moves);
  const E = eng(); E.setHistory(hashes);
  const res = E.analyze(pos, ms, 40, (vals, d) => onProgress && onProgress(ann(vals.map(e => ({ m: e.m, v: e.v, kind: kindOf(e.v) }))), d));
  const list = ann(res.list.map(e => ({ m: e.m, v: e.v, kind: kindOf(e.v) })));
  return { list, depth: res.depth, solved: pf || (res.list.length > 0 && res.list.every(e => Math.abs(e.v) > WINT)), pf };
}
// forced win within n of the attacker's moves.
// attacker to move (defend = false): need = attacker moves to win after each move (0 = no forced win within n)
// defender to move (defend = true): need = attacker moves still needed after each reply (0 = the attacker no longer wins within n)
function mate(variant, start, moves, n, defend, maxNodes) {
  const { pos, hashes } = replay(variant, start, moves);
  const E = meng(); E.setHistory(hashes);
  const plies = defend ? 2 * n : 2 * n - 1;
  const vals = E.mateValues(pos, plies, maxNodes);
  if (!vals) return null;
  return vals.map(({ m, v }) => {
    let need = 0;
    if (!defend && v > WINT) need = (WIN - v + 1) >> 1;
    if (defend && v < -WINT) need = (WIN + v) >> 1;
    return { m, need };
  });
}

// forced mill: can the attacker make a mill (remove a piece) within n of its own moves, whatever the defender does?
// A defender that removes a piece first refutes it; a defender left without a move counts as a success.
function millAtt(pos, k, ply, bufs) {
  const buf = bufs[ply], n = pos.gen(buf);
  for (let i = 0; i < n; i++) if (((buf[i] >> 10) & 31) !== NONE) return true;
  if (k <= 1 || !n) return false;
  const ms = Array.from(buf.subarray(0, n));
  for (const m of ms) { pos.play(m); const ok = millDef(pos, k - 1, ply + 1, bufs); pos.undo(m); if (ok) return true; }
  return false;
}
function millDef(pos, k, ply, bufs) {
  const buf = bufs[ply], n = pos.gen(buf);
  if (!n) return pos.cnt[1] + pos.cnt[2] !== pos.G.n;
  for (let i = 0; i < n; i++) if (((buf[i] >> 10) & 31) !== NONE) return false;
  const ms = Array.from(buf.subarray(0, n));
  for (const m of ms) { pos.play(m); const ok = millAtt(pos, k, ply + 1, bufs); pos.undo(m); if (!ok) return false; }
  return true;
}
// attacker to move (defend = false): need = own moves to force a mill after each move (0 = not within n)
// defender to move (defend = true): need = attacker moves still needed after each reply (0 = refuted)
function mill(variant, start, moves, n, defend) {
  const { pos } = replay(variant, start, moves), bufs = Array.from({ length: 2 * n + 4 }, () => new Int32Array(1200));
  return pos.moves().map(m => {
    if (((m >> 10) & 31) !== NONE) return { m, need: defend ? 0 : 1 };
    pos.play(m); let need = 0;
    if (pos.status() === -1) need = defend ? 0 : 1;
    else for (let k = 1; k <= (defend ? n : n - 1); k++) { if (defend ? millAtt(pos, k, 0, bufs) : millDef(pos, k, 0, bufs)) { need = defend ? k : k + 1; break; } }
    pos.undo(m);
    return { m, need };
  });
}

const API = { setPerfect: x => { PF = x; }, pfAnnotate, pfCovers, setNet, setWasm: x => { WX = x; wGeo = ''; wEg = ''; wEgCap = 0; }, egUse, mill, NONE, WIN, WINT, QUIET_DRAW, VARIANTS, LEVELS, geom, Pos, Engine, evaluate, replay, think, analyze, mate, mv, mFrom, mTo, mRm, kindOf, setupIO, geoKey };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof window !== 'undefined') window.MorrisEngine = API;
else if (typeof self !== 'undefined' && typeof importScripts === 'function') {
  // load the WebAssembly search; until it is ready (or if it fails) the JS search is used
  // ?…&mt=1: the lead thread of the page's multi-thread pool (shared/mtengine.js): engine_mt.wasm on the shared memory sent with
  // the first message ('mtinit'); the helpers (mt-helper.js) search the same root meanwhile (the network sits in the engine's own
  // shared table). The rest is the usual API.
  const MTL = /[?&]mt=1\b/.test(self.location.search || '');
  let wReady = null, wDone = false;
  if (typeof WebAssembly === 'object' && typeof fetch === 'function') {
    const imp = { env: { now: () => Date.now(), progress: d => { if (wProg) wProg(d); } } };
    // (2026-11-11) engine_simd.wasm (wasm SIMD) where the browser has SIMD, else engine.wasm (the same values; MODEL_CARD.md)
    let simd = true;
    try { simd = WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])); } catch (e) { simd = false; }
    if (/[?&]nosimd=1\b/.test(self.location.search || '')) simd = false;   // (a check of the fallback)
    const url = new URL(simd ? 'engine_simd.wasm?v=4' : 'engine.wasm?v=20261114zf1', self.location.href);
    wReady = (MTL ? new Promise(res => self.addEventListener('message', function f(e) { if (e.data && e.data.type === 'mtinit') { self.removeEventListener('message', f); res(e.data); } }))
      .then(m => {
        const x = new WebAssembly.Instance(m.module, { env: { memory: m.mem, now: () => Date.now(), progress: d => { if (wProg) wProg(d); } } }).exports;
        x.mt_stack(m.top); x.mt_thread(m.tls, 0);
        return { instance: { exports: Object.assign({}, x, { memory: m.mem }) } };   // (the memory is imported: X.memory as in the normal build)
      }) : WebAssembly.instantiateStreaming ? WebAssembly.instantiateStreaming(fetch(url), imp) : fetch(url).then(r => r.arrayBuffer()).then(b => WebAssembly.instantiate(b, imp)))
      .then(r => {
        WX = r.instance.exports;
        // learned evaluation for nine men's morris (MNN1: H, then 71*H + 2*H + 1 float32)
        return fetch(new URL('evalnet.bin?v=1', self.location.href)).then(x => x.ok ? x.arrayBuffer() : null).then(b => {
          if (!b) return; const dv = new DataView(b); if (dv.getUint32(0, true) !== 0x314E4E4D) return;
          const H = dv.getUint32(4, true), f = new Float32Array(b, 8, 71 * H + 2 * H + 1);
          new Float32Array(WX.memory.buffer, WX.net_ptr(), f.length).set(f); WX.net_on(H);
        }).catch(() => {});
      }).then(() => { wDone = true; if (MTL) self.postMessage({ type: 'mtready' }); }, err => { WX = null; wDone = true; if (MTL) self.postMessage({ type: 'mtready', error: String(err && err.message || err) }); });
  }
  // perfect play (six men's morris): perfect.js and the solved database (six.mdb.gz, about 0.57 MB), fetched the first time
  // a six men's position is analysed or the 完全解析 level is to move; until then (or if it fails) the search answers
  // (2026-11-14) nine / twelve men's morris: the endgame database (nine-eg.mdb.gz 0.17 MB, twelve-eg.mdb.gz 0.5 MB), fetched
  // the first time a game is near it (moving phase, at most 10 pieces on the board) and the message waits for it (once)
  const pfLoads = {};
  const loadPF = variant => pfLoads[variant] || (pfLoads[variant] = new Promise(res => {
    if (!self.MorrisPerfect) { try { importScripts(new URL('perfect.js?v=2', self.location.href).href); } catch (e) { res(false); return; } }
    self.MorrisPerfect.load(self.location.href, variant).then(ok => { if (ok) PF = self.MorrisPerfect; res(ok); });
  }));
  const wantPF = m => m.variant === 'six' && (m.type === 'pfload' || m.type === 'analyze' || m.type === 'cands' || (m.type === 'think' && LEVELS[m.level] && LEVELS[m.level].perfect));
  const wantEG = m => {
    if ((m.variant !== 'nine' && m.variant !== 'twelve') || (m.type !== 'think' && m.type !== 'analyze' && m.type !== 'cands')) return false;
    if (m.type === 'think' && !m.cfg && !(m.level >= 9)) return false;   // (Lv.1〜8 never use it)
    try { const { pos } = replay(m.variant, m.start, m.moves); return !pos.placing() && pos.cnt[1] + pos.cnt[2] <= 10; } catch (e) { return false; }
  };
  self.onmessage = e => {
    const m = e.data;
    if (m && m.type === 'mtinit') return;
    if (MTL && !wDone && wReady) { wReady.then(() => self.onmessage(e)); return; }   // (the lead: answer with the threads' engine only)
    if (wantPF(m) && !(PF && PF.ready('six'))) { loadPF('six').then(() => handle(m)); return; }
    if (wantEG(m) && !pfLoads[m.variant]) { loadPF(m.variant).then(() => handle(m)); return; }
    handle(m);
  };
  const handle = m => {
    try {
      if (m.type === 'think') self.postMessage({ id: m.id, type: 'result', ...(() => { PRO_CFG = m.cfg || null; try { return think(m.variant, m.start, m.moves, m.level); } finally { PRO_CFG = null; } })() });
      else if (m.type === 'analyze') {
        const r = analyze(m.variant, m.start, m.moves, m.time || 1000, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth }));
        self.postMessage({ id: m.id, type: 'result', ...r });
      } else if (m.type === 'pfload') self.postMessage({ id: m.id, type: 'result', ok: !!(PF && PF.ready('six')), ms: PF ? PF.loadMs('six') : 0 });
      else if (m.type === 'cands') {   // review box (rvbox.js): the top moves and a short line after each
        const r = analyze(m.variant, m.start, m.moves, m.time || 1000), list = r.list.slice().sort((a, b) => b.v - a.v), lines = {};
        self.postMessage({ id: m.id, type: 'cands', list, lines: {} });
        for (const e of list.slice(0, m.n || 5)) {
          const line = [e.m], seq = m.moves.concat(e.m);
          while (line.length < (m.plies || 8)) {
            if (replay(m.variant, m.start, seq).pos.status() !== 0) break;
            const q = analyze(m.variant, m.start, seq, m.ply || 120).list;
            if (!q || !q.length) break;
            let b = q[0]; for (const x of q) if (x.v > b.v) b = x;
            line.push(b.m); seq.push(b.m);
          }
          lines[e.m] = line;
          self.postMessage({ id: m.id, type: 'cands', list, lines: Object.assign({}, lines) });
        }
        self.postMessage({ id: m.id, type: 'candsDone', list, lines });
      } else if (m.type === 'mill') self.postMessage({ id: m.id, type: 'result', list: mill(m.variant, m.start, m.moves, m.n, m.defend) });
      else if (m.type === 'mate') self.postMessage({ id: m.id, type: 'result', list: mate(m.variant, m.start, m.moves, m.n, m.defend, m.maxNodes) });
      else if (m.type === 'newgame') { if (WX) WX.new_game(); self.postMessage({ id: m.id, type: 'result' }); }   // (an empty table: bench.html)
    } catch (err) { self.postMessage({ id: m.id, type: 'result', error: String(err && err.stack || err) }); }
  };
}
})();

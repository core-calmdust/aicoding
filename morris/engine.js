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
  const rnd = xorshift(0x9e3779b9 ^ n * 7919 ^ (V.diag ? 77 : 0));
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

// ---------------------------------------------------------------- endgame databases (nine men's morris, moving phase)
// Solved by retrograde analysis (tools/mdb.c). Class m-o: side to move has m pieces, the opponent o.
// Value byte: 0 draw, 1..127 the side to move wins in v plies, 128+k it loses in k plies.
const EGDB = {};      // 'm-o' -> { dense: Uint8Array } | { idx: Uint32Array, val: Uint8Array }
let egdbState = 0;    // 0 not loaded, 1 loading, 2 ready
const CBN = []; for (let n = 0; n <= 24; n++) { CBN[n] = []; CBN[n][0] = 1; for (let k = 1; k <= n; k++) CBN[n][k] = CBN[n - 1][k - 1] + (k <= n - 1 ? CBN[n - 1][k] : 0); }
function setEGDB(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== 'MDB1') return false;
  let o = 4;
  while (o + 8 <= u8.length) {
    const m = u8[o], op = u8[o + 1], type = u8[o + 2], n = dv.getUint32(o + 4, true); o += 8;
    if (type === 0) { EGDB[m + '-' + op] = { dense: u8.subarray(o, o + n) }; o += n; }
    else { const idx = new Uint32Array(n); for (let i = 0; i < n; i++) idx[i] = dv.getUint32(o + i * 4, true); o += n * 4; EGDB[m + '-' + op] = { idx, val: u8.subarray(o, o + n) }; o += n; }
  }
  egdbState = 2; return true;
}
// raw value (see above) for the side to move, or -1 when the position is not covered
function egdbProbe(pos) {
  if (egdbState !== 2 || pos.G.name !== 'nine' || pos.hand[1] || pos.hand[2]) return -1;
  const p = pos.side, m = pos.cnt[p], o = pos.cnt[3 - p], T = EGDB[m + '-' + o];
  if (!T) return -1;
  const b = pos.b; let ra = 0, rb = 0, ia = 0, ib = 0, j = 0;
  for (let q = 0; q < 24; q++) {
    const v = b[q];
    if (v === p) { ia++; if (q >= ia) ra += CBN[q][ia]; }
    else { if (v) { ib++; if (j >= ib) rb += CBN[j][ib]; } j++; }
  }
  const id = ra * CBN[24 - m][o] + rb;
  if (T.dense) return T.dense[id];
  let lo = 0, hi = T.idx.length - 1;
  while (lo <= hi) { const mid = (lo + hi) >> 1, x = T.idx[mid]; if (x === id) return T.val[mid]; if (x < id) lo = mid + 1; else hi = mid - 1; }
  return 0;
}
const egdbScore = (v, ply) => v === 0 ? 0 : v < 128 ? WIN - ply - v : -(WIN - ply - (v - 128));

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
    if (egdbState === 2 && !this.mate && !pos.hand[1] && !pos.hand[2]) { const dv = egdbProbe(pos); if (dv >= 0) return egdbScore(dv, ply); }
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
      if (egdbState === 2 && !this.mate && !pos.hand[1] && !pos.hand[2]) { const dv = egdbProbe(pos); if (dv >= 0) return egdbScore(dv, ply); }
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
function think(variant, start, moves, level, rand) {
  rand = rand || Math.random;
  const { pos, hashes } = replay(variant, start, moves);
  const E = eng(); E.setHistory(hashes);
  const L = LEVELS[level] || LEVELS[5];
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
  const { pos, hashes } = replay(variant, start, moves);
  const E = eng(); E.setHistory(hashes);
  const res = E.analyze(pos, ms, 40, (vals, d) => onProgress && onProgress(vals.map(e => ({ m: e.m, v: e.v, kind: kindOf(e.v) })), d));
  return { list: res.list.map(e => ({ m: e.m, v: e.v, kind: kindOf(e.v) })), depth: res.depth, solved: res.list.length > 0 && res.list.every(e => Math.abs(e.v) > WINT) };
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

const API = { setNet, setEGDB, egdbProbe, egdbReady: () => egdbState === 2, mill, NONE, WIN, WINT, QUIET_DRAW, VARIANTS, LEVELS, geom, Pos, Engine, evaluate, replay, think, analyze, mate, mv, mFrom, mTo, mRm, kindOf };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof window !== 'undefined') window.MorrisEngine = API;
else if (typeof self !== 'undefined' && typeof importScripts === 'function') {
  const EGDB_URL = '';   // endgame databases: not shipped yet (set to 'mdb.bin.gz?v=1' to enable)
  // the endgame databases are fetched on demand, the first time a game gets near the end of the moving phase
  const wantDB = m => {
    if (!EGDB_URL || egdbState || m.variant !== 'nine' || typeof fetch !== 'function' || typeof DecompressionStream !== 'function') return;
    try { const { pos } = replay(m.variant, m.start, m.moves); if (pos.placing() || pos.cnt[1] + pos.cnt[2] > 12) return; } catch (e) { return; }
    egdbState = 1;
    fetch(EGDB_URL).then(r => { if (!r.ok) throw 0; return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(); })
      .then(b => { if (!setEGDB(b)) egdbState = 0; }).catch(() => { egdbState = 0; });
  };
  self.onmessage = e => {
    const m = e.data;
    if (m.type === 'think' || m.type === 'analyze') wantDB(m);
    try {
      if (m.type === 'think') self.postMessage({ id: m.id, type: 'result', ...think(m.variant, m.start, m.moves, m.level) });
      else if (m.type === 'analyze') {
        const r = analyze(m.variant, m.start, m.moves, m.time || 1000, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth }));
        self.postMessage({ id: m.id, type: 'result', ...r });
      } else if (m.type === 'mill') self.postMessage({ id: m.id, type: 'result', list: mill(m.variant, m.start, m.moves, m.n, m.defend) });
      else if (m.type === 'mate') self.postMessage({ id: m.id, type: 'result', list: mate(m.variant, m.start, m.moves, m.n, m.defend, m.maxNodes) });
    } catch (err) { self.postMessage({ id: m.id, type: 'result', error: String(err && err.stack || err) }); }
  };
}
})();

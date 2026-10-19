/* Dots and Boxes engine — runs as a Web Worker in the browser and as a module in Node.
 * Board: R x C boxes, (R+1) x (C+1) dots. Edges: horizontal first ((R+1)*C), then vertical (R*(C+1)).
 * A position is just the set of drawn edges; values are "net boxes still to come for the player to move".
 */
'use strict';
const DotsEngine = (() => {

function xorshift(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s | 0; }; }

// ---------------------------------------------------------------- geometry
const geoms = {};
function geom(R, C) {
  const key = R + 'x' + C;
  if (geoms[key]) return geoms[key];
  const HN = (R + 1) * C, VN = R * (C + 1), E = HN + VN, B = R * C;
  const eb0 = new Int8Array(E).fill(-1), eb1 = new Int8Array(E).fill(-1), be = new Int8Array(B * 4), ed = [];
  const dk = (r1, c1, r2, c2) => (r1 < r2 || (r1 === r2 && c1 < c2)) ? ((r1 * 8 + c1) * 64 + r2 * 8 + c2) : ((r2 * 8 + c2) * 64 + r1 * 8 + c1);
  const idx = new Map();
  const addBox = (e, b) => { if (eb0[e] < 0) eb0[e] = b; else eb1[e] = b; };
  for (let r = 0; r <= R; r++) for (let c = 0; c < C; c++) {
    const e = r * C + c; ed[e] = [r, c, r, c + 1]; idx.set(dk(r, c, r, c + 1), e);
    if (r > 0) addBox(e, (r - 1) * C + c); if (r < R) addBox(e, r * C + c);
  }
  for (let r = 0; r < R; r++) for (let c = 0; c <= C; c++) {
    const e = HN + r * (C + 1) + c; ed[e] = [r, c, r + 1, c]; idx.set(dk(r, c, r + 1, c), e);
    if (c > 0) addBox(e, r * C + c - 1); if (c < C) addBox(e, r * C + c);
  }
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const b = r * C + c;
    be[b * 4] = r * C + c; be[b * 4 + 1] = (r + 1) * C + c; be[b * 4 + 2] = HN + r * (C + 1) + c; be[b * 4 + 3] = HN + r * (C + 1) + c + 1;
  }
  const n = R, m = C;
  const tfs = R === C ? [
    (r, c) => [r, c], (r, c) => [c, n - r], (r, c) => [n - r, n - c], (r, c) => [n - c, r],
    (r, c) => [r, n - c], (r, c) => [n - r, c], (r, c) => [c, r], (r, c) => [n - c, n - r]
  ] : [(r, c) => [r, c], (r, c) => [n - r, m - c], (r, c) => [r, m - c], (r, c) => [n - r, c]];
  const perms = [], inv = [];
  for (const f of tfs) {
    const p = new Int8Array(E), q = new Int8Array(E);
    for (let e = 0; e < E; e++) { const [r1, c1, r2, c2] = ed[e]; const a = f(r1, c1), b = f(r2, c2); p[e] = idx.get(dk(a[0], a[1], b[0], b[1])); }
    for (let e = 0; e < E; e++) q[p[e]] = e;
    perms.push(p); inv.push(q);
  }
  const NS = perms.length;
  // Zobrist keys from a non-linear generator (splitmix32). xorshift is linear over GF(2): all its outputs lie in a
  // 32-dimensional space, so XOR hashes of different edge sets collided and corrupted the transposition table.
  let sm = (0x9e3779b9 ^ (R * 131 + C * 7)) >>> 0;
  const rnd = () => { sm = (sm + 0x9e3779b9) >>> 0; let z = sm; z = Math.imul(z ^ (z >>> 16), 0x85ebca6b); z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35); return (z ^ (z >>> 16)) | 0; };
  const z1 = new Int32Array(E), z2 = new Int32Array(E);
  for (let e = 0; e < E; e++) { z1[e] = rnd(); z2[e] = rnd(); }
  const ZS1 = new Int32Array(NS * E), ZS2 = new Int32Array(NS * E);
  for (let s = 0; s < NS; s++) for (let e = 0; e < E; e++) { ZS1[s * E + e] = z1[perms[s][e]]; ZS2[s * E + e] = z2[perms[s][e]]; }
  const g = { R, C, HN, VN, E, B, eb0, eb1, be, ed, idx, dk, perms, inv, NS, ZS1, ZS2 };
  geoms[key] = g;
  return g;
}

// ---------------------------------------------------------------- position
class Pos {
  constructor(G) {
    this.G = G; this.drawn = new Uint8Array(G.E); this.cnt = new Uint8Array(G.B);
    this.undrawn = G.E; this.filled = 0; this.h1 = new Int32Array(G.NS); this.h2 = new Int32Array(G.NS);
  }
  static from(G, edges) { const p = new Pos(G); for (const e of edges) p.play(e); return p; }
  clone() { const p = new Pos(this.G); p.drawn.set(this.drawn); p.cnt.set(this.cnt); p.undrawn = this.undrawn; p.filled = this.filled; p.h1.set(this.h1); p.h2.set(this.h2); return p; }
  play(e) {
    const G = this.G; this.drawn[e] = 1; this.undrawn--;
    let k = 0, b = G.eb0[e];
    if (b >= 0 && ++this.cnt[b] === 4) k++;
    b = G.eb1[e];
    if (b >= 0 && ++this.cnt[b] === 4) k++;
    this.filled += k;
    const E = G.E, h1 = this.h1, h2 = this.h2, Z1 = G.ZS1, Z2 = G.ZS2;
    for (let s = 0, o = e; s < G.NS; s++, o += E) { h1[s] ^= Z1[o]; h2[s] ^= Z2[o]; }
    return k;
  }
  undo(e) {
    const G = this.G; this.drawn[e] = 0; this.undrawn++;
    let b = G.eb0[e];
    if (b >= 0) { if (this.cnt[b] === 4) this.filled--; this.cnt[b]--; }
    b = G.eb1[e];
    if (b >= 0) { if (this.cnt[b] === 4) this.filled--; this.cnt[b]--; }
    const E = G.E, h1 = this.h1, h2 = this.h2, Z1 = G.ZS1, Z2 = G.ZS2;
    for (let s = 0, o = e; s < G.NS; s++, o += E) { h1[s] ^= Z1[o]; h2[s] ^= Z2[o]; }
  }
  other(e, b) { const G = this.G; return G.eb0[e] === b ? G.eb1[e] : G.eb0[e]; }
  // number of boxes the edge would complete
  completes(e) { const G = this.G; let k = 0, b = G.eb0[e]; if (b >= 0 && this.cnt[b] === 3) k++; b = G.eb1[e]; if (b >= 0 && this.cnt[b] === 3) k++; return k; }
  // number of boxes that become capturable (3 sides) for the opponent
  gives(e) { const G = this.G; let k = 0, b = G.eb0[e]; if (b >= 0 && this.cnt[b] === 2) k++; b = G.eb1[e]; if (b >= 0 && this.cnt[b] === 2) k++; return k; }
  isSafe(e) { return !this.drawn[e] && this.gives(e) === 0 && this.completes(e) === 0; }
  missing(b, not) { const be = this.G.be; for (let i = b * 4; i < b * 4 + 4; i++) { const e = be[i]; if (!this.drawn[e] && e !== not) return e; } return -1; }
  hasCapture() { for (let b = 0; b < this.G.B; b++) if (this.cnt[b] === 3) return true; return false; }
  edges() { const out = []; for (let e = 0; e < this.G.E; e++) if (this.drawn[e]) out.push(e); return out; }
  legal() { const out = []; for (let e = 0; e < this.G.E; e++) if (!this.drawn[e]) out.push(e); return out; }
}

// ---------------------------------------------------------------- capture analysis
// When capturable boxes exist only a few moves need to be considered:
//  * a capture that cannot be part of a double-deal is always correct -> forced
//  * otherwise: capture, or decline (all-but-two of a chain / all-but-four of a loop)
// Returns {forced: e} or {moves: [...], declines: [...]}
function captureMoves(p) {
  const G = p.G, cnt = p.cnt;
  const moves = [], declines = [];
  for (let b = 0; b < G.B; b++) {
    if (cnt[b] !== 3) continue;
    const e = p.missing(b, -1);
    const N = p.other(e, b);
    if (N < 0 || cnt[N] !== 2) return { forced: e };
    let len = 2, prev = e, cur = N, type = 'open', firstF = -1;
    for (;;) {
      const f = p.missing(cur, prev);
      if (firstF < 0) firstF = f;
      const nx = p.other(f, cur);
      if (nx < 0 || cnt[nx] <= 1) { type = 'open'; break; }
      if (cnt[nx] === 3) { type = 'cap'; len++; break; }
      len++; prev = f; cur = nx;
      if (len > 64) break;
    }
    if (type === 'open') {
      if (len >= 3) return { forced: e };
      if (!moves.includes(e)) moves.push(e);
      if (!declines.includes(firstF)) declines.push(firstF);
    } else {
      if (len === 4) { if (!moves.includes(e)) moves.push(e); if (!declines.includes(firstF)) declines.push(firstF); }
      else return { forced: e };
    }
  }
  return { moves, declines };
}

// ---------------------------------------------------------------- simple loony endgames (only chains & loops, every box has 2 sides)
const loonyMemo = new Map();
function loonyValue(chains, loops) {
  if (!chains.length && !loops.length) return 0;
  const key = chains.join(',') + '/' + loops.join(',');
  const hit = loonyMemo.get(key);
  if (hit !== undefined) return hit;
  let best = -1e9;
  for (let i = 0; i < chains.length; i++) {
    if (i > 0 && chains[i] === chains[i - 1]) continue;
    const n = chains[i], rest = chains.slice(0, i).concat(chains.slice(i + 1));
    const v = loonyValue(rest, loops);
    const val = n <= 2 ? -n - v : Math.min(-n - v, 4 - n + v);
    if (val > best) best = val;
  }
  for (let i = 0; i < loops.length; i++) {
    if (i > 0 && loops[i] === loops[i - 1]) continue;
    const n = loops[i], rest = loops.slice(0, i).concat(loops.slice(i + 1));
    const v = loonyValue(chains, rest);
    const val = Math.min(-n - v, 8 - n + v);
    if (val > best) best = val;
  }
  if (loonyMemo.size > 200000) loonyMemo.clear();
  loonyMemo.set(key, best);
  return best;
}
// components of unfilled boxes connected through undrawn shared edges
const compScratch = { stamp: new Int32Array(64), st: 1, stack: new Int8Array(64) };
function components(p, withBoxes) {
  const G = p.G, cnt = p.cnt, be = G.be;
  const sc = compScratch; sc.st++;
  const out = [];
  for (let b0 = 0; b0 < G.B; b0++) {
    if (cnt[b0] === 4 || sc.stamp[b0] === sc.st) continue;
    let n = 0, n2 = 0, inner = 0, sp = 0; const boxes = withBoxes ? [] : null;
    sc.stack[sp++] = b0; sc.stamp[b0] = sc.st;
    while (sp) {
      const b = sc.stack[--sp]; n++; if (cnt[b] === 2) n2++; if (boxes) boxes.push(b);
      for (let i = b * 4; i < b * 4 + 4; i++) {
        const e = be[i]; if (p.drawn[e]) continue;
        const o = p.other(e, b); if (o < 0) continue;
        if (o > b) inner++;
        if (sc.stamp[o] !== sc.st) { sc.stamp[o] = sc.st; sc.stack[sp++] = o; }
      }
    }
    out.push({ n, simple: n2 === n, loop: n2 === n && inner === n, boxes });
  }
  return out;
}
function simpleLoony(p) {
  const G = p.G;
  for (let b = 0; b < G.B; b++) if (p.cnt[b] !== 4 && p.cnt[b] !== 2) return null;
  const comps = components(p, false), chains = [], loops = [];
  for (const c of comps) (c.loop ? loops : chains).push(c.n);
  chains.sort((a, b) => a - b); loops.sort((a, b) => a - b);
  return loonyValue(chains, loops);
}
// rough loony value for positions that still contain junction boxes
function approxLoony(p) {
  const comps = components(p, false), chains = [], loops = [];
  for (const c of comps) {
    if (c.simple) (c.loop ? loops : chains).push(c.n);
    else { // treat a junction blob as a couple of chains
      if (c.n >= 6) { chains.push(Math.floor(c.n / 2)); chains.push(c.n - Math.floor(c.n / 2)); } else chains.push(c.n);
    }
  }
  chains.sort((a, b) => a - b); loops.sort((a, b) => a - b);
  if (chains.length + loops.length > 12) { // keep the DP small
    let small = 0; while (chains.length + loops.length > 12 && chains.length && chains[0] <= 2) small += chains.shift();
    return loonyValue(chains, loops) + (small % 2 ? 1 : 0);
  }
  return loonyValue(chains, loops);
}

// ---------------------------------------------------------------- redundant moves in isolated chains / loops
// In an isolated component whose boxes all have exactly two sides drawn (a plain chain or loop),
// every opening of a loop or of a chain of length 1 or >= 3 leads to the same game, and components of
// equal shape are interchangeable. A 2-chain has two distinct openings (middle = hard-hearted, end).
// Marks every redundant edge with skip[e] = tag. This pruning keeps the search exact.
const red = { stamp: new Int32Array(64), st: 1, list: new Int8Array(64), key: new Int32Array(160) };
function markRedundant(p, skip, tag) {
  const G = p.G, cnt = p.cnt, be = G.be, drawn = p.drawn, list = red.list;
  const st = ++red.st;
  let found = 0;
  for (let b0 = 0; b0 < G.B; b0++) {
    if (cnt[b0] !== 2 || red.stamp[b0] === st) continue;
    let lo = 0, hi = 0, simple = true, inner = 0;
    list[hi++] = b0; red.stamp[b0] = st;
    while (lo < hi) {
      const b = list[lo++]; if (cnt[b] !== 2) simple = false;
      for (let i = b * 4; i < b * 4 + 4; i++) {
        const e = be[i]; if (drawn[e]) continue;
        const o = p.other(e, b); if (o < 0) continue;
        if (o > b) inner++;
        if (red.stamp[o] !== st) { red.stamp[o] = st; list[hi++] = o; }
      }
    }
    if (!simple) continue;
    const n = hi, loop = inner === n, key = loop ? 80 + n : n;
    let keep1 = -1, keep2 = -1;
    if (red.key[key] !== st) {
      red.key[key] = st;
      const a = list[0];
      if (!loop && n === 2) {
        const b = list[1];
        for (let i = a * 4; i < a * 4 + 4; i++) { const e = be[i]; if (drawn[e]) continue; if (p.other(e, a) === b) keep1 = e; else if (keep2 < 0) keep2 = e; }
      } else {
        for (let i = a * 4; i < a * 4 + 4; i++) { const e = be[i]; if (!drawn[e]) { keep1 = e; break; } }
      }
    }
    for (let j = 0; j < n; j++) {
      const b = list[j];
      for (let i = b * 4; i < b * 4 + 4; i++) { const e = be[i]; if (!drawn[e] && e !== keep1 && e !== keep2 && skip[e] !== tag) { skip[e] = tag; found++; } }
    }
  }
  return found;
}

// ---------------------------------------------------------------- exact solver
const INF = 127;
class Solver {
  constructor(G, bits) {
    this.G = G; bits = bits || (G.E <= 24 ? 22 : 21);
    const size = 1 << bits; this.mask = size - 1;
    this.k1 = new Int32Array(size); this.k2 = new Int32Array(size);
    this.lo = new Int8Array(size); this.hi = new Int8Array(size); this.bm = new Int8Array(size); this.used = new Uint8Array(size);
    this.nodes = 0; this.maxNodes = Infinity; this.deadline = Infinity; this.aborted = false;
    this.mbuf = []; for (let i = 0; i <= G.E + 2; i++) this.mbuf.push(new Int8Array(G.E));
    this.sbuf = []; for (let i = 0; i <= G.E + 2; i++) this.sbuf.push(new Int32Array(G.E));
    this.order = new Int8Array(G.E); for (let i = 0; i < G.E; i++) this.order[i] = i;
    this.prune = false; this.skip = new Int32Array(G.E); this.tag = 0;
  }
  canon(p) {
    const NS = this.G.NS, h1 = p.h1, h2 = p.h2; let s = 0;
    for (let t = 1; t < NS; t++) { const a = h1[t] >>> 0, b = h1[s] >>> 0; if (a < b || (a === b && (h2[t] >>> 0) < (h2[s] >>> 0))) s = t; }
    return s;
  }
  checkAbort() {
    if (this.nodes > this.maxNodes || ((this.nodes & 2047) === 0 && Date.now() > this.deadline)) this.aborted = true;
    return this.aborted;
  }
  // net future boxes for the player to move
  search(p, alpha, beta, ply) {
    this.nodes++;
    if (this.aborted || this.checkAbort()) return 0;
    const G = this.G, rem = G.B - p.filled;
    if (rem === 0) return 0;
    if (alpha >= rem) return rem;
    if (beta <= -rem) return -rem;
    const cap = p.hasCapture() ? captureMoves(p) : null;
    if (cap && cap.forced !== undefined) {
      const e = cap.forced, k = p.play(e);
      const v = k + this.search(p, alpha - k, beta - k, ply + 1);
      p.undo(e); return v;
    }
    if (!cap) { const lv = simpleLoony(p); if (lv !== null) return lv; }
    // transposition table
    const s = this.canon(p), a1 = p.h1[s], a2 = p.h2[s], idx = a2 & this.mask;
    let ttMove = -1;
    if (this.used[idx] && this.k1[idx] === a1 && this.k2[idx] === a2) {
      const lo = this.lo[idx], hi = this.hi[idx];
      if (lo === hi) return lo;
      if (lo >= beta) return lo;
      if (hi <= alpha) return hi;
      if (lo > alpha) alpha = lo;
      if (hi < beta) beta = hi;
      if (this.bm[idx] >= 0) ttMove = G.inv[s][this.bm[idx]];
    }
    const alpha0 = alpha, beta0 = beta;
    const mv = this.mbuf[ply]; let nm = 0;
    if (cap) {
      for (const e of cap.moves) mv[nm++] = e;
      for (const e of cap.declines) mv[nm++] = e;
    } else {
      const sc = this.sbuf[ply];
      const ord = this.order, skip = this.skip;
      let tag = -1;
      if (this.prune) { tag = ++this.tag; markRedundant(p, skip, tag); }
      for (let i = 0; i < G.E; i++) {
        const e = ord[i]; if (p.drawn[e] || skip[e] === tag) continue;
        const gv = p.gives(e);
        mv[nm] = e; sc[nm] = e === ttMove ? -1e9 : gv * 10; nm++;
      }
      // insertion sort by score
      for (let i = 1; i < nm; i++) { const e = mv[i], k = sc[i]; let j = i - 1; while (j >= 0 && sc[j] > k) { mv[j + 1] = mv[j]; sc[j + 1] = sc[j]; j--; } mv[j + 1] = e; sc[j + 1] = k; }
    }
    if (cap && ttMove >= 0) { for (let i = 1; i < nm; i++) if (mv[i] === ttMove) { mv[i] = mv[0]; mv[0] = ttMove; break; } }
    let best = -INF, bestMove = -1;
    for (let i = 0; i < nm; i++) {
      const e = mv[i], k = p.play(e);
      const v = k > 0 ? k + this.search(p, alpha - k, beta - k, ply + 1) : -this.search(p, -beta, -alpha, ply + 1);
      p.undo(e);
      if (this.aborted) return 0;
      if (v > best) { best = v; bestMove = e; }
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    // store
    let lo = -INF, hi = INF;
    if (this.used[idx] && this.k1[idx] === a1 && this.k2[idx] === a2) { lo = this.lo[idx]; hi = this.hi[idx]; }
    if (best <= alpha0) hi = Math.min(hi, best);
    else if (best >= beta0) lo = Math.max(lo, best);
    else { lo = best; hi = best; }
    if (lo > hi) { lo = best; hi = best; }
    this.used[idx] = 1; this.k1[idx] = a1; this.k2[idx] = a2; this.lo[idx] = lo; this.hi[idx] = hi;
    this.bm[idx] = bestMove >= 0 ? G.perms[s][bestMove] : -1;
    return best;
  }
  limit(maxNodes, ms) { this.nodes = 0; this.aborted = false; this.maxNodes = maxNodes || Infinity; this.deadline = ms ? Date.now() + ms : Infinity; }
  // exact value of playing e (from the mover's view), or null if aborted
  moveValue(p, e, alpha, beta) {
    const rem = this.G.B - p.filled;
    if (alpha === undefined) { alpha = -rem - 1; beta = rem + 1; }
    const k = p.play(e);
    const v = k > 0 ? k + this.search(p, alpha - k, beta - k, 0) : -this.search(p, -beta, -alpha, 0);
    p.undo(e);
    return this.aborted ? null : v;
  }
  value(p) { const rem = this.G.B - p.filled; const v = this.search(p, -rem - 1, rem + 1, 0); return this.aborted ? null : v; }
  // best move by root alpha-beta. Returns {move, value} or null if aborted.
  // first: a move to try first (e.g. the heuristic choice). After an abort, this.partial holds the best move
  // proven so far (only set once the first move has been solved), which is never worse than `first`.
  best(p, rand, first) {
    const G = this.G, rem = G.B - p.filled;
    this.partial = null;
    if (p.undrawn === 0) return null;
    let moves;
    const cap = p.hasCapture() ? captureMoves(p) : null;
    if (cap && cap.forced !== undefined) moves = [cap.forced];
    else if (cap) moves = cap.moves.concat(cap.declines);
    else {
      moves = p.legal();
      if (this.prune) { const tag = ++this.tag; markRedundant(p, this.skip, tag); moves = moves.filter(e => this.skip[e] !== tag); }
      moves.sort((a, b) => p.gives(a) - p.gives(b));
    }
    if (rand) { for (let i = moves.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [moves[i], moves[j]] = [moves[j], moves[i]]; } moves.sort((a, b) => p.gives(a) - p.gives(b)); }
    // a quick probe of the TT move first
    const s = this.canon(p), idx = p.h2[s] & this.mask;
    if (this.used[idx] && this.k1[idx] === p.h1[s] && this.k2[idx] === p.h2[s] && this.bm[idx] >= 0) {
      const tm = G.inv[s][this.bm[idx]], j = moves.indexOf(tm);
      if (j > 0 && !rand) { moves.splice(j, 1); moves.unshift(tm); }
    }
    if (first !== undefined && first >= 0) { const j = moves.indexOf(first); if (j > 0) { moves.splice(j, 1); moves.unshift(first); } }
    let alpha = -rem - 1, bestMove = moves[0], bestV = -INF;
    for (let i = 0; i < moves.length; i++) {
      const e = moves[i];
      let v;
      if (this.prune && i > 0) {   // null-window test first: only re-search moves that beat the current best
        v = this.moveValue(p, e, alpha, alpha + 1);
        if (v !== null && v > alpha) v = this.moveValue(p, e, alpha, rem + 1);
      } else v = this.moveValue(p, e, alpha, rem + 1);
      if (v === null) return null;
      if (v > bestV) { bestV = v; bestMove = e; this.partial = { move: e, value: v }; }
      if (v > alpha) alpha = v;
    }
    return { move: bestMove, value: bestV };
  }
  // root moves exactly as best() would search them (redundant chain/loop openings removed), safe moves first
  rootMoves(p) {
    const cap = p.hasCapture() ? captureMoves(p) : null;
    if (cap && cap.forced !== undefined) return [cap.forced];
    if (cap) return cap.moves.concat(cap.declines);
    let moves = p.legal();
    if (this.prune) { const tag = ++this.tag; markRedundant(p, this.skip, tag); moves = moves.filter(e => this.skip[e] !== tag); }
    return moves.sort((a, b) => p.gives(a) - p.gives(b));
  }
  // root alpha-beta over the given moves only (one share of a split root). Returns {move, value} or null if aborted;
  // this.partial then holds the best move proven so far and this.firstV the exact value of moves[0] once known.
  bestOf(p, moves) {
    const rem = this.G.B - p.filled;
    this.partial = null; this.firstV = null;
    let alpha = -rem - 1, bestMove = moves[0], bestV = -INF;
    for (let i = 0; i < moves.length; i++) {
      const e = moves[i];
      let v;
      if (i > 0) { v = this.moveValue(p, e, alpha, alpha + 1); if (v !== null && v > alpha) v = this.moveValue(p, e, alpha, rem + 1); }
      else v = this.moveValue(p, e, alpha, rem + 1);
      if (v === null) return null;
      if (i === 0) this.firstV = v;
      if (v > bestV) { bestV = v; bestMove = e; this.partial = { move: e, value: v }; }
      if (v > alpha) alpha = v;
    }
    return { move: bestMove, value: bestV };
  }
  // exact values of every legal move. Returns array [{m, v}] or null.
  all(p) {
    const out = [];
    const b = this.best(p); if (!b) return null;
    for (const e of p.legal()) {
      const v = this.moveValue(p, e); if (v === null) return null;
      out.push({ m: e, v });
    }
    return out;
  }
}

// ---------------------------------------------------------------- heuristic evaluation (long-chain parity)
// Play out the safe phase greedily a few times, then score the loony endgame for whoever must move then.
const STEPS = [7, 11, 13, 17, 19, 23];
function evalH(p, salt, np) {
  const G = p.G, E = G.E; np = np || 3;
  let sum = 0; salt = salt >>> 0;
  const played = [];
  for (let t = 0; t < np; t++) {
    const step = STEPS[(salt + t) % 6], off = (salt + t * 977) % E;
    played.length = 0;
    for (let i = 0; i < E; i++) {
      const e = (off + i * step) % E;
      if (!p.drawn[e] && p.gives(e) === 0 && p.completes(e) === 0) { p.play(e); played.push(e); }
    }
    const v = approxLoony(p);
    for (let i = played.length - 1; i >= 0; i--) p.undo(played[i]);
    sum += (played.length & 1) ? -v : v;
  }
  return sum / np;
}
// candidate moves for the heuristic search (no captures available)
const qSkip = { arr: new Int32Array(128), tag: 0 };
function quietMoves(p, prune) {
  const safe = [], other = [];
  let tag = -1; const skip = qSkip.arr;
  if (prune) { tag = ++qSkip.tag; markRedundant(p, skip, tag); }
  for (let e = 0; e < p.G.E; e++) { if (p.drawn[e] || skip[e] === tag) continue; if (p.gives(e) === 0) safe.push(e); else other.push(e); }
  if (safe.length) {
    if (safe.length <= 10) { // small sacrifices can flip the parity late in the safe phase
      const sac = [];
      for (const e of other) { if (p.gives(e) !== 1) continue; const s = sacrificeSize(p, e); if (s <= 2) sac.push([s, e]); }
      sac.sort((a, b) => a[0] - b[0]);
      for (const x of sac) safe.push(x[1]);
    }
    return { moves: safe, safe: true };
  }
  const sz = other.map(e => [sacrificeSize(p, e), e]).sort((a, b) => a[0] - b[0]);
  return { moves: sz.map(x => x[1]), safe: false };
}
function countSafe(p) { let n = 0; for (let e = 0; e < p.G.E; e++) if (!p.drawn[e] && p.gives(e) === 0) n++; return n; }

class HSearch {
  constructor(G) {
    this.G = G; this.nodes = 0; this.deadline = Infinity; this.aborted = false; this.np = 3; this.prune = false;
    const size = 1 << 18; this.mask = size - 1;
    this.k1 = new Int32Array(size); this.k2 = new Int32Array(size); this.val = new Float32Array(size);
    this.dep = new Int8Array(size); this.flag = new Int8Array(size); this.bm = new Int8Array(size); this.used = new Uint8Array(size);
  }
  canon(p) {
    const NS = this.G.NS, h1 = p.h1, h2 = p.h2; let s = 0;
    for (let t = 1; t < NS; t++) { const a = h1[t] >>> 0, b = h1[s] >>> 0; if (a < b || (a === b && (h2[t] >>> 0) < (h2[s] >>> 0))) s = t; }
    return s;
  }
  search(p, depth, alpha, beta) {
    this.nodes++;
    if ((this.nodes & 511) === 0 && Date.now() > this.deadline) this.aborted = true;
    if (this.aborted) return 0;
    const G = this.G, rem = G.B - p.filled;
    if (rem === 0) return 0;
    const cap = p.hasCapture() ? captureMoves(p) : null;
    if (cap && cap.forced !== undefined) { const e = cap.forced, k = p.play(e); const v = k + this.search(p, depth, alpha - k, beta - k); p.undo(e); return v; }
    let moves;
    if (!cap) {
      const lv = simpleLoony(p); if (lv !== null) return lv;
      if (depth <= 0) { return countSafe(p) ? evalH(p, p.h1[0], this.np) : approxLoony(p); }
    }
    const s = this.canon(p), a1 = p.h1[s], a2 = p.h2[s], idx = a2 & this.mask;
    let ttMove = -1;
    if (this.used[idx] && this.k1[idx] === a1 && this.k2[idx] === a2) {
      if (this.bm[idx] >= 0) ttMove = G.inv[s][this.bm[idx]];
      if (this.dep[idx] >= depth) {
        const v = this.val[idx], fl = this.flag[idx];
        if (fl === 0) return v;
        if (fl === 1 && v >= beta) return v;
        if (fl === 2 && v <= alpha) return v;
      }
    }
    moves = cap ? cap.moves.concat(cap.declines) : quietMoves(p, this.prune).moves;
    if (ttMove >= 0) { const j = moves.indexOf(ttMove); if (j > 0) { moves.splice(j, 1); moves.unshift(ttMove); } }
    const alpha0 = alpha;
    let best = -INF, bestMove = -1;
    for (const e of moves) {
      const k = p.play(e);
      const v = k > 0 ? k + this.search(p, depth - 1, alpha - k, beta - k) : -this.search(p, depth - 1, -beta, -alpha);
      p.undo(e);
      if (this.aborted) return 0;
      if (v > best) { best = v; bestMove = e; }
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    this.used[idx] = 1; this.k1[idx] = a1; this.k2[idx] = a2; this.val[idx] = best; this.dep[idx] = Math.min(depth, 127);
    this.flag[idx] = best <= alpha0 ? 2 : best >= beta ? 1 : 0;
    this.bm[idx] = bestMove >= 0 ? G.perms[s][bestMove] : -1;
    return best;
  }
  rootMoves(p, rand) {
    const cap = p.hasCapture() ? captureMoves(p) : null;
    if (cap && cap.forced !== undefined) return [cap.forced];
    let moves = cap ? cap.moves.concat(cap.declines) : quietMoves(p, this.prune).moves;
    if (rand) { // shuffle, then keep safe moves in front
      for (let i = moves.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [moves[i], moves[j]] = [moves[j], moves[i]]; }
      if (!cap) moves.sort((a, b) => p.gives(a) - p.gives(b));
    }
    return moves;
  }
  // iterative deepening with full windows (scores of every candidate, for hints)
  root(p, maxDepth, ms, extra) {
    this.deadline = Date.now() + ms; this.aborted = false; this.nodes = 0;
    const moves = this.rootMoves(p, null);
    if (extra) for (const e of extra) if (e >= 0 && !p.drawn[e] && !moves.includes(e)) moves.push(e);
    let result = moves.map(m => ({ m, v: -p.gives(m) * 3 }));
    for (let d = 0; d <= maxDepth; d++) {
      const cur = [];
      for (const it of result) {
        const e = it.m, k = p.play(e);
        const v = k > 0 ? k + this.search(p, d, -INF, INF) : -this.search(p, d, -INF, INF);
        p.undo(e);
        if (this.aborted) break;
        cur.push({ m: e, v });
      }
      if (this.aborted) break;
      cur.sort((a, b) => b.v - a.v);
      result = cur; this.depth = d;
      if (d >= p.undrawn) break;
    }
    return result;
  }
  // principal variation from the table (after the root move has been played on q)
  pv(q, n) {
    const G = this.G, out = [];
    for (let i = 0; i < n && q.undrawn > 0; i++) {
      const cap = q.hasCapture() ? captureMoves(q) : null;
      let e = -1;
      if (cap && cap.forced !== undefined) e = cap.forced;
      else {
        const s = this.canon(q), idx = q.h2[s] & this.mask;
        if (this.used[idx] && this.k1[idx] === q.h1[s] && this.k2[idx] === q.h2[s] && this.bm[idx] >= 0) e = G.inv[s][this.bm[idx]];
      }
      if (e < 0 || q.drawn[e]) break;
      q.play(e); out.push(e);
    }
    return out;
  }
  best(p, maxDepth, ms, rand, exclude) {
    this.deadline = Date.now() + ms; this.aborted = false; this.nodes = 0;
    let moves = this.rootMoves(p, rand);
    if (exclude) { const m2 = moves.filter(e => !exclude.has(e)); if (m2.length) moves = m2; }
    if (moves.length === 1) return { move: moves[0], value: 0 };
    let bestMove = moves[0], bestV = 0;
    for (let d = 0; d <= maxDepth; d++) {
      let alpha = -INF, bm = -1, bv = -INF, firstV = null;
      for (const e of moves) {
        const k = p.play(e);
        const v = k > 0 ? k + this.search(p, d, alpha - k, INF) : -this.search(p, d, -INF, -alpha);
        p.undo(e);
        if (this.aborted) break;
        if (firstV === null) firstV = v;
        if (v > bv) { bv = v; bm = e; }
        if (v > alpha) alpha = v;
      }
      if (this.aborted) { if (bm >= 0 && bm !== moves[0] && firstV !== null && bv > firstV) { bestMove = bm; bestV = bv; } break; }
      bestMove = bm; bestV = bv; this.depth = d;
      moves = [bm].concat(moves.filter(x => x !== bm));
      if (d >= p.undrawn) break;
    }
    return { move: bestMove, value: bestV };
  }
}

// ---------------------------------------------------------------- simple policies
function pick(arr, rand) { return arr[Math.floor(rand() * arr.length)]; }
function captureEdge(p) { for (let b = 0; b < p.G.B; b++) if (p.cnt[b] === 3) return p.missing(b, -1); return -1; }
// boxes the opponent could take greedily after we draw e
function sacrificeSize(p, e) {
  const played = [e]; p.play(e);
  let n = 0;
  for (;;) { const c = captureEdge(p); if (c < 0) break; n += p.play(c); played.push(c); }
  for (let i = played.length - 1; i >= 0; i--) p.undo(played[i]);
  return n;
}

const LEVELS = {
  1: { kind: 'random' }, 2: { kind: 'greedy' }, 3: { kind: 'safe' }, 4: { kind: 'safe2' },
  5: { kind: 'search', own: true, exactNodes: 20000, safeGate: 6, depth: 1, ms: 400, np: 1 },
  6: { kind: 'search', own: true, exactNodes: 150000, safeGate: 8, depth: 3, ms: 800, np: 2 },
  7: { kind: 'search', exactMs: 500, safeGate: 9, depth: 14, ms: 1100, np: 2 },
  // Lv8: its own exact solver (exact move pruning, null-window root search, bigger table); switches to it much earlier
  8: { kind: 'search', fast: true, exactMs: 300, hMs: 400, safeGate: { 3: 99, 4: 27, 5: 21 }, depth: 40, ms: 1750, np: 3 },
  // Lv9 / Lv10: more time, an earlier switch to the exact solver, its own tables, and helper workers when the device has
  // spare cores (chooseMoveAsync): the exact solver splits the root moves, the heuristic search splits them per depth
  // gate: try the exact solver at or below this many safe moves (pgate: with helper workers, which solve while this
  // worker runs the heuristic search); sure: below this it usually finishes, so this worker solves as well
  9: { kind: 'v2', ms: 3000, gate: { 3: 99, 4: 28, 5: 20 }, sure: { 3: 99, 4: 20, 5: 15 }, pgate: { 4: 34, 5: 24 }, w5: { gate: 27, sure: 20, pgate: 27, hs: 0.15, hn: 0.35, re: 0.1 }, depth: 40, np: 3, quick: 0.12, hs: 0.15, hn: 0.45 },
  10: { kind: 'v2', ms: 5000, gate: { 3: 99, 4: 30, 5: 22 }, sure: { 3: 99, 4: 22, 5: 16 }, pgate: { 4: 36, 5: 26 }, w5: { gate: 28, sure: 21, pgate: 28, hs: 0.15, hn: 0.35, re: 0.1 }, depth: 40, np: 3, quick: 0.12, hs: 0.15, hn: 0.45 },
};

const solvers = {}, smallSolvers = {};
function solverFor(G) { const k = G.R + 'x' + G.C; return solvers[k] || (solvers[k] = new Solver(G)); }
const hsCache = {};
function hsFor(G, np, fast) { const k = G.R + 'x' + G.C + ':' + np + (fast ? 'f' : ''); if (!hsCache[k]) { hsCache[k] = new HSearch(G); hsCache[k].np = np; hsCache[k].prune = !!fast; } return hsCache[k]; }
const fastSolvers = {};
function fastSolverFor(G) { const k = G.R + 'x' + G.C; if (!fastSolvers[k]) { const s = new Solver(G, 22); s.prune = true; fastSolvers[k] = s; } return fastSolvers[k]; }
function smallSolverFor(G) { const k = G.R + 'x' + G.C; const s = smallSolvers[k] || (smallSolvers[k] = new Solver(G, 17)); s.used.fill(0); return s; }

function chooseMove(p, level, rand, lead, hist) {
  rand = rand || Math.random;
  const cfg = LEVELS[level] || LEVELS[8];
  const legal = p.legal();
  if (legal.length === 1) return { move: legal[0], exact: false };
  if (cfg.kind === 'random') return { move: pick(legal, rand) };
  const ce = captureEdge(p);
  if (cfg.kind === 'greedy') return { move: ce >= 0 ? ce : pick(legal, rand) };
  if (cfg.kind === 'safe' || cfg.kind === 'safe2') {
    if (ce >= 0) return { move: ce };
    const safe = legal.filter(e => p.gives(e) === 0);
    if (safe.length) return { move: pick(safe, rand) };
    if (cfg.kind === 'safe') return { move: pick(legal, rand) };
    let best = Infinity, cands = [];
    for (const e of legal) { const s = sacrificeSize(p, e); if (s < best) { best = s; cands = [e]; } else if (s === best) cands.push(e); }
    return { move: pick(cands, rand) };
  }
  // search levels
  const cap = p.hasCapture() ? captureMoves(p) : null;
  if (cap && cap.forced !== undefined) return { move: cap.forced, forced: true };
  if (cfg.kind === 'v2') { if (p.G.R === 5 && p.G.C === 5 && X5.st === 0 && typeof importScripts !== 'function') x5Ready(); return chooseV2(p, cfg, rand, lead, hist); }
  if (cfg.book) { const bk = bookMove(p); if (bk) return bk; }
  const t0 = Date.now();
  const gate = typeof cfg.safeGate === 'object' ? (cfg.safeGate[p.G.R] || 12) : cfg.safeGate;
  if (cfg.fast && (p.G.E <= 24 || countSafe(p) <= gate)) {
    // a short exact try (cheap once the table is warm), then the heuristic choice, then a longer exact run that
    // starts from it; if that run is cut off, keep the best move it has proven so far
    const S = fastSolverFor(p.G), safe = countSafe(p);
    S.limit(0, safe <= 12 ? cfg.ms - 60 : cfg.exactMs);   // late positions almost always finish: give them everything
    let r = S.best(p, rand);
    if (r) return { move: r.move, value: r.value, exact: true, nodes: S.nodes };
    const H = hsFor(p.G, cfg.np, true);
    const h = H.best(p, cfg.depth, Math.max(80, Math.min(cfg.hMs, cfg.ms - (Date.now() - t0) - 120)), rand);
    const left = cfg.ms - (Date.now() - t0);
    if (left < 150) return { move: h.move, value: h.value, exact: false, depth: H.depth };
    S.limit(0, left);
    r = S.best(p, rand, h.move);
    if (r) return { move: r.move, value: r.value, exact: true, nodes: S.nodes };
    if (S.partial) return { move: S.partial.move, value: S.partial.value, exact: false };
    return { move: h.move, value: h.value, exact: false, depth: H.depth };
  }
  if (!cfg.fast && (p.G.E <= 24 || countSafe(p) <= gate)) {
    const S = cfg.own ? smallSolverFor(p.G) : cfg.fast ? fastSolverFor(p.G) : solverFor(p.G);
    S.limit(cfg.exactNodes, cfg.exactMs);
    const r = S.best(p, rand);
    if (r) return { move: r.move, value: r.value, exact: true, nodes: S.nodes };
  }
  const H = hsFor(p.G, cfg.np, cfg.fast);
  const left = Math.max(100, cfg.ms - (Date.now() - t0));
  const h = H.best(p, cfg.depth, left, rand);
  return { move: h.move, value: h.value, exact: false, depth: H.depth };
}

// ---------------------------------------------------------------- Lv9+ search
// What decides a game is who wins, so Lv9+ first asks the solver only that: an "outcome" search with a window of width 2
// around the score needed for a draw (several times cheaper than an exact value), which reaches positions much earlier.
// lead: the mover's boxes minus the opponent's so far (only needed once boxes have been taken).
const v2Solvers = {}, v2Hs = {};
let v2Bits = 22;   // helper workers use smaller tables
function v2SolverFor(G) {
  if (x5Ok(G)) return X5.w;
  const k = G.R + 'x' + G.C; if (!v2Solvers[k]) { const s = new Solver(G, G.E <= 24 ? 20 : v2Bits); s.prune = true; v2Solvers[k] = s; } return v2Solvers[k];
}
function v2HsFor(G, np) { const k = G.R + 'x' + G.C + ':' + np; if (!v2Hs[k]) { const h = new HSearch(G); h.np = np; h.prune = true; v2Hs[k] = h; } return v2Hs[k]; }
function v2Gate(cfg, G) { return G.E <= 24 ? 99 : x5Ok(G) ? cfg.w5.gate : (cfg.gate[G.R] || 20); }
function v2Sure(cfg, G) { return G.E <= 24 ? 99 : x5Ok(G) ? cfg.w5.sure : (cfg.sure[G.R] || 14); }
function v2PGate(cfg, G) { return G.E <= 24 ? 99 : x5Ok(G) ? cfg.w5.pgate : (cfg.pgate[G.R] || 20); }
// net future boxes the mover needs for a draw, or null when unknown or already decided (then: exact values)
function v2Target(p, lead) {
  if (lead === undefined || lead === null) { if (p.filled > 0) return null; lead = 0; }
  const t = -lead, rem = p.G.B - p.filled;
  return (t > rem || t < -rem) ? null : t;
}
// outcome root search over the given moves: window (t-1, t+1), stops at the first win.
// Returns {move, value, cls} (cls 1 win / 0 draw / -1 loss; value is exact only for a draw) or null if cut off;
// this.partial then holds the best result proven so far.
Solver.prototype.outcome = function (p, t, moves) {
  this.partial = null; this.firstV = null;
  let alpha = t - 1;
  for (let i = 0; i < moves.length; i++) {
    const e = moves[i], v = this.moveValue(p, e, alpha, t + 1);
    if (v === null) return null;
    if (i === 0) this.firstV = v;
    if (!this.partial || v > this.partial.value) this.partial = { move: e, value: v, cls: v > t ? 1 : v === t ? 0 : -1 };
    if (v > alpha) alpha = v;
    if (alpha > t) break;
  }
  return this.partial;
};
function v2Moves(S, p, first, rand) {
  let moves = S.rootMoves(p);
  if (rand) for (let i = moves.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [moves[i], moves[j]] = [moves[j], moves[i]]; }
  moves.sort((a, b) => p.gives(a) - p.gives(b));
  if (first >= 0 && moves.includes(first)) moves = [first].concat(moves.filter(e => e !== first));
  return moves;
}
// turn an outcome result into a move answer; null when it is no use (all moves lose: then exact values decide)
function v2FromOutcome(o, t) {
  if (!o || o.cls < 0) return null;
  return { move: o.move, value: o.value, exact: o.cls === 0, outcome: o.cls };
}
// single-thread version (also the fallback when no helper workers are available)
function chooseV2(p, cfg, rand, lead, hist) {
  const G = p.G, t0 = Date.now(), ms = cfg.ms;
  if (G.R === 4 && G.C === 4 && x4Ready() === true) {   // 4x4: book, then the exact WebAssembly solver
    const r = x4Choose(p, cfg, lead, hist, ms - 300);
    if (r) return r;
    const h = v2HsFor(G, cfg.np).best(p, cfg.depth, 150, rand);
    return { move: h.move, value: h.value, exact: false, depth: v2HsFor(G, cfg.np).depth };
  }
  const safe = countSafe(p), exactOk = safe <= v2Gate(cfg, G), sure = safe <= v2Sure(cfg, G);
  const S = v2SolverFor(G), H = v2HsFor(G, cfg.np), t = v2Target(p, lead);
  const left = () => ms - (Date.now() - t0);
  let r;
  if (x5Ok(G) && t !== null && safe > 12 && exactOk) return chooseW5(p, cfg, rand, t, sure, t0);
  if (exactOk && (safe <= 12 || t === null || G.E <= 24)) {   // late, small board or score unknown: exact values
    S.limit(0, safe <= 12 || G.E <= 24 ? ms - 60 : ms * (sure ? 0.2 : 0.1));
    r = S.best(p, rand);
    if (r) return { move: r.move, value: r.value, exact: true, nodes: S.nodes };
  }
  const h = H.best(p, cfg.depth, Math.max(80, exactOk ? ms * (sure ? cfg.hs : cfg.hn) : left() - 30), rand);
  if (!exactOk || left() < 150) return { move: h.move, value: h.value, exact: false, depth: H.depth };
  if (t !== null) {
    S.limit(0, left() - 20);
    const o = S.outcome(p, t, v2Moves(S, p, h.move, rand));
    const ans = v2FromOutcome(o, t);
    if (ans) {
      // time to spare: the exact value (for the score shown and the best margin); never worse than the outcome move
      if (ans.outcome > 0 && left() > ms * 0.3) { S.limit(0, left() - 20); r = S.best(p, rand, ans.move); if (r) return { move: r.move, value: r.value, exact: true }; }
      return ans;
    }
    if (!o) {   // cut off: a proven draw is kept; a proven loss of the heuristic move with nothing else proven changes nothing
      const pr = S.partial;
      if (pr && pr.cls >= 0) return { move: pr.move, value: pr.value, exact: false };
      return { move: h.move, value: h.value, exact: false, depth: H.depth };
    }
    if (left() < 150) return { move: h.move, value: h.value, exact: false, depth: H.depth };
  }
  // every move loses (or no outcome search): exact values for the best margin
  S.limit(0, left() - 20);
  r = S.best(p, rand, h.move);
  if (r) return { move: r.move, value: r.value, exact: true, nodes: S.nodes };
  if (S.partial && t === null) return { move: S.partial.move, value: S.partial.value, exact: false };
  return { move: h.move, value: h.value, exact: false, depth: H.depth };
}
// 5x5 with the wasm solver: a heuristic search first (short when the solver will very likely finish), then outcome
// searches of every move in growing slices: play a proven win (or draw); otherwise never a move proven to lose
function chooseW5(p, cfg, rand, t, sure, t0) {
  const G = p.G, ms = cfg.ms, S = X5.w, H = v2HsFor(G, cfg.np), left = () => ms - (Date.now() - t0);
  const h = H.best(p, cfg.depth, Math.max(60, ms * (sure ? cfg.w5.hs : cfg.w5.hn)), rand);
  const moves = v2Moves(S, p, h.move, rand);
  const o = S.sliced(p, t, moves, left() - (sure ? 30 : ms * cfg.w5.re));
  if (o.win) {
    if (left() > ms * 0.3) { S.limit(0, left() - 20); const r = S.best(p, rand, o.win.move); if (r) return { move: r.move, value: r.value, exact: true }; }
    return { move: o.win.move, value: o.win.value, exact: false, outcome: 1 };
  }
  if (o.draw) return { move: o.draw.move, value: o.draw.value, exact: false, outcome: 0 };
  if (!o.open.length) {   // every move loses: the best margin
    S.limit(0, left() - 20); const r = S.best(p, rand, h.move);
    if (r) return { move: r.move, value: r.value, exact: true };
    return { move: h.move, value: h.value, exact: false };
  }
  if (!o.lost.has(h.move)) return { move: h.move, value: h.value, exact: false, depth: H.depth };
  if (o.open.length === 1 || left() < 60) return { move: o.open[0], value: h.value, exact: false };
  const h2 = H.best(p, cfg.depth, left() - 20, rand, o.lost);
  return { move: o.lost.has(h2.move) ? o.open[0] : h2.move, value: h2.value, exact: false, depth: H.depth };
}
// Pondering (5x5, Lv9+): while the opponent thinks, prove the outcome of each of the opponent's replies, round-robin in
// growing slices. The work stays in the table, so the next search starts warm (often already solved).
// ponderStart(p, lead): p = the position after our move, lead = the opponent's lead. ponderStep(ms) works for about ms;
// returns false when there is nothing (more) to do.
const PD = { on: false };
function ponderStart(p, lead, level) {
  PD.on = false;
  const cfg = LEVELS[level] || {};
  if (!x5Ok(p.G) || cfg.kind !== 'v2' || !p.undrawn || p.hasCapture()) return false;
  const safe = countSafe(p), t = v2Target(p, lead);
  if (t === null || safe > cfg.w5.gate + 4 || safe <= 6) return false;
  const S = X5.w; S.set(p);
  Object.assign(PD, { on: true, until: Date.now() + 20000, lo: X5.io[0], hi: X5.io[1], t, moves: S.rootMoves(p), st: null, b: 30, i: 0, open: 0 });
  PD.st = new Int8Array(PD.moves.length);
  return true;
}
function ponderStep(ms) {
  if (!PD.on || !x5Ok(geom(5, 5))) return false;
  if (Date.now() > PD.until) { PD.on = false; return false; }   // at most 20 s per move
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (PD.i >= PD.moves.length) { if (!PD.open) { PD.on = false; return false; } PD.i = 0; PD.open = 0; PD.b *= 3; }
    const i = PD.i++;
    if (PD.st[i]) continue;
    X5.io[0] = PD.lo; X5.io[1] = PD.hi;
    const v = X5.x.w_move_value(PD.moves[i], PD.t - 1, PD.t + 1, Math.max(5, Math.min(PD.b, end - Date.now())));
    if (v === -999) PD.open++; else PD.st[i] = 1;
  }
  return true;
}
function ponderStop() { PD.on = false; }
// the same with helper workers: each proves a share of the moves while this worker runs the heuristic search and then
// proves its own share (the heuristic move first)
async function chooseW5Async(p, cfg, rand, t, sure, t0, pool) {
  const G = p.G, ms = cfg.ms, S = X5.w, H = v2HsFor(G, cfg.np), end = t0 + ms, left = () => end - Date.now();
  const winAns = (w, exactOk) => {
    if (exactOk && left() > ms * 0.3) { S.limit(0, left() - 20); const r = S.best(p, rand, w.move); if (r) return { move: r.move, value: r.value, exact: true }; }
    return { move: w.move, value: w.value, exact: false, outcome: 1 };
  };
  const all = v2Moves(S, p, -1, rand);
  const q = S.sliced(p, t, all, Math.min(200, ms * 0.05));   // late positions and a warm table finish at once
  if (q.win) return winAns(q.win, true);
  if (q.draw && !q.open.length) return { move: q.draw.move, value: q.draw.value, exact: false, outcome: 0 };
  const open = q.open, n = pool.size + 1, edges = p.edges(), span = Math.max(50, left() - (sure ? 40 : ms * cfg.w5.re) - 40);
  const jobs = [];
  for (let i = 0; i < pool.size; i++) jobs.push(pool.run(i, { type: 'xpart', kind: 'sliced', R: G.R, C: G.C, edges, moves: open.filter((m, j) => j % n === i + 1), ms: span, t, x5: true }));
  const h = H.best(p, cfg.depth, Math.max(60, ms * (sure ? cfg.w5.hs : cfg.w5.hn)), rand);
  const mine = [h.move].concat(open.filter((m, j) => j % n === 0 && m !== h.move));
  const o = S.sliced(p, t, mine, Math.max(30, end - (sure ? 40 : ms * cfg.w5.re) - Date.now()));
  if (o.win) { Promise.all(jobs); return winAns(o.win, false); }
  const res = await Promise.all(jobs);
  const lost = new Set(q.lost); for (const m of o.lost) lost.add(m);
  let draw = q.draw || o.draw, helpersOk = true;
  for (const r of res) {
    if (!r) { helpersOk = false; continue; }
    if (r.win) return winAns(r.win, false);
    if (r.draw && !draw) draw = r.draw;
    for (const m of r.lost) lost.add(m);
  }
  if (draw) return { move: draw.move, value: draw.value, exact: false, outcome: 0 };
  if (helpersOk && all.every(m => lost.has(m))) {   // every move loses: the best margin
    S.limit(0, left() - 20); const r = S.best(p, rand, h.move);
    if (r) return { move: r.move, value: r.value, exact: true };
    return { move: h.move, value: h.value, exact: false };
  }
  if (!lost.has(h.move)) return { move: h.move, value: h.value, exact: false, depth: H.depth };
  const rest = all.filter(m => !lost.has(m));
  if (rest.length === 1 || left() < 60) return { move: rest[0], value: h.value, exact: false };
  const h2 = H.best(p, cfg.depth, left() - 20, rand, lost);
  return { move: lost.has(h2.move) ? rest[0] : h2.move, value: h2.value, exact: false, depth: H.depth };
}
// work for a helper worker: an outcome (or exact) root search over the given moves, in that order
function helperTask(d) {
  const G = geom(d.R, d.C), p = Pos.from(G, d.edges);
  if (d.bits) v2Bits = d.bits;
  if (d.x5 === false && x5Ok(G)) return { done: false, best: null, firstV: null };   // the main worker has no wasm: stay out
  const S = v2SolverFor(G); S.limit(0, d.ms);
  if (d.kind === 'sliced') {
    if (!S.sliced) return null;
    const o = S.sliced(p, d.t, d.moves, d.ms);
    return { win: o.win, draw: o.draw, lost: Array.from(o.lost) };
  }
  const r = d.t === null || d.t === undefined ? S.bestOf(p, d.moves) : S.outcome(p, d.t, d.moves);
  return { done: !!r, best: r || S.partial, firstV: S.firstV };
}
// Lv9+ with helper workers. pool: { size, run(i, msg) -> Promise<result|null> }. Falls back to chooseMove without one.
async function chooseMoveAsync(p, level, rand, pool, lead, hist) {
  rand = rand || Math.random;
  const cfg = LEVELS[level] || LEVELS[8];
  if (cfg.kind === 'v2' && p.G.R === 4 && p.G.C === 4) { const rd = x4Ready(); if (rd && rd.then) await rd; if (X4.st === 2) return chooseMove(p, level, rand, lead, hist); }
  if (cfg.kind !== 'v2' || !pool || !pool.size) return chooseMove(p, level, rand, lead, hist);
  const legal = p.legal();
  if (legal.length === 1) return { move: legal[0], exact: false };
  const cap = p.hasCapture() ? captureMoves(p) : null;
  if (cap && cap.forced !== undefined) return { move: cap.forced, forced: true };
  const G = p.G, t0 = Date.now(), end = t0 + cfg.ms, safe = countSafe(p), edges = p.edges(), t = v2Target(p, lead);
  if (x5Ok(G) && t !== null && safe > 12 && safe <= v2PGate(cfg, G)) return chooseW5Async(p, cfg, rand, t, safe <= v2Sure(cfg, G), t0, pool);
  if (safe <= 12 || t === null || safe > v2PGate(cfg, G)) return chooseV2(p, cfg, rand, lead, hist);
  const S = v2SolverFor(G), H = v2HsFor(G, cfg.np);
  // a short try first: late positions (and a warm table) finish at once
  S.limit(0, Math.min(250, cfg.ms * 0.06));
  let o = S.outcome(p, t, v2Moves(S, p, -1, rand)), ans = v2FromOutcome(o, t);
  if (ans) return ans;
  const h = H.best(p, cfg.depth, Math.max(80, cfg.ms * cfg.quick), rand);
  const moves = v2Moves(S, p, h.move, rand);
  // Every helper runs the whole outcome search (the extra ones with other move orders: whichever finishes first counts)
  // while this worker keeps deepening the heuristic search, the answer whenever no run finishes. When the run will
  // very likely finish, this worker races as well.
  const order = i => i ? v2Moves(S, p, h.move, rand) : moves;
  const left = end - Date.now() - 40;
  const jobs = []; for (let i = 0; i < pool.size; i++) jobs.push(pool.run(i, { type: 'xpart', R: G.R, C: G.C, edges, moves: order(i), ms: left, t, x5: x5Ok(G) }));
  let res, hm = h;
  if (safe <= v2Sure(cfg, G)) {
    S.limit(0, left);
    o = S.outcome(p, t, order(pool.size));
    if (o && o.cls >= 0) return v2FromOutcome(o, t);
    res = [{ done: !!o, best: o || S.partial, firstV: S.firstV }].concat(await Promise.all(jobs));
  } else {
    hm = H.best(p, cfg.depth, Math.max(60, left - 20), rand);
    res = await Promise.all(jobs);
  }
  let best = null, allLose = false;
  for (const x of res) {
    if (!x || !x.best) continue;
    if (x.done && x.best.cls >= 0) return v2FromOutcome(x.best, t);
    if (x.done) allLose = true;
    if (x.best.cls >= 0 && (!best || x.best.value > best.value)) best = x.best;
  }
  if (best) return { move: best.move, value: best.value, exact: false };   // a proven draw (wins would have finished)
  if (allLose && Date.now() < end - 150) {   // every move loses: the best margin with what time is left
    S.limit(0, end - Date.now() - 20); const r = S.best(p, rand, hm.move);
    if (r) return { move: r.move, value: r.value, exact: true };
  }
  return { move: hm.move, value: hm.value, exact: false };
}

// ---------------------------------------------------------------- 5x5: exact solver (WebAssembly, Lv9+)
// solver5.c compiled to dots5.wasm: the same solver as dots4.wasm with 64-bit table keys (5x5 has 60 edges). It reaches
// positions several times earlier than the JavaScript solver, so Lv9+ switches to exact play much sooner. W5 has the
// interface of Solver that the Lv9+ code uses (limit / best / bestOf / outcome / rootMoves / moveValue / partial).
const X5V = '?v=20261019';
const X5 = { st: 0, x: null, io: null, w: null, loading: null, bits: 22 };
class W5 {
  constructor() { this.G = geom(5, 5); this.deadline = Infinity; this.aborted = false; this.nodes = 0; this.partial = null; this.firstV = null; }
  limit(maxNodes, ms) { this.aborted = false; this.nodes = 0; this.deadline = ms ? Date.now() + ms : Infinity; }
  set(p) { let lo = 0, hi = 0; const d = p.drawn; for (let e = 0; e < 32; e++) if (d[e]) lo |= 1 << e; for (let e = 32; e < 60; e++) if (d[e]) hi |= 1 << (e - 32); X5.io[0] = lo; X5.io[1] = hi; }
  left() { const l = this.deadline === Infinity ? 0 : this.deadline - Date.now(); if (this.deadline !== Infinity && l <= 0) this.aborted = true; return l; }
  moveValue(p, e, alpha, beta) {
    const rem = p.G.B - p.filled; if (alpha === undefined) { alpha = -rem - 1; beta = rem + 1; }
    const ms = this.left(); if (this.aborted) return null;
    this.set(p); const v = X5.x.w_move_value(e, alpha, beta, ms);
    this.nodes += X5.x.w_nodes();
    if (v === -999) { this.aborted = true; return null; }
    return v;
  }
  rootMoves(p) { this.set(p); const n = X5.x.w_root_moves(), out = []; for (let i = 0; i < n; i++) out.push(X5.io[8 + i]); return out.sort((a, b) => p.gives(a) - p.gives(b)); }
  best(p, rand, first) {
    this.partial = null; if (p.undrawn === 0) return null;
    const ms = this.left(); if (this.aborted) return null;
    this.set(p); X5.io[2] = first !== undefined && first >= 0 ? first : -1;
    const v = X5.x.w_best(ms); this.nodes += X5.x.w_nodes();
    if (v === -999) { this.aborted = true; if (X5.io[4] >= 0) this.partial = { move: X5.io[4], value: X5.io[5] }; return null; }
    return { move: X5.io[3], value: v };
  }
  value(p) { const ms = this.left(); if (this.aborted) return null; this.set(p); const rem = p.G.B - p.filled, v = X5.x.w_value(-rem - 1, rem + 1, ms); return v === -999 ? null : v; }
}
// outcome of every move against the target t in growing time slices (the table keeps the work between slices), so that
// within the time it proves as many moves as it can rather than spending everything on the first one. Stops at a win.
// Returns { win: {move, value} | null, draw: {move, value} | null, lost: Set of moves proven to lose, open: moves unknown }
W5.prototype.sliced = function (p, t, moves, ms) {
  const end = Date.now() + ms, st = new Int8Array(moves.length), lost = new Set(); let draw = null, b = 25;
  this.set(p); const lo = X5.io[0], hi = X5.io[1];
  for (;;) {
    let open = 0;
    for (let i = 0; i < moves.length; i++) {
      if (st[i]) continue;
      const left = end - Date.now(); if (left <= 3) return { win: null, draw, lost, open: moves.filter((m, j) => !st[j]) };
      X5.io[0] = lo; X5.io[1] = hi;
      const v = X5.x.w_move_value(moves[i], t - 1, t + 1, Math.min(b, left)); this.nodes += X5.x.w_nodes();
      if (v === -999) { open++; continue; }
      if (v > t) return { win: { move: moves[i], value: v }, draw, lost, open: [] };
      if (v === t) { st[i] = 2; if (!draw) draw = { move: moves[i], value: v }; } else { st[i] = 1; lost.add(moves[i]); }
    }
    if (!open) return { win: null, draw, lost, open: [] };
    b *= 3;
  }
};
W5.prototype.bestOf = Solver.prototype.bestOf;
W5.prototype.outcome = Solver.prototype.outcome;
W5.prototype.all = Solver.prototype.all;
function x5Init(wasm) {
  const now = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();
  const x = new WebAssembly.Instance(new WebAssembly.Module(wasm), { env: { now } }).exports;
  x.w_setup(5, 5, X5.bits);
  X5.x = x; X5.io = new Int32Array(x.memory.buffer, x.io_ptr(), 256); X5.w = new W5(); X5.st = 2;
}
// Node: load synchronously; worker: fetch once (x5Ready() resolves when done). Never on the page itself.
function x5Ready(bits) {
  if (X5.st === 2) return true;
  if (X5.st < 0) return false;
  if (bits) X5.bits = bits;
  if (typeof process !== 'undefined' && process.versions && process.versions.node && typeof require === 'function') {
    try { x5Init(require('fs').readFileSync(__dirname + '/dots5.wasm')); } catch (e) { X5.st = -1; return false; }
    return true;
  }
  if (typeof importScripts !== 'function' || typeof WebAssembly === 'undefined' || typeof fetch !== 'function') { X5.st = -1; return false; }
  if (!X5.loading) {
    X5.st = 1;
    X5.loading = fetch(new URL('dots5.wasm' + X5V, self.location.href)).then(r => { if (!r.ok) throw new Error('dots5.wasm ' + r.status); return r.arrayBuffer(); })
      .then(w => { x5Init(w); return true; }).catch(() => { X5.st = -1; return false; });
  }
  return X5.loading;
}
let x5On = true;   // tests: false = the JavaScript solver (the previous Lv9+)
const x5Ok = G => x5On && G.R === 5 && G.C === 5 && X5.st === 2;
function setX5(on) { x5On = !!on; }

// ---------------------------------------------------------------- 4x4: exact solver (WebAssembly) + opening book (Lv9+)
// solver4.c compiled to dots4.wasm: alpha-beta on net boxes with Berlekamp's capture rules, exact simple-loony values,
// chain/loop/corner move pruning and a symmetry-reduced table. dots4book.bin: every position the AI can face (either side)
// in the opening, with an exactly optimal move and the exact value (computed offline; 4x4 is a draw).
// Between moves the AI keeps a guarantee: the final margin its last move was proven to secure. The next search starts from
// it, so a search that runs out of time still plays a move that keeps that margin (never losing a won or drawn game).
const X4V = '?v=20261019';
const X4 = { st: 0, x: null, io: null, slots: [], loading: null, nbook: 0 };
let bookOn = true;
function x4Init(wasm, book) {
  const now = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();
  const inst = new WebAssembly.Instance(new WebAssembly.Module(wasm), { env: { now } });
  const x = inst.exports; x.w_setup(4, 4, 22);
  X4.x = x; X4.io = new Int32Array(x.memory.buffer, x.io_ptr(), 256);
  if (book) X4.nbook = x4LoadBook(x, new Uint8Array(book));
  X4.st = 2;
}
// book file: "DB4" 1, u32 count, then per entry (sorted by key): varint key delta, byte move | flag << 6, byte value + 32
function x4LoadBook(x, b) {
  if (b[0] !== 68 || b[1] !== 66 || b[2] !== 52) return 0;
  const n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
  const ptr = x.book_alloc(n), out = new BigUint64Array(x.memory.buffer, ptr, n);
  let i = 8, key = 0n;
  for (let j = 0; j < n; j++) {
    let d = 0n, sh = 0n, c;
    do { c = b[i++]; d |= BigInt(c & 127) << sh; sh += 7n; } while (c & 128);
    key += d;
    const mf = b[i++], val = b[i++];
    out[j] = (key << 20n) | (BigInt(mf >> 6) << 18n) | (BigInt(val) << 12n) | BigInt(mf & 63);
  }
  return n;
}
// Node: load synchronously; worker: fetch once (x4Ready() resolves when done). Never on the page itself.
function x4Ready() {
  if (X4.st === 2) return true;
  if (X4.st < 0) return false;
  if (typeof process !== 'undefined' && process.versions && process.versions.node && typeof require === 'function') {
    try { const fs = require('fs'); x4Init(fs.readFileSync(__dirname + '/dots4.wasm'), fs.readFileSync(__dirname + '/dots4book.bin')); } catch (e) { X4.st = -1; return false; }
    return true;
  }
  if (typeof importScripts !== 'function' || typeof WebAssembly === 'undefined' || typeof fetch !== 'function') { X4.st = -1; return false; }
  if (!X4.loading) {
    X4.st = 1;
    const get = f => fetch(new URL(f + X4V, self.location.href)).then(r => { if (!r.ok) throw new Error(f + ' ' + r.status); return r.arrayBuffer(); });
    X4.loading = Promise.all([get('dots4.wasm'), get('dots4book.bin').catch(() => null)])
      .then(([w, b]) => { x4Init(w, b); return true; }).catch(() => { X4.st = -1; return false; });
  }
  return X4.loading;
}
const x4Ok = p => p.G.R === 4 && p.G.C === 4 && X4.st === 2;
function x4Set(p) {   // drawn edges -> io[0..1]
  let lo = 0, hi = 0; const d = p.drawn;
  for (let e = 0; e < 32; e++) if (d[e]) lo |= 1 << e;
  for (let e = 32; e < 40; e++) if (d[e]) hi |= 1 << (e - 32);
  X4.io[0] = lo; X4.io[1] = hi;
}
// book entry of p: {move, value, exact} or null
function x4Book(p) {
  if (!bookOn || !x4Ok(p)) return null;
  x4Set(p); const r = X4.x.w_book_probe();
  if (r < 0) return null;
  return { move: r & 255, value: ((r >> 16) & 63) - 32, flag: (r >> 8) & 3 };
}
// replay the history: lead of each move's mover, and who moved
function x4Replay(G, hist) {
  const q = new Pos(G), info = []; let turn = 0; const sc = [0, 0];
  for (const e of hist) { info.push({ mover: turn, lead: sc[turn] - sc[1 - turn] }); const k = q.play(e); sc[turn] += k; if (!k) turn ^= 1; }
  return { info, turn, sc };
}
// lower bound for the mover's net future boxes, from the guarantee of its previous decision (worker memory or the book)
function x4Lower(p, lead, hist) {
  if (!hist || lead === undefined || lead === null) return null;
  let best = null;
  for (const sl of X4.slots) {   // memory: {n, edges, k, G}
    if (hist.length < sl.n) continue;
    let ok = true; for (let i = 0; i < sl.n; i++) if (hist[i] !== sl.edges[i]) { ok = false; break; }
    if (!ok) continue;
    const extra = hist.slice(sl.n);
    if (sl.k > 0) { if (extra.length) continue; }
    else {
      if (!extra.length) continue;
      const q = Pos.from(p.G, hist.slice(0, sl.n));
      for (let i = 0; i < extra.length && ok; i++) { const k = q.play(extra[i]); if ((i < extra.length - 1) !== (k > 0)) ok = false; }
      if (!ok) continue;
    }
    const L = sl.G - lead; if (best === null || L > best) best = L;
  }
  // the book: the mover's last decision before the opponent's turn
  const R = x4Replay(p.G, hist);
  for (let i = hist.length - 1; i >= 0; i--) {
    if (R.info[i].mover !== R.turn) continue;
    const q = Pos.from(p.G, hist.slice(0, i)), bk = x4Book(q);
    if (bk && bk.flag === 1) {
      x4Set(q); X4.x.w_canon(hist[i]); const a0 = X4.io[6], a1 = X4.io[7];
      X4.x.w_canon(bk.move);
      if (a0 === X4.io[6] && a1 === X4.io[7]) { const L = R.info[i].lead + bk.value - lead; if (best === null || L > best) best = L; }
    }
    break;
  }
  return best;
}
function x4Remember(p, hist, lead, move, v) {
  if (!hist || lead === undefined || lead === null) return;
  X4.slots.unshift({ n: hist.length + 1, edges: hist.concat([move]), k: p.completes(move), G: lead + v });
  if (X4.slots.length > 2) X4.slots.length = 2;
}
// Lv9+ on 4x4. Returns a move answer, or null when nothing was proven in time (the caller falls back).
function x4Choose(p, cfg, lead, hist, ms) {
  const x = X4.x, io = X4.io, t0 = Date.now();
  const bk = x4Book(p);
  if (bk && bk.flag === 1) { x4Remember(p, hist, lead, bk.move, bk.value); return { move: bk.move, value: bk.value, exact: true, book: true }; }
  let L = x4Lower(p, lead, hist), first = -1;
  if (bk && bk.flag === 2) { first = bk.move; if (L === null || bk.value > L) L = bk.value; }
  x4Set(p); io[6] = L === null ? -100 : L; io[2] = first;
  const v = x.w_best_from(Math.max(50, ms - (Date.now() - t0)));
  if (v !== -999 && io[3] >= 0) {
    if (L !== null && v < L) { io[6] = -100; io[2] = -1; const w = x.w_best_from(Math.max(50, ms - (Date.now() - t0))); if (w === -999) return null; x4Remember(p, hist, lead, io[3], w); return { move: io[3], value: w, exact: true }; }
    x4Remember(p, hist, lead, io[3], v); return { move: io[3], value: v, exact: true };
  }
  if (io[4] >= 0) { x4Remember(p, hist, lead, io[4], io[5]); return { move: io[4], value: io[5], exact: false }; }   // proven >= the guarantee
  return null;
}
// exact values of the given moves within a time budget (null if cut off)
function x4Values(p, moves, ms) {
  const x = X4.x, t0 = Date.now(), out = [];
  for (const m of moves) {
    x4Set(p); const v = x.w_move_value(m, -17, 17, Math.max(20, ms - (Date.now() - t0)));
    if (v === -999) return null;
    out.push({ m, v });
  }
  return out;
}
function bookMove(p) { const b = x4Book(p); return b && b.flag === 1 ? { move: b.move, value: b.value, exact: true, book: true } : null; }
function canonKey(p) { if (!x4Ok(p)) return null; x4Set(p); X4.x.w_canon(-1); return (X4.io[7] >>> 0).toString(16) + ':' + (X4.io[6] >>> 0).toString(16); }
function setBook(on) { bookOn = !!on; }

// exact values of all moves within a time budget, otherwise heuristic scores
// 4x4 with the WebAssembly solver: exact best move / move values within a time budget (null if cut off)
function x4BestW(p, ms) { x4Set(p); X4.io[2] = -1; const v = X4.x.w_best(Math.max(20, ms)); return v === -999 ? null : { move: X4.io[3], value: v }; }
function x4MoveW(p, e, ms) { x4Set(p); const v = X4.x.w_move_value(e, -17, 17, Math.max(20, ms)); return v === -999 ? null : v; }
function x4All(p, ms) {
  const t0 = Date.now(), b = x4BestW(p, ms); if (!b) return null;
  const out = [];
  for (const e of p.legal()) {
    const v = e === b.move ? b.value : x4MoveW(p, e, ms - (Date.now() - t0));
    if (v === null) return null;
    out.push({ m: e, v });
  }
  return out;
}
function analyze(p, ms) {
  if (x4Ok(p)) { const ex = x4All(p, ms * 0.7); if (ex) return { exact: true, list: ex.sort((a, b) => b.v - a.v) }; }
  const S = fastSolverFor(p.G);
  if (p.G.E <= 24 || countSafe(p) <= (p.G.R <= 4 ? 20 : 15)) {
    S.limit(0, ms * 0.7);
    const ex = S.all(p);
    if (ex) return { exact: true, list: ex.sort((a, b) => b.v - a.v) };
  }
  const H = hsFor(p.G, 3, true);
  const list = H.root(p, 12, ms * 0.3 + 150);
  const bk = x4Book(p);   // 4x4 opening: the book's exactly optimal move goes first
  if (bk && bk.flag === 1) { const i = list.findIndex(x => x.m === bk.move); const it = i >= 0 ? list.splice(i, 1)[0] : { m: bk.move }; it.v = bk.value; it.book = true; list.unshift(it); }
  return { exact: false, list };
}

// post-game review of one move: value of the best move and of the move played (net boxes for the mover),
// plus a short best line. Exact when the solver finishes in time, otherwise a heuristic estimate.
function reviewMove(p, played, ms) {
  const G = p.G;
  if (p.undrawn <= 1) return { skip: true };
  const cap = p.hasCapture() ? captureMoves(p) : null;
  if (cap && cap.forced !== undefined) return { skip: true };
  const t0 = Date.now(), end = t0 + ms;
  if (x4Ok(p)) {
    const b = x4BestW(p, ms * 0.7);
    const pv = b ? (played === b.move ? b.value : x4MoveW(p, played, end - Date.now() - 20)) : null;
    if (b && pv !== null) {
      const q = p.clone(), line = [b.move]; q.play(b.move);
      while (line.length < 12 && q.undrawn > 0) {
        const c = q.hasCapture() ? captureMoves(q) : null;
        let e;
        if (c && c.forced !== undefined) e = c.forced;
        else { const r = x4BestW(q, 120); if (!r) break; e = r.move; }
        q.play(e); line.push(e);
      }
      return { exact: true, best: b.value, played: Math.min(pv, b.value), bestMove: b.move, line };
    }
  }
  if (G.E <= 24 || countSafe(p) <= (G.R <= 4 ? 24 : 17)) {
    const S = fastSolverFor(G);
    S.limit(0, ms * 0.8);
    const b = S.best(p);
    let pv = null;
    if (b) { S.limit(0, Math.max(60, end - Date.now())); pv = played === b.move ? b.value : S.moveValue(p, played); }
    if (b && pv !== null) {
      const q = p.clone(), line = [b.move]; q.play(b.move);
      while (line.length < 12 && q.undrawn > 0) {
        const c = q.hasCapture() ? captureMoves(q) : null;
        let e;
        if (c && c.forced !== undefined) e = c.forced;
        else { S.limit(0, 120); const r = S.best(q); if (!r) break; e = r.move; }
        q.play(e); line.push(e);
      }
      return { exact: true, best: b.value, played: Math.min(pv, b.value), bestMove: b.move, line };
    }
  }
  const H = hsFor(G, 3, true);
  const list = H.root(p, 12, Math.max(150, end - Date.now()), [played]);
  if (!list.length) return { skip: true };
  const mine = list.find(x => x.m === played);
  const q = p.clone(); q.play(list[0].m);
  const line = [list[0].m].concat(H.pv(q, 9));
  // both moves safe: the estimate cannot tell them apart reliably (it is a parity guess), so the UI does not grade it
  const quiet = !cap && p.gives(played) === 0 && p.gives(list[0].m) === 0;
  return { exact: false, quiet, best: list[0].v, played: mine ? Math.min(mine.v, list[0].v) : list[0].v, bestMove: list[0].m, line };
}
return { x5Ready, setX5, X5, ponderStart, ponderStep, ponderStop, chooseMoveAsync, helperTask, chooseV2, bookMove, canonKey, setBook, x4Ready, x4Choose, x4Values, x4Book, x4All, X4, geom, Pos, Solver, HSearch, captureMoves, simpleLoony, loonyValue, components, evalH, chooseMove, analyze, reviewMove, solverFor, fastSolverFor, markRedundant, sacrificeSize, captureEdge, LEVELS, xorshift };
})();

// ---------------------------------------------------------------- worker glue
if (typeof self !== 'undefined' && typeof importScripts === 'function' && typeof window === 'undefined') {
  // helper workers for Lv9+ (nested workers, created on first use). None on single/dual-core or low-memory devices,
  // or where a worker cannot start workers: then the search simply runs in this worker.
  let pool = null;
  const getPool = () => {
    if (pool) return pool;
    pool = { size: 0, ws: [], seq: 0 };
    try {
      const nav = self.navigator || {}, hc = nav.hardwareConcurrency || 1, dm = nav.deviceMemory;
      let k = Math.min(3, hc - 1);
      if (dm && dm <= 2) k = 0; else if (dm && dm < 4) k = Math.min(k, 1);
      if (typeof Worker === 'function') for (let i = 0; i < k; i++) {
        const w = new Worker('engine.js'), cb = new Map();
        w.onmessage = ev => { const f = cb.get(ev.data.id); if (f) { cb.delete(ev.data.id); f(ev.data.type === 'error' ? null : ev.data.r); } };
        w.onerror = ev => { ev.preventDefault && ev.preventDefault(); cb.forEach(f => f(null)); cb.clear(); };
        pool.ws.push({ w, cb });
      }
    } catch (e) { pool.ws = []; }
    pool.size = pool.ws.length;
    pool.run = (i, msg) => new Promise(resolve => {
      const h = pool.ws[i], id = ++pool.seq;
      const timer = setTimeout(() => { if (h.cb.delete(id)) resolve(null); }, (msg.ms || 0) + 2000);
      h.cb.set(id, r => { clearTimeout(timer); resolve(r); });
      h.w.postMessage(Object.assign({ id, bits: 21 }, msg));
    });
    return pool;
  };
  // pondering between moves (5x5 Lv9+ with the wasm solver): short steps, so that a new request is served at once
  let pondering = 0;
  const ponderLoop = tok => { if (tok !== pondering) return; if (DotsEngine.ponderStep(40)) setTimeout(() => ponderLoop(tok), 0); };
  self.onmessage = async ev => {
    const d = ev.data;
    pondering++; DotsEngine.ponderStop();
    try {
      if (d.type === 'xpart') {
        if (d.R === 5 && d.C === 5 && d.x5) { const rd = DotsEngine.x5Ready(d.bits); if (rd && rd.then) await rd; }
        self.postMessage({ type: d.type, id: d.id, r: DotsEngine.helperTask(d) }); return;
      }
      const G = DotsEngine.geom(d.R, d.C);
      const p = DotsEngine.Pos.from(G, d.edges);
      if (d.R === 4 && d.C === 4 && (d.type !== 'move' || d.level >= 9)) { const rd = DotsEngine.x4Ready(); if (rd && rd.then) await rd; }
      if (d.R === 5 && d.C === 5 && d.type === 'move' && d.level >= 9) { const rd = DotsEngine.x5Ready(); if (rd && rd.then) await rd; }
      if (d.type === 'move') {
        const t0 = Date.now();
        const r = (DotsEngine.LEVELS[d.level] || {}).kind === 'v2' ? await DotsEngine.chooseMoveAsync(p, d.level, null, getPool(), d.lead, d.edges) : DotsEngine.chooseMove(p, d.level);
        self.postMessage({ type: 'move', id: d.id, move: r.move, value: r.value, exact: !!r.exact, ms: Date.now() - t0 });
        if (d.level >= 9 && d.R === 5 && d.C === 5 && d.ponder !== false) {
          const k = p.play(r.move);
          if (!k && DotsEngine.ponderStart(p, -(d.lead || 0), d.level)) { const tok = ++pondering; setTimeout(() => ponderLoop(tok), 0); }
        }
      } else if (d.type === 'analyze') {
        const r = DotsEngine.analyze(p, d.ms || 1500);
        self.postMessage({ type: 'analyze', id: d.id, list: r.list, exact: r.exact });
      } else if (d.type === 'solve') {
        let list = null;
        if (d.R === 4 && d.C === 4 && DotsEngine.X4.st === 2) list = DotsEngine.x4All(p, d.ms || 8000);
        else { const S = DotsEngine.fastSolverFor(G); S.limit(0, d.ms || 8000); list = S.all(p); }
        self.postMessage({ type: 'solve', id: d.id, list });
      } else if (d.type === 'review') {
        const r = DotsEngine.reviewMove(p, d.played, d.ms || 600);
        self.postMessage({ type: 'review', id: d.id, r });
      }
    } catch (err) {
      self.postMessage({ type: 'error', id: d.id, msg: String(err && err.stack || err) });
    }
  };
}
if (typeof module !== 'undefined' && module.exports) module.exports = DotsEngine;

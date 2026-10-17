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
  const rnd = xorshift(0x9e3779b9 ^ (R * 131 + C * 7));
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
  best(p, maxDepth, ms, rand) {
    this.deadline = Date.now() + ms; this.aborted = false; this.nodes = 0;
    let moves = this.rootMoves(p, rand);
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
};

const solvers = {}, smallSolvers = {};
function solverFor(G) { const k = G.R + 'x' + G.C; return solvers[k] || (solvers[k] = new Solver(G)); }
const hsCache = {};
function hsFor(G, np, fast) { const k = G.R + 'x' + G.C + ':' + np + (fast ? 'f' : ''); if (!hsCache[k]) { hsCache[k] = new HSearch(G); hsCache[k].np = np; hsCache[k].prune = !!fast; } return hsCache[k]; }
const fastSolvers = {};
function fastSolverFor(G) { const k = G.R + 'x' + G.C; if (!fastSolvers[k]) { const s = new Solver(G, 22); s.prune = true; fastSolvers[k] = s; } return fastSolvers[k]; }
function smallSolverFor(G) { const k = G.R + 'x' + G.C; const s = smallSolvers[k] || (smallSolvers[k] = new Solver(G, 17)); s.used.fill(0); return s; }

function chooseMove(p, level, rand) {
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

// exact values of all moves within a time budget, otherwise heuristic scores
function analyze(p, ms) {
  const S = fastSolverFor(p.G);
  if (p.G.E <= 24 || countSafe(p) <= (p.G.R <= 4 ? 20 : 15)) {
    S.limit(0, ms * 0.7);
    const ex = S.all(p);
    if (ex) return { exact: true, list: ex.sort((a, b) => b.v - a.v) };
  }
  const H = hsFor(p.G, 3, true);
  const list = H.root(p, 12, ms * 0.3 + 150);
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
return { geom, Pos, Solver, HSearch, captureMoves, simpleLoony, loonyValue, components, evalH, chooseMove, analyze, reviewMove, solverFor, fastSolverFor, markRedundant, sacrificeSize, captureEdge, LEVELS, xorshift };
})();

// ---------------------------------------------------------------- worker glue
if (typeof self !== 'undefined' && typeof importScripts === 'function' && typeof window === 'undefined') {
  self.onmessage = ev => {
    const d = ev.data;
    try {
      const G = DotsEngine.geom(d.R, d.C);
      const p = DotsEngine.Pos.from(G, d.edges);
      if (d.type === 'move') {
        const t0 = Date.now();
        const r = DotsEngine.chooseMove(p, d.level);
        self.postMessage({ type: 'move', id: d.id, move: r.move, value: r.value, exact: !!r.exact, ms: Date.now() - t0 });
      } else if (d.type === 'analyze') {
        const r = DotsEngine.analyze(p, d.ms || 1500);
        self.postMessage({ type: 'analyze', id: d.id, list: r.list, exact: r.exact });
      } else if (d.type === 'solve') {
        const S = DotsEngine.fastSolverFor(G); S.limit(0, d.ms || 8000);
        const list = S.all(p);
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

'use strict';
// Shogi variants (5五将棋 / はさみ将棋): a small alpha-beta search shared by both games (runs in variants/worker.js).
// The position supplies: gen(buf, qs) pseudo-legal moves (qs: captures / promotions only), doMove / undoMove,
// illegal() (after doMove: the move just made was illegal), result(ply) (after doMove: terminal score for the side
// to move, or null), evaluate() (side to move), order(m) (capture value for move ordering), inCheck(), repScore(),
// toUsi / fromUsi, hl / hh hashes and the hash history histL / histH / hn.
(function (G) {
const MATE = 30000, INF = 32000, MAXPLY = 48;

class VSearch {
  constructor(pos, o = {}) {
    this.p = pos; this.time = o.time || 1000; this.maxDepth = o.depth || 32; this.nodeCap = o.nodes || 0;
    this.nodes = 0; this.t0 = Date.now(); this.stop = false;
    this.tt = new Map(); this.killers = new Int32Array(MAXPLY * 2); this.hist = new Int32Array(1 << 15);
    this.bufs = []; this.sc = []; for (let i = 0; i < MAXPLY + 8; i++) { this.bufs.push(new Int32Array(700)); this.sc.push(new Int32Array(700)); }
    this.rootHn = pos.hn;
  }
  key() { return (this.p.hl >>> 0) * 2097152 + (this.p.hh >>> 11); }
  timeUp() {
    if ((this.nodes & 1023) === 0 && (Date.now() - this.t0 > this.time || (this.nodeCap && this.nodes > this.nodeCap))) this.stop = true;
    return this.stop;
  }
  repeated() {   // the position occurred before (same side to move): the game's rule for repetitions decides
    const p = this.p, hl = p.hl, hh = p.hh, lim = Math.max(0, p.hn - 100);
    for (let i = p.hn - 3; i >= lim; i -= 2) if (p.histL[i] === hl && p.histH[i] === hh) return true;
    return false;
  }
  order(moves, sc, n, ttm, ply) {
    const p = this.p, k0 = this.killers[ply * 2], k1 = this.killers[ply * 2 + 1];
    for (let i = 0; i < n; i++) {
      const m = moves[i];
      sc[i] = m === ttm ? 1e9 : p.order(m) * 1000 + (m === k0 ? 900 : m === k1 ? 800 : 0) + Math.min(700, this.hist[m & 32767]);
    }
  }
  pick(moves, sc, n, i) {
    let b = i; for (let j = i + 1; j < n; j++) if (sc[j] > sc[b]) b = j;
    if (b !== i) { const m = moves[i]; moves[i] = moves[b]; moves[b] = m; const s = sc[i]; sc[i] = sc[b]; sc[b] = s; }
    return moves[i];
  }
  qsearch(alpha, beta, ply, qd) {
    this.nodes++;
    if (this.timeUp()) return 0;
    const p = this.p, chk = p.inCheck();
    if (!chk) {
      const st = p.evaluate();
      if (st >= beta || qd >= 6 || ply >= MAXPLY) return st;
      if (st > alpha) alpha = st;
    } else if (ply >= MAXPLY) return p.evaluate();
    const moves = this.bufs[ply], sc = this.sc[ply], n = p.gen(moves, !chk);
    this.order(moves, sc, n, 0, ply);
    let legal = 0;
    for (let i = 0; i < n; i++) {
      const m = this.pick(moves, sc, n, i);
      p.doMove(m);
      if (p.illegal(m)) { p.undoMove(); continue; }
      legal++;
      const r = p.result(ply + 1);
      const s = r != null ? r : -this.qsearch(-beta, -alpha, ply + 1, qd + 1);
      p.undoMove();
      if (this.stop) return 0;
      if (s > alpha) { alpha = s; if (s >= beta) return s; }
    }
    if (chk && !legal) return -MATE + ply;
    return alpha;
  }
  search(depth, alpha, beta, ply) {
    const p = this.p;
    if (ply > 0 && this.repeated()) return p.repScore();
    if (depth <= 0 || ply >= MAXPLY - 2) return this.qsearch(alpha, beta, ply, 0);
    this.nodes++;
    if (this.timeUp()) return 0;
    const key = this.key(), e = this.tt.get(key);
    let ttm = 0;
    if (e) {
      ttm = e.m;
      if (e.d >= depth && ply > 0) {
        let s = e.s; if (s > MATE - 200) s -= ply; else if (s < -MATE + 200) s += ply;
        if (e.f === 0 || (e.f === 1 && s >= beta) || (e.f === 2 && s <= alpha)) return s;
      }
    }
    const chk = p.inCheck();
    if (chk && ply < 24) depth++;
    const moves = this.bufs[ply], sc = this.sc[ply], n = p.gen(moves, false);
    this.order(moves, sc, n, ttm, ply);
    const a0 = alpha;
    let best = -INF, bm = 0, legal = 0;
    for (let i = 0; i < n; i++) {
      const m = this.pick(moves, sc, n, i);
      p.doMove(m);
      if (p.illegal(m)) { p.undoMove(); continue; }
      legal++;
      const r = p.result(ply + 1);
      let s;
      if (r != null) s = r;
      else if (legal === 1) s = -this.search(depth - 1, -beta, -alpha, ply + 1);
      else {
        const quiet = sc[i] < 1000 && !chk;
        const red = quiet && depth >= 3 && legal > 4 ? 1 : 0;
        s = -this.search(depth - 1 - red, -alpha - 1, -alpha, ply + 1);
        if (s > alpha && (red || s < beta)) s = -this.search(depth - 1, -beta, -alpha, ply + 1);
      }
      p.undoMove();
      if (this.stop) return 0;
      if (s > best) { best = s; bm = m; }
      if (s > alpha) {
        alpha = s;
        if (s >= beta) {
          if (p.order(m) === 0) { if (this.killers[ply * 2] !== m) { this.killers[ply * 2 + 1] = this.killers[ply * 2]; this.killers[ply * 2] = m; } this.hist[m & 32767] += depth * depth; }
          break;
        }
      }
    }
    if (!legal) return -MATE + ply;   // no legal move: lost (checkmate in 5五将棋; no move in はさみ将棋)
    if (this.tt.size > 800000) this.tt.clear();
    let s = best; if (s > MATE - 200) s += ply; else if (s < -MATE + 200) s -= ply;
    this.tt.set(key, { d: depth, s, f: best >= beta ? 1 : best <= a0 ? 2 : 0, m: bm });
    return best;
  }
  rootMoves() {
    const p = this.p, buf = new Int32Array(700), n = p.gen(buf, false), out = [];
    for (let i = 0; i < n; i++) { const m = buf[i]; p.doMove(m); const ok = !p.illegal(m); const r = ok ? p.result(1) : null; p.undoMove(); if (ok) out.push({ m, s: 0, r }); }
    return out;
  }
  pv(m0, max = 8) {
    const p = this.p, out = [m0]; let k = 0;
    p.doMove(m0); k++;
    while (out.length < max) { const e = this.tt.get(this.key()); if (!e || !e.m) break; const ok = p.gen(this.bufs[0], false), list = this.bufs[0].subarray(0, ok); if (!list.includes(e.m)) break; p.doMove(e.m); if (p.illegal(e.m)) { p.undoMove(); break; } k++; out.push(e.m); }
    while (k--) p.undoMove();
    return out.map(m => this.p.toUsi(m));
  }
  // think: best move (opts.noise > 0: every root move is scored exactly and the choice is loosened by up to `noise` points)
  think(o = {}, onProgress) {
    const p = this.p, roots = this.rootMoves();
    if (!roots.length) return { move: null, score: -MATE, depth: 0, nodes: 0, pv: [] };
    const win = roots.find(r => r.r != null && r.r < -MATE + 200);   // a move that wins at once (はさみ将棋: the 5th piece)
    if (win) return { move: p.toUsi(win.m), score: MATE - 1, depth: 1, nodes: 1, pv: [p.toUsi(win.m)], time: 0 };
    const noise = o.noise || 0, multi = noise > 0 || o.top;
    let best = roots[0], depthDone = 0;
    for (let d = 1; d <= this.maxDepth; d++) {
      if (multi) {
        for (const r of roots) { p.doMove(r.m); const s = r.r != null ? -r.r : -this.search(d - 1, -INF, INF, 1); p.undoMove(); if (this.stop) break; r.s = s; r.d = d; }
        if (this.stop && d > 1) break;
        roots.sort((a, b) => b.s - a.s);
      } else {
        let alpha = -INF; const b0 = best;
        roots.sort((a, b) => (a === b0 ? -1 : b === b0 ? 1 : b.s - a.s));
        for (const r of roots) {
          p.doMove(r.m);
          let s;
          if (r.r != null) s = -r.r;
          else if (alpha === -INF) s = -this.search(d - 1, -INF, INF, 1);
          else { s = -this.search(d - 1, -alpha - 1, -alpha, 1); if (s > alpha && !this.stop) s = -this.search(d - 1, -INF, -alpha, 1); }
          p.undoMove();
          if (this.stop) break;
          r.s = s > alpha ? s : Math.min(r.s, alpha - 1);
          if (s > alpha) { alpha = s; best = r; }
        }
        if (this.stop && d > 1) break;
        roots.sort((a, b) => b.s - a.s);
      }
      best = roots[0]; depthDone = d;
      if (onProgress) onProgress({ depth: d, score: best.s, move: p.toUsi(best.m), list: o.top ? roots.slice(0, o.top).map(r => ({ move: p.toUsi(r.m), score: r.s })) : undefined });
      if (Math.abs(best.s) > MATE - 200 || this.stop) break;
      if (Date.now() - this.t0 > this.time * 0.45) break;   // the next depth would not finish in time
    }
    let pick = best;
    if (noise > 0) {
      let bs = -INF;
      for (const r of roots) { if (r.s < -MATE + 200 && roots[0].s > -MATE + 200) continue; const s = r.s + Math.random() * noise; if (s > bs) { bs = s; pick = r; } }
    }
    const out = { move: p.toUsi(pick.m), score: pick.s, depth: depthDone, nodes: this.nodes, time: Date.now() - this.t0, pv: this.pv(pick.m) };
    if (o.top) out.list = roots.slice(0, o.top).map(r => ({ move: p.toUsi(r.m), score: r.s, pv: o.pv ? this.pv(r.m) : undefined }));
    return out;
  }
}
G.VSearch = VSearch; G.VMATE = MATE;
})(typeof self !== 'undefined' ? self : this);

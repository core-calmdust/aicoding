'use strict';
// Worker for the shogi variants: {type: 'think' | 'analyze', variant: 'mini' | 'hasami', sfen, moves, opts, id}
// → progress messages {type: 'progress', id, depth, score, list?} and the result {type: 'result', id, move, score, depth, pv, nodes, time, list?}
// {type: 'mpvLoop', variant, sfen, moves, opts: {n, depth}, id}: the review box's continuous analysis — the best n moves
// with their lines after every depth ({type: 'progress', id, depth, nodes, list}) until opts.depth or a settled mate;
// the page terminates the worker to stop it sooner.
importScripts('search.js?v=20261028pv', 'mini.js?v=20261021vb', 'hasami.js?v=20261021vb');
self.onmessage = e => {
  const m = e.data; if (!m || (m.type !== 'think' && m.type !== 'analyze' && m.type !== 'mpvLoop')) return;
  if (m.type === 'mpvLoop') { mpvLoop(m); return; }
  try {
    const P = m.variant === 'hasami' ? new HasamiShogi() : new MiniShogi();
    P.setSfen(m.sfen);
    for (const u of m.moves || []) { P.doMove(P.fromUsi(u)); P.sp = 0; }
    const o = m.opts || {};
    const S = new VSearch(P, { time: o.time || 1000, depth: o.depth || 32, nodes: o.nodes || 0 });
    let last = 0;
    const r = S.think({ noise: o.noise || 0, top: m.type === 'analyze' ? o.top || 3 : 0, pv: !!o.pv }, pr => {
      const now = Date.now(); if (now - last < 120 && !pr.list) return; last = now;
      self.postMessage({ type: 'progress', id: m.id, depth: pr.depth, score: pr.score, list: pr.list });
    });
    self.postMessage({ type: 'result', id: m.id, ...r });
  } catch (err) {
    self.postMessage({ type: 'result', id: m.id, error: true, message: String(err && err.message || err) });
  }
};
function mpvLoop(m) {
  try {
    const P = m.variant === 'hasami' ? new HasamiShogi() : new MiniShogi();
    P.setSfen(m.sfen);
    for (const u of m.moves || []) { P.doMove(P.fromUsi(u)); P.sp = 0; }
    const o = m.opts || {}, S = new VSearch(P, { time: 1e12, depth: 64 }), roots = S.rootMoves();
    const n = Math.min(o.n || 4, roots.length), maxD = o.depth || 30;
    let list = [], last = 0, mateAt = 0;
    for (let d = 1; n && d <= maxD; d++) {
      let lastPost = Date.now();
      const partial = () => {   // slow depths: the lines finished so far at this depth, the rest from the previous depth
        if (d < 4 || Date.now() - lastPost < 700) return;
        lastPost = Date.now();
        const done = roots.filter(r => r.d === d && r.x).sort((a, b) => b.s - a.s).slice(0, n).map(r => ({ move: P.toUsi(r.m), score: r.s, pv: r.pv || [P.toUsi(r.m)] }));
        self.postMessage({ type: 'progress', id: m.id, depth: d, nodes: S.nodes, partial: true, list: done.concat(list.filter(e => !done.some(x => x.move === e.move))).slice(0, n) });
      };
      if (!S.mpvDepth(roots, d, n, partial)) break;
      list = roots.slice(0, n).map(r => ({ move: P.toUsi(r.m), score: r.s, pv: r.pv || [P.toUsi(r.m)] }));
      last = d;
      self.postMessage({ type: 'progress', id: m.id, depth: d, nodes: S.nodes, list });
      if (Math.abs(list[0].score) > VMATE - 200) { if (!mateAt) mateAt = d; if (d >= mateAt + 2) break; }
      if (roots.every(r => r.r != null) || (roots.length === 1 && d >= 4)) break;
    }
    self.postMessage({ type: 'result', id: m.id, depth: last, nodes: S.nodes, list });
  } catch (err) {
    self.postMessage({ type: 'result', id: m.id, error: true, message: String(err && err.message || err) });
  }
}

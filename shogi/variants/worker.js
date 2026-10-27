'use strict';
// Worker for the shogi variants: {type: 'think' | 'analyze', variant: 'mini' | 'hasami', sfen, moves, opts, id}
// → progress messages {type: 'progress', id, depth, score, list?} and the result {type: 'result', id, move, score, depth, pv, nodes, time, list?}
importScripts('search.js?v=20261028rb', 'mini.js?v=20261021vb', 'hasami.js?v=20261021vb');
self.onmessage = e => {
  const m = e.data; if (!m || (m.type !== 'think' && m.type !== 'analyze')) return;
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

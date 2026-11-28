// (2026-11-28 第2期 担当A) the material reading for k1「中盤の次の一手」, shared by shogi/tools/gen-deep.js and
// tools/lesson-verify-shdeep.js. Built on shogi/tools/fork-lib.js (values = engine VALUE / 100, 歩 0.9 … 竜 13.95):
//   val(p, m)   = 2 plies: our move, EVERY reply, then captures only            (「指してすぐ」の得)
//   v3(p, m, need) — 3 plies: our move m, EVERY reply r, then our BEST move y (any legal move, judged by val: y, every reply,
//               captures) — is gain(m) − gain(r) + val(y) ≥ need after every r?  { ok, r (a reply that holds it under need) }
//   y3(p, m, r) = after m and r, our best y (by val) and its value seen from the start: gain(m) − gain(r) + val(y)
// k1's point: no legal move wins material at 2 plies (every val ≤ 0.95), the answer wins +2.5 or more at 3 plies whatever the
// opponent replies, every other legal move has a reply after which we win +0.95 or less.
'use strict';
module.exports = function (E) {
  const F = require('./fork-lib.js')(E), T = E.typeOf;
  const order = (p, ms) => ms.map(m => [m, F.gain(p, m) + (E.isDrop(m) ? 0 : 0.01)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  // the best y after the position p (our side to move): stop once best ≥ stopAt (when given)
  function bestY(p, stopAt) {
    const ys = order(p, p.legalMoves(true)); if (!ys.length) return { v: p.inCheck() ? -F.M : 0, y: null };
    let best = -F.M - 1, by = null;
    for (const y of ys) { const r = F.val(p, y, best); if (r.v > best) { best = r.v; by = y; if (stopAt != null && best >= stopAt) break; } }
    return { v: best, y: by };
  }
  function v3(p, m, need) {
    const g = F.gain(p, m); p.doMove(m); let out = { ok: true, r: null, v: null };
    const rs = order(p, p.legalMoves(true));
    if (!rs.length) { p.undoMove(); return { ok: true, r: null, v: F.M }; }
    for (const r of rs) { const gr = F.gain(p, r); p.doMove(r); const B = bestY(p, need - g + gr); p.undoMove();
      const v = g - gr + B.v; if (v < need) { out = { ok: false, r: p.toUsi(r), v }; break; } }
    p.undoMove(); return out;
  }
  function y3(p, m, r) {   // (for the words: the answer, a reply, our best follow-up and what it takes)
    const g = F.gain(p, m); p.doMove(m); const rm = p.fromUsi(r), gr = F.gain(p, rm); p.doMove(rm); const B = bestY(p, null);
    const y = B.y == null ? null : p.toUsi(B.y), yt = B.y == null || E.isDrop(B.y) || !p.board[E.mTo(B.y)] ? 0 : T(p.board[E.mTo(B.y)]);
    p.undoMove(); p.undoMove(); return { v: g - gr + B.v, y, yt };
  }
  return Object.assign({}, F, { bestY, v3, y3 });
};

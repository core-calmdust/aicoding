// (2026-11-24 担当D) the board facts of the 「ねらわれた駒を逃げる」 lesson (b_escape), read by the rules alone (janggi/engine.js):
// a static exchange (SEE) on one point — the side to move takes with its cheapest piece, the other side may take back, either side
// may stop — and from it what is in danger. Used by janggi/tools/gen_escape.js (finding problems). The 3D words
// (atlas/games/janggi-ls.js) and the checker (tools/lesson-verify-janggi.js) each count the same facts on their own.
'use strict';
const VAL = [0, 1000, 3, 3, 5, 13, 7, 2];   // (the general as a taker last; it is never taken)
module.exports = function (E) {
  const T = E.typeOf, C = E.colorOf, mTo = E.mTo, mFrom = E.mFrom;
  const capsAt = (q, s) => q.moves().filter(m => !E.isPass(m) && mTo(m) === s);
  // the gain of the side to move in q from the exchange on s (0 = nothing to win)
  function see(q, s, depth) {
    const x = q.at(s); if (!x || T(x) === E.KING || C(x) === q.side) return 0;
    const L = capsAt(q, s); if (!L.length || (depth || 0) > 8) return 0;
    let m = L[0]; for (const y of L) if (VAL[T(q.at(mFrom(y)))] < VAL[T(q.at(mFrom(m)))]) m = y;
    return Math.max(0, VAL[T(x)] - see(q.clone().play(m), s, (depth || 0) + 1));
  }
  // the opponent to move in a copy of p (p: the side whose pieces are looked at to move)
  const flip = p => { const q = p.clone(); q.side ^= 1; q.rehash(); return q; };
  // danger: the pieces of `me` the opponent (to move in q) wins something on — [{ s, gain, by: the cheapest taker's type }]
  function danger(q) {
    const me = 1 - q.side, out = [];
    for (let s = 0; s < 90; s++) { const x = q.at(s); if (!x || C(x) !== me || T(x) === E.KING) continue;
      const g = see(q, s); if (g > 0) { let by = 0; for (const m of capsAt(q, s)) { const t = T(q.at(mFrom(m))); if (!by || VAL[t] < VAL[by]) by = t; } out.push({ s, t: T(x), gain: g, by }); } }
    return out.sort((a, b) => b.gain - a.gain);
  }
  const mate1 = q => q.moves().some(x => q.clone().play(x).status() === -1);
  return { see, flip, danger, mate1, VAL, capsAt };
};

// (2026-11-24 担当D) the board facts of the 「両取り」 lesson (t_fork), read by the rules alone (janggi/engine.js), on top of the static
// exchange of esc_facts.js and the 1-move net of trade_facts.js:
//  · threats(q, me): the opponent's pieces (not the general) that `me` would win something on if it were `me`'s turn (SEE > 0),
//    biggest first — [{ s, t, gain }].
//  · fork(p, u) = what u wins for sure, three plies deep: the piece u takes, then for the opponent's every reply r: − the piece r
//    takes + 楚's best 1-move net after r (trade_facts' net: the piece taken − the opponent's best exchange after it), the worst reply
//    for 楚 counted (−99 when the opponent has a mate in 1 after u, or 楚 is mated after r). `cut`: stop as soon as the value is ≤ cut
//    (the reply found is returned as `by`).
// Used by janggi/tools/gen_fork.js. The 3D words (atlas/games/janggi-ls.js) and tools/lesson-verify-janggi.js count the same facts on their own.
'use strict';
module.exports = function (E) {
  const TF = require('./trade_facts.js')(E), F = TF, T = E.typeOf, C = E.colorOf, mTo = E.mTo, mFrom = E.mFrom, PTS = TF.PTS;
  const capOf = (p, m) => !E.isPass(m) && p.at(mTo(m)) ? T(p.at(mTo(m))) : 0;
  function threats(q, me) {
    const r = q.side === me ? q : F.flip(q), out = [];
    for (let s = 0; s < 90; s++) { const x = r.at(s); if (!x || C(x) === me || T(x) === E.KING) continue; const g = F.see(r, s); if (g > 0) out.push({ s, t: T(x), gain: g }); }
    return out.sort((a, b) => b.gain - a.gain || PTS[b.t] - PTS[a.t]);
  }
  // 楚's best 1-move net in q (楚 to move); stops once it reaches `stop`
  function best1(q, stop) {
    const L = q.moves(); if (!L.length) return -99;
    let b = -1e9;
    const cs = L.filter(x => capOf(q, x)).sort((x, y) => PTS[capOf(q, y)] - PTS[capOf(q, x)]);
    for (const x of cs) { if (PTS[capOf(q, x)] <= b) break; const v = TF.net(q, x); if (v > b) b = v; if (b >= stop) return b; }
    if (b >= 0) return b;
    for (const x of L) { if (capOf(q, x)) continue; const v = TF.net(q, x); if (v > b) b = v; if (b >= 0 || b >= stop) return b; }
    return b;
  }
  function fork(p, u, cut) {
    const c0 = PTS[capOf(p, u)], q = p.clone().play(u);
    if (F.mate1(q)) return { v: -99, by: null, m1: true };
    const R = q.moves(); if (!R.length) return { v: 99, by: null, mate: true };
    // the likeliest refutations first: captures (biggest), then moves of the pieces under threat
    const th = new Set(threats(q, p.side).map(o => o.s));
    const key = r => (capOf(q, r) ? 100 + PTS[capOf(q, r)] : 0) + (!E.isPass(r) && th.has(mFrom(r)) ? 50 : 0);
    R.sort((a, b) => key(b) - key(a));
    let mn = 1e9, by = null;
    for (const r of R) { const cr = PTS[capOf(q, r)], q2 = q.clone().play(r);
      const v = c0 - cr + best1(q2, mn - c0 + cr);
      if (v < mn) { mn = v; by = r; if (cut != null && mn <= cut) break; } }
    return { v: mn, by, m1: false };
  }
  return Object.assign({}, TF, { threats, fork, best1, capOf });
};

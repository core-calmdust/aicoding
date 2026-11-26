// (2026-11-26 第2期 担当A) xiangqi「両取り」t_fork: the board facts, read by the rules alone (xiangqi/engine.js), on top of the
// exchange count of tools/lesson-verify-xqtrade.js (the lesson's values 車9・炮4.5・馬4・仕と相2・兵1／川を渡ると2):
//  · threats(q, me): the pieces of the side not `me` (not the general) that `me` would win something on if it were `me`'s turn
//    (the swap list > 0), the biggest first — [{ s, t, g }].
//  · net1(q, x): the 1-move net of x for the side to move in q = the piece taken − the opponent's best exchange afterwards
//    (−99 when the opponent then mates in 1).
//  · fork(p, u) = what u wins for sure, three plies deep (追51): the piece u takes, then for the opponent's every reply r:
//    − the piece r takes + our best 1-move net after r; the worst reply for us counted (−99 when the opponent mates in 1 after u,
//    +99 when the opponent has no move after u). `cut`: stop as soon as the value is ≤ cut (the reply found is `by`).
// Used by tools/lesson-verify-xqfork.js, tools/xqfork-gen.js and (the same counts, written again) atlas/lessons3d.js xqForkJa.
'use strict';
const TR = require('./lesson-verify-xqtrade.js');
module.exports = function (E) {
  const F = TR.facts(E), T = E.typeOf, C = E.colorOf, mTo = E.mTo, mFrom = E.mFrom;
  const capOf = (p, m) => p.at(mTo(m)) ? T(p.at(mTo(m))) : 0;
  const capV = (p, m) => p.at(mTo(m)) ? F.val(p, mTo(m)) : 0;
  const threats = (q, me) => { const r = q.side === me ? q : F.turned(q), o = [];
    for (let s = 0; s < 90; s++) { const x = r.at(s); if (!x || C(x) === me || T(x) === E.KING) continue; const g = F.exch(r, s); if (g > 0) o.push({ s, t: T(x), g, v: F.val(r, s) }); }
    return o.sort((a, b) => b.g - a.g || b.v - a.v); };
  const net1 = (q, x) => { const r = q.clone().play(x); if (F.mate1(r)) return -99; const D = F.danger(r); return capV(q, x) - (D[0] ? D[0].g : 0); };
  const best1 = (q, stop) => { const L = q.moves(); if (!L.length) return -99; let b = -1e9;
    const cs = L.filter(x => capOf(q, x)).sort((x, y) => capV(q, y) - capV(q, x));
    for (const x of cs) { if (T(q.at(mTo(x))) === E.KING) continue; if (capV(q, x) <= b) break; b = Math.max(b, net1(q, x)); if (b >= stop) return b; }
    if (b >= 0) return b;
    for (const x of L) { if (capOf(q, x)) continue; b = Math.max(b, net1(q, x)); if (b >= 0 || b >= stop) return b; }
    return b; };
  const fork = (p, u, cut) => { const c0 = capV(p, u), q = p.clone().play(u);
    if (F.mate1(q)) return { v: -99, by: null, m1: true };
    const R = q.moves(); if (!R.length) return { v: 99, by: null };
    const th = new Set(threats(q, p.side).map(o => o.s)), key = r => (capOf(q, r) ? 100 + capV(q, r) : 0) + (th.has(mFrom(r)) ? 50 : 0);
    R.sort((a, b) => key(b) - key(a)); let mn = 1e9, by = null;
    for (const r of R) { const cr = capV(q, r), v = c0 - cr + best1(q.clone().play(r), mn - c0 + cr); if (v < mn) { mn = v; by = r; if (cut != null && mn <= cut) break; } }
    return { v: mn, by, m1: false }; };
  // the reply r to u: what we still win after it (the same count as fork, for one reply)
  const vsReply = (p, u, q, r) => capV(p, u) - capV(q, r) + best1(q.clone().play(r), 1e9);
  // the pieces the moved piece of u itself attacks after u that are worth winning (value 2 or more), the biggest first
  const hits = (p, u) => { const q = p.clone().play(u), me = p.side, r = F.turned(q);
    return threats(q, me).filter(o => o.v >= 2 && r.movesFrom(mTo(u)).some(x => mTo(x) === o.s)); };
  return Object.assign({}, F, { capOf, capV, threats, net1, best1, fork, vsReply, hits });
};

// (2026-11-24 担当D) the board facts of the 「得な交換」 lesson (t_capture), read by the rules alone (janggi/engine.js), on top of the
// static exchange of esc_facts.js: what a move wins — net(p, u) = the points of the piece u takes minus the opponent's best exchange
// after u (anything of 楚 it wins), −99 when the opponent then has a mate in 1. The 3D words (atlas/games/janggi-ls.js) and the checker
// (tools/lesson-verify-janggi.js) count the same facts on their own.
'use strict';
const PTS = [0, 0, 3, 3, 5, 13, 7, 2];
module.exports = function (E) {
  const F = require('./esc_facts.js')(E), T = E.typeOf, mTo = E.mTo, mFrom = E.mFrom;
  const caps = p => p.moves().filter(m => !E.isPass(m) && p.at(mTo(m)) && T(p.at(mTo(m))) !== E.KING);
  function facts(p, u) {
    const c = !E.isPass(u) && p.at(mTo(u)) ? T(p.at(mTo(u))) : 0, mt = T(p.at(mFrom(u))), q = p.clone().play(u), D = F.danger(q), m1 = F.mate1(q);
    const lost = D[0] ? D[0].gain : 0, net = m1 ? -99 : PTS[c] - lost, back = !!c && D.some(d => d.s === mTo(u));
    const theme = !!c && back && D[0].s === mTo(u) && PTS[c] >= 5 && PTS[mt] < PTS[c] && D[0].gain === PTS[mt] && net > 0;   // (the simple swap: the opponent wins back just the taker)
    return { c, ct: c, mt, q, D, m1, lost, net, back, theme };
  }
  return Object.assign({}, F, { caps, facts, net: (p, u) => facts(p, u).net, PTS });
};

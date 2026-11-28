// Breakthrough: the "fun score" of a problem (0–100; claude/puzzle-fun-score.md — problems need 70, the basics lessons 60).
//  win (break through in k, one winning first move): depth, choice (legal moves), the kind of first move (an exchange or a quiet
//   waiting move scores most, a plain capture least), whether the answer is the obvious move (the most advanced piece / a
//   capture), and the line after it: the defender must have several replies and the attacker's second move must still be a
//   choice (the common "実質1手" rule, relaxed for Breakthrough as 1/3 of the moves because its threats force replies).
//  def (the only defence): choice, a quiet answer, failing captures on offer.   cap (the free capture): captures on offer, margin.
'use strict';
const E = require('../engine.js');
function lead(pos, p) { return pos.lead(p); }
function win(x) {
  const pos = E.Pos.from(x.sp), me = pos.turn, ans = x.ans, legal = pos.moves();
  let s = { 2: 50, 3: 57, 4: 62, 5: 65, 6: 67, 7: 68 }[x.k] || 50;
  s += Math.min(14, legal.length * 0.45);
  s += { trade: 12, tempo: 14, race: 6, push: 5, take: 0 }[x.kind] || 0;
  const d = E.distOf(E.mFrom(ans), me);
  if (d > lead(pos, me)) s += 8;                       // not the leading piece
  const caps = legal.filter(m => E.isCap(pos, m));
  if (!E.isCap(pos, ans) && caps.length) s += 5;      // a quiet answer while captures are on offer
  const q = pos.clone().play(ans), rep = q.moves();
  if (rep.length >= 3) s += 4; else s -= 10;
  if (x.k >= 3) {
    const r = E.duelReply(x.sp, [ans], x.k - 1).move;
    if (r != null) {
      const q2 = q.clone().play(r), L2 = q2.moves(), g2 = E.duelGood(x.sp, [ans, r], x.k - 1);
      if (L2.length && g2.length / L2.length > 1 / 3) s -= 12;
    }
  }
  return Math.max(0, Math.min(100, s));
}
function def(x) {
  const pos = E.Pos.from(x.sp), legal = pos.moves();
  let s = 50 + Math.min(15, legal.length * 0.6);
  if (!E.isCap(pos, x.ans)) s += 12;
  const failCaps = legal.filter(m => m !== x.ans && E.isCap(pos, m)).length;
  s += Math.min(9, failCaps * 3);
  const fast = x.needs.filter(e => e.need === 1).length;   // moves that lose at once make the answer easier to find by elimination
  if (fast > legal.length * 0.6) s -= 6;
  return Math.max(0, Math.min(100, s));
}
function cap(x) { return Math.max(0, Math.min(100, 52 + x.caps * 5 + Math.min(10, x.gap / 30) + Math.min(8, x.legal * 0.25))); }
module.exports = { win, def, cap };

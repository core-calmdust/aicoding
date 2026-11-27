// The fun score of a puzzle (0–100, claude/puzzle-fun-score.md; a puzzle is kept at 70 and up):
//   unique first move 25 (two winning first moves 12) · breadth of the first choice up to 20 (1.2 per legal move) ·
//   a quiet first move (it does not win a small board) 15 · a paradox 15 (the winning first move lets the opponent win a small
//   board at once or gives a free choice) · depth: 2 moves 10, 3 moves 15, 4 moves 20 · the defender has 3+ replies 5.
// 1手で勝て (w1): its move always wins a small board, so "quiet" and "depth" cannot apply (2026-11-28, the rule's「ゲームの仕様に
// 合わせて」): instead up to 25 for the distractors (moves that win a small board without winning the game, 5 each) and 15 for a
// free choice (more boards to look at).
// lineOk (共通「実質1手の問題を除く」, read for this game like alquerque's: legal moves are few in a forced board): along the
// solution line (first move → the most stubborn reply → …) every later own move with 2+ legal moves has at most a third of
// them winning, and after the first move the defender has 3+ replies or a later own move has a real choice.
const E = require('../engine.js');
function lineInfo(P) {
  const start = E.Pos.from(P.s), me = start.turn; let line = [P.sol[0]], ok = true, choice = false;
  const pos = start.clone().play(P.sol[0]);
  const rep0 = pos.res < 0 ? pos.moves().length : 0;
  let left = P.n - 1, p = pos;
  while (p.res < 0 && left > 0) {
    const r = E.duelReply(p.spec(), [], left); if (r.move == null) { ok = false; break; }
    p = p.clone().play(r.move); line.push(r.move); if (p.res >= 0) break;
    const g = E.duelGood(p.spec(), [], left); if (!g || !g.length) { ok = false; break; }
    const L = p.moves().length;
    if (L >= 2) { if (g.length / L > 1 / 3) ok = false; else choice = true; }
    p = p.clone().play(g[0]); line.push(g[0]); left--;
  }
  if (p.res !== me) ok = false;
  return { ok: ok && (P.n === 1 || rep0 >= 3 || choice), rep0, line };
}
function score(P) {
  const pos = E.Pos.from(P.s), m = P.sol[0], q = pos.clone().play(m), legal = pos.moves().length;
  let s = (P.sol.length === 1 ? 25 : P.sol.length === 2 ? 12 : 0) + Math.min(20, legal * 1.2);
  const took = !pos.own[E.mB(m)] && q.own[E.mB(m)] === pos.turn;
  if (P.n === 1) {
    const dis = pos.moves().filter(x => { const z = pos.clone().play(x); return z.res < 0 && !pos.own[E.mB(x)] && z.own[E.mB(x)] === pos.turn; }).length;
    s += Math.min(25, dis * 5) + (pos.forced < 0 ? 15 : 0);
    return { s: Math.round(Math.min(100, s)), ok: true, line: [m] };
  }
  if (!took) s += 15;
  if (q.res < 0) { const F = require('../ls-facts.js'); const a = F.after(E, pos, m); if (a.k === 'take' || a.k === 'free') s += 15; }
  s += { 2: 10, 3: 15, 4: 20 }[P.n] || 20;
  const li = lineInfo(P); if (li.rep0 >= 3) s += 5;
  return { s: li.ok ? Math.round(Math.min(100, s)) : 0, ok: li.ok, line: li.line };
}
module.exports = { score, lineInfo };
if (require.main === module) { const d = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8')); for (const P of d) console.log(P.n, score(P).s); }

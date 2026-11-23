#!/usr/bin/env node
// Extra problem checks for the lesson loop phase 2 (claude/lesson-quality.md), beyond what tools/lesson-facts.js connect4() already
// enforces inline (①answer=best ②unique ③≥3 legal ⑤no near-duplicate ⑥ramp ⑦words-vs-board). Here are the move-specific facts the
// generic framework cannot express, so a count / endwin problem truly teaches its theme:
//   count  ⑧ the answer neither connects four nor blocks one now, and after it the mover still owns a winning cell up in the air
//            (the zugzwang the lesson is about — not a tactical shot).
//   endwin ⑦ after the answer every legal reply of the opponent loses with best play (the "give the opponent no counter" the words
//            promise), i.e. the win is truly forced and quickest.
// node tools/lesson-verify.js connect4 [--json out.json]
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
function connect4() {
  const E = require(path.join(ROOT, 'connect4/engine.js')), U = require(path.join(ROOT, 'connect4/tools/c4util.js'));
  const L = require(path.join(ROOT, 'connect4/lessons.json'));
  const out = [];
  const add = (id, j, m) => out.push({ step: id, q: j + 1, msg: m });
  for (const st of L.steps) {
    if (st.id === 'count') st.problems.forEach((P, j) => {
      const g = U.grid(P.moves), me = P.moves.length % 2 ? 2 : 1, op = 3 - me, a = P.answer[0], A = U.play(g, a, me);
      if (U.immWins(g, me).length) add('count', j, `⑧ the mover can connect four now (${U.immWins(g, me)}) — not a counting problem`);
      if (U.immWins(g, op).length) add('count', j, `⑧ a block is needed now (${U.immWins(g, op)}) — not a counting problem`);
      if (!U.threats(A, me).some(t => !t.playable)) add('count', j, '⑧ after the answer the mover owns no winning cell in the air');
    });
    if (st.id === 'endwin') st.problems.forEach((P, j) => {
      const g = U.grid(P.moves), me = P.moves.length % 2 ? 2 : 1, a = P.answer[0], mv2 = P.moves + (a + 1);
      if (U.isWinAfter(g, a, me)) return;                       // the answer itself connects four — nothing to force
      const g2 = U.grid(mv2);
      for (const r of U.legal(g2)) { E.loadMoves(mv2); const v = E.solveMove(r, false); if (!(v < 0)) add('endwin', j, `⑦ after the answer the reply ${r} does not lose (${v}) — the win is not forced`); }
    });
  }
  return out;
}
const GAMES = { connect4 };
module.exports = GAMES;
if (require.main === module) {
  const a = process.argv.slice(2), games = (a.find(x => !x.startsWith('-')) || 'connect4').split(',');
  let bad = 0;
  for (const g of games) { const f = GAMES[g](); if (!f.length) { console.log(`OK ${g} (count/endwin の⑦⑧)`); continue; }
    bad += f.length; f.forEach(x => console.log(`NG ${g} ${x.step} q${x.q}: ${x.msg}`)); }
  process.exit(bad ? 1 : 0);
}

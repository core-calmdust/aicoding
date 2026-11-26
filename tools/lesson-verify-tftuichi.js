'use strict';
// (2026-11-26 第2期 担当A) tafl t_tuichi「トゥイチ（逃げ道を2本）」: the facts of one problem, read with the rules (tafl/engine.js).
// tuichiFacts(E, P) → { all, C (per move: king?, win now, routes = the king's open lines to a corner after it, forced = every attacker
// reply leaves the defender a corner escape at once, the attacker's wins / blocks after it), goal (the forced moves), wrong, d (the king's
// wrong moves that open one line: the ライチ near-misses), kd (the king's wrong moves) } and the faults (①②③④⑦ of the board).
// Used by tools/lesson-verify.js tafl and by the maker (tafl/tools/mk-tuichi.js).
const n = 11;
function tuichiFacts(E, P) {
  const p = E.Pos.from(P.s), me = p.turn, F = p.G.F, all = p.moves(), bad = [], CORNER = i => !!(F[i] & 2), EDGE = i => !!(F[i] & 1);
  const escNow = z => z.moves().some(x => E.mFrom(x) === z.king && CORNER(E.mTo(x)) && z.clone().play(x).res === me);
  const C = new Map();
  for (const m of all) { const q = p.clone().play(m), king = p.at(E.mFrom(m)) === 3, R = { m, king, win: q.res === me, routes: q.res ? 0 : q.kingLines().length, edge: EDGE(E.mTo(m)), q };
    R.oppWin = false; R.capKing = false; R.blockAll = false; R.forced = false;
    if (!q.res) { let all2 = true;
      for (const r of q.moves()) { const z = q.clone().play(r); if (z.res && z.res !== me) { R.oppWin = true; if (z.why === 'capture') R.capKing = true; all2 = false; continue; } if (z.res || !escNow(z)) all2 = false; }
      R.forced = all2; }
    C.set(m, R); }
  const goal = all.filter(m => C.get(m).forced), okS = new Set(P.ok || []), wrong = all.filter(m => !okS.has(m)), nm = m => E.name(p, m);
  if (me !== 2) bad.push('④ not the defender to move');
  if (all.some(m => C.get(m).win)) bad.push('④ the defender escapes at once (not a tuichi)');
  if (p.kingLines().length) bad.push('④ the king already has an open line');
  { const q = p.clone(); q.turn = 3 - me; q.res = 0; if (q.moves().some(r => q.clone().play(r).res === 3 - me)) bad.push('④ the attacker threatens to win at once'); }
  (P.ok || []).forEach(m => { if (!all.includes(m)) bad.push(`① the answer ${m} is not legal`); else if (!goal.includes(m)) bad.push(`① ${nm(m)} does not force the escape (routes ${C.get(m).routes})`); });
  goal.forEach(m => { if (!okS.has(m)) bad.push(`② ${nm(m)} forces the escape too but is scored wrong`); });
  if (!okS.has(P.best)) bad.push('① best is not an answer');
  goal.forEach(m => { const R = C.get(m); if (!R.king) bad.push(`④ ${nm(m)} forces it without moving the king (the lesson: move the king)`); else if (R.routes < 2) bad.push(`④ ${nm(m)} forces it with ${R.routes} line (not two lines)`); });
  all.forEach(m => { const R = C.get(m); if (R.king && !R.win && R.routes >= 2 && !R.forced) bad.push(`④ ${nm(m)} opens ${R.routes} lines but the attacker still stops it`); });
  const kd = wrong.filter(m => C.get(m).king).length, d = wrong.filter(m => C.get(m).king && C.get(m).routes === 1).length;
  if (all.length < 3 || wrong.length < 2 || (P.ok || []).length * 3 > all.length) bad.push(`③ ${(P.ok || []).length} of ${all.length} moves are right`);
  if (kd < 3) bad.push(`③ the king has ${kd} wrong moves`);
  if (d < 1) bad.push('③ no king move opens just one line (nothing to tell a ライチ from a トゥイチ)');
  // ⑦ the wrong moves the words lean on: a non-king move never opens a line (「王さまの道が増えない」)
  wrong.forEach(m => { const R = C.get(m); if (!R.king && R.routes > p.kingLines().length) bad.push(`⑦ ${nm(m)} (not the king) opens ${R.routes} line(s)`); if (R.oppWin && !R.capKing) bad.push(`⑦ after ${nm(m)} the attacker wins without taking the king`); });
  return { p, me, all, C, goal, wrong, d, kd, bad };
}
// ⑤ the shape: how far each answer's landing square is from its nearer corner along the edge (sorted), e.g. "1,4"
function tuichiSig(E, P) { return (P.ok || []).map(m => { const t = E.mTo(m), r = Math.floor(t / n), c = t % n; return r === 0 || r === n - 1 ? Math.min(c, n - 1 - c) : Math.min(r, n - 1 - r); }).sort((a, b) => a - b).join(','); }
module.exports = { tuichiFacts, tuichiSig };

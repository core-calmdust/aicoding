'use strict';
// (2026-11-28 第2期 担当A) tafl v_tablut「タブルットの脱出」: the facts of one problem, read with the rules (tafl/engine.js, tablut 9×9:
// the king escapes on any edge square; away from the throne he is taken by two). The defenders to move. tablutFacts(E, P) → { p, all,
// C (per move: king?, win now, routes = the king's open lines to the edge after it (kingLines), forced = every attacker reply leaves the
// king an escape at once, oppWin / capKing = some reply wins / takes the king), goal (the forced moves), wrong, d (the king's wrong moves
// that open just one line: the near-misses), kd (the king's wrong moves), bad (①②③④⑦ of the board) }.
// Used by tools/lesson-verify.js tafl and by the maker (tafl/tools/mk-tablut.js).
const n = 9;
function tablutFacts(E, P) {
  const p = E.Pos.from(P.s), me = p.turn, all = p.moves(), bad = [], nm = m => E.name(p, m);
  const escNow = z => z.moves().some(x => E.mFrom(x) === z.king && z.clone().play(x).res === me);
  const C = new Map();
  for (const m of all) { const q = p.clone().play(m), king = p.at(E.mFrom(m)) === 3, R = { m, king, win: q.res === me, routes: q.res ? 0 : q.kingLines().length, q };
    R.oppWin = false; R.capKing = false; R.forced = false;
    if (!q.res) { let all2 = true;
      for (const r of q.moves()) { const z = q.clone().play(r); if (z.res && z.res !== me) { R.oppWin = true; if (z.why === 'capture') R.capKing = true; all2 = false; continue; } if (z.res || !escNow(z)) all2 = false; }
      R.forced = all2; }
    C.set(m, R); }
  const goal = all.filter(m => C.get(m).forced), okS = new Set(P.ok || []), wrong = all.filter(m => !okS.has(m));
  if (p.G.n !== n || P.s.v !== 'tablut') bad.push('④ not the tablut board');
  if (me !== 2) bad.push('④ not the defenders to move');
  if (all.some(m => C.get(m).win)) bad.push('④ the king escapes at once (not a two-line move)');
  if (p.kingLines().length) bad.push('④ the king already has an open line');
  { const q = p.clone(); q.turn = 3 - me; q.res = 0; if (q.moves().some(r => q.clone().play(r).res === 3 - me)) bad.push('④ the attackers threaten to take the king at once'); }
  (P.ok || []).forEach(m => { if (!all.includes(m)) bad.push(`① the answer ${m} is not legal`); else if (!goal.includes(m)) bad.push(`① ${nm(m)} does not force the escape (routes ${C.get(m).routes})`); });
  goal.forEach(m => { if (!okS.has(m)) bad.push(`② ${nm(m)} forces the escape too but is scored wrong`); });
  if (!okS.has(P.best)) bad.push('① best is not an answer');
  if (!goal.length) bad.push('① no move forces the escape');
  goal.forEach(m => { const R = C.get(m); if (!R.king) bad.push(`④ ${nm(m)} forces it without moving the king (the lesson: move the king)`); else if (R.routes < 2) bad.push(`④ ${nm(m)} forces it with ${R.routes} line (not two lines)`); });
  // 「端への道を2本作れたら勝ち」: no king move opens two lines that the attackers can still stop (taking him or blocking both)
  all.forEach(m => { const R = C.get(m); if (R.king && !R.win && R.routes >= 2 && !R.forced) bad.push(`④⑧ ${nm(m)} opens ${R.routes} lines but the attackers still stop it`); });
  const kd = wrong.filter(m => C.get(m).king).length, d = wrong.filter(m => C.get(m).king && C.get(m).routes === 1).length;
  if (all.length < 10 || wrong.length < 2 || (P.ok || []).length * 3 > all.length) bad.push(`③ ${(P.ok || []).length} of ${all.length} moves are right`);
  if (kd < 3 || (P.ok || []).length * 2 > kd + (P.ok || []).length) bad.push(`③ the king has ${kd} wrong moves`);
  if (d < 1) bad.push('③ no king move opens just one line (nothing to tell one line from two)');
  // ⑦ the words lean on: a man that is not the king never opens a line for him (「王さまの道が増えない」), the attackers win only by taking him
  wrong.forEach(m => { const R = C.get(m); if (!R.king && R.routes > 0) bad.push(`⑦ ${nm(m)} (not the king) opens ${R.routes} line(s)`); if (R.oppWin && !R.capKing) bad.push(`⑦ after ${nm(m)} the attackers win without taking the king`); });
  return { p, me, all, C, goal, wrong, d, kd, bad };
}
// ⑤ the 8 symmetries of the 9×9 board: the fewest squares that differ
const SYM = [(r, c) => [r, c], (r, c) => [r, 8 - c], (r, c) => [8 - r, c], (r, c) => [8 - r, 8 - c], (r, c) => [c, r], (r, c) => [c, 8 - r], (r, c) => [8 - c, r], (r, c) => [8 - c, 8 - r]];
const dist9 = (a, b) => { if (a.length !== 81 || b.length !== 81) return 99; let best = 99; for (const S of SYM) { let d = 0; for (let i = 0; i < 81 && d < best; i++) { const [r, c] = S((i / 9) | 0, i % 9); if (a[i] !== b[r * 9 + c]) d++; } best = Math.min(best, d); } return best; };
// the answer's from>to under the 8 symmetries (⑤ the same move turned / mirrored)
const symKeys = (E, m) => SYM.map(S => { const f = E.mFrom(m), t = E.mTo(m), x = S((f / 9) | 0, f % 9), y = S((t / 9) | 0, t % 9); return `${x[0] * 9 + x[1]}>${y[0] * 9 + y[1]}`; });
// the shape of the two lines from the answer's square: 'I' (opposite ways) / 'L' (at a right angle)
const shape = (E, f, m) => { const R = f.C.get(m), q = R.q, k = q.king, L = q.kingLines(); const dirs = L.map(t => (Math.floor(t / n) === Math.floor(k / n) ? 'h' : 'v')); return new Set(dirs).size > 1 ? 'L' : 'I'; };
module.exports = { tablutFacts, dist9, symKeys, shape, SYM };

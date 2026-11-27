'use strict';
// (2026-11-27 第2期 担当A) tafl s_breakout「王の道を開く」: the facts of one problem, read with the rules (tafl/engine.js).
// The defenders to move, the king on an edge with no open line yet: an own man stands between him and a corner. The answer moves that man
// out of the way (off the line) so that the king's line to the corner opens and no attacker can get onto it in one move: whatever the
// attackers play, the king runs into the corner next. breakFacts(E, P) → { all, C (per move: king = a king move, lines = the king's open
// lines after it, forced = every attacker reply leaves the king a corner at once, oppWin, why = what follows a wrong move: 'shut' no line
// opens / 'block' a line opens but an attacker reply shuts it), goal (the forced moves), wrong, ring (the moves of the answers' man), d (the
// wrong moves that open a line: the near-misses) } and the faults (①②③④⑦ of the board).
// Used by tools/lesson-verify.js tafl and by the maker (tafl/tools/mk-break.js).
const n = 11;
function breakFacts(E, P) {
  const p = E.Pos.from(P.s), me = p.turn, F = p.G.F, all = p.moves(), bad = [], CORNER = i => !!(F[i] & 2), EDGE = i => !!(F[i] & 1);
  const escNow = z => z.moves().some(x => E.mFrom(x) === z.king && CORNER(E.mTo(x)) && z.clone().play(x).res === 2);
  const C = new Map();
  for (const m of all) { const q = p.clone().play(m), R = { m, king: E.mFrom(m) === p.king, win: q.res === 2, lines: q.res ? 0 : q.kingLines().length, caps: q.lastCaps.length, oppWin: false, forced: false };
    if (!q.res) { let f = true; for (const r of q.moves()) { const z = q.clone().play(r); if (z.res) { if (z.res !== 2) R.oppWin = true; f = false; continue; } if (!escNow(z)) f = false; } R.forced = f; }
    R.why = R.win || R.forced ? '' : R.oppWin ? 'lose' : R.lines ? 'block' : 'shut';
    C.set(m, R); }
  const goal = all.filter(m => C.get(m).forced), okS = new Set(P.ok || []), wrong = all.filter(m => !okS.has(m)), nm = m => E.name(p, m);
  if (me !== 2) bad.push('④ not the defenders to move');
  if (!EDGE(p.king)) bad.push('④ the king is not on an edge');
  if (p.kingLines().length) bad.push('④ the king already has an open line');
  if (all.some(m => C.get(m).win)) bad.push('④ the defenders win at once');
  if (all.some(m => C.get(m).oppWin)) bad.push('④ the attackers can win after a move (not the lesson)');
  (P.ok || []).forEach(m => { if (!all.includes(m)) bad.push(`① the answer ${m} is not legal`); else if (!goal.includes(m)) bad.push(`① ${nm(m)} does not force the escape (lines ${C.get(m).lines})`); });
  goal.forEach(m => { if (!okS.has(m)) bad.push(`② ${nm(m)} forces the escape too but is scored wrong`); });
  if (!okS.has(P.best)) bad.push('① best is not an answer');
  if (!goal.length) bad.push('① no move opens a way');
  // ④ every answer: a man (not the king) that stood on the king's edge line steps off it, takes nothing, and opens one line
  const kr = Math.floor(p.king / n), kc = p.king % n, onLine = i => { const r = Math.floor(i / n), c = i % n; return (kr === 0 || kr === n - 1) && r === kr || (kc === 0 || kc === n - 1) && c === kc; };
  goal.forEach(m => { const R = C.get(m); if (R.king) bad.push(`④ ${nm(m)} is a king move (the lesson: move a man out of his way)`);
    if (R.caps) bad.push(`④ ${nm(m)} takes a piece`); if (!onLine(E.mFrom(m))) bad.push(`④ ${nm(m)}: the man was not on the king's edge line`);
    if (onLine(E.mTo(m))) bad.push(`④ ${nm(m)} stays on the king's edge line`); });
  if (new Set((P.ok || []).map(E.mFrom)).size > 1) bad.push('④ the answers move more than one man (the hint rings one)');
  const rings = new Set((P.ok || []).map(E.mFrom)), ring = all.filter(m => rings.has(E.mFrom(m))), d = wrong.filter(m => C.get(m).why === 'block').length;
  // ③ the answers ≤ a third of the moves and of the ringed man's moves (追17), ≥2 wrong moves of the ringed man, one of them along the line
  // (the hint: moved along the line he still blocks), ≥1 near-miss (a line opened that the attackers shut)
  if (all.length < 3 || wrong.length < 2 || (P.ok || []).length * 3 > all.length) bad.push(`③ ${(P.ok || []).length} of ${all.length} moves are right`);
  if (ring.length - (P.ok || []).length < 2 || (P.ok || []).length * 3 > ring.length) bad.push(`③ 追17: ${(P.ok || []).length} of the ringed man's ${ring.length} moves are right`);
  if (!ring.some(m => !okS.has(m) && onLine(E.mTo(m)) && C.get(m).why === 'shut')) bad.push('③ the ringed man has no move along the line that still blocks');
  if (d < 1) bad.push('③ no wrong move opens a line (nothing to tell an open way from one the attackers shut)');
  // ⑦ the words lean on: a 'block' move is shut by an attacker standing on the opened line
  wrong.forEach(m => { const R = C.get(m); if (R.why !== 'block') return; const q = p.clone().play(m), L = q.kingLines();
    const shut = q.moves().some(r => { const z = q.clone().play(r); return !z.res && !escNow(z) && L.some(t => { const [r1, c1] = [Math.floor(q.king / n), q.king % n], [r2, c2] = [Math.floor(t / n), t % n], dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
      for (let r0 = r1 + dr, c0 = c1 + dc; r0 !== r2 || c0 !== c2; r0 += dr, c0 += dc) if (r0 * n + c0 === E.mTo(r)) return true; return false; }); });
    if (!shut) bad.push(`⑦ after ${nm(m)} the attackers stop the king without standing on the opened line`); });
  return { p, me, all, C, goal, wrong, ring, d, bad };
}
// what the words of a wrong move u should say (the same reading as the 3D tfBreakWhy, written again here from the rules): 'block' a line
// opens but an attacker reply shuts it, 'shut' no line opens (the king still on the edge: a piece stays between him and each corner), 'off'
// the king left the edge (no line from inside), 'lose' the attackers win next, '' u holds
function breakWhy(E, P, u) { const p = E.Pos.from(P.s), F = p.G.F, q = p.clone().play(u); if (q.res) return '';
  const escNow = z => z.moves().some(x => E.mFrom(x) === z.king && (F[E.mTo(x)] & 2) && z.clone().play(x).res === 2);
  let stop = false; for (const r of q.moves()) { const z = q.clone().play(r); if (z.res) return z.res === 2 ? '' : 'lose'; if (!escNow(z)) stop = true; }
  return !stop ? '' : q.kingLines().length ? 'block' : (F[q.king] & 1) ? 'shut' : 'off'; }
// ⑤ the shape: how far the ringed man stood from the king, how far the corner is beyond him, and his answers (count)
function breakSig(E, P) { const p = E.Pos.from(P.s), ok = P.ok || []; if (!ok.length) return ''; const f = E.mFrom(ok[0]), d = Math.abs(f - p.king) % n || Math.abs(f - p.king) / n;
  const kr = Math.floor(p.king / n), kc = p.king % n, along = kr === 0 || kr === n - 1 ? kc : kr;
  return 'd' + d + ':k' + Math.min(along, n - 1 - along) + ':' + ok.length; }
module.exports = { breakFacts, breakWhy, breakSig };

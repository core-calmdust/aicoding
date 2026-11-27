'use strict';
// (2026-11-27 第2期 担当A) tafl s_corner「角を固める」: the facts of one problem, read with the rules (tafl/engine.js).
// The attackers to move, the king with no open line yet, but (were the defenders to move) a corner reached within his 2 moves. The answer
// puts an attacker on one of the corner's three blockade squares (the diagonal c1・b2・a3 and the like). cornerFacts(E, P) → { all, C (per
// move: res, esc1 = the defender wins at once after it, f2 = the defender forces a corner within his 2 moves (how: 'tuichi' a king move to
// two lines / 'king' a king move to one line nobody can shut / 'taken' the king takes the blocker / 'other'), blk = it lands on a blockade
// square), goal (the moves after which the king cannot reach a corner within 2: the lesson's question), wrong, blks (the moves onto a
// blockade square), d (the blockade moves that still lose: the near-misses) } and the faults (①②③④ and what the words lean on).
// Used by tools/lesson-verify.js tafl and by the maker (tafl/tools/mk-corner.js).
const n = 11;
// the corner-blockade squares (Copenhagen 11×11): for each corner the three squares two steps from it (c1・b2・a3 for a1)
const BLOCK = new Map([[2, 0], [12, 0], [22, 0], [8, 10], [20, 10], [32, 10], [88, 110], [100, 110], [112, 110], [98, 120], [108, 120], [118, 120]]);
function cornerFacts(E, P, cornerOnly, threatOnly) {
  if (cornerOnly === undefined) cornerOnly = true;
  const p = E.Pos.from(P.s), me = p.turn, F = p.G.F, all = p.moves(), bad = [], CORNER = i => !!(F[i] & 2), EDGE = i => !!(F[i] & 1);
  const winNow = z => { if (z.res) return z.res === 2; const k = z.king, ms = z.moves(); for (const x of ms) if (E.mFrom(x) === k && (CORNER(E.mTo(x)) || (EDGE(E.mTo(x)) && !cornerOnly)) && z.clone().play(x).res === 2) return true;
    if (EDGE(k) && !cornerOnly) for (const x of ms) if (E.mFrom(x) !== k && z.clone().play(x).res === 2) return true; return false; };
  // the defender (to move in q) forces a win within 2 of his moves; how: the first such move
  const force2 = (q, blocker) => { if (q.res) return q.res === 2 ? { how: 'now' } : null; const k = q.king;
    const ms = q.moves().sort((a, b) => (E.mFrom(a) === k ? 0 : 1) - (E.mFrom(b) === k ? 0 : 1));
    for (const d of ms) { const z = q.clone().play(d); if (z.res === 2) return { how: 'now', d }; if (z.res) continue;
      const R = z.moves(); let forced = R.length > 0; for (const r of R) { const y = z.clone().play(r); if (y.res || !winNow(y)) { forced = false; break; } }
      if (forced) { const km = E.mFrom(d) === k; return { how: km && z.kingLines().length >= 2 ? 'tuichi' : km && blocker != null && z.lastCaps.includes(blocker) ? 'taken' : km ? 'king' : 'other', d }; } }
    return null; };
  const q0 = p.clone(); q0.turn = 3 - me; q0.res = 0; const threat = force2(q0);
  if (threatOnly) return { threat };
  const C = new Map();
  for (const m of all) { const q = p.clone().play(m), t = E.mTo(m), R = { m, res: q.res, caps: q.lastCaps.length, blk: BLOCK.has(t), corner: BLOCK.get(t) };
    R.esc1 = !q.res && winNow(q); R.f2 = R.esc1 || q.res ? null : force2(q, t); R.esc2 = !!R.f2; C.set(m, R); }
  const goal = all.filter(m => { const R = C.get(m); return !R.res && !R.esc1 && !R.esc2; });
  const okS = new Set(P.ok || []), wrong = all.filter(m => !okS.has(m)), nm = m => E.name(p, m), blks = all.filter(m => C.get(m).blk);
  if (me !== 1) bad.push('④ not the attackers to move');
  if (p.kingLines().length) bad.push(`④ the king has ${p.kingLines().length} open line(s) now (that is t_block; here the corner is shut before a line opens)`);
  if (all.some(m => C.get(m).res)) bad.push('④ a move ends the game at once');
  if (!threat) bad.push('④ the defenders do not threaten a corner within 2 (nothing to guard)');
  else if (E.mFrom(threat.d) !== p.king) bad.push('④ the threat is not a king move');
  (P.ok || []).forEach(m => { if (!all.includes(m)) bad.push(`① the answer ${m} is not legal`); else if (!goal.includes(m)) bad.push(`① ${nm(m)} lets the king reach a corner within 2 (${C.get(m).esc1 ? 'at once' : C.get(m).f2.how})`); });
  goal.forEach(m => { if (!okS.has(m)) bad.push(`② ${nm(m)} stops him too but is scored wrong`); });
  if (!okS.has(P.best)) bad.push('① best is not an answer');
  if (!goal.length) bad.push('① no move stops the king');
  goal.forEach(m => { const R = C.get(m); if (!R.blk) bad.push(`④ ${nm(m)} stops him without a piece on a corner's blockade square`); if (R.caps) bad.push(`④ ${nm(m)} takes a piece (the lesson: guard the corner)`); });
  { const cs = new Set(goal.map(m => C.get(m).corner)); if (cs.size > 1) bad.push(`④ the answers guard ${cs.size} corners (one corner in danger)`); }
  wrong.forEach(m => { const R = C.get(m); if (R.f2 && R.f2.how === 'other') bad.push(`④ ${nm(m)} loses to a move of another defender (not the lesson)`); });
  if (cornerOnly) { const g2 = cornerFacts(E, Object.assign({}, P, { ok: goal, best: goal[0] }), false).goal; if (g2.join() !== goal.join()) bad.push('④ a fort / an edge decides a move (not the lesson: the corner)'); }
  // ③ the answers ≤ a third of the moves and at most half of the blockade moves; ≥3 blockade moves; d ≥ 1; 追17 the ringed pieces
  const d = blks.filter(m => !okS.has(m)).length, rings = new Set((P.ok || []).map(E.mFrom)), rm = all.filter(m => rings.has(E.mFrom(m)));
  if (all.length < 3 || wrong.length < 2 || (P.ok || []).length * 3 > all.length) bad.push(`③ ${(P.ok || []).length} of ${all.length} moves are right`);
  if (blks.length < 3) bad.push(`③ ${blks.length} moves onto a blockade square`);
  if ((P.ok || []).length * 2 > blks.length) bad.push(`③ ${(P.ok || []).length} of the ${blks.length} blockade moves are right`);
  if (d < 1) bad.push('③ every blockade move is right (nothing to tell a good one from a bad one)');
  if (rm.length - (P.ok || []).length < 2 || (P.ok || []).length * 3 > rm.length) bad.push(`③ 追17: ${(P.ok || []).length} of the ringed pieces' ${rm.length} moves are right`);
  return { p, me, all, C, goal, wrong, blks, d, threat, bad };
}
// what the words of a wrong move u should say (the same reading as the 3D tfBlockWhy, written again here from the rules): 'open' the
// king has a line to a corner at once, 'tuichi' a king move to two lines nobody can stop, 'taken' a king move that takes u's piece and
// then cannot be stopped, 'king' a king move to a line nobody can shut, 'other' another defender's move (or a win of the defenders at once)
function cornerWhy(E, P, u) {
  const p = E.Pos.from(P.s), F = p.G.F, q = p.clone().play(u); if (q.res) return '';
  const corner = z => { const k = z.king; return z.moves().some(x => E.mFrom(x) === k && (F[E.mTo(x)] & 2) && z.clone().play(x).res === 2); };
  if (corner(q)) return 'open';
  // (in the order of the defenders' moves, as the 3D reads it: the first win at once or トゥイチ decides; a capture of u's piece outranks a
  // plain king move)
  let how = '';
  for (const d of q.moves()) { const z = q.clone().play(d); if (z.res) { if (z.res === 2) return 'other'; continue; }
    if (!z.moves().every(r => { const y = z.clone().play(r); return !y.res && corner(y); })) continue;
    const km = E.mFrom(d) === q.king; if (km && z.kingLines().length >= 2) return 'tuichi';
    if (km && z.lastCaps.includes(E.mTo(u))) how = 'taken'; else how = how || (km ? 'king' : 'other'); }
  return how;
}
// ⑤ the shape: how far the king is from the corner the answers guard, and which blockade squares answer (e = on an edge, x = the diagonal)
function cornerSig(E, P) { const p = E.Pos.from(P.s), ok = P.ok || []; if (!ok.length) return ''; const c = BLOCK.get(E.mTo(ok[0])); if (c == null) return '?';
  const RC = i => [Math.floor(i / n), i % n], [kr, kc] = RC(p.king), [cr, cc] = RC(c);
  return 'k' + (Math.abs(kr - cr) + Math.abs(kc - cc)) + ':' + ok.map(m => { const [r, cl] = RC(E.mTo(m)); return r === 0 || r === 10 || cl === 0 || cl === 10 ? 'e' : 'x'; }).sort().join(''); }
module.exports = { cornerFacts, cornerSig, cornerWhy, BLOCK };

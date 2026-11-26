'use strict';
// (2026-11-27 第2期 担当A) tafl t_block「逃げ道をふさぐ」: the facts of one problem, read with the rules (tafl/engine.js).
// The attackers to move, the king with one open line to a corner (a ライチ). blockFacts(E, P) → { all, C (per move: on the line,
// esc1 = the defender wins at once after it, esc2 = the defender forces a win within his 2 moves, how (a king move to two lines / another
// way), opened = the move closes the line but uncovers another), goal (the moves after which the defender cannot win within 2 moves:
// the lesson's question「2手以内に逃げられないように」), wrong, blocks (the moves onto the line), d (the blocks that still lose: the
// near-misses) } and the faults (①②③④ and what the words lean on). Used by tools/lesson-verify.js tafl and by the maker
// (tafl/tools/mk-block.js).
const n = 11;
function blockFacts(E, P, cornerOnly) {
  const p = E.Pos.from(P.s), me = p.turn, F = p.G.F, all = p.moves(), bad = [], CORNER = i => !!(F[i] & 2), EDGE = i => !!(F[i] & 1);
  const RC = i => [Math.floor(i / n), i % n];
  // the defender (to move in z) wins at once: a king move to a corner, or (the king on / onto the edge) a fort — every king move, and every
  // move when the king stands on the edge
  const winNow = z => { if (z.res) return z.res === 2; const k = z.king, ms = z.moves(); for (const x of ms) if (E.mFrom(x) === k && (CORNER(E.mTo(x)) || (EDGE(E.mTo(x)) && !cornerOnly)) && z.clone().play(x).res === 2) return true;
    if (EDGE(k) && !cornerOnly) for (const x of ms) if (E.mFrom(x) !== k && z.clone().play(x).res === 2) return true; return false; };
  // the defender (to move in q) forces a win within 2 of his moves; how: the first such move (king / lines after it)
  const force2 = q => { if (q.res) return q.res === 2 ? { how: 'now' } : null; const k = q.king, kl = new Set();
    const ms = q.moves().sort((a, b) => (E.mFrom(a) === k ? 0 : 1) - (E.mFrom(b) === k ? 0 : 1));
    for (const d of ms) { const z = q.clone().play(d); if (z.res === 2) return { how: 'now', d }; if (z.res) continue;
      const lines = z.kingLines(); lines.forEach(x => kl.add(x));
      // the attacker's replies, the ones onto the king's lines first; one that stops him refutes d
      const R = z.moves(), on = new Set(); for (const t of lines) { const [r1, c1] = RC(z.king), [r2, c2] = RC(t), dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1); for (let r = r1 + dr, c = c1 + dc; r !== r2 || c !== c2; r += dr, c += dc) on.add(r * n + c); }
      R.sort((a, b) => (on.has(E.mTo(a)) ? 0 : 1) - (on.has(E.mTo(b)) ? 0 : 1));
      let forced = R.length > 0; for (const r of R) { const y = z.clone().play(r); if (y.res || !winNow(y)) { forced = false; break; } }
      if (forced) return { how: E.mFrom(d) === k ? (lines.length >= 2 ? 'tuichi' : 'king') : 'other', d, lines: lines.length }; }
    return null; };
  const line0 = p.kingLines(), path = new Set();
  line0.forEach(t => { const [r1, c1] = RC(p.king), [r2, c2] = RC(t), dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1); for (let r = r1 + dr, c = c1 + dc; r !== r2 || c !== c2; r += dr, c += dc) path.add(r * n + c); });
  const C = new Map();
  for (const m of all) { const q = p.clone().play(m), on = path.has(E.mTo(m)), R = { m, on, res: q.res, q, lines: q.res ? 0 : q.kingLines().length, caps: q.lastCaps.length };
    R.esc1 = !q.res && winNow(q); R.f2 = R.esc1 || q.res ? null : force2(q); R.esc2 = !!R.f2; R.opened = on && R.lines > 0;
    // can the defender take the blocker next (what the hint「はさまれないか」would lean on)
    // a king move to two lines that the attackers cannot stop (what「次に王が2本の逃げ道を作れちゃう」leans on); a king move to two lines
    // at all (what the praise「道を2本は作れない」denies)
    R.tu2 = false; R.tuF = false; if (!q.res && !R.esc1) for (const d of q.moves()) { if (E.mFrom(d) !== q.king) continue; const z = q.clone().play(d); if (z.res || z.kingLines().length < 2) continue; R.tu2 = true;
      if (z.moves().every(r => { const y = z.clone().play(r); return !y.res && winNow(y); })) { R.tuF = true; break; } }
    // the king takes the blocker and no attacker can shut the line again (what「ふさいだ駒を王に取られて」leans on)
    R.takenF = false; if (on && !q.res && !R.esc1 && !R.tuF) for (const d of q.moves()) { if (E.mFrom(d) !== q.king) continue; const z = q.clone().play(d); if (z.res || !z.lastCaps.includes(E.mTo(m))) continue;
      if (z.moves().every(r => { const y = z.clone().play(r); return !y.res && winNow(y); })) { R.takenF = true; break; } }
    R.blockerTaken = on && !q.res && q.moves().some(x => q.clone().play(x).lastCaps.includes(E.mTo(m)));
    C.set(m, R); }
  const goal = all.filter(m => { const R = C.get(m); return !R.res && !R.esc1 && !R.esc2; });
  const okS = new Set(P.ok || []), wrong = all.filter(m => !okS.has(m)), nm = m => E.name(p, m), blocks = all.filter(m => C.get(m).on);
  if (me !== 1) bad.push('④ not the attackers to move');
  if (line0.length !== 1) bad.push(`④ the king has ${line0.length} open lines (the lesson: one line, a ライチ)`);
  if (all.some(m => C.get(m).res)) bad.push('④ a move ends the game at once');
  (P.ok || []).forEach(m => { if (!all.includes(m)) bad.push(`① the answer ${m} is not legal`); else if (!goal.includes(m)) bad.push(`① ${nm(m)} lets the king escape within 2 (${C.get(m).esc1 ? 'at once' : C.get(m).f2.how})`); });
  goal.forEach(m => { if (!okS.has(m)) bad.push(`② ${nm(m)} stops him too but is scored wrong`); });
  if (!okS.has(P.best)) bad.push('① best is not an answer');
  goal.forEach(m => { if (!C.get(m).on) bad.push(`④ ${nm(m)} stops him without a piece on the line`); });
  if (!goal.length) bad.push('① no move stops the king');
  (P.ok || []).forEach(m => { const R = C.get(m); if (R && R.tu2) bad.push(`⑧ after ${nm(m)} the king can still open two lines (the praise says he cannot)`); });
  wrong.forEach(m => { const R = C.get(m); if (R.f2 && R.f2.how === 'other') bad.push(`④ ${nm(m)} loses to a move of another defender (not the lesson)`); });
  if (!cornerOnly) { const g2 = blockFacts(E, Object.assign({}, P, { ok: goal, best: goal[0] }), true).goal; if (g2.join() !== goal.join()) bad.push('④ a fort decides a move (not the lesson: the corner)'); }
  // ③ the answers ≤ a third of the moves and at most half of the blocks; ≥3 blocks; d ≥ 1 (a block that still loses); 追17: the ringed
  // pieces (the hint = the answers' pieces) have ≥2 wrong moves and the answers are at most a third of their moves
  const d = blocks.filter(m => !okS.has(m)).length, rings = new Set((P.ok || []).map(E.mFrom)), rm = all.filter(m => rings.has(E.mFrom(m)));
  if (all.length < 3 || wrong.length < 2 || (P.ok || []).length * 3 > all.length) bad.push(`③ ${(P.ok || []).length} of ${all.length} moves are right`);
  if (blocks.length < 3) bad.push(`③ ${blocks.length} moves onto the line`);
  if ((P.ok || []).length * 2 > blocks.length) bad.push(`③ ${(P.ok || []).length} of the ${blocks.length} blocks are right`);
  if (d < 1) bad.push('③ every block is right (nothing to tell a good block from a bad one)');
  if (rm.length - (P.ok || []).length < 2 || (P.ok || []).length * 3 > rm.length) bad.push(`③ 追17: ${(P.ok || []).length} of the ringed pieces' ${rm.length} moves are right`);
  return { p, me, all, C, goal, wrong, blocks, d, path, bad };
}
// ⑤ the shape: the line's direction and how far the king and each answer's square are from the corner it runs to, e.g. "k5:2,3"
function blockSig(E, P) { const p = E.Pos.from(P.s), t = p.kingLines()[0]; if (t == null) return ''; const RC = i => [Math.floor(i / n), i % n], [kr, kc] = RC(p.king), [tr, tc] = RC(t), D = i => { const [r, c] = RC(i); return Math.abs(r - tr) + Math.abs(c - tc); };
  return 'k' + (Math.abs(kr - tr) + Math.abs(kc - tc)) + ':' + (P.ok || []).map(m => D(E.mTo(m))).sort((a, b) => a - b).join(','); }
module.exports = { blockFacts, blockSig };

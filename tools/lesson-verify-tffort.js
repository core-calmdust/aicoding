'use strict';
// (2026-11-27 第2期 担当A) tafl t_fort「エッジフォート」: the facts of one problem, read with the rules (tafl/engine.js).
// The defenders to move, the king on an edge, one wall piece missing. fortFacts(E, P) → { all, C (per move: res / why after it, the
// attackers' replies: a capture (of a wall piece or not), a piece into the king's room, a win; force = the defender still wins at once
// whatever the attackers do (a fort / an escape next move)), goal (the moves that make the fort at once), wrong, room (the king's room
// before the move: the empty squares joined to him), d (the wrong moves that go next to the room: the near-misses) } and the faults
// (①②③④⑦⑧ for the problem; the hint's claims are checked by tools/lesson-verify.js). Used by tools/lesson-verify.js tafl and by the
// maker (tafl/tools/mk-fort.js).
const n = 11;
function roomOf(p) { const b = p.b, k = p.king, seen = new Set([k]), st = [k], walls = new Set();
  while (st.length) { const s = st.pop(); for (const q of p.nb(s)) { if (seen.has(q)) continue; if (b[q] === 0) { seen.add(q); st.push(q); } else if (b[q] === 2) walls.add(q); } }
  seen.delete(k); return { room: seen, walls }; }
function fortFacts(E, P) {
  const p = E.Pos.from(P.s), me = p.turn, F = p.G.F, all = p.moves(), bad = [], nm = m => E.name(p, m), EDGE = i => !!(F[i] & 1);
  const RC = i => [Math.floor(i / n), i % n], [kr, kc] = RC(p.king), near = new Set();
  for (let i = 0; i < n * n; i++) { const [r, c] = RC(i); if (i !== p.king && Math.max(Math.abs(r - kr), Math.abs(c - kc)) <= 2) near.add(i); }
  const goal = all.filter(m => { const q = p.clone().play(m); return q.res === 2 && q.why === 'fort'; });
  // the fort the answer makes (the first answer, else the first fort move): its room (with the king and the answer's square) and walls
  const a0 = (P.ok || []).find(m => goal.includes(m)) ?? goal[0], FR = new Set(), FW = new Set();
  if (a0 != null) { const z = p.clone().play(a0), rm = roomOf(z); rm.room.forEach(x => FR.add(x)); FR.add(z.king); FR.add(E.mTo(a0)); rm.walls.forEach(x => FW.add(x)); FW.delete(E.mTo(a0)); }
  const C = new Map();
  for (const m of all) { const q = p.clone().play(m), R = { m, res: q.res, why: q.why, king: E.mFrom(m) === p.king, to: E.mTo(m) };
    if (!q.res) { let cap = 0, capWall = false, enter = false, win = false, force = true;
      const RS = q.moves().sort((x, y) => (FR.has(E.mTo(x)) ? 0 : 1) - (FR.has(E.mTo(y)) ? 0 : 1));   // (the replies into the fort first: they end force soonest)
      for (const r of RS) { const z = q.clone().play(r); if (z.res === 1) win = true; if (z.lastCaps.length) { cap = Math.max(cap, z.lastCaps.length); if (z.lastCaps.some(x => FW.has(x) || (x === R.to && FR.has(x)))) capWall = true; }
        if (FR.has(E.mTo(r))) enter = true;
        if (force && (z.res === 1 || (!z.res && !z.moves().some(d => z.clone().play(d).res === 2)))) force = false; }
      // the king left with no move (what the hint「中で動けるスペース」leans on)
      const kq = q.clone(); kq.turn = 2; const kMove = kq.moves().some(x => E.mFrom(x) === q.king);
      Object.assign(R, { cap, capWall, enter, win, force, kMove, inRoom: FR.has(R.to) && !R.king }); }
    C.set(m, R); }
  const okS = new Set(P.ok || []), wrong = all.filter(m => !okS.has(m));
  if (me !== 2) bad.push('④ not the defenders to move');
  if (!EDGE(p.king)) bad.push('④ the king is not on an edge');
  all.forEach(m => { const R = C.get(m); if (R.res === 2 && R.why !== 'fort') bad.push(`④ ${nm(m)} wins another way (${R.why})`); if (R.res === 1) bad.push(`④ ${nm(m)} ends the game for the attackers`); });
  { const q = p.clone(); q.turn = 1; if (q.moves().some(x => q.clone().play(x).res === 1)) bad.push('④ the attackers threaten to win at once'); }
  (P.ok || []).forEach(m => { if (!all.includes(m)) bad.push(`① the answer ${m} is not legal`); else if (!goal.includes(m)) bad.push(`① ${nm(m)} does not make the fort`); else if (C.get(m).king) bad.push(`④ the answer ${nm(m)} is a king move (the lesson: the last wall piece)`); });
  goal.forEach(m => { if (!okS.has(m)) bad.push(`② ${nm(m)} makes the fort too but is scored wrong`); });
  if (P.best != null && !okS.has(P.best)) bad.push('① best is not an answer');
  if (!goal.length) bad.push('① no move makes the fort');
  // ② a wrong move after which the defenders still win at once whatever the attackers do (as good, one move slower)
  wrong.forEach(m => { const R = C.get(m); if (!R.res && R.force) bad.push(`② ${nm(m)} still wins next move whatever the attackers do`); });
  // ⑦ why each wrong move fails (what atlas/lessons3d.js tfFortWhy and the words say): 'cap' a piece of the wall can be taken next, 'enter'
  // an attacker gets into the fort (its room, the king's square or the gap), 'moved' a wall piece left the wall, 'kingoff' the king left the edge, 'king' the king moved along it (the wall still not whole), 'stuck' the man went into the room and the king cannot move,
  // 'open' the gap stays and the fort is not made (none of the above)
  wrong.forEach(m => { const R = C.get(m); R.why2 = R.res ? '' : FW.has(E.mFrom(m)) ? 'moved' : R.king && !EDGE(R.to) ? 'kingoff' : R.king ? 'king' : R.inRoom && !R.kMove ? 'stuck' : R.capWall ? 'cap' : R.enter ? 'enter' : 'open';
    // 'open' says the gap stays: every gap square is still empty after m
    if (R.why2 === 'open' && goal.some(g => R.to === E.mTo(g))) bad.push(`⑦ ${nm(m)} fills the gap, but no reason on the board says why the fort fails`); });
  // ③ ≥3 moves, the answers ≤ a third and ≥2 wrong; d ≥ 2 near-misses (wrong moves of a man to within 2 of the king); 追17: the ringed
  // pieces have ≥2 wrong moves, the answers ≤ a third of them
  const rings = new Set((P.ok || []).map(E.mFrom)), rm = all.filter(m => rings.has(E.mFrom(m))), k = (P.ok || []).length;
  const d = wrong.filter(m => near.has(E.mTo(m)) && !C.get(m).king).length;
  if (all.length < 3 || wrong.length < 2 || k * 3 > all.length) bad.push(`③ ${k} of ${all.length} moves are right`);
  if (d < 2) bad.push(`③ ${d} wrong moves next to the king`);
  if (rm.length - k < 2 || k * 3 > rm.length) bad.push(`③ 追17: ${k} of the ringed pieces' ${rm.length} moves are right`);
  const gaps = new Set(goal.map(E.mTo));
  return { p, me, all, C, goal, wrong, d, gaps, FR, FW, bad };
}
// ⑤ the shape: the edge, the room's size and the gap's place against the king, e.g. "r2:1,0" (room 2, the gap one step along, on the edge)
function fortSig(E, P) { const p = E.Pos.from(P.s), q = P.ok && P.ok.length ? p.clone().play(P.ok[0]) : p, rm = roomOf(q); const t = P.ok && P.ok.length ? E.mTo(P.ok[0]) : -1, RC = i => [Math.floor(i / n), i % n];
  const [kr, kc] = RC(p.king), [tr, tc] = RC(t), side = kr === 0 || kr === n - 1; const along = side ? Math.abs(tc - kc) : Math.abs(tr - kr), out = side ? Math.abs(tr - kr) : Math.abs(tc - kc);
  return 'r' + rm.room.size + ':' + along + ',' + out; }
module.exports = { fortFacts, fortSig, roomOf };

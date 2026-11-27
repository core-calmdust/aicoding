'use strict';
// (2026-11-27 第2期 担当A) tafl t_encircle「包囲で勝つ」: the facts of one problem, read with the rules (tafl/engine.js).
// The attackers to move, every defender shut in by a ring with one gap. encFacts(E, P) → { all, C (per move: res / why after it, the
// defenders' replies: a capture of a ring piece, a piece of theirs out through the gap, a win; force = the attackers still encircle at once
// whatever the defenders do), goal (the moves that encircle at once), wrong, FR (the defenders' room after the answer), FW (the ring:
// the attackers next to that room), gaps (the squares the goal moves go to), d (the wrong moves to within 2 of a gap: the near-misses),
// diag (the ring holds a diagonal link) } and the faults (①②③④⑦ for the problem; the words are checked by tools/lesson-verify.js).
// Used by tools/lesson-verify.js tafl and by the maker (tafl/tools/mk-enc.js).
const n = 11;
// the defenders' room: the squares their pieces reach through non-attacker squares (4 ways), and the attackers next to it
function roomOf(p) { const b = p.b, seen = new Set(), st = [], ring = new Set(); let edge = false;
  for (let i = 0; i < b.length; i++) if (b[i] === 2 || b[i] === 3) { seen.add(i); st.push(i); }
  while (st.length) { const s = st.pop(); if (p.G.F[s] & 1) edge = true; for (const q of p.nb(s)) { if (seen.has(q)) continue; if (b[q] === 1) ring.add(q); else { seen.add(q); st.push(q); } } }
  return { room: seen, ring, edge }; }
function encFacts(E, P) {
  const p = E.Pos.from(P.s), me = p.turn, F = p.G.F, all = p.moves(), bad = [], nm = m => E.name(p, m), RC = i => [Math.floor(i / n), i % n];
  const goal = all.filter(m => { const q = p.clone().play(m); return q.res === 1 && q.why === 'encircle'; });
  const a0 = (P.ok || []).find(m => goal.includes(m)) ?? goal[0];
  let FR = new Set(), FW = new Set(), diag = false;
  if (a0 != null) { const z = p.clone().play(a0), R = roomOf(z); FR = R.room; FW = R.ring;
    // a diagonal link: two ring pieces corner to corner, one of the two squares between them in the room, the other outside it
    for (const x of FW) for (const y of FW) { if (x >= y) continue; const [r1, c1] = RC(x), [r2, c2] = RC(y); if (Math.abs(r1 - r2) !== 1 || Math.abs(c1 - c2) !== 1) continue;
      const s1 = r1 * n + c2, s2 = r2 * n + c1; if (z.b[s1] !== 1 && z.b[s2] !== 1 && FR.has(s1) !== FR.has(s2)) diag = true; } }
  const gaps = new Set(goal.map(E.mTo)), near = new Set();
  gaps.forEach(g => { const [gr, gc] = RC(g); for (let i = 0; i < n * n; i++) { const [r, c] = RC(i); if (i !== g && Math.max(Math.abs(r - gr), Math.abs(c - gc)) <= 2) near.add(i); } });
  const C = new Map();
  for (const m of all) { const q = p.clone().play(m), R = { m, res: q.res, why: q.why, to: E.mTo(m), from: E.mFrom(m) };
    if (!q.res) { let capRing = false, win = false, out = false, force = true;
      for (const r of q.moves()) { const z = q.clone().play(r); if (z.res === 2) win = true;
        if (z.lastCaps.some(x => FW.has(x) || x === R.to)) capRing = true;
        if (!FR.has(E.mTo(r)) && FR.has(E.mFrom(r))) out = true;
        if (force && (z.res === 2 || (!z.res && !z.moves().some(d => { const y = z.clone().play(d); return y.res === 1; })))) force = false; }
      Object.assign(R, { capRing, win, out, force, open: roomOf(q).edge }); }
    C.set(m, R); }
  const okS = new Set(P.ok || []), wrong = all.filter(m => !okS.has(m));
  if (me !== 1) bad.push('④ not the attackers to move');
  all.forEach(m => { const R = C.get(m); if (R.res === 1 && R.why !== 'encircle') bad.push(`④ ${nm(m)} wins another way (${R.why})`); if (R.res === 2) bad.push(`④ ${nm(m)} ends the game for the defenders`); });
  { const q = p.clone(); q.turn = 2; if (q.moves().some(x => q.clone().play(x).res === 2)) bad.push('④ the defenders threaten to win at once'); }
  if (!roomOf(p).edge) bad.push('④ the defenders are shut in already');
  (P.ok || []).forEach(m => { if (!all.includes(m)) bad.push(`① the answer ${m} is not legal`); else if (!goal.includes(m)) bad.push(`① ${nm(m)} does not encircle`); else if (p.clone().play(m).lastCaps.length) bad.push(`④ the answer ${nm(m)} takes a piece (the lesson: the ring closes)`); });
  goal.forEach(m => { if (!okS.has(m)) bad.push(`② ${nm(m)} encircles too but is scored wrong`); });
  if (P.best != null && !okS.has(P.best)) bad.push('① best is not an answer');
  if (!goal.length) bad.push('① no move encircles');
  // ② a wrong move after which the attackers still encircle next move whatever the defenders do (as good, one move slower)
  wrong.forEach(m => { const R = C.get(m); if (!R.res && R.force) bad.push(`② ${nm(m)} still encircles next move whatever the defenders do`); });
  // ⑦ why each wrong move fails (what atlas/lessons3d.js tfEncWhy and the words say): 'moved' a ring piece left the ring (a new gap),
  // 'cap' the defenders can take a ring piece (or the moved one) next, 'out' a defender gets out through the gap next,
  // 'open' the gap stays (none of the above)
  wrong.forEach(m => { const R = C.get(m); R.why2 = R.res ? '' : FW.has(R.from) ? 'moved' : R.capRing ? 'cap' : R.out ? 'out' : 'open'; });
  // ③ ≥3 moves, the answers ≤ a third and ≥2 wrong; d ≥ 2 near-misses; 追17: the ringed pieces have ≥2 wrong moves, the answers ≤ a third
  const rings = new Set((P.ok || []).map(E.mFrom)), rm = all.filter(m => rings.has(E.mFrom(m))), k = (P.ok || []).length;
  const d = wrong.filter(m => near.has(E.mTo(m))).length;
  if (all.length < 3 || wrong.length < 2 || k * 3 > all.length) bad.push(`③ ${k} of ${all.length} moves are right`);
  if (d < 2) bad.push(`③ ${d} wrong moves next to the gap`);
  if (rm.length - k < 2 || k * 3 > rm.length) bad.push(`③ 追17: ${k} of the ringed pieces' ${rm.length} moves are right`);
  return { p, me, all, C, goal, wrong, d, gaps, FR, FW, diag, bad };
}
// ⑤ the shape: the room's size, the defenders' count, the gap's place against the room's centre (a symmetry-free measure)
function encSig(E, P) { const p = E.Pos.from(P.s), q = P.ok && P.ok.length ? p.clone().play(P.ok[0]) : p, R = roomOf(q); let nd = 0; for (const x of p.b) if (x === 2 || x === 3) nd++;
  return 'r' + R.room.size + ':d' + nd + ':w' + R.ring.size; }
module.exports = { encFacts, encSig, roomOf };

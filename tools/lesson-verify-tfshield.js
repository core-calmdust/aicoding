'use strict';
// (2026-11-25 第2期 担当A) tafl t_shield「シールドウォール」: the facts of one problem, read with the rules (tafl/engine.js).
// shieldFacts(E, P) → { all, caps(m), goal, best caps, the wall (the taken men on one edge line, the lid, the other end: a corner / a
// piece of yours, every front square a piece of yours), the way in (along the edge / across it), the king in the wall, d (the wrong moves
// that take one: the near-misses) } and the faults (①②③④ and what the words lean on). Used by tools/lesson-verify.js tafl and by the maker
// (tafl/tools/mk-shield.js).
const n = 11;
function shieldFacts(E, P) {
  const p = E.Pos.from(P.s), me = p.turn, F = E.geo('copenhagen').F, all = p.moves(), bad = [], RC = i => [Math.floor(i / n), i % n];
  const own = x => me === 1 ? x === 1 : x === 2 || x === 3, foe = x => me === 1 ? x === 2 || x === 3 : x === 1;
  const C = new Map(); for (const m of all) { const q = p.clone().play(m); C.set(m, { caps: q.lastCaps.slice(), res: q.res, q }); }
  const max = Math.max(0, ...all.map(m => C.get(m).caps.length)), goal = all.filter(m => max >= 2 && C.get(m).caps.length === max);
  const okS = new Set(P.ok || []), wrong = all.filter(m => !okS.has(m));
  for (const m of all) if (C.get(m).res) bad.push(`④ ${E.name(p, m)} ends the game`);
  { const q = p.clone(); q.turn = 3 - me; q.res = 0; for (const r of q.moves()) if (q.clone().play(r).res) bad.push(`④ the opponent wins at once with ${E.name(q, r)}`); }
  for (const m of all) { const q = C.get(m).q; if (!q.res) for (const r of q.moves()) if (q.clone().play(r).res) { bad.push(`⑦ after ${E.name(p, m)} the opponent wins with ${E.name(q, r)} (the words do not say it)`); break; } }
  (P.ok || []).forEach(m => { if (!all.includes(m)) bad.push(`① the answer ${m} is not legal`); else if (!goal.includes(m)) bad.push(`① ${E.name(p, m)} takes ${C.get(m).caps.length}, the most is ${max}`); });
  goal.forEach(m => { if (!okS.has(m)) bad.push(`② ${E.name(p, m)} takes ${max} too but is scored wrong`); });
  if (!okS.has(P.best)) bad.push('① best is not an answer');
  if (max < 2) bad.push(`④ no move takes two or more (${max})`);
  const second = Math.max(0, ...wrong.map(m => C.get(m).caps.length));
  if (second > 1) bad.push(`② a wrong move takes ${second} at once (still a まとめ取り)`);
  if (all.length < 3 || wrong.length < 2 || (P.ok || []).length * 3 > all.length) bad.push(`③ ${(P.ok || []).length} of ${all.length} moves are right`);
  // ④ the wall: every answer lands on the edge at one end of a line of the opponent's men along it, every man of the line with a piece
  // of yours in front, the other end a corner or a piece of yours; the taken = the line less the king
  const walls = (P.ok || []).filter(m => all.includes(m)).map(m => { const t = E.mTo(m), f = E.mFrom(m), [r, c] = RC(t);
    if (!(F[t] & 1) || (F[t] & 2)) { bad.push(`④ ${E.name(p, m)} does not land on the edge`); return null; }
    const inner = r === 0 ? [1, 0] : r === n - 1 ? [-1, 0] : c === 0 ? [0, 1] : [0, -1], alongs = inner[0] ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
    const q = p.clone(); q.b[t] = q.b[f]; q.b[f] = 0;
    for (const [ar, ac] of alongs) { let rr = r + ar, cc = c + ac; const row = []; let front = true;
      while (rr >= 0 && cc >= 0 && rr < n && cc < n && (F[rr * n + cc] & 1) && foe(q.at(rr * n + cc))) { if (!own(q.at((rr + inner[0]) * n + cc + inner[1]))) front = false; row.push(rr * n + cc); rr += ar; cc += ac; }
      if (row.length < 2 || rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
      const e = rr * n + cc, end = F[e] & 2 ? 'corner' : own(q.at(e)) ? 'piece' : ''; if (!end || !front) continue;
      const taken = row.filter(i => q.at(i) !== 3), got = C.get(m).caps;
      if (taken.length !== got.length || taken.some(i => !got.includes(i))) bad.push(`④ ${E.name(p, m)} takes ${got.length}, not the wall's ${taken.length}`);
      const dir = (f % n === t % n) === !!inner[0] ? 'across' : 'along';
      return { m, row, taken: taken.length, king: row.length - taken.length, end, dir, lid: t }; }
    bad.push(`④ ${E.name(p, m)} is not a shield wall`); return null; }).filter(Boolean);
  const W = walls[0] || null;
  // the near-misses: wrong moves that take one
  const d = wrong.filter(m => C.get(m).caps.length >= 1).length;
  if (d < 1) bad.push('③ no wrong move takes anything (only one move does anything: too easy)');
  return { p, me, all, C, max, goal, wrong, W, d, bad, sig: W ? `${W.taken}/${W.end}/${W.dir}/${W.king ? 'king' : '-'}` : '' };
}
module.exports = { shieldFacts };

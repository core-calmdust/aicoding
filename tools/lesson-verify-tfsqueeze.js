'use strict';
// (2026-11-28 第2期 担当A) tafl s_squeeze「輪を縮める」: the facts of one problem, read with the rules (tafl/engine.js).
// The attackers to move; the corners already shut (the king reaches no corner within his 2 moves) and no attacker can be taken now. The
// answer narrows the king: after it he has the fewest squares to move to (his one-move squares, counted on the board), and the move is
// safe: no defender reply takes an attacker and the king still reaches no corner within his 2 moves. squeezeFacts(E, P) → { all, C (per
// move: res, km = the king's squares after it, caps = the attackers a defender reply can take (squares), esc = the king forces a corner
// within his 2 moves, safe, why = what follows a wrong move: 'esc' / 'cap' / 'wide' = safe but the king keeps more squares), K0 (the
// king's squares now), min (the answers' km), second (the fewest km of a safe wrong move), goal, wrong, ring (the moves of the answers'
// man), d (the near-misses: wrong moves that narrow the king as much as the answer but are not safe) } and the faults (①②③④⑦ of the board).
// Used by tools/lesson-verify.js tafl and by the maker (tafl/tools/mk-squeeze.js).
const n = 11;
const kingSq = (E, z) => { const k = z.king; let c = 0; for (const m of z.moves()) if (E.mFrom(m) === k) c++; return c; };
// the defenders (to move in q) force a corner within 2 of their moves (a corner at once, a fort, or a move after which every attacker
// reply leaves the king a corner at once)
function force2(E, q) { const F = q.G.F; if (q.res) return q.res === 2;
  const winNow = z => { if (z.res) return z.res === 2; const k = z.king; for (const x of z.moves()) if (E.mFrom(x) === k && (F[E.mTo(x)] & 2)) return true; return false; };
  const k = q.king, ms = q.moves().sort((a, b) => (E.mFrom(a) === k ? 0 : 1) - (E.mFrom(b) === k ? 0 : 1));
  for (const d of ms) { const z = q.clone().play(d); if (z.res === 2) return true; if (z.res) continue;
    const R = z.moves(); if (!R.length) continue; let forced = true; for (const r of R) { const y = z.clone().play(r); if (y.res || !winNow(y)) { forced = false; break; } } if (forced) return true; }
  return false; }
const takes = (E, q) => { const s = new Set(); if (q.res) return s; for (const r of q.moves()) for (const c of q.clone().play(r).lastCaps) s.add(c); return s; };
function moveFacts(E, p, m) { const q = p.clone().play(m), R = { m, res: q.res, caps: q.lastCaps.length };
  if (q.res) { R.safe = false; R.why = 'end'; return R; }
  R.km = kingSq(E, q); const t = takes(E, q); R.taken = [...t]; R.movedTaken = t.has(E.mTo(m)); R.esc = force2(E, q);
  R.safe = !R.esc && !t.size; R.why = R.esc ? 'esc' : t.size ? 'cap' : ''; return R; }
function squeezeFacts(E, P) {
  const p = E.Pos.from(P.s), me = p.turn, all = p.moves(), bad = [], nm = m => E.name(p, m);
  const C = new Map(); for (const m of all) C.set(m, moveFacts(E, p, m));
  const q0 = p.clone(); q0.turn = 3 - me; q0.res = 0; const K0 = kingSq(E, q0);
  const safe = all.filter(m => C.get(m).safe), min = safe.length ? Math.min(...safe.map(m => C.get(m).km)) : -1;
  const goal = safe.filter(m => C.get(m).km === min), okS = new Set(P.ok || []), wrong = all.filter(m => !okS.has(m));
  const rest = safe.filter(m => C.get(m).km > min), second = rest.length ? Math.min(...rest.map(m => C.get(m).km)) : 99;
  wrong.forEach(m => { const R = C.get(m); if (R.safe) R.why = 'wide'; });
  if (me !== 1) bad.push('④ not the attackers to move');
  if (all.some(m => C.get(m).res)) bad.push('④ a move ends the game at once');
  if (p.kingLines().length) bad.push('④ the king has an open line now');
  if (force2(E, q0)) bad.push('④ the corners are not shut: the defenders reach a corner within 2 now');
  if (takes(E, q0).size) bad.push('④ the defenders can take an attacker now (not the lesson: the squeeze, not a rescue)');
  (P.ok || []).forEach(m => { if (!all.includes(m)) bad.push(`① the answer ${m} is not legal`); else if (!goal.includes(m)) { const R = C.get(m); bad.push(`① ${nm(m)} is not a safe move leaving the king the fewest squares (km ${R.km}, ${R.why || 'min ' + min})`); } });
  goal.forEach(m => { if (!okS.has(m)) bad.push(`② ${nm(m)} narrows the king as much (${min}) but is scored wrong`); });
  if (!okS.has(P.best)) bad.push('① best is not an answer');
  if (!goal.length) bad.push('① no safe move');
  // ② the gap: the next safe move leaves the king at least 2 squares more
  if (second - min < 2) bad.push(`② a safe wrong move leaves the king ${second} squares (the answer ${min}: the gap < 2)`);
  // ④ the squeeze is real (≥3 squares fewer), every answer stands on one of the king's lines (cuts his way), takes nothing, one man
  if (K0 - min < 3) bad.push(`④ the answer narrows the king only ${K0} → ${min}`);
  const RC = i => [Math.floor(i / n), i % n];
  goal.forEach(m => { const R = C.get(m), [tr, tc] = RC(E.mTo(m)), [kr, kc] = RC(p.king);
    if (R.caps) bad.push(`④ ${nm(m)} takes a piece (the lesson: narrow the king)`);
    if (tr !== kr && tc !== kc) bad.push(`④ ${nm(m)} does not stand on the king's row or column`);
    else { const dr = Math.sign(tr - kr), dc = Math.sign(tc - kc); for (let r = kr + dr, c = kc + dc; r !== tr || c !== tc; r += dr, c += dc) if (p.at(r * n + c) && r * n + c !== E.mFrom(m)) { bad.push(`④ ${nm(m)}: a piece stands between it and the king`); break; } } });
  if (new Set((P.ok || []).map(E.mFrom)).size > 1) bad.push('④ the answers move more than one man (the hint rings one)');
  // ③ the answers ≤ a third of the moves and of the ringed man's moves (追17), ≥1 near-miss (a wrong move that narrows the king as much
  // or more but is taken / lets him out: the hint「急ぎすぎて、駒をはさまれないように」)
  const rings = new Set((P.ok || []).map(E.mFrom)), ring = all.filter(m => rings.has(E.mFrom(m)));
  const d = wrong.filter(m => { const R = C.get(m); return !R.safe && R.km != null && R.km <= min; }).length;
  if (all.length < 3 || wrong.length < 2 || (P.ok || []).length * 3 > all.length) bad.push(`③ ${(P.ok || []).length} of ${all.length} moves are right`);
  if (ring.length - (P.ok || []).length < 2 || (P.ok || []).length * 3 > ring.length) bad.push(`③ 追17: ${(P.ok || []).length} of the ringed man's ${ring.length} moves are right`);
  if (d < 1) bad.push('③ no wrong move narrows the king as much (nothing to tell a safe squeeze from a hasty one)');
  return { p, me, all, C, K0, min, second, goal, wrong, ring, d, bad };
}
// what the words of a wrong move u should say: 'esc' the king reaches a corner within his 2 moves, 'cap' a defender takes an attacker next
// (moved: the moved one), 'wide' safe but the king keeps more squares; '' the answer / the game ends
function squeezeWhy(E, P, u) { const p = E.Pos.from(P.s), R = moveFacts(E, p, u); return R.res ? '' : R.esc ? 'esc' : R.taken.length ? (R.movedTaken ? 'capm' : 'cap') : 'wide'; }
// ⑤ the shape: the king's squares now → after, and how far the answer stands from the king
function squeezeSig(E, P) { const f = squeezeFacts(E, P), ok = P.ok || []; if (!ok.length) return ''; const p = f.p, t = E.mTo(ok[0]);
  return f.K0 + '>' + f.min + ':' + (Math.abs(Math.floor(t / n) - Math.floor(p.king / n)) + Math.abs(t % n - p.king % n)); }
module.exports = { squeezeFacts, squeezeWhy, squeezeSig, kingSq, moveFacts, force2 };

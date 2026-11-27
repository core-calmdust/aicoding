'use strict';
// (2026-11-28 第2期 担当A) tafl v_brandubh「ブランドゥブの王」: the facts of one problem, read with the rules (tafl/engine.js, brandubh 7×7:
// the king is taken by 2 (an attacker or an empty corner on the far side) unless he stands on or next to the throne — then all 4 sides
// must be attackers or the throne). The attackers to move, one move takes the king. brandFacts(E, P) → { p, all, goal (every move that
// takes the king), kind ('two' = against an attacker, 'corner' = against a corner, 'four' = the king next to the throne, all 4 sides),
// C (per wrong move: why = 'throne' a 2-sided sandwich that does not take him next to the throne / 'adj' next to the king, the far side
// open / 'far' not next to the king; esc = the king reaches a corner at once after it; cap = a defender takes an attacker at once
// (capm: the moved one)), ring (the moves of the answers' man), d (the near-misses: wrong moves next to the king), bad (①②③④) }.
// Used by tools/lesson-verify.js tafl and by the maker (tafl/tools/mk-brand.js).
const n = 7, TH = 24;
const RC = i => [Math.floor(i / n), i % n];
const inB = (r, c) => r >= 0 && c >= 0 && r < n && c < n;
const CORNER = i => i === 0 || i === 6 || i === 42 || i === 48;
const nb4 = i => { const [r, c] = RC(i); return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([a, b]) => inB(a, b)).map(([a, b]) => a * n + b); };
const nearThrone = k => k === TH || nb4(k).includes(TH);
// after an attacker's move m that lands next to the king: is the far side an attacker / an empty corner (the 2-sided sandwich)?
function sandwich(q, k, t) { const [r, c] = RC(k), [tr, tc] = RC(t), rr = 2 * r - tr, cc = 2 * c - tc; if (!inB(rr, cc)) return ''; const o = rr * n + cc, x = q.at(o);
  return x === 1 ? 'a' : x === 0 && CORNER(o) ? 'corner' : ''; }
function moveFacts(E, p, m) { const q = p.clone().play(m), t = E.mTo(m), k = p.king, R = { m, res: q.res, why: '' };
  if (q.res) return R;
  const adj = nb4(k).includes(t);
  R.why = adj ? (sandwich(q, k, t) && nearThrone(k) ? 'throne' : 'adj') : 'far';
  R.esc = q.moves().some(x => E.mFrom(x) === q.king && q.clone().play(x).res === 2);
  const tk = new Set(); for (const r of q.moves()) for (const c of q.clone().play(r).lastCaps) tk.add(c);
  R.cap = tk.size > 0; R.capm = tk.has(t); return R; }
function brandFacts(E, P) {
  const p = E.Pos.from(P.s), me = p.turn, all = p.moves(), bad = [], nm = m => E.name(p, m), k = p.king;
  const goal = all.filter(m => p.clone().play(m).res === 1), okS = new Set(P.ok || []), wrong = all.filter(m => !okS.has(m));
  const C = new Map(); for (const m of wrong) C.set(m, moveFacts(E, p, m));
  if (p.G.n !== n || P.s.v !== 'brandubh') bad.push('④ not the brandubh board');
  if (me !== 1) bad.push('④ not the attackers to move');
  if (k < 0 || k === TH) bad.push('④ the king is on the throne');
  (P.ok || []).forEach(m => { if (!all.includes(m)) bad.push(`① the answer ${m} is not legal`); else if (!goal.includes(m)) bad.push(`① ${nm(m)} does not take the king`); });
  goal.forEach(m => { if (!okS.has(m)) bad.push(`② ${nm(m)} takes the king too but is scored wrong`); });
  if (!okS.has(P.best)) bad.push('① best is not an answer');
  if (!goal.length) bad.push('① no move takes the king');
  // the kind: how the answers take him (all answers the same way)
  const kindOf = m => { if (nearThrone(k)) return 'four'; const q = p.clone().play(m); return sandwich(q, k, E.mTo(m)) === 'corner' ? 'corner' : 'two'; };
  const kinds = new Set(goal.map(kindOf)), kind = kinds.size === 1 ? [...kinds][0] : '';
  if (kinds.size > 1) bad.push(`④ the answers take the king in different ways (${[...kinds].join('/')})`);
  // the defenders do not win at once now — except the king next to a corner (he can always step in: take him first)
  { const q0 = p.clone(); q0.turn = 2; q0.res = 0; if (kind !== 'corner' && q0.moves().some(x => q0.clone().play(x).res === 2)) bad.push('④ the defenders win at once now'); }
  if (kind === 'four') bad.push('④ the king next to the throne (this lesson: 2 men, or a man and a corner)');
  if (new Set((P.ok || []).map(E.mFrom)).size > 1) bad.push('④ the answers move more than one man (the hint rings one)');
  // ③ the answers ≤ a third of the moves and of the ringed man's moves (追17), a near-miss (a wrong move next to the king)
  const rings = new Set((P.ok || []).map(E.mFrom)), ring = all.filter(m => rings.has(E.mFrom(m))), no = (P.ok || []).length;
  const d = wrong.filter(m => C.get(m).why !== 'far').length;
  if (all.length < 10 || wrong.length < 2 || no * 3 > all.length) bad.push(`③ ${no} of ${all.length} moves are right`);
  if (ring.length - no < 2 || no * 3 > ring.length) bad.push(`③ 追17: ${no} of the ringed man's ${ring.length} moves are right`);
  if (d < 1) bad.push('③ no wrong move lands next to the king');
  return { p, me, all, goal, kind, C, wrong, ring, d, bad };
}
// ⑤ the 8 symmetries of the 7×7 board: the fewest squares that differ
const SYM = [(r, c) => [r, c], (r, c) => [r, 6 - c], (r, c) => [6 - r, c], (r, c) => [6 - r, 6 - c], (r, c) => [c, r], (r, c) => [c, 6 - r], (r, c) => [6 - c, r], (r, c) => [6 - c, 6 - r]];
const dist7 = (a, b) => { if (a.length !== 49 || b.length !== 49) return 99; let best = 99; for (const S of SYM) { let d = 0; for (let i = 0; i < 49 && d < best; i++) { const [r, c] = S((i / 7) | 0, i % 7); if (a[i] !== b[r * 7 + c]) d++; } best = Math.min(best, d); } return best; };
module.exports = { brandFacts, moveFacts, dist7, nearThrone, CORNER, nb4 };

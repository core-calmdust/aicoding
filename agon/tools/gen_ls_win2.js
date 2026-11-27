#!/usr/bin/env node
// (2026-11-27 担当D) agon lesson s_win2 (2手で勝つ): candidates and the count behind the log of 2026-11-27 23:55.
// A win in two (engine.js duelMin = 2) needs need() ≤ 2; with 7 pieces the only shape with free moves is the queen on the throne,
// 4 guards round it and 2 guards one step out (ring 2). `--count` lists, over every such shape with no enemy piece, the legal
// moves and the fills (a ring-2 guard stepping into an empty cell round the throne): a position with 10 legal moves has 2 fills,
// so with one answer (②) there is 1 near miss at most and d = 9 + 2 × 1 = 11 in every problem (⑥ cannot rise).
// Without --count: random positions of that shape (enemy pieces round the empty cells and the outside guards) that are a win in
// two with one first move (duelGood), every wrong move either slow (two cells still empty) or a fill refuted by a capture of the
// guard left outside, printed as JSON lines { spec, ans, L, near, d }. Usage: node agon/tools/gen_ls_win2.js [--count] [seconds] [minLegal]
'use strict';
const E = require('../engine.js'); E.setRule('std');
const N = 91, byRing = r => [...Array(N).keys()].filter(i => E.RING[i] === r), R2 = byRing(2);
const shapes = () => { const out = []; for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) {
  const s = Array(N).fill('.'); s[E.CENTER] = 'W'; E.INNER.forEach((c, k) => { if (k !== a && k !== b) s[c] = 'w'; }); s[R2[i]] = 'w'; s[R2[j]] = 'w'; s[0] = 'B'; out.push(s); } return out; };
const fills = p => p.moves().filter(m => m !== E.PASS && E.RING[E.mFrom(m)] === 2 && E.RING[E.mTo(m)] === 1);
if (process.argv.includes('--count')) {
  const H = {}; for (const s of shapes()) { const p = E.Pos.from({ b: s.join(''), side: 1, n: 40 }); const k = `legal ${p.moves().length} / fills ${fills(p).length}`; H[k] = (H[k] || 0) + 1; }
  console.log(H); process.exit(0);
}
const args = process.argv.slice(2).filter(x => !x.startsWith('--')), secs = +args[0] || 60, minL = +args[1] || 10;
const wins = (z, me) => z.phase() === 'move' && z.moves().some(x => { const j = E.judge(z.clone().play(x)); return j.over && j.winner === me; });
function kind(spec, m) {   // ok / slow / cap (the guard left outside sandwiched) / other
  const p = E.Pos.from(spec), me = p.side + 1, q = p.clone().play(m);
  if (E.judge(q).over) return 'other';
  if (E.INNER.filter(i => !q.at(i)).length >= 2) return 'slow';
  let k = 'ok';
  for (const r of q.moves()) { const z = q.clone().play(r), j = E.judge(z); if (j.over ? j.winner === me : wins(z, me)) continue; if (!q.capsOf(r).some(v => q.owner(v) === me && E.RING[v] === 2)) return 'other'; k = 'cap'; }
  return k;
}
const sand = b => { const own = c => c === '.' ? 0 : 'wW'.includes(c) ? 1 : 2; for (let i = 0; i < N; i++) { const o = own(b[i]); if (!o) continue; for (let d = 0; d < 3; d++) { const a = E.NB[i][d], c = E.NB[i][d + 3]; if (a >= 0 && c >= 0 && own(b[a]) === 3 - o && own(b[c]) === 3 - o) return false; } } return true; };
const CF = shapes().filter(s => E.Pos.from({ b: s.join(''), side: 1, n: 40 }).moves().length >= minL), pick = a => a[Math.floor(Math.random() * a.length)];
const T0 = Date.now(), seen = new Set();
while (Date.now() - T0 < secs * 1000) {
  const b = pick(CF).slice(); b[0] = '.';
  const holes = E.INNER.filter(c => b[c] === '.'), mine2 = [...Array(N).keys()].filter(i => b[i] === 'w' && E.RING[i] === 2);
  const nearC = [...new Set([...holes, ...mine2].flatMap(c => E.NB[c]))].filter(i => i >= 0 && b[i] === '.' && E.RING[i] >= 2);
  b[pick([...byRing(2), ...byRing(3), ...byRing(4)].filter(i => b[i] === '.'))] = 'B';
  let eg = 6; for (let k = 1 + Math.floor(Math.random() * 3); k > 0 && eg > 0; k--) { const c = pick(nearC.filter(x => b[x] === '.')); if (c == null) break; b[c] = 'b'; eg--; }
  while (eg > 0) { const c = pick(byRing(pick([2, 2, 2, 3, 3, 3, 4, 5])).filter(i => b[i] === '.')); b[c] = 'b'; eg--; }
  const bs = b.join(''); if (seen.has(bs) || !sand(bs)) continue; seen.add(bs);
  const spec = { b: bs, side: 1, n: 40 }, p = E.Pos.from(spec), L = p.moves();
  if (p.phase() !== 'move' || E.judge(p).over || L.length < minL) continue;
  const g = E.duelGood(spec, [], 2, null, 2e5); if (!g || g.length !== 1) continue;
  const K = L.map(m => kind(spec, m)); if (K.includes('other') || K.filter(k => k === 'ok').length !== 1 || K[L.indexOf(g[0])] !== 'ok') continue;
  const near = K.filter(k => k === 'cap').length; if (!near) continue;
  console.log(JSON.stringify({ spec, ans: E.name(p, g[0]), L: L.length, near, d: L.length - 1 + 2 * near }));
}

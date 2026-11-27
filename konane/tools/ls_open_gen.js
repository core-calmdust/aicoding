#!/usr/bin/env node
// (2026-11-27 担当C) Kōnane lesson b_open (最初の取り除きと最初の跳び): new problems for the 2D and the 3D (konane/lessons.json).
// The old five asked for an opening removal, and every removal the rules allow was right (black 4, white 2 or 4, all equal by the
// board's symmetry), so no removal can be a problem to choose. The lesson now shows the board right after the two removals and asks
// for the first jump that leaves the opponent the fewest jumps (the hole is small, and which way you jump into it changes the count).
// Every 8×8 position of the first two jumps (all removals, all first jumps; the board's 8 symmetries and the colours as they are)
// is counted; kept when the fewest-jumps move is unique. The classes (one per symmetry) are exactly five:
//   C  corner hole, White's first jump (3 legal)      P_a / P_b centre hole, Black's first jump (3 legal, the white removal beside /
//   inside the centre four)      X1 / X2 the same, White's first jump after the Black jump that leaves a unique answer (7 legal).
// The criteria relaxed for this lesson only (the user, 2026-11-27: 「こういう場合は問題が成立する範囲内で基準を緩めて良い」): ③ 3 legal
// moves and 2 wrong ones are enough in the first two positions; ⑤ the five positions are all within a few squares of each other
// and of the full board (the opening has no other positions) — each is a different class, never the same under the symmetries.
// Sorted easy → hard: d = wrong moves + 2 × near misses (a wrong move leaving one jump more than the answer).
// Usage: node konane/tools/ls_open_gen.js [--write]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const E = require(path.join(ROOT, 'konane/engine.js'));
E.setRule('s8');
const N = 8, SYM = []; for (let t = 0; t < 8; t++) SYM.push((r, c) => { let a = r, b = c; if (t & 4) [a, b] = [b, a]; if (t & 1) a = N - 1 - a; if (t & 2) b = N - 1 - b; return a * N + b; });
const canon = (b, side) => SYM.map(f => { const x = Array(64).fill('.'); for (let i = 0; i < 64; i++) x[f((i / 8) | 0, i % 8)] = b[i]; return x.join(''); }).sort()[0] + side;
const C = new Map();   // every position, keyed by the board itself (all orientations kept)
function walk(p) {
  const L = p.moves();
  if (p.ply >= 2) {
    const me = p.turn, js = L.map(m => p.clone().play(m).mobility(3 - me)), j0 = Math.min(...js), k = js.filter(x => x === j0).length;
    if (k === 1 && L.length >= 3) {
      const s = p.spec();
      if (!C.has(s.b + s.side)) C.set(s.b + s.side, { s: { b: s.b, side: s.side, n: p.ply }, ok: [L[js.indexOf(j0)]], best: L[js.indexOf(j0)], L: L.length,
        d: (L.length - 1) + 2 * js.filter(x => x === j0 + 1).length, js });
    }
  }
  if (p.ply < 3) for (const m of L) walk(p.clone().play(m));
}
walk(new E.Pos());
const want = { 'C': 0, 'Pa': 0, 'Pb': 0, 'X1': 0, 'X2': 0 };
const list = [...C.values()].sort((a, b) => a.d - b.d || a.s.n - b.s.n || a.s.b.localeCompare(b.s.b));
// one of each class, in the orientations that keep the five boards farthest apart (every class has 2–4 orientations the opening
// reaches; the five are compared square by square — tools/lesson-quality.js counts boards 3 squares apart or less as the same)
const groups = new Map(); for (const P of list) { const k = canon(P.s.b, P.s.side); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(P); }
const G = [...groups.values()].sort((a, b) => a[0].d - b[0].d || a[0].s.n - b[0].s.n), diff = (a, b) => { let n = 0; for (let i = 0; i < 64; i++) if (a[i] !== b[i]) n++; return n; };
let pick = null, bestMin = -1, bestSum = -1;
(function rec(i, cur) {
  if (i === G.length) { let mn = 99, sm = 0; for (let a = 0; a < cur.length; a++) for (let b = a + 1; b < cur.length; b++) { const d = diff(cur[a].s.b, cur[b].s.b); mn = Math.min(mn, d); sm += d; }
    if (mn > bestMin || (mn === bestMin && sm > bestSum)) { bestMin = mn; bestSum = sm; pick = cur.slice(); } return; }
  for (const P of G[i]) { cur.push(P); rec(i + 1, cur); cur.pop(); }
})(0, []);
console.log('closest two boards:', bestMin, 'squares apart');
for (const P of pick) console.log(P.d, P.s.n, P.s.side, P.L, P.js.join(','), E.name(E.Pos.from(P.s), P.best), P.s.b);
console.log(pick.length, 'classes');
if (process.argv.includes('--write')) {
  const f = path.join(ROOT, 'konane/lessons.json'), LS = JSON.parse(fs.readFileSync(f, 'utf8')), st = LS.steps.find(s => s.id === 'b_open');
  st.problems = pick.map(P => ({ s: P.s, ok: P.ok, best: P.best }));
  fs.writeFileSync(f, JSON.stringify(LS));
  console.log('wrote', st.problems.length);
}

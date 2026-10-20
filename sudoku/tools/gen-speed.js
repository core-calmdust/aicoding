#!/usr/bin/env node
/* すぴーど数独 — builds the curated course collection (v2).
   入門 5 courses × 10 stages (standard rules)
   初級 5 × 10 (one special rule each: bug / mosaic / spin / spot / fruit)
   中級 3 × 10 (one special rule each: shuffle / ghost / ice)
   上級 5 × 20 (2–4 special rules at once)
   達人 5 × 20 (5 to all 8 special rules at once)
   Each stage is "solve K puzzles within T seconds"; the hurdle rises stage by stage.
   usage: node sudoku/tools/gen-speed.js  →  sudoku/speed_puzzles.json */
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../speed-engine.js');

const A4 = ['bug', 'mosaic', 'spin', 'spot'], B4 = ['fruit', 'shuffle', 'ghost', 'ice'], ALLG = A4.concat(B4);
// n / d: i18n keys of the course name and description
const CATS = [
  { tier: 0, kind: 'std', nk: 'sc.n.0', dk: 'sc.d.0', lv: [1, 1], k: [1, 4], sl: [3.0, 2.0] },
  { tier: 0, kind: 'std', nk: 'sc.n.1', dk: 'sc.d.1', lv: [1, 2], k: [2, 5], sl: [2.5, 1.85] },
  { tier: 0, kind: 'std', nk: 'sc.n.2', dk: 'sc.d.2', lv: [1, 2], k: [3, 7], sl: [2.3, 1.75] },
  { tier: 0, kind: 'std', nk: 'sc.n.6', dk: 'sc.d.6', lv: [2, 3], k: [3, 7], sl: [2.2, 1.65] },
  { tier: 0, kind: 'std', nk: 'sc.n.9', dk: 'sc.d.9', lv: [3, 4], k: [2, 6], sl: [2.1, 1.6] },
  ...['bug', 'mosaic', 'spin', 'spot', 'fruit'].map((g, i) => ({ tier: 1, kind: 'g', g, nk: 'sc.n.' + (10 + i), dk: 'sc.d.' + (10 + i), lv: [1, 3], k: [2, 5], sl: [2.4, 1.7], str: [1, 3] })),
  ...['shuffle', 'ghost', 'ice'].map((g, i) => ({ tier: 2, kind: 'g', g, nk: 'sc.n.' + (15 + i), dk: 'sc.d.' + (15 + i), lv: [1, 3], k: [2, 5], sl: [2.4, 1.7], str: [1, 3] })),
  ...[['u0', A4], ['u1', B4], ['u2', ['mosaic', 'spot', 'ghost', 'spin']], ['u3', ['bug', 'ice', 'shuffle', 'fruit']], ['u4', ALLG]].map(([id, pool]) =>
    ({ tier: 3, kind: 'combo', pool, nk: 'sk.n.' + id, dk: 'sk.d.' + id, n: 20, lv: [1, 3], k: [2, 6], sl: [2.2, 1.6], str: [1, 2], gn: [2, 4] })),
  ...[['m0', [5, 6], [1, 2]], ['m1', [5, 7], [1, 2]], ['m2', [6, 8], [1, 3]], ['m3', [5, 8], [1, 2], [3, 8]], ['m4', [6, 8], [2, 3]]].map(([id, gn, str, k]) =>
    ({ tier: 4, kind: 'combo', pool: ALLG, nk: 'sk.n.' + id, dk: 'sk.d.' + id, n: 20, lv: [1, 3], k: k || [2, 5], sl: [2.1, 1.55], str, gn })),
];

const lerp = (a, b, x) => a + (b - a) * x;
const used = new Set();
function puzzle(rng, lv) {
  for (let t = 0; t < 400; t++) { const P = E.make(rng, lv), k = E.enc(P.p); if (!used.has(k)) { used.add(k); return P; } }
  throw new Error('ran out of puzzles at lv ' + lv);
}
const out = { v: 2, made: new Date().toISOString().slice(0, 10), cats: [] };
CATS.forEach((C, ci) => {
  const N = C.n || 10;
  const cat = { tier: C.tier, kind: C.kind, g: C.g || null, pool: C.pool || null, nk: C.nk, dk: C.dk, st: [] };
  for (let pi = 0; pi < N; pi++) {
    const x = N > 1 ? pi / (N - 1) : 0, rng = E.mulberry32(E.hashStr('speed2:' + C.nk + ':' + pi));
    const K = Math.max(1, Math.round(lerp(C.k[0], C.k[1], x)));
    const base = lerp(C.lv[0], C.lv[1], x);
    const str = C.str ? Math.min(3, Math.max(1, Math.round(lerp(C.str[0], C.str[1], x)))) : 0;
    const ps = [], gs = [];
    for (let j = 0; j < K; j++) {
      const lv = Math.min(4, Math.max(1, Math.round(base + (K > 1 ? (j / (K - 1) - .5) * .6 : 0))));
      ps.push(puzzle(rng, lv));
      let g = '';
      if (C.kind === 'g') g = (pi === 0 && j % 2 === 0) ? '' : C.g + str;                 // stage 1 eases you in
      else if (C.kind === 'combo') {
        const lo = C.gn[0], hi = Math.min(C.gn[1], C.pool.length);
        const want = Math.round(lerp(lo, hi, x) + (rng() - .5) * .9);
        const n = Math.min(hi, Math.max(lo, want));
        const pick = E.shuffle(C.pool.slice(), rng).slice(0, n);
        pick.sort((a, b) => ALLG.indexOf(a) - ALLG.indexOf(b));
        g = pick.map(id => id + Math.max(1, Math.min(3, str - (rng() < .3 ? 1 : 0)))).join('+');
      }
      gs.push(g);
    }
    const exp = ps.reduce((a, P, j) => a + E.expect(P.lv, gs[j]), 0);
    const T = Math.max(15, Math.ceil(exp * lerp(C.sl[0], C.sl[1], x) / 5) * 5);
    cat.st.push({ k: K, t: T, p: ps.map(P => E.enc(P.p)), lv: ps.map(P => P.lv), g: gs });
  }
  out.cats.push(cat);
});
const file = path.join(__dirname, '..', 'speed_puzzles.json');
fs.writeFileSync(file, JSON.stringify(out));
const ns = out.cats.reduce((a, c) => a + c.st.length, 0), n = out.cats.reduce((a, c) => a + c.st.reduce((b, s) => b + s.k, 0), 0);
console.log('wrote', file, (fs.statSync(file).size / 1024).toFixed(1) + 'KB', out.cats.length, 'courses,', ns, 'stages,', n, 'puzzles');
out.cats.forEach((c, i) => console.log(String(i).padStart(2), c.tier, c.nk.padEnd(8), c.st.map(s => s.k + '/' + s.t + (s.g.some(Boolean) ? '·' + Math.max(...s.g.map(g => g ? g.split('+').length : 0)) : '')).join(' ')));

#!/usr/bin/env node
/* すぴーど数独 — builds the curated collection (25 categories × 20 stages = 500 stages).
   Each stage is "solve K puzzles within T seconds"; the hurdle rises stage by stage.
   usage: node sudoku/tools/gen-speed.js  →  sudoku/speed_puzzles.json */
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../speed-engine.js');

const STD = { kind: 'std' }, G = id => ({ kind: 'g', g: id }), MIX = pool => ({ kind: 'mix', pool }), DBL = { kind: 'dbl' };
const A4 = ['bug', 'mosaic', 'spin', 'spot'], B4 = ['fruit', 'shuffle', 'ghost', 'ice'], ALLG = A4.concat(B4);
const PAIRS = [['spin', 'mosaic'], ['spot', 'bug'], ['fruit', 'shuffle'], ['ghost', 'spin'], ['ice', 'bug'], ['mosaic', 'fruit'], ['ghost', 'shuffle'], ['ice', 'mosaic'], ['spin', 'bug'], ['spot', 'fruit']];
// tier: 0 入門 1 初級 2 中級 3 上級 4 達人 — beginner tiers are standard puzzles only
const CATS = [
  { tier: 0, ...STD, lv: [1, 1], k: [1, 4], sl: [3.2, 2.2] },
  { tier: 0, ...STD, lv: [1, 1], k: [2, 5], sl: [2.6, 1.9] },
  { tier: 0, ...STD, lv: [1, 2], k: [2, 5], sl: [2.5, 1.9] },
  { tier: 0, ...STD, lv: [1, 2], k: [3, 7], sl: [2.3, 1.8] },
  { tier: 0, ...STD, lv: [2, 2], k: [3, 6], sl: [2.3, 1.8] },
  { tier: 1, ...STD, lv: [2, 2], k: [4, 8], sl: [2.1, 1.7] },
  { tier: 1, ...STD, lv: [2, 3], k: [3, 6], sl: [2.2, 1.7] },
  { tier: 1, ...STD, lv: [3, 3], k: [3, 6], sl: [2.1, 1.65] },
  { tier: 1, ...STD, lv: [1, 2], k: [6, 14], sl: [1.9, 1.55] },
  { tier: 1, ...STD, lv: [3, 4], k: [2, 6], sl: [2.1, 1.6] },
  ...['bug', 'mosaic', 'spin', 'spot', 'fruit'].map(g => ({ tier: 2, ...G(g), lv: [1, 3], k: [2, 6], sl: [2.4, 1.7], str: [1, 3] })),
  ...['shuffle', 'ghost', 'ice'].map(g => ({ tier: 3, ...G(g), lv: [1, 3], k: [2, 6], sl: [2.3, 1.7], str: [1, 3] })),
  { tier: 3, ...MIX(A4), lv: [2, 3], k: [3, 8], sl: [2.0, 1.6], str: [1, 3], pm: [.5, .75] },
  { tier: 3, ...MIX(B4), lv: [2, 3], k: [3, 8], sl: [2.0, 1.6], str: [1, 3], pm: [.5, .75] },
  { tier: 4, ...MIX(ALLG), lv: [2, 4], k: [4, 9], sl: [1.9, 1.5], str: [2, 3], pm: [.6, .85] },
  { tier: 4, ...DBL, lv: [2, 3], k: [2, 6], sl: [2.0, 1.6], str: [1, 2] },
  { tier: 4, ...MIX(ALLG), lv: [4, 4], k: [3, 7], sl: [1.9, 1.5], str: [1, 3], pm: [.5, .7] },
  { tier: 4, ...MIX(ALLG), lv: [2, 3], k: [8, 20], sl: [1.8, 1.5], str: [1, 3], pm: [.5, .7] },
  { tier: 4, kind: 'master', lv: [3, 4], k: [5, 10], sl: [1.7, 1.45], str: [2, 3], pm: [.7, .9] },
];

const lerp = (a, b, x) => a + (b - a) * x;
const used = new Set();
function puzzle(rng, lv) {
  for (let t = 0; t < 200; t++) { const P = E.make(rng, lv), k = E.enc(P.p); if (!used.has(k)) { used.add(k); return P; } }
  throw new Error('ran out of puzzles at lv ' + lv);
}
const out = { v: 1, made: new Date().toISOString().slice(0, 10), cats: [] };
CATS.forEach((C, ci) => {
  const cat = { tier: C.tier, kind: C.kind, g: C.g || null, pool: C.pool || (C.kind === 'dbl' ? 'pairs' : C.kind === 'master' ? 'all' : null), st: [] };
  for (let pi = 0; pi < 20; pi++) {
    const x = pi / 19, rng = E.mulberry32(E.hashStr('speed-col:' + ci + ':' + pi));
    const K = Math.max(1, Math.round(lerp(C.k[0], C.k[1], x)));
    const base = lerp(C.lv[0], C.lv[1], x);
    const str = C.str ? Math.min(3, Math.max(1, Math.round(lerp(C.str[0], C.str[1], x * 1.05)))) : 0;
    const pm = C.pm ? lerp(C.pm[0], C.pm[1], x) : 0;
    const ps = [], gs = [];
    let prev = '';
    for (let j = 0; j < K; j++) {
      const lv = Math.min(4, Math.max(1, Math.round(base + (K > 1 ? (j / (K - 1) - .5) * .6 : 0))));
      ps.push(puzzle(rng, lv));
      let g = '';
      if (C.kind === 'g') g = (pi < 2 && j % 2 === 0) ? '' : C.g + str;
      else if (C.kind === 'mix' || C.kind === 'master') {
        if (rng() < pm || j === K - 1 && !gs.some(Boolean)) {
          if (C.kind === 'master' && rng() < .35) { const pr = PAIRS[(rng() * PAIRS.length) | 0]; g = pr[0] + str + '+' + pr[1] + Math.max(1, str - 1); }
          else { let id; do id = C.pool ? C.pool[(rng() * C.pool.length) | 0] : ALLG[(rng() * 8) | 0]; while (C.pool && C.pool.length > 1 && prev.startsWith(id)); g = id + str; }
        }
      } else if (C.kind === 'dbl') {
        const pr = PAIRS[(pi * 3 + j) % PAIRS.length]; g = pr[0] + str + '+' + pr[1] + str;
      }
      gs.push(g); prev = g;
    }
    const exp = ps.reduce((a, P, j) => a + E.expect(P.lv, gs[j]), 0);
    const T = Math.max(15, Math.ceil(exp * lerp(C.sl[0], C.sl[1], x) / 5) * 5);
    cat.st.push({ k: K, t: T, p: ps.map(P => E.enc(P.p)), lv: ps.map(P => P.lv), g: gs });
  }
  out.cats.push(cat);
});
const file = path.join(__dirname, '..', 'speed_puzzles.json');
fs.writeFileSync(file, JSON.stringify(out));
const n = out.cats.reduce((a, c) => a + c.st.reduce((b, s) => b + s.k, 0), 0);
console.log('wrote', file, (fs.statSync(file).size / 1024).toFixed(1) + 'KB', out.cats.length, 'cats,', n, 'puzzles');
out.cats.forEach((c, i) => console.log(String(i).padStart(2), c.tier, (c.g || c.pool || c.kind).toString().padEnd(10), c.st.map(s => s.k + '/' + s.t).join(' ')));

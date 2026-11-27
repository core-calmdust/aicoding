#!/usr/bin/env node
// (2026-11-28 担当D) agon lesson s_tempo (どれを捕まえる？): candidates. Random middle-game positions (each side a queen and six
// guards, nothing left between two enemy pieces) where the side to move has 2 captures or more, each taking one guard (no queen,
// no double), the guards on different rings with one deepest (ring ≤ 2) taken by one move only — the answer: a guard sent back
// from the deepest ring loses the most rings (a relocated guard goes to the edge, ring 5). The engine (analyze, 1 s) must rank
// the answer first among every legal move (the board fact and the search agree). No move ends the game.
// Printed as JSON lines { spec, ans, ring, L, near, d } (near = the other captures, d = wrong + 2 × near).
// Usage: node agon/tools/gen_ls_tempo.js [seconds] [ms]
'use strict';
const E = require('../engine.js'); E.setRule('std');
const N = 91, args = process.argv.slice(2), secs = +args[0] || 60, ms = +args[1] || 1000;
const byRing = r => [...Array(N).keys()].filter(i => E.RING[i] === r);
const pick = a => a[Math.floor(Math.random() * a.length)];
const sand = b => { const own = c => c === '.' ? 0 : 'wW'.includes(c) ? 1 : 2; for (let i = 0; i < N; i++) { const o = own(b[i]); if (!o) continue; for (let d = 0; d < 3; d++) { const a = E.NB[i][d], c = E.NB[i][d + 3]; if (a >= 0 && c >= 0 && own(b[a]) === 3 - o && own(b[c]) === 3 - o) return false; } } return true; };
const T0 = Date.now(), seen = new Set();
while (Date.now() - T0 < secs * 1000) {
  const b = Array(N).fill('.');
  const put = (ch, rings) => { for (;;) { const c = pick(byRing(pick(rings))); if (b[c] === '.' && c !== E.CENTER) { b[c] = ch; return; } } };
  put('W', [2, 3, 3, 4]); put('B', [2, 3, 3, 4]);
  for (let k = 0; k < 6; k++) { put('w', [1, 2, 2, 3, 3, 4, 4, 5]); put('b', [1, 1, 2, 2, 3, 3, 4, 5]); }
  const bs = b.join(''); if (seen.has(bs) || !sand(bs)) continue; seen.add(bs);
  const spec = { b: bs, side: 1, n: 40 }, p = E.Pos.from(spec);
  if (p.phase() !== 'move' || E.judge(p).over) continue;
  const L = p.moves(); if (L.length < 10) continue;
  const cs = L.filter(m => p.capsOf(m).length);
  if (cs.length < 2 || cs.some(m => p.capsOf(m).length !== 1 || p.isQueen(p.capsOf(m)[0]))) continue;
  const rg = m => E.RING[p.capsOf(m)[0]], min = Math.min(...cs.map(rg)), deep = cs.filter(m => rg(m) === min);
  if (deep.length !== 1 || min > 2) continue;
  if (L.some(m => E.judge(p.clone().play(m)).over)) continue;
  const A = E.analyze(spec, [], ms), top = A.list[0];
  if (!top || top.m !== deep[0] || (A.list[1] && A.list[1].v >= top.v)) continue;
  const near = cs.length - 1;
  console.log(JSON.stringify({ spec, ans: E.name(p, deep[0]), ring: min, outer: cs.filter(m => m !== deep[0]).map(rg), L: L.length, near, d: L.length - 1 + 2 * near, v: [top.v, A.list[1] && A.list[1].v], depth: A.depth }));
}

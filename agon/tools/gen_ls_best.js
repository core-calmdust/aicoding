#!/usr/bin/env node
// (2026-11-28 担当F) agon lesson s_best (隙を作らない一手): candidates. Random middle-game positions (each side a queen and six
// guards, nothing left between two enemy pieces) where the side to move has no capture, the enemy (the turn passed) has no
// capture either, and exactly one legal move leaves the enemy without a capture on its next move — every other move lets the
// enemy sandwich a piece (the moved piece itself: 'trap', or another one it uncovered: 'open'). The engine (analyze, ms) must
// rank that move first among every legal move (the board fact and the search agree). No move ends the game.
// Printed as JSON lines { spec, ans, L, trap, open, d } (d = wrong + 2 × open — the uncovering mistakes are the subtle ones).
// Usage: node agon/tools/gen_ls_best.js [seconds] [ms]
'use strict';
const E = require('../engine.js'); E.setRule('std');
const N = 91, args = process.argv.slice(2), secs = +args[0] || 60, ms = +args[1] || 800;
const byRing = r => [...Array(N).keys()].filter(i => E.RING[i] === r);
const pick = a => a[Math.floor(Math.random() * a.length)];
const sand = b => { const own = c => c === '.' ? 0 : 'wW'.includes(c) ? 1 : 2; for (let i = 0; i < N; i++) { const o = own(b[i]); if (!o) continue; for (let d = 0; d < 3; d++) { const a = E.NB[i][d], c = E.NB[i][d + 3]; if (a >= 0 && c >= 0 && own(b[a]) === 3 - o && own(b[c]) === 3 - o) return false; } } return true; };
const T0 = Date.now(), seen = new Set(); let tried = 0;
while (Date.now() - T0 < secs * 1000) {
  const b = Array(N).fill('.');
  const put = (ch, rings) => { for (;;) { const c = pick(byRing(pick(rings))); if (b[c] === '.' && c !== E.CENTER) { b[c] = ch; return; } } };
  put('W', [2, 3, 3, 4]); put('B', [2, 3, 3, 4]);
  for (let k = 0; k < 6; k++) { put('w', [1, 2, 2, 3, 3, 4, 4, 5]); put('b', [1, 2, 2, 3, 3, 4, 4, 5]); }
  const bs = b.join(''); if (seen.has(bs) || !sand(bs)) continue; seen.add(bs); tried++;
  const spec = { b: bs, side: 1, n: 40 }, p = E.Pos.from(spec);
  if (p.phase() !== 'move' || E.judge(p).over) continue;
  const L = p.moves(); if (L.length < 10 || L.includes(E.PASS)) continue;
  if (L.some(m => p.capsOf(m).length)) continue;
  const ps = E.Pos.from({ b: bs, side: 2, n: 40 }); if (ps.moves().some(r => ps.capsOf(r).length)) continue;
  const K = L.map(m => { const q = p.clone().play(m), R = q.moves().filter(r => q.capsOf(r).length); if (!R.length) return 'ok'; return R.some(r => q.capsOf(r).includes(E.mTo(m))) ? 'trap' : 'open'; });
  const ok = L.filter((m, i) => K[i] === 'ok'); if (ok.length !== 1) continue;
  if (L.some(m => E.judge(p.clone().play(m)).over)) continue;
  const A = E.analyze(spec, [], ms), top = A.list[0];
  if (!top || top.m !== ok[0] || (A.list[1] && A.list[1].v >= top.v)) continue;
  const trap = K.filter(k => k === 'trap').length, open = K.filter(k => k === 'open').length;
  console.log(JSON.stringify({ spec, ans: E.name(p, ok[0]), L: L.length, trap, open, d: L.length - 1 + 2 * open, v: [top.v, A.list[1] && A.list[1].v], depth: A.depth }));
}
console.error('tried', tried);

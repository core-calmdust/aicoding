// The positions of amazons/bench.html (Lv.9 vs Lv.10, two games of a fixed seed, plies 10 … 40) for tools/mtsim (sim.c with
// g_amazons.h) into the current folder: node <repo>/amazons/tools/mtsim_pos.js → pos_amazons.txt. A line: "P " + the 100 squares
// (0 empty, 1 White, 2 Black, 3 arrow), the 8 amazons' squares, the side (0 White), the two keys, the root list (n, move, score …:
// engine.js's cands(pos, 16, 0, 20), the list bestMove searches). NPOS=16: 4 more plies of each game (12 … 42, every 10).
'use strict';
const path = require('path'), fs = require('fs');
const E = require(path.join(__dirname, '..', 'engine.js'));
const NPOS = +process.env.NPOS || 8;
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const out = [];
for (let g = 0; g < 2; g++) {
  const moves = [];
  for (let i = 0; i < 45; i++) {
    const { pos } = E.replay(null, moves); if (E.judge(pos).over) break;
    const r = E.think(null, moves, 9 + g, rnd); if (r.move == null || r.move < 0) break; moves.push(r.move);
    if (i % 10 === 9 || (NPOS > 8 && i % 10 === 1 && i > 10)) {
      const p = E.replay(null, moves).pos, C = E.candList(p, 16, 0, 20);
      if (C.length < 2 || C[0].s > E.WINT) continue;
      out.push('P ' + [...p.sq, ...p.q, p.side, p.h1 | 0, p.h2 | 0, C.length, ...C.flatMap(c => [c.m, c.s])].join(' '));
    }
  }
}
fs.writeFileSync('pos_amazons.txt', out.slice(0, NPOS).join('\n') + '\n');
console.log('pos_amazons.txt', Math.min(NPOS, out.length), 'positions');

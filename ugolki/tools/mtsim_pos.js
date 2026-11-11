// The positions of shared/tools/mtstep.js ugolki (the bench's: Lv.6 vs Lv.7, rule c33, plies 10 … 50) for tools/mtsim (sim.c with
// g_ugolki.h) into the current folder: node <repo>/ugolki/tools/mtsim_pos.js → pos_ugolki.txt. A line: "P " + the rule (rows, cols,
// diag, limit, cap), the 258 keys (ZT), the 64 squares, side, ply, h1, h2, free, the number of earlier positions, their keys (h1, h2 …).
'use strict';
const path = require('path'), fs = require('fs');
const E = require(path.join(__dirname, '..', 'engine.js'));
const RULE = process.env.RULE || 'c33', NPOS = +process.env.NPOS || 5;
E.setRule(RULE);
const R = E.RULES[RULE], ZT = E.ZT;
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const out = [];
for (let g = 0; g < 2; g++) {
  const moves = [];
  for (let i = 0; i < 60; i++) {
    const { pos, hashes } = E.replay(null, moves); if (E.judge(pos, hashes).over || !pos.moves().length) break;
    const r = E.think(null, moves, 6 + g, rnd, RULE); if (r.move == null || r.move < 0) break; moves.push(r.move);
    if (i >= 9 && i % 10 === 9) {
      const { pos: p, hashes: h } = E.replay(null, moves); h.pop();
      const hist = h.flatMap(x => x.split(':').map(Number));
      out.push('P ' + [R.rows, R.cols, R.diag ? 1 : 0, R.limit, R.cap, ...ZT, ...p.sq, p.side, p.ply, p.h1 | 0, p.h2 | 0, p.free ? 1 : 0, h.length, ...hist.map(x => x | 0)].join(' '));
    }
  }
}
fs.writeFileSync('pos_ugolki.txt', out.slice(0, NPOS).join('\n') + '\n');
console.log('pos_ugolki.txt', Math.min(NPOS, out.length), 'positions');

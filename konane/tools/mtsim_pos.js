// The positions of shared/tools/mtstep.js konane (Lv.6 vs Lv.7, rule s8, plies 10 … 50) for tools/mtsim (sim.c with g_konane.h)
// into the current folder: node <repo>/konane/tools/mtsim_pos.js → pos_konane.txt. A line: "P " + the board size n, the 402 keys
// (ZT: Z1[2][100], Z2[2][100], ZS1, ZS2), the n × n squares, side, ply, h1, h2.
'use strict';
const path = require('path'), fs = require('fs');
const E = require(path.join(__dirname, '..', 'engine.js'));
const RULE = process.env.RULE || 's8', NPOS = +process.env.NPOS || 5;
E.setRule(RULE);
const n = E.N, z = E.ZT, NN = n * n, ZT = new Array(402).fill(0);
for (let k = 0; k < 4; k++) for (let i = 0; i < NN; i++) ZT[k * 100 + i] = z[k * NN + i];
ZT[400] = z[4 * NN]; ZT[401] = z[4 * NN + 1];
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const out = [];
for (let g = 0; g < 2; g++) {
  const moves = [];
  for (let i = 0; i < 60; i++) {
    const { pos } = E.replay(null, moves); if (E.judge(pos).over || !pos.moves().length) break;
    const r = E.think(null, moves, 6 + g, rnd, RULE); if (r.move == null || r.move < 0) break; moves.push(r.move);
    if (i >= 9 && i % 10 === 9) { const p = E.replay(null, moves).pos; out.push('P ' + [n, ...ZT.map(x => x | 0), ...Array.from(p.sq).slice(0, NN), p.side, p.ply, p.h1 | 0, p.h2 | 0].join(' ')); }
  }
}
fs.writeFileSync('pos_konane.txt', out.slice(0, NPOS).join('\n') + '\n');
console.log('pos_konane.txt', Math.min(NPOS, out.length), 'positions');

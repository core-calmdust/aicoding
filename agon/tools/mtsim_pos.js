// The positions of shared/tools/mtstep.js agon (Lv.6 vs Lv.7, rule std, plies 10 … 50) for tools/mtsim (sim.c with g_agon.h) into
// the current folder: node <repo>/agon/tools/mtsim_pos.js → pos_agon.txt. A line: "P " + the core's geometry (674) and keys (1126),
// the squares, the captured marks, side, ply, h1, h2, free, the reserves of both sides, the root side, the rule's cap, the number of
// earlier positions and their keys (h1, h2 …).
'use strict';
const path = require('path'), fs = require('fs');
const E = require(path.join(__dirname, '..', 'engine.js'));
const RULE = process.env.RULE || 'std', NPOS = +process.env.NPOS || 5;
E.setRule(RULE);
const C = E.coreArrays;
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
      out.push('P ' + [...C.geo, ...C.zt, ...p.sq, ...p.cap, p.side, p.ply, p.h1 | 0, p.h2 | 0, p.free ? 1 : 0, p.res[1], p.res[2], p.side, E.RULES[RULE].cap, h.length, ...hist.map(x => x | 0)].join(' '));
    }
  }
}
fs.writeFileSync('pos_agon.txt', out.slice(0, NPOS).join('\n') + '\n');
console.log('pos_agon.txt', Math.min(NPOS, out.length), 'positions');

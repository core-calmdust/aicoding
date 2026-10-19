// Generate varied self-play games (renju) for puzzle mining: random 珠型 opening, random levels 4-8 per side.
// node tools/gen-games.js <games> <out.jsonl> [timeScale]
'use strict';
const E = require('../engine.js');
const fs = require('fs');
const G = +process.argv[2] || 100, OUT = process.argv[3] || 'games.jsonl', SCALE = +process.argv[4] || 0.25;
let seed = (Date.now() ^ (process.pid << 12)) >>> 0;
const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
for (const L of E.LEVELS) if (L) L.ms = Math.max(50, Math.round(L.ms * SCALE));
for (let g = 0; g < G; g++) {
  const lv = [0, 4 + Math.floor(rnd() * 5), 4 + Math.floor(rnd() * 5)];
  const pos = new E.Pos('renju'), moves = [];
  pos.make(E.CENTER); moves.push(E.CENTER);
  for (let k = 0; k < 2; k++) { const lg = pos.legal(), m = lg[Math.floor(rnd() * lg.length)]; pos.make(m); moves.push(m); }
  let st = pos.status();
  while (!st.over && moves.length < 120) {
    const r = E.think('renju', moves, lv[pos.side], null, rnd);
    if (r.move < 0 || !pos.isLegal(r.move)) break;
    moves.push(r.move); pos.make(r.move); st = pos.status();
    if (!st.over && !pos.legal().length) { st = { over: true, winner: 3 - pos.side, why: 'nomove' }; break; }
  }
  fs.appendFileSync(OUT, JSON.stringify({ lv: [lv[1], lv[2]], moves: moves.map(E.sqName).join(' '), winner: st.winner || 0 }) + '\n');
  if ((g + 1) % 10 === 0) console.log(g + 1, 'games');
}

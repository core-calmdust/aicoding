// node tools/gen_pool.js <games> <out.jsonl> [rule] [seed]
// Self-play games for the lesson / puzzle pool: Lv.12-ish search with noise, the first 6 plies random; every position from ply 12
// on is written as { b, side, n, g } (a spec) with the game's final winner.
const fs = require('fs'), E = require('../engine.js');
const G = +(process.argv[2] || 50), OUT = process.argv[3] || '/tmp/bt-pool.jsonl', RULE = process.argv[4] || 's8';
let seed = +(process.argv[5] || 99); const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // mulberry32
E.setRule(RULE);
const out = fs.openSync(OUT, 'a');
for (let g = 0; g < G; g++) {
  const pos = E.Pos.from(null), mv = [], specs = [];
  while (!E.judge(pos).over && mv.length < 300) {
    let m;
    if (mv.length < 6) { const L = pos.moves(); m = L[Math.floor(rnd() * L.length)]; }
    else { const lv = 9 + Math.floor(rnd() * 5); m = E.think(null, mv, lv, rnd).move; }
    if (mv.length >= 10) specs.push(pos.spec());
    mv.push(m); pos.play(m);
  }
  const w = E.judge(pos).winner;
  for (const s of specs) fs.writeSync(out, JSON.stringify(Object.assign(s, { g: seed + ':' + g, w, len: mv.length })) + '\n');
  if (g % 10 === 9) console.log('games', g + 1);
}

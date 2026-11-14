// Node helpers for the Alquerque content (puzzles.json / lessons.json): Fanorona's engine (fanorona/engine.js + engine.wasm,
// the Alquerque endgame tables alqeg.bin.gz) with the rule set to 'alq' (R. C. Bell's rules, the page's base rule).
'use strict';
const path = require('path');
const lib = require(path.join(__dirname, '..', '..', 'fanorona', 'tools', 'lib.js'));
const PTS = []; for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) PTS.push(r * 9 + c);   // the 25 points (r*9+c)
async function init() {
  process.env.NO_EG = '1'; process.env.NO_NET = '1';   // (Fanorona's own tables / net are for the 9x5 board)
  const E = await lib.init(); E.setRule('alq'); return E;
}
function rng(seed) { return lib.rng(seed); }
function randomPos(rand, nw, nb, side) {
  const pts = PTS.slice();
  for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
  const a = Array(45).fill('.');
  pts.slice(0, nw).forEach(i => (a[i] = 'w')); pts.slice(nw, nw + nb).forEach(i => (a[i] = 'b'));
  return { b: a.join(''), side };
}
const capN = (E, pos, m) => E.capsOf(pos, m).flat().length;
// positions of engine games between two levels (side to move, legal, not over)
function gamePool(E, rand, games, lo, hi, minPly) {
  const pool = [];
  for (let g = 0; g < games; g++) {
    const a = lo + Math.floor(rand() * (hi - lo + 1)), b = lo + Math.floor(rand() * (hi - lo + 1)), moves = [];
    for (let ply = 0; ply < 160; ply++) {
      const { pos, hashes } = E.replay(null, moves);
      if (E.judge(pos, hashes).over) break;
      if (ply >= (minPly || 2)) pool.push(pos.spec());
      const r = E.think(null, moves, ply % 2 ? b : a, rand); if (!r.move) break;
      moves.push(r.move);
    }
  }
  return pool;
}
module.exports = { init, rng, randomPos, capN, gamePool, PTS };

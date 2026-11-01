// Node helpers for the content generators: the rules (engine.js) with the WebAssembly search attached.
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
let X = null;
async function init() {
  if (X) return E;
  const r = await WebAssembly.instantiate(fs.readFileSync(path.join(__dirname, '..', 'engine.wasm')), { env: { now: () => Date.now(), progress: () => {} } });
  X = r.instance.exports; E.attachWasm(X);
  return E;
}
// deterministic random
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const capN = (pos, m) => E.capsOf(pos, m).flat().length;
// a game between two levels from a start, returns the list of { spec, moves(before) } positions
function selfPlay(rand, lvA, lvB, maxPly, start) {
  const moves = [], out = [];
  for (let ply = 0; ply < (maxPly || 160); ply++) {
    const { pos, hashes } = E.replay(start || null, moves);
    if (E.judge(pos, hashes).over) break;
    out.push({ spec: pos.spec(), n: moves.length });
    const r = E.think(start || null, moves, ply % 2 ? lvB : lvA, rand);
    if (!r.move) break;
    moves.push(r.move);
  }
  return { moves, out };
}
module.exports = { init, E, rng, capN, selfPlay, get X() { return X; } };

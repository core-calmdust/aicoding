// Search speed of weights files (one thread, engine.wasm): nodes per second of the midgame search to a fixed depth on the same
// positions, each file in turn (repeated, to even out a busy machine). A bigger model (more patterns / extras) costs speed.
//   node tools/train/nps.js weights.bin.gz weights_v5.bin.gz [--depth 11] [--rounds 3]
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const RV = path.join(__dirname, '../..');
const args = process.argv.slice(2), files = args.filter(a => !a.startsWith('--') && !/^\d+$/.test(a));
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? +args[i + 1] : null; };
const DEPTH = opt('depth') || 11, ROUNDS = opt('rounds') || 3;
const E = require(path.join(RV, 'engine.js'));
const { legal, play, start } = require(path.join(RV, 'tools/eng-lite.js'));
const readW = f => { let b = fs.readFileSync(f); if (b[0] === 0x1f && b[1] === 0x8b) b = zlib.gunzipSync(b); b = new Uint8Array(b); return new Int16Array(b.buffer, 0, b.length >> 1); };
const WS = files.map(readW);
let s0 = 7; const r = () => { s0 ^= s0 << 13; s0 >>>= 0; s0 ^= s0 >> 17; s0 ^= s0 << 5; s0 >>>= 0; return s0 / 4294967296; };
const POS = [];
while (POS.length < 24) {
  let c = start(), s = 1; const stop = 12 + POS.length % 24;
  for (let k = 0; k < stop; k++) { let m = legal(c, s); if (!m.length) { s = 3 - s; m = legal(c, s); if (!m.length) break; } c = play(c, m[(r() * m.length) | 0], s); s = 3 - s; }
  if (legal(c, s).length) POS.push([c, s]);
}
const tot = files.map(() => ({ n: 0, ms: 0 }));
for (let k = 0; k < ROUNDS; k++) files.forEach((f, i) => {
  E.setWeights(WS[i], 30);
  for (const [c, s] of POS) { E.clearTT(); const t = E.think(c, s, { cfg: { depth: DEPTH, exact: 0, mpc: 1 }, noBook: true, variety: false, time: 0 }); tot[i].n += t.nodes; tot[i].ms += t.ms; }
});
files.forEach((f, i) => console.log(`${path.basename(f).padEnd(28)} ${(tot[i].n / tot[i].ms / 1000).toFixed(2)} Mnps  (${(tot[i].n / 1e6).toFixed(1)}M nodes, ${(tot[i].ms / 1000).toFixed(1)} s)`));

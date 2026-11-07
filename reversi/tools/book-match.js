// Book A vs book B with the same engine and settings, from the initial position (the books' own variety on both sides).
//   node book-match.js <bookA (.bin | .json)> <bookB> <pairs> <out.jsonl> [level=15] [timeMs]
// Game 2k and 2k+1 use the same random seeds with the colours swapped. Results are appended per game (resumable).
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const RV = path.join(__dirname, '..');
const raw = zlib.gunzipSync(fs.readFileSync(path.join(RV, 'weights.bin.gz')));
const W = new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2);
const readBook = f => /\.json$/.test(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : fs.readFileSync(f);
function loadEngine(book) {
  const f = require.resolve(path.join(RV, 'engine.js')); delete require.cache[f];
  const E = require(f); E.setWeights(W, 30); E.setBook(readBook(book)); return E;
}
const [fa, fb, pairs, out, level = 15, timeMs] = process.argv.slice(2);
const EA = loadEngine(fa), EB = loadEngine(fb);
const { legal, play, start } = require('./eng-lite.js');
const cfg = Object.assign({}, EA.LEVELS[+level], timeMs ? { time: +timeMs } : {});
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
let done = fs.existsSync(out) ? fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).length : 0;
for (let g = done; g < pairs * 2; g++) {
  const aBlack = g % 2 === 0, seed = (Math.floor(g / 2) + (+process.env.SEED0 || 0)) * 7919 + 17;   // (SEED0: another set of games, e.g. a second process)
  const rB = rng(seed), rW = rng(seed * 3 + 1);   // black's and white's random numbers (the same for both colourings)
  let c = start(), s = 1, inA = 0, inB = 0, ply = 0, moves = '';
  EA.clearTT(); EB.clearTT();
  for (;;) {
    let ms = legal(c, s);
    if (!ms.length) { s = 3 - s; ms = legal(c, s); if (!ms.length) break; }
    const isA = (s === 1) === aBlack, E = isA ? EA : EB;
    const r = E.think(c, s, { cfg, random: s === 1 ? rB : rW });
    if (r.book) { if (isA) inA = ply + 1; else inB = ply + 1; }
    moves += 'abcdefgh'[r.move & 7] + ((r.move >> 3) + 1);
    c = play(c, r.move, s); s = 3 - s; ply++;
  }
  const b = c.filter(x => x === 1).length, w = c.filter(x => x === 2).length, da = aBlack ? b - w : w - b;
  fs.appendFileSync(out, JSON.stringify({ g, aBlack, da, res: da > 0 ? 1 : da < 0 ? 0 : 0.5, bookA: inA, bookB: inB, moves }) + '\n');
}
const rs = fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const wins = rs.filter(r => r.res === 1).length, draws = rs.filter(r => r.res === 0.5).length, n = rs.length;
const sc = (wins + draws / 2) / n, se = Math.sqrt(sc * (1 - sc) / n);
const avg = k => (rs.reduce((a, r) => a + r[k], 0) / n).toFixed(1);
console.log(`${n}局: A ${wins}勝${draws}分${n - wins - draws}敗  勝率 ${(sc * 100).toFixed(1)}% (±${(se * 100).toFixed(1)}%)  平均石差 ${(rs.reduce((a, r) => a + r.da, 0) / n).toFixed(2)}  定石の最後の手 A ${avg('bookA')} / B ${avg('bookB')} 手目`);

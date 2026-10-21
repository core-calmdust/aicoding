// level-vs-level matches. usage: node match.js A B pairs out.jsonl [plies]
// A/B: level number (engine LEVELS) or a key of cands.json. Results are appended per game (resumable).
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const DIR = process.env.RVDIR || '/home/claude/wt-rv1000/reversi';
const raw = zlib.gunzipSync(fs.readFileSync(path.join(DIR, 'weights.bin.gz')));
const W = new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2), BOOK = JSON.parse(fs.readFileSync(path.join(DIR, 'book.json'), 'utf8'));
function loadEngine() {
  const f = require.resolve(path.join(DIR, 'engine.js')); delete require.cache[f];
  const E = require(f); E.setWeights(W, 30); E.setBook(BOOK); return E;
}
const EA = loadEngine(), EB = loadEngine();
const { legal, play, start } = require('./eng-lite.js');
const cands = fs.existsSync(__dirname + '/cands.json') ? JSON.parse(fs.readFileSync(__dirname + '/cands.json')) : {};
const [A, B, pairs, out, plies = 8] = process.argv.slice(2);
const cfgOf = k => cands[k] || EA.LEVELS[+k];
const ca = cfgOf(A), cb = cfgOf(B);
let done = 0;
if (fs.existsSync(out)) done = fs.readFileSync(out, 'utf8').split('\n').filter(l => { if (!l) return false; const r = JSON.parse(l); return r.a === A && r.b === B; }).length;
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function opening(seed) {
  const r = rng(seed * 7919 + 13); let c = start(), s = 1;
  for (let i = 0; i < +plies; i++) { const ms = legal(c, s); c = play(c, ms[Math.floor(r() * ms.length)], s); s = 3 - s; }
  return [c, s];
}
for (let g = done; g < pairs * 2; g++) {
  const op = Math.floor(g / 2), aBlack = g % 2 === 0;
  let [c, s] = opening(op + 1000);
  EA.clearTT(); EB.clearTT();
  let tA = 0, tB = 0, nA = 0, nB = 0, maxA = 0, maxB = 0;
  while (true) {
    let ms = legal(c, s);
    if (!ms.length) { s = 3 - s; ms = legal(c, s); if (!ms.length) break; }
    const isA = (s === 1) === aBlack, E = isA ? EA : EB, cfg = isA ? ca : cb;
    const t0 = Date.now();
    const r = E.think(c, s, { cfg });
    const dt = Date.now() - t0; if (isA) { tA += dt; nA++; maxA = Math.max(maxA, dt); } else { tB += dt; nB++; maxB = Math.max(maxB, dt); }
    c = play(c, r.move, s); s = 3 - s;
  }
  const b = c.filter(x => x === 1).length, w = c.filter(x => x === 2).length;
  const da = aBlack ? b - w : w - b;
  fs.appendFileSync(out, JSON.stringify({ a: A, b: B, g, da, res: da > 0 ? 1 : da < 0 ? 0 : 0.5, msA: Math.round(tA / Math.max(1, nA)), msB: Math.round(tB / Math.max(1, nB)), maxA, maxB }) + '\n');
}

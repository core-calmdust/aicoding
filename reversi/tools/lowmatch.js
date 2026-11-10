// Matches of the gentle levels (Lv.1–14, one thread, fast; 2026-11-10, MODEL_CARD.md「やさしいレベル」).
//   node tools/lowmatch.js pairs.txt N out.jsonl [plies 2] [shard 0] [nshard 1]
// pairs.txt: one match per line "A B"; a player is a level number (engine.js LEVELS), R (a random move) or G (always the
// move that flips the most), or a key of tools/cands.json (other settings to try). Each match: N openings of `plies`
// random moves, played twice with the colours swapped; the weak levels' chance moves use a seeded random (opts.random).
// Run two shards at once on two cores (shard 0 / 1 of 2) into the same file; then `python3 tools/elo.py out.jsonl`
// (the first player = 0: shift the list so Lv.14 = 1810, the anchor of the ratings).
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const DIR = path.join(__dirname, '..');
const raw = zlib.gunzipSync(fs.readFileSync(path.join(DIR, 'weights.bin.gz')));
const W = new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2);
const E = require(path.join(DIR, 'engine.js')); E.setWeights(W, 30); E.setBook(fs.readFileSync(path.join(DIR, 'book.bin')));
const { legal, play, start } = require('./eng-lite.js');
const [pf, np, out, plies = 2, shard = 0, nsh = 1] = process.argv.slice(2);
const cands = fs.existsSync(path.join(__dirname, 'cands.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'cands.json'))) : {};
const SPECIAL = { R: { random: 1 }, G: { greedy: 1, depth: 1, exact: 0 } };
const cfgOf = k => SPECIAL[k] || cands[k] || E.LEVELS[+k];
const pairs = fs.readFileSync(pf, 'utf8').split('\n').map(l => l.trim()).filter(Boolean).map(l => l.split(/\s+/));
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const hs = t => { let h = 7; for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
let job = 0;
for (const [A, B] of pairs) for (let g = 0; g < np * 2; g++) {
  if ((job++) % nsh != shard) continue;
  const aBlack = g % 2 === 0, r = rng(Math.floor(g / 2) * 7919 + 13 + g * 31 + hs(A + ':' + B));
  let c = start(), s = 1;
  for (let i = 0; i < +plies; i++) { const ms = legal(c, s); c = play(c, ms[Math.floor(r() * ms.length)], s); s = 3 - s; }
  const ca = cfgOf(A), cb = cfgOf(B);
  if (!ca || !cb) throw new Error('player? ' + A + ' / ' + B);
  const t0 = Date.now();
  for (;;) {
    let ms = legal(c, s);
    if (!ms.length) { s = 3 - s; ms = legal(c, s); if (!ms.length) break; }
    const cfg = (s === 1) === aBlack ? ca : cb;
    const mv = cfg.random ? ms[Math.floor(r() * ms.length)] : E.think(c, s, { cfg, random: r }).move;
    c = play(c, mv, s); s = 3 - s;
  }
  const b = c.filter(x => x === 1).length, w = c.filter(x => x === 2).length, da = aBlack ? b - w : w - b;
  fs.appendFileSync(out, JSON.stringify({ a: A, b: B, g, da, res: da > 0 ? 1 : da < 0 ? 0 : 0.5, msA: Date.now() - t0, msB: 0 }) + '\n');
}

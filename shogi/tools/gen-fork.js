// (2026-11-28 第2期 担当A) candidates for k5「両取りと駒得の手筋」: positions from the engine's self-play (depth 2, one of the top three
// moves at random; also the positions after six other good moves) where the side to move is not in check, neither side has a capture that wins material now (capture-only search),
// and exactly one legal move is a fork that wins material by force: the moved piece attacks two targets at once (an enemy piece it
// would win by taking it — undefended, or worth more than the mover — or the king), and the material search (our move, every reply
// of the opponent, then captures only) gives the answer +2.5 or more and every other legal move +0.95 or less. No mate in three for
// either side. The material search is shogi/tools/fork-lib.js (the same one tools/lesson-verify-shfork.js uses).
// Prints JSON lines { sfen, ans, val, second, targets, check, drop, legal, rep }.
// usage: node shogi/tools/gen-fork.js <games> <seed> [depth=2] [branches=6] [rand: the branches are random legal moves] > out.jsonl
'use strict';
const E = require('../engine.js'), zlib = require('zlib'), fs = require('fs'), path = require('path');
{ const b = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, '../weights.bin.gz'))); E.setWeights(new Int16Array(b.buffer, b.byteOffset, b.length / 2)); }
const F = require('./fork-lib.js')(E);
const [N = 50, SEED = 1, DEP = 2, BR = 6] = process.argv.slice(2).map(Number);
let s = SEED >>> 0 || 1; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
const START = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';
const seen = new Set(), RND = process.argv[6] === 'rand';
const sample = (a, n) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
for (let gme = 0; gme < N; gme++) {
  const p = new E.Position(); p.setSfen(START); const se = new E.Searcher(p);
  for (let ply = 0; ply < 160; ply++) {
    if (!p.legalMoves(true).length) break;
    const res = se.analyze({ depth: DEP, nodes: DEP > 1 ? 20000 : 4000 }); if (!res.length) break;
    if (ply >= 24) for (const x of [null, ...(RND ? sample(p.legalMoves(true), BR).map(m => ({ m })) : res.slice(1, 1 + BR))]) {   // the game's position, and the positions after BR other good moves (one slip of the side that moved)
      if (x) p.doMove(x.m);
      const k = p.sfen().split(' ').slice(0, 3).join(' ');
      if (!seen.has(k)) { seen.add(k); let r = null; try { r = F.study(p); } catch (e) { r = null; } if (r) console.log(JSON.stringify(r)); }
      if (x) p.undoMove(); }
    const top = res.slice(0, Math.min(3, res.length)).filter(x => x.s > res[0].s - 300);
    p.doMove(top[Math.floor(rnd() * top.length)].m);
  }
}

// "Fun" score of an Alquerque puzzle (0–100; the common rule claude/puzzle-fun-score.md: adopt 70 and above, mine 3× the need).
// A puzzle must be exact (the engine's exhaustive puzzle search, fanorona/engine.c puzzle(); first right move unique) AND
// worth solving:
//   options (20)  legal first moves to choose from: 1 → 0 … 8+ → 1 (capturing is compulsory, so a capture-only position
//                 offers few; a quiet position many)
//   key     (20)  the right move is not the greedy one. Greedy order: most pieces taken at once, then the moves that leave
//                 the opponent no capture. The greediest is right → .15, right among the 3 greediest → .5, else → 1
//   tries   (15)  tempting wrong moves: wrong moves that take at least as many pieces as the answer (or, for a quiet answer,
//                 that are safe too): 4+ → 1
//   depth   (15)  own moves to find: 1 → .3, 2 → .6, 3 → .85, 4+ → 1 (a gain of 3+ adds .15)
//   defence (10)  the defender's choices after the key move: 1 → 0 … 4+ → 1 (a win in 1 has no defence: .5)
//   paradox (15)  the right move looks wrong: it hands the opponent a capture (a sacrifice) → 1; it takes fewer pieces than
//                 the biggest capture → .6
//   natural  (5)  a game-like board: 6+ pieces in all → 1, 4–5 → .5
// usage: const { funScore } = require('./fun.js'); funScore(E, P, goal) → { fun, parts }
//        node tools/fun.js   → the score of every puzzle in ../puzzles.json
'use strict';
const W = { options: 20, key: 20, tries: 15, depth: 15, defence: 10, paradox: 15, natural: 5 };
const clamp = x => Math.max(0, Math.min(1, x));
const capN = (E, pos, m) => E.capsOf(pos, m).flat().length;

function funScore(E, P, gain) {
  const pos = E.Pos.from(P.s), all = pos.moves(), ans = P.answer, parts = {};
  const caps = m => capN(E, pos, m), safe = m => { const q = pos.clone().play(m); return q.status() !== 0 || !q.hasCaps(); };
  parts.options = clamp((all.length - 1) / 7);
  // (ties: the answer counts as the first of them — the strict reading)
  const greedy = all.map(m => [m, caps(m) * 10 + (safe(m) ? 1 : 0) + (m === ans ? .5 : 0)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const at = greedy.indexOf(ans);
  parts.key = at === 0 ? .15 : at < 3 ? .5 : 1;
  const ca = caps(ans), quiet = ca === 0;
  parts.tries = clamp(all.filter(m => m !== ans && (quiet ? !caps(m) && safe(m) : caps(m) >= ca)).length / 4);
  const n = P.n || 1;
  parts.depth = clamp((n === 1 ? .3 : n === 2 ? .6 : n === 3 ? .85 : 1) + (gain && (P.g || 0) >= 3 ? .15 : 0));
  const q = pos.clone().play(ans);
  parts.defence = q.status() !== 0 ? .5 : clamp((q.moves().length - 1) / 3);
  const maxCap = Math.max(...all.map(caps));
  parts.paradox = q.status() === 0 && q.hasCaps() && quiet ? 1 : ca < maxCap ? .6 : 0;
  const tot = pos.count(1) + pos.count(2);
  parts.natural = tot >= 6 ? 1 : tot >= 4 ? .5 : 0;
  let fun = 0; for (const k in W) fun += W[k] * (parts[k] || 0);
  return { fun: Math.round(fun), parts };
}
module.exports = { funScore, W };

if (require.main === module) {
  (async () => {
    const A = require('./alqlib.js'), E = await A.init();
    const D = require('../puzzles.json');
    for (const T of D.themes) {
      const f = T.puzzles.map(P => funScore(E, Object.assign({ g: T.g }, P), T.goal === 'gain').fun);
      console.log(T.id.padEnd(7), T.puzzles.length, 'min', Math.min(...f), 'avg', Math.round(f.reduce((a, b) => a + b, 0) / f.length));
    }
  })();
}

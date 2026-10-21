// Generator for NEW standard puzzles: human-solvable AND fun.
// Generates oversample× candidates of the wanted level, scores them with fun.js and keeps the best.
// usage (node): const { generateFun } = require('./gen_fun.js');
//   generateFun(E, rng, { level: 3, count: 50, oversample: 4, minFun: 70, minClues: 17, maxClues: 40 })
//   → [{ s: '81 digits', lv, score, clues, fun }]  (sorted easy → hard by engine score)
// Rule for all future まいにち数独 puzzles (collections, dailies, variants): build them through fun.js
// (oversample ≥ 3, keep fun ≥ 70). Existing published puzzles are not regenerated.
'use strict';
const { funScore } = require('./fun.js');

function generateFun(E, rng, opt) {
  const { level, count, oversample = 4, minFun = 70, minClues = 17, maxClues = 81, seen = new Set(), cap = 400000 } = opt;
  const pool = [];
  for (let n = 0; pool.length < count * oversample && n < cap; n++) {
    const { puzzle } = E.generate(rng, { minClues });
    const clues = puzzle.filter(x => x).length;
    if (clues > maxClues) continue;
    const s = puzzle.map(x => x || 0).join('');
    if (seen.has(s)) continue;
    const g = E.grade(puzzle);
    if (!g.solved || g.level !== level) continue;
    const f = funScore(E, puzzle);
    if (!f.solved || f.fun < minFun) continue;
    seen.add(s);
    pool.push({ s, lv: level, score: g.score, clues, fun: f.fun });
  }
  return pool.sort((a, b) => b.fun - a.fun).slice(0, count).sort((a, b) => a.score - b.score || b.clues - a.clues);
}
module.exports = { generateFun };

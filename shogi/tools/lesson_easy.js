// Rates the "next move" lesson problems (lessons.json, kind 'best') by how easy their answer is to find, for the 3-move
// practice of the lessons (2026-11-10): fd = the smallest search depth (1..8, plain alpha-beta without the root mate probe)
// at which the engine already plays an accepted move (9 = deeper). The lesson picks its 5 problems from the easiest ones.
//   node tools/lesson_easy.js        (writes lessons.json)
'use strict';
const E = require('../engine.js'), fs = require('fs'), path = require('path');
const F = path.join(__dirname, '..', 'lessons.json'), D = JSON.parse(fs.readFileSync(F, 'utf8'));
for (const g of D.grades) {
  if (g.rules) continue;
  for (const pr of g.problems) {
    if (pr.kind !== 'best') continue;
    const ok = new Set(pr.accept || pr.pv.slice(0, 1));
    let fd = 9;
    for (let d = 1; d <= 8; d++) {
      const p = new E.Position(); p.setSfen(pr.sfen);
      const S = new E.Searcher(p); S.rootMate = false;
      const r = S.rootSearch({ depth: d, noMate: true });
      if (r && r.move && ok.has(p.toUsi(r.move))) { fd = d; break; }
    }
    pr.fd = fd;
    console.log(g.id, pr.pv[0], 'fd', fd);
  }
}
fs.writeFileSync(F, JSON.stringify(D));

// node tools/op_apply.js curated.json   (2026-11-24 第2期・担当B) puts the problems chosen by tools/op_curate.js into openings.json
// (each keeps its path from the start, which tools/lesson-verify.js checkersOpen replays). Sets not in the file stay as they are.
const fs = require('fs'), path = require('path');
const F = path.join(__dirname, '..', 'openings.json'), O = JSON.parse(fs.readFileSync(F, 'utf8')), C = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const s of O.sets) if (C[s.id] && C[s.id].length >= 5) s.problems = C[s.id].map(P => ({ s: P.s, best: P.best, sc: P.sc, path: P.path }));
else if (C[s.id]) console.error(s.id, 'only', C[s.id].length, 'problems: kept as before');
fs.writeFileSync(F, JSON.stringify(O));

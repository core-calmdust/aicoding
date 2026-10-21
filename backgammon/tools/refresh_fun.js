// One-off (2026-10-21): replace puzzles whose fun score (fun.js) is below 70 with mined, engine-verified puzzles
// (mine.js: seeded self-play, 2-ply verification, fun ≥ 75) of the same category and a similar difficulty — the
// categories are ordered easy → hard by the gap between the best and the 2nd play, so each slot gets the unused
// candidate with the closest gap (cube puzzles: same question and answer). Ids never change, so stars / medals /
// unlocks stay. Players who already had a record for an id keep the old puzzle (the app reads P.old[id]), and the
// daily puzzle only changes for dates after P.cut.
// usage: node refresh_fun.js cand1.jsonl [cand2.jsonl …]   (deterministic for given candidate files; refuses to run twice)
'use strict';
const fs = require('fs'), path = require('path');
const { funScore } = require('./fun.js');
const file = path.join(__dirname, '..', 'puzzles.json');
const P = JSON.parse(fs.readFileSync(file, 'utf8'));
if (P.old) { console.error('already refreshed'); process.exit(1); }
const CUT = '2026-10-21', MIN = 70;
const pool = {}, seen = new Set();
for (const C of P.cats) for (const X of C.puzzles) seen.add(X.pos);
for (const f of process.argv.slice(2)) for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const c = JSON.parse(line), cat = c.cat.startsWith('cube') ? 'cube' : c.cat;
  if (seen.has(c.P.pos)) continue; seen.add(c.P.pos);
  const f2 = funScore(c.P, cat); if (f2.fun < 75) continue;   // re-score (same code as the set)
  (pool[cat] = pool[cat] || []).push(Object.assign(c, { fun: f2.fun }));
}
P.old = {}; P.cut = CUT; P.version = 4;
const res = {};
for (const C of P.cats) {
  const jobs = [];
  C.puzzles.forEach((X, j) => { const f = funScore(X, C.id); if (f.fun < MIN) jobs.push({ j, X, f }); });
  const cand = pool[C.id] || [];
  let n = 0;
  for (const job of jobs.sort((a, b) => (b.X.gap || 0) - (a.X.gap || 0))) {
    let bi = -1, bd = Infinity;
    cand.forEach((c, i) => {
      if (C.id === 'cube' && (c.P.q !== job.X.q || c.P.ans !== job.X.ans)) return;
      const d = C.id === 'cube' ? -c.fun : Math.abs(Math.log(c.P.gap / job.X.gap)) - c.fun / 400;
      if (d < bd) { bd = d; bi = i; }
    });
    if (bi < 0) continue;
    const [c] = cand.splice(bi, 1);
    P.old[job.X.id] = job.X;
    C.puzzles[job.j] = Object.assign({ id: job.X.id }, c.P, { id: job.X.id });
    n++;
  }
  res[C.id] = n + '/' + jobs.length;
}
fs.writeFileSync(file, JSON.stringify(P));
console.log('replaced', Object.keys(P.old).length, JSON.stringify(res));

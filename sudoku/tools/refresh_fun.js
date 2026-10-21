// One-off (2026-10-21): replace standard puzzles whose fun score (fun.js) is below 70 with new
// human-solvable, fun puzzles of the same level and similar difficulty score.
// Players keep the old puzzle where they already cleared it or have it in progress (app reads PZ.old),
// and daily pools only change for dates after PZ.cut (past/today's dailies stay as they were).
// usage: node refresh_fun.js   (deterministic; refuses to run twice)
'use strict';
const E = require('../engine.js');
const { funScore } = require('./fun.js');
const fs = require('fs'), path = require('path');
const file = path.join(__dirname, '..', 'puzzles.json');
const P = JSON.parse(fs.readFileSync(file, 'utf8'));
if (P.old) { console.error('already refreshed'); process.exit(1); }
const CUT = '2026-10-21', MIN = 70, TARGET = 75;
const arr = s => Array.from(s.slice(0, 81), Number);

// 1) find the puzzles to replace
const jobs = []; // { key, ref: [container, index], lv, score }
P.themes.forEach((th, ti) => th.forEach((s, pi) => {
  if (funScore(E, arr(s)).fun < MIN) jobs.push({ key: `t.${ti}.${pi}`, box: th, i: pi, lv: +s[81], score: E.grade(arr(s)).score });
}));
for (const k of ['easy', 'medium', 'hard']) P.daily[k].forEach((s, i) => {
  if (funScore(E, arr(s)).fun < MIN) jobs.push({ key: `d.${k}.${i}`, box: P.daily[k], i, lv: +s[81], score: E.grade(arr(s)).score });
});
const need = {}; jobs.forEach(j => (need[j.lv] = (need[j.lv] || 0) + 1));
console.log('to replace', jobs.length, need);

// 2) generate a pool of fun candidates per level (3× what we need)
const seen = new Set();
for (const th of P.themes) for (const s of th) seen.add(s.slice(0, 81));
for (const k in P.daily) for (const s of P.daily[k]) seen.add(s.slice(0, 81));
const rng = E.mulberry32(20261021);
const pool = { 1: [], 2: [], 3: [], 4: [] };
const want = l => (need[l] || 0) * 3;
let n = 0; const t0 = Date.now();
while (Object.keys(need).some(l => pool[l].length < want(l)) && n < 2e6) {
  n++;
  const { puzzle } = E.generate(rng, { minClues: 17 });
  const s = puzzle.map(x => x || 0).join('');
  if (seen.has(s)) continue;
  const g = E.grade(puzzle);
  if (!g.solved || !need[g.level] || pool[g.level].length >= want(g.level)) continue;
  const f = funScore(E, puzzle);
  if (f.fun < TARGET) continue;
  seen.add(s);
  pool[g.level].push({ s, score: g.score, fun: f.fun });
  if (n % 5000 === 0) console.error(n, Object.fromEntries(Object.entries(pool).map(([l, a]) => [l, a.length + '/' + want(l)])), ((Date.now() - t0) / 1000 | 0) + 's');
}

// 3) give each replaced puzzle the unused candidate with the closest difficulty score (ties → more fun)
P.old = {}; P.cut = CUT; P.v = 2;
jobs.sort((a, b) => a.score - b.score);
for (const j of jobs) {
  const c = pool[j.lv]; if (!c.length) throw new Error('pool empty for lv ' + j.lv);
  let best = 0;
  for (let k = 1; k < c.length; k++) {
    const d = Math.abs(c[k].score - j.score) - c[k].fun * .5, db = Math.abs(c[best].score - j.score) - c[best].fun * .5;
    if (d < db) best = k;
  }
  const [r] = c.splice(best, 1);
  P.old[j.key] = j.box[j.i];
  j.box[j.i] = r.s + j.lv;
}
fs.writeFileSync(file, JSON.stringify(P));
const cnt = {}; jobs.forEach(j => { const g = j.key.split('.')[0] + (j.key[0] === 'd' ? '.' + j.key.split('.')[1] : '') + ' lv' + j.lv; cnt[g] = (cnt[g] || 0) + 1; });
console.log('replaced', jobs.length, cnt, 'generated', n, ((Date.now() - t0) / 1000) + 's');

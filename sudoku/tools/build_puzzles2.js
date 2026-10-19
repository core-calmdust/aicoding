// Appends curated themes 11–20 (indexes 10–19) to puzzles.json without touching existing themes or daily pools.
// usage: node build_puzzles2.js   (deterministic)
const E = require(process.env.ENGINE || '../engine.js');
const fs = require('fs'), path = require('path');
const file = path.join(__dirname, '..', 'puzzles.json');
const P = JSON.parse(fs.readFileSync(file, 'utf8'));
P.themes = P.themes.slice(0, 10);
const seen = new Set();
for (const arr of [...P.themes, ...Object.values(P.daily)]) for (const s of arr) seen.add(s.slice(0, 81));
const rng = E.mulberry32(20261119);
const want = { L2: 140, L3: 190, L4: 290 };
const B = { L2: [], L3: [], L4: [] };
const full = k => B[k].length >= want[k];
let n = 0; const t0 = Date.now();
while (!Object.keys(want).every(full)) {
  n++;
  const { puzzle } = E.generate(rng, { minClues: 17 });
  const s = puzzle.map(x => x || 0).join('');
  if (seen.has(s)) continue;
  const g = E.grade(puzzle);
  if (!g.solved || g.level < 2) continue;
  const k = 'L' + g.level;
  if (!B[k] || full(k)) continue;
  seen.add(s);
  B[k].push({ s, lv: g.level, score: g.score, clues: puzzle.filter(x => x).length });
  if (n % 2000 === 0) console.error(n, B.L2.length, B.L3.length, B.L4.length, ((Date.now() - t0) / 1000 | 0) + 's');
}
// L2: fewest clues first for the "review with fewer clues" themes
B.L2.sort((a, b) => a.clues - b.clues || b.score - a.score);
B.L3.sort((a, b) => a.score - b.score);
B.L4.sort((a, b) => a.score - b.score);
const take = (k, c) => B[k].splice(0, c);
const takeHigh = (k, c) => B[k].splice(B[k].length - c, c);
const sortAsc = a => a.sort((x, y) => x.lv - y.lv || x.score - y.score || y.clues - x.clues);
const T = [];
const l2a = take('L2', 85);
T.push(sortAsc(l2a.slice(0, 50)));                                   // 11
const l3sorted = B.L3;
T.push(sortAsc([...l2a.slice(50), ...take('L3', 15)]));              // 12
T.push(sortAsc([...take('L2', 15), ...take('L3', 35)]));             // 13
T.push(sortAsc(take('L3', 50)));                                     // 14
T.push(sortAsc([...take('L3', 30), ...take('L4', 20)]));             // 15
T.push(sortAsc([...take('L3', 20), ...take('L4', 30)]));             // 16
const l4top = takeHigh('L4', 100);                                   // hardest 100 for 19–20
T.push(sortAsc(take('L4', 50)));                                     // 17
T.push(sortAsc(take('L4', 50)));                                     // 18
T.push(sortAsc(l4top.slice(0, 50)));                                 // 19
T.push(sortAsc(l4top.slice(50)));                                    // 20
for (const t of T) if (t.length !== 50) throw new Error('theme size ' + t.length);
P.themes.push(...T.map(a => a.map(x => x.s + x.lv)));
fs.writeFileSync(file, JSON.stringify(P));
console.log('generated', n, 'in', (Date.now() - t0) / 1000, 's');
T.forEach((t, i) => console.log('theme', i + 11, 'lv', [1, 2, 3, 4].map(l => t.filter(x => x.lv === l).length).join('/'), 'clues', Math.min(...t.map(x => x.clues)), '-', Math.max(...t.map(x => x.clues)), 'score', t[0].score, '→', t[49].score));

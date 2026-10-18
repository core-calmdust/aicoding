// Builds puzzles.json: 10 curated themes × 50 + daily pools (transformed per day in the app)
// usage: node build_puzzles.js   (deterministic)
const E = require('../engine.js');
const fs = require('fs'), path = require('path');
const rng = E.mulberry32(20261019);
const buckets = { L1easy: [], L1mid: [], L1hard: [], L2: [], L3: [], L4: [] };
const seen = new Set();
function add(key, p, g, clues) {
  const s = E.stringify(p); if (seen.has(s)) return; seen.add(s);
  buckets[key].push({ s, score: g.score, clues, bs: E.beginnerScore(g.counts) });
}
const want = { L1easy: 180, L1mid: 130, L1hard: 140, L2: 460, L3: 460, L4: 110 };
const full = k => buckets[k].length >= want[k];
let n = 0; const t0 = Date.now();
while (!Object.keys(want).every(full)) {
  n++;
  // easy ones: stop digging early
  const r = rng();
  let minClues = 17;
  if (!full('L1easy') && r < 0.25) minClues = 32 + ((rng() * 6) | 0);
  else if (!full('L1mid') && r < 0.4) minClues = 27 + ((rng() * 4) | 0);
  const { puzzle } = E.generate(rng, { minClues });
  const clues = puzzle.filter(x => x).length;
  const g = E.grade(puzzle);
  if (!g.solved) continue;
  if (g.level === 1) {
    if (clues >= 32 && E.beginnerScore(g.counts) <= 4) { if (!full('L1easy')) add('L1easy', puzzle, g, clues); }
    else if (clues >= 27) { if (!full('L1mid')) add('L1mid', puzzle, g, clues); }
    else if (!full('L1hard')) add('L1hard', puzzle, g, clues);
  } else if (g.level === 2) { if (!full('L2')) add('L2', puzzle, g, clues); }
  else if (g.level === 3) { if (!full('L3')) add('L3', puzzle, g, clues); }
  else if (g.level === 4) { if (!full('L4')) add('L4', puzzle, g, clues); }
  if (n % 2000 === 0) console.error(n, Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])), ((Date.now() - t0) / 1000) + 's');
}
for (const k in buckets) buckets[k].sort((a, b) => a.score - b.score || b.clues - a.clues);
// split a sorted bucket into easier/harder halves without overlap
const take = (k, count, from) => { // from: 'low' | 'high' | 'mid'
  const b = buckets[k];
  let out;
  if (from === 'high') out = b.splice(b.length - count, count);
  else if (from === 'mid') { const st = Math.max(0, ((b.length - count) / 2) | 0); out = b.splice(st, count); }
  else out = b.splice(0, count);
  return out;
};
const spread = (arr, count) => { // pick `count` items evenly across arr (arr sorted), return picked, leave rest
  const out = []; const idx = new Set();
  for (let i = 0; i < count; i++) idx.add(Math.round(i * (arr.length - 1) / (count - 1)));
  const keep = [];
  arr.forEach((x, i) => (idx.has(i) ? out : keep).push(x));
  arr.length = 0; arr.push(...keep);
  return out;
};
const lvOf = { L1easy: 1, L1mid: 1, L1hard: 1, L2: 2, L3: 3, L4: 4 };
const tag = (k, arr) => arr.map(x => ({ ...x, lv: lvOf[k] }));

// daily pools first (take evenly spread so curated themes keep a full range)
const daily = {
  easy: tag('L1easy', spread(buckets.L1easy, 120)),
  medium: tag('L2', spread(buckets.L2, 150)),
  hard: tag('L3', spread(buckets.L3, 150)),
};
const T = [];
const sortAsc = a => a.sort((x, y) => x.lv - y.lv || x.score - y.score || y.clues - x.clues);
T.push(sortAsc(tag('L1easy', take('L1easy', 50, 'low'))));
T.push(sortAsc([...tag('L1easy', take('L1easy', 10, 'low')), ...tag('L1mid', take('L1mid', 40, 'mid'))]));
T.push(sortAsc([...tag('L1mid', take('L1mid', 15, 'high')), ...tag('L1hard', take('L1hard', 35, 'mid'))]));
T.push(sortAsc([...tag('L1hard', take('L1hard', 10, 'high')), ...tag('L2', take('L2', 40, 'low'))]));
T.push(sortAsc(tag('L2', take('L2', 50, 'mid'))));
T.push(sortAsc([...tag('L2', take('L2', 30, 'high')), ...tag('L3', take('L3', 20, 'low'))]));
T.push(sortAsc(tag('L3', take('L3', 50, 'low'))));
T.push(sortAsc(tag('L3', take('L3', 50, 'low'))));
T.push(sortAsc([...tag('L3', take('L3', 25, 'high')), ...tag('L4', take('L4', 25, 'low'))]));
T.push(sortAsc(tag('L4', take('L4', 50, 'high'))));
for (const t of T) if (t.length !== 50) throw new Error('theme size ' + t.length);
const pack = arr => arr.map(x => x.s.replace(/\./g, '0') + x.lv);
const out = { v: 1, themes: T.map(pack), daily: { easy: pack(daily.easy), medium: pack(daily.medium), hard: pack(daily.hard) } };
fs.writeFileSync(path.join(__dirname, '..', 'puzzles.json'), JSON.stringify(out));
console.log('generated', n, 'puzzles in', (Date.now() - t0) / 1000, 's');
T.forEach((t, i) => console.log('theme', i + 1, 'lv', [1, 2, 3, 4].map(l => t.filter(x => x.lv === l).length).join('/'), 'clues', t[0].clues, '→', t[49].clues, 'score', t[0].score, '→', t[49].score));
for (const k in daily) console.log('daily', k, daily[k].length, 'clues', Math.min(...daily[k].map(x => x.clues)), '-', Math.max(...daily[k].map(x => x.clues)));

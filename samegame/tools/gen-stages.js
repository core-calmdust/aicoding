// node samegame/tools/gen-stages.js → samegame/stages.json
// 8 themes × 5 stages × 10 puzzles. Every puzzle is verified to be fully clearable (solver path stored).
// Inside a stage, puzzles go from easier to harder (random-playout clear rate, high → low).
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const THEMES = [
  { id: 'cl', min: 2, sp: () => ({}) },
  { id: 'tr', min: 3, sp: () => ({}) },
  { id: 'rk', min: 2, sp: s => ({ rock: 2 + s }) },
  { id: 'ic', min: 2, sp: s => ({ ice: 3 + s * 2 }) },
  { id: 'bm', min: 2, sp: s => ({ bomb: 2 + (s >> 1) }) },
  { id: 'wd', min: 2, sp: s => ({ wild: 1 + (s >> 1) }) },
  { id: 'pt', min: 2, sp: s => ({ paint: 1 + (s >> 1) }) },
  { id: 'mx', min: 2, sp: (s, r) => { const pool = ['rock', 'ice', 'bomb', 'wild', 'paint']; const o = {}; const n = s < 2 ? 2 : 3; while (Object.keys(o).length < n) { const k = pool[(r() * pool.length) | 0]; o[k] = 1 + ((r() * (1 + (s >> 1))) | 0); } return o; } },
];
// [cols, rows, colors] per stage
const SIZE = [[5, 5, 3], [6, 6, 3], [6, 7, 4], [7, 7, 4], [8, 8, 4]];
const SIZE3 = [[5, 6, 3], [6, 6, 3], [6, 7, 3], [7, 7, 3], [8, 8, 3]];
const out = { v: 1, themes: [] };
const rnd = E.rng(20261021);
for (const th of THEMES) {
  const stages = [];
  for (let s = 0; s < 5; s++) {
    const [w, h, k] = (th.min === 3 ? SIZE3 : SIZE)[s];
    const cand = []; let tries = 0;
    while (cand.length < 18 && tries < 600) {
      tries++;
      const b = E.randomBoard(w, h, k, rnd, th.sp(s, rnd));
      if (E.dead(b, th.min)) continue;
      const sol = E.solve(b, th.min, 80000); if (!sol) continue;
      const rate = E.playRate(b, th.min, 300, rnd);
      if (rate > 0.55) continue;            // too easy
      if (s >= 2 && rate > 0.25) continue;
      cand.push({ b: E.enc(b), sol: sol.map(([x, y]) => x * 16 + y), r: Math.round(rate * 1000) });
    }
    cand.sort((a, c) => c.r - a.r);
    // spread over the range: pick 10 evenly
    const pick = []; for (let i = 0; i < 10; i++) pick.push(cand[Math.round(i * (cand.length - 1) / 9)]);
    stages.push({ w, h, k, p: pick });
    process.stdout.write(`${th.id} s${s + 1}: ${cand.length} cand / ${tries} tries\n`);
  }
  out.themes.push({ id: th.id, min: th.min, stages });
}
fs.writeFileSync(path.join(__dirname, '..', 'stages.json'), JSON.stringify(out));
console.log('ok', fs.statSync(path.join(__dirname, '..', 'stages.json')).size, 'bytes');

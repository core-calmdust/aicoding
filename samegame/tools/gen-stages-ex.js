// node samegame/tools/gen-stages-ex.js → appends 7 new themes to stages.json (existing themes untouched)
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const file = path.join(__dirname, '..', 'stages.json');
const out = JSON.parse(fs.readFileSync(file, 'utf8'));
const have = new Set(out.themes.map(t => t.id));
const NEW = [
  { id: 'ih', min: 2, sp: s => ({ ice2: 3 + s * 2 }) },
  { id: 'ln', min: 2, sp: s => ({ row: 1 + (s >> 1) }) },
  { id: 'dr', min: 2, sp: s => ({ colm: 1 + (s >> 1) }) },
  { id: 'pr', min: 2, sp: s => ({ prism: 1 + (s >> 1) }) },
  { id: 'hd', min: 2, sp: s => ({ hid: 4 + s * 2 }) },
  { id: 'ch', min: 2, sp: s => ({ cham: 2 + s }) },
  { id: 'ex', min: 2, sp: (s, r) => { const pool = ['ice2', 'row', 'colm', 'prism', 'hid', 'cham', 'rock', 'bomb']; const o = {}; while (Object.keys(o).length < 3) { const k = pool[(r() * pool.length) | 0]; o[k] = 1 + ((r() * (1 + (s >> 1))) | 0); } return o; } },
];
const SIZE = [[5, 5, 3], [6, 6, 3], [6, 7, 4], [7, 7, 4], [8, 8, 4]];
const rnd = E.rng(20261022);
for (const th of NEW) {
  if (have.has(th.id)) continue;
  const stages = [];
  for (let s = 0; s < 5; s++) {
    const [w, h, k] = SIZE[s];
    const cand = []; let tries = 0;
    while (cand.length < 18 && tries < 900) {
      tries++;
      const b = E.randomBoard(w, h, k, rnd, th.sp(s, rnd));
      if (E.dead(b, th.min)) continue;
      const sol = E.solve(b, th.min, 80000); if (!sol) continue;
      const rate = E.playRate(b, th.min, 300, rnd);
      if (rate > (s < 2 ? .6 : .35)) continue;
      cand.push({ b: E.enc(b), sol: sol.map(([x, y]) => x * 16 + y), r: Math.round(rate * 1000) });
    }
    cand.sort((a, c) => c.r - a.r);
    const pick = []; for (let i = 0; i < 10; i++) pick.push(cand[Math.round(i * (cand.length - 1) / 9)]);
    stages.push({ w, h, k, p: pick });
    console.log(`${th.id} s${s + 1}: ${cand.length} cand / ${tries} tries`);
  }
  out.themes.push({ id: th.id, min: th.min, stages });
}
fs.writeFileSync(file, JSON.stringify(out));
console.log('themes', out.themes.map(t => t.id).join(','), fs.statSync(file).size);

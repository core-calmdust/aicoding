// (2026-11-26 第2期 担当A) pick 5 problems per lesson from mk-kmid.js candidates: ⑤ no board of the game within 6 seeds, nor within
// 2 seeds of a board 1–2 sowings away (either side); ⑥ d never goes down and the last above the first. Writes mancala/lessons.json.
//   node mancala/tools/pick-kmid.js <candidates dir> k_combo,k_tempo,...
const fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '../..');
const E = require(path.join(ROOT, 'mancala/engine.js'));
const R = 'kalah', dir = process.argv[2], ids = process.argv[3].split(','), skip = new Set((process.argv[4] || '').split(',').filter(Boolean));
const LP = path.join(ROOT, 'mancala/lessons.json'), L = JSON.parse(fs.readFileSync(LP, 'utf8')), PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'mancala/puzzles.json'), 'utf8'));
const pool = []; L.steps.forEach(st => { if (ids.includes(st.id)) return; st.problems.forEach(P => pool.push(P.b)); (st.ramp || []).forEach(r => pool.push(r.b)); });
PZ.cats.forEach(c => c.themes.forEach(t => t.puzzles.forEach(p => pool.push(p.b))));
const l1 = (a, b) => a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0);
const succ = b => { const o = []; for (const s of [0, 1]) for (const k of E.legal(Int8Array.from(b), s, R)) o.push(Array.from(E.trace(Int8Array.from(b), s, k, R).board)); return o; };
const near = (b, y) => { if (l1(b, y) <= 6) return true; const S1 = succ(b), S2 = [].concat(...S1.map(succ)); return S1.some(z => l1(z, y) <= 2) || S2.some(z => l1(z, y) <= 2); };
const nearPair = (a, b) => near(a, b) || near(b, a);
for (const id of ids) {
  const C = [].concat(...fs.readdirSync(dir).filter(f => f.startsWith('c_' + id + '_') && f.endsWith('.txt')).map(f => fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)));
  const seen = new Set(), ok = [];
  for (const c of C) { const k = c.P.b.join(','); if (seen.has(k) || skip.has(k)) continue; seen.add(k); if (pool.some(y => near(c.P.b, y))) continue; ok.push(c); }
  // by d, then the clearer gap first; 5 from distinct d where possible, no two near each other
  ok.sort((a, b) => a.d - b.d || b.gap - a.gap);
  const byD = {}; ok.forEach(c => (byD[c.d] = byD[c.d] || []).push(c));
  const ds = Object.keys(byD).map(Number).sort((a, b) => a - b);
  const pick = []; const take = c => { if (pick.some(p => nearPair(p.P.b, c.P.b))) return false; pick.push(c); return true; };
  // one from each d level (spread), then fill from the middle levels
  const lv = ds.length >= 5 ? [0, 1, 2, 3, 4].map(i => ds[Math.round(i * (ds.length - 1) / 4)]) : ds;
  for (const d of lv) for (const c of byD[d]) if (take(c)) break;
  for (const d of ds) { if (pick.length >= 5) break; for (const c of byD[d]) { if (pick.length >= 5) break; if (!pick.includes(c)) take(c); } }
  pick.sort((a, b) => a.d - b.d); const P5 = pick.slice(0, 5);
  if (P5.length < 5 || !(P5[4].d > P5[0].d)) { console.log(`${id}: only ${ok.length} usable (${pick.length} picked, d ${pick.map(p => p.d)}) — not written`); continue; }
  const st = L.steps.find(s => s.id === id); st.problems = P5.map(c => c.P);
  pool.push(...P5.map(c => c.P.b));
  console.log(`${id}: ${C.length} candidates, ${ok.length} usable → d ${P5.map(c => c.d)} gaps ${P5.map(c => c.gap)}`);
}
// one line per problem (as the file is kept)
fs.writeFileSync(LP, JSON.stringify(L));

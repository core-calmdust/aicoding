// (2026-11-26 第2期 担当A) pick 5 problems for the opening lessons k_open / k_open6 from mk-kmid.js candidates, as pick-kmid.js
// (⑤ no board of the game within 6 seeds nor 1–2 sowings ±2 seeds — the 2D intro's opening line included; ⑥ d never goes down,
// the last above the first) and also: both of the lesson's rules come up (2–3 problems with an extra turn, the rest leaving the
// opponent no exact pit), no two problems share your row, and no two answer with the same pit for the same rule. Writes mancala/lessons.json.
//   node mancala/tools/pick-kopen.js <candidates dir> k_open,k_open6
const fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '../..');
const E = require(path.join(ROOT, 'mancala/engine.js'));
const dir = process.argv[2], ids = process.argv[3].split(','), R = /^n_/.test(ids[0]) ? 'basic' : 'kalah';
const LP = path.join(ROOT, 'mancala/lessons.json'), L = JSON.parse(fs.readFileSync(LP, 'utf8')), PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'mancala/puzzles.json'), 'utf8'));
const pool = []; L.steps.forEach(st => { if (!ids.includes(st.id)) st.problems.forEach(P => pool.push(P.b)); (st.ramp || []).forEach(r => pool.push(r.b));
  if (st.line && st.line.moves) { let b = E.initial(st.line.seeds || st.seeds || 4), s = 0; pool.push(Array.from(b)); for (const k of st.line.moves) { const t = E.trace(b, s, k, R); b = t.board; s = t.next; pool.push(Array.from(b)); } } });
PZ.cats.forEach(c => c.themes.forEach(t => t.puzzles.forEach(p => pool.push(p.b))));
const l1 = (a, b) => a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0);
const succ = b => { const o = []; for (const s of [0, 1]) for (const k of E.legal(Int8Array.from(b), s, R)) o.push(Array.from(E.trace(Int8Array.from(b), s, k, R).board)); return o; };
const near = (b, y) => { if (l1(b, y) <= 6) return true; const S1 = succ(b), S2 = [].concat(...S1.map(succ)); return S1.some(z => l1(z, y) <= 2) || S2.some(z => l1(z, y) <= 2); };
const nearPair = (a, b) => near(a, b) || near(b, a) || a.slice(0, 6).join() === b.slice(0, 6).join();
const exK = b => E.legal(Int8Array.from(b), 0, R).some(k => { const t = E.trace(Int8Array.from(b), 0, k, R); return t.extra && !t.over; });
for (const id of ids) {
  const C = [].concat(...fs.readdirSync(dir).filter(f => f.startsWith('c_' + id + '_') && f.endsWith('.txt')).map(f => fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)));
  const seen = new Set(), ok = [];
  for (const c of C) { const k = c.P.b.join(','); if (seen.has(k)) continue; seen.add(k); if (pool.some(y => near(c.P.b, y))) continue; c.ex = exK(c.P.b); ok.push(c); }
  ok.sort((a, b) => a.d - b.d || b.gap - a.gap);
  // search: 5 boards, d non-decreasing with last > first, 2–3 extra-turn problems, pairwise apart; prefer the widest d spread then larger gaps
  let best = null, tries = 0; const N = ok.length;
  ok.forEach(c => { c.S1 = succ(c.P.b); c.S2 = [].concat(...c.S1.map(succ)); });
  const nr = (a, y) => l1(a.P.b, y) <= 6 || a.S1.some(z => l1(z, y) <= 2) || a.S2.some(z => l1(z, y) <= 2);
  const M = ok.map((a, i) => ok.map((b, j) => i !== j && (nr(a, b.P.b) || nr(b, a.P.b) || a.P.b.slice(0, 6).join() === b.P.b.slice(0, 6).join() || (a.P.best === b.P.best && a.ex === b.ex))));   // (and not the same pit for the same rule twice)
  ok.forEach((c, i) => { c.i = i; });
  const rec = (start, pick) => { if (++tries > 2e6) return;
    if (pick.length === 5) { const nx = pick.filter(c => c.ex).length; if (nx < 2 || nx > 3 || !(pick[4].d > pick[0].d)) return;
      const sc = (pick[4].d - pick[0].d) * 100 + new Set(pick.map(c => c.d)).size * 10 + Math.min(...pick.map(c => c.gap)); if (!best || sc > best.sc) best = { sc, pick: pick.slice() }; return; }
    for (let i = start; i < N; i++) { const c = ok[i]; if (pick.some(p => M[p.i][c.i])) continue; pick.push(c); rec(i + 1, pick); pick.pop(); } };
  rec(0, []);
  if (!best) { console.log(`${id}: ${ok.length} usable — no set of 5`); continue; }
  const st = L.steps.find(s => s.id === id); st.problems = best.pick.map(c => c.P); pool.push(...best.pick.map(c => c.P.b));
  console.log(`${id}: ${C.length} candidates, ${ok.length} usable → d ${best.pick.map(c => c.d)} gaps ${best.pick.map(c => c.gap)} extra ${best.pick.map(c => c.ex ? 1 : 0)}`);
}
fs.writeFileSync(LP, JSON.stringify(L));

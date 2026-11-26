// (2026-11-26 第2期 担当A) xiangqi「両取り」t_fork: from the candidates of tools/xqfork-gen.js, keep those more than 4 points from
// every xiangqi board (lessons・warm-ups・openings・puzzles, mirrored), then read each with the engine (all root moves, `ms1`): the
// answer alone on top, the next move 100 or more worse and under 16 points, no won / lost position; the kept ones are read again
// (`ms2`) and must agree. Prints the survivors with d (the wrong captures + the traps).
//   node tools/xqfork-curate.js <cands.json...> --out <file> [--ms1 1200] [--ms2 3000]
'use strict';
const fs = require('fs'), path = require('path');
const { load } = require(path.join(__dirname, '../xiangqi/tools/wasm.js'));
(async () => {
  const { E } = await load(); const a = process.argv.slice(2), oi = a.indexOf('--out'), out = a[oi + 1];
  const ms1 = +(a[a.indexOf('--ms1') + 1] || 0) || 1200, ms2 = +(a[a.indexOf('--ms2') + 1] || 0) || 3000;
  const files = a.filter((x, i) => !x.startsWith('--') && !(i > 0 && a[i - 1].startsWith('--')));
  const C = []; const seen = new Set(); for (const f of files) for (const c of JSON.parse(fs.readFileSync(f, 'utf8'))) if (!seen.has(c.s)) { seen.add(c.s); C.push(c); }
  const ROOT = path.join(__dirname, '..'), L = JSON.parse(fs.readFileSync(path.join(ROOT, 'xiangqi/lessons.json'))), PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'xiangqi/puzzles.json'))), OP = JSON.parse(fs.readFileSync(path.join(ROOT, 'xiangqi/openings.json')));
  const brd = fen => { const b = []; for (const row of fen.split(' ')[0].split('/')) for (const ch of row) if (/\d/.test(ch)) for (let k = 0; k < +ch; k++) b.push('.'); else b.push(ch); return b; };
  const dist = (x, y) => { let d1 = 0, d2 = 0; for (let i = 0; i < 90; i++) { if (x[i] !== y[i]) d1++; const r = (i / 9) | 0, c = i % 9; if (x[i] !== y[r * 9 + 8 - c]) d2++; } return Math.min(d1, d2); };
  const pool = []; L.steps.forEach(st => { if (st.id !== 't_fork') (st.problems || []).forEach(q => pool.push(brd(q.s))); (st.ramp || []).forEach(r => r.s && pool.push(brd(r.s))); });
  OP.sets.forEach(g => (g.problems || []).forEach(q => pool.push(brd(q.s)))); (PZ.themes || []).forEach(th => (th.puzzles || []).forEach(q => pool.push(brd(q.s))));
  const WIN = E.WIN, WINT = E.WINT, sOfV = v => v > WINT ? 0.9 + 0.1 * Math.min(1, 6 / (WIN - v + 1)) : v < -WINT ? -(0.9 + 0.1 * Math.min(1, 6 / (WIN + v + 1))) : v > WINT - 1000 ? 0.88 : v < -(WINT - 1000) ? -0.88 : Math.tanh(v / 450) * 0.82;
  const pts = (best, mine) => mine >= best - 10 ? 20 : Math.max(0, Math.round(20 * (1 - (sOfV(best) - sOfV(mine)) / 0.5)));
  const ok = (c, ms) => { const r = E.analyze(c.s, [], ms).list.slice().sort((x, y) => y.v - x.v); if (!r.length || r[0].m !== c.best) return null;
    if (Math.abs(r[0].v) > WINT - 1000) return null; if (r.length > 1 && (r[0].v - r[1].v < 100 || pts(r[0].v, r[1].v) >= 16)) return null; return r; };
  const res = []; let k = 0;
  const far = C.filter(c => { const B = brd(c.s); return pool.every(b => dist(B, b) > 4); });
  // also far from each other (they may become problems together)
  console.error(`${C.length} candidates, ${far.length} far from the pool`);
  for (const c of far) { k++; const r1 = ok(c, ms1); if (!r1) continue; const r2 = ok(c, ms2); if (!r2) continue;
    res.push(Object.assign({}, c, { gap1: r1[0].v - (r1[1] || { v: -1e9 }).v, gap: r2[0].v - (r2[1] || { v: -1e9 }).v, top: r2[0].v, sc: r2.map(e => [e.m, e.v]) }));
    fs.writeFileSync(out, JSON.stringify(res)); console.error(`${k}/${far.length}: kept ${res.length} (${c.iccs} d${c.d} gap ${res[res.length - 1].gap})`); }
  fs.writeFileSync(out, JSON.stringify(res)); console.error(`done: ${res.length}`);
})();

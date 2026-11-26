// (2026-11-26 第2期 担当A) xiangqi「兵の終盤」e_pawn: from the candidates of tools/xqpawn-gen.js keep those more than 4 points from
// every xiangqi board (lessons except e_pawn・warm-ups・openings・puzzles, mirrored), with 2 decoys or more (other checks / slower
// wins), then read each with the engine twice (`ms1`, `ms2`, every root move): the answer alone on top, a win both times.
//   node tools/xqpawn-curate.js <cands.json> --out <file> [--ms1 600] [--ms2 1500]
'use strict';
const fs = require('fs'), path = require('path');
const { load } = require(path.join(__dirname, '../xiangqi/tools/wasm.js'));
(async () => {
  const { E } = await load(); const a = process.argv.slice(2), out = a[a.indexOf('--out') + 1];
  const ms1 = +(a.includes('--ms1') ? a[a.indexOf('--ms1') + 1] : 600), ms2 = +(a.includes('--ms2') ? a[a.indexOf('--ms2') + 1] : 1500);
  const C = JSON.parse(fs.readFileSync(a[0], 'utf8'));
  const ROOT = path.join(__dirname, '..'), L = JSON.parse(fs.readFileSync(path.join(ROOT, 'xiangqi/lessons.json'))), PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'xiangqi/puzzles.json'))), OP = JSON.parse(fs.readFileSync(path.join(ROOT, 'xiangqi/openings.json')));
  const brd = fen => { const b = []; for (const row of fen.split(' ')[0].split('/')) for (const ch of row) if (/\d/.test(ch)) for (let k = 0; k < +ch; k++) b.push('.'); else b.push(ch); return b; };
  const dist = (x, y) => { let d1 = 0, d2 = 0; for (let i = 0; i < 90; i++) { if (x[i] !== y[i]) d1++; const r = (i / 9) | 0, c = i % 9; if (x[i] !== y[r * 9 + 8 - c]) d2++; } return Math.min(d1, d2); };
  const pool = []; L.steps.forEach(st => { if (st.id === 'e_pawn') return; (st.problems || []).forEach(q => pool.push(brd(q.s))); (st.ramp || []).forEach(r => r.s && pool.push(brd(r.s))); });
  OP.sets.forEach(g => (g.problems || []).forEach(q => pool.push(brd(q.s)))); (PZ.themes || []).forEach(th => (th.puzzles || []).forEach(q => pool.push(brd(q.s))));
  const WT = E.WINT, res = [];
  const read = (c, ms) => { const r = E.analyze(c.s, [], ms).list.slice().sort((x, y) => y.v - x.v); if (!r.length || r[0].m !== c.best || r[0].v <= WT || (r[1] && r[1].v >= r[0].v)) return null; return r; };
  const far = C.filter(c => { const B = brd(c.s); return pool.every(b => dist(B, b) > 4); }); console.error(`${C.length} candidates, ${far.length} far from the pool`);
  for (const c of far) { const r1 = read(c, ms1); if (!r1) continue; const slow = r1.filter(e => e.m !== c.best && e.v > WT).length; if (c.checks + slow < 2) continue;
    const r2 = read(c, ms2); if (!r2) continue; const slow2 = r2.filter(e => e.m !== c.best && e.v > WT).length; if (c.checks + slow2 < 2) continue;
    res.push(Object.assign({}, c, { dec: c.checks + slow2, sc: r2.map(e => [e.m, e.v]) })); fs.writeFileSync(out, JSON.stringify(res)); }
  fs.writeFileSync(out, JSON.stringify(res)); console.error(`done: ${res.length}`);
})();

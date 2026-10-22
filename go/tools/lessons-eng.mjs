// engine survey for strategic lesson problems (strong net).
//   node lessons-eng.mjs <in.json> <out.json>       in: [{ id, n, moves:[gtp] | rows+turn, komi, cands:[gtp], visits, v2 }]
//   node lessons-eng.mjs --course <name> <out.json>  re-measure every engine-checked problem of lessons-c-<name>.mjs
// → root top moves + the mover's score lead after every candidate (the numbers stored as `eng` in the course modules)
import fs from 'fs';
import { load, analyze, R } from './golib.mjs';
import { specFromRows } from './lessons-lib.mjs';
let [inF, outF] = process.argv.slice(2), list;
if (inF === '--course') {
  const mod = await import('./lessons-c-' + process.argv[3] + '.mjs'); outF = process.argv[4]; list = [];
  for (const st of mod.steps) st.problems.forEach((P, k) => { if (!P.eng) return;
    const [vr, v2] = String(P.eng.visits || '200/80').split('/').map(Number);
    list.push({ id: st.id + '#' + (k + 1), n: P.n || (P.rows && P.rows.length), moves: P.moves || [], rows: P.rows, turn: P.turn, komi: P.eng.komi, cands: Object.keys(P.eng.vals), visits: vr, v2 }); });
} else list = JSON.parse(fs.readFileSync(inF, 'utf8'));
const E = await load('strong');
const out = fs.existsSync(outF) ? JSON.parse(fs.readFileSync(outF, 'utf8')) : {};
for (const c of list) {
  if (out[c.id]) continue;
  const n = c.n, mv = (c.moves || []).map(m => R.parseCoord(m, n)), spec = c.rows ? specFromRows(c.rows, c.turn) : { n, turn: 1 };
  const a = analyze(E, spec, mv, c.komi, c.visits || 200);
  const top = a.list.slice(0, 6).map(e => ({ m: R.coord(e.m, n), n: e.n, lead: +e.lead.toFixed(2) }));
  const vals = {};
  const cands = new Set([...(c.cands || []), ...top.filter(e => e.n >= 15).slice(0, 3).map(e => e.m)]);
  for (const m of cands) { const b = analyze(E, spec, mv.concat([R.parseCoord(m, n)]), c.komi, c.v2 || 80); vals[m] = +(-b.lead).toFixed(2); }
  out[c.id] = { root: +a.lead.toFixed(2), top, vals };
  fs.writeFileSync(outF, JSON.stringify(out, null, 1));
  console.log(c.id, JSON.stringify(out[c.id]));
}

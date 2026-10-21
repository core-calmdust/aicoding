// engine survey for strategic lesson candidates: node lessons-eng.mjs <in.json> <out.json>
// in: [{ id, n, moves:[gtp], komi, cands:[gtp], visits }]   → root top moves + value of every candidate (mover's view)
import fs from 'fs';
import { load, analyze, R } from './golib.mjs';
const [inF, outF] = process.argv.slice(2);
const list = JSON.parse(fs.readFileSync(inF, 'utf8'));
const E = await load('strong');
const out = fs.existsSync(outF) ? JSON.parse(fs.readFileSync(outF, 'utf8')) : {};
for (const c of list) {
  if (out[c.id]) continue;
  const n = c.n, mv = c.moves.map(m => R.parseCoord(m, n)), spec = { n, turn: 1 };
  const a = analyze(E, spec, mv, c.komi, c.visits || 200);
  const top = a.list.slice(0, 6).map(e => ({ m: R.coord(e.m, n), n: e.n, lead: +e.lead.toFixed(2) }));
  const vals = {};
  const cands = new Set([...(c.cands || []), ...top.filter(e => e.n >= 15).slice(0, 3).map(e => e.m)]);
  for (const m of cands) { const b = analyze(E, spec, mv.concat([R.parseCoord(m, n)]), c.komi, c.v2 || 80); vals[m] = +(-b.lead).toFixed(2); }
  out[c.id] = { root: +a.lead.toFixed(2), top, vals };
  fs.writeFileSync(outF, JSON.stringify(out, null, 1));
  console.log(c.id, JSON.stringify(out[c.id]));
}

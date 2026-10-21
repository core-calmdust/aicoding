// verify all lines in data/fuseki-lines.json (cached) -> data/fuseki-verify.txt
import fs from 'fs';
import { line } from './fuseki-eval.mjs';
const L = JSON.parse(fs.readFileSync(new URL('./data/fuseki-lines.json', import.meta.url)));
const only = process.argv.slice(2);
const V = +(process.env.VISITS || 150);
let out = '';
for (const [id, [n, komi, hc, mv]] of Object.entries(L)) {
  if (only.length && !only.includes(id)) continue;
  const rows = await line(n, komi, hc, mv.split(/\s+/), V);
  const s = `== ${id}  maxloss ${Math.max(...rows.map(r => r.loss))}\n` + rows.map(r => `${String(r.k).padStart(2)}${r.c} ${r.mv.padEnd(4)} lead ${r.lead.toFixed(1).padStart(6)} loss ${r.loss.toFixed(1)} pol#${r.pol} best ${r.best.padEnd(4)} | ${r.alts}`).join('\n') + '\n';
  process.stdout.write(s); out += s;
  fs.appendFileSync(new URL('./data/fuseki-verify.txt', import.meta.url), s);
}

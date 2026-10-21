// propose side variations: node fuseki-vars.mjs id:at[:alt] ...  -> alt move (best-prior non-line move unless given) + 5 policy moves
import fs from 'fs';
import { load, policy, norm, R } from './golib.mjs';
import { mkspec } from './fuseki-eval.mjs';
const L = JSON.parse(fs.readFileSync(new URL('./data/fuseki-lines.json', import.meta.url)));
const E = await load('strong');
for (const a of process.argv.slice(2)) {
  const [id, at, alt] = a.split(':'); const [n, komi, hc, s] = L[id]; const line = s.split(' ');
  const spec = mkspec(n, hc); const mv = norm(line.slice(0, +at), n);
  let p = policy(E, spec, mv, komi, 2);
  const first = alt ? R.parseCoord(alt, n) : p.list.find(e => R.coord(e.m, n) !== line[+at]).m;
  const out = [R.coord(first, n)]; mv.push(first);
  for (let k = 0; k < 5; k++) { p = policy(E, spec, mv, komi, 2); out.push(R.coord(p.list[0].m, n)); mv.push(p.list[0].m); }
  console.log(`${id}:${at} line=${line[+at]}  var: ${out.join(' ')}`);
}

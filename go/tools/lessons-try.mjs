// quick look: node lessons-try.mjs <file.json-ish module> — prints board + solver wins for each entry
import { specFromRows, solveFirst, show, legalSetup } from './lessons-lib.mjs';
const mod = await import(process.argv[2]);
for (const [k, e] of Object.entries(mod.default)) {
  const s = specFromRows(e.rows, e.turn);
  const bad = legalSetup(s);
  console.log('== ' + k + ' turn ' + (e.turn === 1 ? 'B' : 'W') + (bad.length ? ' ILLEGAL ' + bad : ''));
  console.log(show(s));
  for (const c of e.chk) { const t = Date.now(); const r = solveFirst(s, c.goal, c.tgt, c); console.log('  ', c.goal, c.tgt.join(','), '->', r.wins.join(' '), ' nodes', r.nodes, Date.now() - t + 'ms'); }
}

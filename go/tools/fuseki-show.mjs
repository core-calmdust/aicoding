// print a line's final board with move numbers: node fuseki-show.mjs id [upto]
import fs from 'fs';
import { R, mkspec } from './fuseki-eval.mjs';
const L = JSON.parse(fs.readFileSync(new URL('./data/fuseki-lines.json', import.meta.url)));
for (const id of process.argv.slice(2)) {
  const [n, komi, hc, s] = L[id]; const mv = s.split(/\s+/);
  const spec = mkspec(n, hc); let p = R.Pos.from(spec); const num = {};
  mv.forEach((m, k) => { const i = R.parseCoord(m, n); p = p.tryPlay(i).pos; num[i] = k + 1; });
  let o = `== ${id}\n    ` + R.COLS.slice(0, n).split('').map(c => c.padStart(3)).join('') + '\n';
  for (let y = 0; y < n; y++) { o += String(n - y).padStart(3) + ' '; for (let x = 0; x < n; x++) { const i = y * n + x, v = p.b[i]; o += (num[i] && v ? (v === 1 ? 'b' : 'w') + num[i] : v === 1 ? 'X' : v === 2 ? 'O' : '.').padStart(3); } o += '\n'; }
  console.log(o);
}

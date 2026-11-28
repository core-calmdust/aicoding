// node expstat.js name... : combine the last line of each process file
const fs = require('fs');
for (const name of process.argv.slice(2)) {
  let n = 0, s = 0, q = 0, av = 0, k = 0;
  for (const i of [1, 2]) { const f = `/tmp/hf/exp/${name}.${i}.jsonl`; if (!fs.existsSync(f)) continue; const L = fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean); if (!L.length) continue; const j = JSON.parse(L[L.length - 1]); n += j.n; s += j.sum; q += j.sq; av += j.avgA; k++; }
  if (!n) { console.log(name, 'no data'); continue; }
  const m = s / n, se = Math.sqrt(q / n - m * m) / Math.sqrt(n);
  console.log(`${name}: ${m.toFixed(3)} ± ${se.toFixed(3)} pts/hand  (${n} deals x2, z=${(m / se).toFixed(2)}, A ${(av / k).toFixed(0)}ms/move)`);
}

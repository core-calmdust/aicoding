// node stats.js <file.jsonl>... : W/L for A, margin, 95% CI (Wilson), paired-opening summary
const fs = require('fs');
for (const f of process.argv.slice(2)) {
  const L = fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
  let w = 0, d = 0, l = 0, m = 0, ta = 0, tb = 0, na = 0, nb = 0, mxa = 0, mxb = 0;
  for (const x of L) { if (x.a > x.b) w++; else if (x.a < x.b) l++; else d++; m += x.a - x.b; ta += x.msA; tb += x.msB; na += x.nA; nb += x.nB; mxa = Math.max(mxa, x.maxA); mxb = Math.max(mxb, x.maxB); }
  const n = L.length, s = (w + d / 2) / n, z = 1.96, den = 1 + z * z / n, c = (s + z * z / (2 * n)) / den, h = z * Math.sqrt(s * (1 - s) / n + z * z / (4 * n * n)) / den;
  // margin s.d.
  const mu = m / n, sd = Math.sqrt(L.reduce((a, x) => a + (x.a - x.b - mu) ** 2, 0) / Math.max(1, n - 1));
  // sign test p (two-sided, normal approx)
  const zz = (w - l) / Math.sqrt(Math.max(1, w + l));
  console.log(`${f}: n=${n} A W/D/L ${w}/${d}/${l} score ${(100 * s).toFixed(1)}% [95% CI ${(100 * (c - h)).toFixed(1)}–${(100 * (c + h)).toFixed(1)}] margin ${mu.toFixed(2)}±${(1.96 * sd / Math.sqrt(n)).toFixed(2)} z=${zz.toFixed(2)} | avg ms/move A ${(ta / na).toFixed(0)} B ${(tb / nb).toFixed(0)} max A ${mxa} B ${mxb}`);
}

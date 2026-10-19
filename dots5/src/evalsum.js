const fs = require('fs');
for (const f of process.argv.slice(2)) { const L = fs.readFileSync(f, 'utf8').trim().split('\n').map(JSON.parse); const by = {}; let ok = 0, n = 0;
  for (const x of L) { if (x.ok === null) continue; n++; if (x.ok) ok++; const b = x.safe <= 21 ? '19-21' : x.safe <= 24 ? '22-24' : '25-28'; by[b] = by[b] || [0, 0]; by[b][1]++; if (x.ok) by[b][0]++; }
  console.log(f.split('/').pop(), `kept ${ok}/${n}`, Object.entries(by).sort().map(([k, v]) => `${k}: ${v[0]}/${v[1]}`).join('  ')); }

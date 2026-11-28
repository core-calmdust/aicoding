// 照合データに各番が何回出たか（node gbmj/tools/fan-coverage.js cases.jsonl）
'use strict';
const fs = require('fs'); const G = require('../fan.js');
const cnt = new Array(82).fill(0);
for (const l of fs.readFileSync(process.argv[2], 'utf8').trim().split('\n')) { const r = G.calc(JSON.parse(l)); if (r.ok) for (const f of r.fans) cnt[f.id]++; }
const out = []; for (let i = 1; i <= 81; i++) out.push(`${i} ${G.FANS[i][2]} ${cnt[i]}`);
console.log(out.join('\n'));
console.log('min', Math.min(...cnt.slice(1)));

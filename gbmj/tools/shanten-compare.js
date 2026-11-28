// 向聴数の照合：node gbmj/tools/shanten-compare.js sh.jsonl ref.txt
'use strict';
const GB = require('../engine.js'); const fs = require('fs');
const A = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').map(JSON.parse), B = fs.readFileSync(process.argv[3], 'utf8').trim().split('\n').map(Number);
let ok = 0; const bad = [];
A.forEach((o, i) => { const s = GB.shanten(GB.counts(o.hand), o.melds.length); if (s === B[i]) ok++; else bad.push([o, s, B[i]]); });
console.log('一致', ok, '/', A.length); for (const b of bad.slice(0, 5)) console.log(JSON.stringify(b));
process.exit(bad.length ? 1 : 0);

/* one-off: score the first edition's stages so the rebuild can keep the good ones (and their save keys) */
'use strict';
const fs = require('fs'), F = require('./fun.js'), ST = require(process.argv[3] || '../stages.json'), out = process.argv[2];
const L = [];
ST.course.forEach((r, j) => L.push([Object.assign({ w: 6, h: 6, r: 'basic' }, r), 'c' + j, 'basic']));
for (const m in ST.modes) ST.modes[m].forEach((r, j) => L.push([Object.assign({ w: 6, h: 6, r: m === 'silent' || m === 'big' ? 'basic' : m }, r), m + '.' + j, m]));
for (const [rec, k, src] of L) {
  delete rec.s; const a = F.analyze(rec);
  if (!a.ok) continue;
  const m = a.m;
  fs.appendFileSync(out, JSON.stringify({ r: src === 'silent' ? 'basic' : src, o: a.o, sc: a.score, k, rec, m: { pieces: m.pieces, reuse: m.reuse, sols: m.sols } }) + '\n');
}

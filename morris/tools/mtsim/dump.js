// The 12 positions of ../../bench.html and the nine men's geometry for sim.c (pos.txt, evalnet.bin in the current folder): node dump.js ../..
const W = process.argv[2], fs = require('fs');
const E = require(W + '/engine.js');
const html = fs.readFileSync(W + '/bench.html', 'utf8');
const POS = JSON.parse(html.match(/const POS = (\[\[.*?\]\]);/)[1]);
const out = [];
const G = E.geom('nine'), geo = [G.n, G.pieces, G.fly ? 1 : 0, G.mills.length];
for (const m of G.mills) geo.push(...m);
const inMills = (i, j) => G.mills.some(m => (m[0] === i && m[1] === j) || (m[1] === i && m[2] === j) || (m[0] === j && m[1] === i) || (m[1] === j && m[2] === i));
const extra = []; for (let i = 0; i < G.n; i++) for (const j of G.adj[i]) if (j > i && !inMills(i, j)) extra.push(i, j);
geo.push(extra.length / 2, ...extra);
out.push('G ' + (geo || []).join(' '));
for (const p of POS) out.push('P ' + E.setupIO('nine', null, p).join(' '));
fs.writeFileSync('pos.txt', out.join('\n') + '\n');
const b = fs.readFileSync(W + '/evalnet.bin'); fs.writeFileSync('evalnet.bin', b);
console.log(POS.length + ' positions');

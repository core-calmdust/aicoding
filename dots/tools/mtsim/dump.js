// The positions of ../../bench.html for sim.c (pos.txt in the current folder): node dump.js <dots folder>
//   A <edges>: the AI positions (Lv.10, target 0), N <edges>: the analysis positions (exact values of every move)
const W = require('path').resolve(process.argv[2] || '../..'), fs = require('fs');
const E = require(W + '/engine.js');
const html = fs.readFileSync(W + '/bench.html', 'utf8');
const AI = JSON.parse(html.match(/const AI = (\[\[.*?\]\]);/)[1]);
const REV = JSON.parse(html.match(/const REV = (\[\[.*?\]\]);/)[1]);
const out = [], G = E.geom(5, 5); let g = 0;
for (const a of AI) out.push('A ' + a[2].join(' '));
for (const [n, ed] of REV) {   // (as bench.html's ANA)
  if (n !== 5) continue; let sd = 1234 + 7919 * g++; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const p = E.Pos.from(G, []), edges = [];
  while (p.undrawn > 0) {
    let safe = 0; for (let e = 0; e < G.E; e++) if (!p.drawn[e] && p.gives(e) === 0) safe++;
    if (safe <= 15 && !p.hasCapture()) { out.push('N ' + edges.join(' ')); break; }
    const m = edges.length < ed.length ? ed[edges.length] : E.chooseMove(p, 6, rnd).move; p.play(m); edges.push(m);
  }
}
fs.writeFileSync('pos.txt', out.join('\n') + '\n');
console.log(out.length + ' positions');

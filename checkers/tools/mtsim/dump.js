// The 12 positions of ../../bench.html as engine.c setup() buffers for sim.c (pos.txt in the current folder): node dump.js ../..
const W = process.argv[2], fs = require('fs');
const E = require(W + '/engine.js');
const html = fs.readFileSync(W + '/bench.html', 'utf8');
const POS = JSON.parse(html.match(/const POS = (\[\[.*?\]\]);/)[1]);
fs.writeFileSync('pos.txt', POS.map(p => 'P ' + E.setupIO(null, p).join(' ')).join('\n') + '\n');
console.log(POS.length + ' positions');

// node bench.js log ply : re-time Lv8 think on logged 'search' positions of that ply
const E = require('/home/claude/aicoding/connect4/engine.js'); const fs = require('fs');
E.setBook(JSON.parse(fs.readFileSync('/home/claude/aicoding/connect4/book.json')));
E.setTree(E.decodeTree(fs.readFileSync('/home/claude/aicoding/connect4/tree.bin')));
const [log, ply] = [process.argv[2], +process.argv[3]];
const a = [];
for (const l of fs.readFileSync(log, 'utf8').split('\n')) { const f = l.split(' '); if (f[0] !== 'G' && f[2] === 'search' && f[0].length === ply) { const r = E.think(f[0], 8); a.push(r.msProof ?? r.ms ?? 0); if (r.move !== +f[1]) {} } }
a.sort((x, y) => x - y); console.log('ply', ply, 'n', a.length, 'med', a[a.length >> 1], 'p95', a[Math.floor(a.length * .95)], 'max', a[a.length - 1], '>1400:', a.filter(x => x > 1400).length);

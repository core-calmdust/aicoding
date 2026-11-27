// self-play games for the lesson / puzzle positions: node tools/gen_corpus.js N seed > tools/corpus-<seed>.jsonl
// each line: {"l": [moves...], "r": result} — players are noisy shallow searches (human-like mistakes), openings random
const E = require('../engine.js'); E.setRule('std');
const [, , N = '200', SEED = '1'] = process.argv;
let s = +SEED * 7919 + 1; const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
const CFG = [{ d: 2, noise: 120 }, { d: 3, noise: 80 }, { d: 4, noise: 50 }, { d: 5, noise: 30 }, { d: 6, noise: 15 }];
for (let g = 0; g < +N; g++) {
  const line = []; const p = E.Pos.from(null);
  const a = CFG[Math.floor(rand() * CFG.length)], b = CFG[Math.floor(rand() * CFG.length)];
  const nr = Math.floor(rand() * 4);
  while (p.res < 0) {
    let m;
    if (line.length < nr) { const ms = p.moves(); m = ms[Math.floor(rand() * ms.length)]; }
    else { E.LEVELS[99] = p.side ? b : a; m = E.think(null, line, 99, rand).move; }
    line.push(m); p.play(m);
  }
  process.stdout.write(JSON.stringify({ l: line, r: p.res }) + '\n');
}

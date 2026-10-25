// First-move map for openings.json: Red's winrate (‰) after every first move, swap off, Blue to reply (MCTS per cell).
// The board is symmetric under a half turn, so half of the cells are searched.
//   HEXN=/path/hexn node tools/gen_firstmap.js 7,9,11,13 out.json [msScale]
const fs = require('fs');
const N = require('./nat.js').open();
const sizes = (process.argv[2] || '7,9,11,13').split(',').map(Number), out = process.argv[3] || 'firstmap.json', sc = +(process.argv[4] || 1);
const MS = { 7: 1000, 9: 1500, 11: 2500, 13: 3000 };
(async () => {
  const res = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};
  for (const n of sizes) {
    const ms = Math.round(MS[n] * sc), wr = new Array(n * n).fill(null);
    for (let i = 0; i < n * n; i++) {
      const j = n * n - 1 - i; if (j < i) { wr[i] = wr[j]; continue; }
      await N.setup(n, 0, [i]);
      const a = await N.analyze(ms, 0, 1), v = a.list[0].v;
      wr[i] = v > 29000 ? 0 : v < -29000 ? 1000 : Math.round(500 - v / 2);
      process.stderr.write(`\r${n}: ${i + 1}/${n * n}`);
    }
    res[n] = { wr, ms };
    fs.writeFileSync(out, JSON.stringify(res));
    process.stderr.write('\n');
  }
  N.close();
})();

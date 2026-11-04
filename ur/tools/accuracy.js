// ur/tools/accuracy.js — 完全解析表に対する AI の精度（1手あたりの平均勝率損失・最善手一致率）
// node --max-old-space-size=7000 ur/tools/accuracy.js <rule> <lut.rgu> [games=200] [levels=20,18,15,10,5,1] [depth]
'use strict';
const E = require('../engine.js'), T = require('./lut.js').open(process.argv[2], process.argv[3]);
const rule = process.argv[2], G = +(process.argv[4] || 200), levels = (process.argv[5] || '20,18,15,10,5,1').split(',').map(Number);
for (const L of levels) {
  const rng = E.mulberry32(77 + L); let loss = 0, n = 0, match = 0, t = 0, big = 0;
  for (let g = 0; g < G; g++) {
    let s = E.newGame(rule, g & 1);
    while (s.winner < 0) {
      const r = E.rollDice(rng, rule).n, ms = E.legalMoves(s, r);
      let m = null;
      if (ms.length > 1) {
        const vals = ms.map(x => T.after(s, x)), best = Math.max(...vals);
        const t0 = process.hrtime.bigint(); m = E.think(s, r, L, { rng }); t += Number(process.hrtime.bigint() - t0) / 1e6;
        const v = vals[ms.findIndex(x => x.from === m.from)]; const d = best - v; loss += d; n++; if (d < 1e-4) match++; if (d > 0.05) big++;
      } else m = ms[0] || null;
      s = E.apply(s, m).state;
    }
  }
  console.log(`${rule} L${L}: 平均損失 ${(loss / n * 100).toFixed(3)}%  最善一致 ${(match / n * 100).toFixed(1)}%  5%超の悪手 ${(big / n * 100).toFixed(2)}%  平均 ${(t / n).toFixed(2)}ms/手 (${n}手)`);
}

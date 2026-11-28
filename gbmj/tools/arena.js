// レベルの段差：node gbmj/tools/arena.js A B 試合数 seed [局数=16]
// 同じ山（seed）で A を 0・2 席、B を 1・3 席に置いた試合と、入れ替えた試合を打つ（duplicate）。
// 1局あたりの点の差（A 1人 − B 1人）と和了率を出す。正なら A が強い。
'use strict';
const { GBMatch } = require('../game.js'); const AI = require('../ai.js');
const [A, B] = [+process.argv[2], +process.argv[3]];
const N = +process.argv[4] || 20, seed0 = +process.argv[5] || 1, H = +process.argv[6] || 16;
let diff = 0, hands = 0; const win = { A: 0, B: 0 }, deal = { A: 0, B: 0 }; const per = [];
for (let g = 0; g < N; g++) for (const sw of [0, 1]) {
  const lv = sw ? [B, A, B, A] : [A, B, A, B];
  const m = new GBMatch({ seed: seed0 + g, hands: H });
  const bots = lv.map((l, i) => AI.create({ level: l, seed: (seed0 + g) * 16 + i * 4 + sw }));
  let gd = 0;
  while (!m.over) {
    const r = m.nextRound();
    while (r.phase !== 'end') for (const p of r.waiting()) { if (r.phase === 'end') break; r.act(p, bots[p].decide(r, p, r.options(p))); }
    const isA = p => (p % 2 === 0) !== !!sw;
    if (r.result.type === 'win') { const w = r.result.p; if (isA(w)) win.A++; else win.B++; if (r.result.from != null) { if (isA(r.result.from)) deal.A++; else deal.B++; } }
    for (let p = 0; p < 4; p++) { const d = r.result.pay[p] / 2; if (isA(p)) { diff += d; gd += d; } else { diff -= d; gd -= d; } }
    hands++;
    m.finishRound(r);
  }
  per.push(gd / H);
}
const mean = diff / hands;
const sd = Math.sqrt(per.reduce((a, x) => a + (x - mean) ** 2, 0) / Math.max(1, per.length - 1)) / Math.sqrt(per.length);
console.log(`Lv${A} 対 Lv${B}：${N * 2}試合 ${hands}局、1局あたり ${mean >= 0 ? '+' : ''}${mean.toFixed(2)}点（±${sd.toFixed(2)}）、和了 A ${(100 * win.A / hands / 2).toFixed(1)}% / B ${(100 * win.B / hands / 2).toFixed(1)}%（1人あたり）、放銃 A ${(100 * deal.A / hands / 2).toFixed(1)}% / B ${(100 * deal.B / hands / 2).toFixed(1)}%`);

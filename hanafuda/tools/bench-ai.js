// node hanafuda/tools/bench-ai.js A B hands : average points per hand of Lv.A vs Lv.B (alternating oya)
const HF = require('../engine.js'), AI = require('../ai.js');
const [A, B, N] = [+process.argv[2] || 20, +process.argv[3] || 1, +process.argv[4] || 100];
let diff = 0, wins = 0, losses = 0, t0 = Date.now(), maxMs = 0, moves = 0;
for (let h = 0; h < N; h++) {
  let s = HF.deal(7777 + h, h & 1, {});
  const lv = h & 2 ? [A, B] : [B, A]; // swap seats
  const seatA = h & 2 ? 0 : 1;
  let k = 0;
  while (s.phase !== 'over') {
    const t = Date.now();
    const r = AI.choose(s, lv[s.turn], 99 + h * 131 + k++);
    const dt = Date.now() - t; if (lv[s.turn] === A) { maxMs = Math.max(maxMs, dt); moves++; }
    s = HF.apply(s, r.action);
  }
  const res = s.result;
  if (res.winner >= 0) { const d = res.winner === seatA ? res.pts : -res.pts; diff += d; if (d > 0) wins++; else losses++; }
}
console.log(`Lv${A} vs Lv${B}: ${(diff / N).toFixed(2)} pts/hand, hands won ${wins} lost ${losses} / ${N}, ${((Date.now() - t0) / 1000).toFixed(1)}s, max move ${maxMs}ms`);

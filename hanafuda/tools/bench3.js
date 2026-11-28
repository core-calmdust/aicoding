// paired benchmark with configs: every deal is played twice with the seats swapped (same deals for both sides).
// node hanafuda/tools/bench3.js '<cfgA json>' '<cfgB json>' deals seed  -> prints JSON {n, sum, sq, ms}
// a cfg: {"lv":12, ...overrides of level()}  (see ai.js choose(s, lv, seed, cfg))
const HF = require('../engine.js'), AI = require('../ai.js');
const [CA, CB, N, SEED] = [JSON.parse(process.argv[2]), JSON.parse(process.argv[3]), +process.argv[4] || 100, +process.argv[5] || 1];
const O = process.argv[6] ? JSON.parse(process.argv[6]) : {};
let sum = 0, sq = 0, t0 = Date.now(), maxMs = [0, 0], msA = 0, nA = 0;
for (let d = 0; d < N; d++) {
  let pair = 0;
  for (const seatA of [0, 1]) {
    let s = HF.deal(SEED * 100003 + d * 7919, d & 1, O);
    let k = 0;
    while (s.phase !== 'over') {
      const isA = s.turn === seatA, c = isA ? CA : CB, t = Date.now();
      const r = AI.choose(s, c.lv, SEED * 31 + d * 131 + k++ + seatA * 7, c);
      const dt = Date.now() - t; maxMs[isA ? 0 : 1] = Math.max(maxMs[isA ? 0 : 1], dt); if (isA) { msA += dt; nA++; }
      s = HF.apply(s, r.action);
    }
    const res = s.result;
    if (res.winner >= 0) pair += res.winner === seatA ? res.pts : -res.pts;
  }
  sum += pair / 2; sq += (pair / 2) ** 2;
}
console.log(JSON.stringify({ n: N, sum, sq, maxA: maxMs[0], maxB: maxMs[1], avgA: msA / Math.max(1, nA), s: (Date.now() - t0) / 1000 }));

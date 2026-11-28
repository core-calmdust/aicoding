// paired benchmark: every deal is played twice with the seats swapped (less luck).
// node hanafuda/tools/bench2.js A B deals [aiFileA] [aiFileB] [seed]
const HF = require('../engine.js');
const [A, B, N, FA, FB, SEED] = [+process.argv[2], +process.argv[3], +process.argv[4] || 100, process.argv[5], process.argv[6], +process.argv[7] || 1];
const AIA = require(FA ? require('path').resolve(FA) : '../ai.js'), AIB = require(FB ? require('path').resolve(FB) : '../ai.js');
let diff = 0, sq = 0, t0 = Date.now(), maxMs = 0;
for (let d = 0; d < N; d++) {
  let pair = 0;
  for (const seatA of [0, 1]) {
    let s = HF.deal(SEED * 100003 + d * 7919, d & 1, {});
    let k = 0;
    while (s.phase !== 'over') {
      const isA = s.turn === seatA, t = Date.now();
      const r = (isA ? AIA : AIB).choose(s, isA ? A : B, SEED * 31 + d * 131 + k++ + seatA * 7);
      if (isA) maxMs = Math.max(maxMs, Date.now() - t);
      s = HF.apply(s, r.action);
    }
    const res = s.result;
    if (res.winner >= 0) pair += res.winner === seatA ? res.pts : -res.pts;
  }
  diff += pair; sq += pair * pair;
}
const mean = diff / N, sd = Math.sqrt(sq / N - mean * mean), se = sd / Math.sqrt(N);
console.log(`Lv${A}${FA ? '(' + FA.split('/').pop() + ')' : ''} vs Lv${B}${FB ? '(' + FB.split('/').pop() + ')' : ''}: ${(mean / 2).toFixed(2)} ± ${(se / 2).toFixed(2)} pts/hand over ${N * 2} hands, ${((Date.now() - t0) / 1000).toFixed(0)}s, max ${maxMs}ms`);

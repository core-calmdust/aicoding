// 掼蛋 AI arena: node guandan/tools/arena.js A B hands [seed]  — team 0 (seats 0, 2) plays level A, team 1 (seats 1, 3) level B.
// Single hands at a random level, no tribute, seats swapped every other hand (the same deal is played twice with the teams swapped).
'use strict';
const GD = require('../engine.js'); global.GD = GD;
const AI = require('../ai.js');
const [A, B, N, seed] = [+(process.argv[2] || 3), +(process.argv[3] || 1), +(process.argv[4] || 200), +(process.argv[5] || 1)];
let x = seed * 7919 + 1; const rng = () => (x = (x * 16807) % 2147483647) / 2147483647;
let win = [0, 0], pts = [0, 0], ms = [0, 0], dec = [0, 0], maxMs = [0, 0];
for (let h = 0; h < N; h++) {
  const d = GD.shuffled(rng), L = 2 + Math.floor(rng() * 13), first = Math.floor(rng() * 4);
  for (const swap of [0, 1]) {
    const lv = s => (team(s) ^ swap) === 0 ? A : B;   // swap: the same cards, the other team gets them
    const S = { L, lt: -1, hands: [0, 1, 2, 3].map(s => d.filter((_, i) => i % 4 === s)), out: [], turn: first, last: null, passN: 0, trick: 0, log: [], played: [], phase: 'play' };
    let g = 800;
    while (S.phase === 'play' && g-- > 0) {
      const s = S.turn, k = lv(s) === A ? 0 : 1, t0 = process.hrtime.bigint();
      const c = AI.decide(S, s, lv(s), rng);
      const dt = Number(process.hrtime.bigint() - t0) / 1e6; ms[k] += dt; dec[k]++; if (dt > maxMs[k]) maxMs[k] = dt;
      GD.act(S, s, c);
    }
    const f = S.order, w = GD.team(f[0]), pl = f.indexOf(GD.partner(f[0])), up = pl === 1 ? 3 : pl === 2 ? 2 : 1;
    const wk = (w ^ swap) === 0 ? 0 : 1; win[wk]++; pts[wk] += up;
  }
}
function team(s) { return s % 2; }
const tot = win[0] + win[1];
console.log(`Lv${A} vs Lv${B}: hands ${tot}  win ${(win[0] / tot * 100).toFixed(1)}%  levels ${pts[0]}:${pts[1]}  ms/move ${(ms[0] / dec[0]).toFixed(1)} (max ${maxMs[0].toFixed(0)}) / ${(ms[1] / dec[1]).toFixed(1)} (max ${maxMs[1].toFixed(0)})`);

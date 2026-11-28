// AI vs AI: node hearts/tools/arena.js A B hands [seed] [variant]
// Seats 0,2 play level A, seats 1,3 level B. Prints the average points per hand of each side (lower is better).
const HT = require('../engine.js'); global.HT = HT; const AI = require('../ai.js');
const [A, B, N, seed, v] = [+process.argv[2] || 7, +process.argv[3] || 1, +process.argv[4] || 200, +process.argv[5] || 1, process.argv[6] || 'std'];
const rng = AI.mulberry(seed);
let sa = 0, sb = 0, t0 = Date.now(), dec = 0, maxMs = 0, moons = [0, 0];
for (let i = 0; i < N; i++) {
  // play the same deal twice with the seats swapped (less luck)
  const G0 = HT.newGame({ v }); G0.hand = i % 4; const deck = HT.shuffled(rng);
  for (const sw of [0, 1]) {
    const lv = s => (s % 2 === sw) ? A : B;
    const G = HT.newGame({ v }); G.hand = i % 4; const S = HT.deal(G, rng, deck);
    if (S.phase === 'pass') { for (let s = 0; s < 4; s++) S.pass[s] = AI.choosePass(S, s, lv(s), rng); HT.doPass(S); }
    while (S.phase === 'play') { const p = S.turn, t1 = Date.now(); const c = AI.decide(S, p, lv(p), rng); const ms = Date.now() - t1; if (ms > maxMs) maxMs = ms; dec++; HT.play(S, p, c); }
    const r = HT.handScore(S, [0, 0, 0, 0]);
    for (let s = 0; s < 4; s++) { if (lv(s) === A && (s % 2 === sw)) sa += r.delta[s]; else sb += r.delta[s]; }
    if (r.moon >= 0) moons[(r.moon % 2 === sw) ? 0 : 1]++;
  }
}
const n = N * 2 * 2;
console.log(`A=Lv${A} ${(sa / n).toFixed(2)}  B=Lv${B} ${(sb / n).toFixed(2)}  diff ${((sb - sa) / n).toFixed(2)}/hand  moons A${moons[0]} B${moons[1]}  ${((Date.now() - t0) / dec).toFixed(1)}ms/play max ${maxMs}ms`);

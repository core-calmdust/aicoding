// AI against AI at two levels (node; no browser), the way the game plays them: the draft by draftAI, the moves by planAction
// (the look-ahead of Lv.19+ runs a fixed number of playouts here — the time limit is switched off so a run is repeatable).
// node seabattle/tools/level_match.js <levelA> <levelB> [games=100] [seed=1] [mode=std]
// Prints A's win rate; sides and who moves first alternate.
const E = require('../engine.js');
const [A, B] = [+process.argv[2] || 20, +process.argv[3] || 20], G = +process.argv[4] || 100, rnd = E.rng(+process.argv[5] || 1), MODE = process.argv[6] || 'std';
const now = () => 0;   // (never "out of time": every move uses the full playout count R)
let aw = 0, n = 0;
for (let g = 0; g < G; g++) {
  const aSide = g & 1, lv = p => p === aSide ? A : B, d = E.draftNew((g >> 1) & 1, rnd, MODE);
  while (d.turn >= 0) { const k = E.draftAI(d, rnd, lv(d.turn)); E.draftPick(d, k >= 0 ? k : -1); }
  const fleets = [0, 1].map(p => E.randomFleet(rnd, false, d.picks[p]));
  const st = E.newGame({ rule: 'tactics', mode: MODE, adj: false, fleets, first: (g >> 1) & 1 });
  let m = 0; while (st.winner < 0 && m < 900) { const a = E.planAction(st, lv(st.turn), rnd, now); if (!a || !E.act(st, a)) break; m++; }
  if (st.winner >= 0) { n++; if (st.winner === aSide) aw++; }
}
console.log(`Lv.${A} vs Lv.${B}: ${aw}/${n} = ${(100 * aw / n).toFixed(1)}%`);

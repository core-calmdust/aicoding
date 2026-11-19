// タクティクス balance (node; no browser): Lv.20 AI against Lv.20 AI, both drafting from a random field.
// node seabattle/tools/test_tactics_balance.js [games=200] [seed=1]
// Prints, per ship type: how often it is on the table, how often it is picked when on the table, and the win rate of the
// fleets that took it (and that of the fleets that did not, when it was there). Also checks that every game ends and that
// every skill was used. A type is "balanced" when its pick rate is neither ~0 nor ~100% and its win rate sits near 50%.
const E = require('../engine.js');
const G = +process.argv[2] || 200, rnd = E.rng(+process.argv[3] || 1), LV = 20, NT = E.TYPES.length;
const on = new Array(NT).fill(0), pick = new Array(NT).fill(0), won = new Array(NT).fill(0), notW = new Array(NT).fill(0), notN = new Array(NT).fill(0), used = {};
let moves = 0, stuck = 0, firstWins = 0, fleetSize = 0, costSum = 0;
for (let g = 0; g < G; g++) {
  const d = E.draftNew(g & 1, rnd);
  while (d.turn >= 0) { const k = E.draftAI(d, rnd); E.draftPick(d, k >= 0 ? k : -1); }
  const fleets = [0, 1].map(p => E.randomFleet(rnd, false, d.picks[p]));
  const st = E.newGame({ rule: 'tactics', adj: false, fleets, first: g & 1 });
  let n = 0;
  while (st.winner < 0 && n < 400) { const a = E.chooseAction(st, LV, rnd); const r = E.act(st, a); if (!r) { stuck++; break; } if (a.skill) used[a.skill] = (used[a.skill] || 0) + 1; n++; }
  moves += n; if (st.winner === (g & 1)) firstWins++;
  for (let k = 0; k < NT; k++) if (d.f[k]) { on[k]++; for (const p of [0, 1]) { if (d.picks[p].includes(k)) { pick[k] += .5; won[k] += st.winner === p ? 1 : 0; } else { notN[k]++; notW[k] += st.winner === p ? 1 : 0; } } }
  for (const p of [0, 1]) { fleetSize += d.picks[p].length; costSum += E.draftCost(d.picks[p]); }
}
const pc = x => (100 * x).toFixed(0).padStart(3) + '%';
console.log(`games ${G}  moves/game ${(moves / G).toFixed(1)}  stuck ${stuck}  first-mover wins ${pc(firstWins / G)}  fleet ${(fleetSize / G / 2).toFixed(2)} ships, cost ${(costSum / G / 2).toFixed(1)}`);
console.log('type          table  picked  win(with)  win(without)');
for (let k = 0; k < NT; k++) { const T = E.TYPES[k], n = pick[k] * 2; console.log(`${T.k.padEnd(12)} ${pc(on[k] / G)}   ${pc(on[k] ? pick[k] / on[k] : 0)}    ${n ? pc(won[k] / n) : '  - '} (${n})   ${notN[k] ? pc(notW[k] / notN[k]) : '  - '}`); }
console.log('skills used per game:', Object.entries(used).map(([k, v]) => k + ' ' + (v / G).toFixed(2)).join(' · '));

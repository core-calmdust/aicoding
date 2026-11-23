// 大艦隊 (grand) cost tuning: Lv.20 vs Lv.20, flat draft taste. Each round: a type whose fleets win ≥ 53% costs +1, ≤ 47% −1
// (never below 0). Prints the resulting per-type price changes for MODES.grand.cost.   node seabattle/tools/tune_grand.js [games] [rounds]
const E = require('../engine.js'); E.setDraftW(new Array(E.TYPES.length).fill(.8));
const G = +process.argv[2] || 3000, R = +process.argv[3] || 3, HI = +process.argv[4] || .53, NT = E.TYPES.length, cost = E.MODES.grand.cost;
for (let round = 0; round <= R; round++) {
  const rnd = E.rng(1000 + round), on = new Array(NT).fill(0), won = new Array(NT).fill(0); let moves = 0, first = 0;
  for (let g = 0; g < G; g++) {
    const d = E.draftNew(g & 1, rnd, 'grand'); while (d.turn >= 0) { const k = E.draftAI(d, rnd); E.draftPick(d, k >= 0 ? k : -1); }
    const st = E.newGame({ rule: 'tactics', mode: 'grand', adj: false, fleets: [0, 1].map(p => E.randomFleet(rnd, false, d.picks[p])), first: g & 1 });
    let n = 0; while (st.winner < 0 && n < 900) { if (!E.act(st, E.chooseAction(st, 20, rnd))) break; n++; } moves += n; if (st.winner === (g & 1)) first++;
    for (const p of [0, 1]) for (const k of new Set(d.picks[p])) { on[k]++; if (st.winner === p) won[k]++; }
  }
  const wr = on.map((n, k) => n > 60 ? won[k] / n : .5), out = wr.map((w, k) => [E.TYPES[k].k, w]).filter(([, w]) => w >= HI || w <= 1 - HI);
  console.log(`round ${round}: moves ${(moves / G).toFixed(1)} first ${(first / G * 100).toFixed(0)}%  in 47–53%: ${wr.filter(w => w > .47 && w < .53).length}/${NT}  out: ${out.map(([k, w]) => k + ' ' + (w * 100).toFixed(0)).join(', ')}`);
  if (round === R) break;
  for (const [k, w] of out) { const base = E.TYPES.find(t => t.k === k).cost, d = (cost[k] || 0) + (w >= HI ? 1 : -1); if (base + d >= 0) cost[k] = d; if (!cost[k]) delete cost[k]; }
}
console.log('MODES.grand.cost =', JSON.stringify(cost));

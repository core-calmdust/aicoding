// Chained cooldown skills: side 0 opens with two of a type and uses that skill whenever it can (a human's greedy play), else plays as
// Lv.20. Reports its win rate and how many skills it fires per turn.   node seabattle/tools/chain_check.js flagship [games] [mode]
const E = require('../engine.js'); E.setDraftW(new Array(E.TYPES.length).fill(.8));
const key = process.argv[2] || 'flagship', G = +process.argv[3] || 1500, mode = process.argv[4] || 'std', k0 = E.TYPES.findIndex(t => t.k === key), sk = E.TYPES[k0].skill;
for (const copies of [1, 2]) { const rnd = E.rng(5); let won = 0, uses = 0, turns = 0, ksk = 0;
  for (let g = 0; g < G; g++) {
    const d = E.draftNew(g & 1, rnd, mode); d.f[k0] = true; d.pool[k0] = Math.max(2, d.pool[k0] || 0);
    while (d.turn >= 0) { let k; if (d.turn === 0 && d.picks[0].filter(x => x === k0).length < copies && E.draftCan(d, 0, k0)) k = k0; else k = E.draftAI(d, rnd); E.draftPick(d, k >= 0 ? k : -1); }
    const st = E.newGame({ rule: 'tactics', mode, adj: false, fleets: [0, 1].map(p => E.randomFleet(rnd, false, d.picks[p])), first: g & 1 });
    let n = 0, last = -1; while (st.winner < 0 && n < 900) { let a = null;
      if (st.turn === 0) { if (last !== st.log.length) turns++; const i = st.sides[0].ships.findIndex((s, j) => s.t === k0 && E.skillReady(st, 0, j) && E.preview(st, 0, j, -1)); if (i >= 0 && E.NOAIM[sk]) { a = { skill: sk, ship: i, cell: -1 }; ksk++; } }
      if (!a) a = E.chooseAction(st, 20, rnd); if (st.turn === 0 && a.skill) uses++; last = st.log.length; if (!E.act(st, a)) break; n++; }
    if (st.winner === 0) won++; }
  console.log(`${key}×${copies} (${mode}, greedy ${sk}): wins ${(won / G * 100).toFixed(1)}% · skills per game ${(uses / G).toFixed(1)} (${sk} ${(ksk / G).toFixed(1)})`); }

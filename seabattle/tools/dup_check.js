// A fleet that opens its draft with two of one type vs an ordinary draft (Lv.20 vs Lv.20): its win rate and, for jammers, how often
// the other side is left with no skill ready.   node seabattle/tools/dup_check.js jammer [games] [mode]
const E = require('../engine.js'); E.setDraftW(new Array(E.TYPES.length).fill(.8));
const key = process.argv[2] || 'jammer', G = +process.argv[3] || 3000, mode = process.argv[4] || 'std', k0 = E.TYPES.findIndex(t => t.k === key);
const COPIES = +process.argv[5] || 2; const rnd = E.rng(31); let won = 0, jams = 0, lock = 0, turns = 0, len = 0;
for (let g = 0; g < G; g++) {
  const d = E.draftNew(g & 1, rnd, mode); d.f[k0] = true; d.pool[k0] = Math.max(2, d.pool[k0] || 0);
  while (d.turn >= 0) { let k = -1; if (d.turn === 0 && d.picks[0].filter(x => x === k0).length < COPIES && E.draftCan(d, 0, k0)) k = k0; else k = E.draftAI(d, rnd); E.draftPick(d, k >= 0 ? k : -1); }
  const st = E.newGame({ rule: 'tactics', mode, adj: false, fleets: [0, 1].map(p => E.randomFleet(rnd, false, d.picks[p])), first: g & 1 });
  let n = 0; while (st.winner < 0 && n < 900) { const a = E.chooseAction(st, 20, rnd); if (st.turn === 0 && a.skill === 'jam') jams++;
    if (st.turn === 1 && st.cd[1].some((c, i) => c >= 0 && E.skillLive(st, 1, i))) { turns++; if (!st.cd[1].some((c, i) => c === 0 && E.skillLive(st, 1, i))) lock++; }
    if (!E.act(st, a)) break; n++; }
  len += n; if (st.winner === 0) won++;
}
console.log(`${key}×${COPIES} (${mode}): wins ${(won / G * 100).toFixed(1)}% · its skill uses/game ${(jams / G).toFixed(2)} · the foe has nothing ready on ${(lock / Math.max(1, turns) * 100).toFixed(0)}% of its turns · moves ${(len / G).toFixed(0)}`);

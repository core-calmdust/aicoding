// Review of every type taken twice: side 0 opens its draft with one copy, or with two, of a type (same seeds), Lv.20 vs Lv.20.
// The win-rate gain of the second copy and how many skill uses side 0 makes per game show which doubles snowball.
// node seabattle/tools/dup_review.js [games] [mode] [from] [to]   → one line per type
const E = require('../engine.js'); E.setDraftW(new Array(E.TYPES.length).fill(.8));
const G = +process.argv[2] || 1200, mode = process.argv[3] || 'std', from = +process.argv[4] || 0, to = +(process.argv[5] || E.TYPES.length);
function run(k0, copies) { const rnd = E.rng(100 + k0); let won = 0, uses = 0, n2 = 0;
  for (let g = 0; g < G; g++) {
    const d = E.draftNew(g & 1, rnd, mode); d.f[k0] = true; d.pool[k0] = Math.max(2, d.pool[k0] || 0);
    while (d.turn >= 0) { let k; if (d.turn === 0 && d.picks[0].filter(x => x === k0).length < copies && E.draftCan(d, 0, k0)) k = k0; else k = E.draftAI(d, rnd); E.draftPick(d, k >= 0 ? k : -1); }
    if (d.picks[0].filter(x => x === k0).length === copies) n2++;
    const st = E.newGame({ rule: 'tactics', mode, adj: false, fleets: [0, 1].map(p => E.randomFleet(rnd, false, d.picks[p])), first: g & 1 });
    let n = 0; while (st.winner < 0 && n < 900) { const a = E.chooseAction(st, 20, rnd); if (st.turn === 0 && a.skill) uses++; if (!E.act(st, a)) break; n++; }
    if (st.winner === 0) won++; }
  return { w: won / G, u: uses / G, ok: n2 / G }; }
for (let k = from; k < to; k++) { const a = run(k, 1), b = run(k, 2);
  console.log(`${E.TYPES[k].k.padEnd(12)} ${E.TYPES[k].skill || '(' + (Object.keys(E.TYPES[k]).find(x => !['k', 'len', 'cost', 'skill', 'cd'].includes(x)) || '-') + ')'}\t1隻 ${(a.w * 100).toFixed(1)}%\t2隻 ${(b.w * 100).toFixed(1)}%\tΔ ${((b.w - a.w) * 100).toFixed(1)}\tskill uses ${a.u.toFixed(1)}→${b.u.toFixed(1)}\t(2隻成立 ${(b.ok * 100).toFixed(0)}%)`); }

// 大艦隊 check: per-type win rates with the grand prices (fresh seed), game length, first-mover share, and how much the AI's level
// matters on the big sea vs the normal one (Lv.20 vs Lv.N).   node seabattle/tools/grand_check.js [games]
const E = require('../engine.js'); E.setDraftW(new Array(E.TYPES.length).fill(.8));
const G = +process.argv[2] || 4000, NT = E.TYPES.length;
function play(mode, lv, g, rnd, streak) {
  const d = E.draftNew(g & 1, rnd, mode); while (d.turn >= 0) { const k = E.draftAI(d, rnd, d.turn === 0 ? lv[0] : lv[1]); E.draftPick(d, k >= 0 ? k : -1); }
  const st = E.newGame({ rule: 'tactics', mode, streak, adj: false, fleets: [0, 1].map(p => E.randomFleet(rnd, false, d.picks[p])), first: g & 1 });
  let n = 0; while (st.winner < 0 && n < 900) { if (!E.act(st, E.chooseAction(st, lv[st.turn], rnd))) break; n++; } return { d, st, n };
}
const rnd = E.rng(4242), on = new Array(NT).fill(0), won = new Array(NT).fill(0); let moves = 0, first = 0, left = 0, unf = 0;
for (let g = 0; g < G; g++) { const { d, st, n } = play('grand', [20, 20], g, rnd); moves += n; if (st.winner === (g & 1)) first++; if (st.winner < 0) { unf++; if (unf < 3) console.log('unfinished', n, JSON.stringify(st.log.slice(-4)), st.sides.map(s => s.afloat)); continue; } left += st.sides[st.winner].afloat;
  for (const p of [0, 1]) for (const k of new Set(d.picks[p])) { on[k]++; if (st.winner === p) won[k]++; } }
const wr = on.map((n, k) => won[k] / Math.max(1, n));
console.log(`grand: ${G} games, moves/game ${(moves / G).toFixed(1)}, first mover ${(first / G * 100).toFixed(1)}%, winner's ships left ${(left / G).toFixed(2)}, unfinished ${unf}`);
console.log('  win rate with the type: min', (Math.min(...wr) * 100).toFixed(0) + '%', 'max', (Math.max(...wr) * 100).toFixed(0) + '%', ' in 46–54%:', wr.filter(w => w >= .46 && w <= .54).length + '/' + NT, ' outside:', wr.map((w, k) => [E.TYPES[k].k, w]).filter(([, w]) => w < .46 || w > .54).map(([k, w]) => k + ' ' + (w * 100).toFixed(0)).join(', ') || '—');
for (const mode of ['std', 'grand']) for (const lv of [10, 15]) { const r = E.rng(77 + lv); let w = 0; const n = 600; for (let g = 0; g < n; g++) if (play(mode, [20, lv], g, r).st.winner === 0) w++; console.log(`${mode}: Lv.20 beats Lv.${lv} in ${(w / n * 100).toFixed(0)}%`); }
for (const mode of ['std', 'grand']) { const r = E.rng(9); let m = 0; const n = 600; for (let g = 0; g < n; g++) m += play(mode, [20, 20], g, r, true).n; console.log(`${mode} + 連続攻撃: moves/game ${(m / n).toFixed(1)}`); }

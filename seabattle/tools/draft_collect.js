// self-play data for a draft model: random legal drafts, plain Lv.20 play; one JSON line per game
const E = require('../engine.js'); const fs = require('fs');
const N = +process.argv[2], S0 = +process.argv[3], out = process.argv[4];
for (let g = 0; g < N; g++) {
  const rnd = E.rng(S0 + g * 7); const d = E.draftNew(g & 1, rnd); let guard = 0;
  while (d.turn >= 0 && guard++ < 40) { const p = d.turn; const all = E.TYPES.map((_, x) => x).filter(x => E.draftCan(d, p, x)); const k = rnd() < .5 ? E.draftAI(d, rnd) : all.length ? all[rnd() * all.length | 0] : -1; if (!E.draftPick(d, k == null ? -1 : k)) break; }
  if (d.turn >= 0) continue;
  const fleets = [0, 1].map(p => E.randomFleet(rnd, false, d.picks[p]));
  const st = E.newGame({ rule: 'tactics', adj: false, fleets, first: g & 1 }); let m = 0;
  while (st.winner < 0 && m < 400) { const a = E.chooseAction(st, 20, rnd); if (!a || !E.act(st, a)) break; m++; }
  if (st.winner < 0) continue;
  fs.appendFileSync(out, JSON.stringify({ a: d.picks[0], b: d.picks[1], first: g & 1, w: st.winner }) + '\n');
}

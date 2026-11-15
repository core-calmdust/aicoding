// Two skills per seat (許婚 + パートナー, 2026-11-15): what changes against one skill each?
//   node tools/dual-skill-sim.js SCENARIO GAMES LEVEL SEED
// SCENARIO: one   — every seat one skill
//           two   — every seat two skills (what the game does when the player brings a partner)
//           me2   — seat 0 two skills, the others one   (a BOT limited to one skill against a player with two)
//           me1   — seat 0 one skill, the others two
// Skills are random (tier N) for every seat and game; seat 0 is a BOT too (a stand-in for the player).
// Prints seat 0's average place, skill uses, points paid for skills, busts, and how far the scores spread.
const MJGame = require('../game.js'); const { Bot } = require('../ai.js'); const SK = require('../skills.js');
const [scen = 'one', N0 = '200', LV = '1', SEED = '1'] = process.argv.slice(2);
const N = +N0, lv = +LV;
let s = +SEED * 7919 + 13; const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = (not) => { let id; do id = SK.list[(rnd() * SK.list.length) | 0].id; while (id === not); return id; };
const two = k => scen === 'two' || (scen === 'me2' && k === 0) || (scen === 'me1' && k !== 0);
(async () => {
  const S = { games: 0, rank0: 0, place0: [0, 0, 0, 0], uses: 0, uses2: 0, paid: 0, hands: 0, bust: 0, spread: 0, top0: 0, last0: 0, errors: 0 };
  for (let i = 0; i < N; i++) {
    const chars = [0, 1, 2, 3].map(k => { const a = pick(); return two(k) ? { skill: a, tier: 0, skill2: pick(a), tier2: 0 } : { skill: a, tier: 0 }; });
    const g = new MJGame({ agents: [0, 1, 2, 3].map(() => new Bot(lv)), chars, seed: 50000 + +SEED * 100000 + i, rules: { skills: true, length: 'east' },
      ui: async (ev, d) => { if (ev === 'skill') { S.uses++; if (d.slot) S.uses2++; S.paid += d.cost; } if (ev === 'hand-start') S.hands++; } });
    try {
      const rank = await g.run();
      const order = Array.isArray(rank) ? rank : g.ranking();
      const p0 = order.indexOf(0);
      S.games++; S.rank0 += p0 + 1; S.place0[p0]++;
      if (g.scores.some(x => x < 0)) S.bust++;
      const m = g.scores.reduce((a, b) => a + b, 0) / 4; S.spread += Math.sqrt(g.scores.reduce((a, b) => a + (b - m) ** 2, 0) / 4);
    } catch (e) { S.errors++; if (S.errors < 3) console.error(e.stack.split('\n').slice(0, 3).join(' | ')); }
  }
  const G = S.games;
  console.log(JSON.stringify({ scen, lv, games: G, avgPlace0: +(S.rank0 / G).toFixed(3), place0: S.place0,
    usesPerGame: +(S.uses / G).toFixed(2), partnerUsesPerGame: +(S.uses2 / G).toFixed(2), paidPerGame: Math.round(S.paid / G),
    handsPerGame: +(S.hands / G).toFixed(2), bustRate: +(S.bust / G).toFixed(3), scoreSpread: Math.round(S.spread / G), errors: S.errors }));
})();

// Paired simulation: how many points is one use of each skill worth?
// For every trial the same deal is played twice — seat 0 with the skill (BOT policy) and without —
// and the difference in seat 0's points is recorded. Value per use = mean difference over trials where it fired.
//   node tools/skill-value.js [trials] [skills comma] [policy auto|always]
const MJGame = require('../game.js');
const { Bot } = require('../ai.js');
const SK = require('../skills.js');

const N = +process.argv[2] || 600;
const ids = (process.argv[3] || SK.list.map(s => s.id).join(',')).split(',');
const policy = process.argv[4] || 'auto';

function seeded(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

async function hand(id, seed, use) {
  const r = seeded(seed * 7919 + 13);
  Math.random = seeded(seed);
  const bots = [0, 1, 2, 3].map(() => new Bot(3));
  bots[0].policy = use ? policy : 'never';
  for (let k = 1; k < 4; k++) bots[k].policy = 'never';
  const g = new MJGame({ agents: bots, chars: [{ skill: id }, null, null, null], rules: { skills: true }, seed });
  g.kyoku = (r() * 4) | 0;
  g.honba = r() < .25 ? 1 : 0;
  g.kyotaku = r() < .3 ? 1000 * (1 + ((r() * 2) | 0)) : 0;
  let fired = false;
  g.ui = async ev => { if (ev === 'skill') fired = true; };
  const before = g.scores[0] + 0;
  await g.playHand();
  return { d: g.scores[0] - before, fired };
}

(async () => {
  const out = {};
  for (const id of ids) {
    let fired = 0, sum = 0, sum2 = 0, all = 0;
    const t0 = Date.now();
    for (let i = 0; i < N; i++) {
      const seed = 100000 + i;
      const a = await hand(id, seed, true);
      if (!a.fired) continue;
      const b = await hand(id, seed, false);
      const diff = a.d - b.d;
      fired++; sum += diff; sum2 += diff * diff; all += diff;
    }
    const mean = fired ? sum / fired : 0;
    const sd = fired > 1 ? Math.sqrt((sum2 - fired * mean * mean) / (fired - 1)) : 0;
    out[id] = { fired, rate: +(fired / N).toFixed(3), perUse: Math.round(mean), se: Math.round(sd / Math.sqrt(Math.max(1, fired))), perHand: Math.round(all / N), sec: Math.round((Date.now() - t0) / 1000) };
    console.log(id, JSON.stringify(out[id]));
  }
  console.log('RESULT', JSON.stringify(out));
})();

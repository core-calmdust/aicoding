// node tools/sim.js [games] [levels e.g. 3,3,3,3] [skills 0/1]
const MJGame = require('../game.js'); const { Bot } = require('../ai.js'); const SK = require('../skills.js');
const N = +process.argv[2] || 50; const lv = (process.argv[3] || '3,3,3,3').split(',').map(Number); const skills = process.argv[4] !== '0';
const stats = { hands: 0, agari: 0, tsumo: 0, ryuu: 0, abort: 0, yaku: {}, rankSum: [0,0,0,0], riichi: 0, calls: 0, skill: 0, top: [0,0,0,0], tobi: 0, maxHan: 0, errors: 0 };
(async () => {
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const chars = [0,1,2,3].map(k => ({ skill: SK.list[(i * 4 + k) % SK.list.length].id }));
    const g = new MJGame({ agents: lv.map(l => new Bot(l)), chars, seed: 1000 + i, rules: { skills }, ui: async (ev, d) => {
      if (ev === 'hand-start') stats.hands++;
      if (ev === 'agari') { stats.agari++; for (const r of d.results) { if (r.tsumo) stats.tsumo++; for (const [k] of r.res.list) stats.yaku[k] = (stats.yaku[k] || 0) + 1; stats.maxHan = Math.max(stats.maxHan, r.res.han); } 
        const sum = d.delta.reduce((a, b) => a + b, 0); }
      if (ev === 'ryuukyoku') { if (d.abort) stats.abort++; else stats.ryuu++; }
      if (ev === 'discard' && d.riichi) stats.riichi++;
      if (ev === 'call') stats.calls++;
      if (ev === 'skill') stats.skill++;
    }});
    try {
      const rank = await g.run();
      rank.forEach((s, r) => stats.rankSum[s] += r + 1);
      stats.top[rank[0]]++;
      const total = g.scores.reduce((a, b) => a + b, 0) + g.kyotaku;
      if (total !== 100000) console.log('POINT LEAK', total, g.scores, g.kyotaku);
      if (g.scores.some(x => x < 0)) stats.tobi++;
    } catch (e) { stats.errors++; console.log('ERR', i, e.stack); if (stats.errors > 3) break; }
  }
  console.log(JSON.stringify(Object.assign({}, stats, { yaku: Object.entries(stats.yaku).sort((a,b)=>b[1]-a[1]).slice(0,30) })), (Date.now()-t0)+'ms');
})();

// 自動対局（違反チェック）：node gbmj/tools/selfplay.js 試合数 [seed]
'use strict';
const GB = require('../engine.js'); const { GBMatch } = require('../game.js'); const AI = require('../ai.js');
const N = +process.argv[2] || 20; let seed = +process.argv[3] || 1;
const lv = (process.argv[4] || '10,10,10,10').split(',').map(Number);
const st = { hands: 0, wins: 0, tsumo: 0, draws: 0, falsehu: 0, err: 0, pts: 0, byLv: [0, 0, 0, 0], deal: [0, 0, 0, 0], low: 0, fans: {} };
const t0 = Date.now();
for (let g = 0; g < N; g++) {
  const m = new GBMatch({ seed: seed + g });
  const bots = [0, 1, 2, 3].map(i => AI.create({ level: lv[i], seed: seed * 1000 + g * 4 + i }));
  while (!m.over) {
    const r = m.nextRound();
    let steps = 0;
    try {
      while (r.phase !== 'end') {
        r.audit();
        for (const p of r.waiting()) {
          if (r.phase === 'end') break;
          const opts = r.options(p);
          const a = bots[p].decide(r, p, opts);
          if (!opts.some(o => o.type === a.type && (o.id === undefined || o.id === a.id) && (o.t === undefined || o.t === a.t))) throw new Error('illegal action ' + JSON.stringify(a));
          if (a.type === 'hu' && a.low) throw new Error('AI false hu');
          r.act(p, a);
        }
        if (++steps > 2000) throw new Error('loop');
      }
      r.audit();
    } catch (e) { st.err++; console.error('ERR game', g, 'hand', m.no, e.message); r.result = r.result || { type: 'draw', pay: [0, 0, 0, 0] }; r.phase = 'end'; }
    st.hands++;
    if (r.result.type === 'win') {
      st.wins++; if (r.result.how === 'tsumo') st.tsumo++; st.pts += r.result.fan.total; st.byLv[r.result.p]++;
      if (r.result.fan.pts < 8) st.low++;
      for (const f of r.result.fan.fans) st.fans[f.id] = (st.fans[f.id] || 0) + 1;
    } else st.draws++;
    st.falsehu += r.log.filter(e => e.ev === 'falsehu').length;
    m.finishRound(r);
  }
  const tp = m.tablePoints(); for (let i = 0; i < 4; i++) st.deal[i] += tp[i];
}
const G = require('../fan.js');
console.log(`試合 ${N}・局 ${st.hands}：和了 ${(100 * st.wins / st.hands).toFixed(1)}%（ツモ ${(100 * st.tsumo / Math.max(1, st.wins)).toFixed(0)}%）、流局 ${(100 * st.draws / st.hands).toFixed(1)}%、平均 ${(st.pts / Math.max(1, st.wins)).toFixed(1)}点`);
console.log(`違反 ${st.err}・誤和了 ${st.falsehu}・8点未満の和了 ${st.low}・席ごとの和了 ${st.byLv.join('/')}・順位点 ${st.deal.join('/')}・${((Date.now() - t0) / 1000).toFixed(1)}秒`);
console.log('番の出現（和了あたり%）：' + Object.entries(st.fans).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([id, n]) => G.FANS[id][2] + ' ' + (100 * n / st.wins).toFixed(1)).join('、'));

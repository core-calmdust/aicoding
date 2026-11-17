// 頭ハネの検査 (2026-11-18): BOT対局で2人が同じ牌にロンする場面を作り、和了が手番の早い1人だけになることを確かめる。qa.js の static から呼ぶ
const G = require(process.argv[2] + '/game.js'), { Bot } = require(process.argv[2] + '/ai.js');
(async () => { let multi = 0, bad = 0, wrong = 0;
  for (let seed = 1; seed <= 200 && multi < 3; seed++) {
    const pend = new Map();
    const agents = [0, 1, 2, 3].map(() => { const b = new Bot(1); const r = b.react.bind(b);
      b.react = (g, s, o) => { if (o.canRon) { const k = o.from + ':' + o.tile; (pend.get(k) || pend.set(k, []).get(k)).push(s); return Promise.resolve({ act: 'ron' }); } return r(g, s, o); }; return b; });
    const g = new G({ agents, rules: { length: 'east', skills: false }, seed, oya: 0, ui: async (ev, d) => {
      if (ev !== 'agari' || d.results[0].tsumo) return; if (d.results.length > 1) bad++;
      const from = d.results[0].from, k = from + ':' + d.results[0].winId, c = pend.get(k) || [];
      if (c.length === 2) { multi++; const first = c.slice().sort((a, b) => ((a - from + 4) % 4) - ((b - from + 4) % 4))[0]; if (d.results[0].seat !== first) wrong++; } } });
    try { await g.run(); } catch (e) { console.log('ERR', seed, e.message); }
  }
  console.log(JSON.stringify({ multi, bad, wrong })); process.exit(multi && !bad && !wrong ? 0 : 1);
})();

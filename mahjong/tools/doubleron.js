// ダブロンの検査 (2026-11-18, ユーザー「ダブロンはありにします」): BOT対局で2人が同じ牌にロンする場面を作り、2人とも和了になることを確かめる。
// qa.js の static から呼ぶ。使い方: node doubleron.js <mahjong のフォルダ>
const G = require(process.argv[2] + '/game.js'), { Bot } = require(process.argv[2] + '/ai.js');
(async () => { let multi = 0, bad = 0;
  for (let seed = 1; seed <= 300 && multi < 3; seed++) {
    let pend = [];
    const agents = [0, 1, 2, 3].map(() => { const b = new Bot(1); const r = b.react.bind(b);
      b.react = (g, s, o) => { if (o.canRon) { pend.push(s); return Promise.resolve({ act: 'ron' }); } return r(g, s, o); }; return b; });
    const g = new G({ agents, rules: { length: 'east', skills: false }, seed, oya: 0, ui: async (ev, d) => {
      if (ev === 'discard') pend = [];
      if (ev !== 'agari' || d.results[0].tsumo || pend.length !== 2) return;
      multi++; const from = d.results[0].from, ord = q => (q - from + 4) % 4, want = pend.slice().sort((a, b) => ord(a) - ord(b));
      if (d.results.map(x => x.seat).join() !== want.join()) bad++; } });
    try { await g.run(); } catch (e) { console.log('ERR', seed, e.message); bad++; }
  }
  console.log(JSON.stringify({ multi, bad })); process.exit(multi && !bad ? 0 : 1);
})();

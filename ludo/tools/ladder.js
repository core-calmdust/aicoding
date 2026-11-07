// node ludo/tools/ladder.js [games per level] → Elo of each AI level against Lv.10 in two-player ludo (the rated games' setup)
const E = require('../engine.js');
let rs = 99; const rnd = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
const N = +process.argv[2] || 400, out = [0];
for (let lv = 1; lv <= 20; lv++) {
  let w = 0;
  for (let g = 0; g < N; g++) {
    let s = E.newGame({ rule: 'ludo', players: 2, first: g % 2 ? 2 : 0 }); const L = { 0: lv, 2: 10 }; let n = 0;
    while (!s.over && n < 3000) { const t = E.rollThrow('ludo', rnd); s = E.apply(s, E.think(s, t, L[s.turn], rnd).move, t).state; n++; }
    if (s.winner === 0) w++;
  }
  const p = Math.min(.99, Math.max(.01, w / N)), elo = Math.round(1000 + 400 * Math.log10(p / (1 - p)));
  out.push(elo); console.log(lv, (w / N).toFixed(3), elo);
}
console.log(JSON.stringify(out));

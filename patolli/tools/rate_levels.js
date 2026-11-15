// レート戦で使う各レベルのAIのレート（app.js の RT_LV）を自己対局から決める（node tools/rate_levels.js [局数]）。
// 隣り合うレベルどうしをベルの復元で対局させ（先後を入れ替える）、勝率から Elo の差を出して積み上げる。Lv.1＝800（R1000 から始まる人が Lv.14 前後と当たる位置）。
// 豆の運が大きいので差は小さい。局数が少ないとぶれるので、差は 10〜90 の範囲に丸めている。
const E = require('../engine.js');
function rng(seed) { let x = seed | 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; }
const N = +process.argv[2] || 600, rnd = rng(4242), out = [0, 800];
for (let lv = 2; lv <= 20; lv++) {
  let w = 0;
  for (let g = 0; g < N; g++) {
    let s = E.newGame('bell', { first: g & 1 });
    while (s.winner < 0) { const d = E.rollDice(rnd), m = E.think(s, d.n, s.turn === 0 ? lv : lv - 1, { rng: rnd }); s = E.apply(s, m, d.n).state; }
    if (s.winner === 0) w++;
  }
  const p = Math.min(.95, Math.max(.05, w / N)), d = Math.max(10, Math.min(90, Math.round(400 * Math.log10(p / (1 - p)))));
  out.push(out[lv - 1] + d); console.log('Lv' + lv, 'vs Lv' + (lv - 1), (w / N * 100).toFixed(1) + '%', '+' + d);
}
console.log('const RT_LV = [' + out.map(x => Math.round(x / 5) * 5).join(', ') + '];');

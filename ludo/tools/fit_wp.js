// node ludo/tools/fit_wp.js [games] → logistic fit of win chance vs evaluate() (per rule × number of sides), for coach / review.
// Self-play at Lv.12–20 (mixed); every position before a throw gives (x = evaluate for the side to move, y = that side won).
const E = require('../engine.js');
let rs = 7; const rnd = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
const N = +process.argv[2] || 300;
const out = {};
for (const [rule, players] of [['ludo', 2], ['ludo', 3], ['ludo', 4], ['pachisi', 2], ['pachisi', 4]]) {
  const X = [], Y = [];
  for (let g = 0; g < N; g++) {
    let s = E.newGame({ rule, players, first: [0, 1, 2, 3][g % 4] }); const lv = [0, 1, 2, 3].map(() => 12 + Math.floor(rnd() * 9)); const rec = [];
    let n = 0;
    while (!s.over && n < 2500) { const t = E.rollThrow(rule, rnd); if (n % 2 === 0) rec.push([E.evaluate(s, s.team[s.turn]), s.team[s.turn]]); s = E.apply(s, E.think(s, t, lv[s.turn], rnd).move, t).state; n++; }
    if (!s.over) continue;
    rec.forEach(([x, tm]) => { X.push(x); Y.push(tm === s.winner ? 1 : 0); });
  }
  // logistic regression y ~ σ(a·x + b)
  let a = .02, b = 0; const lr = .5;
  const sx = 100; // scale
  for (let it = 0; it < 3000; it++) {
    let ga = 0, gb = 0;
    for (let i = 0; i < X.length; i++) { const p = 1 / (1 + Math.exp(-(a * X[i] / sx * sx + b))); const d = p - Y[i]; ga += d * X[i] / sx; gb += d; }
    a -= lr * ga / X.length / sx; b -= lr * gb / X.length;
  }
  const base = Y.reduce((p, q) => p + q, 0) / Y.length;
  out[rule + players] = { a: +a.toFixed(5), b: +b.toFixed(4) };
  console.log(rule, players, 'n', X.length, 'base', base.toFixed(3), 'a', a.toFixed(5), 'b', b.toFixed(4), 'p(x=0)', (1 / (1 + Math.exp(-b))).toFixed(3), 'p(x=50)', (1 / (1 + Math.exp(-(a * 50 + b)))).toFixed(3));
}
console.log(JSON.stringify(out));

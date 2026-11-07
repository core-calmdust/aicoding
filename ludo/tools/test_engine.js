// node ludo/tools/test_engine.js — sanity checks and AI self-play
const E = require('../engine.js');
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exitCode = 1; } };
// pachisi path: 84 steps, castles, the 25-from-home castle on the third arm's end
for (let seat = 0; seat < 4; seat++) {
  const cells = []; for (let p = 0; p < 84; p++) cells.push(E.cellOf('pachisi', seat, p));
  assert(cells[83] === 999, 'home');
  assert(cells[7] === seat * 100 + 18 && cells[75] === seat * 100 + 18, 'own end twice');
  assert(cells[83 - 25] === ((seat + 3) % 4) * 100 + 18, 'castle 25 from home ' + cells[58]);
  const loop = new Set(cells.slice(7, 76)); assert(loop.size === 68, 'loop 68 got ' + loop.size);
}
// ludo: start squares, home column
assert(E.cellOf('ludo', 1, 0) === 13 && E.cellOf('ludo', 3, 50) === (39 + 50) % 52, 'ludo track');
// probabilities
const sp = E.COWRIE.reduce((a, t) => a + t.p, 0); assert(Math.abs(sp - 1) < 1e-9, 'cowrie p');
// self-play
function play(opts, lv, seed) {
  let x = seed; const rng = () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; };
  let s = E.newGame(opts), n = 0;
  while (!s.over && n < 4000) {
    const t = E.rollThrow(s.rule, rng);
    const L = lv[s.ctrl[s.turn]];
    const { move } = E.think(s, t, L, rng);
    s = E.apply(s, move, t).state; n++;
  }
  return { s, n };
}
for (const [opts, lv, name] of [[{ rule: 'ludo', players: 4 }, [20, 1, 1, 1], 'ludo4 L20 vs 3×L1'], [{ rule: 'ludo', players: 2 }, [20, 5], 'ludo2 L20 vs L5'], [{ rule: 'ludo', players: 2 }, [12, 12], 'ludo2 L12 mirror'],
  [{ rule: 'pachisi', players: 2 }, [20, 1], 'pachisi2 L20 vs L1'], [{ rule: 'pachisi', players: 2 }, [20, 8], 'pachisi2 L20 vs L8'], [{ rule: 'pachisi', players: 4 }, [12, 12, 12, 12], 'pachisi4 mirror']]) {
  const G = +process.argv[2] || 60; let w = {}, len = 0, t0 = Date.now();
  for (let g = 0; g < G; g++) { const { s, n } = play(Object.assign({ first: [0, 1, 2, 3][g % (opts.players === 3 ? 3 : opts.rule === 'pachisi' ? 4 : opts.players === 2 ? 1 : 4)] * (opts.players === 2 && opts.rule === 'ludo' ? 2 : 1) }, opts), lv, 1000 + g); const wc = s.over ? s.winner : 'none'; w[wc] = (w[wc] || 0) + 1; len += n; }
  console.log(name.padEnd(24), JSON.stringify(w), 'avg plies', Math.round(len / G), (Date.now() - t0) + 'ms');
}

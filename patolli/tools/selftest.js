// ルールの自己検査と自動対局。  node tools/selftest.js [局数]
const E = require('../engine.js'); const assert = require('assert');
function rng(seed) { let x = seed | 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; }
for (const id of ['bell', 'popular']) {
  const R = E.RULES[id];
  // 盤：全マスが別々の格子に乗り、種類の数が合う
  const seen = new Set(), cnt = { c: 0, e: 0, p: 0, '': 0 };
  for (let q = 0; q < R.N; q++) { const [r, c] = E.rcOfQ(R, q); assert(r >= 0 && c >= 0 && r <= 2 * R.arm + 1 && c <= 2 * R.arm + 1); seen.add(r + ',' + c); cnt[E.kindQ(R, q)]++; }
  assert.strictEqual(seen.size, R.N); assert.strictEqual(cnt.c, 4); assert.strictEqual(cnt.e, 8); assert.strictEqual(cnt.p, 8);
  for (let q = 0; q < R.N; q++) { const a = E.rcOfQ(R, q), b = E.rcOfQ(R, (q + 1) % R.N); assert.strictEqual(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]), 1, 'adjacent ' + q); }
  console.log(id, 'board N=' + R.N, 'L=' + R.L, 'ok');
}
assert.strictEqual(E.RULES.bell.N, 60); assert.strictEqual(E.RULES.popular.N, 52);
assert(Math.abs(E.PROB.reduce((a, b) => a + b, 0) - 1) < 1e-12);
{ // ベル：最初の駒はどの目でも入り、盤に駒があれば「1」だけ
  let s = E.newGame('bell'); let ms = E.legalMoves(s, 3); assert(ms.length === 1 && ms[0].enter && ms[0].to === 3);
  s = E.apply(s, ms[0], 3).state; s.turn = 0; ms = E.legalMoves(s, 3); assert(ms.length === 1 && !ms[0].enter && ms[0].to === 6);
  ms = E.legalMoves(s, 1); assert(ms.some(m => m.enter && m.to === 1));
  // 動けないと場へ罰金1
  s.pos[0] = [59, 60, 60, 60, 60, 60]; const g = s.gold[0], pl = s.pool; assert.strictEqual(E.legalMoves(s, 3).length, 0);
  const r = E.apply(s, null, 3); assert.strictEqual(r.state.gold[0], g - 1); assert.strictEqual(r.state.pool, pl + 1);
  const r0 = E.apply(s, null, 0); assert.strictEqual(r0.state.gold[0], g);           // 0の目は罰金なし
  const w = E.apply(s, E.legalMoves(s, 1)[0], 1); assert.strictEqual(w.state.winner, 0); assert.strictEqual(w.state.pool, 0);
  assert.strictEqual(w.state.gold[0], g + 1 + pl);
}
{ // 広く知られたルール：入るのは「1」だけ、中央でだけ取れる、0の目は供え物
  let s = E.newGame('popular'); assert.strictEqual(E.legalMoves(s, 3).length, 0); assert(E.legalMoves(s, 1)[0].enter);
  const z = E.apply(s, null, 0); assert.strictEqual(z.state.gold[0], 5); assert.strictEqual(z.state.pool, 1);
  const R = E.RULES.popular; s.pos[1][0] = 27;   // side1 の 27 マス目＝周回 26＝side0 の出発マス（中央）
  assert.strictEqual(E.qOf(R, 1, 27, 1), E.qOf(R, 0, 1, 1));
  const m = E.legalMoves(s, 1)[0]; assert(m.capture); const r = E.apply(s, m, 1); assert.strictEqual(r.state.pos[1][0], 0); assert.strictEqual(r.state.gold[0], 7);
  s.pos[1][0] = 0; s.pos[0][0] = 1; s.pos[1][1] = 30; s.turn = 0;   // 中央以外は相手の駒に止まれない
  assert.strictEqual(E.qOf(R, 1, 30, 1), E.qOf(R, 0, 4, 1)); assert(!E.legalMoves(s, 3).some(m => m.from === 1));
}
const N = +process.argv[2] || 200;
for (const id of ['bell', 'popular']) for (const [la, lb] of [[1, 1], [10, 10], [15, 5], [5, 15], [19, 8], [8, 19]]) {
  const rnd = rng(12345 + la * 31 + lb); let w = [0, 0], plies = 0, mx = 0, rounds = 0; const t0 = Date.now();
  for (let g = 0; g < N; g++) {
    let s = E.newGame(id, { first: g & 1 }), n = 0;
    while (s.winner < 0) { const d = E.rollDice(rnd); const m = E.think(s, d.n, s.turn === 0 ? la : lb, { rng: rnd }); assert(m || !E.legalMoves(s, d.n).length); s = E.apply(s, m, d.n).state; if (++n > 20000) throw new Error('no end ' + id); }
    assert(s.gold[0] + s.gold[1] + s.pool === 2 * E.RULES[id].gold, 'gold conserved');
    w[s.winner]++; plies += n; mx = Math.max(mx, n); rounds += s.round;
  }
  console.log(id, 'Lv' + la, 'vs Lv' + lb, w.join('-'), 'avg throws', (plies / N) | 0, 'max', mx, 'rounds', (rounds / N).toFixed(2), (Date.now() - t0) + 'ms');
}
console.log('selftest OK');

// patolli/puzzles.json の点検（node tools/audit_puzzles.js）。エンジンで全問を調べ直す：
//  - 手はすべて合法、best は ok に入っている、ev は全部の合法手
//  - 2投げ先まで読んだ勝率で best が1位、2番目との差が 0.04 以上（ok に入れた同点の手は除く）、3投げ先でも1位
//  - 誤答の説明（ng）がすべての手にある、文言に ja / en がある、id が重ならない、テーマは20問以上（上がりの10問のテーマを除く）
const C = require('./learn_common.js'), E = C.E, P = require('../puzzles.json'), assert = require('assert');
let n = 0, minGap = 1; const ids = new Set();
const two = o => { assert(o && typeof o.ja === 'string' && o.ja && typeof o.en === 'string' && o.en, 'text ja/en'); };
for (const k in P.ui) two(P.ui[k]); for (const k in P.msg) two(P.msg[k]); P.cats.forEach(c => two(c.name));
for (const T of P.themes) {
  two(T.name); two(T.desc); two(T.hint); assert(P.cats.some(c => c.id === T.cat), 'cat ' + T.id);
  assert(T.puzzles.length >= (T.id === 'pgoal' ? 10 : 20), 'too few in ' + T.id + ': ' + T.puzzles.length);
  for (const z of T.puzzles) {
    assert(!ids.has(z.id), 'dup ' + z.id); ids.add(z.id); n++;
    const st = C.unpack(z.s); assert.strictEqual(st.rule, T.rule); assert.strictEqual(st.gold[0] + st.gold[1] + st.pool, 2 * E.RULES[st.rule].gold, 'gold ' + z.id);
    const ms = E.legalMoves(st, z.n); assert(ms.length >= 2, 'moves ' + z.id); assert.strictEqual(z.ev.length, ms.length, 'ev ' + z.id);
    assert(z.ok.some(a => a[0] === z.best[0] && a[1] === z.best[1]), 'best in ok ' + z.id);
    for (const a of z.ok) assert(ms.some(m => m.from === a[0] && m.to === a[1]), 'legal ' + z.id);
    const e2 = E.evaluate(st, z.n, 2), e3 = E.evaluate(st, z.n, 3);
    assert.strictEqual(e2[0].move.from, z.best[0], 'best d2 ' + z.id); assert.strictEqual(e3[0].move.from, z.best[0], 'best d3 ' + z.id);
    const rest = e2.filter(e => !z.ok.some(a => a[0] === e.move.from)); assert(rest.length, 'all ok? ' + z.id);
    const gap = e2[0].wp - rest[0].wp; assert(gap >= 0.04 - 1e-9, 'gap ' + z.id + ' ' + gap); minGap = Math.min(minGap, gap);
    for (const e of rest) assert(z.ng[String(e.move.from)] && P.msg[z.ng[String(e.move.from)][0]], 'ng ' + z.id);
    assert(P.msg[z.why[0]], 'why ' + z.id);
  }
  console.log(T.id.padEnd(8), T.rule.padEnd(8), T.puzzles.length);
}
for (const d of P.daily) assert(P.themes.some(T => T.id === d), 'daily ' + d);
console.log('audit OK:', n, 'puzzles, smallest gap', minGap.toFixed(3));

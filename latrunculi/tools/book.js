// Opening book for the placing phase (2026-11-19): the first placement and every reply to it, each found by a long search
// (nk thousand nodes), the board's 8 symmetries folded together. Writes book.js (self.LT_BOOK = { rule: { key: move } }).
//   node tools/book.js <rule> <nk> [out.json]      (seneca / piso; quintana has no placing)
const fs = require('fs'), path = require('path');
const E = require(path.resolve(__dirname, '../engine.js'));
const [, , rule, nk = '1000', out] = process.argv;
E.setRule(rule);
const res = {};
const keyOf = pos => E.bookKey(pos);
const todo = [];
{ const p = E.Pos.from(null); todo.push([]); }
const seen = new Set();
const p0 = E.Pos.from(null);
for (const m of p0.moves()) { const q = p0.clone().play(m), k = keyOf(q); if (seen.has(k.key)) continue; seen.add(k.key); todo.push([m]); }
// ply 2: Black's second placement after the book's own first placement and any reply
{ E.ttClear(); const r0 = E.thinkCfg(null, [], { s: 1, nk: +nk }, rule), p1 = E.Pos.from(null).play(r0.move), seen2 = new Set();
  for (const m of p1.moves()) { const q = p1.clone().play(m), k = keyOf(q); if (seen2.has(k.key)) continue; seen2.add(k.key); todo.push([r0.move, m]); } }
let i = 0;
for (const moves of todo) {
  E.ttClear();
  const pos = E.Pos.from(null); for (const m of moves) pos.play(m);
  const k = keyOf(pos);
  const r = E.thinkCfg(null, moves, { s: 1, nk: +nk }, rule);
  res[k.key] = E.bookMove(r.move, k.t);   // stored in the canonical orientation
  process.stdout.write(`\r${rule} ${++i}/${todo.length}   `);
}
const file = out || `/tmp/lt/book_${rule}.json`;
fs.writeFileSync(file, JSON.stringify(res));
console.log('\n' + file, Object.keys(res).length);

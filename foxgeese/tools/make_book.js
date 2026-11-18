// node foxgeese/tools/make_book.js <rule> <first: 1 fox | 2 geese> <ms per position> <own moves> <out.json> [both|fox|geese]
// The opening book (2026-11-19): from the standard start, every position the book's side (each side in turn) can reach in its
// first <own moves> moves against ANY reply, the move a long search (Lv.19-style, <ms> per position) chose. Merge the outputs and
// put them into engine.js with tools/pack_book.js.
const path = require('path'), fs = require('fs');
process.env.FG_NOBOOK = '1';
const E = require(path.join(__dirname, '..', 'engine.js'));
const [rule = 'g15', fs1 = '1', ms = '1500', own = '3', out = 'book.json', sides = 'both'] = process.argv.slice(2);   // sides: both | fox | geese
E.setRule(rule); E.setFirst(+fs1 === 2 ? E.P2 : E.P1); E.LEVELS[30] = { s: 1, ms: +ms };
const book = {}, seen = new Set();
let n = 0; const t0 = Date.now();
function visit(moves, bookSide) {
  const { pos } = E.replay(null, moves), key = E.bookKey(pos);
  if (E.judge(pos).over) return;
  const ownDone = bookSide === E.first ? Math.ceil(moves.length / 2) : Math.floor(moves.length / 2);   // the book side's moves played so far
  if (pos.turn === bookSide) {
    if (ownDone >= +own) return;
    if (seen.has(key + bookSide)) return; seen.add(key + bookSide);
    let m = book[key];
    if (m === undefined) {
      const all = pos.moves(); if (!all.length) return;
      m = all.length === 1 ? all[0] : E.think(null, moves, 30).move; book[key] = m; n++;
      if (n % 20 === 0) console.error(`${n} positions, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
    }
    visit(moves.concat([m]), bookSide);
  } else {
    if (ownDone >= +own) return;
    for (const r of pos.moves()) visit(moves.concat([r]), bookSide);
  }
}
for (const side of sides === 'fox' ? [E.P1] : sides === 'geese' ? [E.P2] : [E.P1, E.P2]) { E.ttClear(); visit([], side); }
fs.writeFileSync(out, JSON.stringify({ rule, first: +fs1, ms: +ms, own: +own, book }));
console.error(`done: ${n} positions in ${((Date.now() - t0) / 60000).toFixed(1)} min → ${out}`);

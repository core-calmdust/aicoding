// Opening book: from the starting position, every position reached by near-best moves (within MARGIN of the best,
// at most 2 per position) up to PLIES deep, plus Black's replies to each of White's five first moves, analysed for
// MS milliseconds each. Output ../book.json: { "<Pos.key()>": [best moves] }. node tools/gen_book.js [plies] [ms]
'use strict';
const fs = require('fs'), path = require('path');
const { init } = require('./lib.js');
const PLIES = +(process.argv[2] || 7), MS = +(process.argv[3] || 15000), MARGIN = 12;
(async () => {
  const E = await init();
  const book = {}, seen = new Set(); let n = 0;
  const t0 = Date.now();
  const visit = (moves, depth, wide) => {
    const { pos } = E.replay(null, moves), k = pos.key();
    if (seen.has(k) || depth > PLIES) return; seen.add(k);
    const all = pos.moves(); if (!all.length) return;
    let list;
    if (all.length === 1) list = [{ m: all[0], v: 0 }];
    else list = E.analyze(null, moves, MS).list.slice().sort((a, b) => b.v - a.v);
    const good = list.filter(e => e.v >= list[0].v - MARGIN).slice(0, 2);
    book[k] = good.map(e => e.m); n++;
    console.error(n, ((Date.now() - t0) / 1000 | 0) + 's', moves.join(' ') || '(start)', '→', book[k].join(' '), list[0].v);
    fs.writeFileSync(path.join(__dirname, '..', 'book.json'), JSON.stringify(book));
    const next = wide ? all : good.map(e => e.m);
    for (const m of next) visit(moves.concat([m]), depth + 1, false);
  };
  visit([], 0, true);   // all five first moves are followed (Black's replies to each)
  console.error('positions', n);
})();

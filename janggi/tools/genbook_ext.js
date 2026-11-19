// Deepen janggi/book.json (2026-11-20): the trees of the 16 set-ups ("<FEN>|m1,m2,…") grow from their deepest positions along
// the best moves, with the same rule as shared/tools/genbook.js (the page's worker analyses each new position for --ms; the
// entry keeps the moves within --margin points of the best). Positions already in the book are not analysed again.
//   node janggi/tools/genbook_ext.js [--plies 5] [--k 2,1] [--ms 5000] [--margin 12] [--workers 2] [--out janggi/book.json]
//     --plies: the deepest ply to analyse; --k: per new ply, how many of a position's best moves are followed (the last value
//     for the deeper plies). Saves after every ply (stop and run again: it goes on from the book as saved).
//   Mac (all cores, deeper): node janggi/tools/genbook_ext.js --plies 8 --k 3,2,2,1,1 --ms 8000 --workers 12
'use strict';
const path = require('path'), fs = require('fs');
const { emuWorker } = require('../../shared/tools/workeremu.js');
const DIR = path.join(__dirname, '..');
const argOf = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const plies = +argOf('plies', 5), KS = String(argOf('k', '2,1')).split(',').map(Number), ms = +argOf('ms', 5000), margin = +argOf('margin', 12);
const NW = +argOf('workers', 2), out = argOf('out', path.join(DIR, 'book.json'));
const E = require(path.join(DIR, 'engine.js'));
const book = JSON.parse(fs.readFileSync(out, 'utf8'));
const over = (st, moves) => { const { pos, hashes } = E.replay(st, moves); return E.judge(pos, hashes).over; };
(async () => {
  const W = Array.from({ length: NW }, () => emuWorker(path.join(DIR, 'engine.js')));
  const t0 = Date.now(); let done = 0;
  const starts = []; for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) starts.push(E.startFen(x, y));
  // the book's deepest ply per set-up: its positions there are the first parents
  const keyOf = (st, moves) => st + '|' + moves.join(',');
  let base = 0;
  for (const k of Object.keys(book.pos)) { const i = k.indexOf('|'); if (i < 0) continue; const r = k.slice(i + 1); base = Math.max(base, r ? r.split(',').length : 0); }
  let parents = [];
  for (const k of Object.keys(book.pos)) {
    const i = k.indexOf('|'); if (i < 0) continue; const st = k.slice(0, i), r = k.slice(i + 1), moves = r ? r.split(',').map(Number) : [];
    if (starts.includes(st) && moves.length === base) parents.push({ st, moves });
  }
  for (let ply = base + 1; ply <= plies; ply++) {
    const K = KS[Math.min(ply - base - 1, KS.length - 1)], level = [];
    for (const { st, moves } of parents) for (const e of (book.pos[keyOf(st, moves)] || []).slice(0, K)) level.push({ st, moves: moves.concat([e[0]]) });
    process.stderr.write(`ply ${ply}: ${level.length} positions (k ${K})\n`);
    let i = 0; const next = [];
    await Promise.all(W.map(async ask => {
      while (i < level.length) {
        const { st, moves } = level[i++], key = keyOf(st, moves);
        if (over(st, moves)) continue;
        if (!book.pos[key]) {
          const r = await ask({ type: 'analyze', start: st, moves, time: ms }), list = (r.list || []).filter(e => e && e.m != null).sort((a, b) => b.v - a.v);
          if (!list.length) continue;
          book.pos[key] = list.filter(e => e.v >= list[0].v - margin).map(e => [e.m, e.v]);
          if (++done % 10 === 0) process.stderr.write(`  ${done} analysed, ${((Date.now() - t0) / 60000).toFixed(1)} min\n`);
        }
        next.push({ st, moves });
      }
    }));
    book.plies = Math.max(book.plies || 0, ply); book.ext = { ms, margin, k: KS.join(','), date: new Date().toISOString().slice(0, 10) };
    fs.writeFileSync(out, JSON.stringify(book));
    parents = next;
  }
  console.log(`${out}: ${Object.keys(book.pos).length} positions, ${done} analysed, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  process.exit(0);
})();

// An opening book from the game's own engine (2026-11-15): the page's worker (shared/tools/workeremu.js) analyses every book
// position for --ms milliseconds; a position's entry keeps the moves within --margin of the best (the levels' "book" variety
// rule), and the tree grows along the --k best of them up to --plies plies. Engine-made, not a human opening theory: the book
// replaces the live analysis the "book" levels did in their first plies (deeper, and the move comes at once).
//   node shared/tools/genbook.js <game> [--rule r] [--plies 6] [--k 3] [--ms 8000] [--margin 12] [--workers 2] [--out file]
//                                       [--starts all] [--merge file]   (--merge: add to an existing book)
//   games: janggi (book.json { v, ms, margin, pos: { "m1,m2,…": [[m, v], …] } }, the default start),
//          ugolki (book-<rule>.json, --rule c33 | c34 | c44 | diag)
'use strict';
const path = require('path'), fs = require('fs');
const { emuWorker } = require('./workeremu.js');
const ROOT = path.resolve(__dirname, '..', '..');
const argOf = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const GAMES = {
  // janggi: the page starts every game from one of the 16 set-ups (FEN): --starts all → a tree for each, keys "<FEN>|m1,m2,…"
  janggi: { rule: 'std', msg: (moves, ms, rule, start) => ({ type: 'analyze', start, moves, time: ms }), out: () => 'book.json',
    starts: E => { const a = []; for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) a.push(E.startFen(x, y)); return a; },
    over: (E, moves, rule, start) => { const { pos, hashes } = E.replay(start, moves); return E.judge(pos, hashes).over; } },
  ugolki: { rule: 'c33', msg: (moves, ms, rule) => ({ type: 'analyze', start: null, moves, time: ms, rule }), out: r => `book-${r}.json`,
    over: (E, moves, rule) => { E.setRule(rule); const { pos, hashes } = E.replay(null, moves); return E.judge(pos, hashes).over; } },
};
const game = process.argv[2], G = GAMES[game];
if (!G) { console.log('usage: node shared/tools/genbook.js <game> [--rule r] [--plies 6] [--k 3] [--ms 8000] [--margin 12] [--workers 2]\ngames: ' + Object.keys(GAMES).join(' ')); process.exit(1); }
const rule = argOf('rule', G.rule), plies = +argOf('plies', 6), K = +argOf('k', 3), ms = +argOf('ms', 8000), margin = +argOf('margin', 12), NW = +argOf('workers', 2);
const dir = path.join(ROOT, game), out = argOf('out', path.join(dir, G.out(rule)));
const E = require(path.join(dir, 'engine.js'));
(async () => {
  const W = Array.from({ length: NW }, () => emuWorker(path.join(dir, 'engine.js')));
  const merge = argOf('merge'), book = merge ? JSON.parse(fs.readFileSync(merge, 'utf8')).pos : {}, t0 = Date.now(); let done = 0;
  const starts = argOf('starts') === 'all' && G.starts ? G.starts(E) : [null];
  let level = starts.map(st => ({ st, moves: [] }));
  for (let ply = 0; ply <= plies && level.length; ply++) {
    const next = []; let i = 0;
    await Promise.all(W.map(async ask => {
      while (i < level.length) {
        const { st, moves } = level[i++];
        if (G.over(E, moves, rule, st)) continue;
        const r = await ask(G.msg(moves, ms, rule, st)), list = (r.list || []).filter(e => e && e.m != null).sort((a, b) => b.v - a.v);
        if (!list.length) continue;
        const good = list.filter(e => e.v >= list[0].v - margin);
        book[(st ? st + '|' : '') + moves.join(',')] = good.map(e => [e.m, e.v]);
        if (ply < plies) for (const e of good.slice(0, K)) next.push({ st, moves: moves.concat([e.m]) });
        if (++done % 10 === 0) process.stderr.write(`ply ${ply}: ${done} positions, ${((Date.now() - t0) / 60000).toFixed(1)} min\n`);
      }
    }));
    level = next;
  }
  fs.writeFileSync(out, JSON.stringify({ v: 1, game, rule, ms, margin, plies, k: K, pos: book }));
  console.log(`${out}: ${Object.keys(book).length} positions, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  process.exit(0);
})();

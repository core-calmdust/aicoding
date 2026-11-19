// An opening book from the game's own engine (2026-11-15): the page's worker (shared/tools/workeremu.js) analyses every book
// position for --ms milliseconds; a position's entry keeps the moves within --margin of the best (the levels' "book" variety
// rule), and the tree grows along the --k best of them up to --plies plies. Engine-made, not a human opening theory: the book
// replaces the live analysis the "book" levels did in their first plies (deeper, and the move comes at once).
//   node shared/tools/genbook.js <game> [--rule r] [--plies 6] [--k 3] [--ms 8000] [--margin 12] [--workers cores-1] [--out file]
//                                       [--starts all] [--merge file]   (--merge: add to an existing book)
//   games: janggi (book.json { v, ms, margin, pos: { "m1,m2,…": [[m, v], …] } }, the default start),
//          ugolki (book-<rule>.json, --rule c33 | c34 | c44 | diag), checkers (book.json),
//          agon (book-<rule>.json, --rule std | place; 2026-11-20, Mac: sh agon/tools/book.sh)
// Parallel (2026-11-20): each of the --workers is its own thread (workeremu.js emuThread: worker_threads, one engine each), so
// N positions are analysed at once on N cores. Before, the "workers" were N copies of the engine in one thread: the analysis is synchronous, so they ran
// one after another (one core). A ply's positions are analysed together; positions reached by another order of moves are analysed
// once (the entry is copied to the other key). The book is written in the order of the tree (ply by ply, parents' move order),
// so 1 worker gives the same book as before and N workers the same keys in the same order (only the timed values differ).
// The work is saved after every ply to <out>.part; stopped and run again with the same settings, it goes on from there
// (positions in it are not analysed again). The finished book replaces <out> and the .part is removed.
'use strict';
const path = require('path'), fs = require('fs');
const { emuThread } = require('./workeremu.js');
const ROOT = path.resolve(__dirname, '..', '..');
const argOf = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const GAMES = {
  // janggi: the page starts every game from one of the 16 set-ups (FEN): --starts all → a tree for each, keys "<FEN>|m1,m2,…"
  janggi: { rule: 'std', msg: (moves, ms, rule, start) => ({ type: 'analyze', start, moves, time: ms }), out: () => 'book.json',
    starts: E => { const a = []; for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) a.push(E.startFen(x, y)); return a; },
    replay: (E, moves, rule, start) => E.replay(start, moves) },
  // checkers (2026-11-17): the levels with "book" (四段・五段, PRO with book); Mac: checkers/tools/book.sh
  checkers: { rule: 'std', msg: (moves, ms) => ({ type: 'analyze', start: null, moves, time: ms }), out: () => 'book.json',
    replay: (E, moves) => E.replay(null, moves) },
  ugolki: { rule: 'c33', msg: (moves, ms, rule) => ({ type: 'analyze', start: null, moves, time: ms, rule }), out: r => `book-${r}.json`,
    replay: (E, moves, rule) => { E.setRule(rule); return E.replay(null, moves); } },
  // agon (2026-11-20): the timed levels (四段 and up, PRO with a time limit) use it — claude/agon-spec.md「AI の序盤ブック」
  agon: { rule: 'std', msg: (moves, ms, rule) => ({ type: 'analyze', start: null, moves, time: ms, rule }), out: r => `book-${r}.json`,
    replay: (E, moves, rule) => { E.setRule(rule); return E.replay(null, moves); } },
};
const game = process.argv[2], G = GAMES[game];
if (!G) { console.log('usage: node shared/tools/genbook.js <game> [--rule r] [--plies 6] [--k 3] [--ms 8000] [--margin 12] [--workers cores-1]\ngames: ' + Object.keys(GAMES).join(' ')); process.exit(1); }
const rule = argOf('rule', G.rule), plies = +argOf('plies', 6), K = +argOf('k', 3), ms = +argOf('ms', 8000), margin = +argOf('margin', 12);
const NW = Math.max(1, +argOf('workers', Math.max(1, require('os').cpus().length - 1)));
const dir = path.join(ROOT, game), out = argOf('out', path.join(dir, G.out(rule))), part = out + '.part';
const E = require(path.join(dir, 'engine.js'));
const look = (moves, st) => {   // → { over, pk }: the game is over / the position's key (transpositions: the same pieces, side and counters)
  const { pos, hashes } = G.replay(E, moves, rule, st);
  return { over: E.judge(pos, hashes).over, pk: [st ? '' : '-', pos.h1, pos.h2, pos.side, moves.length, pos.quiet, pos.free].join(':') };
};
let W = [];
const pool = async jobs => {   // jobs: [msg] → the moves' lists in the same order, NW at a time
  const got = new Array(jobs.length); let next = 0;
  await Promise.all(W.map(async ask => { while (next < jobs.length) { const i = next++, r = await ask(jobs[i]);
    if (r.error) throw new Error(r.error); got[i] = (r.list || []).filter(e => e && e.m != null); } }));
  return got;
};
(async () => {
  const merge = argOf('merge'), t0 = Date.now(); let done = 0;
  const cfg = { game, rule, ms, margin, plies, k: K, merge: merge || null, starts: argOf('starts') || null };
  // the work saved by a stopped run with the same settings (its book, and the keys it has analysed)
  let saved = null;
  if (fs.existsSync(part)) { const p = JSON.parse(fs.readFileSync(part, 'utf8')); if (JSON.stringify(p.cfg) === JSON.stringify(cfg)) saved = p; else process.stderr.write(`${part}: other settings, not used\n`); }
  const book = saved ? saved.pos : merge ? JSON.parse(fs.readFileSync(merge, 'utf8')).pos : {};
  const fresh = new Set(saved ? saved.fresh : []);   // keys analysed in this run (a --merge book's other keys are analysed again)
  const byPos = new Map();
  if (saved) process.stderr.write(`${part}: going on (${fresh.size} positions done)\n`);
  W = Array.from({ length: NW }, () => emuThread(path.join(dir, 'engine.js')));
  const starts = argOf('starts') === 'all' && G.starts ? G.starts(E) : [null];
  let level = starts.map(st => ({ st, moves: [] }));
  for (let ply = 0; ply <= plies && level.length; ply++) {
    const t1 = Date.now();
    // this ply's positions in the tree's order; one analysis per position (another order of moves copies the entry)
    const items = [], need = [], idx = new Map();
    for (const { st, moves } of level) {
      const key = (st ? st + '|' : '') + moves.join(','), { over, pk } = look(moves, st);
      if (over) continue;
      if (fresh.has(key) && book[key] && !byPos.has(pk)) byPos.set(pk, book[key]);
      items.push({ st, moves, key, pk });
      if (!byPos.has(pk) && !idx.has(pk)) { idx.set(pk, need.length); need.push(G.msg(moves, ms, rule, st)); }
    }
    const res = await pool(need);
    const next = [];
    for (const it of items) {
      let good = byPos.get(it.pk);
      if (!good) {
        const list = res[idx.get(it.pk)].sort((a, b) => b.v - a.v);
        if (!list.length) continue;
        good = list.filter(e => e.v >= list[0].v - margin).map(e => [e.m, e.v]);
        byPos.set(it.pk, good);
      }
      book[it.key] = good; fresh.add(it.key);
      if (ply < plies) for (const e of good.slice(0, K)) next.push({ st: it.st, moves: it.moves.concat([e[0]]) });
    }
    done += need.length;
    fs.writeFileSync(part, JSON.stringify({ cfg, fresh: [...fresh], pos: book }));
    process.stderr.write(`ply ${ply}: ${items.length} positions, ${need.length} analysed (${((Date.now() - t1) / 60000).toFixed(1)} min), book ${Object.keys(book).length}, ${((Date.now() - t0) / 60000).toFixed(1)} min\n`);
    level = next;
  }
  fs.writeFileSync(out, JSON.stringify({ v: 1, game, rule, ms, margin, plies, k: K, pos: book }));
  fs.unlinkSync(part);
  console.log(`${out}: ${Object.keys(book).length} positions (${done} analysed, ${NW} workers), ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  process.exit(0);
})();

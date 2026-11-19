// With the opening book against without it (2026-11-20, claude/agon-spec.md「AI の序盤ブック」): the page's worker (engine.js
// in a Node vm, shared/tools/workeremu.js) on both sides, the same time per move (wall clock), each side its own worker (its
// own table). Openings: 1–2 random plies among the book's moves (both sides' games start in the book, so the book side has
// something to use), each opening played twice with the colours swapped. Every --place-th pair is on the 1842 placing rule.
//   node agon/tools/bookmatch.js [--pairs 150] [--ms 100] [--workers 2] [--seed 1] [--place 4] [--log file] [--cfg '{"bookMargin":0}'] [--bookv 1]
//   (the book side's worker reads agon/book-<rule>.json?v=<bookv> even while engine.js BOOK_V is 0: books not shipped yet)
'use strict';
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..');
const E = require(path.join(DIR, 'engine.js'));
if (!isMainThread) {
  const { emuWorker } = require('../../shared/tools/workeremu.js');
  const A = emuWorker(path.join(DIR, 'engine.js'), '?book=' + workerData.bookV), B = emuWorker(path.join(DIR, 'engine.js'));   // A: with the book, B: without
  const ms = workerData.ms;
  parentPort.on('message', async j => {
    E.setRule(j.rule);
    await A({ type: 'newgame', rule: j.rule }); await B({ type: 'newgame', rule: j.rule });
    const moves = j.open.slice(); let bookN = 0, res = null;
    for (;;) {
      const { pos, hashes } = E.replay(null, moves), jd = E.judge(pos, hashes);
      if (jd.over) { res = jd.draw ? 0 : jd.winner; break; }
      const bookSide = pos.turn === j.bookColor, ask = bookSide ? A : B;
      const r = await ask({ type: 'think', start: null, moves, level: 19, rule: j.rule, cfg: Object.assign({ s: 1, d: 99, ms }, bookSide ? Object.assign({ book: 1 }, workerData.more) : {}) });
      if (r.move == null || r.move < 0) { res = 0; break; }
      if (r.book) bookN++;
      moves.push(r.move);
    }
    parentPort.postMessage({ i: j.i, score: res === 0 ? 0.5 : res === j.bookColor ? 1 : 0, plies: moves.length, bookN, rule: j.rule });
  });
  return;
}
const argOf = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const pairs = +argOf('pairs', 150), ms = +argOf('ms', 100), NW = +argOf('workers', 2), placeEvery = +argOf('place', 4), logF = argOf('log');
let seed = +argOf('seed', 1) >>> 0;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const BOOK = {}; for (const r of ['std', 'place']) { const f = path.join(DIR, `book-${r}.json`); if (fs.existsSync(f)) BOOK[r] = JSON.parse(fs.readFileSync(f, 'utf8')).pos; }
const jobs = [];
for (let p = 0; p < pairs; p++) {
  const rule = placeEvery && p % placeEvery === placeEvery - 1 && BOOK.place ? 'place' : 'std', B = BOOK[rule] || {};
  const open = [], k = 1 + Math.floor(rnd() * 2);
  for (let i = 0; i < k; i++) {   // (among the moves the book goes on after)
    const e = (B[open.join(',')] || []).filter(x => B[open.concat([x[0]]).join(',')]); if (!e.length) break; open.push(e[Math.floor(rnd() * e.length)][0]); }
  for (const bookColor of [1, 2]) jobs.push({ i: jobs.length, rule, open, bookColor });
}
const W = Array.from({ length: NW }, () => new Worker(__filename, { workerData: { ms, bookV: +argOf('bookv', 1), more: JSON.parse(argOf('cfg', '{}')) } }));
let next = 0, done = 0, sum = 0, w = 0, d = 0, l = 0, bookN = 0, plies = 0; const t0 = Date.now();
const elo = s => s <= 0 || s >= 1 ? (s <= 0 ? -999 : 999) : -400 * Math.log10(1 / s - 1);
const report = () => { const s = sum / done; const sd = Math.sqrt(Math.max(1e-9, (w * (1 - s) ** 2 + l * s * s + d * (0.5 - s) ** 2) / done) / done);
  return `${done} games: book +${w} =${d} -${l}, ${(100 * s).toFixed(1)}% (${elo(s).toFixed(0)} Elo, 95% ${elo(s - 1.96 * sd).toFixed(0)}..${elo(s + 1.96 * sd).toFixed(0)}), book moves/game ${(bookN / done).toFixed(1)}, plies/game ${(plies / done).toFixed(0)}, ${((Date.now() - t0) / 60000).toFixed(1)} min`; };
const feed = wk => { if (next >= jobs.length) return; const j = jobs[next++];
  wk.once('message', r => { done++; sum += r.score; if (r.score === 1) w++; else if (r.score === 0) l++; else d++; bookN += r.bookN; plies += r.plies;
    if (logF) fs.appendFileSync(logF, JSON.stringify(Object.assign({}, r, { open: jobs[r.i].open, bookColor: jobs[r.i].bookColor })) + '\n');
    if (done % 10 === 0) process.stderr.write(report() + '\n');
    if (done === jobs.length) { console.log(`ms ${ms}: ` + report()); process.exit(0); } else feed(wk); });
  wk.postMessage(j); };
W.forEach(feed);

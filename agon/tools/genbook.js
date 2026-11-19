// The AI's opening book of Agon (2026-11-20, claude/agon-spec.md「AI の序盤ブック」): the page's worker (engine.js run as a Web
// Worker in a Node vm, shared/tools/workeremu.js — the site's own wasm search and, once agon/net.js has one, the learned
// evaluation) analyses each book position for --ms ms on its own thread (worker_threads: one position per core, all cores busy;
// shared/tools/genbook.js runs its "workers" one after another in one thread). An entry keeps the moves within --margin of the
// best ([move, value], best first); the tree grows along the --k best of them (per ply: "3,2,2,1" → 3 at ply 0, 2 at plies
// 1–2, 1 after) up to --plies plies. Positions reached by another order of moves are analysed once (the entry is copied to
// the other key). The book is saved after every ply; running again with the same --out goes on from it (positions already
// in the book are not analysed again: a larger --plies / --k deepens it). Writes <out>/book-<rule>.json.
//   node agon/tools/genbook.js [--rule std|place|all] [--plies 8] [--k 2] [--ms 4000] [--margin 10] [--workers 2] [--out agon]
//   Mac (all cores, deeper): sh agon/tools/book.sh
'use strict';
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..');
if (!isMainThread) {
  const { emuWorker } = require('../../shared/tools/workeremu.js');
  const ask = emuWorker(path.join(DIR, 'engine.js'));
  parentPort.on('message', async j => {
    const r = await ask({ type: 'analyze', start: null, moves: j.moves, time: j.ms, rule: j.rule });
    parentPort.postMessage({ i: j.i, list: (r.list || []).map(e => [e.m, e.v]), depth: r.depth });
  });
  return;
}
const argOf = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const rules = argOf('rule', 'all') === 'all' ? ['std', 'place'] : [argOf('rule')];
const plies = +argOf('plies', 8), KS = String(argOf('k', '2')).split(',').map(Number), ms = +argOf('ms', 4000), margin = +argOf('margin', 10);
const NW = +argOf('workers', Math.max(1, require('os').cpus().length - 1)), outDir = path.resolve(argOf('out', DIR));
const kOf = ply => KS[Math.min(ply, KS.length - 1)];
const E = require(path.join(DIR, 'engine.js'));
const W = Array.from({ length: NW }, () => new Worker(__filename));
const pool = jobs => new Promise(res => {   // jobs: [{ moves, rule }] → results in order
  const out = new Array(jobs.length); let next = 0, done = 0;
  if (!jobs.length) return res(out);
  const feed = w => { if (next >= jobs.length) return; const i = next++; w.once('message', r => { out[r.i] = r; done++; if (done === jobs.length) res(out); else feed(w); }); w.postMessage(Object.assign({ i, ms }, jobs[i])); };
  W.forEach(feed);
});
(async () => {
  const t00 = Date.now();
  for (const rule of rules) {
    const file = path.join(outDir, `book-${rule}.json`), t0 = Date.now();
    const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null, book = old ? old.pos : {};
    E.setRule(rule);
    const posKey = moves => { const { pos } = E.replay(null, moves); return pos.h1 + ':' + pos.h2; };
    const byPos = new Map();   // position → its entry (transpositions)
    for (const k of Object.keys(book)) byPos.set(posKey(k ? k.split(',').map(Number) : []), book[k]);
    const over = moves => { const { pos, hashes } = E.replay(null, moves); return E.judge(pos, hashes).over; };
    let level = [[]], analysed = 0;
    for (let ply = 0; ply <= plies && level.length; ply++) {
      // the positions of this ply not in the book yet (one analysis per position)
      const need = [], seen = new Set();
      for (const mv of level) {
        const key = mv.join(','); if (book[key] || over(mv)) continue;
        const pk = posKey(mv); if (byPos.has(pk)) { book[key] = byPos.get(pk); continue; }
        if (!seen.has(pk)) { seen.add(pk); need.push({ moves: mv, rule, pk }); }
      }
      const res = await pool(need);
      need.forEach((j, n) => { const list = res[n].list.sort((a, b) => b[1] - a[1]); if (!list.length) return;
        const good = list.filter(e => e[1] >= list[0][1] - margin); byPos.set(j.pk, good); book[j.moves.join(',')] = good; });
      for (const mv of level) { const key = mv.join(','); if (!book[key] && !over(mv)) { const e = byPos.get(posKey(mv)); if (e) book[key] = e; } }
      analysed += need.length;
      const next = [];
      if (ply < plies) for (const mv of level) { const e = book[mv.join(',')]; if (e) for (const x of e.slice(0, kOf(ply))) next.push(mv.concat([x[0]])); }
      fs.writeFileSync(file, JSON.stringify({ v: 1, game: 'agon', rule, ms, margin, plies, k: KS.join(','), pos: book }));
      process.stderr.write(`${rule} ply ${ply}: ${need.length} analysed (${level.length} positions), book ${Object.keys(book).length}, ${((Date.now() - t0) / 60000).toFixed(1)} min\n`);
      level = next;
    }
    console.log(`${file}: ${Object.keys(book).length} positions (${analysed} analysed now), ${fs.statSync(file).size} bytes, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  }
  console.log(`total ${((Date.now() - t00) / 60000).toFixed(1)} min`);
  process.exit(0);
})();

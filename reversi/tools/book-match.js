// Book A vs book B with the same engine and settings, from the initial position (the books' own variety on both sides).
//   node book-match.js <bookA (.bin | .json)> <bookB> <pairs> <out.jsonl> [level=15] [timeMs] [--threads N]
// Game 2k and 2k+1 use the same random seeds with the colours swapped. Results are appended per game (resumable; with
// --threads the games are shared out to N worker threads, one game per thread at a time, and the file stays in any order).
// Lv.17–27 play to a fixed depth (their time is only a guard), so the result does not depend on the machine's speed.
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const RV = path.join(__dirname, '..');
const args = process.argv.slice(2), opt = {}, pos = [];
for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i]; else pos.push(args[i]);
const [fa, fb, pairs, out, level = 15, timeMs] = isMainThread ? pos : workerData.pos;

function playGame(EA, EB, cfg, g) {
  const { legal, play, start } = require('./eng-lite.js');
  const rng = seed => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
  const aBlack = g % 2 === 0, seed = (Math.floor(g / 2) + (+process.env.SEED0 || 0)) * 7919 + 17;   // (SEED0: another set of games, e.g. a second process)
  const rB = rng(seed), rW = rng(seed * 3 + 1);   // black's and white's random numbers (the same for both colourings)
  let c = start(), s = 1, inA = 0, inB = 0, ply = 0, moves = '';
  EA.clearTT(); EB.clearTT();
  for (;;) {
    let ms = legal(c, s);
    if (!ms.length) { s = 3 - s; ms = legal(c, s); if (!ms.length) break; }
    const isA = (s === 1) === aBlack, E = isA ? EA : EB;
    const r = E.think(c, s, { cfg, random: s === 1 ? rB : rW });
    if (r.book) { if (isA) inA = ply + 1; else inB = ply + 1; }
    moves += 'abcdefgh'[r.move & 7] + ((r.move >> 3) + 1);
    c = play(c, r.move, s); s = 3 - s; ply++;
  }
  const b = c.filter(x => x === 1).length, w = c.filter(x => x === 2).length, da = aBlack ? b - w : w - b;
  return { g, aBlack, da, res: da > 0 ? 1 : da < 0 ? 0 : 0.5, bookA: inA, bookB: inB, moves };
}

function engines() {
  const raw = zlib.gunzipSync(fs.readFileSync(path.join(RV, 'weights.bin.gz')));
  const W = new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2);
  const readBook = f => /\.json$/.test(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : fs.readFileSync(f);
  const load = book => { const f = require.resolve(path.join(RV, 'engine.js')); delete require.cache[f]; const E = require(f); E.setWeights(W, 30); E.setBook(readBook(book)); return E; };
  const EA = load(fa), EB = load(fb);
  return { EA, EB, cfg: Object.assign({}, EA.LEVELS[+level], timeMs ? { time: +timeMs } : {}) };
}

if (!isMainThread) {
  const { EA, EB, cfg } = engines();
  parentPort.on('message', g => parentPort.postMessage(playGame(EA, EB, cfg, g)));
  return;
}

function report() {
  const rs = fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  const line = (xs, name) => {
    const n = xs.length; if (!n) return `${name}: 0局`;
    const wins = xs.filter(r => r.res === 1).length, draws = xs.filter(r => r.res === 0.5).length;
    const sc = (wins + draws / 2) / n, se = Math.sqrt(sc * (1 - sc) / n);
    const elo = s => -400 * Math.log10(1 / Math.min(0.999, Math.max(0.001, s)) - 1);
    const avg = k => (xs.reduce((a, r) => a + r[k], 0) / n).toFixed(1);
    return `${name}: ${n}局 A ${wins}勝${draws}分${n - wins - draws}敗  勝率 ${(sc * 100).toFixed(1)}% (±${(se * 100).toFixed(1)}%)  Elo ${elo(sc) >= 0 ? '+' : ''}${elo(sc).toFixed(0)} ± ${(elo(Math.min(0.999, sc + se)) - elo(sc)).toFixed(0)}  平均石差 ${(xs.reduce((a, r) => a + r.da, 0) / n).toFixed(2)}  定石の最後の手 A ${avg('bookA')} / B ${avg('bookB')} 手目`;
  };
  console.log(line(rs, '全体'));
  console.log(line(rs.filter(r => r.aBlack), 'A が黒'));
  console.log(line(rs.filter(r => !r.aBlack), 'A が白'));
  console.log(`別々の棋譜 ${new Set(rs.map(r => r.moves)).size} / ${rs.length}`);
}

(async () => {
  if (!fa || !fb || !pairs || !out) { console.log('使い方: node book-match.js <定石A> <定石B> <組数> <out.jsonl> [レベル=15] [1手のms] [--threads N]'); return; }
  const done = new Set(fs.existsSync(out) ? fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).g) : []);
  const todo = []; for (let g = 0; g < pairs * 2; g++) if (!done.has(g)) todo.push(g);
  const threads = Math.max(1, Math.min(todo.length, +(opt.threads || 1)));
  const t0 = Date.now(); let fin = 0;
  if (todo.length) await new Promise(resolve => {
    let next = 0, busy = 0;
    const pool = [];
    for (let i = 0; i < threads; i++) pool.push(new Worker(__filename, { workerData: { pos } }));
    const feed = w => {
      if (next >= todo.length) { if (!busy) { pool.forEach(x => x.terminate()); resolve(); } return; }
      busy++; w.postMessage(todo[next++]);
    };
    for (const w of pool) {
      w.on('message', r => {
        busy--; fin++;
        fs.appendFileSync(out, JSON.stringify(r) + '\n');
        const el = (Date.now() - t0) / 1000;
        process.stdout.write(`\r${fin}/${todo.length} 局  残り約 ${Math.round(el / fin * (todo.length - fin) / 60)} 分   `);
        feed(w);
      });
      feed(w);
    }
  });
  if (todo.length) process.stdout.write('\n');
  report();
})();

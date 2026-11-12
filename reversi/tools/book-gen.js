#!/usr/bin/env node
// Opening book generator for Reversi (book.bin). Usage and Mac instructions: BOOK.md (same folder).
//
//   node book-gen.js run    [--dir book-work] [--threads N] [--depth 22] [--max-ply 24] [--cap 3000] [--err 4] [--window 3]
//                           [--keep 4] [--exact 0] [--deep 0] [--deep-err 1] [--deep-cap 1000] [--from dir[,dir]]
//                           [--lines file|dir[,…]] [--lines-ply 30] [--lines-min 3] [--seed old-book.json] [--seed-ply 99]
//   node book-gen.js plan   (same options: how many positions are still to read at each depth, and a time estimate)
//   node book-gen.js build  [--dir book-work] [--book ../book.bin] [--out-window 3]
//   node book-gen.js verify [--dir book-work] [--n 8]
//   node book-gen.js status [--dir book-work]
//   node book-gen.js diff   <old.bin> <new.bin> [--margin 0.8]
//
// How it works
// - The book is a tree from the initial position. Every book node (canonical form: the smallest of the 8 symmetric
//   forms, the same key as engine.js bookLookup) is evaluated by a fixed-depth search (Multi-ProbCut on, the same
//   engine.wasm as the game) of each legal move: the best move with a full window, the others with a window
//   [best - keep, best + 1] (moves below it are dropped), re-searching on a fail-high. Exact solve when few empties.
// - Plies are expanded one after another (breadth first). A child is added when its move is within --window discs of
//   the node's best and the accumulated loss of that side along the cheapest path stays within --err discs (black and
//   white counted separately, as Edax's book deviation). Each ply keeps at most --cap nodes (lowest total loss first,
//   ties by key), so the main lines reach --max-ply and the side lines stay shorter. Nodes of a --seed book (JSON,
//   e.g. the old book.json) and of --lines (game records) are always kept, on top of --cap.
// - Two depths (v4, 2026-11): the main lines (total loss of both sides <= --deep-err discs, at most --deep-cap nodes per
//   ply, lowest loss first) are read at --deep, the others at --depth. Each record keeps its depth (d); a node read
//   deeper than needed is used as it is.
// - --from <dir>: the records of another work folder (e.g. the v3 book-work) are reused where their depth is enough
//   (read only; new records go to --dir). A new --dir with --from takes the from folder's settings as defaults.
// - --lines: game records (WTHOR .wtb files, or text files with one game per line such as "f5d6c3d3c4…"; a folder is
//   read whole). Positions reached in at least --lines-min games up to --lines-ply are kept in the book (as seeds), so
//   the lines strong players actually play are covered even when our engine would not choose them. Only moves within
//   --keep of a node's best can lead there (worse moves are not in the node's record).
// - Each evaluation clears the transposition table and has no time limit, so the result of a node depends only on the
//   position and the depth: the run is deterministic and resumable (one JSON line per node in <dir>/nodes.jsonl,
//   appended as soon as it is done; Ctrl-C and run the same command again to continue; finished nodes are reused).
// - build: negamax back-up of the values through the tree (a move whose child is a book node gets minus the child's
//   value, when the child's value looks at least as far ahead as the node's own search: horizon = ply + depth),
//   keeps the moves within --out-window discs of the best, and writes the compact tree format of book.bin
//   (decoded by engine.js decodeBook; the format is unchanged since v2).
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), os = require('os');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const RV = path.join(__dirname, '..');

// engine: 'st' = engine.wasm (as the game's one-thread levels; v3 and older), 'mt' = engine_mt.wasm on one thread (2026-11, v4:
// the same search with the multi-thread build's bigger table, 4M entries in buckets of 4 instead of 1M single entries: about
// 1.5× faster at depth 20 and more at 22+, values nearly the same). One instance a thread (~0.2 GB each).
function loadEngine(kind) {
  if (kind === 'mt') {
    const module = new WebAssembly.Module(fs.readFileSync(path.join(RV, 'engine_mt.wasm')));
    const mem = new WebAssembly.Memory({ initial: 1024, maximum: 16384, shared: true });
    const X = new WebAssembly.Instance(module, { env: { memory: mem, now: () => Date.now() } }).exports;
    const SLOT = 2 << 20, base = Math.ceil(X.mt_heap_base() / 65536) * 65536;
    if (base + SLOT > mem.buffer.byteLength) mem.grow(Math.ceil((base + SLOT - mem.buffer.byteLength) / 65536));
    X.mt_stack(base + SLOT - 16); X.mt_thread(base); X.init();   // (one thread: its own stack and thread-local slot, as tools/levelmatch.js)
    global.self = { REVERSI_WX: Object.assign({}, X, { memory: mem }) };   // (engine.js takes this instance; no REVERSI_SPLIT: no parallel search)
  }
  const E = require(path.join(RV, 'engine.js'));
  const raw = zlib.gunzipSync(fs.readFileSync(path.join(RV, 'weights.bin.gz')));
  E.setWeights(new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2), 30);
  return E;
}

// ------------------------------------------------------------------ worker: evaluate one node
function evalNode(E, bits, cfg, depth) {
  const [pl, ph, ol, oh] = bits;
  E.clearTT(); E.MPC.on = true; E.deadline = Infinity;
  const moves = E.legalList(pl, ph, ol, oh);
  const empties = 64 - E.pc(pl | ol) - E.pc(ph | oh);
  const exact = empties - 1 <= cfg.exact;
  const D = Math.min(depth || cfg.depth, empties);
  const keep = Math.round(cfg.keep * 100);
  const kids = moves.map(m => ({ m, c: E.childOf(pl, ph, ol, oh, m) }));
  const S = exact
    ? (k, lo, hi) => -E.solve(k.c[0], k.c[1], k.c[2], k.c[3], -Math.ceil(hi / 100), -Math.floor(lo / 100), empties - 1, 1, false) * 100
    : (k, lo, hi, d) => -E.search(k.c[0], k.c[1], k.c[2], k.c[3], d - 1, -hi, -lo, 1, false);
  const n0 = E.nodes;
  // move ordering: full-window scores of a shallower search (also warms the transposition table)
  const sd = exact ? Math.min(D, 10) : Math.max(1, D - 6);
  for (const k of kids) { k.o = (exact ? (lo, hi) => -E.search(k.c[0], k.c[1], k.c[2], k.c[3], sd - 1, -hi, -lo, 1, false) : (lo, hi) => S(k, lo, hi, sd))(-32000, 32000); }
  kids.sort((a, b) => b.o - a.o || a.m - b.m);
  const LIM = exact ? 6500 : 32000;
  let best = -99999; const out = [];
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    let v;
    if (i === 0) v = S(k, -LIM, LIM, D);
    else {
      const lo = best - keep;
      v = S(k, lo, best + 1, D);
      if (v <= lo) continue;                           // more than `keep` below the best: dropped
      if (v > best) { v = S(k, best, LIM, D); if (v < best) v = best; }   // fail-high: exact value above the old best
    }
    out.push([k.m, v]);
    if (v > best) best = v;
  }
  const res = out.filter(x => x[1] >= best - keep).sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  return { m: res, nodes: E.nodes - n0, exact };
}

if (!isMainThread) {
  const E = loadEngine(workerData.cfg.engine);
  parentPort.on('message', job => {
    const t0 = Date.now();
    const r = evalNode(E, job.bits, workerData.cfg, job.d);
    parentPort.postMessage({ k: job.k, p: job.p, d: r.exact ? 99 : job.d, m: r.m, n: r.nodes, x: r.exact ? 1 : 0, ms: Date.now() - t0 });
  });
  return;
}

// ------------------------------------------------------------------ main thread
const argv = process.argv.slice(2), cmd = argv[0] && !argv[0].startsWith('--') ? argv.shift() : 'status';
const A = {}, POS = [];
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) { const k = argv[i].slice(2); A[k] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; } else POS.push(argv[i]);
const DIR = path.resolve(A.dir || path.join(__dirname, 'book-work'));
const NODES = path.join(DIR, 'nodes.jsonl'), CONF = path.join(DIR, 'config.json');
const readConf = d => { const f = path.join(d, 'config.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const SAVED = readConf(DIR);
const ENGINE = SAVED ? SAVED.engine || 'st' : A.engine === 'st' ? 'st' : 'mt';   // (a folder keeps its engine; v3's config has none = st; a new folder: mt)
const E = loadEngine(ENGINE);
const START = [0x10000000, 0x8, 0x08000000, 0x10];
const canon = (pl, ph, ol, oh) => { const [k, , b] = E.bookCanon(pl, ph, ol, oh); return [k, b]; };
const hasMoves = b => E.legalList(b[0], b[1], b[2], b[3]).length > 0;
const plyOf = b => E.pc(b[0] | b[2]) + E.pc(b[1] | b[3]) - 4;
const keyBits = k => [0, 1, 2, 3].map(j => parseInt(k.slice(j * 8, j * 8 + 8), 16) | 0);
const list = v => v === undefined || v === true ? [] : String(v).split(',').filter(Boolean);

function settings() {
  const def = { depth: 22, maxPly: 24, cap: 3000, err: 4, window: 3, keep: 4, exact: 0, deep: 0, deepErr: 1, deepCap: 1000, from: [], lines: [], linesPly: 30, linesMin: 3 };
  const saved = readConf(DIR);
  const fromArg = A.from !== undefined ? list(A.from).map(f => path.relative(DIR, path.resolve(f)) || '.') : null;
  // a new folder that reuses another one: that folder's settings are the defaults
  let base = {};
  if (!saved && fromArg && fromArg.length) { const c = readConf(path.resolve(DIR, fromArg[0])); if (c) for (const k of ['depth', 'maxPly', 'cap', 'err', 'window', 'keep', 'exact']) if (c[k] !== undefined) base[k] = c[k]; }
  const cfg = Object.assign({}, def, base, saved || {});
  cfg.engine = ENGINE;
  if (saved && A.engine !== undefined && A.engine !== ENGINE) { console.error(`この作業フォルダは engine=${ENGINE} で作られています（--engine は新しいフォルダでだけ指定できます）`); process.exit(1); }
  for (const [a, k] of [['depth', 'depth'], ['max-ply', 'maxPly'], ['cap', 'cap'], ['err', 'err'], ['window', 'window'], ['keep', 'keep'], ['exact', 'exact'],
    ['deep', 'deep'], ['deep-err', 'deepErr'], ['deep-cap', 'deepCap'], ['lines-ply', 'linesPly'], ['lines-min', 'linesMin']]) if (A[a] !== undefined) cfg[k] = +A[a];
  if (fromArg) cfg.from = fromArg;
  if (A.lines !== undefined) cfg.lines = list(A.lines).map(f => path.relative(DIR, path.resolve(f)));
  if (saved && (saved.depth !== cfg.depth || saved.keep !== cfg.keep || saved.exact !== cfg.exact) && !A['allow-mixed']) {
    console.error(`この作業フォルダは depth=${saved.depth} keep=${saved.keep} exact=${saved.exact} で作られています。変えるときは別の --dir を使うか --allow-mixed を付けてください。`);
    process.exit(1);
  }
  for (const f of cfg.from) {
    const c = readConf(path.resolve(DIR, f));
    if (!c) { console.error(`--from ${path.resolve(DIR, f)} に config.json がありません`); process.exit(1); }
    if (c.keep !== cfg.keep || c.exact !== cfg.exact) { console.error(`--from ${f} は keep=${c.keep} exact=${c.exact} で作られています（今の設定 keep=${cfg.keep} exact=${cfg.exact}）。--keep と --exact を合わせてください。`); process.exit(1); }
  }
  return cfg;
}

// all the records: the --from folders first, then this folder; per position the deepest record (d: the depth it was read at; 99 = exact)
function readNodes(cfg) {
  const map = new Map();
  const dirs = (cfg ? cfg.from.map(f => path.resolve(DIR, f)) : []).concat([DIR]);
  for (const d of dirs) {
    const c = readConf(d) || {}, txt = [], f = path.join(d, 'nodes.jsonl');
    if (fs.existsSync(f + '.gz')) txt.push(zlib.gunzipSync(fs.readFileSync(f + '.gz')).toString('utf8'));   // (a result sent back, compressed)
    if (fs.existsSync(f)) txt.push(fs.readFileSync(f, 'utf8'));
    for (const line of txt.join('\n').split('\n')) {
      if (!line) continue;
      let r; try { r = JSON.parse(line); } catch (e) { continue; }    // (a line cut off by Ctrl-C)
      if (r.d === undefined) r.d = r.x ? 99 : c.depth;                // (v3 and older records: the folder's depth)
      if (d === DIR) Object.defineProperty(r, 'own', { value: true });
      const o = map.get(r.k);
      if (!o || r.d >= o.d) map.set(r.k, r);
    }
  }
  return map;
}

// --lines: the positions (canonical keys) reached in at least linesMin games, up to linesPly
function loadLines(cfg) {
  const s = new Set(); if (!cfg.lines.length) return s;
  const L = Math.min(cfg.linesPly, cfg.maxPly), cnt = new Map();
  let games = 0, bad = 0;
  const files = [];
  const walk = f => { if (fs.statSync(f).isDirectory()) { for (const g of fs.readdirSync(f).sort()) walk(path.join(f, g)); } else if (/\.(wtb|txt)$/i.test(f)) files.push(f); };
  for (const f of cfg.lines) { const p = path.resolve(DIR, f); if (!fs.existsSync(p)) { console.error(`--lines ${p} がありません`); process.exit(1); } walk(p); }
  const playLine = sq => {
    let b = START.slice(), ply = 0; const seen = [];
    for (const m of sq) {
      if (ply >= L) break;
      let ms = E.legalList(b[0], b[1], b[2], b[3]);
      if (!ms.includes(m)) { const o = [b[2], b[3], b[0], b[1]]; if (!ms.length && E.legalList(o[0], o[1], o[2], o[3]).includes(m)) b = o; else { if (!ply) bad++; break; } }
      b = E.childOf(b[0], b[1], b[2], b[3], m); ply++;
      if (hasMoves(b)) seen.push(canon(b[0], b[1], b[2], b[3])[0]);
    }
    if (ply) { games++; for (const k of seen) cnt.set(k, (cnt.get(k) || 0) + 1); }
  };
  for (const f of files) {
    const buf = fs.readFileSync(f);
    if (/\.wtb$/i.test(f)) {   // WTHOR: 16-byte header, then 68 bytes a game (8 bytes of header, 60 moves: 10 × row + column, 1-based, 0 = none)
      const n = Math.floor((buf.length - 16) / 68);
      for (let g = 0; g < n; g++) {
        const o = 16 + g * 68 + 8, sq = [];
        for (let i = 0; i < 60; i++) { const v = buf[o + i], r = Math.floor(v / 10), c = v % 10; if (r < 1 || r > 8 || c < 1 || c > 8) break; sq.push((r - 1) * 8 + c - 1); }
        playLine(sq);
      }
    } else for (const line of buf.toString('utf8').split('\n')) {
      const sq = [...line.matchAll(/([a-hA-H])([1-8])/g)].map(x => (+x[2] - 1) * 8 + x[1].toLowerCase().charCodeAt(0) - 97);
      if (sq.length) playLine(sq);
    }
  }
  for (const [k, n] of cnt) if (n >= cfg.linesMin) s.add(k);
  console.log(`棋譜 ${files.length} ファイル・${games} 局${bad ? `（読めない棋譜 ${bad}）` : ''}：${L}手目までで ${cfg.linesMin} 局以上に出た局面 ${s.size}`);
  return s;
}

function loadSeed() {
  const s = new Set();
  const f = A.seed === undefined || A.seed === 'none' ? null : path.resolve(A.seed);
  const maxPly = A['seed-ply'] === undefined ? 99 : +A['seed-ply'];   // (only the seed's nodes up to this ply)
  const pcHex = h => { let c = 0; for (let x = parseInt(h, 16); x; x >>>= 1) c += x & 1; return c; };
  if (f && fs.existsSync(f)) for (const k of Object.keys(JSON.parse(fs.readFileSync(f, 'utf8')))) if ([0, 1, 2, 3].reduce((a, i) => a + pcHex(k.slice(i * 8, i * 8 + 8)), 0) - 4 <= maxPly) s.add(k);
  return s;
}

const useDeep = cfg => cfg.deep > cfg.depth;
const need = (cfg, n) => n.deep ? cfg.deep : cfg.depth;
const isDone = (cfg, done, k, n) => { const r = done.get(k); return !!r && r.d >= need(cfg, n); };

// the nodes of each ply, from the evaluated nodes of the previous ply (deterministic)
function nextPly(cur, p, done, cfg, seed) {
  const nxt = new Map(), side = p & 1, W = cfg.window * 100, ERR = cfg.err * 100;
  for (const k of [...cur.keys()].sort()) {
    const n = cur.get(k), r = done.get(k); if (!r || !r.m.length) continue;
    const best = r.m[0][1];
    for (const [m, v] of r.m) {
      const loss = best - v;
      const c = E.childOf(n.bits[0], n.bits[1], n.bits[2], n.bits[3], m), [ck, cb] = canon(c[0], c[1], c[2], c[3]);
      const isSeed = seed.has(ck);
      if (!isSeed && loss > W) continue;
      const e = n.e.slice(); e[side] += loss;
      if (!isSeed && e[side] > ERR) continue;
      if (!hasMoves(cb)) continue;                    // (a pass: not in the book)
      const o = nxt.get(ck);
      if (!o) nxt.set(ck, { bits: cb, e, seed: isSeed });
      else if (e[0] + e[1] < o.e[0] + o.e[1] || (e[0] + e[1] === o.e[0] + o.e[1] && Math.max(...e) < Math.max(...o.e))) o.e = e;
    }
  }
  const keys = [...nxt.keys()];
  const tot = k => nxt.get(k).e[0] + nxt.get(k).e[1];
  const byLoss = (a, b) => tot(a) - tot(b) || (a < b ? -1 : 1);
  const seeds = keys.filter(k => nxt.get(k).seed).sort();
  const rest = keys.filter(k => !nxt.get(k).seed).sort(byLoss).slice(0, cfg.cap);
  const out = new Map();
  for (const k of seeds.concat(rest)) out.set(k, nxt.get(k));
  if (useDeep(cfg)) { const D = cfg.deepErr * 100; [...out.keys()].filter(k => tot(k) <= D).sort(byLoss).slice(0, cfg.deepCap).forEach(k => { out.get(k).deep = true; }); }
  return out;
}

function root(cfg) { const [k0, b0] = canon(...START); return new Map([[k0, { bits: b0, e: [0, 0], deep: useDeep(cfg) }]]); }

async function run() {
  const cfg = settings();
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(CONF, JSON.stringify(cfg, null, 1));
  const threads = +(A.threads || Math.max(1, os.cpus().length - 1));
  const seed = loadSeed(); for (const k of loadLines(cfg)) seed.add(k);
  const done = readNodes(cfg);
  console.log(`設定 ${JSON.stringify(cfg)}  スレッド ${threads}  既存 ${done.size} 局面  シード ${seed.size} 局面  → ${DIR}`);
  const out = fs.openSync(NODES, 'a');
  const pool = [];
  for (let i = 0; i < threads; i++) pool.push(new Worker(__filename, { workerData: { cfg } }));
  let stop = false;
  process.on('SIGINT', () => { if (stop) process.exit(1); stop = true; console.log('\n停止します（読み途中の局面は次回やり直し。もう一度 Ctrl-C で即終了）'); pool.forEach(w => w.terminate()); });
  const t0 = Date.now(); let evals = 0;
  let cur = root(cfg);
  for (let p = 0; p <= cfg.maxPly && cur.size && !stop; p++) {
    const todo = [...cur.keys()].filter(k => !isDone(cfg, done, k, cur.get(k)));
    todo.sort((a, b) => (cur.get(b).deep ? 1 : 0) - (cur.get(a).deep ? 1 : 0));   // (the deep ones first: the slowest)
    const tp = Date.now(); let fin = 0;
    if (todo.length) {
      await new Promise(resolve => {
        let next = 0, busy = 0;
        const feed = w => {
          if (stop) { if (!busy) resolve(); return; }
          if (next >= todo.length) { if (!busy) resolve(); return; }
          const k = todo[next++]; busy++;
          w.once('message', r => {
            busy--; fin++; evals++;
            fs.writeSync(out, JSON.stringify(r) + '\n');
            const o = done.get(r.k); if (!o || r.d >= o.d) done.set(r.k, r);
            if (fin % 20 === 0 || fin === todo.length) {
              const el = (Date.now() - tp) / 1000, eta = el / fin * (todo.length - fin);
              process.stdout.write(`\r  ${p}手目: ${fin}/${todo.length}  ${(el / fin * threads).toFixed(1)}秒/局面/スレッド  この手目の残り ${Math.round(eta / 60)}分   `);
            }
            feed(w);
          });
          const n = cur.get(k);
          w.postMessage({ k, p, bits: n.bits, d: need(cfg, n) });
        };
        pool.forEach(feed);
      });
      process.stdout.write('\n');
    }
    if (stop) break;
    const nd = [...cur.values()].filter(n => n.deep).length;
    console.log(`${p}手目: ${cur.size} 局面（深く読む ${nd}、新規 ${todo.length}）  合計 ${done.size} 局面  経過 ${Math.round((Date.now() - t0) / 60000)}分`);
    if (p < cfg.maxPly) cur = nextPly(cur, p, done, cfg, seed);
  }
  fs.closeSync(out);
  await Promise.all(pool.map(w => w.terminate()));
  console.log(stop ? '中断しました。同じコマンドで続きから再開できます。' : `完了：${done.size} 局面（今回 ${evals} 局面を読みました）。次は node book-gen.js build`);
}

// ------------------------------------------------------------------ plan: what is left to read (no search), with a time estimate
function plan() {
  const cfg = settings(), done = readNodes(cfg);
  const seed = loadSeed(); for (const k of loadLines(cfg)) seed.add(k);
  const threads = +(A.threads || Math.max(1, os.cpus().length - 1));
  // seconds a node per thread at each depth: the measured average of the records (ms), else ×3 per 2 depths from the nearest measured one
  const ms = {}; for (const r of done.values()) if (r.d < 99 && r.ms) { const x = ms[r.d] || (ms[r.d] = [0, 0]); x[0] += r.ms; x[1]++; }
  const sec = d => { if (ms[d]) return ms[d][0] / ms[d][1] / 1000; const ds = Object.keys(ms).map(Number); if (!ds.length) return NaN; const n = ds.sort((a, b) => Math.abs(a - d) - Math.abs(b - d))[0]; return ms[n][0] / ms[n][1] / 1000 * Math.pow(3, (d - n) / 2); };
  let cur = root(cfg), left = {}, unknown = 0, total = 0, last = [0, 0];
  const rows = [];
  for (let p = 0; p <= cfg.maxPly; p++) {
    let miss = 0, deep = 0, missDeep = 0;
    if (cur.size) {
      for (const [k, n] of cur) { if (n.deep) deep++; if (!isDone(cfg, done, k, n)) { miss++; if (n.deep) missDeep++; left[need(cfg, n)] = (left[need(cfg, n)] || 0) + 1; } }
      rows.push(`${p}手目: ${cur.size}（深く ${deep}）  未読 ${miss}（深く ${missDeep}）`); last = [cur.size, deep];
      total += cur.size;
      const known = new Map([...cur].filter(([k]) => done.has(k)));   // (the tree's shape from any record, also a shallower one)
      if (known.size < cur.size) unknown = p;
      cur = p < cfg.maxPly ? nextPly(known, p, done, cfg, seed) : new Map();
    } else {   // (beyond the positions read so far: assume as many as the last known ply, ×1.15 a ply for the deep ones up to deep-cap)
      const n = last[0], nd = useDeep(cfg) ? Math.min(cfg.deepCap, n, Math.round(last[1] *= 1.15)) : 0;
      left[cfg.depth] = (left[cfg.depth] || 0) + n - nd; if (nd) left[cfg.deep] = (left[cfg.deep] || 0) + nd;
      rows.push(`${p}手目: 約${n}（深く 約${nd}、仮定）`); total += n;
    }
  }
  console.log(rows.join('\n'));
  let th = 0; const parts = [];
  for (const [d, n] of Object.entries(left)) { const h = n * sec(+d) / 3600; th += h; parts.push(`深さ${d}: ${n} 局面 × ${sec(+d).toFixed(1)}秒 = ${h.toFixed(0)} 時間`); }
  console.log(`残り（スレッド合計）: ${parts.join('、')}`);
  console.log(`合計 約${th.toFixed(0)} スレッド時間 → ${threads} スレッドで 約${(th / threads).toFixed(1)} 時間（秒数は記録の平均。ない深さは2つごとに3倍で見積もり。仮定の手目は「約」）`);
  if (unknown) console.log(`（${unknown}手目までに未読の局面があり、その先の局面数はまだ分かりません。読み進むと増えます）`);
}

// ------------------------------------------------------------------ build book.bin
function build() {
  const cfg = settings(), done = readNodes(cfg);
  const outW = Math.round((+(A['out-window'] ?? 3)) * 100);
  const val = new Map(), list = new Map();
  const childKey = (bits, m) => { const c = E.childOf(bits[0], bits[1], bits[2], bits[3], m); return canon(c[0], c[1], c[2], c[3]); };
  const bitsOf = new Map();
  // the tree (bits of each node) from the initial position, and the backed-up values (negamax, memoized) with their horizon
  // (how far ahead the value looks: ply + depth of the search it comes from; a child's value replaces the node's own search
  // of that move only when it looks at least as far, so a deep main-line node is not overwritten by a shallower side node)
  const [k0, b0] = canon(...START);
  // (2026-11-12, MODEL_CARD.md「先後の偏り」) the tempo of a fixed-depth search: a move's value from the node's own search (the child
  // read to depth d-1) and from the child's own search (depth d, one ply further) differ by ~1.7 discs in the mover's favour on
  // average, at every ply and for both colours (book v3: 1.65-1.75 at plies 4-26). So a book value depends on the parity of the
  // ply where its line ends. The main lines all end at the last ply (--max-ply, even: black to move), but a side line can end at an
  // odd ply (white to move) and was then worth ~1.7 more to black than a main line: black chose such lines in the book and lost
  // (self-play with the same book: white won about 2/3). --tempo-mode frontier (the default): the value of a node whose best move
  // comes from its own search, at the other parity than the last ply, is moved by 2T in its mover's favour (T = half the measured
  // difference, per depth), as if read one ply further: all the book's lines then end at the same parity.
  // --tempo-mode all: +T on every own search value instead (also balanced, but weaker in tests);
  // --tempo 0: no correction (as up to v4); --tempo x: T = x discs.
  const tempo = new Map();
  if (A.tempo === undefined || A.tempo === 'auto') {
    const acc = new Map();
    for (const [k, r] of done) {
      if (r.x || r.d >= 99) continue;
      const bits = keyBits(k);
      for (const [m, v] of r.m) {
        const [ck] = childKey(bits, m), cr = done.get(ck);
        if (!cr || cr.x || cr.d !== r.d || !cr.m.length) continue;
        const a = acc.get(r.d) || { n: 0, s: 0 }; a.n++; a.s += -cr.m[0][1] - v; acc.set(r.d, a);
      }
    }
    for (const [d, a] of acc) if (a.n >= 100) tempo.set(d, Math.round(a.s / a.n / 2));
    const all = [...acc.values()].reduce((x, a) => ({ n: x.n + a.n, s: x.s + a.s }), { n: 0, s: 0 });
    tempo.def = all.n ? Math.round(all.s / all.n / 2) : 0;
  } else tempo.def = Math.round(+A.tempo * 100);
  const T = r => r.x || r.d >= 99 ? 0 : tempo.has(r.d) ? tempo.get(r.d) : tempo.def;
  console.log(`手番の補正 T（石、読みの深さごと）${JSON.stringify(Object.fromEntries([...tempo].map(([d, t]) => [d, t / 100])))}、既定 ${tempo.def / 100}`);
  const MODE = A['tempo-mode'] || 'frontier';
  if (MODE !== 'frontier' && MODE !== 'all') { console.error('--tempo-mode は frontier か all'); process.exit(1); }
  const FRONT = MODE === 'frontier' ? { par: cfg.maxPly & 1 } : null, ALL = MODE === 'all';
  // (2026-11-12) only the nodes of the planned tree (window / err / cap, as run without --lines and --seed) back their values up.
  // The nodes added for --lines / --seed (narrow: usually one move each, read at --depth) stay in book.bin for the AI to follow
  // when an opponent plays into them, but their values do not replace the parent's own search: with them backed up, white
  // chose lines into WTHOR positions and won (book v4 self-play: black 37%; without: 47–53%, and stronger against other books).
  // --backup all: every node backs up (as before).
  let PLAN = null;
  if (A.backup !== 'all') {
    PLAN = new Set(); let cur = root(cfg);
    for (let p = 0; p <= cfg.maxPly && cur.size; p++) {
      const known = new Map([...cur].filter(([k]) => done.has(k)));
      for (const k of known.keys()) PLAN.add(k);
      cur = p < cfg.maxPly ? nextPly(known, p, done, cfg, new Set()) : new Map();
    }
  }
  const value = (k, bits, stack) => {
    if (val.has(k)) return val.get(k);
    const r = done.get(k); bitsOf.set(k, bits);
    const hn = Math.min(60, plyOf(bits) + r.d), t = ALL ? T(r) : 0;
    const sc = [];
    stack.add(k);
    for (const [m, v0] of r.m) {
      const [ck, cb] = childKey(bits, m), v = v0 + t;
      let s = v, h = hn, kid = false, own = true;
      if (done.has(ck) && !stack.has(ck)) { const [cv, ch] = value(ck, cb, stack); kid = true; if (ch >= hn && (!PLAN || PLAN.has(ck))) { s = -cv; h = ch; own = false; } }
      sc.push([m, s, kid, h, own]);
    }
    stack.delete(k);
    sc.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    const kept = sc.filter(x => x[1] >= sc[0][1] - outW || x[2]).map(x => [x[0], x[1]]);   // (a worse move that leads to a book node stays: the opponent may play it)
    const adj = FRONT && sc[0][4] && (plyOf(bits) & 1) !== FRONT.par ? 2 * T(r) : 0;
    list.set(k, kept); val.set(k, [sc[0][1] + adj, sc[0][3]]);
    return val.get(k);
  };
  if (!done.has(k0)) { console.error('nodes.jsonl に初期局面がありません'); process.exit(1); }
  value(k0, b0, new Set());
  // encode depth first; a node's subtree is written once (the first time it is reached)
  const bytes = [], written = new Set();
  const enc = (k, bits) => {
    written.add(k);
    const kept = list.get(k), kids = [];
    bytes.push(kept.length);
    for (const [m, s] of kept) {
      const [ck, cb] = childKey(bits, m);
      const has = list.has(ck) && !written.has(ck) && !kids.some(x => x[0] === ck);
      if (has) kids.push([ck, cb]);
      const t = Math.max(-32768, Math.min(32767, Math.round(s / 10)));
      bytes.push(m | (has ? 128 : 0), t & 255, (t >> 8) & 255);
    }
    for (const [ck, cb] of kids) if (!written.has(ck)) enc(ck, cb);   // (one written meanwhile by a sibling's subtree: the decoder skips it too)
  };
  enc(k0, b0);
  const head = Buffer.alloc(12); head.write('RVB2', 0, 'latin1'); head[4] = 1; head[5] = Math.min(255, Math.round(outW / 10)); head.writeUInt32LE(written.size, 8);
  const buf = Buffer.concat([head, Buffer.from(bytes)]);
  const f = path.resolve(A.book || path.join(RV, 'book.bin'));
  fs.writeFileSync(f, buf);
  // check: decode with the engine and compare
  const t0 = Date.now(), dec = E.decodeBook(buf), dms = Date.now() - t0;
  let bad = 0; for (const k of written) { const l = list.get(k), d = dec.get(k); if (!d || d.length !== l.length || d.some((x, i) => x[0] !== l[i][0] || Math.abs(x[1] - Math.round(l[i][1] / 10) / 10) > 1e-9)) bad++; }
  const ply = {}, dep = {}; for (const k of written) { const p = plyOf(bitsOf.get(k)); ply[p] = (ply[p] || 0) + 1; const d = done.get(k).d; dep[d] = (dep[d] || 0) + 1; }
  const nm = [...list.values()].reduce((a, l) => a + l.length, 0);
  console.log(`${f}: ${written.size} 局面・${nm} 手、${(buf.length / 1024).toFixed(0)} KB（gzip ${(zlib.gzipSync(buf, { level: 9 }).length / 1024).toFixed(0)} KB）。デコード確認 ${bad ? bad + ' 件不一致' : 'OK'}（${dms} ms）`);
  console.log('手目ごとの局面数', JSON.stringify(ply), ' 読みの深さごと', JSON.stringify(dep));
  console.log(`初期局面の評価 ${(val.get(k0)[0] / 100).toFixed(2)} 石（黒から）  最善 ${list.get(k0).map(x => `${'abcdefgh'[x[0] & 7]}${(x[0] >> 3) + 1} ${(x[1] / 100).toFixed(2)}`).join(', ')}（正規形の座標）`);
  if (bad) process.exit(1);
}

// ------------------------------------------------------------------ verify: re-evaluate some nodes and compare
function verify() {
  const cfg = settings(), done = readNodes(cfg), n = +(A.n || 8);
  const keys = [...done.keys()].filter(k => done.get(k).own).sort();   // (this folder's records: the --from folders may use another engine)
  let ok = 0;
  for (let i = 0; i < Math.min(n, keys.length); i++) {
    const k = keys[Math.floor((i + 0.5) * keys.length / n)], rec = done.get(k);
    const r = evalNode(E, keyBits(k), cfg, rec.d >= 99 ? cfg.depth : rec.d), want = rec.m;
    const same = JSON.stringify(r.m) === JSON.stringify(want);
    ok += same;
    console.log(`${k} 深さ${rec.d} ${same ? '一致' : '不一致 ' + JSON.stringify(want) + ' → ' + JSON.stringify(r.m)}`);
  }
  console.log(`${ok}/${Math.min(n, keys.length)} 一致`);
  if (ok < Math.min(n, keys.length)) process.exit(1);
}

function status() {
  const cfg = readConf(DIR) ? settings() : null, done = readNodes(cfg); const ply = {}, dep = {};
  for (const r of done.values()) { ply[r.p] = (ply[r.p] || 0) + 1; dep[r.d] = (dep[r.d] || 0) + 1; }
  const own = [...done.values()].filter(r => r.own);
  const ms = own.reduce((a, r) => a + (r.ms || 0), 0);
  console.log(`${DIR}: ${done.size} 局面（--from を含む。このフォルダで読んだもの ${own.length}）  手目ごと ${JSON.stringify(ply)}  深さごと ${JSON.stringify(dep)}  このフォルダの読み時間 ${(ms / 3600000).toFixed(1)} 時間（スレッド合計）`);
  if (fs.existsSync(CONF)) console.log('設定', fs.readFileSync(CONF, 'utf8').replace(/\s+/g, ' '));
}

// ------------------------------------------------------------------ diff: two book.bin files (what the AI would play from the old book, judged by the new one)
function diff() {
  const [fa, fb] = POS; if (!fa || !fb) { console.error('使い方: node book-gen.js diff <old.bin> <new.bin> [--margin 0.8]'); process.exit(1); }
  const margin = +(A.margin ?? 0.8);
  const a = E.decodeBook(fs.readFileSync(fa)), b = E.decodeBook(fs.readFileSync(fb));
  const plyK = k => plyOf(keyBits(k));
  const count = m => { const o = {}; for (const k of m.keys()) { const p = plyK(k); o[p] = (o[p] || 0) + 1; } return o; };
  let shared = 0, dTop = 0, worse = 0, out = 0, picks = 0, rworse = 0, rpicks = 0; const big = [];
  const judge = (x, y, rev) => {   // the moves x's AI picks (within margin of x's best), judged by y
    let n = 0, w = 0, o = 0;
    for (const [m, v] of x) { if (v < x[0][1] - margin) break; n++; const z = y.find(q => q[0] === m); if (!z) o++; else if (y[0][1] - z[1] > 1) w++; }
    return [n, w, o];
  };
  for (const [k, la] of a) {
    const lb = b.get(k); if (!lb) continue;
    shared++; dTop += Math.abs(la[0][1] - lb[0][1]);
    const [n, w, o] = judge(la, lb); picks += n; worse += w; out += o;
    const [rn, rw] = judge(lb, la); rpicks += rn; rworse += rw;
    if (w + o) big.push([plyK(k), k, la[0], lb[0]]);
  }
  console.log(`旧 ${a.size} 局面  新 ${b.size} 局面  共通 ${shared}`);
  console.log(`手目ごと 旧 ${JSON.stringify(count(a))}\n手目ごと 新 ${JSON.stringify(count(b))}`);
  console.log(`共通の局面で最善の評価値の差 平均 ${(dTop / Math.max(1, shared)).toFixed(2)} 石`);
  console.log(`旧の定石で AI が選ぶ手（最善から ${margin} 石以内）${picks} 手のうち、新の評価で最善より1石超悪い ${worse} 手・新では窓の外 ${out} 手（${(100 * (worse + out) / Math.max(1, picks)).toFixed(1)}%）`);
  console.log(`（逆向き：新の定石で選ぶ手 ${rpicks} 手のうち、旧の評価で1石超悪い ${rworse} 手）`);
  big.sort((x, y) => x[0] - y[0] || (x[1] < y[1] ? -1 : 1));
  if (big.length) console.log('浅い手目から（手目・局面・旧の最善・新の最善、正規形の座標）:\n' + big.slice(0, 10).map(x => `  ${x[0]}手目 ${x[1]} 旧 ${'abcdefgh'[x[2][0] & 7]}${(x[2][0] >> 3) + 1} ${x[2][1]} → 新 ${'abcdefgh'[x[3][0] & 7]}${(x[3][0] >> 3) + 1} ${x[3][1]}`).join('\n'));
}

if (cmd === 'run') run();
else if (cmd === 'plan') plan();
else if (cmd === 'build') build();
else if (cmd === 'verify') verify();
else if (cmd === 'diff') diff();
else status();

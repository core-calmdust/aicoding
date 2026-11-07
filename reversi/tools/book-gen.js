#!/usr/bin/env node
// Opening book generator for Reversi (book.bin). Usage and Mac instructions: BOOK.md (same folder).
//
//   node book-gen.js run    [--dir book-work] [--threads N] [--depth 22] [--max-ply 24] [--cap 3000] [--err 4] [--window 3]
//                           [--keep 4] [--exact 0] [--seed old-book.json] [--seed-ply 99]
//   node book-gen.js build  [--dir book-work] [--book ../book.bin] [--out-window 3]
//   node book-gen.js verify [--dir book-work] [--n 8]
//   node book-gen.js status [--dir book-work]
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
//   e.g. the old book.json) are always kept.
// - Each evaluation clears the transposition table and has no time limit, so the result of a node depends only on the
//   position and the settings: the run is deterministic and resumable (one JSON line per node in <dir>/nodes.jsonl,
//   appended as soon as it is done; Ctrl-C and run the same command again to continue; finished nodes are reused).
// - build: negamax back-up of the values through the tree (a move whose child is a book node gets minus the child's
//   value), keeps the moves within --out-window discs of the best, and writes the compact tree format of book.bin
//   (decoded by engine.js decodeBook).
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), os = require('os');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const RV = path.join(__dirname, '..');

function loadEngine() {
  const E = require(path.join(RV, 'engine.js'));
  const raw = zlib.gunzipSync(fs.readFileSync(path.join(RV, 'weights.bin.gz')));
  E.setWeights(new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2), 30);
  return E;
}

// ------------------------------------------------------------------ worker: evaluate one node
function evalNode(E, bits, cfg) {
  const [pl, ph, ol, oh] = bits;
  E.clearTT(); E.MPC.on = true; E.deadline = Infinity;
  const moves = E.legalList(pl, ph, ol, oh);
  const empties = 64 - E.pc(pl | ol) - E.pc(ph | oh);
  const exact = empties - 1 <= cfg.exact;
  const D = Math.min(cfg.depth, empties);
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
  const E = loadEngine();
  parentPort.on('message', job => {
    const t0 = Date.now();
    const r = evalNode(E, job.bits, workerData.cfg);
    parentPort.postMessage({ k: job.k, p: job.p, m: r.m, n: r.nodes, x: r.exact ? 1 : 0, ms: Date.now() - t0 });
  });
  return;
}

// ------------------------------------------------------------------ main thread
const E = loadEngine();
const argv = process.argv.slice(2), cmd = argv[0] && !argv[0].startsWith('--') ? argv.shift() : 'status';
const A = {};
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) { const k = argv[i].slice(2); A[k] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; }
const DIR = path.resolve(A.dir || path.join(__dirname, 'book-work'));
const NODES = path.join(DIR, 'nodes.jsonl'), CONF = path.join(DIR, 'config.json');
const START = [0x10000000, 0x8, 0x08000000, 0x10];
const canon = (pl, ph, ol, oh) => { const [k, , b] = E.bookCanon(pl, ph, ol, oh); return [k, b]; };
const hasMoves = b => E.legalList(b[0], b[1], b[2], b[3]).length > 0;

function readNodes() {
  const map = new Map(), txt = [];
  if (fs.existsSync(NODES + '.gz')) txt.push(zlib.gunzipSync(fs.readFileSync(NODES + '.gz')).toString('utf8'));   // (a result sent back, compressed)
  if (fs.existsSync(NODES)) txt.push(fs.readFileSync(NODES, 'utf8'));
  for (const line of txt.join('\n').split('\n')) {
    if (!line) continue;
    let r; try { r = JSON.parse(line); } catch (e) { continue; }    // (a line cut off by Ctrl-C)
    map.set(r.k, r);
  }
  return map;
}

function settings() {
  const def = { depth: 22, maxPly: 24, cap: 3000, err: 4, window: 3, keep: 4, exact: 0 };
  let saved = fs.existsSync(CONF) ? JSON.parse(fs.readFileSync(CONF, 'utf8')) : null;
  const cfg = Object.assign({}, def, saved || {});
  for (const [a, k] of [['depth', 'depth'], ['max-ply', 'maxPly'], ['cap', 'cap'], ['err', 'err'], ['window', 'window'], ['keep', 'keep'], ['exact', 'exact']]) if (A[a] !== undefined) cfg[k] = +A[a];
  if (saved && (saved.depth !== cfg.depth || saved.keep !== cfg.keep || saved.exact !== cfg.exact) && !A['allow-mixed']) {
    console.error(`この作業フォルダは depth=${saved.depth} keep=${saved.keep} exact=${saved.exact} で作られています。変えるときは別の --dir を使うか --allow-mixed を付けてください。`);
    process.exit(1);
  }
  return cfg;
}

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
  const seeds = keys.filter(k => nxt.get(k).seed).sort();
  const rest = keys.filter(k => !nxt.get(k).seed).sort((a, b) => tot(a) - tot(b) || (a < b ? -1 : 1)).slice(0, Math.max(0, cfg.cap - seeds.length));
  const out = new Map();
  for (const k of seeds.concat(rest)) out.set(k, nxt.get(k));
  return out;
}

function loadSeed() {
  const s = new Set();
  const f = A.seed === undefined || A.seed === 'none' ? null : path.resolve(A.seed);
  const maxPly = A['seed-ply'] === undefined ? 99 : +A['seed-ply'];   // (only the seed's nodes up to this ply)
  const pcHex = h => { let c = 0; for (let x = parseInt(h, 16); x; x >>>= 1) c += x & 1; return c; };
  if (f && fs.existsSync(f)) for (const k of Object.keys(JSON.parse(fs.readFileSync(f, 'utf8')))) if ([0, 1, 2, 3].reduce((a, i) => a + pcHex(k.slice(i * 8, i * 8 + 8)), 0) - 4 <= maxPly) s.add(k);
  return s;
}

async function run() {
  const cfg = settings();
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(CONF, JSON.stringify(cfg, null, 1));
  const threads = +(A.threads || Math.max(1, os.cpus().length - 1));
  const seed = loadSeed();
  const done = readNodes();
  console.log(`設定 ${JSON.stringify(cfg)}  スレッド ${threads}  既存 ${done.size} 局面  シード ${seed.size} 局面  → ${DIR}`);
  const out = fs.openSync(NODES, 'a');
  const pool = [];
  for (let i = 0; i < threads; i++) pool.push(new Worker(__filename, { workerData: { cfg } }));
  let stop = false;
  process.on('SIGINT', () => { if (stop) process.exit(1); stop = true; console.log('\n停止します（読み途中の局面は次回やり直し。もう一度 Ctrl-C で即終了）'); pool.forEach(w => w.terminate()); });
  const t0 = Date.now(); let evals = 0;
  let [k0, b0] = canon(...START);
  let cur = new Map([[k0, { bits: b0, e: [0, 0] }]]);
  for (let p = 0; p <= cfg.maxPly && cur.size && !stop; p++) {
    const todo = [...cur.keys()].filter(k => !done.has(k));
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
            fs.writeSync(out, JSON.stringify(r) + '\n'); done.set(r.k, r);
            if (fin % 20 === 0 || fin === todo.length) {
              const el = (Date.now() - tp) / 1000, eta = el / fin * (todo.length - fin);
              process.stdout.write(`\r  ${p}手目: ${fin}/${todo.length}  ${(el / fin * threads).toFixed(1)}秒/局面/スレッド  この手目の残り ${Math.round(eta / 60)}分   `);
            }
            feed(w);
          });
          w.postMessage({ k, p, bits: cur.get(k).bits });
        };
        pool.forEach(feed);
      });
      process.stdout.write('\n');
    }
    if (stop) break;
    console.log(`${p}手目: ${cur.size} 局面（新規 ${todo.length}）  合計 ${done.size} 局面  経過 ${Math.round((Date.now() - t0) / 60000)}分`);
    if (p < cfg.maxPly) cur = nextPly(cur, p, done, cfg, seed);
  }
  fs.closeSync(out);
  await Promise.all(pool.map(w => w.terminate()));
  console.log(stop ? '中断しました。同じコマンドで続きから再開できます。' : `完了：${done.size} 局面（今回 ${evals} 局面を読みました）。次は node book-gen.js build`);
}

// ------------------------------------------------------------------ build book.bin
function build() {
  const done = readNodes(), cfg = settings();
  const outW = Math.round((+(A['out-window'] ?? 3)) * 100);
  const val = new Map(), list = new Map();
  const childKey = (bits, m) => { const c = E.childOf(bits[0], bits[1], bits[2], bits[3], m); return canon(c[0], c[1], c[2], c[3]); };
  const bitsOf = new Map();
  // the tree (bits of each node) from the initial position, and the backed-up values (negamax, memoized)
  const [k0, b0] = canon(...START);
  const value = (k, bits, stack) => {
    if (val.has(k)) return val.get(k);
    const r = done.get(k); bitsOf.set(k, bits);
    const sc = [];
    stack.add(k);
    for (const [m, v] of r.m) {
      const [ck, cb] = childKey(bits, m);
      let s = v, kid = false;
      if (done.has(ck) && !stack.has(ck)) { s = -value(ck, cb, stack); kid = true; }
      sc.push([m, s, kid]);
    }
    stack.delete(k);
    sc.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    const kept = sc.filter(x => x[1] >= sc[0][1] - outW || x[2]).map(x => [x[0], x[1]]);   // (a worse move that leads to a book node stays: the opponent may play it)
    list.set(k, kept); val.set(k, sc[0][1]);
    return sc[0][1];
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
  const dec = E.decodeBook(buf);
  let bad = 0; for (const k of written) { const l = list.get(k), d = dec.get(k); if (!d || d.length !== l.length || d.some((x, i) => x[0] !== l[i][0] || Math.abs(x[1] - Math.round(l[i][1] / 10) / 10) > 1e-9)) bad++; }
  let ply = {}; for (const k of written) { const b = bitsOf.get(k); const p = E.pc(b[0] | b[2]) + E.pc(b[1] | b[3]) - 4; ply[p] = (ply[p] || 0) + 1; }
  const nm = [...list.values()].reduce((a, l) => a + l.length, 0);
  console.log(`${f}: ${written.size} 局面・${nm} 手、${(buf.length / 1024).toFixed(0)} KB（gzip ${(zlib.gzipSync(buf, { level: 9 }).length / 1024).toFixed(0)} KB）。デコード確認 ${bad ? bad + ' 件不一致' : 'OK'}`);
  console.log('手目ごとの局面数', JSON.stringify(ply));
  console.log(`初期局面の評価 ${(val.get(k0) / 100).toFixed(2)} 石（黒から）  最善 ${list.get(k0).map(x => `${'abcdefgh'[x[0] & 7]}${(x[0] >> 3) + 1} ${(x[1] / 100).toFixed(2)}`).join(', ')}（正規形の座標）`);
  if (bad) process.exit(1);
}

// ------------------------------------------------------------------ verify: re-evaluate some nodes and compare
function verify() {
  const done = readNodes(), cfg = settings(), n = +(A.n || 8);
  const keys = [...done.keys()].sort();
  let ok = 0;
  for (let i = 0; i < Math.min(n, keys.length); i++) {
    const k = keys[Math.floor((i + 0.5) * keys.length / n)];
    const bits = [0, 1, 2, 3].map(j => parseInt(k.slice(j * 8, j * 8 + 8), 16) | 0);
    const r = evalNode(E, bits, cfg), want = done.get(k).m;
    const same = JSON.stringify(r.m) === JSON.stringify(want);
    ok += same;
    console.log(`${k} ${same ? '一致' : '不一致 ' + JSON.stringify(want) + ' → ' + JSON.stringify(r.m)}`);
  }
  console.log(`${ok}/${Math.min(n, keys.length)} 一致`);
  if (ok < Math.min(n, keys.length)) process.exit(1);
}

function status() {
  const done = readNodes(); const ply = {};
  for (const r of done.values()) ply[r.p] = (ply[r.p] || 0) + 1;
  const ms = [...done.values()].reduce((a, r) => a + r.ms, 0);
  console.log(`${DIR}: ${done.size} 局面  手目ごと ${JSON.stringify(ply)}  合計の読み時間 ${(ms / 3600000).toFixed(1)} 時間（スレッド合計）`);
  if (fs.existsSync(CONF)) console.log('設定', fs.readFileSync(CONF, 'utf8').replace(/\s+/g, ' '));
}

if (cmd === 'run') run();
else if (cmd === 'build') build();
else if (cmd === 'verify') verify();
else status();

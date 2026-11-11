// The C engine (engine.c) against the JavaScript of bg.js: the same plays, the same values, the same chosen plays.
//   node tools/cmatch.js [n] [exact.wasm]     (from backgammon/; n = positions, default 60)
// 1. genPlays: the same plays in the same order for every roll of every position.
// 2. evalPos (wildbg / bear-off), evalFast (weights.json), 1-ply, 2-ply: the largest difference of the probabilities.
//    engine_simd.wasm and engine.wasm must give the same numbers (bit for bit); the -DEXACT build (layers summed in double in
//    bg.js' order, tools/build.sh) shows what is left: e^x (C) vs Math.exp (JS).
// 3. The levels 9・10 (analyzePlays as the worker runs them, without the deadline): the chosen play and its equity.
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const dir = path.join(__dirname, '..'), bgPath = path.join(dir, 'bg.js');
const N = +process.argv[2] || 60, EXACT = process.argv[3];
const j = JSON.parse(fs.readFileSync(path.join(dir, 'weights.json'), 'utf8'));
const man = JSON.parse(fs.readFileSync(path.join(dir, 'wildbg.json'), 'utf8'));
const binB = fs.readFileSync(path.join(dir, 'wildbg.bin')), wb = binB.buffer.slice(binB.byteOffset, binB.byteOffset + binB.length);
const boB = zlib.gunzipSync(fs.readFileSync(path.join(dir, 'bearoff.bin.gz'))), bo = boB.buffer.slice(boB.byteOffset, boB.byteOffset + boB.length);
function loadBG(wasmFile) {
  delete require.cache[require.resolve(bgPath)];
  const BG = require(bgPath);
  BG.setNets(j); BG.loadWildbg(man, wb); BG.loadBearoff(bo);
  if (wasmFile) {
    const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(wasmFile)), { env: {} }).exports;
    if (!BG.setWasm(x, j, man, wb, bo)) throw new Error('setWasm failed: ' + wasmFile);
    BG._x = x;
  }
  return BG;
}
const JS = loadBG(null), SIMD = loadBG(path.join(dir, 'engine_simd.wasm')), PLAIN = loadBG(path.join(dir, 'engine.wasm'));
const EX = EXACT ? loadBG(EXACT) : null;
// positions: seeded games played by the 0-ply net (contact, races and bear-offs)
const rng = (a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; })(20261111);
const P = [];
for (let g = 0; P.length < N; g++) {
  let p = JS.initial(), s = g & 1;
  for (let k = 0; k < 200 && JS.winner(p) < 0; k++) {
    const d = [1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6)];
    const pl = JS.analyzePlays(p, s, d[0], d[1], { ply: 0 });
    if (k % 7 === 3 && P.length < N) P.push({ pos: p.slice(), side: s, dice: d });
    p = (rng() < 0.85 ? pl[0] : pl[Math.floor(rng() * pl.length)]).pos; s = 1 - s;
  }
}
const kind = q => JS.winner(q.pos) >= 0 ? 'over' : JS.isBearoffPos(q.pos) ? 'bearoff' : JS.contact(q.pos) ? 'contact' : 'race';
const kinds = {}; P.forEach(q => { const k = kind(q); kinds[k] = (kinds[k] || 0) + 1; });
console.log('positions', P.length, JSON.stringify(kinds));
// 1. plays
let nPl = 0, badPl = 0;
const x = SIMD._x, io = new Int8Array(x.memory.buffer, x.bg_io(), 52);
for (const q of P) for (const [a, b] of JS.ROLLS) {
  const js = JS.genPlays(q.pos, q.side, a, b).map(y => JS.key(y.pos));
  io.set(q.pos); const n = x.bg_plays(q.side, a, b), pp = new Int8Array(x.memory.buffer, x.bg_playpos(), 52 * n);
  const c = []; for (let i = 0; i < n; i++) c.push(JS.key(pp.subarray(52 * i, 52 * i + 52)));
  nPl++; if (c.join('|') !== js.join('|')) badPl++;
}
console.log(`genPlays: ${nPl - badPl}/${nPl} rolls give the same plays in the same order`);
// 2. values
const md = (A, B) => Math.max(...A.map((v, i) => Math.abs(v - B[i])));
const same = (A, B) => A.every((v, i) => Object.is(v, B[i]));
function cmp(name, f, list) {
  let dS = 0, dX = 0, sp = 0, t = [0, 0, 0];
  for (const q of list) {
    let t0 = performance.now(); const a = f(JS, q); t[0] += performance.now() - t0;
    t0 = performance.now(); const b = f(SIMD, q); t[1] += performance.now() - t0;
    t0 = performance.now(); const c = f(PLAIN, q); t[2] += performance.now() - t0;
    dS = Math.max(dS, md(a, b)); if (same(b, c)) sp++;
    if (EX) dX = Math.max(dX, md(a, f(EX, q)));
  }
  console.log(`${name}: ${list.length} positions, max |JS - C simd| ${dS.toExponential(2)}` + (EX ? `, max |JS - C exact| ${dX.toExponential(2)}` : '') +
    `, simd = plain bit for bit ${sp}/${list.length}; ms each: JS ${(t[0] / list.length).toFixed(2)}, C simd ${(t[1] / list.length).toFixed(3)}, C plain ${(t[2] / list.length).toFixed(3)}`);
}
const after = (BG, q) => { const pl = JS.genPlays(q.pos, q.side, q.dice[0], q.dice[1]); return pl[0].pos; };
cmp('evalPos (0-ply)', (BG, q) => BG.evalPos(q.pos, q.side), P);
cmp('evalFast', (BG, q) => BG.evalFast(q.pos, q.side), P);
cmp('1-ply', (BG, q) => BG.evalPly(after(BG, q), 1 - q.side, 1), P.slice(0, Math.min(P.length, 30)));
cmp('2-ply', (BG, q) => BG.evalPly(after(BG, q), 1 - q.side, 2), P.filter(q => kind(q) === 'contact').slice(0, 4).concat(P.filter(q => kind(q) === 'race').slice(0, 2)));
// 3. the levels 9・10 without the deadline (what the threads read): the chosen play and its equity
const LV = BG => Object.assign({}, BG.LEVEL_OPTS[10]); delete LV(JS).time;
let agree = 0, nA = 0, dE = 0, tj = 0, tc = 0;
const AP = P.filter(q => kind(q) === 'contact' || kind(q) === 'race').slice(0, +process.env.NA || 8);
for (const q of AP) {
  const o = Object.assign({}, JS.LEVEL_OPTS[10]); delete o.time;
  let t0 = performance.now(); const a = JS.analyzePlays(q.pos, q.side, q.dice[0], q.dice[1], o); tj += performance.now() - t0;
  t0 = performance.now(); const b = SIMD.analyzePlays(q.pos, q.side, q.dice[0], q.dice[1], o); tc += performance.now() - t0;
  nA++; if (JS.key(a[0].pos) === JS.key(b[0].pos)) agree++;
  dE = Math.max(dE, Math.abs(a[0].e - b[0].e));
}
console.log(`Lv.10 (2-ply, no deadline): the same play ${agree}/${nA}, max |equity difference| ${dE.toExponential(2)}; ms each: JS ${(tj / nA).toFixed(0)}, C simd ${(tc / nA).toFixed(1)} (x${(tj / tc).toFixed(1)})`);

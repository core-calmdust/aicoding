// One thread of engine_mt.wasm (shared memory, as a page's lead with no helper) through engine.js think: the moves, values,
// depths and node counts of a fixed set — the midgame (Multi-ProbCut on and off), lv.end (to the end of the game), the
// win/draw/loss and the exact solves. Praline's promise (claude/praline-spec.md §5): one thread searches exactly as before,
// so two builds print the same lines (2026-11-13, MODEL_CARD.md「マルチスレッド v5（Praline）」).
//   node tools/mt-one.js [--wasm engine_mt.wasm] [--engine engine.js] [--quick] > out.txt     (compare two outputs with diff)
//   --nowasm: engine.js's JavaScript search alone (REVERSI_NOWASM), the same set
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const RV = path.join(__dirname, '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const WASM = path.resolve(arg('--wasm', path.join(RV, 'engine_mt.wasm'))), ENG = path.resolve(arg('--engine', path.join(RV, 'engine.js')));
const QUICK = process.argv.includes('--quick'), NOWASM = process.argv.includes('--nowasm');
let E;
if (NOWASM) { process.env.REVERSI_NOWASM = '1'; E = require(ENG); }
else {
  const module = new WebAssembly.Module(fs.readFileSync(WASM));
  const mem = new WebAssembly.Memory({ initial: 1024, maximum: 16384, shared: true });
  const X = new WebAssembly.Instance(module, { env: { memory: mem, now: () => Date.now() } }).exports;
  const SLOT = 2 << 20, base = Math.ceil(X.mt_heap_base() / 65536) * 65536;
  if (mem.buffer.byteLength < base + 2 * SLOT) mem.grow(Math.ceil((base + 2 * SLOT - mem.buffer.byteLength) / 65536));
  X.mt_stack(base + SLOT - 16); X.mt_thread(base, 0);
  if (X.w_defer) X.w_defer();
  X.init();
  global.self = { REVERSI_WX: Object.assign({}, X, { memory: mem }), REVERSI_SPLIT: new Int32Array(new SharedArrayBuffer(512)) };
  E = require(ENG);
}
{
  let b = fs.readFileSync(path.join(RV, 'weights.bin.gz')); if (b[0] === 0x1f && b[1] === 0x8b) b = zlib.gunzipSync(b);
  const meta = JSON.parse(fs.readFileSync(path.join(RV, 'weights.json'), 'utf8'));
  E.setWeights(new Int16Array(b.buffer, b.byteOffset, b.length >> 1), meta.nphase);
}
// bench.html's positions
const MID = ["0000000000100000011220000122221022212200222212002010110000100000b", "0011000000111000011211000022210000222200002222000022220000220000b", "0000000000111100111110001212220012222220102222200000000000000000b", "0001000000011000001111110002111200021120000222220000220000022200b", "0000000000202000002221100002222200021222002122120011210000000100b", "0000000000020120001111110022222202221110020211000001120000000000b", "0001000000211100112220001122220011222220101000000221000000000000b", "0000000000120000221120000212120002222222011111200011100000000000b"];
const END = ["0111111000122100011211220111112200121122001122200010210000020100b", "0000110000111120022112200211212022222222021211110011110000001200b", "1000000001111000011102002212220021112210121222200122122010111020b", "0000010000011100011111110212111021222222222222222022220000002200b", "0000200010002000010022202111122021212122211212222122220100022200b", "2000000002220010112221001122110011112210111222201112200022220000b", "0000020000122200021122202222122002122211021221100021110002201110b", "0010000000111100012111221121212212211220202122000022110000201110b"];
const dec = s => ({ cells: s.slice(0, 64).split('').map(Number), toMove: s[64] === 'b' ? 1 : 2 });
// a position k plies further (the first legal move each ply; a pass when there is none)
function ahead(p, k) {
  let cells = p.cells.slice(), side = p.toMove;
  for (let i = 0; i < k; i++) {
    const [pl, ph, ol, oh] = E.toBits(cells, side), L = E.legalList(pl, ph, ol, oh);
    if (!L.length) { side = 3 - side; continue; }
    const m = L[(i * 7) % L.length], c = E.childOf(pl, ph, ol, oh, m), nb = new Array(64).fill(0);
    for (let q = 0; q < 64; q++) { const bit = (lo, hi) => q < 32 ? (lo >>> q) & 1 : (hi >>> (q - 32)) & 1; if (bit(c[2], c[3])) nb[q] = side; else if (bit(c[0], c[1])) nb[q] = 3 - side; }
    cells = nb; side = 3 - side;
  }
  return { cells, toMove: side };
}
const cases = [];
const nM = QUICK ? 4 : 8;
for (let i = 0; i < nM; i++) cases.push(['mid-mpc d13', dec(MID[i]), { depth: 13, exact: 0, mpc: 1 }]);
for (let i = 0; i < nM; i++) cases.push(['mid-nompc d9', dec(MID[i]), { depth: 9, exact: 0, mpc: 0 }]);
for (let i = 0; i < (QUICK ? 2 : 4); i++) cases.push(['end-search d8 end30', ahead(dec(MID[i]), 10), { depth: 8, exact: 0, end: 30, mpc: 1 }]);
for (let i = 0; i < nM; i++) cases.push(['wld d8 wld64', ahead(dec(END[i]), 2), { depth: 8, exact: 0, wld: 64, mpc: 1 }]);
for (let i = 0; i < nM; i++) cases.push(['exact', ahead(dec(END[i]), 3), { depth: 60, exact: 64, mpc: 1 }]);
for (let i = 0; i < (QUICK ? 2 : 4); i++) cases.push(['exact-nompc', ahead(dec(END[i]), 4), { depth: 60, exact: 64, mpc: 0 }]);
let tot = 0;
for (const [name, p, cfg] of cases) {
  E.clearTT && E.clearTT();
  const steps = [];
  const r = E.think(p.cells, p.toMove, { cfg, noBook: true, variety: false }, q => steps.push(q.depth + ':' + q.move + ':' + Math.round(q.score * 100) + ':' + q.nodes));
  const empties = p.cells.filter(x => !x).length;
  tot += r.nodes;
  console.log(`${name} e${empties} move ${r.move} score ${r.score} depth ${r.depth} exact ${!!r.exact} nodes ${r.nodes} | ${steps.join(' ')}`);
}
console.log('total nodes ' + tot);

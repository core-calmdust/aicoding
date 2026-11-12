// The C search (core.c → core.wasm / core_simd.wasm / core_mt.wasm) against the JavaScript search of engine.js: the same moves,
// values, depths and node counts (2026-11-12). node tools/check-core.js [--quick] [--mt]
//  · think at the levels decided by positions (6級〜) and depth-limited best() / analysis (rootList with a depth limit), 3 rules
//  · --mt: core_mt.wasm on one thread against the JavaScript search with the shared table (as the page's pool lead, mt.c layout)
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const E = require('../engine.js');
const dir = path.join(__dirname, '..');
const QUICK = process.argv.includes('--quick'), MT = process.argv.includes('--mt');
// weights as in the worker
E.loadWeightsBuffer('std', fs.readFileSync(path.join(dir, 'eval_std.bin')).buffer.slice(0));
const ab = b => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
E.setNN('renju', ab(fs.readFileSync(path.join(dir, 'nn48.wasm'))), ab(zlib.gunzipSync(fs.readFileSync(path.join(dir, 'nn_renju.bin.gz')))));
E.setNN('std', ab(fs.readFileSync(path.join(dir, 'nn.wasm'))), ab(zlib.gunzipSync(fs.readFileSync(path.join(dir, 'nn_std.bin.gz')))));
// positions: random games (seeded) of 6..34 plies near the stones, per rule; plus the bench positions
let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
const POS = [];
const BENCH = [[112,127,142,129,96,126,128],[112,127,143,129,130,113,125,141,155],[112,127,144,96,81,158,143,156,113,98,145],[112,127,128,98,145,144,130,96,99,115,159,111,113],[112,127,129,158,125,143,111,113],[112,127,113,98,114,111,129,144,99,115],[112,127,114,111,125,110,145,96,130,141,126,143],[112,127,97,129,159,111,141,96,125,84,114,158,83,146],[112,127,98,96,81,140,125],[112,127,99,98,144,111,145,131,116]];
BENCH.forEach((mv, i) => POS.push({ rule: i % 2 ? 'standard' : 'renju', moves: mv }));
for (const rule of ['renju', 'standard', 'free']) for (let g = 0; g < (QUICK ? 3 : 8); g++) {
  const pos = new E.Pos(rule), mv = [], n = 6 + Math.floor(rnd() * 28);
  for (let k = 0; k < n; k++) {
    const lg = pos.legal().filter(m => { const r = Math.floor(m / 15), c = m % 15; for (const q of pos.moves()) if (Math.abs(Math.floor(q / 15) - r) <= 2 && Math.abs(q % 15 - c) <= 2) return true; return pos.ply === 0 && m === 112; });
    if (!lg.length) break;
    const m = lg[Math.floor(rnd() * lg.length)]; pos.make(m); mv.push(m);
    if (pos.status().over) { pos.unmake(); mv.pop(); break; }
  }
  POS.push({ rule, moves: mv });
}
const LV = QUICK ? [10, 12, 14] : [10, 11, 12, 13, 14, 15, 16];
function runAll(label) {
  const out = []; let ms = 0, nodes = 0;
  const X = E.engX();
  X.clear();
  for (const p of POS) {
    const pos = E.replay(p.rule, p.moves);
    if (pos.status().over) continue;
    for (const lv of LV) {
      const t0 = performance.now(); const r = E.think(p.rule, p.moves, lv, null, () => 0.5); ms += performance.now() - t0; nodes += r.nodes || 0;
      out.push(['think', p.rule, p.moves.length, lv, r.move, r.v, r.depth, r.nodes, r.book ? 'b' : ''].join(' '));
    }
    for (const d of [3, 5]) {
      const t0 = performance.now(); const r = X.best(pos, { ms: 600000, depth: d, vct: 5, defend: 3 }); ms += performance.now() - t0; nodes += X.nodes;
      out.push(['best', p.rule, p.moves.length, d, r.i, r.v, r.depth, X.nodes, r.kind || ''].join(' '));
    }
    { const t0 = performance.now(); const r = E.analyze(p.rule, p.moves, 600000, null, null, QUICK ? 3 : 4); ms += performance.now() - t0; nodes += r.nodes;
      out.push(['analyze', p.rule, p.moves.length, r.depth, r.nodes, r.list.map(e => e.m + ':' + e.v).join(',')].join(' ')); }
    { const r = X.resist(pos, -1); out.push(['resist', p.rule, p.moves.length, r].join(' ')); }
  }
  console.log(label.padEnd(10), out.length, 'searches', Math.round(ms), 'ms', Math.round(nodes / ms) + 'k nodes/s');
  return out;
}
function cmp(a, b, la, lb) {
  let bad = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) { if (bad++ < 8) console.log('DIFF\n  ' + la + ' ' + a[i] + '\n  ' + lb + ' ' + b[i]); }
  console.log(bad ? `${bad} of ${a.length} differ` : `all ${a.length} the same (move, value, depth, nodes)`);
  return bad;
}
let fails = 0;
if (!MT) {
  const js = runAll('js');
  for (const f of ['core.wasm', 'core_simd.wasm']) {
    E.useCore(fs.readFileSync(path.join(dir, f)), f);
    const c = runAll(f); fails += cmp(js, c, 'js', f);
  }
  E.useCore(null);
} else {
  // the JavaScript search with the shared table (as the pool's lead, one thread)
  const n = 1 << 20, sab = k => new SharedArrayBuffer(k);
  const tt = { k1: new Int32Array(sab(4 * n)), k2: new Int32Array(sab(4 * n)), tv: new Int32Array(sab(4 * n)), td: new Int8Array(sab(n)), tf: new Int8Array(sab(n)), tm: new Int16Array(sab(2 * n)), hist: new Int32Array(sab(4 * 1560)), ctl: new Int32Array(sab(512)) };
  const J = new E.Engine(tt); J.age = 0; J.mtLead = true; J.mtId = 0; E.useEngine(J);
  const js = runAll('js-mt');
  E.useEngine(null);
  const mod = new WebAssembly.Module(fs.readFileSync(path.join(dir, 'core_mt.wasm')));
  const mem = new WebAssembly.Memory({ initial: 1, maximum: 16384, shared: true });
  let x;
  for (let pages = 1; ; pages *= 2) { try { mem.grow(pages); x = new WebAssembly.Instance(mod, E.coreImports(mem)).exports; break; } catch (e) { if (pages > 4096) throw e; } }
  const SLOT = 2 << 20, base = Math.ceil(x.mt_heap_base() / 65536) * 65536, need = base + 2 * SLOT;
  if (need > mem.buffer.byteLength) mem.grow(Math.ceil((need - mem.buffer.byteLength) / 65536));
  console.log('core_mt.wasm: heap base', x.mt_heap_base(), '(' + Math.ceil(x.mt_heap_base() / 65536) + ' pages), a thread', x.mt_tsize(), 'bytes');
  x.mt_stack(base + SLOT - 16); if (!x.mt_thread(base, 0)) throw new Error('mt_thread');
  E.coreUse(x, mem, 'wasm-mt'); E.coreWeights();
  const c = runAll('core_mt'); fails += cmp(js, c, 'js-mt', 'core_mt');
}
process.exit(fails ? 1 : 0);

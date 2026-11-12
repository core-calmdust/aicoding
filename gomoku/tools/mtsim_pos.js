// The positions and tables for tools/mtsim (sim.c with g_gomoku.h, 2026-11-12) into the current folder:
//   node <repo>/gomoku/tools/mtsim_pos.js   → pos_gomoku.txt, gomoku_tabs.bin
// pos_gomoku.txt: a line "P " + rule (0 renju, 1 standard, 2 free), the number of moves, the moves — bench.html's 10 positions
// and NPOS more (environment) from seeded games of the core at Lv.12. gomoku_tabs.bin: engine.js's pattern / zobrist tables and
// the weights, in the order g_gomoku.h reads them (copied out of a core.wasm that engine.js filled).
'use strict';
const path = require('path'), fs = require('fs'), zlib = require('zlib');
const dir = path.join(__dirname, '..'), E = require(path.join(dir, 'engine.js'));
const ab = b => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
E.loadWeightsBuffer('std', ab(fs.readFileSync(path.join(dir, 'eval_std.bin'))));
E.setNN('renju', ab(fs.readFileSync(path.join(dir, 'nn48.wasm'))), ab(zlib.gunzipSync(fs.readFileSync(path.join(dir, 'nn_renju.bin.gz')))));
E.setNN('std', ab(fs.readFileSync(path.join(dir, 'nn.wasm'))), ab(zlib.gunzipSync(fs.readFileSync(path.join(dir, 'nn_std.bin.gz')))));
const inst = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(dir, 'core.wasm'))), E.coreImports(null));
E.coreUse(inst.exports, inst.exports.memory, 'wasm'); E.coreWeights();
const X = inst.exports, B = inst.exports.memory.buffer, parts = [];
const take = (p, n) => parts.push(Buffer.from(new Uint8Array(B, p, n)));
take(X.tab_texact(), 59049); take(X.tab_tfree(), 59049); take(X.tab_combn(), 65536 * 4); take(X.tab_combr(), 65536 * 4); take(X.tab_combo(), 65536 * 2);
take(X.tab_za(), 520 * 3 * 4); take(X.tab_zb(), 520 * 3 * 4); take(X.tab_zs(), 8); take(X.tab_tag1(), 2048); take(X.tab_tag2(), 2048);
take(X.lw_p(), (4 * 716 + 202) * 4); take(X.lw2_p(), 4 * 59049 * 4);
take(X.nn_weights(0), X.nn_weights_size(0)); take(X.nn_weights(1), X.nn_weights_size(1));
parts.push(Buffer.from(new Int32Array([X.c_info()]).buffer));
fs.writeFileSync('gomoku_tabs.bin', Buffer.concat(parts));
const POS = [[112,127,142,129,96,126,128],[112,127,143,129,130,113,125,141,155],[112,127,144,96,81,158,143,156,113,98,145],[112,127,128,98,145,144,130,96,99,115,159,111,113],[112,127,129,158,125,143,111,113],[112,127,113,98,114,111,129,144,99,115],[112,127,114,111,125,110,145,96,130,141,126,143],[112,127,97,129,159,111,141,96,125,84,114,158,83,146],[112,127,98,96,81,140,125],[112,127,99,98,144,111,145,131,116]];
const out = POS.map((mv, i) => 'P ' + [i % 2, mv.length, ...mv].join(' '));
let seed = 99; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
for (let g = 0; out.length < 10 + (+process.env.NPOS || 0); g++) {
  const rule = g % 3, R = ['renju', 'standard', 'free'][rule], mv = [];
  const n = 14 + Math.floor(rnd() * 16);
  for (let k = 0; k < n; k++) { const r = E.think(R, mv, 12, null, rnd); if (r.move == null || r.move < 0) break; mv.push(r.move); if (E.replay(R, mv).status().over) { mv.pop(); break; } }
  out.push('P ' + [rule, mv.length, ...mv].join(' '));
}
fs.writeFileSync('pos_gomoku.txt', out.join('\n') + '\n');
console.log('pos_gomoku.txt', out.length, 'positions; gomoku_tabs.bin', parts.reduce((a, b) => a + b.length, 0), 'bytes');

// The renju engine for the opening tools in Node (2026-11-24 第2期・担当B): the C core (core.wasm) with the learned weights and the
// renju net, as the page plays. read(pos, d) = every candidate's value at a fixed depth d (no time limit, a cleared table: the same
// numbers every run).
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const E = require('../engine.js'), dir = path.join(__dirname, '..');
const ab = b => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
E.loadWeightsBuffer('std', ab(fs.readFileSync(path.join(dir, 'eval_std.bin'))));
E.setNN('renju', ab(fs.readFileSync(path.join(dir, 'nn48.wasm'))), ab(zlib.gunzipSync(fs.readFileSync(path.join(dir, 'nn_renju.bin.gz')))));
E.setNN('std', ab(fs.readFileSync(path.join(dir, 'nn.wasm'))), ab(zlib.gunzipSync(fs.readFileSync(path.join(dir, 'nn_std.bin.gz')))));
E.useCore(fs.readFileSync(path.join(dir, 'core.wasm')), 'core.wasm');
function read(moves, d, n) { const E2 = E.engX(); E2.clear(); const pos = E.replay('renju', moves); return E2.rootList(pos, 1e9, null, n || 24, d); }
module.exports = { E, read };

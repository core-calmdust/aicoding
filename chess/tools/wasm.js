// Node loader for the page's WebAssembly engine (engine.wasm + nnue.bin.gz) — the same search the puzzle checker in the
// browser uses (engine.js worker, 'analyze'). Node-limited so results are deterministic.
// usage: const W = require('./wasm.js'); W.analyze(fen, ucis, nodes, margin) → [{ uci, v, kind }] best first (v: mover's side, cp / ±mate; default margin = full window)
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const E = require('../engine.js');
const dir = path.join(__dirname, '..');
const mod = new WebAssembly.Module(fs.readFileSync(path.join(dir, 'engine.wasm')));
const X = new WebAssembly.Instance(mod, { env: { now: () => performance.now(), progress: () => {} } }).exports;
X.init(); X.new_game();
const nn = zlib.gunzipSync(fs.readFileSync(path.join(dir, 'nnue.bin.gz')));
if (nn.length !== X.nn_size()) throw new Error('nnue size');
new Uint8Array(X.memory.buffer).set(nn, X.nn_ptr()); X.nn_enable(1);
const CMATE = 31000, CMATE_MAX = CMATE - 256, MATE = E.MATE;
const toJS = v => v >= CMATE_MAX ? MATE - (CMATE - v) : v <= -CMATE_MAX ? -MATE + (CMATE + v) : v;
const wUci = m => { const a = new Uint8Array(X.memory.buffer), p = X.move_uci(m); let s = ''; for (let i = p; a[i]; i++) s += String.fromCharCode(a[i]); return s; };
function setPos(fen, ucis) {
  const s = fen + (ucis && ucis.length ? ' moves ' + ucis.join(' ') : '') + '\0';
  new Uint8Array(X.memory.buffer).set(new TextEncoder().encode(s), X.setup_ptr());
  X.set_position();
}
function analyze(fen, ucis, nodes, margin) {
  X.new_game(); setPos(fen, ucis);
  const n0 = X.legal_moves(); if (!n0) return [];
  let order = Array.from(new Int32Array(X.memory.buffer, X.legal_ptr(), n0)), last = null;
  X.ana_begin(1e9, nodes || 4e5);
  for (let d = 1; d <= 64; d++) {
    new Int32Array(X.memory.buffer, X.ana_moves(), order.length).set(order);
    const n = X.analyze_depth(order.length, d, margin || 40000);
    if (n < 0) break;
    const vals = new Int32Array(X.memory.buffer, X.ana_vals(), n), kinds = new Int32Array(X.memory.buffer, X.ana_kind(), n);
    last = order.map((cm, i) => ({ cm, v: toJS(vals[i]), kind: kinds[i] ? 'ub' : 'exact' }));
    order = last.slice().sort((a, b) => (b.v - a.v) || ((a.kind === 'ub') - (b.kind === 'ub'))).map(e => e.cm);
    const top = Math.max(...last.map(e => e.v));
    if (Math.abs(top) > E.MATET && MATE - Math.abs(top) < d) break;
  }
  return (last || []).map(e => ({ uci: wUci(e.cm), v: e.v, kind: e.kind })).sort((a, b) => b.v - a.v);
}
module.exports = { analyze };

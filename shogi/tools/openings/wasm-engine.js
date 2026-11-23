// The site's shogi engine (engine_simd512.wasm + nnue.bin.gz, the strongest setting of the page) for the node tools:
// the same loading as the worker in engine.js (wReady / loadNNUE / wsetup / wasmAnalyze).
//   const W = await require('./wasm-engine.js')();  (or require('./wasm-engine.js').loadSync())  W.analyze(sfen, { time: 3000 }) → [{ usi, s, d }, …] best first
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const DIR = path.join(__dirname, '../..');
const E = require(path.join(DIR, 'engine.js'));
function make(inst) {
  const net = zlib.gunzipSync(fs.readFileSync(path.join(DIR, 'nnue.bin.gz')));
  const dv = new DataView(net.buffer, net.byteOffset, net.byteLength);
  if (dv.getUint32(0, true) !== 0x5145554E) throw new Error('nnue.bin.gz: bad magic');
  const H = dv.getInt32(4, true), NIN = dv.getInt32(8, true);
  const file = H === 512 ? 'engine_simd512.wasm' : 'engine_simd.wasm';
  const env = { now: () => Date.now(), progress: () => {}, aprogress: () => {} };
  const instance = inst(fs.readFileSync(path.join(DIR, file)), { env });
  const X = instance.exports, MEM = X.memory; X.init();
  // linear weights (the page's weights.bin.gz) for the parts that still use them
  try { const w = zlib.gunzipSync(fs.readFileSync(path.join(DIR, 'weights.bin.gz'))); const W = new Int16Array(w.buffer.slice(w.byteOffset, w.byteOffset + w.length)); if (W.length === E.TEMPO + 1) new Int16Array(MEM.buffer, X.weights_ptr(), W.length).set(W); } catch (e) {}
  if (X.nue_h && X.nue_h() !== H) throw new Error('net width ' + H + ' ≠ wasm ' + X.nue_h());
  const b = net.buffer; let o = net.byteOffset + 12;
  new Int16Array(MEM.buffer, X.nue_w1_ptr(), NIN * H).set(new Int16Array(b.slice(o, o + NIN * H * 2))); o += NIN * H * 2;
  new Int32Array(MEM.buffer, X.nue_b1_ptr(), H).set(new Int32Array(b.slice(o, o + H * 4))); o += H * 4;
  new Int16Array(MEM.buffer, X.nue_w2_ptr(), 2 * H).set(new Int16Array(b.slice(o, o + H * 4))); o += H * 4;
  X.nue_set_b2(dv.getInt32(o - net.byteOffset, true));
  X.nue_enable(1); X.tt_clear();
  function setup(sfen) { const p = new E.Position(); p.setSfen(sfen); const a = new Int8Array(MEM.buffer, X.setup_ptr(), 98); a.set(p.board, 0); a.set(p.hand, 81); a[97] = p.side; X.set_position(); return p; }
  return {
    E,
    analyze(sfen, o = {}) {   // every legal move with a full window (score from the mover's side, centipawns)
      const p = setup(sfen); X.tt_clear();
      const n = X.analyze(o.time || 0, o.depth || 0, o.nodes || 0);
      const ms = new Int32Array(MEM.buffer, X.ana_moves(), n), ss = new Float64Array(MEM.buffer, X.ana_scores(), n), ds = new Int32Array(MEM.buffer, X.ana_depths(), n);
      return Array.from(ms, (m, i) => ({ usi: p.toUsi(m), s: Math.round(ss[i]), d: ds[i] }));
    },
  };
};
const inst = (buf, imp) => new WebAssembly.Instance(new WebAssembly.Module(buf), imp);
module.exports = async function load() { return make(inst); };
module.exports.loadSync = () => make(inst);   // (tools/lesson-verify.js: the checks run without await)

// Speed of a wasm build with a net (the browser's engine, under Node.js): fixed-node searches at N positions of a game
// the engine plays against itself from the start (6 plies apart).
//   node tools/nnue/wasm-bench.js <engine.wasm> <net.bin (NUEQ or NUEK)> [nodes = 200000] [positions = 8]
// (a HalfKP build: bash tools/nnue/build-kp.sh <dir> <net> with WASM=1 makes <dir>/engine_kp.wasm)
const fs = require('fs'), path = require('path');
const [wf, nf, nodesA, posA] = process.argv.slice(2);
const nodes = +(nodesA || 200000), npos = +(posA || 8);
const net = fs.readFileSync(nf), dv = new DataView(net.buffer, net.byteOffset, net.byteLength);
const env = { now: () => Number(process.hrtime.bigint()) / 1e6, progress() {}, aprogress() {} };
const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(wf)), { env }).exports;
x.init();
const mem = () => x.memory.buffer;
const magic = dv.getUint32(0, true), H = dv.getInt32(4, true), IN = dv.getInt32(8, true);
let o = 12;
if (magic === 0x4B45554E) { new Uint8Array(mem(), x.nue_kmap_ptr(), 84).set(net.subarray(16, 100)); o = 100; }
new Int16Array(mem(), x.nue_w1_ptr(), IN * H).set(new Int16Array(net.buffer.slice(net.byteOffset + o, net.byteOffset + o + IN * H * 2))); o += IN * H * 2;
new Int32Array(mem(), x.nue_b1_ptr(), H).set(new Int32Array(net.buffer.slice(net.byteOffset + o, net.byteOffset + o + H * 4))); o += H * 4;
new Int16Array(mem(), x.nue_w2_ptr(), 2 * H).set(new Int16Array(net.buffer.slice(net.byteOffset + o, net.byteOffset + o + H * 4))); o += H * 4;
x.nue_set_b2(dv.getInt32(o, true));
if (x.nue_kinit && !x.nue_kinit()) throw new Error('bad bucket map');
x.nue_enable(1);
// start position (engine layout: s = row * 9 + col, row 0 = 一段; piece = type + 16 * colour)
const W = 16, S = [2 + W, 3 + W, 4 + W, 7 + W, 8 + W, 7 + W, 4 + W, 3 + W, 2 + W, 0, 6 + W, 0, 0, 0, 0, 0, 5 + W, 0, ...Array(9).fill(1 + W), ...Array(27).fill(0), ...Array(9).fill(1), 0, 5, 0, 0, 0, 0, 0, 6, 0, 2, 3, 4, 7, 8, 7, 4, 3, 2];
const setStart = () => { const b = new Int8Array(mem(), x.setup_ptr(), 98); b.fill(0); b.set(S); x.set_position(); };
let tot = 0, t = 0;
setStart();
for (let k = 0; k < npos; k++) {
  for (let i = 0; i < 6; i++) { x.tt_clear(); const m = x.root_search(0, 0, 3000); if (!m) break; x.play_move(m); }   // advance 6 plies (untimed)
  x.tt_clear(); x.reset_search();
  const t0 = env.now(); x.root_search(0, 0, nodes); t += env.now() - t0;
  tot += new Int32Array(mem(), x.res_ptr(), 4)[2];
}
console.log(`${path.basename(wf)} H ${H} in ${IN}: nodes ${tot} time ${t.toFixed(0)} ms ${(tot / t).toFixed(0)} knps`);

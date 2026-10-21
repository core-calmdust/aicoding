// Node helper: load engine.wasm (+ endgame DB, + evaluation net) like the browser worker does.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const E = require('../engine.js');
async function load(opts) {
  opts = opts || {};
  const root = path.join(__dirname, '..');
  let prog = null;
  const { instance } = await WebAssembly.instantiate(fs.readFileSync(path.join(root, opts.nosimd ? 'engine.wasm' : 'engine_simd.wasm')), { env: { now: () => Date.now(), progress: d => prog && prog(d) } });
  const X = instance.exports;
  const io = () => new Int32Array(X.memory.buffer, X.io_ptr(), 8192);
  const netFile = opts.net || path.join(root, 'evalnet.bin.gz');
  if (fs.existsSync(netFile)) {
    let b = fs.readFileSync(netFile); if (netFile.endsWith('.gz')) b = zlib.gunzipSync(b);
    const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.length), dv = new DataView(ab);
    if (dv.getUint32(0, true) === 0x314E4B43) { const H = dv.getUint32(4, true), H2 = dv.getUint32(8, true), sc = dv.getFloat32(12, true), n = 128 * H + H + H * H2 + H2 + H2 + 1; new Float32Array(X.memory.buffer, X.net_ptr(), n).set(new Float32Array(ab, 16, n)); X.net_set(H, H2, sc); }
  }
  const dbFile = path.join(root, 'egdb4.bin.gz');
  if (fs.existsSync(dbFile)) {
    const b = zlib.gunzipSync(fs.readFileSync(dbFile)), ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
    const dv = new DataView(ab), nc = dv.getUint32(4, true); let o = 8 + nc * 8, base = X.heap_base();
    const cur = X.memory.buffer.byteLength; if (base + ab.byteLength + 65536 > cur) X.memory.grow(Math.ceil((base + ab.byteLength + 65536 - cur) / 65536));
    new Uint8Array(X.memory.buffer, base, ab.byteLength - o).set(new Uint8Array(ab, o));
    let off = base; for (let i = 0; i < nc; i++) { const h = 8 + i * 8; X.eg_add(dv.getUint8(h), dv.getUint8(h + 1), dv.getUint8(h + 2), dv.getUint8(h + 3), off); off += dv.getUint32(h + 4, true); }
  }
  const setup = (spec, moves) => { const p = E.Pos.from(spec), a = [p.b | 0, p.w | 0, p.k | 0, p.side, (moves || []).length]; for (const m of moves || []) a.push(E.mFrom(m) | (E.mTo(m) << 5), E.mCap(m) | 0); io().set(a); return X.setup(); };
  const wMove = (ft, cap) => E.mv(ft & 31, (ft >> 5) & 31, cap >>> 0);
  const list = () => { const r = io(), L = []; for (let i = 0; i < r[0]; i++) L.push({ m: wMove(r[2 + 3 * i], r[3 + 3 * i]), v: r[4 + 3 * i] }); return L; };
  return {
    X, E,
    analyze(spec, moves, ms) { setup(spec, moves); X.analyze(ms, 60); return { list: list(), depth: io()[1] }; },
    best(spec, moves, ms) { setup(spec, moves); X.best(99, ms, 0); const r = io(); return { m: wMove(r[0], r[1]), v: r[2], depth: r[3] }; },
    probe(spec) { setup(spec, []); return X.eg_probe_root(); },
    puzzle(spec, moves, n, defend, goal, base) { setup(spec, moves); X.puzzle(n, defend ? 1 : 0, goal || 0, base || 0, 3000); const r = io(), out = []; for (let i = 0; i < r[0]; i++) out.push({ m: wMove(r[1 + 3 * i], r[2 + 3 * i]), need: r[3 + 3 * i] }); return out; },
    newGame() { X.new_game(); },
  };
}
module.exports = { load };

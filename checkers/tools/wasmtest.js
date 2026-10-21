// node tools/wasmtest.js — load engine.wasm like the worker does and run a few searches
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const E = require('../engine.js');
(async () => {
  let prog = null;
  const { instance } = await WebAssembly.instantiate(fs.readFileSync(path.join(__dirname, '../engine.wasm')), { env: { now: () => Date.now(), progress: d => prog && prog(d) } });
  const X = instance.exports;
  const b = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, '../egdb4.bin.gz'))).buffer;
  const dv = new DataView(b), nc = dv.getUint32(4, true); let o = 8 + nc * 8, base = X.heap_base();
  const cur = X.memory.buffer.byteLength; if (base + b.byteLength + 65536 > cur) X.memory.grow(Math.ceil((base + b.byteLength + 65536 - cur) / 65536));
  new Uint8Array(X.memory.buffer, base, b.byteLength - o).set(new Uint8Array(b, o));
  let off = base; for (let i = 0; i < nc; i++) { const h = 8 + i * 8; X.eg_add(dv.getUint8(h), dv.getUint8(h + 1), dv.getUint8(h + 2), dv.getUint8(h + 3), off); off += dv.getUint32(h + 4, true); }
  const io = () => new Int32Array(X.memory.buffer, X.io_ptr(), 8192);
  const setup = (spec, moves) => { const p = E.Pos.from(spec), a = [p.b | 0, p.w | 0, p.k | 0, p.side, moves.length]; for (const m of moves) a.push(E.mFrom(m) | (E.mTo(m) << 5), E.mCap(m) | 0); io().set(a); return X.setup(); };
  console.log('setup', setup(null, []));
  let t = Date.now(); X.best(99, 1000, 0); let r = io(); console.log('best', r[0] & 31, (r[0] >> 5) & 31, 'v', r[2], 'depth', r[3], 'knodes', r[4], Date.now() - t, 'ms');
  // 2 kings vs 1 king: should be a win (DB)
  const spec = { b: '.'.repeat(32).split('').map((c, i) => i === 13 ? 'B' : i === 17 ? 'B' : i === 30 ? 'W' : '.').join(''), side: 1 };
  setup(spec, []); console.log('probe 2K v 1K (black to move):', X.eg_probe_root());
  X.analyze(500, 60); r = io(); console.log('analyze n', r[0], 'depth', r[1], 'best v', r[4]);
  // puzzle: win in n
  setup(spec, []); X.puzzle(12, 0, 0, 0, 3000); r = io(); const L = []; for (let i = 0; i < r[0]; i++) L.push(r[3 + 3 * i]); console.log('win-in needs', L);
})();

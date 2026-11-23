// Positions (17-byte records of rvtrain: P, O, target) -> records for netz.py: 62 uint16 pattern indices (within each
// pattern's table), 4 uint8 extras, the ply, the target (130 bytes).   node netz-conv.js out.x positions.bin…
const dir = require('path').join(__dirname, '../../..');
const E = require(dir + '/engine.js'), zlib = require('zlib'), fs = require('fs');
const buf = zlib.gunzipSync(fs.readFileSync(dir + '/weights.bin.gz'));
E.setWeights(new Int16Array(buf.buffer, buf.byteOffset, buf.length / 2), 60);
const offs = []; for (const p of E.PATTERNS) for (const m of p.inst) offs.push(p.offset);
const EXT_OFF = 403461, R = 130, tmp = new Int32Array(66);
const out = fs.openSync(process.argv[2], 'w'); let n = 0, se = 0;
for (const f of process.argv.slice(3)) {
  const fd = fs.openSync(f, 'r'), CH = 17 * 65536, ib = Buffer.alloc(CH); let got;
  while ((got = fs.readSync(fd, ib, 0, CH)) > 0) {
    const k = got / 17 | 0, ob = Buffer.alloc(k * R);
    for (let i = 0; i < k; i++) {
      const o = i * 17, pl = ib.readInt32LE(o), ph = ib.readInt32LE(o + 4), ol = ib.readInt32LE(o + 8), oh = ib.readInt32LE(o + 12), t = ib.readInt8(o + 16);
      E.featureIndices(pl, ph, ol, oh, tmp, true);
      const b = i * R; for (let j = 0; j < 62; j++) ob.writeUInt16LE(tmp[j] - offs[j], b + 2 * j);
      for (let j = 0; j < 4; j++) ob[b + 124 + j] = tmp[62 + j] - EXT_OFF - 64 * j;
      ob[b + 128] = E.pc(pl | ol) + E.pc(ph | oh) - 4; ob.writeInt8(t, b + 129);
      if (n < 200000) { const d = E.evaluate(pl, ph, ol, oh) / 100 - t; se += d * d; }
      n++;
    }
    fs.writeSync(out, ob);
  }
}
console.log('positions', n, 'rmse of the shipped weights on the first 200k', Math.sqrt(se / Math.min(n, 200000)).toFixed(3));

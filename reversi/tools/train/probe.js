// node tools/train/probe.js weights.bin.gz positions.bin N: as "rvlabel probe" through engine.js (wasm) — the outputs must match
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const E = require(path.join(__dirname, '../../engine.js'));
let raw = fs.readFileSync(process.argv[2]); if (raw[0] === 0x1f && raw[1] === 0x8b) raw = zlib.gunzipSync(raw);
E.setWeights(new Int16Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length)), 30);
const buf = fs.readFileSync(process.argv[3]), n = Math.min(+process.argv[4], buf.length / 17), out = [];
for (let i = 0; i < n; i++) {
  const o = i * 17, pl = buf.readUInt32LE(o) | 0, ph = buf.readUInt32LE(o + 4) | 0, ol = buf.readUInt32LE(o + 8) | 0, oh = buf.readUInt32LE(o + 12) | 0;
  E.clearTT(); const ev = E.evaluate(pl, ph, ol, oh);
  E.clearTT(); E.deadline = Infinity; const n0 = E.nodes, v = E.search(pl, ph, ol, oh, 5, -32000, 32000, 0, false);
  out.push(`${ev} ${v} ${E.nodes - n0}`);
}
console.log(out.join('\n'));

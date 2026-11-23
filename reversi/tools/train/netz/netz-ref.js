// A test set with Edax's deep-search values, as an outside yardstick for netz.py / pnet.py:
//   EDAX=…/lEdax node netz-ref.js valid.bin N level out      -> out.x (records as netz-conv.js) and out.ref (int8 values, Edax)
// valid.bin: 17-byte records ordered by ply, 50,000 per ply from ply 8. Takes N positions at each of 52…22 empties (step 6).
const fs = require('fs'), zlib = require('zlib'), cp = require('child_process'), path = require('path');
const dir = path.join(__dirname, '../../..'), E = require(dir + '/engine.js'), EDAX = process.env.EDAX;
const [SRC, N, LV, OUT] = [process.argv[2], +process.argv[3], process.argv[4], process.argv[5]];
const buf = zlib.gunzipSync(fs.readFileSync(dir + '/weights.bin.gz')); E.setWeights(new Int16Array(buf.buffer, buf.byteOffset, buf.length / 2), 60);
const offs = []; for (const p of E.PATTERNS) for (const m of p.inst) offs.push(p.offset);
const d = fs.readFileSync(SRC), tmp = new Int32Array(66), R = 130, recs = [], refs = [];
const pcb = x => { let n = 0; for (; x; x &= x - 1n) n++; return n; };
for (const e of [52, 46, 40, 34, 28, 22]) {
  const pos = [], seen = new Set(), a0 = (60 - e - 8) * 50000;
  for (let i = a0 + 5; i < a0 + 50000 && pos.length < N; i += 11) {
    const P = d.readBigUInt64LE(i * 17), O = d.readBigUInt64LE(i * 17 + 8); if (64 - pcb(P | O) !== e) continue;
    let s = ''; for (let q = 0; q < 64; q++) s += (P >> BigInt(q)) & 1n ? 'X' : (O >> BigInt(q)) & 1n ? 'O' : '-';
    const b = [Number(P & 0xFFFFFFFFn) | 0, Number(P >> 32n) | 0, Number(O & 0xFFFFFFFFn) | 0, Number(O >> 32n) | 0];
    if (!seen.has(s) && E.legalList(...b).length) { seen.add(s); pos.push({ s, b, t: d.readInt8(i * 17 + 16) }); }
  }
  const f = require('os').tmpdir() + `/netz-ref${e}.obf`; fs.writeFileSync(f, pos.map(p => p.s + ' X;\n').join(''));
  const o = cp.execFileSync(EDAX, ['-solve', f, '-l', LV, '-n', '2', '-book-usage', 'off'], { cwd: path.dirname(EDAX), maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  const v = []; for (const l of o.split('\n')) { const m = l.match(/^\s*\d+\|\s*\S+\s+([+-]\d+)\s/); if (m) v.push(+m[1]); }
  if (v.length !== pos.length) throw new Error('edax ' + v.length + ' of ' + pos.length);
  pos.forEach((p, i) => { const ob = Buffer.alloc(R); E.featureIndices(...p.b, tmp, true);
    for (let j = 0; j < 62; j++) ob.writeUInt16LE(tmp[j] - offs[j], 2 * j); for (let j = 0; j < 4; j++) ob[124 + j] = tmp[62 + j] - 403461 - 64 * j;
    ob[128] = 60 - e; ob.writeInt8(p.t, 129); recs.push(ob); refs.push(v[i]); });
  console.log('empties', e, pos.length);
}
fs.writeFileSync(OUT + '.x', Buffer.concat(recs)); fs.writeFileSync(OUT + '.ref', Buffer.from(Int8Array.from(refs).buffer));

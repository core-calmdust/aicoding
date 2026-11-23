// Accuracy of evaluation files against Edax's deep search on real positions (static value and a depth-4 search; mean
// absolute difference and, in brackets, the mean difference).   EDAX=…/lEdax node netz-acc.js valid.bin N level w1.bin.gz w2.bin.gz …
// valid.bin: 17-byte records ordered by ply, 50,000 per ply from ply 8 (the sample netz.py validates on). Edax only runs here.
const fs = require('fs'), zlib = require('zlib'), cp = require('child_process');
const E = require(require('path').join(__dirname, '../../../engine.js')), EDAX = process.env.EDAX;
const SRC = process.argv[2], N = +process.argv[3], LV = process.argv[4], files = process.argv.slice(5), TMP = require('os').tmpdir();
const d = fs.readFileSync(SRC), total = d.length / 17;
const pcb = x => { let n = 0; for (; x; x &= x - 1n) n++; return n; };
const str = (P, O) => { let s = ''; for (let q = 0; q < 64; q++) s += (P >> BigInt(q)) & 1n ? 'X' : (O >> BigInt(q)) & 1n ? 'O' : '-'; return s; };
const EMP = [52, 46, 40, 34, 28, 22], sets = {};
for (const e of EMP) {
  const pos = [], seen = new Set(); const a0 = (60 - e - 8) * 50000;      // the file is ordered by ply, 50,000 each
  for (let i = a0; i < a0 + 50000 && pos.length < N; i += 37) { const P = d.readBigUInt64LE(i * 17), O = d.readBigUInt64LE(i * 17 + 8); if (64 - pcb(P | O) !== e) continue; const s = str(P, O);
    const b = [Number(P & 0xFFFFFFFFn) | 0, Number(P >> 32n) | 0, Number(O & 0xFFFFFFFFn) | 0, Number(O >> 32n) | 0];
    if (!seen.has(s) && E.legalList(...b).length) { seen.add(s); pos.push({ s, b, t: d.readInt8(i * 17 + 16) }); } }
  const f = `${TMP}/netz-acc${e}.obf`, rf = `${TMP}/netz-acc${e}.l${LV}.json`;
  if (!fs.existsSync(rf)) { fs.writeFileSync(f, pos.map(p => p.s + ' X;\n').join(''));
    const o = cp.execFileSync(EDAX, ['-solve', f, '-l', LV, '-n', '1', '-book-usage', 'off'], { cwd: require('path').dirname(EDAX), maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const v = []; for (const l of o.split('\n')) { const m = l.match(/^\s*\d+\|\s*\S+\s+([+-]\d+)\s/); if (m) v.push(+m[1]); }
    if (v.length !== pos.length) throw new Error('edax ' + v.length + ' of ' + pos.length); fs.writeFileSync(rf, JSON.stringify(v)); }
  const ref = JSON.parse(fs.readFileSync(rf)); pos.forEach((p, i) => p.ref = ref[i]); sets[e] = pos;
}
const st = (a) => { const n = a.length, m = a.reduce((s, x) => s + x, 0) / n; return [m, a.reduce((s, x) => s + Math.abs(x), 0) / n, Math.sqrt(a.reduce((s, x) => s + x * x, 0) / n)]; };
console.log('game result vs Edax        : ' + EMP.map(e => 'e' + e + ' mae ' + st(sets[e].map(p => p.t - p.ref))[1].toFixed(2)).join('  '));
for (const f of files) {
  const buf = zlib.gunzipSync(fs.readFileSync(f)); E.setWeights(new Int16Array(buf.buffer, buf.byteOffset, buf.length / 2), 60);
  for (const dep of [0, 4]) {
    const out = EMP.map(e => { const r = st(sets[e].map(p => { if (!dep) return E.evaluate(...p.b) / 100 - p.ref; E.clearTT(); const c = []; for (let q = 0; q < 64; q++) c.push(p.s[q] === 'X' ? 1 : p.s[q] === 'O' ? 2 : 0);
      return E.think(c, 1, { cfg: { depth: dep, exact: 0, wld: 0, end: 0, mpc: 0 }, noBook: true, variety: false, time: 0 }, () => {}).score - p.ref; })); return `e${e} ${r[1].toFixed(2)} (${r[0] >= 0 ? '+' : ''}${r[0].toFixed(2)})`; });
    console.log((f.split('/').pop().replace('.bin.gz', '') + ' d' + dep).padEnd(27) + ': ' + out.join('  '));
  }
}

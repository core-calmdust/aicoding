// encode gen outputs (DFS order: "path canonMove val") into tree.bin
// node encode.js s0.txt D0 s1.txt D1 out.bin R0 R1   (R = max root ply, default side)
const fs = require('fs');
const [f0, d0, f1, d1, out, R0, R1] = process.argv.slice(2);
const recs = f => fs.readFileSync(f, 'utf8').trim().split('\n').map(l => { const [, m, v] = l.split(' '); return [+m, +v]; });
const r0 = recs(f0), r1 = recs(f1);
const all = r0.concat(r1);
const bits = all.length * 9, body = new Uint8Array(Math.ceil(bits / 8));
let bp = 0;
const put = (x, n) => { for (let i = 0; i < n; i++, bp++) if ((x >> i) & 1) body[bp >> 3] |= 1 << (bp & 7); };
for (const [m, v] of all) {
  const vc = v >= 90 ? 38 + Math.sign(v - 100) : v + 18;
  if (vc < 0 || vc > 39 || m < 0 || m > 6) throw new Error('bad ' + m + ' ' + v);
  put(m, 3); put(vc, 6);
}
const hdr = Buffer.alloc(16);
hdr.write('C4T1', 0); hdr.writeUInt32LE(r0.length, 4); hdr.writeUInt32LE(r1.length, 8); hdr[12] = +d0; hdr[13] = +d1; hdr[14] = +(R0 || 0); hdr[15] = +(R1 || 1);
fs.writeFileSync(out, Buffer.concat([hdr, Buffer.from(body)]));
console.log('records', r0.length, r1.length, 'bytes', 16 + body.length);

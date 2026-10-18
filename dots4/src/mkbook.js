// merge book_*.txt results into dots4book.bin (see x4LoadBook in engine.js)
const fs = require('fs');
const dir = process.argv[2], out = process.argv[3];
const map = new Map();
for (const f of fs.readdirSync(dir).filter(f => /^book_\d+\.txt$/.test(f)).sort()) {
  for (const line of fs.readFileSync(dir + '/' + f, 'utf8').split('\n')) {
    const a = line.trim().split(/\s+/); if (a.length < 5) continue;
    const k = BigInt('0x' + a[0]); if (!map.has(k)) map.set(k, [+a[1], +a[2], 1]);
  }
}
const keys = [...map.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
const buf = []; buf.push(68, 66, 52, 1); const n = keys.length; buf.push(n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255);
let prev = 0n;
for (const k of keys) {
  let d = k - prev; prev = k;
  do { let c = Number(d & 127n); d >>= 7n; if (d) c |= 128; buf.push(c); } while (d);
  const [mv, v, fl] = map.get(k); buf.push(mv | (fl << 6), v + 32);
}
fs.writeFileSync(out, Buffer.from(buf));
console.log('entries', n, 'bytes', buf.length);

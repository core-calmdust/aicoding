// CC0 wildbg-training rollouts (GnuBG position id + probabilities) -> 74-byte records, player on roll = side 0
const fs = require('fs'), { decodePid } = require(__dirname + '/pid.js'), BG = require(__dirname + '/bgn.js');
const [out, ...files] = process.argv.slice(2); const recs = [];
for (const f of files) for (const ln of fs.readFileSync(f, 'utf8').split('\n').slice(1)) {
  if (!ln) continue; const [id, ...v] = ln.split(','); const p = decodePid(id);
  if (BG.winner(p) >= 0) continue;
  const b = Buffer.alloc(74); for (let i = 0; i < 52; i++) b[i] = p[i] & 255; b[52] = 0; b[53] = BG.contact(p) ? 0 : 1;
  for (let k = 0; k < 5; k++) b.writeFloatLE(+v[k], 54 + 4 * k); recs.push(b);
}
fs.writeFileSync(out, Buffer.concat(recs)); console.log(out, recs.length);

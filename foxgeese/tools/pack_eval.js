// node foxgeese/tools/pack_eval.js <model.json>  — puts the trained evaluation (tools/train_eval.py) into engine.js
// (between the NNW-BEGIN / NNW-END lines) as int16 base64 with one scale per array. 2026-11-18.
const fs = require('fs'), path = require('path');
const M = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const flat = a => Array.isArray(a) ? a.flat(Infinity) : [a];
const arrs = { W1: flat(M.W1), Ws: flat(M.Ws), Wq: flat(M.Wq), b1: flat(M.b1), W2: flat(M.W2), b2: flat(M.b2), w3: flat(M.w3), b3: [M.b3] };
const out = { h1: M.h1, h2: M.h2, scale: M.scale, positions: M.positions, a: {} };
for (const [k, v] of Object.entries(arrs)) {
  const mx = Math.max(1e-9, ...v.map(Math.abs)), s = mx / 32767, q = new Int16Array(v.map(x => Math.round(x / s)));
  out.a[k] = [s, Buffer.from(q.buffer).toString('base64')];
}
const file = process.argv[3] ? path.resolve(process.argv[3]) : path.join(__dirname, '..', 'engine.js'), src = fs.readFileSync(file, 'utf8');
const a = src.indexOf('// NNW-BEGIN'), b = src.indexOf('// NNW-END');
if (a < 0 || b < 0) throw new Error('markers not found');
const line = `// NNW-BEGIN (tools/pack_eval.js: the learned evaluation of the 15-goose rule — ${M.positions} self-play positions × 2 mirrored)\nconst NNW = ${JSON.stringify(out)};\n`;
fs.writeFileSync(file, src.slice(0, a) + line + src.slice(b));
console.log('packed', (line.length / 1024).toFixed(1), 'KB');

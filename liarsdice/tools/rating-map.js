// Arena Elo (tools/arena.js, last line JSON) → the rating of each level on the common scale (400 … 1900).
// Isotonic (pool adjacent violators) so a stronger level is never shown below a weaker one, then a minimum step of
// 2% of the span between neighbours, then the two ends set to 400 and 1900. node tools/rating-map.js '<json>'
'use strict';
const E = JSON.parse(process.argv[2]), L = Object.keys(E).map(Number).sort((a, b) => a - b), y = L.map(l => E[l]);
// PAVA
const blocks = y.map((v, i) => ({ v, n: 1, i }));
for (let i = 0; i < blocks.length - 1;) {
  if (blocks[i].v > blocks[i + 1].v) { const a = blocks[i], b = blocks[i + 1]; a.v = (a.v * a.n + b.v * b.n) / (a.n + b.n); a.n += b.n; blocks.splice(i + 1, 1); if (i) i--; }
  else i++;
}
const iso = []; for (const b of blocks) for (let k = 0; k < b.n; k++) iso.push(b.v);
const span = iso[iso.length - 1] - iso[0], minStep = span * .02;
for (let i = 1; i < iso.length; i++) if (iso[i] < iso[i - 1] + minStep) iso[i] = iso[i - 1] + minStep;
const lo = iso[0], hi = iso[iso.length - 1];
const R = iso.map(v => Math.round((400 + (v - lo) / (hi - lo) * 1500) / 5) * 5);
console.log('levels', L.join(' '));
console.log('elo   ', y.map(v => Math.round(v)).join(' '));
console.log('iso   ', iso.map(v => Math.round(v)).join(' '));
console.log('RT_LV = [0, ' + R.join(', ') + ']');

// 向聴数の照合用：ランダムな13枚（副露0〜2）を JSONL で出す
'use strict';
let seed = +process.argv[3] || 1;
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const N = +process.argv[2] || 10000;
for (let i = 0; i < N; i++) {
  const m = rnd() < 0.6 ? 0 : rnd() < 0.6 ? 1 : 2;
  const c = new Array(34).fill(0), melds = [];
  const bias = rnd();
  const pickT = () => { if (bias < 0.3) { const s = Math.floor(rnd() * 3); return rnd() < 0.7 ? s * 9 + Math.floor(rnd() * 9) : 27 + Math.floor(rnd() * 7); } return Math.floor(rnd() * 34); };
  for (let k = 0; k < m; k++) { const t = Math.floor(rnd() * 27); if (t % 9 <= 6 && c[t] < 4 && c[t + 1] < 4 && c[t + 2] < 4) { melds.push({ k: 'chi', t }); c[t]++; c[t + 1]++; c[t + 2]++; } else if (c[t] <= 1) { melds.push({ k: 'pon', t }); c[t] += 3; } }
  const hand = [];
  while (hand.length < 13 - 3 * melds.length) { const t = pickT(); if (c[t] < 4) { c[t]++; hand.push(t); } }
  process.stdout.write(JSON.stringify({ melds, hand }) + '\n');
}

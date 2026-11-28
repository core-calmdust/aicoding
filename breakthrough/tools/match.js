// node tools/match.js <games> <ms | n<thousand nodes>> '<json weights A>' '<json weights B>' [rule]
// Two engine instances (each its own WebAssembly memory) with different evaluation weights (set_w index → value) play each
// other: random first 4 plies (the same opening for both colour assignments), colours alternate. Prints B's score.
const path = require('path');
function inst() { const p = require.resolve('../engine.js'); delete require.cache[p]; return require(p); }
const G = +(process.argv[2] || 100), MSA = String(process.argv[3] || '50'), NK = /^n/.test(MSA) ? +MSA.slice(1) : 0, MS = NK ? 0 : +MSA, WA = JSON.parse(process.argv[4] || '{}'), WB = JSON.parse(process.argv[5] || '{}'), RULE = process.argv[6] || 's8';
const A = inst(), B = inst();
A.setRule(RULE); B.setRule(RULE);
for (const k in WA) A.setW(+k, WA[k]); for (const k in WB) B.setW(+k, WB[k]);
let seed = 4242; const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // mulberry32
let sb = 0, n = 0;
for (let g = 0; g < G; g += 2) {
  const pos0 = A.Pos.from(null), open = [];
  for (let k = 0; k < 4; k++) { const L = pos0.moves(); const m = L[Math.floor(rnd() * L.length)]; open.push(m); pos0.play(m); }
  for (const bWhite of [true, false]) {
    const pos = A.Pos.from(null); const mv = [];
    for (const m of open) { pos.play(m); mv.push(m); }
    A.ttClear(); B.ttClear();
    while (!A.judge(pos).over && mv.length < 300) {
      const E = (pos.turn === 1) === bWhite ? B : A;
      const r = E.bestMove(pos, 60, MS, NK); pos.play(r.move); mv.push(r.move);
    }
    const w = A.judge(pos).winner; if ((w === 1) === bWhite) sb++; n++;
  }
}
const s = sb / n; console.log(`B ${sb}/${n} = ${(s * 100).toFixed(1)}%  Elo ${s <= 0 || s >= 1 ? '∞' : Math.round(-400 * Math.log10(1 / s - 1))}`);

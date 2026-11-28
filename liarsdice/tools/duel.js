// one level against a field: node duel.js A B games players  -> average place score of A (1 = always first, 0 = always last)
'use strict';
const path = require('path'); require(path.join(__dirname, '..', 'engine.js')); require(path.join(__dirname, '..', 'ai.js'));
const LD = globalThis.LD, AI = globalThis.LDAI;
if (process.env.OVA) globalThis.LD_PARAM_OV = { [+process.argv[2]]: JSON.parse(process.env.OVA) };
if (process.env.OVB) { globalThis.LD_PARAM_OV = globalThis.LD_PARAM_OV || {}; globalThis.LD_PARAM_OV[+process.argv[3]] = JSON.parse(process.env.OVB); }
const A = +process.argv[2], B = +process.argv[3], NG = +process.argv[4] || 300, NP = +process.argv[5] || 4;
let seed = +process.argv[6] || 99; const rng = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1e9) / 1e9; };
let sc = 0, first = 0; const t0 = Date.now();
for (let g = 0; g < NG; g++) {
  const aSeat = g % NP, lv = Array.from({ length: NP }, (_, i) => i === aSeat ? A : B);
  const G = LD.newGame({ players: NP, rules: LD.PRESETS[process.env.RULES || 'perudo'], starter: Math.floor(rng() * NP) });
  while (!G.over) { LD.startRound(G, rng); let res = null; while (!res) { const p = G.round.turn; res = LD.act(G, p, AI.decide(G, p, lv[p], rng)); } }
  const pl = LD.places(G), k = pl.indexOf(aSeat); sc += (NP - 1 - k) / (NP - 1); if (k === 0) first++;
}
const m = sc / NG, se = Math.sqrt(m * (1 - m) / NG / 1.5);
console.log(`Lv${A} vs ${NP - 1}×Lv${B}: score ${m.toFixed(3)} ±${se.toFixed(3)} (fair ${0.5}), first ${(first / NG * 100).toFixed(1)}% (fair ${(100 / NP).toFixed(1)}%)  ${((Date.now() - t0) / 1000).toFixed(1)}s`);

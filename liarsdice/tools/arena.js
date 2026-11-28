// AI strength: many games at a table of mixed levels, pairwise results from the finishing order, Elo fitted (Bradley–Terry).
// node liarsdice/tools/arena.js [games=4000] [players=4] [levels=1..20] [seed]
'use strict';
const path = require('path'); require(path.join(__dirname, '..', 'engine.js')); require(path.join(__dirname, '..', 'ai.js'));
const LD = globalThis.LD, AI = globalThis.LDAI;
if (process.env.OV) globalThis.LD_PARAM_OV = JSON.parse(process.env.OV);
const NG = +process.argv[2] || 4000, NP = +process.argv[3] || 4;
const LVS = process.argv[4] ? process.argv[4].split(',').map(Number) : Array.from({ length: 20 }, (_, i) => i + 1);
let seed = +process.argv[5] || 12345;
const rng = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1e9) / 1e9; };
const W = {}, N = {};   // W[a][b] wins of a over b
const add = (a, b, s) => { W[a] = W[a] || {}; N[a] = N[a] || {}; W[a][b] = (W[a][b] || 0) + s; N[a][b] = (N[a][b] || 0) + 1; };
const t0 = Date.now();
for (let g = 0; g < NG; g++) {
  // levels: a sliding window so neighbours meet often
  const c = Math.floor(rng() * LVS.length), seats = [];
  for (let i = 0; i < NP; i++) seats.push(LVS[Math.max(0, Math.min(LVS.length - 1, c + Math.floor(rng() * 7) - 3))]);
  const G = LD.newGame({ players: NP, rules: LD.PRESETS[process.env.RULES || 'perudo'], starter: Math.floor(rng() * NP) });
  while (!G.over) {
    LD.startRound(G, rng); let res = null;
    while (!res) { const p = G.round.turn; res = LD.act(G, p, AI.decide(G, p, seats[p], rng)); }
  }
  const pl = LD.places(G);
  for (let i = 0; i < pl.length; i++) for (let j = i + 1; j < pl.length; j++) { const a = seats[pl[i]], b = seats[pl[j]]; if (a === b) continue; add(a, b, 1); add(b, a, 0); }
}
// Bradley–Terry by iteration (ratings in Elo points)
const L = LVS.filter((v, i, a) => a.indexOf(v) === i);
let R = Object.fromEntries(L.map(l => [l, 0]));
for (let it = 0; it < 3000; it++) {
  const nr = {};
  for (const a of L) {
    let num = 0, den = 0;
    for (const b of L) { if (a === b || !N[a] || !N[a][b]) continue; const e = 1 / (1 + Math.pow(10, (R[b] - R[a]) / 400)); num += W[a][b] - N[a][b] * e; den += N[a][b] * e * (1 - e); }
    nr[a] = R[a] + (den ? 400 / Math.LN10 * num / den * .5 : 0);
  }
  const m = nr[L[0]]; for (const a of L) nr[a] -= m; R = nr;
}
console.log(`games ${NG} players ${NP} rules ${process.env.RULES || 'perudo'} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
let prev = null;
for (const a of L) { const pairs = L.filter(b => N[a] && N[a][b]).reduce((s, b) => s + N[a][b], 0); console.log(`Lv${String(a).padStart(2)}  Elo ${Math.round(R[a]).toString().padStart(5)}  step ${prev == null ? '' : Math.round(R[a] - prev)}  pairs ${pairs}`); prev = R[a]; }
console.log(JSON.stringify(Object.fromEntries(L.map(a => [a, Math.round(R[a])]))));

// node tools/bench.js [engine.js] [ms] — nodes per second and depth on fixed positions (placement and movement, every rule)
const path = require('path');
const E = require(path.resolve(process.argv[2] || 'engine.js')), ms = +(process.argv[3] || 1500);
let seed = 99; const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
let tot = 0, tt = 0;
for (const rule of ['seneca', 'piso', 'quintana']) for (const plies of [12, 50, 70]) {
  E.setRule(rule); seed = 99 + plies;
  const pos = E.Pos.from(null), moves = [];
  for (let i = 0; i < plies; i++) { if (E.judge(pos).over) break; const L = pos.moves(); const m = L[Math.floor(rnd() * L.length)]; moves.push(m); pos.play(m); }
  E.ttClear();
  const t0 = Date.now(); const r = E.thinkCfg(null, moves, { s: 1, ms }, rule); const dt = Date.now() - t0;
  tot += E.nodes; tt += dt;
  console.log(rule.padEnd(9), String(plies).padStart(3), 'depth', r.depth, 'nodes', E.nodes, 'knps', (E.nodes / dt).toFixed(0));
}
console.log('total knps', (tot / tt).toFixed(1));

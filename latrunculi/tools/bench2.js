// node tools/bench2.js [engine.js] — time to finish a fixed depth on fixed positions (same tree size → compares raw speed)
const path = require('path');
const E = require(path.resolve(process.argv[2] || 'engine.js'));
let seed = 99; const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
let tt = 0;
for (const [rule, plies, D] of [['seneca', 12, 4], ['seneca', 50, 4], ['seneca', 70, 4], ['piso', 50, 6], ['quintana', 50, 5]]) {
  E.setRule(rule); seed = 99 + plies;
  const pos = E.Pos.from(null), moves = [];
  for (let i = 0; i < plies; i++) { if (E.judge(pos).over) break; const L = pos.moves(); const m = L[Math.floor(rnd() * L.length)]; moves.push(m); pos.play(m); }
  E.ttClear();
  const t0 = Date.now(); const r = E.thinkCfg(null, moves, { s: 1, dx: D, ms: 120000, nk: 1e9 }, rule); const dt = Date.now() - t0; tt += dt;
  console.log(rule.padEnd(9), String(plies).padStart(3), 'd', r.depth, 'nodes', E.nodes, 'ms', dt, 'move', r.move, 'v', r.v);
}
console.log('total ms', tt);

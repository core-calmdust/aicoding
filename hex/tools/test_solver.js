// Cross-check of the engine's forced-connection solver (engine.c puzzle(), with carriers and path pruning) against a plain
// brute-force minimax on small random positions. Run: node tools/test_solver.js [count] [size] [k]
const { load } = require('./wasm.js');
const E = load();
const CNT = +(process.argv[2] || 200), SZ = +(process.argv[3] || 5), K = +(process.argv[4] || 3);
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
// brute force: attacker a to move, wins within k own moves?
function winA(p, a, k) {
  if (k <= 0) return false;
  for (let x = 0; x < p.b.length; x++) {
    if (p.b[x]) continue;
    p.b[x] = a; p._w = undefined;
    const ok = p.path(a) ? true : k > 1 && winD(p, a, k - 1);
    p.b[x] = 0; p._w = undefined;
    if (ok) return true;
  }
  return false;
}
function winD(p, a, k) {   // defender to move; the attacker then has k moves
  const d = 3 - a; let any = false;
  for (let y = 0; y < p.b.length; y++) {
    if (p.b[y]) continue; any = true;
    p.b[y] = d; p._w = undefined;
    const ok = !p.path(d) && winA(p, a, k);
    p.b[y] = 0; p._w = undefined;
    if (!ok) return false;
  }
  return any ? true : false;
}
let bad = 0, tested = 0, wins = 0, defs = 0;
for (let t = 0; t < CNT; t++) {
  const p = new E.Pos(SZ, false), stones = 5 + Math.floor(rnd() * (SZ * SZ * .45));
  for (let s = 0; s < stones; s++) { const e = []; for (let i = 0; i < p.b.length; i++) if (!p.b[i]) e.push(i); p.b[e[Math.floor(rnd() * e.length)]] = s % 2 ? 2 : 1; }
  p._w = undefined; if (p.winner()) continue;
  const side = rnd() < .5 ? 1 : 2; p.side = side;
  const spec = { n: SZ, b: [...p.b].map(v => '.rb'[v]).join(''), side };
  const pos = E.Pos.from(spec);
  // attacker view
  const L = E.puzzle(spec, [], K, false, 100000);
  for (const e of L) {
    let need = 0;
    for (let j = 1; j <= K; j++) { pos.b[e.m] = side; pos._w = undefined; const ok = pos.path(side) ? true : j > 1 && winD(pos, side, j - 1); pos.b[e.m] = 0; pos._w = undefined; if (ok) { need = j; break; } }
    tested++; if (need) wins++;
    if (need !== e.need) { bad++; if (bad < 10) console.log('ATT mismatch', JSON.stringify(spec), E.nameOf(e.m, SZ), 'engine', e.need, 'brute', need); }
  }
  // defender view: side to move defends against 3 - side
  const D = E.puzzle(spec, [], K, true, 100000), a = 3 - side;
  for (const e of D) {
    let need = 0;
    pos.b[e.m] = side; pos._w = undefined;
    if (!pos.path(side)) for (let j = 1; j <= K; j++) if (winA(pos, a, j)) { need = j; break; }
    pos.b[e.m] = 0; pos._w = undefined;
    tested++; if (need) defs++;
    if (need !== e.need) { bad++; if (bad < 10) console.log('DEF mismatch', JSON.stringify(spec), E.nameOf(e.m, SZ), 'engine', e.need, 'brute', need); }
  }
}
console.log(`checked ${tested} move values (${wins} attacker wins, ${defs} defender failures), mismatches: ${bad}`);
process.exitCode = bad ? 1 : 0;

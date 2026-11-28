// node tools/ladder.js [games per pair=20] [time scale=0.25] [from=1] [to=20] [rule=s8]
// Adjacent levels play each other (colours alternate; the first two moves of each side are random so the games differ).
// Levels that think by time use ms × scale. Prints the score of the stronger level and an Elo estimate per step.
const E = require('../engine.js');
const G = +(process.argv[2] || 20), SC = +(process.argv[3] || 0.25), A = +(process.argv[4] || 1), B = +(process.argv[5] || 20), RULE = process.argv[6] || 's8';
E.setRule(RULE);
let seed = 777; const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // mulberry32
const orig = E.LEVELS.map(L => L && Object.assign({}, L));
for (let i = 1; i < E.LEVELS.length; i++) if (E.LEVELS[i] && E.LEVELS[i].ms) E.LEVELS[i].ms = Math.max(20, Math.round(orig[i].ms * SC));
function game(lw, lb) {   // lw plays P1
  const moves = []; let pos = E.Pos.from(null);
  while (!E.judge(pos).over && moves.length < 300) {
    let m;
    if (moves.length < 4) { const L = pos.moves(); m = L[Math.floor(rnd() * L.length)]; }
    else { E.ttClear(); m = E.think(null, moves, pos.turn === E.P1 ? lw : lb, rnd).move; }
    moves.push(m); pos.play(m);
  }
  return E.judge(pos).winner;
}
const elo = s => s <= 0 ? -999 : s >= 1 ? 999 : Math.round(-400 * Math.log10(1 / s - 1));
let total = 0;
for (let a = A; a < B; a++) {
  const b = a + 1; let wb = 0;
  const t0 = Date.now();
  for (let g = 0; g < G; g++) { const bWhite = g % 2 === 0; const w = game(bWhite ? b : a, bWhite ? a : b); if ((w === E.P1) === bWhite) wb++; }
  const s = wb / G; total += Math.max(-600, Math.min(600, elo(s)));
  console.log(`Lv.${b} vs Lv.${a}: ${wb}/${G} (${(s * 100).toFixed(0)}%)  Elo ${elo(s)}  cumulative ${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

// node tools/ladder.js [games per pair=200] [scale=1] [from=1] [to=20] [rule=s8] [seed=0]   (another seed = other openings: split a pair over processes)
// Adjacent levels play each other. Openings vary: each pair of games starts from the same 4 random plies (mulberry32, seeded
// by the pair), once with each level as White — so the colours and the opening cancel out. Node budgets (Lv.12〜20) and
// times (Lv.21〜23) are multiplied by scale (1 = as played). Prints the stronger level's score, the Elo and its 2σ range.
'use strict';
const E = require('../engine.js');
const G = +(process.argv[2] || 200), SC = +(process.argv[3] || 1), A = +(process.argv[4] || 1), B = +(process.argv[5] || 20), RULE = process.argv[6] || 's8', SEED = +(process.argv[7] || 0);
E.setRule(RULE);
const mulberry = s => () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
for (let i = 1; i < E.LEVELS.length; i++) { const L = E.LEVELS[i]; if (!L) continue; if (L.nk) L.nk = Math.max(1, Math.round(L.nk * SC)), L.ms = 0; else if (L.ms) L.ms = Math.max(20, Math.round(L.ms * SC)); }
function game(open, lw, lb, rnd) {   // lw plays P1
  const moves = open.slice(); let pos = E.Pos.from(null); for (const m of open) pos.play(m);
  while (!E.judge(pos).over && moves.length < 300) {
    const lv = pos.turn === E.P1 ? lw : lb; E.ttClear(); const r = E.think(null, moves, lv, rnd);
    if (lv >= 12 && r.v > E.WINT && moves.length > 8) return pos.turn;   // a searching level sees a proven forced win: adjudicated (it plays its best move)
    moves.push(r.move); pos.play(r.move);
  }
  return E.judge(pos).winner;
}
const elo = s => s <= 0 ? -999 : s >= 1 ? 999 : Math.round(-400 * Math.log10(1 / s - 1));
for (let a = A; a < B; a++) {
  const b = a + 1, rnd = mulberry(1000 + a + 7919 * SEED), t0 = Date.now(); let wb = 0, n = 0;
  for (let g = 0; g < G; g += 2) {
    const open = []; const p0 = E.Pos.from(null);
    for (let k = 0; k < 4; k++) { const L = p0.moves(); const m = L[Math.floor(rnd() * L.length)]; open.push(m); p0.play(m); }
    for (const bWhite of [true, false]) { const w = game(open, bWhite ? b : a, bWhite ? a : b, rnd); if ((w === E.P1) === bWhite) wb++; n++; }
    if (n % 20 === 0 && n < G) console.log(`  … Lv.${b} vs Lv.${a}: ${wb}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  const s = wb / n, sd = Math.sqrt(s * (1 - s) / n);
  console.log(`Lv.${b} vs Lv.${a}: ${wb}/${n} (${(s * 100).toFixed(1)}%)  Elo ${elo(s)}  2σ ${elo(Math.max(0.001, s - 2 * sd))}..${elo(Math.min(0.999, s + 2 * sd))}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

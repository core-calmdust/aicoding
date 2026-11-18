// node tools/match.js A.js B.js [games] [ms|nk:N] [rule] [seed] — engine A against engine B (each game's opening is played twice,
// colours swapped; the first placements are random so the games differ). Prints A's score.
const path = require('path');
const [, , fa, fb, G = '20', lim = '60', rule = 'seneca', sd = '1'] = process.argv;
const A = require(path.resolve(fa)), B = require(path.resolve(fb));
const cfg = lim.startsWith('nk:') ? { s: 1, nk: +lim.slice(3) } : { s: 1, ms: +lim };
let seed = +sd * 7919 + 13; const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
function game(first, opening) {   // first: engine that plays Black (P1)
  const eng = [first, first === A ? B : A];
  A.setRule(rule); B.setRule(rule); A.ttClear(); B.ttClear();
  const moves = []; const pos = A.Pos.from(null);
  for (const m of opening) { moves.push(m); pos.play(m); }
  for (let ply = 0; ply < 400; ply++) {
    const j = A.judge(pos); if (j.over) return j;
    const e = eng[pos.side];
    const r = e.thinkCfg(null, moves, cfg, rule);
    if (r.move == null || r.move < 0) return A.judge(pos);
    moves.push(r.move); pos.play(r.move);
  }
  return { over: true, draw: true, winner: 0 };
}
let sa = 0, n = 0, w = 0, l = 0, d = 0;
const games = +G;
for (let g = 0; g < games / 2; g++) {
  A.setRule(rule);
  const op = [], pos = A.Pos.from(null), k = A.R.place ? 6 : 2;
  for (let i = 0; i < k; i++) { const L = pos.moves(); const m = L[Math.floor(rnd() * L.length)]; op.push(m); pos.play(m); }
  for (const first of [A, B]) {
    const j = game(first, op);
    const aSide = first === A ? 1 : 2;
    const s = j.draw ? .5 : j.winner === aSide ? 1 : 0;
    sa += s; n++; if (s === 1) w++; else if (s === 0) l++; else d++;
  }
  process.stdout.write(`\r${n} games: +${w} -${l} =${d}  score ${(100 * sa / n).toFixed(1)}%   `);
}
const p = sa / n, elo = p > 0 && p < 1 ? -400 * Math.log10(1 / p - 1) : (p ? 999 : -999);
console.log(`\nA score ${(100 * p).toFixed(1)}%  ≈ ${elo.toFixed(0)} Elo`);

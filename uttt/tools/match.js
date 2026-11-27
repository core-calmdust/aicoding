// Self-play match: node tools/match.js '<cfgA json>' '<cfgB json>' games [rule] [seed]
// cfg: a LEVELS entry ({d, noise} / {nk} / {ms} / {ms, mc}) or {lv: n}. Openings: 2 random plies, each played twice with colours swapped.
const E = require('../engine.js');
const [, , A, B, NG = '40', RK = 'std', SEED = '1'] = process.argv;
const cfg = s => { const o = JSON.parse(s); return o.lv ? E.LEVELS[o.lv] : o; };
const ca = cfg(A), cb = cfg(B);
let s = +SEED; const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
E.setRule(RK);
let w = 0, l = 0, d = 0;
const ngames = +NG;
let open = null;
for (let g = 0; g < ngames; g++) {
  if (g % 2 === 0) { const p = E.Pos.from(null); open = []; for (let k = 0; k < 2; k++) { const ms = p.moves(); const m = ms[Math.floor(rand() * ms.length)]; open.push(m); p.play(m); } }
  const aX = g % 2 === 0; const moves = open.slice(); const p = E.replay(null, moves).pos;
  while (p.res < 0) {
    const c = (p.side === 0) === aX ? ca : cb;
    if (E.core) E.core.x.ttclear();
    const r = (() => { const save = E.LEVELS[99]; E.LEVELS[99] = c; const x = E.think(null, moves, 99, rand); E.LEVELS[99] = save; return x; })();
    moves.push(r.move); p.play(r.move);
  }
  const aWin = (p.res === 1 && aX) || (p.res === 2 && !aX);
  if (p.res === 0) d++; else if (aWin) w++; else l++;
}
const sc = (w + d / 2) / ngames, elo = sc <= 0 ? -999 : sc >= 1 ? 999 : Math.round(-400 * Math.log10(1 / sc - 1));
console.log(`${A} vs ${B}: +${w} -${l} =${d}  score ${(sc * 100).toFixed(1)}%  elo ${elo}`);

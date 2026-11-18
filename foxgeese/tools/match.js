// node foxgeese/tools/match.js [rule] [foxLv] [geeseLv] [games] [seed]  — AI vs AI games for measuring the engine
//   env FG_ENGINE=path: another engine file (e.g. an older copy) for before/after comparisons; FG_GEESE_ENGINE=path: the geese use that engine instead
//   Each game: the first two plies (one fox move, one geese move) are random (seeded), then both sides play with think().
//   Prints one JSON line: fox / geese wins, end reasons (trap/few/stuck/rep/quiet), escaped = quiet/rep ends with the fox already
//   behind every goose, average plies, ms per AI move for each side.
const path = require('path');
const E = require(process.env.FG_ENGINE ? path.resolve(process.env.FG_ENGINE) : '../engine.js');
const EG = process.env.FG_GEESE_ENGINE ? require(path.resolve(process.env.FG_GEESE_ENGINE)) : E;
const [rule = 'g15', fl = '12', gl = '12', ng = '20', sd = '1'] = process.argv.slice(2);
let seed = (+sd * 2654435761) >>> 0 || 1;
const rand = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const res = { rule, fox: +fl, geese: +gl, games: +ng, foxWins: 0, geeseWins: 0, why: {}, plies: 0, msFox: 0, msGeese: 0, maxMsFox: 0, maxMsGeese: 0 };
let nf = 0, ngm = 0;
// the fox can walk to a point behind every goose (no goose can ever reach it again): a quiet / rep end of this kind is the fox's real success
function escaped(pos) {
  let gMax = -1; for (const i of E.POINTS) if (pos.sq[i] === E.P2) gMax = Math.max(gMax, E.RC[i][0]);
  const seen = new Set([pos.fox]), st = [pos.fox];
  while (st.length) { const a = st.pop(); if (E.RC[a][0] > gMax) return true; for (const [x] of E.NBR[a]) if (!pos.sq[x] && !seen.has(x)) { seen.add(x); st.push(x); } }
  return false;
}
// FG_MS: both engines' Lv.19 thinks for this many ms per move (equal-time comparisons)
if (process.env.FG_MS) for (const X of [E, EG]) X.LEVELS[19] = { s: 1, ms: +process.env.FG_MS };
// FG_RANDPLIES=1,3: these plies are random instead of the first two (e.g. only the geese's first two moves: the fox's opening book is tested)
const RP = process.env.FG_RANDPLIES ? process.env.FG_RANDPLIES.split(',').map(Number) : null;
for (let g = 0; g < +ng; g++) {
  for (const X of [E, EG]) { X.setRule(rule); X.setFirst(X.P1); X.ttClear(); }
  const pos = new E.Pos(), moves = [], hs = [pos.h1]; let j, gmq = 0;
  while (!(j = E.judge(pos, hs)).over && moves.length < 600) {
    let m;
    if (RP ? RP.includes(moves.length) : moves.length < 2) { const L = pos.moves(); m = L[Math.floor(rand() * L.length)]; }
    else {
      const X = pos.side ? EG : E, t = Date.now(), r = X.think(null, moves, pos.side ? +gl : +fl, rand, rule), dt = Date.now() - t;
      m = r.move;
      if (pos.side) { res.msGeese += dt; ngm++; res.maxMsGeese = Math.max(res.maxMsGeese, dt); } else { res.msFox += dt; nf++; res.maxMsFox = Math.max(res.maxMsFox, dt); }
    }
    moves.push(m); pos.play(m); hs.push(pos.h1); if (pos.quiet > (res._mq || 0)) res._mq = pos.quiet; gmq = Math.max(gmq, pos.quiet);
  }
  if (j.winner === E.P1) res.foxWins++; else res.geeseWins++;
  res.why[j.why] = (res.why[j.why] || 0) + 1; res.plies += moves.length;
  if ((j.why === 'quiet' || j.why === 'rep') && escaped(pos)) res.escaped = (res.escaped || 0) + 1;
  if (process.env.FG_DUMP) console.error(JSON.stringify({ w: j.winner === E.P1 ? 'fox' : 'geese', why: j.why, plies: moves.length, maxq: gmq, endq: pos.quiet, geese: pos.geese }));
  if (process.env.FG_VERBOSE) console.error(g, j.winner === 1 ? 'fox' : 'geese', j.why, moves.length, 'geese left', pos.geese);
}
res.plies = Math.round(res.plies / +ng); res.msFox = Math.round(res.msFox / Math.max(1, nf)); res.msGeese = Math.round(res.msGeese / Math.max(1, ngm));
console.log(JSON.stringify(res));

// node foxgeese/tools/gen_data.js <out.jsonl> <games> <seed> [rule]  — self-play positions for training the evaluation (2026-11-18)
// Each game: 2–8 random plies, then both sides play think() at a random level in 11–15 (node-limited search), 4 % random moves.
// One line per position (the side to move before the move): {f: fox point, g: [goose points], s: side (0 fox / 1 geese),
//   q: plies without a capture, v: the search value from the side to move (centi-geese, ±30000 = a found win), r: 1 if the fox won}
// Positions inside the random opening are skipped. Run several processes with different seeds; join the files.
const fs = require('fs'), path = require('path');
const E = require(process.env.FG_ENGINE ? path.resolve(process.env.FG_ENGINE) : '../engine.js');
const [out, ng = '1000', sd = '1', rule = 'g15'] = process.argv.slice(2);
let seed = (+sd * 2654435761) >>> 0 || 1;
const rand = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const fd = fs.openSync(out, 'a');
let total = 0; const t0 = Date.now();
for (let g = 0; g < +ng; g++) {
  E.setRule(rule); E.setFirst(rand() < .8 ? E.P1 : E.P2); E.ttClear();
  const pos = new E.Pos(), moves = [], hs = [pos.h1], recs = [];
  const open = 2 + Math.floor(rand() * 7), lv = [11 + Math.floor(rand() * 5), 11 + Math.floor(rand() * 5)];
  let j;
  while (!(j = E.judge(pos, hs)).over && moves.length < 400) {
    const L = pos.moves(); let m, v = null;
    if (moves.length < open || rand() < .04) m = L[Math.floor(rand() * L.length)];
    else { const r = E.think(null, moves, lv[pos.side], rand, rule); m = r.move; v = r.v; }
    if (v != null && Number.isFinite(v)) { const g2 = []; for (const i of E.POINTS) if (pos.sq[i] === E.P2) g2.push(i); recs.push({ f: pos.fox, g: g2, s: pos.side, q: pos.quiet, v: Math.round(v) }); }
    moves.push(m); pos.play(m); hs.push(pos.h1);
  }
  const r = j.winner === E.P1 ? 1 : 0;
  fs.writeSync(fd, recs.map(x => JSON.stringify(Object.assign(x, { r }))).join('\n') + (recs.length ? '\n' : ''));
  total += recs.length;
  if (g % 50 === 49) console.error(`${g + 1} games, ${total} positions, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
fs.closeSync(fd);

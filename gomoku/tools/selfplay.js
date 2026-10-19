// Self-play: level A vs level B (colours alternate), records games as JSON lines.
// node tools/selfplay.js <levelA> <levelB> <games> <out.jsonl> [rule] [timeScale]
'use strict';
const E = require('../engine.js');
const fs = require('fs');
const [A, B, G, OUT, RULE, SCALE] = [+process.argv[2] || 6, +process.argv[3] || 6, +process.argv[4] || 10, process.argv[5] || 'games.jsonl', process.argv[6] || 'renju', +process.argv[7] || 1];
let seed = (Date.now() ^ (process.pid << 8)) >>> 0;
const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
for (const L of E.LEVELS) if (L) L.ms = Math.max(60, Math.round(L.ms * SCALE));
const score = { A: 0, B: 0, D: 0 };
for (let g = 0; g < G; g++) {
  const aBlack = g % 2 === 0;
  const pos = new E.Pos(RULE);
  const moves = [];
  // random opening: renju = random 珠型 (3 stones), others = 2-4 random stones near the centre
  if (RULE === 'renju') {
    moves.push(E.CENTER); pos.make(E.CENTER);
    let lg = pos.legal(); let m = lg[Math.floor(rnd() * lg.length)]; moves.push(m); pos.make(m);
    lg = pos.legal(); m = lg[Math.floor(rnd() * lg.length)]; moves.push(m); pos.make(m);
  } else {
    const k = 2 + Math.floor(rnd() * 3);
    for (let j = 0; j < k; j++) { let m; do { m = (5 + Math.floor(rnd() * 5)) * 15 + 5 + Math.floor(rnd() * 5); } while (pos.at(m)); moves.push(m); pos.make(m); }
  }
  let st = pos.status();
  while (!st.over) {
    const lv = (pos.side === 1) === aBlack ? A : B;
    const r = E.think(RULE, moves.slice(3 * (RULE === 'renju' ? 0 : 0)), lv, null, rnd);
    if (r.move < 0 || !pos.isLegal(r.move)) { console.error('bad move', r, moves.map(E.sqName).join(' ')); st = { over: true, winner: 3 - pos.side, why: 'nomove' }; break; }
    moves.push(r.move); pos.make(r.move); st = pos.status();
    if (!st.over && !pos.legal().length) st = { over: true, winner: 3 - pos.side, why: 'nomove' };
  }
  const w = st.winner === 0 ? 'D' : (st.winner === 1) === aBlack ? 'A' : 'B';
  score[w]++;
  fs.appendFileSync(OUT, JSON.stringify({ rule: RULE, a: A, b: B, aBlack, moves: moves.map(E.sqName).join(' '), winner: st.winner, why: st.why }) + '\n');
  console.log(`game ${g + 1}: ${aBlack ? 'A black' : 'B black'} winner=${st.winner} (${w}) moves=${moves.length}  score A ${score.A} B ${score.B} D ${score.D}`);
}

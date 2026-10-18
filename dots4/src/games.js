// Lv10 (or Lv9) vs an opponent on 4x4; logs every non-forced AI decision for the offline oracle.
// usage: node games.js <games> <opp: random|8|..> <lv> <seed> <out.jsonl>
const E = require('/home/claude/aicoding/dots/engine.js');
const fs = require('fs');
const [N, opp, lv, seed, out] = [+process.argv[2], process.argv[3], +process.argv[4], +process.argv[5], process.argv[6]];
const G = E.geom(4, 4);
let rs = seed >>> 0 || 1; const rand = () => { rs ^= rs << 13; rs >>>= 0; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; return rs / 4294967296; };
const hex = p => { let v = 0n; for (let e = 0; e < 40; e++) if (p.drawn[e]) v |= 1n << BigInt(e); return v.toString(16); };
const res = [];
for (let g = 0; g < N; g++) {
  const aiSide = g % 2;   // 0: AI moves first
  const p = new E.Pos(G), hist = []; const sc = [0, 0]; let turn = 0;
  while (p.undrawn > 0) {
    let mv, rec = null;
    const lead = sc[turn] - sc[1 - turn];
    if (turn === aiSide) {
      const t0 = Date.now();
      const r = E.chooseMove(p, lv, rand, lead, hist.slice());
      mv = r.move;
      if (!r.forced && p.legal().length > 1) rec = { g, ply: hist.length, mask: hex(p), move: mv, ms: Date.now() - t0, exact: !!r.exact, book: !!r.book, value: r.value, lead };
    } else {
      mv = opp === 'random' ? E.chooseMove(p, 1, rand).move : E.chooseMove(p, +opp, rand, lead, hist.slice()).move;
    }
    if (rec) fs.appendFileSync(out, JSON.stringify(rec) + '\n');
    const k = p.play(mv); hist.push(mv); sc[turn] += k; if (!k) turn ^= 1;
  }
  const ai = sc[aiSide], op = sc[1 - aiSide];
  res.push({ g, aiSide, ai, op });
  fs.appendFileSync(out, JSON.stringify({ result: true, g, aiSide, ai, op }) + '\n');
  console.log(`game ${g} AI ${aiSide ? 'second' : 'first'}: ${ai}-${op}`);
}

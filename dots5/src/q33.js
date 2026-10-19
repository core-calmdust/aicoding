// 3x3: Lv9/Lv10 moves must be exactly optimal (checked with the exact JS solver)
const E = require('/home/claude/aicoding/dots/engine.js'); const G = E.geom(3, 3);
let rs = 99; const rand = () => { rs ^= rs << 13; rs >>>= 0; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; return rs / 4294967296; };
const S = new E.Solver(G, 20); let n = 0, bad = 0;
for (let g = 0; g < 12; g++) for (const lv of [9, 10]) {
  const p = new E.Pos(G), sc = [0, 0]; let turn = 0; const ai = g % 2, hist = [];
  while (p.undrawn) {
    let mv;
    if (turn === ai) {
      const r = E.chooseMove(p, lv, rand, sc[turn] - sc[1 - turn], hist.slice()); mv = r.move;
      if (p.legal().length > 1) { S.limit(0, 0); const all = S.all(p); const best = Math.max(...all.map(x => x.v)); n++; if (all.find(x => x.m === mv).v !== best) bad++; }
    } else mv = E.chooseMove(p, 1, rand).move;
    const k = p.play(mv); hist.push(mv); sc[turn] += k; if (!k) turn ^= 1;
  }
}
console.log('3x3 Lv9/10 decisions', n, 'non-optimal', bad);

// 5x5 positions from quick heuristic self-play: node genpos.js <games> <seed> <out.jsonl>
const E = require('/home/claude/aicoding/dots/engine.js'); const fs = require('fs');
const [N, seed, out] = [+process.argv[2], +process.argv[3], process.argv[4]];
const G = E.geom(5, 5);
let rs = seed >>> 0 || 1; const rand = () => { rs ^= rs << 13; rs >>>= 0; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; return rs / 4294967296; };
const H = new E.HSearch(G); H.np = 3; H.prune = true;
const countSafe = p => { let n = 0; for (let e = 0; e < G.E; e++) if (!p.drawn[e] && p.gives(e) === 0) n++; return n; };
for (let g = 0; g < N; g++) {
  const p = new E.Pos(G), hist = [];
  while (p.undrawn > 0) {
    let mv;
    const cap = p.hasCapture() ? E.captureMoves(p) : null;
    if (cap && cap.forced !== undefined) mv = cap.forced;
    else {
      const s = countSafe(p);
      if (!cap && p.filled === 0 && s >= 12 && s <= 30) fs.appendFileSync(out, JSON.stringify({ g: seed * 1000 + g, safe: s, edges: p.edges() }) + '\n');
      if (hist.length < 4 + (g % 5)) { const l = p.legal().filter(e => p.gives(e) === 0); mv = l[Math.floor(rand() * l.length)]; }
      else mv = H.best(p, 40, 60, rand).move;
    }
    p.play(mv); hist.push(mv);
  }
}

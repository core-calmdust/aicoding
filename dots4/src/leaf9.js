// cold timing of the first non-book AI decision (AI second, ply 9) on sampled book leaves, with the book guarantee
const E = require('/home/claude/aicoding/dots/engine.js'); E.x4Ready();
const fs = require('fs'), G = E.geom(4, 4);
const lines = fs.readFileSync('/home/claude/work/ckpt/dots4/book/book_3.txt', 'utf8').split('\n').concat(fs.readFileSync('/home/claude/work/ckpt/dots4/book/book_4.txt', 'utf8').split('\n')).map(l => l.split(' ')).filter(a => a[3] === '7');
let rs = 99; const rand = () => { rs ^= rs << 13; rs >>>= 0; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; return rs / 4294967296; };
const N = +process.argv[2] || 100, ts = [];
let partial = 0;
for (let i = 0; i < N; i++) {
  const a = lines[Math.floor(rand() * lines.length)]; const key = BigInt('0x' + a[0]);
  const p = new E.Pos(G); for (let e = 0; e < 40; e++) if ((key >> BigInt(e)) & 1n) p.play(e);
  const mv = +a[1], V = +a[2]; if (p.completes(mv)) continue; p.play(mv);
  const opts = p.legal(); const r = opts[Math.floor(rand() * opts.length)]; const k = p.play(r); if (k) continue;
  // AI to move at ply 9; guarantee: v >= V
  E.X4.x.w_clear();
  let lo = 0, hi = 0; for (let e = 0; e < 40; e++) if (p.drawn[e]) { if (e < 32) lo |= 1 << e; else hi |= 1 << (e - 32); }
  E.X4.io[0] = lo; E.X4.io[1] = hi; E.X4.io[2] = -1; E.X4.io[6] = V;
  const t0 = Date.now(); const v = E.X4.x.w_best_from(+process.argv[3] || 2700); const dt = Date.now() - t0;
  if (v === -999) partial++;
  ts.push(dt);
}
ts.sort((x, y) => x - y);
console.log('n', ts.length, 'median', ts[ts.length >> 1], 'p95', ts[Math.floor(ts.length * 0.95)], 'max', ts[ts.length - 1], 'timeouts', partial);

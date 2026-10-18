const E = require('/home/claude/aicoding/dots/engine.js'); E.x4Ready();
const G = E.geom(4, 4); let rs = +process.argv[3] || 7; const rand = () => { rs ^= rs << 13; rs >>>= 0; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; return rs / 4294967296; };
const ply = +process.argv[2]; const ts = [];
for (let i = 0; i < 10; i++) {
  const p = new E.Pos(G);
  while (p.undrawn > 40 - ply) { const s = p.legal().filter(e => p.gives(e) === 0); p.play(s[Math.floor(rand() * s.length)]); }
  E.X4.x.w_clear();
  const t0 = Date.now(); const r = E.x4All ? null : null;
  let lo = 0, hi = 0; for (let e = 0; e < 40; e++) if (p.drawn[e]) { if (e < 32) lo |= 1 << e; else hi |= 1 << (e - 32); }
  E.X4.io[0] = lo; E.X4.io[1] = hi; E.X4.io[2] = -1;
  const v = E.X4.x.w_best(60000); ts.push(Date.now() - t0);
}
ts.sort((a, b) => a - b); console.log('ply', ply, 'ms', ts.join(' '));

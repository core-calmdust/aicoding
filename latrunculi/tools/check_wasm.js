// The WebAssembly search against the JS one (node tools/check_wasm.js [games]): for every rule set, positions of games between
// levels, the levels decided by positions (Lv.11〜18: bestMove in core.c ab_best) and by depth (Lv.2・6・9: rootValues in core.c
// ab_values, the noise from one seeded generator) — move, value, depth and the number of positions must be identical. Then the
// speed of both (positions a second at Lv.18).
'use strict';
const path = require('path'), { execFileSync } = require('child_process');
if (process.argv[2] === 'dump') {
  const E = require(path.join(__dirname, '..', 'engine.js'));
  const G = +process.argv[3] || 3;
  let s = 11; const r = () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const out = []; let t = 0, nn = 0;
  for (const rule of E.RULE_ORDER) {
    E.setRule(rule); E.ttClear();
    for (let g = 0; g < G; g++) {
      const mv = [];
      for (let i = 0; i < 120; i++) {
        const x0 = E.think(null, mv, [2, 6, 9, 11][(i + g) % 4], r, rule); if (x0.move == null || x0.move < 0) break;
        if (i % 9 === 4) for (const lv of [12, 15, 18]) { const t0 = Date.now(); const x = E.think(null, mv, lv, r, rule); t += Date.now() - t0; nn += E.nodes; out.push([rule, g, i, lv, x.move, x.v, x.depth, E.nodes].join(':')); }
        mv.push(x0.move);
        if (E.judge(E.replay(null, mv).pos).over) break;
      }
    }
  }
  console.log(JSON.stringify({ out, wasm: E.wasm, nps: nn / Math.max(1, t) * 1000 }));
  process.exit(0);
}
const G = process.argv[2] || '3';
const run = env => JSON.parse(execFileSync(process.execPath, [__filename, 'dump', G], { env: Object.assign({}, process.env, env), maxBuffer: 1 << 26 }).toString());
const a = run({ LT_NOWASM: '1' }), b = run({}), c = run({ LT_NOSIMD: '1' });
const diff = a.out.filter((x, i) => x !== b.out[i]), diff0 = a.out.filter((x, i) => x !== c.out[i]);
console.log('wasm loaded:', b.wasm, '| searches', a.out.length, '| diff (SIMD)', diff.length, diff.slice(0, 3), b.out.filter((x, i) => x !== a.out[i]).slice(0, 3), '| diff (no SIMD)', diff0.length);
console.log('positions a second (Lv.12・15・18): JS', Math.round(a.nps), '| wasm SIMD', Math.round(b.nps), `(×${(b.nps / a.nps).toFixed(2)})`, '| wasm', Math.round(c.nps));
if (diff.length || diff0.length || !b.wasm || a.out.length !== b.out.length) process.exit(1);

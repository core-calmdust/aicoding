// The WebAssembly search against the JS one (node tools/check_wasm.js): for every board size, positions of games between
// levels, the levels decided by positions (Lv.12〜18) and fixed-depth searches — move, value, depth and the number of
// positions must be identical. Then the speed of both.
'use strict';
const path = require('path'), { execFileSync } = require('child_process');
const E = require(path.join(__dirname, '..', 'engine.js'));
if (process.argv[2] === 'dump') {
  let s = 11; const r = () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const out = [];
  for (const rule of ['s8', 's6', 's10']) {
    E.setRule(rule);
    for (let g = 0; g < 4; g++) {
      const mv = [];
      for (let i = 0; i < 40; i++) {
        const t = E.think(null, mv, 6 + (i % 4), r, rule); if (t.move < 0) break; mv.push(t.move);
        if (i % 6 === 2) for (const lv of [12, 15, 18]) { const x = E.think(null, mv, lv, r, rule); out.push([rule, i, lv, x.move, x.v, x.depth, E.nodes].join(':')); }
      }
    }
  }
  E.setRule('s8');
  const t0 = Date.now(); const b = E.think(null, [], 0, null, 's8'); void b;
  let pos = E.replay(null, []).pos; for (let i = 0; i < 6; i++) pos.play(E.think(null, [], 0) && pos.moves()[0]);
  const t1 = Date.now(), r2 = E.bestMove ? null : null; void r2;
  const sp = (() => { const st = Date.now(); let n = 0; const mv = []; const p = E.replay(null, []).pos; for (let i = 0; i < 8; i++) { const m = p.moves()[0]; mv.push(m); p.play(m); } const res = E.analyze(null, mv, 2000); return { depth: res.depth, ms: Date.now() - st }; })();
  console.log(JSON.stringify({ out, sp, wasm: E.wasm, nodes2s: (() => { const mv = []; const p = E.replay(null, []).pos; for (let i = 0; i < 10; i++) { const m = p.moves()[0]; mv.push(m); p.play(m); } E.think(null, mv, 20); return E.nodes; })() }));
  void t0; void t1; process.exit(0);
}
const run = env => JSON.parse(execFileSync(process.execPath, [__filename, 'dump'], { env: Object.assign({}, process.env, env), maxBuffer: 1 << 26 }).toString());
const a = run({ KN_NOWASM: '1' }), b = run({});
const diff = a.out.filter((x, i) => x !== b.out[i]);
console.log('wasm loaded:', b.wasm, '| searches', a.out.length, 'diff', diff.length, diff.slice(0, 3), b.out.slice(0, 0));
console.log('Lv.20 (2.5 s) positions — JS', a.nodes2s, '| wasm', b.nodes2s, `(×${(b.nodes2s / a.nodes2s).toFixed(2)})`, '| analysis 2 s depth: JS', a.sp.depth, 'wasm', b.sp.depth);
if (diff.length || !b.wasm) process.exit(1);

// The WebAssembly search against the JS one (node tools/check_wasm.js): for both rules, positions of games between levels,
// the levels decided by depth and positions (Lv.9・11・12・15・18) — move, value, depth and the number of positions must be
// identical. Then the speed of both.
'use strict';
const path = require('path'), { execFileSync } = require('child_process');
const E = require(path.join(__dirname, '..', 'engine.js'));
if (process.argv[2] === 'dump') {
  const out = [];
  for (const rule of ['std', 'place']) {
    E.setRule(rule);
    for (let g = 0; g < 4; g++) {
      let s = 100 + g; const r = () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; };
      const mv = [];
      for (let i = 0; i < 50; i++) {
        const t = E.think(null, mv, 6 + (i % 5), r, rule); if (t.move < 0) break; mv.push(t.move);
        const { pos, hashes } = E.replay(null, mv); if (E.judge(pos, hashes).over) break;
        if (i % 7 === 3) for (const lv of [9, 11, 12, 15, 18]) { let s2 = 7; const r2 = () => { s2 = (Math.imul(s2, 1103515245) + 12345) & 0x7fffffff; return s2 / 0x7fffffff; }; const x = E.think(null, mv, lv, r2, rule); out.push([rule, i, lv, x.move, x.v, x.depth, E.nodes].join(':')); }
      }
    }
  }
  E.setRule('std');
  const mv = []; let s3 = 5; const r3 = () => { s3 = (Math.imul(s3, 1103515245) + 12345) & 0x7fffffff; return s3 / 0x7fffffff; };
  for (let i = 0; i < 12; i++) mv.push(E.think(null, mv, 8, r3).move);
  E.think(null, mv, 20); const n20 = E.nodes;
  console.log(JSON.stringify({ out, wasm: E.wasm, n20 })); process.exit(0);
}
const run = env => JSON.parse(execFileSync(process.execPath, [__filename, 'dump'], { env: Object.assign({}, process.env, env), maxBuffer: 1 << 26 }).toString());
const a = run({ AG_NOWASM: '1' }), b = run({});
const diff = a.out.filter((x, i) => x !== b.out[i]);
console.log('wasm loaded:', b.wasm, '| searches', a.out.length, 'diff', diff.length, diff.slice(0, 3).join(' | '), diff.length ? '≠ ' + b.out[a.out.indexOf(diff[0])] : '');
console.log('Lv.20 (2.5 s) positions — JS', a.n20, '| wasm', b.n20, `(×${(b.n20 / a.n20).toFixed(2)})`);
if (diff.length || !b.wasm) process.exit(1);

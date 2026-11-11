// The root's loops in core.c (ab_best / ab_values, 2026-11-11) against the engine before them: the same moves, values, depths and
// node counts for every level decided by depth or by positions (15級〜三段, deterministic) along games of every rule, on
// core-wasm.js and on core_mt.wasm with one thread (the lead's core, as engine.js?…&mt=1).
//   node tools/check_ab.js <the engine before: a folder with engine.js and core-wasm.js, e.g. from git archive origin/main>
'use strict';
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
if (process.argv[2] === 'dump') {
  const dir = process.argv[3], E = require(path.join(dir, 'engine.js'));
  if (process.env.AG_MT1) {   // core_mt.wasm on one thread as the lead's core (engine.js's MX: the lead mode's own setup)
    const module = new WebAssembly.Module(fs.readFileSync(path.join(__dirname, '..', 'core_mt.wasm')));
    const mem = new WebAssembly.Memory({ initial: 1024, maximum: 16384, shared: true });
    const x = new WebAssembly.Instance(module, { env: { memory: mem, now: () => Date.now() } }).exports;
    const base = Math.ceil(x.mt_heap_base() / 65536) * 65536, SLOT = 4 << 20;
    if (base + 2 * SLOT > mem.buffer.byteLength) mem.grow(Math.ceil((base + 2 * SLOT - mem.buffer.byteLength) / 65536));
    x.mt_stack(base + SLOT - 16); x.mt_thread(base, 0);
    E.useCore(x, mem.buffer);
  }
  const out = [], t0 = Date.now();
  for (const rule of E.RULE_ORDER) {
    E.setRule(rule);
    for (let g = 0; g < 2; g++) {
      let s = 100 + g; const r = () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; };
      const mv = [];
      for (let i = 0; i < 50; i++) {
        const t = E.think(null, mv, 6 + (i % 5), r, rule); if (t.move < 0) break; mv.push(t.move);
        out.push([rule, g, i, 'play', t.move, t.v, E.nodes].join(':'));
        const { pos, hashes } = E.replay(null, mv); if (E.judge(pos, hashes).over) break;
        if (i % 6 === 3) for (const lv of [3, 8, 11, 12, 14, 16, 17]) { let s2 = 7; const r2 = () => { s2 = (Math.imul(s2, 1103515245) + 12345) & 0x7fffffff; return s2 / 0x7fffffff; }; const x = E.think(null, mv, lv, r2, rule); out.push([rule, g, i, lv, x.move, x.v, x.depth, E.nodes].join(':')); }
      }
    }
  }
  console.log(JSON.stringify({ out, ms: Date.now() - t0 })); process.exit(0);
}
const before = path.resolve(process.argv[2] || '');
if (!fs.existsSync(path.join(before, 'engine.js'))) { console.error('usage: node tools/check_ab.js <folder of the engine before>'); process.exit(2); }
const run = (dir, env) => JSON.parse(execFileSync(process.execPath, [__filename, 'dump', dir], { env: Object.assign({}, process.env, env), maxBuffer: 1 << 26 }).toString());
const a = run(before, {});
console.log('before:', a.out.length, 'searches,', a.ms, 'ms');
let bad = 0;
for (const [nm, env] of [['core-wasm.js', {}], ['core_mt.wasm, 1 thread', { AG_MT1: '1' }]]) {
  const b = run(path.join(__dirname, '..'), env);
  const d = a.out.filter((x, i) => x !== b.out[i]);
  console.log(`${nm}: ${b.out.length} searches, ${d.length} differ${d.length ? ' (first: ' + d[0] + ' ≠ ' + b.out[a.out.indexOf(d[0])] + ')' : ''}, ${b.ms} ms (before ${a.ms} ms)`);
  bad += d.length + (a.out.length !== b.out.length ? 1 : 0);
}
if (bad) process.exit(1);

// The learned evaluation in WebAssembly against the native tools (claude/konane-spec.md「学習した評価」):
//   node konane/tools/check_nn.js <kn binary> <folder with net-<rule>.bin> [positions a rule = 40] [nodesK = 20]
// For random positions of each board size with a net in the folder: the evaluation of search v3 and a search of v3 from an
// empty table (move, value, depth, positions) must be the same in core-wasm.js (SIMD and not: KN_NOSIMD=1), core_mt.wasm on one
// thread (KN_MT1=1) and natively (kn probe).
'use strict';
const path = require('path'), fs = require('fs'), cp = require('child_process');
const [kn, dir, nS, nkS] = process.argv.slice(2);
process.env.KN_NETDIR = path.resolve(dir);
const E = require(path.join(__dirname, '..', 'engine.js'));
if (process.env.KN_MT1) {   // core_mt.wasm on one thread as the lead's core (engine.js's MX), as tools/check_ab.js
  const module = new WebAssembly.Module(fs.readFileSync(path.join(__dirname, '..', 'core_mt.wasm')));
  const mem = new WebAssembly.Memory({ initial: 1024, maximum: 16384, shared: true });
  const x = new WebAssembly.Instance(module, { env: { memory: mem, now: () => Date.now() } }).exports;
  const base = Math.ceil(x.mt_heap_base() / 65536) * 65536, SLOT = 4 << 20;
  if (base + 2 * SLOT > mem.buffer.byteLength) mem.grow(Math.ceil((base + 2 * SLOT - mem.buffer.byteLength) / 65536));
  x.mt_stack(base + SLOT - 16); x.mt_thread(base, 0);
  E.useCore(x, mem.buffer);
}
const NP = +nS || 40, NK = +nkS || 20;
let s = 7; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
let all = 0, bad = 0;
for (const rule of E.RULE_ORDER) {
  const fn = path.join(dir, `net-${rule}.bin`); if (!fs.existsSync(fn)) continue;
  E.setRule(rule); if (!E.netOk(rule)) { console.log(rule, 'net not loaded'); bad++; continue; }
  const pos = [];
  while (pos.length < NP) {
    const { pos: p } = E.replay(null, []); const q = p.clone(); const stop = 4 + Math.floor(rnd() * 40);
    for (let k = 0; k < stop; k++) { const L = q.moves(); if (!L.length) break; q.play(L[Math.floor(rnd() * L.length)]); }
    if (q.ply >= 2 && q.moves().length > 1) pos.push(q);
  }
  const inp = pos.map(p => `${p.spec().b} ${p.side} ${p.ply}`).join('\n') + '\n';
  const out = cp.execFileSync(kn, ['probe', rule, fn, String(NK)], { input: inp }).toString().trim().split('\n');
  pos.forEach((p, i) => {
    const r = E.probe(p, NK), want = out[i], got = `${r.e} ${r.m} ${r.v} ${r.d} ${r.n}`;
    all++; if (want !== got) { bad++; if (bad < 6) console.log(rule, i, 'native', want, 'wasm', got); }
  });
  console.log(rule, `${pos.length} positions checked`);
}
console.log(`${all} positions, ${bad} different${bad ? '  ** NG **' : '  OK'}${process.env.KN_NOSIMD ? ' (no SIMD)' : ''}${process.env.KN_MT1 ? ' (core_mt.wasm, 1 thread)' : ''}`);
process.exit(bad ? 1 : 0);

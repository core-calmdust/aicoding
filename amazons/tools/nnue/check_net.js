// The learned evaluation in WebAssembly gives the same values as the native tools (nn check): core-wasm.js with SIMD and
// without, and core_mt.wasm (one thread on a shared memory).
//   ./nn check net.bin vals.txt && node amazons/tools/nnue/check_net.js net.bin vals.txt
const fs = require('fs'), path = require('path');
const [netf, valf] = process.argv.slice(2);
const net = fs.readFileSync(netf), rows = fs.readFileSync(valf, 'utf8').trim().split('\n').map(l => l.split(' ').map(Number));
const dir = path.join(__dirname, '..', '..');
global.self = global; require(path.join(dir, 'core-wasm.js'));
const cores = [['core-wasm.js SIMD', Buffer.from(self.AMZ_WASM, 'base64'), false], ['core-wasm.js without SIMD', Buffer.from(self.AMZ_WASM0, 'base64'), false], ['core_mt.wasm', fs.readFileSync(path.join(dir, 'core_mt.wasm')), true]];
let bad = 0;
for (const [name, bin, mt] of cores) {
  let x, mem;
  if (mt) {
    mem = new WebAssembly.Memory({ initial: 1024, maximum: 16384, shared: true });
    x = new WebAssembly.Instance(new WebAssembly.Module(bin), { env: { memory: mem, now: () => Date.now() } }).exports;
    const base = Math.ceil(x.mt_heap_base() / 65536) * 65536; if (base + (4 << 20) > mem.buffer.byteLength) mem.grow(64);
    x.mt_stack(base + (2 << 20) - 16); x.mt_thread(base + (2 << 20), 0);
  } else { x = new WebAssembly.Instance(new WebAssembly.Module(bin), { env: { now: () => Date.now() } }).exports; mem = x.memory; }
  new Uint8Array(mem.buffer, x.nn_buf(), net.length).set(net);
  if (x.nn_load(net.length) !== 1) { console.log(name + ': the net did not load'); bad++; continue; }
  const sq = new Int8Array(mem.buffer, x.sqp(), 100), q = new Int8Array(mem.buffer, x.qp(), 8);
  let diff = 0, n = 0, d3 = 0;
  for (const r of rows) {
    const b = r.slice(5); sq.set(b); let na = 0, nb = 4; q.fill(-1);
    b.forEach((v, i) => { if (v === 1) q[na++] = i; else if (v === 2) q[nb++] = i; });
    x.ev_set(-1, 3); const a = x.ev(1, 1), bb = x.ev(1, 2), c = x.ev(2, 1); x.ev_set(-1, 2); const d = x.ev(1, 1);
    if (a !== r[1] || bb !== r[2] || c !== r[3]) diff++;
    if (d !== r[4]) d3++;
    n++;
  }
  console.log(`${name}: net ${x.nn_ver()} — ${n} positions × 3 values, ${diff} differ (v3: ${d3} differ)`);
  bad += diff + d3;
}
process.exit(bad ? 1 : 0);

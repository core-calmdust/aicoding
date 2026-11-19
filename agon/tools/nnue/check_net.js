// The learned evaluation in WebAssembly gives the same values as the native tools (nn check): core-wasm.js and core_mt.wasm
// (one thread on a shared memory), and engine.js with the net in net.js (AG_NETJS) searches with it.
//   ./nn check net.bin vals.txt && node agon/tools/nnue/check_net.js net.bin vals.txt [net.js]
const fs = require('fs'), path = require('path');
const [netf, valf, netjs] = process.argv.slice(2);
const net = fs.readFileSync(netf), rows = fs.readFileSync(valf, 'utf8').trim().split('\n').map(l => l.split(' ').map(Number));
const dir = path.join(__dirname, '..', '..');
process.env.AG_NONET = '1';
const E = require(path.join(dir, 'engine.js')), C = E.coreArrays;
global.self = global; require(path.join(dir, 'core-wasm.js'));
const cores = [['core-wasm.js', Buffer.from(self.AG_WASM, 'base64'), false], ['core_mt.wasm', fs.readFileSync(path.join(dir, 'core_mt.wasm')), true]];
let bad = 0;
const env0 = { now: () => Date.now(), poll: () => 0, shget: () => 0, shput: () => {} };
for (const [name, bin, mt] of cores) {
  let x, mem;
  if (mt) {
    mem = new WebAssembly.Memory({ initial: 1024, maximum: 16384, shared: true });
    x = new WebAssembly.Instance(new WebAssembly.Module(bin), { env: Object.assign({ memory: mem }, env0) }).exports;
    const base = Math.ceil(x.mt_heap_base() / 65536) * 65536; if (base + (4 << 20) > mem.buffer.byteLength) mem.grow(64);
    x.mt_stack(base + (2 << 20) - 16); x.mt_thread(base + (2 << 20), 0);
  } else { x = new WebAssembly.Instance(new WebAssembly.Module(bin), { env: env0 }).exports; mem = x.memory; }
  new Int32Array(mem.buffer, x.geop(), C.geo.length).set(C.geo); new Uint32Array(mem.buffer, x.ztp(), C.zt.length).set(C.zt); x.setup();
  new Uint8Array(mem.buffer, x.nn_buf(), net.length).set(net);
  if (x.nn_load(net.length) !== 1) { console.log(name + ': the net did not load'); bad++; continue; }
  const sq = new Int8Array(mem.buffer, x.sqp(), 91), cap = new Int8Array(mem.buffer, x.capp(), 91), io = new Int32Array(mem.buffer, x.iop(), 32);
  let diff = 0, dh = 0, n = 0, moved = 0;
  for (const r of rows) {
    const [a, b, side, ply, r1, r2] = r, cells = r.slice(6);
    cells.forEach((v, i) => { sq[i] = v & 7; cap[i] = v >> 3; });
    io[8] = side; io[9] = ply; io[14] = r1; io[15] = r2;
    x.nn_use(1); const va = x.evalpos(); x.nn_use(0); const vb = x.evalpos();
    if (va !== a) diff++; if (vb !== b) dh++; if (a !== b) moved++;
    n++;
  }
  console.log(`${name}: net ${x.nn_ver()} — ${n} positions, ${diff} differ with the net, ${dh} without (the net changes ${moved})`);
  bad += diff + dh;
}
if (netjs) {   // engine.js reads the net from a net.js and searches with it at the strong levels
  delete process.env.AG_NONET; process.env.AG_NETJS = path.resolve(netjs);
  delete require.cache[require.resolve(path.join(dir, 'engine.js'))];
  const E2 = require(path.join(dir, 'engine.js'));
  console.log(`engine.js with ${netjs}: net ${E2.net ? 'on' : 'NOT LOADED'} (version ${E2.netVer})`);
  if (!E2.net) bad++;
  else { const r = E2.think(null, [], 14, () => 0.5, 'std'); console.log(`  Lv.14 from the start: ${E2.name ? '' : ''}move ${r.move}, value ${r.v}, depth ${r.depth}`); if (!(r.move >= 0)) bad++; }
}
process.exit(bad ? 1 : 0);

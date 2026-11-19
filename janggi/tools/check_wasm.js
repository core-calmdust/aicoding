// The WebAssembly builds against the native tool (2026-11-20, MODEL_CARD.md「NNUE の確認」), from the repository root:
//   node janggi/tools/check_wasm.js <net.bin.gz | -> [depth 8] [native tool /tmp/jg]
// 12 positions (random set-ups and 10-39 random moves); best(depth) in engine.wasm (hand evaluation), engine_simd.wasm and
// engine_mt.wasm (one thread) with the net, and `jg iobest` natively: the moves, values, depths and node counts must agree
// (the network's sums are integers: SIMD or not, the same numbers).
'use strict';
const fs = require('fs'), zlib = require('zlib'), path = require('path'), { execFileSync } = require('child_process');
const DIR = path.join(__dirname, '..'), NETF = process.argv[2] || '-', D = +(process.argv[3] || 8), NAT = process.argv[4] || '/tmp/jg';
const E = require(DIR + '/engine.js');
let rs = 20261120; const rnd = n => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs % n; };
const POS = [];
while (POS.length < 12) {
  const start = E.startFen(rnd(4), rnd(4)), p = E.Pos.from(start), moves = [], len = 10 + rnd(30); let ok = true;
  for (let i = 0; i < len; i++) { const L = p.moves(); if (!L.length) { ok = false; break; } const m = L[rnd(L.length)]; p.play(m); moves.push(m); }
  if (ok && p.moves().length > 1) POS.push(E.setupIO(start, moves, []));
}
const net = NETF === '-' ? null : (/\.gz$/.test(NETF) ? zlib.gunzipSync(fs.readFileSync(NETF)) : fs.readFileSync(NETF));
function run(file, mt, nn) {
  const mod = new WebAssembly.Module(fs.readFileSync(path.join(DIR, file)));
  const env = m => ({ env: Object.assign(m ? { memory: m } : {}, { now: () => Date.now(), progress: () => {} }) });
  let X, mem;
  if (mt) {
    mem = new WebAssembly.Memory({ initial: 1152, maximum: 16384, shared: true });
    X = new WebAssembly.Instance(mod, env(mem)).exports;
    const SLOT = 2 << 20, base = Math.ceil(X.mt_heap_base() / 65536) * 65536, need = base + 3 * SLOT;
    if (mem.buffer.byteLength < need) mem.grow(Math.ceil((need - mem.buffer.byteLength) / 65536));
    X.mt_stack(base + SLOT - 16); X.mt_thread(base, 0);
  } else { X = new WebAssembly.Instance(mod, env(null)).exports; mem = X.memory; }
  if (nn) {   // (as engine.js loadNet)
    const dv = new DataView(net.buffer, net.byteOffset, net.byteLength), H = dv.getInt32(4, true), IN = 1260, b = net.buffer; let o = net.byteOffset + 12;
    if (H !== X.xq_h()) throw new Error('net H ' + H);
    new Int16Array(mem.buffer, X.xq_w1_ptr(), IN * H).set(new Int16Array(b.slice(o, o + IN * H * 2))); o += IN * H * 2;
    new Int32Array(mem.buffer, X.xq_b1_ptr(), H).set(new Int32Array(b.slice(o, o + H * 4))); o += H * 4;
    new Int16Array(mem.buffer, X.xq_w2_ptr(), 2 * H).set(new Int16Array(b.slice(o, o + H * 4))); o += H * 4;
    X.xq_set_b2(dv.getInt32(o - net.byteOffset, true)); X.xq_nnue(1);
  }
  const io = () => new Int32Array(mem.buffer, X.io_ptr(), 8192), out = []; let ms = 0;
  POS.forEach((a, i) => { X.new_game(); io().set(a); X.setup(); const ev = X.eval_root(); const t0 = Date.now(); X.best(D, 0, 0); ms += Date.now() - t0; const r = io(); out.push(`${i} e${ev} ${r[0]} ${r[1]} d${r[2]} k${r[3]}`); });
  return { out, ms };
}
const tmp = path.join(require('os').tmpdir(), 'jg-check-' + process.pid + '.txt');
fs.writeFileSync(tmp, POS.map(a => a.join(' ')).join('\n') + '\n');
const natNet = net ? path.join(require('os').tmpdir(), 'jg-check-' + process.pid + '.bin') : '-';
if (net) fs.writeFileSync(natNet, net);
const nat = execFileSync(NAT, ['iobest', natNet, String(D), tmp]).toString().trim().split('\n');
const natHand = execFileSync(NAT, ['iobest', '-', String(D), tmp]).toString().trim().split('\n');
let bad = 0;
// (engine_mt.wasm has its own transposition table (buckets of four): its node counts differ, so only the evaluations of the
// 12 positions are compared there: mt = 1)
const cmp = (name, r, ref, mt) => { const k = l => mt ? l.split(' ').slice(0, 2).join(' ') : l; const d = r.out.filter((l, i) => k(l) !== k(ref[i])).length; bad += d; console.log(`${name.padEnd(28)} ${d ? d + ' DIFFER' : (mt ? 'evaluations same as native' : 'same as native')}  ${r.ms} ms`); if (d && process.env.V) r.out.forEach((l, i) => l !== ref[i] && console.log('  ', l, '| native', ref[i])); };
cmp('engine.wasm (hand)', run('engine.wasm', false, false), natHand);
cmp('engine_simd.wasm (hand)', run('engine_simd.wasm', false, false), natHand);
cmp('engine_mt.wasm 1 thread (hand)', run('engine_mt.wasm', true, false), natHand, 1);
if (net) {
  cmp('engine_simd.wasm (net)', run('engine_simd.wasm', false, true), nat);
  cmp('engine_mt.wasm 1 thread (net)', run('engine_mt.wasm', true, true), nat, 1);
}
fs.unlinkSync(tmp); if (net) fs.unlinkSync(natNet);
console.log(bad ? 'MISMATCH' : 'all agree'); process.exit(bad ? 1 : 0);

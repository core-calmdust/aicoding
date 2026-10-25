// Synchronous bridge from the node generators to the native engine (tools/native.c "serve"), much faster than the wasm build.
// Usage: const N = require('./nat.js').open(path_to_hexn); N.setup(n, swap, moves); N.analyze(ms, 0, 30) → [{m, v, n}] …
const cp = require('child_process'), fs = require('fs');
function open(bin) {
  bin = bin || process.env.HEXN || '/tmp/hexn';
  const p = cp.spawn(bin, ['serve'], { stdio: ['pipe', 'pipe', 'inherit'] });
  let buf = '';
  const lines = [];
  p.stdout.on('data', d => { buf += d; let k; while ((k = buf.indexOf('\n')) >= 0) { lines.push(buf.slice(0, k)); buf = buf.slice(k + 1); } });
  // a tiny synchronous wait: Atomics.wait on a shared buffer while the event loop cannot run is not possible,
  // so the generators use the async API below
  const waiters = [];
  p.stdout.on('data', () => { while (lines.length && waiters.length) waiters.shift()(lines.shift()); });
  const cmd = s => new Promise(res => { waiters.push(res); p.stdin.write(s + '\n'); });
  const nums = s => s.trim().split(/\s+/).map(Number);
  return {
    setup: (n, sw, moves) => cmd(`setup ${n} ${sw ? 1 : 0} ${moves.length} ${moves.join(' ')}`).then(Number),
    setpos: (spec) => cmd(`setpos ${spec.n} ${spec.side} ${spec.sw ? 1 : 0} ${spec.b}`).then(Number),
    analyze: (ms, po, mx) => cmd(`analyze ${ms} ${po || 0} ${mx || 30}`).then(s => { const a = nums(s), L = []; for (let i = 0; i < a[0]; i++) L.push({ m: a[2 + 3 * i], v: a[3 + 3 * i], n: a[4 + 3 * i] }); return { list: L, po: a[1] }; }),
    puzzle: (n, d, b) => cmd(`puzzle ${n} ${d ? 1 : 0} ${b || 3000}`).then(s => { const a = nums(s), L = []; for (let i = 0; i < a[0]; i++) L.push({ m: a[1 + 2 * i], need: a[2 + 2 * i] }); return L; }),
    solve: (k, b) => cmd(`solve ${k} ${b || 200}`).then(s => { const a = nums(s); return { k: a[0], m: a[1] }; }),
    best: (po, ms, tp, mu) => cmd(`best ${po} ${ms} ${tp || 0} ${mu || 0}`).then(s => { const a = nums(s); return { m: a[0], v: a[1] }; }),
    level: lv => cmd(`level ${lv}`).then(s => { const a = nums(s); return { m: a[0], v: a[1] }; }),
    close: () => { p.stdin.write('quit\n'); p.stdin.end(); },
  };
}
module.exports = { open };

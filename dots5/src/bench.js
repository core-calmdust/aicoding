// JS solver vs wasm solver: outcome search (t = 0) on 5x5 positions. node bench.js <safeLo> <safeHi> <ms> <bits>
const E = require('/home/claude/aicoding/dots/engine.js'); const fs = require('fs');
const [lo, hi, ms, bits] = process.argv.slice(2).map(Number);
const G = E.geom(5, 5);
const pos = fs.readFileSync('/home/claude/work/ckpt/dots5/pos/p1.jsonl', 'utf8').trim().split('\n').concat(fs.readFileSync('/home/claude/work/ckpt/dots5/pos/p2.jsonl', 'utf8').trim().split('\n')).map(JSON.parse).filter(x => x.safe >= lo && x.safe <= hi);
const inst = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(__dirname + '/dots5.wasm')), { env: { now: () => performance.now() } });
const X = inst.exports; X.w_setup(5, 5, bits); const io = new Int32Array(X.memory.buffer, X.io_ptr(), 256);
function wOutcome(p, t, moves, ms) {
  let lo = 0, hi = 0; for (let e = 0; e < 60; e++) if (p.drawn[e]) { if (e < 32) lo |= 1 << e; else hi |= 1 << (e - 32); }
  const t0 = performance.now(); let alpha = t - 1, best = null;
  for (const e of moves) { io[0] = lo; io[1] = hi; const v = X.w_move_value(e, alpha, t + 1, ms - (performance.now() - t0)); if (v === -999) return null; if (!best || v > best.v) best = { m: e, v }; if (v > alpha) alpha = v; if (alpha > t) break; }
  return best;
}
const S = new E.Solver(G, bits); S.prune = true;
let sj = 0, sw = 0, nj = 0, nw = 0;
for (const x of pos) {
  const p = E.Pos.from(G, x.edges);
  const moves = S.rootMoves(p);
  S.limit(0, ms); let t0 = Date.now(); const a = S.outcome(p, 0, moves); const tj = Date.now() - t0;
  X.w_clear(); t0 = Date.now(); const b = wOutcome(p, 0, moves, ms); const tw = Date.now() - t0;
  S.used.fill(0);
  if (a) nj++; if (b) nw++; sj += tj; sw += tw;
  const ok = !a || !b || (Math.sign(a.value) === Math.sign(b.v));
  console.log(x.safe, 'js', a ? a.cls : 'cut', tj, 'wasm', b ? Math.sign(b.v) : 'cut', tw, ok ? '' : 'MISMATCH');
}
console.log('solved js', nj, 'wasm', nw, 'of', pos.length, 'time js', sj, 'wasm', sw);

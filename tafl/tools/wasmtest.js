// Cross-check the JS rules (engine.js) against the WebAssembly engine on random games, and time a search.
// node tools/wasmtest.js [games]
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const imp = { env: { now: () => Date.now(), progress: () => {} } };
const X = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(__dirname, '..', 'engine.wasm'))), imp).exports;
const io = () => new Int32Array(X.memory.buffer, X.io_ptr(), 8192);
function setup(v, start, moves) {
  const p = E.Pos.from(start, v), a = [E.VID[p.v], p.turn === 2 ? 1 : 0];
  for (const x of p.b) a.push(x);
  a.push(moves.length); for (const m of moves) a.push(E.mFrom(m) | (E.mTo(m) << 8));
  io().set(a); return X.setup();
}
let rs = 12345; const rnd = n => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs % n; };
const G = +process.argv[2] || 60;
let bad = 0, ends = {};
for (const v of E.VARIANTS) {
  for (let g = 0; g < G; g++) {
    const pos = E.Pos.from(null, v), moves = [], hashes = [pos.h1 + ':' + pos.h2];
    for (let ply = 0; ply < 400; ply++) {
      const st = E.judge(pos, hashes);
      if (!setup(v, null, moves)) { console.log('setup failed', v, g, ply); bad++; break; }
      // C: the legal move count (via puzzle(1, 0) output count = rootN) and the root result
      X.puzzle(1, 0, 1);
      const n = io()[0], cres = X.root_res();
      const L = pos.moves();
      if (pos.res !== cres || (!pos.res && n !== L.length)) { console.log('mismatch', v, g, ply, 'js', L.length, pos.res, 'c', n, cres); bad++; break; }
      if (st.over) { ends[v + ':' + st.why] = (ends[v + ':' + st.why] || 0) + 1; break; }
      // prefer moves that capture or move the king, so games end in different ways
      let m = L[rnd(L.length)];
      for (let k = 0; k < 3; k++) { const c = L[rnd(L.length)]; if (pos.capsOf(c).length || pos.at(E.mFrom(c)) === 3) { m = c; break; } }
      pos.play(m); moves.push(m); hashes.push(pos.h1 + ':' + pos.h2);
    }
  }
}
console.log('mismatches', bad, ends);
// timing
for (const v of E.VARIANTS) {
  setup(v, null, []); let t0 = Date.now(); X.best(99, 0, 300); const r = io();
  console.log(v, 'best 300k nodes:', Date.now() - t0, 'ms, depth', r[3], 'nodes', r[4], 'k, value', r[2]);
  setup(v, null, []); t0 = Date.now(); X.analyze(1500, 40); console.log(v, 'analyze 1.5 s: depth', io()[1], 'moves', io()[0], Date.now() - t0, 'ms');
}

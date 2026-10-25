// Verifies tafl/puzzles.json with the WebAssembly engine: the answer is legal, wins within n own moves,
// and no other first move wins within n (one solution). node tools/check_puzzles.js
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const X = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(__dirname, '..', 'engine.wasm'))), { env: { now: () => Date.now(), progress: () => {} } }).exports;
const io = () => new Int32Array(X.memory.buffer, X.io_ptr(), 8192);
const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles.json'), 'utf8'));
let bad = 0, n = 0;
for (const T of D.themes) for (const [j, P] of T.puzzles.entries()) {
  n++;
  const pos = E.Pos.from(P.s);
  if (!pos.moves().includes(P.answer)) { console.log('illegal answer', T.id, j); bad++; continue; }
  const a = [E.VID[pos.v], pos.turn === 2 ? 1 : 0]; for (const x of pos.b) a.push(x); a.push(0); io().set(a); X.setup();
  X.puzzle(P.n, 0, 20000);
  const r = io(), need = new Map(); for (let i = 0; i < r[0]; i++) { const x = r[1 + 2 * i]; need.set((x & 255) + 256 * ((x >> 8) & 255), r[2 + 2 * i]); }
  const mine = need.get(P.answer), others = [...need].filter(([m, k]) => m !== P.answer && k > 0 && k <= P.n);
  const goalOk = T.goal === 'cap' ? pos.turn === 1 : pos.turn === 2;
  if (mine !== P.n || others.length || !goalOk || [...need.values()].some(k => k < 0)) { console.log('bad', T.id, j, { mine, others: others.length, goalOk }); bad++; }
}
console.log(n, 'puzzles checked,', bad, 'bad');
process.exit(bad ? 1 : 0);

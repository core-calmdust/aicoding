// Node helper: load engine.wasm like the browser worker does (for the generators and tests in tools/).
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
async function load() {
  const root = path.join(__dirname, '..');
  let prog = null;
  const { instance } = await WebAssembly.instantiate(fs.readFileSync(path.join(root, 'engine.wasm')), { env: { now: () => Date.now(), progress: d => prog && prog(d) } });
  const X = instance.exports; E.setWasm(X);
  return { X, E, newGame() { X.new_game(); } };
}
module.exports = { load };

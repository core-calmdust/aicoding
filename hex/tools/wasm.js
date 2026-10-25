// Node loader for the tools: the page's engine.js rules + engine.wasm (same calls as the Web Worker).
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const ROOT = path.join(__dirname, '..');
function load() {
  const bin = fs.readFileSync(path.join(ROOT, 'engine.wasm'));
  const m = new WebAssembly.Module(bin);
  const inst = new WebAssembly.Instance(m, { env: { now: () => Date.now(), progress: () => {} } });
  E._setWasm(inst.exports);
  try { const op = JSON.parse(fs.readFileSync(path.join(ROOT, 'openings.json'), 'utf8')); for (const k in (op.first || {})) E.FIRST[k] = op.first[k].wr; } catch (e) {}
  return E;
}
module.exports = { load, E, X: () => null };

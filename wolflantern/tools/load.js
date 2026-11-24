// node loader: runs the game's browser files in a shared fake window
const fs = require('fs'), path = require('path'), vm = require('vm');
const DIR = path.resolve(__dirname, '..');
const win = { };
win.window = win; win.globalThis = win;
const ctx = vm.createContext(win);
for (const f of ['voices.js', 'speech.js', 'engine.js'].concat(fs.readdirSync(path.join(DIR, 'stories')).filter(f => f.endsWith('.js')).map(f => 'stories/' + f)))
  vm.runInContext(fs.readFileSync(path.join(DIR, f), 'utf8'), ctx, { filename: f });
module.exports = win;

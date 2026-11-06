// senet/tools/tm_apply_units.js — per-string objects ({ ja:'…', en:'…', …, ar:'…' }) of a file get ru / zh-TW / id / tr from
// tools/tm14.json (via tools/i18n-langs.js extract/apply). Usage: node tools/tm_apply_units.js <file>
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const TM = JSON.parse(fs.readFileSync(path.join(__dirname, 'tm14.json'), 'utf8'));
const tool = path.join(__dirname, '../../tools/i18n-langs.js'), f = process.argv[2], tmp = path.join(os.tmpdir(), 'tmu-' + process.pid);
cp.execFileSync('node', [tool, 'extract', f, tmp + '.json'], { stdio: 'ignore' });
const units = JSON.parse(fs.readFileSync(tmp + '.json', 'utf8')), miss = new Set(), out = {};
const T = (v, l) => typeof v === 'string' ? (!/[A-Za-z]/.test(v) ? v : (TM[v] ? TM[v][l] : (miss.add(v), v))) : Array.isArray(v) ? v.map(x => T(x, l)) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, T(x, l)]));
for (const u of units) out[u.id] = Object.fromEntries(['ru', 'zh-TW', 'id', 'tr'].map(l => [l, T(u.en, l)]));
if (miss.size) { console.log(JSON.stringify([...miss])); process.exit(1); }
fs.writeFileSync(tmp + '.tr.json', JSON.stringify(out));
cp.execFileSync('node', [tool, 'apply', f, tmp + '.tr.json'], { stdio: 'inherit' });

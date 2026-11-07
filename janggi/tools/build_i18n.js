// Builds janggi/i18n.js: xiangqi/i18n.js (the shared page strings, 14 languages) + the janggi overrides in tools/i18n_jg_*.json.
// meta.title keeps each language's series name from xiangqi ("<title> — <series>"). Run: node janggi/tools/build_i18n.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
global.window = {}; eval(fs.readFileSync(path.join(root, 'xiangqi/i18n.js'), 'utf8'));
const base = window.I18N, O = {};
for (const f of fs.readdirSync(__dirname).filter(f => /^i18n_jg_.*\.json$/.test(f))) Object.assign(O, JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8')));
const langs = Object.keys(base), out = {};
for (const l of langs) {
  const o = Object.assign({}, base[l], O[l] || {});
  if (!O[l]) console.warn('no janggi overrides for', l);
  const suf = String(base[l]['meta.title']).split(' — ')[1];
  if (O[l] && O[l]['meta.title'] && suf) o['meta.title'] = O[l]['meta.title'].split(' — ')[0] + ' — ' + suf;
  out[l] = o;
}
const q = k => /^[a-z]+$/.test(k) ? k : `'${k}'`;
const src = '// UI strings for Janggi — 14 languages (built by tools/build_i18n.js from xiangqi/i18n.js + tools/i18n_jg_*.json)\nwindow.I18N = {\n' + langs.map(l => `${q(l)}: ${JSON.stringify(out[l])},`).join('\n') + '\n};\n';
fs.writeFileSync(path.join(root, 'janggi/i18n.js'), src);
console.log('ok', langs.length);

// builds hearts/i18n-more.js from hearts/i18n-src/<lang>.json + <lang>.<part>.json (the 12 languages after ja / en) and checks them
// against en: the same keys, the same {placeholders}. node hearts/tools/i18n-build.js [--missing lang]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..'), src = path.join(dir, 'i18n-src');
const ctx = {}; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(dir, 'i18n.js'), 'utf8'), ctx);
const en = ctx.I18N.en;
const ORDER = ['zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
const ph = s => [...new Set(String(s).match(/\{\w+\}/g) || [])].sort().join();
let out = '/* ハーツ — texts in the other 12 languages (hearts/i18n-more.js). Built by tools/i18n-build.js from i18n-src/<lang>*.json — edit those. */\n';
let bad = 0; const done = [];
const want = process.argv.indexOf('--missing') >= 0 ? process.argv[process.argv.indexOf('--missing') + 1] : null;
for (const l of ORDER) {
  const files = fs.readdirSync(src).filter(f => f === l + '.json' || (f.startsWith(l + '.') && f.endsWith('.json') && !ORDER.some(o => o !== l && o.startsWith(l) && f.startsWith(o + '.'))));
  const d = {};
  for (const f of files.sort()) { try { Object.assign(d, JSON.parse(fs.readFileSync(path.join(src, f), 'utf8'))); } catch (e) { console.log(l, f, 'JSON error', e.message); bad++; } }
  const miss = Object.keys(en).filter(k => !(k in d)), extra = Object.keys(d).filter(k => !(k in en));
  const phb = Object.keys(en).filter(k => k in d && ph(en[k]) !== ph(d[k]));
  if (want === l) { console.log(JSON.stringify(Object.fromEntries(miss.map(k => [k, en[k]])))); process.exit(0); }
  if (miss.length || extra.length || phb.length) { bad++; console.log(l, 'missing', miss.length, miss.slice(0, 8).join(' '), '| extra', extra.join(' '), '| placeholders', phb.join(' ')); }
  for (const k of extra) delete d[k];
  out += `I18N[${JSON.stringify(l)}] = ${JSON.stringify(d)};\n`;
  done.push(l);
}
fs.writeFileSync(path.join(dir, 'i18n-more.js'), out);
console.log('built', done.join(' '), bad ? `— ${bad} problem(s)` : '— ok');
process.exit(bad ? 1 : 0);

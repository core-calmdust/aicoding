// builds guandan/i18n-more.js from guandan/i18n-src/<lang>.json (the 12 languages after ja / en) and checks them against en:
// the same keys, the same {placeholders}. node guandan/tools/i18n-build.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..');
const ctx = {}; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(dir, 'i18n.js'), 'utf8'), ctx);
const en = ctx.I18N.en;
const ORDER = ['zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
const ph = s => (String(s).match(/\{\w+\}/g) || []).sort().join();
let out = '/* 掼蛋 — texts in the other 12 languages (guandan/i18n-more.js). Built by tools/i18n-build.js from i18n-src/<lang>.json — edit those. */\n';
let bad = 0, done = [];
for (const l of ORDER) {
  const f = path.join(dir, 'i18n-src', l + '.json');
  if (!fs.existsSync(f)) { console.log('missing language', l); bad++; continue; }
  let d; try { d = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.log(l, 'JSON error', e.message); bad++; continue; }
  const miss = Object.keys(en).filter(k => !(k in d)), extra = Object.keys(d).filter(k => !(k in en));
  const phb = Object.keys(en).filter(k => k in d && ph(en[k]) !== ph(d[k]));
  if (miss.length || extra.length || phb.length) { bad++; console.log(l, 'missing', miss.join(' '), '| extra', extra.join(' '), '| placeholders', phb.join(' ')); }
  out += `I18N[${JSON.stringify(l)}] = ${JSON.stringify(d)};\n`;
  done.push(l);
}
fs.writeFileSync(path.join(dir, 'i18n-more.js'), out);
console.log('built', done.join(' '), bad ? `— ${bad} problem(s)` : '— ok');
process.exit(bad ? 1 : 0);

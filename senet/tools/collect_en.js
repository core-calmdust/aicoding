// collect every English string of senet that needs ru / zh-TW / id / tr → prints JSON array of strings not yet in tools/tm14.json
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(R, f), 'utf8');
function objAfter(src, marker) {     // the {…} literal right after marker
  const i = src.indexOf(marker); if (i < 0) throw new Error(marker);
  let j = src.indexOf('{', i), d = 0, k = j, q = null;
  for (; k < src.length; k++) { const c = src[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '{') d++; else if (c === '}') { d--; if (!d) break; } }
  return Function('return (' + src.slice(j, k + 1) + ')')();
}
const S = new Set(), add = v => { if (typeof v === 'string') { if (/[A-Za-z]/.test(v)) S.add(v); } else if (Array.isArray(v)) v.forEach(add); else if (v && typeof v === 'object') Object.values(v).forEach(add); };
global.window = {}; eval(read('i18n.js')); add(window.I18N.en);
add(objAfter(read('i18n-online.js'), '\nen:') );
add(objAfter(read('tour.js'), '\n    en: {'));
add(objAfter(read('coach.js'), '\nen: {'));
add(objAfter(read('rvbox.js'), '\n  en: {'));
const lt = require('./learn_text.js'), th = require('./learn_themes.js');
const walk = o => { if (o && typeof o === 'object') { if (typeof o.en === 'string' || Array.isArray(o.en)) add(o.en); else Object.values(o).forEach(walk); } };
walk(lt.UI); walk(lt.MSG); walk(th.CATS); walk(th.TH);
for (const f of (process.argv.slice(2))) add(objAfter(read(f.split('#')[0]), f.split('#')[1]));
let tm = {}; try { tm = JSON.parse(read('tools/tm14.json')); } catch (e) {}
const out = [...S].filter(s => !tm[s]);
console.log(JSON.stringify(out, null, 0));
console.error(S.size + ' strings, ' + out.length + ' to translate, ' + out.join('').length + ' chars');

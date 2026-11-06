// senet/tools/apply14.js — adds ru / zh-TW / id / tr to the per-language dictionaries of a file ({ ja:{…}, en:{…}, …, ar:{…} }),
// translating each English value through tools/tm14.json (English → the 4 languages). Values without letters are copied.
//   node tools/apply14.js <file> [enFile#marker]   (enFile#marker: where the English dictionary lives when the file has none)
// Prints the English strings the memory lacks (and changes nothing) when any are missing.
const fs = require('fs'), path = require('path');
const { scan } = require('../../tools/i18n-langs.js');
const NEW = ['ru', 'zh-TW', 'id', 'tr'];
const TM = JSON.parse(fs.readFileSync(path.join(__dirname, 'tm14.json'), 'utf8'));
const lit = t => Function('"use strict";return (' + t + ')')();
function objAfter(src, marker) {
  const i = src.indexOf(marker); if (i < 0) throw new Error(marker);
  let j = src.indexOf('{', i), d = 0, k = j, q = null;
  for (; k < src.length; k++) { const c = src[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '{') d++; else if (c === '}') { d--; if (!d) break; } }
  return lit(src.slice(j, k + 1));
}
const miss = new Set();
function tr(v, l) {
  if (typeof v === 'string') { if (!/[A-Za-z]/.test(v)) return v; const e = TM[v]; if (!e) { miss.add(v); return v; } return e[l]; }
  if (Array.isArray(v)) return v.map(x => tr(x, l));
  const o = {}; for (const k in v) o[k] = tr(v[k], l); return o;
}
function run(file, extEn) {
  let src = fs.readFileSync(file, 'utf8'); const ins = [];
  const objs = scan(src), byStart = new Map(objs.map(o => [o.start, o]));
  for (const o of objs) {
    const by = {}; for (const e of o.entries) by[e.key] = e;
    if (!by.ar || !byStart.has(by.ar.valStart) || NEW.every(l => by[l])) continue;
    let en = by.en && byStart.has(by.en.valStart) ? lit(src.slice(by.en.valStart, by.en.valEnd)) : extEn;
    if (!en || typeof en !== 'object') continue;
    const ar = by.ar, ls = src.lastIndexOf('\n', ar.keyStart) + 1, pre = src.slice(ls, ar.keyStart), own = /^\s*$/.test(pre);
    const q = ar.quote || '';
    const parts = NEW.filter(l => !by[l]).map(l => { const kq = q || (l === 'zh-TW' ? "'" : ''); return kq + l + kq + ': ' + JSON.stringify(tr(en, l)); });
    ins.push({ at: ar.valEnd, text: (own ? ',\n' + pre : ', ') + parts.join(own ? ',\n' + pre : ', ') });
  }
  if (miss.size) { console.log(JSON.stringify([...miss], null, 0)); console.error(file + ': ' + miss.size + ' strings missing from tm14.json'); process.exitCode = 1; return; }
  ins.sort((a, b) => b.at - a.at).forEach(x => { src = src.slice(0, x.at) + x.text + src.slice(x.at); });
  fs.writeFileSync(file, src); console.error(file + ': ' + ins.length + ' dictionaries extended');
}
const [file, ext] = process.argv.slice(2);
let extEn = null; if (ext) { const [f, m] = ext.split('#'); extEn = objAfter(fs.readFileSync(f, 'utf8'), m); }
run(file, extEn);

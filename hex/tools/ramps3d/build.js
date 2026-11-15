// node hex/tools/ramps3d/build.js → hex/ramps3d.json: the warm-up texts of the 3D lessons (texts.js ja / en + tr.json) and the
// warm-up's own words (ui/<key>, the same as gomoku's rampUi). The positions are made by atlas/lessons3d.js HEX from the lessons.
'use strict';
const fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '..', '..', '..');
const T = require('./texts.js'), TR = fs.existsSync(path.join(__dirname, 'tr.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'tr.json'), 'utf8')) : {};
const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
const out = {}, miss = [];
for (const id in T) for (const f of ['t', 'body', 'g', 'y']) {
  const k = id + '/' + f, o = Object.assign({}, T[id][f], TR[k] || {});
  for (const l of LANGS) if (!o[l]) miss.push(k + ':' + l);
  out[k] = o;
}
const ui = JSON.parse(fs.readFileSync(path.join(ROOT, 'gomoku', 'lessons.json'), 'utf8')).rampUi;
for (const k in ui) out['ui/' + k] = ui[k];
fs.writeFileSync(path.join(ROOT, 'hex', 'ramps3d.json'), JSON.stringify(out));
console.log(Object.keys(out).length, 'texts', miss.length ? 'missing ' + miss.length : 'complete');

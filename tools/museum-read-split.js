// 博物館「読み物」の文を言語ごとのファイルに分ける (2026-11-24). atlas/museum/read-i18n.js（全14言語・約1.5MB、編集はこちら）から
// atlas/museum/read-i18n/<lang>.js を作り直す。博物館は英語（足りない文の予備）と表示中の言語の2つだけを読み込む。
// read-i18n.js を変えたら: node tools/museum-read-split.js を実行し、atlas/museum.js の READ_I18N_V を1上げる。
const fs = require('fs'), path = require('path');
// (also the paintings' text: atlas/museum/paint-i18n.js → atlas/museum/paint-i18n/<lang>.js; bump PAINT_I18N_V in atlas/museum.js)
const root = path.join(__dirname, '..');
for (const [name, G] of [['read', 'MUSEUM_READ_T'], ['paint', 'MUSEUM_PAINT_T']]) {
  const src = path.join(root, `atlas/museum/${name}-i18n.js`), out = path.join(root, `atlas/museum/${name}-i18n`);
  const window = {}; new Function('window', fs.readFileSync(src, 'utf8'))(window);
  const T = window[G]; fs.mkdirSync(out, { recursive: true });
  for (const l of Object.keys(T)) {
    const body = `/* generated from atlas/museum/${name}-i18n.js by tools/museum-read-split.js — edit the source, not this file */\n(window.${G} = window.${G} || {})[${JSON.stringify(l)}] = ${JSON.stringify(T[l])};\n`;
    fs.writeFileSync(path.join(out, l + '.js'), body); console.log(name, l, Math.round(body.length / 1024) + 'KB');
  }
}

// 博物館「読み物」の文を言語ごとのファイルに分ける (2026-11-24). atlas/museum/read-i18n.js（全14言語・約1.5MB、編集はこちら）から
// atlas/museum/read-i18n/<lang>.js を作り直す。博物館は英語（足りない文の予備）と表示中の言語の2つだけを読み込む。
// read-i18n.js を変えたら: node tools/museum-read-split.js を実行し、atlas/museum.js の READ_I18N_V を1上げる。
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), src = path.join(root, 'atlas/museum/read-i18n.js'), out = path.join(root, 'atlas/museum/read-i18n');
const window = {}; new Function('window', fs.readFileSync(src, 'utf8'))(window);
const T = window.MUSEUM_READ_T; fs.mkdirSync(out, { recursive: true });
for (const l of Object.keys(T)) {
  const body = `/* generated from atlas/museum/read-i18n.js by tools/museum-read-split.js — edit the source, not this file */\n(window.MUSEUM_READ_T = window.MUSEUM_READ_T || {})[${JSON.stringify(l)}] = ${JSON.stringify(T[l])};\n`;
  fs.writeFileSync(path.join(out, l + '.js'), body); console.log(l, Math.round(body.length / 1024) + 'KB');
}

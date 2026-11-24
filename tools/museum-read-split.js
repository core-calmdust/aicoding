// 博物館「読み物」の文を言語ごとのファイルに分ける (2026-11-24). atlas/museum/read-i18n.js（全14言語・約1.5MB、編集はこちら）から
// atlas/museum/read-i18n/<lang>.js を作り直す。各言語のファイルには足りない文を英語で補ってあり、博物館は表示中の言語の1つだけを読み込む（2026-11-24）。
// read-i18n.js を変えたら: node tools/museum-read-split.js を実行し、atlas/museum.js の READ_I18N_V を1上げる。
const fs = require('fs'), path = require('path');
// (also the paintings' text: atlas/museum/paint-i18n.js → atlas/museum/paint-i18n/<lang>.js; bump PAINT_I18N_V in atlas/museum.js)
const root = path.join(__dirname, '..');
for (const [name, G] of [['read', 'MUSEUM_READ_T'], ['paint', 'MUSEUM_PAINT_T'], ['chance', 'MUSEUM_CHANCE_T']]) {
  const src = path.join(root, `atlas/museum/${name}-i18n.js`), out = path.join(root, `atlas/museum/${name}-i18n`);
  const window = {}; new Function('window', fs.readFileSync(src, 'utf8'))(window);
  const T = window[G]; fs.mkdirSync(out, { recursive: true });
  // (2026-11-24 audit textKB) the stories: each language's file carries the English text for anything it lacks (story by story, field by
  // field), so the museum reads one file, not English + the language (English 127 KB + Arabic 182 KB went past the 300 KB line)
  const fill = l => { if (name !== 'read' || l === 'en' || !T.en) return T[l]; const o = Object.assign({}, T[l]);
    for (const k of Object.keys(T.en)) { const e = T.en[k], v = o[k]; o[k] = v == null ? e : e && typeof e === 'object' && !Array.isArray(e) && v && typeof v === 'object' && !Array.isArray(v) ? Object.assign({}, e, v) : v; }
    return o; };
  for (const l of Object.keys(T)) {
    const body = `/* generated from atlas/museum/${name}-i18n.js by tools/museum-read-split.js — edit the source, not this file */\n(window.${G} = window.${G} || {})[${JSON.stringify(l)}] = ${JSON.stringify(fill(l))};\n`;
    fs.writeFileSync(path.join(out, l + '.js'), body); console.log(name, l, Math.round(body.length / 1024) + 'KB');
  }
}

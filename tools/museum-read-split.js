// 博物館「読み物」の文を言語ごとのファイルに分ける (2026-11-24). atlas/museum/read-i18n.js（全14言語・約1.5MB、編集はこちら）から
// atlas/museum/read-i18n/<lang>.js（一覧用の索引）と atlas/museum/read-i18n/<lang>/<id>.js（物語ごとの本文）を作り直す。各言語のファイルには足りない文を英語で補ってあり、博物館は表示中の言語の1つだけを読み込む（2026-11-24）。
// read-i18n.js を変えたら: node tools/museum-read-split.js を実行し、atlas/museum.js の READ_I18N_V を1上げる。
const fs = require('fs'), path = require('path');
// (also the paintings' text: atlas/museum/paint-i18n.js → atlas/museum/paint-i18n/<lang>.js; bump PAINT_I18N_V in atlas/museum.js)
const root = path.join(__dirname, '..');
// the minutes a story takes, as read.js used to work it out from the text: ~500 characters a minute (CJK) or ~200 words (others)
const mins = x => { const t = [x.lead, ...(x.s || []), ...(x.kf || []), ...((x.more || []).flatMap(m => [m.h, ...m.p])), ...((x.tl || []).map(r => r.join(' ')))].join(' ');
  const cjk = (t.match(/[\u3000-\u9fff\uac00-\ud7af]/g) || []).length, words = t.replace(/[\u3000-\u9fff\uac00-\ud7af]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.round(cjk / 500 + words / 200); };
for (const [name, G] of [['read', 'MUSEUM_READ_T'], ['paint', 'MUSEUM_PAINT_T'], ['chance', 'MUSEUM_CHANCE_T'], ['match', 'MUSEUM_MATCH_T']]) {
  const src = path.join(root, `atlas/museum/${name}-i18n.js`), out = path.join(root, `atlas/museum/${name}-i18n`);
  const window = {}; new Function('window', fs.readFileSync(src, 'utf8'))(window);
  const T = window[G]; fs.mkdirSync(out, { recursive: true });
  // (2026-11-24 audit textKB) the stories: each language's file carries the English text for anything it lacks (story by story, field by
  // field), so the museum reads one file, not English + the language (English 127 KB + Arabic 182 KB went past the 300 KB line)
  const fill = l => { if (name === 'match' && l !== 'en' && T.en) {   // (2026-11-27 名局選: the page reads one file — English for any game, field or note the language lacks)
      const o = Object.assign({}, T[l]); for (const k of Object.keys(T.en)) { const e = T.en[k], v = o[k]; o[k] = !v ? e : Object.assign({}, e, v, e.c || v.c ? { c: Object.assign({}, e.c, v.c) } : {}); } return o; }
    if (name !== 'read' || l === 'en' || !T.en) return T[l]; const o = Object.assign({}, T[l]);
    for (const k of Object.keys(T.en)) { const e = T.en[k], v = o[k]; o[k] = v == null ? e : e && typeof e === 'object' && !Array.isArray(e) && v && typeof v === 'object' && !Array.isArray(v) ? Object.assign({}, e, v) : v; }
    return o; };
  const head = `/* generated from atlas/museum/${name}-i18n.js by tools/museum-read-split.js — edit the source, not this file */\n`;
  for (const l of Object.keys(T)) {
    if (name !== 'read') {
      const body = `${head}(window.${G} = window.${G} || {})[${JSON.stringify(l)}] = ${JSON.stringify(fill(l))};\n`;
      fs.writeFileSync(path.join(out, l + '.js'), body); console.log(name, l, Math.round(body.length / 1024) + 'KB'); continue;
    }
    // (2026-11-24 audit textKB, per screen) the stories: read-i18n/<lang>.js is the shelf's index only — ui, the names (ex, paint, pic) and, per
    // story, title, lead, game and the minutes to read (mins: worked out here, as read.js did, so the shelf needs no full text) — and
    // read-i18n/<lang>/<id>.js is one story's whole text, loaded when the story opens (Object.assign into MUSEUM_READ_T[lang][id])
    const F = fill(l), idx = {}, dir = path.join(out, l); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); let big = 0;
    for (const k of Object.keys(F)) {
      const x = F[k];
      if (!(x && typeof x === 'object' && x.title && Array.isArray(x.s))) { idx[k] = x; continue; }
      idx[k] = { title: x.title, lead: x.lead, mins: mins(x) }; if (x.game) idx[k].game = x.game;
      const sb = `${head}(T => { const L = T[${JSON.stringify(l)}] = T[${JSON.stringify(l)}] || {}; L[${JSON.stringify(k)}] = Object.assign(L[${JSON.stringify(k)}] || {}, ${JSON.stringify(x)}); })(window.${G} = window.${G} || {});\n`;
      fs.writeFileSync(path.join(dir, k + '.js'), sb); big = Math.max(big, Buffer.byteLength(sb));
    }
    const body = `${head}(window.${G} = window.${G} || {})[${JSON.stringify(l)}] = ${JSON.stringify(idx)};\n`;
    fs.writeFileSync(path.join(out, l + '.js'), body); console.log(name, l, 'index ' + Math.round(Buffer.byteLength(body) / 1024) + 'KB, largest story ' + Math.round(big / 1024) + 'KB');
  }
}

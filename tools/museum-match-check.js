// 博物館「名局選」の点検 (2026-11-27): every game's record is played through with the room's own rules (atlas/museum/match.js — a move
// that cannot be played, a wrong capture or check mark, an ambiguous chess move stops it), and the texts are checked
// (atlas/museum/match-i18n.js: each game has its title and the rest in all 14 languages, the notes' move numbers are inside the game,
// every note in English is in each language too). Run: node tools/museum-match-check.js  (exit 1 on any problem)
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const window = { addEventListener() {}, localStorage: null }; global.window = window; global.addEventListener = () => {}; global.localStorage = { getItem: () => null, setItem() {} };
new Function('window', fs.readFileSync(path.join(root, 'atlas/museum/match-i18n.js'), 'utf8'))(window);
new Function('window', 'addEventListener', 'localStorage', fs.readFileSync(path.join(root, 'atlas/museum/match.js'), 'utf8'))(window, () => {}, global.localStorage);
const M = window.AtlasMatch, T = window.MUSEUM_MATCH_T, LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
let bad = 0; const no = (m) => { bad++; console.log('✗ ' + m); };
const ids = new Set();
for (const G of M.GAMES) {
  if (ids.has(G.id)) no(`${G.id}: the id is used twice`); ids.add(G.id);
  let L; try { L = M.line(G); } catch (e) { no(`${G.id}: ${e.message}`); continue; }
  const n = L.mv.length;
  Object.keys(G.mk || {}).forEach(p => { if (+p < 0 || +p > n) no(`${G.id}: mk ${p} is past the end (${n} moves)`); });
  for (const l of LANGS) { const x = (T[l] || {})[G.id];
    if (!x) { no(`${G.id}: no text in ${l}`); continue; }
    ['t', 'w', 'b', 'd', 'pl', 'lead'].forEach(k => { if (!x[k]) no(`${G.id} ${l}: ${k} missing`); });
    Object.keys(x.c || {}).forEach(p => { if (+p < 0 || +p > n || !/^\d+$/.test(p)) no(`${G.id} ${l}: note ${p} is outside the game (0…${n})`); });
    Object.keys(((T.en || {})[G.id] || {}).c || {}).forEach(p => { if (!x.c || x.c[p] == null) no(`${G.id} ${l}: note ${p} missing`); }); }
  console.log(`✓ ${G.id} (${G.kind}) ${n} moves, ${Object.keys(((T.ja || {})[G.id] || {}).c || {}).length} notes`);
}
for (const l of LANGS) { const u = (T[l] || {}).ui; if (!u) { no(`ui missing in ${l}`); continue; } Object.keys(T.ja.ui).forEach(k => { if (u[k] == null) no(`ui ${l}: ${k} missing`); }); }
console.log(bad ? `${bad} problem(s)` : 'all good'); process.exit(bad ? 1 : 0);

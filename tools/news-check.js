// Checks shared/atlas-updates.js against the NEWS rules (claude/game-conventions-addendum.md):
// one line per game per day, ja ≤ 80 chars, other languages ≤ 160, all 14 languages, newest first (2026-11-17: friendlier, longer lines).
// Run before every PR that touches the changelog: node tools/news-check.js  (exit 1 on a problem)
global.window = {};
require('../shared/atlas-updates.js');
const U = window.ATLAS_UPDATES, LANGS = ['zh', 'zh-TW', 'ko', 'es', 'fr', 'de', 'pt', 'ru', 'tr', 'id', 'hi', 'ar'];
const err = [], seen = new Set();
U.forEach((u, i) => {
  const [d, g, ja, en, o] = u, at = `${d} ${g}`;
  if (seen.has(at)) err.push(`${at}: 同じゲーム・同じ日に2行（1行にまとめる）`); seen.add(at);
  if (i && d > U[i - 1][0]) err.push(`${at}: 日付が新しい順になっていない`);
  if ([...(ja || '')].length > 80) err.push(`${at}: ja ${[...ja].length}字（80字以内）`);
  if (!en || [...en].length > 160) err.push(`${at}: en ${en ? [...en].length + '字（160字以内）' : 'なし'}`);
  LANGS.forEach(l => { const s = o && o[l]; if (!s) err.push(`${at}: ${l} なし`); else if ([...s].length > 160) err.push(`${at}: ${l} ${[...s].length}字（160字以内）`); });
});
if (err.length) { console.log(err.join('\n')); process.exit(1); }
console.log(`OK: ${U.length} 行`);

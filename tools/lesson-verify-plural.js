// (2026-11-24 担当A, claude/lesson-quality.md 追58) a number that can be 1 followed (or preceded) by a plural word.
// 「Nice! 1 moves left」「No mate within 1 moves」「Win by 1 discs or more」「Quedan 1 jugadas」「За 1 ходов」「1 चालों में」「1 نقلات」:
// every text with the number placeholder {n} (the moves left / the limit / the margin / the empties of the 3D puzzles' guide) in
//   - atlas/puzzles.js: every top-level `const X = { … }` block of words (TX, RV, C4X, MCX, MMX, TFX, AMX, HXX, CKX, XQX, JGX, BGX, GOX, GMX),
//   - xiangqi/pzwhy.js: T and OWN (the words after a move off the solution, 3D and 2D),
// by language:
//   en      the word after the number ends in -s (moves, discs, squares, times…) or is "empty" (→ "empty squares");
//   es · pt the word after ends in -s, or the verb before is plural (Quedan / Faltan / Faltam / Restan);
//   fr      the word after ends in -s / -x (fois is the same for 1: allowed) or "cases" / "pions";
//   de      a noun after the number (capitalised: Züge / Zügen / Steinen / Schritte) or leere (Felder);
//   ru      any word after the number (the noun's case depends on the number: 1 ход · 2 хода · 5 ходов), the verb before (Осталось {n}); 「Мат в {n}」 alone is the usual notation;
//   hi      any word after the number but बाकी / बार / और / में / के / का / की / से / तक (चालें / चालों / गोटियों / ख़ाली खाने);
//   ar      any word after the number but أو (نقلات / مرات / مربعات / قطعة: 1, 2, 3–10 and 11+ each take another form) and "الـ{n}";
// A text whose key has a sibling key + '1' (goalMate1 for goalMate) is said only for 2 or more and is allowed.
// The fix: the number after a label (「Moves left: {n}」「Jugadas restantes: {n}」「Осталось ходов: {n}」「حدّ النقلات: {n}」).
// Usage: node tools/lesson-verify-plural.js   (lesson-verify.js plural58 calls verify(); verify({ src }) for a broken copy in tests)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
const I18N_DONE = ['xiangqi', 'chess', 'hex', 'morris', 'connect4', 'reversi'];   // (追61) the games whose <game>/i18n.js pz.* words are checked (fixed)
// (追65) the plural verb before the number is found in any case: 「Te toca (quedan {n})」「Sua vez (restam {n})」「Ваш ход (осталось {n})」 were missed
// because the rule only knew the capitalised Quedan / Restam / Осталось.
const NUM = '\\{n\\}';   // ({g} is a piece in xiangqi/pzwhy.js: the general)
const after = new RegExp(NUM + '[\\s\\u00a0]+([^\\s<>,.;:!?…()—–।\\-\'"]+)', 'g');
const RULE = {
  en: { w: w => /s$/i.test(w) || /^empty$/i.test(w) },
  es: { w: w => /s$/i.test(w), pre: /(Quedan|Faltan|Restan)\s+(<b>)?\{(?:n|g)\}/i },
  pt: { w: w => /s$/i.test(w), pre: /(Faltam|Restam|Ficam)\s+(<b>)?\{(?:n|g)\}/i },
  fr: { w: w => w !== 'fois' && /[sx]$/i.test(w) },
  de: { w: w => /^[A-ZÄÖÜ]/.test(w) || /^leer/.test(w) },   // a noun (capitalised) or leere Felder; oder / und / mehr / -mal are fine
  ru: { w: () => true, pre: /(Осталось|Остался|Осталась|Остались)\s+(<b>)?\{(?:n|g)\}/i },
  hi: { w: w => !/^(बाकी|बाक़ी|बार|और|में|के|का|की|से|तक)$/.test(w) },
  ar: { w: w => !/^(أو)$/.test(w), pre: /الـ\{(?:n|g)\}/ },
};
// the word blocks of atlas/puzzles.js: `\n  const NAME = {` … the matching `}` (strings skipped), evaluated as an object literal
function blocks(src) {
  const re = /\n  const ([A-Z][A-Z0-9_]*) = \{/g, out = {}; let m;
  while ((m = re.exec(src))) {
    const st = m.index + m[0].length - 1; let d = 0, i = st, q = null;
    for (; i < src.length; i++) { const c = src[i]; if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; } if (c === "'" || c === '"' || c === '`') { q = c; continue; } if (c === '{') d++; else if (c === '}') { d--; if (!d) break; } }
    try { out[m[1]] = Function('return ' + src.slice(st, i + 1))(); } catch (e) { out[m[1]] = { __err: e.message }; }
  }
  return out;
}
function texts(where, obj) {
  const res = [];
  const walk = (v, keyPath, lang, parent, key) => {
    if (typeof v === 'string') { if (new RegExp(NUM).test(v)) res.push({ where, key: keyPath.join('.'), lang, s: v, parent, k: key }); }
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, [...keyPath, i], lang, parent, key));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, [...keyPath, k], LANGS.includes(k) ? k : lang, Array.isArray(x) ? v : v, Array.isArray(x) ? k : k);
  };
  walk(obj, [], null, null, null);
  return res;
}
function check(t) {
  const R = RULE[t.lang]; if (!R) return [];
  if (t.parent && typeof t.k === 'string' && t.parent[t.k + '1'] != null) return [];   // a separate text for 1 (goalMate1)
  const bad = [];
  for (const m of t.s.matchAll(after)) if (/\p{L}/u.test(m[1]) && R.w(m[1])) bad.push(`「{n} ${m[1]}」`);
  if (R.pre && R.pre.test(t.s)) bad.push(`「${t.s.match(R.pre)[0]}」`);
  return bad;
}
function verify(opt) {
  opt = opt || {};
  const out = [], add = (q, msg) => out.push({ step: 'plural58', q, msg });
  const src = opt.src != null ? opt.src : fs.readFileSync(path.join(ROOT, 'atlas/puzzles.js'), 'utf8');
  const B = blocks(src), all = [];
  for (const [name, o] of Object.entries(B)) { if (o && o.__err) { add(name, `atlas/puzzles.js ${name} could not be read: ${o.__err}`); continue; } all.push(...texts('atlas/puzzles.js ' + name, o)); }
  for (const need of ['TX', 'RV', 'C4X', 'MCX', 'MMX', 'TFX', 'AMX', 'HXX', 'CKX', 'XQX', 'JGX', 'BGX', 'GOX', 'GMX']) if (!B[need]) add(need, `atlas/puzzles.js has no ${need} (the check would see nothing)`);
  const XW = opt.xq || require(path.join(ROOT, 'xiangqi/pzwhy.js'));
  all.push(...texts('xiangqi/pzwhy.js T', XW.T), ...texts('xiangqi/pzwhy.js OWN', XW.OWN));
  // 追61: the game's own 2D words (<game>/i18n.js, pz.*) that the 3D puzzle also says (B.tx: the goal 「mate within 1 moves」, the
  // solved line, the reason of a wrong move). The games in I18N_DONE are checked; the others are counted as pending (追61 未確認).
  const vm = require('vm'), pending = {};
  for (const g of fs.readdirSync(ROOT)) {
    const f = path.join(ROOT, g, 'i18n.js'); if (!fs.existsSync(f)) continue;
    const w = {}; try { vm.runInNewContext(fs.readFileSync(f, 'utf8'), { window: w, self: w }); } catch (e) { continue; }
    const I = (opt.i18n && opt.i18n[g]) || w.I18N; if (!I) continue;
    const T = [];
    for (const [lang, o] of Object.entries(I)) for (const [k, s] of Object.entries(o || {})) if (k.startsWith('pz.') && typeof s === 'string' && /\{n\}/.test(s)) T.push({ where: g + '/i18n.js', key: lang + '.' + k, lang, s, parent: o, k });
    if (I18N_DONE.includes(g)) all.push(...T);
    else { const c = T.filter(t => RULE[t.lang] && check(t).length).length; if (c) pending[g] = c; }
  }
  for (const g of I18N_DONE) if (!fs.existsSync(path.join(ROOT, g, 'i18n.js'))) add(g, `追61 ${g}/i18n.js is missing`);
  let n = 0;
  for (const t of all) { if (!RULE[t.lang]) continue; n++; const b = check(t); if (b.length) add(`${t.where}.${t.key}`, `${/i18n\.js$/.test(t.where) ? "追61" : "追58"} a number that can be 1 next to a plural word ${b.join(' ')}: ${t.s}`); }
  if (n < 150) add('-', `追58 only ${n} texts with a number were seen (the blocks moved?)`);
  return { out, n, pending };
}
module.exports = { verify, blocks, check, RULE };
if (require.main === module) {
  const r = verify(); r.out.forEach(o => console.log(`NG ${o.q}: ${o.msg}`));
  console.log(r.out.length ? `${r.out.length} NG / ${r.n} texts` : `OK ${r.n} texts (en・es・fr・pt・de・ru・hi・ar)`); if (Object.keys(r.pending).length) console.log('追61 pending (<game>/i18n.js pz.*):', JSON.stringify(r.pending)); process.exit(r.out.length ? 1 : 0);
}

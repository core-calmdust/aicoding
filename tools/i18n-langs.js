#!/usr/bin/env node
// i18n-langs.js — helper for adding the 4 new languages (ru, zh-TW, id, tr) to the existing 10-language strings.
//
// Every translation in this repo is an object literal that has an `en` entry and an `ar` entry
// (either { ja: '…', en: '…', …, ar: '…' } per string, or { ja: {…}, en: {…}, …, ar: {…} } per language).
// This tool finds those objects, and for the ones without the new languages:
//
//   node tools/i18n-langs.js extract <file> [out.json]   → units to translate: [{ id, en }]  (en = string | array | object of strings)
//   node tools/i18n-langs.js apply <file> <tr.json>      → tr.json = { "<id>": { "ru": …, "zh-TW": …, "id": …, "tr": … } }
//                                                          inserts the 4 entries right after `ar` (same quote/key style, same indentation)
//   node tools/i18n-langs.js coverage [dir…]             → per folder: strings that still lack each new language
//   node tools/i18n-langs.js missing <dir> [out.json]     → language dictionaries (I18N.zh = {…}, { ja: {…}, en: {…} }) of a folder:
//                                                          for each new language, the en keys it lacks + their en text and the files involved
//                                                          (add them by hand, e.g. I18N.ru = {…}; next to the I18N.ar assignment)
//
// Missing languages fall back to English in every game's t() and in the shared parts (T[lang] || T.en), so a
// partly translated file never breaks; but a game only gets the 4 languages in its language menu when coverage is 0.
'use strict';
const fs = require('fs'), path = require('path');
const NEW = ['ru', 'zh-TW', 'id', 'tr'];

// ---- minimal JS/JSON scanner: finds object literals and their top-level `key: value` spans ----
function scan(src) {
  const objs = [], stack = []; // stack items: { ch, obj?, expectKey, cur }
  let i = 0, n = src.length, lastSig = '';
  const isId = c => /[A-Za-z0-9_$]/.test(c);
  function skipStr(q) { i++; while (i < n) { const c = src[i]; if (c === '\\') { i += 2; continue; } if (q === '`' && c === '$' && src[i + 1] === '{') { i += 2; let d = 1; while (i < n && d) { const e = src[i]; if (e === '{') d++; else if (e === '}') d--; else if (e === '"' || e === "'" || e === '`') { skipStr(e); continue; } i++; } continue; } if (c === q) { i++; return; } if (c === '\n' && q !== '`') { i++; return; } i++; } }
  function skipRegex() { i++; let cls = false; while (i < n) { const c = src[i]; if (c === '\\') { i += 2; continue; } if (c === '[') cls = true; else if (c === ']') cls = false; else if (c === '/' && !cls) { i++; while (i < n && /[a-z]/.test(src[i])) i++; return; } else if (c === '\n') return; i++; } }
  function top() { return stack[stack.length - 1]; }
  function closeEntry(t, end) { if (t && t.obj && t.cur) { t.cur.valEnd = end; t.obj.entries.push(t.cur); t.cur = null; } }
  while (i < n) {
    const c = src[i], t = top();
    // key detection at start of an object entry
    if (t && t.obj && t.expectKey && !/\s/.test(c)) {
      t.expectKey = false;
      let m = null;
      if (c === '"' || c === "'") { const s = i; skipStr(c); const keyTxt = src.slice(s, i); let j = i; while (/\s/.test(src[j])) j++; if (src[j] === ':') m = { key: keyTxt.slice(1, -1), keyStart: s, quote: c, after: j + 1 }; else { lastSig = 'str'; continue; } }
      else if (isId(c)) { const s = i; while (i < n && isId(src[i])) i++; const k = src.slice(s, i); let j = i; while (/\s/.test(src[j])) j++; if (src[j] === ':' && src[j + 1] !== ':') m = { key: k, keyStart: s, quote: '', after: j + 1 }; else { lastSig = 'id'; continue; } }
      if (m) { let j = m.after; while (/\s/.test(src[j])) j++; t.cur = { key: m.key, keyStart: m.keyStart, quote: m.quote, valStart: j }; i = j; lastSig = ':'; continue; }
    }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '"' || c === "'" || c === '`') { skipStr(c); lastSig = 'str'; continue; }
    if (c === '/') { if (lastSig === '' || /^[(,=:[!&|?{};+\-*%<>~^]$/.test(lastSig) || lastSig === 'return') { skipRegex(); lastSig = 're'; continue; } i++; lastSig = '/'; continue; }
    if (c === '{') { const obj = { start: i, entries: [] }; objs.push(obj); stack.push({ ch: '{', obj, expectKey: true, cur: null }); i++; lastSig = '{'; continue; }
    if (c === '[' || c === '(') { stack.push({ ch: c }); i++; lastSig = c; continue; }
    if (c === '}' || c === ']' || c === ')') { const s = stack.pop(); if (s && s.obj) { closeEntry(s, trimEnd(src, i)); s.obj.end = i + 1; } i++; lastSig = c; continue; }
    if (c === ',' && t && t.obj) { closeEntry(t, trimEnd(src, i)); t.expectKey = true; i++; lastSig = ','; continue; }
    if (c === ';' && t && t.obj) { t.cur = null; } // not an object literal after all (code block)
    if (isId(c)) { const s = i; while (i < n && isId(src[i])) i++; lastSig = src.slice(s, i) === 'return' ? 'return' : 'id'; continue; }
    if (!/\s/.test(c)) lastSig = c;
    i++;
  }
  return objs;
}
function trimEnd(src, i) { let j = i; while (j > 0 && /\s/.test(src[j - 1])) j--; return j; }

function literal(txt) {
  const t = txt.trim();
  if (!/^['"`{[]/.test(t)) return undefined;
  try { const v = Function('"use strict";return (' + t + ')')(); return ok(v) ? v : undefined; } catch (e) { return undefined; }
}
function ok(v) { if (typeof v === 'string') return true; if (Array.isArray(v)) return v.every(ok); if (v && typeof v === 'object') return Object.values(v).every(ok); return false; }
function count(v) { if (typeof v === 'string') return 1; if (Array.isArray(v)) return v.reduce((a, x) => a + count(x), 0); return Object.values(v).reduce((a, x) => a + count(x), 0); }

function units(src) {
  const out = [];
  for (const o of scan(src)) {
    const by = {}; for (const e of o.entries) by[e.key] = e;
    if (!by.en || !by.ar) continue;
    const enTxt = src.slice(by.en.valStart, by.en.valEnd), en = literal(enTxt);
    out.push({ obj: o, by, en, enTxt, missing: NEW.filter(k => !by[k]) });
  }
  return out;
}
const hash = s => { let h = 5381; for (const c of s) h = (h * 33 + c.codePointAt(0)) >>> 0; return h.toString(36); };
const idOf = (u, k) => k + '-' + hash(u.enTxt);

function extract(file, out) {
  const src = fs.readFileSync(file, 'utf8'), list = [], skipped = [];
  units(src).forEach((u, k) => { if (!u.missing.length) return; if (u.en === undefined) { skipped.push(lineOf(src, u.by.en.keyStart)); return; } list.push({ id: idOf(u, k), en: u.en }); });
  const json = JSON.stringify(list, null, 1);
  if (out) fs.writeFileSync(out, json); else process.stdout.write(json + '\n');
  if (skipped.length) console.error(`${file}: ${skipped.length} non-literal en values skipped (lines ${skipped.slice(0, 20).join(', ')})`);
  console.error(`${file}: ${list.length} units`);
}
function lineOf(src, i) { return src.slice(0, i).split('\n').length; }

// serialize a translated value in the style of the en source
function ser(v, enTxt, indent) {
  const q = (enTxt.trim()[0] === '"' || /^\{\s*"/.test(enTxt.trim())) ? '"' : "'";
  const str = s => q + s.replace(/\\/g, '\\\\').replace(new RegExp(q, 'g'), '\\' + q).replace(/\n/g, '\\n') + q;
  const keyQ = /^\s*\{\s*"/.test(enTxt) ? '"' : '';
  const multi = /^\{\s*\n/.test(enTxt.trim());
  function go(x, ind) {
    if (typeof x === 'string') return str(x);
    if (Array.isArray(x)) return '[' + x.map(y => go(y, ind)).join(', ') + ']';
    const ks = Object.keys(x).map(k => (keyQ || !/^[A-Za-z_$][\w$]*$/.test(k) ? (keyQ || "'") + k + (keyQ || "'") : k) + ': ' + go(x[k], ind + '  '));
    return multi ? '{\n' + ks.map(s => ind + '  ' + s).join(',\n') + '\n' + ind + '}' : '{ ' + ks.join(', ') + ' }';
  }
  return go(v, indent);
}
function apply(file, trFile) {
  let src = fs.readFileSync(file, 'utf8');
  const tr = JSON.parse(fs.readFileSync(trFile, 'utf8'));
  const ins = []; let done = 0;
  units(src).forEach((u, k) => {
    const T = tr[idOf(u, k)]; if (!T || !u.missing.length) return;
    const ar = u.by.ar, lineStart = src.lastIndexOf('\n', ar.keyStart) + 1, pre = src.slice(lineStart, ar.keyStart);
    const ownLine = /^\s*$/.test(pre), indent = ownLine ? pre : '';
    const keyQ = ar.quote || (u.by.en.quote || '');
    const isJson = /\.json$/i.test(file); // JSON: double quotes everywhere
    const parts = u.missing.map(l => { if (T[l] === undefined) throw new Error(`${file}: ${idOf(u, k)} lacks ${l}`); const kq = isJson ? '"' : keyQ || (l === 'zh-TW' ? "'" : ''); return kq + l + kq + ': ' + (isJson ? JSON.stringify(T[l]) : ser(T[l], u.enTxt, indent)); });
    const sep = ownLine ? ',\n' + indent : ', ';
    ins.push({ at: ar.valEnd, text: sep + parts.join(sep) });
    done++;
  });
  ins.sort((a, b) => b.at - a.at).forEach(x => { src = src.slice(0, x.at) + x.text + src.slice(x.at); });
  fs.writeFileSync(file, src);
  console.error(`${file}: ${done} units updated`);
}

// language dictionaries assigned outside a { ja:…, en:…, ar:… } object:
//   I18N.zh = {…}   I18N['zh-TW'] = {…}   Object.assign(I18N.hi, {…})   add('ja', {…})
const LANG_RE = '(ja|en|zh|ko|es|fr|pt|de|hi|ar|ru|zh-TW|id|tr)';
const ASSIGN = [
  new RegExp('([A-Za-z_$][\\w$]*)\\.' + LANG_RE.replace('|zh-TW', '') + '\\s*=\\s*(?:Object\\.assign\\([^,]*,\\s*)?$'),
  new RegExp('([A-Za-z_$][\\w$]*)\\[[\'"]' + LANG_RE + '[\'"]\\]\\s*=\\s*(?:Object\\.assign\\([^,]*,\\s*)?$'),
  new RegExp('Object\\.assign\\(\\s*([A-Za-z_$][\\w$]*)(?:\\.' + LANG_RE.replace('|zh-TW', '') + '|\\[[\'"]' + LANG_RE + '[\'"]\\])[^,]*,\\s*$'),
  new RegExp('([A-Za-z_$][\\w$]*)\\(\\s*[\'"]' + LANG_RE + '[\'"]\\s*,\\s*$'),
];
function dicts(src, file, into) { // into: Map(namespace → Map(lang → Set(keys)))
  const put = (ns, l, keys) => { if (!into.has(ns)) into.set(ns, new Map()); const m = into.get(ns); if (!m.has(l)) m.set(l, new Set()); keys.forEach(k => m.get(l).add(k)); };
  const objs = scan(src);
  for (const o of objs) {
    const pre = src.slice(Math.max(0, o.start - 80), o.start);
    for (const re of ASSIGN) { const m = pre.match(re); if (m) { const l = m.slice(2).find(Boolean); put('var:' + m[1], l, o.entries.map(e => e.key)); break; } }
  }
  return objs;
}
function walk(d, out) { for (const f of fs.readdirSync(d)) { if (f === 'node_modules' || f.startsWith('.')) continue; const p = path.join(d, f), s = fs.statSync(p); if (s.isDirectory()) walk(p, out); else if (/\.(js|json)$/.test(f) && s.size < 30e6) out.push(p); } return out; }
function coverage(dirs) {
  const root = path.join(__dirname, '..');
  if (!dirs.length) dirs = fs.readdirSync(root).filter(d => !d.startsWith('.') && !['tools', 'claude', 'images'].includes(d) && fs.statSync(path.join(root, d)).isDirectory());
  const rows = [];
  for (const d of dirs) {
    const files = walk(path.isAbsolute(d) ? d : path.join(root, d), []).filter(f => !/[\\/]tools[\\/]/.test(f));
    const miss = Object.fromEntries(NEW.map(l => [l, 0])); let total = 0;
    const D = new Map();
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      const objs = dicts(src, f, D), byStart = new Map(objs.map(o => [o.start, o])), asDict = new Set();
      for (const o of objs) { // { ja: {…}, en: {…}, … }: a dictionary per language (maybe extended elsewhere via NAME.zh = {…})
        const by = {}; for (const e of o.entries) by[e.key] = e;
        if (!by.en || !byStart.has(by.en.valStart) || !(by.ja || by.zh || by.ar)) continue;
        const enO = byStart.get(by.en.valStart); if (!enO.entries.length) continue;
        const nm = src.slice(Math.max(0, o.start - 60), o.start).match(/([A-Za-z_$][\w$]*)\s*=\s*$/);
        const ns = nm ? 'var:' + nm[1] : 'obj:' + f + ':' + o.start;
        if (!D.has(ns)) D.set(ns, new Map());
        for (const [l, e] of Object.entries(by)) { const v = byStart.get(e.valStart); if (!v) continue; const m = D.get(ns); if (!m.has(l)) m.set(l, new Set()); v.entries.forEach(x => m.get(l).add(x.key)); }
        asDict.add(o);
      }
      for (const u of units(src)) {
        if (asDict.has(u.obj)) continue;
        const c = u.en === undefined ? 1 : count(u.en); total += c; for (const l of u.missing) miss[l] += c;
      }
    }
    // dictionaries: a key counts as missing in L when en has it and L does not (assignments may be split over several files)
    for (const m of D.values()) { const en = m.get('en'); if (!en || !m.has('ar') && !m.has('hi')) continue; total += en.size; for (const l of NEW) { const have = m.get(l); for (const k of en) if (!have || !have.has(k)) miss[l]++; } }
    if (total) rows.push([path.basename(d), total, ...NEW.map(l => miss[l])]);
  }
  rows.sort((a, b) => b[2] - a[2]);
  console.log(['folder', 'strings', ...NEW.map(l => 'missing ' + l)].join('\t'));
  for (const r of rows) console.log(r.join('\t'));
  const sum = rows.reduce((a, r) => a + r[2], 0);
  console.log(`\n${rows.filter(r => r[2] === 0).length}/${rows.length} folders complete; ${sum} strings still need ru.`);
}

// language dictionaries (I18N.zh = {…} / { ja: {…}, en: {…}, … }) of one folder: the en keys each new language lacks, with the en text
function missingDicts(dir, out) {
  const root = path.join(__dirname, '..'), D = new Map(), EN = new Map(), WHERE = new Map();
  for (const f of walk(path.isAbsolute(dir) ? dir : path.join(root, dir), []).filter(f => !/[\\/]tools[\\/]/.test(f))) {
    const src = fs.readFileSync(f, 'utf8'), objs = dicts(src, f, D), byStart = new Map(objs.map(o => [o.start, o]));
    const rel = path.relative(root, f), note = (ns, l) => { if (!WHERE.has(ns)) WHERE.set(ns, {}); (WHERE.get(ns)[l] = WHERE.get(ns)[l] || new Set()).add(rel); };
    const enOf = (ns, o) => { if (!EN.has(ns)) EN.set(ns, {}); for (const e of o.entries) EN.get(ns)[e.key] = src.slice(e.valStart, e.valEnd); };
    for (const o of objs) {
      const pre = src.slice(Math.max(0, o.start - 80), o.start);
      for (const re of ASSIGN) { const m = pre.match(re); if (m) { const l = m.slice(2).find(Boolean), ns = 'var:' + m[1]; note(ns, l); if (l === 'en') enOf(ns, o); break; } }
      const by = {}; for (const e of o.entries) by[e.key] = e;
      if (!by.en || !byStart.has(by.en.valStart) || !(by.ja || by.zh || by.ar)) continue;
      const nm = pre.match(/([A-Za-z_$][\w$]*)\s*=\s*$/), ns = nm ? 'var:' + nm[1] : 'obj:' + rel + ':' + lineOf(src, o.start);
      if (!D.has(ns)) D.set(ns, new Map());
      for (const [l, e] of Object.entries(by)) { const v = byStart.get(e.valStart); if (!v) continue; const m = D.get(ns); if (!m.has(l)) m.set(l, new Set()); v.entries.forEach(x => m.get(l).add(x.key)); note(ns, l); if (l === 'en') enOf(ns, v); }
    }
  }
  const res = [];
  for (const [ns, m] of D) {
    const en = m.get('en'); if (!en || !m.has('ar') && !m.has('hi')) continue;
    for (const l of NEW) { const have = m.get(l), keys = {}; for (const k of en) if (!have || !have.has(k)) { const t = (EN.get(ns) || {})[k]; const v = t === undefined ? undefined : literal(t); keys[k] = v === undefined ? { source: t } : v; } if (Object.keys(keys).length) res.push({ ns, lang: l, files: Object.fromEntries(Object.entries(WHERE.get(ns) || {}).map(([a, b]) => [a, [...b]])), keys }); }
  }
  const json = JSON.stringify(res, null, 1);
  if (out) fs.writeFileSync(out, json); else process.stdout.write(json + '\n');
  console.error(`${dir}: ${res.length} dictionaries × language with missing keys (${res.reduce((a, r) => a + Object.keys(r.keys).length, 0)} keys)`);
}

const [cmd, ...args] = process.argv.slice(2);
if (require.main !== module) { /* used as a library */ }
else if (cmd === 'extract') extract(args[0], args[1]);
else if (cmd === 'apply') apply(args[0], args[1]);
else if (cmd === 'coverage') coverage(args);
else if (cmd === 'missing') missingDicts(args[0], args[1]);
else { console.log('usage: i18n-langs.js extract <file> [out.json] | apply <file> <tr.json> | coverage [dir…] | missing <dir> [out.json]'); process.exit(1); }
module.exports = { scan, units, NEW };

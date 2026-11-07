// keep-langs.js — lets a generator whose texts only have some of the 14 languages (most have the first 10: ja en zh ko
// es fr pt de hi ar; go's joseki / fuseki texts only ja en) rebuild a data file without losing the languages that were
// added to that file afterwards (ru / zh-TW / id / tr in 2026-11, or the 12 languages of go/openings.json).
//
//   const { keepLangs } = require('../../tools/keep-langs.js');   (in an .mjs: createRequire(import.meta.url))
//   D = keepLangs(D, FILE);      just before fs.writeFileSync(FILE, …)   — FILE = the data file being rebuilt
//   D = keepLangs(D, FILE, { langs: [...] })                          — the languages to keep (default ru, zh-TW, id, tr)
//
// A text object is { ja, en, … } (only language keys). When it lacks some of `langs`, they are taken from the previous
// version of FILE: the object at the same place (same JSON path) if its `en` is the same, otherwise any text object with
// the same `en`. "Previous version" = FILE as it is on disk now, then FILE as last committed (git HEAD), so a run of the
// lesson generator that rewrites lessons.json without the ramps does not lose the ramps' texts for the ramp script after it.
// The languages are put in the usual order (ja en zh ko es fr pt de hi ar ru zh-TW id tr). Texts whose `en` is new or
// changed stay without them (the pages fall back to English) and are listed on stderr: write their translations (in the
// generator's source, or in the data file — they are kept from then on).
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ORDER = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar', 'ru', 'zh-TW', 'id', 'tr'];
const NEW = ['ru', 'zh-TW', 'id', 'tr'];
const isText = o => o && typeof o === 'object' && !Array.isArray(o) && 'en' in o && 'ja' in o && Object.keys(o).every(k => ORDER.includes(k));
const key = v => JSON.stringify(v);

function readPrev(file) {
  const out = [];
  try { if (fs.existsSync(file)) out.push(JSON.parse(fs.readFileSync(file, 'utf8'))); } catch (e) { }
  try {
    const dir = path.dirname(path.resolve(file));
    const top = cp.execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const rel = path.relative(top, path.resolve(file)).split(path.sep).join('/');
    const s = cp.execFileSync('git', ['show', 'HEAD:' + rel], { cwd: top, encoding: 'utf8', maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'ignore'] });
    out.push(JSON.parse(s));
  } catch (e) { }
  return out;
}

function keepLangs(next, prev, opt = {}) {
  const langs = opt.langs || NEW;
  const prevs = typeof prev === 'string' ? readPrev(prev) : [].concat(prev || []);
  const has = o => langs.every(l => l in o);
  const byEn = new Map();
  const index = x => {
    if (Array.isArray(x)) return x.forEach(index);
    if (!x || typeof x !== 'object') return;
    if (isText(x) && has(x) && !byEn.has(key(x.en))) byEn.set(key(x.en), x);
    for (const k in x) index(x[k]);
  };
  prevs.forEach(index);
  const missing = new Set();
  const walk = (x, olds) => {
    const sub = k => olds.map(o => (o && typeof o === 'object' ? o[k] : undefined)).filter(o => o !== undefined);
    if (Array.isArray(x)) return x.map((v, i) => walk(v, sub(i)));
    if (!x || typeof x !== 'object') return x;
    if (isText(x)) {
      if (has(x)) return x;
      const src = olds.find(o => isText(o) && key(o.en) === key(x.en) && has(o)) || byEn.get(key(x.en));
      if (!src) { missing.add(typeof x.en === 'string' ? x.en : key(x.en)); return x; }
      const o = {};
      for (const l of ORDER) if (l in x) o[l] = x[l]; else if (langs.includes(l)) o[l] = src[l];
      return o;
    }
    const o = {};
    for (const k in x) o[k] = walk(x[k], sub(k));
    return o;
  };
  const out = walk(next, prevs);
  if (missing.size && !opt.quiet) {
    process.stderr.write(`keep-langs: ${missing.size} text(s) without ${langs.join(' / ')} (new or changed English; the page shows English):\n`);
    for (const s of [...missing].slice(0, 20)) process.stderr.write('  ' + s.slice(0, 120) + '\n');
  }
  return out;
}
module.exports = { keepLangs, readPrev, ORDER, NEW };

// Build go/openings.json from the two study files (ja / en only):
//   tools/data/openings-joseki.json  (tools/joseki/build.mjs)  — categories hoshi, komoku, other, ai
//   tools/data/openings-fuseki.json  (tools/fuseki-build.mjs)  — categories basic, small, handi
// The other 12 languages (zh ko es fr pt de hi ar ru zh-TW id tr) are not in the text modules: they are taken from the
// current go/openings.json for every text whose English is unchanged (tools/keep-langs.js). New or changed English texts are
// listed and stay English-only until their translations are added (tools/i18n-langs.js extract / apply on openings.json).
//   node go/tools/openings-build.mjs [out=go/openings.json]
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const { keepLangs } = createRequire(import.meta.url)('../../tools/keep-langs.js');
const DIR = path.dirname(new URL(import.meta.url).pathname);
const FILE = path.join(DIR, '..', 'openings.json'), OUT = process.argv[2] || FILE;
const rd = f => JSON.parse(fs.readFileSync(path.join(DIR, 'data', f), 'utf8'));
const J = rd('openings-joseki.json'), F = rd('openings-fuseki.json');
const D = { version: 1, cats: [...J.cats, ...F.cats], sets: [...J.sets, ...F.sets] };
const LANGS12 = ['zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar', 'ru', 'zh-TW', 'id', 'tr'];
fs.writeFileSync(OUT, JSON.stringify(keepLangs(D, FILE, { langs: LANGS12 })));
console.log('openings.json', D.cats.length, 'categories', D.sets.length, 'sets');

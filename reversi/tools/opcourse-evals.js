// The engine's evaluation of every legal move along every named opening line (reversi/openings.json), for the opening course
// (reversi/opcourse.js: 「手順を見る」 shows each move's value and rank; 実戦練習 grades moves on these positions without waiting
// for the engine). usage: node tools/opcourse-evals.js [ms per position]  → reversi/opcourse-evals.json
// { "<moves so far>": [["c4", -1.6], …] best first }  (the side to move's final disc difference, the book's values where it has them)
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const DIR = path.join(__dirname, '..');
const E = require(path.join(DIR, 'engine.js'));
const raw = zlib.gunzipSync(fs.readFileSync(path.join(DIR, 'weights.bin.gz')));
E.setWeights(new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2), 30); E.setBook(fs.readFileSync(path.join(DIR, 'book.bin')));
const { legal, play, start } = require('./eng-lite.js');
const ms = +(process.argv[2] || 1500), out = path.join(DIR, 'opcourse-evals.json');
const res = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};
const sqn = q => 'abcdefgh'[q & 7] + ((q >> 3) + 1), dec = m => (m.charCodeAt(0) - 97) + (+m[1] - 1) * 8;
const D = JSON.parse(fs.readFileSync(path.join(DIR, 'openings.json'), 'utf8'));
const todo = new Set();
for (const s of D.sets) for (const l of s.lines) { const mv = l.moves.match(/../g); for (let k = 0; k <= mv.length + 2; k++) todo.add(mv.slice(0, Math.min(k, mv.length)).join('') + (k > mv.length ? '+' + (k - mv.length) : '')); }
// positions past the line's end (+1, +2): the engine's best continuation, so the practice can grade the moves after the book too
let n = 0;
const keys = [...todo].sort((a, b) => a.length - b.length);
for (const key of keys) {
  if (res[key.split('+')[0]] && !key.includes('+')) continue;
  let [base, extra] = key.split('+'); extra = +(extra || 0);
  let c = start(), s = 1;
  const seq = (base.match(/../g) || []).map(dec);
  for (const q of seq) { c = play(c, q, s); s = 3 - s; if (!legal(c, s).length) s = 3 - s; }
  let k = base;
  for (let e = 0; e < extra; e++) { const l = res[k]; if (!l || !l.length) { k = null; break; } const q = dec(l[0][0]); c = play(c, q, s); s = 3 - s; if (!legal(c, s).length) s = 3 - s; k += l[0][0]; }
  if (!k || res[k] || !legal(c, s).length) continue;
  E.clearTT && E.clearTT();
  const list = E.analyze(c, s, { time: ms, exact: 16 });
  res[k] = list.slice().sort((a, b) => b.score - a.score).map(x => [sqn(x.move), Math.round(x.score * 10) / 10]);
  if (++n % 20 === 0) { fs.writeFileSync(out, JSON.stringify(res)); console.log(n, Object.keys(res).length); }
}
fs.writeFileSync(out, JSON.stringify(res)); console.log('done', Object.keys(res).length);

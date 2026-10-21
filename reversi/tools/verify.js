// independent check of every puzzle in puzzles.json: exactly one first move reaches the goal (exact search, fresh table),
// the goal is the best result, the answer line plays out, and no two puzzles are the same position up to symmetry / colour swap
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const DIR = process.argv[2] || '/home/claude/wt-rv1000/reversi';
const raw = zlib.gunzipSync(fs.readFileSync(path.join(DIR, 'weights.bin.gz')));
const E = require(path.join(DIR, 'engine.js')); E.setWeights(new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2), 30);
const { legal, play } = require('./eng-lite.js');
const { canon, meets, pv, exact, finalOf } = require('./feat.js');
const d = JSON.parse(fs.readFileSync(path.join(DIR, 'puzzles.json')));
const out = process.argv[3] || '/home/claude/work/ckpt/rv1000/verify.jsonl';
const done = new Set(fs.existsSync(out) ? fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).id) : []);
const keys = new Map(); let n = 0, bad = 0;
for (const L of d.levels) L.puzzles.forEach((p, i) => {
  const id = L.id + ':' + i, c = p.cells.split('').map(Number), k = canon(c, p.toMove);
  if (keys.has(k)) { console.log('DUPLICATE', id, keys.get(k)); bad++; } keys.set(k, id); n++;
  if (done.has(id)) return;
  E.clearTT();
  const ms = legal(c, p.toMove), sc = exact(E, c, p.toMove), by = new Map(sc.map(x => [x.move, Math.round(x.score)]));
  const ok = ms.filter(m => meets(p.goal, by.get(m))), best = Math.max(...ms.map(m => by.get(m)));
  const P = pv(E, c, p.toMove), fin = finalOf(P.final, p.toMove);
  const errs = [];
  if (ok.length !== 1) errs.push('solutions=' + ok.length);
  if (!meets(p.goal, best)) errs.push('goal unreachable');
  if (p.goal.type === 'margin' && best !== p.goal.value) errs.push('margin!=best');
  if (p.goal.type === 'draw' && best !== 0) errs.push('draw but best ' + best);
  if (fin !== best) errs.push('pv final ' + fin + ' != ' + best);
  if (c.filter(v => !v).length !== p.e) errs.push('e');
  if (errs.length) { bad++; console.log('BAD', id, errs.join(',')); }
  fs.appendFileSync(out, JSON.stringify({ id, ok: !errs.length, errs, answer: ok[0], best, pv: P.line.map(x => x.m) }) + '\n');
});
console.log('checked', n, 'bad', bad);

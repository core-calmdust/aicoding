// Verifies the warm-up ramps (lessons.json step.ramp, written by tools/ramps.js) with the solver (engine.js):
// every position is reachable and still in play, the example sequence (seq) is legal, marks / look cells are on the board,
// each 'try' answer set is exactly the set of correct columns (rule 'best': the columns with the best solver result;
// 'mate:n': the columns that force a four within n own moves, none faster), and all 10 languages exist.
// node tools/check_lessons.js
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '..', 'engine.js')), U = require('./c4util.js'), D = require(path.join(__dirname, '..', 'lessons.json'));
const LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
let bad = 0, n = 0;
const fail = (id, m) => { bad++; console.log('NG', id, m); };
const txt = (id, o, k) => { for (const l of LANGS) if (!o || typeof o[l] !== 'string' || !o[l]) fail(id, `missing ${k}.${l}`); };
const cellOk = ([c, r]) => c >= 0 && c < 7 && r >= 0 && r < 6;
function playable(id, mv) {   // legal and no four made on the way
  const g = Array.from({ length: 7 }, () => []);
  for (let i = 0; i < mv.length; i++) {
    const c = mv.charCodeAt(i) - 49, p = i % 2 ? 2 : 1;
    if (!(c >= 0 && c < 7) || g[c].length >= 6) { fail(id, 'illegal move at ' + i); return false; }
    if (U.isWinAfter(g, c, p)) { fail(id, 'game over at ' + i); return false; }
    g[c].push(p);
  }
  return true;
}
for (const k in D.rampUi || {}) txt('ui', D.rampUi[k], k);
for (const st of D.steps) for (const [j, it] of (st.ramp || []).entries()) {
  const id = st.id + '#' + j; n++;
  if (!playable(id, it.moves)) continue;
  for (const m of it.marks || []) if (!cellOk(m)) fail(id, 'mark ' + m);
  if (it.k === 'explain') {
    if (it.seq) { const full = it.moves + it.seq; const g = U.grid(it.moves + it.seq.slice(0, -1)), last = it.seq.charCodeAt(it.seq.length - 1) - 49;
      if (!playable(id + ' seq', full.slice(0, -1)) || g[last].length >= 6) fail(id, 'illegal seq'); }
    txt(id, it.t, 't'); txt(id, it.body, 'body'); continue;
  }
  txt(id, it.g, 'g'); txt(id, it.h, 'h'); txt(id, it.y, 'y');
  for (const q of it.look || []) if (!cellOk(q)) fail(id, 'look ' + q);
  const g = U.grid(it.moves), legal = U.legal(g);
  for (const c of it.ok) if (!legal.includes(c)) fail(id, 'illegal answer ' + c);
  let good;
  if (it.rule === 'best') {
    const sc = legal.map(c => { E.loadMoves(it.moves); return [c, Math.sign(E.solveMove(c, true))]; }), b = Math.max(...sc.map(x => x[1]));
    good = sc.filter(x => x[1] === b).map(x => x[0]);
    if (good.length === legal.length) fail(id, 'every move is equally good');
    console.log('ok?', id, 'result', b, 'per column', sc.map(x => 'abcdefg'[x[0]] + ':' + x[1]).join(' '));
  } else if (/^mate:\d$/.test(it.rule)) {
    const k = +it.rule.slice(5), ml = E.mateList(it.moves, k).filter(e => e.need);
    const mn = Math.min(...ml.map(e => e.need));
    if (mn !== k) fail(id, `fastest win in ${mn}, rule says ${k}`);
    good = ml.filter(e => e.need === mn).map(e => e.c);
  } else { fail(id, 'unknown rule ' + it.rule); continue; }
  if (good.slice().sort().join() !== it.ok.slice().sort().join()) fail(id, `ok ${it.ok} but solver ${good}`);
  else console.log('ok', id, it.ok.map(c => 'abcdefg'[c]).join(','));
}
console.log(bad ? `${bad} problem(s)` : `all ${n} ramp items OK`);
process.exit(bad ? 1 : 0);

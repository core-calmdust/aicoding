// Verifies the warm-up ramps (lessons.json grade.ramp, written by tools/ramps.js) with the engine:
// legal positions and example sequences; for 'try' items the ok list must equal the full set of correct moves:
//   mate: every first move that forces mate within n plies (tsume conventions, futile interpositions ignored)
//   defend: every move after which the opponent has no mate in 1 (and it is not already in check)
//   best: the moves whose search value is within 60 of the best, every other move at least 300 worse
// and every text exists in 10 languages.   node tools/check_lessons.js
'use strict';
const E = require('../engine.js'), path = require('path');
const LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
const D = require(path.join(__dirname, '..', 'lessons.json'));
const posOf = sfen => { const p = new E.Position(); p.setSfen(sfen); return p; };
const sqOk = q => /^[1-9][a-i]$/.test(q);
function mateFirst(sfen, n) {
  const p = posOf(sfen), out = [];
  for (const m of p.legalMoves(true)) {
    p.doMove(m);
    if (!p.inCheck() || !p.lastMoveLegal(m)) { p.undoMove(); continue; }
    let ok = true; const reps = p.legalMoves(true);
    if (n === 1) ok = !reps.length;
    else for (const r of reps) { if (E.isDrop(r) && !p.attacked(E.mTo(r), p.side)) continue; p.doMove(r); const s = E.solveMate(p, n - 2, 4e5, true); p.undoMove(); if (!s || s.mate < 0) { ok = false; break; } }
    p.undoMove(); if (ok) out.push(p.toUsi(m));
  }
  return out.sort();
}
function defendSet(sfen) {
  const p = posOf(sfen), out = [];
  for (const m of p.legalMoves(true)) { p.doMove(m); const r = E.solveMate(p, 1, 2e5, false); p.undoMove(); if (!(r && r.mate > 0)) out.push(p.toUsi(m)); }
  return out.sort();
}
let bad = 0, n = 0;
const fail = (id, m) => { bad++; console.log('NG', id, m); };
const txt = (id, o, k) => { for (const l of LANGS) if (!o || typeof o[l] !== 'string' || !o[l]) fail(id, `missing ${k}.${l}`); };
for (const k in D.rampUi || {}) txt('ui', D.rampUi[k], k);
for (const g of D.grades) for (const [j, it] of (g.ramp || []).entries()) {
  const id = g.id + '#' + j; n++;
  const p = posOf(it.sfen);
  if (!p.legalMoves(true).length) fail(id, 'no legal move');
  for (const [q] of it.marks || []) if (!sqOk(q)) fail(id, 'mark ' + q);
  for (const [a, b] of it.arrows || []) if (!sqOk(a) || !sqOk(b)) fail(id, 'arrow');
  for (const [q] of it.drops || []) if (!sqOk(q)) fail(id, 'drop ' + q);
  if (it.seq) { const q = posOf(it.sfen); for (const u of it.seq) { const m = q.legalMoves(true).find(x => q.toUsi(x) === u); if (!m) { fail(id, 'illegal seq ' + u); break; } q.doMove(m); } }
  if (it.k === 'explain') { txt(id, it.t, 't'); txt(id, it.body, 'body'); continue; }
  txt(id, it.g, 'g'); txt(id, it.h, 'h'); txt(id, it.y, 'y');
  for (const q of it.look || []) if (!sqOk(q)) fail(id, 'look ' + q);
  const legal = new Set(p.legalMoves(true).map(m => p.toUsi(m)));
  for (const u of it.ok) if (!legal.has(u)) fail(id, 'illegal answer ' + u);
  let want;
  if (it.goal === 'mate') want = mateFirst(it.sfen, it.n);
  else if (it.goal === 'defend') { if (p.inCheck()) fail(id, 'in check'); want = defendSet(it.sfen); const q = posOf(it.sfen.replace(' b ', ' w ')); if (!(E.solveMate(q, 1, 2e5, false) || {}).mate) fail(id, 'no threat to defend'); }
  else {
    const S = new E.Searcher(p), r = S.analyze({ time: 3000 }), best = r[0].s;
    want = r.filter(x => x.s >= best - 60).map(x => p.toUsi(x.m)).sort();
    const near = r.filter(x => x.s < best - 60 && x.s > best - 300); if (near.length) fail(id, 'moves too close: ' + near.map(x => p.toUsi(x.m) + ':' + x.s).join(' '));
  }
  if (want.join() !== it.ok.slice().sort().join()) fail(id, `ok ${it.ok} but ${it.goal} gives ${want}`);
  console.log('ok', id, it.goal, it.ok.join(','));
}
console.log(bad ? `${bad} problem(s)` : `all ${n} ramp items OK`);
process.exit(bad ? 1 : 0);

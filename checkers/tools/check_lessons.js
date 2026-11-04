// Verifies the warm-up ramps (lessons.json step.ramp, written by tools/ramps.js) with the engine (wasm search + endgame DB):
// every position is legal and still in play, each example sequence is legal, each 'try' answer set is exactly the
// set of moves within 30 of the best value while every other move is at least 100 worse, and all 10 languages exist.
// node tools/check_lessons.js
'use strict';
const { load } = require('./wasm.js'), path = require('path');
const LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
(async () => {
  const W = await load(), E = W.E, D = require(path.join(__dirname, '..', 'lessons.json'));
  let bad = 0, n = 0;
  const fail = (id, m) => { bad++; console.log('NG', id, m); };
  const txt = (id, o, k) => { for (const l of LANGS) if (!o || typeof o[l] !== 'string' || !o[l]) fail(id, `missing ${k}.${l}`); };
  for (const k in D.rampUi || {}) txt('ui', D.rampUi[k], k);
  const byName = (pos, s) => pos.moves().find(m => E.name(pos, m) === s);
  for (const st of D.steps) for (const [j, it] of (st.ramp || []).entries()) {
    const id = st.id + '#' + j; n++;
    const pos = E.Pos.from(it.s);
    if (!pos.moves().length) fail(id, 'no legal move');
    for (const [q] of it.marks || []) if (!(q >= 1 && q <= 32)) fail(id, 'mark ' + q);
    if (it.seq) { let p = pos.clone(); for (const s of it.seq) { const m = byName(p, s); if (!m) { fail(id, 'illegal seq ' + s); break; } p = p.clone().play(m); } }
    if (it.k === 'explain') { txt(id, it.t, 't'); txt(id, it.body, 'body'); continue; }
    txt(id, it.g, 'g'); txt(id, it.h, 'h'); txt(id, it.y, 'y');
    for (const q of it.look || []) if (!(q >= 1 && q <= 32)) fail(id, 'look ' + q);
    for (const s of it.ok) if (!byName(pos, s)) fail(id, 'illegal answer ' + s);
    const r = W.analyze(it.s, [], 2500), L = r.list.sort((a, b) => b.v - a.v), best = L[0].v;
    const good = L.filter(e => e.v >= best - 30).map(e => E.name(pos, e.m)).sort(), close = L.filter(e => e.v < best - 30 && e.v > best - 100);
    if (good.join() !== it.ok.slice().sort().join()) fail(id, `ok ${it.ok} but engine best ${good} (${L.map(e => E.name(pos, e.m) + ':' + e.v).join(' ')})`);
    if (close.length) fail(id, 'moves too close to the best: ' + close.map(e => E.name(pos, e.m) + ':' + e.v).join(' '));
    console.log('ok', id, it.ok.join(','), 'best', best, 'depth', r.depth);
  }
  console.log(bad ? `${bad} problem(s)` : `all ${n} ramp items OK`);
  process.exit(bad ? 1 : 0);
})();

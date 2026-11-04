// Verifies the warm-up ramps (lessons.json step.ramp, written by tools/ramps.js) with the engine (wasm search + mate search):
// legal positions (side not to move is not in check), legal example sequences, marks on real points, each 'try' answer set
// = every move that mates within `mate` moves (mate items) or the engine's best move ahead of all others by >= 300,
// and all 10 languages present.  node tools/check_lessons.js
'use strict';
const { load } = require('./wasm.js'), path = require('path');
const LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
(async () => {
  const W = await load(), E = W.E, D = require(path.join(__dirname, '..', 'lessons.json'));
  let bad = 0, n = 0;
  const fail = (id, m) => { bad++; console.log('NG', id, m); };
  const txt = (id, o, k) => { for (const l of LANGS) if (!o || typeof o[l] !== 'string' || !o[l]) fail(id, `missing ${k}.${l}`); };
  const sqOk = q => /^[a-i][0-9]$/.test(q);
  const byName = (pos, s) => pos.moves().find(m => E.name(pos, m, 'iccs') === s);
  for (const k in D.rampUi || {}) txt('ui', D.rampUi[k], k);
  for (const st of D.steps) for (const [j, it] of (st.ramp || []).entries()) {
    const id = st.id + '#' + j; n++;
    let pos; try { pos = E.Pos.from(it.s); } catch (e) { fail(id, 'bad fen'); continue; }
    const o = pos.clone(); o.side ^= 1; if (o.inCheck()) fail(id, 'side not to move is in check');
    if (!pos.moves().length) fail(id, 'no legal move');
    for (const [q] of it.marks || []) if (!sqOk(q)) fail(id, 'mark ' + q);
    if (it.seq) { let p = pos.clone(); for (const s of it.seq) { const m = byName(p, s); if (!m) { fail(id, 'illegal seq ' + s); break; } p = p.clone().play(m); } }
    if (it.k === 'explain') { txt(id, it.t, 't'); txt(id, it.body, 'body'); if (it.seq) console.log('ok', id, 'seq', it.seq.join(' ')); continue; }
    txt(id, it.g, 'g'); txt(id, it.h, 'h'); txt(id, it.y, 'y');
    for (const q of it.look || []) if (!sqOk(q)) fail(id, 'look ' + q);
    for (const s of it.ok) if (!byName(pos, s)) fail(id, 'illegal answer ' + s);
    let good;
    if (it.mate) {
      good = (E.puzzle(it.s, [], it.mate, false, false) || []).filter(x => x.need && x.need <= it.mate).map(x => E.name(pos, x.m, 'iccs')).sort();
      for (const s of it.ok) { const p = pos.clone().play(byName(pos, s)); if (it.mate === 1 && p.moves().length) fail(id, s + ' is not mate'); }
    } else {
      const r = E.analyze(it.s, [], 3000), L = r.list.sort((a, b) => b.v - a.v);
      if (L[0].v - L[1].v < 300) fail(id, `best ${E.name(pos, L[0].m, 'iccs')}:${L[0].v} not clear of ${E.name(pos, L[1].m, 'iccs')}:${L[1].v}`);
      good = [E.name(pos, L[0].m, 'iccs')];
    }
    if (good.join() !== it.ok.slice().sort().join()) fail(id, `ok ${it.ok} but engine ${good}`);
    else console.log('ok', id, it.ok.join(','));
  }
  console.log(bad ? `${bad} problem(s)` : `all ${n} ramp items OK`);
  process.exit(bad ? 1 : 0);
})();

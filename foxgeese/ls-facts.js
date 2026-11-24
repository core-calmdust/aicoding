/* Fox and Geese — the facts of the board behind every lesson answer (2026-11-24 担当C).
   The 2D (foxgeese/app.js okAnswer), the 3D (atlas/ls-foxgeese.js, ドミダック's words) and the check (tools/lesson-verify-foxgeese.js)
   all read a move through this one function, so the words always say what happens on the board.
   FoxLsFacts.fact(E, id, spec, m) → { k, ... } for the fox lessons:
     f_jump   : 'take'  (the answer: { over } the goose jumped)            · 'step' (a step: no goose jumped; { t } geese it attacks after)
     f_double : 'most'  (the answer: { n } geese)                          · 'step' · 'stop' (the same line, stopped after { k }: { n } was there)
                'other' (another way of jumping: { k } geese, { n } was there)
     f_fork   : 'fork'  (the answer: { t } geese attacked, no reply covers them all)
                't0' (no goose can be jumped after it) · 't1' (one goose only: { r } the reply that fills behind it)
                'tdef' ({ t } geese attacked, but the reply { r } covers them all) · 'trap' (the geese shut the fox in: { r })
   Moves are the engine's numbers; points the engine's indices (E.sqName names them). Works as a plain script and in Node. */
(function () {
  'use strict';
  const caps = p => p.foxMoves([]).filter(m => p.clone().play(m).cap > p.cap);
  // the geese the fox can jump next (the first goose of each jump), and the geese's replies after which it can jump none
  const aimed = (E, p) => [...new Set(caps(p).map(m => E.jumped(m)[0]))];
  const covers = (E, q) => q.moves().filter(r => !caps(q.clone().play(r)).length);
  const trapR = q => q.moves().find(r => !q.clone().play(r).foxMoves([]).length);
  function fact(E, id, spec, m) {
    const pos = E.Pos.from(spec), q = pos.clone().play(m), k = q.cap - pos.cap, path = E.path(m);
    if (id === 'f_jump') return k ? { k: 'take', over: E.jumped(m)[0], n: k } : { k: 'step', t: aimed(E, q).length };
    if (id === 'f_double') {
      const L = pos.moves(), best = Math.max(...L.map(x => pos.clone().play(x).cap - pos.cap));
      if (k === best) return { k: 'most', n: k };
      if (!k) return { k: 'step', n: best };
      const pre = L.some(x => { const p2 = E.path(x); return pos.clone().play(x).cap - pos.cap === best && path.every((v, i) => p2[i] === v); });
      return { k: pre ? 'stop' : 'other', n: best, c: k };
    }
    if (id === 'f_fork') {
      if (k) return { k: 'take', n: k };
      const tr = trapR(q); if (tr != null) return { k: 'trap', r: tr };
      const t = aimed(E, q).length, cv = covers(E, q);
      if (!cv.length) return { k: 'fork', t };
      if (!t) return { k: 't0', r: cv[0] };
      const land = new Set(caps(q).map(x => E.path(x)[1]));   // (the reply that fills a landing point is the one the words name)
      return { k: t === 1 ? 't1' : 'tdef', t, r: cv.find(r => land.has(E.mTo(r))) || cv[0] };
    }
    return { k: '' };
  }
  const API = { fact, aimed, covers, caps };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.FoxLsFacts = API;
})();

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
    if (/^g_(safe|trap|net)$/.test(id)) return gfact(E, id, pos, m);
    return { k: '' };
  }
  // ---------- the geese lessons (2026-11-24 23:32 担当C) ----------
  // g_safe : 'safeF' / 'safeA' (the answer: the fox can jump no goose — a goose filled the landing point / the attacked goose moved away)
  // g_trap : 'trap' (the answer: the fox cannot move) · 'free' (no jump, but { e } points the fox can still step to; { r } one of them)
  //          · 'freeO' (the goose stepped into the fox's last point, but the point it left lets the fox move: { r })
  // g_net  : 'net'  (the answer: whatever the fox does, a goose move shuts it in next; { e } the points the fox can go to)
  //          'wide' (the fox escapes by { r } and then has { e } ≥ 2 points to go: one goose move fills one point)
  //          'hole' (after { r } one point is left, but every goose that steps there leaves the fox a move) · 'reach0' (no goose can step there)
  // every lesson, a move after which the fox can jump: { r } the jump the words name (the most geese of its kind), { n } the geese it takes,
  //   'jself' (the goose just moved is jumped: nothing behind it) · 'jopen' (the fox lands on the point the goose just left)
  //   · 'jstill' (a jump the fox had before the move is still there)
  const fjumps = p => p.foxMoves([]).filter(x => E0(p).jumped(x).length);
  let _E = null; const E0 = () => _E;
  const dests = (E, p) => new Set(p.foxMoves([]).map(x => E.path(x)[1]));   // (a step's point, a jump's first landing: the points a goose must fill)
  const shuts = (E, z) => z.moves().filter(g => !z.clone().play(g).foxMoves([]).length);
  function jfact(E, pos, m, q) {
    const J = fjumps(q), from = E.mFrom(m), to = E.mTo(m), before = new Set(fjumps(pos).map(x => E.path(x).slice(0, 2).join(',')));
    const kind = x => { const p = E.path(x); return E.jumped(x)[0] === to ? 'jself' : p[1] === from ? 'jopen' : before.has(p.slice(0, 2).join(',')) ? 'jstill' : 'jnew'; };
    const ord = ['jself', 'jopen', 'jstill', 'jnew'], ks = J.map(kind), k = ord.find(c => ks.includes(c));
    const mine = J.filter((x, i) => ks[i] === k), n = Math.max(...mine.map(x => E.jumped(x).length));
    return { k, r: mine.find(x => E.jumped(x).length === n), n };
  }
  function gfact(E, id, pos, m) {
    _E = E; const q = pos.clone().play(m);
    if (fjumps(q).length) return jfact(E, pos, m, q);
    const F = q.foxMoves([]);
    if (id === 'g_safe') { if (!F.length) return { k: 'trap' }; const land = new Set(fjumps(pos).map(x => E.path(x)[1])); return { k: land.has(E.mTo(m)) ? 'safeF' : 'safeA' }; }
    if (!F.length) return { k: 'trap' };
    if (id === 'g_trap') { const d = dests(E, q), was = dests(E, pos); return { k: was.has(E.mTo(m)) ? 'freeO' : 'free', e: d.size, r: F[0] }; }
    for (const f of F) {
      const z = q.clone().play(f); if (shuts(E, z).length) continue;
      const d = dests(E, z);
      if (d.size >= 2) return { k: 'wide', r: f, e: d.size };
      const [pt] = [...d], inn = z.moves().filter(g => E.mTo(g) === pt);
      return { k: inn.length ? 'hole' : 'reach0', r: f, e: d.size };
    }
    return { k: 'net', e: dests(E, q).size };
  }
  // the hint's points: g_safe the goose the fox can jump now, g_trap / g_net the points the fox can go to (never the answer itself)
  function hintPts(E, id, spec) { _E = E; const pos = E.Pos.from(spec);
    if (id === 'g_safe') return [...new Set(fjumps(pos).map(x => E.jumped(x)[0]))];
    return [...dests(E, pos)]; }
  const API = { fact, aimed, covers, caps, hintPts, fjumps: (E, p) => { _E = E; return fjumps(p); }, dests, shuts };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.FoxLsFacts = API;
})();

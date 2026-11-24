/* Kōnane — the facts of the board behind every lesson answer (2026-11-25 担当C).
   The 2D (konane/app.js okAnswer), the 3D (atlas/ls-konane.js, チェッカニ's words) and the check (tools/lesson-verify-konane.js
   lessons) all read a move through this one function, so the words always say what happens on the board.
   KonaneLsFacts.fact(E, id, spec, m) → { k, ... }:
     b_double : 'most'  (the answer: { n } stones taken — the only move that takes 2 or more)
                'stop'  (the answer's own line, stopped after { c }: { n } was there)
                'other' (another jump: { c } taken; { end } what follows its landing square in its direction:
                         'edge' the board ends · 'mine' your own stone · 'empty' an empty square (no stone to jump) ·
                         'block' an enemy stone with no empty square behind it)
     b_win    : 'win'   (the answer: the opponent has no jump; { t } the jumps it had before)
                'left'  ({ j } jumps the opponent still has after it, { c } stones taken, { r } one of those jumps)
   Moves are the engine's numbers (E.mFrom / E.mTo / E.path), squares its indices. Works as a plain script and in Node. */
(function () {
  'use strict';
  const step = (E, a, b) => { const [r0, c0] = E.RC[a], [r1, c1] = E.RC[b]; return [Math.sign(r1 - r0), Math.sign(c1 - c0)]; };
  const at = (E, r, c) => { const n = Math.round(Math.sqrt(E.RC.length)); return r < 0 || c < 0 || r >= n || c >= n ? -1 : r * n + c; };
  // what follows the landing square of m (in its direction) on the board after m
  function endOf(E, pos, m) {
    const p = E.path(pos, m), a = p[p.length - 2], b = p[p.length - 1], [dr, dc] = step(E, a, b), [r, c] = E.RC[b], me = pos.turn;
    const n1 = at(E, r + dr, c + dc); if (n1 < 0) return 'edge';
    const o = pos.owner(n1); if (o === me) return 'mine'; if (!o) return 'empty';
    const n2 = at(E, r + 2 * dr, c + 2 * dc); return n2 < 0 || pos.owner(n2) ? 'block' : 'open';
  }
  function fact(E, id, spec, m) {
    const pos = E.Pos.from(spec), me = pos.turn, q = pos.clone().play(m), c = E.hops(m);
    if (id === 'b_double') {
      const L = pos.moves(), n = Math.max(...L.map(E.hops));
      if (c === n) return { k: 'most', n };
      const p = E.path(pos, m), same = L.some(x => E.hops(x) === n && E.mFrom(x) === E.mFrom(m) && E.path(pos, x)[1] === p[1]);
      return same ? { k: 'stop', c, n } : { k: 'other', c, n, end: endOf(E, pos, m) };
    }
    if (id === 'b_win') {
      const j = q.mobility(3 - me);
      if (!j) return { k: 'win', t: pos.mobility(3 - me), c };
      const R = q.moves(), r = R.find(x => pos.owner(E.mFrom(x)) === 3 - me && !pos.owner(E.mTo(x))); return { k: 'left', j, c, r: r != null ? r : R[0] };   // (r: drawn on the problem's board — a jump whose stone is there and whose landing square is empty)
    }
    return { k: '' };
  }
  // the hint's squares: b_double your stones that can jump now · b_win the opponent's stones that could jump now
  function hint(E, id, spec) {
    const pos = E.Pos.from(spec), me = pos.turn;
    if (id === 'b_double') return [...new Set(pos.moves().map(E.mFrom))];
    if (id === 'b_win') { const o = pos.clone(); o.side ^= 1; return [...new Set(o.moves().map(E.mFrom))].filter(x => pos.owner(x) === 3 - me); }
    return [];
  }
  const API = { fact, hint, endOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.KonaneLsFacts = API;
})();

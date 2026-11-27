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
  // (2026-11-25 05:33 担当C) the strategy lessons s_count / s_stop: an exact solve of the ending (the side to move wins if some jump
  // leaves the other side lost; no jump = lost). memo by the engine's two hashes.
  const MEMO = new Map();
  function wins(pos) {
    const key = pos.h1 + ',' + pos.h2; let v = MEMO.get(key); if (v !== undefined) return v;
    v = false; for (const m of pos.moves()) if (!wins(pos.clone().play(m))) { v = true; break; }
    if (MEMO.size > 400000) MEMO.clear(); MEMO.set(key, v); return v;
  }
  // a wrong move m (it loses): the opponent's reply that wins (r), your jumps after it (e). Picked: drawn on the problem's board first
  // (its stone there, its landing square empty), then the one leaving you fewest jumps, then (s_stop 'go') one taking the landed stone.
  function refute(E, pos, q, m, land, left) {   // (left: s_go — the stones the full jump would have taken; the reply that jumps with one of them first)
    const me = pos.turn, R = q.moves().filter(r => !wins(q.clone().play(r)));
    if (!R.length) return null;
    const draw = r => pos.owner(E.mFrom(r)) === 3 - me && !pos.owner(E.mTo(r)), cap = r => left ? left.includes(E.mFrom(r)) : land != null && E.captured(q, r).includes(land);
    const sc = r => (draw(r) ? 0 : 100) + (cap(r) ? 0 : 10) + q.clone().play(r).mobility(me);
    const r = R.slice().sort((a, b) => sc(a) - sc(b) || a - b)[0];
    return { r, e: q.clone().play(r).mobility(me), draw: draw(r), spring: cap(r) };
  }
  function strat(E, id, spec, m) {
    const pos = E.Pos.from(spec), me = pos.turn, L = pos.moves(), q = pos.clone().play(m), c = E.hops(m), j = q.mobility(3 - me);
    const win = !wins(q);
    if (id === 's_count') {
      const js = L.map(x => pos.clone().play(x).mobility(3 - me)), j0 = Math.min(...js);
      if (win) return { k: 'fewest', j, c, t: pos.mobility(3 - me) };
      const R = refute(E, pos, q, m); return Object.assign({ k: 'more', j, c, j0 }, R);
    }
    if (id === 's_stop') {
      const p = E.path(pos, m), same = L.filter(x => E.mFrom(x) === E.mFrom(m) && E.path(pos, x)[1] === p[1]), n = Math.max(...same.map(E.hops));
      if (win) return { k: 'stop', c, n, j };
      const go = c > 1 && same.some(x => E.hops(x) < c && !wins(pos.clone().play(x)));   // (a shorter jump of the same line wins)
      const R = refute(E, pos, q, m, go ? E.mTo(m) : null); return Object.assign({ k: go ? 'go' : 'lose', c, n, j }, R);
    }
    // (2026-11-27 担当C) s_go: the answer jumps its line to the end; a shorter jump of that line ('short') stops early, 'shortS' when
    // the opponent's winning reply jumps with a stone the full jump would have taken (the stone left standing)
    // s_keep: o = your own jumps after the move; 'cut' a move leaving the opponent fewer jumps than the answer (j0 / o0: the answer's)
    // s_read: 'fewer' a move leaving the opponent as few jumps as the answer or fewer (counting does not find the answer)
    const A = L.find(x => !wins(pos.clone().play(x))), qa = A != null ? pos.clone().play(A) : null, o = q.mobility(me);
    if (id === 's_go') {
      const p = E.path(pos, m), same = L.filter(x => E.mFrom(x) === E.mFrom(m) && E.path(pos, x)[1] === p[1]), n = Math.max(...same.map(E.hops));
      if (win) return { k: 'all', c, n, j };
      const short = A != null && E.mFrom(m) === E.mFrom(A) && E.path(pos, A)[1] === p[1] && c < E.hops(A);
      if (!short) return Object.assign({ k: 'lose', c, j }, refute(E, pos, q, m));
      const left = E.captured(pos, A).filter(x => !E.captured(pos, m).includes(x)), R = refute(E, pos, q, m, null, left);
      return Object.assign({ k: 'short', c, n: E.hops(A), j }, R, { spring: !!(R && left.includes(E.mFrom(R.r))) });
    }
    if (id === 's_keep') {
      if (win) return { k: 'keep', j, o, c };
      const j0 = qa ? qa.mobility(3 - me) : 0, o0 = qa ? qa.mobility(me) : 0;
      return Object.assign({ k: j < j0 ? 'cut' : 'lose', j, o, c, j0, o0 }, refute(E, pos, q, m));
    }
    if (id === 's_read') {
      if (win) return { k: 'read', j, c };
      const j0 = qa ? qa.mobility(3 - me) : 0;
      return Object.assign({ k: j <= j0 ? 'fewer' : 'lose', j, c, j0 }, refute(E, pos, q, m));
    }
    return { k: '' };
  }
  const STRATS = ['s_count', 's_stop', 's_go', 's_keep', 's_read'];
  function fact(E, id, spec, m) {
    if (STRATS.includes(id)) return strat(E, id, spec, m);
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
    if (id === 's_count') return [...new Set(pos.moves().map(E.mFrom))];   // (every stone that can jump: count after each)
    if (id === 's_stop') return [...new Set(pos.moves().map(E.mFrom))];   // (every stone that can jump: where to stop on each line)
    if (/^s_(go|keep|read)$/.test(id)) return [...new Set(pos.moves().map(E.mFrom))];   // (every stone that can jump: go on or stop · your jumps kept · each reply)
    return [];
  }
  const API = { fact, hint, endOf, wins, STRATS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.KonaneLsFacts = API;
})();

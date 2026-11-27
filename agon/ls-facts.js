/* Agon lessons — the board facts of a move (2026-11-27 担当F). Read by the 2D (agon/app.js okAnswer / the hint), the 3D
   (atlas/ls-agon.js, キンダイスン's words) and tools/lesson-verify-agon-ls.js, so the three say the same thing about a move.
   fact(E, id, spec, m) → { k, ... }:
     b_step     k 'ok'   a step one ring inwards after which no enemy move captures anything of yours
                k 'trap' a step one ring inwards that the enemy's next move sandwiches (rp: that enemy move, the first one found)
                k 'side' a step along the same ring (not inwards)
     b_capture  k 'ok'   the move captures (c: how many)
                k 'touch' it lands next to an enemy piece but does not sandwich it: what lies beyond that piece is
                          end 'empty' (an empty cell — the cell the piece left counts as empty) / 'edge' (off the board) / 'enemy'
                          for every enemy piece it touches, or 'mixed' when they differ
                k 'none' no enemy piece next to where it lands
   hint(E, id, spec) → the cells of the pieces to look at (never the answer's piece alone, 追52): b_step every piece with a step
   inwards, b_capture every piece with a move next to an enemy piece.
   window.AgonLsFacts · module.exports the same. */
(function () {
  'use strict';
  const IDS = ['b_step', 'b_capture'];
  function fact(E, id, spec, m) {
    const p = E.Pos.from(spec), f = E.mFrom(m), t = E.mTo(m), me = p.side + 1;
    if (id === 'b_step') {
      if (E.RING[t] !== E.RING[f] - 1) return { k: 'side' };
      const q = p.clone().play(m), L = q.moves();
      const rp = L.find(r => q.capsOf(r).includes(t));
      if (rp != null) return { k: 'trap', rp };
      if (L.some(r => q.capsOf(r).length)) return { k: 'trapOther' };   // (another of your pieces left to be sandwiched: never in these lessons — the verify checks)
      return { k: 'ok' };
    }
    if (id === 'b_capture') {
      const c = p.capsOf(m).length;
      if (c) return { k: 'ok', c };
      const ends = new Set();
      for (let d = 0; d < 6; d++) {
        const a = E.NB[t][d]; if (a < 0 || p.owner(a) !== 3 - me) continue;
        const b = E.NB[a][d];
        ends.add(b < 0 ? 'edge' : b === f || !p.at(b) ? 'empty' : 'enemy');
      }
      if (ends.size) return { k: 'touch', end: ends.size === 1 ? [...ends][0] : 'mixed' };
      return { k: 'none' };
    }
    return { k: '' };
  }
  function hint(E, id, spec) {
    const p = E.Pos.from(spec), me = p.side + 1, out = new Set();
    for (const m of p.moves()) {
      if (m === E.PASS) continue; const f = E.mFrom(m), t = E.mTo(m);
      if (id === 'b_step' && E.RING[t] === E.RING[f] - 1) out.add(f);
      if (id === 'b_capture' && E.NB[t].some(a => a >= 0 && p.owner(a) === 3 - me)) out.add(f);
    }
    return [...out].sort((a, b) => a - b);
  }
  // the 2D's key for a move's words (agon/i18n-ag*.js ls.<id>.why / .ng / .ngSide / .ngTouch / …)
  function key(E, id, spec, m) {
    const F = fact(E, id, spec, m);
    if (F.k === 'ok') return 'why';
    if (id === 'b_step') return F.k === 'side' ? 'ngSide' : 'ng';
    if (id === 'b_capture') return F.k === 'touch' ? 'ngTouch' : 'ng';
    return 'ng';
  }
  const API = { IDS, fact, hint, key };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.AgonLsFacts = API;
})();

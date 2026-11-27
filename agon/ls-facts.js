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
     b_throne   k 'ok'   a step of the queen one ring inwards (onto the throne, or next to it) after which no enemy move captures
                         anything of yours (throne: true when the step lands on the throne)
                k 'trap' a step of the queen one ring inwards that the enemy's next move sandwiches (rp: that enemy move)
                k 'side' a step of the queen along the same ring (not inwards)
                k 'guard' a guard's move (only the queen may go onto the throne; a guard does not bring her nearer)
     b_reloc    (a relocation turn: one captured guard of yours to an empty edge cell)
                k 'ok'   after it no enemy move captures anything (block: true when it lands on the cell the enemy would step
                         into for its capture — the threats counted with the guard off the board)
                k 'trap' the enemy's next move sandwiches the relocated guard (rp: that enemy move)
                k 'open' the relocated guard is safe, but the enemy's next move sandwiches another piece of yours (rp, v: the
                         piece it takes)
   hint(E, id, spec) → the cells of the pieces to look at (never the answer's piece alone, 追52): b_step every piece with a step
   inwards, b_capture every piece with a move next to an enemy piece, b_throne the queen and every enemy piece next to a cell
   she can step inwards to, b_reloc the captured guard and every piece of yours the enemy could sandwich next (the guard off
   the board).
   window.AgonLsFacts · module.exports the same. */
(function () {
  'use strict';
  const IDS = ['b_step', 'b_capture', 'b_throne', 'b_reloc'];
  // b_reloc: the enemy's capturing moves with the captured guard off the board ([move, the pieces it takes])
  function threats(E, spec) {
    const r = E.Pos.from({ b: spec.b.replace(/[xyXY]/g, '.'), side: 3 - spec.side, n: spec.n });
    if (r.phase() !== 'move') return [];
    return r.moves().map(m => [m, r.capsOf(m)]).filter(x => x[1].length);
  }
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
    if (id === 'b_throne') {
      if (!p.isQueen(f)) return { k: 'guard' };
      if (E.RING[t] !== E.RING[f] - 1) return { k: 'side' };
      const q = p.clone().play(m), L = q.moves();
      const rp = L.find(r => q.capsOf(r).includes(t));
      if (rp != null) return { k: 'trap', rp };
      if (L.some(r => q.capsOf(r).length)) return { k: 'trapOther' };
      return { k: 'ok', throne: t === E.CENTER };
    }
    if (id === 'b_reloc') {
      const q = p.clone().play(m), L = q.moves();
      const rp = L.find(r => q.capsOf(r).includes(t));
      if (rp != null) return { k: 'trap', rp };
      const ro = L.find(r => q.capsOf(r).length);
      if (ro != null) return { k: 'open', rp: ro, v: q.capsOf(ro)[0] };
      return { k: 'ok', block: threats(E, spec).some(([r]) => E.mTo(r) === t) };
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
    if (id === 'b_throne') {
      const qn = p.queen(me); if (qn < 0) return [];
      out.add(qn);
      for (const m of p.moves()) { if (m === E.PASS || E.mFrom(m) !== qn) continue; const t = E.mTo(m); if (E.RING[t] !== E.RING[qn] - 1) continue; for (const a of E.NB[t]) if (a >= 0 && p.owner(a) === 3 - me) out.add(a); }
      return [...out].sort((a, b) => a - b);
    }
    if (id === 'b_reloc') {
      for (const i of p.pending(me)) out.add(i);
      for (const [, c] of threats(E, spec)) c.forEach(i => out.add(i));
      return [...out].sort((a, b) => a - b);
    }
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
    if (id === 'b_throne') return F.k === 'side' ? 'ngSide' : F.k === 'guard' ? 'ngGuard' : 'ng';
    if (id === 'b_reloc') return F.k === 'open' ? 'ngOpen' : 'ng';
    return 'ng';
  }
  const API = { IDS, fact, hint, key, threats };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.AgonLsFacts = API;
})();

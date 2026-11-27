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
     b_safe     (the enemy's next move would sandwich one guard of yours — the threat: threats() with the turn passed)
                k 'ok'   after it no enemy move captures anything (block: true when it lands on the cell the enemy would step
                         into for the capture, else it moved the guard in danger away)
                k 'trap' the enemy's next move sandwiches the piece just moved (rp: that enemy move)
                k 'left' the moved piece is safe, but the enemy's next move still sandwiches the guard in danger (rp, v: the
                         piece it takes)
     s_double   (2026-11-27 担当D) k 'ok'   the one move that sandwiches two enemy pieces at once (c: how many, v: the pieces)
                k 'one'  it captures one enemy piece only (v: that piece)
                k 'none' it captures nothing
     s_block    (the enemy queen on the throne, five enemy guards round her: the enemy's next move brings in the sixth)
                k 'ok'    the move captures (v: the piece — the incoming guard): the enemy's next turn is the relocation
                k 'touch' it lands next to an enemy piece without sandwiching it; nothing captured, the enemy completes the
                          ring (rp: that enemy move, gold)
                k 'none'  no enemy piece next to where it lands; nothing captured, the enemy completes the ring (rp)
     s_win2     (2026-11-27 担当D; the queen on the throne, two empty cells round it, two guards of yours one step outside)
                k 'ok'   after it, whatever the enemy plays, your next move completes the ring (cells: the last empty cell)
                k 'slow' still two empty cells round the throne after it: no next move of yours can win, whatever the enemy does
                k 'cap'  one empty cell left, but the enemy's next move sandwiches a piece of yours (rp: that move, v: the piece)
                         and the next turn goes to relocating it (cells: the last empty cell)
                (k 'block' / 'shut' / 'other' — the enemy steps into the last cell / closes it between two enemy pieces / any
                 other defence: never in this lesson, the verify checks)
   hint(E, id, spec) → the cells of the pieces to look at (never the answer's piece alone, 追52): b_step every piece with a step
   inwards, b_capture every piece with a move next to an enemy piece, b_throne the queen and every enemy piece next to a cell
   she can step inwards to, b_reloc the captured guard and every piece of yours the enemy could sandwich next (the guard off
   the board), b_safe the guard in danger, the enemy pieces that would sandwich it (the one stepping in and the one beyond)
   and every piece of yours that can step into the enemy's cell, s_double every piece of yours with a capturing move, s_block the enemy
   guard that can step into the last cell (its winning move, the turn passed) and every piece of yours with a move next to it, s_win2
   every guard of yours that can step into an empty cell round the throne and the enemy pieces that could sandwich one (the turn passed).
   window.AgonLsFacts · module.exports the same. */
(function () {
  'use strict';
  const IDS = ['b_step', 'b_capture', 'b_throne', 'b_reloc', 'b_safe', 's_double', 's_block', 's_win2'];
  // b_reloc: the enemy's capturing moves with the captured guard off the board ([move, the pieces it takes])
  // b_safe: the same with the turn passed to the enemy (nothing captured on the board)
  function threats(E, spec) {
    const r = E.Pos.from({ b: spec.b.replace(/[xyXY]/g, '.'), side: 3 - spec.side, n: spec.n });
    if (r.phase() !== 'move') return [];
    return r.moves().map(m => [m, r.capsOf(m)]).filter(x => x[1].length);
  }
  // s_block: the enemy's winning moves with the turn passed (the guard coming in to complete the ring)
  function wins(E, spec) {
    const r = E.Pos.from({ b: spec.b, side: 3 - spec.side, n: spec.n });
    if (r.phase() !== 'move') return [];
    return r.moves().filter(m => { const j = E.judge(r.clone().play(m)); return j.over && j.winner === r.side + 1; });
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
    if (id === 'b_safe') {
      const q = p.clone().play(m), L = q.moves();
      const rp = L.find(r => q.capsOf(r).includes(t));
      if (rp != null) return { k: 'trap', rp };
      const ro = L.find(r => q.capsOf(r).length);
      if (ro != null) return { k: 'left', rp: ro, v: q.capsOf(ro)[0] };
      return { k: 'ok', block: threats(E, spec).some(([r]) => E.mTo(r) === t) };
    }
    if (id === 's_double') {   // (担当D)
      const v = p.capsOf(m);
      return v.length >= 2 ? { k: 'ok', c: v.length, v } : v.length === 1 ? { k: 'one', v: v[0] } : { k: 'none' };
    }
    if (id === 's_block') {
      const v = p.capsOf(m);
      if (v.length) return { k: 'ok', v: v[0] };
      const q = p.clone().play(m);
      const rp = q.phase() === 'move' ? q.moves().find(r => { const j = E.judge(q.clone().play(r)); return j.over && j.winner === 3 - me; }) : undefined;
      return { k: E.NB[t].some(a => a >= 0 && p.owner(a) === 3 - me) ? 'touch' : 'none', rp };
    }
    if (id === 's_win2') {   // (担当D)
      const q = p.clone().play(m), J = E.judge(q);
      if (J.over) return { k: J.winner === me ? 'win' : 'lose' };
      const wins = r => r.phase() === 'move' && r.moves().some(x => { const j = E.judge(r.clone().play(x)); return j.over && j.winner === me; });
      const pass = q.clone(); pass.side ^= 1; pass.rehash();
      const fin = pass.phase() === 'move' ? pass.moves().filter(x => { const j = E.judge(pass.clone().play(x)); return j.over && j.winner === me; }) : [];
      if (!fin.length) return { k: 'slow' };
      const cells = [...new Set(fin.map(E.mTo))], PR = { block: 0, cap: 1, shut: 2, other: 3 };
      let best = null;
      for (const r of q.moves()) {
        const z = q.clone().play(r), j = E.judge(z);
        if (j.over ? j.winner === me : wins(z)) continue;
        const t = r === E.PASS ? -1 : E.mTo(r), caps = q.capsOf(r).filter(v => q.owner(v) === me);
        const F = caps.length ? { k: 'cap', rp: r, v: caps[0] } : cells.includes(t) ? { k: 'block', rp: r } : cells.every(c => z.trapped(c, me)) ? { k: 'shut', rp: r } : { k: 'other', rp: r };
        if (!best || PR[F.k] < PR[best.k]) best = F;
      }
      return Object.assign(best || { k: 'ok' }, { cells });
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
    if (id === 's_block') {
      const inc = new Set(wins(E, spec).map(E.mFrom));
      inc.forEach(i => out.add(i));
      for (const m of p.moves()) if (m !== E.PASS && E.NB[E.mTo(m)].some(a => inc.has(a))) out.add(E.mFrom(m));
      return [...out].sort((a, b) => a - b);
    }
    if (id === 'b_safe') {
      const T = threats(E, spec), cells = new Set(T.map(([r]) => E.mTo(r)));
      for (const [r, c] of T) { out.add(E.mFrom(r)); for (const v of c) { out.add(v); const b = E.NB[v][E.NB[E.mTo(r)].indexOf(v)]; if (b >= 0) out.add(b); } }
      for (const m of p.moves()) if (m !== E.PASS && cells.has(E.mTo(m))) out.add(E.mFrom(m));
      return [...out].sort((a, b) => a - b);
    }
    if (id === 's_win2') {   // the enemy pieces that could sandwich a guard of yours (the one stepping in and the one beyond)
      const r = p.clone(); r.side ^= 1; r.rehash();
      if (r.phase() === 'move') for (const x of r.moves()) for (const v of r.capsOf(x)) { out.add(E.mFrom(x)); const b = E.NB[v][E.NB[E.mTo(x)].indexOf(v)]; if (b >= 0) out.add(b); }
    }
    for (const m of p.moves()) {
      if (m === E.PASS) continue; const f = E.mFrom(m), t = E.mTo(m);
      if (id === 'b_step' && E.RING[t] === E.RING[f] - 1) out.add(f);
      if (id === 'b_capture' && E.NB[t].some(a => a >= 0 && p.owner(a) === 3 - me)) out.add(f);
      if (id === 's_double' && p.capsOf(m).length) out.add(f);
      if (id === 's_win2' && E.RING[t] === 1 && E.RING[f] === 2) out.add(f);
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
    if (id === 'b_safe') return F.k === 'left' ? 'ngLeft' : 'ng';
    if (id === 's_double') return F.k === 'one' ? 'ngOne' : 'ng';
    if (id === 's_block') return F.k === 'touch' ? 'ngTouch' : 'ng';
    if (id === 's_win2') return F.k === 'slow' ? 'ngSlow' : 'ng';
    return 'ng';
  }
  const API = { IDS, fact, hint, key, threats, wins };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.AgonLsFacts = API;
})();

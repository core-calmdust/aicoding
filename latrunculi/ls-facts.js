// (2026-11-27 担当C) Ludus latrunculorum lessons (lessons.json, Seneca rules): what each lesson asks, counted on the board with the
// engine's moves (E.effect), and what the 2D (app.js okAnswer / the hint) and the 3D say about a move. One file for both, so the words
// can only say what this file counts (checked by tools/lesson-verify-latrunculi-ls.js).
//  goal(id, pos)      → the moves that reach the lesson's goal (the problem's ok must be exactly these)
//  wrong(id, pos, m)  → { k, v, tail } for a move that does not: the i18n key, its values ({x} the move, {t} {y} {h} squares, {r} the
//                        opponent's reply) and an optional tail { k, v } (the opponent's enclosure after it)
//  marks(id, pos)     → the squares the hint lights (the counters to look at, never the answer's own counter)
//  touch(id, pos)     → the moves next to those squares (the moves the marks point to: 追52; b_corner within two steps)
(function (root) {
  'use strict';
  const CORN = new Set([0, 7, 56, 63]);
  const edge = x => !CORN.has(x) && ((x >> 3) % 7 === 0 || (x & 7) % 7 === 0);
  const nbrs = x => { const r = x >> 3, c = x & 7, o = []; if (r) o.push(x - 8); if (r < 7) o.push(x + 8); if (c) o.push(x - 1); if (c < 7) o.push(x + 1); return o; };
  function make(E) {
    const fx = (pos, m) => E.effect(pos, m), nm = i => E.sqName(i);
    // the opponent's replies after q that enclose a counter of `me` (first in move order, with the counter)
    function hitReply(q, me) {
      for (const r of q.moves()) { const e = fx(q, r); const y = e.blocks.find(i => q.sq[i] === me); if (y !== undefined) return { r, y, q }; }
      return null;
    }
    // my counters the opponent could enclose if it moved now
    function threatened(pos) {
      const me = pos.turn, q = pos.clone(); q.side ^= 1; q.last = [-1, -1]; const out = new Set();
      for (const r of q.movesAfter(-1, [])) for (const i of fx(q, r).blocks) if (q.sq[i] === me) out.add(i);
      return [...out].sort((a, b) => a - b);
    }
    // s_two: after m, does every reply leave an enemy counter face down for my next turn?
    function sure(pos, m) {
      const e = fx(pos, m); if (!e.blocks.length) return false;
      const q = pos.clone().play(m);
      return q.moves().every(r => q.clone().play(r).removable().length > 0);
    }
    function goal(id, pos) {
      const me = pos.turn, out = [];
      for (const m of pos.moves()) {
        const e = fx(pos, m); let g = false;
        if (id === 'b_block') g = e.blocks.length > 0;
        else if (id === 'b_edge') g = e.blocks.some(edge);
        else if (id === 'b_corner') g = e.blocks.some(x => CORN.has(x));
        else if (id === 'b_rescue') g = e.frees.some(x => pos.sq[x] === me);
        else if (id === 's_double') g = e.blocks.length >= 2;
        else if (id === 's_safe') g = !hitReply(pos.clone().play(m), me);
        else if (id === 's_two') g = sure(pos, m);
        if (g) out.push(m);
      }
      return out;
    }
    function wrong(id, pos, m) {
      const me = pos.turn, e = fx(pos, m), q = pos.clone().play(m), x = E.name(pos, m), hr = hitReply(q, me);
      const tail = hr ? { k: 'ls.ng.reply', v: { r: E.name(q, hr.r), y: nm(hr.y) } } : null;
      if (id === 'b_rescue') { const mine = []; for (let i = 0; i < 64; i++) if (pos.sq[i] === me && pos.inc[i]) mine.push(i); return { k: 'ls.b_rescue.ng', v: { x, y: nm(mine[0]) }, tail: null, still: mine.filter(i => q.sq[i] === me && q.inc[i]) }; }
      if (id === 's_safe') return { k: 'ls.s_safe.ng', v: { x, r: hr ? E.name(q, hr.r) : '', y: hr ? nm(hr.y) : '' }, tail: null, hr };
      if (id === 's_double' && e.blocks.length === 1) return { k: 'ls.s_double.ng1', v: { x, t: nm(e.blocks[0]) }, tail };
      if (id === 's_two' && e.blocks.length) {
        for (const r of q.moves()) {
          const q2 = q.clone().play(r); if (q2.removable().length) continue;
          const h = fx(q, r).blocks.find(i => q.sq[i] === me);
          return { k: 'ls.s_two.ng', v: { x, t: nm(e.blocks[0]), r: E.name(q, r), h: h === undefined ? '' : nm(h) }, tail: null, rr: r };
        }
        return { k: 'ls.s_two.ng', v: { x, t: nm(e.blocks[0]), r: '', h: '' }, tail: null };
      }
      if (id === 's_two') return { k: 'ls.s_two.ng0', v: { x }, tail };
      if (e.blocks.length) return { k: 'ls.ng.other', v: { x, t: nm(e.blocks[0]) }, tail };   // (b_edge / b_corner: an enclosure off the theme — the problems have none)
      return { k: 'ls.ng.none', v: { x }, tail };
    }
    function marks(id, pos) {
      const me = pos.turn, s = new Set();
      if (id === 'b_rescue') { for (let i = 0; i < 64; i++) if (pos.sq[i] === me && pos.inc[i]) for (const h of pos.holders(i)) s.add(h); }
      else if (id === 's_safe') for (const i of threatened(pos)) s.add(i);
      else if (id === 's_two') { for (const m of pos.moves()) for (const i of fx(pos, m).blocks) s.add(i); }
      else {   // the chances: enemy counters with one of mine beside them (b_edge along the edge, b_corner on a square next to the corner)
        const o = 3 - me, free = i => pos.sq[i] === me && !pos.inc[i];
        for (let i = 0; i < 64; i++) {
          if (pos.sq[i] !== o || pos.inc[i]) continue;
          if (id === 'b_corner') { if (CORN.has(i) && E.CADJ[E.CORNER[i]].some(free)) s.add(i); continue; }
          if (id === 'b_edge') { if (edge(i) && nbrs(i).filter(j => edge(j) || CORN.has(j)).some(free)) s.add(i); continue; }
          if (nbrs(i).some(free)) s.add(i);
        }
      }
      return [...s].sort((a, b) => a - b);
    }
    function touch(id, pos) {
      // (b_corner: a corner has only two squares beside it, and a counter landing on the free one always encloses — so "near" is the
      // corner's area, the squares within two steps of it)
      const M = new Set(marks(id, pos)), near = new Set(); for (const i of M) for (const j of nbrs(i)) { near.add(j); if (id === 'b_corner') for (const k of nbrs(j)) near.add(k); }
      return pos.moves().filter(m => near.has(E.mTo(m)) || M.has(E.mFrom(m)));
    }
    return { goal, wrong, marks, touch, threatened, hitReply, edge, CORN };
  }
  const API = { make };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') root.LatrLsFacts = make(window.LatrEngine);
})(typeof window !== 'undefined' ? window : this);

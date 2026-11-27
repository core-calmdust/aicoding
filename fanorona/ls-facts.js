/* Fanorona — the facts of the board behind the basics lessons' answers (2026-11-27 担当E).
   The 2D (fanorona/app.js okAnswer / the hint), the 3D (atlas/ls-fanorona.js, チェッカニ's words) and the check
   (tools/lesson-verify-fanorona-ls.js) read a move through these functions, so the words say what happens on the board.
   FanoronaLsFacts.fact(E, id, spec, m) → { k, c, a, kind, ... } for b_approach · b_withdraw · b_choose:
     k 'most'  the move that takes the most ({ c } = { a } pieces in one line)
       'fewer' another move: { c } pieces, { end } what ends its line — 'edge' the board's edge · 'mine' your own piece · 'empty'
               an empty point (the line of the opponent's pieces stops there)
       'same'  (b_choose) the answer's own step with the other line: { c } pieces by { kind }, { a } by the answer's { akind }
     a  the pieces the answer takes · kind / akind 'A' approach / 'W' withdrawal · both (b_choose) the step takes both ways
   b_chain (2026-11-27 担当E): { k, c, a, sc, sa, same }
     k 'most'  the answer: { a } pieces in { sa } captures in a row
       'stop'  the move stops on the answer's own road (a part of it): { c } pieces in { sc } captures, the piece could go on
       'stopx' the move stops off the answer's road while its piece could still capture
       'dead'  the move goes to its end (no capture left for the piece): { c } pieces in { sc } captures
     same  the move's piece is the answer's piece
   b_safe (2026-11-27 担当E, no capture for either side; a paika move that gives the opponent nothing to take): { k, c, self, safe }
     k 'most'  the safe move (after it the opponent has no capture; the only one)
       'self'  after the move the opponent's biggest capture { c } takes the piece you moved
       'open'  it takes other pieces of yours, through the point the moved piece left (the opponent steps onto it)
       'other' (never in a lesson: tools/lesson-verify-fanorona-ls.js rejects it) neither
     c  the most the opponent can then take in one turn (a chain counted in full)
   FanoronaLsFacts.best(E, spec) → the move that takes the most (null when two moves take as many)
   FanoronaLsFacts.hint(E, id, spec) → the points of the pieces that can capture now (never the answer's piece alone)
   Moves are the engine's notation (h2-h3A), points its indices r * 9 + c. Works as a plain script and in Node. */
(function () {
  'use strict';
  const capN = (E, pos, m) => { const S = pos.steps(m); return S ? S.reduce((a, s) => a + s.cap.length, 0) : -1; };
  function best(E, spec) {
    const pos = E.Pos.from(spec), L = pos.moves(true);
    let mx = -1, b = null, n = 0;
    for (const m of L) { const c = capN(E, pos, m); if (c > mx) { mx = c; b = m; n = 1; } else if (c === mx) n++; }
    return n === 1 ? b : null;
  }
  // what ends the captured line of a single step s (the point after the last piece taken, in the line's direction)
  function endOf(E, pos, s) {
    const dd = s.kind === 'A' ? s.d : s.d ^ 4, last = s.cap[s.cap.length - 1], nx = E.NB[dd][last];
    if (nx < 0) return 'edge';
    const o = pos.at(nx); return o === pos.turn ? 'mine' : o ? 'opp' : 'empty';
  }
  const eqS = (x, y) => x.from === y.from && x.to === y.to && x.kind === y.kind;
  function chainFact(E, spec, m) {
    const pos = E.Pos.from(spec), b = best(E, spec), S = pos.steps(m);
    if (!S || !b) return { k: 'bad' };
    const B = pos.steps(b), sum = X => X.reduce((n, x) => n + x.cap.length, 0);
    const f = { c: sum(S), a: sum(B), sc: S.length, sa: B.length, same: S[0].from === B[0].from, from: S[0].from };
    if (m === b) return Object.assign(f, { k: 'most' });
    let st = null; for (const x of S) st = E.Pos.after(pos, st, x);   // the chain state after the move: can its piece capture again?
    const more = pos.capSteps(st).length > 0, onRoad = S.length < B.length && S.every((x, i) => eqS(x, B[i]));
    return Object.assign(f, { k: onRoad ? 'stop' : more ? 'stopx' : 'dead' });
  }
  // b_safe: the opponent's biggest capture after the paika move m (every full turn counted, the biggest first; the piece moved taken
  // in any biggest one → 'self'; else the biggest goes through the point the piece left → 'open')
  function oppMost(E, pos, m) {
    const q = pos.clone().play(m); if (!q.hasCaps()) return { c: 0, S: [] };
    let c = 0, S = [];
    for (const x of q.moves(true)) { const st = q.steps(x), n = st.reduce((a, y) => a + y.cap.length, 0); if (n > c) { c = n; S = [st]; } else if (n === c) S.push(st); }
    return { c, S };
  }
  function safeBest(E, spec) {
    const pos = E.Pos.from(spec); if (pos.hasCaps()) return null;
    const L = pos.moves(true).filter(m => oppMost(E, pos, m).c === 0); return L.length === 1 ? L[0] : null;
  }
  function safeFact(E, spec, m) {
    const pos = E.Pos.from(spec), S = pos.steps(m), b = safeBest(E, spec);
    if (!S || !b || S[0].cap.length) return { k: 'bad' };
    const o = oppMost(E, pos, m), from = S[0].from, to = S[0].to, f = { c: o.c, from, to, safe: b };
    if (m === b) return Object.assign(f, { k: 'most', self: false });
    const self = o.S.some(st => st.some(y => y.cap.includes(to)));
    const open = !self && o.S.some(st => st.some(y => y.to === from));
    return Object.assign(f, { k: self ? 'self' : open ? 'open' : 'other', self });
  }
  function fact(E, id, spec, m) {
    if (id === 'b_chain') return chainFact(E, spec, m);
    if (id === 'b_safe') return safeFact(E, spec, m);
    const pos = E.Pos.from(spec), b = best(E, spec), S = pos.steps(m);
    if (!S || !b) return { k: 'bad' };
    const B = pos.steps(b)[0], s = S[0], c = S.reduce((a, x) => a + x.cap.length, 0), a = B.cap.length;
    const both = pos.capSteps(null).filter(x => x.from === s.from && x.to === s.to).length > 1;
    const f = { c, a, kind: s.kind, akind: B.kind, both, from: s.from, to: s.to, end: endOf(E, pos, s) };
    if (m === b) return Object.assign(f, { k: 'most' });
    if (s.from === B.from && s.to === B.to) return Object.assign(f, { k: 'same' });
    return Object.assign(f, { k: 'fewer' });
  }
  function hint(E, id, spec) {
    const pos = E.Pos.from(spec);
    if (id === 'b_safe') return [...new Set(pos.paikaSteps().map(x => x.from))];   // (every piece you can move: never the answer's alone, 追52)
    return [...new Set(pos.capSteps(null).map(x => x.from))];
  }
  const API = { fact, best, hint, endOf, capN, chainFact, safeFact, safeBest, oppMost };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.FanoronaLsFacts = API;
})();

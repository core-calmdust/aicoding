/* Fanorona — the facts of the board behind the basics lessons' answers (2026-11-27 担当E).
   The 2D (fanorona/app.js okAnswer / the hint), the 3D (atlas/ls-fanorona.js, チェッカニ's words) and the check
   (tools/lesson-verify-fanorona-ls.js) read a move through these functions, so the words say what happens on the board.
   FanoronaLsFacts.fact(E, id, spec, m) → { k, c, a, kind, ... } for b_approach · b_withdraw · b_choose:
     k 'most'  the move that takes the most ({ c } = { a } pieces in one line)
       'fewer' another move: { c } pieces, { end } what ends its line — 'edge' the board's edge · 'mine' your own piece · 'empty'
               an empty point (the line of the opponent's pieces stops there)
       'same'  (b_choose) the answer's own step with the other line: { c } pieces by { kind }, { a } by the answer's { akind }
     a  the pieces the answer takes · kind / akind 'A' approach / 'W' withdrawal · both (b_choose) the step takes both ways
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
  function fact(E, id, spec, m) {
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
    const pos = E.Pos.from(spec); return [...new Set(pos.capSteps(null).map(x => x.from))];
  }
  const API = { fact, best, hint, endOf, capN };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.FanoronaLsFacts = API;
})();

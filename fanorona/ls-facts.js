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
   b_win (2026-11-27 担当E, the move that takes every piece the opponent has left): { k, c, a, r, sc, sa, same }
     k 'most'  the answer: all { a } of the opponent's pieces in { sa } captures (the game is won)
       'stop' / 'stopx' / 'dead'  as b_chain: { c } taken in { sc } captures, { r } = a − c of the opponent's pieces left
     same  the move's piece is the answer's piece
   t_big (2026-11-27 担当E, the biggest total where the biggest first capture is a trap): { k, c, a, sc, sa, same, c1, a1, more }
     as b_chain, and c1 / a1 the pieces the move's / the answer's first capture takes;
     k 'greedy' a wrong move whose first capture takes more than the answer's first (c1 > a1) but less in total; more: its piece
               could still go on where it stopped
   t_count (2026-11-27 担当E, count the recapture: taken − taken back): { k, c, r, a, ar, an, same }
     c  the pieces the move takes (the chain in full) · r  the most the opponent then takes back in one turn (oppMost)
     a / ar / an  the answer's taken / taken back / a − ar (the one move whose c − r is the biggest: countBest)
     k 'most' the answer · 'greedy' a wrong move taking more than the answer (c > a) and more taken back ·
       'back' taking no more than the answer and something taken back (r > 0) · 'small' nothing taken back but fewer taken (c < an)
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
  // b_win: the one move after which the opponent has no piece left (null when none or two)
  function winBest(E, spec) {
    const pos = E.Pos.from(spec), opp = 3 - pos.turn, L = pos.moves(true).filter(m => pos.clone().play(m).count(opp) === 0);
    return L.length === 1 ? L[0] : null;
  }
  function winFact(E, spec, m) {
    const pos = E.Pos.from(spec), b = winBest(E, spec), S = pos.steps(m);
    if (!S || !b) return { k: 'bad' };
    const B = pos.steps(b), sum = X => X.reduce((n, x) => n + x.cap.length, 0), a = pos.count(3 - pos.turn), c = sum(S);
    const f = { c, a, r: a - c, sc: S.length, sa: B.length, same: S[0].from === B[0].from, from: S[0].from };
    if (m === b) return Object.assign(f, { k: 'most' });
    let st = null; for (const x of S) st = E.Pos.after(pos, st, x);
    const more = pos.capSteps(st).length > 0, onRoad = S.length < B.length && S.every((x, i) => eqS(x, B[i]));
    return Object.assign(f, { k: onRoad ? 'stop' : more ? 'stopx' : 'dead' });
  }
  // t_big: b_chain's facts and the first captures (a wrong move that takes more first and less in all is 'greedy')
  function bigFact(E, spec, m) {
    const f = chainFact(E, spec, m); if (f.k === 'bad') return f;
    const pos = E.Pos.from(spec), S = pos.steps(m), B = pos.steps(best(E, spec));
    f.c1 = S[0].cap.length; f.a1 = B[0].cap.length; f.more = f.k === 'stop' || f.k === 'stopx';
    if (f.k !== 'most' && f.c1 > f.a1) f.k = 'greedy';
    return f;
  }
  // t_count: the one capture whose taken − taken back (the opponent's biggest reply) is the biggest (null when two are)
  function countNet(E, pos, m) { const c = capN(E, pos, m), r = oppMost(E, pos, m).c; return { c, r, n: c - r }; }
  function countBest(E, spec) {
    const pos = E.Pos.from(spec); if (!pos.hasCaps()) return null;
    let mx = -1e9, b = null, k = 0;
    for (const m of pos.moves(true)) { const o = countNet(E, pos, m); if (o.n > mx) { mx = o.n; b = m; k = 1; } else if (o.n === mx) k++; }
    return k === 1 ? b : null;
  }
  function countFact(E, spec, m) {
    const pos = E.Pos.from(spec), b = countBest(E, spec), S = pos.steps(m);
    if (!S || !b || !S[0].cap.length) return { k: 'bad' };
    const o = countNet(E, pos, m), B = countNet(E, pos, b);
    const f = { c: o.c, r: o.r, a: B.c, ar: B.r, an: B.n, same: S[0].from === pos.steps(b)[0].from, from: S[0].from };
    return Object.assign(f, { k: m === b ? 'most' : o.c > B.c ? 'greedy' : o.r > 0 ? 'back' : 'small' });
  }
  function fact(E, id, spec, m) {
    if (id === 't_count') return countFact(E, spec, m);
    if (id === 'b_chain') return chainFact(E, spec, m);
    if (id === 't_big') return bigFact(E, spec, m);
    if (id === 'b_win') return winFact(E, spec, m);
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
  const API = { fact, best, hint, endOf, capN, chainFact, bigFact, safeFact, safeBest, oppMost, winFact, winBest, countBest, countFact, countNet };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.FanoronaLsFacts = API;
})();

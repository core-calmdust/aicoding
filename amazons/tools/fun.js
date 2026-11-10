// "Fun" score of an Amazons puzzle (0–100; the common rule claude/puzzle-fun-score.md: adopt 70 and above, mine 3× the need)
// A puzzle must be exact (the answers come from the rules: engine.js duelGood / trapGood / endGood) AND worth solving:
//   unique  (30)  few right first moves among many: 1 → 1, 2 → .85, 3 → .7, 4–5 → .5, 6–8 → .3, more → .1
//   key     (20)  the right move is not the greedy one. Greedy = the move that closes most around the target right away (duel:
//                 all the defender's amazons, trap: the marked one) / that keeps the most room for the mover's own amazon (end).
//                 No right move among the 3 greediest → 1; the greediest is right → .15
//   tries   (15)  tempting wrong moves: among the 8 greediest, how many fail (6+ → 1)
//   depth   (15)  duel / trap: moves to find (2 → .55, 3 → 1); read: your moves to the end (2 → .25 … 5 → 1); end: the rooms' size and shape (dead ends) to count
//   defence (10)  duel / trap: the defender's real choices after the key (replies that do not lose at once): 3+ → 1; end: the
//                 number of amazons that matter (2+ of yours → 1)
//   natural (10)  a game-like board: 15–55 arrows, every side with 2+ amazons, nobody already boxed in
// usage: const { funScore } = require('./fun.js'); funScore(P, kind) → { fun, parts, good, all }
//        node tools/fun.js   → the score of every puzzle in ../puzzles.json
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '..', 'engine.js'));
const { Pos, NB, P1, P2 } = E;
const clamp = x => Math.max(0, Math.min(1, x));
const W = { unique: 30, key: 20, tries: 15, depth: 15, defence: 10, natural: 10 };
const amz = (pos, p) => { const o = []; for (let k = 0; k < 8; k++) { const f = pos.q[k]; if (f >= 0 && pos.sq[f] === p) o.push(f); } return o; };

function funScore(P, kind) {
  const pos = Pos.from(P.s), me = pos.turn, op = 3 - me, all = pos.moves();
  let good;
  if (kind === 'duel') good = E.duelGood(P.s, [], P.n, 6e6);
  else if (kind === 'trap') good = E.trapGood(P.s, [], P.e, P.n, 6e6);
  else if (kind === 'read') good = E.readGood(P.s, [], 8e6);
  else good = E.endGood(P.s, []);
  if (!good || !good.length) return { fun: 0, parts: {}, good: good ? 0 : -1, all: all.length };
  const G = new Set(good), parts = {};
  const g = good.length;
  parts.unique = g === 1 ? 1 : g === 2 ? .85 : g === 3 ? .7 : g <= 5 ? .5 : g <= 8 ? .3 : .1;
  // greedy order
  const k = kind === 'trap' ? E.trapIdx(P.s, P.e) : -1;
  const greed = m => {
    pos.play(m);
    let v;
    if (kind === 'duel') v = -E.emptyAround(pos, op).length;
    else if (kind === 'read') v = pos.mobility(me) - 2 * pos.mobility(op);
    else if (kind === 'trap') v = -E.freeAt(pos, k);
    else { const t = (m / 128 | 0) % 128, R = E.roomOf(pos, t); v = R ? R.length : 0; }   // end: the bigger room kept
    pos.unplay(m); return v;
  };
  const sc = all.map(m => [m, greed(m) + Math.random() * 1e-3]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const top3 = sc.slice(0, 3);
  parts.key = G.has(sc[0]) ? .15 : top3.some(m => G.has(m)) ? .5 : 1;
  parts.tries = clamp(sc.slice(0, 8).filter(m => !G.has(m)).length / 6);
  if (kind === 'end') {
    // rooms: size and the dead ends in them (squares with one neighbour in the room)
    let size = 0, ends = 0;
    for (const f of amz(pos, me).concat(amz(pos, op))) { const R = E.roomOf(pos, f); if (!R) continue; size += R.length; const S = new Set(R); for (const x of R) if (NB[x].filter(t => S.has(t)).length <= 1) ends++; }
    parts.depth = clamp(size / 34) * .6 + clamp(ends / 5) * .4;
    parts.defence = clamp((amz(pos, me).length - 1) / 1);
  } else {
    parts.depth = kind === 'read' ? clamp((P.n - 1) / 4) : P.n >= 3 ? 1 : P.n === 2 ? .55 : .2;
    // the defender's real choices after the first right move
    const key = good[0]; pos.play(key);
    let real = 0; const R = pos.moves();
    for (const r of R) { pos.play(r); const n = kind === 'trap' ? E.freeAt(pos, k) : kind === 'read' ? pos.mobility(pos.turn === P1 ? P2 : P1) : E.emptyAround(pos, pos.turn === P1 ? P2 : P1).length; pos.unplay(r); if (n > 0) real++; }
    pos.unplay(key);
    parts.defence = clamp(real / 3);
  }
  let arrows = 0; for (let i = 0; i < 100; i++) if (pos.sq[i] === 3) arrows++;
  const nm = amz(pos, me).length, no = amz(pos, op).length;
  parts.natural = (arrows >= 15 && arrows <= 55 ? .5 : .2) + (nm >= 2 && no >= 2 ? .3 : nm + no >= 3 ? .15 : 0) + (pos.canMove(op) ? .2 : 0);
  let fun = 0; for (const p in W) fun += W[p] * (parts[p] || 0);
  return { fun: Math.round(fun), parts, good: g, all: all.length };
}
module.exports = { funScore };
if (require.main === module) {
  const D = JSON.parse(require('fs').readFileSync(path.join(__dirname, '..', 'puzzles.json'), 'utf8'));
  for (const T of D.themes) {
    const f = T.puzzles.map(P => funScore(P, T.kind).fun);
    console.log(T.id, 'n', f.length, 'avg', (f.reduce((a, b) => a + b, 0) / f.length).toFixed(1), 'min', Math.min(...f), '≥70:', f.filter(x => x >= 70).length);
  }
}

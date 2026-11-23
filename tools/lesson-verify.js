#!/usr/bin/env node
// Extra problem checks for the lesson loop phase 2 (claude/lesson-quality.md), beyond what tools/lesson-facts.js connect4() already
// enforces inline (①answer=best ②unique ③≥3 legal ⑤no near-duplicate ⑥ramp ⑦words-vs-board). Here are the move-specific facts the
// generic framework cannot express, so a count / endwin problem truly teaches its theme:
//   count  ⑧ the answer neither connects four nor blocks one now, and after it the mover still owns a winning cell up in the air
//            (the zugzwang the lesson is about — not a tactical shot).
//   endwin ⑦ after the answer every legal reply of the opponent loses with best play (the "give the opponent no counter" the words
//            promise), i.e. the win is truly forced and quickest.
// node tools/lesson-verify.js [connect4,mancala]
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
function connect4() {
  const E = require(path.join(ROOT, 'connect4/engine.js')), U = require(path.join(ROOT, 'connect4/tools/c4util.js'));
  const L = require(path.join(ROOT, 'connect4/lessons.json'));
  const out = [];
  const add = (id, j, m) => out.push({ step: id, q: j + 1, msg: m });
  for (const st of L.steps) {
    if (st.id === 'count') st.problems.forEach((P, j) => {
      const g = U.grid(P.moves), me = P.moves.length % 2 ? 2 : 1, op = 3 - me, a = P.answer[0], A = U.play(g, a, me);
      if (U.immWins(g, me).length) add('count', j, `⑧ the mover can connect four now (${U.immWins(g, me)}) — not a counting problem`);
      if (U.immWins(g, op).length) add('count', j, `⑧ a block is needed now (${U.immWins(g, op)}) — not a counting problem`);
      if (!U.threats(A, me).some(t => !t.playable)) add('count', j, '⑧ after the answer the mover owns no winning cell in the air');
    });
    if (st.id === 'endwin') st.problems.forEach((P, j) => {
      const g = U.grid(P.moves), me = P.moves.length % 2 ? 2 : 1, a = P.answer[0], mv2 = P.moves + (a + 1);
      if (U.isWinAfter(g, a, me)) return;                       // the answer itself connects four — nothing to force
      const g2 = U.grid(mv2);
      for (const r of U.legal(g2)) { E.loadMoves(mv2); const v = E.solveMove(r, false); if (!(v < 0)) add('endwin', j, `⑦ after the answer the reply ${r} does not lose (${v}) — the win is not forced`); }
    });
  }
  return out;
}

// mancala (2026-11-23 第2期)：the lessons in MC_DONE (claude/lesson-quality.md 「検証の進み具合」), every problem, with the engine
// (mancala/engine.js analyze with a cleared table: depth 18 (② also at 16), or the exact solve for the problems stored as exact —
// deterministic, no clock):
//   ① the gold pit (P.best) is the engine's best and the stored top; every stored value within 3 seeds of the engine (exact ones equal)
//   ② the next best pit is at least 2 seeds worse (engine and stored)   ③ at least 3 legal pits
//   ④⑧ the answer does what the lesson (and the 2D ls.<id>.why) says: sow = the only pit whose last seed lands on the target;
//      extra = ends in the store; capture = captures; defend = the opponent has a capture now and none after the answer;
//      chain = the longest chain of extra turns (≥2, strictly longer than any other first pit); endgame = solved exactly
//   ⑤ no other board of the game (every lesson problem / warm-up, puzzles.json) within 6 seeds, or within 2 seeds of a board
//      reached from it in 1–2 sowings (either side)
//   ⑥ no easier than the problem before: d = the other pits within 6 seeds of the best + (the greedy haul picks another pit ? 1 : 0)
//      never goes down, and the last is harder than the first (sow: d = the answer's seeds + 2 when the target is past the store)
//   ⑦ a wrong pit: what the 3D words say it does is read from the engine's own sowing (atlas/lessons3d.js mcF; lesson-facts.js mancala)
const MC_DONE = new Set(['sow', 'extra', 'capture', 'defend', 'chain', 'endgame']);
function mancala(opt) {
  const E = require(path.join(ROOT, 'mancala/engine.js')), L = require(path.join(ROOT, 'mancala/lessons.json')), PZ = require(path.join(ROOT, 'mancala/puzzles.json'));
  const out = [], pend = [], only = opt && opt.only;
  const pool = []; L.steps.forEach(st => { st.problems.forEach((P, j) => pool.push([`${st.id} q${j + 1}`, P.b, st.rules || L.rules || 'kalah']));
    (st.ramp || []).forEach((r, j) => pool.push([`${st.id} warm-up ${j + 1}`, r.b])); });
  PZ.cats.forEach(c => c.themes.forEach(t => t.puzzles.forEach((p, j) => pool.push([`puzzle ${c.id}/${t.id} #${j + 1}`, p.b]))));
  const l1 = (a, b) => a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0);
  const dist = (from, to) => { let c = 0, x = from; while (x !== to && c < 30) { x = x === 13 ? 0 : x + 1; if (x !== 13) c++; } return c; };
  L.steps.forEach(st => { const id = st.id, R = st.rules || L.rules || 'kalah', RR = E.RULES[R] || E.RULES.kalah, done = MC_DONE.has(id);
    if (only && !only.has(id)) return;
    if (!done) { pend.push(...st.problems.map((P, j) => `${id} q${j + 1}`)); return; }   // (not yet verified: counted, checked once a loop run adds the lesson to MC_DONE)
    const tr = (b, s, k) => E.trace(Int8Array.from(b), s, k, R), lg = (b, s) => E.legal(Int8Array.from(b), s, RR);
    const succ = b => { const o = []; for (const s of [0, 1]) for (const k of lg(b, s)) o.push(Array.from(tr(b, s, k).board)); return o; };
    const chain = (b, k) => { const t = tr(b, 0, k); if (!t.extra || t.over) return 0; let m = 0; for (const q of lg(t.board, 0)) m = Math.max(m, chain(Array.from(t.board), q)); return 1 + m; };
    const caps = b => lg(b, 1).filter(k => tr(b, 1, k).cap > 0);
    let prevD = -1, firstD = null;
    st.problems.forEach((P, j) => { const add = m => out.push({ step: id, q: j + 1, msg: m }), b = P.b, L0 = lg(b, 0);
      if (L0.length < 3) add(`③ only ${L0.length} legal pits`);
      let d;
      if (id === 'sow') {
        const hit = L0.filter(k => tr(b, 0, k).land === P.target);
        if (hit.length !== 1 || hit[0] !== P.best) add(`①② the pits landing on the target are ${hit}, the gold pit ${P.best}`);
        d = b[P.best] + (P.target > 6 ? 2 : 0);
      } else {
        const an = D => { E.ttClear(); const r = E.analyze(b, 0, R, 1e9, D); r.V = r.list.slice().sort((x, y) => y.v - x.v); return r; };
        const s = an(P.exact ? 90 : 18), s16 = P.exact ? s : an(16), V = s.V, top = V[0].v;
        if (P.exact && !s.exact) add('① stored as exact, the engine does not solve it');
        if (V[0].m !== P.best || V.some(x => x.m !== P.best && x.v >= top - 1e-9)) add(`① the engine's best is ${V.filter(x => x.v >= top - 1e-9).map(x => x.m)}, the gold pit ${P.best}`);
        for (const r of [s, s16]) { const sec = r.V.find(x => x.m !== P.best), t = r.V[0].v; if (sec && t - sec.v < 2 - 1e-9) { add(`② pit ${sec.m} is only ${(t - sec.v).toFixed(1)} seeds worse (engine depth ${r.depth})`); break; } }
        const st2 = P.sc.filter((v, k) => v !== null && k !== P.best); if (st2.length && P.sc[P.best] - Math.max(...st2) < 2 - 1e-9) add('② the stored values are within 2 seeds');
        for (const x of s.list) { const e = Math.abs(P.sc[x.m] - x.v); if (P.exact ? e > 1e-9 : e > 3) add(`① pit ${x.m}: stored ${P.sc[x.m]}, engine ${x.v.toFixed(1)}`); }
        const T = tr(b, 0, P.best);
        if (id === 'extra' && !T.extra) add('④ the gold pit does not end in the store');
        if (id === 'capture' && !(T.cap > 0)) add('④ the gold pit does not capture');
        if (id === 'defend' && !(caps(b).length && !T.extra && !caps(Array.from(T.board)).length)) add('④ the gold pit does not take away the opponent\'s capture');
        if (id === 'chain') { const c = chain(b, P.best); if (c < 2 || L0.some(k => k !== P.best && chain(b, k) >= c)) add(`④ the gold pit's chain ${c} is not the only longest`); }
        if (id === 'endgame' && !(P.exact && s.exact)) add('④ an endgame problem not solved exactly');
        const g = E.turnMaxFirst(Int8Array.from(b), 0, R), gm = Math.max(...g.filter(x => x !== null));
        d = V.filter(x => x.m !== P.best && x.v >= top - 6).length + (g[P.best] === gm ? 0 : 1);
      }
      if (d < prevD) add(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d); if (firstD === null) firstD = d;
      if (j === st.problems.length - 1 && !(d > firstD)) add(`⑥ the last problem is no harder than the first (d ${d} vs ${firstD})`);
      const me = `${id} q${j + 1}`, S1 = succ(b), S2 = [].concat(...S1.map(succ));
      for (const [who, y] of pool) { if (who === me) continue;
        const e = l1(b, y); if (e <= 6) { add(`⑤ ${e} seeds from ${who}`); continue; }
        if (S1.some(z => l1(z, y) <= 2) || S2.some(z => l1(z, y) <= 2)) add(`⑤ 1–2 sowings from ${who}`); }
    }); });
  if (pend.length && opt && opt.pending) console.log(`mancala: ${pend.length} pending (not yet verified lessons)`);
  return out;
}
const GAMES = { connect4, mancala };
module.exports = GAMES;
if (require.main === module) {
  const a = process.argv.slice(2), games = (a.find(x => !x.startsWith('-')) || 'connect4,mancala').split(',');
  let bad = 0;
  for (const g of games) { const f = GAMES[g](); if (!f.length) { console.log(`OK ${g}` + (g === 'connect4' ? ' (count/endwin の⑦⑧)' : ` (${[...MC_DONE].join('・')} の①〜⑧)`)); continue; }
    bad += f.length; f.forEach(x => console.log(`NG ${g} ${x.step} q${x.q}: ${x.msg}`)); }
  process.exit(bad ? 1 : 0);
}

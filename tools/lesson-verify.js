#!/usr/bin/env node
// Extra problem checks for the lesson loop phase 2 (claude/lesson-quality.md), beyond what tools/lesson-facts.js connect4() already
// enforces inline (①answer=best ②unique ③≥3 legal ⑤no near-duplicate ⑥ramp ⑦words-vs-board). Here are the move-specific facts the
// generic framework cannot express, so a count / endwin problem truly teaches its theme:
//   count  ⑧ the answer neither connects four nor blocks one now, and after it the mover still owns a winning cell up in the air
//            (the zugzwang the lesson is about — not a tactical shot).
//   endwin ⑦ after the answer every legal reply of the opponent loses with best play (the "give the opponent no counter" the words
//            promise), i.e. the win is truly forced and quickest.
// node tools/lesson-verify.js [connect4,mancala,gomoku]
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
// gomoku (2026-11-23 第2期)：the lessons in GM_DONE (claude/lesson-quality.md 「検証の進み具合」), every problem, free rule, with an exact
// short-win search (gmWin below: "the side to move makes five within k of its own moves against every defence", k ≤ 3, every legal
// reply searched) and the engine's four-after-four solver (Solver.vcf) for longer wins:
//   ① the answer set equals the set of moves that reach the lesson's goal: five = every five point; block = the opponent's one five point
//      (and the mover has no five of its own); three = every move after which the opponent wins neither within 3 moves nor by fours
//      (and the mover has no win of its own); sfour / fourthree = the moves that win fastest (level 2 / level 3)
//   ② = ① (no other move as good)   ③ at least 3 legal moves   ④ sfour: every answer an open four, fourthree: every answer a four-three,
//      three: the opponent has an open-four point now (a live three)
//   ⑤ no other position of the game (every lesson problem / warm-up, puzzles.json with its old versions) within 3 stones, under the 8
//      symmetries and any shift of the board
//   ⑥ d = the other tempting points (the mover's three / four points, the opponent's four points, the answers left out) never goes down
//      and the last is above the first
//   ⑦⑧ what the 3D words (atlas/lessons3d.js gmLsJa) say holds: block — after the answer the opponent has no win within 3 nor by fours
//      (「これで負けの心配は消えた」); sfour — no other move wins within 3 (「止められたら終わり」 of a closed four / three); three and
//      fourthree — every other move loses / does not win (= ①); five — a four elsewhere is called 「四まで」 only (no claim it is stopped)
const GM_DONE = new Set(['five', 'block', 'three', 'sfour', 'fourthree']);
function gmWin(E) {
  const C = E.C;
  function win(pos, k) { const X = pos.side, Y = 3 - X;
    if (pos.fives(X).length) return true; if (k < 2) return false;
    const fy = pos.fives(Y); if (fy.length >= 2) return false;
    const thr = k >= 3 ? C.F3 : C.B4; let cands;
    if (fy.length) cands = fy.map(i => E.I2M[i]); else { cands = []; for (let m = 0; m < 225; m++) { const i = E.M2I[m]; if (pos.b[i] === 0 && pos.cls[X][i] >= thr) cands.push(m); } }
    for (const m of cands) if (pos.isLegal(m) && after(pos, m, k)) return true;
    return false; }
  // X (to move) plays m: does X then win within k of its moves (m the first)? (k = 3 with no four made: every legal reply is tried)
  function after(pos, m, k) { const X = pos.side; pos.make(m); let ok;
    const fx = pos.fives(X), fy = pos.fives(3 - X);
    if (fy.length) ok = false; else if (fx.length >= 2) ok = k >= 2;
    else if (!fx.length && k < 3) ok = false;
    else { const reps = fx.length ? [E.I2M[fx[0]]] : pos.legal(); ok = true;
      for (const r of reps) { if (!pos.isLegal(r)) continue; pos.make(r); const w = win(pos, k - 1); pos.unmake(); if (!w) { ok = false; break; } } }
    pos.unmake(); return ok; }
  const level = (pos, m) => { if (pos.cls[pos.side][E.M2I[m]] === C.FIVE) return 1; for (let k = 2; k <= 3; k++) if (after(pos, m, k)) return k; return 0; };
  const vcf = pos => { const S = new E.Solver(); S.limit = 2e6; return S.vcf(pos, 20) >= 0; };
  return { win, after, level, vcf };
}
function gomoku(opt) {
  const E = require(path.join(ROOT, 'gomoku/engine.js')), L = require(path.join(ROOT, 'gomoku/lessons.json')), PZ = require(path.join(ROOT, 'gomoku/puzzles.json'));
  const C = E.C, G = gmWin(E), only = opt && opt.only, out = [];
  const cells = a => String(a || '').split(/\s+/).filter(Boolean).map(E.sqOf), nm = m => E.sqName(m);
  const pool = []; L.steps.forEach(st => { st.problems.forEach((P, j) => pool.push([`${st.id} q${j + 1}`, P])); (st.ramp || []).forEach((r, j) => { if (r.b || r.w) pool.push([`${st.id} warm-up ${j + 1}`, r]); }); });
  const walk = (o, pre) => { if (Array.isArray(o)) o.forEach((x, i) => walk(x, pre + '/' + i)); else if (o && typeof o === 'object') { if (typeof o.b === 'string' && typeof o.w === 'string' && o.side) pool.push(['puzzle' + pre, o]); else for (const k in o) walk(o[k], pre + '/' + k); } };
  walk(PZ.cats, ''); walk(PZ.old || {}, '/old');
  const st2 = P => { const s = []; cells(P.b).forEach(m => s.push([1, m % 15, Math.floor(m / 15)])); cells(P.w).forEach(m => s.push([2, m % 15, Math.floor(m / 15)])); return s; };
  const SY = [(x, y) => [x, y], (x, y) => [-x, y], (x, y) => [x, -y], (x, y) => [-x, -y], (x, y) => [y, x], (x, y) => [-y, x], (x, y) => [y, -x], (x, y) => [-y, -x]];
  const dist = (A, B) => { if (Math.abs(A.length - B.length) > 3) return 99; const Bs = new Set(B.map(([c, x, y]) => c + ',' + x + ',' + y)); let best = 99;
    for (const f of SY) { const A2 = A.map(([c, x, y]) => [c, ...f(x, y)]), tr = new Set(); for (const a of A2) for (const b of B) if (a[0] === b[0]) tr.add((b[1] - a[1]) + ',' + (b[2] - a[2]));
      for (const t of tr) { const [dx, dy] = t.split(',').map(Number); let hit = 0; for (const a of A2) if (Bs.has(a[0] + ',' + (a[1] + dx) + ',' + (a[2] + dy))) hit++; best = Math.min(best, A.length + B.length - 2 * hit); } }
    return best; };
  const PS = pool.map(([w, p]) => [w, st2(p), p]);
  L.steps.forEach(st => { const id = st.id; if (!GM_DONE.has(id) || (only && !only.has(id))) return;
    let prevD = -1, firstD = null;
    st.problems.forEach((P, j) => { const add = m => out.push({ step: id, q: j + 1, msg: m });
      if (P.rule !== 'free') { add(`rule ${P.rule} (the verified lessons are free-rule)`); return; }
      const s = P.side, o = 3 - s, pos = E.setup('free', { b: cells(P.b), w: cells(P.w), side: s }), lg = pos.legal(), ok = P.ok.slice().sort();
      const cls = (c, m) => pos.cls[c][E.M2I[m]], fv = c => pos.fives(c).map(i => nm(E.I2M[i])).sort();
      if (lg.length < 3) add(`③ only ${lg.length} legal moves`);
      let want;
      const lv = new Map(lg.map(m => [m, G.level(pos, m)])), mine = lg.filter(m => lv.get(m));
      const fastest = k => lg.filter(m => lv.get(m) === k).map(nm).sort(), mn = mine.length ? Math.min(...mine.map(m => lv.get(m))) : 0;
      if (id === 'five') { want = fv(s); if (fv(o).length && !want.length) add('① the opponent has a five point and the mover none'); }
      else if (id === 'block') { if (fv(s).length) add('① the mover can make five'); want = fv(o); if (want.length !== 1) add(`① the opponent has ${want.length} five points`);
        if (want.length === 1) { pos.make(E.sqOf(want[0])); if (G.win(pos, 2) || G.win(pos, 3) || G.vcf(pos)) add('⑧ after the block the opponent still wins (「負けの心配は消えた」 is false)'); pos.unmake(); } }
      else if (id === 'three') { if (fv(s).length || fv(o).length) add('① a five point on the board'); if (mine.length || G.vcf(pos)) add('① the mover has a win of its own');
        if (!lg.some(m => cls(o, m) === C.F4)) add('④ the opponent has no open three (no open-four point)');
        want = []; for (const m of lg) { pos.make(m); const w = G.win(pos, 2) || G.win(pos, 3) || G.vcf(pos); pos.unmake(); if (!w) want.push(nm(m)); } want.sort(); }
      else { if (fv(s).length || fv(o).length) add('① a five point on the board');
        const K = id === 'sfour' ? 2 : 3; if (mn !== K) add(`① the fastest win takes ${mn || 'no'} moves (the lesson's: ${K})`); want = fastest(mn || K);
        if (id === 'sfour') { if (!P.ok.every(q => cls(s, E.sqOf(q)) === C.F4)) add('④ an answer is not an open four'); const slow = mine.filter(m => !P.ok.includes(nm(m))); if (slow.length) add(`⑦ other moves also win (${slow.map(nm)}) — the words say they get stopped`); }
        else if (!P.ok.every(q => cls(s, E.sqOf(q)) === C.F43)) add('④ an answer is not a four-three'); }
      if (want.join() !== ok.join()) add(`①② the answers are ${ok}, the goal's moves ${want}`);
      const d = lg.filter(m => !P.ok.includes(nm(m)) && (cls(s, m) >= C.F3 || cls(o, m) >= C.B4)).length;
      if (d < prevD) add(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d); if (firstD === null) firstD = d;
      if (j === st.problems.length - 1 && !(d > firstD)) add(`⑥ the last problem is no harder than the first (d ${d} vs ${firstD})`);
      const A = st2(P); for (const [who, B, Q] of PS) { if (Q === P) continue; const e = dist(A, B); if (e <= 3) add(`⑤ ${e} stones from ${who}`); }
    }); });
  return out;
}
const GAMES = { connect4, mancala, gomoku };
module.exports = GAMES;
if (require.main === module) {
  const a = process.argv.slice(2), games = (a.find(x => !x.startsWith('-')) || 'connect4,mancala,gomoku').split(',');
  let bad = 0;
  for (const g of games) { const f = GAMES[g](); if (!f.length) { console.log(`OK ${g}` + (g === 'connect4' ? ' (count/endwin の⑦⑧)' : ` (${[...(g === 'gomoku' ? GM_DONE : MC_DONE)].join('・')} の①〜⑧)`)); continue; }
    bad += f.length; f.forEach(x => console.log(`NG ${g} ${x.step} q${x.q}: ${x.msg}`)); }
  process.exit(bad ? 1 : 0);
}

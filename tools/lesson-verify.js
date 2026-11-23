#!/usr/bin/env node
// Strict problem verification for the lesson loop, phase 2 (claude/lesson-quality.md「第2期：問題の検証ループ」).
// Each game lists the steps (lessons) that passed the strict checks; those are enforced (exit code 1 on a failure) and also run from
// tools/lesson-facts.js. Steps not yet verified are only reported with --all, so the next loop run knows what to fix.
//   node tools/lesson-verify.js connect4 [--all] [--solve] [--json out.json]
//     --solve  recompute every stored solver value with the perfect solver (slow: opening positions can take minutes)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

// ------------------------------------------------------------------ connect4
// Checks per problem (P = lessons.json step.problems[j], sc = exact solver values per column, null = full column):
//  ① the answers are the columns with the top value; with --solve the stored values equal the solver's.
//  ② the answers are the only columns that reach the step's goal (GOAL below): 'class' = the only moves with the best result
//     (win / draw / loss) — a slower win counts as the same result, so it must not exist; 'quick' = the only win, or the only
//     moves with the best result; 'now' = the columns that connect four at once; 'block' = the only columns that block the
//     opponent's four and no four of one's own; 'mate3' = the only first moves of a forced four within 3 own moves.
//  ③ at least 3 legal columns.
//  ⑤ no other problem of the game (all lessons, the warm-ups, puzzles.json) is the same position or 1–2 discs away (mirror too).
//  ⑥ the problems of a step get no easier: d = the depth the heuristic search needs to settle on the answer, then n = the plies
//     to the end of the game with best play (read from the solver value). From one problem to the next d never drops by more than one,
//     and when d does not rise, n does not drop; the last problem is not the easiest.
//  ⑦⑧ the step's own words: 'count' — the answer neither wins nor blocks a four now, and after it the mover still owns a winning
//     cell that is not playable (the zugzwang the words describe); 'quick' — after the answer the opponent's every reply loses.
const C4_VERIFIED = ['count', 'endwin'];
const C4_GOAL = { four: 'now', miss: 'now', block: 'block', force: 'mate3', endwin: 'quick', count: 'class' };
function connect4(opt) {
  const E = require(path.join(ROOT, 'connect4/engine.js')), U = require(path.join(ROOT, 'connect4/tools/c4util.js'));
  const L = JSON.parse(fs.readFileSync(path.join(ROOT, 'connect4/lessons.json'), 'utf8'));
  const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'connect4/puzzles.json'), 'utf8'));
  const out = [];
  const add = (st, j, m) => out.push({ step: st, q: j + 1, msg: m });
  // cell sets for ⑤
  const cellsOf = mv => { const g = U.grid(mv), s = new Map(); g.forEach((col, c) => col.forEach((p, r) => s.set(c * 6 + r, p))); return s; };
  const mirror = s => { const t = new Map(); for (const [k, p] of s) t.set((6 - Math.floor(k / 6)) * 6 + k % 6, p); return t; };
  const dist = (a, b) => { let d = 0; for (const [k, p] of a) if (b.get(k) !== p) d++; for (const [k] of b) if (!a.has(k)) d++; return d; };
  const all = [];
  L.steps.forEach(st => (st.problems || []).forEach((P, j) => all.push({ id: `${st.id} q${j + 1}`, step: st.id, j, s: cellsOf(P.moves), n: P.moves.length })));
  L.steps.forEach(st => (st.ramp || []).forEach((R, j) => all.push({ id: `${st.id} ramp${j + 1}`, step: st.id + '#ramp', j, s: cellsOf(R.moves), n: R.moves.length })));
  PZ.levels.forEach(lv => (lv.puzzles || []).forEach((P, j) => all.push({ id: `puzzle ${lv.id}#${j + 1}`, step: 'pz', j, s: cellsOf(P.moves), n: P.moves.length })));
  const exact = (mv, weak) => { const g = U.grid(mv), sc = []; for (let c = 0; c < 7; c++) { if (g[c].length >= 6) { sc.push(null); continue; } E.loadMoves(mv); sc.push(E.solveMove(c, weak)); } return sc; };
  const depthFor = (mv, ans) => { E.loadMoves(mv); for (let d = 1; d <= 14; d++) { E.loadMoves(mv); const r = E.heurID(d, 4000); if (!r.list) break; const b = Math.max(...r.list.map(x => x.s)); const top = r.list.filter(x => x.s === b).map(x => x.c); if (top.length === 1 && ans.includes(top[0])) { let ok = true; for (let e = d + 1; e <= Math.min(d + 2, 14); e++) { E.loadMoves(mv); const q = E.heurID(e, 4000); if (!q.list) break; const bb = Math.max(...q.list.map(x => x.s)); const tt = q.list.filter(x => x.s === bb).map(x => x.c); if (!(tt.length === 1 && ans.includes(tt[0]))) ok = false; } if (ok) return d; } } return 15; };
  const steps = opt.all ? L.steps.filter(s => (s.problems || []).length) : L.steps.filter(s => C4_VERIFIED.includes(s.id));
  for (const st of steps) {
    const goal = C4_GOAL[st.id] || 'class', diffs = [];
    st.problems.forEach((P, j) => {
      const g = U.grid(P.moves), me = P.moves.length % 2 ? 2 : 1, op = 3 - me, legal = U.legal(g), sc = P.sc;
      for (let i = 0; i < P.moves.length; i++) { const h = U.grid(P.moves.slice(0, i)), c = P.moves.charCodeAt(i) - 49; if (!(c >= 0 && c < 7) || h[c].length >= 6) { add(st.id, j, `move ${i + 1} is illegal`); return; } if (U.isWinAfter(h, c, i % 2 ? 2 : 1)) { add(st.id, j, `the game is over at move ${i + 1}`); return; } }
      for (let c = 0; c < 7; c++) if ((sc[c] === null) !== !legal.includes(c)) add(st.id, j, `stored value of column ${c} vs legality`);
      if (opt.solve) { const x = exact(P.moves, P.kind === 'weak'); if (JSON.stringify(x) !== JSON.stringify(sc)) add(st.id, j, `stored values ${JSON.stringify(sc)} ≠ solver ${JSON.stringify(x)}`); }
      const v = sc.filter(x => x !== null), top = Math.max(...v), best = sc.map((x, c) => x === top ? c : -1).filter(c => c >= 0), ans = P.answer.slice().sort();
      if (best.join() !== ans.join()) add(st.id, j, `① the answers ${ans} are not the top-valued columns ${best}`);
      const sg = Math.sign(top), same = sc.map((x, c) => x !== null && Math.sign(x) === sg ? c : -1).filter(c => c >= 0);
      const immMe = U.immWins(g, me), immOp = U.immWins(g, op);
      if (goal === 'now' && immMe.slice().sort().join() !== ans.join()) add(st.id, j, `② the columns that connect four now are ${immMe}, the answers ${ans}`);
      if (goal === 'block') { if (immMe.length) add(st.id, j, `② the mover can connect four (${immMe}) — not a block problem`); if (immOp.slice().sort().join() !== ans.join()) add(st.id, j, `② the blocking columns are ${immOp}, the answers ${ans}`); }
      if (goal === 'class' && same.join() !== ans.join()) add(st.id, j, `② other columns reach the same result: ${same} (values ${JSON.stringify(sc)})`);
      if (goal === 'quick') { const wins = sc.map((x, c) => x !== null && x > 0 ? c : -1).filter(c => c >= 0); if (wins.join() !== ans.join() && same.join() !== ans.join()) add(st.id, j, `② other winning columns: ${wins} (values ${JSON.stringify(sc)})`);
        if (top <= 0) add(st.id, j, `② the step asks for a win, the best result is ${top}`); }
      if (goal === 'mate3') { const ml = E.mateList(P.moves, 3).filter(e => e.need && e.need <= 3).map(e => e.c).sort(); if (ml.join() !== ans.join()) add(st.id, j, `② forced fours within 3: ${ml}, the answers ${ans}`); }
      if (legal.length < 3) add(st.id, j, `③ only ${legal.length} legal columns`);
      // ⑤
      const me5 = all.find(o => o.step === st.id && o.j === j), ms = mirror(me5.s);
      for (const o of all) { if (o === me5 || (o.step === st.id + '#ramp' && false)) continue; const d = Math.min(dist(me5.s, o.s), dist(ms, o.s)); if (d <= 2) add(st.id, j, `⑤ ${d === 0 ? 'the same position as' : d + ' disc(s) from'} ${o.id}`); }
      // ⑦⑧
      if (st.id === 'count') { const a = ans[0], A = U.play(g, a, me);
        if (immMe.includes(a) || immOp.includes(a)) add(st.id, j, `⑧ the answer wins or blocks a four now — not a counting problem`);
        if (!U.threats(A, me).some(t => !t.playable)) add(st.id, j, `⑧ after the answer the mover owns no winning cell in the air`);
        if (immMe.length || immOp.length) add(st.id, j, `⑧ a four is playable now — the words talk about counting, not a four`); }
      if (goal === 'quick') { const a = ans[0], mv2 = P.moves + (a + 1); if (!U.isWinAfter(g, a, me)) { const g2 = U.grid(mv2); for (const r of U.legal(g2)) { E.loadMoves(mv2); const y = E.solveMove(r, false); if (!(y < 0)) add(st.id, j, `⑦ after the answer the reply ${r} does not lose (${y})`); } } }
      diffs.push({ d: depthFor(P.moves, ans), n: (top === 0 ? 42 : 43 - 2 * Math.abs(top)) - P.moves.length });
    });
    const ds = diffs.map(x => `${x.d}/${x.n}`).join(' '), lt = (a, b) => a.d < b.d - 1 || (a.d <= b.d && a.n < b.n);
    for (let k = 1; k < diffs.length; k++) if (lt(diffs[k], diffs[k - 1])) add(st.id, k, `⑥ easier than the problem before it (depth/plies ${ds})`);
    const last = diffs[diffs.length - 1]; if (diffs.length > 2 && diffs.slice(0, -1).some(x => lt(last, x))) add(st.id, diffs.length - 1, `⑥ the last problem is easier than an earlier one (depth/plies ${ds})`);
    if (opt.verbose) console.log(`  ${st.id}: depth/plies ${ds}`);
  }
  return { verified: C4_VERIFIED.slice(), checked: steps.map(s => s.id), fails: out };
}

const GAMES = { connect4 };
module.exports = GAMES;
if (require.main === module) {
  const a = process.argv.slice(2), opt = { all: a.includes('--all'), solve: a.includes('--solve'), verbose: a.includes('-v') };
  const ji = a.indexOf('--json'), jf = ji >= 0 ? a[ji + 1] : null;
  const games = (a.find(x => !x.startsWith('-') && x !== jf) || Object.keys(GAMES).join(',')).split(',');
  let bad = 0; const rep = {};
  for (const gm of games) { const r = GAMES[gm](opt); rep[gm] = r;
    const by = {}; r.fails.forEach(f => (by[f.step] = by[f.step] || []).push(f));
    for (const s of r.checked) { const f = by[s] || [], v = r.verified.includes(s); if (v && f.length) bad += f.length;
      console.log(`${f.length ? (v ? 'NG ' : '未 ') : 'OK '} ${gm} ${s}${v ? '' : '（未検証）'}${f.length ? '' : ''}`); f.forEach(x => console.log(`     q${x.q}: ${x.msg}`)); } }
  if (jf) fs.writeFileSync(jf, JSON.stringify(rep, null, 1));
  process.exit(bad ? 1 : 0);
}

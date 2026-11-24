#!/usr/bin/env node
// (2026-11-24 担当D) janggi on the 3D table: the puzzles (janggi/puzzles.json, 3D atlas/puzzles.js BOOK.janggi = the 2D janggi/app.js
// puzzleMove) checked against the WebAssembly mate solver the page uses (janggi/engine.wasm) and the rules (janggi/engine.js).
// Every puzzle, ①〜⑨ and 追1〜 (claude/lesson-quality.md):
//  ① the stored first move is legal and mates within n (checks-only themes: every own move a check); n is exact (no mate in fewer,
//    a checks-only puzzle has no mate in n−1 by any moves either); the solver's line (attacker: shortest, defender: longest) ends in mate.
//  ② the goal set = the first moves the 3D / 2D accept (need ≤ n) is the stored move alone.
//  ③ 3 legal moves or more, and something to choose: the answer is not the only forcing move — mate in 1: 2 checks or more that do not
//    mate; the others: 2 forcing moves (checks or captures; checks-only: checks) or more besides the answer.
//  ④ the theme: mateN = mate in exactly N; ckN = checks-only mate in N (ck5: 5 or more), the stored n = the theme's.
//  ⑤ no two puzzles (janggi puzzles, lessons, the lessons' reserve, and xiangqi's puzzles) within 4 points of each other (mirrored too).
//  ⑥ easy → hard: d = the pieces on the board (what there is to read); the 2D and the 3D list a theme in this order, 10 a stage — each
//    stage's mean d at least the one before, none below the mean two stages before, the last stage's mean above the first's.
//  ⑦⑧ the words for every legal first move (the 3D ショウギツネ lines in atlas/games/janggi-pz.js and the 2D texts): a wrong move is
//    named by the board's fact — mated at once (pz.bl.lose: the opponent has a mate in 1 after it), not a check in a checks-only puzzle
//    (pz.bl.nock), no mate within the count (failWhy / stray), and the goal line says the side to move and n.
//  ⑨ the 2D and the 3D judge the same way (the same solver call, the same 'need ≤ left' test).
// Usage: node tools/lesson-verify-janggi.js [--json out.json]  (also: node tools/lesson-verify.js janggi)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
let E = null;
function engine() {
  if (E) return E;
  E = require(path.join(ROOT, 'janggi/engine.js'));
  const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(ROOT, 'janggi/engine.wasm'))), { env: { now: () => Date.now(), progress: () => {} } });
  E.setWasm(x.exports); return E;
}
const THEME = { mate1: [1, false], mate2: [2, false], mate3: [3, false], ck4: [4, true], ck5: [5, true] };
const brd = fen => { const a = []; for (const row of fen.split(' ')[0].split('/')) for (const ch of row) if (/\d/.test(ch)) for (let k = 0; k < +ch; k++) a.push('.'); else a.push(ch); return a; };
const dist = (a, b) => { let d1 = 0, d2 = 0; for (let i = 0; i < 90; i++) { if (a[i] !== b[i]) d1++; const r = (i / 9) | 0, c = i % 9; if (a[i] !== b[r * 9 + 8 - c]) d2++; } return Math.min(d1, d2); };
const pieces = fen => fen.split(' ')[0].replace(/[\d/]/g, '').length;

// one puzzle: the list of what fails (empty = passes) and its facts
function checkOne(P, ck, n) {
  const E = engine(), bad = [], pos = E.Pos.from(P.s), all = pos.moves();
  if (pos.status() !== 0) return { bad: ['① the position is over already'] };
  if (pos.side !== (/ b$/.test(P.s) ? 1 : 0)) bad.push('⑧ the side to move');
  if (!all.includes(P.a)) return { bad: ['① the stored move is not legal'] };
  const L = E.puzzle(P.s, [], n, false, ck) || [], win = L.filter(e => e.need > 0 && e.need <= n);
  if (!win.some(e => e.m === P.a)) bad.push('① the stored move does not mate within ' + n);
  if (win.length !== 1) bad.push(`② ${win.length} first moves mate within ${n}`);
  if (win.some(e => e.need < n)) bad.push('① a mate in fewer than ' + n);
  if (ck && n > 1) { const g = E.puzzle(P.s, [], n - 1, false, false) || []; if (g.some(e => e.need > 0)) bad.push('④ a mate in ' + (n - 1) + ' with any moves'); }
  // the line: the attacker's shortest mate, the defender's longest resistance (= janggi/tools/build_puzzles.js, the answer button)
  const line = []; let ok = true;
  for (let step = 0; step < 2 * n; step++) {
    const q = E.replay(P.s, line).pos; if (q.status() !== 0) break;
    if (step % 2 === 0) { const A = (E.puzzle(P.s, line, n - step / 2, false, ck) || []).filter(e => e.need > 0).sort((a, b) => a.need - b.need); if (!A.length) { ok = false; break; } line.push(step ? A[0].m : P.a); }
    else { const D = E.puzzle(P.s, line, n - (step - 1) / 2, true, ck) || []; if (!D.length) { ok = false; break; } let b = null; for (const e of D) { const v = e.need === 0 ? 99 : e.need < 0 ? 50 : e.need; if (!b || v > b.v) b = { m: e.m, v }; } if (b.v >= 50) { ok = false; break; } line.push(b.m); }
  }
  if (!ok || E.replay(P.s, line).pos.status() !== -1) bad.push('① the solver line does not end in mate');
  if (ck) for (let k = 0; k < line.length; k += 2) { const q = E.replay(P.s, line.slice(0, k)).pos; if (!q.clone().play(line[k]).inCheck()) { bad.push('④ a move of the line is not a check'); break; } }
  // ③ something to choose
  const isCk = m => pos.clone().play(m).inCheck(), checks = all.filter(isCk), forcing = all.filter(m => isCk(m) || (!ck && !E.isPass(m) && pos.at(E.mTo(m))));
  if (all.length < 3) bad.push(`③ ${all.length} legal moves`);
  // (mate in 1 and checks-only: the choices are the checks — 3 or more; any moves: a forcing answer needs 2 other forcing moves, a quiet
  //  answer 1 — a check or capture that tempts and fails)
  const quiet = !forcing.includes(P.a), others = forcing.filter(m => m !== P.a).length;
  if (n === 1 || ck) { if (checks.length < 3) bad.push(`③ ${checks.length} check(s) to choose from (3 or more)`); }
  else if (others < (quiet ? 1 : 2)) bad.push(`③ ${others} other forcing move(s) (checks or captures) besides the ${quiet ? 'quiet' : 'forcing'} answer`);
  // ⑦⑧ what every wrong first move gets: the classes the 2D pzBlunder / the 3D xqBlunder give, read against the board
  const words = {};
  for (const m of all) {
    if (m === P.a) continue;
    const after = pos.clone().play(m);
    if (after.status() === -1) { bad.push('② a wrong move mates at once'); continue; }
    let cls = n === 1 ? 'fail' : ck && !after.inCheck() ? 'nock' : null;
    if (!cls) { const mated = after.moves().some(x => after.clone().play(x).status() === -1); cls = mated ? 'lose' : 'stray'; }
    // the facts behind the words: 'lose' = the opponent has a mate in 1; 'stray' = no mate within n follows by force
    if (cls === 'lose' && !after.moves().some(x => after.clone().play(x).status() === -1)) bad.push('⑦ lose without a mate in 1');
    if (cls === 'stray') { const e = L.find(x => x.m === m); if (e && e.need > 0 && e.need <= n) bad.push('⑦ stray but it mates'); }
    words[cls] = (words[cls] || 0) + 1;
  }
  return { bad, line, checks: checks.length, forcing: forcing.length, legal: all.length, words, d: pieces(P.s) };
}

function puzzles(opt) {
  const PZ = (opt && opt.puzzles) || JSON.parse(fs.readFileSync(path.join(ROOT, 'janggi/puzzles.json'), 'utf8'));
  const LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'janggi/lessons.json'), 'utf8'));
  const XQ = JSON.parse(fs.readFileSync(path.join(ROOT, 'xiangqi/puzzles.json'), 'utf8'));
  const out = [], add = (th, j, msg) => out.push({ step: 'puzzle ' + th, q: j + 1, msg });
  // ⑤ the pool: the lessons (problems), the lessons' reserve, xiangqi's puzzles, and the janggi puzzles in order
  const pool = [];
  LS.steps.forEach(st => st.problems.forEach((q, j) => pool.push([`lesson ${st.id} q${j + 1}`, brd(q.s)])));
  for (const f of ['lesson_mate1.json', 'lesson_mate2.json']) { try { JSON.parse(fs.readFileSync(path.join(ROOT, 'janggi/tools', f), 'utf8')).forEach((q, j) => pool.push([`${f} ${j + 1}`, brd(q.s)])); } catch (e) {} }
  XQ.themes.forEach(th => th.puzzles.forEach((q, j) => pool.push([`xiangqi ${th.id} ${j + 1}`, brd(q.s)])));
  const facts = {};
  if (!PZ.themes || PZ.themes.map(t => t.id).join() !== 'mate1,mate2,mate3,ck4,ck5') add('-', -1, '④ the themes changed: ' + (PZ.themes || []).map(t => t.id).join());
  for (const T of PZ.themes || []) {
    const [n0, ck] = THEME[T.id] || [0, false]; if (!n0) continue;
    if (!!T.ck !== ck) add(T.id, -1, '④ the theme\'s checks-only flag');
    const D = [];
    T.puzzles.forEach((P, j) => {
      const n = P.n, a = m => add(T.id, j, m);
      if (T.id === 'ck5' ? n < 5 : n !== n0) a(`④ n = ${n} in ${T.id}`);
      if (!!P.ck !== ck) a('④ the puzzle\'s checks-only flag');
      const r = checkOne(P, ck, n); r.bad.forEach(a); facts[T.id + '-' + j] = r;
      const b = brd(P.s); for (const [w, o] of pool) if (dist(b, o) <= 4) { a(`⑤ within ${dist(b, o)} points of ${w}`); break; }
      pool.push([`puzzle ${T.id} ${j + 1}`, b]);
      D.push(r.d);
    });
    // (the lists open by stages of 10 — 6 cleared opens the next — so a stage is the step of difficulty: each stage's mean d at least
    //  the stage before's, the last above the first, and no puzzle easier than the mean of two stages before)
    const st = k => { const R = D.slice(k * 10, k * 10 + 10); return R.reduce((x, y) => x + y, 0) / R.length; }, ns = Math.ceil(D.length / 10);
    for (let k = 1; k < ns; k++) if (st(k) < st(k - 1)) add(T.id, k * 10, `⑥ stage ${k + 1} (mean d ${st(k).toFixed(1)}) easier than stage ${k} (${st(k - 1).toFixed(1)})`);
    D.forEach((d, j) => { const k = Math.floor(j / 10); if (k >= 2 && d < st(k - 2)) add(T.id, j, `⑥ d ${d} below the mean of stage ${k - 1} (${st(k - 2).toFixed(1)})`); });
    if (ns > 1 && !(st(ns - 1) > st(0))) add(T.id, -1, '⑥ the last stage is not harder than the first');
  }
  // ⑨ the 2D and the 3D judge alike: the 2D puzzleMove and the 3D xqMoved both ask the solver for 'left' and accept need ≤ left
  const app = fs.readFileSync(path.join(ROOT, 'janggi/app.js'), 'utf8'), p3 = fs.readFileSync(path.join(ROOT, 'atlas/puzzles.js'), 'utf8');
  if (!/if \(!e \|\| !\(e\.need > 0\) \|\| e\.need > left\) \{/.test(app)) add('-', -1, '⑨ janggi/app.js puzzleMove changed');
  if (!/if \(!e \|\| !\(e\.need > 0\) \|\| e\.need > left\) \{/.test(p3)) add('-', -1, '⑨ atlas/puzzles.js xqMoved changed');
  if (!/BOOK\.janggi = /.test(p3)) add('-', -1, '⑨ the 3D table has no BOOK.janggi');
  // ⑦⑧ the 3D words: ショウギツネ's lines (atlas/games/janggi-pz.js) for the classes above, with the facts they claim
  try {
    const w = {}; new Function('window', fs.readFileSync(path.join(ROOT, 'atlas/games/janggi-pz.js'), 'utf8'))(w);
    const V = w.AtlasJanggiPz && w.AtlasJanggiPz.ja || {}, need = { 'pz.bl.lose': /すぐ|次の1手|詰まされ/, 'pz.bl.nock': /王手/, 'pz.failWhy': /\{m\}[\s\S]*詰[みま][\s\S]*\{b\}/, 'pz.stray': /外れ|はずれ/, 'pz.goal': /\{c\}[\s\S]*\{n\}/, 'pz.goalCk': /\{c\}[\s\S]*王手[\s\S]*\{n\}/, 'pz.best': /\{b\}/ };
    for (const k in need) if (!need[k].test(V[k] || '')) add('-', -1, `⑧ the 3D line ${k} does not say what the board shows: ${V[k] || '(none)'}`);
    if (/\{n\}手以内に詰み/.test(V['pz.failWhy'] || '')) add('-', -1, '追13 failWhy names the whole count on the last move');
    const L = w.AtlasPuzzleLines && w.AtlasPuzzleLines.janggi;
    for (const k of ['hi', 'intro', 'mid', 'solved', 'streak', 'help', 'out', 'stuck', 'retry', 'hint', 'again', 'allDone']) if (!L || !L.ja || !(L.ja[k] || []).length) add('-', -1, '⑧ no 3D line ' + k);
    if (L && L.ja) for (const k in L.ja) for (const t of L.ja[k]) { if (/(です|ます|ません|ました)(?=[。！？]|$)/.test(t)) add('-', -1, `ショウギツネ: polite 「${t}」`); if (/チェス|将棋|シャンチー|玉さん|詰将棋/.test(t)) add('-', -1, `ショウギツネ: another game's word 「${t}」`); }
  } catch (e) { add('-', -1, '⑧ atlas/games/janggi-pz.js: ' + e.message); }
  // 追20 the line said after a move off the solution (pz.stray + the runner's mid, atlas/puzzles.js xqMoved) praises nothing
  try {
    const i = p3.indexOf('  const JGX = {'), J = new Function('return ' + p3.slice(i + 13, p3.indexOf('\n  };\n', i) + 4))();
    const PRAISE = /調子|いいね|いい手|すごい|お見事|Nice|Good|Great|Bien|Bom|Boa|Gut|Bagus|Güzel|Отлично|不错|不錯|좋아|बढ़िया|رائع/;
    for (const lg in J) if (PRAISE.test(J[lg].mid || '')) add('-', -1, `追20 JGX.${lg}.mid praises after a move off the line: ${J[lg].mid}`);
    const w = {}; new Function('window', fs.readFileSync(path.join(ROOT, 'atlas/games/janggi-pz.js'), 'utf8'))(w);
    if (PRAISE.test((w.AtlasJanggiPz.ja || {})['pz.stray'] || '')) add('-', -1, '追20 pz.stray praises');
  } catch (e) { add('-', -1, '追20 JGX: ' + e.message); }
  return opt && opt.facts ? { out, facts } : out;
}

module.exports = { puzzles, checkOne, engine, brd, dist, pieces, THEME };
if (require.main === module) {
  const out = puzzles(), json = process.argv.indexOf('--json');
  if (json > 0) fs.writeFileSync(process.argv[json + 1], JSON.stringify(out, null, 1));
  const by = {}; for (const o of out) (by[o.step + ' ' + o.q] = by[o.step + ' ' + o.q] || []).push(o.msg);
  for (const k in by) console.log(k + ': ' + by[k].join(' / '));
  const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'janggi/puzzles.json'), 'utf8')), tot = P.themes.reduce((a, t) => a + t.puzzles.length, 0), badN = new Set(out.filter(o => o.q > 0).map(o => o.step + o.q)).size;
  console.log(`janggi puzzles: ${tot - badN}/${tot} pass` + (out.some(o => o.q <= 0) ? ' · general: ' + out.filter(o => o.q <= 0).length : ''));
  process.exitCode = out.length ? 1 : 0;
}

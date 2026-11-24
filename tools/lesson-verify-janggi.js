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

// (2026-11-24 担当D) the lessons on the 3D table (atlas/games/janggi-ls.js DONE: the capture basics b_rook・b_horse・b_pawn), as
// xiangqi's (tools/lesson-verify.js xiangqi): every problem, ①〜⑨ and 追1〜:
//  ① the goal set read from the rules = captures by the step's piece that no legal reply can take back (not the general) — the answer
//    alone; the stored values (sc, = janggi/app.js problemPoints · 3D JANGGI.points) put it alone on top, and a fresh engine search
//    (--deep ms) agrees. ② the second move is 100 or more worse and scores under 16. ③ 3 legal moves or more, another capture to be
//    tempted by, and from problem 3 a trap (a capture by the step's piece — for the pawn, any capture at a loss — that is taken back).
//  ④ the answer takes a piece worth 3 or more (not a 兵), the mover is not in check, no other free capture takes as much; a lesson's
//    answers take two kinds of piece or more. ⑤ no position within 4 points (mirrored too) of another lesson problem, the lessons'
//    reserve, a janggi puzzle or a xiangqi lesson / puzzle. ⑥ d = wrong captures + traps grows, the last above the first.
//  ⑦⑧ ショウギツネ's words for the answer and every legal wrong move, read back against the board: the piece taken and its points,
//    「取り返され」 only for a capture that is taken back (and the piece of yours that is lost), a smaller capture's points, 「取れない」
//    only for a move that takes nothing; both arrows named; no polite form, no other game's words, no placeholders.
//  ⑨ every legal move valued once; the 2D problemPoints and the 3D JANGGI.points are the same; the 3D lists only the checked steps.
function lessons(opt) {
  const E = engine(), vm = require('vm'), out = [], add = (id, j, m) => out.push({ step: 'lesson ' + id, q: j + 1, msg: m });
  const LS = (opt && opt.lessons) || JSON.parse(fs.readFileSync(path.join(ROOT, 'janggi/lessons.json'), 'utf8'));
  const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'janggi/puzzles.json'), 'utf8'));
  const XL = JSON.parse(fs.readFileSync(path.join(ROOT, 'xiangqi/lessons.json'), 'utf8')), XP = JSON.parse(fs.readFileSync(path.join(ROOT, 'xiangqi/puzzles.json'), 'utf8'));
  const app = fs.readFileSync(path.join(ROOT, 'janggi/app.js'), 'utf8'), src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8');
  const lsSrc = (opt && opt.lsSrc) || fs.readFileSync(path.join(ROOT, 'atlas/games/janggi-ls.js'), 'utf8');
  const w = {}; try { vm.runInNewContext(lsSrc, { window: w }); } catch (e) { add('-', -1, '⑧ atlas/games/janggi-ls.js: ' + e.message); return out; }
  const JL = w.AtlasJanggiLs, DONE = JL.DONE || [];
  // ⑨ one scoring: 2D problemPoints = 3D JANGGI.points (the same lines, janggi's sOfV with 800)
  const body = t => { const i = t.indexOf('if (P.ok) return P.ok.includes(m) ? 20 : 0;'); return i < 0 ? '' : t.slice(i, t.indexOf('/ 0.5)', i)).replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ' '); };
  const b2 = body(app.slice(app.indexOf('function problemPoints(P, m)'))), b3 = body(src.slice(src.indexOf('points(P, m) {   // = janggi/app.js problemPoints')));
  if (!b2 || b2.replace(/sOfV\(best\) - sOfV\(mine\)|const loss = |loss/g, '') .length < 50) add('-', -1, '⑨ janggi/app.js problemPoints not found');
  if (!/Math\.tanh\(v \/ 800\)/.test(app) || !/const jgS = [^\n]*Math\.tanh\(v \/ 800\)/.test(src)) add('-', -1, '⑨ the 2D sOfV and the 3D jgS differ');
  for (const k of ['mine >= best - 10 && !(best > WINT && mine < best)) return 20', 'best > WINT && mine > WINT) return 16', "mine > -WINT && mine >= 300 ? 8 : mine > -100 ? 4 : 0", 'mine < -WINT && best >= -WINT) return 0'])
    if (!b2.includes(k) || !b3.includes(k)) add('-', -1, '⑨ the 2D / 3D scoring differs: ' + k);
  if (!/janggi: JANGGI/.test(src)) add('-', -1, '⑨ the 3D table has no DATA.janggi');
  // 追24 the heading over a right answer: not the puzzle mode's lines (AtlasPuzzleLines.janggi.solved「きれいに詰んだ！」) on a capture lesson
  if (!/p\.own && \(id === 'morris' \|\| id === 'janggi' \|\| p\.ckls\) \? '' : line\('solved'\)/.test(src)) add('-', -1, '追24 a right answer in a janggi lesson is headed by the puzzle lines (詰んだ)');
  if (!/steps: ls\.steps\.filter\(x => D\.includes\(x\.id\)\)/.test(src)) add('-', -1, '⑨ the 3D table lists steps that are not checked');
  const WIN = E.WIN, WINT = E.WINT, sOfV = v => v > WINT ? 0.9 + 0.1 * Math.min(1, 6 / (WIN - v + 1)) : v < -WINT ? -(0.9 + 0.1 * Math.min(1, 6 / (WIN + v + 1))) : v > WINT - 1000 ? 0.88 : v < -(WINT - 1000) ? -0.88 : Math.tanh(v / 800) * 0.82;
  const pts = (P, m) => { const val = new Map(P.sc), best = Math.max(...P.sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : -WIN;
    if (mine >= best - 10 && !(best > WINT && mine < best)) return 20; if (best > WINT && mine > WINT) return 16; return Math.max(0, Math.round(20 * (1 - (sOfV(best) - sOfV(mine)) / 0.5))); };
  const T = E.typeOf, mTo = E.mTo, mFrom = E.mFrom, PTS = [0, 0, 3, 3, 5, 13, 7, 2];
  const takeBack = (p, m) => { const q = p.clone().play(m); return q.moves().some(x => mTo(x) === mTo(m)); };
  const caps = p => p.moves().filter(m => !E.isPass(m) && p.at(mTo(m)));
  // ⑤ the pool
  const pool = [];
  LS.steps.forEach(st => st.problems.forEach((q, j) => pool.push([`lesson ${st.id} q${j + 1}`, brd(q.s)])));
  for (const f of ['lesson_mate1.json', 'lesson_mate2.json']) { try { JSON.parse(fs.readFileSync(path.join(ROOT, 'janggi/tools', f), 'utf8')).forEach((q, j) => pool.push([`${f} ${j + 1}`, brd(q.s)])); } catch (e) {} }
  PZ.themes.forEach(th => th.puzzles.forEach((q, j) => pool.push([`puzzle ${th.id} ${j + 1}`, brd(q.s)])));
  XL.steps.forEach(st => st.problems.forEach((q, j) => pool.push([`xiangqi lesson ${st.id} ${j + 1}`, brd(q.s)])));
  XP.themes.forEach(th => th.puzzles.forEach((q, j) => pool.push([`xiangqi ${th.id} ${j + 1}`, brd(q.s)])));
  const plain = t => String(t).replace(/<[^>]+>/g, '').replace(/[\u0001\u0002]/g, '');
  const deep = opt && opt.deep;
  LS.steps.forEach((st, si) => { const id = st.id; if (!DONE.includes(id)) return; const K = JL.KIND[id];
    if (!K) { add(id, -1, '④ no piece kind for the step'); return; }
    if (!JL.INTRO[id]) add(id, -1, '⑧ no 3D intro');
    let prevD = -1, firstD = null; const capT = new Set(), asks = new Set();
    st.problems.forEach((P, j) => { const a = m => add(id, j, m), p = E.Pos.from(P.s), all = p.moves(), nm = m => E.name(p, m);
      if (p.side !== 0) a('⑧ the side to move is not 楚');
      const sm = new Map(P.sc || []); if (sm.size !== (P.sc || []).length) a('⑨ a move is valued twice');
      all.forEach(m => { if (!sm.has(m)) a(`⑨ ${nm(m)} has no value`); }); (P.sc || []).forEach(([m]) => { if (!all.includes(m)) a(`⑨ a valued move ${m} is not legal`); });
      if (!all.includes(P.best)) { a('① the answer is not legal'); return; }
      const goal = caps(p).filter(m => T(p.at(mFrom(m))) === K && T(p.at(mTo(m))) !== E.KING && !takeBack(p, m));
      if (!goal.includes(P.best)) a(`① the answer ${nm(P.best)} is not a capture by the step's piece that cannot be taken back`);
      goal.filter(m => m !== P.best).forEach(m => a(`② ${nm(m)} also takes a piece that cannot be taken back`));
      const S = P.sc.slice().sort((x, y) => y[1] - x[1]);
      if (S[0][0] !== P.best) a(`① the stored values prefer ${nm(S[0][0])}`);
      else if (S.length > 1) { if (S[0][1] - S[1][1] < 100) a(`② the second move ${nm(S[1][0])} is only ${S[0][1] - S[1][1]} worse`); if (pts(P, S[1][0]) >= 16) a(`② the second move ${nm(S[1][0])} scores ${pts(P, S[1][0])}`); }
      if (Math.abs(S[0][1]) > WINT - 1000) a('④ a won / lost position (mate in the values)');
      if (deep) { const r = E.analyze(P.s, [], deep).list.sort((x, y) => y.v - x.v); if (r[0].m !== P.best) a(`① a fresh search (${deep} ms) prefers ${nm(r[0].m)}`); else if (r.length > 1 && r[0].v - r[1].v < 100) a(`② a fresh search: the second move is only ${r[0].v - r[1].v} worse`); }
      const wrongCaps = caps(p).filter(m => m !== P.best && T(p.at(mTo(m))) !== E.KING);
      const trapK = wrongCaps.filter(m => takeBack(p, m) && (K === 7 ? PTS[T(p.at(mFrom(m)))] > PTS[T(p.at(mTo(m)))] : T(p.at(mFrom(m))) === K));
      if (all.length < 3) a(`③ ${all.length} legal moves`);
      if (!wrongCaps.length) a('③ the answer is the only capture on the board');
      if (j >= 2 && !trapK.length) a(`③ problem ${j + 1}: no capture that is taken back (the lesson's trap)`);
      const ct = T(p.at(mTo(P.best))), cv = PTS[ct];
      if (cv < 3) a('④ the answer takes a 兵'); if (p.inCheck()) a('④ the mover is in check');
      caps(p).filter(m => m !== P.best && !takeBack(p, m) && PTS[T(p.at(mTo(m)))] >= cv && T(p.at(mTo(m))) !== E.KING).forEach(m => a(`④ ${nm(m)} takes as much for nothing`));
      capT.add(ct);
      const B = brd(P.s); for (const [who, b] of pool) { if (who === `lesson ${id} q${j + 1}`) continue; const e = dist(B, b); if (e <= 4) a(`⑤ ${e} points from ${who}`); }
      const d = wrongCaps.length + trapK.length;
      if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d); if (firstD === null) firstD = d;
      if (j === st.problems.length - 1 && !(d > firstD)) a(`⑥ the last problem is no harder than problem 1 (d ${d} vs ${firstD})`);
      // ⑦⑧ the 3D words
      let W; try { W = JL.lsJa(E, st, P, j, k => k === 'ok' ? '〈正〉' : '〈誤〉', si); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
      asks.add(plain(W.ask));
      const AC = JL.NM(ct, false), NMv = ['車', '馬', '包', '象', '士', '卒', '兵', '将'];
      const BAD = t => { const x = plain(t); if (/\{|undefined|NaN|null/.test(x)) a(`⑧ 「${x}」`); if (/(です|ます|ません|ました|でしょう)(?=[。！？]|$)/m.test(x)) a(`⑧ polite 「${x}」`); if (/シャンチー|チェス|帥|炮|仕|相（|九宮の外/.test(x)) a(`⑧ another game's words 「${x}」`); };
      [W.ask, W.hintTx].forEach(BAD);
      if (!plain(W.hintTx).includes(JL.NM(K, true))) a(`⑧ the hint does not name the step's piece 「${plain(W.hintTx)}」`);
      const g = plain(W.good(P.best)); BAD(g);
      if (!g.includes(AC) || !g.includes(PTS[ct] + '点')) a(`⑧ the praise 「${g}」 does not name the ${AC} (${PTS[ct]}点) taken`);
      for (const n2 of NMv) if (n2 !== AC && g.includes(n2)) a(`⑧ the praise 「${g}」 names a ${n2}`);
      for (const u of all.concat([P.best])) { const raw = plain(W.ng(u)), x = u === P.best ? '(the answer)' : nm(u); BAD(raw);
        if (!raw.includes('〈誤〉') || !raw.includes('〈正〉')) { a(`⑦ ${x}: the words do not name both moves 「${raw}」`); continue; }
        const uu = u === P.best ? null : u; if (uu == null) continue;
        const t = raw.slice(0, raw.indexOf('〈正〉')), took = !E.isPass(u) && !!p.at(mTo(u)), c = took ? T(p.at(mTo(u))) : 0, mt = T(p.at(mFrom(u)));
        const back = t.match(/きみの(.)を取り返され|すぐに(.)が取り返され|取った(.)がそのまま取り返され/);
        if (back) { const b1 = back[1] || back[2] || back[3]; if (!took || !takeBack(p, u) || b1 !== JL.NM(mt, true)) a(`⑦ ${x}: 「${t}」 (no ${b1} of yours is taken back)`); }
        else if (took && takeBack(p, u)) a(`⑦ ${x}: taken back, the words do not say it 「${t}」`);
        if (/駒を取れない|取る手じゃない|取りそこね/.test(t) && took) a(`⑦ ${x}: 「${t}」 (it does take)`);
        if (!took && !/駒を取れない|取る手じゃない|取りそこね/.test(t)) a(`⑦ ${x}: takes nothing, the words do not say it 「${t}」`);
        const sm2 = t.match(/(.)は(\d+)点で?、(.)は(\d+)点|\((.)?(\d+)点\)止まり|（(\d+)点）止まり/);
        if (took && !takeBack(p, u)) { if (!sm2) a(`⑦ ${x}: a smaller free capture, the points are not said 「${t}」`); else if (!t.includes(JL.NM(c, false) + '（' + PTS[c] + '点）') && !t.includes(JL.NM(c, false) + 'は' + PTS[c] + '点')) a(`⑦ ${x}: the points of the ${JL.NM(c, false)} 「${t}」`);
          if (PTS[c] >= cv) a(`⑦ ${x}: 「${t}」 (it does not take less)`); }
        if (!raw.slice(raw.indexOf('〈正〉')).includes(AC)) a(`⑦ ${x}: the right move's piece is not named 「${raw}」`);
      }
    });
    if (capT.size < 2) add(id, 4, '④ every answer takes the same kind of piece');
    if (asks.size < st.problems.length) add(id, -1, '⑧ the same question twice in a lesson');
  });
  return out;
}

module.exports = { puzzles, lessons, checkOne, engine, brd, dist, pieces, THEME };
if (require.main === module) {
  const dp = process.argv.indexOf('--deep'), out = puzzles().concat(lessons({ deep: dp > 0 ? +process.argv[dp + 1] : 0 })), json = process.argv.indexOf('--json');
  if (json > 0) fs.writeFileSync(process.argv[json + 1], JSON.stringify(out, null, 1));
  const by = {}; for (const o of out) (by[o.step + ' ' + o.q] = by[o.step + ' ' + o.q] || []).push(o.msg);
  for (const k in by) console.log(k + ': ' + by[k].join(' / '));
  const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'janggi/puzzles.json'), 'utf8')), tot = P.themes.reduce((a, t) => a + t.puzzles.length, 0), badN = new Set(out.filter(o => o.q > 0 && /^puzzle /.test(o.step)).map(o => o.step + o.q)).size;
  console.log(`janggi puzzles: ${tot - badN}/${tot} pass` + (out.some(o => o.q <= 0) ? ' · general: ' + out.filter(o => o.q <= 0).length : ''));
  { const LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'janggi/lessons.json'), 'utf8')), w = {}; require('vm').runInNewContext(fs.readFileSync(path.join(ROOT, 'atlas/games/janggi-ls.js'), 'utf8'), { window: w });
    const D = w.AtlasJanggiLs.DONE, n = LS.steps.filter(s => D.includes(s.id)).reduce((a, s) => a + s.problems.length, 0), b = new Set(out.filter(o => /^lesson /.test(o.step) && o.q > 0).map(o => o.step + o.q)).size;
    console.log(`janggi lessons (${D.join('・')}): ${n - b}/${n} pass`); }
  process.exitCode = out.length ? 1 : 0;
}

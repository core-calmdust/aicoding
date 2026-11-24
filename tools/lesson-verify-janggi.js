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
    for (const k in need) for (const x of [].concat(V[k] || '')) if (!need[k].test(x)) add('-', -1, `⑧ the 3D line ${k} does not say what the board shows: ${x || '(none)'}`);   // (a list: every variant)
    for (const k in V) for (const x of [].concat(V[k])) if (/(です|ます|ません|ました)(?=[。！？]|$)/.test(x)) add('-', -1, `ショウギツネ: polite 「${x}」`);
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
  // 追42 a move off the solution (cls 'stray': not mated at once, a check if checks-only): the words after the defender's reply say
  // what that reply did on the board and whether a mate is still there (janggi/pzwhy.js; the 3D atlas/puzzles.js jgStray, the 2D
  // janggi/app.js puzzleMove). Every puzzle of 2 moves or more × every stray first move × every legal reply: the class read again from
  // the board on its own (a capture → the piece taken and the taker; a check → the general stepped out / another piece stopped it;
  // a quiet move → the general / another piece moved), the words of all 14 languages and ショウギツネ's say the names and leave no
  // placeholder; and per puzzle the first stray move with every reply: the solver's mate-within-the-rest decides reach / noreach.
  try { stray42(PZ, add); } catch (e) { add('-', -1, '追42 ' + e.message); }
  return opt && opt.facts ? { out, facts } : out;
}
function stray42(PZ, add, W0) {
  const E = engine(), W = W0 || require(path.join(ROOT, 'janggi/pzwhy.js'));
  const w3 = {}; new Function('window', fs.readFileSync(path.join(ROOT, 'atlas/games/janggi-pz.js'), 'utf8'))(w3);
  const OWN = (w3.AtlasJanggiPz.why || {}).ja;
  if (!OWN) { add('-', -1, '追42 no ショウギツネ words for the reply (AtlasJanggiPz.why.ja)'); return; }
  const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
  for (const lg of LANGS) for (const k of ['cap', 'esc', 'block', 'run', 'move', 'pass', 'reach', 'noreach']) if (!(W.T[lg] && W.T[lg][k])) add('-', -1, `追42 no 2D words ${lg}.${k}`);
  for (const k of ['cap', 'esc', 'block', 'run', 'move', 'pass', 'reach', 'noreach']) if (!(OWN[k] || []).length) add('-', -1, `追42 no ショウギツネ words ${k}`);
  const PRAISE = /調子|いいね|いい手|すごい|お見事|やったね|さすが|Nice|Good|Great/;
  for (const k in OWN) for (const x of OWN[k]) { if (PRAISE.test(x)) add('-', -1, `追42/追20 praise after a move off the line: ${x}`); if (/(です|ます|ません|ました)(?=[。！？]|$)/.test(x)) add('-', -1, `ショウギツネ: polite 「${x}」`); }
  // the ja words must claim exactly the class's fact: cap = 取; esc = 逃; block = 防|止; run/move = 動か; reach = まだ|残って; noreach = もう|ない
  const CLAIM = { cap: /取/, esc: /逃/, block: /防|止/, run: /動|寄せ/, move: /動|回し/, pass: /パス/, reach: /まだ|残って/, noreach: /もう|なく|ない/ };
  const NEVER = { cap: /逃げ|防/, esc: /取られ|取った/, block: /取られ|取った|逃げ/, run: /取られ|取った/, move: /取られ|取った/, reach: /詰まなく|ない/, noreach: /まだ/ };
  for (const k in CLAIM) for (const x of [].concat(OWN[k] || [], W.T.ja[k] || [])) { if (!CLAIM[k].test(x)) add('-', -1, `追42 ${k} 「${x}」 does not say its fact`); if (NEVER[k] && NEVER[k].test(x)) add('-', -1, `追42 ${k} 「${x}」 says another class's fact`); }
  let nMv = 0, nRe = 0, reach = 0, noreach = 0; const cnt = {};
  for (const T of PZ.themes || []) {
    const [, ck] = THEME[T.id] || [0, false];
    T.puzzles.forEach((P, j) => {
      if (P.n < 2) return;
      const a = msg => add(T.id, j, msg), pos = E.Pos.from(P.s);
      const L = E.puzzle(P.s, [], P.n, false, ck) || [];
      let first = true;
      for (const m of pos.moves()) {
        const e = L.find(x => x.m === m); if (e && e.need > 0 && e.need <= P.n) continue;   // (the solution)
        const mid = pos.clone().play(m); if (mid.status() !== 0) continue;
        if (ck && !mid.inCheck()) continue;   // (pz.bl.nock: taken back)
        if (mid.moves().some(x => mid.clone().play(x).status() === -1)) continue;   // (pz.bl.lose: taken back)
        nMv++;
        for (const r of mid.moves()) {
          nRe++;
          const w = W.why(E, mid, r), after = mid.clone().play(r);
          // the class on its own: from the board before and after the reply
          let k;
          if (E.isPass(r)) k = 'pass';
          else { const taken = mid.at(E.mTo(r)); const kingMv = E.typeOf(mid.at(E.mFrom(r))) === E.KING;
            k = taken ? 'cap' : mid.inCheck() ? (kingMv ? 'esc' : 'block') : (kingMv ? 'run' : 'move');
            if (k === 'cap') { if (!w.p || w.p.t !== E.typeOf(taken) || E.colorOf(taken) === mid.side) a('追42 the piece taken is not named right'); if (!w.b || w.b.t !== E.typeOf(mid.at(E.mFrom(r)))) a('追42 the taker is not named right'); }
            if ((k === 'esc' || k === 'block') && after.attacked(mid.side)) a('追42 the check is not out after ' + k); }
          if (w.k !== k) { a(`追42 reply class ${w.k} but the board says ${k}`); continue; }
          cnt[k] = (cnt[k] || 0) + 1;
          for (const lg of LANGS) { const t = W.say(lg, w, true, 2) + W.say(lg, w, false, 2); if (/[{}]|undefined|null/.test(t)) a(`追42 ${lg} words with a placeholder: ${t}`); }
          const t3 = W.say('ja', w, null, 0, OWN, nRe);
          if (k === 'cap' && !(t3.includes(W.name('ja', w.p.t, w.p.c)) && t3.includes(W.name('ja', w.b.t, w.b.c)))) a('追42 ショウギツネ does not name the pieces: ' + t3);
          if ((k === 'block' || k === 'move') && !t3.includes(W.name('ja', w.b.t, w.b.c))) a('追42 ショウギツネ does not name the piece moved: ' + t3);
        }
        if (first) {   // the solver: is a mate still there in n − 1 after each reply? (= the runner's xqReq(p, left, false), need ≤ left)
          first = false;
          for (const r of mid.moves()) { const R = E.puzzle(P.s, [m, r], P.n - 1, false, ck) || [], ok = R.some(x => x.need > 0 && x.need <= P.n - 1); ok ? reach++ : noreach++; }
        }
      }
    });
  }
  const p3 = fs.readFileSync(path.join(ROOT, 'atlas/puzzles.js'), 'utf8'), app = fs.readFileSync(path.join(ROOT, 'janggi/app.js'), 'utf8');
  if (!/const L = await xqReq\(p, left, false\);[^\n]*\n\s*const reach = \(L \|\| \[\]\)\.some\(e => e\.need > 0 && e\.need <= left\)/.test(p3)) add('-', -1, '追42 the 3D jgStray does not ask the solver for the moves left');
  if (!/return jgStray\(p, mid, r\)/.test(p3)) add('-', -1, '追42 the 3D xqMoved does not call jgStray for janggi');
  if (!/W\.why\(E, b2, res\.move\)/.test(app) || !/reach = \(L2 \|\| \[\]\)\.some\(x => x\.need > 0 && x\.need <= left2\)/.test(app)) add('-', -1, '追42 the 2D puzzleMove does not say the reply\'s fact');
  stray42.stats = { moves: nMv, replies: nRe, cnt, reach, noreach };
}

// (2026-11-24 担当D) the lessons on the 3D table (atlas/games/janggi-ls.js DONE: the capture basics b_rook・b_horse・b_elephant・b_cannon・b_pawn), as
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
  // 追39 the heading over a wrong move with a few points (a move that loses a piece scores 2〜9): 「いい線いってる！」 only from half the points up
  if (!/p\.own \? \(pts >= 10 \? 'いい線いってる！' : 'おしい！'\)/.test(src)) add('-', -1, '追39 the 3D heading praises a wrong move with a few points (いい線いってる！ under 10)');
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
  // (2026-11-24 担当D) the mate steps (JL.MATE: b_mate1 = 1, m_mate2 = 2, m_mate3 = 3; P.ok = the one first move): ①②③ by the solver
  //  (checkOne: the stored move mates within n, exactly n, no other first move does, no wrong move mates at once, 3 checks to choose
  //  from in mate in 1, other forcing moves in mate in n); ④ n = the step's, the side to move 楚, 追27 the answers move two kinds of
  //  piece or more; ⑤ the pool (a problem may be its own source in the reserve); ⑥ d = the pieces on the board never falls, the last
  //  above the first; ⑦⑧ ショウギツネ's words for the answer and every legal wrong move, against one ply of the board.
  const kingMv = (q, x) => T(q.at(mFrom(x))) === E.KING;
  function mateStep(st, si) {
    const id = st.id, NN = JL.MATE[id], END = NN === 'n', kinds = new Set(), asks = new Set(), dirs = new Set(), ckA = new Set(); let prevD = -1, firstD = null;
    if (!JL.INTRO[id]) add(id, -1, '⑧ no 3D intro');
    st.problems.forEach((P, j) => { const a = m => add(id, j, m), p = E.Pos.from(P.s), all = p.moves(), nm = m => E.name(p, m);
      // (the endgames, MATE 'n': n is the problem's own P.n = the fastest mate, checked exact by checkOne; ④ the step's material:
      //  e_rook 楚 将・車・馬 against 漢 将・士; e_pawn 楚 将・卒・卒 against 漢 将・士)
      const N = END ? P.n : NN;
      if (END && !(Number.isInteger(N) && N >= 2 && N <= 6)) { a('④ the endgame has no mate count P.n (2〜6)'); return; }
      if (END) { const MAT = { e_rook: ['KNR', 'ak|aak'], e_pawn: ['KPP', 'ak|aak'] }[id], pc = P.s.split(' ')[0].replace(/[\d/]/g, '').replace(/H/g, 'N').replace(/h/g, 'n');
        const mine = pc.replace(/[a-z]/g, '').split('').sort().join(''), his = pc.replace(/[A-Z]/g, '').split('').sort().join('');
        if (!MAT || mine !== MAT[0] || !new RegExp('^(' + MAT[1] + ')$').test(his)) a(`④ the material ${mine} / ${his} is not the step's`); }
      if (p.side !== 0) a('⑧ the side to move is not 楚');
      if (!P.ok || P.ok.length !== 1 || P.ok[0] !== P.best) a('② the stored answers are not the one move P.best');
      if (!all.includes(P.best)) { a('① the answer is not legal'); return; }
      const r = checkOne({ s: P.s, a: P.best, n: N }, false, N); r.bad.forEach(a);
      kinds.add(T(p.at(mFrom(P.best))));
      { const f = mFrom(P.best), t = mTo(P.best), dr = ((t / 9) | 0) - ((f / 9) | 0), dc = t % 9 - f % 9; dirs.add(dr && dc ? 'diag' : dr ? 'line' : 'side'); ckA.add(p.clone().play(P.best).inCheck()); }
      const B = brd(P.s); for (const [who, b] of pool) { if (who === `lesson ${id} q${j + 1}`) continue; const e = dist(B, b); if (e <= 4 && !(e === 0 && /^lesson_mate/.test(who))) a(`⑤ ${e} points from ${who}`); }
      const d = END ? N : pieces(P.s); if (d < prevD) a(`⑥ fewer pieces than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d); if (firstD === null) firstD = d;
      if (j === st.problems.length - 1 && !(d > firstD)) a(`⑥ the last problem is no harder than problem 1 (d ${d} vs ${firstD})`);
      let W; try { W = JL.lsJa(E, st, P, j, k => k === 'ok' ? '〈正〉' : '〈誤〉', si); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
      if (!W || !W.own) { a('⑧ no own words'); return; }
      asks.add(plain(W.ask));
      const AM = JL.NM(T(p.at(mFrom(P.best))), true), ck = m => p.clone().play(m).inCheck(), aq = !ck(P.best);
      const BAD = x0 => { const x = plain(x0); if (/\{|undefined|NaN|null/.test(x)) a(`⑧ 「${x}」`); if (/(です|ます|ません|ました|でしょう|ましょう|ですか|ますか)(?=[。！？]|$)/m.test(x)) a(`⑧ polite 「${x}」`); if (/シャンチー|チェス|帥|炮|仕|相（|詰将棋|玉/.test(x)) a(`⑧ another game's words 「${x}」`); };
      [W.ask, W.hintTx].forEach(BAD);
      for (const x of [W.ask, W.hintTx]) for (const m of plain(x).matchAll(/(\d+)手(?=で詰|目までに|の詰み)/g)) if (+m[1] !== N) a(`⑧ 「${plain(x)}」 says ${m[1]} moves (${N})`);
      if (!plain(W.hintTx).includes(AM)) a(`⑧ the hint does not name the answer's piece ${AM} 「${plain(W.hintTx)}」`);
      const g = plain(W.good(P.best)); BAD(g);
      if (!g.includes(AM)) a(`⑧ the praise 「${g}」 does not name the ${AM}`);
      const QW = /静か|王手じゃない|王手をかけず|王手をかけない/, nCk = all.filter(ck).length, nRe = p.clone().play(P.best).moves().filter(x => !E.isPass(x)).length;
      if (QW.test(g) !== (N > 1 && aq)) a(`⑧ the praise 「${g}」: the answer is ${aq ? 'quiet' : 'a check'}`);
      if (!/詰/.test(g)) a(`⑧ the praise 「${g}」 does not say mate`);
      // the numbers the words claim: the count of moves to mate, the checks there were (mate in 1), the opponent's replies after it
      for (const m of g.matchAll(/(\d+)手(目までに|の詰み)/g)) if (+m[1] !== N) a(`⑧ the praise 「${g}」 says ${m[1]} moves (${N})`);
      for (const m of g.matchAll(/王手は(\d+)通り|(\d+)つの王手から/g)) if (+(m[1] || m[2]) !== nCk) a(`⑧ the praise 「${g}」: ${nCk} checks`);
      for (const m of g.matchAll(/ほかの(\d+)つの王手/g)) if (+m[1] !== nCk - 1) a(`⑧ the praise 「${g}」: ${nCk - 1} other checks`);
      for (const m of g.matchAll(/受けは(\d+)通り|(\d+)通りの(受け|手)/g)) if (+(m[1] || m[2]) !== nRe) a(`⑧ the praise 「${g}」: ${nRe} replies`);
      if (/九宮のどこへも動けない/.test(g) && (N !== 1 || p.clone().play(P.best).moves().some(x => !E.isPass(x) && kingMv(p.clone().play(P.best), x)))) a(`⑧ the praise 「${g}」: the general can move`);
      for (const u of all.concat([P.best])) { const raw = plain(W.ng(u)); BAD(raw);
        if (!raw.includes('〈正〉')) { a(`⑦ ${nm(u)}: the right move is not named 「${raw}」`); continue; }
        const rt = raw.slice(raw.indexOf('〈正〉'));
        if (!rt.includes(AM)) a(`⑦ the right move's piece ${AM} is not named 「${rt}」`);
        if (N > 1 && /静か|王手じゃない|王手をかけず|王手をかけない/.test(rt) !== aq) a(`⑦ 「${rt}」: the answer is ${aq ? 'quiet' : 'a check'}`);
        for (const m of rt.matchAll(/(\d+)手(目までに|の詰み)/g)) if (+m[1] !== N) a(`⑦ 「${rt}」 says ${m[1]} moves (${N})`);
        for (const m of rt.matchAll(/(\d+)つの王手/g)) if (+m[1] !== all.filter(ck).length) a(`⑦ 「${rt}」: the checks`);
        if (u === P.best) continue;
        if (!raw.includes('〈誤〉')) { a(`⑦ ${nm(u)}: the words do not name your move 「${raw}」`); continue; }
        const t = raw.slice(0, raw.indexOf('〈正〉')), q = p.clone().play(u), R = q.moves().filter(x => !E.isPass(x));
        const lose = R.some(x => q.clone().play(x).status() === -1), isC = q.inCheck();
        if (N > 1 && /1手で詰まされ|1手で詰ませる手/.test(t) !== lose) a(`⑦ ${nm(u)}: 「${t}」 (the opponent ${lose ? 'has' : 'has no'} mate in 1)`);
        if (N === 1 && /詰まされ/.test(t)) a(`⑦ ${nm(u)}: 「${t}」 (mate in 1 has no such class)`);
        const said = /は王手だけど|で王手しても|の王手は惜しい|王手をかけても|王手はかかる/.test(t), notC = /王手になっていない|王手がかからない|うまく受けられ|しのぐ受け|を取られる手があって|が取られる形/.test(t);
        if (!(N > 1 && lose)) { if (said !== isC || notC === isC) a(`⑦ ${nm(u)}: 「${t}」 (it is ${isC ? '' : 'not '}a check)`);
          if (N > 1 && !t.includes(N + '手では詰まない')) a(`⑦ ${nm(u)}: 「${t}」 does not say no mate in ${N}`); }
        // a quiet move that leaves a piece to be taken: said iff a reply captures, and the piece named is the most valuable one
        if (N > 1 && !lose && !isC) { let hv = 0; for (const x of R) if (q.at(mTo(x))) { const k = T(q.at(mTo(x))); if (PTS[k] > PTS[hv]) hv = k; }
          const hs = /を取られる手があって|が取られる形/.test(t);
          if (hs !== !!hv) a(`⑦ ${nm(u)}: 「${t}」 (${hv ? 'a piece can be taken' : 'nothing can be taken'})`);
          else if (hs && !t.includes(JL.NM(hv, true) + (/を取られる手/.test(t) ? 'を取られる手' : 'が取られる'))) a(`⑦ ${nm(u)}: 「${t}」 names the wrong piece (${JL.NM(hv, true)})`); }
        if (said && isC && !(N > 1 && lose)) { const k = R.some(x => kingMv(q, x)), c = R.some(x => mTo(x) === mTo(u));
          const e = /将が逃げられ/.test(t) ? 'k' : /を取られ/.test(t) ? 'c' : /防がれ/.test(t) ? 'b' : '';
          if (e !== (k ? 'k' : c ? 'c' : 'b')) a(`⑦ ${nm(u)}: 「${t}」 (the general ${k ? 'escapes' : c ? 'takes the checker' : 'is covered'})`);
          if (e === 'c' && !t.includes(`王手した${JL.NM(T(p.at(mFrom(u))), true)}を`)) a(`⑦ ${nm(u)}: 「${t}」 names the wrong piece`); }
      }
    });
    // 追27 two kinds of piece among the answers — but an endgame of one kind of piece (e_pawn: 卒2つ) cannot (追31): there the answers
    // move two ways or more (straight / sideways / diagonal), and every endgame has both a check and a quiet answer
    const one = END && st.problems.every(P => new Set(P.s.split(' ')[0].replace(/[^A-Z]/g, '').replace(/K/g, '').replace(/H/g, 'N')).size === 1);
    if (!one && kinds.size < 2) add(id, 4, '追27 every answer moves the same kind of piece');
    if (one && dirs.size < 2) add(id, 4, '追31 every answer of a one-piece endgame moves the same way');
    if (END && ckA.size < 2) add(id, 4, `追31 every answer of the endgame is ${ckA.has(true) ? 'a check' : 'quiet'}`);
    if (asks.size < st.problems.length) add(id, -1, '⑧ the same question twice in a lesson');
  }

  // (2026-11-24 担当D) b_escape 「ねらわれた駒を逃げる」, every problem (its own count of the facts, not the 3D words' code):
  //  the danger = a piece of 楚 the opponent wins something on (a static exchange on its point: the cheapest taker first, either side
  //  may stop). ④ not in check, exactly one piece in danger — a 車・包・馬 — and nothing of 漢 to win for 楚 (the lesson is the escape,
  //  not a counter-capture); the answers move two kinds of piece or more. ①② the goal set = the legal moves after which nothing of 楚
  //  is in danger and 漢 has no mate in 1 — the answer alone, a quiet move (no capture, no check) of the piece in danger; the stored
  //  values put it alone on top, 100 or more ahead, the second scoring under 16 (and --deep agrees). ③ 3 legal moves or more; 追34 the
  //  piece the question names has 3 wrong moves or more; from problem 3 a trap: a move of the piece out of reach of every piece that
  //  attacks it now, that still loses something. ⑤ the pool. ⑥ d = the piece's wrong moves + traps grows, the last above the first.
  //  ⑦⑧ the words for every legal move: the piece lost and its cheapest taker (「逃げた先の」 only when the moved piece is taken where
  //  it went), 「1手で詰まされ」 iff 漢 has a mate in 1; the question names the piece and one of its attackers; the praise the count of
  //  the piece's moves; the hint the piece.
  const SV2 = { 1: 1000, 2: 3, 3: 3, 4: 5, 5: 13, 6: 7, 7: 2 };
  function exch(q, s) {   // the gain of the side to move in q from taking on s, by the swap list
    const gains = []; let r = q.clone(), on = r.at(s); if (!on || T(on) === E.KING || E.colorOf(on) === r.side) return 0;
    for (let k = 0; k < 12; k++) { const L = r.moves().filter(m => !E.isPass(m) && mTo(m) === s); if (!L.length) break;
      let m = L[0]; for (const y of L) if (SV2[T(r.at(mFrom(y)))] < SV2[T(r.at(mFrom(m)))]) m = y;
      gains.push(SV2[T(r.at(s))]); r = r.clone().play(m); }
    let g = 0; for (let k = gains.length - 1; k >= 0; k--) g = Math.max(0, gains[k] - g); return g;
  }
  const lostOf = q => { const o = []; for (let s = 0; s < 90; s++) { const x = q.at(s); if (x && E.colorOf(x) !== q.side && T(x) !== E.KING && exch(q, s) > 0) o.push(s); } return o; };
  const turned = p => { const q = p.clone(); q.side ^= 1; q.rehash(); return q; };
  const m1 = q => q.moves().some(x => q.clone().play(x).status() === -1);
  function escStep(st) {
    const id = st.id, kinds = new Set(), asks = new Set(); let prevD = -1, firstD = null;
    if (!JL.INTRO[id]) add(id, -1, '⑧ no 3D intro');
    st.problems.forEach((P, j) => { const a = m => add(id, j, m), p = E.Pos.from(P.s), all = p.moves(), nm = m => E.name(p, m);
      if (p.side !== 0) a('⑧ the side to move is not 楚');
      if (p.inCheck()) a('④ the mover is in check');
      const sm = new Map(P.sc || []); if (sm.size !== (P.sc || []).length) a('⑨ a move is valued twice');
      all.forEach(m => { if (!sm.has(m)) a(`⑨ ${nm(m)} has no value`); }); (P.sc || []).forEach(([m]) => { if (!all.includes(m)) a(`⑨ a valued move ${m} is not legal`); });
      if (!all.includes(P.best)) { a('① the answer is not legal'); return; }
      const z = turned(p), D = lostOf(z);
      if (D.length !== 1) { a(`④ ${D.length} pieces in danger (one)`); if (!D.length) return; }
      const h = D[0], ht = T(p.at(h)); if (![4, 5, 6].includes(ht)) a(`④ the piece in danger is a ${JL.NM(ht, true)} (車・包・馬)`);
      if (lostOf(p).length) a('④ 楚 has something to win (a counter-capture)');
      kinds.add(ht);
      const G = all.filter(u => { const q = p.clone().play(u); return !lostOf(q).length && !m1(q); });
      if (!G.includes(P.best)) a(`① the answer ${nm(P.best)} leaves something in danger`);
      G.filter(u => u !== P.best).forEach(u => a(`② ${nm(u)} also saves everything`));
      if (mFrom(P.best) !== h) a('④ the answer does not move the piece in danger');
      if (p.at(mTo(P.best)) || p.clone().play(P.best).inCheck()) a('④ the answer is not a quiet move');
      const S = (P.sc || []).slice().sort((x, y) => y[1] - x[1]);
      if (!S.length || S[0][0] !== P.best) a(`① the stored values prefer ${S.length ? nm(S[0][0]) : '(none)'}`);
      else if (S.length > 1) { if (S[0][1] - S[1][1] < 100) a(`② the second move ${nm(S[1][0])} is only ${S[0][1] - S[1][1]} worse`); if (pts(P, S[1][0]) >= 16) a(`② the second move scores ${pts(P, S[1][0])}`); }
      if (S.length && Math.abs(S[0][1]) > WINT - 1000) a('④ a won / lost position');
      if (deep) { const r = E.analyze(P.s, [], deep).list.sort((x, y) => y.v - x.v); if (r[0].m !== P.best) a(`① a fresh search (${deep} ms) prefers ${nm(r[0].m)}`); else if (r.length > 1 && r[0].v - r[1].v < 100) a(`② a fresh search: the second move is only ${r[0].v - r[1].v} worse`); }
      if (all.length < 3) a(`③ ${all.length} legal moves`);
      const hm = all.filter(m => mFrom(m) === h); if (hm.length - 1 < 3) a(`追34 the ${JL.NM(ht, true)} in danger has ${hm.length - 1} wrong moves`);
      const att = z.moves().filter(m => !E.isPass(m) && mTo(m) === h).map(mFrom);
      const traps = hm.filter(u => { if (u === P.best) return false; const q = p.clone().play(u); return !q.moves().some(x => mTo(x) === mTo(u) && att.includes(mFrom(x))) && (lostOf(q).length || m1(q)); });
      if (j >= 2 && !traps.length) a(`③ problem ${j + 1}: no trap (a move out of the attacker's reach that still loses)`);
      const B = brd(P.s); for (const [who, b] of pool) { if (who === `lesson ${id} q${j + 1}`) continue; const e = dist(B, b); if (e <= 4) a(`⑤ ${e} points from ${who}`); }
      const d = hm.length - 1 + traps.length; if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d); if (firstD === null) firstD = d;
      if (j === st.problems.length - 1 && !(d > firstD)) a(`⑥ the last problem is no harder than problem 1 (d ${d} vs ${firstD})`);
      // ⑦⑧ the words
      let W; try { W = JL.lsJa(E, st, P, j, k => k === 'ok' ? '〈正〉' : '〈誤〉', 0); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
      if (!W || !W.own) { a('⑧ no own words'); return; }
      const HN = JL.NM(ht, true), attN = new Set(att.map(s => JL.NM(T(z.at(s)), false)));
      const BAD = x0 => { const x = plain(x0); if (/\{|undefined|NaN|null|駒駒/.test(x)) a(`⑧ 「${x}」`); if (/(です|ます|ません|ました|でしょう|ましょう|ですか|ますか)(?=[。！？]|$)/m.test(x)) a(`⑧ polite 「${x}」`); if (/シャンチー|チェス|帥|炮|仕|相（|詰将棋|玉/.test(x)) a(`⑧ another game's words 「${x}」`); };
      [W.ask, W.hintTx].forEach(BAD); asks.add(plain(W.ask));
      if (!plain(W.ask).includes(HN)) a(`⑧ the question does not name the ${HN}`);
      for (const mm of plain(W.ask).matchAll(/相手の(.)が|を(.)に取られ|(.)のねらい/g)) { const x = mm[1] || mm[2] || mm[3]; if (!attN.has(x)) a(`⑧ the question names a ${x} attacking (${[...attN]})`); }
      if (!plain(W.hintTx).includes(HN)) a(`⑧ the hint does not name the ${HN}`);
      const g = plain(W.good(P.best)); BAD(g); if (!g.includes(HN)) a(`⑧ the praise does not name the ${HN}`);
      for (const mm of g.matchAll(/行き先は(\d+)つ|(\d+)つの行き先|行き先(\d+)つ/g)) if (+(mm[1] || mm[2] || mm[3]) !== hm.length) a(`⑧ the praise 「${g}」: the ${HN} has ${hm.length} moves`);
      for (const u of all.concat([P.best])) { const raw = plain(W.ng(u)); BAD(raw);
        if (!raw.includes('〈正〉') || !raw.slice(raw.indexOf('〈正〉')).includes(HN)) { a(`⑦ ${nm(u)}: the right move / the ${HN} not named 「${raw}」`); continue; }
        if (u === P.best) continue;
        if (!raw.includes('〈誤〉')) { a(`⑦ ${nm(u)}: your move not named 「${raw}」`); continue; }
        const t = raw.slice(0, raw.indexOf('〈正〉')), q = p.clone().play(u), mt = m1(q), Lq = lostOf(q);
        if (/1手で詰ま/.test(t) !== mt) { a(`⑦ ${nm(u)}: 「${t}」 (漢 ${mt ? 'has' : 'has no'} mate in 1)`); continue; }
        if (mt) continue;
        if (!Lq.length) { a(`⑦ ${nm(u)}: nothing is lost after it, yet it is wrong`); continue; }
        const said = t.match(/(.)を相手の(.)に取られ|(.)が相手の(.)に取られ|(.)は相手の(.)に取られ|相手の(.)に取られちゃう|そこには相手の(.)が届く|相手の(.)の利き/);
        if (!said) { a(`⑦ ${nm(u)}: 「${t}」 names no taker`); continue; }
        const taker = said[2] || said[4] || said[6] || said[7] || said[8] || said[9], lostN = said[1] || said[3] || said[5] || HN;
        const okSay = Lq.some(s => JL.NM(T(q.at(s)), true) === lostN && q.moves().some(x => !E.isPass(x) && mTo(x) === s && JL.NM(T(q.at(mFrom(x))), false) === taker));
        if (!okSay) a(`⑦ ${nm(u)}: 「${t}」 (the ${taker} cannot win the ${lostN})`);
        if (/逃げた先|逃げても|逃げ先は/.test(t) && !(mFrom(u) === h && Lq.includes(mTo(u)))) a(`⑦ ${nm(u)}: 「${t}」 (the moved ${HN} is not lost where it went)`);
        if (/助けられない|取られたまま|ねらいが消えない/.test(t) && !(mFrom(u) !== h && Lq.includes(h))) a(`⑦ ${nm(u)}: 「${t}」 (the ${HN} is not left in danger)`);
      }
    });
    if (kinds.size < 2) add(id, 4, '④ every problem saves the same kind of piece');
    if (asks.size < st.problems.length) add(id, -1, '⑧ the same question twice in a lesson');
  }

  // (2026-11-24 担当D) t_capture 「得な交換」: net(u) = the points of the piece u takes − the opponent's best exchange afterwards (the swap
  //  list, exch) — −99 after a mate in 1 for 漢. ① the moves with net > 0 = the answer alone; ④ the answer takes a guarded 馬・車・包
  //  (5点 or more) with a cheaper piece, the opponent wins back just that piece (the simple swap) and nothing else, nothing of 楚 is in
  //  danger before, 楚 not in check, 追27 two kinds of taker and of piece taken; ② the stored values: alone on top, 100 ahead, the
  //  second under 16; ③ 3 legal moves, another capture, from problem 3 a trap (a capture taken back that wins nothing); 追34 the hinted
  //  piece (the gold ring = the answer's mover) has 3 wrong moves or more; ⑤ the pool; ⑥ d = the wrong captures + the traps;
  //  ⑦⑧ the words of the answer and every legal wrong move against the board: the piece taken back and its taker, both points and the
  //  net said (損 n点 / とんとん), another piece lost and its taker, a quiet move said quiet, a mate in 1 iff there is one.
  function tradeStep(st) {
    const id = st.id, movT = new Set(), capT = new Set(), asks = new Set(); let prevD = -1, firstD = null;
    if (!JL.INTRO[id]) add(id, -1, '⑧ no 3D intro');
    const netOf = (p, u) => { const c = p.at(mTo(u)) && !E.isPass(u) ? T(p.at(mTo(u))) : 0, q = p.clone().play(u); if (m1(q)) return { q, c, net: -99, mx: null, m1: true };
      let mx = null, g = 0; for (const s of lostOf(q)) { const e = exch(q, s); if (e > g) { g = e; mx = s; } } return { q, c, net: PTS[c] - g, mx, g, m1: false }; };
    st.problems.forEach((P, j) => { const a = m => add(id, j, m), p = E.Pos.from(P.s), all = p.moves(), nm = m => E.name(p, m);
      if (p.side !== 0) a('⑧ the side to move is not 楚');
      if (p.inCheck()) a('④ the mover is in check');
      const sm = new Map(P.sc || []); if (sm.size !== (P.sc || []).length) a('⑨ a move is valued twice');
      all.forEach(m => { if (!sm.has(m)) a(`⑨ ${nm(m)} has no value`); }); (P.sc || []).forEach(([m]) => { if (!all.includes(m)) a(`⑨ a valued move ${m} is not legal`); });
      if (!all.includes(P.best)) { a('① the answer is not legal'); return; }
      if (lostOf(turned(p)).length) a('④ a piece of 楚 is in danger before the move');
      const R = new Map(all.map(u => [u, netOf(p, u)])), G = all.filter(u => R.get(u).net > 0);
      if (!G.includes(P.best)) a(`① the answer ${nm(P.best)} wins nothing (net ${R.get(P.best).net})`);
      G.filter(u => u !== P.best).forEach(u => a(`② ${nm(u)} also wins (net ${R.get(u).net})`));
      const A = R.get(P.best), mt = T(p.at(mFrom(P.best))), ct = A.c;
      if (!ct || PTS[ct] < 5) a('④ the answer does not take a 馬・車・包'); else if (PTS[mt] >= PTS[ct]) a('④ the taker is not cheaper than the piece taken');
      if (!takeBack(p, P.best) || A.mx !== mTo(P.best) || A.g !== PTS[mt]) a('④ the opponent does not win back just the taker (not the simple swap)');
      movT.add(mt); capT.add(ct);
      const S = (P.sc || []).slice().sort((x, y) => y[1] - x[1]);
      if (!S.length || S[0][0] !== P.best) a(`① the stored values prefer ${S.length ? nm(S[0][0]) : '(none)'}`);
      else if (S.length > 1) { if (S[0][1] - S[1][1] < 100) a(`② the second move ${nm(S[1][0])} is only ${S[0][1] - S[1][1]} worse`); if (pts(P, S[1][0]) >= 16) a(`② the second move scores ${pts(P, S[1][0])}`); }
      if (S.length && Math.abs(S[0][1]) > WINT - 1000) a('④ a won / lost position');
      if (deep) { const r = E.analyze(P.s, [], deep).list.sort((x, y) => y.v - x.v); if (r[0].m !== P.best) a(`① a fresh search (${deep} ms) prefers ${nm(r[0].m)}`); else if (r.length > 1 && r[0].v - r[1].v < 100) a(`② a fresh search: the second move is only ${r[0].v - r[1].v} worse`); }
      if (all.length < 3) a(`③ ${all.length} legal moves`);
      const wc = caps(p).filter(m => m !== P.best && T(p.at(mTo(m))) !== E.KING), traps = wc.filter(m => takeBack(p, m) && R.get(m).net <= 0);
      if (!wc.length) a('③ the answer is the only capture on the board');
      if (j >= 2 && !traps.length) a(`③ problem ${j + 1}: no trap (a capture taken back that wins nothing)`);
      { const rg = all.filter(m => T(p.at(mFrom(m))) === mt); if (rg.length - 1 < 3) a(`追34 the hinted ${JL.NM(mt, true)} has ${rg.length - 1} wrong moves`); }
      const B = brd(P.s); for (const [who, b] of pool) { if (who === `lesson ${id} q${j + 1}`) continue; const e = dist(B, b); if (e <= 4) a(`⑤ ${e} points from ${who}`); }
      const d = wc.length + traps.length; if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d); if (firstD === null) firstD = d;
      if (j === st.problems.length - 1 && !(d > firstD)) a(`⑥ the last problem is no harder than problem 1 (d ${d} vs ${firstD})`);
      // ⑦⑧ the words
      let W; try { W = JL.lsJa(E, st, P, j, k => k === 'ok' ? '〈正〉' : '〈誤〉', 0); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
      if (!W || !W.own) { a('⑧ no own words'); return; }
      const MA = JL.NM(mt, true), AC = JL.NM(ct, false), g0 = A.net;
      const BAD = x0 => { const x = plain(x0); if (/\{|undefined|NaN|null|駒駒|損の。/.test(x)) a(`⑧ 「${x}」`); if (/(です|ます|ません|ました|でしょう|ましょう|ですか|ますか)(?=[。！？]|$)/m.test(x)) a(`⑧ polite 「${x}」`); if (/シャンチー|チェス|帥|炮|仕|相（|詰将棋|玉/.test(x)) a(`⑧ another game's words 「${x}」`); };
      [W.ask, W.hintTx].forEach(BAD); asks.add(plain(W.ask));
      if (!plain(W.hintTx).includes(MA)) a(`⑧ the hint does not name the ${MA}`);
      const NMv = ['車', '馬', '包', '象', '士', '卒', '兵', '将'];
      const g = plain(W.good(P.best)); BAD(g);
      if (!g.includes(MA) || !g.includes(AC) || !g.includes(g0 + '点')) a(`⑧ the praise 「${g}」 does not name the ${MA}, the ${AC} and ${g0}点`);
      for (const mm of g.matchAll(/(\d+)点/g)) if (![PTS[mt], PTS[ct], g0].includes(+mm[1])) a(`⑧ the praise 「${g}」: ${mm[1]}点`);
      for (const n2 of NMv) if (n2 !== MA && n2 !== AC && g.includes(n2)) a(`⑧ the praise 「${g}」 names a ${n2}`);
      for (const u of all.concat([P.best])) { const raw = plain(W.ng(u)); BAD(raw);
        if (!raw.includes('〈正〉')) { a(`⑦ ${nm(u)}: the right move not named 「${raw}」`); continue; }
        const rt = raw.slice(raw.indexOf('〈正〉')); if (!rt.includes(MA) || !rt.includes(AC)) a(`⑦ ${nm(u)}: the right move's pieces not named 「${rt}」`);
        for (const mm of rt.matchAll(/(\d+)点/g)) if (![PTS[mt], PTS[ct], g0].includes(+mm[1])) a(`⑦ ${nm(u)}: 「${rt}」 ${mm[1]}点`);
        if (u === P.best) continue;
        if (!raw.includes('〈誤〉')) { a(`⑦ ${nm(u)}: your move not named 「${raw}」`); continue; }
        const t = raw.slice(0, raw.indexOf('〈正〉')), r = R.get(u), q = r.q, Lq = lostOf(q), took = !!r.c, um = T(p.at(mFrom(u)));
        if (/1手で詰ま/.test(t) !== r.m1) { a(`⑦ ${nm(u)}: 「${t}」 (漢 ${r.m1 ? 'has' : 'has no'} mate in 1)`); continue; }
        if (r.m1) continue;
        const quiet = /駒を取らない|駒を取れない|取る手じゃない|しそこね/.test(t); if (quiet === took) a(`⑦ ${nm(u)}: 「${t}」 (it ${took ? 'takes' : 'takes nothing'})`);
        if (took && !t.includes(JL.NM(r.c, false) + '（' + PTS[r.c] + '点）')) a(`⑦ ${nm(u)}: the piece taken and its points not said 「${t}」`);
        const canTake = (lost, by, s0) => (s0 == null ? Lq : [s0]).some(s => Lq.includes(s) && JL.NM(T(q.at(s)), true) === lost && q.moves().some(x => !E.isPass(x) && mTo(x) === s && JL.NM(T(q.at(mFrom(x))), false) === by));
        const bk = t.match(/きみの(.)（(\d+)点）を相手の(.)に取り返され|(.)（(\d+)点）が相手の(.)に取り返され|(.)（(\d+)点）を相手の(.)に取り返され/);
        if (bk) { const b1 = bk[1] || bk[4] || bk[7], bp = +(bk[2] || bk[5] || bk[8]), by = bk[3] || bk[6] || bk[9];
          if (!took || b1 !== JL.NM(um, true) || bp !== PTS[um] || !canTake(b1, by, mTo(u))) a(`⑦ ${nm(u)}: 「${t}」 (the ${b1} is not taken back by a ${by})`); }
        else if (took && Lq.includes(mTo(u)) && r.mx === mTo(u)) a(`⑦ ${nm(u)}: taken back, the words do not say it 「${t}」`);
        const ot = t.match(/こんどは(.)を相手の(.)に取られ|(.)が相手の(.)に取られる形|しかも(.)を相手の(.)に取られ|うえに、(.)が相手の(.)に取られ/);
        if (ot) { const lo = ot[1] || ot[3] || ot[5] || ot[7], by = ot[2] || ot[4] || ot[6] || ot[8]; if (!canTake(lo, by) || (took && r.mx === mTo(u))) a(`⑦ ${nm(u)}: 「${t}」 (the ${by} cannot win the ${lo})`); }
        if (!bk && !ot && Lq.length) a(`⑦ ${nm(u)}: a piece is lost after it, the words do not say it 「${t}」`);
        if (took) { const ls = t.match(/差し引き(\d+)点の損/), ev = /とんとん/.test(t);
          if (r.net < 0 ? !(ls && +ls[1] === -r.net) : r.net === 0 ? !ev : true) a(`⑦ ${nm(u)}: the net ${r.net} 「${t}」`); }
      }
    });
    if (movT.size < 2) add(id, 4, '追27 every answer takes with the same kind of piece');
    if (capT.size < 2) add(id, 4, '④ every answer takes the same kind of piece');
    if (asks.size < st.problems.length) add(id, -1, '⑧ the same question twice in a lesson');
  }
  LS.steps.forEach((st, si) => { const id = st.id; if (!DONE.includes(id) || (opt && opt.only && !opt.only.includes(id))) return; if (id === 't_capture') return tradeStep(st); if (JL.MATE && JL.MATE[id]) return mateStep(st, si); if (id === 'b_escape') return escStep(st); const K = JL.KIND[id];
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
      // 追17 the question names the piece (「象で取って」): among the moves of that kind of piece the answer is one, 3 wrong or more
      { const rg = all.filter(m => T(p.at(mFrom(m))) === K); if (rg.length - 1 < 3) a(`追17 the ${JL.NM(K, true)} the question names have ${rg.length} moves (${rg.length - 1} wrong): the question leaves almost no choice`); }
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
      const BAD = t => { const x = plain(t); if (/\{|undefined|NaN|null/.test(x)) a(`⑧ 「${x}」`); if (/(です|ます|ません|ました|でしょう|ましょう|ですか|ますか)(?=[。！？]|$)/m.test(x)) a(`⑧ polite 「${x}」`); if (/シャンチー|チェス|帥|炮|仕|相（|九宮の外/.test(x)) a(`⑧ another game's words 「${x}」`); };
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

module.exports = { puzzles, lessons, stray42, checkOne, engine, brd, dist, pieces, THEME };
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

#!/usr/bin/env node
// (2026-11-25 担当D) Fanorona on the 3D table: the puzzles (fanorona/puzzles.json — "win in N" and "win g pieces in N"; 2D
// fanorona/app.js puzzleMove, 3D atlas/puzzles.js BOOK.fanorona) checked with the game's own exhaustive puzzle search (engine.c
// puzzle(), the WebAssembly the page runs — the 2D and the 3D accept exactly its first moves).
// Every puzzle, ①〜⑨ and 追1〜 (claude/lesson-quality.md):
//  ① the stored answer is the only first move that reaches the goal within n own moves whatever the reply, and none reaches it in
//    fewer; no move is left undecided by the search budget (need < 0).
//  ② one first move only (by resulting position); every wrong first move needs n+1 or more (the gap, --rows).
//  ③ 4 legal moves or more, 3 wrong first moves or more (追72: the answer is at most a third of the moves).
//  ④ the theme: step1…step3 / end4 / end5 = "win" in 1…5; count = "gain 2 in 1" and another capture takes as many or more (the
//    biggest capture is not right — the recapture counts); chain = "gain 3 in 1" with a chain of 3 captures or more; gain2 = "gain 3
//    in 2". 追19: a "win in 1" has 4 capture moves or more to choose from.
//  ⑤ no two positions (the puzzles, the lesson problems and ramps) the same or one piece apart under the board's symmetries (the
//    two mirrors, the half turn, each with the colours swapped too); crowded positions (10 pieces or more on both) 4 points apart or
//    less; a position on another puzzle's main line (after a move and the reply) is the same puzzle again.
//  ⑥ easy → hard: d = wrong first moves + 2 × near misses (wrong first moves that win in n+1); each theme in 10-puzzle stages: each
//    stage's mean d at least the one before's, the last stage's mean above the first's.
//  ⑦⑧ every stage of the main line (the attacker's quickest winning move, the defender's reply fanorona/pzwhy.js pick — the 2D and
//    the 3D play the same reply): every wrong move — the last move: the words (pick / facts) say what is left (wLast, gShort, or the
//    recapture gBack); before it: the reply leaves no way to the goal within the moves left, and facts() names the board (the
//    pieces the reply took {r}, the opponent's pieces left {k}, taken {a} / lost {b}, the moves left {n}); 追20: the main line's
//    reply is not clearly worse than an equally stubborn one (the engine's analysis, 150 or more = a piece given away).
//  ⑨ the 2D says the same facts after a move off the solution (fanorona/app.js uses FanoronaPzWhy), never takes the move back nor
//    shows the right move by itself (the 詰め rule of the addendum); pz.why words and the 3D words in 14 languages; 追78 the 3D
//    words after a move off the solution do not open with a closeness word.
// Usage: node tools/lesson-verify-fanorona.js [--rows] [--selftest] [--file puzzles.json]   (also: node tools/lesson-verify.js fanorona)
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.resolve(__dirname, '..');
const E = require(path.join(ROOT, 'fanorona/engine.js'));
const W = require(path.join(ROOT, 'fanorona/pzwhy.js'));
const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
let X = null;
function init() {   // the page's engine.wasm with the endgame tables (tools/lib.js, synchronous)
  if (X) return;
  const inst = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(ROOT, 'fanorona/engine.wasm'))), { env: { now: () => Date.now(), progress: () => {} } });
  X = inst.exports;
  const b = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, 'fanorona/egdb.bin.gz'))); E.loadEG(X, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const nb = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, 'fanorona/evalnet.bin.gz'))); E.loadNet(X, nb.buffer.slice(nb.byteOffset, nb.byteOffset + nb.byteLength));
  E.attachWasm(X); E.setRule('sivy');
}
const lead = (p, me) => p.count(me) - p.count(3 - me);
const THEME = { step1: ['win', 1], step2: ['win', 2], step3: ['win', 3], end4: ['win', 4], end5: ['win', 5], count: ['gain', 1, 2], chain: ['gain', 1, 3], gain2: ['gain', 2, 3] };
// the board's symmetries on i = r * 9 + c (9 × 5): the mirrors c → 8 − c, r → 4 − r and the half turn; each also with the colours swapped
const GEO = [(r, c) => [r, c], (r, c) => [r, 8 - c], (r, c) => [4 - r, c], (r, c) => [4 - r, 8 - c]];
const symB = (b, f, sw) => { const o = Array(45).fill('.'); for (let i = 0; i < 45; i++) { const ch = b[i]; const [r, c] = f((i / 9) | 0, i % 9); o[r * 9 + c] = ch === '.' ? '.' : sw ? (ch === 'w' ? 'b' : 'w') : ch; } return o.join(''); };
const SYMS = []; GEO.forEach(f => [false, true].forEach(sw => SYMS.push([f, sw])));
const diff = (a, b) => { let n = 0; for (let i = 0; i < 45; i++) if (a[i] !== b[i]) n++; return n; };
const pcs = b => b.replace(/\./g, '').length;
// the puzzle search from a start and a line: [{ m, need }]
function solve(P, line, n, defend, g, base) {
  let goal = g; if (goal && !defend) goal = Math.max(1, goal - (lead(E.replay(P.s, line).pos, P.s.side) - base));
  return E.puzzle(P.s, line, n, defend, goal, base) || [];
}
const rkey = (P, line) => E.replay(P.s, line).pos.key();
function verify(opt) {
  opt = opt || {}; init();
  const PZ = opt.data || JSON.parse(fs.readFileSync(opt.file || path.join(ROOT, 'fanorona/puzzles.json'), 'utf8'));
  const LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'fanorona/lessons.json'), 'utf8'));
  const PICK = opt.pick || W.pick, FACTS = opt.facts || W.facts;
  const out = [], rows = [];
  const add = (id, j, m) => out.push({ theme: id, q: j + 1, msg: m });
  // ⑤ the pool
  const pool = [];
  PZ.themes.forEach(T => T.puzzles.forEach((P, j) => pool.push({ tag: T.id + '#' + (j + 1), b: P.s.b, side: P.s.side })));
  (LS.steps || []).forEach(st => [...(st.problems || []), ...(st.ramp || [])].forEach((P, j) => { const b = P && P.s && P.s.b; if (typeof b === 'string' && b.length === 45) pool.push({ tag: 'lesson ' + st.id + '#' + (j + 1), b, side: P.s.side }); }));
  const vars = pool.map(A => SYMS.map(([f, sw]) => ({ b: symB(A.b, f, sw), side: sw ? 3 - A.side : A.side })));
  for (let a = 0; a < pool.length; a++) for (let b = a + 1; b < pool.length; b++) {
    const A = pool[a], B = pool[b]; if (/^lesson/.test(A.tag) && /^lesson/.test(B.tag)) continue;
    const lim = pcs(A.b) >= 10 && pcs(B.b) >= 10 ? 4 : 1;
    if (vars[b].some(x => diff(A.b, x.b) <= lim && (diff(A.b, x.b) > 0 || x.side === A.side))) { const P = /^lesson/.test(B.tag) ? A : B, O = P === A ? B : A, [id, q] = P.tag.split('#'); add(id, +q - 1, `⑤ within ${lim} point(s) of ${O.tag}`); }
  }
  const starts = new Map(); PZ.themes.forEach(T => T.puzzles.forEach((P, j) => { for (const v of SYMS.map(([f, sw]) => symB(P.s.b, f, sw) + (sw ? 3 - P.s.side : P.s.side))) if (!starts.has(v)) starts.set(v, T.id + '#' + (j + 1)); }));
  for (const T of PZ.themes) {
    const th = THEME[T.id];
    if (!th) { add(T.id, -1, '④ unknown theme'); continue; }
    if (T.goal !== th[0] || (th[0] === 'gain' && T.g !== th[2])) add(T.id, -1, `④ the theme's goal ${T.goal}/${T.g}`);
    const ds = [];
    T.puzzles.forEach((P, j) => {
      const gain = T.goal === 'gain', g = gain ? (P.g || T.g) : 0, p0 = E.Pos.from(P.s), me = P.s.side, base = lead(p0, me);
      const reached = p => p.status() === -1 || (gain && !p.hasCaps() && lead(p, me) - base >= g);
      const r = { theme: T.id, j };
      if (P.n !== th[1]) add(T.id, j, `④ n ${P.n} ≠ the theme's ${th[1]}`);
      if (p0.turn !== me) add(T.id, j, '① the side to move is not the puzzle side');
      const L0 = solve(P, [], P.n, false, g, base), Lm = p0.moves();
      if (L0.some(x => x.need < 0)) add(T.id, j, '① the search budget left a move undecided');
      const good = L0.filter(x => x.need > 0 && x.need <= P.n);
      if (good.length !== 1) add(T.id, j, `②① ${good.length} first moves reach the goal (${good.map(x => x.need).join(',')})`);
      if (good.some(x => x.need < P.n)) add(T.id, j, `① a goal in ${Math.min(...good.map(x => x.need))} < n ${P.n}`);
      if (!good.some(x => E.same(p0, x.m, P.answer))) add(T.id, j, `① the stored answer ${P.answer} does not reach the goal`);
      if (L0.length !== Lm.length) add(T.id, j, `① the search lists ${L0.length} moves, the rules ${Lm.length}`);
      const wrong = Lm.filter(m => !good.some(x => E.same(p0, x.m, m)));
      if (Lm.length < 4) add(T.id, j, `③ ${Lm.length} legal moves`);
      if (wrong.length < 3) add(T.id, j, `③ ${wrong.length} wrong first moves`);
      if (good.length * 3 > Lm.length) add(T.id, j, `③追72 ${good.length} of ${Lm.length} moves are right`);
      // ④ the theme's promise
      const ans = good[0] ? good[0].m : P.answer, capA = W.capN(E, p0, ans);
      if (T.id === 'count' && !Lm.some(m => !E.same(p0, m, ans) && W.capN(E, p0, m) >= capA)) add(T.id, j, '④ the answer is simply the biggest capture (count the recapture)');
      if (T.id === 'chain' && !(String(ans).split('-').length >= 4)) add(T.id, j, '④ the answer is not a chain of 3 captures');
      if (th[0] === 'win' && P.n === 1 && Lm.filter(m => E.isCap(m)).length < 4) add(T.id, j, '④追19 fewer than 4 captures to choose from');
      // ② the gap and ⑥ d: wrong first moves that win (reach the goal) in n+1
      const L1 = solve(P, [], P.n + 1, false, g, base), near = wrong.filter(m => { const e = L1.find(x => E.same(p0, x.m, m)); return e && e.need === P.n + 1; }).length;
      const d = wrong.length + 2 * near; ds.push(d); Object.assign(r, { legal: Lm.length, good: good.length, near, d });
      // ⑦⑧ the main line, every stage
      const line = []; let used = 0, kinds = {};
      for (let s = 0; s < 12 && used < P.n; s++) {
        const pos = E.replay(P.s, line).pos, left = P.n - used;
        const Ls = s ? solve(P, line, left, false, g, base) : L0, gs = Ls.filter(x => x.need > 0 && x.need <= left);
        if (!gs.length) { add(T.id, j, `① the line breaks at stage ${used + 1}`); break; }
        for (const m of pos.moves()) {
          if (gs.some(x => E.same(pos, x.m, m))) continue;
          const mid = pos.clone().play(m);
          if (reached(mid)) { add(T.id, j, `⑧ stage ${used + 1}: ${m} reaches the goal but is not accepted`); continue; }
          let after = null, reply = null;
          if (left <= 1) { if (gain && mid.hasCaps()) { reply = W.recapture(E, mid); after = mid.clone().play(reply); } }
          else {
            const dl = solve(P, line.concat([m]), left - 1, true, g, base);
            reply = PICK(E, mid, dl);
            if (reply == null) { if (mid.status() !== -1) add(T.id, j, `⑦ stage ${used + 1}: no reply after ${m}`); continue; }
            after = mid.clone().play(reply);
            const e = dl.find(x => x.m === reply);
            if (!e || (e.need > 0 && e.need <= left - 1) || e.need < 0) add(T.id, j, `⑦ stage ${used + 1}: after ${m} and the reply ${reply} the goal is still within reach (${e && e.need})`);
          }
          const w = FACTS({ E, me, gain, g, start: p0, mid, after, left: left - 1, last: left <= 1 });
          // the board, counted again
          const z = after || mid, opp = 3 - me, rr = after ? mid.count(me) - after.count(me) : 0, a = p0.count(opp) - z.count(opp), b = p0.count(me) - z.count(me);
          let fact;
          if (after && after.status() === -1) fact = { k: rr > 0 ? 'wOver' : 'wStuck', v: { r: rr } };
          else if (!gain) fact = left <= 1 && !after ? { k: 'wLast', v: { k: mid.count(opp) } } : { k: rr > 0 ? 'wTook' : 'wRun', v: rr > 0 ? { r: rr, k: z.count(opp), n: left - 1 } : { k: z.count(opp), n: left - 1 } };
          else if (left <= 1) fact = after ? { k: 'gBack', v: { a, b, g, r: rr } } : { k: 'gShort', v: { a, b, g } };
          else fact = { k: rr > 0 ? 'gTook' : 'gRun', v: Object.assign({ a, b, g, n: left - 1 }, rr > 0 ? { r: rr } : {}) };
          if (gain && fact.k === 'gBack' && a - b >= g) add(T.id, j, `② stage ${used + 1}: ${m} also gains ${a - b} (≥ ${g}) after the biggest recapture — not a unique answer`);
          if (gain && fact.k === 'gShort' && a - b >= g) add(T.id, j, `⑧ stage ${used + 1}: ${m} says short of the goal, the board ${a}-${b}`);
          if (!w || w.k !== fact.k || Object.keys(fact.v).some(q => w.v[q] !== fact.v[q])) add(T.id, j, `⑧ stage ${used + 1}: the words for ${m} say ${w && w.k} ${JSON.stringify(w && w.v)}, the board ${fact.k} ${JSON.stringify(fact.v)}`);
          kinds[fact.k] = (kinds[fact.k] || 0) + 1;
        }
        // on along the main line
        const am = gs.slice().sort((x, y) => x.need - y.need)[0].m;
        line.push(am); used++;
        const pa = E.replay(P.s, line).pos;
        if (reached(pa)) break;
        if (used >= P.n) { add(T.id, j, `① the main line does not reach the goal within ${P.n}`); break; }
        const dl = solve(P, line, P.n - used, true, g, base);
        const rep = PICK(E, pa, dl); if (rep == null) break;
        if (!opt.fast) {   // 追20 the reply is not clearly worse than an equally stubborn one
          const sc = e => e.need === 0 ? 99 : e.need < 0 ? 50 : e.need, top = Math.max(...dl.map(sc)), tied = dl.filter(e => sc(e) === top);
          if (tied.length > 1) { const an = E.analyze(P.s, line, 150).list, v = q => { const e = an.find(x => x.m === q || E.same(pa, x.m, q)); return e ? e.v : -1e9; }; const bv = Math.max(...tied.map(e => v(e.m))); if (bv - v(rep) >= 150) add(T.id, j, `追20 stage ${used}: the defender's reply ${rep} is ${bv - v(rep)} below an equally stubborn one`); }
        }
        line.push(rep);
        const key = E.replay(P.s, line).pos;
        const k2 = key.spec().b + key.spec().side, o = starts.get(k2);
        if (o && o !== T.id + '#' + (j + 1)) add(T.id, j, `⑤ the main line reaches ${o}'s start`);
        if (reached(key) || key.status() !== 0) break;
      }
      r.kinds = kinds; rows.push(r);
    });
    const st = []; for (let i = 0; i < ds.length; i += 10) { const s = ds.slice(i, i + 10); st.push(s.reduce((a, b) => a + b, 0) / s.length); }
    for (let i = 1; i < st.length; i++) if (st[i] < st[i - 1]) add(T.id, i * 10, `⑥ stage ${i + 1} mean d ${st[i].toFixed(1)} < stage ${i} ${st[i - 1].toFixed(1)}`);
    if (st.length > 1 && !(st[st.length - 1] > st[0])) add(T.id, ds.length - 1, `⑥ the last stage is not harder than the first (${st[0].toFixed(1)} → ${st[st.length - 1].toFixed(1)})`);
  }
  // ⑨ the 2D and the words
  if (!opt.no2d) {
    const app = opt.app != null ? opt.app : fs.readFileSync(path.join(ROOT, 'fanorona/app.js'), 'utf8');
    const pm = (app.match(/async function puzzleMove[\s\S]*?\n}\n/) || [''])[0];
    if (!/FanoronaPzWhy/.test(pm)) add('2D', -1, '⑦⑨ fanorona/app.js puzzleMove does not say what happened after a move off the solution (FanoronaPzWhy)');
    if (/Pz\.used--|failBack|pz\.best|pzBlunder\(/.test(pm)) add('2D', -1, '⑨ fanorona/app.js takes a move off the solution back or shows the right move (the 詰め rule)');
    if (/'pz\.good'/.test(pm)) add('2D', -1, '⑨ fanorona/app.js praises a move on the way (the 詰め rule)');
    const html = fs.readFileSync(path.join(ROOT, 'fanorona/index.html'), 'utf8'); if (!/pzwhy\.js/.test(html)) add('2D', -1, '⑨ fanorona/index.html does not load pzwhy.js');
    for (const k of Object.keys(W.T.ja)) for (const l of LANGS) if (!W.T[l] || !W.T[l][k]) add('2D', -1, `⑨ pz.why ${k} missing in ${l}`);
    const F = opt.words || require(path.join(ROOT, 'atlas/games/fanorona-pz.js'));
    const KEYS = ['hi', 'goalWin', 'goal1', 'goalGain', 'goalCount', 'goalChain', 'mid', 'solved', 'wLast', 'wOver', 'wStuck', 'wTook', 'wRun', 'gShort', 'gBack', 'gTook', 'gRun', 'ans', 'pz.hint1', 'pz.hintText', 'pz.checking', 'pz.showing', 'pz.answerDone'];
    for (const k of KEYS) for (const l of LANGS) if (!F.T[l] || F.T[l][k] == null) add('3D', -1, `⑨ the 3D words ${k} missing in ${l}`);
    const NEAR = /^(<b>)?\s*(おしい|惜しい|おしかった|あと少し|あと一歩|いい線|so close|close|almost|nearly|差一点|好可惜|아깝|casi|presque|quase|knapp|fast|почти|çok yakın|hampir|sayang|लगभग|كاد)/i;
    for (const l of LANGS) for (const k of ['wLast', 'wOver', 'wStuck', 'wTook', 'wRun', 'gShort', 'gBack', 'gTook', 'gRun']) for (const s of [].concat((F.T[l] || {})[k] || [])) if (NEAR.test(s)) add('3D', -1, `追78 ${l} ${k} opens with a closeness word: ${s.slice(0, 30)}`);
    for (const l of LANGS) for (const k of ['wTook', 'wRun', 'gTook', 'gRun']) for (const s of [].concat((F.T[l] || {})[k] || [])) if (!/\{n\}/.test(s)) add('3D', -1, `⑧ ${l} ${k} does not say the moves left`);
    for (const s of [].concat(...Object.keys(F.T.ja).map(k => [].concat(F.T.ja[k])))) if (/勝率|評価|見込み/.test(s)) add('3D', -1, '追16 the words give an evaluation');
  }
  return { out, rows, total: PZ.themes.reduce((a, T) => a + T.puzzles.length, 0) };
}
function selftest() {
  init();
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'fanorona/puzzles.json'), 'utf8'));
  const cut = d => { d.themes = d.themes.filter(T => T.id === 'step2' || T.id === 'gain2').map(T => Object.assign(T, { puzzles: T.puzzles.slice(0, 12) })); return d; };
  const clone = () => cut(JSON.parse(JSON.stringify(base)));
  const cases = [
    ['n changed (①④)', d => { d.themes[0].puzzles[0].n = 3; }, /^[①④]/],
    ['the answer changed (①)', d => { const P = d.themes[0].puzzles[1], pos = E.Pos.from(P.s); P.answer = pos.moves().find(m => !E.same(pos, m, P.answer)); }, /^①/],
    ['order reversed (⑥)', d => { d.themes[0].puzzles.reverse(); }, /^⑥/],
    ['a duplicate (⑤)', d => { d.themes[0].puzzles[5] = JSON.parse(JSON.stringify(d.themes[0].puzzles[2])); }, /^⑤/],
    ['a mirrored copy with the colours swapped (⑤)', d => { const P = d.themes[0].puzzles[3]; d.themes[0].puzzles[8] = { s: { b: symB(P.s.b, GEO[3], true), side: 3 - P.s.side }, n: P.n, answer: P.answer }; }, /^⑤/],
    ['the words wrong (⑧)', null, /^⑧/, { facts: o => { const w = W.facts(o); return Object.assign({}, w, { v: Object.assign({}, w.v, { n: (w.v.n | 0) + 1, k: (w.v.k | 0) + 1, a: (w.v.a | 0) + 1 }) }); } }],
    ['a reply that does not refute (⑦)', null, /^⑦/, { pick: (E2, pos, list) => { const L = list.filter(e => e.need > 0).sort((a, b) => a.need - b.need); return (L[0] || list[0] || {}).m; } }],
    ['the 2D takes the move back (⑨)', null, /^⑦?⑨/, { app: 'async function puzzleMove(m) {\n  FanoronaPzWhy; Pz.used--;\n}\n' }],
    ['a 3D word opens with おしい (追78)', null, /^追78/, { words: (() => { const F = JSON.parse(JSON.stringify(require(path.join(ROOT, 'atlas/games/fanorona-pz.js')).T)); F.ja.wRun = ['おしい！ ' + [].concat(F.ja.wRun)[0]]; return { T: F }; })() }],
  ];
  let ok = 0;
  const key = x => x.theme + '#' + x.q + ' ' + x.msg, base0 = new Set(verify({ data: clone(), fast: true }).out.map(key));
  for (const [name, f, re, o] of cases) {
    const d = clone(); if (f) f(d);
    const r = verify(Object.assign({ data: d, fast: true }, o || {}));
    const hit = r.out.some(x => re.test(x.msg) && !base0.has(key(x)));
    console.log((hit ? 'caught ' : 'MISSED ') + name); if (hit) ok++;
  }
  console.log(`selftest ${ok}/${cases.length}`); return ok === cases.length;
}
module.exports = { verify, selftest, init, solve, symB, SYMS, GEO, diff, THEME };
if (require.main === module && process.argv.includes('--selftest')) process.exit(selftest() ? 0 : 1);
else if (require.main === module) {
  const a = process.argv.slice(2), fx = a.indexOf('--file');
  const r = verify({ file: fx >= 0 ? a[fx + 1] : null, no2d: a.includes('--no2d'), fast: a.includes('--fast') });
  const bad = new Set(r.out.filter(o => o.q > 0).map(o => o.theme + '#' + o.q));
  if (a.includes('--rows')) for (const x of r.rows) console.log(JSON.stringify(x));
  for (const o of r.out.slice(0, 400)) console.log(`${o.theme} #${o.q}: ${o.msg}`);
  console.log(`${r.out.length ? 'NG' : 'OK'} fanorona puzzles: ${r.total - bad.size}/${r.total} pass (${r.out.length} findings)`);
  process.exit(r.out.length ? 1 : 0);
}

#!/usr/bin/env node
// (2026-11-24 担当C) Fox and Geese on the 3D table: the puzzles (foxgeese/puzzles.json; 2D foxgeese/app.js puzzleMove, 3D atlas/puzzles.js
// BOOK.foxgeese) checked with an exact solver of this file (its own recursion over the engine's move generator, the goal counted
// strictly by the theme: the geese shut the fox in (w*), the fox takes a goose (t*) — no win by the quiet / repetition / stuck rules).
// Every puzzle, ①〜⑨ and 追1〜 (claude/lesson-quality.md):
//  ① n is exact: the side to move reaches the goal within n of its moves whatever the reply, and not within n−1; the engine's own solver
//    (goalGood, what the 2D and the 3D accept) gives the same set of first moves.
//  ② the goal set (the first moves accepted) has 2 moves at most (both are accepted).
//  ③ 4 legal moves or more, 3 wrong first moves or more; the take puzzles: no capture is possible at once (n ≥ 2 already says so).
//  ④ the theme: w2/w3/w4 = the geese to move, goal 'win', n = 2/3/4; t2/t3 = the fox to move, goal 'take', n = 2/3. The win is by the
//    theme's means: the engine's set equals the strict set (追6).
//  ⑤ no two positions (all the puzzles, the lessons) within 4 points of each other under the board's symmetries (g13 / the puzzles: the
//    8 of the square — the geese move every way; with a g15 lesson: the left-right mirror only).
//  ⑥ easy → hard: d = the near misses (wrong first moves that fail against 1 or 2 replies only) × 2 + the wrong first moves; the list is
//    a theme in 10-puzzle stages: each stage's mean d at least the one before's, the last stage's mean above the first's.
//  ⑦⑧ every wrong first move: the defender's reply (atlas/games/foxgeese-pz.js pickReply, the move the 3D plays) leaves no goal within the moves left,
//    and the 3D words (atlas/games/foxgeese-pz.js why()) name what happened on the board (a goose taken / the fox shut in / out of reach).
//  ⑨ the 2D and the 3D judge with the same engine call (goalGood with need ≤ left); the 2D says why after a move off the solution
//    (foxgeese/app.js pzWhy, pz.why.* in 14 languages), and its reply (goalReply) leaves the goal out of reach (the first 2 of each theme).
// Usage: node tools/lesson-verify-foxgeese.js [--json out.json] [--file puzzles.json]   (also: node tools/lesson-verify.js foxgeese)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const E = require(path.join(ROOT, 'foxgeese/engine.js'));
const THEME = { w2: ['win', 2, 2], w3: ['win', 3, 2], w4: ['win', 4, 2], t2: ['take', 2, 1], t3: ['take', 3, 1] };
const P1 = 1, P2 = 2;
// strict goal: 'win' = after the geese's move the fox cannot move; 'take' = the fox's move takes a goose
function met(goal, before, after, m) {
  if (goal === 'win') return !after.foxMoves([]).length;
  return after.cap > before.cap;
}
let memo = new Map(), budget = 0;
const key = (pos, k) => pos.h1 + ':' + pos.h2 + ':' + pos.side + ':' + k;
// attacker to move: can reach the goal within k own moves?
function att(pos, k, goal) {
  const K = key(pos, k); if (memo.has(K)) return memo.get(K);
  if (--budget < 0) throw new Error('budget');
  let r = false;
  for (const m of pos.moves()) { const q = pos.clone().play(m); if (met(goal, pos, q, m) || (k > 1 && def(q, k - 1, goal))) { r = true; break; } }
  memo.set(K, r); return r;
}
// defender to move: every reply loses (goal within k)?
function def(pos, k, goal) {
  if (goal === 'win' && pos.geese <= E.FOX_WINS_AT) return false;
  const L = pos.moves(); if (!L.length) return false;   // (the geese stuck: the fox wins, not by the theme)
  for (const m of L) { const q = pos.clone().play(m); if (goal === 'take' && !q.foxMoves([]).length) return false; if (goal === 'win' && q.cap > pos.cap && q.geese <= E.FOX_WINS_AT) return false; if (!att(q, k, goal)) return false; }
  return true;
}
function goodSet(pos, k, goal) { const out = []; for (const m of pos.moves()) { const q = pos.clone().play(m); if (met(goal, pos, q, m) || (k > 1 && def(q, k - 1, goal))) out.push(m); } return out; }
// how many replies refute a wrong first move m (the goal still within k−1 after the others)
function refutes(pos, m, k, goal) { const q = pos.clone().play(m); let n = 0; for (const r of q.moves()) { const z = q.clone().play(r); if (goal === 'take' && !z.foxMoves([]).length) { n++; continue; } if (k <= 1 || !att(z, k - 1, goal)) n++; } return n; }
const SYM8 = (() => { const f = []; for (let t = 0; t < 8; t++) f.push((r, c) => { let a = r, b = c; if (t & 4) [a, b] = [b, a]; if (t & 1) a = 6 - a; if (t & 2) b = 6 - b; return a * 7 + b; }); return f; })();
const symB = (b, f) => { const o = Array(49).fill('.'); for (let i = 0; i < 49; i++) if (E.ON[i]) o[f(Math.floor(i / 7), i % 7)] = b[i] === 'f' || b[i] === 'g' ? b[i] : '.'; return o.join(''); };
const diff = (a, b) => { let n = 0; for (let i = 0; i < 49; i++) if (E.ON[i] && (a[i] === 'f' || a[i] === 'g' ? a[i] : '.') !== (b[i] === 'f' || b[i] === 'g' ? b[i] : '.')) n++; return n; };
function verify(opt) {
  opt = opt || {};
  const PZ = opt.data || JSON.parse(fs.readFileSync(opt.file || path.join(ROOT, 'foxgeese/puzzles.json'), 'utf8'));
  const LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'foxgeese/lessons.json'), 'utf8'));
  const FPZ = require(path.join(ROOT, 'atlas/games/foxgeese-pz.js')), WHY = opt.why || FPZ.why, PICK = opt.pick || FPZ.pickReply;
  const out = [], rows = [];
  const add = (id, j, m) => out.push({ theme: id, q: j + 1, msg: m });
  E.setRule(PZ.rule || 'g13');
  // ⑤ the pool: every puzzle + every lesson problem
  const pool = [];
  PZ.themes.forEach(T => T.puzzles.forEach((P, j) => pool.push({ tag: T.id + '#' + (j + 1), b: P.s.b, sym: SYM8 })));
  (LS.steps || []).forEach(st => (st.problems || []).forEach((P, j) => pool.push({ tag: 'lesson ' + st.id + '#' + (j + 1), b: P.s.b, sym: SYM8.filter((_, t) => t === 0 || t === 2) })));
  for (let a = 0; a < pool.length; a++) for (let b = a + 1; b < pool.length; b++) {
    const A = pool[a], B = pool[b], fs = B.sym.length < A.sym.length ? B.sym : A.sym;
    if (fs.some(f => diff(A.b, symB(B.b, f)) <= 4)) { const [id, q] = A.tag.split('#'); if (!/^lesson/.test(A.tag) || !/^lesson/.test(B.tag)) add(/^lesson/.test(A.tag) ? B.tag.split('#')[0] : id, /^lesson/.test(A.tag) ? +B.tag.split('#')[1] - 1 : +q - 1, `⑤ within 4 points of ${/^lesson/.test(A.tag) ? A.tag : B.tag}`); }
  }
  for (const T of PZ.themes) {
    const th = THEME[T.id]; if (!th) { add(T.id, -1, '④ unknown theme'); continue; }
    const [goal, n, side] = th, ds = [];
    T.puzzles.forEach((P, j) => {
      E.setRule(P.s.rule || PZ.rule || 'g13');
      const pos = E.Pos.from(P.s); memo = new Map(); budget = opt.budget || 3e6;
      const r = { theme: T.id, j, ok: true };
      try {
        if (P.n !== n || P.g !== goal || P.s.side !== side) add(T.id, j, `④ n/g/side ${P.n}/${P.g}/${P.s.side} ≠ the theme's ${n}/${goal}/${side}`);
        const L = pos.moves(), good = goodSet(pos, n, goal), less = n > 1 ? goodSet(pos, n - 1, goal) : [];
        if (!good.length) add(T.id, j, `① no ${goal} within ${n}`);
        if (less.length) add(T.id, j, `① already a ${goal} within ${n - 1}`);
        const eng = E.goalGood(P.s, [], n, { goal }, P.s.rule || PZ.rule) || [];
        const same = eng.length === good.length && eng.every(m => good.includes(m));
        if (!same) add(T.id, j, `④⑨ the engine accepts ${eng.length} first moves, the strict theme ${good.length} (追6: a win not by the theme's means)`);
        if (good.length > 2) add(T.id, j, `② ${good.length} first moves reach the goal`);
        const wrong = L.filter(m => !good.includes(m));
        if (L.length < 4) add(T.id, j, `③ ${L.length} legal moves`);
        if (wrong.length < 3) add(T.id, j, `③ ${wrong.length} wrong first moves`);
        let near = 0;
        for (const m of wrong) { const k = refutes(pos, m, n, goal); if (k <= 2) near++; }
        const d = near * 2 + wrong.length; ds.push(d); r.d = d; r.near = near; r.legal = L.length; r.good = good.length;
        // ⑦⑧ every stage of the line (追13): the attacker plays its first goal move, the defender the most stubborn reply (the 3D's
        // fgDefend: the most moves still needed, ties the first); at each stage every wrong move is checked — the last stage: the words
        // lastWin / lastTake (the fox can still move / no goose taken); before it: the reply the 3D plays (pickReply with the engine's
        // goalGood, as fgReply) leaves no goal within the moves left, and why() names the board's fact.
        const rule = P.s.rule || PZ.rule;
        const can = (z, k) => !!E.goalGood(z.spec(), [], k, { goal }, rule);
        let cur = pos;
        for (let used = 0; used < n; used++) {
          const left = n - used, g2 = used ? goodSet(cur, left, goal) : good;
          if (!g2.length) { add(T.id, j, `① the line breaks at stage ${used + 1}`); break; }
          for (const m of cur.moves().filter(x => !g2.includes(x))) {
            const q = cur.clone().play(m);
            if (left <= 1) {
              const ok = goal === 'win' ? q.foxMoves([]).length > 0 : q.cap === cur.cap;
              if (!ok) add(T.id, j, `⑧ stage ${used + 1}: ${E.name(cur, m)} is not a miss of the last move`);
              continue;
            }
            const rep = PICK(q, left - 1, goal, can);
            if (rep == null || rep < 0) { add(T.id, j, `⑦ stage ${used + 1}: no reply after ${E.name(cur, m)}`); continue; }
            const z = q.clone().play(rep);
            if (att(z, left - 1, goal) && !(goal === 'take' && !z.foxMoves([]).length)) add(T.id, j, `⑦ stage ${used + 1}: after ${E.name(cur, m)} and the reply ${E.name(q, rep)} the goal is still within ${left - 1}`);
            const w = WHY({ goal, before: cur, mid: q, after: z, m, reply: rep, left: left - 1, E });
            const fact = goal === 'win' ? (z.cap > q.cap ? 'cap' : 'far') : (!z.foxMoves([]).length ? 'trap' : 'far');
            if (!w || w.k !== fact) add(T.id, j, `⑧ stage ${used + 1}: the words for ${E.name(cur, m)} say ${w && w.k}, the board ${fact}`);
            if (w && /勝率|評価|見込み/.test(w.ja)) add(T.id, j, '追16 the words give an evaluation');
          }
          if (left <= 1) break;
          const a1 = cur.clone().play(g2[0]);
          if (met(goal, cur, a1)) break;
          let best = null, bk = -1;
          for (const r of a1.moves()) { const z = a1.clone().play(r); let need = left; for (let k = 1; k <= left - 1; k++) if (E.goalGood(z.spec(), [], k, { goal }, rule)) { need = k; break; } if (need > bk) { bk = need; best = z; } }
          if (!best) break; cur = best;
        }
      } catch (e) { add(T.id, j, '① ' + e.message); r.ok = false; }
      rows.push(r);
    });
    // ⑨ the 2D (foxgeese/app.js puzzleMove → pzWhy): the reply is the engine's goalReply; on the first 2 puzzles of each theme, every wrong
    // first move's goalReply leaves no goal within the moves left and pzWhy's fact (a goose taken / the fox shut in / defended) is the board's
    if (!opt.no2d) T.puzzles.slice(0, 2).forEach((P, j) => {
      const rule = P.s.rule || PZ.rule; E.setRule(rule); const pos = E.Pos.from(P.s); memo = new Map(); budget = 3e6;
      const good = E.goalGood(P.s, [], n, { goal }, rule) || [];
      for (const m of pos.moves().filter(x => !good.includes(x))) {
        const q = pos.clone().play(m), rp = E.goalReply(P.s, [m], n - 1, E.goalOf(pos, { goal }), rule).move; if (!(rp >= 0)) { add(T.id, j, `⑨ 2D: no reply after ${E.name(pos, m)}`); continue; }
        const z = q.clone().play(rp);
        if (n - 1 >= 1 && att(z, n - 1, goal) && !(goal === 'take' && !z.foxMoves([]).length)) add(T.id, j, `⑨ 2D: after ${E.name(pos, m)} the reply ${E.name(q, rp)} leaves the goal within ${n - 1}`);
      }
    });
    // ⑥ stages of 10
    const st = []; for (let i = 0; i < ds.length; i += 10) { const s = ds.slice(i, i + 10); st.push(s.reduce((a, b) => a + b, 0) / s.length); }
    for (let i = 1; i < st.length; i++) if (st[i] < st[i - 1]) add(T.id, i * 10, `⑥ stage ${i + 1} mean d ${st[i].toFixed(1)} < stage ${i} ${st[i - 1].toFixed(1)}`);
    if (st.length > 1 && !(st[st.length - 1] > st[0])) add(T.id, ds.length - 1, `⑥ the last stage is not harder than the first (${st[0].toFixed(1)} → ${st[st.length - 1].toFixed(1)})`);
  }
  // ⑨ the 2D words for a move off the solution exist in every language (pz.why.*: foxgeese/i18n-fg.js · i18n-fg-more.js)
  { const w = { I18N: {} }, L = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar']; L.forEach(l => { w.I18N[l] = {}; });
    for (const f of ['i18n-fg.js', 'i18n-fg-more.js']) new Function('window', 'I18N', fs.readFileSync(path.join(ROOT, 'foxgeese', f), 'utf8'))(w, w.I18N);
    for (const l of L) for (const k of ['cap', 'farWin', 'trap', 'farTake', 'lastWin', 'lastTake']) { const x = w.I18N[l]['pz.why.' + k]; if (!x) add('2D', -1, `⑨ ${l}: no pz.why.${k}`); else if (/勝率|評価/.test(x)) add('2D', -1, `追16 ${l}: pz.why.${k}`); }
    const app = opt.app ? '' : fs.readFileSync(path.join(ROOT, 'foxgeese/app.js'), 'utf8'); if (!/function pzWhy\(/.test(app) || !/pzStatus\(why \|\| t\('pz\.reply'/.test(app)) add('2D', -1, '⑦⑨ foxgeese/app.js does not say why after a move off the solution (pzWhy)'); }
  return { out, rows, total: PZ.themes.reduce((a, T) => a + T.puzzles.length, 0) };
}
// --selftest: broken data must be caught (the answer / order / duplicates / choices / the words / the reply / the evaluation words)
function selftest() {
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'foxgeese/puzzles.json'), 'utf8'));
  const cut = d => { d.themes = d.themes.filter(T => T.id === 'w2' || T.id === 't2').map(T => Object.assign(T, { puzzles: T.puzzles.slice(0, 20) })); return d; };
  const clone = () => cut(JSON.parse(JSON.stringify(base)));
  const F = require(path.join(ROOT, 'atlas/games/foxgeese-pz.js'));
  const cases = [
    ['n changed (①④)', d => { d.themes[0].puzzles[0].n = 3; }, /^[①④]/],
    ['order reversed (⑥)', d => { d.themes[0].puzzles.reverse(); }, /^⑥/],
    ['a duplicate (⑤)', d => { d.themes[0].puzzles[5] = JSON.parse(JSON.stringify(d.themes[0].puzzles[2])); }, /^⑤/],
    ['3 legal moves (③)', d => { d.themes[1].puzzles[0] = { s: { b: '................ggg...ggg..f.gggg............g...', side: 1, cap: 2, n: 20, rule: 'g13' }, n: 2, g: 'take' }; }, /^③/],
    ['goal within n−1 (①)', d => { d.themes[1].puzzles[3].n = 3; d.themes[1].id = 't3'; }, /^①/],
    ['the words wrong (⑧)', null, /^⑧/, { why: o => Object.assign(F.why(o), { k: 'far' }) }],
    ['a reply that does not refute (⑦)', null, /^⑦/, { pick: (mid) => mid.moves()[0] }],
    ['the 2D reason gone (⑦⑨)', null, /^⑦⑨/, { app: true }],
    ['an evaluation in the words (追16)', null, /^追16/, { why: o => Object.assign(F.why(o), { ja: '勝率が下がる' }) }],
  ];
  let ok = 0;
  for (const [name, f, re, o] of cases) {
    const d = clone(); if (f) f(d);
    const r = verify(Object.assign({ data: d }, o || {}));
    const hit = r.out.some(x => re.test(x.msg));
    console.log((hit ? 'caught ' : 'MISSED ') + name); if (hit) ok++;
  }
  console.log(`selftest ${ok}/${cases.length}`); return ok === cases.length;
}
module.exports = { verify, selftest, goodSet, att, def, refutes, THEME, SYM8, symB, diff, setMemo: () => { memo = new Map(); budget = 3e6; } };
if (require.main === module && process.argv.includes('--selftest')) process.exit(selftest() ? 0 : 1);
else if (require.main === module) {
  const a = process.argv.slice(2), jx = a.indexOf('--json'), fx = a.indexOf('--file');
  const r = verify({ file: fx >= 0 ? a[fx + 1] : null });
  const bad = new Set(r.out.map(o => o.theme + '#' + o.q));
  for (const o of r.out.slice(0, 400)) console.log(`${o.theme} #${o.q}: ${o.msg}`);
  console.log(`${r.out.length ? 'NG' : 'OK'} foxgeese puzzles: ${r.total - [...bad].filter(k => !/#0$/.test(k)).length}/${r.total} pass (${r.out.length} findings)`);
  if (jx >= 0) fs.writeFileSync(a[jx + 1], JSON.stringify(r, null, 1));
  process.exit(r.out.length ? 1 : 0);
}

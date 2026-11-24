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
  if (!opt.noLessons) out.push(...verifyLessons(opt));
  return { out, rows, total: PZ.themes.reduce((a, T) => a + T.puzzles.length, 0) };
}

// (2026-11-24 担当C) the fox lessons on the 3D table (atlas/ls-foxgeese.js READY: f_jump · f_double · f_fork; foxgeese/lessons.json, rule g15),
// every problem by ①〜⑨ and 追1〜, independently of foxgeese/ls-facts.js (which the 2D / 3D words read):
//  ① the saved ok set = every move that does the lesson's thing (f_jump: takes a goose · f_double: takes the most · f_fork: no goose now,
//    and after it every reply of the geese leaves a capture), and the answer does not let the geese shut the fox in next move
//  ② one right move (P.ok has one move, = best)  ③ 4 legal moves or more, 3 wrong or more
//  ④ f_jump: one goose, a single jump; f_double: the answer takes 2 or more; f_fork: no capture now, the answer attacks 2 geese or more
//  ⑤ no two problems (the lessons, the puzzles) within 4 points (the lessons: the left-right mirror; with a puzzle: the 8 of the square)
//  ⑥ in the order asked, d (the wrong moves + 2 × the near misses: a jump that takes fewer / a move the geese cover in 1 or 2 ways /
//    a goose more next to the fox) does not go down
//  ⑦⑧ every wrong move: ls-facts' fact is the board's (a step takes nothing; stopped on the answer's line / another way; after it no goose
//    can be jumped / one only and the named reply covers it / several and the named reply covers them all / the named reply shuts the fox in),
//    and the words of every language (2D lf.* in 14 languages, ドミダック's ja) exist for it and carry no {placeholder} left
//  追7 the hints' counts: f_jump has 2 geese or more next to the fox (「順番に見よう」), f_fork's answer attacks 2 or more (「2羽以上」)
//  追16 no evaluation in the words · 追3 only the ok moves score (atlas/ls-foxgeese.js points)
function verifyLessons(opt) {
  opt = opt || {};
  const LS = opt.ls || JSON.parse(fs.readFileSync(path.join(ROOT, 'foxgeese/lessons.json'), 'utf8'));
  const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'foxgeese/puzzles.json'), 'utf8'));
  const F = opt.facts || require(path.join(ROOT, 'foxgeese/ls-facts.js')), A = require(path.join(ROOT, 'atlas/ls-foxgeese.js'));
  const out = [], add = (id, j, m) => out.push({ theme: 'lesson ' + id, q: j + 1, msg: m });
  const w = { I18N: {} }, LG = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar']; LG.forEach(l => { w.I18N[l] = {}; });
  for (const f of ['i18n-fg.js', 'i18n-fg-more.js']) new Function('window', 'I18N', fs.readFileSync(path.join(ROOT, 'foxgeese', f), 'utf8'))(w, w.I18N);
  const JA = opt.ja || A.JA;
  const caps = p => p.foxMoves([]).filter(m => p.clone().play(m).cap > p.cap);
  const firstG = p => new Set(caps(p).map(m => E.jumped(m)[0]));
  const shut = p => p.moves().some(g => !p.clone().play(g).foxMoves([]).length);
  const KEYS = { f_jump: ['take', 'step'], f_double: ['most', 'stepD', 'stop', 'other'], f_fork: ['fork', 't0', 't1', 'tdef', 'trap'] };
  const LFK = { stepD: 'lf.stepD' };
  const norm = b => { let o = ''; for (let i = 0; i < 49; i++) o += E.ON[i] ? (b[i] === 'f' || b[i] === 'g' ? b[i] : '.') : ' '; return o; };
  const pool = [];
  (LS.steps || []).forEach(st => (st.problems || []).forEach((P, j) => pool.push({ id: st.id, j, b: norm(P.s.b), sym: SYM8.filter((_, t) => t === 0 || t === 2), ls: true })));
  PZ.themes.forEach(T => T.puzzles.forEach((P, j) => pool.push({ id: T.id, j, b: norm(P.s.b), sym: SYM8 })));
  for (const st of LS.steps) {
    if (!A.READY.includes(st.id)) continue;
    if (/^g_/.test(st.id)) { gooseLesson(st, { add, pool, w, LG, JA, F, A, opt }); continue; }
    const id = st.id; let dPrev = -1;
    // the words exist in every language (2D) and in ドミダック's ja for every fact this lesson can give
    for (const k of KEYS[id]) {
      for (const l of LG) { const x = w.I18N[l][LFK[k] || 'lf.' + k]; if (!x) add(id, -1, `⑦⑨ ${l}: no ${LFK[k] || 'lf.' + k}`); else if (/勝率|評価|見込み/.test(x)) add(id, -1, `追16 ${l}: lf.${k}`); }
      const jl = ['take', 'most', 'fork'].includes(k) ? JA.w[k] : JA.n[k]; if (!jl || !jl.length) add(id, -1, `⑦ ja: ドミダック has no words for ${k}`); else if (jl.some(t => /勝率|評価|見込み/.test(t))) add(id, -1, `追16 ja: ${k}`);
      else if (jl.some(t => !/(から|ので|ため|と、|と相手|ると|れば|なら|だと|では|せいで|取られ|負け|逃げ|防げ|止め|ふさ|残る|残っちゃ|できない|届かない|ならない|損)/.test(t))) add(id, -1, `⑦ ja: a line for ${k} gives no reason`);
    }
    st.problems.forEach((P, j) => {
      E.setRule(P.s.rule || 'g15'); const pos = E.Pos.from(P.s), L = pos.moves();
      const took = m => pos.clone().play(m).cap - pos.cap, most = Math.max(...L.map(took));
      let good;
      if (id === 'f_jump') good = L.filter(m => took(m) > 0);
      else if (id === 'f_double') good = L.filter(m => most > 0 && took(m) === most);
      else good = L.filter(m => { const q = pos.clone().play(m); if (took(m) || !q.foxMoves([]).length) return false; const R = q.moves(); return R.length && R.every(r => caps(q.clone().play(r)).length > 0); });
      const okS = P.ok || [];
      if (good.length !== okS.length || !good.every(m => okS.includes(m))) add(id, j, `① the saved answers (${okS.map(m => E.name(pos, m)).join(',')}) ≠ the moves that do it (${good.map(m => E.name(pos, m)).join(',')})`);
      if (okS.length !== 1 || P.best !== okS[0]) add(id, j, `② ${okS.length} right moves (best ${P.best})`);
      if (L.length < 4 || L.length - good.length < 3) add(id, j, `③ ${L.length} legal moves, ${L.length - good.length} wrong`);
      const a = pos.clone().play(P.best);
      if (shut(a)) add(id, j, '① after the answer the geese shut the fox in');
      if (id === 'f_jump' && (good.length !== 1 || E.jumped(P.best).length !== 1)) add(id, j, '④ not one goose by a single jump');
      if (id === 'f_double' && most < 2) add(id, j, `④ the most is ${most}`);
      if (id === 'f_fork' && (caps(pos).length || firstG(a).size < 2)) add(id, j, `④ a capture now (${caps(pos).length}) / the answer attacks ${firstG(a).size}`);
      const adj = E.NBR[pos.fox].filter(([x]) => pos.sq[x] === E.P2).length;
      // 追52 the hint's rings tell something: geese to look at (not the one fox), never empty; the 2D marks the same (app.js lfHint)
      { global.window = global.window || {}; window.FoxEngine = E; window.FoxLsFacts = require(path.join(ROOT, 'foxgeese/ls-facts.js')); const hp = (opt.hintPts || A.make({ getJ: () => 0, J: () => ({}), put: () => 0, L: x => x, fill: t => t }).hintPts)(id, P);
        if (!hp.length || hp.some(q => pos.sq[q] !== E.P2)) add(id, j, `追52 the hint rings ${hp.length ? 'a point that is not a goose' : 'nothing'}`); }
      if (id === 'f_jump' && adj < 2) add(id, j, `追7 ${adj} goose next to the fox (the hint: look at them one by one)`);
      // ⑤
      const me = pool.find(x => x.ls && x.id === id && x.j === j);
      for (const x of pool) { if (x === me) continue; const syms = x.ls ? me.sym : SYM8; if (syms.some(f => diff(me.b, symB(x.b, f)) <= 4)) add(id, j, `⑤ within 4 points of ${x.ls ? 'lesson ' : ''}${x.id}#${x.j + 1}`); }
      // ⑦⑧ every wrong move, the fact recomputed from the board
      let near = 0;
      for (const m of L) {
        const f = F.fact(E, id, P.s, m), q = pos.clone().play(m), k = took(m), right = okS.includes(m);
        const kk = f.k === 'step' && id === 'f_double' ? 'stepD' : f.k;
        if (!KEYS[id].includes(kk)) { add(id, j, `⑧ ${E.name(pos, m)}: a fact ${f.k} the lesson has no words for`); continue; }
        let truth;
        if (id === 'f_jump') truth = k ? 'take' : 'step';
        else if (id === 'f_double') { if (k === most) truth = 'most'; else if (!k) truth = 'stepD'; else { const pm = E.path(m); truth = L.some(x => took(x) === most && pm.every((v, i) => E.path(x)[i] === v)) ? 'stop' : 'other'; } }
        else {
          if (right) truth = 'fork';
          else if (shut(q)) truth = 'trap';
          else { const t = firstG(q).size; truth = t === 0 ? 't0' : t === 1 ? 't1' : 'tdef'; }
          if (f.r != null) { const z = q.clone().play(f.r); if (truth === 'trap' ? z.foxMoves([]).length : caps(z).length) add(id, j, `⑧ ${E.name(pos, m)}: the named reply ${E.name(q, f.r)} does not ${truth === 'trap' ? 'shut the fox in' : 'cover every jump'}`); }
          if ((truth === 't1' || truth === 'tdef') && f.t !== firstG(q).size) add(id, j, `⑧ ${E.name(pos, m)}: says ${f.t} geese attacked, the board ${firstG(q).size}`);
        }
        if ((right ? 1 : 0) !== (['take', 'most', 'fork'].includes(truth) ? 1 : 0)) add(id, j, `① ${E.name(pos, m)} right=${right} but the board says ${truth}`);
        if (kk !== truth) add(id, j, `⑧ ${E.name(pos, m)}: the words say ${kk}, the board ${truth}`);
        if (id === 'f_double' && (f.n !== most || (f.c != null && f.c !== k))) add(id, j, `⑧ ${E.name(pos, m)}: counts ${f.c}/${f.n}, the board ${k}/${most}`);
        // near misses (⑥)
        if (!right) { if (id === 'f_double' && k > 0) near++; if (id === 'f_fork') { const R = q.moves(); if (R.filter(r => !caps(q.clone().play(r)).length).length <= 2) near++; } }
        // the filled words leave no placeholder (2D en / ja and the 3D ja)
        for (const l of ['ja', 'en']) { const x = w.I18N[l][LFK[kk] || 'lf.' + kk] || ''; const y = x.replace(/\{(\w+)\}/g, (_, v) => ({ m: 'M', x: 'X', r: 'R', n: 1, c: 1, t: 2 })[v] != null ? 'ok' : '{' + v + '}'); if (/\{\w+\}/.test(y)) add(id, j, `⑦ ${l} lf.${kk} has an unknown placeholder`); }
      }
      if (id === 'f_jump') near = adj - 1;
      const d = (L.length - good.length) + 2 * near;
      if (d < dPrev) add(id, j, `⑥ d ${d} < the problem before (${dPrev})`); dPrev = d;
      if (A.make && (A.make({ getJ: () => 0, J: () => ({}), put: () => 0, L: x => x, fill: (t) => t }).points(P, L.find(m => !okS.includes(m))) !== 0)) add(id, j, '追3 a wrong move scores');
    });
  }
  if (!/function lfHint\(/.test(opt.app2d != null ? opt.app2d : fs.readFileSync(path.join(ROOT, 'foxgeese/app.js'), 'utf8'))) add('2D', -1, '追52 the 2D hint marks the fox (no lfHint)');
  return out;
}
// (2026-11-24 23:32 担当C) the geese lessons g_safe · g_trap · g_net (the geese to move), recomputed from the board, not through ls-facts:
//  ① ok = every goose move that does it (g_safe: the fox then has a move and no jump · g_trap: the fox cannot move · g_net: the fox has a
//    move, and after each one some goose move leaves it none)  ② one right move  ③ 4 legal moves or more, 3 wrong or more
//  ④ g_safe: the fox can jump now, one goose attacked, no move shuts it in · g_trap: no jump now, one point to go to, the closing goose has a
//    friend straight behind it (the intro), and another goose can step there too (the hint's ring does not give the answer)
//    · g_net: no jump now, two points to go to, no move shuts it in now
//  ⑤ (with the fox lessons' loop) ⑥ d = wrong + 2 × near (g_safe: the attacked goose safe but another jump · g_trap: into the fox's point
//    but not shut · g_net: the fox escapes by one way only) does not go down
//  ⑦⑧ every legal move: the fact's kind = the board's (jself / jopen / jstill: the jump's first goose is the moved one / it lands where the
//    goose stood / the same first jump was there before; free / freeO; wide / hole / reach0 after the named escape), the named jump {r} is of
//    that kind and takes the most of its kind {n}, the named escape {r} leaves no shutting move, the counts {e}; words in 14 languages and
//    ドミダック's ja with a reason  追52 the hint rings: g_safe the attacked goose, g_trap / g_net the fox's points (empty points)
function gooseLesson(st, X) {
  const { add, pool, w, LG, JA, F, A, opt } = X, id = st.id;
  const RIGHT = { g_safe: ['safeF', 'safeA'], g_trap: ['trap'], g_net: ['net'] }[id];
  const WRONG = { g_safe: ['jself', 'jopen', 'jstill'], g_trap: ['jself', 'jopen', 'free', 'freeO'], g_net: ['jself', 'jopen', 'wide', 'hole', 'reach0'] }[id];
  const LGK = A.LG_KEY || {};
  for (const k of RIGHT.concat(WRONG)) {
    const key = LGK[k]; if (!key) { add(id, -1, `⑦⑨ no 2D key for ${k}`); continue; }
    for (const l of LG) { const x = w.I18N[l][key]; if (!x) add(id, -1, `⑦⑨ ${l}: no ${key}`); else if (/勝率|評価|見込み/.test(x)) add(id, -1, `追16 ${l}: ${key}`); else if (/\{(?![mxrne]\})\w+\}/.test(x)) add(id, -1, `⑦ ${l} ${key} has an unknown placeholder`); }
    const jl = RIGHT.includes(k) ? JA.w[k] : JA.n[k];
    if (!jl || !jl.length) add(id, -1, `⑦ ja: ドミダック has no words for ${k}`);
    else if (jl.some(t => /勝率|評価|見込み/.test(t))) add(id, -1, `追16 ja: ${k}`);
    else if (jl.some(t => !/(から|ので|ため|と、|ると|れば|なら|だと|では|せいで|取られ|ふさが|動けない|閉じ込め)/.test(t))) add(id, -1, `⑦ ja: a line for ${k} gives no reason`);
  }
  const jumps = p => p.foxMoves([]).filter(x => E.jumped(x).length);
  const pts = p => new Set(p.foxMoves([]).map(x => E.path(x)[1]));
  const shutBy = z => z.moves().filter(g => !z.clone().play(g).foxMoves([]).length);
  let dPrev = -1;
  st.problems.forEach((P, j) => {
    E.setRule(P.s.rule || 'g15'); const pos = E.Pos.from(P.s), L = pos.moves(), okS = P.ok || [];
    if (pos.side !== 1) { add(id, j, '④ not the geese to move'); return; }
    const J0 = jumps(pos), D0 = pts(pos);
    const does = m => { const q = pos.clone().play(m), Fm = q.foxMoves([]);
      if (id === 'g_safe') return Fm.length > 0 && !jumps(q).length;
      if (id === 'g_trap') return !Fm.length;
      return Fm.length > 0 && Fm.every(f => shutBy(q.clone().play(f)).length > 0); };
    const good = L.filter(does);
    if (good.length !== okS.length || !good.every(m => okS.includes(m))) add(id, j, `① the saved answers (${okS.map(m => E.name(pos, m)).join(',')}) ≠ the moves that do it (${good.map(m => E.name(pos, m)).join(',')})`);
    if (okS.length !== 1 || P.best !== okS[0]) add(id, j, `② ${okS.length} right moves (best ${P.best})`);
    if (L.length < 4 || L.length - good.length < 3) add(id, j, `③ ${L.length} legal moves, ${L.length - good.length} wrong`);
    const shutNow = L.some(m => !pos.clone().play(m).foxMoves([]).length);
    if (id === 'g_safe' && (!J0.length || new Set(J0.map(x => E.jumped(x)[0])).size !== 1 || shutNow)) add(id, j, `④ g_safe: ${J0.length} jumps now / attacked ${new Set(J0.map(x => E.jumped(x)[0])).size} / a shutting move ${shutNow}`);
    if (id === 'g_trap') {
      if (J0.length || D0.size !== 1) add(id, j, `④ g_trap: ${J0.length} jumps now, ${D0.size} points`);
      const b = P.best, [r0, c0] = E.RC[pos.fox], [r1, c1] = E.RC[E.mTo(b)], r2 = 2 * r1 - r0, c2 = 2 * c1 - c0;
      if (!(r2 >= 0 && r2 < 7 && c2 >= 0 && c2 < 7 && E.ON[r2 * 7 + c2] && pos.clone().play(b).sq[r2 * 7 + c2] === E.P2)) add(id, j, '④ g_trap: the closing goose has no friend straight behind it (the intro says it has)');
      if (L.filter(m => m !== b && D0.has(E.mTo(m))).length < 1) add(id, j, '追52 g_trap: only the answer can step into the ringed point (the hint gives the answer away)');
    }
    if (id === 'g_net' && (J0.length || D0.size !== 2 || shutNow)) add(id, j, `④ g_net: ${J0.length} jumps now, ${D0.size} points, a shutting move ${shutNow}`);
    // ⑤ no other problem (the lessons, the puzzles) within 4 points (with a lesson: the left-right mirror; with a puzzle: the 8 of the square)
    { const me = pool.find(x => x.ls && x.id === id && x.j === j);
      for (const x of pool) { if (x === me) continue; const syms = x.ls ? me.sym : SYM8; if (syms.some(f => diff(me.b, symB(x.b, f)) <= 4)) add(id, j, `⑤ within 4 points of ${x.ls ? 'lesson ' : ''}${x.id}#${x.j + 1}`); } }
    // 追52 the hint's rings
    { global.window = global.window || {}; window.FoxEngine = E; window.FoxLsFacts = require(path.join(ROOT, 'foxgeese/ls-facts.js'));
      const hp = (opt.hintPts || A.make({ getJ: () => 0, J: () => ({}), put: () => 0, L: x => x, fill: t => t }).hintPts)(id, P);
      const want = id === 'g_safe' ? new Set(J0.map(x => E.jumped(x)[0])) : D0;
      if (!hp.length || hp.length !== want.size || hp.some(q => !want.has(q))) add(id, j, `追52 the hint rings ${hp.map(E.sqName).join(',') || 'nothing'}, not ${id === 'g_safe' ? 'the attacked goose' : 'the fox\'s points'}`); }
    // ⑦⑧ every legal move
    let near = 0;
    for (const m of L) {
      const f = F.fact(E, id, P.s, m), q = pos.clone().play(m), Jq = jumps(q), right = okS.includes(m);
      let truth;
      if (Jq.length) {
        const before = new Set(J0.map(x => E.path(x).slice(0, 2).join(','))), kind = x => E.jumped(x)[0] === E.mTo(m) ? 'jself' : E.path(x)[1] === E.mFrom(m) ? 'jopen' : before.has(E.path(x).slice(0, 2).join(',')) ? 'jstill' : 'jnew';
        truth = ['jself', 'jopen', 'jstill', 'jnew'].find(c => Jq.some(x => kind(x) === c));
        if (f.r == null || !Jq.includes(f.r) || kind(f.r) !== truth) add(id, j, `⑧ ${E.name(pos, m)}: the named jump is not a ${truth} jump`);
        else if (f.n !== E.jumped(f.r).length || Jq.some(x => kind(x) === truth && E.jumped(x).length > f.n)) add(id, j, `⑧ ${E.name(pos, m)}: says ${f.n} geese taken`);
      } else if (id === 'g_safe') truth = !q.foxMoves([]).length ? 'trap' : J0.some(x => E.path(x)[1] === E.mTo(m)) ? 'safeF' : 'safeA';
      else if (id === 'g_trap') {
        const Fq = q.foxMoves([]); truth = !Fq.length ? 'trap' : D0.has(E.mTo(m)) ? 'freeO' : 'free';
        if (Fq.length && (f.e !== pts(q).size || !Fq.includes(f.r))) add(id, j, `⑧ ${E.name(pos, m)}: says ${f.e} points / a fox move that is not one`);
      } else {
        const Fq = q.foxMoves([]);
        if (!Fq.length) truth = 'trap';
        else if (Fq.every(x => shutBy(q.clone().play(x)).length)) { truth = 'net'; if (f.e !== pts(q).size) add(id, j, `⑧ ${E.name(pos, m)}: says ${f.e} points, the board ${pts(q).size}`); }
        else if (f.r == null || !Fq.includes(f.r) || shutBy(q.clone().play(f.r)).length) { truth = '?'; add(id, j, `⑧ ${E.name(pos, m)}: the named escape is not one`); }
        else { const z = q.clone().play(f.r), Dz = pts(z); if (f.e !== Dz.size) add(id, j, `⑧ ${E.name(pos, m)}: says ${f.e} points after the escape, the board ${Dz.size}`);
          truth = Dz.size >= 2 ? 'wide' : z.moves().some(g => Dz.has(E.mTo(g))) ? 'hole' : 'reach0'; }
      }
      if (right !== RIGHT.includes(truth)) add(id, j, `① ${E.name(pos, m)} right=${right} but the board says ${truth}`);
      if (f.k !== truth) add(id, j, `⑧ ${E.name(pos, m)}: the words say ${f.k}, the board ${truth}`);
      if (!right && !RIGHT.concat(WRONG).includes(truth)) add(id, j, `⑦ ${E.name(pos, m)}: ${truth} has no words in this lesson`);
      if (!right) {
        if (id === 'g_safe' && truth !== 'jstill') near++;
        if (id === 'g_trap' && D0.has(E.mTo(m))) near++;
        if (id === 'g_net' && !/^j/.test(truth) && q.foxMoves([]).filter(x => !shutBy(q.clone().play(x)).length).length === 1) near++;
      }
    }
    const d = (L.length - good.length) + 2 * near;
    if (d < dPrev) add(id, j, `⑥ d ${d} < the problem before (${dPrev})`); dPrev = d;
    if (A.make({ getJ: () => 0, J: () => ({}), put: () => 0, L: x => x, fill: t => t }).points(P, L.find(m => !okS.includes(m))) !== 0) add(id, j, '追3 a wrong move scores');
  });
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
  const lsBase = JSON.parse(fs.readFileSync(path.join(ROOT, 'foxgeese/lessons.json'), 'utf8')), lsc = () => JSON.parse(JSON.stringify(lsBase));
  const FF = require(path.join(ROOT, 'foxgeese/ls-facts.js')), A0 = require(path.join(ROOT, 'atlas/ls-foxgeese.js')), AJ = A0.JA;
  const lcases = [
    ['lesson: the answer changed (①②)', d => { const P = d.steps[0].problems[0]; E.setRule('g15'); const m = E.Pos.from(P.s).moves().find(x => !P.ok.includes(x)); P.ok = [m]; P.best = m; }, /^①/],
    ['lesson: order reversed (⑥)', d => { d.steps[2].problems.reverse(); }, /^⑥/],
    ['lesson: a duplicate (⑤)', d => { d.steps[1].problems[3] = JSON.parse(JSON.stringify(d.steps[1].problems[1])); }, /^⑤/],
    ['lesson: the fact wrong (⑧)', null, /^⑧/, { facts: { fact: (E2, id, sp, m) => { const f = FF.fact(E2, id, sp, m); return f.k === 'stop' ? Object.assign({}, f, { k: 'other' }) : f.k === 't1' ? Object.assign({}, f, { k: 't0' }) : f; } } }],
    ['lesson: ja words gone (⑦)', null, /^⑦/, { ja: Object.assign({}, AJ, { n: Object.assign({}, AJ.n, { tdef: [] }) }) }],
    ['lesson: the hint rings the fox (追52)', null, /^追52/, { hintPts: (id, P) => { E.setRule('g15'); return [E.Pos.from(P.s).fox]; } }],
    ['lesson: the 2D hint without lfHint (追52)', null, /^追52/, { app2d: '' }],
    ['lesson: an evaluation in the words (追16)', null, /^追16/, { ja: Object.assign({}, AJ, { w: Object.assign({}, AJ.w, { most: ['勝率が上がる'] }) }) }],
    ['geese lesson: the answer changed (①②)', d => { const P = d.steps.find(s => s.id === 'g_safe').problems[0]; E.setRule('g15'); const m = E.Pos.from(P.s).moves().find(x => !P.ok.includes(x)); P.ok = [m]; P.best = m; }, /^①/],
    ['geese lesson: order reversed (⑥)', d => { d.steps.find(s => s.id === 'g_net').problems.reverse(); }, /^⑥/],
    ['geese lesson: a duplicate (⑤)', d => { const s = d.steps.find(x => x.id === 'g_trap'); s.problems[4] = JSON.parse(JSON.stringify(s.problems[1])); }, /^⑤/],
    ['geese lesson: the jump named wrong (⑧)', null, /^⑧/, { facts: { fact: (E2, id, sp, m) => { const f = FF.fact(E2, id, sp, m); return f.k === 'jself' ? Object.assign({}, f, { k: 'jopen' }) : f.k === 'wide' ? Object.assign({}, f, { e: f.e + 1 }) : f; } } }],
    ['geese lesson: the escape named wrong (⑧)', null, /^⑧/, { facts: { fact: (E2, id, sp, m) => { const f = FF.fact(E2, id, sp, m); if (!/^(wide|hole|reach0)$/.test(f.k)) return f; const q = E2.Pos.from(sp).play(m), alt = q.foxMoves([]).find(x => FF.shuts(E2, q.clone().play(x)).length); return Object.assign({}, f, { r: alt != null ? alt : -1 }); } } }],
    ['geese lesson: ja words gone (⑦)', null, /^⑦/, { ja: Object.assign({}, AJ, { n: Object.assign({}, AJ.n, { jopen: [] }) }) }],
    ['geese lesson: the hint rings the answer goose (追52)', null, /^追52/, { hintPts: (id, P) => { E.setRule('g15'); return /^g_/.test(id) ? [E.mFrom(P.best)] : A0.make({ getJ: () => 0, J: () => ({}), put: () => 0, L: x => x, fill: t => t }).hintPts(id, P); } }],
    ['geese lesson: 2 right moves (②)', d => { const P = d.steps.find(s => s.id === 'g_trap').problems[2]; P.ok = [P.best, P.best]; }, /^[①②]/],
  ];
  for (const [name, f, re, o] of lcases) { const d = lsc(); if (f) f(d); const out = verifyLessons(Object.assign({ ls: d }, o || {})); const hit = out.some(x => re.test(x.msg)); console.log((hit ? 'caught ' : 'MISSED ') + name); cases.push([name, null, re, { _hit: hit }]); }
  let ok = 0;
  for (const [name, f, re, o] of cases) {
    if (o && '_hit' in o) { if (o._hit) ok++; continue; }
    const d = clone(); if (f) f(d);
    const r = verify(Object.assign({ data: d }, o || {}));
    const hit = r.out.some(x => re.test(x.msg));
    console.log((hit ? 'caught ' : 'MISSED ') + name); if (hit) ok++;
  }
  console.log(`selftest ${ok}/${cases.length}`); return ok === cases.length;
}
module.exports = { verify, verifyLessons, selftest, goodSet, att, def, refutes, THEME, SYM8, symB, diff, setMemo: () => { memo = new Map(); budget = 3e6; } };
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

#!/usr/bin/env node
// Extra problem checks for the lesson loop phase 2 (claude/lesson-quality.md), beyond what tools/lesson-facts.js connect4() already
// enforces inline (①answer=best ②unique ③≥3 legal ⑤no near-duplicate ⑥ramp ⑦words-vs-board). Here are the move-specific facts the
// generic framework cannot express, so a count / endwin problem truly teaches its theme:
//   count  ⑧ the answer neither connects four nor blocks one now, and after it the mover still owns a winning cell up in the air
//            (the zugzwang the lesson is about — not a tactical shot).
//   endwin ⑦ after the answer every legal reply of the opponent loses with best play (the "give the opponent no counter" the words
//            promise), i.e. the win is truly forced and quickest.
// node tools/lesson-verify.js [ur,senet,patolli,connect4,mancala,gomoku,dots,amazons,reversi,checkers,tafl,xiangqi,shogi,shogiOpen,taflOpen]
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
function connect4() {
  const E = require(path.join(ROOT, 'connect4/engine.js')), U = require(path.join(ROOT, 'connect4/tools/c4util.js'));
  const L = require(path.join(ROOT, 'connect4/lessons.json'));
  const out = [];
  const add = (id, j, m) => out.push({ step: id, q: j + 1, msg: m });
  // (2026-11-23 第2期) the 奇数・偶数 / 先手・後手 / 失敗例 lessons (sc = the stored solver values, checked against the solver in
  // lesson-facts.js): ④ the answer does the lesson's move, and ⑥ the problems get no easier — d = the other legal columns that are
  // not an obvious loss (U.obviousLoss: a four missed, a four left to the opponent) never goes down.
  const odd = (p, r) => (p === 1) === (r % 2 === 0);   // (r from 0: the first player's rows are 1・3・5)
  const THEME = {
    parity: (g, me, a) => U.newThreats(g, a, me).some(t => !t.playable && odd(me, t.r)) || 'the answer makes no winning cell in the air on the mover\'s rows',
    zugz: (g, me, a) => U.immWins(g, me).length ? 'the mover can connect four now' : U.immWins(g, 3 - me).length ? 'a block is needed now'
      : U.threats(U.play(g, a, me), me).some(t => !t.playable) || 'after the answer the mover owns no winning cell in the air',
    follow: (g, me, a, P) => me !== 2 ? 'the mover is not the second player' : +P.moves.slice(-1) - 1 !== a ? 'the answer is not on top of the last disc' : true,
    first: (g, me, a) => me !== 1 ? 'the mover is not the first player' : U.newThreats(g, a, me).some(t => !t.playable && odd(1, t.r)) || 'no new odd-row winning cell in the air',
    second: (g, me, a) => me !== 2 ? 'the mover is not the second player' : U.newThreats(g, a, me).some(t => !t.playable && odd(2, t.r)) || 'no new even-row winning cell in the air',
    miss: (g, me, a) => !U.isWinAfter(g, a, me) ? 'the answer does not connect four' : U.immWins(g, 3 - me).length ? true : 'the opponent has no four to block (no temptation)',
    under: (g, me, a) => { const q = 3 - me, T = U.threats(g, q), un = c => T.some(t => t.c === c && t.r === g[c].length + 1);
      return un(a) ? 'the answer is under the opponent\'s winning cell' : U.immWins(g, q).length ? 'a block is needed now' : U.legal(g).some(c => c !== a && un(c)) || 'no column is under the opponent\'s winning cell'; },
    edge: (g, me, a) => a === 0 || a === 6 ? 'the answer is an edge column' : [0, 6].some(c => g[c].length < 6) || 'no edge column is open',
  };
  for (const st of L.steps) { const th = THEME[st.id]; if (!th) continue; let prev = -1;
    st.problems.forEach((P, j) => { const g = U.grid(P.moves), me = U.toMove(P.moves), a = P.answer[0], r = th(g, me, a, P);
      if (r !== true) add(st.id, j, `④ ${r}`);
      // ⑧ the 2D words (ls.first.why 「唯一の勝ちにつながる手」, goal 「勝ちにつながる一手」): the answer wins and no other column does
      if (st.id === 'first' && !(P.sc[a] > 0 && P.sc.every((v, c) => P.answer.includes(c) || !(v > 0)))) add(st.id, j, `⑧ the words say the only winning column, the values are ${JSON.stringify(P.sc)}`);
      const d = U.legal(g).filter(c => !P.answer.includes(c) && !U.obviousLoss(g, c, me)).length;
      if (d < prev) add(st.id, j, `⑥ easier than the problem before (${d} plausible other columns after ${prev})`); prev = Math.max(prev, d); });
  }
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
  if (!(opt && opt.noWords)) out.push(...mancalaWords({ only }));
  return out;
}
// mancalaWords (2026-11-23 第2期, the second pass over MC_DONE; mancala() runs it too): what mancala() cannot see —
//   ① a board the engine solves exactly (to depth 60 with ≤22 seeds on the board) carries the exact values and is marked exact
//   ② no other pit counts as right (16+ points) in the 2D lesson (mancala/app.js problemPoints) — with 6 legal pits the rank formula
//     gave the 2nd best 16  ⑨ the 3D copy of the scoring (atlas/lessons3d.js) agrees with the 2D on every pit
//   ⑦⑧ マンカラビ's words (atlas/lessons3d.js mcLsJa, run here) against the board and the engine: another turn / the captured count
//     in the praise; for every wrong pit: "about as good" / "you lose" / the seeds lost / missing the store / capturing nothing / the
//     capture count / being captured next / the distance to the target; the question 「いちばん長くつなげる」 and the hints
//     (1粒だけの穴・ぴったりの穴が2つ・ねらわれた山を動かす・空の穴をうめる・相手の穴に1粒足す・もう一回で手番を重ねる・ストアをまたぐ・
//     向かいに大きな山) hold on the board, and no hint comes twice in a lesson
function mancalaWords(opt) {
  opt = opt || {};
  const fs = require('fs'), vm = require('vm');
  const E = require(path.join(ROOT, 'mancala/engine.js'));
  if (!E.wasm) { const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(ROOT, 'mancala/engine_simd.wasm'))), { env: { now: () => performance.now() } }); E.setWasm(x.exports); }
  const L = opt.lessons || JSON.parse(fs.readFileSync(path.join(ROOT, 'mancala/lessons.json'), 'utf8')), PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'mancala/puzzles.json'), 'utf8'));
  const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8');
  const X = vm.runInNewContext(src.slice(src.indexOf('  const MCJ_GRP = '), src.indexOf('  const MANCALA = {')) + '\n;({ mcLsJa, MCJ_GRP })', { Int8Array });
  const app = fs.readFileSync(path.join(ROOT, 'mancala/app.js'), 'utf8'), pp = app.slice(app.indexOf('function problemPoints('), app.indexOf('\n}\n', app.indexOf('function problemPoints(')) + 3);
  const PP = vm.runInNewContext(pp + ';problemPoints', {}), pts = (P, k) => P.sc[k] == null ? 0 : PP(P.sc, k);   // (the 2D lesson's scoring, mancala/app.js)
  const P3 = vm.runInNewContext('({' + src.slice(src.indexOf('    points(P, k) {   // (= mancala/app.js problemPoints)'), src.indexOf('    introPos(c) {', src.indexOf('    points(P, k) {   // (= mancala/app.js problemPoints)'))) + '})', {});   // (the 3D lesson's copy)
  const out = [], add = (id, j, m) => out.push({ step: id, q: j + 1, msg: m });
  const dist = (from, to) => { let c = 0, x = from; while (x !== to && c < 30) { x = x === 13 ? 0 : x + 1; if (x !== 13) c++; } return c; };
  const l1 = (a, b) => a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0);
  // every board of the game: the lessons' problems and warm-ups, the puzzles
  const next = (b, R) => { const o = []; for (const s of [0, 1]) for (const k of E.legal(Int8Array.from(b), s, R)) o.push(Array.from(E.trace(Int8Array.from(b), s, k, R).board)); return o; };
  const deep = (b, R) => { const on = b.reduce((s, x, i) => i % 7 === 6 ? s : s + x, 0); E.ttClear(); let r = E.analyze(b, 0, R, 1e9, 18);
    if (!r.exact && on <= 22) { E.ttClear(); r = E.analyze(b, 0, R, 1e9, 60); }
    const v = Array(6).fill(null); r.list.forEach(x => { v[x.m] = Math.round(x.v * 100) / 100; }); return { v, exact: r.exact }; };
  const _unused = (b, R, best) => { let s = 0; for (let d = 1; d <= 16; d++) { E.ttClear(); const l = E.analyze(b, 0, R, 1e9, d).list.slice().sort((x, y) => y.v - x.v); if (l[0].m !== best || (l[1] && l[1].v === l[0].v)) s = d; } return s + 1; };
  const plain = t => String(t || '').replace(/<[^>]+>/g, '');
  for (const [si, st] of L.steps.entries()) { if (!MC_DONE.has(st.id) || (opt.only && !opt.only.has(st.id))) continue;
    const id = st.id, R = st.rules || L.rules || 'kalah';
    st.problems.forEach((P, j) => { const b = Int8Array.from(P.b), leg = E.legal(b, 0, R), A = P.best, tr = k => E.trace(b, 0, k, R);
      if (!leg.includes(A)) { add(id, j, '① the gold pit is not legal'); return; }
      // ① a board the engine solves exactly carries the exact values, marked exact (the words then speak of the end: 負け・差がN粒)
      if (id !== 'sow') { const D = deep(P.b, R);
        if (D.exact && (P.exact !== true || leg.some(k => Math.abs(P.sc[k] - D.v[k]) > 1e-6))) add(id, j, `① exactly solved ${JSON.stringify(D.v)}, stored ${JSON.stringify(P.sc)} exact=${P.exact}`);
        if (!D.exact && P.exact === true) add(id, j, '① stored as exact, the engine does not solve it'); }
      leg.forEach(k => { if (pts(P, k) !== P3.points(P, k)) add(id, j, `⑨ pit ${k}: the 2D scores ${pts(P, k)}, the 3D ${P3.points(P, k)}`); });
      leg.forEach(k => { if (k !== A && pts(P, k) >= 16) add(id, j, `② pit ${k} scores ${pts(P, k)} (counted right)`); });
      // ④ the lesson's own move
      const T = tr(A), thr = c => E.legal(c, 1, R).map(k => E.trace(c, 1, k, R)).filter(t => t.cap >= 3);
      const lines = E.turnMax(b, 0, R).lines.filter(l => l[0] === A), exN = l => { let c = Int8Array.from(b), n = 0; for (const x of l) { const r = E.trace(c, 0, x, R); c = r.board; if (r.extra && !r.over) n++; } return n; };
      // ⑦ ⑧ what マンカラビ says (atlas/lessons3d.js mcLsJa, run here) against the board
      let o; try { o = X.mcLsJa(E, st, P, j, R, pts, si); } catch (e) { add(id, j, `⑧ the words failed: ${e.message}`); return; }
      if (!o) { add(id, j, '⑧ no words'); return; }
      const D2 = id === 'sow' ? null : deep(P.b, R), gt = plain(o.good(A));
      // ⑧ the question and the hint hold on this board
      const ht = plain(o.hintTx), ready = leg.filter(k => tr(k).extra), near = ready.length >= 1 && ready.every(k => k <= A);
      const th3 = leg.length && E.legal(b, 1, R).map(k => ({ k, t: E.trace(b, 1, k, R) })).filter(x => x.t.cap >= 3), drops = T.events.filter(e => e.t === 'drop').map(e => e.at);
      const H8 = [[/1粒だけの穴はない/, P.b[5] === 1 && A === 5], [/ぴったりの穴が2つあったら|候補がいくつかあるなら|遠い穴を先にまくと/, ready.length >= 2 && near], [/ストアに近い穴から順に/, near],
        [/ねらわれた山を動かせば/, th3.some(x => x.t.capFrom === A)], [/空の穴に、種を落としてうめる/, th3.some(x => drops.includes(x.t.land))], [/相手の穴に1粒足して/, th3.some(x => drops.includes(7 + x.k))],
        [/もう一回で手番を重ねられる/, ready.length > 0], [/ストアをまたぐ/, P.target > 6], [/向かいに大きな山/, T.cap >= 4]];
      H8.forEach(([re, ok]) => { if (re.test(ht) && !ok) add(id, j, `⑧ the hint "${ht}" does not hold on this board`); });
      if (/いちばん長くつなげる/.test(plain(o.ask))) { const all = E.turnMax(b, 0, R).lines, mx = Math.max(...all.map(exN)); if (!lines.some(l => exN(l) === mx)) add(id, j, `⑧ asked for the longest run of extra turns, the answer's is shorter (max ${mx})`); }
      if (j >= 2 && st.problems.slice(0, j).some((Q, q) => { try { return plain(X.mcLsJa(E, st, Q, q, R, pts, si).hintTx) === ht; } catch (e) { return false; } })) add(id, j, '⑧ the same hint as an earlier problem');
      if (/もう一回打てる|続けて打てる|手番がきみに残る|もう一度きみの番|もう一回を(つない|重ね)/.test(gt) && !(T.extra && !T.over)) add(id, j, '⑧ the praise says another turn, the answer gives none');
      const gc = gt.match(/(\d+)粒を(横取り|まるごと|ひと息)|向かいの(\d+)粒|相手の山(\d+)粒/); if (gc && +(gc[1] || gc[3] || gc[4]) !== T.cap) add(id, j, `⑧ the praise says ${gc[0]}, the answer captures ${T.cap}`);
      leg.forEach(u => { if (u === A) return; const t = plain(o.ng(u)), G = tr(u);
        if (/ほとんど同じ|ほぼ互角|差はほんのちょっと|ほとんど変わらない|ほぼ同じ働き/.test(t)) add(id, j, `⑦ pit ${u}: said to be about as good as the answer`);
        if (/負けになっちゃう|きみの負け|相手が上回っちゃう|負けに変わる|相手のほうが多くなる/.test(t) && !(D2 && D2.exact && D2.v[u] < 0)) add(id, j, `⑦ pit ${u}: said to lose, the engine gives ${D2 && D2.v[u]}`);
        const dd = t.match(/差が(\d+)粒|(\d+)粒ぶん損|(\d+)粒もったいない|(\d+)粒へっちゃう|差が(\d+)粒少ない/); if (dd) { const n = +(dd[1] || dd[2] || dd[3] || dd[4] || dd[5]); if (!(D2 && D2.exact && Math.round(D2.v[A] - D2.v[u]) === n)) add(id, j, `⑦ pit ${u}: says ${n} seeds lost, the engine gives ${D2 && D2.v[A] - D2.v[u]}`); }
        if (/もう一回がない|ストアの手前で止まっちゃう|ストアまで\d+粒足りない|ストアを通りすぎ|ストアを越えて|ストアの先|ぴったりにならない|ストアを通りこして|ストアに\d+つ届かない|あと\d+粒あればストア/.test(t) && G.extra) add(id, j, `⑦ pit ${u}: said to miss the store, it gives another turn`);
        if (/横取りできないの|横取りはなし|取れないの|向かいの山に手が届かない|種のある穴に落ち/.test(t) && G.cap) add(id, j, `⑦ pit ${u}: said to capture nothing, it captures ${G.cap}`);
        const cs = t.match(/横取りは(\d+)粒|(\d+)粒しか入らない|横取りできるのは(\d+)粒|(\d+)粒どまり。|山が(\d+)粒しかない/); if (cs && /横取り|向かいの山/.test(t) && +(cs[1] || cs[2] || cs[3] || cs[4] || cs[5]) !== G.cap) add(id, j, `⑦ pit ${u}: says it captures ${cs[0]}, it captures ${G.cap}`);
        if (/相手に横取りされて|相手の横取りで|横取りが待って|横取りの的/.test(t) && (G.extra || !E.legal(G.board, 1, R).some(k => E.trace(G.board, 1, k, R).cap))) add(id, j, `⑦ pit ${u}: said to be captured next, the opponent cannot capture`);
        if (id === 'sow') { const m = t.match(/目標の(\d+)つ手前|目標まで(\d+)つ足りない|目標に(\d+)つ届かない|あと(\d+)つのところ|目標を(\d+)つ通りすぎ|目標より(\d+)つ先|目標の(\d+)つ先|(\d+)つ多すぎ|目標を(\d+)つ追いこし/);
          const off = P.b[u] - dist(u, P.target); if (!m || +(m.slice(1).find(x => x)) !== Math.abs(off) || (off < 0) !== /手前|足りない|届かない|ところ/.test(m[0])) add(id, j, `⑦ pit ${u}: the words "${m && m[0]}" vs ${off} from the target`); }
      });
    });
  }
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
// dots & boxes (2026-11-23 第2期)：the lessons in DT_DONE, every problem (problem 0 is the worked example of the 2D intro and the 3D
// intro; 1–5 are the 3D lesson; 1 + four of 2–9 the 2D lesson), with the exact solver (dots/engine.js Solver.all, every legal line):
//   ① the stored value of every legal line equals the solver's   ② the best value is at least one box (2) above the next, and no
//      worse line counts as right (16+ points) in the 2D (dots/learn.js rankPoints) or the 3D (atlas/lessons3d.js dRank) scoring
//      ⑨ the two scorings agree on every line   ③ at least 3 legal lines and at least 2 worse than the best
//   ④ the lesson's move: safe = a 3×3 board, no box to take, the best lines are exactly the safe lines; third = the same on a 4×4 with
//      a trap (an inner line safe on one side, a third side on the other); take = a box to take and every best line takes one;
//      chain = no safe line, nothing to take, the best lines hand over the fewest boxes and the other lines do not all hand over as few
//   ⑤ no other problem of the game (every lesson, the puzzles) within 2 lines (the 8 symmetries)
//   ⑥ problems 1–9 get no easier (d: safe / third = the unsafe lines that touch a box of 0–1 sides, take = the lines that take
//      nothing, chain = the chains and loops) and the last is harder than problem 1
//   ⑦⑧ ハコピヨ's words (atlas/lessons3d.js dotsJa, run here) against the board: the boxes the red line hands over (≥1 when the
//      words say so) and the boxes lost ((best − v) / 2), no 「開く」 for a line that takes, the question's 「1本」 / 「広い盤」 and the
//      2D example's 「緑の点線も安全な線で、どれを選んでも同じ結果」 (problem 0 has other safe lines, all best)
const DT_DONE = new Set(['safe', 'third', 'take', 'chain']);
function dots(opt) {
  const fs = require('fs'), vm = require('vm');
  const E = require(path.join(ROOT, 'dots/engine.js')), L = (opt && opt.lessons) || JSON.parse(fs.readFileSync(path.join(ROOT, 'dots/lessons.json'), 'utf8'));
  const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8');
  const X = vm.runInNewContext(src.slice(src.indexOf('  const DK = '), src.indexOf('  const DOTS = {')) + '\n;({ dDecE, dDecV, dDecO, dRank, dFacts, dotsJa, DTJ })', {});
  const lj = fs.readFileSync(path.join(ROOT, 'dots/learn.js'), 'utf8'), rp = lj.slice(lj.indexOf('function rankPoints('), lj.indexOf('\n}\n', lj.indexOf('function rankPoints(')) + 3);
  const RP = vm.runInNewContext(rp + ';rankPoints', {});
  const out = [], only = opt && opt.only, add = (id, j, m) => out.push({ step: id, q: j + 1, msg: m });
  const pool = []; L.steps.forEach(st => st.problems.forEach((q, j) => pool.push([`${st.id} q${j + 1}`, q])));
  for (const f of fs.readdirSync(path.join(ROOT, 'dots/puzzles'))) { const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'dots/puzzles', f), 'utf8'));
    (d.levels || []).forEach((lv, i) => (lv || []).forEach((q, j) => { if (q && q.e) pool.push([`puzzle ${d.cat} ${i + 1}-${j + 1}`, q]); })); }
  const dist = (a, b) => { if (a.n !== b.n) return 99; const G = E.geom(a.n, a.n), A = X.dDecE(a.e), B = new Set(X.dDecE(b.e)); let best = 99;
    for (const P of G.perms) { const A2 = new Set(A.map(e => P[e])); let d = 0; for (const e of A2) if (!B.has(e)) d++; for (const e of B) if (!A2.has(e)) d++; best = Math.min(best, d); } return best; };
  const plain = t => String(t || '').replace(/<[^>]+>/g, '');
  L.steps.forEach((st, si) => { const id = st.id; if (!DT_DONE.has(id) || (only && !only.has(id))) return;
    let prevD = -1, firstD = null;
    st.problems.forEach((q, j) => { const a = m => add(id, j, m), G = E.geom(q.n, q.n), edges = X.dDecE(q.e), p = E.Pos.from(G, edges), lg = p.legal();
      const S = new E.Solver(G), all = S.all(p), V = new Map(X.dDecV(q.v)), vs = all.map(x => x.v), best = Math.max(...vs);
      // ①
      for (const x of all) if (V.get(x.m) !== x.v) a(`① line ${x.m}: stored ${V.get(x.m)}, the solver ${x.v}`);
      if (V.size !== lg.length) a(`① ${V.size} stored values for ${lg.length} legal lines`);
      const B = all.filter(x => x.v === best).map(x => x.m), worse = all.filter(x => x.v < best), sec = worse.length ? Math.max(...worse.map(x => x.v)) : null;
      // ② ⑨
      if (sec !== null && best - sec < 2) a(`② the next line is only ${best - sec} below the best`);
      const vals = all.map(x => [x.m, x.v]);
      for (const x of all) { const p2 = RP(vals, x.v), p3 = X.dRank(vals, x.v); if (p2 !== p3) a(`⑨ line ${x.m}: the 2D scores ${p2}, the 3D ${p3}`);
        if (x.v < best && Math.max(p2, p3) >= 16) a(`② line ${x.m} (${x.v} < ${best}) scores ${Math.max(p2, p3)} (counted right)`); }
      // ③
      if (lg.length < 3 || worse.length < 2) a(`③ ${lg.length} legal lines, ${worse.length} worse than the best`);
      // ④
      const safe = lg.filter(e => p.isSafe(e)), cap = p.hasCapture(), F = X.dFacts(q.n, edges), same = (x, y) => x.length === y.length && x.every(e => y.includes(e));
      const cntOf = bx => bx < 0 ? -1 : p.cnt[bx], trap = lg.filter(e => !p.isSafe(e) && G.eb1[e] >= 0 && [G.eb0[e], G.eb1[e]].some(bx => cntOf(bx) <= 1));
      let d = 0;
      if (id === 'safe' || id === 'third') {
        if (q.n !== (id === 'safe' ? 3 : 4)) a(`④ a ${q.n}×${q.n} board (the lesson's: ${id === 'safe' ? 3 : 4}×${id === 'safe' ? 3 : 4})`);
        if (cap) a('④ a box to take'); if (!same(B, safe)) a(`④ the best lines ${B} are not the safe lines ${safe}`);
        if (id === 'third' && !trap.length) a('④ no inner line that is safe on one side only');
        d = lg.filter(e => !p.isSafe(e) && [G.eb0[e], G.eb1[e]].some(bx => bx >= 0 && p.cnt[bx] <= 1)).length;
      } else if (id === 'take') {
        if (!cap) a('④ no box to take'); if (!B.every(e => p.completes(e) > 0)) a(`④ a best line takes nothing (${B.filter(e => !p.completes(e))})`);
        d = lg.filter(e => !p.completes(e)).length;
      } else if (id === 'chain') {
        if (safe.length || cap) a(`④ ${safe.length} safe lines, a box to take: ${cap}`);
        const m = e => F.of(e).m, mn = Math.min(...lg.map(m));
        if (!B.every(e => m(e) === mn)) a(`④ a best line hands over ${B.map(m)} boxes, the fewest is ${mn}`);
        if (lg.every(e => m(e) === mn)) a('④ every line hands over as few boxes');
        d = E.components(p, false).length;
      }
      // ⑥ (problem 0 is the worked example)
      if (j >= 1) { if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d); if (firstD === null) firstD = d;
        if (j === st.problems.length - 1 && !(d > firstD)) a(`⑥ the last problem is no harder than problem 2 (d ${d} vs ${firstD})`); }
      // ⑤
      for (const [who, r] of pool) { if (r === q) continue; const e = dist(q, r); if (e <= 2) a(`⑤ ${e} lines from ${who}`); }
      // ⑦ ⑧ the 3D words (problems 1–5) and the 2D example's caption (problem 0)
      if (j === 0 && id === 'safe' && !(safe.length >= 2 && same(B, safe))) a(`⑧ the example's 「緑の点線も安全な線で、どれを選んでも同じ結果」: ${safe.length} safe lines, best ${B}`);
      if (j >= 1 && j <= 5) { const i = j - 1, ask = X.DTJ[id].ask[i % 5], P = { values: vals }, ans = B[0], W = X.dotsJa(st, F, P, ans, i, si);
        if (/1本/.test(plain(ask)) && B.length !== 1) a(`⑧ the question 「${ask}」 with ${B.length} best lines`);
        if (/広い盤/.test(ask) && q.n < 4) a(`⑧ the question 「${ask}」 on a ${q.n}×${q.n}`);
        const g = plain(W.good(ans)), fb = F.of(ans);
        if (/\{|undefined|NaN/.test(g)) a(`⑧ the praise 「${g}」`);
        if (fb.cls === 'take' && !g.includes(String(fb.k)) && /\d箱|箱を\d/.test(g)) a(`⑧ the praise 「${g}」: the line takes ${fb.k}`);
        for (const x of worse) { const t = plain(W.ng(x.m)), fx = F.of(x.m), L2 = (best - x.v) / 2;
          if (/\{|undefined|NaN/.test(t)) { a(`⑧ the words for line ${x.m}: 「${t}」`); continue; }
          const n = t.match(/(\d+)箱の差|(\d+)箱ぶん、もったいない|(\d+)箱ちがって/); if (n && +(n[1] || n[2] || n[3]) !== L2) a(`⑦ line ${x.m}: the words say ${n[0]}, the solver ${L2} boxes`);
          if (!n) a(`⑦ line ${x.m}: the words do not say the boxes lost (${L2})`);
          if (/(^|[^\d])0箱/.test(t)) a(`⑦ line ${x.m}: 「${t}」 (0 boxes)`);
          const g2 = t.match(/相手に(\d+)箱|(\d+)箱が相手|(\d+)箱をぺろり|(\d+)箱が渡る|(\d+)箱を丸ごと|(\d+)箱の鎖|(\d+)箱あげる|(\d+)箱を渡す|(\d+)箱をまとめて|(\d+)箱をごっそり/);
          if (g2) { const k = +g2.slice(1).find(Boolean); if (k !== fx.m) a(`⑦ line ${x.m}: the words say ${g2[0]}, the line hands over ${fx.m}`); }
          if (fx.cls === 'take' && /開/.test(t)) a(`⑦ line ${x.m} takes a box, the words say it opens: 「${t}」`); } }
    }); });
  dtIntro(L, X, E, lj, add, only);
  return out;
}
// (2026-11-24 第2期 追14) the dots examples of DT_DONE (no warm-up: problem 0 is the worked example under the 2D intro and the 3D intro's
// board): the 2D figure as learn.js exampleMarks draws it (gold = right, green dotted = the other safe lines) against its caption
// (ls.<id>.ex / ls.exampleCap / the body, ja): every gold line is a best line; 「緑」 ⇔ green lines are drawn, 「どれを選んでも同じ
// 結果」 = every green line is best; the final score a + b = the boxes; 「点線の枠で光っている箱」 = a box to take is framed; 「数字は鎖の
// 長さ」 = chains to number; the chain figure (LFIGS) = its caption (a loop of 4 top left, a chain of 5 around it); ハコピヨ's 3D intro
// (DTJ.intro) against the same board: safe = a safe line and a line giving a third side; third = 4×4, boxes with two sides here and
// there (2+), a line safe on one side only; take = a box to take and the best line takes; chain = no safe line, and 「…と、輪になった
// ループに分かれ」 only with a loop on the board.
function dtIntro(L, X, E, lj, add, only) {
  const fs = require('fs'), vm = require('vm'), ja = JSON.parse(fs.readFileSync(path.join(ROOT, 'dots/content/text.ja.json'), 'utf8'));
  const cut = (a, b) => lj.slice(lj.indexOf(a), lj.indexOf(b, lj.indexOf(a)));
  const EM = vm.runInNewContext(cut('function exampleMarks(', '\n}\n') + '\n}\n;exampleMarks', {});
  const LF = vm.runInNewContext(cut('const LFIGS = ', '})();') + '})();\n;LFIGS', {});
  const plain = t => String(t || '').replace(/<[^>]+>/g, '');
  L.steps.forEach(st => { const id = st.id; if (!DT_DONE.has(id) || (only && !only.has(id))) return;
    const a = m => add(id, -1, `example (problem 1): ${m}`), q = st.problems[0], G = E.geom(q.n, q.n), p = E.Pos.from(G, X.dDecE(q.e)), V = X.dDecV(q.v);
    const best = Math.max(...V.map(x => x[1])), val = new Map(V), lg = p.legal(), safe = lg.filter(e => p.gives(e) === 0 && p.completes(e) === 0);
    const mk = EM(id, V, safe), ex = plain(ja[`ls.${id}.ex`]), body = plain([].concat(ja[`ls.${id}.body`] || []).join(' ')), green = mk.safe || [];
    if (!mk.hl.length || mk.hl.some(e => val.get(e) !== best)) a(`⑧ the gold lines ${mk.hl} are not best lines (best ${best})`);
    if (/緑/.test(ex) !== green.length > 0) a(`⑧ the caption 「${ex}」 with ${green.length} green lines drawn`);
    if (/どれを選んでも同じ結果/.test(ex) && green.some(e => val.get(e) !== best)) a(`⑧ 「どれを選んでも同じ結果」: green ${green.map(e => e + '=' + val.get(e))}, best ${best}`);
    const sc = [0, 0]; let f = 0; X.dDecO(q.o).forEach(o => { if (o >= 0) { sc[o]++; f++; } });
    const rem = q.n * q.n - f, fa = sc[0] + (rem + best) / 2, fb = sc[1] + (rem - best) / 2;
    if (!Number.isInteger(fa) || !Number.isInteger(fb) || fa < 0 || fb < 0) a(`⑧ ls.exampleCap: the final score ${fa} − ${fb}`);
    const cap3 = []; for (let b = 0; b < G.B; b++) if (p.cnt[b] === 3) cap3.push(b);
    if (/点線の枠で光っている箱/.test(body) && !cap3.length) a('⑧ the body speaks of the framed boxes to take, the example has none');
    if (/数字は鎖の長さ/.test(ex) && !E.components(p, true).length) a('⑧ 「数字は鎖の長さ」: no chain on the example');
    // the chain figure
    if (id === 'chain') { const fg = (LF.chain || [])[0]; if (!fg) a('⑧ the chain figure is missing'); else {
      const P2 = E.Pos.from(E.geom(fg.fig.R, fg.fig.C), Object.keys(fg.fig.by).map(Number)), cs = E.components(P2, true);
      const lp = cs.find(c => c.loop), ch = cs.find(c => !c.loop), cap = plain(ja[fg.cap]);
      if ([...P2.cnt].some(c => c !== 2) || !lp || lp.n !== 4 || [0, 1, 3, 4].some(b => !lp.boxes.includes(b)) || !ch || ch.n !== 5 || cs.length !== 2 || /L4/.test(cap) !== true) a(`⑧ the chain figure 「${cap}」: ${cs.map(c => (c.loop ? 'L' : '') + c.n)}`);
      for (const [b, t] of Object.entries(fg.fig.num)) { const c = cs.find(c => c.boxes.includes(+b)); if (!c || String(t) !== (c.loop ? 'L' : '') + c.n) a(`⑧ the chain figure's number ${t} on box ${b}`); } } }
    // ハコピヨ's 3D intro on the same board
    const it = plain(X.DTJ[id] && X.DTJ[id].intro), two = [...p.cnt].filter(c => c === 2).length;
    const trap = lg.filter(e => !p.isSafe(e) && G.eb1[e] >= 0 && [G.eb0[e], G.eb1[e]].some(b => b >= 0 && p.cnt[b] <= 1));
    if (!it) a('⑧ no 3D intro');
    if (id === 'safe' && !(safe.length && lg.some(e => p.gives(e) > 0))) a(`⑧ the 3D intro (safe): ${safe.length} safe lines on its board`);
    if (id === 'third' && !(q.n === 4 && two >= 2 && trap.length)) a(`⑧ the 3D intro (third) 「盤が広くなると…両がわ」: ${q.n}×${q.n}, ${two} boxes with two sides, ${trap.length} lines safe on one side only`);
    if (id === 'take' && !(p.hasCapture() && V.filter(x => x[1] === best).every(x => p.completes(x[0]) > 0))) a('⑧ the 3D intro (take): no box to take, or the best line takes nothing');
    if (id === 'chain') { if (safe.length) a(`⑧ the 3D intro (chain) 「安全な線がなくなると」: ${safe.length} safe lines on its board`);
      if (/と、輪になった/.test(it) && !E.components(p, true).some(c => c.loop)) a(`⑧ the 3D intro (chain) 「${it.slice(0, 40)}…」 speaks of the board's loops, its board has none`); }
  });
}
// (2026-11-24 第2期) amazons, the basics (AM_DONE): every right answer is a goal of the rules (no engine opinion), so ①② = the stored
// answers are exactly the legal moves that reach the goal — b_queen: the amazon lands on the glowing square; b_arrow / b_block: the arrow
// hits it; b_win: Black has no move left. ③ ≥3 legal moves, ≥3 landing squares and the goal a minority. ④ the step's shape. ⑤ no
// other amazons position (lessons, warm-ups, puzzles, the 8 symmetries) within 2 squares. ⑥ d never goes down, the last > problem 1.
// ⑦⑧ ケロ's 3D words (atlas/lessons3d.js amLsJa): the question and hint of problem k fit its board, the praise's facts, and for EVERY
// wrong move the reason it gives is the board's (short of / past the goal, the wrong way, a blocker, not in line, an arrow shot short,
// the exits left). ⑨ the 2D (amazons/app.js lessonAnswer) and the 3D (points) both score P.ok.
const AM_DONE = new Set(['b_queen', 'b_arrow', 'b_block', 'b_win', 's_trap', 's_escape', 's_wall', 's_fill']);
function amazons(opt) {
  const fs = require('fs'), vm = require('vm');
  const E = require(path.join(ROOT, 'amazons/engine.js')), L = (opt && opt.lessons) || JSON.parse(fs.readFileSync(path.join(ROOT, 'amazons/lessons.json'), 'utf8'));
  const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8');
  const X = vm.runInNewContext('const AMAZONS = { data: null };' + src.slice(src.indexOf('  const AMM = '), src.indexOf('  const AMAZONS = {')) + '\n;({ AMJ_LS, amLsJa, AMAZONS })', {});
  X.AMAZONS.data = { ls: L };
  const out = [], only = opt && opt.only, add = (id, j, m) => out.push({ step: id, q: j + 1, msg: m });
  // ⑨ both versions score the same list
  const app = fs.readFileSync(path.join(ROOT, 'amazons/app.js'), 'utf8');
  if (!/const pts = P\.ok\.includes\(m\) \? 20 : 0;/.test(app)) add('-', -1, '⑨ amazons/app.js lessonAnswer does not score P.ok');
  if (!/points\(P, m\) \{ return \(P\.ok \|\| \[P\.best\]\)\.includes\(m\) \? 20 : 0; \}/.test(src)) add('-', -1, '⑨ the 3D AMAZONS.points does not score P.ok');
  const { mFrom, mTo, mArrow, RC } = E, N = E.sqName;
  const RCo = i => RC[i], al = (f, t) => { if (f == null || t == null) return false; const [r1, c1] = RCo(f), [r2, c2] = RCo(t); return f !== t && (r1 === r2 || c1 === c2 || Math.abs(r1 - r2) === Math.abs(c1 - c2)); };
  const seg = (f, t) => { const [r1, c1] = RCo(f), [r2, c2] = RCo(t), dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1), o = []; let r = r1 + dr, c = c1 + dc; while (r !== r2 || c !== c2) { o.push(r * 10 + c); r += dr; c += dc; } return o; };
  const cheb = (f, t) => f == null || t == null ? -1 : Math.max(Math.abs(RCo(f)[0] - RCo(t)[0]), Math.abs(RCo(f)[1] - RCo(t)[1]));
  const btw = (f, x, t) => al(f, t) && seg(f, t).includes(x);   // x strictly between f and t
  const blk = (sq, f, t) => seg(f, t).some(q => sq[q]);
  const whites = p => { const o = []; for (let k = 0; k < 8; k++) if (p.q[k] >= 0 && p.sq[p.q[k]] === 1) o.push(p.q[k]); return o; };
  const blacks = p => { const o = []; for (let k = 0; k < 8; k++) if (p.q[k] >= 0 && p.sq[p.q[k]] === 2) o.push(p.q[k]); return o; };
  // ⑤ the pool: every position the game shows
  const pool = [];
  L.steps.forEach(st => { st.problems.forEach((q, j) => pool.push([`${st.id} q${j + 1}`, q.s.b])); (st.ramp || []).forEach((r, j) => pool.push([`${st.id} ramp ${j + 1}`, r.s.b])); });
  const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'amazons/puzzles.json'), 'utf8'));
  (PZ.themes || []).forEach(th => (th.puzzles || []).forEach((q, j) => pool.push([`puzzle ${th.id} ${j + 1}`, q.s.b])));
  const SYM = [(r, c) => [r, c], (r, c) => [r, 9 - c], (r, c) => [9 - r, c], (r, c) => [9 - r, 9 - c], (r, c) => [c, r], (r, c) => [c, 9 - r], (r, c) => [9 - c, r], (r, c) => [9 - c, 9 - r]];
  const dist = (a, b) => { let best = 99; for (const S of SYM) { let d = 0; for (let i = 0; i < 100 && d < best; i++) { const [r, c] = S((i / 10) | 0, i % 10); if (a[i] !== b[r * 10 + c]) d++; } best = Math.min(best, d); } return best; };
  const rooms = sq => { const seen = new Int8Array(100).fill(-1), R = []; let w = 0, b = 0, sep = true;
    for (let s0 = 0; s0 < 100; s0++) { if (sq[s0] === 3 || seen[s0] >= 0) continue; const Q = [s0]; seen[s0] = R.length;
      for (let h = 0; h < Q.length; h++) { const [r, c] = RCo(Q[h]); for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc, t = rr * 10 + cc; if ((dr || dc) && rr >= 0 && rr < 10 && cc >= 0 && cc < 10 && seen[t] < 0 && sq[t] !== 3) { seen[t] = R.length; Q.push(t); } } }
      const nw = Q.filter(q => sq[q] === 1).length, nb = Q.filter(q => sq[q] === 2).length, ne = Q.filter(q => !sq[q]).length; R.push({ nw, nb, ne });
      if (nw && nb) sep = false; else if (nw) w += ne; else if (nb) b += ne; }
    return { sep, w, b, R }; };
  const nbr = i => { if (i == null || i < 0) return []; const [r, c] = RCo(i), o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if ((dr || dc) && rr >= 0 && rr < 10 && cc >= 0 && cc < 10) o.push(rr * 10 + cc); } return o; };
  const freeN = (sq, x) => nbr(x).filter(t => !sq[t]).length;
  // the most moves an amazon on a can make alone (squares sq: 0 empty), brute force with a memo on the filled squares
  const fillBF = (sq0, a0) => { const memo = new Map(), sq = Array.from(sq0); const key = a => sq.join('') + a;
    const rec = a => { const k = key(a); if (memo.has(k)) return memo.get(k); let best = 0;
      for (let d = 0; d < 8; d++) { const DR = [-1, -1, -1, 0, 0, 1, 1, 1][d], DC = [-1, 0, 1, -1, 1, -1, 0, 1][d]; let [r, c] = RCo(a);
        for (;;) { r += DR; c += DC; if (r < 0 || r > 9 || c < 0 || c > 9) break; const t = r * 10 + c; if (sq[t]) break;
          sq[a] = 0; sq[t] = 1;
          for (let e = 0; e < 8; e++) { let [r2, c2] = [r, c]; for (;;) { r2 += [-1, -1, -1, 0, 0, 1, 1, 1][e]; c2 += [-1, 0, 1, -1, 1, -1, 0, 1][e]; if (r2 < 0 || r2 > 9 || c2 < 0 || c2 > 9) break; const u = r2 * 10 + c2; if (sq[u]) break; sq[u] = 3; best = Math.max(best, 1 + rec(t)); sq[u] = 0; } }
          sq[t] = 0; sq[a] = 1; } }
      memo.set(k, best); return best; };
    return rec(a0); };
  L.steps.forEach((st, si) => { const id = st.id; if (!AM_DONE.has(id) || (only && !only.has(id))) return;
    if (id.startsWith('s_')) return amStrat(st);
    let prevD = -1, firstD = null;
    st.problems.forEach((P, j) => { const a = m => add(id, j, m), p = E.Pos.from(P.s), all = p.moves(), T = (P.mk || [])[0], W = whites(p), B = blacks(p);
      if (P.s.side !== 1) a('① White is not to move');
      // ①②
      const goal = id === 'b_queen' ? m => mTo(m) === T : id === 'b_win' ? m => { p.play(m); const r = !p.canMove(2); p.unplay(m); return r; } : m => mArrow(m) === T;
      if (id !== 'b_win' && T == null) a('④ no glowing square');
      const G = all.filter(goal), okS = new Set(P.ok), Gs = new Set(G);
      if (!G.length) a('① the goal cannot be reached');
      P.ok.forEach(m => { if (!all.includes(m)) a(`① the answer ${m} is not legal`); else if (!Gs.has(m)) a(`① the answer ${E.name(p, m)} does not reach the goal`); });
      G.forEach(m => { if (!okS.has(m)) a(`② ${E.name(p, m)} reaches the goal but is scored wrong`); });
      if (!okS.has(P.best)) a('① best is not an answer');
      // ③
      const dests = new Set(all.map(m => mFrom(m) * 100 + mTo(m))), okD = new Set(G.map(m => mFrom(m) * 100 + mTo(m)));
      if (all.length < 3 || dests.size < 3) a(`③ ${all.length} legal moves, ${dests.size} landing squares`);
      if (G.length > all.length * 0.3) a(`③ ${G.length} of ${all.length} moves are right`);
      if (id !== 'b_queen' && id !== 'b_win' && dests.size < okD.size * 3) a(`③ ${okD.size} of ${dests.size} landing squares are right`);
      // ④ and d (⑥)
      let d = 0;
      if (id === 'b_queen') { G.forEach(m => { if (cheb(mFrom(m), T) < 3) a('④ the goal is less than 3 squares away'); });
        const from = new Set(G.map(mFrom)), dec = W.filter(f => !from.has(f) && al(f, T) && blk(p.sq, f, T));
        if (from.size !== 1) a(`④ ${from.size} amazons reach the goal`);
        d = W.length + dec.length; }
      if (id === 'b_arrow' || id === 'b_block') { W.forEach(f => { if (al(f, T) && !blk(p.sq, f, T)) a(`④ the white amazon on ${N(f)} already sees the target`); });
        if (id === 'b_block') { if (okD.size > 2) a(`④ ${okD.size} landing squares see the target (the lesson: few lines)`); if ([...P.s.b].filter(c => c === 'x').length < 16) a('④ not a crowded board'); }
        d = Math.floor(dests.size / Math.max(1, okD.size)); }
      if (id === 'b_win') { if (!p.canMove(2)) a('④ Black is stuck already'); d = Math.floor(all.length / Math.max(1, G.length)); }
      if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d); if (firstD === null) firstD = d;
      if (j === st.problems.length - 1 && !(d > firstD)) a(`⑥ the last problem is no harder than problem 1 (d ${d} vs ${firstD})`);
      // ⑤
      for (const [who, b] of pool) { if (b === P.s.b) { if (who !== `${id} q${j + 1}`) a(`⑤ the same position as ${who}`); continue; } const e = dist(P.s.b, b); if (e <= 2) a(`⑤ ${e} squares from ${who}`); }
      // ⑦⑧ the 3D words
      let Wd; try { Wd = X.amLsJa(E, st, P, j); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
      const ask = Wd.ask, hint = Wd.hintTx, ex0 = E.emptyAround(p, 2);
      const need = (t, re, ok, why) => { if (re.test(t) && !ok) a(`⑧ 「${t}」: ${why}`); };
      for (const t of [ask, hint]) {
        need(t, /どのアマゾン|アマゾンごとに|届くアマゾンはどれ/, W.length >= 2, `${W.length} white amazon`);
        need(t, /線の途中に矢がないか/, W.some(f => al(f, T) && blk(p.sq, f, T)), 'no amazon in line with the goal behind an arrow');
        need(t, /遠くても/, G.some(m => cheb(mFrom(m), T) >= 4), 'the goal is near');
        need(t, /近くの線ほど.*遠くからの線/, G.every(m => cheb(mTo(m), T) >= 3), 'the answer shoots from near');
        need(t, /アマゾンの通り道も/, [...Array(100).keys()].some(s => !p.sq[s] && al(s, T) && !blk(p.sq, s, T) && W.some(f => al(f, s) && blk(p.sq, f, s)) && !W.some(f => okD.has(f * 100 + s))), 'no square that sees the target behind a blocked path');
        need(t, /黒のアマゾン全部|黒の全部のアマゾン/, B.length >= 2, `${B.length} black amazon`);
        need(t, /出口が2つなら/, ex0.length === 2, `${ex0.length} exits`);
        need(t, /白が動いたあとの元のマスが/, all.some(m => { if (okS.has(m) || !E.NB[mFrom(m)].some(x => p.sq[x] === 2)) return false; const q = p.clone().play(m); if (q.sq[mFrom(m)]) return false; q.sq[mFrom(m)] = 3; return !q.canMove(2); }), 'no move that closes every exit but the square it leaves');
      }
      const plain = t => String(t).replace(/[\u0001\u0002]/g, '');
      for (const u of P.ok) { const good = plain(Wd.good(u)), f0 = mFrom(u), t0 = mTo(u), a0 = mArrow(u), nu = E.name(p, u);   // (the praise of every right move: ケロ praises the one played)
      if (/\{|undefined|NaN/.test(good)) a(`⑧ the praise of ${nu} 「${good}」`);
      { const g = good.match(/(.)(から！|んだ[。！])/); if (g && !/[るうくすつぬむぶぐいただ]/.test(g[1])) a(`⑧ the praise of ${nu} 「${good}」: 「${g[0]}」 is not Japanese`); }
      { const n = good.match(/(\d+)マス/); const n0 = id === 'b_queen' ? seg(f0, t0).length + 1 : seg(t0, a0).length + 1; if (n && +n[1] !== n0) a(`⑧ the praise of ${nu} 「${good}」: ${n0} squares`); }
      { const dm = good.match(/(縦|横|斜め)/); const dd = id === 'b_queen' ? [f0, t0] : [t0, a0], [r1, c1] = RCo(dd[0]), [r2, c2] = RCo(dd[1]), d0 = c1 === c2 ? '縦' : r1 === r2 ? '横' : '斜め'; if (dm && dm[1] !== d0 && id !== 'b_win') a(`⑧ the praise of ${nu} 「${good}」: ${d0}`); }
      if (id === 'b_win') { const byT = ex0.includes(t0), byA = ex0.includes(a0);
        if (/矢が刺さって|残った1マスに矢|矢1本で/.test(good) && !byA) a(`⑧ the praise of ${nu} 「${good}」: the arrow is not in an exit`);
        if (/アマゾンで1つ、矢で1つ|白が片方の出口に入り|動きでふたを1つ|動きと矢で|出口2つをまとめて/.test(good) && !(byT && byA)) a(`⑧ the praise of ${nu} 「${good}」`);
        if (/元のマス|来た道|すき間まで/.test(good) && !(byT && a0 === f0)) a(`⑧ the praise of ${nu} 「${good}」`); } }
      // every wrong move
      for (const m of all) { if (okS.has(m)) continue;
        const raw = plain(Wd.ng(m)), i0 = raw.indexOf('赤い印の手'), t = i0 >= 0 ? raw.slice(i0) : raw, f = mFrom(m), to = mTo(m), ar = mArrow(m), nm = E.name(p, m);
        if (i0 < 0) { a(`⑦ ${nm}: the words do not name the move`); continue; }
        { const g = raw.match(/(.)(から！|んだ[。！])/); if (g && !/[るうくすつぬむぶぐいただ]/.test(g[1])) a(`⑧ ${nm}: 「${raw}」: 「${g[0]}」 is not Japanese`); }
        const q = p.clone().play(m);
        if (id === 'b_queen') { const A = al(f, T), Bk = A && blk(p.sq, f, T), short = btw(f, to, T), past = btw(f, T, to);
          const cls = /一直線に並んでいない|曲がらないと|どれにも並ばない/.test(t) ? 'line' : /じゃまもの|ふさがっていて/.test(t) ? 'block' : /手前で止ま|足りなくて|距離が短い/.test(t) ? 'short' : /通りすぎ|行きすぎ/.test(t) ? 'past' : /向きがちがって|方向にある|反対|逆向き/.test(t) ? 'way' : '?';
          const want = !A ? 'line' : Bk ? 'block' : short ? 'short' : past ? 'past' : 'way';
          if (cls !== want) a(`⑦ ${nm}: 「${t}」 (the board: ${want})`);
          const dm = t.match(/(縦|横|斜め)に動いても、ゴールは(縦|横|斜め)の方向/); if (dm && dm[1] === dm[2]) a(`⑦ ${nm}: 「${t}」`); }
        else if (id === 'b_arrow' || id === 'b_block') { const sq2 = q.sq.slice(); sq2[ar] = 0; const A = al(to, T), Bk = A && blk(sq2, to, T), sh = A && !Bk && btw(to, ar, T);
          const cls = /一直線に並ばな|どれにも見えない|ずれていて/.test(t) ? 'line' : /手前のマスに刺さ|的の手前で止め|的まで飛んでいない/.test(t) ? 'short' : /じゃまもの|ふさがれてる|飛び越えられない/.test(t) ? 'block' : /別のマスに撃|向きがずれて/.test(t) ? 'aim' : '?';
          const want = !A ? 'line' : Bk ? 'block' : sh ? 'short' : 'aim';
          if (cls !== want) a(`⑦ ${nm}: 「${t}」 (the board: ${want})`); }
        else if (id === 'b_win') { const n = E.emptyAround(q, 2).length, op = E.NB[f].some(x => p.sq[x] === 2) && q.sq[f] === 0;
          if (/新しい出口|空きマスから、黒が逃げ/.test(t)) { if (!op) a(`⑦ ${nm}: 「${t}」 (the square left is not an exit)`); }
          else { const k = t.match(/(\d+)つ/); if (!k) a(`⑦ ${nm}: 「${t}」 (no count of the exits)`); else if (+k[1] !== n) a(`⑦ ${nm}: 「${t}」 (${n} exits left)`); } }
      }
    }); });
  // (2026-11-24 第2期) the strategy steps s_trap・s_escape・s_wall・s_fill — the goal of each is a fact of the rules, checked here on
  // its own (the rooms by a flood fill of this file, the moves left in a room by a brute-force search of this file):
  //  s_trap: the marked black amazon has no empty square next to it after the move; s_escape: the marked white amazon moves, has 4 or
  //  more empty squares round it and no black reply boxes it in; s_wall: the board splits (no room with both colours) with the most for
  //  White (its empty squares − Black's); s_fill: the most moves left for White's amazon in its own room.
  function amStrat(st) { const id = st.id; let prevD = -1, firstD = null;
    // 追18: a threshold the scoring uses (s_escape: 4 or more empty squares round it) is said in the 3D intro
    if (id === 's_escape' && !/4つ以上/.test(X.AMJ_LS.intro.s_escape || '')) add(id, -1, '追18 the 3D intro does not say the 4 empty squares the answer needs');
    st.problems.forEach((P, j) => { const a = m => add(id, j, m), p = E.Pos.from(P.s), all = p.moves(), T = (P.mk || [])[0], W = whites(p), B = blacks(p), okS = new Set(P.ok), nm = m => E.name(p, m);
      if (P.s.side !== 1) a('① White is not to move');
      let kk = -1; for (let k = 0; k < 8; k++) if (p.q[k] === T) kk = k;
      const after = m => p.clone().play(m);
      let goal, score = null, d = 0;
      if (id === 's_trap') { if (kk < 0 || p.sq[T] !== 2) a('④ the mark is not on a black amazon');
        const n0 = freeN(p.sq, T); if (n0 < 1 || n0 > 2) a(`④ the black amazon has ${n0} exits (the lesson: 1 or 2)`);
        goal = m => { const q = after(m); return freeN(q.sq, q.q[kk]) === 0; }; }
      if (id === 's_escape') { if (kk < 0 || p.sq[T] !== 1) a('④ the mark is not on a white amazon');
        const boxable = q => q.moves().some(r => { q.play(r); const v = freeN(q.sq, q.q[kk]) === 0; q.unplay(r); return v; });
        const flip = E.Pos.from(Object.assign({}, P.s, { side: 2 })); if (!boxable(flip)) a('④ the white amazon is in no danger (Black could not box it in now)');
        goal = m => { if (mFrom(m) !== T) return false; const q = after(m); return freeN(q.sq, mTo(m)) >= 4 && !boxable(q); }; }
      if (id === 's_wall') { if (rooms(p.sq).sep) a('④ the board is split already'); if (T == null || p.sq[T]) a('④ no empty gap marked');
        score = m => { const r = rooms(after(m).sq); return r.sep ? r.w - r.b : -999; }; }
      if (id === 's_fill') { if (W.length !== 1 || B.length !== 1) a('④ not one amazon each'); const r0 = rooms(p.sq); if (!r0.sep) a('④ the rooms are not split');
        score = m => fillBF(after(m).sq, mTo(m)); }
      const sc = score ? all.map(score) : null, mx = sc ? Math.max(...sc) : 0;
      const G = score ? all.filter((m, i) => sc[i] === mx && mx > -999) : all.filter(goal), Gs = new Set(G);
      if (!G.length) a('① the goal cannot be reached');
      P.ok.forEach(m => { if (!all.includes(m)) a(`① the answer ${m} is not legal`); else if (!Gs.has(m)) a(`① the answer ${nm(m)} is not best`); });
      G.forEach(m => { if (!okS.has(m)) a(`② ${nm(m)} is as good but scored wrong`); });
      if (!okS.has(P.best)) a('① best is not an answer');
      // ③
      if (all.length < 3) a(`③ ${all.length} legal moves`);
      if (G.length > all.length * 0.3) a(`③ ${G.length} of ${all.length} moves are right`);
      if (id === 's_trap') { const near = all.filter(m => !Gs.has(m) && (nbr(T).includes(mArrow(m)) || nbr(T).includes(mTo(m)) || nbr(T).includes(mFrom(m)))); if (near.length < 3) a(`③ ${near.length} wrong moves near the black amazon`); d = Math.floor(all.length / G.length); }
      if (id === 's_escape') { const mv = all.filter(m => mFrom(m) === T), w = mv.filter(m => !Gs.has(m)); if (G.length * 2 > mv.length) a(`③ ${G.length} of the marked amazon's ${mv.length} moves are right`); if (w.length < 3) a(`③ ${w.length} wrong moves of the marked amazon`); d = Math.floor(100 * w.length / Math.max(1, mv.length)); }
      if (id === 's_wall') { if (!G.every(m => mArrow(m) === T)) a('④ an answer does not shoot into the gap'); const at = all.filter(m => mArrow(m) === T), w = at.filter(m => !Gs.has(m));
        if (w.length < 3 || G.length > at.length * 0.75) a(`③ ${G.length} of the ${at.length} moves that shoot into the gap are right`); d = Math.floor(100 * w.length / Math.max(1, at.length)); }
      if (id === 's_fill') { const vals = [...new Set(sc)]; if (all.length < 6 || vals.length < 3) a(`③ ${all.length} moves, ${vals.length} values`);
        const f0 = W[0], n0 = rooms(p.sq).R.find(r => r.nw).ne, cutOf = m => { const q = after(m), rr = rooms(q.sq).R.find(r => r.nw); return n0 - 1 - rr.ne; };
        if (!all.some(m => !Gs.has(m) && cutOf(m) > 0)) a('④ no wrong move cuts the room'); if (G.some(m => cutOf(m) > 0)) a('④ the answer cuts the room');
        d = Math.floor(all.length / G.length); }
      if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d); if (firstD === null) firstD = d;
      if (j === st.problems.length - 1 && !(d > firstD)) a(`⑥ the last problem is no harder than problem 1 (d ${d} vs ${firstD})`);
      // ⑤
      for (const [who, b] of pool) { if (b === P.s.b) { if (who !== `${id} q${j + 1}`) a(`⑤ the same position as ${who}`); continue; } const e = dist(P.s.b, b); if (e <= 2) a(`⑤ ${e} squares from ${who}`); }
      // ⑦⑧ ケロ's words
      let Wd; try { Wd = X.amLsJa(E, st, P, j); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
      const plain = t => String(t).replace(/[\u0001\u0002]/g, ''), n0 = T != null ? freeN(p.sq, T) : 0;
      const need = (t, re, ok, why) => { if (re.test(t) && !ok) a(`⑧ 「${t}」: ${why}`); };
      for (const t of [Wd.ask, Wd.hintTx]) {
        need(t, /出口が1つなら/, n0 === 1 && G.some(m => !nbr(T).includes(mTo(m))), 'not one exit closed by an arrow');
        need(t, /出口が2つなら/, n0 === 2, `${n0} exits`);
        need(t, /白のアマゾンで出口に入って/, G.some(m => nbr(T).includes(mTo(m))), 'no answer moves into the exit');
        need(t, /動いた白の元のマスが/, all.some(m => !Gs.has(m) && nbr(T).includes(mFrom(m)) && !after(m).sq[mFrom(m)]), 'no white amazon next to it leaves an exit');
        need(t, /このままだと閉じこめられちゃう/, true, '');
        need(t, /黒の1手でふさがれないか/, id !== 's_escape' || all.some(m => mFrom(m) === T && !Gs.has(m) && freeN(after(m).sq, mTo(m)) >= 4), 'no wide square that Black boxes in');
        need(t, /自分のとなりをふさいだら/, all.some(m => mFrom(m) === T && !Gs.has(m) && nbr(mTo(m)).includes(mArrow(m))), 'no wrong move shoots next to itself');
        need(t, /2体とも/, W.length === 2, `${W.length} white amazons`);
        need(t, /矢でふさぐか、アマゾンで入るか/, false, 'an amazon in the gap never splits the board');
        need(t, /光ってるマスが壁のすき間/, G.every(m => mArrow(m) === T), 'the answers do not shoot into the glowing square');
        need(t, /むこう側へ渡る手/, all.some(m => !Gs.has(m) && mArrow(m) === T), 'no wrong move crosses and shuts the gap');
        need(t, /切っちゃう矢|ちぎれやすい/, id !== 's_fill' || all.some(m => !Gs.has(m) && rooms(after(m).sq).R.find(r => r.nw).ne < rooms(p.sq).R.find(r => r.nw).ne - 1), 'no move cuts the room');
        need(t, /元いたマスやすみっこ/, G.some(m => mArrow(m) === mFrom(m)) || id !== 's_fill', 'no answer shoots back');
      }
      for (const u of P.ok) { const g = plain(Wd.good(u)), q = after(u), nu = nm(u);
        if (/\{|undefined|NaN/.test(g)) a(`⑧ the praise of ${nu} 「${g}」`);
        if (id === 's_trap') { if (/2つ|まとめて|同時に|いっぺんに|両方/.test(g) && n0 < 2) a(`⑧ the praise of ${nu} 「${g}」: ${n0} exit`);
          if (/元のマス|来た道|どいたマス|空いたマス/.test(g) && !(mArrow(u) === mFrom(u) && nbr(T).includes(mTo(u)))) a(`⑧ the praise of ${nu} 「${g}」`);
          if (/最後の出口に矢|矢1本で/.test(g) && !(nbr(T).includes(mArrow(u)) && n0 === 1)) a(`⑧ the praise of ${nu} 「${g}」`);
          if (/白.*出口に入|出口.*白が入|白のアマゾン自身|白でふさ|白で出口/.test(g) && !nbr(T).includes(mTo(u))) a(`⑧ the praise of ${nu} 「${g}」`); }
        if (id === 's_escape') { const n = g.match(/(\d+)(つ|マス)/); if (n && +n[1] !== freeN(q.sq, mTo(u))) a(`⑧ the praise of ${nu} 「${g}」: ${freeN(q.sq, mTo(u))} free`);
          if (/遠くへ撃って/.test(g) && nbr(mTo(u)).includes(mArrow(u))) a(`⑧ the praise of ${nu} 「${g}」: the arrow is next to it`); }
        if (id === 's_wall') { const r = rooms(q.sq); for (const [re, v] of [[/白の部屋が(\d+)マス/, r.w], [/黒の部屋が?(\d+)マス/, r.b], [/(\d+)対/, r.w], [/対(\d+)/, r.b], [/白は(\d+)マス/, r.w], [/黒の部屋は(\d+)マス/, r.b]]) { const x = g.match(re); if (x && +x[1] !== v) a(`⑧ the praise of ${nu} 「${g}」: White ${r.w}, Black ${r.b}`); } }
        if (id === 's_fill') { const n = g.match(/(\d+)手/); if (n && +n[1] !== mx) a(`⑧ the praise of ${nu} 「${g}」: ${mx} moves`); }
        if (id === 's_fill' && mx !== rooms(p.sq).R.find(r => r.nw).ne - 1) a(`⑧ the praise of ${nu}: the room is not used to the last square (${mx + 1} of ${rooms(p.sq).R.find(r => r.nw).ne})`);
      }
      for (const m of all) { if (okS.has(m)) continue; const raw = plain(Wd.ng(m)), i0 = raw.indexOf('赤い印の手'), t = i0 >= 0 ? raw.slice(i0) : raw, q = after(m), x = nm(m);
        if (i0 < 0) { a(`⑦ ${x}: the words do not name the move`); continue; }
        if (/\{|undefined|NaN/.test(t)) a(`⑦ ${x}: 「${t}」`);
        if (id === 's_trap') { const n = freeN(q.sq, q.q[kk]), op = nbr(T).includes(mFrom(m)) && !q.sq[mFrom(m)];
          if (/元のマス|どいたマス/.test(t)) { if (!op) a(`⑦ ${x}: 「${t}」 (the square left is not an exit)`); }
          else { const k = t.match(/(\d+)つ/); if (!k || +k[1] !== n) a(`⑦ ${x}: 「${t}」 (${n} exits left)`); } }
        if (id === 's_escape') { const moved = mFrom(m) === T, sqT = moved ? mTo(m) : T, n = freeN(q.sq, sqT), trap = q.moves().some(r => { q.play(r); const v = freeN(q.sq, q.q[kk]) === 0; q.unplay(r); return v; }), self = moved && nbr(sqT).includes(mArrow(m));
          if (/閉じこめられちゃう|つかまっちゃう|ふたをされちゃう|囲まれちゃう/.test(t) && !trap) a(`⑦ ${x}: 「${t}」 (Black cannot box it in)`);
          if (/助からない/.test(t) && !trap) a(`⑦ ${x}: 「${t}」 (it is safe for now)`);
          if (/自分の矢|矢を近く|すぐそばに矢|足もと|自分のまわりに矢/.test(t) && !self) a(`⑦ ${x}: 「${t}」 (the arrow is not next to it)`);
          if (moved && !trap && !self && !/空きが(\d+)つ|せまい場所/.test(t)) a(`⑦ ${x}: 「${t}」 (the reason: ${n} free squares)`);
          { const k = t.match(/(?:空きが|出口が)(\d+)つ/); if (k && +k[1] !== n) a(`⑦ ${x}: 「${t}」 (${n} free)`); }
          if (!moved && /逃げた先|行き先/.test(t)) a(`⑦ ${x}: 「${t}」 (it did not move)`); }
        if (id === 's_wall') { const r = rooms(q.sq), cross = !r.sep && q.sq[T] === 3, inGap = q.sq[T] === 1;
          if (/開いたまま|壁が完成しなくて|盤が分かれずに/.test(t) && (r.sep || cross || inGap)) a(`⑦ ${x}: 「${t}」 (the gap is ${cross ? 'shut, White crossed' : inGap ? 'an amazon' : 'shut'})`);
          if (/渡っちゃって|むこう側に入って/.test(t) && !cross) a(`⑦ ${x}: 「${t}」`);
          if (/すき間に立っても|すき間に入っただけ/.test(t) && !inGap) a(`⑦ ${x}: 「${t}」`);
          if (r.sep) { const k = t.match(/白の部屋が(\d+)マス/); if (k && +k[1] !== r.w) a(`⑦ ${x}: 「${t}」 (White ${r.w})`); } }
        if (id === 's_fill') { const v = fillBF(q.sq, mTo(m)), dd = mx - v, k = t.match(/(\d+)手(?:も|ぶん)?(?:損|少な|足りな|へ)/); if (!k || +k[1] !== dd) a(`⑦ ${x}: 「${t}」 (${dd} moves fewer)`);
          const c = (() => { const n1 = rooms(p.sq).R.find(r => r.nw).ne, rr = rooms(q.sq).R.find(r => r.nw); return n1 - 1 - rr.ne; })(), kc = t.match(/(\d+)マス/);
          if (/ちぎれ|切って/.test(t) && !(c > 0 && kc && +kc[1] === c)) a(`⑦ ${x}: 「${t}」 (${c} squares cut off)`); if (c > 0 && !/ちぎれ|切って/.test(t)) a(`⑦ ${x}: 「${t}」 (the room is cut: ${c})`); }
      }
    });
  }
  // (2026-11-24 第2期 追14) the warm-ups (ramp: the explanation with its marks and the "try" with its answers) of all eight lessons:
  //  every move named is legal, the marks are the squares the words say, a try's answers are exactly the moves that reach its goal
  //  (①②, the same goals as the problems), and the facts the 2D words (amazons/i18n-am-ls.js) and the 3D words (ケロ's AMJ_LS.ramp,
  //  then atlas/nocoord/amazons.json) give — the squares, arrows, exits, rooms, counts, directions — are the board's (⑧).
  amWarm();
  function amWarm() {
    const W2 = {}; try { const w = { I18N: {} }; new Function('window', 'I18N', fs.readFileSync(path.join(ROOT, 'amazons/i18n-am-ls.js'), 'utf8'))(w, w.I18N); Object.assign(W2, w.I18N.ja || {}); } catch (e) { add('-', -1, '追14 amazons/i18n-am-ls.js does not load'); }
    let NC = {}; try { NC = JSON.parse(fs.readFileSync(path.join(ROOT, 'atlas/nocoord/amazons.json'), 'utf8')); } catch (e) {}
    const SQ = '([a-j](?:10|[1-9]))', sqI = s => E.sqIdx(s), DIR8 = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
    const ray = (sq, f, d) => { const o = []; let [r, c] = RCo(f); for (;;) { r += d[0]; c += d[1]; if (r < 0 || r > 9 || c < 0 || c > 9) break; const t = r * 10 + c; o.push(t); if (sq[t]) break; } return o; };   // (the last may be the blocker)
    const reach = (sq, f) => DIR8.flatMap(d => ray(sq, f, d).filter(t => !sq[t]));
    const far = (sq, f) => DIR8.map(d => ray(sq, f, d).filter(t => !sq[t]).pop()).filter(x => x != null);
    const dirOf = (f, t) => { const [r1, c1] = RCo(f), [r2, c2] = RCo(t); return c1 === c2 ? (r2 < r1 ? '上' : '下') : r1 === r2 ? '横' : '斜め'; };
    const roomCells = (sq, w) => { const R = new Set([w]), Q = [w]; for (let h = 0; h < Q.length; h++) for (const t of nbr(Q[h])) if (!R.has(t) && sq[t] !== 3 && sq[t] !== 2) { R.add(t); Q.push(t); } return R; };
    L.steps.forEach(st => { const id = st.id; if (!AM_DONE.has(id) || (only && !only.has(id))) return;
      (st.ramp || []).forEach((r, j) => { const a = m => add(id, -1, `warm-up ${j + 1} (${r.k}): ${m}`), p = E.Pos.from(r.s), all = p.moves(), nm = m => E.name(p, m), W = whites(p), B = blacks(p);
        const T2 = ['t', 'body', 'g', 'h', 'y'].map(f => typeof r[f] === 'string' ? W2[r[f]] || '' : '').join(' ');
        const T3 = ['t', 'body', 'g', 'h', 'y'].map(f => typeof r[f] !== 'string' ? '' : X.AMJ_LS.ramp[r[f]] || (NC[`${id}/${j}/${f}`] || {}).ja || W2[r[f]] || '').join(' ');
        const texts = [['2D', T2], ['3D', T3]], mk = k => (r.marks || []).filter(x => x[1] === k).map(x => x[0] - 1), gm = (X.AMJ_LS && null) || null;
        const same = (A, B2) => A.length === B2.length && [...A].every(x => B2.includes(x)), names = A => [...A].map(N).sort().join('・');
        // the moves shown, then the position after them
        let q = p.clone(); for (const s of (r.seq || [])) { const m = q.moves().find(x => E.name(q, x) === s); if (m == null) { a(`① the move ${s} is not legal`); return; } q.play(m); }
        const m0 = (r.seq || []).length ? all.find(x => nm(x) === r.seq[0]) : null;
        let G = null, look = (r.look || []).map(x => x - 1)[0];
        if (r.k === 'try') { const okS = new Set((r.ok || []).map(n => all.find(m => nm(m) === n)).filter(x => x != null));
          if (okS.size !== (r.ok || []).length) a(`① an answer is not legal (${r.ok.filter(n => !all.some(m => nm(m) === n))})`);
          const T = look, after = m => p.clone().play(m);
          if (id === 'b_queen' || id === 'b_block') G = all.filter(m => mTo(m) === T);
          else if (id === 'b_arrow') G = all.filter(m => mArrow(m) === T);
          else if (id === 'b_win') G = all.filter(m => !after(m).canMove(2));
          else if (id === 's_trap') { const bk = B.filter(b => freeN(p.sq, b) === 1 && nbr(b).includes(T)); if (bk.length !== 1) a(`④ ${bk.length} black amazons with the one exit ${N(T)}`); G = all.filter(m => bk.length && freeN(after(m).sq, bk[0]) === 0); }
          else if (id === 's_escape') { const boxable = q2 => q2.moves().some(r2 => { q2.play(r2); const v = freeN(q2.sq, mTo(r2) === T ? -1 : T) === 0; q2.unplay(r2); return v; });
            G = all.filter(m => { if (mFrom(m) !== T) return false; const q2 = after(m), t2 = mTo(m); return freeN(q2.sq, t2) >= 4 && !q2.moves().some(r2 => { q2.play(r2); const v = freeN(q2.sq, t2) === 0; q2.unplay(r2); return v; }); }); }
          else if (id === 's_wall') { const sc = all.map(m => { const rr = rooms(after(m).sq); return rr.sep ? rr.w - rr.b : -999; }), mx = Math.max(...sc); G = all.filter((m, i) => sc[i] === mx && mx > -999); }
          else if (id === 's_fill') { const sc = all.map(m => fillBF(after(m).sq, mTo(m))), mx = Math.max(...sc); G = all.filter((m, i) => sc[i] === mx); }
          if (G) { if (!G.length) a('① the goal cannot be reached'); okS.forEach(m => { if (!G.includes(m)) a(`① the answer ${nm(m)} does not reach the goal`); }); G.forEach(m => { if (!okS.has(m)) a(`② ${nm(m)} reaches the goal but is scored wrong`); }); }
          if (look == null) a('⑧ no gold mark');
        }
        // the facts the words give
        for (const [who, t] of texts) { if (!t.trim()) continue; const b = (re, ok, msg) => { const g = t.match(re); if (g && !ok(g)) a(`⑧ ${who} 「${g[0]}」: ${msg}`); };
          if (/\{|undefined|NaN/.test(t)) a(`⑧ ${who}: 「${t.slice(0, 50)}」`);
          // pieces and arrows named
          for (const g of t.matchAll(new RegExp('(白|黒)の(?:アマゾン)?（?\\s*' + SQ, 'g'))) if (p.sq[sqI(g[2])] !== (g[1] === '白' ? 1 : 2)) a(`⑧ ${who} 「${g[0]}」: no ${g[1]} amazon on ${g[2]}`);
          for (const g of t.matchAll(new RegExp(SQ + ' (?:の|から)(?:アマゾン|は|からは)', 'g'))) { const s = sqI(g[1]); if (p.sq[s] !== 1 && p.sq[s] !== 2 && !(r.seq || []).length) a(`⑧ ${who} 「${g[0]}」: no amazon on ${g[1]}`); }
          for (const g of t.matchAll(new RegExp(SQ + '\\s*(?:に矢があ|に矢）|の矢)', 'g'))) if (p.sq[sqI(g[1])] !== 3) a(`⑧ ${who} 「${g[0]}」: no arrow on ${g[1]}`);
          for (const g of t.matchAll(new RegExp('((?:' + SQ.slice(1, -1) + '・)+' + SQ.slice(1, -1) + ')\\s*が矢', 'g'))) g[1].split('・').forEach(s => { if (p.sq[sqI(s)] !== 3) a(`⑧ ${who} 「${g[0]}」: no arrow on ${s}`); });
          // the move shown: from, to, arrow, the direction of the shot
          if (m0 != null) { b(new RegExp(SQ + ' から ' + SQ + ' へ'), g => sqI(g[1]) === mFrom(m0) && sqI(g[2]) === mTo(m0), `the move is ${nm(m0)}`);
            b(new RegExp(SQ + ' に刺し'), g => sqI(g[1]) === mArrow(m0), `the arrow is on ${N(mArrow(m0))}`);
            b(/(縦|横|斜め)へ矢/, g => dirOf(mTo(m0), mArrow(m0)).replace(/上|下/, '縦') === g[1], `the arrow flies ${dirOf(mTo(m0), mArrow(m0))}`); }
          // exits (the empty squares next to an amazon)
          b(new RegExp('(?:隣|となり)の空きマスは\\s*((?:' + SQ.slice(1, -1) + '・)*' + SQ.slice(1, -1) + ')\\s*の(\\d)つだけ'), g => { const s = g[1].split('・').map(sqI), am = (r.marks || []).filter(x => x[1] === 'ng').map(x => x[0] - 1)[0];
            return am != null && same(s, nbr(am).filter(x => !p.sq[x])) && +g[2] === s.length; }, 'not the empty squares next to the marked amazon');
          b(/(?:隣|となり)の空きマスは(?:緑の印の)?(\d)つだけ|(?:隣|となり)の空きマスは1つだけ|出口は1つだけ|出口は1マスだけ/, g => { const n = +(g[1] || 1), am = (r.marks || []).filter(x => x[1] === 'ng').map(x => x[0] - 1)[0];
            const tgt = am != null ? am : (look != null && B.some(x => nbr(x).includes(look)) ? B.find(x => nbr(x).includes(look)) : B[0]); return freeN(p.sq, tgt) === n; }, 'not the number of empty squares next to it');
          b(new RegExp('出口は\\s*' + SQ + '\\s*だけ'), g => { const s = sqI(g[1]); return B.some(x => nbr(x).includes(s) && freeN(p.sq, x) === 1); }, 'not the only exit of a black amazon');
          b(/([0-9])マスが矢でふさがれ|隣の([0-9])マスが矢/, g => { const n = +(g[1] || g[2]); return B.some(x => nbr(x).filter(y => p.sq[y] === 3).length === n); }, 'no black amazon with that many arrows next to it');
          // after the move shown
          if ((r.seq || []).length) { b(/もう1手も指せない|白の勝ち/, () => !q.canMove(2), 'Black can still move');
            b(/ゲームは続き|もう1体のアマゾンが残る|アマゾンが残る/, () => q.canMove(2) && B.some(x => freeN(q.sq, x) === 0), 'not one black amazon shut in with the game going on'); }
          // queen moves: the marks of b_queen / b_block
          if (id === 'b_queen' && r.k === 'explain') { const ok = mk('ok'); b(/いちばん遠いマス|光っているマスのどれにでも/, () => W.length === 1 && same(ok, far(p.sq, W[0])), `the marks are not the farthest square each way (${names(far(p.sq, W[0]))})`); }
          if (id === 'b_block' && r.k === 'explain') { const ok = mk('ok'), ng = mk('ng'), R0 = reach(p.sq, W[0]);
            if (!ok.every(x => R0.includes(x) && far(p.sq, W[0]).includes(x)) || ng.some(x => R0.includes(x))) a(`⑧ the green marks are not reachable farthest squares / the red ones are reachable`);
            for (const g of t.matchAll(new RegExp('(上|下|横|斜め)(?:へ)?は\\s*' + SQ + '\\s*まで（' + SQ, 'g'))) { const x = sqI(g[2]), y = sqI(g[3]);
              if (!(far(p.sq, W[0]).includes(x) && dirOf(W[0], x).replace(/上|下/, g[1] === '横' || g[1] === '斜め' ? '縦' : '$&') === g[1] && p.sq[y] === 3 && nbr(x).includes(y) && al(W[0], y))) a(`⑧ ${who} 「${g[0]}」`); } }
          if (id === 'b_queen' && r.k === 'try') { b(/縦の線|縦にまっすぐ/, () => G && G.length && G.every(m => dirOf(mFrom(m), mTo(m)).match(/上|下/)), 'the answer is not up / down a file');
            b(/まっすぐ上/, () => G.every(m => dirOf(mFrom(m), mTo(m)) === '上'), 'not up'); b(/(\d+)マス、1手/, g => G.every(m => cheb(mFrom(m), mTo(m)) === +g[1]), 'not that many squares'); }
          if (id === 'b_arrow' && r.k === 'try') { b(new RegExp(SQ + ' からは\\s*' + SQ + ' へ一直線ではありません'), g => !al(sqI(g[1]), sqI(g[2])) || blk(p.sq, sqI(g[1]), sqI(g[2])), 'they are in line');
            b(/いまのマスからは金の印へ一直線ではありません|いまの場所からは、金の印へ一直線じゃない/, () => W.every(w => !al(w, look) || blk(p.sq, w, look)), 'the amazon is in line with the gold mark');
            b(/元いた\s*(?:[a-j]\d+\s*)?に矢|元いたマスに矢|元のマス/, () => W.includes(look), 'the gold mark is not where the amazon stands'); }
          if (id === 'b_block' && r.k === 'try') { const w = W[0], dirs = DIR8.filter(d => { const ry = ray(p.sq, w, d); return ry.includes(look); }), ry = dirs.length ? ray(p.sq, w, dirs[0]) : [];
            if (!(ry.length && ry[ry.length - 1] !== look && p.sq[ry[ry.length - 1]] === 3 && ry[ry.length - 2] === look)) a('⑧ the gold square is not the last one before an arrow on the amazon\'s line');
            b(/上へ行けるいちばん遠い|上には/, () => dirs.length && dirOf(w, look) === '上', 'not up'); b(new RegExp(SQ + '\\s*の矢の手前、\\s*' + SQ), g => p.sq[sqI(g[1])] === 3 && sqI(g[2]) === look && nbr(look).includes(sqI(g[1])), 'not the square before the arrow'); }
          if (id === 's_escape') { const am = r.k === 'try' ? look : mk('ng')[0];
            b(/隅/, () => [0, 9, 90, 99].includes(am), `${N(am)} is not a corner`);
            b(/ほとんどふさがって/, () => freeN(p.sq, am) * 3 <= nbr(am).length, `${freeN(p.sq, am)} of the ${nbr(am).length} squares next to ${N(am)} are empty`);
            b(/大きく動/, () => G && G.length && G.every(m => cheb(mFrom(m), mTo(m)) >= 2), 'the answers move one square');
            b(/中央のほう|まん中のほう/, () => G && G.every(m => { const c = s => { const [rr, cc] = RCo(s); return Math.max(Math.abs(rr - 4.5), Math.abs(cc - 4.5)); }; return c(mTo(m)) < c(mFrom(m)); }), 'an answer does not go toward the centre');
            if (r.k === 'explain') { const ok = mk('ok'); if (!same(ok, nbr(am).filter(x => !p.sq[x]))) a('⑧ the green marks are not the empty squares next to the amazon'); } }
          if (id === 's_wall') { const ra = (r.seq || []).length ? rooms(q.sq) : null;
            if (ra) { b(/白の部屋（(\d+)マス）は黒の部屋（(\d+)マス）/, g => ra.sep && +g[1] === ra.w && +g[2] === ra.b, `the rooms are ${ra.w} and ${ra.b}`); b(/盤を(?:左右に|二つに)分け/, () => ra.sep, 'the board is not split'); }
            const wall = [...Array(100).keys()].filter(i => p.sq[i] === 3), col = wall.length ? RCo(wall[0])[1] : -1, gaps = [...Array(10).keys()].map(rr => rr * 10 + col).filter(i => !p.sq[i]);
            b(/すき間は\s*([a-j](?:10|[1-9]))\s*だけ|すき間は1マスだけ/, g => gaps.length === 1 && (!g[1] || sqI(g[1]) === gaps[0]), `the gaps are ${names(gaps)}`);
            b(/([a-j]) の列(?:に|の)/, g => 'abcdefghij'.indexOf(g[1]) === col, `the wall is on file ${'abcdefghij'[col]}`);
            if (G) { b(/白のアマゾンは右側に残/, () => G.every(m => whites(p.clone().play(m)).every(x => RCo(x)[1] > col)), 'an answer leaves a white amazon on the left');
              b(/ずっと広い/, () => G.every(m => { const rr = rooms(p.clone().play(m).sq); return rr.w - rr.b >= 10; }), 'the white room is not much bigger'); } }
          if (id === 's_fill') { const w = W[0], R = roomCells(p.sq, w);
            b(/(?:白の)?部屋は\s*(\d+)マス/, g => R.size === +g[1], `the room has ${R.size} squares`);
            b(new RegExp('部屋は\\s*((?:' + SQ.slice(1, -1) + '・)+' + SQ.slice(1, -1) + ')'), g => same(g[1].split('・').map(sqI), [...R]), `the room is ${names(R)}`);
            if (r.k === 'explain') { const ok = mk('ok'), sc = all.map(m => fillBF(p.clone().play(m).sq, mTo(m))), mx = Math.max(...sc);
              if (sc[all.indexOf(m0)] !== mx) a(`① ${nm(m0)} does not keep the most moves`);
              const left = [...roomCells(q.sq, mTo(m0))].filter(x => !q.sq[x]); if (!same(ok, left)) a(`⑧ the green marks are not the squares left (${names(left)})`);
              b(/まだ全部行ける/, () => fillBF(q.sq, mTo(m0)) === left.length, 'not every square left can be used');
              b(/元のマスに矢/, () => mArrow(m0) === mFrom(m0), 'the arrow is not on the square left'); }
            else b(/元のマスか/, () => G && G.some(m => mArrow(m) === mFrom(m)), 'no answer shoots back'); }
          if (id === 's_trap' && r.k === 'try' && G) b(/閉じ込め成功|閉じこめ成功/, () => true, '');
        }
        // ③ for a try (2026-11-24 担当A): 「いちばん多く動ける手を選んで」 with every legal move right is no choice (s_fill's old try: 14 of 14)
        if (r.k === 'try' && G && G.length * 2 > all.length) a(`③ ${G.length} of the ${all.length} legal moves are right — nothing to choose`);
      }); });
  }
  // 追32 (2026-11-24 担当A): the shapes the answers use are taught — by the intro or the warm-up, in the 2D (ja・en) and the 3D (ケロ).
  //  s_trap / b_win: how each black amazon that the answer shuts in is closed — its one exit by an arrow, by White stepping in, or two
  //  exits at once (White steps into one and shoots into the other); a step whose problems need the last must say two exits, a step
  //  whose answers step in must say the amazon closes squares too.
  // 追45 (2026-11-24 担当A): a tip of the intro or the hint the student follows must not be wrong in the problems — s_fill told 「元いたマス
  //  に矢を刺す」 while in all five problems every arrow back into the square left cuts the room (White stands mid-passage). A text that
  //  tells to shoot back has to say when not to (通り道・途中 / passage・middle) once a problem (or that try) has only wrong arrows back.
  am32();
  function am32() {
    const I = {}; try { const w = { I18N: {} }; ['i18n-am-ls.js'].forEach(f => new Function('window', 'I18N', fs.readFileSync(path.join(ROOT, 'amazons', f), 'utf8'))(w, w.I18N)); Object.assign(I, w.I18N); } catch (e) { add('-', -1, '追32 amazons/i18n-am-ls.js does not load'); return; }
    let NC = {}; try { NC = JSON.parse(fs.readFileSync(path.join(ROOT, 'atlas/nocoord/amazons.json'), 'utf8')); } catch (e) {}
    const plain = t => String(t || '').replace(/<[^>]+>/g, ''), J = I.ja || {}, EN = I.en || {};
    const rampTx = (st, d) => (st.ramp || []).map((r, j) => ['t', 'body', 'g', 'h', 'y'].map(f => typeof r[f] !== 'string' ? '' : d === '3D' ? X.AMJ_LS.ramp[r[f]] || (NC[`${st.id}/${j}/${f}`] || {}).ja || '' : (d === 'en' ? EN : J)[r[f]] || '').join(' ')).join(' ');
    const texts = st => [['2D ja', plain(J[`ls.${st.id}.intro`]) + ' ' + plain(rampTx(st, 'ja'))], ['2D en', plain(EN[`ls.${st.id}.intro`]) + ' ' + plain(rampTx(st, 'en'))], ['3D', plain(X.AMJ_LS.intro[st.id]) + ' ' + plain(rampTx(st, '3D'))]];
    L.steps.forEach(st => { const id = st.id; if (!AM_DONE.has(id) || (only && !only.has(id))) return;
      if (id === 's_trap' || id === 'b_win') { let both = 0, stepIn = 0;
        st.problems.forEach((P, j) => { const p = E.Pos.from(P.s), kinds = P.ok.map(m => { const q = p.clone().play(m), K = new Set();
            blacks(p).forEach(b => { const ex = nbr(b).filter(x => !p.sq[x]); if (!ex.length || freeN(q.sq, b) !== 0) return;
              const byA = ex.includes(mTo(m)), byR = ex.includes(mArrow(m)); K.add(byA && byR ? 'both' : byA ? 'in' : 'arrow'); });
            return K; });
          if (kinds.length && kinds.every(K => K.has('both'))) both++;
          if (kinds.some(K => K.has('in') || K.has('both'))) stepIn++; });
        for (const [who, t] of texts(st)) {
          if (both && !(who === '2D en' ? /two exits/i : /出口が2つ/).test(t)) add(id, -1, `追32 ${both} problems shut a black amazon with two exits (White steps into one, the arrow fills the other), the ${who} intro and warm-up say only one exit`);
          if (stepIn && !(who === '2D en' ? /with your amazons? and arrows|your amazon(?:s)? (?:steps|moves) in|or your amazon|into one of them/i : /アマゾンと矢|アマゾンで入|白で入|白で片方|片方の出口に入/).test(t)) add(id, -1, `追32 answers step White into an exit, the ${who} intro and warm-up do not say an amazon closes a square`); } }
      if (id === 's_fill') {
        const backAllWrong = (s0, ok) => { const p = E.Pos.from(s0), all = p.moves(), okI = ok.map(m => typeof m === 'string' ? all.find(x => E.name(p, x) === m) : m), bk = all.filter(m => mArrow(m) === mFrom(m)); return bk.length > 0 && bk.every(m => !okI.includes(m)); };
        const wrongIn = st.problems.filter(P => backAllWrong(P.s, P.ok)).length;
        const tips = [['2D ja intro', J['ls.s_fill.intro']], ['2D ja hint', J['ls.s_fill.hint']], ['2D en intro', EN['ls.s_fill.intro']], ['2D en hint', EN['ls.s_fill.hint']], ['3D intro', X.AMJ_LS.intro.s_fill], ...((X.AMJ_LS.hint || {}).s_fill || []).map((h, k) => [`3D hint ${k + 1}`, h])];
        const BACK = /元(?:いた|の)マス|square you (?:just )?left|square you left/i, CAVEAT = /通り道|途中|passage|middle/i;
        if (wrongIn) tips.forEach(([who, t]) => { t = plain(t); if (BACK.test(t) && !CAVEAT.test(t)) add(id, -1, `追45 the ${who} tells to shoot back into the square left, but in ${wrongIn} of the ${st.problems.length} problems every such arrow is wrong (it cuts the room): 「${t.slice(0, 60)}」`); });
        (st.ramp || []).forEach((r, j) => { if (r.k !== 'try' || !backAllWrong(r.s, r.ok || [])) return;
          [['2D ja', J[r.h]], ['2D en', EN[r.h]], ['3D', X.AMJ_LS.ramp[r.h]], ['3D nocoord', (NC[`${id}/${j}/h`] || {}).ja]].forEach(([who, t]) => { t = plain(t); if (BACK.test(t) && !/切れ|ちぎれ|cuts?/i.test(t)) add(id, -1, `追45 warm-up ${j + 1}: the ${who} hint tells to shoot back, every arrow back is wrong there: 「${t.slice(0, 60)}」`); }); }); } });
  }
  return out;
}
// (2026-11-24 第2期) reversi: the exact endgames (parity・finish) — every legal move solved again by an independent exact solver
// (empties to the winner), the step's shape, no near-duplicates across everything the game shows, the easy-to-hard order of a
// draw, and リバガメ's words for every move of every problem at every place of a draw (3D: lessons3d rvLsJa).
const RV_DONE = new Set(['parity', 'finish']);
function rvSolver() {
  const DIRS = [-9, -8, -7, -1, 1, 7, 8, 9], ok = (p, d) => p >= 0 && p < 64 && Math.abs((p & 7) - ((p - d) & 7)) <= 1;
  const flips = (b, q, s) => { const o = 3 - s, out = []; for (const d of DIRS) { let p = q + d; const t = []; while (ok(p, d) && b[p] === o) { t.push(p); p += d; } if (t.length && ok(p, d) && b[p] === s) out.push(...t); } return out; };
  const legal = (b, s) => { const m = []; for (let q = 0; q < 64; q++) if (!b[q] && flips(b, q, s).length) m.push(q); return m; };
  function neg(b, s, a, be, em, passed) {
    let best = -99; const ms = [];
    for (const q of em) { if (b[q]) continue; const f = flips(b, q, s); if (f.length) ms.push([q, f]); }
    if (!ms.length) { if (passed) { let m = 0, o = 0, e = 0; for (let q = 0; q < 64; q++) { if (b[q] === s) m++; else if (b[q]) o++; else e++; } return m > o ? m - o + e : m < o ? m - o - e : 0; }
      return -neg(b, 3 - s, -be, -a, em, true); }
    if (em.length > 6) { const sc = new Map(ms.map(([q, f]) => { b[q] = s; for (const p of f) b[p] = s; let n = 0; for (const r of em) if (!b[r] && flips(b, r, 3 - s).length) n++; b[q] = 0; for (const p of f) b[p] = 3 - s; return [q, n * 10 - ([0, 7, 56, 63].includes(q) ? 5 : 0)]; })); ms.sort((x, y) => sc.get(x[0]) - sc.get(y[0])); }
    for (const [q, f] of ms) { b[q] = s; for (const p of f) b[p] = s; const v = -neg(b, 3 - s, -be, -Math.max(a, best), em.filter(x => x !== q), false); b[q] = 0; for (const p of f) b[p] = 3 - s; if (v > best) { best = v; if (best >= be) return best; } }
    return best;
  }
  const solveAll = (cells, s) => { const b = String(cells).split('').map(Number), em = []; for (let q = 0; q < 64; q++) if (!b[q]) em.push(q); const out = {};
    for (const q of legal(b, s)) { const f = flips(b, q, s); b[q] = s; for (const p of f) b[p] = s; out[q] = -neg(b, 3 - s, -99, 99, em.filter(x => x !== q), false); b[q] = 0; for (const p of f) b[p] = 3 - s; } return out; };
  const regions = b => { const seen = new Array(64).fill(0), reg = new Array(64).fill(0); for (let q = 0; q < 64; q++) if (!b[q] && !seen[q]) { const st = [q], m = []; seen[q] = 1; while (st.length) { const x = st.pop(); m.push(x); for (const d of DIRS) { const y = x + d; if (!ok(y, d) || b[y] || seen[y]) continue; seen[y] = 1; st.push(y); } } for (const x of m) reg[x] = m.length; } return reg; };
  return { flips, legal, solveAll, regions };
}
function reversi(opt) {
  const fs = require('fs'), vm = require('vm');
  const L = (opt && opt.lessons) || JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/lessons.json'), 'utf8'));
  const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), app = fs.readFileSync(path.join(ROOT, 'reversi/index.html'), 'utf8');
  const pre = ['  const fill = ', '  const L = (o, lang)'].map(k => { const i = src.indexOf(k); return src.slice(i, src.indexOf('\n', i)); }).join('\n');
  const X = vm.runInNewContext(pre + '\n' + src.slice(src.indexOf('  const RV_TABS = '), src.indexOf('  const rvNC = ')) + '\n;({ rvLsJa, rvEmpt, RV_CN })', {});
  const S = rvSolver(), out = [], only = opt && opt.only, add = (id, j, m) => out.push({ step: id, q: j + 1, msg: m });
  // ⑥⑨ a draw of 5 is put in order (fewer empties first, the exception last) in both versions
  if (!/probs\.every\(p => p\.type === 'exact'\)\) probs\.sort\(\(a, b\) => \(a\.trap \? 1 : 0\) - \(b\.trap \? 1 : 0\) \|\| rvEmpt\(a\) - rvEmpt\(b\)\)/.test(src)) add('-', -1, '⑥ the 3D REVERSI.lesson does not order the exact endgames');
  if (!/probs\.every\(p => p\.type === 'exact'\)\) probs\.sort\(\(a, b\) => \(a\.trap \? 1 : 0\) - \(b\.trap \? 1 : 0\) \|\| nE\(a\) - nE\(b\)\)/.test(app)) add('-', -1, '⑥⑨ reversi/index.html startLesson does not order the exact endgames');
  // ⑤ every position the game shows: lessons (problems + warm-ups) and puzzles, under the 8 symmetries
  const SY = []; for (let t = 0; t < 8; t++) { const m = []; for (let q = 0; q < 64; q++) { let r = q >> 3, c = q & 7; if (t & 1) c = 7 - c; if (t & 2) r = 7 - r; if (t & 4) [r, c] = [c, r]; m.push(r * 8 + c); } SY.push(m); }
  const dist = (a, b) => { let best = 99; for (const m of SY) { let n = 0; for (let q = 0; q < 64 && n < best; q++) if (a[q] !== b[m[q]]) n++; best = Math.min(best, n); } return best; };
  const pool = []; L.lessons.forEach(l => { l.problems.forEach((p, j) => pool.push([`${l.id} q${j + 1}`, String(p.cells), p])); (l.warm || []).forEach((w, j) => pool.push([`${l.id} warm ${j + 1}`, String(w.cells), w])); });
  const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/puzzles.json'), 'utf8')); (PZ.levels || []).forEach(lv => lv.puzzles.forEach((p, j) => pool.push([`puzzle ${lv.id} ${j + 1}`, String(p.cells), p])));
  const nums = t => [...String(t).matchAll(/(\d+)石差で(勝ち|負け)|引き分け/g)].map(m => m[0] === '引き分け' ? 0 : m[2] === '勝ち' ? +m[1] : -m[1]);
  L.lessons.forEach((l, li) => { const id = l.id; if (!RV_DONE.has(id) || (only && !only.has(id))) return;
    if (l.problems.length < 8 || l.problems.filter(p => p.trap).length < 2) add(id, -1, '⑤ the pool is too small to draw 5 different problems');
    l.problems.forEach((P, j) => { const a = m => add(id, j, m), b = String(P.cells).split('').map(Number), s = P.toMove, F = P.f || {};
      if (P.type !== 'exact') a('① not an exact problem');
      const ex = S.solveAll(P.cells, s), lg = Object.keys(ex).map(Number), ks = Object.keys(F).map(Number);
      if (lg.length !== ks.length || lg.some(q => !F[q])) { a(`① the stored moves ${ks} are not the legal moves ${lg}`); return; }
      for (const q of lg) if (F[q][0] !== ex[q]) a(`① move ${q}: stored ${F[q][0]}, exact ${ex[q]}`);
      const v = q => ex[q], srt = lg.map(v).sort((x, y) => y - x), bs = lg.filter(q => v(q) === srt[0]), best = bs[0];
      if (bs.length > 1) a(`② ${bs.length} moves share the best result ${srt[0]}`);
      if (srt[0] - srt[1] < 4 && Math.sign(srt[0]) === Math.sign(srt[1])) a(`② the 2nd move is only ${srt[0] - srt[1]} discs worse with the same outcome (${srt[0]} / ${srt[1]})`);
      if (lg.length < 3) a(`③ only ${lg.length} legal moves`);
      // the stored facts the words use: flips, the opponent's moves, the region, the pass
      const reg = S.regions(b);
      for (const q of lg) { const f = S.flips(b, q, s), c = b.slice(); c[q] = s; f.forEach(x => { c[x] = s; }); const ol = S.legal(c, 3 - s);
        if (F[q][1] !== f.length) a(`⑧ move ${q}: ${F[q][1]} flips stored, ${f.length} on the board`);
        if (F[q][3] !== ol.length) a(`⑧ move ${q}: ${F[q][3]} replies stored, ${ol.length} on the board`);
        if (F[q][5] !== reg[q]) a(`⑧ move ${q}: region ${F[q][5]} stored, ${reg[q]} on the board`);
        if (!!F[q][6] !== (ol.length === 0)) a(`⑧ move ${q}: the pass flag is wrong`); }
      // ④ the theme
      if (id === 'parity') { const odd = q => reg[q] % 2 === 1, pass = q => !!F[q][6];
        if (!P.trap) { if (!odd(best) && !pass(best)) a('④ the answer is not in an odd region (nor a pass)'); if (!lg.some(q => q !== best && !odd(q))) a('④ no move in an even region to tell apart'); }
        else { if (odd(best) || pass(best)) a('④ the exception: the answer is in an odd region'); if (!lg.some(q => q !== best && odd(q))) a('④ the exception: no odd-region move that loses out'); } }
      if (id === 'finish') { if (srt[0] < 0) a('④ the answer does not save the game'); if (lg.filter(q => v(q) >= 0).length !== 1) a('④⑧ not the only move that saves the game (「ほかの手だと負けちゃう」)');
        if (P.trap && (!lg.some(q => X.RV_CN.includes(q)) || X.RV_CN.includes(best))) a('④ the corner trap: no corner, or the corner is the answer'); }
      // ⑤
      for (const [nm, c2, o] of pool) { if (o === P) continue; const d = dist(String(P.cells), c2); if (d <= 3) a(`⑤ ${d} square(s) from ${nm}`); }
      // ⑦⑧ the words, for each place in a draw (i = 0..4) and every move
      for (let i = 0; i < 5; i++) { const W = X.rvLsJa(id, P, i, li, false);
        for (const t of [W.ask, W.hintTx]) if (!t || /\{|undefined|NaN/.test(t)) a(`⑧ the question / hint 「${t}」`);
        for (const q of lg) { const g = String(q === best ? W.good(q) : W.ng(q));
          if (!g || /\{|undefined|NaN/.test(g)) { a(`⑧ move ${q} (#${i + 1}): 「${g}」`); continue; }
          const n = nums(g), want = q === best ? [v(q)] : [v(q), v(best)];
          if (n.some((x, k) => x !== want[k] && !(q === best && x === v(best)))) a(`⑦ move ${q} (#${i + 1}): 「${g}」 says ${n}, the board ${want}`);
          for (const m of g.matchAll(/(\d+)マス/g)) if (![v(q)].concat(lg.map(z => reg[z])).includes(+m[1])) a(`⑧ move ${q} (#${i + 1}): 「${g}」 — no ${m[1]}-square region`);
          if (q === best && /パス/.test(g) && !F[q][6] && !/パスさせられる！$/.test(g)) a(`⑧ move ${q} (#${i + 1}): praises a pass that is not there`);
          if (q !== best && /緑の枠なら、相手をパス|緑の枠は、相手をパス|緑の枠なら相手はパス|緑の枠を打てば、相手は打つ場所|緑の枠で相手をパス|緑の枠なら、相手の手番/.test(g) && !F[best][6]) a(`⑦ move ${q} (#${i + 1}): says the answer makes a pass`); } } }); });
  return out;
}
// (2026-11-24 第2期) checkers: the endgame course (e_kings・e_men・e_draw) — every legal move solved again from the endgame database
// (checkers/tools/wasm.js loadSync: egdb4 probe, the positions it leaves out — a capture pending — opened by a short full-width search),
// the step's shape, no near-duplicates across everything the game shows (lessons, warm-ups, puzzles, openings; the colour-swapped turn
// too), the easy-to-hard order, CK_EG (the wrong moves' results the 3D words use) and チェッカニ's words for every move (lessons3d ckLsJa).
const CK_DONE = new Set(['e_kings', 'e_men', 'e_draw']);
let ckW = null;
function ckExact() {
  if (!ckW) ckW = require(path.join(ROOT, 'checkers/tools/wasm.js')).loadSync();
  const W = ckW, E = W.E, memo = new Map();
  const val = (p, d) => { const k = p.spec().b + p.side; if (memo.has(k)) return memo.get(k);   // the side to move: 1 win, 0 draw, -1 loss (null: not resolved)
    const L = p.moves(); let r;
    if (!L.length) r = -1; else { const v = W.probe(p.spec()); if (v === 1) r = 1; else if (v === 2) r = -1; else if (v === 3) r = 0; else if (d <= 0) r = null;
      else { let best = -2, unk = false; for (const m of L) { const q = p.clone().play(m), c = q.status() === -1 ? -1 : val(q, d - 1); if (c === null) { unk = true; continue; } best = Math.max(best, -c); if (best === 1) break; } r = best === 1 ? 1 : unk ? null : best; } }
    memo.set(k, r); return r; };
  const moveVal = (p, m) => { const q = p.clone().play(m); if (q.status() === -1) return 1; const c = val(q, 8); return c === null ? null : -c; };
  return { E, val, moveVal };
}
function ckPool(fs, L) {
  const out = []; L.steps.forEach(s => { s.problems.forEach((p, j) => out.push([`${s.id} q${j + 1}`, p.s.b, p])); (s.ramp || []).forEach((r, j) => out.push([`${s.id} warm-up ${j + 1}`, r.s.b, r])); });
  const walk = (o, n) => { if (!o || typeof o !== 'object') return; if (o.s && typeof o.s.b === 'string') out.push([n, o.s.b, o]); for (const k in o) if (k !== 's') walk(o[k], n + '/' + k); };
  walk(JSON.parse(fs.readFileSync(path.join(ROOT, 'checkers/puzzles.json'), 'utf8')), 'puzzle');
  walk(JSON.parse(fs.readFileSync(path.join(ROOT, 'checkers/openings.json'), 'utf8')).sets.map(s => s.problems), 'opening');
  return out;
}
const ckFlip = b => [...b].reverse().map(c => ({ b: 'w', w: 'b', B: 'W', W: 'B' })[c] || c).join('');
const ckDist = (a, b) => { const d = (x, y) => { let n = 0; for (let i = 0; i < 32; i++) if (x[i] !== y[i]) n++; return n; }; return Math.min(d(a, b), d(a, ckFlip(b))); };
function checkers(opt) {
  const fs = require('fs'), vm = require('vm');
  const L = (opt && opt.lessons) || JSON.parse(fs.readFileSync(path.join(ROOT, 'checkers/lessons.json'), 'utf8'));
  const src = (opt && opt.src) || fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8');
  const X = vm.runInNewContext('const CHECKERS = { data: null }; const xqPick = () => ""; const xqSn = () => [];' + src.slice(src.indexOf('  const CKM = '), src.indexOf('  const CHECKERS = {')) + '\n;({ ckLsJa, ckLF, CK_EG, CK_DC, CKJ_LS, CHECKERS })', {});
  X.CHECKERS.data = { ls: L };
  const { E, moveVal, val } = ckExact(), out = [], only = opt && opt.only, add = (id, j, m) => out.push({ step: id, q: j + 1, msg: m });
  // ⑨ both versions score P.ok
  const app = fs.readFileSync(path.join(ROOT, 'checkers/app.js'), 'utf8');
  if (!/if \(P\.ok\) return P\.ok\.includes\(m\) \? 20 : 0;/.test(app)) add('-', -1, '⑨ checkers/app.js problemPoints does not score P.ok');
  if (!/if \(P\.ok\) return P\.ok\.includes\(m\) \? 20 : 0;/.test(src)) add('-', -1, '⑨ the 3D CHECKERS.points does not score P.ok');
  const pool = ckPool(fs, L), R = { 1: 'w', 0: 'd', '-1': 'l' };
  const plain = t => String(t).replace(/[\u0001\u0002]/g, '');
  L.steps.forEach(st => { const id = st.id; if (!CK_DONE.has(id) || (only && !only.has(id))) return;
    let prevD = -1, firstD = null;
    st.problems.forEach((P, j) => { const a = m => add(id, j, m), p = E.Pos.from(P.s), all = p.moves(), nm = m => E.name(p, m), k = j % 5;
      const want = id === 'e_draw' ? 0 : 1, root = val(p, 8);
      if (root !== want) { a(`① the position is ${R[root]} for the side to move, the lesson wants ${R[want]}`); return; }
      const v = new Map(all.map(m => [m, moveVal(p, m)]));
      if ([...v.values()].some(x => x === null)) { a('① a move the database cannot resolve'); return; }
      const G = all.filter(m => v.get(m) === want), okS = new Set(P.ok);
      P.ok.forEach(m => { if (!all.includes(m)) a(`① the answer ${m} is not legal`); else if (v.get(m) !== want) a(`① the answer ${nm(m)} is ${R[v.get(m)]}`); });
      G.forEach(m => { if (!okS.has(m)) a(`② ${nm(m)} keeps the result but is scored wrong`); });
      if (!okS.has(P.best)) a('① best is not an answer');
      // ③ not too easy
      if (p.hasCaps()) a('③ a capture is forced (no choice)');
      if (all.length < 4) a(`③ only ${all.length} legal moves`);
      if (G.length * 2 > all.length || all.length - G.length < 2) a(`③ ${G.length} of ${all.length} moves are right`);
      // ④ the theme
      const pc = E.popc(p.b | p.w), men = E.popc((p.b | p.w) & ~p.k), mine = p.side === 1 ? p.b : p.w, opp = p.side === 1 ? p.w : p.b;
      if (pc > 4) a(`④ ${pc} pieces (the database: 4)`);
      if (id === 'e_kings' && men) a('④ a man on the board (kings only)');
      if (id === 'e_men' && men < 2) a('④ fewer than 2 men');
      if (id === 'e_draw' && all.some(m => v.get(m) === 1)) a('④ a winning move');
      if (id === 'e_draw' && all.some(m => !okS.has(m) && v.get(m) !== -1)) a('④⑦ a wrong move does not lose (the 2D words: 負けてしまいます)');
      // ⑥ easy to hard: the number of wrong moves never drops, and the last problem has more than the first
      const d = all.length - G.length;
      if (d < prevD) a(`⑥ easier than the problem before (${d} wrong moves after ${prevD})`); prevD = Math.max(prevD, d); if (firstD === null) firstD = d;
      if (j === st.problems.length - 1 && !(d > firstD)) a(`⑥ the last problem is no harder than problem 1 (${d} wrong moves vs ${firstD})`);
      // ⑤
      for (const [who, b, o] of pool) { if (o === P) continue; const e = ckDist(P.s.b, b); if (e <= 3) a(`⑤ ${e} square(s) from ${who}`); }
      // ⑦ CK_EG: every wrong move's result, as the database has it
      const eg = {}; String(X.CK_EG[P.s.b + P.s.side] || '').split(' ').filter(Boolean).forEach(x => { const [m, r] = x.split(':'); eg[m] = r; });
      for (const m of all) { const r = okS.has(m) ? undefined : R[v.get(m)]; if (eg[nm(m)] !== r) a(`⑦ CK_EG ${nm(m)}: ${eg[nm(m)]}, the database ${r}`); }
      for (const n in eg) if (!all.some(m => nm(m) === n)) a(`⑦ CK_EG ${n}: not a legal move`);
      // ⑧ the question and the hint (3D: by the problem's place k)
      if (!all.includes(P.best) || P.ok.some(m => !all.includes(m))) return;
      let Wd; try { Wd = X.ckLsJa(E, st, P, j); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
      const F = new Map(all.map(m => [m, X.ckLF(E, p, m)]));
      const kings = s => E.popc((s === p.side ? mine : opp) & p.k), menOf = s => E.popc((s === p.side ? mine : opp) & ~p.k), me = p.side, op = 3 - p.side;
      const dcGate = P.ok.every(m => !F.get(m).oppDC) && all.some(m => !okS.has(m) && F.get(m).oppDC);
      const need = (t, re, ok, why) => { if (re.test(t) && !ok) a(`⑧ 「${t}」: ${why}`); };
      for (const t of [Wd.ask, Wd.hintTx]) {
        if (!t || /\{|undefined|NaN/.test(t)) a(`⑧ the question / hint 「${t}」`);
        need(t, /二重コーナーに逃がさない|二重コーナーへ行かせない/, dcGate, 'no wrong move lets the opponent\'s king into a double corner (or a right one does)');
        need(t, /2枚のキングで/, kings(me) >= 2, `${kings(me)} king(s)`);
        need(t, /タダで取られない|タダで取られる駒/, all.some(m => !okS.has(m) && F.get(m).net < 0), 'no wrong move gives a piece away');
        need(t, /どっちが先にキング|キング競争/, menOf(me) && menOf(op), 'not both sides have men');
        need(t, /相手のマン/, menOf(op) > 0, 'the opponent has no man');
        need(t, /先にキングになれば/, menOf(me) > 0, 'no man of ours');
        need(t, /キングとマン、どの駒/, kings(me) && menOf(me), 'not a king and a man of ours');
        need(t, /二重コーナーに逃げこむと/, kings(me) > 0 && P.ok.some(m => X.CK_DC.includes(E.mTo(m))), 'the answer does not go into a double corner');
        need(t, /一つか二つだけ/, G.length <= 2, `${G.length} right moves`);
      }
      // ⑦⑧ the words after every move
      for (const m of all) { const f = F.get(m);
        if (okS.has(m)) { const g = plain(Wd.good(m));
          if (!g || /\{|undefined|NaN/.test(g)) { a(`⑧ the praise of ${nm(m)} 「${g}」`); continue; }
          if (/ほかの手では届かない|これだけが|ただ一つ/.test(g) && G.length > 1) a(`⑧ the praise of ${nm(m)} 「${g}」: ${G.length} right moves`);
          if (/二重コーナー/.test(g) && !X.CK_DC.includes(E.mTo(m))) a(`⑧ the praise of ${nm(m)} 「${g}」: not into a double corner`);
          if (/取って|取り合/.test(g) && !(f.capN || f.trade)) a(`⑧ the praise of ${nm(m)} 「${g}」: no capture`);
          if (/キングにな|王冠|成って/.test(g) && !f.crown) a(`⑧ the praise of ${nm(m)} 「${g}」: no crowning`);
          continue; }
        const raw = plain(Wd.ng(m)), i0 = raw.indexOf('赤い矢印の手'), t = i0 >= 0 ? raw.slice(i0) : '';
        if (!t) { a(`⑦ ${nm(m)}: the words do not name the move 「${raw}」`); continue; }
        if (/\{|undefined|NaN/.test(raw)) a(`⑧ ${nm(m)}: 「${raw}」`);
        const r = v.get(m);
        if (r === -1 && !/負け/.test(t)) a(`⑦ ${nm(m)} loses, the words: 「${t}」`);
        if (r === 0 && !/引き分け|勝ちが消え/.test(t)) a(`⑦ ${nm(m)} only draws, the words: 「${t}」`);
        if (r === 0 && /負け/.test(t)) a(`⑦ ${nm(m)} draws, the words say it loses: 「${t}」`);
        if (f.net < 0 && !/取られ|跳び越え/.test(t)) a(`⑦ ${nm(m)} gives ${-f.net} piece(s) away, the words: 「${t}」`);
        if (f.net >= 0 && /タダで|取られ/.test(t)) a(`⑦ ${nm(m)} gives nothing away, the words: 「${t}」`);
        if (/二重コーナー/.test(t) && !f.oppDC) a(`⑦ ${nm(m)}: 「${t}」 — the opponent cannot reach a double corner`);
        if (/キングにな|王冠|キングを作/.test(t) && !f.oppCrown) a(`⑦ ${nm(m)}: 「${t}」 — the opponent cannot crown`); }
    }); });
  ckWarm(opt, L, E, X, val, moveVal, add, only);
  return out;
}
// (2026-11-24 第2期 追14) the checkers warm-ups of CK_DONE (lessons.json step.ramp, the 2D words in ja and チェッカニ's 3D lines in
//   checkers/voice-crab-ja.js 'ramp:<id>/<j>/<f>'): explain — the marked move (hl → ok) is legal and keeps the lesson's result (①), the
//   words say 「その一つ」 when more moves keep it, every claim is the board's (the number of moves that keep it, 勝ち / 引き分け, a king
//   jumped next to the enemy king, a man about to be jumped that crowns, a double corner, the enemy man caught when it comes on, the
//   crowning moves that only draw), and at least one board reason is given (⑧); try — P.ok = the moves that keep the result (①②), the
//   gold ring on their piece, 「色と向きを入れかえた同じ形」 is the explain's board turned round, the words' result is the lesson's.
function ckWarm(opt, L, E, X, val, moveVal, add, only) {
  const fs = require('fs');
  let V = (opt && opt.voice) || null;
  if (!V) { const w = {}; try { new Function('window', fs.readFileSync(path.join(ROOT, 'checkers/voice-crab-ja.js'), 'utf8'))(w); } catch (e) {} V = ((w.I18N || {})['ja@crab']) || {}; }
  const ja = x => x == null ? '' : typeof x === 'string' ? x : String(x.ja || '');
  const N = t => { const k = '〇一二三四五六七八九'.indexOf(t); return k >= 0 ? k : +t; };
  L.steps.forEach(st => { const id = st.id; if (!CK_DONE.has(id) || (only && !only.has(id)) || !st.ramp) return;
    const want = id === 'e_draw' ? 0 : 1, R = { 1: '勝ち', 0: '引き分け', '-1': '負け' };
    st.ramp.forEach((r, j) => { const a = m => add(id, -1, `warm-up ${j + 1} (${r.k}): ${m}`), p = E.Pos.from(r.s), all = p.moves(), nm = m => E.name(p, m);
      if (val(p, 8) !== want) { a(`① the position is ${R[val(p, 8)]} for the side to move, the lesson wants ${R[want]}`); return; }
      const v = new Map(all.map(m => [m, moveVal(p, m)])), G = all.filter(m => v.get(m) === want), W = all.filter(m => !G.includes(m));
      const F = new Map(all.map(m => [m, X.ckLF(E, p, m)]));
      const T2 = ['t', 'body', 'g', 'h', 'y'].map(f => ja(r[f])).join(' '), T3 = ['t', 'body', 'g', 'h', 'y'].map(f => V[`ramp:${id}/${j}/${f}`] || (f === 'h' && r.src === 'turn' ? V['ls.' + id + '.hint'] : '') || '').join(' ');
      const texts = [['2D', T2], ['3D', T3]].filter(x => x[1].trim());
      const res = t => { if (/勝ちを保|勝ちにつなが|勝てる|勝ち切/.test(t) && want !== 1) a(`⑧ 「${t.slice(0, 40)}…」: the result is ${R[want]}`); if (/引き分けに(でき|持ちこ)|負けない手/.test(t) && want !== 0) a(`⑧ 「${t.slice(0, 40)}…」: the result is ${R[want]}`); };
      if (r.k === 'explain') {
        const hl = (r.marks || []).filter(x => x[1] === 'hl').map(x => x[0] - 1), to = (r.marks || []).filter(x => x[1] === 'ok').map(x => x[0] - 1);
        const M = all.filter(m => hl.includes(E.mFrom(m)) && to.includes(E.mTo(m)));
        if (hl.length !== 1 || to.length !== 1 || M.length !== 1) { a(`① the marks (hl ${hl.map(x => x + 1)} → ok ${to.map(x => x + 1)}) are not one legal move`); return; }
        const m = M[0], f = F.get(m);
        if (v.get(m) !== want) { a(`① the marked move ${nm(m)} is ${R[v.get(m)]}`); return; }
        const after = f.after;
        const caught = after.moves().some(r2 => { const fr = E.mFrom(r2), pc = after.at(fr); if (pc === 2 || pc === 4 || E.mCap(r2)) return false; const q = after.clone().play(r2); return q.caps().some(c => E.mCap(c) & E.bit(E.mTo(r2))); });
        for (const [who, t] of texts) { res(t); let why = 0; const b = (re, ok, msg) => { if (re.test(t)) { if (ok) why++; else a(`⑧ ${who} 「${t.match(re)[0]}」: ${msg}`); } };
          if (G.length > 1 && !/一つ|ひとつ/.test(t)) a(`⑧ ${who}: ${G.length} moves keep the result (${G.map(nm).join(' ')}), the words give the marked one as the only one`);
          if (/少ない/.test(t) && !(G.length * 2 < all.length)) a(`⑧ ${who} 「少ない」: ${G.length} of ${all.length}`);
          if (/一つか二つ/.test(t) && G.length > 2) a(`⑧ ${who} 「一つか二つ」: ${G.length}`);
          const c = t.match(/([0-9〇一二三四五六七八九]+)つの手のうち([0-9〇一二三四五六七八九]+)つ/); if (c && (N(c[1]) !== all.length || N(c[2]) !== G.length)) a(`⑧ ${who} 「${c[0]}」: ${G.length} of ${all.length}`);
          const c2 = t.match(/ほかの([0-9〇一二三四五六七八九]+)つの手/); if (c2 && N(c2[1]) !== W.length) a(`⑧ ${who} 「${c2[0]}」: ${W.length} other moves`);
          b(/二重コーナーへ逃がさない|二重コーナーに逃がさない/, G.every(x => !F.get(x).oppDC) && W.some(x => F.get(x).oppDC), 'no wrong move lets the enemy king into a double corner (or a right one does)');
          b(/二重コーナーへ逃げこむ|二重コーナーに逃げこむ/, (p.at(E.mFrom(m)) === 2 || p.at(E.mFrom(m)) === 4) && f.tDC, `the marked move ${nm(m)} is not a king going into a double corner`);
          b(/となりに入/, W.length && W.every(x => F.get(x).near && F.get(x).net < 0) && G.every(x => !F.get(x).near), 'not every other move goes next to an enemy piece and is jumped (or a right one does)');
          b(/取られて|取られちゃ|取られてしま|跳び越され(て|る)/, W.length && W.every(x => F.get(x).net < 0) && G.every(x => F.get(x).net >= 0), 'not every other move gives a piece away (or the right one does)');
          b(/跳び越されそう|ねらわれて/, f.fled, `the marked piece is not under attack`);
          b(/取られずにキング|キングになれば助か|キングになって逃げ/, f.crown && f.fled && f.net >= 0, `${nm(m)} does not crown a piece out of danger`);
          b(/跳び越して取れる|相手のマンを止める/, caught, 'no enemy man that comes on can be taken');
          b(/すぐキングになる手は、?引き分けどまり/, W.some(x => F.get(x).crown) && W.filter(x => F.get(x).crown).every(x => v.get(x) === 0), 'the crowning moves do not all only draw');
          if (!why) a(`⑧ ${who}: no board reason for ${nm(m)} (why it keeps the result, what the others do)`); }
      } else if (r.k === 'try') {
        const okS = new Set((r.ok || []).map(n => all.find(m => nm(m) === n)).filter(x => x != null));
        if (okS.size !== (r.ok || []).length) a(`① an answer is not legal (${r.ok})`);
        G.forEach(m => { if (!okS.has(m)) a(`② ${nm(m)} keeps the result but is scored wrong`); });
        okS.forEach(m => { if (!G.includes(m)) a(`① the answer ${nm(m)} is ${R[v.get(m)]}`); });
        const look = (r.look || []).map(q => q - 1); if (look.length && ![...okS].every(m => look.includes(E.mFrom(m)))) a('⑧ the gold ring is not on the answer\'s piece');
        const prev = st.ramp[j - 1];
        for (const [who, t] of texts) { res(t);
          if (/色と向きを入れかえた同じ形/.test(t) && !(prev && ckFlip(prev.s.b) === r.s.b && prev.s.side !== r.s.side)) a(`⑧ ${who} 「色と向きを入れかえた同じ形」: not the warm-up before turned round`);
          if (/金の丸/.test(t) && !look.length) a(`⑧ ${who} 「金の丸」: no ring`); }
      }
    }); });
}
// (2026-11-24 第2期) tafl: the basics TF_DONE (b_move・b_cap・b_hostile), every problem with the rules (tafl/engine.js):
//   ①② P.ok = the goal set exactly (b_move: the king's slides to a non-corner edge square; b_cap: every capture, all against a piece
//   or the king; b_hostile: every capture, each against a corner or the empty throne), best ∈ ok
//   ③ ≥3 legal moves, ≥2 wrong ones, at most a third of the moves right; b_move: ≥2 king moves that stop short
//   ④ the theme: b_move — the king is inside, no open line to a corner, no win now; b_cap — no corner / throne capture, no win now;
//   b_hostile — no capture against a piece; neither side wins at once
//   ⑤ no position within 3 squares (8 symmetries) of any other lesson / warm-up / diagram / puzzle position, and no two problems of
//   these lessons with the same answer (the same from→to)
//   ⑥ d never goes down and the last > the first (b_move: the king's wrong slides; b_cap / b_hostile: the wrong moves that land next
//   to an enemy man — the near-misses)
//   ⑦⑧ タフリン's 3D words (atlas/lessons3d.js tfLsJa, run here) for every right move (the corner / throne it names, the number taken,
//   縦と横) and for every wrong move (the king or not, a blocker on the way, a capture or not, a piece of yours taken next), the question
//   and the hint (a corner / the throne named is in an answer)
//   ⑨ the 2D (tafl/app.js problemPoints) and the 3D (TAFL.points) both score P.ok
const TF_DONE = new Set(['b_move', 'b_cap', 'b_hostile', 'b_escape', 'b_kingcap']);
function tafl(opt) {
  const fs = require('fs'), vm = require('vm');
  const E = require(path.join(ROOT, 'tafl/engine.js')), L = (opt && opt.lessons) || JSON.parse(fs.readFileSync(path.join(ROOT, 'tafl/lessons.json'), 'utf8'));
  const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'tafl/puzzles.json'), 'utf8'));
  const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), app = fs.readFileSync(path.join(ROOT, 'tafl/app.js'), 'utf8');
  const X = vm.runInNewContext(src.slice(src.indexOf('  const TFM = '), src.indexOf('  const TAFL = {')) + '\n;({ tfLsJa, TFM })', { window: {} });
  const out = [], add = (id, j, m) => out.push({ step: id, q: j + 1, msg: m });
  if (!/function problemPoints\(P, m\) \{\n  if \(P\.ok\) return P\.ok\.includes\(m\) \? 20 : 0;/.test(app)) add('-', -1, '⑨ tafl/app.js problemPoints does not score P.ok');
  if (!/points\(P, m\) \{[^\n]*\n      if \(P\.ok\) return P\.ok\.includes\(m\) \? 20 : 0;/.test(src)) add('-', -1, '⑨ the 3D TAFL.points does not score P.ok');
  const n = 11, F = E.geo('copenhagen').F, CORNER = i => !!(F[i] & 2), THRONE = i => !!(F[i] & 4), EDGE = i => !!(F[i] & 1);
  const { mFrom, mTo } = E, RC = i => [Math.floor(i / n), i % n];
  // what each capture of m leans on: the square beyond the taken man (the same line as the mover)
  const anvils = (p, m) => { const t = mTo(m), q = p.clone().play(m); return q.lastCaps.map(c => { const o = 2 * c - t, x = p.at(o); return CORNER(o) ? '角' : THRONE(o) && !x ? '玉座' : x ? '駒' : '?'; }); };
  const capDirs = (p, m) => { const t = mTo(m), q = p.clone().play(m); return new Set(q.lastCaps.map(c => RC(c)[0] === RC(t)[0] ? '横' : '縦')); };
  const enemyMan = (p, i, me) => { const x = p.at(i); return me === 1 ? x === 2 : x === 1; };
  const near = (p, m, me) => { const q = p.clone(); q.b[mTo(m)] = q.b[mFrom(m)]; q.b[mFrom(m)] = 0; return q.nb(mTo(m)).some(i => enemyMan(p, i, me)); };
  const blocked = (p, f, t) => { const [r1, c1] = RC(f), [r2, c2] = RC(t), dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1); let r = r2 + dr, c = c2 + dc; while (r >= 0 && c >= 0 && r < n && c < n) { const i = r * n + c; if (p.at(i)) return true; if (EDGE(i) && !(F[i] & 8)) return false; if (EDGE(i)) return true; r += dr; c += dc; } return false; };
  // ⑤ the pool
  const pool = [];
  L.steps.forEach(st => { (st.problems || []).forEach((q, j) => pool.push([`${st.id} q${j + 1}`, q.s.b])); if (st.diagram) pool.push([`${st.id} diagram`, st.diagram.s.b]); (st.ramp || []).forEach((r, j) => r.s && pool.push([`${st.id} ramp ${j + 1}`, r.s.b])); });
  (PZ.themes || []).forEach(th => (th.puzzles || []).forEach((q, j) => pool.push([`puzzle ${th.id} ${j + 1}`, q.s.b])));
  const SYM = [(r, c) => [r, c], (r, c) => [r, 10 - c], (r, c) => [10 - r, c], (r, c) => [10 - r, 10 - c], (r, c) => [c, r], (r, c) => [c, 10 - r], (r, c) => [10 - c, r], (r, c) => [10 - c, 10 - r]];
  const dist = (a, b) => { let best = 99; for (const S of SYM) { let d = 0; for (let i = 0; i < 121 && d < best; i++) { const [r, c] = S((i / 11) | 0, i % 11); if (a[i] !== b[r * 11 + c]) d++; } best = Math.min(best, d); } return best; };
  const seen = new Map(), symSeen = new Map(), plain = t => String(t).replace(/[\u0001\u0002]/g, '');
  const five = (id, j, P, me, nm, a) => {
      for (const [who, b] of pool) { if (who === `${id} q${j + 1}`) continue; const e = dist(P.s.b, b); if (e <= 3) a(`⑤ ${e} squares from ${who}`); }
      for (const m of P.ok) { const k = nm(m).replace(/x.*/, ''); if (seen.has(k)) a(`⑤ the same answer ${k} as ${seen.get(k)}`); else seen.set(k, `${id} q${j + 1}`); }
      // (2026-11-24 2巡目) the same move turned or mirrored (h4-h6xg6 = d8-d6xe6) is the same problem too: the 8 symmetries, the mover's side
      for (const m of P.ok) { const sym = SYM.map(S => { const [a1, b1] = S(...RC(mFrom(m))), [a2, b2] = S(...RC(mTo(m))); return `${me}:${a1 * n + b1}>${a2 * n + b2}`; });
        const hit = sym.find(k => symSeen.has(k)); if (hit && symSeen.get(hit) !== `${id} q${j + 1}`) a(`⑤ the same answer as ${symSeen.get(hit)} turned / mirrored (${nm(m)})`); sym.forEach(k => { if (!symSeen.has(k)) symSeen.set(k, `${id} q${j + 1}`); }); }
  };

  // (2026-11-24 第2期) the N-move problems (b_escape: the king to a corner, b_kingcap: the king caught, P.n own moves against every
  // defence). A solver of its own (the rules of tafl/engine.js): force(p, m, k) = after m, whatever the opponent plays, the goal comes
  // within k own moves (m counted). goal: the theme's win (a corner / the king captured), or any win (all = true: what the 2D / 3D
  // runner, engine.c puzzle(), accepts — so no move outside P.ok may win in time in any way).
  const solver = (me, all) => { const memo = new Map();
    const goal = q => q.res === me && (all || (me === 2 ? CORNER(q.king) : q.why === 'capture'));
    const now = p => (all ? p.moves() : me === 2 ? p.moves().filter(m => mFrom(m) === p.king && CORNER(mTo(m))) : p.moves().filter(m => p.nb(p.king).includes(mTo(m)))).some(m => goal(p.clone().play(m)));
    const ord = (q, R) => { const k = q.king, adj = new Set(q.nb(k)), kr = (k / n) | 0, kc = k % n; return R.map(r => { const t = mTo(r), f = mFrom(r); return [f === k ? 0 : adj.has(t) ? 1 : ((t / n) | 0) === kr || t % n === kc ? 2 : 3, r]; }).sort((x, y) => x[0] - y[0]).map(x => x[1]); };
    const win = (p, k) => { if (k === 1) return now(p); const key = p.b.join('') + k; if (memo.has(key)) return memo.get(key); let r = false; for (const m of p.moves()) if (force(p, m, k)) { r = true; break; } memo.set(key, r); return r; };
    const force = (p, m, k) => { const q = p.clone().play(m); if (goal(q)) return true; if (q.res || k === 1) return false; const R = q.moves(); if (!R.length) return false;
      for (const r of ord(q, R)) { const z = q.clone().play(r); if (z.res || !win(z, k - 1)) return false; } return true; };
    const refute = (p, m, k, cap) => { const q = p.clone().play(m); if (goal(q)) return 0; if (q.res || k === 1) return 99; let c = 0; for (const r of ord(q, q.moves())) { const z = q.clone().play(r); if (z.res || !win(z, k - 1)) { if (++c >= cap) return c; } } return c; };
    return { force, refute, goal }; };
  const relSeen = new Map();
  const kMob = q => { const z = q.clone(); z.turn = 2; z.res = 0; return z.king < 0 ? 0 : z.moves().filter(x => mFrom(x) === z.king).length; };
  const winsNext = q => !q.res && q.moves().some(x => q.clone().play(x).res === q.turn);
  const seqCheck = (st, si, P, j, a) => { const id = st.id, p = E.Pos.from(P.s), me = p.turn, all = p.moves(), nm = m => E.name(p, m), N = P.n, esc = id === 'b_escape';
    const S = solver(me, false), SA = solver(me, true), okS = new Set(P.ok || []);
    if (me !== (esc ? 2 : 1)) a('④ the wrong side to move');
    // ①②
    const goalSet = all.filter(m => S.force(p, m, N));
    (P.ok || []).forEach(m => { if (!all.includes(m)) a(`① the answer ${m} is not legal`); else if (!goalSet.includes(m)) a(`① the answer ${nm(m)} does not force the ${esc ? 'escape' : 'capture'} in ${N} against every defence`); });
    goalSet.forEach(m => { if (!okS.has(m)) a(`② ${nm(m)} forces it too but is scored wrong`); });
    if (!okS.has(P.best)) a('① best is not an answer');
    all.filter(m => !okS.has(m)).forEach(m => { if (SA.force(p, m, N)) a(`⑨ ${nm(m)} wins in ${N} some other way (the runner would take it)`); });
    // ④ N moves are needed (none in N-1), the king not caught / boxed already, no win or loss at once
    if (all.some(m => S.force(p, m, N - 1))) a(`④ the goal comes in ${N - 1} already`);
    if (all.some(m => p.clone().play(m).res)) a('④ a move ends the game at once');
    { const q = p.clone(); q.turn = 3 - me; q.res = 0; if (q.moves().some(m => q.clone().play(m).res === 3 - me)) a('④ the opponent threatens to win at once'); }
    const hs = p.nb(p.king).filter(i => p.at(i) === 1 || THRONE(i)).length;
    if (!esc && (hs > 2 || EDGE(p.king))) a(`④ the king is boxed already (${hs} hostile sides${EDGE(p.king) ? ', on the edge' : ''}) — not what the intro shows`);
    if (esc && EDGE(p.king)) a('④ the king is on the edge already');
    // ③
    const wrong = all.filter(m => !okS.has(m)), kM = all.filter(m => mFrom(m) === p.king);
    if (all.length < 3 || wrong.length < 2 || P.ok.length * 3 > all.length) a(`③ ${P.ok.length} of ${all.length} moves are right`);
    if (esc && (kM.length < 3 || kM.filter(m => !okS.has(m)).length < 2)) a(`③ the king has ${kM.length} moves`);
    // ⑤
    five(id, j, P, me, nm, a);
    // ⑤ the same shape moved along the board: the 5×5 around the king (8 symmetries, the board's edges / corners / throne as walls)
    // within 2 squares of another problem of the lesson's
    { const [kr, kc] = RC(p.king), loc = []; for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { const r = kr + dr, c = kc + dc, i = r * n + c; loc.push(r < 0 || c < 0 || r >= n || c >= n ? '#' : p.at(i) ? '.adk'[p.at(i)] : CORNER(i) || THRONE(i) ? '+' : '.'); }
      for (const [jj, o] of relSeen.get(id) || []) { let best = 99; for (const S of SYM) { let e = 0; for (let q = 0; q < 25; q++) { const [a1, b1] = S(((q / 5) | 0) + 3, q % 5 + 3); if (loc[q] !== o[(a1 - 3) * 5 + b1 - 3]) e++; } best = Math.min(best, e); }
        if (best <= 2) a(`⑤ the same shape around the king as q${jj + 1} (${best} squares apart)`); }
      if (!relSeen.has(id)) relSeen.set(id, []); relSeen.get(id).push([j, loc]); }
    // ⑥ d: the near-misses (wrong first moves that only one or two defences beat)
    const d = wrong.filter(m => S.refute(p, m, N, 3) <= 2).length;
    return d; };
  const seqWords = (st, si, P, j, a) => { const id = st.id, esc = id === 'b_escape', p0 = E.Pos.from(P.s), me = p0.turn, N = P.n, S = solver(me, false);
    let W; try { W = X.tfLsJa(E, st, P, j, k => X.TFM(k, 'ja'), si); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
    for (const t of [W.ask, W.hintTx, plain(W.good())]) if (!t || /\{|undefined|NaN/.test(t) || /2本同時|2本作/.test(t)) a(`⑧ 「${t}」`);
    // ⑦⑧ at the first move (every wrong move) and at the second (the stored line, every wrong move there)
    const stages = [[p0, 0]]; if (P.line && P.line.length >= 2) stages.push([p0.clone().play(P.line[0]).play(P.line[1]), 1]);
    for (const [pos, used] of stages) { const left = N - used, all = pos.moves(), goods = all.filter(m => S.force(pos, m, left)); if (!goods.length) { a(`① the stored line: no forced move at your move ${used + 1}`); continue; }
      const m = goods[0], q2 = pos.clone().play(m), nm = x => E.name(pos, x);
      for (const u of all.filter(x => !goods.includes(x))) { const raw = plain(W.ng(u, pos, used, m)), x = nm(u), i0 = raw.indexOf('赤い印の手'), i1 = raw.indexOf('緑の印の手');
        if (/\{|undefined|NaN/.test(raw) || i0 < 0 || i1 < 0) { a(`⑧ move ${used + 1} ${x}: 「${raw}」`); continue; }
        const tx = raw.slice(i0, i1), tm = raw.slice(i1), q = pos.clone().play(u), say = (c, ok, why) => { if (c && !ok) a(`⑦ move ${used + 1} ${x}: 「${raw}」 — ${why}`); };
        for (const t of raw.match(/\d+手(?=のうち|では|で(?:角|つか|捕獲))/g) || []) if (+t.replace('手', '') !== left) a(`⑧ move ${used + 1} ${x}: 「${raw}」 — ${left} moves are left`);
        if (esc) { const king = pos.at(mFrom(u)) === 3, kl = q.kingLines().length, kl2 = q2.kingLines().length, wn = winsNext(q);
          say(/つかまっちゃう|はさまれて負け|つかまる場所|王がつかま|攻め手でうま/.test(tx), wn, 'the king is not caught next'); say(wn, /つかまっちゃう|はさまれて負け|つかまる場所|王がつかま|攻め手でうま/.test(tx), 'the king is caught next, the words do not say it');
          say(/王さまじゃない駒|王は動いてない|王さまはその場|王さまが進まない/.test(tx), !king, 'the king moved'); say(!king && !wn, /王さまじゃない駒|王は動いてない|王さまはその場|王さまが進まない/.test(tx), 'not the king, the words do not say it');
          say(/1本/.test(tx), kl === 1 && q.moves().some(r => { const z = q.clone().play(r); return !z.res && !z.kingLines().length; }), `the king has ${kl} line(s) / no single block`);
          say(/まだない|ひとつもできない|ふさがったまま|ゼロ/.test(tx), kl === 0, `the king has ${kl} line(s)`);
          const c2 = tm.match(/(\d+)本/); say(!!c2, c2 && +c2[1] === kl2 && kl2 >= 2 && q2.moves().every(r => { const z = q2.clone().play(r); return !z.res && z.kingLines().length; }), `${kl2} line(s) after the right move / one block stops them`);
          say(/そのまま角|その場で脱出|一直線に角|角まで一直線/.test(tm), q2.res === 2, 'the right move does not reach a corner'); }
        else { const k0 = kMob(pos), k1 = kMob(q), k2 = kMob(q2), wn = winsNext(q);
          say(/逃げられちゃう！|脱出され|角に着いちゃう|角まで走られ|角へ逃げこめる/.test(tx), wn, 'the king cannot reach a corner next'); say(wn, /逃げられちゃう！|脱出され|角に着いちゃう|角まで走られ|角へ逃げこめる/.test(tx), 'the king escapes next, the words do not say it');
          const c1 = tx.match(/(\d+)(マス|つ残る)/); say(!!c1, c1 && +c1[1] === k1, `the king has ${k1} free squares`);
          say(/動けないけど|動けなくても|王を止めても/.test(tx), k1 === 0, `the king has ${k1} free squares`);
          const c3 = tm.match(/(\d+)から(\d+)に減|(\d+)マスから(\d+)マス/); say(!!c3, c3 && +(c3[1] || c3[3]) === k0 && +(c3[2] || c3[4]) === k2 && k2 < k0, `the king's free squares ${k0} → ${k2}`);
          const c4 = tm.match(/(\d+)つにしぼ/); say(!!c4, c4 && +c4[1] === k2 && k2 < k0, `the king's free squares ${k0} → ${k2}`);
          say(/その場で王|そのままかこみが閉じ|すぐ捕獲|その場で攻め手の勝ち|最後の1枚/.test(tm), q2.res === 1, 'the right move does not catch the king'); }
      } } };
  L.steps.forEach((st, si) => { const id = st.id; if (!TF_DONE.has(id)) return;
    let prevD = -1, firstD = null;
    st.problems.forEach((P, j) => { const a = m => add(id, j, m), p = E.Pos.from(P.s), me = p.turn, all = p.moves(), nm = m => E.name(p, m);
      if (P.n > 1) { const d = seqCheck(st, si, P, j, a); if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d); if (firstD === null) firstD = d;
        if (j === st.problems.length - 1 && !(d > firstD)) a(`⑥ the last problem is no harder than problem 1 (d ${d} vs ${firstD})`); seqWords(st, si, P, j, a); return; }
      const okS = new Set(P.ok || []), capM = all.filter(m => p.clone().play(m).lastCaps.length);
      if (!P.ok || !P.ok.length) { a('① no answer list'); return; }
      // ①② the goal set
      const goal = id === 'b_move' ? all.filter(m => p.at(mFrom(m)) === 3 && EDGE(mTo(m)) && !CORNER(mTo(m))) : capM.filter(m => !p.clone().play(m).res);
      P.ok.forEach(m => { if (!all.includes(m)) a(`① the answer ${m} is not legal`); else if (!goal.includes(m)) a(`① the answer ${nm(m)} does not reach the goal`); });
      goal.forEach(m => { if (!okS.has(m)) a(`② ${nm(m)} reaches the goal but is scored wrong`); });
      if (!okS.has(P.best)) a('① best is not an answer');
      // ③
      const wrong = all.filter(m => !okS.has(m));
      if (all.length < 3 || wrong.length < 2) a(`③ ${all.length} legal moves, ${wrong.length} wrong`);
      if (P.ok.length * 3 > all.length) a(`③ ${P.ok.length} of ${all.length} moves are right`);
      const kWrong = all.filter(m => p.at(mFrom(m)) === 3 && !okS.has(m));
      if (id === 'b_move' && kWrong.length < 2) a(`③ the king has ${kWrong.length} wrong slides`);
      // ④
      if (all.some(m => p.clone().play(m).res === me)) a('④ the mover wins at once');
      { const q = p.clone(); q.turn = 3 - me; q.res = 0; if (q.moves().some(m => q.clone().play(m).res === 3 - me)) a('④ the opponent threatens to win at once'); }
      if (id === 'b_move') { if (EDGE(p.king)) a('④ the king is on the edge already'); if (p.kingLines().length) a('④ the king has an open line to a corner'); if (me !== 2) a('④ not the defender to move'); }
      if (id === 'b_cap') capM.forEach(m => { const k = anvils(p, m); if (k.some(x => x !== '駒')) a(`④ ${nm(m)} takes against ${k.join('/')} (the next lesson)`); });
      if (id === 'b_hostile') capM.forEach(m => { const k = anvils(p, m); if (!k.some(x => x === '角' || x === '玉座')) a(`④ ${nm(m)} takes against a piece (not the lesson)`); });
      five(id, j, P, me, nm, a);
      // ⑥
      const d = id === 'b_move' ? kWrong.length : wrong.filter(m => near(p, m, me)).length;
      if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d); if (firstD === null) firstD = d;
      if (j === st.problems.length - 1 && !(d > firstD)) a(`⑥ the last problem is no harder than problem 1 (d ${d} vs ${firstD})`);
      // ⑦⑧ the 3D words
      let W; try { W = X.tfLsJa(E, st, P, j, k => X.TFM(k, 'ja'), si); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
      const kinds = new Set(P.ok.flatMap(m => anvils(p, m)));
      for (const t of [W.ask, W.hintTx]) {
        if (/四隅|角に接|角か玉座に接/.test(t) && !/玉座/.test(t) && !kinds.has('角')) a(`⑧ 「${t}」: no answer uses a corner`);
        if (/空いた玉座も|玉座に接/.test(t) && !/角/.test(t) && !kinds.has('玉座')) a(`⑧ 「${t}」: no answer uses the throne`);
        if (/もう味方がいる|準備OK|味方とはさめる|自分の駒2つ/.test(t) && !kinds.has('駒')) a(`⑧ 「${t}」: the answer does not take against a piece`);
      }
      for (const u of P.ok) { const g = plain(W.good(u)), k = anvils(p, u), c = k.length;
        if (!g || /\{|undefined|NaN/.test(g)) { a(`⑧ the praise of ${nm(u)} 「${g}」`); continue; }
        if (/角/.test(g) && !k.includes('角') && id !== 'b_move') a(`⑧ the praise of ${nm(u)} 「${g}」: not against a corner`);
        if (/玉座/.test(g) && !k.includes('玉座')) a(`⑧ the praise of ${nm(u)} 「${g}」: not against the throne`);
        if (/味方/.test(g) && !/角|玉座/.test(g) && !k.includes('駒')) a(`⑧ the praise of ${nm(u)} 「${g}」: not against a piece`);
        const cn = g.match(/(\d+)(つ|枚)/); if (cn && +cn[1] !== c) a(`⑧ the praise of ${nm(u)} 「${g}」: ${c} taken`);
        if (/縦と横/.test(g) && capDirs(p, u).size < 2) a(`⑧ the praise of ${nm(u)} 「${g}」: not both ways`);
        if (/角まであと少し/.test(g) && !p.clone().play(u).nb(mTo(u)).some(CORNER)) a(`⑧ the praise of ${nm(u)} 「${g}」: the king is not next to a corner`);
        // (2026-11-24 2巡目) the king as the other side (b_cap's intro: 王さまもはさむ仲間): the praise says so, and only then
        const kp = p.clone().play(u).lastCaps.some(c => p.at(2 * c - mTo(u)) === 3);
        if (/王さまと組|王さまが反対側|王さまといっしょに|王さまと味方の駒で|王さまを相方/.test(g) !== kp) a(`⑧ the praise of ${nm(u)} 「${g}」: the king ${kp ? 'is' : 'is not'} the other side`); }
      for (const m of wrong) { const raw = plain(W.ng(m)), i0 = raw.indexOf('赤い印の手'), t0 = i0 >= 0 ? raw.slice(i0) : raw, i1 = t0.indexOf('緑の印の手'), t = i1 > 0 ? t0.slice(0, i1) : t0, x = nm(m);   // (t: what the words say of yours, up to the right move
        if (/\{|undefined|NaN/.test(raw)) { a(`⑧ ${x}: 「${raw}」`); continue; }
        if (!/緑の印の手/.test(raw)) a(`⑦ ${x}: the words do not name the right move 「${raw}」`);
        if (i0 < 0) a(`⑦ ${x}: the words do not name your move (the red mark) 「${raw}」`);   // (2026-11-24 2巡目: 「その向きは…」「動かしたのが…」)
        const q = p.clone().play(m), king = p.at(mFrom(m)) === 3, took = q.lastCaps.length;
        let c2 = 0; if (!q.res) for (const r of q.moves()) c2 = Math.max(c2, q.clone().play(r).lastCaps.length);
        if (id === 'b_move') { const notK = /王じゃない|王さまじゃない|守り手の駒|その場から動いてない|王さまじゃなかった/.test(t);
          if (notK !== !king) a(`⑦ ${x}: 「${t}」 (${king ? 'the king moved' : 'not the king'})`);
          if (/駒がいて行き止まり|駒にぶつか/.test(t) && !(king && blocked(p, mFrom(m), mTo(m)))) a(`⑦ ${x}: 「${t}」 (nothing blocks the way to the edge)`); }
        else { if (/取れるけど|取れても|取れる手/.test(t) !== !!took) a(`⑦ ${x}: 「${t}」 (takes ${took})`);
          if (/取られ|はさまれ|ねらわれる|取り返され/.test(t) && !c2) a(`⑦ ${x}: 「${t}」 (nothing of yours can be taken next)`);
          if (/取り返され/.test(t)) a(`⑧ ${x}: 「${t}」 (nothing was taken to take back)`);
          if (c2 && !/取られ|はさまれ|ねらわれる/.test(t)) a(`⑦ ${x}: a piece of yours can be taken next, the words do not say it 「${t}」`); }
      }
    }); });
  return out;
}
// (2026-11-24 第2期) xiangqi: the basics in which a piece of the lesson's kind takes a piece that cannot be taken back (b_rook・b_horse・
// b_cannon・b_pawn). The goal set is read from the rules (a capture by that kind on which no legal move of the opponent can take back),
// the engine values stored in sc (= xiangqi/app.js problemPoints, the 3D XIANGQI.points) must put that capture alone on top, and
// ショウギツネ's words (atlas/lessons3d.js xqLsJa) are read back against the board for the answer and every wrong move.
const XQ_DONE = new Set(['b_rook', 'b_horse', 'b_cannon', 'b_pawn', 'b_mate1', 'm_mate2']);
function xiangqi(opt) {
  const fs = require('fs'), vm = require('vm');
  const E = require(path.join(ROOT, 'xiangqi/engine.js')), L = (opt && opt.lessons) || JSON.parse(fs.readFileSync(path.join(ROOT, 'xiangqi/lessons.json'), 'utf8'));
  const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'xiangqi/puzzles.json'), 'utf8')), OP = JSON.parse(fs.readFileSync(path.join(ROOT, 'xiangqi/openings.json'), 'utf8'));
  const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), app = fs.readFileSync(path.join(ROOT, 'xiangqi/app.js'), 'utf8');
  const ctx = { shSeed: s => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }, shPerm: (seed, n) => [...Array(n).keys()] };
  const X = vm.runInNewContext(src.slice(src.indexOf('  const XQN ='), src.indexOf('  const XIANGQI = {')) + '\n;({ xqLsJa, XQN, XQV })', ctx);
  const out = [], add = (id, j, m) => out.push({ step: id, q: j + 1, msg: m });
  // ⑨ the 2D and the 3D score the same way (the stored values, 20 points within 10 of the top)
  if (!/function problemPoints\(P, m\) \{\n  if \(P\.ok\) return P\.ok\.includes\(m\) \? 20 : 0;\n  const val = new Map\(P\.sc\), best = Math\.max\(\.\.\.P\.sc\.map\(e => e\[1\]\)\), mine = val\.has\(m\) \? val\.get\(m\) : -WIN;\n  if \(mine >= best - 10 /.test(app)) add('-', -1, '⑨ xiangqi/app.js problemPoints changed');
  if (!/points\(P, m\) \{   \/\/ = xiangqi\/app\.js problemPoints[\s\S]{0,400}if \(mine >= best - 10 /.test(src)) add('-', -1, '⑨ the 3D XIANGQI.points changed');
  const WIN = E.WIN, WINT = E.WINT, sOfV = v => v > WINT ? 0.9 + 0.1 * Math.min(1, 6 / (WIN - v + 1)) : v < -WINT ? -(0.9 + 0.1 * Math.min(1, 6 / (WIN + v + 1))) : v > WINT - 1000 ? 0.88 : v < -(WINT - 1000) ? -0.88 : Math.tanh(v / 450) * 0.82;
  const pts = (P, m) => { const val = new Map(P.sc), best = Math.max(...P.sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : -WIN;
    if (mine >= best - 10 && !(best > WINT && mine < best)) return 20; return Math.max(0, Math.round(20 * (1 - (sOfV(best) - sOfV(mine)) / 0.5))); };
  const KIND = { b_rook: 5, b_horse: 4, b_cannon: 6, b_pawn: 7 }, VAL = [0, 0, 2, 2, 4, 9, 4.5, 1], T = E.typeOf, C = E.colorOf, mTo = E.mTo, mFrom = E.mFrom;
  const takeBack = (p, m) => { const q = p.clone().play(m); return q.moves().some(x => mTo(x) === mTo(m)); };
  const caps = p => p.moves().filter(m => p.at(mTo(m)));
  // ⑤ the pool: every position of the lessons (problems and warm-ups), the openings' problems and the puzzles; mirrored too
  const brd = fen => { const a = []; for (const row of fen.split(' ')[0].split('/')) for (const ch of row) if (/\d/.test(ch)) for (let k = 0; k < +ch; k++) a.push('.'); else a.push(ch); return a; };
  const dist = (a, b) => { let d1 = 0, d2 = 0; for (let i = 0; i < 90; i++) { if (a[i] !== b[i]) d1++; const r = (i / 9) | 0, c = i % 9; if (a[i] !== b[r * 9 + 8 - c]) d2++; } return Math.min(d1, d2); };
  const pool = [];
  L.steps.forEach(st => { (st.problems || []).forEach((q, j) => pool.push([`${st.id} q${j + 1}`, brd(q.s)])); (st.ramp || []).forEach((r, j) => r.s && pool.push([`${st.id} ramp ${j + 1}`, brd(r.s)])); });
  OP.sets.forEach(g => (g.problems || []).forEach((q, j) => pool.push([`opening ${g.id} ${j + 1}`, brd(q.s)])));
  (PZ.themes || []).forEach(th => (th.puzzles || []).forEach((q, j) => pool.push([`puzzle ${th.id} ${j + 1}`, brd(q.s)])));
  const plain = t => String(t).replace(/<[^>]+>/g, '');
  L.steps.forEach((st, si) => { const id = st.id; if (!XQ_DONE.has(id) || !KIND[id]) return; const K = KIND[id];
    let prevD = -1, firstD = null; const capT = new Set();
    st.problems.forEach((P, j) => { const a = m => add(id, j, m), p = E.Pos.from(P.s), me = p.side, all = p.moves(), nm = m => E.name(p, m);
      // ⑨ every legal move has a value, once
      const sm = new Map(P.sc || []); if (sm.size !== (P.sc || []).length) a('⑨ a move is valued twice');
      all.forEach(m => { if (!sm.has(m)) a(`⑨ ${nm(m)} has no value`); }); (P.sc || []).forEach(([m]) => { if (!all.includes(m)) a(`⑨ a valued move ${m} is not legal`); });
      if (!all.includes(P.best)) { a('① the answer is not legal'); return; }
      // ① the goal set: captures by the lesson's piece that cannot be taken back
      const goal = caps(p).filter(m => T(p.at(mFrom(m))) === K && T(p.at(mTo(m))) !== E.KING && !takeBack(p, m));
      if (!goal.includes(P.best)) a(`① the answer ${nm(P.best)} is not a capture by the lesson's piece that cannot be taken back`);
      goal.filter(m => m !== P.best).forEach(m => a(`② ${nm(m)} also takes a piece that cannot be taken back`));
      // ① the engine: the answer alone on top; ② the next move is clearly worse (100 or more, and not 16 points)
      const S = P.sc.slice().sort((x, y) => y[1] - x[1]);
      if (S[0][0] !== P.best) a(`① the engine prefers ${nm(S[0][0])}`);
      else if (S.length > 1) { if (S[0][1] - S[1][1] < 100) a(`② the second move ${nm(S[1][0])} is only ${S[0][1] - S[1][1]} worse`); if (pts(P, S[1][0]) >= 16) a(`② the second move ${nm(S[1][0])} scores ${pts(P, S[1][0])}`); }
      if (Math.abs(S[0][1]) > WINT - 1000) a('④ a won / lost position (mate in the values)');
      // ③ not at a glance: wrong captures to be tempted by, and later a capture by the lesson's piece that is taken back
      const wrongCaps = caps(p).filter(m => m !== P.best && T(p.at(mTo(m))) !== E.KING);
      // (the trap: a capture taken back — by the lesson's piece; for the pawn, which loses little, any capture taken back at a loss)
      const trapK = wrongCaps.filter(m => takeBack(p, m) && (K === 7 ? VAL[T(p.at(mFrom(m)))] > VAL[T(p.at(mTo(m)))] : T(p.at(mFrom(m))) === K));
      if (all.length < 3) a(`③ ${all.length} legal moves`);
      if (!wrongCaps.length) a('③ the answer is the only capture on the board');
      if (j >= 2 && !trapK.length) a(`③ problem ${j + 1}: no capture that is taken back (the lesson's trap)`);
      // ④ the theme: a piece worth a horse's half or more, not the king; no free capture of as much by another piece
      const cv = VAL[T(p.at(mTo(P.best)))];
      if (cv < 2) a('④ the answer takes a pawn'); if (p.inCheck()) a('④ the mover is in check');
      caps(p).filter(m => m !== P.best && !takeBack(p, m) && VAL[T(p.at(mTo(m)))] >= cv && T(p.at(mTo(m))) !== E.KING).forEach(m => a(`④ ${nm(m)} takes as much for nothing`));
      capT.add(T(p.at(mTo(P.best))));
      // ⑤ no near twin (4 points or fewer apart, mirrored too)
      const B = brd(P.s); for (const [who, b] of pool) { if (who === `${id} q${j + 1}`) continue; const e = dist(B, b); if (e <= 4) a(`⑤ ${e} points from ${who}`); }
      // ⑥ easier first: the wrong captures (and the traps of the lesson's piece) grow
      const d = wrongCaps.length + trapK.length;
      if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d); if (firstD === null) firstD = d;
      if (j === st.problems.length - 1 && !(d > firstD)) a(`⑥ the last problem is no harder than problem 1 (d ${d} vs ${firstD})`);
      // ⑦⑧ the 3D words
      let W; try { W = X.xqLsJa(E, st, P, j, k => k === 'ok' ? '〈正〉' : '〈誤〉', si); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
      const NO = t => X.XQN(t, me ^ 1), N = t => X.XQN(t, me);
      for (const t of [W.ask, W.hintTx]) {
        if (/いくつか/.test(t) && caps(p).filter(m => T(p.at(mFrom(m))) === K).length < 2) a(`⑧ 「${t}」: the lesson's piece has fewer than two captures`);
        if (/馬の足|足がふさが/.test(t) && !p.pseudo(me, true).length) a(`⑧ 「${t}」`);
        if (/大きな駒/.test(t) && cv < 4) a(`⑧ 「${t}」: the answer takes a ${NO(T(p.at(mTo(P.best))))}`);
      }
      if (/馬の足/.test(W.ask)) { const f = mFrom(P.best), blocked = E.NMOV[f].some(([to, leg]) => p.at(leg) && p.at(to) && C(p.at(to)) !== me); if (!blocked) a(`⑧ 「${W.ask}」: no capture of the horse is blocked by its leg`); }
      const g = plain(W.good(P.best)), ac = NO(T(p.at(mTo(P.best))));
      if (/\{|undefined|NaN/.test(g)) a(`⑧ the praise 「${g}」`);
      if (!g.includes(ac)) a(`⑧ the praise 「${g}」 does not name the ${ac} taken`);
      for (const nme of ['車', '馬', '炮', '象', '相', '士', '仕', '卒', '兵']) if (nme !== ac && g.replace(/相手/g, '').includes(nme)) a(`⑧ the praise 「${g}」 names a ${nme}`);
      for (const u of all) { if (u === P.best) continue; const raw = plain(W.ng(u)), q = p.clone().play(u), x = nm(u), i1 = raw.indexOf('〈正〉'), t = i1 > 0 ? raw.slice(0, i1) : raw;
        if (/\{|undefined|NaN/.test(raw)) { a(`⑧ ${x}: 「${raw}」`); continue; }
        if (!raw.includes('〈誤〉') || !raw.includes('〈正〉')) a(`⑦ ${x}: the words do not name both moves 「${raw}」`);
        const took = !!p.at(mTo(u)), mine = new Set(); for (const r of q.moves()) { const v = q.at(mTo(r)); if (v && T(v) !== E.KING) mine.add(N(T(v))); }
        const lossT = t.match(/きみの(.)を取り返され|代わりに(.)を取られ|もっと大きい(.)を失う/);
        if (lossT) { const n2 = lossT[1] || lossT[2] || lossT[3]; if (!took || !takeBack(p, u) || N(T(p.at(mFrom(u)))) !== n2) a(`⑦ ${x}: 「${t}」 (no ${n2} of yours is taken back)`); }
        const hangT = t.match(/きみの(.)が取られちゃう|相手に(.)をねらわれる|(.)が取られる形が残る|(.)が相手の駒の利きに|(.)がただで取られそう/);
        if (hangT) { const n2 = hangT.slice(1).find(Boolean); if (!mine.has(n2)) a(`⑦ ${x}: 「${t}」 (no ${n2} of yours can be taken next)`); }
        if (/駒を取れない|取りそこね|取る手じゃない|取るチャンスが消え|手が届かない|見のがし/.test(t) && took) a(`⑦ ${x}: 「${t}」 (it does take)`);
        const small = t.match(/(.)取りは、(.)取りより得が小さい|で取れる(.)より、(.)のほうが大きい|だと(.)止まり/);
        if (small && (!took || VAL[T(p.at(mTo(u)))] >= cv)) a(`⑦ ${x}: 「${t}」 (it does not take less)`);
        // what happens must be said: a non-capture misses the free piece, a capture by the lesson's piece that is taken back says so
        if (!took && !/駒を取れない|取りそこね|取る手じゃない|取るチャンスが消え|手が届かない|見のがし|取られ|ねらわれ|利きに/.test(t)) a(`⑦ ${x}: the words do not say what is missed 「${t}」`);
        if (took && takeBack(p, u) && VAL[T(p.at(mFrom(u)))] > VAL[T(p.at(mTo(u)))] && !lossT) a(`⑦ ${x}: takes and is taken back at a loss, the words do not say it 「${t}」`);
      }
    });
    if (capT.size < 2) add(id, 4, `⑤ every answer takes the same kind of piece`);
  });
  // (2026-11-24 第2期) b_mate1「1手で詰ます」('ok' kind): the goal set = every move that gives check and leaves no reply (read from
  // the rules); no quiet move wins by stalemate (困毙: the lesson is about check); the warm-up's mate too; the order by the decoy
  // checks; ショウギツネ's words for every wrong move read back against the replies (taken / runs / blocked / no check).
  const MATE1 = ['b_mate1'];
  if (!/const right = u => P\.ok \? P\.ok\.includes\(u\)/.test(src)) add('-', -1, '⑨ the 3D right() for the ok kinds changed');
  if (!/function problemPoints\(P, m\) \{\n  if \(P\.ok\) return P\.ok\.includes\(m\) \? 20 : 0;/.test(app)) add('-', -1, '⑨ the 2D problemPoints for the ok kinds changed');
  const mates = p => p.moves().filter(m => { const q = p.clone().play(m); return q.inCheck() && !q.moves().length; });
  L.steps.forEach((st, si) => { const id = st.id; if (!XQ_DONE.has(id) || !MATE1.includes(id)) return;
    let prevD = -1, firstD = null; const tys = new Set();
    (st.ramp || []).forEach((r, j) => { if (!r.s) return; const p = E.Pos.from(r.s), M = mates(p).map(m => E.name(p, m, 'iccs')).sort();
      if (r.k === 'explain') { const mk = (r.marks || []).map(x => x[0]); if (!M.some(m => mk.includes(m.slice(0, 2)) && mk.includes(m.slice(2, 4)))) add(id, -1, `⑧ warm-up ${j + 1}: the marked move is not a mate`); }
      if (r.ok && JSON.stringify(r.ok.slice().sort()) !== JSON.stringify(M)) add(id, -1, `① warm-up ${j + 1}: ok ${r.ok} ≠ the mates ${M}`);
      if (p.moves().some(m => { const q = p.clone().play(m); return !q.inCheck() && !q.moves().length; })) add(id, -1, `④ warm-up ${j + 1}: a quiet move stalemates (not the lesson's check)`); });
    st.problems.forEach((P, j) => { const a = m => add(id, j, m), p = E.Pos.from(P.s), me = p.side, all = p.moves(), nm = m => E.name(p, m);
      if (!P.ok || !P.ok.length) { a('⑨ not an ok-kind problem'); return; }
      if (!P.ok.includes(P.best)) a('⑨ best is not in ok');
      P.ok.forEach(m => { if (!all.includes(m)) a(`① ${m} in ok is not legal`); });
      // ① ② the goal set = every mate (no other move wins on the spot)
      const M = mates(p), okS = new Set(P.ok);
      M.filter(m => !okS.has(m)).forEach(m => a(`② ${nm(m)} also mates, not in ok`));
      P.ok.filter(m => !M.includes(m)).forEach(m => a(`① ${nm(m)} in ok does not mate`));
      if (M.length > 2) a(`② ${M.length} mates: too many answers`);
      // ④ the theme: a check that cannot be met; no quiet stalemate; nobody in check before
      const stale = all.filter(m => { const q = p.clone().play(m); return !q.inCheck() && !q.moves().length; });
      stale.forEach(m => a(`④ ${nm(m)} wins by stalemate, not by check`));
      if (p.inCheck()) a('④ the mover is in check'); { const q = E.Pos.from(P.s.replace(/ [wb]$/, me ? ' w' : ' b')); if (q.inCheck()) a('④ the side not to move is in check'); }
      // ③ not at a glance: enough moves, and checks that do not mate
      const ck = all.filter(m => !okS.has(m) && p.clone().play(m).inCheck()), near = ck.filter(m => p.clone().play(m).moves().length <= 2);
      if (all.length < 12) a(`③ ${all.length} legal moves`); if (ck.length < 2) a(`③ ${ck.length} checks that do not mate`);
      M.forEach(m => tys.add(T(p.at(mFrom(m)))));
      // ⑤ no near twin (the pool: every lesson, warm-up, opening, puzzle; mirrored)
      const B = brd(P.s); for (const [who, b] of pool) { if (who === `${id} q${j + 1}`) continue; const e = dist(B, b); if (e <= 4) a(`⑤ ${e} points from ${who}`); }
      // ⑥ easier first: the decoy checks (and those leaving one or two replies)
      const d = ck.length + near.length;
      if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d); if (firstD === null) firstD = d;
      if (j === st.problems.length - 1 && !(d > firstD)) a(`⑥ the last problem is no harder than problem 1 (d ${d} vs ${firstD})`);
      // ⑦ ⑧ the 3D words
      let W; try { W = X.xqLsJa(E, st, P, j, k => k === 'ok' ? '〈正〉' : '〈誤〉', si); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
      const g = plain(W.good(P.best)); if (/\{|undefined|NaN/.test(g) || !/將|王手|詰/.test(g)) a(`⑧ the praise 「${g}」`);
      for (const t of [W.ask, W.hintTx]) if (/\{|undefined|NaN/.test(t)) a(`⑧ 「${t}」`);
      for (const u of all) { if (okS.has(u)) continue; const raw = plain(W.ng(u)), x = nm(u), i1 = raw.indexOf('〈正〉'), t = i1 > 0 ? raw.slice(0, i1) : raw;
        if (/\{|undefined|NaN/.test(raw)) { a(`⑧ ${x}: 「${raw}」`); continue; }
        if (!raw.includes('〈誤〉') || !raw.includes('〈正〉')) a(`⑦ ${x}: the words do not name both moves 「${raw}」`);
        const q = p.clone().play(u), rep = q.moves(), k = q.k[me ^ 1], to = mTo(u);
        if (q.inCheck()) {
          const take = /取られて終わ|そのまま取られる|ぱくっと取られ|取られて消え|ただで取られる/.test(t), run = /逃げられ|逃げ道が残って|空いている点へ動いて|逃げ出せる|逃げ場がまだ/.test(t), blk = /間に駒を入れ|はさんで防げ|合い駒|筋に駒を入れ|あいだをふさが/.test(t);
          if (!take && !run && !blk) a(`⑦ ${x}: a check that does not mate, the words do not say how it is met 「${t}」`);
          if (take && !rep.some(r => mTo(r) === to)) a(`⑦ ${x}: 「${t}」 (the checking piece cannot be taken)`);
          if (run && !rep.some(r => mFrom(r) === k)) a(`⑦ ${x}: 「${t}」 (the general cannot move)`);
          if (blk && !rep.some(r => mFrom(r) !== k && mTo(r) !== to)) a(`⑦ ${x}: 「${t}」 (nothing can block)`);
        } else {
          if (!/王手じゃない|王手にならず|おだやか|1手の余裕|1手もらって|詰みを防|詰まなくなる|逃げ道/.test(t)) a(`⑦ ${x}: not a check, the words do not say it 「${t}」`);
          if (!rep.some(r => !mates(q.clone().play(r)).length)) a(`⑦ ${x}: 「${t}」 (the opponent cannot stop the mate after it)`);
        }
      }
    });
    if (tys.size < 3) add(id, 4, `⑤ the mates use fewer than three kinds of piece (${[...tys]})`);
  });
  // (2026-11-24 第2期 担当A) m_mate2「2手で詰ます」('ok' kind): the goal set = every first move after which each reply leaves a
  // mate by check (read from the rules, every reply); no other first move wins in two by any means (stalemate 困毙 included: the
  // lesson is about mate), none wins at once; every reply to the answer is met by a mate by check (追6); 追1 the warm-up is not a
  // problem; 追27 the answers move two or more kinds of piece; ⑥ easier first by (quiet answer, replies to the answer, decoys);
  // ⑦⑧ ショウギツネ's words for every wrong first move read back against a reply that escapes; the hint and praise against the board.
  const MATE2 = ['m_mate2'], noMv = q => !q.moves().length, win1 = q => q.moves().some(x => noMv(q.clone().play(x)));
  const mate1 = q => q.moves().filter(x => { const z = q.clone().play(x); return z.inCheck() && noMv(z); });
  const m2info = p => p.moves().map(u => { const q = p.clone().play(u), R = q.moves(); if (!R.length) return { u, now: true, chk: q.inCheck(), R: 0, esc: [], escC: [] };
    const esc = [], escC = []; for (const r of R) { const z = q.clone().play(r); if (!win1(z)) esc.push(r); if (!mate1(z).length) escC.push(r); } return { u, q, chk: q.inCheck(), R: R.length, esc, escC }; });
  const kMoves = q => { const kk = q.k[q.side]; return q.moves().filter(x => mFrom(x) === kk).length; };
  L.steps.forEach((st, si) => { const id = st.id; if (!XQ_DONE.has(id) || !MATE2.includes(id)) return;
    const tys = new Set(); let prevK = null, firstK = null; const key = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
    const probS = new Set(st.problems.map(P => P.s.split(' ')[0]));
    (st.ramp || []).forEach((r, j) => { if (!r.s) return; const p = E.Pos.from(r.s), I = m2info(p), G = I.filter(x => !x.now && !x.escC.length).map(x => E.name(p, x.u, 'iccs')).sort();
      if (probS.has(r.s.split(' ')[0])) add(id, -1, `追1 warm-up ${j + 1} is problem ${[...st.problems].findIndex(P => P.s.split(' ')[0] === r.s.split(' ')[0]) + 1}`);
      if (I.some(x => x.now || (!x.esc.length && x.escC.length))) add(id, -1, `④ warm-up ${j + 1}: a first move wins at once or by stalemate`);
      if (G.length !== 1) add(id, -1, `② warm-up ${j + 1}: ${G.length} first moves mate in two`);
      if (r.k === 'explain') { const mk = (r.marks || []).map(x => x[0]); if (!G.some(m => mk.includes(m.slice(0, 2)) && mk.includes(m.slice(2, 4)))) add(id, -1, `⑧ warm-up ${j + 1}: the marked move is not the mate in two`); }
      if (r.ok && JSON.stringify(r.ok.slice().sort()) !== JSON.stringify(G)) add(id, -1, `① warm-up ${j + 1}: ok ${r.ok} ≠ ${G}`); });
    st.problems.forEach((P, j) => { const a = m => add(id, j, m), p = E.Pos.from(P.s), me = p.side, all = p.moves(), nm = m => E.name(p, m);
      if (!P.ok || !P.ok.length) { a('⑨ not an ok-kind problem'); return; }
      if (!P.ok.includes(P.best)) a('⑨ best is not in ok');
      const I = m2info(p), okS = new Set(P.ok), G = I.filter(x => !x.now && !x.escC.length), W = I.filter(x => x.now || !x.esc.length);
      P.ok.forEach(m => { if (!all.includes(m)) a(`① ${m} in ok is not legal`); else if (!G.some(x => x.u === m)) a(`① ${nm(m)} in ok: some reply escapes the mate by check`); });
      G.filter(x => !okS.has(x.u)).forEach(x => a(`② ${nm(x.u)} also mates in two, not in ok`));
      W.filter(x => !G.includes(x)).forEach(x => a(`④ ${nm(x.u)} wins ${x.now ? 'at once' : 'in two'} by stalemate (困毙), not by mate (追6)`));
      if (G.length > 1) a(`② ${G.length} first moves mate in two`);
      if (p.inCheck()) a('④ the mover is in check'); { const q = E.Pos.from(P.s.replace(/ [wb]$/, me ? ' w' : ' b')); if (q.inCheck()) a('④ the side not to move is in check'); }
      const ans = G.find(x => x.u === P.ok[0]); if (!ans) return;
      const ck = I.filter(x => x !== ans && x.chk).length, near = I.filter(x => x !== ans && x.esc.length <= 2).length;
      if (all.length < 12) a(`③ ${all.length} legal moves`); if (ck < 2) a(`③ ${ck} checks that do not mate in two`);
      tys.add(T(p.at(mFrom(ans.u))));
      const B = brd(P.s); for (const [who, b] of pool) { if (who === `${id} q${j + 1}`) continue; const e = dist(B, b); if (e <= 4) a(`⑤ ${e} points from ${who}`); }
      const K = [ans.chk ? 0 : 1, Math.min(ans.R, 9), ck + near];
      if (prevK && key(K, prevK) < 0) a(`⑥ easier than the problem before (${K} after ${prevK})`); if (!prevK || key(K, prevK) > 0) prevK = K; if (!firstK) firstK = K;
      if (j === st.problems.length - 1 && !(key(K, firstK) > 0)) a(`⑥ the last problem is no harder than problem 1`);
      let Wd; try { Wd = X.xqLsJa(E, st, P, j, k => k === 'ok' ? '〈正〉' : '〈誤〉', si); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
      const g = plain(Wd.good(P.best)); if (/\{|undefined|NaN/.test(g)) a(`⑧ the praise 「${g}」`);
      if (ans.chk ? /王手じゃなくても|静かな手|王手をかけずに/.test(g) : /王手で受け方|王手を受けた/.test(g)) a(`⑧ the praise does not match the answer (check ${ans.chk}) 「${g}」`);
      const shut = kMoves(ans.q) < kMoves(E.Pos.from(P.s.replace(/ [wb]$/, me ? ' w' : ' b')));
      for (const t of [g, Wd.hintTx]) if (/逃げ道を先にふさ|逃げ道になりそうな点を、先に消/.test(t) && (ans.chk || !shut)) a(`⑧ 「${t}」 but the answer does not take a square from the general`);
      for (const t of [Wd.ask, Wd.hintTx]) { if (/\{|undefined|NaN/.test(t)) a(`⑧ 「${t}」`); if (ans.chk && /静か|王手をかけなくて|王手はどれも受け/.test(t)) a(`追7 「${t}」 but the answer is a check`); if (!ans.chk && /王手をかけて|王手のあと|王手した駒|王手を受けた/.test(t)) a(`追7 「${t}」 but the answer is not a check`); }
      for (const x of I) { if (okS.has(x.u)) continue; const raw = plain(Wd.ng(x.u)), xn = nm(x.u), i1 = raw.indexOf('〈正〉'), t = i1 > 0 ? raw.slice(0, i1) : raw;
        if (/\{|undefined|NaN/.test(raw)) { a(`⑧ ${xn}: 「${raw}」`); continue; }
        if (!raw.includes('〈誤〉') || !raw.includes('〈正〉')) a(`⑦ ${xn}: the words do not name both moves 「${raw}」`);
        const tl = i1 > 0 ? raw.slice(i1) : '';   // (the answer's reason after the miss: the same facts as the praise)
        if (ans.chk ? /王手じゃなくても|静かな手|王手をかけずに/.test(tl) : /王手で受け方|王手を受けた/.test(tl)) a(`⑧ ${xn}: the answer's reason does not match it (check ${ans.chk}) 「${tl}」`);
        if (/どこへ逃げても/.test(tl) && !ans.q.moves().some(r => mFrom(r) === ans.q.k[me ^ 1])) a(`⑧ ${xn}: 「${tl}」 but the general cannot move after the answer`);
        if (/逃げ道を先にふさ/.test(tl) && (ans.chk || !shut)) a(`⑧ ${xn}: 「${tl}」 but the answer does not take a square from the general`);
        const k = x.q.k[me ^ 1], to = mTo(x.u), es = x.esc;
        const take = /取られて終わ|そのまま取られ|ぱくっと取られ|取られて消え|ただで取られる/.test(t), run = /逃げられ|逃げ道が残って|空いている点へ動いて|逃げ出せる|逃げ場がまだ|將が動いて|將が1歩動いて/.test(t), blk = /間に駒を入れ|はさんで防げ|合い駒|筋に駒を入れ|あいだをふさが/.test(t);
        const capd = /相手に(.+?)を取られて|きみの(.+?)が取られて/.exec(t), mvd = /相手の(.+?)が動いて受け|相手に(.+?)で守りの1手/.exec(t);
        if (x.chk && !take && !run && !blk) a(`⑦ ${xn}: a check, the words do not say how it is met 「${t}」`);
        if (!x.chk && !run && !capd && !mvd) a(`⑦ ${xn}: not a check, the words do not name the reply that escapes 「${t}」`);
        if (!x.chk && /王手/.test(t) && !/王手じゃない/.test(t)) a(`⑦ ${xn}: 「${t}」 (it is not a check)`);
        if (x.chk && /王手じゃない/.test(t)) a(`⑦ ${xn}: 「${t}」 (it is a check)`);
        if (!x.chk && /王手じゃないから/.test(t) && !ans.chk) a(`⑦ ${xn}: 「${t}」 (the answer is not a check either)`);
        if (take && !es.some(r => mTo(r) === to)) a(`⑦ ${xn}: 「${t}」 (no capture of the checking piece escapes the mate)`);
        if (run && !es.some(r => mFrom(r) === k)) a(`⑦ ${xn}: 「${t}」 (no move of the general escapes the mate)`);
        if (blk && !es.some(r => mFrom(r) !== k && mTo(r) !== to)) a(`⑦ ${xn}: 「${t}」 (no block escapes the mate)`);
        if (capd && !x.chk) { const nmC = capd[1] || capd[2]; if (!es.some(r => x.q.at(mTo(r)) && X.XQN(T(x.q.at(mTo(r))), me) === nmC)) a(`⑦ ${xn}: 「${t}」 (no reply taking a ${nmC} escapes)`); }
        if (mvd && !x.chk) { const nmM = mvd[1] || mvd[2]; if (!es.some(r => mFrom(r) !== k && !x.q.at(mTo(r)) && X.XQN(T(x.q.at(mFrom(r))), me ^ 1) === nmM)) a(`⑦ ${xn}: 「${t}」 (no quiet ${nmM} reply escapes)`); }
      }
    });
    if (tys.size < 2) add(id, 4, `追27 every answer moves the same kind of piece (${[...tys]})`);
  });
  return out;
}
// (2026-11-24 第2期) shogi: the strict ①〜⑨ of the verified steps (SH_DONE). k20「駒の動きと価値」(mode material): take the most
// valuable piece that can be taken. The goal set from the rules (every capture of the top piece), the stored candidates (every
// capture, its value), the engine (depth 3: the answer on top, every other move 250 or more worse), the pool (lessons.json problems
// and warm-ups of every step, tsume.json; mirrored too), the order (both the 2D and the 3D keep the pool's order) and ショウギツネ's
// words for every legal move.
const SH_DONE = new Set(['k20']);
function shogi(opt) {
  const fs = require('fs'), vm = require('vm');
  const E = require(path.join(ROOT, 'shogi/engine.js')), L = (opt && opt.lessons) || JSON.parse(fs.readFileSync(path.join(ROOT, 'shogi/lessons.json'), 'utf8'));
  const TS = JSON.parse(fs.readFileSync(path.join(ROOT, 'shogi/tsume.json'), 'utf8'));
  const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), app = fs.readFileSync(path.join(ROOT, 'shogi/index.html'), 'utf8');
  const out = [], add = (id, j, m) => out.push({ step: id, q: j + 1, msg: m });
  // ⑨ the 2D and the 3D score a material problem the same way (the stored value of the capture over the top one)
  const MAT = "if (P.mode === 'material' || P.mode === 'freq') { const best = P.cand[0][1], c = P.cand.find(x => x[0] === u); return c ? Math.round(PTS * c[1] / best) : 0; }";
  if (!app.includes(MAT.replace(/P\./g, 'pr.').replace(/\bu\)/g, 'usi)'))) add('-', -1, '⑨ shogi/index.html movePoints (material) changed');
  if (!src.includes(MAT)) add('-', -1, '⑨ the 3D SHOGI.points (material) changed');
  // ⑦ a wrong capture of a small piece (a few points) is not praised 「いい線！」 on the 3D table
  if (!src.includes("p.own ? (pts >= (id === 'shogi' ? 10 : 1) ? 'いい線！' : 'おしい！')")) add('-', -1, '⑦ the 3D says 「いい線！」 for a few points');
  // ⑥ both keep the pool's order (easy → hard) for the five problems drawn
  if (!/const probs = g\.rules \? g\.problems\.slice\(\) : shuffle\(\[\.\.\.std\.slice\(0, 5 - nTrap\), \.\.\.trap\.slice\(0, nTrap\)\]\)\.sort\(\(a, b\) => g\.problems\.indexOf\(a\) - g\.problems\.indexOf\(b\)\)/.test(app)) add('-', -1, '⑥ the 2D lesson does not keep the pool order');
  if (!/const probs = g\.rules \? pool : shuffle\(pool\)\.slice\(0, 5\)\.sort\(\(a, b\) => pool\.indexOf\(a\) - pool\.indexOf\(b\)\)/.test(src)) add('-', -1, '⑥ the 3D lesson does not keep the pool order');
  const ctx = { fill: (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v[k] != null ? v[k] : ''), SHOGI: { points: (P, u) => { const best = P.cand[0][1], c = P.cand.find(x => x[0] === u); return c ? Math.round(20 * c[1] / best) : 0; } } };
  const X = vm.runInNewContext(src.slice(src.indexOf('  const winP = (v, k) =>'), src.indexOf('  /* (2026-11-21 lesson loop) the shogi opening practice')) + '\n;({ shJaLesson, SH_KJ, SHJ2 })', ctx);
  const V = E.VALUE, T = E.typeOf, NM = ['', '歩', '香車', '桂馬', '銀', '角', '飛車', '金', '玉', 'と金', '成香', '成桂', '成銀', '馬', '竜'];
  const pos = sfen => { const p = new E.Position(); p.setSfen(sfen); return p; };
  const brd = sfen => { const a = []; for (const row of sfen.split(' ')[0].replace(/\+(.)/g, (_, c) => c === c.toUpperCase() ? '#' + c : '%' + c).split('/')) { let k = 0; const r = []; for (let i = 0; i < row.length; i++) { const ch = row[i]; if (/\d/.test(ch)) for (let n = 0; n < +ch; n++) r.push('.'); else if (ch === '#' || ch === '%') { r.push(ch + row[++i]); } else r.push(ch); } a.push(...r); } return a; };
  const dist = (a, b) => { let d1 = 0, d2 = 0; for (let i = 0; i < 81; i++) { if (a[i] !== b[i]) d1++; const r = (i / 9) | 0, c = i % 9; if (a[i] !== b[r * 9 + 8 - c]) d2++; } return Math.min(d1, d2); };
  const pool = [];
  L.grades.forEach(g => { g.problems.forEach((q, j) => pool.push([`${g.id} q${j + 1}`, brd(q.sfen)])); (g.ramp || []).forEach((r, j) => r.sfen && pool.push([`${g.id} ramp ${j + 1}`, brd(r.sfen)])); });
  (TS.sets || []).forEach(s => (s.problems || []).forEach((q, j) => q.sfen && pool.push([`tsume ${s.id} ${j + 1}`, brd(q.sfen)])));
  const plain = t => String(t).replace(/<[^>]+>/g, '');
  for (const g of L.grades) { const id = g.id; if (!SH_DONE.has(id)) continue;
    let prevD = -1; const pairs = new Map(), movers = new Set();
    const probs = g.problems.map(P => ({ P, kind: 'best', why: '', ng: null }));
    try { X.shJaLesson(g, probs); } catch (e) { add(id, -1, '⑧ the 3D words fail: ' + e.message); continue; }
    g.problems.forEach((P, j) => { const a = m => add(id, j, m), p = pos(P.sfen), ms = p.legalMoves(true), U = m => p.toUsi(m);
      if (P.kind !== 'best' || P.mode !== 'material') { a('④ not a material problem'); return; }
      if (p.inCheck()) a('④ the mover is in check');
      if (ms.length < 3) a(`③ ${ms.length} legal moves`);
      const caps = ms.filter(m => !E.isDrop(m) && p.board[E.mTo(m)]).map(m => ({ u: U(m), from: E.mFrom(m), to: E.mTo(m), t: T(p.board[E.mTo(m)]) }));
      // ⑨ the stored candidates are every capture with the taken piece's value, best first
      const cs = new Map(P.cand || []); if (cs.size !== (P.cand || []).length) a('⑨ a capture is listed twice');
      caps.forEach(c => { if (!cs.has(c.u)) a(`⑨ the capture ${c.u} is not in cand`); else if (cs.get(c.u) !== V[c.t]) a(`⑨ cand ${c.u} = ${cs.get(c.u)}, the piece is worth ${V[c.t]}`); });
      (P.cand || []).forEach(([u]) => { if (!caps.some(c => c.u === u)) a(`⑨ cand ${u} is not a capture`); });
      for (let k = 1; k < (P.cand || []).length; k++) if (P.cand[k][1] > P.cand[k - 1][1]) a('⑨ cand is not best first');
      // ④ every piece to take has the lesson's value (歩1・香3・桂4・銀5・金6・角8・飛10: no promoted piece, no king)
      caps.forEach(c => { if (c.t > 7 || c.t === 8) a(`④ ${c.u} takes a piece without a lesson value (type ${c.t})`); });
      const tg = new Map(); caps.forEach(c => { if (!tg.has(c.to) || V[c.t] > tg.get(c.to)) tg.set(c.to, V[c.t]); });
      const tv = [...tg.entries()].sort((x, y) => y[1] - x[1]);
      if (tv.length < 3) { a(`③ only ${tv.length} pieces can be taken`); return; }
      // ① the goal set: every capture of the top piece; ② a single top piece taken by a single piece, the next one worth 70% or less (× in the 2D, < 16 points)
      const goal = caps.filter(c => c.to === tv[0][0]).map(c => c.u).sort();
      if (goal.join() !== (P.accept || []).slice().sort().join()) a(`① accept ${P.accept} but the top capture is ${goal}`);
      if (tv[1][1] === tv[0][1]) a('② two pieces of the top value can be taken');
      else if (tv[1][1] > 0.7 * tv[0][1]) a(`② the second piece is worth ${tv[1][1]} against ${tv[0][1]} (${Math.round(20 * tv[1][1] / tv[0][1])} points)`);
      if (new Set(caps.filter(c => c.to === tv[0][0]).map(c => c.from)).size > 1) a('② two of your pieces can take the top piece');
      if ((P.pv || [])[0] !== P.accept[0]) a('⑧ pv[0] is not the answer');
      // ① the engine agrees: the answer on top, every other move 250 or more worse, no mate either way
      const r = new E.Searcher(p).analyze({ depth: 3, time: 60000 }), best = r[0].s, acc = new Set(P.accept);
      if (!acc.has(U(r[0].m))) a(`① the engine prefers ${U(r[0].m)} (${best})`);
      const near = r.filter(x => !acc.has(U(x.m)) && x.s > best - 250); if (near.length) a(`② close to the answer: ${near.map(x => U(x.m) + ' ' + (best - x.s)).join(', ')}`);
      if (Math.abs(best) > 20000) a('④ a mate in the values');
      // ⑤ no near twin (6 squares or fewer apart, mirrored too), and the same capture (mover → piece) at most twice in the step
      const B = brd(P.sfen); for (const [who, b] of pool) { if (who === `${id} q${j + 1}`) continue; const e = dist(B, b); if (e <= 6) a(`⑤ ${e} squares from ${who}`); }
      const mv = T(p.board[E.mFrom(p.fromUsi(P.accept[0]))]), key = mv + '>' + T(p.board[tv[0][0]]); pairs.set(key, (pairs.get(key) || 0) + 1); movers.add(mv);
      if (pairs.get(key) > 2) a(`⑤ the same capture (${key}) a third time`);
      // ⑥ easier first: d = pieces to take ×3 + legal moves / 8 + a long move (3+ squares) 4 + a knight 3 + pieces on the board / 2
      const u0 = P.accept[0], far = Math.max(Math.abs(+u0[0] - +u0[2]), Math.abs(u0.charCodeAt(1) - u0.charCodeAt(3))) >= 3;
      const d = tv.length * 3 + ms.length / 8 + (far ? 4 : 0) + (mv === E.KE ? 3 : 0) + P.sfen.split(' ')[0].replace(/[^A-Za-z]/g, '').length / 2;
      if (d < prevD) a(`⑥ easier than the problem before (d ${d.toFixed(1)} after ${prevD.toFixed(1)})`); prevD = Math.max(prevD, d);
      // ⑦⑧ the 3D words: the praise names the piece taken; every other legal move — what it takes (or that it takes nothing) and the answer's piece
      const Q = probs[j], top = NM[T(p.board[tv[0][0]])];
      for (const t of [Q.ask, Q.hintTx]) if (/\{|undefined|NaN/.test(t)) a(`⑧ 「${t}」`);
      const gd = plain(Q.good(P.accept[0]));
      if (/undefined|NaN|\{x\}/.test(gd) || !gd.includes(top)) a(`⑧ the praise 「${gd}」 does not name the ${top}`);
      for (const nm of NM.slice(1, 8)) if (nm !== top && !top.includes(nm) && gd.includes(nm)) a(`⑧ the praise 「${gd}」 names a ${nm}`);
      for (const m of ms) { const u = U(m); if (acc.has(u)) continue; const w = plain(Q.ng(u)), c = caps.find(x => x.u === u);
        if (/undefined|NaN/.test(w)) { a(`⑧ ${u}: 「${w}」`); continue; }
        if (!w.includes(top) || !w.includes('{m}')) a(`⑦ ${u}: the words do not name the answer and its ${top} 「${w}」`);
        if (c) { const x = NM[c.t]; if (!w.includes(x)) a(`⑦ ${u}: takes a ${x}, the words do not say so 「${w}」`); if (/取れない|取らない|駒得にならない|何も取れない|取っていない/.test(w)) a(`⑦ ${u}: it does take 「${w}」`); }
        else if (!/取れない|取らない|駒得にならない|何も取れない|取っていない/.test(w)) a(`⑦ ${u}: takes nothing, the words do not say so 「${w}」`); }
    });
    if (movers.size < 5) add(id, -1, `⑤ only ${movers.size} kinds of piece take`);
    // 追32 every kind of piece that can take in the problems and warm-ups (the moves the student has to read) has its move told in
    // the intro: the 3D (ショウギツネ's SHJ2.intro, the warm-ups) and the 2D (grade.intro.ja, the warm-ups) — the name and a move word
    // next to it; promoted pieces: 成 … 金と同じ, 馬, 龍. (k20: the 3D intro said only 「駒の動きは練習で見ていこう」 and the warm-ups showed the
    // rook, the bishop and the silver, while the answers move a lance, a knight, a gold, a king, a pawn and a horse.)
    const kinds = new Set(), MW = '[^。！？!?<]{0,14}?(前|横|斜め|ななめ|縦|まわり|周り|ジャンプ|跳|どこまでも)';
    const KW = { 1: ['歩'], 2: ['香'], 3: ['桂'], 4: ['銀'], 5: ['角'], 6: ['飛'], 7: ['金'], 8: ['玉'], 9: ['成', '金と同じ'], 10: ['成', '金と同じ'], 11: ['成', '金と同じ'], 12: ['成', '金と同じ'], 13: ['馬'], 14: ['龍'] };
    const scan = sfen => { const p = pos(sfen); p.legalMoves(true).forEach(m => { if (!E.isDrop(m) && p.board[E.mTo(m)]) kinds.add(T(p.board[E.mFrom(m)])); }); };
    g.problems.forEach(P => scan(P.sfen)); (g.ramp || []).forEach(r => r.k === 'try' && scan(r.sfen));
    const rampTx = (g.ramp || []).map(r => ['t', 'body', 'g', 'h', 'y'].map(f => r[f] && r[f].ja || '').join(' ')).join(' ');
    const said = { '3D': plain(String((X.SHJ2.intro || {})[id] || '')) + ' ' + plain(rampTx), '2D': plain((g.intro && g.intro.ja || []).join(' ')) + ' ' + plain(rampTx) };
    for (const [who, tx] of Object.entries(said)) for (const k of kinds) { const w = KW[k]; if (!w) continue;
      const ok = k >= 9 && k <= 12 ? w.every(x => tx.includes(x)) : new RegExp(w[0] + MW).test(tx);
      if (!ok) add(id, -1, `追32 the ${who} intro does not tell how the ${NM[k]} moves (a ${NM[k]} takes in the problems)`); }
    // 追14 the warm-ups: an explain's arrows from a sliding piece end on the farthest square it reaches (no free square beyond);
    // a try's words — the piece to move (「角で」), the piece to take (「金を取」), how many it can take (「取れる駒が2つ」), the praise
    // naming what was taken — agree with the board and the ok moves; a move that does what the words ask is in ok (else they say 成).
    (g.ramp || []).forEach((r, j) => { const a = m => add(id, -1, `追14 ramp ${j + 1}: ${m}`), p = pos(r.sfen), ms = p.legalMoves(true), U = m => p.toUsi(m), legal = new Set(ms.map(U));
      const sq = q => [+q[0], q.charCodeAt(1) - 96], nm = ([f, k]) => f + String.fromCharCode(96 + k);
      for (const [f0, t0] of r.arrows || []) { const A = sq(f0), B = sq(t0), df = Math.sign(B[0] - A[0]), dk = Math.sign(B[1] - A[1]);
        if (!legal.has(f0 + t0) && !legal.has(f0 + t0 + '+')) { a(`the arrow ${f0}→${t0} is not a move`); continue; }
        const pc = T(p.board[E.mFrom(p.fromUsi(f0 + t0) || p.fromUsi(f0 + t0 + '+'))]);
        if ([2, 5, 6, 13, 14].includes(pc) && Math.max(Math.abs(B[0] - A[0]), Math.abs(B[1] - A[1])) > 1 && !p.board[E.mTo(p.fromUsi(f0 + t0) || p.fromUsi(f0 + t0 + '+'))]) {
          const C = [B[0] + df, B[1] + dk]; if (C[0] >= 1 && C[0] <= 9 && C[1] >= 1 && C[1] <= 9 && (legal.has(f0 + nm(C)) || legal.has(f0 + nm(C) + '+'))) a(`the arrow ${f0}→${t0} stops short, the ${NM[pc]} reaches ${nm(C)}`); } }
      if (r.k !== 'try') return;
      const g0 = plain(r.g && r.g.ja || ''), y0 = plain(r.y && r.y.ja || ''), byN = NM.findIndex((x, i) => i && i <= 8 && g0.includes(x.slice(0, 1) + 'で')), tgN = NM.findIndex((x, i) => i && i <= 8 && new RegExp(x.slice(0, 1) + '[^で]{0,2}を取').test(g0));
      const caps = ms.filter(m => !E.isDrop(m) && p.board[E.mTo(m)] && (byN < 0 || T(p.board[E.mFrom(m)]) === byN));
      const mn = c => (c.match(/取れる駒が(\d)つ/) || [])[1];
      if (mn(g0) && new Set(caps.map(m => E.mTo(m))).size !== +mn(g0)) a(`「${g0}」 but ${new Set(caps.map(m => E.mTo(m))).size} pieces can be taken`);
      for (const u of r.ok) { const m = p.fromUsi(u); if (byN > 0 && T(p.board[E.mFrom(m)]) !== byN) a(`ok ${u} does not move the ${NM[byN]} 「${g0}」`); if (tgN > 0 && T(p.board[E.mTo(m)] || 0) !== tgN) a(`ok ${u} does not take the ${NM[tgN]} 「${g0}」`);
        const tk = p.board[E.mTo(m)] ? NM[T(p.board[E.mTo(m)])] : ''; if (tk && /を取っ/.test(y0) && !y0.includes(tk.slice(0, 1))) a(`the praise 「${y0}」 does not name the ${tk}`);
        if (/成っ|成る|成れ/.test(y0) && /成った|に成っ/.test(y0) && !u.endsWith('+')) a(`the praise says it promoted, ok ${u} does not`); }
      if (byN > 0 && tgN > 0) { const want = caps.filter(m => T(p.board[E.mTo(m)]) === tgN).map(U);
        const miss = want.filter(u => !r.ok.includes(u)); if (miss.length && !(/成/.test(g0) && miss.every(u => !u.endsWith('+')) && r.ok.every(u => u.endsWith('+')))) a(`${miss} does what 「${g0}」 asks but is judged wrong`); }
    });
  }
  return out;
}
// (2026-11-24 第2期・担当B) shogi openings (<game>/open): the strict ①〜⑨ of the verified sets (SHO_DONE) — the game-based problems
// "which move do strong players play most here?" (mode freq; the pool is curated by shogi/tools/openings/curate.js). Checked here on
// their own: ① the answer is the most played move and the site's engine (depth 8, NNUE) puts it within 150 of its best; ② it is
// played 12 times or more and the second move 60% of it or less (≤ 12 of 20 points: never 「正解」 in the 2D or the 3D); ③ 3+ legal
// moves and 2+ stored candidates; ④ the set's own pattern holds (src pat, mirrored when the strategy is Gote's) and the mover is the
// strategy's side, not in check; ⑤ 5 squares or more from every other problem of the shogi lessons, warm-ups and openings, one answer
// at most twice; ⑥ the pool easy → hard (d = squares changed from the start + 20 × second / first) and both the 2D and the 3D keep
// the pool's order; ⑦⑧ ショウギツネ's words (shOpJa) at every position in the lesson for the answer and every other legal move: the
// side and the name in the question, the percentages from the stored counts, and each claim about the board checked on the board
// (swing names, the bishop's line opened / shut, captures, recaptures, king moves, edge pawns, a piece left to be taken: the opponent
// wins material at once by SEE and the engine puts the move 100+ below the answer); ⑨ the 2D and the 3D score a freq problem alike.
const SHO_DONE = new Set(['nakabisha', 'mukai', 'migishiken']);
let shoW = null;
function shogiOpen(opt) {
  const fs = require('fs'), vm = require('vm');
  const E = require(path.join(ROOT, 'shogi/engine.js')), CU = require(path.join(ROOT, 'shogi/tools/openings/curate.js'));
  if (!shoW) shoW = require(path.join(ROOT, 'shogi/tools/openings/wasm-engine.js')).loadSync();
  const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), app = fs.readFileSync(path.join(ROOT, 'shogi/index.html'), 'utf8');
  const CATS = ['beg', 'mid', 'adv', 'sp', 'new', 'castle'], sets = [];
  CATS.forEach(c => JSON.parse(fs.readFileSync(path.join(ROOT, `shogi/openings-${c}.json`), 'utf8')).sets.forEach(s => sets.push(s)));
  JSON.parse(fs.readFileSync(path.join(ROOT, 'shogi/openings.json'), 'utf8')).sets.forEach(s => { if (!sets.some(x => x.id === s.id)) sets.push(s); });
  if (opt && opt.sets) opt.sets.forEach(s => { const i = sets.findIndex(x => x.id === s.id); if (i >= 0) sets[i] = s; });
  const SRC = {}; CATS.forEach(c => require(path.join(ROOT, `shogi/tools/openings/src/${c}.js`)).forEach(e => { SRC[e.id] = e; }));
  const L = JSON.parse(fs.readFileSync(path.join(ROOT, 'shogi/lessons.json'), 'utf8'));
  const out = [], add = (id, j, m) => out.push({ step: id, q: j + 1, msg: m });
  // ⑨ the same scoring; ⑥ the pool's order in both
  const MAT = "if (P.mode === 'material' || P.mode === 'freq') { const best = P.cand[0][1], c = P.cand.find(x => x[0] === u); return c ? Math.round(PTS * c[1] / best) : 0; }";
  if (!app.includes(MAT.replace(/P\./g, 'pr.').replace(/\bu\)/g, 'usi)'))) add('-', -1, '⑨ shogi/index.html movePoints (freq) changed');
  if (!src.includes(MAT)) add('-', -1, '⑨ the 3D SHOGI.points (freq) changed');
  if (!app.includes('const probs = shuffle(g.problems.map((p, i) => i)).slice(0, 5).sort((a, b) => a - b).map(i => g.problems[i]);')) add('-', -1, '⑥ the 2D opening practice does not keep the pool order');
  if (!src.includes('shuffle(s.problems.map((p, i) => i))).slice(0, 5).sort((a, b) => a - b).map(i => s.problems[i])')) add('-', -1, '⑥ the 3D opening practice does not keep the pool order');
  const X = vm.runInNewContext(src.slice(src.indexOf('  const winP = (v, k) =>'), src.indexOf('  const SHOGI = {')) + '\n;({ shOpJa, shOpVoice })', { fill: (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v[k] != null ? v[k] : ''), console });
  const pool = [];
  sets.forEach(s => (s.problems || []).concat(s.lineProbs || []).forEach((p, j) => pool.push([s.id, j, CU.brd(p.sfen)])));
  L.grades.forEach(g => { g.problems.forEach((p, j) => pool.push([g.id, j, CU.brd(p.sfen)])); (g.ramp || []).forEach((r, j) => r.sfen && pool.push([g.id + ' ramp', j, CU.brd(r.sfen)])); });
  const S0 = CU.brd('lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1');
  const plain = t => String(t).replace(/<[^>]+>/g, '');
  const NM = { 1: '歩', 2: '香', 3: '桂', 4: '銀', 5: '角', 6: '飛車', 7: '金', 8: '玉' };
  for (const s of sets) { const id = s.id; if (!SHO_DONE.has(id)) continue;
    const e = SRC[id], P0 = s.problems || [], side = e.side === 'w' ? 1 : 0, C0 = CU.compile(e.pat, false), C1 = e.mirror ? CU.compile(e.pat, true) : null;
    if (P0.length < 5) add(id, -1, `③ ${P0.length} problems in the pool (5 are drawn)`);
    let prevD = -1; const ans = new Map(), nm = String(s.title.ja), VO = X.shOpVoice(id), hs = id.length * 3;
    P0.forEach((P, j) => { const a = m => add(id, j, m), p = new E.Position(); p.setSfen(P.sfen); const ms = p.legalMoves(true), U = m => p.toUsi(m), legal = new Set(ms.map(U));
      const C = P.cand || [], A = (P.accept || [])[0];
      // ① ② ③
      if (P.kind !== 'best' || P.mode !== 'freq') { a('① not a freq problem'); return; }
      if ((P.accept || []).length !== 1 || A !== (C[0] || [])[0] || (P.pv || [])[0] !== A) a(`① accept ${P.accept} / pv ${P.pv} is not the most played ${(C[0] || [])[0]}`);
      C.forEach(([u, n], k) => { if (!legal.has(u)) a(`① candidate ${u} is not legal`); if (k && n > C[k - 1][1]) a('① cand is not most played first'); });
      const n1 = (C[0] || [0, 0])[1], n2 = (C[1] || [0, 0])[1], tot = P.total || C.reduce((x, c) => x + c[1], 0);
      if (C.reduce((x, c) => x + c[1], 0) > tot) a('⑧ the total is below the counts');
      const r = shoW.analyze(P.sfen, { depth: 8 }), sc = u => (r.find(x => x.usi === u) || { s: -1e9 }).s, best = r[0].s;
      if (best - sc(A) > 150) a(`① the engine puts the answer ${best - sc(A)} below its best ${r[0].usi}`);
      if (n1 < 12) a(`② played only ${n1} times`);
      if (n2 > 0.6 * n1) a(`② the second move is played ${n2} times against ${n1} (${Math.round(20 * n2 / n1)} points)`);
      if (ms.length < 3) a(`③ ${ms.length} legal moves`);
      if (C.length < 2) a('③ a single candidate');
      // ④
      const m0 = CU.match(p, C0), m1 = C1 && CU.match(p, C1), strat = m0 && !m1 ? side : m1 && !m0 ? 1 - side : -1;
      if (strat < 0) a(`④ the pattern of 『${nm}』 does not hold (or holds both ways)`); else if (strat !== p.side) a('④ the mover is not the strategy side');
      if (p.inCheck()) a('④ the mover is in check');
      // ⑤
      const B = CU.brd(P.sfen);
      for (const [w, k, b] of pool) { if (w === id && k === j) continue; const d = CU.dist(B, b); if (d <= 4) a(`⑤ ${d} squares from ${w} ${k + 1}`); }
      ans.set(A, (ans.get(A) || 0) + 1); if (ans.get(A) === 3) a(`⑤ the answer ${A} a third time`);
      // ⑥
      const d = CU.dist(B, S0) + 20 * n2 / n1; if (d < prevD) a(`⑥ easier than the problem before (d ${d.toFixed(1)} after ${prevD.toFixed(1)})`); prevD = Math.max(prevD, d);
      // ⑦⑧ the words at every place in the lesson
      const N = tot || 1, pc = c => Math.max(1, Math.round(c / N * 100)), cnt = new Map(C);
      const facts = u => { const q = new E.Position(); q.setSfen(P.sfen); const m = q.fromUsi(u), drop = E.isDrop(m), fr = drop ? -1 : E.mFrom(m), to = E.mTo(m), pt = drop ? E.dropType(m) : E.typeOf(q.board[fr]), cap = q.board[to];
        const bish = x => { let n = 0; for (const mm of x.legalMoves(true)) if (!E.isDrop(mm) && [5, 13].includes(E.typeOf(x.board[E.mFrom(mm)]))) n++; return n; };
        const nullSide = x => { const y = new E.Position(); y.setSfen(x.sfen().replace(/ [bw] /, ` ${q.side ? 'w' : 'b'} `)); return y; };
        const b0 = bish(q); q.doMove(m); const b1 = bish(nullSide(q));
        let win = 0; for (const mm of q.legalMoves(true)) if (!E.isDrop(mm) && q.board[E.mTo(mm)]) win = Math.max(win, q.see(mm));
        const file = 9 - to % 9, rank = ((to / 9) | 0) + 1, sfile = q.side ? file : 10 - file;   // (q.side: the opponent now; sfile counted from the mover's right)
        const fw = drop ? 0 : (p.side ? 1 : -1) * (((to / 9) | 0) - ((fr / 9) | 0)), n = drop ? 0 : Math.max(Math.abs(((to / 9) | 0) - ((fr / 9) | 0)), Math.abs(to % 9 - fr % 9));
        return { pt, drop, cap: !!cap, fr, to, b0, b1, win, file: p.side ? 10 - file : file, rank, horiz: !drop && ((fr / 9) | 0) === ((to / 9) | 0), loss: sc(A) - sc(u), dir: drop ? '' : fw > 0 ? 'up' : fw < 0 ? 'back' : 'side', n };
      };
      const FA = facts(A);
      for (let i = 0; i < 5; i++) {
        let Q; try { Q = X.shOpJa({ pos: P.sfen, kind: 'best', P, ans: A }, nm, hs, i, false, VO); } catch (er) { a(`⑧ the 3D words fail: ${er.message}`); break; }
        const who = p.side ? '☖後手' : '☗先手', ask = plain(Q.ask);
        if (/\{|undefined|NaN/.test(ask) || (/先手|後手/.test(ask) && !ask.includes(who))) a(`⑧ the question 「${ask}」`);
        if (/『/.test(ask) && !ask.includes(`『${nm}』`)) a(`⑧ the question names another opening 「${ask}」`);
        const claims = (t, F, who2) => { const w = plain(t), bad = m => a(`⑦ ${who2}: ${m} 「${w}」`);
          if (/\{(?![mx]\})|undefined|NaN/.test(w)) bad('a placeholder');
          const sw = w.match(/「(中飛車|四間飛車|三間飛車|向かい飛車|袖飛車)」/); if (sw && !(F.pt === 6 && F.horiz && { 中飛車: 5, 四間飛車: 6, 三間飛車: 7, 向かい飛車: 8, 袖飛車: 3 }[sw[1]] === F.file)) bad(`not a swing to ${sw[1]}`);
          return w; };
        const g = claims(Q.good(A), FA, 'the answer');
        const pcs = [...g.matchAll(/(\d+)%/g)].map(x => +x[1]); if (!pcs.length || pcs.some(x => x !== pc(n1))) a(`⑧ the praise gives ${pcs.join('/') || 'no'}% (the answer is ${pc(n1)}%) 「${g}」`);
        if (/角道を(開け|開く|通す)|角道が開/.test(g) && !(FA.b1 > FA.b0 + 1)) a(`⑦ the answer: the bishop's line is not opened 「${g}」`);
        if (/取る手|取り返|いただく/.test(g) && !FA.cap) a(`⑦ the answer takes nothing 「${g}」`);
        { // 追41: the answer moves a piece the opponent could win (SEE > 0 if it stayed), to a square where it cannot be won — the praise says so, and only then
          const hit = (sf, side, sq) => { const y = new E.Position(); y.setSfen(sf.replace(/ [bw] /, ` ${side ? 'w' : 'b'} `)); return y.legalMoves(true).some(mm => !E.isDrop(mm) && E.mTo(mm) === sq && y.see(mm) > 0); };
          const qa = new E.Position(); qa.setSfen(P.sfen); qa.doMove(qa.fromUsi(A));
          const flee = !FA.drop && !FA.cap && hit(P.sfen, 1 - p.side, FA.fr) && !hit(qa.sfen(), 1 - p.side, FA.to);
          if (flee && !/ねらわれ|取られそう|逃げ|かわ/.test(g)) a(`追41 the answer moves a threatened piece away, the praise does not say so 「${g}」`);
          if (!flee && /ねらわれていた|ねらわれた/.test(g)) a(`追41 the praise says a piece was threatened 「${g}」`); }
        if (/打つ手|打って/.test(g) && !FA.drop) a(`⑦ the answer is not a drop 「${g}」`);
        if (/玉を(飛車と反対|囲い|安全|戦い)|玉が/.test(g) && FA.pt !== 8) a(`⑦ the answer is not a king move 「${g}」`);
        // the way the answer's piece went (not for a knight's jump or a drop)
        const dirBad = (t, F) => F.dir && F.pt !== 3 && ((/横へずら|横に/.test(t) && F.dir !== 'side') || (/引い|引く/.test(t) && F.dir !== 'back') || (/上げ|上が|前へ|前に(出|進)|進め|持ちあげ/.test(t) && F.dir !== 'up') || (/一つずら|一つ上げ|一つ進め|一段|一歩/.test(t) && F.n !== 1));
        { const gm = g.replace(/(強い人|実戦|この場面)[^。！]*[。！]/g, ''); if (dirBad(gm, FA)) a(`⑦ the answer went ${FA.dir} ${FA.n}: 「${g}」`); }
        for (const mv of ms) { const u = U(mv); if (u === A) continue; const F = facts(u), w = claims(Q.ng(u), F, u);
          if (!w.includes('{m}') && !w.includes('{x}')) a(`⑦ ${u}: names neither the answer nor yours 「${w}」`);
          const mine = cnt.has(u) ? cnt.get(u) : null, pp = [...w.matchAll(/(\d+)%/g)].map(x => +x[1]);
          if (pp.length && (mine == null ? true : !pp.includes(pc(mine)) || pp.some(x => x !== pc(mine) && x !== pc(n1)))) a(`⑧ ${u}: the percentages ${pp} (yours ${mine == null ? '—' : pc(mine)}%, the answer ${pc(n1)}%) 「${w}」`);
          if (/(取られ)/.test(w) && !/取り返/.test(w) && !(F.win > 0 && F.loss >= 100)) a(`⑦ ${u}: no piece is lost at once (SEE ${F.win}, the engine ${F.loss} below) 「${w}」`);
          if (/取り返しそびれ/.test(w) && !(FA.cap && !F.cap)) a(`⑦ ${u}: not a missed recapture 「${w}」`);
          for (const seg of w.split(/[。！]/)) if (/\{m\}(なら|だと|は)/.test(seg) && /が前に出て|が前へ出て|を前に進めて|を引いて、|を横に寄せて|を横に動かして/.test(seg) && dirBad(seg.replace(/^.*\{m\}(なら|だと|は)/, ''), FA)) a(`⑦ ${u}: the answer went ${FA.dir} 「${w}」`);
          if (/\{x\}は角道を止め/.test(w) && !(F.b1 < F.b0 - 1)) a(`⑦ ${u}: does not shut the bishop's line 「${w}」`);
          if (/\{x\}は玉を/.test(w) && F.pt !== 8) a(`⑦ ${u}: not a king move 「${w}」`);
          if (/\{x\}の端歩/.test(w) && !(F.pt === 1 && (F.file === 1 || F.file === 9))) a(`⑦ ${u}: not an edge pawn 「${w}」`);
          if (/\{x\}で飛車を動かす|\{x\}は飛車をうろうろ/.test(w) && F.pt !== 6) a(`⑦ ${u}: not a rook move 「${w}」`);
        }
      }
    });
  }
  // 追25 / 追30 over every freq problem of every shogi opening (the words are shared by all sets): the record (probs.js) keeps every move
  // played 3 times or more, so a move outside it was played at most min(2, games left over) times — "hardly played" only when that is
  // under 3%, "never played" only when no game is left over, the stated counts the same; and the games are Floodgate's (strong programs,
  // rated 3000+), so no line may say "strong people" / "n% of people" / "popular" about them.
  const PEOPLE = /強い人|%の人|の人が|の人は|選ぶ人|指す人|人も|人は|人気|プロ|棋士|愛好家/;
  for (const s of sets) { const nm = String(s.title.ja), VO = X.shOpVoice(s.id), hs = s.id.length * 3;
    (s.problems || []).forEach((P, j) => { if (P.mode !== 'freq') return; const a = m => add(s.id, j, m), C = P.cand || [], A = (P.accept || [])[0];
      const sum = C.reduce((x, c) => x + c[1], 0), N = P.total || sum, rest = N - sum, k2 = Math.min(2, Math.max(0, rest)), cnt = new Map(C);
      if (C.some(c => c[1] < 3) || sum > N || P.total == null) { a(`追25 the record is not as collected (every move 3+ times, the total kept): ${JSON.stringify(C)} / ${P.total}`); return; }
      const p = new E.Position(); p.setSfen(P.sfen); const ms = p.legalMoves(true).map(m => p.toUsi(m));
      for (let i = 0; i < 5; i++) { let Q; try { Q = X.shOpJa({ pos: P.sfen, kind: 'best', P, ans: A }, nm, hs, i, false, VO); } catch (er) { a(`⑧ the 3D words fail: ${er.message}`); break; }
        const T = [['the question', plain(Q.ask)], ['the hint', plain(Q.hintTx || '')], ['the answer', plain(Q.good(A))]];
        for (const u of ms) if (u !== A) T.push([u, plain(cnt.has(u) ? Q.good(u) + ' / ' + Q.ng(u) : Q.ng(u))]);
        for (const [who, w] of T) { if (PEOPLE.test(w)) a(`追30 ${who}: the games are strong programs' (Floodgate), not people's 「${w}」`);
          if (who.length < 6 && !cnt.has(who)) {   // (a move outside the record)
            if (/ほとんど指されない|ほとんどない|めったに|ほとんど出てこない/.test(w) && !(k2 / N < 0.03)) a(`追25 ${who}: "hardly played" but it may be played ${k2} of ${N} (${Math.round(k2 / N * 100)}%) 「${w}」`);
            if (/一度も|一つもない|どれにも出てこない|指されない手なの|では指されない手/.test(w) && rest !== 0) a(`追25 ${who}: "never played" but ${rest} games are outside the record 「${w}」`);
            const mk = w.match(/(\d+)局のうち、?多くても(\d+)局|(\d+)局で多くても(\d+)局/); if (mk && (+(mk[1] || mk[3]) !== N || +(mk[2] || mk[4]) !== k2)) a(`追25 ${who}: the counts ${mk[0]} (N ${N}, at most ${k2})`);
            const mn = w.match(/(\d+)局(で一度も|に一つも|では一度も|のどれにも)/); if (mn && +mn[1] !== N) a(`追25 ${who}: ${mn[1]} games, the record has ${N}`); } }
      }
    });
  }
  return out;
}
// (2026-11-24 第2期・担当B) tafl openings (tafl/openings.json, <game>/open): the plans of TFO_DONE (sets marked verified), every problem
// with the engine (engine.wasm values(): exact values of every move, a full window each, deterministic) and the rules (tafl/engine.js):
// ① the stored P.sc is the depth-6 values again (move by move) and P.best is on top; ② the moves scored 20 (= problemPoints) are the
// same 1 to 3 at depth 5 and 6, the best of the rest 12 points or less at both; ③ 3+ legal moves, P.sc scores every legal move, at most
// a third of them right; ④ P.mv replays from the start to the position, begins with the plan's own moves and the plan's side moves, the
// game not decided (|v| < 2000), no win at once; ⑤ 5 squares or more (8 symmetries) from every other tafl problem (lessons, warm-ups,
// puzzles, the other openings), one answer at most twice and one kind of move (tfFacts) at most 3 times in a plan; ⑥ the pool easy →
// hard (d = plies + points of the best wrong move) and both the 2D and the 3D keep the pool's order; ⑦⑧ タフリン's words (tfOpJaV) at
// every place in the lesson for the answer and every wrong move: the side and the plan in the question, each claim checked on the board
// (captures, a piece left to be sandwiched, the king let out / caught, the king's room in numbers, the corner guard, a capture threat),
// the generic "it lacks that" only when the move is of another kind, and never a line without a reason; ⑨ the 2D and the 3D score alike.
let tfoX = null;
function taflOpen(opt) {
  const fs = require('fs'), vm = require('vm');
  const E = require(path.join(ROOT, 'tafl/engine.js')), CU = require(path.join(ROOT, 'tafl/tools/curate_openings.js'));
  const OP = (opt && opt.op) || JSON.parse(fs.readFileSync(path.join(ROOT, 'tafl/openings.json'), 'utf8'));
  const L = JSON.parse(fs.readFileSync(path.join(ROOT, 'tafl/lessons.json'), 'utf8')), PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'tafl/puzzles.json'), 'utf8'));
  const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), app = fs.readFileSync(path.join(ROOT, 'tafl/app.js'), 'utf8');
  const out = [], add = (id, j, m) => out.push({ step: id, q: j + 1, msg: m });
  if (!tfoX) { const sl = (a, b) => src.slice(src.indexOf(a), src.indexOf(b)), line = a => src.slice(src.indexOf(a)).split('\n')[0] + '\n';
    tfoX = vm.runInNewContext(line('  const shSeed = ') + line('  const shPerm = ') + sl('  const xqSn = ', '  const xqJoin = ') + line('  const xqJoin = ') + sl('  const TFM = ', '  /* (2026-11-21 lesson loop) the tafl lessons in') + '\n;({ tfOpJaV, tfOpVoice, tfFacts, TFM })', {}); }
  const X = tfoX;
  // ⑨ ⑥ the scoring and the order, 2D and 3D
  const PTS = "const val = new Map(P.sc), best = Math.max(...P.sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : -WIN;";
  if (!app.includes('function problemPoints(P, m) {') || !app.includes(PTS) || !src.includes(PTS)) add('-', -1, '⑨ the 2D problemPoints / the 3D TAFL.points changed');
  if (!app.includes('const pool = idx.slice(0, 5).sort((a, b) => a - b).map(i => g.problems[i]);')) add('-', -1, '⑥ the 2D opening practice does not keep the pool order');
  if (!src.includes('const probs = shuffle((g.problems || []).map((p, i) => i)).slice(0, 5).sort((a, b) => a - b).map(i => g.problems[i])')) add('-', -1, '⑥ the 3D opening practice does not keep the pool order');
  const n = 11, SYM = [(r, c) => [r, c], (r, c) => [r, 10 - c], (r, c) => [10 - r, c], (r, c) => [10 - r, 10 - c], (r, c) => [c, r], (r, c) => [c, 10 - r], (r, c) => [10 - c, r], (r, c) => [10 - c, 10 - r]];
  const dist = (a, b) => { let best = 99; for (const S of SYM) { let d = 0; for (let i = 0; i < 121 && d < best; i++) { const [r, c] = S((i / 11) | 0, i % 11); if (a[i] !== b[r * 11 + c]) d++; } best = Math.min(best, d); } return best; };
  const pool = [];
  L.steps.forEach(st => { (st.problems || []).forEach((q, j) => pool.push([`${st.id} q${j + 1}`, q.s.b])); if (st.diagram) pool.push([`${st.id} diagram`, st.diagram.s.b]); (st.ramp || []).forEach((r, j) => r.s && pool.push([`${st.id} ramp ${j + 1}`, r.s.b])); });
  (PZ.themes || []).forEach(th => (th.puzzles || []).forEach((q, j) => pool.push([`puzzle ${th.id} ${j + 1}`, q.s.b])));
  OP.sets.forEach(g => (g.problems || []).forEach((q, j) => pool.push([`open ${g.id} q${j + 1}`, q.s.b])));
  const BLOCK = new Set([2, 12, 22, 8, 20, 32, 88, 100, 112, 98, 108, 118]), F0 = E.geo('copenhagen').F;
  const flip = (p, s) => { const q = p.clone(); q.turn = s; q.rehash(); return q; };
  const maxCap = q => { let c = 0; if (q.res) return 0; for (const r of q.moves()) c = Math.max(c, q.clone().play(r).lastCaps.length); return c; };
  const winsNow = q => !q.res && q.moves().some(r => q.clone().play(r).res === q.turn);
  const kRoom = q => q.king < 0 ? 0 : flip(q, 2).moves().filter(x => E.mFrom(x) === q.king).length;
  const tgt = (p, m) => { const q = p.clone().play(m); if (q.res) return 0; const f = flip(q, p.turn), T = new Set(); for (const r of f.moves()) for (const c of f.clone().play(r).lastCaps) T.add(c); return T.size; };
  const plain = t => String(t).replace(/\u0001緑の印の手\u0002/g, '{m}').replace(/\u0001赤い印の手\u0002/g, '{x}');
  for (const g of OP.sets) { if (!g.verified) continue; const id = g.id, P0 = g.problems || [], nm = String(g.title.ja), side = g.side, sideJ = side === 1 ? '攻め手' : '守り手';
    if (P0.length < 5) add(id, -1, `③ ${P0.length} problems in the pool (5 are drawn)`);
    let prevD = -1; const ans = new Map(), kinds = new Map();
    { let q = E.Pos.from(null, 'copenhagen'); const defs = g.moves.split(' ');   // ⑧ the study line: legal, from the plan's own moves, and another plan's line is not the same
      g.study.line.forEach((m, k) => { if (!q || q.res || !q.moves().includes(m)) { if (q) add(id, -1, `⑧ the line's move ${k + 1} is not legal`); q = null; return; } if (k < defs.length && E.name(q, m).replace(/x.*/, '') !== defs[k]) add(id, -1, `⑧ the line does not begin with ${g.moves}`); q = q.clone().play(m); });
      OP.sets.forEach(o => { if (o !== g && o.study.line.join() === g.study.line.join()) add(id, -1, `⑤ the same line as ${o.id}`); }); }
    P0.forEach((P, j) => { const a = m => add(id, j, m), p = E.Pos.from(P.s), all = p.moves(), me = p.turn;
      // ④ the way there
      const pre = (P.mv || []), defs = g.moves.split(' ');
      { let q = E.Pos.from(null, 'copenhagen'); let bad = !pre.length; pre.forEach((m, k) => { if (bad) return; if (!q.moves().includes(m)) bad = true; else { if (k < defs.length && E.name(q, m).replace(/x.*/, '') !== defs[k]) bad = true; q = q.clone().play(m); } });
        if (bad || pre.length < defs.length) a('④ P.mv does not replay from the plan\'s own moves'); else if (q.spec().b !== P.s.b || q.turn !== me) a('④ P.mv does not reach the position'); }
      if (me !== side) a(`④ the mover is not the ${sideJ}`);
      if (all.some(m => p.clone().play(m).res)) a('④ the game ends at once');
      // ① ② ③ the engine again
      const s5 = CU.values(pre, 5), s6 = CU.values(pre, 6), st = new Map(P.sc || []);
      if (s6.length !== st.size || s6.some(([m, v]) => st.get(m) !== v)) a('① the stored values are not the depth-6 values');
      if (!s6.length || s6[0][0] !== P.best) a(`① best ${P.best} is not the engine's top ${(s6[0] || [])[0]}`);
      if (Math.abs((s6[0] || [0, 0])[1]) >= 2000) a('④ the game is decided (|v| ≥ 2000)');
      const top = sc => sc.filter(x => CU.points(sc, x[0]) === 20).map(x => x[0]), rest = sc => { const t = top(sc), r = sc.find(x => !t.includes(x[0])); return r ? CU.points(sc, r[0]) : 0; };
      const acc = top(s6); if (top(s5).sort().join() !== acc.slice().sort().join()) a('② depth 5 and 6 right other moves');
      if (acc.length > 3) a(`② ${acc.length} moves score 20`); const p2 = Math.max(rest(s5), rest(s6)); if (p2 > 12) a(`② the best wrong move scores ${p2}`);
      if (all.length < 3) a(`③ ${all.length} legal moves`); if (all.some(m => !st.has(m))) a('③ a legal move has no value'); if (acc.length * 3 > all.length) a('③ a third of the moves are right');
      // ⑤
      for (const [who, b] of pool) { if (who === `open ${id} q${j + 1}`) continue; const e = dist(P.s.b, b); if (e <= 4) a(`⑤ ${e} squares from ${who}`); }
      const FA = X.tfFacts(E, p, P.best), an = E.name(p, P.best);
      ans.set(an, (ans.get(an) || 0) + 1); if (ans.get(an) === 3) a(`⑤ the answer ${an} a third time`);
      kinds.set(FA.k, (kinds.get(FA.k) || 0) + 1); if (kinds.get(FA.k) === 4) a(`⑤ a 4th ${FA.k} move`);
      // ⑥
      const d = pre.length + p2; if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d);
      // ⑦⑧ the words, at each place of the lesson
      const qA = p.clone().play(P.best), capA = qA.lastCaps.length, oppA = maxCap(qA), kmA = kRoom(qA), km0 = kRoom(p), thr0 = maxCap(flip(p, 3 - me)), aimA = maxCap(flip(qA, me)), aim0 = maxCap(flip(p, me));
      for (let i = 0; i < 5; i++) { const V = X.tfOpVoice(id); let W; try { W = X.tfOpJaV(E, P, nm, k => X.TFM(k, 'ja'), V, i); } catch (e) { a('⑧ the words fail: ' + e.message); break; }
        const ask = plain(W.ask); if (/\{|undefined|NaN/.test(ask) || !ask.includes(sideJ) || (/『/.test(ask) && !ask.includes(`『${nm}』`))) a(`⑧ the question 「${ask}」`);
        const gd = plain(W.good(P.best));
        if (/undefined|NaN|\{/.test(gd)) a(`⑧ the praise 「${gd}」`);
        if (/はさんで取る|はさみ取りが決まった|1枚いただく|1枚取って|取れる駒をいただく|駒を1つ取る|取れる駒をしっかり/.test(gd) && !capA) a(`⑦ the answer takes nothing 「${gd}」`);
        { const mm = gd.match(/(\d+)から(\d+)に/); if (mm && (+mm[1] !== km0 || +mm[2] !== kmA)) a(`⑦ the king's room is ${km0} → ${kmA} 「${gd}」`); }
        if (/角のとなりを固める|角の入口に門番|角へのななめの道に駒|角のそばにふた|四隅への入口に/.test(gd) && !(me === 1 && BLOCK.has(E.mTo(P.best)))) a(`⑦ the answer is not a corner guard 「${gd}」`);
        if (/次の一手で取れる形|次に1枚取れる形|はさむ準備ができた|はさみ取りをねらう|はさんで取るねらい/.test(gd) && !(aimA > aim0)) a(`⑦ the answer makes no capture threat 「${gd}」`);
        if (/駒を助ける|よける手|かわしておく|逃がして|避難|かわす、身軽|先に駒をどかす|先に守る/.test(gd) && !(thr0 > 0 && oppA < thr0)) a(`⑦ the answer saves nothing 「${gd}」`);
        { // 追41: the answer moves a piece the opponent could take, to a square where it cannot be taken — the praise says so (and the words above only when it saves something)
          const hit = (q, s) => { if (q.res) return false; const f = flip(q, 3 - me); return f.moves().some(r => f.clone().play(r).lastCaps.includes(s)); };
          const flee = !capA && hit(p, E.mFrom(P.best)) && !hit(qA, E.mTo(P.best));
          if (flee && !/ねらわれ|駒を助ける|よける手|かわしておく|逃がして|避難|かわす、身軽|先に駒をどかす|先に守る/.test(gd)) a(`追41 the answer moves a threatened piece away, the praise does not say so 「${gd}」`);
          }
        if (/王さま自身が動く|王を外へ動かして|王さまが前へ出る|王さまみずから|王を動かして|王さまが自分で|王が動いて|王さまのお出かけ|王が一歩外へ|王さまで攻め手/.test(gd) && p.at(E.mFrom(P.best)) !== 3) a(`⑦ the answer is not a king move 「${gd}」`);
        for (const u of all) { if (acc.includes(u)) continue; const w = plain(W.ng(u)), x = E.name(p, u), bad = m => a(`⑦ ${x}: ${m} 「${w}」`);
          if (/undefined|NaN|\{(?![mx]\})/.test(w)) { bad('a placeholder'); continue; }
          if (!w.includes('{m}') || !w.includes('{x}')) bad('does not name both moves');
          const q = p.clone().play(u), F = X.tfFacts(E, p, u), cU = q.lastCaps.length, oppU = maxCap(q), kmU = kRoom(q);
          if (/角まで逃げられ|角まで走られ|角へ逃げこめる/.test(w) && !winsNow(q)) bad('the king cannot escape at once');
          if (/王がつかまっちゃう|かこまれて負け|逃げ場がなくなっちゃう/.test(w) && !winsNow(q)) bad('the king cannot be caught at once');
          if (/取られちゃう|はさみ取られる|駒が減っちゃう|取られる形/.test(w) && !(oppU > oppA)) bad(`the opponent takes ${oppU} (${oppA} after the answer)`);
          if (/取れる駒を見のがし|はさみ取りのチャンスを逃す|取れたはずの駒/.test(w) && !(capA > cU)) bad('takes as many as the answer');
          if (/(ねらえる|取れる|はさめる)相手の駒/.test(w)) { const tU = tgt(p, u), tA = tgt(p, P.best), a1 = w.match(/相手の駒は(\d+)つ/), a2 = w.match(/\{m\}なら(\d+)つ/);
            if ((a1 && +a1[1] !== tU) || (/相手の駒がない|相手の駒が生まれない/.test(w) && tU) || !a2 || +a2[1] !== tA || !(tA > tU)) bad(`the pieces to sandwich next: ${tU} (the answer ${tA})`); }
          for (const mm of w.matchAll(/\{m\}なら(\d+)(マス|まで)/g)) if (+mm[1] !== kmA) bad(`the king's room after the answer is ${kmA}`);
          for (const sn of w.split(/[。！]/)) if (/王/.test(sn) && sn.includes('{x}')) { const v = [...sn.replace(/\{m\}なら.*/, '').matchAll(/(\d+)/g)].map(x => +x[1]); if (v.some(x => x !== kmU)) bad(`the king's room after yours is ${kmU}`); }
          if (/角のまわりが手うす|角への入口があいたまま|王が角へ近づく道が残る|角固めが一手おくれ/.test(w) && !(me === 1 && BLOCK.has(E.mTo(P.best)) && !BLOCK.has(E.mTo(u)))) bad('the answer is no corner guard or yours is one');
          if (/ねらわれていた駒がそのまま|あぶない駒を見すごし/.test(w) && !(thr0 > 0 && oppU > 0)) bad('no piece was threatened');
          if (/はさみ取りのねらいが作れない|相手の駒をねらう形にならない|受けの手を使わせられない/.test(w) && !(aimA > aim0 && !(maxCap(flip(q, me)) > aim0))) bad('the threats are not as said');
          if (/王の通り道は広がらない|王のまわりがつまったまま/.test(w) && kmU > km0) bad('the king\'s room grows');
          if (/王さまが動かないぶん|王が出るタイミング/.test(w) && !(p.at(E.mFrom(P.best)) === 3 && p.at(E.mFrom(u)) !== 3)) bad('not the king move missed');
          if (/そのよさがない|その形が作れない|この手の働きが生まれない|そのチャンスを逃しちゃう|そのねらいが一手おくれる/.test(w) && F.k === FA.k) bad(`the same kind (${F.k}) as the answer`);
          if (/形は似ているけど|本筋はこっち|流れからは少しはずれる/.test(w)) bad('no reason on the board');
        } }
    });
  }
  return out;
}
// (2026-11-24 第2期・担当B) checkers openings (checkers/open): the practice problems of every named opening (CKO_DONE), the pool
// chosen by checkers/tools/op_curate.js. ① the stored best is the engine's best again (a fresh search) and the stored values
// cover every legal move, best first (a fresh search: depth 14, about 0.7 s); ② every other move scores 12 points or less in the 2D / 3D scoring (= problemPoints) — by the
// stored values and by the fresh search; ③ 3+ legal moves, and 2+ moves besides the answer that do not drop a piece at once (the
// answer is not just "the one move that does not hang a piece"); ④ the position is the opening's: its path replays legally from the
// start through the opening's named moves (at most 20 plies after them) to the stored board, and nobody is already winning (|best|
// ≤ 250); ⑤ 5+ squares (more than two moves) from every other checkers board (lessons, warm-ups, puzzles, the other openings' problems; colour-swapped
// too), an answer at most twice in one opening, at most 4 of one kind of move (ckFacts: shot, capture, …) so 5 drawn are never one tactic; ⑥ easy → hard (d: the moves worth 4+ points, then the safe moves, then the legal
// moves) and the 2D / 3D draw 5 and keep the pool's order; ⑦⑧ チェッカニ's words (ckOpJa) at every place in the lesson, for every
// legal move: a piece jumped for nothing / taken back / N pieces lost — the opponent's captures after it win that much; the crown,
// the threatened piece, the back row, the exchange, the centre — on the board; no move is explained only by the vague 「先に良い場所を
// 取られる」 kind of line; ⑨ the 2D and the 3D share problemPoints.
const CKO_DONE = new Set(['cross', 'old14', 'alma', 'souter', 'fife', 'whilter', 'edinburgh', 'double', 'dcross', 'pioneer', 'denny', 'kelso', 'bristol', 'bcross', 'dundee']);   // (single・ayrshire・glasgow・laird: only shots were found — 次回)
function checkersOpen(opt) {
  const fs = require('fs'), vm = require('vm');
  if (!ckW) ckW = require(path.join(ROOT, 'checkers/tools/wasm.js')).loadSync();
  const W = ckW, E = W.E, out = [], add = (id, j, m) => out.push({ step: id, q: j + 1, msg: m });
  const O = (opt && opt.op) || JSON.parse(fs.readFileSync(path.join(ROOT, 'checkers/openings.json'), 'utf8'));
  const src = (opt && opt.src) || fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), app = fs.readFileSync(path.join(ROOT, 'checkers/app.js'), 'utf8');
  const cut = (a, b) => src.slice(src.indexOf(a), src.indexOf(b));
  const line = a => src.slice(src.indexOf(a), src.indexOf('\n', src.indexOf(a)) + 1);
  const X = vm.runInNewContext(line('  const shSeed = ') + line('  const shPerm = ') + cut('  const xqSn = ', '  const XQ_TAIL = ') + cut('  const xqJoin = ', '  function xqOpJa(')
    + cut('  const CKM = ', '  const CK_EG = ') + '\n;({ ckOpJa, ckOpVoice, ckFacts, CKJ_OP })', {});
  // ⑨ ⑥ the scoring and the order in both
  const PTS = 'if (mine >= best - 6 && !(best > WINT && mine < best)) return 20;';
  if (!app.includes(PTS) || !src.includes(PTS.replace(/WINT/g, 'CK_WINT'))) add('-', -1, '⑨ problemPoints changed in the 2D or the 3D');
  if (!app.includes('problems: pool.slice(0, 5).sort((a, b) => g.problems.indexOf(a) - g.problems.indexOf(b))')) add('-', -1, '⑥ the 2D opening practice does not keep the pool order');
  if (!src.includes('const probs = shuffle((g.problems || []).map((p, i) => i)).slice(0, 5).sort((a, b) => a - b).map(i => g.problems[i]);   // (2026-11-24 第2期: the pool is easy → hard; 5 drawn, kept in its order)\n      const E = window.CheckersEngine')) add('-', -1, '⑥ the 3D opening practice does not keep the pool order');
  const WIN = 30000, WINT = 29000;
  const sOfV = v => v > WINT ? 0.9 + 0.1 * Math.min(1, 6 / (WIN - v + 1)) : v < -WINT ? -(0.9 + 0.1 * Math.min(1, 6 / (WIN + v + 1))) : v > WINT - 1000 ? 0.88 : v < -(WINT - 1000) ? -0.88 : Math.tanh(v / 260) * 0.82;
  const pts = (sc, m) => { const val = new Map(sc), best = Math.max(...sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : -WIN;
    if (mine >= best - 6 && !(best > WINT && mine < best)) return 20; if (best > WINT && mine > WINT) return 16;
    if (best > WINT && mine <= WINT) return mine > -WINT && mine >= 150 ? 8 : mine > -60 ? 4 : 0; if (mine < -WINT && best >= -WINT) return 0;
    return Math.max(0, Math.round(20 * (1 - (sOfV(best) - sOfV(mine)) / 0.5))); };
  // the material the side to move wins by its forced captures, read to the end (an independent reading from ckFacts')
  const swing = (p, d) => { const c = p.caps(); if (!c.length || d > 12) return 0; let b = -99; for (const m of c) b = Math.max(b, E.popc(E.mCap(m)) - swing(p.clone().play(m), d + 1)); return b; };
  const net = (p, m) => E.popc(E.mCap(m)) - swing(p.clone().play(m), 0);
  const L = JSON.parse(fs.readFileSync(path.join(ROOT, 'checkers/lessons.json'), 'utf8')), pool = ckPool(fs, L).filter(([n]) => !n.startsWith('opening'));
  O.sets.forEach(s => (s.problems || []).forEach((P, j) => pool.push([`opening ${s.id} ${j + 1}`, P.s.b, P])));
  const VAGUE = new Set(X.CKJ_OP.gap);
  const plain = t => String(t).replace(/[\u0001\u0002]/g, '');
  for (const s of O.sets) { const id = s.id; if (!CKO_DONE.has(id) || (opt && opt.only && !opt.only.has(id))) continue;
    const PS = s.problems || [], ans = new Map(), name = s.title.ja; let prevD = -1, firstD = null;
    if (PS.length < 5) add(id, -1, `③ ${PS.length} problems in the pool (5 are drawn)`);
    { const kinds = {}; PS.forEach(P => { const k = X.ckFacts(E, E.Pos.from(P.s), P.best).k; kinds[k] = (kinds[k] || 0) + 1; });
      for (const [k, n] of Object.entries(kinds)) if (n > 4) add(id, -1, `⑤ ${n} problems of the same kind (${k}): a draw of 5 can be all the same tactic`); }
    let p0 = E.Pos.from(null); const named = []; for (const t of s.moves.split(' ')) { const m = E.parse(p0, t); named.push(m); p0.play(m); }
    PS.forEach((P, j) => { const a = m => add(id, j, m), p = E.Pos.from(P.s), ms = p.moves(), sc = P.sc || [], A = P.best;
      // ① ②
      if (sc.length !== ms.length || ms.some(m => !sc.some(e => e[0] === m))) a('① the stored values do not cover every legal move');
      sc.forEach(([m, v], k) => { if (!ms.includes(m)) a(`① ${m} is not legal`); if (k && v > sc[k - 1][1]) a('① the values are not best first'); });
      if ((sc[0] || [])[0] !== A) a('① best is not the top of the stored values');
      sc.forEach(([m]) => { if (m !== A && pts(sc, m) > 12) a(`② ${E.name(p, m)} scores ${pts(sc, m)} (stored values)`); });
      const r = W.analyzeDepth(P.s, 14), fr = r.list.map(e => [e.m, e.v]);
      if (fr[0][0] !== A) a(`① a fresh search prefers ${E.name(p, fr[0][0])} (${fr[0][1]}) to ${E.name(p, A)} (${(fr.find(e => e[0] === A) || [0, '—'])[1]})`);
      else fr.forEach(([m]) => { if (m !== A && pts(fr, m) > 12) a(`② ${E.name(p, m)} scores ${pts(fr, m)} in a fresh search`); });
      // ③
      const safe = ms.filter(m => m !== A && net(p, m) >= 0).length;
      if (ms.length < 3) a(`③ ${ms.length} legal moves`); if (safe < 2) a(`③ only ${safe} other moves keep every piece`);
      // ④
      const path0 = P.path || []; let q = E.Pos.from(null), okp = path0.length >= named.length && named.every((m, k) => path0[k] === m);
      for (const m of path0) { if (!q.moves().includes(m)) { okp = false; break; } q = q.clone().play(m); }
      if (!okp || q.spec().b !== P.s.b || q.spec().side !== P.s.side) a('④ the path does not lead from the opening\'s named moves to the position');
      if (path0.length - named.length > 20) a(`④ ${path0.length - named.length} plies after the named moves`);
      if (Math.abs(sc[0][1]) > 250) a(`④ the side to move is already ${sc[0][1] > 0 ? 'winning' : 'losing'} (${sc[0][1]})`);
      // ⑤
      for (const [w, b, o] of pool) { if (o === P) continue; const d = ckDist(P.s.b, b); if (d < 5) a(`⑤ ${d} squares from ${w}`); }
      ans.set(A, (ans.get(A) || 0) + 1); if (ans.get(A) === 3) a(`⑤ the answer ${E.name(p, A)} a third time`);
      // ⑥
      const d = sc.filter(([m]) => pts(sc, m) >= 4).length - 1 + safe / 10 + ms.length / 100;
      if (d < prevD) a(`⑥ easier than the problem before (d ${d.toFixed(2)} after ${prevD.toFixed(2)})`); prevD = Math.max(prevD, d); if (firstD == null) firstD = d;
      if (j === PS.length - 1 && PS.length > 1 && !(d > firstD)) a('⑥ the last problem is not harder than the first');
      // ⑦ ⑧ the words at every place in the lesson
      const FA = X.ckFacts(E, p, A), nA = net(p, A);
      for (let i = 0; i < 5; i++) { const V = X.ckOpVoice(id); let Q;
        try { Q = X.ckOpJa(E, P, name, id.charCodeAt(1) * 2 + i, k => k === 'ok' ? '{M}' : '{X}', V, i); } catch (e) { a(`⑧ the words fail: ${e.message}`); break; }
        for (const t of [Q.ask, Q.hintTx, Q.good(A)]) if (!t || /\{(?!M\}|X\})|undefined|NaN/.test(t)) a(`⑧ 「${t}」`);
        const g = plain(Q.good(A));
        if (/ショット|跳び返す|2枚取れる|2枚いただく/.test(g) && !(FA.capN === 0 && nA > 0)) a(`⑦ the answer is no shot (net ${nA}) 「${g}」`);
        if (FA.capN === 0 && nA > 0) { const af = p.clone().play(A); let t = 0, bv = -99; for (const c of af.caps()) { const v = E.popc(E.mCap(c)) - swing(af.clone().play(c), 0); if (v > bv) { bv = v; t = E.popc(E.mCap(c)); } }
          const gget = t + nA;   // (the opponent takes t, then the shot takes back t + the gain)
          if (/1枚(わざと)?取らせ|1枚捨て|えさの駒を1枚/.test(g) && t !== 1) a(`⑦ the shot gives ${t} pieces, the words say 1 「${g}」`);
          if (/2枚(いただく|取れる)/.test(g) && gget !== 2) a(`⑦ the shot takes ${gget} back, the words say 2 「${g}」`);
          if (/まとめて跳ぶ|連続で跳び返す/.test(g) && gget < 2) a(`⑦ the shot takes only ${gget} 「${g}」`); }
        if (/キング|王冠/.test(g) && !/キングを防ぐ|キングに(なられ|成られ)/.test(g) && !p.promotes(A)) a(`⑦ the answer does not crown 「${g}」`);
        { // 追41: a piece the opponent could jump before the answer, none after (a quiet answer) — the praise says so, and only then
          const fl = q => { const r = q.clone(); r.side ^= 1; r.rehash(); return r; }, af = p.clone().play(A);
          const flee = swing(fl(p), 0) > 0 && E.popc(E.mCap(A)) === 0 && !af.caps().length;
          const says = /ねらわれ|跳び越えられそう|取られそう|ピンチの駒|取るねらいを、先に/.test(g);
          if (flee && !says) a(`追41 the answer saves a piece the opponent could jump, the praise does not say so 「${g}」`);
          if (!flee && says) a(`追41 the praise says a piece was in danger, none was 「${g}」`); }
        if (/取り返され(?!ない)/.test(g) && !(nA < E.popc(E.mCap(A)))) a(`⑦ the answer is not taken back 「${g}」`);
        if (/わざと1枚を取らせる|1枚を差し出|1枚あげ|1枚差し出|損を承知/.test(g) && !(nA < 0)) a(`⑦ the answer gives no piece (net ${nA}) 「${g}」`);
        if (nA < 0) a(`④ the answer drops a piece (net ${nA}): a sacrifice the words cannot explain from the board`);
        for (const u of ms) { if (u === A) continue; const w = plain(Q.ng(u)), nu = net(p, u), lost = -nu;
          if (/\{(?!M\}|X\})|undefined|NaN/.test(w)) a(`⑧ ${E.name(p, u)}: 「${w}」`);
          if (!w.includes('{X}')) a(`⑦ ${E.name(p, u)}: does not name your move 「${w}」`);
          if ([...VAGUE].some(x => w.includes(x.replace('{x}', '{X}')))) a(`⑦ ${E.name(p, u)}: only a vague reason 「${w}」`);
          const m2 = w.match(/連続で跳ばれて(\d+)枚/); if (m2 && lost !== +m2[1]) a(`⑦ ${E.name(p, u)}: says ${m2[1]} pieces lost, the board ${lost} 「${w}」`);
          if (/タダで跳び越え|ただで取られる/.test(w) && !(E.popc(E.mCap(u)) === 0 && nu < 0)) a(`⑦ ${E.name(p, u)}: no piece is jumped for nothing (net ${nu}) 「${w}」`);
          if (/着地した駒を取り返され|着地したところをすぐ跳び返され/.test(w) && !(E.popc(E.mCap(u)) > 0 && nu < E.popc(E.mCap(u)))) a(`⑦ ${E.name(p, u)}: the capture is not taken back 「${w}」`);
          if (/取らせて跳び返すチャンス/.test(w) && !(FA.capN === 0 && nA > 0 && nu < nA)) a(`⑦ ${E.name(p, u)}: there is no shot to miss 「${w}」`);
          if (/「ショット」を打てる|「ショット」がある/.test(w)) { const mm = w.match(/差し引き(\d+)枚/), q = p.clone().play(u); let g2 = 0;
            if (!q.caps().length) for (const y of q.moves()) { const r = q.clone().play(y); if (r.caps().length) g2 = Math.max(g2, -swing(r, 0)); }
            if (!(g2 > 0 && mm && +mm[1] === g2)) a(`⑦ ${E.name(p, u)}: the opponent's shot wins ${g2}, the words say ${mm && mm[1]} 「${w}」`); }
          { const m3 = w.match(/取れるのは(\d+)枚だけ。\{M\}なら(\d+)枚取れる/); if (m3 && !(+m3[1] === E.popc(E.mCap(u)) && +m3[2] === E.popc(E.mCap(A)))) a(`⑦ ${E.name(p, u)}: the pieces taken ${m3[1]}/${m3[2]}, the board ${E.popc(E.mCap(u))}/${E.popc(E.mCap(A))} 「${w}」`); }
          if (/キングになるチャンス/.test(w) && !(p.promotes(A) && !p.promotes(u))) a(`⑦ ${E.name(p, u)}: no crown missed 「${w}」`);
          if (/ねらわれた駒を守れない/.test(w) && !(FA.save && p.clone().play(u).caps().length)) a(`⑦ ${E.name(p, u)}: no threatened piece left 「${w}」`);
          if (/後ろの段に穴|後ろの段の守りの駒|奥の段が手うす/.test(w) && !(E.RC[E.mFrom(u)][0] === (p.side ? 7 : 0))) a(`⑦ ${E.name(p, u)}: not a back-row piece 「${w}」`);
          if (/端へ寄る手|駒が端へ行って/.test(w) && ![0, 7].includes(E.RC[E.mTo(u)][1])) a(`⑦ ${E.name(p, u)}: not to the edge 「${w}」`);
        }
      }
    });
  }
  return out;
}
// (2026-11-24 第2期 担当B, 追15) the openings' own lines, every /open game with named lines (shogi・tafl・checkers; connect4's op1〜op3
//  have no named lines, op3's main line is checked in lesson-facts.js): ① every move of the study line is legal from its start,
//  ④ the line begins with the opening's named moves (tafl・checkers `moves`) or reaches the opening's own shape (shogi src `pat`, either
//  wing when `mirror`), ⑤ two openings: the last position of one line is never a position of the other's line (the same line, its first
//  half, or the other line run into at its end; tafl with the 8 symmetries) — differently named openings teach different lines.
function openLines(opt) {
  const fs = require('fs'), out = [], add = (id, m) => out.push({ step: id, q: 0, msg: m }), J = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const cross = (game, L) => { const ids = Object.keys(L);
    for (const a of ids) { const fin = L[a][L[a].length - 1]; for (const b of ids) { if (a === b) continue; const k = L[b].indexOf(fin);
      if (k >= 0) add(`${game} ${a}`, `⑤ the line ends (ply ${L[a].length - 1}) in a position of ${b}'s line (ply ${k})${k === L[a].length - 1 && k === L[b].length - 1 ? ': the same line' : k === L[a].length - 1 ? ': its first half' : ''}`); } } };
  { // shogi
    const E = require(path.join(ROOT, 'shogi/engine.js')), CU = require(path.join(ROOT, 'shogi/tools/openings/curate.js'));
    const CATS = ['beg', 'mid', 'adv', 'sp', 'new', 'castle'], sets = [];
    CATS.forEach(c => J(`shogi/openings-${c}.json`).sets.forEach(s => sets.push(s)));
    J('shogi/openings.json').sets.forEach(s => { if (!sets.some(x => x.id === s.id)) sets.push(s); });
    if (opt && opt.shogi) opt.shogi.forEach(s => { const i = sets.findIndex(x => x.id === s.id); if (i >= 0) sets[i] = s; });
    const SRC = {}; CATS.forEach(c => require(path.join(ROOT, `shogi/tools/openings/src/${c}.js`)).forEach(e => { SRC[e.id] = e; }));
    const key = p => p.sfen().split(' ').slice(0, 3).join(' '), L = {};
    for (const s of sets) { const st = s.study; if (!st || !st.steps || !st.steps.length) { add(`shogi ${s.id}`, '① no study line'); continue; }
      const p = new E.Position(); p.setSfen(st.start); const ks = [key(p)], e = SRC[s.id], C = e && e.pat ? [CU.compile(e.pat, false)].concat(e.mirror ? [CU.compile(e.pat, true)] : []) : null; let shape = false;
      for (const [u] of st.steps) { const m = p.legalMoves(true).find(x => p.toUsi(x) === u); if (!m) { add(`shogi ${s.id}`, `① move ${ks.length} ${u} is not legal`); break; } p.doMove(m); p.sp = 0; ks.push(key(p)); if (C && C.some(c => CU.match(p, c))) shape = true; }
      if (C && !shape) add(`shogi ${s.id}`, `④ the line never reaches the opening's shape (${e.pat})`);
      L[s.id] = ks; }
    cross('shogi', L); }
  { // tafl
    const E = require(path.join(ROOT, 'tafl/engine.js')), O = (opt && opt.tafl) || J('tafl/openings.json'), L = {};
    const SYM = [(r, c) => [r, c], (r, c) => [r, 10 - c], (r, c) => [10 - r, c], (r, c) => [10 - r, 10 - c], (r, c) => [c, r], (r, c) => [c, 10 - r], (r, c) => [10 - c, r], (r, c) => [10 - c, 10 - r]];
    const can = q => SYM.map(S => { let o = ''; const b = q.spec().b; for (let i = 0; i < 121; i++) { const [r, c] = S((i / 11) | 0, i % 11); o += b[r * 11 + c]; } return o; }).sort()[0] + q.turn;
    for (const g of O.sets) { let q = E.Pos.from(null, 'copenhagen'); const ks = [can(q)], defs = g.moves.split(' ');
      g.study.line.forEach((m, k) => { if (!q) return; if (q.res || !q.moves().includes(m)) { add(`tafl ${g.id}`, `① move ${k + 1} is not legal`); q = null; return; }
        if (k < defs.length && E.name(q, m).replace(/x.*/, '') !== defs[k]) add(`tafl ${g.id}`, `④ the line does not begin with ${g.moves}`); q = q.clone().play(m); ks.push(can(q)); });
      L[g.id] = ks; }
    cross('tafl', L); }
  { // checkers
    if (!ckW) ckW = require(path.join(ROOT, 'checkers/tools/wasm.js')).loadSync();
    const E = ckW.E, O = (opt && opt.checkers) || J('checkers/openings.json'), L = {}, key = p => JSON.stringify(p.spec());
    for (const g of O.sets) { let p = E.Pos.from(null); const ks = [key(p)], named = []; { let q = E.Pos.from(null); for (const t of g.moves.split(' ')) { const m = E.parse(q, t); named.push(m); q.play(m); } }
      if (!named.every((m, k) => g.study.line[k] === m)) add(`checkers ${g.id}`, `④ the line does not begin with ${g.moves}`);
      for (const [k, m] of g.study.line.entries()) { if (!p.moves().includes(m)) { add(`checkers ${g.id}`, `① move ${k + 1} is not legal`); break; } p = p.clone().play(m); ks.push(key(p)); }
      L[g.id] = ks; }
    cross('checkers', L); }
  return out;
}
// (2026-11-24 第2期・担当B) chess openings (chess/openings.json, chess/open): the problems of set.drill (picked by chess/tools/op_curate.js
// from the pool of positions of strong games, cand: [uci, games]), each against the rules (chess/engine.js), the site's engine (chess/tools/
// wasm.js analyze, node-limited = deterministic) and the stored game counts: ① the answer is the most played move, legal, within 40 of the
// engine's best; ② played 30 times or more, the second move 36% of it or less (= 12 points or less in the 2D problemPoints and the 3D
// CHESS.points, so no other move is right or "close"); ③ 3+ legal moves, 2+ other moves played, 2+ other moves within 80 of the best (a
// real choice), the answer not the only way out of a loss; ④ the mover is the opening's side, the position comes from the opening's
// own moves (reached from set.prefix through the pool's moves), not decided (|v| < 150); ⑤ 5 squares or more (colours swapped too) from
// every other chess problem (lessons, warm-ups, puzzles, the other openings' drills) and from every position of the study lines (追1:
// not the line shown just before), one answer twice at most and one kind of move (chKind) three times at most in an opening; ⑥ easy →
// hard (d = plies + 20 × second / first), both the 2D and the 3D keep set.drill's order; ⑦⑧ ナイトン's words (chOpJa) at every place
// of the five for the answer and every legal wrong move: the side and the opening in the question, the share of games of the answer and
// of yours, "hardly played" only when no move outside cand can have more than 5%, "taken" only when the engine shows the loss, "no more
// castling" only with the right to castle, the reasons of the answer (take / take back / castle / pin / chase / develop) on the board;
// ⑨ the 2D and the 3D score alike, and a move that is not right does not move on by itself in the 2D.
let chW = null;
function chessOpenCtx(OP) {
  const fs = require('fs'), vm = require('vm'), E = require(path.join(ROOT, 'chess/engine.js'));
  if (!chW) chW = require(path.join(ROOT, 'chess/tools/wasm.js'));
  const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8');
  const pre = src.slice(src.indexOf('  const shSeed = '), src.indexOf('  const shPerm = ')) + src.slice(src.indexOf('  const shPerm = '), src.indexOf('\n', src.indexOf('  const shPerm = ')));
  const X = vm.runInNewContext(pre + '\n' + src.slice(src.indexOf('  const CHJ_OP = {'), src.indexOf('  function chHits(')) + '\n;({ chFacts, chKind, chOpJa, chOpVoice, chStepNotesJa, CHJ_OP, CH_PN, CH_VAL, chBoard, chAtt, chMove })', { console });
  OP = OP || JSON.parse(fs.readFileSync(path.join(ROOT, 'chess/openings.json'), 'utf8'));
  const brd = fen => { const b = Array(64).fill('.'); String(fen).split(' ')[0].split('/').forEach((row, ri) => { let f = 0; for (const ch of row) { if (/\d/.test(ch)) f += +ch; else { b[(7 - ri) * 8 + f] = ch; f++; } } }); return b.join(''); };
  const swap = b => { let o = ''; for (let r = 7; r >= 0; r--) for (let f = 0; f < 8; f++) { const c = b[r * 8 + f]; o += c === '.' ? c : c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase(); } return o; };
  const dist = (a, b) => { let n = 0; for (let i = 0; i < 64; i++) if (a[i] !== b[i]) n++; return n; };
  const key = fen => fen.split(' ').slice(0, 3).join(' ');   // (the en passant square is written differently by the pool and the engine)
  // the fixed pool: lessons, warm-ups, puzzles and every position of every study line (追1)
  const fixed = [], LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'chess/lessons.json'), 'utf8')), PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'chess/puzzles.json'), 'utf8'));
  LS.steps.forEach(st => { (st.problems || []).forEach((q, j) => q.fen && fixed.push([`lesson ${st.id} ${j + 1}`, brd(q.fen)])); (st.ramp || []).forEach((q, j) => q.fen && fixed.push([`warm-up ${st.id} ${j + 1}`, brd(q.fen)])); if (st.diagram && st.diagram.fen) fixed.push([`lesson ${st.id} diagram`, brd(st.diagram.fen)]); });
  (PZ.levels || []).forEach(l => (l.puzzles || []).forEach((q, j) => fixed.push([`puzzle ${l.n} ${j + 1}`, brd(q.fen)])));
  Object.entries(PZ.old || {}).forEach(([k, q]) => fixed.push([`puzzle old ${k}`, brd(q.fen)]));
  const lineFens = {};
  OP.sets.forEach(s => { const p = E.Pos.fromFEN(E.START), L = [p.fen()]; for (const [u] of (s.study && s.study.steps) || []) { const m = p.fromUci(u); if (!m) break; p.make(m); L.push(p.fen()); } lineFens[s.id] = L; L.forEach((f, k) => fixed.push([`study ${s.id} ply ${k}`, brd(f)])); });
  // ④ the positions of each opening: from its prefix through the pool's moves
  const reach = {};
  OP.sets.forEach(s => { const byKey = new Map(s.problems.map(P => [key(P.fen), P])), p = E.Pos.fromFEN(E.START); for (const u of s.prefix.split(' ')) p.make(p.fromUci(u));
    // (a pool position goes on by its played moves; one ply that is not in the pool — the reply the pool does not keep — by any legal move)
    const seen = new Set([key(p.fen())]), Q = [[p.fen(), byKey.has(key(p.fen())) ? 0 : 1]];
    while (Q.length) { const [f, gap] = Q.shift(), P = byKey.get(key(f)), z = E.Pos.fromFEN(f), us = P ? P.cand.map(c => c[0]) : z.legal().map(m => z.uci(m));
      for (const u of us) { const q = E.Pos.fromFEN(f), m = q.fromUci(u); if (!m) continue; q.make(m); const k = key(q.fen()), inP = byKey.has(k); if (seen.has(k) || (!inP && gap)) continue; seen.add(k); Q.push([q.fen(), inP ? 0 : 1]); } }
    reach[s.id] = seen; });
  return { E, X, OP, brd, swap, dist, key, fixed, lineFens, reach, ana: {} };
}
const chessOpenD = P => { const f = P.fen.split(' '); return (+f[5] - 1) * 2 + (f[1] === 'b' ? 1 : 0) + 20 * ((P.cand[1] || [0, 0])[1] / P.cand[0][1]); };
const chPts = (P, u) => { if (P.acc && P.acc.includes(u)) return 20; const c = (P.cand.find(x => x[0] === u) || [0, 0])[1], top = P.cand[0][1]; return c >= top ? 20 : c ? Math.max(4, Math.round(20 * Math.sqrt(c / top))) : 0; };   // (= chess/app.js problemPoints, the 3D CHESS.points)
function chessOpenProblem(ctx, s, P, j, opt) {
  const { E, X } = ctx, out = [], a = m => out.push(m), A = (P.cand[0] || [])[0], pos = E.Pos.fromFEN(P.fen), L = pos.legal(), U = new Set(L.map(m => pos.uci(m)));
  // ①
  if (!A || !U.has(A)) { a(`① the answer ${A} is not legal`); return out; }
  P.cand.forEach(([u, n], k) => { if (!U.has(u)) a(`① cand ${u} is not legal`); if (k && n > P.cand[k - 1][1]) a('① cand is not most played first'); });
  const r = ctx.ana[P.fen] || (ctx.ana[P.fen] = chW.analyze(P.fen, null, 4e5)), val = u => (r.find(x => x.uci === u) || { v: -1e9 }).v, best = r[0].v;
  if (best - val(A) > 40) a(`① the engine puts the answer ${best - val(A)} below its best ${r[0].uci}`);
  // ②
  const n1 = P.cand[0][1], n2 = (P.cand[1] || [0, 0])[1], N = P.n || P.cand.reduce((x, c) => x + c[1], 0);
  if (n1 < 30) a(`② played only ${n1} times`);
  const acc = P.acc || [A]; if (acc[0] !== A || acc.length > 2) a(`② acc ${acc}: the most played first, two at most`);
  acc.slice(1).forEach(u => { const c = (P.cand.find(x => x[0] === u) || [0, 0])[1]; if (!U.has(u) || c < 0.5 * n1 || best - val(u) > 40) a(`② ${u} is taken as right, but played ${c} times (the answer ${n1}) and ${best - val(u)} below the best`); });
  for (const u of U) if (!acc.includes(u) && chPts(P, u) > 12) a(`② ${u} scores ${chPts(P, u)} (played ${(P.cand.find(x => x[0] === u) || [0, 0])[1]} times against ${n1})`);
  if (P.cand.reduce((x, c) => x + c[1], 0) > N) a('⑧ the total is below the counts');
  if (P.cand.some(c => c[1] < 0.03 * N) || P.cand.length > 5) a('⑧ cand is not the moves of 3% or more (five at most): "hardly played" cannot be told');   // (the pool lists every move of 3% or more, five at most)
  // ③
  if (L.length < 3) a(`③ ${L.length} legal moves`);
  if (P.cand.length < acc.length + 1) a('③ no other move is played');
  const near = r.filter(x => !acc.includes(x.uci) && best - x.v <= 80).length; if (near < 2) a(`③ only ${near} other moves within 80 of the best: no real choice`);
  // ④
  const side = P.fen.split(' ')[1]; if (side !== s.side) a(`④ the mover is ${side}, the opening is ${s.side}'s`);
  if (!ctx.reach[s.id].has(ctx.key(P.fen))) a(`④ not reached from ${s.prefix} through the opening's moves`);
  if (Math.abs(best) >= 150) a(`④ decided (${best})`);
  if (pos.inCheck()) a('④ the mover is in check');
  // ⑦⑧ the words at every place of the five
  const white = side === 'w', who = white ? '白' : '黒', nm = String(s.title.ja), plain = t => String(t).replace(/<[^>]+>/g, '');
  const pc = c => Math.max(1, Math.round(c / N * 100)), cnt = new Map(P.cand), rest = N - P.cand.reduce((x, c) => x + c[1], 0);
  const FA = X.chFacts(P.fen, A), kA = X.chKind(FA, A, white), castleR = /[KQkq]/.test(P.fen.split(' ')[2]) && P.fen.split(' ')[2].split('').some(c => white ? c === c.toUpperCase() && c !== '-' : c === c.toLowerCase() && c !== '-');
  const mat = (q, w) => { let t = 0; for (let i = 0; i < 128; i++) { if (i & 0x88) { i += 7; continue; } const pp = q.b[i]; if (pp && ((pp & 8) === 0) === w && (pp & 7) !== 6) t += [0, 1, 3, 3, 5, 9][pp & 7]; } return t; };
  const after = u => { const q = E.Pos.fromFEN(P.fen); q.make(q.fromUci(u)); return q; };
  { const q = after(A), d0 = mat(pos, white) - mat(pos, !white), d1 = mat(q, white) - mat(q, !white);
    if (kA === 'recap' && !(d0 < 0 && d1 >= 0)) a(`⑧ the answer is called a take-back (material ${d0} → ${d1})`);
    if (kA === 'pin' && !(FA.pin && (FA.pin[1] === 'キング' || X.CH_VAL[{ ポーン: 'p', ナイト: 'n', ビショップ: 'b', ルーク: 'r', クイーン: 'q', キング: 'k' }[FA.pin[1]]] > X.CH_VAL[FA.pc]))) a(`⑧ the pin of the answer wins nothing behind (${FA.pin})`);
    if (kA === 'castle' && !(A === (white ? 'e1g1' : 'e8g8') || A === (white ? 'e1c1' : 'e8c8'))) a('⑧ the answer is called castling'); }
  const steps = ((s.study && s.study.steps) || []).map(x => x[0]);
  for (let i = 0; i < 5; i++) {
    const CV = X.chOpVoice(s.id), intro = X.CHJ_OP.intro[s.id] || ''; CV.add(intro);
    const notes = {}; Object.entries(X.CHJ_OP.notes[s.id] || {}).forEach(([k, v]) => { notes[k] = { ja: v }; }); X.chStepNotesJa(steps, notes, CV);
    let Q; try { Q = X.chOpJa({ pos: P.fen, kind: 'best', P, ans: A }, nm, CV, i); } catch (er) { a(`⑧ the 3D words fail: ${er.message}`); break; }
    const ask = plain(Q.ask); if (/\{|undefined|NaN/.test(ask) || !ask.includes(who) || /[白黒]の(番|一手|手番)/.test(ask.replace(who + 'の', '')) || (/『/.test(ask) && !ask.includes(`『${nm}』`))) a(`⑧ the question 「${ask}」`);
    const hint = plain(Q.hintTx); if (/キングはまだ真ん中/.test(hint) && !(white ? pos.b[E.sqOf('e1')] === 6 : pos.b[E.sqOf('e8')] === 14)) a(`⑧ the hint: the king is not in the middle 「${hint}」`);
    const g = plain(Q.good(A)), pp = [...g.matchAll(/(\d+)%/g)].map(x => +x[1]);
    if (/\{|undefined|NaN/.test(g.replace(/\{[mx]\}/g, ''))) a(`⑧ the praise 「${g}」`);
    if (!pp.length || pp.some(x => x !== pc(n1))) a(`⑧ the praise gives ${pp.join('/') || 'no'}% (the answer is ${pc(n1)}%) 「${g}」`);
    { // 追41: the answer moves a piece the opponent could win (attacked and undefended, or by a cheaper piece) to a square where it is safe — the praise says so, and only then
      const thr = (b, q) => { const ch = b[q], lo = (ch || '').toLowerCase(); if (!ch || lo === 'k') return false; const at = X.chAtt(b, q, !white, true), df = X.chAtt(b, q, white, true); return !!at && (!df || X.CH_VAL[at.toLowerCase()] < X.CH_VAL[lo]); };
      const sq = t => (t.charCodeAt(1) - 49) * 8 + (t.charCodeAt(0) - 97), b0 = X.chBoard(P.fen);
      const flee = !FA.cap && thr(b0, sq(A.slice(0, 2))) && !thr(X.chMove(b0, A), sq(A.slice(2, 4)));
      if (flee && !/ねらわれ|逃が|逃げ|かわ/.test(g)) a(`追41 the answer moves a threatened piece away, the praise does not say so 「${g}」`);
      if (!flee && /ねらわれていた|ねらわれた/.test(g)) a(`追41 the praise says a piece was threatened 「${g}」`); }
    acc.slice(1).forEach(u => { const t = plain(Q.good(u)), q2 = [...t.matchAll(/(\d+)%/g)].map(x => +x[1]); if (!t.includes('{x}') || q2.length !== 2 || q2[0] !== pc(cnt.get(u)) || q2[1] !== pc(n1)) a(`⑧ ${u} (also right): 「${t}」`); });
    for (const u of U) { if (acc.includes(u)) continue; const w = plain(Q.ng(u)), bad = m => a(`⑦ ${u}: ${m} 「${w}」`);
      if (/undefined|NaN/.test(w) || /\{(?![mx]\})/.test(w)) bad('a placeholder');
      if (!w.includes('{x}') && !w.includes('{m}')) bad('names neither the answer nor yours');
      const ps = [...w.matchAll(/(\d+)%/g)].map(x => +x[1]);
      if (cnt.has(u)) { if (!ps.includes(pc(cnt.get(u))) || ps.some(x => x !== pc(cnt.get(u)) && x !== pc(n1))) bad(`the shares ${ps} (yours ${pc(cnt.get(u))}%, the answer ${pc(n1)}%)`);
        if (/同じくらい|ほぼ同じ数/.test(w) && cnt.get(u) < 0.8 * n1) bad('"as often" but it is not'); }
      else { if (ps.some(x => x !== pc(n1))) bad(`a share for a move outside the counts (${ps})`);
        const lim = P.cand.length < 5 ? 0.03 : Math.min(...P.cand.map(c => c[1])) / N; const fk = w.match(/多く指される(\d+)つの手|よく選ぶ(\d+)つの手/); if (fk && +(fk[1] || fk[2]) !== P.cand.length) bad(`the record keeps ${P.cand.length} moves`); if (fk && P.cand.length < 5) bad('the record keeps every move of 3% — say it is hardly played'); if (/ほとんど指されない|めったにいない/.test(w) && lim > 0.05) bad(`"hardly played" but it may be played up to ${Math.round(lim * 100)}%`); }
      const F = X.chFacts(P.fen, u), loss = best - val(u), q = after(u), to = u.slice(2, 4);
      if (/に取られ|がねらえる|のえじき/.test(w)) { const by = q.legal().some(m => q.uci(m).slice(2, 4) === to); if (!by || loss < 50) bad(`not lost at once (taken: ${by}, the engine ${loss} below)`); }
      if (/取り返しそびれ|取り返せず/.test(w) && !(kA === 'recap' && loss >= 50)) bad(`not a missed take-back (the engine ${loss} below)`);
      if (/キャスリングできなくなる|キャスリングの権利がなくなる/.test(w) && !(castleR && F.king && !F.castle)) bad('no right to castle is lost');
      if (/キャスリングが遅れ/.test(w) && kA !== 'castle') bad('the answer is not castling');
      if (/クイーンを動かす|クイーンの出動/.test(w) && F.pc !== 'q') bad('not a queen move');
      if (/ルーク/.test(w) && /\{x\}だとルーク|^[^。]*ルークは序盤/.test(w) && F.pc !== 'r') bad('not a rook move');
      if (/同じ駒をもう一度|同じ駒で2手/.test(w) && !('nb'.includes(F.pc) && !F.dev)) bad('not a piece moved again');
      if (/ポーンの手/.test(w) && F.pc !== 'p') bad('not a pawn move');
      if (/端のポーン|端っこの手/.test(w) && !(F.pc === 'p' && F.flank)) bad('not a flank pawn');
      if (/まだ出ていない駒/.test(w)) { let home = 0; for (const c of ['b', 'c', 'f', 'g']) { const pp2 = pos.b[E.sqOf(c + (white ? '1' : '8'))]; if (pp2 && ((pp2 & 8) === 0) === white && [2, 3].includes(pp2 & 7)) home++; } if (!home) bad('every minor piece is out already'); }
    }
  }
  return out;
}
// ⑤ ⑥ of an opening's drill (picks: the other openings' drills, { id: [indices] })
function chessOpenSet(ctx, s, drill, picks) {
  const out = [], a = (j, m) => out.push(`q${j + 1} ${m}`), others = [];
  ctx.fixed.forEach(([w, b]) => others.push([w, b]));
  Object.entries(picks || {}).forEach(([id, d]) => { if (id === s.id) return; const g = ctx.OP.sets.find(x => x.id === id); d.forEach(k => others.push([`opening ${id} ${k}`, ctx.brd(g.problems[k].fen)])); });
  const ans = new Map(), kinds = new Map(); let prevD = -1;
  drill.forEach((k, j) => { const P = s.problems[k], B = ctx.brd(P.fen), Bs = ctx.swap(B), A = P.cand[0][0], white = P.fen.split(' ')[1] === 'w';
    for (const [w, b] of others) { const d = Math.min(ctx.dist(B, b), ctx.dist(Bs, b)); if (d <= 4) { a(j, `⑤ ${d} squares from ${w}`); break; } }
    drill.slice(0, j).forEach((k2, j2) => { const d = ctx.dist(B, ctx.brd(s.problems[k2].fen)); if (d <= 4) a(j, `⑤ ${d} squares from q${j2 + 1} of the same opening`); });
    ans.set(A, (ans.get(A) || 0) + 1); if (ans.get(A) === 3) a(j, `⑤ the answer ${A} a third time`);
    const kd = ctx.X.chKind(ctx.X.chFacts(P.fen, A), A, white); kinds.set(kd, (kinds.get(kd) || 0) + 1); if (kinds.get(kd) === 4 && kd !== 'other') a(j, `⑤ a ${kd} move a fourth time`);
    const d = chessOpenD(P); if (d < prevD) a(j, `⑥ easier than the one before (d ${d.toFixed(1)} after ${prevD.toFixed(1)})`); prevD = Math.max(prevD, d); });
  if (drill.length >= 2 && chessOpenD(s.problems[drill[drill.length - 1]]) <= chessOpenD(s.problems[drill[0]])) out.push('q0 ⑥ the last is not harder than the first');
  return out;
}
function chessOpen() {
  const fs = require('fs'), out = [], ctx = chessOpenCtx();
  const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), app = fs.readFileSync(path.join(ROOT, 'chess/app.js'), 'utf8');
  // ⑨ the same points in both; ⑥ the drill's order in both; 追3 a move that is not right does not go on by itself in the 2D
  if (!app.includes('if (P._freq) { if (P._acc && P._acc.has(m)) return 20; const c = P._freq.get(m) || 0, top = P.cand[0][1]; return c >= top ? 20 : c ? Math.max(4, Math.round(20 * Math.sqrt(c / top))) : 0; }')) out.push({ step: '-', q: 0, msg: '⑨ chess/app.js problemPoints (freq) changed' });
  if (!src.includes('if (P.cand) { if (P.acc && P.acc.includes(u)) return 20; const c = (P.cand.find(x => x[0] === u) || [0, 0])[1], top = P.cand[0][1]; return c >= top ? 20 : c ? Math.max(4, Math.round(20 * Math.sqrt(c / top))) : 0; }')) out.push({ step: '-', q: 0, msg: '⑨ the 3D CHESS.points (cand) changed' });
  if (!app.includes('const pool = g.drill ? shuffle(g.drill.slice()).slice(0, 5).sort((a, b) => g.drill.indexOf(a) - g.drill.indexOf(b)).map(i => g.problems[i])')) out.push({ step: '-', q: 0, msg: '⑥ the 2D practice does not keep the drill order' });
  if (!src.includes('const probs = s.drill ? shuffle(s.drill.slice()).slice(0, 5).sort((a, b) => s.drill.indexOf(a) - s.drill.indexOf(b)).map(i => s.problems[i])')) out.push({ step: '-', q: 0, msg: '⑥ the 3D practice does not keep the drill order' });
  if (!app.includes("lsAuto(pts >= 16, moveDur() + 1100)")) out.push({ step: '-', q: 0, msg: '追3 the 2D opening practice goes on by itself after a move that is not right' });
  const picks = {}; ctx.OP.sets.forEach(s => { if (s.drill) picks[s.id] = s.drill; });
  for (const s of ctx.OP.sets) { if (!s.drill) continue;
    if (s.drill.length < 5) out.push({ step: s.id, q: 0, msg: `③ ${s.drill.length} problems in the drill (5 are drawn)` });
    s.drill.forEach((k, j) => chessOpenProblem(ctx, s, s.problems[k], k).forEach(m => out.push({ step: s.id, q: j + 1, msg: m })));
    chessOpenSet(ctx, s, s.drill, picks).forEach(m => out.push({ step: s.id, q: +m.slice(1, m.indexOf(' ')), msg: m.slice(m.indexOf(' ') + 1) })); }
  return out;
}
// (2026-11-24 第2期・担当A、追14・追1) hex: the 3D warm-up (atlas/lessons3d.js HEX.lesson: explain = the step's problem 1 with its
// answers green → try = the same problem turned 180°; texts hex/ramps3d.json ja and ゴイシペン's hex/voice-pen-ja.js ramp:<step>/*):
// the green cells are the answers (hxOk) and legal, the turned try's answers are the turned cells and do the same job, the words of
// the explain (body) and of the praise (y) are the board's facts (see below), and the warm-up's problem is not asked again in the 3D
// problems (追1) — no other problem of the step is it or its 180° turn within 2 cells.
function hex(opt) {
  const fs = require('fs'), E = require(path.join(ROOT, 'hex/engine.js')), L = (opt && opt.lessons) || JSON.parse(fs.readFileSync(path.join(ROOT, 'hex/lessons.json'), 'utf8'));
  const RT = (opt && opt.ramps) || JSON.parse(fs.readFileSync(path.join(ROOT, 'hex/ramps3d.json'), 'utf8'));
  const src = (opt && opt.src) || fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8');
  const VP = (() => { const w = {}; new Function('window', fs.readFileSync(path.join(ROOT, 'hex/voice-pen-ja.js'), 'utf8'))(w); const o = w.I18N && (w.I18N['ja@pen'] || w.I18N.ja) || w; return (opt && opt.voice) || o; })();
  const out = [], add = (id, m) => out.push({ step: id, q: 0, msg: 'warm-up: ' + m }), plain = t => String(t || '').replace(/<[^>]+>/g, '');
  const hxOk = P => { if (P.ok) return P.ok.slice(); const best = Math.max(...P.sc.map(e => e[1])); return P.sc.filter(e => e[1] >= best - 15).sort((a, b) => b[1] - a[1]).map(e => e[0]); };
  const h0 = src.indexOf('LKEY: \'aicoding-hex-lessons\''), HX = src.slice(h0, src.indexOf('points(P, m) {   // = hex/app.js problemPoints', h0));
  if (!HX.includes('ok = hxOk(P0)') || !HX.includes("sr = Object.assign({}, sp, { b: String(sp.b).split('').reverse().join('') })")) add('-', 'the 3D warm-up is no longer problem 1 (explain) and its 180° turn (try): update this check');
  if (!/\}\)\.filter\(\(o, i\) => !\(ramp && i === 0\)\)/.test(HX)) add('-', '追1 the 3D problems ask the warm-up\'s problem again (problem 1 = the explain)');
  const dist = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d; }, rev = b => String(b).split('').reverse().join('');
  // 追32 (2026-11-24): the shapes the problems use are the ones the intro teaches — b_save: every answer is the other cell of an
  // intruded bridge, between two stones or between a second-row stone and the edge; when the edge kind is asked, the intros
  // (2D ja・en, 3D ゴイシペン) say that the edge links up like a stone
  { const st = L.steps.find(x => x.id === 'b_save'), I = (() => { const w = {}; new Function('window', fs.readFileSync(path.join(ROOT, 'hex/i18n.js'), 'utf8'))(w); return w.I18N || {}; })();
    const j3 = (src.match(/      b_save: '([^']*)',/) || [])[1] || ''; let edge = 0;
    if (st) st.problems.forEach((P, j) => { const sp = P.s, n = sp.n, N = n * n, q = E.Pos.from(sp), me = sp.side, op = 3 - me, { NB } = E.geo(n), c = P.ok[0];
      const d = x => me === 1 ? Math.min(Math.floor(x / n), n - 1 - Math.floor(x / n)) : Math.min(x % n, n - 1 - x % n);
      let ss = false; for (let x = 0; x < N && !ss; x++) for (let y = x + 1; y < N; y++) if (q.at(x) === me && q.at(y) === me && !NB[x].includes(y)) { const cm = NB[x].filter(z => NB[y].includes(z)); if (cm.length === 2 && cm.includes(c) && cm.some(z => q.at(z) === op)) { ss = true; break; } }
      const ed = d(c) === 0 && NB[c].some(x => q.at(x) === me && d(x) === 1 && NB[x].filter(z => d(z) === 0).length === 2 && NB[x].filter(z => d(z) === 0).every(z => z === c || q.at(z) === op));
      if (!ss && !ed) out.push({ step: 'b_save', q: j + 1, msg: '追32 the answer is not the other cell of an intruded bridge' });
      if (!ss && ed) edge++; });
    if (edge) [['2D ja', /辺/, plain((I.ja || {})['ls.b_save.intro'])], ['2D en', /edge/i, plain((I.en || {})['ls.b_save.intro'])], ['3D ja', /辺/, plain(j3)]].forEach(([w, re, t]) => { if (!re.test(t)) out.push({ step: 'b_save', q: 0, msg: `追32 ${edge} problems are bridges to the edge, the ${w} intro does not say the edge links up: ${t}` }); }); }
  L.steps.forEach(st => { const id = st.id, P0 = (st.problems || [])[0]; if (!P0) return;
    const T = f => [plain((RT[id + '/' + f] || {}).ja), plain(VP['ramp:' + id + '/' + f])], a = m => add(id, m);
    if (!(RT[id + '/t'] && RT[id + '/g'])) return;   // (no warm-up for this step)
    if (!T('body')[1] || !T('y')[1]) a('ゴイシペン\'s words (voice-pen-ja.js ramp:' + id + '/body, y) missing');
    const sp = P0.s, n = sp.n, N = n * n, q = E.Pos.from(sp), me = sp.side, op = 3 - me, { NB } = E.geo(n), ok = hxOk(P0), cells = ok.filter(c => c !== 1023);
    const rq = E.Pos.from(Object.assign({}, sp, { b: rev(sp.b) })), rot = c => c === 1023 ? c : N - 1 - c, nm = c => E.nameOf(c, n);
    if (q.winner()) a('the position is already won');
    cells.forEach(c => { if (!q.legal(c)) a(`green ${nm(c)} is not an empty cell`); if (!rq.legal(rot(c))) a(`the turned try's answer ${nm(rot(c))} is not empty`); });
    const sameJob = (Q, M, s) => { const W = Q.winCells(s).sort((x, y) => x - y).join(); return W; };
    if (id === 'b_connect' || id === 'b_block') { const s = id === 'b_connect' ? me : op;
      if (sameJob(q, 0, s) !== cells.slice().sort((x, y) => x - y).join()) a(`green ${cells.map(nm)} ≠ the cells that connect at once ${q.winCells(s).map(nm)}`);
      if (sameJob(rq, 0, s) !== cells.map(rot).sort((x, y) => x - y).join()) a('the turned try: its answers do not connect / stop at once'); }
    const d = c => me === 1 ? Math.min(Math.floor(c / n), n - 1 - Math.floor(c / n)) : Math.min(c % n, n - 1 - c % n);
    const edgeCells = c => NB[c].filter(x => d(x) === 0 && d(c) === 1), common = (x, y) => NB[x].filter(z => NB[y].includes(z));
    const after = c => { const r = q.clone(); r.b[c] = me; r._w = undefined; return r; };
    const say = (re, cond, what) => T('body').forEach((t, j) => { if (re.test(t) !== cond) a(`${j ? 'voice' : 'ramps3d'} body ${cond ? 'does not say' : 'says'} ${what}: ${t}`); });
    // how many green cells: the words for one cell never stand for two
    say(/緑の印の点<?\/?b?>?は(2つ|ふたつ)/, cells.length + (ok.includes(1023) ? 1 : 0) >= 2 && id !== 'b_connect' && id !== 'b_block' && id !== 't_edge3' ? true : false, 'that there are two green cells');
    if (id === 'b_bridge') { const c = cells[0], r = after(c), W = r.winCells(me);
      if (W.length !== 2) a(`"つながり方が2通り": after the green cell ${W.length} cells connect at once`);
      if (r.moves().some(x => { if (x === 1023) return false; const r2 = r.clone(); r2.b[x] = op; r2._w = undefined; return !r2.winCells(me).length; })) a('"相手は片方しか止められない": one reply stops both'); }
    if (id === 'b_save') { const c = cells[0];
      const ss = []; for (let x = 0; x < N; x++) for (let y = x + 1; y < N; y++) if (q.at(x) === me && q.at(y) === me && !NB[x].includes(y)) { const cm = common(x, y); if (cm.length === 2 && cm.includes(c) && cm.some(z => q.at(z) === op)) ss.push([x, y]); }
      const ed = NB[c].filter(x => q.at(x) === me && d(x) === 1 && d(c) === 0 && edgeCells(x).includes(c) && edgeCells(x).some(z => q.at(z) === op));
      if (!ss.length && !ed.length) a('green is not the other cell of an intruded bridge');
      say(/2つの石/, ss.length > 0, '"2つの石" (a bridge between two stones)'); say(/辺/, !ss.length && ed.length > 0, '"辺" (the bridge to the edge)');
      T('y').forEach((t, j) => { if (/辺/.test(t) !== (!ss.length && ed.length > 0)) a(`${j ? 'voice' : 'ramps3d'} y: ${t}`); }); }
    if (id === 'b_edge' || id === 't_ladder' || id === 't_edge3') cells.forEach(c => { if (d(c) !== 1) a(`"2段目": green ${nm(c)} is on row ${d(c) + 1}`);
      if (id !== 't_ladder' && edgeCells(c).some(x => q.at(x))) a(`"下の2マスが空いて": below ${nm(c)} is not empty`); });
    if (id === 't_ladder') { if (![...q.b].some((v, i) => v === me && d(i) === 0 && !cells.some(c => NB[c].includes(i)))) a('"ラダーエスケープ": no own stone on the edge row ahead');
      if (![...q.b].some((v, i) => v === op && d(i) === 0)) a('"相手が1段目をふさぐ": no opponent stone on the first row'); }
    if (id === 't_edge3') { const z = [...q.b].map((v, i) => v === me && d(i) === 2 ? i : -1).filter(i => i >= 0); if (!z.length) a('"3段目の石": none');
      cells.forEach(c => { if (!z.some(x => { const cm = common(x, c); return cm.length === 2 && cm.every(y => !q.at(y)); }) || edgeCells(c).some(x => q.at(x))) a(`"ブリッジか2段目のテンプレートが残る": not so at ${nm(c)}`); }); }
    if (id === 't_stop') cells.forEach(c => { for (let x = 0; x < N; x++) for (let y = x + 1; y < N; y++) if (q.at(x) === op && q.at(y) === op && !NB[x].includes(y)) { const cm = common(x, y); if (cm.length === 2 && cm.includes(c) && cm.every(z => !q.at(z))) a(`"ブリッジではない1か所": green ${nm(c)} is inside a bridge`); } });
    if (id === 's_center') { if (q.count(1) + q.count(2)) a('"1手目": the board is not empty');
      cells.forEach(c => { const r = Math.floor(c / n), k = c % n; if (!(r + k === n - 1)) a(`"中央か短い対角線": ${nm(c)} is on neither`); });
      if (cells.length === 2) say(/中央|まん中/, true, 'the centre'); }
    if (id === 's_swap') { if (q.count(1) !== 1 || q.count(2) || me !== 2 || !sp.sw) a('"赤の1手目を見て": not one red stone with Blue to move under the swap rule');
      if (ok.length !== 1 || ok[0] !== 1023) a('"スワップ…が正解": the swap is not the only green'); }
    if (id === 's_block') cells.forEach(c => { if (NB[c].some(x => q.at(x) === op)) a(`"少し離れて": green ${nm(c)} touches an opponent stone`); });
    if (id === 's_plan') cells.forEach(c => { const r = after(c); if (!(r.need(me) < q.need(me) && r.need(op) > q.need(op))) a(`"自分を助けて、相手をふさぐ": ${nm(c)} (${q.need(me)}→${r.need(me)}, ${q.need(op)}→${r.need(op)})`); });
    // 追1: the other problems of the step are not the warm-up or its turn
    st.problems.slice(1).forEach((p, j) => { if (p.s.n === n && Math.min(dist(p.s.b, sp.b), dist(p.s.b, rev(sp.b))) <= 2 && (q.count(1) + q.count(2) > 1)) a(`追1 problem ${j + 2} is the warm-up's position (or its turn) within 2 cells`); });
  });
  return out;
}
// (2026-11-24 担当D) janggi on the 3D table: the puzzles (all themes) — tools/lesson-verify-janggi.js
const janggi = () => { const J = require('./lesson-verify-janggi.js'); return J.puzzles().concat(J.lessons()); };
// (2026-11-24 第2期・担当B) hex openings (hex/open): the practice problems of the sets marked verified (hex/tools/op_curate.js).
// ① the stored best is the top of the stored values at two budgets of the engine's search (P.sc the longer, P.sc2 the shorter; with
// --deep both are searched again with the native engine, /tmp/hexn), best first; ② every other scored move is worth 12 points or
// less in the 2D problemPoints / 3D HEX.points at both budgets (a move that is not scored counts as the worst − 60, as in the
// scoring); ③ 3+ legal moves; ④ the side to move is the set's (set.side), P.mv replays from the set's three named moves (g.moves)
// to the board, the game is not decided (|v| ≤ 600); ⑤ 3+ cells (more than two moves; the 180° turn and the colour-swap mirror too)
// from every line position of every set (the study shows them with the answer — 追1), every lesson / puzzle board and the other
// problems, an answer cell at most twice and one kind of move (HXA.kind) at most 3 times in a set; ⑥ easy → hard (hxD: the stones
// on the board + the points of the second move) and the 2D / 3D draw 5 and keep the pool's order; ⑦⑧ ゴイシペン's words (opJa) at
// every place in the lesson for every legal move: no placeholder, the shape the praise and the hint name is the answer's (HXA.kind),
// the reason for a miss true on the board (an unanswered intrusion, a far / edge / adjacent / touching move as said); ⑨ the 2D and the
// 3D score alike.
const HXW = 29000;
const hxPts = (P, m, sc) => { sc = sc || P.sc; const val = new Map(sc), best = Math.max(...sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : (sc.length ? Math.min(...sc.map(e => e[1])) - 60 : -1000);
  const wr = v => v > HXW ? 1 : v < -HXW ? 0 : Math.max(0, Math.min(1, (v + 1000) / 2000));
  if (mine >= best - 15 && !(best > HXW && mine < best)) return 20; if (best > HXW && mine <= HXW) return mine > 400 ? 8 : 0; if (mine < -HXW && best >= -HXW) return 0;
  return Math.max(0, Math.round(20 * (1 - (wr(best) - wr(mine)) / 0.25))); };   // (= hex/app.js problemPoints, the 3D HEX.points)
const hxSyms = (b, n) => { const N = n * n, sw = x => x === 'r' ? 'b' : x === 'b' ? 'r' : '.', out = [b, '', '', ''];
  for (let i = 0; i < N; i++) { const r = (i / n) | 0, c = i % n; out[1] += b[N - 1 - i]; out[2] += sw(b[c * n + r]); out[3] += sw(b[N - 1 - (c * n + r)]); } return out; };
const hxDist = (a, b) => { if (a.length !== b.length) return 99; let best = 99; for (const x of hxSyms(b, Math.round(Math.sqrt(b.length)))) { let d = 0; for (let i = 0; i < a.length && d < best; i++) if (a[i] !== x[i]) d++; best = Math.min(best, d); } return best; };
const hxD = P => (P.s.b.match(/[rb]/g) || []).length + Math.max(0, ...P.sc.filter(e => e[0] !== P.best).map(e => hxPts(P, e[0])));
function hxCtx(O) {
  const fs = require('fs'), E = require(path.join(ROOT, 'hex/engine.js')), pool = [];
  const walk = (o, who) => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) { o.forEach((x, i) => walk(x, who + ' ' + (i + 1))); return; } if (o.s && o.s.b && o.s.n) pool.push([who, o.s.b, null]); for (const k in o) if (k !== 's') walk(o[k], who + (isNaN(+k) ? ' ' + k : '')); };
  walk(JSON.parse(fs.readFileSync(path.join(ROOT, 'hex/lessons.json'), 'utf8')).steps, 'lesson');
  walk(JSON.parse(fs.readFileSync(path.join(ROOT, 'hex/puzzles.json'), 'utf8')).themes, 'puzzle');
  O.sets.forEach(g => { const p = new E.Pos(g.n, g.swap); g.study.line.forEach((m, k) => { p.play(m); pool.push([`line ${g.id} ${k + 1}`, p.spec().b, null]); });
    (g.problems || []).forEach((q, j) => pool.push([`open ${g.id} q${j + 1}`, q.s.b, g.id])); });
  return pool;
}
const hxNear = (pool, spec, id, extra) => { let d = 99; for (const [, b, own] of pool) if (own !== id) d = Math.min(d, hxDist(spec.b, b)); for (const q of extra || []) if (q.s !== spec) d = Math.min(d, hxDist(spec.b, q.s.b)); return d; };
function hxProblem(P, P2) {   // ① ② ③ ④ (value side) of one problem from its two stored searches
  const E = require(path.join(ROOT, 'hex/engine.js')), w = [], q = E.Pos.from(P.s);
  if (q.winner()) return ['④ the game is already over'];
  for (const [nm, X] of [['long', P], ['short', P2]]) { const sc = X.sc || [];
    if (!sc.length) { w.push(`① no ${nm} values`); continue; }
    if (sc.some(([m]) => !q.legal(m))) w.push(`① a ${nm} scored move is not legal`);
    if (sc.some((e, i) => i && e[1] > sc[i - 1][1])) w.push(`① the ${nm} values are not best first`);
    if (sc[0][0] !== P.best) w.push(`① the ${nm} search's top is ${sc[0][0]}, not the answer ${P.best}`);
    const p2 = Math.max(0, ...sc.filter(e => e[0] !== P.best).map(e => hxPts(P, e[0], sc))); if (p2 > 12) w.push(`② a second move worth ${p2} points (${nm})`);
    if (sc.length < 6) w.push(`② only ${sc.length} moves scored (${nm})`); }
  let legal = 0; for (let m = 0; m < P.s.n * P.s.n; m++) if (q.legal(m)) legal++; if (legal < 3) w.push(`③ ${legal} legal moves`);
  if (Math.abs(P.sc[0][1]) > 600) w.push(`④ decided already (${P.sc[0][1]})`);
  return w;
}
let hxoX = null;
function hxX() {
  const fs = require('fs'), vm = require('vm'), E = require(path.join(ROOT, 'hex/engine.js')), src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8');
  if (!hxoX) { const sl = (a, b) => src.slice(src.indexOf(a), src.indexOf(b)), line = a => src.slice(src.indexOf(a)).split('\n')[0] + '\n';
    const W = { HexEngine: E }, ctxV = vm.createContext({ window: W, console });
    hxoX = vm.runInContext(line('  const fill = ') + sl('  const HXA = (() => {', '  function hxNoteJa(') + line('  const HXM = ') +
      'const HEX_WINT = 29000;\n' + 'const HX = { points' + (() => { const a = src.indexOf('    points(P, m) {   // = hex/app.js problemPoints'); return src.slice(a + 10, src.indexOf('    opening(key, lang) {', a)); })() + 'opJa' + (() => { const a = src.indexOf('    opJa(P, LI, i, probs, used) {'); return src.slice(a + 8, src.indexOf('    // the warm-up: its position, marks, the right moves', a)); })() + '};\n;({ HXA, HXJ_OP, HX })', ctxV); }
  return hxoX;
}
function hexOpen(opt) {
  const fs = require('fs'), vm = require('vm'), E = require(path.join(ROOT, 'hex/engine.js'));
  const O = (opt && opt.op) || JSON.parse(fs.readFileSync(path.join(ROOT, 'hex/openings.json'), 'utf8'));
  const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), app = fs.readFileSync(path.join(ROOT, 'hex/app.js'), 'utf8');
  const out = [], add = (id, j, m) => out.push({ step: id, q: j + 1, msg: m });
  // ⑨ ⑥ the scoring and the order, 2D and 3D
  const PT = "const val = new Map(P.sc), best = Math.max(...P.sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : (P.sc.length ? Math.min(...P.sc.map(e => e[1])) - 60 : -1000);";
  if (!app.includes(PT) || !src.includes(PT) || !app.includes('return Math.max(0, Math.round(20 * (1 - loss / 0.25)));') || !src.includes('return Math.max(0, Math.round(20 * (1 - (wr(best) - wr(mine)) / 0.25)));')) add('-', -1, '⑨ the 2D problemPoints / the 3D HEX.points changed');
  if (!app.includes('problems: g.verified ? idx.slice(0, 5).sort((a, b) => a - b).map(i => g.problems[i]) : pool.slice(0, 5)')) add('-', -1, '⑥ the 2D opening practice does not keep the verified pool\'s order');
  if (!src.includes('const probs = g.verified ? shuffle((g.problems || []).map((p, i) => i)).slice(0, 5).sort((a, b) => a - b).map(i => g.problems[i]) : shuffle(g.problems || []).slice(0, 5)')) add('-', -1, '⑥ the 3D opening practice does not keep the verified pool\'s order');
  const X = hxX(), pool = hxCtx(O);
  const plain = t => String(t).replace(/<[^>]+>/g, '');
  for (const g of O.sets) { if (!g.verified) continue; const id = g.id, P0 = g.problems || [], LI = O.sets.indexOf(g), named = g.moves.split(' ');
    if (P0.length < 5) add(id, -1, `③ ${P0.length} problems in the pool (5 are drawn)`);
    let prevD = -1; const ans = new Map(), kinds = new Map();
    P0.forEach((P, j) => { const a = m => add(id, j, m), q = E.Pos.from(P.s);
      hxProblem(P, { sc: P.sc2 }).forEach(a);
      // ④ the way there and the side
      { const p = new E.Pos(g.n, g.swap); let bad = !(P.mv && P.mv.length >= named.length);
        (P.mv || []).forEach((m, k) => { if (bad) return; if (!p.legal(m)) { bad = true; return; } if (k < named.length && E.nameOf(m, g.n) !== named[k]) bad = true; p.play(m); });
        if (bad) a('④ P.mv does not replay from the set\'s named moves'); else if (p.spec().b !== P.s.b || p.side !== P.s.side) a('④ P.mv does not reach the position'); }
      if (P.s.side !== g.side) a(`④ the mover is not the set's side (${g.side})`);
      // ⑤
      const dn = hxNear(pool, P.s, id, P0); if (dn <= 2) a(`⑤ ${dn} cells from another board`);
      const fb = X.HXA.facts(P.s, P.best), kb0 = X.HXA.kind(fb), kb = P.s.sw && kb0 !== 'swap' ? 'noswap' : kb0;
      ans.set(P.best, (ans.get(P.best) || 0) + 1); if (ans.get(P.best) === 3) a(`⑤ the answer ${E.nameOf(P.best, g.n)} a third time`);
      kinds.set(kb, (kinds.get(kb) || 0) + 1); if (kinds.get(kb) === 4) a(`⑤ a 4th ${kb} answer`);
      // ⑥
      const d = hxD(P); if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d);
      // ⑦⑧ the words, at each place of the lesson, for every legal move
      const legal = []; for (let m = 0; m < g.n * g.n; m++) if (q.legal(m)) legal.push(m);
      const NB = E.geo(g.n).NB, s = P.s.side, o = 3 - s, at = c => P.s.b[c] === 'r' ? 1 : P.s.b[c] === 'b' ? 2 : 0;
      const savable = fb.save > 0;   // (an own bridge cut into: the answer answers it)
      for (let i = 0; i < 5; i++) { const probs = P0.slice(0, 5); let W; try { W = X.HX.opJa.call(X.HX, P, LI, i, probs, {}); } catch (e) { a("⑧ the words fail: " + e.stack.split("\n").slice(0, 3).join(" | ")); break; }
        const ask = plain(W.ask), hint = plain(W.hintTx); if (/\{|undefined|NaN/.test(ask + hint)) a(`⑧ the question / hint 「${ask}」「${hint}」`);
        if (!ask.includes(s === 2 ? '青' : '赤')) a(`⑧ the question does not name the side 「${ask}」`);
        if (!(X.HXJ_OP.hint[kb] || X.HXJ_OP.hint.open).map(plain).includes(hint)) a(`⑧ the hint is not the answer's shape (${kb}) 「${hint}」`);
        const gd = plain(W.good.call({}, P.best)); if (/\{|undefined|NaN/.test(gd)) a(`⑧ the praise 「${gd}」`);
        if (!(X.HXJ_OP.why[kb] || X.HXJ_OP.why.open).some(t => gd.includes(plain(t)))) a(`⑧ the praise is not the answer's shape (${kb}) 「${gd}」`);
        for (const u of legal) { if (u === P.best) continue; const w = plain(W.ng.call({}, u)), bad = m => a(`⑦ ${E.nameOf(u, g.n)}: ${m} 「${w}」`);
          if (/\{|undefined|NaN/.test(w)) { bad('a placeholder'); continue; }
          if (X.HX.points(P, u) >= 20) { bad('a full-points move counted as a miss'); continue; }
          const fu = X.HXA.facts(P.s, u), ku = X.HXA.kind(fu);
          if (/ブリッジに受けていない|割りこみを放っておく|受けそびれたブリッジ/.test(w) && !(savable && !fu.save)) bad('no own bridge is left unanswered');
          if (/もう1つの割りこまれたほう|大事なほうのブリッジ/.test(w) && !(savable && fu.save)) bad('yours answers no other cut bridge');
          if (/ほかの石から遠すぎ|戦いの場所から離れすぎ|まわりに石がなくて/.test(w) && !(fu.dOpp >= 4 && fu.dOwn >= 4)) bad(`the move is ${fu.dOpp} / ${fu.dOwn} from the stones`);
          if (/割りこむ先手を逃し|すき間をつくチャンス|受けさせる一手を打てず/.test(w) && !(fb.intrude && !fu.intrude)) bad('not an intrusion missed');
          if (/くっつけて止めると|となりで止めても|ぴったりつけると/.test(w) && !fu.touch) bad('the move touches nothing');
          if (/離れすぎて|間があきすぎて|遠くで待っても/.test(w) && fu.touch) bad('the move touches the opponent');
          if (/1マスずつしか進めず|となりにつなぐだけ|歩みがおそく/.test(w) && !(fu.adj && fb.bridge)) bad('not an adjacent move against a bridge');
          if (/ふちの1段目|辺そのものに打つ|いちばん外側の列/.test(w) && !fu.onEdge) bad('not on the edge');
          if (/まん中を相手に先に取られ/.test(w) && !fb.center) bad('the answer is not the centre');
          if (/もらっても得が小さい石|ふちの弱い石|うまみの少ない石/.test(w) && u !== 1023) bad('not a swap');
        } }
    });
  }
  if (opt && opt.deep) hxDeep(O, out);
  return out;
}
function hxDeep(O, out) {   // ① ② again: the native engine searches every verified problem anew at the two budgets
  const cp = require('child_process'), fs = require('fs'), E = require(path.join(ROOT, 'hex/engine.js')), bin = process.env.HEXN || '/tmp/hexn', MS = { 7: 1500, 9: 2000, 11: 2500 };
  if (!fs.existsSync(bin)) cp.execSync(`gcc -O3 -march=native -DNATIVE -w -o ${bin} tools/native.c -lm`, { cwd: path.join(ROOT, 'hex') });
  const run = cmds => cp.spawnSync(bin, ['serve'], { input: cmds.join('\n') + '\nquit\n', encoding: 'utf8', maxBuffer: 1 << 26 }).stdout.trim().split('\n');
  const sp = s => `setpos ${s.n} ${s.side} ${s.sw ? 1 : 0} ${s.b}`;
  for (const g of O.sets) { if (!g.verified) continue;
    g.problems.forEach((P, j) => { const sc = {};
      for (const [nm, ms] of [['short', MS[g.n]], ['long', MS[g.n] * 2]]) { const r = run([sp(P.s), `analyze ${ms * 2} 0 12`]), a = r[1].trim().split(/\s+/).map(Number), L = [];
        for (let i = 0; i < a[0]; i++) L.push(a[2 + 3 * i]);
        const cmds = []; L.forEach(m => { const p = E.Pos.from(P.s); p.play(m); cmds.push(sp(p.spec()), `analyze ${ms} 0 1`); });
        const rr = run(cmds); sc[nm] = L.map((m, i) => { const p = E.Pos.from(P.s); p.play(m); if (p.winner()) return [m, 29999]; const b = rr[2 * i + 1].trim().split(/\s+/).map(Number); return [m, Math.max(-29999, Math.min(29999, -(b[0] ? b[3] : 0)))]; }).sort((x, y) => y[1] - x[1]); }
      hxProblem({ s: P.s, best: P.best, sc: sc.long }, { sc: sc.short }).forEach(m => out.push({ step: g.id, q: j + 1, msg: 'deep ' + m })); });
  }
}
const ur = () => require('./lesson-verify-ur.js')();   // (2026-11-24 担当C：ウルのレッスン、tools/lesson-verify-ur.js)
const senet = () => require('./lesson-verify-senet.js')();   // (2026-11-24 担当C：セネトのレッスン、tools/lesson-verify-senet.js)
// (2026-11-24 第2期・担当B) xiangqi openings (xiangqi/open): the practice pool of every opening marked verified (xiangqi/openings.json,
// chosen by xiangqi/tools/op_curate.js). ① the stored values are the engine's fixed-depth values (depth 8, a fresh game: deterministic)
// of every legal move, the answer first; ② the moves worth 20 points (problemPoints) are the same at depth 7 and 8, at most 2, every
// other move 12 points or less at both depths (追3, 追4); ③ 3+ legal moves, 2+ moves besides the answers within 300 of the best (not
// "the one move that does not hang a piece"), the answers a third of the moves at most; ④ the path (P.mv) replays legally from the start
// through the opening's named moves to the stored board, the side to move is the opening's (追5), nobody is winning (|best| ≤ 350);
// ⑤ more than 4 squares (two moves) from every other xiangqi board (lessons, warm-ups, puzzles, every opening's problems; mirrored
// too), an answer at most twice and one kind of move (xqKind) at most 3 times in an opening; ⑥ easy → hard (d = the moves before +
// the 2nd move's points) and the 2D / 3D draw 5 in the pool's order (追9); ⑦⑧ ショウギツネ's words (xqOpJa) at every place of the
// lesson: every wrong legal move gets a board fact (no general line: 追8), and the fact is right on the board (recomputed here:
// a piece left to be taken / taken for nothing, a capture missed, a take-back missed, a piece no longer attacked, no check), the
// question names no placeholder, 「すぐ取り返す」 only right after the capture, 「ただで」 only when the capture cannot be taken back;
// ⑨ the 2D and the 3D share problemPoints (the same formula).
function xiangqiOpen(opt) {
  const fs = require('fs'), CU = require(path.join(ROOT, 'xiangqi/tools/op_curate.js')), E = require(path.join(ROOT, 'xiangqi/engine.js'));
  const OP = (opt && opt.op) || JSON.parse(fs.readFileSync(path.join(ROOT, 'xiangqi/openings.json'), 'utf8'));
  const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), app = fs.readFileSync(path.join(ROOT, 'xiangqi/app.js'), 'utf8');
  const out = [], add = (id, j, m) => out.push({ step: id, q: j + 1, msg: m }), W = CU.words();
  const PTS = 'const val = new Map(P.sc), best = Math.max(...P.sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : -WIN;';
  if (!app.includes(PTS) || !src.includes(PTS) || !app.includes('if (mine >= best - 10 && !(best > WINT && mine < best)) return 20;') || !src.includes('if (mine >= best - 10 && !(best > WINT && mine < best)) return 20;')) add('-', -1, '⑨ the 2D problemPoints / the 3D XIANGQI.points changed');
  if (!app.includes('const pool = idx.slice(0, 5).sort((a, b) => a - b).map(i => g.problems[i]);')) add('-', -1, '⑥ the 2D opening practice does not keep the pool order');
  if (!src.includes('const probs = shuffle((g.problems || []).map((p, i) => i)).slice(0, 5).sort((a, b) => a - b).map(i => g.problems[i]), E = window.XiangqiEngine')) add('-', -1, '⑥ the 3D opening practice does not keep the pool order');
  const others = CU.otherBoards({ sets: [] }), all = [];
  OP.sets.forEach(g => (g.problems || []).forEach((q, j) => all.push([`open ${g.id} q${j + 1}`, CU.bd(q.s)])));
  const VAL = W.XQV || [0, 100, 2, 2, 4, 9, 4.5, 1], gap = new Set([...W.XQJ_OP.gap, ...W.XQJ_OP.late].map(x => x.replace(/\{x\}/g, '')));
  const ck = k => k === 'ok' ? '{m}' : '{x}';
  for (const g of OP.sets) { if (!g.verified) continue; const id = g.id, P0 = g.problems || [], side = g.side === 2 ? 1 : 0, nm = String(g.title.ja);
    if (P0.length < 5) add(id, -1, `③ ${P0.length} problems in the pool (5 are drawn)`);
    let prevD = -1; const ans = new Map(), kinds = new Map(), named = [];
    { let q = E.Pos.from(null); for (const n of g.moves.split(' ')) { const m = E.parse(q, n); if (m == null) { add(id, -1, `④ the named move ${n} is not legal`); break; } named.push(m); q = q.clone().play(m); } }
    P0.forEach((P, j) => { const a = m => add(id, j, m), mv = P.mv || [];
      // ④
      let q = E.Pos.from(null), okPath = mv.length >= named.length;
      mv.forEach((m, k) => { if (!okPath) return; if (!q.moves().includes(m) || (k < named.length && m !== named[k])) okPath = false; else q = q.clone().play(m); });
      if (!okPath) { a('④ P.mv does not replay from the opening\'s named moves'); return; }
      if (q.fen() !== P.s) a('④ P.mv does not reach the stored board');
      const p = E.Pos.from(P.s), legal = p.moves();
      if (p.side !== side) a(`④ the mover is not the opening's side (${g.side === 2 ? '黒' : '赤'})`);
      // ① ② ③
      const s7 = CU.values(mv, 7), s8 = CU.values(mv, 8), st = new Map(P.sc || []);
      if (s8.length !== st.size || s8.some(([m, v]) => st.get(m) !== v)) a('① the stored values are not the depth-8 values');
      if (legal.some(m => !st.has(m))) a('① a legal move has no value');
      if (!s8.length || s8[0][0] !== P.best || (P.sc[0] || [])[0] !== P.best) a('① the answer is not the engine\'s top move');
      const A7 = CU.acc(s7).sort().join(), A8 = CU.acc(s8);
      if (A7 !== A8.slice().sort().join()) a('② depth 7 and 8 do not agree on the right moves (追4)');
      if (A8.length > 2) a(`② ${A8.length} moves score 20`);
      const p2 = Math.max(CU.rest(s7), CU.rest(s8)); if (p2 > 12) a(`② the best wrong move scores ${p2} (追3)`);
      if (Math.abs(s8[0][1]) > 350) a(`④ the game is decided (${s8[0][1]})`);
      if (legal.length < 3) a(`③ ${legal.length} legal moves`);
      if (s8.filter(x => !A8.includes(x[0]) && x[1] >= s8[0][1] - 300).length < 2) a('③ fewer than 2 other moves keep the material (the only move)');
      if (A8.length * 3 > legal.length) a('③ a third of the moves are right');
      // ⑤
      const b = CU.bd(P.s);
      for (const [who, o] of others.concat(all)) { if (who === `open ${id} q${j + 1}`) continue; const e = CU.dist(o, b); if (e <= 4) a(`⑤ ${e} squares from ${who}`); }
      const FA = W.xqFacts(E, p, P.best), an = E.name(p, P.best), kd = W.xqKind(FA);
      ans.set(an, (ans.get(an) || 0) + 1); if (ans.get(an) === 3) a(`⑤ the answer ${an} a third time`);
      kinds.set(kd, (kinds.get(kd) || 0) + 1); if (kinds.get(kd) === 4) a(`⑤ a 4th ${kd} move`);
      // ⑥
      const d = mv.length + p2; if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d);
      // ⑦⑧ the board facts, recomputed
      const opp = p.side ^ 1, matOf = (x, c) => { let s = 0; for (let k = 0; k < 90; k++) { const y = x.at(k); if (y && E.colorOf(y) === c && E.typeOf(y) !== 1) s += VAL[E.typeOf(y)]; } return s; };
      const qa = p.clone().play(P.best), capA = p.at(E.mTo(P.best)) ? E.typeOf(p.at(E.mTo(P.best))) : 0, retakeA = qa.moves().some(r => E.mTo(r) === E.mTo(P.best));
      const last = mv[mv.length - 1], lastCap = last != null && E.replay(null, mv.slice(0, -1)).pos.at(E.mTo(last)) && E.mTo(last) === E.mTo(P.best);
      const thA = E.threats(qa, opp), aimsA = [...E.threats(qa, p.side)].filter(x => !E.threats(p, p.side).has(x)).map(x => VAL[E.typeOf(qa.at(x))]);
      const nmJ = n => ({ 王さま: 1, 仕: 2, 士: 2, 相: 3, 象: 3, 馬: 4, 車: 5, 炮: 6, 兵: 7, 卒: 7 })[n];
      for (let i = 0; i < 5; i++) { const V = W.xqOpVoice(id); let w; try { w = W.xqOpJa(E, P, nm, id.length * 2 + i, ck, V, i); } catch (e) { a('⑧ the words fail: ' + e.message); break; }
        if (/\{|undefined|NaN/.test(w.ask)) a(`⑧ the question 「${w.ask}」`);
        if (/ただで/.test(w.hintTx) && (!capA || retakeA)) a(`⑧ the hint says ただで, the capture can be taken back 「${w.hintTx}」`);
        const gd = w.good(P.best); if (/undefined|NaN|\{x\}/.test(gd)) a(`⑧ the praise 「${gd}」`);
        if (/すぐ取り返|すかさず/.test(gd) && !lastCap) a(`⑦ the praise says the take-back is at once, the last move took nothing there 「${gd}」`);
        if (/取り返/.test(gd) && !(capA && matOf(p, p.side) < matOf(p, opp))) a(`⑦ the praise says a take-back 「${gd}」`);
        if (/取る|取って|いただき/.test(gd) && !/取り返/.test(gd) && !capA) a(`⑦ the answer takes nothing 「${gd}」`);
        if (/王手/.test(gd) && !qa.inCheck()) a(`⑦ the answer is no check 「${gd}」`);
        if (capA && /取/.test(gd) && !gd.includes(W.XQN ? W.XQN(capA, opp) : '') && !/取られた駒|取り返しの一手/.test(gd)) a(`⑧ the praise does not name the piece taken 「${gd}」`);
        { const flee = E.threats(p, opp).has(E.mFrom(P.best)) && !thA.has(E.mTo(P.best));   // 追41: the answer saves an attacked piece — the praise says so (and only then)
          if (flee && !/ねらわれ/.test(gd)) a(`追41 the answer moves an attacked piece away, the praise does not say so 「${gd}」`);
          if (!flee && /ねらわれていた|ねらわれた/.test(gd)) a(`追41 the praise says a piece was attacked 「${gd}」`); }
        for (const u of legal) { if (A8.includes(u)) continue; const t0 = w.ng(u), t = t0.slice(Math.max(0, t0.indexOf('{x}'))), x = E.name(p, u), bad = m => a(`⑦ ${x}: ${m} 「${t0}」`);   // (t: the fact, from the sentence naming yours)
          if (/undefined|NaN|\{(?![mx]\})/.test(t0)) { bad('a placeholder'); continue; }
          if (!t0.includes('{x}')) bad('does not name the move');
          if ([...gap].some(y => t0.includes(y)) || /本筋はこっち|よく指されるのはこっち/.test(t)) bad('a general line, no board fact (追8)');
          const qu = p.clone().play(u), capU = p.at(E.mTo(u)) ? E.typeOf(p.at(E.mTo(u))) : 0, thU = E.threats(qu, opp);
          if (/取り返/.test(t) && !(capA && matOf(p, p.side) < matOf(p, opp) && !capU)) bad('no take-back missed');
          const pm = t.match(/(?:きみの|ねらわれていた|では|だと、)(王さま|仕|士|相|象|馬|車|炮|兵|卒)(?:が|の守り|を助け|を取られ)/) || t.match(/きみの(王さま|仕|士|相|象|馬|車|炮|兵|卒)を取られ/);
          if (/取られ(?!た駒)|ねらいに残/.test(t)) { const ty = pm ? nmJ(pm[1]) : 0, sq = [...thU].filter(k => !thA.has(k) && E.typeOf(qu.at(k)) === ty);
            if (!ty || !sq.length) bad('no piece of that kind is left to be taken'); 
            else if (/ただで/.test(t) && !sq.some(k => qu.moves().some(r => E.mTo(r) === k && !qu.clone().play(r).moves().some(y => E.mTo(y) === k)))) bad('the piece can be taken back (not ただで)');
            if (/ねらわれていた/.test(t) && !sq.some(k => E.threats(p, opp).has(k))) bad('the piece was not attacked before'); }
          const mm = t.match(/(?:取れる|取れた)(王さま|仕|士|相|象|馬|車|炮|兵|卒)/);
          if (mm && !(capA === nmJ(mm[1]) && (!capU || (E.mTo(u) !== E.mTo(P.best) && VAL[capU] < VAL[capA])))) bad('the answer takes no such piece, or yours takes as much');
          if (/ただで取れた/.test(t) && retakeA) bad('the answer\'s capture can be taken back (not ただで)');
          const am = t.match(/相手の(王さま|仕|士|相|象|馬|車|炮|兵|卒)(?:をねらう|に手が届かない)/);
          if (am) { const v = VAL[nmJ(am[1])], aimsU = [...E.threats(qu, p.side)].filter(k => !E.threats(p, p.side).has(k)).map(k => VAL[E.typeOf(qu.at(k))]);
            if (!aimsA.includes(v) || Math.max(0, ...aimsU) >= Math.max(...aimsA)) bad('the answer attacks no such piece, or yours attacks as much'); }
          if (/王手にならない|王手がかからず/.test(t) && !(qa.inCheck() && !qu.inCheck())) bad('the check is not as said');
        } }
    });
  }
  return out;
}
// (2026-11-24 担当C, 追42) the 3D 詰め puzzles that play on after a move off the solution: the words after it must say what happened on
// the board (the reply took / escaped / defended, why the goal is now out of reach), not only 「正解手順から外れました。相手は最善で
//応じます。」 (pz.stray). Lists the runners in atlas/puzzles.js that still say pz.stray (foxgeese's fgMoved names the fact: AtlasFoxgeesePz.why).
const STRAY_KIND = { ckMoved: 'checkers', hxMoved: 'hex', tfMoved: 'tafl', mmMoved: 'morris', xqMoved: 'xiangqi・janggi', goMoved: 'go', fgMoved: 'foxgeese' };
function stray() {
  const src = require('fs').readFileSync(path.join(ROOT, 'atlas/puzzles.js'), 'utf8'), out = [];
  const fns = [...src.matchAll(/async function (\w+Moved)\(/g)].map(m => ({ name: m[1], at: m.index }));
  fns.forEach((f, i) => { const body = src.slice(f.at, i + 1 < fns.length ? fns[i + 1].at : src.length); if (/B\.tx\('pz\.stray'/.test(body)) out.push({ step: f.name === 'xqMoved' && /id === 'janggi' && window\.JanggiPzWhy\) return jgStray\(/.test(body) ? 'xiangqi' : STRAY_KIND[f.name] || f.name, q: 0, msg: '追42 a move off the solution: only pz.stray, the board\'s fact is not said' }); });
  return out;
}
// (2026-11-24 担当C) fox and geese on the 3D table: the puzzles (all 5 themes, 250) — tools/lesson-verify-foxgeese.js
const foxgeese = () => require('./lesson-verify-foxgeese.js').verify().out.map(o => ({ step: o.theme, q: o.q, msg: o.msg }));
const reversiOpen = opt => require('./lesson-verify-rvopen.js')(opt);   // (2026-11-24 担当B：リバーシの定跡、tools/lesson-verify-rvopen.js)
const patolli = () => require('./lesson-verify-patolli.js')();   // (2026-11-24 担当C：パトリのレッスン（ベルの復元 v2）、tools/lesson-verify-patolli.js)
const GAMES = { chessOpen, xiangqiOpen, reversiOpen, ur, senet, patolli, foxgeese, stray, hex, connect4, mancala, gomoku, dots, amazons, reversi, checkers, tafl, xiangqi, shogi, shogiOpen, taflOpen, checkersOpen, openLines, janggi, hexOpen };
module.exports = GAMES; GAMES.mancalaWords = mancalaWords; Object.assign(GAMES, { chessOpenCtx, chessOpenProblem, chessOpenSet, chessOpenD }); Object.defineProperty(GAMES, '_hex', { value: { ctx: hxCtx, near: hxNear, problem: hxProblem, d: hxD, pts: hxPts, kind: (sp, m) => { const X = hxX(); return X.HXA.kind(X.HXA.facts(sp, m)); } } }); Object.defineProperty(GAMES, '_ck', { value: { ckExact, ckPool, ckDist } });   // (_ck: for checkers/tools/eg_lessons.js)   // (not a game of the CLI: the words pass alone, for tests)
if (require.main === module) {
  const a = process.argv.slice(2), games = (a.find(x => !x.startsWith('-')) || 'reversiOpen,connect4,mancala,gomoku,dots,amazons,reversi,checkers,tafl,xiangqi,shogi,shogiOpen,taflOpen,checkersOpen,chessOpen,xiangqiOpen,openLines,janggi,foxgeese,hex,hexOpen').split(',');
  let bad = 0;
  for (const g of games) { const f = GAMES[g]((g === 'hexOpen' || g === 'reversiOpen') && a.includes('--deep') ? { deep: true } : undefined); if (!f.length) { console.log(`OK ${g}` + (g === 'reversiOpen' ? ` (リバーシの定跡 ${[...require('./lesson-verify-rvopen.js').DONE].join('・') || 'なし'} の手順の外の5問の①〜⑨・追1・追43` + (a.includes('--deep') ? '。①②はエンジンで読み直し)' : '。①②は保存した2つの読みで照合、読み直しは --deep)') : g === 'xiangqiOpen' ? ` (シャンチーの定跡 ${JSON.parse(require('fs').readFileSync(path.join(ROOT, 'xiangqi/openings.json'), 'utf8')).sets.filter(x => x.verified).map(x => x.id).join('・')} の①〜⑨・追3・追4・追5・追8・追9・追41。ほかの定跡は pending)` : g === 'chessOpen' ? ' (チェスの定跡の drill の①〜⑨・追3・追25。drill のない定跡は pending)' : g === 'connect4' ? ' (count/endwin の⑦⑧)' : g === 'patolli' ? ' (パトリの作り直したレッスン（v2：豆の確率・腕の先・上がり）の①〜⑧・追7・追16・追22・追23・追40。厳密な勝率は C で解き直し)' : g === 'senet' ? ' (セネトのレッスン9本（v2）の①〜⑧・追7・追16・追22・追23・追28・追36・追40・追47。厳密な勝率は C で解き直し、水の家の選ぶ問題は engine.js で数え直し)' : g === 'hex' ? ' (3D の準備13本：緑の印・半回転の try・説明と ほめ言葉の語が盤の事実・追1 準備の問題を本番で出さない)' : g === 'hexOpen' ? ` (ヘックスの定跡 ${JSON.parse(require('fs').readFileSync(path.join(ROOT, 'hex/openings.json'), 'utf8')).sets.filter(x => x.verified).map(x => x.id).join('・') || 'なし'} の①〜⑨` + (a.includes('--deep') ? '。①②はエンジンで読み直し)' : '。①②は保存した2つの読みで照合、読み直しは --deep＝追26)') : g === 'foxgeese' ? ' (パズル全250問の①〜⑨・追6・追13・追16：厳密なソルバーで手数・正解の集まり・全段階の全不正解手の応手と文、2D の外れた手の文)' : g === 'janggi' ? ' (パズル全問・レッスン b_rook・b_horse・b_elephant・b_cannon・b_pawn・b_escape・b_mate1・t_capture・m_mate2・m_mate3・e_rook・e_pawn の①〜⑨・追19・追20・追24・追27・追31・追34・追38・追39・追42・追44)' : g === 'ur' ? (require('fs').existsSync(require('path').join(process.env.UR_LUT_DIR || '/tmp/urlut', 'finkel.rgu')) ? ' (ウルのレッスン12本の①〜⑧・追7・追16)' : ' (ウルのレッスン12本の③〜⑧・追7・追16。①②は完全解析表なしで未照合＝追26)') : g === 'openLines' ? ' (shogi・tafl・checkers の定跡の手順：①合法④名前の手・形⑤ほかの定跡と同じ手順・前半・行き着く先が同じでない＝追15)' : ` (${[...(g === 'gomoku' ? GM_DONE : g === 'dots' ? DT_DONE : g === 'amazons' ? AM_DONE : g === 'reversi' ? RV_DONE : g === 'checkers' ? CK_DONE : g === 'tafl' ? TF_DONE : g === 'xiangqi' ? XQ_DONE : g === 'shogi' ? SH_DONE : g === 'shogiOpen' ? SHO_DONE : g === 'checkersOpen' ? CKO_DONE : g === 'taflOpen' ? new Set(JSON.parse(require('fs').readFileSync(path.join(ROOT, 'tafl/openings.json'), 'utf8')).sets.filter(x => x.verified).map(x => x.id)) : MC_DONE)].join('・')} の①〜⑧)`)); continue; }    bad += f.length; f.forEach(x => console.log(`NG ${g} ${x.step} q${x.q}: ${x.msg}`)); }
  process.exit(bad ? 1 : 0);
}

#!/usr/bin/env node
// Extra problem checks for the lesson loop phase 2 (claude/lesson-quality.md), beyond what tools/lesson-facts.js connect4() already
// enforces inline (①answer=best ②unique ③≥3 legal ⑤no near-duplicate ⑥ramp ⑦words-vs-board). Here are the move-specific facts the
// generic framework cannot express, so a count / endwin problem truly teaches its theme:
//   count  ⑧ the answer neither connects four nor blocks one now, and after it the mover still owns a winning cell up in the air
//            (the zugzwang the lesson is about — not a tactical shot).
//   endwin ⑦ after the answer every legal reply of the opponent loses with best play (the "give the opponent no counter" the words
//            promise), i.e. the win is truly forced and quickest.
// node tools/lesson-verify.js [connect4,mancala,gomoku,dots,amazons]
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
  const X = vm.runInNewContext(src.slice(src.indexOf('  const DK = '), src.indexOf('  const DOTS = {')) + '\n;({ dDecE, dDecV, dRank, dFacts, dotsJa, DTJ })', {});
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
  return out;
}
// (2026-11-24 第2期) amazons, the basics (AM_DONE): every right answer is a goal of the rules (no engine opinion), so ①② = the stored
// answers are exactly the legal moves that reach the goal — b_queen: the amazon lands on the glowing square; b_arrow / b_block: the arrow
// hits it; b_win: Black has no move left. ③ ≥3 legal moves, ≥3 landing squares and the goal a minority. ④ the step's shape. ⑤ no
// other amazons position (lessons, warm-ups, puzzles, the 8 symmetries) within 2 squares. ⑥ d never goes down, the last > problem 1.
// ⑦⑧ ケロ's 3D words (atlas/lessons3d.js amLsJa): the question and hint of problem k fit its board, the praise's facts, and for EVERY
// wrong move the reason it gives is the board's (short of / past the goal, the wrong way, a blocker, not in line, an arrow shot short,
// the exits left). ⑨ the 2D (amazons/app.js lessonAnswer) and the 3D (points) both score P.ok.
const AM_DONE = new Set(['b_queen', 'b_arrow', 'b_block', 'b_win']);
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
  L.steps.forEach((st, si) => { const id = st.id; if (!AM_DONE.has(id) || (only && !only.has(id))) return;
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
  return out;
}
const GAMES = { connect4, mancala, gomoku, dots, amazons };
module.exports = GAMES; GAMES.mancalaWords = mancalaWords;   // (not a game of the CLI: the words pass alone, for tests)
if (require.main === module) {
  const a = process.argv.slice(2), games = (a.find(x => !x.startsWith('-')) || 'connect4,mancala,gomoku,dots,amazons').split(',');
  let bad = 0;
  for (const g of games) { const f = GAMES[g](); if (!f.length) { console.log(`OK ${g}` + (g === 'connect4' ? ' (count/endwin の⑦⑧)' : ` (${[...(g === 'gomoku' ? GM_DONE : g === 'dots' ? DT_DONE : g === 'amazons' ? AM_DONE : MC_DONE)].join('・')} の①〜⑧)`)); continue; }
    bad += f.length; f.forEach(x => console.log(`NG ${g} ${x.step} q${x.q}: ${x.msg}`)); }
  process.exit(bad ? 1 : 0);
}

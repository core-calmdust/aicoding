#!/usr/bin/env node
// Extra problem checks for the lesson loop phase 2 (claude/lesson-quality.md), beyond what tools/lesson-facts.js connect4() already
// enforces inline (①answer=best ②unique ③≥3 legal ⑤no near-duplicate ⑥ramp ⑦words-vs-board). Here are the move-specific facts the
// generic framework cannot express, so a count / endwin problem truly teaches its theme:
//   count  ⑧ the answer neither connects four nor blocks one now, and after it the mover still owns a winning cell up in the air
//            (the zugzwang the lesson is about — not a tactical shot).
//   endwin ⑦ after the answer every legal reply of the opponent loses with best play (the "give the opponent no counter" the words
//            promise), i.e. the win is truly forced and quickest.
// node tools/lesson-verify.js [connect4,mancala]
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
const GAMES = { connect4, mancala };
module.exports = GAMES; GAMES.mancalaWords = mancalaWords;   // (not a game of the CLI: the words pass alone, for tests)
if (require.main === module) {
  const a = process.argv.slice(2), games = (a.find(x => !x.startsWith('-')) || 'connect4,mancala').split(',');
  let bad = 0;
  for (const g of games) { const f = GAMES[g](); if (!f.length) { console.log(`OK ${g}` + (g === 'connect4' ? ' (count/endwin の⑦⑧)' : ` (${[...MC_DONE].join('・')} の①〜⑧)`)); continue; }
    bad += f.length; f.forEach(x => console.log(`NG ${g} ${x.step} q${x.q}: ${x.msg}`)); }
  process.exit(bad ? 1 : 0);
}

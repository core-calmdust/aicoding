// (2026-11-28 第2期 担当A) shogi k5「両取りと駒得の手筋」(src fork, mode cp): the strict ①〜⑨ for every problem, called from
// tools/lesson-verify.js shogi(). From the rules (shogi/engine.js) and the material search shogi/tools/fork-lib.js, afresh:
// the mover is not in check, neither side wins material by a capture now (capture-only search, and the same after a pass), no mate
// within three for the mover; ① the answer is a fork — the moved piece attacks two targets (P.tg = exactly them: two pieces worth a
// lance or more, or the king and a piece worth a knight or more), our move + every reply + captures gives it +2.5 or more, and after
// every reply the moved piece still takes one of the targets on its square and wins it (「両方は守れない」), after it no mate within
// three for the opponent; ② every other legal move +0.95 or less (P.rep[u] = the opponent's best reply, the piece it takes and our
// material after it, recomputed); the engine (depth 5, and 6 when the gap is under 600) puts the answer first and 300+ above the
// second (a fresh hash table each time); cand = every legal move once (the moves the search leaves out — a needless non-promotion —
// last, below the floor), best first, the others 300+ below (8 points or less in the 2D and the 3D — 追3・追72);
// ③ 20+ legal moves; ⑤ 7+ squares from every other shogi problem / warm-up / tsume; ⑥ d = the other moves that attack a piece
// they would win (+ legal / 1000) never falls; 追27 three kinds of mover, check forks and two-piece forks twice each at least;
// ⑦⑧ the 3D words at each of the five places: the hint (the lit piece, 王手 for a check fork), the praise (the targets by name,
// 王手 for a check fork, every other move wins far less), every other legal move (the answer and its targets named, and what the
// stored reply does: the piece it takes, a loss, a pawn, or no gain); ⑨ the 2D lessonReason 'fork' and its words in 14 languages;
// the warm-ups' ok = every move of the position that wins +2.5 or more with a fork.
const path = require('path'), fs = require('fs');
module.exports = function shFork({ ROOT, E, L, X, pool, brd, dist, add, src, app }) {
  const T = E.typeOf, g = L.grades.find(x => x.id === 'k5'); if (!g) return;
  const F = require(path.join(ROOT, 'shogi/tools/fork-lib.js'))(E);
  const pos = s => { const p = new E.Position(); p.setSfen(s); return p; };
  const NM = ['', '歩', '香車', '桂馬', '銀', '角', '飛車', '金', '玉', 'と金', '成香', '成桂', '成銀', '馬', '竜'];
  const ZEN = '０１２３４５６７８９', KAN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'], sqJ = u => ZEN[+u[2]] + KAN[u.charCodeAt(3) - 96];
  const plain = t => String(t).replace(/<[^>]+>/g, '');
  const real = tg => { const nk = tg.filter(x => x[1] !== 8).map(x => F.V(x[1])), ck = tg.some(x => x[1] === 8); return ck ? nk.some(v => v >= 4.05) : nk.filter(v => v >= 3.15).length >= 2; };
  const CP = "if (P.mode === 'cp') { const best = P.cand[0][1], c = P.cand.find(x => x[0] === u), s = c ? c[1] : P.floor; return Math.max(0, Math.min(PTS - 1, Math.round(PTS * (1 - (best - s) / 500)))); }";
  if (!src.includes(CP)) add('k5', -1, '⑨ the 3D SHOGI.points (cp) changed');
  if (!app.includes(CP.replace(/P\./g, 'pr.').replace(/\bu\)/g, 'usi)'))) add('k5', -1, '⑨ shogi/index.html movePoints (cp) changed');
  for (const x of ["case 'fork': {", "if (pr.accept.includes(usi)) return t(ck ? 'r.fkChk' : 'r.fkOk', { m: M, a: X });", "if (rp && rp[0] && rp[1] && rp[1] !== OU && rp[2] <= -0.5) {", "return w + ' ' + t(ck ? 'r.fkCouldChk' : 'r.fkCould', { m: B, a: X });"])
    if (!app.includes(x)) add('k5', -1, '⑨ shogi/index.html lessonReason (fork) changed: ' + x.slice(0, 60));
  const I18 = fs.readFileSync(path.join(ROOT, 'shogi/i18n.js'), 'utf8'); for (const k of ['r.fkOk', 'r.fkChk', 'r.fkNo', 'r.fkCould', 'r.fkCouldChk', 'r.evTake']) { const n = (I18.match(new RegExp(`["']${k.replace('.', '\\.')}["']:`, 'g')) || []).length; if (n < 14) add('k5', -1, `⑨ the 2D words ${k} in ${n} of 14 languages`); }
  if (g.problems.length < 8) add('k5', -1, `${g.problems.length} problems (8 or more)`);
  let prevD = -1; const movers = new Set(), kinds = { check: 0, two: 0 };
  g.problems.forEach((P, j) => { const a = m => add('k5', j, m);
    if (P.kind !== 'best' || P.src !== 'fork' || P.mode !== 'cp') { a('④ not a fork problem (best / fork / cp)'); return; }
    if (P.expl || P.expl0 || P.trap) a('⑧ a stored explanation or a trap (the reason is said from the board)');
    const p = pos(P.sfen), ms = p.legalMoves(true), U = m => p.toUsi(m), us = ms.map(U);
    if (p.inCheck()) { a('④ the mover is in check'); return; }
    if (ms.length < 20) a(`③ ${ms.length} legal moves`);
    if ((P.accept || []).length !== 1) { a('② not one answer'); return; }
    const ans = P.accept[0]; if (!us.includes(ans)) { a(`① ${ans} is not legal`); return; }
    const am = p.fromUsi(ans);
    // ④ the lesson's own point: not a plain capture, no threat to answer first, no mate
    if (F.qs(p) > 0.95) a('④ a capture already wins material');
    p.doNull(); const qo = F.qs(p); p.undoNull(); if (qo > 0.95) a('④ the opponent already wins material (a piece to save first)');
    let m3 = null; try { m3 = E.solveMate(p, 3, 400000); } catch (e) {} if (m3 && m3.mate) a(`④ a mate in ${m3.mate}`);
    // ① the fork
    const tg = F.forkTargets(p, am).map(([s, t]) => [F.sqU(s), t]);
    if (JSON.stringify([...tg].sort()) !== JSON.stringify([...(P.tg || [])].sort())) a(`⑧ P.tg ${JSON.stringify(P.tg)} is not the moved piece's targets ${JSON.stringify(tg)}`);
    if (tg.length < 2 || !real(tg)) a(`④ not a real fork ${JSON.stringify(tg)}`);
    const ra = F.val(p, am); if (ra.v < 2.5 || ra.v >= 500) a(`① the answer wins ${ra.v.toFixed(2)} (2.5 or more, no mate)`);
    const ho = F.holds(p, am); if (!ho.ok) a(`⑧ after ${ho.bad} the moved piece takes no target (「両方は守れない」 is not true)`);
    p.doMove(am); let o3 = null; try { o3 = E.solveMate(p, 3, 400000); } catch (e) {} p.undoMove(); if (o3 && o3.mate) a('① after the answer the opponent mates');
    if ((P.pv || [])[0] !== ans || P.pv[1] !== ra.r) a(`⑧ pv ${P.pv} is not the answer and the opponent's best reply ${ra.r}`);
    // ② every other legal move
    for (const m of ms) { const u = U(m); if (u === ans) continue; const r = F.val(p, m), rp = (P.rep || {})[u];
      if (r.v > 0.95) a(`② ${u} also wins ${r.v.toFixed(2)}`);
      if (!rp || rp[0] !== r.r || rp[1] !== r.rt || Math.abs(rp[2] - r.v) > 0.011) a(`⑦ ${u}: P.rep ${JSON.stringify(rp)} but the reply is ${JSON.stringify([r.r, r.rt, +r.v.toFixed(2)])}`); }
    const cs = new Map(P.cand || []); if (cs.size !== us.length || us.some(u => !cs.has(u))) a('⑨ cand is not every legal move once');
    if ((P.cand || [[]])[0][0] !== ans) a('① cand[0] is not the answer');
    for (let k = 1; k < (P.cand || []).length; k++) { if (P.cand[k][1] > P.cand[k - 1][1]) a('⑨ cand is not best first'); if (P.cand[k][1] > P.cand[0][1] - 300) a(`追3 ${P.cand[k][0]} only ${P.cand[0][1] - P.cand[k][1]} below the answer`); }
    if (P.floor == null || P.floor > P.cand[P.cand.length - 1][1]) a('⑨ floor');
    E.ttClear(); const r5 = new E.Searcher(p).analyze({ depth: 5, time: 0 }).sort((x, y) => y.s - x.s);
    if (U(r5[0].m) !== ans) a(`① the engine (5) prefers ${U(r5[0].m)} (${r5[0].s}) to ${ans}`);
    else if (r5[1] && r5[1].s > r5[0].s - 300) a(`② ${U(r5[1].m)} is ${r5[0].s - r5[1].s} below the answer`);
    else if (r5[1] && r5[0].s - r5[1].s < 600) { E.ttClear(); const r6 = new E.Searcher(p).analyze({ depth: 6, time: 0 }).sort((x, y) => y.s - x.s); if (U(r6[0].m) !== ans || (r6[1] && r6[1].s > r6[0].s - 300)) a(`追4 the engine (6): ${U(r6[0].m)} first, gap ${r6[1] ? r6[0].s - r6[1].s : '-'}`); }
    // ⑤ no near twin
    const B = brd(P.sfen); for (const [w, b] of pool) { if (w === `k5 q${j + 1}`) continue; const e = dist(B, b); if (e <= 6) a(`⑤ ${e} squares from ${w}`); }
    // ⑥ easier first
    const d = ms.filter(m => U(m) !== ans && F.forkTargets(p, m).some(x => x[1] !== 8)).length + ms.length / 1000;
    if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d);
    const ck = tg.some(x => x[1] === 8); kinds[ck ? 'check' : 'two']++; movers.add(E.isDrop(am) ? E.dropType(am) : T(p.board[E.mFrom(am)]));
    // ⑦⑧ the 3D words at each of the five places
    const tn = tg.filter(x => x[1] !== 8).map(x => NM[x[1]]);
    for (let k = 0; k < 5; k++) { const pr5 = [0, 1, 2, 3, 4].map(() => ({ P, kind: 'best', why: '', ng: null })); X.shJaLesson(g, pr5); const Q = pr5[k];
      for (const t of [Q.ask, Q.hintTx]) if (!t || /\{|undefined|NaN/.test(t)) a(`⑧ 「${t}」`);
      if (!/光っている駒/.test(Q.hintTx) || (ck && !/王手/.test(Q.hintTx)) || (!ck && /王手/.test(Q.hintTx))) a(`追7 the hint 「${Q.hintTx}」`);
      const gd = plain(Q.good(ans));
      if (/undefined|NaN|\{x\}/.test(gd)) a(`⑧ 「${gd}」`);
      if (tn.some(n => !gd.includes(n))) a(`⑧ the praise does not name the targets ${tn} 「${gd}」`);
      if (ck !== /王手/.test(gd)) a(`⑧ the praise and the check 「${gd}」`);
      if (!/ほかの手|これ以外|この手だけ/.test(gd)) a(`⑧ the praise does not say the other moves win less 「${gd}」`);
      if (gd.replace(/\{m\}/g, '☗５五角打').length > 150) a(`⑧ the praise is long 「${gd}」`);
      for (const u of us) { if (u === ans) continue; const w = plain(Q.ng(u)), rp = (P.rep || {})[u]; if (!rp) continue;
        if (/undefined|NaN/.test(w)) { a(`⑧ ${u}: 「${w}」`); break; }
        if (!w.includes('{m}') || tn.some(n => !w.includes(n)) || ck !== /王手/.test(w)) { a(`⑦ ${u}: the words do not name the answer and its targets 「${w}」`); break; }
        const take = rp[0] && rp[1] && rp[1] !== 8 && rp[2] <= -0.5;
        if (take && !(w.includes(sqJ(rp[0])) && w.includes(NM[rp[1]]) && /取られ/.test(w))) { a(`⑦ ${u}: the words do not say ${rp[0]} takes the ${NM[rp[1]]} 「${w}」`); break; }
        if (!take && /取られ/.test(w)) { a(`⑦ ${u}: the words say a piece is taken 「${w}」`); break; }
        if (!take && rp[2] <= -2.5 && !/駒損/.test(w)) { a(`⑦ ${u}: the words do not say the loss 「${w}」`); break; }
        if (!take && rp[2] > -2.5 && /駒損/.test(w)) { a(`⑦ ${u}: the words say a loss 「${w}」`); break; }
        if (!take && rp[2] > 0.5 && !/歩/.test(w)) { a(`⑦ ${u}: the words do not say the pawn 「${w}」`); break; } } }
  });
  if (movers.size < 3) add('k5', -1, `追27 only ${movers.size} kinds of answer piece`);
  if (kinds.check < 2 || kinds.two < 2) add('k5', -1, `追27 check forks ${kinds.check}, two-piece forks ${kinds.two} (two each at least)`);
  // the warm-ups: ok = every move that wins +2.5 or more with a fork
  (g.ramp || []).forEach((R, j) => { if (R.k !== 'try') return; const p = pos(R.sfen), ok = [];
    for (const m of p.legalMoves(true)) { const tg = F.forkTargets(p, m); if (tg.length >= 2 && F.val(p, m).v >= 2.5) ok.push(p.toUsi(m)); }
    if (JSON.stringify(ok.sort()) !== JSON.stringify([...R.ok].sort())) add('k5', -1, `warm-up ${j + 1}: ok ${R.ok} but the winning forks are ${ok}`); });
};

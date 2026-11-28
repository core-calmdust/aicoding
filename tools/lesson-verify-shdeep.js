// (2026-11-28 第2期 担当A) shogi k1「中盤の次の一手」(src deep, mode cp): the strict ①〜⑨ for every problem, called from
// tools/lesson-verify.js shogi(). From the rules (shogi/engine.js) and the material reading shogi/tools/deep-lib.js, afresh:
// the mover is not in check, no capture wins material now, NO legal move wins material at 2 plies (our move, every reply, captures:
// ≤ +0.95 — 「浅い読みでは見つからない」), the answer itself +0.5 or less (「この手だけでは駒得にならない」), no mate within three for the
// mover, nor for the opponent after the answer; ① the answer wins +2.5 or more at 3 plies whatever the opponent replies (deep-lib v3);
// the example P.ex = [a legal reply, our capture after it, the piece it takes] wins +2.5 or more, pv = [answer, ex[0], ex[1]];
// ② every other legal move: P.rep[u] = [a legal reply, the piece it takes, our material] after which our best move (deep-lib bestY)
// leaves +0.95 or less (recomputed: the value is the stored one); the engine (depth 5, and 6 when the gap is under 600; a fresh hash
// table) puts the answer first and 300+ above the second; cand = every legal move once, best first, the others 300+ below (8 points
// or less — 追3・追72); ③ 20+ legal moves; ⑤ 7+ squares from every other shogi problem / warm-up / tsume; ⑥ d = the opponent's legal
// replies after the answer (the replies to read one by one; + legal / 1000) never falls; 追27 three kinds of answer piece or more; ⑦⑧ the 3D words
// at each of the five places: the hint (the lit piece), the praise (the example reply, our capture and the piece it takes by name,
// every reply leaves a win, every other move falls short), every other legal move (the answer named, the stored reply named and
// what it does: the piece it takes, a loss, a pawn, or no gain); ⑨ the 2D lessonReason 'deep' and its words in 14 languages; the
// intro (2D and 3D) gives no AI / evaluation as the reason.
const path = require('path'), fs = require('fs');
module.exports = function shDeep({ ROOT, E, L, X, pool, brd, dist, add, src, app }) {
  const T = E.typeOf, g = L.grades.find(x => x.id === 'k1'); if (!g) return;
  const D = require(path.join(ROOT, 'shogi/tools/deep-lib.js'))(E);
  const pos = s => { const p = new E.Position(); p.setSfen(s); return p; };
  const NM = ['', '歩', '香車', '桂馬', '銀', '角', '飛車', '金', '玉', 'と金', '成香', '成桂', '成銀', '馬', '竜'];
  const KF = ['', '歩', '香', '桂', '銀', '角', '飛', '金', '玉', 'と', '成香', '成桂', '成銀', '馬', '龍'];
  const ZEN = '０１２３４５６７８９', KAN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const mvJ = (p, u) => { const m = p.fromUsi(u), mk = p.side === 0 ? '☗' : '☖', sq = ZEN[+u[2]] + KAN[u.charCodeAt(3) - 96];   // (= the 3D shMvJa)
    if (E.isDrop(m)) return mk + sq + KF[E.dropType(m)] + '打'; return mk + sq + KF[T(p.board[E.mFrom(m)])] + (E.mPromo(m) ? '成' : ''); };
  const plain = t => String(t).replace(/<[^>]+>/g, '');
  const CP = "if (P.mode === 'cp') { const best = P.cand[0][1], c = P.cand.find(x => x[0] === u), s = c ? c[1] : P.floor; return Math.max(0, Math.min(PTS - 1, Math.round(PTS * (1 - (best - s) / 500)))); }";
  if (!src.includes(CP)) add('k1', -1, '⑨ the 3D SHOGI.points (cp) changed');
  if (!app.includes(CP.replace(/P\./g, 'pr.').replace(/\bu\)/g, 'usi)'))) add('k1', -1, '⑨ shogi/index.html movePoints (cp) changed');
  for (const x of ["case 'deep': {", "return t('r.dpOk', { m: M, r: R, y: kan1(q.sfen(), ex[1]), p: NAME[ex[2]] });", "const w = rp[1] && rp[1] !== OU && rp[2] <= -0.5 ? t('r.evTake', { m: M, r: R, p: NAME[rp[1]] }) : rp[2] <= -2.5 ? t('r.dpLoss', { m: M, r: R }) : t('r.dpNo', { m: M, r: R });", "return w + ' ' + t('r.dpCould', { m: B });"])
    if (!app.includes(x)) add('k1', -1, '⑨ shogi/index.html lessonReason (deep) changed: ' + x.slice(0, 60));
  const I18 = fs.readFileSync(path.join(ROOT, 'shogi/i18n.js'), 'utf8'); for (const k of ['r.dpOk', 'r.dpNo', 'r.dpLoss', 'r.dpCould', 'r.evTake']) { const n = (I18.match(new RegExp(`["']${k.replace('.', '\\.')}["']:`, 'g')) || []).length; if (n < 14) add('k1', -1, `⑨ the 2D words ${k} in ${n} of 14 languages`); }
  for (const [w, tx] of [['2D', JSON.stringify(g.intro || {}) + JSON.stringify(g.short || {}) + JSON.stringify(g.note || {})], ['3D', String((X.SHJ2.intro || {}).k1 || '')]])
    if (/\bAI\b|ＡＩ|評価|形勢|\b(engine|moteur|motor|Engine)\b/.test(tx)) add('k1', -1, `⑧ the ${w} intro gives the AI / evaluation as the reason`);
  if (g.problems.length < 8) add('k1', -1, `${g.problems.length} problems (8 or more)`);
  let prevD = -1; const movers = new Set();
  g.problems.forEach((P, j) => { const a = m => add('k1', j, m);
    if (P.kind !== 'best' || P.src !== 'deep' || P.mode !== 'cp') { a('④ not a deep problem (best / deep / cp)'); return; }
    if (P.expl || P.expl0 || P.trap) a('⑧ a stored explanation or a trap (the reason is said from the board)');
    const p = pos(P.sfen), ms = p.legalMoves(true), U = m => p.toUsi(m), us = ms.map(U);
    if (p.inCheck()) { a('④ the mover is in check'); return; }
    if (ms.length < 20) a(`③ ${ms.length} legal moves`);
    if ((P.accept || []).length !== 1) { a('② not one answer'); return; }
    const ans = P.accept[0]; if (!us.includes(ans)) { a(`① ${ans} is not legal`); return; }
    const am = p.fromUsi(ans);
    // ④ the lesson's own point: nothing wins at once, nothing wins at 2 plies, no mate
    if (D.qs(p) > 0.95) a('④ a capture already wins material');
    for (const m of ms) { const v = D.val(p, m, 0.95).v; if (v > 0.95) { a(`④ ${U(m)} wins ${v.toFixed(2)} at 2 plies (a shallow read finds it)`); break; } }
    const va = D.val(p, am).v; if (va > 0.5) a(`⑧ the answer itself wins ${va.toFixed(2)} (「この手だけでは駒得にならない」)`);
    let m3 = null; try { m3 = E.solveMate(p, 3, 400000); } catch (e) {} if (m3 && m3.mate) a(`④ a mate in ${m3.mate}`);
    p.doMove(am); let o3 = null; try { o3 = E.solveMate(p, 3, 400000); } catch (e) {} p.undoMove(); if (o3 && o3.mate) a('① after the answer the opponent mates');
    // ① every reply leaves a win of +2.5
    const v3 = D.v3(p, am, 2.5); if (!v3.ok) a(`① after ${v3.r} the answer wins only ${v3.v.toFixed(2)}`);
    const ex = P.ex || [];
    { const g0 = D.gain(p, am); p.doMove(am); const r = p.fromUsi(ex[0] || ''); const rl = r != null && p.legalMoves(true).some(x => x === r);
      if (!rl) a(`⑧ ex[0] ${ex[0]} is not a reply`); else { const gr = D.gain(p, r); p.doMove(r); const y = p.fromUsi(ex[1] || ''), yl = y != null && p.legalMoves(true).some(x => x === y);
        if (!yl) a(`⑧ ex[1] ${ex[1]} is not a move after ${ex[0]}`); else { const yt = E.isDrop(y) || !p.board[E.mTo(y)] ? 0 : T(p.board[E.mTo(y)]);
          if (!yt || yt === 8 || yt !== ex[2]) a(`⑧ ex[1] ${ex[1]} takes type ${yt}, ex[2] = ${ex[2]}`);
          if (yt && D.V(yt) < 2.5) a(`⑧ the example capture ${ex[1]} takes a piece worth only ${D.V(yt).toFixed(2)} (a real piece)`);
          const v = g0 - gr + D.val(p, y).v; if (v < 2.5) a(`⑧ the example ${ex.slice(0, 2)} wins only ${v.toFixed(2)}`); }
        p.undoMove(); }
      p.undoMove(); }
    if ((P.pv || []).join() !== [ans, ex[0], ex[1]].join()) a(`⑧ pv ${P.pv} is not the answer and the example line`);
    // ② every other legal move: the stored reply holds it to +0.95
    for (const m of ms) { const u = U(m); if (u === ans) continue; const rp = (P.rep || {})[u];
      if (!rp) { a(`⑦ ${u}: no stored reply`); continue; }
      const g0 = D.gain(p, m); p.doMove(m); const r = p.fromUsi(rp[0] || '');
      if (r == null || !p.legalMoves(true).some(x => x === r)) { a(`⑦ ${u}: the stored reply ${rp[0]} is not legal`); p.undoMove(); continue; }
      const rt = E.isDrop(r) || !p.board[E.mTo(r)] ? 0 : T(p.board[E.mTo(r)]), gr = D.gain(p, r); p.doMove(r); const B = D.bestY(p, null); p.undoMove(); p.undoMove();
      const v = g0 - gr + B.v;
      if (v > 0.95) a(`② ${u}: after ${rp[0]} we still win ${v.toFixed(2)}`);
      if (rp[1] !== rt || Math.abs(rp[2] - v) > 0.011) a(`⑦ ${u}: P.rep ${JSON.stringify(rp)} but the board says ${JSON.stringify([rp[0], rt, +v.toFixed(2)])}`); }
    const cs = new Map(P.cand || []); if (cs.size !== us.length || us.some(u => !cs.has(u))) a('⑨ cand is not every legal move once');
    if ((P.cand || [[]])[0][0] !== ans) a('① cand[0] is not the answer');
    for (let k = 1; k < (P.cand || []).length; k++) { if (P.cand[k][1] > P.cand[k - 1][1]) a('⑨ cand is not best first'); if (P.cand[k][1] > P.cand[0][1] - 300) a(`追3 ${P.cand[k][0]} only ${P.cand[0][1] - P.cand[k][1]} below the answer`); }
    if (P.floor == null || P.floor > P.cand[P.cand.length - 1][1]) a('⑨ floor');
    E.ttClear(); const r5 = new E.Searcher(p).analyze({ depth: 5, time: 0 });
    if (Math.abs(r5[0].s) >= 20000 || (r5[1] && Math.abs(r5[1].s) >= 20000)) a('④ a mate in the engine values (a tsume, not this lesson)');
    if (U(r5[0].m) !== ans) a(`① the engine (5) prefers ${U(r5[0].m)} (${r5[0].s}) to ${ans}`);
    else if (r5[1] && r5[1].s > r5[0].s - 300) a(`② ${U(r5[1].m)} is ${r5[0].s - r5[1].s} below the answer`);
    else if (r5[1] && r5[0].s - r5[1].s < 600) { E.ttClear(); const r6 = new E.Searcher(p).analyze({ depth: 6, time: 0 }); if (U(r6[0].m) !== ans || (r6[1] && r6[1].s > r6[0].s - 300)) a(`追4 the engine (6): ${U(r6[0].m)} first, gap ${r6[1] ? r6[0].s - r6[1].s : '-'}`); }
    // ⑤ no near twin
    const Bd = brd(P.sfen); for (const [w, b] of pool) { if (w === `k1 q${j + 1}`) continue; const e = dist(Bd, b); if (e <= 6) a(`⑤ ${e} squares from ${w}`); }
    // ⑥ easier first
    p.doMove(am); const nr = p.legalMoves(true).length; p.undoMove(); const d = nr + ms.length / 1000; if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d);
    movers.add(E.isDrop(am) ? E.dropType(am) : T(p.board[E.mFrom(am)]));
    // ⑦⑧ the 3D words at each of the five places
    let rn = '', yn = ''; try { const q = pos(P.sfen); q.doMove(am); rn = mvJ(q, ex[0]); q.doMove(q.fromUsi(ex[0])); yn = mvJ(q, ex[1]); } catch (e) {}
    const XN = NM[ex[2]] || '?';
    for (let k = 0; k < 5; k++) { const pr5 = [0, 1, 2, 3, 4].map(() => ({ P, kind: 'best', why: '', ng: null })); X.shJaLesson(g, pr5); const Q = pr5[k];
      for (const t of [Q.ask, Q.hintTx]) if (!t || /\{|undefined|NaN/.test(t)) a(`⑧ 「${t}」`);
      if (!/光っている/.test(Q.hintTx) || (E.isDrop(am) !== /持ち駒/.test(Q.hintTx))) a(`追7 the hint 「${Q.hintTx}」`);
      const gd = plain(Q.good(ans));
      if (/undefined|NaN|\{x\}/.test(gd)) a(`⑧ 「${gd}」`);
      if (!gd.includes(rn) || !gd.includes(yn) || !gd.includes(XN)) a(`⑧ the praise does not name the example ${rn} ${yn} ${XN} 「${gd}」`);
      if (!/どう受け|どの受け|どんな受け/.test(gd)) a(`⑧ the praise does not say every reply leaves a win 「${gd}」`);
      if (!/ほかの手|これ以外|この手だけ/.test(gd)) a(`⑧ the praise does not say the other moves fall short 「${gd}」`);
      if (gd.replace(/\{m\}/g, '☗５五角打').length > 150) a(`⑧ the praise is long (${gd.length}) 「${gd}」`);
      for (const u of us) { if (u === ans) continue; const w = plain(Q.ng(u)), rp = (P.rep || {})[u]; if (!rp) continue;
        if (/undefined|NaN/.test(w)) { a(`⑧ ${u}: 「${w}」`); break; }
        let rj = ''; try { const q = pos(P.sfen); q.doMove(q.fromUsi(u)); rj = mvJ(q, rp[0]); } catch (e) {}
        if (!w.includes('{m}') || !w.includes(rj) || !/どう受け|どの受け|何で受け|受けられても/.test(w)) { a(`⑦ ${u}: the words do not name the answer and the reply ${rj} 「${w}」`); break; }
        const take = rp[1] && rp[1] !== 8 && rp[2] <= -0.5;
        if (take && !(w.includes(NM[rp[1]]) && /取られ/.test(w))) { a(`⑦ ${u}: the words do not say ${rp[0]} takes the ${NM[rp[1]]} 「${w}」`); break; }
        if (!take && /取られ/.test(w)) { a(`⑦ ${u}: the words say a piece is taken 「${w}」`); break; }
        if (!take && rp[2] <= -2.5 && !/駒損/.test(w)) { a(`⑦ ${u}: the words do not say the loss 「${w}」`); break; }
        if (!take && rp[2] > -2.5 && /駒損/.test(w)) { a(`⑦ ${u}: the words say a loss 「${w}」`); break; }
        if (!take && rp[2] > 0.5 && !/歩/.test(w)) { a(`⑦ ${u}: the words do not say the pawn 「${w}」`); break; }
        if (!take && rp[2] <= 0.5 && /歩くらい|歩1枚/.test(w)) { a(`⑦ ${u}: the words say a pawn is won 「${w}」`); break; } } }
  });
  if (movers.size < 3) add('k1', -1, `追27 only ${movers.size} kinds of answer piece`);
  // 追1・追14 the warm-ups: an explain's position is none of the problems'; its arrows are legal moves; a deep example is a real one
  (g.ramp || []).forEach((R, j) => { if (!R.sfen) return; const Bd = brd(R.sfen);
    g.problems.forEach((P, k) => { const e = dist(Bd, brd(P.sfen)); if (e <= 6) add('k1', -1, `追1 warm-up ${j + 1} is ${e} squares from q${k + 1}`); });
    const p = pos(R.sfen), us = new Set(p.legalMoves(true).map(m => p.toUsi(m)));
    for (const [f, t] of R.arrows || []) if (!us.has(f + t) && !us.has(f + t + '+')) add('k1', -1, `追14 warm-up ${j + 1}: the arrow ${f}→${t} is not a move`);
    if (R.deep) { const m = p.fromUsi(R.deep); if (m == null || !us.has(R.deep)) add('k1', -1, `追14 warm-up ${j + 1}: ${R.deep} is not a move`);
      else { for (const x of p.legalMoves(true)) if (D.val(p, x, 0.95).v > 0.95) { add('k1', -1, `追14 warm-up ${j + 1}: ${p.toUsi(x)} wins at 2 plies`); break; }
        if (!D.v3(p, m, 2.5).ok) add('k1', -1, `追14 warm-up ${j + 1}: ${R.deep} does not win whatever the reply`); } } });
};

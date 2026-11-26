// (2026-11-27 第2期 担当A) shogi k2「5手詰」(kind tsume, n 5): the strict ①〜⑨ for every problem, called from tools/lesson-verify.js
// shogi(). From the rules (shogi/engine.js), afresh, over every legal move (as tools/lesson-verify-shmate3.js for the mates in three):
//  ① the stored line is legal, sol[0] checks, every defence after it is mated within three more, sol[1] is a longest defence (after it
//    no mate in one), sol[2] is the only move that mates within three after it, sol[3] is legal and sol[4] mates after it;
//  ② the goal set (every first move that mates within five) is exactly { sol[0] }, no mate in one or in three at the start, sol[4] the
//    only mate after sol[3]; P.u is set (the 2D answers from the stored line, as the 3D does);
//  ③ 3+ legal moves, 3〜15 checks (a choice among checks), the mover is not in check;
//  ④ 2+ defences after the answer, drops and board moves 3+ each, 3+ kinds of first piece, the king runs (sol[1] or sol[3] a king
//    move) in 6+ problems (the intro: 王手と応手を2回くり返して);
//  ⑤ 7+ squares from every other shogi problem / warm-up / tsume.json problem (mirrored too), the same first-move shape twice at most;
//  ⑥ d = checks + defences / 2 + legal moves / 100 never falls;
//  ⑦⑧ the 3D words at each of the five places: the question says mate in 5; the praise names the first and the last piece, a drop or
//    a board move, and speaks of a sacrifice only when sol[1] takes the first piece; for every other first move: no check → said so;
//    a check → the stored defence P.ref (legal, after it nothing mates within three — so the 3D cannot mate in the moves left) and the
//    words say what it does (the king takes / the king steps away / another piece takes / a block, naming the piece); a third move after
//    sol[0], sol[1] that is no check → said so (the 3D fails it at once); for every fifth move after the stored four that does not
//    mate: the words of that board (no check / the king takes / the king escapes / taken or blocked);
//  ⑨ the 2D and the 3D flow (shogi/index.html: no check fails at once, mate ends it, the stored line with P.u; the 3D: P.ref, the
//    stored line), the warm-up (an explain whose line is a mate in five, the king running twice as its words say).
module.exports = function shMate5({ E, L, X, pool, brd, dist, add, src, app }, GID = 'k2') {
  const g = L.grades.find(x => x.id === GID); if (!g) return;
  const T = E.typeOf, NM = ['', '歩', '香車', '桂馬', '銀', '角', '飛車', '金', '玉', 'と金', '成香', '成桂', '成銀', '馬', '竜'];
  const plain = t => String(t).replace(/<[^>]+>/g, '');
  const pos = (s, pre = []) => { const p = new E.Position(); p.setSfen(s); for (const u of pre) p.doMove(p.fromUsi(u)); return p; };
  const isChk = (p, m) => { p.doMove(m); const c = p.inCheck(); p.undoMove(); return c; };
  const mates1 = p => { const o = []; for (const m of p.legalMoves(true)) { p.doMove(m); if (p.inCheck() && !p.legalMoves(true).length) o.push(p.toUsi(m)); p.undoMove(); } return o; };
  const within = (p, n) => { const o = []; for (const m of p.legalMoves(true)) { p.doMove(m); if (p.inCheck()) { const rs = p.legalMoves(true);
    if (!rs.length || (n > 1 && rs.every(r => { p.doMove(r); const v = within(p, n - 2).length > 0; p.undoMove(); return v; }))) o.push(p.toUsi(m)); } p.undoMove(); } return o; };
  const NOCHK = /王手じゃない|王手にならない|王手でない|王手がかからない/;
  for (const x of ["if (!p.inCheck()) return fail(t('ts.notCheck'), pr.n > 1);", "if (!p.legalMoves(false).length) return lessonScored(Math.max(0, PTS - pen), { solved: true, alt: !!lesson.offline });", "const res = onLine && pr.u && pr.sol[moves.length] ? { reply: pr.sol[moves.length], mate: true }"])
    if (!app.includes(x)) add(GID, -1, '⑨ shogi/index.html (tsume) changed: ' + x.slice(0, 50));
  for (const x of ["if (F && !F.check) { p.pre = mv.slice(0, -1); return scored(p, 0, undefined, last); }", "if (mv.length === 1 && !onLine && p.P.ref[mv[0]]) { await sleep(120); await pz().play(p.P.ref[mv[0]]);", "let reply = onLine && sol[mv.length] ? sol[mv.length] : null;"])
    if (!src.includes(x)) add(GID, -1, '⑨ the 3D mate flow changed: ' + x.slice(0, 50));
  const nDrop = [0, 0], kinds = new Set(), shapes = new Map(); let prevD = -1, runs = 0;
  g.problems.forEach((P, j) => {
    const a = m => add(GID, j, m);
    if (P.kind !== 'tsume' || P.n !== 5 || !P.sol || P.sol.length !== 5) { a('④ not a mate in five'); return; }
    if (!P.u) a('⑨ P.u is not set: the 2D would answer with the engine\'s defence, not the stored line');
    const p = pos(P.sfen), ms = p.legalMoves(true), U = m => p.toUsi(m), ans = P.sol[0];
    if (p.inCheck()) a('④ the mover is in check');
    if (within(p, 3).length) a('② a mate in one or three');
    const goal = within(p, 5);
    if (!goal.includes(ans)) a(`① ${ans} does not mate in five (the mates: ${goal})`);
    if (goal.length !== 1) a(`② ${goal.length} first moves mate within five: ${goal}`);
    const checks = ms.filter(m => isChk(p, m));
    if (ms.length < 3) a(`③ ${ms.length} legal moves`);
    if (checks.length < 3 || checks.length > 15) a(`③ ${checks.length} checks (3〜15)`);
    const m0 = p.fromUsi(ans), drop = E.isDrop(m0), pc = drop ? E.dropType(m0) : T(p.board[E.mFrom(m0)]);
    nDrop[drop ? 0 : 1]++; kinds.add(pc);
    const ksq = p.king[p.side ^ 1], to = E.mTo(m0), side = p.side === 0 ? 1 : -1;
    const sh = `${pc}${drop ? '*' : '-'}${(E.sqFile(to) - E.sqFile(ksq)) * side},${(E.sqRank(to) - E.sqRank(ksq)) * side}`;
    shapes.set(sh, (shapes.get(sh) || 0) + 1); if (shapes.get(sh) > 2) a(`⑤ the same first-move shape (${sh}) a third time`);
    // the stored line, move by move
    const legalAt = k => pos(P.sfen, P.sol.slice(0, k)).legalMoves(true).map(m => pos(P.sfen, P.sol.slice(0, k)).toUsi(m));
    let lineOk = true;
    for (let k = 0; k < 5 && lineOk; k++) { const q = pos(P.sfen, P.sol.slice(0, k)), ls = q.legalMoves(true).map(m => q.toUsi(m)); if (!ls.includes(P.sol[k])) { a(`① sol[${k}] ${P.sol[k]} is not legal`); lineOk = false; } }
    const p1 = pos(P.sfen, [ans]), rs = p1.legalMoves(true);
    if (rs.length < 2) a(`④ ${rs.length} defence after the answer (2 or more)`);
    const kingMove = (q, u) => { const m = q.fromUsi(u); return !E.isDrop(m) && E.mFrom(m) === q.king[q.side]; };
    if (lineOk) {
      const p2 = pos(P.sfen, P.sol.slice(0, 2)); if (mates1(p2).length) a(`① sol[1] ${P.sol[1]} is not a longest defence (a mate in one after it)`);
      const w3 = within(p2, 3); if (w3.join() !== P.sol[2]) a(`②① after ${P.sol[1]} the moves that mate within three: ${w3} (stored ${P.sol[2]})`);
      const p4 = pos(P.sfen, P.sol.slice(0, 4)), f = mates1(p4); if (f.join() !== P.sol[4]) a(`②① after ${P.sol[3]} the mates: ${f} (stored ${P.sol[4]})`);
      if (P.sol[3] && mates1(p4).length === 0) a('① sol[3] escapes');
      if (kingMove(p1, P.sol[1]) || kingMove(pos(P.sfen, P.sol.slice(0, 3)), P.sol[3])) runs++;
    }
    const B = brd(P.sfen); for (const [who, b] of pool) { if (who === `${GID} q${j + 1}`) continue; const e = dist(B, b); if (e <= 6) a(`⑤ ${e} squares from ${who}`); }
    const d = checks.length + rs.length / 2 + ms.length / 100; if (d < prevD) a(`⑥ easier than the problem before (d ${d.toFixed(2)} after ${prevD.toFixed(2)})`); prevD = Math.max(prevD, d);
    const ref = P.ref || {}, refFact = {};
    for (const k of Object.keys(ref)) if (k === ans || !checks.some(m => U(m) === k)) a(`⑧ P.ref ${k} is not a wrong check`);
    for (const m of checks) { const u = U(m); if (u === ans) continue; const r = ref[u]; if (!r) { a(`⑦ ${u}: no stored defence P.ref`); continue; }
      const q = pos(P.sfen, [u]), ys = q.legalMoves(true).map(y => q.toUsi(y)); if (!ys.includes(r)) { a(`⑦ ${u}: P.ref ${r} is not legal`); continue; }
      const y = q.fromUsi(r), kq = q.king[q.side], yk = !E.isDrop(y) && E.mFrom(y) === kq, yt = !E.isDrop(y) && !!q.board[E.mTo(y)], yp = E.isDrop(y) ? E.dropType(y) : T(q.board[E.mFrom(y)]);
      q.doMove(y); if (within(q, 3).length) a(`⑦ ${u}: after P.ref ${r} a move still mates within three`);
      refFact[u] = { k: yk ? (yt ? 0 : 1) : yt ? 2 : 3, pn: NM[yp] }; }
    for (let k = 0; k < 5; k++) {
      const pr5 = [0, 1, 2, 3, 4].map(() => ({ P, kind: 'tsume', n: 5, why: '', ng: null })); X.shJaLesson(g, pr5); const Q = pr5[k];
      for (const t of [Q.ask, Q.hintTx]) if (/\{|undefined|NaN/.test(t) || !t) a(`⑧ 「${t}」`);
      if (!/5手詰め/.test(Q.ask)) a(`⑧ the question 「${Q.ask}」 does not say mate in 5`);
      const gd = plain(Q.good(ans)), pn = NM[pc], q4 = pos(P.sfen, P.sol.slice(0, 4)), lm = q4.fromUsi(P.sol[4]);
      const ln = NM[E.isDrop(lm) ? E.dropType(lm) : T(q4.board[E.mFrom(lm)]) + (P.sol[4].endsWith('+') ? 8 : 0)];
      if (/undefined|NaN|\{/.test(gd) || !gd.includes(pn) || !gd.includes(ln)) a(`⑧ the praise 「${gd}」 does not name the ${pn} and the last ${ln}`);
      if (drop ? !/打|持ち駒の/.test(gd) : /打|持ち駒の/.test(gd)) a(`⑧ the praise 「${gd}」 does not say ${drop ? 'a drop' : 'a board move'}`);
      const sac = P.sol[1].slice(2, 4) === ans.slice(2, 4);
      if (sac ? !/捨て|取らせ|取られる場所|ただで渡/.test(gd) : /捨て|取らせ|取られる場所|ただで渡/.test(gd)) a(`⑧ the praise 「${gd}」 ${sac ? 'does not speak of' : 'speaks of'} a sacrifice`);
      for (const m of ms) { const u = U(m); if (u === ans) continue; const w = plain(Q.ng(u));
        if (/undefined|NaN/.test(w) || !w.includes('{x}')) { a(`⑧ ${u}: 「${w}」`); continue; }
        if (!isChk(p, m)) { if (!NOCHK.test(w)) a(`⑦ ${u} is no check, the words do not say so 「${w}」`); continue; }
        if (NOCHK.test(w)) { a(`⑦ ${u} is a check, the words say it is not 「${w}」`); continue; }
        const F = refFact[u]; if (!F) continue;
        const ok = [/玉(に|が)[^。]*取/.test(w) && !/逃げ道が残/.test(w), /逃げ/.test(w) && !/取/.test(w), w.includes(F.pn) && /取/.test(w) && !/玉(に|が)[^。]*取/.test(w), w.includes(F.pn) && /合駒|間に/.test(w)][F.k];
        if (!ok) a(`⑦ ${u}: the defence ${ref[u]} (${['the king takes', 'the king steps away', 'the ' + F.pn + ' takes', 'a ' + F.pn + ' block'][F.k]}), the words 「${w}」`); }
      // the third move after sol[0], sol[1]: no check fails at once (the 3D), said so
      { const q = pos(P.sfen, P.sol.slice(0, 2)); for (const m of q.legalMoves(true)) { if (isChk(q, m)) continue; const u = q.toUsi(m); Q.pre = P.sol.slice(0, 2); const w = plain(Q.ng(u));
        if (/undefined|NaN|\{/.test(w) || !w || !NOCHK.test(w)) a(`⑦ third move ${u} is no check, the words 「${w}」`); } }
      // the fifth move after the stored four that does not mate: the words of its board
      const q = pos(P.sfen, P.sol.slice(0, 4));
      for (const m of q.legalMoves(true)) { const u = q.toUsi(m); if (u === P.sol[4]) continue; Q.pre = P.sol.slice(0, 4); const w = plain(Q.ng(u));
        if (/undefined|NaN|\{/.test(w) || !w) { a(`⑧ fifth move ${u}: 「${w}」`); continue; }
        if (/が正解|答えは|正解は|いちばんは/.test(w)) a(`⑧ fifth move ${u}: the words name the first move's answer 「${w}」`);
        q.doMove(m); const chk = q.inCheck(), ys = chk ? q.legalMoves(true) : [], kq = q.king[q.side], mto = E.mTo(m);
        const kMoves = new Set(ys.filter(y => !E.isDrop(y) && E.mFrom(y) === kq).map(y => E.mTo(y)));
        const kTake = ys.some(y => !E.isDrop(y) && E.mFrom(y) === kq && E.mTo(y) === mto) && q.attackers(kq, q.side ^ 1).includes(mto), mvN = NM[T(q.board[mto])]; q.undoMove();
        if (chk && !ys.length) { a(`① fifth move ${u} mates too`); continue; }
        if (!chk) { if (!NOCHK.test(w)) a(`⑦ fifth move ${u} is no check, the words 「${w}」`); continue; }
        if (NOCHK.test(w)) { a(`⑦ fifth move ${u} is a check, the words say no 「${w}」`); continue; }
        if (kTake) { if (!/玉(に|が)[^。]*取/.test(w) || !w.includes(mvN)) a(`⑦ fifth move ${u}: the king takes it, the words 「${w}」`); continue; }
        if (/玉に(そのまま)?取られ|玉が取れる|玉が[^。]*を取って/.test(w)) { a(`⑦ fifth move ${u}: the king cannot take it, the words 「${w}」`); continue; }
        const nm = (w.match(/逃げ道が(\d)つ|(\d)マス逃げ場/) || []).slice(1).find(Boolean);
        if (kMoves.size) { if (/取るか合駒|ほかの駒で受け|合駒で受け/.test(w) || nm && +nm !== kMoves.size || !/逃げ/.test(w)) a(`⑦ fifth move ${u}: the king escapes (${kMoves.size}), the words 「${w}」`); }
        else if (!/取るか合駒|ほかの駒で受け|合駒で受け|受けがある|受けが残る/.test(w)) a(`⑦ fifth move ${u}: taken or blocked, the words 「${w}」`); }
    }
  });
  if (Math.min(...nDrop) < 3) add(GID, -1, `④ drops ${nDrop[0]}, board moves ${nDrop[1]} (both 3 or more)`);
  if (kinds.size < 3) add(GID, -1, `追27 only ${kinds.size} kinds of first piece`);
  if (runs < 6) add(GID, -1, `④ the king runs in ${runs} problems (6 or more: 王手と応手を2回くり返して)`);
  (g.ramp || []).forEach((R, j) => { if (!R.sfen) return; const p = pos(R.sfen);
    if (R.k === 'try') { const goal = within(p, 5).sort(); if (goal.join() !== (R.ok || []).slice().sort().join()) add(GID, -1, `追14 warm-up ${j + 1}: ok ${R.ok}, the mates within five ${goal}`); }
    if (R.k === 'explain') { const s = R.seq || []; if (s.length !== 5 || within(p, 3).length || within(p, 5).join() !== s[0]) { add(GID, -1, `追14 warm-up ${j + 1}: not a mate in five with ${s[0]} only`); return; }
      for (let k = 0; k < 5; k++) { const q = pos(R.sfen, s.slice(0, k)); if (!q.legalMoves(true).some(m => q.toUsi(m) === s[k])) { add(GID, -1, `追14 warm-up ${j + 1}: ${s[k]} is not legal`); return; } }
      const q2 = pos(R.sfen, s.slice(0, 2)); if (mates1(q2).length || within(q2, 3).join() !== s[2]) add(GID, -1, `追14 warm-up ${j + 1}: ${s[1]} is not a longest defence or ${s[2]} not the only way on`);
      if (mates1(pos(R.sfen, s.slice(0, 4))).join() !== s[4]) add(GID, -1, `追14 warm-up ${j + 1}: ${s[4]} is not the only mate`);
      const body = plain((R.body && R.body.ja) || '');
      if (/逃げて/.test(body) && !(['1', '3'].every(k => { const q = pos(R.sfen, s.slice(0, +k)), m = q.fromUsi(s[+k]); return !E.isDrop(m) && E.mFrom(m) === q.king[q.side]; }))) add(GID, -1, `追14 warm-up ${j + 1}: the words say the king runs, the line ${s}`);
      for (const pr of pool) if (pr[0] !== `${GID} ramp ${j + 1}`) { const e = dist(brd(R.sfen), pr[1]); if (e <= 6) add(GID, -1, `追1 warm-up ${j + 1}: ${e} squares from ${pr[0]}`); } } });
};

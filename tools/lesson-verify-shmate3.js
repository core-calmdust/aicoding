// (2026-11-26 第2期 担当A) shogi k6「3手詰（基本）」(kind tsume, n 3): the strict ①〜⑨ for every problem, called from
// tools/lesson-verify.js shogi(). From the rules (shogi/engine.js), afresh, over every legal move:
//  ① the stored line is legal, sol[0] checks, every defence after it is mated at once, sol[2] mates after sol[1];
//  ② the goal set (every first move that mates in three) is exactly { sol[0] }, no mate in one, and after sol[1] one move mates;
//  ③ 3+ legal moves, 3+ checks (a choice among checks), the mover is not in check;
//  ④ basic (the intro: 王手・相手の受け・詰み、いちばんねばる受け): 3〜12 checks, 2+ defences after the answer (the defence has to be
//    read), the answer's piece cannot be taken (捨て駒 is k4「3手詰（応用）」), drops and board moves 3+ each, 3+ kinds of first piece;
//  ⑤ 7+ squares from every other shogi problem / warm-up / tsume.json problem (mirrored too), the same first-move shape twice at most;
//  ⑥ d = checks + defences / 2 + legal moves / 100 never falls;
//  ⑦⑧ the 3D words (ショウギツネ) at each of the five places: the question says mate in 3; the praise names the first and the last
//    piece; for every other first move: no check → said so (and the 3D fails it at once, as the 2D ts.notCheck); a check → the stored
//    defence P.ref (legal, after it no move mates — so the 3D's third move cannot mate) and the words say what it does (the king takes /
//    the king steps away / another piece takes / a block, naming the piece); every P.ref is a wrong check; for every third move after
//    the stored line that does not mate: the words of that board (no check / the king takes / the king escapes / taken or blocked);
//  ⑨ the 2D: the same pool, mate in n judged by the rules, a move that is no check fails at once; the warm-ups (every try's ok = every
//    first move that mates in three; the explain's line mates).
// k4「3手詰（応用）」(2026-11-26 担当A) uses the same checks with the theme turned round (SAC): the answer is a sacrifice — a
//    defence can take the piece just played and the stored line sol[1] takes it (取らせて詰ます), 3〜15 checks, the praise speaks of
//    the sacrifice, the 3D intro says the idea and the moves of the promoted pieces in its problems (追32).
module.exports = function shMate3({ E, L, X, pool, brd, dist, add, src, app }, GID = 'k6') {
  const SAC = GID === 'k4', CMAX = SAC ? 15 : 12, g = L.grades.find(x => x.id === GID); if (!g) return;
  const T = E.typeOf, NM = ['', '歩', '香車', '桂馬', '銀', '角', '飛車', '金', '玉', 'と金', '成香', '成桂', '成銀', '馬', '竜'];
  const plain = t => String(t).replace(/<[^>]+>/g, '');
  const pos = s => { const p = new E.Position(); p.setSfen(s); return p; };
  const isChk = (p, m) => { p.doMove(m); const c = p.inCheck(); p.undoMove(); return c; };
  const mates1 = p => { const o = []; for (const m of p.legalMoves(true)) { p.doMove(m); if (p.inCheck() && !p.legalMoves(true).length) o.push(p.toUsi(m)); p.undoMove(); } return o; };
  const mates3 = p => { const o = []; for (const m of p.legalMoves(true)) { p.doMove(m); if (p.inCheck()) { const rs = p.legalMoves(true);
    if (rs.length && rs.every(r => { p.doMove(r); const v = mates1(p).length > 0; p.undoMove(); return v; })) o.push(p.toUsi(m)); } p.undoMove(); } return o; };
  const NOCHK = /王手じゃない|王手にならない|王手でない|王手がかからない/;
  // ⑨ the 2D and the 3D flow
  for (const x of ["if (!p.inCheck()) return fail(t('ts.notCheck'), pr.n > 1);", "if (!p.legalMoves(false).length) return lessonScored(Math.max(0, PTS - pen), { solved: true, alt: !!lesson.offline });"])
    if (!app.includes(x)) add(GID, -1, '⑨ shogi/index.html (tsume) changed: ' + x.slice(0, 50));
  for (const x of ["if (F && !F.check) { p.pre = mv.slice(0, -1); return scored(p, 0, undefined, last); }", "if (mv.length === 1 && !onLine && p.P.ref[mv[0]]) { await sleep(120); await pz().play(p.P.ref[mv[0]]);"])
    if (!src.includes(x)) add(GID, -1, '⑨ the 3D mate-in-3 flow changed: ' + x.slice(0, 50));
  const nDrop = [0, 0], kinds = new Set(), shapes = new Map(); let prevD = -1;
  g.problems.forEach((P, j) => {
    const a = m => add(GID, j, m);
    if (P.kind !== 'tsume' || P.n !== 3 || !P.sol || P.sol.length !== 3) { a('④ not a mate in three'); return; }
    const p = pos(P.sfen), ms = p.legalMoves(true), U = m => p.toUsi(m), ans = P.sol[0];
    if (p.inCheck()) a('④ the mover is in check');
    if (mates1(p).length) a('② a mate in one');
    const goal = mates3(p);
    if (!goal.includes(ans)) a(`① ${ans} does not mate in three (the mates: ${goal})`);
    if (goal.length !== 1) a(`② ${goal.length} first moves mate in three: ${goal}`);
    const checks = ms.filter(m => isChk(p, m));
    if (ms.length < 3) a(`③ ${ms.length} legal moves`);
    if (checks.length < 3 || checks.length > CMAX) a(`③④ ${checks.length} checks (3〜${CMAX})`);
    const m0 = p.fromUsi(ans), drop = E.isDrop(m0), pc = drop ? E.dropType(m0) : T(p.board[E.mFrom(m0)]);
    nDrop[drop ? 0 : 1]++; kinds.add(pc);
    const ksq = p.king[p.side ^ 1], to = E.mTo(m0), side = p.side === 0 ? 1 : -1;
    const sh = `${pc}${drop ? '*' : '-'}${(E.sqFile(to) - E.sqFile(ksq)) * side},${(E.sqRank(to) - E.sqRank(ksq)) * side}`;
    shapes.set(sh, (shapes.get(sh) || 0) + 1); if (shapes.get(sh) > 2) a(`⑤ the same first-move shape (${sh}) a third time`);
    p.doMove(m0); const rs = p.legalMoves(true), rsU = rs.map(r => p.toUsi(r));
    if (rs.length < 2) a(`④ ${rs.length} defence after the answer (2 or more: the defence has to be read)`);
    if (!SAC && rs.some(r => !E.isDrop(r) && E.mTo(r) === to)) a('④ the answer\'s piece can be taken (a sacrifice: k4)');
    if (SAC && !rs.some(r => !E.isDrop(r) && E.mTo(r) === to)) a('④ the answer\'s piece cannot be taken (not a sacrifice)');
    if (SAC && P.sol[1].slice(2, 4) !== ans.slice(2, 4)) a(`④ the stored defence ${P.sol[1]} does not take the sacrificed piece`);
    if (!rsU.includes(P.sol[1])) a(`① ${P.sol[1]} is not a legal defence`);
    else { const r = p.fromUsi(P.sol[1]); p.doMove(r); const f = mates1(p); if (!f.includes(P.sol[2])) a(`① ${P.sol[2]} does not mate after ${P.sol[1]} (${f})`); if (f.length !== 1) a(`② ${f.length} moves mate after ${P.sol[1]}: ${f}`); p.undoMove(); }
    p.undoMove();
    const B = brd(P.sfen); for (const [who, b] of pool) { if (who === `${GID} q${j + 1}`) continue; const e = dist(B, b); if (e <= 6) a(`⑤ ${e} squares from ${who}`); }
    const d = checks.length + rs.length / 2 + ms.length / 100; if (d < prevD) a(`⑥ easier than the problem before (d ${d.toFixed(2)} after ${prevD.toFixed(2)})`); prevD = Math.max(prevD, d);
    // the stored defences of the wrong checks
    const ref = P.ref || {};
    for (const k of Object.keys(ref)) if (k === ans || !checks.some(m => U(m) === k)) a(`⑧ P.ref ${k} is not a wrong check`);
    const refFact = {};
    for (const m of checks) { const u = U(m); if (u === ans) continue; const r = ref[u]; if (!r) { a(`⑦ ${u}: no stored defence P.ref`); continue; }
      p.doMove(m); const ys = p.legalMoves(true).map(y => p.toUsi(y)); if (!ys.includes(r)) { a(`⑦ ${u}: P.ref ${r} is not legal`); p.undoMove(); continue; }
      const y = p.fromUsi(r), kq = p.king[p.side], yk = !E.isDrop(y) && E.mFrom(y) === kq, yt = !E.isDrop(y) && !!p.board[E.mTo(y)], yp = E.isDrop(y) ? E.dropType(y) : T(p.board[E.mFrom(y)]);
      p.doMove(y); if (mates1(p).length) a(`⑦ ${u}: after P.ref ${r} a move still mates`); p.undoMove(); p.undoMove();
      refFact[u] = { k: yk ? (yt ? 0 : 1) : yt ? 2 : 3, pn: NM[yp] }; }
    // ⑦⑧ the 3D words at each of the five places
    for (let k = 0; k < 5; k++) {
      const pr5 = [0, 1, 2, 3, 4].map(() => ({ P, kind: 'tsume', n: 3, why: '', ng: null })); X.shJaLesson(g, pr5); const Q = pr5[k];
      for (const t of [Q.ask, Q.hintTx]) if (/\{|undefined|NaN/.test(t) || !t) a(`⑧ 「${t}」`);
      if (!/3手詰め/.test(Q.ask)) a(`⑧ the question 「${Q.ask}」 does not say mate in 3`);
      const gd = plain(Q.good(ans)), pn = NM[pc], q2 = pos(P.sfen); q2.doMove(q2.fromUsi(P.sol[0])); q2.doMove(q2.fromUsi(P.sol[1]));
      const lm = q2.fromUsi(P.sol[2]), ln = NM[E.isDrop(lm) ? E.dropType(lm) : T(q2.board[E.mFrom(lm)])];
      if (/undefined|NaN|\{/.test(gd) || !gd.includes(pn) || !gd.includes(ln)) a(`⑧ the praise 「${gd}」 does not name the ${pn} and the last ${ln}`);
      if (drop ? !/打|持ち駒の/.test(gd) : /打|持ち駒の/.test(gd)) a(`⑧ the praise 「${gd}」 does not say ${drop ? 'a drop' : 'a board move'}`);
      if (!SAC && /捨て/.test(gd)) a(`⑧ the praise 「${gd}」 speaks of a sacrifice`);
      if (SAC && !/捨て|取らせ|取られる場所|ただで渡/.test(gd)) a(`⑧ the praise 「${gd}」 does not speak of the sacrifice`);
      for (const m of ms) { const u = U(m); if (u === ans) continue; const w = plain(Q.ng(u));
        if (/undefined|NaN/.test(w) || !w.includes('{x}')) { a(`⑧ ${u}: 「${w}」`); continue; }
        if (!isChk(p, m)) { if (!NOCHK.test(w)) a(`⑦ ${u} is no check, the words do not say so 「${w}」`); continue; }
        if (NOCHK.test(w)) { a(`⑦ ${u} is a check, the words say it is not 「${w}」`); continue; }
        const F = refFact[u]; if (!F) continue;
        const ok = [/玉(に|が)[^。]*取/.test(w) && !/逃げ道が残/.test(w), /逃げ/.test(w) && !/取/.test(w), w.includes(F.pn) && /取/.test(w) && !/玉(に|が)[^。]*取/.test(w), w.includes(F.pn) && /合駒|間に/.test(w)][F.k];
        if (!ok) a(`⑦ ${u}: the defence ${ref[u]} (${['the king takes', 'the king steps away', 'the ' + F.pn + ' takes', 'a ' + F.pn + ' block'][F.k]}), the words 「${w}」`); }
      // a third move after the stored line that does not mate: the words of its board
      const q = pos(P.sfen); q.doMove(q.fromUsi(P.sol[0])); q.doMove(q.fromUsi(P.sol[1]));
      for (const m of q.legalMoves(true)) { const u = q.toUsi(m); if (u === P.sol[2]) continue; Q.pre = P.sol.slice(0, 2); const w = plain(Q.ng(u));
        if (/undefined|NaN|\{/.test(w) || !w) { a(`⑧ third move ${u}: 「${w}」`); continue; }
        if (/が正解|答えは|正解は|いちばんは/.test(w)) a(`⑧ third move ${u}: the words name the first move's answer 「${w}」`);
        q.doMove(m); const chk = q.inCheck(), ys = chk ? q.legalMoves(true) : [], kq = q.king[q.side], mto = E.mTo(m);
        const kMoves = new Set(ys.filter(y => !E.isDrop(y) && E.mFrom(y) === kq).map(y => E.mTo(y)));
        const kTake = ys.some(y => !E.isDrop(y) && E.mFrom(y) === kq && E.mTo(y) === mto) && q.attackers(kq, q.side ^ 1).includes(mto), mvN = NM[T(q.board[mto])]; q.undoMove();
        if (chk && !ys.length) { a(`① third move ${u} mates too`); continue; }
        if (!chk) { if (!NOCHK.test(w)) a(`⑦ third move ${u} is no check, the words 「${w}」`); continue; }
        if (NOCHK.test(w)) { a(`⑦ third move ${u} is a check, the words say no 「${w}」`); continue; }
        if (kTake) { if (!/玉(に|が)[^。]*取/.test(w) || !w.includes(mvN)) a(`⑦ third move ${u}: the king takes it, the words 「${w}」`); continue; }
        if (/玉に(そのまま)?取られ|玉が取れる|玉が[^。]*を取って/.test(w)) { a(`⑦ third move ${u}: the king cannot take it, the words 「${w}」`); continue; }
        const nm = (w.match(/逃げ道が(\d)つ|(\d)マス逃げ場/) || []).slice(1).find(Boolean);
        if (kMoves.size) { if (/取るか合駒|ほかの駒で受け|合駒で受け/.test(w) || nm && +nm !== kMoves.size || !/逃げ/.test(w)) a(`⑦ third move ${u}: the king escapes (${kMoves.size}), the words 「${w}」`); }
        else if (!/取るか合駒|ほかの駒で受け|合駒で受け|受けがある|受けが残る/.test(w)) a(`⑦ third move ${u}: taken or blocked, the words 「${w}」`); }
    }
  });
  if (Math.min(...nDrop) < 3) add(GID, -1, `④ drops ${nDrop[0]}, board moves ${nDrop[1]} (both 3 or more)`);
  if (kinds.size < 3) add(GID, -1, `追27 only ${kinds.size} kinds of first piece`);
  (g.ramp || []).forEach((R, j) => { if (!R.sfen) return; const p = pos(R.sfen), goal = mates3(p).sort();
    if (R.k === 'try' && goal.join() !== (R.ok || []).slice().sort().join()) add(GID, -1, `追14 warm-up ${j + 1}: ok ${R.ok}, the mates in three ${goal}`);
    if (R.k === 'explain' && R.seq) { if (!goal.includes(R.seq[0])) add(GID, -1, `追14 warm-up ${j + 1}: ${R.seq[0]} does not mate in three`);
      else { p.doMove(p.fromUsi(R.seq[0])); const ok = p.legalMoves(true).some(y => p.toUsi(y) === R.seq[1]); if (!ok) add(GID, -1, `追14 warm-up ${j + 1}: ${R.seq[1]} is not legal`); else { p.doMove(p.fromUsi(R.seq[1])); if (!mates1(p).includes(R.seq[2])) add(GID, -1, `追14 warm-up ${j + 1}: ${R.seq[2]} does not mate`); } } } });
};

// (2026-11-27 第2期 担当A) shogi k3「詰めろを受ける」(src defend, mode cp): the strict ①〜⑨ for every problem, called from
// tools/lesson-verify.js shogi(). From the rules (shogi/engine.js), afresh: the mover is not in check, with a pass the opponent mates
// in one (P.th = exactly those mates), ① ② exactly one legal move (the answer) leaves the opponent no mate within three (and none
// within seven: solveMate) — after every other move the opponent mates within three (P.rep = that first mating move, the same in
// shogi/lesson-replies.json with a mate score); the answer gives no check and after it no piece but a pawn is taken for free; the
// engine (depth 5, every root move) puts the answer first and 500+ above the second; cand = every legal move once, best first, the
// others 600+ below (0 points in the 2D and the 3D — 追3・追72); ③ 12+ legal moves; ⑤ 7+ squares from every other shogi problem /
// warm-up / tsume; ⑥ d = the other moves that stop the mate in one but are mated in three (+ legal / 1000) never falls; 追27 three
// kinds of answer (逃げる・取る・打つ・寄せる) twice each at least and 5+ kinds of piece; ⑦⑧ the 3D words at each of the five places:
// the hint names the threat (P.th[0]) and the lit piece, the praise the kind of answer, the threat and that the other moves are mated;
// every other legal move: the answer named, the opponent's mating move (its square) and 詰; the warm-ups' ok = every defence (no
// mate in one after it, the same within three) and the 2D words r.dfOk (14 languages), lessonReason 'defend'.
const path = require('path'), fs = require('fs');
module.exports = function shDefend({ ROOT, E, L, X, pool, brd, dist, add, src, app }) {
  const T = E.typeOf, g = L.grades.find(x => x.id === 'k3'); if (!g) return;
  const REP = JSON.parse(fs.readFileSync(path.join(ROOT, 'shogi/lesson-replies.json'), 'utf8'));
  const pos = s => { const p = new E.Position(); p.setSfen(s); return p; };
  const NM = ['', '歩', '香車', '桂馬', '銀', '角', '飛車', '金', '玉', 'と金', '成香', '成桂', '成銀', '馬', '竜'];
  const ZEN = '０１２３４５６７８９', KAN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'], sqJ = u => ZEN[+u[2]] + KAN[u.charCodeAt(3) - 96];
  const mates1 = q => { const o = []; for (const y of q.legalMoves(true)) { q.doMove(y); if (q.inCheck() && !q.legalMoves(true).length) o.push(q.toUsi ? y : y); q.undoMove(); } return o.map(y => q.toUsi(y)); };
  const within = (p, n) => { const o = []; for (const m of p.legalMoves(true)) { p.doMove(m); if (p.inCheck()) { const rs = p.legalMoves(true);
    if (!rs.length || (n > 1 && rs.every(r => { p.doMove(r); const v = within(p, n - 2).length > 0; p.undoMove(); return v; }))) o.push(m); } p.undoMove(); } return o.map(m => p.toUsi(m)); };
  const kindOf = (p, m) => E.isDrop(m) ? 'drop' : T(p.board[E.mFrom(m)]) === 8 ? 'flee' : p.board[E.mTo(m)] ? 'capture' : 'move';
  const plain = t => String(t).replace(/<[^>]+>/g, '');
  const CP = "if (P.mode === 'cp') { const best = P.cand[0][1], c = P.cand.find(x => x[0] === u), s = c ? c[1] : P.floor; return Math.max(0, Math.min(PTS - 1, Math.round(PTS * (1 - (best - s) / 500)))); }";
  if (!src.includes(CP)) add('k3', -1, '⑨ the 3D SHOGI.points (cp) changed');
  if (!app.includes(CP.replace(/P\./g, 'pr.').replace(/\bu\)/g, 'usi)'))) add('k3', -1, '⑨ shogi/index.html movePoints (cp) changed');
  for (const x of ["case 'defend': {", "return th ? t('r.dfOk', { m: M, r: kan1(pr.sfen.replace(/ ([bw]) /, (_, c) => c === 'b' ? ' w ' : ' b '), th) }) : '';", "return t('r.evMate', { m: M, r: kan1(q.sfen(), rp[0]) });"])
    if (!app.includes(x)) add('k3', -1, '⑨ shogi/index.html lessonReason (defend) changed: ' + x.slice(0, 60));
  const I18 = fs.readFileSync(path.join(ROOT, 'shogi/i18n.js'), 'utf8'); for (const k of ['r.dfOk', 'r.evMate']) { const n = (I18.match(new RegExp(`["']${k.replace('.', '\\.')}["']:`, 'g')) || []).length; if (n < 14) add('k3', -1, `⑨ the 2D words ${k} in ${n} of 14 languages`); }
  for (const [k, v] of Object.entries(g.intro)) if (!/ただ一つ|only one|只有一个|하나뿐|solo una|un seul|só um|nur ein|सिर्फ़ एक|واحدة فقط|только один|只有一個|hanya satu|tek bir/.test(v.join(' '))) add('k3', -1, `⑧ the intro (${k}) does not say one move only stops the mate`);
  X.setRep(REP);
  let prevD = -1; const kinds = {}, movers = new Set();
  g.problems.forEach((P, j) => { const a = m => add('k3', j, m);
    if (P.kind !== 'best' || P.src !== 'defend' || P.mode !== 'cp') { a('④ not a defend problem (best / defend / cp)'); return; }
    if (P.expl || P.expl0) a('⑧ a stored explanation (the reason is said from the board)');
    const p = pos(P.sfen), ms = p.legalMoves(true), U = m => p.toUsi(m), us = ms.map(U);
    if (p.inCheck()) { a('④ the mover is in check'); return; }
    if (ms.length < 12) a(`③ ${ms.length} legal moves`);
    p.doNull(); const th = mates1(p); p.undoNull();
    if (!th.length) { a('④ no mate in one with a pass (not a 詰めろ)'); return; }
    if (JSON.stringify([...th].sort()) !== JSON.stringify([...(P.th || [])].sort())) a(`⑧ P.th ${P.th} is not the mates after a pass (${th})`);
    if ((P.accept || []).length !== 1) { a('② not one answer'); return; }
    const ans = P.accept[0], am = p.fromUsi(ans); if (!us.includes(ans)) { a(`① ${ans} is not legal`); return; }
    if (ms.filter(m => (E.isDrop(m) ? 'd' + E.dropType(m) : 's' + E.mFrom(m)) === (E.isDrop(am) ? 'd' + E.dropType(am) : 's' + E.mFrom(am))).length >= ms.length) a('追52 the lit piece makes every legal move');
    // ① ② every legal move from the rules
    let n3 = 0; const R = REP['k3/' + j] || {};
    for (const m of ms) { const u = U(m); p.doMove(m); const f1 = mates1(p), f3 = f1.length ? f1 : within(p, 3);
      if (u === ans) {
        if (f3.length) a(`① after the answer ${ans} the opponent mates (${f3[0]})`);
        if (p.inCheck()) a('④ the answer gives check (a defence by check)');
        let m5 = null; try { m5 = E.solveMate(p, 7, 1000000); } catch (e) {} if (m5 && m5.mate) a(`① after the answer a mate in ${m5.mate}`);
        for (const y of p.legalMoves(true)) { if (E.isDrop(y) || !p.board[E.mTo(y)]) continue; const tk = T(p.board[E.mTo(y)]); p.doMove(y); const back = p.legalMoves(true).some(z => !E.isDrop(z) && E.mTo(z) === E.mTo(y)); p.undoMove(); if (!back && tk !== 1) a(`⑧ after ${ans} the opponent takes a ${NM[tk]} for free (${p.toUsi(y)})`); }
        if (!R[ans] || R[ans][1] <= -29000) a('⑦ shogi/lesson-replies.json: no answer (or a mate) after the answer');
        if ((P.pv || [])[0] !== ans || (R[ans] && P.pv[1] !== R[ans][0])) a('⑧ pv is not the answer and the opponent\'s reply');
      } else {
        if (!f3.length) a(`② ${u} also leaves no mate within three`);
        if (!f1.length) n3++;
        const rp = (P.rep || {})[u];
        if (!rp || rp[1] !== 'mate' || !f3.includes(rp[0])) a(`⑦ ${u}: the stored reply ${rp} is not a mating move (${f3.slice(0, 3)})`);
        if (!R[u] || !rp || R[u][0] !== rp[0] || R[u][1] > -29000) a(`⑦ ${u}: lesson-replies.json ${R[u]} but rep ${rp}`);
      }
      p.undoMove(); }
    const cs = new Map(P.cand || []); if (cs.size !== us.length || us.some(u => !cs.has(u))) a('⑨ cand is not every legal move once');
    if ((P.cand || [[]])[0][0] !== ans) a('① cand[0] is not the answer');
    for (let k = 1; k < (P.cand || []).length; k++) { if (P.cand[k][1] > P.cand[k - 1][1]) a('⑨ cand is not best first'); if (P.cand[k][1] > P.cand[0][1] - 600) a(`② ${P.cand[k][0]} only ${P.cand[0][1] - P.cand[k][1]} below the answer`); }
    const r = new E.Searcher(p).analyze({ depth: 5, time: 0 }).sort((x, y) => y.s - x.s);
    if (U(r[0].m) !== ans) a(`① the engine prefers ${U(r[0].m)} (${r[0].s}) to ${ans}`);
    else if (r[1] && r[1].s > r[0].s - 500) a(`追63 ${U(r[1].m)} is ${r[0].s - r[1].s} below the answer`);
    // ⑤ no near twin
    const B = brd(P.sfen); for (const [w, b] of pool) { if (w === `k3 q${j + 1}`) continue; const e = dist(B, b); if (e <= 6) a(`⑤ ${e} squares from ${w}`); }
    // ⑥ easier first
    const d = n3 + ms.length / 1000; if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d);
    const kd = kindOf(p, am); kinds[kd] = (kinds[kd] || 0) + 1; movers.add(E.isDrop(am) ? 'd' + E.dropType(am) : T(p.board[E.mFrom(am)]));
    // ⑦⑧ the 3D words at each of the five places
    const tq = pos(P.sfen); tq.doNull(); const thSq = sqJ(P.th[0]);
    const tkn = !E.isDrop(am) && p.board[E.mTo(am)] ? NM[T(p.board[E.mTo(am)])] : '', mvn = E.isDrop(am) ? NM[E.dropType(am)] : NM[T(p.board[E.mFrom(am)])];
    for (let k = 0; k < 5; k++) { const pr5 = [0, 1, 2, 3, 4].map(() => ({ P, kind: 'best', why: '', ng: null })); X.shJaLesson(g, pr5); const Q = pr5[k];
      for (const t of [Q.ask, Q.hintTx]) if (!t || /\{|undefined|NaN/.test(t)) a(`⑧ 「${t}」`);
      if (!/光っている駒/.test(Q.hintTx) || !Q.hintTx.includes(thSq)) a(`追7 the hint does not name the threat ${thSq} and the lit piece 「${Q.hintTx}」`);
      const gd = plain(Q.good(ans));
      if (/undefined|NaN|\{x\}/.test(gd)) a(`⑧ 「${gd}」`);
      if (!gd.includes(thSq)) a(`⑧ the praise does not name the threat ${thSq} 「${gd}」`);
      if (kd === 'flee' && !/玉/.test(gd)) a(`⑧ the praise does not say the king moves 「${gd}」`);
      if (kd === 'capture' && !gd.includes(tkn)) a(`⑧ the praise does not name the piece taken (${tkn}) 「${gd}」`);
      if (kd === 'drop' && !(gd.includes(mvn) && /打/.test(gd))) a(`⑧ the praise does not say the ${mvn} is dropped 「${gd}」`);
      if (kd === 'move' && !gd.includes(mvn)) a(`⑧ the praise does not name the piece moved (${mvn}) 「${gd}」`);
      const fill = P.th.some(x => x.slice(2, 4) === ans.slice(2, 4)); if (!fill && /ふさ|埋め|入るマス/.test(gd)) a(`⑧ the praise says the answer fills the threat's square 「${gd}」`);
      if (!/ほかの|これ以外/.test(gd) || !/詰/.test(gd)) a(`⑧ the praise does not say the other moves are mated 「${gd}」`);
      if (plain(gd).length > 150) a(`⑧ the praise is ${plain(gd).length} letters`);
      for (const u of us) { if (u === ans) continue; const w = plain(Q.ng(u)), rp = (P.rep || {})[u]; if (!rp) continue;
        if (/undefined|NaN/.test(w)) { a(`⑧ ${u}: 「${w}」`); break; }
        if (!w.includes('{m}')) { a(`⑦ ${u}: the words do not name the answer 「${w}」`); break; }
        if (!w.includes(sqJ(rp[0])) || !/詰/.test(w)) { a(`⑦ ${u}: the words do not name the mate ${rp[0]} 「${w}」`); break; } } }
  });
  if (Object.keys(kinds).filter(k => kinds[k] >= 2).length < 3) add('k3', -1, `追27 the kinds of answer ${JSON.stringify(kinds)} (three kinds twice each at least)`);
  if (movers.size < 5) add('k3', -1, `追27 only ${movers.size} kinds of answer piece`);
  // the warm-ups: ok = every defence (after it no mate in one), the same within three, a third of the legal moves at most
  (g.ramp || []).forEach((R, j) => { if (R.k !== 'try') return; const p = pos(R.sfen), ms = p.legalMoves(true);
    p.doNull(); const th = mates1(p); p.undoNull(); if (!th.length) add('k3', -1, `warm-up ${j + 1}: no threat`);
    const ok = []; for (const m of ms) { p.doMove(m); const v = !mates1(p).length, w = !within(p, 3).length; p.undoMove(); if (v !== w) add('k3', -1, `warm-up ${j + 1}: ${p.toUsi(m)} stops the mate in one but is mated in three`); if (v) ok.push(p.toUsi(m)); }
    if (JSON.stringify(ok.sort()) !== JSON.stringify([...R.ok].sort())) add('k3', -1, `warm-up ${j + 1}: ok ${R.ok} but the defences are ${ok}`);
    if (ok.some(u => { p.doMove(p.fromUsi(u)); const c = p.inCheck(); p.undoMove(); return c; })) add('k3', -1, `warm-up ${j + 1}: a defence by check`); });
};

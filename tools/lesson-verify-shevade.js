// (2026-11-25 第2期 担当A) shogi k12「王手をかわす」(src evade, mode cp): the strict ①〜⑨ for every problem, called from
// tools/lesson-verify.js shogi(). From the rules and the engine (shogi/engine.js), afresh: the mover is in check, 3+ legal
// defences of 2+ kinds (逃げる・取る・合駒) by 2+ pieces (追52: the hint's lit piece narrows the choice), the answer the engine's
// best (depth 5, every root move searched in full) by 500+ (追63; the stored cand: every legal move, the others 600+ below, so
// 0 points in the 2D and the 3D — 追3・追72), after the answer no mate in one and no piece the opponent takes for free (the
// praise says so), every other defence answered by a mate or a capture (the stored rep = shogi/lesson-replies.json: the
// opponent's move, a mate in one when there is one), ⑤ 7+ squares from every other shogi problem / warm-up, ⑥ d = legal
// moves + pieces / 2 + kind (取る 0・逃げる 2・合駒 4) never falls, 追27 each kind answers 3+ problems, and the 3D words
// (ショウギツネ) for the answer and every other legal move at each of the five places: the kind of defence, the opponent's
// answer (its square) and what it does (詰ま… / the piece taken), never the shLoss words.
const path = require('path'), fs = require('fs');
module.exports = function shEvade({ ROOT, E, L, X, pool, brd, dist, add, src, app }) {
  const T = E.typeOf, g = L.grades.find(x => x.id === 'k12'); if (!g) return;
  const REP = JSON.parse(fs.readFileSync(path.join(ROOT, 'shogi/lesson-replies.json'), 'utf8'));
  const pos = s => { const p = new E.Position(); p.setSfen(s); return p; };
  const NM = ['', '歩', '香車', '桂馬', '銀', '角', '飛車', '金', '玉', 'と金', '成香', '成桂', '成銀', '馬', '龍'];
  const ZEN = '０１２３４５６７８９', KAN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'], sqJ = u => ZEN[+u[2]] + KAN[u.charCodeAt(3) - 96];
  const LOSS = ['相手に強い反撃のチャンス', '玉や大駒のまわりにすき', '駒の働きに大きな差', '相手に先に良い場所', '駒の働きが一歩おくれる', '相手のねらいへの備え', '駒の働きがほんの少し', '悪くはないけど', '差は小さいけど', 'そのあとも相手の攻めが続いちゃう'];
  const kindOf = (p, m) => E.isDrop(m) ? 'block' : p.attackers(p.king[p.side], p.side ^ 1).includes(E.mTo(m)) ? 'capture' : T(p.board[E.mFrom(m)]) === 8 ? 'flee' : 'block';   // (取る = takes the piece giving check)
  const mate1 = q => { for (const y of q.legalMoves(true)) { q.doMove(y); const n = q.legalMoves(true).length; q.undoMove(); if (!n) return q.toUsi(y); } return ''; };
  const plain = t => String(t).replace(/<[^>]+>/g, '');
  // ⑨ the 2D and the 3D score the same way (mode cp), the 2D says the kind and the opponent's answer (14 languages)
  const CP = "if (P.mode === 'cp') { const best = P.cand[0][1], c = P.cand.find(x => x[0] === u), s = c ? c[1] : P.floor; return Math.max(0, Math.min(PTS - 1, Math.round(PTS * (1 - (best - s) / 500)))); }";
  if (!src.includes(CP)) add('k12', -1, '⑨ the 3D SHOGI.points (cp) changed');
  if (!app.includes(CP.replace(/P\./g, 'pr.').replace(/\bu\)/g, 'usi)'))) add('k12', -1, '⑨ shogi/index.html movePoints (cp) changed');
  for (const x of ["if (pr.accept.includes(usi)) return t('r.evOk', { m: M });", "tail = rp[1] === 'mate' ? t('r.evMate', { m: M, r: R }) : t('r.evTake', { m: M, r: R, p: NAME[E.typeOf(q.board[E.mTo(y)])] });", ])
    if (!app.includes(x)) add('k12', -1, '⑨ shogi/index.html lessonReason (evade) changed: ' + x.slice(0, 50));
  if (!app.includes("const chk = p.attackers(p.king[p.side], p.side ^ 1), kind = x => E.isDrop(x) ? 'r.block' : chk.includes(E.mTo(x)) ? 'r.capture'")) add('k12', -1, '⑨ the 2D kind: 取る is taking the checker');
  const I18 = fs.readFileSync(path.join(ROOT, 'shogi/i18n.js'), 'utf8'); for (const k of ['r.evade', 'r.evMate', 'r.evTake', 'r.evOk', 'r.flee', 'r.capture', 'r.block']) { const n = (I18.match(new RegExp(`["']${k.replace('.', '\\.')}["']:`, 'g')) || []).length; if (n < 14) add('k12', -1, `⑨ the 2D words ${k} in ${n} of 14 languages`); }
  const ctxPts = (P, u) => (P.accept || []).includes(u) ? 20 : (() => { const best = P.cand[0][1], c = P.cand.find(x => x[0] === u), s = c ? c[1] : P.floor; return Math.max(0, Math.min(19, Math.round(20 * (1 - (best - s) / 500)))); })();
  X.setRep(REP);
  let prevD = -1; const kinds = {}, movers = new Set();
  g.problems.forEach((P, j) => { const a = m => add('k12', j, m);
    if (P.kind !== 'best' || P.src !== 'evade' || P.mode !== 'cp') { a('④ not an evade problem (best / evade / cp)'); return; }
    if (P.expl) a('⑧ a stored explanation (the reason is said from the board)');
    const p = pos(P.sfen), ms = p.legalMoves(true), U = m => p.toUsi(m), us = ms.map(U);
    if (!p.inCheck()) { a('④ the mover is not in check'); return; }
    if (ms.length < 3) a(`③ ${ms.length} legal moves`);
    const kd = new Map(ms.map(m => [U(m), kindOf(p, m)])), who = m => E.isDrop(m) ? 'd' + E.dropType(m) : 's' + E.mFrom(m);
    if (new Set(kd.values()).size < 2) a('④ one kind of defence only');
    if ((P.accept || []).length !== 1) { a('② not one answer'); return; }
    const ans = P.accept[0], am = p.fromUsi(ans); if (!us.includes(ans)) { a(`① ${ans} is not legal`); return; }
    if (ms.filter(m => who(m) === who(am)).length >= ms.length) a('追52 the lit piece makes every legal move');
    // ① ② the stored candidates and the engine afresh
    const cs = new Map(P.cand || []); if (cs.size !== us.length || us.some(u => !cs.has(u))) a('⑨ cand is not every legal move once');
    if ((P.cand || [[]])[0][0] !== ans) a('① cand[0] is not the answer');
    for (let k = 1; k < (P.cand || []).length; k++) { if (P.cand[k][1] > P.cand[k - 1][1]) a('⑨ cand is not best first'); if (P.cand[k][1] > P.cand[0][1] - 600) a(`② ${P.cand[k][0]} only ${P.cand[0][1] - P.cand[k][1]} below the answer`); }
    us.forEach(u => { if (u !== ans && ctxPts(P, u) > 0) a(`追3 ${u} scores ${ctxPts(P, u)}`); });
    const r = new E.Searcher(p).analyze({ depth: 5, time: 0 }).sort((x, y) => y.s - x.s);
    if (U(r[0].m) !== ans) a(`① the engine prefers ${U(r[0].m)} (${r[0].s}) to ${ans}`);
    else if (r[1] && r[1].s > r[0].s - 500) a(`追63 ${U(r[1].m)} is ${r[0].s - r[1].s} below the answer`);
    // the answer: no mate in one, nothing taken for free (what the praise and the 2D say)
    { const q = pos(P.sfen); q.doMove(q.fromUsi(ans)); if (mate1(q)) a(`⑧ after ${ans} the opponent mates in one`);
      for (const y of q.legalMoves(true)) { if (E.isDrop(y) || !q.board[E.mTo(y)]) continue; q.doMove(y); const back = q.legalMoves(true).some(z => !E.isDrop(z) && E.mTo(z) === E.mTo(y)); q.undoMove(); if (!back) a(`⑧ after ${ans} the opponent takes for free (${q.toUsi(y)})`); } }
    const R = REP['k12/' + j] || {}; if (!R[ans] || R[ans][1] <= -29000) a('⑦ shogi/lesson-replies.json: no answer (or a mate) after the answer');
    if ((P.pv || [])[0] !== ans || (R[ans] && P.pv[1] !== R[ans][0])) a('⑧ pv is not the answer and the opponent\'s reply');
    // ⑦ every other defence: a mate or a capture, the same in rep and lesson-replies.json
    const fact = {};
    for (const u of us) { if (u === ans) continue; const q = pos(P.sfen); q.doMove(q.fromUsi(u)); const m1 = mate1(q), rp = (P.rep || {})[u];
      if (!rp) { a(`⑦ ${u}: no stored reply`); continue; }
      if (!R[u] || R[u][0] !== rp[0]) a(`⑦ ${u}: lesson-replies.json ${R[u] && R[u][0]} but rep ${rp[0]}`);
      if (m1 && (rp[1] !== 'mate' || rp[0] !== m1)) a(`⑦ ${u}: ${m1} mates in one, rep says ${rp}`);
      const y = q.fromUsi(rp[0]); if (!q.legalMoves(true).some(z => q.toUsi(z) === rp[0])) { a(`⑦ ${u}: the reply ${rp[0]} is not legal`); continue; }
      if (rp[1] === 'mate') { if (!m1) { const o = new E.Searcher(q).rootSearch({ depth: 5, time: 0 }); if (!(o.score >= E.MATE - 300)) a(`⑦ ${u}: said mated, the engine finds no mate`); if (R[u] && R[u][1] > -29000) a(`⑦ ${u}: said mated, lesson-replies.json ${R[u][1]}`); } fact[u] = { mate: true, r: rp[0] }; }
      else { const tk = !E.isDrop(y) && q.board[E.mTo(y)] ? T(q.board[E.mTo(y)]) : 0; if (!tk || tk === 8) { a(`⑦ ${u}: the reply ${rp[0]} takes nothing`); continue; }
        const mvT = E.isDrop(p.fromUsi(u)) ? E.dropType(p.fromUsi(u)) : T(p.board[E.mFrom(p.fromUsi(u))]), took = kd.get(u) === 'capture' ? T(p.board[E.mTo(p.fromUsi(u))]) : 0;
        if (rp[0].slice(2, 4) === u.slice(2, 4) && took && E.VALUE[took] >= E.VALUE[mvT]) a(`⑦ ${u}: an even trade (the words would say nothing)`);
        if (R[u] && R[u][1] <= -29000) a(`⑦ ${u}: said taken, lesson-replies.json says mated`); fact[u] = { take: NM[tk], r: rp[0] }; } }
    // ⑤ no near twin
    const B = brd(P.sfen); for (const [w, b] of pool) { if (w === `k12 q${j + 1}`) continue; const e = dist(B, b); if (e <= 6) a(`⑤ ${e} squares from ${w}`); }
    // ⑥ easier first
    const np = P.sfen.split(' ')[0].replace(/[^A-Za-z]/g, '').length, d = ms.length + np / 2 + { capture: 0, flee: 2, block: 4 }[kd.get(ans)];
    if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d);
    kinds[kd.get(ans)] = (kinds[kd.get(ans)] || 0) + 1; movers.add(who(am).startsWith('d') ? who(am) : T(p.board[E.mFrom(am)]));
    // ⑦⑧ the 3D words at each of the five places
    const KL = u => { const m = p.fromUsi(u), k = kd.get(u), tk = !E.isDrop(m) && p.board[E.mTo(m)];   // (the kind of defence in the words: 取る＝the checker named, 逃げる＝the king (and the piece it takes on the way), 合駒＝the piece put between)
      return k === 'capture' ? new RegExp('\\{x\\}(は|で)(王手(の|している))?' + NM[T(tk)] + 'を取(る|った|って)') : k === 'flee' ? (tk ? new RegExp('\\{x\\}(は|で)(玉が)?' + NM[T(tk)] + 'を取(りながら|って|りつつ)(玉が|玉を)?逃') : /\{x\}(は|で)玉(が逃げ|を逃が|をよけ)/) : new RegExp('\\{x\\}(は|で)' + NM[E.isDrop(m) ? E.dropType(m) : T(p.board[E.mFrom(m)])] + '(の合駒|を間に|で王手をさえぎ)'); };
    for (let k = 0; k < 5; k++) { const pr5 = [0, 1, 2, 3, 4].map(() => ({ P, kind: 'best', why: '', ng: null })); X.shJaLesson(g, pr5); const Q = pr5[k];
      for (const t of [Q.ask, Q.hintTx]) if (!t || /\{|undefined|NaN/.test(t)) a(`⑧ 「${t}」`);
      if (!/光っている駒/.test(Q.hintTx)) a(`追7 the hint does not point to the lit piece 「${Q.hintTx}」`);
      const gd = plain(Q.good(ans)), ak = kd.get(ans);
      if (/undefined|NaN|\{x\}/.test(gd)) a(`⑧ 「${gd}」`);
      if (ak === 'flee' && !/玉|逃げ/.test(gd)) a(`⑧ the praise does not say the king escapes 「${gd}」`);
      if (ak === 'capture' && !gd.includes(NM[T(p.board[E.mTo(am)])].slice(0, 1))) a(`⑧ the praise does not name the piece taken 「${gd}」`);
      if (ak === 'block' && !/合駒|間に/.test(gd)) a(`⑧ the praise does not say it blocks 「${gd}」`);
      if (!/ほかの/.test(gd)) a(`⑧ the praise does not say what the other defences lead to 「${gd}」`);
      for (const u of us) { if (u === ans) continue; const w = plain(Q.ng(u)), f = fact[u]; if (!f) continue;
        if (/undefined|NaN/.test(w)) { a(`⑧ ${u}: 「${w}」`); continue; }
        if (!w.includes('{m}')) a(`⑦ ${u}: the words do not name the answer 「${w}」`);
        if (!KL(u).test(w)) a(`⑦ ${u}: the words do not say the kind of defence (${KL(u)}) 「${w}」`);
        if (!w.includes(sqJ(f.r))) a(`⑦ ${u}: the words do not name the reply ${f.r} 「${w}」`);
        if (f.mate && !/詰[まん]/.test(w)) a(`⑦ ${u}: mated, the words do not say so 「${w}」`);
        if (f.take && !(w.includes(f.take) && /取られ/.test(w))) a(`⑦ ${u}: the ${f.take} is taken, the words do not say so 「${w}」`);
        if (LOSS.some(x => w.includes(x))) a(`追16 ${u}: the words fall back on a general loss 「${w}」`); } }
  });
  for (const k of ['flee', 'capture', 'block']) if ((kinds[k] || 0) < 3) add('k12', -1, `追27 ${k} answers ${kinds[k] || 0} problems (3 or more each)`);
  if (movers.size < 6) add('k12', -1, `追27 only ${movers.size} kinds of answer`);
};

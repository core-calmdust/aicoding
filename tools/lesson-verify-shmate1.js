// (2026-11-26 第2期 担当A) shogi k10「1手詰（基本）」(kind tsume, n 1): the strict ①〜⑨ for every problem, called from
// tools/lesson-verify.js shogi(). From the rules (shogi/engine.js), afresh, over every legal move:
//  ① the stored answer mates at once and the goal set (every move that mates in one) is exactly { the answer } — ② no second mate;
//  ③ 3+ checks (追19: a choice among checks, not the only one) and the mover is not in check;
//  ④ basic: 3〜8 checks (k8「1手詰（応用）」has 9 or more), the lesson's answers both drop and move a board piece (the intro: 持ち駒を打つ手と
//    盤上の駒を動かす手の両方), 3+ kinds of piece mate (追27), no pawn drop answer (打ち歩詰め is the rules step);
//  ⑤ 7+ squares from every other shogi problem / warm-up / tsume.json problem (mirrored too) — the old pool was 7 of 12 copies of
//    tsume.json p1 — and the same mating shape (piece, drop or move, where it lands from the king) at most twice;
//  ⑥ d = checks + legal moves / 100 never falls (both the 2D and the 3D keep the pool's order);
//  ⑦⑧ the 3D words (ショウギツネ) at each of the five places, for every legal move: a move that is no check is called no check; a check
//    the king takes is named so (the piece); a check that leaves the king N squares says N (the engine's king moves); a check with
//    no king move says it is taken or blocked (and it is); the praise names the piece and says 打 for a drop only;
//  ⑨ the 2D: the same pool, n 1 judged by the rules, the reason after a check that does not mate (mate1Why: the king takes / the king
//    escapes / another piece takes / a block — 14 languages) and the warm-ups (every try's ok = every mate in one of its board).
const path = require('path'), fs = require('fs');
module.exports = function shMate1({ ROOT, E, L, X, pool, brd, dist, add, src, app }) {
  const T = E.typeOf, g = L.grades.find(x => x.id === 'k10'); if (!g) return;
  const NM = ['', '歩', '香車', '桂馬', '銀', '角', '飛車', '金', '玉', 'と金', '成香', '成桂', '成銀', '馬', '竜'];
  const plain = t => String(t).replace(/<[^>]+>/g, '');
  const pos = s => { const p = new E.Position(); p.setSfen(s); return p; };
  const mates1 = p => { const o = []; for (const m of p.legalMoves(true)) { p.doMove(m); if (p.inCheck() && !p.legalMoves(true).length) o.push(p.toUsi(m)); p.undoMove(); } return o; };
  // ⑨ the 2D
  for (const x of ["if (remain <= 0) return fail(pr.n === 1 ? t('ls.notMate') + mate1Why(pr.sfen, usi) : PZBook.t('outOfMoves', { n: pr.n }));", 'function mate1Why(sfen, usi) {'])
    if (!app.includes(x)) add('k10', -1, '⑨ shogi/index.html (mate in one) changed: ' + x.slice(0, 50));
  const I18 = fs.readFileSync(path.join(ROOT, 'shogi/i18n.js'), 'utf8');
  for (const k of ['r.m1KTake', 'r.m1Esc', 'r.m1Take', 'r.m1Block', 'ls.notMate', 'ts.notCheck']) { const n = (I18.match(new RegExp(`["']${k.replace('.', '\\.')}["']:`, 'g')) || []).length; if (n < 14) add('k10', -1, `⑨ the 2D words ${k} in ${n} of 14 languages`); }
  let why2 = null; try { const i = app.indexOf('function mate1Why'), k = app.indexOf('// step-specific explanation', i);
    why2 = new Function('E', 'NAME', 'kan1', 't', app.slice(i, k) + ';return mate1Why;')(E, ['', '歩', '香', '桂', '銀', '角', '飛', '金', '玉', 'と', '成香', '成桂', '成銀', '馬', '龍'], (s, u) => u, (k, v) => k + JSON.stringify(v)); } catch (e) { add('k10', -1, '⑨ mate1Why does not run: ' + e.message); }
  const nDrop = [0, 0], kinds = new Set(), shapes = new Map(); let prevD = -1;
  g.problems.forEach((P, j) => {
    const a = m => add('k10', j, m);
    if (P.kind !== 'tsume' || P.n !== 1 || !P.sol || P.sol.length !== 1) { a('④ not a mate in one'); return; }
    const p = pos(P.sfen), ms = p.legalMoves(true), U = m => p.toUsi(m), ans = P.sol[0];
    if (p.inCheck()) a('④ the mover is in check');
    const goal = mates1(p);
    if (!goal.includes(ans)) a(`① ${ans} does not mate (the mates: ${goal})`);
    if (goal.length !== 1) a(`② ${goal.length} moves mate: ${goal}`);
    const checks = ms.filter(m => { p.doMove(m); const c = p.inCheck(); p.undoMove(); return c; });
    if (ms.length < 3) a(`③ ${ms.length} legal moves`);
    if (checks.length < 3) a(`③ 追19 only ${checks.length} checks`);
    if (checks.length > 8) a(`④ ${checks.length} checks (basic: 3〜8; 9 or more is k8)`);
    const m0 = p.fromUsi(ans), drop = E.isDrop(m0), pc = drop ? E.dropType(m0) : T(p.board[E.mFrom(m0)]);
    if (drop && pc === E.FU) a('④ a pawn drop mates (打ち歩詰め)');
    nDrop[drop ? 0 : 1]++; kinds.add(pc);
    const ksq = p.king[p.side ^ 1], to = E.mTo(m0), side = p.side === 0 ? 1 : -1;
    const sh = `${pc}${drop ? '*' : '-'}${(E.sqFile(to) - E.sqFile(ksq)) * side},${(E.sqRank(to) - E.sqRank(ksq)) * side}`;
    shapes.set(sh, (shapes.get(sh) || 0) + 1); if (shapes.get(sh) > 2) a(`⑤ the same mating shape (${sh}) a third time`);
    const B = brd(P.sfen); for (const [who, b] of pool) { if (who === `k10 q${j + 1}`) continue; const e = dist(B, b); if (e <= 6) a(`⑤ ${e} squares from ${who}`); }
    const d = checks.length + ms.length / 100; if (d < prevD) a(`⑥ easier than the problem before (d ${d.toFixed(2)} after ${prevD.toFixed(2)})`); prevD = Math.max(prevD, d);
    // ⑦⑧ the 3D words at each of the five places
    for (let k = 0; k < 5; k++) {
      const pr5 = [0, 1, 2, 3, 4].map(() => ({ P, kind: 'tsume', n: 1, why: '', ng: null })); X.shJaLesson(g, pr5); const Q = pr5[k];
      for (const t of [Q.ask, Q.hintTx]) if (/\{|undefined|NaN/.test(t) || !t) a(`⑧ 「${t}」`);
      if (!/1手詰め/.test(Q.ask)) a(`⑧ the question 「${Q.ask}」 does not say mate in 1`);
      const gd = plain(Q.good(ans)), pn = NM[pc];
      if (/undefined|NaN|\{/.test(gd) || !gd.includes(pn)) a(`⑧ the praise 「${gd}」 does not name the ${pn}`);
      if (drop ? !/打|持ち駒の/.test(gd) : /打|持ち駒の/.test(gd)) a(`⑧ the praise 「${gd}」 does not say ${drop ? 'a drop' : 'a board move'}`);
      for (const m of ms) { const u = U(m); if (u === ans) continue; const w = plain(Q.ng(u));
        if (/undefined|NaN/.test(w) || !w.includes('{m}')) { a(`⑧ ${u}: 「${w}」`); continue; }
        p.doMove(m); const chk = p.inCheck(), rs = chk ? p.legalMoves(true) : [], kq = p.king[p.side], mto = E.mTo(m);
        const kMoves = new Set(rs.filter(y => !E.isDrop(y) && E.mFrom(y) === kq).map(y => E.mTo(y)));
        const kTake = rs.some(y => !E.isDrop(y) && E.mFrom(y) === kq && E.mTo(y) === mto) && p.attackers(kq, p.side ^ 1).includes(mto), mvN = NM[T(p.board[mto])]; p.undoMove();
        if (chk && k === 0 && why2) { const r2 = why2(P.sfen, u), key = (r2.match(/r\.m1\w+/) || [''])[0];   // ⑦ the 2D reason after a check that does not mate, from the board
          const want = kTake ? 'r.m1KTake' : kMoves.size ? 'r.m1Esc' : ''; if (!key || want && key !== want || !want && !/r\.m1(Take|Block)/.test(key)) a(`⑦ ${u}: the 2D reason ${key || 'none'}, the board wants ${want || 'r.m1Take / r.m1Block'}`); }
        if (!chk) { if (!/王手じゃない|王手にならない|王手でない|王手がかからない/.test(w)) a(`⑦ ${u} is no check, the words do not say so 「${w}」`); continue; }
        if (/王手じゃない|王手にならない|王手でない|王手がかからない/.test(w)) { a(`⑦ ${u} is a check, the words say it is not 「${w}」`); continue; }
        if (kTake) { if (!/玉(に|が)[^。]*取/.test(w) || !w.includes(mvN)) a(`⑦ ${u}: the king takes the checking piece, the words 「${w}」`); continue; }
        if (/玉に(そのまま)?取られ|玉が取れる|玉が[^。]*を取って/.test(w)) { a(`⑦ ${u}: the king cannot take it, the words say so 「${w}」`); continue; }
        const nm = (w.match(/逃げ道が(\d)つ|(\d)マス逃げ場/) || []).slice(1).find(Boolean);
        if (kMoves.size) { if (/取るか合駒|ほかの駒で受け|取るか合駒の受け|合駒で受け/.test(w)) a(`⑦ ${u}: the king can step away (${kMoves.size}), the words say a block / a capture 「${w}」`);
          else if (nm && +nm !== kMoves.size) a(`⑦ ${u}: the words say ${nm} escape squares, the king has ${kMoves.size} 「${w}」`);
          else if (!/逃げ/.test(w)) a(`⑦ ${u}: the king escapes, the words do not say so 「${w}」`); }
        else if (!/取るか合駒|ほかの駒で受け|合駒で受け|受けがある|受けが残る/.test(w)) a(`⑦ ${u}: no king move, the words do not say it is taken or blocked 「${w}」`); }
    }
  });
  if (!nDrop[0] || !nDrop[1] || Math.min(...nDrop) < 3) add('k10', -1, `④ drops ${nDrop[0]}, board moves ${nDrop[1]} (both 3 or more)`);
  if (kinds.size < 3) add('k10', -1, `追27 only ${kinds.size} kinds of piece mate`);
  // the warm-ups: every try's ok is every mate in one of its board; an explain's seq mates
  (g.ramp || []).forEach((R, j) => { if (!R.sfen) return; const p = pos(R.sfen), goal = mates1(p).sort();
    if (R.k === 'try' && goal.join() !== (R.ok || []).slice().sort().join()) add('k10', -1, `追14 warm-up ${j + 1}: ok ${R.ok}, the mates ${goal}`);
    if (R.k === 'explain' && R.seq && R.seq.length === 1 && !goal.includes(R.seq[0])) add('k10', -1, `追14 warm-up ${j + 1}: the arrow ${R.seq[0]} does not mate`); });
};

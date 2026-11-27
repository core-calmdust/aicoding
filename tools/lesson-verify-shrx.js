// (2026-11-27 第2期 担当A) shogi rx「反則・千日手・入玉・駒落ち」(the rules step: every problem shown, in the pool's order), called from
// tools/lesson-verify.js shogi(). From the rules (shogi/engine.js), afresh, over every legal move:
//  the three mates in one (kind tsume, src rx) — one per kind, told by the question: 突いて (a pawn on the board pushed: the answer is
//  a pawn board move that does not promote), 打ち歩 + a board answer, 打ち歩 + a drop answer:
//  ① the start is legal (neither king in check) and the goal set (every legal move that mates in one) is exactly { sol[0] } — ② no
//    second mate (a promotion pair counts as two); for the 打ち歩 problems a pawn dropped on some square would mate (uchifuzume, not
//    a legal move) and, for the drop answer, the answer is a non-pawn piece dropped on that very square (the words: 同じ場所に);
//  ③ 3+ legal moves and 3〜9 checks, no legal pawn drop that checks (the 3D calls every pawn-drop check 打ち歩詰め);
//  ④ the kind above; ⑤ 7+ squares from every other shogi problem / warm-up / tsume.json problem (mirrored too); ⑥ d = checks +
//    legal moves / 100 never falls over the three;
//  ⑦⑧ the 3D words (ショウギツネ) for every legal move: no check → said so; the king takes → said so with the piece; the king steps
//    away → said so (and the number, if one is said); otherwise taken or blocked; the praise carries the problem's own words (打ち歩 /
//    突き歩) and the facts they state are the board's: 飛車が…支え (a rook guards the landing square after the answer), 玉のまわりは相手の
//    駒でふさがって (every square next to the king is the defender's own piece or the landing square), 金で桂を取 (a gold takes a
//    knight), 銀で金を取り返すと竜の横の利きが玉に通る (a silver attacks the square, the capture is not legal, a dragon on the king's
//    rank), 銀 … 打って (the drop is a silver), 香車が支え, 逃げ道は金が押さえ (every empty square next to the king is a gold's), 飛車を端の筋へ,
//    金は角の利きをさえぎって (a gold on the line of a bishop to the king reaches a square between the rook and the king, no legal block); the 2D reason after a check that does not mate (mate1Why) is the board's;
//  the entering-king problem (mode material): accept = every move after which the declaration (canDeclare, the 27-point rule) holds
//    after every reply, cand = accept, 3+ legal moves, the words' counts (枚・点) are the board's, every other move's 3D words say the
//    conditions are not met; the warm-ups: the uchifuzume square marked is one where a dropped pawn would mate, the nifu marks are
//    every empty square of the pawn's file where a pawn could stand; 14 languages for q and expl; no atlas/nocoord entry left for a
//    problem whose words were rewritten without coordinates.
//  The handicap problems (src handi) are checked in a later round (pending).
module.exports = function shRx({ ROOT, E, L, X, pool, brd, dist, add, src, app }) {
  const fs = require('fs'), path = require('path');
  const GID = 'rx', g = L.grades.find(x => x.id === GID); if (!g) return;
  const T = E.typeOf, NM = ['', '歩', '香車', '桂馬', '銀', '角', '飛車', '金', '玉', 'と金', '成香', '成桂', '成銀', '馬', '竜'];
  const plain = t => String(t).replace(/<[^>]+>/g, '');
  const pos = s => { const p = new E.Position(); p.setSfen(s); return p; };
  const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar', 'ru', 'id', 'tr'];
  let NC = {}; try { NC = JSON.parse(fs.readFileSync(path.join(ROOT, 'atlas/nocoord/shogi.json'), 'utf8')); } catch (e) {}
  let why2 = null; try { const i = app.indexOf('function mate1Why'), k = app.indexOf('// step-specific explanation', i);
    why2 = new Function('E', 'NAME', 'kan1', 't', app.slice(i, k) + ';return mate1Why;')(E, ['', '歩', '香', '桂', '銀', '角', '飛', '金', '玉', 'と', '成香', '成桂', '成銀', '馬', '龍'], (s, u) => u, (k, v) => k + JSON.stringify(v)); } catch (e) { add(GID, -1, '⑨ mate1Why does not run: ' + e.message); }
  if (!app.includes("if (remain <= 0) return fail(pr.n === 1 ? t('ls.notMate') + mate1Why(pr.sfen, usi) : PZBook.t('outOfMoves', { n: pr.n }));")) add(GID, -1, '⑨ shogi/index.html (mate in one) changed');
  // the board as an array of letters (sfen order: rank a first, file 9 first), and a position with one piece put on it
  const arr = s => brd(s);
  const sfenOf = (a, side, hand) => { const rows = []; for (let r = 0; r < 9; r++) { let s = '', e = 0; for (let c = 0; c < 9; c++) { const x = a[r * 9 + c]; if (x === '.') { e++; continue; } if (e) { s += e; e = 0; } s += x.replace(/^[#%]/, '+'); } if (e) s += e; rows.push(s); } return rows.join('/') + ' ' + side + ' ' + (hand || '-') + ' 1'; };
  const sqName = s => (9 - (s % 9)) + 'abcdefghi'[(s / 9) | 0];
  // the squares where a black pawn dropped would mate (legal or not): the board, a pawn on it, white to move, in check and no move
  const uchiSq = (sfen, hand) => { const a = arr(sfen), o = []; for (let s = 9; s < 81; s++) { if (a[s] !== '.') continue; const c = s % 9; let nf = false; for (let r = 0; r < 9; r++) if (a[r * 9 + c] === 'P') nf = true; if (nf) continue;
    const b = a.slice(); b[s] = 'P'; const q = pos(sfenOf(b, 'w', '-')); if (q.inCheck() && !q.legalMoves(true).length) o.push(sqName(s)); } return o; };
  // the 3D lesson as the page builds it (all problems in the pool's order, the words of lessons.json / atlas/nocoord)
  const probs = g.problems.map((P, i) => ({ P, kind: P.kind === 'tsume' ? 'tsume' : 'best', n: P.n, sol: P.sol, why: plain(((NC[`${GID}/p${i}/expl`] || P.expl || {}).ja) || ''), ng: null }));
  try { X.shJaLesson(g, probs); } catch (e) { add(GID, -1, '⑧ the 3D words fail: ' + e.message); return; }
  let prevD = -1; const kinds = new Set();
  g.problems.forEach((P, j) => {
    const a = m => add(GID, j, m), Q = probs[j];
    for (const k of ['q', 'expl']) { const miss = LANGS.filter(l => !(P[k] && P[k][l])); if (miss.length && !(k === 'expl' && P.src === 'handi')) a(`⑨ ${k} lacks ${miss.join(' ')}`); }
    if (P.src === 'handi') return;   // (pending: the handicap problems — a later round)
    const p = pos(P.sfen), ms = p.legalMoves(true), U = m => p.toUsi(m), ex = plain(P.expl.ja), qj = plain(P.q.ja);
    if (p.inCheck() || pos(P.sfen.replace(' b ', ' w ')).inCheck()) { a('① the start has a king in check'); return; }
    if (ms.length < 3) a(`③ ${ms.length} legal moves`);
    if (P.kind === 'tsume') {
      if (P.n !== 1 || !P.sol || P.sol.length !== 1) { a('④ not a mate in one'); return; }
      const ans = P.sol[0], mates = [], checks = [];
      for (const m of ms) { const u = U(m); p.doMove(m); if (p.inCheck()) { checks.push(u); if (!p.legalMoves(true).length) mates.push(u); } p.undoMove(); }
      if (mates.join() !== ans) a(`①② the mates are ${mates.join(' ') || 'none'}, the answer ${ans}`);
      if (checks.length < 3 || checks.length > 9) a(`③ ${checks.length} checks (3〜9)`);
      const pchk = checks.filter(u => u.startsWith('P*')); if (pchk.length) a(`③⑦ a pawn drop checks (${pchk}): the 3D calls it 打ち歩詰め`);
      const am = p.fromUsi(ans), drop = E.isDrop(am), pc = drop ? 'PLNSBRG'.indexOf(ans[0]) + 1 : T(p.board[E.mFrom(am)]), to = E.mTo(am);
      const kind = /突いて/.test(qj) ? 'push' : /打ち歩/.test(qj) ? (drop ? 'drop' : 'board') : '?'; kinds.add(kind);
      if (kind === 'push') { if (drop || pc !== 1 || ans.endsWith('+')) a(`④ the question: push a pawn, the answer ${ans}`); if (!/突き歩/.test(ex)) a('④ the words do not name 突き歩詰め'); }
      else if (kind === '?') a('④ the question names neither 突いて nor 打ち歩');
      else { const us = uchiSq(P.sfen, P.sfen.split(' ')[2]); if (!us.length) a('④ no pawn drop would mate: no uchifuzume here');
        if (us.some(s => checks.includes('P*' + s))) a('① the uchifuzume pawn drop is a legal move');
        if (kind === 'drop' && (pc === 1 || !us.includes(ans.slice(2, 4)))) a(`④ the answer ${ans} is not another piece dropped on the uchifuzume square ${us}`);
        if (!/打ち歩/.test(ex)) a('④ the words do not name 打ち歩詰め'); }
      const B = brd(P.sfen); for (const [who, b] of pool) { if (who === `${GID} q${j + 1}`) continue; const e = dist(B, b); if (e <= 6) a(`⑤ ${e} squares from ${who}`); }
      const d = checks.length + ms.length / 100; if (d < prevD) a(`⑥ easier than the problem before (d ${d.toFixed(2)} after ${prevD.toFixed(2)})`); prevD = Math.max(prevD, d);
      // ⑧ the facts the words state, from the board after the answer
      p.doMove(am); const kq = p.king[p.side], att = p.attackers(to, p.side ^ 1).filter(s => s !== to);
      const sup = (ex.match(/(香車|飛車)が[^。]*支え/) || [])[1]; if (sup && !att.some(s => (sup === '香車' ? [2] : [6, 14]).includes(T(p.board[s])))) a(`⑧ 「${sup}が支え」 but no ${sup} guards the landing square`);
      if (/まわりは相手の駒でふさが/.test(ex)) { const r0 = (kq / 9) | 0, c0 = kq % 9; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const r = r0 + dr, c = c0 + dc; if ((!dr && !dc) || r < 0 || r > 8 || c < 0 || c > 8) continue; const s = r * 9 + c, x = p.board[s]; if (s !== to && !(x && E.colorOf(x) === p.side)) a(`⑧ 「まわりは相手の駒でふさがって」 but ${sqName(s)} is not`); } }
      if (/逃げ道は金が押さえ/.test(ex)) { const r0 = (kq / 9) | 0, c0 = kq % 9; let n = 0; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const r = r0 + dr, c = c0 + dc; if ((!dr && !dc) || r < 0 || r > 8 || c < 0 || c > 8) continue; const s = r * 9 + c, x = p.board[s]; if (s === to || (x && E.colorOf(x) === p.side)) continue; n++;
        if (!p.attackers(s, p.side ^ 1).some(y => T(p.board[y]) === 7)) a(`⑧ 「逃げ道は金が押さえ」 but no gold covers ${sqName(s)}`); } if (!n) a('⑧ 「逃げ道は金が押さえ」 but the king has no empty square next to it'); }
      if (/飛車を端の筋へ/.test(ex) && !(pc === 6 && !drop && [0, 8].includes(to % 9))) a('⑧ 「飛車を端の筋へ」 but the answer does not');
      if (/金は角の利きをさえぎって/.test(ex)) { const gs = []; for (let s = 0; s < 81; s++) { const x = p.board[s]; if (x && E.colorOf(x) === p.side && T(x) === 7) gs.push(s); }
        // a white gold on the diagonal between a black bishop and the king (taking it away, the bishop attacks the king), and no legal move blocks
        const pinned = gs.filter(s => { const b = Array.from(p.board); const kr = (kq / 9) | 0, kc = kq % 9, sr = (s / 9) | 0, sc = s % 9, dr = Math.sign(sr - kr), dc = Math.sign(sc - kc); if (!dr || !dc || Math.abs(sr - kr) !== Math.abs(sc - kc)) return false;
          let r = kr + dr, c = kc + dc, seen = false; while (r >= 0 && r < 9 && c >= 0 && c < 9) { const y = b[r * 9 + c]; if (r * 9 + c === s) { seen = true; } else if (y) return seen && E.colorOf(y) !== p.side && [5, 13].includes(T(y)); r += dr; c += dc; } return false; });
        const between = []; { const kr = (kq / 9) | 0, kc = kq % 9, tr = (to / 9) | 0, tc = to % 9, dr = Math.sign(tr - kr), dc = Math.sign(tc - kc); for (let r = kr + dr, c = kc + dc; r !== tr || c !== tc; r += dr, c += dc) between.push(r * 9 + c); }
        const blocks = p.legalMoves(true).filter(y => between.includes(E.mTo(y)) && E.mFrom(y) !== kq);
        const gReach = pinned.some(s => between.some(t => { const q = p.attackers(t, p.side); return q.includes(s); }));
        if (!pinned.length || blocks.length || !gReach) a(`⑧ 「金は角の利きをさえぎって」: a gold on the bishop's line ${pinned.length}, legal blocks ${blocks.length}, the gold reaches a square between ${gReach}`); }
      if (/銀）?[^。]*打って/.test(ex) && !(drop && pc === 4)) a('⑧ the words drop a silver, the answer does not');
      p.undoMove();
      // ⑦⑧ the 3D words
      const gd = plain(Q.good(ans)); if (!gd || /undefined|NaN|\{/.test(gd) || !gd.includes(ex.slice(0, 12))) a(`⑧ the praise 「${gd}」 is not the problem's words`);
      if (!/1手/.test(plain(Q.ask)) || (kind === 'push' ? !/突いて/.test(plain(Q.ask)) : !/打ち歩詰め/.test(plain(Q.ask)))) a(`⑧ the question 「${plain(Q.ask)}」`);
      for (const m of ms) { const u = U(m); if (u === ans) continue; const w = plain(Q.ng(u));
        if (/undefined|NaN/.test(w) || !w.includes('{m}')) { a(`⑧ ${u}: 「${w}」`); continue; }
        p.doMove(m); const chk = p.inCheck(), rs = chk ? p.legalMoves(true) : [], k2 = p.king[p.side], mto = E.mTo(m);
        const kMoves = new Set(rs.filter(y => !E.isDrop(y) && E.mFrom(y) === k2 && E.mTo(y) !== mto).map(y => E.mTo(y)));
        const kTake = rs.some(y => !E.isDrop(y) && E.mFrom(y) === k2 && E.mTo(y) === mto), mvN = NM[T(p.board[mto])]; p.undoMove();
        if (chk && why2) { const r2 = why2(P.sfen, u), key = (r2.match(/r\.m1\w+/) || [''])[0], want = kTake ? 'r.m1KTake' : kMoves.size ? 'r.m1Esc' : '';
          if (!key || want && key !== want || !want && !/r\.m1(Take|Block)/.test(key)) a(`⑦ ${u}: the 2D reason ${key || 'none'}, the board wants ${want || 'r.m1Take / r.m1Block'}`); }
        if (!chk) { if (!/王手じゃない|王手にならない|王手でない|王手がかからない/.test(w)) a(`⑦ ${u} is no check, the words do not say so 「${w}」`); continue; }
        if (/王手じゃない|王手にならない|王手でない|王手がかからない|打ち歩詰め/.test(w)) { a(`⑦ ${u} is a legal check, the words 「${w}」`); continue; }
        if (kTake) { if (!/玉(に|が)[^。]*取/.test(w) || !w.includes(mvN)) a(`⑦ ${u}: the king takes the checking piece, the words 「${w}」`); continue; }
        if (/玉に(そのまま)?取られ|玉が取れる|玉が[^。]*を取って/.test(w)) { a(`⑦ ${u}: the king cannot take it, the words say so 「${w}」`); continue; }
        const nm = (w.match(/逃げ道が(\d)つ|(\d)マス逃げ場/) || []).slice(1).find(Boolean);
        if (kMoves.size) { if (/取るか合駒|ほかの駒で受け|合駒で受け/.test(w)) a(`⑦ ${u}: the king can step away (${kMoves.size}), the words say a block / a capture 「${w}」`);
          else if (nm && +nm !== kMoves.size) a(`⑦ ${u}: the words say ${nm} escape squares, the king has ${kMoves.size} 「${w}」`);
          else if (!/逃げ/.test(w)) a(`⑦ ${u}: the king escapes, the words do not say so 「${w}」`); }
        else if (!/取るか合駒|ほかの駒で受け|合駒で受け|受けがある|受けが残る/.test(w)) a(`⑦ ${u}: no king move, the words do not say it is taken or blocked 「${w}」`); }
      if (NC[`${GID}/p${j}/expl`] && !/[１-９][一二三四五六七八九]|[1-9][a-i]/.test(ex)) a('⑧ an atlas/nocoord entry is left for words that have no coordinates');
    } else if (P.mode === 'material' && /入玉/.test(qj)) {
      kinds.add('enter');
      const good = []; for (const m of ms) { p.doMove(m); let all = true; for (const r of p.legalMoves(true)) { p.doMove(r); if (!p.canDeclare()) all = false; p.undoMove(); } p.undoMove(); if (all) good.push(U(m)); }
      if (good.slice().sort().join() !== (P.accept || []).slice().sort().join()) a(`① accept ${P.accept}, the moves that let the king declare after every reply ${good}`);
      if (JSON.stringify((P.cand || []).map(c => c[0]).sort()) !== JSON.stringify(good.slice().sort()) || (P.cand || []).some(c => c[1] !== 1)) a('② cand is not the accepted moves (1 each)');
      if (good.length * 3 > ms.length) a('③ too many moves are right');
      if (p.canDeclare()) a('④ the king can declare already');
      // the words' counts
      const q2 = pos(P.sfen); q2.doMove(q2.fromUsi(good[0])); let cnt = 0, pts = 0; const us = 0;
      for (let s = 0; s < 81; s++) { const x = q2.board[s]; if (!x || E.colorOf(x) !== us || T(x) === 8 || ((s / 9) | 0) > 2) continue; cnt++; const t = [0, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6][T(x)]; pts += t === 5 || t === 6 ? 5 : 1; }
      for (let t = 1; t <= 7; t++) pts += q2.hand[us * 8 + t] * (t === 5 || t === 6 ? 5 : 1);
      const say = (ex.match(/玉を除いて(\d+)枚/) || [])[1], sayP = (ex.match(/[＝=](\d+)点/) || [])[1];
      if (+say !== cnt || +sayP !== pts) a(`⑧ the words say ${say} pieces / ${sayP} points, the board ${cnt} / ${pts}`);
      for (const m of ms) { const u = U(m); if (good.includes(u)) continue; const w = plain(Q.ng(u)); if (!/入玉宣言の条件がそろわない/.test(w)) a(`⑦ ${u}: 「${w}」`); }
    } else a('④ neither a mate in one nor the entering king');
  });
  ['push', 'board', 'drop', 'enter'].forEach(k => { if (!kinds.has(k)) add(GID, -1, `④ no ${k} problem`); });
  // the warm-ups
  (g.ramp || []).forEach((R, j) => { if (!R.sfen) return; const t = plain((R.t || {}).ja || ''), ng = (R.marks || []).filter(x => x[1] === 'ng').map(x => x[0]).sort();
    if (/歩を打って詰ませる/.test(t)) { const us = uchiSq(R.sfen, R.sfen.split(' ')[2]).sort(); if (ng.join() !== us.join()) add(GID, -1, `⑧ warm-up ${j + 1}: marks ${ng}, the uchifuzume squares ${us}`); }
    if (/歩を2枚/.test(t)) { const a = arr(R.sfen), want = []; for (let c = 0; c < 9; c++) { let has = false; for (let r = 0; r < 9; r++) if (a[r * 9 + c] === 'P') has = true; if (has) for (let r = 1; r < 9; r++) if (a[r * 9 + c] === '.') want.push(sqName(r * 9 + c)); }
      if (ng.join() !== want.sort().join()) add(GID, -1, `⑧ warm-up ${j + 1}: nifu marks ${ng}, the file's squares ${want}`); } });
};

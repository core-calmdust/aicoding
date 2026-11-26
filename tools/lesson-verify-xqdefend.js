// (2026-11-27 第2期 担当A) xiangqi「守る」t_defend: the problems (engine values in sc) and the warm-ups (解説・やってみよう).
// Called from tools/lesson-verify.js xiangqi() with its pool and the 3D words (xqLsJa → xqDefendJa). The board facts are
// tools/xqfork-facts.js (the lesson's values 車9・炮4.5・馬4・仕と相2・兵1／川を渡ると2; fork = the sure result three plies deep, 追51).
//  ① the moves that lose nothing for sure (fork ≥ 0) = the answer alone; the stored values put it alone on top
//  ② the next move is 100 or more worse and scores under 16 (2D problemPoints = 3D XIANGQI.points); no won / lost position
//  ③ 3 legal moves or more; the threatened piece can move (escaping is tempting); from problem 3 a trap: another move that saves
//    the threatened piece but loses something else; 追34 the lit piece's kind has 3 wrong moves or more
//  ④ neither side in check; one piece of ours worth 2 or more hangs (the opponent's threat) and nothing else; nothing of the
//    opponent hangs, no capture wins at once; the answer is quiet (no capture, no check), does not move the threatened piece, and
//    after it nothing of ours hangs (= ひも or 間に入れる; the lesson has both); every wrong move loses on the board at once (a mate in
//    1, or a piece of ours left to be taken / a capture that loses); 追27 two kinds of mover and of piece threatened
//  ⑤ more than 4 points from every other xiangqi board (mirrored; the warm-ups too = 追1)
//  ⑥ d = the escapes + the other guards that fail + the wrong captures never goes down, the last more than the first
//  ⑦⑧ ショウギツネ's words for the answer and every legal move against the board: the praise names the mover, the piece guarded,
//    the attacker and the way (間に入れる iff the attacker no longer reaches it); a wrong move: a mate in 1 iff there is one, the
//    piece lost and its taker, the escape said an escape, the piece taken and its value / taken back / the net; the right move named
//  warm-ups: the goal set is one such guard; the explain's marks are its from (hl) and to (ok); the try (the explain mirrored) has ok = it
'use strict';
const { fmt } = require('./lesson-verify-xqtrade.js');
function verify({ E, L, X, pool, dist, brd, plain, add, pts, only }) {
  const id = 't_defend', si = L.steps.findIndex(s => s.id === id), st = L.steps[si];
  if (!st || !only.has(id)) return;
  const F = require('./xqfork-facts.js')(E), T = E.typeOf, mTo = E.mTo, mFrom = E.mFrom, WINT = E.WINT;
  const XN = (t, c) => ['', '王さま', c ? '士' : '仕', c ? '象' : '相', '馬', '車', '炮', c ? '卒' : '兵'][t];
  const iccs = (p, m) => E.name(p, m, 'iccs');
  // the facts of one position: H = the threatened piece, G = the moves that lose nothing for sure, A's kind (block / guard)
  const facts = (p, a) => { const me = p.side, all = p.moves();
    if (p.inCheck() || F.turned(p).inCheck()) a('④ a side is in check before the move');
    const H0 = F.danger(F.turned(p)); if (H0.length !== 1) { a(`④ ${H0.length} pieces of ours hang before the move (one is the threat)`); return null; }
    const H = H0[0]; if (F.val(p, H.s) < 2) a('④ the threatened piece is worth under 2');
    if (F.threats(p, me).length) a('④ a piece of the opponent hangs before the move');
    all.filter(u => p.at(mTo(u)) && F.net1(p, u) > 0).forEach(u => a(`④ the capture ${E.name(p, u)} wins at once`));
    const G = all.filter(u => F.fork(p, u, -0.25).v >= 0);
    return { H, G, all, me }; };
  const theme = (p, A, H, a) => { const q = p.clone().play(A);
    if (p.at(mTo(A))) a('④ the answer is a capture'); if (q.inCheck()) a('④ the answer is a check'); if (mFrom(A) === H.s) a('④ the answer moves the threatened piece (that is b_escape)');
    if (F.danger(q).length) a('④ a piece of ours hangs after the answer'); if (F.mate1(q)) a('④ the opponent mates in 1 after the answer');
    const blk = !q.moves().some(x => mTo(x) === H.s), at = mTo(A), r0 = F.turned(p), by = r0.moves().filter(x => mTo(x) === H.s).map(mFrom);
    // 追60: the way read on the board — 間に入れる = the new point is between an attacker (車・炮) and the piece, or on the 馬's leg;
    // ひも = after every take of the piece, the moved piece takes back
    if (blk) { const rc = x => [(x / 9) | 0, x % 9], [hr, hc] = rc(H.s), [ar, ac] = rc(at);
      const inLine = by.some(f => { const [fr, fc] = rc(f), t = T(r0.at(f)); if (t === E.HORSE) { const dr = hr - fr, dc = hc - fc; return Math.abs(dr) === 2 ? ar === fr + dr / 2 && ac === fc : ar === fr && ac === fc + dc / 2; }
        return (fr === hr && ar === hr && (ac - fc) * (ac - hc) < 0) || (fc === hc && ac === hc && (ar - fr) * (ar - hr) < 0); });
      if (!inLine) a('追60 the attacker no longer reaches the piece, but the answer does not step in between (a screen moved away?)'); }
    else q.moves().filter(x => mTo(x) === H.s).forEach(x => { const r = q.clone().play(x); if (!r.moves().some(y => mFrom(y) === at && mTo(y) === H.s)) a(`追60 after ${E.name(q, x)} the moved piece cannot take back (not a ひも)`); });
    return blk; };
  const mir = b => b.map((_, i) => b[((i / 9) | 0) * 9 + 8 - (i % 9)]);
  (st.ramp || []).forEach((R, j) => { if (!R.s) return; const p = E.Pos.from(R.s), w = `warm-up ${j + 1}`, a = m => add(id, -1, `${w}: ${m}`);
    const f = facts(p, a); if (!f) return; if (f.G.length !== 1) { a(`① ${f.G.length} moves lose nothing (${f.G.map(m => iccs(p, m))})`); return; }
    const g = iccs(p, f.G[0]); theme(p, f.G[0], f.H, a);
    if (R.k === 'explain') { const hl = (R.marks || []).filter(x => x[1] === 'hl').map(x => x[0]).join(), ok = (R.marks || []).filter(x => x[1] === 'ok').map(x => x[0]).join();
      if (hl !== g.slice(0, 2) || ok !== g.slice(2)) a(`⑧ the marks ${hl}→${ok} are not ${g}`); }
    if (R.k === 'try') { if (JSON.stringify(R.ok || []) !== JSON.stringify([g])) a(`① ok ${R.ok} ≠ the goal ${g}`); if (!(R.look || []).includes(g.slice(0, 2))) a(`⑧ look ${R.look} does not show the mover`);
      const ex = st.ramp.find(r => r.k === 'explain'); if (R.src === 'mirror' && ex && brd(R.s).join('') !== mir(brd(ex.s)).join('')) a('⑧ the try is not the explain mirrored (its words say so)'); }
    const B = brd(R.s); st.problems.forEach((P, k) => { const e = dist(B, brd(P.s)); if (e <= 4) add(id, k, `⑤ 追1 ${e} points from ${w}`); }); });
  const movT = new Set(), hT = new Set(), ways = new Set(), asks = new Set(); let prevD = -1, firstD = null;
  st.problems.forEach((P, j) => { const a = m => add(id, j, m), p = E.Pos.from(P.s), nm = m => E.name(p, m);
    const f = facts(p, a); if (!f) return; const { H, G, all, me } = f;
    const sm = new Map(P.sc || []); if (sm.size !== (P.sc || []).length) a('⑨ a move is valued twice');
    all.forEach(m => { if (!sm.has(m)) a(`⑨ ${nm(m)} has no value`); }); (P.sc || []).forEach(([m]) => { if (!all.includes(m)) a(`⑨ a valued move ${m} is not legal`); });
    if (!all.includes(P.best)) { a('① the answer is not legal'); return; }
    if (!G.includes(P.best)) a(`① the answer ${nm(P.best)} loses something for sure`);
    G.filter(u => u !== P.best).forEach(u => a(`② ${nm(u)} also loses nothing`));
    const blk = theme(p, P.best, H, a), mt = T(p.at(mFrom(P.best))); movT.add(mt); hT.add(H.t); ways.add(blk ? 'block' : 'guard');
    const S = (P.sc || []).slice().sort((x, y) => y[1] - x[1]);
    if (!S.length || S[0][0] !== P.best) a(`① the stored values prefer ${S.length ? nm(S[0][0]) : '(none)'}`);
    else if (S.length > 1) { if (S[0][1] - S[1][1] < 100) a(`② the second move ${nm(S[1][0])} is only ${S[0][1] - S[1][1]} worse`); if (pts(P, S[1][0]) >= 16) a(`② the second move scores ${pts(P, S[1][0])}`); }
    if (S.length && Math.abs(S[0][1]) > WINT - 1000) a('④ a won / lost position');
    if (all.length < 3) a(`③ ${all.length} legal moves`);
    const esc = all.filter(u => mFrom(u) === H.s), Q = new Map(all.map(u => [u, p.clone().play(u)]));
    if (!esc.length) a('③ the threatened piece cannot move (nothing tempting)');
    const wrong = all.filter(u => u !== P.best);
    wrong.forEach(u => { const q = Q.get(u); if (F.mate1(q)) return; const D = F.danger(q); if (!D.length) a(`④ ${nm(u)} loses nothing at once (the words could not show it)`); else if (F.capV(p, u) - D[0].g >= 0) a(`④ ${nm(u)} takes as much as it loses`); });
    const saves = wrong.filter(u => !F.mate1(Q.get(u)) && !F.danger(Q.get(u)).some(o => o.s === (mFrom(u) === H.s ? mTo(u) : H.s)));
    if (j >= 2 && !saves.length) a(`③ problem ${j + 1}: no trap (no other move saves the ${XN(H.t, me)} and loses elsewhere)`);
    { const rg = all.filter(m => T(p.at(mFrom(m))) === mt); if (rg.length - 1 < 3) a(`追34 the lit ${XN(mt, me)}'s kind has ${rg.length - 1} wrong moves`); }
    const B = brd(P.s); for (const [who, b] of pool) { if (who === `${id} q${j + 1}`) continue; const e = dist(B, b); if (e <= 4) a(`⑤ ${e} points from ${who}`); }
    const fake = wrong.filter(u => mFrom(u) !== H.s && !F.danger(Q.get(u)).some(o => o.s === H.s)).length, wc = wrong.filter(m => p.at(mTo(m)) && T(p.at(mTo(m))) !== E.KING).length;
    const d = esc.length + fake + wc; if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d); if (firstD === null) firstD = d;
    if (j === st.problems.length - 1 && !(d > firstD)) a(`⑥ the last problem is no harder than problem 1 (d ${d} vs ${firstD})`);
    let W; try { W = X.xqLsJa(E, st, P, j, k => k === 'ok' ? '〈正〉' : '〈誤〉', si); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
    if (!W || !W.own) { a('⑧ no own words'); return; }
    asks.add(plain(W.ask));
    const MA = XN(mt, me), HN = XN(H.t, me), BY = XN(H.by, me ^ 1);
    const BAD = x0 => { const x = plain(x0); if (/\{|undefined|NaN|null|駒駒|損の。/.test(x)) a(`⑧ 「${x}」`); if (/(です|ます|ません|ました|でしょう|ましょう|ですか|ますか)(?=[。！？]|$)/m.test(x)) a(`⑧ polite 「${x}」`); if (/チャンギ|チェス|包|将（|将の|将を|将と|詰将棋|玉|金の輪/.test(x)) a(`⑧ another game's words 「${x}」`); };
    [W.ask, W.hintTx].forEach(BAD);
    if (!plain(W.hintTx).includes(MA) || !plain(W.hintTx).includes(HN)) a(`⑧ the hint does not name the ${MA} and the ${HN}`);
    const g = plain(W.good(P.best)); BAD(g);
    if (!g.includes(MA) || !g.includes(HN) || !g.includes(BY)) a(`⑧ the praise 「${g}」 does not name the ${MA}, the ${HN} and the ${BY}`);
    if (/間に|筋|通り道|壁/.test(g) !== blk) a(`⑧ the praise 「${g}」: the ${BY} ${blk ? 'no longer reaches' : 'still reaches'} the ${HN}`);
    if (!blk && !/ひも|守/.test(g)) a(`⑧ the praise 「${g}」 does not say the ${HN} is guarded`);
    if (/\d+点|取れた|駒得/.test(g)) a(`⑧ the praise 「${g}」 claims a gain (the answer only keeps the material)`);
    for (const n2 of ['車', '馬', '炮', '相', '象', '仕', '士', '兵', '卒']) if (![MA, HN, BY].includes(n2) && g.replace(/相手/g, '').includes(n2)) a(`⑧ the praise 「${g}」 names a ${n2}`);
    for (const u of all.concat([P.best])) { const raw = plain(W.ng(u)); BAD(raw);
      if (!raw.includes('〈正〉')) { a(`⑦ ${nm(u)}: the right move not named 「${raw}」`); continue; }
      const rt = raw.slice(raw.indexOf('〈正〉')); if (!rt.includes(MA) || !rt.includes(HN)) a(`⑦ ${nm(u)}: the right move's words 「${rt}」`);
      if (/間に|筋|通り道|壁/.test(rt) !== blk) a(`⑦ ${nm(u)}: the right move's way 「${rt}」`);
      if (u === P.best) continue;
      if (/惜し|おしい|いい線|あと少し|もう少し/.test(raw)) a(`追73 ${nm(u)}: a wrong move's words say it was close 「${raw}」`);
      if (!raw.includes('〈誤〉')) { a(`⑦ ${nm(u)}: your move not named 「${raw}」`); continue; }
      const t = raw.slice(0, raw.indexOf('〈正〉')), q = Q.get(u), mate = F.mate1(q), c = p.at(mTo(u)) ? T(p.at(mTo(u))) : 0, um = T(p.at(mFrom(u)));
      if (/1手で詰ま/.test(t) !== mate) { a(`⑦ ${nm(u)}: 「${t}」 (the opponent ${mate ? 'has' : 'has no'} mate in 1)`); continue; }
      if (mate) continue;
      const D = F.danger(q), dd = D[0]; if (!dd) continue;   // (reported above)
      const nt = F.capV(p, u) - dd.g, TK = XN(dd.t, me), BYd = XN(dd.by, me ^ 1);
      if (!t.includes('相手の' + BYd)) a(`⑦ ${nm(u)}: the taker ${BYd} not said 「${t}」`);
      if (!t.includes(c && dd.s === mTo(u) ? XN(um, me) : TK)) a(`⑦ ${nm(u)}: the piece lost (${TK}) not said 「${t}」`);
      if (c) { if (!t.includes(XN(c, me ^ 1) + '（' + fmt(F.capV(p, u)) + '点）')) a(`⑦ ${nm(u)}: the piece taken and its value not said 「${t}」`);
        const ls = t.match(/差し引き(\d+(?:\.\d)?)点の損/); if (!(ls && ls[1] === fmt(-nt))) a(`⑦ ${nm(u)}: the net ${fmt(nt)} 「${t}」`);
        if (/取り返され/.test(t) !== (dd.s === mTo(u))) a(`⑦ ${nm(u)}: taken back? 「${t}」`); continue; }
      if (/（\d+(?:\.\d)?点）/.test(t)) a(`⑦ ${nm(u)}: 「${t}」 (it takes nothing)`);
      const isEsc = mFrom(u) === H.s;
      if (/逃げ|逃が/.test(t) !== isEsc) a(`⑦ ${nm(u)}: 「${t}」 (${isEsc ? 'an escape' : 'not an escape'})`);
      if (isEsc && /行った先/.test(t) !== (dd.s === mTo(u))) a(`⑦ ${nm(u)}: 「${t}」 (the escaped ${HN} ${dd.s === mTo(u) ? 'is' : 'is not'} taken on its new point)`);
      if (!isEsc && /取られたまま|ねらいが消えない/.test(t) !== (dd.s === H.s)) a(`⑦ ${nm(u)}: 「${t}」 (the ${HN} ${dd.s === H.s ? 'is' : 'is not'} still taken)`);
      if (!isEsc && /動かした/.test(t) !== (dd.s === mTo(u))) a(`⑦ ${nm(u)}: 「${t}」 (the moved ${XN(um, me)} ${dd.s === mTo(u) ? 'is' : 'is not'} the piece taken)`);
      if (/こんどは/.test(t) && dd.s === H.s && !isEsc) a(`⑦ ${nm(u)}: 「${t}」 (it is the same piece)`); }
  });
  if (movT.size < 2) add(id, -1, '追27 every answer moves the same kind');
  if (hT.size < 2) add(id, -1, '追27 every threat is on the same kind');
  if (ways.size < 2) add(id, -1, `④ the lesson teaches ひも and 間に入れる but every answer is ${[...ways]}`);
  if (asks.size < st.problems.length) add(id, -1, '⑧ the same question twice in a lesson');
}
module.exports = { verify };

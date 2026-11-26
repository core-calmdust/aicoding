// (2026-11-26 第2期 担当A) xiangqi「両取り」t_fork: the problems (engine values in sc) and the warm-ups (解説・やってみよう).
// Called from tools/lesson-verify.js xiangqi() with its pool and the 3D words (xqLsJa → xqForkJa). The board facts are
// tools/xqfork-facts.js (the lesson's values 車9・炮4.5・馬4・仕と相2・兵1／川を渡ると2; fork = the sure gain three plies deep, 追51).
//  ① the moves with fork > 0 = the answer alone; the stored values put it alone on top
//  ② the next move is 100 or more worse and scores under 16 (2D problemPoints = 3D XIANGQI.points); no won / lost position
//  ③ 3 legal moves or more; something tempting besides the answer (another capture, or another double threat); from problem 3 a trap
//    (a capture taken back that wins nothing, or a double threat that fails); 追34 the lit piece's kind has 3 wrong moves or more
//  ④ before the move nothing hangs on either side, no capture wins at once, the mover is not in check; the answer is quiet (no
//    capture, no check), nothing of ours hangs after it, and the moved piece itself attacks two pieces worth 2 or more;
//    追55 the sure gain ≤ the bigger of the two, and after every reply one of the two can still be won (a capture with a net > 0);
//    追27 two kinds of mover and of target over the lesson
//  ⑤ more than 4 points from every other xiangqi board (mirrored; the warm-ups too = 追1)
//  ⑥ d = the wrong captures + the traps never goes down, the last more than the first
//  ⑦⑧ ショウギツネ's words for the answer and every legal wrong move against the board (as tools/lesson-verify-janggi.js forkStep)
//  warm-ups: the goal set (fork > 0) is one move; the explain's seq is it and its ng marks are the two targets; the try's ok is it
'use strict';
const { fmt } = require('./lesson-verify-xqtrade.js');
function verify({ E, L, X, pool, dist, brd, plain, add, pts, only }) {
  const id = 't_fork', si = L.steps.findIndex(s => s.id === id), st = L.steps[si];
  if (!st || !only.has(id)) return;
  const F = require('./xqfork-facts.js')(E), T = E.typeOf, C = E.colorOf, mTo = E.mTo, mFrom = E.mFrom, WINT = E.WINT;
  const XN = (t, c) => ['', '王さま', c ? '士' : '仕', c ? '象' : '相', '馬', '車', '炮', c ? '卒' : '兵'][t];
  const iccs = (p, m) => E.name(p, m, 'iccs');
  const sure55 = (p, u, H, a) => { const qa = p.clone().play(u), big = Math.max(H[0].v, H[1].v), g = F.fork(p, u).v;
    if (g > big) a(`追55 the two targets are worth up to ${big} but the sure gain is ${fmt(g)}`);
    for (const r of qa.moves()) { const q2 = qa.clone().play(r), sq = H.slice(0, 2).map(o => mFrom(r) === o.s ? mTo(r) : o.s);
      if (!q2.moves().some(x => sq.includes(mTo(x)) && q2.at(mTo(x)) && C(q2.at(mTo(x))) !== q2.side && F.net1(q2, x) > 0)) { a(`追55 after ${E.name(qa, r)} neither target can be won`); break; } } };
  // the warm-ups
  (st.ramp || []).forEach((R, j) => { if (!R.s) return; const p = E.Pos.from(R.s), w = `warm-up ${j + 1}`, a = m => add(id, -1, `${w}: ${m}`);
    const G = p.moves().filter(u => F.fork(p, u, 0).v > 0);
    if (G.length !== 1) { a(`① ${G.length} moves win for sure (${G.map(m => iccs(p, m))})`); return; }
    const g = iccs(p, G[0]), H = F.hits(p, G[0]);
    if (p.at(mTo(G[0])) || p.clone().play(G[0]).inCheck()) a('④ the move is not quiet');
    if (H.length < 2) a(`④ the moved piece attacks ${H.length} piece(s)`); else sure55(p, G[0], H, a);
    if (R.k === 'explain') { if ((R.seq || []).join() !== g) a(`⑧ the shown move ${R.seq} is not ${g}`);
      const ngs = (R.marks || []).filter(x => x[1] === 'ng').map(x => x[0]).sort().join(), want = H.slice(0, 2).map(o => E.sqName(o.s)).sort().join();
      if (ngs !== want) a(`⑧ the × marks ${ngs} are not the two targets ${want}`); }
    if (R.k === 'try') { if (JSON.stringify(R.ok || []) !== JSON.stringify([g])) a(`① ok ${R.ok} ≠ the goal ${g}`); if (!(R.look || []).includes(g.slice(0, 2))) a(`⑧ look ${R.look} does not show the mover`); }
    const B = brd(R.s); st.problems.forEach((P, k) => { const e = dist(B, brd(P.s)); if (e <= 4) add(id, k, `⑤ 追1 ${e} points from ${w}`); }); });
  const movT = new Set(), tgT = new Set(), asks = new Set(); let prevD = -1, firstD = null;
  st.problems.forEach((P, j) => { const a = m => add(id, j, m), p = E.Pos.from(P.s), me = p.side, all = p.moves(), nm = m => E.name(p, m);
    if (p.inCheck()) a('④ the mover is in check');
    const sm = new Map(P.sc || []); if (sm.size !== (P.sc || []).length) a('⑨ a move is valued twice');
    all.forEach(m => { if (!sm.has(m)) a(`⑨ ${nm(m)} has no value`); }); (P.sc || []).forEach(([m]) => { if (!all.includes(m)) a(`⑨ a valued move ${m} is not legal`); });
    if (!all.includes(P.best)) { a('① the answer is not legal'); return; }
    if (F.danger(F.turned(p)).length) a('④ a piece of ours hangs before the move');
    if (F.threats(p, me).length) a('④ a piece of the opponent hangs before the move');
    all.filter(u => p.at(mTo(u)) && F.net1(p, u) > 0).forEach(u => a(`④ the capture ${nm(u)} wins at once (net ${fmt(F.net1(p, u))})`));
    const FV = new Map(all.map(u => [u, u === P.best ? F.fork(p, u).v : F.fork(p, u, 0).v])), G = all.filter(u => FV.get(u) > 0);
    if (!G.includes(P.best)) a(`① the answer ${nm(P.best)} wins nothing for sure (${fmt(FV.get(P.best))})`);
    G.filter(u => u !== P.best).forEach(u => a(`② ${nm(u)} also wins (${fmt(FV.get(u))})`));
    const qa = p.clone().play(P.best), mt = T(p.at(mFrom(P.best))), g0 = FV.get(P.best), H = F.hits(p, P.best);
    if (p.at(mTo(P.best))) a('④ the answer is a capture'); if (qa.inCheck()) a('④ the answer is a check');
    if (F.danger(qa).length) a('④ a piece of ours hangs after the answer');
    if (H.length < 2) a(`④ the moved ${XN(mt, me)} attacks ${H.length} piece(s) worth winning`); else sure55(p, P.best, H, a);
    movT.add(mt); H.slice(0, 2).forEach(o => tgT.add(o.t));
    const S = (P.sc || []).slice().sort((x, y) => y[1] - x[1]);
    if (!S.length || S[0][0] !== P.best) a(`① the stored values prefer ${S.length ? nm(S[0][0]) : '(none)'}`);
    else if (S.length > 1) { if (S[0][1] - S[1][1] < 100) a(`② the second move ${nm(S[1][0])} is only ${S[0][1] - S[1][1]} worse`); if (pts(P, S[1][0]) >= 16) a(`② the second move scores ${pts(P, S[1][0])}`); }
    if (S.length && Math.abs(S[0][1]) > WINT - 1000) a('④ a won / lost position');
    if (all.length < 3) a(`③ ${all.length} legal moves`);
    const wc = all.filter(m => m !== P.best && p.at(mTo(m)) && T(p.at(mTo(m))) !== E.KING), fake = all.filter(u => u !== P.best && !p.at(mTo(u)) && F.threats(p.clone().play(u), me).length >= 2);
    const traps = wc.filter(m => p.clone().play(m).moves().some(x => mTo(x) === mTo(m)) && F.net1(p, m) <= 0).length + fake.length;
    if (!wc.length && !fake.length) a('③ nothing tempting besides the answer');
    if (j >= 2 && !traps) a(`③ problem ${j + 1}: no trap`);
    { const rg = all.filter(m => T(p.at(mFrom(m))) === mt); if (rg.length - 1 < 3) a(`追34 the lit ${XN(mt, me)}'s kind has ${rg.length - 1} wrong moves`); }
    const B = brd(P.s); for (const [who, b] of pool) { if (who === `${id} q${j + 1}`) continue; const e = dist(B, b); if (e <= 4) a(`⑤ ${e} points from ${who}`); }
    const d = wc.length + traps; if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d); if (firstD === null) firstD = d;
    if (j === st.problems.length - 1 && !(d > firstD)) a(`⑥ the last problem is no harder than problem 1 (d ${d} vs ${firstD})`);
    // ⑦⑧ the words
    let W; try { W = X.xqLsJa(E, st, P, j, k => k === 'ok' ? '〈正〉' : '〈誤〉', si); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
    if (!W || !W.own) { a('⑧ no own words'); return; }
    asks.add(plain(W.ask)); if (H.length < 2) return;
    const MA = XN(mt, me), TA = XN(H[0].t, me ^ 1), TB = XN(H[1].t, me ^ 1), PAIR = TA === TB ? `2つの${TA}` : `${TA}と${TB}`;
    const BAD = x0 => { const x = plain(x0); if (/\{|undefined|NaN|null|駒駒|損の。/.test(x)) a(`⑧ 「${x}」`); if (/(です|ます|ません|ました|でしょう|ましょう|ですか|ますか)(?=[。！？]|$)/m.test(x)) a(`⑧ polite 「${x}」`); if (/チャンギ|チェス|包|将（|将の|詰将棋|玉/.test(x)) a(`⑧ another game's words 「${x}」`); };
    [W.ask, W.hintTx].forEach(BAD);
    if (!plain(W.hintTx).includes(MA)) a(`⑧ the hint does not name the ${MA}`);
    const g = plain(W.good(P.best)); BAD(g);
    if (!g.includes(MA) || !g.includes(PAIR) || !g.includes(fmt(g0) + '点')) a(`⑧ the praise 「${g}」 does not name the ${MA}, ${PAIR} and ${fmt(g0)}点`);
    for (const mm of g.matchAll(/(\d+(?:\.\d)?)点/g)) if (mm[1] !== fmt(g0)) a(`⑧ the praise 「${g}」: ${mm[1]}点`);
    for (const n2 of ['車', '馬', '炮', '相', '象', '仕', '士', '兵', '卒']) if (![MA, TA, TB].includes(n2) && g.replace(/相手/g, '').includes(n2)) a(`⑧ the praise 「${g}」 names a ${n2}`);
    for (const u of all.concat([P.best])) { const raw = plain(W.ng(u)); BAD(raw);
      if (!raw.includes('〈正〉')) { a(`⑦ ${nm(u)}: the right move not named 「${raw}」`); continue; }
      const rt = raw.slice(raw.indexOf('〈正〉')); if (!rt.includes(MA) || !rt.includes(PAIR)) a(`⑦ ${nm(u)}: the right move's pieces not named 「${rt}」`);
      if (/\d+点/.test(rt)) a(`⑦ ${nm(u)}: 「${rt}」 points in the right move's words`);
      if (u === P.best) continue;
      if (!raw.includes('〈誤〉')) { a(`⑦ ${nm(u)}: your move not named 「${raw}」`); continue; }
      const t = raw.slice(0, raw.indexOf('〈正〉')), q = p.clone().play(u), mate = F.mate1(q), c = p.at(mTo(u)) ? T(p.at(mTo(u))) : 0, um = T(p.at(mFrom(u)));
      if (/1手で詰ま/.test(t) !== mate) { a(`⑦ ${nm(u)}: 「${t}」 (the opponent ${mate ? 'has' : 'has no'} mate in 1)`); continue; }
      if (mate) continue;
      const Lq = F.danger(q), dd = Lq[0], nt = F.capV(p, u) - (dd ? dd.g : 0);
      if (c && !t.includes(XN(c, me ^ 1) + '（' + fmt(F.capV(p, u)) + '点）')) a(`⑦ ${nm(u)}: the piece taken and its value not said 「${t}」`);
      if (!c && /（\d+(?:\.\d)?点）を取|（\d+(?:\.\d)?点）は取/.test(t)) a(`⑦ ${nm(u)}: 「${t}」 (it takes nothing)`);
      const canTake = (lost, by, s0) => Lq.some(o => (s0 == null || o.s === s0) && XN(o.t, me) === lost && q.moves().some(x => mTo(x) === o.s && XN(T(q.at(mFrom(x))), me ^ 1) === by));
      const bk = t.match(/きみの(.)（(\d+(?:\.\d)?)点）を相手の(王さま|.)に取り返され|(.)（(\d+(?:\.\d)?)点）が相手の(王さま|.)に取り返され/);
      if (bk) { const b1 = bk[1] || bk[4], bp = bk[2] || bk[5], by = bk[3] || bk[6]; if (!c || b1 !== XN(um, me) || bp !== fmt(F.val(q, mTo(u))) || !canTake(b1, by, mTo(u)) || !dd || dd.s !== mTo(u)) a(`⑦ ${nm(u)}: 「${t}」 (the ${b1} is not taken back by a ${by})`); }
      else if (c && dd && dd.s === mTo(u)) a(`⑦ ${nm(u)}: taken back, the words do not say it 「${t}」`);
      const ot = t.match(/こんどは(.)を相手の(王さま|.)に取られ|(.)が相手の(王さま|.)に取られる形|きみの(.)が相手の(王さま|.)に取られ/);
      if (ot) { const lo = ot[1] || ot[3] || ot[5], by = ot[2] || ot[4] || ot[6]; if (!canTake(lo, by, dd ? dd.s : -1) || (c && dd.s === mTo(u))) a(`⑦ ${nm(u)}: 「${t}」 (the ${by} cannot win the ${lo})`); }
      if (!bk && !ot && Lq.length) { a(`⑦ ${nm(u)}: a piece is lost after it, the words do not say it 「${t}」`); continue; }
      if (c) { const ls = t.match(/差し引き(\d+(?:\.\d)?)点の損/), ev = /とんとん/.test(t); if (nt < 0 ? !(ls && ls[1] === fmt(-nt)) : nt === 0 ? !ev : true) a(`⑦ ${nm(u)}: the net ${fmt(nt)} 「${t}」`); continue; }
      if (Lq.length) continue;
      const Hq = F.threats(q, me), two = (x, y) => x === y ? `2つの${XN(x, me ^ 1)}` : `${XN(x, me ^ 1)}と${XN(y, me ^ 1)}`;
      const f2 = /をねらえるけど|に届くけど/.test(t), f1 = t.match(/ねらえるのは(.)の1つだけ|では(.)しかねらえない/), f0 = /ねらう手になっていない|1つもできない/.test(t);
      if (Hq.length >= 2) { if (!f2 || !t.includes(two(Hq[0].t, Hq[1].t))) { a(`⑦ ${nm(u)}: a double threat on ${two(Hq[0].t, Hq[1].t)}, the words 「${t}」`); continue; }
        const R = t.match(/相手は(.)を動かす1手|相手の(.)の1手/); if (R) { const rn = R[1] || R[2]; if (!q.moves().some(r => XN(T(q.at(mFrom(r))), me ^ 1) === rn && F.vsReply(p, u, q, r) <= 0)) a(`⑦ ${nm(u)}: 「${t}」 no move of a ${rn} answers both`); }
        if (FV.get(u) > 0) a(`⑦ ${nm(u)}: 「${t}」 but it wins ${fmt(FV.get(u))}`); }
      else if (Hq.length === 1) { if (!f1 || (f1[1] || f1[2]) !== XN(Hq[0].t, me ^ 1)) a(`⑦ ${nm(u)}: one threat (${XN(Hq[0].t, me ^ 1)}), the words 「${t}」`); }
      else if (!f0) a(`⑦ ${nm(u)}: no threat, the words 「${t}」`); }
  });
  if (movT.size < 2) add(id, -1, '追27 every answer moves the same kind');
  if (tgT.size < 2) add(id, -1, '追27 every fork hits the same kinds');
  if (asks.size < st.problems.length) add(id, -1, '⑧ the same question twice in a lesson');
}
module.exports = { verify };

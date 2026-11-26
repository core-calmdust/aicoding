// (2026-11-26 第2期 担当A) xiangqi「王手で得をする」t_check: the problems (engine values in sc) and the warm-ups (解説・やってみよう).
// Called from tools/lesson-verify.js xiangqi() with its pool and the 3D words (xqLsJa → xqCheckJa). The board facts are
// tools/xqfork-facts.js (the lesson's values 車9・炮4.5・馬4・仕と相2・兵1／川を渡ると2; fork = the sure gain three plies deep, 追51).
//  ① the moves with fork > 0 = the answer alone; the stored values put it alone on top
//  ② the next move is 100 or more worse and scores under 16 (2D problemPoints = 3D XIANGQI.points); no won / lost position
//  ③ 3 legal moves or more; something tempting besides the answer (another capture or another check); from problem 3 a trap
//    (a capture taken back that wins nothing, or another check); 追34 the lit piece's kind has 3 wrong moves or more
//  ④ neither side in check before; nothing hangs on either side; no capture wins at once; the answer is a quiet check (no capture,
//    the opponent has replies) after which nothing of ours hangs and a piece of the opponent worth 4 or more is attacked with a
//    winning exchange; 追55 the sure gain ≤ that piece's value; 追27 two kinds of mover and of piece attacked over the lesson
//  ⑤ more than 4 points from every other xiangqi board (mirrored; the warm-ups too = 追1)
//  ⑥ d = the wrong captures + the traps never goes down, the last more than the first
//  ⑦⑧ ショウギツネ's words for the answer and every legal wrong move against the board (as tools/lesson-verify-janggi.js checkStep):
//    the piece moved, the piece attacked and the sure gain (the praise never says the piece is won); a mate in 1 iff there is one;
//    王手 said iff the move checks; the piece taken back / left to be taken and its taker; another check: a reply by the piece named
//    after which we win nothing; a quiet move: the piece it attacks, or none
//  warm-ups: the goal set (fork > 0) is one quiet check; the explain's marks are its from (hl) and to (ok); the try's ok is it
'use strict';
const { fmt } = require('./lesson-verify-xqtrade.js');
function verify({ E, L, X, pool, dist, brd, plain, add, pts, only }) {
  const id = 't_check', si = L.steps.findIndex(s => s.id === id), st = L.steps[si];
  if (!st || !only.has(id)) return;
  const F = require('./xqfork-facts.js')(E), T = E.typeOf, mTo = E.mTo, mFrom = E.mFrom, WINT = E.WINT;
  const XN = (t, c) => ['', '王さま', c ? '士' : '仕', c ? '象' : '相', '馬', '車', '炮', c ? '卒' : '兵'][t];
  const iccs = (p, m) => E.name(p, m, 'iccs');
  const theme = (p, u, a) => { const q = p.clone().play(u);
    if (p.at(mTo(u))) a('④ the move is a capture'); if (!q.inCheck()) a('④ the move is not a check'); if (!q.moves().length) a('④ the move mates');
    if (F.danger(q).length) a('④ a piece of ours hangs after the move');
    const hit = F.threats(q, p.side).filter(o => o.v >= 4); if (!hit.length) { a('④ the check attacks no 馬・炮・車 with a winning exchange'); return null; }
    const g = F.fork(p, u).v; if (g > hit[0].v) a(`追55 the attacked ${XN(hit[0].t, 1)} is worth ${hit[0].v} but the sure gain is ${fmt(g)}`);
    return hit; };
  (st.ramp || []).forEach((R, j) => { if (!R.s) return; const p = E.Pos.from(R.s), w = `warm-up ${j + 1}`, a = m => add(id, -1, `${w}: ${m}`);
    const G = p.moves().filter(u => F.fork(p, u, 0).v > 0);
    if (G.length !== 1) { a(`① ${G.length} moves win for sure (${G.map(m => iccs(p, m))})`); return; }
    const g = iccs(p, G[0]); theme(p, G[0], a);
    if (R.k === 'explain') { const hl = (R.marks || []).filter(x => x[1] === 'hl').map(x => x[0]).join(), ok = (R.marks || []).filter(x => x[1] === 'ok').map(x => x[0]).join();
      if (hl !== g.slice(0, 2) || ok !== g.slice(2)) a(`⑧ the marks ${hl}→${ok} are not ${g}`); }
    if (R.k === 'try') { if (JSON.stringify(R.ok || []) !== JSON.stringify([g])) a(`① ok ${R.ok} ≠ the goal ${g}`); if (!(R.look || []).includes(g.slice(0, 2))) a(`⑧ look ${R.look} does not show the mover`); }
    const B = brd(R.s); st.problems.forEach((P, k) => { const e = dist(B, brd(P.s)); if (e <= 4) add(id, k, `⑤ 追1 ${e} points from ${w}`); }); });
  const movT = new Set(), tgT = new Set(), asks = new Set(); let prevD = -1, firstD = null;
  st.problems.forEach((P, j) => { const a = m => add(id, j, m), p = E.Pos.from(P.s), me = p.side, all = p.moves(), nm = m => E.name(p, m), ckd = u => p.clone().play(u).inCheck();
    if (p.inCheck() || F.turned(p).inCheck()) a('④ a side is in check before the move');
    const sm = new Map(P.sc || []); if (sm.size !== (P.sc || []).length) a('⑨ a move is valued twice');
    all.forEach(m => { if (!sm.has(m)) a(`⑨ ${nm(m)} has no value`); }); (P.sc || []).forEach(([m]) => { if (!all.includes(m)) a(`⑨ a valued move ${m} is not legal`); });
    if (!all.includes(P.best)) { a('① the answer is not legal'); return; }
    if (F.danger(F.turned(p)).length) a('④ a piece of ours hangs before the move');
    if (F.threats(p, me).length) a('④ a piece of the opponent hangs before the move');
    all.filter(u => p.at(mTo(u)) && F.net1(p, u) > 0).forEach(u => a(`④ the capture ${nm(u)} wins at once (net ${fmt(F.net1(p, u))})`));
    const FV = new Map(all.map(u => [u, u === P.best ? F.fork(p, u).v : F.fork(p, u, 0).v])), G = all.filter(u => FV.get(u) > 0);
    if (!G.includes(P.best)) a(`① the answer ${nm(P.best)} wins nothing for sure (${fmt(FV.get(P.best))})`);
    G.filter(u => u !== P.best).forEach(u => a(`② ${nm(u)} also wins (${fmt(FV.get(u))})`));
    const mt = T(p.at(mFrom(P.best))), g0 = FV.get(P.best), hit = theme(p, P.best, a) || [];
    movT.add(mt); if (hit[0]) tgT.add(hit[0].t);
    const S = (P.sc || []).slice().sort((x, y) => y[1] - x[1]);
    if (!S.length || S[0][0] !== P.best) a(`① the stored values prefer ${S.length ? nm(S[0][0]) : '(none)'}`);
    else if (S.length > 1) { if (S[0][1] - S[1][1] < 100) a(`② the second move ${nm(S[1][0])} is only ${S[0][1] - S[1][1]} worse`); if (pts(P, S[1][0]) >= 16) a(`② the second move scores ${pts(P, S[1][0])}`); }
    if (S.length && Math.abs(S[0][1]) > WINT - 1000) a('④ a won / lost position');
    if (all.length < 3) a(`③ ${all.length} legal moves`);
    const wc = all.filter(m => m !== P.best && p.at(mTo(m)) && T(p.at(mTo(m))) !== E.KING), ock = all.filter(u => u !== P.best && ckd(u));
    const traps = wc.filter(m => p.clone().play(m).moves().some(x => mTo(x) === mTo(m)) && F.net1(p, m) <= 0).length + ock.length;
    if (!wc.length && !ock.length) a('③ nothing tempting besides the answer (no other capture, no other check)');
    if (j >= 2 && !traps) a(`③ problem ${j + 1}: no trap (a capture taken back, or another check)`);
    { const rg = all.filter(m => T(p.at(mFrom(m))) === mt); if (rg.length - 1 < 3) a(`追34 the lit ${XN(mt, me)}'s kind has ${rg.length - 1} wrong moves`); }
    const B = brd(P.s); for (const [who, b] of pool) { if (who === `${id} q${j + 1}`) continue; const e = dist(B, b); if (e <= 4) a(`⑤ ${e} points from ${who}`); }
    const d = wc.length + traps; if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d); if (firstD === null) firstD = d;
    if (j === st.problems.length - 1 && !(d > firstD)) a(`⑥ the last problem is no harder than problem 1 (d ${d} vs ${firstD})`);
    let W; try { W = X.xqLsJa(E, st, P, j, k => k === 'ok' ? '〈正〉' : '〈誤〉', si); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
    if (!W || !W.own) { a('⑧ no own words'); return; }
    asks.add(plain(W.ask)); if (!hit[0]) return;
    const MA = XN(mt, me), TA = XN(hit[0].t, me ^ 1);
    const BAD = x0 => { const x = plain(x0); if (/\{|undefined|NaN|null|駒駒|損の。/.test(x)) a(`⑧ 「${x}」`); if (/(です|ます|ません|ました|でしょう|ましょう|ですか|ますか)(?=[。！？]|$)/m.test(x)) a(`⑧ polite 「${x}」`); if (/チャンギ|チェス|包|将（|将の|将を|将と|詰将棋|玉|金の輪/.test(x)) a(`⑧ another game's words 「${x}」`); };
    [W.ask, W.hintTx].forEach(BAD);
    if (!plain(W.hintTx).includes(MA)) a(`⑧ the hint does not name the ${MA}`);
    if (/王手はいくつか/.test(plain(W.hintTx)) && all.filter(u => T(p.at(mFrom(u))) === mt && ckd(u)).length < 2) a(`⑧ the hint says the ${MA} has several checks`);
    const g = plain(W.good(P.best)); BAD(g);
    if (!g.includes(MA) || !g.includes(TA) || !g.includes(fmt(g0) + '点') || !g.includes('王手')) a(`⑧ the praise 「${g}」 does not name the check, the ${MA}, the ${TA} and ${fmt(g0)}点`);
    for (const mm of g.matchAll(/(\d+(?:\.\d)?)点/g)) if (mm[1] !== fmt(g0)) a(`⑧ the praise 「${g}」: ${mm[1]}点`);
    for (const n2 of ['車', '馬', '炮', '相', '象', '仕', '士', '兵', '卒']) if (![MA, TA].includes(n2) && g.replace(/相手/g, '').includes(n2)) a(`⑧ the praise 「${g}」 names a ${n2}`);
    if (/取れた|間に合わない|手が回らない|助けられない/.test(g)) a(`⑧ the praise 「${g}」 says the ${TA} is won (only the value is sure)`);
    for (const u of all.concat([P.best])) { const raw = plain(W.ng(u)); BAD(raw);
      if (!raw.includes('〈正〉')) { a(`⑦ ${nm(u)}: the right move not named 「${raw}」`); continue; }
      const rt = raw.slice(raw.indexOf('〈正〉')); if (!rt.includes(MA) || !rt.includes(TA) || !rt.includes('王手')) a(`⑦ ${nm(u)}: the right move's words 「${rt}」`);
      if (/\d+点/.test(rt) || /取れた|間に合わない/.test(rt)) a(`⑦ ${nm(u)}: 「${rt}」 (points / a piece won in the right move's words)`);
      if (u === P.best) continue;
      if (/惜し|おしい|いい線|あと少し|もう少し/.test(raw)) a(`追73 ${nm(u)}: a wrong move's words say it was close 「${raw}」`);
      if (!raw.includes('〈誤〉')) { a(`⑦ ${nm(u)}: your move not named 「${raw}」`); continue; }
      const t = raw.slice(0, raw.indexOf('〈正〉')), q = p.clone().play(u), mate = F.mate1(q), c = p.at(mTo(u)) ? T(p.at(mTo(u))) : 0, um = T(p.at(mFrom(u))), isCk = q.inCheck();
      if (/1手で詰ま/.test(t) !== mate) { a(`⑦ ${nm(u)}: 「${t}」 (the opponent ${mate ? 'has' : 'has no'} mate in 1)`); continue; }
      if (mate) continue;
      if (/王手じゃない|王手でもない|王手もかからない/.test(t) && isCk) a(`⑦ ${nm(u)}: 「${t}」 (it is a check)`);
      if (/も王手|で王手しても|で王手をかけても|の王手は/.test(t) && !isCk) a(`⑦ ${nm(u)}: 「${t}」 (it is not a check)`);
      const Lq = F.danger(q), dd = Lq[0], nt = F.capV(p, u) - (dd ? dd.g : 0);
      if (c && !t.includes(XN(c, me ^ 1) + '（' + fmt(F.capV(p, u)) + '点）')) a(`⑦ ${nm(u)}: the piece taken and its value not said 「${t}」`);
      if (!c && /（\d+(?:\.\d)?点）を取|（\d+(?:\.\d)?点）は取/.test(t)) a(`⑦ ${nm(u)}: 「${t}」 (it takes nothing)`);
      const canTake = (lost, by, s0) => Lq.some(o => (s0 == null || o.s === s0) && XN(o.t, me) === lost && q.moves().some(x => mTo(x) === o.s && XN(T(q.at(mFrom(x))), me ^ 1) === by));
      const bk = t.match(/きみの(.)（(\d+(?:\.\d)?)点）を相手の(王さま|.)に取り返され|(.)（(\d+(?:\.\d)?)点）が相手の(王さま|.)に取り返され/);
      if (bk) { const b1 = bk[1] || bk[4], bp = bk[2] || bk[5], by = bk[3] || bk[6]; if (!c || b1 !== XN(um, me) || bp !== fmt(F.val(q, mTo(u))) || !canTake(b1, by, mTo(u)) || !dd || dd.s !== mTo(u)) a(`⑦ ${nm(u)}: 「${t}」 (the ${b1} is not taken back by a ${by})`); }
      else if (c && dd && dd.s === mTo(u)) a(`⑦ ${nm(u)}: taken back, the words do not say it 「${t}」`);
      const ot = t.match(/こんどは(.)を相手の(王さま|.)に取られ|(.)が相手の(王さま|.)に取られる形|きみの(.)が相手の(王さま|.)に取られ|相手は(王さま|.)で(.)を取って|相手の(王さま|.)が(.)を取る手/);
      if (ot) { const lo = ot[1] || ot[3] || ot[5] || ot[8] || ot[10], by = ot[2] || ot[4] || ot[6] || ot[7] || ot[9]; if (!canTake(lo, by, dd ? dd.s : -1) || (c && dd.s === mTo(u))) a(`⑦ ${nm(u)}: 「${t}」 (the ${by} cannot win the ${lo})`); if ((ot[7] || ot[9]) && !isCk) a(`⑦ ${nm(u)}: 「${t}」 (not a check)`); }
      if (!bk && !ot && Lq.length) { a(`⑦ ${nm(u)}: a piece is lost after it, the words do not say it 「${t}」`); continue; }
      if (c) { const ls = t.match(/差し引き(\d+(?:\.\d)?)点の損/), ev = /とんとん/.test(t); if (Lq.length ? (nt < 0 ? !(ls && ls[1] === fmt(-nt)) : nt === 0 ? !ev : true) : !/それだけ/.test(t)) a(`⑦ ${nm(u)}: the net ${fmt(nt)} 「${t}」`); continue; }
      if (Lq.length) continue;
      if (isCk) { const R = t.match(/相手は(王さま|.)を動かして受ければ|相手の(王さま|.)の1手で受けられ/), gen = /受けられたあと、得をする手が残らない/.test(t);
        if (!R && !gen) { a(`⑦ ${nm(u)}: another check, the words do not say how it is answered 「${t}」`); continue; }
        if (R) { const rn = R[1] || R[2]; if (!q.moves().some(r => XN(T(q.at(mFrom(r))), me ^ 1) === rn && F.vsReply(p, u, q, r) <= 0)) a(`⑦ ${nm(u)}: 「${t}」 no move of a ${rn} answers it`); }
        if (FV.get(u) > 0) a(`⑦ ${nm(u)}: 「${t}」 but it wins ${fmt(FV.get(u))}`);
        continue; }
      const H = F.threats(q, me), f1 = t.match(/相手は(.)を守る手|で(.)をねらっても/), f0 = /ねらう手にもなっていない|1つもできない/.test(t);
      if (H.length) { if (!f1 || (f1[1] || f1[2]) !== XN(H[0].t, me ^ 1)) a(`⑦ ${nm(u)}: it attacks the ${XN(H[0].t, me ^ 1)} 「${t}」`); }
      else if (!f0) a(`⑦ ${nm(u)}: no threat, the words do not say it 「${t}」`); }
  });
  if (movT.size < 2) add(id, -1, '追27 every answer moves the same kind');
  if (tgT.size < 2) add(id, -1, '追27 every check attacks the same kind');
  if (asks.size < st.problems.length) add(id, -1, '⑧ the same question twice in a lesson');
}
module.exports = { verify };

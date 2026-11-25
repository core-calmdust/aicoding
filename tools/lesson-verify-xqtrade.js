// (2026-11-26 第2期 担当A) xiangqi「得な交換」t_capture: the problems (engine values in sc) and the warm-ups (解説・やってみよう).
// Called from tools/lesson-verify.js xiangqi() with its pool and the 3D words (xqLsJa → xqTradeJa).
// The values are the lesson's own (車9・炮4.5・馬4・仕と相2・兵1、川を渡ると2). net(u) = the value u takes − the opponent's best exchange
// afterwards (the swap list on each of our pieces, the cheapest attacker first) — −99 when the opponent then mates in 1.
//  ① the moves with net > 0 = the answer alone; the stored values put it alone on top
//  ② the next move is 100 or more worse and scores under 16 (2D problemPoints = 3D XIANGQI.points); no won / lost position
//  ③ 3 legal moves or more, another capture on the board, from problem 3 a trap (a capture taken back that wins nothing);
//    追34 the lit piece (the answer's mover) has 3 wrong moves or more
//  ④ the answer takes a guarded 車・馬・炮 with a cheaper piece, the opponent wins back just that piece (the simple swap) and nothing
//    else; nothing of ours is in danger before; the mover is not in check; 追27 two kinds of taker and of piece taken
//  ⑤ more than 4 points from every other xiangqi board (mirrored; the warm-ups too = 追1)
//  ⑥ d = the wrong captures + the traps never goes down, the last more than the first
//  ⑦⑧ ショウギツネ's words for the answer and every legal wrong move against the board: the praise names the taker, the piece taken and
//    the net; a wrong move: the piece taken and its value, the piece taken back and its taker (both values, the net), another piece
//    lost and its taker, a quiet move said quiet, a mate in 1 iff there is one; the right move named with its pieces
//  warm-ups: the explain's lit point = the answer's mover, its green point = the piece taken; the try's ok = the goal set, look = the mover
'use strict';
const VALS = [0, 100, 2, 2, 4, 9, 4.5, 1];
function facts(E) {
  const T = E.typeOf, C = E.colorOf, mTo = E.mTo, mFrom = E.mFrom;
  const val = (q, s) => { const x = q.at(s), t = T(x); return t === E.PAWN ? ((C(x) ? s >= 45 : s < 45) ? 2 : 1) : VALS[t]; };
  // the gain of the side to move in q from taking on s, by the swap list (the cheapest attacker first)
  function exch(q, s) {
    const gains = []; let r = q.clone(), on = r.at(s); if (!on || T(on) === E.KING || C(on) === r.side) return 0;
    for (let k = 0; k < 14; k++) { const L = r.moves().filter(m => mTo(m) === s); if (!L.length) break;
      let m = L[0]; for (const y of L) if (val(r, mFrom(y)) < val(r, mFrom(m))) m = y;
      gains.push(val(r, s)); r = r.clone().play(m); }
    let g = 0; for (let k = gains.length - 1; k >= 0; k--) g = Math.max(0, gains[k] - g); return g;
  }
  // the pieces of the side not to move in q that the side to move wins something on: [{ s, t, g, by }], the biggest first
  const danger = q => { const o = []; for (let s = 0; s < 90; s++) { const x = q.at(s); if (!x || C(x) === q.side || T(x) === E.KING) continue; const g = exch(q, s);
    if (g > 0) { const L = q.moves().filter(m => mTo(m) === s); let m = L[0]; for (const y of L) if (val(q, mFrom(y)) < val(q, mFrom(m))) m = y; o.push({ s, t: T(x), g, by: T(q.at(mFrom(m))) }); } }
    return o.sort((a, b) => b.g - a.g || VALS[b.t] - VALS[a.t]); };
  const turned = p => { const f = p.fen().split(' '); f[1] = f[1] === 'w' ? 'b' : 'w'; return E.Pos.from(f.join(' ')); };
  const mate1 = q => q.moves().some(x => q.clone().play(x).status() === -1);
  const act = (p, u) => { const c = p.at(mTo(u)) ? T(p.at(mTo(u))) : 0, cv = c ? val(p, mTo(u)) : 0, q = p.clone().play(u);
    if (mate1(q)) return { q, c, cv, net: -99, D: [], dd: null, m1: true };
    const D = danger(q); return { q, c, cv, net: cv - (D[0] ? D[0].g : 0), D, dd: D[0] || null, m1: false }; };
  return { val, exch, danger, turned, mate1, act };
}
const fmt = v => String(Math.round(v * 10) / 10);
function verify({ E, L, X, pool, dist, brd, plain, add, pts, only }) {
  const id = 't_capture', si = L.steps.findIndex(s => s.id === id), st = L.steps[si];
  if (!st || !only.has(id)) return;
  const T = E.typeOf, mTo = E.mTo, mFrom = E.mFrom, F = facts(E), WINT = E.WINT;
  const XN = (t, c) => ['', '王さま', c ? '士' : '仕', c ? '象' : '相', '馬', '車', '炮', c ? '卒' : '兵'][t];
  const goalOf = p => p.moves().filter(u => F.act(p, u).net > 0);
  // the warm-ups
  (st.ramp || []).forEach((R, j) => { if (!R.s) return; const p = E.Pos.from(R.s), G = goalOf(p), w = `warm-up ${j + 1}`, sq = s => E.name(p, p.moves().find(y => mFrom(y) === s) || 0, 'iccs').slice(0, 2);
    if (G.length !== 1) { add(id, -1, `① ${w}: ${G.length} moves win (${G.map(m => E.name(p, m, 'iccs'))})`); return; }
    const g = E.name(p, G[0], 'iccs');
    if (R.k === 'explain') { const mk = R.marks || [], hl = mk.filter(x => x[1] === 'hl').map(x => x[0]), ok = mk.filter(x => x[1] === 'ok').map(x => x[0]);
      if (hl.join() !== g.slice(0, 2)) add(id, -1, `⑧ ${w}: the lit point ${hl} is not the taker ${g.slice(0, 2)}`);
      if (ok.join() !== g.slice(2, 4)) add(id, -1, `⑧ ${w}: the green point ${ok} is not the piece taken ${g.slice(2, 4)}`); }
    if (R.k === 'try') { if (JSON.stringify(R.ok || []) !== JSON.stringify([g])) add(id, -1, `① ${w}: ok ${R.ok} ≠ the goal ${g}`);
      if ((R.look || []).join() !== g.slice(0, 2)) add(id, -1, `⑧ ${w}: look ${R.look} is not the taker`); }
    const B = brd(R.s); st.problems.forEach((P, k) => { const e = dist(B, brd(P.s)); if (e <= 4) add(id, k, `⑤ 追1 ${e} points from ${w}`); }); });
  const movT = new Set(), capT = new Set(), asks = new Set(); let prevD = -1, firstD = null;
  st.problems.forEach((P, j) => { const a = m => add(id, j, m), p = E.Pos.from(P.s), me = p.side, all = p.moves(), nm = m => E.name(p, m);
    if (p.inCheck()) a('④ the mover is in check');
    const sm = new Map(P.sc || []); if (sm.size !== (P.sc || []).length) a('⑨ a move is valued twice');
    all.forEach(m => { if (!sm.has(m)) a(`⑨ ${nm(m)} has no value`); }); (P.sc || []).forEach(([m]) => { if (!all.includes(m)) a(`⑨ a valued move ${m} is not legal`); });
    if (!all.includes(P.best)) { a('① the answer is not legal'); return; }
    if (F.danger(F.turned(p)).length) a('④ a piece of ours is in danger before the move');
    const R = new Map(all.map(u => [u, F.act(p, u)])), G = all.filter(u => R.get(u).net > 0);
    if (!G.includes(P.best)) a(`① the answer ${nm(P.best)} wins nothing (net ${R.get(P.best).net})`);
    G.filter(u => u !== P.best).forEach(u => a(`② ${nm(u)} also wins (net ${R.get(u).net})`));
    const A = R.get(P.best), mt = T(p.at(mFrom(P.best))), ct = A.c, mv = F.val(p, mFrom(P.best));
    if (!ct || ![E.ROOK, E.HORSE, E.CANNON].includes(ct)) a('④ the answer does not take a 車・馬・炮'); else if (mv >= A.cv) a('④ the taker is not cheaper than the piece taken');
    const takeBack = A.q.moves().some(x => mTo(x) === mTo(P.best));
    if (!takeBack) a('④ the piece taken is not guarded (no exchange)');
    if (A.m1 || A.D.length !== 1 || A.D[0].s !== mTo(P.best) || A.D[0].g !== F.val(A.q, mTo(P.best))) a('④ the opponent does not win back just the taker (not the simple swap)');
    movT.add(mt); capT.add(ct);
    const S = (P.sc || []).slice().sort((x, y) => y[1] - x[1]);
    if (!S.length || S[0][0] !== P.best) a(`① the stored values prefer ${S.length ? nm(S[0][0]) : '(none)'}`);
    else if (S.length > 1) { if (S[0][1] - S[1][1] < 100) a(`② the second move ${nm(S[1][0])} is only ${S[0][1] - S[1][1]} worse`); if (pts(P, S[1][0]) >= 16) a(`② the second move scores ${pts(P, S[1][0])}`); }
    if (S.length && Math.abs(S[0][1]) > WINT - 1000) a('④ a won / lost position');
    if (all.length < 3) a(`③ ${all.length} legal moves`);
    const wc = all.filter(m => m !== P.best && p.at(mTo(m))), traps = wc.filter(m => R.get(m).q.moves().some(x => mTo(x) === mTo(m)) && R.get(m).net <= 0);
    if (!wc.length) a('③ the answer is the only capture on the board');
    if (j >= 2 && !traps.length) a(`③ problem ${j + 1}: no trap (a capture taken back that wins nothing)`);
    { const rg = all.filter(m => mFrom(m) === mFrom(P.best)); if (rg.length - 1 < 3) a(`追34 the lit ${XN(mt, me)} has ${rg.length - 1} wrong moves`); }
    const B = brd(P.s); for (const [who, b] of pool) { if (who === `${id} q${j + 1}`) continue; const e = dist(B, b); if (e <= 4) a(`⑤ ${e} points from ${who}`); }
    const d = wc.length + traps.length; if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d); if (firstD === null) firstD = d;
    if (j === st.problems.length - 1 && !(d > firstD)) a(`⑥ the last problem is no harder than problem 1 (d ${d} vs ${firstD})`);
    // ⑦⑧ the words
    let W; try { W = X.xqLsJa(E, st, P, j, k => k === 'ok' ? '〈正〉' : '〈誤〉', si); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
    if (!W || !W.own) { a('⑧ no own words'); return; }
    const MA = XN(mt, me), AC = XN(ct, me ^ 1), g0 = A.net, OKP = [fmt(mv), fmt(A.cv), fmt(g0)];
    const BAD = x0 => { const x = plain(x0); if (/\{|undefined|NaN|null|駒駒|損の。/.test(x)) a(`⑧ 「${x}」`); if (/(です|ます|ません|ました|でしょう|ましょう|ですか|ますか)(?=[。！？]|$)/m.test(x)) a(`⑧ polite 「${x}」`); if (/チャンギ|チェス|包|将（|詰将棋|玉/.test(x)) a(`⑧ another game's words 「${x}」`); };
    [W.ask, W.hintTx].forEach(BAD); asks.add(plain(W.ask));
    if (!plain(W.hintTx).includes(MA)) a(`⑧ the hint does not name the ${MA}`);
    const NMv = ['車', '馬', '炮', '相', '象', '仕', '士', '兵', '卒'];
    const g = plain(W.good(P.best)); BAD(g);
    if (!g.includes(MA) || !g.includes(AC) || !g.includes(fmt(g0) + '点')) a(`⑧ the praise 「${g}」 does not name the ${MA}, the ${AC} and ${fmt(g0)}点`);
    for (const mm of g.matchAll(/(\d+(?:\.\d)?)点/g)) if (!OKP.includes(mm[1])) a(`⑧ the praise 「${g}」: ${mm[1]}点`);
    for (const n2 of NMv) if (n2 !== MA && n2 !== AC && g.replace(/相手/g, '').includes(n2)) a(`⑧ the praise 「${g}」 names a ${n2}`);
    for (const u of all.concat([P.best])) { const raw = plain(W.ng(u)); BAD(raw);
      if (!raw.includes('〈正〉')) { a(`⑦ ${nm(u)}: the right move not named 「${raw}」`); continue; }
      const rt = raw.slice(raw.indexOf('〈正〉')); if (!rt.includes(MA) || !rt.includes(AC)) a(`⑦ ${nm(u)}: the right move's pieces not named 「${rt}」`);
      for (const mm of rt.matchAll(/(\d+(?:\.\d)?)点/g)) if (!OKP.includes(mm[1])) a(`⑦ ${nm(u)}: 「${rt}」 ${mm[1]}点`);
      if (u === P.best) continue;
      if (!raw.includes('〈誤〉')) { a(`⑦ ${nm(u)}: your move not named 「${raw}」`); continue; }
      const t = raw.slice(0, raw.indexOf('〈正〉')), r = R.get(u), q = r.q, Lq = r.D, took = !!r.c, umT = T(p.at(mFrom(u))), uv = F.val(q, mTo(u));
      if (/1手で詰ま/.test(t) !== r.m1) { a(`⑦ ${nm(u)}: 「${t}」 (the opponent ${r.m1 ? 'has' : 'has no'} mate in 1)`); continue; }
      if (r.m1) continue;
      const quiet = /駒を取らない|駒を取れない|取る手じゃない|しそこね/.test(t); if (quiet === took) a(`⑦ ${nm(u)}: 「${t}」 (it ${took ? 'takes' : 'takes nothing'})`);
      if (took && !t.includes(XN(r.c, me ^ 1) + '（' + fmt(r.cv) + '点）')) a(`⑦ ${nm(u)}: the piece taken and its value not said 「${t}」`);
      // a piece of ours (name) the opponent's (by) really wins something on, on s0 or anywhere
      const canTake = (lost, by, s0) => Lq.some(o => (s0 == null || o.s === s0) && XN(o.t, me) === lost && q.moves().some(x => mTo(x) === o.s && XN(T(q.at(mFrom(x))), me ^ 1) === by));
      const bk = t.match(/きみの(.)（(\d+(?:\.\d)?)点）を相手の(王さま|.)に取り返され|(.)（(\d+(?:\.\d)?)点）が相手の(王さま|.)に取り返され|(.)（(\d+(?:\.\d)?)点）を相手の(王さま|.)に取り返され/);
      if (bk) { const b1 = bk[1] || bk[4] || bk[7], bp = bk[2] || bk[5] || bk[8], by = bk[3] || bk[6] || bk[9];
        if (!took || b1 !== XN(umT, me) || bp !== fmt(uv) || !canTake(b1, by, mTo(u)) || !r.dd || r.dd.s !== mTo(u)) a(`⑦ ${nm(u)}: 「${t}」 (the ${b1} is not taken back by a ${by})`); }
      else if (took && r.dd && r.dd.s === mTo(u)) a(`⑦ ${nm(u)}: taken back, the words do not say it 「${t}」`);
      const ot = t.match(/こんどは(.)を相手の(王さま|.)に取られ|(.)が相手の(王さま|.)に取られる形|しかも(.)を相手の(王さま|.)に取られ|うえに、(.)が相手の(王さま|.)に取られ/);
      if (ot) { const lo = ot[1] || ot[3] || ot[5] || ot[7], by = ot[2] || ot[4] || ot[6] || ot[8]; if (!canTake(lo, by, r.dd ? r.dd.s : -1) || (took && r.dd.s === mTo(u))) a(`⑦ ${nm(u)}: 「${t}」 (the ${by} cannot win the ${lo})`); }
      if (!bk && !ot && Lq.length) a(`⑦ ${nm(u)}: a piece is lost after it, the words do not say it 「${t}」`);
      if (took) { const ls = t.match(/差し引き(\d+(?:\.\d)?)点の損/), ev = /とんとん/.test(t);
        if (r.net < 0 ? !(ls && ls[1] === fmt(-r.net)) : r.net === 0 ? !ev : true) a(`⑦ ${nm(u)}: the net (${fmt(r.net)}) not said right 「${t}」`); }
      else if (/差し引き|とんとん/.test(t)) a(`⑦ ${nm(u)}: a quiet move with a net 「${t}」`); }
  });
  if (movT.size < 2) add(id, -1, '追27 every answer takes with the same kind');
  if (capT.size < 2) add(id, -1, '追27 every answer takes the same kind');
  if (asks.size < st.problems.length) add(id, -1, '⑧ the same question twice in a lesson');
}
module.exports = { verify, facts, VALS, fmt };

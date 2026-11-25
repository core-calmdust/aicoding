// (2026-11-25 第2期 担当A) xiangqi「ねらわれた駒を逃げる」b_escape: the problems (engine values in sc) and the warm-ups.
// Called from tools/lesson-verify.js xiangqi() with its pool and the 3D words (xqLsJa).
//  ① the goal set read from the rules = every legal move after which no piece of ours is chased (E.threats: attacked and unprotected,
//    or attacked by a cheaper piece); it is the answer alone, a quiet move of the one chased piece; the engine (sc) puts it on top
//  ② the next move is 100 or more worse and scores under 16 (2D problemPoints = 3D XIANGQI.points); no won / lost position
//  ③ 12 legal moves or more; the chased piece has 3 moves or more, 2 or more of them land where it is chased again (the traps)
//  ④ exactly one piece of ours (a horse, rook or cannon) is chased before the move; nobody is in check
//  ⑤ more than 4 points from every other xiangqi board (mirrored; the lesson's own warm-ups too); the answers move 2 kinds or more
//  ⑥ in the order shown (2D and 3D in order): the traps never go down and the last problem has more than the first
//  ⑦ ⑧ ショウギツネ's words: the praise names the chased piece; every wrong move names both moves and a piece of ours that really is
//    chased after it (「ねらわれた X」 = the piece that was chased, still chased); the hint's piece (馬 / 炮 / 車 / 車や炮) really chases one of
//    the traps; a warm-up explains / asks one chased piece and its one safe point
const path = require('path');
function verify({ E, L, X, pool, dist, brd, plain, add, pts, only }) {
  const T = E.typeOf, C = E.colorOf, mTo = E.mTo, mFrom = E.mFrom;
  const mine = (q, me, S) => [...S].filter(x => q.at(x) && C(q.at(x)) === me);
  const chased = (q, me) => mine(q, me, E.threats(q, me ^ 1));
  const goalOf = p => p.moves().filter(m => !chased(p.clone().play(m), p.side).length);
  // which kinds of the opponent chase our piece on point s (after the move)
  const chasers = (q, me, s) => E.threats(q, me ^ 1).has(s) ? q.pseudo(me ^ 1, true).filter(x => mTo(x) === s && q.safe(x, me ^ 1)).map(x => T(q.at(mFrom(x)))) : [];
  const id = 'b_escape', si = L.steps.findIndex(s => s.id === id), st = L.steps[si];
  if (!st || !only.has(id)) return;
  // the warm-ups
  (st.ramp || []).forEach((R, j) => { if (!R.s) return; const p = E.Pos.from(R.s), me = p.side, h0 = chased(p, me), G = goalOf(p);
    const w = `warm-up ${j + 1}`, fromI = x => { const m = p.moves().find(y => mFrom(y) === x); return m != null ? E.name(p, m, 'iccs').slice(0, 2) : '?'; };
    if (h0.length !== 1) { add(id, -1, `④ ${w}: ${h0.length} pieces chased`); return; }
    if (G.length !== 1 || mFrom(G[0]) !== h0[0]) add(id, -1, `① ${w}: the safe moves ${G.map(m => E.name(p, m, 'iccs'))} are not one move of the chased piece`);
    if (R.k === 'explain') { const mk = R.marks || [], hl = mk.filter(x => x[1] === 'hl').map(x => x[0]), ok = mk.filter(x => x[1] === 'ok').map(x => x[0]);
      if (hl.join() !== fromI(h0[0])) add(id, -1, `⑧ ${w}: the lit point ${hl} is not the chased piece`);
      if (G.length === 1 && ok.join() !== E.name(p, G[0], 'iccs').slice(2, 4)) add(id, -1, `⑧ ${w}: the green point ${ok} is not the safe point`); }
    if (R.k === 'try') { const M = G.map(m => E.name(p, m, 'iccs')).sort();
      if (JSON.stringify((R.ok || []).slice().sort()) !== JSON.stringify(M)) add(id, -1, `① ${w}: ok ${R.ok} ≠ the safe moves ${M}`);
      if ((R.look || []).join() !== fromI(h0[0])) add(id, -1, `⑧ ${w}: look ${R.look} is not the chased piece`); }
    const B = brd(R.s); st.problems.forEach((P, k) => { const e = dist(B, brd(P.s)); if (e <= 4) add(id, k, `⑤ 追1 ${e} points from ${w}`); }); });
  let prevD = -1, firstD = null; const tys = new Set();
  st.problems.forEach((P, j) => { const a = m => add(id, j, m), p = E.Pos.from(P.s), me = p.side, all = p.moves(), nm = m => E.name(p, m);
    // ⑨ every legal move valued once
    const sm = new Map(P.sc || []); if (sm.size !== (P.sc || []).length) a('⑨ a move is valued twice');
    all.forEach(m => { if (!sm.has(m)) a(`⑨ ${nm(m)} has no value`); }); (P.sc || []).forEach(([m]) => { if (!all.includes(m)) a(`⑨ a valued move ${m} is not legal`); });
    if (!all.includes(P.best)) { a('① the answer is not legal'); return; }
    // ④ one chased piece, nobody in check
    const h0 = chased(p, me);
    if (h0.length !== 1) { a(`④ ${h0.length} pieces of ours are chased`); return; }
    const hs = h0[0], hty = T(p.at(hs));
    if (![E.HORSE, E.ROOK, E.CANNON].includes(hty)) a(`④ the chased piece is a ${hty}`);
    if (p.inCheck()) a('④ the mover is in check'); if (E.Pos.from(P.s.replace(/ [wb]$/, me ? ' w' : ' b')).inCheck()) a('④ the side not to move is in check');
    // ① the goal set
    const G = goalOf(p);
    if (!G.includes(P.best)) a(`① the answer ${nm(P.best)} leaves a piece chased`);
    G.filter(m => m !== P.best).forEach(m => a(`② ${nm(m)} also leaves nothing chased`));
    if (mFrom(P.best) !== hs) a('④ the answer does not move the chased piece');
    if (p.at(mTo(P.best))) a('④ the answer is a capture, not an escape');
    const S = P.sc.slice().sort((x, y) => y[1] - x[1]);
    if (S[0][0] !== P.best) a(`① the engine prefers ${nm(S[0][0])}`);
    else if (S.length > 1) { if (S[0][1] - S[1][1] < 100) a(`② the second move ${nm(S[1][0])} is only ${S[0][1] - S[1][1]} worse`); if (pts(P, S[1][0]) >= 16) a(`② the second move ${nm(S[1][0])} scores ${pts(P, S[1][0])}`); }
    if (Math.abs(S[0][1]) > E.WINT - 1000) a('④ a won / lost position');
    // ③ enough moves, the traps
    const pm = all.filter(m => mFrom(m) === hs), traps = pm.filter(m => m !== P.best);
    if (all.length < 12) a(`③ ${all.length} legal moves`);
    if (pm.length < 3) a(`③ the chased piece has ${pm.length} moves`);
    if (traps.length < 2) a(`③ ${traps.length} traps`);
    traps.forEach(m => { if (!chased(p.clone().play(m), me).includes(mTo(m))) a(`③ the trap ${nm(m)} is not chased again (it is safe for the piece)`); });
    tys.add(hty);
    // ⑤ no near twin
    const B = brd(P.s); for (const [who, b] of pool) { if (who === `${id} q${j + 1}` || who.startsWith(`${id} ramp`)) continue; const e = dist(B, b); if (e <= 4) a(`⑤ ${e} points from ${who}`); }
    // ⑥ easier first
    const d = traps.length;
    if (d < prevD) a(`⑥ easier than the problem before (traps ${d} after ${prevD})`); prevD = Math.max(prevD, d); if (firstD === null) firstD = d;
    if (j === st.problems.length - 1 && !(d > firstD)) a(`⑥ the last problem is no harder than problem 1 (${d} vs ${firstD})`);
    // ⑦ ⑧ the 3D words
    let W; try { W = X.xqLsJa(E, st, P, j, k => k === 'ok' ? '〈正〉' : '〈誤〉', si); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
    const N = t => X.XQN(t, me), hn = N(hty);
    const g = plain(W.good(P.best));
    if (/\{|undefined|NaN/.test(g)) a(`⑧ the praise 「${g}」`);
    if (!g.includes(hn)) a(`⑧ the praise 「${g}」 does not name the chased ${hn}`);
    const hint = W.hintTx, trapK = new Set(); traps.forEach(m => chasers(p.clone().play(m), me, mTo(m)).forEach(k => trapK.add(k)));
    if (/馬の跳び先/.test(hint) && !trapK.has(E.HORSE)) a(`⑧ 「${hint}」: no trap is chased by a horse`);
    if (/炮は、間に1つ/.test(hint) && !trapK.has(E.CANNON)) a(`⑧ 「${hint}」: no trap is chased by a cannon`);
    if (/相手の車の筋/.test(hint) && !trapK.has(E.ROOK)) a(`⑧ 「${hint}」: no trap is chased by a rook`);
    if (/車や炮の筋/.test(hint) && !trapK.has(E.ROOK) && !trapK.has(E.CANNON)) a(`⑧ 「${hint}」: no trap is chased by a rook or a cannon`);
    for (const u of all) { if (u === P.best) continue; const raw = plain(W.ng(u)), q = p.clone().play(u), x = nm(u), i1 = raw.indexOf('〈正〉'), t = i1 > 0 ? raw.slice(0, i1) : raw;
      if (/\{|undefined|NaN/.test(raw)) { a(`⑧ ${x}: 「${raw}」`); continue; }
      if (!raw.includes('〈誤〉') || !raw.includes('〈正〉')) a(`⑦ ${x}: the words do not name both moves 「${raw}」`);
      const ch = chased(q, me), chN = new Set(ch.map(s => N(T(q.at(s))))), hsAfter = mFrom(u) === hs ? mTo(u) : hs;
      const said = /ねらわれた(.)は取られたまま|(.)へのねらいが消えない|では(.)が助からない|(.)はまだねらわれてる|だと、(.)が次に取られちゃう/.exec(t);
      const said2 = /きみの(.)が取られちゃう|相手に(.)をねらわれる|(.)が取られる形が残る|(.)が相手の駒の利きに|(.)がただで取られそう|のあと、(.)を取られちゃう|では、(.)がねらわれたまま|ても、(.)は取られちゃう/.exec(t);
      const lossT = /きみの(.)を取り返され|代わりに(.)を取られ|もっと大きい(.)を失う/.exec(t);
      if (said) { const n2 = said.slice(1).find(Boolean); if (n2 !== hn || !ch.includes(hsAfter)) a(`⑦ ${x}: 「${t}」 (the chased ${hn} is ${ch.includes(hsAfter) ? 'still chased' : 'safe'}; named ${n2})`); }
      else if (said2) { const n2 = said2.slice(1).find(Boolean); if (!chN.has(n2)) a(`⑦ ${x}: 「${t}」 (no ${n2} of ours is chased after it)`); }
      else if (lossT) { const n2 = lossT.slice(1).find(Boolean); if (!p.at(mTo(u)) || !q.moves().some(r => mTo(r) === mTo(u)) || N(T(p.at(mFrom(u)))) !== n2) a(`⑦ ${x}: 「${t}」 (no ${n2} of ours is taken back)`); }
      else a(`⑦ ${x}: the words do not say which piece is lost 「${t}」`);
      if (ch.includes(hsAfter) && !said && !lossT && !(said2 && said2.slice(1).find(Boolean) === hn)) a(`⑦ ${x}: the chased ${hn} is still chased, the words name another piece 「${t}」`);
    }
  });
  if (tys.size < 2) add(id, 4, `⑤ every answer moves the same kind of piece (${[...tys]})`);
}
module.exports = { verify };
void path;

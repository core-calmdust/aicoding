// (2026-11-26 第2期 担当A) xiangqi「兵の終盤」e_pawn: our general and two soldiers across the river against the general with one or
// two advisors. Called from tools/lesson-verify.js xiangqi() with its pool and the 3D words (xqLsJa). The same strict checks as
// e_rook (tools/lesson-verify-xqend.js, its solver):
//  ① n = the fewest moves in which some first move forces a win (every reply; no legal move = lost); the answer is the only such
//    first move, it forces a mate by check within n (追6), ok = [best] (追3), the engine values (sc, every legal move once) put it
//    alone on top as a win
//  ② no other first move wins within n + 1
//  ③ 8 legal moves or more; 2 decoys or more (other checks, or slower wins the engine also sees)
//  ④ the theme: the general and two soldiers across the river against the general and one or two advisors, nobody in check,
//    2 ≤ n ≤ 4; the answer moves a soldier or the general
//  追31 the answers have a check and a quiet move both; the soldiers' answers go forward and sideways both; ⑤ 2 kinds of piece moved
//  ⑤ more than 4 points from every other xiangqi board (mirrored; the warm-ups too: 追1)
//  ⑥ in the order shown (n, a check before a quiet move, the decoys) never goes down; the last problem is harder than the first
//  ⑦ ⑧ ショウギツネ's words: the ask and the praise say "the fastest"; the hint's way matches the answer; every wrong move names both
//    moves and says what really happens: a soldier taken (a reply takes it), a slower win (the engine still sees a win and the
//    solver finds none within n), or the mate put off (no win within n + 1)
//  warm-ups: the move shown / asked is the only fastest win of its board, a mate by check, no other move within n + 1
const path = require('path'), { solver } = require('./lesson-verify-xqend.js');
function verify({ E, L, X, pool, dist, brd, plain, add, only }) {
  const id = 'e_pawn', si = L.steps.findIndex(s => s.id === id), st = L.steps[si];
  if (!st || !only.has(id)) return;
  const S = solver(E), PW = E.PAWN, T = E.typeOf, C = E.colorOf, mTo = E.mTo, mFrom = E.mFrom, WT = E.WINT;
  const theme = p => { const c = {}; for (let s = 0; s < 90; s++) { const x = p.b[s]; if (x) { const k = (C(x) === p.side ? 'm' : 'o') + T(x); c[k] = (c[k] || 0) + 1; } }
    return c.m1 === 1 && c.m7 === 2 && c.o1 === 1 && (c.o2 === 1 || c.o2 === 2) && Object.keys(c).length === 4 && [...Array(90).keys()].every(s => T(p.b[s]) !== PW || (s < 45)); };
  // the general's face-off: a flight of the enemy general shut only by our general (legal once our general is off the board)
  const face = q => { const d = q.side, o = d ^ 1, k = q.k[d], ko = q.k[o], z = q.clone(); z.b[ko] = 0; z.k[o] = -1;
    return q.pseudo(d, false, k).some(m => !q.safe(m, d) && mTo(m) % 9 === ko % 9 && z.safe(m, d)); };
  const probS = st.problems.map(P => P.s);
  (st.ramp || []).forEach((R, j) => { if (!R.s) return; const p = E.Pos.from(R.s), w = `warm-up ${j + 1}`, F = S.fastest(p, 5);
    if (F.W.length !== 1) { add(id, -1, `② ${w}: ${F.W.length} first moves win in ${F.n}`); return; }
    const A = F.W[0], nm = E.name(p, A, 'iccs');
    if (!S.forces(p, A, F.n, true)) add(id, -1, `追6 ${w}: the fastest win is not a mate by check`);
    if (p.moves().some(m => m !== A && S.forces(p, m, F.n + 1, false))) add(id, -1, `② ${w}: another move wins within ${F.n + 1}`);
    if (R.k === 'explain') { const mk = R.marks || [], hl = mk.filter(x => x[1] === 'hl').map(x => x[0]).join(), ok = mk.filter(x => x[1] === 'ok').map(x => x[0]).join();
      if (hl !== nm.slice(0, 2) || ok !== nm.slice(2, 4)) add(id, -1, `⑧ ${w}: the marks ${hl}→${ok} are not the fastest win ${nm}`); }
    if (R.k === 'try') { if ((R.ok || []).join() !== nm) add(id, -1, `① ${w}: ok ${R.ok} ≠ ${nm}`); if ((R.look || []).join() !== nm.slice(0, 2)) add(id, -1, `⑧ ${w}: look ${R.look} ≠ ${nm.slice(0, 2)}`); }
    if (probS.includes(R.s)) add(id, -1, `追1 ${w} is a problem`);
    const B = brd(R.s); st.problems.forEach((P, k) => { const e = dist(B, brd(P.s)); if (e <= 4) add(id, k, `⑤ 追1 ${e} points from ${w}`); }); });
  const key = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
  let prevK = null, firstK = null; const tys = new Set(), kinds = new Set(), dirs = new Set();
  st.problems.forEach((P, j) => { const a = m => add(id, j, m), p = E.Pos.from(P.s), me = p.side, all = p.moves(), nm = m => E.name(p, m);
    // ⑨ the ok kind: ok = [best]; every legal move valued once
    if (!P.ok || P.ok.length !== 1 || P.ok[0] !== P.best) a(`⑨ ok ${P.ok} is not [best ${P.best}] (追3: the fastest mate alone is right)`);
    const sm = new Map(P.sc || []); if (sm.size !== (P.sc || []).length) a('⑨ a move is valued twice');
    all.forEach(m => { if (!sm.has(m)) a(`⑨ ${nm(m)} has no value`); }); (P.sc || []).forEach(([m]) => { if (!all.includes(m)) a(`⑨ a valued move ${m} is not legal`); });
    if (!all.includes(P.best)) { a('① the answer is not legal'); return; }
    if (!theme(p)) a('④ not the general and two soldiers across the river against the general and one or two advisors');
    if (p.inCheck()) a('④ the mover is in check'); { const q = p.clone(); q.side ^= 1; if (q.inCheck()) a('④ the side not to move is in check'); }
    const F = S.fastest(p, 5), n = F.n, A = P.best;
    if (!n) { a('① no win within 5 moves'); return; }
    if (F.W.length !== 1 || F.W[0] !== A) a(`① the fastest wins (in ${n}) ${F.W.map(nm)} ≠ the answer ${nm(A)}`);
    if (!S.forces(p, A, n, true)) a(`追6 the answer wins in ${n} by 困毙, not by a mate by check`);
    if (n < 2 || n > 4) a(`④ the mate is ${n} moves away`);
    const Sx = P.sc.slice().sort((x, y) => y[1] - x[1]);
    if (Sx[0][0] !== A || (Sx[1] && Sx[1][1] >= Sx[0][1])) a(`① the engine does not put the answer alone on top (${nm(Sx[0][0])})`);
    if (Sx[0][1] <= WT) a('① the engine does not see the answer win');
    all.filter(m => m !== A && S.forces(p, m, n + 1, false)).forEach(m => a(`② ${nm(m)} wins within ${n + 1} too`));
    const ty = T(p.at(mFrom(A))); if (ty !== PW && ty !== E.KING) a('④ the answer moves neither a soldier nor the general'); tys.add(ty);
    const af = p.clone().play(A), chk = af.inCheck();
    kinds.add(chk ? 'check' : 'quiet'); if (ty === PW) dirs.add(mFrom(A) % 9 === mTo(A) % 9 ? 'file' : 'rank');
    const ck = all.filter(u => u !== A && p.clone().play(u).inCheck()).length, slow = all.filter(u => u !== A && sm.get(u) > WT).length, dec = ck + slow;
    if (all.length < 8) a(`③ ${all.length} legal moves`); if (dec < 2) a(`③ ${dec} decoys (checks / slower wins)`);
    const B = brd(P.s); for (const [who, b] of pool) { if (who === `${id} q${j + 1}`) continue; const e = dist(B, b); if (e <= 4) a(`⑤ ${e} points from ${who}`); }
    const K = [n, chk ? 0 : 1, dec];
    if (prevK && key(K, prevK) < 0) a(`⑥ easier than the problem before (${K} after ${prevK})`); if (!prevK || key(K, prevK) > 0) prevK = K; if (!firstK) firstK = K;
    if (j === st.problems.length - 1 && !(key(K, firstK) > 0)) a('⑥ the last problem is no harder than problem 1');
    // ⑦ ⑧ the 3D words
    let W; try { W = X.xqLsJa(E, st, P, j, k => k === 'ok' ? '〈正〉' : '〈誤〉', si); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
    const FAST = /いちばん早く|最短|いちばん少な|いちばん短|回り道しないで/;
    if (!FAST.test(W.ask)) a(`⑧ the ask does not say the fastest 「${W.ask}」`);
    const g = plain(W.good(A)); if (/\{|undefined|NaN/.test(g)) a(`⑧ the praise 「${g}」`); if (!FAST.test(g)) a(`⑧ the praise does not say the fastest 「${g}」`);
    if (/遠回り|少し長く/.test(g)) a(`⑧ the praise calls the answer slow 「${g}」`);
    const h = W.hintTx;
    const pin = () => { const a0 = af.k[me], b0 = af.k[me ^ 1]; if (a0 % 9 !== b0 % 9) return false; const S0 = [];
      for (let r = Math.min(a0, b0) + 9; r < Math.max(a0, b0); r += 9) if (af.at(r)) S0.push(af.at(r));
      // the one piece between is an enemy advisor, and it really cannot leave the file (each of its moves is illegal)
      return S0.length === 1 && C(S0[0]) !== me && T(S0[0]) === E.ADVISOR && !af.moves().some(r => T(af.at(mFrom(r))) === E.ADVISOR && mFrom(r) % 9 === b0 % 9 && mTo(r) % 9 !== b0 % 9); };
    if (!h) a('⑧ no hint'); else if (/士を動けなく|間に士/.test(h)) { if (ty !== E.KING || !pin()) a(`⑧ the hint 「${h}」 but no advisor is pinned between the generals`); }
    else if (/真ん中の筋/.test(h)) { const a0 = af.k[me], pal = (me === 0 ? [0, 1, 2] : [7, 8, 9]).map(r => r * 9 + 4);
      // our general on the middle file, and an empty point of the enemy palace on that file is shut by the face-off (nothing between)
      const clear = t => { for (let r = Math.min(a0, t) + 9; r < Math.max(a0, t); r += 9) if (af.at(r)) return false; return true; };
      if (!(ty === E.KING && a0 % 9 === 4 && pal.some(t => !af.at(t) && clear(t)))) a(`⑧ the hint 「${h}」 but our general does not shut a point of the middle file`); }
    else if (/帥/.test(h)) { if (ty !== E.KING) a(`⑧ the hint 「${h}」 but the answer moves the chariot`); else if (!face(af)) a(`⑧ the hint 「${h}」 but no flight is shut by the face-off`); }
    else if (/兵の王手|兵で王手/.test(h)) { if (!(ty === PW && chk)) a(`⑧ the hint 「${h}」 but the answer is no soldier's check`); }
    else if (/王手を急がず|王手するより/.test(h)) { const fw = mFrom(A) % 9 === mTo(A) % 9;
      if (!(ty === PW && !chk)) a(`⑧ the hint 「${h}」 but the answer is no quiet soldier move`);
      else if (/前へ/.test(h) !== fw || /横/.test(h) === fw) a(`⑧ the hint 「${h}」 but the soldier goes ${fw ? 'forward' : 'sideways'}`); }
    else a(`⑧ the hint 「${h}」 does not say the answer's way`);
    for (const u of all) { if (u === A) continue; const raw = plain(W.ng(u)), xn = nm(u), i1 = raw.indexOf('〈正〉'), t = i1 > 0 ? raw.slice(0, i1) : raw;
      if (/\{|undefined|NaN/.test(raw)) { a(`⑧ ${xn}: 「${raw}」`); continue; }
      if (!raw.includes('〈誤〉') || !raw.includes('〈正〉')) a(`⑦ ${xn}: the words do not name both moves 「${raw}」`);
      if (/いい手|ナイス|正解！|お見事/.test(t)) a(`⑦ ${xn}: praises a wrong move 「${t}」`);
      const q = p.clone().play(u), lost = q.moves().some(r => q.at(mTo(r)) && T(q.at(mTo(r))) === PW && C(q.at(mTo(r))) === me), v = sm.get(u);
      const sLost = /兵を(1つ)?取られ|兵がただで取られ/.test(t), sSlow = /でも勝てる|勝ちまで行ける|まだ勝てる|勝ちは残って/.test(t), sOff = /詰みが遠のいて|息をつかせて|すぐには詰まない|詰みがずっと遠のい|すぐには詰ませられな/.test(t);
      const slowWin = v > WT && !S.forces(p, u, n, false), noWin = !S.forces(p, u, n + 1, false);
      if (sLost !== lost) a(`⑦ ${xn}: 「${t}」 (a soldier ${lost ? 'can' : 'cannot'} be taken)`);
      if (sSlow && !slowWin) a(`⑦ ${xn}: 「${t}」 (no slower win: ${v})`);
      if (sOff && (v > WT || !noWin)) a(`⑦ ${xn}: 「${t}」 (it still wins: ${v})`);
      if (v > WT && !sSlow) a(`⑦ ${xn}: the engine still sees a win, the words do not say it 「${t}」`);
      if (!(v > WT) && !sOff) a(`⑦ ${xn}: no win is seen, the words do not say the mate is put off 「${t}」`);
      if (/引き分け|もう詰ませられない|つかまえきれな/.test(t)) a(`⑦ ${xn}: 「${t}」 (a draw is not proven)`);
    }
  });
  if (tys.size < 2) add(id, 4, `⑤ every answer moves the same kind of piece`);
  // 追31: the answers have a check and a quiet move both; the chariot's answers move along a file and along a rank both
  if (kinds.size < 2) add(id, 4, `追31 the answers are all ${[...kinds]}`); if (dirs.size < 2) add(id, 4, `追31 the soldiers' answers all go ${[...dirs]}`);
}
module.exports = { verify };

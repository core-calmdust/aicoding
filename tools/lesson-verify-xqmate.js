// (2026-11-24 第2期 担当A) xiangqi「詰みの形」m_hc（馬後炮）・m_dc（重炮）・m_face（帥のにらみ）: 'ok' kind problems of 1〜3 moves.
// Called from tools/lesson-verify.js xiangqi() with its pool and the 3D words (xqLsJa).
//  ① n = the fewest moves in which some first move forces a win (read from the rules, every reply); ok = every first move that forces a
//    mate by check within n, and no first move wins within n by stalemate (困毙) only (the lesson is about the mate)
//  ② one answer, nothing wins sooner
//  ③ 12 legal moves or more, two checks or more that do not win
//  ④ the answer forces the lesson's mate within n on every reply (馬後炮: the last check is a cannon screened by our horse; 重炮: a cannon
//    screened by our cannon; 帥のにらみ: one of the general's flights is shut only by our general's face-off); n ≤ 3; nobody in check
//  ⑤ more than 4 points from every other xiangqi board (mirrored); the answers move two kinds of piece or more (同じ手筋をくり返さない)
//  ⑥ in the order shown: n never goes down, within one n a check comes before a quiet move, then the decoys (checks, moves leaving
//    ≤ 2 escapes) never go down; the last problem is harder than the first
//  ⑦ ⑧ ショウギツネ's words: every wrong move's words name how it is met with a reply that really escapes (after it no win within
//    n − 1); a quiet miss is not called a check; the praise names the mate and says when it comes (n = 1 now, 2 next move, 3 later),
//    a check answer is not called quiet nor the other way; the warm-up's mate is the lesson's mate in one and is not a problem (追1)
const path = require('path');
const ROOT = path.join(__dirname, '..');
function theme(E) {
  const T = E.typeOf, C = E.colorOf;
  const checkers = q => { const d = q.side, k = q.k[d], o = d ^ 1, b = q.b, out = [], r0 = (k / 9) | 0, c0 = k % 9;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let r = r0 + dr, c = c0 + dc; const seen = [];
      while (r >= 0 && r < 10 && c >= 0 && c < 9) { const s = r * 9 + c; if (b[s]) { seen.push(s); if (seen.length === 2) break; } r += dr; c += dc; }
      if (seen.length === 2 && C(b[seen[1]]) === o && T(b[seen[1]]) === E.CANNON) out.push({ t: E.CANNON, mine: C(b[seen[0]]) === o, scr: T(b[seen[0]]) }); }
    return out; };
  // 帥のにらみ: a flight of the mated general that is shut only by our general (legal once our general is off the board)
  const face = q => { const d = q.side, o = d ^ 1, k = q.k[d], ko = q.k[o], z = q.clone(); z.b[ko] = 0; z.k[o] = -1;
    return q.pseudo(d, false, k).some(m => !q.safe(m, d) && E.mTo(m) % 9 === ko % 9 && z.safe(m, d)); };
  return { m_hc: q => checkers(q).some(x => x.mine && x.scr === E.HORSE), m_dc: q => checkers(q).some(x => x.mine && x.scr === E.CANNON), m_face: face };
}
function solver(E) {
  const noMv = q => !q.moves().length;
  const win = (q, n, th) => { if (n < 1) return false; for (const m of q.moves()) { const z = q.clone().play(m); if (noMv(z)) { if (!th || (z.inCheck() && th(z))) return true; continue; } if (n > 1 && z.moves().every(r => win(z.clone().play(r), n - 1, th))) return true; } return false; };
  const forces = (p, m, n, th) => { const z = p.clone().play(m); if (noMv(z)) return !th || (z.inCheck() && th(z)); return n > 1 && z.moves().every(r => win(z.clone().play(r), n - 1, th)); };
  const winC = (q, n) => { if (n < 1) return false; for (const m of q.moves()) { const z = q.clone().play(m); if (!z.inCheck()) continue; if (noMv(z)) return true; if (n > 1 && z.moves().every(r => winC(z.clone().play(r), n - 1))) return true; } return false; };   // (every move of ours a check)
  const forcesC = (p, m, n) => { const z = p.clone().play(m); if (!z.inCheck()) return false; if (noMv(z)) return true; return n > 1 && z.moves().every(r => winC(z.clone().play(r), n - 1)); };
  return { noMv, win, forces, forcesC, firsts: (p, n, th) => p.moves().filter(m => forces(p, m, n, th)) };
}
const IDS = ['m_hc', 'm_dc', 'm_face'], NAME = { m_hc: '馬後炮', m_dc: '重炮', m_face: '帥のにらみ' };
function verify(c) {
  const { E, L, X, pool, dist, brd, plain, add, only } = c, TH = theme(E), S = solver(E), mFrom = E.mFrom, mTo = E.mTo, T = E.typeOf;
  const chkOnly = q => q.inCheck();
  L.steps.forEach((st, si) => { const id = st.id; if (!IDS.includes(id) || (only && !only.has(id))) return;
    const th = TH[id], probS = new Set(st.problems.map(P => P.s.split(' ')[0])), tys = new Set(); let prevK = null, firstK = null;
    const key = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
    (st.ramp || []).forEach((r, j) => { if (!r.s) return; const p = E.Pos.from(r.s), G = S.firsts(p, 1, chkOnly), Gt = S.firsts(p, 1, th), nm = G.map(m => E.name(p, m, 'iccs')).sort();
      if (probS.has(r.s.split(' ')[0])) add(id, -1, `追1 warm-up ${j + 1} is a problem`);
      if (G.length !== 1) add(id, -1, `② warm-up ${j + 1}: ${G.length} mates in one`);
      if (!G.length || !Gt.includes(G[0])) add(id, -1, `④ warm-up ${j + 1}: the mate is not ${NAME[id]}`);
      if (r.k === 'explain') { const mk = (r.marks || []).map(x => x[0]); if (r.seq ? !nm.includes(r.seq[0]) : !nm.some(m => mk.includes(m.slice(0, 2)) && mk.includes(m.slice(2, 4)))) add(id, -1, `⑧ warm-up ${j + 1}: the move shown is not the mate`); }
      if (r.ok && JSON.stringify(r.ok.slice().sort()) !== JSON.stringify(nm)) add(id, -1, `① warm-up ${j + 1}: ok ${r.ok} ≠ ${nm}`); });
    st.problems.forEach((P, j) => { const a = m => add(id, j, m), p = E.Pos.from(P.s), me = p.side, all = p.moves(), nm = m => E.name(p, m);
      if (!P.ok || !P.ok.length) { a('⑨ not an ok-kind problem'); return; }
      if (!P.ok.includes(P.best)) a('⑨ best is not in ok');
      P.ok.forEach(m => { if (!all.includes(m)) a(`① ${m} in ok is not legal`); });
      let n = 0, W = []; for (let k = 1; k <= 3 && !n; k++) { W = S.firsts(p, k, null); if (W.length) n = k; }
      if (!n) { a('① no first move wins within 3 moves'); return; }
      const G = S.firsts(p, n, chkOnly), okS = new Set(P.ok);
      if (JSON.stringify(P.ok.slice().sort()) !== JSON.stringify(G.slice().sort())) a(`① ok ${P.ok.map(nm)} ≠ the mates in ${n} ${G.map(nm)}`);
      W.filter(m => !G.includes(m)).forEach(m => a(`④ ${nm(m)} wins in ${n} by stalemate (困毙), not by mate (追6)`));
      if (G.length !== 1) a(`② ${G.length} first moves mate in ${n}`);
      const A = P.ok[0]; if (!all.includes(A)) return;
      if (!S.forces(p, A, n, th)) a(`④ the answer does not force ${NAME[id]} within ${n} on every reply`);
      if (p.inCheck()) a('④ the mover is in check'); { const q = E.Pos.from(P.s.replace(/ [wb]$/, me ? ' w' : ' b')); if (q.inCheck()) a('④ the side not to move is in check'); }
      const af = p.clone().play(A), chk = af.inCheck();
      const escOf = u => { const q = p.clone().play(u); return q.moves().filter(r => !S.win(q.clone().play(r), n - 1, null)); };
      const ck = all.filter(u => !okS.has(u) && p.clone().play(u).inCheck()).length, near = all.filter(u => !okS.has(u) && escOf(u).length <= 2).length;
      if (all.length < 12) a(`③ ${all.length} legal moves`); if (ck < 2) a(`③ ${ck} checks that do not win`);
      tys.add(T(p.at(mFrom(A))));
      const B = brd(P.s); for (const [who, b] of pool) { if (who === `${id} q${j + 1}`) continue; const e = dist(B, b); if (e <= 4) a(`⑤ ${e} points from ${who}`); }
      const K = [n, chk ? 0 : 1, ck + near];
      if (prevK && key(K, prevK) < 0) a(`⑥ easier than the problem before (${K} after ${prevK})`); if (!prevK || key(K, prevK) > 0) prevK = K; if (!firstK) firstK = K;
      if (j === st.problems.length - 1 && !(key(K, firstK) > 0)) a('⑥ the last problem is no harder than problem 1');
      let Wd; try { Wd = X.xqLsJa(E, st, P, j, k => k === 'ok' ? '〈正〉' : '〈誤〉', si); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
      const sayN = t => { if (n === 1 && /次の手で|次で|3手目|とどめまで|詰みまで届く|続きがある/.test(t)) return 'n 1 but later'; if (n === 2 && /3手目|詰みまで届く|続きがある|王手を続けて|王手の連続/.test(t)) return 'n 2 but later than next'; if (n === 3 && /次の手で|次の(?:.{0,6})詰み|次で/.test(t)) return 'n 3 but next move'; if (n > 1 && /動けなくなる|もう1つもない|たった1手で|全部なくなる/.test(t) && !/次|3手目|届く|続き|用意|先に/.test(t)) return `n ${n} but mate now`; return ''; };
      const g = plain(Wd.good(P.best)), mn = NAME[id];
      if (/\{|undefined|NaN/.test(g)) a(`⑧ the praise 「${g}」`);
      if (!g.includes(mn)) a(`④ the praise does not name ${mn} 「${g}」`);
      { const e = sayN(g); if (e) a(`⑧ the praise: ${e} 「${g}」`); }
      if (n > 1 && (chk ? /王手じゃなくても|静かな|王手をかけずに/.test(g) : /王手で受け方|王手を受けた|王手を続けて|王手の連続/.test(g))) a(`⑧ the praise does not match the answer (check ${chk}) 「${g}」`);
      for (const t of [Wd.ask, Wd.hintTx]) if (/\{|undefined|NaN/.test(t)) a(`⑧ 「${t}」`);
      const allC = S.forcesC(p, A, n); for (const t of [g, Wd.hintTx]) if (/王手を続けて|王手の連続|王手、王手/.test(t) && !allC) a(`⑧ 「${t}」 but no mate in ${n} gives check on every move`);
      for (const u of all) { if (okS.has(u)) continue; const raw = plain(Wd.ng(u)), xn = nm(u), i1 = raw.indexOf('〈正〉'), t = i1 > 0 ? raw.slice(0, i1) : raw, tl = i1 > 0 ? raw.slice(i1) : '';
        if (/\{|undefined|NaN/.test(raw)) { a(`⑧ ${xn}: 「${raw}」`); continue; }
        if (!raw.includes('〈誤〉') || !raw.includes('〈正〉')) a(`⑦ ${xn}: the words do not name both moves 「${raw}」`);
        { const e = sayN(tl); if (e) a(`⑧ ${xn}: the answer's reason: ${e} 「${tl}」`); }
        if (/王手を続けて|王手の連続/.test(tl) && !allC) a(`⑧ ${xn}: 「${tl}」 but no mate in ${n} gives check on every move`);
        if (!tl.includes(mn)) a(`④ ${xn}: the answer's reason does not name ${mn} 「${tl}」`);
        const q = p.clone().play(u), es = escOf(u), k = q.k[me ^ 1], to = mTo(u), isC = q.inCheck();
        const take = /取られて終わ|そのまま取られ|ぱくっと取られ|取られて消え|ただで取られる/.test(t), run = /逃げられ|逃げ道が残って|空いている点へ動いて|逃げ出せる|逃げ場がまだ|將が動いて|將が1歩動いて/.test(t), blk = /間に駒を入れ|はさんで防げ|合い駒|筋に駒を入れ|あいだをふさが/.test(t);
        const capd = /相手に(.+?)を取られて|きみの(.+?)が取られて/.exec(t), mvd = /相手の(.+?)が動いて受け|相手に(.+?)で守りの1手/.exec(t);
        if (isC && !take && !run && !blk) a(`⑦ ${xn}: a check, the words do not say how it is met 「${t}」`);
        if (isC && /王手じゃない/.test(t)) a(`⑦ ${xn}: 「${t}」 (it is a check)`);
        if (!isC && /王手/.test(t) && !/王手じゃない|王手にならな/.test(t)) a(`⑦ ${xn}: 「${t}」 (it is not a check)`);
        if (!isC && n === 1 && !/王手じゃない|王手にならな/.test(t)) a(`⑦ ${xn}: a quiet miss of a mate in one, the words do not say it is no check 「${t}」`);
        if (!isC && n > 1 && !run && !capd && !mvd) a(`⑦ ${xn}: not a check, the words do not name the reply that escapes 「${t}」`);
        if (!isC && /王手じゃないから/.test(t) && !chk) a(`⑦ ${xn}: 「${t}」 (the answer is not a check either)`);
        if (n > 1 && /次の手で詰まない|次で詰まなく|次の詰みが消え/.test(t) && n !== 2) a(`⑧ ${xn}: 「${t}」 (the mate was ${n} moves away)`);
        if (take && !es.some(r => mTo(r) === to)) a(`⑦ ${xn}: 「${t}」 (no capture of the checking piece escapes)`);
        if (run && !es.some(r => mFrom(r) === k)) a(`⑦ ${xn}: 「${t}」 (no move of the general escapes)`);
        if (blk && !es.some(r => mFrom(r) !== k && mTo(r) !== to)) a(`⑦ ${xn}: 「${t}」 (no block escapes)`);
        if (capd && !isC) { const nmC = capd[1] || capd[2]; if (!es.some(r => q.at(mTo(r)) && X.XQN(T(q.at(mTo(r))), me) === nmC)) a(`⑦ ${xn}: 「${t}」 (no reply taking a ${nmC} escapes)`); }
        if (mvd && !isC) { const nmM = mvd[1] || mvd[2]; if (!es.some(r => mFrom(r) !== k && !q.at(mTo(r)) && X.XQN(T(q.at(mFrom(r))), me ^ 1) === nmM)) a(`⑦ ${xn}: 「${t}」 (no quiet ${nmM} reply escapes)`); }
      }
    });
    if (tys.size < 2) add(id, 4, `⑤ every answer moves the same kind of piece (${[...tys]})`);
  });
}
module.exports = { verify, theme, solver, IDS };

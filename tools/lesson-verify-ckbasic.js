// (2026-11-25 第2期 担当A) checkers: the basics b_move・b_jump・b_multi・b_king — every problem and warm-up, every legal move, checked on the board.
//       b_king  — (2026-11-25 21:18) the right moves crown and leave the opponent nothing to capture (no capture after, no shot); no
//                 capture on the board, ≥ 2 men can crown and at least one crowning gives a piece away (「取られないように」 has
//                 something to check). The crowned man on the far row can never be jumped: the words say another piece is taken.
//                 The gold ring (2D and 3D) is on every man that can crown, and that ring has a wrong move (it does not give the answer)
//   ①② P.ok = the lesson's goal set exactly:
//       b_move  — no capture on the board; the right moves give nothing away (ckLF net ≥ 0, no shot for the opponent), are not an
//                 exchange (trade) nor a sacrifice that wins back (shot), and the moved piece is not next to an enemy that could jump it
//                 unless the square behind is filled; every other move gives a piece away for nothing (net < 0)
//       b_jump  — every capture takes one piece; the right one is the only capture not taken back (net 1, no shot after, no enemy man
//                 next to the landing square); every other capture is taken back (net ≤ 0, and at net 0 the landing piece itself)
//       b_multi — the right one is the only capture that takes the most (≥ 2); its piece has another way to capture
//     and the engine agrees: at two depths (8 and 12, 追4) every right move is ≥ 60 above every wrong one
//   ③ ≥ 3 legal moves, right ≤ a third of them (追72), b_jump ≥ 2 pieces that can capture
//   ④ the theme above; no move ends the game
//   ⑤ (追1・追2) no position within 3 squares (the colour-swapped turn too) of any lesson problem, warm-up, puzzle or opening
//   ⑥ the number of wrong moves never drops, the last > the first
//   ⑦⑧ the 2D words (one per lesson: the claims hold for every move by ①) and チェッカニ's 3D words (ckLsJa) for every move: the
//       pieces given away, taken back, the count of pieces, the edge / the filled square / no enemy near
//   ⑧ the hint ring (the answers' pieces): b_jump — every capture of a ringed piece is right (「金の丸の駒で取ると、取り返されにくい」)
//       b_safe  — (2026-11-26 担当A) no capture on the board, the opponent threatens exactly one piece (a capture that wins material if
//                 it were his turn); the right moves give nothing away (ckLF net ≥ 0, no shot) and do it by one of the intro's three ways:
//                 the threatened piece runs (fled), the landing square is filled (plug), or the capture is taken back (trade); every other
//                 move gives a piece away (net < 0: 「駒を取られてしまいます」); the right moves are one piece's and that piece has a wrong
//                 move too (the hint 「金の丸の駒に、損をしない動かし方がある」 holds and does not give the answer away)
//       b_win   — exactly one move wins at once (the opponent has no piece / no move left: 「1手で勝つ」); the gold ring (2D・3D) is the
//                 answer's piece with another move, or — with a capture on the board — every piece that can capture
//   warm-ups: explain — the marked move (hl → ok) is a right move; try — ok = the goal set, right ≤ a third (追72)
const path = require('path');
const CKB_DONE = new Set(['b_move', 'b_jump', 'b_multi', 'b_king', 'b_safe', 'b_win']);
const ckQs = (E, p, d) => { const c = p.caps(); if (!c.length || d > 10) return 0; let b = -99; for (const x of c) b = Math.max(b, E.popc(E.mCap(x)) - ckQs(E, p.clone().play(x), d + 1)); return b; };
const ckTurn = p => { const q = p.clone(); q.side ^= 1; q.rehash(); return q; };
const ckVac = (E, F, m) => F.get(m).after.caps().filter(c => (E.path(F.get(m).after, c) || [E.mTo(c)]).includes(E.mFrom(m)));   // the opponent's captures through the square the man left
function goal(E, X, p, id) {   // → { G: the right moves, F: facts per move, bad: [move, why] } (bad: the position does not fit the lesson)
  const all = p.moves(), F = new Map(all.map(m => [m, X.ckLF(E, p, m)])), bad = [];
  const retook = m => { const f = F.get(m); return f.after.caps().some(c => E.mCap(c) & E.bit(f.t)); };
  let G = [];
  if (id !== 'b_win' && all.some(m => F.get(m).win)) bad.push('④ a move ends the game');
  const kingsOk = ['b_king', 'b_safe', 'b_win'].includes(id);   // (b_safe・b_win come after b_king: kings may be on the board)
  if (!kingsOk && /[BW]/.test(p.spec().b)) bad.push('④ 追32: a king on the board (kings come in b_king)');
  if (!kingsOk) all.forEach(m => { if (F.get(m).crown) bad.push(`④ 追32: ${E.name(p, m)} crowns (kings come in b_king)`); });
  if (id === 'b_move') {
    if (p.hasCaps()) bad.push('④ a capture is on the board');
    all.forEach(m => { const f = F.get(m); if (f.trade || f.shot) bad.push(`④ ${E.name(p, m)} is an exchange / a shot (neither safe nor given away)`); });
    G = all.filter(m => { const f = F.get(m); return f.net >= 0 && f.oppShot <= 0 && !f.trade && !f.shot && (!f.near || f.blocked); });
    all.filter(m => !G.includes(m)).forEach(m => { if (F.get(m).net >= 0) bad.push(`④⑦ ${E.name(p, m)} is not safe but gives nothing away at once (the words: 取られてしまいます)`); });
  } else if (id === 'b_jump') {
    if (!p.hasCaps()) bad.push('④ no capture');
    all.forEach(m => { if (F.get(m).capN !== 1) bad.push(`④ ${E.name(p, m)} takes ${F.get(m).capN} (the jump lesson: one each — counting is b_multi)`); });
    G = all.filter(m => { const f = F.get(m); return f.net === 1 && f.oppShot <= 0 && !f.near; });
    all.filter(m => !G.includes(m)).forEach(m => { const f = F.get(m); if (f.net > 0) bad.push(`④⑦ ${E.name(p, m)} is not taken back (net ${f.net})`); else if (f.net === 0 && !retook(m)) bad.push(`⑦ ${E.name(p, m)}: the piece taken back is not the one that landed (the words: 着地した駒)`); });
    if (new Set(all.map(E.mFrom)).size < 2) bad.push('③ one piece can capture (no choice of piece)');
  } else if (id === 'b_king') {
    if (p.hasCaps()) bad.push('④ a capture is on the board (the crowning lesson: a quiet move)');
    const cr = all.filter(m => F.get(m).crown);
    if (new Set(cr.map(E.mFrom)).size < 2) bad.push('③ one man can crown (the answer is plain)');
    G = cr.filter(m => !F.get(m).after.caps().length && F.get(m).oppShot <= 0);
    if (!cr.some(m => !G.includes(m))) bad.push('④ every crowning is safe (「取られないように」 has nothing to check)');
  } else if (id === 'b_safe') {
    if (p.hasCaps()) bad.push('④ a capture is on the board (the lesson: guard against the opponent\'s capture)');
    const fp = ckTurn(p), thr = new Set(); fp.caps().forEach(c => E.bitsOf(E.mCap(c)).forEach(i => thr.add(i)));
    if (!(ckQs(E, fp, 0) > 0)) bad.push('④ the opponent threatens nothing (no piece to save)');
    if (thr.size !== 1) bad.push(`④ ${thr.size} pieces are threatened (the lesson: one piece under attack)`);
    G = all.filter(m => { const f = F.get(m); return f.net >= 0 && f.oppShot <= 0 && (f.fled || f.plug || f.trade); });
    all.forEach(m => { const f = F.get(m); if (!G.includes(m) && f.net >= 0) bad.push(`④⑦ ${E.name(p, m)} is not one of the three ways but gives nothing away at once (the words: 取られてしまいます)`); });
    if (new Set(G.map(E.mFrom)).size > 1) bad.push('③ the right moves are more than one piece\'s (the gold ring: 「金の丸の駒に」)');
  } else if (id === 'b_win') {
    G = all.filter(m => F.get(m).win);
  } else if (id === 'b_multi') {
    if (!p.hasCaps()) bad.push('④ no capture');
    const mx = Math.max(...all.map(m => F.get(m).capN)); G = all.filter(m => F.get(m).capN === mx);
    if (mx < 2) bad.push('④ no multiple jump');
  }
  return { all, F, G, bad };
}
function verify(o) {
  const fs = require('fs'), { E, W, X, L, pool, ckDist } = o, only = o.only, out = [], add = (id, j, m) => out.push({ step: id, q: j + 1, msg: m });
  const V = o.voice || (() => { const w = {}; try { new Function('window', fs.readFileSync(path.join(__dirname, '..', 'checkers/voice-crab-ja.js'), 'utf8'))(w); } catch (e) {} return ((w.I18N || {})['ja@crab']) || {}; })();
  const plain = t => String(t).replace(/[\u0001\u0002]/g, '');
  const evalAt = (spec, d) => { W.newGame(); return new Map(W.analyzeDepth(spec, d).list.map(x => [x.m, x.v])); };   // (追84: a cleared table each time — the same reading whatever ran before)
  { const app = fs.readFileSync(path.join(__dirname, '..', 'checkers/app.js'), 'utf8');   // ⑨ the 2D hint rings every man that can crown in b_king
    if (!/s\.id === 'b_king' \? p0\.moves\(\)\.filter\(m => p0\.promotes\(m\)\)\.map\(mFrom\)/.test(app)) add('b_king', -1, '⑨ checkers/app.js: the 2D hint does not ring every man that can crown');
    if (!/s\.id === 'b_win' && p0\.hasCaps\(\) \? p0\.moves\(\)\.map\(mFrom\)/.test(app)) add('b_win', -1, '⑨ checkers/app.js: the 2D hint does not ring every piece that can capture (b_win)'); }
  L.steps.forEach(st => { const id = st.id; if (!CKB_DONE.has(id) || (only && !only.has(id))) return;
    let prevD = -1, firstD = null;
    st.problems.forEach((P, j) => { const a = m => add(id, j, m), p = E.Pos.from(P.s), nm = m => E.name(p, m);
      const { all, F, G, bad } = goal(E, X, p, id); bad.forEach(a);
      const okS = new Set(P.ok || []);
      (P.ok || []).forEach(m => { if (!all.includes(m)) a(`① the answer ${m} is not legal`); else if (!G.includes(m)) a(`① the answer ${nm(m)} does not meet the lesson's goal`); });
      G.forEach(m => { if (!okS.has(m)) a(`② ${nm(m)} meets the goal but is scored wrong`); });
      if (!okS.has(P.best)) a('① best is not an answer');
      if (id !== 'b_move' && G.length !== 1) a(`② ${G.length} moves meet the goal (one answer)`);
      // ③ (追72)
      if (all.length < 3) a(`③ only ${all.length} legal moves`);
      if (okS.size * 3 > all.length) a(`③ 追72: ${okS.size} of ${all.length} moves are right (more than a third)`);
      if (!G.length) return;
      // ①② the engine agrees, at two depths (追4)
      const W8 = all.filter(m => !okS.has(m));
      if (id !== 'b_win') for (const d of [8, 12]) { const ev = evalAt(P.s, d), lo = Math.min(...[...okS].map(m => ev.get(m))), hi = Math.max(...W8.map(m => ev.get(m)));
        if (!(lo - hi >= 60)) a(`①② depth ${d}: a right move ${lo}, the best wrong move ${hi} (gap < 60)`); }
      // b_multi: the ringed piece has another way; b_jump: every capture of a ringed piece is right (the hint's words)
      const ring = new Set([...okS].map(E.mFrom));
      if (id === 'b_multi' && all.filter(m => ring.has(E.mFrom(m))).length < 2) a('⑧ 追52: the gold ring\'s piece has one way to capture (the ring gives the answer away, 「続けて跳べる道をたどって」)');
      if (id === 'b_jump' && all.some(m => ring.has(E.mFrom(m)) && !okS.has(m))) a('⑧ the ringed piece has a capture that is taken back (「金の丸の駒で取ると、取り返されにくい」)');
      if (id === 'b_king') { const cr = new Set(all.filter(m => F.get(m).crown).map(E.mFrom));
        if (!all.some(m => cr.has(E.mFrom(m)) && !okS.has(m))) a('⑧ 追52: every move of the ringed men is right (the ring gives the answer away)'); }
      if (id === 'b_safe' && !all.some(m => ring.has(E.mFrom(m)) && !okS.has(m))) a('⑧ 追52: every move of the ringed piece is right (the ring gives the answer away)');
      if (id === 'b_win') { const rg = p.hasCaps() ? new Set(all.map(E.mFrom)) : ring;
        if (!all.some(m => rg.has(E.mFrom(m)) && !okS.has(m))) a('⑧ 追52: every move of the ringed pieces wins (the ring gives the answer away)'); }
      // ⑤
      for (const [who, b, o2] of pool) { if (o2 === P) continue; const e = ckDist(P.s.b, b); if (e <= 3) a(`⑤ ${e} square(s) from ${who}`); }
      // ⑥
      const d = all.length - okS.size;
      if (d < prevD) a(`⑥ easier than the problem before (${d} wrong moves after ${prevD})`); prevD = Math.max(prevD, d); if (firstD === null) firstD = d;
      if (j === st.problems.length - 1 && !(d > firstD)) a(`⑥ the last problem is no harder than problem 1 (${d} wrong moves vs ${firstD})`);
      // ⑦⑧ チェッカニ's words (3D) for every move
      let Wd; try { Wd = X.ckLsJa(E, st, P, j); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
      for (const t of [Wd.ask, Wd.hintTx]) if (!t || /\{|undefined|NaN/.test(t)) a(`⑧ the question / hint 「${t}」`);
      if (id === 'b_safe') { const h = String(Wd.hintTx);
        if (/ふさぐ/.test(h) && ![...okS].some(m => F.get(m).plug && !F.get(m).fled)) a(`⑧ 追7: the hint 「${h}」 — no right move fills the landing square`);
        if (/取り返せる形/.test(h) && ![...okS].some(m => F.get(m).trade)) a(`⑧ 追7: the hint 「${h}」 — no right move lets the capture be taken back`);
        if (/逃げた先でまた取られ/.test(h) && !all.some(m => !okS.has(m) && F.get(m).fled)) a(`⑧ 追7: the hint 「${h}」 — no wrong move runs and is taken`);
        if (Wd.hint) a('⑧ the 3D gold ring is not the answer\'s piece'); }
      if (id === 'b_win') { const h = String(Wd.hintTx), q = String(Wd.ask), fA = F.get(P.best);
        for (const t of [h, q]) { if (/動けなくする|ふさぐ/.test(t) && fA.oppLeft === 0) a(`⑧ 「${t}」 — the answer takes every piece`); if (/全部取り切れる/.test(t) && fA.oppLeft !== 0) a(`⑧ 「${t}」 — the answer leaves pieces`); }
        const want = (p.hasCaps() ? [...new Set(all.map(E.mFrom))] : null), h3 = Wd.hint ? [...Wd.hint].sort((x, y) => x - y) : null;
        if (want ? (!h3 || want.sort((x, y) => x - y).join() !== h3.join()) : h3) a(`⑧ the 3D gold ring ${h3} (with a capture on the board: every capturing piece; else the answer's piece)`); }
      if (id === 'b_king') { const cr = [...new Set(all.filter(m => F.get(m).crown).map(E.mFrom))].sort((x, y) => x - y), h3 = [...(Wd.hint || [])].sort((x, y) => x - y), h = String(Wd.hintTx);
        if (cr.join() !== h3.join()) a(`⑧ the 3D gold ring ${h3} is not every man that can crown ${cr}`);
        const wc = all.filter(m => F.get(m).crown && !okS.has(m)), vac = wc.filter(m => ckVac(E, F, m).length), vacK = vac.filter(m => ckVac(E, F, m).some(c => [2, 4].includes(F.get(m).after.at(E.mFrom(c)))));
        if (/もとのマスが空く|空くマス/.test(h) && !vac.length) a(`⑧ 追7: the hint 「${h}」 — no wrong crowning opens a jump through the square it leaves`);
        if (/相手のキングは後ろにも跳べる/.test(h) && !vacK.length) a(`⑧ 追7: the hint 「${h}」 — no enemy king jumps through the square left`);
        if (/取れる駒を探して/.test(h) && !all.some(m => !okS.has(m) && F.get(m).after.caps().length)) a(`⑧ the hint 「${h}」 — no wrong move leaves a capture`); }
      { const h = String(Wd.hintTx), oF = [...okS].map(m => F.get(m)), pa = E.path(p, P.best) || [];
        const turn = pa.slice(2).some((q, i) => { const [r0, c0] = E.RC[pa[i]], [r1, c1] = E.RC[pa[i + 1]], [r2, c2] = E.RC[q]; return Math.sign(r1 - r0) !== Math.sign(r2 - r1) || Math.sign(c1 - c0) !== Math.sign(c2 - c1); });
        if (/盤の端/.test(h) && !oF.some(f => f.edge)) a(`⑧ 追7: the hint 「${h}」 — no right move goes to the edge`);
        if (/後ろに味方/.test(h) && !oF.some(f => f.near && f.blocked)) a(`⑧ 追7: the hint 「${h}」 — no right move is blocked behind`);
        if (/離れたマス/.test(h) && !oF.some(f => !f.near && !f.edge)) a(`⑧ 追7: the hint 「${h}」 — no right move away from the enemy`);
        if (/向きを変えて/.test(h) && !turn) a(`⑧ 追7: the hint 「${h}」 — the answer's jumps do not turn`); }
      for (const m of all) { const f = F.get(m);
        if (okS.has(m)) { const g = plain(Wd.good(m));
          if (!g || /\{|undefined|NaN/.test(g)) { a(`⑧ the praise of ${nm(m)} 「${g}」`); continue; }
          if (id === 'b_move') { if (/端/.test(g) && !f.edge) a(`⑧ ${nm(m)} 「${g}」: not on the edge`);
            if (/ふさが|埋まって|背中のマス|着地するマスがない|跳ぶ先のマス/.test(g) && !(f.near && f.blocked)) a(`⑧ ${nm(m)} 「${g}」: no filled square behind an enemy`);
            if (/いなくて|いないから|心配がない|危ない駒がいない|届く相手の駒がない/.test(g) && f.near && !/端/.test(g)) a(`⑧ ${nm(m)} 「${g}」: an enemy piece is next to it`); }
          if (id === 'b_jump') { const n = g.match(/(\d+)枚まるまる/); if (n && +n[1] !== f.net) a(`⑧ ${nm(m)} 「${g}」: net ${f.net}`); if (/まわりに危険がない/.test(g) && f.near) a(`⑧ ${nm(m)} 「${g}」: an enemy next to the landing square`); }
          if (id === 'b_multi') { const n = g.match(/(\d+)枚/); if (!n || +n[1] !== f.capN) a(`⑧ ${nm(m)} 「${g}」: takes ${f.capN}`); }
          if (id === 'b_king' && (!f.crown || f.after.caps().length || f.oppShot > 0)) a(`⑧ ${nm(m)} 「${g}」: does not crown safely`);
          if (id === 'b_safe') { if (/逃/.test(g) && !f.fled) a(`⑧ ${nm(m)} 「${g}」: the threatened piece does not run`);
            if (/ふさ|うめ|着地するマスがなく/.test(g) && !(f.plug && !f.fled)) a(`⑧ ${nm(m)} 「${g}」: the landing square is not filled`);
            if (/取り返|お返し|取り戻/.test(g) && !f.trade) a(`⑧ ${nm(m)} 「${g}」: no capture to take back`); }
          if (id === 'b_win') { if (/取り切|最後の駒まで|駒がひとつも残らない|いなくなる|まとめて取/.test(g) ? f.oppLeft !== 0 : !(f.oppLeft > 0 && f.oppN === 0)) a(`⑧ ${nm(m)} 「${g}」: pieces left ${f.oppLeft}, moves ${f.oppN}`); }
          continue; }
        const raw = plain(Wd.ng(m)), i0 = raw.indexOf('赤い矢印の手'), t = i0 >= 0 ? raw.slice(i0) : '';
        if (!t) { a(`⑦ ${nm(m)}: the words do not name the move 「${raw}」`); continue; }
        if (/\{|undefined|NaN/.test(raw)) a(`⑧ ${nm(m)}: 「${raw}」`);
        if (id === 'b_move' && !new RegExp(`${-f.net}枚(タダで取られ|の損)|タダで${-f.net}枚`).test(t)) a(`⑦ ${nm(m)} gives ${-f.net} away, the words: 「${t}」`);
        if (id === 'b_jump' && !(f.net < 0 ? (f.crown ? /(キングになった|王冠をかぶった|成った駒を).*(取られ|跳び越え)/ : /かえって損|差し引きで損|駒ごと取り返されて損/) : /取り返され/).test(t)) a(`⑦ ${nm(m)} (net ${f.net}), the words: 「${t}」`);
        if (id === 'b_multi' && !new RegExp(`${f.capN}枚(しか|だけ|どまり)`).test(t)) a(`⑦ ${nm(m)} takes ${f.capN}, the words: 「${t}」`);
        if (id === 'b_safe' && !(new RegExp(`${-f.net}枚`).test(t) && /取られ|跳び越え/.test(t))) a(`⑦ ${nm(m)} gives ${-f.net} away, the words: 「${t}」`);
        if (id === 'b_win') { const n = t.match(/(\d+)通り/); if (f.win || (n ? +n[1] !== f.oppN : !/まだ動けちゃう|勝負がつかない|勝ちを見のがし|決着が先/.test(t))) a(`⑦ ${nm(m)} leaves ${f.oppN} moves, the words: 「${t}」`); }
        if (id === 'b_king') {
          if (/成った駒を|直後に取られ|とたん取られ|キングを取られ/.test(t)) a(`⑦ ${nm(m)}: 「${t}」 — the crowned man on the far row cannot be jumped`);
          if (!f.crown && !/キングになれない|王冠のチャンスを逃|マンのまま/.test(t)) a(`⑦ ${nm(m)} does not crown, the words: 「${t}」`);
          if (f.crown && f.net < 0 && !new RegExp(`ほかの駒を${-f.net}枚`).test(t)) a(`⑦ ${nm(m)} crowns and gives ${-f.net} away, the words: 「${t}」`);
          if (f.crown && f.net >= 0 && !(f.oppShot > 0 && /ショット|捨て駒/.test(t))) a(`⑦ ${nm(m)} crowns (net ${f.net}, shot ${f.oppShot}), the words: 「${t}」`); } }
    });
    // the warm-ups
    (st.ramp || []).forEach((r, j) => { const a = m => add(id, -1, `warm-up ${j + 1} (${r.k}): ${m}`), p = E.Pos.from(r.s), nm = m => E.name(p, m);
      const { all, G, F, bad } = goal(E, X, p, id); bad.forEach(x => a(x));
      if (r.k === 'explain') { const hl = (r.marks || []).filter(x => x[1] === 'hl').map(x => x[0] - 1), to = (r.marks || []).filter(x => x[1] === 'ok').map(x => x[0] - 1);
        const M = all.filter(m => hl.includes(E.mFrom(m)) && to.includes(E.mTo(m)));
        if (M.length !== 1) a(`① the marks are not one legal move`); else if (!G.includes(M[0])) a(`① the marked move ${nm(M[0])} does not meet the goal`);
        else { const f = F.get(M[0]);
          if (id === 'b_move' && !(f.edge || (f.near && f.blocked))) a(`⑧ 「跳び越えた先のマスがないか、ふさがっている」: ${nm(M[0])} is not on the edge nor blocked behind`);
          if (id === 'b_jump' && all.some(m => m !== M[0] && F.get(m).net !== 0)) a('⑧ 「ほかの取り方だと…得が帳消し」: a wrong capture does not come out even');
          if (id === 'b_win' && !(f.oppLeft > 0 && f.oppN === 0)) a('⑧ 「相手はもう動かせる手がありません」: the marked move does not leave the opponent\'s pieces without a move'); } }
      if (r.k === 'try') { const okS = new Set((r.ok || []).map(n => all.find(m => nm(m) === n)).filter(x => x != null));
        if (okS.size !== (r.ok || []).length) a(`① an answer is not legal (${r.ok})`);
        G.forEach(m => { if (!okS.has(m)) a(`② ${nm(m)} meets the goal but is scored wrong`); }); okS.forEach(m => { if (!G.includes(m)) a(`① ${nm(m)} does not meet the goal`); });
        if (all.length < 3) a(`③ ${all.length} legal moves`); if (okS.size * 3 > all.length) a(`③ 追72: ${okS.size} of ${all.length} moves are right`);
        const look = (r.look || []).map(q => q - 1); if (look.length && ![...okS].every(m => look.includes(E.mFrom(m)))) a('⑧ the gold ring is not on the answer\'s piece'); }
      for (const [who, b, o2] of pool) { if (o2 === r) continue; const e = ckDist(r.s.b, b); if (e <= 3 && !(who.startsWith(id + ' warm-up'))) a(`⑤ 追1: ${e} square(s) from ${who}`); }
      const T3 = ['t', 'body', 'g', 'h', 'y'].map(f => V[`ramp:${id}/${j}/${f}`] || '').join(' ');
      if (id === 'b_king') { const wc = all.filter(m => F.get(m).crown && !G.includes(m)), vk = m => ckVac(E, F, m).some(c => [2, 4].includes(F.get(m).after.at(E.mFrom(c))));
        if (/ほかのマンで成ると、空いたマスへ相手のキングが跳びこんで/.test(T3) && !(wc.length && wc.every(vk))) a('⑧ 「ほかのマンで成ると、空いたマスへ相手のキングが跳びこんで」: not every other crowning');
        if (/空くマスへ、相手のキングが跳びこめないか/.test(T3) && !wc.some(vk)) a('⑧ 「空くマスへ、相手のキングが跳びこめないか」: no such crowning'); }
      if (/\{|undefined/.test(T3)) a(`⑧ the 3D words 「${T3}」`);
    });
  });
  return out;
}
module.exports = { verify, goal, CKB_DONE };

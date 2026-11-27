// (2026-11-28 第2期 担当A) the material search for k5「両取りと駒得の手筋」, shared by shogi/tools/gen-fork.js and
// tools/lesson-verify-shfork.js. From the rules (shogi/engine.js), afresh:
//   gain(m)   = the value of the piece m takes (+ what a promotion adds); values = engine VALUE / 100 (歩 0.9 … 竜 13.95)
//   qs(p)     = captures only for the side to move (it may stand pat at 0); in check every evasion (none = mated, -1000)
//   val(p, m) = gain(m) − max over EVERY legal reply r of (gain(r) − qs(after r))   (our move, every reply, then captures only)
//   holds(p, m) = after EVERY reply the moved piece can still take one of its targets (on its square) and win it (undefended after the capture, or worth
//               more than it) — the opponent cannot save both
//   forkTargets(p, m) = what the moved piece attacks after m: the king (check), and every enemy piece it would win by taking it
//               (undefended, or worth more than the mover)
'use strict';
module.exports = function (E) {
  const T = E.typeOf, C = E.colorOf, V = t => t === 8 ? 0 : E.VALUE[t] / 100, M = 1000;
  const PROM = [0, 9, 10, 11, 12, 13, 14, 0, 0, 0, 0, 0, 0, 0, 0];
  const gain = (p, m) => { if (E.isDrop(m)) return 0; const q = p.board[E.mTo(m)], t = T(p.board[E.mFrom(m)]); return (q ? V(T(q)) : 0) + (E.mPromo(m) ? V(PROM[t]) - V(t) : 0); };
  function qs(p, a, b, d) {
    const chk = p.inCheck(); let ms = p.legalMoves(true), best;
    if (chk) { if (!ms.length) return -M; best = -M; }
    else { best = 0; if (best >= b) return best; if (best > a) a = best; if (d <= 0) return best; ms = ms.filter(m => !E.isDrop(m) && p.board[E.mTo(m)]); }
    if (d <= 0 && chk) return 0;
    ms.sort((x, y) => gain(p, y) - gain(p, x));
    for (const m of ms) { const g = gain(p, m); p.doMove(m); const v = g - qs(p, -b + g, -a + g, d - 1); p.undoMove(); if (v > best) { best = v; if (v > a) a = v; if (a >= b) break; } }
    return best;
  }
  const Q = p => qs(p, -M - 1, M + 1, 8);
  // the reply side's best (gain(r) − qs): the reply itself and the value. stopAt: enough to know val ≤ gain − stopAt.
  function reply(p, stopAt) {
    const rs = p.legalMoves(true); if (!rs.length) return { r: null, v: p.inCheck() ? -M : 0 };
    rs.sort((x, y) => gain(p, y) - gain(p, x));
    let best = -M - 1, br = null;
    for (const r of rs) { const g = gain(p, r); p.doMove(r); const v = g - qs(p, -M - 1, best < -M ? M + 1 : g - best + 1e-6, 8); p.undoMove(); if (v > best) { best = v; br = r; if (stopAt != null && best >= stopAt) break; } }   // (a window: only a reply better than the best so far is searched exactly)
    return { r: br, v: best };
  }
  function val(p, m, floor) {   // floor: stop once val ≤ floor is certain
    const g = gain(p, m); p.doMove(m); const R = reply(p, floor == null ? null : g - floor); const out = { v: g - R.v, r: R.r == null ? null : p.toUsi(R.r), rt: R.r == null || E.isDrop(R.r) ? 0 : T(p.board[E.mTo(R.r)]) }; p.undoMove(); return out;
  }
  function forkTargets(p, m) {
    const us = p.side, to = E.mTo(m), tv = E.isDrop(m) ? E.dropType(m) : (E.mPromo(m) ? PROM[T(p.board[E.mFrom(m)])] : T(p.board[E.mFrom(m)]));
    p.doMove(m); const o = [];
    for (let s = 0; s < 81; s++) { const q = p.board[s]; if (!q || C(q) === us) continue;
      if (!p.attackers(s, us).includes(to)) continue;
      const t = T(q); if (t === 8) { o.push([s, 8]); continue; }
      const def = p.attackers(s, us ^ 1).length > 0; if (!def || V(t) > V(tv)) o.push([s, t]); }
    p.undoMove(); return o;
  }
  // after every reply, the moved piece still takes an enemy piece it wins (undefended, or worth more) — 「両方は守れない」
  function holds(p, m) {   // only the targets' own squares (the same piece still there), never the king
    const us = p.side, to = E.mTo(m), tg = forkTargets(p, m).filter(x => x[1] !== 8); p.doMove(m); const keep = tg.map(([s]) => p.board[s]); let ok = tg.length > 0, bad = null;
    for (const r of p.legalMoves(true)) { if (!ok) break; p.doMove(r);
      const q = p.board[to], tv = q && C(q) === us ? T(q) : 0;
      const hit = tv && p.legalMoves(true).some(y => { if (E.isDrop(y) || E.mFrom(y) !== to) return false; const k = tg.findIndex(([s]) => s === E.mTo(y)); if (k < 0 || p.board[E.mTo(y)] !== keep[k]) return false;
        const zt = T(keep[k]); p.doMove(y); const def = p.attackers(E.mTo(y), us ^ 1).length > 0; p.undoMove(); return !def || V(zt) > V(tv); });
      p.undoMove(); if (!hit) { ok = false; bad = p.toUsi(r); } }
    p.undoMove(); return { ok, bad };
  }
  const sqU = s => `${E.sqFile(s)}${String.fromCharCode(96 + E.sqRank(s))}`;
  function mateIn1(p) { for (const m of p.legalMoves(true)) { p.doMove(m); const v = p.inCheck() && !p.legalMoves(true).length; p.undoMove(); if (v) return true; } return false; }
  // a real fork: two pieces worth a lance or more, or the king and a piece worth a knight or more
  const real = tg => { const nk = tg.filter(x => x[1] !== 8).map(x => V(x[1])), ck = tg.some(x => x[1] === 8); return ck ? nk.some(v => v >= 4.05) : nk.filter(v => v >= 3.15).length >= 2; };
  function study(p, opt = {}) {
    if (p.inCheck()) return null;
    const ms = p.legalMoves(true); if (ms.length < (opt.minLegal || 20)) return null;
    const fk = ms.map(m => [m, forkTargets(p, m)]).filter(x => x[1].length >= 2);   // (the cheap filters first: a real fork, then no capture / threat / mate now)
    if (!fk.some(x => real(x[1]))) return null;
    if (Q(p) > 0.95) return null;
    p.doNull(); const qo = p.inCheck() ? 99 : Q(p); p.undoNull(); if (qo > 0.95) return null;
    const good = []; for (const [m, tg] of fk) { const r = val(p, m); if (r.v >= 2.5) good.push([m, tg, r]); }
    if (good.length !== 1 || good[0][2].v >= 500 || !real(good[0][1]) || !holds(p, good[0][0]).ok) return null;
    p.doNull(); const mo = mateIn1(p); p.undoNull(); if (mo || mateIn1(p)) return null;
    const [a, tg, ra] = good[0];
    let second = -M; const rep = {};
    for (const m of ms) { if (m === a) continue; const r = val(p, m, 0.95); if (r.v > 0.95) return null; second = Math.max(second, r.v); }
    let m3 = null; try { m3 = E.solveMate(p, 3, 200000); } catch (e) {} if (m3 && m3.mate) return null;
    p.doMove(a); let o3 = null; try { o3 = E.solveMate(p, 3, 200000); } catch (e) {} p.undoMove(); if (o3 && o3.mate) return null;
    const au = p.toUsi(a);
    return { sfen: p.sfen(), ans: au, val: +ra.v.toFixed(2), second: +second.toFixed(2), targets: tg.map(([s, t]) => [sqU(s), t]), check: tg.some(x => x[1] === 8), drop: E.isDrop(a), mover: E.isDrop(a) ? E.dropType(a) : T(p.board[E.mFrom(a)]), legal: ms.length };
  }
  return { real, holds, gain, qs: Q, reply, val, forkTargets, study, sqU, V, M };
};

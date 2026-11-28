// (2026-11-28 第2期 担当A) candidates for the chess tactics lessons「ただの駒を取る」capture・「狙われた駒を守る」escape — random sparse
// boards that pass the strict checks of tools/lesson-verify-chbasic.js (one answer by the material search and the site's engine).
// usage: node chess/tools/gen_tactic.js <capture|escape> <spec> [count] [seed]   spec: white pieces / black pieces, e.g. "Q,N,P,P/r,b,n,p,p"
'use strict';
const path = require('path');
const V = require(path.join(__dirname, '../../tools/lesson-verify-chbasic.js'));
const Lb = V.lib(), { E } = Lb;
const [sid, spec, cnt = '5', seed0 = '1'] = process.argv.slice(2);
let seed = +seed0 >>> 0 || 1; const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed % n; };
const [ws, bs] = spec.split('/').map(x => x ? x.split(',').filter(Boolean) : []);
const pool = V.pool(Lb, (s) => V.DONE.has(s));
function fenOf(b, side) { let f = ''; for (let r = 7; r >= 0; r--) { let e = 0; for (let c = 0; c < 8; c++) { const x = b[r * 8 + c]; if (!x) e++; else { if (e) f += e; e = 0; f += x; } } if (e) f += e; if (r) f += '/'; } return f + ' ' + side + ' - - 0 1'; }
const W = process.env.ENG !== '0' ? require('./wasm.js') : null;
const found = []; const want = +cnt;
for (let it = 0; it < 3e6 && found.length < want; it++) {
  const b = Array(64).fill(''); const put = (ch) => { for (;;) { const i = rnd(64); if (b[i]) continue; if (/p/i.test(ch) && ((i >> 3) === 0 || (i >> 3) === 7)) continue; b[i] = ch; return i; } };
  put('K'); put('k'); ws.forEach(c => put(c.toUpperCase())); bs.forEach(c => put(c.toLowerCase()));
  if (b.some((c, i) => (c === 'p' && (i >> 3) === 1) || (c === 'P' && (i >> 3) === 6))) continue;   // (no pawn one step from promoting: the lesson is not about promotion)
  const K = b.indexOf('K'), k = b.indexOf('k'); if (Math.max(Math.abs((K >> 3) - (k >> 3)), Math.abs((K & 7) - (k & 7))) < 2) continue;
  const fen = fenOf(b, 'w'); let p; try { p = E.Pos.fromFEN(fen); } catch (e) { continue; }
  if (p.inCheck()) continue; { const z = E.Pos.fromFEN(fen); z.side ^= 1; if (z.inCheck()) continue; }
  const legal = p.legal().map(m => p.uci(m)); if (legal.length < 8) continue;
  const m0 = Lb.mat(p, 0), hgOp = V.hanging(Lb, fen, 1), hgMe = V.hanging(Lb, fen, 0);
  let keep = null; const K3 = () => keep || (keep = Object.fromEntries(legal.map(u => [u, Lb.keep(fen, u)])));
  let ans, d;
  if (sid === 'capture') {
    if (hgOp.length < 2 || hgMe.length) continue;
    const caps = legal.filter(u => p.b[E.sqOf(u.slice(2, 4))]); if (caps.length < 3) continue;
    const kp = K3(), mx = Math.max(...legal.map(u => kp[u])), right = legal.filter(u => kp[u] === mx);
    if (right.length !== 1 || mx < m0 + 2) continue; ans = right[0]; if ((p.b[E.sqOf(ans.slice(0, 2))] & 7) === 6) continue;
    if (process.env.DEFD && !Lb.after(fen, ans).legal().some(m => (m >> 7 & 127) === E.sqOf(ans.slice(2, 4)))) continue;   // (DEFD=1: a defended piece worth more than the taker)
    if (legal.some(u => u !== ans && kp[u] > mx - 2)) continue;
    if (!hgOp.includes(ans.slice(2, 4))) continue;
    if (legal.some(u => u !== ans && u.slice(2, 4) === ans.slice(2, 4))) continue;   // (one piece can take it: the words name the target, not the taker)
    if (hgOp.some(s => !legal.some(u => u.slice(2, 4) === s && kp[u] >= m0))) continue;   // (2D hint: the red frames can be taken without a loss)
    d = legal.length;
  } else {
    if (hgOp.length || hgMe.length !== 1) continue; const s0 = hgMe[0]; if ((p.b[E.sqOf(s0)] & 7) === 1) continue;
    const own = legal.filter(u => u.slice(0, 2) === s0); if (own.length < 4) continue;
    const kp = K3(), right = legal.filter(u => kp[u] >= m0); if (right.length !== 1) continue; ans = right[0];
    if (ans.slice(0, 2) !== s0) continue; if (legal.some(u => u !== ans && kp[u] > m0 - 2)) continue;
    d = legal.length;
  }
  const B = Lb.brd(fen); if (pool.some(([, x]) => Lb.near(B, x)) || found.some(f => Lb.near(B, Lb.brd(f.fen)))) continue;
  if (W) { let bad = false; for (const n of [2e5, 8e5]) { const R = W.analyze(fen, [], n); if (R[0].uci !== ans || (R[1] && R[0].v - R[1].v < 150) || Math.abs(R[0].v) > 20000) bad = true;
      // (= CHESS.points: every other move under 16 — the win chance must not be saturated)
      const wp = v => 1 / (1 + Math.pow(10, -v / 400)); if (!bad && R.slice(1).some(e => Math.round(20 * (1 - (wp(R[0].v) - wp(e.v)) / .45)) >= 16)) bad = true; } if (bad) continue; }
  const F = V.words3d(() => 0).X.chLsF(fen, ans);
  found.push({ fen, ans, d, pc: F.pc, cap: F.cap, taken: F.taken, marks: (sid === 'capture' ? hgOp : hgMe).length });
  console.log(JSON.stringify(found[found.length - 1]));
}

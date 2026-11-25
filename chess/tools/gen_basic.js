// (2026-11-26 第2期 担当A) candidates for「はじめてのチェス」b_check・b_escape・b_mate — random sparse boards that pass the strict
// checks of tools/lesson-verify-chbasic.js (one answer, enough wrong moves, the words true on the board).
// usage: node chess/tools/gen_basic.js <b_check|b_escape|b_mate> <spec> [count] [seed]
//   spec: white pieces besides the king / black pieces besides the king, e.g. "R,N/p" ; the first white piece moves (b_check, b_mate)
'use strict';
const path = require('path');
const V = require(path.join(__dirname, '../../tools/lesson-verify-chbasic.js'));
const Lb = V.lib(), { E } = Lb;
const [sid, spec, cnt = '5', seed0 = '1'] = process.argv.slice(2);
let seed = +seed0 >>> 0 || 1; const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed % n; };
const [ws, bs] = spec.split('/').map(x => x ? x.split(',').filter(Boolean) : []);
const pool = V.pool(Lb, (s) => V.DONE.has(s));
const sqn = i => 'abcdefgh'[i & 7] + ((i >> 3) + 1);
function fenOf(b, side) { let f = ''; for (let r = 7; r >= 0; r--) { let e = 0; for (let c = 0; c < 8; c++) { const x = b[r * 8 + c]; if (!x) e++; else { if (e) f += e; e = 0; f += x; } } if (e) f += e; if (r) f += '/'; } return f + ' ' + side + ' - - 0 1'; }
const found = []; const want = +cnt;
for (let it = 0; it < 4e6 && found.length < want; it++) {
  const b = Array(64).fill(''); const put = (ch) => { for (;;) { const i = rnd(64); if (b[i]) continue; if (/p/i.test(ch) && ((i >> 3) === 0 || (i >> 3) === 7)) continue; b[i] = ch; return i; } };
  put('K'); put('k'); ws.forEach(c => put(c.toUpperCase())); bs.forEach(c => put(c.toLowerCase()));
  // kings apart
  const K = b.indexOf('K'), k = b.indexOf('k'); if (Math.max(Math.abs((K >> 3) - (k >> 3)), Math.abs((K & 7) - (k & 7))) < 2) continue;
  const fen = fenOf(b, 'w'); let p; try { p = E.Pos.fromFEN(fen); } catch (e) { continue; }
  { const z = E.Pos.fromFEN(fen); z.side ^= 1; if (z.inCheck()) continue; }
  if (p.inCheck() !== (sid === 'b_escape')) continue;
  const legal = p.legal().map(m => p.uci(m)); if (legal.length < 3) continue;
  const chk = legal.filter(u => Lb.after(fen, u).inCheck());
  let ans, d;
  if (sid === 'b_check') {
    if (chk.length !== 1) continue; ans = chk[0]; const from = E.sqOf(ans.slice(0, 2)); if ('pnbrqk'[(p.b[from] & 7) - 1] !== ws[0].toLowerCase()) continue;
    const own = legal.filter(u => p.b[E.sqOf(u.slice(0, 2))] % 8 === p.b[from] % 8); if (own.length < 4 || legal.length < 6) continue; d = legal.length;
  } else if (sid === 'b_mate') {
    const mate = chk.filter(u => !Lb.after(fen, u).hasLegal()); if (mate.length !== 1 || chk.length < 3) continue; ans = mate[0];
    if ('pnbrqk'[(p.b[E.sqOf(ans.slice(0, 2))] & 7) - 1] !== ws[0].toLowerCase()) continue; d = chk.length - 1;
    if (process.env.SMOTHER) { const kq = b.indexOf('k'); let ok = true; for (let dr = -1; dr <= 1; dr++) for (let df = -1; df <= 1; df++) { const r = (kq >> 3) + dr, f = (kq & 7) + df; if ((dr || df) && r >= 0 && r < 8 && f >= 0 && f < 8 && !(b[r * 8 + f] && b[r * 8 + f] === b[r * 8 + f].toLowerCase())) ok = false; } if (!ok) continue; }
  } else {
    const m0 = Lb.mat(p, 0), right = legal.filter(u => Lb.keep(fen, u) >= m0); if (right.length !== 1) continue; ans = right[0];
    if (legal.some(u => u !== ans && m0 - Lb.keep(fen, u) < 2)) continue;   // (every wrong move loses a minor piece or more)
    d = legal.length;
    const ck = []; for (let s = 0; s < 64; s++) { const c = b[s]; if (!c || c !== c.toLowerCase() || c === 'k') continue; const z = E.Pos.fromFEN(fen); for (let s2 = 0; s2 < 64; s2++) if (s2 !== s && b[s2] && b[s2] === b[s2].toLowerCase() && b[s2] !== 'k') z.b[E.sqOf(sqn(s2))] = 0; if (z.inCheck()) ck.push(sqn(s)); }
    if (ck.length !== 1) continue;
    const kind = u => u.slice(2, 4) === ck[0] ? 'take' : u.slice(0, 2) === sqn(K) ? 'run' : 'block', kA = kind(ans);
    if (process.env.KIND && kA !== process.env.KIND) continue;
    if (kA !== 'take' && legal.some(u => kind(u) === 'take')) continue;   // (追45: the 2D hint「取れるなら取るのがいちばん」)
    const marked = legal.filter(u => kind(u) !== 'block'); if (marked.length - (kind(ans) !== 'block' ? 1 : 0) < 3 || (kind(ans) !== 'block' && 2 > marked.length)) continue;
    if (process.env.ENG) { const R = require('./wasm.js').analyze(fen, [], 2e5); if (R[0].uci !== ans || (R[1] && R[0].v - R[1].v < 250) || Math.abs(R[0].v) > 20000) continue; }
    if (kA === 'run' && b[E.sqOf(ans.slice(2, 4)) >> 4 << 3 | (E.sqOf(ans.slice(2, 4)) & 7)]) continue;   // (a run is a quiet king move)
    if (kA === 'take' && p.b[E.sqOf(ans.slice(0, 2))] % 8 === 6) continue;   // (the king does not take: 「逃げる」の文と混ざらない)
    found.kind = kA;
  }
  const B = Lb.brd(fen); if (pool.some(([, x]) => Lb.near(B, x))) continue;
  found.push({ fen, ans, d, legal: legal.length, checks: chk.length, kind: found.kind });
  console.log(JSON.stringify(found[found.length - 1]));
}

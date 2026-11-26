// (2026-11-26 第2期 担当A) xiangqi「兵の終盤」e_pawn: candidates. Random boards of our general and two soldiers across the river
// against the general with one or two advisors (red to move, nobody in check), solved by the rules alone (the solver of
// tools/lesson-verify-xqend.js: every reply, no legal move = lost): the fastest win n (2〜4) has one first move only, it forces a
// mate by check within n (追6), no other first move wins within n + 1, 8 legal moves or more. Every board is tried (shard k of K).
//   node tools/xqpawn-gen.js <k> <K> --out <file>
'use strict';
const fs = require('fs'), path = require('path'), E = require(path.join(__dirname, '../xiangqi/engine.js')), { solver } = require('./lesson-verify-xqend.js');
const a = process.argv.slice(2), SH = +a[0] || 0, NS = +a[1] || 1, out = a[a.indexOf('--out') + 1];
const RP = [66, 67, 68, 75, 76, 77, 84, 85, 86], BP = [3, 4, 5, 12, 13, 14, 21, 22, 23], AD = [3, 5, 13, 21, 23];
const fen = b => { const R = []; for (let r = 0; r < 10; r++) { let s = '', e = 0; for (let c = 0; c < 9; c++) { const x = b[r * 9 + c]; if (!x) { e++; continue; } if (e) { s += e; e = 0; } s += x; } if (e) s += e; R.push(s); } return R.join('/') + ' w'; };
const ADS = []; for (let i = 0; i < 5; i++) { ADS.push([AD[i]]); for (let j = i + 1; j < 5; j++) ADS.push([AD[i], AD[j]]); }
const res = [], seen = new Set(); let t = 0, N = 0;
for (const rk of RP) for (const bk of BP) for (const ad of ADS) for (let p1 = 0; p1 < 45; p1++) for (let p2 = p1 + 1; p2 < 45; p2++) {
  if ((t++ % NS) !== SH) continue; N++;
  const b = Array(90).fill(null), put = (s, x) => { if (b[s]) return false; b[s] = x; return true; };
  put(rk, 'K'); if (!put(bk, 'k')) continue; let ok = true; for (const x of ad) ok = put(x, 'a') && ok; if (!ok) continue;
  if (!put(p1, 'P') || !put(p2, 'P')) continue;
  const s = fen(b); if (seen.has(s)) continue; seen.add(s);
  let p; try { p = E.Pos.from(s); } catch (e) { continue; }
  if (p.inCheck()) continue; { const q = p.clone(); q.side ^= 1; if (q.inCheck()) continue; }
  const L = p.moves(); if (L.length < 8) continue;
  const S = solver(E), F = S.fastest(p, 4); if (F.n < 2 || F.W.length !== 1) continue; const A = F.W[0];
  if (!S.forces(p, A, F.n, true)) continue;
  if (L.some(m => m !== A && S.forces(p, m, F.n + 1, false))) continue;
  const z = p.clone().play(A), T = E.typeOf(p.at(E.mFrom(A)));
  res.push({ s, best: A, iccs: E.name(p, A, 'iccs'), n: F.n, chk: z.inCheck(), ty: T, dir: T === E.PAWN ? (E.mFrom(A) % 9 === E.mTo(A) % 9 ? 'file' : 'rank') : '', legal: L.length,
    checks: L.filter(m => m !== A && p.clone().play(m).inCheck()).length });
  if (out && res.length % 5 === 0) fs.writeFileSync(out, JSON.stringify(res));
}
if (out) fs.writeFileSync(out, JSON.stringify(res)); console.error(`${N} tried, ${res.length} kept`);

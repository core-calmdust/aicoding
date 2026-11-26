'use strict';
// (2026-11-26 第2期 担当A) the maker of t_tuichi problems: the king inside, one edge line empty from corner to corner where he can land
// (k squares from the nearer corner), random pieces around; kept when tools/lesson-verify-tftuichi.js finds no fault, the answers' shape
// (tuichiSig) is as asked and d (the king's wrong moves that open just one line) is as asked.   node tafl/tools/mk-tuichi.js <sig> <d> [seed]
const path = require('path'), E = require(path.join(__dirname, '../engine.js')), { tuichiFacts, tuichiSig } = require(path.join(__dirname, '../../tools/lesson-verify-tftuichi.js'));
const [SG, DW, SEED] = process.argv.slice(2), n = 11, dW = +DW, k = +SG.split(',')[0];
let s = +(SEED || 1); const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }, ri = q => Math.floor(rnd() * q);
const SYM = [(r, c) => [r, c], (r, c) => [r, 10 - c], (r, c) => [10 - r, c], (r, c) => [10 - r, 10 - c], (r, c) => [c, r], (r, c) => [c, 10 - r], (r, c) => [10 - c, r], (r, c) => [10 - c, 10 - r]];
for (let tries = 0; tries < 300000; tries++) {
  const b = Array(n * n).fill('.'), C = (r, c) => (r === 0 || r === 10) && (c === 0 || c === 10), set = (r, c, x) => { if (r < 0 || c < 0 || r >= n || c >= n || C(r, c) || (r === 5 && c === 5)) return false; const i = r * n + c; if (b[i] !== '.') return false; b[i] = x; return true; };
  // the king on column k (or 10-k), rows 2..8; row 0 stays empty (the line), the column above him empty
  const c = rnd() < 0.5 ? k : 10 - k, kr = 2 + ri(7); if (kr === 5 && c === 5) continue; set(kr, c, 'k');
  const na = 6 + ri(10), nd = 2 + ri(6);
  for (let q = 0; q < na; q++) { const r = 1 + ri(10), cc = ri(n); if (cc === c && r < kr) continue; set(r, cc, 'a'); }
  for (let q = 0; q < nd; q++) { const r = 1 + ri(10), cc = ri(n); if (cc === c && r < kr) continue; set(r, cc, 'd'); }
  const S = SYM[ri(8)], b2 = Array(n * n).fill('.'); for (let i = 0; i < n * n; i++) { const [r, cc] = S(Math.floor(i / n), i % n); b2[r * n + cc] = b[i]; }
  const P = { s: { v: 'copenhagen', b: b2.join(''), side: 2 } };
  let f; try { f = tuichiFacts(E, Object.assign({}, P, { ok: [], best: -1 })); } catch (e) { continue; }
  if (!f.goal.length) continue;
  P.ok = f.goal.slice(); P.best = P.ok[0];
  if (tuichiSig(E, P) !== SG) continue;
  const g = tuichiFacts(E, P); if (g.bad.length || g.d !== dW) continue;
  console.log(JSON.stringify(P)); console.error(SG, 'd', g.d, 'kd', g.kd, 'legal', g.all.length, 'tries', tries, P.ok.map(m => E.name(g.p, m)).join(' '));
  process.exit(0);
}
console.error('none'); process.exit(1);

'use strict';
// (2026-11-25 第2期 担当A) the maker of t_shield problems: a shield wall on an edge (the taken count, the other end a corner / a piece, the
// way in along / across the edge, the king in the wall or not) and random pieces around, kept when tools/lesson-verify-tfshield.js finds no
// fault and d (the wrong moves that take one) is as asked.   node tafl/tools/mk-shield.js <taken> <corner|piece> <along|across> <king|-> <d> [seed]
const path = require('path'), E = require(path.join(__dirname, '../engine.js')), { shieldFacts } = require(path.join(__dirname, '../../tools/lesson-verify-tfshield.js'));
const [K, END, DIR, KING, DW, SEED] = process.argv.slice(2), n = 11, want = +K, dW = +DW;
let s = +(SEED || 1); const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }, ri = k => Math.floor(rnd() * k);
const SYM = [(r, c) => [r, c], (r, c) => [r, 10 - c], (r, c) => [10 - r, c], (r, c) => [10 - r, 10 - c], (r, c) => [c, r], (r, c) => [c, 10 - r], (r, c) => [10 - c, r], (r, c) => [10 - c, 10 - r]];
for (let tries = 0; tries < 400000; tries++) {
  const b = Array(n * n).fill('.'), set = (r, c, x) => { if (r < 0 || c < 0 || r >= n || c >= n) return false; const i = r * n + c; if (b[i] !== '.') return false; b[i] = x; return true; };
  const len = want + (KING === 'king' ? 1 : 0);
  // the wall on row 0, from column s0 to s0+len-1; the closed end on the left (col s0-1), the lid on the right (col s0+len)
  const s0 = END === 'corner' ? 1 : 1 + ri(n - len - 3); if (s0 + len > n - 2) continue;
  const kAt = KING === 'king' ? s0 + 1 + ri(len - 2 > 0 ? len - 2 : 1) : -1;
  for (let c = s0; c < s0 + len; c++) { set(0, c, c === kAt ? 'k' : 'd'); set(1, c, 'a'); }
  if (END === 'piece') set(0, s0 - 1, 'a');
  const lid = s0 + len;
  if (DIR === 'along') { const c = lid + 1 + ri(n - 2 - lid); if (c >= n - 1 || !set(0, c, 'a')) continue; }
  else { const r = 2 + ri(8); if (!set(r, lid, 'a')) continue; }
  if (KING !== 'king') { let ok = false; for (let k = 0; k < 20 && !ok; k++) { const r = 2 + ri(7), c = 2 + ri(7); if (r === 5 && c === 5) continue; ok = set(r, c, 'k'); } if (!ok) continue; }
  const na = 5 + ri(8), nd = 3 + ri(6);
  for (let k = 0; k < na; k++) { const r = ri(n), c = ri(n); if ((r === 0 || r === 10) && (c === 0 || c === 10)) continue; if (r === 5 && c === 5) continue; set(r, c, 'a'); }
  for (let k = 0; k < nd; k++) { const r = ri(n), c = ri(n); if ((r === 0 || r === 10) && (c === 0 || c === 10)) continue; if (r === 5 && c === 5) continue; set(r, c, 'd'); }
  const S = SYM[ri(8)], b2 = Array(n * n).fill('.'); for (let i = 0; i < n * n; i++) { const [r, c] = S(Math.floor(i / n), i % n); b2[r * n + c] = b[i]; }
  const P = { s: { v: 'copenhagen', b: b2.join(''), side: 1 } };
  let f; try { f = shieldFacts(E, Object.assign({}, P, { ok: [], best: -1 })); } catch (e) { continue; }
  if (f.max !== want || !f.goal.length) continue;
  P.ok = f.goal.slice(); P.best = P.ok[0];
  const g = shieldFacts(E, P); if (g.bad.length || g.d !== dW) continue;
  if (`${want}/${END}/${DIR}/${KING === 'king' ? 'king' : '-'}` !== g.sig) continue;
  if (P.ok.length > 1) continue;
  console.log(JSON.stringify(P)); console.error(g.sig, 'd', g.d, 'legal', g.all.length, 'tries', tries, P.ok.map(m => E.name(g.p, m)).join(' '));
  process.exit(0);
}
console.error('none'); process.exit(1);

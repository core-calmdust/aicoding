'use strict';
// (2026-11-27 第2期 担当A) the maker of s_breakout problems: the king on the top edge, an own man between him and one corner (the way to
// open), on the other side a man or an attacker, random pieces around; turned by one of the 8 symmetries; kept when
// tools/lesson-verify-tfbreak.js finds no fault. Prints one JSON per line: { P, d, sig, legal }.   node tafl/tools/mk-break.js <count> [seed]
const path = require('path'), E = require(path.join(__dirname, '../engine.js')), { breakFacts, breakSig } = require(path.join(__dirname, '../../tools/lesson-verify-tfbreak.js'));
const [CNT, SEED] = process.argv.slice(2), n = 11;
let s = (+(SEED || 1) * 2654435761) >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }, ri = q => Math.floor(rnd() * q);   // (mulberry32)
const SYM = [(r, c) => [r, c], (r, c) => [r, 10 - c], (r, c) => [10 - r, c], (r, c) => [10 - r, 10 - c], (r, c) => [c, r], (r, c) => [c, 10 - r], (r, c) => [10 - c, r], (r, c) => [10 - c, 10 - r]];
let got = 0; const stat = { q: 0 };
for (let tries = 0; tries < +(process.env.TRIES || 3000000) && got < +CNT; tries++) {
  const b = Array(n * n).fill('.'), C = (r, c) => (r === 0 || r === 10) && (c === 0 || c === 10), set = (r, c, x) => { if (r < 0 || c < 0 || r >= n || c >= n || C(r, c) || (r === 5 && c === 5)) return false; const i = r * n + c; if (b[i] !== '.') return false; b[i] = x; return true; };
  const kc = 2 + ri(7); set(0, kc, 'k');
  const a = 1 + ri(kc - 1); set(0, a, 'd');   // the way to open: toward a1's corner (0,0)
  const bb = kc + 1 + ri(9 - kc); set(0, bb, rnd() < 0.6 ? 'd' : 'a');   // the other side
  if (rnd() < 0.5) set(1, a, 'a');   // (the man's inward square taken: fewer inward moves)
  const na = 4 + ri(10), nd = 1 + ri(5);
  for (let q = 0; q < na; q++) set(1 + ri(10), ri(n), 'a');
  for (let q = 0; q < nd; q++) set(1 + ri(9), ri(n), 'd');
  const S = SYM[ri(8)], b2 = Array(n * n).fill('.'); for (let i = 0; i < n * n; i++) { const [r, cc] = S(Math.floor(i / n), i % n); b2[r * n + cc] = b[i]; }
  const P = { s: { v: 'copenhagen', b: b2.join(''), side: 2 } };
  try { const p = E.Pos.from(P.s); if (p.kingLines().length) continue; const F = p.G.F, k = p.king;
    const escNow = z => z.moves().some(x => E.mFrom(x) === z.king && (F[E.mTo(x)] & 2) && z.clone().play(x).res === 2);
    const quick = p.moves().filter(m => E.mFrom(m) !== k && p.clone().play(m).kingLines().length).some(m => { const q = p.clone().play(m); if (q.res) return false; return q.moves().every(r => { const z = q.clone().play(r); return !z.res && escNow(z); }); });
    if (!quick) continue; } catch (e) { continue; }
  let f; try { f = breakFacts(E, Object.assign({}, P, { ok: [], best: -1 })); } catch (e) { continue; }
  if (!f.goal.length || f.goal.length > 4) continue;
  P.ok = f.goal.slice(); P.best = P.ok[0];
  stat.q++; const g = breakFacts(E, P); if (g.bad.length) continue;
  got++; console.log(JSON.stringify({ P, d: g.d, sig: breakSig(E, P), legal: g.all.length, ring: g.ring.length }));
}
console.error('made', got, stat);

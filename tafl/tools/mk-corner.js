'use strict';
// (2026-11-27 第2期 担当A) the maker of s_corner problems: the king near one corner with no open line yet but a corner within his 2 moves,
// that corner's blockade squares (c1・b2・a3) not all filled, random pieces around, the attackers to move; kept when
// tools/lesson-verify-tfcorner.js finds no fault. Prints one JSON per line: { P, d, sig, legal }.
//   node tafl/tools/mk-corner.js <count> [seed] [min d: the blockade moves that still lose]
const path = require('path'), E = require(path.join(__dirname, '../engine.js')), { cornerFacts, cornerSig } = require(path.join(__dirname, '../../tools/lesson-verify-tfcorner.js'));
const [CNT, SEED, MIND] = process.argv.slice(2), n = 11, minD = +(MIND || 1);
let s = (+(SEED || 1) * 2654435761) >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }, ri = q => Math.floor(rnd() * q);   // (mulberry32)
const SYM = [(r, c) => [r, c], (r, c) => [r, 10 - c], (r, c) => [10 - r, c], (r, c) => [10 - r, 10 - c], (r, c) => [c, r], (r, c) => [c, 10 - r], (r, c) => [10 - c, r], (r, c) => [10 - c, 10 - r]];
let got = 0;
for (let tries = 0; tries < 3000000 && got < +CNT; tries++) {
  const b = Array(n * n).fill('.'), C = (r, c) => (r === 0 || r === 10) && (c === 0 || c === 10), set = (r, c, x) => { if (r < 0 || c < 0 || r >= n || c >= n || C(r, c) || (r === 5 && c === 5)) return false; const i = r * n + c; if (b[i] !== '.') return false; b[i] = x; return true; };
  // the corner a1 = (0,0); the king within rows / columns 1..5 of it; one or two of its blockade squares filled
  const kr = 1 + ri(5), kc = 1 + ri(5); if (kr + kc < 3 || kr + kc > 7) continue; set(kr, kc, 'k');
  const bl = [[0, 2], [1, 1], [2, 0]], keep = ri(3); bl.forEach(([r, c], q) => { if (q !== keep && rnd() < 0.45) set(r, c, 'a'); });
  // the other corners: their blockade squares filled at random
  for (const [r, c] of [[0, 8], [1, 9], [2, 10], [8, 0], [9, 1], [10, 2], [8, 10], [9, 9], [10, 8]]) if (rnd() < 0.6) set(r, c, 'a');
  const na = 3 + ri(9), nd = 1 + ri(6);
  for (let q = 0; q < na; q++) set(ri(n), ri(n), 'a');
  for (let q = 0; q < nd; q++) { const r = ri(7), cc = ri(7); set(r, cc, 'd'); }
  const S = SYM[ri(8)], b2 = Array(n * n).fill('.'); for (let i = 0; i < n * n; i++) { const [r, cc] = S(Math.floor(i / n), i % n); b2[r * n + cc] = b[i]; }
  const P = { s: { v: 'copenhagen', b: b2.join(''), side: 1 } };
  let f; try { const p = E.Pos.from(P.s); if (p.kingLines().length) continue; if (p.moves().some(m => p.clone().play(m).res)) continue;
    if (!cornerFacts(E, P, true, true).threat) continue; f = cornerFacts(E, Object.assign({}, P, { ok: [], best: -1 })); } catch (e) { continue; }
  if (!f.threat || !f.goal.length || f.goal.length > 4) continue;
  P.ok = f.goal.slice(); P.best = P.ok[0];
  const g = cornerFacts(E, P); if (g.bad.length || g.d < minD) continue;
  got++; console.log(JSON.stringify({ P, d: g.d, sig: cornerSig(E, P), legal: g.all.length, how: [...new Set(g.wrong.filter(m => g.C.get(m).blk).map(m => g.C.get(m).esc1 ? 'open' : g.C.get(m).f2.how))].join(',') }));
}
console.error('made', got);

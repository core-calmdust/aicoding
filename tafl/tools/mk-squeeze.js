'use strict';
// (2026-11-28 第2期 担当A) the maker of s_squeeze problems: the corners shut (their blockade squares mostly filled), the king inside,
// random attackers and defenders around, the attackers to move; turned by one of the 8 symmetries; kept when
// tools/lesson-verify-tfsqueeze.js finds no fault. Prints one JSON per line: { P, d, sig, legal, K0, min, second }.
//   node tafl/tools/mk-squeeze.js <count> [seed]
const path = require('path'), E = require(path.join(__dirname, '../engine.js')), S = require(path.join(__dirname, '../../tools/lesson-verify-tfsqueeze.js'));
const { BLOCK } = require(path.join(__dirname, '../../tools/lesson-verify-tfcorner.js'));
const [CNT, SEED] = process.argv.slice(2), n = 11;
let s = (+(SEED || 1) * 2654435761) >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }, ri = q => Math.floor(rnd() * q);   // (mulberry32)
const SYM = [(r, c) => [r, c], (r, c) => [r, 10 - c], (r, c) => [10 - r, c], (r, c) => [10 - r, 10 - c], (r, c) => [c, r], (r, c) => [c, 10 - r], (r, c) => [10 - c, r], (r, c) => [10 - c, 10 - r]];
let got = 0; const stat = { pre: 0, full: 0 };
for (let tries = 0; tries < +(process.env.TRIES || 2000000) && got < +CNT; tries++) {
  const b = Array(n * n).fill('.'), C = (r, c) => (r === 0 || r === 10) && (c === 0 || c === 10), set = (r, c, x) => { if (r < 0 || c < 0 || r >= n || c >= n || C(r, c) || (r === 5 && c === 5)) return false; const i = r * n + c; if (b[i] !== '.') return false; b[i] = x; return true; };
  for (const i of BLOCK.keys()) if (rnd() < 0.9) set(Math.floor(i / n), i % n, 'a');
  const kr = 1 + ri(9), kc = 1 + ri(9); if (!set(kr, kc, 'k')) continue;
  const na = 4 + ri(10), nd = 1 + ri(6), near = 2 + ri(4);
  for (let q = 0; q < near; q++) set(kr - 3 + ri(7), kc - 3 + ri(7), rnd() < 0.5 ? 'a' : 'd');
  for (let q = 0; q < na; q++) set(ri(n), ri(n), 'a');
  for (let q = 0; q < nd; q++) set(1 + ri(9), 1 + ri(9), 'd');
  const T = SYM[ri(8)], b2 = Array(n * n).fill('.'); for (let i = 0; i < n * n; i++) { const [r, cc] = T(Math.floor(i / n), i % n); b2[r * n + cc] = b[i]; }
  const P = { s: { v: 'copenhagen', b: b2.join(''), side: 1 } };
  let p; try { p = E.Pos.from(P.s); } catch (e) { continue; }
  if (p.kingLines().length) continue;
  const q0 = p.clone(); q0.turn = 2; q0.res = 0; const K0 = S.kingSq(E, q0); if (K0 < 6) continue;
  { let t = false; for (const r of q0.moves()) if (q0.clone().play(r).lastCaps.length) { t = true; break; } if (t) continue; }
  // the cheap reading first: the moves in order of the king's squares after them, safe or not, until the first safe one and the next
  const all = p.moves(); if (all.some(m => p.clone().play(m).res)) continue;
  const km = all.map(m => [m, S.kingSq(E, p.clone().play(m))]).sort((a, b) => a[1] - b[1]);
  let min = -1, cnt = 0, second = 99, nearMiss = 0, ok = []; for (const [m, k] of km) { if (min >= 0 && k > min) { const R = S.moveFacts(E, p, m); if (R.safe) { second = k; break; } continue; }
    const R = S.moveFacts(E, p, m); if (R.safe) { if (min < 0) min = k; ok.push(m); } else if (min < 0 || k <= min) nearMiss++; }
  if (min < 0 || K0 - min < 3 || second - min < 2 || ok.length > 2 || nearMiss < 1) continue;
  stat.pre++;
  if (force2Now(p)) continue;
  P.ok = ok; P.best = ok[0];
  stat.full++; const f = S.squeezeFacts(E, P); if (f.bad.length) continue;
  got++; console.log(JSON.stringify({ P, d: f.d, sig: S.squeezeSig(E, P), legal: f.all.length, K0: f.K0, min: f.min, second: f.second }));
}
function force2Now(p) { const q = p.clone(); q.turn = 2; q.res = 0; return S.force2(E, q); }
console.error('made', got, stat);

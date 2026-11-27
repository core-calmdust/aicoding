'use strict';
// (2026-11-27 第2期 担当A) the maker of t_encircle problems: a room (a blob of squares away from the edge, the throne and the corners)
// holding every defender (the king and some men), walled by attackers on its 4-way border (so the ring links corner to corner), one ring
// piece slid out along a line from its square (the gap), random attackers around, the attackers to move; kept when
// tools/lesson-verify-tfenc.js finds no fault. Prints one JSON per line.
//   node tafl/tools/mk-enc.js <count> [seed] [room size] [defenders] [min d]
const path = require('path'), E = require(path.join(__dirname, '../engine.js')), { encFacts, encSig } = require(path.join(__dirname, '../../tools/lesson-verify-tfenc.js'));
const [CNT, SEED, RS, ND, MIND] = process.argv.slice(2), n = 11, rsz = +(RS || 5), ndef = +(ND || 3), minD = +(MIND || 2);
let s = (+(SEED || 1) * 2654435761) >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }, ri = q => Math.floor(rnd() * q);
const SYM = [(r, c) => [r, c], (r, c) => [r, 10 - c], (r, c) => [10 - r, c], (r, c) => [10 - r, 10 - c], (r, c) => [c, r], (r, c) => [c, 10 - r], (r, c) => [10 - c, r], (r, c) => [10 - c, 10 - r]];
const SPECIAL = (r, c) => ((r === 0 || r === 10) && (c === 0 || c === 10)) || (r === 5 && c === 5), IN = (r, c) => r >= 0 && c >= 0 && r < n && c < n;
const D4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
let got = 0; const stat = {};
for (let tries = 0; tries < +(process.env.TRIES || 2000000) && got < +CNT; tries++) {
  const b = Array(n * n).fill('.');
  const r0 = 2 + ri(7), c0 = 2 + ri(7); if (SPECIAL(r0, c0)) continue;
  const room = new Set([r0 * n + c0]);
  for (let g = 0; g < 60 && room.size < rsz; g++) { const arr = [...room], x = arr[ri(arr.length)], [dr, dc] = D4[ri(4)], r = Math.floor(x / n) + dr, c = x % n + dc;
    if (r < 2 || c < 2 || r > 8 || c > 8 || Math.abs(r - 5) + Math.abs(c - 5) <= 1) continue; room.add(r * n + c); }
  if (room.size !== rsz) continue;
  const ring = new Set(); room.forEach(x => D4.forEach(([dr, dc]) => { const r = Math.floor(x / n) + dr, c = x % n + dc; if (!room.has(r * n + c)) ring.add(r * n + c); }));
  if ([...ring].some(w => SPECIAL(Math.floor(w / n), w % n))) continue;
  ring.forEach(w => { b[w] = 'a'; });
  const R = [...room]; for (let k = R.length - 1; k > 0; k--) { const j = ri(k + 1); [R[k], R[j]] = [R[j], R[k]]; }
  b[R[0]] = 'k'; for (let k = 1; k < ndef; k++) b[R[k]] = 'd';
  const W = [...ring], g = W[ri(W.length)], gr = Math.floor(g / n), gc = g % n; b[g] = '.';
  const dirs = D4.filter(([dr, dc]) => { const r = gr + dr, c = gc + dc; return IN(r, c) && !room.has(r * n + c) && b[r * n + c] === '.'; });
  if (!dirs.length) continue;
  const [dr, dc] = dirs[ri(dirs.length)], len = 1 + ri(5); let r = gr, c = gc, okp = true;
  for (let k = 0; k < len; k++) { r += dr; c += dc; if (!IN(r, c) || SPECIAL(r, c) || b[r * n + c] !== '.') { okp = false; break; } }
  if (!okp) continue; b[r * n + c] = 'a';
  const na = 3 + ri(9);
  for (let q = 0; q < na; q++) { const rr = ri(n), cc = ri(n), i = rr * n + cc; if (!SPECIAL(rr, cc) && b[i] === '.' && !room.has(i) && i !== g) b[i] = 'a'; }
  const S = SYM[ri(8)], b2 = Array(n * n).fill('.'); for (let i = 0; i < n * n; i++) { const [r3, c3] = S(Math.floor(i / n), i % n); b2[r3 * n + c3] = b[i]; }
  const P = { s: { v: 'copenhagen', b: b2.join(''), side: 1 } };
  let goal; try { const p = E.Pos.from(P.s); const ms = p.moves(); goal = []; let other = false;
    for (const m of ms) { const q = p.clone().play(m); if (q.res === 1 && q.why === 'encircle') goal.push(m); else if (q.res) other = true; } if (other) continue; } catch (e) { continue; }
  if (!goal.length || goal.length > 2) continue;
  P.ok = goal.slice(); P.best = P.ok[0];
  const h = encFacts(E, P); if (process.env.DBG) for (const x of h.bad) { const k = x.slice(0, 8); stat[k] = (stat[k] || 0) + 1; }
  if (h.bad.length || h.d < minD || h.gaps.size !== 1) continue;
  const why = {}; h.wrong.forEach(m => { const w = h.C.get(m).why2; why[w] = (why[w] || 0) + 1; });
  got++; console.log(JSON.stringify({ P, ans: E.name(h.p, P.ok[0]), d: h.d, sig: encSig(E, P), legal: h.all.length, diag: h.diag, why }));
}
console.error('made', got, JSON.stringify(stat));

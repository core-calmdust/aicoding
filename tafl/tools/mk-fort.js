'use strict';
// (2026-11-27 第2期 担当A) the maker of t_fort problems: the king on an edge in a small room walled by defenders (an edge fort), one wall
// piece moved out to a square in line with its gap, an attacker in line with the gap from the other side (so a wrong move lets him in),
// random pieces around, the defenders to move; kept when tools/lesson-verify-tffort.js finds no fault. Prints one JSON per line.
//   node tafl/tools/mk-fort.js <count> [seed] [room squares max] [min d]
const path = require('path'), E = require(path.join(__dirname, '../engine.js')), { fortFacts, fortSig } = require(path.join(__dirname, '../../tools/lesson-verify-tffort.js'));
const [CNT, SEED, RMAX, MIND] = process.argv.slice(2), n = 11, rmax = +(RMAX || 2), minD = +(MIND || 2);
let s = (+(SEED || 1) * 2654435761) >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }, ri = q => Math.floor(rnd() * q);
const SYM = [(r, c) => [r, c], (r, c) => [r, 10 - c], (r, c) => [10 - r, c], (r, c) => [10 - r, 10 - c], (r, c) => [c, r], (r, c) => [c, 10 - r], (r, c) => [10 - c, r], (r, c) => [10 - c, 10 - r]];
const SPECIAL = (r, c) => ((r === 0 || r === 10) && (c === 0 || c === 10)) || (r === 5 && c === 5), IN = (r, c) => r >= 0 && c >= 0 && r < n && c < n;
const D4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
let got = 0; const stat = {};
for (let tries = 0; tries < +(process.env.TRIES || 3000000) && got < +CNT; tries++) {
  const b = Array(n * n).fill('.'), at = (r, c) => b[r * n + c];
  const kc = 2 + ri(7); b[kc] = 'k';
  const room = new Set([kc]); const want = ri(rmax + 1);
  for (let g = 0; g < 20 && room.size < want + 1; g++) { const arr = [...room], x = arr[ri(arr.length)], [dr, dc] = D4[ri(4)], r = Math.floor(x / n) + dr, c = x % n + dc;
    if (!IN(r, c) || r > 2 || SPECIAL(r, c) || c < 1 || c > 9) continue; room.add(r * n + c); }
  const walls = new Set(); room.forEach(x => D4.forEach(([dr, dc]) => { const r = Math.floor(x / n) + dr, c = x % n + dc; if (IN(r, c) && !room.has(r * n + c)) walls.add(r * n + c); }));
  if ([...walls].some(w => SPECIAL(Math.floor(w / n), w % n))) continue;
  walls.forEach(w => { b[w] = 'd'; });
  // the gap: one wall square; its piece goes out along a line away from the room
  const W = [...walls], g = W[ri(W.length)], gr = Math.floor(g / n), gc = g % n; b[g] = '.';
  const dirs = D4.filter(([dr, dc]) => !room.has((gr - dr) * n + gc - dc) || true).filter(([dr, dc]) => { const r = gr + dr, c = gc + dc; return IN(r, c) && !room.has(r * n + c) && b[r * n + c] === '.'; });
  if (dirs.length < 1) continue;
  const [dr, dc] = dirs[ri(dirs.length)], len = 2 + ri(5); let r = gr, c = gc, okp = true;
  for (let k = 0; k < len; k++) { r += dr; c += dc; if (!IN(r, c) || SPECIAL(r, c) || b[r * n + c] !== '.') { okp = false; break; } }
  if (!okp) continue; b[r * n + c] = 'd';
  // an attacker in line with the gap from another side
  const odirs = dirs.filter(([a, e]) => a !== dr || e !== dc); if (!odirs.length) continue;
  { const [er, ec] = odirs[ri(odirs.length)], l2 = 2 + ri(5); let r2 = gr, c2 = gc, ok2 = true; for (let k = 0; k < l2; k++) { r2 += er; c2 += ec; if (!IN(r2, c2) || SPECIAL(r2, c2) || b[r2 * n + c2] !== '.') { ok2 = false; break; } } if (!ok2) continue; b[r2 * n + c2] = 'a'; }
  const na = 5 + ri(9), nd = ri(4);
  for (let q = 0; q < na; q++) { const rr = 1 + ri(10), cc = ri(n); if (!SPECIAL(rr, cc) && at(rr, cc) === '.' && Math.abs(rr) + Math.abs(cc - kc) > 2) b[rr * n + cc] = 'a'; }
  for (let q = 0; q < nd; q++) { const rr = 2 + ri(9), cc = ri(n); if (!SPECIAL(rr, cc) && at(rr, cc) === '.') b[rr * n + cc] = 'd'; }
  const S = SYM[ri(8)], b2 = Array(n * n).fill('.'); for (let i = 0; i < n * n; i++) { const [r3, c3] = S(Math.floor(i / n), i % n); b2[r3 * n + c3] = b[i]; }
  const P = { s: { v: 'copenhagen', b: b2.join(''), side: 2 } };
  let goal; try { const p = E.Pos.from(P.s); if (p.kingLines().length) continue; const ms = p.moves(); goal = []; let other = false;
    for (const m of ms) { const q = p.clone().play(m); if (q.res === 2 && q.why === 'fort') goal.push(m); else if (q.res) other = true; } if (other) continue; } catch (e) { continue; }
  stat.g = (stat.g || 0) + (goal.length ? 1 : 0); if (!goal.length || goal.length > 2) continue;
  P.ok = goal.slice(); P.best = P.ok[0];
  const h = fortFacts(E, P); if (process.env.DBG) for (const x of h.bad) { const k = x.slice(0, 2); stat[k] = (stat[k] || 0) + 1; } if (h.bad.length || h.d < minD) continue;
  const cw = h.wrong.filter(m => h.C.get(m).capWall).length, kr = h.wrong.filter(m => h.C.get(m).inRoom && !h.C.get(m).kMove).length;
  got++; console.log(JSON.stringify({ P, d: h.d, sig: fortSig(E, P), legal: h.all.length, room: h.FR.size, gaps: h.gaps.size, cw, kr }));
}
console.error('made', got, JSON.stringify(stat));

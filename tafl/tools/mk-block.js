'use strict';
// (2026-11-27 第2期 担当A) the maker of t_block problems: the king on an edge with one open line along it to a corner (a ライチ), the way
// to the other corner shut, random pieces around, the attackers to move; kept when tools/lesson-verify-tfblock.js finds no fault and a
// block onto the line loses to a トゥイチ (the lesson's point). Prints one JSON per line: { P, d, sig, tu }.
//   node tafl/tools/mk-block.js <count> [seed] [min d: the blocks that still lose]
const path = require('path'), E = require(path.join(__dirname, '../engine.js')), { blockFacts, blockSig } = require(path.join(__dirname, '../../tools/lesson-verify-tfblock.js'));
const [CNT, SEED, MIND] = process.argv.slice(2), n = 11, minD = +(MIND || 1);
let s = (+(SEED || 1) * 2654435761) >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }, ri = q => Math.floor(rnd() * q);   // (mulberry32)
const SYM = [(r, c) => [r, c], (r, c) => [r, 10 - c], (r, c) => [10 - r, c], (r, c) => [10 - r, 10 - c], (r, c) => [c, r], (r, c) => [c, 10 - r], (r, c) => [10 - c, r], (r, c) => [10 - c, 10 - r]];
let got = 0;
for (let tries = 0; tries < 2000000 && got < +CNT; tries++) {
  const b = Array(n * n).fill('.'), C = (r, c) => (r === 0 || r === 10) && (c === 0 || c === 10), set = (r, c, x) => { if (r < 0 || c < 0 || r >= n || c >= n || C(r, c) || (r === 5 && c === 5)) return false; const i = r * n + c; if (b[i] !== '.') return false; b[i] = x; return true; };
  // the king on row 0 at column kc; row 0 from 1 to kc-1 stays empty (the line to a11), a piece shuts the way to k11
  const kc = (minD >= 3 ? 6 : 4) + ri(minD >= 3 ? 4 : 6); set(0, kc, 'k'); set(0, kc + 1 + ri(9 - kc), rnd() < 0.6 ? 'a' : 'd');
  const na = (minD >= 3 ? 10 : 7) + ri(10), nd = 1 + ri(6);
  for (let q = 0; q < na; q++) { const r = 1 + ri(10), cc = ri(n); set(r, cc, 'a'); }
  for (let q = 0; q < nd; q++) { const r = 1 + ri(9), cc = ri(n); set(r, cc, 'd'); }
  const S = SYM[ri(8)], b2 = Array(n * n).fill('.'); for (let i = 0; i < n * n; i++) { const [r, cc] = S(Math.floor(i / n), i % n); b2[r * n + cc] = b[i]; }
  const P = { s: { v: 'copenhagen', b: b2.join(''), side: 1 } };
  let f; try { const p = E.Pos.from(P.s); if (p.kingLines().length !== 1) continue; { const q = p.clone(); if (q.moves().some(m => q.clone().play(m).res)) continue; }
    f = blockFacts(E, Object.assign({}, P, { ok: [], best: -1 })); } catch (e) { continue; }
  if (!f.goal.length) continue;
  P.ok = f.goal.slice(); P.best = P.ok[0];
  const g = blockFacts(E, P); if (g.bad.length || g.d < minD) continue;
  const tu = g.blocks.filter(m => !g.goal.includes(m) && g.C.get(m).f2 && g.C.get(m).f2.how === 'tuichi').length; if (!tu) continue;
  got++; console.log(JSON.stringify({ P, d: g.d, sig: blockSig(E, P), tu, blocks: g.blocks.length, legal: g.all.length }));
}
console.error('made', got);

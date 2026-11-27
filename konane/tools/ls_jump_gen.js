#!/usr/bin/env node
// (2026-11-27 担当C) Kōnane lesson b_jump (取れる石を見つける): new problems for the 2D and the 3D (konane/lessons.json). The old
// five took any legal jump as right (every Kōnane move captures), so the lesson now asks for one stone to capture: the opponent has
// exactly one stone that can jump now (the target), and exactly one of your jumps takes it — the answer. From endings of random games
// on 8×8 solved exactly (konane/ls-facts.js wins). Kept only when (claude/lesson-quality.md ①〜⑨):
//  the answer is the only winning jump (and the only one taking the target), 5–14 legal moves (4+ wrong, 追72), 3+ of your stones
//  can jump (the hint lights them all, 追52), the opponent still has a jump after the answer (not the b_win lesson again), every
//  wrong move has a winning reply of the opponent drawn on the problem's board (the gold mark), preferably the target's own jump.
// Not within 4 squares (8 symmetries, colours swapped too) of any puzzle / other lesson position; picks 8+ squares apart, different
// answer stones. Sorted easy → hard: d = wrong moves + 2 × near misses (wrong moves taking a stone next to the target).
// Usage: node konane/tools/ls_jump_gen.js [--write]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const E = require(path.join(ROOT, 'konane/engine.js')), F = require(path.join(ROOT, 'konane/ls-facts.js'));
let seed = +(process.env.SEED || 20261128); const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'konane/lessons.json'), 'utf8'));
const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'konane/puzzles.json'), 'utf8'));
E.setRule('s8');
const N = 8, SYM = []; for (let t = 0; t < 8; t++) SYM.push((r, c) => { let a = r, b = c; if (t & 4) [a, b] = [b, a]; if (t & 1) a = N - 1 - a; if (t & 2) b = N - 1 - b; return a * N + b; });
const vars = b => { const o = []; for (const f of SYM) for (const sw of [0, 1]) { const x = Array(64).fill('.'); for (let i = 0; i < 64; i++) { const ch = b[i]; x[f((i / 8) | 0, i % 8)] = ch === '.' ? '.' : sw ? (ch === 'b' ? 'w' : 'b') : ch; } o.push(x.join('')); } return o; };
const diff = (a, b) => { let n = 0; for (let i = 0; i < 64; i++) if (a[i] !== b[i]) n++; return n; };
const pool = [];
PZ.themes.forEach(T => T.puzzles.forEach(P => pool.push(P.s.b)));
LS.steps.filter(s => s.id !== 'b_jump').forEach(s => (s.problems || []).forEach(P => { if (P.s.b.length === 64) pool.push(P.s.b); }));
const near = b => { const v = vars(b); return pool.some(a => v.some(x => diff(a, x) <= 4)); };
const M = new Map(); let nodes = 0;
function wins(p) { if (++nodes > 60000) throw 0; const k = p.h1 + ',' + p.h2; let v = M.get(k); if (v !== undefined) return v; v = false; for (const m of p.moves()) if (!wins(p.clone().play(m))) { v = true; break; } M.set(k, v); return v; }
const NEED = +(process.env.NEED || 80), C = [], seen = new Set();
for (let g = 0; g < 600000 && C.length < NEED; g++) {
  if (g % 500 === 0) console.error('game', g, C.length);
  const p = new E.Pos(), hist = []; while (true) { const L = p.moves(); if (!L.length) break; p.play(L[Math.floor(rnd() * L.length)]); if (p.ply >= 8) hist.push(p.clone()); }
  M.clear();
  for (const q of hist.slice(-16).reverse()) {
    const L = q.moves(); if (L.length < 5 || L.length > 14) continue;
    const spec = q.spec(); delete spec.n; if (seen.has(spec.b + spec.side)) continue; seen.add(spec.b + spec.side);
    const me = q.turn, o = q.clone(); o.side ^= 1; const OJ = o.moves(), T = [...new Set(OJ.map(E.mFrom))];
    if (T.length !== 1) continue;
    const t = T[0], takes = L.filter(m => E.captured(q, m).includes(t)); if (takes.length !== 1) continue;
    const from = new Set(L.map(E.mFrom)); if (from.size < 3) continue;
    const w = takes[0]; if (!q.clone().play(w).mobility(3 - me)) continue;
    nodes = 0; let res; try { res = L.map(m => !wins(q.clone().play(m))); } catch (e) { continue; }
    const W = L.filter((m, i) => res[i]); if (W.length !== 1 || W[0] !== w) continue;
    const wrong = L.filter(m => m !== w), fs_ = wrong.map(m => F.fact(E, 'b_jump', spec, m));
    if (fs_.some(f => f.r == null || !f.draw)) continue;
    const [tr, tc] = E.RC[t], nearN = wrong.filter(m => E.captured(q, m).some(x => { const [r, c] = E.RC[x]; return Math.abs(r - tr) + Math.abs(c - tc) === 1; })).length;
    C.push({ spec, best: w, legal: L.length, d: wrong.length + 2 * nearN, tj: fs_.filter(f => f.tgt).length });
  }
}
console.log('candidates', C.length);
C.sort((a, b) => a.d - b.d || a.legal - b.legal);
const pick = [], qs = [0.08, 0.3, 0.5, 0.7, 0.92];
const DS = [...new Set(C.map(c => c.d))];   // (spread over the distinct difficulties, not the crowd of easy ones)
for (const qq of qs) { const d0 = DS[Math.floor(qq * DS.length)], ord = C.map((_, i) => i).sort((a, b) => Math.abs(C[a].d - d0) - Math.abs(C[b].d - d0) || C[b].tj - C[a].tj); for (const k of ord) { const c = C[k];
  if (pick.includes(c) || near(c.spec.b)) continue;
  if (pick.some(o => vars(o.spec.b).some(x => diff(x, c.spec.b) <= 8))) continue;
  if (pick.some(o => E.mFrom(o.best) === E.mFrom(c.best))) continue;
  pick.push(c); break; } }
pick.sort((a, b) => a.d - b.d);
for (const c of pick) { const p = E.Pos.from(c.spec); console.log('b_jump d', c.d, 'legal', c.legal, E.name(p, c.best), 'target replies', c.tj); }
if (process.argv.includes('--write')) {
  if (pick.length < 5) { console.log('only', pick.length, '— not written'); process.exit(1); }
  LS.steps.find(s => s.id === 'b_jump').problems = pick.map(c => ({ s: { b: c.spec.b, side: c.spec.side }, ok: [c.best], best: c.best }));
  fs.writeFileSync(path.join(ROOT, 'konane/lessons.json'), JSON.stringify(LS));
  console.log('written');
}

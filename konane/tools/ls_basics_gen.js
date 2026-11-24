#!/usr/bin/env node
// (2026-11-25 担当C) Kōnane lessons b_double / b_win: new problems for the 2D and the 3D (konane/lessons.json), from random games on
// 8×8, kept only when they meet the lesson rules (claude/lesson-quality.md ①〜⑥; checked again by tools/lesson-verify-konane.js):
//  b_double: exactly one move takes 2 or more (the answer; its own line stopped earlier is a wrong move), 5+ legal moves, 3+ stones
//            that can jump, 3+ wrong moves of other stones whose landing ends differently (edge / own stone / empty / blocked).
//  b_win   : exactly one move leaves the opponent no jump, 5+ legal moves, the opponent has 2+ jumps now, a move that takes more or
//            leaves only one jump is among the wrong ones.
// Not within 4 squares (8 symmetries, colours swapped too) of any puzzle / lesson position. Sorted easy → hard (legal moves, near misses).
// Usage: node konane/tools/ls_basics_gen.js [--write]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const E = require(path.join(ROOT, 'konane/engine.js')), F = require(path.join(ROOT, 'konane/ls-facts.js'));
E.setRule('s8');
let seed = 20261125; const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // (mulberry32)
const LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'konane/lessons.json'), 'utf8'));
const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'konane/puzzles.json'), 'utf8'));
const N = 8, SYM = []; for (let t = 0; t < 8; t++) SYM.push((r, c) => { let a = r, b = c; if (t & 4) [a, b] = [b, a]; if (t & 1) a = N - 1 - a; if (t & 2) b = N - 1 - b; return a * N + b; });
const vars = b => { const o = []; for (const f of SYM) for (const sw of [0, 1]) { const x = Array(64).fill('.'); for (let i = 0; i < 64; i++) { const ch = b[i]; x[f((i / 8) | 0, i % 8)] = ch === '.' ? '.' : sw ? (ch === 'b' ? 'w' : 'b') : ch; } o.push(x.join('')); } return o; };
const diff = (a, b) => { let n = 0; for (let i = 0; i < 64; i++) if (a[i] !== b[i]) n++; return n; };
const pool = [];
PZ.themes.forEach(T => T.puzzles.forEach(P => pool.push(P.s.b)));
LS.steps.filter(s => !['b_double', 'b_win'].includes(s.id)).forEach(s => (s.problems || []).forEach(P => { if (P.s.b.length === 64) pool.push(P.s.b); }));
const near = b => { const v = vars(b); return pool.some(a => v.some(x => diff(a, x) <= 4)); };
function game() {
  const p = new E.Pos(), out = []; let n = 0;
  while (true) { const L = p.moves(); if (!L.length) break; p.play(L[Math.floor(rnd() * L.length)]); n++; if (n >= 8) out.push(p.clone()); }
  return out;
}
const cand = { b_double: [], b_win: [] };
for (let g = 0; g < 80000 && (cand.b_double.length < 400 || cand.b_win.length < 400); g++) for (const p of game()) {
  const L = p.moves(); if (L.length < 5 || L.length > 14) continue;
  const me = p.turn, spec = p.spec(); spec.n = undefined; delete spec.n;
  const stones = p.count(1) + p.count(2); if (stones < 10) continue;
  // b_double
  const hs = L.map(E.hops), mx = Math.max(...hs), top = L.filter((m, i) => hs[i] === mx);
  if (cand.b_double.length < 3000 && stones >= 16 && mx >= 2 && top.length === 1 && hs.filter(h => h >= 2).length === 1) {
    const from = new Set(L.map(E.mFrom)), wr = L.filter(m => m !== top[0]), fs_ = wr.map(m => F.fact(E, 'b_double', spec, m));
    const other = fs_.filter(f => f.k === 'other'), ends = new Set(other.map(f => f.end));
    if (from.size >= 3 && other.length >= 3 && ends.size >= 2) cand.b_double.push({ spec, best: top[0], legal: L.length, d: wr.length + 2 * fs_.filter(f => f.k === 'stop').length });
  }
  // b_win
  const mob = L.map(m => p.clone().play(m).mobility(3 - me)), win = L.filter((m, i) => !mob[i]);
  if (win.length === 1 && p.mobility(3 - me) >= 2) {
    const nr = mob.filter(j => j === 1).length, more = L.some(m => m !== win[0] && E.hops(m) > E.hops(win[0]));
    // every wrong move's gold jump (one of the opponent's jumps left) can be drawn on the problem's board: its stone there, its landing empty
    const draw = L.filter(m => m !== win[0]).every(m => { const f = F.fact(E, 'b_win', spec, m); return f.r != null && p.owner(E.mFrom(f.r)) === 3 - me && !p.owner(E.mTo(f.r)); });
    if (draw && nr >= 1 && L.length - 1 >= 4) cand.b_win.push({ spec, best: win[0], legal: L.length, d: (L.length - 1) + 2 * nr });
  }
}
console.log('uniq', new Set(cand.b_win.map(c => c.spec.b)).size, 'from', new Set(cand.b_win.map(c => c.best % 128)).size); console.log('candidates', cand.b_double.length, cand.b_win.length, 'b_win not near', cand.b_win.filter(c => !near(c.spec.b)).length);
const out = {};
for (const id of ['b_double', 'b_win']) {
  const C = cand[id]; C.sort((a, b) => a.d - b.d || a.legal - b.legal);
  // five, spread from easy to hard, no two within 4 squares of each other, the answers' stones in different places
  const pick = [], qs = [0.08, 0.3, 0.5, 0.7, 0.92];
  for (const q of qs) { const k0 = Math.floor(q * C.length), ord = C.map((_, i) => i).sort((a, b) => Math.abs(a - k0) - Math.abs(b - k0)); for (const k of ord) { const c = C[k];
    if (near(c.spec.b)) continue;
    if (pick.some(o => vars(o.spec.b).some(x => diff(x, c.spec.b) <= 8))) continue;
    if (pick.some(o => E.mFrom(o.best) === E.mFrom(c.best))) continue;
    if (id === 'b_double' && pick.length === 4 && E.hops(c.best) < 3 && C.some(z => E.hops(z.best) >= 3)) continue;
    pick.push(c); break; } }
  pick.sort((a, b) => a.d - b.d);
  out[id] = pick.map(c => ({ s: { b: c.spec.b, side: c.spec.side }, ok: [c.best], best: c.best }));
  for (const c of pick) { const p = E.Pos.from(c.spec); console.log(id, 'd', c.d, 'legal', c.legal, E.name(p, c.best)); }
  pool.push(...pick.map(c => c.spec.b));
}
if (process.argv.includes('--write')) {
  for (const s of LS.steps) if (out[s.id]) s.problems = out[s.id];
  fs.writeFileSync(path.join(ROOT, 'konane/lessons.json'), JSON.stringify(LS));
  console.log('written');
}

#!/usr/bin/env node
// (2026-11-25 05:33 担当C) Kōnane strategy lessons s_count / s_stop: new problems for the 2D and the 3D (konane/lessons.json),
// from endings of random games on 8×8 solved exactly (every jump of both sides to the end). Kept only when (claude/lesson-quality.md):
//  both   : exactly one winning jump (the answer), 5–14 legal moves (4+ wrong, 追72 1 right ≤ 1/3), every wrong move has a winning
//           reply of the opponent drawn on the problem's board (the gold mark: its stone there, its landing square empty),
//           the opponent still has a jump after the answer (not the b_win lesson again), solved in ≤ 40000 new positions (the memo kept along one game, its end first) (the browser
//           solves it again for the words).
//  s_count: the answer is the only move leaving the opponent the fewest jumps (counting is the way to it); 3+ of your stones can
//           jump (the hint lights them all).
//  s_stop : the answer stops on a line that goes on (a longer jump of the same stone and direction exists, and loses);
//           3+ of your stones can jump (the hint lights them all).
// Not within 4 squares (8 symmetries, colours swapped too) of any puzzle / other lesson position. Sorted easy → hard
// (d = wrong moves + 2 × near misses: s_count one more jump than the answer leaves · s_stop the longer jumps of the answer's line).
// The warm-ups' 'try' pages (6×6) get their right moves from the same solve (rule 'win').
// Usage: node konane/tools/ls_strat_gen.js [--write]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const E = require(path.join(ROOT, 'konane/engine.js')), F = require(path.join(ROOT, 'konane/ls-facts.js'));
const IDS = ['s_count', 's_stop'];
let seed = +(process.env.SEED || 20261126); const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'konane/lessons.json'), 'utf8'));
const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'konane/puzzles.json'), 'utf8'));
// the warm-ups first (6×6)
E.setRule('s6');
for (const id of IDS) { const st = LS.steps.find(s => s.id === id); (st.ramp || []).forEach(r => { if (r.k !== 'try') return; const p = E.Pos.from(r.s); r.ok = p.moves().filter(m => !F.wins(p.clone().play(m))).map(m => E.name(p, m)); console.log(id, 'warm-up ok', r.ok.join(' '), 'of', p.moves().map(m => E.name(p, m)).join(' ')); }); }
E.setRule('s8');
const N = 8, SYM = []; for (let t = 0; t < 8; t++) SYM.push((r, c) => { let a = r, b = c; if (t & 4) [a, b] = [b, a]; if (t & 1) a = N - 1 - a; if (t & 2) b = N - 1 - b; return a * N + b; });
const vars = b => { const o = []; for (const f of SYM) for (const sw of [0, 1]) { const x = Array(64).fill('.'); for (let i = 0; i < 64; i++) { const ch = b[i]; x[f((i / 8) | 0, i % 8)] = ch === '.' ? '.' : sw ? (ch === 'b' ? 'w' : 'b') : ch; } o.push(x.join('')); } return o; };
const diff = (a, b) => { let n = 0; for (let i = 0; i < 64; i++) if (a[i] !== b[i]) n++; return n; };
const pool = [];
PZ.themes.forEach(T => T.puzzles.forEach(P => pool.push(P.s.b)));
LS.steps.filter(s => !IDS.includes(s.id)).forEach(s => (s.problems || []).forEach(P => { if (P.s.b.length === 64) pool.push(P.s.b); }));
const near = b => { const v = vars(b); return pool.some(a => v.some(x => diff(a, x) <= 4)); };
// a budgeted solve (the generator's filter; ls-facts.js solves again without a budget)
const M = new Map(); let nodes = 0;
function wins(p) { if (++nodes > 40000) throw 0; const k = p.h1 + ',' + p.h2; let v = M.get(k); if (v !== undefined) return v; v = false; for (const m of p.moves()) if (!wins(p.clone().play(m))) { v = true; break; } M.set(k, v); return v; }
const cand = { s_count: [], s_stop: [] }, seen = new Set();
for (let g = 0; g < 60000 && (cand.s_count.length < +(process.env.NCOUNT || 80) || cand.s_stop.length < +(process.env.NSTOP || 80)); g++) {
  if (g % 100 === 0) console.error('game', g, cand.s_count.length, cand.s_stop.length);
  const p = new E.Pos(), hist = []; while (true) { const L = p.moves(); if (!L.length) break; p.play(L[Math.floor(rnd() * L.length)]); if (p.ply >= 8) hist.push(p.clone()); }
  M.clear();
  for (const q of hist.slice(-12).reverse()) {
    const L = q.moves(); if (L.length < 5 || L.length > 14) continue;
    const spec = q.spec(); delete spec.n; if (seen.has(spec.b + spec.side)) continue; seen.add(spec.b + spec.side);
    nodes = 0; let res;
    try { res = L.map(m => !wins(q.clone().play(m))); } catch (e) { continue; }
    const W = L.filter((m, i) => res[i]); if (W.length !== 1) continue;
    const w = W[0], me = q.turn, pos = E.Pos.from(spec), wrong = L.filter(m => m !== w);
    const jW = q.clone().play(w).mobility(3 - me); if (!jW) continue;
    const from = new Set(L.map(E.mFrom)), js = L.map(m => q.clone().play(m).mobility(3 - me));
    const pw = E.path(pos, w), longer = L.filter(x => E.mFrom(x) === E.mFrom(w) && E.path(pos, x)[1] === pw[1] && E.hops(x) > E.hops(w));
    const lines = new Set(L.filter(x => E.hops(x) >= 2).map(E.mFrom));
    const okC = js.filter(x => x === jW).length === 1 && Math.min(...js) === jW && from.size >= 3, okS = longer.length > 0 && from.size >= 3;
    if (!okC && !okS) continue;
    for (const id of IDS) {
      if (id === 's_count' ? !okC : !okS) continue;
      const fs_ = wrong.map(m => F.fact(E, id, spec, m)); if (fs_.some(f => !f.r || !f.draw)) continue;
      if (id === 's_count') cand.s_count.push({ spec, best: w, legal: L.length, d: wrong.length + 2 * js.filter(x => x === jW + 1).length });
      else if (fs_.filter(f => f.k === 'go').length === longer.length) cand.s_stop.push({ spec, best: w, legal: L.length, d: wrong.length + 2 * longer.length, spring: fs_.filter(f => f.k === 'go' && f.spring).length });
    }
  }
}
console.log('candidates', cand.s_count.length, cand.s_stop.length);
if (process.env.DUMP) { fs.writeFileSync(process.env.DUMP, JSON.stringify(cand)); process.exit(0); }
if (process.env.MORE) for (const f of process.env.MORE.split(',')) { const c = JSON.parse(fs.readFileSync(f, 'utf8')); for (const id of IDS) for (const x of c[id]) if (!cand[id].some(y => y.spec.b === x.spec.b)) cand[id].push(x); }
const out = {};
for (const id of IDS) {
  const C = cand[id]; C.sort((a, b) => a.d - b.d || a.legal - b.legal);
  const pick = [], qs = [0.08, 0.3, 0.5, 0.7, 0.92];
  for (const qq of qs) { const k0 = Math.floor(qq * C.length), ord = C.map((_, i) => i).sort((a, b) => Math.abs(a - k0) - Math.abs(b - k0)); for (const k of ord) { const c = C[k];
    if (pick.includes(c) || near(c.spec.b)) continue;
    if (pick.some(o => vars(o.spec.b).some(x => diff(x, c.spec.b) <= 8))) continue;
    if (pick.some(o => E.mFrom(o.best) === E.mFrom(c.best))) continue;
    if (id === 's_stop' && !c.spring && C.some(z => z.spring)) continue;   // (prefer: going on lets the opponent take the landed stone)
    pick.push(c); break; } }
  pick.sort((a, b) => a.d - b.d);
  out[id] = pick.map(c => ({ s: { b: c.spec.b, side: c.spec.side }, ok: [c.best], best: c.best }));
  for (const c of pick) { const p = E.Pos.from(c.spec); console.log(id, 'd', c.d, 'legal', c.legal, E.name(p, c.best), c.spring != null ? 'spring ' + c.spring : ''); }
  pool.push(...pick.map(c => c.spec.b));
}
if (process.argv.includes('--write')) {
  for (const s of LS.steps) if (out[s.id]) s.problems = out[s.id];
  fs.writeFileSync(path.join(ROOT, 'konane/lessons.json'), JSON.stringify(LS));
  console.log('written');
}

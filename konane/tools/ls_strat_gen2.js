#!/usr/bin/env node
// (2026-11-27 担当C) Kōnane strategy lessons s_go / s_keep / s_read: new problems for the 2D and the 3D (konane/lessons.json), from
// endings of random games on 8×8 solved exactly (konane/ls-facts.js wins: every jump of both sides to the end). Kept only when
// (claude/lesson-quality.md ①〜⑨):
//  all    : exactly one winning jump (the answer), 5–14 legal moves (4+ wrong, 追72), 3+ of your stones can jump (the hint lights
//           them all, 追52), the opponent still has a jump after the answer (not the b_win lesson again), every wrong move has a
//           winning reply of the opponent drawn on the problem's board (the gold mark: its stone there, its landing square empty).
//  s_go   : the answer jumps 2+ stones to the end of its line, and the same line stopped earlier is among the moves (and loses);
//           preferred: the reply to a stop jumps with a stone the full jump would have taken (shortS).
//  s_keep : the answer does not leave the opponent the fewest jumps — some move leaves it fewer — and every move leaving it the
//           fewest — and every move leaving it fewer than the answer — also leaves you fewer jumps of your own (the reserve).
//  s_read : the opponent has 2+ replies after the answer (read them all), and some wrong move leaves it as few jumps or fewer
//           (counting alone does not find the answer).
// Not within 4 squares (8 symmetries, colours swapped too) of any puzzle / other lesson position, picks 8+ squares apart and from
// different stones. Sorted easy → hard: d = wrong moves + 2 × near misses (s_go the shorter jumps of the answer's line · s_keep the
// moves cutting the opponent more · s_read the moves leaving it as few or fewer).
// The warm-ups' 'try' pages (6×6) get their right moves from the same solve (rule 'win').
// Usage: node konane/tools/ls_strat_gen2.js [--write]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const E = require(path.join(ROOT, 'konane/engine.js')), F = require(path.join(ROOT, 'konane/ls-facts.js'));
const IDS = process.env.IDS ? process.env.IDS.split(',') : ['s_go', 's_keep', 's_read'];
let seed = +(process.env.SEED || 20261127); const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'konane/lessons.json'), 'utf8'));
const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'konane/puzzles.json'), 'utf8'));
E.setRule('s6');
for (const id of IDS) { const st = LS.steps.find(s => s.id === id); (st.ramp || []).forEach(r => { if (r.k !== 'try') return; const p = E.Pos.from(r.s); r.ok = p.moves().filter(m => !F.wins(p.clone().play(m))).map(m => E.name(p, m)); console.log(id, 'warm-up ok', r.ok.join(' ')); }); }
E.setRule('s8');
const N = 8, SYM = []; for (let t = 0; t < 8; t++) SYM.push((r, c) => { let a = r, b = c; if (t & 4) [a, b] = [b, a]; if (t & 1) a = N - 1 - a; if (t & 2) b = N - 1 - b; return a * N + b; });
const vars = b => { const o = []; for (const f of SYM) for (const sw of [0, 1]) { const x = Array(64).fill('.'); for (let i = 0; i < 64; i++) { const ch = b[i]; x[f((i / 8) | 0, i % 8)] = ch === '.' ? '.' : sw ? (ch === 'b' ? 'w' : 'b') : ch; } o.push(x.join('')); } return o; };
const diff = (a, b) => { let n = 0; for (let i = 0; i < 64; i++) if (a[i] !== b[i]) n++; return n; };
const pool = [];
PZ.themes.forEach(T => T.puzzles.forEach(P => pool.push(P.s.b)));
LS.steps.filter(s => !IDS.includes(s.id)).forEach(s => (s.problems || []).forEach(P => { if (P.s.b.length === 64) pool.push(P.s.b); }));
const near = b => { const v = vars(b); return pool.some(a => v.some(x => diff(a, x) <= 4)); };
const M = new Map(); let nodes = 0;
function wins(p) { if (++nodes > 60000) throw 0; const k = p.h1 + ',' + p.h2; let v = M.get(k); if (v !== undefined) return v; v = false; for (const m of p.moves()) if (!wins(p.clone().play(m))) { v = true; break; } M.set(k, v); return v; }
const NEED = +(process.env.NEED || 60), cand = Object.fromEntries(IDS.map(id => [id, []])), seen = new Set();
for (let g = 0; g < 80000 && IDS.some(id => cand[id].length < NEED); g++) {
  if (g % 200 === 0) console.error('game', g, IDS.map(id => cand[id].length).join(' '));
  const p = new E.Pos(), hist = []; while (true) { const L = p.moves(); if (!L.length) break; p.play(L[Math.floor(rnd() * L.length)]); if (p.ply >= 8) hist.push(p.clone()); }
  M.clear();
  for (const q of hist.slice(-14).reverse()) {
    const L = q.moves(); if (L.length < 5 || L.length > 14) continue;
    const spec = q.spec(); delete spec.n; if (seen.has(spec.b + spec.side)) continue; seen.add(spec.b + spec.side);
    nodes = 0; let res;
    try { res = L.map(m => !wins(q.clone().play(m))); } catch (e) { continue; }
    const W = L.filter((m, i) => res[i]); if (W.length !== 1) continue;
    const w = W[0], me = q.turn, pos = E.Pos.from(spec);
    const from = new Set(L.map(E.mFrom)); if (from.size < 3) continue;
    const js = L.map(m => q.clone().play(m).mobility(3 - me)), os = L.map(m => q.clone().play(m).mobility(me)), wi = L.indexOf(w), jW = js[wi], oW = os[wi];
    if (!jW) continue;
    const pw = E.path(pos, w), sameLine = x => E.mFrom(x) === E.mFrom(w) && E.path(pos, x)[1] === pw[1];
    const shorter = L.filter(x => sameLine(x) && E.hops(x) < E.hops(w)), longer = L.filter(x => sameLine(x) && E.hops(x) > E.hops(w));
    const jmin = Math.min(...js);
    const ok = {
      s_go: E.hops(w) >= 2 && !longer.length && shorter.length > 0,
      s_keep: jW > jmin && L.every((x, i) => js[i] >= jW || os[i] < oW),
      s_read: jW >= 2 && L.some((x, i) => x !== w && js[i] <= jW),
    };
    for (const id of IDS) {
      if (!ok[id]) continue;
      const wrong = L.filter(m => m !== w), fs_ = wrong.map(m => F.fact(E, id, spec, m));
      if (fs_.some(f => f.r == null || !f.draw)) continue;
      const nearN = id === 's_go' ? shorter.length : id === 's_keep' ? L.filter((x, i) => x !== w && js[i] < jW).length : L.filter((x, i) => x !== w && js[i] <= jW).length;
      cand[id].push({ spec, best: w, legal: L.length, d: wrong.length + 2 * nearN, spring: id === 's_go' ? fs_.filter(f => f.k === 'short' && f.spring).length : null });
    }
  }
}
console.log('candidates', IDS.map(id => id + ' ' + cand[id].length).join(' · '));
const out = {};
for (const id of IDS) {
  const C = cand[id]; C.sort((a, b) => a.d - b.d || a.legal - b.legal);
  const pick = [], qs = [0.08, 0.3, 0.5, 0.7, 0.92];
  for (const qq of qs) { const k0 = Math.floor(qq * C.length), ord = C.map((_, i) => i).sort((a, b) => Math.abs(a - k0) - Math.abs(b - k0)); for (const k of ord) { const c = C[k];
    if (pick.includes(c) || near(c.spec.b)) continue;
    if (pick.some(o => vars(o.spec.b).some(x => diff(x, c.spec.b) <= 8))) continue;
    if (pick.some(o => E.mFrom(o.best) === E.mFrom(c.best))) continue;
    if (id === 's_go' && !c.spring && C.some(z => z.spring)) continue;   // (prefer: stopping early lets a stone the full jump would have taken jump back)
    pick.push(c); break; } }
  pick.sort((a, b) => a.d - b.d);
  out[id] = pick.map(c => ({ s: { b: c.spec.b, side: c.spec.side }, ok: [c.best], best: c.best }));
  for (const c of pick) { const p = E.Pos.from(c.spec); console.log(id, 'd', c.d, 'legal', c.legal, E.name(p, c.best), c.spring != null ? 'spring ' + c.spring : ''); }
  pool.push(...pick.map(c => c.spec.b));
}
if (process.argv.includes('--write')) {
  for (const s of LS.steps) if (out[s.id]) { if (out[s.id].length < 5) { console.log('only', out[s.id].length, 'for', s.id, '— not written'); process.exit(1); } s.problems = out[s.id]; }
  fs.writeFileSync(path.join(ROOT, 'konane/lessons.json'), JSON.stringify(LS));
  console.log('written');
}

// 4x4 opening lines from the exact opening book (dots4book.bin, every value exact) + the WebAssembly solver.
// Family "b" (drill as first player): second player = book move; every first-player candidate is valued through the
// AI-second book entry of the resulting position. Family "a" (drill as second player): first player = book move; every
// second-player candidate is valued through the AI-first book. usage: node op4.js -> CK/op4.json
'use strict';
const L = require('./lib.js'), { E } = L;
E.x4Ready();
const G = E.geom(4, 4);
const K64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const r = L.rng(44);
const book = p => { const b = E.x4Book(p); return b && b.flag === 1 ? b : null; };
const CACHE = `${L.CK}/op4_cache.jsonl`, cache = new Map(L.readJsonl(CACHE).map(x => [x.k, x.v]));
function moveW(p, e, ms) { const io = E.X4.io; let lo = 0, hi = 0; for (let i = 0; i < 32; i++) if (p.drawn[i]) lo |= 1 << i; for (let i = 32; i < 40; i++) if (p.drawn[i]) hi |= 1 << (i - 32); io[0] = lo; io[1] = hi; const v = E.X4.x.w_move_value(e, -17, 17, ms); return v === -999 ? null : v; }
let missing = 0, solvedW = 0;
function childVals(p) {   // value (mover's view) of every legal move via the book entry of the child, else the exact solver (cached)
  const out = [];
  for (const e of p.legal()) {
    const q = p.clone(); const k = q.play(e); if (k) return null; const b = book(q);
    if (b) { out.push([e, -b.value]); continue; }
    const key = p.edges().join(',') + '+' + e;
    if (!cache.has(key)) { const v = moveW(p, e, +process.env.MS || 20000); if (v === null) { missing++; return null; } cache.set(key, v); L.appendLine(CACHE, { k: key, v }); solvedW++; }
    out.push([e, cache.get(key)]);
  }
  return out;
}
const enc = vals => { const a = new Array(G.E).fill('.'); for (const [e, v] of vals) a[e] = K64[v + 30]; return a.join(''); };
const quiet = (p, e) => { const q = p.clone(); q.play(e); let n2 = 0; for (let b = 0; b < G.B; b++) if (q.cnt[b] >= 2) n2++; return n2; };
function choose(p, vals) {
  const bv = Math.max(...vals.map(x => x[1])), opt = vals.filter(x => x[1] === bv).map(x => x[0]);
  let best = null, bs = 1e9;
  for (const e of opt) { const s = quiet(p, e) * 10 + r(); if (s < bs) { bs = s; best = e; } }
  return best;
}
function bestW(p, ms) { const io = E.X4.io; let lo = 0, hi = 0; for (let e = 0; e < 32; e++) if (p.drawn[e]) lo |= 1 << e; for (let e = 32; e < 40; e++) if (p.drawn[e]) hi |= 1 << (e - 32); io[0] = lo; io[1] = hi; io[2] = -1; const v = E.X4.x.w_best(ms); return v === -999 ? null : { move: io[3], value: v }; }
function extend(edges, upto) {   // exact best moves by the solver (study only)
  const p = E.Pos.from(G, edges);
  while (edges.length < upto) { const b = bestW(p, 30000); if (!b) break; edges.push(b.move); p.play(b.move); }
  return edges;
}
const lines = [];
// ---------------- family b: first-move classes
const cls = new Map(); for (let e = 0; e < G.E; e++) { const k = Math.min(...G.perms.map(pm => pm[e])); if (!cls.has(k)) cls.set(k, e); }
console.log('first-move classes', [...cls.values()]);
for (const e0 of cls.values()) {
  const edges = [e0], plies = [{ v: enc(childVals(new E.Pos(G))), full: 1 }];
  const p = E.Pos.from(G, edges);
  while (edges.length < 8) {
    const k = edges.length;
    if (k % 2 === 1) { const b = book(p); if (!b) break; plies.push({ v: enc([[b.move, b.value]]), full: 0 }); edges.push(b.move); p.play(b.move); }
    else { const vals = childVals(p); if (!vals) break; plies.push({ v: enc(vals), full: 1 }); const e = choose(p, vals); edges.push(e); p.play(e); }
  }
  const drill = edges.length;
  extend(edges, 12);
  lines.push({ fam: 'b', side: 0, moves: edges, drill, plies });
  console.log('b', e0, edges.join(','), 'drill', drill);
}
// ---------------- family a: first player follows the book; vary the second player's reply
const root = new E.Pos(G), m0 = book(root).move;
const p1 = E.Pos.from(G, [m0]), v1 = childVals(p1);
const best1 = Math.max(...v1.map(x => x[1]));
const fix = G.perms.filter(pm => pm[m0] === m0);
const reps = new Map(); for (const [e, v] of v1) { if (v !== best1) continue; const k = Math.min(...fix.map(pm => pm[e])); if (!reps.has(k)) reps.set(k, e); }
const losing = v1.filter(x => x[1] < best1);
console.log('book first move', m0, 'optimal reply classes', reps.size, 'losing replies', losing.length, JSON.stringify(losing));
for (const e1 of reps.values()) {
  const edges = [m0, e1], plies = [{ v: enc([[m0, 0]]), full: 0 }, { v: enc(v1), full: 1 }];
  const p = E.Pos.from(G, edges);
  while (edges.length < 9) {
    const k = edges.length;
    if (k % 2 === 0) { const b = book(p); if (!b) break; plies.push({ v: enc([[b.move, b.value]]), full: 0 }); edges.push(b.move); p.play(b.move); }
    else { const vals = childVals(p); if (!vals) break; plies.push({ v: enc(vals), full: 1 }); const e = choose(p, vals); edges.push(e); p.play(e); }
  }
  const drill = edges.length;
  extend(edges, 12);
  lines.push({ fam: 'a', side: 1, moves: edges, drill, plies });
  console.log('a', e1, edges.join(','), 'drill', drill);
}
L.atomicWrite(`${L.CK}/op4.json`, JSON.stringify(lines));
console.log('lines', lines.length, 'solver-filled', solvedW, 'gave up', missing);

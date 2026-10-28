/* ソリティア — generic solver (solitaire/solver.js)
   Works for every variant registered in variants.js that sets `solver: true`: depth-first search over SOL.moves(),
   ordered by the variant's rank(), pruned by useful(), safe foundation moves forced, transpositions by SOL.key().
   Runs as a Web Worker (new Worker('solver.js')) or in the page (SOLVER.solve / SOLVER.find).
     find  { v, o, tries, limit, seed }      → { no, nodes }   first deal number (from a random start) the solver wins
     solve { st, limit }                     → { ok, path:[moves], nodes, out }   (out: node limit reached) */
(function (G) {
'use strict';
if (typeof SOL === 'undefined' && typeof importScripts === 'function') importScripts('variants.js?v=1');
const S = G.SOL;
function dfs(st0, limit) {
  const V = S.VARIANTS[st0.v], seen = new Set(), path = [];
  let nodes = 0, out = false;
  function rec(st, depth) {
    if (++nodes > limit) { out = true; return false; }
    const forced = [];
    let a; while ((a = S.autoMove(st, 'safe'))) { S.apply(st, a); forced.push(a); }
    if (S.won(st)) { path.push(...forced); return true; }
    const k = S.key(st); if (seen.has(k)) return false; seen.add(k);
    if (depth > 600) return false;
    let ms = S.moves(st);
    if (V.useful) ms = ms.filter(m => V.useful(st, m));
    ms = ms.map(m => [V.rank ? V.rank(st, m) : 0, m]).sort((x, y) => y[0] - x[0]).map(x => x[1]);
    path.push(...forced);
    for (const m of ms) {
      const s2 = S.clone(st); S.apply(s2, m); path.push(m);
      if (rec(s2, depth + 1)) return true;
      path.pop(); if (out) break;
    }
    path.length -= forced.length;
    return false;
  }
  const ok = rec(S.clone(st0), 0);
  return { ok, path: ok ? path : [], nodes, out };
}
// best-first search (greedy on the variant's eval(), or a generic one): stronger than DFS for open games like FreeCell
function evalGeneric(st) {
  const V = S.VARIANTS[st.v]; if (V.eval) return V.eval(st);
  let v = 0; const ft = S.foundTop(st), need = ft.map(r => r + 1);
  st.p.forEach((P, i) => {
    const k = st.L[i].k;
    if (k === 'found') { v += 12 * P.c.length; return; }
    if (k === 'cell') { v += P.c.length ? -4 : 3; return; }
    if (k === 'tab') {
      if (!P.c.length) { v += 7; return; }
      v -= 6 * P.d;
      let mn = 99;
      for (let j = 0; j < P.c.length; j++) {
        const c = P.c[j], r = S.RANK(c);
        if (r > mn) v -= 2; mn = Math.min(mn, r);
        if (r === need[S.SUIT(c)]) v -= 2 * (P.c.length - 1 - j);
      }
    }
  });
  return v;
}
function bestFirst(st0, limit) {
  const V = S.VARIANTS[st0.v], seen = new Set(), heap = [];
  const push = n => { heap.push(n); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p].f >= n.f) break; heap[i] = heap[p]; i = p; } heap[i] = n; };
  const pop = () => { const t = heap[0], l = heap.pop(); if (heap.length) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= heap.length) break; if (c + 1 < heap.length && heap[c + 1].f > heap[c].f) c++; if (heap[c].f <= l.f) break; heap[i] = heap[c]; i = c; } heap[i] = l; } return t; };
  const settle = (st, moves) => { let a; while ((a = S.autoMove(st, 'safe'))) { S.apply(st, a); moves.push(a); } };
  const m0 = []; const s0 = S.clone(st0); settle(s0, m0);
  push({ st: s0, f: 0, par: null, ms: m0, g: 0 });
  let nodes = 0;
  while (heap.length) {
    const n = pop();
    if (S.won(n.st)) { const path = []; for (let x = n; x; x = x.par) path.unshift(...x.ms); return { ok: true, path, nodes, out: false }; }
    const k = S.key(n.st); if (seen.has(k)) continue; seen.add(k);
    if (++nodes > limit) return { ok: false, path: [], nodes, out: true };
    let ms = S.moves(n.st); if (V.useful) ms = ms.filter(m => V.useful(n.st, m));
    for (const m of ms) {
      const s2 = S.clone(n.st), mm = [m]; S.apply(s2, m); settle(s2, mm);
      if (seen.has(S.key(s2))) continue;
      push({ st: s2, f: evalGeneric(s2) - 0.5 * (n.g + 1), par: n, ms: mm, g: n.g + 1 });
    }
  }
  return { ok: false, path: [], nodes, out: false };
}
function find(v, o, tries, limit, seed, det) {
  let no = seed || (1 + Math.floor(Math.random() * 999999)), nodes = 0;
  for (let k = 0; k < (tries || 40); k++) {
    const st = S.newGame(v, o, no), r = solve(st, limit || 30000); nodes += r.nodes;
    if (r.ok) return { no, nodes, len: r.path.length };
    no = (no + (det ? 7919 : 1 + Math.floor(Math.random() * 997))) % 999999 + 1;
  }
  return { no: null, nodes };
}
function solve(st0, limit) { return bestFirst(st0, limit); }
G.SOLVER = { solve, dfs, find, bestFirst, evalGeneric };
if (typeof importScripts === 'function' && typeof document === 'undefined') {
  G.onmessage = e => {
    const d = e.data;
    if (d.cmd === 'find') G.postMessage(Object.assign({ id: d.id }, find(d.v, d.o, d.tries, d.limit, d.seed, d.det)));
    else if (d.cmd === 'solve') { const st = Object.assign({}, d.st); st.L = S.VARIANTS[st.v].layout(st.o); const r = solve(st, d.limit || 40000); G.postMessage({ id: d.id, ok: r.ok, path: r.path, nodes: r.nodes, out: r.out }); }
  };
}
})(typeof self !== 'undefined' ? self : this);

/* =====================================================================
   Shanghai (mahjong solitaire) — the rules, the layouts, solvable deals, the stages (DOM-free: the portal and node share it).
   · A tile is free when nothing lies on it and its left or its right side is open. Two free tiles with the same face are
     taken together (any flower with any flower, any season with any season).
   · Positions are in half tiles: [x2, y2, z] (x2 = 2 × the column, y2 = 2 × the row, z = the layer).
   · Deals are always solvable: built backwards — the layout is emptied by taking two free positions at a time, and each
     such pair gets the faces of one pair; playing those pairs in reverse order clears the board. (The player can still
     take a wrong pair and get stuck: シャッフル deals the tiles left again the same way.)
   · Faces f: 0–8 萬子 · 9–17 筒子 · 18–26 索子 · 27–30 風牌 · 31–33 三元牌 · 34–37 花 · 38–41 季節.
     The match class: f for 0–33, 34 for every flower, 35 for every season.
   window.ShanghaiCore (and module.exports for node).
   ===================================================================== */
(function (root) {
  'use strict';
  const cls = f => f < 34 ? f : f < 38 ? 34 : 35;

  /* ---------- a small seeded random ---------- */
  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  /* ---------- the layouts ---------- */
  function L() { const P = [], k = new Set(); const add = (x, y, z) => { const key = (x * 2) + ',' + (y * 2) + ',' + z; if (!k.has(key)) { k.add(key); P.push([Math.round(x * 2), Math.round(y * 2), z]); } };
    return { P, rect: (z, x0, x1, y0, y1) => { for (let y = y0; y <= y1 + 1e-9; y++) for (let x = x0; x <= x1 + 1e-9; x++) add(x, y, z); }, pt: (z, x, y) => add(x, y, z) }; }
  const LAYOUTS = {
    petit() { const b = L(); b.rect(0, 0, 3, 0, 3); b.rect(1, 1, 2, 1, 2); b.pt(0, -1, 1.5); b.pt(0, 4, 1.5); b.pt(2, 1, 1.5); b.pt(2, 2, 1.5); return b.P; },
    pyramid() { const b = L(); b.rect(0, 0, 4, 0, 3); b.rect(1, .5, 3.5, .5, 2.5); b.rect(2, 1, 3, 1, 2); b.rect(3, 1.5, 2.5, 1.5, 1.5); return b.P; },
    twin() { const b = L(); [0, 5].forEach(o => { b.rect(0, o, o + 2, 0, 2); b.rect(1, o + .5, o + 1.5, .5, 1.5); b.pt(2, o + 1, 1); }); b.rect(0, 3, 4, 1, 1); b.pt(1, 3.5, 1); b.pt(0, 3, 0); b.pt(0, 4, 2); return b.P; },
    cross() { const b = L(); b.rect(0, 0, 9, 3, 4); b.rect(0, 4, 5, 0, 2); b.rect(0, 4, 5, 5, 7); b.rect(1, 1, 8, 3, 4); b.rect(1, 4, 5, 1, 6); b.rect(2, 4, 5, 3, 4); return b.P; },
    tower() { const b = L(); b.rect(0, 0, 3, 0, 3); b.rect(1, 0, 3, 0, 3); b.rect(2, .5, 2.5, .5, 2.5); b.rect(3, 1, 2, 1, 2); b.pt(4, 1.5, 1.5); b.pt(0, -1, 1.5); b.pt(0, 4, 1.5); return b.P; },
    bridge() { const b = L(); b.rect(0, 0, 11, 0, 0); b.rect(0, 0, 11, 4, 4); b.rect(0, 0, 1, 1, 3); b.rect(0, 10, 11, 1, 3); b.rect(1, 0, 1, 0, 4); b.rect(1, 10, 11, 0, 4); b.rect(1, 3, 8, 2, 2); b.rect(2, 4, 7, 2, 2); b.rect(2, 0, 1, 1.5, 2.5); b.rect(2, 10, 11, 1.5, 2.5); b.pt(3, .5, 2); b.pt(3, 10.5, 2); b.rect(0, 2, 9, 2, 2); return b.P; },
    fortress() { const b = L(); b.rect(0, 0, 9, 0, 5); [[0, 0], [8, 0], [0, 4], [8, 4]].forEach(([x, y]) => { b.rect(1, x, x + 1, y, y + 1); b.rect(2, x, x + 1, y, y + 1); b.pt(3, x + .5, y + .5); }); b.rect(1, 3, 6, 2, 3); b.rect(2, 4, 5, 2, 3); return b.P; },
    butterfly() { const b = L();
      [[0, 1], [9, 1]].forEach(([x]) => { b.rect(0, x, x + 2, 0, 6); });
      b.rect(0, 3, 8, 1, 5); b.rect(0, 5, 6, 0, 6);
      b.rect(1, .5, 1.5, .5, 2.5); b.rect(1, .5, 1.5, 3.5, 5.5); b.rect(1, 9.5, 10.5, .5, 2.5); b.rect(1, 9.5, 10.5, 3.5, 5.5);
      b.rect(1, 5, 6, 1, 5); b.rect(2, 5, 6, 2, 4); b.rect(3, 5.5, 5.5, 2.5, 3.5); return b.P; },
    dragon() { const b = L();
      b.rect(0, 0, 13, 0, 0); b.rect(0, 0, 13, 6, 6); b.rect(0, 2, 11, 2, 4); b.rect(0, 0, 0, 1, 5); b.rect(0, 13, 13, 1, 5);
      b.rect(1, 3, 10, 2, 4); b.rect(2, 4, 9, 2, 4); b.rect(3, 5, 8, 2.5, 3.5); b.rect(4, 6, 7, 3, 3);
      b.rect(1, 1, 12, 0, 0); b.rect(1, 1, 12, 6, 6); b.pt(0, -1, 3); b.pt(0, 14, 3); b.pt(0, 15, 3); return b.P; },
    turtle() { const b = L();
      b.rect(0, 1, 12, 0, 0); b.rect(0, 3, 10, 1, 1); b.rect(0, 2, 11, 2, 2); b.rect(0, 1, 12, 3, 3); b.rect(0, 1, 12, 4, 4); b.rect(0, 2, 11, 5, 5); b.rect(0, 3, 10, 6, 6); b.rect(0, 1, 12, 7, 7);
      b.pt(0, 0, 3.5); b.pt(0, 13, 3.5); b.pt(0, 14, 3.5);
      b.rect(1, 4, 9, 1, 6); b.rect(2, 5, 8, 2, 5); b.rect(3, 6, 7, 3, 4); b.pt(4, 6.5, 3.5); return b.P; },
  };
  // the free game's boards in order of difficulty (the card's size row), with their tile counts filled in below
  const FREE = ['petit', 'pyramid', 'twin', 'cross', 'tower', 'fortress', 'bridge', 'butterfly', 'dragon', 'turtle'];
  const POS = {}; for (const k in LAYOUTS) { let P = LAYOUTS[k](); if (P.length % 2) P = P.slice(0, -1); const mx = Math.min(...P.map(p => p[0])), my = Math.min(...P.map(p => p[1])); POS[k] = P.map(([x, y, z]) => [x - mx, y - my, z]); }

  /* ---------- geometry of freedom ---------- */
  // nb[i] = { on: [tiles lying on i], L: [left neighbours], R: [right neighbours] } (fixed for a layout)
  function links(P) {
    const n = P.length, on = Array.from({ length: n }, () => []), Lf = Array.from({ length: n }, () => []), Rt = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (i === j) continue;
      const [xi, yi, zi] = P[i], [xj, yj, zj] = P[j], dx = xj - xi, dy = Math.abs(yj - yi);
      if (zj === zi + 1 && Math.abs(dx) < 2 && dy < 2) on[i].push(j);
      if (zj === zi && dy < 2) { if (dx === -2) Lf[i].push(j); else if (dx === 2) Rt[i].push(j); } }
    return { on, L: Lf, R: Rt };
  }
  const isFree = (G, alive, i) => alive[i] && !G.on[i].some(j => alive[j]) && (!G.L[i].some(j => alive[j]) || !G.R[i].some(j => alive[j]));

  /* ---------- solvable deals ---------- */
  // the faces for n tiles: n/4 groups of four (plus one pair when n is not a multiple of 4), drawn from the 36 classes
  function faceSet(n, R) {
    const C = []; for (let c = 0; c < 36; c++) C.push(c);
    for (let i = C.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [C[i], C[j]] = [C[j], C[i]]; }
    const pairs = [];   // [faceA, faceB]
    const quad = c => c < 34 ? [c, c, c, c] : c === 34 ? [34, 35, 36, 37] : [38, 39, 40, 41];
    let k = 0; while (pairs.length * 2 + 4 <= n) { const q = quad(C[k++ % 36]); pairs.push([q[0], q[1]], [q[2], q[3]]); }
    if (pairs.length * 2 < n) { const q = quad(C[k++ % 36]); pairs.push([q[0], q[1]]); }
    return pairs;
  }
  // order the alive positions into removal pairs (each pair free together at its turn); null if it got stuck
  function pairOrder(G, alive0, R, prefer) {
    const alive = alive0.slice(), order = [], n = alive.reduce((s, v) => s + (v ? 1 : 0), 0);
    for (let t = 0; t < n / 2; t++) {
      const F = []; for (let i = 0; i < alive.length; i++) if (isFree(G, alive, i)) F.push(i);
      if (F.length < 2) return null;
      // weight: tiles that hold others down (something under or beside them waits) go a little sooner — fewer dead ends
      const w = F.map(i => 1 + (prefer ? prefer(i) : 0) + R() * 2);
      const pick = () => { let s = 0; w.forEach(v => { s += v; }); let r = R() * s; for (let k = 0; k < F.length; k++) { r -= w[k]; if (r <= 0) { const i = F[k]; F.splice(k, 1); w.splice(k, 1); return i; } } const i = F.pop(); w.pop(); return i; };
      const a = pick(), b = pick(); alive[a] = alive[b] = 0; order.push([a, b]);
    }
    return order;
  }
  function deal(P, seed) {
    const G = links(P), R = rng(seed || (Math.random() * 4294967296) >>> 0), n = P.length;
    const height = i => P[i][2] * .6 + G.L[i].length * .05;
    for (let tr = 0; tr < 400; tr++) {
      const ord = pairOrder(G, new Array(n).fill(1), R, height); if (!ord) continue;
      const pairs = faceSet(n, R); for (let i = pairs.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pairs[i], pairs[j]] = [pairs[j], pairs[i]]; }
      const face = new Array(n); ord.forEach(([a, b], k) => { const [fa, fb] = pairs[k]; face[a] = fa; face[b] = fb; });
      return { G, face, order: ord };
    }
    throw new Error('no deal');
  }
  // シャッフル: the faces left, dealt again on the tiles left so that they can be cleared
  function reshuffle(G, alive, face, seed) {
    const R = rng(seed || (Math.random() * 4294967296) >>> 0), idx = [];
    alive.forEach((v, i) => { if (v) idx.push(i); });
    // the pairs left (faces of one class two by two)
    const by = {}; idx.forEach(i => { const c = cls(face[i]); (by[c] = by[c] || []).push(face[i]); });
    const pairs = []; for (const c in by) { const L2 = by[c]; for (let k = 0; k + 1 < L2.length; k += 2) pairs.push([L2[k], L2[k + 1]]); }
    for (let tr = 0; tr < 400; tr++) {
      const ord = pairOrder(G, alive, R, null); if (!ord) continue;
      for (let i = pairs.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pairs[i], pairs[j]] = [pairs[j], pairs[i]]; }
      const nf = face.slice(); ord.forEach(([a, b], k) => { nf[a] = pairs[k][0]; nf[b] = pairs[k][1]; });
      return { face: nf, order: ord };
    }
    return null;
  }
  // the pairs that can be taken now
  function moves(G, alive, face) {
    const F = []; for (let i = 0; i < alive.length; i++) if (isFree(G, alive, i)) F.push(i);
    const M = []; for (let a = 0; a < F.length; a++) for (let b = a + 1; b < F.length; b++) if (cls(face[F[a]]) === cls(face[F[b]])) M.push([F[a], F[b]]);
    return M;
  }
  // a plan (a list of pairs) still clears the board from here? (freedom only grows as tiles go, so one pass in order decides)
  function planOK(G, alive, face, plan) {
    const al = alive.slice(); let left = al.reduce((s, v) => s + (v ? 1 : 0), 0);
    for (const [a, b] of plan) { if (!al[a] || !al[b] || cls(face[a]) !== cls(face[b]) || !isFree(G, al, a) || !isFree(G, al, b)) return false; al[a] = al[b] = 0; left -= 2; }
    return left === 0;
  }
  // after the player took (x, y): keep the plan going — drop the pair if it was one; else, when x and y were in two pairs of the
  // same class, pair up their partners instead (at the later of the two places); the caller checks the result with planOK
  function patch(plan, x, y) {
    const i = plan.findIndex(([a, b]) => (a === x && b === y) || (a === y && b === x)); if (i >= 0) return plan.filter((_, k) => k !== i);
    const ix = plan.findIndex(p => p.includes(x)), iy = plan.findIndex(p => p.includes(y)); if (ix < 0 || iy < 0) return null;
    const px = plan[ix][0] === x ? plan[ix][1] : plan[ix][0], py = plan[iy][0] === y ? plan[iy][1] : plan[iy][0];
    const out = []; plan.forEach((p, k) => { if (k === ix || k === iy) { if (k === Math.max(ix, iy)) out.push([px, py]); } else out.push(p); });
    return out;
  }
  // a search for a clearing order from here (depth first, the pairs that unblock the most first; a hash of the tiles left
  // prunes repeats), at most ms milliseconds — null when none was found in time (or there is none)
  function solve(G, alive0, face, ms) {
    const n = alive0.length, al = alive0.slice(), Z1 = new Uint32Array(n), R = rng(12345);
    for (let i = 0; i < n; i++) Z1[i] = (R() * 4294967296) >>> 0;
    let h = 0; for (let i = 0; i < n; i++) if (al[i]) h ^= Z1[i];
    const seen = new Set(), path = [], t0 = Date.now(); let nodes = 0, out = false;
    const under = i => { let s = 0; for (let j = 0; j < n; j++) if (al[j] && G.on[j].indexOf(i) >= 0) s += 3; return s; };
    const side = i => (G.L[i].some(j => al[j]) ? 1 : 0) + (G.R[i].some(j => al[j]) ? 1 : 0);
    function dfs(left) {
      if (!left) return true;
      if ((++nodes & 255) === 0 && Date.now() - t0 > ms) out = true;
      if (out || seen.has(h)) return false; seen.add(h);
      const F = []; for (let i = 0; i < n; i++) if (isFree(G, al, i)) F.push(i);
      const byC = {}; F.forEach(i => { const c = cls(face[i]); (byC[c] = byC[c] || []).push(i); });
      const cntC = {}; for (let i = 0; i < n; i++) if (al[i]) { const c = cls(face[i]); cntC[c] = (cntC[c] || 0) + 1; }
      const M = [];
      for (const c in byC) { const L2 = byC[c]; if (L2.length < 2) continue;
        // all of a class free at once: taking them in any pairing is safe — one move is enough
        if (L2.length === cntC[c]) { M.length = 0; M.push([L2[0], L2[1], 1e9]); break; }
        for (let a = 0; a < L2.length; a++) for (let b = a + 1; b < L2.length; b++) M.push([L2[a], L2[b], under(L2[a]) + under(L2[b]) + side(L2[a]) + side(L2[b]) + (cntC[c] === 2 ? 4 : 0)]); }
      M.sort((p, q) => q[2] - p[2]);
      for (const [a, b] of M) {
        al[a] = al[b] = 0; h ^= Z1[a] ^ Z1[b]; path.push([a, b]);
        if (dfs(left - 2)) return true;
        al[a] = al[b] = 1; h ^= Z1[a] ^ Z1[b]; path.pop();
        if (out) return false;
      }
      return false;
    }
    const left = al.reduce((s, v) => s + (v ? 1 : 0), 0);
    return dfs(left) ? path.slice() : null;
  }
  // a hint: the plan's first pair that is free now (the plan is checked, mended or searched again first)
  // → { pair, plan, safe } (safe: the board can still be cleared after it) or null (no pair at all)
  function hint(G, alive, face, plan, ms) {
    const M = moves(G, alive, face); if (!M.length) return null;
    let P = plan && planOK(G, alive, face, plan) ? plan : solve(G, alive, face, ms || 400);
    if (P && P.length) { const al = alive.slice(); for (const [a, b] of P) { if (isFree(G, al, a) && isFree(G, al, b)) return { pair: [a, b], plan: P, safe: true }; } }
    return { pair: M[0], plan: null, safe: false };
  }

  /* ---------- the stages: 12 constellations × 10 stars ---------- */
  const AREAS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpius', 'sagittarius', 'capricornus', 'aquarius', 'pisces'];
  // a mission per star (k = 0..9) — the area's own layouts get bigger as the sky turns
  const MIS = ['clear', 'pairs', 'clear', 'gold', 'time', 'clear', 'gold', 'pure', 'time', 'clear'];
  const POOL = [
    ['petit', 'petit', 'pyramid', 'petit', 'pyramid', 'twin', 'pyramid', 'petit', 'twin', 'pyramid'],
    ['pyramid', 'twin', 'cross', 'pyramid', 'twin', 'cross', 'twin', 'pyramid', 'cross', 'tower'],
    ['twin', 'cross', 'tower', 'twin', 'cross', 'tower', 'cross', 'twin', 'tower', 'fortress'],
    ['cross', 'tower', 'fortress', 'cross', 'tower', 'fortress', 'tower', 'cross', 'fortress', 'bridge'],
    ['tower', 'fortress', 'bridge', 'tower', 'fortress', 'bridge', 'fortress', 'tower', 'bridge', 'butterfly'],
    ['fortress', 'bridge', 'butterfly', 'fortress', 'bridge', 'butterfly', 'bridge', 'fortress', 'butterfly', 'dragon'],
  ];
  const BIG = ['bridge', 'butterfly', 'dragon', 'fortress', 'turtle', 'butterfly', 'dragon', 'bridge', 'turtle', 'turtle'];
  // one stage at difficulty step a (0..11: the board pool, the pace), star k of its area, from a seed
  function stage(s, lvl, seed0) {
    const a = lvl == null ? Math.floor(s / 10) : lvl, k = s % 10, lay = a < POOL.length ? POOL[a][k] : BIG[(k + a) % 10], n = POS[lay].length;
    const type = s === 0 ? 'clear' : MIS[k], seed = seed0 || 7919 * (s + 1) + 104729;
    const pairs = n / 2, pace = Math.max(3.2, 6.5 - a * .3);   // seconds a pair (the time missions get tighter further on)
    const st = { s, a, k, lay, n, type, seed, par: Math.round(pairs * Math.max(3.4, 5.5 - a * .18)) };
    if (type === 'time') st.limit = Math.round(pairs * pace / 5) * 5;
    if (type === 'pairs') { st.goal = Math.max(4, Math.round(pairs * .5)); st.limit = Math.round(st.goal * (pace + 1.5) / 5) * 5; }
    if (type === 'gold') st.gold = Math.min(pairs - 1, 2 + Math.floor(a / 3)) * 2;   // gilded tiles to take (pairs of them)
    return st;
  }
  // the gilded tiles of a gold stage: pairs taken late in the solution (deep in the stack)
  function goldTiles(d, count) { const G = []; const ord = d.order.slice().reverse(); for (const [a, b] of ord) { if (G.length >= count) break; G.push(a, b); } return G; }
  const STAGES = 120;
  // (2026-11-14) the other courses (森・海・お菓子 …): course ci starts at difficulty step base, one step more each area of 10
  function courseStage(ci, base, s) { const st = stage(s, Math.min(11, base + Math.floor(s / 10)), 7919 * (s + 1) + 104729 + (ci + 1) * 999331); st.a = Math.floor(s / 10); return st; }

  const API = { cls, rng, LAYOUTS: POS, FREE, links, isFree, deal, reshuffle, moves, hint, solve, planOK, patch, AREAS, stage, courseStage, goldTiles, STAGES };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.ShanghaiCore = API;
})(typeof window !== 'undefined' ? window : globalThis);

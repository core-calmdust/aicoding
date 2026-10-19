/* まいにち数独 — engine
   solver / generator / human-technique grader / hint finder
   Works in the browser (window.SudokuEngine) and in Node (module.exports). */
(function (root) {
'use strict';

/* ---------- tables ---------- */
const ROW = [], COL = [], BOX = [], UNITS = [], PEERS = [], CELL_UNITS = [];
for (let i = 0; i < 81; i++) { ROW[i] = (i / 9) | 0; COL[i] = i % 9; BOX[i] = ((ROW[i] / 3) | 0) * 3 + ((COL[i] / 3) | 0); }
for (let r = 0; r < 9; r++) { const u = []; for (let c = 0; c < 9; c++) u.push(r * 9 + c); UNITS.push(u); }
for (let c = 0; c < 9; c++) { const u = []; for (let r = 0; r < 9; r++) u.push(r * 9 + c); UNITS.push(u); }
for (let b = 0; b < 9; b++) { const u = []; const r0 = ((b / 3) | 0) * 3, c0 = (b % 3) * 3; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) u.push((r0 + r) * 9 + c0 + c); UNITS.push(u); }
for (let i = 0; i < 81; i++) {
  CELL_UNITS[i] = [ROW[i], 9 + COL[i], 18 + BOX[i]];
  const s = new Set(); for (const u of CELL_UNITS[i]) for (const j of UNITS[u]) if (j !== i) s.add(j);
  PEERS[i] = [...s];
}
const POP = new Uint8Array(512); for (let m = 1; m < 512; m++) POP[m] = POP[m >> 1] + (m & 1);
const LOWBIT_D = new Uint8Array(512); for (let m = 1; m < 512; m++) { let d = 1; while (!(m & (1 << (d - 1)))) d++; LOWBIT_D[m] = d; }
const ALL = 511;
const bit = d => 1 << (d - 1);
const digitsOf = m => { const a = []; for (let d = 1; d <= 9; d++) if (m & bit(d)) a.push(d); return a; };

/* ---------- variants ----------
   setVariant(spec) rebuilds the geometry tables IN PLACE (BOX, UNITS, PEERS, CELL_UNITS…)
   so references held by the app stay valid. units 0-8 rows, 9-17 cols, 18-26 boxes
   (jigsaw: irregular regions), 27+ extra units (x: 2 diagonals, hyper: 4 windows). */
const PARITY = new Uint8Array(81);                 // 0 none, 1 odd, 2 even
const PARMASK = new Uint16Array(81).fill(ALL);     // allowed digits by parity
const ODD = 0x155, EVEN = 0xAA;
const CAGES = [];                                  // [{sum, cells}]
const CAGE_OF = new Int8Array(81).fill(-1);
const EXCL = [];                                   // PEERS ∪ cage mates (digits that must differ)
const SEE = new Uint8Array(81 * 81);               // SEE[a*81+b] = 1 if a, b must hold different digits
let LOCK_PAIRS = [];                               // [A, B, inter] with an extra unit involved
let KINDS = [];
let SPEC = { type: 'std' };
let IS_STD = true;
/* UNION[(mask*10+cnt)*46+sum] = digits used by some set of cnt distinct digits ⊆ mask summing to sum */
const SUMOF = new Uint8Array(512); for (let m = 1; m < 512; m++) SUMOF[m] = SUMOF[m & (m - 1)] + LOWBIT_D[m & -m];
const UNION = new Uint16Array(512 * 10 * 46);
for (let s = 0; s < 512; s++) { const k = POP[s], t = SUMOF[s]; for (let m = s; m < 512; m = (m + 1) | s) UNION[(m * 10 + k) * 46 + t] |= s; }
const unionOf = (avail, cnt, sum) => (sum < 0 || sum > 45 ? 0 : UNION[(avail * 10 + cnt) * 46 + sum]);

function buildGeometry(spec) {
  const type = spec.type;
  for (let i = 0; i < 81; i++) BOX[i] = type === 'jigsaw' ? spec.regions[i] : ((ROW[i] / 3) | 0) * 3 + ((COL[i] / 3) | 0);
  UNITS.length = 0; KINDS = [];
  for (let r = 0; r < 9; r++) { const u = []; for (let c = 0; c < 9; c++) u.push(r * 9 + c); UNITS.push(u); KINDS.push('row'); }
  for (let c = 0; c < 9; c++) { const u = []; for (let r = 0; r < 9; r++) u.push(r * 9 + c); UNITS.push(u); KINDS.push('col'); }
  if (type === 'jigsaw') {
    for (let b = 0; b < 9; b++) { const u = []; for (let i = 0; i < 81; i++) if (BOX[i] === b) u.push(i); UNITS.push(u); KINDS.push('region'); }
  } else for (let b = 0; b < 9; b++) { const u = []; const r0 = ((b / 3) | 0) * 3, c0 = (b % 3) * 3; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) u.push((r0 + r) * 9 + c0 + c); UNITS.push(u); KINDS.push('box'); }
  if (type === 'x') {
    const a = [], b = []; for (let k = 0; k < 9; k++) { a.push(k * 9 + k); b.push(k * 9 + 8 - k); }
    UNITS.push(a, b); KINDS.push('diag', 'diag');
  } else if (type === 'hyper') {
    for (const [r0, c0] of [[1, 1], [1, 5], [5, 1], [5, 5]]) { const u = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) u.push((r0 + r) * 9 + c0 + c); UNITS.push(u); KINDS.push('window'); }
  }
  for (let i = 0; i < 81; i++) {
    const cu = [ROW[i], 9 + COL[i], 18 + BOX[i]];
    for (let u = 27; u < UNITS.length; u++) if (UNITS[u].includes(i)) cu.push(u);
    CELL_UNITS[i] = cu;
    const s = new Set(); for (const u of cu) for (const j of UNITS[u]) if (j !== i) s.add(j);
    PEERS[i] = [...s];
  }
  // parity
  for (let i = 0; i < 81; i++) {
    PARITY[i] = type === 'oddeven' && spec.parity ? spec.parity[i] : 0;
    PARMASK[i] = PARITY[i] === 1 ? ODD : PARITY[i] === 2 ? EVEN : ALL;
  }
  // cages
  CAGES.length = 0; CAGE_OF.fill(-1);
  if (type === 'killer') spec.cages.forEach(([sum, cells], k) => { CAGES.push({ sum, cells: cells.slice() }); for (const i of cells) CAGE_OF[i] = k; });
  EXCL.length = 0;
  for (let i = 0; i < 81; i++) {
    if (CAGE_OF[i] < 0) { EXCL.push(PEERS[i]); continue; }
    const s = new Set(PEERS[i]); for (const j of CAGES[CAGE_OF[i]].cells) if (j !== i) s.add(j);
    EXCL.push([...s]);
  }
  SEE.fill(0); for (let i = 0; i < 81; i++) for (const j of EXCL[i]) SEE[i * 81 + j] = 1;
  // unit intersections involving an extra unit (generalised pointing / claiming)
  buildAreas();
  LOCK_PAIRS = [];
  for (let A = 0; A < UNITS.length; A++) for (let B = 0; B < UNITS.length; B++) {
    if (A === B || (A < 27 && B < 27)) continue;
    const inter = UNITS[A].filter(i => UNITS[B].includes(i));
    if (inter.length >= 2) LOCK_PAIRS.push([A, B]);
  }
}
function setVariant(spec) {
  if (!spec || !spec.type || spec.type === 'std') spec = { type: 'std' };
  const t = spec.type;
  if (!['std', 'x', 'hyper', 'jigsaw', 'oddeven', 'killer'].includes(t)) throw new Error('unknown variant ' + t);
  if (t === 'jigsaw' && !(spec.regions && spec.regions.length === 81)) throw new Error('jigsaw needs regions[81]');
  if (t === 'killer' && !Array.isArray(spec.cages)) throw new Error('killer needs cages');
  SPEC = Object.assign({}, spec);
  if (spec.regions) SPEC.regions = Array.from(spec.regions, Number);
  if (spec.parity) SPEC.parity = Array.from(spec.parity, Number);
  if (spec.cages) SPEC.cages = spec.cages.map(([s, c]) => [s, c.slice()]);
  buildGeometry(SPEC);
  IS_STD = t === 'std';
  return SPEC;
}
const variant = () => SPEC;
const unitKind = u => KINDS[u];
const unitIndex = u => (u < 27 ? u % 9 : u - 27);

/* ---------- RNG ---------- */
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function shuffle(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---------- conversions ---------- */
const parse = s => Array.from(s, ch => (ch >= '1' && ch <= '9' ? ch.charCodeAt(0) - 48 : 0));
const stringify = g => g.map(v => (v ? String(v) : '.')).join('');

/* ---------- brute-force solver (counts solutions up to limit) ---------- */
function solve(grid, limit = 2) {
  if (!IS_STD) return solveG(grid, limit);
  const g = grid.slice();
  const rm = new Uint16Array(9), cm = new Uint16Array(9), bm = new Uint16Array(9);
  for (let i = 0; i < 81; i++) {
    const v = g[i]; if (!v) continue; const b = bit(v);
    if ((rm[ROW[i]] | cm[COL[i]] | bm[BOX[i]]) & b) return { count: 0, solution: null };
    rm[ROW[i]] |= b; cm[COL[i]] |= b; bm[BOX[i]] |= b;
  }
  let count = 0, solution = null;
  const empties = []; for (let i = 0; i < 81; i++) if (!g[i]) empties.push(i);
  function rec(n) {
    if (n === empties.length) { count++; if (!solution) solution = g.slice(); return count >= limit; }
    // MRV
    let best = n, bestC = 10, bestM = 0;
    for (let k = n; k < empties.length; k++) {
      const i = empties[k]; const m = ALL & ~(rm[ROW[i]] | cm[COL[i]] | bm[BOX[i]]); const c = POP[m];
      if (c < bestC) { bestC = c; best = k; bestM = m; if (c <= 1) break; }
    }
    if (bestC === 0) return false;
    [empties[n], empties[best]] = [empties[best], empties[n]];
    const i = empties[n]; let m = bestM;
    while (m) {
      const b = m & -m; m ^= b; const d = LOWBIT_D[b];
      g[i] = d; rm[ROW[i]] |= b; cm[COL[i]] |= b; bm[BOX[i]] |= b;
      if (rec(n + 1)) return true;
      rm[ROW[i]] ^= b; cm[COL[i]] ^= b; bm[BOX[i]] ^= b; g[i] = 0;
    }
    [empties[n], empties[best]] = [empties[best], empties[n]];
    return false;
  }
  rec(0);
  return { count, solution };
}

/* generic solver: any units, parity, killer cages (cage-sum pruning, MRV).
   opts.rng: randomise digit order; opts.nodeLimit: give up (count -1); opts.all: collect up to `limit` solutions */
function solveG(grid, limit = 2, opts = {}) {
  const g = grid.slice(), NU = UNITS.length, NC = CAGES.length;
  const um = new Uint16Array(NU), cu = new Uint16Array(NC), crem = new Int16Array(NC), ccnt = new Uint8Array(NC);
  for (let c = 0; c < NC; c++) { crem[c] = CAGES[c].sum; ccnt[c] = CAGES[c].cells.length; }
  const fail = { count: 0, solution: null, solutions: [] };
  for (let i = 0; i < 81; i++) {
    const v = g[i]; if (!v) continue; const b = bit(v);
    if (!(PARMASK[i] & b)) return fail;
    for (const u of CELL_UNITS[i]) { if (um[u] & b) return fail; um[u] |= b; }
    const c = CAGE_OF[i];
    if (c >= 0) { if (cu[c] & b) return fail; cu[c] |= b; crem[c] -= v; ccnt[c]--; }
  }
  for (let c = 0; c < NC; c++) if (ccnt[c] ? !unionOf(ALL & ~cu[c], ccnt[c], crem[c]) : crem[c] !== 0) return fail;
  const rng = opts.rng, nodeLimit = opts.nodeLimit || 0, sols = [];
  let count = 0, solution = null, nodes = 0, aborted = false;
  const empties = []; for (let i = 0; i < 81; i++) if (!g[i]) empties.push(i);
  const maskOf = i => {
    let m = PARMASK[i]; const cus = CELL_UNITS[i];
    for (let k = 0; k < cus.length; k++) m &= ~um[cus[k]];
    const c = CAGE_OF[i];
    if (c >= 0) m &= unionOf(ALL & ~cu[c], ccnt[c], crem[c]);
    return m;
  };
  function rec(n) {
    if (n === empties.length) { count++; if (!solution) solution = g.slice(); if (opts.all) sols.push(g.slice()); return count >= limit; }
    if (nodeLimit && ++nodes > nodeLimit) { aborted = true; return true; }
    let best = n, bestC = 10, bestM = 0;
    for (let k = n; k < empties.length; k++) {
      const m = maskOf(empties[k]); const c = POP[m];
      if (c < bestC) { bestC = c; best = k; bestM = m; if (c <= 1) break; }
    }
    if (bestC === 0) return false;
    [empties[n], empties[best]] = [empties[best], empties[n]];
    const i = empties[n], cus = CELL_UNITS[i], c = CAGE_OF[i];
    const ds = rng ? shuffle(digitsOf(bestM), rng) : digitsOf(bestM);
    for (const d of ds) {
      const b = bit(d);
      g[i] = d; for (let k = 0; k < cus.length; k++) um[cus[k]] |= b;
      if (c >= 0) { cu[c] |= b; crem[c] -= d; ccnt[c]--; }
      if (rec(n + 1)) return true;
      for (let k = 0; k < cus.length; k++) um[cus[k]] ^= b;
      if (c >= 0) { cu[c] ^= b; crem[c] += d; ccnt[c]++; }
      g[i] = 0;
    }
    [empties[n], empties[best]] = [empties[best], empties[n]];
    return false;
  }
  rec(0);
  if (aborted) return { count: -1, solution: null, solutions: sols };
  return { count, solution, solutions: sols };
}

function randomFull(rng) {
  if (!IS_STD) return solveG(new Array(81).fill(0), 1, { rng }).solution;
  const g = new Array(81).fill(0);
  const rm = new Uint16Array(9), cm = new Uint16Array(9), bm = new Uint16Array(9);
  function rec(i) {
    if (i === 81) return true;
    const m = ALL & ~(rm[ROW[i]] | cm[COL[i]] | bm[BOX[i]]);
    const ds = shuffle(digitsOf(m), rng);
    for (const d of ds) {
      const b = bit(d); g[i] = d; rm[ROW[i]] |= b; cm[COL[i]] |= b; bm[BOX[i]] |= b;
      if (rec(i + 1)) return true;
      rm[ROW[i]] ^= b; cm[COL[i]] ^= b; bm[BOX[i]] ^= b; g[i] = 0;
    }
    return false;
  }
  rec(0);
  return g;
}

/* dig holes keeping 180° rotational symmetry and a unique solution */
function generate(rng, opts = {}) {
  const minClues = opts.minClues || 17;
  const full = randomFull(rng);
  const g = full.slice();
  const pairs = []; for (let i = 0; i <= 40; i++) pairs.push(i);
  shuffle(pairs, rng);
  let clues = 81;
  for (const i of pairs) {
    const j = 80 - i;
    const n = i === j ? 1 : 2;
    if (clues - n < minClues) continue;
    const a = g[i], b = g[j];
    g[i] = 0; g[j] = 0;
    if (solve(g, 2).count !== 1) { g[i] = a; g[j] = b; } else clues -= n;
  }
  return { puzzle: g, solution: full };
}

/* ---------- human-style logical solver ---------- */
/* technique → level (1 初級 · 2 中級 · 3 上級 · 4 達人) and weight (for scoring) */
const TECH = {
  fullHouse:     { level: 1, w: 1 },
  hiddenSingleB: { level: 1, w: 1.5 },
  hiddenSingleL: { level: 1, w: 2.5 },
  cageLast:      { level: 1, w: 2 },
  nakedSingle:   { level: 1, w: 4 },
  cage:          { level: 2, w: 10 },
  pointing:      { level: 2, w: 12 },
  claiming:      { level: 2, w: 14 },
  nakedPair:     { level: 2, w: 16 },
  hiddenPair:    { level: 2, w: 20 },
  innieOutie:    { level: 3, w: 28 },
  nakedTriple:   { level: 3, w: 30 },
  hiddenTriple:  { level: 3, w: 38 },
  xWing:         { level: 3, w: 40 },
  xyWing:        { level: 3, w: 45 },
  nakedQuad:     { level: 3, w: 50 },
  swordfish:     { level: 4, w: 70 },
  xyzWing:       { level: 4, w: 75 },
  hiddenQuad:    { level: 4, w: 80 },
  coloring:      { level: 4, w: 85 },
  jellyfish:     { level: 4, w: 95 },
};

function makeState(grid) {
  const v = grid.slice(), cand = new Uint16Array(81);
  for (let i = 0; i < 81; i++) if (!v[i]) {
    let m = PARMASK[i]; for (const p of EXCL[i]) if (v[p]) m &= ~bit(v[p]);
    cand[i] = m;
  }
  return { v, cand };
}
function place(st, i, d) {
  st.v[i] = d; st.cand[i] = 0; const b = bit(d);
  for (const p of EXCL[i]) st.cand[p] &= ~b;
}

/* each finder returns a step {tech, place?:[i,d], elim?:[[i,mask]...], cells:[], units:[], digit} or null */
function fFullHouse(st) {
  for (let u = 0; u < UNITS.length; u++) {
    let empty = -1, n = 0;
    for (const i of UNITS[u]) if (!st.v[i]) { n++; empty = i; }
    if (n === 1 && st.cand[empty]) return { tech: 'fullHouse', place: [empty, LOWBIT_D[st.cand[empty]]], units: [u], cells: [empty] };
  }
  return null;
}
function fHiddenSingle(st, boxesOnly) {
  const order = boxesOnly ? [18, 19, 20, 21, 22, 23, 24, 25, 26] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  if (!boxesOnly) for (let u = 27; u < UNITS.length; u++) order.push(u);
  for (const u of order) for (let d = 1; d <= 9; d++) {
    const b = bit(d); let pos = -1, n = 0;
    for (const i of UNITS[u]) { if (st.v[i] === d) { n = 9; break; } if (st.cand[i] & b) { n++; pos = i; } }
    if (n === 1) return { tech: boxesOnly ? 'hiddenSingleB' : 'hiddenSingleL', place: [pos, d], units: [u], cells: [pos], digit: d };
  }
  return null;
}
function fNakedSingle(st) {
  for (let i = 0; i < 81; i++) if (!st.v[i] && POP[st.cand[i]] === 1) return { tech: 'nakedSingle', place: [i, LOWBIT_D[st.cand[i]]], cells: [i], units: [] };
  return null;
}
function elimStep(st, tech, elims, extra) {
  const real = elims.filter(([i, m]) => st.cand[i] & m);
  if (!real.length) return null;
  return Object.assign({ tech, elim: real.map(([i, m]) => [i, st.cand[i] & m]) }, extra);
}
function fLocked(st) {
  // pointing: digit in box confined to one row/col
  for (let b = 0; b < 9; b++) for (let d = 1; d <= 9; d++) {
    const bb = bit(d); const cells = UNITS[18 + b].filter(i => st.cand[i] & bb);
    if (cells.length < 2) continue;
    for (const [key, base] of [[ROW, 0], [COL, 9]]) {
      if (cells.every(i => key[i] === key[cells[0]])) {
        const u = base + key[cells[0]];
        const el = UNITS[u].filter(i => BOX[i] !== b && (st.cand[i] & bb)).map(i => [i, bb]);
        const s = elimStep(st, 'pointing', el, { cells, units: [18 + b, u], digit: d });
        if (s) return s;
      }
    }
  }
  // claiming: digit in row/col confined to one box
  for (let u = 0; u < 18; u++) for (let d = 1; d <= 9; d++) {
    const bb = bit(d); const cells = UNITS[u].filter(i => st.cand[i] & bb);
    if (cells.length < 2) continue;
    if (cells.every(i => BOX[i] === BOX[cells[0]])) {
      const b = BOX[cells[0]];
      const el = UNITS[18 + b].filter(i => !cells.includes(i) && (st.cand[i] & bb)).map(i => [i, bb]);
      const s = elimStep(st, 'claiming', el, { cells, units: [u, 18 + b], digit: d });
      if (s) return s;
    }
  }
  // extra units (diagonals / windows) intersecting other units
  for (const [A, B] of LOCK_PAIRS) for (let d = 1; d <= 9; d++) {
    const bb = bit(d); const cells = UNITS[A].filter(i => st.cand[i] & bb);
    if (cells.length < 2 || !cells.every(i => UNITS[B].includes(i))) continue;
    const el = UNITS[B].filter(i => !cells.includes(i) && (st.cand[i] & bb)).map(i => [i, bb]);
    const k = KINDS[A];
    const s = elimStep(st, k === 'box' || k === 'region' || k === 'window' ? 'pointing' : 'claiming', el, { cells, units: [A, B], digit: d });
    if (s) return s;
  }
  return null;
}
function combos(arr, k, start = 0, cur = [], out = []) {
  if (cur.length === k) { out.push(cur.slice()); return out; }
  for (let i = start; i < arr.length; i++) { cur.push(arr[i]); combos(arr, k, i + 1, cur, out); cur.pop(); }
  return out;
}
function fNakedSubset(st, k) {
  const tech = k === 2 ? 'nakedPair' : k === 3 ? 'nakedTriple' : 'nakedQuad';
  for (let u = 0; u < UNITS.length; u++) {
    const empt = UNITS[u].filter(i => !st.v[i] && POP[st.cand[i]] <= k && POP[st.cand[i]] >= 2);
    if (empt.length < k) continue;
    for (const c of combos(empt, k)) {
      let m = 0; for (const i of c) m |= st.cand[i];
      if (POP[m] !== k) continue;
      const el = UNITS[u].filter(i => !c.includes(i) && (st.cand[i] & m)).map(i => [i, m]);
      const s = elimStep(st, tech, el, { cells: c, units: [u], digits: digitsOf(m) });
      if (s) return s;
    }
  }
  return null;
}
function fHiddenSubset(st, k) {
  const tech = k === 2 ? 'hiddenPair' : k === 3 ? 'hiddenTriple' : 'hiddenQuad';
  for (let u = 0; u < UNITS.length; u++) {
    const ds = [];
    for (let d = 1; d <= 9; d++) { const n = UNITS[u].filter(i => st.cand[i] & bit(d)).length; if (n >= 2 && n <= k) ds.push(d); }
    if (ds.length < k) continue;
    for (const c of combos(ds, k)) {
      let dm = 0; for (const d of c) dm |= bit(d);
      const cells = UNITS[u].filter(i => st.cand[i] & dm);
      if (cells.length !== k) continue;
      const el = cells.filter(i => st.cand[i] & ~dm).map(i => [i, ALL & ~dm]);
      const s = elimStep(st, tech, el, { cells, units: [u], digits: c });
      if (s) return s;
    }
  }
  return null;
}
function fFish(st, k) {
  const tech = k === 2 ? 'xWing' : k === 3 ? 'swordfish' : 'jellyfish';
  for (let d = 1; d <= 9; d++) {
    const bb = bit(d);
    for (const rowsBase of [true, false]) {
      // base lines: rows (cover cols) or cols (cover rows)
      const lines = [];
      for (let l = 0; l < 9; l++) {
        const u = rowsBase ? l : 9 + l;
        const pos = UNITS[u].filter(i => st.cand[i] & bb).map(i => (rowsBase ? COL[i] : ROW[i]));
        if (pos.length >= 2 && pos.length <= k) lines.push({ l, u, pos });
      }
      if (lines.length < k) continue;
      for (const c of combos(lines, k)) {
        const cover = new Set(); for (const x of c) for (const p of x.pos) cover.add(p);
        if (cover.size !== k) continue;
        const baseSet = new Set(c.map(x => x.l));
        const el = [];
        for (const p of cover) {
          const cu = rowsBase ? 9 + p : p;
          for (const i of UNITS[cu]) { const line = rowsBase ? ROW[i] : COL[i]; if (!baseSet.has(line) && (st.cand[i] & bb)) el.push([i, bb]); }
        }
        const cells = []; for (const x of c) for (const i of UNITS[x.u]) if (st.cand[i] & bb) cells.push(i);
        const s = elimStep(st, tech, el, { cells, units: c.map(x => x.u), digit: d });
        if (s) return s;
      }
    }
  }
  return null;
}
const sees = (a, b) => SEE[a * 81 + b] === 1;
function fXYWing(st) {
  const bi = []; for (let i = 0; i < 81; i++) if (POP[st.cand[i]] === 2) bi.push(i);
  for (const p of bi) {
    const [x, y] = digitsOf(st.cand[p]);
    const wings = bi.filter(q => sees(p, q));
    for (const a of wings) for (const b of wings) {
      if (a >= b) continue;
      const ma = st.cand[a], mb = st.cand[b];
      // a = {x,z}, b = {y,z}
      for (const [mx, my] of [[x, y], [y, x]]) {
        if (!(ma & bit(mx)) || (ma & bit(my))) continue;
        if (!(mb & bit(my)) || (mb & bit(mx))) continue;
        const z = ma & ~bit(mx); if (z !== (mb & ~bit(my)) || POP[z] !== 1) continue;
        const el = []; for (let i = 0; i < 81; i++) if (i !== p && i !== a && i !== b && (st.cand[i] & z) && sees(i, a) && sees(i, b)) el.push([i, z]);
        const s = elimStep(st, 'xyWing', el, { cells: [p, a, b], units: [], digit: LOWBIT_D[z] });
        if (s) return s;
      }
    }
  }
  return null;
}
function fXYZWing(st) {
  for (let p = 0; p < 81; p++) {
    if (POP[st.cand[p]] !== 3) continue;
    const mp = st.cand[p];
    const wings = []; for (const q of EXCL[p]) if (POP[st.cand[q]] === 2 && (st.cand[q] & ~mp) === 0) wings.push(q);
    for (const a of wings) for (const b of wings) {
      if (a >= b) continue;
      if ((st.cand[a] | st.cand[b]) !== mp || st.cand[a] === st.cand[b]) continue;
      const z = st.cand[a] & st.cand[b]; if (POP[z] !== 1) continue;
      const el = []; for (let i = 0; i < 81; i++) if (i !== p && i !== a && i !== b && (st.cand[i] & z) && sees(i, p) && sees(i, a) && sees(i, b)) el.push([i, z]);
      const s = elimStep(st, 'xyzWing', el, { cells: [p, a, b], units: [], digit: LOWBIT_D[z] });
      if (s) return s;
    }
  }
  return null;
}
/* simple coloring (single-digit conjugate chains): color trap + color wrap */
function fColoring(st) {
  for (let d = 1; d <= 9; d++) {
    const bb = bit(d);
    const adj = new Map();
    for (let u = 0; u < UNITS.length; u++) {
      const c = UNITS[u].filter(i => st.cand[i] & bb);
      if (c.length === 2) {
        for (const [a, b] of [[c[0], c[1]], [c[1], c[0]]]) { if (!adj.has(a)) adj.set(a, new Set()); adj.get(a).add(b); }
      }
    }
    const color = new Map();
    for (const start of adj.keys()) {
      if (color.has(start)) continue;
      const comp = [start]; color.set(start, 0);
      for (let k = 0; k < comp.length; k++) for (const n of adj.get(comp[k])) if (!color.has(n)) { color.set(n, 1 - color.get(comp[k])); comp.push(n); }
      if (comp.length < 4) continue;
      const A = comp.filter(i => color.get(i) === 0), B = comp.filter(i => color.get(i) === 1);
      // wrap: two same-colored cells see each other → that color is false
      for (const [X] of [[A], [B]]) {
        let bad = false;
        for (let i = 0; i < X.length && !bad; i++) for (let j = i + 1; j < X.length; j++) if (sees(X[i], X[j])) { bad = true; break; }
        if (bad) { const s = elimStep(st, 'coloring', X.map(i => [i, bb]), { cells: comp, units: [], digit: d }); if (s) return s; }
      }
      // trap: uncolored cell seeing both colors
      const el = [];
      for (let i = 0; i < 81; i++) if ((st.cand[i] & bb) && !color.has(i) && A.some(a => sees(a, i)) && B.some(b => sees(b, i))) el.push([i, bb]);
      const s = elimStep(st, 'coloring', el, { cells: comp, units: [], digit: d });
      if (s) return s;
    }
  }
  return null;
}

/* killer: last empty cell of a cage = remaining sum */
function fCageLast(st) {
  for (let c = 0; c < CAGES.length; c++) {
    const { sum, cells } = CAGES[c];
    let empty = -1, n = 0, s = 0;
    for (const i of cells) if (!st.v[i]) { n++; empty = i; } else s += st.v[i];
    if (n !== 1) continue;
    const d = sum - s;
    if (d >= 1 && d <= 9 && (st.cand[empty] & bit(d))) return { tech: 'cageLast', place: [empty, d], cells: [empty], units: [], cage: c, digit: d };
  }
  return null;
}
/* killer: per-cell digits that fit no valid combination of the cage; then digits every
   combination needs, confined to cells that all see an outside cell */
function cageScan(st, c) {
  const { sum, cells } = CAGES[c];
  const E = []; let rem = sum, used0 = 0;
  for (const i of cells) if (st.v[i]) { rem -= st.v[i]; used0 |= bit(st.v[i]); } else E.push(i);
  if (!E.length) return null;
  const poss = new Uint16Array(E.length), asg = new Uint8Array(E.length);
  let req = ALL, any = false;
  (function dfs(k, used, r) {
    if (k === E.length) { if (r === 0) { any = true; let um = 0; for (let j = 0; j < k; j++) { poss[j] |= bit(asg[j]); um |= bit(asg[j]); } req &= um; } return; }
    let m = st.cand[E[k]] & ~used & unionOf(ALL & ~used, E.length - k, r);
    while (m) { const b = m & -m; m ^= b; asg[k] = LOWBIT_D[b]; dfs(k + 1, used | b, r - asg[k]); }
  })(0, used0, rem);
  if (!any) return null;
  return { E, poss, req };
}
function fCage(st) {
  for (let c = 0; c < CAGES.length; c++) {
    const r = cageScan(st, c); if (!r) continue;
    const el = []; r.E.forEach((i, j) => { if (st.cand[i] & ~r.poss[j]) el.push([i, ALL & ~r.poss[j]]); });
    let gone = 0; for (const [i, m] of el) gone |= st.cand[i] & m;
    const s = elimStep(st, 'cage', el, { cells: CAGES[c].cells.slice(), units: [], cage: c, digits: digitsOf(gone) });
    if (s) return s;
  }
  for (let c = 0; c < CAGES.length; c++) {
    const r = cageScan(st, c); if (!r) continue;
    for (const d of digitsOf(r.req)) {
      const bb = bit(d); const hold = r.E.filter(i => st.cand[i] & bb);
      if (!hold.length) continue;
      const el = [];
      for (let i = 0; i < 81; i++) if (CAGE_OF[i] !== c && (st.cand[i] & bb) && hold.every(h => SEE[h * 81 + i])) el.push([i, bb]);
      const s = elimStep(st, 'cage', el, { cells: hold, units: [], cage: c, digit: d });
      if (s) return s;
    }
  }
  return null;
}
/* killer: 45-rule (innies / outies). For an area made of whole units, the digits of the cells
   sticking in (innies) or out (outies) of the cages covering it have a known sum. */
let AREAS = [];
function buildAreas() {
  AREAS = [];
  if (!CAGES.length) return;
  const add = us => { const set = new Set(); for (const u of us) for (const i of UNITS[u]) set.add(i); AREAS.push({ units: us, cells: set, k: us.length }); };
  for (let u = 0; u < 27; u++) add([u]);
  for (const base of [0, 9]) for (let n = 2; n <= 3; n++) for (let a = 0; a + n <= 9; a++) { const us = []; for (let k = 0; k < n; k++) us.push(base + a + k); add(us); }
  if (SPEC.type !== 'jigsaw') for (const grp of [[0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [7, 8], [0, 3], [3, 6], [1, 4], [4, 7], [2, 5], [5, 8]]) add(grp.map(b => 18 + b));
  else for (let a = 0; a < 9; a++) for (let b = a + 1; b < 9; b++) if (UNITS[18 + a].some(i => PEERS[i].some(j => BOX[j] === b && (Math.abs(i - j) === 9 || (Math.abs(i - j) === 1 && ((i / 9) | 0) === ((j / 9) | 0)))))) add([18 + a, 18 + b]);
}
/* cells with a known total: per-cell digits that fit some assignment (distinct where cells see each other) */
function virtualScan(st, cells, sum) {
  const E = [], fixed = []; let rem = sum;
  for (const i of cells) if (st.v[i]) { rem -= st.v[i]; fixed.push(i); } else E.push(i);
  if (!E.length || E.length > 6) return null;
  const poss = new Uint16Array(E.length), asg = new Uint8Array(E.length);
  let any = false, nodes = 0;
  (function dfs(k, r) {
    if (++nodes > 20000) return;
    if (k === E.length) { if (r === 0) { any = true; for (let j = 0; j < k; j++) poss[j] |= bit(asg[j]); } return; }
    let m = st.cand[E[k]];
    for (let j = 0; j < k; j++) if (SEE[E[j] * 81 + E[k]]) m &= ~bit(asg[j]);
    for (const f of fixed) if (SEE[f * 81 + E[k]]) m &= ~bit(st.v[f]);
    while (m) { const b = m & -m; m ^= b; const d = LOWBIT_D[b]; if (d > r) break; asg[k] = d; dfs(k + 1, r - d); }
  })(0, rem);
  if (!any || nodes > 20000) return null;
  return { E, poss };
}
function fInnieOutie(st) {
  for (const A of AREAS) {
    let inSum = 0; const innies = [], over = [];
    const touched = new Set(); for (const i of A.cells) touched.add(CAGE_OF[i]);
    let outSum = 0; const outies = [];
    for (const c of touched) {
      const cg = CAGES[c]; const inside = cg.cells.filter(i => A.cells.has(i));
      if (inside.length === cg.cells.length) inSum += cg.sum;
      else { innies.push(...inside); over.push(c); outSum += cg.sum; outies.push(...cg.cells.filter(i => !A.cells.has(i))); }
    }
    const total = 45 * A.k;
    for (const [cells, sum] of [[innies, total - inSum], [outies, outSum - (total - inSum)]]) {
      if (!cells.length || cells.length > 6) continue;
      if (cells.every(i => st.v[i])) continue;
      const r = virtualScan(st, cells, sum); if (!r) continue;
      if (r.E.length === 1 && POP[r.poss[0]] === 1) {
        return { tech: 'innieOutie', place: [r.E[0], LOWBIT_D[r.poss[0]]], cells: cells.slice(), units: A.units.slice(), digit: LOWBIT_D[r.poss[0]], sum };
      }
      const el = []; r.E.forEach((i, j) => { if (st.cand[i] & ~r.poss[j]) el.push([i, ALL & ~r.poss[j]]); });
      let gone = 0; for (const [i, m] of el) gone |= st.cand[i] & m;
      const s = elimStep(st, 'innieOutie', el, { cells: cells.slice(), units: A.units.slice(), digits: digitsOf(gone), sum });
      if (s) return s;
    }
  }
  return null;
}

const FINDERS = [
  st => fFullHouse(st),
  st => (CAGES.length ? fCageLast(st) : null),
  st => fHiddenSingle(st, true),
  st => fHiddenSingle(st, false),
  st => fNakedSingle(st),
  st => (CAGES.length ? fCage(st) : null),
  st => fLocked(st),
  st => (CAGES.length ? fInnieOutie(st) : null),
  st => fNakedSubset(st, 2),
  st => fHiddenSubset(st, 2),
  st => fNakedSubset(st, 3),
  st => fHiddenSubset(st, 3),
  st => fFish(st, 2),
  st => fXYWing(st),
  st => fNakedSubset(st, 4),
  st => fFish(st, 3),
  st => fXYZWing(st),
  st => fHiddenSubset(st, 4),
  st => fColoring(st),
  st => fFish(st, 4),
];

function nextStep(st, maxLevel = 4) {
  for (const f of FINDERS) {
    const s = f(st);
    if (s) { if (TECH[s.tech].level > maxLevel) return null; return s; }
  }
  return null;
}
function applyStep(st, s) {
  if (s.place) place(st, s.place[0], s.place[1]);
  else for (const [i, m] of s.elim) st.cand[i] &= ~m;
}

/* grade a puzzle: returns { solved, level, score, counts } */
function grade(grid, maxLevel = 4) {
  const st = makeState(grid);
  let level = 1, score = 0; const counts = {};
  let empties = st.v.filter(x => !x).length;
  let guard = 2000;
  while (empties > 0 && guard--) {
    // count how many singles are available to measure "how easy to find"
    const s = nextStep(st, maxLevel);
    if (!s) return { solved: false, level: 5, score: score + 500, counts };
    const t = TECH[s.tech];
    level = Math.max(level, t.level); score += t.w; counts[s.tech] = (counts[s.tech] || 0) + 1;
    applyStep(st, s);
    if (s.place) empties--;
    for (let i = 0; i < 81; i++) if (!st.v[i] && !st.cand[i]) return { solved: false, level: 5, score: 9999, counts };
  }
  return { solved: true, level, score: Math.round(score), counts };
}
/* only naked singles count as "harder" in level 1: beginners rely on hidden singles in boxes */
function beginnerScore(counts) { return (counts.nakedSingle || 0) * 3 + (counts.hiddenSingleL || 0); }

/* hint: from the player's current grid (all entries assumed correct),
   find the easiest chain of steps leading to the next placement */
function hint(grid) {
  const st = makeState(grid);
  const pre = [];
  for (let k = 0; k < 200; k++) {
    const s = nextStep(st, 4);
    if (!s) return { pre, step: null };
    if (s.place) return { pre, step: s };
    pre.push(s); applyStep(st, s);
  }
  return { pre, step: null };
}

/* candidates of the current grid (for auto-notes) */
function candidates(grid) { return makeState(grid).cand; }

/* ---------- validity-preserving transforms (for daily puzzles from a pool) ---------- */
function transform(puzzle, rng) {
  const perm = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
  const bands = shuffle([0, 1, 2], rng), stacks = shuffle([0, 1, 2], rng);
  const rows = [], cols = [];
  for (const b of bands) { const r = shuffle([0, 1, 2], rng); for (const x of r) rows.push(b * 3 + x); }
  for (const s of stacks) { const c = shuffle([0, 1, 2], rng); for (const x of c) cols.push(s * 3 + x); }
  const tr = rng() < 0.5;
  const out = new Array(81);
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    const sr = rows[r], sc = cols[c];
    const v = tr ? puzzle[sc * 9 + sr] : puzzle[sr * 9 + sc];
    out[r * 9 + c] = v ? perm[v - 1] : 0;
  }
  return out;
}

buildGeometry(SPEC);

const API = { ROW, COL, BOX, UNITS, PEERS, CELL_UNITS, EXCL, PARITY, CAGE_OF, TECH, POP, bit, digitsOf, unitKind, unitIndex,
  setVariant, variant, solveG, mulberry32, hashStr, shuffle, parse, stringify, solve, randomFull, generate, grade, beginnerScore, hint, candidates, transform };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SudokuEngine = API;
})(typeof self !== 'undefined' ? self : this);

// shared generators for variant puzzles (used by build_variants.js)
const E = require('../engine.js');
const N4 = i => { const r = (i / 9) | 0, c = i % 9, a = []; if (r) a.push(i - 9); if (r < 8) a.push(i + 9); if (c) a.push(i - 1); if (c < 8) a.push(i + 1); return a; };

/* dig holes from a full solution under the current variant. symmetric: 180° pairs */
function dig(full, rng, { minClues = 0, symmetric = true, nodeLimit = 0 } = {}) {
  const g = full.slice();
  const order = []; if (symmetric) for (let i = 0; i <= 40; i++) order.push(i); else for (let i = 0; i < 81; i++) order.push(i);
  E.shuffle(order, rng);
  let clues = 81;
  for (const i of order) {
    const j = symmetric ? 80 - i : i, n = i === j ? 1 : 2;
    if (clues - n < minClues) continue;
    const a = g[i], b = g[j]; g[i] = 0; g[j] = 0;
    const r = E.solveG(g, 2, { nodeLimit });
    if (r.count !== 1) { g[i] = a; g[j] = b; } else clues -= n;
  }
  return g;
}

/* random jigsaw: 9 connected regions of 9 cells, admitting a solution.
   Start from the 3x3 boxes and apply random boundary swaps that keep every region connected. */
function regionConnected(reg, b) {
  let start = -1, n = 0; for (let i = 0; i < 81; i++) if (reg[i] === b) { n++; if (start < 0) start = i; }
  const seen = new Uint8Array(81), st = [start]; seen[start] = 1; let c = 1;
  while (st.length) { const x = st.pop(); for (const y of N4(x)) if (!seen[y] && reg[y] === b) { seen[y] = 1; c++; st.push(y); } }
  return c === n;
}
function jigsawRegions(rng) {
  for (;;) {
    const reg = []; for (let i = 0; i < 81; i++) reg[i] = ((((i / 9) | 0) / 3) | 0) * 3 + (((i % 9) / 3) | 0);
    const swaps = 60 + ((rng() * 60) | 0);
    for (let k = 0, guard = 0; k < swaps && guard < 20000; guard++) {
      // pick a boundary cell a (region A) next to region B, and a cell b of B next to A; swap them
      const a = (rng() * 81) | 0; const nb = N4(a).filter(n => reg[n] !== reg[a]); if (!nb.length) continue;
      const A = reg[a], B = reg[nb[(rng() * nb.length) | 0]];
      const bs = []; for (let i = 0; i < 81; i++) if (reg[i] === B && i !== a && N4(i).some(n => reg[n] === A && n !== a)) bs.push(i);
      if (!bs.length) continue;
      const b = bs[(rng() * bs.length) | 0];
      reg[a] = B; reg[b] = A;
      if (regionConnected(reg, A) && regionConnected(reg, B)) k++; else { reg[a] = A; reg[b] = B; }
    }
    let boxes = 0; for (let b = 0; b < 9; b++) { const bx = new Set(); for (let i = 0; i < 81; i++) if (reg[i] === b) bx.add(((((i / 9) | 0) / 3) | 0) * 3 + (((i % 9) / 3) | 0)); if (bx.size === 1) boxes++; }
    if (boxes > 1) continue;
    E.setVariant({ type: 'jigsaw', regions: reg });
    const r = E.solveG(new Array(81).fill(0), 1, { rng, nodeLimit: 5000 });
    if (r.count === 1) return { regions: reg, full: r.solution };
  }
}

/* killer cages over a full solution */
const SIZE_W = [[2, 0.34], [3, 0.36], [4, 0.2], [5, 0.1]];
function pickSize(rng, w) { let r = rng() * w.reduce((a, x) => a + x[1], 0); for (const [s, p] of w) { if ((r -= p) <= 0) return s; } return w[w.length - 1][0]; }
function killerCages(full, rng, sizeW = SIZE_W) {
  for (;;) {
    const cage = new Array(81).fill(-1), cages = [];
    const order = E.shuffle([...Array(81).keys()], rng);
    for (const s of order) {
      if (cage[s] >= 0) continue;
      const k = cages.length, cells = [s]; cage[s] = k; let used = E.bit(full[s]);
      const target = pickSize(rng, sizeW);
      while (cells.length < target) {
        const fr = []; for (const c of cells) for (const n of N4(c)) if (cage[n] < 0 && !(used & E.bit(full[n])) && !fr.includes(n)) fr.push(n);
        if (!fr.length) break;
        const n = fr[(rng() * fr.length) | 0]; cage[n] = k; cells.push(n); used |= E.bit(full[n]);
      }
      cages.push(cells);
    }
    // merge singletons into a neighbouring cage when possible
    for (let k = 0; k < cages.length; k++) {
      if (cages[k].length !== 1) continue;
      const s = cages[k][0];
      const opts = E.shuffle(N4(s).map(n => cage[n]).filter(j => j !== k && cages[j].length && cages[j].length < 5 && !cages[j].some(c => full[c] === full[s])), rng);
      if (opts.length) { const j = opts[0]; cages[j].push(s); cage[s] = j; cages[k] = []; }
    }
    const list = cages.filter(c => c.length);
    if (list.filter(c => c.length === 1).length > 2) continue;
    return list.map(cells => [cells.reduce((a, i) => a + full[i], 0), cells.sort((a, b) => a - b)]);
  }
}

const connected = cells => { if (!cells.length) return false; const seen = [cells[0]]; for (let k = 0; k < seen.length; k++) for (const n of N4(seen[k])) if (cells.includes(n) && !seen.includes(n)) seen.push(n); return seen.length === cells.length; };
/* split a connected cage into two connected parts; `at` ends up in the smaller part */
function splitCage(cells, at, rng) {
  const half = Math.max(1, Math.floor(cells.length / 2)); const A = [at];
  while (A.length < half) {
    const ok = cells.filter(c => !A.includes(c) && N4(c).some(n => A.includes(n)) && connected(cells.filter(x => !A.includes(x) && x !== c)));
    if (!ok.length) break; A.push(ok[(rng() * ok.length) | 0]);
  }
  const B = cells.filter(c => !A.includes(c));
  return connected(B) ? [A, B] : null;
}
/* killer cage layout with a unique solution: random cages, then split cages where a second solution differs */
function killerPuzzle(rng, sizeW, maxSingles = 3) {
  for (;;) {
    E.setVariant(null); const full = E.randomFull(rng);
    const c = killerCages(full, rng, sizeW);
    let done = false;
    for (let it = 0; it < 40 && !done; it++) {
      E.setVariant({ type: 'killer', cages: c });
      const r = E.solveG(new Array(81).fill(0), 2, { nodeLimit: 3e6, all: true });
      if (r.count === 1) { done = true; break; }
      let tgt;
      if (r.count === -1) { const big = c.reduce((a, x) => (x[1].length > a[1].length ? x : a)); tgt = big[1][(rng() * big[1].length) | 0]; }
      else {
        const s2 = r.solutions.find(s => s.join() !== full.join());
        const diffs = [...Array(81).keys()].filter(i => s2[i] !== full[i]);
        const size = i => c.find(x => x[1].includes(i))[1].length;
        diffs.sort((a, b) => size(b) - size(a) || a - b); tgt = diffs[(rng() * Math.min(3, diffs.length)) | 0];
      }
      const ci = c.findIndex(x => x[1].includes(tgt)); const cells = c[ci][1];
      if (cells.length < 2) break;
      const sp = splitCage(cells, tgt, rng); if (!sp) continue;
      c.splice(ci, 1, ...sp.map(p => [p.reduce((a, i) => a + full[i], 0), p.sort((a, b) => a - b)]));
    }
    if (!done || c.filter(x => x[1].length === 1).length > maxSingles) continue;
    c.sort((a, b) => a[1][0] - b[1][0]);
    return { cages: c, full };
  }
}
/* random full grid under the current variant (restarts on heavy-tailed searches) */
function randomSolution(rng) { for (;;) { const r = E.solveG(new Array(81).fill(0), 1, { rng, nodeLimit: 5000 }); if (r.count === 1) return r.solution; } }
module.exports = { randomSolution, dig, jigsawRegions, killerCages, killerPuzzle, splitCage, N4 };

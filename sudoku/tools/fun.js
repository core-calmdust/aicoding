// "Fun" score for human-solvable sudoku puzzles (0–100).
// Used by the puzzle builders to keep only puzzles that are not just solvable, but enjoyable:
//   • several ways in at the start (no single forced entry point)
//   • a varied mix of techniques (not the same trick over and over)
//   • a climax: the hardest step comes in the middle, then the board opens up
//   • a good flow: few long stretches where only one move is available
//   • balanced, good-looking clue layout
// Works for variants too (call E.setVariant(spec) before scoring).
// usage: const { funScore, pickFun } = require('./fun.js');
//        funScore(E, puzzle) → { fun, parts, solved }
//        pickFun(E, candidates, n, getPuzzle) → best n candidates by fun (keeps input order among equals)
'use strict';

const SINGLES = new Set(['fullHouse', 'hiddenSingleB', 'hiddenSingleL', 'nakedSingle', 'cageLast', 'bounds']);

// number of cells that can be placed right now with a single (naked or hidden)
function availableSingles(E, grid) {
  const cand = E.candidates(grid);
  const can = new Set();
  for (let i = 0; i < 81; i++) if (!grid[i] && cand[i] && !(cand[i] & (cand[i] - 1))) can.add(i);
  for (const u of E.UNITS) {
    for (let d = 0; d < 9; d++) {
      const b = 1 << d; let pos = -1, n = 0;
      for (const i of u) if (!grid[i] && (cand[i] & b)) { n++; pos = i; }
      if (n === 1) can.add(pos);
    }
  }
  return can.size;
}

function funScore(E, puzzle) {
  const grid = Array.from(puzzle);
  const steps = []; // { hard, techs, avail }
  let guard = 200;
  while (grid.some(v => !v) && guard--) {
    const avail = availableSingles(E, grid);
    const h = E.hint(grid);
    if (!h.step) return { fun: 0, solved: false, parts: {} };
    const techs = [...h.pre.map(s => s.tech), h.step.tech];
    const hard = Math.max(...techs.map(t => (E.TECH[t] || { w: 1 }).w));
    steps.push({ hard, techs, avail });
    const [i, d] = h.step.place; grid[i] = d;
  }
  const N = steps.length || 1;
  const adv = steps.flatMap(s => s.techs.filter(t => !SINGLES.has(t)));
  const singles = steps.flatMap(s => s.techs.filter(t => SINGLES.has(t)));
  const level = Math.max(1, ...steps.flatMap(s => s.techs.map(t => (E.TECH[t] || { level: 1 }).level)));

  // 1) ways in at the start (10+ placeable cells = full marks)
  const open = Math.max(0, Math.min(1, ((steps[0] ? steps[0].avail : 0) - 2) / 8));
  // 2) variety: distinct advanced techniques (or single kinds for easy puzzles), and no single trick dominating
  let variety;
  if (level === 1) variety = Math.min(1, new Set(singles).size / 3);
  else {
    const kinds = new Set(adv).size;
    const cnt = {}; adv.forEach(t => (cnt[t] = (cnt[t] || 0) + 1));
    const dom = adv.length ? Math.max(...Object.values(cnt)) / adv.length : 1;
    variety = Math.min(1, kinds / Math.min(4, level + 1)) * (dom > .75 && adv.length > 3 ? .7 : 1);
  }
  // 3) climax: hardest step in the middle 25–85 % of the solve, and the board opens up afterwards
  let climax = 1;
  if (level > 1) {
    const peak = Math.max(...steps.map(s => s.hard));
    const idx = steps.map((s, k) => (s.hard === peak ? k : -1)).filter(k => k >= 0);
    const mid = idx.filter(k => k / N >= .25 && k / N <= .85).length / idx.length;
    const last = idx[idx.length - 1];
    const after = steps.slice(last + 1, last + 6).reduce((a, s) => a + s.avail, 0) / Math.max(1, Math.min(5, N - last - 1));
    climax = .6 * mid + .4 * Math.min(1, after / 3);
  }
  // 4) flow: avoid long stretches with only one move available (tedious hunting)
  let run = 0, worst = 0, ones = 0;
  for (const s of steps) { if (s.avail <= 1) { run++; ones++; worst = Math.max(worst, run); } else run = 0; }
  const flow = Math.max(0, 1 - Math.max(0, worst - 3) / 8 - Math.max(0, ones / N - .35));
  // 5) layout: every box has a clue, clues spread evenly over rows / columns / boxes
  const per = (f) => { const c = new Array(9).fill(0); for (let i = 0; i < 81; i++) if (puzzle[i]) c[f(i)]++; return c; };
  const sd = a => { const m = a.reduce((x, y) => x + y, 0) / 9; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / 9); };
  const boxes = per(i => E.BOX[i]);
  const layout = (boxes.every(x => x > 0) ? 1 : .6) * Math.max(0, 1 - (sd(per(i => E.ROW[i])) + sd(per(i => E.COL[i])) + sd(boxes)) / 6);

  const parts = { open, variety, climax, flow, layout };
  const fun = Math.round(100 * (.18 * open + .27 * variety + .22 * climax + .2 * flow + .13 * layout));
  return { fun, solved: true, parts, level };
}

// keep the n most fun candidates; get(c) returns the puzzle array of candidate c
function pickFun(E, cands, n, get = c => c) {
  return cands.map((c, k) => ({ c, k, f: funScore(E, get(c)).fun }))
    .sort((a, b) => b.f - a.f || a.k - b.k).slice(0, n).sort((a, b) => a.k - b.k).map(x => x.c);
}

module.exports = { funScore, pickFun, availableSingles };

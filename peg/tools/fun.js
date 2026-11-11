// Peg solitaire puzzle "fun score" (0–100) — how enjoyable a puzzle is for a human, on top of being solvable
// (common rule claude/puzzle-fun-score.md: new puzzles need 70 or more; candidates ≥ 3× the number needed, best first).
// usage: node peg/tools/fun.js            → the score of every puzzle in peg/puzzles.json (by theme) + the distribution
//        node peg/tools/fun.js --list     → every puzzle with its parts
//        require('./fun.js').score(P)     → { total, parts } for a puzzle object { b, p, t, s }
//
// Each position on the stored solution line is measured with the exact solver (≤ 18 pegs): how many of its legal jumps
// still reach the finish.
//  F1 罠 (30)        the wrong jumps that look possible: mean share of dead-end jumps over the decision points of the line
//                    (positions with 2+ legal jumps), more when the first position already has traps.
//  F2 鋭さ (20)      steps where exactly one of 2+ legal jumps works (one precise jump), as a share of the line,
//                    and a near-unique start (few good first jumps among many).
//  F3 意外性 (15)    the jump a beginner tries first (greedy: lands nearest the middle, keeps the pegs together) is a
//                    dead end at the first decision point; partly when it is a dead end later on the line.
//  F4 見せ場 (15)    a run of jumps by one marble in a row on the line (the satisfying chain), longest run 3+ = full.
//  F5 すっきり (20)  one connected group, a natural number of pegs for the board (not a crowd, not a handful),
//                    and a goal hole that is not just next to where the pegs already sit.
'use strict';
const path = require('path');
const E = require('../engine.js');
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const parse = (B, P) => P.s ? P.s.split(' ').map(x => { const [f, t] = x.split('.').map(Number); return B.jumps.find(j => j[0] === f && j[2] === t); }) : [];
const arrOf = P => P.p.split('').map(Number);

// good jumps of a position (exact solver; ≤ 18 pegs)
function good(B, a, t, cache) {
  const k = a.join(''); if (cache.has(k)) return cache.get(k);
  const ms = E.moves(B, a), g = [];
  for (const j of ms) { const r = E.solve(B, E.apply(a, j), { target: t, time: 4000 }); if (r.ok) g.push(j); }
  const v = { ms, g }; cache.set(k, v); return v;
}
// a beginner's first try: land near the middle, take a peg that is not alone, keep the group together
function greedy(B, a, ms) {
  const cx = B.cells.reduce((s, c) => s + c[0], 0) / B.n, cy = B.cells.reduce((s, c) => s + c[1], 0) / B.n;
  let best = null, bv = -1e9;
  for (const j of ms) {
    const [r, c] = B.cells[j[2]], b = E.apply(a, j);
    let nb = 0; for (const [f, o, to] of B.jumps) if (f === j[2] && b[o]) nb++;
    const v = -Math.hypot(r - cx, c - cy) + nb * .6;
    if (v > bv) { bv = v; best = j; }
  }
  return best;
}
function connected(B, a) {
  const pegs = []; a.forEach((v, i) => { if (v) pegs.push(i); }); if (pegs.length < 2) return true;
  const nb = i => B.jumps.filter(j => j[0] === i).map(j => j[1]).concat(B.jumps.filter(j => j[0] === i).map(j => j[2]));   // neighbours and 2-away
  const seen = new Set([pegs[0]]), q = [pegs[0]];
  while (q.length) { const i = q.shift(); for (const k of nb(i)) if (a[k] && !seen.has(k)) { seen.add(k); q.push(k); } }
  return seen.size === pegs.length;
}
function score(P) {
  const B = E.BOARDS[P.b], t = P.t, sol = parse(B, P), cache = new Map();
  let a = arrOf(P); const n = a.reduce((s, v) => s + v, 0);
  if (n > 18 || !sol.length) return null;
  let dec = 0, trapSum = 0, sharp = 0, steps = 0, first = null, lateGreedyBad = 0;
  for (const j of sol) {
    const { ms, g } = good(B, a, t, cache);
    if (ms.length >= 2) {
      dec++; trapSum += 1 - g.length / ms.length;
      if (g.length === 1) sharp++;
      const gj = greedy(B, a, ms), bad = !g.includes(gj);
      if (!first) first = { ms: ms.length, g: g.length, greedyBad: bad }; else if (bad) lateGreedyBad++;
    }
    steps++; a = E.apply(a, j);
  }
  if (!first) first = { ms: 1, g: 1, greedyBad: false };
  // F1 traps
  const f1 = dec ? clamp(trapSum / dec / .7) * .75 + clamp((1 - first.g / first.ms) / .6) * .25 : 0;
  // F2 sharpness
  const f2 = clamp(sharp / Math.max(3, steps) / .45) * .7 + (first.ms >= 3 && first.g === 1 ? .3 : first.ms >= 3 && first.g <= 2 ? .15 : 0);
  // F3 surprise
  const f3 = first.greedyBad ? 1 : lateGreedyBad ? clamp(.35 + lateGreedyBad * .2, 0, .8) : 0;
  // F4 a chain by one marble
  let run = 1, best = 1; for (let k = 1; k < sol.length; k++) { if (sol[k][0] === sol[k - 1][2]) { run++; best = Math.max(best, run); } else run = 1; }
  const f4 = best >= 3 ? 1 : best === 2 ? .55 : .15;
  // F5 clean: one group, a natural size, a goal away from the crowd
  const a0 = arrOf(P), small = B.tri ? 5 : 6, big = B.tri ? 11 : 16;
  const size = n < small ? clamp((n - 2) / (small - 2)) : n > big ? clamp(1 - (n - big) / 6) : 1;
  const [gr, gc] = B.cells[t]; let near = 0; a0.forEach((v, i) => { if (v) { const [r, c] = B.cells[i]; if (Math.abs(r - gr) + Math.abs(c - gc) <= 1) near++; } });
  const f5 = (connected(B, a0) ? .45 : .1) + size * .35 + (near <= 2 ? .2 : near <= 3 ? .1 : 0);
  const parts = { F1: Math.round(f1 * 30), F2: Math.round(f2 * 20), F3: Math.round(f3 * 15), F4: Math.round(f4 * 15), F5: Math.round(f5 * 20) };
  const total = parts.F1 + parts.F2 + parts.F3 + parts.F4 + parts.F5;
  return { total, parts, n, steps, dec, chain: best };
}
module.exports = { score };

if (require.main === module) {
  const d = require(path.join(__dirname, '..', 'puzzles.json')), list = process.argv.includes('--list');
  for (const T of d.themes) {
    const sc = T.list.map(P => score(P)).filter(Boolean).map(r => r.total);
    if (!sc.length) { console.log(T.id, '(over 18 pegs: not scored)'); continue; }
    sc.sort((x, y) => x - y);
    console.log(T.id, 'n', sc.length, 'min', sc[0], 'med', sc[sc.length >> 1], 'max', sc[sc.length - 1], '≥70', sc.filter(x => x >= 70).length);
    if (list) T.list.forEach((P, i) => { const r = score(P); if (r) console.log('  ', i, r.total, JSON.stringify(r.parts), 'n' + r.n, 'chain' + r.chain); });
  }
}

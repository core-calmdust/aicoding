#!/usr/bin/env node
// (2026-11-27 担当E) Rebuilds the lesson b_safe (a safe move) of fanorona/lessons.json for the 3D lessons (atlas/ls-fanorona.js)
// and the 2D, to the bar of claude/lesson-quality.md ①〜⑨ (tools/lesson-verify-fanorona-ls.js safeProblem checks them):
//   neither side can capture; one paika move only leaves the opponent no capture, every other move gives one (the piece moved taken,
//   or other pieces through the point it left); 5〜14 legal moves from 3 pieces or more; the engine (fixed depths 7 and 9) puts the
//   answer first by 60 or more; not the same or one point apart (4 when crowded) as any puzzle / lesson problem / ramp under the
//   board's symmetries; the five in order of d = wrong moves + 2 × near misses (giving 1), strictly rising; problem 4 is Black's;
//   both kinds of wrong move in the lesson.
// Usage: node fanorona/tools/gen_ls_safe.js [--write] [seed]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const V = require(path.join(ROOT, 'tools/lesson-verify-fanorona-ls.js'));
const write = process.argv.includes('--write'), seed = +(process.argv.filter(a => /^\d+$/.test(a))[0] || 20261128);
function rng(s) { s = s >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const rand = rng(seed);
const E = V.engine();
function randomPos(nw, nb, side) {
  const pts = [...Array(45).keys()];
  for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
  const a = Array(45).fill('.'), me = side === 1 ? 'w' : 'b', op = side === 1 ? 'b' : 'w';
  pts.slice(0, nw).forEach(i => (a[i] = me)); pts.slice(nw, nw + nb).forEach(i => (a[i] = op));
  return { b: a.join(''), side };
}
const LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'fanorona/lessons.json'), 'utf8'));
const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'fanorona/puzzles.json'), 'utf8'));
const ID = 'b_safe';
const taken = V.pool(LS, PZ).filter(A => !A.tag.startsWith(ID + '#'));
const cands = new Map();
const nOpen = () => [...cands.values()].reduce((a, L) => a + L.filter(x => x.kinds.includes('open')).length, 0);
for (let k = 0; k < 20000000 && !(cands.size >= 7 && [...cands.values()].reduce((a, b) => a + Math.min(b.length, 3), 0) >= 21 && nOpen() >= 2); k++) {
  if (k % 1000000 === 0) console.error(k, 'open', nOpen(), [...cands.keys()].sort((a, b) => a - b).map(d => d + '×' + cands.get(d).length).join(' '));
  const side = rand() < .5 ? 1 : 2;
  const spec = randomPos(3 + Math.floor(rand() * 5), 3 + Math.floor(rand() * 6), side);
  const pos = E.Pos.from(spec); if (pos.status() !== 0 || pos.hasCaps()) continue;
  const n = pos.moves(true).length; if (n < 5 || n > 14) continue;
  const P = { s: spec };
  const r0 = V.safeProblem(P, { skipEngine: true }); if (!r0.ok) continue;   // (the pool and the engine only for the few that pass)
  const r = V.safeProblem(P, { pool: taken, skipEngine: true }); if (!r.ok) continue;
  const r2 = V.safeProblem(P, { pool: taken }); if (!r2.ok) continue;
  P.ok = [r2.best]; P.best = r2.best;
  if (!cands.has(r2.d)) cands.set(r2.d, []); cands.get(r2.d).push({ P, side, kinds: r2.kinds });
}
const ds = [...cands.keys()].sort((a, b) => a - b);
console.error('d:', ds.map(d => d + '×' + cands.get(d).length).join(' '));
if (ds.length < 5) { console.error('not enough'); process.exit(1); }
// the five: d spread from the easiest to the hardest, strictly rising; problem 4 Black's (the others White's first); one problem or
// more with an 'open' wrong move (the point the piece left lets the opponent in); no two near each other (a backtracking search)
const T = [0, 1, 2, 3, 4].map(i => ds[0] + i * (ds[ds.length - 1] - ds[0]) / 4);
const all = [].concat(...ds.map(d => cands.get(d).map(x => Object.assign(x, { d }))));
const probs = [];
const near2 = (a, b) => V.near(a.P.s, { b: b.P.s.b, side: b.P.s.side });
function pick(j, chosen) {
  if (j === 5) return chosen.some(x => x.kinds.includes('open')) ? chosen : null;
  const prev = j ? chosen[j - 1].d : -1;
  const L = all.filter(x => x.d > prev && (j !== 3 || x.side === 2) && !chosen.some(y => near2(x, y)))
    .sort((a, b) => (a.side === (j === 3 ? 2 : 1) ? 0 : 1) - (b.side === (j === 3 ? 2 : 1) ? 0 : 1) || Math.abs(a.d - T[j]) - Math.abs(b.d - T[j])).slice(0, 12);
  for (const x of L) { const r = pick(j + 1, chosen.concat([x])); if (r) return r; }
  return null;
}
const got = pick(0, []);
if (!got) { console.error('no pick'); process.exit(1); }
got.forEach(x => probs.push(x.P));
probs.forEach((P, i) => { const r = V.safeProblem(P, {}); console.error(' ', i + 1, P.s.side, P.best, 'd', r.d, r.kinds.join(',')); });
if (write) {
  LS.steps.find(s => s.id === ID).problems = probs;
  fs.writeFileSync(path.join(ROOT, 'fanorona/lessons.json'), JSON.stringify(LS));
  console.error('written');
} else console.log(JSON.stringify(probs));

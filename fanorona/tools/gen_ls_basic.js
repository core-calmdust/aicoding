#!/usr/bin/env node
// (2026-11-27 担当E) Rebuilds the basics lessons b_approach · b_withdraw · b_choose of fanorona/lessons.json for the 3D lessons
// (atlas/ls-fanorona.js) and the 2D, to the bar of claude/lesson-quality.md ①〜⑨ (tools/lesson-verify-fanorona-ls.js checks them):
//   every move a single capture step (no chain to go on), 4〜8 moves from 3 stones or more, one move takes the most (2 or more),
//   b_approach every move an approach, b_withdraw every move a withdrawal, b_choose the answer's step captures both ways and the
//   answer takes the bigger line; the engine (fixed depths 7 and 9) puts the answer first by 60 or more; 2 opponent pieces or more
//   are left; not the same or one point apart (4 when crowded) as any puzzle / lesson problem / ramp under the board's symmetries;
//   the five in order of d = wrong moves + 2 × near misses (a move taking one fewer), strictly rising; problem 4 is Black's.
// Usage: node fanorona/tools/gen_ls_basic.js [--write] [seed]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const V = require(path.join(ROOT, 'tools/lesson-verify-fanorona-ls.js'));
const write = process.argv.includes('--write'), seed = +(process.argv.filter(a => /^\d+$/.test(a))[0] || 20261127);
function rng(s) { s = s >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const rand = rng(seed);
const E = V.engine();
function randomPos(nw, nb, side) {
  const pts = [...Array(45).keys()];
  for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
  const a = Array(45).fill('.'); pts.slice(0, nw).forEach(i => (a[i] = 'w')); pts.slice(nw, nw + nb).forEach(i => (a[i] = 'b'));
  return { b: a.join(''), side };
}
const LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'fanorona/lessons.json'), 'utf8'));
const IDS = ['b_approach', 'b_withdraw', 'b_choose'];
const out = {};
const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'fanorona/puzzles.json'), 'utf8'));
const taken = V.pool(LS, PZ).filter(A => !IDS.some(id => A.tag.startsWith(id + '#')));   // ⑤ the puzzles, the other lessons and ramps, and the new problems so far
for (const id of IDS) {
  const cands = new Map();   // d → [P]
  for (let k = 0; k < 1500000 && !(cands.size >= 6 && [...cands.values()].reduce((a, b) => a + Math.min(b.length, 3), 0) >= 18); k++) {
    if (k % 100000 === 0) console.error(id, k, [...cands.keys()].sort((a, b) => a - b).map(d => d + '×' + cands.get(d).length).join(' '));
    const side = rand() < .5 ? 1 : 2;
    const spec = randomPos(5 + Math.floor(rand() * 6), 4 + Math.floor(rand() * 6), side);
    const pos = E.Pos.from(spec); if (pos.status() !== 0 || !pos.hasCaps()) continue;
    const P = { s: spec };
    const r = V.basicProblem(id, P, { pool: taken, skipEngine: true }); if (!r.ok) continue;
    const r2 = V.basicProblem(id, P, { pool: taken }); if (!r2.ok) continue;
    P.ok = [r2.best]; P.best = r2.best;
    if (!cands.has(r2.d)) cands.set(r2.d, []); cands.get(r2.d).push({ P, side });
  }
  const ds = [...cands.keys()].sort((a, b) => a - b);
  console.error(id, 'd:', ds.map(d => d + '×' + cands.get(d).length).join(' '));
  if (ds.length < 5) { console.error('not enough'); process.exit(1); }
  // five rising d spread over the range; problem 4 Black's, the others White's when there is a choice
  const pickD = [0, 1, 2, 3, 4].map(i => ds[Math.round(i * (ds.length - 1) / 4)]);
  for (let i = 1; i < 5; i++) if (pickD[i] <= pickD[i - 1]) pickD[i] = ds.find(d => d > pickD[i - 1]);
  const probs = [];
  pickD.forEach((d, i) => {
    const L = cands.get(d), want = i === 3 ? 2 : 1;
    const c = L.find(x => x.side === want && V.basicProblem(id, x.P, { pool: taken.concat(probs.map(p => ({ tag: 'new', b: p.s.b, side: p.s.side }))) }).ok) || L.find(x => V.basicProblem(id, x.P, { pool: taken.concat(probs.map(p => ({ tag: 'new', b: p.s.b, side: p.s.side }))) }).ok);
    if (!c) { console.error('no pick at d', d); process.exit(1); }
    probs.push(c.P);
  });
  probs.forEach(P => taken.push({ tag: 'new ' + id, b: P.s.b, side: P.s.side }));
  out[id] = probs;
  probs.forEach((P, i) => console.error(' ', i + 1, P.s.side, P.best, 'd', V.basicProblem(id, P, {}).d));
}
if (write) {
  for (const st of LS.steps) if (out[st.id]) st.problems = out[st.id];
  fs.writeFileSync(path.join(ROOT, 'fanorona/lessons.json'), JSON.stringify(LS));
  console.error('written');
} else console.log(JSON.stringify(out));

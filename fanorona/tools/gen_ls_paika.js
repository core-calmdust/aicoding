#!/usr/bin/env node
// (2026-11-27 担当E) Rebuilds the lesson t_paika (choosing a paika) of fanorona/lessons.json for the 3D lessons (atlas/ls-fanorona.js)
// and the 2D, to the bar of claude/lesson-quality.md ①〜⑨ (tools/lesson-verify-fanorona-ls.js paikaProblem checks them):
//   neither side can capture; one paika move gives the opponent nothing and, whatever the opponent's reply, leaves you a capture;
//   every problem has a wrong move that is safe but sets up nothing or a capture the opponent can stop (more than b_safe); the engine
//   first at depths 7 and 9 and 60 or more above the second; 5〜16 legal moves from 3 pieces or more; not near any puzzle / lesson
//   problem / ramp under the board's symmetries; the five in order of d strictly rising; problem 4 Black's; give · none · block in the
//   lesson (a set-up the opponent stops in two problems or more), five different answers.
// Usage: node fanorona/tools/gen_ls_paika.js [--write] [seed]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const V = require(path.join(ROOT, 'tools/lesson-verify-fanorona-ls.js'));
const write = process.argv.includes('--write'), seed = +(process.argv.filter(a => /^\d+$/.test(a))[0] || 20261201);
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
const ID = 't_paika';
const taken = V.pool(LS, PZ).filter(A => !A.tag.startsWith(ID + '#'));
const cands = new Map();
const has = k => [...cands.values()].reduce((a, L) => a + L.filter(x => x.kinds.includes(k)).length, 0);
const MAXK = +(process.env.MAXK || 1500000);
for (let k = 0; k < MAXK && !(cands.size >= 8 && [...cands.values()].reduce((a, b) => a + Math.min(b.length, 3), 0) >= 24 && has('none') >= 3 && has('block') >= 3); k++) {
  if (k % 500000 === 0) console.error(k, [...cands.keys()].sort((a, b) => a - b).map(d => d + '×' + cands.get(d).length).join(' '));
  const side = rand() < .5 ? 1 : 2;
  const spec = randomPos(4 + Math.floor(rand() * 6), 4 + Math.floor(rand() * 6), side);
  const pos = E.Pos.from(spec); if (pos.status() !== 0 || pos.hasCaps() || E.Pos.from({ b: spec.b, side: 3 - side }).hasCaps()) continue;
  const n = pos.moves(true).length; if (n < 5 || n > 16) continue;
  const P = { s: spec };
  const r0 = V.paikaProblem(P, { skipEngine: true }); if (!r0.ok) continue;
  const r = V.paikaProblem(P, { pool: taken, skipEngine: true }); if (!r.ok) continue;
  const r2 = V.paikaProblem(P, { pool: taken }); if (!r2.ok) continue;
  if (!V.paikaProblem(P, { pool: taken }).ok || V.values(spec, 9)[0].v < -300) continue;   // (twice: the engine's values move a little from run to run; and no lost position — the engine's order there is not stable)
  P.ok = [r2.best]; P.best = r2.best;
  if (!cands.has(r2.d)) cands.set(r2.d, []); cands.get(r2.d).push({ P, side, kinds: r2.kinds });
}
const ds = [...cands.keys()].sort((a, b) => a - b);
console.error('d:', ds.map(d => d + '×' + cands.get(d).length).join(' '));
if (ds.length < 5) { console.error('not enough'); process.exit(1); }
const T = [0, 1, 2, 3, 4].map(i => ds[0] + i * (ds[ds.length - 1] - ds[0]) / 4);
const all = [].concat(...ds.map(d => cands.get(d).map(x => Object.assign(x, { d }))));
const near2 = (a, b) => V.near(a.P.s, { b: b.P.s.b, side: b.P.s.side });
function pick(j, chosen) {
  if (j === 5) { const K = new Set([].concat(...chosen.map(x => x.kinds))); return K.has('give') && K.has('none') && chosen.filter(x => x.kinds.includes('block')).length >= 2 && new Set(chosen.map(x => x.P.best)).size === 5 ? chosen : null; }
  const prev = j ? chosen[j - 1].d : -1;
  const L = all.filter(x => x.d > prev && !chosen.some(y => y.P.best === x.P.best) && (j !== 3 || x.side === 2) && !chosen.some(y => near2(x, y)))
    .sort((a, b) => (a.side === (j === 3 ? 2 : 1) ? 0 : 1) - (b.side === (j === 3 ? 2 : 1) ? 0 : 1) || Math.abs(a.d - T[j]) - Math.abs(b.d - T[j])).slice(0, 20);
  for (const x of L) { const r = pick(j + 1, chosen.concat([x])); if (r) return r; }
  return null;
}
const got = pick(0, []);
if (!got) { console.error('no pick'); process.exit(1); }
const probs = got.map(x => x.P);
probs.forEach((P, i) => { const r = V.paikaProblem(P, {}); console.error(' ', i + 1, P.s.side, P.best, 'd', r.d, r.n, [...new Set(r.kinds)].join(',')); });
if (write) {
  LS.steps.find(s => s.id === ID).problems = probs;
  fs.writeFileSync(path.join(ROOT, 'fanorona/lessons.json'), JSON.stringify(LS));
  console.error('written');
} else console.log(JSON.stringify(probs));

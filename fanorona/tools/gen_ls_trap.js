#!/usr/bin/env node
// (2026-11-28 担当C) Rebuilds the lesson e_trap (shut every way out — the only way to win) of fanorona/lessons.json for the 3D lessons
// (atlas/ls-fanorona.js) and the 2D, to the bar of claude/lesson-quality.md ①〜⑨ (tools/lesson-verify-fanorona-ls.js trapProblem
// checks them): an endgame (the opponent has 1 or 2 pieces) where neither side can capture; one paika move gives the opponent
// nothing and, whichever reply the opponent plays, leaves you a move taking every piece it has left; every problem has a safe wrong
// move that leaves a way out; the engine first at depths 7 and 9 with a won value and no other move winning anyway; 5〜16 legal
// moves from 3 pieces or more; not near any puzzle / lesson problem / ramp under the board's symmetries; the five in order of d
// strictly rising; problem 4 Black's; give · run and both 1 and 2 opponent pieces in the lesson, five different answers.
// Usage: node fanorona/tools/gen_ls_trap.js [--write] [seed]   (CANDS=<file of candidate lines> to pick from a saved search)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const V = require(path.join(ROOT, 'tools/lesson-verify-fanorona-ls.js'));
const write = process.argv.includes('--write'), seed = +(process.argv.filter(a => /^\d+$/.test(a))[0] || 20261128);
function rng(s) { s = s >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const rand = rng(seed);
const E = V.engine();
function randomPos(nm, no, side) {
  const pts = [...Array(45).keys()];
  for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
  const a = Array(45).fill('.'), me = side === 1 ? 'w' : 'b', op = side === 1 ? 'b' : 'w';
  pts.slice(0, nm).forEach(i => (a[i] = me)); pts.slice(nm, nm + no).forEach(i => (a[i] = op));
  return { b: a.join(''), side };
}
const LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'fanorona/lessons.json'), 'utf8'));
const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'fanorona/puzzles.json'), 'utf8'));
const ID = 'e_trap';
const taken = V.pool(LS, PZ).filter(A => !A.tag.startsWith(ID + '#'));
const all = [];
const MAXK = +(process.env.MAXK || 3000000), NEED = +(process.env.NEED || 60);
if (process.env.CANDS) fs.readFileSync(process.env.CANDS, 'utf8').split('\n').filter(Boolean).forEach(l => { const P = JSON.parse(l); const r = V.trapProblem(P, { pool: taken }); if (r.ok) all.push({ P, side: P.s.side, kinds: r.kinds, d: r.d, no: r.no }); });
else for (let k = 0; k < MAXK && all.length < NEED; k++) {
  if (k % 200000 === 0) console.error(k, all.length);
  const side = rand() < .5 ? 1 : 2;
  const spec = randomPos(3 + Math.floor(rand() * 3), 1 + Math.floor(rand() * 2), side);
  const pos = E.Pos.from(spec); if (pos.status() !== 0 || pos.hasCaps() || E.Pos.from({ b: spec.b, side: 3 - side }).hasCaps()) continue;
  const n = pos.moves(true).length; if (n < 5 || n > 16) continue;
  const P = { s: spec };
  if (!V.trapProblem(P, { skipEngine: true }).ok) continue;
  const r = V.trapProblem(P, { pool: taken }); if (!r.ok) continue;
  P.ok = [r.best]; P.best = r.best;
  all.push({ P, side, kinds: r.kinds, d: r.d, no: r.no });
  if (process.env.SAVE) fs.appendFileSync(process.env.SAVE, JSON.stringify(P) + '\n');
}
console.error('candidates', all.length, 'd:', [...new Set(all.map(x => x.d))].sort((a, b) => a - b).join(' '));
const ds = all.map(x => x.d).sort((a, b) => a - b); if (ds.length < 5) { console.error('not enough'); process.exit(1); }
const T = [0, 1, 2, 3, 4].map(i => ds[0] + i * (ds[ds.length - 1] - ds[0]) / 4);
const near2 = (a, b) => V.near(a.P.s, { b: b.P.s.b, side: b.P.s.side });
function pick(j, chosen) {
  if (j === 5) { const K = new Set([].concat(...chosen.map(x => x.kinds))), N = new Set(chosen.map(x => x.no)); return K.has('give') && K.has('run') && N.has(1) && N.has(2) && new Set(chosen.map(x => x.P.best)).size === 5 ? chosen : null; }
  const prev = j ? chosen[j - 1].d : -1;
  const L = all.filter(x => x.d > prev && (j !== 3 || x.side === 2) && !chosen.some(y => y.P.best === x.P.best || near2(x, y)))
    .sort((a, b) => (a.side === (j === 3 ? 2 : 1) ? 0 : 1) - (b.side === (j === 3 ? 2 : 1) ? 0 : 1) || Math.abs(a.d - T[j]) - Math.abs(b.d - T[j])).slice(0, 20);
  for (const x of L) { const r = pick(j + 1, chosen.concat([x])); if (r) return r; }
  return null;
}
const got = pick(0, []);
if (!got) { console.error('no pick'); process.exit(1); }
const probs = got.map(x => x.P);
probs.forEach((P, i) => { const r = V.trapProblem(P, {}); console.error(' ', i + 1, P.s.side, P.best, 'd', r.d, r.n, 'opp', r.no, 'replies', r.rn, [...new Set(r.kinds)].join(',')); });
if (write) {
  LS.steps.find(s => s.id === ID).problems = probs;
  fs.writeFileSync(path.join(ROOT, 'fanorona/lessons.json'), JSON.stringify(LS));
  console.error('written');
} else console.log(JSON.stringify(probs));

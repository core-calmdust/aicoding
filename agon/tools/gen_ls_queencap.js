#!/usr/bin/env node
// (2026-11-27 担当F) candidates for the lesson s_queencap (capture the queen on the throne): the enemy queen on the throne, both
// sides' seven pieces scattered (rings 1-4 mostly), a normal move turn. Kept when exactly one move captures the queen (and only
// her), 10 legal moves or more, a move into ring 1 that does not capture her (the meaningful mistake), no move ends the game, no
// piece uncaptured between two enemy pieces in a line (never in a real game). Prints JSON lines { s, ans, L, wrong, near, d }.
// Usage: node agon/tools/gen_ls_queencap.js [count] [seed]
'use strict';
const E = require('../engine.js'); E.setRule('std');
const N = 91, C = E.CENTER;
let seed = +(process.argv[3] || 7); const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const want = +(process.argv[2] || 3000);
const byRing = [[], [], [], [], [], []]; for (let i = 0; i < N; i++) byRing[E.RING[i]].push(i);
function pick(used, rw) { for (;;) { let x = rnd() * rw.reduce((a, b) => a + b, 0), k = 0; while (x > rw[k]) { x -= rw[k]; k++; } const L = byRing[k]; const c = L[(rnd() * L.length) | 0]; if (!used.has(c)) { used.add(c); return c; } } }
function analyse(spec) {
  const p = E.Pos.from(spec); const me = p.side + 1;
  if (p.phase() !== 'move' || E.judge(p).over) return null;
  for (let i = 0; i < N; i++) if (p.at(i) && i !== C && p.trapped(i, p.owner(i))) return null;
  const L = p.moves(); if (L.length < 10) return null;
  const qc = L.filter(m => p.capsOf(m).some(x => p.isQueen(x)));
  if (qc.length !== 1 || p.capsOf(qc[0]).length !== 1) return null;
  if (L.some(m => E.judge(p.clone().play(m)).over)) return null;
  const touch = L.filter(m => m !== qc[0] && E.RING[E.mTo(m)] === 1 && !p.capsOf(m).length);
  const guard = L.filter(m => m !== qc[0] && p.capsOf(m).length);
  if (!touch.length) return null;
  const near = touch.length + guard.length, wrong = L.length - 1;
  return { s: spec, ans: qc[0], L: L.length, wrong, touch: touch.length, guard: guard.length, near, d: wrong + 2 * near };
}
let n = 0, tries = 0;
while (n < want && tries < want * 4000) {
  tries++;
  const side = rnd() < 0.5 ? 1 : 2, me = side, en = 3 - side;
  const b = Array(N).fill('.'), used = new Set([C]);
  b[C] = en === 1 ? 'W' : 'B';
  const G = c => (c === 1 ? 'w' : 'b'), Qn = c => (c === 1 ? 'W' : 'B');
  b[pick(used, [0, 0, 2, 3, 2, 1])] = Qn(me);
  for (let k = 0; k < 6; k++) b[pick(used, [0, 2, 4, 3, 2, 1])] = G(me);
  for (let k = 0; k < 6; k++) b[pick(used, [0, 3, 3, 3, 2, 1])] = G(en);
  const r = analyse({ b: b.join(''), side, n: 40 });
  if (r) { console.log(JSON.stringify(r)); n++; }
}

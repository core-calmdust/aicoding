// Independent check of checkers/puzzles.json, without the WebAssembly engine: a plain exhaustive search over engine.js's
// move generator (memoised), with the same goals as engine.c puzzle():
//   win  — within n own moves the opponent is to move and has no legal move;
//   gain — within n own moves the opponent is to move, has no capture, and our piece lead grew by g (or it cannot move).
// Each puzzle must have exactly one first move that reaches the goal in n own moves, no first move that reaches it sooner,
// and that move must be the stored answer. Also: legal position, ≥ 2 legal moves, version / ids / mig sanity.
// usage: node tools/pzverify.js [puzzles.json]
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const file = process.argv[2] || path.join(__dirname, '..', 'puzzles.json');
const D = JSON.parse(fs.readFileSync(file, 'utf8'));
const lead = (p, me) => p.count(me) - p.count(3 - me);
function solver(me, g, base) {
  const memo = new Map();
  const key = (p, k, a) => p.b + ',' + p.w + ',' + p.k + ',' + p.side + ',' + k + a;
  function def(p, k) {   // defender to move, attacker has k moves left
    const L = p.moves();
    if (!L.length) return true;
    if (g && !p.hasCaps() && lead(p, me) - base >= g) return true;
    if (k <= 0) return false;
    const h = key(p, k, 'd'); if (memo.has(h)) return memo.get(h);
    let r = true; for (const m of L) if (!att(p.clone().play(m), k)) { r = false; break; }
    memo.set(h, r); return r;
  }
  function att(p, k) {
    if (k <= 0) return false;
    const L = p.moves(); if (!L.length) return false;
    const h = key(p, k, 'a'); if (memo.has(h)) return memo.get(h);
    let r = false; for (const m of L) if (def(p.clone().play(m), k - 1)) { r = true; break; }
    memo.set(h, r); return r;
  }
  return { def, att };
}
let bad = 0, n = 0; const t0 = Date.now();
const fail = (id, why) => { bad++; console.log('FAIL', id, why); };
const ids = new Set();
for (const T of D.themes) {
  if (ids.has(T.id)) fail(T.id, 'duplicate theme id'); ids.add(T.id);
  T.puzzles.forEach((P, j) => {
    const id = T.id + '-' + j; n++;
    const b = P.s.b, g = P.g || T.g || 0;
    if (b.length !== 32 || /[^.bBwW]/.test(b)) return fail(id, 'bad board');
    if (/b/.test(b.slice(28)) || /w/.test(b.slice(0, 4))) return fail(id, 'man on its crowning row');
    const pos = E.Pos.from(P.s), me = P.s.side, L = pos.moves();
    if (L.length < 2) return fail(id, 'forced');
    const S = solver(me, g, lead(pos, me));
    const need = L.map(m => { const q = pos.clone().play(m); for (let k = 1; k <= P.n; k++) if (S.def(q, k - 1)) return k; return 0; });
    const best = Math.min(...need.filter(x => x > 0));
    const sols = L.filter((m, i) => need[i] === P.n);
    if (best < P.n) return fail(id, 'shorter solution in ' + best);
    if (sols.length !== 1) return fail(id, sols.length + ' solutions');
    if (sols[0] !== P.answer) return fail(id, 'answer differs');
  });
}
if (D.mig) for (const [k, v] of Object.entries(D.mig)) { const [tid, j] = v.replace(/^~/, '').split('-'); const T = D.themes.find(x => x.id === tid); if (!T || !T.puzzles[+j]) fail('mig ' + k, 'target ' + v); }
const boards = new Set(); for (const T of D.themes) for (const P of T.puzzles) { const k = P.s.b + P.s.side; if (boards.has(k)) fail(k, 'duplicate position'); boards.add(k); }
console.log(`${n} puzzles, ${bad} failures, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
process.exit(bad ? 1 : 0);

// (2026-11-24 lesson loop 第2期) new problems for the basics b_cap / b_hostile (tafl/lessons.json), found at random and kept only when
// they pass the strict checks of tools/lesson-verify.js tafl: the goal set is the answer, the theme's anvil (a piece / the king for
// b_cap, a corner / the empty throne for b_hostile), no win or threat to win, far (≥6 squares, 8 symmetries) from every position
// the game shows, and the wanted shape: who moves, what the man is taken against, the approach along the capture line or from the side.
// node tafl/tools/gen_basics_v2.js <step> <side 1|2> <anvil 駒|王|角|玉座> <par|perp> <dMin> <dMax> [seed]
const fs = require('fs'), path = require('path');
const E = require('../engine.js'), L = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'lessons.json'), 'utf8')), PZ = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles.json'), 'utf8'));
const [step, side, anvil, appr, dMin, dMax, sd] = process.argv.slice(2); let seed = +(sd || 7);
const rnd = k => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return (seed >>> 8) % k; };
const n = 11, F = E.geo('copenhagen').F, CORNER = i => !!(F[i] & 2), THRONE = i => !!(F[i] & 4), EDGE = i => !!(F[i] & 1);
const pool = []; L.steps.forEach(st => { st.problems.forEach(q => pool.push(q.s.b)); if (st.diagram) pool.push(st.diagram.s.b); (st.ramp || []).forEach(r => r.s && pool.push(r.s.b)); });
PZ.themes.forEach(th => th.puzzles.forEach(q => pool.push(q.s.b)));
const SYM = [(r, c) => [r, c], (r, c) => [r, 10 - c], (r, c) => [10 - r, c], (r, c) => [10 - r, 10 - c], (r, c) => [c, r], (r, c) => [c, 10 - r], (r, c) => [10 - c, r], (r, c) => [10 - c, 10 - r]];
const dist = (a, b) => { let best = 99; for (const S of SYM) { let d = 0; for (let i = 0; i < 121 && d < best; i++) { const [r, c] = S((i / 11) | 0, i % 11); if (a[i] !== b[r * 11 + c]) d++; } best = Math.min(best, d); } return best; };
const anv = (p, m) => { const t = E.mTo(m), q = p.clone().play(m); return q.lastCaps.map(c => { const o = 2 * c - t, x = p.at(o); return CORNER(o) ? '角' : THRONE(o) && !x ? '玉座' : x === 3 ? '王' : x ? '駒' : '?'; }); };
const par = m => { const f = E.mFrom(m), t = E.mTo(m), q = t; return f; };
for (let tries = 0; tries < 3e6; tries++) {
  const b = Array(121).fill('.'); let k; do { k = rnd(121); } while (F[k] & 2 || EDGE(k) || THRONE(k));
  b[k] = 'k'; const na = 5 + rnd(7), nd = 2 + rnd(4);
  const put = ch => { for (let t = 0; t < 50; t++) { const i = rnd(121); if (b[i] === '.' && !(F[i] & 2) && !THRONE(i)) { b[i] = ch; return; } } };
  for (let i = 0; i < na; i++) put('a'); for (let i = 0; i < nd; i++) put('d');
  const sp = { v: 'copenhagen', b: b.join(''), side: +side }, p = E.Pos.from(sp), me = p.turn, all = p.moves();
  if (p.res || all.length < 20 || p.kingLines().length) continue;
  const caps = all.filter(m => p.clone().play(m).lastCaps.length); if (caps.length < 1 || caps.length > 2) continue;
  if (all.some(m => p.clone().play(m).res)) continue;
  { const q = p.clone(); q.turn = 3 - me; q.res = 0; const om = q.moves(); if (!om.length || om.some(m => q.clone().play(m).res === 3 - me) || q.kingLines().length) continue; }
  const want = anvil === '駒' || anvil === '王' ? ['駒', '王'] : ['角', '玉座'];
  if (!caps.every(m => anv(p, m).every(x => want.includes(x)))) continue;
  const A = caps[0], ka = anv(p, A); if (ka.length !== 1 || ka[0] !== anvil) continue;
  if (caps.length === 2 && step === 'b_hostile') continue;
  const f = E.mFrom(A), t = E.mTo(A), c = p.clone().play(A).lastCaps[0];
  const isPar = (Math.floor(f / n) === Math.floor(t / n)) === (Math.floor(c / n) === Math.floor(t / n));
  if ((appr === 'par') !== isPar) continue;
  if (p.at(f) === 3 && anvil !== '王') continue;   // (the mover is a man)
  const near = all.filter(m => !caps.includes(m)).filter(m => { const q = p.clone(); q.b[E.mTo(m)] = q.b[E.mFrom(m)]; q.b[E.mFrom(m)] = 0; return q.nb(E.mTo(m)).some(i => (me === 1 ? q.at(i) === 2 : q.at(i) === 1)); }).length;
  if (near < +dMin || near > +dMax) continue;
  if (pool.some(x => dist(sp.b, x) < 6)) continue;
  console.log(JSON.stringify({ s: sp, ok: caps, best: A }), '//', caps.map(m => E.name(p, m)).join(' '), 'd', near, 'legal', all.length);
  process.exit(0);
}
console.error('none');

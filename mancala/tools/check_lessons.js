// Verifies the warm-up ramps (lessons.json step.ramp, from tools/ramps.js) with the engine (Kalah rules):
// boards hold 48 seeds, explain sequences are legal, each 'try' answer set = exactly the pits within 0.5 of the engine's
// best value with every other pit at least 3 seeds worse, the taught concept holds, all 10 languages present.
// node tools/check_lessons.js
'use strict';
const path = require('path'), E = require('../engine.js'), D = require('../lessons.json'), { RAMPS, LANGS } = require('./ramps.js');
let bad = 0, n = 0;
const fail = (id, m) => { bad++; console.log('NG', id, m); };
const txt = (id, o, k) => { for (const l of LANGS) if (!o || typeof o[l] !== 'string' || !o[l]) fail(id, `missing ${k}.${l}`); };
for (const k in D.rampUi || {}) txt('ui', D.rampUi[k], k);
for (const st of D.steps) for (const [j, it] of (st.ramp || []).entries()) {
  const id = st.id + '#' + j, rules = st.rules || D.rules || 'kalah', want = RAMPS[st.id][j].want; n++;
  if (it.b.length !== 14 || it.b.reduce((a, x) => a + x, 0) !== 48) fail(id, 'board must hold 48 seeds');
  const b = Int8Array.from(it.b), tr = k => E.trace(b, 0, k, rules), L = E.legal(b, 0);
  for (const m of [].concat(it.marks || [], it.look || [])) { const q = Array.isArray(m) ? m[0] : m; if (!(q >= 0 && q <= 13)) fail(id, 'mark ' + q); }
  if (it.k === 'explain') {
    let bb = Int8Array.from(it.b), side = 0;
    for (const p of it.seq) { if (side !== 0 || !E.legal(bb, 0).includes(p - 1)) { fail(id, 'seq not playable at pit ' + p); break; } const r = E.play(bb, 0, p - 1, E.RULES[rules]); side = r.extra ? 0 : 1; }
    txt(id, it.t, 't'); txt(id, it.body, 'body');
  } else { txt(id, it.g, 'g'); txt(id, it.h, 'h'); txt(id, it.y, 'y'); }
  const first = it.k === 'explain' ? [it.seq[0]] : it.ok;
  // the concept
  const ex = L.filter(k => tr(k).extra).map(k => k + 1), cp = L.filter(k => tr(k).cap).map(k => k + 1);
  if (want === 'extra' && !first.every(p => ex.includes(p))) fail(id, 'answer is not an extra turn');
  if (want === 'cap' && !first.every(p => cp.includes(p))) fail(id, 'answer is not a capture');
  if (want === 'chain' && !(ex.length >= 2 && first.every(p => p === Math.max(...ex)))) fail(id, 'answer is not the nearest of several extra-turn pits');
  if (want === 'defend') { const th = E.legal(b, 1).map(k => E.trace(b, 1, k, rules)).filter(t => t.cap >= 3); if (!th.length || !first.every(p => th.every(t => t.capFrom === p - 1))) fail(id, 'answer does not empty the threatened pit'); }
  // engine
  const r = E.analyze(it.b, 0, rules, 4000, 40), V = r.list.slice().sort((a, b) => b.v - a.v), best = V[0].v;
  const good = V.filter(x => x.v >= best - 0.5).map(x => x.m + 1).sort(), close = V.filter(x => x.v < best - 0.5 && x.v > best - 3);
  if (good.join() !== first.slice().sort().join()) fail(id, `answer ${first} but engine best ${good} (${V.map(x => (x.m + 1) + ':' + x.v.toFixed(1)).join(' ')})`);
  if (close.length) fail(id, 'pits too close to the best: ' + close.map(x => (x.m + 1) + ':' + x.v.toFixed(1)).join(' '));
  console.log('ok', id, first.join(','), 'depth', r.depth, V.map(x => (x.m + 1) + ':' + x.v.toFixed(1)).join(' '));
}
console.log(bad ? `${bad} problem(s)` : `all ${n} ramp items OK`);
process.exit(bad ? 1 : 0);

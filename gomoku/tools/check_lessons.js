// Verifies the warm-up ramps (lessons.json step.ramp, written by tools/ramps.js) with the engine:
// every position is legal and not over, each 'try' item's ok list equals the set of moves that reach its goal
// (five / block / block-three / sfour / fourthree / win (solver, within T) / defend (no opponent win within T) / forbid),
// and every text exists in 10 languages.  node tools/check_lessons.js [--quiet]
'use strict';
const E = require('../engine.js'), path = require('path');
const { sqOf, sqName, M2I, I2M, C } = E, N = 15;
const LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
const cells = s => String(s || '').split(/\s+/).filter(Boolean).map(sqOf);
function setup(it) { return E.setup(it.rule || 'renju', { b: cells(it.b), w: cells(it.w), side: it.side || 1 }); }
const fiveAt = (pos, m, c) => { const i = M2I[m]; return pos.b[i] === 0 && pos.cls[c][i] === C.FIVE; };
const fives = (pos, c) => { const o = []; for (let m = 0; m < N * N; m++) if (fiveAt(pos, m, c)) o.push(m); return o; };
// straight four after c plays m: two different five points
function after(pos, m, f) { pos.make(m); const r = f(pos); pos.unmake(); return r; }
function goalSet(it) {
  const pos = setup(it), me = pos.side, op = 3 - me, out = [];
  const legal = it.goal === 'forbid' || it.goal === 'win' ? [] : pos.legal();
  const T = it.T || 5;
  for (const m of legal) {
    let hit = false;
    switch (it.goal) {
      case 'five': hit = fiveAt(pos, m, me); break;
      case 'block': hit = fives(pos, op).includes(m); break;
      case 'block3': hit = after(pos, m, p => { for (let q = 0; q < N * N; q++) { if (!p.isLegal(q)) continue; p.make(q); const n = fives(p, op).length; p.unmake(); if (n >= 2) return false; } return true; }); break;
      case 'sfour': hit = after(pos, m, p => fives(p, me).length >= 2); break;
      case 'four': hit = after(pos, m, p => fives(p, me).length === 1); break;
      case 'fourthree': hit = pos.cls[me][M2I[m]] === C.F43; break;
      case 'defend': hit = after(pos, m, p => { const S = new E.Solver(); S.limit = 1e6; return !S.winIn(p, T); }); break;
    }
    if (hit) out.push(sqName(m));
  }
  if (it.goal === 'win') { const S = new E.Solver(); S.limit = 4e6; S.foursOnly = !!it.vcf; for (const e of S.attackList(pos, T)) if (e.need && e.need <= T) out.push(sqName(I2M[e.i])); }
  if (it.goal === 'forbid') for (const f of pos.forbiddenList()) out.push(sqName(f.m));
  return out.sort();
}
module.exports = { goalSet, setup };
if (require.main === module) {
  const D = require(path.join(__dirname, '..', 'lessons.json')), quiet = process.argv.includes('--quiet');
  let bad = 0, n = 0;
  const fail = (id, m) => { bad++; console.log('NG', id, m); };
  const txt = (id, o, k) => { for (const l of LANGS) if (!o || typeof o[l] !== 'string' || !o[l]) fail(id, `missing ${k}.${l}`); };
  for (const k in D.rampUi || {}) txt('ui', D.rampUi[k], k);
  for (const s of D.steps) for (const [j, it] of (s.ramp || []).entries()) {
    const id = s.id + '#' + j; n++;
    let pos; try { pos = setup(it); } catch (e) { fail(id, 'bad position ' + e.message); continue; }
    if (pos.status().over) fail(id, 'game already over');
    for (const [q] of it.marks || []) if (sqOf(q) < 0) fail(id, 'mark ' + q);
    if (it.seq) { const p = setup(it); for (const q of it.seq) { if (!p.isLegal(sqOf(q))) { fail(id, 'illegal seq move ' + q); break; } p.make(sqOf(q)); } if (it.seqWin && !p.lastFive()) fail(id, 'seq does not end in five'); }
    if (it.k === 'explain') { txt(id, it.t, 't'); txt(id, it.body, 'body'); continue; }
    txt(id, it.g, 'g'); txt(id, it.h, 'h'); txt(id, it.y, 'y');
    const want = goalSet(it), ok = it.ok.slice().sort();
    if (want.join() !== ok.join()) fail(id, `ok ${ok.join(',')} but ${it.goal} gives ${want.join(',')}`);
    if (it.goal !== 'forbid') for (const q of it.ok) if (!pos.isLegal(sqOf(q))) fail(id, 'illegal ' + q);
    if (!quiet) console.log('ok', id, it.goal, ok.join(','));
  }
  console.log(bad ? `${bad} problem(s)` : `all ${n} ramp items OK`);
  process.exit(bad ? 1 : 0);
}

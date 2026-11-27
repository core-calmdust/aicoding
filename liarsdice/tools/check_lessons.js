// lessons: run every generator many times; each problem must have exactly one right option, options must differ,
// and the stated right answer must match an independent recomputation. node liarsdice/tools/check_lessons.js
'use strict';
const path = require('path'); require(path.join(__dirname, '..', 'engine.js')); require(path.join(__dirname, '..', 'lessons.js'));
const LD = globalThis.LD, L = globalThis.LdLessonGen;
let bad = 0, n = 0; const fail = (m, q) => { bad++; if (bad < 15) console.log('FAIL', m, JSON.stringify(q)); };
const lab = o => o.bid ? o.bid.q + 'x' + o.bid.f : o.s;
for (const id of Object.keys(L.GEN)) {
  for (let k = 0; k < 3000; k++) {
    const q = L.GEN[id](); if (!q) continue; n++;
    const labs = q.opts.map(lab);
    if (new Set(labs).size !== labs.length) fail(id + ': duplicate options', q);
    if (!(q.ans >= 0 && q.ans < q.opts.length)) fail(id + ': no answer', q);
    // recompute
    if (id === 'expect') { const v = q.v.u * (q.k.endsWith('.w') ? 1 / 3 : 1 / 6); if (Math.abs(+labs[q.ans] - v) > .051) fail('expect value', q); if (labs.filter(x => Math.abs(+x - v) <= .051).length !== 1) fail('expect unique', q); }
    if (id === 'mine') { const w = q.k.endsWith('.w'), m = LD.supportOf(q.dice, q.v.f, w), v = m + (q.v.t - 5) * (w ? 1 / 3 : 1 / 6); if (Math.abs(+labs[q.ans] - v) > .051) fail('mine value', q); if (labs.filter(x => Math.abs(+x - v) <= .051).length !== 1) fail('mine unique', q); }
    if (id === 'chance') { const w = q.k.endsWith('.w'), P = LD.pAtLeast(q.v.q, LD.supportOf(q.dice, q.v.f, w), q.v.t - 5, q.v.f, w) * 100; const d = labs.map(x => Math.abs(parseFloat(x) - P)); const mn = Math.min(...d); if (d[q.ans] !== mn || d.filter(x => x - mn < 8).length !== 1) fail('chance nearest', q); }
    if (id === 'judge') { const P = LD.pAtLeast(q.v.q, LD.supportOf(q.dice, q.v.f, true), q.v.t - 5, q.v.f, true); if ((q.ans === 0) !== (P < .5)) fail('judge direction', q); }
    if (id === 'aces') {
      if (q.k === 'q.toAce') { if (q.opts[q.ans].bid.q !== Math.ceil(q.v.q / 2)) fail('toAce', q); if (q.opts.filter(o => o.bid.q === Math.ceil(q.v.q / 2)).length !== 1) fail('toAce unique', q); }
      if (q.k === 'q.fromAce') { if (q.opts[q.ans].bid.q !== 2 * q.v.q + 1) fail('fromAce', q); }
      if (q.k === 'q.calza') { const E = LD.pExact(q.v.q, LD.supportOf(q.dice, q.v.f, true), q.v.t - 5, q.v.f, true) * 100; const d = labs.map(x => Math.abs(parseFloat(x) - E)); const mn = Math.min(...d); if (d[q.ans] !== mn || d.filter(x => x - mn < 8).length !== 1) fail('calza nearest', q); }
    }
  }
}
for (const Ls of L.LESSONS) { const qs = L.make(Ls.id, 6); if (qs.length < 6) fail('lesson too few ' + Ls.id, qs.length); }
console.log(`${n} problems checked`, bad ? bad + ' failure(s)' : 'all ok'); process.exit(bad ? 1 : 0);

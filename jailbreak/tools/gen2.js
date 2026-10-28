#!/usr/bin/env node
/* だつごくスライダー！ — candidate miner (2026-10 course rebuild).
   node tools/gen2.js <rule> <lo> <hi> <count> <out.jsonl> [seed] [w]
     rule: basic | big | key | plate | oneway | ice | patrol | twin | dig | tilt
   Appends candidates (one JSON per line) that pass the rule checks of tools/fun.js, with their fun score:
     { r, o, sc, rec, m: { pieces, reuse, sols, prec, ... } }
   The assembler (tools/assemble.js) picks the best ones per slot. */
'use strict';
const fs = require('fs');
const E = require('../engine.js');
const B = require('./build.js');
const F = require('./fun.js');
const L = require('./lib.js');
const [, , rule, loA, hiA, nA, out, seedA, wA] = process.argv;
const lo = +loA, hi = +hiA, N = +nA;
const R = E.rng(+(seedA || 0) || E.hashStr(rule + lo + hi + Date.now()));
const seen = new Set();
// skip layouts already mined into this file
if (fs.existsSync(out)) fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).forEach(l => { try { seen.add(L.canon(JSON.parse(l).rec)); } catch (e) {} });
const b = B.make(R, seen);

function iceClimb() {
  // maximise optimal moves AND the gap to the same layout without ice (the ice has to change the solution)
  for (let tries = 0; tries < 400; tries++) {
    const cur0 = b.BUILD.ice(); if (!cur0) continue;
    const val = rec => { const o = F.optOf(rec, 150000); if (o < 1) return null; const bb = Object.assign({}, rec, { r: 'basic' }), bo = F.optOf(bb, 150000); const gain = bo > 0 ? o - bo : 0; return { o, gain, v: Math.min(o, hi) + 3 * Math.min(gain, 3) }; };
    let best = val(cur0); if (!best) continue; let br = cur0;
    for (let it = 0; it < 60; it++) {
      const m = b.mutRule(Object.assign({}, br, { o: best.o })); if (!m) continue;
      const v = val(m); if (!v || v.o > hi + 1) continue;
      if (v.v >= best.v) { best = v; br = m; }
    }
    if (best.gain > 0 && best.o >= lo && best.o <= hi) { br.o = best.o; return br; }
  }
  return null;
}
// LIGHTS / VENT: climb on the optimal count AND on the solution really using the switch / the vent
function featureClimb(kind) {
  const uses = rec => {
    const P = E.decode(rec), r = E.solve(P, P.s0, 200000); if (r.n < 1) return null;
    let S = P.s0, u = 0; for (const m of r.path) { const ev = {}; S = E.apply(P, S, m, ev); if (kind === 'lights' ? ev.lights : ev.vent) u++; }
    if (u) { const x = Object.assign({}, rec); if (kind === 'lights') { delete x.sw; x.r = 'patrol'; } else { delete x.vt; x.r = 'basic'; } const P2 = E.decode(x), r2 = E.solve(P2, P2.s0, 200000).n; if (kind === 'lights' ? r2 === r.n : (r2 > 0 && r2 <= r.n)) u = 0; }
    return { o: r.n, u };
  };
  for (let tries = 0; tries < 300; tries++) {
    let cur = b.BUILD[kind](); if (!cur) continue;
    let v0 = uses(cur); if (!v0) continue;
    const val = v => Math.min(v.o, hi) + (v.u ? 6 : 0) + Math.min(v.u, 3);
    let best = v0;
    for (let it = 0; it < 70; it++) {
      const m = b.mutRule(Object.assign({}, cur, { o: best.o })); if (!m) continue;
      const v = uses(m); if (!v || v.o > hi + 1) continue;
      if (val(v) >= val(best)) { best = v; cur = m; }
    }
    if (best.u && best.o >= lo && best.o <= hi) { cur.o = best.o; return cur; }
  }
  return null;
}
function one() {
  if (rule === 'basic') return b.plainAt([lo, hi], { n0: lo < 8 ? 4 : 7, n1: lo < 8 ? 9 : 12, walls: R() < .3 ? [1, 2] : null });
  if (rule === 'big') { const w = +(wA || (R() < .5 ? 7 : 8)); return b.plainAt([lo, hi], { w, h: w, n0: w === 8 ? 9 : 8, n1: w === 8 ? 15 : 13, walls: [0, 2], maxN: w === 8 ? 15 : 16, cap: 400000 }); }
  if (rule === 'ice') return iceClimb();
  if (rule === 'lights' || rule === 'vent') return featureClimb(rule);
  return b.ruleAt(rule, lo, hi, 30 + hi * 3);
}
let made = 0, tried = 0;
const t0 = Date.now();
while (made < N && tried < N * 40) {
  tried++;
  let rec; try { rec = one(); } catch (e) { continue; }
  if (!rec) continue;
  rec = Object.assign({ w: 6, h: 6 }, rec); delete rec.N;
  if (rec.o < lo || rec.o > hi) continue;
  const a = F.analyze(rec);
  if (!a.ok || a.o !== rec.o) continue;
  const m = a.m, keep = { pieces: m.pieces, reuse: m.reuse, back: m.back, detour: m.detour, sols: m.sols, prec: m.prec != null ? +m.prec.toFixed(3) : null, forced: m.forced, N: m.N, guardSteps: m.guardSteps, digs: m.digs, iceGain: m.iceGain, owGain: m.owGain };
  fs.appendFileSync(out, JSON.stringify({ r: rule, o: a.o, sc: a.score, rec, m: keep }) + '\n');
  made++;
}
console.error(rule, lo, hi, 'made', made, 'tried', tried, ((Date.now() - t0) / 1000).toFixed(0) + 's');

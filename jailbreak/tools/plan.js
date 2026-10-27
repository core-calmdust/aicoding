/* だつごくスライダー！ — the stage plan (2026-10 rebuild): which rule and how many optimal moves every slot asks for.
   COURSES: prison courses, 10 floors × 10 stages. kind 'mix' = classic + rule stages, 'classic' = basic sliding only.
   MODES: one rule each, 50 stages (5 blocks of 10). 20+ moves = the expert band (超上級). */
'use strict';
const RULES = ['key', 'plate', 'oneway', 'ice', 'patrol', 'twin', 'dig', 'tilt'];
// highest optimal count each rule set reaches reliably with the generator
const CAP = { basic: 33, big: 34, silent: 26, key: 19, plate: 21, oneway: 18, ice: 18, patrol: 19, twin: 22, dig: 19, tilt: 16 };
const lerp = (a, b, t) => Math.round(a + (b - a) * t);
const COURSES = [
  { id: 'halden', kind: 'mix', lo: 4, hi: 10, lv: 0 },
  { id: 'singsing', kind: 'mix', lo: 6, hi: 12, lv: 1 },
  { id: 'sanquentin', kind: 'mix', lo: 8, hi: 15, lv: 2 },
  { id: 'abashiri', kind: 'mix', lo: 11, hi: 18, lv: 3 },
  { id: 'alcatraz', kind: 'mix', lo: 19, hi: 28, lv: 4 },
  { id: 'folsom', kind: 'classic', lo: 4, hi: 11, lv: 1 },
  { id: 'leavenworth', kind: 'classic', lo: 8, hi: 15, lv: 2 },
  { id: 'lasante', kind: 'classic', lo: 12, hi: 19, lv: 3 },
  { id: 'devil', kind: 'classic', lo: 20, hi: 33, lv: 4 },
];
// Halden: a rule per floor, introduced gently (5 stages of the new rule + earlier rules / classic)
const HALDEN_RULE = [null, 'key', 'plate', 'oneway', 'ice', 'dig', 'patrol', 'twin', 'tilt', null];
function courseSlots(C, rnd) {
  const out = [];
  for (let f = 0; f < 10; f++) for (let s = 0; s < 10; s++) {
    const t = (f * 10 + s) / 99;
    let o = lerp(C.lo, C.hi, t) + (s % 3 === 2 ? 1 : 0);
    let r = 'basic';
    if (C.kind === 'mix') {
      if (C.id === 'halden') {
        const nr = HALDEN_RULE[f], seenR = HALDEN_RULE.slice(1, f).filter(Boolean);
        if (f === 0) { if (s < 3) { out.push({ r: 'tut', o: s + 1 }); continue; } }
        else if (nr) { if ([0, 2, 4, 6, 8].includes(s)) r = nr; else if (s % 2 && seenR.length && rnd() < .55) r = seenR[Math.floor(rnd() * seenR.length)]; }
        else r = rnd() < .75 ? RULES[Math.floor(rnd() * RULES.length)] : 'basic';
        if (nr && s === 0) o = Math.max(3, Math.min(o, 5));     // the first stage of a new rule is a gentle one
        if (r === 'twin') o = Math.max(o, 6);
      } else {
        const pool = C.lv >= 2 ? [...RULES, 'silent', 'big'] : RULES;
        r = [1, 4, 8].includes(s) ? (C.lv >= 3 && s === 8 ? 'big' : 'basic') : pool[Math.floor(rnd() * pool.length)];
      }
    } else if (C.lv >= 4 && s === 9) r = 'basic';
    o = Math.min(o, CAP[r] || 99); if (C.lv < 4) o = Math.min(o, 19);
    if (r === 'big') o = Math.max(o, 8);
    out.push({ r, o });
  }
  return out;
}
const MODES = ['key', 'plate', 'oneway', 'ice', 'patrol', 'twin', 'dig', 'tilt', 'silent', 'big'];
function modeSlots(m) {
  const cap = CAP[m], out = [];
  for (let k = 0; k < 50; k++) {
    let o;
    if (k < 2) o = m === 'twin' ? 6 + k : 4 + k;
    else if (k < 42) o = lerp(7, Math.min(17, cap), (k - 2) / 39);
    else o = lerp(Math.min(18, cap), Math.min(m === 'big' ? 30 : 22, cap), (k - 42) / 7);
    if (m === 'big') o = k < 2 ? 6 + k : lerp(8, 30, k / 49);
    if (m === 'silent') o = k < 2 ? 5 + k : lerp(7, 24, k / 49);
    out.push({ r: m, o });
  }
  return out;
}
function plan(seed = 20261028) {
  const E = require('../engine.js'), rnd = E.rng(seed);
  return { courses: COURSES.map(C => Object.assign({}, C, { slots: courseSlots(C, rnd) })), modes: MODES.map(m => ({ id: m, slots: modeSlots(m) })) };
}
module.exports = { plan, COURSES, MODES, RULES, CAP };
if (require.main === module) {
  const P = plan(), need = {};
  const add = (r, o) => { if (r === 'tut') return; const rr = r === 'silent' ? 'basic' : r, k = rr + ':' + o; need[k] = (need[k] || 0) + 1; };
  P.courses.forEach(c => c.slots.forEach(s => add(s.r, s.o))); P.modes.forEach(m => m.slots.forEach(s => add(s.r, s.o)));
  const by = {}; for (const k in need) { const [r, o] = k.split(':'); (by[r] = by[r] || {})[o] = need[k]; }
  for (const r in by) console.log(r, Object.values(by[r]).reduce((a, b) => a + b, 0), JSON.stringify(by[r]));
  if (process.argv[2] === 'show') P.courses.forEach(c => console.log(c.id, c.slots.map(s => s.r[0] + s.o).join(' ')));
}

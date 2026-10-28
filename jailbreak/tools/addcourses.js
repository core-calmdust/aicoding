#!/usr/bin/env node
/* だつごくスライダー！ — adds prison courses to stages.json without touching the existing stages (2026-10-28).
   node tools/addcourses.js <pool dir> [pool dir…]
   - the new courses (EXTRA below) are filled slot by slot like tools/assemble.js: best fun score (tools/fun.js) of the right
     rule, exact move count first, then ±1, ±2…; layouts already used anywhere in stages.json are skipped
   - candidates: tools/gen2.js jsonl files (any *.jsonl in the given dirs; m_<rule>.jsonl files are of that rule)
   - every stage is re-solved and stored with its optimal count and a solution string; courses are inserted after `after` */
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js'), L = require('./lib.js'), PL = require('./plan.js');
const dirs = process.argv.slice(2);
const file = path.join(__dirname, '..', 'stages.json');
const ST = JSON.parse(fs.readFileSync(file, 'utf8'));

// the gap between San Quentin (中級) and Abashiri (now 超上級): one more 初級, one more 中級, two 上級
const OLD = PL.RULES, NEW = PL.NEW;
const EXTRA = [
  { id: 'fremantle', lv: 1, lo: 7, hi: 13, pool: OLD, after: 'singsing' },
  { id: 'dartmoor', lv: 2, lo: 9, hi: 15, pool: [...OLD, 'silent'], after: 'sanquentin' },
  { id: 'colditz', lv: 3, lo: 10, hi: 16, pool: [...OLD, ...NEW, 'silent'], after: 'dartmoor' },
  { id: 'lecumberri', lv: 3, lo: 10, hi: 17, pool: [...OLD, ...NEW, 'silent'], after: 'colditz' },
];
const LV = { abashiri: 4 };   // Abashiri is an expert course

// ---------- candidates ----------
const norm = rec => { const r = Object.assign({ w: 6, h: 6 }, rec); delete r.o; delete r.N; delete r.s; delete r.k; if (!r.r || r.r === 'silent' || r.r === 'big') r.r = 'basic'; return r; };
const used = new Set();
ST.courses.forEach(c => c.st.forEach(s => used.add(L.canon(norm(s))))); for (const m in ST.modes) ST.modes[m].forEach(s => used.add(L.canon(norm(s))));
const C = {}, seen = new Set();
for (const d of dirs) for (const f of fs.readdirSync(d)) {
  if (!f.endsWith('.jsonl')) continue;
  fs.readFileSync(path.join(d, f), 'utf8').split('\n').filter(Boolean).forEach(l => {
    let x; try { x = JSON.parse(l); } catch (e) { return; }
    const rec = norm(Object.assign({}, x.rec, { r: x.r }));
    if ((rec.sr || []).some(c => (rec.sb || []).includes(c))) return;
    const c = L.canon(rec); if (used.has(c) || seen.has(c)) return; seen.add(c);
    const k = rec.w > 6 ? 'big' : rec.r;
    (C[k] = C[k] || []).push({ rec, o: x.o, sc: x.sc, c });
  });
}
for (const k in C) C[k].sort((a, b) => b.sc - a.sc);
const thr = (o, r) => (o <= 4 ? 22 : o <= 7 ? 42 : o <= 11 ? 52 : 60) - (r === 'tilt' ? 15 : ['ice', 'plate', 'twin', 'oneway', 'key'].includes(r) ? 6 : 0);

// ---------- slots ----------
const lerp = (a, b, t) => Math.round(a + (b - a) * t);
const slots = [];
EXTRA.forEach(X => {
  const rnd = E.rng(E.hashStr('jb-course-' + X.id));
  for (let f = 0; f < 10; f++) {
    // every floor gets a spread of rules: no rule twice in a floor when it can be helped
    let bag = [];
    for (let s = 0; s < 10; s++) {
      const t = (f * 10 + s) / 99;
      let o = lerp(X.lo, X.hi, t) + (s % 3 === 2 ? 1 : 0), r;
      if ([1, 4, 8].includes(s)) r = X.lv >= 3 && s === 8 ? 'big' : 'basic';
      else { if (!bag.length) bag = X.pool.slice(); r = bag.splice(Math.floor(rnd() * bag.length), 1)[0]; }
      o = Math.min(o, PL.CAP[r] || 99);
      if (r === 'big') o = Math.max(o, 9);
      if (r === 'twin') o = Math.max(o, 7);
      slots.push({ set: X.id, j: f * 10 + s, f, r, o });
    }
  }
});
const poolOf = r => C[r === 'silent' ? 'basic' : r] || [];
function take(s, tol, strict) {
  let best = null;
  for (const c of poolOf(s.r)) {
    if (c.taken) continue;
    const d = Math.abs(c.o - s.o); if (d > tol) continue;
    if (strict && c.sc < thr(c.o, s.r)) continue;
    const v = c.sc - d * 6; if (!best || v > best.v) best = { c, v };
  }
  if (!best) return false; best.c.taken = true; s.pick = best.c; return true;
}
const todo = () => slots.filter(s => !s.pick);
for (const [tol, strict] of [[0, true], [1, true], [2, true], [1, false], [3, false], [5, false], [9, false]])
  todo().sort((a, b) => poolOf(a.r).length - poolOf(b.r).length || b.o - a.o).forEach(s => take(s, tol, strict));
// a slot whose rule ran dry falls back to another rule of the course's pool
todo().forEach(s => { const X = EXTRA.find(x => x.id === s.set); for (const r of X.pool) { s.r = r; if (take(s, 2, false)) return; } s.r = 'basic'; take(s, 9, false); });
const miss = todo(); if (miss.length) { console.error('unfilled', miss.length, JSON.stringify(miss.slice(0, 10).map(s => s.set + ':' + s.r + s.o))); process.exit(1); }

// ---------- output ----------
function encMove(m) {
  if (m[0] === -1) return '!' + String.fromCharCode(48 + m[1]);
  if (m[0] === -2) return '^' + String.fromCharCode(48 + m[1]);
  const [i, dx, dy] = m, dir = dx < 0 ? 0 : dx > 0 ? 1 : dy < 0 ? 2 : 3, n = Math.abs(dx || dy);
  return String.fromCharCode(97 + i) + String.fromCharCode(48 + dir * 8 + n);
}
const hash = s => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); };
const keys = new Set(); ST.courses.forEach(c => c.st.forEach(s => keys.add(s.k))); for (const m in ST.modes) ST.modes[m].forEach(s => keys.add(s.k));
const FIELDS = ['ow', 'gd', 'ga', 'n', 'pl', 'dr', 'lk', 'gt', 'lz', 'hv', 'sr', 'sb', 'sw', 'vt'];
function finalize(s) {
  const rec = Object.assign({}, s.pick.rec), P = E.decode(rec), so = E.solve(P, P.s0, 4000000);
  if (so.n < 1) throw new Error('unsolvable ' + s.set + ':' + s.j);
  const o = { g: rec.g }; if (rec.w !== 6 || rec.h !== 6) { o.w = rec.w; o.h = rec.h; }
  const r = s.r === 'silent' ? 'silent' : s.r === 'big' ? 'big' : rec.r; if (r && r !== 'basic') o.r = r;
  for (const f of FIELDS) if (rec[f] != null) o[f] = rec[f];
  o.o = so.n; o.s = so.path.map(encMove).join('');
  let k = 'n' + hash(s.pick.c + '|' + r); while (keys.has(k)) k += 'x'; keys.add(k); o.k = k;
  return o;
}
EXTRA.forEach(X => {
  const st = [];
  for (let f = 0; f < 10; f++) {
    const fl = slots.filter(s => s.set === X.id && s.f === f).sort((a, b) => a.pick.o - b.pick.o);
    fl.forEach(s => st.push(finalize(s)));
  }
  ST.courses = ST.courses.filter(c => c.id !== X.id);
  const at = ST.courses.findIndex(c => c.id === X.after);
  ST.courses.splice(at + 1, 0, { id: X.id, kind: 'mix', lv: X.lv, st });
  const h = {}, rr = {}; st.forEach(x => { h[x.o] = (h[x.o] || 0) + 1; const k = x.r || 'basic'; rr[k] = (rr[k] || 0) + 1; });
  const scs = slots.filter(s => s.set === X.id).map(s => s.pick.sc).sort((a, b) => a - b);
  console.log(X.id, st.length, JSON.stringify(h), JSON.stringify(rr), 'score p10/50', scs[10], scs[50], 'below thr', slots.filter(s => s.set === X.id && s.pick.sc < thr(s.pick.o, s.r)).length);
});
for (const id in LV) { const c = ST.courses.find(c => c.id === id); if (c) c.lv = LV[id]; }
fs.writeFileSync(file, JSON.stringify(ST));
console.log('courses', ST.courses.map(c => c.id + ':' + c.lv).join(' '));

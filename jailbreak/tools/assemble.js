#!/usr/bin/env node
/* だつごくスライダー！ — builds stages.json v2 from the mined candidates (tools/gen2.js) and the first edition's stages.
   node tools/assemble.js <pool dir> <old.jsonl> [--daily]
   - fills every slot of tools/plan.js with the best-scoring candidate of the right rule and move count (tools/fun.js score),
     preferring the exact count, then ±1, ±2; the first edition's stages that pass the checks get a small bonus so their
     save keys (and players' stars) carry over
   - every stage is re-solved (engine.solve) and stored with its optimal count and a solution string
   - --daily: the medium daily pool's stages that fail the rule checks are swapped for fresh ones (days already played keep theirs) */
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js'), L = require('./lib.js'), F = require('./fun.js'), PL = require('./plan.js');
const [, , dir, oldFile, flag] = process.argv;
const base = path.join(__dirname, '..');

// ---------- candidates ----------
const C = {};   // rule → [{ rec, o, sc, k?, key }]
const used = new Set();
const keyOf = rec => [rec.w || 6, rec.h || 6, rec.g.replace(/[B-Y]/g, '*'), JSON.stringify([rec.ow, rec.gd, rec.pl, rec.dr, rec.lk, rec.gt, rec.n, rec.r === 'ice' || rec.r === 'tilt' ? rec.r : ''])].join('|');
function addC(x, old) {
  const r = x.r === 'silent' ? 'basic' : x.r, rec = Object.assign({ w: 6, h: 6 }, x.rec); delete rec.s; delete rec.N;
  rec.r = r === 'big' ? 'basic' : r;
  const key = keyOf(rec); if ((C._seen = C._seen || new Set()).has(key)) return; C._seen.add(key);
  (C[r] = C[r] || []).push({ rec, o: x.o, sc: x.sc + (old ? 3 : 0), k: old ? x.k : null, key, old: !!old });
}
for (const f of fs.readdirSync(dir)) if (f.endsWith('.jsonl')) fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean).forEach(l => { try { addC(JSON.parse(l)); } catch (e) {} });
if (oldFile && fs.existsSync(oldFile)) fs.readFileSync(oldFile, 'utf8').split('\n').filter(Boolean).forEach(l => { const x = JSON.parse(l); if (x.r === 'big' && (x.rec.w || 6) === 6) x.r = 'basic'; addC(x, true); });
// big boards are 'big' only when larger than 6×6
if (C.basic) { const six = []; C.basic.forEach(c => { if (c.rec.w > 6) (C.big = C.big || []).push(c); else six.push(c); }); C.basic = six; }
if (C.big) C.big = C.big.filter(c => c.rec.w > 6);
for (const r in C) if (r !== '_seen') C[r].sort((a, b) => b.sc - a.sc);

// ---------- slots ----------
const thr = (o, r) => (o <= 4 ? 22 : o <= 7 ? 42 : o <= 11 ? 52 : 60) - (r === 'tilt' ? 15 : ['ice', 'plate', 'twin', 'oneway', 'key'].includes(r) ? 6 : 0);
const P = PL.plan();
const slots = [];
P.courses.forEach(c => c.slots.forEach((s, j) => slots.push(Object.assign({ set: c.id, j }, s))));
P.modes.forEach(m => m.slots.forEach((s, j) => slots.push(Object.assign({ set: m.id, j }, s))));
const poolOf = r => C[r === 'silent' ? 'basic' : r] || [];
function take(s, tol, strict) {
  const pool = poolOf(s.r);
  let best = null;
  for (const c of pool) {
    if (used.has(c.key)) continue;
    const d = Math.abs(c.o - s.o); if (d > tol) continue;
    if (strict && c.sc < thr(c.o, s.r)) continue;
    const v = c.sc - d * 6;
    if (!best || v > best.v) best = { c, v };
  }
  if (!best) return false;
  used.add(best.c.key); s.pick = best.c; return true;
}
const scarce = s => poolOf(s.r).length;
const todo = () => slots.filter(s => s.r !== 'tut' && !s.pick);
for (const [tol, strict] of [[0, true], [1, true], [2, true], [1, false], [3, false], [5, false], [9, false]]) {
  todo().sort((a, b) => scarce(a) - scarce(b) || b.o - a.o).forEach(s => take(s, tol, strict));
}
const miss = todo(); if (miss.length) { console.error('unfilled', miss.length, JSON.stringify(miss.slice(0, 12).map(s => s.set + ':' + s.r + s.o))); }

// ---------- hand-made first stages of Halden (controls) ----------
const TUT = [
  { w: 6, h: 6, r: 'basic', g: '......' + '.B....' + '.BAA..' + '....CC' + 'DD....' + '......' },    // 1: just slide out
  { w: 6, h: 6, r: 'basic', g: '......' + '......' + 'AA.B..' + '...B..' + 'CC....' + '......' },    // 2: move the guard-post down, then out
  { w: 6, h: 6, r: 'basic', g: '...DD.' + '...B..' + 'AA.B..' + '......' + '.CCC..' + '......' },    // 3: two in the way
];

// ---------- output ----------
function encMove(m) {
  if (m[0] === -1) return '!' + String.fromCharCode(48 + m[1]);
  if (m[0] === -2) return '^' + String.fromCharCode(48 + m[1]);
  const [i, dx, dy] = m, dir = dx < 0 ? 0 : dx > 0 ? 1 : dy < 0 ? 2 : 3, n = Math.abs(dx || dy);
  return String.fromCharCode(97 + i) + String.fromCharCode(48 + dir * 8 + n);
}
const hash = s => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); };
const keys = new Set();
function finalize(rec, k, label) {
  const Pz = E.decode(rec), s = E.solve(Pz, Pz.s0, 4000000);
  if (s.n < 1) throw new Error('unsolvable ' + label + ' ' + JSON.stringify(rec));
  const o = { g: rec.g }; if (rec.w !== 6 || rec.h !== 6) { o.w = rec.w; o.h = rec.h; }
  if (rec.r && rec.r !== 'basic') o.r = rec.r;
  for (const f of ['ow', 'gd', 'ga', 'n', 'pl', 'dr', 'lk', 'gt']) if (rec[f] != null) o[f] = rec[f];
  o.o = s.n; o.s = s.path.map(encMove).join('');
  let kk = k || 'n' + hash(keyOf(rec) + '|' + (rec.r || ''));
  while (keys.has(kk)) kk += 'x';
  keys.add(kk); o.k = kk;
  return o;
}
const bySet = {};
slots.forEach(s => {
  let rec;
  if (s.r === 'tut') rec = TUT[s.o - 1];
  else if (s.pick) { rec = Object.assign({}, s.pick.rec); if (s.r === 'silent') rec.r = 'silent'; if (s.r === 'big') rec.r = 'big'; }
  else return;
  (bySet[s.set] = bySet[s.set] || []).push({ s, rec, k: s.pick ? s.pick.k : null, sc: s.pick ? s.pick.sc : 100 });
});
// within a floor (courses) / within the whole mode, stages go from short to long; tutorials stay first
const sortO = a => a.sort((x, y) => (x.s.r === 'tut' ? -1 : 0) - (y.s.r === 'tut' ? -1 : 0) || (x.s.r === 'tut' && y.s.r === 'tut' ? x.s.o - y.s.o : x.pick - y.pick));
const out = { v: 2, courses: [], modes: {} };
P.courses.forEach(c => {
  const L0 = bySet[c.id] || [], st = [];
  for (let f = 0; f < 10; f++) {
    const fl = L0.filter(x => Math.floor(x.s.j / 10) === f).map(x => Object.assign(x, { pick: x.s.pick ? x.s.pick.o : x.s.o }));
    sortO(fl); fl.forEach(x => st.push(finalize(x.rec, x.k, c.id + ':' + x.s.j)));
  }
  out.courses.push({ id: c.id, kind: c.kind, lv: c.lv, st });
});
P.modes.forEach(m => {
  const L0 = (bySet[m.id] || []).map(x => Object.assign(x, { pick: x.s.pick ? x.s.pick.o : x.s.o }));
  sortO(L0); out.modes[m.id] = L0.map(x => finalize(x.rec, x.k, m.id + ':' + x.s.j));
});
fs.writeFileSync(path.join(base, 'stages.json'), JSON.stringify(out));
// report
const hist = a => { const h = {}; a.forEach(x => { h[x.o] = (h[x.o] || 0) + 1; }); return JSON.stringify(h); };
let kept = 0, n = 0;
slots.forEach(s => { if (s.pick) { n++; if (s.pick.old) kept++; } });
console.log('stages', n + 3, 'kept from v1', kept);
out.courses.forEach(c => console.log(c.id, c.st.length, hist(c.st), 'rules', JSON.stringify(c.st.reduce((h, r) => { const k = r.r || 'basic'; h[k] = (h[k] || 0) + 1; return h; }, {}))));
for (const m in out.modes) console.log(m, out.modes[m].length, hist(out.modes[m]));
const scs = slots.filter(s => s.pick).map(s => s.pick.sc).sort((a, b) => a - b);
console.log('score p10/50/90', scs[Math.floor(scs.length * .1)], scs[Math.floor(scs.length * .5)], scs[Math.floor(scs.length * .9)], 'below thr', slots.filter(s => s.pick && s.pick.sc < thr(s.pick.o, s.r)).length);

// ---------- daily medium pool ----------
if (flag === '--daily') {
  const DL = JSON.parse(fs.readFileSync(path.join(base, 'daily.json'), 'utf8'));
  const EPOCH = Date.UTC(2026, 9, 25), keep = new Set(), Lm = DL.m, blk = Math.floor(Lm.length / 7);
  const lastKept = Math.round((Date.UTC(2026, 9, 29) - EPOCH) / 864e5);      // days up to tomorrow keep their puzzle
  for (let d = 0; d <= lastKept; d++) { const r = d % 7, j = (Math.floor(d / 7) * 5) % blk; keep.add(j * 7 + r); }
  let swapped = 0;
  Lm.forEach((x, i) => {
    if (keep.has(i)) return;
    const rec = Object.assign({ w: 6, h: 6, r: x.r || 'basic' }, x); delete rec.s;
    if (rec.r === 'basic') return;
    const a = F.analyze(rec); if (a.ok && a.score >= thr(a.o, rec.r) - 10) return;
    const c = (C[rec.r] || []).find(c => !used.has(c.key) && c.o >= 7 && c.o <= 13 && c.sc >= thr(c.o, rec.r));
    if (!c) return;
    used.add(c.key); const f = finalize(c.rec, null, 'daily'); delete f.k; Lm[i] = f; swapped++;
  });
  fs.writeFileSync(path.join(base, 'daily.json'), JSON.stringify(DL));
  console.log('daily medium swapped', swapped);
}

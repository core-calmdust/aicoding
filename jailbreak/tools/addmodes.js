#!/usr/bin/env node
/* だつごくスライダー！ — adds rule modes to stages.json without touching the other stages.
   node tools/addmodes.js <pool dir> <rule> [rule…]
   Reads <pool dir>/m_<rule>.jsonl (tools/gen2.js candidates), fills the 50 slots of tools/plan.js modeSlots(rule)
   with the best-scoring candidate of the closest move count, re-solves each and writes them as stages.json modes[rule]. */
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js'), L = require('./lib.js'), PL = require('./plan.js');
const [, , dir, ...rules] = process.argv;
const file = path.join(__dirname, '..', 'stages.json');
const ST = JSON.parse(fs.readFileSync(file, 'utf8'));
const keys = new Set();
ST.courses.forEach(c => c.st.forEach(s => keys.add(s.k))); for (const m in ST.modes) if (!rules.includes(m)) ST.modes[m].forEach(s => keys.add(s.k));
const hash = s => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); };
function encMove(m) {
  if (m[0] === -1) return '!' + String.fromCharCode(48 + m[1]);
  if (m[0] === -2) return '^' + String.fromCharCode(48 + m[1]);
  const [i, dx, dy] = m, dir = dx < 0 ? 0 : dx > 0 ? 1 : dy < 0 ? 2 : 3, n = Math.abs(dx || dy);
  return String.fromCharCode(97 + i) + String.fromCharCode(48 + dir * 8 + n);
}
const FIELDS = ['ow', 'gd', 'ga', 'n', 'pl', 'dr', 'lk', 'gt', 'lz', 'hv', 'sr', 'sb', 'sw', 'vt'];
for (const r of rules) {
  const seen = new Set(), C = [];
  fs.readFileSync(path.join(dir, 'm_' + r + '.jsonl'), 'utf8').split('\n').filter(Boolean).forEach(l => {
    const x = JSON.parse(l), rec = Object.assign({ w: 6, h: 6 }, x.rec, { r }); delete rec.o; delete rec.N; delete rec.s;
    if ((rec.sr || []).some(c => (rec.sb || []).includes(c))) return;
    const c = L.canon(rec); if (seen.has(c)) return; seen.add(c); C.push({ rec, o: x.o, sc: x.sc, c });
  });
  const slots = PL.modeSlots(r), used = new Set();
  for (const tol of [0, 1, 2, 3, 5, 9]) slots.forEach(s => {
    if (s.pick) return; let best = null;
    for (const c of C) { if (used.has(c.c)) continue; const d = Math.abs(c.o - s.o); if (d > tol) continue; const v = c.sc - d * 6; if (!best || v > best.v) best = { c, v }; }
    if (best) { used.add(best.c.c); s.pick = best.c; }
  });
  const miss = slots.filter(s => !s.pick).length; if (miss) console.error(r, 'unfilled', miss);
  const out = slots.filter(s => s.pick).map(s => s.pick).sort((a, b) => a.o - b.o || b.sc - a.sc).map(c => {
    const P = E.decode(c.rec), so = E.solve(P, P.s0, 4000000); if (so.n < 1) throw new Error('unsolvable ' + r);
    const o = { g: c.rec.g }; if (c.rec.w !== 6 || c.rec.h !== 6) { o.w = c.rec.w; o.h = c.rec.h; }
    o.r = r; for (const f of FIELDS) if (c.rec[f] != null) o[f] = c.rec[f];
    o.o = so.n; o.s = so.path.map(encMove).join('');
    let k = 'n' + hash(c.c + '|' + r); while (keys.has(k)) k += 'x'; keys.add(k); o.k = k;
    return o;
  });
  ST.modes[r] = out;
  const h = {}; out.forEach(x => { h[x.o] = (h[x.o] || 0) + 1; });
  console.log(r, out.length, 'of', C.length, JSON.stringify(h));
}
fs.writeFileSync(file, JSON.stringify(ST));

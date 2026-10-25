#!/usr/bin/env node
/* だつごく！スライド — puzzle generator.
   node jailbreak/tools/gen.js <part> <out.json> [seed]     one part (parts below), written as a JSON array
   node jailbreak/tools/gen.js merge <dir>                  re-verifies every part in <dir> and writes jailbreak/stages.json + daily.json
   Plain layouts (course, daily easy / hard, sprint, BIG, SILENT) are hill-climbed on the whole state graph (tools/lib.js fastComp:
   every state of the component and its distance to the exit), and a state at exactly the wanted distance is taken.
   Rule sets with one-way effects (key, plate, one-way carts, ice, guards, twin, dig, tilt) are hill-climbed with a forward BFS.
   merge re-solves every puzzle with engine.solve (the same code the game uses for hints) and stores the optimal count + a solution. */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./lib.js');
const { E, ri, LET } = L;
const [, , part, out, seedArg] = process.argv;
const R = E.rng(+(seedArg || 0) || E.hashStr(part || 'x'));
const pick = a => a[Math.floor(R() * a.length)];
const seen = new Set();
const uniq = rec => { const k = L.canon(rec); if (seen.has(k)) return false; seen.add(k); return true; };

/* ---------- plain layouts: exact distance d ---------- */
function plainAt(d, o = {}) {
  // d: exact distance, or [lo, hi] (a random distance in range that the climbed component reaches)
  const w = o.w || 6, h = o.h || 6, ey = (h >> 1) - 1 + (h % 2), cap = o.cap || 250000;
  const lo = Array.isArray(d) ? d[0] : d, hi = Array.isArray(d) ? d[1] : d;
  let cur = null, spent = 0;
  for (let tries = 0; tries < 3000; tries++) {
    if (!cur || spent > (lo <= 14 ? 120 : lo <= 25 ? 500 : 1400)) {
      const b = L.randomBoard(R, w, h, ri(R, o.n0 || 6, o.n1 || 11), { walls: o.walls ? ri(R, o.walls[0], o.walls[1]) : 0, l3: o.l3 });
      cur = b.rec(o.r || 'basic'); spent = 0;
    }
    const step = lo <= 6 ? 6 : lo <= 14 ? 20 : 40;
    const r = L.climb(R, cur, step, { stop: hi, ey, cap, maxN: o.maxN, l3: o.l3 }); spent += step;
    if (!r) { cur = null; continue; }
    cur = { w: r.w, h: r.h, g: r.g, r: r.r };
    if (r.o < lo) continue;
    const want = lo === hi ? lo : ri(R, lo, Math.min(hi, r.o));
    const c = L.fastComp(r, cap), js = [];
    for (let j = 0; j < c.N; j++) if (c.dist[j] === want) js.push(j);
    if (!js.length) { cur = null; continue; }
    const rec = { w: r.w, h: r.h, g: c.gridOf(pick(js)), r: r.r, o: want };
    cur = null;
    if (uniq(rec)) return rec;
  }
  throw new Error('plainAt ' + d);
}

/* ---------- rule sets: builders ---------- */
const cellOf = (b, x, y) => y * b.w + x;
function clearCell(b, c) { const ch = b.g[c]; if (ch === '.') return; if (/[B-Y]/.test(ch)) { for (let i = 0; i < b.g.length; i++) if (b.g[i] === ch) b.g[i] = '.'; } else b.g[c] = '.'; }
function freeCells(b, avoid) { const o = []; for (let c = 0; c < b.g.length; c++) if (b.g[c] === '.' && !(avoid && avoid(c))) o.push(c); return o; }
const BUILD = {
  key() {
    const b = L.randomBoard(R, 6, 6, ri(R, 5, 9), { walls: ri(R, 0, 1) }), ey = b.ey, gc = cellOf(b, 5, ey);
    clearCell(b, gc);
    const fc = freeCells(b, c => c === gc || ((c / 6) | 0) === ey); if (fc.length < 2) return null;
    const kc = pick(fc); b.g[kc] = 'k';
    const lc = pick(freeCells(b, c => c === gc || Math.abs(c % 6 - kc % 6) + Math.abs(((c / 6) | 0) - ((kc / 6) | 0)) < 2));
    if (lc == null) return null;
    b.ex = { lk: lc, gt: [gc] }; return b.rec('key');
  },
  plate() {
    const b = L.randomBoard(R, 6, 6, ri(R, 6, 9), { walls: ri(R, 0, 1) }), ey = b.ey, dc = cellOf(b, ri(R, 4, 5), ey);
    clearCell(b, dc);
    const doors = [dc];
    if (R() < .5) { const c2 = pick(freeCells(b, c => ((c / 6) | 0) === ey || c === dc)); if (c2 != null) doors.push(c2); }
    const pl = pick(freeCells(b, c => ((c / 6) | 0) === ey || doors.includes(c))); if (pl == null) return null;
    b.ex = { pl, dr: doors }; return b.rec('plate');
  },
  oneway() {
    const b = L.randomBoard(R, 6, 6, ri(R, 7, 11), { walls: ri(R, 0, 1) });
    const ls = [...new Set(b.g.filter(c => /[B-Y]/.test(c)))];
    for (const ch of ls) if (R() < .45) b.ow[ch] = R() < .5 ? 1 : -1;
    if (Object.keys(b.ow).length < 2) return null;
    return b.rec('oneway');
  },
  ice() { return L.randomBoard(R, 6, 6, ri(R, 4, 8), { walls: ri(R, 1, 3) }).rec('ice'); },
  patrol() {
    const b = L.randomBoard(R, 6, 6, ri(R, 5, 9), { walls: ri(R, 0, 1) }), ey = b.ey, ng = ri(R, 1, 2);
    for (let q = 0; q < ng; q++) {
      const ch = LET[LET.length - 1 - q];
      if (q === 0) { const x = ri(R, b.px + 2, 5), fc = freeCells(b, c => c % 6 !== x); if (!fc.length) return null; const c = pick(fc); b.g[c] = ch; b.gd[ch] = R() < .5 ? 1 : -1; }
      else { const c = pick(freeCells(b, c => ((c / 6) | 0) === ey)); if (c == null) return null; b.g[c] = ch; b.gd[ch] = R() < .5 ? 1 : -1; if (R() < .6) b.ga[ch] = 'h'; }
    }
    const r = b.rec('patrol'); if (R() < .3) r.n = 2; return r;
  },
  twin() {
    const px = ri(R, 0, 2), cx = ri(R, Math.max(2, px + 2), 5);
    const b = L.randomBoard(R, 6, 6, ri(R, 5, 9), { twin: cx, walls: ri(R, 0, 1) });
    if (!b.g.includes('Z') || b.g.indexOf('A') % 6 >= cx) return null;
    return b.rec('twin');
  },
  dig() {
    const b = L.randomBoard(R, 6, 6, ri(R, 5, 9), { walls: ri(R, 0, 2) }), ey = b.ey, xc = cellOf(b, 5, ey);
    clearCell(b, xc); b.g[xc] = '%';
    const nc = ri(R, 1, 3); for (let k = 0; k < nc; k++) { const c = pick(freeCells(b)); if (c != null) b.g[c] = '%'; }
    return b.rec('dig');
  },
  tilt() {
    const b = L.randomBoard(R, 6, 6, ri(R, 2, 5), { walls: ri(R, 2, 5) });
    const nx = ri(R, 2, 4); for (let k = 0; k < nx; k++) { const c = pick(freeCells(b, c => ((c / 6) | 0) === b.ey && c % 6 > b.px)); if (c != null) b.g[c] = 'x'; }
    return b.rec('tilt');
  },
};
// mutation for rule-set layouts: add / remove a block, or move a special cell (key, crate, lock, plate)
function mutRule(rec) {
  const w = rec.w, ey = (rec.h >> 1) - 1 + (rec.h % 2), g = rec.g.split(''), out = JSON.parse(JSON.stringify(rec)), op = R();
  const letters = [...new Set(g.filter(c => /[B-Y]/.test(c)))].filter(c => !(rec.gd && rec.gd[c]));
  const marks = new Set([...(rec.dr || []), ...(rec.gt || []), rec.pl, rec.lk].filter(c => c != null));
  if (op < .4) {
    const g2 = g.slice(); if (!L.addBlock(R, rec, g2, ey)) return null;
    if ((rec.gt || []).some(c => g2[c] !== '.')) return null;   // nothing may stand in the closed gate
    const nl = g2.find((c, i) => c !== g[i]);
    if (rec.r === 'oneway' && R() < .5) { out.ow = out.ow || {}; out.ow[nl] = R() < .5 ? 1 : -1; }
    out.g = g2.join('');
  } else if (op < .75 && letters.length > 2) {
    const ch = pick(letters); out.g = g.map(c => c === ch ? '.' : c).join('');
    if (out.ow) { delete out.ow[ch]; if (rec.r === 'oneway' && Object.keys(out.ow).length < 2) return null; }
  } else {
    const sp = g.map((c, i) => (c === 'k' || c === 'x') ? i : -1).filter(i => i >= 0), fc = g.map((c, i) => c === '.' && !marks.has(i) && !(rec.r === 'tilt' && ((i / w) | 0) === ey) ? i : -1).filter(i => i >= 0);
    if (!fc.length) return null;
    const what = R();
    if (sp.length && what < .5) { const a = pick(sp), b = pick(fc); g[b] = g[a]; g[a] = '.'; out.g = g.join(''); }
    else if (rec.lk != null) out.lk = pick(fc);
    else if (rec.pl != null) out.pl = pick(fc.filter(c => ((c / w) | 0) !== ey)) ?? rec.pl;
    else if (rec.r === 'dig') { const cr = g.map((c, i) => c === '%' && i !== ey * w + w - 1 ? i : -1).filter(i => i >= 0); if (cr.length) { const a = pick(cr); g[a] = '.'; g[pick(fc)] = '%'; out.g = g.join(''); } else return null; }
    else return null;
  }
  return out;
}
function ruleAt(r, lo, hi, iters = 40) {
  for (let tries = 0; tries < 600; tries++) {
    let cur = BUILD[r](); if (!cur) continue;
    let s = L.solveRec(cur, 150000); if (s.n < 1) continue;
    let best = Object.assign({}, cur, { o: s.n });
    for (let it = 0; it < iters && best.o < hi; it++) {
      const m = mutRule(best); if (!m) continue;
      const s2 = L.solveRec(m, 150000); if (s2.n < 1) continue;
      if (s2.n >= best.o) best = Object.assign({}, m, { o: s2.n });
    }
    if (best.o >= lo && best.o <= hi + 2 && uniq(best)) return best;
  }
  throw new Error('ruleAt ' + r + ' ' + lo);
}

/* ---------- parts ---------- */
const lerp = (a, b, t) => Math.round(a + (b - a) * t);
const PARTS = {
  // 12 floors × 50: optimal moves rise from 2 to ~40; some floors have fixed walls (laundry machines, pillars…)
  course(f0 = 0, f1 = 11) {
    const WALLS = [0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1], o = [];
    for (let f = f0; f <= f1; f++) for (let j = 0; j < 50; j++) {
      const t = (f * 50 + j) / 599, d = Math.max(2, Math.round(2 + 29 * Math.pow(t, 1.15) + (j % 10) * .2));
      o.push(Object.assign(plainAt(d, { walls: WALLS[f] ? [1, 2] : null, n0: d < 8 ? 4 : 7, n1: d < 8 ? 8 : 12 }), { f, j }));
      if (o.length % 50 === 0) console.error('course', o.length, d);
    }
    return o;
  },
  course_a() { return PARTS.course(0, 5); }, course_b() { return PARTS.course(6, 8); }, course_c() { return PARTS.course(9, 10); }, course_d() { return PARTS.course(11, 11); },
  daily_h1() { return PARTS.daily_h(0, 183); }, daily_h2() { return PARTS.daily_h(183, 366); },
  sprint() { const o = []; for (let k = 0; k < 600; k++) o.push(plainAt(3 + Math.floor(k / 600 * 12), { n0: 5, n1: 10 })); return o.sort((a, b) => a.o - b.o); },
  silent() { const o = []; for (let k = 0; k < 40; k++) o.push(plainAt(lerp(5, 24, k / 39), { walls: k % 3 === 2 ? [1, 1] : null })); return o; },
  big7() { return PARTS.big(0, 20); }, big8() { return PARTS.big(20, 40); },
  big(k0 = 0, k1 = 40) {
    const o = [];
    for (let k = k0; k < k1; k++) { const big8 = k >= 20, t = (k % 20) / 19; o.push(plainAt(lerp(5, big8 ? 34 : 30, t), { w: big8 ? 8 : 7, h: big8 ? 8 : 7, n0: big8 ? 9 : 8, n1: big8 ? 15 : 13, walls: [0, 2], maxN: big8 ? 15 : 16, cap: 400000 })); console.error('big', k); }
    return o;
  },
  daily_e() { const o = []; for (let k = 0; k < 366; k++) o.push(plainAt(ri(R, 4, 8), { n0: 5, n1: 9 })); return o; },
  daily_h(k0 = 0, k1 = 366) { const o = []; for (let k = k0; k < k1; k++) { o.push(plainAt([17, 28], { walls: k % 4 === 3 ? [1, 1] : null, n0: 8, n1: 12 })); if (k % 20 === 0) console.error('dh', k); } return o; },
  daily_m() { const RS = ['basic', 'key', 'plate', 'oneway', 'ice', 'patrol', 'dig'], o = []; for (let k = 0; k < 366; k++) { const r = RS[k % 7]; o.push(r === 'basic' ? plainAt(ri(R, 10, 15)) : ruleAt(r, 7, 13)); if (k % 50 === 0) console.error('dm', k); } return o; },
};
const RULES = ['key', 'plate', 'oneway', 'ice', 'patrol', 'twin', 'dig', 'tilt'];
const BANDS = { key: [3, 18], plate: [3, 18], oneway: [3, 18], ice: [3, 16], patrol: [3, 16], twin: [4, 20], dig: [3, 18], tilt: [3, 14] };
RULES.forEach(r => { PARTS['mode_' + r] = () => { const o = [], [a, b] = BANDS[r]; for (let k = 0; k < 40; k++) { const lo = lerp(a, b, k / 39); o.push(ruleAt(r, lo, lo + 1, 30 + k * 2)); if (k % 10 === 9) console.error(r, k + 1); } return o.sort((x, y) => x.o - y.o); }; });

/* ---------- solution strings ---------- */
// one move = 2 chars: piece 'a'+i | '!' dig | '^' tilt, then a code char (slide: dir*8+dist; dig: cell; tilt: dir) + 48
function encMove(m) {
  if (m[0] === -1) return '!' + String.fromCharCode(48 + m[1]);
  if (m[0] === -2) return '^' + String.fromCharCode(48 + m[1]);
  const [i, dx, dy] = m, dir = dx < 0 ? 0 : dx > 0 ? 1 : dy < 0 ? 2 : 3, n = Math.abs(dx || dy);
  return String.fromCharCode(97 + i) + String.fromCharCode(48 + dir * 8 + n);
}
function finalize(rec) {
  const P = E.decode(rec), s = E.solve(P, P.s0, 3000000);
  if (s.n < 1) throw new Error('unsolvable ' + JSON.stringify(rec));
  if (rec.o && rec.o !== s.n) throw new Error('optimal mismatch ' + rec.o + ' vs ' + s.n + ' ' + JSON.stringify(rec));
  const o = { g: rec.g }; if (rec.w !== 6 || rec.h !== 6) { o.w = rec.w; o.h = rec.h; }
  if (rec.r !== 'basic') o.r = rec.r;
  for (const k of ['ow', 'gd', 'ga', 'n', 'pl', 'dr', 'lk', 'gt']) if (rec[k] != null) o[k] = rec[k];
  o.o = s.n; o.s = s.path.map(encMove).join('');
  return o;
}

if (part === 'quick') {   // small throw-away data set for UI testing (overwritten by merge)
  const base = path.join(__dirname, '..'), fin = a => a.map(finalize), modes = {};
  const course = []; for (let k = 0; k < 600; k++) course.push(plainAt(2 + (k % 6)));
  for (const r of RULES) { modes[r] = []; for (let k = 0; k < 40; k++) modes[r].push(ruleAt(r, 3, 5, 4)); }
  modes.big = []; for (let k = 0; k < 40; k++) modes.big.push(plainAt(4, { w: k < 20 ? 7 : 8, h: k < 20 ? 7 : 8, n0: 8, n1: 12 }));
  modes.silent = []; for (let k = 0; k < 40; k++) modes.silent.push(plainAt(5));
  const sp = []; for (let k = 0; k < 120; k++) sp.push(plainAt(3 + (k % 10)));
  const de = [], dm = [], dh = []; const RS = ['basic', 'key', 'plate', 'oneway', 'ice', 'patrol', 'dig'];
  for (let k = 0; k < 21; k++) { de.push(plainAt(5)); dh.push(plainAt(12)); dm.push(RS[k % 7] === 'basic' ? plainAt(8) : ruleAt(RS[k % 7], 5, 8, 6)); }
  for (const k in modes) modes[k] = fin(modes[k]);
  fs.writeFileSync(path.join(base, 'stages.json'), JSON.stringify({ v: 0, course: fin(course), modes }));
  fs.writeFileSync(path.join(base, 'daily.json'), JSON.stringify({ v: 0, e: fin(de), m: fin(dm), h: fin(dh), sprint: fin(sp).sort((a, b) => a.o - b.o) }));
  console.log('quick data written');
} else if (part === 'test') {
  for (const r of RULES) { const t0 = Date.now(); const x = ruleAt(r, 6, 8); console.log(r, x.o, Date.now() - t0, 'ms', JSON.stringify(x)); }
  const t1 = Date.now(); console.log('plain20', plainAt(20).o, Date.now() - t1);
} else if (part === 'merge') {
  const dir = out, rd = n => JSON.parse(fs.readFileSync(path.join(dir, n + '.json'), 'utf8'));
  const t0 = Date.now(), fin = a => a.map(finalize);
  const course = fin([...rd('course_a'), ...rd('course_b'), ...rd('course_c'), ...rd('course_d')]), modes = {};
  for (const r of RULES) modes[r] = fin(rd('mode_' + r));
  modes.big = fin([...rd('big7'), ...rd('big8')]); modes.silent = fin(rd('silent'));
  const ST = { v: 1, course, modes };
  const DL = { v: 1, e: fin(rd('daily_e')), m: fin(rd('daily_m')), h: fin([...rd('daily_h1'), ...rd('daily_h2')]), sprint: fin(rd('sprint')) };
  const base = path.join(__dirname, '..');
  fs.writeFileSync(path.join(base, 'stages.json'), JSON.stringify(ST));
  fs.writeFileSync(path.join(base, 'daily.json'), JSON.stringify(DL));
  const n = course.length + Object.values(modes).reduce((a, m) => a + m.length, 0);
  console.log('verified', n, 'stages +', DL.e.length + DL.m.length + DL.h.length, 'daily +', DL.sprint.length, 'sprint in', (Date.now() - t0) / 1000, 's');
  const hist = a => { const h = {}; a.forEach(x => { h[x.o] = (h[x.o] || 0) + 1; }); return JSON.stringify(h); };
  console.log('course', hist(course)); for (const k in modes) console.log(k, hist(modes[k]));
} else {
  if (!PARTS[part]) { console.error('parts:', Object.keys(PARTS).join(' ')); process.exit(1); }
  const t0 = Date.now(), res = PARTS[part]();
  fs.writeFileSync(out, JSON.stringify(res));
  console.error(part, res.length, 'in', (Date.now() - t0) / 1000, 's');
}

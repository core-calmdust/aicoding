/* だつごくスライダー！ — layout builders shared by the generators (plain hill climbing + rule-set builders).
   make(R) → { plainAt, ruleAt, BUILD, mutRule, uniq }  (R: seeded random) */
'use strict';
const L = require('./lib.js');
const { E, ri, LET } = L;
function make(R, seen = new Set()) {
const pick = a => a[Math.floor(R() * a.length)];
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
  // ---- 2026-10 rules ----
  laser() {
    const b = L.randomBoard(R, 6, 6, ri(R, 5, 9), { walls: ri(R, 0, 1) }), lz = [], ne = R() < .65 ? 1 : 2;
    for (let k = 0; k < ne; k++) {
      const x = ri(R, b.px + 2, 5), top = R() < .5, c = cellOf(b, x, top ? 0 : 5);
      if (lz.some(e => e[0] % 6 === x)) continue;
      clearCell(b, c); b.g[c] = '#'; lz.push([c, top ? 3 : 2]);
    }
    if (!lz.length) return null;
    b.ex = { lz }; const r = b.rec('laser'); return E.safe(E.decode(r), E.decode(r).s0) ? r : null;
  },
  heavy() {
    const b = L.randomBoard(R, 6, 6, ri(R, 6, 10), { walls: ri(R, 0, 1) }), ey = b.ey;
    const ls = [...new Set(b.g.filter(c => /[B-Y]/.test(c)))]; if (!ls.length) return null;
    const cross = ls.filter(ch => b.g.some((c, i) => c === ch && ((i / 6) | 0) === ey)), hv = {};
    const n = ri(R, 1, 2); for (let k = 0; k < n; k++) { const pool = k === 0 && cross.length ? cross : ls; hv[pick(pool)] = 1; }
    b.ex = { hv }; return b.rec('heavy');
  },
  shutter() {
    const b = L.randomBoard(R, 6, 6, ri(R, 5, 9), { walls: ri(R, 0, 1) }), ey = b.ey;
    const row = freeCells(b, c => ((c / 6) | 0) !== ey || c % 6 <= b.px + 1); const fc = freeCells(b);
    const first = pick(row.length ? freeCells(b, c => !(((c / 6) | 0) !== ey || c % 6 <= b.px + 1)) : fc); if (first == null) return null;
    const sr = [], sb = []; (R() < .5 ? sr : sb).push(first);
    const n = ri(R, 1, 3); for (let k = 0; k < n; k++) { const c = pick(fc.filter(c => !sr.includes(c) && !sb.includes(c))); if (c == null) break; (sr.length <= sb.length ? sr : sb).push(c); }
    b.ex = { sr, sb }; return b.rec('shutter');
  },
  lights() {
    const r = BUILD.patrol(); if (!r) return null;
    const ey = (r.h >> 1) - 1 + (r.h % 2), fc = []; for (let c = 0; c < 36; c++) if (r.g[c] === '.' && ((c / 6) | 0) !== ey) fc.push(c);
    if (!fc.length) return null; r.sw = pick(fc); r.r = 'lights'; return r;
  },
  vent() {
    const b = L.randomBoard(R, 6, 6, ri(R, 5, 9), { walls: ri(R, 0, 1) });
    const nx = ri(R, 1, 3); for (let k = 0; k < nx; k++) { const c = pick(freeCells(b, c => ((c / 6) | 0) === b.ey)); if (c != null) b.g[c] = 'x'; }
    const fc = freeCells(b); if (fc.length < 2) return null;
    const a = pick(fc), far = fc.filter(c => Math.abs(c % 6 - a % 6) + Math.abs(((c / 6) | 0) - ((a / 6) | 0)) >= 3); if (!far.length) return null;
    b.ex = { vt: [a, pick(far)] }; return b.rec('vent');
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
  const marks = new Set([...(rec.dr || []), ...(rec.gt || []), rec.pl, rec.lk, rec.sw, ...(rec.vt || []), ...(rec.sr || []), ...(rec.sb || [])].filter(c => c != null));
  if (op < .4) {
    const g2 = g.slice(); if (!L.addBlock(R, rec, g2, ey)) return null;
    if ((rec.gt || []).some(c => g2[c] !== '.')) return null;   // nothing may stand in the closed gate
    const nl = g2.find((c, i) => c !== g[i]);
    if (rec.r === 'oneway' && R() < .5) { out.ow = out.ow || {}; out.ow[nl] = R() < .5 ? 1 : -1; }
    if (rec.r === 'heavy' && R() < .35) { out.hv = out.hv || {}; out.hv[nl] = 1; }
    out.g = g2.join('');
    if (rec.r === 'laser' && !E.safe(E.decode(out), E.decode(out).s0)) return null;
  } else if (op < .75 && letters.length > 2) {
    const ch = pick(letters); out.g = g.map(c => c === ch ? '.' : c).join('');
    if (out.ow) { delete out.ow[ch]; if (rec.r === 'oneway' && Object.keys(out.ow).length < 2) return null; }
    if (out.hv) { delete out.hv[ch]; if (rec.r === 'heavy' && !Object.keys(out.hv).length) return null; }
    if (rec.r === 'laser' && !E.safe(E.decode(out), E.decode(out).s0)) return null;
  } else {
    const sp = g.map((c, i) => (c === 'k' || c === 'x') ? i : -1).filter(i => i >= 0), fc = g.map((c, i) => c === '.' && !marks.has(i) && !(rec.r === 'tilt' && ((i / w) | 0) === ey) ? i : -1).filter(i => i >= 0);
    if (!fc.length) return null;
    const what = R();
    if (sp.length && what < .5) { const a = pick(sp), b = pick(fc); g[b] = g[a]; g[a] = '.'; out.g = g.join(''); }
    else if (rec.lk != null) out.lk = pick(fc);
    else if (rec.pl != null) out.pl = pick(fc.filter(c => ((c / w) | 0) !== ey)) ?? rec.pl;
    else if (rec.r === 'laser' && rec.lz && rec.lz.length) {
      const k = Math.floor(R() * rec.lz.length), [c0] = rec.lz[k], px = g.indexOf('A') % w, x = ri(R, px + 2, w - 1), top = R() < .5, c = (top ? 0 : rec.h - 1) * w + x;
      if (g[c] !== '.' || rec.lz.some((e, j) => j !== k && e[0] % w === x)) return null;
      g[c0] = '.'; g[c] = '#'; out.g = g.join(''); out.lz[k] = [c, top ? 3 : 2];
      if (!E.safe(E.decode(out), E.decode(out).s0)) return null;
    }
    else if (rec.r === 'heavy') { const ls = letters; if (!ls.length) return null; const ch = pick(ls); out.hv = out.hv || {}; if (out.hv[ch]) { delete out.hv[ch]; if (!Object.keys(out.hv).length) return null; } else out.hv[ch] = 1; }
    else if (rec.r === 'shutter') { const all = [...(rec.sr || []).map(c => ['sr', c]), ...(rec.sb || []).map(c => ['sb', c])]; if (!all.length) return null; const [k, c] = pick(all); const nc = pick(fc.filter(x => !(rec.sr || []).includes(x) && !(rec.sb || []).includes(x))); if (nc == null) return null; out[k] = out[k].map(x => x === c ? nc : x); if (R() < .25 && all.length < 5) out[R() < .5 ? 'sr' : 'sb'] = [...(out[R() < .5 ? 'sr' : 'sb'] || [])]; }
    else if (rec.r === 'lights') { const c = pick(fc.filter(c => ((c / w) | 0) !== ey)); if (c == null) return null; out.sw = c; }
    else if (rec.r === 'vent' && rec.vt) { const k = R() < .5 ? 0 : 1, c = pick(fc.filter(c => c !== rec.vt[1 - k])); if (c == null) return null; out.vt[k] = c; }
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


return { plainAt, ruleAt, BUILD, mutRule, uniq, pick };
}
module.exports = { make };

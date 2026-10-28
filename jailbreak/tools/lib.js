/* だつごく！スライド — generator helpers (Node). Random layouts for every rule set, component BFS, hill climbing.
   Used by tools/gen.js. Every puzzle that leaves here is re-solved with engine.solve (forward BFS, real escape rules). */
'use strict';
const E = require('../engine.js');
const LET = 'BCDEFGHIJKLMNOPRSTUVWXY';

class Board {
  constructor(w, h) { this.w = w; this.h = h; this.g = new Array(w * h).fill('.'); this.li = 0; this.ow = {}; this.gd = {}; this.ga = {}; this.ex = {}; }
  ok(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.g[y * this.w + x] === '.'; }
  fits(x, y, l, v) { for (let k = 0; k < l; k++) if (!this.ok(x + (v ? 0 : k), y + (v ? k : 0))) return false; return true; }
  put(ch, x, y, l, v) { for (let k = 0; k < l; k++) this.g[(y + (v ? k : 0)) * this.w + x + (v ? 0 : k)] = ch; }
  next() { return LET[this.li++]; }
  rec(r, extra) {
    const o = Object.assign({ w: this.w, h: this.h, g: this.g.join(''), r }, this.ex, extra || {});
    if (Object.keys(this.ow).length) o.ow = this.ow;
    if (Object.keys(this.gd).length) { o.gd = this.gd; if (Object.keys(this.ga).length) o.ga = this.ga; }
    return o;
  }
}
const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
// prisoner + n random blocks. opt: { ey, walls, l3, twin: column for Q, noRowH, keepRow }
function randomBoard(R, w, h, n, opt = {}) {
  const b = new Board(w, h), ey = opt.ey ?? (h >> 1) - 1 + (h % 2);
  b.ey = ey;
  const px = ri(R, 0, Math.max(0, w - 4 - (opt.pxBack || 0)));
  b.put('A', px, ey, 2, 0); b.px = px;
  if (opt.twin != null) { const cx = opt.twin, qy = ri(R, 0, Math.max(0, ey - 2)); if (b.fits(cx, qy, 2, 1)) { b.put('Z', cx, qy, 2, 1); b.cx = cx; } }
  for (let k = 0; k < (opt.walls || 0); k++) for (let t = 0; t < 30; t++) { const x = ri(R, 0, w - 1), y = ri(R, 0, h - 1); if (y === ey || (b.cx != null && x === b.cx)) continue; if (b.ok(x, y)) { b.put('#', x, y, 1, 0); break; } }
  let tries = 0;
  while (b.li < n && tries++ < 400) {
    const v = R() < .5 ? 1 : 0, l = R() < (opt.l3 ?? .28) ? 3 : 2;
    const x = ri(R, 0, w - (v ? 1 : l)), y = ri(R, 0, h - (v ? l : 1));
    if (!v && y === ey) continue;                        // a crate lying in the exit row could never leave it
    if (v && b.cx != null && x === b.cx) continue;      // same for the second prisoner's column
    if (!b.fits(x, y, l, v)) continue;
    b.put(b.next(), x, y, l, v);
  }
  return b;
}
// all states reachable from S0 (rules without escaping), with the distance of each to a solved state (prisoner at the exit)
function component(P, S0, cap = 120000) {
  P.noEsc = true;
  const idx = new Map(), st = [S0], adj = [];
  idx.set(E.key(S0), 0);
  for (let q = 0; q < st.length; q++) {
    const s = st[q], nb = [];
    for (const m of E.moves(P, s)) {
      const t = E.apply(P, s, m), k = E.key(t);
      let j = idx.get(k);
      if (j === undefined) { j = st.length; idx.set(k, j); st.push(t); if (st.length > cap) { P.noEsc = false; return null; } }
      nb.push(j);
    }
    adj.push(nb);
  }
  P.noEsc = false;
  const pi = P.pc.findIndex(p => p.t === 'P'), lp = P.pc[pi].l, dist = new Int32Array(st.length).fill(-1);
  let fr = [];
  st.forEach((s, j) => { if (s[2 * pi] + lp === P.w) { dist[j] = 0; fr.push(j); } });
  let d = 0;
  while (fr.length) { d++; const nx = []; for (const j of fr) for (const k of adj[j]) if (dist[k] < 0) { dist[k] = d; nx.push(k); } fr = nx; }
  return { st, dist, max: d - 1 };
}
// fast component BFS for layouts of plain sliding pieces only (basic / big): a state is one number (3 bits per piece)
function fastComp(rec, cap = 400000) {
  const { w, h, g } = rec, pcs = [], seen = {}, walls = [];
  for (let c = 0; c < w * h; c++) {
    const ch = g[c]; if (ch === '.') continue; if (ch === '#') { walls.push(c); continue; }
    if (seen[ch]) continue; seen[ch] = 1;
    const x = c % w, y = (c / w) | 0, hz = x + 1 < w && g[c + 1] === ch; let l = 1;
    if (hz) while (x + l < w && g[c + l] === ch) l++; else while (y + l < h && g[c + l * w] === ch) l++;
    pcs.push({ ch, v: hz ? 0 : 1, l, fix: hz ? y : x, p: hz ? x : y });
  }
  const n = pcs.length, ai = pcs.findIndex(p => p.ch === 'A'), M = [];
  let mul = 1; for (let i = 0; i < n; i++) { M.push(mul); mul *= 8; }
  const dec = (k, ps) => { for (let i = 0; i < n; i++) { const r = k % 8; ps[i] = r; k = (k - r) / 8; } return ps; };
  const occ = new Uint8Array(w * h), ps = new Int8Array(n);
  let k0 = 0; pcs.forEach((p, i) => { k0 += p.p * M[i]; });
  const idx = new Map([[k0, 0]]), keys = [k0], adjS = [], adj = [];
  for (let q = 0; q < keys.length; q++) {
    const kq = keys[q]; dec(kq, ps); occ.fill(0); for (const c of walls) occ[c] = 1;
    for (let i = 0; i < n; i++) { const p = pcs[i]; for (let k = 0; k < p.l; k++) occ[p.v ? (ps[i] + k) * w + p.fix : p.fix * w + ps[i] + k] = 1; }
    adjS.push(adj.length);
    for (let i = 0; i < n; i++) {
      const p = pcs[i], lim = p.v ? h : w, fx = p.fix, vv = p.v;
      const at = z => vv ? z * w + fx : fx * w + z;
      for (let z = ps[i] - 1; z >= 0 && !occ[at(z)]; z--) { const kt = kq + (z - ps[i]) * M[i]; let j = idx.get(kt); if (j === undefined) { j = keys.length; idx.set(kt, j); keys.push(kt); } adj.push(j); }
      for (let z = ps[i] + p.l; z < lim && !occ[at(z)]; z++) { const kt = kq + (z - ps[i] - p.l + 1) * M[i]; let j = idx.get(kt); if (j === undefined) { j = keys.length; idx.set(kt, j); keys.push(kt); } adj.push(j); }
    }
    if (keys.length > cap) return null;
  }
  adjS.push(adj.length);
  const N = keys.length, dist = new Int16Array(N).fill(-1), lp = pcs[ai].l;
  let fr = [];
  for (let j = 0; j < N; j++) { dec(keys[j], ps); if (ps[ai] + lp === w) { dist[j] = 0; fr.push(j); } }
  let d = 0;
  while (fr.length) { d++; const nx = []; for (const j of fr) for (let e = adjS[j]; e < adjS[j + 1]; e++) { const k = adj[e]; if (dist[k] < 0) { dist[k] = d; nx.push(k); } } fr = nx; }
  const gridOf = j => { const out = new Array(w * h).fill('.'); for (const c of walls) out[c] = '#'; dec(keys[j], ps); pcs.forEach((p, i) => { for (let k = 0; k < p.l; k++) out[p.v ? (ps[i] + k) * w + p.fix : p.fix * w + ps[i] + k] = p.ch; }); return out.join(''); };
  return { N, dist, max: d - 1, gridOf, n };
}
// hill climbing for plain sliding layouts: mutate the hardest state of a component, keep it when the component gets harder
function hardest(c, R) { const js = []; for (let j = 0; j < c.N; j++) if (c.dist[j] === c.max) js.push(j); return c.gridOf(js[Math.floor(R() * js.length)]); }
function addBlock(R, rec, g, ey, l3 = .3) {
  const { w, h } = rec, used = new Set(g.filter(ch => /[B-Y]/.test(ch)));
  const ch = LET.split('').find(c => !used.has(c)); if (!ch) return false;
  for (let t = 0; t < 40; t++) {
    const v = R() < .5 ? 1 : 0, l = R() < l3 ? 3 : 2, x = ri(R, 0, w - (v ? 1 : l)), y = ri(R, 0, h - (v ? l : 1));
    if (!v && y === ey) continue;
    let ok = true; for (let k = 0; k < l; k++) if (g[(y + (v ? k : 0)) * w + x + (v ? 0 : k)] !== '.') ok = false;
    if (!ok) continue;
    for (let k = 0; k < l; k++) g[(y + (v ? k : 0)) * w + x + (v ? 0 : k)] = ch;
    return true;
  }
  return false;
}
function mutate(R, rec, ey, opt = {}) {
  const g = rec.g.split(''), used = [...new Set(g.filter(ch => /[B-Y]/.test(ch)))], op = R();
  if (op < .4 || used.length < 3) { if (!addBlock(R, rec, g, ey, opt.l3)) return null; }
  else {
    const ch = used[Math.floor(R() * used.length)];
    for (let i = 0; i < g.length; i++) if (g[i] === ch) g[i] = '.';
    if (op > .7 && !addBlock(R, rec, g, ey, opt.l3)) return null;
  }
  if (opt.maxN && new Set(g.filter(ch => /[B-Y]/.test(ch))).size > opt.maxN) return null;
  return Object.assign({}, rec, { g: g.join('') });
}
function climb(R, rec, iters, opt = {}) {
  const cap = opt.cap || 200000, ey = opt.ey ?? 2, stop = opt.stop || 99;
  const c = fastComp(rec, cap); if (!c || c.max < 1) return null;
  let best = { g: hardest(c, R), max: c.max, N: c.N };
  for (let it = 0; it < iters && best.max < stop; it++) {
    const m = mutate(R, Object.assign({}, rec, { g: best.g }), ey, opt); if (!m) continue;
    const c2 = fastComp(m, cap); if (!c2 || c2.max < 1) continue;
    if (c2.max >= best.max) best = { g: hardest(c2, R), max: c2.max, N: c2.N };
  }
  return Object.assign({}, rec, { g: best.g, o: best.max, N: best.N });
}
const solveRec = (rec, cap) => { const P = E.decode(rec); return E.solve(P, P.s0, cap); };
// canonical key of a layout (dedupe)
const canon = rec => rec.r + '|' + rec.w + 'x' + rec.h + '|' + rec.g.replace(/[B-Y]/g, '*') + '|' + JSON.stringify([rec.ow, rec.gd, rec.pl, rec.dr, rec.lk, rec.gt, rec.n, rec.lz, rec.hv, rec.sr, rec.sb, rec.sw, rec.vt]);
module.exports = { E, Board, randomBoard, component, fastComp, climb, mutate, addBlock, hardest, solveRec, canon, ri, LET };

/* だつごくスライダー！ — rules engine + BFS solver (browser and Node: tools/gen.js uses the same file).
   Board: w×h cells, x → right, y ↓ down, cell c = y*w + x.
   Pieces (static info pc[i] = { t, l, v, f }):
     P  the prisoner: horizontal, escapes through the right edge of its row (x + l === w)
     Q  second prisoner (TWIN): vertical, escapes through the bottom edge of its column (y + l === h)
     b  block (crate / locker / bunk), slides along its axis      o  one-way cart: only in direction f (+1 / −1)
     g  guard: player can't move it; marches 1 cell every gn moves along its axis, turning round when blocked
     k  key: 1×1, slides along both axes; dropped on the lock cell it is used up and the gate opens
     x  crate: 1×1, slides along both axes (TILT)
   Fixed cells: walls, cracks (DIG: the prisoner digs through a cracked wall next to it, 1 move), gate (opens with the key),
   doors (bars that are open while some other piece stands on the pressure plate).
   Rules: ice (every slide goes as far as it can), tilt (a move tilts the whole cell: everything slides one way).
   2026-10 rules: LASER (emitters on wall cells shoot a beam that stops at walls / pieces but passes the prisoners; a prisoner may
   never touch a lit cell, and no move may leave a prisoner in the beam) · HEAVY safes (1 cell per move) · SHUTTERS (red and
   blue cells swap open / shut after every move; shut = wall, except for a piece already standing in it) · LIGHTS switch
   (covering the switch with a move turns every guard round) · VENT (a 1×1 crate or key that stops on one duct end comes out of
   the other, when it is free).
   State S = [x0, y0, x1, y1, …, guard dirs…, crack mask, tick]  (x = −1: piece gone — escaped prisoner / used key)
   Move m = [i, dx, dy] slide piece i · [-1, c] dig cell c · [-2, d] tilt (0 ← 1 → 2 ↑ 3 ↓) */
(function (root) {
'use strict';
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

/* ---------- puzzle records (stages.json) ----------
   { w, h, g: 'grid string w*h', o: optimal moves, r: rule, n?: guard period, ow?: {letter: ±1}, gd?: {letter: ±1},
     pl?: plate cell, dr?: [door cells], lk?: lock cell, gt?: [gate cells],
     lz?: [[cell, dir]] laser emitters (on wall cells, dir = DIRS index), hv?: {letter: 1} heavy safes,
     sr?: [cells] red shutters (shut first), sb?: [cells] blue shutters, sw?: lights switch cell, vt?: [cellA, cellB] vent }
   grid chars: '.' floor  '#' wall  '%' crack  'A' prisoner P  'Z' prisoner Q  'k' key  'x' crate  other letters: blocks / carts / guards */
function decode(rec) {
  const w = rec.w || 6, h = rec.h || 6, g = rec.g, r = rec.r || 'basic';
  const P = { w, h, r, ice: r === 'ice', tilt: r === 'tilt', gn: rec.n || 1, walls: [], cracks: [], doors: rec.dr || [], plate: rec.pl ?? -1,
    lock: rec.lk ?? -1, gate: rec.gt || [], pc: [], o: rec.o || 0, guards: [] };
  const seen = {}, S = [];
  for (let c = 0; c < w * h; c++) {
    const ch = g[c];
    if (ch === '.') continue;
    if (ch === '#') { P.walls.push(c); continue; }
    if (ch === '%') { P.cracks.push(c); continue; }
    if (ch === 'k' || ch === 'x') { P.pc.push({ t: ch, l: 1, v: 0, f: 0, ch }); S.push(c % w, (c / w) | 0); continue; }
    if (seen[ch]) continue;
    seen[ch] = 1;
    const x = c % w, y = (c / w) | 0, hz = x + 1 < w && g[c + 1] === ch;
    let l = 1; if (hz) while (x + l < w && g[c + l] === ch) l++; else while (y + l < h && g[c + l * w] === ch) l++;
    const t = ch === 'A' ? 'P' : ch === 'Z' ? 'Q' : rec.gd && rec.gd[ch] ? 'g' : rec.ow && rec.ow[ch] ? 'o' : 'b';
    P.pc.push({ t, l, v: hz ? 0 : 1, f: t === 'o' ? rec.ow[ch] : 0, ch, d0: t === 'g' ? rec.gd[ch] : 0 });
    S.push(x, y);
  }
  // single cells that are not 'k'/'x' (a 1-long block) are vertical by the scan above: give guards their axis from gd sign convention
  P.pc.forEach((p, i) => { if (p.t === 'g') P.guards.push(i); if (p.t === 'g' && p.l === 1 && rec.ga && rec.ga[p.ch] === 'h') p.v = 0; });
  P.guards.forEach(i => S.push(P.pc[i].d0));
  S.push(P.cracks.length ? (1 << P.cracks.length) - 1 : 0, 0);
  P.nG = P.guards.length; P.iCr = P.pc.length * 2 + P.nG; P.iTk = P.iCr + 1;
  P.hasKey = P.pc.some(p => p.t === 'k');
  P.isDoor = new Uint8Array(w * h); P.doors.forEach(c => { P.isDoor[c] = 1; });
  // 2026-10 rules
  P.lz = rec.lz || [];
  if (rec.hv) P.pc.forEach(p => { if (rec.hv[p.ch]) p.hv = 1; });
  P.sr = rec.sr || []; P.sb = rec.sb || []; P.shut = new Uint8Array(w * h); P.sr.forEach(c => { P.shut[c] = 1; }); P.sb.forEach(c => { P.shut[c] = 2; });
  P.iSh = -1; if (P.sr.length || P.sb.length) { P.iSh = S.length; S.push(0); }
  P.sw = rec.sw ?? -1; P.vt = rec.vt || null;
  P.s0 = S;
  return P;
}
// build a record from a puzzle + state (used by the generator)
function encode(P, S, extra) {
  const { w, h } = P, g = new Array(w * h).fill('.');
  P.walls.forEach(c => { g[c] = '#'; });
  P.cracks.forEach((c, k) => { if (S[P.iCr] >> k & 1) g[c] = '%'; });
  const L = 'BCDEFGHIJKLMNOPRSTUVWXY', ow = {}, gd = {}, ga = {};
  let li = 0;
  P.pc.forEach((p, i) => {
    const x = S[2 * i], y = S[2 * i + 1]; if (x < 0) return;
    const ch = p.t === 'P' ? 'A' : p.t === 'Q' ? 'Z' : p.t === 'k' ? 'k' : p.t === 'x' ? 'x' : L[li++];
    for (let k = 0; k < p.l; k++) g[(y + (p.v ? k : 0)) * w + x + (p.v ? 0 : k)] = ch;
    if (p.t === 'o') ow[ch] = p.f;
    if (p.t === 'g') { gd[ch] = S[2 * P.pc.length + P.guards.indexOf(i)]; if (p.l === 1 && !p.v) ga[ch] = 'h'; }
  });
  const rec = { w, h, g: g.join(''), r: P.r };
  if (Object.keys(ow).length) rec.ow = ow;
  if (Object.keys(gd).length) { rec.gd = gd; if (Object.keys(ga).length) rec.ga = ga; if (P.gn > 1) rec.n = P.gn; }
  if (P.plate >= 0) { rec.pl = P.plate; rec.dr = P.doors.slice(); }
  if (P.lock >= 0) { rec.lk = P.lock; rec.gt = P.gate.slice(); }
  if (P.lz.length) rec.lz = P.lz.map(e => e.slice());
  if (P.sr.length) rec.sr = P.sr.slice(); if (P.sb.length) rec.sb = P.sb.slice();
  if (P.sw >= 0) rec.sw = P.sw; if (P.vt) rec.vt = P.vt.slice();
  return Object.assign(rec, extra || {});
}

/* ---------- board ---------- */
// occupancy: 0 free, i+1 piece i, -1 wall, -2 crack, -3 closed gate
function grid(P, S) {
  const g = new Int16Array(P.w * P.h);
  for (const c of P.walls) g[c] = -1;
  const m = S[P.iCr]; P.cracks.forEach((c, k) => { if (m >> k & 1) g[c] = -2; });
  if (P.gate.length && gateShut(P, S)) for (const c of P.gate) g[c] = -3;
  const pc = P.pc, w = P.w;
  for (let i = 0; i < pc.length; i++) {
    const x = S[2 * i]; if (x < 0) continue;
    const y = S[2 * i + 1], p = pc[i];
    for (let k = 0; k < p.l; k++) g[(y + (p.v ? k : 0)) * w + x + (p.v ? 0 : k)] = i + 1;
  }
  return g;
}
function gateShut(P, S) { for (let i = 0; i < P.pc.length; i++) if (P.pc[i].t === 'k' && S[2 * i] >= 0) return true; return false; }
// doors are open while the plate is covered by a piece other than `mover`
const doorsOpen = (P, g, mover) => P.plate >= 0 && g[P.plate] > 0 && g[P.plate] !== mover + 1;
// shutters: red (1) shut on even moves, blue (2) on odd ones
const shutNow = (P, S, c) => P.shut[c] && ((P.shut[c] === 1) === !S[P.iSh]);
// cells lit by the lasers: the beam passes the prisoners (so they can be caught in it) and stops at anything else
function lit(P, S, g) {
  const m = new Uint8Array(P.w * P.h), w = P.w, h = P.h;
  for (const [e, d] of P.lz) {
    const [dx, dy] = DIRS[d]; let x = e % w + dx, y = ((e / w) | 0) + dy;
    while (x >= 0 && y >= 0 && x < w && y < h) {
      const c = y * w + x, v = g[c];
      if (v < 0 || (v > 0 && P.pc[v - 1].t !== 'P' && P.pc[v - 1].t !== 'Q')) break;
      m[c] = 1; x += dx; y += dy;
    }
  }
  return m;
}
// no prisoner stands in a beam
function safe(P, S, g) {
  if (!P.lz.length) return true;
  g = g || grid(P, S); const L = lit(P, S, g);
  for (let i = 0; i < P.pc.length; i++) { const t = P.pc[i].t; if ((t === 'P' || t === 'Q') && S[2 * i] >= 0) for (const c of cells(P, S, i)) if (L[c]) return false; }
  return true;
}
// can piece i put a cell on c? (c inside the board)
function free(P, g, i, c, open, S, L) {
  const v = g[c];
  if (v !== 0 && v !== i + 1) return false;
  if (P.isDoor[c] && v !== i + 1 && !open) return false;
  if (S && P.iSh >= 0 && v !== i + 1 && shutNow(P, S, c)) return false;
  if (L && L[c]) return false;
  return true;
}
// how far piece i can slide in direction (dx,dy); returns { n, esc } — esc: the last step takes a prisoner out through its exit
function reach(P, S, g, i, dx, dy) {
  const p = P.pc[i], w = P.w, h = P.h; let x = S[2 * i], y = S[2 * i + 1], n = 0;
  if (x < 0) return { n: 0, esc: false };
  if (p.l > 1 && ((p.v && dx) || (!p.v && dy))) return { n: 0, esc: false };   // long pieces only along their axis
  const open = doorsOpen(P, g, i), L = P.lz.length && (p.t === 'P' || p.t === 'Q') ? lit(P, S, g) : null;
  for (;;) {
    // the cell the piece enters next
    let lx = x + dx, ly = y + dy;
    if (p.l > 1) { if (p.v) ly = dy > 0 ? y + p.l : y - 1; else lx = dx > 0 ? x + p.l : x - 1; }
    if (lx < 0 || ly < 0 || lx >= w || ly >= h) return { n, esc: false };
    if (!free(P, g, i, ly * w + lx, open, S, L)) return { n, esc: false };
    x += dx; y += dy; n++;
    if (p.t === 'P' && x + p.l === w) return { n, esc: true };
    if (p.t === 'Q' && y + p.l === h) return { n, esc: true };
  }
}
function axisDirs(p) {
  if (p.t === 'g') return [];
  if (p.l === 1 && (p.t === 'k' || p.t === 'x')) return DIRS;
  const d = p.v ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
  if (p.t === 'o') return p.f > 0 ? [d[1]] : [d[0]];
  return d;
}
// how far piece i may really go: heavy safes 1 cell; with lasers no slide may leave a prisoner in a beam (safety only gets
// lost once along a slide, so the legal distances are 1…m)
function limit(P, S, i, dx, dy, n) {
  if (P.pc[i].hv) n = Math.min(n, 1);
  if (!P.lz.length || P.pc[i].t === 'P' || P.pc[i].t === 'Q') return n;
  for (let k = 1; k <= n; k++) { const T = S.slice(); T[2 * i] += dx * k; T[2 * i + 1] += dy * k; if (!safe(P, T)) return k - 1; }
  return n;
}
function moves(P, S) {
  const out = [];
  if (P.tilt) { for (let d = 0; d < 4; d++) { const T = tiltState(P, S, d); if (T) out.push([-2, d]); } return out; }
  const g = grid(P, S);
  for (let i = 0; i < P.pc.length; i++) {
    if (S[2 * i] < 0) continue;
    for (const [dx, dy] of axisDirs(P.pc[i])) {
      const r = reach(P, S, g, i, dx, dy);
      if (r.n && (P.pc[i].hv || P.lz.length)) r.n = limit(P, S, i, dx, dy, r.n);
      if (!r.n) continue;
      if (P.ice) out.push([i, dx * r.n, dy * r.n]);
      else for (let k = 1; k <= r.n; k++) out.push([i, dx * k, dy * k]);
    }
  }
  if (P.cracks.length) for (const c of digs(P, S, g)) out.push([-1, c]);
  return out;
}
// cracked walls next to a prisoner
function digs(P, S, g) {
  g = g || grid(P, S); const out = [], w = P.w, m = S[P.iCr];
  P.cracks.forEach((c, k) => {
    if (!(m >> k & 1)) return;
    const x = c % w, y = (c / w) | 0;
    for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= P.h) continue; const v = g[ny * w + nx]; if (v > 0 && (P.pc[v - 1].t === 'P' || P.pc[v - 1].t === 'Q')) { out.push(c); return; } }
  });
  return out;
}
// apply a move → new state (ev, when given, collects what happened for the animation)
function apply(P, S0, m, ev) {
  const S = S0.slice();
  if (m[0] === -2) { const T = tiltState(P, S0, m[1], ev); return after(P, S0, T || S, ev); }
  if (m[0] === -1) { const k = P.cracks.indexOf(m[1]); S[P.iCr] &= ~(1 << k); if (ev) ev.dug = m[1]; return after(P, S0, S, ev); }
  const i = m[0]; S[2 * i] += m[1]; S[2 * i + 1] += m[2];
  settle(P, S, i, ev);
  return after(P, S0, S, ev);
}
// after every move: the lights switch (newly covered by a non-guard → guards turn round), shutters swap, guards march
function after(P, S0, S, ev) {
  if (P.sw >= 0 && P.nG) {
    const cov = T => { const v = grid(P, T)[P.sw]; return v > 0 && P.pc[v - 1].t !== 'g'; };
    if (cov(S) && !cov(S0)) { const base = 2 * P.pc.length; for (let q = 0; q < P.nG; q++) S[base + q] = -S[base + q]; if (ev) ev.lights = 1; }
  }
  if (P.iSh >= 0) { S[P.iSh] ^= 1; if (ev) ev.shut = 1; }
  return guardsStep(P, S, ev);
}
// after piece i moved: prisoner out of the exit, key on the lock
function settle(P, S, i, ev) {
  const p = P.pc[i];
  // VENT: a 1×1 crate / key that stops on a duct end comes out of the other end (when that end is free)
  if (P.vt && p.l === 1 && (p.t === 'x' || p.t === 'k')) {
    const c = S[2 * i + 1] * P.w + S[2 * i], j = P.vt.indexOf(c);
    if (j >= 0) { const to = P.vt[1 - j], g = grid(P, S); if (g[to] === 0 && !(P.iSh >= 0 && shutNow(P, S, to))) { S[2 * i] = to % P.w; S[2 * i + 1] = (to / P.w) | 0; if (ev) ev.vent = [i, c, to]; } }
  }
  const x = S[2 * i], y = S[2 * i + 1];
  if (!P.noEsc && ((p.t === 'P' && x + p.l === P.w) || (p.t === 'Q' && y + p.l === P.h))) { S[2 * i] = -1; S[2 * i + 1] = -1; if (ev) (ev.esc = ev.esc || []).push(i); }
  else if (p.t === 'k' && y * P.w + x === P.lock) { S[2 * i] = -1; S[2 * i + 1] = -1; if (ev) ev.key = i; }
}
function guardsStep(P, S, ev) {
  if (!P.nG) return S;
  const tk = (S[P.iTk] + 1) % P.gn; S[P.iTk] = tk;
  if (tk !== 0) return S;
  const base = 2 * P.pc.length;
  for (let q = 0; q < P.nG; q++) {
    const i = P.guards[q], p = P.pc[i];
    for (let tries = 0; tries < 2; tries++) {
      const d = S[base + q], dx = p.v ? 0 : d, dy = p.v ? d : 0, g = grid(P, S), r = reach(P, S, g, i, dx, dy);
      if (r.n > 0 && !r.esc) { S[2 * i] += dx; S[2 * i + 1] += dy; if (ev) (ev.guards = ev.guards || []).push(i); break; }
      S[base + q] = -d;
    }
  }
  return S;
}
// TILT: every free piece slides as far as it can in direction d; returns null when nothing moves
function tiltState(P, S0, d, ev) {
  const [dx, dy] = DIRS[d], S = S0.slice(), pc = P.pc, ord = [];
  for (let i = 0; i < pc.length; i++) {
    if (S[2 * i] < 0) continue; const p = pc[i];
    if (p.t === 'g' || p.t === 'o') continue;
    if (p.l > 1 && ((p.v && dx) || (!p.v && dy))) continue;
    const lead = dx > 0 ? S[2 * i] + (p.v ? 1 : p.l) : dx < 0 ? -S[2 * i] : dy > 0 ? S[2 * i + 1] + (p.v ? p.l : 1) : -S[2 * i + 1];
    ord.push([lead, i]);
  }
  ord.sort((a, b) => b[0] - a[0]);
  let moved = false;
  for (const [, i] of ord) {
    const g = grid(P, S), r = reach(P, S, g, i, dx, dy);
    if (!r.n) continue;
    moved = true; S[2 * i] += dx * r.n; S[2 * i + 1] += dy * r.n;
    if (ev) (ev.tilt = ev.tilt || []).push([i, dx * r.n, dy * r.n]);
    settle(P, S, i, ev);
  }
  return moved ? S : null;
}
const solved = (P, S) => { for (let i = 0; i < P.pc.length; i++) { const t = P.pc[i].t; if ((t === 'P' || t === 'Q') && S[2 * i] >= 0) return false; } return true; };
const key = S => { const a = new Array(S.length); for (let i = 0; i < S.length; i++) a[i] = S[i] + 3; return String.fromCharCode.apply(null, a); };

/* ---------- BFS solver: shortest escape (moves), path of moves ---------- */
function solve(P, S, limit = 400000) {
  if (solved(P, S)) return { n: 0, path: [], states: 1 };
  const seen = new Map(); seen.set(key(S), null);
  let frontier = [S], depth = 0, count = 1;
  const par = new Map();
  while (frontier.length) {
    depth++;
    const next = [];
    for (const s of frontier) {
      const ks = key(s);
      for (const m of moves(P, s)) {
        const t = apply(P, s, m), kt = key(t);
        if (seen.has(kt)) continue;
        seen.set(kt, ks); par.set(kt, m); count++;
        if (solved(P, t)) {
          const path = []; let k = kt;
          while (seen.get(k) !== null) { path.push(par.get(k)); k = seen.get(k); }
          return { n: depth, path: path.reverse(), states: count };
        }
        if (count > limit) return { n: -1, path: null, states: count, capped: true };
        next.push(t);
      }
    }
    frontier = next;
  }
  return { n: -1, path: null, states: count };
}
// the cells a piece covers
function cells(P, S, i) { const p = P.pc[i], x = S[2 * i], y = S[2 * i + 1], o = []; if (x < 0) return o; for (let k = 0; k < p.l; k++) o.push((y + (p.v ? k : 0)) * P.w + x + (p.v ? 0 : k)); return o; }
// drag limits for the UI: along each axis, how far back / forward (with escape flags)
function range(P, S, i) {
  const g = grid(P, S), p = P.pc[i], out = {};
  if (p.t === 'g') return null;
  for (const [dx, dy] of axisDirs(p)) { const r = reach(P, S, g, i, dx, dy); if (r.n && (p.hv || P.lz.length)) { const n = limit(P, S, i, dx, dy, r.n); if (n < r.n) r.esc = false; r.n = n; } out[dx < 0 ? 'l' : dx > 0 ? 'r' : dy < 0 ? 'u' : 'd'] = r; }
  return out;
}
// seeded RNG (mulberry32) + string hash for daily puzzles
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }

const API = { decode, encode, grid, moves, apply, solve, solved, key, range, reach, cells, digs, tiltState, gateShut, doorsOpen, lit, safe, shutNow, rng, hashStr, DIRS };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.JBEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);

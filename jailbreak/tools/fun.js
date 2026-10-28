/* だつごくスライダー！ — puzzle "fun score" (0–100) + rule-relevance checks (Node).
   analyze(rec) → { o, score, ok, why: [...reasons it was rejected], m: metrics }
   The whole reachable state graph is explored (escapes allowed, solved states are terminal), every state gets its distance
   to a solved state, and the score is built from how much thinking the optimal line asks for:
     prec   average share of the legal moves that keep you on an optimal line (low = you have to find the move)
     forced share of optimal-line states where every legal move is optimal (high = autopilot)
     pieces distinct pieces moved in the optimal line · reuse: pieces moved more than once (interplay)
     sols   number of optimal move sequences (few = a sharp, unique idea) · detour: the prisoner has to back off first
     traps  share of reachable states with no way out (one-way rules: tension)
   Rule checks (hard rejections — the owner's rules: a rule stage must really use its rule):
     oneway  frozen carts → must be unsolvable (you cannot clear without moving a one-way cart)
     patrol  the guard must step along the solution, and the guard must matter (as a wall / removed → different optimum)
     twin    neither prisoner can get out in fewer than 3 moves on its own (no "first move clears one")
     ice     the same layout without ice must be solvable in fewer moves (ice makes it trickier)
     dig     the cracks inside the room must matter (as plain walls → longer or unsolvable)
     plate   the plate starts uncovered, and the doors must matter
     key     the key has to travel (two key moves or more) */
'use strict';
const E = require('../engine.js');

function graph(P, cap) {
  const idx = new Map(), st = [P.s0], adjS = [0], adj = [];
  idx.set(E.key(P.s0), 0);
  const goal = [];
  for (let q = 0; q < st.length; q++) {
    const s = st[q];
    if (E.solved(P, s)) { goal.push(q); adjS.push(adj.length); continue; }
    const seenHere = new Set();
    for (const m of E.moves(P, s)) {
      const t = E.apply(P, s, m), k = E.key(t);
      let j = idx.get(k);
      if (j === undefined) { j = st.length; idx.set(k, j); st.push(t); if (st.length > cap) return null; }
      if (j === q || seenHere.has(j)) continue;
      seenHere.add(j); adj.push(j);
    }
    adjS.push(adj.length);
  }
  const N = st.length, radj = Array.from({ length: N }, () => []);
  for (let a = 0; a < N; a++) for (let e = adjS[a]; e < adjS[a + 1]; e++) radj[adj[e]].push(a);
  const dist = new Int32Array(N).fill(-1); let fr = goal.slice(); goal.forEach(j => { dist[j] = 0; });
  let d = 0;
  while (fr.length) { d++; const nx = []; for (const j of fr) for (const k of radj[j]) if (dist[k] < 0) { dist[k] = d; nx.push(k); } fr = nx; }
  return { st, adjS, adj, dist, N };
}
const optOf = (rec, cap = 400000) => { const P = E.decode(rec), r = E.solve(P, P.s0, cap); return r.n; };
const clone = r => JSON.parse(JSON.stringify(r));
// layout variants for the rule checks
function wallify(rec, pred) {        // turn the cells of matching pieces into walls
  const g = rec.g.split(''), r = clone(rec);
  for (let i = 0; i < g.length; i++) if (pred(g[i], i)) g[i] = '#';
  r.g = g.join(''); return r;
}

function analyze(rec, opt = {}) {
  const P = E.decode(rec), why = [], m = {};
  const G = graph(P, opt.cap || 300000);
  if (!G) {   // too big to map: fall back to the solver only (big boards)
    const s = E.solve(P, P.s0, 3000000);
    if (s.n < 1) return { o: -1, score: 0, ok: false, why: ['unsolvable'], m };
    return Object.assign(pathOnly(P, rec, s.path), { o: s.n });
  }
  const o = G.dist[0];
  if (o < 1) return { o, score: 0, ok: false, why: ['unsolvable'], m };
  m.N = G.N; m.o = o;
  // walk one optimal line (prefer the stored / solver path so pieces & detours are measured on a real line)
  let s = 0, good = 0, forced = 0, steps = 0;
  const path = E.solve(P, P.s0, 3000000).path;
  let S = P.s0; const keyIdx = new Map(); G.st.forEach((x, j) => keyIdx.set(E.key(x), j));
  for (const mv of path) {
    const j = keyIdx.get(E.key(S)); const d = G.dist[j];
    let g = 0, t = 0;
    for (let e = G.adjS[j]; e < G.adjS[j + 1]; e++) { t++; if (G.dist[G.adj[e]] === d - 1) g++; }
    if (t) { good += g / t; steps++; if (g === t) forced++; }
    S = E.apply(P, S, mv);
  }
  m.prec = good / Math.max(1, steps); m.forced = forced / Math.max(1, steps);
  // number of optimal sequences (DAG count, capped)
  const order = []; for (let j = 0; j < G.N; j++) if (G.dist[j] >= 0) order.push(j);
  order.sort((a, b) => G.dist[a] - G.dist[b]);
  const cnt = new Float64Array(G.N);
  for (const j of order) { if (G.dist[j] === 0) { cnt[j] = 1; continue; } let c = 0; for (let e = G.adjS[j]; e < G.adjS[j + 1]; e++) { const k = G.adj[e]; if (G.dist[k] === G.dist[j] - 1) c += cnt[k]; } cnt[j] = Math.min(c, 1e9); }
  m.sols = cnt[0];
  let dead = 0; for (let j = 0; j < G.N; j++) if (G.dist[j] < 0) dead++;
  m.traps = dead / G.N;
  Object.assign(m, lineStats(P, path));
  m.score = scoreOf(m, o);
  checks(rec, P, path, o, why, m);
  return { o, score: m.score, ok: !why.length, why, m, path };
}
function lineStats(P, path) {
  const moved = {}, dirs = {}; let detour = 0, S = P.s0, guardSteps = 0, digs = 0, lights = 0, vents = 0, heavyMoves = 0;
  for (const mv of path) {
    const ev = {};
    if (mv[0] >= 0) {
      const i = mv[0]; moved[i] = (moved[i] || 0) + 1;
      const d = Math.sign(mv[1] || mv[2]); (dirs[i] = dirs[i] || new Set()).add(d);
      const p = P.pc[i]; if ((p.t === 'P' && mv[1] < 0) || (p.t === 'Q' && mv[2] < 0)) detour = 1;
    } else if (mv[0] === -1) digs++;
    else { for (let i = 0; i < P.pc.length; i++) moved[i] = moved[i] || 0; }
    if (mv[0] >= 0 && P.pc[mv[0]].hv) heavyMoves++;
    S = E.apply(P, S, mv, ev); if (ev.guards) guardSteps += ev.guards.length; if (ev.lights) lights++; if (ev.vent) vents++;
    if (ev.tilt) ev.tilt.forEach(([i]) => { moved[i] = (moved[i] || 0) + 1; });
  }
  const ks = Object.keys(moved).filter(k => moved[k] > 0), ki = P.pc.findIndex(p => p.t === 'k');
  return { lights, vents, heavyMoves, keyMoves: ki >= 0 ? moved[ki] || 0 : 0, pieces: ks.length, reuse: ks.filter(k => moved[k] > 1).length, back: Object.values(dirs).filter(s => s.size > 1).length, detour, guardSteps, digs, movable: P.pc.filter(p => p.t !== 'g').length };
}
// interplay = share of the moves that come back to a piece already moved (a pure "clear the blockers one by one" chain scores 0)
function scoreOf(m, o) {
  let s = 30;
  const inter = Math.max(0, (o - m.pieces) / o);
  s += 30 * Math.min(1, inter / .4);
  s += 5 * Math.min(2, m.back);
  if (m.detour) s += 8;
  if (m.sols != null) { const u = Math.log10(Math.max(1, m.sols)) / o; s += u < .05 ? 14 : u < .1 ? 10 : u < .2 ? 5 : u > .35 ? -5 : 0; }
  if (m.prec != null) { s += (0.3 - m.prec) * 40; s -= 20 * m.forced; }
  if (m.traps != null && m.traps > .05) s += Math.min(6, m.traps * 20);
  if (o <= 3) s -= 10;
  return Math.max(0, Math.min(100, Math.round(s)));
}
function pathOnly(P, rec, path) {
  const m = lineStats(P, path); m.score = scoreOf(m, path.length); const why = [];
  checks(rec, P, path, path.length, why, m);
  return { score: m.score, ok: !why.length, why, m, path };
}
function checks(rec, P, path, o, why, m) {
  const r = rec.r || 'basic';
  if (r === 'oneway') {
    const ow = Object.keys(rec.ow || {});
    if (!ow.length) why.push('no carts');
    else if (optOf(wallify(rec, ch => ow.includes(ch))) > 0) why.push('solvable without moving a one-way cart');
    else { const free = clone(rec); free.r = 'basic'; delete free.ow; const fo = optOf(free); m.owGain = fo > 0 ? o - fo : 99; }
  }
  if (r === 'patrol') {
    if (m.guardSteps < 2) why.push('guard hardly moves');
    const gd = Object.keys(rec.gd || {});
    const asWall = optOf(wallify(rec, ch => gd.includes(ch)));
    const gone = clone(rec); gone.g = rec.g.split('').map(ch => gd.includes(ch) ? '.' : ch).join(''); delete gone.gd; delete gone.ga; delete gone.n; gone.r = 'basic';
    const go = optOf(gone);
    if (asWall === o && go === o) why.push('guard does not matter');
  }
  if (r === 'twin') {
    // each prisoner on its own (the other one counts as a plain block)
    const free = 'BCDEFGHIJKLMNOPRSTUVWXY'.split('').find(ch => !rec.g.includes(ch));
    const solo = other => { const x = clone(rec); x.g = rec.g.split(other).join(free); return x; };
    const a = optOf(solo('Z')), b = optOf(solo('A'));
    m.soloA = a; m.soloB = b;
    if ((a > 0 && a < 3) || (b > 0 && b < 3)) why.push('a prisoner gets out too soon');
  }
  if (r === 'ice') {
    const b = clone(rec); b.r = 'basic'; const bo = optOf(b); m.iceGain = bo > 0 ? o - bo : 99;
    if (bo > 0 && bo >= o) why.push('ice does not matter');
  }
  if (r === 'dig') {
    const w = rec.w || 6, h = rec.h || 6, ey = (h >> 1) - 1 + (h % 2), ex = ey * w + w - 1;
    const inner = []; for (let c = 0; c < rec.g.length; c++) if (rec.g[c] === '%' && c !== ex) inner.push(c);
    if (inner.length) { const wo = optOf(wallify(rec, (ch, i) => inner.includes(i))); if (wo === o) why.push('inner cracks do not matter'); }
    else why.push('no inner cracks');
  }
  // ---- 2026-10 rules: each must really shape the solution ----
  if (r === 'laser') {
    const x = clone(rec); delete x.lz; x.r = 'basic'; const xo = optOf(x);
    if (xo > 0 && xo >= o) why.push('laser does not matter');
  }
  if (r === 'heavy') {
    if ((m.heavyMoves || 0) < 2) why.push('safe barely moves');
    const x = clone(rec); delete x.hv; x.r = 'basic'; const xo = optOf(x);
    if (xo > 0 && xo >= o) why.push('weight does not matter');
  }
  if (r === 'shutter') {
    const x = clone(rec); delete x.sr; delete x.sb; x.r = 'basic'; const xo = optOf(x);
    if (xo > 0 && xo >= o) why.push('shutters do not matter');
  }
  if (r === 'lights') {
    if (!m.lights) why.push('switch not used');
    if (m.guardSteps < 2) why.push('guard hardly moves');
    const x = clone(rec); delete x.sw; x.r = 'patrol'; if (optOf(x) === o) why.push('switch does not matter');
  }
  if (r === 'vent') {
    if (!m.vents) why.push('vent not used');
    const x = clone(rec); delete x.vt; x.r = 'basic'; const xo = optOf(x);
    if (xo > 0 && xo <= o) why.push('vent does not matter');
  }
  if (r === 'plate') {
    if (rec.g[rec.pl] !== '.') why.push('plate starts covered');
  }
  if (r === 'key') {
    // the key has to go somewhere: at least two key moves (a key sitting next to its lock is a freebie)
    if ((m.keyMoves || 0) < 2) why.push('key barely moves');
  }
}
module.exports = { analyze, graph, scoreOf, optOf };

if (require.main === module) {
  // node tools/fun.js [stages.json]  → score histogram of every stage set
  const ST = require(process.argv[2] || '../stages.json');
  const sets = Object.assign({ course: ST.course }, ST.modes);
  for (const k in sets) {
    const res = sets[k].map(r => analyze(Object.assign({ w: 6, h: 6, r: k === 'course' || k === 'silent' || k === 'big' ? 'basic' : k }, r)));
    const ok = res.filter(x => x.ok), sc = ok.map(x => x.score).sort((a, b) => a - b);
    const why = {}; res.forEach(x => x.why.forEach(w => { why[w] = (why[w] || 0) + 1; }));
    console.log(k, 'n', res.length, 'ok', ok.length, 'score p10/50/90', sc[Math.floor(sc.length * .1)], sc[Math.floor(sc.length * .5)], sc[Math.floor(sc.length * .9)], JSON.stringify(why));
  }
}

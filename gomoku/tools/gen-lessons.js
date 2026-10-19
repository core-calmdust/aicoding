// Generate lessons.json: 12 steps x 5 problems, every problem taken from a self-play position and checked with the engine.
// node tools/gen-lessons.js <games.jsonl> <mined-puzzles.jsonl> [out=lessons.json]
'use strict';
const E = require('../engine.js');
const fs = require('fs');
const N = 15, { sqName, sqOf, M2I, I2M } = E;
const games = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').map(l => JSON.parse(l));
const mined = fs.readFileSync(process.argv[3], 'utf8').trim().split('\n').map(l => JSON.parse(l));
const OUT = process.argv[4] || require('path').join(__dirname, '..', 'lessons.json');
let seed = 20261019; const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };

// ---------- brute-force line helpers on a plain grid (0 empty, 1 black, 2 white)
const DIR = [[1, 0], [0, 1], [1, 1], [-1, 1]];
const at = (g, c, r) => (c < 0 || r < 0 || c >= N || r >= N) ? 3 : g[r * N + c];
function runLen(g, m, d, col) { const [dx, dy] = DIR[d], c0 = m % N, r0 = (m / N) | 0; let n = 1, c = c0 + dx, r = r0 + dy; while (at(g, c, r) === col) { n++; c += dx; r += dy; } c = c0 - dx; r = r0 - dy; while (at(g, c, r) === col) { n++; c -= dx; r -= dy; } return n; }
const isFive = (len, exact) => exact ? len === 5 : len >= 5;
// cells (in direction d through m) that would complete five for col, m already holding col
function compl(g, m, d, col, exact) {
  const [dx, dy] = DIR[d], c0 = m % N, r0 = (m / N) | 0, out = [];
  for (let s = -4; s <= 4; s++) { if (!s) continue; const c = c0 + s * dx, r = r0 + s * dy; if (at(g, c, r) !== 0) continue; const q = r * N + c; g[q] = col; if (isFive(runLen(g, m, d, col), exact)) out.push(q); g[q] = 0; }
  return out;
}
// what a stone of col on m makes: { five, fours: [{d, pts}], straight: bool, threes: [d] }
function shape(g, m, col, exact) {
  g[m] = col;
  const res = { five: false, fours: [], straight: false, threes: [] };
  for (let d = 0; d < 4; d++) {
    if (isFive(runLen(g, m, d, col), exact)) { res.five = true; continue; }
    const C = compl(g, m, d, col, exact);
    if (C.length) { res.fours.push({ d, pts: C }); if (C.length >= 2) { const a = C[0], b = C[1], dist = Math.max(Math.abs(a % N - b % N), Math.abs(((a / N) | 0) - ((b / N) | 0))); if (C.length === 2 && dist === 5) res.straight = true; } continue; }
    // open three: one more stone in this line gives a straight four
    const [dx, dy] = DIR[d], c0 = m % N, r0 = (m / N) | 0;
    let three = false;
    for (let s = -4; s <= 4 && !three; s++) {
      if (!s) continue; const c = c0 + s * dx, r = r0 + s * dy; if (at(g, c, r) !== 0) continue; const q = r * N + c;
      g[q] = col; const C2 = compl(g, m, d, col, exact); g[q] = 0;
      if (C2.length === 2) { const a = C2[0], b = C2[1], dist = Math.max(Math.abs(a % N - b % N), Math.abs(((a / N) | 0) - ((b / N) | 0))); if (dist === 5) three = true; }
    }
    if (three) res.threes.push(d);
  }
  g[m] = 0;
  return res;
}
const exactFor = (rule, col) => col === 1 ? rule !== 'free' : rule === 'standard';
function gridOf(pos) { const g = new Int8Array(N * N); for (let m = 0; m < N * N; m++) g[m] = pos.at(m); return g; }
function stones(pos) { const b = [], w = []; for (let m = 0; m < N * N; m++) { const c = pos.at(m); if (c === 1) b.push(sqName(m)); else if (c === 2) w.push(sqName(m)); } return { b, w }; }
const empties = g => { const o = []; for (let m = 0; m < N * N; m++) if (!g[m]) o.push(m); return o; };
function fiveCells(g, col, exact) { return empties(g).filter(m => shape(g, m, col, exact).five); }
function fourCells(g, col, exact) { return empties(g).filter(m => { const s = shape(g, m, col, exact); return !s.five && s.fours.length; }); }
function sfourCells(g, col, exact) { return empties(g).filter(m => { const s = shape(g, m, col, exact); return !s.five && s.straight; }); }
const near = (m, list, r) => list.some(q => Math.max(Math.abs(q % N - m % N), Math.abs(((q / N) | 0) - ((m / N) | 0))) <= r);
// the board region a problem uses must be reasonably central (the board is shown whole, but keep it tidy)

// ---------- candidate positions from games: side to move at ply k, renju rules as played
function* positions(minK, maxK, rule) {
  const order = games.map((_, i) => i); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  for (const gi of order) {
    const mv = games[gi].moves.split(' ').map(sqOf);
    const ks = []; for (let k = minK; k <= Math.min(maxK, mv.length - 1); k++) ks.push(k);
    for (let i = ks.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ks[i], ks[j]] = [ks[j], ks[i]]; }
    for (const k of ks.slice(0, 4)) {
      const pos = new E.Pos('renju'); for (let i = 0; i < k; i++) pos.make(mv[i]);
      if (pos.status().over) continue;
      let p = pos;
      if (rule && rule !== 'renju') { p = E.setup(rule, { b: [], w: [] }); const st = stones(pos); p = E.setup(rule, { b: st.b.map(sqOf), w: st.w.map(sqOf), side: pos.side }); if (p.status().over) continue; }
      yield { gi, k, pos: p, last: mv[k - 1] };
    }
  }
}
const used = new Set();
function rec(c, P, extra) {
  const st = stones(c.pos);
  used.add(c.gi);
  return Object.assign({ b: st.b.join(' '), w: st.w.join(' '), side: c.pos.side, last: sqName(c.last) }, extra);
}
function collect(n, gen, test) {
  const out = [];
  for (const c of gen) { if (used.has(c.gi)) continue; const r = test(c); if (r) { out.push(rec(c, null, r)); if (out.length >= n * 4) break; } }
  // easier (fewer stones) first, keep n spread over the pool
  out.sort((a, b) => (a.b.split(' ').length + a.w.split(' ').length) - (b.b.split(' ').length + b.w.split(' ').length));
  const pick = []; for (let i = 0; i < n; i++) pick.push(out[Math.floor(i * out.length / n)]);
  if (pick.some(x => !x)) throw new Error('not enough problems');
  return pick;
}
const steps = [];
const S = (id, course, problems, extra) => steps.push(Object.assign({ id, course, problems }, extra || {}));

// 1. five
S('five', 'basics', collect(5, positions(9, 30, 'free'), c => {
  const g = gridOf(c.pos), me = c.pos.side, op = 3 - me;
  const f = fiveCells(g, me, false); if (f.length !== 1 || fiveCells(g, op, false).length) return null;
  return { ok: [sqName(f[0])], rule: 'free' };
}), { diagram: { b: ['f8', 'g8', 'h8', 'i8'], w: ['g9', 'h9', 'f7', 'j7'], o: ['j8'], d: ['e8'] } });
// 2. block a four
S('block', 'basics', collect(5, positions(9, 30, 'free'), c => {
  const g = gridOf(c.pos), me = c.pos.side, op = 3 - me;
  const f = fiveCells(g, op, false); if (f.length !== 1 || fiveCells(g, me, false).length || fourCells(g, me, false).length > 2) return null;
  return { ok: [sqName(f[0])], rule: 'free' };
}), { diagram: { w: ['f9', 'g9', 'h9', 'j9'], b: ['g8', 'h8', 'f8'], o: ['i9'] } });
// 3. block an open three
S('three', 'basics', collect(5, positions(7, 24, 'free'), c => {
  const g = gridOf(c.pos), me = c.pos.side, op = 3 - me;
  if (fiveCells(g, op, false).length || fiveCells(g, me, false).length || fourCells(g, me, false).length) return null;
  const sf = sfourCells(g, op, false); if (!sf.length || sf.length > 3) return null;
  // the opponent's four-making cells other than the straight-four ones must not give a win either: keep it simple
  const ok = [];
  for (const m of empties(g)) { g[m] = me; if (!sfourCells(g, op, false).length) ok.push(m); g[m] = 0; }
  if (ok.length < 2 || ok.length > 4) return null;
  return { ok: ok.map(sqName), rule: 'free' };
}), { diagram: { w: ['g8', 'h8', 'i8'], b: ['g9', 'h9'], o: ['f8', 'j8'], d: ['e8', 'k8'] } });
// 4. make a straight four
S('sfour', 'basics', collect(5, positions(7, 26, 'free'), c => {
  const g = gridOf(c.pos), me = c.pos.side, op = 3 - me;
  if (fiveCells(g, op, false).length || fiveCells(g, me, false).length || fourCells(g, op, false).length) return null;
  const sf = sfourCells(g, me, false); if (!sf.length || sf.length > 2) return null;
  // no four-three elsewhere (that would be a different lesson)
  for (const m of empties(g)) { const s = shape(g, m, me, false); if (!s.straight && s.fours.length && s.threes.length) return null; }
  return { ok: sf.map(sqName), rule: 'free' };
}), { diagram: { b: ['g8', 'h8', 'i8'], w: ['g9', 'i9', 'h7'], o: ['f8', 'j8'] } });
// 5. four-three
S('fourthree', 'basics', collect(5, positions(9, 30, 'free'), c => {
  const g = gridOf(c.pos), me = c.pos.side, op = 3 - me;
  if (fiveCells(g, op, false).length || fiveCells(g, me, false).length || fourCells(g, op, false).length || sfourCells(g, me, false).length) return null;
  const ok = empties(g).filter(m => { const s = shape(g, m, me, false); return s.fours.length === 1 && s.threes.length >= 1; });
  if (!ok.length || ok.length > 2) return null;
  return { ok: ok.map(sqName), rule: 'free' };
}), { diagram: { b: ['f8', 'g8', 'h8', 'j10', 'j11'], w: ['e8', 'j12', 'h9'], o: ['j8'], line: ['f8', 'j8'] } });

// renju: forbidden points (black to move, tap the point)
function forbidList(pos) { return pos.forbiddenList(); }
S('forbid33', 'renju', collect(5, positions(9, 34), c => {
  const pos = c.pos; if (pos.side !== 1) return null;
  const g = gridOf(pos); if (fiveCells(g, 1, true).length || fiveCells(g, 2, false).length) return null;
  const fl = forbidList(pos); if (fl.length !== 1 || fl[0].k !== 1) return null;
  return { ok: [sqName(fl[0].m)], kind: 'pick' };
}), { diagram: { b: ['g8', 'i8', 'h9', 'h10'], x: ['h8'] } });
S('forbid44', 'renju', collect(5, positions(9, 40), c => {
  const pos = c.pos; if (pos.side !== 1) return null;
  const g = gridOf(pos); if (fiveCells(g, 1, true).length || fiveCells(g, 2, false).length) return null;
  const fl = forbidList(pos); if (fl.length < 1 || fl.length > 2 || fl.some(f => f.k === 1)) return null;
  return { ok: fl.map(f => sqName(f.m)), kind: 'pick' };
}), { diagram: { b: ['e8', 'f8', 'g8', 'h9', 'h10', 'h11'], w: ['d8', 'h12'], x: ['h8'] } });
S('fourthreeB', 'renju', collect(5, positions(9, 40), c => {
  const pos = c.pos; if (pos.side !== 1) return null;
  const g = gridOf(pos); if (fiveCells(g, 1, true).length || fiveCells(g, 2, false).length || fourCells(g, 2, false).length) return null;
  const fl = forbidList(pos); if (!fl.length) return null;
  const fset = new Set(fl.map(f => f.m));
  if (sfourCells(g, 1, true).some(m => !fset.has(m))) return null;
  const ok = empties(g).filter(m => !fset.has(m) && pos.isLegal(m) && (() => { const s = shape(g, m, 1, true); return s.fours.length === 1 && s.threes.length === 1; })());
  if (!ok.length || ok.length > 2) return null;
  // a forbidden point should be a tempting decoy: a forbidden point that makes a four or three
  return { ok: ok.map(sqName) };
}));
// white: a four whose blocking point is forbidden for black
S('trap', 'renju', collect(5, positions(11, 50), c => {
  const pos = c.pos; if (pos.side !== 2) return null;
  const g = gridOf(pos); if (fiveCells(g, 1, true).length || fiveCells(g, 2, false).length) return null;
  if (sfourCells(g, 2, false).length) return null;
  const ok = [];
  for (const m of empties(g)) {
    const s = shape(g, m, 2, false); if (s.fours.length !== 1 || s.fours[0].pts.length !== 1 || s.threes.length) continue;
    const blockPt = s.fours[0].pts[0];
    pos.make(m); const f = pos.forbidden(blockPt); const bf = fiveCells(gridOf(pos), 1, true).length; pos.unmake();
    if (f && !bf) ok.push(m);
  }
  if (!ok.length || ok.length > 2) return null;
  // no plain four-three for white (that would also win)
  for (const m of empties(g)) { const s = shape(g, m, 2, false); if (s.fours.length && s.threes.length) return null; }
  return { ok: ok.map(sqName) };
}));
// tactics from the mined puzzles (unique first move)
function fromMined(n, test) {
  const pool = mined.filter(p => !used.has(p.g) && test(p));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const out = [], seenG = new Set();
  for (const p of pool) { if (seenG.has(p.g)) continue; seenG.add(p.g); out.push(p); if (out.length >= n) break; }
  if (out.length < n) throw new Error('not enough mined');
  out.forEach(p => used.add(p.g));
  return out.sort((a, b) => a.T - b.T || a.n - b.n).map(p => ({ b: p.b, w: p.w, side: p.side, last: p.last, ok: [p.a] }));
}
S('vcf', 'tactics', fromMined(5, p => p.cat === 'vcf' && (p.T === 3 || p.T === 5) && p.n <= 40));
// defence: the opponent (to move next) has a win in 3; find the moves that stop every win within 5
S('defend', 'tactics', collect(5, positions(11, 40), c => {
  const pos = c.pos, me = pos.side, op = 3 - me, g = gridOf(pos);
  if (fiveCells(g, 1, true).length || fiveCells(g, 2, false).length) return null;
  if (fourCells(g, me, exactFor('renju', me)).length) return null;   // the side to move cannot counter with fours
  // opponent to move would win in <= 3
  pos.pass(); const S0 = new E.Solver(); S0.limit = 300000; const t = S0.winIn(pos, 3); pos.pass();
  if (!t || t < 3) return null;
  const ok = [];
  let cand = 0;
  for (const m of pos.legal()) {
    if (!near(m, pos.moves(), 2)) continue;
    cand++;
    pos.make(m); const S1 = new E.Solver(); S1.limit = 300000; const w = S1.winIn(pos, 5); const over = S1.nodes > S1.limit; pos.unmake();
    if (over) return null;
    if (!w) ok.push(m);
  }
  if (!ok.length || ok.length > 3 || cand < 15) return null;
  return { ok: ok.map(sqName) };
}));
S('vct', 'tactics', fromMined(5, p => p.cat === 'vct' && (p.T === 3 || p.T === 5) && p.n <= 40));

// self-check: replay every problem
for (const s of steps) for (const P of s.problems) {
  const pos = E.setup(P.rule || 'renju', { b: P.b.split(' ').map(sqOf), w: P.w.split(' ').map(sqOf), side: P.side });
  if (pos.status().over) throw new Error('over ' + s.id);
  if (P.kind !== 'pick') for (const m of P.ok) if (!pos.isLegal(sqOf(m))) throw new Error('illegal answer ' + s.id + ' ' + m);
}
fs.writeFileSync(OUT, JSON.stringify({ v: 1, steps }, null, 1));
console.log(steps.map(s => s.id + ':' + s.problems.map(p => p.ok.length).join('')).join(' '));

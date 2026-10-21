// One-off (2026-10-21): replace puzzles whose fun score (fun.js) is below 70 with new solver-verified puzzles of the
// same theme, board size (level) and a similar difficulty (solver effort ln(nodes), as used for the easy→hard order).
// Players keep the old puzzle where they already have a record for the slot (the app reads D.old["lv-k"]), and the
// daily puzzle only changes for dates after index.json "cut" (past and today's dailies stay as they were).
// Positions come from seeded random games (safe lines at random, then mostly sensible endgame play); every candidate
// is solved exactly with the engine's Solver (all first moves), must have one correct idea, fit the theme and score ≥ 75.
// usage: node refresh_fun.js            (deterministic; refuses to run twice)
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const F = require('./fun.js');
const { K } = F;
const dir = path.join(__dirname, '..', 'puzzles');
const I = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
if (I.cut) { console.error('already refreshed'); process.exit(1); }
const CUT = '2026-10-21', MIN = 70, TARGET = 75;
const D = {}; for (const C of I.cats) D[C.id] = JSON.parse(fs.readFileSync(path.join(dir, C.id + '.json'), 'utf8'));
const seen = new Set(); for (const id in D) for (const L of D[id].levels) for (const q of L) seen.add(q.n + q.e + q.o);

// 1) slots to replace
const jobs = [];
for (const C of I.cats) C.order.forEach(([lv, k], j) => {
  const q = D[C.id].levels[lv][k], f = F.funScore(q, C.id);
  if (f.fun < MIN) jobs.push({ cat: C.id, lv, k, j, n: q.n, ln: f.lnNodes, und: f.undrawn, fun: f.fun, g: q.g });
});
console.log('to replace', jobs.length, jobs.map(x => `${x.cat}-${x.lv}-${x.k}(${x.fun})`).join(' '));

// 2) candidate positions from seeded games
let rs = 20261021 >>> 0;
const rnd = () => { rs = (rs + 0x6D2B79F5) >>> 0; let t = rs; t = Math.imul(t ^ t >>> 15, 1 | t); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
const tagOf = (p, b) => p.completes(b) > 0 ? 'take' : p.hasCapture() ? 'double' : p.isSafe(b) ? 'longchain' : p.legal().some(e => p.isSafe(e)) ? 'sacrifice'
  : E.components(p, false).some(c => c.loop) ? 'loop' : 'count';
// the theme of each category, judged on the position (pre) and on the solver's key move (post)
const PRE = {
  take: p => { if (!p.hasCapture()) return false; const c = E.captureMoves(p); return c.forced === undefined && c.declines.length > 0; },
  loop: p => E.components(p, false).some(c => c.loop) || (p.hasCapture() && E.captureMoves(p).forced === undefined && E.captureMoves(p).declines.length > 0),
  count: p => !p.hasCapture() && !p.legal().some(e => p.isSafe(e)) && E.components(p, false).length >= 2,
  real5: p => !(p.hasCapture() && E.captureMoves(p).forced !== undefined),
};
const POST = {
  take: (p, b) => p.completes(b) > 0,
  loop: (p, b) => { const comps = E.components(p, true);
    if (p.hasCapture()) { const c = E.captureMoves(p); return !!c.declines && c.declines.includes(b) && comps.some(x => x.loop || !x.simple); }
    const cl = F.moveClass(p, b, comps); return cl[0] === 'c' && comps[+cl.slice(1)].loop; },
  count: (p, b) => p.gives(b) > 0,
  real5: () => true,
};
function encode(p, own, vals, tag) {
  const G = p.G, o = own.map(x => x < 0 ? '.' : String(x)).join(''), v = new Array(G.E).fill('.');
  for (const x of vals) v[x.m] = K[x.v + 30];
  const best = Math.max(...vals.map(x => x.v)), rem = G.B - p.filled, a = own.filter(x => x === 0).length, b = own.filter(x => x === 1).length;
  return { n: G.R, e: p.edges().map(e => K[e]).join(''), o, v: v.join(''), t: [a + (rem + best) / 2, b + (rem - best) / 2], g: tag };
}
function candidate(p, own, job) {
  if (!PRE[job.cat](p)) return null;
  if (Math.abs(p.undrawn - job.und) > 4 || p.undrawn < 4) return null;
  const vals = F.solveAll(p, Math.exp(job.ln + 2) * 3); if (!vals) return null;
  const best = Math.max(...vals.map(x => x.v)), key = vals.find(x => x.v === best).m;
  if (!POST[job.cat](p, key)) return null;
  const q = encode(p, own, vals, job.cat === 'real5' ? tagOf(p, key) : job.cat === 'count' ? job.g : job.cat);
  if (seen.has(q.n + q.e + q.o)) return null;
  const f = F.funScore(q, job.cat);
  if (f.fun < TARGET || f.parts.unique < 1 || Math.abs(f.lnNodes - job.ln) > 1.0) return null;
  // re-verify the stored values exactly as the app reads them (decode → solver)
  const chk = F.decode(q), again = new Map(F.solveAll(chk.p).map(x => [x.m, x.v]));
  if (!vals.every(x => again.get(x.m) === x.v)) throw new Error('verify mismatch');
  return { q, f };
}
function game(n, job) {
  const G = E.geom(n, n), p = new E.Pos(G), own = new Array(G.B).fill(-1);
  let mover = 0;
  const S = F.solver(G);
  while (p.undrawn > 0) {
    if (p.undrawn <= job.und + 6 && p.undrawn >= job.und - 6) {
      const ownV = own.map(x => x < 0 ? -1 : x === mover ? 0 : 1);   // seen from the side to move
      const c = candidate(p, ownV, job); if (c) return c;
    }
    let e; const L = p.legal(), safe = L.filter(x => p.isSafe(x));
    if (p.hasCapture()) { const c = E.captureMoves(p); e = c.forced !== undefined ? c.forced : rnd() < .8 ? pick(c.moves) : pick(c.declines); }
    else if (safe.length) e = pick(safe);
    else if (p.undrawn <= 30 && rnd() < .7) { S.limit(200000, 0); const b = S.best(p); e = b && b.move !== undefined ? b.move : pick(L); }
    else e = pick(L);
    const before = p.cnt.slice(), k = p.play(e);
    if (k) { for (let b = 0; b < G.B; b++) if (p.cnt[b] === 4 && before[b] !== 4) own[b] = mover; } else mover ^= 1;
  }
  return null;
}
const t0 = Date.now(), done = [];
for (const job of jobs) {
  const cands = [];
  for (let g = 0; g < 4000 && cands.length < 12 && Date.now() - t0 < 25 * 60e3; g++) { const c = game(job.n, job); if (c) { seen.add(c.q.n + c.q.e + c.q.o); cands.push(c); } }
  if (!cands.length) { console.log('no replacement for', job.cat, job.lv, job.k); continue; }
  const rank = c => c.f.fun - 15 * Math.abs(c.f.lnNodes - job.ln);   // most fun, at a similar difficulty
  cands.sort((a, b) => rank(b) - rank(a));
  const c = cands[0];
  for (const x of cands.slice(1)) seen.delete(x.q.n + x.q.e + x.q.o);
  done.push({ job, c });
  console.log(`${job.cat}-${job.lv}-${job.k}: fun ${job.fun} → ${c.f.fun}, ln ${job.ln.toFixed(1)} → ${c.f.lnNodes.toFixed(1)}, lines ${job.und} → ${c.f.undrawn}`, ((Date.now() - t0) / 1000 | 0) + 's');
}
// 3) apply: new content into the slot, previous content in D.old["lv-k"], difficulty estimate adjusted by the change in effort
I.cut = CUT; I.version = 3;
const touched = new Set();
for (const { job, c } of done) {
  const d = D[job.cat]; d.old = d.old || {};
  d.old[job.lv + '-' + job.k] = d.levels[job.lv][job.k];
  d.levels[job.lv][job.k] = c.q;
  const C = I.cats.find(x => x.id === job.cat);
  C.diff[job.j] = Math.round((C.diff[job.j] + c.f.lnNodes - job.ln) * 10) / 10;
  touched.add(job.cat);
}
I.rep = done.map(({ job }) => job.cat + '-' + job.lv + '-' + job.k);   // record keys of the replaced slots (app: keep-old snapshot)
for (const id of touched) fs.writeFileSync(path.join(dir, id + '.json'), JSON.stringify(D[id]));
fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(I));
const cnt = {}; done.forEach(x => (cnt[x.job.cat] = (cnt[x.job.cat] || 0) + 1));
console.log('replaced', done.length, '/', jobs.length, JSON.stringify(cnt), ((Date.now() - t0) / 1000) + 's');

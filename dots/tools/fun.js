// "Fun" score (0–100) for Dots & Boxes puzzles (詰めドット, puzzles/<cat>.json). Every value comes from the exact solver
// (engine.js Solver.all), the same one that verified the set. A good puzzle is not only correct but enjoyable:
//   • unique  25  exactly one correct idea for the first move (optimal moves are grouped: same position up to symmetry,
//                 or — when the move gives boxes away — the same chain/loop, as the app accepts every line of it)
//   • trap    20  the natural move is wrong: "take what is offered, else draw a safe line, else give the fewest boxes"
//                 (plus declining, when boxes are on offer). Key move outside that set = full; otherwise the share of
//                 those natural moves that fail (half of them failing = full)
//   • depth   20  an "aha" later on: player decisions along the solution line (both sides best) where a wrong move
//                 loses boxes and there is a real choice (0 → .3, 1 → .75, 2+ → 1)
//   • length  15  not a long tedious play-out (the puzzle is played to the end): ≤18 lines left = full, 0 at ≥40
//   • choice  10  enough different first moves to think about (distinct moves up to symmetry: ≤2 → 0, 6+ → full)
//   • theme   10  the category's idea is what the key move does (take: a capture; double: declining; sacrifice: giving
//                 while safe lines exist; longchain: one safe line of several; loop: a loop is involved; count: no safe
//                 lines left; real*: always)
// usage: const F = require('./fun.js'); F.funScore(q, cat) → { fun, parts, diff, ... }   (q = puzzle as stored)
//        node fun.js [--json out.json]    → score distribution of the current set (and every score, keyed cat-lv-k)
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '..', 'engine.js'));
const K = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const clamp = x => Math.max(0, Math.min(1, x));
const SV = {};
const solver = G => SV[G.R] || (SV[G.R] = new E.Solver(G));
function solveAll(p, maxNodes) { const S = solver(p.G); S.limit(maxNodes || 0, 0); const a = S.all(p); return S.aborted ? null : a; }
const decode = q => { const G = E.geom(q.n, q.n); return { G, p: E.Pos.from(G, [...q.e].map(c => K.indexOf(c))), own: [...q.o].map(c => c === '.' ? -1 : +c) }; };
const canonKey = (S, p) => { const s = S.canon(p); return (p.h1[s] >>> 0) + ':' + (p.h2[s] >>> 0); };
// equivalence class of a move: chain/loop it opens (moves that give boxes) or the resulting position up to symmetry
function moveClass(p, e, comps) {
  if (!p.completes(e) && p.gives(e) > 0) {
    const G = p.G, b = G.eb0[e] >= 0 && p.cnt[G.eb0[e]] === 2 ? G.eb0[e] : G.eb1[e];
    const i = comps.findIndex(c => c.boxes.includes(b)); if (i >= 0) return 'c' + i;
  }
  const S = solver(p.G); p.play(e); const k = canonKey(S, p); p.undo(e); return k;
}
const safeMoves = p => p.legal().filter(e => p.isSafe(e));
function naturalSet(p) {
  const L = p.legal(), caps = L.filter(e => p.completes(e) > 0);
  if (caps.length) { const c = E.captureMoves(p); return [...new Set(caps.concat(c.declines || []))]; }
  const safe = L.filter(e => p.isSafe(e)); if (safe.length) return safe;
  const mn = Math.min(...L.map(e => E.sacrificeSize ? E.sacrificeSize(p, e) : p.gives(e)));
  return L.filter(e => (E.sacrificeSize ? E.sacrificeSize(p, e) : p.gives(e)) === mn);
}
const THEME = {
  take: (p, b) => p.completes(b) > 0,
  double: (p, b) => p.hasCapture() && p.completes(b) === 0,
  sacrifice: (p, b) => safeMoves(p).length > 0 && p.gives(b) > 0,
  longchain: (p, b) => p.isSafe(b) && safeMoves(p).length >= 2,
  loop: p => E.components(p, false).some(c => c.loop) || (p.hasCapture() && E.captureMoves(p).moves && E.captureMoves(p).moves.length > 0 && E.components(p, false).some(c => !c.simple || c.loop)),
  count: p => safeMoves(p).length === 0,
};
// critical decisions of the player (side to move at the start) along the solution line, after the first move
function depth(p0, first) {
  const p = p0.clone(); let me = true, crit = 0, guard = 80;
  if (!p.play(first)) me = false;
  const S = solver(p.G);
  while (p.undrawn > 0 && guard--) {
    const cap = p.hasCapture() ? E.captureMoves(p) : null;
    let e;
    if (cap && cap.forced !== undefined) e = cap.forced;
    else {
      S.limit(0, 0); const a = S.all(p); let best = -999; for (const x of a) if (x.v > best) { best = x.v; e = x.m; }
      if (me && a.length >= 2 && a.some(x => x.v < best)) {
        const comps = E.components(p, true), cls = new Set(a.map(x => moveClass(p, x.m, comps)));
        if (cls.size >= 2) crit++;
      }
    }
    if (!p.play(e)) me = !me;
  }
  return crit;
}
function funScore(q, cat) {
  const { G, p } = decode(q);
  const vals = [...q.v].map((c, e) => c === '.' ? null : [e, K.indexOf(c) - 30]).filter(Boolean);
  const S = solver(G); S.used.fill(0); S.limit(0, 0); S.all(p); const nodes = S.nodes;
  const best = Math.max(...vals.map(x => x[1])), opt = vals.filter(x => x[1] === best).map(x => x[0]);
  const comps = E.components(p, true);
  const optCls = new Set(opt.map(e => moveClass(p, e, comps)));
  const allCls = new Set(vals.map(x => moveClass(p, x[0], comps)));
  const N = naturalSet(p), wrongN = N.filter(e => !opt.includes(e)).length;
  const key = opt[0];
  const d = depth(p, key);
  const th = THEME[cat] ? !!THEME[cat](p, key) : true;
  const parts = {
    unique: optCls.size === 1 ? 1 : optCls.size === 2 ? .4 : 0,
    trap: N.every(e => !opt.includes(e)) ? 1 : clamp(wrongN / N.length / .5),
    depth: d === 0 ? .3 : d === 1 ? .75 : 1,
    length: 1 - clamp((p.undrawn - 18) / 22),
    choice: clamp((allCls.size - 2) / 4),
    theme: th ? 1 : 0,
  };
  const fun = Math.round(25 * parts.unique + 20 * parts.trap + 20 * parts.depth + 15 * parts.length + 10 * parts.choice + 10 * parts.theme);
  return { fun, parts, lnNodes: Math.log(Math.max(1, nodes)), crit: d, undrawn: p.undrawn, nOpt: opt.length };
}
module.exports = { funScore, decode, solveAll, naturalSet, moveClass, THEME, K, solver };

if (require.main === module) {
  const fs = require('fs'), dir = path.join(__dirname, '..', 'puzzles');
  const I = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
  const out = {}, all = [];
  for (const C of I.cats) {
    const D = JSON.parse(fs.readFileSync(path.join(dir, C.id + '.json'), 'utf8')), sc = [];
    C.order.forEach(([lv, k], j) => { const f = funScore(D.levels[lv][k], C.id); out[C.id + '-' + lv + '-' + k] = Object.assign({ j, diff: C.diff[j] }, f); sc.push(f.fun); all.push(f.fun); });
    const s = sc.slice().sort((a, b) => a - b);
    console.log(C.id.padEnd(10), 'min', s[0], 'med', s[s.length >> 1], 'max', s[s.length - 1], '<70:', s.filter(x => x < 70).length, '/', s.length);
  }
  const s = all.sort((a, b) => a - b);
  console.log('all: p10', s[s.length * .1 | 0], 'p25', s[s.length * .25 | 0], 'med', s[s.length >> 1], 'p75', s[s.length * .75 | 0], '<70:', s.filter(x => x < 70).length);
  const j = process.argv.indexOf('--json'); if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(out));
}

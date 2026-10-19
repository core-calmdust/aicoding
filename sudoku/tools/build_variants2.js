// Appends 30 puzzles each for ineq / antiknight / kropki / thermo / arrow to puzzles_variants.json.
// The first five sets (x / hyper / jigsaw / oddeven / killer, from build_variants.js) are kept byte-identical.
// usage: node tools/build_variants2.js [outPath]   (deterministic; re-running replaces the appended sets)
const E = require('../engine.js');
const V = require('./variant_gen.js');
const G = require('./variant_gen2.js');
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, '..', 'puzzles_variants.json');
const OUT = process.argv[2] || SRC;
const OLD = ['x', 'hyper', 'jigsaw', 'oddeven', 'killer'];
const WANT = { 1: 8, 2: 10, 3: 8, 4: 4 };
const ENOUGH = 3;
const t00 = Date.now();

const src = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const oldSets = src.sets.slice(0, OLD.length);
if (oldSets.map(s => s.type).join() !== OLD.join()) throw new Error('unexpected base sets');

/* attempt caps (deterministic) and clue floors per wanted level: [min, max] */
const CFG = {
  ineq:       { seed: 8101, cap: 900,  floor: { 1: [0, 8], 2: [0, 4], 3: [0, 2], 4: [0, 2] } },
  antiknight: { seed: 8202, cap: 2500, floor: { 1: [26, 32], 2: [21, 25], 3: [17, 22], 4: [16, 21] } },
  kropki:     { seed: 8303, cap: 12000, noLv1: true, floor: { 1: [14, 24], 2: [8, 20], 3: [0, 8], 4: [0, 6] } },
  thermo:     { seed: 8404, cap: 2500, floor: { 1: [22, 28], 2: [17, 22], 3: [0, 18], 4: [0, 16] } },
  arrow:      { seed: 8505, cap: 5000, noLv1: true, floor: { 1: [24, 30], 2: [18, 26], 3: [0, 20], 4: [0, 16] } },
};

function pick(buckets, allow5) {
  // same policy as build_variants.js: wanted counts per level, shortfalls filled from neighbouring levels
  buckets[1].sort((a, b) => b.clues - a.clues || a.score - b.score);
  for (const lv of [2, 3, 4, 5]) buckets[lv].sort((a, b) => a.score - b.score || b.clues - a.clues);
  const spreadTake = (lv, n) => {
    const b = buckets[lv]; n = Math.min(n, b.length); if (!n) return [];
    if (lv === 1) return b.splice(0, n);
    if (lv === 4) return b.splice(b.length - n, n);
    const idx = new Set(); for (let i = 0; i < n; i++) idx.add(n === 1 ? 0 : Math.round(i * (b.length - 1) / (n - 1)));
    const out = [], keep = []; b.forEach((x, i) => (idx.has(i) ? out : keep).push(x)); b.length = 0; b.push(...keep); return out;
  };
  const out = [], need = { ...WANT };
  for (const lv of [1, 2, 3, 4]) { const got = spreadTake(lv, need[lv]); out.push(...got); need[lv] -= got.length; }
  let n5 = 0;
  if (need[4] > 0 && allow5) { const got = buckets[5].splice(0, need[4]); got.forEach(x => (x.lv = 4, x.l5 = true)); n5 += got.length; out.push(...got); need[4] -= got.length; }
  let short = need[1] + need[2] + need[3] + need[4];
  for (const lv of [3, 2, 4, 1]) { if (short <= 0) break; const got = spreadTake(lv, short); out.push(...got); short -= got.length; }
  if (short > 0 && allow5) { const got = buckets[5].splice(0, Math.min(4 - n5, short)); got.forEach(x => (x.lv = 4, x.l5 = true)); out.push(...got); short -= got.length; }
  if (short > 0) throw new Error('not enough puzzles');
  return out.sort((a, b) => (a.l5 ? 1 : 0) - (b.l5 ? 1 : 0) || a.lv - b.lv || (a.lv === 1 ? b.clues - a.clues : 0) || a.score - b.score);
}
/* kropki / arrow: their techniques are level 2, so level 1 cannot occur (shortfall is filled by pick) */
let LV = [1, 2, 3, 4];
const full = b => LV.every(l => b[l].length >= WANT[l] * ENOUGH);
const newBuckets = () => ({ 1: [], 2: [], 3: [], 4: [], 5: [] });
function chooseMin(b, rng, floor) {
  const miss = LV.filter(l => b[l].length < WANT[l] * ENOUGH);
  const l = miss[(rng() * miss.length) | 0] || 4;
  const [lo, hi] = floor[l];
  return lo + ((rng() * (hi - lo + 1)) | 0);
}
const markKey = x => JSON.stringify([x.g, x.w, x.t, x.a]);
function addGraded(buckets, seen, item, puzzle) {
  const key = item.p + markKey(item);
  if (seen.has(key)) return; seen.add(key);
  // the variant constraint must matter: reject puzzles that are already unique as standard sudoku
  const spec = E.variant(); E.setVariant(null);
  const stdUnique = E.solve(puzzle, 2).count === 1;
  E.setVariant(spec);
  if (stdUnique) return;
  const g = E.grade(puzzle);
  const lv = g.solved ? g.level : 5;
  item.lv = lv; item.score = g.score; item.clues = puzzle.filter(x => x).length;
  if (buckets[lv].length >= WANT[Math.min(lv, 4)] * ENOUGH * (lv === 5 ? 2 : 1)) return;
  buckets[lv].push(item);
}
const specOf = (type, x) => {
  const spec = { type };
  if (x.g) spec.ineq = x.g; if (x.w) spec.dots = x.w; if (x.t) spec.thermos = x.t; if (x.a) spec.arrows = x.a;
  return spec;
};

function build(type) {
  const cfg = CFG[type], rng = E.mulberry32(cfg.seed), b = newBuckets(), seen = new Set(), t0 = Date.now();
  let n = 0; LV = cfg.noLv1 ? [2, 3, 4] : [1, 2, 3, 4];
  for (; !full(b) && n < cfg.cap; n++) {
    E.setVariant(null);
    let sol = E.randomFull(rng);
    const item = {};
    if (type === 'ineq') item.g = G.ineqSigns(sol);
    else if (type === 'kropki') item.w = G.kropkiDots(sol);
    else if (type === 'thermo') item.t = G.thermos(sol, rng);
    else if (type === 'arrow') item.a = G.arrows(sol, rng);
    E.setVariant(specOf(type, item));
    if (type === 'antiknight') sol = V.randomSolution(rng);
    const p = V.dig(sol, rng, { minClues: chooseMin(b, rng, cfg.floor), symmetric: true, nodeLimit: 30000 });
    item.p = p.join('');
    addGraded(b, seen, item, p);
    if (n % 200 === 199) console.error(type, n + 1, [1, 2, 3, 4, 5].map(l => b[l].length).join('/'), ((Date.now() - t0) / 1000) | 0, 's');
  }
  console.error(type, 'attempts', n, [1, 2, 3, 4, 5].map(l => b[l].length).join('/'), ((Date.now() - t0) / 1000) | 0, 's');
  return pick(b, true);
}

const types = Object.keys(CFG);
const only = process.env.ONLY ? process.env.ONLY.split(',') : types;
const sets = [];
for (const type of types) {
  if (!only.includes(type)) { const prev = src.sets.find(s => s.type === type); if (prev) sets.push({ type, puzzles: prev.puzzles, kept: true }); else console.error('WARNING: skipping', type); continue; }
  sets.push({ type, puzzles: build(type) });
}

// verify uniqueness and pack
for (const s of sets) for (const x of s.puzzles) {
  E.setVariant(specOf(s.type, x));
  if (E.solve(Array.from(x.p, Number), 2).count !== 1) throw new Error('not unique ' + s.type);
}
E.setVariant(null);
const pack = x => { const o = { p: x.p, lv: x.lv }; for (const k of ['g', 'w', 't', 'a']) if (x[k]) o[k] = x[k]; return o; };
const out = { v: src.v, sets: [...oldSets, ...sets.map(s => ({ type: s.type, puzzles: s.puzzles.map(pack) }))] };
const json = JSON.stringify(out);
if (!json.startsWith(JSON.stringify({ v: src.v, sets: oldSets }).slice(0, -2))) throw new Error('base sets changed');
fs.writeFileSync(OUT, json);
for (const s of sets) {
  const lv = [1, 2, 3, 4].map(l => s.puzzles.filter(x => x.lv === l).length).join('/');
  const cl = s.puzzles.map(x => x.clues === undefined ? x.p.replace(/0/g, '').length : x.clues);
  const marks = s.puzzles.map(x => (x.g || x.w || x.t || x.a || []).length);
  console.log(s.type.padEnd(10), 'lv1/2/3/4', lv, ' clues', cl[0], '→', cl[cl.length - 1], `(min ${Math.min(...cl)} max ${Math.max(...cl)})`,
    ` marks ${Math.min(...marks)}-${Math.max(...marks)}`, ` level5: ${s.puzzles.filter(x => x.l5).length}`, s.kept ? '(kept)' : '');
}
console.log('total', (Date.now() - t00) / 1000, 's →', OUT);

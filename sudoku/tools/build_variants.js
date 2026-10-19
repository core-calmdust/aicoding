// Builds puzzles_variants.json: 30 puzzles each for x / hyper / jigsaw / oddeven / killer
// usage: node tools/build_variants.js [outPath]   (deterministic; writes only these 5 sets — run tools/build_variants2.js afterwards to append ineq / antiknight / kropki / thermo / arrow)
const E = require('../engine.js');
const V = require('./variant_gen.js');
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || path.join(__dirname, '..', 'puzzles_variants.json');
const WANT = { 1: 8, 2: 10, 3: 8, 4: 4 };
const t00 = Date.now();

const CAP = { x: 1500, hyper: 1500, jigsaw: 1200, oddeven: 1500, killer: 250 };   // attempt caps (deterministic)
function pick(buckets, allow5) {
  // take wanted counts per level; shortfalls at a level are filled from the neighbouring levels
  buckets[1].sort((a, b) => b.clues - a.clues || a.score - b.score);           // easy: keep more givens
  for (const lv of [2, 3, 4, 5]) buckets[lv].sort((a, b) => a.score - b.score || b.clues - a.clues);
  const spreadTake = (lv, n) => { // evenly across the bucket (lv1: the clue-richest; lv4: the hardest)
    const b = buckets[lv]; n = Math.min(n, b.length); if (!n) return [];
    if (lv === 1) return b.splice(0, n);
    if (lv === 4) return b.splice(b.length - n, n);
    const idx = new Set(); for (let i = 0; i < n; i++) idx.add(n === 1 ? 0 : Math.round(i * (b.length - 1) / (n - 1)));
    const out = [], keep = []; b.forEach((x, i) => (idx.has(i) ? out : keep).push(x)); b.length = 0; b.push(...keep); return out;
  };
  const out = [], need = { ...WANT };
  for (const lv of [1, 2, 3, 4]) { const got = spreadTake(lv, need[lv]); out.push(...got); need[lv] -= got.length; }
  if (need[4] > 0 && allow5) { const got = buckets[5].splice(0, need[4]); got.forEach(x => (x.lv = 4, x.l5 = true)); out.push(...got); need[4] -= got.length; }
  let short = need[1] + need[2] + need[3] + need[4];
  for (const lv of [3, 2, 4, 1]) { if (short <= 0) break; const got = spreadTake(lv, short); out.push(...got); short -= got.length; }
  if (short > 0 && allow5) { const got = buckets[5].splice(0, Math.min(4, short)); got.forEach(x => (x.lv = 4, x.l5 = true)); out.push(...got); short -= got.length; }
  if (short > 0) throw new Error('not enough puzzles');
  return out.sort((a, b) => (a.l5 ? 1 : 0) - (b.l5 ? 1 : 0) || a.lv - b.lv || (a.lv === 1 ? b.clues - a.clues : 0) || a.score - b.score);
}
const ENOUGH = 3;
const full = b => [1, 2, 3, 4].every(l => b[l].length >= WANT[l] * ENOUGH);
const newBuckets = () => ({ 1: [], 2: [], 3: [], 4: [], 5: [] });
/* clue floor for the next attempt, aimed at the levels still missing */
function chooseMin(b, rng, easyMin) {
  const miss = [1, 2, 3, 4].filter(l => b[l].length < WANT[l] * ENOUGH);
  const l = miss[(rng() * miss.length) | 0] || 4;
  if (l === 1) return easyMin + ((rng() * 5) | 0);
  if (l === 2) return [26, 24, 22][(rng() * 3) | 0];
  return rng() < 0.3 ? 22 : 0;
}

function addGraded(buckets, seen, item, puzzle) {
  const key = item.p + (item.r || '') + (item.e || '') + (item.c ? JSON.stringify(item.c) : '');
  if (seen.has(key)) return; seen.add(key);
  const g = E.grade(puzzle);
  const lv = g.solved ? g.level : 5;
  item.lv = lv; item.score = g.score; item.clues = puzzle.filter(x => x).length;
  if (lv === 1 && item.clues < 26 && buckets[1].length >= WANT[1] * ENOUGH) return;
  buckets[lv].push(item);
}

function buildStd(type, seed) {
  const rng = E.mulberry32(seed), b = newBuckets(), seen = new Set(), t0 = Date.now();
  for (let n = 0; !full(b) && n < CAP[type]; n++) {
    const spec = { type }; let fullG;
    if (type === 'jigsaw' && n % 4 === 0 || !b.reg) { if (type === 'jigsaw') { const j = V.jigsawRegions(rng); b.reg = j.regions; fullG = j.full; } else b.reg = 1; }
    if (type === 'jigsaw') spec.regions = b.reg;
    E.setVariant(spec);
    if (!fullG) fullG = type === 'jigsaw' ? V.randomSolution(rng) : E.randomFull(rng);
    const p = V.dig(fullG, rng, { minClues: chooseMin(b, rng, 30), symmetric: true, nodeLimit: 200000 });
    const item = { p: p.join('') };
    if (type === 'jigsaw') item.r = spec.regions.join('');
    addGraded(b, seen, item, p); b.n = n + 1;
  }
  console.error(type, 'attempts', b.n, [1, 2, 3, 4, 5].map(l => b[l].length).join('/'));
  return pick(b, false);
}

function buildOddEven(seed) {
  const rng = E.mulberry32(seed), b = newBuckets(), seen = new Set(), t0 = Date.now();
  for (let n = 0; !full(b) && n < CAP.oddeven; n++) {
    E.setVariant(null); const fullG = E.randomFull(rng);
    const nPar = 20 + ((rng() * 16) | 0);
    const cells = E.shuffle([...Array(81).keys()], rng).slice(0, nPar);
    const par = new Array(81).fill(0); for (const i of cells) par[i] = fullG[i] % 2 ? 1 : 2;
    E.setVariant({ type: 'oddeven', parity: par });
    const p = V.dig(fullG, rng, { minClues: chooseMin(b, rng, 28), symmetric: true });
    addGraded(b, seen, { p: p.join(''), e: par.join('') }, p);
  }
  console.error('oddeven', [1, 2, 3, 4, 5].map(l => b[l].length).join('/'));
  return pick(b, false);
}

function buildKiller(seed) {
  const rng = E.mulberry32(seed), b = newBuckets(), seen = new Set(), t0 = Date.now();
  const small = [[2, 0.55], [3, 0.35], [4, 0.1]], big = [[2, 0.2], [3, 0.3], [4, 0.3], [5, 0.2]];
  for (let n = 0; !full(b) && n < CAP.killer; n++) {
    const easy = b[1].length < WANT[1] * ENOUGH && rng() < 0.35;
    const { cages, full: fullG } = V.killerPuzzle(rng, easy ? small : rng() < 0.5 ? big : undefined);
    E.setVariant({ type: 'killer', cages });
    const zero = new Array(81).fill(0);
    if (easy) { // a few givens for the easy ones
      const p = zero.slice(), k = 8 + ((rng() * 12) | 0);
      for (const i of E.shuffle([...Array(81).keys()], rng).slice(0, k)) p[i] = fullG[i];
      addGraded(b, seen, { p: p.join(''), c: cages }, p);
    } else addGraded(b, seen, { p: zero.join(''), c: cages }, zero);
    if (n % 25 === 24) console.error('killer', n + 1, [1, 2, 3, 4, 5].map(l => b[l].length).join('/'), ((Date.now() - t0) / 1000) | 0, 's');
  }
  console.error('killer', [1, 2, 3, 4, 5].map(l => b[l].length).join('/'));
  return pick(b, true);
}

const sets = [];
for (const [type, seed] of [['x', 7101], ['hyper', 7202], ['jigsaw', 7303]]) { const t = Date.now(); sets.push({ type, puzzles: buildStd(type, seed) }); console.error(type, (Date.now() - t) / 1000, 's'); }
{ const t = Date.now(); sets.push({ type: 'oddeven', puzzles: buildOddEven(7404) }); console.error('oddeven', (Date.now() - t) / 1000, 's'); }
{ const t = Date.now(); sets.push({ type: 'killer', puzzles: buildKiller(7505) }); console.error('killer', (Date.now() - t) / 1000, 's'); }
E.setVariant(null);

// verify uniqueness and pack
for (const s of sets) for (const x of s.puzzles) {
  const spec = { type: s.type };
  if (x.r) spec.regions = Array.from(x.r, Number);
  if (x.e) spec.parity = Array.from(x.e, Number);
  if (x.c) spec.cages = x.c;
  E.setVariant(spec);
  if (E.solve(Array.from(x.p, Number), 2).count !== 1) throw new Error('not unique ' + s.type);
}
E.setVariant(null);
const out = { v: 1, sets: sets.map(s => ({ type: s.type, puzzles: s.puzzles.map(x => { const o = { p: x.p, lv: x.lv }; if (x.r) o.r = x.r; if (x.e) o.e = x.e; if (x.c) o.c = x.c; return o; }) })) };
fs.writeFileSync(OUT, JSON.stringify(out));
for (const s of sets) {
  const lv = [1, 2, 3, 4].map(l => s.puzzles.filter(x => x.lv === l).length).join('/');
  const cl = s.puzzles.map(x => x.clues);
  console.log(s.type.padEnd(8), 'lv1/2/3/4', lv, ' clues', cl[0], '→', cl[cl.length - 1], `(min ${Math.min(...cl)} max ${Math.max(...cl)})`,
    s.type === 'killer' ? ` cages ${Math.min(...s.puzzles.map(x => x.c.length))}-${Math.max(...s.puzzles.map(x => x.c.length))}, level5: ${s.puzzles.filter(x => x.l5).length}` : '',
    s.type === 'oddeven' ? ` parity cells ${Math.min(...s.puzzles.map(x => x.e.replace(/0/g, '').length))}-${Math.max(...s.puzzles.map(x => x.e.replace(/0/g, '').length))}` : '');
}
console.log('total', (Date.now() - t00) / 1000, 's →', OUT);

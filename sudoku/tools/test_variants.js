// Checks puzzles_variants.json and that the standard variant is unaffected.
// usage: node tools/test_variants.js
const E = require('../engine.js');
const fs = require('fs'), path = require('path');
const P = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles_variants.json'), 'utf8'));
const specOf = (type, x) => {
  const spec = { type };
  if (x.r) spec.regions = Array.from(x.r, Number);
  if (x.e) spec.parity = Array.from(x.e, Number);
  if (x.c) spec.cages = x.c;
  if (x.g) spec.ineq = x.g; if (x.w) spec.dots = x.w; if (x.t) spec.thermos = x.t; if (x.a) spec.arrows = x.a;
  return spec;
};
const king = (a, b) => a !== b && Math.abs(((a / 9) | 0) - ((b / 9) | 0)) <= 1 && Math.abs((a % 9) - (b % 9)) <= 1;
const orth = (a, b) => (Math.abs(a - b) === 9) || (Math.abs(a - b) === 1 && ((a / 9) | 0) === ((b / 9) | 0));
let fails = 0; const fail = msg => { fails++; console.log('FAIL', msg); };

// 1. standard: geometry, solver and grader unchanged after a variant round-trip
const std = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles.json'), 'utf8'));
const sample = [...std.themes.flat().slice(0, 60), ...std.daily.hard.slice(0, 20)].map(s => Array.from(s.slice(0, 81), Number));
const snap = () => JSON.stringify([E.BOX, E.UNITS, E.PEERS, E.CELL_UNITS, sample.map(p => [E.grade(p), E.hint(p), E.solve(p, 2), Array.from(E.candidates(p)), E.transform(p, E.mulberry32(5))])]);
E.setVariant(null);
const refs = { UNITS: E.UNITS, PEERS: E.PEERS, BOX: E.BOX, CELL_UNITS: E.CELL_UNITS };
const before = snap();
for (const s of P.sets) E.setVariant(specOf(s.type, s.puzzles[0]));
E.setVariant({ type: 'std' });
if (snap() !== before) fail('standard results changed after variant round-trip');
for (const k in refs) if (E[k] !== refs[k]) fail('exported array replaced: ' + k);
if (E.UNITS.length !== 27 || E.unitKind(20) !== 'box') fail('std geometry');

// 2. variants
const order = ['x', 'hyper', 'jigsaw', 'oddeven', 'killer', 'ineq', 'antiknight', 'kropki', 'thermo', 'arrow'];
// the first five sets must stay byte-identical to the committed ones (progress is stored by index)
try {
  const head = JSON.parse(require('child_process').execSync('git show HEAD:sudoku/puzzles_variants.json', { cwd: path.join(__dirname, '..'), encoding: 'utf8', maxBuffer: 1 << 26 }));
  const base = head.sets.slice(0, 5);
  if (JSON.stringify(P.sets.slice(0, base.length)) !== JSON.stringify(base)) fail('base sets changed vs git HEAD');
} catch (e) { console.log('(git HEAD comparison skipped: ' + e.message.split('\n')[0] + ')'); }
if (P.v !== 1 || P.sets.map(s => s.type).join() !== order.join()) fail('set order');
for (const s of P.sets) {
  if (s.puzzles.length !== 30) fail(s.type + ' size');
  const lv = { 1: 0, 2: 0, 3: 0, 4: 0 }, gl = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let prev = 0, hintOK = 0, solvedN = 0, t0 = Date.now();
  s.puzzles.forEach((x, n) => {
    E.setVariant(specOf(s.type, x));
    if (E.UNITS.length !== { x: 29, hyper: 31 }[s.type] && (s.type === 'x' || s.type === 'hyper')) fail('units ' + s.type);
    if (x.c) { // cage sanity
      const cov = new Array(81).fill(0); for (const [, cells] of x.c) for (const i of cells) cov[i]++;
      if (cov.some(c => c !== 1)) fail(`${s.type}#${n} cage cover`);
      if (x.c.some(([, c]) => c.length > 5)) fail(`${s.type}#${n} cage size`);
    }
    if (x.r) for (let b = 0; b < 9; b++) if (E.UNITS[18 + b].length !== 9) fail(`${s.type}#${n} region size`);
    const p = Array.from(x.p, Number);
    const r = E.solve(p, 2);
    if (r.count !== 1) { fail(`${s.type}#${n} not unique (${r.count})`); return; }
    const sol = r.solution;
    if (x.e) for (let i = 0; i < 81; i++) if (+x.e[i] && (sol[i] % 2 ? 1 : 2) !== +x.e[i]) fail(`${s.type}#${n} parity`);
    const tag = `${s.type}#${n}`;
    if (x.g) for (const [a, b] of x.g) if (!orth(a, b) || !(sol[a] > sol[b])) fail(tag + ' ineq sign');
    if (x.w) { // all consecutive orthogonal pairs, and only those
      const want = new Set(); for (let i = 0; i < 81; i++) for (const j of [i + 1, i + 9]) if (j < 81 && orth(i, j) && Math.abs(sol[i] - sol[j]) === 1) want.add(i * 81 + j);
      const got = new Set(x.w.map(([a, b]) => Math.min(a, b) * 81 + Math.max(a, b)));
      if (got.size !== x.w.length || got.size !== want.size || [...want].some(k => !got.has(k))) fail(tag + ' kropki dots');
    }
    if (x.t) {
      const used = new Set();
      if (x.t.length < 4 || x.t.length > 10) fail(tag + ' thermo count');
      for (const t of x.t) {
        if (t.length < 3 || t.length > 7) fail(tag + ' thermo length');
        t.forEach((c, k) => { if (used.has(c)) fail(tag + ' thermo overlap'); used.add(c); if (k && (!king(t[k - 1], c) || sol[c] <= sol[t[k - 1]])) fail(tag + ' thermo order'); });
      }
    }
    if (x.a) {
      const used = new Set();
      if (x.a.length < 5 || x.a.length > 10) fail(tag + ' arrow count');
      for (const [c, cells] of x.a) {
        if (cells.length < 2 || cells.length > 4) fail(tag + ' arrow length');
        [c, ...cells].forEach((i, k, arr) => { if (used.has(i)) fail(tag + ' arrow overlap'); used.add(i); if (k && !king(arr[k - 1], i)) fail(tag + ' arrow path'); });
        if (cells.reduce((a, i) => a + sol[i], 0) !== sol[c]) fail(tag + ' arrow sum');
      }
    }
    if (order.indexOf(s.type) >= 5) { // the variant constraint must matter
      const sp = E.variant(); E.setVariant(null);
      if (E.solve(p, 2).count === 1) fail(tag + ' already unique as standard sudoku');
      E.setVariant(sp);
    }
    if (x.lv < prev) fail(`${s.type}#${n} order`); prev = x.lv; lv[x.lv]++;
    const g = E.grade(p); gl[g.solved ? g.level : 5]++;
    if (g.solved && g.level !== x.lv) fail(`${s.type}#${n} lv ${x.lv} vs grade ${g.level}`);
    if (!g.solved && !(x.lv === 4 && (s.type === 'killer' || (order.indexOf(s.type) >= 5 && n >= s.puzzles.length - 4)))) fail(`${s.type}#${n} unsolvable by human solver`);
    if (g.solved) {
      solvedN++;
      const cur = p.slice();
      for (let k = 0; k < 81; k++) {
        const h = E.hint(cur); if (!h.step) break;
        const [i, d] = h.step.place; if (sol[i] !== d) { fail(`${s.type}#${n} hint wrong`); break; }
        cur[i] = d;
      }
      if (cur.join() === sol.join()) hintOK++; else fail(`${s.type}#${n} hint loop incomplete`);
    }
  });
  console.log(s.type.padEnd(8), 'lv', [1, 2, 3, 4].map(l => lv[l]).join('/'), ' grade', [1, 2, 3, 4, 5].map(l => gl[l]).join('/'), ` unique 30/30, hint ${hintOK}/${solvedN}`, (Date.now() - t0) + 'ms');
}
E.setVariant(null);
if (snap() !== before) fail('standard results changed at end');
console.log(fails ? `${fails} FAILURES` : 'all OK');
process.exit(fails ? 1 : 0);

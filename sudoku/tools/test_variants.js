// Checks puzzles_variants.json and that the standard variant is unaffected.
// usage: node tools/test_variants.js
const E = require('../engine.js');
const fs = require('fs'), path = require('path');
const P = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles_variants.json'), 'utf8'));
let fails = 0; const fail = msg => { fails++; console.log('FAIL', msg); };

// 1. standard: geometry, solver and grader unchanged after a variant round-trip
const std = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles.json'), 'utf8'));
const sample = [...std.themes.flat().slice(0, 60), ...std.daily.hard.slice(0, 20)].map(s => Array.from(s.slice(0, 81), Number));
const snap = () => JSON.stringify([E.BOX, E.UNITS, E.PEERS, E.CELL_UNITS, sample.map(p => [E.grade(p), E.hint(p), E.solve(p, 2), Array.from(E.candidates(p)), E.transform(p, E.mulberry32(5))])]);
E.setVariant(null);
const refs = { UNITS: E.UNITS, PEERS: E.PEERS, BOX: E.BOX, CELL_UNITS: E.CELL_UNITS };
const before = snap();
for (const s of P.sets) { E.setVariant({ type: s.type, regions: s.puzzles[0].r && Array.from(s.puzzles[0].r, Number), parity: s.puzzles[0].e && Array.from(s.puzzles[0].e, Number), cages: s.puzzles[0].c }); }
E.setVariant({ type: 'std' });
if (snap() !== before) fail('standard results changed after variant round-trip');
for (const k in refs) if (E[k] !== refs[k]) fail('exported array replaced: ' + k);
if (E.UNITS.length !== 27 || E.unitKind(20) !== 'box') fail('std geometry');

// 2. variants
const order = ['x', 'hyper', 'jigsaw', 'oddeven', 'killer'];
if (P.v !== 1 || P.sets.map(s => s.type).join() !== order.join()) fail('set order');
for (const s of P.sets) {
  if (s.puzzles.length !== 30) fail(s.type + ' size');
  const lv = { 1: 0, 2: 0, 3: 0, 4: 0 }, gl = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let prev = 0, hintOK = 0, solvedN = 0, t0 = Date.now();
  s.puzzles.forEach((x, n) => {
    const spec = { type: s.type };
    if (x.r) spec.regions = Array.from(x.r, Number);
    if (x.e) spec.parity = Array.from(x.e, Number);
    if (x.c) spec.cages = x.c;
    E.setVariant(spec);
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
    if (x.lv < prev) fail(`${s.type}#${n} order`); prev = x.lv; lv[x.lv]++;
    const g = E.grade(p); gl[g.solved ? g.level : 5]++;
    if (g.solved && g.level !== x.lv) fail(`${s.type}#${n} lv ${x.lv} vs grade ${g.level}`);
    if (!g.solved && !(s.type === 'killer' && x.lv === 4)) fail(`${s.type}#${n} unsolvable by human solver`);
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

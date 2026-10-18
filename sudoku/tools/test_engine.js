const E = require('../engine.js');
const rng = E.mulberry32(12345);
const hist = {}; let t0 = Date.now(), bad = 0;
const N = +process.argv[2] || 300;
for (let k = 0; k < N; k++) {
  const { puzzle, solution } = E.generate(rng);
  const g = E.grade(puzzle);
  hist[g.level] = (hist[g.level] || 0) + 1;
  // verify logical solve matches solution via hint loop
  if (g.solved) {
    let cur = puzzle.slice();
    for (let s = 0; s < 81; s++) { const h = E.hint(cur); if (!h.step) break; const [i, d] = h.step.place; if (solution[i] !== d) { bad++; break; } cur[i] = d; }
    if (cur.join() !== solution.join()) bad++;
  }
}
console.log('levels', hist, 'bad', bad, 'ms/puzzle', (Date.now() - t0) / N);

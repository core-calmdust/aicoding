// print solver principal variations for the problems of a step: node lessons-pv.mjs <stepId>
import path from 'path';
import { specFromRows, pv, show } from './lessons-lib.mjs';
const id = process.argv[2];
for (const c of ['basics', 'tactics', 'lifedeath']) {
  let mod; try { mod = await import('./lessons-c-' + c + '.mjs'); } catch (e) { continue; }
  for (const st of mod.steps) if (st.id === id) st.problems.forEach((P, k) => {
    const spec = specFromRows(P.rows, P.turn, P.swap), c0 = (P.chk || [])[0];
    if (!c0 || c0.goal === 'connect' || c0.goal === 'cut' || c0.goal === 'escape' || c0.goal === 'live') { console.log(k + 1, 'skip', c0 && c0.goal); return; }
    console.log(k + 1, c0.goal, 'line', JSON.stringify(P.line), 'pv', pv(spec, c0.goal, c0.tgt, c0, P.ok[0]).join(' '));
  });
}

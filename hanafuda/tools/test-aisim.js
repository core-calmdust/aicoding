// the fast simulator must follow the engine exactly: same deal, same (deterministic) choices -> same result
const HF = require('../engine.js'), S = require('../aisim.js');
let fail = 0, n = 0;
const r = HF.rng(9);
for (let g = 0; g < 4000; g++) {
  const o = [{}, HF.PRESETS.app, HF.PRESETS.soft][g % 3];
  let s = HF.deal(500 + g, g & 1, o);
  if (s.phase === 'over') continue;
  // play a random prefix in the engine
  const pre = Math.floor(r() * 20);
  for (let i = 0; i < pre && s.phase !== 'over'; i++) { const a = HF.actions(s); s = HF.apply(s, a[Math.floor(r() * a.length)]); }
  if (s.phase === 'over') continue;
  const w = S.fromState(s);
  // same choice rule on both sides: the first action in sorted order ('koi' < 'stop')
  const pickA = acts => acts.slice().sort((x, y) => String(x) < String(y) ? -1 : 1)[0];
  let e = s;
  while (e.phase !== 'over') e = HF.apply(e, pickA(HF.actions(e)));
  let k = 0; while (w.phase !== 'over' && k++ < 300) { const a = S.actions(w); S.apply(w, pickA(a)); }
  const er = e.result.winner < 0 ? (e.result.pts && e.result.winner === -1 ? 0 : 0) : (e.result.winner === 0 ? e.result.pts : -e.result.pts);
  const er2 = e.result.draw && e.result.winner >= 0 ? (e.result.winner === 0 ? 6 : -6) : er;
  if (er2 !== w.res) { fail++; if (fail < 5) console.log('mismatch', g, er2, w.res, JSON.stringify(e.result)); }
  n++;
}
console.log('compared', n, fail ? 'FAILED ' + fail : 'all ok');

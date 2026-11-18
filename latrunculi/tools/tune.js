// Texel tuning of the evaluation weights (2026-11-19).
//   node tools/tune.js gen <rule> <games> <out.jsonl> [nk] [seed]   self-play (search of nk thousand nodes, a few random moves
//                                                                     for variety); every position → features + result
//   node tools/tune.js fit <rule> <in.jsonl> [...more]              logistic regression of the result on the features
const fs = require('fs'), path = require('path');
const E = require(path.resolve(__dirname, '../engine.js'));
const [, , mode, rule, ...rest] = process.argv;
E.setRule(rule);
if (mode === 'gen') {
  const [G, out, nk = '3', sd = '1'] = rest;
  let seed = +sd * 7919 + 17; const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
  const fd = fs.openSync(out, 'a'); let npos = 0;
  for (let g = 0; g < +G; g++) {
    E.ttClear();
    const pos = E.Pos.from(null), moves = [], recs = [];
    const nr = E.R.place ? 4 + Math.floor(rnd() * 6) : 1 + Math.floor(rnd() * 3);
    let j;
    for (let ply = 0; ply < 400; ply++) {
      j = E.judge(pos); if (j.over) break;
      let m;
      if (ply < nr || rnd() < .03) { const L = pos.moves(); m = L[Math.floor(rnd() * L.length)]; }
      else m = E.thinkCfg(null, moves, { s: 1, nk: +nk }, rule).move;
      if (m == null || m < 0) break;
      const quiet = pos.placing || (!pos.removable().length && !pos.moves().some(x => { const e = E.effect(pos, x); return e.blocks.length || e.takes.length; }));   // (quiet positions only: no enclosure to make, no removal due)
      if (ply >= 8 && quiet) { const F = new Float64Array(2 * E.FN.length); E.evalCore(pos, F); recs.push([Array.from(F, x => Math.round(x * 1000) / 1000), pos.side + 1]); }
      moves.push(m); pos.play(m);
    }
    j = j && j.over ? j : E.judge(pos);
    const res = j.over ? (j.draw ? .5 : j.winner) : .5;
    for (const [f, side] of recs) { const r = res === .5 ? .5 : res === side ? 1 : 0; fs.writeSync(fd, JSON.stringify([f, r]) + '\n'); npos++; }
    if (g % 10 === 9) process.stdout.write(`\r${rule} ${g + 1} games, ${npos} positions   `);
  }
  console.log(`\n${rule}: ${npos} positions`);
} else if (mode === 'fit') {
  const X = [], Y = [];
  for (const f of rest) for (const ln of fs.readFileSync(f, 'utf8').split('\n')) { if (!ln) continue; const [x, y] = JSON.parse(ln); X.push(x); Y.push(y); }
  const n = X.length, nf = 2 * E.FN.length;
  console.log(rule, n, 'positions');
  const w = Array.from(E.TUNED[rule] || E.W0), w0 = w.slice(), LAM = +(process.env.LAM || 0);   // LAM: L2 pull towards the starting weights (per unit of loss)
  const val = (w, x) => { let v = 0; for (let k = 0; k < nf; k++) v += w[k] * x[k]; return v; };
  const loss = (w, K) => { let s = 0; for (let i = 0; i < n; i++) { const p = 1 / (1 + Math.exp(-K * val(w, X[i]))); s += (Y[i] - p) ** 2; } return s / n; };
  // the scale K for the hand-set weights
  let K = .004, best = loss(w, K);
  for (const k of [.002, .003, .005, .007, .01, .014, .02, .028, .04]) { const l = loss(w, k); if (l < best) { best = l; K = k; } }
  console.log('K', K, 'loss before', best.toFixed(5));
  // Adam on the weights; 'man' stays 100 (the scale of the whole evaluation)
  const m1 = new Array(nf).fill(0), m2 = new Array(nf).fill(0), lr = 1.2;
  for (let it = 1; it <= 400; it++) {
    const g = new Array(nf).fill(0);
    for (let i = 0; i < n; i++) {
      const x = X[i], p = 1 / (1 + Math.exp(-K * val(w, x))), e = (p - Y[i]) * p * (1 - p) * K;
      for (let k = 0; k < nf; k++) g[k] += e * x[k];
    }
    for (let k = 0; k < nf; k++) {
      if (E.FN[k % E.FN.length] === 'man') continue;
      g[k] /= n; g[k] += LAM * 2e-8 * (w[k] - w0[k]); m1[k] = .9 * m1[k] + .1 * g[k]; m2[k] = .999 * m2[k] + .001 * g[k] * g[k];
      w[k] -= lr * (m1[k] / (1 - .9 ** it)) / (Math.sqrt(m2[k] / (1 - .999 ** it)) + 1e-9);
    }
    if (it % 100 === 0) console.log(it, loss(w, K).toFixed(5));
  }
  console.log(JSON.stringify(w.map(x => Math.round(x * 10) / 10)));
  const nf1 = E.FN.length; console.log('place: ' + E.FN.map((k, i) => k + ' ' + (Math.round(w[i] * 10) / 10)).join(', ')); console.log('move:  ' + E.FN.map((k, i) => k + ' ' + (Math.round(w[nf1 + i] * 10) / 10)).join(', '));
}

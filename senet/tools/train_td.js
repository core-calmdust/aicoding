// TD(0) self-play training of a small MLP value net for Senet. Usage: node train_td.js GAMES HIDDEN out.json [init.json]
const E = require('../engine.js');
const [G, H, OUT, INIT] = [+process.argv[2] || 20000, +process.argv[3] || 40, process.argv[4] || 'net.json', process.argv[5]];
const NI = 30 * 2 + 4;
function feats(s, x) {   // perspective: side to move
  x.fill(0); const me = s.turn, op = 1 - me, n = s.pos[0].length;
  let offM = 0, offO = 0;
  for (const p of s.pos[me]) { if (p >= 31) offM++; else x[p - 1] = 1; }
  for (const p of s.pos[op]) { if (p >= 31) offO++; else x[30 + p - 1] = 1; }
  x[60] = offM / n; x[61] = offO / n;
  let rm = 0, ro = 0; for (const p of s.pos[me]) rm += E.T[Math.min(p, 31)]; for (const p of s.pos[op]) ro += E.T[Math.min(p, 31)];
  x[62] = (ro - rm) / 20; x[63] = (rm + ro) / 200;
  return x;
}
let net;
if (INIT) net = JSON.parse(require('fs').readFileSync(INIT));
else { const rnd = () => (Math.random() * 2 - 1); net = { H, w1: Array.from({ length: H * NI }, () => rnd() * .15), b1: new Array(H).fill(0), w2: Array.from({ length: H }, () => rnd() * .15), b2: 0 }; }
const w1 = Float64Array.from(net.w1), b1 = Float64Array.from(net.b1), w2 = Float64Array.from(net.w2); let b2 = net.b2; const Hn = net.H;
const x = new Float64Array(NI), h = new Float64Array(Hn);
function fwd(s) { feats(s, x); let o = b2; for (let j = 0; j < Hn; j++) { let a = b1[j]; const off = j * NI; for (let i = 0; i < NI; i++) if (x[i]) a += w1[off + i] * x[i]; h[j] = a > 0 ? a : 0.01 * a; o += w2[j] * h[j]; } return 1 / (1 + Math.exp(-o)); }
function train(s, target, lr) {
  const v = fwd(s), g = (target - v);   // cross-entropy grad wrt logit
  for (let j = 0; j < Hn; j++) { const gh = g * w2[j] * (h[j] > 0 ? 1 : 0.01); w2[j] += lr * g * h[j]; b1[j] += lr * gh; const off = j * NI; for (let i = 0; i < NI; i++) if (x[i]) w1[off + i] += lr * gh * x[i]; }
  b2 += lr * g;
}
function val(s) { if (s.winner >= 0) return s.winner === s.turn ? 1 : 0; return fwd(s); }
function wpAfter(s, m) { const r = E.apply(s, m).state; if (r.winner >= 0) return r.winner === s.turn ? 1 : 0; const v = val(r); return r.turn === s.turn ? v : 1 - v; }
const rng = Math.random; let t0 = Date.now();
for (let g = 0; g < G; g++) {
  const lr = 0.02 * Math.max(0.15, 1 - g / G);
  let s = E.newGame(Math.random() < .25 ? 'long' : 'std', g & 1), plies = 0;
  while (s.winner < 0 && plies < 2000) {
    const r = E.rollDice(rng), ms = E.legalMoves(s, r.n);
    let m = null;
    if (ms.length) { if (rng() < 0.03) m = ms[rng() * ms.length | 0]; else { let b = -1; for (const q of ms) { const w = wpAfter(s, q); if (w > b) { b = w; m = q; } } } }
    const ns = E.apply(s, m, r.n).state;
    // target for s (before the throw): value of ns from s.turn's view
    const tv = ns.winner >= 0 ? (ns.winner === s.turn ? 1 : 0) : (ns.turn === s.turn ? val(ns) : 1 - val(ns));
    train(s, tv, lr);
    s = ns; plies++;
  }
  if ((g + 1) % 5000 === 0) { console.log(g + 1, ((Date.now() - t0) / 1000).toFixed(0) + 's'); save(); }
}
function save() { require('fs').writeFileSync(OUT, JSON.stringify({ H: Hn, NI, w1: Array.from(w1, v => +v.toFixed(5)), b1: Array.from(b1, v => +v.toFixed(5)), w2: Array.from(w2, v => +v.toFixed(5)), b2: +b2.toFixed(5) })); }
save();

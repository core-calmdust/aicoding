// ur/tools/train_eval.js — 評価ネットの学習（オフライン）
// 教師：RoyalUr.net の完全解析表（勝率）。局面は「解析表で最善＋ε ランダム」の自己対局と、その子局面から集める。
// 使い方: node --max-old-space-size=7000 ur/tools/train_eval.js <rule> <lut.rgu> [samples=3000000] [epochs=12]
// 出力: ur/tools/net-<rule>.json（engine.js の NETS に埋め込む：node ur/tools/embed_nets.js）
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js'), LUT = require('./lut.js');
const [rule, file, NS = '3000000', EP = '12', H1s = '96', H2s = '32'] = process.argv.slice(2);
const rl = E.RULES[rule];
const T = LUT.open(rule, file);
const rng = E.mulberry32(12345);
const nin = 2 * rl.pathLen + 4 * (rl.pieces + 1), MAXF = 2 * rl.pieces + 4;
const NSAMP = +NS;
const F = new Uint8Array(NSAMP * MAXF), FN = new Uint8Array(NSAMP), Y = new Float32Array(NSAMP);
const idx = new Int32Array(64);
let ns = 0;
const seen = new Set();
function add(s) {
  if (ns >= NSAMP || s.winner >= 0) return;
  const k = E.key(s); if (seen.has(k)) return; seen.add(k);
  const n = E._features(rl, s, idx);
  for (let i = 0; i < n; i++) F[ns * MAXF + i] = idx[i];
  FN[ns] = n; Y[ns] = T.lookup(s); ns++;
}
console.time('gen');
const EPSS = [0, 0.05, 0.15, 0.3, 0.6, 1];
while (ns < NSAMP) {
  const eps = EPSS[Math.floor(rng() * EPSS.length)];
  let s = E.newGame(rule, rng() < 0.5 ? 1 : 0);
  while (s.winner < 0 && ns < NSAMP) {
    add(s);
    const n = E.rollDice(rng, rule).n;
    const ms = E.legalMoves(s, n);
    if (rng() < 0.35) for (const m of ms) add(E.apply(s, m).state);
    let m = null;
    if (ms.length) {
      if (rng() < eps) m = ms[Math.floor(rng() * ms.length)];
      else { let bv = -1; for (const x of ms) { const v = T.after(s, x); if (v > bv) { bv = v; m = x; } } }
    }
    s = E.apply(s, m).state;
  }
  if (seen.size > 6e6) seen.clear();
}
console.timeEnd('gen'); console.log('samples', ns);

// ---- MLP: nin → H1 (ReLU) → H2 (ReLU) → 1 (sigmoid)、損失 BCE、Adam ----
const H1 = +H1s, H2 = +H2s;
const P = nin * H1 + H1 + H1 * H2 + H2 + H2 + 1;
const W = new Float32Array(P), G = new Float32Array(P), M1 = new Float32Array(P), M2 = new Float32Array(P);
const oW1 = 0, ob1 = nin * H1, oW2 = ob1 + H1, ob2 = oW2 + H1 * H2, oW3 = ob2 + H2, ob3 = oW3 + H2;
const gauss = () => Math.sqrt(-2 * Math.log(rng() + 1e-12)) * Math.cos(2 * Math.PI * rng());
for (let i = 0; i < nin * H1; i++) W[oW1 + i] = gauss() * Math.sqrt(2 / (2 * rl.pieces));
for (let i = 0; i < H1 * H2; i++) W[oW2 + i] = gauss() * Math.sqrt(2 / H1);
for (let i = 0; i < H2; i++) W[oW3 + i] = gauss() * Math.sqrt(1 / H2);
const a1 = new Float32Array(H1), a2 = new Float32Array(H2), d1 = new Float32Array(H1), d2 = new Float32Array(H2);
function fwd(j) {
  const n = FN[j], b = j * MAXF;
  for (let h = 0; h < H1; h++) a1[h] = W[ob1 + h];
  for (let q = 0; q < n; q++) { const r = oW1 + F[b + q] * H1; for (let h = 0; h < H1; h++) a1[h] += W[r + h]; }
  for (let h = 0; h < H1; h++) if (a1[h] < 0) a1[h] = 0;
  let o = W[ob3];
  for (let k = 0; k < H2; k++) { let v = W[ob2 + k]; for (let h = 0; h < H1; h++) v += a1[h] * W[oW2 + h * H2 + k]; a2[k] = v > 0 ? v : 0; o += a2[k] * W[oW3 + k]; }
  return 1 / (1 + Math.exp(-o));
}
function bwd(j, p) {
  const g = p - Y[j]; // dBCE/dlogit
  G[ob3] += g;
  for (let k = 0; k < H2; k++) { G[oW3 + k] += g * a2[k]; d2[k] = a2[k] > 0 ? g * W[oW3 + k] : 0; G[ob2 + k] += d2[k]; }
  for (let h = 0; h < H1; h++) {
    if (a1[h] <= 0) { d1[h] = 0; continue; }
    let v = 0; const r = oW2 + h * H2;
    for (let k = 0; k < H2; k++) { v += d2[k] * W[r + k]; G[r + k] += d2[k] * a1[h]; }
    d1[h] = v; G[ob1 + h] += v;
  }
  const n = FN[j], b = j * MAXF;
  for (let q = 0; q < n; q++) { const r = oW1 + F[b + q] * H1; for (let h = 0; h < H1; h++) G[r + h] += d1[h]; }
}
const nval = Math.min(100000, Math.floor(ns * 0.03)), ntr = ns - nval;
const order = new Uint32Array(ntr); for (let i = 0; i < ntr; i++) order[i] = i + nval;
const BS = 256, b1 = 0.9, b2 = 0.999; let t = 0;
function validate() { let se = 0, mx = 0; for (let j = 0; j < nval; j++) { const d = Math.abs(fwd(j) - Y[j]); se += d * d; if (d > mx) mx = d; } return { rmse: Math.sqrt(se / nval), max: mx }; }
const epochs = +EP;
for (let ep = 0; ep < epochs; ep++) {
  for (let i = ntr - 1; i > 0; i--) { const k = Math.floor(rng() * (i + 1)); const x = order[i]; order[i] = order[k]; order[k] = x; }
  const lr = 0.002 * Math.pow(0.5, ep / (epochs / 4));
  console.time('ep' + ep);
  for (let s0 = 0; s0 < ntr; s0 += BS) {
    G.fill(0); const e = Math.min(ntr, s0 + BS);
    for (let q = s0; q < e; q++) { const j = order[q]; bwd(j, fwd(j)); }
    t++; const inv = 1 / (e - s0), c1 = 1 - Math.pow(b1, t), c2 = 1 - Math.pow(b2, t);
    for (let i = 0; i < P; i++) {
      const g = G[i] * inv; if (g === 0 && M1[i] === 0) continue;
      M1[i] = b1 * M1[i] + (1 - b1) * g; M2[i] = b2 * M2[i] + (1 - b2) * g * g;
      W[i] -= lr * (M1[i] / c1) / (Math.sqrt(M2[i] / c2) + 1e-8);
    }
  }
  console.timeEnd('ep' + ep);
  console.log('epoch', ep, 'lr', lr.toFixed(5), validate());
}
// 量子化（int16、全体で1つのスケール）
let mx = 0; for (let i = 0; i < P; i++) mx = Math.max(mx, Math.abs(W[i]));
const scale = mx / 32767, q = new Int16Array(P);
for (let i = 0; i < P; i++) q[i] = Math.round(W[i] / scale);
for (let i = 0; i < P; i++) W[i] = q[i] * scale;
console.log('quantized', validate());
const out = { shape: [nin, H1, H2], scale, w: Buffer.from(q.buffer).toString('base64') };
fs.writeFileSync(path.join(__dirname, 'net-' + rule + '.json'), JSON.stringify(out));
console.log('wrote net-' + rule + '.json', (out.w.length / 1024).toFixed(1) + 'KB b64');

// Logistic regression on pattern-combination features (Adam, L2), validation by game.
'use strict';
const fs = require('fs');
const { NF } = require('./feat.js');
const G = process.argv[2] || 'renju', EPOCHS = +process.argv[3] || 6, SRC = process.argv[4] || 'data', dir = '/home/claude/work/eval/' + SRC + '_' + G;
const rd = (f, T) => { const b = fs.readFileSync(dir + '/' + f); return new T(b.buffer, b.byteOffset, b.byteLength / T.BYTES_PER_ELEMENT); };
const ids = rd('ids.bin', Uint16Array), cnt = rd('cnt.bin', Uint8Array), off = rd('off.bin', Int32Array), lab = rd('lab.bin', Float32Array), gid = rd('gid.bin', Int32Array), old = rd('old.bin', Float32Array);
const NP = lab.length;
const isVal = i => gid[i] % 10 === 0;
const W = new Float64Array(NF), M = new Float64Array(NF), V = new Float64Array(NF);
const SCALE = 1 / 600;   // output v in "eval units"; p = sigmoid(v * SCALE)
const sig = x => 1 / (1 + Math.exp(-x));
function pred(i) { let v = 0; for (let k = off[i]; k < off[i + 1]; k++) v += W[ids[k]] * cnt[k]; return v; }
function evalSet() {
  let ll = 0, n = 0, acc = 0, llo = 0;
  // fit a scale for the old evaluation once
  for (let i = 0; i < NP; i++) if (isVal(i)) { const p = sig(pred(i) * SCALE), y = lab[i]; ll -= y * Math.log(p + 1e-9) + (1 - y) * Math.log(1 - p + 1e-9); acc += (p > 0.5) === (y > 0.5); n++; }
  return { ll: ll / n, acc: acc / n, n };
}
function oldBaseline() {
  let best = null;
  for (const k of [1/50, 1/100, 1/200, 1/300, 1/500, 1/800, 1/1200, 1/2000]) {
    let ll = 0, n = 0, acc = 0;
    for (let i = 0; i < NP; i++) if (isVal(i)) { const p = sig(old[i] * k), y = lab[i]; ll -= y * Math.log(p + 1e-9) + (1 - y) * Math.log(1 - p + 1e-9); acc += (p > 0.5) === (y > 0.5); n++; }
    if (!best || ll / n < best.ll) best = { k, ll: ll / n, acc: acc / n };
  }
  return best;
}
console.log('positions', NP, 'old eval baseline', oldBaseline());
const order = []; for (let i = 0; i < NP; i++) if (!isVal(i)) order.push(i);
let lr = 2.0; const b1 = 0.9, b2 = 0.999, L2 = 1e-6, BS = 256;
const grad = new Float64Array(NF); let step = 0;
for (let ep = 0; ep < EPOCHS; ep++) {
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  for (let s = 0; s < order.length; s += BS) {
    const touched = new Set();
    for (let q = s; q < Math.min(order.length, s + BS); q++) {
      const i = order[q], p = sig(pred(i) * SCALE), g = (p - lab[i]) * SCALE;
      for (let k = off[i]; k < off[i + 1]; k++) { grad[ids[k]] += g * cnt[k]; touched.add(ids[k]); }
    }
    step++;
    for (const f of touched) {
      const g = grad[f] / BS + L2 * W[f]; grad[f] = 0;
      M[f] = b1 * M[f] + (1 - b1) * g; V[f] = b2 * V[f] + (1 - b2) * g * g;
      W[f] -= lr * (M[f] / (1 - Math.pow(b1, step))) / (Math.sqrt(V[f] / (1 - Math.pow(b2, step))) + 1e-8);
    }
  }
  lr *= 0.6;
  console.log('epoch', ep + 1, evalSet());
}
fs.writeFileSync('/home/claude/work/eval/w_' + G + (SRC === 'data' ? '' : '_' + SRC) + '.json', JSON.stringify(Array.from(W, x => Math.round(x))));

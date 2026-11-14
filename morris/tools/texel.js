// Texel tuning of the hand evaluation of engine.c (MODEL_CARD.md「評価関数の Texel 調整」, 2026-11-14), from anywhere:
//   node morris/tools/texel.js gen <engine.wasm> <variant> <games> <nodesK> <seed> <out.jsonl>   self-play (2–12 random plies)
//   node morris/tools/texel.js tune <variant> <games.jsonl>... [--fix=0,1,..] [--it=600] [--lr=1]  fit the weights
//   node morris/tools/texel.js verify <engine.wasm> <variant> <games.jsonl> '<weights json>'      eval_root = the terms × weights
// The terms are engine.c evaluate()'s (enum F_…, side to move's view; the same order). tune: the quiet positions (the side
// to move cannot close a mill) after the random plies, the game result for the side to move (1 / 0.5 / 0), the logistic
// loss of 1 / (1 + 10^(-K·eval/400)) with K fitted to the old weights, Adam, every 10th game held out (early stop on it).
// --fix: the terms kept at the old weight (0 = material, the scale; rarely seen terms: 1, 10, 14, 16, 17; six: 19, 20).
'use strict';
const fs = require('fs'), path = require('path');
const W = path.resolve(__dirname, '..'), E = require(W + '/engine.js');
const NAMES = ['mat', 'thrNowOwn', 'thrNowOpp', 'twoPlace', 'twoMove', 'millPlace', 'millOpen', 'millShut', 'thrO2', 'thrO1', 'thrP',
  'degPlace', 'mobOwn', 'mobOpp', 'mob0Own', 'mob1Own', 'mob0Opp', 'mob1Opp', 'handDiff', 'flyOwn', 'flyOpp', 'swing', 'blocked', 'pot1Place', 'matMove'];
const W0 = [100, 24, -24, 6, 7, 8, 22, 10, -85, -18, 20, 4, 5, -5, -400, -40, 300, 30, 0, 0, 0, 0, 0, 0, 0], NF = NAMES.length;
function features(pos, f) {
  f.fill(0);
  const G = pos.G, b = pos.b, p = pos.side, o = 3 - p, ms = G.mills;
  f[0] = (pos.cnt[p] + pos.hand[p]) - (pos.cnt[o] + pos.hand[o]);
  const placing = pos.hand[1] > 0 || pos.hand[2] > 0;
  const flyP = G.fly && !pos.hand[p] && pos.cnt[p] === 3, flyO = G.fly && !pos.hand[o] && pos.cnt[o] === 3;
  let thrO = 0, thrP = 0;
  for (let k = 0; k < ms.length; k++) {
    const m = ms[k], a = b[m[0]], c = b[m[1]], d = b[m[2]];
    const np = (a === p) + (c === p) + (d === p), no = (a === o) + (c === o) + (d === o);
    if (np + no === 2 && (np === 2 || no === 2)) {
      const who = np === 2 ? p : o, sg = who === p ? 1 : -1, e = !a ? m[0] : !c ? m[1] : m[2];
      let now = pos.hand[who] > 0 || (who === p ? flyP : flyO);
      if (!now && !placing) { const aj = G.adjFlat[e]; for (let j = 0; j < aj.length; j++) { const q = aj[j]; if (b[q] === who && !m.includes(q)) { now = true; break; } } }
      if (now) { if (who === p) { thrP++; f[1]++; } else { thrO++; f[2]++; } }
      else if (placing) f[3] += sg; else f[4] += sg;
    } else if (np === 3 || no === 3) {
      const sg = np === 3 ? 1 : -1, who = np === 3 ? p : o;
      if (placing) f[5] += sg;
      else {
        let open = false;
        for (let j = 0; j < 3 && !open; j++) { const aj = G.adjFlat[m[j]]; for (let q = 0; q < aj.length; q++) if (!b[aj[q]]) { open = true; break; } }
        if (open) f[6] += sg; else f[7] += sg;
        if (!(who === p ? flyP : flyO)) {   // a running mill: a member steps off and closes another mill there
          let sw = 0;
          for (let j = 0; j < 3 && !sw; j++) {
            const x = m[j], aj = G.adjFlat[x];
            for (let q = 0; q < aj.length && !sw; q++) {
              const e = aj[q]; if (b[e]) continue; const pr = G.pairs[e];
              for (let t = 0; t < pr.length; t += 2) if (pr[t] !== x && pr[t + 1] !== x && b[pr[t]] === who && b[pr[t + 1]] === who) { sw = 1; break; }
            }
          }
          f[21] += sg * sw;
        }
      }
    } else if (placing && np + no === 1) f[23] += np ? 1 : -1;
  }
  if (thrO >= 2) f[8] = 1; else if (thrO === 1) f[9] = 1;
  if (thrP) f[10] = 1;
  if (placing) {
    for (let i = 0; i < G.n; i++) { const v = b[i]; if (v) f[11] += (v === p ? 1 : -1) * G.adjFlat[i].length; }
    f[18] = pos.hand[p] - pos.hand[o];
  } else {
    let mp = 0, mo = 0, bp = 0, bo = 0;
    for (let i = 0; i < G.n; i++) {
      const v = b[i]; if (!v) continue;
      const aj = G.adjFlat[i]; let fr = 0; for (let j = 0; j < aj.length; j++) if (!b[aj[j]]) fr++;
      if (v === p) { mp += fr; bp += !fr; } else { mo += fr; bo += !fr; }
    }
    if (!flyP) { f[12] = mp; if (mp === 0) f[14] = 1; else if (mp === 1) f[15] = 1; }
    if (!flyO) { f[13] = mo; if (mo === 0) f[16] = 1; else if (mo === 1) f[17] = 1; }
    f[22] = (flyP ? 0 : bp) - (flyO ? 0 : bo); f[24] = f[0];
  }
  f[19] = flyP ? 1 : 0; f[20] = flyO ? 1 : 0;
  return f;
}
function load(f, variant) {
  const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(f)), { env: { now: () => Date.now(), progress: () => {} } }).exports;
  const io = () => new Int32Array(x.memory.buffer, x.io_ptr(), 8192);
  const G = E.geom(variant), a = [G.n, G.pieces, G.fly ? 1 : 0, G.mills.length];
  for (const m of G.mills) a.push(...m);
  const inMills = (i, j) => G.mills.some(m => (m[0] === i && m[1] === j) || (m[1] === i && m[2] === j) || (m[0] === j && m[1] === i) || (m[1] === j && m[2] === i));
  const extra = []; for (let i = 0; i < G.n; i++) for (const j of G.adj[i]) if (j > i && !inMills(i, j)) extra.push(i, j);
  a.push(extra.length / 2, ...extra); io().set(a); x.set_geometry();
  return { x, io };
}
const games = files => files.flatMap(fl => fs.readFileSync(fl, 'utf8').split('\n').filter(l => { try { JSON.parse(l); return true; } catch (e) { return false; } }).map(l => JSON.parse(l)));
const [mode, ...A] = process.argv.slice(2);
if (mode === 'gen') {
  const [f, variant, Ns, nk, sd, out] = A, { x, io } = load(f, variant), fd = fs.openSync(out, 'w');
  let s = (+sd || 1) * 2654435761 >>> 0; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  for (let g = 0; g < +Ns; g++) {
    const pre = 2 + Math.floor(rnd() * 11), mv = []; let res = null;
    x.new_game();
    for (let ply = 0; res === null; ply++) {
      const { pos, hashes } = E.replay(variant, null, mv), st = pos.status();
      if (st === -1) { res = 3 - pos.side; break; }
      let c = 0; for (const h of hashes) if (h === pos.h1) c++;
      if (st === 2 || c >= 3 || mv.length >= 400) { res = 0; break; }
      let m;
      if (ply < pre) { const L = pos.moves(); m = L[Math.floor(rnd() * L.length)]; }
      else { io().set(E.setupIO(variant, null, mv)); x.setup(); x.best(40, 0, +nk * 1000); m = io()[0]; }
      mv.push(m);
    }
    fs.writeSync(fd, JSON.stringify({ pre: Math.min(pre, mv.length), mv, res }) + '\n');
  }
} else if (mode === 'verify') {
  const [f, variant, fl, wj] = A, Wt = JSON.parse(wj), { x, io } = load(f, variant), fv = new Float64Array(NF);
  let n = 0, bad = 0;
  for (const g of games([fl]).slice(0, 400)) for (let i = 0; i <= g.mv.length; i++) {
    const mv = g.mv.slice(0, i), { pos } = E.replay(variant, null, mv); if (pos.status() !== 0) continue;
    io().set(E.setupIO(variant, null, mv)); x.setup(); features(pos, fv);
    let e = 0; for (let k = 0; k < NF; k++) e += Wt[k] * fv[k];
    n++; if (e !== x.eval_root()) bad++;
  }
  console.log(`${variant}: ${n} positions, ${bad} mismatches`);
} else if (mode === 'tune') {
  const variant = A[0], opt = Object.fromEntries(A.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
  const X = [], Y = [], GI = []; let gi = 0; const fv = new Float64Array(NF);
  for (const g of games(A.slice(1).filter(a => !a.startsWith('--')))) {
    gi++; const { pos } = E.replay(variant, null, []);
    for (let i = 0; i < g.mv.length; i++) {
      if (i >= g.pre && pos.status() === 0 && !pos.moves().some(m => ((m >> 10) & 31) !== 31)) {
        X.push(Float32Array.from(features(pos, fv))); Y.push(g.res === 0 ? 0.5 : g.res === pos.side ? 1 : 0); GI.push(gi);
      }
      pos.play(g.mv[i]);
    }
  }
  const n = X.length, val = i => GI[i] % 10 === 0, sig = (e, K) => 1 / (1 + Math.pow(10, -K * e / 400)), LN10 = Math.log(10);
  const loss = (Wt, K, which) => { let s = 0, c = 0; for (let i = 0; i < n; i++) { if (val(i) !== which) continue; let e = 0; for (let k = 0; k < NF; k++) e += Wt[k] * X[i][k]; const q = Math.min(Math.max(sig(e, K), 1e-6), 1 - 1e-6); s -= Y[i] * Math.log(q) + (1 - Y[i]) * Math.log(1 - q); c++; } return s / c; };
  let K = 1, bl = Infinity; for (let k = 0.05; k <= 12; k += 0.05) { const l = loss(W0, k, false); if (l < bl) { bl = l; K = k; } }
  console.log(`${variant}: ${gi} games, ${n} positions, K ${K.toFixed(2)}, loss of the old weights: train ${loss(W0, K, false).toFixed(5)} held out ${loss(W0, K, true).toFixed(5)}`);
  const fix = new Set((opt.fix || '0').split(',').map(Number)), lr = +(opt.lr || 1), it = +(opt.it || 600);
  const Wt = W0.slice(), m1 = new Float64Array(NF), m2 = new Float64Array(NF); let bestV = Infinity, bestW = W0.slice();
  for (let t = 1; t <= it; t++) {
    const g = new Float64Array(NF); let c = 0;
    for (let i = 0; i < n; i++) { if (val(i)) continue; let e = 0; const x = X[i]; for (let k = 0; k < NF; k++) e += Wt[k] * x[k]; const d = (sig(e, K) - Y[i]) * K * LN10 / 400; for (let k = 0; k < NF; k++) if (x[k]) g[k] += d * x[k]; c++; }
    for (let k = 0; k < NF; k++) { if (fix.has(k)) continue; const gk = g[k] / c; m1[k] = 0.9 * m1[k] + 0.1 * gk; m2[k] = 0.999 * m2[k] + 0.001 * gk * gk; Wt[k] -= lr * (m1[k] / (1 - 0.9 ** t)) / (Math.sqrt(m2[k] / (1 - 0.999 ** t)) + 1e-12); }
    if (t % 25 === 0) { const lv = loss(Wt, K, true); if (lv < bestV) { bestV = lv; bestW = Wt.slice(); } }
  }
  const R = bestW.map(Math.round);
  console.log(`fitted: train ${loss(R, K, false).toFixed(5)} held out ${loss(R, K, true).toFixed(5)}`);
  for (let k = 0; k < NF; k++) console.log(`${String(k).padStart(2)} ${NAMES[k].padEnd(10)} ${String(W0[k]).padStart(5)} -> ${String(R[k]).padStart(5)}`);
  console.log('{ ' + R.join(', ') + ' }');
}

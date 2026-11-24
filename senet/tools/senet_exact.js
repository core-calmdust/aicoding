// senet/tools/senet_exact.js — セネトの終盤の厳密な勝率（2026-11-24、担当C：3Dレッスンの作り直しと検証）。
// 本体は senet_exact.c（種の局面から到達できる全局面＝全出目・全応手を数え上げて価値反復）。ここはそのコンパイルと一括の問い合わせ。
//   run(jobs)：jobs = [{ seed: s, qs: [{ s, n }] }] → 各 q に { v: 手番側の勝率, mv: { from: 指した側の勝率 } }（範囲外は null）
//   solveJS(s)：同じ計算の JavaScript 版（小さい局面だけ。C と senet/engine.js の一致の確認用）
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const E = require('../engine.js');
const P = [0, 4 / 16, 6 / 16, 4 / 16, 1 / 16, 1 / 16];
let BIN = null;
function bin() {
  if (BIN) return BIN;
  const src = path.join(__dirname, 'senet_exact.c'), out = path.join(os.tmpdir(), 'senet_exact_' + fs.statSync(src).mtimeMs.toFixed(0));
  if (!fs.existsSync(out)) cp.execFileSync('gcc', ['-O2', '-o', out, src, '-lm']);
  return (BIN = out);
}
const enc = s => { const t = s.turn || 0; return s.pos[t].filter(p => p < 31).join(',') + '/' + s.pos[1 - t].filter(p => p < 31).join(','); };
function lines(jobs) { const L = []; for (const j of jobs) { L.push('S ' + enc(j.seed)); for (const q of j.qs) L.push('Q ' + q.n + ' ' + enc(q.s)); } return L.join('\n') + '\n'; }
// 並列版：jobs を k 個の C に分けて同時に解く（Promise）
function runPar(jobs, k = 2) {
  const parts = Array.from({ length: k }, () => []); jobs.forEach((j, i) => parts[i % k].push(j));
  return Promise.all(parts.filter(p => p.length).map(p => new Promise((res, rej) => {
    const c = cp.spawn(bin()), out = [];
    c.stdout.on('data', d => out.push(d)); c.on('error', rej);
    c.on('close', code => { if (code) return rej(new Error('senet_exact ' + code)); parse(p, Buffer.concat(out).toString().split('\n')); res(); });
    c.stdin.end(lines(p));
  }))).then(() => jobs);
}
function run(jobs) {
  const lines = [];
  for (const j of jobs) { lines.push('S ' + enc(j.seed)); for (const q of j.qs) lines.push('Q ' + q.n + ' ' + enc(q.s)); }
  const out = cp.execFileSync(bin(), [], { input: lines.join('\n') + '\n', maxBuffer: 1 << 28 }).toString().split('\n');
  return parse(jobs, out);
}
function parse(jobs, out) {
  let k = 0;
  for (const j of jobs) {
    const h = out[k++].split(' '); j.size = +h[1];
    for (const q of j.qs) {
      const l = out[k++];
      if (l === 'X') { q.r = null; continue; }
      const [, cnt, v] = l.split(' '), mv = {};
      const c = +cnt || 1; for (let i = 0; i < c; i++) { const [, f, x] = out[k++].split(' '); mv[f] = +x; }
      q.r = { v: +v, mv };
    }
  }
  return jobs;
}
// 1局面の全合法手の勝率（その局面を種にして解く）
function movesOf(s, n) { const j = run([{ seed: s, qs: [{ s, n }] }])[0]; return j.qs[0].r; }
function solveJS(s0, max = 400000) {
  const idx = new Map(), ME = [], OP = [], TR = [], keyOf = (a, b) => a.filter(p => p < 31).sort((x, y) => x - y).join(',') + '/' + b.filter(p => p < 31).sort((x, y) => x - y).join(',');
  const add = (a, b) => { const k = keyOf(a, b); let i = idx.get(k); if (i === undefined) { i = ME.length; idx.set(k, i); ME.push(a.slice()); OP.push(b.slice()); } return i; };
  const tu = s0.turn || 0; add(s0.pos[tu], s0.pos[1 - tu]);
  for (let i = 0; i < ME.length; i++) {
    if (ME.length > max) return null;
    const s = { rule: s0.rule, pos: [ME[i], OP[i]], turn: 0, winner: -1 }, tr = [null];
    for (let n = 1; n <= 5; n++) {
      const ms = E.legalMoves(s, n), out = [];
      if (!ms.length) out.push(E.AGAIN(n) ? [i, 0, 0] : [add(OP[i], ME[i]), 1, 0]);
      for (const m of ms) { const r = E.apply(s, m, n), t = r.state; if (t.winner === 0) { out.push([-1, 0, 1]); continue; } out.push(r.again ? [add(t.pos[0], t.pos[1]), 0, 0] : [add(t.pos[1], t.pos[0]), 1, 0]); }
      tr.push(out);
    }
    TR.push(tr);
  }
  const N = ME.length, V = new Float64Array(N).fill(0.5), val = e => e[2] ? 1 : e[1] ? 1 - V[e[0]] : V[e[0]];
  for (let it = 0; it < 100000; it++) { let d = 0; for (let i = N - 1; i >= 0; i--) { let v = 0; for (let n = 1; n <= 5; n++) { let b = -1; for (const e of TR[i][n]) { const x = val(e); if (x > b) b = x; } v += P[n] * b; } d = Math.max(d, Math.abs(v - V[i])); V[i] = v; } if (d < 1e-12) break; }
  const get = (a, b) => V[idx.get(keyOf(a, b))];
  return { size: N, after(s, m, n) { const r = E.apply(s, m, n), t = r.state, me = s.turn; if (t.winner >= 0) return t.winner === me ? 1 : 0; return r.again ? get(t.pos[me], t.pos[1 - me]) : 1 - get(t.pos[1 - me], t.pos[me]); } };
}
module.exports = { run, runPar, movesOf, solveJS, enc, P };

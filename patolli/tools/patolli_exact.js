// patolli/tools/patolli_exact.js — パトリ（ベルの復元）の終盤の厳密な勝率（2026-11-24、担当C：3Dレッスンの作り直しと検証）。
// ベルの復元は取りがなく、勝ち＝先に6個上げること（宝・場は勝ち負けに関係しない）なので、局面＝両者の駒の位置と手番だけ。
// 駒は前にしか進まない（位置の合計が増える）ので、同じ位置で手番だけ入れかわる「パス」（0の目・動かせる駒がない）を
// 2元の連立方程式で解けば、到達できる全局面（全出目・全応手・腕の先のもう一度）を厳密に解ける（反復なし）。
// 本体は patolli_exact.c（同じ計算の C 版、gcc でその場でコンパイル）。ここはその一括の問い合わせと、
// patolli/engine.js の legalMoves・apply をそのまま使う JavaScript 版 solver（C と engine.js の一致の確認用、小さい局面だけ）。
//   run(qs, limit)：qs = [{ s, n }] → 各 q.r = { v: 手番側の勝率, mv: { 'from-to': 指した側の勝率 }, size }（解けなければ null）
//   solver(max) → { val(s): 手番側の勝率, after(s, m, n), moves(s, n): [{ m, v: 指した側の勝率 }]（良い順）, size }
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const E = require('../engine.js');
let BIN = null;
function bin() {
  if (BIN) return BIN;
  const src = path.join(__dirname, 'patolli_exact.c'), out = path.join(os.tmpdir(), 'patolli_exact_' + fs.statSync(src).mtimeMs.toFixed(0));
  if (!fs.existsSync(out)) cp.execFileSync('gcc', ['-O2', '-o', out, src]);
  return (BIN = out);
}
const enc = s => { const t = s.turn || 0; return s.pos[t].filter(p => p !== E.RULES.bell.goal).join(',') + '/' + s.pos[1 - t].filter(p => p !== E.RULES.bell.goal).join(','); };
function run(qs, limit) {
  const out = cp.execFileSync(bin(), limit ? [String(limit)] : [], { input: qs.map(q => 'Q ' + q.n + ' ' + enc(q.s)).join('\n') + '\n', maxBuffer: 1 << 28 }).toString().split('\n');
  let k = 0;
  for (const q of qs) {
    const l = out[k++]; if (l === 'X') { q.r = null; continue; }
    const [, cnt, v, size] = l.split(' '), mv = {};
    const c = +cnt || 1; for (let i = 0; i < c; i++) { const [, f, t, x] = out[k++].split(' '); mv[+f < 0 ? 'pass' : f + '-' + t] = +x; }
    q.r = { v: +v, mv, size: +size };
  }
  return qs;
}
const R = E.RULES.bell, G = R.goal;
const P = E.PROB, ST = E.STEPS;
function solver(max = 6e6) {
  const memo = new Map();
  const kOf = (a, b) => a.filter(p => p !== G).sort((x, y) => x - y).join(',') + '|' + b.filter(p => p !== G).sort((x, y) => x - y).join(',');
  const pad = a => { const o = a.filter(p => p !== G); while (o.length < R.pieces) o.push(G); return o; };
  // side 0 の位置 A、side 1 の位置 B → [side0 が投げるときの side0 の勝率, side1 が投げるときの side1 の勝率]
  function pair(A, B, dir) {
    const k = kOf(A, B); let v = memo.get(k); if (v) return v;
    if (memo.size > max) throw new Error('too big');
    const c = [0, 0], q = [0, 0];
    for (const t of [0, 1]) {
      const s = { rule: 'bell', pos: [pad(A), pad(B)], turn: t, winner: -1, gold: [16, 16], pool: 8, dir: dir || [1, 1], round: 1 };
      q[t] += P[0];
      for (let k2 = 1; k2 <= 5; k2++) {
        const n = ST[k2], ms = E.legalMoves(s, n);
        if (!ms.length) { q[t] += P[k2]; continue; }
        let b = -1; for (const m of ms) { const x = after(s, m, n); if (x > b) b = x; }
        c[t] += P[k2] * b;
      }
    }
    // x = c0 + q0 (1 - y),  y = c1 + q1 (1 - x)
    const x = (c[0] + q[0] - q[0] * c[1] - q[0] * q[1]) / (1 - q[0] * q[1]);
    const y = c[1] + q[1] * (1 - x);
    v = [x, y]; memo.set(k, v); return v;
  }
  function val(s) { if (s.winner >= 0) return s.winner === s.turn ? 1 : 0; return pair(s.pos[0], s.pos[1], s.dir)[s.turn]; }
  function after(s, m, n) {   // 指した側の勝率
    const me = s.turn, r = E.apply(s, m, n), t = r.state;
    if (t.winner >= 0) return t.winner === me ? 1 : 0;
    const v = pair(t.pos[0], t.pos[1], t.dir);
    return r.again ? v[me] : 1 - v[1 - me];
  }
  function moves(s, n) { return E.legalMoves(s, n).map(m => ({ m, v: after(s, m, n) })).sort((a, b) => b.v - a.v); }
  return { val, after, moves, get size() { return memo.size; } };
}
module.exports = { run, solver, enc, R };

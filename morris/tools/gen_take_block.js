// (2026-11-28 第2期 担当A) nine「はじめてのモリス」b_take・b_block の問題の候補を作る：置く時間のランダムな盤から、
// tools/lesson-verify-mmbasic.js と同じ条件（正解の集まり・エンジンの深さ9と10で正解20点・ほかは16点未満・重なりなし）を満たすものを選ぶ。
// node morris/tools/gen_take_block.js b_take|b_block [seed] [count] → JSON の候補（s, ok, best, d）
'use strict';
const path = require('path'), fs = require('fs');
const V = require(path.join(__dirname, '../../tools/lesson-verify-mmbasic.js'));
const { E, G, rv } = V.engine(), NO = E.NONE, id = process.argv[2], N = +(process.argv[4] || 400);
let sd = +(process.argv[3] || 1) >>> 0 || 1; const rnd = () => { sd ^= sd << 13; sd >>>= 0; sd ^= sd >>> 17; sd ^= sd << 5; sd >>>= 0; return sd / 4294967296; };
const millPts = (pos, side) => { const c = pos.clone(); c.side = side; const S = new Set(); for (const x of c.moves()) if (E.mRm(x) !== NO) S.add(E.mTo(x)); return S; };
const out = [];
for (let it = 0; it < N * 400 && out.length < N; it++) {
  const side = rnd() < 0.5 ? 1 : 2, p2 = 3 + Math.floor(rnd() * 4), p1 = side === 1 ? p2 : p2 + 1;
  if (p1 > 8 || p2 > 8) continue;
  const b = Array(24).fill(0), put = (v, k) => { while (k) { const i = Math.floor(rnd() * 24); if (!b[i]) { b[i] = v; k--; } } };
  put(1, p1); put(2, p2);
  // no standing mill on the board (a plain placing position)
  if (G.mills.some(ml => ml.every(i => b[i] === 1) || ml.every(i => b[i] === 2))) continue;
  const s = { b: b.join(''), h: [9 - p1, 9 - p2], side, quiet: 0 };
  const pos = E.Pos.from(G, s), me = side, o = 3 - me, ms = pos.moves(), my = millPts(pos, me), op = millPts(pos, o);
  const after = m => { const c = pos.clone(); c.play(m); return millPts(c, o).size; };
  const line2 = at => G.mills.some(ml => ml.includes(at) && ml.filter(i => i !== at).filter(i => pos.b[i] === o).length === 1 && ml.filter(i => i !== at).some(i => !pos.b[i]));
  let ok;
  if (id === 'b_take') {
    if (my.size !== 1 || op.size !== 1 || [...my].some(t => op.has(t))) continue;
    ok = ms.filter(m => E.mRm(m) !== NO && line2(E.mRm(m)) && after(m) === 0);
    if (!ok.length || ms.filter(m => E.mRm(m) !== NO && !ok.includes(m)).length < 3) continue;
    if (ms.some(m => E.mRm(m) !== NO && !ok.includes(m) && after(m) === 0)) continue;
  } else {
    if (my.size || op.size !== 1) continue;
    ok = ms.filter(m => op.has(E.mTo(m)) && after(m) === 0);
    if (ok.length !== 1) continue;
  }
  if (ok.length * 3 > ms.length) continue;
  let good = true;
  for (const D of [9, 10]) { const Vv = rv(s, D); if (!Vv) { good = false; break; }
    if (ok.some(m => V.ptsOf(E, Vv, m) < 20) || ms.some(m => !ok.includes(m) && V.ptsOf(E, Vv, m) >= 16)) { good = false; break; } }
  if (!good) continue;
  out.push({ s, ok, best: ok[0], d: ms.length / ok.length, n: p1 + p2 });
  console.log(JSON.stringify(out[out.length - 1]));
}


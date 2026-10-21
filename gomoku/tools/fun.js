// "Fun" score for 詰め連珠 (renju "win in N" puzzles), 0–100.
// A puzzle must be correct (unique first move, shortest win = N — checked by build-puzzles.js verify()) AND enjoyable:
//   • clean   30  no duals along the solution: after the key move the attacker's winning move is unique at every step
//                 (the settling move included); a puzzle you can solve "any way you like" after move 1 is flat
//   • key     25  the key move is not obvious: several plausible tries exist (other fours / threes), the key is not the
//                 move the engine's own ordering would try first, it is a quiet three rather than a four in VCT puzzles,
//                 it is not glued to the last move played, and it is not forced by an enemy four (= the only move)
//   • theme   15  the category's idea is actually needed: VCT → no VCF within N (threes are required) and a three is
//                 played; forbid → the defender's forbidden point is part of the solution (verified when mined);
//                 VCF → no shorter win with threes (verified when mined)
//   • economy 15  few irrelevant stones: share of stones on a line within 4 points of a solution move, and the total
//                 stone count against what N needs
//   • finale  10  a satisfying finish: the settling double threat uses stones played during the solution (a real
//                 combination), and the solution moves across the board instead of staying in one corner
//   • natural  5  a position that could come from a game: stone counts match the side to move, no huge pile of dead
//                 stones at the edge
// usage: node tools/fun.js [puzzles.json]            → distribution per category, best / worst samples
//        const { funScore } = require('./fun.js'); funScore(E, puzzle, catId, n) → { fun, parts }
//        (puzzle = { b, w, side, a, pv } as in puzzles.json)
'use strict';
const W = { clean: 30, key: 25, theme: 15, economy: 15, finale: 10, natural: 5 };
const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];

function funScore(E, P, cat, n, limit) {
  limit = limit || 2e6;
  const { sqOf, sqName, I2M, M2I, C } = E, N = 15;
  const B = P.b ? P.b.split(' ').map(sqOf) : [], Wt = P.w ? P.w.split(' ').map(sqOf) : [];
  const pos = E.setup('renju', { b: B, w: Wt, side: P.side });
  const me = pos.side, op = 3 - me;
  const pv = (P.pv || P.a).split(' ').map(sqOf);
  const key = pv[0];
  const S = new E.Solver(); S.limit = limit; S.foursOnly = cat === 'vcf';   // VCF puzzles: only fours count as moves
  const xy = m => [m % N, Math.floor(m / N)];

  // ---- key move
  const tries = [];
  for (let m = 0; m < 225; m++) { const i = M2I[m]; if (pos.b[i] === 0 && pos.cls[me][i] >= (cat === 'vcf' ? C.B4 : C.F3) && pos.cls[me][i] !== C.FIVE && (me === 2 || !pos.fb[i] || !pos.forbidIdx(i))) tries.push(i); }
  tries.sort((p, q) => pos.cls[me][q] - pos.cls[me][p] || pos.sc[me][q] - pos.sc[me][p]);
  let enemyFive = false; for (let m = 0; m < 225; m++) { const i = M2I[m]; if (pos.b[i] === 0 && pos.cls[op][i] === C.FIVE) enemyFive = true; }
  const ki = M2I[key], kcls = pos.cls[me][ki], rank = tries.indexOf(ki);
  const nTry = tries.length;
  const plaus = Math.min(1, Math.max(0, (nTry - 1) / 6));
  const notFirst = rank <= 0 ? .2 : rank === 1 ? .6 : rank === 2 ? .85 : 1;
  const quiet = (cat === 'vct' || cat === 'forbid') && n >= 3 ? (kcls === C.F3 || kcls === C.F33 ? 1 : .4) : .8;
  let near = 1;
  if (P.last) { const [a, b] = xy(sqOf(P.last)), [c, d] = xy(key); if (Math.max(Math.abs(a - c), Math.abs(b - d)) <= 1) near = .5; }
  let key01 = enemyFive ? .1 : (.3 * plaus + .35 * notFirst + .2 * quiet + .15 * near);

  // ---- clean: walk the principal variation, count the attacker's winning moves at every step after the key
  let steps = 0, uniq = 0, threes = (kcls === C.F3 || kcls === C.F33) ? 1 : 0, over = false;
  {
    let left = n; const made = [];
    for (let k = 0; k < pv.length; k++) {
      const m = pv[k];
      if (k % 2 === 0 && k > 0) {
        const al = S.attackList(pos, left).filter(e => e.need !== 0 && e.need <= left);
        if (S.nodes > S.limit) { over = true; break; }
        steps++; uniq += al.length <= 1 ? 1 : al.length === 2 ? .35 : 0;
        if (pos.cls[me][M2I[m]] === C.F3 || pos.cls[me][M2I[m]] === C.F33) threes++;
      }
      if (!pos.isLegal(m)) break;
      pos.make(m); made.push(m);
      if (k % 2 === 0) left -= 2;
    }
    for (let k = 0; k < made.length; k++) pos.unmake();
  }
  const clean = steps ? uniq / steps : 1;

  // ---- theme
  let theme = 1;
  if (cat === 'vct') {
    const SV = new E.Solver(); SV.foursOnly = true; SV.limit = limit;
    const t = SV.winIn(pos, n);
    theme = (t ? .25 : 1) * (threes ? 1 : .6);
  }

  // ---- economy: stones within 4 points (on one of the 4 lines) of a solution move
  const pvSet = new Set(pv), stones = B.concat(Wt);
  let rel = 0;
  for (const s of stones) {
    const [sx, sy] = xy(s); let ok = false;
    for (const m of pvSet) { const [mx, my] = xy(m), dx = sx - mx, dy = sy - my; if ((dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) && Math.max(Math.abs(dx), Math.abs(dy)) <= 4) { ok = true; break; } }
    if (ok) rel++;
  }
  const relShare = stones.length ? rel / stones.length : 1;
  const ideal = 8 + 2 * n, clutter = Math.max(0, Math.min(1, 1 - (stones.length - ideal) / 20));
  const economy = .65 * Math.max(0, Math.min(1, (relShare - .4) / .5)) + .35 * clutter;

  // ---- finale
  let finale;
  if (pv.length >= 3) {
    const fin = pv[pv.length - 1], [fx, fy] = xy(fin);
    const att = pv.filter((_, k) => k % 2 === 0 && k < pv.length - 1);
    let used = 0;
    for (const m of att) { const [mx, my] = xy(m), dx = mx - fx, dy = my - fy; if ((dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) && Math.max(Math.abs(dx), Math.abs(dy)) <= 4) used++; }
    const xs = pv.map(m => xy(m)[0]), ys = pv.map(m => xy(m)[1]);
    const spread = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    finale = .6 * Math.min(1, used / Math.max(1, Math.min(2, att.length))) + .4 * Math.min(1, spread / 5);
  } else {
    // one-move puzzles: a four-three / four-four point that is not the only threat on the board
    finale = Math.min(1, (kcls === C.F43 ? .7 : .6) + .3 * plaus);
  }

  // ---- natural
  const diff = B.length - Wt.length, want = me === 1 ? 0 : 1;
  let edge = 0; for (const s of stones) { const [x, y] = xy(s); if (x === 0 || y === 0 || x === 14 || y === 14) edge++; }
  const natural = Math.max(0, 1 - .25 * Math.abs(diff - want)) * Math.max(.4, 1 - edge / 8);

  const parts = { clean, key: key01, theme, economy, finale, natural };
  let fun = 0; for (const k in W) fun += W[k] * parts[k];
  return { fun: Math.round(fun), parts, over, tries: nTry, rank, stones: stones.length };
}

module.exports = { funScore, W };

if (require.main === module) {
  const E = require('../engine.js');
  const path = require('path');
  const file = process.argv[2] || path.join(__dirname, '..', 'puzzles.json');
  const D = require(path.resolve(file));
  const all = [];
  for (const C of D.cats) for (const L of C.levels) L.puzzles.forEach((P, j) => {
    const r = funScore(E, P, C.id, L.n);
    all.push({ key: C.id + '-' + L.n + '-' + j, cat: C.id, n: L.n, ...r });
  });
  const pct = (a, q) => a[Math.min(a.length - 1, Math.floor(q * a.length))];
  const by = {};
  for (const r of all) (by[r.cat + ':' + r.n] = by[r.cat + ':' + r.n] || []).push(r.fun);
  for (const k in by) { const a = by[k].sort((x, y) => x - y); console.log(k.padEnd(9), 'n', String(a.length).padStart(3), 'min', a[0], 'p25', pct(a, .25), 'med', pct(a, .5), 'p75', pct(a, .75), 'max', a[a.length - 1], '<70:', a.filter(x => x < 70).length); }
  const s = all.slice().sort((a, b) => a.fun - b.fun);
  const f = r => r.key + ' ' + r.fun + ' ' + Object.entries(r.parts).map(([k, v]) => k + '=' + v.toFixed(2)).join(' ') + ' tries=' + r.tries + ' rank=' + r.rank + ' st=' + r.stones;
  console.log('--- worst'); s.slice(0, 8).forEach(r => console.log(f(r)));
  console.log('--- best'); s.slice(-8).forEach(r => console.log(f(r)));
  console.log('total', all.length, 'below 70:', all.filter(r => r.fun < 70).length, 'mean', (all.reduce((a, r) => a + r.fun, 0) / all.length).toFixed(1));
  if (process.argv[3]) require('fs').writeFileSync(process.argv[3], JSON.stringify(all.map(r => ({ key: r.key, fun: r.fun, parts: r.parts }))));
}

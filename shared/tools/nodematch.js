// Node-equivalent matches for the strength of "twice the time" (common rule「最上位のレベルの追加」: the step size of the new
// timed top levels, measured on the 2-core work machine with node budgets instead of the clock).
// A = nkA thousand positions per move, B = nkB; both the one-thread search of the game's engine.js (strong steps' ladder:
// iterative deepening, stopped at the budget). Openings: a few plies of a mid level (seeded), each played twice with the
// colours swapped. Every side has its own engine copy (its own table).
//   node shared/tools/nodematch.js <game> <nkA> <nkB> <pairs> [workers=2] [seed=1]
//   → W/D/L of B against A and the Elo difference (± 1.96 σ)
'use strict';
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const RULES = { ugolki: 'c33', agon: 'std', konane: 's8' };
function engine(game) { const sb = { module: { exports: {} }, console }; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(ROOT, game, 'engine.js'), 'utf8'), sb); return sb.module.exports; }
if (isMainThread) {
  const [game, nkA, nkB, pairs] = [process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5] || 20];
  const NW = +process.argv[6] || 2, seed0 = +process.argv[7] || 1;
  let next = 0, w = 0, d = 0, l = 0, done = 0, plies = 0;
  const t0 = Date.now();
  const finish = () => {
    const n = w + d + l, s = (w + d / 2) / n, elo = -400 * Math.log10(1 / Math.min(0.999, Math.max(0.001, s)) - 1);
    const sd = Math.sqrt((w * (1 - s) ** 2 + l * s * s + d * (0.5 - s) ** 2) / n / n), lo = s - 1.96 * sd, hi = s + 1.96 * sd;
    const e = x => -400 * Math.log10(1 / Math.min(0.999, Math.max(0.001, x)) - 1);
    console.log(`${game} B ${nkB}k vs A ${nkA}k: +${w} =${d} -${l} (${n} games, ${(plies / n).toFixed(0)} plies avg, ${((Date.now() - t0) / 60000).toFixed(1)} min) score ${(s * 100).toFixed(1)}% Elo ${elo.toFixed(0)} [${e(lo).toFixed(0)}, ${e(hi).toFixed(0)}]`);
  };
  for (let i = 0; i < NW; i++) {
    const wk = new Worker(__filename, { workerData: { game, nkA, nkB } });
    const feed = () => { if (next < pairs) wk.postMessage(seed0 * 100000 + next++); else wk.terminate(); };
    wk.on('message', r => { for (const x of r) { if (x.res > 0) w++; else if (x.res < 0) l++; else d++; plies += x.plies; } if (++done === pairs) finish(); feed(); });
    feed();
  }
} else {
  const { game, nkA, nkB } = workerData, rule = RULES[game];
  const A = engine(game), B = engine(game), O = engine(game);
  for (const E of [A, B, O]) E.setRule(rule);
  A.LEVELS[30] = { s: 1, nk: nkA, ms: 600000 }; B.LEVELS[30] = { s: 1, nk: nkB, ms: 600000 };
  const play = (open, bFirst) => {   // → +1 B won, −1 A won, 0 draw
    const moves = open.slice();
    for (let ply = 0; ply < 400; ply++) {
      const { pos, hashes } = O.replay(null, moves);
      const st = O.judge(pos, hashes);
      if (st.over) { if (st.draw || !st.winner) return { res: 0, plies: ply }; const bSide = bFirst ? 1 : 2; return { res: st.winner === bSide ? 1 : -1, plies: ply }; }
      const toB = (pos.turn === 1) === bFirst, E = toB ? B : A;
      const r = E.think(null, moves, 30, Math.random, rule);
      if (r.move == null || r.move < 0) return { res: 0, plies: ply };
      moves.push(r.move);
    }
    return { res: 0, plies: 400 };
  };
  parentPort.on('message', seed => {
    let s = seed % 2147483646 + 1; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const open = [], k = 4 + Math.floor(rnd() * 5);
    for (let i = 0; i < k; i++) { const { pos } = O.replay(null, open); if (O.judge(pos).over) break; const r = O.think(null, open, 9, rnd, rule); if (r.move == null || r.move < 0) break; open.push(r.move); }
    parentPort.postMessage([play(open, true), play(open, false)]);
  });
}

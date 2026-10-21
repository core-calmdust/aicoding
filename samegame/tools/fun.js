// node samegame/tools/fun.js [--list] → 「面白さスコア」(0–100) for every stage puzzle in stages.json
//
// A stage is a "clear everything" puzzle. Being clearable is checked by the engine's solver (required);
// this score estimates how enjoyable it is for a human:
//   choice  25  several plausible first taps (initial groups >= 4) and more than one of them still leads
//               to a full clear (several strategies), but not every tap works (then nothing matters)
//   trap    25  thinking is needed: the naive "biggest group first" play fails, some first taps are dead ends,
//               random play rarely clears (difficulty itself is kept by the stage order, see r)
//   combo   20  satisfying build-ups: along a clearing line some tap removes a group bigger than any group
//               on the starting board (you merged colours), and one tap removes a big chunk of the board
//   gimmick 15  the theme's special block actually does something on the clearing line
//               (blast / line / prism cells, paint, thaw, rocks broken, wilds joined); plain themes get full marks
//   layout  15  clean, readable board: no single group that dominates the board, colours balanced,
//               not already half-solved (few tiny "orphan" cells is fine, huge blobs are not)
// The clearing line used for combo/gimmick is the best of the stored solution and solutions found from each
// solvable first tap. Everything is deterministic.
'use strict';
const E = require('../engine.js');
const { T, typ, col } = E;

function evalLine(b0, taps, min) {
  // taps: [[x,y], ...] → {maxG, maxN, fx}
  let b = b0, maxG = 0, maxN = 0, fx = 0;
  for (const [x, y] of taps) {
    const g = E.group(b, x, y); if (g.length < min) return null;
    const r = E.remove(b, g, { min });
    maxG = Math.max(maxG, g.length); maxN = Math.max(maxN, r.n);
    fx += r.removed.filter(z => z[3] === 'b' || z[3] === 'l' || z[3] === 'p').length + r.painted.length * (b.some(c => c.some(v => typ(v) === T.CHAM)) ? 0.2 : 1)
      + r.thawed.length + r.removed.filter(z => z[3] === 'r').length + 2 * g.filter(([gx, gy]) => typ(b[gx][gy]) === T.WILD).length;
    b = r.board;
  }
  return b.length ? null : { maxG, maxN, fx };
}

function fun(b, min, th, sol, opt = {}) {
  const budget = opt.budget || 25000;
  const cells = E.count(b);
  const gs = E.groups(b, min);
  const maxInit = Math.max(0, ...gs.map(g => g.cells.length));
  // first taps
  let ok = 0, unk = 0; const lines = [];
  if (sol) lines.push(sol);
  for (const g of gs) {
    const r = E.remove(b, g.cells, { min });
    const s = r.board.length ? E.solve(r.board, min, budget) : [];
    if (s === undefined) unk++;
    else if (s) { ok++; lines.push([g.cells[0], ...s]); }
  }
  const n = gs.length, okE = ok + unk * 0.5, frac = n ? okE / n : 0;
  // choice
  let choice = Math.min(1, (n - 1) / 4) * 10;                         // number of options
  choice += okE >= 3 ? 10 : okE >= 2 ? 7 : 0;                          // several workable starts
  choice += frac < 0.85 ? 5 : frac < 1 ? 2 : 0;                        // ...but not everything works
  // trap
  const greedy = E.greedyScore(b, min);
  let trap = greedy.left > 0 ? 10 : 0;
  trap += frac <= 0.7 ? 8 : frac < 1 ? 4 : 0;
  const r = opt.r != null ? opt.r / 1000 : E.playRate(b, min, 200, E.rng(E.hashStr(E.enc(b))));
  trap += r <= 0.35 ? 7 : r <= 0.5 ? 4 : 0;
  // combo / gimmick from the best clearing line
  let best = null;
  for (const L of lines) { const e = evalLine(b, L.map(v => Array.isArray(v) ? v : [v >> 4, v & 15]), min); if (e && (!best || e.maxG + e.fx * 0.5 > best.maxG + best.fx * 0.5)) best = e; }
  let combo = 0, gim = 0;
  if (best) {
    const gain = best.maxG - maxInit;
    combo = (gain >= 3 ? 12 : gain >= 2 ? 9 : gain >= 1 ? 5 : 0) + (best.maxN >= Math.max(6, cells * 0.18) ? 8 : best.maxN >= 5 ? 4 : 0);
    const special = b.some(c => c.some(v => typ(v) !== T.N));
    gim = !special ? 15 : best.fx >= 6 ? 15 : best.fx >= 3 ? 10 : best.fx >= 1 ? 5 : 0;
  }
  // layout
  let layout = 15;
  if (maxInit > cells * 0.3) layout -= 9; else if (maxInit > cells * 0.2) layout -= 4;
  const cnt = {}; for (const c of b) for (const v of c) { const t = typ(v); if (t !== T.ROCK && t !== T.WILD) cnt[col(v)] = (cnt[col(v)] || 0) + 1; }
  const cs = Object.values(cnt); if (cs.length) { const mx = Math.max(...cs), mn = Math.min(...cs); if (mx > mn * 3) layout -= 4; }
  if (n <= 2) layout -= 4;
  layout = Math.max(0, layout);
  const score = Math.round(choice + trap + combo + gim + layout);
  return { score, parts: { choice: Math.round(choice), trap, combo, gim, layout }, n, ok, unk, greedy: greedy.left, maxInit, best };
}
module.exports = { fun };

if (require.main === module) {
  const S = require('../stages.json');
  const all = [];
  for (const th of S.themes) th.stages.forEach((st, s) => st.p.forEach((p, i) => {
    const f = fun(E.dec(p.b), th.min, th.id, p.sol, { r: p.r });
    all.push({ th: th.id, s, i, r: p.r, ...f });
  }));
  const hist = {}; for (const a of all) { const k = Math.floor(a.score / 10) * 10; hist[k] = (hist[k] || 0) + 1; }
  console.log('hist', hist);
  for (const th of S.themes) { const a = all.filter(x => x.th === th.id); console.log(th.id, 'avg', Math.round(a.reduce((s, x) => s + x.score, 0) / a.length), '<70:', a.filter(x => x.score < 70).length); }
  if (process.argv.includes('--list')) for (const a of all) console.log(a.th, a.s, a.i, 'r' + a.r, a.score, JSON.stringify(a.parts), 'n' + a.n, 'ok' + a.ok, 'unk' + a.unk);
  if (process.argv.includes('--json')) require('fs').writeFileSync(process.argv[process.argv.indexOf('--json') + 1], JSON.stringify(all.map(({ best, ...a }) => a)));
}

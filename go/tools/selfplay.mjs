// Self-play matches between AI levels (the page's own worker code) to calibrate the strength levels.
//   node tools/selfplay.mjs <levelA|json> <levelB|json> [games=20] [size=19]
// A level may be a number (engine.js LEVELS) or a JSON params object, e.g. '{"T":0.5,"slip":0.02,"top":8}'.
import { createWorker } from './workerhost.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const R = require('../rules.js');
const [a0, b0, g0, n0] = process.argv.slice(2);
const parse = s => /^\d+$/.test(s) ? { level: +s } : { params: JSON.parse(s) };
const A = parse(a0), B = parse(b0), games = +(g0 || 20), n = +(n0 || 19), komi = R.defaultKomi(n, 'cn');
const W = await createWorker();
await W.call({ type: 'init', net: 'light' });
let wa = 0, wb = 0, tot = 0;
const t0 = Date.now();
for (let g = 0; g < games; g++) {
  const aBlack = g % 2 === 0, moves = [];
  let pos = R.Pos.from({ n }), passes = 0, winner = 0, why = '', adj = 0;
  // varied openings: the first 2 moves are random among the policy's top 6
  for (let k = 0; k < n * n * 2 && !winner; k++) {
    const side = pos.turn, me = (side === 1) === aBlack ? A : B;
    let m;
    if (k < 2) {
      const p = await W.call({ type: 'policy', spec: { n }, moves, komi, net: 'light' });
      const c = (p.list || []).filter(x => x.m >= 0).slice(0, 6);
      if (!c.length) { console.error('policy reply', JSON.stringify(p).slice(0, 300)); m = -1; } else m = c[Math.floor(Math.random() * c.length)].m;
    } else {
      const r = await W.call(Object.assign({ type: 'think', spec: { n }, moves, komi }, me));
      m = r.move;
    }
    const nx = pos.tryPlay(m); if (!nx) { m = -1; pos = pos.tryPlay(-1).pos; } else pos = nx.pos;
    moves.push(m);
    passes = m === -1 ? passes + 1 : 0;
    if (passes >= 2) break;
    // adjudicate clear games to save time
    if (k > n * n * 0.4 && k % 8 === 0) {
      const p = await W.call({ type: 'policy', spec: { n }, moves, komi, net: 'light' });
      const lead = p.lead * (pos.turn === 1 ? 1 : -1);
      if (Math.abs(lead) > (n >= 19 ? 25 : n >= 13 ? 15 : 9)) { if (++adj >= 2) { winner = lead > 0 ? 1 : 2; why = 'adj'; } } else adj = 0;
    }
  }
  if (!winner) {
    const tr = await W.call({ type: 'territory', spec: { n }, moves, komi, net: 'light' });
    const sc = R.score(pos, tr.dead, 'cn', komi);
    winner = sc.diff > 0 ? 1 : 2; why = 'score ' + sc.diff;
  }
  const aWon = (winner === 1) === aBlack;
  if (aWon) wa++; else wb++; tot++;
  process.stderr.write(`game ${g + 1}: ${aBlack ? 'A=B' : 'A=W'} ${moves.length} moves, ${aWon ? 'A' : 'B'} wins (${why})\n`);
}
const p = (wa + 0.5) / (tot + 1), elo = -400 * Math.log10(1 / p - 1);
console.log(JSON.stringify({ A: a0, B: b0, n, games: tot, wa, wb, eloA_minus_B: Math.round(elo), sec: Math.round((Date.now() - t0) / 1000) }));

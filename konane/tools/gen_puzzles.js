// Kōnane puzzles ("win in N": leave the opponent without a capture within N of your moves, the opponent defending with its
// most stubborn reply). Positions come from engine self-play on 8×8 (mixed levels, so the shapes vary); every candidate is
// solved exactly (engine.js duelMin / duelGood) and kept only when
//   - the side to move wins in exactly N (not faster), with 1 or 2 winning first moves out of at least 4 legal moves,
//   - the "obvious" move does not win: the move that leaves the opponent the fewest jumps right now (and, for N = 1, a
//     random legal move is wrong with probability ≥ 2/3),
//   - the solver needs few positions (the page re-solves while you play).
// Themes: w1 … w5 (win in 1 … 5), stop (the win stops a jump line early; going on loses), chain (the win is a double /
// triple jump; stopping after the first jump loses).
// node konane/tools/gen_puzzles.js [games] > konane/tools/pz_raw.jsonl ; then build_puzzles.js writes puzzles.json
const E = require('../engine.js');
E.setRule('s8');
const G = +(process.argv[2] || 400);
let seed = +(process.argv[3] || 1) >>> 0;
const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const seen = new Set();
let out = 0;
for (let g = 0; g < G; g++) {
  const moves = [], pos = E.Pos.from(null);
  const la = 4 + Math.floor(rnd() * 12), lb = 4 + Math.floor(rnd() * 12);
  // random opening removals and a couple of random jumps for variety
  for (let k = 0; k < 4; k++) { const L = pos.moves(); if (!L.length) break; const m = L[Math.floor(rnd() * L.length)]; pos.play(m); moves.push(m); }
  for (;;) {
    const L = pos.moves(); if (!L.length) break;
    const m = rnd() < 0.12 ? L[Math.floor(rnd() * L.length)] : E.think(null, moves, pos.turn === 1 ? la : lb, rnd).move;
    pos.play(m); moves.push(m);
    if (moves.length < 14) continue;
    const ms = pos.moves(); if (ms.length < 4) continue;
    const key = pos.h1 + ':' + pos.h2; if (seen.has(key)) continue; seen.add(key);
    const n = E.duelMin(null, moves, 5, 's8', 6e5);
    if (n < 1) continue;
    const good = E.duelGood(null, moves, n, 's8', 6e5);
    if (!good || !good.length || good.length > 2) continue;
    const me = pos.turn, op = 3 - me;
    // the greedy move: fewest opponent jumps right after it (ties: the longer jump)
    let gm = null, gs = 1e9;
    for (const m2 of ms) { const q = pos.clone().play(m2), sc = q.mobility(op) * 10 - E.hops(m2); if (sc < gs) { gs = sc; gm = m2; } }
    const greedyWins = good.includes(gm);
    // the theme
    const w = good[0], sameLine = ms.filter(x => E.mFrom(x) === E.mFrom(w) && E.path(pos, x)[1] === E.path(pos, w)[1] && x !== w);
    let theme = 'w' + n;
    const longerLoses = sameLine.some(x => E.hops(x) > E.hops(w) && !good.includes(x));
    const shorterLoses = sameLine.some(x => E.hops(x) < E.hops(w) && !good.includes(x));
    const tags = [];
    if (longerLoses) tags.push('stop');
    if (E.hops(w) >= 2 && shorterLoses) tags.push('chain');
    if (greedyWins && !tags.length) continue;          // too easy: the move that leaves the fewest jumps wins
    if (n === 1 && good.length * 3 > ms.length) continue;
    // solving cost check (what the page does on every move)
    const t0 = Date.now(); E.duelGood(null, moves, n, 's8', 2e6); const ms0 = Date.now() - t0;
    if (ms0 > 900) continue;
    const sp = pos.spec();
    process.stdout.write(JSON.stringify({ s: { b: sp.b, side: sp.side }, n, good: good.map(x => E.name(pos, x)), nm: ms.length, theme, tags, greedy: greedyWins ? 1 : 0, ms: ms0, stones: pos.count(1) + pos.count(2) }) + '\n');
    out++;
  }
  if (g % 20 === 0) process.stderr.write(`game ${g} kept ${out}\n`);
}
process.stderr.write(`done ${out}\n`);

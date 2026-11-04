// Two-player puzzles for Ugolki ("win in N" — the opponent moves too and defends as well as it can).
// Positions come from AI self-play games (classic 3x3, real move counts so the 40 / 80-move rules apply). Each one is
// solved exactly with the engine's duel solver: the side to move forces a win in N of its moves (N ≥ 2), exactly ONE first
// move does it, and the obvious move (the biggest step towards the corner) does not — so every puzzle has a trap.
// Output: JSON lines on stdout ({s, n, a, f}) — node tools/gen_duel.js <seed> <games> > out.jsonl
const E = require('../engine.js');
E.setRule('c33');
let seed = +(process.argv[2] || 777) >>> 0;
const GAMES = +(process.argv[3] || 200);
const rand = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const HOMEL = E.HOMEL(), DIST = E.DIST();
const tgt = p => E.target(p);
const outside = (pos, p) => HOMEL[p].length - pos.inTarget(p);
const seen = new Set();
function greedy(pos) {   // the natural move: enter the corner if possible, else the biggest step towards it
  const me = pos.turn, T = tgt(me), D = DIST[me];
  let best = null, bg = -1e9;
  for (const m of pos.moves()) {
    const f = E.mFrom(m), t = E.mTo(m);
    const g = (T[t] && !T[f] ? 100 : 0) + (D[f] - D[t]) * 3 - (T[f] ? 50 : 0);
    if (g > bg) { bg = g; best = m; }
  }
  return best;
}
function features(pos, m) {
  const me = pos.turn, opp = 3 - me, path = E.path(pos, m), f = {};
  let overOpp = 0;
  for (let i = 1; i < path.length; i++) { const a = path[i - 1], b = path[i]; const [r0, c0] = E.RC[a], [r1, c1] = E.RC[b]; if (Math.max(Math.abs(r0 - r1), Math.abs(c0 - c1)) === 2) { const mid = E.sqAt((r0 + r1) / 2, (c0 + c1) / 2); if (pos.owner(mid) === opp) overOpp++; } }
  if (overOpp) f.ladder = overOpp;
  if (path.length >= 4) f.chain = path.length - 1;
  let blk = 0; const T = tgt(me); for (let i = 0; i < 64; i++) if (T[i] && pos.owner(i) === opp) blk++;
  if (blk) f.block = blk;
  f.oppOut = outside(pos, opp); f.out = outside(pos, me);
  return f;
}
let made = 0;
for (let g = 0; g < GAMES; g++) {
  const lv = [6 + Math.floor(rand() * 6), 6 + Math.floor(rand() * 6)];
  const moves = [];
  let pos = E.Pos.from(null);
  for (let ply = 0; ply < 170; ply++) {
    const st = E.judge(pos); if (st.over) break;
    // a candidate position?
    if (ply >= 44) {
      const me = pos.turn, o = outside(pos, me), oo = outside(pos, 3 - me);
      const key = pos.spec().b + pos.side;
      if (o >= 2 && o <= 5 && oo <= o + 2 && !seen.has(key)) {
        seen.add(key);
        const nmin = E.duelMin(null, moves, 5, 'c33', 4e5);
        if (nmin >= 2) {
          const good = E.duelGood(null, moves, nmin, 'c33', 2e6);
          const legal = pos.moves().length;
          if (good && good.length >= 1 && good.length <= 2 && legal >= 6) {
            const gm = greedy(pos);
            if (!good.includes(gm)) {
              const f = features(pos, good[0]);
              // the obvious move: what happens (a draw by the last move, or the opponent wins / gets out)
              const sp = pos.spec();
              process.stdout.write(JSON.stringify({ s: { b: sp.b, side: sp.side, n: sp.n }, n: nmin, a: good[0], alt: good.length, g: gm, legal, f }) + '\n');
              made++;
            }
          }
        }
      }
    }
    const r = E.think(null, moves, lv[ply & 1], rand, 'c33');
    if (r.move < 0 || r.move === undefined) break;
    moves.push(r.move); pos.play(r.move);
  }
  process.stderr.write(`game ${g + 1}/${GAMES} plies ${moves.length} puzzles ${made}\n`);
}

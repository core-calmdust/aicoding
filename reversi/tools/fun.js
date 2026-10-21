// "Fun" score (0–100) for reversi endgame puzzles (詰めオセロ).
// A puzzle in puzzles.json is already *correct* (verify.js: exactly one first move reaches the goal against perfect defence).
// This score measures whether it is also *enjoyable* for a human:
//   choice   15  several first moves to consider (2 legal moves = a coin flip; 5+ = a real search; scaled for tiny boards)
//   tries    10  some wrong first moves come close (within 12 discs of the goal), so there are several tempting tries
//   surprise 25  the key move is not what a quick look plays: not the 2-ply favourite, not the biggest flip,
//                not a free corner grab; bonus for a quiet move or an X/C-square sacrifice
//   depth    20  the "aha" continues: later turns of the main line where a wrong move would still spoil it,
//                and tempo tricks (opponent forced to pass); a few easy free moves are fine, but a one-shot puzzle
//                with a forced trivial tail scores low here. Very small boards (e <= 4) need only one such moment.
//   goal     15  a natural goal and a satisfying finish: plain win / draw / wipe-out beat "win by exactly N";
//                comebacks from behind, close finishes and wipe-outs are dramatic
//   subtle   15  the best wrong move fails by only a little (2 discs = full marks, 18+ discs short = none)
// Scale: the 2026-10 set has median ~73; puzzles at 60-69 are still multi-trap puzzles whose key move is merely the
// 2-ply favourite, while < 60 are coin flips, "every move wins big" margins or one-shot puzzles with a forced tail.
// So the replacement threshold is 60 (refresh_fun.js MIN) and new puzzles must score >= 70 (TARGET).
// usage: const { funScore } = require('./fun.js'); funScore(E, cells:number[64], toMove, goal?) -> { fun, parts, A }
//        node fun.js [puzzles.json] [out.jsonl]   -> scores every puzzle (resumable), prints a distribution per level
'use strict';
const { legal, play } = require('./eng-lite.js');
const { analyse, exact, meets } = require('./feat.js');
const CORNERS = [0, 7, 56, 63];
const clamp = x => Math.max(0, Math.min(1, x));

// player turns after the first move along the exact main line: how many still contain a losing option
function laterTraps(E, cells, s, pv, goal) {
  let c = cells.slice(), side = s, traps = 0, free = 0, forced = 0, turns = 0;
  pv.forEach((m, i) => {
    if (m < 0) { side = 3 - side; return; }
    if (i > 0 && side === s) {
      const ms = legal(c, side); turns++;
      if (ms.length < 2) forced++;
      else {
        const sc = exact(E, c, side), bad = sc.filter(x => !meets(goal, Math.round(x.score))).length;
        if (bad) traps++; else free++;
      }
    }
    c = play(c, m, side); side = 3 - side;
  });
  return { traps, free, forced, turns };
}

function funScore(E, cells, s, goal) {
  E.clearTT();
  const A = analyse(E, cells, s);
  if (!A || (goal && JSON.stringify(A.goal) !== JSON.stringify(goal))) return { fun: 0, parts: {}, A };
  const T = laterTraps(E, cells, s, A.pv, A.goal);
  return Object.assign(funFrom(A, T), { A, T });
}
// pure part: A = feat.js analyse() result, T = laterTraps() result
function funFrom(A, T) {
  const F = A.F, g = A.goal, nm = F.nm;
  const thr = g.type === 'wipe' ? 64 : g.type === 'margin' ? g.value : g.type === 'draw' ? 0 : 2;   // smallest result that meets the goal
  const wrong = Object.entries(A.scores).filter(([m]) => +m !== A.sol).map(([, v]) => v);
  const choice = F.e <= 2 ? 0 : clamp((nm - 2) / Math.min(3, F.e - 1));
  const tempting = wrong.filter(v => v >= thr - 12).length;          // wrong first moves that come close
  const tries = clamp(tempting / 2);
  const cornerGrab = F.solCorner && F.cornerMoves === 1;
  const surprise = clamp((F.shRank > 0 ? 0.4 : 0) + 0.2 * F.shRank / Math.max(1, nm - 1)
    + (F.fsol < F.maxF ? 0.15 : 0) + (cornerGrab ? 0 : 0.15)
    + ((F.fsol === F.minF && F.maxF > F.minF) || F.solX || F.solC ? 0.1 : 0));
  const need = F.e <= 4 ? 1 : 2;
  const depth = clamp(Math.min(1, T.traps / need) * 0.85 + (F.passes > 0 ? 0.3 : 0) - (T.free + T.forced > 4 && !T.traps ? 0.2 : 0));
  const comeback = F.mine * 10 <= (F.mine + F.theirs) * 3.5;
  const drama = g.type === 'wipe' || comeback ? 1 : (g.type === 'win' && F.best <= 4) || g.type === 'draw' ? 0.8 : 0.4;
  const goalP = (g.type === 'margin' ? 0.7 : 1) * 0.6 + drama * 0.4;
  const subtle = clamp(1 - (thr - F.second - 2) / 16);              // best wrong move fails by only a little
  const parts = { choice, tries, surprise, depth, goal: goalP, subtle };
  const fun = Math.round(Object.keys(W).reduce((a, k) => a + W[k] * parts[k], 0));
  return { fun, parts: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, Math.round(v * 100) / 100])) };
}
const W = { choice: 15, tries: 10, surprise: 25, depth: 20, goal: 15, subtle: 15 };
module.exports = { funScore, funFrom, laterTraps, W };

if (require.main === module) {
  const fs = require('fs'), path = require('path'), zlib = require('zlib');
  const DIR = path.join(__dirname, '..');
  const raw = zlib.gunzipSync(fs.readFileSync(path.join(DIR, 'weights.bin.gz')));
  const E = require(path.join(DIR, 'engine.js')); E.setWeights(new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2), 30);
  const d = JSON.parse(fs.readFileSync(process.argv[2] || path.join(DIR, 'puzzles.json')));
  const out = process.argv[3];
  const done = new Map(out && fs.existsSync(out) ? fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).map(l => { const r = JSON.parse(l); return [r.id, r]; }) : []);
  const [mod, rem] = (process.env.SHARD || '1/0').split('/').map(Number);
  let n = 0;
  for (const L of d.levels) L.puzzles.forEach((p, i) => {
    const id = L.id + ':' + i; if (n++ % mod !== rem) return;
    if (done.has(id)) return;
    const r = funScore(E, p.cells.split('').map(Number), p.toMove, p.goal);
    const row = { id, fun: r.fun, parts: r.parts, T: r.T, e: p.e, D: p.D, A: r.A && { goal: r.A.goal, sol: r.A.sol, F: r.A.F, scores: r.A.scores } };
    done.set(id, row); if (out) fs.appendFileSync(out, JSON.stringify(row) + '\n');
  });
  if (!process.env.SHARD) for (const L of d.levels) {
    const f = L.puzzles.map((_, i) => (done.get(L.id + ':' + i) || {}).fun).filter(x => x != null).sort((a, b) => a - b);
    if (f.length) console.log(L.id.padEnd(11), 'n', f.length, 'min', f[0], 'med', f[f.length >> 1], 'max', f[f.length - 1], '<70', f.filter(x => x < 70).length);
  }
}

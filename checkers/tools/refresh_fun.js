// One-off (2026-10-21): replace puzzles whose fun score (tools/fun.js) is below MIN with mined candidates of the
// same theme, goal and move count, verified by the engine exactly like the original set (tools/pzgen.c candidates:
// unique first move at the minimal length; build_puzzles.py filters: the answer is the engine's (near-)best move and
// the side is not losing; fun.js re-checks uniqueness and the answer with engine puzzle()).
// Each slot gets the unused candidate closest in build_puzzles.py's difficulty measure (ties → more fun), so a theme
// still goes easy → hard. Slots never move: the previous puzzle goes to P.old["<themeId>-<j>"] (the app's record key),
// and the app keeps it for players who already had a record for the slot and for daily puzzles dated <= P.cut.
// candidates: pzgen output (JSON lines), e.g.
//   EGDB=egdb4.bin pzgen eg <seed> <count> 5        (win2..win5, emen)    pzgen eg <seed> <count> 1   (win1)
//   EGDB=egdb4.bin KINGS=1 NPMIN=4 NPMAX=5 pzgen eg <seed> <count> 5     (ekings)
//   native gen <games> 2 0 pos.bin evalnet.bin <seed>; pzgen pos pos.bin 0 <count> 0 3   (shot2, shot3, shot22)
// usage: node tools/refresh_fun.js cand1.jsonl [cand2.jsonl ...]     (deterministic; refuses to run twice)
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const { funScore } = require('./fun.js');
const CUT = '2026-10-21', MIN = 60, TARGET = 66;
(async () => {
  const K = await require('./wasm.js').load();
  const file = process.env.PZ_FILE || path.join(__dirname, '..', 'puzzles.json');   // PZ_FILE: dry run on a copy
  const D = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (D.old) { console.error('already refreshed'); process.exit(1); }
  const cands = [];
  for (const f of process.argv.slice(2)) for (const l of fs.readFileSync(f, 'utf8').split('\n')) if (l.trim()) cands.push(JSON.parse(l));
  const keyOf = (b, side) => b + side;
  const used = new Set(); for (const T of D.themes) for (const P of T.puzzles) used.add(keyOf(P.s.b, P.s.side));
  const okVal = x => (x.va || 0) >= (x.vb || 0) - 25 && (x.va || 0) > -150;
  const kingsOnly = x => !/[bw]/.test(x.b), hasMen = x => /[bw]/.test(x.b);
  const fit = {
    win1: x => x.src === 'eg' && x.n === 1 && x.moves >= 3, win2: x => x.src === 'eg' && x.n === 2, win3: x => x.src === 'eg' && x.n === 3,
    win4: x => x.src === 'eg' && x.n === 4, win5: x => x.src === 'eg' && x.n === 5,
    shot2: x => x.src === 'pos' && x.g === 1 && x.n === 2, shot3: x => x.src === 'pos' && x.g === 1 && x.n === 3, shot22: x => x.src === 'pos' && x.g === 2,
    ekings: x => x.src === 'eg' && kingsOnly(x) && x.n >= 2 && x.pieces >= 4, emen: x => x.src === 'eg' && hasMen(x) && x.n >= 3,
  };
  // build_puzzles.py's difficulty (without its random jitter)
  const diff = (n, moves, cap1, pieces) => n * 10 + Math.min(moves, 12) * .6 + (cap1 ? 0 : 2) + pieces * .15;
  const diffP = P => { const p = E.Pos.from(P.s), L = p.moves(), m = P.answer; return diff(P.n, L.length, E.mCap(m) ? 1 : 0, E.popc(p.b | p.w)); };
  const toP = x => ({ s: { b: x.b, side: x.side }, n: x.n, answer: x.f + 32 * x.t + 1024 * x.cap, ...(x.g ? { g: x.g } : {}) });

  D.old = {}; D.cut = CUT; D.version = (D.version || 1) + 1;
  const report = {}, t0 = Date.now();
  // scarce themes pick first (the endgame themes share their candidates with win2..win5)
  const PRI = { ekings: 0, emen: 1, win1: 2, shot22: 3 };
  for (const T of [...D.themes].sort((a, b) => (PRI[a.id] ?? 9) - (PRI[b.id] ?? 9))) {
    const scores = T.puzzles.map(P => funScore(K, P, T).fun);
    const jobs = T.puzzles.map((P, j) => ({ j, P, fun: scores[j], d: diffP(P) })).filter(x => x.fun < MIN);
    // the pool: fitting, sound, unused, fun enough (scored lazily, only for the move counts needed)
    const needN = new Set(jobs.map(x => x.P.n)), pool = [];
    for (const x of cands) {
      if (!fit[T.id](x) || !needN.has(x.n) || !okVal(x) || used.has(keyOf(x.b, x.side))) continue;
      const P = toP(x), r = funScore(K, P, T);
      if (!r.sound || r.fun < TARGET) continue;
      pool.push({ P, key: keyOf(x.b, x.side), fun: r.fun, d: diff(x.n, x.moves, x.cap1, x.pieces) });
    }
    let done = 0;
    for (const job of jobs.sort((a, b) => a.d - b.d)) {
      let best = -1, bc = 1e9;
      pool.forEach((c, k) => { if (c.P.n !== job.P.n || used.has(c.key)) return; const cost = Math.abs(c.d - job.d) - c.fun * .05; if (cost < bc) { bc = cost; best = k; } });
      if (best < 0) continue;
      const [c] = pool.splice(best, 1); used.add(c.key);
      D.old[T.id + '-' + job.j] = job.P; T.puzzles[job.j] = c.P; done++;
    }
    report[T.id] = { replaced: done, below: jobs.length, total: T.puzzles.length, poolLeft: pool.filter(c => !used.has(c.key)).length, after: T.puzzles.map(P => funScore(K, P, T).fun).filter(f => f < MIN).length };
    console.log(T.id, JSON.stringify(report[T.id]), ((Date.now() - t0) / 1000 | 0) + 's');
  }
  fs.writeFileSync(file, JSON.stringify(D, null, 0).replace(/^\{/, '{'));
  console.log('replaced', Object.keys(D.old).length);
})();

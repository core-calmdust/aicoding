// Builds alquerque/puzzles.json (PZBook v2 data, read by fanorona/app.js on the Alquerque page; rule 'alq' = Bell's rules).
// "Win in N" from sparse positions and endgames, "win g pieces in N" from positions of engine games. Every puzzle:
//   • exact: the first right move is unique and the goal is reached in exactly N own moves against every defence
//     (the engine's exhaustive search fanorona/engine.c puzzle(); the endgame tables alqeg.bin.gz for 6 pieces or fewer)
//   • fun ≥ 70 (tools/fun.js, claude/puzzle-fun-score.md), the best of 3× the need or more
//   • not "one move in disguise" (Step / Tac themes): along the main line (the defender's most stubborn reply) every later own
//     move of ours that is not forced (2+ legal moves) has few right moves (≤ 1/3 of them), and at least one later own move
//     is a real choice — or the defender has 3+ replies after the key move. (Alquerque's compulsory captures leave few legal
//     moves, so the common "15% / 3 replies" test is read this way here; see claude/alquerque-spec.md)
// node tools/gen_puzzles.js [perTheme]   (run from anywhere; ~10 min)
'use strict';
const fs = require('fs'), path = require('path');
const A = require('./alqlib.js'), { funScore } = require('./fun.js');
const PER = +(process.argv[2] || 30), FUN = 70, MINE = 3;
(async () => {
  const E = await A.init();
  const rand = A.rng(20261114);
  const t0 = Date.now(), log = (...a) => console.error(...a, ((Date.now() - t0) / 1000 | 0) + 's');
  const lead = (pos, p) => pos.count(p) - pos.count(3 - p);
  const solve = (spec, moves, n, goal, defend, base) => E.puzzle(spec, moves, n, defend ? 1 : 0, goal || 0, base || 0) || [];
  function unique(spec, N, goal) {
    const L = solve(spec, [], N, goal); if (L.length < 2) return null;
    if (L.some(e => e.need < 0)) return null;
    const ok = L.filter(e => e.need > 0); if (!ok.length) return null;
    const n = Math.min(...ok.map(e => e.need)); if (n !== N) return null;
    const best = ok.filter(e => e.need === n); if (best.length !== 1) return null;
    return { n, answer: best[0].m };
  }
  // the main line after the key move: is every later own move a real (non-free) choice?
  function lineOk(spec, ans, N, goal) {
    const p0 = E.Pos.from(spec), att = p0.turn, base = lead(p0, att);
    let moves = [ans], left = N - 1, choices = 0, defMax = 0;
    while (left > 0) {
      const { pos } = E.replay(spec, moves); if (pos.status() !== 0) break;
      const R = solve(spec, moves, left, goal, true, base);          // per defender reply: own moves still needed
      if (!R.length || R.some(e => e.need <= 0)) return false;       // (the line must stay forced)
      if (moves.length === 1) defMax = R.length;
      const worst = R.slice().sort((a, b) => b.need - a.need)[0];
      moves = moves.concat(worst.m);
      const q = E.replay(spec, moves).pos; if (q.status() !== 0) break;
      const g2 = goal ? Math.max(1, goal - (lead(q, att) - base)) : 0;
      const L = solve(spec, moves, left, g2);
      const good = L.filter(e => e.need > 0 && e.need <= left);
      if (!good.length) return false;
      if (L.length >= 2) { if (good.length * 3 > L.length) return false; choices++; }
      moves = moves.concat(good.sort((a, b) => a.need - b.need)[0].m); left--;
    }
    return choices >= 1 || defMax >= 3;
  }
  const seen = new Set(), themes = [];
  // mine candidates (next() → a candidate or null when the source is used up) until `need` of them score fun ≥ 70 and at
  // least 3× `need` were looked at; keep the best `need`
  function pick(id, grp, goal, g, next, need) {
    const good = []; let n = 0;
    for (let P; (good.length < need || n < need * MINE) && (P = next()); n++) {
      P.f = funScore(E, Object.assign({ g }, P), !!goal).fun;
      if (P.f >= FUN) good.push(P);
    }
    good.sort((a, b) => b.f - a.f);
    const out = good.slice(0, need).map(P => { seen.add(P.s.b); const o = { s: P.s, n: P.n, answer: P.answer }; if (goal) o.g = g; return o; });
    // easier first: fewer own moves, then fewer legal moves
    out.sort((a, b) => a.n - b.n || E.Pos.from(a.s).moves().length - E.Pos.from(b.s).moves().length);
    log(id, 'looked at', n, 'fun≥' + FUN, good.length, 'kept', out.length);
    return { id, grp, goal: goal ? 'gain' : 'win', g: goal ? g : 0, puzzles: out };
  }
  // ---- win in N from sparse positions (no "win in 1": it cannot reach fun 70 — the lessons' 勝ちを決める covers it)
  function winCands(N, att, def, line, tries) {
    const local = new Set(); let k = 0;
    return () => {
      while (k++ < (tries || 3000000)) {
        const side = rand() < 0.7 ? 1 : 2;
        const na = att[0] + Math.floor(rand() * (att[1] - att[0] + 1)), nd = def[0] + Math.floor(rand() * (def[1] - def[0] + 1));
        const spec = side === 1 ? A.randomPos(rand, na, nd, 1) : A.randomPos(rand, nd, na, 2);
        if (seen.has(spec.b) || local.has(spec.b)) continue;
        const pos = E.Pos.from(spec); if (pos.status() !== 0) continue;
        const r = unique(spec, N, 0); if (!r) continue;
        if (line && N >= 2 && !lineOk(spec, r.answer, N, 0)) continue;
        local.add(spec.b); return { s: spec, n: N, answer: r.answer };
      }
      return null;
    };
  }
  themes.push(pick('step2', 'Step', 0, 0, winCands(2, [2, 6], [2, 5], true), PER));
  themes.push(pick('step3', 'Step', 0, 0, winCands(3, [2, 5], [2, 4], true), PER));
  // ---- material: middlegame-like positions (4–8 pieces each; engine games give too few quiet wins of material, since a
  //      capture usually starts a long compulsory exchange)
  function gainCands(N, G, test) {
    const local = new Set(); let k = 0;
    return () => {
      while (k++ < 4000000) {
        const spec = A.randomPos(rand, 4 + Math.floor(rand() * 5), 4 + Math.floor(rand() * 5), rand() < 0.7 ? 1 : 2);
        if (seen.has(spec.b) || local.has(spec.b)) continue;
        const pos = E.Pos.from(spec); if (pos.status() !== 0 || pos.moves().length < 3) continue;
        if (test && !test(pos, null)) continue;
        const r = unique(spec, N, G); if (!r) continue;
        if (test && !test(pos, r)) continue;
        if (N >= 2 && !lineOk(spec, r.answer, N, G)) continue;
        local.add(spec.b); return { s: spec, n: N, answer: r.answer };
      }
      return null;
    };
  }
  const capN = (pos, m) => A.capN(E, pos, m);
  // the right route: of the jumps on offer, the one that wins material once the dust settles (not simply the longest)
  themes.push(pick('route', 'Tac', 1, 1, gainCands(1, 1, pos => pos.hasCaps()), PER));
  // sacrifice: a quiet move that hands over a piece (captures are compulsory), then a bigger capture back
  themes.push(pick('sac', 'Tac', 1, 1, gainCands(2, 1, (pos, r) => !pos.hasCaps() && (!r || pos.clone().play(r.answer).hasCaps())), PER));
  // two and three moves deep
  themes.push(pick('gain2', 'Tac', 1, 2, gainCands(2, 2), PER));
  themes.push(pick('gain3', 'Tac', 1, 2, gainCands(3, 2), PER));
  // ---- endgames: longer wins with few pieces (the endgame tables make them exact)
  themes.push(pick('end4', 'End', 0, 0, winCands(4, [2, 4], [1, 2]), PER));
  themes.push(pick('end5', 'End', 0, 0, winCands(5, [2, 4], [1, 2]), PER));
  const T = themes.filter(t => t.puzzles.length >= 6);
  fs.writeFileSync(path.join(__dirname, '..', 'puzzles.json'), JSON.stringify({ version: 1, daily: T.map(t => t.id), themes: T }));
  log('written', T.map(t => t.id + ':' + t.puzzles.length).join(' '));
})();

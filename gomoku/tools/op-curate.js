// The 5 practice problems of a renju opening (珠型) that pass the strict checks (2026-11-24 第2期・担当B, claude/lesson-quality.md):
// positions OFF the study line (a move other than the line's at plies 3–11, then 0–7 of the engine's best moves, the second best at the second), each read three
// times — the JavaScript search at depth 8 (sc: the values the 2D / 3D scoring uses) and depth 6 (sc2), and the core with the learned
// renju net at depth 6 (nb: its best) — kept when the three agree on one best move, every other candidate scores 12 points or less
// in both reads (gomoku/app.js problemPoints), at least 3 others are candidates, the game is not decided (|v| < WINT), the position is
// at least 4 stones from every other gomoku position (lessons, warm-ups, puzzles, every opening's study line and problems, the 8
// symmetries and shifts — tools/lesson-verify.js gomokuOpen), no answer used twice and no kind of answer more than twice.
// The 5 are stored easy → hard (diff: the other candidates scoring 4+ points, then the stones).
//   node gomoku/tools/op-curate.js <id,id…>        (writes gomoku/openings.json: verified: true, problems = the 5)
'use strict';
const fs = require('fs'), path = require('path');
const OUT = process.env.GM_OUT || path.join(__dirname, '..', 'openings.json');   // GM_OUT: a copy to write (two runs in parallel)
const ids = (process.argv[2] || '').split(',').filter(Boolean);
const N = require('./op-engine.js');           // the core + net (its own copy of the engine module)
delete require.cache[require.resolve('../engine.js')];
const E = require('../engine.js');              // a fresh copy: the JavaScript search without the learned weights (the stored scale)
const { sqName, sqOf, WINT } = E;
const read = (moves, d) => { const pos = E.replay('renju', moves), X = new E.Engine(); return X.rootList(pos, 1e9, null, 24, d).list.map(e => [sqName(e.m), e.v]).sort((a, b) => b[1] - a[1]); };
const netBest = moves => { const r = N.read(moves, 6, 40).list.sort((a, b) => b.v - a.v); return r.length ? sqName(r[0].m) : null; };
const WHYS = {}, WHY = f => { const k = f[0].replace(/ .*/, '') + ' ' + (f[0].match(/^\S+ (\S+ \S+)/) || ['', ''])[1]; WHYS[k] = (WHYS[k] || 0) + 1; };
const O = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const V = require('../../tools/lesson-verify-gmopen.js'), G = { check: V.check, diff: V.diff, probOf: V.probOf, kind: V.kindOf, dist: (a, b) => V.distS(V.stonesOf(a), V.stonesOf(b)) };
for (const id of ids) {
  const g = O.sets.find(x => x.id === id); if (!g) { console.log('no set', id); continue; }
  const line = g.study.map(x => sqOf(x[0])), t0 = Date.now(), cands = [], seen = new Set();
  for (let k = 3; k <= Math.min(11, line.length - 1); k++) {
    const pre = line.slice(0, k), first = read(pre, 4).filter(e => e[0] !== sqName(line[k]) && Math.abs(e[1]) < WINT).slice(0, 4);
    for (const [alt] of first) for (const br of [0, 1]) {
      let mv = pre.concat(sqOf(alt));
      for (let extra = 0; extra <= 7; extra++) {
        if (extra) { const r = read(mv, 4).filter(e => Math.abs(e[1]) < WINT); const e = r[extra === 2 && br ? 1 : 0]; if (!e) break; mv = mv.concat(sqOf(e[0])); }
        else if (br) continue;
        if (extra < 2 && !br) { }
        const key = mv.slice().sort((a, b) => a - b).join(); if (seen.has(key)) continue; seen.add(key);
        const pos = E.replay('renju', mv); if (pos.status().over) break;
        const P = G.probOf(mv);
        const f = G.check(g, P, { skipOwn: true }); if (f.length) { WHY(f); continue; }   // (the board-only checks first: cheap)
        const sc = read(mv, 8), sc2 = read(mv, 6); if (!sc.length || Math.abs(sc[0][1]) >= WINT) continue;
        Object.assign(P, { sc, sc2 });
        { const f2 = G.check(g, P, { skipOwn: true, noNet: true }); if (f2.length) { WHY(f2); continue; } }
        P.nb = netBest(mv);
        { const f3 = G.check(g, P, { skipOwn: true }); if (f3.length) { WHY(f3); continue; } }
        cands.push(P);
      }
    }
  }
  // 5 with different answers, no kind more than twice, far apart from each other; easy → hard
  cands.sort((a, b) => G.diff(a) - G.diff(b));
  const pick = [];
  for (const P of cands) { if (pick.length >= 5) break;
    if (pick.some(Q => Q.sc[0][0] === P.sc[0][0] && Q.side === P.side)) continue;
    if (pick.filter(Q => G.kind(Q) === G.kind(P)).length >= 2) continue;
    if (pick.some(Q => G.dist(Q, P) < 4)) continue;
    pick.push(P); }
  console.log(JSON.stringify(WHYS)); console.log(id, 'candidates', cands.length, 'picked', pick.length, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  if (pick.length < 5) continue;
  g.problems = pick.map(P => ({ b: P.b, w: P.w, side: P.side, last: P.last, mv: P.mv, sc: P.sc, sc2: P.sc2, nb: P.nb }));
  g.verified = true;
  fs.writeFileSync(OUT, JSON.stringify(O));
}

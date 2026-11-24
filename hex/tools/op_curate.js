// (2026-11-24 第2期・担当B) hex openings (hex/openings.json): new practice problems that pass the strict checks of
// tools/lesson-verify.js hexOpen. The old pool took the study line's own positions (the study had just shown the answer — 追1)
// and moves within a few points of each other (② — 69 of 70 problems had a second move worth 15–20 points).
// Here a problem is a position off the line: the opponent leaves the line (one of the engine's top replies that is not the line's),
// the engine plays on two or four more moves, and the set's side (Red, set.side) is to move. Kept only when
//   the engine's root search (analyze) and the child values at two budgets agree on one best move, every other scored move is worth
//   12 points or less in the 2D / 3D scoring (problemPoints / HEX.points) at both budgets, the game is not decided (|v| ≤ 600),
//   and it is 3+ cells (more than two moves; 180° turn and the colour-swap mirror too) from every line position of every set and from every
//   lesson / puzzle board and the other chosen problems.
//   gcc -O3 -march=native -DNATIVE -w -o /tmp/hexn hex/tools/native.c -lm
//   node hex/tools/op_curate.js c7 [--write]     (several ids: c7,c9)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const E = require('../engine.js');
const CHK = require(path.join(ROOT, 'tools/lesson-verify.js'))._hex;
const ids = (process.argv[2] || '').split(',').filter(Boolean), WRITE = process.argv.includes('--write');
const OF = path.join(ROOT, 'hex/openings.json'), O = JSON.parse(fs.readFileSync(OF, 'utf8'));
const MS = { 7: 1500, 9: 2000, 11: 2500 };
function choose(keep, id) {   // easy → hard (hxD); ⑤ an answer cell at most twice, one kind of move at most 3 times, more than two moves apart
  keep.sort((x, y) => CHK.d(x) - CHK.d(y));
  const ca = new Map(), ck = new Map(), pick = [];
  for (const P of keep) { const k = CHK.kind(P.s, P.best); if ((ca.get(P.best) || 0) >= 2 || (ck.get(k) || 0) >= 3 || CHK.near([], P.s, id, pick) <= 2) continue; ca.set(P.best, (ca.get(P.best) || 0) + 1); ck.set(k, (ck.get(k) || 0) + 1); pick.push(P); }
  keep.length = 0; keep.push(...pick);
}
if (process.argv.includes('--merge')) {   // OUT=dir node op_curate.js c9,e9 --merge: the kept problems of earlier runs into openings.json
  for (const id of ids) { const g = O.sets.find(s => s.id === id), keep = JSON.parse(fs.readFileSync(path.join(process.env.OUT, id + '.json'), 'utf8')); choose(keep, id);
    console.error(id, 'chosen', keep.length, keep.map(P => E.nameOf(P.best, g.n) + ':' + CHK.kind(P.s, P.best) + ':' + CHK.d(P)).join(' '));
    if (keep.length >= 5) { g.problems = keep.length > 7 ? [0, 1, 2, 3, 4, 5, 6].map(i => keep[Math.round(i * (keep.length - 1) / 6)]) : keep; g.verified = true; } }
  fs.writeFileSync(OF, JSON.stringify(O)); process.exit(0);
}
(async () => {
  const N = require('./nat.js').open();
  const evalPos = async (spec, ms) => { await N.setpos(spec); const a = await N.analyze(ms, 0, 1); return a.list[0] ? a.list[0].v : 0; };
  const scored = async (spec, ms, top) => { await N.setpos(spec); const a = await N.analyze(ms * 2, 0, top), L = [];
    for (const e of a.list) { const p = E.Pos.from(spec); p.play(e.m); if (p.winner()) { L.push([e.m, 29999]); continue; } L.push([e.m, Math.max(-29999, Math.min(29999, -(await evalPos(p.spec(), ms))))]); }
    return { root: a.list.map(e => [e.m, e.v]), sc: L.sort((x, y) => y[1] - x[1]) }; };
  for (const id of ids) {
    const g = O.sets.find(s => s.id === id); if (!g) { console.error('no set', id); continue; }
    const n = g.n, ms = MS[n], line = g.study.line, side = g.side, ctx = CHK.ctx(O);
    const replay = mv => { const p = new E.Pos(n, g.swap); for (const m of mv) p.play(m); return p; };
    const NB = E.geo(n).NB, intrusions = q => { const me = 3 - q.side, out = new Set();   // (the carriers of the mover's opponent's — our — bridges, both empty)
      for (let a = 0; a < n * n; a++) for (let b = a + 1; b < n * n; b++) { if (q.b[a] !== me || q.b[b] !== me || NB[a].includes(b)) continue; const cm = NB[a].filter(x => NB[b].includes(x)); if (cm.length === 2 && cm.every(x => !q.b[x])) cm.forEach(x => out.add(x)); }
      return [...out]; };
    const cands = [], seenB = new Set();
    for (let k = 2; k < Math.min(line.length, 12); k++) {
      const p0 = replay(line.slice(0, k)); if (p0.side === side || p0.winner()) continue;   // (the opponent leaves the line)
      await N.setpos(p0.spec()); const a = await N.analyze(ms, 0, 6);
      for (const e of a.list) { if (e.m === line[k] || e.m === E.SWAP) continue;
        let mv = line.slice(0, k).concat([e.m]);
        const push = m2 => { const q = replay(m2); if (q.side === side && !q.winner() && !seenB.has(q.spec().b)) { seenB.add(q.spec().b); cands.push(m2.slice()); } };
        for (let c = 0; c < 4; c++) { const p = replay(mv); if (p.winner()) break; await N.setpos(p.spec()); const b = await N.best(0, Math.round(ms * .6), 0, 3); mv = mv.concat([b.m]);
          if (c % 2 === 1) push(mv);
          else { const q = replay(mv); if (!q.winner()) for (const x of intrusions(q)) push(mv.concat([x])); } } }   // (the opponent cuts into one of our bridges: we answer)
    }
    console.error(id, 'candidates', cands.length);
    const keep = [];
    for (const mv of cands) {
      const p = replay(mv), spec = p.spec(); if (p.swapOk) spec.sw = 1;
      if (CHK.near(ctx, spec, id, []) <= 2) continue;
      await N.setpos(spec); const a = await N.analyze(ms * 2, 0, 3); if (a.list.length < 2 || a.list[0].v - a.list[1].v < 150 || Math.abs(a.list[0].v) > 600) continue;
      const A = await scored(spec, ms, 12), B = await scored(spec, ms * 2, 12);
      const P = { s: spec, best: B.sc[0][0], sc: B.sc, sc2: A.sc, mv }, P2 = { s: spec, best: A.sc[0][0], sc: A.sc };
      const why = CHK.problem(P, P2);
      console.error(' ', E.nameOf(P.best, n), 'gap', B.sc[0][1] - B.sc[1][1], A.sc[0][1] - A.sc[1][1], why.join('; ') || 'OK');
      if (!why.length) keep.push(P);
    }
    if (process.env.OUT) fs.writeFileSync(path.join(process.env.OUT, id + '.json'), JSON.stringify(keep));   // (OUT=dir: every problem that passed, to choose again with --merge)
    choose(keep, id);
    console.error(id, 'kept', keep.length, keep.map(P => E.nameOf(P.best, n) + ':' + CHK.d(P).toFixed(1)).join(' '));
    if (WRITE && keep.length >= 5) { g.problems = keep.length > 7 ? [0, 1, 2, 3, 4, 5, 6].map(i => keep[Math.round(i * (keep.length - 1) / 6)]) : keep; g.verified = true; }
  }
  if (WRITE) fs.writeFileSync(OF, JSON.stringify(O));
  N.close();
})();
